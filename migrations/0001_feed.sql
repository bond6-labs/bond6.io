CREATE TABLE stories (
  url TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  topic TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  is_article INTEGER NOT NULL
);
CREATE INDEX stories_latest ON stories(published_at DESC, url DESC);

CREATE TABLE mentions (
  url TEXT NOT NULL REFERENCES stories(url) ON DELETE CASCADE,
  source TEXT NOT NULL,
  link TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  PRIMARY KEY (url, source)
);
CREATE INDEX mentions_recent ON mentions(published_at DESC);

CREATE TABLE source_state (
  id TEXT PRIMARY KEY,
  etag TEXT,
  modified TEXT,
  checked_at INTEGER NOT NULL,
  ok_at INTEGER,
  failures INTEGER NOT NULL,
  next_at INTEGER NOT NULL
);
