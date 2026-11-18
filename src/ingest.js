import { XMLParser } from 'fast-xml-parser';
import { sources } from './sources.js';
import { DAY, canonical, cleanAuthor, cleanHeadline, cleanPostText, cleanSocialHeadline, hasLeadingPreviewLabel, plain, language, classify, contentHash } from './content.js';
import { enqueue, claim, saveJob } from './jobs.js';
import { AI_RETENTION_DAYS, CULTURE_RETENTION_DAYS, FEED_ITEM_LIMIT, FEED_SIZE_LIMIT, HTTP_REQUEST_TIMEOUT_MS, MAX_COLLECTS_PER_TICK, MAX_STORIES, REDIRECT_MAX_HOPS, REDIRECT_TIMEOUT_MS, RHYTHM_AUDIT_RETENTION } from './config.js';
import { validateStorySchema } from './validation.js';
import { saveRhythmSignals, scoreRhythmBacklog } from './rhythm.js';

export const storyLimit = env => Math.min(MAX_STORIES, Math.max(20, Number.parseInt(env.MAX_STORIES, 10) || MAX_STORIES));
export const pollIntervalMs = source => Math.min(180, Math.max(10, Number(source.poll_minutes) || 45)) * 60_000;
const xml = new XMLParser({ ignoreAttributes: false, parseTagValue: false, processEntities: { maxEntitySize: 512, maxTotalExpansions: 10000 } });
const shortHosts = new Set(['t.co', 'bit.ly', 'buff.ly', 'ow.ly', 'tinyurl.com']);
const attr = (node, ...names) => {
  for (const value of [node].flat()) for (const name of names) {
    const candidate = value?.[`@_${name}`] ?? value?.[name];
    if (typeof candidate === 'string') return candidate;
  }
  return null;
};
const safeMediaUrl = value => canonical(typeof value === 'string' ? value.trim() : null);
const mediaNodes = (item, key) => [item[key]].flat().filter(Boolean);
const isImage = (url, type = '', medium = '') => /^image\//i.test(type) || /^image$/i.test(medium) || /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i.test(url ?? '');
const isAudio = (url, type = '') => /^audio\//i.test(type) || /\.(?:mp3|m4a|aac|ogg|opus|wav)(?:$|[?#])/i.test(url ?? '');
const isVideo = (url, type = '') => /^video\//i.test(type) || /\.(?:mp4|webm|ogv|mov)(?:$|[?#])/i.test(url ?? '');
const tagAttr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(1).find(value => value != null) ?? null;
const isTracker = (tag, url) => {
  const width = Number(tagAttr(tag, 'width'));
  const height = Number(tagAttr(tag, 'height'));
  return (width > 0 && width <= 1) || (height > 0 && height <= 1) || /(?:pixel|tracking|spacer|blank)\.(?:gif|png)(?:$|[?#])/i.test(url);
};
function embeddedMedia(markup) {
  if (typeof markup !== 'string') return {};
  const tags = Array.from(markup.matchAll(/<(img|audio|video|source|iframe)\b[^>]*>/gi)).map(match => ({ name:match[1].toLowerCase(), tag:match[0] }));
  let image_url, audio_url, video_url;
  for (const { name, tag } of tags) {
    const rawUrl = tagAttr(tag, 'src');
    const url = safeMediaUrl(rawUrl);
    if (!url) continue;
    const type = tagAttr(tag, 'type') ?? '';
    if (!image_url && name === 'img' && !isTracker(tag, url)) image_url = url;
    if (!audio_url && (name === 'audio' || name === 'source') && isAudio(url, type)) audio_url = url;
    if (!video_url && (name === 'video' || name === 'source' || name === 'iframe')) video_url = videoPreview(url, type).video_url;
  }
  return { image_url, audio_url, video_url };
}
function videoPreview(value, type = '') {
  const url = safeMediaUrl(value);
  if (!url) return {};
  const parsed = new URL(url), host = parsed.hostname.toLowerCase();
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).match(/^[\w-]{6,}$/)?.[0];
    return id ? { video_url:`https://www.youtube-nocookie.com/embed/${id}` } : {};
  }
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const id = (parsed.pathname.match(/^\/embed\/([\w-]{6,})/)?.[1] ?? parsed.searchParams.get('v'));
    return id && /^[\w-]{6,}$/.test(id) ? { video_url:`https://www.youtube-nocookie.com/embed/${id}` } : {};
  }
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    const id = parsed.pathname.match(/\/(\d+)(?:$|\/)/)?.[1];
    return id ? { video_url:`https://player.vimeo.com/video/${id}` } : {};
  }
  return isVideo(url, type) ? { video_url:url } : {};
}
function feedMedia(item, description, source) {
  const content = mediaNodes(item, 'media:content');
  const thumbnail = mediaNodes(item, 'media:thumbnail');
  const enclosure = mediaNodes(item, 'enclosure');
  const imageNode = [...thumbnail, ...mediaNodes(item, 'itunes:image'), ...content.filter(node => isImage(attr(node, 'url', 'href'), attr(node, 'type') ?? '', attr(node, 'medium') ?? ''))]
    .find(node => attr(node, 'url', 'href'));
  // Some RSS publishers place a publisher-selected preview only in
  // content:encoded. We accept a single safe, non-tracker asset from that
  // feed payload; Bond6 still does not fetch or scrape the article itself.
  const embedded = embeddedMedia(description);
  const image_url = safeMediaUrl(attr(imageNode, 'url', 'href')) ?? embedded.image_url ?? null;
  const audioNode = [...enclosure, ...content].find(node => isAudio(attr(node, 'url', 'href'), attr(node, 'type') ?? ''));
  const audio_url = safeMediaUrl(attr(audioNode, 'url', 'href')) ?? embedded.audio_url ?? null;
  const videoNode = [...enclosure, ...content].find(node => isVideo(attr(node, 'url', 'href'), attr(node, 'type') ?? ''));
  const linkedVideo = videoPreview(attr(videoNode, 'url', 'href'), attr(videoNode, 'type') ?? '');
  return { image_url, audio_url, video_url: linkedVideo.video_url ?? embedded.video_url ?? null };
}

