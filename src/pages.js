import { html, esc, date, card, qlink, correction, actions } from './render.js';
import { DAY, classify, conversations, conversationTopic, dayKey, eventCrossCurrents, storyFocusKeys, storyTopics, subjects, subjectLabels } from './content.js';
import { sources, archivedSources, retiredSourceIds } from './sources.js';
import { editions as legacy } from './picks.js';
import { RHYTHM_VERSION } from './rhythm.js';
import { distinctStories } from './editorial.js';

const sourceTopics={
  'AI & public life':'AI 与公共生活','AI & society':'AI 与社会','AI development & impact':'AI 发展与影响','AI evidence & impact':'AI 证据与影响',
  'AI industry & impact':'AI 产业与影响','AI research & capability':'AI 研究与能力','AI research & industry':'AI 研究与产业','AI research & society':'AI 研究与社会',
  'AI systems & releases':'AI 系统与发布','AI systems & research':'AI 系统与研究','AI, products & digital life':'AI、产品与数字生活',
  'Arts & humanities':'艺术与人文','Climbing & embodied life':'攀岩与身体经验','Creative Practice':'创作实践','Creative life & conversation':'创意生活与对谈',
  'Culture & ideas':'文化与思想','Culture & learning':'文化与学习','Culture & public life':'文化与公共生活','Culture, books & lived ideas':'文化、书籍与生活思想',
  'Culture, design & curiosities':'文化、设计与好奇心','Design & architecture':'设计与建筑','Essays & literary life':'随笔与文学生活',
  'First-person accounts':'第一人称叙述','History & culture':'历史与文化','Humanities & cultural conversation':'人文与文化对谈','Humanities & daily life':'人文与日常生活',
  'Ideas & first-person essays':'思想与第一人称随笔','Life online':'网络生活','Life, running & reading':'生活、跑步与阅读','Literature':'文学',
  'Literature & writers':'文学与作家','Long-form writing':'长篇写作','Music':'音乐','Open AI tools & models':'开放 AI 工具与模型',
  'Outdoor life & endurance':'户外生活与耐力','Reading & personal essays':'阅读与个人随笔','Technology & society':'技术与社会',
  'Travel, reading & essays':'旅行、阅读与随笔','Visual arts':'视觉艺术','Writers & literature':'作家与文学','Writing & publishing':'写作与出版'
};

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
const relativeChecked=(timestamp,v)=>{const minutes=Math.max(0,Math.floor((Date.now()-timestamp)/60000));return minutes<60?v.say(` · ${minutes} minutes ago`,` · ${minutes} 分钟前`):v.say(` · ${Math.floor(minutes/60)} hours ago`,` · ${Math.floor(minutes/60)} 小时前`);};
const laneName=(lane,v)=>v.t(lane==='human'?'Human Pulse':'AI Wave');
const cursorFrom=v=>{
  const discoveredAt=Number(v.url.searchParams.get('before')), url=v.url.searchParams.get('before_url')??'';
  if (!Number.isSafeInteger(discoveredAt)||discoveredAt<=0||url.length>2048) return null;
  try { const parsed=new URL(url); return /^https?:$/.test(parsed.protocol)?{discoveredAt,url}:null; } catch { return null; }
};
const olderStory=(stories=[])=>stories.reduce((oldest,story)=>{
  if (!Number.isSafeInteger(Number(story?.discovered_at))||!story?.url) return oldest;
  if (!oldest||Number(story.discovered_at)<Number(oldest.discovered_at)||(Number(story.discovered_at)===Number(oldest.discovered_at)&&story.url<oldest.url)) return story;
  return oldest;
},null);
const olderLink=(v,story,changes={})=>story?qlink(v,{view:'all',page:null,before:story.discovered_at,before_url:story.url,...changes}):null;
const bondBridges=[
  {key:'making',en:'Making & authorship',zh:'创作与署名',question:{en:'What remains personal when the tools of making change?',zh:'当创作工具改变时，哪些部分依然属于个人？'},pattern:/\b(?:artist|art|writer|author|author(ship)?|creator|creative work|making|music|musician|design)\b|创作|艺术家|作者|写作|音乐人|设计|署名/i},
  {key:'work',en:'Work & skills',zh:'工作与技能',question:{en:'Which parts of work should remain accountable to people?',zh:'工作中的哪些部分仍应由人承担责任？'},pattern:/\b(?:work|worker|job|labou?r|skill|career|employment|wage)\b|工作|劳动|就业|技能|职业|工资/i},
  {key:'attention',en:'Attention & community',zh:'注意力与社群',question:{en:'What deserves care when attention is being engineered?',zh:'当注意力被不断塑造时，什么值得被更认真地照料？'},pattern:/\b(?:attention|community|care|social|audience|friend|family|public)\b|注意力|社区|社群|关怀|公众|朋友|家人/i},
  {key:'trust',en:'Evidence & trust',zh:'证据与信任',question:{en:'What evidence helps people decide whom to trust?',zh:'什么样的证据能帮助人们决定信任谁？'},pattern:/\b(?:trust|proof|evidence|privacy|surveillance|rights|copyright|credit)\b|信任|证据|证明|隐私|监控|权利|版权|署名/i},
  {key:'access',en:'Tools & access',zh:'工具与可及性',question:{en:'Who gains agency when a tool becomes easier to use?',zh:'当工具变得更易使用时，谁获得了更多行动能力？'},pattern:/\b(?:tool|access|platform|software|technology|digital|system)\b|工具|平台|软件|技术|数字|系统/i}
];
const bondText=story=>`${story.title??''} ${story.excerpt??''}`;
const bridgeScore=(story,bridge)=>bridge.pattern.test(String(story.title??''))&&bridge.pattern.test(story.excerpt??'')?4:0;
const liveBondRoute=stories=>{
  const crossCurrent=eventCrossCurrents(stories).find(event=>event.stories.some(s=>s.lane==='human')&&event.stories.some(s=>s.lane==='ai'));
  if(crossCurrent){const human=crossCurrent.stories.find(s=>s.lane==='human');const ai=crossCurrent.stories.find(s=>s.lane==='ai'&&s.source_id!==human.source_id);if(ai)crossCurrent.stories=[human,ai,...crossCurrent.stories.filter(s=>s!==human&&s!==ai)];else return null;}
  if (crossCurrent) return {kind:'event',event:crossCurrent,freshness:crossCurrent.latest};
  const usable=stories.filter(story=>(story?.lane==='human'||story?.lane==='ai')&&(story.excerpt?.length??0)>=60);
  const routes=[];
  for(const bridge of bondBridges){
    const matching=usable.map(story=>({story,score:bridgeScore(story,bridge)})).filter(candidate=>candidate.score>=4);
    const human=matching.filter(candidate=>candidate.story.lane==='human'), ai=matching.filter(candidate=>candidate.story.lane==='ai');
    if(!human.length||!ai.length)continue;
    const independentAi=ai.find(candidate=>candidate.story.source_id!==human[0].story.source_id);
    if(!independentAi)continue;
    ai.splice(ai.indexOf(independentAi),1);ai.unshift(independentAi);
    const pair=[human[0].story,ai[0].story], third=[...human.slice(1),...ai.slice(1)].map(candidate=>candidate.story).find(story=>story.source_id!==pair[0].source_id&&story.source_id!==pair[1].source_id)??null;
    routes.push({bridge,human:pair[0],ai:pair[1],third,freshness:Math.max(...pair.map(story=>Number(story.discovered_at)||0))});
  }
  return routes.sort((a,b)=>b.freshness-a.freshness)[0]??null;
};
// Save only evidence-qualified routes, with a stable identity derived from
// their source links. Repeated scheduler runs never create duplicate editions.
export async function archiveBondRoutes(db,now=Date.now()) {
  for(const language of ['en','zh']) {
    const {results}=await db.prepare(`SELECT * FROM stories s WHERE s.lane IS NOT NULL AND s.original_lang=? AND s.discovered_at>=?
      AND NOT EXISTS(SELECT 1 FROM source_catalogue c WHERE c.id=s.source_id AND c.language<>?)
      ORDER BY s.discovered_at DESC,s.url DESC LIMIT 120`).bind(language,now-7*DAY,language).all();
    const route=liveBondRoute(focusedStories(results));
    if(!route)continue;
    const compact=s=>s&&Object.fromEntries(['url','title','author','source','source_id','lane','excerpt','discovered_at'].map(key=>[key,s[key]??null]));
    if(route.kind==='event')route.event.stories=route.event.stories.slice(0,3).map(compact);
    else {route.human=compact(route.human);route.ai=compact(route.ai);route.third=compact(route.third);const {pattern,...bridge}=route.bridge;route.bridge=bridge;}
    const stories=route.kind==='event'?route.event.stories:[route.human,route.ai,route.third].filter(Boolean);
    const identity=JSON.stringify([language,route.kind,route.kind==='event'?route.event.key:route.bridge.key,stories.map(s=>s.url).sort()]);
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity));
    const id='route-'+Array.from(new Uint8Array(digest).slice(0,16),b=>b.toString(16).padStart(2,'0')).join('');
    await db.prepare('INSERT OR IGNORE INTO bond_routes(id,language,created_at,snapshot) VALUES(?,?,?,?)').bind(id,language,now,JSON.stringify(route)).run();
  }
  await db.prepare('DELETE FROM bond_routes WHERE id IN (SELECT id FROM bond_routes ORDER BY created_at DESC,id DESC LIMIT -1 OFFSET 50)').run();
}
const bondNode=(story,lane,v)=>`<a class="bond-route-node ${lane}" href="${esc(story.url)}" data-event="original" data-focus="${esc(storyFocusKeys(story).join(','))}"><span>${laneName(lane,v)}</span><strong>${esc(story.title)}</strong><small>${esc(story.author&&story.author!==story.source?story.author+' · '+story.source:story.source)}</small></a>`;
const bondEventNode=(story,v)=>`<a class="bond-route-node event-source ${story.lane==='human'?'human':'ai'}" href="${esc(story.url)}" data-event="original" data-focus="${esc(storyFocusKeys(story).join(','))}"><span>${v.say('Source report','来源报道')}</span><strong>${esc(story.title)}</strong><small>${esc(story.author&&story.author!==story.source?story.author+' · '+story.source:story.source)}</small></a>`;
const eventRouteMap=(route,v)=>{
  const event=route.event, title=v.zh?event.zh:event.en;
  const status=event.status==='under-review'?v.say('Claims under independent review','证明主张仍待独立核验'):v.say('Multiple independent reports','多个报道来源报道');
  const explanation=event.status==='under-review'
    ?v.say('Source reporting tracks an AI-assisted claim alongside a human contribution. Bond6 presents this as a developing claim, not as a settled result.','来源报道同时追踪 AI 参与的证明主张与人类贡献。Bond6 将其作为正在发展的主张呈现，并不把它当作既成结论。')
    :v.say('Source reports connect human mathematical work with AI-assisted research.','来源报道将人类数学工作与 AI 参与的研究并置起来。');
  const [first,second,...rest]=event.stories;
  return `<section class="bond-route-map bond-event-route" aria-labelledby="bonding-route-title"><header><span class="bond-kicker">${v.say('Event cross-current','同题交汇')}</span><h2 id="bonding-route-title">${esc(title)}</h2><p>${explanation}</p></header><div class="bond-route-diagram">${bondEventNode(first,v)}<div class="bond-bridge"><span>${v.say('Status','状态')}</span><strong>${status}</strong><small>${v.say(`${event.sources} reporting sources`,`来自 ${event.sources} 个报道来源`)}</small><i aria-hidden="true">↔</i></div>${bondEventNode(second,v)}</div>${rest[0]?`<div class="bond-third">${v.say('A third reading','第三篇延伸阅读')} ${bondEventNode(rest[0],v)}</div>`:''}<div class="bond-response"><p>${v.say('What does AI assistance change in mathematical discovery — and what must still be independently checked?','AI 的参与会怎样改变数学发现？又有哪些部分仍必须接受独立核验？')}</p><a href="mailto:info@bond6.io?subject=${encodeURIComponent('Bond6 event cross-current | '+event.en)}">${v.t('Share your experience')}</a></div></section>`;
};
const bondRouteMap=(route,v)=>route.kind==='event'?eventRouteMap(route,v):`<section class="bond-route-map" aria-labelledby="bonding-route-title"><header><span class="bond-kicker">${v.say('Bonding route','连结路线')}</span><h2 id="bonding-route-title">${v.say('A pressure to read together','一组值得一起读的张力')}</h2><p>${v.say('Bond6 pairs recent stories with a shared, visible bridge. This is an invitation to compare, not a claim that their authors agree.','Bond6 用可见的共同线索并置近期文章。这是一份并读邀请，并不意味着作者观点一致。')}</p></header><div class="bond-route-diagram">${bondNode(route.human,'human',v)}<div class="bond-bridge"><span>${v.say('Bridge','连结')}</span><strong>${esc(v.zh?route.bridge.zh:route.bridge.en)}</strong><i aria-hidden="true">↔</i></div>${bondNode(route.ai,'ai',v)}</div>${route.third?`<div class="bond-third">${v.say('A third reading','第三篇延伸阅读')} ${bondNode(route.third,route.third.lane,v)}</div>`:''}<div class="bond-response"><p>${esc(v.zh?route.bridge.question.zh:route.bridge.question.en)}</p><a href="mailto:info@bond6.io?subject=${encodeURIComponent('Bond6 Bonding route | '+route.bridge.en)}">${v.t('Share your experience')}</a></div></section>`;
const bondRouteTeaser=(route,v)=>route.kind==='event'?`<aside class="bond-teaser bond-teaser-live bond-event-teaser"><div><span class="bond-kicker">${v.say('Event cross-current','同题交汇')}</span><p>${v.say('Source reports where human work and AI claims meet.','人类工作与 AI 主张相遇时的来源报道。')}</p></div><a href="${v.local('/bonding')}"><span class="bond-route">${route.event.status==='under-review'?v.say('Under review','核验中'):v.say('Multiple reports','多源报道')} <b aria-hidden="true">·</b> ${v.say(`${route.event.sources} sources`,`${route.event.sources} 个来源`)}</span><strong>${esc(v.zh?route.event.zh:route.event.en)}</strong><span class="bond-arrow" aria-hidden="true">→</span></a></aside>`:`<aside class="bond-teaser bond-teaser-live"><div><span class="bond-kicker">${v.t('Bonding')}</span><p>${v.say('A Bonding route between Human Pulse and AI Wave.','一条连接「人文脉动」与「AI冲击波」的连结路线。')}</p></div><a href="${v.local('/bonding')}"><span class="bond-route">${v.t('Human Pulse')} <b aria-hidden="true">×</b> ${v.t('AI Wave')}</span><strong>${esc(v.zh?route.bridge.zh:route.bridge.en)}</strong><span class="bond-arrow" aria-hidden="true">→</span></a></aside>`;
// A source refresh should take effect immediately. Historical records remain in
// D1 for bounded retention and edition attribution, but must not keep appearing
// in a live lane after their source has been retired.
const focusedStories=rows=>distinctStories(rows.filter(story=>!retiredSourceIds.has(story.source_id) && classify(story.title??'',story.excerpt??'',sources.find(source=>source.id===story.source_id)).lane===story.lane).map(story=>({...story,subject:classify(story.title??'',story.excerpt??'',sources.find(source=>source.id===story.source_id)).subject})));
// A lively publisher should contribute to Bond6 without becoming the whole
// reading experience. The homepage has a tighter SQL cap; archives use this
// equivalent cap for special result sets such as Focusing.
const capBySource=(rows,limit=2)=>{
  const seen=new Map();
  return rows.filter(story=>{
    const source=story.source_id??story.source??'';
    const count=seen.get(source)??0;
    if(count>=limit)return false;
    seen.set(source,count+1);return true;
  });
};
const laneSignature=(lane,v)=>lane==='human'
  ?`<div class="lane-character lane-character-human" aria-hidden="true">${owl('perch')}</div><div class="lane-signature human-signature" aria-hidden="true"><span class="heartbeat" aria-hidden="true"><svg viewBox="0 0 120 30" focusable="false"><g class="heartbeat-heart"><path d="M15 26 3.8 15.4C-2 9.8 1.7 2.1 8.8 2.1c3.1 0 5.3 1.8 6.2 4 1-2.2 3.1-4 6.3-4 7.1 0 10.7 7.7 5 13.3Z"/></g><path class="heartbeat-baseline" d="M42 16h76"/><g class="heartbeat-wave"><path d="M-13 16h8l3-5 4 11 5-18 5 18 4-9 4 3h8"/><path d="M39 16h8l3-5 4 11 5-18 5 18 4-9 4 3h8"/></g></svg></span><span><b>37°C</b> · ${v.say('slow current','缓慢脉动')}</span></div>`
  :`<div class="lane-character lane-character-ai" aria-hidden="true">${robot('perch')}</div><div class="lane-signature ai-signature" aria-hidden="true"><span class="digital-flow" aria-hidden="true"><span>101001&nbsp;101001&nbsp;101001&nbsp;</span></span><span>${v.say('fast signal','快速信号')}</span></div>`;

