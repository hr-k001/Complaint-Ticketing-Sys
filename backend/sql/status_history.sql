CREATE TRIGGER trg_ticket_status_history
ON tickets
AFTER UPDATE
AS
BEGIN
    INSERT INTO ticket_history (ticket_id, old_status, new_status, changed_at)
    SELECT
        d.id,
        d.status,
        i.status,
        GETDATE()
    FROM deleted d
    JOIN inserted i ON d.id = i.id
    WHERE d.status != i.status
END;