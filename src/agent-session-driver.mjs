// src/agent-session-driver.mjs — THE SESSION DRIVER, given a home (milestone 53 /
// story 00, ADR-001). Everything here was `src/mesh/worker-execution.mjs:835-1851`
// until 2026-08-16 and is MOVED VERBATIM: same identifiers, same signatures, same
// default parameters, same behaviour. The only textual change to the moved block is
// the `export` keyword on `defaultPtySpawn`, which was module-private in the sink and
// has to be reachable now that its one remaining consumer (the sink's own terminal
// resume handler) lives in the other file (ADR-010 §17d).
//
// WHY IT MOVED. RESEARCH §Q1 measured that this layer is already mesh-blind — not one
// of `driveInteractiveClaudeSession`, `resolveInteractiveDriverLaunch`,
// `defaultWatchTranscriptSessionId`, `defaultWatchTranscriptCompletion` or
// `defaultPtySpawn` takes an assignmentId, a workspaceId, a lease or a worktree handle.
// Its brief is `{ itemRef, worktreeCwd, task, command }` and its options is a plain
// injection bag. Only the FILE was mesh-coupled: importing anything at all from the
// 3,286-line sink pulled its 21 top-of-file imports in as a load-time side effect —
// the assignment lifecycle, the effects ledger and a SQLite opener — on every
// invocation of a purely local `aof work loop`. This module's import set is the frozen
// five below plus node builtins (ADR-001 §3); the one admitted transitive edge is
// `terminal-ws.mjs -> work.mjs`, named out loud there rather than worked around, since
// severing it would mean a second node-pty spawn factory.
//
// THE SINK RE-EXPORTS ALL SEVENTEEN of these names verbatim, so all 49 dependents of
// `mesh-worker-execution.mjs` — 43 suites, 2 test/support fixture modules and 4 files
// under src//scripts — keep the import line they already had (ADR-001 §2). The
// precedent is `ensureWorktreeTrusted`, which moved to `claude-trust.mjs` in
// 2026-07-26 for the same reason and is re-exported below; ADR-010 §18 admits it BY
// NAME as the seventeenth member rather than as a parenthetical a gate cannot read.
//
// `reportDegrade`'s first argument STAYS the literal "mesh-worker-execution" in every
// one of the twenty calls below (ADR-010 §16). That argument IS the emitted event's
// `code` and `reportDegrade` throttles PER CODE, so changing it is both the behaviour
// change ADR-001 §1 forbids and an observable timing change in the one path that
// exists to be quiet under failure. Same class of accepted NAME drift as
// `WORKER_SESSION_INSTRUCTION`, which a local loop now also reads: TECH_DEBT item 10's
// third shape, one token, fixed by whoever renames the code deliberately with a
// degrade-consumer sweep — never by a builder mid-move.
import path from "node:path";
import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
// `claudeProjectsDir` is the EXISTING slug/projects-dir seam (work-observe.mjs, the
// observability milestone): reused VERBATIM (never re-implemented) so the session-id
// transcript-dir watch below resolves EXACTLY the directory a real interactive
// `claude` session (cwd = worktreeCwd) writes its own transcript into.
import { claudeProjectsDir, readLastAssistantTurn, NEEDS_INPUT_SENTINEL, HUMAN_INPUT_TOOL_NAMES } from "./work/observe.mjs";
// milestone 38 / story 05 (ADR-013) — the interactive-`claude`-PTY driver reuses the
// EXISTING terminal infrastructure verbatim: `resolveProvider` is the SAME seam
// `/ws/terminal` resolves its own launch through (terminal-providers.mjs), and
// `createTerminalSpawn(loadNodePty)` is the SAME node-pty factory `terminal-ws.mjs`
// spawns through (its own SEA-vs-dev loader branch) — never a second, hand-rolled
// spawn path or a re-implemented provider table.
import { resolveProvider } from "./terminal-providers.mjs";
import { createTerminalSpawn, loadNodePty } from "./terminal-ws.mjs";
// m42 item 3 — every former silent catch reports a coded degrade event.
import { reportDegrade } from "./degrade.mjs";
import { DEFAULT_HEARTBEAT_MS, PROVIDER_WAIT_RE } from "./loop-bounds.mjs";

// ------------------------------------------------------- the headless driver ----

// buildDriverCommand(driver, brief) — RETIRED for `claude` (milestone 38 / story 05,
// ADR-013): the interactive PTY path below (resolveInteractiveDriverLaunch /
// driveInteractiveClaudeSession) replaces the old `claude -p <prompt>
// --output-format json` one-shot entirely — `defaultSpawnRuntime` below never calls
// this function for the `claude` driver any more. `codex` keeps its OWN pre-existing
// headless-print form UNCHANGED (ADR-013 is scoped to `claude`; codex was never the
// §4.3 problem — it never had a subscription-billing / human-in-the-loop story to
// begin with, and no task in this story touches it). Any OTHER driver name resolves
// to `null` — a caller must route it through the interactive path or fail closed,
// never silently fall back to a headless print form for `claude`.
export function buildDriverCommand(driver, brief) {
  const prompt = `Drive work item ${brief.itemRef} to a terminal state (done or failed) in this worktree. ${brief.task ?? ""}`.trim();
  if (driver === "codex") {
    return {
      bin: "codex",
      args: ["exec", "--json", "-o", "last-message.txt", "--sandbox", "workspace-write", "--ask-for-approval", "never", prompt],
    };
  }
  return null;
}

// ============================================================================
// MILESTONE 38 / STORY 05 — terminal-driven-worker-execution (ADR-013, tasks 00-03)
// ============================================================================
//
// `claude -p` is GONE from the worker driver path (RESEARCH §4.3 MEASURED: it cannot
// pause to ask a human — a question-ended turn reports `terminal_reason: "completed"`,
// indistinguishable from real completion; the Agent SDK path that COULD ask forces
// off-subscription per-token billing). The worker now runs interactive `claude` in a
// node-pty PTY, resolved through the EXISTING `terminal-providers` seam
// (`resolveProvider("claude")` — the SAME empty-args interactive launch
// `terminal-ws.mjs`'s `/ws/terminal` route uses, terminal-providers.mjs:23) and
// spawned via the SAME node-pty factory (`createTerminalSpawn(loadNodePty)`,
// terminal-ws.mjs) — never a hand-rolled second spawn path. cwd = the worktree
// (task 00).
//
// THE WHOLE DIRECTIVE COMMAND STRING (`/aof:refine <ref> --autonomous`,
// `/aof:continue`, `/aof:verify <ref>`) is typed into that ONE session's PTY stdin as
// a SINGLE newline-terminated `pty.write` — never baked into the spawn argv as a `-p`
// prompt (task 01). ONE long-lived interactive session per assignment:
// driveInteractiveClaudeSession spawns exactly once and resolves exactly once, for
// the assignment's whole run — never re-spawned to deliver a second command line.
//
// TERMINAL-STATE DETECTION reads the PTY's OWN output stream (there is no `-p` JSON
// result to parse). An explicit NEEDS_INPUT_SENTINEL (task 02) observed in the
// accumulated output resolves a THIRD outcome, `needs-input` — distinct from, and
// NEVER re-mapped to, `done` (closing the exact §4.3 gap where a question-ended
// `completed` turn read as `done`). Absent that sentinel, the outcome is read off the
// PTY's own process exit: a clean (0) exit is `done`, anything else is `failed`.
//
// SESSION_ID capture — ADR-013 AMENDMENT (F-38.05, 2026-07-19). The ORIGINAL task-03
// design asked the driven session to print a documented `AOF_SESSION_ID:` marker line
// onto its own PTY output — but nothing ever instructed a real `claude` to emit it, so
// `session_id` was ALWAYS null in production (a consumer with no producer). CORRECTED:
// a TRANSCRIPT-DIR WATCH requiring ZERO model cooperation. A real interactive `claude`
// process, spawned with `cwd = worktreeCwd`, writes its OWN transcript to
// `<claudeProjectsDir({ cwd: worktreeCwd })>/<session_id>.jsonl` (measured live at the
// F-38.05 verify pass) — Claude Code itself is the producer, not the model. The worker
// snapshots that directory's existing `*.jsonl` basenames BEFORE the session can write
// one (the directory may not yet exist — treated as an empty snapshot, never a throw),
// then watches for the FIRST NEW `*.jsonl` basename to appear; that basename, minus its
// extension, NAMES the session (`defaultWatchTranscriptSessionId` below). The watch is
// abort-aware (a caller aborts it once this invocation's own outcome is known — see
// `driveInteractiveClaudeSession`'s `finish` below) and bounded by a max wait, so a
// transcript that never appears degrades to a null sessionId, never a crash, never an
// unbounded loop (task 03's Examples, unchanged).
//
// NEEDS_INPUT producer — ADR-013 AMENDMENT (F-38.05). The original task-02 design typed
// only `brief.command` into the PTY, with no instruction that would make a real
// `claude` ever emit the sentinel — the SAME producerless gap. CORRECTED: a
// worker-scoped `--append-system-prompt NEEDS_INPUT_INSTRUCTION` on the interactive
// launch (`resolveInteractiveDriverLaunch` below) instructs an autonomous, human-absent
// session to emit the sentinel on a genuine judgment call rather than guess. This is
// worker-only by construction — the human `/ws/terminal` route (terminal-ws.mjs) calls
// `resolveProvider` directly and never calls `resolveInteractiveDriverLaunch`, so it can
// never false-fire on a human session. `containsNeedsInputSentinel`'s DETECTION below
// is UNCHANGED — this amendment adds the missing PRODUCER, not a new detector.
// 131/ADR-002: the literal lives in the transcript family beside the one reader of the turn it
// marks, and is re-exported here so the frozen seventeen do not move.
export { NEEDS_INPUT_SENTINEL };

// NEEDS_INPUT_INSTRUCTION — the producer text (ADR-013 amendment, option C). Embeds
// NEEDS_INPUT_SENTINEL via a template interpolation so the producer and
// `containsNeedsInputSentinel`'s detector always share the ONE literal. NOTE: this
// template's body must contain no `//` and no `/*` sequence — the
// `acd-worker-driver-no-headless-print` fitness function strips JS comments out of the
// whole source file before scanning it, and either sequence inside this string would
// be stripped right along with real comments, corrupting both the instruction and (for
// an unbalanced `/*`) everything textually after it.
export const NEEDS_INPUT_INSTRUCTION = `You are running autonomously on a worker machine with no human present to answer
questions in real time. If you reach a genuine judgment call you cannot safely
resolve on your own — one where guessing risks doing the wrong thing and a human would
need to weigh in — do not guess and do not stall silently. Before you print it, write your
question for a human reading it on a phone, as four short lines that begin exactly
"Decision needed:", "Options:", "I would pick:" and "What the answer changes:" — the one
decision you need, the options you weighed, the one you would take and why, and which tasks,
files or later steps depend on the answer. Keep those four lines under 1,500 characters, and
put any detail after them.
Instead, print the exact
line ${NEEDS_INPUT_SENTINEL} on its own line, with nothing else on that line, then
stop. Only use this for a real, blocking judgment call; keep working through every
task you can complete confidently without it.`;

