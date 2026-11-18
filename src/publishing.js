import { DAY, dayKey, usableText } from './content.js';
import { enqueue, claim, saveJob } from './jobs.js';
import { runJson, notePrompt, reviewPrompt, validateNote, normalizeNote, approved, sourceData, BudgetError, checkLanguage } from './ai.js';
import { RHYTHM_DAILY_MAX_PER_LANE, RHYTHM_FALLBACK_WINDOW_DAYS, RHYTHM_FRESH_WINDOW_DAYS, RHYTHM_MIN_CONFIDENCE } from './config.js';
import { RHYTHM_VERSION } from './rhythm.js';
import { sources } from './sources.js';

const flowSourceIds=new Set(sources.filter(source=>source.tier==='flow').map(source=>source.id));

const rhythmLabels = story => {
  if (Array.isArray(story.rhythm_labels)) return story.rhythm_labels;
  try { return JSON.parse(story.rhythm_labels ?? '[]'); } catch { return []; }
};
const rhythmEvidence = story => {
  if (Array.isArray(story.rhythm_evidence)) return story.rhythm_evidence;
  try { return JSON.parse(story.rhythm_evidence ?? '[]'); } catch { return []; }
};

/**
 * A deterministic priority for the daily edit, not a claim of importance.
 * The components are intentionally small and inspectable: strong lane evidence,
 * useful source text, freshness, and a little credit for a named author.
 */
export function rhythmPriority(story, now = Date.now()) {
  const laneScore = story.lane === 'ai' ? Number(story.rhythm_ai_score) : Number(story.rhythm_human_score);
  const age = Math.max(0, now - Number(story.discovered_at));
  const freshness = age <= DAY ? 1.2 : age <= RHYTHM_FRESH_WINDOW_DAYS * DAY ? .8 : .25;
  const depth = Math.min(1, (story.excerpt?.length ?? 0) / 700);
  const labels = rhythmLabels(story);
  const firsthand = labels.includes('Personal reflection') || labels.includes('First-person process') ? .7 : 0;
  const specificity = labels.includes('Reported specificity') ? .45 : 0;
  return Number((Number(story.rhythm_confidence) * 4 + laneScore * .35 + freshness + depth + firsthand + specificity + (story.author ? .2 : 0)).toFixed(3));
}

export function rankCandidates(stories, used = [], now = Date.now()) {
  const seen = new Set(used), minimumDate = now - RHYTHM_FALLBACK_WINDOW_DAYS * DAY;
  const ranked = stories.filter(s => s.lane && usableText(s) && !seen.has(s.url) && !seen.has(s.canonical_url)
    && s.rhythm_lane === s.lane && Number(s.rhythm_confidence) >= RHYTHM_MIN_CONFIDENCE && Number(s.discovered_at) >= minimumDate)
    .sort((a,b) => rhythmPriority(b,now) - rhythmPriority(a,now) || b.discovered_at - a.discovered_at || a.url.localeCompare(b.url));
  const queue = [], publishers = new Set(), authors = new Set(), topics = new Set(), destinations = new Set();
  let chinese = false;
  for (let round = 0; round < RHYTHM_DAILY_MAX_PER_LANE; round++) for (const lane of ['human','ai']) {
    const options = ranked.filter(s => s.lane === lane && !publishers.has(s.source) && (!s.author || !authors.has(s.author.toLowerCase())) && !destinations.has(s.canonical_url));
    options.sort((a,b) => (lane === 'human' ? Number(!topics.has(b.subject)) - Number(!topics.has(a.subject)) : 0)
      || (!chinese ? Number(b.original_lang === 'zh') - Number(a.original_lang === 'zh') : 0)
      || rhythmPriority(b,now) - rhythmPriority(a,now) || b.discovered_at - a.discovered_at || a.url.localeCompare(b.url));
    const s = options[0];
    if (!s) continue;
    queue.push(s); publishers.add(s.source); if (s.author) authors.add(s.author.toLowerCase());
    destinations.add(s.canonical_url); if (lane === 'human') topics.add(s.subject); if (s.original_lang === 'zh') chinese = true;
  }
  return queue;
}

