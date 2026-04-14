import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.models import Comment, Ticket, User
from app.schemas.user_schema import UserRole


def _get_ticket_for_comments(db: Session, ticket_id: str, current_user: User) -> Ticket:
    """Get ticket with permission check for viewing comments"""
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    # Role-based permission check
    if current_user.role == UserRole.USER.value:
        # Users can only see their own tickets
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Not allowed to access this ticket"
            )
    elif current_user.role == UserRole.AGENT.value:
        # Agents can only see tickets assigned to them
        if ticket.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Agents can only access tickets assigned to them"
            )
    # Admins can access any ticket - no check needed
    
    return ticket


def _check_comment_permission(ticket: Ticket, current_user: User, is_adding: bool = True) -> None:
    """Check if user has permission to add/delete comments"""
    if current_user.role == UserRole.ADMIN.value:
        # Admin can do anything
        return
    
    elif current_user.role == UserRole.AGENT.value:
        # Agents can only comment on tickets assigned to them
        if ticket.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Agents can only comment on tickets assigned to them"
            )
    
    elif current_user.role == UserRole.USER.value:
        # Decide: Should users be allowed to comment?
        # Option 1: Users cannot comment at all (strict)
        # raise HTTPException(
        #     status_code=status.HTTP_403_FORBIDDEN,
        #     detail="Users cannot add comments. Only agents and admins can."
        # )
        # Option 2: Users can only comment on their own tickets (less strict)
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Users can only comment on their own tickets"
            )


def add_comment(db: Session, ticket_id: str, message: str, current_user: User) -> Comment:
    """Add a comment to a ticket with permission checks"""
    # Get and validate ticket access
    ticket = _get_ticket_for_comments(db, ticket_id, current_user)
    
    # Check commenting permission
    _check_comment_permission(ticket, current_user, is_adding=True)
    
    # Validate message is not empty
    if not message or not message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment message cannot be empty"
        )
    
    # Create comment
    comment = Comment(
        id=str(uuid.uuid4()),
        ticket_id=ticket_id,
        author_id=current_user.id,
        message=message.strip(),
        created_at=datetime.now(timezone.utc),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # ticket.updated_at is fine — Ticket model DOES have this field
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()

    return comment


def list_comments(db: Session, ticket_id: str, current_user: User) -> list[Comment]:
    """List all comments for a ticket with permission check"""
    # This already does permission check via _get_ticket_for_comments
    _get_ticket_for_comments(db, ticket_id, current_user)
    
    stmt = select(Comment).where(Comment.ticket_id == ticket_id).order_by(Comment.created_at.asc())
    return list(db.scalars(stmt).all())


def get_comment(db: Session, comment_id: str, current_user: User) -> Comment:
    """Get a single comment by ID with permission check"""
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check if user has access to the associated ticket
    ticket = db.get(Ticket, comment.ticket_id)
    _get_ticket_for_comments(db, ticket.id, current_user)
    
    return comment


def update_comment(
    db: Session, 
    comment_id: str, 
    message: str, 
    current_user: User
) -> Comment:
    """Update a comment - only the author or admin can update"""
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check permission to update
    if current_user.role != UserRole.ADMIN.value and comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own comments"
        )
    
    # Validate message
    if not message or not message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment message cannot be empty"
        )
    
    # Update comment
    comment.message = message.strip()
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)
    
    return comment


def delete_comment(db: Session, comment_id: str, current_user: User) -> dict:
    """Delete a comment - admin only or author deletion"""
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check permission to delete
    # Option 1: Only admins can delete (strict)
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete comments"
        )
    
    # Option 2: Author or admin can delete (less strict)
    # if current_user.role != UserRole.ADMIN.value and comment.author_id != current_user.id:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="You can only delete your own comments"
    #     )
    
    db.delete(comment)
    db.commit()
    
    return {"message": "Comment deleted successfully", "comment_id": comment_id}


def get_ticket_comments_count(db: Session, ticket_id: str, current_user: User) -> int:
    """Get count of comments for a ticket"""
    _get_ticket_for_comments(db, ticket_id, current_user)
    
    stmt = select(Comment).where(Comment.ticket_id == ticket_id)
    return db.execute(stmt).scalar() or 0


def get_user_comments(db: Session, user_id: int, current_user: User) -> list[Comment]:
    """Get all comments by a specific user (admin only)"""
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view other users' comments"
        )
    
    stmt = select(Comment).where(Comment.author_id == user_id).order_by(Comment.created_at.desc())
    return list(db.scalars(stmt).all())