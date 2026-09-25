// work:resume — the deterministic re-entry point after a run was killed by infra
// (348 auto-resume).
//
// WHY THIS EXISTS. When an API session limit kills the orchestrator, aof cannot
// restart it: the orchestrator IS the Claude Code session, and this CLI is a child
// of the thing that died. What aof CAN remove is the cost of coming back — measured
// on vista-app 348, three kills cost 6h18m of dead run, and each restart then spent
// ten to twenty minutes with the orchestrator re-deriving state it had already
// established (worse, once: it re-authored a killed architect's work by hand instead
// of resuming its lineage, discarding a completed run).
//
// So this verb answers ONE question completely: **what should resume, and is it
// ready?** A sweep (no ref) reports every retryable failed run in the stream with
// its readiness; a ref RESUMES that item's lineage. It re-derives nothing — the
// classification, the ceiling and the park gate are all the run store's
// (retryReadiness), and the mint is the same transition run-retry uses. Two faces,
// one authority.
//
// It NEVER resumes work it cannot execute. A resumed run record means "an executor
// is on this"; minting one with nothing behind it would make the record lie, which
// is strictly worse than the failure it replaces. The sweep therefore REPORTS ready
// local runs (the caller re-enters) and only ACTS when asked for a ref.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   348 auto-resume — the deterministic re-entry face over the SAME retry authority.
//
// `work:answer` (131/04) lives here too: both verbs bring a stopped run back, this one after
// infra killed it, that one after it stopped to ask.
import { resolveItem, resolveItemExact, requireLocalCheckout } from "./resolve.mjs";
import { commandError } from "../command-error.mjs";
import { readRuns, retryReadiness, isStale } from "../run-store.mjs";
import { transitionRunStart, transitionStaleRunsReclaimed } from "../effects/run-transitions.mjs";
import { listStreamCacheFirst } from "../work/read.mjs";
import { meshNodeIdOf } from "./mesh/gate.mjs";
import { lockContextFor } from "../item-lock.mjs";
import { heartbeatFromConfig } from "../loop-bounds.mjs";
import { answerAsk, loopAsksDir } from "../loop/ask-request.mjs";
import { askEnvFor } from "../loop/ask.mjs";
import { readExecutionOverlay, resolveScopedExecution, executionScopeRef, awaitsAnswer } from "../board-mesh-execution.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";
import { buildNotifyEnvelope, notify } from "../notify/notify.mjs";

// The liveness window a `running` run may go quiet for before it is treated as
// STRANDED rather than working (20/ADR-004's heartbeat rule; the resolved value is
// passed to the store, which reads no config).

// The most recent terminal `failed` run on an item — the one a resume would target,
// resolved exactly as retryRun resolves its default prior (no second rule).
function latestFailed(runs) {
  return [...runs].reverse().find((run) => run.state === "failed") ?? null;
}

// A run's last `asks` entry when it is still unanswered, else null. Only the LAST entry counts:
// an earlier open one under an answered last one is history, not a question.
function openLastAsk(run) {
  const last = Array.isArray(run.asks) ? run.asks.at(-1) : null;
  return last != null && typeof last === "object" && last.answeredAt == null ? last : null;
}

