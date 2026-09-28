import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditSupplyChain } from '../../scripts/supply-chain-audit.mjs';
import { readYarnPackages, productionDependencyDirs } from '../../scripts/dependency-inventory.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
function write(dir, file, body) {
  mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  writeFileSync(path.join(dir, file), typeof body === 'string' ? body : JSON.stringify(body));
}
async function fixture(run) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'aof-yarn-'));
  try {
    write(dir, '.yarnrc.yml', 'enableScripts: false\nnpmRegistryServer: "https://registry.npmjs.org"\n');
    write(dir, 'package.json', { name: 'fixture', version: '1.0.0' });
    write(dir, 'yarn.lock', '__metadata:\n  version: 8\n"fixture@workspace:.":\n  version: 1.0.0\n  resolution: "fixture@workspace:."\n');
    return await run(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
function locked(dir, name, version) {
  write(dir, 'yarn.lock', readFileSync(path.join(dir, 'yarn.lock'), 'utf8') +
    `"${name}@npm:${version}":\n  version: ${version}\n  resolution: "${name}@npm:${version}"\n`);
}

export const yarnInstallationTests = [
  { name: 'yarn-installation/audit checks compromised optional packages even when not installed', run: () => fixture(async dir => {
    locked(dir, 'chalk', '5.6.1');
    const diagnostics = await auditSupplyChain(dir);
    assert.ok(diagnostics.some(d => d.code === 'KNOWN_COMPROMISED_VERSION'));
  }) },
  { name: 'yarn-installation/audit rejects blocked families and workspace install hooks', run: () => fixture(async dir => {
    locked(dir, '@tanstack/example', '1.0.0');
    write(dir, 'package.json', { name: 'fixture', scripts: { postinstall: 'node unexpected.mjs' } });
    const codes = (await auditSupplyChain(dir)).map(d => d.code);
    assert.ok(codes.includes('BLOCKED_PACKAGE_FAMILY'));
    assert.ok(codes.includes('UNAPPROVED_INSTALL_SCRIPT'));
  }) },
  { name: 'yarn-installation/audit rejects unapproved installed lifecycle scripts', run: () => fixture(async dir => {
    write(dir, 'node_modules/.yarn-state.yml', '"example@npm:1.0.0":\n  locations:\n    - "node_modules/example"\n');
    write(dir, 'node_modules/example/package.json', { name: 'example', version: '1.0.0', scripts: { install: 'node install.js' } });
    assert.ok((await auditSupplyChain(dir)).some(d => d.code === 'UNAPPROVED_INSTALL_SCRIPT'));
    write(dir, 'node_modules/example/package.json', { name: 'example', version: '1.0.0' });
    write(dir, 'node_modules/example/binding.gyp', '{}');
    assert.ok((await auditSupplyChain(dir)).some(d => d.code === 'UNAPPROVED_INSTALL_SCRIPT'), 'implicit native builds also need approval');
  }) },
  { name: 'yarn-installation/audit retains payload and unsafe-workflow checks', run: () => fixture(async dir => {
    write(dir, 'node_modules/.yarn-state.yml', '"example@npm:1.0.0":\n  locations:\n    - "node_modules/example"\n');
    write(dir, 'node_modules/example/package.json', { name: 'example', version: '1.0.0' });
    write(dir, 'node_modules/example/router_init.js', '');
    write(dir, '.github/workflows/unsafe.yml', 'on: pull_request_target\n');
    const codes = (await auditSupplyChain(dir)).map(d => d.code);
    assert.ok(codes.includes('SUSPICIOUS_PAYLOAD_FILE'));
    assert.ok(codes.includes('UNSAFE_PULL_REQUEST_TARGET_WORKFLOW'));
  }) },
  { name: 'yarn-installation/audit rejects enabling scripts globally or for an unreviewed version', run: () => fixture(async dir => {
    write(dir, '.yarnrc.yml', 'enableScripts: true\nnpmRegistryServer: "https://registry.npmjs.org"\n');
    write(dir, 'package.json', { name: 'fixture', dependenciesMeta: { 'node-pty@9.0.0': { built: true } } });
    const codes = (await auditSupplyChain(dir)).map(d => d.code);
    assert.ok(codes.includes('UNSAFE_YARN_CONFIGURATION'));
    assert.ok(codes.includes('UNAPPROVED_BUILD_EXCEPTION'));
  }) },
  { name: 'yarn-installation/lock parser refuses empty locks and understands patched registry packages', run: async () => {
    assert.throws(() => readYarnPackages('__metadata:\n  version: 8\n'), /no packages/);
    assert.throws(() => readYarnPackages('nonsense: value'), /modern Yarn/);
    const [pkg] = readYarnPackages('__metadata:\n  version: 8\n"fsevents@patch:test":\n  version: 2.3.3\n  resolution: "fsevents@patch:fsevents@npm%3A2.3.3#optional!builtin<compat/fsevents>"\n');
    assert.equal(pkg.name, 'fsevents');
    assert.equal(pkg.registry, true);
  } },
  { name: 'yarn-installation/production closure includes nested versions and peers but omits development dependencies', run: () => fixture(async dir => {
    write(dir, 'package.json', { name: 'fixture', dependencies: { a: '1', shared: '1' }, devDependencies: { tooling: '1' } });
    write(dir, 'node_modules/a/package.json', { name: 'a', dependencies: { shared: '2' }, peerDependencies: { peer: '*' }, optionalDependencies: { absent: '*' } });
    write(dir, 'node_modules/a/node_modules/shared/package.json', { name: 'shared', version: '2' });
    write(dir, 'node_modules/shared/package.json', { name: 'shared', version: '1' });
    write(dir, 'node_modules/peer/package.json', { name: 'peer' });
    write(dir, 'node_modules/node_modules/peer/package.json', { name: 'peer', version: 'wrong-location' });
    write(dir, 'node_modules/tooling/package.json', { name: 'tooling' });
    assert.deepEqual(productionDependencyDirs(dir).map(p => path.relative(dir, p).replaceAll('\\', '/')), [
      'node_modules/a', 'node_modules/a/node_modules/shared', 'node_modules/peer', 'node_modules/shared',
    ]);
  }) },
  { name: 'yarn-installation/production packaging refuses a missing required package', run: () => fixture(async dir => {
    write(dir, 'package.json', { name: 'fixture', dependencies: { missing: '1' } });
    assert.throws(() => productionDependencyDirs(dir), /Missing production dependency missing/);
  }) },
  { name: 'yarn-installation/pinned tool and configuration agree; no competing npm lockfiles remain', run: async () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    const config = readFileSync(path.join(root, '.yarnrc.yml'), 'utf8');
    assert.match(config, new RegExp('yarn-' + pkg.packageManager.slice(5).replaceAll('.', '\\.') + '\\.cjs'));
    const { existsSync } = await import('node:fs');
    assert.equal(existsSync(path.join(root, 'package-lock.json')), false);
    assert.equal(existsSync(path.join(root, 'ui/package-lock.json')), false);
  } },
];
