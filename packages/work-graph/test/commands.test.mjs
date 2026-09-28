import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkGraphContribution } from '@aof/work-graph/commands';
import { createLoopsShowCommand } from '@aof/work-graph/commands/loops-show';
import { createLoopsGraphCommand } from '@aof/work-graph/commands/loops-graph';
import { createLoopsValidateCommand } from '@aof/work-graph/commands/loops-validate';
import { createLoopsGroundednessCommand } from '@aof/work-graph/commands/loops-groundedness';
import { createLoopDocumentCommand } from '@aof/work-graph/commands/loop-document';
import { createLoopRecordCommand } from '@aof/work-graph/commands/loop-record';
import { loopBoundsFromConfig, resolveReviewRounds } from '@aof/contracts/loop-bounds';
import { commandError } from '@aof/contracts/error';

test('registration and CLI metadata are inert and preserve the six command routes', () => {
  const unexpected = () => { throw new Error('registration touched a service'); };
  const commands = {
    show: createLoopsShowCommand({ loadLoops: unexpected }),
    graph: createLoopsGraphCommand({ loadLoops: unexpected }),
    validate: createLoopsValidateCommand({ loadLoops: unexpected }),
    groundedness: createLoopsGroundednessCommand({ loadModel: unexpected, hasCommand: unexpected, getFrameworkRoot: unexpected }),
    document: createLoopDocumentCommand({ invokeRegistered: unexpected }),
    record: createLoopRecordCommand({ loadLoops: unexpected, readRuns: unexpected, requireLocalCheckout: unexpected, resolveItemExact: unexpected }),
  };
  const contribution = createWorkGraphContribution(commands);
  assert.equal(contribution.name, '@aof/work-graph');
  assert.ok(Object.isFrozen(contribution.commands));
  assert.deepEqual(contribution.commands.map(command => command.cli.route), [
    ['work', 'loops', 'show'], ['work', 'loops', 'graph'], ['work', 'loops', 'validate'],
    ['work', 'loops', 'groundedness'], ['work', 'loops', 'document'], ['work', 'loop-record'],
  ]);
  assert.throws(() => createWorkGraphContribution({ ...commands, record: null }), /all six/);
});

test('graph format refusal happens before loading domain data', async () => {
  const command = createLoopsGraphCommand({ loadLoops: () => { throw new Error('loaded'); } });
  await assert.rejects(command.run({ format: 'unknown' }, {}), { code: 'unsupported-format', status: 400 });
});

test('graph read commands use the supplied loader and preserve absent-registry results', async () => {
  const workspace = { projectRoot: '/fixture', aofDir: '/fixture/.aof' };
  const model = { source: '/fixture/.aof/loops', present: false, nodes: [], findings: [] };
  let calls = 0;
  const loadLoops = async supplied => { assert.equal(supplied, workspace); calls++; return model; };
  for (const factory of [createLoopsShowCommand, createLoopsGraphCommand, createLoopsValidateCommand]) {
    const result = await factory({ loadLoops }).run({}, { workspace });
    assert.equal(result.source, model.source);
    assert.equal(result.present, false);
  }
  const grounded = await createLoopsGroundednessCommand({ loadModel: loadLoops }).run({}, { workspace });
  assert.equal(grounded.state, 'absent');
  assert.equal(calls, 4);
});

test('shared bound and error contracts remain usable without graph or execution services', () => {
  assert.equal(resolveReviewRounds(100), 3);
  assert.ok(loopBoundsFromConfig({ config: {} }).heartbeatMs > 0);
  const error = commandError('fixture', 'fixture-code', 409);
  assert.equal(error.message, 'fixture');
  assert.equal(error.code, 'fixture-code');
  assert.equal(error.status, 409);
});
