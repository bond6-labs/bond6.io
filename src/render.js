import { chinese } from './chinese.js';
import { subjectLabels } from './content.js';
import { CACHE_CONTROL } from './config.js';
import { getCSPHeader } from './security.js';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function locale(url) {
  const zh=url.pathname==='/zh'||url.pathname.startsWith('/zh/');
  const path=zh?url.pathname.slice(3)||'/':url.pathname;
  const local=route=>zh?'/zh'+route:route;
  const alternateQuery=new URLSearchParams(url.search);for(const key of ['before','before_url','page','load'])alternateQuery.delete(key);
  return {zh,path,local,lang:zh?'zh-Hans':'en',t:label=>zh?chinese[label]??label:label,say:(en,cn)=>zh?cn:en,url,
    alternate:(zh?path:'/zh'+path)+(alternateQuery.size?'?'+alternateQuery:'')};
}
export function date(ms,v) {
  return new Intl.DateTimeFormat(v.zh?'zh-Hans':'en',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(ms);
}
export function qlink(v,changes={},path=v.path) {
  const query=new URLSearchParams(v.url.search);
  for (const [k,val] of Object.entries(changes)) val==null?query.delete(k):query.set(k,String(val));
  return v.local(path)+(query.size?'?'+query:'');
}
export function searchForm(v) {
  const query=v.url.searchParams.get('q')??'';
  const clear=qlink(v,{q:null,page:null,before:null,before_url:null});
  return `<details class="search-control"><summary aria-label="${v.t('Search stories')}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.8" cy="10.8" r="6.1"></circle><path d="m16 16 4.3 4.3"></path></svg><span class="visually-hidden">${v.t('Search')}</span></summary><form class="story-search" role="search" action="${v.local('/')}">
    <label for="story-query">${v.t('Search stories')}</label><div><input id="story-query" name="q" type="search" maxlength="120" autocomplete="off" placeholder="${v.say('Headlines, writers, or sources…','搜索标题、作者或来源…')}" value="${esc(query)}">${query?`<a class="clear-search" href="${esc(clear)}">${v.say('Clear','清除')}</a>`:''}<button>${v.t('Search')}</button></div>
    ${v.url.searchParams.get('lane')?`<input type="hidden" name="lane" value="${esc(v.url.searchParams.get('lane'))}">`:''}</form></details>`;
}
export function html(v,title,content,{status=200,description,intro,wide=false,edition=false,homepage=false}={}) {
  const siteTitle=v.t('The Bond6 Flow'), heading=title||siteTitle;
  description??=v.t('New writing on culture, creative work, and life with AI.');
  intro??=description;
  const canonical=new URL(v.local(v.path),'https://bond6.io').href;
  const en=new URL(v.path,'https://bond6.io').href, zh=new URL('/zh'+v.path,'https://bond6.io').href;
  const nav=[['/','Latest'],['/trending','Focusing'],['/bond','Bonding']];
  const navLinks=nav.map(([p,label])=>`<a data-keep-lane href="${esc(qlink(v,{q:null,page:null,view:null,load:null,before:null,before_url:null},p))}"${v.path===p?' aria-current="page"':''}>${v.t(label)}</a>`).join('');
  const body=`<!doctype html><html lang="${v.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(heading)}${title?' · Bond6.io':''}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#f6f3ec">
  <link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="en" href="${en}"><link rel="alternate" hreflang="zh-Hans" href="${zh}"><link rel="alternate" hreflang="x-default" href="${en}">
  <meta property="og:type" content="${edition?'article':'website'}"><meta property="og:site_name" content="Bond6.io"><meta property="og:title" content="${esc(heading)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://bond6.io/social-card.png"><meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="alternate" type="application/rss+xml" title="${siteTitle}" href="${v.local('/feed.xml')}?kind=daily">
  <script src="/reader.js?v=${esc(v.release??'local')}" defer></script>
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,700&family=Courier+Prime:wght@400;700&family=Inter:wght@400;600;700&family=Lora:wght@500;600&family=Noto+Serif+SC:wght@500;600&family=PT+Serif:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css?v=${esc(v.release??'local')}"></head><body class="${wide?'wide':''}" data-edition="${edition?'true':'false'}">
  <a class="skip-link" href="#main">${v.t('Skip to content')}</a>
  <header class="masthead"><div class="shell masthead-inner"><a class="wordmark" href="${v.local('/')}" aria-label="${v.t('Bond6.io home')}" translate="no"><span class="brand-symbol" aria-hidden="true"></span><span class="brand-word-image" aria-hidden="true"></span></a>
  <nav class="tabs" aria-label="${v.t('Main navigation')}">${navLinks}</nav><div class="reader-controls">${searchForm(v)}
  <a class="language-link" href="${esc(v.alternate)}" lang="${v.zh?'en':'zh-Hans'}">${v.zh?'EN':'中'}</a>
  </div></div></header>
  <main class="shell" id="main" tabindex="-1"><div class="intro${homepage?' homepage-intro':''}"><div><h1>${esc(heading)}</h1>${!title?`<p>${esc(intro)}</p>`:''}</div></div>${content}</main>
  <div class="reader-message shell" role="status" aria-live="polite"></div>
  <footer class="shell footer"><div class="footer-inner"><p translate="no">© ${new Date().getUTCFullYear()} Bond6.io</p><nav aria-label="${v.t('Contact and subscriptions')}">
  <a href="${v.local('/about')}">${v.t('About')}</a><a href="${v.local('/sources')}">${v.t('Sources')}</a><a href="${v.local('/trending')}">${v.t('Focusing')}</a><a href="mailto:info@bond6.io">${v.t('Contact')}</a><a href="${v.local('/subscribe')}">RSS</a></nav></div></footer></body></html>`;
  return new Response(body,{status,headers:{'Content-Type':'text/html; charset=utf-8','Content-Language':v.lang,'Cache-Control':status===200?CACHE_CONTROL.public:CACHE_CONTROL.none,'CDN-Cache-Control':status===200?CACHE_CONTROL.public:CACHE_CONTROL.none,
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin',
    'Content-Security-Policy':getCSPHeader()}});
}
export function actions(story,v,shareUrl) {
  const data={url:story.url,title:story.title,source:story.source,author:story.author,date:story.original_published_at,original_lang:story.original_lang};
  return `<div class="story-actions"><button type="button" class="save-story" data-story="${esc(JSON.stringify(data))}" hidden aria-pressed="false">${v.say('Save','收藏')}</button><button type="button" class="share-story" data-url="${esc(shareUrl??story.url)}" data-title="${esc(data.title)}" hidden>${v.say('Share','分享')}</button></div>`;
}
function mediaPreview(story,v) {
  const credit=v.say(`Media from ${story.source}`,`媒体来自 ${story.source}`);
  const art=story.subject==='art';
  const image=story.image_url?`<a class="story-image${art?' preserve-media':''}" href="${esc(story.url)}" data-event="original" aria-label="${esc(credit)}"><span class="story-image-frame"><img src="${esc(story.image_url)}" alt="${esc(story.title)}" width="16" height="10" data-media-check data-min-width="${art?180:320}" data-min-height="${art?180:180}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span><span class="story-image-credit">${esc(credit)}</span></a>`:'';
  const audio=story.audio_url?`<div class="story-audio"><span>${v.say('Listen from ','收听：')}${esc(story.source)}</span><audio controls preload="none" src="${esc(story.audio_url)}">${v.say('Audio is available at the original source.','音频可在原始来源收听。')}</audio></div>`:'';
  if (!story.video_url) return image+audio;
  const title=v.say(`Play video from ${story.source}`,`播放 ${story.source} 的视频`);
  const video=/^https:\/\/(?:www\.youtube-nocookie\.com|player\.vimeo\.com)\//.test(story.video_url)
    ? `<iframe src="${esc(story.video_url)}" title="${esc(title)}" loading="lazy" referrerpolicy="no-referrer" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
    : `<video class="story-video-native" controls preload="metadata"${story.image_url?` poster="${esc(story.image_url)}"`:''}><source src="${esc(story.video_url)}">${v.say('Video is available at the original source.','视频可在原始来源观看。')}</video>`;
  return `${image}${audio}<details class="story-video"><summary>${esc(title)}</summary><div>${video}</div></details>`;
}
export const correction=(v,url)=>`<a href="mailto:info@bond6.io?subject=${encodeURIComponent('Bond6 correction | '+url)}">${v.say('Suggest a correction','建议更正')}</a>`;
const deckPreview=(excerpt,limit)=>{
  const text=String(excerpt??'').replace(/\s+/g,' ').trim();
  if(text.length<=limit)return {text,truncated:false};
  const partial=text.slice(0,limit);
  const sentenceEnd=Math.max(partial.lastIndexOf('. '),partial.lastIndexOf('! '),partial.lastIndexOf('? '));
  const end=sentenceEnd>=Math.floor(limit*.55)?sentenceEnd+1:Math.max(1,partial.lastIndexOf(' '));
  return {text:partial.slice(0,end).trim(),truncated:true};
};
export function card(s,v,{pick=false,lead=false,rhythm=false,editionId,mentions=[],focusKeys=[]}={}) {
  const copy=v.zh?s.zh:s.en, title=s.title;
  const publication=s.original_published_at?`<time datetime="${new Date(s.original_published_at).toISOString()}">${date(s.original_published_at,v)}</time>`:`<span>${v.say('Publication date unavailable','发表日期未知')}</span>`;
  const evidence=[...new Map(mentions.map(m=>[m.source,m])).values()];
  const discussion=evidence.filter(m=>m.link!==s.url).map(m=>`<a href="${esc(m.link)}" data-event="original">${esc(m.source)}</a>`).join('');
  const share=editionId?`https://bond6.io${v.local('/edit/'+editionId)}#story-${s.content_hash.slice(0,12)}`:s.url;
  const deck=lead&&s.excerpt?deckPreview(s.excerpt,v.zh?180:260):null;
  return `<article class="story${pick?' daily-pick':''}${lead?' story-lead':''}" id="story-${s.content_hash?.slice(0,12)??'item'}" data-discovered="${s.discovered_at??0}"${focusKeys.length?` data-focus="${esc(focusKeys.join(','))}"`:''}>
    <div class="story-meta"><span class="topic">${v.t(subjectLabels[s.subject]??s.topic??'Digital Life')}</span><span class="new-mark" hidden>${v.say('New','新发现')}</span></div>
    <h3><a href="${esc(s.url)}" data-event="original" lang="${s.original_lang==='zh'?'zh-Hans':'en'}">${esc(title)}</a></h3>
    ${deck?`<p class="story-deck">${esc(deck.text)}${deck.truncated?'…':''}</p>`:''}
    ${pick?`<p class="pick-note">${esc(copy?.note)}</p>`:''}
    <div class="byline"><span>${esc(s.author&&s.author!==s.source?s.author+' · '+s.source:s.source)}</span>${publication}</div>
    ${mediaPreview(s,v)}
    ${s.content_type==='shared-article'?`<p class="source-context">${v.say('Shared link · article date not verified','转发链接 · 文章日期未经核实')}</p>`:''}
    ${pick?`<details class="note-method"><summary>${v.say('AI-assisted summary','AI 辅助摘要')}</summary><p>${v.say('Checked against the available source excerpt. This can still contain errors.','已对照可获取的来源摘录检查，仍可能有误。')} ${correction(v,share)} · <a href="${v.local('/about')}#method">${v.say('How we publish','发布方式')}</a></p></details>`:''}
    ${actions(s,v,share)}${s.coverage>=2?`<details class="mention-evidence"><summary>${v.say(`Mentioned by ${s.coverage} tracked sources`,`由 ${s.coverage} 个关注来源提及`)}</summary><div class="discussions">${discussion||v.say('Coverage recorded from independent tracked sources.','由不同关注来源记录。')}</div></details>`:''}${discussion&&!s.coverage?`<details><summary>${v.t('Related discussion')}</summary><div class="discussions">${discussion}</div></details>`:''}</article>`;
}