// One sweep row per item that has something resumable, or null. Pure over the runs
// it is handed plus the injected clock/ceiling/threshold.
//
// The order of the two cases below is load-bearing. A run left `running` OUTRANKS a
// prior failure, because a stranded run is the WORSE state: the milestone looks
// busy while nothing is driving it, which is exactly how 348 lost a night.
function readinessRow(ref, runs, { maxAttempts, nowMs, stalenessThreshold }) {
  const running = runs.filter((run) => run.state === "running");
  // WAITING ON YOU — checked before the liveness window (131/ADR-003 §5). A running run whose
  // last question is unanswered is not an orphan however long its owner has been silent: a parked
  // ask has nobody beating it, and the stranded case below would offer to reclaim it. It outranks
  // a failed prior too, because it is the live lineage. Only this row carries `askedAt` and
  // `parkedAt`; every other row is key for key what it was.
  const waiting = [...running].reverse().find((run) => openLastAsk(run) != null);
  if (waiting) {
    const ask = openLastAsk(waiting);
    return {
      ref,
      runId: waiting.runId,
      attempt: waiting.attempt,
      maxAttempts,
      failureReason: null,
      sessionId: waiting.sessionId ?? null,
      resumeAfter: null,
      ready: false,
      state: "waiting-on-you",
      readyAt: null,
      silentSince: waiting.heartbeatAt ?? waiting.updatedAt,
      askedAt: ask.askedAt ?? null,
      parkedAt: ask.parkedAt ?? null,
    };
  }
  // Genuinely working — a recent heartbeat. Report it so the operator knows why the
  // item is not offered, but never as something to resume.
  if (running.some((run) => !isStale(run, nowMs, stalenessThreshold))) {
    const live = running.find((run) => !isStale(run, nowMs, stalenessThreshold));
    return { ref, runId: live.runId, attempt: live.attempt, maxAttempts, failureReason: null, sessionId: live.sessionId ?? null, resumeAfter: null, ready: false, state: "in-flight", readyAt: null, silentSince: live.heartbeatAt ?? live.updatedAt };
  }
  // STRANDED — `running` on disk, silent past the liveness window. This is the shape
  // an orchestrator killed mid-turn leaves behind: it never got to record its own
  // death, so nothing ever marked the run failed and nothing will. Resuming it means
  // reclaim-then-retry, which the ACT path below does in that order.
  const stranded = running[running.length - 1];
  if (stranded) {
    const exhausted = stranded.attempt >= maxAttempts;
    return {
      ref,
      runId: stranded.runId,
      attempt: stranded.attempt,
      maxAttempts,
      failureReason: null,
      sessionId: stranded.sessionId ?? null,
      resumeAfter: null,
      ready: !exhausted,
      state: exhausted ? "attempts-exhausted" : "stranded",
      readyAt: null,
      silentSince: stranded.heartbeatAt ?? stranded.updatedAt,
    };
  }

  const prior = latestFailed(runs);
  if (!prior) return null;
  const readiness = retryReadiness(prior, maxAttempts, nowMs);
  // A non-retryable failure is not "resumable work pending" — it is a finished,
  // judged failure. Reporting it here would put agent_error rows in a list whose
  // whole purpose is "what is waiting to come back".
  if (readiness.state === "not-retryable") return null;
  return {
    ref,
    runId: prior.runId,
    attempt: prior.attempt,
    maxAttempts,
    failureReason: prior.failureReason ?? null,
    sessionId: prior.sessionId ?? null,
    resumeAfter: prior.resumeAfter ?? null,
    ...readiness,
    silentSince: null,
  };
}

