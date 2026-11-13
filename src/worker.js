import { collect, DAY, storyLimit } from './collect.js';
import { sources } from './sources.js';
import { decodeHeadline } from './headline.js';
import { chinese } from './chinese.js';
import { translateHeadlines } from './translate.js';

const PAGE_SIZE = 20;
const dateLabel = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const chineseDate = new Intl.DateTimeFormat('zh-Hans', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const timeLabel = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function locale(url) {
  const zh = url.pathname === '/zh' || url.pathname.startsWith('/zh/');
  const path = zh ? url.pathname.slice(3) || '/' : url.pathname;
  const local = route => zh ? '/zh' + route : route;
  return { zh, path, local, lang: zh ? 'zh-Hans' : 'en', t: label => zh ? chinese[label] ?? label : label,
    alternate: (zh ? path.replace(/^\/+/, '/') : '/zh' + path) + url.search };
}

function layout(section, content, { t, local, zh, lang, alternate }) {
  const heading = t(section === 'Latest' ? 'Transmissions' : section);
  const description = t('News and essays on writing, creative work, and life with AI.');
  const nav = [['/', 'Latest'], ['/trending', 'Trending'], ['/sources', 'Sources'], ['/about', 'About']]
    .map(([path, label]) => `<a href="${local(path)}"${section === label ? ' aria-current="page"' : ''}>${t(label)}</a>`).join('');
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${heading} · Bond6.io</title>
<meta name="description" content="${description}">
<meta name="theme-color" content="#f6f3ec">
<script src="/theme.js"></script>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="Bond6 ${t('Transmissions')}" href="${local('/feed.xml')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=PT+Serif:wght@400;700${zh ? '&family=Noto+Sans+SC:wght@400;500;600;700' : ''}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css?v=type-1"></head><body>
<a class="skip-link" href="#main">${t('Skip to content')}</a>
<header class="masthead"><div class="shell masthead-inner">
<a class="wordmark" href="${local('/')}" aria-label="${t('Bond6.io home')}" translate="no">Bond<span>6</span><small>.io</small></a>
<nav class="tabs" aria-label="${t('Transmissions')}">${nav}</nav>
<div class="reader-controls">
<a class="language-link" href="${escape(alternate)}" lang="${zh ? 'en' : 'zh-Hans'}" hreflang="${zh ? 'en' : 'zh-Hans'}">${zh ? 'English' : '简体中文'}</a>
<button type="button" class="theme-toggle" role="switch" aria-checked="false" hidden>
  <span>${t('Dark mode')}</span><span class="theme-track" aria-hidden="true"></span>
</button>
</div>
</div></header>
<main class="shell" id="main" tabindex="-1"><div class="intro"><h1>${heading}</h1>
${section === 'Latest' ? `<p>${description}</p>` : ''}</div>
${content}</main>
<footer class="shell footer" id="footer">
  <div class="footer-inner">
    <p translate="no">© ${new Date().getUTCFullYear()} Bond6.io</p>
    <nav aria-label="${t('Contact and subscriptions')}">
      <a href="mailto:info@bond6.io">${t('Contact')}</a>
      <a href="${local('/subscribe')}">${t('Subscribe via RSS')}</a>
    </nav>
  </div>
</footer>
</body></html>`;
}

function html(view, section, content, status = 200) {
  return new Response(layout(section, content, view), { status, headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Language': view.lang,
    'Cache-Control': status === 200 ? 'public, max-age=30' : 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; base-uri 'none'; frame-ancestors 'none'"
  } });
}

function renderCard(story, mentions, trending, { t, zh }) {
  const title = zh ? story.title_zh || story.title : story.title;
  const original = zh && !story.title_zh ? ' lang="en"' : '';
  const links = mentions.filter(mention => mention.link !== story.url).map(mention =>
    `<a href="${escape(mention.link)}">${escape(mention.source)}${zh ? '（Bluesky）' : ' on Bluesky'}</a>`).join('');
  const coverage = zh ? `过去 24 小时内有 ${story.coverage} 个关注来源提及` : `${story.coverage} tracked ${story.coverage === 1 ? 'source' : 'sources'} in the past 24 hours`;
  const reason = trending ? `<span>${coverage}</span>` : '';
  const date = (zh ? chineseDate : dateLabel).format(story.published_at);
  return `<article class="story">
<div class="story-meta"><span class="topic">${escape(t(story.topic))}</span></div>
<h2><a href="${escape(story.url)}"${original}>${escape(decodeHeadline(title))}</a></h2>
<div class="byline"><span>${escape(story.source)}</span><time datetime="${new Date(story.published_at).toISOString()}">${date}</time>${reason}</div>
${links ? `<details><summary>${t('Related discussion')}</summary><div class="discussions">${links}</div></details>` : ''}
</article>`;
}

async function feed(env, url, trending, view) {
  const { t, local, zh } = view;
  const now = Date.now();
  const db = env.DB;
  const search = trending ? '' : (url.searchParams.get('q') ?? '').trim().slice(0, 120);
  const searchForm = trending ? '' : `<form class="story-search" role="search" action="${local('/')}">
    <label for="story-query">${t('Search stories')}</label>
    <div><input id="story-query" name="q" type="search" maxlength="120" value="${escape(search)}">
    <button type="submit">${t('Search')}</button></div>
  </form>`;
  const before = Number(url.searchParams.get('before'));
  const key = url.searchParams.get('key') ?? '';
  const rawPage = Number(url.searchParams.get('page'));
  const page = trending || !Number.isSafeInteger(rawPage) || rawPage < 2 || !Number.isSafeInteger(before) || before <= 0 || !key || key.length > 2048 ? 1 : rawPage;
  const cap = Math.ceil(storyLimit(env) / PAGE_SIZE);
  const latestLink = `<a href="${local('/')}">${t('Back to latest')}</a>`;
  if (page > cap) return html(view, 'Latest', `<p class="notice">${t('This page is outside the current feed.')} ${latestLink}</p>`, 404);
  const cutoff = now - 7 * DAY;
  let query;
  if (trending) {
    query = db.prepare(`SELECT stories.*, COUNT(*) AS coverage, MAX(mentions.published_at) AS recent
      FROM mentions JOIN stories USING (url) WHERE mentions.published_at >= ? AND stories.published_at >= ?
      GROUP BY stories.url ORDER BY coverage DESC, recent DESC, stories.url DESC LIMIT ?`)
      .bind(now - DAY, cutoff, PAGE_SIZE);
  } else {
    const searchFilter = search ? "AND instr(lower(title || ' ' || coalesce(title_zh, '') || ' ' || source || ' ' || topic), lower(?)) > 0" : '';
    const cursorFilter = page > 1 ? 'AND (published_at, url) < (?, ?)' : '';
    query = db.prepare(`SELECT * FROM stories WHERE published_at >= ? ${searchFilter} ${cursorFilter}
      ORDER BY published_at DESC, url DESC LIMIT ?`)
      .bind(cutoff, ...(search ? [search] : []), ...(page > 1 ? [before, key] : []), PAGE_SIZE + 1);
  }
  const { results } = await query.all();
  const stories = results.slice(0, PAGE_SIZE);
  const section = trending ? 'Trending' : 'Latest';
  const { ok_at: last } = await db.prepare('SELECT MAX(ok_at) AS ok_at FROM source_state').first();
  const status = last ? (zh ? '上次更新 ' : 'Last checked ') + timeLabel.format(last) : t('Awaiting the first source check');
  const header = trending ? `<p class="feed-note">${t('Most discussed among tracked sources in the past 24 hours.')}</p>` : searchForm;
  if (!stories.length) {
    const message = search ? 'No recent stories match your search. Try another word or phrase.' : trending ? 'Nothing is trending in the past 24 hours yet.' : page > 1 ? 'You’ve reached the end of the current feed.' : 'New stories will appear as the scheduled checks run.';
    return html(view, section, header + `<p class="notice">${t(message)} ${page > 1 ? latestLink : ''}</p>`);
  }
  const { results: mentions } = await db.prepare(`SELECT url, link, source FROM mentions WHERE url IN (${stories.map(() => '?').join(',')}) ORDER BY published_at DESC`)
    .bind(...stories.map(story => story.url)).all();
  const byUrl = new Map();
  for (const mention of mentions) {
    if (!byUrl.has(mention.url)) byUrl.set(mention.url, []);
    byUrl.get(mention.url).push(mention);
  }
  const cards = stories.map(story => renderCard(story, byUrl.get(story.url) ?? [], trending, view)).join('');
  const oldest = stories.at(-1);
  const nextParams = { page: String(page + 1), before: String(oldest.published_at), key: oldest.url };
  if (search) nextParams.q = search;
  const next = !trending && page < cap && results.length > PAGE_SIZE
    ? `<a href="${local('/')}?${escape(new URLSearchParams(nextParams))}">${t(search ? 'More results' : 'Older stories')} →</a>` : '';
  const first = search ? `<a href="${local('/')}">${t('Clear search')}</a>` : page > 1 ? latestLink : '';
  const translationNote = zh ? `<p class="feed-note">${t('Chinese headlines use machine translation when available. Open a story to read it at the original source.')}</p>` : '';
  return html(view, section, header + translationNote + `<div class="stories">${cards}</div>` + (next || first ? `<nav class="pagination" aria-label="${t('Story pages')}">${first}${next}</nav>` : '') + `<p class="feed-note feed-status">${status}</p>`);
}

function about(view) {
  const { t, local, zh } = view;
  return html(view, 'About', zh ? `<div class="about-copy">
<p>${t('Bond6 began with a question about what happens to human expression when more of what we read, write, and share passes through algorithms. The name comes from carbon, element six and the basis of life.')}</p>
<h2>${t('What we cover')}</h2>
<p>${t('Transmissions follows writing, publishing, creative work, and life with AI. We look for reporting and first-person accounts that show how these changes play out in people’s work and everyday lives.')}</p>
<h2>${t('How the feed works')}</h2>
<p>${t('Bond6 checks a changing list of publishers, independent writers, and public accounts. We group links to the same article and send you to the original source to read it. Latest shows recent stories in order. Trending shows what the sources we follow have discussed in the past 24 hours.')}</p>
<p><a href="${local('/sources')}">${t('Sources')}</a> · <a href="${local('/subscribe')}">${t('Subscribe via RSS')}</a></p>
</div>` : `<div class="about-copy">
<p>Bond6 began with a question about what happens to human expression when more of what we read, write, and share passes through algorithms. The name comes from carbon, element six and the basis of life.</p>
<h2>What we cover</h2>
<p>Transmissions follows writing, publishing, creative work, and life with AI. We look for reporting and first-person accounts that show how these changes play out in people’s work and everyday lives.</p>
<h2>How the feed works</h2>
<p>Bond6 checks <a href="/sources">a changing list of publishers, independent writers, and public accounts</a>. We group links to the same article and send you to the original source to read it. <a href="/">Latest</a> shows recent stories in order. <a href="/trending">Trending</a> shows what the sources we follow have discussed in the past 24 hours.</p>
<p><a href="/subscribe">Subscribe via RSS</a> or <a href="mailto:info@bond6.io?subject=Bond6%20source%20suggestion">suggest a source</a>.</p>
</div>`);
}

function sourceList(view) {
  const { t } = view;
  const rows = sources.map(source => `<li><a href="${escape(source.site)}">${escape(source.name)}</a>
    <span>${source.kind === 'rss' ? 'RSS' : 'Bluesky'} · ${escape(t(source.topic))}</span></li>`).join('');
  return html(view, 'Sources', `<p class="feed-note">${t('Bond6 follows publishers, independent writers, and public accounts that cover writing, creative work, and life with AI. This list changes as we find new sources.')}</p>
<p class="feed-note"><a href="mailto:info@bond6.io?subject=Bond6%20source%20suggestion">${t('Suggest a source')}</a></p>
<ul class="sources">${rows}</ul>`);
}

function subscribe(url, view) {
  const path = view.local('/feed.xml');
  const address = escape(new URL(path, url).href);
  return html(view, 'Subscribe', `<p class="subscribe-copy">${view.t('Add this address to your RSS reader to receive the latest Bond6 stories.')}</p>
<p class="feed-address"><a href="${path}">${address}</a></p>`);
}

function xmlText(value) {
  return escape(String(value).replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, ''));
}

async function rss(env, url, { zh, local, lang, t }) {
  const { results } = await env.DB.prepare(
    'SELECT url, title, title_zh, topic, published_at FROM stories WHERE published_at >= ? ORDER BY published_at DESC, url DESC LIMIT 50'
  ).bind(Date.now() - 7 * DAY).all();
  const items = results.map(story => `<item>
    <title>${xmlText(decodeHeadline(zh ? story.title_zh || story.title : story.title))}</title>
    <link>${xmlText(story.url)}</link>
    <guid isPermaLink="false">${xmlText(story.url)}</guid>
    <pubDate>${new Date(story.published_at).toUTCString()}</pubDate>
    <category>${xmlText(t(story.topic))}</category>
  </item>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
  <title>Bond6 ${t('Transmissions')}</title>
  <link>${xmlText(new URL(local('/'), url).href)}</link>
  <description>${xmlText(t('News and essays on writing, creative work, and life with AI.'))}</description>
  <language>${lang}</language>
  <atom:link href="${xmlText(new URL(local('/feed.xml'), url).href)}" rel="self" type="application/rss+xml"/>
  ${items}
</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const view = locale(url);
    const { path, local, t } = view;
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    if (path === '/sources') return sourceList(view);
    if (path === '/about') return about(view);
    if (path === '/about.html') return Response.redirect(new URL(local('/about'), url), 301);
    if (path === '/subscribe') return subscribe(url, view);
    if (path === '/feed.xml') {
      try {
        return await rss(env, url, view);
      } catch (error) {
        console.error('RSS query failed', error.message);
        return new Response('Feed temporarily unavailable', { status: 503, headers: { 'Retry-After': '60' } });
      }
    }
    if (path !== '/' && path !== '/trending') {
      return html(view, 'Page unavailable', `<p class="notice"><a href="${local('/')}">${t('Go to Transmissions')}</a></p>`, 404);
    }
    try {
      return await feed(env, url, path === '/trending', view);
    } catch (error) {
      console.error('Feed query failed', error.message);
      return html(view, 'Feed unavailable', `<p class="notice">${t('The feed is temporarily unavailable. Please try again shortly.')}</p>`, 503);
    }
  },
  scheduled(controller, env, ctx) {
    ctx.waitUntil(collect(env, controller.scheduledTime).then(() => translateHeadlines(env, controller.scheduledTime)));
  }
};
