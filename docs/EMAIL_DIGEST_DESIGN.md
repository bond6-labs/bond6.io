# Bond6 email digest: implementation contract

Status: production rollout. A private confirmation and unsubscribe test was completed; monitor the first live digest and delivery failures after launch.

Readers choose English or Chinese originals and daily or weekly delivery. The
default is weekly. A subscription becomes active only after the recipient
confirms an expiring, single-use link. Every digest has an unsubscribe link;
changing frequency must not silently subscribe an unconfirmed address.

Use `Bond6 <digest@bond6.io>` as sender after the domain is verified. Resend
credentials belong in a Worker secret, never source control or browser code.
The owner has configured replies to forward to their existing mailbox.

The implementation generates a bounded, source-attributed digest once per
language and frequency from original-language stories matching Focusing signals. A scheduled,
idempotent job sends only to confirmed recipients, enforces a configurable
daily budget across confirmations and digests, and records delivery failures
without exposing addresses in logs. Empty selections should not send mail.
Queued sends must check subscription state immediately before sending; retries
must use provider idempotency and must not duplicate successful deliveries.

Public subscription requests need strict input and origin checks, abuse and
send-rate limits, non-enumerating responses, short-lived confirmation tokens
stored only as hashes, and safe handling of expired or replaced tokens. Provide
one-click unsubscribe using a separate scoped token and the appropriate email
headers; a GET used by link scanners must not unsubscribe a recipient. Minimize
and document retention of addresses, delivery records and expired tokens.

Keep all sending disabled by default until the schema, quota, concurrency,
confirmation, unsubscribe and provider-failure paths have been tested, and a
test message to the owner has been delivered. Review Resend's current broadcast
and transactional rules and limits before production. A daily selection in the
site's generated-publishing feature is currently disabled, so a digest must not
claim to contain those AI-generated picks; use a transparently described
selection from the existing live flow instead.
