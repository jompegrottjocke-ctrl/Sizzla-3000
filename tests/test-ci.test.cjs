const {test}=require('node:test');
const assert=require('node:assert/strict');
const {failureExcerpt}=require('../scripts/test-ci.cjs');
test('CI annotations lead with failure name and cause instead of thousands of passing-test characters',()=>{
 const successes=Array.from({length:100},(_,i)=>'✔ passed test '+i+' '+'.'.repeat(100)).join('\r\n');
 const failure='✖ failing tests:\r\n\r\ntest at tests\\inventory.test.cjs:61:1\r\n✖ schema 5 backup migration\r\n  TypeError: fetch failed\r\n    cause: read ECONNRESET';
 const excerpt=failureExcerpt(successes+'\r\n'+failure);assert.ok(excerpt.startsWith('failing tests:'));assert.ok(excerpt.includes('inventory.test.cjs:61:1'));assert.ok(excerpt.includes('ECONNRESET'));assert.ok(!excerpt.includes('passed test'));
});
test('CI diagnostics retain a failed test or process error when no final summary is produced',()=>{
 assert.equal(failureExcerpt('✔ prior success\n✖ server test\nError: socket closed'),'✖ server test\nError: socket closed');
 assert.equal(failureExcerpt('Process failed to start'),'Process failed to start');assert.equal(failureExcerpt(''),'');
});
