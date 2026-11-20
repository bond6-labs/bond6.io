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
  const health=await worker.fetch(new Request('https://bond6.io/healthz'),{DB:db,BUILD_VERSION:'test-release'});assert.equal(health.status,200);assert.equal(health.headers.get('x-bond6-release'),'test-release');assert.deepEqual(await health.json(),{ok:true,release:'test-release'});
  const page=await worker.fetch(new Request('https://bond6.io/'),{DB:db,BUILD_VERSION:'test-release'});assert.equal(page.headers.get('cache-control'),'public, max-age=60');assert.equal(page.headers.get('cdn-cache-control'),'public, max-age=60');assert.equal(page.headers.get('x-bond6-release'),'test-release');
  const sitemap=await worker.fetch(new Request('https://bond6.io/sitemap.xml'),{DB:db});assert.match(await sitemap.text(),/zh\/edit\/2026-11-13/);
});
test('a last successful edge snapshot keeps a reading page available during a database failure',async()=>{
  const stored=new Map(),priorCaches=globalThis.caches;
  globalThis.caches={default:{
    async match(request){const response=stored.get(request.url);return response?.clone();},
    async put(request,response){stored.set(request.url,response.clone());}
  }};
  try{
    const db=database(),tasks=[];
    const context={waitUntil(task){tasks.push(task);}};
    const initial=await worker.fetch(new Request('https://bond6.io/'),{DB:db,BUILD_VERSION:'one'},context);
    assert.equal(initial.status,200);await Promise.all(tasks);
    const unavailable={prepare(){throw new Error('D1 daily row-read limit reached');}};
    const recovered=await worker.fetch(new Request('https://bond6.io/'),{DB:unavailable,BUILD_VERSION:'two'});
    assert.equal(recovered.status,200);
    assert.equal(recovered.headers.get('x-bond6-snapshot'),'stale');
    assert.match(await recovered.text(),/The Bond6 Flow/);
  } finally {
    if(priorCaches===undefined)delete globalThis.caches;else globalThis.caches=priorCaches;
  }
});
test('Sources uses the latest check state and keeps its catalog bilingual',async()=>{
  const db=database();
  db.sql.prepare('INSERT INTO source_state VALUES(?,?,?,?,?,?,?)').run('bandcamp',null,null,now,now,0,now);
  db.sql.prepare('INSERT INTO source_state VALUES(?,?,?,?,?,?,?)').run('ai-snake-oil',null,null,now,now-60_000,2,now+60_000);
  const english=await worker.fetch(new Request('https://bond6.io/sources'),{DB:db,BUILD_VERSION:'catalog-release'});
  const text=await english.text();
  assert.match(text,/living catalogue/);
  assert.match(text,/Source Vitality/);
  assert.match(text,/Bandcamp Daily[\s\S]*?Checked/);
  assert.match(text,/AI Snake Oil[\s\S]*?Latest check failed · retrying[\s\S]*?Last successful check/);
  assert.match(text,/随机波动[\s\S]*?Not checked yet/);
  assert.match(text,/reader\.js\?v=catalog-release/);
  const chinese=await worker.fetch(new Request('https://bond6.io/zh/sources'),{DB:db});
  const chineseText=await chinese.text();
  assert.match(chineseText,/启用或观察中的来源/);
  assert.match(chineseText,/AI 与社会/);
  assert.match(chineseText,/最近检查失败 · 将重试/);
});
test('archive pages cap a single publisher while retaining other arrivals',async()=>{
  const db=database();
  for(let i=0;i<8;i++)await storeItems(db,{...source,id:'same-publisher',name:'Same Publisher'},[story(500+i,{url:`https://example.org/same/${i}`,link:`https://example.org/same/${i}`,canonical_url:`https://example.org/same/${i}`,title:`A musician records a new album at home ${i}`,author:null,source:'Same Publisher',source_id:'same-publisher',subject:'music',discovered_at:now-i})],now-i);
  for(let i=0;i<4;i++)await storeItems(db,{...source,id:`other-${i}`,name:`Other Publisher ${i}`},[story(600+i,{url:`https://example.org/other/${i}`,link:`https://example.org/other/${i}`,canonical_url:`https://example.org/other/${i}`,title:`A musician records a different album at home ${i}`,source:`Other Publisher ${i}`,source_id:`other-${i}`,subject:'music',discovered_at:now-100-i})],now-100-i);
  const page=await worker.fetch(new Request('https://bond6.io/?view=all&topic=music'),{DB:db});const text=await page.text();
  assert.equal((text.match(/<span>Same Publisher<\/span>/g)??[]).length,3);
  assert.match(text,/Other Publisher 0/);
});
test('mobile lane and filters survive navigation and language switch',async()=>{
  const db=database();const r=await worker.fetch(new Request('https://bond6.io/?lane=ai&topic=music'),{DB:db});const text=await r.text();
  const primary=text.match(/<nav class="tabs"[^>]*>([\s\S]*?)<\/nav>/)?.[1]??'';
  assert.match(text,/data-lane="ai" data-desktop-lane="ai"/);assert.match(text,/lane-view-switch/);assert.match(text,/owl-perch/);assert.match(text,/robot-picker-machine/);assert.match(text,/heartbeat/);assert.match(text,/101001/);assert.match(text,/data-infinite-trigger data-lane="human"/);assert.match(text,/data-infinite-trigger data-lane="ai"/);assert.match(text,/data-infinite-lane-feed="human"/);assert.match(text,/\/zh\/\?lane=ai&amp;topic=music/);assert.match(text,/href="\/bond\?lane=ai&amp;topic=music"/);assert.doesNotMatch(primary,/href="\/(?:edit|saved)/);assert.doesNotMatch(primary,/aria-label="Saved stories"/);assert.doesNotMatch(text,/<footer[\s\S]*?href="\/edit">Editions/);
});
test('live feed continuations use a stable cursor and never repeat rendered stories',async()=>{
  const db=database();
  for(let i=0;i<35;i++){
    const item=story(200+i,{title:`AI system update changes creative work ${i}`,excerpt:`An AI system update changes creative work and jobs for independent artists ${i}.`,lane:'ai',subject:'digital',source:`AI Source ${i}`,source_id:`ai-source-${i}`});
    await storeItems(db,{...source,id:`ai-source-${i}`,name:`AI Source ${i}`,topic:'Digital Life'},[item],now-i);
  }
  const initial=await worker.fetch(new Request('https://bond6.io/?lane=ai'),{DB:db});const initialText=await initial.text();
  const trigger=initialText.match(/data-infinite-trigger data-lane="ai" href="([^"]+)"/);
  assert.ok(trigger);assert.match(trigger[1],/before=/);assert.match(trigger[1],/before_url=/);
  const firstTitle='AI system update changes creative work 0';assert.match(initialText,new RegExp(firstTitle));
  const continuation=await worker.fetch(new Request('https://bond6.io'+trigger[1].replaceAll('&amp;','&')),{DB:db});const continuationText=await continuation.text();
  assert.doesNotMatch(continuationText,new RegExp(firstTitle));assert.match(continuationText,/AI system update changes creative work 1[0-9]/);
  const next=continuationText.match(/data-next-page href="([^"]+)"/);assert.ok(next);assert.match(next[1],/before=/);
});
test('Focusing labels emerging signals and Bonding renders a Bonding route',async()=>{
  const db=database();
  const human=story(310,{title:'A musician writes about care in creative work',excerpt:'A musician describes music, community care and authorship in a personal account.',source:'Human Journal',source_id:'human-journal'});
  const humanTwo=story(311,{title:'Independent musicians build a caring community',excerpt:'A songwriter reflects on music, community and creative work.',source:'Human Journal Two',source_id:'human-journal-two'});
  const ai=story(312,{title:'AI tools reshape authorship for artists',excerpt:'An AI system changes creative work, authorship and the rights of artists.',lane:'ai',subject:'digital',source:'AI Journal',source_id:'ai-journal'});
  await storeItems(db,{...source,id:'human-journal',name:'Human Journal'},[human],now);
  await storeItems(db,{...source,id:'human-journal-two',name:'Human Journal Two'},[humanTwo],now-1);
  await storeItems(db,{...source,id:'ai-journal',name:'AI Journal',topic:'Digital Life'},[ai],now-2);
  const focusing=await worker.fetch(new Request('https://bond6.io/trending'),{DB:db});const focusingText=await focusing.text();assert.match(focusingText,/Emerging · 2 sources/);
  const bonding=await worker.fetch(new Request('https://bond6.io/bond'),{DB:db});const bondingText=await bonding.text();assert.match(bondingText,/Bonding route/);assert.match(bondingText,/Making &amp; authorship/);
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
  const insecure=story(98,{url:'https://example.org/insecure-video',link:'https://example.org/insecure-video',canonical_url:'https://example.org/insecure-video',video_url:'http://cdn.example.org/wrong-attachment.mp4'});
  await storeItems(db,source,[en,zh,insecure],now);
  const english=await worker.fetch(new Request('https://bond6.io/'),{DB:db});const enText=await english.text();
  assert.match(enText,/cdn\.example\.org\/cover\.jpg/);assert.match(enText,/<audio controls preload="none" src="https:\/\/cdn\.example\.org\/listen\.mp3">/);assert.match(enText,/youtube-nocookie\.com\/embed\/abcdef12345/);assert.match(enText,/referrerpolicy="strict-origin-when-cross-origin"/);assert.match(english.headers.get('Content-Security-Policy'),/media-src https:/);
  assert.doesNotMatch(enText,/<source src="http:\/\/cdn\.example\.org\/wrong-attachment\.mp4">/);
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
