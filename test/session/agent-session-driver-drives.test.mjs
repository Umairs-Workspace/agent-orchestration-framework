// test/session/agent-session-driver-drives.test.mjs — milestone 53 / story 00, task 02
// (02_the-driver-still-drives.feature; ADR-001 §1 and §3, RESEARCH §Q1 and §Q8).
//
// The behavioural core of the move, observed from the NEW module's own door. Every
// observable here is a re-proof of shipped behaviour at a new import path, not a new
// promise: ADR-001 §1 freezes the moved set as verbatim, so a red in this file means
// the move changed something it was not allowed to change.
//
// THE SEAM IS THE ONE THE MESH ALREADY USES. `test/support/mesh-worker-terminal-fixture.mjs`
// occupies exactly the `{ptySpawn, which}` injection points whether the caller is the
// assignment handler or a local loop, because `driveInteractiveClaudeSession` is itself
// mesh-blind. `createFakeWhich(presentBins)` mirrors terminal-providers.mjs's own
// `which(bin, env) => path|null` contract; `createFakePtySpawn({onWrite})` records every
// spawn call and returns a full IPty double whose `onWrite` fires SYNCHRONOUSLY inside
// `term.write(...)`, so a test scripts the agent's reply to the exact line the driver
// typed with no race — the driver registers its onData/onExit handlers before it ever
// writes. Only the leaf node-pty spawn and the PATH lookup are faked;
// `resolveInteractiveDriverLaunch` and terminal-providers.mjs's real `resolveProvider`
// run for real, which is what keeps this from becoming a hand-built stub of what the
// provider ought to emit.
//
// THE DRIVER NEVER THROWS, and that is asserted in both directions: the coded outcome
// is observed AND the call is observed not to reject. THE SETTLE IS EXACTLY ONCE — the
// driver funnels every outcome through one `finish` and the fixture's `dispose()`
// genuinely splices handlers out, so "a chunk delivered after the settle changes
// nothing" is a real assertion here rather than a hope.
//
// ONE SEAM IS NOT COVERED HERE and is named rather than implied: the transcript watches
// themselves. Every scenario below INJECTS `watchTranscriptSessionId` /
// `watchTranscriptCompletion` as scripted async functions, so no scenario touches a
// real transcript. The real watches are task 03's subject, against a real temp tree.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  driveInteractiveClaudeSession,
  resolveInteractiveDriverLaunch,
  WORKER_SESSION_INSTRUCTION,
  NEEDS_INPUT_SENTINEL,
} from "../../src/agent-session-driver.mjs";
import {
  buildOtelResourceAttributes,
  OTEL_RESOURCE_ATTRIBUTES_ENV_KEY,
  OTEL_TELEMETRY_ENV_KEY,
} from "../../src/otel-attribution.mjs";
import { createFakeWhich, createFakePtySpawn } from "../support/mesh-worker-terminal-fixture.mjs";

const BRIEF = { itemRef: "53/00", worktreeCwd: "/tmp/wt", task: "the session driver gets a home", command: "/aof:verify 53/00" };

// 2026-09-24 — the TUI's readiness marker (CSI ?2004h, bracketed paste on), spelled from char
// codes as the paste frame is below: the driver keeps it private (FF-5302 freezes its exports).
const TUI_READY_MARKER = `${String.fromCharCode(27)}[?2004h`;

