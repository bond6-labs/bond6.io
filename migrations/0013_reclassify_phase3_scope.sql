-- Re-read the bounded retained set after Phase 3's narrower editorial gate.
-- Collection remains rate-limited; this only makes each current source due.
UPDATE source_state
SET etag = NULL,
    modified = NULL,
    next_at = 0;
