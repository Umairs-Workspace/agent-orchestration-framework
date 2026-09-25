// src/loop/ask.mjs — THE ONE OWNER-SIDE COMPOSER OF AN ASK (milestone 131 / story 03; ADR-001 §1,
// §3-§5, ADR-004 §1, §5-§6).
//
// A driven session that needs a human used to end the loop: the site minted `session-needs-input`,
// the question sat in the transcript, and every other lane drained for one lane's question. Every
// needs-input site now hands its UNSETTLED run to `awaitAnswer`, which reads the question, records
// it on the run (`openRunAsk`), writes the ask file (`openAsk`), tells the operator
// (`session-needs-input`), narrates the waiting row — and then WAITS, in the run's owner, while the
// rest of the loop carries on. The answer re-drives the SAME run's SAME session with the answer
// typed as its first input, through the closure the site hands in, so this module never learns
// which topology it serves. The bound parks the ask and says so; a stop parks it silently.
//
// The live-PTY wait is NOT built (ADR-001 §2, ratified): nothing here writes a PTY, imports the
// session driver or reaches a terminal-input module. The WAIT belongs to the owner and costs no
// process — so it must hold the event loop itself: `defaultAskWait`'s `next()` is a REF'D
// `setTimeout`, one per check and cleared when the wait ends, because every other interval live
// during a wait is unref'd and an unref'd wait lets the loop exit on `beforeExit` (129's silent
// death). This module arms no `setInterval`. The beat is the hook's own queue, through the one
// `enqueueHeartbeat`, at the wait's checks.
import { ASK_STATES, askRequestPath, clearAsk, loopAsksDir, openAsk, parkAsk, readAsk, readAsks } from "./ask-request.mjs";
import { answerRunAsk, isStale, openRunAsk, parkRunAsk, readRuns } from "../run-store.mjs";
import { enqueueHeartbeat as enqueueHeartbeatDefault } from "../run-heartbeat-consumption.mjs";
import { readAskQuestion } from "../work/observe.mjs";
import { decideScheduleToClose } from "../work/loop.mjs";
import { DEFAULT_HEARTBEAT_MS } from "../loop-bounds.mjs";
import { buildNotifyEnvelope, notify } from "../notify/notify.mjs";
import { accountLine } from "../notify/form.mjs";
import { reportDegrade } from "../degrade.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";

const { waiting, parked, answered } = ASK_STATES;
const NO_PRINT = () => {};
// DEFAULT DECISION (ADR-003 §1): the stop source's own figure — an answer is picked up within two
// seconds of the write.
const ASK_POLL_MS = 2000;

// The drive phase onto DESIGN's three words. An unmapped phase has no word, and the cost then
// omits itself (131/02 task 01).
export const PHASE_WORDS = Object.freeze({ refine: "refine", continue: "build", fix: "build", verify: "verify" });
export function phaseWord(phase) {
  return typeof phase === "string" && Object.hasOwn(PHASE_WORDS, phase) ? PHASE_WORDS[phase] : null;
}

const iso = (date) => new Date(date).toISOString();
const ms = (date) => new Date(date).getTime();
const isAnswered = (record) => record?.state === answered && typeof record.answer === "string" && record.answer.length > 0;
const lastAsk = (record) => {
  const asks = Array.isArray(record?.asks) ? record.asks : [];
  return asks[asks.length - 1] ?? null;
};
// A run is WAITING ON A HUMAN when its record's last ask is a plain object with no answer.
export function standingAsk(record) {
  const last = lastAsk(record);
  return last != null && typeof last === "object" && !Array.isArray(last) && last.answeredAt == null ? last : null;
}

// defaultAskWait({ dir, bounds, timers, pollMs, now }) → the production seam, the stop source's
// shape: `read(runId)` is the file at this check, `now()` the clock, `expired(elapsedMs)` the one
// decider's literal answer, `next()` one REF'D timeout, and `close()` clears a pending one.
export function defaultAskWait({ dir = loopAsksDir(), bounds = {}, timers = { setTimeout, clearTimeout }, pollMs = ASK_POLL_MS, now = () => new Date() } = {}) {
  let handle = null;
  let release = null;
  return {
    read: (runId) => readAsk(dir, runId),
    now,
    expired: (elapsedMs) => decideScheduleToClose({ elapsedMs, ceilingMs: bounds.scheduleToCloseMs }).act === "halt",
    next: () => new Promise((resolve) => {
      release = resolve;
      handle = timers.setTimeout(() => { handle = null; release = null; resolve(); }, pollMs);
    }),
    close: () => {
      if (handle != null) timers.clearTimeout(handle);
      handle = null;
      release?.();
      release = null;
    },
  };
}

