import test from 'node:test';
import assert from 'node:assert/strict';
import { RHYTHM_VERSION, scoreRhythm, saveRhythmSignals } from '../src/rhythm.js';
import { database } from './db.js';
import { story, now } from './fixtures.js';

test('Rhythm selects evidenced human and AI signals without source-name shortcuts',()=>{
  const human=scoreRhythm(story(1,{title:'I recorded songs with neighbours',excerpt:'I spent the season recording songs with my neighbours in a local community studio.'}));
  assert.equal(human.lane_recommendation,'human');assert.ok(human.labels.includes('Creative practice'));
  const ai=scoreRhythm(story(2,{title:'AI scheduling changes teachers’ work',excerpt:'A report documents how a generative AI platform changes teachers’ work, privacy, and classroom culture.'}));
  assert.equal(ai.lane_recommendation,'ai');assert.ok(ai.evidence.every(item=>ai.title===undefined||item.evidence));
  assert.equal(scoreRhythm(story(3,{title:'New chip announced',excerpt:'A company announced a new chip today.'})).lane_recommendation,null);
});

test('Rhythm signals are stored with labels and evidence',async()=>{
  const db=database(),item=story(4);db.sql.prepare(`INSERT INTO stories(url,title,source,topic,published_at,is_article) VALUES(?,?,?,?,?,?)`).run(item.url,item.title,item.source,'Music',now,1);
  await saveRhythmSignals(db,[item],now);
  const signal=await db.prepare('SELECT * FROM story_signals WHERE story_url=?').bind(item.url).first();
  assert.equal(signal.rhythm_version,RHYTHM_VERSION);assert.ok(JSON.parse(signal.labels).length);assert.ok(JSON.parse(signal.evidence)[0].evidence);
});
