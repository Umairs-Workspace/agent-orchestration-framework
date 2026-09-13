// Traceability wiring for milestone 70 / story 06 — "the saving is a number, not a
// claim", task 00 ("a real phase is measured").
//
// Task 00 could not be run at all until the LOCAL WINDOWS DRIVE PATH could start a
// claude turn. It could not, for three independent reasons, each measured against
// claude 2.1.241 on 2026-08-24 by spawning the production launch argv through the
// production node-pty seam and capturing every byte in both directions. This file pins
// all three, because each one fails SILENTLY — the run mints, the process starts, and
// the only symptom is a timeout with `sessionId: null` and no `spend`.
//
//   D1  The folder-TRUST pre-write keyed ~/.claude.json by the RAW cwd, which on
//       Windows carries backslashes; claude keys the same directory with forward
//       slashes. The pre-write therefore missed on every Windows run since milestone
//       38, claude showed its trust dialog anyway, and the dialog ATE the directive and
//       its Enter (a modal consumes keystrokes and repaints nothing for the ones it
//       does not handle). Evidence on the operator's own config at the time of the fix:
//       662 backslash keys, 661 carrying exactly ONE field (this writer's, never read
//       by claude) against 62 forward-slash keys carrying 10–31 fields (claude's own).
//       This is the mechanism behind 42_structural-overhaul/STATE.md OPEN FINDING,
//       "bytes reach the pty, claude does not react".
//
//   D2  The launch env was scrubbed of the IDE-attachment vector but not of the
//       NESTED-SESSION one. A loop driven from inside a Claude Code session passed
//       CLAUDECODE / CLAUDE_CODE_* through to the spawn; the session then ran a real
//       turn to completion and wrote NO transcript at all — which silently empties the
//       whole sessionId → spend → phase-ratio chain this milestone is measured by.
//
//   D3  The directive was written as one `body + CR`. Correct for a one-line command,
//       silently wrong for the multi-line one 70/00 made real: written raw, a 43-line
//       brief arrived as EIGHT separate user turns (ConPTY input chunk boundaries act
//       as submits), and with the CR inside a bracketed paste it was never submitted at
//       all. The shipped transport is a bracketed-paste body plus a SEPARATE Enter.
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { claudeProjectKey, ensureWorktreeTrusted } from "../../src/claude-trust.mjs";
import { driveInteractiveClaudeSession, resolveInteractiveDriverLaunch } from "../../src/mesh/worker-execution.mjs";
import { createFakeWhich, createFakePtySpawn } from "../support/mesh-worker-terminal-fixture.mjs";
import { PHASE_BRIEF_MAX_CHARS } from "../../src/phase-brief.mjs";

// Built from char codes so the bytes under test are unambiguous in the source.
const SUBMIT_KEY = String.fromCharCode(13); // carriage return — the Enter key
const NL = String.fromCharCode(10); // line feed — Ctrl+J, which does NOT submit
const BSL = String.fromCharCode(92); // the Windows path separator
const ESC = String.fromCharCode(27);
// The bracketed-paste protocol bytes - a TERMINAL protocol constant, asserted here
// rather than imported, because the driver's export set is frozen at seventeen.
const BRACKETED_PASTE_START = `${ESC}[200~`;
const BRACKETED_PASTE_END = `${ESC}[201~`;

const WIN_CWD = ["C:", "Users", "u", "wt", "70-06"].join(BSL);
const WIN_KEY = "C:/Users/u/wt/70-06";

