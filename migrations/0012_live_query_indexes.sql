-- The homepage is read far more often than content is written. These indexes
-- keep language/lane queries from scanning the full retained story set.
CREATE INDEX stories_language_lane_discovered ON stories(original_lang, lane, discovered_at DESC, url DESC);
CREATE INDEX stories_language_discovered ON stories(original_lang, discovered_at DESC, url DESC);
