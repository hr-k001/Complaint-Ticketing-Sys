from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

class TicketPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TicketStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    CLOSED = "Closed"
    ESCALATED = "Escalated"

class TicketCategory(str, Enum):
    GENERAL = "general"
    TECHNICAL = "technical"
    BILLING = "billing"

class TicketCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: str = Field(..., min_length=1)
    category: str = "general"
    priority: str = "medium"

class TicketStatusUpdate(BaseModel):
    status: str

# Add this missing schema
class TicketAssignRequest(BaseModel):
    """Request schema for assigning a ticket to an agent"""
    ticket_number: str = Field(..., description="Ticket number to assign")
    agent_number: str = Field(..., description="Agent number to assign the ticket to")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "ticket_number": "TCK20260413001",
                "agent_number": "AGENT001"
            }
        }
    }

class TicketResponse(BaseModel):
    id: str
    ticket_number: str
    title: str
    description: str
    priority: str
    category: str
    status: str
    created_by: str
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    due_date: datetime
    closed_at: Optional[datetime] = None
    is_escalated: bool
    escalated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}