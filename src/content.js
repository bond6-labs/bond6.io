import { decodeHeadline } from './headline.js';
import { validateLanguage, validateURL } from './validation.js';

export const DAY = 86_400_000;
export const subjects = ['music', 'art', 'writing', 'practice', 'digital'];
export const subjectLabels = { music: 'Music', art: 'Art & Design', writing: 'Writing', practice: 'Creative Practice', digital: 'Digital Life' };
const sourceSubjects = {
  bandcamp: 'music', 'aquarium-drunkard': 'music', quietus: 'music',
  'literary-hub': 'writing', kleon: 'writing', appleton: 'writing', dash: 'writing', 'doctorow-social': 'writing', 'nieman-social': 'writing',
  colossal: 'art', hyperallergic: 'art', 'creative-boom': 'art',
  gcores: 'practice', chuapp: 'practice', 'appleton-social': 'practice',
  sspai: 'digital', 'rest-of-world': 'digital', platformer: 'digital', 'mit-tech-review': 'digital', 'markup-social': 'digital', '404': 'digital', '404-social': 'digital', techdirt: 'digital', 'eff-social': 'digital', 'ed-social': 'digital', 'zitron-newsletter': 'digital', 'creative-commons': 'digital', 'dash-social': 'digital'
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
// A topic appears only when it is present in at least three tracked sources.
export const conversationTopics = [
  { key: 'creative-ai', en: 'AI & creative work', zh: 'AI 与创作', match: /\b(ai|artificial intelligence|generative|llms?|chatgpt|machine learning)\b.*\b(art|artist|music|musician|writ\w*|design|film|creative|creator)\b|\b(art|artist|music|musician|writ\w*|design|film|creative|creator)\b.*\b(ai|artificial intelligence|generative|llms?|chatgpt|machine learning)\b|人工智能.{0,32}(创作|艺术|音乐|写作|设计)|(?:创作|艺术|音乐|写作|设计).{0,32}人工智能/i },
  { key: 'ai-work', en: 'AI, work & labour', zh: 'AI、工作与劳动', match: /\b(ai|artificial intelligence|automation|algorithmic)\b.*\b(work|worker|job|labou?r|employment|pay|wage|union)\b|\b(work|worker|job|labou?r|employment|pay|wage|union)\b.*\b(ai|artificial intelligence|automation|algorithmic)\b|人工智能.{0,32}(工作|劳动|就业|薪酬)|(?:工作|劳动|就业|薪酬).{0,32}人工智能/i },
  { key: 'platform-power', en: 'Platforms & public life', zh: '平台与公共生活', match: /\b(social media|platforms?|content moderation|algorithmic feed|tiktok|instagram|youtube|bluesky|creator economy)\b|社交媒体|数字平台|内容审核|算法推荐|创作者经济/i },
  { key: 'rights-attribution', en: 'Copyright & attribution', zh: '版权与署名', match: /\b(copyright|licen[cs]e|attribution|authors?[’']? rights|intellectual property|piracy)\b|版权|著作权|署名|授权|知识产权/i },
  { key: 'digital-rights', en: 'Privacy & digital rights', zh: '隐私与数字权利', match: /\b(privacy|surveillance|digital rights|data protection|facial recognition|encryption)\b|隐私|监控|数字权利|数据保护|加密/i },
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
export function conversations(stories, now = Date.now()) {
  const active = stories.filter(story => (story.discovered_at ?? 0) >= now - 7 * DAY);
  return conversationTopics.map(topic => {
    const matches = active.filter(story => storyTopics(story).includes(topic.key));
    const sources = new Set(matches.map(story => story.source_id ?? story.source));
    return { ...topic, stories: matches.length, sources: sources.size, latest: Math.max(0, ...matches.map(story => story.discovered_at ?? 0)) };
  }).filter(topic => topic.stories >= 3 && topic.sources >= 3)
    .sort((a, b) => b.sources - a.sources || b.stories - a.stories || b.latest - a.latest).slice(0, 5);
}
/** Normalize untrusted feed text into plain text before it reaches storage. */
export const plain = (value, limit = 5000) => {
  const decoded = decodeHeadline(String(value?.['#text'] ?? value ?? ''));
  return decoded.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, limit);
};
export const canonical = validateURL;
export const language = validateLanguage;
export function classify(title, excerpt, source = {}) {
  // Require an item-level subject signal. A publisher cannot make unrelated news relevant.
  const text = `${title} ${excerpt.slice(0, 1400)}`;
  const ai = /\b(ai|artificial intelligence|llms?|chatgpt|openai|anthropic|deepfakes?|generative(?: ai)?|machine learning|large language model|data cent(?:er|re)s?)\b|人工智能|生成式|大模型|深度伪造|机器学习/i.test(text);
  // Digital policy alone is not AI coverage. These are concrete automated systems,
  // retained for cases where their effects on people are the actual subject.
  const automatedSystem = /\b(algorithmic (?:feed|ranking|recommendation)|recommender system|automated decision(?:-making)?|facial recognition|biometric (?:system|surveillance))\b|算法推荐|自动化决策|人脸识别|生物识别/i.test(text);
  const consequence = /\b(work|worker|job|labou?r|wage|union|artist|writer|teacher|student|rights|privacy|copyright|culture|community|environment|energy)\b|工作|劳动|就业|薪酬|工会|艺术家|作者|教师|学生|权利|隐私|版权|文化|社区|环境|能源/i.test(text);
  let subject = /\b(music|song\w*|album\w*|musician\w*|band|jazz|guitar|concert)\b|音乐|歌曲|专辑|乐队|作曲/i.test(text) ? 'music'
    : /\b(art|artist\w*|paint\w*|sculpt\w*|photograph\w*|illustrat\w*|design\w*|exhibition|cinema|films?|filmmaking)\b|绘画|画家|摄影|设计|艺术|插画|展览|电影|剧集/i.test(text) ? 'art'
    : /\b(books?|poems?|poetry|literature|literary|novels?|writers?|writing|fiction|essays?)\b|文学|写作|小说|诗歌|书籍|读书/i.test(text) ? 'writing'
    : /\b(crafts?|crafting|craftsmanship|creative practice|creative process|pottery|ceramics|woodworking|video games?|game design|gaming)\b|手工|创意|游戏|创作|制作/i.test(text) ? 'practice' : sourceSubjects[source.id] ?? 'digital';
  const cultural = subject !== 'digital' || source.essays && /\b(I|my|we|our|life|experience)\b|我|生活|体验/.test(text);
  const aiRelevant = ai || (automatedSystem && consequence);
  return { lane: aiRelevant ? 'ai' : cultural ? 'human' : null, subject };
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
