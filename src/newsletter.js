import { esc } from './render.js';
import { classify, publicExcerpt, restrictedStory, conversations, storyFocusKeys } from './content.js';
import { sources, retiredSourceIds } from './sources.js';
import { distinctStories } from './editorial.js';

const day=now=>new Date(now).toISOString().slice(0,10);
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const hash=async text=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
const token=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const enabled=env=>(env.EMAIL_SUBSCRIPTIONS==='true'||env.EMAIL_PRIVATE_PILOT==='true')&&!!env.RESEND_API_KEY&&!!env.EMAIL_TOKEN_SECRET;
const reply=(message,status=200)=>new Response(message,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export function welcomeEmail(language,frequency,url){
  const zh=language==='zh';
  const subject=zh?'欢迎来到 Bond6，请确认订阅':'Welcome to Bond6 — please confirm your subscription';
  const heading=zh?'欢迎来到 Bond6':'Welcome to Bond6';
  const intro=zh?'感谢您加入 Bond6。很高兴与您一起，探索人类创造力与 AI 浪潮交汇的世界。':'Thank you for joining Bond6. We’re delighted to welcome you to a place where human creativity and the AI wave come together.';
  const mission=zh?'AI 正在以前所未有的速度改变我们工作、创作与生活的方式。与此同时，艺术、文字、音乐和人与人之间的关怀，依然提醒着我们人类体验的珍贵。Bond6 希望汇聚这两股力量，让值得关注的变化与值得珍惜的人文故事并肩呈现。':'AI is changing how we work, create, and live at extraordinary speed. At the same time, art, writing, music, and the care we share remind us of the richness of human experience. Bond6 brings these worlds together, connecting the developments shaping our future with the human stories worth holding close.';
  const details=zh?`确认后，你将${frequency==='daily'?'每日':'每周'}收到一封简短的阅读摘要，精选人文创作与 AI 影响相关故事，附上原文链接。符合条件的内容较少时，我们可能少发或不发。`:`Once confirmed, you’ll receive a ${frequency} reading digest with a short selection of stories about human creativity and the impact of AI, with links to the original sources. When there isn’t enough suitable material, we may send fewer stories or skip an edition.`;
  const action=zh?'确认订阅':'Confirm subscription';
  const note=zh?'如非本人申请，请忽略此邮件。确认后可随时通过摘要中的链接退订。':'If you didn’t request this, simply ignore this email. After confirming, you can unsubscribe using the link in any digest.';
  const html=`<!doctype html><html lang="${zh?'zh-Hans':'en'}"><body style="margin:0;background:#f6f3ec;color:#24211d"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf9"><tr><td style="padding:28px;border-top:3px solid #b76a39;font:16px/1.65 Arial,sans-serif"><a href="https://bond6.io${zh?'/zh/':'/'}" style="font-weight:700;font-size:22px;color:#24211d;text-decoration:none">Bond<span style="color:#bc6634">6</span><span style="color:#287989">.io</span></a><h1 style="font:700 26px/1.25 Georgia,serif;margin:24px 0 14px">${heading}</h1><p>${intro}</p><p>${mission}</p><p>${details}</p><p style="margin:26px 0"><a href="${esc(url)}" style="display:inline-block;background:#286c78;color:white;text-decoration:none;padding:12px 20px;border-radius:3px;font-weight:700">${action}</a></p><p style="font-size:13px;color:#655e55">${note}</p><p style="font-size:13px;color:#655e55">${zh?'我们使用您的邮箱及订阅偏好发送摘要；Cloudflare 保存订阅数据，Resend 负责邮件发送。':'We use your email address and preferences to send the digest. Cloudflare stores subscription data, and Resend delivers the emails.'} <a href="https://bond6.io${zh?'/zh/about':'/about'}#email-privacy">${zh?'隐私说明':'Privacy notice'}</a> · <a href="mailto:info@bond6.io">info@bond6.io</a></p><p style="font-size:14px;color:#655e55">${zh?'诚挚问候，<br>Bond6 编辑团队':'With appreciation,<br>The Bond6 Editorial Team'}</p></td></tr></table></td></tr></table></body></html>`;
  return {subject,html};
}
export function digestHtml(stories,language,link){
  const zh=language==='zh';
  const cards=stories.map(s=>{
    const human=s.lane==='human',color=human?'#805032':'#226779',background=human?'#f3eadf':'#e8f2f2';
    const label=human?(zh?'人文脉动':'Human Pulse'):(zh?'AI 冲击波':'AI Wave');
    const description=restrictedStory(s)?(zh?'订阅内容，请前往原站阅读。':'Subscription required at the original source.'):publicExcerpt(s.excerpt||'',160);
    let image='';try{const u=new URL(s.image_url);if(u.protocol==='https:'&&!restrictedStory(s))image=`<tr><td style="padding:0 20px 8px"><a href="${esc(s.url)}"><img src="${esc(u.href)}" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0"></a><p style="margin:5px 0 0;color:#655e55;font:11px Arial,sans-serif">${zh?'图片来自':'Image from'} ${esc(s.source)}</p></td></tr>`;}catch{/* A card can have no image. */}
    return `<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${background};border-top:2px solid ${color}"><tr><td style="padding:18px 20px 10px"><p style="margin:0 0 7px;color:${color};font:700 11px Arial,sans-serif;letter-spacing:1px">${label}</p>${s.digest_focus?`<p style="margin:0 0 7px;color:#655e55;font:12px/1.4 Arial,sans-serif">${esc(zh?s.digest_focus.zh:s.digest_focus.en)}</p>`:''}<h2 style="margin:0 0 9px;font:normal 22px/1.3 Georgia,'Noto Serif SC',serif"><a href="${esc(s.url)}" style="color:#201e1a;text-decoration:none">${esc(s.title)}</a></h2><p style="margin:0 0 10px;color:#514d47;font:14px/1.6 Arial,sans-serif">${esc(description)}</p><p style="margin:0;color:#655e55;font:12px/1.4 Arial,sans-serif">${esc(s.author&&s.author!==s.source?s.author+' · '+s.source:s.source)}</p></td></tr>${image}</table></td></tr>`;
  }).join('');
  return `<!doctype html><html lang="${zh?'zh-Hans':'en'}"><body style="margin:0;background:#f6f3ec;color:#201e1a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3ec"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px"><tr><td style="padding:0 0 20px;border-bottom:1px solid #d8d0c4"><a href="https://bond6.io${zh?'/zh/':'/'}" style="font:700 25px Arial,sans-serif;text-decoration:none;color:#222">Bond<span style="color:#bc6634">6</span><span style="color:#287989">.io</span></a><p style="margin:8px 0 0;color:#655e55;font:13px Arial,sans-serif">${zh?'人文与 AI 浪潮，并肩呈现。':'Human culture and the AI wave, always in motion.'}</p></td></tr><tr><td style="padding:22px 0 12px"><h1 style="margin:0;font:700 23px Georgia,serif">${zh?'Bond6 阅读摘要':'Your Bond6 reading digest'}</h1></td></tr>${cards}<tr><td style="padding:12px 0;color:#655e55;font:12px/1.6 Arial,sans-serif"><a href="https://bond6.io${zh?'/zh/':'/'}" style="color:#286c78">${zh?'访问 Bond6':'Visit Bond6'}</a> · <a href="${esc(link)}" style="color:#286c78">${zh?'退订':'Unsubscribe'}</a><br><a href="https://bond6.io${zh?'/zh/about':'/about'}#email-privacy" style="color:#286c78">${zh?'隐私说明':'Privacy notice'}</a> · <a href="mailto:info@bond6.io" style="color:#286c78">info@bond6.io</a><br>${zh?'摘要链接至第三方内容；观点属于原作者。':'Digest links lead to third-party content; views belong to the original authors.'}</td></tr></table></td></tr></table></body></html>`;
}
async function unsubscribeToken(secret,email){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('unsubscribe:'+email)));
}
async function allowRequest(db,secret,ip,now){
  const bucket=await hash(secret+'|'+day(now)+'|'+ip);
  const result=await db.prepare(`INSERT INTO email_request_limits(bucket,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 WHERE attempts<5`).bind(bucket,now+2*86400000).run();
  return Number(result.meta.changes)>0;
}
async function reserve(db,now){
  const result=await db.prepare(`INSERT INTO email_send_budget(day,sends) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET sends=sends+1 WHERE sends<80`).bind(day(now)).run();
  return Number(result.meta.changes)>0;
}
async function send(env,payload,id){
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify(payload)});
  return response.ok;
}
export async function subscribeRequest(request,env,now=Date.now()){
  if(!enabled(env))return reply('Email subscriptions are not available yet.',503);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply('Forbidden',403);
  const length=Number(request.headers.get('content-length')||0);if(length>2048)return reply('Request too large',413);
  let input;try{const reader=request.body?.getReader();if(!reader)return reply('Invalid request',400);let raw='',size=0;const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return reply('Request too large',413);}raw+=decoder.decode(value,{stream:true});}input=JSON.parse(raw+decoder.decode());}catch{return reply('Invalid request',400);}
  const email=String(input.email||'').trim().toLowerCase(),language=input.language,frequency=input.frequency;
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['en','zh'].includes(language)||!['daily','weekly'].includes(frequency))return reply('Invalid subscription details',400);
  if(env.EMAIL_SUBSCRIPTIONS!=='true'&&(env.EMAIL_PRIVATE_PILOT!=='true'||email!=='bond6daily@gmail.com'))return reply('Email subscriptions are not available yet.',503);
  if(!await allowRequest(env.DB,env.EMAIL_TOKEN_SECRET,request.headers.get('CF-Connecting-IP')||'unknown',now))return reply('If eligible, a confirmation email will be sent.');
  const existing=await env.DB.prepare('SELECT status,updated_at FROM email_subscribers WHERE email=?').bind(email).first();
  if(existing&&now-existing.updated_at<3600000)return reply('If eligible, a confirmation email will be sent.');
  if(!await reserve(env.DB,now))return reply('If eligible, a confirmation email will be sent.');
  const confirmation=token(),unsub=await unsubscribeToken(env.EMAIL_TOKEN_SECRET,email);
  const confirmationHash=await hash(confirmation);
  const saved=await env.DB.prepare(`INSERT INTO email_subscribers(email,language,frequency,status,confirm_hash,confirm_expires,unsubscribe_hash,updated_at,pending_language,pending_frequency) VALUES(?,?,?,'pending',?,?,?,?,?,?)
    ON CONFLICT(email) DO UPDATE SET status=CASE WHEN email_subscribers.status='active' THEN 'active' ELSE 'pending' END,confirm_hash=excluded.confirm_hash,confirm_expires=excluded.confirm_expires,unsubscribe_hash=excluded.unsubscribe_hash,updated_at=excluded.updated_at,pending_language=excluded.pending_language,pending_frequency=excluded.pending_frequency WHERE email_subscribers.updated_at<=?`).bind(email,language,frequency,confirmationHash,now+86400000,await hash(unsub),now,language,frequency,now-3600000).run();
  if(!saved.meta.changes)return reply('If eligible, a confirmation email will be sent.');
  const url='https://bond6.io/email/confirm?token='+confirmation;
  const payload={from:'Bond6 <digest@bond6.io>',to:[email],...welcomeEmail(language,frequency,url)};
  let sent=false;try{sent=await send(env,payload,'confirm/'+confirmationHash);}catch{/* Provider failures allow a later retry. */}
  if(!sent)await env.DB.prepare('UPDATE email_subscribers SET updated_at=?,confirm_hash=NULL,confirm_expires=NULL WHERE confirm_hash=?').bind(now-3600000,confirmationHash).run();
  return reply('If eligible, a confirmation email will be sent.');
}
export async function confirmation(request,env,now=Date.now()){
  if(!enabled(env))return reply('Unavailable',503);
  const raw=new URL(request.url).searchParams.get('token')||'';
  if(!/^[a-f0-9]{64}$/.test(raw))return reply('Invalid link',400);
  const digest=await hash(raw);
  if(request.method==='GET')return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width"><title>Bond6</title><script src="/email-confirm.js" defer></script></head><body><main><h1>Bond6</h1><p>Confirming your subscription… / 正在确认订阅……</p><form id="confirm-subscription" method="post"><button type="submit">Confirm subscription / 确认订阅</button></form></main></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
  // The confirmation form uses no-referrer to protect its token. Browsers may
  // consequently send Origin: null, even for this same-origin form submit.
  const origin=request.headers.get('origin');
  if(origin!==new URL(request.url).origin&&!(origin==='null'&&request.headers.get('sec-fetch-site')==='same-origin'))return reply('Forbidden',403);
  const result=await env.DB.prepare("UPDATE email_subscribers SET status='active',language=pending_language,frequency=pending_frequency,pending_language=NULL,pending_frequency=NULL,confirm_hash=NULL,confirm_expires=NULL,updated_at=? WHERE confirm_hash=? AND status IN ('pending','active') AND confirm_expires>?").bind(now,digest,now).run();
  const message=result.meta.changes?'Subscription confirmed / 订阅已确认':'Link expired or already used / 链接已失效或使用过';
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Bond6</title></head><body><main><h1>Bond6</h1><p>${message}</p><p><a href="/">Visit Bond6 / 访问 Bond6</a></p></main></body></html>`,{status:result.meta.changes?200:400,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'none'"}});
}
export async function unsubscribe(request,env,now=Date.now()){
  // Readers must retain the ability to unsubscribe even when sending is
  // paused or the email provider's credentials are temporarily unavailable.
  const raw=new URL(request.url).searchParams.get('token')||'';if(!/^[a-f0-9]{64}$/.test(raw))return reply('Invalid link',400);
  if(request.method==='GET')return new Response('<!doctype html><html><head><meta name="referrer" content="no-referrer"></head><body><h1>Bond6</h1><form method="post"><button>Unsubscribe / 退订</button></form></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; form-action 'self'; frame-ancestors 'none'"}});
  // RFC 8058 one-click POST does not carry an Origin header.
  await env.DB.prepare("UPDATE email_subscribers SET status='unsubscribed',confirm_hash=NULL,confirm_expires=NULL,pending_language=NULL,pending_frequency=NULL,updated_at=? WHERE unsubscribe_hash=?").bind(now,await hash(raw)).run();
  return reply('Unsubscribed / 已退订');
}
// Save a stable payload before sending, so provider retries are idempotent.
export async function digestStep(env,now=Date.now(),{testNamespace=''}={}){
  if(!enabled(env)||env.EMAIL_DIGESTS!=='true')return;
  const date=new Date(now),today=day(now),weekly=date.getUTCDay()===0;
  for(const language of ['en','zh'])for(const frequency of (weekly?['daily','weekly']:['daily'])){
    const edition=`${today}-${language}-${frequency}`;
    const {results:rows}=await env.DB.prepare("SELECT s.* FROM stories s WHERE s.original_lang=? AND s.lane IS NOT NULL AND s.discovered_at>=? AND NOT EXISTS (SELECT 1 FROM source_catalogue c WHERE c.id=s.source_id AND (c.state IN ('retired','paused','candidate','probation') OR c.language<>s.original_lang)) ORDER BY s.discovered_at DESC,s.url DESC LIMIT 60").bind(language,now-7*86400000).all();
    const eligible=distinctStories(rows.filter(s=>!retiredSourceIds.has(s.source_id)&&classify(s.title||'',s.excerpt||'',sources.find(x=>x.id===s.source_id)).lane===s.lane));
    const {results:interest}=await env.DB.prepare("SELECT event,sum(count) AS count FROM metrics WHERE day>=? AND event LIKE 'focus:%' GROUP BY event").bind(day(now-7*86400000)).all();
    const topics=conversations(eligible,now,new Map(interest.map(row=>[row.event.slice(6),Number(row.count)])));
    const cutoff=now-(frequency==='daily'?1:7)*86400000,seen=new Map(),current=[];
    for(const lane of ['human','ai']){let count=0;for(const s of eligible){if(count===2)break;if(s.lane!==lane||s.discovered_at<cutoff)continue;const keys=storyFocusKeys(s),topic=topics.find(t=>keys.includes(t.key));if(!topic)continue;const id=s.source_id??s.source,n=seen.get(id)??0;if(n>=2)continue;seen.set(id,n+1);const reason=topic.strength==='reader'?{en:`Reader interest · ${topic.en}`,zh:`读者关注 · ${topic.zh}`}:{en:`${topic.sources} sources on ${topic.en}`,zh:`${topic.sources} 个来源关注 · ${topic.zh}`};current.push({...s,digest_focus:reason});count++;}}
    if(current.length)await env.DB.prepare('INSERT OR IGNORE INTO email_editions(id,snapshot,created_at) VALUES(?,?,?)').bind(edition,JSON.stringify(current),now).run();
    const snapshot=await env.DB.prepare('SELECT snapshot FROM email_editions WHERE id=?').bind(edition).first();
    const chosen=snapshot?JSON.parse(snapshot.snapshot):[];
    if(!chosen.length)continue;
    const {results:subscribers}=await env.DB.prepare("SELECT email FROM email_subscribers WHERE status='active' AND language=? AND frequency=? AND email NOT IN (SELECT email FROM email_outbox WHERE edition=?) ORDER BY updated_at LIMIT 10").bind(language,frequency,edition).all();
    for(const subscriber of subscribers){
      const unsub=await unsubscribeToken(env.EMAIL_TOKEN_SECRET,subscriber.email),link='https://bond6.io/email/unsubscribe?token='+unsub;
      const payload={from:'Bond6 <digest@bond6.io>',to:[subscriber.email],subject:language==='zh'?'Bond6 阅读摘要':'Your Bond6 reading digest',html:digestHtml(chosen,language,link),headers:{'List-Unsubscribe':`<${link}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}};
      const id='digest/'+await hash(testNamespace+'|'+edition+'|'+subscriber.email);
      await env.DB.prepare("INSERT OR IGNORE INTO email_outbox(id,email,edition,payload,status,created_at,updated_at) VALUES(?,?,?,?,'pending',?,?)").bind(id,subscriber.email,edition,JSON.stringify(payload),now,now).run();
    }
  }
  await env.DB.prepare("UPDATE email_outbox SET status='pending' WHERE status='sending' AND updated_at<? AND created_at>?").bind(now-10*60000,now-23*3600000).run();
  const {results:pending}=await env.DB.prepare("SELECT * FROM email_outbox WHERE status='pending' AND created_at>? ORDER BY created_at LIMIT 5").bind(now-23*3600000).all();
  for(const item of pending){
    const claim=await env.DB.prepare("UPDATE email_outbox SET status='sending',updated_at=? WHERE id=? AND status='pending'").bind(now,item.id).run();
    if(!claim.meta.changes)continue;
    const active=await env.DB.prepare('SELECT status FROM email_subscribers WHERE email=?').bind(item.email).first();
    if(active?.status!=='active'){await env.DB.prepare("UPDATE email_outbox SET status='cancelled',payload='',updated_at=? WHERE id=? AND status='sending'").bind(now,item.id).run();continue;}
    if(!await reserve(env.DB,now)){await env.DB.prepare("UPDATE email_outbox SET status='pending' WHERE id=? AND status='sending'").bind(item.id).run();break;}
    let sent=false;try {sent=await send(env,JSON.parse(item.payload),item.id);}catch{/* Retry within provider's 24-hour idempotency window. */}
    await env.DB.prepare("UPDATE email_outbox SET status=?,payload=CASE WHEN ?='sent' THEN '' ELSE payload END,updated_at=? WHERE id=? AND status='sending'").bind(sent?'sent':'pending',sent?'sent':'pending',now,item.id).run();
  }
  await env.DB.prepare("UPDATE email_outbox SET status='expired',payload='',updated_at=? WHERE status IN ('pending','sending') AND created_at<=?").bind(now,now-23*3600000).run();
}
export async function pruneEmailData(db,now=Date.now()){
  await db.batch([
    db.prepare('DELETE FROM email_outbox WHERE created_at<?').bind(now-7*86400000),
    db.prepare('DELETE FROM email_send_budget WHERE day<?').bind(day(now-7*86400000)),
    db.prepare('DELETE FROM email_request_limits WHERE expires_at<?').bind(now),
    db.prepare('DELETE FROM email_editions WHERE created_at<?').bind(now-7*86400000),
    db.prepare("DELETE FROM email_subscribers WHERE status='pending' AND coalesce(confirm_expires,updated_at)<?").bind(now-7*86400000),
    db.prepare("DELETE FROM email_subscribers WHERE status='unsubscribed' AND updated_at<?").bind(now-7*86400000)
  ]);
}