// DIRECTIVE_COMPLETE — the DECLARED-completion sentinel pair (m42 follow-up,
// operator-verified truncation 2026-07-26). "end_turn + transcript silence" is a
// GUESS about completion, and every guess so far has truncated a live run (the ~3s
// window killed `/aof:continue 18` at 14.7 min mid-build; the 5-minute window killed
// the SAME milestone's next run the following day — background developer agents are
// routinely quiet for longer than any fixed window). The honest signal is the model
// DECLARING completion, exactly like NEEDS_INPUT already declares a blocking
// question: a producer instruction on the worker launch, a detector on the
// transcript's final turn. A declared outcome settles fast; an UNDECLARED end_turn
// is only a fallback, and has to out-wait the long idle window below. Same
// no-`comment-sequence` constraint as NEEDS_INPUT_INSTRUCTION (the
// acd-worker-driver-no-headless-print comment-stripper).
export const DIRECTIVE_COMPLETE_SENTINEL = "AOF_DIRECTIVE_COMPLETE";

export const DIRECTIVE_COMPLETE_INSTRUCTION = `When the directive you were given is FULLY complete — every agent you spawned has
finished and reported back, statuses are updated and the work is recorded — end your
final message with the exact line ${DIRECTIVE_COMPLETE_SENTINEL} on its own line,
with nothing else on that line. Print it only when nothing remains in flight: never
while a spawned agent is still working, and never as a progress update. If you stop
for a blocking question instead, use ${NEEDS_INPUT_SENTINEL} as instructed and do
not print ${DIRECTIVE_COMPLETE_SENTINEL}.`;

// The ONE worker-session system-prompt payload: both producers, appended as a single
// `--append-system-prompt` (two flags would override each other in claude's CLI).
export const WORKER_SESSION_INSTRUCTION = `${NEEDS_INPUT_INSTRUCTION}

${DIRECTIVE_COMPLETE_INSTRUCTION}`;

// defaultWatchTranscriptSessionId({ cwd, env, signal, maxWaitMs }) => Promise<string|null>
// — the REAL production transcript-dir watch (ADR-013 amendment). Registers its
// `signal`-abort listener SYNCHRONOUSLY, before any async fs call ever runs, so a
// caller that aborts immediately after kicking this off (the common case: the driven
// session already exited before any transcript ever appeared) is guaranteed to resolve
// promptly — never stalls out to `maxWaitMs` waiting on a poll tick that was already
// moot. NEVER throws (every fs fault degrades to "nothing new this tick", never a
// rejection) and NEVER loops forever (bounded by `maxWaitMs`, in addition to the
// abort-signal short-circuit). `maxWaitMs` is an OPTIONAL override (default the
// production constant below) — it exists purely so a hermetic, real-fs test can prove
// the deadline-degrade path fast, without waiting out the real 10-minute production
// bound; production callers never pass it.
const WATCH_TRANSCRIPT_POLL_MS = 200;
const WATCH_TRANSCRIPT_MAX_WAIT_MS = 10 * 60 * 1000;

export async function defaultWatchTranscriptSessionId({ cwd, env, signal, maxWaitMs = WATCH_TRANSCRIPT_MAX_WAIT_MS } = {}) {
  const dir = claudeProjectsDir({ cwd, env });
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    // `existing` stays null until the FIRST readdir tick completes (successfully or
    // not) — that tick's result (or an empty set, on a not-yet-existing directory) IS
    // the "before the session writes one" snapshot; only a `*.jsonl` basename seen on
    // a LATER tick that was absent from this snapshot counts as "new".
    let existing = null;

    const onAbort = () => finish(null);
    function finish(value) {
      if (settled) return;
      settled = true;
      if (timer != null) clearTimeout(timer);
      try { signal?.removeEventListener?.("abort", onAbort); } catch (error) { /* non-EventTarget signal double */
      reportDegrade("mesh-worker-execution", error); }
      resolve(value);
    }

    // Registered BEFORE any await/async fs call below — an abort fired the instant
    // after this function is called (e.g. a session that exits before the first poll
    // tick even runs) is never missed.
    if (signal?.aborted) {
      finish(null);
      return;
    }
    try { signal?.addEventListener?.("abort", onAbort); } catch (error) { /* non-EventTarget signal */
      reportDegrade("mesh-worker-execution", error); }

    const deadline = Date.now() + maxWaitMs;

    const poll = () => {
      if (settled) return;
      readdir(dir)
        .then((names) => names.filter((name) => name.endsWith(".jsonl")))
        .catch(() => [] /* dir absent or unreadable — nothing new this tick, never a throw */)
        .then((jsonlNames) => {
          if (settled) return;
          if (existing == null) {
            existing = new Set(jsonlNames);
          } else {
            const fresh = jsonlNames.find((name) => !existing.has(name));
            if (fresh != null) {
              finish(fresh.slice(0, -".jsonl".length));
              return;
            }
          }
          if (Date.now() > deadline) {
            finish(null);
            return;
          }
          timer = setTimeout(poll, WATCH_TRANSCRIPT_POLL_MS);
        });
    };
    poll();
  });
}

// review fix (m38/05, confirmed defect #1): the ORIGINAL `buffer.includes(...)` was
// an UNANCHORED substring match — a clean run whose output merely NARRATES the word
// "NEEDS_INPUT" inside a longer line (or a longer token like "NEEDS_INPUTS") false-
// fired, killing a healthy live PTY (:841-844) and mis-reporting a needs-input
// outcome for what was actually a `done` run. The sentinel is now matched ONLY as a
// COMPLETE line — the accumulated buffer's own terminated lines (everything except
// the LAST element of the `\n` split, which is the still-in-flight, not-yet-
// terminated partial line) trimmed and compared for EQUALITY against
// NEEDS_INPUT_SENTINEL — mirroring the sentinel's own documented "one line" shape.
// A sentinel split across two onData chunks (e.g. "NEEDS_I" + "NPUT\n") is still
// detected exactly once, the moment the newline actually completes the line;
// "NEEDS_INPUTS" (or "...says NEEDS_INPUT to the user...") never matches, since
// neither trims down to an exact "NEEDS_INPUT" line.
function containsNeedsInputSentinel(buffer) {
  const lines = buffer.split("\n");
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (lines[i].trim() === NEEDS_INPUT_SENTINEL) return true;
  }
  return false;
}

// 129/06 F-58 — THE PROVIDER-WAIT LINE is read with `PROVIDER_WAIT_RE`, defined in `loop-bounds.mjs`
// beside the heartbeat deadline it suspends (the driver's export set is the frozen seventeen of
// 53/FF-5302, so the pattern lives in a leaf this module already imports rather than on its door).
const PROVIDER_WAIT_WINDOW = 4096;
const ANSI_ESCAPE_RE = /\[[0-9;?]*[ -/]*[@-~]/gu;

// TASK COMPLETION, DETECTED FROM THE TRANSCRIPT (VERIFICATION F-38.06h, live soak
// 2026-07-25). An interactive `claude` session NEVER exits after finishing a slash
// command — it returns to its idle prompt and stays alive — so `term.onExit` (the
// driver's only `done` signal) never fires, and a completed directive reads `running`
// FOREVER (measured live: a refine that finished at 14:00 was still `running` at 14:50,
// its session parked). claude Code itself records the turn's end in the SAME transcript
// the session-id watch already reads, with ZERO model cooperation: once the directive
// is done, the last assistant record carries `message.stop_reason: "end_turn"`. This
// watch settles the outcome from THAT clean signal — `done`, or `needs-input` when the
// finished turn carries the sentinel (the same producer the PTY-scan path relies on,
// read here off the clean transcript instead of the escape-laden full-screen PTY
// stream, where line-delimited scanning is unreliable). Injected exactly like the
// session-id watch (`options.watchTranscriptCompletion`, default below), so every test
// omits it or injects a double and no test run reads a real transcript.
const COMPLETION_POLL_MS = 1500;

// COMPLETION_IDLE_MS — VERIFICATION (premature-done, live soak 2026-07-25; REVISED
// 2026-07-26 after the SAME truncation recurred at 5 minutes). `end_turn` means "the
// MODEL finished speaking", NOT "the WORK is finished". The ~3s window truncated
// `/aof:continue 18` at 14.7 min (measured); the 5-minute window truncated the same
// milestone's next run a day later — a background story build is routinely quiet for
// longer than ANY comfortable fixed window, so the window is not the fix. Two
// structural changes replace the constant-tuning:
//
//   1. The idle clock now reads the WHOLE SESSION TREE — the parent transcript AND
//      every file under `<projectsDir>/<sessionId>/` (work-observe.mjs's own
//      subagents layout) — so a parked parent whose background agents are still
//      writing THEIR transcripts is never "quiet" at all.
//   2. A DECLARED completion (the DIRECTIVE_COMPLETE sentinel above, mirrored on
//      NEEDS_INPUT's producer/detector pair) settles after the SHORT confirmation
//      window below — the model said it finished; waiting minutes adds nothing.
//
// This long window remains ONLY as the undeclared-outcome fallback (a session that
// finished but forgot the sentinel), aligned with the system's standing 15-minute
// staleness constant (DEFAULT_HEARTBEAT_MS). A late `done` costs
// time; a premature `done` destroys work and reports success. Injectable clock, so
// tests never wall-wait.
export const COMPLETION_IDLE_MS = DEFAULT_HEARTBEAT_MS;

// The declared-outcome confirmation window: long enough to survive a transcript
// flush mid-write, nowhere near a wait a human would notice.
export const DECLARED_COMPLETION_IDLE_MS = 10 * 1000;

// HUMAN_INPUT_TOOL_NAMES — the closed set of tools whose PENDING call means the session is
// waiting on a human. Its one home is the transcript family (131/ADR-002); re-exported here.
export { HUMAN_INPUT_TOOL_NAMES };

// readTranscriptTerminalOutcome(file) => { outcome, declared } | null — the
// transcript's SETTLED outcome, or null while the session is still working. Scans the
// jsonl from the end for the last assistant record: `stop_reason: "end_turn"` means
// the turn is DONE (the autonomous session has nothing left and is waiting) —
// `needs-input` if that turn's own text carries the sentinel, else `done`. `declared`
// is true when the finished turn EXPLICITLY declared its outcome (either sentinel) —
// the watch settles a declared outcome fast, and makes an undeclared one out-wait the
// long idle window. A `tool_use` turn whose UNANSWERED call is a human-input tool
// (HUMAN_INPUT_TOOL_NAMES above) is `needs-input`, declared — the session is waiting
// on a person, not working; any user/tool_result record AFTER it means it was
// answered and the session is live again. Every other pending stop_reason is "still
// working" -> null. NEVER throws (an absent or half-written file is simply "nothing
// settled yet").
async function readTranscriptTerminalOutcome(file, sinceOffset = 0) {
  // The scan is the transcript family's (131/ADR-002): this is a mapping over its one reader,
  // with the four answers it has always given. The RESUME baseline rides through unchanged — a
  // resumed session's transcript already ends in the outcome it parked with (m42, measured
  // 2026-07-27), so only what the resumed process writes after `sinceOffset` counts.
  const turn = await readLastAssistantTurn(file, sinceOffset);
  if (turn == null || turn.stopReason == null) return null;
  if (turn.stopReason !== "end_turn") {
    // A pending HUMAN-INPUT tool call with no answer behind it is a session waiting on a
    // person — declared, and `pending: true` because the question is live mid-turn.
    if (turn.stopReason === "tool_use" && !turn.answered && turn.humanInputTool != null) {
      return { outcome: "needs-input", declared: true, pending: true };
    }
    return null;
  }
  const lines = turn.text.split("\n").map((line) => line.trim());
  if (lines.some((line) => line === NEEDS_INPUT_SENTINEL)) return { outcome: "needs-input", declared: true };
  return { outcome: "done", declared: lines.some((line) => line === DIRECTIVE_COMPLETE_SENTINEL) };
}

// latestSessionActivityMtimeMs(projectsDir, sessionId) — the newest mtime across the
// session's WHOLE transcript tree: the parent `<sessionId>.jsonl` plus every file
// under `<projectsDir>/<sessionId>/` (recursively — work-observe.mjs reads subagent
// transcripts from `<sessionId>/subagents/*.jsonl`, and this must never re-guess
// that layout narrowly: any file claude writes under the session's own directory is
// session activity). Returns -1 when nothing exists. NEVER throws — an absent file
// or directory is simply "no activity there".
async function latestSessionActivityMtimeMs(projectsDir, sessionId) {
  const mtimeOf = async (p) => {
    try {
      return (await stat(p)).mtimeMs;
    } catch {
      return -1;
    }
  };
  let latest = await mtimeOf(path.join(projectsDir, `${sessionId}.jsonl`));
  const walk = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // absent dir — a session with no subagents yet
    }
    for (const entry of entries) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(p);
      } else {
        const m = await mtimeOf(p);
        if (m > latest) latest = m;
      }
    }
  };
  await walk(path.join(projectsDir, sessionId));
  return latest;
}

