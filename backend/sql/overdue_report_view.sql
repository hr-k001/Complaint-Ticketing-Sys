CREATE VIEW vw_overdue_tickets AS
SELECT *
FROM tickets
WHERE due_date < GETDATE()
AND status != 'closed';