import { decodeHeadline } from './headline.js';

export const DAY = 86_400_000;
export const subjects = ['music', 'art', 'writing', 'practice', 'digital'];
export const subjectLabels = { music: 'Music', art: 'Art & Design', writing: 'Writing', practice: 'Creative Practice', digital: 'Digital Life' };
export const plain = (value, limit = 5000) => decodeHeadline(String(value?.['#text'] ?? value ?? '')
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' '))
  .replace(/\s+/g, ' ').trim().slice(0, limit);
export function canonical(value) {
  try {
    const u = new URL(value);
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password || u.href.length > 2048) return null;
    if (u.hostname === 'localhost' || !u.hostname.includes('.') || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname) || u.hostname.includes(':')) return null;
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) u.searchParams.delete(key);
    return u.href;
  } catch { return null; }
}
export function language(text) {
  const han = (text.match(/\p{Script=Han}/gu) || []).length;
  const latin = (text.match(/[a-z]/gi) || []).length;
  return han >= 4 && han / Math.max(1, han + latin) > .15 ? 'zh' : 'en';
}
export function classify(title, excerpt, source = {}) {
  // Require a subject connection in the item, never infer AI from its publisher.
  const text = `${title} ${excerpt.slice(0, 1400)}`;
  const ai = /\b(ai|artificial intelligence|llms?|chatgpt|openai|anthropic|nvidia|deepfakes?|generative|machine learning|algorithmic|automated|automation|data centers?)\b|人工智能|生成式|大模型|深度伪造|机器学习|算法推荐/i.test(text);
  const platform = /\b(social media|surveillance|digital rights|content moderation|platform(?:s)?|tiktok|instagram|youtube|bluesky)\b|社交媒体|数字平台|内容审核|网络隐私/i.test(text)
    && /\b(work|creat\w*|artist\w*|people|writ\w*|rights|privacy|community|culture|labor|music|pay|job\w*)\b|创作|作者|用户|劳动|隐私|音乐|文化|工作/i.test(text);
  let subject = /\b(music|song\w*|album\w*|musician\w*|band|jazz|guitar|concert)\b|音乐|歌曲|专辑|乐队|作曲/i.test(text) ? 'music'
    : /\b(art|artist\w*|paint\w*|sculpt\w*|photograph\w*|illustrat\w*|design\w*|exhibition|cinema|films?|filmmaking)\b|绘画|画家|摄影|设计|艺术|插画|展览|电影|剧集/i.test(text) ? 'art'
    : /\b(books?|poems?|poetry|literature|literary|novels?|writers?|writing|fiction|essays?)\b|文学|写作|小说|诗歌|书籍|读书/i.test(text) ? 'writing'
    : /\b(crafts?|crafting|craftsmanship|creative practice|creative process|pottery|ceramics|woodworking|video games?|game design|gaming)\b|手工|创意|游戏|创作|制作/i.test(text) ? 'practice' : 'digital';
  const cultural = subject !== 'digital' || source.essays && /\b(I|my|we|our|life|experience)\b|我|生活|体验/.test(text);
  return { lane: ai || platform ? 'ai' : cultural ? 'human' : null, subject };
}
export async function contentHash(story) {
  const value = JSON.stringify([story.url, story.title, story.author, story.excerpt, story.parent_context, story.original_published_at, story.original_lang, story.lane]);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
export const dayKey = now => new Date(now).toISOString().slice(0, 10);
export function usableText(story) {
  const min = story.original_lang === 'zh' ? 100 : 240;
  return story.excerpt?.length >= min && story.excerpt !== story.title && (!story.parent_context || story.parent_context.length >= 20);
}
