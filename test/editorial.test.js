import test from 'node:test';
import assert from 'node:assert/strict';
import {editorialSubject,distinctStories} from '../src/editorial.js';
import {storyTopics} from '../src/content.js';
test('headline subjects beat incidental mentions in bilingual excerpts',()=>{
  const cases=[
    ['Tía Rosa','A record review with beautiful cover art.','music','music'],
    ['Sunday Mourners album','A designer worked on the sleeve.','music','music'],
    ['Z.ai releases a reasoning model','Software design improves inference.','digital','digital'],
    ['A comedy review','A song and a book appear in the show.','writing','art'],
    ['A documentary review','Music plays in this film.','writing','art'],
    ['专辑乐评：一段创作经历','封面设计令人印象深刻。','music','music'],
    ['大模型发布新的推理能力','系统设计带来改进。','digital','digital'],
    ['作家谈小说与记忆','也提到音乐和展览。','writing','writing'],
    ['摄影师的十年记录','一本书与一段旋律。','writing','art']
  ];
  for(const [title,excerpt,prior,want] of cases)assert.equal(editorialSubject(title,excerpt,prior),want,title);
  assert.ok(!storyTopics({title:'Z.ai releases a reasoning model',excerpt:'Software design improves inference.',source_id:'the-decoder'}).includes('visual-culture'));
});
test('near-identical event reports collapse but criticism and model versions remain',()=>{
  const base={lane:'ai',original_lang:'en',discovered_at:1000};
  const a={...base,title:'OpenAI releases a new model for coding and reasoning',url:'https://a.test/1'};
  const b={...base,title:'OpenAI releases new model for coding and reasoning',url:'https://b.test/1'};
  const c={...base,title:'OpenAI releases new model for coding and reasoning: risks',url:'https://c.test/1'};
  assert.equal(distinctStories([a,b,c]).length,2);
  assert.equal(distinctStories([{...a,title:'OpenAI releases model 6.2 for coding and reasoning'},{...b,title:'OpenAI releases model 6.3 for coding and reasoning'}]).length,2);
});
