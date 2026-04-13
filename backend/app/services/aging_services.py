from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_, or_
from fastapi import HTTPException, status

from app.core.models import Ticket, User
from app.schemas.user_schema import UserRole


class AgingService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_ticket_aging_report(self, current_user: User) -> List[Dict[str, Any]]:
        """Get all tickets with aging metrics (role-based)"""
        
        # Build base query
        query = text("""
            SELECT * FROM vw_ticket_aging 
            WHERE 1=1
            ORDER BY age_hours DESC
        """)
        
        result = self.db.execute(query)
        tickets = [dict(row._mapping) for row in result]
        
        # Apply role-based filtering
        if current_user.role == UserRole.USER.value:
            tickets = [t for t in tickets if t['user_id'] == current_user.id]
        elif current_user.role == UserRole.AGENT.value:
            tickets = [t for t in tickets if t['assigned_to'] == current_user.id]
        # Admin sees all
        
        return tickets
    
    def get_aging_summary(self, current_user: User) -> Dict[str, Any]:
        """Get summary statistics by aging bucket"""
        
        # Get all tickets first (will filter by role)
        tickets = self.get_ticket_aging_report(current_user)
        
        # Calculate summary
        summary = {
            "total_active_tickets": len([t for t in tickets if t['status'] not in ['closed', 'resolved']]),
            "average_age_hours": 0,
            "oldest_ticket_hours": 0,
            "by_bucket": {},
            "by_priority": {},
            "by_status": {},
            "sla_breaches": 0,
            "escalated_count": 0
        }
        
        if not tickets:
            return summary
        
        # Calculate averages
        ages = [t['age_hours'] for t in tickets if t['status'] not in ['closed', 'resolved']]
        if ages:
            summary['average_age_hours'] = sum(ages) / len(ages)
            summary['oldest_ticket_hours'] = max(ages)
        
        # Group by aging bucket
        for ticket in tickets:
            bucket = ticket['aging_bucket']
            if bucket not in summary['by_bucket']:
                summary['by_bucket'][bucket] = {
                    'count': 0,
                    'tickets': []
                }
            summary['by_bucket'][bucket]['count'] += 1
            if len(summary['by_bucket'][bucket]['tickets']) < 5:  # Limit to 5 examples
                summary['by_bucket'][bucket]['tickets'].append({
                    'ticket_number': ticket['ticket_number'],
                    'title': ticket['title'],
                    'age_days': ticket['age_days']
                })
            
            # Priority breakdown
            priority = ticket['priority']
            if priority not in summary['by_priority']:
                summary['by_priority'][priority] = 0
            summary['by_priority'][priority] += 1
            
            # Status breakdown
            status = ticket['status']
            if status not in summary['by_status']:
                summary['by_status'][status] = 0
            summary['by_status'][status] += 1
            
            # SLA breaches
            if ticket['sla_status'] == 'SLA Breach':
                summary['sla_breaches'] += 1
            
            if ticket['is_escalated']:
                summary['escalated_count'] += 1
        
        return summary
    
    def get_stale_tickets(self, days_threshold: int = 3, current_user: User = None) -> List[Dict[str, Any]]:
        """Get tickets older than specified days that are still open"""
        
        tickets = self.get_ticket_aging_report(current_user) if current_user else []
        
        stale_tickets = [
            t for t in tickets 
            if t['age_days'] > days_threshold 
            and t['status'] not in ['closed', 'resolved']
        ]
        
        return stale_tickets
    
    def get_agent_performance_metrics(self, current_user: User) -> List[Dict[str, Any]]:
        """Get aging metrics per agent (admin only)"""
        
        if current_user.role != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can view agent performance metrics"
            )
        
        query = text("SELECT * FROM vw_agent_aging_metrics ORDER BY stale_count DESC")
        result = self.db.execute(query)
        return [dict(row._mapping) for row in result]
    
    def get_tickets_by_age_bucket(self, bucket: str, current_user: User) -> List[Dict[str, Any]]:
        """Get tickets in a specific aging bucket"""
        
        tickets = self.get_ticket_aging_report(current_user)
        return [t for t in tickets if t['aging_bucket'] == bucket]
    
    def get_aging_trends(self, days: int = 7, current_user: User = None) -> Dict[str, Any]:
        """Get aging trends over time"""
        
        # Get tickets created in last N days
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        query = self.db.query(
            Ticket,
            func.datediff('day', Ticket.created_at, func.now()).label('age_days')
        ).filter(
            Ticket.created_at >= cutoff_date,
            Ticket.status.in_(['open', 'in_progress'])
        )
        
        if current_user and current_user.role == UserRole.USER.value:
            query = query.filter(Ticket.user_id == current_user.id)
        elif current_user and current_user.role == UserRole.AGENT.value:
            query = query.filter(Ticket.assigned_to == current_user.id)
        
        results = query.all()
        
        # Calculate trends
        trends = {
            'daily_average_age': [],
            'tickets_by_age': {
                '0-1_days': 0,
                '1-3_days': 0,
                '3-5_days': 0,
                '5+_days': 0
            }
        }
        
        for ticket, age_days in results:
            if age_days <= 1:
                trends['tickets_by_age']['0-1_days'] += 1
            elif age_days <= 3:
                trends['tickets_by_age']['1-3_days'] += 1
            elif age_days <= 5:
                trends['tickets_by_age']['3-5_days'] += 1
            else:
                trends['tickets_by_age']['5+_days'] += 1
        
        return trends
    
    def get_ticket_aging_details(self, ticket_id: str, current_user: User) -> Dict[str, Any]:
        """Get detailed aging information for a specific ticket"""
        
        # First check if user can access this ticket
        from app.services.ticket_service import get_ticket_by_id
        ticket = get_ticket_by_id(self.db, ticket_id, current_user)
        
        # Calculate detailed aging metrics
        now = datetime.utcnow()
        created_at = ticket.created_at
        
        age_details = {
            'ticket_id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'created_at': created_at,
            'current_time': now,
            'age_days': (now - created_at).days,
            'age_hours': (now - created_at).seconds // 3600 + (now - created_at).days * 24,
            'age_minutes': ((now - created_at).seconds // 60) % 60,
            'status': ticket.status,
            'priority': ticket.priority,
            'due_date': ticket.due_date,
            'is_escalated': ticket.is_escalated,
            'sla_remaining_hours': None
        }
        
        # Calculate SLA remaining if due date exists
        if ticket.due_date:
            remaining = ticket.due_date - now
            age_details['sla_remaining_hours'] = max(0, remaining.total_seconds() / 3600)
            age_details['sla_status'] = 'Breached' if remaining.total_seconds() < 0 else 'Active'
        
        # Add status duration if you track status changes
        # This requires a status_history table
        if hasattr(ticket, 'status_history') and ticket.status_history:
            current_status_entry = max(ticket.status_history, key=lambda x: x.changed_at)
            age_details['current_status_duration_hours'] = (
                now - current_status_entry.changed_at
            ).total_seconds() / 3600
        
        return age_details