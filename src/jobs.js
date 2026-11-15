export async function enqueue(db, id, kind, payload, now, next = now) {
  await db.prepare(`INSERT INTO jobs(id, kind, payload, next_at, updated_at) VALUES(?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
    .bind(id, kind, JSON.stringify(payload), next, now).run();
}
export async function claim(db, id, now) {
  const token = crypto.randomUUID();
  return db.prepare(`UPDATE jobs SET lease_until=?, lease_token=?, attempts=attempts+1, updated_at=?
    WHERE id=? AND status='pending' AND next_at<=? AND lease_until<=? RETURNING *`)
    .bind(now + 5 * 60_000, token, now, id, now, now).first();
}
export async function saveJob(db, job, payload, now, { done = false, next = now + 60_000, error = null } = {}) {
  return db.prepare(`UPDATE jobs SET payload=?, status=?, next_at=?, lease_until=0, lease_token=NULL, last_error=?, updated_at=?
    WHERE id=? AND lease_token=?`).bind(JSON.stringify(payload), done ? 'done' : 'pending', next, error?.slice(0, 300) ?? null, now, job.id, job.lease_token).run();
}
