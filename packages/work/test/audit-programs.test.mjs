import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const driver = fileURLToPath(import.meta.resolve("@aof/work/programs/audit-drive"));
const probe = fileURLToPath(import.meta.resolve("@aof/work/programs/audit-probe"));

async function scratch(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, "aof-audit-programs-"));
  try { await run(root); }
  finally {
    assert.equal(path.dirname(await realpath(root)), parent);
    await rm(root, { recursive: true, force: true });
  }
}

function child(root, program, target) {
  const result = spawnSync(process.execPath, [program, ...(target === undefined ? [] : [target])], {
    cwd: root, encoding: "utf8", timeout: 15_000,
    env: { ...process.env, USERPROFILE: root, HOME: root, AOF_GLOBAL_HOME: path.join(root, "original-home") },
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  const lines = result.stdout.trim().split(/\r?\n/);
  const line = program === driver ? lines.find(line => line.startsWith("AOF_DRIVE_RESULT ")) : lines.at(-1);
  assert.ok(line, result.stdout + result.stderr);
  return { status: result.status, payload: JSON.parse(program === driver ? line.slice("AOF_DRIVE_RESULT ".length) : line) };
}

test("audit program public imports do not execute or emit protocol output", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e",
    'const a = await import("@aof/work/programs/audit-drive"); const b = await import("@aof/work/programs/audit-probe"); if (typeof a.runAuditDriver !== "function" || typeof b.runAuditProbe !== "function") throw new Error("missing entry point");',
  ], { encoding: "utf8", timeout: 15_000 });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("audit driver executes every case in an isolated home and preserves failure messages", () => scratch(async root => {
  const target = path.join(root, "control.mjs");
  await writeFile(target, `import assert from 'node:assert/strict';
let prior;
export const tests = [
 {name:'first',run(){prior=process.env.AOF_GLOBAL_HOME; assert.ok(prior.endsWith('c-0')); console.log('control output');}},
 {name:'second',run(){assert.notEqual(process.env.AOF_GLOBAL_HOME,prior); throw new Error('specific failure');}},
 {name:'third',run(){assert.ok(process.env.AOF_GLOBAL_HOME.endsWith('c-2'));}},
];`);
  assert.deepEqual(child(root, driver, target), { status: 0, payload: {
    ok: true, control: target, count: 3, cases: [
      {name: "first", ok: true, message: null},
      {name: "second", ok: false, message: "specific failure"},
      {name: "third", ok: true, message: null},
    ],
  } });
  const absent = child(root, driver);
  assert.equal(absent.status, 1);
  assert.equal(absent.payload.ok, false);
  assert.equal(absent.payload.control, null);
  for (const source of ['throw new Error("load failure");', 'export const tests = [];', 'export const tests = [{name:"uncallable"}];']) {
    await writeFile(target, source);
    const failed = child(root, driver, target);
    assert.equal(failed.status, 1);
    assert.equal(failed.payload.ok, false);
    assert.equal(failed.payload.control, target);
    assert.ok(failed.payload.error.length > 20);
  }
}));

test("audit probe enumerates assembled cases without running them and reports load/shape failures", () => scratch(async root => {
  const target = path.join(root, "runner.mjs");
  await writeFile(target, 'export const tests = [{name:"declared",run(){throw new Error("must not run");}}];');
  assert.deepEqual(child(root, probe, target), { status: 0, payload: { ok: true, runner: target, names: ["declared"], count: 1 } });
  await writeFile(target, 'export const tests = [];');
  assert.deepEqual(child(root, probe, target), { status: 0, payload: { ok: true, runner: target, names: [], count: 0 } });
  assert.equal(child(root, probe).status, 1);
  for (const source of ['throw new Error("load failure");', 'export const tests = [null];']) {
    await writeFile(target, source);
    const failed = child(root, probe, target);
    assert.equal(failed.status, 1);
    assert.equal(failed.payload.ok, false);
    assert.equal(failed.payload.runner, target);
  }
}));
