import test from 'node:test';
import assert from 'node:assert/strict';
import { database } from './db.js';
import { now } from './fixtures.js';
import { dueSources, ensureSourceCatalogue, evaluateSource, evaluateSourceVitality, observeSource, sourceFromCatalogue } from '../src/source-vitality.js';
import { sources, archivedSources } from '../src/sources.js';

test('Source Vitality seeds every current source once without replacing its operational state',async()=>{
  const db=database();
  assert.equal(await ensureSourceCatalogue(db,now),true);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM source_catalogue').first()).n,sources.length+archivedSources.length);
  await db.prepare("UPDATE source_catalogue SET state='watch',expected_minutes=1440,state_reason='Reviewed' WHERE id=?").bind(sources[0].id).run();
  await db.prepare("UPDATE source_catalogue_meta SET value='force-reseed' WHERE id='version'").run();
  assert.equal(await ensureSourceCatalogue(db,now+1),true);
  const row=await db.prepare('SELECT * FROM source_catalogue WHERE id=?').bind(sources[0].id).first();
  assert.equal(row.state,'watch');
  assert.equal(row.expected_minutes,1440);
  assert.equal(sourceFromCatalogue(row).id,sources[0].id);
});

test('due source query only returns catalogue sources whose schedule has elapsed',async()=>{
  const db=database();await ensureSourceCatalogue(db,now);
  await db.prepare('INSERT INTO source_state VALUES(?,?,?,?,?,?,?)').bind('bandcamp',null,null,now,now,0,now+60_000).run();
  const due=await dueSources(db,now,sources.length+1);
  assert.ok(due.every(row=>row.id!=='bandcamp'));
  const later=await dueSources(db,now+60_000,sources.length+1);
  assert.ok(later.some(row=>row.id==='bandcamp'));
  await db.prepare("UPDATE source_catalogue SET state='paused' WHERE id='bandcamp'").run();
  assert.ok(!(await dueSources(db,now+60_000,sources.length+1)).some(row=>row.id==='bandcamp'));
});

test('candidate sources retain their trial state and slow daily cadence when seeded',async()=>{
  const db=database();await ensureSourceCatalogue(db,now);
  const row=await db.prepare('SELECT * FROM source_catalogue WHERE id=?').bind('atlas-obscura').first();
  assert.equal(row.state,'candidate');
  assert.equal(row.tier,'candidate');
  assert.equal(row.expected_minutes,1440);
  const source=sourceFromCatalogue(row);
  assert.equal(source.catalogue_state,'candidate');
  assert.equal(source.lane,'human');
  assert.equal(source.language,'en');
});

test('reference-only sources remain catalogued without being handed to the feed collector',async()=>{
  const db=database();await ensureSourceCatalogue(db,now);
  const reference=await db.prepare('SELECT kind,state,feed_url FROM source_catalogue WHERE id=?').bind('china-poetry-network').first();
  assert.equal(reference.kind,'reference');
  assert.equal(reference.state,'candidate');
  assert.equal(reference.feed_url,null);
  const due=await dueSources(db,now,sources.length+1);
  assert.ok(!due.some(source=>source.id==='china-poetry-network'));
});

test('retired sources remain catalogued with a reversible documented reason',async()=>{
  const db=database();await ensureSourceCatalogue(db,now);
  const row=await db.prepare('SELECT state,state_reason,feed_url FROM source_catalogue WHERE id=?').bind('gcores').first();
  assert.equal(row.state,'retired');
  assert.match(row.state_reason,/gaming-news/i);
  assert.equal(row.feed_url,'https://www.gcores.com/rss');
  assert.ok(!(await dueSources(db,now,sources.length+archivedSources.length)).some(source=>source.id==='gcores'));
});

test('daily observations preserve new-item evidence and produce a review recommendation',async()=>{
  const db=database();await ensureSourceCatalogue(db,now-15*86_400_000);
  const source=sourceFromCatalogue(await db.prepare('SELECT * FROM source_catalogue WHERE id=?').bind('bandcamp').first());
  for(let day=0;day<14;day++)await observeSource(db,source,{success:true,raw_items:5,usable_items:4,accepted_items:2,duplicate_items:0,last_new_item_at:now-day*86_400_000},now-day*86_400_000);
  const result=await evaluateSourceVitality(db,now);
  const bandcamp=result.find(row=>row.id==='bandcamp');
  assert.ok(bandcamp.standing>=65);assert.equal(bandcamp.recommendation,'keep');
  assert.ok((await db.prepare('SELECT count(*) AS n FROM source_evaluations WHERE source_id=?').bind('bandcamp').first()).n===1);
});

test('persistent technical failures can pause while weak editorial yield only recommends review',()=>{
  const base={checks:14,successes:0,errors:14,raw_items:0,usable_items:0,accepted_items:0,duplicate_items:0,last_success_at:null,last_new_item_at:null,expected_minutes:60,added_at:now-31*86_400_000,state:'active',pinned:0,failed_days:14};
  assert.equal(evaluateSource(base,now).recommendation,'retire-technical');
  assert.equal(evaluateSource({...base,added_at:now-15*86_400_000},now).recommendation,'pause');
  const weak={...base,checks:20,successes:20,errors:0,raw_items:100,usable_items:90,accepted_items:1,duplicate_items:0,last_success_at:now,last_new_item_at:now,failed_days:0};
  assert.equal(evaluateSource(weak,now).recommendation,'retire-review');
});

test('a source that answers but no longer publishes new material moves to slow watch',()=>{
  const stale={checks:20,successes:20,errors:0,raw_items:40,usable_items:30,accepted_items:12,duplicate_items:4,last_success_at:now,last_new_item_at:now-61*86_400_000,expected_minutes:480,added_at:now-61*86_400_000,state:'active',pinned:0,failed_days:0};
  assert.equal(evaluateSource(stale,now).recommendation,'watch-stale');
});

test('a readable trial feed can earn promotion review after candidate becomes probation',()=>{
  const trial={checks:14,successes:14,errors:0,raw_items:30,usable_items:24,accepted_items:12,duplicate_items:1,last_success_at:now,last_new_item_at:now,expected_minutes:1440,added_at:now-15*86_400_000,state:'probation',pinned:0,failed_days:0};
  assert.equal(evaluateSource(trial,now).recommendation,'promote-review');
});
