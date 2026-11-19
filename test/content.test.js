import test from 'node:test';
import assert from 'node:assert/strict';
import {fromRss,fromBluesky,storeItems,suppressItems,resolveShortLink,prune,pollIntervalMs} from '../src/ingest.js';
import {classify,canonical,contentHash,usableText} from '../src/content.js';
import {validateNote,approved} from '../src/ai.js';
import {database} from './db.js';
import {story,source,now,note,review} from './fixtures.js';
test('RSS preserves Chinese, author and publication; Atom updated is not publication',()=>{
  const [s]=fromRss('<rss><channel><item><title>音乐与我的生活</title><link>https://example.org/a?utm_source=x</link><dc:creator>李明</dc:creator><description>这是我在家录制一首歌曲的经历，写下音乐创作的过程。</description><pubDate>Thu, 12 Nov 2026 12:00:00 GMT</pubDate></item></channel></rss>',source);
  assert.equal(s.original_lang,'zh');assert.equal(s.author,'李明');assert.equal(s.lane,'human');assert.equal(s.original_published_at,now-86400000);assert.equal(s.url,'https://example.org/a');
  const [atom]=fromRss('<feed><entry><title>Writing a poem</title><link href="https://example.org/p"/><updated>2026-11-12T00:00Z</updated><author><name>Ada</name></author></entry></feed>',source);
  assert.equal(atom.original_published_at,null);assert.equal(atom.author,'Ada');
});
test('RSS media previews retain only public image, audio and video links',()=>{
  const [s]=fromRss('<rss><channel><item><title>一首歌的现场版本</title><link>https://example.org/live</link><description>一段关于音乐现场录制、听众与创作过程的中文文章。</description><media:thumbnail url="https://cdn.example.org/live.jpg" title="演出现场"/><enclosure url="https://cdn.example.org/live.mp3" type="audio/mpeg"/><media:content url="https://www.youtube.com/watch?v=abcdef12345" type="video/mp4"/></item></channel></rss>',source);
  assert.equal(s.image_url,'https://cdn.example.org/live.jpg');
  assert.equal(s.audio_url,'https://cdn.example.org/live.mp3');
  assert.equal(s.video_url,'https://www.youtube-nocookie.com/embed/abcdef12345');
  const [unsafe]=fromRss('<rss><channel><item><title>A recording at home</title><link>https://example.org/recording</link><description>A long enough description of recording songs at home with friends and trying each arrangement before releasing it.</description><media:thumbnail url="http://127.0.0.1/private.jpg"/></item></channel></rss>',source);
  assert.equal(unsafe.image_url,null);
});
test('RSS publisher media supports medium=image and safe embedded feed previews',()=>{
  const [structured]=fromRss('<rss><channel><item><title>A working artist records music at home</title><link>https://example.org/structured</link><description>A detailed account of recording music with friends and testing arrangements over several evenings.</description><media:content url="https://cdn.example.org/ghost-cover.jpg" medium="image"/></item></channel></rss>',source);
  assert.equal(structured.image_url,'https://cdn.example.org/ghost-cover.jpg');
  const [embedded]=fromRss('<rss><channel><item><title>A writer shares a studio session</title><link>https://example.org/embedded</link><content:encoded><![CDATA[<p>A detailed account of music and creative work.</p><img src="https://cdn.example.org/cover.webp" width="1200" height="675"><audio src="https://cdn.example.org/session.mp3"></audio><iframe src="https://www.youtube.com/embed/abcdef12345"></iframe>]]></content:encoded></item></channel></rss>',source);
  assert.equal(embedded.image_url,'https://cdn.example.org/cover.webp');
  assert.equal(embedded.audio_url,'https://cdn.example.org/session.mp3');
  assert.equal(embedded.video_url,'https://www.youtube-nocookie.com/embed/abcdef12345');
  const [tracker]=fromRss('<rss><channel><item><title>A writer shares a studio session</title><link>https://example.org/tracker</link><content:encoded><![CDATA[<p>A detailed account of music and creative work.</p><img src="https://cdn.example.org/tracking.gif" width="1" height="1"><img src="https://cdn.example.org/cover.jpg"></img>]]></content:encoded></item></channel></rss>',source);
  assert.equal(tracker.image_url,'https://cdn.example.org/cover.jpg');
});
test('unsafe URLs and document declarations are rejected',()=>{
  for(const url of ['javascript:alert(1)','http://127.0.0.1/a','https://name:password@example.org'])assert.equal(canonical(url),null);
  assert.throws(()=>fromRss('<!DOCTYPE x><rss/>',source));
});
test('source polling uses a bounded fast lane without accelerating every feed',()=>{
  assert.equal(pollIntervalMs({poll_minutes:10}),10*60_000);
  assert.equal(pollIntervalMs({}),45*60_000);
  assert.equal(pollIntervalMs({poll_minutes:1}),10*60_000);
  assert.equal(pollIntervalMs({poll_minutes:999}),180*60_000);
});
test('classification follows content, not publication names',()=>{
  assert.equal(classify('A musician rehearses a new jazz album','Music and guitar performances',{name:'AI Newspaper'}).lane,'human');
  assert.equal(classify('Artificial intelligence replaces painting work','Artists discuss AI losing commissions',{essays:true}).lane,'ai');
  assert.equal(classify('Office announcements','Company meeting tomorrow',{}).lane,null);
  assert.equal(classify('A deal to make more money','This makes no sense to me',{}).lane,null);
  assert.equal(classify('NVIDIA financing','The consortium is raising money',{}).lane,null);
  assert.equal(classify('Humyn Labs raises a $40m Series A','The AI startup announced a venture funding round led by investors.',{}).lane,null);
  assert.equal(classify('Startup funding promises to automate jobs','Investors led a Series A venture funding round for the AI company.',{}).lane,null);
  assert.equal(classify('New luxury residence opens beside the river','A property developer presents its architecture showroom and real estate project.',{}).lane,null);
  assert.equal(classify('How many carbohydrates should runners eat?','A nutrition guide recommends calories, supplements and a training plan.',{}).lane,null);
  assert.equal(classify('大模型怎样影响小说写作','作者们讨论人工智能对创作的影响').lane,'ai');
  assert.equal(classify('Meet the National Book Award finalists','A short announcement.',{id:'literary-hub'}).lane,null);
  assert.deepEqual(classify('Tara Cunningham – Warm Ground','A record review.',{id:'quietus',essays:true}),{lane:'human',subject:'music'});
  assert.equal(classify('Trump DOJ Folds, Agrees To Permanent Ban On Censoring ICE Tracking Group And App','The case concerns social media companies and government speech policy.',{id:'techdirt'}).lane,null);
  assert.equal(classify('The End Of Copyright-Locked Software','AI clean-room tools and Claude change how software can be rebuilt, with consequences for copyright.',{id:'techdirt'}).lane,'ai');
  assert.equal(classify('A facial recognition system changes public workers’ privacy','The automated decision affects workers and privacy rights.',{id:'techdirt'}).lane,'ai');
  assert.equal(classify('Election campaign launches today','Candidates debate the future of the country.',{}).lane,null);
  assert.equal(classify('Neighbours build a mutual-aid garden','Volunteers support families through a difficult winter.',{}).lane,'human');
  assert.equal(classify('AI mentioned in a company announcement','A company has a meeting tomorrow.',{}).lane,null);
  assert.equal(classify('A lab publishes AI research','A report documents a new benchmark for model capabilities.',{}).lane,'ai');
  assert.equal(classify('An AI lab launches a model with new reasoning capabilities','A report documents the release and benchmark results.',{}).lane,'ai');
  assert.equal(classify('I learned to climb after an injury','A personal account of recovery, training and returning to a mountain route.',{}).lane,'human');
  assert.equal(classify('A photographer documents a changing shoreline','A reported account follows the artist’s fieldwork and photographs over a decade.',{}).lane,'human');
  assert.equal(classify('An artist discusses AI tools','A detailed conversation about art, creative work and how an algorithm changes the studio.',{lane:'human',essays:true}).lane,'human');
  assert.equal(classify('An AI benchmark launches','A report documents a new model capability.',{lane:'human'}).lane,null);
});
test('headlines retain their final word and long social posts are not chopped into headlines',()=>{
  const [rss]=fromRss('<rss><channel><item><title>Trump DOJ Folds, Agrees To Permanent Ban On Censoring ICE Tracking Group And App</title><link>https://example.org/a</link><description>AI policy and the impact on people and culture gives this feed item enough source text for a focused classification.</description></item></channel></rss>',source);
  assert.equal(rss.title,'Trump DOJ Folds, Agrees To Permanent Ban On Censoring ICE Tracking Group And App');
  const post={author:{handle:'writer.test',did:'did:plc:abc',displayName:'A Writer'},uri:'at://did:plc:abc/app.bsky.feed.post/xyz',record:{text:'This is a deliberately long social post without a concluding sentence '.repeat(6),createdAt:'2026-11-13T10:00Z'}};
  const [social]=fromBluesky(JSON.stringify({feed:[{post}]}),{handle:'writer.test'});
  assert.match(social.title,/…$/);assert.ok(social.title.length<=181);
});
test('source prefixes and quoted Bluesky link previews use clean publisher headlines',()=>{
  const [rss]=fromRss('<rss><channel><item><title>Lawfare Daily: Aya Ibrahim on Progressive Priorities for the New Democratic Congress</title><link>https://example.org/lawfare</link><description>A detailed discussion of artificial intelligence policy and public life with enough source text for selection.</description></item></channel></rss>',{...source,title_prefixes:['Lawfare Daily']});
  assert.equal(rss.title,'Aya Ibrahim on Progressive Priorities for the New Democratic Congress');
  const post={author:{handle:'anildash.com',did:'did:plc:dash',displayName:'Anil Dash'},uri:'at://did:plc:dash/app.bsky.feed.post/example',record:{text:'sf.gazetteer.co/theyve-pickl... From January: "These guys like Thiel have been fixated for 30 years on trying to normalize slurs."',createdAt:'2026-11-16T17:53:57.950Z'},embed:{media:{external:{uri:'https://sf.gazetteer.co/theyve-pickled-each-others-brains',title:'‘They’ve pickled each others’ brains’',description:'A long interview about technology and culture.',thumb:'https://cdn.bsky.app/img/feed_thumbnail/plain/did:example/thumb'}}}};
  const [shared]=fromBluesky(JSON.stringify({feed:[{post}]}),{handle:'anildash.com'});
  assert.equal(shared.title,'‘They’ve pickled each others’ brains’');assert.equal(shared.url,'https://sf.gazetteer.co/theyve-pickled-each-others-brains');assert.match(shared.image_url,/cdn\.bsky\.app/);
});
test('a stricter re-fetch retires a formerly accepted card from its live lane',async()=>{
  const db=database(),old=story(81,{source_id:'techdirt',source:'Techdirt',lane:'ai',subject:'digital'});
  await storeItems(db,{...source,id:'techdirt',name:'Techdirt'},[old],now);
  await suppressItems(db,{id:'techdirt'},[old.url],now+1);
  assert.equal((await db.prepare('SELECT lane FROM stories WHERE url=?').bind(old.url).first()).lane,null);
});
test('social share date is never an article date; distinctive commentary keeps its own author and permalink',()=>{
  const post={author:{handle:'writer.test',did:'did:plc:abc',displayName:'A Writer'},uri:'at://did:plc:abc/app.bsky.feed.post/xyz',record:{text:'Worth a read',createdAt:'2026-11-13T10:00Z'},embed:{external:{uri:'https://example.org/2020/article',title:'AI and the artist',description:'An account of creative work'}}};
  const parse=p=>fromBluesky(JSON.stringify({feed:[{post:p}]}),{handle:'writer.test'});
  const [share]=parse(post);assert.equal(share.original_published_at,null);assert.equal(share.author,null);assert.equal(share.content_type,'shared-article');
  const [comment]=parse({...post,record:{...post.record,text:'I worked on this painting every morning and kept returning to the light falling across the room. The process helped me see how the colors changed throughout the day.'}});
  assert.match(comment.url,/bsky.app/);assert.equal(comment.author,'A Writer');assert.equal(comment.canonical_url,'https://example.org/2020/article');
  assert.equal(fromBluesky(JSON.stringify({feed:[{post,reason:{}},{post,reply:{}}]}),{handle:'writer.test'}).length,0);
});
test('shortener resolution stops at destination and rejects private redirects',async()=>{
  let calls=0;assert.equal(await resolveShortLink('https://t.co/abc',async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://example.org/a?utm_source=social'}});}), 'https://example.org/a');assert.equal(calls,1);
  assert.equal(await resolveShortLink('https://t.co/abc',async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/'}})),'https://t.co/abc');
});
test('40-item ingestion stays under D1 limits; edits invalidate translations without changing discovery',async()=>{
  const db=database();const items=await Promise.all(Array.from({length:40},async(_,i)=>{const s=story(i);s.content_hash=await contentHash(s);return s;}));
  await storeItems(db,source,items,now);assert.ok(db.maxBinds<=100);assert.ok(db.queries<20);assert.equal(db.sql.prepare('SELECT count(*) AS n FROM stories').get().n,40);
  db.sql.prepare('UPDATE stories SET title_zh=? WHERE url=?').run('旧译文',items[0].url);
  const changed={...items[0],title:'A new guitar recording'};changed.content_hash=await contentHash(changed);
  await storeItems(db,source,[changed],now+5000);const stored=await db.prepare('SELECT * FROM stories WHERE url=?').bind(changed.url).first();
  assert.equal(stored.discovered_at,now);assert.equal(stored.title_zh,null);assert.equal(stored.content_hash,changed.content_hash);
  await storeItems(db,{...source,kind:'bluesky',name:'Sharer'},[{...changed,original_published_at:null}],now+10000);
  assert.equal((await db.prepare('SELECT * FROM stories WHERE url=?').bind(changed.url).first()).author,'Leah');
});
test('unsupported notes fail deterministic validation and source comparison',()=>{
  const s=story(),valid=note(s);assert.equal(validateNote(valid,s),true);assert.equal(usableText({...s,excerpt:s.title}),false);
  for(const mutate of [n=>n.claims[0].evidence='invented supporting passage',n=>n.claims[0].en+=' There were 999 musicians.',n=>n.zh.title='English only',n=>n.url='https://other.org',n=>n.entities[0].source='Someone absent']){const output=structuredClone(valid);mutate(output);assert.equal(validateNote(output,s),false);}
  assert.equal(approved({...review,names:false}),false);
});
test('retention bounds stories and edition snapshots independently',async()=>{
  const db=database();await storeItems(db,source,[story(1),story(2,{lane:'ai'})],now-8*86400000);
  for(let i=0;i<55;i++)db.sql.prepare('INSERT INTO editions VALUES(?,?,?,?,?,NULL)').run(String(i),'daily',String(i).padStart(3,'0'),now,'{}');
  for(let i=0;i<55;i++)db.sql.prepare('INSERT INTO rhythm_audits VALUES(?,?,?,?,?)').run(String(i).padStart(3,'0'),1,'{}',now,now);
  await prune({DB:db,MAX_STORIES:'1000'},now);assert.equal(db.sql.prepare('SELECT count(*) AS n FROM stories').get().n,1);assert.equal(db.sql.prepare('SELECT count(*) AS n FROM editions').get().n,50);assert.equal(db.sql.prepare('SELECT count(*) AS n FROM rhythm_audits').get().n,50);
});
