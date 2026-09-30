#!/usr/bin/env node
// Runs the extracted release, including its REAL PTY, in an unrelated temporary
// project. No signing, publishing, profile writes or installed development copy.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm, readdir, realpath } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { sidecarArchiveName } from './stage-release-assets.mjs';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const psQuote = value => "'" + value.replaceAll("'", "''") + "'";

async function terminalRoundtrip(exe, project, fixture, env) {
  const shimDir = path.join(fixture, 'provider shim');
  await mkdir(shimDir);
  const shim = path.join(shimDir, process.platform === 'win32' ? 'codex.cmd' : 'codex');
  await writeFile(shim, process.platform === 'win32'
    ? '@echo off\r\necho AOF_PTY_READY\r\nset /p answer=\r\necho AOF_PTY_REPLY_%answer%\r\n'
    : '#!/bin/sh\nprintf "AOF_PTY_READY\\n"\nread answer\nprintf "AOF_PTY_REPLY_%s\\n" "$answer"\n', { mode: 0o755 });
  // Windows environment variable names are case-insensitive to the OS, but not
  // to JavaScript. Set exactly one PATH key for the provider's lookup.
  const childEnv = { ...env };
  for (const key of Object.keys(childEnv)) if (key.toLowerCase() === 'path') delete childEnv[key];
  childEnv.PATH = shimDir + path.delimiter + (env.PATH ?? env.Path ?? '');
  const server = spawn(exe, ['work', 'ui', '--port', '0', '--target', project], {
    cwd: project, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let output = '';
  let socket;
  const exited = new Promise(resolve => server.once('exit', resolve));
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Board startup timed out: ' + output)), 30_000);
      server.once('error', reject);
      server.once('exit', code => { clearTimeout(timer); reject(Error(`Board exited ${code}: ${output}`)); });
      server.stderr.on('data', data => { output += data; });
      server.stdout.on('data', data => {
        output += data;
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+\/board/u);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
    });
    const response = await fetch(url);
    assert.equal(response.status, 200, 'release serves the built UI');
    assert.match(await response.text(), /<html/u);
    const wsUrl = new URL('/ws/terminal?provider=codex', url);
    wsUrl.protocol = 'ws:';
    socket = new WebSocket(wsUrl);
    const received = await new Promise((resolve, reject) => {
      let text = '', sent = false;
      const timer = setTimeout(() => reject(Error('Real PTY timed out: ' + text + '\n' + output)), 30_000);
      socket.addEventListener('error', event => { clearTimeout(timer); reject(Error('Terminal WebSocket failed: ' + event.message)); });
      socket.addEventListener('message', event => {
        text += String(event.data);
        if (text.includes('"type":"error"')) { clearTimeout(timer); reject(Error(text)); }
        if (!sent && text.includes('AOF_PTY_READY')) { sent = true; socket.send('roundtrip\r'); }
        if (text.includes('AOF_PTY_REPLY_roundtrip')) { clearTimeout(timer); resolve(text); }
      });
      socket.addEventListener('close', () => {
        clearTimeout(timer);
        if (!text.includes('AOF_PTY_REPLY_roundtrip')) reject(Error('Terminal closed before roundtrip: ' + text));
      });
    });
    assert.match(received, /AOF_PTY_REPLY_roundtrip/u);
  } finally {
    socket?.close();
    server.kill();
    await exited;
  }
}