// parkedHalt(parked, haltDecision) → the ONE place `session-needs-input` is spelled as a halt: the
// entries ordered by `askedAt` then `runId`, the halt at the first. An empty list is a caller error.
export function parkedHalt(entries, haltDecision) {
  if (!Array.isArray(entries) || entries.length === 0) throw new TypeError("parkedHalt needs at least one parked entry");
  const sorted = [...entries].sort((a, b) => ordinal(a.askedAt, b.askedAt) || ordinal(a.runId, b.runId));
  return { act: haltDecision("session-needs-input", sorted[0].ref, "driver:needs-input"), details: { parked: sorted } };
}

// askBlockLines(parked) → the ASK BLOCK a halt that parked asks prints after its line (DESIGN §4,
// task 05): for each entry, in `askedAt` then `runId` order, the full question indented two spaces
// (a line blank after `trimEnd()` prints empty, every other keeps its own indent), then the answer
// command. A `null` question prints only the answer line.
export function askBlockLines(parked) {
  const sorted = [...parked].sort((a, b) => ordinal(a.askedAt, b.askedAt) || ordinal(a.runId, b.runId));
  const lines = [];
  for (const entry of sorted) {
    if (typeof entry.question === "string") {
      for (const line of entry.question.split(/\r?\n/u)) lines.push(line.trimEnd() === "" ? "" : `  ${line}`);
    }
    lines.push(`  answer: aof work answer ${entry.ref} "…"`);
  }
  return lines;
}

// isParkedHalt(act) — whether a halt is the question's own, so the launcher never re-announces it
// and never spells the stop itself.
export function isParkedHalt(act) {
  return act?.stop === "session-needs-input";
}

function ordinal(a, b) {
  const [x, y] = [String(a), String(b)];
  return x < y ? -1 : x > y ? 1 : 0;
}

