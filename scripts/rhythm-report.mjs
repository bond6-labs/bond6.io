// Internal, read-only Rhythm calibration report. Requires Wrangler login and
// intentionally prints public-story metadata only; it never prints credentials.
import {getPlatformProxy} from 'wrangler';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {RHYTHM_REVIEW_SAMPLE_SIZE} from '../src/config.js';

await mkdir('.local',{recursive:true});
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
config.main='../src/worker.js';
config.assets.directory='../public';
config.d1_databases[0].remote=true;
delete config.ai;
await writeFile('.local/rhythm-report.wrangler.json',JSON.stringify(config));
const proxy=await getPlatformProxy({configPath:'.local/rhythm-report.wrangler.json',remoteBindings:true});
const parse=value=>{try{return JSON.parse(value??'[]');}catch{return [];}};
const key=value=>String(value??'Unspecified');
const countBy=(rows,select)=>Object.fromEntries([...rows.reduce((map,row)=>{
  const item=key(select(row)); map.set(item,(map.get(item)??0)+1); return map;
},new Map()).entries()].sort(([a],[b])=>a.localeCompare(b)));
const top=(rows,select,limit=12)=>Object.entries(countBy(rows,select)).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)).slice(0,limit);
const band=value=>value>=.8?'high (.80+)':value>=.6?'eligible (.60–.79)':value>0?'low (<.60)':'none';
const stableSample=(rows,size)=>{
  const groups=[['en','human'],['en','ai'],['zh','human'],['zh','ai']];
  const selected=[], seen=new Set(), perGroup=Math.ceil(size/groups.length);
  for(const [language,lane] of groups) for(const row of rows) {
    if(selected.length>=size || seen.has(row.url) || row.original_lang!==language || row.lane!==lane) continue;
    selected.push(row); seen.add(row.url); if(selected.filter(item=>item.original_lang===language&&item.lane===lane).length>=perGroup) break;
  }
  for(const row of rows) if(selected.length<size&&!seen.has(row.url)) {selected.push(row);seen.add(row.url);}
  return selected.slice(0,size);
};

try {
  const DB=proxy.env.DB;
  const {results:rows}=await DB.prepare(`SELECT s.url,s.title,s.source,s.author,s.lane,s.subject,s.original_lang,s.original_published_at,s.discovered_at,
      r.human_score,r.ai_score,r.lane_recommendation,r.confidence,r.labels,r.evidence,r.exclusion_reason,r.scored_at
    FROM stories s LEFT JOIN story_signals r ON r.story_url=s.url
    WHERE s.lane IS NOT NULL AND s.discovered_at>=? ORDER BY s.discovered_at DESC,s.url DESC LIMIT 500`).bind(Date.now()-7*86400000).all();
  const normalized=rows.map(row=>({...row,labels:parse(row.labels),evidence:parse(row.evidence),confidence:Number(row.confidence??0)}));
  const scored=normalized.filter(row=>row.scored_at);
  const eligible=scored.filter(row=>row.lane_recommendation===row.lane&&row.confidence>=.6);
  const review=stableSample(normalized,RHYTHM_REVIEW_SAMPLE_SIZE).map(row=>({
    url:row.url,title:row.title,source:row.source,author:row.author,lane:row.lane,language:row.original_lang,subject:row.subject,
    original_published_at:row.original_published_at,discovered_at:row.discovered_at,
    scores:{human:row.human_score??0,ai:row.ai_score??0,confidence:row.confidence,recommended_lane:row.lane_recommendation??null},
    labels:row.labels,evidence:row.evidence,exclusion:row.exclusion_reason??null
  }));
  const report={
    generated_at:new Date().toISOString(),window_days:7,review_sample_size:review.length,
    review_instruction:'Check title, lane, labels, and each evidence excerpt against the linked original. Mark wrong-lane, weak-evidence, missing-translation, duplicate, or unsafe-to-promote items before enabling RHYTHM_LIVE_RANKING.',
    signal_coverage:{retained:normalized.length,scored:scored.length,unscored:normalized.length-scored.length,eligible_for_lane:eligible.length},
    labels:countBy(scored.flatMap(row=>row.labels).map(label=>({label})),row=>row.label),
    exclusions:countBy(scored.filter(row=>row.exclusion_reason),row=>row.exclusion_reason),
    confidence_bands:countBy(scored,row=>band(row.confidence)),
    lane_comparison:{matching:scored.filter(row=>row.lane_recommendation===row.lane).length,mismatched:scored.filter(row=>row.lane_recommendation&&row.lane_recommendation!==row.lane).length,unrecommended:scored.filter(row=>!row.lane_recommendation).length},
    source_concentration:{all:top(normalized,row=>row.source),eligible:top(eligible,row=>row.source),by_lane_language:groupsSummary(normalized)},
    sample:review
  };
  console.log(JSON.stringify(report,null,2));
} finally { await proxy.dispose(); }

function groupsSummary(rows) {
  const groups={};
  for(const row of rows) {
    const group=`${row.lane}/${row.original_lang}`;
    (groups[group]??=[]).push(row);
  }
  return Object.fromEntries(Object.entries(groups).map(([group,items])=>[group,top(items,item=>item.source,8)]));
}
