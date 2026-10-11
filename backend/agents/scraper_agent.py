"""
agents/scraper_agent.py
─────────────────────────────────────────────────────────────────────────────
LangGraph multi-agent pipeline for monitoring embassy/immigration websites.

Agents in the graph:
  1. FetcherAgent    – downloads raw HTML from the target URLs
  2. ParserAgent     – extracts relevant visa/migration text sections
  3. DiffAgent       – compares with last snapshot, produces (before, after) pairs
  4. ClassifierAgent – uses an LLM to classify each diff (category, severity, confidence)
  5. PersistAgent    – saves new Changes to the database
  6. AlertAgent      – creates alerts and dispatches webhooks if configured

State flows:     fetcher → parser → differ → classifier → persister → alerter
"""

from __future__ import annotations

import asyncio
import difflib
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, TypedDict

import httpx
from bs4 import BeautifulSoup
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from config import settings

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# Scraping targets — the two embassy websites
# ═══════════════════════════════════════════════════════════════════════════════
SCRAPE_TARGETS = [
    {
        "source_id": "src_uk_visa",
        "country": "India",
        "url": settings.uk_visa_url,
        "label": "India Visa Rules (Clone)",
        # CSS selectors for sections we care about
        "selectors": [
            "main",            # main content area
            ".govuk-grid-row", # gov.uk grid rows
            "article",
        ],
    },
]


# ═══════════════════════════════════════════════════════════════════════════════
# LangGraph State
# ═══════════════════════════════════════════════════════════════════════════════
class ScraperState(TypedDict):
    """Shared state that flows through every node in the graph."""
    # Input
    targets: List[Dict[str, Any]]

    # Accumulated per target
    fetched: List[Dict[str, Any]]      # [{source_id, raw_html, label, url, selectors}]
    parsed: List[Dict[str, Any]]       # [{source_id, text}]
    diffs: List[Dict[str, Any]]        # [{source_id, before, after}]
    classified: List[Dict[str, Any]]   # [{source_id, before, after, category, severity, confidence}]

    # DB session is injected externally
    db_session: Any

    # Results
    saved_changes: List[str]           # list of new Change IDs
    alerts_sent: List[str]
    errors: List[str]


# ═══════════════════════════════════════════════════════════════════════════════
# Helper: Build LLM client
# ═══════════════════════════════════════════════════════════════════════════════
def _get_llm():
    """Return an LLM client based on configured provider."""
    provider = settings.llm_provider

    if provider == "openai":
        from langchain_openai import ChatOpenAI  # type: ignore
        return ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.openai_api_key,
            temperature=0,
        )
    elif provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI  # type: ignore
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=settings.google_api_key,
            temperature=0,
        )
    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic  # type: ignore
        return ChatAnthropic(
            model="claude-3-haiku-20240307",
            api_key=settings.anthropic_api_key,
            temperature=0,
        )
    elif provider == "groq":
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is not configured in .env")
        from langchain_groq import ChatGroq  # type: ignore
        return ChatGroq(
            model=settings.groq_model or "llama-3.3-70b-versatile",
            api_key=settings.groq_api_key,
            temperature=0,
        )
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")


# ═══════════════════════════════════════════════════════════════════════════════
# Node 1 — FetcherAgent
# ═══════════════════════════════════════════════════════════════════════════════
async def fetcher_node(state: ScraperState) -> ScraperState:
    """
    Downloads raw HTML from each scrape target.
    Falls back gracefully so the pipeline doesn't crash on a single URL failure.
    """
    logger.info("================================================================================")
    logger.info("  [1/6 FetcherAgent] Starting fetch for %d targets", len(state["targets"]))
    logger.info("================================================================================")
    fetched = []
    errors = list(state.get("errors", []))

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; NovaMonitor/1.0; +https://nova-monitor.example)"
        ),
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
    }

    async with httpx.AsyncClient(
        headers=headers,
        follow_redirects=True,
        timeout=30.0,
    ) as client:
        tasks = [client.get(t["url"]) for t in state["targets"]]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

    for target, resp in zip(state["targets"], responses):
        if isinstance(resp, Exception):
            err = f"[FetcherAgent] Error fetching {target['url']}: {resp}"
            logger.error("  ❌ %s", err)
            errors.append(err)
            continue

        if resp.status_code != 200:
            err = f"[FetcherAgent] HTTP {resp.status_code} for {target['url']}"
            logger.warning("  ⚠️ %s", err)
            errors.append(err)
            continue

        fetched.append({
            **target,
            "raw_html": resp.text,
        })
        logger.info("  ✅ [FetcherAgent] Fetched '%s' (%s) — Received %d bytes of HTML", target["label"], target["url"], len(resp.text))

    return {**state, "fetched": fetched, "errors": errors}