// awaitAnswer(phaseRun, site, deps) → `{ phaseRun }` (still unsettled — the site settles it as it
// settles any drive) or `{ parked }`.
//
//   site — { drive, ref, phase, item, scope, loopRunId, workspaceId, cwd, reenter }: `drive(answer)`
//          is the site's own re-drive, handed `{ runId, sessionId, text }`, answering an UNSETTLED
//          phase run; `item` is the record's item in the tree it lives in; `cwd` the tree the
//          session ran in (the transcript's key).
//   deps — { workspace, env, notifyOptions, askWait, stopping, aborted, invokedAt, narrate,
//          heartbeatMs, enqueueHeartbeat, node, dir }.
export async function awaitAnswer(phaseRun, site, deps = {}) {
  const { drive, ref, phase, item, scope = null, loopRunId = null, workspaceId = null, cwd } = site;
  const {
    workspace = null,
    env = process.env,
    notifyOptions = {},
    bounds = {},
    stopping = () => false,
    aborted = () => false,
    poll = async () => {},
    invokedAt = null,
    narrate = NO_PRINT,
    heartbeatMs = DEFAULT_HEARTBEAT_MS,
    enqueueHeartbeat = enqueueHeartbeatDefault,
    node = workspace?.config?.mesh?.nodeId ?? null,
    dir = loopAsksDir(env),
  } = deps;
  // One wait per call — concurrent lanes each hold their own timer — unless a suite injects one.
  const askWait = deps.askWait ?? defaultAskWait({ dir, bounds });
  const config = workspace?.config ?? {};
  const word = phaseWord(phase);
  const settlementContext = phaseRun.settlementContext ?? null;
  let reenter = site.reenter === true;
  let current = phaseRun;

  // The envelope of an event at an instant; `elapsedMs` is the attempt's wall time (ADR-005 §3).
  const envelopeAt = (event, at, fields) => buildNotifyEnvelope(event, {
    ref,
    phase: word,
    elapsedMs: Math.max(0, ms(at) - Date.parse(current.record.createdAt)) || 0,
    ...fields,
  }, { config, now: () => new Date(at) });
  // The workspace `notify` reads `work.notify` from; each firing below is its own literal call.
  const notifyWorkspace = workspace ?? { config };

  try {
    for (;;) {
      const runId = current.record.runId;
      let sessionId = current.outcome?.sessionId ?? current.record.sessionId ?? null;
      let question;
      let askedAt;
      const opened = askWait.now();
      if (!reenter) {
        question = await readAskQuestion({ cwd, env, sessionId, sinceOffset: 0 });
        // THE RECORD IS THE FIRST WRITE: a refusal here is thrown unchanged, before any file,
        // notice or row (QA ruling 6).
        const record = await openRunAsk(item, runId, { question, phase: word, now: iso(opened) });
        askedAt = lastAsk(record).askedAt;
        await openAsk(dir, { runId, ref, workspaceId, loopRunId, scope, sessionId, phase: word, node, question, now: () => new Date(opened) });
        const envelope = envelopeAt("session-needs-input", opened, { question });
        // A re-ask while the loop is stopping still records the question, and tells nobody.
        if (!stopping()) await notify(notifyWorkspace, envelope, notifyOptions);
        await narrate(accountLine(envelope));
      } else {
        // RE-ENTRY (ADR-004 §5): the record's standing ask is not re-opened and not re-announced.
        // A file that is parked, absent or not a record is set back to `waiting` from the record.
        const entry = standingAsk((await readRuns(item)).find((run) => run.runId === runId) ?? current.record) ?? lastAsk(current.record);
        question = entry?.question ?? null;
        askedAt = entry?.askedAt ?? iso(opened);
        const file = await askWait.read(runId);
        // The run record names its session; a record that never learned it falls back to the file's.
        sessionId = sessionId ?? file?.sessionId ?? null;
        if (file == null || file.state === parked) {
          await openAsk(dir, { runId, ref, workspaceId, loopRunId, scope, sessionId, phase: entry?.phase ?? word, node, question, now: () => new Date(opened) });
        }
        await narrate(accountLine(envelopeAt("session-needs-input", opened, { question })));
      }

      // THE WAIT. One check reads the file, then the stop, then the bound; the first that decides wins.
      const beatEvery = Math.max(1, Math.floor(heartbeatMs / 3));
      let lastBeat = null;
      let lastRow = ms(opened);
      const boundFrom = Math.max(Date.parse(askedAt) || ms(opened), invokedAt == null ? -Infinity : Date.parse(invokedAt) || -Infinity);
      let outcome = null;
      for (;;) {
        await askWait.next();
        const at = askWait.now();
        const file = await askWait.read(runId);
        if (isAnswered(file) && !aborted()) {
          outcome = { answer: file };
          break;
        }
        if (lastBeat == null || ms(at) - lastBeat >= beatEvery) {
          lastBeat = ms(at);
          try {
            await enqueueHeartbeat(item, runId, iso(at));
          } catch (error) {
            reportDegrade("loop-ask-heartbeat", error);
          }
        }
        if (ms(at) - lastRow >= heartbeatMs) {
          lastRow = ms(at);
          await narrate(accountLine(envelopeAt("session-needs-input", at, { question })));
        }
        await poll();
        if (stopping() || aborted()) {
          outcome = { park: { at, bound: false } };
          break;
        }
        if (askWait.expired(Math.max(0, ms(at) - boundFrom))) {
          outcome = { park: { at, bound: true } };
          break;
        }
      }

      if (outcome.park != null) {
        const { at, bound } = outcome.park;
        await parkAsk(dir, runId, { now: () => new Date(at) });
        const record = await parkRunAsk(item, runId, { now: iso(at) });
        const entry = standingAsk(record) ?? lastAsk(record);
        const parkedEnvelope = envelopeAt("session-parked-unanswered", at, { question, outcome: { askedAt: entry?.askedAt ?? askedAt, parkedAt: entry?.parkedAt ?? iso(at) } });
        await narrate(accountLine(parkedEnvelope));
        if (bound) await notify(notifyWorkspace, parkedEnvelope, notifyOptions);
        return { parked: { ref, runId, sessionId, askedAt: entry?.askedAt ?? askedAt, question } };
      }

      // THE ANSWER: recorded on the run, then typed VERBATIM into the same session.
      const { answer: file } = outcome;
      const at = askWait.now();
      const by = typeof file.by?.actor === "string" ? file.by.actor : null;
      await answerRunAsk(item, runId, { answer: file.answer, by, now: iso(at) });
      await narrate(accountLine(envelopeAt("session-answered", at, { outcome: { by, answer: file.answer } })));
      const redriven = await drive({ runId, sessionId, text: file.answer });
      // THE SPEND OF AN ANSWERED RUN (task 01, ruling 12): the waiting drive's baseline rides the
      // run the site settles, so the one settle charges the whole run from its first turn.
      current = { ...redriven, settlementContext: settlementContext ?? redriven.settlementContext ?? null };
      if (current.outcome?.outcome === "needs-input") {
        reenter = false;
        continue;
      }
      await clearAsk(dir, runId);
      return { phaseRun: current };
    }
  } finally {
    askWait.close?.();
  }
}

