"""
schemas.py — Pydantic request/response schemas matching the frontend types.ts exactly.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# ── Source ─────────────────────────────────────────────────────────────────────
class SourceOut(BaseModel):
    id: str
    country: str
    url: str
    type: str
    frequency: str
    status: Literal["active", "paused", "error"]
    last_checked: Optional[str] = None

    class Config:
        from_attributes = True


class SourceCreate(BaseModel):
    country: str
    url: str
    type: str = "html"
    frequency: str = "every_6h"


# ── Change ─────────────────────────────────────────────────────────────────────
class ChangeOut(BaseModel):
    id: str
    source_id: str
    country: Optional[str] = "India"
    before_text: str
    after_text: str
    summary: Optional[str] = None
    short_title: Optional[str] = None
    category: str
    severity: Literal["severe", "minor", "none"]
    confidence: Literal["high", "medium", "low"]
    effective_date: Optional[str] = None
    status: Literal["pending", "verified", "false_positive", "processed"]
    created_at: str

    class Config:
        from_attributes = True


class ChangeStatusUpdate(BaseModel):
    status: Literal["pending", "verified", "false_positive", "processed"]


# ── Customer ───────────────────────────────────────────────────────────────────
class CustomerOut(BaseModel):
    id: str
    name: str
    country: str
    visa_type: str
    stage: str
    contact: Optional[str] = None
    language: str

    class Config:
        from_attributes = True


class CustomerCreate(BaseModel):
    name: str
    country: str
    visa_type: str
    stage: str = "Pre-Approval"
    contact: Optional[str] = None
    language: str = "en"


# ── Impact ─────────────────────────────────────────────────────────────────────
class ImpactOut(BaseModel):
    id: str
    change_id: str
    customer_id: str
    level: Literal["severe", "minor", "none"]
    required_action: Optional[str] = None
    deadline: Optional[str] = None

    class Config:
        from_attributes = True


# ── Task ───────────────────────────────────────────────────────────────────────
class TaskOut(BaseModel):
    id: str
    change_id: str
    description: str
    owner: Optional[str] = None
    due_date: Optional[str] = None
    status: Literal["open", "in_progress", "done"]

    class Config:
        from_attributes = True


# ── Message ────────────────────────────────────────────────────────────────────
class MessageOut(BaseModel):
    id: str
    impact_id: str
    language: str
    body: str
    status: Literal["draft", "approved", "sent"]

    class Config:
        from_attributes = True


# ── Dashboard Summary ──────────────────────────────────────────────────────────
class DashboardSummary(BaseModel):
    totalChanges: int
    pendingApprovals: int
    affectedClients: int
    severeCount: int
    minorCount: int


# ── Alert ──────────────────────────────────────────────────────────────────────
class AlertOut(BaseModel):
    id: str
    change_id: str
    title: str
    body: Optional[str] = None
    severity: Literal["severe", "minor", "none"]
    is_read: bool
    created_at: str

    class Config:
        from_attributes = True


# ── Scraping Log ───────────────────────────────────────────────────────────────
class ScrapingLogOut(BaseModel):
    id: str
    source_id: str
    ran_at: str
    success: bool
    changes_found: str
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


# ── Manual Trigger ─────────────────────────────────────────────────────────────
class ManualScrapeRequest(BaseModel):
    source_id: Optional[str] = None   # None = run all sources
