import { dayKey } from './content.js';
import { SOURCE_CATALOGUE_VERSION, SOURCE_VITALITY_RETENTION_DAYS } from './config.js';
import { sources, archivedSources } from './sources.js';

const DAY=86_400_000;
const STALE_SOURCE_DAYS=60;
const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,value));
const languageFor=source=>source.language ?? (['sspai','qbitai','kaix','maohang','conge','hehew'].includes(source.id)?'zh':'en');
// Only the sources where speed materially changes the AI Wave remain rapid.
// Everything else earns collection capacity through evidence rather than a
// historic per-feed interval that would overflow the free-tier poll budget.
const rapidSourceIds=new Set(['platformer','404','techdirt','techcrunch-ai','verge-ai','the-decoder']);
const tierFor=source=>source.state==='candidate'||source.tier==='candidate'?'candidate':rapidSourceIds.has(source.id)?'rapid':(source.tier==='flow'||Number(source.poll_minutes??240)<=90?'standard':'slow');
const expectedMinutes=source=>tierFor(source)==='rapid'?45:tierFor(source)==='standard'?240:tierFor(source)==='candidate'?1440:480;
const configFor=source=>JSON.stringify({
  url:source.url??null,handle:source.handle??null,essays:source.essays===true,allPosts:source.allPosts===true,
  title_prefixes:source.title_prefixes??[],lane:source.lane??null
});

export function catalogueSource(source, now=Date.now()) {
  return {id:source.id,name:source.name,feed_url:source.url??null,site_url:source.site,kind:source.kind??'rss',config:configFor(source),
    language:languageFor(source),intended_lane:source.lane??null,topic:source.topic,state:source.state??'active',tier:tierFor(source),
    expected_minutes:expectedMinutes(source),pinned:0,added_at:now,last_state_change:now,state_reason:source.state_reason??null};
}

export function sourceFromCatalogue(row) {
  const config=JSON.parse(row.config||'{}');
  return {id:row.id,name:row.name,kind:row.kind,url:row.feed_url??config.url??undefined,handle:config.handle??undefined,
    site:row.site_url,topic:row.topic,language:row.language,lane:row.intended_lane??config.lane??undefined,
    essays:config.essays===true,allPosts:config.allPosts===true,title_prefixes:config.title_prefixes??[],
    poll_minutes:row.expected_minutes,catalogue_state:row.state,tier:row.tier};
}

