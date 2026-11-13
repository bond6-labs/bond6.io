import { decodeHeadline } from './headline.js';

export async function translateHeadlines(env, now) {
  if (!env.AI || env.TRANSLATE_HEADLINES !== 'true') return;
  const { results } = await env.DB.prepare(`SELECT url, title FROM stories
    WHERE title_zh IS NULL AND translate_after <= ?
    ORDER BY published_at DESC, url DESC LIMIT 3`).bind(now).all();

  for (const story of results) {
    try {
      const result = await env.AI.run('@cf/meta/m2m100-1.2b', {
        text: decodeHeadline(story.title),
        source_lang: 'english',
        target_lang: 'chinese'
      });
      const title = result.translated_text?.trim();
      if (!title || !/\p{Script=Han}/u.test(title)) throw new Error('No Chinese headline returned');
      await env.DB.prepare('UPDATE stories SET title_zh = ? WHERE url = ? AND title = ? AND title_zh IS NULL')
        .bind(title, story.url, story.title).run();
    } catch (error) {
      console.warn('Headline translation failed', error.message);
      await env.DB.prepare('UPDATE stories SET translate_after = ? WHERE url = ? AND title = ? AND title_zh IS NULL')
        .bind(now + 3_600_000, story.url, story.title).run();
    }
  }
}
