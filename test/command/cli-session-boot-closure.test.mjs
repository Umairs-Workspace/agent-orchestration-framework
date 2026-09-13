// Traceability wiring for milestone 72 / story 03 — THE COLD BOOT.
//
//   tasks/00_a-session-verb-boots-no-registry.feature
//        — "each session verb still does what it did before" and "the refusals a session verb made
//          before, it still makes": the BEHAVIOURAL half of the story, which the closure control
//          cannot see. Hoisting the session arm to the first statement of `run()` and turning
//          `helpText()` async are edits to the dispatch itself, and a structural control that only
//          measures import closures would pass a tree where the arm no longer reaches the verb.
//
// The CLOSURE, LAZY-IMPORT, DISPATCH-ORDER and NO-WALL-CLOCK scenarios of that same feature live in
// FF-7205 (`test/arch/session/acd-session-verb-boots-no-registry.test.mjs`), which is what the row declares
// them against; task 01 is FF-7206's in full. This file is the behavioural remainder, and it is
// deliberately not a second copy of either.
//
// ── TWO HARNESSES, AND THE SECOND ONE IS THE POINT ───────────────────────────────────────────
//
// The matrices drive `meshSessionCommand` in-process over a hermetic fixture repo and a fixture
// global home, with cwd/env/nodeId/stdin/now all pinned — the idiom `test/mesh-session-cli-record`
// established, and the only way to feed a hook's stdin payload deterministically.
//
// But the thing this story CHANGED is the CLI entry's dispatch order, and an in-process call to the
// command skips it entirely. So one row spawns the REAL `bin/aof.mjs session ping` and requires the
// hoisted arm to reach the verb — the regression a purely in-process suite would have shipped.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { meshSessionCommand } from "../../src/commands/mesh/session.mjs";
import { readSessionRecord, readSessionRecordsForNode } from "../../src/mesh/session.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { runBounded } from "../../src/work-audit/spawn.mjs";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const NODE_ID = "node-boot";

async function makeFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-72-03-"));
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const config = { name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const home = path.join(root, ".global-home");
  return { root, home, env: { AOF_GLOBAL_HOME: home } };
}

function ctxFor(fixture, { stdinText = "", now, env } = {}) {
  return {
    cwd: fixture.root,
    env: env ?? fixture.env,
    nodeId: NODE_ID,
    stdinText,
    now: typeof now === "string" ? () => now : now,
    loadWorkspace: (cwd, config) => loadWorkspace(cwd, config, { env: fixture.env }),
  };
}

const wsFor = (fixture) => loadWorkspace(fixture.root, undefined, { env: fixture.env });

// Run a session verb and hand back the envelope it emitted, with `process.exitCode` restored: the
// verb sets it on a refusal, and a test that left it set would fail the whole run.
async function invoke(args, ctx) {
  const before = process.exitCode;
  process.exitCode = undefined;
  const logs = [];
  const originalLog = console.log;
  console.log = (message) => logs.push(message);
  try {
    await meshSessionCommand(args, ctx);
  } finally {
    console.log = originalLog;
  }
  const exitCode = process.exitCode;
  process.exitCode = before;
  return { envelope: JSON.parse(logs[logs.length - 1]), exitCode };
}

