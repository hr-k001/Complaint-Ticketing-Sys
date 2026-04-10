from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.models import User
from app.schemas.comment_schema import CommentCreate, CommentResponse
from app.schemas.user_schema import UserRole
from app.services.comment_service import add_comment, list_comments

router = APIRouter()


@router.get("/tickets/{ticket_id}/comments", response_model=list[CommentResponse])
def get_ticket_comments(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_comments(db, ticket_id, current_user)


@router.post(
    "/tickets/{ticket_id}/comments",
    response_model=CommentResponse,
    dependencies=[Depends(require_roles(UserRole.AGENT, UserRole.ADMIN))],
)
def create_ticket_comment(
    ticket_id: str,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return add_comment(db, ticket_id, payload.message, current_user)
