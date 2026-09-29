import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnRubricAsync} from '@aof/execution/rubric-process';

const options={cwd:process.cwd(),env:process.env,stdio:['ignore','pipe','pipe'],shell:false,timeout:10000,killSignal:'SIGKILL',maxBuffer:4096};

test('rubric process captures both streams and passes metacharacters as a single argv element',async()=>{
  const result=await spawnRubricAsync(process.execPath,['-e','process.stdout.write(JSON.stringify(process.argv.slice(1)));process.stderr.write("stderr");process.exitCode=7;','literal ; & $ value'],options);
  assert.equal(result.status,7);assert.equal(result.error,null);assert.equal(result.signal,null);
  assert.deepEqual(JSON.parse(result.stdout),['literal ; & $ value']);assert.equal(result.stderr,'stderr');
});

test('rubric process distinguishes byte overflow, deadline and launch failure',async()=>{
  const overflow=await spawnRubricAsync(process.execPath,['-e','process.stdout.write("é".repeat(2000));setInterval(()=>{},1000);'],{...options,maxBuffer:3000});
  assert.equal(overflow.error?.code,'ENOBUFS');assert.equal(overflow.status,null);
  const timeout=await spawnRubricAsync(process.execPath,['-e','setInterval(()=>{},1000);'],{...options,timeout:100});
  assert.equal(timeout.error?.code,'ETIMEDOUT');assert.equal(timeout.status,null);assert.equal(timeout.signal,'SIGKILL');
  const missing=await spawnRubricAsync('aof-fixture-runner-does-not-exist',[],options);
  assert.equal(missing.status,null);assert.equal(missing.error?.code,'ENOENT');assert.equal(missing.signal,null);
});
