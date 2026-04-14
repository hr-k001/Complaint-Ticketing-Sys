from datetime import datetime, timedelta, timezone
from app.schemas.ticket_schema import TicketPriority

PRIORITY_SLA_DAYS = {
    TicketPriority.HIGH: 1,
    TicketPriority.MEDIUM: 3,
    TicketPriority.LOW: 5,
}

def calculate_due_date(priority: TicketPriority, created_at: datetime | None = None) -> datetime:
    """Calculate due date based on priority (in days)"""
    created_at = created_at or datetime.now(timezone.utc)
    return created_at + timedelta(days=PRIORITY_SLA_DAYS[priority])

def is_ticket_overdue(due_date: datetime) -> bool:
    """Check if ticket is overdue"""
    return datetime.now(timezone.utc) > due_date

# Add this function for compatibility with ticket_service.py
def calculate_sla_due_date(priority: str) -> datetime:
    """Calculate SLA due date from priority string (for compatibility)"""
    # Convert string priority to enum
    try:
        priority_enum = TicketPriority(priority.lower())
    except ValueError:
        priority_enum = TicketPriority.MEDIUM  # Default to medium
    
    return calculate_due_date(priority_enum)