-- Reprocess current feed entries with title-prefix and quoted-link cleanup.
UPDATE source_state
SET etag = NULL,
    modified = NULL,
    next_at = 0;