// defaultWatchTranscriptCompletion({ cwd, env, sessionId, signal, pollMs, idleMs,
// declaredIdleMs, now }) => Promise<{ outcome, declared }|null> — polls the session's
// transcript for the settled outcome above and fires only once that outcome has held
// across a quiet stretch of the WHOLE SESSION TREE (latestSessionActivityMtimeMs —
// parent transcript + subagent transcripts; a parked parent over live background
// agents is NOT quiet). The stretch a settled outcome must hold for depends on how it
// settled: a DECLARED outcome (either sentinel in the finished turn) confirms after
// the short `declaredIdleMs`; an undeclared `end_turn` is a guess and must out-wait
// the long `idleMs` fallback window (see COMPLETION_IDLE_MS's note for the two live
// truncations that shaped this). Resolves null on abort (the driver's finish() aborts
// it via the SAME watchController the session-id watch uses, the moment any outcome
// is known first) — never throws.
export async function defaultWatchTranscriptCompletion({
  cwd, env, sessionId, signal,
  pollMs = COMPLETION_POLL_MS,
  idleMs = COMPLETION_IDLE_MS,
  declaredIdleMs = DECLARED_COMPLETION_IDLE_MS,
  now = () => Date.now(),
  // The resume baseline (see readTranscriptTerminalOutcome): only records
  // written AFTER this byte offset count as an outcome. 0 = a fresh session.
  sinceOffset = 0,
  // m42 "interactive worker terminals" introduced the LIVE-QUESTION report pair.
  // 69/05 (ADR-007) changes what follows detection: a PENDING human-input outcome
  // parks immediately instead of holding this PTY through `idleMs`. onPendingInput
  // still fires once so the existing assignment surface records `needs-input`;
  // then the watch settles and the driver's one finish path terminates the PTY.
  // The conversation survives under sessionId and is continued by the existing
  // `claude --resume` path. No human-input timer is added: direct detection is the
  // trigger, while the separately-owned heartbeat deadline remains the backstop.
  // The SENTINEL needs-input (the turn deliberately ENDED on the protocol line)
  // keeps the short declared window — that turn is over; parking is correct.
  onPendingInput,
  onPendingInputCleared,
} = {}) {
  if (typeof sessionId !== "string" || sessionId.length === 0) return null;
  const projectsDir = claudeProjectsDir({ cwd, env });
  const file = path.join(projectsDir, `${sessionId}.jsonl`);
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    let lastMtimeMs = -1;
    // The instant the transcript's mtime last CHANGED — the start of the current quiet
    // stretch. A settled outcome only counts once this stretch reaches `idleMs`.
    let stableSince = null;
    // NOT named `finish` — the driver's own `finish()` is the anchor
    // acd-terminal-view-live-observable's inv.8 detector pins by the FIRST
    // `const finish =` in this file; a second one here would shadow it.
    const settleWatch = (value) => {
      if (settled) return;
      settled = true;
      if (timer != null) clearTimeout(timer);
      try { signal?.removeEventListener?.("abort", onAbort); } catch (error) { /* no signal */
      reportDegrade("mesh-worker-execution", error); }
      resolve(value);
    };
    const onAbort = () => settleWatch(null);
    if (signal?.aborted) { resolve(null); return; }
    try { signal?.addEventListener?.("abort", onAbort, { once: true }); } catch (error) { /* no signal */
      reportDegrade("mesh-worker-execution", error); }

    // The live-question latch: true while a pending human-input outcome has been
    // reported and not yet answered — flips the report pair exactly once per episode.
    let pendingReported = false;
    const firePending = (fn) => {
      try {
        const result = fn?.();
        if (result && typeof result.catch === "function") {
          result.catch((error) => reportDegrade("mesh-worker-execution", error));
        }
      } catch (error) {
        // a report fault never disturbs the watch itself.
        reportDegrade("mesh-worker-execution", error);
      }
    };
    const tick = async () => {
      if (settled) return;
      // The quiet-stretch clock reads the WHOLE session tree, never just the parent
      // file — a parked parent whose background agents are still writing THEIR
      // transcripts is a session mid-work, not a quiet one (the exact truncation
      // measured live on `/aof:continue 18`, twice).
      const mtimeMs = await latestSessionActivityMtimeMs(projectsDir, sessionId);
      const outcome = await readTranscriptTerminalOutcome(file, sinceOffset);
      // ANY movement anywhere in the tree restarts the quiet stretch — the session is
      // alive (a background agent wrote, a new turn began, a tool ran).
      if (mtimeMs !== lastMtimeMs) {
        lastMtimeMs = mtimeMs;
        stableSince = now();
      }
      // The live-question report pair (see the parameter note above): detected →
      // report once. 69/05 then parks immediately; it never burns the long idle
      // window while a human-input tool is visibly pending.
      const pendingNow = outcome?.pending === true;
      if (pendingNow && !pendingReported) {
        pendingReported = true;
        firePending(onPendingInput);
      } else if (!pendingNow && pendingReported) {
        pendingReported = false;
        firePending(onPendingInputCleared);
      }
      if (pendingNow) {
        settleWatch(outcome);
        return;
      }
      // A DECLARED outcome (the model printed its sentinel) confirms after the short
      // window; an undeclared `end_turn` is a guess and must out-wait the long
      // fallback window (the premature-done defect both windows exist to close).
      // Pending live questions returned above and use neither window.
      const requiredIdleMs = outcome?.declared === true ? declaredIdleMs : idleMs;
      if (outcome != null && mtimeMs >= 0 && stableSince != null && now() - stableSince >= requiredIdleMs) {
        settleWatch(outcome);
        return;
      }
      if (!settled) timer = setTimeout(tick, pollMs);
    };
    timer = setTimeout(tick, pollMs);
  });
}

// defaultPtySpawn — the REAL production PTY factory: EXACTLY the seam
// terminal-ws.mjs's own `/ws/terminal` route spawns through (createTerminalSpawn +
// loadNodePty), imported rather than re-implemented, so a real run resolves node-pty
// through the ONE existing loader (the SEA-vs-dev branch terminal-ws.mjs already
// owns) — never a second, drifting spawn path. node-pty itself is loaded lazily
// INSIDE loadNodePty (never at this module's own top-level import), so importing
// mesh-worker-execution.mjs never requires the native addon either.
export const defaultPtySpawn = createTerminalSpawn(loadNodePty);

// milestone 38 / story 05 fix (live two-machine soak 2026-07-25, VERIFICATION F27) —
// how long to wait after spawning the interactive claude session before typing the
// directive command into its PTY, so the write lands AFTER claude's TUI is READY. A
// t=0 write raced claude's startup: the keystrokes were LOST and claude sat idle at an
// empty prompt forever, never starting a session (no transcript -> no sessionId ->
// nothing for the story-06 terminal view to bind to). The driver itself defaults to 0
// (immediate next-tick write) so the test suites stay fast; mesh-launcher wires THIS
// value for the real run (the F12 "production supplies the real seam" discipline).
export const INTERACTIVE_COMMAND_READY_DELAY_MS = 5000;

const ESC = String.fromCharCode(27);

// 70/06 — the BRACKETED PASTE control sequences the directive body is wrapped in, and
// how long to wait after that body before sending the Enter that submits it.
//
// Bracketed paste is a terminal protocol claude's TUI opts into at startup (it emits
// CSI ?2004h, measured ~1.9s after spawn — comfortably inside the readiness delay
// above). Wrapping the body in it is what makes a multi-line directive arrive as ONE
// atomic input: written raw, a 43-line brief was torn into EIGHT user turns at the
// ConPTY input-chunk boundaries. The Enter must then be its OWN write — a `\r` in the
// same write as the paste is swallowed by the end-of-paste handling and the directive
// sits in the input box, unsubmitted, until the run times out.
//
// Unlike INTERACTIVE_COMMAND_READY_DELAY_MS, this is NOT wired by the call sites and is
// not exported: the driver DERIVES it from the `commandDelayMs` the caller already
// supplies (see the write site below for why one decision drives both). It stays
// overridable through `options.submitDelayMs` for a test that wants to own the window.
const BRACKETED_PASTE_START = `${ESC}[200~`;
const BRACKETED_PASTE_END = `${ESC}[201~`;
const INTERACTIVE_COMMAND_SUBMIT_DELAY_MS = 900;

// 2026-09-24 — READINESS IS OBSERVED, NOT ASSUMED. `INTERACTIVE_COMMAND_READY_DELAY_MS` is a
// guess about how long claude takes to start, and under load the guess was wrong: three lanes
// launched together in a downstream project (plus the repo's MCP servers starting) had the
// directive pasted before the TUI was listening — no transcript, no session id, and each lane
// idled to the 20-minute heartbeat deadline, three attempts running. The TUI announces its own
// readiness by enabling bracketed paste (`TUI_READY_MARKER`); a real launch now types only
// once BOTH the delay has passed (the measured-good floor) AND the marker has been seen,
// bounded by `INTERACTIVE_READY_CAP_MS` — after which it types anyway and says so.
const TUI_READY_MARKER = `${ESC}[?2004h`;
const INTERACTIVE_READY_CAP_MS = 60_000;
// …and ACCEPTANCE IS OBSERVED TOO. A submitted directive starts a session, and a session
// writes its transcript, which is what the session-id watch resolves on. A real launch whose
// submit produced no session id within `DIRECTIVE_ACCEPT_TIMEOUT_MS` is stopped as `failed /
// timeout` (retryable) in about a minute and a half rather than twenty, with what the screen
// last showed recorded under `directive-not-accepted` — a dialog nobody could see names itself.
const DIRECTIVE_ACCEPT_TIMEOUT_MS = 90_000;
const SCREEN_TAIL_CHARS = 600;
// The Enter key is a CARRIAGE RETURN. F27b measured the alternative at the soak:
// a trailing line feed enters the text and never submits it (it is Ctrl+J).
const SUBMIT_KEY = String.fromCharCode(13);

// ── the SESSION-ATTACHMENT VECTOR (the env keys a spawned run must never inherit) ──
//
// Hoisted out of the scrub loop below at 63/02 so the unattended branch can reuse the ONE
// predicate rather than carry a second copy of the list. The list itself, the reasoning for
// every key on it and the measurements behind them are unchanged and stay at the loop.
const isSessionAttachmentKey = (key) => key.startsWith("VSCODE_")
  || key === "TERM_PROGRAM"
  || key === "TERM_PROGRAM_VERSION"
  || key.startsWith("CLAUDE_CODE_")   // includes CLAUDE_CODE_SSE_PORT, the original IDE vector
  || key === "CLAUDECODE"
  || key === "CLAUDE_PID"
  || key === "CLAUDE_EFFORT"
  || key === "CLAUDE_AGENT_SDK_VERSION";

