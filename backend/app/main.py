from fastapi import FastAPI

from app.core.config import get_settings
from app.core.database import initialize_database
from app.routes import auth, comments, tickets
from app.routes import agent_dashboard, admin_dashboard
from app.routes import reports
from app.routes import analytics
from fastapi.middleware.cors import CORSMiddleware

settings = get_settings()
app = FastAPI(title=settings.app_name)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
app.include_router(comments.router, tags=["Comments"])

app.include_router(agent_dashboard.router)
app.include_router(admin_dashboard.router)
app.include_router(reports.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)

@app.on_event("startup")
def on_startup():
    initialize_database()


@app.get("/")
def root():
    return {"message": f"{settings.app_name} running", "environment": settings.app_env}
from app.routes import agent_dashboard, admin_dashboard, reports

# app.include_router(agent_dashboard.router)
# app.include_router(admin_dashboard.router)
app.include_router(reports.router)
app.include_router(analytics.router)
