import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createTerminalProviders } from "@aof/execution/providers";
import { createTerminalSessions } from "@aof/execution/terminal-sessions";

test("provider composition preserves launch metadata and caller-owned argument/environment values", () => {
  const providers = createTerminalProviders({ reportDegrade: assert.fail });
  assert.deepEqual(providers.PROVIDER_IDS, ["claude", "codex", "gemini"]);
  assert.equal(providers.resolveProvider("missing"), null);
  const env = { PATH: "fixture" };
  for (const id of providers.PROVIDER_IDS) {
    const seen = [];
    const provider = providers.resolveProvider(id, (bin, environment) => {
      seen.push([bin, environment]);
      return `/fixture/${bin}`;
    });
    assert.ok(provider instanceof providers.CliProvider);
    assert.equal(provider.resolveBinaryPath(env), `/fixture/${id}`);
    assert.equal(provider.validatePrerequisites(env), true);
    assert.deepEqual(seen, [[id, env], [id, env]]);
    const args = provider.buildArgs();
    args.push("caller-only");
    assert.deepEqual(provider.buildArgs(), []);
    assert.deepEqual(provider.buildEnv("session", env), {
      ...env, AOF_TERMINAL_SESSION: "session", AOF_TERMINAL_PROVIDER: id,
    });
    assert.deepEqual(env, { PATH: "fixture" });
  }
  assert.throws(() => createTerminalProviders({}), /reportDegrade/);
});

test("session registry composes independently and preserves live records and best-effort diagnostics", async () => {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, "aof-package-sessions-"));
  try {
    const events = [];
    const first = createTerminalSessions({ reportDegrade: (...args) => events.push(args) });
    const second = createTerminalSessions({ reportDegrade: assert.fail });
    await first.registerSession(root, { pid: process.pid, ref: "42/01", provider: "codex", cwd: root });
    assert.equal((await second.listSessions(root))[0].ref, "42/01");
    const file = path.join(root, ".aof", "terminal-sessions.json");
    const original = await readFile(file, "utf8");
    await second.listSessions(root);
    assert.equal(await readFile(file, "utf8"), original, "inspection does not rewrite the registry");
    await second.unregisterSession(root, process.pid);
    assert.deepEqual(await first.listSessions(root), []);
    const blocked = path.join(root, "file-instead-of-directory");
    await writeFile(blocked, "untouched");
    await first.registerSession(blocked, { pid: process.pid });
    assert.equal(events.length, 1);
    assert.equal(events[0][0], "terminal-sessions");
    assert.equal(await readFile(blocked, "utf8"), "untouched");
    assert.throws(() => createTerminalSessions({}), /reportDegrade/);
  } finally {
    assert.equal(path.dirname(await realpath(root)), parent);
    await rm(root, { recursive: true, force: true });
  }
});
