from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.models import User
from app.schemas.ticket_schema import TicketResponse, TicketStatusUpdate
from app.schemas.user_schema import UserRole
from app.services.agent_dashboard_service import get_agent_summary
from app.services.ticket_service import list_assigned_tickets, update_ticket_status

router = APIRouter(prefix="/agent", tags=["Agent"])

@router.get("/dashboard", dependencies=[Depends(require_roles(UserRole.AGENT))])
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_agent_summary(db, user.id)


@router.get("/tickets", response_model=list[TicketResponse], dependencies=[Depends(require_roles(UserRole.AGENT))])
def assigned_tickets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return list_assigned_tickets(db, user.id)


@router.patch(
    "/tickets/{ticket_id}/status",
    response_model=TicketResponse,
    dependencies=[Depends(require_roles(UserRole.AGENT))],
)
def update_assigned_ticket_status(
    ticket_id: str,
    payload: TicketStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return update_ticket_status(db, ticket_id, payload, user)
