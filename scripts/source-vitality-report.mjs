// Read-only Source Vitality diagnostic. Requires an existing Wrangler login
// and intentionally prints only source-level aggregates, never credentials or
// reader-level activity. Run: npm run report:sources
import {getPlatformProxy} from 'wrangler';
import {readFile,writeFile,mkdir} from 'node:fs/promises';

await mkdir('.local',{recursive:true});
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
config.main='../src/worker.js';
config.assets.directory='../public';
config.d1_databases[0].remote=true;
delete config.ai;
await writeFile('.local/source-vitality-report.wrangler.json',JSON.stringify(config));

const proxy=await getPlatformProxy({configPath:'.local/source-vitality-report.wrangler.json',remoteBindings:true});
const timestamp=value=>value?new Date(Number(value)).toISOString():null;

try {
  const DB=proxy.env.DB;
  const start=Date.now()-90*86_400_000;
  const {results}=await DB.prepare(`SELECT
      c.id,c.name,c.language,c.intended_lane AS lane,c.config,c.state,c.tier,c.expected_minutes,
      c.last_success_at,c.last_new_item_at,c.state_reason,
      coalesce(sum(o.checks),0) AS fetches,
      coalesce(sum(o.successes),0) AS successes,
      coalesce(sum(o.errors),0) AS errors,
      coalesce(sum(o.raw_items),0) AS raw_items,
      coalesce(sum(o.usable_items),0) AS usable_items,
      coalesce(sum(o.accepted_items),0) AS accepted_items,
      coalesce(sum(o.duplicate_items),0) AS duplicate_items,
      coalesce(sum(o.new_items),0) AS new_items,
      CASE WHEN coalesce(sum(o.discovery_lag_samples),0)>0 THEN round(coalesce(sum(o.discovery_lag_total_minutes),0)*1.0/sum(o.discovery_lag_samples)) END AS average_discovery_lag_minutes,
      coalesce(flow.current_items,0) AS current_flow_items,
      latest.standing,latest.vitality_score,latest.value_score,latest.recommendation,latest.rationale
    FROM source_catalogue c
    LEFT JOIN source_daily_observations o ON o.source_id=c.id AND o.day>=?
    LEFT JOIN (
      SELECT source_id,count(*) AS current_items
      FROM stories
      WHERE lane IS NOT NULL AND discovered_at>=?
      GROUP BY source_id
    ) flow ON flow.source_id=c.id
    LEFT JOIN source_evaluations latest ON latest.source_id=c.id AND latest.evaluated_at=(
      SELECT max(e2.evaluated_at) FROM source_evaluations e2 WHERE e2.source_id=c.id
    )
    GROUP BY c.id
    ORDER BY c.language,c.intended_lane,c.state,c.name`).bind(new Date(start).toISOString().slice(0,10),start).all();

  const sources=results.map(row=>{
    const config=JSON.parse(row.config||'{}');
    return ({
    id:row.id,name:row.name,language:row.language,lane:row.lane,state:row.state,
    coverage_role:config.coverage_role??null,coverage_lane:config.coverage_lane??row.lane,
    cadence_minutes:Number(row.expected_minutes),
    fetches:Number(row.fetches),successes:Number(row.successes),errors:Number(row.errors),
    raw_items:Number(row.raw_items),usable_items:Number(row.usable_items),accepted_items:Number(row.accepted_items),
    duplicate_items:Number(row.duplicate_items),new_items:Number(row.new_items),average_discovery_lag_minutes:row.average_discovery_lag_minutes==null?null:Number(row.average_discovery_lag_minutes),
    // This is the current number eligible to render in the live flow—not a
    // reader impression count, which Bond6 deliberately does not retain.
    current_flow_items:Number(row.current_flow_items),
    last_success_at:timestamp(row.last_success_at),last_new_content_at:timestamp(row.last_new_item_at),
    standing:row.standing==null?null:Number(row.standing),vitality:row.vitality_score==null?null:Number(row.vitality_score),
    value:row.value_score==null?null:Number(row.value_score),recommendation:row.recommendation??null,
    rationale:row.rationale??row.state_reason??null
    });
  });
  const {results:coverage}=await DB.prepare(`SELECT * FROM source_coverage_audits
    WHERE audit_day=(SELECT max(audit_day) FROM source_coverage_audits)
    ORDER BY language,lane,coverage_role`).all();
  const stateCounts=sources.reduce((counts,source)=>{
    counts[source.state]=(counts[source.state]??0)+1;
    return counts;
  },{});
  const summary={
    total:sources.length,
    by_state:stateCounts,
    failing_or_paused:sources.filter(source=>source.state==='paused'||source.errors>source.successes),
    weak_yield:sources.filter(source=>source.raw_items>=40&&source.accepted_items/source.raw_items<.05),
    promotion_ready:sources.filter(source=>source.recommendation==='promote-review'),
    coverage_gaps:coverage.filter(row=>row.status!=='covered')
  };
  console.log(JSON.stringify({generated_at:new Date().toISOString(),window_days:90,
    definition:'current_flow_items counts currently retained, lane-eligible cards; discovery lag measures first observation after publication for post-baseline items. Bond6 does not store reader impression logs.',summary,coverage,sources},null,2));
} finally {
  await proxy.dispose();
}
