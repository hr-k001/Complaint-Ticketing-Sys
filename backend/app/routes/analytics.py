from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.models import User
from app.schemas.user_schema import UserRole
from app.services.aging_services import AgingService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/ticket-aging")
def get_ticket_aging_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get complete ticket aging report (role-based filtering applied)"""
    service = AgingService(db)
    return service.get_ticket_aging_report(current_user)


@router.get("/ticket-aging/summary")
def get_aging_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aging summary statistics"""
    service = AgingService(db)
    return service.get_aging_summary(current_user)


@router.get("/ticket-aging/stale")
def get_stale_tickets(
    days: int = Query(3, description="Days threshold for stale tickets", ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tickets older than specified days"""
    service = AgingService(db)
    return service.get_stale_tickets(days_threshold=days, current_user=current_user)


@router.get("/ticket-aging/bucket/{bucket_name}")
def get_tickets_by_bucket(
    bucket_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tickets in a specific aging bucket"""
    valid_buckets = [
        'New (<24h)', 'Aging (1-3 days)', 'Stale (3-5 days)', 
        'Very Stale (>5 days)', 'Urgent - Due Today', 'Critical - Overdue',
        'Resolved', 'No SLA'
    ]
    
    if bucket_name not in valid_buckets:
        raise HTTPException(status_code=400, detail=f"Invalid bucket. Valid buckets: {valid_buckets}")
    
    service = AgingService(db)
    return service.get_tickets_by_age_bucket(bucket_name, current_user)


@router.get("/agent-performance", dependencies=[Depends(require_roles(UserRole.ADMIN))])
def get_agent_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get agent performance metrics based on aging (Admin only)"""
    service = AgingService(db)
    return service.get_agent_performance_metrics(current_user)


@router.get("/trends")
def get_aging_trends(
    days: int = Query(7, description="Number of days to analyze", ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aging trends over time"""
    service = AgingService(db)
    return service.get_aging_trends(days=days, current_user=current_user)


@router.get("/tickets/{ticket_id}/aging-details")
def get_ticket_aging_details(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed aging information for a specific ticket"""
    service = AgingService(db)
    return service.get_ticket_aging_details(ticket_id, current_user)


@router.get("/dashboard/aging-metrics")
def get_aging_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get key aging metrics for dashboard display"""
    service = AgingService(db)
    summary = service.get_aging_summary(current_user)
    
    # Extract key metrics for dashboard
    return {
        "average_response_time_hours": summary.get('average_age_hours', 0),
        "stale_ticket_count": summary.get('by_bucket', {}).get('Stale (3-5 days)', {}).get('count', 0) +
                              summary.get('by_bucket', {}).get('Very Stale (>5 days)', {}).get('count', 0),
        "sla_breach_count": summary.get('sla_breaches', 0),
        "escalated_count": summary.get('escalated_count', 0),
        "oldest_ticket_age_hours": summary.get('oldest_ticket_hours', 0),
        "aging_distribution": {
            bucket: data['count'] 
            for bucket, data in summary.get('by_bucket', {}).items()
        }
    }