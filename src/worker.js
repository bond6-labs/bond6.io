import { collect, prune } from './ingest.js';
import { publishingStep } from './publishing.js';
import { translateHeadlines } from './rolling.js';
import { locale, html, esc } from './render.js';
import { home, dailyPage, bondPage, about, sourcesPage, subscribe, savedPage, legacyEditions } from './pages.js';
import { dayKey } from './content.js';

const xml=value=>esc(String(value??'').replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu,''));
async function rss(env,v) {
  const kind=v.url.searchParams.get('kind')??'live', lane=v.url.searchParams.get('lane');
  if (!['live','daily','bond'].includes(kind)||(lane&&!['human','ai'].includes(lane))) return new Response('Unknown feed filter',{status:400});
  let items=[];
  if (kind==='live') {
    const {results}=await env.DB.prepare(`SELECT * FROM stories WHERE lane IS NOT NULL ${lane?'AND lane=?':''} ORDER BY discovered_at DESC,url DESC LIMIT 50`).bind(...(lane?[lane]:[])).all();
    items=results.map(s=>({title:(v.zh?s.title_zh:s.title_en)??s.title,link:s.url,id:s.url,date:s.original_published_at,author:s.author,description:s.source}));
  } else {
    const {results}=await env.DB.prepare('SELECT * FROM editions WHERE kind=? ORDER BY edition_date DESC LIMIT 50').bind(kind).all();
    const editions=results.map(r=>({...JSON.parse(r.snapshot),published:r.published_at}));
    if (kind==='bond') editions.push(...legacyEditions);
    items=editions.slice(0,50).flatMap(e=>{
      if(kind==='bond') return [{title:(v.zh?e.zh:e.en).title,link:'https://bond6.io'+v.local('/bond/'+e.id),id:'bond:'+e.id,date:e.published??Date.parse(e.date+'T12:00Z'),description:(v.zh?e.zh:e.en).note,author:'Bond6'}];
      return e.stories.filter(s=>!lane||s.lane===lane).map(s=>({title:(v.zh?s.zh:s.en).title,link:'https://bond6.io'+v.local('/edit/'+e.id)+'#story-'+s.content_hash.slice(0,12),id:'daily:'+e.id+':'+s.url,date:e.published,author:s.author??s.source,description:(v.zh?s.zh:s.en).note+' · '+v.say('Original: ','原文：')+s.url}));
    }).slice(0,50);
  }
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${xml(v.t('The Bond6 Edit'))} · ${kind}${lane?' · '+lane:''}</title><link>https://bond6.io${v.local('/')}</link><description>${xml(v.t('New writing on culture, creative work, and life with AI.'))}</description><language>${v.lang}</language><atom:link href="${xml('https://bond6.io'+v.url.pathname+v.url.search)}" rel="self" type="application/rss+xml"/>${items.map(i=>`<item><title>${xml(i.title)}</title><link>${xml(i.link)}</link><guid isPermaLink="false">${xml(i.id)}</guid>${i.date?`<pubDate>${new Date(i.date).toUTCString()}</pubDate>`:''}${i.author?`<dc:creator>${xml(i.author)}</dc:creator>`:''}<description>${xml(i.description)}</description></item>`).join('')}</channel></rss>`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8','Cache-Control':'public, max-age=60'}});
}
async function sitemap(env) {
  const {results}=await env.DB.prepare('SELECT id,kind FROM editions ORDER BY edition_date DESC LIMIT 100').all();
  const paths=['/','/about','/sources','/subscribe','/edit','/bond',...results.map(e=>(e.kind==='daily'?'/edit/':'/bond/')+e.id),...legacyEditions.map(e=>'/bond/'+e.id)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.flatMap(p=>[p,'/zh'+p]).map(p=>`<url><loc>https://bond6.io${xml(p)}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=60'}});
}
export async function event(request,env,now=Date.now()) {
  const origin=new URL(request.url).origin;
  if (request.headers.get('origin')!==origin || request.headers.get('sec-fetch-site')==='cross-site') return new Response(null,{status:403});
  if (!request.headers.get('content-type')?.startsWith('application/json') || Number(request.headers.get('content-length')??0)>128) return new Response(null,{status:400});
  const reader=request.body?.getReader();
  if(!reader) return new Response(null,{status:400});
  let bytes=0,body='';const decoder=new TextDecoder();
  for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>128){await reader.cancel();return new Response(null,{status:413});}body+=decoder.decode(value,{stream:true});}
  let name; try{name=JSON.parse(body).event;}catch{return new Response(null,{status:400});}
  if(!['visit','return','edition','original','save','share'].includes(name)) return new Response(null,{status:400});
  await env.DB.prepare(`INSERT INTO metrics(day,event,count) VALUES(?,?,1) ON CONFLICT(day,event) DO UPDATE SET count=count+1 WHERE count<10000`).bind(dayKey(now),name).run();
  return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
}
async function route(request,env,v) {
  const path=v.path;
  if(path==='/')return home(env,v);
  if(path==='/trending')return home(env,v,{trending:true});
  if(path==='/bond')return bondPage(env,v);
  if(/^\/bond\/[a-z0-9-]+$/.test(path))return bondPage(env,v,path.slice(6));
  if(path==='/edit')return dailyPage(env,v);
  if(/^\/edit\/\d{4}-\d{2}-\d{2}$/.test(path))return dailyPage(env,v,path.slice(6));
  if(path==='/saved')return savedPage(v);
  if(path==='/about')return about(v);
  if(path==='/about.html')return Response.redirect(new URL(v.local('/about'),v.url),301);
  if(path==='/sources')return sourcesPage(env,v);
  if(path==='/subscribe')return subscribe(v);
  if(path==='/feed.xml')return rss(env,v);
  if(path==='/sitemap.xml')return sitemap(env);
  return html(v,v.t('Page unavailable'),`<p class="notice"><a href="${v.local('/')}">${v.t('Go to homepage')}</a></p>`,{status:404});
}
export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url),v=locale(url);
    if(url.pathname==='/events'&&request.method==='POST')return event(request,env).catch(()=>new Response(null,{status:503}));
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
    if(url.search.length>1500)return new Response('Query too long',{status:400});
    const cache=globalThis.caches?.default;
    const key=new Request(url.href,{method:'GET'});
    let response=cache?await cache.match(key):null;
    if(!response) {
      try {response=await route(request,env,v);}catch(error){console.error('Page query failed',error.message);response=html(v,v.t('Feed unavailable'),`<p class="notice">${v.t('The feed is temporarily unavailable. Please try again shortly.')}</p>`,{status:503});}
      if(response.status===200&&cache&&ctx)ctx.waitUntil(cache.put(key,response.clone()));
    }
    return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
  },
  scheduled(controller,env,ctx) {
    ctx.waitUntil((async()=>{
      const now=controller.scheduledTime,minute=new Date(now).getUTCMinutes();
      // Separate invocations keep feed parsing and AI publication below query/CPU budgets.
      if(minute===59){await prune(env,now);return;}
      if(minute%2===0){await collect(env,now);return;}
      const worked=await publishingStep(env,now);
      if(!worked&&minute%15===1)await translateHeadlines(env,now);
      else if(!worked)await collect(env,now);
    })().catch(error=>console.error('Scheduled work failed',error.message)));
  }
};
