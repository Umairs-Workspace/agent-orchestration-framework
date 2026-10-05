import { defaultApplication as _aofApplication } from "aof/default-application";
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, realpath, rm, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { createApplication } from '../../packages/core/src/application/assemble.mjs';
import { createApplicationLifetime } from '../../packages/core/src/application/lifetime.mjs';
import { defaultApplication } from '../../packages/core/src/application/default.mjs';
const registerActiveWorktree = _aofApplication.mesh.worker.registerActiveWorktree;
import { importSpecifiers } from '../support/module-family.mjs';
import { applicationConstructionDetails } from '../support/workspace/assembly-graph.mjs';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const runNode = promisify(execFile);

async function fixture(body) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-application-'));
  const apps = [];
  const app = name => {
    const instance = createApplication({ env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, name) } });
    apps.push(instance);
    return instance;
  };
  try { await body({ root, app }); }
  finally {
    await Promise.all(apps.map(instance => instance.close()));
    assert.equal(path.dirname(await realpath(root)), parent);
    await rm(root, { recursive: true, force: true });
  }
}

export const applicationAssemblyTests = [
  {
    name: 'application/construction has no static service cycle or dependency on compatibility entries',
    async run() {
      const construction = await applicationConstructionDetails(repoRoot);
      const visiting = new Set(), visited = new Set();
      function visit(file) {
        assert.ok(!visiting.has(file), `construction cycle at ${file}`);
        if (visited.has(file)) return;
        visiting.add(file);
        for (const edge of construction.get(file)?.dependencies ?? []) if (!edge.dynamic) visit(edge.target);
        visiting.delete(file);
        visited.add(file);
      }
      for (const file of construction.keys()) visit(file);
      const legacy = new Set([...construction.keys()].filter(file => file.startsWith('packages/core/src/application/bindings/'))
        .map(file => path.resolve(repoRoot, file.replace('packages/core/src/application/bindings/', 'packages/core/src/'))));
      assert.ok(legacy.size >= 200, 'the compatibility boundary covers the service families');
      const seen = new Set();
      async function inspect(file) {
        assert.ok(!legacy.has(file), `assembly depends on legacy entry ${file}`);
        if (seen.has(file)) return;
        seen.add(file);
        for (const { specifier } of importSpecifiers(await readFile(file, 'utf8'))) {
          if (!specifier.startsWith('.') && !specifier.startsWith('@aof/')) continue;
          const target = createRequire(file).resolve(specifier);
          if (file.startsWith(path.join(repoRoot, 'packages') + path.sep) && !file.startsWith(path.join(repoRoot, 'packages/core') + path.sep)) {
            assert.ok(!target.startsWith(path.join(repoRoot, "packages", "core", "src") + path.sep), `${file} imports assembled core`);
          }
          await inspect(target);
        }
      }
      await inspect(path.join(repoRoot, 'packages/core/src/application/assemble.mjs'));
      assert.ok(seen.size > 400, 'the full application implementation graph was inspected');
      // The same detector refuses a planted old adapter edge.
      await assert.rejects(inspect(path.join(repoRoot, 'packages/core/src/command-core.mjs')), /legacy entry/);
    },
  },
  {
    name: 'application/registration and CLI help start no process, listener, network request or native PTY and read no credential environment variables',
    run: () => fixture(async ({ root }) => {
      const home = path.join(root, 'startup-home');
      const probe = `
        import assert from 'node:assert/strict';
        import { registerHooks, syncBuiltinESMExports } from 'node:module';
        import cp from 'node:child_process';
        import net from 'node:net';
        import http from 'node:http';
        import https from 'node:https';
        const credentialReads = [];
        process.env = new Proxy(process.env, { get(target, name) {
          if (typeof name === 'string' && /TOKEN|SECRET|API_KEY|PASSWORD/.test(name)) credentialReads.push(name);
          return Reflect.get(target, name);
        }});
        const started = [];
        const refuse = name => (...args) => { started.push(name); throw Error('Unexpected startup: ' + name); };
        for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) cp[name] = refuse(name);
        net.Server.prototype.listen = refuse('listen');
        net.Socket.prototype.connect = refuse('connect');
        for (const api of [http, https]) for (const name of ['request', 'get']) api[name] = refuse(name);
        globalThis.fetch = refuse('fetch');
        syncBuiltinESMExports();
        const loaded = [];
        registerHooks({ resolve(specifier, context, next) {
          loaded.push(specifier);
          if (specifier === 'node-pty') throw Error('Registration loaded a native PTY');
          return next(specifier, context);
        }});
        const { createApplication } = await import('./packages/core/src/application/assemble.mjs');
        const app = createApplication({ env: process.env });
        assert.equal(app.listCommands().length, 118); // 147/02 — work:drive-repair
        const { run } = await import('./packages/core/src/cli.mjs');
        await run(['--help']);
        await app.close();
        assert.deepEqual(started, []);
        assert.deepEqual(credentialReads, []);
        assert.ok(!loaded.includes('node-pty'));
      `;
      const result = await runNode(process.execPath, ['--input-type=module', '--eval', probe], {
        cwd: repoRoot, env: { ...process.env, AOF_GLOBAL_HOME: home }, timeout: 30_000,
      });
      assert.match(result.stdout, /Usage:/i);
      await assert.rejects(access(home), { code: 'ENOENT' });
    }),
  },
  {
    name: 'application/registration preserves every descriptor and does not create application state',
    run: () => fixture(async ({ root, app }) => {
      const application = app('home');
      const before = JSON.parse(await readFile(new URL('../fixtures/application/command-inventory.json', import.meta.url), 'utf8'));
      assert.deepEqual(JSON.parse(JSON.stringify(application.listCommands())), before);
      assert.equal(application.listCommands().length, 118); // 147/02 — work:drive-repair
      await assert.rejects(access(path.join(root, 'home')), { code: 'ENOENT' });
      assert.deepEqual(application.mesh.worker.listActiveWorktrees(), []);
      assert.equal(registerActiveWorktree, defaultApplication.mesh.worker.registerActiveWorktree);
    }),
  },
  {
    name: 'application/two environments isolate workspace configuration, journal handles and worker state',
    run: () => fixture(async ({ root, app }) => {
      const a = app('a'), b = app('b');
      const project = path.join(root, 'project');
      await mkdir(path.join(project, '.aof'), { recursive: true });
      await writeFile(path.join(project, '.aof/aof.config.json'), JSON.stringify({ work: { dir: './items' } }));
      for (const name of ['a', 'b']) {
        await mkdir(path.join(root, name));
        await writeFile(path.join(root, name, 'aof.config.json'), JSON.stringify({ mesh: { nodeId: name } }));
      }
      const wa = await a.loadWorkspace(project), wb = await b.loadWorkspace(project);
      assert.equal(wa.config.mesh.nodeId, 'a');
      assert.equal(wb.config.mesh.nodeId, 'b');
      assert.equal(wa.workDir, path.join(project, 'items'));
      assert.notEqual(wa.identityPath, wb.identityPath);
      assert.equal((await a.invoke('assets:list', { global: true })).configPath, path.join(root, 'a', 'aof.config.json'));
      assert.equal((await b.invoke('assets:list', { global: true })).configPath, path.join(root, 'b', 'aof.config.json'));
      assert.notEqual(a.getCommand('work:list'), b.getCommand('work:list'));
      assert.equal(a.effects.reactors.UndeclaredEventError, b.effects.reactors.UndeclaredEventError);
      a.mesh.worker.registerActiveWorktree('assigned', { worktreePath: path.join(root, 'checkout') });
      assert.equal(a.mesh.worker.listActiveWorktrees().length, 1);
      assert.deepEqual(b.mesh.worker.listActiveWorktrees(), []);
      const ja = await a.effects.journal.openEffectsJournal(), jb = await b.effects.journal.openEffectsJournal();
      assert.notEqual(ja.databasePath, jb.databasePath);
      assert.ok(ja.databasePath.startsWith(path.join(root, 'a') + path.sep));
      await a.close();
      assert.deepEqual(a.mesh.worker.listActiveWorktrees(), []);
      assert.throws(() => ja.db.prepare('SELECT 1').get(), /not open|closed/i);
      assert.equal(jb.db.prepare('SELECT 1 AS value').get().value, 1);
      assert.throws(() => a.invoke('work:list', {}, { workspace: wa }), /closed/);
      await assert.rejects(a.effects.journal.openEffectsJournal(), /closed/);
      await a.close();
    }),
  },
  {
    name: 'application/CLI, board and MCP use their application registry without cross-instance dispatch',
    run: () => fixture(async ({ root, app }) => {
      const a = app('a'), b = app('b');
      const project = path.join(root, 'project');
      await mkdir(path.join(project, '.aof'), { recursive: true });
      await writeFile(path.join(project, '.aof/aof.config.json'), '{}');
      const calls = [], output = [];
      a.getCommand('work:list').run = async (input, ctx) => { calls.push({ id: 'work:list', input, ctx }); return []; };
      a.getCommand('graph:query').run = async (input, ctx) => { calls.push({ id: 'graph:query', input, ctx }); return { answer: 'fixture' }; };
      assert.notEqual(a.getCommand('work:list').run, b.getCommand('work:list').run);
      const oldLog = console.log, oldExitCode = process.exitCode;
      console.log = text => output.push(text);
      try {
        await a.cli.runCommandFace(a.getCommand('work:list'), ['--config', path.join(project, '.aof/aof.config.json'), '--json']);
      } finally { console.log = oldLog; process.exitCode = oldExitCode; }
      assert.equal(calls.length, 1);
      assert.equal(calls[0].ctx.workspace.projectRoot, project);
      assert.doesNotThrow(() => JSON.parse(output[0]));
      let status, response;
      const res = { writeHead(code) { status = code; }, end(body) { response = JSON.parse(body); } };
      assert.equal(await a.server.board.handleWorkApi({ method: 'GET', url: '/api/work/list' }, res, { projectDir: project }), true);
      assert.equal(status, 200);
      assert.deepEqual(response.items, []);
      assert.equal(calls[1].id, 'work:list');
      const ctx = { workspace: await a.loadWorkspace(project) };
      const reply = await a.server.mcp.handleMcpMessage({ id: 1, method: 'tools/call', params: { name: 'graph_query', arguments: { query: 'fixture' } } }, ctx);
      assert.equal(reply.result.isError, false);
      assert.equal(calls[2].id, 'graph:query');
      assert.equal(calls[2].ctx, ctx);
      assert.deepEqual(await a.invoke('graph:query', { query: 'fixture' }, ctx), { answer: 'fixture' });
      assert.equal(calls.length, 4);
    }),
  },
  {
    name: 'application/closing an application stops its owned HTTP server and preserves the other instance',
    run: () => fixture(async ({ root, app }) => {
      const a = app('a'), b = app('b');
      const uiRoot = path.join(root, 'ui');
      await mkdir(uiRoot);
      await writeFile(path.join(uiRoot, 'index.html'), '<h1>fixture</h1>');
      const sa = await a.server.serve.serveBoard({ port: 0, projectDir: root, uiRoot });
      const sb = await b.server.serve.serveBoard({ port: 0, projectDir: root, uiRoot });
      assert.equal(sa.server.listening, true);
      assert.equal(sb.server.listening, true);
      await a.close();
      assert.equal(sa.server.listening, false);
      assert.equal(sb.server.listening, true);
    }),
  },
  {
    name: 'application/lifetime closes upgraded HTTP sockets with their server',
    async run() {
      const scope = createApplicationLifetime();
      scope.ready();
      const server = createServer();
      server.on('upgrade', (_request, socket) => socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: fixture\r\n\r\n'));
      let client, timer;
      try {
        await scope.server(async () => {
          server.listen(0, '127.0.0.1');
          await once(server, 'listening');
          return { server };
        })();
        client = createConnection({ host: '127.0.0.1', port: server.address().port });
        client.resume();
        await once(client, 'connect');
        const upgraded = once(server, 'upgrade');
        client.write('GET / HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: fixture\r\n\r\n');
        await upgraded;
        const closed = once(client, 'close');
        await Promise.race([
          Promise.all([scope.close(), closed]),
          new Promise((_resolve, reject) => { timer = setTimeout(() => reject(Error('Upgraded socket kept shutdown open')), 2000); }),
        ]);
        assert.equal(server.listening, false);
        assert.equal(client.destroyed, true);
      } finally {
        clearTimeout(timer);
        client?.destroy();
        await scope.close();
      }
    },
  },
  {
    name: 'application/lifetime refuses early callbacks and closes every resource even when one fails',
    async run() {
      const scope = createApplicationLifetime();
      assert.throws(scope.assertReady, /constructing/);
      scope.ready();
      scope.assertReady();
      let closed = 0;
      await scope.open(async () => ({ close() { closed++; throw Error('fixture close failure'); } }))();
      await scope.open(async () => ({ close() { closed++; } }))();
      await assert.rejects(scope.close(), AggregateError);
      assert.equal(closed, 2);

      const late = createApplicationLifetime();
      late.ready();
      let finishOpening, lateClosed = 0;
      const opening = late.open(() => new Promise(resolve => { finishOpening = resolve; }))();
      await late.close();
      finishOpening({ close() { lateClosed++; } });
      await assert.rejects(opening, /closed/);
      assert.equal(lateClosed, 1, 'a resource that finishes opening after shutdown is disposed');
      assert.throws(scope.assertReady, /closed/);
      await assert.rejects(scope.close(), AggregateError);
      assert.equal(closed, 2);
    },
  },
];