# ═══════════════════════════════════════════════════════════════════════════════
# Node 2 — ParserAgent
# ═══════════════════════════════════════════════════════════════════════════════
def _extract_text(html: str, selectors: List[str]) -> str:
    """
    Extract clean text from HTML.
    Prioritizes extracting under the 'Rules for Visa' section.
    If not found, falls back to full page content extraction.
    """
    soup = BeautifulSoup(html, "lxml")

    # Remove nav, footer, cookie banners
    for tag in soup.select("nav, footer, header, .cookie-banner, script, style, [aria-hidden='true']"):
        tag.decompose()

    # 1. Primary: Search for explicit 'Rules for Visa' section
    for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "strong", "div"]):
        text_lower = heading.get_text().strip().lower()
        if "rules for visa" in text_lower or "visa rules" in text_lower or "rules for" in text_lower:
            parts = [heading.get_text(separator=" ", strip=True)]
            curr = heading.next_sibling
            while curr:
                if hasattr(curr, "name") and curr.name in ["h1", "h2", "h3", "h4"]:
                    break  # Stop at next major heading
                if hasattr(curr, "get_text"):
                    t = curr.get_text(separator=" ", strip=True)
                    if t:
                        parts.append(t)
                curr = curr.next_sibling

            section_text = "\n".join(parts).strip()
            if len(section_text) > 15:
                logger.info("  🎯 [ParserAgent] Found 'Rules for Visa' section (%d chars)", len(section_text))
                return section_text

    # 2. Fallback: Extract all content from main selectors
    text_parts = []
    for selector in selectors:
        elements = soup.select(selector)
        for el in elements:
            text_parts.append(el.get_text(separator=" ", strip=True))

    if text_parts:
        combined = "\n\n".join(text_parts)
    else:
        combined = soup.get_text(separator=" ", strip=True)

    # Collapse whitespace
    combined = re.sub(r"\s{3,}", "\n\n", combined)
    return combined.strip()


async def parser_node(state: ScraperState) -> ScraperState:
    """Extract structured text from raw HTML for each fetched page."""
    logger.info("--------------------------------------------------------------------------------")
    logger.info("  [2/6 ParserAgent] Parsing %d fetched pages", len(state.get("fetched", [])))
    logger.info("--------------------------------------------------------------------------------")
    parsed = []

    for item in state.get("fetched", []):
        text = _extract_text(item["raw_html"], item.get("selectors", ["main"]))
        parsed.append({
            "source_id": item["source_id"],
            "country": item["country"],
            "label": item["label"],
            "url": item["url"],
            "text": text,
        })
        preview = text[:300].replace('\n', ' ') + ("..." if len(text) > 300 else "")
        logger.info("  📄 [ParserAgent] Source: '%s' (%s) — Extracted %d text chars", item["label"], item["source_id"], len(text))
        logger.info("     └─ SCRAPED CONTENT PREVIEW: \"%s\"", preview)

    return {**state, "parsed": parsed}


# ═══════════════════════════════════════════════════════════════════════════════
# Node 3 — DiffAgent
# ═══════════════════════════════════════════════════════════════════════════════
# In-memory snapshot store (bootstrapped from DB on startup)
_snapshots: Dict[str, str] = {}


