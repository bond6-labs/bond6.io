import {getPlatformProxy} from 'wrangler';
import {sources} from '../src/sources.js';
import {poll,storeItems} from '../src/ingest.js';
import {mkdir,writeFile} from 'node:fs/promises';
const proxy=await getPlatformProxy({remoteBindings:false});
try {
  const corpus=[];
  for(let i=0;i<sources.length;i+=3){
    const batch=sources.slice(i,i+3);
    const results=await Promise.allSettled(batch.map(s=>poll(s,null,Date.now())));
    for(const [j,result] of results.entries()){
      if(result.status==='rejected'){console.log(batch[j].id+': '+result.reason.message);continue;}
      await storeItems(proxy.env.DB,batch[j],result.value.items,Date.now());
      corpus.push(...result.value.items.map(s=>({...s,source:batch[j].name,source_id:batch[j].id,discovered_at:Date.now()})));
      console.log(batch[j].id+': '+result.value.items.length+' items');
    }
  }
  await mkdir('.local',{recursive:true});await writeFile('.local/source-corpus.json',JSON.stringify(corpus,null,2));
  console.log('Saved '+corpus.length+' real source records for local preview and audit.');
}finally{await proxy.dispose();}