export const resumeCommand = {
  id: "work:resume",
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      maxAttempts: { type: "number" },
      // The park override, forwarded verbatim to the store's gate (run-retry's flag).
      force: { type: "boolean" },
      // `now` (ISO-8601 UTC-Z) is an INJECTED clock for deterministic assertions —
      // a test input, never a CLI flag (the 22/R2 white-box idiom).
      now: { type: "string" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    const now = input.now ?? new Date().toISOString();
    const nowMs = Date.parse(now);
    // The ceiling is resolved ONCE at this edge and passed down as data — the store
    // reads no config (08/ADR-002 basis-neutral), exactly as run-retry does.
    const maxAttempts = input.maxAttempts ?? ctx.workspace.config?.work?.autonomous?.maxAttempts ?? 3;
    const stalenessThreshold = heartbeatFromConfig(ctx.workspace);
    const ref = typeof input.ref === "string" ? input.ref.trim() : "";
    const seamOpts = { lock: lockContextFor(ctx.workspace, ctx), journalOptions: ctx.effectsJournalOptions ?? {} };

    // ---- ACT: a ref resumes that item's lineage -----------------------------
    if (ref) {
      const item = await resolveItemExact(ctx, ref);
      if (!item) throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
      requireLocalCheckout(item, ref);

      // RECLAIM FIRST. A run stranded `running` by a killed orchestrator has no
      // terminal state, so `retryRun` would find no failed prior and refuse
      // `no-retryable-run` — the honest-looking answer that is completely wrong
      // about what happened. The store's own scan settles it to failed /
      // runtime_offline / reclaimedAt (retryable per ADR-002), and the retry below
      // then resumes THAT lineage. The staleness rule is the store's; this command
      // only supplies the resolved threshold.
      const reclaimed = await transitionStaleRunsReclaimed([item], { now: input.now, stalenessThreshold }, seamOpts);
      // The store owns every refusal (no-retryable-run / not-retryable /
      // attempts-exhausted / retry-parked / duplicate-run) — they propagate coded
      // and untouched, and a refusal mints nothing. This command adds no gate of
      // its own: a second copy of the retry rules is exactly how the two faces
      // would drift apart.
      const { record } = await transitionRunStart(
        item,
        { mode: "retry", maxAttempts, now: input.now, node: meshNodeIdOf(ctx.workspace.config), force: Boolean(input.force) },
        seamOpts,
      );
      return { resumed: true, reclaimed: reclaimed.map((entry) => entry.record.runId), ...record };
    }

    // ---- SWEEP: what is waiting to come back, and when -----------------------
    const rows = await listStreamCacheFirst(ctx.workspace, {
      globalWorkStoreOptions: ctx.globalWorkStoreOptions ?? {},
    });
    const pending = [];
    for (const row of rows) {
      // Cache-answered rows carry no local `runs/` dir to read. Skipping them is
      // honest here (this node cannot resume another node's checkout anyway) and
      // is the same reach-through discipline run-status applies.
      if (!row.dir) continue;
      const item = await resolveItem(ctx, row.ref);
      if (!item?.dir) continue;
      const entry = readinessRow(row.ref, await readRuns(item), { maxAttempts, nowMs, stalenessThreshold });
      if (entry) pending.push({ ...entry, status: row.status ?? null, title: row.title ?? null });
    }
    // Ready first, then parked by how soon they wake — the order an operator acts in.
    pending.sort((a, b) => {
      if (a.ready !== b.ready) return a.ready ? -1 : 1;
      return String(a.readyAt ?? "").localeCompare(String(b.readyAt ?? ""));
    });
    return {
      resumed: false,
      now,
      maxAttempts,
      pending,
      ready: pending.filter((row) => row.ready).map((row) => row.ref),
    };
  },

  cli: {
    route: ["work", "resume"],
    spec: {
      usage: "aof work resume [<ref>] [--force] [--max-attempts N] [--json]",
      flags: {
        force: { type: "boolean", description: "resume a parked (session_limit) run before its stated reset" },
        maxAttempts: { type: "string", description: "override the retry attempt ceiling" },
      },
    },

    argv: (positionals, options) => ({
      ...(positionals[0] ? { ref: positionals[0] } : {}),
      ...(options.force ? { force: true } : {}),
      ...(options.maxAttempts != null ? { maxAttempts: Number(options.maxAttempts) } : {}),
    }),

    render(result) {
      if (result.resumed) {
        const reclaimed = result.reclaimed?.length
          ? `\nReclaimed ${result.reclaimed.join(", ")} first — it was left running by a killed session and had recorded no outcome.`
          : "";
        return `Resumed run ${result.runId} for ${result.itemRef} — state ${result.state} (attempt ${result.attempt}).${reclaimed}`;
      }
      if (result.pending.length === 0) {
        return "Nothing to resume — no retryable failed runs in the stream.";
      }
      const lines = [];
      for (const row of result.pending) {
        if (row.state === "waiting-on-you") {
          const parked = row.parkedAt ? `, parked ${row.parkedAt}` : "";
          lines.push(`  ${row.ref}  NEEDS YOUR ANSWER — asked ${row.askedAt}${parked}  — answer: ${answerLine(row.ref)} (attempt ${row.attempt}/${row.maxAttempts}, run ${row.runId})`);
          continue;
        }
        const when =
          row.state === "parked"
            ? `parked until ${row.readyAt}`
            : row.state === "attempts-exhausted"
              ? `attempts exhausted (${row.attempt}/${row.maxAttempts})`
              : row.state === "in-flight"
                ? `running (last seen ${row.silentSince})`
                : row.state === "stranded"
                  ? `STRANDED — running on disk but silent since ${row.silentSince}`
                  : "READY";
        const cause = row.state === "stranded" || row.state === "in-flight" ? "no terminal state recorded" : (row.failureReason ?? "unknown");
        lines.push(`  ${row.ref}  ${when}  — ${cause} (attempt ${row.attempt}/${row.maxAttempts}, run ${row.runId})`);
      }
      const head = `${result.pending.length} item(s) with a resumable run:`;
      // The re-entry instruction is the POINT of this command — an operator coming
      // back to a dead run should not have to work out the next move.
      const ready = result.ready;
      // A question waiting on the operator comes first: answering it is the next move, and it
      // is never offered as a resume.
      const waiting = result.pending.filter((row) => row.state === "waiting-on-you").map((row) => row.ref);
      const answer = waiting.length ? `\n\nAnswer:\n${waiting.map((r) => `  ${answerLine(r)}`).join("\n")}` : "";
      const tail = ready.length
        ? `\n\nResume now:\n${ready.map((r) => `  aof work resume ${r}`).join("\n")}`
        : waiting.length
          ? "\n\nNothing is ready yet — answer the questions above, or re-run this command after the earliest readyAt."
          : "\n\nNothing is ready yet — re-run this command after the earliest readyAt above.";
      return `${head}\n${lines.join("\n")}${answer}${tail}`;
    },

    json: (result) => result,
  },
};

