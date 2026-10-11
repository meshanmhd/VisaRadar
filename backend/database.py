"""
database.py — async SQLAlchemy setup + ORM models
"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, Float, Boolean, Enum as SaEnum, ForeignKey
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, relationship
import enum
import uuid

from config import settings


import urllib.parse


# ── Engine ─────────────────────────────────────────────────────────────────────
def _prepare_db_engine(raw_url: str):
    """
    Format database URL and connection arguments.
    Handles Neon PostgreSQL URLs by stripping incompatible parameters
    (sslmode, channel_binding) and configuring SSL for asyncpg.
    """
    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+asyncpg://"):
        raw_url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    connect_args = {}
    if "asyncpg" in raw_url:
        parsed = urllib.parse.urlparse(raw_url)
        query_params = urllib.parse.parse_qs(parsed.query)
        has_ssl = "sslmode" in query_params or "ssl" in query_params or "neon.tech" in raw_url
        query_params.pop("sslmode", None)
        query_params.pop("channel_binding", None)
        query_params.pop("ssl", None)

        if has_ssl:
            connect_args["ssl"] = "require"

        clean_query = urllib.parse.urlencode({k: v[0] for k, v in query_params.items()})
        cleaned_url = urllib.parse.urlunparse(parsed._replace(query=clean_query))
        return cleaned_url, connect_args

    return raw_url, connect_args


db_url, db_connect_args = _prepare_db_engine(settings.database_url)
engine = create_async_engine(db_url, connect_args=db_connect_args, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def generate_id() -> str:
    return str(uuid.uuid4())


# ── Enums ──────────────────────────────────────────────────────────────────────
class SeverityEnum(str, enum.Enum):
    severe = "severe"
    minor = "minor"
    none = "none"


class ConfidenceEnum(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class StatusEnum(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    false_positive = "false_positive"
    processed = "processed"


class SourceStatusEnum(str, enum.Enum):
    active = "active"
    paused = "paused"
    error = "error"


class TaskStatusEnum(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    done = "done"


class MessageStatusEnum(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    sent = "sent"


# ── ORM Models ─────────────────────────────────────────────────────────────────
class Source(Base):
    """Represents a scraping target (embassy website)."""
    __tablename__ = "sources"

    id = Column(String, primary_key=True, default=generate_id)
    country = Column(String, nullable=False)
    url = Column(String, nullable=False)
    type = Column(String, default="html")          # html | pdf | js
    frequency = Column(String, default="every_6h")
    status = Column(SaEnum(SourceStatusEnum), default=SourceStatusEnum.active)
    last_checked = Column(DateTime, nullable=True)
    # Content snapshot used for diffing
    last_snapshot = Column(Text, nullable=True)

    changes = relationship("Change", back_populates="source", cascade="all, delete-orphan")


class Change(Base):
    """A detected regulatory change on a monitored source."""
    __tablename__ = "changes"

    id = Column(String, primary_key=True, default=generate_id)
    source_id = Column(String, ForeignKey("sources.id"), nullable=False)
    before_text = Column(Text, nullable=False)
    after_text = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    short_title = Column(String, nullable=True)
    category = Column(String, default="General")
    severity = Column(SaEnum(SeverityEnum), default=SeverityEnum.minor)
    confidence = Column(SaEnum(ConfidenceEnum), default=ConfidenceEnum.medium)
    effective_date = Column(String, nullable=True)
    status = Column(SaEnum(StatusEnum), default=StatusEnum.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source", back_populates="changes")
    impacts = relationship("Impact", back_populates="change", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="change", cascade="all, delete-orphan")


class Customer(Base):
    """Immigration client tracked by the firm."""
    __tablename__ = "customers"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    visa_type = Column(String, nullable=False)
    stage = Column(String, default="Pre-Approval")
    contact = Column(String, nullable=True)
    language = Column(String, default="en")

    impacts = relationship("Impact", back_populates="customer", cascade="all, delete-orphan")


class Impact(Base):
    """How a specific change impacts a specific customer."""
    __tablename__ = "impacts"

    id = Column(String, primary_key=True, default=generate_id)
    change_id = Column(String, ForeignKey("changes.id"), nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    level = Column(SaEnum(SeverityEnum), default=SeverityEnum.minor)
    required_action = Column(Text, nullable=True)
    deadline = Column(String, nullable=True)

    change = relationship("Change", back_populates="impacts")
    customer = relationship("Customer", back_populates="impacts")
    messages = relationship("Message", back_populates="impact", cascade="all, delete-orphan")


class Task(Base):
    """Internal action item raised against a change."""
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=generate_id)
    change_id = Column(String, ForeignKey("changes.id"), nullable=False)
    description = Column(Text, nullable=False)
    owner = Column(String, nullable=True)
    due_date = Column(String, nullable=True)
    status = Column(SaEnum(TaskStatusEnum), default=TaskStatusEnum.open)

    change = relationship("Change", back_populates="tasks")


class Message(Base):
    """Client communication draft generated for an impact."""
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_id)
    impact_id = Column(String, ForeignKey("impacts.id"), nullable=False)
    language = Column(String, default="en")
    body = Column(Text, nullable=False)
    status = Column(SaEnum(MessageStatusEnum), default=MessageStatusEnum.draft)

    impact = relationship("Impact", back_populates="messages")


class ScrapingLog(Base):
    """Audit log for every scraping run."""
    __tablename__ = "scraping_logs"

    id = Column(String, primary_key=True, default=generate_id)
    source_id = Column(String, ForeignKey("sources.id"), nullable=False)
    ran_at = Column(DateTime, default=datetime.utcnow)
    success = Column(Boolean, default=True)
    changes_found = Column(String, default="0")
    error_message = Column(Text, nullable=True)


class Alert(Base):
    """Real-time alert dispatched when a change is detected."""
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=generate_id)
    change_id = Column(String, ForeignKey("changes.id"), nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    severity = Column(SaEnum(SeverityEnum), default=SeverityEnum.minor)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Dependency ─────────────────────────────────────────────────────────────────
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


from sqlalchemy import text

async def init_db():
    """Create all tables and perform lightweight schema migrations if needed."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Ensure new columns exist on SQLite table 'changes' (if using SQLite)
        if "sqlite" in str(engine.url):
            try:
                result = await conn.execute(text("PRAGMA table_info(changes);"))
                columns = [row[1] for row in result.fetchall()]
                if "summary" not in columns:
                    await conn.execute(text("ALTER TABLE changes ADD COLUMN summary TEXT;"))
                if "short_title" not in columns:
                    await conn.execute(text("ALTER TABLE changes ADD COLUMN short_title VARCHAR;"))
            except Exception:
                pass
