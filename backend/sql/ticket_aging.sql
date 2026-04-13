-- Ticket Aging View with detailed metrics
CREATE OR ALTER VIEW vw_ticket_aging AS
SELECT 
    t.id,
    t.ticket_number,
    t.title,
    t.status,
    t.priority,
    t.category,
    t.created_at,
    t.updated_at,
    t.due_date,
    t.is_escalated,
    t.user_id,
    t.assigned_to,
    u.email as user_email,
    a.email as agent_email,
    
    -- Age calculations
    DATEDIFF(HOUR, t.created_at, GETDATE()) as age_hours,
    DATEDIFF(DAY, t.created_at, GETDATE()) as age_days,
    
    -- Business hours calculation (optional - 8 hours per business day)
    -- This assumes 9 AM to 5 PM business days
    CASE 
        WHEN DATEDIFF(DAY, t.created_at, GETDATE()) <= 5 THEN
            DATEDIFF(HOUR, t.created_at, GETDATE()) - 
            (DATEDIFF(DAY, t.created_at, GETDATE()) * 16) -- Subtract non-business hours
        ELSE DATEDIFF(HOUR, t.created_at, GETDATE())
    END as business_hours_age,
    
    -- Aging buckets
    CASE 
        WHEN t.status IN ('closed', 'resolved') THEN 'Resolved'
        WHEN t.due_date IS NULL THEN 'No SLA'
        WHEN t.due_date < GETDATE() AND t.status NOT IN ('closed', 'resolved') THEN 'Critical - Overdue'
        WHEN t.due_date >= GETDATE() AND t.due_date < DATEADD(DAY, 1, GETDATE()) THEN 'Urgent - Due Today'
        WHEN DATEDIFF(DAY, t.created_at, GETDATE()) <= 1 THEN 'New (<24h)'
        WHEN DATEDIFF(DAY, t.created_at, GETDATE()) <= 3 THEN 'Aging (1-3 days)'
        WHEN DATEDIFF(DAY, t.created_at, GETDATE()) <= 5 THEN 'Stale (3-5 days)'
        WHEN DATEDIFF(DAY, t.created_at, GETDATE()) > 5 THEN 'Very Stale (>5 days)'
        ELSE 'Normal'
    END as aging_bucket,
    
    -- Priority-based SLA status
    CASE 
        WHEN t.status IN ('closed', 'resolved') THEN 'Completed'
        WHEN t.priority = 'urgent' AND DATEDIFF(HOUR, t.created_at, GETDATE()) > 4 THEN 'SLA Breach'
        WHEN t.priority = 'high' AND DATEDIFF(HOUR, t.created_at, GETDATE()) > 8 THEN 'SLA Breach'
        WHEN t.priority = 'medium' AND DATEDIFF(HOUR, t.created_at, GETDATE()) > 24 THEN 'SLA Breach'
        WHEN t.priority = 'low' AND DATEDIFF(HOUR, t.created_at, GETDATE()) > 48 THEN 'SLA Breach'
        ELSE 'Within SLA'
    END as sla_status,
    
    -- Response time (if you track first response)
    -- This assumes you have a first_response_at column
    CASE 
        WHEN t.first_response_at IS NOT NULL THEN 
            DATEDIFF(HOUR, t.created_at, t.first_response_at)
        ELSE NULL
    END as response_time_hours
    
FROM tickets t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN users a ON t.assigned_to = a.id
WHERE t.deleted_at IS NULL;  -- Assuming soft delete

-- Create aging summary view
CREATE OR ALTER VIEW vw_ticket_aging_summary AS
SELECT 
    aging_bucket,
    COUNT(*) as ticket_count,
    AVG(age_hours) as avg_age_hours,
    MAX(age_hours) as max_age_hours,
    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
    SUM(CASE WHEN is_escalated = 1 THEN 1 ELSE 0 END) as escalated_count
FROM vw_ticket_aging
GROUP BY aging_bucket;

-- Create department/agent aging view
CREATE OR ALTER VIEW vw_agent_aging_metrics AS
SELECT 
    assigned_to,
    agent_email,
    COUNT(*) as total_assigned,
    AVG(age_days) as avg_age_days,
    SUM(CASE WHEN aging_bucket LIKE '%Stale%' THEN 1 ELSE 0 END) as stale_count,
    SUM(CASE WHEN sla_status = 'SLA Breach' THEN 1 ELSE 0 END) as sla_breach_count
FROM vw_ticket_aging
WHERE assigned_to IS NOT NULL AND status NOT IN ('closed', 'resolved')
GROUP BY assigned_to, agent_email;