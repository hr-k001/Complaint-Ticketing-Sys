from app.core.models import Ticket, User
from app.schemas.ticket_schema import TicketStatus, TicketPriority
from app.schemas.user_schema import UserRole

def get_admin_summary(db):
    tickets = db.query(Ticket).all()

    return {
        "total": len(tickets),
        "open": len([t for t in tickets if t.status == TicketStatus.OPEN.value]),
        "closed": len([t for t in tickets if t.status == TicketStatus.CLOSED.value]),
        "high_priority": len([t for t in tickets if t.priority == TicketPriority.HIGH.value])
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
            "assigned_ticket_count": len(agent.assigned_tickets),
            "assigned_ticket_numbers": [ticket.ticket_number for ticket in agent.assigned_tickets],
        }
        for agent in agents
    ]