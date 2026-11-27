import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './db.js';
import {subscribeRequest,confirmation,unsubscribe,digestStep,digestHtml} from '../src/newsletter.js';
import {storeItems} from '../src/ingest.js';
import {story,source} from './fixtures.js';
test('private pilot accepts only the owner and does not send scheduled digests',async()=>{
  const db=database(),env={DB:db,EMAIL_PRIVATE_PILOT:'true',RESEND_API_KEY:'test',EMAIL_TOKEN_SECRET:'test-secret'},now=Date.parse('2026-11-27T12:00:00Z');
  const original=globalThis.fetch;let sent=[];globalThis.fetch=async (_url,init)=>{sent.push(JSON.parse(init.body));return new Response('{}',{status:200});};
  const request=email=>new Request('https://bond6.io/email/subscribe',{method:'POST',headers:{origin:'https://bond6.io','content-type':'application/json'},body:JSON.stringify({email,language:'en',frequency:'daily'})});
  try{assert.equal((await subscribeRequest(request('other@example.org'),env,now)).status,503);assert.equal(sent.length,0);assert.equal((await subscribeRequest(request('bond6daily@gmail.com'),env,now)).status,200);assert.equal(sent.length,1);await digestStep(env,now);assert.equal(sent.length,1);}finally{globalThis.fetch=original;db.sql.close();}
});
test('email cards include source attribution and safe illustrated previews',()=>{
  const html=digestHtml([story(1,{image_url:'https://cdn.example.org/art.jpg',title:'A creative <story>'})],'en','https://bond6.io/email/unsubscribe?token=test');
  assert.match(html,/cdn\.example\.org\/art\.jpg/);assert.match(html,/A creative &lt;story&gt;/);assert.match(html,/Image from Studio/);assert.match(html,/Human Pulse/);
  const noImage=digestHtml([story(2,{image_url:'javascript:alert(1)'})],'zh','https://bond6.io/');assert.doesNotMatch(noImage,/<img/);assert.match(noImage,/人文脉动/);
});
test('digest does not send a recent item without a qualifying focusing signal',async()=>{
  const db=database(),env={DB:db,EMAIL_SUBSCRIPTIONS:'true',EMAIL_DIGESTS:'true',RESEND_API_KEY:'test',EMAIL_TOKEN_SECRET:'test-secret'},now=Date.parse('2026-11-27T12:00:00Z');
  const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}',{status:200});};
  try{await storeItems(db,source,[story(911,{original_published_at:now-1000})],now-1000);db.sql.prepare("INSERT INTO email_subscribers(email,language,frequency,status,unsubscribe_hash,updated_at) VALUES(?,?,?,'active',?,?)").run('reader@example.org','en','daily','hash',now);await digestStep(env,now);assert.equal(calls,0);}finally{globalThis.fetch=original;}
});

