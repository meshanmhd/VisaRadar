"""
routers/sources.py — CRUD for Source (monitoring targets).

Endpoints:
  GET  /sources       → list all sources
  POST /sources       → add a new source
  PUT  /sources/{id}  → update a source
  DELETE /sources/{id}→ delete a source
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from database import get_db, Source
from schemas import SourceOut, SourceCreate

router = APIRouter(prefix="/sources", tags=["Sources"])


def _to_schema(s: Source) -> SourceOut:
    return SourceOut(
        id=s.id,
        country=s.country,
        url=s.url,
        type=s.type,
        frequency=s.frequency,
        status=s.status.value,
        last_checked=s.last_checked.isoformat() if s.last_checked else None,
    )


@router.get("", response_model=List[SourceOut])
async def list_sources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Source).order_by(Source.country))
    return [_to_schema(s) for s in result.scalars().all()]


@router.post("", response_model=SourceOut, status_code=201)
async def create_source(body: SourceCreate, db: AsyncSession = Depends(get_db)):
    source = Source(**body.model_dump())
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return _to_schema(source)


@router.put("/{source_id}", response_model=SourceOut)
async def update_source(source_id: str, body: SourceCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Source).where(Source.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(404, "Source not found")

    for k, v in body.model_dump().items():
        setattr(source, k, v)

    await db.commit()
    await db.refresh(source)
    return _to_schema(source)


@router.delete("/{source_id}", status_code=204)
async def delete_source(source_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Source).where(Source.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(404, "Source not found")
    await db.delete(source)
    await db.commit()
