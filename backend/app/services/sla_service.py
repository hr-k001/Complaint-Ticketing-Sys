from datetime import datetime, timedelta

from app.schemas.ticket_schema import TicketPriority


PRIORITY_SLA_DAYS = {
    TicketPriority.HIGH: 1,
    TicketPriority.MEDIUM: 3,
    TicketPriority.LOW: 5,
}


def calculate_due_date(priority: TicketPriority, created_at: datetime | None = None) -> datetime:
    created_at = created_at or datetime.utcnow()
    return created_at + timedelta(days=PRIORITY_SLA_DAYS[priority])


def is_ticket_overdue(due_date: datetime) -> bool:
    return datetime.utcnow() > due_date
