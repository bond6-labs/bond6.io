import { DAY, dayKey, usableText } from './content.js';
import { enqueue, claim, saveJob } from './jobs.js';
import { runJson, notePrompt, reviewPrompt, validateNote, normalizeNote, approved, sourceData, BudgetError, checkLanguage } from './ai.js';

export function rankCandidates(stories, used = [], now = Date.now()) {
  const seen = new Set(used);
  const score = s => (s.author ? 3 : 0) + (s.content_type === 'post' ? 1 : 0)
    + (/\b(I|my|we|our)\b|我|我们/.test(s.excerpt) ? 3 : 0)
    + Math.min(3, s.excerpt.length / 600) + (s.original_lang === 'zh' ? 1 : 0);
  const ranked = stories.filter(s => s.lane && usableText(s) && !seen.has(s.url) && !seen.has(s.canonical_url))
    .sort((a,b) => Number(b.discovered_at >= now - 3 * DAY) - Number(a.discovered_at >= now - 3 * DAY) || score(b) - score(a) || b.discovered_at - a.discovered_at || a.url.localeCompare(b.url));
  const queue = [], publishers = new Set(), authors = new Set(), topics = new Set(), destinations = new Set();
  let chinese = false;
  for (let round = 0; round < 6; round++) for (const lane of ['human','ai']) {
    const options = ranked.filter(s => s.lane === lane && !publishers.has(s.source) && (!s.author || !authors.has(s.author.toLowerCase())) && !destinations.has(s.canonical_url));
    options.sort((a,b) => (lane === 'human' ? Number(!topics.has(b.subject)) - Number(!topics.has(a.subject)) : 0)
      || (!chinese ? Number(b.original_lang === 'zh') - Number(a.original_lang === 'zh') : 0));
    const s = options[0];
    if (!s) continue;
    queue.push(s); publishers.add(s.source); if (s.author) authors.add(s.author.toLowerCase());
    destinations.add(s.canonical_url); if (lane === 'human') topics.add(s.subject); if (s.original_lang === 'zh') chinese = true;
  }
  return queue;
}

export function snapshotStory(story, output) {
  return { url: story.url, canonical_url: story.canonical_url, title: story.title, title_en: output.en.title, title_zh: output.zh.title,
    en: { title: output.en.title, note: output.claims.map(c => c.en).join(' ') },
    zh: { title: output.zh.title, note: output.claims.map(c => c.zh).join('') },
    source: story.source, source_id: story.source_id, author: story.author, lane: story.lane, subject: story.subject,
    original_lang: story.original_lang, original_published_at: story.original_published_at, discovered_at: story.discovered_at,
    content_type: story.content_type, content_hash: story.content_hash };
}

export async function publishEdition(db, job, snapshot, now) {
  // INSERT, attribution index and job completion share one D1 transaction.
  // Lease token fencing prevents an expired worker publishing after another claim.
  const statements = [db.prepare(`INSERT INTO editions(id,kind,edition_date,published_at,snapshot)
    SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM jobs WHERE id=? AND lease_token=? AND lease_until>?)
    ON CONFLICT DO NOTHING`).bind(snapshot.id, snapshot.kind, snapshot.date, now, JSON.stringify(snapshot), job.id, job.lease_token, now)];
  for (const story of snapshot.stories) statements.push(db.prepare(`INSERT INTO edition_stories(edition_id,url,publisher,author)
    SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM editions WHERE id=? AND snapshot=?)
    AND EXISTS(SELECT 1 FROM jobs WHERE id=? AND lease_token=? AND lease_until>?) ON CONFLICT DO NOTHING`)
    .bind(snapshot.id,story.url,story.source,story.author,snapshot.id,JSON.stringify(snapshot),job.id,job.lease_token,now));
  statements.push(db.prepare(`UPDATE jobs SET status='done',payload='{}',lease_until=0,lease_token=NULL,updated_at=?
    WHERE id=? AND lease_token=? AND EXISTS(SELECT 1 FROM editions WHERE id=?)`).bind(now,job.id,job.lease_token,snapshot.id));
  await db.batch(statements);
}

