# Email subscriber data operations

Subscriber records live in the production D1 `email_subscribers` table, not in
Git or Resend. Treat addresses, status, language, frequency and token hashes as
private data. Never put exports in the repository, logs, or public storage.

## Before schema changes or moving databases

1. Disable public subscription and scheduled sending; verify both are paused.
2. Record counts by status, language and frequency and take an encrypted,
   access-controlled independent backup, including unsubscribe/suppression
   state. Record the backup time and schema version without exposing addresses.
3. Apply additive migrations first. Restore into a separate staging database,
   check counts and sample data, and test confirmation and unsubscribe there.
4. Reconcile every subscription and opt-out received since the backup before
   switching databases. An old backup must never reactivate a later opt-out.
5. Compare counts and statuses after cutover, verify mail delivery privately,
   and only then resume scheduled sending. Keep a rollback plan.

D1 Time Travel is a recovery aid, not a substitute for an independent backup;
restoring an entire database can roll back unrelated stories, preferences and
opt-outs. Test recovery in a separate database before making production changes.
Backups should have access controls, an explicit retention period and deletion
procedure. Never back up API secrets alongside subscriber data.

The current cleanup removes unsubscribed records after 7 days. Durable
suppression/opt-out handling that survives restores is future work. Until then,
do not restore or import stale subscriber records without independently
reconciling opt-outs; a restore may otherwise reactivate an opted-out address.

## Owner-only counts

From an authenticated terminal, the following returns aggregates, not email
addresses. Do not expose this database or an unauthenticated endpoint publicly.

```powershell
npx wrangler d1 execute bond6-transmissions --remote --command "SELECT status, language, frequency, COUNT(*) AS subscribers FROM email_subscribers GROUP BY status, language, frequency ORDER BY status, language, frequency"
```

Active subscribers have `status = 'active'`. Pending records are not confirmed.
The owner may inspect addresses through the authenticated Cloudflare dashboard,
but should not place the resulting list in Git or share it unnecessarily.
