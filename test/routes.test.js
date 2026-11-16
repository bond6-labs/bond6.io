import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{event} from '../src/worker.js';
import {database} from './db.js';
import {storeItems} from '../src/ingest.js';
import {story,source,now,note} from './fixtures.js';
import {snapshotStory} from '../src/publishing.js';
test('EN/CN routes, feed filters, archives, metadata and HEAD work without JavaScript or AI',async()=>{
  const db=database();const s=story();await storeItems(db,source,[s],now);
  const picked=await db.prepare(`SELECT s.*,r.rhythm_version,r.human_score AS rhythm_human_score,r.ai_score AS rhythm_ai_score,
    r.lane_recommendation AS rhythm_lane,r.confidence AS rhythm_confidence,r.labels AS rhythm_labels,r.evidence AS rhythm_evidence
    FROM stories s JOIN story_signals r ON r.story_url=s.url WHERE s.url=?`).bind(s.url).first();
  db.sql.prepare('INSERT INTO editions VALUES(?,?,?,?,?,NULL)').run('2026-11-13','daily','2026-11-13',now,JSON.stringify({id:'2026-11-13',kind:'daily',date:'2026-11-13',stories:[snapshotStory(picked,note(s),now)]}));
  for(const prefix of ['','/zh']) for(const path of ['/','/about','/sources','/saved','/subscribe','/edit','/edit/2026-11-13','/bond','/bond/field-notes-making-and-proof','/feed.xml','/feed.xml?kind=daily&lane=human','/feed.xml?kind=bond']){
    const r=await worker.fetch(new Request('https://bond6.io'+prefix+path),{DB:db});assert.equal(r.status,200,prefix+path);
    const text=await r.text();assert.ok(!text.includes('undefined'),path);if(!path.includes('.xml')){assert.match(text,/rel="canonical"/);assert.match(text,/hreflang="zh-Hans"/);}
  }
  assert.equal((await worker.fetch(new Request('https://bond6.io/feed.xml?kind=wrong'),{DB:db})).status,400);
  assert.equal((await worker.fetch(new Request('https://bond6.io/edit/1999-01-01'),{DB:db})).status,404);
  const about=await worker.fetch(new Request('https://bond6.io/about'),{DB:db});assert.match(await about.text(),/Bond6 Rhythm/);
  const edition=await worker.fetch(new Request('https://bond6.io/edit/2026-11-13'),{DB:db});assert.match(await edition.text(),/Human signal/);
  const head=await worker.fetch(new Request('https://bond6.io/',{method:'HEAD'}),{DB:db});assert.equal(await head.text(),'');
  const sitemap=await worker.fetch(new Request('https://bond6.io/sitemap.xml'),{DB:db});assert.match(await sitemap.text(),/zh\/edit\/2026-11-13/);
});
test('mobile lane and filters survive navigation and language switch',async()=>{
  const db=database();const r=await worker.fetch(new Request('https://bond6.io/?lane=ai&topic=music'),{DB:db});const text=await r.text();
  const primary=text.match(/<nav class="tabs"[^>]*>([\s\S]*?)<\/nav>/)?.[1]??'';
  assert.match(text,/data-lane="ai"/);assert.match(text,/owl-perch/);assert.match(text,/robot-picker-machine/);assert.match(text,/heartbeat/);assert.match(text,/101001/);assert.match(text,/\/zh\/\?lane=ai&amp;topic=music/);assert.match(text,/href="\/bond\?lane=ai&amp;topic=music"/);assert.doesNotMatch(primary,/href="\/(?:edit|saved)/);assert.doesNotMatch(primary,/aria-label="Saved stories"/);assert.match(text,/<footer[\s\S]*?href="\/edit">Editions/);
});
test('live Rhythm ordering and explanations are opt-in',async()=>{
  const db=database();await storeItems(db,source,[story(90)],now);
  const chronological=await worker.fetch(new Request('https://bond6.io/'),{DB:db});
  assert.doesNotMatch(await chronological.text(),/Why this appeared/);
  const ranked=await worker.fetch(new Request('https://bond6.io/'),{DB:db,RHYTHM_LIVE_RANKING:'true'});
  const text=await ranked.text();assert.match(text,/Why this appeared/);assert.match(text,/Human signal/);
});
test('metadata and story markup escape untrusted source text',async()=>{
  const db=database();await storeItems(db,source,[story(0,{title:'<script>alert(1)</script>',author:'" onclick="bad'})],now);
  const r=await worker.fetch(new Request('https://bond6.io/'),{DB:db});const text=await r.text();assert.ok(!text.includes('<script>alert(1)</script>'));assert.match(text,/&lt;script&gt;/);
});
test('metrics allow only small same-origin aggregate events',async()=>{
  const db=database(),make=(origin,eventName)=>new Request('https://bond6.io/events',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({event:eventName})});
  assert.equal((await event(make('https://evil.example','visit'),{DB:db},now)).status,403);
  assert.equal((await event(make('https://bond6.io','search text'),{DB:db},now)).status,400);
  assert.equal((await event(make('https://bond6.io','save'),{DB:db},now)).status,204);
  assert.deepEqual(Object.keys(db.sql.prepare('SELECT * FROM metrics').get()).sort(),['count','day','event']);
});
