-- Run the revised classifier against current feed windows and immediately
-- remove previously accepted cards that no longer meet the focused rules.
UPDATE source_state SET etag = NULL, modified = NULL, next_at = 0;
UPDATE source_state SET next_at = -2 WHERE id = 'techdirt';
UPDATE source_state SET next_at = -1 WHERE id = 'eff-social';
