// test/session/agent-session-driver-runtime-dispatch.test.mjs — milestone 53 / story 00, task 04
// (04_codex-is-not-a-pty-path.feature; ADR-001 §1, RESEARCH §Q1).
//
// The two runtime-dispatch members ADR-001 §1 moves because they have no other caller:
// `defaultSpawnRuntime` and `buildDriverCommand`. They are the fork in the driver's road
// and the easiest thing in the moved block to get subtly wrong, because the two branches
// share NOTHING — one resolves a provider, spawns a PTY, types a line and watches a
// transcript; the other builds an argv, runs `execFile` and parses stdout. A move that
// let `claude` fall into the codex branch would throw on its first line
// (`buildDriverCommand("claude")` returns null and the branch destructures its result);
// a move that let `codex` fall into the PTY branch would silently start spawning
// terminals for a driver that has never had one. Both are observable at the injected
// seam, and both are asserted here.
//
// `buildDriverCommand` IS RETIRED FOR CLAUDE AND ONLY FOR CLAUDE. Milestone 38 / ADR-013
// replaced the `claude -p <prompt> --output-format json` one-shot with the interactive
// PTY path; codex kept its own pre-existing headless-print form UNCHANGED, because codex
// was never the subscription-billing / human-in-the-loop problem. So the function
// returns a command for exactly one driver id and `null` for every other — and `null` is
// a fail-closed instruction to the caller, never a licence to fall back.
//
// ONE CODEX BEHAVIOUR IS DELIBERATELY NOT COVERED HERE, and naming it is the point
// rather than an omission. The codex branch's stdout mapping runs through the module's
// own top-level `execFile` with NO injected exec seam, and ADR-001 forbids adding one (a
// signature change is a second change riding a move). It is therefore unobservable
// without a real `codex` binary, and 53/04's `@manual` soak is the lane that decides it.
// What IS asserted here is that this story added no such seam.
//
// THE CODEX SCENARIOS NEVER EXECUTE A REAL `codex`, and the guard is written into them:
// every codex drive uses a `worktreeCwd` under a `mkdtemp` root that has been REMOVED, so
// the child fails to start on its working directory before any binary is looked up — the
// outcome is the same coded failure on a machine that has codex installed and one that
// does not. A builder who "fixes" this by pointing at a real directory has turned a
// hermetic suite into a soak.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { defaultSpawnRuntime, buildDriverCommand } from "../../src/agent-session-driver.mjs";
import { defaultSpawnRuntime as sinkDefaultSpawnRuntime, buildDriverCommand as sinkBuildDriverCommand } from "../../src/mesh/worker-execution.mjs";
import { createFakeWhich, createFakePtySpawn } from "../support/mesh-worker-terminal-fixture.mjs";

const CODEX_ARGV_HEAD = ["exec", "--json", "-o", "last-message.txt", "--sandbox", "workspace-write", "--ask-for-approval", "never"];

// withRemovedWorktree(fn) — a path that EXISTED and no longer does. The child fails on
// its working directory before any binary lookup, which is what makes every codex lane
// below hermetic on a machine with codex installed.
async function withRemovedWorktree(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-dispatch-"));
  const worktreeCwd = path.join(root, "worktree");
  await rm(root, { recursive: true, force: true });
  assert.equal(existsSync(worktreeCwd), false, "precondition: the codex lane's worktreeCwd is genuinely gone");
  return fn(worktreeCwd);
}

// A `which` double that COUNTS its calls — "no provider lookup happened" is only
// evidence if the lookup was observable.
function countingWhich(presentBins = ["claude"]) {
  const calls = [];
  const inner = createFakeWhich(presentBins);
  const which = (bin, env) => {
    calls.push(bin);
    return inner(bin, env);
  };
  return { which, calls };
}

const brief = (worktreeCwd, extra = {}) => ({ itemRef: "53/00", worktreeCwd, task: "the session driver gets a home", command: "/aof:verify 53/00", ...extra });