def load_snapshot(source_id: str) -> Optional[str]:
    return _snapshots.get(source_id)


def save_snapshot(source_id: str, text: str) -> None:
    _snapshots[source_id] = text


async def differ_node(state: ScraperState) -> ScraperState:
    """
    Diffs current text against last snapshot.
    Produces (before, after) pairs only where meaningful changes exist.
    Threshold: at least 3 lines changed.
    """
    logger.info("--------------------------------------------------------------------------------")
    logger.info("  [3/6 DiffAgent] Comparing %d pages against last snapshots", len(state.get("parsed", [])))
    logger.info("--------------------------------------------------------------------------------")
    diffs = []

    for item in state.get("parsed", []):
        source_id = item["source_id"]
        current_text = item["text"]

        # Try to load old snapshot from DB (via db_session)
        previous_text = load_snapshot(source_id)

        if previous_text is None:
            # First run — save snapshot, no diff to report
            save_snapshot(source_id, current_text)
            logger.info("  📸 [DiffAgent] Baseline saved for '%s' (%s) [%d chars] — No prior snapshot to compare", item["label"], source_id, len(current_text))
            continue

        if previous_text == current_text:
            logger.info("  ✔ [DiffAgent] No changes detected for '%s' (%s)", item["label"], source_id)
            save_snapshot(source_id, current_text)
            continue

        # Produce unified diff
        old_lines = previous_text.splitlines(keepends=True)
        new_lines = current_text.splitlines(keepends=True)
        diff_lines = list(difflib.unified_diff(old_lines, new_lines, lineterm="", n=3))

        if len(diff_lines) < 3:
            # Noise — skip tiny changes
            logger.info("  ℹ️ [DiffAgent] Minor formatting difference (< 3 lines) ignored for '%s'", item["label"])
            save_snapshot(source_id, current_text)
            continue

        # Extract changed blocks as (before, after) paragraphs
        removed = [l[1:].strip() for l in diff_lines if l.startswith("-") and not l.startswith("---")]
        added = [l[1:].strip() for l in diff_lines if l.startswith("+") and not l.startswith("+++")]

        before_text = " ".join(removed[:120])  # cap to ~120 words
        after_text = " ".join(added[:120])

        if before_text or after_text:
            diffs.append({
                "source_id": source_id,
                "country": item["country"],
                "label": item["label"],
                "url": item["url"],
                "before": before_text,
                "after": after_text,
            })
            logger.info("  🚨 [DiffAgent] CHANGE DETECTED in '%s'!", item["label"])
            logger.info("     ├─ BEFORE: \"%s\"", before_text[:200])
            logger.info("     └─ AFTER : \"%s\"", after_text[:200])

        save_snapshot(source_id, current_text)

    return {**state, "diffs": diffs}


# ═══════════════════════════════════════════════════════════════════════════════
# Node 4 — ClassifierAgent (LLM)
# ═══════════════════════════════════════════════════════════════════════════════
# ═══════════════════════════════════════════════════════════════════════════════
# Node 4 — ClassifierAgent (LLM)
# ═══════════════════════════════════════════════════════════════════════════════
CLASSIFIER_SYSTEM_PROMPT = """
You are an immigration law monitoring assistant.
Given a BEFORE and AFTER text snippet from an official government visa/immigration website,
analyze the changes and classify them.

Provide:
- summary: A clear, human-readable 2-3 sentence executive summary explaining EXACTLY what changed, what new rule or policy was introduced, and how it affects applicants. Do NOT repeat raw HTML/diff markers.
- short_title: A concise 4-8 word title describing the update.
- category: short label e.g. "Financial Requirements", "Processing Times", "Eligibility Criteria",
            "Policy Announcement", "Document Requirements", "Fee Changes", "Route Changes"
- severity: "severe" | "minor" | "none"
  - severe = impacts existing applicants or significantly raises requirements
  - minor = wording change, processing time shift, cosmetic update
  - none = no meaningful change
- confidence: "high" | "medium" | "low"
- effective_date: ISO date string if mentioned, else null

Return ONLY valid JSON with keys: summary, short_title, category, severity, confidence, effective_date
""".strip()