// ── the FOURTH ENFORCEMENT POINT's refusal vocabulary (63/ADR-005 §2) ──
//
// Three answers, deliberately three rather than one. "the caller never consulted the
// declaration", "the declaration admits no unattended launch at all" and "the request is not
// the launch the declaration names" fail for different reasons and a caller can act on each
// differently; folding them together is the `?? <empty>` defect this milestone has already
// produced three times — a seam turning "unknown" into "known-absent" while reporting
// success. They are NOT exported: FF-5302 pins this module's export set at the frozen
// seventeen, and the codes are observable on the answer itself.
const UNATTENDED_DECLARATION_NOT_SUPPLIED = "unattended-launch-declaration-not-supplied";
const UNATTENDED_LAUNCH_NOT_DECLARED = "unattended-launch-not-declared";
const UNATTENDED_LAUNCH_REFUSED = "unattended-launch-refused";

// A refusal carries NOTHING a determined caller could still spawn — no program, no argv, no
// environment. A refusal with a half-built launch hanging off it is a launch with a warning
// attached, and the warning is the part that gets dropped.
const refuseUnattendedLaunch = (code, memberId, detail) => ({ refused: true, code, memberId: memberId ?? null, detail });

// resolveInteractiveDriverLaunch(driver, options) — task 00's seam: resolves the
// interactive launch EXCLUSIVELY through terminal-providers.mjs's `resolveProvider`
// (`buildArgs()` — the empty-args interactive form; `buildEnv()`), never a hand-built
// argv. Returns null (never throws) on an unknown provider id or an unresolvable
// binary — the caller turns that into a coded `failed` outcome, the SAME
// honest-degrade discipline terminal-ws.mjs's own provider gate keeps.
//
// ADR-013 AMENDMENT (F-38.05, option C) — the interactive launch APPENDS a
// worker-scoped `--append-system-prompt NEEDS_INPUT_INSTRUCTION`: this is the
// NEEDS_INPUT sentinel's real producer. Worker-only by construction — the human
// `/ws/terminal` route (terminal-ws.mjs) calls `resolveProvider` directly and never
// calls this function, so a human session's system prompt is never touched.
// ─────────────────────────── the OTel spawn attribution (68/ADR-005 §2) ──────────
//
// The OTel surface is env-set-at-spawn ONLY — aof builds no receiver (FF-6808). The
// environment carries the resource attributes that identify the run's work, so a
// project that runs its OWN collector gets correctly-attributed telemetry for free;
// every figure this milestone produces is correct with no collector running anywhere.
// The PURE builder + env keys live in ./otel-attribution.mjs (imported here, not
// re-exported — this module's own export contract is frozen); this seam SETS them.
import { buildOtelResourceAttributes, OTEL_RESOURCE_ATTRIBUTES_ENV_KEY, OTEL_TELEMETRY_ENV_KEY } from "./otel-attribution.mjs";
// milestone 70 / story 00 (ADR-001/002) — the PHASE BRIEF. The pure compiler lives in
// ./phase-brief.mjs (imported here, NOT re-exported — this module's own export contract is
// frozen at seventeen); the seam composes the session's FIRST INPUT from the command plus
// `brief.context` so the phase is handed its context BY VALUE. A caller that supplies no
// compiled context gets exactly today's behaviour (composePhaseBriefInput returns the bare
// command).
import { composePhaseBriefInput } from "./phase-brief.mjs";

// resolveUnattendedLaunch(options, env) — the envelope's admission. Module-private (FF-5302
// freezes this file's export set at seventeen); every answer it can give is observable on
// the value the one exported seam returns.
//
// Answers: a launch object `{ bin, args, env, unattended, memberId }` when the request IS the
// declared launch, and a coded refusal otherwise. NEVER the ordinary session shape — a quiet
// fallback here would produce the unattended session this point exists to refuse — and never
// `null`, which is reserved for the runtime that could not be resolved at all, an answer this
// seam has always given and a caller must be able to tell apart from a refusal.
function resolveUnattendedLaunch(options, env) {
  const request = options.unattended;
  if (!Object.hasOwn(options, "declaredLaunch")) {
    return refuseUnattendedLaunch(
      UNATTENDED_DECLARATION_NOT_SUPPLIED,
      null,
      "an unattended launch was requested without the compiled declaration that says what may run unattended.",
    );
  }
  const declared = options.declaredLaunch;
  if (declared == null || typeof declared !== "object" || typeof declared.program !== "string" || !Array.isArray(declared.args)) {
    return refuseUnattendedLaunch(
      UNATTENDED_LAUNCH_NOT_DECLARED,
      declared?.memberId ?? null,
      "the frozen set this workspace compiles admits no unattended launch.",
    );
  }
  const memberId = declared.memberId ?? null;
  if (request == null || typeof request !== "object" || Array.isArray(request)) {
    return refuseUnattendedLaunch(UNATTENDED_LAUNCH_REFUSED, memberId, "the unattended request is not an object naming a program and its arguments.");
  }
  if (request.program !== declared.program) {
    return refuseUnattendedLaunch(UNATTENDED_LAUNCH_REFUSED, memberId, "the unattended request does not name the program the declaration names.");
  }
  const args = request.args;
  // The declared argv is a PREFIX, in order: a run may carry its own scope after the declared
  // tokens, and may not reorder them, drop one, or splice anything in before them.
  if (!Array.isArray(args) || args.length < declared.args.length || declared.args.some((token, index) => args[index] !== token)) {
    return refuseUnattendedLaunch(UNATTENDED_LAUNCH_REFUSED, memberId, "the unattended request does not begin with the arguments the declaration names, in the order it names them.");
  }
  // The env an unattended run inherits is scrubbed of the same attachment vectors a session's
  // is, and gains NOTHING a session gains: no terminal session identity, no provider marker,
  // no session prompt-cache window. Nothing about this launch says "session".
  const unattendedEnv = { ...env };
  for (const key of Object.keys(unattendedEnv)) {
    if (isSessionAttachmentKey(key)) delete unattendedEnv[key];
  }
  return { bin: declared.program, args: [...args], env: unattendedEnv, unattended: true, memberId };
}

export function resolveInteractiveDriverLaunch(driver, options = {}) {
  const providerId = typeof driver === "string" && driver.length > 0 ? driver : "claude";
  const provider = resolveProvider(providerId, options.which);
  if (!provider) return null;
  const env = options.env ?? process.env;
  const bin = provider.resolveBinaryPath(env);
  if (bin === null) return null;
  // 63/02 (ADR-005 §2) — THE FOURTH ENFORCEMENT POINT, and the ONE branch this function
  // gains. Everything below it is byte-unchanged and reached by every ATTENDED launch:
  // every human session, every `work:drive-<phase>` session and all three single-phase mesh
  // directives resolve exactly the argv and the scrubbed env they resolved before.
  //
  // A run cannot skip a gate the loop walks; what CAN skip it is a launch that is a session
  // instead of a loop. So the only thing this envelope can usefully enforce is that an
  // unattended launch is the launch the declaration names — and refusing is not a side
  // effect of this point, it IS the point. `options.unattended` is the REQUEST (a caller's
  // proposed program and arguments); `options.declaredLaunch` is what the workspace's
  // compiled frozen set ADMITS (`compileFrozenSet(...).unattendedLaunch`). This module
  // spells no program of its own — ADR-010 §2: the declaration is the sole speller, so the
  // launch a resolver requests and the launch the frozen set admits cannot disagree.
  //
  // Presence, not truthiness: `Object.hasOwn` is what keeps "no unattended launch was asked
  // for" and "an unattended launch was asked for with nothing in it" two different answers.
  // A `!= null` test here would send an empty request down the ATTENDED path and hand back
  // the ordinary session shape — which is precisely the run this point exists to prevent,
  // produced while reporting success.
  if (Object.hasOwn(options, "unattended")) {
    return resolveUnattendedLaunch(options, env);
  }
  // milestone 38 / story 05 fix (live two-machine soak 2026-07-25, VERIFICATION F24) —
  // run the worker session in `--permission-mode auto`, NOT bypassPermissions: a genuine
  // tool-permission pause STILL surfaces as NEEDS_INPUT for a human to answer remotely
  // (the terminal-stream + notify loop this milestone exists to enable), but the mode
  // never blocks on the routine approvals a headless run must clear. This is DISTINCT
  // from the one-time folder-TRUST dialog (cleared pre-spawn by ensureWorktreeTrusted
  // below) — trust fires BEFORE the system prompt is read, so no in-session mode can
  // catch it.
  // milestone 70 / story 01 (ADR-004) — the SHAREABLE-PREFIX flag. `claude`'s prompt
  // cache is "effectively scoped to one machine and directory… That includes worktrees
  // of the same repository, since each worktree has its own working directory" — so a
  // dispatch that mints one worktree per story is cold against every other story by
  // construction. `--exclude-dynamic-system-prompt-sections` moves cwd, env info,
  // memory paths and git status OUT of the system prompt and into the first user
  // message, "so identical configurations share a cache entry across users and
  // machines." ADR-004 makes its enabling condition structural: the flag is silently
  // inert under `--system-prompt`, and aof appends (never replaces) its system prompt —
  // the `--append-system-prompt` pair below — so the flag applies. FF-7004 makes a
  // future migration to `--system-prompt` loud. The two travel TOGETHER in this one
  // argv builder; a launch that carries the flag but not the append form is a launch
  // whose flag is inert, and FF-7004 refuses it.
  const args = [...provider.buildArgs(), "--permission-mode", "auto", "--exclude-dynamic-system-prompt-sections", "--append-system-prompt", WORKER_SESSION_INSTRUCTION];
  // milestone 70 / story 01 (ADR-005) — the SESSION model and effort are CHOSEN, not
  // inherited: `--model` and `--effort` resolved per phase (from `work.agents.session`,
  // never `work.agents.models` — see src/session-model.mjs) and passed explicitly so
  // the cache key is a decision rather than whatever the session happened to default
  // to. Absent (`options.session` unset, or no routing for this phase) → neither flag,
  // byte-identical to today.
  const session = options.session ?? {};
  if (typeof session.model === "string" && session.model.length > 0) args.push("--model", session.model);
  if (typeof session.effort === "string" && session.effort.length > 0) args.push("--effort", session.effort);
  // m42 terminal-resume — the ONE additive launch variation: re-attach to a
  // persisted conversation instead of starting fresh. Everything else about the
  // launch (permission mode, worker instruction, env) is deliberately identical.
  if (typeof options.resumeSessionId === "string" && options.resumeSessionId.length > 0) {
    args.push("--resume", options.resumeSessionId);
  }
  const sessionEnv = provider.buildEnv(options.terminalSessionId ?? randomUUID(), env);
  // A WORKER session must NEVER attach to a human's IDE (measured live
  // 2026-07-27: the daemon was started from a VS Code terminal, so every
  // spawned claude inherited CLAUDE_CODE_SSE_PORT + TERM_PROGRAM=vscode +
  // VSCODE_* and silently attached itself to the operator's OWN VS Code — the
  // session footer read "In <file>" from the human's editor, and the pty's
  // stdin went DEAD to typed input while the IDE channel held the session.
  // That is both the interactive-terminal input killer AND a wrong-surface
  // routing hazard (permission prompts to an editor nobody is watching). The
  // worker launch env is scrubbed of the IDE-attachment vector; everything
  // else rides through untouched.
  //
  // milestone 70 / story 06 — the SAME vector, one layer out: a worker session must not
  // present as a CHILD of somebody else's Claude Code session either. When the loop is
  // driven from inside a Claude Code session (which is how this milestone was built),
  // the spawn inherits `CLAUDECODE`, `CLAUDE_CODE_CHILD_SESSION`,
  // `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_MESSAGING_SOCKET`/`_TOKEN` and friends.
  // Measured 2026-08-24 on claude 2.1.241: with those inherited the session boots, the
  // directive submits and a real turn runs to completion — and NO transcript is ever
  // written to `~/.claude/projects/<slug>/`. With the same launch and the same
  // directive under a scrubbed env the transcript appears ~2s after the write. A
  // driver whose whole completion + attribution chain reads the transcript
  // (sessionId -> spend -> the phase ratio) is therefore silently blind: the run has
  // no session id, `spend` is never stamped, and the report says `unmeasured`.
  // `CLAUDE_EFFORT` rides in the same set for a second reason — it would override the
  // per-phase `--effort` ADR-005 resolves, making the cache key an accident again.
  // Everything aof itself sets is set AFTER this loop, so the scrub can never eat it.
  for (const key of Object.keys(sessionEnv)) {
    if (isSessionAttachmentKey(key)) delete sessionEnv[key];
  }
  // milestone 70 / story 01 (ADR-005) — the ONE-HOUR prompt-cache TTL, held
  // deliberately. claude's 1-hour prompt-cache window is automatic on a subscription
  // but DROPS TO 5 MINUTES on usage credits unless this variable is set. Set HERE,
  // AFTER the IDE-attachment scrub above, so the scrub can never delete it — the same
  // seam, and for the same reason, as 68/01's OTel keys below. A window that silently
  // halves itself depending on how the account is billed is a window held by accident.
  sessionEnv.ENABLE_PROMPT_CACHING_1H = "1";
  // 68/ADR-005 §2 (story 68/01) — the OTel spawn attribution, added AFTER the scrub so
  // the IDE-attachment removal above can never delete it (the scrub removes only
  // VSCODE_* / CLAUDE_CODE_SSE_PORT / TERM_PROGRAM* — the OTEL_* keys ride through
  // untouched). Set when the caller supplies attribution; absent → no OTEL surface.
  if (options.attribution != null) {
    const resourceAttributes = buildOtelResourceAttributes(options.attribution);
    if (resourceAttributes.length > 0) {
      sessionEnv[OTEL_RESOURCE_ATTRIBUTES_ENV_KEY] = resourceAttributes;
    }
    // Telemetry emission is enabled in the spawned environment so the attributes have
    // a receiver to ride to — a collector if and only if the project runs one.
    sessionEnv[OTEL_TELEMETRY_ENV_KEY] = "1";
  }
  // 69/01: PostToolUse records consumption, not a timer ping. The hot hook receives
  // both identities as process-local data and derives no workspace identity itself.
  if (typeof options.heartbeat?.itemDir === "string" && typeof options.heartbeat?.runId === "string") {
    sessionEnv.AOF_RUN_ITEM_DIR = options.heartbeat.itemDir;
    sessionEnv.AOF_RUN_ID = options.heartbeat.runId;
  }
  return { bin, args, env: sessionEnv, providerId };
}

