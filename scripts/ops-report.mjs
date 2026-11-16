// Read-only report. Uses Wrangler authentication; never prints credentials.
import {getPlatformProxy} from 'wrangler';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('.local',{recursive:true});
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
config.main='../src/worker.js';config.assets.directory='../public';config.d1_databases[0].remote=true;
delete config.ai;
await writeFile('.local/report.wrangler.json',JSON.stringify(config));
const proxy=await getPlatformProxy({configPath:'.local/report.wrangler.json',remoteBindings:true});
try {
  const DB=proxy.env.DB;
  const queries={
    editions:`SELECT kind,edition_date,json_array_length(json_extract(snapshot,'$.stories')) AS picks FROM editions ORDER BY edition_date DESC LIMIT 14`,
    sources:`SELECT id,datetime(ok_at/1000,'unixepoch') AS last_success,failures FROM source_state ORDER BY failures DESC,id`,
    jobs:`SELECT id,kind,status,attempts,last_error,datetime(updated_at/1000,'unixepoch') AS updated FROM jobs WHERE kind<>'collect' ORDER BY updated_at DESC LIMIT 30`,
    ai:`SELECT * FROM ai_usage ORDER BY day DESC LIMIT 14`,
    rhythm:`SELECT edition_date,rhythm_version,snapshot,datetime(updated_at/1000,'unixepoch') AS updated FROM rhythm_audits ORDER BY edition_date DESC LIMIT 14`,
    engagement:`SELECT * FROM metrics ORDER BY day DESC,event LIMIT 180`,
    coverage:`SELECT lane,original_lang,source,count(*) AS items FROM stories WHERE lane IS NOT NULL GROUP BY lane,original_lang,source`
  };
  const result={checkedAt:new Date().toISOString()};
  for(const [key,query]of Object.entries(queries))result[key]=(await DB.prepare(query).all()).results;
  console.log(JSON.stringify(result,null,2));
}finally{await proxy.dispose();}
