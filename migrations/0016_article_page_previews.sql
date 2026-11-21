-- Some trusted publishers leave their RSS description or social image empty.
-- This timestamp makes the bounded, opt-in metadata recovery attempt durable:
-- a source page is checked once per current story, never on every poll.
ALTER TABLE stories ADD COLUMN article_preview_checked_at INTEGER;

-- Re-read the bounded OpenAI window after enabling its explicit preview opt-in.
-- The collector still makes at most one same-site metadata request per poll.
UPDATE source_state SET etag = NULL, modified = NULL, next_at = 0 WHERE id = 'openai-news';
