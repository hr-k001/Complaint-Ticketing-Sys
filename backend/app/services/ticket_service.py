import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.models import Ticket, User
from app.schemas.ticket_schema import TicketCreate, TicketStatus, TicketStatusUpdate
from app.services.sla_service import calculate_due_date


ALLOWED_STATUS_TRANSITIONS: dict[TicketStatus, set[TicketStatus]] = {
    TicketStatus.OPEN: {TicketStatus.IN_PROGRESS, TicketStatus.CLOSED},
    TicketStatus.IN_PROGRESS: {TicketStatus.CLOSED},
    TicketStatus.ESCALATED: {TicketStatus.IN_PROGRESS, TicketStatus.CLOSED},
    TicketStatus.CLOSED: set(),
}


def _generate_ticket_number(db: Session) -> str:
    today_prefix = datetime.utcnow().strftime("TCK%Y%m%d")
    count = db.scalar(
        select(func.count(Ticket.id)).where(Ticket.ticket_number.like(f"{today_prefix}%"))
    ) or 0
    return f"{today_prefix}{count + 1:03d}"


def create_ticket(db: Session, ticket: TicketCreate, created_by: User) -> Ticket:
    created_at = datetime.utcnow()
    db_ticket = Ticket(
        id=str(uuid.uuid4()),
        ticket_number=_generate_ticket_number(db),
        title=ticket.title,
        description=ticket.description,
        priority=ticket.priority.value,
        category=ticket.category.value,
        status=TicketStatus.OPEN.value,
        created_by=created_by.id,
        due_date=calculate_due_date(ticket.priority, created_at),
        created_at=created_at,
        updated_at=created_at,
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


def list_tickets(db: Session, current_user: User) -> list[Ticket]:
    stmt = select(Ticket).order_by(Ticket.created_at.desc())
    if current_user.role == "user":
        stmt = stmt.where(Ticket.created_by == current_user.id)
    return list(db.scalars(stmt).all())


def get_ticket_by_id(db: Session, ticket_id: str, current_user: User) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    if current_user.role == "user" and ticket.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this ticket")
    return ticket


def get_ticket_by_number(db: Session, ticket_number: str, current_user: User) -> Ticket:
    ticket = db.scalar(select(Ticket).where(Ticket.ticket_number == ticket_number))
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    if current_user.role == "user" and ticket.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this ticket")
    return ticket


def update_ticket_status(db: Session, ticket_id: str, payload: TicketStatusUpdate, current_user: User):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    current_status = TicketStatus(ticket.status)   
    next_status = payload.status                   

    # same status check
    if next_status == current_status:
        return ticket

    # validate transition
    if next_status not in ALLOWED_STATUS_TRANSITIONS[current_status]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from {current_status.value} to {next_status.value}",
        )

    # update
    ticket.status = next_status.value
    ticket.updated_at = datetime.utcnow()

    if next_status == TicketStatus.CLOSED:
        ticket.closed_at = datetime.utcnow()

    db.commit()
    db.refresh(ticket)

    return ticket


def run_escalation(db: Session) -> dict[str, int]:
    before_count = db.scalar(
        select(func.count(Ticket.id)).where(
            Ticket.is_escalated == True,
            Ticket.status == TicketStatus.ESCALATED.value,
        )
    ) or 0

    db.execute(text("EXEC usp_escalate_overdue_tickets"))
    db.commit()

    after_count = db.scalar(
        select(func.count(Ticket.id)).where(
            Ticket.is_escalated == True,
            Ticket.status == TicketStatus.ESCALATED.value,
        )
    ) or 0
    return {"escalated_tickets": max(after_count - before_count, 0)}


def create_ticket_history(db: Session, ticket_id: str, old_status: TicketStatus, new_status: TicketStatus) -> None:
    from app.core.models import TicketHistory
    history = TicketHistory(
        ticket_id=ticket_id,
        old_status=old_status,
        new_status=new_status,
        changed_at=datetime.utcnow()
    )
    db.add(history)
    db.commit()