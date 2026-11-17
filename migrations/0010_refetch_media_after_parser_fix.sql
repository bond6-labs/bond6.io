-- Re-read recent source payloads once after improving publisher-media parsing.
-- A conditional 304 response cannot enrich cards that were stored by the older parser.
UPDATE source_state
SET etag = NULL,
    modified = NULL,
    next_at = 0;
