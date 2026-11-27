-- Repair retained cards that were rediscovered after being evicted. The
-- existing source evidence gives the earlier timestamp without a new table.
UPDATE stories
SET discovered_at = (SELECT d.first_seen_at FROM source_discoveries d WHERE d.source_id=stories.source_id AND d.url=stories.url)
WHERE EXISTS (SELECT 1 FROM source_discoveries d WHERE d.source_id=stories.source_id AND d.url=stories.url AND d.first_seen_at<stories.discovered_at);
