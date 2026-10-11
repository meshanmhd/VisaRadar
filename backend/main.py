"""
main.py — FastAPI application entry point for Nova backend.

Architecture:
  • FastAPI app with async SQLAlchemy (aiosqlite)
  • LangGraph multi-agent scraping pipeline (6 agents)
  • APScheduler for every-6-hour automatic scraping
  • SSE endpoint for real-time frontend alerts
  • CORS configured for Vite dev server (localhost:5173)

Run with:
  uvicorn main:app --reload --port 8000
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db, AsyncSessionLocal
from scheduler import start_scheduler, stop_scheduler
from routers import changes, sources, customers, dashboard, scraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown) ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────────
    logger.info("=== Nova Backend starting ===")

    # 1. Create all DB tables
    await init_db()
    logger.info("Database initialised")

    # 2. Seed default sources into DB if empty
    await _seed_sources()

    # 3. Bootstrap snapshot cache from DB
    async with AsyncSessionLocal() as db:
        from agents.scraper_agent import load_snapshots_from_db
        await load_snapshots_from_db(db)

    # 4. Start APScheduler (every 6 hours by default)
    start_scheduler()

    yield  # ← app is running

    # ── Shutdown ───────────────────────────────────────────────────────────────
    stop_scheduler()
    logger.info("=== Nova Backend stopped ===")


async def _seed_sources():
    """Insert the two UK monitoring sources into the DB on first boot."""
    from database import Source, AsyncSessionLocal
    from sqlalchemy import select
    from agents.scraper_agent import SCRAPE_TARGETS

    async with AsyncSessionLocal() as db:
        for target in SCRAPE_TARGETS:
            exists = await db.execute(select(Source).where(Source.id == target["source_id"]))
            if not exists.scalar_one_or_none():
                source = Source(
                    id=target["source_id"],
                    country=target["country"],
                    url=target["url"],
                    type="html",
                    frequency="every_6h",
                    status="active",
                )
                db.add(source)
        await db.commit()
    logger.info("Default sources seeded")


# ── App factory ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Nova — Embassy Change Monitor",
    description=(
        "Multi-agent backend that scrapes embassy & immigration websites, "
        "detects visa/migration policy changes, and alerts the frontend in real-time."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"^https?:\/\/.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(changes.router)
app.include_router(sources.router)
app.include_router(customers.router)
app.include_router(dashboard.router)
app.include_router(scraper.router)


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "nova-backend"}


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Nova Embassy Monitor API",
        "docs": "/docs",
        "version": "1.0.0",
    }
