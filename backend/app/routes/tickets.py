from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.models import User
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

router = APIRouter()


@router.post("/", response_model=TicketResponse)
def create(
    ticket: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.ADMIN)),
):
    """Create a new ticket (Users and Admins only)"""
    return create_ticket(db, ticket, current_user)


@router.get("/", response_model=list[TicketResponse])
def get_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.AGENT, UserRole.ADMIN)),
):
    """Get tickets with role-based filtering"""
    return list_tickets(db, current_user)


@router.get("/number/{ticket_number}", response_model=TicketResponse)
def get_one_by_number(
    ticket_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.AGENT, UserRole.ADMIN)),
):
    """Get ticket by ticket number"""
    return get_ticket_by_number(db, ticket_number, current_user)


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_one(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.AGENT, UserRole.ADMIN)),
):
    """Get ticket by internal ID"""
    return get_ticket_by_id(db, ticket_id, current_user)


@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_status(
    ticket_id: str,
    payload: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update ticket status (Agents and Admins only)"""
    return update_ticket_status(db, ticket_id, payload, current_user)


@router.post("/escalation/run", dependencies=[Depends(require_roles(UserRole.ADMIN))])
def execute_escalation(db: Session = Depends(get_db)):
    """Manually run escalation (Admin only)"""
    return run_escalation(db)