from collections.abc import Callable
from typing import Optional, List

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.models import User
from app.core.security import decode_access_token
from app.schemas.user_schema import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        if not email:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    user = db.scalar(select(User).where(User.email == email))
    if not user:
        raise credentials_exception
    return user


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    """Require specific roles for access"""
    allowed_roles = {role.value for role in roles}

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' not allowed. Required: {allowed_roles}",
            )
        return current_user

    return role_checker


# ========== NEW CONVENIENCE DEPENDENCIES (ADD THESE) ==========

def get_current_user_id(current_user: User = Depends(get_current_user)) -> int:
    """Get current user's ID for filtering queries"""
    return current_user.id


def get_current_user_role(current_user: User = Depends(get_current_user)) -> str:
    """Get current user's role for conditional logic"""
    return current_user.role


def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Get current user if authenticated, otherwise None (for public endpoints)"""
    if not token:
        return None
    
    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        if not email:
            return None
    except JWTError:
        return None
    
    user = db.scalar(select(User).where(User.email == email))
    return user


# ========== ROLE-SPECIFIC DEPENDENCIES (ADD THESE) ==========

def require_admin(current_user: User = Depends(require_roles(UserRole.ADMIN))):
    """Dependency that requires admin role"""
    return current_user


def require_agent_or_admin(current_user: User = Depends(require_roles(UserRole.AGENT, UserRole.ADMIN))):
    """Dependency that requires agent or admin role"""
    return current_user


def require_any_user(current_user: User = Depends(require_roles(UserRole.USER, UserRole.AGENT, UserRole.ADMIN))):
    """Dependency that requires any authenticated user"""
    return current_user


# ========== HELPER FOR TICKET VISIBILITY (ADD THIS) ==========

def get_ticket_visibility_filter(current_user: User = Depends(get_current_user)) -> dict:
    """
    Returns a filter dictionary for ticket queries based on user role.
    Use this in ticket listing endpoints.
    """
    if current_user.role == UserRole.ADMIN.value:
        # Admin sees all tickets
        return {"filter_type": "all", "user_id": None}
    elif current_user.role == UserRole.AGENT.value:
        # Agent sees tickets assigned to them
        return {"filter_type": "assigned", "user_id": current_user.id}
    else:
        # Regular user sees only their own tickets
        return {"filter_type": "owned", "user_id": current_user.id}


def can_modify_ticket(ticket_user_id: str, assigned_to_id: Optional[str], current_user: User) -> bool:
    """
    Check if current user can modify a specific ticket.
    Use this before allowing status updates or other modifications.
    """
    if current_user.role == UserRole.ADMIN.value:
        return True
    elif current_user.role == UserRole.AGENT.value:
        return assigned_to_id == current_user.id
    else:  # USER role
        return ticket_user_id == current_user.id


def can_comment_on_ticket(ticket_user_id: str, assigned_to_id: Optional[str], current_user: User) -> bool:
    """
    Check if current user can comment on a ticket.
    """
    if current_user.role == UserRole.ADMIN.value:
        return True
    elif current_user.role == UserRole.AGENT.value:
        return assigned_to_id == current_user.id
    else:  # USER role
        # Decide: Should users be able to comment? Usually yes on their own tickets
        return ticket_user_id == current_user.id


def can_view_ticket(ticket_user_id: str, assigned_to_id: Optional[str], current_user: User) -> bool:
    """
    Check if current user can view a specific ticket.
    """
    if current_user.role == UserRole.ADMIN.value:
        return True
    elif current_user.role == UserRole.AGENT.value:
        return assigned_to_id == current_user.id
    else:  # USER role
        return ticket_user_id == current_user.id