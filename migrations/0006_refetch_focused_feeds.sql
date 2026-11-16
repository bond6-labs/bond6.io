-- Re-fetch active source windows after the headline and lane rules changed.
-- The former parser stored a title missing its final word, and the former
-- classifier admitted broad digital-policy coverage into the AI lane.
UPDATE source_state SET etag = NULL, modified = NULL, next_at = 0;
-- Refresh the two sources that exposed the issue first; remaining sources
-- retain normal bounded scheduled collection afterwards.
UPDATE source_state SET next_at = -2 WHERE id = 'techdirt';
UPDATE source_state SET next_at = -1 WHERE id = 'eff-social';
