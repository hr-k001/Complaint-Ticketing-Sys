from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

class TicketPriority(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class TicketCategory(str, Enum):
    SOFTWARE = "Software"
    HARDWARE = "Hardware"
    NETWORK = "Network"
    ACCESS = "Access"
    SERVICE = "Service"
    OTHER = "Other"


class TicketStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"
    ESCALATED = "Escalated"


class TicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=10, max_length=2000)
    priority: TicketPriority
    category: TicketCategory


class TicketStatusUpdate(BaseModel):
    status: TicketStatus


class TicketResponse(BaseModel):
    id: str
    ticket_number: str
    title: str
    description: str
    priority: TicketPriority
    category: TicketCategory
    status: TicketStatus
    created_by: str
    assigned_to: str | None
    created_at: datetime
    updated_at: datetime
    due_date: datetime
    closed_at: datetime | None
    is_escalated: bool
    escalated_at: datetime | None

    model_config = {"from_attributes": True}
