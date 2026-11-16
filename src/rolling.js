import { runJson, checkLanguage } from './ai.js';
import { enqueue, claim, saveJob } from './jobs.js';
import { dayKey } from './content.js';

export async function translateHeadlines(env, now) {
  // Protect capacity for daily picks and The Bond. Rolling translation runs afterward.
  if (!env.AI || env.TRANSLATE_HEADLINES !== 'true' || new Date(now).getUTCHours() < 15) return;
  const id='translate:'+dayKey(now)+':'+Math.floor(now/900000);
  await enqueue(env.DB,id,'translate',{},now);
  const job=await claim(env.DB,id,now);
  if (!job) return;
  const {results}=await env.DB.prepare(`SELECT url,title,original_lang,content_hash FROM stories WHERE lane IS NOT NULL
    AND (title_en IS NULL OR title_zh IS NULL) AND translate_after<=? ORDER BY discovered_at DESC LIMIT 12`).bind(now).all();
  if (!results.length) return saveJob(env.DB,job,{},now,{done:true});
  try {
    const output=await runJson(env,'rolling-translation',`Translate these headlines faithfully into English and Simplified Chinese. Preserve each id. Do not expand a headline into new information. Keep original names when unsure. Return {items:[{id,en,zh}]}.`,results.map((s,id)=>({id,title:s.title,language:s.original_lang})),now,750);
    const statements=[];
    for (const [id,s] of results.entries()) {
      const title=output.items?.find(i=>i.id===id);
      const en=s.original_lang==='en' ? s.title : title?.en, zh=s.original_lang==='zh' ? s.title : title?.zh;
      const numbers=s.title.match(/\d+(?:[.,]\d+)*/g)??[];
      const newNumber=((en??'')+(zh??'')).match(/\d+(?:[.,]\d+)*/g)?.some(n=>!numbers.includes(n));
      if (checkLanguage(en,'en',4,300) && checkLanguage(zh,'zh',4,300) && !newNumber)
        statements.push(env.DB.prepare('UPDATE stories SET title_en=?,title_zh=? WHERE url=? AND content_hash=?').bind(en,zh,s.url,s.content_hash));
      else statements.push(env.DB.prepare('UPDATE stories SET translate_after=? WHERE url=?').bind(now+6*3600000,s.url));
    }
    if (statements.length) await env.DB.batch(statements);
    await saveJob(env.DB,job,{},now,{done:true});
  } catch(error) { await saveJob(env.DB,job,{},now,{done:true,error:error.message}); }
}