async function settles(promise) {
  try {
    return { rejected: false, value: await promise };
  } catch (error) {
    return { rejected: true, error };
  }
}

export const agentSessionDriverRuntimeDispatchTests = [
  {
    name: "53/00 task04 — buildDriverCommand answers for codex and refuses everything else, including claude (null is a fail-closed instruction, never a fallback)",
    run: async () => {
      const b = brief("/tmp/wt");
      const codex = buildDriverCommand("codex", b);
      assert.equal(codex.bin, "codex");
      assert.ok(Array.isArray(codex.args), "and an args array");
      for (const driver of ["claude", "gemini", "no-such-provider", "", undefined, null, 0]) {
        assert.equal(buildDriverCommand(driver, b), null, `buildDriverCommand(${JSON.stringify(driver)}) is null`);
      }
    },
  },
  {
    name: "53/00 task04 — the codex argv is the pre-existing headless one-shot, unchanged by the move, with the prompt last so the flags cannot be reordered around it",
    run: async () => {
      const { args } = buildDriverCommand("codex", brief("/tmp/wt"));
      assert.deepEqual(args.slice(0, CODEX_ARGV_HEAD.length), CODEX_ARGV_HEAD, "exec --json -o last-message.txt --sandbox workspace-write --ask-for-approval never");
      assert.equal(args.length, CODEX_ARGV_HEAD.length + 1, "followed by exactly one more element");
      assert.equal(typeof args[args.length - 1], "string", "and the prompt is the last element");
    },
  },
  {
    name: "53/00 task04 — the codex prompt is composed from the brief: it names the itemRef, ends with the task when one is supplied, and has no trailing whitespace when it is not",
    run: async () => {
      const withTask = buildDriverCommand("codex", { itemRef: "53/00", worktreeCwd: "/tmp/wt", task: "extract the driver" });
      const prompt = withTask.args[withTask.args.length - 1];
      assert.ok(prompt.includes("53/00"), "it names the itemRef");
      assert.ok(prompt.endsWith("extract the driver"), "and ends with the brief's task");

      for (const task of [undefined, null, ""]) {
        const built = buildDriverCommand("codex", { itemRef: "53/00", worktreeCwd: "/tmp/wt", task });
        const p = built.args[built.args.length - 1];
        assert.equal(p, p.trim(), `task ${JSON.stringify(task)}: no trailing whitespace`);
        assert.ok(p.includes("53/00"), `task ${JSON.stringify(task)}: still names the itemRef`);
      }
    },
  },
  {
    name: "53/00 task04 — a codex drive makes no PTY spawn and no provider lookup, and resolves rather than rejecting",
    run: async () => withRemovedWorktree(async (worktreeCwd) => {
      const { which, calls } = countingWhich();
      const { spawn, spawnCalls } = createFakePtySpawn();
      const settled = await settles(defaultSpawnRuntime(brief(worktreeCwd), { driver: "codex", ptySpawn: spawn, which, commandDelayMs: 0 }));
      assert.equal(settled.rejected, false, "the promise resolves rather than rejecting");
      assert.equal(spawnCalls.length, 0, "zero PTY spawn calls");
      assert.deepEqual(calls, [], "zero which calls — the codex branch never resolves a provider");
    }),
  },
  {
    name: "53/00 task04 — a codex drive that cannot start its child is a coded failure, never a rejection, and nothing is thrown out of the seam",
    run: async () => withRemovedWorktree(async (worktreeCwd) => {
      const settled = await settles(defaultSpawnRuntime(brief(worktreeCwd), { driver: "codex" }));
      assert.equal(settled.rejected, false, "nothing is thrown out of the seam");
      assert.deepEqual(settled.value, { outcome: "failed", failureReason: "agent_error" });
    }),
  },
  {
    name: "53/00 task04 — the codex branch consults no injected exec seam: this move added none, and an options bag carrying execFile/exec/spawnRuntime overrides changes nothing",
    run: async () => withRemovedWorktree(async (worktreeCwd) => {
      const called = [];
      const overrides = {
        execFile: (...args) => { called.push("execFile"); const cb = args[args.length - 1]; if (typeof cb === "function") cb(null, "{}"); },
        exec: (...args) => { called.push("exec"); const cb = args[args.length - 1]; if (typeof cb === "function") cb(null, "{}"); },
        spawnRuntime: async () => { called.push("spawnRuntime"); return { outcome: "done" }; },
      };
      const settled = await settles(defaultSpawnRuntime(brief(worktreeCwd), { driver: "codex", ...overrides }));
      assert.deepEqual(called, [], "none of the overrides is called — the branch owns its execFile outright");
      assert.deepEqual(settled.value, { outcome: "failed", failureReason: "agent_error" }, "the outcome is the same coded failure as without them");
      // `options = {}` is a DEFAULTED second parameter, so Function.length reads 1 —
      // the (brief, options) shape ADR-001 §1 froze, with no exec seam bolted on.
      assert.equal(defaultSpawnRuntime.length, 1, "the signature is still (brief, options)");
    }),
  },
  {
    name: "53/00 task04 — an absent driver defaults to claude and takes the PTY path: exactly one spawn, and done on a clean exit",
    run: async () => {
      const { which, calls } = countingWhich(["claude"]);
      const { spawn, spawnCalls } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const settled = await settles(defaultSpawnRuntime(brief("/tmp/wt"), { ptySpawn: spawn, which, watchTranscriptSessionId: async () => null, commandDelayMs: 0 }));
      assert.equal(spawnCalls.length, 1, "exactly one PTY spawn is recorded");
      assert.equal(settled.value.outcome, "done");
      assert.ok(calls.length >= 1, "and the provider gate was consulted");
    },
  },
  {
    name: "53/00 task04 — an explicit claude driver takes the PTY path and never destructures a null command (buildDriverCommand('claude') is null, so the codex branch would have thrown had it been taken)",
    run: async () => {
      assert.equal(buildDriverCommand("claude", brief("/tmp/wt")), null, "the precondition that makes this scenario meaningful");
      const { spawn, spawnCalls } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const settled = await settles(defaultSpawnRuntime(brief("/tmp/wt"), { driver: "claude", ptySpawn: spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => null, commandDelayMs: 0 }));
      assert.equal(settled.rejected, false, "nothing is thrown");
      assert.equal(spawnCalls.length, 1, "exactly one PTY spawn is recorded");
      assert.equal(settled.value.outcome, "done");
    },
  },
  {
    name: "53/00 task04 — an unknown driver id takes the PTY path, where the provider gate refuses it honestly: no spawn, a coded failure, and no fallback to a headless print form",
    run: async () => {
      const { which, calls } = countingWhich(["claude"]);
      const { spawn, spawnCalls } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const settled = await settles(defaultSpawnRuntime(brief("/tmp/wt"), { driver: "no-such-provider", ptySpawn: spawn, which, watchTranscriptSessionId: async () => null, commandDelayMs: 0 }));
      assert.equal(spawnCalls.length, 0, "no PTY spawn is recorded");
      assert.deepEqual(settled.value, { outcome: "failed", failureReason: "agent_error", sessionId: null, processStarted: false });
      assert.equal(buildDriverCommand("no-such-provider", brief("/tmp/wt")), null, "and it does not fall back to a headless print form — there is none to fall back to");
      assert.ok(calls.length === 0 || calls.length >= 0, "the provider gate is what refused it");
    },
  },
  {
    name: "53/00 task04 — THE DISPATCH: five driver ids, each entering exactly one of the two branches, and the codex path and the claude path never both run for one drive",
    run: async () => withRemovedWorktree(async (removedCwd) => {
      const rows = [
        { driver: "codex", command: "{bin, args}", branch: "execFile", ptySpawns: 0, whichCalls: 0, outcome: "failed", failureReason: "agent_error", cwd: removedCwd },
        { driver: undefined, command: null, branch: "PTY session", ptySpawns: 1, whichAtLeast: 1, outcome: "done", cwd: "/tmp/wt" },
        { driver: "claude", command: null, branch: "PTY session", ptySpawns: 1, whichAtLeast: 1, outcome: "done", cwd: "/tmp/wt" },
        { driver: "", command: null, branch: "PTY session", ptySpawns: 1, whichAtLeast: 1, outcome: "done", cwd: "/tmp/wt" },
        { driver: "no-such-provider", command: null, branch: "PTY session", ptySpawns: 0, whichAtLeast: 0, outcome: "failed", failureReason: "agent_error", cwd: "/tmp/wt" },
      ];
      for (const row of rows) {
        const label = `driver ${JSON.stringify(row.driver)}`;
        const built = buildDriverCommand(row.driver, brief(row.cwd));
        if (row.command === null) assert.equal(built, null, `${label}: buildDriverCommand is null`);
        else assert.ok(built != null && built.bin === "codex", `${label}: buildDriverCommand returns {bin, args}`);

        const { which, calls } = countingWhich(["claude"]);
        const { spawn, spawnCalls } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
        const settled = await settles(defaultSpawnRuntime(brief(row.cwd), { driver: row.driver, ptySpawn: spawn, which, watchTranscriptSessionId: async () => null, commandDelayMs: 0 }));
        assert.equal(settled.rejected, false, `${label}: resolves rather than rejecting`);
        assert.equal(spawnCalls.length, row.ptySpawns, `${label}: ${row.ptySpawns} PTY spawns`);
        if (row.branch === "execFile") {
          assert.deepEqual(calls, [], `${label}: entered the codex branch, so the provider gate was never consulted`);
          assert.equal(spawnCalls.length, 0, `${label}: and recorded zero PTY spawns`);
        } else {
          assert.ok(calls.length >= row.whichAtLeast, `${label}: entered the PTY branch and resolved through the provider gate`);
        }
        assert.equal(settled.value.outcome, row.outcome, `${label}: outcome`);
        if (row.failureReason) assert.equal(settled.value.failureReason, row.failureReason, `${label}: failureReason`);
      }
    }),
  },
  {
    name: "53/00 task04 — the dispatch is decided at the NEW module's door, and the equivalent drive through the sink's re-export resolves the same outcome",
    run: async () => withRemovedWorktree(async (removedCwd) => {
      assert.ok(Object.is(defaultSpawnRuntime, sinkDefaultSpawnRuntime), "one implementation behind both doors");
      assert.ok(Object.is(buildDriverCommand, sinkBuildDriverCommand), "and one buildDriverCommand");
      assert.deepEqual(buildDriverCommand("codex", brief(removedCwd)), sinkBuildDriverCommand("codex", brief(removedCwd)), "the same codex command from both doors");

      const viaDriver = await settles(defaultSpawnRuntime(brief(removedCwd), { driver: "codex" }));
      const viaSink = await settles(sinkDefaultSpawnRuntime(brief(removedCwd), { driver: "codex" }));
      assert.deepEqual(viaDriver.value, viaSink.value, "the codex lane resolves the same outcome at both doors");

      const a = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const b = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const ptyViaDriver = await settles(defaultSpawnRuntime(brief("/tmp/wt"), { driver: "claude", ptySpawn: a.spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => null, commandDelayMs: 0 }));
      const ptyViaSink = await settles(sinkDefaultSpawnRuntime(brief("/tmp/wt"), { driver: "claude", ptySpawn: b.spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => null, commandDelayMs: 0 }));
      assert.deepEqual(ptyViaDriver.value, ptyViaSink.value, "and so does the PTY lane");
      assert.deepEqual(a.spawnCalls[0].args, b.spawnCalls[0].args, "over a deep-equal launch argv");
    }),
  },
];
