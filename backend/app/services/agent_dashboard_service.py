from app.core.models import Ticket
from datetime import datetime
from app.schemas.ticket_schema import TicketStatus

def get_agent_summary(db, agent_id):
    tickets = db.query(Ticket).filter(Ticket.assigned_to == agent_id).all()

    return {
        "total": len(tickets),
        "open": len([t for t in tickets if t.status == TicketStatus.OPEN.value]),
        "in_progress": len([t for t in tickets if t.status == TicketStatus.IN_PROGRESS.value]),
        "overdue": len([t for t in tickets if t.due_date and t.due_date < datetime.utcnow()])
    }