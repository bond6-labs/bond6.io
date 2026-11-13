import { XMLParser } from 'fast-xml-parser';
import { sources, essaySources, essaySourceParams, ESSAY_DAYS } from './sources.js';
import { decodeHeadline } from './headline.js';

export const DAY = 86_400_000;
const minute = 60_000;
const maxBytes = 1_000_000;
const editorial = /\b(?:ai|llms?|chatgpt|deepfakes?|bots?|algorithm\w*|automati\w*|social media|synthetic media|journalis\w*|newsroom\w*|publish\w*|writers?|writing|copyright|creators?|moderation|bluesky|mastodon|tiktok|instagram|youtube|surveillance|digital rights)\b/i;
const xml = new XMLParser({ ignoreAttributes: false, parseTagValue: false, processEntities: { maxEntitySize: 512, maxTotalExpansions: 1000 } });

export function storyLimit(env) {
  return Math.min(2000, Math.max(20, Number.parseInt(env.MAX_STORIES, 10) || 1000));
}

function canonical(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.href.length > 2048) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return null;
  }
}

function clean(value) {
  return decodeHeadline(String(value?.['#text'] ?? value ?? '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ').trim().slice(0, 240);
}

function fromRss(body, source) {
  if (/<!DOCTYPE/i.test(body)) throw new Error('Feed contains a document type declaration');
  const feed = xml.parse(body);
  const items = feed.rss?.channel?.item ?? feed.feed?.entry;
  if (!feed.rss?.channel && !feed.feed) throw new Error('Unrecognized feed format');
  return [items].flat().filter(Boolean).slice(0, 40).map(item => {
    const link = [item.link].flat().find(entry => entry && (!entry['@_rel'] || entry['@_rel'] === 'alternate'));
    const url = canonical(link?.['@_href'] ?? link?.['#text'] ?? link);
    const title = clean(item.title);
    const subject = title + ' ' + [item.category].flat().map(clean).join(' ');
    return { url, link: url, title, subject, date: Date.parse(item.pubDate ?? item.published ?? item.updated), topic: source.topic };
  });
}

function fromBluesky(body, source) {
  const { feed } = JSON.parse(body);
  if (!Array.isArray(feed)) throw new Error('Unrecognized Bluesky feed');
  return feed.filter(({ post, reason, reply }) => !reason && !reply && post?.author?.handle === source.handle).map(({ post }) => {
    const link = canonical('https://bsky.app/profile/' + post.author.did + '/post/' + post.uri.split('/').at(-1));
    const external = post.embed?.external;
    const article = canonical(external?.uri);
    const title = clean((article && external.title) || post.record?.text);
    return { url: article ?? link, link, title, subject: title + ' ' + clean(post.record?.text), date: Date.parse(post.record?.createdAt), topic: source.topic };
  });
}

async function readBody(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = '';
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return body + decoder.decode();
    bytes += value.length;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new Error('Feed exceeds size limit');
    }
    body += decoder.decode(value, { stream: true });
  }
}

async function poll(source, state, now) {
  const headers = new Headers({ 'User-Agent': 'Bond6 Transmissions (+https://bond6.io)' });
  if (state?.etag) headers.set('If-None-Match', state.etag);
  if (state?.modified) headers.set('If-Modified-Since', state.modified);
  const url = source.url ?? ('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?' + new URLSearchParams({ actor: source.handle, filter: 'posts_no_replies', limit: '20' }));
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (response.status === 304) return { items: [], etag: state?.etag ?? null, modified: state?.modified ?? null };
  if (!response.ok) throw new Error('Upstream HTTP ' + response.status);
  const body = await readBody(response);
  const items = source.kind === 'rss' ? fromRss(body, source) : fromBluesky(body, source);
  return {
    items: items.filter(item => item.url && item.link && item.title
      && (source.essays || source.allPosts || editorial.test(item.subject))
      && !/^daily deal:/i.test(item.title) && item.date >= now - (source.essays ? ESSAY_DAYS : 7) * DAY
      && item.date <= now + 5 * minute),
    etag: response.headers.get('etag'),
    modified: response.headers.get('last-modified')
  };
}

export async function collect(env, now = Date.now()) {
  const db = env.DB;
  const { results } = await db.prepare('SELECT * FROM source_state').all();
  const states = new Map(results.map(state => [state.id, state]));
  const source = [...sources].sort((a, b) => (states.get(a.id)?.next_at ?? 0) - (states.get(b.id)?.next_at ?? 0))[0];
  const state = states.get(source.id);
  const statements = [];
  if ((state?.next_at ?? 0) <= now) {
    try {
      const { items, etag, modified } = await poll(source, state, now);
      for (const item of items) {
        const date = Math.min(item.date, now);
        statements.push(
          db.prepare(`INSERT INTO stories (url, title, source, topic, published_at, is_article)
            VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(url) DO UPDATE SET
            title = excluded.title, source = excluded.source, topic = excluded.topic,
            published_at = excluded.published_at, is_article = excluded.is_article,
            title_zh = CASE WHEN excluded.title = stories.title THEN stories.title_zh END,
            translate_after = CASE WHEN excluded.title = stories.title THEN stories.translate_after ELSE 0 END
            WHERE excluded.is_article > stories.is_article
              OR (excluded.is_article = stories.is_article AND excluded.source = stories.source
                AND excluded.title <> stories.title)`)
            .bind(item.url, item.title, source.name, item.topic, date, Number(source.kind === 'rss')),
          db.prepare(`INSERT INTO mentions VALUES (?, ?, ?, ?) ON CONFLICT(url, source) DO UPDATE SET
            link = excluded.link, published_at = excluded.published_at
            WHERE excluded.published_at > mentions.published_at
              OR (excluded.link <> mentions.url AND mentions.link = mentions.url)`)
            .bind(item.url, source.name, item.link, date)
        );
      }
      statements.push(db.prepare(`INSERT INTO source_state VALUES (?, ?, ?, ?, ?, 0, ?)
        ON CONFLICT(id) DO UPDATE SET etag=excluded.etag, modified=excluded.modified,
        checked_at=excluded.checked_at, ok_at=excluded.ok_at, failures=0, next_at=excluded.next_at`)
        .bind(source.id, etag, modified, now, now, now + Math.max(10, sources.length) * minute));
    } catch (error) {
      const failures = (state?.failures ?? 0) + 1;
      const delay = Math.min(120, 5 * 2 ** Math.min(failures, 5));
      console.warn('Feed check failed', source.id, error.message);
      statements.push(db.prepare(`INSERT INTO source_state VALUES (?, NULL, NULL, ?, NULL, ?, ?)
        ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,
        failures=excluded.failures, next_at=excluded.next_at`).bind(source.id, now, failures, now + delay * minute));
    }
  }
  statements.push(
    db.prepare(`DELETE FROM stories WHERE published_at < ?
      OR (published_at < ? AND source NOT IN (${essaySourceParams}))`)
      .bind(now - ESSAY_DAYS * DAY, now - 7 * DAY, ...essaySources),
    db.prepare(`DELETE FROM stories WHERE url IN (
      SELECT url FROM stories ORDER BY published_at DESC, url DESC LIMIT -1 OFFSET ?
    )`).bind(storyLimit(env))
  );
  await db.batch(statements);
}