// ensureWorktreeTrusted — the claude folder-TRUST pre-write. The implementation moved
// to claude-trust.mjs (2026-07-26) so the board's own local terminal spawn can share it
// without importing this module (which already imports terminal-ws.mjs — that would be
// a cycle). Re-exported here so every existing importer is untouched.
export { ensureWorktreeTrusted } from "./claude-trust.mjs";

// driveInteractiveClaudeSession(brief, options) — the ADR-013 driver: ONE long-lived
// interactive session for `brief`'s whole run. `brief` carries { itemRef,
// worktreeCwd, task, command } — `command` is the directive's WHOLE command string
// (task 01, typed as ONE `pty.write`); `worktreeCwd` is the PTY's cwd.
// `options.ptySpawn` is the INJECTED spawn seam (default `defaultPtySpawn`, the REAL
// node-pty factory above); `options.which` is the INJECTED provider-binary-
// resolution seam (default real PATH lookup, the SAME terminal-providers.mjs
// default); `options.watchTranscriptSessionId` is the INJECTED transcript-dir-watch
// seam (ADR-013 amendment; default `defaultWatchTranscriptSessionId` above);
// `options.onSessionIdCaptured(sessionId)` is the OPTIONAL live-report hook (ADR-013
// AMENDMENT 2026-07-23, invariant 7 — called at most ONCE, the moment the watch
// first resolves a real id, i.e. MID-RUN; absent by default);
// `options.onSessionEnd(sessionId)` is the OPTIONAL END-OF-STREAM hook (ADR-014
// AMENDMENT 2026-07-23, invariant 8 — called ONCE from the single `finish()` settle
// point, for ALL THREE outcomes, after the session id is resolved; absent by
// default, and DISTINCT from `onOutputChunk` by construction). Resolves
// `{ outcome: "done"|"failed"|"needs-input", sessionId, failureReason? }` — NEVER
// throws (an unresolvable provider/binary or a spawn fault is a coded `failed`
// outcome, matching the OLD defaultSpawnRuntime's own never-throw contract).
export async function driveInteractiveClaudeSession(brief, options = {}) {
  const ptySpawn = options.ptySpawn ?? defaultPtySpawn;
  const watchTranscriptSessionId = options.watchTranscriptSessionId ?? defaultWatchTranscriptSessionId;
  const launch = resolveInteractiveDriverLaunch(options.driver, options);
  // 63/02 — a refused unattended launch (ADR-005 §2) carries no program, argv or env, so it
  // must never reach the spawn below. It joins the unresolvable-runtime answer at the SAME
  // never-throw coded outcome; the two stay distinguishable at the seam that produced them.
  if (launch == null || launch.refused === true) {
    return { outcome: "failed", failureReason: "agent_error", sessionId: null, processStarted: false };
  }

  // A resumed conversation already has both its identity and its transcript. Capture
  // the completion baseline BEFORE the replacement PTY can append anything, and do
  // not ask the new-basename watcher to discover an id that cannot become "new".
  // Fresh sessions keep the original watch path and a zero baseline.
  const resumedSessionId = typeof options.resumeSessionId === "string" && options.resumeSessionId.length > 0
    ? options.resumeSessionId
    : null;
  let resumedSinceOffset = null;
  if (resumedSessionId != null) {
    try {
      resumedSinceOffset = (await stat(path.join(
        claudeProjectsDir({ cwd: brief.worktreeCwd, env: launch.env ?? process.env }),
        `${resumedSessionId}.jsonl`,
      ))).size;
    } catch (error) {
      // The caller's availability probe is the admission decision. A disappearance
      // after that probe is visible as this launch's ordinary failure/retry; the
      // driver never disguises an arbitrary failed process as a cold second launch.
      reportDegrade("resume-transcript-baseline-unavailable", error);
    }
  }

  // Pre-trust the worktree so claude's one-time folder-TRUST dialog never blocks this
  // autonomous run (VERIFICATION F24). Worker-only by construction — this driver is the
  // worker path; the human /ws/terminal route never calls it. An INJECTED seam (the
  // launcher wires the real ensureWorktreeTrusted; every test omits it, so no test run
  // ever touches a real ~/.claude.json). Best-effort — never throws out of the driver.
  if (typeof options.trustWorktree === "function") {
    try {
      await options.trustWorktree(brief.worktreeCwd);
    } catch (error) {
      // leave claude's own (blocking) dialog in place — the pre-fix behavior.
      reportDegrade("mesh-worker-execution", error); }
  }

  // 129/02 (ADR-005 §2; ruling 2026-09-13) — a caller's `options.signal` ALREADY aborted here
  // never spawns: the stop was asked for before there was a session to stop, so the answer is
  // the cancel's own coded outcome with `processStarted: false`, the same never-throw shape as
  // the two pre-spawn refusals above, and no `stop-requested` breadcrumb (nothing was
  // requested of a PTY that never existed). Checked immediately before the spawn rather than
  // at entry, so an abort landing during the awaits above cannot slip a session past it.
  if (options.signal?.aborted === true) {
    return { outcome: "failed", failureReason: "cancelled", sessionId: null, processStarted: false };
  }

  let term;
  try {
    term = await ptySpawn(launch.bin, launch.args, {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: brief.worktreeCwd,
      env: launch.env,
    });
  } catch {
    return { outcome: "failed", failureReason: "agent_error", sessionId: null, processStarted: false };
  }
  const attemptStartedAtMs = Date.now();

  // 2026-07-27 (withdraw notify) — hand the caller a kill for THIS live PTY the
  // moment it exists, so a control-side withdrawal can end the run instead of
  // leaving it grinding with a run record stuck `running`. The kill routes through
  // the SAME term.kill() every settle path uses; the caller's registry (not this
  // driver) decides when it may be called. Optional and guarded — every caller
  // that never passes it is byte-identical.
  try {
    options.onPtyLive?.(
      () => {
        try {
          term.kill();
        } catch (error) {
          reportDegrade("mesh-worker-execution", error);
        }
      },
      // m42 "interactive worker terminals" — the ADDITIVE second argument: a write
      // into THIS live PTY, the input direction's one seam (the same term.write the
      // driver itself types the directive command through). The caller's registry —
      // never this driver — decides which frames may reach it; a caller that reads
      // only the first argument is byte-identical to before.
      //
      // The write REPORTS the target pid (`{ pid }`) so the caller's delivery
      // breadcrumb can name WHICH pty it fed — the correlation handle for the
      // still-open input finding (STATE §OPEN FINDING: bytes provably reach the
      // correct pty, claude does not react). Passive and content-free; it stays
      // until that finding resolves, because resuming the investigation needs it.
      //
      // RETIRED 2026-08-01 — the post-write SIGWINCH resize jiggle (80→81→80,
      // 500ms after every write). It was never instrumentation but an
      // INTERVENTION testing the hypothesis that a forced repaint would prove
      // attachment, and STATE records that hypothesis FALSIFIED ("ignores typed
      // bytes AND SIGWINCH resize jiggles — no repaint, ever"). It bought nothing
      // and mutated terminal geometry on every keystroke of every live session.
      (bytes) => {
        try {
          term.write(String(bytes));
          return { pid: term.pid ?? null };
        } catch (error) {
          reportDegrade("mesh-worker-execution", error);
          return { pid: null };
        }
      },
    );
  } catch (error) {
    reportDegrade("mesh-worker-execution", error);
  }

  // ADR-013 AMENDMENT — the transcript-dir watch is kicked off ALONGSIDE the spawned
  // session (never awaited here: the watch and the driven session run concurrently).
  // `watchController` lets `finish` below stop the watch the moment THIS invocation's
  // own outcome is known — a session that exits (or hits the sentinel) before any
  // transcript ever appears must not leave the watch polling past the point anyone
  // still cares. `watchPromise` NEVER rejects (the seam's own never-throw contract,
  // re-guarded here too) — it resolves the watch's own `string|null` result and, on a
  // non-null resolution, also updates `capturedSessionId` so the story-06
  // `onOutputChunk(chunk, capturedSessionId)` bridge below carries the id on any
  // LATER chunk (mirroring the pre-amendment mid-stream-capture behaviour, now sourced
  // from the watch instead of a PTY marker).
  //
  // ADR-013 AMENDMENT (2026-07-23, structural invariant 7 — BLOCKER F-38.06d): that
  // SAME resolution is also the moment the id must be REPORTED, while the run is
  // still live. `options.onSessionIdCaptured(sessionId)` is the OPTIONAL, ADDITIVE
  // seam the caller (createMeshWorkerExecutionHandler) hangs a live `running` frame on.
  // Called AT MOST ONCE — the watch chain's `.then` runs exactly once by construction,
  // and only for a genuinely non-empty resolution, so a run whose transcript never
  // appears reports NOTHING (it degrades to a null sessionId exactly as before, never
  // a bogus frame, never a crash). Absent by default: every pre-invariant-7 caller is
  // byte-identical.
  const watchController = new AbortController();
  let capturedSessionId = null;
  // The seam CALL ITSELF is guarded, not just its returned promise — an injected test
  // double (or a future producer) that throws SYNCHRONOUSLY rather than returning a
  // rejected promise must never crash this function; `Promise.resolve(...)` alone
  // cannot help against a throw that happens before a promise even exists.
  let watchCallResult;
  try {
    watchCallResult = resumedSessionId ?? watchTranscriptSessionId({
      cwd: brief.worktreeCwd,
      env: launch.env ?? process.env,
      signal: watchController.signal,
    });
  } catch (error) {
    reportDegrade("session-id-watch-unavailable", error);
    watchCallResult = null;
  }
  // Identity resolution and its live-report side effect are deliberately separate.
  // Completion must be armed as soon as the id is known, before a zero-delay command
  // write can append/finish; terminal settlement still awaits the reporting promise
  // so a terminal frame can never overtake the live session-id frame.
  const sessionIdPromise = Promise.resolve(watchCallResult)
    .then((resolved) => {
      const sessionId = typeof resolved === "string" && resolved.length > 0 ? resolved : null;
      if (sessionId != null) capturedSessionId = sessionId;
      return sessionId;
    })
    .catch((error) => {
      reportDegrade("session-id-watch-unavailable", error);
      return null;
    });
  const watchPromise = sessionIdPromise.then(async (resolved) => {
    if (resolved != null) {
      try {
        await options.onSessionIdCaptured?.(resolved);
      } catch (error) {
        reportDegrade("mesh-worker-execution", error);
      }
    }
    return resolved;
  });

  return new Promise((resolve) => {
    let settled = false;
    // A detected human-input stop is not durable until the PTY is actually gone.
    // Keep the requested outcome aside and let onExit confirm it. If node-pty
    // accepts kill() but never reports exit, fail loudly instead of claiming the
    // run parked while its process may still own the slot/worktree.
    let requestedStopOutcome = null;
    let killConfirmationTimer = null;
    const stopBreadcrumb = (phase, extra = {}) => {
      try {
        options.onSessionStop?.({ phase, pid: typeof term.pid === "number" ? term.pid : null, ...extra });
      } catch (error) {
        reportDegrade("session-driver-stop-hook", error);
      }
    };
    const terminateTree = options.terminateTree ?? (options.ptySpawn == null);
    const terminateTreeExec = options.terminateTreeExec ?? execFile;
    let buffer = "";
    let dataSub = null;
    let exitSub = null;
    // F27 — the timer for the READINESS-DELAYED directive-command write (below).
    let commandWriteTimer = null;
    // 70/06 — the timer for the SEPARATED submit (the Enter that follows the body).
    let commandSubmitTimer = null;
    // 2026-09-24 — the readiness gate and the acceptance watch (see TUI_READY_MARKER).
    let tuiReadySeen = false;
    let onTuiReady = null;
    let readyCapTimer = null;
    let acceptTimer = null;
    // m42 wave (b) / TECH_DEBT item 7 — the PTY LIVENESS PROBE (below).
    let livenessTimer = null;
    let startToCloseTimer = null;
    let heartbeatTimer = null;
    // 129/06 F-58 — THE PROVIDER WAIT. Measured 2026-09-15 (loop 127, four attempts): `claude`
    // prints `Usage limit reached · continuing automatically at 1:40pm` (and `You've hit your
    // session limit · resets 1:40pm`) and then waits, alive, for the reset — no transcript
    // progress, so the heartbeat deadline read it as a hung session and killed it after 15
    // minutes, five times, an hour of blind retries against a limit no retry can lift. The
    // instant that line was last seen; while no heartbeat is NEWER than it, the session is
    // waiting on the provider by the tool's own word and the heartbeat rule is suspended —
    // `startToCloseMs` (the attempt's wall clock) still bounds the wait, as it bounds everything.
    let providerWaitSeenAtMs = null;
    let providerWaitReported = false;
    // 129/02 — the caller's abort listener (below), removed at the single settle point.
    let abortListener = null;

    const cleanupSubs = () => {
      try { dataSub?.dispose?.(); } catch (error) { /* already-exited guard (win32) */
      reportDegrade("mesh-worker-execution", error); }
      try { exitSub?.dispose?.(); } catch (error) { /* already-exited guard (win32) */
      reportDegrade("mesh-worker-execution", error); }
      if (abortListener != null) {
        try { options.signal?.removeEventListener?.("abort", abortListener); } catch (error) {
          reportDegrade("mesh-worker-execution", error); }
        abortListener = null;
      }
      // A Windows ConPTY launched through a command shim can report onExit while
      // its native PTY handle still keeps the child's cwd open. Close that handle
      // at the single settle point as well; kill is idempotent/already-exited safe.
      try { term?.kill?.(); } catch (error) { /* already-exited guard (win32) */
      reportDegrade("mesh-worker-execution", error); }
      // never let a queued command write land in an already-exited/settled PTY.
      if (commandWriteTimer != null) { clearTimeout(commandWriteTimer); commandWriteTimer = null; }
      if (commandSubmitTimer != null) { clearTimeout(commandSubmitTimer); commandSubmitTimer = null; }
      if (readyCapTimer != null) { clearTimeout(readyCapTimer); readyCapTimer = null; }
      if (acceptTimer != null) { clearTimeout(acceptTimer); acceptTimer = null; }
      if (livenessTimer != null) { clearInterval(livenessTimer); livenessTimer = null; }
      if (startToCloseTimer != null) { clearTimeout(startToCloseTimer); startToCloseTimer = null; }
      if (heartbeatTimer != null) { clearTimeout(heartbeatTimer); heartbeatTimer = null; }
      if (killConfirmationTimer != null) { clearTimeout(killConfirmationTimer); killConfirmationTimer = null; }
    };

    // finish(result) — settles this invocation EXACTLY once. Aborts the transcript
    // watch (it has nothing left to serve once the outcome is known) and threads the
    // AWAITED, null-degraded session id onto the resolved object: `capturedSessionId`
    // if the watch already resolved one, otherwise whatever the (now-aborting) watch
    // promise itself settles to — deterministic, never race-dependent on which of
    // "the session ended" vs "the watch found a transcript" happened to win first.
    //
    // The watch chain is awaited UNCONDITIONALLY (invariant 7, F-38.06d): it now also
    // carries the live `options.onSessionId` report, so settling it here is what
    // ORDERS the mid-run `running` frame strictly before the caller's terminal frame.
    // When the watch already resolved an id this is an already-settled promise (one
    // microtask), so the pre-invariant-7 timing is otherwise unchanged.
    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanupSubs();
      watchController.abort();
      (async () => {
        let watched = null;
        try {
          watched = await watchPromise;
        } catch {
          watched = null;
        }
        const endedSessionId = capturedSessionId ?? watched;
        stopBreadcrumb("exit-confirmed", { outcome: result.outcome, sessionId: endedSessionId ?? null });
        // milestone 38 / story 06 / task 04 (ADR-014 AMENDMENT 2026-07-23,
        // structural invariant 8; BLOCKER F-38.06e) — THE END OF THE STREAM,
        // PRODUCED. `cleanupSubs()` above just disposed `dataSub`, i.e.
        // `onOutputChunk` will never be called again for this session: that IS the
        // definition of "this stream has ended", and this is the ONE place it is
        // true for ALL THREE outcomes — `done`/`failed` (via term.onExit) AND
        // `needs-input` (via the sentinel branch below, which term.kill()s the PTY
        // first, because a human resumes with a FRESH `claude --resume` on a NEW
        // session; that stream really is over even though the assignment stays
        // `running`). Emitted AFTER the session id is resolved, so the end frame
        // always has the SAME (nodeId, sessionId) tuple to route on that the bytes
        // had (a null-session end would simply be dropped by the mirror, inv.4).
        //
        // A hook DISTINCT from `onOutputChunk` (never a sentinel smuggled through
        // the byte hook — a control message inside terminal bytes is forgeable by
        // the PTY's own output, SECURITY T14), and BEST-EFFORT fire-and-forget: a
        // reporting fault is swallowed and never delays or fails this settle.
        try {
          const ended = options.onSessionEnd?.(endedSessionId);
          if (ended && typeof ended.catch === "function") {
            ended.catch((error) => {
              // a lost end frame is a stale live view, never a correctness fault.
      reportDegrade("mesh-worker-execution", error); });
          }
        } catch (error) {
          // a synchronous end-report fault is never the run's problem either.
      reportDegrade("mesh-worker-execution", error); }
        // Successful/post-spawn outcomes keep the historical public shape. Only
        // the pre-spawn returns above carry `processStarted: false`; resume also
        // observes onPtyLive, so absence here remains the compatible "a process
        // existed" case for older injected spawn seams.
        resolve({ ...result, sessionId: endedSessionId });
      })();
    };

    // THE STOP IS OBSERVABLE, AND ON WINDOWS THE TREE DIES BEFORE THE PTY IS RELEASED
    // (2026-09-12). Three foreground loops have now died — no exit event, no signal, no
    // stack, the recorder's minute-beat simply stopping — inside the same minute this driver
    // killed a session that had just finished, and never on a short one. node-pty's Windows
    // `kill()` forks a console-list agent and `process.kill()`s every pid it finds attached
    // to the pseudoconsole, closes the pseudoconsole WITHOUT awaiting that list, and on the
    // agent's failure falls back to `process.kill(innerPid)` five seconds later — against a
    // pid the OS may already have reused. Reproduced in isolation it signals only the
    // session's own tree; whatever it does at the end of an hour-long session with a tree
    // this driver never enumerated, the loop process is what dies. So: on win32 the session's
    // process tree is terminated FIRST through the OS's own tree kill (`taskkill /T /F` on
    // the pty's pid — what node-pty's list is trying to approximate), and only THEN is the
    // pty released, so the console-list path runs against a tree that is already gone. Every
    // step reports through `options.onSessionStop` (optional, best-effort; the loop wires it
    // to its exit-reason recorder), so the next death — if there is one — is bracketed to
    // the line rather than to the minute. Defaults: an INJECTED `ptySpawn` is a test double
    // whose pid is fiction, so the tree kill is off unless `terminateTree` says otherwise;
    // the real spawner turns it on. `terminateTreeExec` is the injectable runner.
    const releasePty = () => {
      try {
        term.kill();
        stopBreadcrumb("pty-released");
      } catch (error) {
        reportDegrade("mesh-worker-execution", error);
        stopBreadcrumb("pty-release-failed", { error: String(error?.message ?? error) });
        requestedStopOutcome = null;
        finish({ outcome: "failed", failureReason: "pty_kill_failed" });
        return;
      }
      // A real PTY should now emit onExit. The bound is only a confirmation
      // backstop; it is not a human-input deadline and is injectable for tests.
      if (!settled) {
        const killConfirmationMs = options.killConfirmationMs ?? 5_000;
        killConfirmationTimer = setTimeout(() => {
          requestedStopOutcome = null;
          stopBreadcrumb("exit-unconfirmed");
          finish({ outcome: "failed", failureReason: "pty_kill_unconfirmed" });
        }, killConfirmationMs);
      }
    };
    const stopForOutcome = (result) => {
      if (settled || requestedStopOutcome != null) return;
      requestedStopOutcome = result;
      stopBreadcrumb("stop-requested", { outcome: result.outcome, failureReason: result.failureReason ?? null });
      const pid = typeof term.pid === "number" && Number.isFinite(term.pid) && term.pid > 0 ? term.pid : null;
      if (process.platform !== "win32" || !terminateTree || pid == null) {
        releasePty();
        return;
      }
      let released = false;
      const releaseOnce = (detail) => {
        if (released) return;
        released = true;
        stopBreadcrumb("tree-terminated", detail);
        releasePty();
      };
      try {
        terminateTreeExec("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }, (error, stdout, stderr) => {
          releaseOnce({ ok: error == null, detail: String(error?.message ?? stdout ?? stderr ?? "").trim().slice(0, 200) });
        });
      } catch (error) {
        releaseOnce({ ok: false, detail: String(error?.message ?? error) });
      }
    };

    // 129/02 (ADR-005 §2 and §4; ruling 2026-09-13) — THE CALLER'S CANCEL REACHES THE SAME
    // BRACKET. `options.signal` (an `AbortSignal`, beside `onPtyLive`) is the one additive way
    // a caller asks this live session to stop from outside: an abort while the session is live
    // requests `{ failed, cancelled }` through `stopForOutcome` — `stop-requested`, on win32
    // the tree terminate, `pty-released`, `exit-confirmed`, every step reported — and NEVER
    // a bare `term.kill()`, which would orphan the PTY's tree. An abort after the settle is a
    // no-op (the `settled` guard), and one landing after a sentinel stop is already requested
    // and unconfirmed changes nothing (the `requestedStopOutcome` guard): the first stop asked
    // for is the one the exit confirms. The drive child wires this to its stdin's `end`; a
    // caller passing no signal is byte-identical.
    if (options.signal != null && typeof options.signal.addEventListener === "function") {
      abortListener = () => stopForOutcome({ outcome: "failed", failureReason: "cancelled" });
      options.signal.addEventListener("abort", abortListener, { once: true });
      // An abort that landed between the spawn and this registration (a caller aborting from
      // inside its own `onPtyLive`) fires nothing above, so it is honoured here.
      if (options.signal.aborted === true) abortListener();
    }

    dataSub = term.onData?.((chunk) => {
      buffer += String(chunk);
      // The TUI's own readiness signal, read across a chunk boundary.
      if (!tuiReadySeen && buffer.slice(-(String(chunk).length + TUI_READY_MARKER.length)).includes(TUI_READY_MARKER)) {
        tuiReadySeen = true;
        onTuiReady?.();
      }
      // milestone 38 / story 06 (ADR-014) — the cross-machine terminal BRIDGE's
      // ONLY hook into this driver: an OPTIONAL, ADDITIVE `options.onOutputChunk`
      // called with EXACTLY the raw chunk `term.onData` itself just emitted, plus
      // whatever sessionId has been captured so far (possibly still null on an
      // early chunk — ADR-014 invariant 4: an unresolvable frame is dropped
      // downstream, never delivered to the wrong card). This is the SAME "the
      // signal is sourced ONLY from term.onData" discipline SECURITY T14 pins —
      // no credential env, no askpass file, no mint reply is ever read here.
      // Absent by default (every pre-story-06 caller stays byte-identical).
      try {
        options.onOutputChunk?.(chunk, capturedSessionId);
      } catch (error) {
        // a bridge fault must never crash/backpressure the driven session itself.
      reportDegrade("mesh-worker-execution", error); }
      // 129/06 F-58 — the provider-wait line, read off the OUTPUT (the tail of the buffer with
      // the terminal's escapes stripped, since the TUI colours it and a chunk boundary can fall
      // inside the phrase). Reported once as a breadcrumb so the loop's diagnostics name it.
      const providerWait = PROVIDER_WAIT_RE.exec(buffer.slice(-PROVIDER_WAIT_WINDOW).replace(ANSI_ESCAPE_RE, ""));
      if (providerWait != null) {
        providerWaitSeenAtMs = Date.now();
        if (!providerWaitReported) {
          providerWaitReported = true;
          stopBreadcrumb("provider-wait", { detail: providerWait[0].trim().slice(0, 120) });
        }
      }
      // task 02 — the NEEDS_INPUT sentinel yields the THIRD outcome BEFORE any exit
      // is ever observed: a "turn end" is not a process exit, so this driver must
      // detect it from the OUTPUT stream, never wait on onExit for it. Once detected,
      // THIS invocation's job is done — kill the PTY (a human resumes via a FRESH
      // `claude --resume <session_id>` later; RESEARCH §4.3 measured that resume
      // attaches a NEW process to the SAME persisted conversation, never reattaches
      // to a still-running one) and resolve `needs-input`, never `done`.
      if (containsNeedsInputSentinel(buffer)) {
        stopForOutcome({ outcome: "needs-input" });
      }
    }) ?? null;

    exitSub = term.onExit?.(({ exitCode }) => {
      const requested = requestedStopOutcome;
      requestedStopOutcome = null;
      finish(requested ?? (exitCode === 0 ? { outcome: "done" } : { outcome: "failed", failureReason: "agent_error" }));
    }) ?? null;

    // 69/02 (ADR-002/004) — aof owns both per-attempt deadlines because this is
    // the one scope that holds the PTY handle. Callers resolve the policy from the
    // workspace and inject the run-heartbeat reader; the driver only schedules,
    // kills, and settles through the same stop path as every other forced outcome.
    const deadlinePolicy = options.deadlinePolicy;
    const positiveMs = (value) => Number.isSafeInteger(value) && value > 0;
    if (positiveMs(deadlinePolicy?.startToCloseMs)) {
      const deadlineAt = attemptStartedAtMs + deadlinePolicy.startToCloseMs;
      startToCloseTimer = setTimeout(
        () => stopForOutcome({ outcome: "failed", failureReason: "timeout" }),
        Math.max(1, deadlineAt - Date.now() + 1),
      );
    }

    if (positiveMs(deadlinePolicy?.heartbeatMs)
      && positiveMs(deadlinePolicy?.startupGraceMs)
      && typeof options.readHeartbeatAt === "function") {
      const graceEndsAt = attemptStartedAtMs + deadlinePolicy.startupGraceMs;
      const scheduleHeartbeatCheck = (deadlineAt) => {
        heartbeatTimer = setTimeout(async () => {
          heartbeatTimer = null;
          if (settled) return;
          let heartbeatAt = null;
          try {
            heartbeatAt = await options.readHeartbeatAt();
          } catch (error) {
            reportDegrade("mesh-worker-execution", error);
          }
          if (settled) return;
          const heartbeatAtMs = typeof heartbeatAt === "string" ? Date.parse(heartbeatAt) : NaN;
          // 129/06 F-58 — waiting on the provider is not silence: while the last provider-wait
          // line is newer than every heartbeat, re-ask a window later and kill nothing. The
          // first heartbeat after the line (the session resumed) restores the ordinary rule.
          if (providerWaitSeenAtMs != null && !(Number.isFinite(heartbeatAtMs) && heartbeatAtMs > providerWaitSeenAtMs)) {
            scheduleHeartbeatCheck(Date.now() + deadlinePolicy.heartbeatMs);
            return;
          }
          const silenceStartedAt = Number.isFinite(heartbeatAtMs)
            ? Math.max(graceEndsAt, heartbeatAtMs)
            : graceEndsAt;
          const refreshedDeadlineAt = silenceStartedAt + deadlinePolicy.heartbeatMs;
          if (Date.now() <= refreshedDeadlineAt) {
            scheduleHeartbeatCheck(refreshedDeadlineAt);
            return;
          }
          stopForOutcome({ outcome: "failed", failureReason: "timeout" });
        }, Math.max(1, deadlineAt - Date.now() + 1));
      };
      scheduleHeartbeatCheck(graceEndsAt + deadlinePolicy.heartbeatMs);
    }

    // m42 wave (b) / TECH_DEBT item 7 — THE PTY LIVENESS PROBE. Measured live
    // (run 39ec5149, 2026-07-26): the agent process VANISHED ~11 minutes into a run
    // with no onExit ever delivered, so the run — and its assignment — sat `running`
    // for 25+ minutes while the fleet mirrored the silence of a dead process. onExit
    // is an event from the PTY layer; a child that is killed out-of-band (or whose
    // exit event is lost) delivers nothing. The probe asks the OS directly: every
    // intervalMs, signal-0 the child pid; a dead pid settles the run as
    // `failed/agent_died` through the SAME idempotent finish() every other outcome
    // uses (if onExit fires first, finish's settled-guard makes the probe a no-op).
    // Guarded on a real numeric pid so every injected test fake without one keeps
    // byte-identical behaviour; interval injectable for tests.
    const livenessIntervalMs = options.livenessIntervalMs ?? 15_000;
    if (typeof term.pid === "number" && Number.isFinite(term.pid) && livenessIntervalMs > 0) {
      livenessTimer = setInterval(() => {
        try {
          process.kill(term.pid, 0);
        } catch {
          // 129/06 F-59 — a stop THIS driver requested (`done`, a deadline, a cancel) kills the
          // tree, and the probe can see the dead pid before `term.onExit` delivers; settling
          // `agent_died` there records a COMPLETED session as a death (measured 2026-09-15:
          // `stop-requested done` → `exit-confirmed failed`, 55 ms apart, and the loop halted
          // `run-not-retryable` on a refine that had finished). The requested outcome is the
          // truth the probe honours; a death nobody asked for is still `agent_died`.
          finish(requestedStopOutcome ?? { outcome: "failed", failureReason: "agent_died" });
        }
      }, livenessIntervalMs);
      // NOT unref'd: an unref'd probe lets the process exit before its first tick
      // when nothing else holds the loop; cleanupSubs clears it on every settle,
      // so a settled run never leaks the interval.
    }

    // milestone 38 (VERIFICATION F-38.06h, live soak 2026-07-25) — COMPLETION FROM THE
    // TRANSCRIPT. An interactive `claude` never exits when a directive finishes, so
    // `exitSub` above would leave the run `running` forever (measured). The instant the
    // session id is known, watch that session's transcript for its settled turn and
    // settle THIS invocation on it — `done`, or `needs-input` when the finished turn
    // carries the sentinel. `term.kill()` ends the parked session (a human resumes with
    // a FRESH `claude --resume` on a new process, never by reattaching — the same
    // discipline the sentinel branch keeps). Whichever of onExit / PTY-sentinel /
    // transcript-completion fires FIRST wins; `finish` is idempotent and its
    // `watchController.abort()` stops this watch. Absent-by-default seam: the launcher
    // uses the real watch, tests omit or inject it (no real transcript is ever read).
    const watchTranscriptCompletion = options.watchTranscriptCompletion ?? defaultWatchTranscriptCompletion;
    sessionIdPromise
      .then(async (sid) => {
        if (settled || typeof sid !== "string" || sid.length === 0) return;
        // RESUME baseline: the transcript already ends in the outcome the session
        // PARKED with — snapshot its size so the completion watch only settles on
        // records the resumed process writes from here on (measured 2026-07-27:
        // without this, the stale sentinel killed every resume ~12s in).
        // A resumed transcript whose pre-spawn size could not be read has no safe
        // completion baseline. Do not read its stale parked outcome as this run's;
        // PTY exit/sentinel/liveness remain available and retry stays visible.
        if (resumedSessionId != null && resumedSinceOffset == null) return;
        const sinceOffset = resumedSessionId == null ? 0 : resumedSinceOffset;
        return Promise.resolve(
          watchTranscriptCompletion({
            cwd: brief.worktreeCwd,
            env: launch.env ?? process.env,
            sessionId: sid,
            signal: watchController.signal,
            sinceOffset,
            idleMs: positiveMs(deadlinePolicy?.heartbeatMs)
              ? deadlinePolicy.heartbeatMs
              : COMPLETION_IDLE_MS,
            // The live-question report pair, bridged to the caller's ONE seam
            // (`options.onNeedsInputPending`): true reports needs-input immediately.
            // 69/05 then settles this watch and the driver kills the PTY; a later
            // answer continues through `--resume`, not through a parked process.
            // Optional + guarded like every other seam here.
            onPendingInput: () => options.onNeedsInputPending?.(true),
            onPendingInputCleared: () => options.onNeedsInputPending?.(false),
          }),
        ).then((result) => {
          if (settled || result == null) return;
          stopForOutcome({ outcome: result.outcome, ...(result.failureReason == null ? {} : { failureReason: result.failureReason }) }); // ADR-015 §7
        });
      })
      .catch((error) => {
        // a completion-watch fault never settles the run — onExit / the sentinel still can.
      reportDegrade("mesh-worker-execution", error); });

    // task 01 / F27 — the directive's WHOLE command string, typed as ONE newline-
    // terminated pty.write into THIS ONE session (never a `-p` prompt argv), but only
    // AFTER claude's interactive TUI is ready to receive it. Writing at t=0 (pre-fix)
    // raced claude's startup: the keystrokes were LOST and claude sat idle at an empty
    // prompt forever — never starting a session, so no transcript, no sessionId, and
    // nothing for the story-06 terminal view to bind to (VERIFICATION F27; corroborated
    // by a soak probe whose 5s-delayed write DID start a session). The delay is INJECTED
    // (options.commandDelayMs) — production (mesh-launcher) supplies a real value; every
    // test defaults to 0 (an immediate next-tick write that preserves the pre-fix timing
    // the driver suites assert against). Cleared on finish (cleanupSubs) so a command is
    // never typed into an already-exited PTY.
    const command = typeof brief.command === "string" ? brief.command : null;
    if (command != null && command.length > 0) {
      // Observed readiness is for a REAL TUI: an injected `ptySpawn` is a test double that never
      // enables bracketed paste (the same rule `terminateTree` keys on), so it keeps the fixed
      // delay unless a suite opts in with `observeReadiness`.
      const realLaunch = (options.commandDelayMs ?? 0) > 0 && (options.observeReadiness ?? options.ptySpawn == null);
      const typeDirective = () => {
        try {
          // F27b (live soak 2026-07-25) — SUBMIT with carriage-return `\r`, the byte a
          // real Enter keypress sends in a terminal, NOT line-feed `\n`. Measured at the
          // soak (PTY capture): claude's TUI enters the command text fine but a trailing
          // `\n` never submits it — the command sat unsubmitted in the input box and the
          // run went idle. `\r` is the Enter key; `\n` (Ctrl+J) is not.
          // The FIRST INPUT the session receives is the directive command followed by the
          // compiled phase brief (`brief.context`) — so the phase context reaches the model
          // as INPUT, by value, not as an instruction to go and read. When no compiled
          // context is supplied, this is the bare command, exactly as before.
          //
          // 70/06 — the directive is DELIVERED AS A PASTE, and the Enter is a SEPARATE
          // WRITE. F27b's single `${body}\r` write is correct for a ONE-LINE command and
          // silently wrong for the multi-line one 70/00 made real, in two ways, both
          // measured on claude 2.1.241 (2026-08-24) against a 43-line / 3,482-char
          // directive:
          //   (a) written RAW, the body arrived as EIGHT separate user turns. The TUI
          //       treats the ConPTY input chunk boundaries as submits, so the brief was
          //       torn apart mid-sentence and the first "turn" began at a fragment. One
          //       directive became eight, and the contract "typed as ONE input" was not
          //       what the model saw.
          //   (b) with the `\r` in the SAME write as a bracketed-paste body, the paste
          //       landed in the input box (`[Pasted text #1 +42 lines]`) and was NEVER
          //       submitted — the trailing Enter is consumed by the paste's own
          //       end-of-paste handling, and the run sat idle until it timed out.
          // Bracketed paste (`ESC[200~` … `ESC[201~`) is what makes the body ATOMIC
          // regardless of how ConPTY chunks it — claude enables the mode itself at
          // startup (`ESC[?2004h`, observed ~1.9s in, well inside commandDelayMs). The
          // Enter then goes on its own, after `submitDelayMs`, once the paste has
          // settled. Verified: ONE user message, 3,482 chars, 43 lines, first line the
          // command and last line the final brief line — the whole contract by value,
          // in one turn.
          // The settle is DERIVED from the readiness delay the caller already asked for,
          // and deliberately not a second production knob. Both answer one question -
          // is there a real TUI on the other end that needs wall-clock to settle? A
          // scripted PTY (commandDelayMs 0) needs neither and keeps its same-tick
          // timing; a real launch needs both. Deriving it also removes the failure this
          // story exists to fix: a call site that wired readiness but forgot the submit
          // would type a directive that is never sent. Still injectable for a test that
          // wants to own the window.
          const submitDelayMs = options.submitDelayMs
            ?? ((options.commandDelayMs ?? 0) > 0 ? INTERACTIVE_COMMAND_SUBMIT_DELAY_MS : 0);
          // The body must not be able to CLOSE its own paste. The brief is assembled
          // from repo files, so its bytes are content, not protocol — and an end-of-paste
          // sequence occurring inside it would end the paste early and leave the
          // remainder to be interpreted as raw keystrokes: a silently mangled prompt,
          // which is the exact defect class this transport exists to remove. Pathological
          // (it needs a literal ESC byte in a markdown file) and one line to refuse, so
          // it is refused rather than reasoned about. The marker is stripped, not
          // escaped: bracketed paste has no escape form, and content that carried one was
          // never going to render as itself anyway.
          const composed = composePhaseBriefInput(command, brief.context);
          const body = composed.split(BRACKETED_PASTE_END).join("");
          if (body !== composed) reportDegrade("directive-paste-marker-stripped", new Error(`${brief.itemRef}: the composed directive contained an end-of-paste marker`));
          term.write(`${BRACKETED_PASTE_START}${body}${BRACKETED_PASTE_END}`);
          // The settle guard is BOTH here and in cleanupSubs, and it has to be: a PTY
          // that exits on the BODY write settles the run BEFORE this assignment runs, so
          // cleanupSubs has already cleared a timer that did not exist yet. Without the
          // `settled` read, that queued Enter is typed into a dead PTY.
          commandSubmitTimer = setTimeout(() => {
            if (settled) return;
            try {
              term.write(SUBMIT_KEY);
            } catch (error) {
              reportDegrade("mesh-worker-execution", error);
            }
            // The acceptance watch — a real launch only, and only while the session-id
            // watch is live (a watch that is unavailable proves nothing about the session).
            if (realLaunch && watchCallResult != null && capturedSessionId == null) {
              acceptTimer = setTimeout(() => {
                acceptTimer = null;
                if (settled || capturedSessionId != null) return;
                const screen = buffer.slice(-4 * SCREEN_TAIL_CHARS).replace(ANSI_ESCAPE_RE, "").replace(/\s+/gu, " ").trim().slice(-SCREEN_TAIL_CHARS);
                stopBreadcrumb("directive-not-accepted", { screen });
                reportDegrade("directive-not-accepted", new Error(`${brief.itemRef}: no session ${options.acceptTimeoutMs ?? DIRECTIVE_ACCEPT_TIMEOUT_MS}ms after the directive was submitted; screen: ${screen}`));
                stopForOutcome({ outcome: "failed", failureReason: "timeout" });
              }, options.acceptTimeoutMs ?? DIRECTIVE_ACCEPT_TIMEOUT_MS);
            }
          }, submitDelayMs);
        } catch (error) {
          // an already-exited PTY write races nothing observable here — onExit above
          // still resolves the outcome for a process that died before the write landed.
      reportDegrade("mesh-worker-execution", error); }
      };
      if (!realLaunch) {
        // A scripted PTY keeps its fixed write — next tick at delay 0, byte-identical.
        commandWriteTimer = setTimeout(typeDirective, options.commandDelayMs ?? 0);
      } else {
        // The readiness gate: the floor delay AND the TUI's own marker, bounded by the cap.
        let floorPassed = false;
        let typed = false;
        const typeOnce = () => {
          if (typed || settled) return;
          typed = true;
          if (readyCapTimer != null) { clearTimeout(readyCapTimer); readyCapTimer = null; }
          typeDirective();
        };
        onTuiReady = () => { if (floorPassed) typeOnce(); };
        commandWriteTimer = setTimeout(() => {
          commandWriteTimer = null;
          floorPassed = true;
          if (tuiReadySeen) typeOnce();
        }, options.commandDelayMs);
        readyCapTimer = setTimeout(() => {
          readyCapTimer = null;
          if (typed || settled) return;
          stopBreadcrumb("tui-ready-marker-absent", { waitedMs: options.readyCapMs ?? INTERACTIVE_READY_CAP_MS });
          typeOnce();
        }, options.readyCapMs ?? INTERACTIVE_READY_CAP_MS);
      }
    }
  });
}

