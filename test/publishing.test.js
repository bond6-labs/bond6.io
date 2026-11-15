import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './db.js';
import {story,source,now,note,review} from './fixtures.js';
import {enqueue,claim} from '../src/jobs.js';
import {publishEdition,publishingStep,rankCandidates,snapshotStory} from '../src/publishing.js';
import {storeItems} from '../src/ingest.js';
import {runJson,BudgetError} from '../src/ai.js';
import worker from '../src/worker.js';
test('leases admit one claimant, recover after expiry and fence stale publication',async()=>{
  const db=database();await enqueue(db,'daily:2026-11-13','daily',{},now);
  const [one,two]=await Promise.all([claim(db,'daily:2026-11-13',now),claim(db,'daily:2026-11-13',now)]);
  assert.ok(one);assert.equal(two,null);
  const renewed=await claim(db,one.id,now+6*60_000);assert.notEqual(one.lease_token,renewed.lease_token);
  const snapshot={id:'2026-11-13',kind:'daily',date:'2026-11-13',stories:[snapshotStory(story(),note(story()))]};
  await publishEdition(db,one,snapshot,now+6*60_000);assert.equal(db.sql.prepare('SELECT count(*) AS n FROM editions').get().n,0);
  await publishEdition(db,renewed,snapshot,now+6*60_000);await publishEdition(db,one,{...snapshot,stories:[{...snapshot.stories[0],url:'https://example.org/wrong'}]},now+6*60_000);
  assert.equal(db.sql.prepare('SELECT count(*) AS n FROM editions').get().n,1);assert.equal(db.sql.prepare('SELECT count(*) AS n FROM edition_stories').get().n,1);
});
test('publication rolls back all writes when attribution cannot be written',async()=>{
  const db=database();await enqueue(db,'daily:rollback','daily',{},now);const job=await claim(db,'daily:rollback',now);
  await assert.rejects(()=>publishEdition(db,job,{id:'rollback',kind:'daily',date:'2026-11-13',stories:[{url:'https://example.org/a',source:null,author:null}]},now));
  assert.equal(db.sql.prepare('SELECT count(*) AS n FROM editions').get().n,0);assert.equal(db.sql.prepare('SELECT status FROM jobs').get().status,'pending');
});
test('candidate selection diversifies topics, languages, authors and publishers and avoids repeats',()=>{
  const stories=Array.from({length:12},(_,i)=>story(i,{author:'Author '+i,lane:i%2?'ai':'human',subject:i%3?'writing':'music',original_lang:i===4?'zh':'en'}));
  stories.push({...stories[0],url:'https://example.org/duplicate',canonical_url:'https://example.org/duplicate'});
  const picks=rankCandidates(stories,[stories[2].url],now).slice(0,6);
  assert.equal(new Set(picks.map(s=>s.source)).size,picks.length);assert.equal(new Set(picks.map(s=>s.author)).size,picks.length);
  assert.ok(picks.some(s=>s.original_lang==='zh'));assert.ok(new Set(picks.filter(s=>s.lane==='human').map(s=>s.subject)).size>=2);assert.ok(!picks.some(s=>s.url===stories[2].url));
});
test('concurrent budget reservation never exceeds the configured allowance; provider failures stay charged',async()=>{
  const db=database();let calls=0;const env={DB:db,AI_DAILY_NEURONS:'500',AI:{run:async()=>{calls++;throw new Error('Provider unavailable');}}};
  await Promise.allSettled([runJson(env,'test','Return JSON',{},now,900),runJson(env,'test','Return JSON',{},now,900)]);
  assert.equal(calls,1);const usage=await db.prepare('SELECT * FROM ai_usage').first();assert.ok(usage.neurons<=500);assert.equal(usage.failures,1);
  await assert.rejects(()=>runJson({...env,AI_DAILY_NEURONS:'0'},'test','',{},now),BudgetError);
});
test('actual model usage reconciles reservations, including JSON failure',async()=>{
  const db=database();await runJson({DB:db,AI:{run:async()=>({response:'{"ok":true}',usage:{prompt_tokens:100,completion_tokens:20}})}},'test','',{},now);
  assert.equal((await db.prepare('SELECT neurons FROM ai_usage').first()).neurons,10);
});
test('daily job publishes only after generation and independent review; retries do not duplicate',async()=>{
  const db=database(),s=story();await storeItems(db,source,[s],now-1000);
  let count=0;const env={DB:db,GENERATED_PUBLISHING:'true',AI:{run:async()=>({response:JSON.stringify(count++===0?note(s):review),usage:{prompt_tokens:100,completion_tokens:100}})}};
  await publishingStep(env,now);await publishingStep(env,now+60_000);assert.equal(db.sql.prepare('SELECT count(*) AS n FROM editions').get().n,0);
  await publishingStep(env,now+120_000);assert.equal(db.sql.prepare('SELECT count(*) AS n FROM editions').get().n,0);
  await publishingStep(env,now+180_000);assert.equal(db.sql.prepare('SELECT count(*) AS n FROM editions').get().n,1);
  const published=JSON.parse(db.sql.prepare('SELECT snapshot FROM editions').get().snapshot);assert.equal(published.stories[0].en.note,note(s).claims.map(c=>c.en).join(' '));
  await publishingStep(env,now+240_000);assert.equal(db.sql.prepare("SELECT count(*) AS n FROM editions WHERE kind='daily'").get().n,1);
});
test('failed model, exhausted quota and publishing disabled leave prepared reading available',async()=>{
  const db=database();const s=story();await storeItems(db,source,[s],now);
  db.sql.prepare('INSERT INTO editions VALUES(?,?,?,?,?,NULL)').run('previous','daily','2026-11-12',now,JSON.stringify({id:'previous',date:'2026-11-12',kind:'daily',stories:[snapshotStory(s,note(s))]}));
  const env={DB:db,GENERATED_PUBLISHING:'false',AI:{run:()=>{throw new Error('Unavailable');}}};await publishingStep(env,now);assert.equal(db.sql.prepare('SELECT count(*) AS n FROM jobs').get().n,0);
  env.GENERATED_PUBLISHING='true';await publishingStep(env,now);await publishingStep(env,now+60_000);
  const response=await worker.fetch(new Request('https://bond6.io/'),env);assert.equal(response.status,200);assert.match(await response.text(),/Leah recorded/);
});
