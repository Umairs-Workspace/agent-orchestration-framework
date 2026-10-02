import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createScreenModel } from "@aof/execution/terminal/screen";
import { createSessionScreens } from "@aof/execution/terminal/session-screen";
import { createClaudeTrust } from "@aof/execution/claude-trust";

test("screen loading remains memoized per loader across service instances and disposal drains writes", async () => {
  const events = [];
  const first = createScreenModel({ reportDegrade: (...args) => events.push(args) });
  const second = createScreenModel({ reportDegrade: assert.fail });
  let failedLoads = 0;
  const missing = () => { failedLoads++; throw new Error("fixture missing emulator"); };
  assert.equal(failedLoads, 0);
  assert.equal(await first.createScreen({ load: missing }), null);
  assert.equal(await second.createScreen({ load: missing }), null);
  assert.equal(failedLoads, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0][0], "screen-model-unavailable");

  let loads = 0, disposals = 0;
  const construction = [];
  const load = () => { loads++; return { Terminal: class {
    constructor(options) { construction.push(options); }
    write() {}
    dispose() { disposals++; }
  } }; };
  const a = await first.createScreen({ cols: 12, rows: 3, load });
  const b = await second.createScreen({ cols: 20, rows: 4, load });
  assert.equal(loads, 1);
  assert.deepEqual(construction, [
    { cols: 12, rows: 3, scrollback: 0, allowProposedApi: true },
    { cols: 20, rows: 4, scrollback: 0, allowProposedApi: true },
  ]);
  let settled = false;
  const writing = a.write("pending").then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);
  a.dispose();
  a.dispose();
  await writing;
  b.dispose();
  assert.equal(disposals, 2);
  assert.equal(a.snapshot().rows.length, 3);
});

test("session screens retain queued fallback bytes and freeze final evidence", async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const { openSessionScreen } = createSessionScreens({ createScreen: () => pending, reportDegrade: assert.fail });
  const screen = openSessionScreen();
  screen.feed("first ");
  screen.feed("frame");
  assert.equal(screen.gate().mode, "pending");
  resolve(null);
  assert.deepEqual(await screen.evidence({ final: true }), { source: "bytes", tail: "first frame" });
  screen.feed(" later output");
  assert.deepEqual(await screen.evidence(), { source: "bytes", tail: "first frame" });
  screen.dispose();
});

test("trust writes preserve unrelated settings and canonical path keys in a supplied home", async () => {
  const parent = await realpath(os.tmpdir());
  const home = await mkdtemp(path.join(parent, "aof-package-trust-"));
  try {
    const events = [];
    const trust = createClaudeTrust({ reportDegrade: (...args) => events.push(args) });
    const file = path.join(home, ".claude.json");
    const config = { unrelated: { enabled: true }, projects: { "C:/fixture/project": { other: "preserved" } } };
    await writeFile(file, JSON.stringify(config));
    await trust.ensureWorktreeTrusted("C:\\fixture\\project", { homedir: home });
    const written = await readFile(file, "utf8");
    assert.deepEqual(JSON.parse(written), { ...config, projects: { "C:/fixture/project": { other: "preserved", hasTrustDialogAccepted: true } } });
    await trust.ensureWorktreeTrusted("C:\\fixture\\project", { homedir: home });
    assert.equal(await readFile(file, "utf8"), written);
    await writeFile(file, "malformed");
    await trust.ensureWorktreeTrusted("C:/another", { homedir: home });
    assert.equal(await readFile(file, "utf8"), "malformed");
    assert.equal(events.length, 1);
    assert.equal(events[0][0], "claude-trust");
  } finally {
    assert.equal(path.dirname(await realpath(home)), parent);
    await rm(home, { recursive: true, force: true });
  }
});
