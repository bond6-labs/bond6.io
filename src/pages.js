import { html, esc, date, card, qlink, correction, actions } from './render.js';
import { DAY, conversations, conversationTopic, dayKey, storyTopics, subjects, subjectLabels } from './content.js';
import { sources } from './sources.js';
import { editions as legacy } from './picks.js';

const legacySlugs=['making-and-proof','imitation-and-performance','behind-the-finished-work','a-personal-exchange'];
const metaSummary=value => {
  const text=String(value??'').trim();
  if (text.length<=180) return text;
  const clipped=text.slice(0,180); return (clipped.match(/^.*[.!?。！？]/)?.[0] ?? clipped.replace(/\s+\S*$/,'')).trim();
};
export const legacyEditions=legacy.map((e,i)=>({id:'field-notes-'+legacySlugs[i],kind:'bond',date:'2026-11-13',legacy:true,
  en:{title:e.en.question,note:e.en.note,question:e.en.prompt},zh:{title:e.zh.question,note:e.zh.note,question:e.zh.prompt},
  stories:Object.entries(e.picks).map(([lane,s])=>({...s,lane:lane==='human-feed'?'human':'ai',original_published_at:null,original_lang:'en',title:s.en.title}))}));
const parse=row=>row?{...JSON.parse(row.snapshot),correction:row.correction}:null;
export async function latestEdition(db,kind) { return parse(await db.prepare('SELECT snapshot,correction FROM editions WHERE kind=? ORDER BY edition_date DESC LIMIT 1').bind(kind).first()); }
const laneName=(lane,v)=>v.t(lane==='human'?'Human Voices':'AI & Its Impact');
const laneSignature=(lane,v)=>lane==='human'
  ?`<div class="lane-signature human-signature"><span class="heartbeat" aria-hidden="true">♥</span><span><b>37°C</b> · ${v.say('slow current','缓慢脉动')}</span><span class="lane-signal" aria-hidden="true"></span></div>`
  :`<div class="lane-signature ai-signature"><span class="digital-flow" aria-hidden="true"><span>101001&nbsp;101001&nbsp;101001&nbsp;</span></span><span>${v.say('fast signal','快速信号')}</span></div>`;

