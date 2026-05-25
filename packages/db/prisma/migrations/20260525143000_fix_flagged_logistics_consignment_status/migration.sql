-- Keep consignment statuses aligned with their statement reconciliation result.
-- A flagged statement means its linked consignment lines are discrepant, not matched.

UPDATE "AdminConsignmentLog" AS consignment
SET "status" = CASE statement."status"
  WHEN 'RECONCILED' THEN 'MATCHED'::"AuditMatchStatus"
  WHEN 'FLAGGED' THEN 'DISCREPANCY'::"AuditMatchStatus"
  ELSE consignment."status"
END,
"updatedAt" = NOW()
FROM "CourierLedgerStatement" AS statement
WHERE consignment."statementId" = statement."id"
  AND consignment."status" <> 'MANUALLY_RESOLVED'
  AND statement."status" IN ('RECONCILED', 'FLAGGED');