const counted = (items, value) => Object.fromEntries([...items.reduce((map,item)=>{
  const key=value(item); if (key) map.set(key,(map.get(key)??0)+1); return map;
},new Map()).entries()].sort(([a],[b])=>String(a).localeCompare(String(b))));
const average = values => values.length?Number((values.reduce((total,value)=>total+value,0)/values.length).toFixed(2)):0;
const composition = stories => ({
  total:stories.length,
  lanes:counted(stories,story=>story.lane),
  languages:counted(stories,story=>story.original_lang),
  subjects:counted(stories,story=>story.subject),
  labels:counted(stories.flatMap(story=>rhythmLabels(story).map(label=>({label}))),item=>item.label),
  distinct_publishers:new Set(stories.map(story=>story.source).filter(Boolean)).size,
  distinct_authors:new Set(stories.map(story=>story.author?.toLowerCase()).filter(Boolean)).size,
  mean_confidence:average(stories.map(story=>Number(story.rhythm_confidence??story.rhythm?.confidence??0)))
});

/** Aggregate only: no reader data, URLs, excerpts or author/publisher identities. */
export function rhythmAudit(eligible, selected, now = Date.now(), status = 'prepared') {
  const byLane=composition(selected).lanes;
  return { version:RHYTHM_VERSION, status, generated_at:now,
    window_hours:RHYTHM_FALLBACK_WINDOW_DAYS*24,
    eligible:composition(eligible), selected:composition(selected),
    shortfall:{human:Math.max(0,RHYTHM_DAILY_MAX_PER_LANE-(byLane.human??0)),ai:Math.max(0,RHYTHM_DAILY_MAX_PER_LANE-(byLane.ai??0))} };
}
export async function saveRhythmAudit(db,date,audit,now) {
  await db.prepare(`INSERT INTO rhythm_audits(edition_date,rhythm_version,snapshot,created_at,updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(edition_date) DO UPDATE SET rhythm_version=excluded.rhythm_version,snapshot=excluded.snapshot,updated_at=excluded.updated_at`)
    .bind(date,audit.version,JSON.stringify(audit),now,now).run();
}
const completeAudit=(audit,stories,now)=>({...audit,status:'published',published:composition(stories),completed_at:now});

async function rhythmSelection(db,now) {
  const { results } = await db.prepare(`SELECT s.*, r.rhythm_version, r.human_score AS rhythm_human_score, r.ai_score AS rhythm_ai_score,
    r.lane_recommendation AS rhythm_lane, r.confidence AS rhythm_confidence, r.labels AS rhythm_labels, r.evidence AS rhythm_evidence
    FROM stories s JOIN story_signals r ON r.story_url=s.url
    WHERE s.discovered_at>=? AND s.lane IS NOT NULL AND s.content_hash IS NOT NULL
      AND r.rhythm_version=? AND r.lane_recommendation=s.lane AND r.confidence>=?
    ORDER BY s.discovered_at DESC LIMIT 160`).bind(now - RHYTHM_FALLBACK_WINDOW_DAYS * DAY,RHYTHM_VERSION,RHYTHM_MIN_CONFIDENCE).all();
  const { results: used } = await db.prepare(`SELECT url FROM edition_stories JOIN editions ON editions.id=edition_stories.edition_id
    WHERE kind='daily' AND published_at>=?`).bind(now - 7 * DAY).all();
  // Fast, broader Flow sources keep Latest fresh. The daily edition is drawn
  // only from the stricter core-reading pool.
  const core=results.filter(story=>!flowSourceIds.has(story.source_id));
  return { eligible:core, selected:rankCandidates(core,used.map(story=>story.url),now) };
}

/** A no-AI, no-publishing daily dry run. It makes the readiness sample observable. */
async function shadowRhythmStep(env,now) {
  const hour=new Date(now).getUTCHours(), date=dayKey(now);
  if (hour < 12 || hour > 14) return false;
  const existing=await env.DB.prepare('SELECT edition_date FROM rhythm_audits WHERE edition_date=?').bind(date).first();
  if (existing) return false;
  const {eligible,selected}=await rhythmSelection(env.DB,now);
  const audit=rhythmAudit(eligible,selected,now,selected.length?'shadow':'shadow-awaiting-candidates');
  await saveRhythmAudit(env.DB,date,audit,now);
  return true;
}

