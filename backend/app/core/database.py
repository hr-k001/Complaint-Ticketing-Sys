from collections.abc import Generator
import os
import pyodbc
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker, declarative_base

from app.core.config import get_settings

settings = get_settings()
Base = declarative_base()


def _build_connection_string() -> str:
    """Build ODBC connection string for Azure SQL"""
    return (
        f"DRIVER={{{settings.azure_sql_driver}}};"
        f"SERVER={settings.azure_sql_server};"
        f"DATABASE={settings.azure_sql_database};"
        f"UID={settings.azure_sql_username};"
        f"PWD={settings.azure_sql_password};"
        f"Encrypt={settings.azure_sql_encrypt};"
        f"TrustServerCertificate={settings.azure_sql_trust_cert};"
        f"Connection Timeout=30;"
    )


def _connect_with_pyodbc():
    """Create pyodbc connection"""
    return pyodbc.connect(_build_connection_string(), timeout=30)


# Create engine based on environment
if settings.azure_sql_server and settings.azure_sql_database:
    # Production: Use Azure SQL Database
    print(f"🔗 Connecting to Azure SQL: {settings.azure_sql_server}")
    engine = create_engine(
        "mssql+pyodbc://",
        creator=_connect_with_pyodbc,
        pool_pre_ping=True,
        future=True,
        pool_size=5,
        max_overflow=10
    )
else:
    # Development: Use SQLite locally
    print(" Using SQLite database (local development)")
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ticket_system.db")
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        future=True
    )


# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True
)


def get_db() -> Generator[Session, None, None]:
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def initialize_database() -> None:
    """Create all tables and database objects"""
    print(" Initializing database...")
    
    # Create tables from models
    Base.metadata.create_all(bind=engine)
    print(" Tables created/verified")
    
    # Only create stored procedures and views for SQL Server (production)
    if settings.azure_sql_server and settings.azure_sql_database:
        try:
            with engine.begin() as connection:
                # Create escalation stored procedure
                connection.execute(
                    text("""
                        IF OBJECT_ID('usp_escalate_overdue_tickets', 'P') IS NOT NULL
                            DROP PROCEDURE usp_escalate_overdue_tickets;
                    """)
                )
                
                connection.execute(
                    text("""
                        CREATE PROCEDURE usp_escalate_overdue_tickets
                        AS
                        BEGIN
                            SET NOCOUNT ON;
                            
                            UPDATE tickets
                            SET
                                status = 'Escalated',
                                is_escalated = 1,
                                escalated_at = COALESCE(escalated_at, SYSUTCDATETIME()),
                                updated_at = SYSUTCDATETIME()
                            WHERE due_date < SYSUTCDATETIME()
                              AND status IN ('Open', 'In Progress')
                              AND is_escalated = 0;
                        END
                    """)
                )
                
                # Create overdue tickets view
                connection.execute(
                    text("""
                        CREATE OR ALTER VIEW vw_overdue_tickets AS
                        SELECT *
                        FROM tickets
                        WHERE due_date < GETDATE()
                          AND status != 'Closed';
                    """)
                )
                
                print("Stored procedures and views created")
        except Exception as e:
            print(f" Warning: Could not create stored procedures: {e}")
    
    print(" Database initialization complete")


def close_database_connections() -> None:
    """Close all database connections"""
    engine.dispose()
    print(" Database connections closed")