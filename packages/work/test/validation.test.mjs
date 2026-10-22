import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseFeature } from '@aof/work/feature-parse';
import { parseDigestTemplate, renderDigestDocument, digestFindings } from '@aof/work/digest';
import { validateWork } from '@aof/work/validation';
import { WORK_ITEM_SCHEMA_VERSION } from '@aof/work/records';

const template = `---
doc: digest
milestone: NN
slug: <slug>
title: "<title>"
status: not-started
source: "<source>" # OMIT
schema: <schema-version>
aofVersion: <aof-version>
---
# NN — <Milestone Title>

<!-- supplied template -->

## Intent
## Decisions
`;
const contract = parseDigestTemplate(template);
async function fixture(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-validation-package-'));
  try { await run(root); }
  finally {
    assert.equal(path.dirname(await realpath(root)), parent);
    await rm(root, { recursive: true, force: true });
  }
}

test('digest rendering and validation use only the supplied contract and version', () => {
  const text = renderDigestDocument({ milestoneRef: '07', values: { title: 'A "quoted" title', slug: 'sample' }, sections: { Decisions: 'Chosen', Intent: 'Goal' } }, { contract, schemaVersion: 5, aofVersion: 'fixture-version' });
  assert.ok(Object.isFrozen(contract) && Object.isFrozen(contract.keys[0]));
  assert.match(text, /schema: 5\naofVersion: fixture-version/);
  assert.ok(!text.includes('source:'));
  assert.ok(text.indexOf('## Intent') < text.indexOf('## Decisions'));
  assert.match(text, /title: "A \\"quoted\\" title"/);
  const meta = Object.fromEntries(contract.requiredKeys.map(key => [key, 'value']));
  assert.deepEqual(digestFindings(meta, text, contract), []);
  assert.equal(digestFindings({ ...meta, extra: 'x' }, text + '\n## Intent\n## Unknown', contract).length, 3);
});

test('validation requests the digest contract lazily and fails if it is missing', () => fixture(async root => {
  assert.deepEqual(await validateWork(root, {}, undefined, { getDigestContract: () => { throw new Error('unused'); } }), []);
  const dir = path.join(root, '07_milestone_sample');
  await mkdir(dir);
  const input = { milestoneRef: '07', values: { milestone: '07', slug: 'sample', title: 'Sample' }, sections: { Intent: 'Goal' } };
  await writeFile(path.join(dir, 'AOF.md'), renderDigestDocument(input, { contract, schemaVersion: WORK_ITEM_SCHEMA_VERSION, aofVersion: 'fixture-version' }));
  let calls = 0;
  assert.deepEqual(await validateWork(root, {}, undefined, { getDigestContract: () => { calls++; return contract; } }), []);
  assert.equal(calls, 1);
  await assert.rejects(validateWork(root, {}), /requires getDigestContract/);
}));

test('validation enforces feature vocabulary only while the owning story is open', () => fixture(async root => {
  const story = path.join(root, '07_story_sample');
  await mkdir(path.join(story, 'tasks'), { recursive: true });
  const record = status => `---\ntype: story\nnumber: 07\nslug: sample\nstatus: ${status}\ncreated: 2026-09-28\nupdated: 2026-09-28\nschema: ${WORK_ITEM_SCHEMA_VERSION}\n---\n`;
  await writeFile(path.join(story, 'STORY.md'), record('not-started'));
  await writeFile(path.join(story, 'tasks/00.feature'), '@unknown\nFeature: Example\n  @executable\n  Scenario: Works\n    Given a fixture\n');
  assert.ok((await validateWork(root, {})).some(row => row.problem.includes('unknown tag')));
  await writeFile(path.join(story, 'STORY.md'), record('done'));
  assert.deepEqual(await validateWork(root, {}), []);
}));

test('the standalone parser preserves outlines, examples and partial malformed input', () => {
  const parsed = parseFeature('@executable\nFeature: Example\n  Scenario Outline: Works\n    Given <value>\n    Examples:\n      | value |\n      | one |\n');
  assert.equal(parsed.scenarios[0].outline, true);
  assert.equal(parsed.scenarios[0].examples[0].rows, 1);
  const malformed = parseFeature('Feature: Example\n  Scenario: Still visible\n    Given a fixture\n    free text\n');
  assert.equal(malformed.scenarios.length, 1);
  assert.ok(malformed.structural.length > 0);
});