// ---- work:answer — the operator's answer to a session waiting on a question (131/04) ----------
//
// The second way a stopped run comes back: not after infra killed it, but after it stopped to ask.
// The verb writes a request and returns; it never waits and never reads or writes a run record
// (131/ADR-003 §6). Whoever owns the session consumes the answer: a local loop's owner through the
// ask file (131/03), a mesh worker through `mesh:terminal-resume`, which types it into the parked
// session. The first rung that fails names the refusal: the ref, then the actor, then the text
// (sanitised once, by `answerAsk`, before it looks anything up), then the ask.

// `as` rides Discord's first line, which never truncates, and the public run record.
const ACTOR_MAX_CODE_POINTS = 80;
const ACTOR_CONTROL_RE = /[\u0000-\u001f\u007f]/u;

function answerLine(ref) {
  return `aof work answer ${ref} "…"`;
}

// The actor NAME, the `work:feedback` precedent: `as` trimmed, else "you". Never the OS user
// name, because run records are committed to a public repo.
function actorOf(as) {
  if (typeof as !== "string" || as.trim() === "") return "you";
  const actor = as.trim();
  if ([...actor].length > ACTOR_MAX_CODE_POINTS || ACTOR_CONTROL_RE.test(actor)) {
    throw commandError(`The answerer's name must be at most ${ACTOR_MAX_CODE_POINTS} characters with no control characters.`, "answer-actor-invalid", 400);
  }
  return actor;
}

function notWaiting(ref, execution) {
  const says = execution == null
    ? "no ask file and no parked worker session"
    : `its execution row reads ${execution.state}${execution.code ? ` (${execution.code})` : ""}`;
  return commandError(`${ref} is not waiting on an answer — ${says}.`, "answer-not-waiting", 409);
}

// Deferred by design, `loop.mjs`'s shape: command-core imports this module to register it, so a
// static import back into command-core would close the registry ring.
async function invokeRegistered(id, input, ctx) {
  if (typeof ctx?.invokeRegistered === "function") return await ctx.invokeRegistered(id, input, ctx);
  const { invoke } = await import("../command-core.mjs");
  return await invoke(id, input, ctx);
}

// The wait the notification announces: from the ask to the answer, floored at 0 (a later
// `askedAt` is clock skew), null when the ask carries no readable instant. The verb cannot see a
// lane's run record, so the ask is the only clock it has (131/04 task 00, PO ruling 5).
function waitMs(askedAt, answeredAt) {
  const from = typeof askedAt === "string" ? Date.parse(askedAt) : Number.NaN;
  if (!Number.isFinite(from)) return null;
  return Math.max(0, Date.parse(answeredAt) - from);
}

