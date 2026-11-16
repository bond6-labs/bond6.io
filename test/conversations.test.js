import test from 'node:test';
import assert from 'node:assert/strict';
import { conversations, storyTopics } from '../src/content.js';

const now=Date.parse('2026-11-15T12:00:00Z');
const story=(source_id,title,excerpt,discovered_at=now)=>({source_id,title,excerpt,discovered_at});

test('conversation topics require three independent tracked sources',()=>{
  const one=story('one','A new album from an independent musician','The songwriter discusses recording and touring.');
  assert.deepEqual(conversations([one],now),[]);
  const two=story('two','Touring bands rethink independent music','A musician writes about a new album and record label.');
  assert.deepEqual(conversations([one,two],now),[]);
  const three=story('three','Independent bands return to touring','An independent musician describes a new album and concert.');
  const result=conversations([one,two,three],now);
  assert.equal(result[0].key,'independent-music');
  assert.equal(result[0].sources,3);
});

test('expired items and unrelated text do not create a topic signal',()=>{
  const old=story('one','A new album','A musician writes about a concert.',now-8*86400000);
  const office=story('two','Office announcements','A timetable for next week.');
  assert.deepEqual(conversations([old,office],now),[]);
  assert.deepEqual(storyTopics(office),[]);
});
