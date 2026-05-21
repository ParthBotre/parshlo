-- PTR/PTS are GST-inclusive and the approved catalog uses GST factor 1.05.
-- Normalize existing order item snapshots so historical order screens and CSVs
-- display GST Rate 5% included instead of showing a separate zero GST amount.
UPDATE "OrderItem"
SET "gstRate" = 'FIVE'::"GstRate";