// 168/00 task 01 — validate holds a prototype to its two files (ADR-005), and a `depends:` on one
// does not resolve (ADR-001 §2).
const prototypeDoc = (status, extra = '', body = '## Intent\n\nImport a CSV.\n\n## Wants\n\n- 2026-10-22 · import a CSV\n\n## Shortcuts\n') =>
  `---\ntype: prototype\nnumber: 169\nslug: csv-importer\ntitle: "CSV importer"\nstatus: ${status}\ncreated: 2026-10-22\nupdated: 2026-10-22\nschema: ${WORK_ITEM_SCHEMA_VERSION}\n${extra}---\n# 169 · CSV importer\n\n${body}`;
const prototypeState = '---\ndoc: state\n---\n# State\n\n## Hand-off\n\nThe parser works.\n\n## Log\n';

async function prototypeAt(root, doc, state = prototypeState) {
  const dir = path.join(root, '169_prototype_csv-importer');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'PROTOTYPE.md'), doc);
  if (state != null) await writeFile(path.join(dir, 'STATE.md'), state);
  return dir;
}

test('a well-formed prototype validates clean in each of its four statuses, with or without Diagrams', () => fixture(async root => {
  for (const status of ['active', 'paused', 'done', 'abandoned']) {
    await prototypeAt(root, prototypeDoc(status));
    assert.deepEqual(await validateWork(root, {}), [], status);
  }
  await prototypeAt(root, prototypeDoc('active', '', '## Intent\n\nA.\n\n## Wants\n\n- B\n\n## Shortcuts\n\n## Diagrams\n'));
  assert.deepEqual(await validateWork(root, {}), []);
}));

test('a prototype missing a part it needs draws exactly one finding naming it', () => fixture(async root => {
  const full = '## Intent\n\nImport a CSV.\n\n## Wants\n\n- import a CSV\n\n## Shortcuts\n';
  const rows = [
    ['E9', prototypeDoc('active', '', full.replace('## Shortcuts\n', '')), prototypeState, '"## Shortcuts"'],
    ['', prototypeDoc('active', '', full.replace('## Wants\n\n- import a CSV\n\n', '')), prototypeState, '"## Wants"'],
    ['E10', prototypeDoc('active'), null, 'STATE.md'],
    ['', prototypeDoc('active'), prototypeState.replace('## Hand-off', '## Handoff'), '"## Hand-off"'],
    ['E11', prototypeDoc('in-progress'), prototypeState, 'active|paused|done|abandoned'],
    ['E12', prototypeDoc('active', 'depends: [12]\n'), prototypeState, '`depends:`'],
    ['', prototypeDoc('active', 'parent: 168\n'), prototypeState, '`parent:`'],
  ];
  for (const [example, doc, state, named] of rows) {
    const dir = await prototypeAt(root, doc, state);
    const findings = await validateWork(root, {});
    assert.equal(findings.length, 1, `${example} ${named}: ${JSON.stringify(findings)}`);
    assert.ok(findings[0].path.startsWith(dir) && findings[0].problem.includes(named), `${example}: ${findings[0].problem}`);
    await rm(dir, { recursive: true, force: true });
  }
}));

test('the untouched prototype template is not a prototype yet', () => fixture(async root => {
  const template = await readFile(new URL('../../core/assets/templates/prototype/PROTOTYPE.md', import.meta.url), 'utf8');
  const state = await readFile(new URL('../../core/assets/templates/prototype/STATE.md', import.meta.url), 'utf8');
  const filled = template.replace('number: NN', 'number: 169').replace('<kebab-slug>', 'csv-importer')
    .replaceAll('YYYY-MM-DD', '2026-10-22').replace('<schema-version>', String(WORK_ITEM_SCHEMA_VERSION)).replace('<aof-version>', '0.1.0');
  assert.ok(!/^<!--/.test(template) && !/^<!--/.test(state), 'neither template opens with a comment before its frontmatter');
  await prototypeAt(root, filled, state);
  const problems = (await validateWork(root, {})).map(row => row.problem);
  assert.deepEqual(problems.sort(), ['"## Intent" is still the template\'s — the start move writes it', '"## Wants" is still the template\'s — the start move writes it']);
}));

test('a depends edge naming a prototype does not resolve', () => fixture(async root => {
  await prototypeAt(root, prototypeDoc('active'));
  const milestone = path.join(root, '170_milestone_next');
  await mkdir(milestone);
  await writeFile(path.join(milestone, 'SPEC.md'), `---\ntype: milestone\nnumber: 170\nslug: next\nstatus: not-started\ncreated: 2026-10-22\nupdated: 2026-10-22\nschema: ${WORK_ITEM_SCHEMA_VERSION}\ndepends: [169]\n---\n`);
  const findings = await validateWork(root, {});
  assert.equal(findings.length, 1);
  assert.ok(findings[0].path.startsWith(milestone));
  assert.match(findings[0].problem, /depends "169" does not resolve to a top-level item/);
}));
