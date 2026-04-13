from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user, 
    require_roles, 
    can_modify_ticket,  # NEW: permission checker
    get_ticket_visibility_filter  # NEW: for filtering
)
from app.core.models import User, Ticket
from app.schemas.ticket_schema import TicketCreate, TicketResponse, TicketStatusUpdate
from app.schemas.user_schema import UserRole
from app.services.ticket_service import (
    create_ticket,
    get_ticket_by_id,
    get_ticket_by_number,
    list_tickets,
    run_escalation,
    update_ticket_status,
)
from app.core.dependencies import (
    get_current_user, 
    require_roles, 
    can_modify_ticket,
    can_view_ticket,  # Add this
    get_ticket_visibility_filter
)

router = APIRouter()


@router.post("/", response_model=TicketResponse)
def create(
    ticket: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.ADMIN)),  # Agents can't create tickets? Usually only users create
):
    # Only regular users and admins can create tickets
    # Agents typically don't create tickets, they resolve them
    if current_user.role == UserRole.AGENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agents cannot create tickets. Only users and admins can."
        )
    return create_ticket(db, ticket, current_user)


@router.get("/", response_model=list[TicketResponse])
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.AGENT, UserRole.ADMIN)),  # Allow all authenticated users
):
    """Get tickets with role-based filtering:
    - Users see only their own tickets
    - Agents see tickets assigned to them
    - Admins see all tickets
    """
    # Use the visibility filter helper
    filter_info = get_ticket_visibility_filter(current_user)
    
    # Pass the filter to your service function
    # You'll need to update your ticket_service.py to accept this filter
    return list_tickets(db, current_user, filter_info)


@router.get("/number/{ticket_number}", response_model=TicketResponse)
def get_one_by_number(
    ticket_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.AGENT, UserRole.ADMIN)),
):
    """Get ticket by ticket number with permission check"""
    ticket = get_ticket_by_number(db, ticket_number, current_user)
    
    # Additional permission check (service should also do this)
    if not can_view_ticket(ticket.user_id, ticket.assigned_to, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this ticket"
        )
    return ticket


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_one(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.AGENT, UserRole.ADMIN)),
):
    """Get ticket by internal ID with permission check"""
    ticket = get_ticket_by_id(db, ticket_id, current_user)
    
    # Additional permission check
    if not can_view_ticket(ticket.user_id, ticket.assigned_to, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this ticket"
        )
    return ticket


@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_status(
    ticket_id: str,
    payload: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Don't use require_roles here, do custom check
):
    """Update ticket status with permission checks:
    - Admins can update any ticket
    - Agents can update tickets assigned to them
    - Users can update their own tickets (but maybe only to add comments? Usually users can't change status)
    """
    # First get the ticket (you'll need to modify your service to return the ticket object)
    # For now, let's assume get_ticket_by_id returns the ticket object
    from app.services.ticket_service import get_ticket_by_id as get_ticket
    
    try:
        ticket = get_ticket(db, ticket_id, current_user)
    except HTTPException:
        # If the service already checks permissions, handle accordingly
        raise
    
    # Check if current user can modify this ticket
    if not can_modify_ticket(ticket.user_id, ticket.assigned_to, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this ticket's status"
        )
    
    # Additional role-based restrictions
    if current_user.role == UserRole.USER.value:
        # Users can only change status to specific values? Or not at all?
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Users cannot update ticket status. Only agents and admins can."
        )
    
    return update_ticket_status(db, ticket_id, payload, current_user)


@router.post("/escalation/run")
def execute_escalation(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),  # This is correct - only admin
):
    """Manually run escalation - Admin only"""
    return run_escalation(db)


# ========== NEW ENDPOINTS FOR BETTER RBAC ==========

@router.get("/assigned/me", response_model=list[TicketResponse])
def get_my_assigned_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.AGENT, UserRole.ADMIN)),
):
    """Get tickets assigned to the current agent - Convenience endpoint"""
    from sqlalchemy import select
    
    query = select(Ticket).where(Ticket.assigned_to == current_user.id)
    tickets = db.execute(query).scalars().all()
    return tickets


@router.get("/my-tickets", response_model=list[TicketResponse])
def get_my_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.AGENT, UserRole.ADMIN)),
):
    """Get tickets created by the current user"""
    from sqlalchemy import select
    
    query = select(Ticket).where(Ticket.user_id == current_user.id)
    tickets = db.execute(query).scalars().all()
    return tickets