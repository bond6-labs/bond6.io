import {getPlatformProxy} from 'wrangler';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {runJson,notePrompt,reviewPrompt,sourceData,validateNote,normalizeNote,approved,BudgetError} from '../src/ai.js';
import {usableText,dayKey} from '../src/content.js';
const limit=Number(process.argv[2]??30);
await mkdir('.local',{recursive:true});
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
config.main='../src/worker.js';config.assets.directory='../public';config.ai.remote=true;
await writeFile('.local/audit.wrangler.json',JSON.stringify(config));
const proxy=await getPlatformProxy({configPath:'.local/audit.wrangler.json',remoteBindings:true,persist:{path:'.wrangler/state/v3'}});
try {
  const corpus=JSON.parse(await readFile('.local/source-corpus.json','utf8')).filter(s=>s.lane&&usableText(s));
  const en=corpus.filter(s=>s.original_lang==='en'),zh=corpus.filter(s=>s.original_lang==='zh');
  const queue=[];const counts={};
  while(queue.length<30&&(en.length||zh.length)){
    const list=queue.length%2===0&&zh.length?zh:en.length?en:zh;
    list.sort((a,b)=>(counts[a.source]??0)-(counts[b.source]??0));let index=0;
    const [s]=list.splice(index,1);if(queue.some(q=>q.url===s.url))continue;
    queue.push(s);counts[s.source]=(counts[s.source]??0)+1;
  }
  let report=[];try{report=JSON.parse(await readFile('.local/ai-audit.json','utf8'));}catch{}
  for(const story of queue){
    if(report.some(r=>r.story.content_hash===story.content_hash)||report.length>=limit)continue;
    const row={story,checkedAt:new Date().toISOString()};
    try{
      row.output=normalizeNote(await runJson(proxy.env,'launch-audit',notePrompt,sourceData(story),Date.now(),800),story);
      row.deterministic=validateNote(row.output,story);
      if(row.deterministic){row.review=await runJson(proxy.env,'launch-audit-review',reviewPrompt,{source:sourceData(story),proposed:row.output},Date.now(),280);row.passed=approved(row.review);}else row.passed=false;
    }catch(error){if(error instanceof BudgetError){console.log('Budget reached; review can resume tomorrow.');break;}row.error=error.message;row.passed=false;}
    report.push(row);await writeFile('.local/ai-audit.json',JSON.stringify(report,null,2));
    console.log(JSON.stringify({number:report.length,source:story.source,language:story.original_lang,passed:row.passed,error:row.error,reason:row.review?.reason}));
  }
  const usage=await proxy.env.DB.prepare('SELECT * FROM ai_usage WHERE day=?').bind(dayKey(Date.now())).first();
  console.log(JSON.stringify({reviewed:report.length,passed:report.filter(r=>r.passed).length,usage}));
}finally{await proxy.dispose();}
