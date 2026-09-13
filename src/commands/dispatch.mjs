// work:dispatch — the LOCAL door onto the concurrent-dispatch lane (story 65 / task 02).
//
// WHY A COMMAND AT ALL, given the engine is a module. Who dispatches is deliberately not
// narrowed by this story: today it is a session executing `src/bundle/commands/continue.md`,
// tomorrow it may be a code-owned loop, and both read the SAME ready set from the same
// `aof work next`. A prompt cannot import a module — so without this door the prompt's only
// way to isolate a lane would be to spell `git worktree add` itself, which is exactly the
// second spelling of a path convention that `mesh-worktree.mjs` exists to prevent. The door
// is thin: every rule it applies is `src/work/dispatch.mjs`'s, and it re-derives none of
// them (the `next.mjs`-over-`nextWork` idiom).
//
// FOUR ACTS, ONE VERB, because they are one question asked at four moments:
//   `aof work dispatch <ref>`            — open (create-or-reuse) this story's lane
//   `aof work dispatch --list`           — every live lane, individually reportable
//   `aof work dispatch --sweep`          — the stranded lanes, recoverable rather than lost
//   `aof work dispatch --cleanup <ref>`  — a finished lane's tree and branch, removed
//
// BOARD-DEFERRED, and recorded as a deferral rather than an oversight: dispatch is an
// operator/loop CLI act like `run-start` and `resume`, and no board affordance is asked for
// by this story. A "dispatch the ready set" button is a separate, deliberate decision.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   story 65 / task 02 — work:dispatch, the LOCAL door onto the concurrent-dispatch lane.
//   `next` answers with the ready set; this verb makes acting on it sound, by resolving each
//   member's own worktree on the item's own branch (the existing mesh-worktree.mjs machinery,
//   wired to a third lane root) and by reporting the ONE configured concurrency bound. It is
//   registered here rather than shelled out of a prompt because a prompt cannot import a
//   module, and a prompt spelling `git worktree add` itself is the second spelling of a path
//   convention that seam exists to prevent. BOARD-DEFERRED (an operator/loop CLI act, like
//   run-start and resume — no board affordance is asked for by this story).
import path from "node:path";
import { existsSync } from "node:fs";
import { listItemsCacheFirst, nextWorkCacheFirst } from "../work/read.mjs";
import { commandError } from "../command-error.mjs";
import { effectsJournalPath, openEffectsJournal, readUnsettledSteps } from "../effects/journal.mjs";
import { drainEffects, LOCAL_LOCI } from "../effects/dispatch.mjs";
import {
  resolveDispatchLane,
  inspectDispatchLanes,
  sweepDispatchLanes,
  cleanupDispatchLane,
  overlappingFiles,
  dispatchReadySet,
  dispatchConcurrencyFromConfig,
  inspectDispatchLaneAdmission,
  planDispatchLaneAdmissions,
  withDispatchLaneAdmissionLock,
} from "../work/dispatch.mjs";