export function snapshotStory(story, output, selectedAt = Date.now()) {
  return { url: story.url, canonical_url: story.canonical_url, title: story.title, title_en: output.en.title, title_zh: output.zh.title,
    en: { title: output.en.title, note: output.claims.map(c => c.en).join(' ') },
    zh: { title: output.zh.title, note: output.claims.map(c => c.zh).join('') },
    source: story.source, source_id: story.source_id, author: story.author, lane: story.lane, subject: story.subject,
    original_lang: story.original_lang, original_published_at: story.original_published_at, discovered_at: story.discovered_at,
    content_type: story.content_type, content_hash: story.content_hash,
    rhythm: story.rhythm_lane ? { version: story.rhythm_version, confidence: Number(story.rhythm_confidence),
      human_score: Number(story.rhythm_human_score), ai_score: Number(story.rhythm_ai_score),
      labels: rhythmLabels(story), evidence: rhythmEvidence(story), priority: rhythmPriority(story,selectedAt) } : undefined };
}

export async function publishEdition(db, job, snapshot, now, audit = null) {
  // INSERT, attribution index and job completion share one D1 transaction.
  // Lease token fencing prevents an expired worker publishing after another claim.
  const snapshotJson=JSON.stringify(snapshot);
  const statements = [db.prepare(`INSERT INTO editions(id,kind,edition_date,published_at,snapshot)
    SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM jobs WHERE id=? AND lease_token=? AND lease_until>?)
    ON CONFLICT DO NOTHING`).bind(snapshot.id, snapshot.kind, snapshot.date, now, snapshotJson, job.id, job.lease_token, now)];
  for (const story of snapshot.stories) statements.push(db.prepare(`INSERT INTO edition_stories(edition_id,url,publisher,author)
    SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM editions WHERE id=? AND snapshot=?)
    AND EXISTS(SELECT 1 FROM jobs WHERE id=? AND lease_token=? AND lease_until>?) ON CONFLICT DO NOTHING`)
    .bind(snapshot.id,story.url,story.source,story.author,snapshot.id,snapshotJson,job.id,job.lease_token,now));
  if (audit && snapshot.kind==='daily') statements.push(db.prepare(`INSERT INTO rhythm_audits(edition_date,rhythm_version,snapshot,created_at,updated_at)
    SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM editions WHERE id=? AND snapshot=?)
    ON CONFLICT(edition_date) DO UPDATE SET rhythm_version=excluded.rhythm_version,snapshot=excluded.snapshot,updated_at=excluded.updated_at`)
    .bind(snapshot.date,audit.version,JSON.stringify(audit),now,now,snapshot.id,snapshotJson));
  statements.push(db.prepare(`UPDATE jobs SET status='done',payload='{}',lease_until=0,lease_token=NULL,updated_at=?
    WHERE id=? AND lease_token=? AND EXISTS(SELECT 1 FROM editions WHERE id=?)`).bind(now,job.id,job.lease_token,snapshot.id));
  await db.batch(statements);
}