const owl=(name)=>{
  if(name==='pocket')return `<svg class="mascot mascot-owl owl-pocket" viewBox="0 0 140 140" aria-hidden="true" focusable="false"><ellipse class="owl-body" cx="70" cy="80" rx="39" ry="48"/><path class="owl-wing wing-left" d="M38 73q-20 20-6 46 11-1 20-16Z"/><path class="owl-wing wing-right" d="M102 73q20 20 6 46-11-1-20-16Z"/><ellipse class="owl-belly" cx="70" cy="94" rx="27" ry="33"/><g class="owl-turning-head"><path class="owl-crown" d="M30 59 36 25l15 12q19-10 38 0l15-12 6 34q-2 24-40 25T30 59Z"/><circle class="owl-eye-disc" cx="51" cy="57" r="18"/><circle class="owl-eye-disc" cx="89" cy="57" r="18"/><circle class="owl-iris" cx="51" cy="57" r="11"/><circle class="owl-iris" cx="89" cy="57" r="11"/><circle class="owl-pupil-dot" cx="51" cy="57" r="6"/><circle class="owl-pupil-dot" cx="89" cy="57" r="6"/><path class="owl-beak" d="m64 69 6-10 6 10-6 12Z"/></g><path class="owl-feather-lines" d="M55 92q15 9 30 0M53 103q17 10 34 0M56 114q14 8 28 0"/><path class="owl-feet" d="M55 127v6m-9-1 9 1 8-1m22-5v6m-8-1 8 1 9-1"/></svg>`;
  if(name==='barn')return `<svg class="mascot mascot-owl owl-barn" viewBox="0 0 140 140" aria-hidden="true" focusable="false"><path class="barn-body" d="M33 57q0-31 37-31t37 31v43q0 30-37 30t-37-30Z"/><path class="barn-wing left" d="M35 68q-18 24-5 50 15-12 20-29Z"/><path class="barn-wing right" d="M105 68q18 24 5 50-15-12-20-29Z"/><g class="owl-turning-head"><path class="barn-face" d="M70 34c22-18 43 0 33 24-7 17-23 31-33 36-10-5-26-19-33-36-10-24 11-42 33-24Z"/><circle class="barn-eye" cx="53" cy="59" r="13"/><circle class="barn-eye" cx="87" cy="59" r="13"/><circle class="barn-pupil" cx="53" cy="59" r="6"/><circle class="barn-pupil" cx="87" cy="59" r="6"/><path class="owl-beak" d="m64 73 6-9 6 9-6 10Z"/></g><path class="barn-chest" d="M51 100q19 12 38 0m-34 12q15 9 30 0"/><path class="owl-feet" d="M55 127v6m-9-1 9 1 8-1m22-5v6m-8-1 8 1 9-1"/></svg>`;
  return `<svg class="mascot mascot-owl owl-perch" viewBox="0 0 140 140" aria-hidden="true" focusable="false"><path class="perch-branch" d="M21 119q48-16 101-3M43 119l-10 10m54-13 11 11"/><path class="perch-body" d="M40 55q0-28 30-28t30 28v42q0 24-30 24t-30-24Z"/><path class="perch-wing left" d="M42 72q-16 17-5 37 13-9 17-23Z"/><path class="perch-wing right" d="M98 72q16 17 5 37-13-9-17-23Z"/><g class="owl-turning-head"><g class="perch-front"><path class="perch-head" d="M35 55 41 26l13 10q16-9 32 0l13-10 6 29q0 26-35 26T35 55Z"/><circle class="perch-glass" cx="51" cy="57" r="16"/><circle class="perch-glass" cx="89" cy="57" r="16"/><path class="perch-bridge" d="M67 57h6"/><circle class="perch-eye" cx="51" cy="57" r="8"/><circle class="perch-eye" cx="89" cy="57" r="8"/><circle class="perch-pupil" cx="51" cy="57" r="4"/><circle class="perch-pupil" cx="89" cy="57" r="4"/><path class="owl-beak" d="m64 72 6-9 6 9-6 10Z"/></g><g class="perch-threequarter perch-threequarter-right"><path class="perch-quarter-head" d="M38 54q4-27 30-28 27 3 34 28-6 22-30 27-25-3-34-27Z"/><ellipse class="perch-quarter-glass small" cx="52" cy="56" rx="11" ry="14"/><ellipse class="perch-quarter-glass large" cx="84" cy="56" rx="18" ry="19"/><circle class="perch-quarter-eye" cx="52" cy="56" r="5"/><circle class="perch-quarter-eye" cx="84" cy="56" r="9"/><circle class="perch-quarter-pupil" cx="54" cy="56" r="2.5"/><circle class="perch-quarter-pupil" cx="88" cy="56" r="4.5"/><path class="perch-quarter-beak" d="m78 67 15 6-15 7Z"/></g><g class="perch-threequarter perch-threequarter-left" transform="translate(140 0) scale(-1 1)"><path class="perch-quarter-head" d="M38 54q4-27 30-28 27 3 34 28-6 22-30 27-25-3-34-27Z"/><ellipse class="perch-quarter-glass small" cx="52" cy="56" rx="11" ry="14"/><ellipse class="perch-quarter-glass large" cx="84" cy="56" rx="18" ry="19"/><circle class="perch-quarter-eye" cx="52" cy="56" r="5"/><circle class="perch-quarter-eye" cx="84" cy="56" r="9"/><circle class="perch-quarter-pupil" cx="54" cy="56" r="2.5"/><circle class="perch-quarter-pupil" cx="88" cy="56" r="4.5"/><path class="perch-quarter-beak" d="m78 67 15 6-15 7Z"/></g><g class="perch-profile perch-profile-right"><path class="perch-side-head" d="M44 54q5-28 29-25 24 5 30 27-6 20-28 25-23-1-31-27Z"/><ellipse class="perch-side-glass" cx="79" cy="56" rx="17" ry="19"/><circle class="perch-side-eye" cx="80" cy="56" r="8"/><circle class="perch-side-pupil" cx="83" cy="56" r="4"/><path class="perch-side-beak" d="m99 65 17 7-17 6Z"/></g><g class="perch-profile perch-profile-left" transform="translate(140 0) scale(-1 1)"><path class="perch-side-head" d="M44 54q5-28 29-25 24 5 30 27-6 20-28 25-23-1-31-27Z"/><ellipse class="perch-side-glass" cx="79" cy="56" rx="17" ry="19"/><circle class="perch-side-eye" cx="80" cy="56" r="8"/><circle class="perch-side-pupil" cx="83" cy="56" r="4"/><path class="perch-side-beak" d="m99 65 17 7-17 6Z"/></g></g><path class="perch-feet perch-foot-left" d="M59 110v11m-7 0h14"/><path class="perch-feet perch-foot-right" d="M81 110v11m-7 0h14"/><path class="perch-book" d="M48 93q11-5 22 3 11-8 22-3v20q-11-5-22 3-11-8-22-3Z"/><path class="perch-pages" d="M70 96v20"/></svg>`;
};
const robot=(name)=>{
  if(name==='pocket'||name==='perch')return `<svg class="mascot mascot-robot robot-picker robot-picker-machine" viewBox="0 0 140 140" aria-hidden="true" focusable="false"><path class="machine-shadow" d="M33 122h74"/><path class="picker-antenna" d="M70 27V14"/><circle class="picker-ping" cx="70" cy="11" r="5"/><rect class="picker-body" x="37" y="30" width="66" height="58" rx="16"/><rect class="picker-screen" x="47" y="42" width="46" height="28" rx="7"/><path class="machine-panel" d="M51 76h38m-30 5h6m10 0h6"/><circle class="picker-eye" cx="60" cy="56" r="5"/><circle class="picker-eye" cx="80" cy="56" r="5"/><g class="machine-arm machine-arm-left"><path class="machine-link" d="M40 64H29v16H18"/><circle class="machine-joint" cx="29" cy="64" r="4"/><circle class="machine-joint" cx="29" cy="80" r="4"/><path class="machine-grip" d="M18 80v-6m0 6-6 5m6-5 6 5"/></g><g class="machine-arm machine-arm-right"><path class="machine-link" d="M100 64h11V48h9"/><circle class="machine-joint" cx="111" cy="64" r="4"/><circle class="machine-joint" cx="111" cy="48" r="4"/><circle class="picker-lens" cx="120" cy="42" r="9"/></g><g class="machine-leg machine-leg-left"><path class="machine-link" d="M57 89v12h-8v12"/><circle class="machine-joint" cx="57" cy="101" r="4"/><path class="machine-foot" d="M49 113h-9"/></g><g class="machine-leg machine-leg-right"><path class="machine-link" d="M83 89v12h8v12"/><circle class="machine-joint" cx="83" cy="101" r="4"/><path class="machine-foot" d="M91 113h9"/></g><path class="picker-mouth" d="M61 76h18"/></svg>`;
  if(name==='barn')return `<svg class="mascot mascot-robot robot-rover" viewBox="0 0 140 140" aria-hidden="true" focusable="false"><path class="rover-shadow" d="M30 113h80"/><path class="rover-track" d="M33 92h74q13 0 13 12t-13 12H33q-13 0-13-12t13-12Z"/><circle class="rover-wheel" cx="45" cy="104" r="7"/><circle class="rover-wheel" cx="95" cy="104" r="7"/><rect class="rover-body" x="33" y="47" width="74" height="48" rx="12"/><rect class="rover-window" x="46" y="58" width="48" height="22" rx="7"/><path class="rover-scanline" d="M50 69h40"/><path class="rover-mast" d="M70 47V26"/><g class="rover-radar"><path d="M70 17v12m-9-4 9-8 9 8"/><circle cx="70" cy="17" r="13"/></g><path class="rover-claw" d="M106 72h17l6-9m-6 9 6 9"/></svg>`;
  return `<svg class="mascot mascot-robot robot-picker robot-picker-3d" viewBox="0 0 140 140" aria-hidden="true" focusable="false"><ellipse class="picker-shadow" cx="70" cy="119" rx="40" ry="7"/><path class="picker-back" d="M42 40 54 29h49l-10 12v49l-10 11H42Z"/><rect class="picker-body" x="32" y="40" width="61" height="52" rx="18"/><path class="picker-top" d="M39 40 52 29h50l-9 11Z"/><path class="picker-side" d="M93 40l10-11v51L93 92Z"/><path class="picker-antenna" d="M63 30V15"/><circle class="picker-ping" cx="63" cy="12" r="5"/><rect class="picker-screen" x="43" y="52" width="40" height="25" rx="10"/><circle class="picker-eye" cx="55" cy="64" r="5"/><circle class="picker-eye" cx="72" cy="64" r="5"/><g class="picker-arm picker-arm-left"><path d="M35 69 18 87l8 12"/><circle class="picker-hand" cx="27" cy="101" r="7"/></g><g class="picker-arm picker-arm-right"><path d="M91 69l17-17 6 9"/><circle class="picker-lens" cx="114" cy="47" r="9"/></g><path class="picker-legs" d="M51 93v18m-12 7 12-7 10 7m17-25v18m-10 7 10-7 12 7"/><path class="picker-mouth" d="M56 83h14"/></svg>`;
};
const mascotPairs=[
  {key:'pocket',title:['Pocket Owl & Picker','口袋猫头鹰与采集机器人'],note:['Closest to your reference: a round little owl with wings, belly feathers, feet, a tiny beak, and very large forward eyes. The picker robot reaches with a magnifier as it searches.','最接近你的参考图：圆滚滚的小猫头鹰，有翅膀、肚子羽毛、脚、细小鸟喙和正面大眼睛。采集机器人会伸出放大镜搜索。']},
  {key:'barn',title:['Barn Owl & Rover','仓鸮与漫游机器人'],note:['A clearly recognisable heart-faced owl, closer to a storybook bird than a logo. Its rover companion rolls, scans with radar, and reaches a small claw toward a find.','心形脸一眼就能认出的仓鸮，更像绘本里的鸟，而不是抽象标志。漫游机器人会滚动、雷达扫描，并用小爪子伸向发现物。']},
  {key:'perch',title:['Library Owl & Picker','书房猫头鹰与采集机器人'],note:['A playful editorial owl with round spectacles, a tiny book, and a branch. Its flat high-tech picker has jointed machine arms, mechanical feet, a gripper, and a magnifier for interesting finds.','带圆眼镜、小书和树枝的俏皮编辑猫头鹰。二维高科技采集机器人有分节机械臂、机械脚、夹爪和放大镜，用来搜索有趣的发现。']}
];
export function mascotLab(v) {
  const cards=mascotPairs.map(pair=>`<article class="mascot-option mascot-${pair.key}"><header><span class="option-number">0${mascotPairs.indexOf(pair)+1}</span><h2>${v.say(pair.title[0],pair.title[1])}</h2></header><div class="mascot-lanes"><section class="mascot-lane mascot-human"><div>${owl(pair.key)}</div><p><b>${v.t('Human Pulse')}</b><br>${pair.key==='perch'?v.say('Quiet library owl','安静的书房猫头鹰'):v.say('Blinking, turning owl','眨眼、转头的猫头鹰')}</p></section><section class="mascot-lane mascot-ai"><div>${robot(pair.key)}</div><p><b>${v.t('AI Wave')}</b><br>${pair.key==='perch'?v.say('High-tech machine picker','高科技机械采集器'):v.say('Scanning little robot','扫描中的小机器人')}</p></section></div><p class="mascot-note">${v.say(pair.note[0],pair.note[1])}</p></article>`).join('');
  return html(v,v.say('Mascot Lab','角色实验室'),`<section class="mascot-intro"><p class="eyebrow">Bond6 Rhythm · ${v.say('local design study','本地设计试验')}</p><h1>${v.say('Choose the two scouts','选择这一对小侦察员')}</h1><p>${v.say('Each option places a friendly owl with Human Pulse and a small robot with AI Wave. The motion is intentionally occasional, and stops when a reader prefers reduced motion. This page is not linked or published yet.','每套方案都会把友好的猫头鹰放在「人文脉动」，小机器人放在「AI冲击波」。动画会克制地偶尔出现，且在用户偏好减少动态效果时停止。此页尚未链接或发布。')}</p></section><div class="mascot-options">${cards}</div><p class="feed-note">${v.say('Tell me the option number—or which owl and robot you would like combined.','告诉我你选的编号，或想混搭哪只猫头鹰和哪个机器人。')}</p>`,{wide:true,description:v.say('Three Bond6 mascot concepts for Human Pulse and AI Wave.','三组用于「人文脉动」与「AI冲击波」的 Bond6 角色方案。')});
}

