import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { workspaceDirectory, dependencyDirectory } from '../../scripts/workspace-paths.mjs';
import { generateAssetManifest } from '../../scripts/sea-asset-manifest.mjs';
import { assertSeaBundle } from '../../scripts/build-sea.mjs';
import { packSidecarArchive } from '../../scripts/release/stage-release-assets.mjs';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { installPayload } from '../../scripts/install-local.mjs';
import { inspectBoundaries, dependencyCycles, moduleReferences } from '../../scripts/workspace-boundaries.mjs';
import { workspaceTestInventory, assertNativeTestSource } from '../../scripts/workspace-tests.mjs';

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
    const payload = path.join(fixture, 'installed', 'copied core');
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
      await writeFile(path.join(fixture, 'package.json'), 'invalid foreign manifest');
      assert.equal(JSON.parse(run([probe])).ui, path.join(payload, 'ui'), 'CLI-only copy cannot borrow the ancestor UI package');
      await rm(path.join(fixture, 'package.json'));
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

  { name: 'workspace-boundaries/all actual owners are scanned and every owned array case is registered exactly once', async run() {
    const audit = JSON.parse(await readFile(path.join(repoRoot, 'scripts/workspace-runtime-audit.json'), 'utf8'));
    const report = inspectBoundaries(repoRoot, { runtimeAudit: audit });
    assert.deepEqual(report.findings, []);
    assert.ok(report.files >= 700, `${report.files} actual source and tooling files`);
    assert.equal(Object.keys(report.covered).length, 15, 'all packages, UI and repository tooling are covered');
    assert.ok(Object.values(report.covered).every(count => count > 0));
    const { tests } = await import('../../scripts/test.mjs');
    const inventory = workspaceTestInventory(repoRoot);
    let suiteFiles = 0; let cases = 0;
    for (const owner of inventory) for (const file of owner.suites) {
      const module = await import(pathToFileURL(file).href);
      const arrays = [...new Set(Object.values(module).filter(value => Array.isArray(value) && value.length
        && value.every(entry => typeof entry?.name === 'string' && typeof entry.run === 'function')))];
      assert.ok(arrays.length, `${file} owns executable cases`); suiteFiles++;
      for (const entry of arrays.flat()) {
        assert.equal(tests.filter(candidate => candidate === entry).length, 1, `${entry.name} is assembled exactly once`);
        cases++;
      }
    }
    assert.ok(suiteFiles >= 18); assert.ok(cases >= 254);
    assert.ok(inventory.filter(owner => owner.native.length).length >= 13);
    assert.ok(inventory.flatMap(owner => owner.native).length >= 63);
  } },

  { name: 'workspace-tests/selected root runs execute cases and propagate a planted failure through the shared harness', run() {
    const fixture = mkdtempSync(path.join(os.tmpdir(), 'aof-harness-proof-'));
    try {
      for (const failed of [false, true]) {
        const file = path.join(fixture, 'selected.mjs');
        writeFileSync(file, `export const tests = [{ name: "selected-harness-sentinel", run() { if (!process.env.AOF_GLOBAL_HOME?.includes(".aof-test")) throw Error("global home not isolated"); ${failed ? 'throw Error("planted-selected-failure");' : ''} } }];`);
        const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/test.mjs'), '--only', file], { cwd: repoRoot, encoding: 'utf8', timeout: 30_000, windowsHide: true });
        assert.equal(result.status, failed ? 1 : 0, result.error?.message ?? result.stdout + result.stderr);
        assert.match(result.stdout + result.stderr, /selected-harness-sentinel/u);
        assert.ok(result.stdout.includes(`# executed 1 cases; failures ${failed ? 1 : 0}`), 'the selected case executed, including the failure count');
      }
    } finally { rmSync(fixture, { recursive: true, force: true }); }
  } },
  { name: 'workspace-boundaries/planted undeclared, private, core-back, cyclic and computed edges fail through the actual detector', run() {
    const root = mkdtempSync(path.join(os.tmpdir(), 'aof-boundary-plants-'));
    const owners = ['aof', '@aof/leaf', '@aof/other'].map((name, index) => ({ directory: path.join(root, `owner-${index}`),
      manifest: { name, exports: { './entry': './src/entry.mjs' }, dependencies: index === 0 ? { '@aof/leaf': 'workspace:*' } : {} } }));
    const files = owners.map(owner => ({ owner: owner.manifest.name, rel: path.relative(root, path.join(owner.directory, 'src/entry.mjs')).replaceAll('\\', '/'), path: path.join(owner.directory, 'src/entry.mjs') }));
    try {
      for (const file of files) { mkdirSync(path.dirname(file.path), { recursive: true }); writeFileSync(file.path, 'export const value = 1;'); }
      assert.deepEqual(inspectBoundaries(root, { owners, files }).findings, []);
      writeFileSync(files[0].path, 'import "not-declared"; import "../../owner-1/src/entry.mjs"; import "@aof/leaf/private"; await import("@aof/leaf/private"); require("@aof/leaf/private"); await import(selected); spawn(process.execPath, [selected]);');
      writeFileSync(files[1].path, 'import "aof/entry";');
      const planted = inspectBoundaries(root, { owners, files }).findings.join('\n');
      for (const phrase of ['undeclared dependency', 'private sibling', 'missing explicit export', 'imports assembled core', 'unaudited computed-import', 'unaudited child-process']) assert.ok(planted.includes(phrase), phrase);
      assert.equal(planted.match(/missing explicit export/gu).length, 3, 'static, literal dynamic and require edges all use export enforcement');
      assert.ok(inspectBoundaries(root, { owners, files: [] }).findings.some(finding => finding.includes('read no files')));
      owners[1].manifest.dependencies['@aof/other'] = 'workspace:*'; owners[2].manifest.dependencies['@aof/leaf'] = 'workspace:*';
      assert.deepEqual(dependencyCycles(owners), [['@aof/leaf', '@aof/other', '@aof/leaf']]);
      owners[1].manifest.exports['./*'] = './src/entry.mjs';
      assert.ok(inspectBoundaries(root, { owners, files }).findings.some(finding => finding.includes('invalid explicit export')));
      assert.equal(moduleReferences('// import("plant")\nconst prose = "require(plant)";').references.length, 0);
      assert.throws(() => assertNativeTestSource('export const tests = [{ name: "never executed", run() {} }];', 'plant.test.mjs'), /declares no native/u);
      assert.throws(() => assertNativeTestSource('import test from "node:test";', 'plant.test.mjs'), /declares no native/u);
      assert.doesNotThrow(() => assertNativeTestSource('import { test as owned } from "node:test"; owned("actual case", () => {});', 'plant.test.mjs'));
      assert.equal(moduleReferences('import { createRequire as makeLoader } from "node:module"; const loader = makeLoader(import.meta.url); loader("@aof/leaf/private");').references.filter(reference => reference.kind === 'require').length, 1);
      assert.equal(moduleReferences('import { createRequire as makeLoader } from "node:module"; makeLoader(import.meta.url).resolve(selected);').runtime.filter(reference => reference.kind === 'computed-require').length, 1);
      const reviewedSource = 'const selected = "known.mjs"; await import(selected);';
      writeFileSync(files[0].path, reviewedSource);
      const reviewed = inspectBoundaries(root, { owners, files }).runtime.filter(entry => entry.file === files[0].rel).map(entry => ({ ...entry, reason: 'Synthetic bounded module selection' }));
      assert.ok(!inspectBoundaries(root, { owners, files, runtimeAudit: reviewed }).findings.some(finding => finding.includes('unaudited computed-import')));
      writeFileSync(files[0].path, reviewedSource.replace('known.mjs', 'changed.mjs'));
      assert.ok(inspectBoundaries(root, { owners, files, runtimeAudit: reviewed }).findings.some(finding => finding.includes('unaudited computed-import')), 'changing the selector invalidates review even when the call expression is identical');
      owners[0].manifest.devDependencies = { '@aof/other': 'workspace:*' };
      writeFileSync(files[0].path, 'import "@aof/other/entry";');
      assert.ok(inspectBoundaries(root, { owners, files }).findings.some(finding => finding.includes('undeclared dependency @aof/other')), 'static production imports cannot rely on dev dependencies');
      writeFileSync(files[0].path, 'await import("@aof/other/entry");');
      const devReport = inspectBoundaries(root, { owners, files });
      assert.ok(devReport.findings.some(finding => finding.includes('unaudited dev-tool-import')), 'lazy development imports require explicit runtime review');
      const devAudit = devReport.runtime.filter(entry => entry.file === files[0].rel).map(entry => ({ ...entry, reason: 'Synthetic optional development tool' }));
      assert.ok(!inspectBoundaries(root, { owners, files, runtimeAudit: devAudit }).findings.some(finding => finding.includes('unaudited dev-tool-import')), 'reviewed lazy public development entry is admitted');
    } finally { rmSync(root, { recursive: true, force: true }); }
  } },

];
