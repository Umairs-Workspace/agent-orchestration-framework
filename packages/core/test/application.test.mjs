import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../src/application/assemble.mjs';
import { isRetryable, shouldRetry } from '@aof/execution/runs';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('core constructs independent applications with the same command catalog', async () => {
  const first = createApplication();
  const second = createApplication();
  try {
    assert.notEqual(first, second);
    // 147/02 — work:drive-repair, the fourth phase driver, made it 118.
    assert.equal(first.listCommands().length, 118);
    assert.deepEqual(JSON.parse(JSON.stringify(first.listCommands())), JSON.parse(JSON.stringify(second.listCommands())));
    assert.notEqual(first.getCommand('work:list'), second.getCommand('work:list'));
    assert.equal(typeof first.getCommand('work:list').run, 'function');
  } finally { await first.close(); await second.close(); }
});

test('installed framework policy citations follow real public exports and stay closed for projects', async () => {
  const application = createApplication();
  const root = await mkdtemp(path.join(os.tmpdir(), 'aof-framework-policy-'));
  try {
    assert.equal(application.execution.runs.shouldRetry, shouldRetry);
    assert.equal(application.execution.runs.isRetryable, isRetryable);
    const source = await readFile(new URL('../assets/loops/run-resilience.md', import.meta.url), 'utf8');
    const registry = path.join(root, '.aof');
    await mkdir(path.join(registry, 'loops'), { recursive: true });
    const file = path.join(registry, 'loops/run-resilience.md');
    const problems = async text => {
      await writeFile(file, text);
      const model = await application.graph.work.loops.loadLoops(registry);
      return model.findings.filter(finding => finding.severity === 'error');
    };
    assert.deepEqual(await problems(source), []);
    assert.equal((await problems(source.replace('#shouldRetry', '#unknownPolicy'))).length, 1);
    assert.equal((await problems(source.replace('src/run-store.mjs#shouldRetry', 'src/../run-store.mjs#shouldRetry'))).length, 1);
    assert.equal((await problems(source.replace(/^# aof-generated:.*\r?\n/mu, ''))).length, 1, 'project records cannot borrow framework module authority');
    assert.equal(shouldRetry({ failureReason: 'timeout', attempt: 1 }, 2), true);
    assert.equal(shouldRetry({ failureReason: 'timeout', attempt: 2 }, 2), false);
  } finally { await application.close(); await rm(root, { recursive: true, force: true }); }
});