export async function verifyDistribution({ stageDir, os: targetOs, arch }) {
  const expectedOs = { win32: 'windows', darwin: 'macos', linux: 'linux' }[process.platform];
  assert.equal(targetOs, expectedOs, 'release verification runs on its target OS');
  assert.equal(arch, process.arch, 'release verification runs on its target architecture');
  stageDir = path.resolve(stageDir);
  const parent = await realpath(os.tmpdir());
  const fixture = await mkdtemp(path.join(parent, 'aof release proof '));
  try {
    const installed = path.join(fixture, 'installed distribution');
    const project = path.join(fixture, 'unrelated project');
    await mkdir(project);
    const binary = `aof-${targetOs}-${arch}${process.platform === 'win32' ? '.exe' : ''}`;
    const sidecar = sidecarArchiveName(targetOs, arch);
    let place;
    if (process.platform === 'win32') {
      const installer = path.join(fixture, 'install.ps1');
      // Dot-source the REAL installer in its documented test mode; no registry,
      // network, signing-key or user-profile operations are performed.
      await writeFile(installer, `$ErrorActionPreference = 'Stop'\n$env:AOF_INSTALL_TEST = '1'\n. ${psQuote(path.join(repoRoot, 'install.ps1'))}\nInstall-AofFiles -WorkDir ${psQuote(stageDir)} -Asset ${psQuote(binary)} -Sidecar ${psQuote(sidecar)} -InstallDir ${psQuote(installed)}\n`);
      place = () => execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-File', installer], { stdio: 'pipe', windowsHide: true });
    } else {
      place = () => execFileSync('sh', ['-c', 'export AOF_INSTALL_TEST=1; . "$1"; aof_install_files "$2" "$3" "$4" "$5"',
        'aof-release-proof', path.join(repoRoot, 'install.sh'), stageDir, binary, sidecar, installed], { stdio: 'pipe' });
    }
    place();
    await writeFile(path.join(installed, 'bundle', 'retired.md'), 'stale asset');
    await writeFile(path.join(installed, 'src', 'cli.mjs'), '// prior developer payload');
    await writeFile(path.join(installed, 'BUILD_ID.json'), '{"buildId":"prior-payload"}');
    place();
    assert.ok(!(await readdir(path.join(installed, 'bundle'))).includes('retired.md'));
    assert.ok(!(await readdir(installed)).includes('BUILD_ID.json'), 'release replaces a prior developer payload stamp');
    const exe = path.join(installed, process.platform === 'win32' ? 'aof.exe' : 'aof');
    const guard = path.join(fixture, 'module-boundary.mjs');
    await writeFile(guard, `import { registerHooks } from 'node:module';\nimport { realpathSync } from 'node:fs';\nimport { fileURLToPath } from 'node:url';\nimport path from 'node:path';\nconst fixture = ${JSON.stringify(fixture)};\nregisterHooks({ load(url, context, next) {\n  if (url.startsWith('file:')) { const rel = path.relative(fixture, realpathSync(fileURLToPath(url)));\n    if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) throw Error('Release module escaped isolated fixture: ' + url); }\n  return next(url, context);\n} });\n`);
    const env = { ...process.env, AOF_GLOBAL_HOME: path.join(fixture, 'home'), NODE_PATH: '',
      NODE_OPTIONS: '--import=' + pathToFileURL(guard).href };
    delete env.AOF_SEA_EMBEDDED;
    const run = args => execFileSync(exe, args, { cwd: project, env, encoding: 'utf8', timeout: 60_000, windowsHide: true });
    const version = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8')).version;
    const reported = run(['--version']).trim();
    assert.ok(reported.startsWith(version + ' (embedded '), reported);
    assert.equal(run(['--help']), execFileSync(process.execPath, [path.join(repoRoot, 'packages/core/bin/aof.mjs'), '--help'], { cwd: project, env: { ...env, NODE_OPTIONS: '' }, encoding: 'utf8' }));
    run(['work', 'init', project, '--runtime', 'claude,codex', '--json']);
    assert.match(await readFile(path.join(project, '.codex/skills/aof-continue/SKILL.md'), 'utf8'), /aof work/u);
    // Child entries are self-contained bundles; the release has no core CLI
    // payload and no workspace packages from which they could import code.
    assert.ok(!(await readdir(path.join(installed, 'src'))).includes('cli.mjs'));
    const runner = path.join(project, 'runner.mjs');
    await writeFile(runner, 'export const tests = [{ name: "release-child-proof", run() {} }];\n');
    await mkdir(path.join(project, 'scripts'));
    await copyFile(runner, path.join(project, 'scripts/test.mjs'));
    const audit = JSON.parse(run(['work', 'audit', '--json']));
    assert.deepEqual(audit.findings.filter(finding => finding.code === 'audit-runtime-membership-unavailable'), [], 'SEA command executes its audit census child');
    assert.equal(audit.reads.find(read => read.sweep === 'assembled-suite')?.count, 1, 'SEA audit actually enumerates the fixture runner');
    const node = path.join(installed, 'node-runtime', process.platform === 'win32' ? 'node.exe' : 'node');
    for (const child of ['audit-probe', 'audit-drive']) {
      const output = execFileSync(node, [path.join(installed, 'src/work', child + '.mjs'), runner], { cwd: project, env, encoding: 'utf8', timeout: 60_000, windowsHide: true });
      assert.match(output, /release-child-proof/u);
    }
    await terminalRoundtrip(exe, project, fixture, env);
    const report = { platform: process.platform, arch, version: reported, checks: ['extracted installer layout and update', 'source help parity', 'work init assets', 'isolated module loading', 'SEA audit census', 'bundled audit children', 'built UI', 'real SEA PTY input/output'] };
    console.log(JSON.stringify(report, null, 2));
    return report;
  } finally {
    assert.equal(path.dirname(await realpath(fixture)), parent);
    await rm(fixture, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(Array.from({ length: Math.floor((process.argv.length - 2) / 2) }, (_, index) => [process.argv[2 + index * 2].slice(2), process.argv[3 + index * 2]]));
  verifyDistribution({ stageDir: args['stage-dir'], os: args.os, arch: args.arch }).catch(error => { console.error(error.stack); process.exitCode = 1; });
}
