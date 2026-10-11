"""
scheduler.py — APScheduler wrapper that runs the scraping pipeline every 6 hours.

The cron schedule defaults to "0 */6 * * *" (configurable via SCRAPE_CRON env var).
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from config import settings

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _scrape_job():
    """The job that APScheduler calls on schedule."""
    logger.info("[Scheduler] Triggered scraping job")
    from database import AsyncSessionLocal
    from agents.scraper_agent import run_scraper_pipeline

    async with AsyncSessionLocal() as db:
        result = await run_scraper_pipeline(db_session=db)

    logger.info(
        "[Scheduler] Job done — %d changes, %d alerts, %d errors",
        len(result.get("saved_changes", [])),
        len(result.get("alerts_sent", [])),
        len(result.get("errors", [])),
    )


def start_scheduler():
    global _scheduler
    _scheduler = AsyncIOScheduler()

    # Parse cron expression from config (default: every 6 hours)
    parts = settings.scrape_cron.split()
    trigger = CronTrigger(
        minute=parts[0],
        hour=parts[1],
        day=parts[2] if len(parts) > 2 else "*",
        month=parts[3] if len(parts) > 3 else "*",
        day_of_week=parts[4] if len(parts) > 4 else "*",
    )

    _scheduler.add_job(
        _scrape_job,
        trigger=trigger,
        id="embassy_scraper",
        name="Embassy Website Scraper",
        replace_existing=True,
        misfire_grace_time=300,
    )

    _scheduler.start()
    logger.info("[Scheduler] Started — cron: %s", settings.scrape_cron)


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Stopped")


def get_scheduler_status() -> dict:
    if _scheduler is None:
        return {"running": False, "jobs": []}

    jobs = []
    for job in _scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
        })

    return {
        "running": _scheduler.running,
        "jobs": jobs,
    }
