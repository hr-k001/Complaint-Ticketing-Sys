from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.models import Ticket

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/reports/overdue")
def overdue_tickets(db: Session = Depends(get_db)):
    result = db.execute("SELECT * FROM vw_overdue_tickets")
    return result.fetchall()