from fastapi import FastAPI

from app.core.config import get_settings
from app.core.database import initialize_database
from app.routes import auth, comments, tickets

settings = get_settings()
app = FastAPI(title=settings.app_name)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
app.include_router(comments.router, tags=["Comments"])


@app.on_event("startup")
def on_startup():
    initialize_database()


@app.get("/")
def root():
    return {"message": f"{settings.app_name} running", "environment": settings.app_env}
