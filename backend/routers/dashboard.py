"""
routers/dashboard.py — Dashboard summary endpoint.

Endpoints:
  GET /dashboard/summary  → stats for the 4 stat cards on the Dashboard page
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db, Change, Customer, StatusEnum, SeverityEnum
from schemas import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    """
    Returns the aggregated stats consumed by the Dashboard page.
    Matches exactly what the frontend's api.getDashboardSummary() expects.
    """
    # Total changes
    total_q = await db.execute(select(func.count()).select_from(Change))
    total = total_q.scalar_one()

    # Pending approvals
    pending_q = await db.execute(
        select(func.count()).select_from(Change).where(Change.status == StatusEnum.pending)
    )
    pending = pending_q.scalar_one()

    # Total customers (= "affected clients")
    clients_q = await db.execute(select(func.count()).select_from(Customer))
    clients = clients_q.scalar_one()

    # Severe count
    severe_q = await db.execute(
        select(func.count()).select_from(Change).where(Change.severity == SeverityEnum.severe)
    )
    severe = severe_q.scalar_one()

    # Minor count
    minor_q = await db.execute(
        select(func.count()).select_from(Change).where(Change.severity == SeverityEnum.minor)
    )
    minor = minor_q.scalar_one()

    return DashboardSummary(
        totalChanges=total,
        pendingApprovals=pending,
        affectedClients=clients,
        severeCount=severe,
        minorCount=minor,
    )
