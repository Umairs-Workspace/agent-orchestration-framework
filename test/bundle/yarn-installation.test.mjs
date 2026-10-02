import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditSupplyChain } from '../../scripts/supply-chain-audit.mjs';
import { readYarnPackages, productionDependencyDirs } from '../../scripts/dependency-inventory.mjs';
import { familyPurity, importSpecifiers, classifySpecifier, computedDynamicImports } from '../support/module-family.mjs';

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
  { name: 'yarn-installation/extracted kernels cannot import core, legacy source, providers or sibling internals', run: async () => {
    for (const leaf of ['identity', 'lifecycle', 'feature-parse', 'digest']) {
      const pure = await familyPurity(root, 'packages/work/src/' + leaf + '.mjs');
      assert.equal(pure.scanned, 1, leaf + ': the pure source is present');
      assert.deepEqual(pure.violations, [], leaf + ': cannot acquire an impure dependency');
      assert.deepEqual(pure.computed, [], leaf + ': cannot hide a computed dependency');
    }
    const dependencyRules = readFileSync(path.join(root, 'packages/work/src/dependencies.mjs'), 'utf8');
    assert.deepEqual(importSpecifiers(dependencyRules).map(entry => entry.specifier), ['./identity.mjs'],
      'dependency rules use only the zero-import identity grammar');
    assert.deepEqual(computedDynamicImports(dependencyRules), [], 'dependency rules cannot hide an impure import');
    for (const name of ['contracts', 'effects', 'foundation', 'work', 'work-graph', 'work-loop', 'execution', 'mesh', 'integration-notion', 'messaging', 'knowledge', 'server']) {
      const report = await familyPurity(root, `packages/${name}/src`);
      assert.ok(report.scanned > 0 && report.bytesRead > 0, `${name}: runtime source was scanned`);
      // Plan 01 keeps domain I/O in its owner; these are exact file-level ports, never package-wide permissions.
      const nativePorts = name === 'effects' ? {
        'journal-open.mjs': ['node:path', 'node:fs/promises', 'node:crypto'],
      } : name === 'server' ? {
        'commands/work-ui.mjs': ['node:path'],
        'static-serve.mjs': ['node:path'],
        'board-ui.mjs': ['node:path'],
        'board-serve.mjs': ['node:fs', 'node:path'],
        'setup-ui.mjs': ['node:http', 'node:fs/promises', 'node:path'],
        'terminal-ws.mjs': ['@aof/execution/pty', 'ws'],
      } : name === 'knowledge' ? {
        'import/source.mjs': ['node:fs', 'node:child_process', '@aof/foundation/git-args'],
        'import/store.mjs': ['node:path', 'node:fs', 'node:fs/promises'],
        'import/recovery.mjs': ['node:path', 'node:fs', 'node:fs/promises', 'node:child_process', '@aof/work/lifecycle', '@aof/work/declared-id', '@aof/foundation/markdown'],
        'import/materialize.mjs': ['node:path', 'node:fs', 'node:fs/promises'],
        'commands/import-milestone.mjs': ['node:path', '@aof/contracts/error'],
        'graph-normalize.mjs': ['node:path', 'node:fs'],
        'graphify.mjs': ['node:child_process', 'node:fs', 'node:path'],
        'memory.mjs': ['@aof/contracts/error'],
        'memory/local-retrieval.mjs': ['@aof/work/ref-scope'],
        'memory/local-indexing.mjs': ['node:path', 'node:fs', 'node:fs/promises', '@aof/work/declared-id', '@aof/work/ref-scope', '@aof/foundation/fs', '@aof/foundation/markdown', '@aof/foundation/text'],
        'memory/local-backend.mjs': ['node:fs/promises', 'node:fs'],
        'memory/graphify-backend.mjs': ['node:path', 'node:fs', 'node:fs/promises', '@aof/foundation/fs'],
        'commands/shared.mjs': ['node:path'],
        'commands/graph-impact.mjs': ['node:fs', '@aof/contracts/error'],
        'commands/graph-build.mjs': ['node:path', '@aof/contracts/error'],
        'commands/graph-query.mjs': ['node:fs', '@aof/contracts/error'],
        'commands/graph-triage.mjs': ['node:fs', '@aof/contracts/error'],
        'commands/graph-serve.mjs': ['@aof/contracts/error'],
      } : name === 'messaging' ? {
        'secret.mjs': ['node:crypto', 'node:fs/promises', 'node:path'],
        'ask-messages.mjs': ['node:fs/promises', 'node:path', '@aof/foundation/fs'],
        'gateway.mjs': ['ws'],
        'discord-commands.mjs': ['node:path'],
        'commands.mjs': ['node:fs', 'node:path', '@aof/contracts/error', '@inquirer/prompts'],
        'notify.mjs': ['@aof/foundation/text'],
      } : name === 'integration-notion' ? {
        'mapping.mjs': ['node:path', 'node:crypto', 'node:fs/promises'],
        'cli.mjs': ['node:child_process', 'node:path', 'node:os', 'node:fs'],
        'sync-work.mjs': ['node:path', 'node:fs/promises'],
        'notion-sync-work.mjs': ['node:fs'],
        } : name === 'execution' ? {
        "svg-rasterizer.mjs": ["node:child_process","node:fs","node:fs/promises","node:os","node:path","node:url","@aof/contracts/error"],
        'run-transitions.mjs': [],
        'reconcile.mjs': ["node:fs/promises"],
        'rubric-process.mjs': ['node:child_process'],
        'runs.mjs': ['node:path', 'node:fs/promises', 'node:fs', '@aof/foundation/fs', '@aof/contracts/claim-provenance', '@aof/contracts/freshness'],
        'spend.mjs': ['node:fs/promises', 'node:path'],
        'heartbeats.mjs': ['node:fs/promises', 'node:path'],
        'providers.mjs': ['node:path', 'node:fs'],
        'terminal-sessions.mjs': ['node:fs/promises', 'node:path'],
        'pty.mjs': ['node:module', 'node-pty'],
        'session-driver.mjs': ['node:path', 'node:child_process', 'node:fs/promises', 'node:crypto', '@aof/contracts/loop-bounds'],
        'screen.mjs': ['@xterm/headless'],
        'session-screen.mjs': ['@aof/contracts/loop-bounds'],
        'claude-screens.mjs': ['@aof/contracts/loop-bounds'],
        'claude-trust.mjs': ['node:os', 'node:path', 'node:fs/promises', 'node:crypto'],
        'worktrees.mjs': ['node:child_process', '@aof/foundation/git-args'],
        'bounded-process.mjs': ['node:child_process', 'node:fs'],
      } : name === 'mesh' ? {
        "artifact-sync.mjs": ["node:fs/promises","node:path","@aof/work/artifacts"],
        "node-identity.mjs": ["node:path","node:crypto","@aof/foundation/fs","@aof/foundation/text","node:fs/promises"],
        "workspace-identity.mjs": ["node:crypto","node:path"],
        "cache-read.mjs": ["@aof/contracts/cache-provenance","@aof/work/artifacts"],
        "commands/resync.mjs": ["@aof/contracts/error"],
        'assignment-transitions.mjs': [],
        'worker-launch.mjs': [],
        'worker-repo-admission.mjs': ["node:path","node:child_process","node:fs/promises","node:crypto","@aof/foundation/fs"],
        'clone-credential-provider.mjs': ["node:crypto","@aof/foundation/text"],
        'session-spawn-handler.mjs': ["node:path","node:fs"],
        'worker-execution.mjs': ["node:path","node:child_process","node:fs/promises","node:os","@aof/contracts/loop-bounds"],
        'launcher.mjs': ["node:os","node:path","node:fs","node:fs/promises"],
        'control-stream-server.mjs': ["ws","node:http"],
        'worker-stream-client.mjs': ["ws"],
        'ui-serve.mjs': ["node:http","node:fs","node:fs/promises","node:path","@aof/server/static-serve","ws","node:crypto"],
        'commands/assign.mjs': ["@aof/contracts/error"],
        'commands/contribution.mjs': [],
        'commands/desktop-preflight.mjs': ["node:fs/promises","node:child_process","node:path"],
        'commands/desktop.mjs': ["node:fs/promises","node:child_process","node:os","node:path"],
        'commands/face-shared.mjs': ["@aof/contracts/error"],
        'commands/gate.mjs': [],
        'commands/heartbeat.mjs': ["node:os"],
        'commands/identity.mjs': ["node:os","node:crypto"],
        'commands/invite.mjs': ["node:crypto"],
        'commands/join.mjs': ["node:os","@aof/foundation/fs"],
        'commands/logs.mjs': ["@aof/contracts/error"],
        'commands/recover-push.mjs': ["@aof/contracts/error"],
        'commands/relay.mjs': [],
        'commands/repo.mjs': [],
        'commands/revoke.mjs': [],
        'commands/serve.mjs': ["node:path"],
        'commands/session.mjs': ["node:os","node:fs/promises"],
        'commands/terminal-resume.mjs': ["@aof/contracts/error"],
        'commands/ui.mjs': ["node:path"],
        'assignment-reclaim.mjs': ['node:fs', '@aof/contracts/loop-bounds'],
        'declarations.mjs': ['@aof/contracts/loop-bounds', '@aof/work-loop/engine', '@aof/work-loop/argv'],
        'presence.mjs': ['node:path', 'node:fs/promises', '@aof/foundation/fs', '@aof/work-loop/engine'],
        'global-node-registry.mjs': ['node:path', 'node:fs/promises', '@aof/foundation/fs'],
        'global-query.mjs': [],
        'publisher.mjs': ['node:path', 'node:fs'],
        'projection-store.mjs': ['node:path', 'node:fs/promises', 'node:os', '@aof/work/item-row', '@aof/work/artifacts'],
        'assignment-record.mjs': ['node:crypto'],
        'store.mjs': ['node:path', 'node:fs/promises', '@aof/foundation/fs'],
        'registry.mjs': ['node:path', 'node:fs/promises', 'node:crypto', '@aof/foundation/fs'],
        'session.mjs': ['node:path', 'node:fs/promises', '@aof/foundation/fs'],
        'launcher-lock.mjs': ['node:path', 'node:fs/promises', 'node:crypto'],
        'fabric.mjs': ['node:child_process', 'node:dns', 'node:os'],
        'repo-marker.mjs': ['node:child_process', '@aof/foundation/fs'],
        'assignment-directive.mjs': ['@aof/work-loop/engine'],
        'relay.mjs': ['node:http', 'node:crypto', 'ws'],
        'relay-client.mjs': ['ws'],
        'terminal-relay-bridge.mjs': ['ws'],
        'terminal-mirror.mjs': ['ws'],
        'worktrees.mjs': ['node:path', '@aof/execution/worktrees', '@aof/foundation/git-args', '@aof/foundation/text'],
      } : name === 'work-loop' ? {
        'dispatch.mjs': ['node:path', 'node:fs', 'node:fs/promises'],
        'commands/dispatch.mjs': ['node:path', 'node:fs', '@aof/contracts/error'],
        'trigger/declaration.mjs': ['node:path', 'node:fs/promises'],
        'commands/trigger.mjs': ['@aof/contracts/error'],
        'progress.mjs': ['node:child_process', 'node:fs/promises', 'node:path', 'node:util', '@aof/contracts/loop-bounds'],
        'diagnostics.mjs': ['node:fs', 'node:fs/promises', 'node:os', 'node:path'],
        'ask.mjs': ['@aof/contracts/loop-bounds'],
        'stop.mjs': ['@aof/contracts/loop-bounds'],
        'cycle.mjs': ['node:fs/promises', 'node:path', 'node:fs', '@aof/contracts/loop-bounds'],
        'wave.mjs': ['node:fs/promises', 'node:fs', 'node:path'],
        'drive.mjs': ['node:fs/promises', 'node:os', 'node:path', '@aof/contracts/error', '@aof/contracts/loop-bounds'],
        'loop.mjs': ['node:crypto', 'node:child_process', 'node:fs/promises', 'node:os', 'node:path', 'node:util', '@aof/contracts/loop-bounds', '@aof/contracts/error'],
        'ask-request.mjs': ['node:fs/promises', 'node:path', '@aof/foundation/fs'],
        'stop-request.mjs': ['node:fs/promises', 'node:path', '@aof/foundation/fs'],
        'child-drive.mjs': ['node:path'],
      } : name === 'work-graph' ? {
        'registry.mjs': ['node:fs/promises', 'node:path', '@aof/work/records', '@aof/contracts/loop-bounds'],
        'record.mjs': ['@aof/contracts/loop-bounds'],
        'document.mjs': ['node:path'],
        'loops-show.mjs': ['node:path'],
        'loops-graph.mjs': ['node:path', '@aof/contracts/error'],
        'loops-validate.mjs': ['node:path'],
        'loops-groundedness.mjs': ['node:fs/promises', 'node:path'],
        'loop-document.mjs': ['node:fs/promises', 'node:path', '@aof/foundation/fs'],
        'loop-record.mjs': ['node:fs/promises', 'node:path', '@aof/contracts/error', '@aof/foundation/fs'],
      } : name === 'foundation' ? {
        "sqlite-runtime.mjs": ["node:sqlite"],
        'fs.mjs': ['node:crypto', 'node:fs/promises', 'node:path'],
        'log.mjs': ['node:fs', 'node:path'],
      } : name === 'work' ? {
        'citation-history.mjs': ['node:path', 'node:fs/promises'],
        "phase-brief-read.mjs": ["node:fs/promises","node:path"],
        "ready-wave.mjs": ["node:path","node:fs/promises"],
        "story-contract-derive.mjs": ["node:path","node:fs"],
        "examples/answers.mjs": ["node:path"],
        "commands/migrate-folder.mjs": ["node:path","node:fs/promises","@aof/contracts/error"],
        "commands/diagram/plan.mjs": ["node:fs","node:fs/promises","node:os","node:path","@aof/contracts/error"],
        "commands/diagram/export.mjs": ["node:fs/promises","node:path","@aof/contracts/error"],
        "commands/diagram/file.mjs": ["node:fs/promises","node:path","@aof/contracts/error"],
        "integration-routing.mjs": ["node:path","node:fs"],
        "legacy-milestone-discovery.mjs": ["node:path","node:fs"],
        'doc-transitions.mjs': ["node:path","node:fs/promises"],
        'harness-transitions.mjs': ["node:crypto"],
        'item-transitions.mjs': [],
        'stream-transitions.mjs': [],
        'toolchain.mjs': ['node:path', 'node:fs'],
        'feedback-records.mjs': ['node:path', 'node:fs/promises'],
        'commands/feedback.mjs': ['node:crypto', '@aof/contracts/error'],
        'commands/counters.mjs': ['node:path', 'node:fs/promises', '@aof/contracts/error'],
        'commands/ratchet.mjs': ['node:path', 'node:fs/promises', '@aof/contracts/error'],
        'commands/audit.mjs': ['node:path', 'node:fs/promises'],
        'commands/run-start.mjs': ['node:fs/promises', '@aof/contracts/error', '@aof/contracts/loop-bounds'],
        'commands/run-complete.mjs': ['@aof/contracts/error'],
        'commands/run-retry.mjs': ['@aof/contracts/error'],
        'commands/run-status.mjs': ['@aof/contracts/error'],
        'commands/item-status.mjs': ['node:fs/promises', '@aof/contracts/error', '@aof/foundation/fs'],
        // 134/04: the continue door reads the story's own EXAMPLES.md before it opens the build.
        'commands/continue.mjs': ['node:path', 'node:fs/promises', '@aof/contracts/error'],
        'commands/resume.mjs': ['@aof/contracts/error', '@aof/contracts/loop-bounds'],
        'commands/regression-gate.mjs': ['node:fs/promises', 'node:path', '@aof/contracts/error', '@aof/foundation/fs'],
        'regression-record.mjs': ['node:path'],
        'acceptor/source-units.mjs': ['node:path', 'node:fs/promises', 'picomatch'],
        'programs/audit-drive.mjs': ['node:os', 'node:path', 'node:fs', 'node:url'],
        'programs/audit-probe.mjs': ['node:path', 'node:url'],
        'commands/acceptor.mjs': ['node:path', 'node:os', 'node:fs/promises', '@aof/contracts/loop-bounds'],
        'commands/grade.mjs': ['node:fs', 'node:os', 'node:path', '@aof/contracts/error', '@aof/contracts/loop-bounds', '@aof/contracts/claim-provenance'],
        'commands/archive.mjs': ['node:path', 'node:fs', '@aof/contracts/error'],
        'commands/doctor.mjs': ['node:path', 'node:fs', 'node:fs/promises', '@aof/foundation/fs', '@aof/contracts/error'],
        'commands/validate.mjs': ['node:path', 'node:fs/promises'],
        'declared.mjs': ['node:path', 'node:fs/promises'],
        'select.mjs': ['node:fs'],
        'observe.mjs': ['node:fs', 'node:fs/promises', 'node:os', 'node:path', '@aof/contracts/error'],
        'debt.mjs': ['node:fs/promises', 'node:path', '@aof/foundation/fs'],
        'artifacts.mjs': ['node:crypto'],
        'read.mjs': ['node:path'],
        'content-read.mjs': ['node:fs/promises', 'node:path'],
        'resolve.mjs': ['@aof/contracts/error'],
        'find.mjs': ['node:path', '@aof/contracts/error'],
        'next.mjs': ['node:path'],
        'doc.mjs': ['node:path', 'node:fs/promises', '@aof/contracts/error'],
        'tasks.mjs': ['node:path', 'node:fs/promises', '@aof/contracts/error'],
        'scaffold.mjs': ['node:path', 'node:fs', 'node:fs/promises', '@aof/foundation/fs', '@aof/contracts/error'],
        'promote.mjs': ['node:path', 'node:fs', 'node:fs/promises', '@aof/foundation/fs', '@aof/contracts/error'],
        'promotion.mjs': ['node:path', 'node:fs/promises', '@aof/foundation/fs'],
        'promote-gap-to-chore.mjs': ['@aof/contracts/error'],
        'promote-finding-to-chore.mjs': ['@aof/contracts/error'],
        'archive.mjs': ['node:path', 'node:fs/promises'],
        'reindex.mjs': ['node:path', 'node:fs/promises', '@aof/foundation/fs'],
        'upgrade.mjs': ['@aof/contracts/error'],
        'provenance.mjs': ['node:fs', 'node:path'],
        'corpus.mjs': ['node:fs', 'node:fs/promises', 'node:path'],
        'tune.mjs': ['@aof/contracts/error'],
        'story-contract.mjs': ['node:path'],
        'grade.mjs': ['@aof/contracts/claim-provenance'],
        'layout.mjs': ['@aof/contracts/error'],
        'index.mjs': ['node:path', 'node:fs/promises'],
        'coherence.mjs': ['node:path'],
        'freshness.mjs': ['node:path'],
        'budget.mjs': ['node:path'],
        'rubric.mjs': ['node:path'],
        'loop-record.mjs': ['node:path'],
        'depends.mjs': ['node:path'],
        'diagrams.mjs': ['node:path'],
        'examples.mjs': ['node:path'],
        'controls.mjs': ['node:path'],
        'census.mjs': ['node:path', 'node:fs/promises'],
        'evidence.mjs': ['node:path', 'node:fs/promises'],
        'prompt-layer.mjs': ['node:path', 'node:fs/promises'],
        'seam-liveness.mjs': ['node:path', 'node:fs/promises'],
        'report.mjs': ['node:path'],
        'criterion.mjs': ['node:path', 'node:crypto', 'node:fs/promises'],
        'store.mjs': ['node:path', 'node:fs/promises'],
        'observations.mjs': ['node:os', 'node:path'],
        'records.mjs': ['node:path', 'node:fs', 'node:fs/promises', '@aof/foundation/fs'],
        'discovery.mjs': ['node:path', 'node:fs/promises'],
        'validation.mjs': ['node:path', 'node:fs/promises'],
      } : {};
      const forbidden = ({ file, specifier }) => classifySpecifier(specifier, file, report.family) === 'violation' && !(nativePorts[file.slice(`packages/${name}/src/`.length)] ?? nativePorts[path.basename(file)] ?? []).includes(specifier);
      const external = report.violations.filter(forbidden);
      assert.deepEqual(external, [], name + ': only local imports and explicitly allowed platform/package APIs are allowed');
      // These two child programs load the audited subject by design. The audit isolation gate
      // proves neither implementation is reachable from the parent's import closure.
      assert.deepEqual(report.computed, name === 'work' ? [
        { file: 'packages/work/src/programs/audit-drive.mjs', expression: 'pathToFileURL(control' },
        { file: 'packages/work/src/programs/audit-probe.mjs', expression: 'pathToFileURL(runner' },
      ] : [], `${name}: only the declared audit children may compute a subject import`);
      const from = report.family.files[0];
      for (const code of [
        'import { invoke } from "../../../packages/core/src/command-core.mjs";',
        `export { x } from "../../${name === 'contracts' ? 'effects/src/dispatch' : 'contracts/src/commands'}.mjs";`,
        'const provider = await import("node:net");',
        'const core = await import(`aof`);',
      ]) {
        const specs = importSpecifiers(code);
        assert.equal(specs.length, 1, 'the planted import is detected');
        assert.equal(forbidden({ file: from, specifier: specs[0].specifier }), true);
      }
      assert.ok(computedDynamicImports('await import(variableName)').length > 0);
      const manifest = JSON.parse(readFileSync(path.join(root, 'packages', name, 'package.json'), 'utf8'));
      assert.deepEqual(Object.keys(manifest.dependencies ?? {}), name === 'server' ? ['@aof/execution', 'ws'] : name === 'knowledge' ? ['@aof/contracts', '@aof/foundation', '@aof/work'] : name === 'messaging' ? ['@aof/contracts', '@aof/foundation', '@inquirer/prompts', 'ws'] : name === 'execution' ? ['@aof/contracts', '@aof/foundation', '@xterm/headless', 'node-pty'] : name === 'mesh' ? ['@aof/contracts', '@aof/execution', '@aof/foundation', '@aof/server', '@aof/work', '@aof/work-loop', 'ws'] : name === 'work' ? ['@aof/contracts', '@aof/foundation', 'picomatch'] : name === 'work-loop' ? ['@aof/contracts', '@aof/foundation'] : name === 'work-graph' ? ['@aof/contracts', '@aof/foundation', '@aof/work'] : [], `${name}: only declared lower-level dependencies`);
      for (const target of Object.values(manifest.exports)) {
        assert.ok(target.startsWith('./src/') && !target.includes('..', 2));
        assert.ok(report.family.files.includes(`packages/${name}/${target.slice(2)}`), 'export points to scanned runtime source');
      }
    }
  } },
  { name: 'yarn-installation/production packaging preserves the dependency name of an installed link', run: () => fixture(async dir => {
    write(dir, 'package.json', { name: 'fixture', dependencies: { alias: 'npm:shared@1' } });
    write(dir, 'node_modules/shared/package.json', { name: 'shared', version: '1' });
    symlinkSync(path.join(dir, 'node_modules/shared'), path.join(dir, 'node_modules/alias'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.deepEqual(productionDependencyDirs(dir).map(p => path.relative(dir, p).replaceAll('\\', '/')), ['node_modules/alias']);
  }) },
  { name: 'yarn-installation/production workspaces retain nested runtime versions without development dependencies', run: () => fixture(async dir => {
    write(dir, 'package.json', { name: 'fixture', dependencies: { '@aof/feature': 'workspace:*', shared: '1' } });
    write(dir, 'yarn.lock', readFileSync(path.join(dir, 'yarn.lock'), 'utf8') +
      '"@aof/feature@workspace:packages/feature":\n  version: 1.0.0\n  resolution: "@aof/feature@workspace:packages/feature"\n');
    write(dir, 'packages/feature/package.json', { name: '@aof/feature', dependencies: { shared: '2' }, devDependencies: { tooling: '1' } });
    write(dir, 'packages/feature/node_modules/shared/package.json', { name: 'shared', version: '2' });
    write(dir, 'packages/feature/node_modules/tooling/package.json', { name: 'tooling' });
    write(dir, 'node_modules/shared/package.json', { name: 'shared', version: '1' });
    mkdirSync(path.join(dir, 'node_modules/@aof'), { recursive: true });
    symlinkSync(path.join(dir, 'packages/feature'), path.join(dir, 'node_modules/@aof/feature'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.deepEqual(productionDependencyDirs(dir).map(p => path.relative(dir, p).replaceAll('\\', '/')), [
      'node_modules/@aof/feature', 'node_modules/@aof/feature/node_modules/shared', 'node_modules/shared',
    ]);
  }) },
  { name: 'yarn-installation/production packaging refuses undeclared linked source', run: () => fixture(async dir => {
    write(dir, 'package.json', { name: 'fixture', dependencies: { unexpected: '1' } });
    write(dir, 'unlisted/package.json', { name: 'unexpected' });
    mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
    symlinkSync(path.join(dir, 'unlisted'), path.join(dir, 'node_modules/unexpected'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => productionDependencyDirs(dir), /escapes installed packages and locked workspaces/);
  }) },
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
    assert.equal(existsSync(path.join(root, 'apps/ui/package-lock.json')), false);
  } },
];
