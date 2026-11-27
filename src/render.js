import { chinese } from './chinese.js';
import { subjectLabels, publicExcerpt, restrictedStory } from './content.js';
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
export function html(v,title,content,{status=200,description,intro,subtitle,wide=false,edition=false,homepage=false}={}) {
  const siteTitle=v.t('The Bond6 Flow'), heading=title||siteTitle;
  description??=v.t('New writing on culture, creative work, and life with AI.');
  intro??=description;
  const canonical=new URL(v.local(v.path),'https://bond6.io').href;
  const en=new URL(v.path,'https://bond6.io').href, zh=new URL('/zh'+v.path,'https://bond6.io').href;
  const nav=[['/','Latest'],['/focusing','Focusing'],['/bonding','Bonding']];
  const navLinks=nav.map(([p,label])=>`<a data-keep-lane href="${esc(qlink(v,{q:null,page:null,view:null,load:null,before:null,before_url:null},p))}"${v.path===p?' aria-current="page"':''}>${v.t(label)}</a>`).join('');
  const body=`<!doctype html><html lang="${v.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(heading)}${title?' · Bond6.io':''}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#f6f3ec">
  <link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="en" href="${en}"><link rel="alternate" hreflang="zh-Hans" href="${zh}"><link rel="alternate" hreflang="x-default" href="${en}">
  <meta property="og:type" content="${edition?'article':'website'}"><meta property="og:site_name" content="Bond6.io"><meta property="og:title" content="${esc(heading)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://bond6.io/social-card.png"><meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.svg?v=${esc(v.release??'local')}" type="image/svg+xml"><link rel="manifest" href="/manifest.webmanifest"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Bond6"><link rel="alternate" type="application/rss+xml" title="${siteTitle}" href="${v.local('/feed.xml')}?kind=live">
  <script src="/reader.js?v=${esc(v.release??'local')}" defer></script>
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,700&family=Courier+Prime:wght@400;700&family=Inter:wght@400;600;700&family=Lora:wght@500;600&family=Noto+Serif+SC:wght@500;600&family=PT+Serif:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css?v=${esc(v.release??'local')}"></head><body class="${wide?'wide':''}" data-edition="${edition?'true':'false'}">
  <a class="skip-link" href="#main">${v.t('Skip to content')}</a>
  <header class="masthead"><div class="shell masthead-inner"><a class="wordmark" href="${v.local('/')}" aria-label="${v.t('Bond6.io home')}" translate="no"><img class="brand-lockup" src="/bond6-logo.png" width="1778" height="340" alt="" draggable="false"></a>
  <nav class="tabs" aria-label="${v.t('Main navigation')}">${navLinks}</nav><div class="reader-controls"><button type="button" class="pwa-install" data-pwa-install hidden>${v.say('Install','安装')}</button><div class="email-float" aria-label="${v.say('Email subscription','邮件订阅')}"><details><summary>${v.say('Digest','摘要')} <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="5.5" width="17" height="13" rx="1.5"></rect><path d="m4.5 7 7.5 6 7.5-6"></path></svg></summary><div class="email-float-panel"><strong>${v.say('A little Bond6 in your inbox','把 Bond6 带到邮箱')}</strong><p>${v.say('Human culture and AI, thoughtfully gathered.','人文与 AI 的精彩发现，寄给你。')}</p><form data-email-subscribe><label>${v.say('Email address','邮箱地址')}<input type="email" name="email" placeholder="${v.say('Your email address','输入邮箱地址')}" required maxlength="254" autocomplete="email"${v.emailEnabled?'':' disabled'}></label><div class="email-preferences"><label>${v.say('Language','语言')}<select name="language"${v.emailEnabled?'':' disabled'}><option value="en"${v.zh?'':' selected'}>English</option><option value="zh"${v.zh?' selected':''}>中文</option></select></label><label>${v.say('Frequency','频率')}<select name="frequency"${v.emailEnabled?'':' disabled'}><option value="weekly">${v.say('Weekly','每周')}</option><option value="daily">${v.say('Daily','每日')}</option></select></label></div><button type="submit"${v.emailEnabled?'':' disabled'}>${v.say('Subscribe','订阅')}</button><p class="email-status" role="status" aria-live="polite"></p></form><p class="email-float-note">${v.emailEnabled?v.say('We use your email and preferences for the digest; Cloudflare stores them and Resend delivers it. Confirm by email; unsubscribe anytime.','我们使用您的邮箱和订阅偏好发送摘要，由 Cloudflare 保存数据、Resend 发送邮件。邮件确认后生效，可随时退订。'):v.say('Email subscriptions are being prepared.','邮件订阅正在准备中。')} <a href="${v.local('/about')}#email-privacy">${v.say('Privacy','隐私说明')}</a> · <a href="mailto:info@bond6.io">info@bond6.io</a></p></div></details><p class="email-notice" role="status" aria-live="polite" aria-atomic="true"></p></div><a class="saved-link" href="${v.local('/saved')}" aria-label="${v.t('Saved stories')}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 4.5h11v15l-5.5-3.6-5.5 3.6z"></path></svg><span class="saved-count" data-saved-count hidden>0</span></a>${searchForm(v)}
  <a class="language-link" href="${esc(v.alternate)}" lang="${v.zh?'en':'zh-Hans'}" aria-label="${v.zh?'Read in English':'阅读简体中文'}" hreflang="${v.zh?'en':'zh-Hans'}">${v.zh?'EN':'中'}</a>
  </div></div></header>
  <main class="shell" id="main" tabindex="-1"><div class="intro${homepage?' homepage-intro':''}"><div><h1>${esc(heading)}</h1>${subtitle?`<p class="homepage-subtitle">${esc(subtitle)}</p>`:!title?`<p>${esc(intro)}</p>`:''}</div></div>${content}</main>
  <div class="reader-message shell" role="status" aria-live="polite"></div>
  <footer class="shell footer"><div class="footer-inner"><p translate="no">© ${new Date().getUTCFullYear()} Bond6.io, All rights reserved</p><nav aria-label="${v.t('Contact and subscriptions')}">
  <a href="${v.local('/about')}">${v.t('About')}</a><a href="${v.local('/sources')}">${v.t('Sources')}</a><a href="mailto:info@bond6.io">${v.t('Contact')}</a><a href="${v.local('/subscribe')}">RSS</a></nav></div></footer></body></html>`;
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
  // Guardian's feed intentionally signs a 140px image rendition. We cannot
  // safely rewrite that signed URL to a larger size, but it is still a useful
  // publisher-selected preview when rendered as a compact thumbnail.
  const signedThumbnail=/^https:\/\/i\.guim\.co\.uk\//i.test(story.image_url??'');
  const image=story.image_url?`<a class="story-image${art?' preserve-media':''}${signedThumbnail?' compact-thumbnail':''}" href="${esc(story.url)}" data-event="original" aria-label="${esc(credit)}"><span class="story-image-frame"><img src="${esc(story.image_url)}" alt="${esc(story.title)}" width="16" height="10" data-media-check data-min-width="${signedThumbnail?120:art?180:320}" data-min-height="${signedThumbnail?80:art?180:180}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span><span class="story-image-credit">${esc(credit)}</span></a>`:'';
  let restrictedAudio=false;
  try { restrictedAudio=new URL(story.audio_url).hostname.toLowerCase()==='audios.thepaper.cn'; } catch { /* No valid audio URL. */ }
  const audio=story.audio_url?`<div class="story-audio"><span>${v.say('Listen from ','收听：')}${esc(story.source)}</span>${restrictedAudio?'':`<audio controls preload="none" src="${esc(story.audio_url)}" data-media-player>${v.say('Audio is available at the original source.','音频可在原始来源收听。')}</audio>`}<a class="media-original" href="${esc(story.url)}" data-event="original">${v.say('Listen at the original source','前往原文收听')}</a></div>`:'';
  const videoUrl=typeof story.video_url==='string'&&story.video_url.startsWith('https://')?story.video_url:null;
  if (!videoUrl) return image+audio;
  const title=v.say(`Play video from ${story.source}`,`播放 ${story.source} 的视频`);
  const video=/^https:\/\/(?:www\.youtube-nocookie\.com|player\.vimeo\.com)\//.test(videoUrl)
    // YouTube requires the embedding site's origin to identify an iframe
    // player. This sends only Bond6's origin, never the full story URL.
    ? `<iframe src="${esc(videoUrl)}" title="${esc(title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
    : `<video class="story-video-native" controls preload="metadata" data-media-player${story.image_url?` poster="${esc(story.image_url)}"`:''} src="${esc(videoUrl)}">${v.say('Video is available at the original source.','视频可在原始来源观看。')}</video>`;
  return `${image}${audio}<details class="story-video"><summary>${esc(title)}</summary><div>${video}</div><p class="media-original-wrap"><a class="media-original" href="${esc(story.url)}" data-event="original">${v.say('Watch at the original source','前往原文观看')}</a></p></details>`;
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
  // A headline alone is not enough to judge whether a story is worth opening.
  // Leads get a fuller deck; every other card keeps a compact, source-supplied
  // preview. We deliberately do not manufacture or scrape article prose here.
  const restricted=restrictedStory(s);
  const deck=!restricted&&s.excerpt?{text:publicExcerpt(s.excerpt,lead?(v.zh?180:260):(v.zh?130:190)),truncated:false}:null;
  return `<article class="story${pick?' daily-pick':''}${lead?' story-lead':''}" id="story-${s.content_hash?.slice(0,12)??'item'}" data-discovered="${s.discovered_at??0}"${focusKeys.length?` data-focus="${esc(focusKeys.join(','))}"`:''}>
    <div class="story-meta"><span class="topic">${v.t(subjectLabels[s.subject]??s.topic??'Digital Life')}</span><span class="new-mark" hidden>${v.say('New','新发现')}</span></div>
    <h3><a href="${esc(s.url)}" data-event="original" lang="${s.original_lang==='zh'?'zh-Hans':'en'}">${esc(title)}</a></h3>
    ${deck?`<p class="story-deck">${esc(deck.text)}${deck.truncated?'…':''}</p>`:''}
    ${pick?`<p class="pick-note">${esc(copy?.note)}</p>`:''}
    <div class="byline"><span>${esc(s.author&&s.author!==s.source?s.author+' · '+s.source:s.source)}</span>${publication}</div>
    ${restricted?`<p class="source-context">${v.say('Subscription required · Read at the original source','订阅内容 · 请前往原站阅读')}</p>`:mediaPreview(s,v)}
    ${s.content_type==='shared-article'?`<p class="source-context">${v.say('Shared link · article date not verified','转发链接 · 文章日期未经核实')}</p>`:''}
    ${pick?`<details class="note-method"><summary>${v.say('AI-assisted summary','AI 辅助摘要')}</summary><p>${v.say('Checked against the available source excerpt. This can still contain errors.','已对照可获取的来源摘录检查，仍可能有误。')} ${correction(v,share)} · <a href="${v.local('/about')}#method">${v.say('How we publish','发布方式')}</a></p></details>`:''}
    ${actions(s,v,share)}${s.coverage>=2?`<details class="mention-evidence"><summary>${v.say(`Mentioned by ${s.coverage} tracked sources`,`由 ${s.coverage} 个关注来源提及`)}</summary><div class="discussions">${discussion||v.say('Coverage recorded from independent tracked sources.','由不同关注来源记录。')}</div></details>`:''}${discussion&&!s.coverage?`<details><summary>${v.t('Related discussion')}</summary><div class="discussions">${discussion}</div></details>`:''}</article>`;
}
