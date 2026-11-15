// Local-only preview made from source-checked audit outputs, never fixture news.
import {getPlatformProxy} from 'wrangler';
import {readFile} from 'node:fs/promises';
import {snapshotStory} from '../src/publishing.js';
import {dayKey} from '../src/content.js';
const proxy=await getPlatformProxy({remoteBindings:false});
try{
  const report=JSON.parse(await readFile('.local/ai-audit.json','utf8'));
  const selected=[],sources=new Set();
  for(const r of report.filter(r=>r.passed))if(!sources.has(r.story.source)&&selected.filter(s=>s.lane===r.story.lane).length<3){selected.push(snapshotStory(r.story,r.output));sources.add(r.story.source);}
  if(!selected.length)throw new Error('No validated notes available');
  const date=dayKey(Date.now()),snapshot={id:date,kind:'daily',date,stories:selected};
  await proxy.env.DB.prepare(`INSERT INTO editions(id,kind,edition_date,published_at,snapshot) VALUES(?,'daily',?,?,?)
    ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot`).bind(date,date,Date.now(),JSON.stringify(snapshot)).run();
  console.log('Local preview: '+selected.length+' validated picks.');
}finally{await proxy.dispose();}
