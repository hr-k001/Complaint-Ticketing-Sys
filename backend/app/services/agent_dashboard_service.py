from app.core.models import Ticket
from datetime import datetime
from app.schemas.ticket_schema import TicketStatus

def get_agent_summary(db, agent_id):
    tickets = db.query(Ticket).filter(Ticket.assigned_to == agent_id).all()
    return {
        "total_tickets": len(tickets),
        "open_tickets": len([t for t in tickets if t.status == TicketStatus.OPEN.value]),
        "in_progress_tickets": len([t for t in tickets if t.status == TicketStatus.IN_PROGRESS.value]),
        "resolved_tickets": len([t for t in tickets if t.status == TicketStatus.RESOLVED.value]),
        "closed_tickets": len([t for t in tickets if t.status == TicketStatus.CLOSED.value]),
        "escalated_tickets": len([t for t in tickets if t.is_escalated]),
    }