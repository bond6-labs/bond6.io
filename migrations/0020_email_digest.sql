CREATE TABLE email_subscribers (email TEXT PRIMARY KEY, language TEXT NOT NULL, frequency TEXT NOT NULL, status TEXT NOT NULL, confirm_hash TEXT, confirm_expires INTEGER, unsubscribe_hash TEXT NOT NULL, updated_at INTEGER NOT NULL, pending_language TEXT, pending_frequency TEXT);
CREATE TABLE email_send_budget (day TEXT PRIMARY KEY, sends INTEGER NOT NULL);
CREATE TABLE email_outbox (id TEXT PRIMARY KEY, email TEXT NOT NULL, edition TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX email_outbox_pending ON email_outbox(status,created_at);
CREATE INDEX email_outbox_edition_email ON email_outbox(edition,email);
CREATE TABLE email_request_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE email_editions (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL, created_at INTEGER NOT NULL);