function mix(stats,v,lane,desktopLane='both') {
  const human=stats?.human??0, ai=stats?.ai??0;
  return `<section class="activity-bar" aria-label="${v.say('Flow balance','本周内容分布')}"><div class="flow-balance-heading"><details><summary>${v.say('Flow balance','本周内容分布')}</summary><p>${v.say('Unique items discovered during the last seven days. This describes Bond6’s collection, not popularity or public opinion.','过去七天内发现的不重复内容。这是 Bond6 收录内容的分布，并不代表热度或公众意见。')}</p></details><div class="flow-balance-counts" aria-label="${v.say(`Human Pulse ${human}; AI Wave ${ai}`,`人文脉动 ${human}；AI冲击波 ${ai}`)}"><span class="human-count"><b>${human}</b>${v.t('Human Pulse')}</span><span class="ai-count"><b>${ai}</b>${v.t('AI Wave')}</span></div></div>
    <div class="flow-balance-controls">${human+ai?`<progress aria-label="${v.t('Human Pulse share of recent stories')}" value="${human}" max="${human+ai}"></progress>`:''}<nav class="lane-view-switch" data-view="${desktopLane}" aria-label="${v.say('Select a reading lane','选择阅读栏目')}"><a class="human" href="${esc(qlink(v,{lane:'human',page:null}))}"${desktopLane==='human'?' aria-current="true"':''}>${v.t('Human Pulse')}</a><a class="both-circle" href="${esc(qlink(v,{lane:null,page:null}))}"${desktopLane==='both'?' aria-current="true"':''} aria-label="${v.say('Show both lanes','显示双栏')}"><span class="visually-hidden">${v.say('Both','双栏')}</span></a><a class="ai" href="${esc(qlink(v,{lane:'ai',page:null}))}"${desktopLane==='ai'?' aria-current="true"':''}>${v.t('AI Wave')}</a></nav></div></section>`;
}
function filters(v) {
  const selected=v.url.searchParams.get('topic')??'';
  return `<nav class="topic-filters" aria-label="${v.say('Topics in the current flow','当前资讯主题')}">${[['',v.say('All','全部')],...subjects.map(s=>[s,v.t(subjectLabels[s])])].map(([s,label])=>`<a href="${esc(qlink(v,{topic:s||null,page:null,before:null,before_url:null}))}"${selected===s?' aria-current="true"':''}>${label}</a>`).join('')}</nav>`;
}
function conversationStrip(topics,v,{empty=false}={}) {
  if (!topics.length&&!empty) return '';
  const explanation=v.say('Strong signals have three or more reporting sources. Emerging signals have two; reader pulse is anonymous, aggregate interest from Bond6 readers.','强信号来自至少三个报道来源；新兴信号来自两个。读者脉动是 Bond6 读者匿名汇总的兴趣信号。');
  const label=topic=>topic.kind==='event'
    ?v.say(`${topic.status==='under-review'?'Under review':'Multiple reports'} · ${topic.sources} sources`,`${topic.status==='under-review'?'核验中':'多源报道'} · ${topic.sources} 个来源`)
    :topic.strength==='strong'?v.say(`Strong · ${topic.sources} sources`,`强信号 · ${topic.sources} 个来源`):topic.strength==='emerging'?v.say(`Emerging · ${topic.sources} sources`,`新兴 · ${topic.sources} 个来源`):v.say(`Reader pulse · ${topic.readers} opens`,`读者脉动 · ${topic.readers} 次打开`);
  return `<section class="conversation-strip" aria-labelledby="conversation-heading"><header class="signal-copy"><div><span class="signal-kicker">${v.say('Focusing signals','关注信号')}</span><h2 id="conversation-heading">${v.say('What is gathering attention','正在形成关注的主题')}</h2><p>${explanation}</p></div><span class="signal-window">${v.say('Last 7 days','近 7 日')}</span></header>${topics.length?`<nav aria-label="${v.say('Focusing signals','关注信号')}">${topics.map((topic,index)=>`<a class="signal-${topic.strength}${topic.kind==='event'?' signal-event':''}" href="${esc(qlink(v,{signal:topic.key,view:'all',page:null,q:null,before:null,before_url:null},'/focusing'))}"><span class="signal-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span class="signal-topic">${v.zh?topic.zh:topic.en}</span><span class="signal-count">${label(topic)}</span></a>`).join('')}</nav>`:`<p class="signal-empty">${v.say('No emerging focus has formed in this language yet this week.','本周该语言版本暂未形成新兴关注主题。')}</p>`}</section>`;
}
export async function home(env,v,{trending=false}={}) {
  const db=env.DB, now=Date.now(), search=(v.url.searchParams.get('q')??'').trim().slice(0,120), originalLanguage=v.zh?'zh':'en';
  // Keep a previously misclassified card out of the opposite edition while
  // scheduled collection corrects its stored language on the next refresh.
  const sourceLanguageGuard=alias=>`AND NOT EXISTS(SELECT 1 FROM source_catalogue language_catalogue WHERE language_catalogue.id=${alias}.source_id AND language_catalogue.language<>?)`;
  const subject=subjects.includes(v.url.searchParams.get('topic'))?v.url.searchParams.get('topic'):null;
  const requestedSignal=(v.url.searchParams.get('signal')??'').trim();
  let signal=conversationTopic(requestedSignal);
  const requestedLane=['human','ai'].includes(v.url.searchParams.get('lane'))?v.url.searchParams.get('lane'):null;
  const lane=requestedLane==='ai'?'ai':'human', desktopLane=requestedLane??'both';
  const continuationLane=['human','ai'].includes(v.url.searchParams.get('load'))?v.url.searchParams.get('load'):null;
  const requestedCursor=cursorFrom(v);
  const page=Math.max(1,Number(v.url.searchParams.get('page'))||1);
  if (!Number.isSafeInteger(page)||page>50) return html(v,v.t('Page unavailable'),`<p>${v.t('This page is outside the current feed.')}</p>`,{status:404});
  const archive=v.url.searchParams.get('view')==='all'||page>1||!!search||trending||!!continuationLane||!!requestedSignal;
  const cursor=archive?requestedCursor:null;
  const rhythmLive=env.RHYTHM_LIVE_RANKING==='true';
  const where=`s.lane IS NOT NULL AND s.original_lang=? ${sourceLanguageGuard('s')} ${continuationLane?'AND s.lane=?':''} ${cursor?'AND (s.discovered_at<? OR (s.discovered_at=? AND s.url<?))':''} AND NOT (s.content_type='post' AND EXISTS(SELECT 1 FROM stories article WHERE article.url=s.canonical_url AND article.url<>s.url)) AND NOT EXISTS(SELECT 1 FROM source_catalogue catalogue WHERE catalogue.id=s.source_id AND catalogue.state IN ('paused','retired')) ${subject?'AND s.subject=?':''} ${search?"AND instr(lower(s.title || ' ' || s.source || ' ' || coalesce(s.author,'')),lower(?))>0":''}`;
  const args=[originalLanguage,originalLanguage,...(continuationLane?[continuationLane]:[]),...(cursor?[cursor.discoveredAt,cursor.discoveredAt,cursor.url]:[]),...(subject?[subject]:[]),...(search?[search]:[])];
  // Joining signals only behind the gate lets a deploy calculate and audit
  // Rhythm without changing the chronological public feed.
  // Relevance should guide the Flow, but a week-old high score must not pin
  // the visible slots while newly accepted reporting arrives. This bounded
  // lift only affects the live display; Daily Picks retain their strict score.
  const freshnessLift=`CASE WHEN s.discovered_at>=${now-2*60*60_000} THEN 140 WHEN s.discovered_at>=${now-12*60*60_000} THEN 85 WHEN s.discovered_at>=${now-DAY} THEN 35 ELSE 0 END`;
  const liveCandidates=rhythmLive?`WITH candidates AS (
      SELECT s.*,r.rhythm_version,r.human_score AS rhythm_human_score,r.ai_score AS rhythm_ai_score,
        r.lane_recommendation AS rhythm_lane,r.confidence AS rhythm_confidence,r.labels AS rhythm_labels,r.evidence AS rhythm_evidence,
        CASE WHEN r.rhythm_version=${RHYTHM_VERSION} AND r.lane_recommendation=s.lane AND r.confidence>=0.72
          THEN r.confidence*100 + CASE WHEN s.lane='ai' THEN r.ai_score ELSE r.human_score END ELSE 0 END + ${freshnessLift} AS rhythm_live_score
      FROM stories s LEFT JOIN story_signals r ON r.story_url=s.url WHERE ${where}
    ), diverse AS (
      SELECT candidates.*,ROW_NUMBER() OVER(PARTITION BY lane,source ORDER BY rhythm_live_score DESC,discovered_at DESC,url DESC) AS publisher_rank FROM candidates
    )
    SELECT * FROM (SELECT diverse.*,ROW_NUMBER() OVER(PARTITION BY lane ORDER BY rhythm_live_score DESC,discovered_at DESC,url DESC) AS lane_rank FROM diverse WHERE publisher_rank<=2)
    WHERE lane_rank<=10 ORDER BY rhythm_live_score DESC,discovered_at DESC,url DESC`
    :`WITH diverse AS (SELECT s.*,ROW_NUMBER() OVER(PARTITION BY s.lane,s.source ORDER BY discovered_at DESC,url DESC) AS publisher_rank FROM stories s WHERE ${where})
      SELECT * FROM (SELECT diverse.*,ROW_NUMBER() OVER(PARTITION BY lane ORDER BY discovered_at DESC,url DESC) AS lane_rank FROM diverse WHERE publisher_rank<=2)
      WHERE lane_rank<=10 ORDER BY discovered_at DESC,url DESC`;
  const dailyLive=env.GENERATED_PUBLISHING === 'true';
  let stories=[],rawStories=[],mixStats=null,last=null,liveBond=null,activeConversations=[],edition=null;
  if (!archive) {
    const columns=await db.batch([
      db.prepare(liveCandidates).bind(...args),
      db.prepare(`SELECT count(CASE WHEN lane='human' THEN 1 END) AS human,count(CASE WHEN lane='ai' THEN 1 END) AS ai FROM stories s WHERE s.original_lang=? AND s.discovered_at>=? ${sourceLanguageGuard('s')}`).bind(originalLanguage,now-7*DAY,originalLanguage),
      db.prepare('SELECT max(ok_at) AS checked FROM source_state'),
      db.prepare(`SELECT * FROM stories s WHERE s.lane IS NOT NULL AND s.original_lang=? AND s.discovered_at>=? ${sourceLanguageGuard('s')} ORDER BY s.discovered_at DESC,s.url DESC LIMIT 60`).bind(originalLanguage,now-7*DAY,originalLanguage)
    ]);
    stories=focusedStories(columns[0].results);rawStories=columns[0].results;mixStats=columns[1].results[0];last=columns[2].results[0]?.checked;
    liveBond=liveBondRoute(focusedStories(columns[3].results));
    if(dailyLive)edition=await latestEdition(db,'daily');
  } else {
    const supporting=trending?await db.batch([
      db.prepare('SELECT max(ok_at) AS checked FROM source_state'),
      db.prepare(`SELECT * FROM stories s WHERE s.lane IS NOT NULL AND s.original_lang=? AND s.discovered_at>=? ${sourceLanguageGuard('s')} ORDER BY s.discovered_at DESC,s.url DESC LIMIT 60`).bind(originalLanguage,now-7*DAY,originalLanguage),
      db.prepare("SELECT event,sum(count) AS count FROM metrics WHERE day>=? AND event LIKE 'focus:%' GROUP BY event").bind(dayKey(now-7*DAY))
    ]):await db.batch([db.prepare('SELECT max(ok_at) AS checked FROM source_state')]);
    last=supporting[0].results[0]?.checked;
    if(trending) {
      activeConversations=conversations(focusedStories(supporting[1].results),now,new Map(supporting[2].results.map(row=>[row.event.slice(6),Number(row.count)])));
      // Event signals are calculated from current, language-specific reporting
      // rather than accepted as arbitrary URL values.
      if (!signal&&requestedSignal) signal=activeConversations.find(candidate=>candidate.key===requestedSignal)??null;
    }
    const result=trending&&!signal?{results:focusedStories(supporting[1].results).filter(story=>activeConversations.some(topic=>storyFocusKeys(story).includes(topic.key)))}
      :signal?await db.prepare(`SELECT s.* FROM stories s WHERE ${where} AND discovered_at>=? ORDER BY discovered_at DESC,url DESC LIMIT 120`).bind(...args,now-7*DAY).all()
      :await db.prepare(`WITH diverse AS (
        SELECT s.*,ROW_NUMBER() OVER(PARTITION BY s.source_id ORDER BY s.discovered_at DESC,s.url DESC) AS source_rank
        FROM stories s WHERE ${where}
      ) SELECT * FROM diverse WHERE source_rank<=2 ORDER BY discovered_at DESC,url DESC LIMIT 21${cursor?'':' OFFSET ?'}`).bind(...args,...(cursor?[]:[(page-1)*20])).all();
    rawStories=result.results;
    stories=capBySource(focusedStories(signal?result.results.filter(story=>story.discovered_at>=now-7*DAY&&storyFocusKeys(story).includes(signal.key)).slice(0,20):result.results));
  }
  const {results:mentions}=stories.length?await db.prepare(`SELECT url,link,source FROM mentions WHERE url IN(${stories.map(()=>'?').join(',')}) ORDER BY published_at DESC`).bind(...stories.map(s=>s.url)).all():{results:[]};
  const render=(s,{lead=false}={})=>card(s,v,{lead,rhythm:rhythmLive&&Number(s.rhythm_live_score)>0,mentions:mentions.filter(m=>m.url===s.url),focusKeys:storyFocusKeys(s)});
  const picks=(edition?.stories??[]).filter(s=>s.original_lang===originalLanguage&&(!subject||s.subject===subject));
  const caption=edition?`<a class="edition-date" href="${v.local('/edit/'+edition.id)}">${date(Date.parse(edition.date+'T12:00:00Z'),v)} <span aria-hidden="true">↗</span></a>`:'';
  const showDaily=Boolean(edition) || dailyLive;
  const dailyHeading=edition?.date===dayKey(now)?v.say('Today’s picks','今日精选'):v.say('Daily picks','每日精选');
  const column=l=>{
    const selected=picks.filter(s=>s.lane===l);
    const arrivals=stories.filter(s=>s.lane===l&&!selected.some(p=>p.url===s.url));
    const displayed=showDaily?[...selected,...arrivals]:arrivals;
    const continuation=olderLink(v,olderStory(displayed),{load:l});
    return `<section class="feed-column" id="${l}-feed"><header class="column-masthead">${laneSignature(l,v)}<h2>${laneName(l,v)}</h2><p>${l==='human'?v.say('Practice, care, and life made together.','创作、关怀，以及共同生活。'):v.say('Systems, speed, and their effects on people.','系统、速度，以及它们怎样影响人。')}</p></header>
    <div class="column-content">${showDaily?`<div class="section-label"><h3>${dailyHeading}</h3>${caption}</div>
    ${selected.length?selected.map(s=>card(s,v,{pick:true,editionId:edition.id})).join(''):`<p class="daily-empty">${edition?v.say('No picks in this subject for these daily picks.','本期没有这一主题的精选。'):v.say('Daily picks will appear here after automated publication is enabled.','自动发布启用后，每日精选会在这里出现。')}</p>`}
    ${selected.length?`<p class="edition-end">${v.say('That’s the selection. Stay curious.','本期精选到这里，继续保持好奇。')}</p>`:''}`:''}
    <div class="section-label arrivals-label"><h3>${v.say('Latest arrivals','最新发现')}</h3><div class="arrivals-tools"><span class="new-count" hidden></span><button class="refresh-arrivals" type="button" data-refresh-lane="${l}" hidden>${v.say('Load new arrivals','加载新内容')}</button></div></div>
    <div class="stories">${arrivals.length?arrivals.map((story,index)=>render(story,{lead:index===0})).join(''):`<p class="notice">${v.t('No recent stories in this section yet.')}</p>`}</div></div></section>`;
  };
  const topicResults=signal?v.say('Stories in “','「')+(v.zh?signal.zh:signal.en)+v.say('” from the sources we follow this week.','」：来自本周关注来源的相关文章。'):null;
  const visibleStories=stories.slice(0,20), nextCursor=!trending&&!signal&&rawStories.length>20?olderLink(v,olderStory(visibleStories)??olderStory(rawStories),{load:continuationLane}):null;
  const main=archive?`<p class="feed-note">${search?v.say('Search results for “','搜索结果：“')+esc(search)+'”':topicResults??(trending?v.say('Topics gathering attention across tracked sources and, when available, anonymous reader interest.','正在本站关注来源与匿名读者兴趣中形成关注的主题。'):v.say('All recent arrivals','所有近期发现'))}</p><div class="stories archive-stories">${stories.length?visibleStories.map(render).join(''):`<p class="notice">${search?v.t('No recent stories match your search. Try another word or phrase.'):v.say('No matching stories are available for this focus yet. Browse Latest for recent arrivals.','此关注主题暂时没有可显示的文章，请到最新页面阅读近期内容。')}</p>`}</div>
    <nav class="pagination" aria-label="${v.t('Story pages')}">${!cursor&&page>1?`<a href="${esc(qlink(v,{page:page-1,view:'all',before:null,before_url:null}))}">← ${v.say('Previous','上一页')}</a>`:''}${nextCursor?`<a data-next-page href="${esc(nextCursor)}">${v.t('Older stories')} →</a>`:''}<a href="${esc(qlink(v,{page:null,view:null,q:null,load:null,before:null,before_url:null},'/'))}">${v.t('Back to latest')}</a></nav>`
    :`<div class="feed-columns" data-lane="${lane}" data-desktop-lane="${desktopLane}">${['human','ai'].map(l=>{const markup=column(l), selected=picks.filter(s=>s.lane===l), arrivals=stories.filter(s=>s.lane===l&&!selected.some(p=>p.url===s.url)), displayed=showDaily?[...selected,...arrivals]:arrivals, href=olderLink(v,olderStory(displayed),{load:l})??qlink(v,{view:'all',page:null,load:l,before:null,before_url:null});return markup.replace('</div></div></section>',`</div><div class="infinite-lane-feed" data-infinite-lane-feed="${l}" hidden><div class="stories archive-stories" data-infinite-stories></div><p class="infinite-status" data-infinite-status aria-live="polite"></p></div><a class="infinite-trigger" data-infinite-trigger data-lane="${l}" href="${esc(href)}">${v.say('Load older ','加载更早的')}${laneName(l,v)} <span aria-hidden="true">→</span></a></div></section>`);}).join('')}</div><nav class="pagination" aria-label="${v.t('Story pages')}"><a href="${esc(qlink(v,{view:'all',page:null,load:null,before:null,before_url:null}))}">${v.t('Browse all stories')} →</a>${edition?`<a href="${v.local('/edit')}">${v.say('Past daily picks','往期每日精选')} →</a>`:''}<a href="#main">${v.say('Back to top','返回顶部')} ↑</a></nav>`;
  const bond=!archive&&!liveBond?(await latestEdition(db,'bond')??legacyEditions[0]):null;
  const homepageHeading=v.say('Human culture and the AI wave, always in motion.','人文与 AI 浪潮，并肩呈现。');
  const homepageSubtitle=v.say('The best of both, discovered for you daily.','精彩内容，为您探索。');
  return html(v,trending?(signal?v.zh?signal.zh:signal.en:v.t('Focusing')):homepageHeading,`${!archive?mix(mixStats,v,lane,desktopLane):''}${trending?conversationStrip(activeConversations,v,{empty:true}):''}${filters(v)}${main}
    ${!archive?(liveBond?bondRouteTeaser(liveBond,v):bond?.stories?.every(story=>story.original_lang===originalLanguage)?`<aside class="bond-teaser"><div><span class="bond-kicker">${v.t('Bonding')}</span><p>${v.say('A considered bridge: one Human Pulse story alongside one AI Wave story.','一则经过思考的连结：把一篇「人文脉动」与一篇「AI冲击波」并置阅读。')}</p></div><a href="${v.local('/bonding/'+bond.id)}"><span class="bond-route">${v.t('Human Pulse')} <b aria-hidden="true">×</b> ${v.t('AI Wave')}</span><strong>${esc((v.zh?bond.zh:bond.en).title)}</strong><span class="bond-arrow" aria-hidden="true">→</span></a></aside>`:''):''}
    <p class="feed-note feed-status">${last?v.say('Sources last checked: ','上次检查来源：')+date(last,v)+' · '+new Date(last).toISOString().slice(11,16)+' UTC'+relativeChecked(last,v):v.t('Awaiting the first source check')}</p>`,{wide:true,homepage:!trending,subtitle:!archive&&!trending?homepageSubtitle:undefined});
}
export async function dailyPage(env,v,id) {
  if (!id) {
    const {results}=await env.DB.prepare(`SELECT id,edition_date FROM editions WHERE kind='daily' ORDER BY edition_date DESC LIMIT 50`).all();
    const status=env.GENERATED_PUBLISHING === 'true'?v.say('A small selection, prepared daily at 12:00 UTC. Fewer picks when fewer sources qualify.','每天 UTC 12:00 准备一份小小的阅读精选。合适的内容少时，篇数也会少一些。'):v.say('Daily picks are not publishing yet. The live flow remains available while automatic summaries undergo quality checks.','每日精选尚未开始发布。自动摘要仍在进行质量检查期间，实时资讯会继续更新。');
    return html(v,v.say('Daily picks','每日精选'),`<p class="feed-note">${status}</p>${results.length?`<ul class="edition-list">${results.map(e=>`<li><a href="${v.local('/edit/'+e.id)}">${date(Date.parse(e.edition_date+'T12:00Z'),v)} →</a></li>`).join('')}</ul>`:''}`);
  }
  const edition=parse(await env.DB.prepare(`SELECT snapshot,correction FROM editions WHERE kind='daily' AND id=?`).bind(id).first());
  if (!edition) return html(v,v.t('Page unavailable'),`<p>${v.say('These daily picks are unavailable or have left the 50-pick archive.','这一期精选不存在，或已超出最近 50 期的保留范围。')}</p>`,{status:404});
  const originalLanguage=v.zh?'zh':'en';
  return html(v,date(Date.parse(edition.date+'T12:00Z'),v),`<p class="feed-note">${v.say('Daily picks · a few things worth your time.','每日精选 · 几篇值得花时间读的文章。')}</p><div class="edition-columns">${['human','ai'].map(l=>`<section><h2 class="lane-title ${l}">${laneName(l,v)}</h2>${edition.stories.filter(s=>s.lane===l&&s.original_lang===originalLanguage).map(s=>card(s,v,{pick:true,editionId:id})).join('')}</section>`).join('')}</div><p class="edition-end">${v.say('You’ve reached the end of these daily picks.','本期精选读完了。')}</p>${edition.correction?`<p>${esc(edition.correction)}</p>`:''}<p class="bond-link"><a href="${v.local('/edit')}">${v.say('More daily picks','更多每日精选')} →</a></p>`,{wide:true,edition:true,description:v.say('A daily selection of culture, creative work, and life with AI.','每天精选文化、创作与 AI 时代生活的好文章。')});
}
function participation(v) {
  return `<div class="bond-participation"><div><h3>${v.t('Send us a find')}</h3><p>${v.t('Share a public link and one sentence about what caught your attention. Tell us if you’d like to be credited.')}</p><a href="mailto:info@bond6.io?subject=Bond6%20reader%20find">${v.t('Email a find')}</a></div><div><h3>${v.t('Invite a voice')}</h3><p>${v.t('Suggest a creator and one question you’d ask them. You can also suggest yourself. We ask permission before publishing a response.')}</p><a href="mailto:info@bond6.io?subject=Bond6%20creator%20suggestion">${v.t('Suggest a creator')}</a></div></div>`;
}
export async function bondPage(env,v,id) {
  const now=Date.now();
  const language=v.zh?'zh':'en';
  const {results:archived}=await env.DB.prepare('SELECT id,created_at,snapshot FROM bond_routes WHERE language=? ORDER BY created_at DESC,id DESC LIMIT 50').bind(language).all();
  if(id?.startsWith('route-')) {
    const saved=archived.find(row=>row.id===id);
    if(!saved)return html(v,v.t('Page unavailable'),`<p class="notice">${v.say('This saved route is no longer available.','这条存档连结已不可用。')} <a href="${v.local('/bonding')}">${v.t('Bonding')}</a></p>`,{status:404,wide:true});
    const route=JSON.parse(saved.snapshot);
    return html(v,v.t('Bonding'),`<p class="feed-note">${v.say('Saved route','存档连结')} · ${date(saved.created_at,v)}</p>${bondRouteMap(route,v)}`,{wide:true});
  }
  const [{results},{results:recent}]=await Promise.all([
    env.DB.prepare(`SELECT snapshot,correction FROM editions WHERE kind='bond' ORDER BY edition_date DESC LIMIT 50`).all(),
    env.DB.prepare(`SELECT * FROM stories s WHERE s.lane IS NOT NULL AND s.original_lang=? AND s.discovered_at>=?
      AND NOT EXISTS(SELECT 1 FROM source_catalogue language_catalogue WHERE language_catalogue.id=s.source_id AND language_catalogue.language<>?)
      ORDER BY s.discovered_at DESC,s.url DESC LIMIT 120`).bind(v.zh?'zh':'en',now-7*DAY,v.zh?'zh':'en').all()
  ]);
  const originalLanguage=v.zh?'zh':'en';
  const editions=[...results.map(parse),...legacyEditions].filter(edition=>edition.stories?.length&&edition.stories.every(story=>story.original_lang===originalLanguage)).slice(0,50);
  const edition=id?editions.find(e=>e.id===id):editions[0];
  const liveRoute=id?null:liveBondRoute(focusedStories(recent));
  if (!edition&&!liveRoute&&!archived.length) return html(v,v.t('Bonding'),`<p class="notice">${v.say('No original-language Bonding route or note is available yet.','暂时还没有可用的中文连结路线或连结笔记。')}</p>`,{wide:true});
  const copy=edition?(v.zh?edition.zh:edition.en):null;
  const pair=edition?.stories.map(s=>`<article class="editorial-pick"><p class="pick-label">${laneName(s.lane,v)}</p><h3>${esc((v.zh?s.zh:s.en).title)}</h3><p>${esc((v.zh?s.zh:s.en).note)}</p>${s.quote?`<blockquote><p lang="en">${esc(s.quote)}</p>${v.zh&&s.zh.quote?`<p>${esc(s.zh.quote)} ${v.t('(translated)')}</p>`:''}</blockquote>`:''}<p class="pick-links">${esc(s.author?s.author+' · '+s.source:s.source)}</p>${actions(s,v,'https://bond6.io'+v.local('/bonding/'+edition.id))}</article>`).join('')??'';
  const editionMarkup=edition?`<p class="feed-note">${date(Date.parse(edition.date+'T12:00Z'),v)}${edition.legacy?' · '+v.say('Archive research edition','研究存档选编'):''}</p>
    <section class="bond-feature">${!id?`<header class="bond-header"><h2><a href="${v.local('/bonding/'+edition.id)}">${esc(copy.title)}</a></h2></header>`:''}<div class="bond-pair">${pair}</div><p class="bond-note">${esc(copy.note)}</p>
    <p class="bond-note note-disclosure">${edition.legacy?v.say('A researched editorial connection.','根据来源整理的编辑联想。'):v.say('Bond6’s interpretation · AI-assisted and checked against the selected sources.','Bond6 的联想 · 由 AI 辅助生成，并对照所选来源检查。')} ${correction(v,'https://bond6.io'+v.local('/bonding/'+edition.id))}</p>
    ${copy.question?`<div class="bond-response"><p>${esc(copy.question)}</p><a href="mailto:info@bond6.io?subject=${encodeURIComponent('Bond6 Bonding note | '+copy.title)}">${v.t('Share your experience')}</a></div>`:''}${edition.correction?`<p class="bond-note">${esc(edition.correction)}</p>`:''}${participation(v)}</section>`:'';
  const liveEventTitle=liveRoute?.kind==='event'?(v.zh?liveRoute.event.zh:liveRoute.event.en):null;
  const liveDescription=liveRoute?.kind==='event'
    ?v.say(`Source reports on ${liveRoute.event.en}; claims remain under review.`,`关于${liveRoute.event.zh}的来源报道；相关主张仍待核验。`)
    :(v.zh?liveRoute?.bridge.zh:liveRoute?.bridge.en);
  return html(v,id?copy.title:(liveEventTitle?`${liveEventTitle} · ${v.t('Bonding')}`:v.t('Bonding')),`<div class="bond-intro"><span>${v.t('Bonding')}</span><p>${v.say('Bonding routes pair recent Human Pulse and AI Wave stories through a visible shared bridge. When independent reports describe one named event from both human and AI perspectives, Bond6 can also show an explicitly labelled event cross-current. Bonding notes keep longer, considered connections.','连结路线会用可见的共同线索并置近期「人文脉动」与「AI冲击波」文章。当来源报道从人类与 AI 两个角度呈现同一命名事件时，Bond6 也会清晰标注为「同题交汇」。连结笔记则保留更长、更深入的思考。')}</p></div>${liveRoute?bondRouteMap(liveRoute,v):''}${editionMarkup}
    ${!id&&archived.length?`<h2>${v.say('Saved routes','连结存档')}</h2><ul class="edition-list">${archived.map(row=>{const route=JSON.parse(row.snapshot), title=route.kind==='event'?(v.zh?route.event.zh:route.event.en):(v.zh?route.bridge.zh:route.bridge.en);return `<li><a href="${v.local('/bonding/'+row.id)}">${esc(title)}</a><small>${date(row.created_at,v)}</small></li>`;}).join('')}</ul>`:''}
    ${editions.length?`<h2>${v.say('More Bonding notes','更多连结笔记')}</h2><ul class="edition-list">${editions.filter(e=>e.id!==edition?.id).map(e=>`<li><a href="${v.local('/bonding/'+e.id)}">${esc((v.zh?e.zh:e.en).title)}</a><small>${date(Date.parse(e.date+'T12:00Z'),v)}</small></li>`).join('')}</ul>`:''}`,{wide:true,edition:!!id,description:metaSummary(liveDescription??copy?.note)});
}
export function about(v) {
  const contents=[
    ['two-ways',v.say('Two flows','两条脉动')],['method',v.say('How it works','怎样运作')],['rhythm',v.say('Bond6 Rhythm','Bond6 节奏')],['privacy',v.say('Privacy','隐私')],['contribute',v.say('Contribute','参与')]
  ];
  return html(v,v.t('About'),`<section class="about-overview" aria-labelledby="about-promise"><p class="about-slogan" id="about-promise">${v.say('Culture, creative life, and AI. Let’s read together.','Bond6 邀您体验文化、创意生活与 AI 时代的冲击。')}</p><p>${v.say('Bond6 is a rolling reading flow for human culture and the AI wave—not a complete news index. Its name comes from carbon, the sixth element and a basis of life.','Bond6 是一条持续更新的阅读流，关注人文文化与 AI 浪潮，而不是完整的新闻索引。它的名字取自碳：元素周期表的第六号元素，也是生命的基础。')}</p><nav class="about-contents" aria-label="${v.say('About this page','本页目录')}">${contents.map(([id,label])=>`<a href="#${id}">${label}</a>`).join('')}</nav></section>
  <div class="about-copy"><section id="two-ways"><h2>${v.say('Two flows, read together','两条脉动，一起阅读')}</h2><p>${v.say('Human Pulse follows culture, creative practice, community, and lived experience. It is a subject category, not a certification that a work was made without AI. AI Wave follows how AI and digital platforms affect people and culture.','「人文脉动」关注文化、创作实践、社区与亲身经历。这是主题分类，并不证明作品没有使用 AI。「AI 冲击波」关注 AI 和数字平台怎样影响人及文化。')}</p></section>
  <section id="method"><h2>${v.say('How the Flow Works','阅读流怎样运作')}</h2><p>${v.say('The live flow comes from public RSS and Atom feeds. We classify each item by its subject, preserve its original author and publication, and leave unknown publication dates unknown. The English edition shows English originals only; the Simplified Chinese edition shows Simplified Chinese originals only. Bond6 does not translate article titles or content.','实时资讯来自公开的 RSS 和 Atom 订阅源。我们按内容主题分类，并保留原始作者和刊物信息；无法确认的发表日期会标为未知。英文版只显示英文原创内容；简体中文版只显示简体中文原创内容。Bond6 不翻译文章标题或内容。')}</p><p>${v.say('The live flow updates automatically. Daily picks and newly generated Bonding notes are enabled only after quality checks are ready; once enabled, they require usable source text and clear supporting evidence. When those conditions are not met, Bond6 publishes fewer items rather than filling space.','实时资讯会自动更新。每日精选和新生成的连结笔记会在质量检查准备就绪后才启用；启用后，它们仍须有可用的来源文字和明确的支持证据。条件不足时，Bond6 宁可减少篇数，也不会为了填满版面而发布。')}</p></section>
  <section id="rhythm"><h2>${v.say('Bond6 Rhythm','Bond6 节奏')}</h2><p>${v.say('Rhythm is Bond6’s recorded selection method, not a popularity score. Human Pulse needs evidence of creative practice, first-person process, care, community, or lived time. AI Wave needs both a system or platform signal and a meaningful consequence for people or culture. Weak or mismatched signals may stay in the live flow, but are not promoted as picks.','「Bond6 节奏」是 Bond6 可追溯的筛选方法，不是热度分数。「人文脉动」需要创作实践、第一人称过程、关怀、社区或生活时间等证据；「AI 冲击波」则须同时具备系统或平台信号，以及对人或文化有意义的影响。信号不足或不匹配的内容可能仍留在实时资讯中，但不会被提升为精选。')}</p><p>${v.say('Sources also earn their place: Bond6 measures technical reliability, freshness, usable yield, editorial fit, and duplication. Broken feeds can pause; trial feeds must build evidence before joining the public flow.','来源也需要证明自己的价值：Bond6 会衡量技术可靠性、新鲜度、可用内容比例、编辑匹配度与重复度。失效订阅可能被暂停；试用来源必须积累足够证据，才会进入公开阅读流。')}</p></section>
  <section id="privacy"><h2>${v.say('Your Reading Stays Yours','阅读记录留在你手里')}</h2><p>${v.say('Bond6 uses small, daily aggregate counts to understand whether the flow is useful: visits, returns, source opens, saves, and shares. These counters do not retain a server-side visitor identifier or search text. Browser privacy signals disable optional event counts; Cloudflare may process request logs to operate and secure the service.','Bond6 只使用小规模的每日汇总计数来了解阅读流是否有用：访问、回访、打开原文、收藏与分享。这些计数不保存服务器端访客标识或搜索词。浏览器隐私信号会关闭可选事件计数；Cloudflare 可能为运行和保护服务处理请求日志。')}</p></section>
  <section id="email-privacy"><h2>${v.say('Email digest privacy','邮件摘要与隐私')}</h2><p>${v.say('If you subscribe, Bond6 stores your email address, language, frequency and subscription status in Cloudflare and shares your address with Resend to deliver messages. Confirmation links expire after 24 hours. You can unsubscribe using the link in each digest. Unconfirmed records are cleared seven days after expiry; unsubscribed records are cleared after seven days. Delivery records are kept for up to seven days. For questions, contact info@bond6.io.','订阅邮件摘要时，Bond6 会在 Cloudflare 保存您的邮箱、语言、频率和订阅状态，并将邮箱交由 Resend 发送邮件。确认链接 24 小时后失效。您可以通过每封摘要中的链接退订。未确认记录在失效七天后清理；退订记录在七天后清理，投递记录最多保留七天。如有疑问，请联系 info@bond6.io。')}</p></section>
  <section id="reading-tools"><h2>${v.say('Reading tools, by choice','自主选择的阅读工具')}</h2><p>${v.say('Saving stories stays on this device. Focusing can use anonymous, daily totals to show reader interest alongside source evidence; it does not build a personal advertising profile. Bond6 can also be installed as a small web app when your browser offers Install. Push alerts are not enabled: they will only be considered as an explicit opt-in daily digest.','收藏文章只保存在当前设备中。「关注」可将匿名的每日汇总兴趣与来源证据并列展示；它不会建立个人广告画像。浏览器提供「安装」时，Bond6 可作为轻量网页应用安装。推送提醒尚未启用；未来如提供，也只会是读者明确选择的每日摘要。')}</p></section>
  <section class="about-method-notes" aria-label="${v.say('Method notes','方法说明')}"><details><summary>${v.say('Method notes: coverage, review & archive','方法说明：收录、审核与存档')}</summary><div><h3>${v.say('Coverage, not popularity','收录分布，并非热度排行')}</h3><p>${v.say('This week’s mix counts unique items discovered in each flow during seven days. Focusing combines independent source signals with clearly labeled reader interest. Neither represents the whole web or public opinion.','「本周资讯分布」统计七天内在各阅读流发现的不重复内容。「关注」结合独立来源信号与清晰标注的读者兴趣；两者都不代表整个互联网或公众意见。')}</p><h3>${v.say('Review & archive','审核与存档')}</h3><p>${v.say('Bond6 keeps a rolling aggregate audit of selection quality and diversity, without visitor records. It retains up to 1,000 live items: seven days for AI coverage and thirty for culture, measured from discovery. The latest 50 daily picks and 50 Bonding notes retain compact source credits. Original works belong to their creators; Bond6 links out and does not store full articles.','Bond6 会滚动保留筛选质量与多样性的汇总审计，不包含访客记录。实时资讯最多保留 1,000 条：AI 栏从发现起保留七天，文化栏保留三十天。最近 50 期每日精选和 50 期连结笔记保留简要来源信息。原作属于创作者；Bond6 提供链接，不保存完整文章。')}</p></div></details></section>
  <section id="contribute" class="about-contribute"><h2>${v.say('Help Shape the Flow','一起塑造阅读流')}</h2><p>${v.say('Know a source, story, or creator that belongs in this conversation? Your suggestions help Bond6 widen its reading without losing focus.','知道适合这场对话的来源、文章或创作者吗？你的建议能帮助 Bond6 拓宽阅读范围，同时保持聚焦。')}</p><div><a href="${v.local('/sources')}">${v.say('Suggest a source','推荐来源')} <span aria-hidden="true">→</span></a><a href="mailto:info@bond6.io?subject=Bond6%20reader%20find">${v.say('Send a find','分享发现')} <span aria-hidden="true">→</span></a><a href="mailto:info@bond6.io?subject=Bond6%20creator%20suggestion">${v.say('Suggest a creator','推荐创作者')} <span aria-hidden="true">→</span></a></div></section>
  <p class="about-links"><a href="${v.local('/subscribe')}">RSS</a> · ${correction(v,'https://bond6.io')}</p></div>`);
}
export async function sourcesPage(env,v) {
  const [{results:catalogue},{results:sourceStates}]=await Promise.all([
    env.DB.prepare(`SELECT c.*,s.checked_at,s.ok_at,s.failures,
      (SELECT standing FROM source_evaluations e WHERE e.source_id=c.id ORDER BY evaluated_at DESC LIMIT 1) AS standing,
      (SELECT recommendation FROM source_evaluations e WHERE e.source_id=c.id ORDER BY evaluated_at DESC LIMIT 1) AS recommendation
      FROM source_catalogue c LEFT JOIN source_state s ON s.id=c.id ORDER BY c.language,c.name`).all(),
    env.DB.prepare('SELECT id,checked_at,ok_at,failures FROM source_state').all()
  ]);
  const request=encodeURIComponent(v.say('Publication / account name:\nWebsite or feed URL:\nPrimary language:\nWhat it covers:\nWhy it belongs on Bond6:\n','媒体或账号名称：\n网站或订阅地址：\n主要语言：\n内容主题：\n为什么适合 Bond6：\n'));
  const stateById=new Map(sourceStates.map(state=>[state.id,state]));
  const fallback=[...sources,...archivedSources].map(source=>({...source,...stateById.get(source.id),feed_url:source.url,site_url:source.site,
    language:source.language ?? (['sspai','qbitai','kaix','maohang','conge','hehew'].includes(source.id)?'zh':'en'),
    state:source.state??'active',tier:source.state==='candidate'||source.tier==='candidate'?'candidate':source.tier==='slow'?'slow':source.tier==='rapid'?'rapid':'standard'}));
  const rows=catalogue.length?catalogue:fallback;
  const topic=row=>v.zh?sourceTopics[row.topic]??row.topic:row.topic;
  const stateLabel=state=>({active:v.say('Active','启用中'),watch:v.say('Watching','观察中'),candidate:v.say('Candidate','候选来源'),probation:v.say('In review','评估中'),paused:v.say('Paused','已暂停'),retired:v.say('Retired','已退出')}[state]??state);
  const health=row=>{
    if(!row.checked_at)return `<span class="source-health awaiting">${v.say('Not checked yet','尚未检查')}</span>`;
    const failed=Number(row.failures)>0&&Number(row.checked_at)>Number(row.ok_at??0);
    if(failed){
      const lastSuccess=Number(row.ok_at)>0?` <small>${v.say('Last successful check ','上次成功检查：')}${date(row.ok_at,v)}</small>`:'';
      return `<span class="source-health retrying">${v.say('Latest check failed · retrying','最近检查失败 · 将重试')}${lastSuccess}</span>`;
    }
    return `<span class="source-health healthy">${v.say('Checked ','已检查：')}${date(Number(row.ok_at??row.checked_at),v)}</span>`;
  };
  const row=source=>{
    const type=source.kind==='rss'?'RSS / Atom':source.kind==='bluesky'?'Bluesky':v.say('Reference','资料来源'), tier=source.tier==='rapid'?v.say('Rapid','快速'):source.tier==='slow'?v.say('Slow reading','慢速阅读'):source.tier==='candidate'?v.say('Candidate','候选'):v.say('Standard','常规');
    const score=Number.isFinite(Number(source.standing))?`<small class="source-standing">${v.say('Standing ','综合评分 ')}${Math.round(Number(source.standing))}/100</small>`:'';
    return `<li><div><a href="${esc(source.site_url??source.site)}">${esc(source.name)}</a><small>${esc(topic(source))} · ${type} · ${tier} · ${stateLabel(source.state)}</small>${score}</div>${health(source)}</li>`;
  };
  const list=language=>rows.filter(source=>source.language===language).sort((a,b)=>a.name.localeCompare(b.name)).map(row).join('');
  const active=rows.filter(source=>source.state==='active'||source.state==='watch').length;
  return html(v,v.t('Sources'),`<p class="feed-note">${v.say(`Bond6 currently keeps ${active} active or watched sources in a living catalogue. The English edition shows English originals; the Chinese edition shows Chinese originals. Status reflects the most recent scheduled check.`,`Bond6 当前有 ${active} 个启用或观察中的来源。英文版只显示英文原创，中文版只显示中文原创。状态反映最近一次定时检查。`)}</p><section class="source-vitality-note"><h2>${v.say('Source Vitality','来源活力')}</h2><p>${v.say('Sources are evaluated for reliability, freshness, editorial fit, usable yield, and duplication. A broken feed can pause automatically; editorial additions and retirements remain reviewed while the system learns.','来源会按可靠性、新鲜度、编辑匹配度、可用内容比例与重复度进行评估。失效订阅可自动暂停；在系统校准期间，编辑性新增与移除仍会经过审核。')}</p></section><section class="source-invitation"><div><h2>${v.say('Help widen the reading','一起拓宽阅读范围')}</h2><p>${v.say('Know a publication, writer, newsletter, or podcast worth following? Send its public URL, language, and a sentence on what makes it useful. We review suggestions before adding anything.','知道值得关注的媒体、作者、通讯或播客？请发送公开链接、主要语言和一句推荐理由。所有建议都会经过审核，不会自动加入。')}</p><p>${v.say('No mail app? Write to info@bond6.io.','没有邮件客户端？请写信至 info@bond6.io。')}</p></div><a class="text-link" href="mailto:info@bond6.io?subject=Bond6%20source%20suggestion&body=${request}">${v.say('Suggest a source','推荐来源')} <span aria-hidden="true">→</span></a></section><section class="source-group"><h2>${v.say('English and other-language sources','英文及其他语言来源')}</h2><ul class="sources">${list('en')}</ul></section><section class="source-group"><h2>${v.say('Chinese-language sources','中文来源')}</h2><ul class="sources">${list('zh')}</ul></section>`);
}
export function subscribe(env,v) {
  const links=[...(env.GENERATED_PUBLISHING === 'true'?[['daily',null,v.say('Daily picks','每日精选')]]:[]),['live','human',v.t('Human Pulse')],['live','ai',v.t('AI Wave')],['bond',null,v.t('Bonding')],['live',null,v.say('All arrivals','全部新发现')]];
  return html(v,v.t('Subscribe'),`<p>${v.say('Choose a feed and paste its address into your RSS reader. Switch language above for the other edition.','选择一个订阅源，把地址粘贴到 RSS 阅读器里。切换页面语言即可获取另一语言的订阅源。')}</p><ul class="subscription-list">${links.map(([kind,lane,title])=>{const path=v.local('/feed.xml')+'?'+new URLSearchParams({kind,...(lane?{lane}:{})});return `<li><h2>${title}</h2><a href="${esc(path)}">https://bond6.io${esc(path)}</a></li>`;}).join('')}</ul><section class="subscription-coming"><h2>${v.say('Email edition','邮件版')}</h2><p>${v.say('A concise email digest is being prepared. It will be opt-in, include an unsubscribe link, and never add an address to advertising audiences. RSS remains available now.','简明的邮件摘要正在准备中。它将完全由读者主动订阅、带有退订链接，且不会将邮箱加入广告受众。现在可先使用 RSS。')}</p></section>`,{description:v.say('Subscribe to Bond6’s English RSS feeds for human culture and AI developments.','订阅 Bond6 中文 RSS，阅读人文文化与 AI 动态。')});
}
export function savedPage(v) {
  return html(v,v.say('Saved stories','收藏的文章'),`<p class="feed-note">${v.say('Up to 100 stories, kept on this browser only. Clearing browser data removes them.','最多 100 条，仅保存在这个浏览器中。清除浏览器数据也会删除收藏。')}</p><button type="button" id="clear-saved" hidden>${v.say('Clear saved stories','清空收藏')}</button><div id="saved-list"></div><noscript><p class="notice">${v.say('Saved stories need JavaScript and browser storage. All other reading remains available.','收藏功能需要 JavaScript 和浏览器存储。其他阅读功能仍可使用。')}</p></noscript>`);
}
