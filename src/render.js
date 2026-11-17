import { chinese } from './chinese.js';
import { subjectLabels } from './content.js';
import { CACHE_CONTROL } from './config.js';
import { getCSPHeader } from './security.js';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function locale(url) {
  const zh=url.pathname==='/zh'||url.pathname.startsWith('/zh/');
  const path=zh?url.pathname.slice(3)||'/':url.pathname;
  const local=route=>zh?'/zh'+route:route;
  return {zh,path,local,lang:zh?'zh-Hans':'en',t:label=>zh?chinese[label]??label:label,say:(en,cn)=>zh?cn:en,url,
    alternate:(zh?path:'/zh'+path)+url.search};
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
  return `<details class="search-control"><summary aria-label="${v.t('Search stories')}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.8" cy="10.8" r="6.1"></circle><path d="m16 16 4.3 4.3"></path></svg><span class="visually-hidden">${v.t('Search')}</span></summary><form class="story-search" role="search" action="${v.local('/')}">
    <label for="story-query">${v.t('Search stories')}</label><div><input id="story-query" name="q" type="search" maxlength="120" autocomplete="off" value="${esc(v.url.searchParams.get('q'))}"><button>${v.t('Search')}</button></div>
    ${v.url.searchParams.get('lane')?`<input type="hidden" name="lane" value="${esc(v.url.searchParams.get('lane'))}">`:''}</form></details>`;
}
export function html(v,title,content,{status=200,description,wide=false,edition=false}={}) {
  const siteTitle=v.t('The Bond6 Flow'), heading=title||siteTitle;
  description??=v.t('New writing on culture, creative work, and life with AI.');
  const canonical=new URL(v.local(v.path),'https://bond6.io').href;
  const en=new URL(v.path,'https://bond6.io').href, zh=new URL('/zh'+v.path,'https://bond6.io').href;
  const nav=[['/','Latest'],['/trending','Focusing'],['/bond','Bonding']];
  const navLinks=nav.map(([p,label])=>`<a data-keep-lane href="${esc(qlink(v,{q:null,page:null,view:null},p))}"${v.path===p?' aria-current="page"':''}>${v.t(label)}</a>`).join('');
  const body=`<!doctype html><html lang="${v.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(heading)}${title?' · Bond6.io':''}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#f6f3ec">
  <link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="en" href="${en}"><link rel="alternate" hreflang="zh-Hans" href="${zh}"><link rel="alternate" hreflang="x-default" href="${en}">
  <meta property="og:type" content="${edition?'article':'website'}"><meta property="og:site_name" content="Bond6.io"><meta property="og:title" content="${esc(heading)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://bond6.io/social-card.png"><meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="alternate" type="application/rss+xml" title="${siteTitle}" href="${v.local('/feed.xml')}?kind=daily">
  <script src="/reader.js" defer></script>
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,700&family=Inter:wght@400;600;700&family=PT+Serif:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css?v=language-1"></head><body class="${wide?'wide':''}" data-edition="${edition?'true':'false'}">
  <a class="skip-link" href="#main">${v.t('Skip to content')}</a>
  <header class="masthead"><div class="shell masthead-inner"><a class="wordmark" href="${v.local('/')}" aria-label="${v.t('Bond6.io home')}" translate="no">Bond<span class="mark-six">6</span><small>.io</small></a>
  <nav class="tabs" aria-label="${v.t('Main navigation')}">${navLinks}</nav><div class="reader-controls">${searchForm(v)}
  <a class="language-link" href="${esc(v.alternate)}" lang="${v.zh?'en':'zh-Hans'}">${v.zh?'EN':'简'}</a>
  </div></div></header>
  <main class="shell" id="main" tabindex="-1"><div class="intro"><div><h1>${esc(heading)}</h1>${!title?`<p>${esc(description)}</p>`:''}</div></div>${content}</main>
  <div class="reader-message shell" role="status" aria-live="polite"></div>
  <footer class="shell footer"><div class="footer-inner"><p translate="no">© ${new Date().getUTCFullYear()} Bond6.io</p><nav aria-label="${v.t('Contact and subscriptions')}">
  <a href="${v.local('/about')}">${v.t('About')}</a><a href="${v.local('/sources')}">${v.t('Sources')}</a><a href="${v.local('/trending')}">${v.t('Focusing')}</a><a href="mailto:info@bond6.io">${v.t('Contact')}</a><a href="${v.local('/subscribe')}">RSS</a></nav></div></footer></body></html>`;
  return new Response(body,{status,headers:{'Content-Type':'text/html; charset=utf-8','Content-Language':v.lang,'Cache-Control':status===200?CACHE_CONTROL.public:CACHE_CONTROL.none,
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin',
    'Content-Security-Policy':getCSPHeader()}});
}
export function actions(story,v,shareUrl) {
  const data={url:story.url,title:story.title,source:story.source,author:story.author,date:story.original_published_at,original_lang:story.original_lang};
  return `<div class="story-actions"><button type="button" class="save-story" data-story="${esc(JSON.stringify(data))}" hidden aria-pressed="false">${v.say('Save','收藏')}</button><button type="button" class="share-story" data-url="${esc(shareUrl??story.url)}" data-title="${esc(data.title)}" hidden>${v.say('Share','分享')}</button></div>`;
}
function mediaPreview(story,v) {
  const credit=v.say(`Media from ${story.source}`,`媒体来自 ${story.source}`);
  const image=story.image_url?`<a class="story-image" href="${esc(story.url)}" data-event="original" aria-label="${esc(credit)}"><img src="${esc(story.image_url)}" alt="${esc(story.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"><span>${esc(credit)}</span></a>`:'';
  const audio=story.audio_url?`<div class="story-audio"><span>${v.say('Listen from ','收听：')}${esc(story.source)}</span><audio controls preload="none" src="${esc(story.audio_url)}">${v.say('Audio is available at the original source.','音频可在原始来源收听。')}</audio></div>`:'';
  if (!story.video_url) return image+audio;
  const title=v.say(`Play video from ${story.source}`,`播放 ${story.source} 的视频`);
  const video=/^https:\/\/(?:www\.youtube-nocookie\.com|player\.vimeo\.com)\//.test(story.video_url)
    ? `<iframe src="${esc(story.video_url)}" title="${esc(title)}" loading="lazy" referrerpolicy="no-referrer" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
    : `<video class="story-video-native" controls preload="metadata"${story.image_url?` poster="${esc(story.image_url)}"`:''}><source src="${esc(story.video_url)}">${v.say('Video is available at the original source.','视频可在原始来源观看。')}</video>`;
  return `${image}${audio}<details class="story-video"><summary>${esc(title)}</summary><div>${video}</div></details>`;
}
export const correction=(v,url)=>`<a href="mailto:info@bond6.io?subject=${encodeURIComponent('Bond6 correction | '+url)}">${v.say('Suggest a correction','建议更正')}</a>`;
const rhythmLabel=(label,v)=>({
  'Personal reflection':v.say('Personal reflection','个人思考'),
  'First-person process':v.say('First-person process','第一人称过程'),
  'Creative practice':v.say('Creative practice','创作实践'),
  'Care & mutual support':v.say('Care & mutual support','关怀与互助'),
  'Embodied life':v.say('Embodied life','身体与真实生活'),
  'AI capability or system':v.say('AI capability or system','AI 能力或系统'),
  'AI development':v.say('AI development','AI 进展'),
  'Consequential perspective':v.say('Consequential perspective','关键人物观点'),
  'Community & care':v.say('Community & care','社区与关怀'),
  'Place & lived time':v.say('Place & lived time','地点与生活时间'),
  'AI system':v.say('AI system','AI 系统'),
  'Platform power':v.say('Platform power','平台权力'),
  'Automated system':v.say('Automated system','自动化系统'),
  'Impact on people':v.say('Impact on people','对人的影响'),
  'Human consequence':v.say('Human consequence','对人的影响'),
  'Reported specificity':v.say('Reported specificity','报道中的具体性')
}[label]??label);
function rhythmReason(story,v) {
  let labels=Array.isArray(story.rhythm?.labels)?story.rhythm.labels:[];
  if (!labels.length && story.rhythm_labels) try { labels=JSON.parse(story.rhythm_labels); } catch { labels=[]; }
  if (!labels.length) return '';
  const selected=labels.slice(0,3).map(label=>rhythmLabel(label,v));
  const lane=story.lane==='ai'?'ai':'human';
  const signal=lane==='human'?v.say('Human signal','人的信号'):v.say('AI signal','AI 信号');
  return `<details class="rhythm-reason ${lane}"><summary><span class="rhythm-kicker">${v.say('Why this appeared','为何出现')}</span><span>${esc(signal+' · '+selected.join(' · '))}</span></summary><p>${v.say('Ranked from the available source excerpt for these signals.','根据可获取的来源摘录，按这些信号排序。')} <a href="${v.local('/about')}#rhythm">${v.say('About Bond6 Rhythm','了解 Bond6 节奏')}</a></p></details>`;
}
export function card(s,v,{pick=false,rhythm=false,editionId,mentions=[]}={}) {
  const copy=v.zh?s.zh:s.en, title=s.title;
  const publication=s.original_published_at?`<time datetime="${new Date(s.original_published_at).toISOString()}">${date(s.original_published_at,v)}</time>`:`<span>${v.say('Publication date unavailable','发表日期未知')}</span>`;
  const evidence=[...new Map(mentions.map(m=>[m.source,m])).values()];
  const discussion=evidence.filter(m=>m.link!==s.url).map(m=>`<a href="${esc(m.link)}" data-event="original">${esc(m.source)}</a>`).join('');
  const share=editionId?`https://bond6.io${v.local('/edit/'+editionId)}#story-${s.content_hash.slice(0,12)}`:s.url;
  return `<article class="story${pick?' daily-pick':''}" id="story-${s.content_hash?.slice(0,12)??'item'}" data-discovered="${s.discovered_at??0}">
    <div class="story-meta"><span class="topic">${v.t(subjectLabels[s.subject]??s.topic??'Digital Life')}</span><span class="new-mark" hidden>${v.say('New','新发现')}</span></div>
    <h3><a href="${esc(s.url)}" data-event="original" lang="${s.original_lang==='zh'?'zh-Hans':'en'}">${esc(title)}</a></h3>
    ${pick?`<p class="pick-note">${esc(copy?.note)}</p>`:''}
    <div class="byline"><span>${esc(s.author&&s.author!==s.source?s.author+' · '+s.source:s.source)}</span>${publication}</div>
    ${mediaPreview(s,v)}
    ${s.content_type==='shared-article'?`<p class="source-context">${v.say('Shared link · article date not verified','转发链接 · 文章日期未经核实')}</p>`:''}
    ${pick||rhythm?rhythmReason(s,v):''}${pick?`<details class="note-method"><summary>${v.say('AI-assisted summary','AI 辅助摘要')}</summary><p>${v.say('Checked against the available source excerpt. This can still contain errors.','已对照可获取的来源摘录检查，仍可能有误。')} ${correction(v,share)} · <a href="${v.local('/about')}#method">${v.say('How we publish','发布方式')}</a></p></details>`:''}
    ${actions(s,v,share)}${s.coverage>=2?`<details class="mention-evidence"><summary>${v.say(`Mentioned by ${s.coverage} tracked sources`,`由 ${s.coverage} 个关注来源提及`)}</summary><div class="discussions">${discussion||v.say('Coverage recorded from independent tracked sources.','由不同关注来源记录。')}</div></details>`:''}${discussion&&!s.coverage?`<details><summary>${v.t('Related discussion')}</summary><div class="discussions">${discussion}</div></details>`:''}</article>`;
}