export async function resolveShortLink(value, fetcher = fetch) {
  let url = canonical(value);
  for (let i = 0; url && shortHosts.has(new URL(url).hostname) && i < REDIRECT_MAX_HOPS; i++) {
    const response = await fetcher(url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(REDIRECT_TIMEOUT_MS) });
    if (![301, 302, 303, 307, 308].includes(response.status) || !response.headers.get('location')) break;
    const next = canonical(new URL(response.headers.get('location'), url).href);
    if (!next || next === url) break;
    url = next;
  }
  return url;
}
export function fromRss(body, source) {
  if (/<!DOCTYPE/i.test(body)) throw new Error('Feed contains a document type declaration');
  // Parse only the bounded item set rather than a publisher's entire archive.
  const atom=/<feed(?:\s|>)/i.test(body),rss=/<rss(?:\s|>)/i.test(body);
  if(!atom&&!rss)throw new Error('Unrecognized feed format');
  const selected=[];
  for(const match of body.matchAll(atom?/<entry\b[^>]*>[\s\S]*?<\/entry>/gi:/<item\b[^>]*>[\s\S]*?<\/item>/gi)){selected.push(match[0]);if(selected.length===FEED_ITEM_LIMIT)break;}
  body=atom?'<feed>'+selected.join('')+'</feed>':'<rss><channel>'+selected.join('')+'</channel></rss>';
  const feed = xml.parse(body);
  const items = feed.rss?.channel?.item ?? feed.feed?.entry;
  if (!feed.rss?.channel && !feed.feed) throw new Error('Unrecognized feed format');
  return [items].flat().filter(Boolean).slice(0, FEED_ITEM_LIMIT).map(item => {
    const link = [item.link].flat().find(e => e && (!e['@_rel'] || e['@_rel'] === 'alternate'));
    const url = canonical(link?.['@_href'] ?? link?.['#text'] ?? link);
    const title = cleanHeadline(item.title, 500, source.title_prefixes);
    const rawDescription = item['content:encoded'] ?? item.content ?? item.description ?? item.summary;
    const excerpt = plain(rawDescription, 2200);
    const date = Date.parse(item.pubDate ?? item.published);
    const author = cleanAuthor(item['dc:creator'] ?? item.author?.name ?? item.author);
    return { url, link: url, title, excerpt, author, original_lang: language(title + ' ' + excerpt), original_published_at: Number.isFinite(date) ? date : null,
      content_type: 'article', canonical_url: url, ...feedMedia(item, rawDescription, source), ...classify(title, excerpt, source) };
  });
}
export function fromBluesky(body, source) {
  const { feed } = JSON.parse(body);
  if (!Array.isArray(feed)) throw new Error('Unrecognized Bluesky feed');
  return feed.filter(({ post, reason, reply }) => !reason && !reply && post?.author?.handle === source.handle).map(({ post }) => {
    const link = canonical('https://bsky.app/profile/' + post.author.did + '/post/' + post.uri.split('/').at(-1));
    // Quote-posts put their link card below `media`; treating that card as a
    // first-class source avoids turning its shortened domain label into a title.
    const external = post.embed?.external ?? post.embed?.media?.external;
    const article = canonical(external?.uri);
    const rawText = post.record?.text;
    const text = cleanPostText(rawText, 2200);
    const distinctive = text.replace(/https?:\/\/\S+/g, '').length >= 100 && !hasLeadingPreviewLabel(rawText);
    const title = article && !distinctive ? cleanHeadline(external.title, 500, source.title_prefixes) : cleanSocialHeadline(rawText, 180);
    const excerpt = distinctive || !article ? text : plain(external.description, 2200);
    const posted = Date.parse(post.record?.createdAt);
    const image_url = safeMediaUrl(external?.thumb ?? external?.thumbnail);
    const video = videoPreview(external?.uri);
    return { url: distinctive ? link : article ?? link, link, title, excerpt,
      author: distinctive || !article ? cleanAuthor(post.author.displayName || post.author.handle) : null,
      original_lang: language(title + ' ' + excerpt), original_published_at: distinctive || !article ? (Number.isFinite(posted) ? posted : null) : null,
      shared_at: Number.isFinite(posted) ? posted : null, content_type: distinctive || !article ? 'post' : 'shared-article',
      canonical_url: article ?? link, image_url, ...video, ...classify(title, excerpt, source) };
  });
}
export async function readBody(response) {
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let body = '', bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return body + decoder.decode();
    bytes += value.length;
    if (bytes > FEED_SIZE_LIMIT) { await reader.cancel(); throw new Error('Feed exceeds size limit'); }
    body += decoder.decode(value, { stream: true });
  }
}
export async function poll(source, state, now) {
  const headers = new Headers({ 'User-Agent': 'Bond6 (+https://bond6.io/about)' });
  if (state?.etag) headers.set('If-None-Match', state.etag);
  if (state?.modified) headers.set('If-Modified-Since', state.modified);
  const url = source.url ?? ('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?' + new URLSearchParams({ actor: source.handle, filter: 'posts_no_replies', limit: '20' }));
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT_MS) });
  if (response.status === 304) return { items: [], etag: state?.etag ?? null, modified: state?.modified ?? null };
  if (!response.ok) throw new Error('Upstream HTTP ' + response.status);
  const body = await readBody(response);
  const parsed = source.kind === 'rss' ? fromRss(body, source) : fromBluesky(body, source);
  const excluded = /\b(vip|raffle|giveaway|tickets?|sale|discount|new low price|daily deals?|this week in|weekly roundup|lit hub daily|podcast episode|excerpt)\b|抽\s*vip|新史低|\d+\s*折/i;
  const items = parsed.filter(i => i.url && i.title && i.lane && i.excerpt.length >= 80 && !excluded.test(i.title)
    && (!i.original_published_at || i.original_published_at >= now - (i.lane === 'human' ? CULTURE_RETENTION_DAYS : AI_RETENTION_DAYS) * DAY)
    && (!i.original_published_at || i.original_published_at <= now + 300_000)
    && (!i.shared_at || i.shared_at >= now - (i.lane === 'human' ? CULTURE_RETENTION_DAYS : AI_RETENTION_DAYS) * DAY));
  // A later, stricter classification must retire an already stored card rather
  // than leave its former lane visible until retention pruning.
  const accepted = new Set(items.map(item => item.url));
  // A social post can later resolve to the original article URL. Retire the
  // former post card as soon as the same feed item is re-read, whether the
  // corrected article is accepted or rejected by the current lane rules.
  const retiredUrls = new Set(parsed.filter(item => item.url && !accepted.has(item.url)).flatMap(item => [item.url, item.link].filter(Boolean)));
  for (const item of parsed) if (item.link && item.link !== item.url) retiredUrls.add(item.link);
  const rejectedUrls = [...retiredUrls];
  let resolved = 0;
  for (const item of items) {
    if (shortHosts.has(new URL(item.canonical_url).hostname) && resolved++ < 3) {
      const destination = await resolveShortLink(item.canonical_url).catch(() => item.canonical_url);
      if (item.url === item.canonical_url) item.url = destination;
      item.canonical_url = destination;
    }
    item.content_hash = await contentHash(item);
  }
  return { items, rejectedUrls, etag: response.headers.get('etag'), modified: response.headers.get('last-modified') };
}
export async function suppressItems(db, source, urls, now) {
  for (let start = 0; start < urls.length; start += 80) {
    const chunk = urls.slice(start, start + 80);
    await db.prepare(`UPDATE stories SET lane=NULL,updated_at=? WHERE source_id=? AND url IN(${chunk.map(() => '?').join(',')})`)
      .bind(now, source.id, ...chunk).run();
  }
}
export async function storeItems(db, source, items, now) {
  const validItems=[];
  for (const item of items) {
    const record={...item,source:source.name,source_id:source.id,topic:source.topic,published_at:item.original_published_at ?? now,is_article:source.kind==='rss'};
    try { validateStorySchema(record); validItems.push(item); }
    catch (error) { console.warn('Story rejected before storage', {source_id:source.id, url:item?.url ?? null, reason:error.message}); }
  }
  const statements = [];
  // 25 values x 4 rows stays within D1's 100 bound parameter limit.
  for (let start = 0; start < validItems.length; start += 4) {
    const chunk = validItems.slice(start, start + 4);
    const values = chunk.flatMap(i => [i.url, i.title, source.name, source.topic, i.original_published_at ?? now, Number(source.kind === 'rss'), source.id, i.author,
      i.original_lang, i.content_type, i.original_published_at, now, i.canonical_url, i.excerpt, i.parent_context ?? null, i.lane, i.subject,
      i.original_lang === 'zh' ? i.title : null, i.original_lang === 'en' ? i.title : null, i.content_hash, now, 0,
      i.image_url ?? null, i.audio_url ?? null, i.video_url ?? null]);
    statements.push(db.prepare(`INSERT INTO stories(url,title,source,topic,published_at,is_article,source_id,author,original_lang,content_type,
      original_published_at,discovered_at,canonical_url,excerpt,parent_context,lane,subject,title_zh,title_en,content_hash,updated_at,translate_after,
      image_url,audio_url,video_url)
      VALUES ${chunk.map(() => '(' + Array(25).fill('?').join(',') + ')').join(',')}
      ON CONFLICT(url) DO UPDATE SET title=excluded.title,source=excluded.source,topic=excluded.topic,published_at=excluded.published_at,
      is_article=excluded.is_article,source_id=excluded.source_id,author=excluded.author,original_lang=excluded.original_lang,
      content_type=excluded.content_type,original_published_at=excluded.original_published_at,
      discovered_at=coalesce(stories.discovered_at,excluded.discovered_at),canonical_url=excluded.canonical_url,excerpt=excluded.excerpt,
      parent_context=excluded.parent_context,lane=excluded.lane,subject=excluded.subject,content_hash=excluded.content_hash,updated_at=excluded.updated_at,
      title_zh=CASE WHEN stories.title=excluded.title THEN coalesce(stories.title_zh,excluded.title_zh) ELSE excluded.title_zh END,
      title_en=CASE WHEN stories.title=excluded.title THEN coalesce(stories.title_en,excluded.title_en) ELSE excluded.title_en END,
      translate_after=CASE WHEN stories.title=excluded.title THEN stories.translate_after ELSE 0 END,
      image_url=excluded.image_url,audio_url=excluded.audio_url,video_url=excluded.video_url
      WHERE excluded.is_article>=stories.is_article OR stories.source_id IS NULL`).bind(...values));
  }
  for (let start = 0; start < validItems.length; start += 20) {
    const chunk = validItems.slice(start, start + 20);
    statements.push(db.prepare(`INSERT INTO mentions(url,source,link,published_at) VALUES ${chunk.map(() => '(?,?,?,?)').join(',')}
      ON CONFLICT(url,source) DO UPDATE SET link=excluded.link,published_at=excluded.published_at`)
      .bind(...chunk.flatMap(i => [i.url, source.name, i.link, i.shared_at ?? i.original_published_at ?? now])));
  }
  if (statements.length) await db.batch(statements);
  await saveRhythmSignals(db,validItems.map(item=>({...item,source:source.name,source_id:source.id,topic:source.topic,published_at:item.original_published_at??now})),now);
  return validItems;
}
async function collectOne(env, source, state, now) {
  const db = env.DB;
  const id = 'collect:' + source.id;
  await enqueue(db, id, 'collect', {}, now);
  const job = await claim(db, id, now);
  if (!job) return false;
  try {
    const { items, rejectedUrls, etag, modified } = await poll(source, state, now);
    await storeItems(db, source, items, now);
    await suppressItems(db, source, rejectedUrls, now);
    await scoreRhythmBacklog(db,now);
    await db.prepare(`INSERT INTO source_state VALUES(?,?,?,?,?,0,?) ON CONFLICT(id) DO UPDATE SET
      etag=excluded.etag,modified=excluded.modified,checked_at=excluded.checked_at,ok_at=excluded.ok_at,failures=0,next_at=excluded.next_at`)
      .bind(source.id, etag, modified, now, now, now + pollIntervalMs(source)).run();
    await saveJob(db, job, {}, now, { next: now + pollIntervalMs(source) });
    return true;
  } catch (error) {
    const failures = (state?.failures ?? 0) + 1;
    const next = now + Math.min(120, 5 * 2 ** Math.min(failures, 5)) * 60_000;
    await db.prepare(`INSERT INTO source_state VALUES(?,NULL,NULL,?,NULL,?,?) ON CONFLICT(id) DO UPDATE SET
      checked_at=excluded.checked_at,failures=excluded.failures,next_at=excluded.next_at`).bind(source.id, now, failures, next).run();
    await saveJob(db, job, {}, now, { next, error: error.message });
    console.warn('Source check failed', {source_id:source.id, job_id:job.id, message:error.message, stack:error.stack, timestamp:now});
    return false;
  }
}
export async function collect(env, now = Date.now()) {
  const db = env.DB;
  const { results } = await db.prepare('SELECT * FROM source_state').all();
  const states = new Map(results.map(s => [s.id, s]));
  const batch = Math.min(3, Math.max(1, Number.parseInt(env.COLLECT_BATCH_SIZE, 10) || MAX_COLLECTS_PER_TICK));
  const due = [...sources].filter(source => (states.get(source.id)?.next_at ?? 0) <= now)
    .sort((a,b) => (states.get(a.id)?.next_at ?? 0) - (states.get(b.id)?.next_at ?? 0) || a.id.localeCompare(b.id)).slice(0,batch);
  let collected = 0;
  for (const source of due) if (await collectOne(env,source,states.get(source.id),now)) collected++;
  return collected;
}
export async function prune(env, now) {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM stories WHERE coalesce(discovered_at,published_at) < ? OR (lane='ai' AND discovered_at < ?)`)
      .bind(now - CULTURE_RETENTION_DAYS * DAY, now - AI_RETENTION_DAYS * DAY),
    env.DB.prepare(`DELETE FROM stories WHERE url IN (SELECT url FROM stories ORDER BY coalesce(discovered_at,published_at) DESC LIMIT -1 OFFSET ?)`)
      .bind(storyLimit(env)),
    ...['daily','bond'].map(kind => env.DB.prepare(`DELETE FROM editions WHERE id IN (SELECT id FROM editions WHERE kind=? ORDER BY edition_date DESC LIMIT -1 OFFSET 50)`).bind(kind)),
    env.DB.prepare(`DELETE FROM generated_notes WHERE validated_at < ?`).bind(now - 8 * DAY),
    env.DB.prepare(`DELETE FROM jobs WHERE kind<>'collect' AND updated_at < ?`).bind(now - 8 * DAY),
    env.DB.prepare(`DELETE FROM ai_reservations WHERE created_at < ?`).bind(now - 8 * DAY),
    env.DB.prepare(`DELETE FROM ai_usage WHERE day < ?`).bind(new Date(now - 35 * DAY).toISOString().slice(0,10)),
    env.DB.prepare(`DELETE FROM metrics WHERE day < ?`).bind(new Date(now - 60 * DAY).toISOString().slice(0,10)),
    env.DB.prepare(`DELETE FROM rhythm_audits WHERE edition_date IN (SELECT edition_date FROM rhythm_audits ORDER BY edition_date DESC LIMIT -1 OFFSET ?)`).bind(RHYTHM_AUDIT_RETENTION)
  ]);
}
