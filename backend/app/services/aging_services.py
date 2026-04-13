from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.core.models import Ticket, User
from app.schemas.user_schema import UserRole


class AgingService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_ticket_aging_report(self, current_user: User) -> List[Dict[str, Any]]:
        """Get all tickets with aging metrics calculated in Python"""
        
        # Get tickets based on role
        query = select(Ticket)
        
        if current_user.role == UserRole.USER.value:
            query = query.where(Ticket.created_by == current_user.id)
        elif current_user.role == UserRole.AGENT.value:
            query = query.where(Ticket.assigned_to == current_user.id)
        # Admin sees all
        
        tickets = self.db.execute(query).scalars().all()
        
        # Calculate aging metrics in Python
        now = datetime.utcnow()
        aging_data = []
        
        for ticket in tickets:
            age_days = (now - ticket.created_at).days
            age_hours = int((now - ticket.created_at).total_seconds() / 3600)
            
            # Determine aging bucket
            if ticket.status in ['Closed', 'Resolved']:
                bucket = 'Resolved'
            elif ticket.due_date and ticket.due_date < now:
                bucket = 'Critical - Overdue'
            elif ticket.due_date and ticket.due_date < now + timedelta(days=1):
                bucket = 'Urgent - Due Today'
            elif age_days <= 1:
                bucket = 'New (<24h)'
            elif age_days <= 3:
                bucket = 'Aging (1-3 days)'
            elif age_days <= 5:
                bucket = 'Stale (3-5 days)'
            elif age_days > 5:
                bucket = 'Very Stale (>5 days)'
            else:
                bucket = 'Normal'
            
            # Determine SLA status
            sla_status = 'Within SLA'
            if ticket.priority == 'high' and age_hours > 24:
                sla_status = 'SLA Breach'
            elif ticket.priority == 'medium' and age_hours > 72:
                sla_status = 'SLA Breach'
            elif ticket.priority == 'low' and age_hours > 120:
                sla_status = 'SLA Breach'
            
            aging_data.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'title': ticket.title,
                'status': ticket.status,
                'priority': ticket.priority,
                'category': ticket.category,
                'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
                'due_date': ticket.due_date.isoformat() if ticket.due_date else None,
                'is_escalated': ticket.is_escalated,
                'created_by': ticket.created_by,
                'assigned_to': ticket.assigned_to,
                'age_hours': age_hours,
                'age_days': age_days,
                'aging_bucket': bucket,
                'sla_status': sla_status
            })
        
        return aging_data
    
    def get_aging_summary(self, current_user: User) -> Dict[str, Any]:
        """Get summary statistics by aging bucket"""
        
        tickets = self.get_ticket_aging_report(current_user)
        
        summary = {
            "total_active_tickets": len([t for t in tickets if t['status'] not in ['Closed', 'Resolved']]),
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
        ages = [t['age_hours'] for t in tickets if t['status'] not in ['Closed', 'Resolved']]
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
            if len(summary['by_bucket'][bucket]['tickets']) < 5:
                summary['by_bucket'][bucket]['tickets'].append({
                    'ticket_number': ticket['ticket_number'],
                    'title': ticket['title'],
                    'age_days': ticket['age_days']
                })
            
            # Priority breakdown
            priority = ticket['priority']
            summary['by_priority'][priority] = summary['by_priority'].get(priority, 0) + 1
            
            # Status breakdown
            status = ticket['status']
            summary['by_status'][status] = summary['by_status'].get(status, 0) + 1
            
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
            and t['status'] not in ['Closed', 'Resolved']
        ]
        
        return stale_tickets
    
    def get_tickets_by_age_bucket(self, bucket: str, current_user: User) -> List[Dict[str, Any]]:
        """Get tickets in a specific aging bucket"""
        
        tickets = self.get_ticket_aging_report(current_user)
        return [t for t in tickets if t['aging_bucket'] == bucket]
    
    def get_aging_trends(self, days: int = 7, current_user: User = None) -> Dict[str, Any]:
        """Get aging trends over time"""
        
        tickets = self.get_ticket_aging_report(current_user) if current_user else []
        
        # Filter tickets created in last N days
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        recent_tickets = [t for t in tickets if datetime.fromisoformat(t['created_at']) >= cutoff_date]
        
        trends = {
            'daily_average_age': 0,
            'tickets_by_age': {
                '0-1_days': 0,
                '1-3_days': 0,
                '3-5_days': 0,
                '5+_days': 0
            }
        }
        
        for ticket in recent_tickets:
            age_days = ticket['age_days']
            if age_days <= 1:
                trends['tickets_by_age']['0-1_days'] += 1
            elif age_days <= 3:
                trends['tickets_by_age']['1-3_days'] += 1
            elif age_days <= 5:
                trends['tickets_by_age']['3-5_days'] += 1
            else:
                trends['tickets_by_age']['5+_days'] += 1
        
        if recent_tickets:
            avg_age = sum(t['age_hours'] for t in recent_tickets) / len(recent_tickets)
            trends['daily_average_age'] = avg_age / days
        
        return trends
    
    def get_aging_dashboard_metrics(self, current_user: User) -> Dict[str, Any]:
        """Get key aging metrics for dashboard display"""
        
        summary = self.get_aging_summary(current_user)
        
        return {
            "average_response_time_hours": round(summary.get('average_age_hours', 0), 2),
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
    
    def get_ticket_aging_details(self, ticket_id: str, current_user: User) -> Dict[str, Any]:
        """Get detailed aging information for a specific ticket"""
        
        # Get the ticket
        ticket = self.db.get(Ticket, ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Check permission
        if current_user.role == UserRole.USER.value and ticket.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Permission denied")
        if current_user.role == UserRole.AGENT.value and ticket.assigned_to != current_user.id:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Calculate detailed aging metrics
        now = datetime.utcnow()
        created_at = ticket.created_at
        
        age_details = {
            'ticket_id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'created_at': created_at.isoformat(),
            'current_time': now.isoformat(),
            'age_days': (now - created_at).days,
            'age_hours': int((now - created_at).total_seconds() / 3600),
            'age_minutes': int(((now - created_at).total_seconds() / 60) % 60),
            'status': ticket.status,
            'priority': ticket.priority,
            'due_date': ticket.due_date.isoformat() if ticket.due_date else None,
            'is_escalated': ticket.is_escalated,
            'sla_remaining_hours': None
        }
        
        # Calculate SLA remaining if due date exists
        if ticket.due_date:
            remaining = ticket.due_date - now
            age_details['sla_remaining_hours'] = max(0, int(remaining.total_seconds() / 3600))
            age_details['sla_status'] = 'Breached' if remaining.total_seconds() < 0 else 'Active'
        
        return age_details