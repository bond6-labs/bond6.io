import test from 'node:test';
import assert from 'node:assert/strict';
import {fromRss,fromBluesky,storeItems,resolveShortLink,prune} from '../src/ingest.js';
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
test('unsafe URLs and document declarations are rejected',()=>{
  for(const url of ['javascript:alert(1)','http://127.0.0.1/a','https://name:password@example.org'])assert.equal(canonical(url),null);
  assert.throws(()=>fromRss('<!DOCTYPE x><rss/>',source));
});
test('classification follows content, not publication names',()=>{
  assert.equal(classify('The new jazz album','Music and guitar performances',{name:'AI Newspaper'}).lane,'human');
  assert.equal(classify('Artificial intelligence changes painting','Artists discuss AI',{essays:true}).lane,'ai');
  assert.equal(classify('Office announcements','Company meeting tomorrow',{}).lane,null);
  assert.equal(classify('A deal to make more money','This makes no sense to me',{}).lane,null);
  assert.equal(classify('NVIDIA financing','The consortium is raising money',{}).lane,null);
  assert.equal(classify('大模型怎样影响小说写作','作者们讨论人工智能对创作的影响').lane,'ai');
  assert.deepEqual(classify('Meet the National Book Award finalists','A short announcement.',{id:'literary-hub'}),{lane:'human',subject:'writing'});
  assert.deepEqual(classify('Tara Cunningham – Warm Ground','A record review.',{id:'quietus'}),{lane:'human',subject:'music'});
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
