"""Database connection and session factory configuration."""

from typing import Generator
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure engine arguments depending on DB dialect
engine_kwargs = {"pool_pre_ping": True}
if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

try:
    engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
except Exception as e:
    logger.error(f"Failed to create database engine with DATABASE_URL={settings.DATABASE_URL}: {e}")
    raise RuntimeError(
        f"Database configuration error: Unable to create database engine for '{settings.DATABASE_URL}'. "
        f"Verify your DATABASE_URL in .env. Details: {e}"
    ) from e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def verify_db_connection() -> bool:
    """Verify that the database engine can successfully connect and execute a query."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"PostgreSQL connectivity verification failed: {e}")
        return False


def get_db() -> Generator[Session, None, None]:
    """Dependency that provides an independent transactional database session per request."""
    try:
        db = SessionLocal()
    except Exception as e:
        raise RuntimeError(
            f"Database session error: PostgreSQL service is unavailable. "
            f"Check if PostgreSQL is running and accessible at {settings.DATABASE_URL}. Details: {e}"
        ) from e

    try:
        yield db
    finally:
        db.close()
