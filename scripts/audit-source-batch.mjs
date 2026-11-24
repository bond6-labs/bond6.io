import {readFile} from 'node:fs/promises';
import {sources} from '../src/sources.js';
import {fromRss} from '../src/ingest.js';
const text=await readFile(process.argv[2],'utf8');
const entries=text.split(/^### /m).slice(1).map(block=>{
 const name=block.split('\n')[0].replace(/^\d+\. /,'').trim();
 const url=block.match(/^- Feed[:：]\s*(https?:\/\/[^\s（(]+)/m)?.[1];
 return {name,url};
}).filter(x=>x.url);
for(let i=0;i<entries.length;i+=5)await Promise.all(entries.slice(i,i+5).map(async e=>{
 const existing=sources.find(s=>s.url===e.url||new URL(s.site).hostname.replace(/^www\./,'')===new URL(e.url).hostname.replace(/^www\./,''));
 try{
 const r=await fetch(e.url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Bond6 (+https://bond6.io/about)'}});
 const body=await r.text();if(body.length>1500000)throw Error('oversized feed');
 const items=fromRss(body,{id:existing?.id,essays:true});
 console.log(JSON.stringify({...e,existing:existing?.id,status:r.status,items:items.length,eligible:items.filter(s=>s.lane).length,latest:items[0]?.original_published_at,title:items[0]?.title}));
 }catch(error){console.log(JSON.stringify({...e,existing:existing?.id,error:error.message}));}
}));
