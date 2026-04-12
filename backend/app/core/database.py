import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from collections.abc import Generator

from app.core.config import get_settings
from app.core.models import Base

settings = get_settings()


if settings.azure_sql_server:
    import pyodbc

    def _build_connection_string() -> str:
        return (
            f"DRIVER={{{settings.azure_sql_driver}}};"
            f"SERVER={settings.azure_sql_server};"
            f"DATABASE={settings.azure_sql_database};"
            f"UID={settings.azure_sql_username};"
            f"PWD={settings.azure_sql_password};"
            f"Encrypt={settings.azure_sql_encrypt};"
            f"TrustServerCertificate={settings.azure_sql_trust_cert};"
        )

    def _connect_with_pyodbc():
        return pyodbc.connect(_build_connection_string(), timeout=30)

    engine = create_engine(
        "mssql+pyodbc://",
        creator=_connect_with_pyodbc,
        pool_pre_ping=True,
        future=True,
    )

else:
    # ✅ FALLBACK TO SQLITE (THIS FIXES YOUR ISSUE)
    DATABASE_URL = "sqlite:///./test.db"

    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        future=True
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)