async function withHome(run) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-7006-home-"));
  try {
    return await run(home);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

const readCfg = async (home) => JSON.parse(await readFile(path.join(home, ".claude.json"), "utf8"));

// A minimal CONFORMING phase-brief context (the embed-admission shape the driver's
// compose seam checks: itemRef, phase, sections, truncated, dropped).
const brief = (text) => ({
  itemRef: "70/06",
  phase: "continue",
  sections: [],
  truncated: false,
  dropped: [],
  notice: null,
  text,
  chars: text.length,
  ceiling: PHASE_BRIEF_MAX_CHARS,
});

// A scripted PTY that records every write and settles on the SEPARATE submit.
// These are the TRANSPORT tests, so they record `rawChunk` — the bytes on the wire,
// paste framing included. The double's `chunk` is the un-framed input a directive test
// wants (see mesh-worker-terminal-fixture.mjs); asserting the framing against it would
// be asserting that the strip did not happen.
function recordingPty() {
  const writes = [];
  const { spawn } = createFakePtySpawn({
    onWrite: ({ rawChunk, emitExit }) => {
      writes.push(rawChunk);
      if (rawChunk === SUBMIT_KEY) emitExit(0);
    },
  });
  return { writes, spawn };
}

const driverOptions = (spawn, extra = {}) => ({
  ptySpawn: spawn,
  which: createFakeWhich(["claude"]),
  watchTranscriptSessionId: async () => null,
  commandDelayMs: 0,
  submitDelayMs: 0,
  ...extra,
});

export const warmStartLocalDriveTests = [
  // ------------------------------------------------------------------ D1: trust key
  {
    name: "70/06 D1 the trust key is spelled the way claude spells it — separators normalised, drive-letter case untouched",
    run: async () => {
      assert.equal(claudeProjectKey(WIN_CWD), WIN_KEY, "a Windows cwd keys with forward slashes");
      assert.equal(claudeProjectKey(["c:", "Source", "aof"].join(BSL)), "c:/Source/aof", "a lower-case drive letter is NOT re-cased");
      assert.equal(claudeProjectKey(["C:", "Source", "aof"].join(BSL)), "C:/Source/aof", "an upper-case drive letter is NOT re-cased");
      assert.equal(claudeProjectKey("/home/u/wt"), "/home/u/wt", "a POSIX path normalises to itself, byte-identically");
    },
  },
  {
    name: "70/06 D1 the pre-write lands under the key claude READS, and not under the raw backslash key",
    run: async () => {
      await withHome(async (home) => {
        await writeFile(path.join(home, ".claude.json"), JSON.stringify({ projects: {} }, null, 2));
        await ensureWorktreeTrusted(WIN_CWD, { homedir: home });
        const cfg = await readCfg(home);
        assert.equal(cfg.projects[WIN_KEY]?.hasTrustDialogAccepted, true, "trust is written under the forward-slash key");
        assert.equal(WIN_CWD in cfg.projects, false, "the raw backslash key — the one claude never reads — is not written");
        assert.deepEqual(Object.keys(cfg.projects), [WIN_KEY], "exactly one key is written for one directory");
      });
    },
  },
  {
    name: "70/06 D1 an already-trusted worktree is not rewritten, and a sibling project's entry is preserved",
    run: async () => {
      await withHome(async (home) => {
        await writeFile(path.join(home, ".claude.json"), JSON.stringify({
          projects: {
            [WIN_KEY]: { hasTrustDialogAccepted: true, lastSessionId: "keep-me" },
            "C:/other/repo": { hasTrustDialogAccepted: true },
          },
        }, null, 2));
        await ensureWorktreeTrusted(WIN_CWD, { homedir: home });
        const cfg = await readCfg(home);
        assert.equal(cfg.projects[WIN_KEY].lastSessionId, "keep-me", "claude's own fields under that key survive");
        assert.equal(cfg.projects["C:/other/repo"].hasTrustDialogAccepted, true, "an unrelated project is untouched");
      });
    },
  },
  {
    name: "70/06 D1 a missing config degrades to claude's own dialog rather than throwing",
    run: async () => {
      await withHome(async (home) => {
        await ensureWorktreeTrusted(WIN_CWD, { homedir: home }); // no .claude.json at all
        assert.ok(true, "best-effort: an absent config never throws out of the pre-spawn seam");
      });
    },
  },

  // ------------------------------------------------------------------- D2: env scrub
  {
    name: "70/06 D2 the launch env carries no nested-Claude-Code session identity",
    run: async () => {
      const polluted = {
        PATH: process.env.PATH,
        CLAUDECODE: "1",
        CLAUDE_CODE_CHILD_SESSION: "1",
        CLAUDE_CODE_SESSION_ID: "parent-session",
        CLAUDE_CODE_ENTRYPOINT: "cli",
        CLAUDE_CODE_MESSAGING_SOCKET: "/tmp/sock",
        CLAUDE_CODE_MESSAGING_TOKEN: "secret",
        CLAUDE_CODE_SSE_PORT: "1234",
        CLAUDE_PID: "999",
        CLAUDE_EFFORT: "xhigh",
        CLAUDE_AGENT_SDK_VERSION: "9.9.9",
        TERM_PROGRAM: "vscode",
        VSCODE_PID: "42",
        ANTHROPIC_API_KEY: "kept",
      };
      const launch = resolveInteractiveDriverLaunch("claude", { env: polluted, which: createFakeWhich(["claude"]) });
      assert.ok(launch, "the launch resolves");
      for (const key of [
        "CLAUDECODE", "CLAUDE_CODE_CHILD_SESSION", "CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_ENTRYPOINT",
        "CLAUDE_CODE_MESSAGING_SOCKET", "CLAUDE_CODE_MESSAGING_TOKEN", "CLAUDE_CODE_SSE_PORT",
        "CLAUDE_PID", "CLAUDE_AGENT_SDK_VERSION", "TERM_PROGRAM", "VSCODE_PID",
      ]) {
        assert.equal(key in launch.env, false, `${key} is scrubbed from the worker launch env`);
      }
      assert.equal("CLAUDE_EFFORT" in launch.env, false, "an inherited CLAUDE_EFFORT cannot override the per-phase --effort ADR-005 resolves");
      assert.equal(launch.env.ANTHROPIC_API_KEY, "kept", "everything else rides through untouched");
    },
  },
  {
    name: "70/06 D2 the scrub cannot eat what aof sets for itself — the 1-hour cache window survives it",
    run: async () => {
      const launch = resolveInteractiveDriverLaunch("claude", {
        env: { PATH: process.env.PATH, CLAUDECODE: "1", CLAUDE_CODE_SESSION_ID: "parent" },
        which: createFakeWhich(["claude"]),
      });
      assert.equal(launch.env.ENABLE_PROMPT_CACHING_1H, "1", "the deliberately-held 1-hour prompt-cache window is still set");
      assert.ok(launch.args.includes("--exclude-dynamic-system-prompt-sections"), "the ADR-004 stable-prefix flag is still passed");
      assert.ok(launch.args.includes("--append-system-prompt"), "and still in the APPEND form that keeps that flag live");
    },
  },

  // -------------------------------------------------------------- D3: the transport
  {
    name: "70/06 D3 a multi-line directive is ONE bracketed paste, submitted by a SEPARATE Enter",
    run: async () => {
      const { writes, spawn } = recordingPty();
      const context = brief(["## TASK CONTRACTS", "- one", "- two", "- three"].join(NL));
      const result = await driveInteractiveClaudeSession(
        { itemRef: "70/06", worktreeCwd: "/tmp/wt", task: "demo", command: "/aof:continue 70/06", context },
        driverOptions(spawn),
      );
      assert.equal(result.outcome, "done");
      assert.equal(writes.length, 2, "exactly two writes: the pasted body, then the Enter");
      const [body, submit] = writes;
      assert.ok(body.startsWith(BRACKETED_PASTE_START), "the body opens the bracketed paste");
      assert.ok(body.endsWith(BRACKETED_PASTE_END), "the body closes the bracketed paste");
      assert.equal(submit, SUBMIT_KEY, "the Enter is its own write — inside the paste it is swallowed and never submits");

      const inner = body.slice(BRACKETED_PASTE_START.length, -BRACKETED_PASTE_END.length);
      assert.ok(inner.startsWith("/aof:continue 70/06"), "the directive still LEADS the first input");
      assert.ok(inner.includes("## TASK CONTRACTS"), "the compiled brief follows it, by value, in the same paste");
      assert.ok(inner.includes(NL), "the body really is multi-line — the case a raw write tore into eight turns");
    },
  },
  {
    name: "70/06 D3 no newline is ever written on its own — the whole brief crosses in a single chunk",
    run: async () => {
      const { writes, spawn } = recordingPty();
      const lines = Array.from({ length: 40 }, (_, i) => `- context line ${i}`).join(NL);
      await driveInteractiveClaudeSession(
        { itemRef: "70/06", worktreeCwd: "/tmp/wt", task: "demo", command: "/aof:continue 70/06", context: brief(lines) },
        driverOptions(spawn),
      );
      const bodyWrites = writes.filter((w) => w !== SUBMIT_KEY);
      assert.equal(bodyWrites.length, 1, "the multi-line directive is not split across writes");
      assert.equal(bodyWrites[0].split(NL).length, 42, "the command, the blank separator and all 40 context lines are in that one write");
      assert.equal(writes.filter((w) => w === SUBMIT_KEY).length, 1, "exactly one Enter is sent — one directive, one turn");
    },
  },
  {
    name: "70/06 D3 a bare one-line directive keeps the same transport — no special case to drift",
    run: async () => {
      const { writes, spawn } = recordingPty();
      await driveInteractiveClaudeSession(
        { itemRef: "70/06", worktreeCwd: "/tmp/wt", task: "demo", command: "/aof:verify 70/06" },
        driverOptions(spawn),
      );
      assert.deepEqual(writes, [`${BRACKETED_PASTE_START}/aof:verify 70/06${BRACKETED_PASTE_END}`, SUBMIT_KEY]);
    },
  },
  {
    name: "70/06 D3 the directive body cannot close its own paste — an end-of-paste marker in the content is stripped",
    run: async () => {
      const { writes, spawn } = recordingPty();
      // A brief whose CONTENT carries the end-of-paste sequence. Unstripped, the paste
      // would end mid-brief and the remainder would be typed as raw keystrokes.
      const hostile = `before${BRACKETED_PASTE_END}after`;
      await driveInteractiveClaudeSession(
        { itemRef: "70/06", worktreeCwd: "/tmp/wt", task: "demo", command: "/aof:continue 70/06", context: brief(hostile) },
        driverOptions(spawn),
      );
      const [body] = writes;
      assert.equal(body.startsWith(BRACKETED_PASTE_START), true, "the paste still opens");
      assert.equal(body.endsWith(BRACKETED_PASTE_END), true, "the paste still closes, once");
      const inner = body.slice(BRACKETED_PASTE_START.length, -BRACKETED_PASTE_END.length);
      assert.equal(inner.includes(BRACKETED_PASTE_END), false, "no end-of-paste marker survives inside the body");
      assert.equal(inner.includes("before"), true, "the content either side of the marker is kept");
      assert.equal(inner.includes("after"), true, "including everything that followed it");
      assert.equal(writes.filter((w) => w === SUBMIT_KEY).length, 1, "still exactly one Enter — one directive, one turn");
    },
  },
  {
    name: "70/06 D3 a settled run never gets a late Enter typed into its exited PTY",
    run: async () => {
      const writes = [];
      // exit on the BODY write: the submit timer is still pending when the run settles.
      const { spawn } = createFakePtySpawn({
        onWrite: ({ rawChunk, emitExit }) => { writes.push(rawChunk); emitExit(0); },
      });
      const result = await driveInteractiveClaudeSession(
        { itemRef: "70/06", worktreeCwd: "/tmp/wt", task: "demo", command: "/aof:continue 70/06" },
        driverOptions(spawn, { submitDelayMs: 50 }),
      );
      assert.equal(result.outcome, "done");
      await new Promise((r) => setTimeout(r, 120)); // well past submitDelayMs
      assert.equal(writes.filter((w) => w === SUBMIT_KEY).length, 0, "the queued submit is cancelled at the settle point, never typed into a dead PTY");
    },
  },
];
