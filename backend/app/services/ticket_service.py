from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.models import Ticket, User
from app.schemas.ticket_schema import TicketCreate, TicketStatusUpdate, TicketPriority
from app.schemas.user_schema import UserRole
from app.services.sla_service import calculate_due_date, is_ticket_overdue
import uuid
from datetime import datetime
from typing import List, Optional
from datetime import datetime

def list_tickets(db: Session, current_user: User):
    """List tickets with role-based filtering"""
    query = select(Ticket)
    
    # Apply role-based filtering
    if current_user.role == UserRole.USER.value:
        # Users see tickets they created
        query = query.where(Ticket.created_by == current_user.id)
    elif current_user.role == UserRole.AGENT.value:
        # Agents see tickets assigned to them
        query = query.where(Ticket.assigned_to == current_user.id)
    # Admin sees all - no filter
    
    tickets = db.execute(query).scalars().all()
    return tickets


def get_ticket_by_id(db: Session, ticket_id: str, current_user: User):
    """Get ticket by ID with permission check"""
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check permission
    if not can_view_ticket(ticket, current_user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    return ticket


def get_ticket_by_number(db: Session, ticket_number: str, current_user: User):
    """Get ticket by ticket number with permission check"""
    query = select(Ticket).where(Ticket.ticket_number == ticket_number)
    ticket = db.execute(query).scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check permission
    if not can_view_ticket(ticket, current_user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    return ticket


def create_ticket(db: Session, ticket: TicketCreate, current_user: User):
    """Create a new ticket"""
    # Generate ticket number
    ticket_number = f"TCK{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Convert priority string to enum
    try:
        priority_enum = TicketPriority(ticket.priority.lower())
    except (ValueError, AttributeError):
        priority_enum = TicketPriority.MEDIUM
    
    # Calculate SLA due date using your SLA service
    due_date = calculate_due_date(priority_enum)
    
    new_ticket = Ticket(
        id=str(uuid.uuid4()),
        ticket_number=ticket_number,
        title=ticket.title,
        description=ticket.description,
        category=ticket.category,
        priority=ticket.priority.lower(),
        status='Open',
        created_by=current_user.id,
        assigned_to=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        due_date=due_date,
        closed_at=None,
        is_escalated=False,
        escalated_at=None
    )
    
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    
    return new_ticket


def update_ticket_status(db: Session, ticket_id: str, payload: TicketStatusUpdate, current_user: User):
    """Update ticket status with permission check"""
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check permission
    if not can_modify_ticket(ticket, current_user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Update status
    old_status = ticket.status
    ticket.status = payload.status
    ticket.updated_at = datetime.utcnow()
    
    # If status is closed, set closed_at
    if payload.status.lower() == 'closed':
        ticket.closed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(ticket)
    
    return ticket


def run_escalation(db: Session):
    """Run escalation on overdue tickets"""
    # Find overdue tickets using your SLA service
    tickets = db.query(Ticket).all()
    escalated_count = 0
    
    for ticket in tickets:
        if is_ticket_overdue(ticket.due_date) and ticket.status not in ['Closed', 'Resolved']:
            if not ticket.is_escalated:
                ticket.status = 'Escalated'
                ticket.is_escalated = True
                ticket.escalated_at = datetime.utcnow()
                ticket.updated_at = datetime.utcnow()
                escalated_count += 1
    
    db.commit()
    
    return {"message": f"Escalated {escalated_count} tickets"}


# Helper functions for permission checks
def can_view_ticket(ticket: Ticket, current_user: User) -> bool:
    """Check if user can view ticket"""
    if current_user.role == UserRole.ADMIN.value:
        return True
    
    if current_user.role == UserRole.USER.value:
        return ticket.created_by == current_user.id
    
    if current_user.role == UserRole.AGENT.value:
        # Agents can view tickets assigned to them
        return ticket.assigned_to == current_user.id
    
    return False


def can_modify_ticket(ticket: Ticket, current_user: User) -> bool:
    """Check if user can modify ticket"""
    if current_user.role == UserRole.ADMIN.value:
        return True
    
    if current_user.role == UserRole.AGENT.value:
        # Agents can modify tickets assigned to them
        return ticket.assigned_to == current_user.id
    
    # Users cannot modify tickets (only view and add comments)
    return False

# ========== Agent Dashboard Required Functions ==========

def list_assigned_tickets(db, agent_id: str) -> List[Ticket]:
    """Get tickets assigned to a specific agent"""
    query = select(Ticket).where(Ticket.assigned_to == agent_id)
    tickets = db.execute(query).scalars().all()
    return tickets


# ========== Admin Dashboard Required Functions ==========

def assign_ticket_to_agent(db, ticket_number: str, agent_number: str) -> Ticket:
    """Assign a ticket to an agent by their agent number"""
    from app.core.models import User
    
    # Find the ticket by ticket_number
    query = select(Ticket).where(Ticket.ticket_number == ticket_number)
    ticket = db.execute(query).scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_number} not found")
    
    # Find the agent by agent_number
    agent_query = select(User).where(
        User.agent_number == agent_number,
        User.role == "agent"
    )
    agent = db.execute(agent_query).scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent with number {agent_number} not found")
    
    # Assign ticket to agent
    ticket.assigned_to = agent.id
    ticket.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(ticket)
    
    return ticket