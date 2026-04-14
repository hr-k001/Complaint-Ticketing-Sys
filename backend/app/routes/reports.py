from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.models import Ticket, TicketHistory, User
from app.schemas.user_schema import UserRole

router = APIRouter(tags=["Reports"])

@router.get("/overdue", dependencies=[Depends(require_roles(UserRole.AGENT, UserRole.ADMIN))])
def overdue_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.AGENT.value:
        result = db.execute(
            text("SELECT * FROM vw_overdue_tickets WHERE assigned_to = :agent_id"),
            {"agent_id": current_user.id},
        )
    else:
        result = db.execute(text("SELECT * FROM vw_overdue_tickets"))
    return [dict(row) for row in result.mappings().all()]


@router.get("/history/{ticket_number}", dependencies=[Depends(require_roles(UserRole.ADMIN))])
def ticket_history(ticket_number: str, db: Session = Depends(get_db)):
    ticket = db.scalar(select(Ticket).where(Ticket.ticket_number == ticket_number))
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    history_rows = db.query(TicketHistory).filter(TicketHistory.ticket_id == ticket.id).order_by(TicketHistory.changed_at).all()
    return [
        {
            "ticket_number": ticket.ticket_number,
            "old_status": row.old_status,
            "new_status": row.new_status,
            "changed_at": row.changed_at,
        }
        for row in history_rows
    ]