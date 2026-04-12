from datetime import datetime

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    message: str = Field(..., min_length=2, max_length=1000)


class CommentResponse(BaseModel):
    id: str
    ticket_id: str
    author_id: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}
