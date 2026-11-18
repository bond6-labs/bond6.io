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
  const edition=await worker.fetch(new Request('https://bond6.io/edit/2026-11-13'),{DB:db});const editionText=await edition.text();assert.match(editionText,/class="story-actions"/);assert.doesNotMatch(editionText,/Why this appeared/);
  const head=await worker.fetch(new Request('https://bond6.io/',{method:'HEAD'}),{DB:db});assert.equal(await head.text(),'');
  const sitemap=await worker.fetch(new Request('https://bond6.io/sitemap.xml'),{DB:db});assert.match(await sitemap.text(),/zh\/edit\/2026-11-13/);
});
test('mobile lane and filters survive navigation and language switch',async()=>{
  const db=database();const r=await worker.fetch(new Request('https://bond6.io/?lane=ai&topic=music'),{DB:db});const text=await r.text();
  const primary=text.match(/<nav class="tabs"[^>]*>([\s\S]*?)<\/nav>/)?.[1]??'';
  assert.match(text,/data-lane="ai"/);assert.match(text,/owl-perch/);assert.match(text,/robot-picker-machine/);assert.match(text,/heartbeat/);assert.match(text,/101001/);assert.match(text,/data-infinite-trigger/);assert.match(text,/data-infinite-feed/);assert.match(text,/\/zh\/\?lane=ai&amp;topic=music/);assert.match(text,/href="\/bond\?lane=ai&amp;topic=music"/);assert.doesNotMatch(primary,/href="\/(?:edit|saved)/);assert.doesNotMatch(primary,/aria-label="Saved stories"/);assert.doesNotMatch(text,/<footer[\s\S]*?href="\/edit">Editions/);
});
test('live Rhythm ordering is opt-in without exposing diagnostic controls',async()=>{
  const db=database();await storeItems(db,source,[story(90)],now);
  const chronological=await worker.fetch(new Request('https://bond6.io/'),{DB:db});
  assert.doesNotMatch(await chronological.text(),/Why this appeared/);
  const ranked=await worker.fetch(new Request('https://bond6.io/'),{DB:db,RHYTHM_LIVE_RANKING:'true'});
  const text=await ranked.text();assert.match(text,/class="story-actions"/);assert.doesNotMatch(text,/Why this appeared/);assert.doesNotMatch(text,/Human signal/);
});
test('stale cards that fail the current lane rule do not render or enter live RSS',async()=>{
  const db=database();const stale=story(93,{title:'Trump DOJ Folds, Agrees To Permanent Ban On Censoring ICE Tracking Group And App',excerpt:'The case concerns social media companies and government speech policy.',lane:'ai',subject:'digital',source:'Techdirt',source_id:'techdirt'});
  await storeItems(db,{...source,id:'techdirt',name:'Techdirt'},[stale],now);
  const page=await worker.fetch(new Request('https://bond6.io/?lane=ai'),{DB:db});assert.doesNotMatch(await page.text(),/Trump DOJ Folds/);
  const feed=await worker.fetch(new Request('https://bond6.io/feed.xml?lane=ai'),{DB:db});assert.doesNotMatch(await feed.text(),/Trump DOJ Folds/);
});
test('language editions show only original-language stories and no translated-title fallback',async()=>{
  const db=database();const en=story(94,{title:'An English original headline',title_zh:'A translated headline that must not render'});
  const zh=story(95,{url:'https://example.org/zh/95',link:'https://example.org/zh/95',canonical_url:'https://example.org/zh/95',title:'一条中文原创标题',original_lang:'zh',source:'中文工作室'});
  await storeItems(db,source,[en,zh],now);
  const english=await worker.fetch(new Request('https://bond6.io/'),{DB:db});const enText=await english.text();assert.match(enText,/An English original headline/);assert.doesNotMatch(enText,/一条中文原创标题/);assert.doesNotMatch(enText,/A translated headline that must not render/);assert.match(enText,/aria-label="Search stories"/);assert.match(enText,/>中<\/a>/);
  const chinese=await worker.fetch(new Request('https://bond6.io/zh/'),{DB:db});const zhText=await chinese.text();assert.match(zhText,/一条中文原创标题/);assert.doesNotMatch(zhText,/An English original headline/);assert.match(zhText,/>EN<\/a>/);
  const zhFeed=await worker.fetch(new Request('https://bond6.io/zh/feed.xml'),{DB:db});const zhXml=await zhFeed.text();assert.match(zhXml,/一条中文原创标题/);assert.doesNotMatch(zhXml,/An English original headline/);
});
test('publisher media previews render in the matching original-language edition',async()=>{
  const db=database();
  const en=story(96,{image_url:'https://cdn.example.org/cover.jpg',audio_url:'https://cdn.example.org/listen.mp3',video_url:'https://www.youtube-nocookie.com/embed/abcdef12345'});
  const zh=story(97,{url:'https://example.org/zh/media',link:'https://example.org/zh/media',canonical_url:'https://example.org/zh/media',title:'一段中文声音记录',original_lang:'zh',image_url:'https://cdn.example.org/zh-cover.jpg',audio_url:'https://cdn.example.org/zh-listen.mp3'});
  await storeItems(db,source,[en,zh],now);
  const english=await worker.fetch(new Request('https://bond6.io/'),{DB:db});const enText=await english.text();
  assert.match(enText,/cdn\.example\.org\/cover\.jpg/);assert.match(enText,/<audio controls preload="none" src="https:\/\/cdn\.example\.org\/listen\.mp3">/);assert.match(enText,/youtube-nocookie\.com\/embed\/abcdef12345/);assert.match(english.headers.get('Content-Security-Policy'),/media-src https:/);
  const chinese=await worker.fetch(new Request('https://bond6.io/zh/'),{DB:db});const zhText=await chinese.text();
  assert.match(zhText,/zh-cover\.jpg/);assert.match(zhText,/zh-listen\.mp3/);assert.doesNotMatch(zhText,/src="https:\/\/cdn\.example\.org\/cover\.jpg"/);
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
