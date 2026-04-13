from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    """Schema for creating a new comment"""
    message: str = Field(..., min_length=1, max_length=1000, description="Comment message content")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "This is a comment about the ticket."
            }
        }
    }


class CommentUpdate(BaseModel):
    """Schema for updating an existing comment"""
    message: str = Field(..., min_length=1, max_length=1000, description="Updated comment message")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Updated comment with new information."
            }
        }
    }


class CommentResponse(BaseModel):
    """Schema for comment response"""
    id: str
    ticket_id: str
    author_id: int  # Changed from str to int (user IDs are typically integers)
    message: str
    created_at: datetime
    updated_at: Optional[datetime] = None  # Add if you have this field
    
    model_config = {"from_attributes": True}


class CommentWithAuthorResponse(CommentResponse):
    """Extended comment response with author details"""
    author_email: Optional[str] = None
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    
    model_config = {"from_attributes": True}


class CommentListResponse(BaseModel):
    """Schema for paginated comment list response"""
    total: int
    comments: list[CommentResponse]
    ticket_id: str
    ticket_number: Optional[str] = None


class CommentDeleteResponse(BaseModel):
    """Schema for comment deletion response"""
    message: str
    comment_id: str
    deleted_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Comment deleted successfully",
                "comment_id": "123e4567-e89b-12d3-a456-426614174000",
                "deleted_at": "2024-01-15T10:30:00Z"
            }
        }
    }