from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.admin_dashboard_service import get_admin_summary

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    return get_admin_summary(db)