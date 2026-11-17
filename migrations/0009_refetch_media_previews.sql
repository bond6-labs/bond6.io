-- Existing records predate optional publisher media metadata. Re-poll the
-- bounded source windows so eligible current stories can receive previews.
UPDATE source_state SET etag = NULL, modified = NULL, next_at = 0;
