-- Only confirmations recorded after this migration acquire this evidence.
-- Never infer or invent a confirmation timestamp for existing subscribers.
ALTER TABLE email_subscribers ADD COLUMN consent_confirmed_at INTEGER;
ALTER TABLE email_subscribers ADD COLUMN consent_language TEXT;
ALTER TABLE email_subscribers ADD COLUMN consent_frequency TEXT;
ALTER TABLE email_subscribers ADD COLUMN consent_notice_version TEXT;
