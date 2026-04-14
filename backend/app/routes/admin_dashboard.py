from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.schemas.ticket_schema import TicketAssignRequest, TicketResponse
from app.schemas.user_schema import UserRole
from app.services.admin_dashboard_service import get_admin_summary, get_agents_overview, list_agents
from app.services.ticket_service import assign_ticket_to_agent

router = APIRouter(tags=["Admin"])

@router.get("/dashboard", dependencies=[Depends(require_roles(UserRole.ADMIN))])
def dashboard(db: Session = Depends(get_db)):
    return get_admin_summary(db)


@router.post(
    "/assign-ticket",
    response_model=TicketResponse,
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)
def assign_ticket(payload: TicketAssignRequest, db: Session = Depends(get_db)):
    return assign_ticket_to_agent(db, payload.ticket_number, payload.agent_number)


@router.get("/agents/summary", dependencies=[Depends(require_roles(UserRole.ADMIN))])
def agents_summary(db: Session = Depends(get_db)):
    return get_agents_overview(db)


@router.get("/agents", dependencies=[Depends(require_roles(UserRole.ADMIN))])
def agents_list(db: Session = Depends(get_db)):
    return list_agents(db)