async function dailyStep(env, job, now) {
  const db = env.DB, state = JSON.parse(job.payload);
  if (!state.candidates) {
    const { results } = await db.prepare(`SELECT * FROM stories WHERE discovered_at>=? AND lane IS NOT NULL AND content_hash IS NOT NULL
      ORDER BY discovered_at DESC LIMIT 160`).bind(now - 7 * DAY).all();
    const { results: used } = await db.prepare(`SELECT url FROM edition_stories JOIN editions ON editions.id=edition_stories.edition_id
      WHERE kind='daily' AND published_at>=?`).bind(now - 7 * DAY).all();
    const candidates = rankCandidates(results, used.map(s => s.url), now).map(s => ({ url: s.url, hash: s.content_hash }));
    if (!candidates.length) { await saveJob(db, job, state, now, { next: now + 10 * 60_000 }); return; }
    Object.assign(state, { candidates, cursor: 0, stories: [], phase: 'generate' });
    await saveJob(db,job,state,now); return;
  }
  const deadline = Date.parse(state.date + 'T14:00:00Z');
  if (state.cursor >= state.candidates.length || state.stories.length >= 6 || now >= deadline) {
    if (state.stories.length) await publishEdition(db,job,{ id: state.date, kind: 'daily', date: state.date, stories: state.stories },now);
    else await saveJob(db,job,state,now,{done:true,error:'No fully validated candidates; prior edition retained'});
    return;
  }
  const candidate = state.candidates[state.cursor];
  const story = await db.prepare('SELECT * FROM stories WHERE url=? AND content_hash=?').bind(candidate.url,candidate.hash).first();
  const advance = async error => { state.cursor++; state.phase='generate'; delete state.draft; await saveJob(db,job,state,now,{error}); };
  if (!story || !usableText(story) || state.stories.filter(s => s.lane === story.lane).length >= 3) return advance(null);
  if (state.phase === 'generate') {
    if (story.content_type === 'post') {
      // Recheck public post existence immediately before featuring it; deleted posts fail closed.
      const u = new URL(story.url), parts = u.pathname.split('/');
      const uri = `at://${parts[2]}/app.bsky.feed.post/${parts[4]}`;
      const response = await fetch('https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?' + new URLSearchParams({uris:uri}), {signal:AbortSignal.timeout(6000)});
      const data = response.ok ? await response.json() : null;
      if (!data?.posts?.length || data.posts[0].record?.text?.replace(/\s+/g,' ').trim() !== story.excerpt) return advance('Post deleted, changed or unavailable');
    }
    const cached = await db.prepare('SELECT output FROM generated_notes WHERE content_hash=?').bind(story.content_hash).first();
    if (cached) { state.stories.push(snapshotStory(story,JSON.parse(cached.output))); return advance(null); }
    const output = normalizeNote(await runJson(env,'daily-note',notePrompt,sourceData(story),now,800),story);
    if (!validateNote(output,story)) return advance('Deterministic note validation failed');
    state.draft=output; state.phase='review'; await saveJob(db,job,state,now); return;
  }
  const review = await runJson(env,'daily-review',reviewPrompt,{ source:sourceData(story), proposed:state.draft },now,280);
  if (!approved(review)) return advance('Source comparison rejected: ' + (review.reason ?? 'unsupported'));
  await db.prepare(`INSERT INTO generated_notes VALUES(?,?,?,?,?) ON CONFLICT(content_hash) DO NOTHING`)
    .bind(story.content_hash,story.url,JSON.stringify(state.draft),now,JSON.stringify({claims:state.draft.claims,review})).run();
  await db.prepare('UPDATE stories SET title_en=?, title_zh=? WHERE url=? AND content_hash=?')
    .bind(state.draft.en.title,state.draft.zh.title,story.url,story.content_hash).run();
  state.stories.push(snapshotStory(story,state.draft)); await advance(null);
}

