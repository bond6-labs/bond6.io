/**
 * Centralized configuration constants for bond6.io
 * All magic numbers and configuration values should be defined here
 */

// Storage and content limits
export const MAX_STORIES = 1000;
export const FEED_SIZE_LIMIT = 1_000_000; // 1MB max feed size
export const FEED_ITEM_LIMIT = 40; // Max items to process per feed
export const MAX_EVENT_BODY_BYTES = 128; // Max size for analytics events
export const MAX_QUERY_LENGTH = 1500; // Max query string length
export const HTTP_REQUEST_TIMEOUT_MS = 8_000;
// A scheduled invocation may collect this many due feeds. Keeping this bounded
// lets a growing source list stay fresh without turning one cron run into an
// unbounded crawl.
export const MAX_COLLECTS_PER_TICK = 2;
export const SOURCE_VITALITY_RETENTION_DAYS = 90;
export const SOURCE_EVALUATION_HOUR_UTC = 0;
export const SOURCE_EVALUATION_MINUTE_UTC = 50;
export const SOURCE_CATALOGUE_VERSION = 'source-vitality-v5';

// Cache configuration
export const CACHE_TTL_SECONDS = 60;
export const CACHE_CONTROL = {
  public: `public, max-age=${CACHE_TTL_SECONDS}`,
  private: 'private, no-cache',
  none: 'no-store'
};

// AI configuration
export const AI_DAILY_BUDGET = 8000; // Max neurons per day
export const AI_RETENTION_DAYS = 7; // Days to retain AI-lane content
export const CULTURE_RETENTION_DAYS = 30; // Days to retain culture content

// Bond6 Rhythm selection. These are deliberately conservative: stories without
// a strong, recorded reason to belong in a lane stay in the live feed only.
export const RHYTHM_MIN_CONFIDENCE = 0.72;
export const RHYTHM_FRESH_WINDOW_DAYS = 3;
export const RHYTHM_FALLBACK_WINDOW_DAYS = 7;
export const RHYTHM_DAILY_MAX_PER_LANE = 3;
export const RHYTHM_AUDIT_RETENTION = 50;
// The live feed remains chronological until a bilingual review has approved
// the current signal quality. This is deliberately an environment gate, not a
// deploy-time behaviour change.
export const RHYTHM_REVIEW_SAMPLE_SIZE = 60;

// Network and redirect configuration
export const REDIRECT_TIMEOUT_MS = 3000; // 3 seconds per redirect
export const REDIRECT_MAX_HOPS = 3; // Max redirect chain length

// Security configuration
export const CSRF_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Data retention configuration
export const SOFT_DELETE_RETENTION_DAYS = 90; // Days before hard delete of soft-deleted records
export const JOB_RETENTION_DAYS = 8; // Days to keep job records
export const AI_USAGE_RETENTION_DAYS = 35; // Days to keep AI usage stats
export const METRICS_RETENTION_DAYS = 60; // Days to keep metrics
