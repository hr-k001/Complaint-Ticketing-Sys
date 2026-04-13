from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.models import User
from app.schemas.user_schema import UserRole

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/reports/overdue", dependencies=[Depends(require_roles(UserRole.AGENT, UserRole.ADMIN))])
def overdue_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.AGENT.value:
        result = db.execute(
            "SELECT * FROM vw_overdue_tickets WHERE assigned_to = :agent_id",
            {"agent_id": current_user.id},
        )
    else:
        result = db.execute("SELECT * FROM vw_overdue_tickets")
    return result.fetchall()