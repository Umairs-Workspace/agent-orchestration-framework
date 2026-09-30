import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { workspaceDirectory, dependencyDirectory } from '../../scripts/workspace-paths.mjs';
import { generateAssetManifest } from '../../scripts/sea-asset-manifest.mjs';
import { assertSeaBundle } from '../../scripts/build-sea.mjs';
import { packSidecarArchive } from '../../scripts/release/stage-release-assets.mjs';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { installPayload } from '../../scripts/install-local.mjs';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
function ownershipFixture(run) {
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


export const coreWorkspaceTests = [
  { name: 'core-workspace/copied core runs without source aliases or optional app packages', async run() {
    const parent = await realpath(os.tmpdir());
    const fixture = await mkdtemp(path.join(parent, 'aof core distribution '));
    const payload = path.join(fixture, 'copied core');
    const unrelated = path.join(fixture, 'unrelated project');
    try {
      await mkdir(unrelated);
      installPayload(payload);
      // An update removes retired source, assets and dependencies; workspace
      // copies remain real directories, including when the target has spaces.
      await writeFile(path.join(payload, 'src', 'retired.mjs'), '// stale');
      await writeFile(path.join(payload, 'assets', 'retired.md'), 'stale');
      await mkdir(path.join(payload, 'node_modules', 'retired-dependency'));
      installPayload(payload);
      assert.ok(!(await readdir(path.join(payload, 'src'))).includes('retired.mjs'));
      assert.ok(!(await readdir(path.join(payload, 'assets'))).includes('retired.md'));
      assert.ok(!(await readdir(path.join(payload, 'node_modules'))).includes('retired-dependency'));
      assert.ok(!(await readdir(path.join(payload, 'node_modules', '@aof'))).includes('ui'));
      // A staged application wins over a package visible in an ancestor directory.
      await mkdir(path.join(payload, 'ui', 'dist'), { recursive: true });
      await writeFile(path.join(payload, 'ui', 'dist', 'index.html'), '<main>copied UI</main>');
      await mkdir(path.join(fixture, 'node_modules', '@aof', 'ui'), { recursive: true });
      await writeFile(path.join(fixture, 'node_modules', '@aof', 'ui', 'package.json'), '{"name":"@aof/ui"}');
      const expected = JSON.parse(await readFile(path.join(repoRoot, 'test/fixtures/application/command-inventory.json'), 'utf8'));
      const manifest = JSON.parse(await readFile(path.join(payload, 'package.json'), 'utf8'));
      const publicEntries = await Promise.all(Object.keys(manifest.dependencies).map(async name => {
        if (!name.startsWith('@aof/')) return name;
        const pkg = JSON.parse(await readFile(path.join(payload, 'node_modules', name, 'package.json'), 'utf8'));
        return name + Object.keys(pkg.exports)[0].slice(1);
      }));
      const probe = path.join(payload, 'inspect.mjs');
      await writeFile(probe, `
        import { createRequire, registerHooks } from 'node:module';
        import { fileURLToPath } from 'node:url';
        import path from 'node:path';
        import { realpathSync } from 'node:fs';
        const payload = ${JSON.stringify(payload)};
        registerHooks({ load(url, context, next) {
          if (url.startsWith('file:')) {
            const rel = path.relative(payload, realpathSync(fileURLToPath(url)));
            if (rel.startsWith('..') || path.isAbsolute(rel)) throw Error('Module escaped copied payload: ' + url);
          }
          return next(url, context);
        }});
        const { createApplication } = await import('./src/application/assemble.mjs');
        const { assetBase, packageVersionString } = await import('./src/asset-base.mjs');
        const { toolkitProgram } = await import('./src/work-audit/toolkit.mjs');
        const require = createRequire(import.meta.url);
        const app = createApplication();
        console.log(JSON.stringify({ commands: app.listCommands(), version: packageVersionString(),
          assets: assetBase('bundle'), ui: assetBase('ui'), program: toolkitProgram('src/work/audit-probe.mjs'),
          dependencies: ${JSON.stringify(publicEntries)}.map(name => realpathSync(require.resolve(name))) }));
        await app.close();
      `);
      const env = { ...process.env, AOF_GLOBAL_HOME: path.join(fixture, 'home'), NODE_PATH: '' };
      const run = (args, options = {}) => execFileSync(process.execPath, args, { cwd: unrelated, env, encoding: 'utf8', timeout: 60_000, windowsHide: true, ...options });
      const report = JSON.parse(run([probe]));
      assert.deepEqual(report.commands, expected);
      assert.equal(report.version, manifest.version);
      assert.equal(report.ui, path.join(payload, 'ui'));
      await rm(path.join(payload, 'ui', 'dist'), { recursive: true, force: true });
      assert.equal(JSON.parse(run([probe])).ui, path.join(payload, 'ui'), 'CLI-only copy cannot borrow the ancestor UI package');
      for (const resolved of [report.assets, report.ui, report.program, ...report.dependencies]) {
        assert.ok(path.relative(payload, resolved) && !path.relative(payload, resolved).startsWith('..'), resolved);
      }
      assert.match(run([path.join(payload, 'bin/aof.mjs'), '--version']), new RegExp('^' + manifest.version.replaceAll('.', '\\.')));
      assert.match(run([path.join(repoRoot, 'packages/core/bin/aof.mjs'), '--version']), new RegExp('^' + manifest.version.replaceAll('.', '\\.')));
      assert.equal(run([path.join(repoRoot, 'packages/core/bin/aof.mjs'), '--help']), run([path.join(payload, 'bin/aof.mjs'), '--help']));
      run([path.join(payload, 'bin/aof.mjs'), 'work', 'init', unrelated, '--runtime', 'claude,codex', '--json']);
      assert.match(await readFile(path.join(unrelated, '.codex/skills/aof-continue/SKILL.md'), 'utf8'), /aof work/);
      for (const verb of ['start', 'ping', 'end']) {
        const hookOutput = run([path.join(payload, 'bin/aof.mjs'), 'session', verb,
          '--workspace', 'copied-workspace', '--repo', 'copied-repo', '--assistant', 'claude', '--json'], {
          input: JSON.stringify({ session_id: 'copied-core-hook', cwd: unrelated }),
        });
        if (verb !== 'end') assert.match(hookOutput, /copied-core-hook/);
      }
      const itemDir = path.join(unrelated, 'hook item');
      run([path.join(payload, 'assets/hooks/run-heartbeat-enqueue.mjs')], {
        env: { ...env, AOF_RUN_ITEM_DIR: itemDir, AOF_RUN_ID: 'copied-heartbeat' },
      });
      const heartbeat = JSON.parse((await readFile(path.join(itemDir, 'runs/.heartbeats.ndjson'), 'utf8')).trim());
      assert.equal(heartbeat.runId, 'copied-heartbeat');
      const runner = path.join(unrelated, 'runner.mjs');
      await writeFile(runner, 'export const tests = [{ name: "copied-core-child", run() {} }];\n');
      assert.match(run([report.program, runner]), /copied-core-child/);
      assert.match(run([path.join(payload, 'src/work/audit-drive.mjs'), runner]), /copied-core-child/);
    } finally {
      assert.equal(path.dirname(await realpath(fixture)), parent);
      await rm(fixture, { recursive: true, force: true });
    }
  } },
{ name: 'distribution-workspaces/assets follow the relocated UI owner and ignore the old tree', run() {
    ownershipFixture((root, write) => {
      write('packages/core/assets/command.md', 'asset');
      write('apps/ui/dist/index.html', '<main>current</main>');
      write('ui/dist/stale.html', 'old');
      assert.equal(workspaceDirectory(root, '@aof/ui'), path.join(root, 'apps/ui'));
      assert.deepEqual(generateAssetManifest(root), { bundle: ['command.md'], ui: ['index.html'] });
    });
  } },
  { name: 'distribution-workspaces/native resolution follows its owner without root hoisting', run() {
    ownershipFixture((root, write) => {
      write('packages/execution/node_modules/node-pty/package.json', { name: 'node-pty' });
      assert.equal(dependencyDirectory(root, '@aof/execution', 'node-pty'), path.join(root, 'packages/execution/node_modules/node-pty'));
      assert.throws(() => dependencyDirectory(root, 'aof', 'node-pty'), /does not own/u);
    });
  } },
  { name: 'distribution-workspaces/a dependency linked to another checkout is refused', run() {
    ownershipFixture((root, write) => {
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
    ownershipFixture(root => assert.throws(() => packSidecarArchive(root, path.join(root, 'archive')), /Required release sidecar missing/u));
  } },

];