// The mesh leg: no ask file names this ref, so a worker's parked session may be the one asking.
// Its question never reached the control (the frozen assignment wire), so nothing is announced.
async function answerThroughWorker(item, text, by, now, ctx) {
  const overlay = await readExecutionOverlay(ctx.workspace, { globalWorkStoreOptions: ctx.globalWorkStoreOptions ?? {} });
  const execution = resolveScopedExecution(overlay, item.ref)?.execution ?? null;
  if (!awaitsAnswer(execution)) throw notWaiting(item.ref, execution);
  const result = await invokeRegistered(
    "mesh:terminal-resume",
    { session: execution.sessionId, answer: { text, by, askedAt: execution.updatedAt ?? null } },
    ctx,
  );
  if (result?.refused === true) {
    throw commandError(`The worker refused to resume ${item.ref} before it started, so the answer was not typed; it may be sent again.`, "terminal-resume-not-started", 409);
  }
  return {
    ok: true,
    ref: item.ref,
    runId: result?.confirmedRunId ?? null,
    delivery: "mesh",
    state: result?.confirmed === true ? "resumed" : "dispatched",
    by,
    answeredAt: now().toISOString(),
    resume: null,
  };
}

export const answerCommand = {
  id: "work:answer",
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      text: { type: "string" },
      as: { type: "string" },
      // "cli" or "board" — the board's route sets it; the CLI face has no flag for it.
      via: { type: "string" },
      // An INJECTED clock (ISO-8601 UTC-Z), a test input, never a CLI flag.
      now: { type: "string" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    const ref = typeof input.ref === "string" ? input.ref.trim() : "";
    const item = ref ? await resolveItemExact(ctx, ref) : null;
    if (!item) throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
    const by = {
      actor: actorOf(input.as),
      via: input.via === "board" ? "board" : "cli",
      node: meshNodeIdOf(ctx.workspace.config) ?? null,
    };
    const now = typeof input.now === "string" ? () => new Date(input.now) : () => new Date();
    const dir = loopAsksDir(askEnvFor(ctx));
    const record = await answerAsk(dir, { workspaceId: resolveWorkspaceId(ctx.workspace), ref: item.ref, text: input.text, by, now });
    if (record == null) return await answerThroughWorker(item, input.text, by, now, ctx);

    const parked = record.parkedAt != null;
    const scope = typeof record.scope === "string" && record.scope.length > 0 ? record.scope : executionScopeRef(item.ref);
    const document = {
      ok: true,
      ref: item.ref,
      runId: record.runId,
      delivery: parked ? "parked" : "waiting",
      state: record.state,
      by: record.by,
      answeredAt: record.answeredAt,
      resume: parked ? `aof work loop ${scope} --resume` : null,
    };
    // Announced once, after the write, and awaited: an un-awaited post in an exiting CLI is
    // dropped. `notify` never throws, so a failing channel never fails the answer.
    const envelope = buildNotifyEnvelope(
      "session-answered",
      { ref: item.ref, phase: record.phase, elapsedMs: waitMs(record.askedAt, record.answeredAt), outcome: { by: by.actor, answer: record.answer } },
      { config: ctx.workspace.config, now },
    );
    await notify(ctx.workspace, envelope, { ...(ctx.notifyOptions ?? {}) });
    return document;
  },

  cli: {
    route: ["work", "answer"],
    spec: {
      usage: 'aof work answer <ref> "<text>" [--as <actor>] [--json]',
      flags: {
        as: { type: "string", description: "who is answering (defaults to \"you\")" },
      },
    },

    // Positionals are never joined: a joined answer is not verbatim.
    argv: (positionals, options) => {
      if (positionals.length > 2) {
        throw commandError('Quote the answer as one argument: aof work answer <ref> "<text>".', "invalid-input", 400);
      }
      return {
        ...(positionals[0] ? { ref: positionals[0] } : {}),
        ...(positionals[1] !== undefined ? { text: positionals[1] } : {}),
        ...(typeof options.as === "string" ? { as: options.as } : {}),
      };
    },

    render(result) {
      if (result.delivery === "parked") return `Answered ${result.ref} — its run is parked; resume the loop with: ${result.resume}`;
      if (result.delivery === "mesh") {
        return result.state === "resumed"
          ? `Answered ${result.ref} — typed into the worker's session (run ${result.runId}).`
          : `Answered ${result.ref} — dispatched but NOT CONFIRMED within the window; the reservation stands, do not answer again while the row reads resumed.`;
      }
      return `Answered ${result.ref} — the waiting session resumes with your answer (run ${result.runId}).`;
    },

    json: (result) => result,
  },
};
