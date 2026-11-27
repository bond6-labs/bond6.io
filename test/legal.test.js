import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

test('privacy and disclaimer pages work in both languages and link from the footer',async()=>{
  for(const path of ['/privacy','/zh/privacy','/disclaimer','/zh/disclaimer']){
    const response=await worker.fetch(new Request('https://bond6.io'+path),{},{});
    assert.equal(response.status,200);
    const body=await response.text();
    assert.match(body,/info@bond6\.io/);
    assert.ok(body.includes(path.startsWith('/zh/')?'隐私声明':'Privacy'));
    assert.ok(body.includes(path.startsWith('/zh/')?'/zh/disclaimer':'/disclaimer'));
  }
});