test('subscription requires confirmation, prevents scanner unsubscribe, and stops sending after unsubscribe',async()=>{
  const db=database(),env={DB:db,EMAIL_SUBSCRIPTIONS:'true',EMAIL_DIGESTS:'true',RESEND_API_KEY:'test',EMAIL_TOKEN_SECRET:'test-secret'},now=Date.parse('2026-11-27T12:00:00Z');
  const original=globalThis.fetch;let sent=[];globalThis.fetch=async (_url,init)=>{sent.push(JSON.parse(init.body));return new Response('{}',{status:200});};
  try{
    const request=new Request('https://bond6.io/email/subscribe',{method:'POST',headers:{origin:'https://bond6.io','content-type':'application/json'},body:JSON.stringify({email:'reader@example.org',language:'en',frequency:'weekly'})});
    assert.equal((await subscribeRequest(request,env,now)).status,200);assert.equal(sent.length,1);
    const confirm=sent[0].html.match(/https:\/\/bond6\.io\/email\/confirm\?token=[a-f0-9]+/)[0];
    assert.equal((await confirmation(new Request(confirm),env,now)).status,200);
    assert.equal(db.sql.prepare('SELECT status FROM email_subscribers').get().status,'pending');
    assert.equal((await confirmation(new Request(confirm,{method:'POST',headers:{origin:'null','sec-fetch-site':'cross-site'}}),env,now)).status,403);
    assert.equal((await confirmation(new Request(confirm,{method:'POST',headers:{origin:'null','sec-fetch-site':'same-origin'}}),env,now)).status,200);
    assert.equal(db.sql.prepare('SELECT status FROM email_subscribers').get().status,'active');
    await digestStep(env,now);assert.equal(sent.length,1);
    const secret=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.EMAIL_TOKEN_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const bytes=await crypto.subtle.sign('HMAC',secret,new TextEncoder().encode('unsubscribe:reader@example.org'));
    const token=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
    const link='https://bond6.io/email/unsubscribe?token='+token;
    await unsubscribe(new Request(link),env,now);assert.equal(db.sql.prepare('SELECT status FROM email_subscribers').get().status,'active');
    await unsubscribe(new Request(link,{method:'POST'}),env,now);assert.equal(db.sql.prepare('SELECT status FROM email_subscribers').get().status,'unsubscribed');
  }finally{globalThis.fetch=original;}
});
test('daily digest is delivered once and carries unsubscribe headers',async()=>{
  const db=database(),env={DB:db,EMAIL_SUBSCRIPTIONS:'true',EMAIL_DIGESTS:'true',RESEND_API_KEY:'test',EMAIL_TOKEN_SECRET:'test-secret'},now=Date.parse('2026-11-27T12:00:00Z');
  const original=globalThis.fetch;const sent=[];globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(init.body));return new Response('{}',{status:200});};
  try{
    const article=story(910,{original_published_at:now-1000,discovered_at:now-1000});await storeItems(db,source,[article],now-1000);
    db.sql.prepare('INSERT INTO metrics(day,event,count) VALUES(?,?,?)').run('2026-11-27','focus:independent-music',3);
    db.sql.prepare("INSERT INTO email_subscribers(email,language,frequency,status,unsubscribe_hash,updated_at) VALUES(?,?,?,'active',?,?)").run('reader@example.org','en','daily','hash',now);
    await digestStep(env,now);await digestStep(env,now+300000);
    assert.equal(sent.length,1);assert.match(sent[0].html,/example.org\/music\/910/);assert.equal(sent[0].headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');
  }finally{globalThis.fetch=original;}
});
test('provider failures allow retry and active subscribers cannot be overwritten',async()=>{
  const db=database(),env={DB:db,EMAIL_SUBSCRIPTIONS:'true',RESEND_API_KEY:'test',EMAIL_TOKEN_SECRET:'test-secret'},now=Date.parse('2026-11-27T12:00:00Z');
  const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('',{status:503});};
  const request=()=>new Request('https://bond6.io/email/subscribe',{method:'POST',headers:{origin:'https://bond6.io','content-type':'application/json'},body:JSON.stringify({email:'reader@example.org',language:'en',frequency:'daily'})});
  try{
    await subscribeRequest(request(),env,now);await subscribeRequest(request(),env,now+1);assert.equal(calls,2);
    db.sql.prepare("UPDATE email_subscribers SET status='active',language='zh',frequency='weekly'").run();
    await subscribeRequest(request(),env,now+7200000);
    const subscriber=db.sql.prepare('SELECT status,language,frequency FROM email_subscribers').get();
    assert.deepEqual({...subscriber},{status:'active',language:'zh',frequency:'weekly'});assert.equal(calls,3);
  }finally{globalThis.fetch=original;}
});
test('weekly Chinese digest runs only on Sunday and respects the daily budget',async()=>{
  const db=database(),env={DB:db,EMAIL_SUBSCRIPTIONS:'true',EMAIL_DIGESTS:'true',RESEND_API_KEY:'test',EMAIL_TOKEN_SECRET:'test-secret'},sunday=Date.parse('2026-11-29T12:00:00Z');
  const original=globalThis.fetch;const sent=[];globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(init.body));return new Response('{}',{status:200});};
  try{
    const article=story(920,{title:'一位音乐人记录自己的创作故事',excerpt:'这位音乐人讲述创作音乐和录制歌曲的过程，以及她如何在工作室中与朋友一起完成专辑。',original_lang:'zh',original_published_at:sunday-1000});
    await storeItems(db,source,[article],sunday-1000);
    db.sql.prepare('INSERT INTO metrics(day,event,count) VALUES(?,?,?)').run('2026-11-28','focus:independent-music',3);
    db.sql.prepare("INSERT INTO email_subscribers(email,language,frequency,status,unsubscribe_hash,updated_at) VALUES(?,?,?,'active',?,?)").run('weekly@example.org','zh','weekly','hash',sunday-1000);
    await digestStep(env,sunday-86400000);assert.equal(sent.length,0);
    db.sql.prepare('INSERT INTO email_send_budget(day,sends) VALUES(?,80)').run('2026-11-29');
    await digestStep(env,sunday);assert.equal(sent.length,0);
    db.sql.prepare('UPDATE email_send_budget SET sends=0').run();
    await digestStep(env,sunday+300000);assert.equal(sent.length,1);assert.match(sent[0].html,/音乐人/);
  }finally{globalThis.fetch=original;}
});
test('overlapping digest jobs claim each message only once',async()=>{
  const db=database(),env={DB:db,EMAIL_SUBSCRIPTIONS:'true',EMAIL_DIGESTS:'true',RESEND_API_KEY:'test',EMAIL_TOKEN_SECRET:'test-secret'},now=Date.parse('2026-11-27T12:00:00Z');
  const original=globalThis.fetch;let sent=0;globalThis.fetch=async()=>{sent++;return new Response('{}',{status:200});};
  try{
    await storeItems(db,source,[story(930,{original_published_at:now-1000})],now-1000);
    db.sql.prepare('INSERT INTO metrics(day,event,count) VALUES(?,?,?)').run('2026-11-27','focus:independent-music',3);
    db.sql.prepare("INSERT INTO email_subscribers(email,language,frequency,status,unsubscribe_hash,updated_at) VALUES(?,?,?,'active',?,?)").run('reader@example.org','en','daily','hash',now);
    await Promise.all([digestStep(env,now),digestStep(env,now)]);assert.equal(sent,1);
  }finally{globalThis.fetch=original;}
});
test('existing subscriber changes preferences only after new confirmation',async()=>{
  const db=database(),env={DB:db,EMAIL_SUBSCRIPTIONS:'true',RESEND_API_KEY:'test',EMAIL_TOKEN_SECRET:'test-secret'},now=Date.parse('2026-11-27T12:00:00Z');
  const original=globalThis.fetch;const sent=[];globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(init.body));return new Response('{}',{status:200});};
  try{
    db.sql.prepare("INSERT INTO email_subscribers(email,language,frequency,status,unsubscribe_hash,updated_at) VALUES(?,?,?,'active',?,?)").run('reader@example.org','en','daily','hash',now-7200000);
    const request=new Request('https://bond6.io/email/subscribe',{method:'POST',headers:{origin:'https://bond6.io','content-type':'application/json'},body:JSON.stringify({email:'reader@example.org',language:'zh',frequency:'weekly'})});
    await subscribeRequest(request,env,now);
    assert.equal(db.sql.prepare('SELECT frequency FROM email_subscribers').get().frequency,'daily');
    const link=sent[0].html.match(/https:\/\/bond6\.io\/email\/confirm\?token=[a-f0-9]+/)[0];
    await confirmation(new Request(link,{method:'POST',headers:{origin:'https://bond6.io'}}),env,now+1);
    const row=db.sql.prepare('SELECT language,frequency FROM email_subscribers').get();assert.deepEqual({...row},{language:'zh',frequency:'weekly'});
  }finally{globalThis.fetch=original;}
});