// reenterStandingAsks(runs, reenter) — the `--resume` re-entry order (task 04, ruling 12): the
// ANSWERED standing asks first, in `askedAt` order, then the unanswered ones, in `askedAt` order.
// `runs` are `{ run, file }` pairs; `reenter(pair)` performs one.
export async function reenterStandingAsks(pairs, reenter) {
  const byAsked = (a, b) => ordinal(standingAsk(a.run)?.askedAt, standingAsk(b.run)?.askedAt) || ordinal(a.run.runId, b.run.runId);
  const ready = pairs.filter((pair) => isAnswered(pair.file)).sort(byAsked);
  const rest = pairs.filter((pair) => !isAnswered(pair.file)).sort(byAsked);
  const results = [];
  for (const pair of [...ready, ...rest]) results.push(await reenter(pair));
  return results;
}

// sweepStaleAsks({ dir, workspaceId, inScope, runsFor, narrate }) — an in-scope ask file with no
// running record behind it (in the primary or the ref's lane) is stale: cleared and narrated once,
// never re-driven. A file whose ref is outside the scope, or another workspace's, is left alone.
export async function sweepStaleAsks({ dir = loopAsksDir(), workspaceId, inScope, runsFor, narrate = NO_PRINT }) {
  for (const ask of await readAsks(dir, { workspaceId })) {
    if (!inScope(ask.ref)) continue;
    const runs = await runsFor(ask.ref);
    const behind = runs.find((run) => run.runId === ask.runId);
    if (behind?.state === "running") continue;
    await clearAsk(dir, ask.runId);
    await narrate(`Ask ${ask.runId} — stale: its run is not running; cleared.`);
  }
}

// liveOwnerHolds(run, file, { stalenessMs, now }) — the `--resume` ownership rule (task 04, ruling
// 13): a standing ask whose last entry is parked was given up and is re-entered, fresh or stale; an
// unparked one on a fresh run has a live owner and is left; on a stale run its owner died.
export function liveOwnerHolds(run, { stalenessMs, nowMs }) {
  const entry = standingAsk(run);
  if (entry == null || entry.parkedAt != null) return false;
  return !isStale(run, nowMs, stalenessMs);
}

// The aof home's env as a loop and its children see it: this process's, with the injected store env
// over it — the env `spawnLaneDrive` hands a child, so the parent and the child name one ask file.
export function askEnvFor(ctx) {
  return { ...process.env, ...(ctx?.globalWorkStoreOptions?.env ?? {}) };
}

// The ask file of a run, under the env a child is given — the `answerFile` a re-spawn names.
export function askFileFor(runId, env) {
  return askRequestPath(loopAsksDir(env), runId);
}

// askContext({ ctx, stopSource, narrate, bounds, invokedAt, scope, loopRunId }) → { site, deps } —
// what every needs-input site of one loop invocation shares: the loop's scope and id and the
// workspace's id (resolved over the PRIMARY checkout, so the verb finds the ask in an unpinned
// workspace too), and the composer's seams. `ctx.askWait` and `ctx.notifyOptions` are the suites'.
export function askContext({ ctx, stopSource, narrate = NO_PRINT, bounds, invokedAt = null, scope = null, loopRunId = null }) {
  const home = askEnvFor(ctx);
  return {
    site: { scope, loopRunId, workspaceId: resolveWorkspaceId(ctx.workspace) },
    deps: {
      workspace: ctx.workspace,
      env: ctx.agentSessionDriverOptions?.env ?? process.env,
      notifyOptions: ctx.notifyOptions ?? {},
      ...(ctx.askWait == null ? {} : { askWait: ctx.askWait }),
      bounds: { scheduleToCloseMs: bounds?.scheduleToCloseMs },
      heartbeatMs: bounds?.heartbeatMs,
      stopping: () => (stopSource?.level() ?? 0) >= 1,
      aborted: () => (stopSource?.level() ?? 0) >= 2,
      poll: async () => { await stopSource?.poll?.(); },
      invokedAt,
      narrate,
      dir: loopAsksDir(home),
    },
  };
}

