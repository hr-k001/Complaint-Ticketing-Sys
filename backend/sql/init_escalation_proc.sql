IF OBJECT_ID('usp_escalate_overdue_tickets', 'P') IS NOT NULL
    DROP PROCEDURE usp_escalate_overdue_tickets;
GO

CREATE PROCEDURE usp_escalate_overdue_tickets
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE tickets
    SET
        status = 'Escalated',
        is_escalated = 1,
        escalated_at = COALESCE(escalated_at, SYSUTCDATETIME()),
        updated_at = SYSUTCDATETIME()
    WHERE due_date < SYSUTCDATETIME()
      AND status IN ('Open', 'In Progress')
      AND is_escalated = 0;
END
GO
