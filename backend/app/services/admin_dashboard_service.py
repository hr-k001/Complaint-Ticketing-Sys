from app.core.models import Ticket

def get_admin_summary(db):
    tickets = db.query(Ticket).all()

    return {
        "total": len(tickets),
        "open": len([t for t in tickets if t.status == "open"]),
        "closed": len([t for t in tickets if t.status == "closed"]),
        "high_priority": len([t for t in tickets if t.priority == "high"])
    }