async def classifier_node(state: ScraperState) -> ScraperState:
    """Use LLM to classify each diff into summary/category/severity/confidence."""
    logger.info("--------------------------------------------------------------------------------")
    logger.info("  [4/6 ClassifierAgent] Classifying %d detected diffs", len(state.get("diffs", [])))
    logger.info("--------------------------------------------------------------------------------")
    classified = []

    if not state.get("diffs"):
        logger.info("  ℹ️ [ClassifierAgent] No diffs to classify")
        return {**state, "classified": []}

    # Only instantiate LLM if we have diffs to classify
    try:
        llm = _get_llm()
        provider_name = settings.llm_provider
    except Exception as e:
        logger.warning("  ⚠️ [ClassifierAgent] LLM unavailable: %s — using heuristic fallback", e)
        llm = None
        provider_name = "heuristic"

    for diff in state.get("diffs", []):
        if llm:
            try:
                user_msg = (
                    f"BEFORE:\n{diff['before']}\n\n"
                    f"AFTER:\n{diff['after']}\n\n"
                    f"Source: {diff['label']} ({diff['country']})"
                )
                logger.info("  🤖 [ClassifierAgent] Sending diff from '%s' to LLM (%s)...", diff["label"], provider_name)
                response = await llm.ainvoke([
                    SystemMessage(content=CLASSIFIER_SYSTEM_PROMPT),
                    HumanMessage(content=user_msg),
                ])
                import json
                raw = response.content.strip()
                # Strip markdown fences if present
                raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
                result = json.loads(raw)
            except Exception as e:
                logger.error("  ❌ [ClassifierAgent] LLM error: %s — using fallback", e)
                result = _heuristic_classify(diff)
        else:
            result = _heuristic_classify(diff)

        classified_item = {
            **diff,
            "summary": result.get("summary") or f"Updated policy for {diff['label']}.",
            "short_title": result.get("short_title") or diff.get("label", "Policy Update"),
            "category": result.get("category", "General Update"),
            "severity": result.get("severity", "minor"),
            "confidence": result.get("confidence", "medium"),
            "effective_date": result.get("effective_date"),
        }
        classified.append(classified_item)
        logger.info(
            "  🏷️ [ClassifierAgent] Result for '%s': Title='%s' | Category='%s' | Severity='%s'",
            diff["label"],
            classified_item["short_title"],
            classified_item["category"],
            classified_item["severity"],
        )
        logger.info("     └─ AI SUMMARY: \"%s\"", classified_item["summary"])

    return {**state, "classified": classified}


