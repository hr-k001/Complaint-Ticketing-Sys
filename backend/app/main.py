from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.core.config import get_settings
from app.core.database import initialize_database, close_database_connections
from app.routes import auth, comments, tickets
from app.routes import agent_dashboard, admin_dashboard, reports, analytics

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Code here runs when the application starts
    print("Application starting up...")
    initialize_database()
    yield
    # Shutdown: Code here runs when the application stops
    print("Application shutting down...")
    close_database_connections()


# Create FastAPI app with lifespan
app = FastAPI(
    title=settings.app_name,
    description="Ticket Management System API",
    version="1.0.0",
    lifespan=lifespan  # Use lifespan instead of @app.on_event
)

# ========== CORS Configuration ==========
# Get allowed origins from environment variable
# Format: comma-separated URLs
allowed_origins_str = os.getenv("FRONTEND_URLS", "http://localhost:5173,http://localhost:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

print(f"CORS allowed origins: {allowed_origins}")  # Helpful for debugging

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, PATCH, etc.)
    allow_headers=["*"],  # Allow all headers
)

# ========== Include Routers ==========
# Auth routes
app.include_router(auth.router, prefix="/auth", tags=["Auth"])

# Ticket routes
app.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])

# Comment routes
app.include_router(comments.router, prefix="/comments", tags=["Comments"])

# Agent routes
app.include_router(agent_dashboard.router, prefix="/agent", tags=["Agent"])

# Admin routes
app.include_router(admin_dashboard.router, prefix="/admin", tags=["Admin"])

# Reports routes
app.include_router(reports.router, prefix="/reports", tags=["Reports"])

# Analytics routes
app.include_router(analytics.router, prefix="/analytics")


# ========== Root Endpoint ==========
@app.get("/")
def root():
    return {
        "message": f"{settings.app_name} running",
        "environment": settings.app_env,
        "status": "healthy"
    }


# ========== Health Check Endpoint (useful for Azure) ==========
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "environment": settings.app_env
    }