# Nova Backend — Embassy Change Monitor

FastAPI + LangGraph multi-agent backend that scrapes UK embassy/immigration websites,
detects visa & migration policy changes, and delivers real-time alerts to the frontend.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LangGraph Pipeline                          │
│                                                                 │
│  FetcherAgent → ParserAgent → DiffAgent → ClassifierAgent       │
│                                    ↓              ↓            │
│                              PersistAgent → AlertAgent          │
└─────────────────────────────────────────────────────────────────┘
         ↑                                        ↓
   APScheduler                             SSE stream
   (every 6h)                         (frontend Bell icon)
```

### Agents

| Agent | Role |
|-------|------|
| **FetcherAgent** | Downloads raw HTML from gov.uk visa pages using httpx |
| **ParserAgent** | Extracts clean text using BeautifulSoup + CSS selectors |
| **DiffAgent** | Compares with last snapshot, generates (before, after) diffs |
| **ClassifierAgent** | Uses LLM (GPT-4o-mini / Gemini) to classify category, severity, confidence |
| **PersistAgent** | Saves detected changes to SQLite via async SQLAlchemy |
| **AlertAgent** | Creates Alert records and pushes to SSE queue for the frontend |

## Monitored Websites

| Site | URL | Sections |
|------|-----|----------|
| UK Home Office | `https://www.gov.uk/browse/visas-immigration` | Visa requirements, eligibility |
| UK Visa Policy | `https://www.gov.uk/government/collections/visa-regulations-revised-rules` | Policy announcements |

## API Endpoints

### Required by Frontend

| Method | Path | Description |
|--------|------|-------------|
| GET | `/changes` | List all detected changes |
| GET | `/changes/{id}` | Get one change |
| PATCH | `/changes/{id}` | Update review status |
| GET | `/changes/{id}/impacts` | Customer impacts |
| GET | `/sources` | List monitored sources |
| GET | `/customers` | List tracked clients |
| GET | `/dashboard/summary` | Stat card aggregates |
| POST | `/scraper/run` | Manual scrape trigger |
| GET | `/alerts/stream` | SSE real-time alert stream |

### Additional

| Method | Path | Description |
|--------|------|-------------|
| GET | `/alerts` | List all alerts |
| PATCH | `/alerts/{id}/read` | Mark alert as read |
| GET | `/scraper/status` | Scheduler status |
| GET | `/scraper/logs` | Scraping audit logs |
| GET | `/health` | Health check |

## Quick Start

```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env — set OPENAI_API_KEY or GOOGLE_API_KEY

# 4. Seed sample data (optional)
python seed.py

# 5. Start server
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/docs for interactive API docs.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `groq` | `groq` / `google` / `openai` / `anthropic` |
| `GROQ_API_KEY` | — | Required if using Groq (free tier at console.groq.com) |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, etc.) |
| `GOOGLE_API_KEY` | — | Required if using Google Gemini |
| `OPENAI_API_KEY` | — | Required if using OpenAI |
| `SCRAPE_CRON` | `0 */6 * * *` | Cron for scheduler (every 6h) |
| `DATABASE_URL` | SQLite | SQLAlchemy async URL |
| `ALERT_WEBHOOK_URL` | — | Optional webhook for alerts |

## Without an LLM Key

The ClassifierAgent falls back to a **keyword heuristic** classifier (no API key needed). 
Changes will still be detected and stored, just with lower-confidence classification.