async function dailyStep(env, job, now) {
  const db = env.DB, state = JSON.parse(job.payload);
  if (!state.candidates) {
    const {eligible,selected}=await rhythmSelection(db,now), audit=rhythmAudit(eligible,selected,now,selected.length?'prepared':'awaiting-candidates');
    await saveRhythmAudit(db,state.date,audit,now);
    const candidates = selected.map(s => ({ url: s.url, hash: s.content_hash }));
    if (!candidates.length) { await saveJob(db, job, state, now, { next: now + 10 * 60_000 }); return; }
    Object.assign(state, { candidates, cursor: 0, stories: [], phase: 'generate', audit });
    await saveJob(db,job,state,now); return;
  }
  const deadline = Date.parse(state.date + 'T14:00:00Z');
  if (state.cursor >= state.candidates.length || state.stories.length >= 6 || now >= deadline) {
    if (state.stories.length) await publishEdition(db,job,{ id: state.date, kind: 'daily', date: state.date, stories: state.stories },now,completeAudit(state.audit??rhythmAudit([],[],now),state.stories,now));
    else await saveJob(db,job,state,now,{done:true,error:'No fully validated candidates; prior edition retained'});
    return;
  }
  const candidate = state.candidates[state.cursor];
  const story = await db.prepare(`SELECT s.*, r.rhythm_version, r.human_score AS rhythm_human_score, r.ai_score AS rhythm_ai_score,
    r.lane_recommendation AS rhythm_lane, r.confidence AS rhythm_confidence, r.labels AS rhythm_labels, r.evidence AS rhythm_evidence
    FROM stories s JOIN story_signals r ON r.story_url=s.url WHERE s.url=? AND s.content_hash=?`)
    .bind(candidate.url,candidate.hash).first();
  const advance = async error => { state.cursor++; state.phase='generate'; delete state.draft; await saveJob(db,job,state,now,{error}); };
  if (!story || !usableText(story) || state.stories.filter(s => s.lane === story.lane).length >= RHYTHM_DAILY_MAX_PER_LANE) return advance(null);
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
    if (cached) {
      const output=JSON.parse(cached.output);
      if (validateNote(output,story)) { state.stories.push(snapshotStory(story,output,now)); return advance(null); }
      await db.prepare('DELETE FROM generated_notes WHERE content_hash=?').bind(story.content_hash).run();
    }
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
  state.stories.push(snapshotStory(story,state.draft,now)); await advance(null);
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
/** Only completed daily notes with recorded, strong Rhythm evidence may seed The Bond. */
export function validatedBondStories(stories) {
  return stories.filter(story => story?.en?.note && story?.zh?.note
    && Number(story.rhythm?.confidence) >= RHYTHM_MIN_CONFIDENCE
    && Array.isArray(story.rhythm?.labels) && story.rhythm.labels.length
    && Array.isArray(story.rhythm?.evidence) && story.rhythm.evidence.length);
}
async function bondStep(env,job,now) {
  const state=JSON.parse(job.payload), db=env.DB;
  const edition=await db.prepare(`SELECT snapshot FROM editions WHERE kind='daily' AND edition_date=?`).bind(state.date).first();
  if (!edition) return saveJob(db,job,state,now,{done:true,error:'No daily edition to connect'});
  const stories=validatedBondStories(JSON.parse(edition.snapshot).stories);
  if (new Set(stories.map(story=>story.lane)).size!==2) return saveJob(db,job,state,now,{done:true,error:'No high-confidence validated pair for The Bond'});
  if (!state.draft) {
    const {results:recent}=await db.prepare(`SELECT snapshot FROM editions WHERE kind='bond' ORDER BY edition_date DESC LIMIT 7`).all();
    const draft=await runJson(env,'bond',`Find one substantive connection between a Human Pulse item and an AI Wave item. Use ONLY these validated notes. Return {urls:[two exact source URLs],en:{title,note,question},zh:{title,note,question}}. The English connecting note must be 80-120 words; Chinese 140-350 characters, with equivalent meaning. Frame the connection as Bond6's interpretation, not as an author's view. Ask ONE specific question. Avoid connections or questions from the recent editions. If the relation is superficial, return {reject:true}.`,{stories,recent:recent.map(r=>JSON.parse(r.snapshot).en?.title)},now,1400);
    if (!validateBond(draft,stories)) return saveJob(db,job,state,now,{done:true,error:'No substantive valid pairing'});
    state.draft=draft; await saveJob(db,job,state,now); return;
  }
  const review=await runJson(env,'bond-review',reviewPrompt + ' Also reject a superficial connection, an interpretation presented as fact, or a repetitive/general reader question.',{source:stories.filter(s=>state.draft.urls.includes(s.url)),proposed:state.draft},now,280);
  if (!approved(review)) return saveJob(db,job,state,now,{done:true,error:'Bond source comparison failed'});
  await publishEdition(db,job,{id:state.date+'-a-connection',kind:'bond',date:state.date,en:state.draft.en,zh:state.draft.zh,
    stories:stories.filter(s=>state.draft.urls.includes(s.url))},now);
}

export async function publishingStep(env,now) {
  if (env.GENERATED_PUBLISHING !== 'true') return env.RHYTHM_SHADOW_MODE === 'true'?shadowRhythmStep(env,now):false;
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
      await publishEdition(db,job,{id:state.date,kind:'daily',date:state.date,stories:state.stories},now,completeAudit(state.audit??rhythmAudit([],[],now),state.stories,now));
    } else await saveJob(db,job,state,now,{next:now+5*60_000,done:error instanceof BudgetError,error:error.message});
    console.warn('Publishing step deferred',job.id,error.message);
  }
  return true;
}