// defaultSpawnRuntime(brief, options) — the PRODUCTION runtime-spawn default.
// `codex` keeps its UNCHANGED headless one-shot child-process form (a real child,
// cwd = brief.worktreeCwd; the returned promise resolves only once that child has
// FULLY EXITED — execFile's callback fires on process exit, never merely on stdout
// drain, the invariant task 03/milestone-35 cleanup-after-terminal safety depends
// on). Every OTHER driver (`claude`, the default) routes through
// driveInteractiveClaudeSession above — the ADR-013 interactive PTY path, which
// resolves under the SAME "child fully exited or a detected NEEDS_INPUT sentinel
// before any cleanup runs" discipline. Never exercised against a REAL binary by
// `@executable` coverage (every test injects a scripted `spawnRuntime`, or — for
// tasks 00-03's OWN driver-level coverage — a scripted `ptySpawn`/`which`); real
// only at the task-04 @manual soak.
export function defaultSpawnRuntime(brief, options = {}) {
  const driver = options.driver ?? "claude";
  if (driver === "codex") {
    const { bin, args } = buildDriverCommand(driver, brief);
    return new Promise((resolve) => {
      execFile(bin, args, { cwd: brief.worktreeCwd, windowsHide: true, timeout: options.timeoutMs ?? 10 * 60 * 1000 }, (error, stdout) => {
        // A non-zero exit or a spawn fault is a `failed` outcome (never an unhandled
        // rejection out of this seam) — the caller completes the run accordingly.
        if (error) {
          resolve({ outcome: "failed", failureReason: "agent_error" });
          return;
        }
        try {
          const parsed = JSON.parse(String(stdout ?? ""));
          const terminal = parsed.terminal_reason ?? parsed.stop_reason ?? null;
          const ok = terminal === "completed" || terminal === "end_turn";
          resolve(ok ? { outcome: "done" } : { outcome: "failed", failureReason: "agent_error" });
        } catch {
          resolve({ outcome: "failed", failureReason: "agent_error" });
        }
      });
    });
  }
  return driveInteractiveClaudeSession(brief, options);
}
