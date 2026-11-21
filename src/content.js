import { decodeHeadline } from './headline.js';
import { validateLanguage, validateURL } from './validation.js';

export const DAY = 86_400_000;
export const subjects = ['music', 'art', 'writing', 'practice', 'digital'];
export const subjectLabels = { music: 'Music', art: 'Art & Design', writing: 'Writing', practice: 'Creative Practice', digital: 'Digital Life' };
const sourceSubjects = {
  bandcamp: 'music', 'aquarium-drunkard': 'music', quietus: 'music',
  'literary-hub': 'writing', kleon: 'writing', appleton: 'writing', dash: 'writing', marginalian: 'writing', 'electric-literature': 'writing', 'paris-review': 'writing', longreads: 'writing',
  'public-domain-review': 'writing', 'jstor-daily': 'writing', aeon: 'writing', kaix: 'writing', maohang: 'writing', hehew: 'writing',
  granta: 'writing', rumpus: 'writing', guernica: 'writing', nautilus: 'writing', '3quarks': 'writing', baffler: 'writing', 'orion-magazine': 'writing', 'emergence-magazine': 'writing',
  colossal: 'art', hyperallergic: 'art', 'creative-boom': 'art', 'harvard-arts': 'art', pudding: 'art', 'atlas-obscura': 'art', 'print-magazine': 'art',
  stereogum: 'music',
  conge: 'practice', climbing: 'practice', 'creative-independent': 'practice', storyfm: 'practice',
  'poetry-daily': 'writing', 'adroit-journal': 'writing', 'poetry-northwest': 'writing', 'duzhe-podcast': 'writing', 'here-is-poetry': 'writing', 'random-waves': 'writing', 'kanlixiang-roundtable': 'writing', 'yixi-extratalk': 'practice', 'jiemian-culture-podcast': 'writing',
  'culture-unlimited': 'writing', 'famous-unknown': 'writing', crossing: 'writing', 'zhang-luoyuan': 'writing', 'times-culture': 'writing', 'voice-spinning-books': 'music', shinekid: 'writing', 'east-west-tones': 'writing', 'wandering-notes': 'writing', 'left-right': 'writing', 'east-west-voice': 'practice', 'bie-ren-xing': 'writing', 'zhaoyuan-jian': 'writing', 'to-the-lighthouse': 'writing', 'tripper-press': 'art',
  sspai: 'digital', 'rest-of-world': 'digital', platformer: 'digital', 'mit-tech-review': 'digital', '404': 'digital', techdirt: 'digital', 'zitron-newsletter': 'digital', 'creative-commons': 'digital', deepmind: 'digital', huggingface: 'digital', qbitai: 'digital', 'import-ai': 'digital', quanta: 'digital', 'last-week-in-ai': 'digital', 'tldr-ai': 'digital', bair: 'digital', 'microsoft-research': 'digital', 'one-useful-thing': 'digital', 'exponential-view': 'digital', 'epoch-ai': 'digital', interconnects: 'digital', 'simon-willison': 'digital', 'latent-space': 'digital', 'sakana-ai': 'digital', 'venturebeat-ai': 'digital', 'science-news': 'digital', huxiu: 'digital', tmtpost: 'digital', solidot: 'digital', ithome: 'digital', 'aigc-weekly': 'digital', 'chinaz-ai': 'digital', 'infoq-recommend': 'digital', jiqizhixin: 'digital', 'ai-era': 'digital', geekpark: 'digital', '36kr': 'digital', 'landian-news': 'digital'
};
const sentenceEnd = (text, limit = 240) => {
  if (text.length <= limit) return text.trim();
  const match = text.slice(0, limit + 1).match(/^(.{1,230}?[.!?。！？])(?:\s|$)/);
  return match?.[1] ?? null;
};
export function cleanPostText(value, limit = 2200) {
  const text = plain(value, limit + 300).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/gi, ' ').replace(/\s+/g, ' ').trim();
  return limit < 500 ? sentenceEnd(text, limit) : text.slice(0, limit).trim();
}
const leadingPreviewLabel = /^(?:https?:\/\/)?(?:[\p{L}\p{N}-]+\.)+[\p{L}]{2,}(?:\/[^\s]*?)?(?:…|\.\.\.)\s+/iu;
export const hasLeadingPreviewLabel = value => leadingPreviewLabel.test(plain(value, 500));
function compactHeadline(text, limit) {
  if (text.length <= limit) return text;
  const head = text.slice(0, limit + 1);
  const endings = [...head.matchAll(/[.!?。！？]+(?=(?:\s|["”’')\]]|$))/g)];
  const ending = endings.at(-1);
  if (ending && ending.index >= Math.min(72, Math.floor(limit * .45))) return head.slice(0, ending.index + ending[0].length).trim();
  const word = head.lastIndexOf(' ');
  return (word >= Math.floor(limit * .55) ? head.slice(0, word) : head.slice(0, limit)).trim() + '…';
}
/** A social post can be shortened visibly, unlike a publisher's canonical title. */
export function cleanSocialHeadline(value, limit = 180) {
  const text = cleanPostText(value, 2200).replace(leadingPreviewLabel, '').trim();
  return text ? compactHeadline(text, limit) : null;
}
/** Preserve a publisher-supplied headline whole; never manufacture a chopped one. */
export function cleanHeadline(value, limit = 500, prefixes = []) {
  let text = plain(value, limit + 1);
  for (const prefix of prefixes) {
    if (text.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase()) && /^[\s:：—–-]/.test(text.slice(prefix.length))) {
      text = text.slice(prefix.length).replace(/^[\s:：—–-]+/, '').trim();
      break;
    }
  }
  return text && text.length <= limit ? text : null;
}
export function cleanAuthor(value) {
  return plain(value, 160).replace(/\s*\(GPG[^)]*\)/i, '').replace(/\s+@[^\s]+$/, '').trim() || null;
}
// These are transparent editorial topic definitions, not a measure of global popularity.
// A topic needs either independent-source evidence or clearly labelled reader interest.
export const conversationTopics = [
  { key: 'creative-ai', en: 'AI & creative work', zh: 'AI 与创作', match: /\b(ai|artificial intelligence|generative|llms?|chatgpt|machine learning)\b.*\b(art|artist|music|musician|writ\w*|design|film|creative|creator)\b|\b(art|artist|music|musician|writ\w*|design|film|creative|creator)\b.*\b(ai|artificial intelligence|generative|llms?|chatgpt|machine learning)\b|人工智能.{0,32}(创作|艺术|音乐|写作|设计)|(?:创作|艺术|音乐|写作|设计).{0,32}人工智能/i },
  { key: 'ai-work', en: 'AI, work & labour', zh: 'AI、工作与劳动', match: /\b(ai|artificial intelligence|automation|algorithmic)\b.*\b(work|worker|job|labou?r|employment|pay|wage|union)\b|\b(work|worker|job|labou?r|employment|pay|wage|union)\b.*\b(ai|artificial intelligence|automation|algorithmic)\b|人工智能.{0,32}(工作|劳动|就业|薪酬)|(?:工作|劳动|就业|薪酬).{0,32}人工智能/i },
  { key: 'platform-power', en: 'Platforms & public life', zh: '平台与公共生活', match: /\b(social media|platforms?|content moderation|algorithmic feed|tiktok|instagram|youtube|bluesky|creator economy)\b|社交媒体|数字平台|内容审核|算法推荐|创作者经济/i },
  { key: 'rights-attribution', en: 'Copyright & attribution', zh: '版权与署名', match: /\b(copyright|licen[cs]e|attribution|authors?[’']? rights|intellectual property|piracy)\b|版权|著作权|署名|授权|知识产权/i },
  { key: 'digital-rights', en: 'Privacy & digital rights', zh: '隐私与数字权利', match: /\b(privacy|surveillance|digital rights|data protection|facial recognition|encryption)\b|隐私|监控|数字权利|数据保护|加密/i },
  // Keep this deliberately conjunctive: ordinary science reporting, generic AI
  // releases, and unverified mathematical claims without an AI connection do
  // not belong in this focus.
  { key: 'math-ai-proof', en: 'Mathematics, proof & AI', zh: '数学证明与 AI', match: /\b(?:ai|artificial intelligence|claude|chatgpt|llms?|machine learning|formal verification|lean)\b[\s\S]{0,220}\b(?:riemann|mathemat(?:ics|ical|ician)|proof|theorem|conjecture|hypothesis|number theory)\b|\b(?:riemann|mathemat(?:ics|ical|ician)|proof|theorem|conjecture|hypothesis|number theory)\b[\s\S]{0,220}\b(?:ai|artificial intelligence|claude|chatgpt|llms?|machine learning|formal verification|lean)\b|(?:人工智能|AI|大模型|形式化验证|Lean).{0,80}(?:黎曼|数学|证明|定理|猜想)|(?:黎曼|数学|证明|定理|猜想).{0,80}(?:人工智能|AI|大模型|形式化验证|Lean)/i },
  { key: 'independent-music', en: 'Independent music', zh: '独立音乐', match: /\b(independent music|record label|musician|album|songwriter|band|concert|touring)\b|独立音乐|唱片|音乐人|乐队|专辑|巡演/i },
  { key: 'books-writing', en: 'Books & writing', zh: '书籍与写作', match: /\b(book|books|poetry|poet|novel|fiction|essay|writer|writing|publishing)\b|书籍|诗歌|小说|散文|作家|写作|出版/i },
  { key: 'visual-culture', en: 'Art & design', zh: '艺术与设计', match: /\b(art|artist|exhibition|museum|painting|photography|illustration|design|designer|architecture)\b|艺术|画家|展览|博物馆|绘画|摄影|插画|设计|建筑/i }
];
export const conversationTopic = key => conversationTopics.find(topic => topic.key === key) ?? null;
export function storyTopics(story) {
  // Classify from the original item only. Editions are now language-separated,
  // so stale or generated translations must not influence a story's lane.
  const text = `${story.title ?? ''} ${story.excerpt ?? ''}`;
  return conversationTopics.filter(topic => topic.match.test(text)).map(topic => topic.key);
}

// An event cross-current is not a declaration that a claim is true. It is a
// narrow, auditable way to put independent reporting about one named event in
// conversation when it genuinely contains both an AI and a human dimension.
// The known names preserve language-specific labels; the generic matcher lets
// future named hypotheses, conjectures, theorems, and problems form a cluster
// without adding a new one-off rule each time.
const namedMathEvents = [
  { key: 'event:riemann-hypothesis', en: 'Riemann hypothesis', zh: '黎曼猜想', match: /\b(?:the\s+)?riemann hypothesis\b|黎曼猜想/i }
];
const namedMathPhrase = /\b(?:the\s+)?((?:[A-Z][\p{L}'’-]*\s+){0,3}(?:hypothesis|conjecture|theorem|problem))\b/u;
const chineseMathPhrase = /([\u4e00-\u9fff]{2,10}(?:猜想|定理|问题))/;
const eventSlug = value => String(value).toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0,72);
const eventText = story => `${story?.title ?? ''} ${story?.excerpt ?? ''}`;

export function storyEvents(story) {
  const text=eventText(story);
  // Event grouping is stricter than the broad topic: it needs a named
  // mathematical question *and* the AI/proof connection on this specific item.
  if (!conversationTopic('math-ai-proof').match.test(text)) return [];
  const known=namedMathEvents.find(event=>event.match.test(text));
  if (known) return [known];
  const headline=String(story?.title??'');
  const phrase=headline.match(namedMathPhrase)?.[1]?.replace(/^the\s+/i,'').trim()
    ?? headline.match(chineseMathPhrase)?.[1]?.trim();
  if (!phrase) return [];
  const key=eventSlug(phrase);
  if (!key) return [];
  return [{key:`event:${key}`,en:phrase,zh:phrase}];
}
export const storyFocusKeys = story => [...new Set([...storyTopics(story),...storyEvents(story).map(event=>event.key)])];

const eventRoles = story => {
  const text=eventText(story);
  return {
    ai: /\b(?:ai|artificial intelligence|claude|chatgpt|llms?|machine learning|formal verification|lean)\b|(?:人工智能|大模型|形式化验证|Lean)/i.test(text),
    human: /\b(?:human|mathematician|mathematicians|researcher|researchers|all-human|competing|independent)\b|(?:人类|数学家|研究者|人工证明|独立)/i.test(text),
    claim: /\b(?:claim(?:ed|s|ing)?|proposed|proposal|draft|unverified|under review|verify|verification|scrutin\w*)\b|(?:声称|草稿|待验证|核验|审查)/i.test(text)
  };
};

export function eventCrossCurrents(stories, now = Date.now()) {
  const active=stories.filter(story=>(story?.discovered_at??0)>=now-7*DAY);
  const groups=new Map();
  for (const story of active) for (const event of storyEvents(story)) {
    const group=groups.get(event.key)??{...event,stories:[],sources:new Set(),roles:{ai:false,human:false,claim:false},latest:0};
    const roles=eventRoles(story);
    group.stories.push(story); group.sources.add(story.source_id??story.source);
    for (const key of Object.keys(group.roles)) group.roles[key] ||= roles[key];
    group.latest=Math.max(group.latest,Number(story.discovered_at)||0);
    groups.set(event.key,group);
  }
  return [...groups.values()].map(group=>{
    const stories=[...group.stories].sort((a,b)=>(Number(b.discovered_at)||0)-(Number(a.discovered_at)||0));
    const distinct=[]; const seen=new Set();
    for(const story of stories){const source=story.source_id??story.source;if(seen.has(source))continue;seen.add(source);distinct.push(story);if(distinct.length===3)break;}
    const sources=group.sources.size;
    // Two independent publishers plus a visible AI/human contrast protects the
    // route from becoming a single-source announcement or a generic AI cluster.
    if (sources<2||!group.roles.ai||!group.roles.human) return null;
    return {...group,kind:'event',stories:distinct,sources,strength:sources>=3?'strong':'emerging',status:group.roles.claim?'under-review':'reported'};
  }).filter(Boolean).sort((a,b)=>b.sources-a.sources||b.latest-a.latest);
}

export function conversations(stories, now = Date.now(), readerInterest = new Map()) {
  const active = stories.filter(story => (story.discovered_at ?? 0) >= now - 7 * DAY);
  const topical=conversationTopics.map(topic => {
    const matches = active.filter(story => storyTopics(story).includes(topic.key));
    const sources = new Set(matches.map(story => story.source_id ?? story.source));
    const readers = Math.max(0,Number(readerInterest.get(topic.key)??0));
    const strength=sources.size>=3?'strong':sources.size>=2?'emerging':readers>=3?'reader':null;
    return { ...topic, stories: matches.length, sources: sources.size, readers, strength, latest: Math.max(0, ...matches.map(story => story.discovered_at ?? 0)) };
  }).filter(topic => topic.strength);
  return [...eventCrossCurrents(active,now),...topical]
    .sort((a, b) => (b.kind==='event')-(a.kind==='event') || (b.strength==='strong')-(a.strength==='strong') || (b.strength==='emerging')-(a.strength==='emerging') || b.sources-a.sources || b.readers-a.readers || b.stories-a.stories || b.latest-a.latest).slice(0, 5);
}
/** Normalize untrusted feed text into plain text before it reaches storage. */
export const plain = (value, limit = 5000) => {
  const decoded = decodeHeadline(String(value?.['#text'] ?? value ?? ''));
  return decoded.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, limit);
};
export const canonical = validateURL;
export const language = validateLanguage;
// Bond6 is deliberately narrow. These are topic boundaries, not a judgement
// about an item's overall importance. They keep the feed centred on lived
// human experience and direct AI consequences rather than the general news
// cycle.
const offScope = /\b(?:war|wartime|military|weapon(?:s|ized)?|missile|battlefield|armed forces|election|campaign|parliament|congress|president(?:ial)?|prime minister|democratic party|republican party)\b|战争|军事|武器|导弹|战场|选举|竞选|国会|总统|政党/i;
const promotion = /\b(?:sale|discount|giveaway|raffle|tickets?|daily deals?|roundup|finalists?|awards?|excerpt|sponsored|advertorial|promo(?:tional)?)\b|抽\s*vip|新史低|\d+\s*折|获奖名单|广告合作|推广/i;
const commercial = /\b(?:funding round|raises? \$?\d|venture capital|venture funding|seed funding|series [a-f]|valuation|invest(?:or|ment)|acqui(?:re|sition)|ipo|real estate|residential development|luxury (?:home|residence)|showroom|brand partnership)\b|融资|募资|风投|估值|投资人|收购|上市|房地产|住宅项目|样板间|品牌合作/i;
const utilityLifestyle = /\b(?:carbohydrate(?:s)?|calori(?:e|es)|nutrition(?:al)?|meal plan|supplement(?:s)?|training plan|gear guide|product review)\b|碳水|卡路里|营养补充|训练计划|装备推荐/i;
const humanCreative = /\b(?:music|musician|songwriter|album|record|song|composer|band|writer|poet|poems?|poetry|novel|essay|artist|painting|sculpt(?:ure|or)|illustrat(?:ion|or)|photograph(?:y|er)|film(?:maker)?|cinema|design(?:er)?|craft|ceramic|woodwork|game design)\b|音乐人|作曲|专辑|唱片|歌曲|作家|诗人|诗歌|小说|散文|艺术家|绘画|雕塑|插画|摄影|电影|设计师|手工|陶艺|木工|游戏设计/i;
const humanMaking = /\b(?:make|making|record(?:ing)?|rehears(?:e|es|al|ing)?|draft(?:ing)?|edit(?:ing)?|paint(?:ing)?|draw(?:ing)?|compose|perform(?:ing)?|practic(?:e|ing)|build(?:ing)?|learn(?:ing)?|studio|workshop)\b|创作|制作|录制|排练|草稿|编辑|绘画|作曲|演出|练习|工作室|工坊/i;
const humanVoice = /\b(?:i|my|me|we|our)\b.{0,90}\b(?:think|feel|believe|wonder|remember|learn(?:ed|t)?|realize(?:d)?|grieve|love|hope|fear|dream|imagine|experience)\b|我(?:想|觉得|相信|记得|学到|意识到|害怕|希望|热爱|经历)|我们(?:想|觉得|相信|记得|学到|经历)/i;
const humanCare = /\b(?:mutual aid|care(?:giving)?|support(?:ing)?|solidarity|neighbou?r(?:hood)?|community(?:-led)?|co-?op|volunteer(?:ing)?|friendship|family|grief|empathy|sympathy)\b|互助|关怀|照料|支持|团结|邻里|社区|合作社|志愿|友谊|家人|共情|同情/i;
const humanEmbodied = /\b(?:climb(?:ing)?|mountain(?:eer(?:ing)?)?|trail running|marathon|ultra(?:run)?|surf(?:ing)?|skate(?:boarding)?|dance|injury|recovery|farm(?:ing)?|garden(?:ing)?)\b|登山|攀岩|越野|马拉松|冲浪|滑板|舞蹈|受伤|康复|农场|园艺/i;
const culturalContext = /\b(?:review|interview|profile|conversation|criticism|critique|exhibition|performance|retrospective|reading|listening)\b|乐评|书评|影评|访谈|专访|人物|对谈|评论|批评|展览|演出|回顾|阅读|聆听/i;
const aiSystem = /\b(?:ai|artificial intelligence|llms?|large language model|chatgpt|openai|anthropic|generative ai|machine learning|deepfake|model training|data cent(?:er|re)|ai agent|algorithmic (?:feed|ranking|recommendation)|recommender system|automated decision(?:-making)?|facial recognition|biometric (?:system|surveillance))\b|人工智能|大模型|生成式|机器学习|深度伪造|训练模型|数据中心|智能体|算法推荐|自动化决策|人脸识别|生物识别/i;
const aiImpact = /\b(?:replace(?:s|d|ment|ing)?|automate(?:s|d|ion|ing)?|job(?:s)?|work(?:er|place|load)?|labou?r|wage|union|artist|writer|teacher|student|privacy|surveillance|copyright|authorship|rights|trust|education|creative work)\b|替代|自动化|工作|劳动|工资|工会|艺术家|作者|教师|学生|隐私|监控|版权|署名|权利|信任|教育|创作/i;
const aiMovement = /\b(?:release(?:d|s)?|launch(?:ed|es)?|deploy(?:ed|ment|s)?|train(?:ed|ing)?|benchmark|capabilit(?:y|ies)|reasoning|agent(?:ic)?|infrastructure|compute|research(?:ers|ed)?|model(?:s)? (?:can|now|will))\b|发布|推出|部署|训练|基准测试|能力|推理|智能体|基础设施|算力|研究/i;
const aiElite = /\b(?:ceo|founder|executive|researcher|scientist|lab|engineer|investor|critic)\b.{0,70}\b(?:said|says|argued|warned|called|announced)\b|首席执行官|创始人|高管|研究员|科学家|实验室|工程师|投资人|评论者.{0,50}(?:表示|认为|警告|宣布)/i;
// A narrow route for consequential AI-assisted science. This is not a
// general science permit: an AI-system signal is still required and the item
// must concern a mathematical/scientific result, proof, or formal check.
const aiScientificAdvance = /\b(?:mathematics?|mathematician|theorem|conjecture|hypothesis|proof|formal (?:verification|proof)|lean|scientific discovery|scientific breakthrough|physics|biology|chemistry)\b|数学|数学家|定理|猜想|假设|证明|形式化验证|科学发现|科学突破|物理|生物|化学/i;
const reportedSpecificity = /\b(?:report|research|data|study|investigation|documents?|interview)\b|报告|研究|数据|调查|文件|访谈/i;

/** Deterministic eligibility only. It never calls a model or ranks an item. */
export function selectionGate(title, excerpt = '', source = {}) {
  const text = `${title ?? ''}. ${excerpt ?? ''}`.replace(/\s+/g, ' ').trim();
  if (offScope.test(text)) return { human:false, ai:false, exclusion_reason:'Outside Bond6 scope: politics, war, or military' };
  if (promotion.test(text)) return { human:false, ai:false, exclusion_reason:'Promotion, roundup, award list, or excerpt' };
  if (utilityLifestyle.test(text)) return { human:false, ai:false, exclusion_reason:'Utility lifestyle or product content, not an individual account' };
  const creative = humanCreative.test(text), making = humanMaking.test(text), voice = humanVoice.test(text);
  const care = humanCare.test(text), embodied = humanEmbodied.test(text), culture = culturalContext.test(text);
  const system = aiSystem.test(text), impact = aiImpact.test(text), movement = aiMovement.test(text), elite = aiElite.test(text), scientific = aiScientificAdvance.test(text), reported = reportedSpecificity.test(text);
  if (commercial.test(text)) return { human:false, ai:false, exclusion_reason:'Commercial, funding, or property coverage is outside Bond6’s editorial flow' };
  // Poetry and editorial cultural audio regularly have a precise title and a
  // short publisher note rather than a conventional article excerpt. Declared
  // first-party formats may therefore contribute when their own item carries
  // a cultural signal; a publisher name alone still never qualifies an item.
  const declaredPoetry = source.format==='poetry' && creative;
  const declaredCulturalAudio = source.format==='podcast' && (creative || voice || care || culture);
  const human_core = (creative && making) || voice || care || (embodied && (voice || culture || reported)) || declaredPoetry || declaredCulturalAudio;
  const ai_core = system && (impact || movement || elite || scientific);
  return {
    // The live flow may include a well-attributed cultural review/profile or
    // a reported AI development. Core items require stronger lived or human-
    // consequence evidence and are the only candidates for daily selection.
  // Live Flow can include a well-attributed report about creative work. Daily
  // Picks still require the stronger core signals recorded by Bond6 Rhythm.
    // A cultural publisher alone cannot make an item Human Pulse. The live
    // fallback still needs both a creative subject and an editorial context.
    human: human_core || (creative && (culture || reported)),
    ai: ai_core || (system && movement && reported),
    human_core, ai_core,
    exclusion_reason:null,
    signals:{ creative, making, voice, care, embodied, culture, system, impact, movement, elite, scientific, reported }
  };
}
export function classify(title, excerpt, source = {}) {
  // Require an item-level subject signal. A publisher cannot make unrelated news relevant.
  const text = `${title} ${excerpt.slice(0, 1400)}`;
  let subject = /\b(music|song\w*|album\w*|musician\w*|band|jazz|guitar|concert)\b|音乐|歌曲|专辑|乐队|作曲/i.test(text) ? 'music'
    : /\b(art|artist\w*|paint\w*|sculpt\w*|photograph\w*|illustrat\w*|design\w*|exhibition|cinema|films?|filmmaking)\b|绘画|画家|摄影|设计|艺术|插画|展览|电影|剧集/i.test(text) ? 'art'
    : /\b(books?|poems?|poetry|literature|literary|novels?|writers?|writing|fiction|essays?)\b|文学|写作|小说|诗歌|书籍|读书/i.test(text) ? 'writing'
    : /\b(crafts?|crafting|craftsmanship|creative practice|creative process|pottery|ceramics|woodworking|video games?|game design|gaming)\b|手工|创意|游戏|创作|制作/i.test(text) ? 'practice' : sourceSubjects[source.id] ?? 'digital';
  const gate = selectionGate(title, excerpt, source);
  // A source may be deliberately curated for just one side of Bond6. This is
  // a boundary, not a shortcut: the item must still pass that lane's own
  // signals. It prevents cultural podcasts, for example, from leaking into
  // AI Wave merely because an episode discusses an algorithm.
  const lane = source.lane === 'human'
    ? (gate.human ? 'human' : null)
    : source.lane === 'ai'
      ? (gate.ai ? 'ai' : null)
      : gate.ai ? 'ai' : gate.human ? 'human' : null;
  return { lane, subject };
}
export async function contentHash(story) {
  const value = JSON.stringify([story.url, story.title, story.author, story.excerpt, story.parent_context, story.original_published_at, story.original_lang, story.lane,
    story.image_url, story.audio_url, story.video_url, story.video_kind]);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
export const dayKey = now => new Date(now).toISOString().slice(0, 10);
export function usableText(story) {
  const min = story.original_lang === 'zh' ? 100 : 240;
  return story.excerpt?.length >= min && story.excerpt !== story.title && (!story.parent_context || story.parent_context.length >= 20);
}
