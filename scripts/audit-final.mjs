import {getPlatformProxy} from 'wrangler';
import {readFile,writeFile} from 'node:fs/promises';
import {runJson,notePrompt,sourceData,validateNote,normalizeNote,checkLanguage} from '../src/ai.js';
import {dayKey} from '../src/content.js';
const proxy=await getPlatformProxy({configPath:'.local/audit.wrangler.json',remoteBindings:true,persist:{path:'.wrangler/state/v3'}});
try{
  const corpus=JSON.parse(await readFile('.local/source-corpus.json','utf8'));
  const s=corpus.find(s=>s.source_id==='dash-social'&&s.lane==='ai');
  const output=normalizeNote(await runJson(proxy.env,'passage-reference-audit',notePrompt,sourceData(s),Date.now(),500),s);
  const result={story:s,output,deterministic:validateNote(output,s)};
  await writeFile('.local/passage-audit.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passageReferencesValid:result.deterministic}));
  const titles=[corpus.find(s=>s.source_id==='gcores'),corpus.find(s=>s.source_id==='bandcamp')].filter(Boolean);
  const translated=await runJson(proxy.env,'headline-audit','Translate both headlines into English and Simplified Chinese. Preserve proper names. Return {items:[{id,en,zh}]}.',titles.map((s,id)=>({id,title:s.title})),Date.now(),200);
  await writeFile('.local/headline-audit.json',JSON.stringify({titles,translated},null,2));
  console.log(JSON.stringify({headlines:translated.items?.map(i=>({id:i.id,en:i.en,zh:i.zh,valid:checkLanguage(i.en,'en',4,300)&&checkLanguage(i.zh,'zh',4,300)}))}));
  console.log(JSON.stringify(await proxy.env.DB.prepare('SELECT * FROM ai_usage WHERE day=?').bind(dayKey(Date.now())).first()));
}finally{await proxy.dispose();}
