from app.core.models import Ticket, User
from app.schemas.ticket_schema import TicketStatus, TicketPriority
from app.schemas.user_schema import UserRole

def get_admin_summary(db):
    tickets = db.query(Ticket).all()
    return {
        "total_tickets": len(tickets),
        "open_tickets": len([t for t in tickets if t.status == TicketStatus.OPEN.value]),
        "closed_tickets": len([t for t in tickets if t.status == TicketStatus.CLOSED.value]),
        "in_progress_tickets": len([t for t in tickets if t.status == TicketStatus.IN_PROGRESS.value]),
        "resolved_tickets": len([t for t in tickets if t.status == TicketStatus.RESOLVED.value]),
        "escalated_tickets": len([t for t in tickets if t.is_escalated]),
        "high_priority_tickets": len([t for t in tickets if t.priority == TicketPriority.HIGH.value]),
        "medium_priority_tickets": len([t for t in tickets if t.priority == TicketPriority.MEDIUM.value]),
        "low_priority_tickets": len([t for t in tickets if t.priority == TicketPriority.LOW.value]),
    }


def get_agents_overview(db):
    agents = db.query(User).filter(User.role == UserRole.AGENT.value).all()
    assigned = sum(1 for agent in agents if agent.assigned_tickets)
    return {
        "total_agents": len(agents),
        "assigned_agents": assigned,
        "unassigned_agents": len(agents) - assigned,
    }


def list_agents(db):
    agents = db.query(User).filter(User.role == UserRole.AGENT.value).all()
    
    return [
        {
            "id": agent.id,
            "full_name": agent.full_name,
            "email": agent.email,
            "agent_number": agent.agent_number,
            "assigned_tickets_count": db.query(Ticket).filter(
                Ticket.assigned_to == agent.id
            ).count(),
        }
        for agent in agents
    ]