export function validateBond(draft, stories) {
  if (!draft || draft.reject || !Array.isArray(draft.urls) || draft.urls.length !== 2 || new Set(draft.urls).size !== 2) return false;
  const pair = draft.urls.map(url => stories.find(s => s.url === url));
  if (pair.some(s => !s) || new Set(pair.map(s => s.lane)).size !== 2) return false;
  if (!checkLanguage(draft.en?.title,'en',8,160) || !checkLanguage(draft.zh?.title,'zh',5,100)
    || !checkLanguage(draft.en?.note,'en',200,1100) || !checkLanguage(draft.zh?.note,'zh',100,550)
    || !checkLanguage(draft.en?.question,'en',15,220) || !checkLanguage(draft.zh?.question,'zh',8,140)) return false;
  const words = draft.en.note.split(/\s+/).length;
  return words>=80 && words<=120;
}
async function bondStep(env,job,now) {
  const state=JSON.parse(job.payload), db=env.DB;
  const edition=await db.prepare(`SELECT snapshot FROM editions WHERE kind='daily' AND edition_date=?`).bind(state.date).first();
  if (!edition) return saveJob(db,job,state,now,{done:true,error:'No daily edition to connect'});
  const stories=JSON.parse(edition.snapshot).stories;
  if (!state.draft) {
    const {results:recent}=await db.prepare(`SELECT snapshot FROM editions WHERE kind='bond' ORDER BY edition_date DESC LIMIT 7`).all();
    const draft=await runJson(env,'bond',`Find one substantive connection between a Human Voices item and an AI & Its Impact item. Use ONLY these validated notes. Return {urls:[two exact source URLs],en:{title,note,question},zh:{title,note,question}}. The English connecting note must be 80-120 words; Chinese 140-350 characters, with equivalent meaning. Frame the connection as Bond6's interpretation, not as an author's view. Ask ONE specific question. Avoid connections or questions from the recent editions. If the relation is superficial, return {reject:true}.`,{stories,recent:recent.map(r=>JSON.parse(r.snapshot).en?.title)},now,1400);
    if (!validateBond(draft,stories)) return saveJob(db,job,state,now,{done:true,error:'No substantive valid pairing'});
    state.draft=draft; await saveJob(db,job,state,now); return;
  }
  const review=await runJson(env,'bond-review',reviewPrompt + ' Also reject a superficial connection, an interpretation presented as fact, or a repetitive/general reader question.',{source:stories.filter(s=>state.draft.urls.includes(s.url)),proposed:state.draft},now,280);
  if (!approved(review)) return saveJob(db,job,state,now,{done:true,error:'Bond source comparison failed'});
  await publishEdition(db,job,{id:state.date+'-a-connection',kind:'bond',date:state.date,en:state.draft.en,zh:state.draft.zh,
    stories:stories.filter(s=>state.draft.urls.includes(s.url))},now);
}

export async function publishingStep(env,now) {
  if (env.GENERATED_PUBLISHING !== 'true') return false;
  const hour=new Date(now).getUTCHours(), date=dayKey(now), db=env.DB;
  if (hour < 12 || hour > 14) return false;
  await enqueue(db,'daily:'+date,'daily',{date},now);
  let job=await claim(db,'daily:'+date,now);
  if (!job) {
    const daily=await db.prepare(`SELECT status FROM jobs WHERE id=?`).bind('daily:'+date).first();
    if (daily?.status !== 'done') return true;
    await enqueue(db,'bond:'+date,'bond',{date},now);
    job=await claim(db,'bond:'+date,now);
    if (!job) return false;
  }
  try { await (job.kind==='daily' ? dailyStep : bondStep)(env,job,now); }
  catch(error) {
    const state=JSON.parse((await db.prepare('SELECT payload FROM jobs WHERE id=?').bind(job.id).first()).payload);
    if (error instanceof BudgetError && job.kind==='daily' && state.stories?.length) {
      await publishEdition(db,job,{id:state.date,kind:'daily',date:state.date,stories:state.stories},now);
    } else await saveJob(db,job,state,now,{next:now+5*60_000,done:error instanceof BudgetError,error:error.message});
    console.warn('Publishing step deferred',job.id,error.message);
  }
  return true;
}