def _heuristic_classify(diff: Dict[str, Any]) -> Dict[str, Any]:
    """Simple keyword-based fallback when LLM is not configured."""
    text = (diff["before"] + diff["after"]).lower()

    severe_keywords = ["salary", "salary requirement", "fee", "ban", "prohibited",
                       "refused", "rejected", "salary threshold", "financial requirement"]
    minor_keywords = ["weeks", "days", "processing", "updated wording", "clarification"]

    severity = "minor"
    if any(k in text for k in severe_keywords):
        severity = "severe"

    category = "General Update"
    if any(k in text for k in ["salary", "financial", "income", "earning"]):
        category = "Financial Requirements"
    elif any(k in text for k in ["weeks", "days", "processing time"]):
        category = "Processing Times"
    elif any(k in text for k in ["fee", "£", "$", "payment"]):
        category = "Fee Changes"
    elif any(k in text for k in ["document", "evidence", "proof"]):
        category = "Document Requirements"
    elif any(k in text for k in ["policy", "announcement", "update", "change"]):
        category = "Policy Announcement"

    summary = f"Detected changes in official text regarding {category.lower()}. Summary preview: {diff['after'][:180]}..."
    short_title = f"{category} Update"

    return {
        "summary": summary,
        "short_title": short_title,
        "category": category,
        "severity": severity,
        "confidence": "low",
        "effective_date": None,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Node 5 — PersistAgent
# ═══════════════════════════════════════════════════════════════════════════════
async def persister_node(state: ScraperState) -> ScraperState:
    """Save classified changes to the database."""
    logger.info("--------------------------------------------------------------------------------")
    logger.info("  [5/6 PersistAgent] Saving %d classified changes to DB", len(state.get("classified", [])))
    logger.info("--------------------------------------------------------------------------------")
    saved_ids = []
    db = state.get("db_session")

    if db is None:
        logger.warning("  ⚠️ [PersistAgent] No DB session provided — skipping persist")
        return {**state, "saved_changes": []}

    # Import here to avoid circular imports
    from database import Change, Source
    from sqlalchemy import select

    for item in state.get("classified", []):
        try:
            # Ensure source exists
            result = await db.execute(select(Source).where(Source.id == item["source_id"]))
            source = result.scalar_one_or_none()
            if not source:
                source = Source(
                    id=item["source_id"],
                    country=item["country"],
                    url=item["url"],
                    type="html",
                    frequency="every_6h",
                    status="active",
                )
                db.add(source)

            source.last_checked = datetime.utcnow()

            change = Change(
                source_id=item["source_id"],
                before_text=item["before"] or "",
                after_text=item["after"] or "",
                summary=item.get("summary") or item.get("after") or "",
                short_title=item.get("short_title") or item.get("category") or "Update",
                category=item["category"],
                severity=item["severity"],
                confidence=item["confidence"],
                effective_date=item.get("effective_date"),
                status="pending",
            )
            db.add(change)
            await db.flush()
            saved_ids.append(change.id)
            logger.info("  💾 [PersistAgent] Saved change ID: %s | Title: '%s' | Category: %s", change.id, change.short_title, change.category)

        except Exception as e:
            logger.error("  ❌ [PersistAgent] DB error for %s: %s", item.get("source_id"), e)

    await db.commit()
    logger.info("  ✅ [PersistAgent] Successfully committed %d changes to database", len(saved_ids))
    return {**state, "saved_changes": saved_ids}


# ═══════════════════════════════════════════════════════════════════════════════
# Node 6 — AlertAgent
# ═══════════════════════════════════════════════════════════════════════════════
# In-process alert queue (consumed by SSE endpoint)
_alert_queue: asyncio.Queue = asyncio.Queue()


def get_alert_queue() -> asyncio.Queue:
    return _alert_queue


async def alerter_node(state: ScraperState) -> ScraperState:
    """
    Creates Alert records in DB and pushes to SSE queue for frontend.
    Also fires webhook if configured.
    """
    logger.info("--------------------------------------------------------------------------------")
    logger.info("  [6/6 AlertAgent] Dispatching alerts for %d saved changes", len(state.get("saved_changes", [])))
    logger.info("--------------------------------------------------------------------------------")
    db = state.get("db_session")
    alert_ids = []

    if db is None or not state.get("saved_changes"):
        logger.info("  ℹ️ [AlertAgent] No saved changes to alert on")
        return {**state, "alerts_sent": []}

    from database import Alert, Change
    from sqlalchemy import select

    for change_id in state.get("saved_changes", []):
        try:
            result = await db.execute(select(Change).where(Change.id == change_id))
            change = result.scalar_one_or_none()
            if not change:
                continue

            alert = Alert(
                change_id=change_id,
                title=f"New {change.severity.value} change: {change.category}",
                body=change.after_text[:300],
                severity=change.severity,
                is_read=False,
            )
            db.add(alert)
            await db.flush()

            # Push to SSE queue
            alert_payload = {
                "id": alert.id,
                "change_id": change_id,
                "title": alert.title,
                "body": alert.body,
                "severity": change.severity.value,
                "created_at": datetime.utcnow().isoformat(),
            }
            await _alert_queue.put(alert_payload)
            alert_ids.append(alert.id)
            logger.info("  🔔 [AlertAgent] Created Alert '%s' (ID: %s)", alert.title, alert.id)

            # Optional webhook
            if settings.alert_webhook_url:
                await _fire_webhook(settings.alert_webhook_url, alert_payload)

        except Exception as e:
            logger.error("  ❌ [AlertAgent] Error creating alert: %s", e)

    await db.commit()
    logger.info("  ✅ [AlertAgent] Completed alert dispatch (%d alerts sent)", len(alert_ids))
    return {**state, "alerts_sent": alert_ids}


async def _fire_webhook(url: str, payload: Dict[str, Any]) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(url, json=payload)
        logger.info("  🌐 [AlertAgent] Webhook fired to %s", url)
    except Exception as e:
        logger.warning("  ⚠️ [AlertAgent] Webhook failed: %s", e)


# ═══════════════════════════════════════════════════════════════════════════════
# Build LangGraph
# ═══════════════════════════════════════════════════════════════════════════════
def build_scraper_graph() -> StateGraph:
    graph = StateGraph(ScraperState)

    graph.add_node("fetcher", fetcher_node)
    graph.add_node("parser", parser_node)
    graph.add_node("differ", differ_node)
    graph.add_node("classifier", classifier_node)
    graph.add_node("persister", persister_node)
    graph.add_node("alerter", alerter_node)

    graph.add_edge(START, "fetcher")
    graph.add_edge("fetcher", "parser")
    graph.add_edge("parser", "differ")
    graph.add_edge("differ", "classifier")
    graph.add_edge("classifier", "persister")
    graph.add_edge("persister", "alerter")
    graph.add_edge("alerter", END)

    return graph.compile()


# Compiled graph singleton
scraper_graph = build_scraper_graph()


# ═══════════════════════════════════════════════════════════════════════════════
# Public entry point
# ═══════════════════════════════════════════════════════════════════════════════
async def run_scraper_pipeline(db_session=None) -> Dict[str, Any]:
    """
    Invoke the full multi-agent scraping pipeline.
    Can be called from the scheduler or the manual trigger endpoint.
    """
    initial_state: ScraperState = {
        "targets": SCRAPE_TARGETS,
        "fetched": [],
        "parsed": [],
        "diffs": [],
        "classified": [],
        "db_session": db_session,
        "saved_changes": [],
        "alerts_sent": [],
        "errors": [],
    }

    logger.info("================================================================================")
    logger.info("🚀 [Nova Pipeline] STARTING EMBASSY MONITORING PIPELINE")
    logger.info("   Targets: %s", [t["label"] for t in SCRAPE_TARGETS])
    logger.info("================================================================================")
    try:
        final_state = await scraper_graph.ainvoke(initial_state)
        logger.info("================================================================================")
        logger.info(
            "🎉 [Nova Pipeline] FINISHED: %d fetched | %d diffs found | %d saved | %d alerts sent | %d errors",
            len(final_state.get("fetched", [])),
            len(final_state.get("diffs", [])),
            len(final_state.get("saved_changes", [])),
            len(final_state.get("alerts_sent", [])),
            len(final_state.get("errors", [])),
        )
        logger.info("================================================================================")
        return {
            "saved_changes": final_state.get("saved_changes", []),
            "alerts_sent": final_state.get("alerts_sent", []),
            "errors": final_state.get("errors", []),
        }
    except Exception as exc:
        logger.exception("💥 [Nova Pipeline] EXCEPTION OCCURRED DURING PIPELINE RUN: %s", exc)
        raise


async def load_snapshots_from_db(db_session) -> None:
    """Bootstrap in-memory snapshot cache from DB on startup."""
    from database import Source
    from sqlalchemy import select

    result = await db_session.execute(select(Source))
    sources = result.scalars().all()
    for source in sources:
        if source.last_snapshot:
            _snapshots[source.id] = source.last_snapshot
    logger.info("[Startup] Loaded %d snapshots from DB", len(_snapshots))
