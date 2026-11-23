-- Repair only the three newest OpenAI cards whose earlier bounded preview was
-- blocked by a same-origin canonical redirect. The collector still enriches
-- only one opted-in card per poll, avoiding a broad re-crawl.
UPDATE stories
SET article_preview_checked_at = NULL
WHERE url IN (
  SELECT url FROM stories
  WHERE source_id = 'openai-news'
    AND image_url IS NULL
  ORDER BY coalesce(original_published_at, published_at) DESC
  LIMIT 3
);

-- Re-read these two affected sources once after the parser/preview repair.
UPDATE source_state
SET etag = NULL, modified = NULL, next_at = 0
WHERE id IN ('openai-news', 'thepaper-art');