/** Seed current code-owned sources once. Later state changes are never overwritten. */
export async function ensureSourceCatalogue(db, now=Date.now()) {
  const current=await db.prepare('SELECT value FROM source_catalogue_meta WHERE id=?').bind('version').first();
  if(current?.value===SOURCE_CATALOGUE_VERSION)return false;
  const statements=[];
  for(const source of [...sources,...archivedSources]){
    const row=catalogueSource(source,now);
    statements.push(db.prepare(`INSERT INTO source_catalogue(id,name,feed_url,site_url,kind,config,language,intended_lane,topic,state,tier,expected_minutes,pinned,added_at,last_state_change,state_reason)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,feed_url=excluded.feed_url,site_url=excluded.site_url,kind=excluded.kind,
      config=excluded.config,language=excluded.language,intended_lane=excluded.intended_lane,topic=excluded.topic`)
      .bind(row.id,row.name,row.feed_url,row.site_url,row.kind,row.config,row.language,row.intended_lane,row.topic,row.state,row.tier,row.expected_minutes,row.pinned,row.added_at,row.last_state_change,row.state_reason));
  }
  statements.push(db.prepare(`INSERT INTO source_catalogue_meta(id,value,updated_at) VALUES('version',?,?)
    ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(SOURCE_CATALOGUE_VERSION,now));
  await db.batch(statements); return true;
}

export async function dueSources(db, now, limit) {
  const {results}=await db.prepare(`SELECT c.*,s.next_at,s.etag,s.modified,s.failures,s.checked_at,s.ok_at
    FROM source_catalogue c LEFT JOIN source_state s ON s.id=c.id
    WHERE c.state IN ('candidate','probation','active','watch') AND coalesce(s.next_at,0)<=?
    ORDER BY coalesce(s.next_at,0), CASE c.tier WHEN 'rapid' THEN 0 WHEN 'standard' THEN 1 WHEN 'slow' THEN 2 ELSE 3 END, c.id
    LIMIT ?`).bind(now,limit).all();
  return results;
}

export async function observeSource(db, source, observation, now=Date.now()) {
  const day=dayKey(now), summary=JSON.stringify(observation.rejections??{});
  await db.prepare(`INSERT INTO source_daily_observations(source_id,day,checks,successes,errors,raw_items,usable_items,accepted_items,duplicate_items,rejection_summary,last_new_item_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_id,day) DO UPDATE SET
    checks=checks+excluded.checks,successes=successes+excluded.successes,errors=errors+excluded.errors,
    raw_items=raw_items+excluded.raw_items,usable_items=usable_items+excluded.usable_items,accepted_items=accepted_items+excluded.accepted_items,
    duplicate_items=duplicate_items+excluded.duplicate_items,
    rejection_summary=excluded.rejection_summary,last_new_item_at=CASE WHEN coalesce(excluded.last_new_item_at,0)>coalesce(last_new_item_at,0) THEN excluded.last_new_item_at ELSE last_new_item_at END`)
    .bind(source.id,day,1,observation.success?1:0,observation.success?0:1,observation.raw_items??0,observation.usable_items??0,
      observation.accepted_items??0,observation.duplicate_items??0,summary,observation.last_new_item_at??null).run();
  if(observation.success)await db.prepare(`UPDATE source_catalogue SET last_success_at=?,last_new_item_at=CASE WHEN ?>coalesce(last_new_item_at,0) THEN ? ELSE last_new_item_at END WHERE id=?`)
    .bind(now,observation.last_new_item_at??0,observation.last_new_item_at??0,source.id).run();
}

const ratio=(numerator,denominator,priorNumerator=0,priorDenominator=0)=>
  (Number(numerator)+priorNumerator)/(Math.max(0,Number(denominator))+priorDenominator);
const freshness=(lastNew,expected,now)=>{
  if(!lastNew)return 35;
  const intervals=(now-Number(lastNew))/Math.max(10,Number(expected))*60_000;
  return intervals<=3?100:intervals<=7?60:intervals<=21?25:0;
};
export function evaluateSource(row, now=Date.now()) {
  const checks=Number(row.checks||0),successes=Number(row.successes||0),errors=Number(row.errors||0),raw=Number(row.raw_items||0),usable=Number(row.usable_items||0),accepted=Number(row.accepted_items||0),duplicates=Number(row.duplicate_items||0);
  const reliable=ratio(successes,checks,1,2), complete=ratio(usable,raw,2,4), fit=ratio(accepted,usable,2,10), original=accepted?1-clamp(duplicates/accepted,0,1):.5;
  const vitality=Math.round(clamp(reliable*40+freshness(row.last_new_item_at,row.expected_minutes,now)*.35+complete*15+(1-clamp(errors/Math.max(1,checks),0,1))*10));
  const value=Math.round(clamp(fit*35+complete*25+original*15+freshness(row.last_new_item_at,row.expected_minutes,now)*.15+5));
  const standing=Math.round(vitality*.45+value*.55);
  const age=now-Number(row.added_at||now), failedDays=Number(row.failed_days||0), noSuccess=!row.last_success_at||now-Number(row.last_success_at)>30*DAY;
  const stale=age>=STALE_SOURCE_DAYS*DAY&&(!row.last_new_item_at||now-Number(row.last_new_item_at)>=STALE_SOURCE_DAYS*DAY);
  let recommendation='keep',rationale='Evidence is still accumulating.';
  if(age>=30*DAY&&noSuccess){recommendation='retire-technical';rationale='No successful feed response in 30 days.';}
  else if(failedDays>=14){recommendation='pause';rationale='No successful feed response on 14 observed days.';}
  else if(row.state==='active'&&stale){recommendation='watch-stale';rationale=`No genuinely new item recorded in ${STALE_SOURCE_DAYS} days; slow collection and review before any retirement.`;}
  else if(raw>=100&&accepted<3&&!row.pinned){recommendation='retire-review';rationale='Fewer than 3 accepted items from at least 100 raw items.';}
  else if(raw>=40&&(accepted/raw)<.05&&!row.pinned){recommendation='watch';rationale='Accepted-item yield is below 5% after a meaningful sample.';}
  else if((row.state==='candidate'||row.state==='probation')&&usable>=20&&age>=14*DAY&&standing>=65){recommendation='promote-review';rationale='Trial source has enough usable evidence and a strong standing.';}
  else if(row.state==='watch'&&standing>=65){recommendation='recover-review';rationale='Standing has recovered above the active threshold.';}
  return {vitality,value,standing,recommendation,rationale};
}

export async function evaluateSourceVitality(db, now=Date.now()) {
  const start=now-SOURCE_VITALITY_RETENTION_DAYS*DAY;
  const {results}=await db.prepare(`SELECT c.*,
    coalesce(sum(o.checks),0) AS checks,coalesce(sum(o.successes),0) AS successes,coalesce(sum(o.errors),0) AS errors,
    coalesce(sum(o.raw_items),0) AS raw_items,coalesce(sum(o.usable_items),0) AS usable_items,
    coalesce(sum(o.accepted_items),0) AS accepted_items,coalesce(sum(o.duplicate_items),0) AS duplicate_items,
    sum(CASE WHEN o.errors>0 AND o.successes=0 THEN 1 ELSE 0 END) AS failed_days
    FROM source_catalogue c LEFT JOIN source_daily_observations o ON o.source_id=c.id AND o.day>=?
    WHERE c.state IN ('candidate','probation','active','watch','paused') GROUP BY c.id`).bind(dayKey(start)).all();
  const statements=[];
  for(const row of results){
    const score=evaluateSource(row,now);
    statements.push(db.prepare(`INSERT INTO source_evaluations(source_id,evaluated_at,sample_start,sample_end,vitality_score,value_score,standing,recommendation,rationale)
      VALUES(?,?,?,?,?,?,?,?,?)`).bind(row.id,now,start,now,score.vitality,score.value,score.standing,score.recommendation,score.rationale));
    if(score.recommendation==='pause'||score.recommendation==='retire-technical')statements.push(db.prepare(`UPDATE source_catalogue SET state=?,last_state_change=?,state_reason=? WHERE id=? AND state NOT IN ('retired')`)
      .bind(score.recommendation==='pause'?'paused':'retired',now,score.rationale,row.id));
    else if(score.recommendation==='watch-stale')statements.push(db.prepare(`UPDATE source_catalogue SET state='watch',tier='slow',expected_minutes=1440,last_state_change=?,state_reason=? WHERE id=? AND state='active'`)
      .bind(now,score.rationale,row.id));
  }
  if(statements.length)await db.batch(statements);
  return results.map(row=>({id:row.id,...evaluateSource(row,now)}));
}

export async function pruneSourceVitality(db, now=Date.now()) {
  await db.batch([
    db.prepare('DELETE FROM source_daily_observations WHERE day<?').bind(dayKey(now-SOURCE_VITALITY_RETENTION_DAYS*DAY)),
    db.prepare('DELETE FROM source_evaluations WHERE evaluated_at<?').bind(now-SOURCE_VITALITY_RETENTION_DAYS*DAY)
  ]);
}
