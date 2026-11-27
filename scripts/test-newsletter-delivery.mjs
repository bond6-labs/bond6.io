// Owner-only delivery rehearsal using an in-memory database. No credentials,
// addresses, confirmation tokens, or subscription records are written to disk.
import { stdin, stdout } from 'node:process';
import { database } from '../test/db.js';
import { sources } from '../src/sources.js';
import { fromRss, storeItems } from '../src/ingest.js';
import { contentHash, storyFocusKeys } from '../src/content.js';
import { subscribeRequest, confirmation, digestStep, unsubscribe } from '../src/newsletter.js';

if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') { console.error('Run this command in an interactive terminal.');process.exit(1); }
stdout.write('Paste your Resend API key (input hidden), then press Enter: ');
stdin.setRawMode(true);stdin.resume();stdin.setEncoding('utf8');
const key=await new Promise((resolve,reject)=>{
  let value='';stdin.on('data',function onData(chunk){for(const ch of chunk){
    if(ch==='\u0003'){stdin.setRawMode(false);stdin.pause();reject(new Error('Cancelled'));return;}
    if(ch==='\r'||ch==='\n'){stdin.removeListener('data',onData);stdin.setRawMode(false);stdin.pause();stdout.write('\n');resolve(value.trim());return;}
    if(ch==='\u007f'||ch==='\b')value=value.slice(0,-1);else value+=ch;
  }});
});
if(!key){console.error('No key entered.');process.exit(1);}
const db=database(),now=Date.now(),secret=crypto.randomUUID()+crypto.randomUUID();
const env={DB:db,EMAIL_SUBSCRIPTIONS:'true',EMAIL_DIGESTS:'true',RESEND_API_KEY:key,EMAIL_TOKEN_SECRET:secret};
const nativeFetch=globalThis.fetch;const messages=[];const statuses=[];
try {
  const source=sources.find(s=>s.id==='guardian-culture');
  const feed=await nativeFetch(source.url,{signal:AbortSignal.timeout(10000)});
  if(!feed.ok)throw new Error('The public sample feed could not be read.');
  // Match the stored record: topic classification depends on source_id.
  const sample=fromRss(await feed.text(),source).map(s=>({...s,source_id:source.id})).find(s=>s.lane==='human'&&s.image_url&&s.excerpt?.length>=80&&storyFocusKeys(s).some(k=>!k.startsWith('event:')));
  if(!sample)throw new Error('No qualifying illustrated sample is currently available.');
  globalThis.fetch=async(url,options)=>{const payload=JSON.parse(options.body);messages.push(payload);const response=await nativeFetch(url,options);statuses.push(response.status);return response;};
  const signup=new Request('https://bond6.io/email/subscribe',{method:'POST',headers:{origin:'https://bond6.io','content-type':'application/json'},body:JSON.stringify({email:'bond6daily@gmail.com',language:'en',frequency:'daily'})});
  await subscribeRequest(signup,env,now);
  const confirmLink=messages[0]?.html.match(/https:\/\/bond6\.io\/email\/confirm\?token=[a-f0-9]+/)?.[0];
  if(!confirmLink)throw new Error('Confirmation email was not prepared.');
  const confirmed=await confirmation(new Request(confirmLink,{method:'POST',headers:{origin:'https://bond6.io'}}),env,now+1);
  if(!confirmed.ok)throw new Error('Local confirmation failed.');
  // Confirmation and digest are two separate API requests; space them out to
  // avoid short provider rate-limit windows during the interactive rehearsal.
  await new Promise(resolve=>setTimeout(resolve,1500));
  sample.content_hash=await contentHash(sample);
  await storeItems(db,source,[sample],now-1000);
  // The private in-memory rehearsal supplies a synthetic reader signal; it
  // does not assert that this topic is currently trending on the live site.
  db.sql.prepare('INSERT INTO metrics(day,event,count) VALUES(?,?,?)').run(new Date(now).toISOString().slice(0,10),'focus:'+storyFocusKeys(sample).find(k=>!k.startsWith('event:')),3);
  // Every rehearsal uses a fresh in-memory secret and payload. Isolate it
  // from prior rehearsals and live sends in Resend's idempotency window.
  await digestStep(env,now+2,{testNamespace:'rehearsal-'+crypto.randomUUID()});
  const digest=messages[1];if(!digest)throw new Error('No digest was prepared for the sample story; no digest was sent to Resend.');
  if(db.sql.prepare('SELECT status FROM email_outbox').get()?.status!=='sent')throw new Error(`Resend did not accept the digest (HTTP ${statuses[1]??'unknown'}).`);
  const unsubscribeLink=digest.html.match(/https:\/\/bond6\.io\/email\/unsubscribe\?token=[a-f0-9]+/)?.[0];
  if(!unsubscribeLink)throw new Error('Unsubscribe link missing.');
  await unsubscribe(new Request(unsubscribeLink,{method:'POST'}),env,now+3);
  if(db.sql.prepare('SELECT status FROM email_subscribers').get()?.status!=='unsubscribed')throw new Error('Local unsubscribe failed.');
  console.log('Resend accepted the requests; the in-memory confirmation and unsubscribe checks passed.');
  console.log('Check your inbox for two test emails. Their bond6.io links are not live yet.');
}catch(error){console.error('Rehearsal failed:',error.message);process.exitCode=1;}
finally{globalThis.fetch=nativeFetch;db.sql.close();}
