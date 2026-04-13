from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.models import User

class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles
    
    def __call__(self, current_user: User = Depends(get_current_user)):
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Role {current_user.role} not allowed. Required: {self.allowed_roles}"
            )
        return current_user

# Convenience dependencies
require_admin = RoleChecker(["admin"])
require_agent_or_admin = RoleChecker(["agent", "admin"])
require_user_or_agent_or_admin = RoleChecker(["user", "agent", "admin"])