export const dispatchCommand = {
  id: "work:dispatch",
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      refs: { type: "array", items: { type: "string" } },
      list: { type: "boolean" },
      sweep: { type: "boolean" },
      cleanup: { type: "boolean" },
      remove: { type: "boolean" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    const ws = ctx.workspace;
    const seamOptions = { globalWorkStoreOptions: ctx.globalWorkStoreOptions ?? {} };
    // The bound is READ, never invented — from the one resolution site, and it rides EVERY
    // answer this verb gives, so a caller never has to ask a second question to know it.
    const bound = dispatchConcurrencyFromConfig(ws);
    if (input.cleanup) {
      const ref = requireRef(input, "cleanup");
      const result = await cleanupDispatchLane(ws.projectRoot, ref, {
        removeBranch: input.remove !== false,
        ensureProjection: ({ worktree }) => settleLaneProjectionEffects(ws, ref, worktree, ctx),
      });
      return { action: "cleanup", bound, ...result };
    }

    if (input.sweep) {
      // The known refs the lane inspector matches worktree paths against. Cache-first, so a
      // ref this node holds only in the mesh cache is still resolvable (the m43 seam).
      const refs = (await listItemsCacheFirst(ws, seamOptions)).map((item) => item.ref);
      const swept = await sweepDispatchLanes(ws.projectRoot, refs, { remove: input.remove === true });
      return { action: "sweep", bound, ...swept };
    }

    const requestedRefs = dispatchRefs(input);
    if (input.list || requestedRefs.length === 0) {
      const refs = (await listItemsCacheFirst(ws, seamOptions)).map((item) => item.ref);
      const lanes = await inspectDispatchLanes(ws.projectRoot, refs);
      // The READY SET rides the list answer, because "what may run at once" and "what is
      // running" are the two halves of one operator question and asking them separately is
      // how a dispatcher ends up acting on a stale half.
      const next = await nextWorkCacheFirst(ws, undefined, seamOptions);
      return {
        action: "list",
        bound,
        lanes,
        overlaps: overlappingFiles(lanes),
        ready: (next.readySet ?? []).map((member) => ({ ref: member.ref, type: member.type, slug: member.slug, status: member.status, path: member.path })),
      };
    }

    // ADR-006 (2026-08-22 amendment) — THE LANE IS THE LOCAL SLOT. Read git's
    // durable lane set before either the pool or the opener runs. Reuse is always
    // admitted; fresh members reserve in request order; over-bound members remain
    // unopened and receive a per-member coded refusal. The pool still bounds its
    // real, smaller job: concurrent lane MATERIALISATION.
    const inspectAdmission = typeof ctx.inspectDispatchLaneAdmission === "function"
      ? ctx.inspectDispatchLaneAdmission
      : inspectDispatchLaneAdmission;
    const withAdmissionLock = typeof ctx.withDispatchAdmissionLock === "function"
      ? ctx.withDispatchAdmissionLock
      : (operation) => withDispatchLaneAdmissionLock(ws.projectRoot, operation);
    const { admission, planned, materialised } = await withAdmissionLock(async () => {
      const admission = await inspectAdmission(ws.projectRoot, requestedRefs);
      const planned = planDispatchLaneAdmissions(requestedRefs, admission, bound);
      const admitted = planned.plans.filter((entry) => entry.admitted);
      const materialised = await dispatchReadySet(
        admitted.map((entry) => ({ ref: entry.ref })),
        (member) => typeof ctx.runDispatchLane === "function"
          ? ctx.runDispatchLane(member)
          : resolveDispatchLane(ws.projectRoot, member.ref),
        { bound },
      );
      return { admission, planned, materialised };
    });
    let materialisedIndex = 0;
    const dispatched = planned.plans.map((entry) => {
      if (entry.admitted) return materialised.dispatched[materialisedIndex++];
      const value = {
        ref: entry.ref,
        outcome: "refused",
        code: entry.code,
        reason: "at-capacity",
        worktree: null,
        created: false,
        reused: false,
        occupied: admission.occupied,
        holders: admission.holders ?? [],
      };
      return { ref: entry.ref, ok: true, outcome: "refused", code: entry.code, value };
    });
    const report = {
      bound,
      dispatched,
      peak: materialised.peak,
      ranAtOnce: materialised.ranAtOnce,
      peakKind: "lane-materialisation",
      occupancy: {
        before: planned.occupiedBefore,
        afterAdmission: planned.occupiedAfterAdmission,
        holders: admission.holders ?? [],
      },
    };
    if (requestedRefs.length === 1) {
      const only = report.dispatched[0];
      if (!only.ok) throw only.error;
      return { action: "open", bound, ...only.value };
    }
    return { action: "dispatch", ...report };
  },

  cli: {
    route: ["work", "dispatch"],
    spec: {
      usage: "aof work dispatch [<ref>...] [--list] [--sweep] [--cleanup <ref>] [--remove] [--json]",
      flags: {
        list: { type: "boolean", description: "report every live lane, its ref, worktree and state" },
        sweep: { type: "boolean", description: "report stranded lanes (never removing one that holds uncommitted work)" },
        cleanup: { type: "boolean", description: "remove a finished lane's worktree and branch" },
        remove: { type: "boolean", description: "with --sweep, also remove the stranded lanes that hold no uncommitted work" },
      },
    },

    argv: (positionals, options) => ({
      ...(positionals.length > 1 ? { refs: positionals } : positionals[0] ? { ref: positionals[0] } : {}),
      ...(options.list ? { list: true } : {}),
      ...(options.sweep ? { sweep: true } : {}),
      ...(options.cleanup ? { cleanup: true } : {}),
      ...(options.remove ? { remove: true } : {}),
    }),

    render(result) {
      const where = (target) => (typeof target === "string" ? path.relative(process.cwd(), target) : "-");
      if (result.action === "open") {
        if (result.outcome === "refused") {
          const holders = (result.holders ?? []).map((lane) => `${lane.ref ?? lane.branch ?? "?"} (${lane.lastActivityAt ?? "last activity unknown"})`).join(", ");
          return `${result.ref} — REFUSED (${result.code}): at capacity ${result.occupied}/${result.bound}${holders ? `; held by ${holders}` : ""}`;
        }
        return `${result.ref} → ${where(result.worktree)}\n        branch ${result.branch} (${result.created ? "created" : "reused"}); concurrency bound ${result.bound}`;
      }
      if (result.action === "dispatch") {
        const lines = result.dispatched.map((entry) => entry.outcome === "refused"
          ? `  ${entry.ref} — REFUSED (${entry.code}): at capacity`
          : entry.ok
            ? `  ${entry.ref} → ${where(entry.value.worktree)} (${entry.value.created ? "created" : "reused"})`
            : `  ${entry.ref} — FAILED: ${entry.error?.message ?? "unknown error"}`);
        return `Dispatch results ${result.dispatched.length}; lane-materialisation peak ${result.peak}/${result.bound}:\n${lines.join("\n")}`;
      }
      if (result.action === "cleanup") {
        return result.outcome === "removed"
          ? `Removed lane ${result.ref} — ${where(result.worktree)}${result.branchRemoved ? ` and branch ${result.branch}` : ` (branch ${result.branch} KEPT — unmerged work is never discarded)`}`
          : `Refused (${result.code}): lane ${result.ref} was not removed.`;
      }
      if (result.action === "sweep") {
        if (result.stranded.length === 0) return "No stranded dispatch lanes.";
        const lines = result.stranded.map((lane) =>
          `  ${(lane.ref ?? "?").padEnd(8)} ${where(lane.worktree)}  branch ${lane.branch ?? "-"}  ${lane.dirty ? "UNCOMMITTED WORK — kept" : lane.state}`);
        return `${result.stranded.length} stranded lane(s):\n${lines.join("\n")}${result.removed.length ? `\nRemoved ${result.removed.length}.` : ""}`;
      }
      const laneLines = result.lanes.length === 0
        ? ["  (no lanes)"]
        : result.lanes.map((lane) => `  ${(lane.ref ?? "?").padEnd(8)} ${lane.state.padEnd(8)} ${where(lane.worktree)}  branch ${lane.branch ?? "-"}${lane.dirty ? `  (${lane.changed.length} changed)` : ""}`);
      const overlapLines = result.overlaps.length === 0
        ? []
        : ["Overlapping files (reported, never merged):", ...result.overlaps.map((entry) => `  ${entry.path} — ${entry.refs.join(", ")}`)];
      return [
        `Ready (${result.ready.length}, bound ${result.bound}): ${result.ready.map((member) => member.ref).join(", ") || "-"}`,
        `Lanes (${result.lanes.length}):`,
        ...laneLines,
        ...overlapLines,
      ].join("\n");
    },

    // The FACE relativises every raw absolute to cwd — command results stay basis-neutral
    // (ADR-002), so the projection lives here and only here.
    json: (result) => {
      const rel = (target) => (typeof target === "string" ? path.relative(process.cwd(), target) : target);
      const projectLane = (lane) => ({ ...lane, worktree: rel(lane.worktree) });
      const out = { ...result };
      if (typeof out.worktree === "string") out.worktree = rel(out.worktree);
      if (Array.isArray(out.lanes)) out.lanes = out.lanes.map(projectLane);
      if (Array.isArray(out.stranded)) out.stranded = out.stranded.map(projectLane);
      if (Array.isArray(out.removed)) out.removed = out.removed.map(projectLane);
      if (Array.isArray(out.kept)) out.kept = out.kept.map(projectLane);
      if (Array.isArray(out.ready)) out.ready = out.ready.map((member) => ({ ...member, path: rel(member.path) }));
      if (Array.isArray(out.dispatched)) {
        out.dispatched = out.dispatched.map((entry) => entry.ok
          ? { ...entry, value: {
              ...entry.value,
              worktree: rel(entry.value.worktree),
              ...(Array.isArray(entry.value.holders) ? { holders: entry.value.holders.map(projectLane) } : {}),
            } }
          : { ref: entry.ref, ok: false, error: entry.error?.message ?? String(entry.error ?? "unknown error") });
      }
      return out;
    },

    // A batch is one command outcome, but its lane results remain individually
    // reportable. Any failed lane therefore gates the process non-zero without
    // throwing away the successful siblings or replacing the report with an error.
    exit: (result) => {
      if (result.action === "cleanup" && result.outcome === "refused") return 1;
      return result.action === "dispatch" && result.dispatched.some((entry) => !entry.ok) ? 1 : 0;
    },
  },
};

