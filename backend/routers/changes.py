"""
routers/changes.py — CRUD for Change records.

Endpoints:
  GET  /changes              → list all changes (with optional filters)
  GET  /changes/{id}         → get one change
  PATCH /changes/{id}        → update status
  GET  /changes/{id}/impacts → impacts for a specific change
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from typing import List, Optional

from database import get_db, Change, Impact
from schemas import ChangeOut, ChangeStatusUpdate, ImpactOut

router = APIRouter(prefix="/changes", tags=["Changes"])


@router.get("", response_model=List[ChangeOut])
async def list_changes(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Return all changes, with optional severity/status/source_id filters."""
    q = select(Change).options(joinedload(Change.source)).order_by(Change.created_at.desc())
    if severity:
        q = q.where(Change.severity == severity)
    if status:
        q = q.where(Change.status == status)
    if source_id:
        q = q.where(Change.source_id == source_id)

    result = await db.execute(q)
    changes = result.scalars().all()

    return [
        ChangeOut(
            id=c.id,
            source_id=c.source_id,
            country=c.source.country if (c.source and c.source.country) else "India",
            before_text=c.before_text,
            after_text=c.after_text,
            summary=c.summary,
            short_title=c.short_title,
            category=c.category,
            severity=c.severity.value,
            confidence=c.confidence.value,
            effective_date=c.effective_date,
            status=c.status.value,
            created_at=c.created_at.isoformat(),
        )
        for c in changes
    ]


@router.get("/{change_id}", response_model=ChangeOut)
async def get_change(change_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Change).options(joinedload(Change.source)).where(Change.id == change_id))
    change = result.scalar_one_or_none()
    if not change:
        raise HTTPException(404, "Change not found")

    return ChangeOut(
        id=change.id,
        source_id=change.source_id,
        country=change.source.country if (change.source and change.source.country) else "India",
        before_text=change.before_text,
        after_text=change.after_text,
        summary=change.summary,
        short_title=change.short_title,
        category=change.category,
        severity=change.severity.value,
        confidence=change.confidence.value,
        effective_date=change.effective_date,
        status=change.status.value,
        created_at=change.created_at.isoformat(),
    )


@router.patch("/{change_id}", response_model=ChangeOut)
async def update_change_status(
    change_id: str,
    body: ChangeStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update the review status of a detected change (called from the Changes page)."""
    result = await db.execute(select(Change).options(joinedload(Change.source)).where(Change.id == change_id))
    change = result.scalar_one_or_none()
    if not change:
        raise HTTPException(404, "Change not found")

    change.status = body.status
    await db.commit()
    await db.refresh(change)

    return ChangeOut(
        id=change.id,
        source_id=change.source_id,
        country=change.source.country if (change.source and change.source.country) else "India",
        before_text=change.before_text,
        after_text=change.after_text,
        summary=change.summary,
        short_title=change.short_title,
        category=change.category,
        severity=change.severity.value,
        confidence=change.confidence.value,
        effective_date=change.effective_date,
        status=change.status.value,
        created_at=change.created_at.isoformat(),
    )


@router.get("/{change_id}/impacts", response_model=List[ImpactOut])
async def get_impacts_for_change(change_id: str, db: AsyncSession = Depends(get_db)):
    """Return all customer impacts for a specific change."""
    result = await db.execute(select(Impact).where(Impact.change_id == change_id))
    impacts = result.scalars().all()

    return [
        ImpactOut(
            id=i.id,
            change_id=i.change_id,
            customer_id=i.customer_id,
            level=i.level.value,
            required_action=i.required_action,
            deadline=i.deadline,
        )
        for i in impacts
    ]
