import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { workspaceDirectory, dependencyDirectory } from '../../scripts/workspace-paths.mjs';
import { generateAssetManifest } from '../../scripts/sea-asset-manifest.mjs';
import { assertSeaBundle } from '../../scripts/build-sea.mjs';
import { packSidecarArchive } from '../../scripts/release/stage-release-assets.mjs';

function fixture(run) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'aof workspace ownership '));
  const write = (file, value) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), typeof value === 'string' ? value : JSON.stringify(value));
  };
  try {
    write('yarn.lock', '__metadata:\n  version: 8\n"aof@workspace:packages/core":\n  version: 0.1.0\n  resolution: "aof@workspace:packages/core"\n"@aof/ui@workspace:apps/ui":\n  version: 0.1.0\n  resolution: "@aof/ui@workspace:apps/ui"\n"@aof/execution@workspace:packages/execution":\n  version: 0.1.0\n  resolution: "@aof/execution@workspace:packages/execution"\n');
    write('packages/core/package.json', { name: 'aof' });
    write('apps/ui/package.json', { name: '@aof/ui' });
    write('packages/execution/package.json', { name: '@aof/execution', dependencies: { 'node-pty': '1.1.0' } });
    return run(root, write);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

export const distributionWorkspacesTests = [
  { name: 'distribution-workspaces/assets follow the relocated UI owner and ignore the old tree', run() {
    fixture((root, write) => {
      write('packages/core/assets/command.md', 'asset');
      write('apps/ui/dist/index.html', '<main>current</main>');
      write('ui/dist/stale.html', 'old');
      assert.equal(workspaceDirectory(root, '@aof/ui'), path.join(root, 'apps/ui'));
      assert.deepEqual(generateAssetManifest(root), { bundle: ['command.md'], ui: ['index.html'] });
    });
  } },
  { name: 'distribution-workspaces/native resolution follows its owner without root hoisting', run() {
    fixture((root, write) => {
      write('packages/execution/node_modules/node-pty/package.json', { name: 'node-pty' });
      assert.equal(dependencyDirectory(root, '@aof/execution', 'node-pty'), path.join(root, 'packages/execution/node_modules/node-pty'));
      assert.throws(() => dependencyDirectory(root, 'aof', 'node-pty'), /does not own/u);
    });
  } },
  { name: 'distribution-workspaces/a dependency linked to another checkout is refused', run() {
    fixture((root, write) => {
      const foreign = mkdtempSync(path.join(os.tmpdir(), 'aof foreign dependency '));
      try {
        writeFileSync(path.join(foreign, 'package.json'), '{"name":"node-pty"}');
        mkdirSync(path.join(root, 'packages/execution/node_modules'), { recursive: true });
        symlinkSync(foreign, path.join(root, 'packages/execution/node_modules/node-pty'), process.platform === 'win32' ? 'junction' : 'dir');
        assert.throws(() => dependencyDirectory(root, '@aof/execution', 'node-pty'), /escapes this checkout/u);
      } finally { rmSync(foreign, { recursive: true, force: true }); }
    });
  } },
  { name: 'distribution-workspaces/SEA closure refuses old source, app assets, native inputs and missing core entries', run() {
    const root = path.resolve('fixture');
    const inputs = { 'packages/core/src/cli.mjs': {}, 'packages/core/src/application/assemble.mjs': {} };
    assertSeaBundle({ inputs }, root);
    for (const forbidden of ['src/cli.mjs', 'apps/ui/src/main.jsx', 'ui/dist/index.html', 'packages/core/assets/bundle.json', 'node_modules/node-pty/lib/index.js', '../foreign.mjs']) {
      assert.throws(() => assertSeaBundle({ inputs: { ...inputs, [forbidden]: {} } }, root), /outside its runtime closure/u);
    }
    assert.throws(() => assertSeaBundle({ inputs: {} }, root), /missing core entry/u);
  } },
  { name: 'distribution-workspaces/release staging refuses a PTY-only payload with missing directory assets', run() {
    fixture(root => assert.throws(() => packSidecarArchive(root, path.join(root, 'archive')), /Required release sidecar missing/u));
  } },
];
