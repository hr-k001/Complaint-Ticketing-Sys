from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user, 
    require_roles, 
    can_comment_on_ticket,  # NEW: permission checker for comments
    can_view_ticket  # NEW: for viewing comments
)
from app.core.models import User, Ticket
from app.schemas.comment_schema import CommentCreate, CommentResponse
from app.schemas.user_schema import UserRole
from app.services.comment_service import add_comment, list_comments, update_comment, delete_comment

router = APIRouter()


@router.get("/tickets/{ticket_id}/comments", response_model=list[CommentResponse])
def get_ticket_comments(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.AGENT, UserRole.ADMIN)),  # Allow all authenticated users
):
    """Get all comments for a ticket with permission check:
    - Users can see comments on their own tickets
    - Agents can see comments on tickets assigned to them
    - Admins can see comments on all tickets
    """
    # First verify the user can view the ticket
    from app.services.ticket_service import get_ticket_by_id
    
    try:
        ticket = get_ticket_by_id(db, ticket_id, current_user)
    except HTTPException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found or you don't have permission to view it"
        ) from e
    
    # Check if user can view comments on this ticket
    if not can_view_ticket(ticket.user_id, ticket.assigned_to, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view comments on this ticket"
        )
    
    return list_comments(db, ticket_id, current_user)


@router.post("/tickets/{ticket_id}/comments", response_model=CommentResponse)
def create_ticket_comment(
    ticket_id: str,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Remove dependencies from decorator, do custom check
):
    """Add a comment to a ticket with role-based permissions:
    - Admins can comment on any ticket
    - Agents can comment on tickets assigned to them
    - Users can comment on their own tickets (optional - decide based on requirements)
    """
    # First verify ticket exists
    from app.services.ticket_service import get_ticket_by_id
    
    try:
        ticket = get_ticket_by_id(db, ticket_id, current_user)
    except HTTPException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        ) from e
    
    # Check commenting permissions
    if not can_comment_on_ticket(ticket.user_id, ticket.assigned_to, current_user):
        # Provide specific error message based on role
        if current_user.role == UserRole.USER.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Users can only comment on their own tickets"
            )
        elif current_user.role == UserRole.AGENT.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Agents can only comment on tickets assigned to them"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to comment on this ticket"
            )
    
    return add_comment(db, ticket_id, payload.message, current_user)


# ========== NEW ENDPOINTS FOR COMMENT MANAGEMENT ==========

@router.patch("/comments/{comment_id}", response_model=CommentResponse)
def update_comment_endpoint(
    comment_id: str,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.AGENT, UserRole.ADMIN)),
):
    """Update a comment - Only agents and admins can edit comments"""
    # Optional: Add check that the user is the one who created the comment
    return update_comment(db, comment_id, payload.message, current_user)


@router.delete("/comments/{comment_id}")
def delete_comment_endpoint(
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),  # Only admins can delete comments
):
    """Delete a comment - Admin only"""
    return delete_comment(db, comment_id, current_user)


@router.get("/my-comments", response_model=list[CommentResponse])
def get_my_comments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.AGENT, UserRole.ADMIN)),
):
    """Get all comments written by the current user"""
    from sqlalchemy import select
    from app.core.models import Comment
    
    query = select(Comment).where(Comment.user_id == current_user.id).order_by(Comment.created_at.desc())
    comments = db.execute(query).scalars().all()
    return comments


# ========== OPTIONAL: Allow users to comment on their own tickets ==========

@router.post("/tickets/{ticket_id}/user-comment", response_model=CommentResponse)
def user_add_comment(
    ticket_id: str,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    """Dedicated endpoint for users to add comments to their own tickets"""
    from app.services.ticket_service import get_ticket_by_id
    
    try:
        ticket = get_ticket_by_id(db, ticket_id, current_user)
    except HTTPException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        ) from e
    
    # Users can only comment on their own tickets
    if ticket.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only comment on your own tickets"
        )
    
    return add_comment(db, ticket_id, payload.message, current_user)