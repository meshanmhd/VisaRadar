"""
routers/scraper.py — Manual scrape trigger + scheduler status + SSE alerts.

Endpoints:
  POST /scraper/run          → manually trigger the scraping pipeline
  GET  /scraper/status       → scheduler status + last run info
  GET  /scraper/logs         → recent scraping audit logs
  GET  /alerts               → list alerts (unread first)
  PATCH /alerts/{id}/read   → mark alert as read
  GET  /alerts/stream        → SSE stream for real-time alert push
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import AsyncGenerator, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db, Alert, ScrapingLog, AsyncSessionLocal
from schemas import AlertOut, ScrapingLogOut, ManualScrapeRequest
from scheduler import get_scheduler_status

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Scraper & Alerts"])


# ── Manual trigger ─────────────────────────────────────────────────────────────
@router.post("/scraper/run", status_code=202)
async def trigger_manual_scrape(
    body: ManualScrapeRequest = ManualScrapeRequest(),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger the multi-agent scraping pipeline immediately.
    Used by the "Run Manual Check" button on the Changes page.
    """
    from agents.scraper_agent import run_scraper_pipeline, SCRAPE_TARGETS

    # Optionally filter to a single source
    targets = SCRAPE_TARGETS
    if body.source_id:
        targets = [t for t in SCRAPE_TARGETS if t["source_id"] == body.source_id]
        if not targets:
            raise HTTPException(404, f"Source '{body.source_id}' not found")

    async def _run():
        try:
            async with AsyncSessionLocal() as session:
                return await run_scraper_pipeline(db_session=session)
        except Exception as e:
            logger.exception("❌ [Manual Scrape] Error executing background scrape task: %s", e)

    # Run in background so the HTTP response returns immediately (202 Accepted)
    asyncio.create_task(_run())

    return {"message": "Scraping job triggered", "targets": [t["source_id"] for t in targets]}


# ── Scheduler status ───────────────────────────────────────────────────────────
@router.get("/scraper/status")
async def scraper_status():
    """Return scheduler state and next scheduled run."""
    return get_scheduler_status()


# ── Scraping logs ──────────────────────────────────────────────────────────────
@router.get("/scraper/logs", response_model=List[ScrapingLogOut])
async def get_scraping_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ScrapingLog).order_by(ScrapingLog.ran_at.desc()).limit(50)
    )
    logs = result.scalars().all()
    return [
        ScrapingLogOut(
            id=log.id,
            source_id=log.source_id,
            ran_at=log.ran_at.isoformat(),
            success=log.success,
            changes_found=log.changes_found,
            error_message=log.error_message,
        )
        for log in logs
    ]


# ── Alerts ─────────────────────────────────────────────────────────────────────
@router.get("/alerts", response_model=List[AlertOut])
async def list_alerts(db: AsyncSession = Depends(get_db)):
    """Return all alerts — unread first, then by created_at desc."""
    result = await db.execute(
        select(Alert).order_by(Alert.is_read.asc(), Alert.created_at.desc()).limit(100)
    )
    alerts = result.scalars().all()
    return [
        AlertOut(
            id=a.id,
            change_id=a.change_id,
            title=a.title,
            body=a.body,
            severity=a.severity.value,
            is_read=a.is_read,
            created_at=a.created_at.isoformat(),
        )
        for a in alerts
    ]


@router.patch("/alerts/{alert_id}/read", response_model=AlertOut)
async def mark_alert_read(alert_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")

    alert.is_read = True
    await db.commit()
    await db.refresh(alert)

    return AlertOut(
        id=alert.id,
        change_id=alert.change_id,
        title=alert.title,
        body=alert.body,
        severity=alert.severity.value,
        is_read=alert.is_read,
        created_at=alert.created_at.isoformat(),
    )


# ── SSE (Server-Sent Events) real-time alert stream ───────────────────────────
async def _sse_generator() -> AsyncGenerator[str, None]:
    """
    Yields SSE events from the in-process alert queue.
    Frontend connects to GET /alerts/stream and receives push notifications
    whenever a new change is detected.
    """
    from agents.scraper_agent import get_alert_queue
    queue = get_alert_queue()

    # Send a heartbeat comment every 30s to keep connection alive
    heartbeat_interval = 30
    try:
        while True:
            try:
                payload = await asyncio.wait_for(queue.get(), timeout=heartbeat_interval)
                data = json.dumps(payload)
                yield f"event: alert\ndata: {data}\n\n"
            except asyncio.TimeoutError:
                # Heartbeat
                yield ": heartbeat\n\n"
    except asyncio.CancelledError:
        pass


@router.get("/alerts/stream")
async def alert_stream():
    """
    SSE endpoint for real-time alert push.
    The frontend Bell icon subscribes to this to get instant notifications.
    """
    return StreamingResponse(
        _sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )
