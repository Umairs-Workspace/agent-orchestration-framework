import assert from 'node:assert/strict';
import path from 'node:path';
import { loadBundle, renderBundleOutputs } from '../../../packages/core/src/work/bundle.mjs';

const portable = value => value.replaceAll('\\', '/');
// FF-15405 examines the actual native render plan, not descriptor id matching:
// command identity changes to skill identity across the adapter (71/R4).
export function variantPlanFindings(outputs) {
  const paths = new Set(outputs.map(output => portable(output.path)));
  const findings = [];
  for (const output of outputs.filter(output => output.runtime === 'codex')) {
    const content = output.content;
    const location = portable(output.path);
    const who = `${output.resource.kind}:${output.resource.id} (codex) at ${location}`;
    if (/\{\{\s*(procedures|roles|references|files)\./u.test(content)) findings.push(`${who}: unresolved typed reference`);
    if (/\/aof:|(?<!\w)\/effort|\.codex\/skills\//u.test(content)) findings.push(`${who}: non-native instruction target`);
    if (content.includes('Read procedure.md')) {
      const target = portable(path.join(path.dirname(location), 'procedure.md'));
      if (!paths.has(target)) findings.push(`${who}: missing declared procedure ${target}`);
    }
    for (const match of content.matchAll(/\.codex\/aof\/workflows\/[a-z-]+\.md/gu)) {
      if (!paths.has(match[0])) findings.push(`${who}: missing declared reference ${match[0]}`);
    }
  }
  return findings;
}

export const archTests = [
  { name: 'FF-15405 native bundle references resolve after adapter mapping and exist in its real plan', run() {
    const outputs = renderBundleOutputs(loadBundle(), { runtimes: ['claude', 'codex'] });
    assert.deepEqual(variantPlanFindings(outputs), []);
    assert.ok(outputs.some(output => output.path.replaceAll('\\', '/') === '.agents/skills/aof-refine/procedure.md'), 'non-empty native procedure witness');
  } },
  { name: 'FF-15405 negative control: missing mapped attachment, unresolved role and Claude invocation are detected', run() {
    const outputs = renderBundleOutputs(loadBundle(), { runtimes: ['claude', 'codex'] });
    const removed = outputs.filter(output => portable(output.path) !== '.agents/skills/aof-refine/procedure.md');
    assert.ok(variantPlanFindings(removed).some(finding => /aof-refine.*missing declared procedure/u.test(finding)));
    const planted = outputs.map(output => portable(output.path) === '.agents/skills/aof-refine/SKILL.md'
      ? { ...output, content: output.content + '\n{{roles.missing}} /aof:refine /effort high\n' } : output);
    const findings = variantPlanFindings(planted);
    assert.ok(findings.some(finding => /unresolved typed reference/u.test(finding)));
    assert.ok(findings.some(finding => /non-native instruction target/u.test(finding)));
  } }
];