// A clean lane is not disposable while one of its projection consequences is still
// owed. Retry only the matching workspace/ref events, then re-read without an attempts
// ceiling: an exhausted failure is still a reason to keep the worktree. If the journal
// itself exists but cannot be inspected, fail closed — cleanup is the destructive side
// of this boundary. A missing journal means no durable consequence was ever recorded;
// the continue procedure separately stops on the command's propagation warning in the
// journal-less fallback case.
export async function settleLaneProjectionEffects(workspace, ref, worktree, ctx = {}) {
  const journalOptions = ctx.effectsJournalOptions ?? {};
  const databasePath = effectsJournalPath(journalOptions);
  if (!existsSync(databasePath)) return { settled: true, retried: 0, remaining: [] };

  let journal = null;
  try {
    journal = await openEffectsJournal(journalOptions);
  } catch (error) {
    return {
      settled: false,
      code: "dispatch-lane-effects-unavailable",
      error: String(error?.message ?? error),
      remaining: [],
    };
  }

  try {
    const roots = new Set([workspace?.projectRoot, worktree].filter(Boolean).map(normalizedRoot));
    const matching = () => readUnsettledSteps(journal, { key: "publish-projection" })
      .filter((step) => step.payload?.ref === ref && roots.has(normalizedRoot(step.payload?.workspaceRoot)));
    const before = matching();
    const outcomes = [];
    for (const eventId of new Set(before.map((step) => step.eventId))) {
      outcomes.push(...await drainEffects({
        journal,
        eventId,
        loci: LOCAL_LOCI,
        ctx: { workspace, publisherOptions: ctx },
      }));
    }
    const remaining = matching();
    return remaining.length === 0
      ? { settled: true, retried: before.length, remaining: [], outcomes }
      : {
          settled: false,
          code: "dispatch-lane-projection-unpublished",
          retried: before.length,
          remaining: remaining.map(({ eventId, status, attempts, lastError }) => ({ eventId, status, attempts, lastError })),
          outcomes,
        };
  } finally {
    journal.close();
  }
}

function normalizedRoot(root) {
  if (typeof root !== "string" || root.length === 0) return "";
  const resolved = path.resolve(root);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function dispatchRefs(input) {
  if (Array.isArray(input?.refs)) {
    return input.refs.map((ref) => String(ref).trim()).filter(Boolean);
  }
  const ref = typeof input?.ref === "string" ? input.ref.trim() : "";
  return ref === "" ? [] : [ref];
}

function requireRef(input, act) {
  const ref = typeof input.ref === "string" ? input.ref.trim() : "";
  if (ref === "") {
    throw commandError(`\`--${act}\` needs a ref: aof work dispatch --${act} <ref>`, "dispatch-ref-required");
  }
  return ref;
}
