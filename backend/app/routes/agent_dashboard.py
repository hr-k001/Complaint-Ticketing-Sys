from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.agent_dashboard_service import get_agent_summary

router = APIRouter(prefix="/agent", tags=["Agent"])

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return get_agent_summary(db, user.id)