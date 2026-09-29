import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createWorkUpgrade } from '@aof/work/upgrade';

test('upgrade asks for installed version only when applying a pending stamp and preserves the body', async () => {
  let versionReads = 0;
  const upgrade = createWorkUpgrade({ packageVersionString: () => { versionReads++; return 'fixture-9.8.7'; } });
  assert.equal(versionReads, 0);
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-work-upgrade-'));
  try {
    const dir = path.join(root, '10_milestone_example');
    await mkdir(dir);
    const file = path.join(dir, 'SPEC.md');
    const original = '---\ntype: milestone\nnumber: 10\nslug: example\nstatus: done\n---\n\n# Keep this body\n';
    await writeFile(file, original);
    assert.equal((await upgrade.runUpgrade(root)).pendingCount, 1);
    assert.equal(versionReads, 0, 'planning performs no version-policy read');
    assert.equal(await readFile(file, 'utf8'), original, 'planning does not write');
    assert.equal((await upgrade.runUpgrade(root, { apply: true })).applied.length, 1);
    const stamped = await readFile(file, 'utf8');
    assert.match(stamped, /^schema: 1$/m);
    assert.match(stamped, /^aofVersion: fixture-9\.8\.7$/m);
    assert.ok(stamped.endsWith('\n\n# Keep this body\n'));
    assert.equal(versionReads, 1);
    assert.equal((await upgrade.runUpgrade(root, { apply: true })).pendingCount, 0);
    assert.equal(await readFile(file, 'utf8'), stamped);
    assert.equal(versionReads, 1, 'an already-current item does not invoke stamp policy');
  } finally {
    assert.equal(path.dirname(await realpath(root)), parent);
    await rm(root, { recursive: true, force: true });
  }
});