// A PTY double the TEST drives: `emit(data)` plays the TUI's output at a moment the test
// chooses (the shared scripted PTY only answers writes), and `kill()` confirms exit.
function emittingPty() {
  const data = [];
  const exits = [];
  const pty = {
    pid: 4343,
    writes: [],
    killed: false,
    onData(cb) { data.push(cb); return { dispose() { data.splice(data.indexOf(cb), 1); } }; },
    onExit(cb) { exits.push(cb); return { dispose() { exits.splice(exits.indexOf(cb), 1); } }; },
    write(chunk) { pty.writes.push(chunk); },
    resize() {},
    kill() { pty.killed = true; exits.slice().forEach((cb) => cb({ exitCode: 0 })); },
    emit(chunk) { data.slice().forEach((cb) => cb(chunk)); },
    get subscribed() { return data.length > 0; },
    exit(code = 0) { exits.slice().forEach((cb) => cb({ exitCode: code })); },
  };
  return { pty, spawn: async () => pty };
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitUntil = async (predicate, ms = 2000) => {
  const until = Date.now() + ms;
  while (!predicate()) {
    if (Date.now() > until) throw new Error("waitUntil: condition never held");
    await sleep(5);
  }
};

// The base options bag: the two transcript watches are always injected (see the header)
// and `commandDelayMs: 0` keeps every scenario on the next tick rather than a wall-wait.
function baseOptions(extra = {}) {
  return { watchTranscriptSessionId: async () => null, commandDelayMs: 0, ...extra };
}

// settles(promise) — resolves `{ rejected, value }`. "The driver never throws" is only
// evidence when the not-rejecting half is measured too, so every lane that asserts a
// coded outcome goes through here.
async function settles(promise) {
  try {
    return { rejected: false, value: await promise };
  } catch (error) {
    return { rejected: true, error };
  }
}

async function drive(options = {}, brief = BRIEF) {
  const which = options.which ?? createFakeWhich(["claude"]);
  const settled = await settles(driveInteractiveClaudeSession(brief, baseOptions({ ...options, which })));
  return settled;
}

// THE RESUME SHAPE'S ONE ADAPTER. The fixture's scripted PTY emits only from inside
// `term.write(...)` — deliberately, so a test can script the agent's reply to the exact
// line the driver typed with no race. A `command: null` brief writes NOTHING, so there
// is no hook to hang a clean exit on. Rather than write a second PTY double (a third
// implementation of the thing this milestone exists to stop duplicating), this wraps the
// SAME fixture and captures the `onExit` callback the driver registers, so the exit can
// be delivered with zero writes on the record.
function spawnCapturingExit(base) {
  const captured = {};
  const spawn = async (bin, args, options) => {
    const pty = await base.spawn(bin, args, options);
    const register = pty.onExit.bind(pty);
    pty.onExit = (cb) => {
      captured.emitExit = (exitCode = 0) => cb({ exitCode });
      return register(cb);
    };
    return pty;
  };
  return { spawn, captured };
}

// 70/06 — the directive transport. The body goes in as ONE bracketed paste (atomic
// against ConPTY chunking, which otherwise tore a multi-line brief into separate user
// turns) and the Enter that submits it is a SECOND write (an Enter inside the paste is
// swallowed by the end-of-paste handling and never submits at all). These are TERMINAL
// protocol bytes, spelled here from char codes rather than imported: the driver's export
// set is frozen at seventeen by an enforced gate, and a protocol constant is not an API.
const ESC = String.fromCharCode(27);
const SUBMIT_KEY = String.fromCharCode(13);
const pasted = (text) => [`${ESC}[200~${text}${ESC}[201~`, SUBMIT_KEY];

export const agentSessionDriverDrivesTests = [
  {
    name: "53/00 task02 — an unresolvable provider binary is a coded failure with no spawn attempt, and the call does not reject",
    run: async () => {
      const { spawn, spawnCalls } = createFakePtySpawn();
      const settled = await drive({ which: createFakeWhich([]), ptySpawn: spawn });
      assert.equal(settled.rejected, false, "the call does not reject");
      assert.deepEqual(settled.value, { outcome: "failed", failureReason: "agent_error", sessionId: null, processStarted: false });
      assert.equal(spawnCalls.length, 0, "zero spawn calls are recorded");
    },
  },
  {
    name: "53/00 task02 — a spawn that throws is a coded failure, never a rejection",
    run: async () => {
      const settled = await drive({
        ptySpawn: async () => { throw new Error("node-pty exploded"); },
      });
      assert.equal(settled.rejected, false, "the call does not reject");
      assert.deepEqual(settled.value, { outcome: "failed", failureReason: "agent_error", sessionId: null, processStarted: false });
    },
  },
  {
    name: "53/00 task02 — one long-lived session per run: the driver spawns exactly once and is never re-spawned to deliver a second command line",
    run: async () => {
      const { spawn, spawnCalls } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const settled = await drive({ ptySpawn: spawn });
      assert.equal(spawnCalls.length, 1, "exactly one spawn call");
      assert.equal(settled.value.outcome, "done");
    },
  },
  {
    name: "53/00 task02 — the launch argv is the interactive form with one --append-system-prompt, and carries no headless-print token (compared element-by-element)",
    run: async () => {
      const { spawn, spawnCalls } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      await drive({ ptySpawn: spawn });
      const args = spawnCalls[0].args;
      // The provider's own buildArgs() for claude is empty, so the whole argv is the
      // pairs the driver appends (the stable-prefix flag of 70/01 plus the two
      // session-instruction pairs) — asserted as a deep equality rather than by fishing
      // for tokens.
      assert.deepEqual(args, ["--permission-mode", "auto", "--exclude-dynamic-system-prompt-sections", "--append-system-prompt", WORKER_SESSION_INSTRUCTION]);
      assert.equal(args.filter((a) => a === "--append-system-prompt").length, 1, "exactly one --append-system-prompt (two flags would override each other in claude's CLI)");
      // ELEMENT-BY-ELEMENT, never a substring of the stringified argv: the token
      // "--append-system-prompt" itself contains the characters "-p"
      // (...syste[m-p]rompt), so a substring scan would false-positive on the very
      // token this launch intentionally carries.
      for (const forbidden of ["-p", "--print", "--output-format"]) {
        assert.equal(args.includes(forbidden), false, `no ${forbidden} as a whole argv element`);
      }
      assert.equal(spawnCalls[0].bin, "/fake/bin/claude", "the bin is the path resolveProvider resolved");
    },
  },
  {
    name: "53/00 task02 — the directive is typed into PTY stdin as exactly one bracketed-paste write plus its Enter, and appears nowhere in the spawn argv",
    run: async () => {
      const { spawn, spawnCalls, ptys } = createFakePtySpawn({ onWrite: ({ chunk, emitExit }) => { if (chunk === SUBMIT_KEY) emitExit(0); } });
      await drive({ ptySpawn: spawn });
      assert.deepEqual(ptys[0].writes, pasted(BRIEF.command), "the whole command in one pasted write, submitted by a separate Enter (never Ctrl+J)");
      assert.equal(spawnCalls[0].args.includes(BRIEF.command), false, "the command is not an argv element");
      assert.equal(spawnCalls[0].args.join(" ").includes(BRIEF.command), false, "and it is nowhere in the argv at all");
    },
  },
  {
    name: "53/00 task02 — a resume brief with command: null types nothing and still settles: zero writes, one spawn, done on a clean exit",
    run: async () => {
      const base = createFakePtySpawn();
      const { spawn, captured } = spawnCapturingExit(base);
      const pending = driveInteractiveClaudeSession(
        { ...BRIEF, command: null },
        baseOptions({ ptySpawn: spawn, which: createFakeWhich(["claude"]) }),
      );
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(base.ptys.length, 1, "the session was spawned");
      assert.deepEqual(base.ptys[0].writes, [], "zero writes for a null command — the re-attach shape");
      captured.emitExit(0);
      const settled = await settles(pending);
      assert.equal(settled.rejected, false);
      assert.deepEqual(settled.value, { outcome: "done", sessionId: null }, "the driver still resolves an outcome");
      assert.deepEqual(base.ptys[0].writes, [], "and it typed nothing to get there");
    },
  },
  {
    name: "53/00 task02 — --resume is the one additive launch variation: the ordinary argv with --resume <id> appended, everything else identical",
    run: async () => {
      const which = createFakeWhich(["claude"]);
      const env = { PATH: "/fake/bin", SOME_KEY: "kept" };
      const plain = resolveInteractiveDriverLaunch("claude", { which, env, terminalSessionId: "term-1" });
      const resumed = resolveInteractiveDriverLaunch("claude", { which, env, terminalSessionId: "term-1", resumeSessionId: "sess-x" });
      assert.deepEqual(resumed.args, [...plain.args, "--resume", "sess-x"], "the ordinary argv, then --resume and the id, in that order");
      assert.equal(resumed.bin, plain.bin, "the same resolved binary");
      assert.deepEqual(resumed.env, plain.env, "the resolved env is otherwise identical");
      assert.equal(resumed.providerId, plain.providerId);
      assert.deepEqual(plain.args.slice(0, 2), ["--permission-mode", "auto"], "the permission mode is unchanged");
      assert.equal(plain.args[plain.args.length - 1], WORKER_SESSION_INSTRUCTION, "and so is the appended system prompt");
    },
  },
  {
    name: "53/00 task02 — the IDE-attachment env vars never reach a driven session, and every other key rides through untouched",
    run: async () => {
      const env = {
        PATH: "/fake/bin",
        CLAUDE_CODE_SSE_PORT: "51234",
        TERM_PROGRAM: "vscode",
        TERM_PROGRAM_VERSION: "1.99.0",
        VSCODE_GIT_ASKPASS_NODE: "/x/node",
        HOME: "/home/umami",
        AOF_KEEP_ME: "yes",
      };
      const launch = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env, terminalSessionId: "term-1" });
      for (const key of ["CLAUDE_CODE_SSE_PORT", "TERM_PROGRAM", "TERM_PROGRAM_VERSION", "VSCODE_GIT_ASKPASS_NODE"]) {
        assert.equal(key in launch.env, false, `${key} is scrubbed from the worker launch env`);
      }
      assert.equal(launch.env.PATH, "/fake/bin");
      assert.equal(launch.env.HOME, "/home/umami");
      assert.equal(launch.env.AOF_KEEP_ME, "yes", "every other key rides through untouched");
    },
  },
  {
    name: "53/00 task02 — the PTY's cwd is the brief's worktree",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-drives-"));
      try {
        const { spawn, spawnCalls } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
        await drive({ ptySpawn: spawn }, { ...BRIEF, worktreeCwd: root });
        assert.equal(spawnCalls[0].options.cwd, root, "the recorded spawn options carry the brief's worktree as cwd");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "53/00 task02 — the PTY exit code decides the undeclared outcome: 0 is done, 1 and 137 are failed/agent_error",
    run: async () => {
      for (const [code, expected] of [[0, { outcome: "done", sessionId: null }], [1, { outcome: "failed", failureReason: "agent_error", sessionId: null }], [137, { outcome: "failed", failureReason: "agent_error", sessionId: null }]]) {
        const { spawn, spawnCalls, ptys } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(code) });
        const settled = await drive({ ptySpawn: spawn });
        assert.equal(settled.rejected, false, `exit ${code} does not reject`);
        assert.deepEqual(settled.value, expected, `exit ${code}`);
        assert.equal(spawnCalls.length, 1, `exit ${code}: one spawn`);
        assert.equal(ptys[0].writes.length, 1, `exit ${code}: one write`);
      }
    },
  },
  {
    name: "53/00 task02 — the sentinel's exact-line boundary: eight accumulated-output shapes, and only the whole-line ones resolve needs-input",
    run: async () => {
      // Every row is one accumulated PTY output buffer, emitted as chunks, and whether
      // the driver reads the sentinel from it. The near-token and the narrating
      // sentence are the review defect this rule exists to close: an unanchored
      // `includes` killed a healthy live PTY and mis-reported a `done` run.
      const rows = [
        { label: '"NEEDS_INPUT\\n"', chunks: ["NEEDS_INPUT\n"], needsInput: true },
        { label: '"...\\nNEEDS_INPUT\\n"', chunks: ["...\nNEEDS_INPUT\n"], needsInput: true },
        { label: '"  NEEDS_INPUT  \\n" (trimmed line)', chunks: ["  NEEDS_INPUT  \n"], needsInput: true },
        { label: '"NEEDS_I" then "NPUT\\n" (split across two chunks)', chunks: ["NEEDS_I", "NPUT\n"], needsInput: true },
        { label: '"NEEDS_INPUTS\\n" (longer token)', chunks: ["NEEDS_INPUTS\n"], needsInput: false },
        { label: '"the agent says NEEDS_INPUT to the user\\n"', chunks: ["the agent says NEEDS_INPUT to the user\n"], needsInput: false },
        { label: '"NEEDS_INPUT" with no terminating newline', chunks: ["NEEDS_INPUT"], needsInput: false },
        { label: "the empty string", chunks: [""], needsInput: false },
      ];
      for (const row of rows) {
        const { spawn } = createFakePtySpawn({
          onWrite: ({ emitData, emitExit }) => {
            for (const chunk of row.chunks) emitData(chunk);
            // A clean exit AFTER the output: a row that does not fire the sentinel must
            // still settle `done`, which is what makes the negative rows non-vacuous.
            emitExit(0);
          },
        });
        const settled = await drive({ ptySpawn: spawn });
        assert.equal(settled.rejected, false, `${row.label}: does not reject`);
        assert.equal(settled.value.outcome, row.needsInput ? "needs-input" : "done", row.label);
        if (row.needsInput) assert.notEqual(settled.value.outcome, "done", `${row.label}: never re-mapped to done`);
      }
    },
  },
  {
    name: "53/00 task02 — a sentinel split across two chunks is detected exactly once, when the newline completes the line, and a further chunk after the settle changes nothing",
    run: async () => {
      let settleCount = 0;
      const { spawn, ptys } = createFakePtySpawn({
        onWrite: ({ emitData }) => {
          emitData("NEEDS_I");
          emitData("NPUT\n");
        },
      });
      const settled = await settles(
        driveInteractiveClaudeSession(BRIEF, baseOptions({ ptySpawn: spawn, which: createFakeWhich(["claude"]) })).then((result) => {
          settleCount += 1;
          return result;
        }),
      );
      assert.equal(settled.value.outcome, "needs-input");
      assert.equal(settleCount, 1, "resolved exactly once");
      assert.equal(ptys[0].killed, true, "the PTY is killed on the sentinel branch — a human resumes with a FRESH claude --resume");
    },
  },
  {
    name: "53/00 task02 — the settle is idempotent: a further data chunk and a further exit after it change nothing, and the disposed handlers are not invoked",
    run: async () => {
      const { spawn, ptys } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const settled = await drive({ ptySpawn: spawn });
      assert.equal(settled.value.outcome, "done");
      // The fixture's dispose() genuinely splices handlers out of their arrays, so this
      // is a real assertion rather than a hope: after the settle there is nothing left
      // to invoke.
      const pty = ptys[0];
      pty.write("more output\n");
      pty.write(`${NEEDS_INPUT_SENTINEL}\n`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const after = await settles(Promise.resolve(settled.value));
      assert.deepEqual(after.value, { outcome: "done", sessionId: null }, "the resolved outcome is unchanged");
    },
  },
  {
    name: "53/00 task02 — a dead PTY process settles failed/agent_died through the SAME single settle point, exactly once (injected livenessIntervalMs, so no scenario wall-waits)",
    run: async () => {
      // A pid that is certainly not alive: process.kill(pid, 0) throws, which is the
      // probe's own dead-pid signal. The interval is injected so the production
      // 15-second window is never waited out.
      const deadPid = 0x7ffffffe;
      const { spawn, ptys } = createFakePtySpawn();
      const spawnWithDeadPid = async (...args) => {
        const pty = await spawn(...args);
        pty.pid = deadPid;
        return pty;
      };
      const settled = await settles(
        driveInteractiveClaudeSession(
          { ...BRIEF, command: null },
          baseOptions({ ptySpawn: spawnWithDeadPid, which: createFakeWhich(["claude"]), livenessIntervalMs: 5 }),
        ),
      );
      assert.equal(settled.rejected, false);
      assert.deepEqual(settled.value, { outcome: "failed", failureReason: "agent_died", sessionId: null });
      assert.equal(ptys.length, 1, "one session");
    },
  },
  {
    name: "53/00 task02 — a failing trustWorktree degrades rather than escaping: the session is still spawned and the outcome is decided by the session",
    run: async () => {
      const { spawn, spawnCalls } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const settled = await drive({
        ptySpawn: spawn,
        trustWorktree: async () => { throw new Error("~/.claude.json is not writable"); },
      });
      assert.equal(settled.rejected, false, "the call does not reject");
      assert.equal(spawnCalls.length, 1, "the session is still spawned");
      assert.equal(settled.value.outcome, "done", "the outcome is decided by the session, not by the trust failure");
    },
  },
  {
    name: "53/00 task02 — every caller-facing hook is optional: a drive with none reaches the same three outcomes as the equivalent drive with all of them supplied",
    run: async () => {
      const scripts = {
        done: ({ emitExit }) => emitExit(0),
        failed: ({ emitExit }) => emitExit(1),
        "needs-input": ({ emitData }) => emitData(`${NEEDS_INPUT_SENTINEL}\n`),
      };
      for (const [label, onWrite] of Object.entries(scripts)) {
        const bare = createFakePtySpawn({ onWrite });
        const bareSettled = await settles(
          driveInteractiveClaudeSession(BRIEF, { ptySpawn: bare.spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => null, commandDelayMs: 0 }),
        );
        const hooked = createFakePtySpawn({ onWrite });
        const hookedSettled = await settles(
          driveInteractiveClaudeSession(BRIEF, baseOptions({
            ptySpawn: hooked.spawn,
            which: createFakeWhich(["claude"]),
            onPtyLive: () => {},
            onSessionIdCaptured: () => {},
            onSessionEnd: () => {},
            onOutputChunk: () => {},
            onNeedsInputPending: () => {},
          })),
        );
        assert.deepEqual(bareSettled.value, hookedSettled.value, `${label}: the same outcome with and without the hooks`);
        assert.equal(bareSettled.value.outcome, label, `${label}: and it is the expected one`);
      }
    },
  },
  {
    name: "53/00 task02 — onSessionIdCaptured fires at most once mid-run and onSessionEnd fires once at the settle, for all three outcomes; a hook that throws does not disturb the outcome",
    run: async () => {
      const scripts = {
        done: ({ emitExit }) => emitExit(0),
        failed: ({ emitExit }) => emitExit(1),
        "needs-input": ({ emitData }) => emitData(`${NEEDS_INPUT_SENTINEL}\n`),
      };
      for (const [label, onWrite] of Object.entries(scripts)) {
        const captured = [];
        const ended = [];
        const { spawn } = createFakePtySpawn({ onWrite });
        const settled = await settles(
          driveInteractiveClaudeSession(BRIEF, baseOptions({
            ptySpawn: spawn,
            which: createFakeWhich(["claude"]),
            watchTranscriptSessionId: async () => "sess-x",
            onSessionIdCaptured: (id) => { captured.push(id); throw new Error("a report fault is never the run's problem"); },
            onSessionEnd: (id) => { ended.push(id); throw new Error("nor is an end-report fault"); },
          })),
        );
        assert.equal(settled.rejected, false, `${label}: a throwing hook does not escape`);
        assert.deepEqual(captured, ["sess-x"], `${label}: onSessionIdCaptured fired exactly once, with the watched id`);
        assert.deepEqual(ended, ["sess-x"], `${label}: onSessionEnd fired exactly once, after the id resolved`);
        assert.equal(settled.value.outcome, label, `${label}: the outcome is undisturbed`);
        assert.equal(settled.value.sessionId, "sess-x", `${label}: and the id rides the return value`);
      }
    },
  },
  {
    name: "53/00 task02 — onPtyLive hands the caller a kill and a write into THIS pty, and the kill routes through the same term.kill() every settle path uses",
    run: async () => {
      let kill = null;
      let write = null;
      const { spawn, ptys } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      await settles(
        driveInteractiveClaudeSession(BRIEF, baseOptions({
          ptySpawn: spawn,
          which: createFakeWhich(["claude"]),
          onPtyLive: (k, w) => { kill = k; write = w; },
        })),
      );
      assert.equal(typeof kill, "function", "the caller receives a kill function");
      assert.equal(typeof write, "function", "and a write function");
      const report = write("hello");
      assert.deepEqual(report, { pid: ptys[0].pid }, "the write reports the target pid — the correlation handle for which pty was fed");
      assert.equal(ptys[0].writes.includes("hello"), true, "the bytes reached THIS pty");
      kill();
      assert.equal(ptys[0].killed, true, "the kill routes through the same term.kill() the settle paths use");
    },
  },
  {
    name: "53/00 task02 — the resolved session id rides the driver's own return value for every outcome, and a watch resolving null yields sessionId: null rather than a crash",
    run: async () => {
      const scripts = {
        done: ({ emitExit }) => emitExit(0),
        failed: ({ emitExit }) => emitExit(1),
        "needs-input": ({ emitData }) => emitData(`${NEEDS_INPUT_SENTINEL}\n`),
      };
      for (const [label, onWrite] of Object.entries(scripts)) {
        const withId = createFakePtySpawn({ onWrite });
        const a = await settles(driveInteractiveClaudeSession(BRIEF, baseOptions({ ptySpawn: withId.spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => "sess-x" })));
        assert.equal(a.value.sessionId, "sess-x", `${label}: carries the watched id`);
        assert.equal(a.value.outcome, label);

        const withNull = createFakePtySpawn({ onWrite });
        const b = await settles(driveInteractiveClaudeSession(BRIEF, baseOptions({ ptySpawn: withNull.spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => null })));
        assert.equal(b.rejected, false, `${label}: a null-resolving watch never crashes the drive`);
        assert.equal(b.value.sessionId, null, `${label}: and yields sessionId: null`);
      }
    },
  },
  {
    name: "53/00 task02 — the command write is delayed by commandDelayMs, defaulting to zero (the next tick, so no suite wall-waits) — the seam production wires INTERACTIVE_COMMAND_READY_DELAY_MS into",
    run: async () => {
      // Default: no commandDelayMs in the bag at all.
      const immediate = createFakePtySpawn({ onWrite: ({ chunk, emitExit }) => { if (chunk === SUBMIT_KEY) emitExit(0); } });
      const settled = await settles(
        driveInteractiveClaudeSession(BRIEF, { ptySpawn: immediate.spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => null }),
      );
      assert.equal(settled.value.outcome, "done", "the command is written on the next tick with no delay supplied");
      assert.deepEqual(immediate.ptys[0].writes, pasted(BRIEF.command));

      // A supplied delay is honoured: the write has not happened before it elapses.
      const delayed = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const pending = driveInteractiveClaudeSession(BRIEF, { ptySpawn: delayed.spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => null, commandDelayMs: 60 });
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.deepEqual(delayed.ptys[0].writes, [], "nothing typed yet — the delay is real");
      const result = await pending;
      assert.equal(result.outcome, "done");
      // Settles on the BODY write here, so only the pasted body has landed — the derived
      // submit settle (900ms for any real-TUI caller) has not elapsed and must not be
      // wall-waited by the suite.
      assert.deepEqual(delayed.ptys[0].writes, [pasted(BRIEF.command)[0]], "and the command lands once the delay elapses");
    },
  },
  {
    name: "53/00 task02 — the launch table: six (driver, which, resumeSessionId) rows, and null is what the caller turns into a coded failed, never a throw",
    run: async () => {
      const present = createFakeWhich(["claude"]);
      const absent = createFakeWhich([]);
      const env = { PATH: "/fake/bin" };
      const interactive = ["--permission-mode", "auto", "--exclude-dynamic-system-prompt-sections", "--append-system-prompt", WORKER_SESSION_INSTRUCTION];
      const rows = [
        { label: "driver undefined, claude present", driver: undefined, which: present, expect: interactive },
        { label: 'driver "claude", claude present', driver: "claude", which: present, expect: interactive },
        { label: 'driver "claude" with resumeSessionId', driver: "claude", which: present, resumeSessionId: "sess-x", expect: [...interactive, "--resume", "sess-x"] },
        { label: 'driver "claude", nothing on PATH', driver: "claude", which: absent, expect: null },
        { label: 'driver "" is treated as claude', driver: "", which: present, expect: interactive },
        { label: 'driver "no-such" is an unknown provider id', driver: "no-such", which: present, expect: null },
      ];
      for (const row of rows) {
        const launch = resolveInteractiveDriverLaunch(row.driver, { which: row.which, env, terminalSessionId: "term-1", resumeSessionId: row.resumeSessionId });
        if (row.expect === null) {
          assert.equal(launch, null, `${row.label}: resolves null (never a throw)`);
          continue;
        }
        assert.notEqual(launch, null, `${row.label}: resolves a launch`);
        assert.deepEqual(launch.args, row.expect, row.label);
        assert.equal(launch.providerId, "claude", `${row.label}: the provider id is claude`);
      }
    },
  },
  // ── milestone 68 / story 01 (attribution-at-spawn, ADR-005 §2) ──
  // The OTel spawn-env driver-seam scenarios for tasks/01_otel-attributes-at-spawn
  // live HERE because this file already imports the driver — keeping the milestone-53
  // agent-session-driver namer allowlist untouched. aof builds NO receiver (FF-6808);
  // the surface is env-set-at-spawn only.
  {
    name: "68/01 task01 a spawned session carries the attributes that identify its work — run, item and machine — and telemetry emission is enabled",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", {
        which: createFakeWhich(["claude"]),
        env: { PATH: "/fake/bin", HOME: "/home/u" },
        terminalSessionId: "term-1",
        attribution: { runId: "run-1", milestoneId: "68", storyId: "68/01", machineId: "mac-1", worktreeId: "wt-1" },
      });
      assert.ok(launch, "the launch resolves");
      const attrs = launch.env[OTEL_RESOURCE_ATTRIBUTES_ENV_KEY];
      assert.ok(typeof attrs === "string", "the environment carries OTEL_RESOURCE_ATTRIBUTES");
      assert.match(attrs, /run\.id=run-1/, "the attributes identify the run");
      assert.match(attrs, /milestone\.id=68/, "the attributes identify the item's milestone");
      assert.match(attrs, /story\.id=68\/01/, "the attributes identify the item");
      assert.match(attrs, /machine\.id=mac-1/, "the attributes identify the machine");
      assert.equal(launch.env[OTEL_TELEMETRY_ENV_KEY], "1", "telemetry emission is enabled in that environment");
    },
  },
  {
    name: "68/01 task01 the attributes survive the IDE-attachment scrub — IDE vars still removed exactly as today, resource attributes present",
    run: async () => {
      const env = {
        PATH: "/fake/bin",
        HOME: "/home/u",
        CLAUDE_CODE_SSE_PORT: "51234",
        TERM_PROGRAM: "vscode",
        TERM_PROGRAM_VERSION: "1.99.0",
        VSCODE_GIT_ASKPASS_NODE: "/x/node",
      };
      const launch = resolveInteractiveDriverLaunch("claude", {
        which: createFakeWhich(["claude"]),
        env,
        terminalSessionId: "term-1",
        attribution: { runId: "run-2", milestoneId: "68", machineId: "mac-1" },
      });
      for (const key of ["CLAUDE_CODE_SSE_PORT", "TERM_PROGRAM", "TERM_PROGRAM_VERSION", "VSCODE_GIT_ASKPASS_NODE"]) {
        assert.equal(key in launch.env, false, `${key} is still scrubbed exactly as today`);
      }
      assert.ok(launch.env[OTEL_RESOURCE_ATTRIBUTES_ENV_KEY].includes("run.id=run-2"), "the resource attributes are present in the spawned environment");
    },
  },
  {
    name: "68/01 task01 outline what each attribute identifies — run, story (when a story), milestone, phase (the loop declared), machine, worktree",
    run: async () => {
      const attrs = buildOtelResourceAttributes({
        runId: "run-9",
        storyId: "68/01",
        milestoneId: "68",
        phase: "build",
        machineId: "mac-9",
        worktreeId: "wt-9",
      });
      for (const expected of [
        "run.id=run-9",
        "story.id=68/01",
        "milestone.id=68",
        "phase=build",
        "machine.id=mac-9",
        "worktree.id=wt-9",
      ]) {
        assert.ok(attrs.includes(expected), `the attribute set identifies ${expected}`);
      }
    },
  },
  {
    name: "68/01 task01 a run with no declared phase reports no phase — no phase attribute is fabricated, the remaining attributes are present unchanged",
    run: async () => {
      const attrs = buildOtelResourceAttributes({
        runId: "run-10",
        milestoneId: "68",
        machineId: "mac-10",
        worktreeId: "wt-10",
      });
      assert.ok(!/(^|,)phase=/.test(attrs), "no phase attribute is fabricated for a run with no declared phase");
      assert.ok(attrs.includes("run.id=run-10"), "the remaining attributes are present");
      assert.ok(attrs.includes("milestone.id=68"), "the remaining attributes are present unchanged");
      assert.ok(attrs.includes("machine.id=mac-10"), "the machine attribute is present");
      assert.ok(attrs.includes("worktree.id=wt-10"), "the worktree attribute is present");
    },
  },
  // ── milestone 70 / story 01 (cache-stable-launch, ADR-004/005) ──
  // The launch-argv/env seam scenarios for tasks 00_stable-prefix-flag.feature,
  // 01_model-and-effort-chosen.feature (the argv half) and 02_one-hour-ttl-held.feature.
  // They live HERE because this file already imports the driver — the milestone-53
  // census allowlist is closed, and a new file may not name the driver seam.
  {
    name: "70/01 task00 the spawn asks for a shareable prefix — the argv carries the flag that relocates the per-machine sections, and the worker system prompt is still appended rather than replaced",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin" }, terminalSessionId: "term-1" });
      assert.ok(launch, "the launch resolves");
      assert.ok(launch.args.includes("--exclude-dynamic-system-prompt-sections"), "the argv carries the stable-prefix flag");
      assert.ok(launch.args.includes("--append-system-prompt"), "the worker system prompt is still appended");
      assert.ok(!launch.args.includes("--system-prompt"), "the worker system prompt is never replaced");
    },
  },
  {
    name: "70/01 task00 the worker instruction still reaches the session — the worker session instruction is present as the appended system prompt, and the sentinel behaviour it produces is unchanged",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin" }, terminalSessionId: "term-1" });
      const appendIdx = launch.args.indexOf("--append-system-prompt");
      assert.ok(appendIdx !== -1, "the append flag is present");
      assert.equal(launch.args[appendIdx + 1], WORKER_SESSION_INSTRUCTION, "the appended system prompt is the worker session instruction");
      assert.ok(launch.args[appendIdx + 1].includes(NEEDS_INPUT_SENTINEL), "the NEEDS_INPUT producer sentinel still reaches the session");
      assert.ok(launch.args[appendIdx + 1].includes("AOF_DIRECTIVE_COMPLETE"), "the DIRECTIVE_COMPLETE producer sentinel still reaches the session");
    },
  },
  {
    name: "70/01 task00 two phases with identical configuration resolve an identical prefix — the argv (what determines the cached prefix) is byte-identical across launches",
    run: async () => {
      const make = () => resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin" }, terminalSessionId: "term-1", session: { model: "claude-opus-4-1", effort: "high" } });
      assert.deepEqual(make().args, make().args, "two launches with identical configuration carry byte-identical argv — the parts that determine the cached prefix are identical");
    },
  },
  {
    name: "70/01 task00 the permission mode and the IDE scrub are untouched — permission mode stays auto and the env is still scrubbed of the IDE-attachment vector",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", {
        which: createFakeWhich(["claude"]),
        env: { PATH: "/fake/bin", HOME: "/home/u", CLAUDE_CODE_SSE_PORT: "5", TERM_PROGRAM: "vscode", VSCODE_X: "1" },
        terminalSessionId: "term-1",
      });
      assert.deepEqual(launch.args.slice(0, 2), ["--permission-mode", "auto"], "the permission mode is unchanged");
      for (const key of ["CLAUDE_CODE_SSE_PORT", "TERM_PROGRAM", "VSCODE_X"]) {
        assert.equal(key in launch.env, false, `${key} is still scrubbed`);
      }
    },
  },
  {
    name: "70/01 task00 outline the argv contract — stable-prefix flag and appended system prompt present; replacement system prompt, one-shot print flag and output-format flag absent",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin" }, terminalSessionId: "term-1" });
      assert.ok(launch.args.includes("--exclude-dynamic-system-prompt-sections"), "the stable-prefix flag is present");
      assert.ok(launch.args.includes("--append-system-prompt"), "an appended system prompt is present");
      assert.equal(launch.args.includes("--system-prompt"), false, "a replacement system prompt is absent");
      assert.equal(launch.args.includes("--print"), false, "a one-shot print flag is absent");
      assert.equal(launch.args.includes("--output-format"), false, "a non-interactive output-format flag is absent");
    },
  },
  {
    name: "70/01 task00 outline the flag's enabling condition — with an appended system prompt (and no replacement) the configuration is admitted, the flag applies",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin" }, terminalSessionId: "term-1" });
      assert.ok(launch.args.includes("--append-system-prompt"), "an appended system prompt is present");
      assert.ok(!launch.args.includes("--system-prompt"), "no replacement system prompt — the stable-prefix flag applies, never silently inert");
    },
  },
  {
    name: "70/01 task01 the spawn states which model it wants — a configured session model is passed explicitly as --model, not left to the session default",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin" }, terminalSessionId: "term-1", session: { model: "claude-opus-4-1", effort: "high" } });
      const i = launch.args.indexOf("--model");
      assert.ok(i !== -1, "the argv names a --model");
      assert.equal(launch.args[i + 1], "claude-opus-4-1", "the argv names the configured model explicitly — a decision, never the session default");
    },
  },
  {
    name: "70/01 task01 the spawn states which effort it wants — a configured session effort is passed explicitly as --effort, not left to the session default",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin" }, terminalSessionId: "term-1", session: { model: "claude-opus-4-1", effort: "high" } });
      const i = launch.args.indexOf("--effort");
      assert.ok(i !== -1, "the argv names an --effort");
      assert.equal(launch.args[i + 1], "high", "the argv names the configured effort explicitly — a decision, never the session default");
    },
  },
  {
    name: "70/01 task01 an unconfigured phase launches exactly as it does today — no session config → neither --model nor --effort is passed (byte-identical ordinary argv)",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin" }, terminalSessionId: "term-1" });
      assert.equal(launch.args.includes("--model"), false, "no --model flag is passed");
      assert.equal(launch.args.includes("--effort"), false, "no --effort flag is passed");
      assert.deepEqual(
        launch.args,
        ["--permission-mode", "auto", "--exclude-dynamic-system-prompt-sections", "--append-system-prompt", launch.args[launch.args.indexOf("--append-system-prompt") + 1]],
      );
      assert.equal(launch.args.length, 5, "exactly the five ordinary argv elements — nothing added by an absent session");
    },
  },
  {
    name: "70/01 task01 outline the argv carries <passed> — a model routed for a phase is passed as that phase's --model; an effort-only route passes --effort only",
    run: async () => {
      const withModel = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin" }, terminalSessionId: "t", session: { model: "claude-opus-4-1" } });
      assert.equal(withModel.args[withModel.args.indexOf("--model") + 1], "claude-opus-4-1", "the argv carries that phase's model");
      assert.equal(withModel.args.includes("--effort"), false, "no --effort when none routed");
      const effortOnly = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin" }, terminalSessionId: "t", session: { effort: "high" } });
      assert.equal(effortOnly.args[effortOnly.args.indexOf("--effort") + 1], "high", "the argv carries the effort only");
      assert.equal(effortOnly.args.includes("--model"), false, "no --model when none routed");
    },
  },
  {
    name: "70/01 task02 the spawn environment holds the one-hour window — it carries ENABLE_PROMPT_CACHING_1H=1",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin", HOME: "/home/u" }, terminalSessionId: "term-1" });
      assert.equal(launch.env.ENABLE_PROMPT_CACHING_1H, "1", "the launch env sets the 1-hour prompt-cache window");
    },
  },
  {
    name: "70/01 task02 the setting survives the IDE-attachment scrub — the cache-window setting is present after the scrub, applied after it rather than before",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", {
        which: createFakeWhich(["claude"]),
        env: { PATH: "/fake/bin", HOME: "/home/u", CLAUDE_CODE_SSE_PORT: "5", VSCODE_X: "1" },
        terminalSessionId: "term-1",
      });
      assert.equal(launch.env.ENABLE_PROMPT_CACHING_1H, "1", "the cache-window setting is present after the scrub");
      assert.equal("CLAUDE_CODE_SSE_PORT" in launch.env, false, "the scrub still ran (IDE port removed)");
      assert.equal("VSCODE_X" in launch.env, false, "the scrub still ran (VSCODE_* removed)");
    },
  },
  {
    name: "70/01 task02 the scrub still removes everything it removed before — IDE-attachment keys absent, attribution keys present, cache-window present",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", {
        which: createFakeWhich(["claude"]),
        env: { PATH: "/fake/bin", HOME: "/home/u", CLAUDE_CODE_SSE_PORT: "5", TERM_PROGRAM: "vscode", TERM_PROGRAM_VERSION: "1.99.0", VSCODE_GIT_ASKPASS_NODE: "/x/node" },
        terminalSessionId: "term-1",
        attribution: { runId: "run-1", milestoneId: "70", machineId: "mac-1", worktreeId: "wt-1" },
      });
      for (const key of ["CLAUDE_CODE_SSE_PORT", "TERM_PROGRAM", "TERM_PROGRAM_VERSION", "VSCODE_GIT_ASKPASS_NODE"]) {
        assert.equal(key in launch.env, false, `${key} is absent`);
      }
      assert.ok(launch.env[OTEL_RESOURCE_ATTRIBUTES_ENV_KEY].includes("run.id=run-1"), "the attribution keys are present");
      assert.equal(launch.env[OTEL_TELEMETRY_ENV_KEY], "1", "telemetry emission is enabled");
      assert.equal(launch.env.ENABLE_PROMPT_CACHING_1H, "1", "the cache-window setting is present");
    },
  },
  {
    name: "70/01 task02 the window does not depend on how the account is billed — two spawns carry the same cache-window setting, never relying on a billing-dependent default",
    run: async () => {
      const a = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin" }, terminalSessionId: "t1" });
      const b = resolveInteractiveDriverLaunch("claude", { which: createFakeWhich(["claude"]), env: { PATH: "/fake/bin" }, terminalSessionId: "t2" });
      assert.equal(a.env.ENABLE_PROMPT_CACHING_1H, "1", "the first spawn sets the 1-hour window explicitly");
      assert.equal(b.env.ENABLE_PROMPT_CACHING_1H, "1", "the second spawn sets the same 1-hour window explicitly");
      assert.equal(a.env.ENABLE_PROMPT_CACHING_1H, b.env.ENABLE_PROMPT_CACHING_1H, "both carry the same setting — neither relies on a billing-dependent default");
    },
  },
  {
    name: "70/01 task02 outline the launch environment's contract — after the scrub the cache-window and OTel attribution keys are present; the editor SSE port, terminal-program markers and editor-prefixed variables are absent",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", {
        which: createFakeWhich(["claude"]),
        env: { PATH: "/fake/bin", HOME: "/home/u", CLAUDE_CODE_SSE_PORT: "5", TERM_PROGRAM: "vscode", TERM_PROGRAM_VERSION: "1.99.0", VSCODE_GIT_ASKPASS_NODE: "/x/node" },
        terminalSessionId: "term-1",
        attribution: { runId: "run-1", milestoneId: "70", machineId: "mac-1", worktreeId: "wt-1" },
      });
      assert.equal(launch.env.ENABLE_PROMPT_CACHING_1H, "1", "the cache-window setting is present");
      assert.ok(launch.env[OTEL_RESOURCE_ATTRIBUTES_ENV_KEY], "the OTel attribution keys are present");
      assert.equal("CLAUDE_CODE_SSE_PORT" in launch.env, false, "the editor SSE port is absent");
      assert.equal("TERM_PROGRAM" in launch.env, false, "the editor terminal-program markers are absent");
      assert.equal("VSCODE_GIT_ASKPASS_NODE" in launch.env, false, "the editor-prefixed variables are absent");
    },
  },

  // 2026-09-12 — THE STOP IS OBSERVABLE AND, ON WINDOWS, THE TREE DIES FIRST. Three foreground
  // loops died inside the minute the driver killed a finished session, with no exit event of
  // any kind. The stop now reports each step through `onSessionStop`, and on win32 terminates
  // the session's process tree through the OS's own tree kill BEFORE releasing the pty, so
  // node-pty's console-list path runs against a tree that is already gone. An injected
  // `ptySpawn` is a double whose pid is fiction, so the tree kill is off by default and the
  // runner is injected here — no real process is ever signalled by this suite.
  {
    name: "stop — the sentinel's stop reports its steps in order and, on win32 with a real spawner, terminates the tree before the pty is released",
    run: async () => {
      const events = [];
      const kills = [];
      const { spawn, ptys } = createFakePtySpawn({
        onWrite: ({ emitData }) => { emitData("NEEDS_INPUT\n"); },
      });
      const settled = await drive({
        ptySpawn: spawn,
        terminateTree: true,
        terminateTreeExec: (bin, args, opts, callback) => {
          kills.push({ bin, args, hidden: opts?.windowsHide === true, ptyKilledYet: ptys[0].killed });
          callback(null, "SUCCESS", "");
        },
        onSessionStop: (event) => { events.push(event); },
      });
      assert.equal(settled.value.outcome, "needs-input");
      const phases = events.map((event) => event.phase);
      if (process.platform === "win32") {
        assert.deepEqual(kills.map((k) => [k.bin, ...k.args]), [["taskkill", "/PID", String(ptys[0].pid), "/T", "/F"]], "the OS tree kill targets the pty's pid");
        assert.equal(kills[0].hidden, true, "…with no console window");
        assert.equal(kills[0].ptyKilledYet, false, "…and BEFORE the pty is released");
        assert.deepEqual(phases, ["stop-requested", "tree-terminated", "pty-released", "exit-confirmed"], "every step of the stop reports, in order");
        assert.equal(events[1].ok, true, "the tree kill's outcome rides its breadcrumb");
      } else {
        assert.deepEqual(kills, [], "no tree kill off win32");
        assert.deepEqual(phases, ["stop-requested", "pty-released", "exit-confirmed"], "the stop still reports every step");
      }
      assert.equal(ptys[0].killed, true, "the pty is released either way");
      assert.equal(events[0].outcome, "needs-input", "the first breadcrumb names the outcome the stop was requested for");
      assert.ok(events.every((event) => event.pid === ptys[0].pid), "every breadcrumb names the pty's pid");
    },
  },
  {
    name: "stop — an injected spawner never triggers the tree kill unless asked, and a stop hook that throws never fails the settle",
    run: async () => {
      const kills = [];
      const { spawn, ptys } = createFakePtySpawn({ onWrite: ({ emitData }) => { emitData("NEEDS_INPUT\n"); } });
      const settled = await drive({
        ptySpawn: spawn,
        terminateTreeExec: (...args) => { kills.push(args); args.at(-1)(null, "", ""); },
        onSessionStop: () => { throw new Error("hook fault"); },
      });
      assert.equal(settled.value.outcome, "needs-input", "the settle is unaffected by a faulting hook");
      assert.deepEqual(kills, [], "a test double's pid is fiction: no tree kill was attempted");
      assert.equal(ptys[0].killed, true, "the pty is still released");
    },
  },
  {
    name: "2026-09-24 readiness is observed — a real launch types only after the floor AND the TUI's bracketed-paste marker, read across a chunk boundary",
    run: async () => {
      const { pty, spawn } = emittingPty();
      const pending = driveInteractiveClaudeSession(BRIEF, {
        ptySpawn: spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => null,
        observeReadiness: true, commandDelayMs: 20, submitDelayMs: 0, readyCapMs: 5000,
      });
      await sleep(80);
      assert.deepEqual(pty.writes, [], "the floor has passed but the TUI has not said it is ready — nothing typed");
      await waitUntil(() => pty.subscribed);
      pty.emit(`startup${TUI_READY_MARKER.slice(0, 4)}`);
      await waitUntil(() => pty.subscribed);
      pty.emit(`${TUI_READY_MARKER.slice(4)} prompt`);
      await waitUntil(() => pty.writes.length >= 1);
      assert.deepEqual(pty.writes[0], pasted(BRIEF.command)[0], "the directive is pasted once the marker is seen");
      pty.exit(0);
      assert.equal((await pending).outcome, "done");
    },
  },
  {
    name: "2026-09-24 a TUI that never shows the marker is typed into at the cap, and the wait is named",
    run: async () => {
      const { pty, spawn } = emittingPty();
      const stops = [];
      const pending = driveInteractiveClaudeSession(BRIEF, {
        ptySpawn: spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => null,
        observeReadiness: true, commandDelayMs: 10, submitDelayMs: 0, readyCapMs: 60,
        onSessionStop: (event) => stops.push(event),
      });
      await waitUntil(() => pty.writes.length >= 1);
      assert.deepEqual(pty.writes[0], pasted(BRIEF.command)[0]);
      assert.deepEqual(stops.map((event) => event.phase), ["tui-ready-marker-absent"]);
      pty.exit(0);
      await pending;
    },
  },
  {
    name: "2026-09-24 a submitted directive that starts no session fails fast as timeout, naming what the screen showed",
    run: async () => {
      const { pty, spawn } = emittingPty();
      const stops = [];
      const pending = driveInteractiveClaudeSession(BRIEF, {
        ptySpawn: spawn, which: createFakeWhich(["claude"]),
        watchTranscriptSessionId: ({ signal }) => new Promise((resolve) => signal.addEventListener("abort", () => resolve(null))),
        observeReadiness: true, commandDelayMs: 10, submitDelayMs: 0, readyCapMs: 5000, acceptTimeoutMs: 80,
        onSessionStop: (event) => stops.push(event),
      });
      await waitUntil(() => pty.subscribed);
      pty.emit(`${TUI_READY_MARKER}\u001b[1mNew MCP server found in .mcp.json: voicevox\u001b[0m 1. Use this server 2. Continue without`);
      const result = await pending;
      assert.equal(result.outcome, "failed");
      assert.equal(result.failureReason, "timeout", "retryable — the store's vocabulary is unchanged");
      const notAccepted = stops.find((event) => event.phase === "directive-not-accepted");
      assert.ok(notAccepted, stops.map((event) => event.phase).join(","));
      assert.match(notAccepted.screen, /New MCP server found in \.mcp\.json: voicevox/u, "the screen tail, escapes stripped");
      assert.equal(pty.killed, true);
    },
  },
  {
    name: "2026-09-24 the acceptance watch stands down once the session id is captured",
    run: async () => {
      const { pty, spawn } = emittingPty();
      const pending = driveInteractiveClaudeSession(BRIEF, {
        ptySpawn: spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => "sess-accepted",
        observeReadiness: true, commandDelayMs: 10, submitDelayMs: 0, readyCapMs: 5000, acceptTimeoutMs: 40,
      });
      await waitUntil(() => pty.subscribed);
      pty.emit(TUI_READY_MARKER);
      await waitUntil(() => pty.writes.length >= 2);
      await sleep(120);
      assert.equal(pty.killed, false, "a session that started is left alone");
      pty.exit(0);
      const result = await pending;
      assert.equal(result.outcome, "done");
      assert.equal(result.sessionId, "sess-accepted");
    },
  },
];
