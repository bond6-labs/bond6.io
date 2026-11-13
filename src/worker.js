import { collect, DAY, storyLimit } from './collect.js';
import { sources } from './sources.js';

const PAGE_SIZE = 20;
const dateLabel = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function layout(section, content) {
  const nav = [['/', 'Latest'], ['/trending', 'Trending'], ['/sources', 'Sources']]
    .map(([path, label]) => `<a href="${path}"${section === label ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${section === 'Latest' ? 'Transmissions' : section} · Bond6.io</title>
<meta name="description" content="News and essays on writing, creative work, and life with AI.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=EB+Garamond:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css"></head><body>
<header class="masthead"><div class="shell masthead-inner">
<a class="wordmark" href="/" aria-label="Bond6.io home">Bond<span>6</span><small>.io</small></a>
<span class="masthead-label">Transmissions</span>
</div></header>
<main class="shell" id="main"><div class="intro"><h1>Transmissions<span>.</span></h1>
<p>News and essays on writing, creative work, and life with AI.</p></div>
<nav class="tabs" aria-label="Transmissions">${nav}</nav>
${content}</main>
<footer class="shell footer"><a class="wordmark" href="/">Bond<span>6</span><small>.io</small></a><span>Writing, creative work, and life with AI</span></footer>
</body></html>`;
}

function html(section, content, status = 200) {
  return new Response(layout(section, content), { status, headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': status === 200 ? 'public, max-age=30' : 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; base-uri 'none'; frame-ancestors 'none'"
  } });
}

function renderCard(story, mentions, trending) {
  const links = mentions.filter(mention => mention.link !== story.url).map(mention =>
    `<a href="${escape(mention.link)}">${escape(mention.source)} on Bluesky</a>`).join('');
  const reason = trending ? `<span>${story.coverage} tracked ${story.coverage === 1 ? 'source' : 'sources'} in the past 24 hours</span>` : '';
  return `<article class="story">
<div class="story-meta"><span class="topic">${escape(story.topic)}</span><time datetime="${new Date(story.published_at).toISOString()}">${dateLabel.format(story.published_at)}</time></div>
<h2><a href="${escape(story.url)}">${escape(story.title)}</a></h2>
<div class="byline"><span>${escape(story.source)}</span>${reason}</div>
${links ? `<details><summary>Related discussion</summary><div class="discussions">${links}</div></details>` : ''}
</article>`;
}

async function feed(env, url, trending) {
  const now = Date.now();
  const db = env.DB;
  const before = Number(url.searchParams.get('before'));
  const key = url.searchParams.get('key') ?? '';
  const rawPage = Number(url.searchParams.get('page'));
  const page = trending || !Number.isSafeInteger(rawPage) || rawPage < 2 || !Number.isSafeInteger(before) || before <= 0 || !key || key.length > 2048 ? 1 : rawPage;
  const cap = Math.ceil(storyLimit(env) / PAGE_SIZE);
  if (page > cap) return html('Latest', '<p class="notice">This page is outside the current feed. <a href="/">Return to Latest</a>.</p>', 404);
  const cutoff = now - 7 * DAY;
  let query;
  if (trending) {
    query = db.prepare(`SELECT stories.*, COUNT(*) AS coverage, MAX(mentions.published_at) AS recent
      FROM mentions JOIN stories USING (url) WHERE mentions.published_at >= ? AND stories.published_at >= ?
      GROUP BY stories.url ORDER BY coverage DESC, recent DESC, stories.url DESC LIMIT ?`)
      .bind(now - DAY, cutoff, PAGE_SIZE);
  } else if (page === 1) {
    query = db.prepare('SELECT * FROM stories WHERE published_at >= ? ORDER BY published_at DESC, url DESC LIMIT ?').bind(cutoff, PAGE_SIZE + 1);
  } else {
    query = db.prepare('SELECT * FROM stories WHERE published_at >= ? AND (published_at, url) < (?, ?) ORDER BY published_at DESC, url DESC LIMIT ?').bind(cutoff, before, key, PAGE_SIZE + 1);
  }
  const { results } = await query.all();
  const stories = results.slice(0, PAGE_SIZE);
  const section = trending ? 'Trending' : 'Latest';
  const { ok_at: last } = await db.prepare('SELECT MAX(ok_at) AS ok_at FROM source_state').first();
  const status = last ? 'Last source check ' + new Date(last).toISOString().slice(11, 16) + ' UTC' : 'Awaiting the first source check';
  const header = `<div class="feed-head"><p>${trending ? 'Most discussed among tracked sources in the past 24 hours' : 'New stories from tracked sources'}</p><span>${status}</span></div>`;
  if (!stories.length) {
    const message = trending ? 'Nothing is trending in the past 24 hours yet.' : page > 1 ? 'You’ve reached the end of the current feed. <a href="/">Return to Latest</a>.' : 'New stories will appear as the scheduled checks run.';
    return html(section, header + `<p class="notice">${message}</p>`);
  }
  const { results: mentions } = await db.prepare(`SELECT url, link, source FROM mentions WHERE url IN (${stories.map(() => '?').join(',')}) ORDER BY published_at DESC`)
    .bind(...stories.map(story => story.url)).all();
  const byUrl = new Map();
  for (const mention of mentions) {
    if (!byUrl.has(mention.url)) byUrl.set(mention.url, []);
    byUrl.get(mention.url).push(mention);
  }
  const cards = stories.map(story => renderCard(story, byUrl.get(story.url) ?? [], trending)).join('');
  const oldest = stories.at(-1);
  const next = !trending && page < cap && results.length > PAGE_SIZE
    ? `<a href="/?${escape(new URLSearchParams({ page: String(page + 1), before: String(oldest.published_at), key: oldest.url }))}">Older stories →</a>` : '';
  const first = page > 1 ? '<a href="/">← Back to latest</a>' : '';
  return html(section, header + cards + (next || first ? `<nav class="pagination" aria-label="Story pages">${first}${next}</nav>` : ''));
}

function sourceList() {
  const rows = sources.map(source => `<li><a href="${escape(source.site)}">${escape(source.name)}</a>
    <span>${source.kind === 'rss' ? 'RSS' : 'Bluesky'} · ${escape(source.topic)}</span></li>`).join('');
  return html('Sources', `<div class="feed-head"><p>Publishers and public accounts followed by Bond6</p></div><ul class="sources">${rows}</ul>`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    if (url.pathname === '/sources') return sourceList();
    if (url.pathname !== '/' && url.pathname !== '/trending') {
      return html('Page unavailable', '<p class="notice"><a href="/">Go to Transmissions</a></p>', 404);
    }
    try {
      return await feed(env, url, url.pathname === '/trending');
    } catch (error) {
      console.error('Feed query failed', error.message);
      return html('Feed unavailable', '<p class="notice">The feed is temporarily unavailable. Please try again shortly.</p>', 503);
    }
  },
  scheduled(controller, env, ctx) {
    ctx.waitUntil(collect(env, controller.scheduledTime));
  }
};