export const cliSessionBootClosureTests = [
  {
    name: "72/03 task 00 (aof session): each session verb still does what it did before the registry left the boot path",
    async run() {
      const fixture = await makeFixture();
      try {
        const ws = await wsFor(fixture);
        const key = { nodeId: NODE_ID, workspaceId: "ws-1", assistant: "claude-code", sessionId: null };

        // start — records an open session for that assistant and repo.
        const started = await invoke(["start", "--workspace", "ws-1", "--repo", "my-repo", "--assistant", "claude-code", "--json"], ctxFor(fixture, { now: "2026-09-03T10:00:00.000Z" }));
        assert.equal(started.envelope.ok, true, "start reports success");
        const record = await readSessionRecord(ws, key);
        assert.ok(record != null, "…and an open session exists for that assistant");
        assert.equal(record.repo, "my-repo", "…for that repo");
        assert.equal(record.startedAt, "2026-09-03T10:00:00.000Z");
        assert.equal(record.lastPingAt, record.startedAt, "…with lastPingAt equal to startedAt on a fresh start");

        // ping — refreshes the last-seen time of that assistant's session.
        const pinged = await invoke(["ping", "--workspace", "ws-1", "--repo", "my-repo", "--assistant", "claude-code", "--json"], ctxFor(fixture, { now: "2026-09-03T10:00:30.000Z" }));
        assert.equal(pinged.envelope.ok, true, "ping reports success");
        const refreshed = await readSessionRecord(ws, key);
        assert.equal(refreshed.lastPingAt, "2026-09-03T10:00:30.000Z", "…and the last-seen time moved");
        assert.equal(refreshed.startedAt, "2026-09-03T10:00:00.000Z", "…while startedAt did not");
        assert.equal((await readSessionRecordsForNode(ws, NODE_ID)).length, 1, "…and the ping upserted in place rather than adding a second record");

        // end — removes only its OWN leaf, leaving siblings alone.
        await invoke(["start", "--workspace", "ws-1", "--repo", "my-repo", "--assistant", "codex", "--json"], ctxFor(fixture, { now: "2026-09-03T10:01:00.000Z" }));
        assert.equal((await readSessionRecordsForNode(ws, NODE_ID)).length, 2, "a sibling session exists before end");
        const ended = await invoke(["end", "--workspace", "ws-1", "--assistant", "claude-code", "--json"], ctxFor(fixture));
        assert.equal(ended.envelope.ok, true, "end reports success");
        assert.equal(await readSessionRecord(ws, key), null, "…its own leaf is gone");
        const survivors = await readSessionRecordsForNode(ws, NODE_ID);
        assert.equal(survivors.length, 1, "…and only its own");
        assert.equal(survivors[0].assistant, "codex", "…leaving the sibling untouched");
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "72/03 task 00 (aof session): the refusals a session verb made before, it still makes — and no session record is written",
    async run() {
      const fixture = await makeFixture();
      try {
        const ws = await wsFor(fixture);
        const outside = await mkdtemp(path.join(os.tmpdir(), "aof-72-03-outside-"));
        try {
          const rows = [
            { label: "no verb at all", args: ["--json"], ctx: {}, code: "invalid-input" },
            { label: "a verb that is not start, ping or end", args: ["sweep", "--json"], ctx: {}, code: "unknown-subcommand" },
            { label: "an option the verb does not declare", args: ["ping", "--nope", "--json"], ctx: {}, code: "invalid-input" },
            { label: "ping with no workspace resolvable", args: ["ping", "--assistant", "claude-code", "--json"], ctx: {}, code: "session-arg-missing-workspace" },
            { label: "start with no repo resolvable", args: ["start", "--workspace", "ws-1", "--assistant", "claude-code", "--json"], ctx: {}, code: "session-arg-missing-repo" },
            // A REAL hook payload carries only `cwd` — never workspace/repo — so this row is the
            // one an editor actually produces when it is pointed somewhere that is not a workspace.
            { label: "a hook payload whose cwd is no workspace", args: ["ping", "--json"], ctx: { stdinText: JSON.stringify({ session_id: "sid-1", cwd: outside, hook_event_name: "UserPromptSubmit" }) }, code: "session-cwd-not-workspace" },
          ];

          for (const row of rows) {
            const result = await invoke(row.args, ctxFor(fixture, row.ctx));
            assert.equal(result.envelope.ok, false, `${row.label}: the envelope reports failure`);
            assert.equal(result.envelope.code, row.code, `${row.label}: refuses with code "${row.code}"`);
            assert.equal(result.exitCode, 1, `${row.label}: and exits non-zero`);
            assert.deepEqual(await readSessionRecordsForNode(ws, NODE_ID), [], `${row.label}: no session record was written`);
          }
        } finally {
          await rm(outside, { recursive: true, force: true });
        }
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "72/03 task 00 (aof session): the hoisted arm still reaches the verb, driven through the REAL command-line entry",
    async run() {
      const fixture = await makeFixture();
      try {
        // The session arm is now the FIRST statement of `run()` — above the help branch, above the
        // route table, above every registry use. That is the edit this story made to the dispatch,
        // and an in-process call to the command would not exercise it at all: a hoist that landed
        // the arm in the wrong place, or a `helpText()` left un-awaited, shows up HERE and nowhere
        // else in this file.
        const child = await runBounded({
          command: process.execPath,
          args: [path.join(repoRoot, "bin", "aof.mjs"), "session", "ping", "--workspace", "ws-1", "--repo", "my-repo", "--assistant", "claude-code", "--json"],
          cwd: fixture.root,
          deadlineMs: 120_000,
          env: { ...process.env, AOF_GLOBAL_HOME: fixture.home },
        });
        assert.equal(child.outcome, "exited", `the entry point ran: ${child.error ?? ""}`);
        assert.equal(child.exitCode, 0, `…and the verb succeeded\n${child.stderr}`);

        const envelope = JSON.parse(child.stdout.trim());
        assert.equal(envelope.ok, true, "the real CLI dispatched the session verb");
        assert.equal(envelope.workspaceId, "ws-1", "…with the arguments it was handed");
        assert.equal(envelope.assistant, "claude-code");

        // A broken hoist reads as help, not as an error, which is why this is asserted rather than
        // left to the exit code.
        assert.ok(!child.stdout.includes("Agent Orchestration Framework"), "…and it did not fall through to the help text");
        assert.ok(!child.stdout.includes("[object Promise]"), "…nor render an un-awaited helpText() into its output");
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    },
  },
];
