import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.models import Comment, Ticket, User


def _get_ticket_for_comments(db: Session, ticket_id: str, current_user: User) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    if current_user.role == "user" and ticket.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this ticket")
    return ticket


def add_comment(db: Session, ticket_id: str, message: str, current_user: User) -> Comment:
    _get_ticket_for_comments(db, ticket_id, current_user)
    comment = Comment(
        id=str(uuid.uuid4()),
        ticket_id=ticket_id,
        author_id=current_user.id,
        message=message,
        created_at=datetime.utcnow(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def list_comments(db: Session, ticket_id: str, current_user: User) -> list[Comment]:
    _get_ticket_for_comments(db, ticket_id, current_user)
    stmt = select(Comment).where(Comment.ticket_id == ticket_id).order_by(Comment.created_at.asc())
    return list(db.scalars(stmt).all())
