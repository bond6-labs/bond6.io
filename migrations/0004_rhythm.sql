CREATE TABLE story_signals (
  story_url TEXT PRIMARY KEY REFERENCES stories(url) ON DELETE CASCADE,
  rhythm_version INTEGER NOT NULL,
  human_score INTEGER NOT NULL,
  ai_score INTEGER NOT NULL,
  lane_recommendation TEXT CHECK(lane_recommendation IN ('human','ai')),
  confidence REAL NOT NULL,
  labels TEXT NOT NULL,
  evidence TEXT NOT NULL,
  exclusion_reason TEXT,
  scored_at INTEGER NOT NULL
);
CREATE INDEX story_signals_lane_score ON story_signals(lane_recommendation, confidence DESC, scored_at DESC);