function mix(stats,v,lane) {
  const human=stats?.human??0, ai=stats?.ai??0;
  return `<section class="activity-bar" aria-label="${v.say('This week’s mix','本周资讯分布')}"><div class="mix-heading"><details><summary>${v.say('This week’s mix','本周资讯分布')}</summary><p>${v.say('Unique items discovered in the last seven days, grouped by subject. These counts describe our collection, not popularity or public opinion.','按主题统计过去七天发现的不重复资讯。这是本站收录内容的分布，并不代表热度或公众意见。')}</p></details><span>${v.say('Human Voices ','人的声音 ')}${human} <span class="human-dot" aria-hidden="true">●</span> · ${v.say('AI & Impact ','AI 与影响 ')}${ai} <span class="ai-dot" aria-hidden="true">●</span></span></div>
    ${human+ai?`<progress aria-label="${v.t('Human Voices share of recent stories')}" value="${human}" max="${human+ai}"></progress>`:''}
    <nav class="lane-switch" aria-label="${v.t('Choose a feed')}">${['human','ai'].map(l=>`<a href="${esc(qlink(v,{lane:l,page:null}))}"${lane===l?' aria-current="true"':''}>${laneName(l,v)}</a>`).join('')}</nav></section>`;
}
function filters(v) {
  const selected=v.url.searchParams.get('topic')??'';
  return `<nav class="topic-filters" aria-label="${v.say('Filter by subject','按主题筛选')}">${[['',v.say('All','全部')],...subjects.map(s=>[s,v.t(subjectLabels[s])])].map(([s,label])=>`<a href="${esc(qlink(v,{topic:s||null,page:null}))}"${selected===s?' aria-current="true"':''}>${label}</a>`).join('')}</nav>`;
}
function conversationStrip(topics,v) {
  if (!topics.length) return '';
  return `<section class="conversation-strip" aria-labelledby="conversation-heading"><div><h2 id="conversation-heading">${v.say('In conversation','正在讨论')}</h2><p>${v.say('Themes appearing across independent sources we follow this week. Not a measure of global popularity.','过去一周在多个本站关注来源中出现的主题，并非全网热度排行。')}</p></div><nav aria-label="${v.say('Topics in conversation','正在讨论的主题')}">${topics.map(topic=>`<a href="${esc(qlink(v,{signal:topic.key,view:'all',page:null,q:null},'/trending'))}">${v.zh?topic.zh:topic.en}<span>${topic.sources}</span></a>`).join('')}</nav></section>`;
}
export async function home(env,v,{trending=false}={}) {
  const db=env.DB, now=Date.now(), search=(v.url.searchParams.get('q')??'').trim().slice(0,120);
  const subject=subjects.includes(v.url.searchParams.get('topic'))?v.url.searchParams.get('topic'):null;
  const signal=conversationTopic(v.url.searchParams.get('signal'));
  const lane=v.url.searchParams.get('lane')==='ai'?'ai':'human';
  const page=Math.max(1,Number(v.url.searchParams.get('page'))||1);
  if (!Number.isSafeInteger(page)||page>50) return html(v,v.t('Page unavailable'),`<p>${v.t('This page is outside the current feed.')}</p>`,{status:404});
  const archive=v.url.searchParams.get('view')==='all'||page>1||!!search||trending;
  const where=`s.lane IS NOT NULL AND NOT (s.content_type='post' AND EXISTS(SELECT 1 FROM stories article WHERE article.url=s.canonical_url AND article.url<>s.url)) ${subject?'AND s.subject=?':''} ${search?"AND instr(lower(s.title || ' ' || coalesce(s.title_en,'') || ' ' || coalesce(s.title_zh,'') || ' ' || s.source || ' ' || coalesce(s.author,'')),lower(?))>0":''}`;
  const args=[...(subject?[subject]:[]),...(search?[search]:[])];
  const columns=await db.batch([
    db.prepare(`WITH diverse AS (SELECT s.*,ROW_NUMBER() OVER(PARTITION BY s.lane,s.source ORDER BY discovered_at DESC,url DESC) AS publisher_rank FROM stories s WHERE ${where})
      SELECT * FROM (SELECT diverse.*,ROW_NUMBER() OVER(PARTITION BY lane ORDER BY discovered_at DESC,url DESC) AS lane_rank FROM diverse WHERE publisher_rank<=2)
      WHERE lane_rank<=10 ORDER BY discovered_at DESC,url DESC`).bind(...args),
    db.prepare(`SELECT count(CASE WHEN lane='human' THEN 1 END) AS human,count(CASE WHEN lane='ai' THEN 1 END) AS ai FROM stories WHERE discovered_at>=?`).bind(now-7*DAY),
    db.prepare('SELECT max(ok_at) AS checked FROM source_state'),
    db.prepare('SELECT * FROM stories WHERE lane IS NOT NULL AND discovered_at>=? ORDER BY discovered_at DESC,url DESC LIMIT 120').bind(now-7*DAY)
  ]);
  const edition=await latestEdition(db,'daily');
  let stories=columns[0].results;
  if (archive) {
    const result=trending&&!signal?await db.prepare(`SELECT s.*,count(DISTINCT m.source) AS coverage FROM mentions m JOIN stories s USING(url) WHERE ${where} AND m.published_at>=?
      GROUP BY s.url HAVING count(DISTINCT m.source)>=2 ORDER BY coverage DESC,max(m.published_at) DESC LIMIT 21`).bind(...args,now-DAY).all()
      :signal?await db.prepare(`SELECT s.* FROM stories s WHERE ${where} AND discovered_at>=? ORDER BY discovered_at DESC,url DESC LIMIT 120`).bind(...args,now-7*DAY).all()
      :await db.prepare(`SELECT s.* FROM stories s WHERE ${where} ORDER BY discovered_at DESC,url DESC LIMIT 21 OFFSET ?`).bind(...args,(page-1)*20).all();
    stories=signal?result.results.filter(story=>story.discovered_at>=now-7*DAY&&storyTopics(story).includes(signal.key)).slice(0,20):result.results;
  }
  const {results:mentions}=stories.length?await db.prepare(`SELECT url,link,source FROM mentions WHERE url IN(${stories.map(()=>'?').join(',')}) ORDER BY published_at DESC`).bind(...stories.map(s=>s.url)).all():{results:[]};
  const render=s=>card(s,v,{mentions:mentions.filter(m=>m.url===s.url)});
  const picks=(edition?.stories??[]).filter(s=>!subject||s.subject===subject);
  const caption=edition?`<a class="edition-date" href="${v.local('/edit/'+edition.id)}">${date(Date.parse(edition.date+'T12:00:00Z'),v)} <span aria-hidden="true">↗</span></a>`:'';
  const dailyLive=env.GENERATED_PUBLISHING === 'true', showDaily=Boolean(edition) || dailyLive;
  const dailyHeading=edition?.date===dayKey(now)?v.say('Today’s picks','今日精选'):v.say('Daily picks','每日精选');
  const column=l=>{
    const selected=picks.filter(s=>s.lane===l);
    const arrivals=stories.filter(s=>s.lane===l&&!selected.some(p=>p.url===s.url));
    return `<section class="feed-column" id="${l}-feed"><header class="column-masthead">${laneSignature(l,v)}<h2>${laneName(l,v)}</h2><p>${l==='human'?v.say('Practice, care, and life made together.','创作、关怀，以及共同生活。'):v.say('Systems, speed, and their effects on people.','系统、速度，以及它们怎样影响人。')}</p></header>
    <div class="column-content">${showDaily?`<div class="section-label"><h3>${dailyHeading}</h3>${caption}</div>
    ${selected.length?selected.map(s=>card(s,v,{pick:true,editionId:edition.id})).join(''):`<p class="daily-empty">${edition?v.say('No picks in this subject for this edition.','本期没有这一主题的精选。'):v.say('Daily editions will appear here after automated publication is enabled.','自动发布启用后，每日精选会在这里出现。')}</p>`}
    ${selected.length?`<p class="edition-end">${v.say('That’s the selection. Stay curious.','本期精选到这里，继续保持好奇。')}</p>`:''}`:''}
    <div class="section-label arrivals-label"><h3>${v.say('Latest arrivals','最新发现')}</h3><span class="new-count" hidden></span></div>
    <div class="stories">${arrivals.length?arrivals.map(render).join(''):`<p class="notice">${v.t('No recent stories in this section yet.')}</p>`}</div></div></section>`;
  };
  const topicResults=signal?v.say('Stories in “','「')+(v.zh?signal.zh:signal.en)+v.say('” across sources we follow this week.','」：过去一周多个关注来源都在讨论。'):null;
  const main=archive?`<p class="feed-note">${search?v.say('Search results for “','搜索结果：“')+esc(search)+'”':topicResults??(trending?v.t('Most discussed among tracked sources in the past 24 hours.'):v.say('All recent arrivals','所有近期发现'))}</p><div class="stories archive-stories">${stories.length?stories.slice(0,20).map(render).join(''):`<p class="notice">${v.t('No recent stories match your search. Try another word or phrase.')}</p>`}</div>
    <nav class="pagination" aria-label="${v.t('Story pages')}">${page>1?`<a href="${esc(qlink(v,{page:page-1,view:'all'}))}">← ${v.say('Previous','上一页')}</a>`:''}${!trending&&stories.length>20?`<a href="${esc(qlink(v,{page:page+1,view:'all'}))}">${v.t('Older stories')} →</a>`:''}<a href="${esc(qlink(v,{page:null,view:null,q:null},'/'))}">${v.t('Back to latest')}</a></nav>`
    :`<div class="feed-columns" data-lane="${lane}">${column('human')}${column('ai')}</div><nav class="pagination"><a href="${esc(qlink(v,{view:'all',page:1}))}">${v.t('Browse all stories')} →</a><a href="${v.local('/edit')}">${v.say('Past daily editions','往期每日精选')} →</a></nav>`;
  const bond=await latestEdition(db,'bond')??legacyEditions[0];
  const last=columns[2].results[0]?.checked;
  const signalCandidates=columns[3].results;
  const activeConversations=conversations(signalCandidates,now);
  return html(v,trending?(signal?v.zh?signal.zh:signal.en:v.t('Trending')):null,`${!archive?mix(columns[1].results[0],v,lane):''}${!archive?conversationStrip(activeConversations,v):''}${filters(v)}${main}
    ${!archive?`<aside class="bond-teaser"><span>${v.t('The Bond')}</span><a href="${v.local('/bond/'+bond.id)}">${esc((v.zh?bond.zh:bond.en).title)} <span aria-hidden="true">→</span></a></aside>`:''}
    <p class="feed-note feed-status">${last?v.say('Sources last checked: ','上次检查来源：')+date(last,v)+' · '+new Date(last).toISOString().slice(11,16)+' UTC':v.t('Awaiting the first source check')}</p>`,{wide:!archive});
}
export async function dailyPage(env,v,id) {
  if (!id) {
    const {results}=await env.DB.prepare(`SELECT id,edition_date FROM editions WHERE kind='daily' ORDER BY edition_date DESC LIMIT 50`).all();
    const status=env.GENERATED_PUBLISHING === 'true'?v.say('A small selection, prepared daily at 12:00 UTC. Fewer picks when fewer sources qualify.','每天 UTC 12:00 准备一份小小的阅读精选。合适的内容少时，篇数也会少一些。'):v.say('Daily editions are not publishing yet. The live feeds remain available while automatic summaries undergo quality checks.','每日精选尚未开始发布。自动摘要仍在进行质量检查期间，实时资讯会继续更新。');
    return html(v,v.say('Daily editions','每日精选'),`<p class="feed-note">${status}</p>${results.length?`<ul class="edition-list">${results.map(e=>`<li><a href="${v.local('/edit/'+e.id)}">${date(Date.parse(e.edition_date+'T12:00Z'),v)} →</a></li>`).join('')}</ul>`:''}`);
  }
  const edition=parse(await env.DB.prepare(`SELECT snapshot,correction FROM editions WHERE kind='daily' AND id=?`).bind(id).first());
  if (!edition) return html(v,v.t('Page unavailable'),`<p>${v.say('This edition is unavailable or has left the 50-edition archive.','这一期不存在，或已超出最近 50 期的保留范围。')}</p>`,{status:404});
  return html(v,date(Date.parse(edition.date+'T12:00Z'),v),`<p class="feed-note">${v.say('The daily edit · a few things worth your time.','每日精选 · 几篇值得花时间读的文章。')}</p><div class="edition-columns">${['human','ai'].map(l=>`<section><h2 class="lane-title ${l}">${laneName(l,v)}</h2>${edition.stories.filter(s=>s.lane===l).map(s=>card(s,v,{pick:true,editionId:id})).join('')}</section>`).join('')}</div><p class="edition-end">${v.say('You’ve reached the end of this edition.','本期精选读完了。')}</p>${edition.correction?`<p>${esc(edition.correction)}</p>`:''}<p class="bond-link"><a href="${v.local('/edit')}">${v.say('More editions','更多精选')} →</a></p>`,{wide:true,edition:true,description:v.say('A daily selection of culture, creative work, and life with AI.','每天精选文化、创作与 AI 时代生活的好文章。')});
}
function participation(v) {
  return `<div class="bond-participation"><div><h3>${v.t('Send us a find')}</h3><p>${v.t('Share a public link and one sentence about what caught your attention. Tell us if you’d like to be credited.')}</p><a href="mailto:info@bond6.io?subject=Bond6%20reader%20find">${v.t('Email a find')}</a></div><div><h3>${v.t('Invite a voice')}</h3><p>${v.t('Suggest a creator and one question you’d ask them. You can also suggest yourself. We ask permission before publishing a response.')}</p><a href="mailto:info@bond6.io?subject=Bond6%20creator%20suggestion">${v.t('Suggest a creator')}</a></div></div>`;
}
export async function bondPage(env,v,id) {
  const {results}=await env.DB.prepare(`SELECT snapshot,correction FROM editions WHERE kind='bond' ORDER BY edition_date DESC LIMIT 50`).all();
  const editions=[...results.map(parse),...legacyEditions].slice(0,50);
  const edition=id?editions.find(e=>e.id===id):editions[0];
  if (!edition) return html(v,v.t('Page unavailable'),`<p>${v.t('Go to homepage')}</p>`,{status:404});
  const copy=v.zh?edition.zh:edition.en;
  const pair=edition.stories.map(s=>`<article class="editorial-pick"><p class="pick-label">${laneName(s.lane,v)}</p><h3>${esc((v.zh?s.zh:s.en).title)}</h3><p>${esc((v.zh?s.zh:s.en).note)}</p>${s.quote?`<blockquote><p lang="en">${esc(s.quote)}</p>${v.zh&&s.zh.quote?`<p>${esc(s.zh.quote)} ${v.t('(translated)')}</p>`:''}</blockquote>`:''}<p class="pick-links">${esc(s.author?s.author+' · '+s.source:s.source)}</p>${actions(s,v,'https://bond6.io'+v.local('/bond/'+edition.id))}</article>`).join('');
  return html(v,id?copy.title:v.t('The Bond'),`<p class="feed-note">${v.say('Connections between creative work and life with AI.','把创作与 AI 时代的生活放在一起读。')} ${date(Date.parse(edition.date+'T12:00Z'),v)}${edition.legacy?' · '+v.say('Archive research edition','研究存档选编'):''}</p>
    <section class="bond-feature">${!id?`<header class="bond-header"><h2><a href="${v.local('/bond/'+edition.id)}">${esc(copy.title)}</a></h2></header>`:''}<div class="bond-pair">${pair}</div><p class="bond-note">${esc(copy.note)}</p>
    <p class="bond-note note-disclosure">${edition.legacy?v.say('A researched editorial connection.','根据来源整理的编辑联想。'):v.say('Bond6’s interpretation · AI-assisted and checked against the selected sources.','Bond6 的联想 · 由 AI 辅助生成，并对照所选来源检查。')} ${correction(v,'https://bond6.io'+v.local('/bond/'+edition.id))}</p>
    ${copy.question?`<div class="bond-response"><p>${esc(copy.question)}</p><a href="mailto:info@bond6.io?subject=${encodeURIComponent('The Bond | '+copy.title)}">${v.t('Share your experience')}</a></div>`:''}${edition.correction?`<p class="bond-note">${esc(edition.correction)}</p>`:''}${participation(v)}</section>
    <h2>${v.t('More editions')}</h2><ul class="edition-list">${editions.filter(e=>e.id!==edition.id).map(e=>`<li><a href="${v.local('/bond/'+e.id)}">${esc((v.zh?e.zh:e.en).title)}</a><small>${date(Date.parse(e.date+'T12:00Z'),v)}</small></li>`).join('')}</ul>`,{edition:!!id,description:metaSummary(copy.note)});
}
export function about(v) {
  return html(v,v.t('About'),`<div class="about-copy"><p>${v.t('The Bond6 Edit brings together writing on culture, creative work, and life with AI. Bond6 takes its name from carbon, the sixth element and the basis of life.')}</p>
  <h2>${v.say('Two ways of looking','两种观察角度')}</h2><p>${v.say('Human Voices is for music, art, writing, craft and lived experience. It is a subject category, not a certification that a work was made without AI. AI & Its Impact looks at how AI and digital platforms affect people and culture.','「人的声音」关注音乐、艺术、写作、手工和亲身经历。这是主题分类，并不证明作品没有使用 AI。「AI 与它的影响」关注 AI 和数字平台怎样影响人及文化。')}</p>
  <h2 id="method">${v.say('How we publish','我们怎样发布')}</h2><p>${v.say('Public RSS/Atom feeds and selected Bluesky accounts supply the live stream. Items are classified by subject; linked articles and original commentary keep separate attribution. Unknown publication dates stay unknown. English and Chinese originals can appear in either edition; translated headlines are shown only when they have passed our automated checks.','实时资讯来自公开的 RSS/Atom 订阅源和选定的 Bluesky 账号。我们按内容主题分类，区分原文作者与转发者；无法确认的发表日期会标为未知。英文和中文原创内容都可出现在两个版本中；只有通过自动检查的标题译文才会显示。')}</p>
  <h2 id="rhythm">${v.say('Bond6 Rhythm','Bond6 节奏')}</h2><p>${v.say('Rhythm is our recorded selection method for daily picks, not a popularity score. Human Voices needs signals of creative practice, first-person process, care, community, or lived time. AI & Its Impact needs both a system or platform signal and a meaningful consequence for people or culture. Each selected story keeps the short labels and source-excerpt evidence that supported its place. Weak or mismatched signals stay in the live feed rather than being promoted.','「Bond6 节奏」是每日精选的可记录筛选方法，不是热度分数。「人的声音」需要创作实践、第一人称过程、关怀、社区或生活时间等信号；「AI 与它的影响」则须同时具备系统或平台信号，以及对人或文化有意义的影响。每篇入选文章都会保留简短标签和支持它的来源摘录证据。信号不足或不匹配的内容仍会留在实时资讯中，不会被提升为精选。')}</p>
  <p>${v.say('Daily picks and new Bond editions are prepared automatically from available source excerpts, but publishing remains off until the quality checks are reliable in regular operation. When enabled, each note needs usable source text, exact supporting passages, language and attribution checks, and a separate AI comparison with the source. The process is automatic, not a human fact-check.','每日精选和新的「连结」会根据可获取的来源摘录自动准备，但在质量检查能够稳定运行前，不会自动发布。启用后，每则摘要须有足够的来源文字、逐条对应的原文依据，经过语言及署名检查，再由另一轮 AI 对照来源审核。整个流程自动运行，不是人工事实核查。')}</p>
  <p>${v.say('We aim for three picks per column, no repeated publisher or author in an edition, a range of creative subjects, and Chinese originals when suitable material is available. When quality or the daily computing allowance is insufficient, there are fewer picks or the previous dated edition remains. The Bond adds a connection between two validated stories only when it has something specific to say.','每期争取每栏三篇，不重复作者或刊物，兼顾不同创作主题，并在有合适内容时纳入中文原创。内容质量或每日算力额度不足时，篇数会减少，或继续显示上一期的真实日期。「连结」只在有具体可说的关联时，才把两篇经过检查的内容放在一起。')}</p>
  <h2>${v.say('Coverage, not popularity','收录分布，并非热度排行')}</h2><p>${v.say('This week’s mix counts unique items discovered in each column in seven days. Trending counts distinct tracked sources mentioning a link in 24 hours. Neither measures the whole web or public opinion. Sources change as we find useful writing; suggestions are welcome.','「本周资讯分布」统计七天内在各栏发现的不重复内容。「热门」统计 24 小时内提到同一链接的不同关注来源数量。两者都不代表整个互联网或公众意见。我们会继续寻找好内容，也欢迎推荐来源。')}</p>
  <h2>${v.say('Your reading stays yours','阅读记录留在你手里')}</h2><p>${v.say('Saved stories (up to 100) and your last-visit marker stay in this browser. They do not sync between devices. We collect daily aggregate counts of visits, returning-browser visits, source opens, saves and shares. No server-side visitor identifier or search text is stored by these counters. Cloudflare may process request logs to operate and secure the service. Browser privacy signals disable optional event counts.','最多 100 条收藏和上次访问标记保存在这个浏览器，不会跨设备同步。我们按天汇总访问、回访、打开原文、收藏及分享次数；这些计数不保存服务器端访客标识或搜索词。Cloudflare 可能为运行和保护服务处理请求日志。浏览器隐私信号会关闭可选的事件计数。')}</p>
  <h2>${v.say('A small, rolling archive','小而流动的存档')}</h2><p>${v.say('We retain up to 1,000 live items: seven days for AI coverage, thirty for culture, measured from discovery. The latest 50 daily editions and 50 Bond editions keep compact source credits. Original works belong to their creators. We link to sources and publish short notes rather than storing full articles.','实时资讯最多保留 1,000 条：AI 栏从发现起保留七天，文化栏保留三十天。最近 50 期每日精选和 50 期「连结」保留简要来源信息。原作属于创作者，我们提供链接和简短笔记，不保存整篇文章。')}</p>
  <p><a href="${v.local('/sources')}">${v.t('Sources')}</a> · <a href="${v.local('/subscribe')}">RSS</a> · ${correction(v,'https://bond6.io')}</p></div>`);
}
export async function sourcesPage(env,v) {
  const {results}=await env.DB.prepare('SELECT id,ok_at,failures FROM source_state').all();
  const request=encodeURIComponent(v.say('Publication / account name:\nWebsite or feed URL:\nPrimary language:\nWhat it covers:\nWhy it belongs on Bond6:\n','媒体或账号名称：\n网站或订阅地址：\n主要语言：\n内容主题：\n为什么适合 Bond6：\n'));
  const groups=new Map();
  for (const source of sources) {
    const language=['sspai','gcores','chuapp'].includes(source.id)?'zh':'en';
    const key=language+'|'+source.name, group=groups.get(key)??{...source,language,items:[]}; group.items.push(source); groups.set(key,group);
  }
  const row=group=>{
    const states=group.items.map(source=>results.find(state=>state.id===source.id)).filter(Boolean);
    const ok=Math.max(0,...states.map(state=>state.ok_at??0)), retry=states.some(state=>state.failures>0);
    const types=[...new Set(group.items.map(source=>source.kind==='rss'?'RSS / Atom':'Bluesky'))].join(' + ');
    return `<li><div><a href="${esc(group.site)}">${esc(group.name)}</a><small>${v.t(group.topic)} · ${types}</small></div><span>${ok?date(ok,v):v.say('Awaiting check','等待检查')}${retry?' · '+v.say('Retrying','重试中'):''}</span></li>`;
  };
  const list=language=>[...groups.values()].filter(group=>group.language===language).sort((a,b)=>a.name.localeCompare(b.name)).map(row).join('');
  return html(v,v.t('Sources'),`<p class="feed-note">${v.t('Bond6 follows publishers, independent writers, and public accounts that cover writing, creative work, and life with AI. This list changes as we find new sources.')}</p><section class="source-invitation"><div><h2>${v.say('Help widen the reading','一起拓宽阅读范围')}</h2><p>${v.say('Know a publication, writer, newsletter, podcast, or public account worth following? Send its public URL, language, and a sentence on what makes it useful. We review suggestions before adding anything.','知道值得关注的媒体、作者、通讯、播客或公开账号？请发送公开链接、主要语言和一句推荐理由。所有建议都会经过审核，不会自动加入。')}</p><p>${v.say('No mail app? Write to info@bond6.io.','没有邮件客户端？请写信至 info@bond6.io。')}</p></div><a class="text-link" href="mailto:info@bond6.io?subject=Bond6%20source%20suggestion&body=${request}">${v.say('Suggest a source','推荐来源')} <span aria-hidden="true">→</span></a></section><section class="source-group"><h2>${v.say('English and other-language sources','英文及其他语言来源')}</h2><ul class="sources">${list('en')}</ul></section><section class="source-group"><h2>${v.say('Chinese-language sources','中文来源')}</h2><ul class="sources">${list('zh')}</ul></section>`);
}
export function subscribe(env,v) {
  const links=[...(env.GENERATED_PUBLISHING === 'true'?[['daily',null,v.say('Daily picks','每日精选')]]:[]),['live','human',v.t('Human Voices')],['live','ai',v.t('AI & Its Impact')],['bond',null,v.t('The Bond')],['live',null,v.say('All arrivals','全部新发现')]];
  return html(v,v.t('Subscribe'),`<p>${v.say('Choose a feed and paste its address into your RSS reader. Switch language above for the other edition.','选择一个订阅源，把地址粘贴到 RSS 阅读器里。切换页面语言即可获取另一语言的订阅源。')}</p><ul class="subscription-list">${links.map(([kind,lane,title])=>{const path=v.local('/feed.xml')+'?'+new URLSearchParams({kind,...(lane?{lane}:{})});return `<li><h2>${title}</h2><a href="${esc(path)}">https://bond6.io${esc(path)}</a></li>`;}).join('')}</ul>`);
}
export function savedPage(v) {
  return html(v,v.say('Saved stories','收藏的文章'),`<p class="feed-note">${v.say('Up to 100 stories, kept on this browser only. Clearing browser data removes them.','最多 100 条，仅保存在这个浏览器中。清除浏览器数据也会删除收藏。')}</p><button type="button" id="clear-saved" hidden>${v.say('Clear saved stories','清空收藏')}</button><div id="saved-list"></div><noscript><p class="notice">${v.say('Saved stories need JavaScript and browser storage. All other reading remains available.','收藏功能需要 JavaScript 和浏览器存储。其他阅读功能仍可使用。')}</p></noscript>`);
}
