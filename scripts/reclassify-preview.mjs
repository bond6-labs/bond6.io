import {getPlatformProxy} from 'wrangler';
import {readFile,writeFile} from 'node:fs/promises';
import {classify,contentHash} from '../src/content.js';
import {sources} from '../src/sources.js';
const proxy=await getPlatformProxy({remoteBindings:false});
try{
  const corpus=JSON.parse(await readFile('.local/source-corpus.json','utf8'));
  for(const s of corpus){Object.assign(s,classify(s.title,s.excerpt,sources.find(x=>x.id===s.source_id)));s.content_hash=await contentHash(s);await proxy.env.DB.prepare('UPDATE stories SET lane=?,subject=?,content_hash=? WHERE url=?').bind(s.lane,s.subject,s.content_hash,s.url).run();}
  await writeFile('.local/source-corpus.json',JSON.stringify(corpus,null,2));console.log('Reclassified '+corpus.length+' preview records.');
}finally{await proxy.dispose();}
