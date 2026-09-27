// work:status — read or MOVE an item's lifecycle status, through the one guarded door.
//
// THE DEFECT THIS CLOSES (operator, 2026-08-16: "when it starts a story it doesn't mark it
// in-progress straight away — why not?"). Nothing in the codebase could write a status
// forward. `rollbackItemStatus` wrote BACK on failure, `migrate` inferred one at import,
// and every other transition was prose in the command bundles ("set `STORY.md`
// frontmatter `status`: in-progress when build starts") filed under bookkeeping AFTER the
// process steps — so an agent built the story, then reconciled the record on the way out,
// or forgot. The item read `not-started` for the whole time it was being built, and the
// failure rollback refused every from-state it was ever handed.
//
// So the forward move gets a DOOR, and the door is the same shape as every other write
// verb: exact-ref resolution (a typo never writes the wrong item), a local-checkout
// refusal, the lifecycle table's coded refusals, and the transition seam that raises
// `item-status.changed` so the projection the board/fleet read — and Notion, when
// configured — can never be left behind by a status that only moved on disk.
//
// Two faces, one verb:
//   aof work status <ref>            READ — the current status and its legal next moves
//   aof work status <ref> <status>   MOVE — one legal edge of the lifecycle
//
// …and ONE modifier on the move (74/00): `--if-applicable`, under which the expected
// refusal — `status-edge-not-applicable`, the item is already where you are putting it —
// is DATA (exit 0, `{ moved: false, code, status, edges }`) rather than a 409. The
// scripted callers hit that refusal as the ORDINARY case: anything the phase door or the
// run-mint reactor already started arrives at "mark it started" already started. Every
// other refusal keeps failing, under the flag as without it.
//
// The read form exists because "what may this item do next" is a question the lifecycle
// table can answer and an agent would otherwise guess at. The automatic
// `not-started -> in-progress` on a run mint (effects/table.mjs's run.started reactor)
// covers the machine-driven starts; this door covers the judgement transitions — built
// (`in-review`), accepted (`done`), and genuinely stuck (`blocked`).
//
// NOT item-locked, deliberately: an assignment holds an item's EXECUTION scope (no rival
// mint, no rival worktree), while a status correction is the operator's own record-keeping
// on their own checkout — and a worker's status writes ride its worktree, not this door.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   2026-08-16 — work:status, the ITEM-lifecycle door (distinct from work:run-status, which
//   reads the RUN history). The forward half of the status lifecycle had no command at all:
//   the only programmatic writer was the failure rollback, so every forward move was prose
//   in the command bundles and an item read `not-started` while it was being built.
import { readFile } from "node:fs/promises";

import { resolveItem, resolveItemExact, requireLocalCheckout } from "./resolve.mjs";
import { commandError } from "../command-error.mjs";
import { itemStatusEdges } from "../acceptance-horizon.mjs";
import { transitionItemStatus } from "../effects/item-transitions.mjs";
import { renderWithPropagationWarnings, threadPropagationWarnings } from "../global-work-publisher.mjs";
import { doctorWork } from "../work/doctor.mjs";
import { budgetGroup } from "../work/doctor-budget.mjs";
import { writeText } from "../fs.mjs";
import { headCommit } from "../mesh/worktree.mjs";
import { buildNotifyEnvelope, notify } from "../notify/notify.mjs";
// THE RECORD IS READ THROUGH ITS OWN MODULE AND THROUGH NOTHING ELSE (ADR-008 §1). The heading, the
// header row, the divider, the four required facts and the door predicate all live there, so this
// door holds no second copy of any of them — a comparison site with its own literal freezes a
// belief about the record rather than the record.
import {
  COMMIT_UNKNOWN,
  GATE_COMMAND,
  OVERRIDE_RESULT,
  REGRESSION_RECORD_BASENAME,
  appendRegressionRow,
  detailCell,
  gateInstant,
  isRedRow,
  newestRegressionRow,
  parseRegressionRows,
  regressionRecordPath,
  satisfiesDoor,
} from "../regression-record.mjs";

// ── THE REGRESSION GATE'S DOOR (96/ADR-008 §3, §4, §5) ───────────────────────────────────────
//
// A GATE AN AGENT CAN REPORT AS PASSED IS NOT A GATE. Until this landed, the full-suite run at
// verify was prose in a phase prompt, executed and reported by the same agent that did the work —
// milestone 59's own thesis about `@manual` evidence, applied to the last thing that should carry
// it. 63/R7 is the escape that proves the gate is load-bearing: 63/06's positive-control import
// moved a census split with the story's own lane green, and the failure appeared only at the
// full-suite gate. Story 03 makes narrowing systematic, which makes this door the only thing
// standing between a narrowed lane and a false accept.
//
// AND IT LIVES HERE, IN THE COMMAND LAYER, WHICH IS NOT AN IMPLEMENTATION DETAIL (ADR-008 §3).
// `src/acceptance-horizon.mjs` imports nothing, deliberately (66/ARCHITECTURE ROUND 3/3), because
// 66/02's FF-6605 forbids the controls lane reaching `node:fs` through its direct imports. A
// predicate that reads a recorded result cannot live there and stay legal, so homing this "closer
// to the lifecycle" would fail 66/02 on arrival. It lands beside `--if-applicable`, which is the
// idiom the override below borrows.
//
// TWO CODES, AND THEY ARE DISJOINT FROM THE VOCABULARIES ALREADY IN SERVICE — doctor's
// `CONTROL_FINDING_CODES` and the audit's own set — because a shared code would let one command's
// severity table decide the other's meaning (the FF-5905 species).
export const GATE_MISSING = "regression-gate-missing";
export const GATE_RED = "regression-gate-red";

// The override's own refusal, and it is a DIFFERENT repair: not "run the gate" but "say why you are
// not". A silent override is indistinguishable from no gate at all within two milestones — the gate
// would be present, always satisfied, and nobody could say when it had last actually run — so the
// reason is the whole mechanism and an empty one is refused.
export const OVERRIDE_REASON_REQUIRED = "gate-override-reason-required";

function gateRefusal(ref, code, message, detail) {
  const error = commandError(`Acceptance refused for ${ref}: ${message}`, code, 409);
  error.detail = { ref, ...detail };
  throw error;
}

/**
 * The accept door's gate check, and — under an override — its recorded reason.
 *
 * MILESTONES ONLY (ADR-008 §5). A story's `done` is untouched: the gate is bought back at the
 * milestone door, which is where story 03 sold it, and putting it on every story would make a
 * narrowed story lane pointless twice over. Every other lifecycle edge is untouched too — this runs
 * only on the move to `done`, and only when that edge is legal, so an item that could not be
 * accepted anyway is refused by the lifecycle rather than by a gate it was never going to reach.
 *
 * THE ROW IS WRITTEN BEFORE THE MOVE, not after. The record is the evidence that PERMITTED the
 * accept, and a move that succeeded with its reason lost is the exact failure ADR-008 §4 exists to
 * prevent — where a stray row on a subsequent refusal is only noise. The legal-edge guard above is
 * what keeps that stray case to a genuine race.
 */
async function admitThroughRegressionGate(item, input, ctx) {
  const asked = Object.hasOwn(input, "gateOverride");
  const reason = typeof input.gateOverride === "string" ? input.gateOverride.trim() : "";

  const target = regressionRecordPath(item.dir);
  let existing = null;
  try {
    existing = await readFile(target, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  // A MALFORMED RECORD STOPS THE ACCEPT with the record's own coded refusal, and that is the point
  // of the record refusing rather than skipping: a row nobody can read and a gate nobody ran are the
  // same fact, and only one of them used to be visible.
  const rows = existing == null ? [] : parseRegressionRows(existing, target);
  const newest = newestRegressionRow(rows);

  if (!asked) {
    if (newest == null) {
      gateRefusal(
        item.ref,
        GATE_MISSING,
        `no regression gate has run — there is no ${REGRESSION_RECORD_BASENAME} beside its records. Run ${GATE_COMMAND} on a clean checkout, or accept with --gate-override "<reason>" and say why the run cannot happen here.`,
        { record: null },
      );
    }
    if (isRedRow(newest)) {
      gateRefusal(
        item.ref,
        GATE_RED,
        `the newest regression gate run (${newest.commit}, ${newest.instant}) was RED: ${newest.detail ?? "no detail recorded"}. An older green row does not rescue it — fix the suite and re-run ${GATE_COMMAND}, or accept with --gate-override "<reason>".`,
        { record: newest },
      );
    }
    if (!satisfiesDoor(newest)) {
      gateRefusal(
        item.ref,
        GATE_MISSING,
        `the newest regression gate row ran as scope "${newest.scope}", which is not a whole-tree run — a partial run is recorded, and it does not satisfy this door. Re-run ${GATE_COMMAND} on a clean checkout, or accept with --gate-override "<reason>".`,
        { record: newest },
      );
    }
    return { gate: newest, override: null };
  }

  if (reason === "") {
    const error = commandError(
      `--gate-override requires a reason, and ${item.ref} was given none. The reason is the whole mechanism: it is written into the record as its own row, read at the next accept and diffable against the last one. A silent override is indistinguishable from no gate at all within two milestones.`,
      OVERRIDE_REASON_REQUIRED,
      400,
    );
    error.detail = { ref: item.ref };
    throw error;
  }

  const commit = await headCommit(ctx.workspace.projectRoot);
  if (commit == null) {
    const error = commandError(
      `${item.ref} cannot record an override here: this checkout could not name its HEAD, and a row without a commit is a row the record refuses to read back.`,
      COMMIT_UNKNOWN,
      409,
    );
    error.detail = { ref: item.ref };
    throw error;
  }

  // AN OVERRIDE OVER A RED GATE NAMES THE ROW IT OVERRODE, so the record says what was known at the
  // time rather than only what was decided.
  const overrode = isRedRow(newest) ? ` (overrides the red row ${newest.commit})` : "";
  const row = {
    commit,
    instant: gateInstant(input.now),
    scope: OVERRIDE_RESULT,
    result: OVERRIDE_RESULT,
    detail: detailCell(`${reason}${overrode}`),
  };
  await writeText(target, appendRegressionRow(existing, row, target));
  return { gate: null, override: row };
}

export const itemStatusCommand = {
  id: "work:status",
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      // Absent ⇒ the READ face. Present ⇒ the move's target; validated against the
      // lifecycle table by work.mjs (never by a second copy of the vocabulary here).
      status: { type: "string" },
      // The SCRIPTED caller's declaration that it knows the item may already be where it
      // is asking to put it (74/00). Under it, `status-edge-not-applicable` — and ONLY
      // that code — is answered as DATA rather than thrown. See the run() body.
      ifApplicable: { type: "boolean" },
      // THE ONE ESCAPE FROM THE REGRESSION GATE (96/ADR-008 §4), and it is DATA rather than a
      // switch: the reason is written into the record as its own row. Present-with-an-empty-value
      // is refused, so the key's presence alone never permits the move.
      gateOverride: { type: "string" },
      // `now` (ISO-8601 UTC-Z) is an INJECTED clock (the established white-box test
      // input, never a CLI flag): it stamps the record's `updated:` date, and a gate
      // row's instant.
      now: { type: "string" },
    },
    required: ["ref"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    const ref = typeof input.ref === "string" ? input.ref.trim() : "";
    if (ref === "") throw commandError("A work ref is required.", "missing-ref", 400);
    const toStatus = typeof input.status === "string" ? input.status.trim() : "";

    // THE READ tolerates the slug-fallback resolver (like work:doc / work:run-status) and
    // answers from the cache for a ref this checkout does not hold — reporting whose view
    // it returned rather than pretending the item is absent.
    if (toStatus === "") {
      const item = await resolveItem(ctx, ref);
      if (!item) throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
      return {
        ref: item.ref,
        status: item.status ?? null,
        edges: itemStatusEdges(item.status),
        answeredFrom: item.answeredFrom ?? "disk",
        ...(item.reportedBy ? { reportedBy: item.reportedBy } : {}),
      };
    }

    // THE WRITE resolves by EXACT ref — never the free-text slug fallback the read
    // tolerates — and refuses a ref whose folder is not on this node (ADR-010/R6.4): the
    // record doc is the item's own authority, and there is no honest way to move a status
    // in a checkout you do not have.
    const item = await resolveItemExact(ctx, ref);
    if (!item) throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
    requireLocalCheckout(item, ref);

    // ADR-007 — acceptance is the ONE place an artifact budget binds. The ordinary
    // doctor surface remains advisory; this exact-item preflight runs the SAME group,
    // over the SAME snapshot measurement and resolved config budgets, with only the
    // accepting ref injected. No other status edge pays or applies this gate.
    if (toStatus === "done" && itemStatusEdges(item.status).includes("done")) {
      const findings = await doctorWork(ctx.workspace.workDir, ctx.workspace.config, item.ref, {
        groups: [budgetGroup],
        acceptingRef: item.ref,
        projectRoot: ctx.workspace.projectRoot,
      });
      const refused = findings.filter((finding) => finding.code === "doc-over-budget" && finding.severity === "error");
      if (refused.length > 0) {
        const error = commandError(
          `Acceptance refused for ${item.ref}: ${refused.map((finding) => finding.message).join("; ")}`,
          "artifact-budget-exceeded",
          409,
        );
        error.detail = { ref: item.ref, findings: refused };
        throw error;
      }
    }

    // ADR-008 §3, §5 — THE REGRESSION GATE. Scoped to MILESTONES and to the one edge, guarded by
    // the same legal-edge test the budget preflight uses so an unacceptable item is refused by the
    // lifecycle rather than by a gate it was never going to reach. Nothing else in this verb is
    // touched: the read face, every other edge and a story's `done` all behave exactly as before.
    let gateAdmission = null;
    if (toStatus === "done" && item.type === "milestone" && itemStatusEdges(item.status).includes("done")) {
      gateAdmission = await admitThroughRegressionGate(item, input, ctx);
    }

    try {
      const { record, effects } = await transitionItemStatus(
        item,
        { toStatus, now: input.now },
        {
          workspace: ctx.workspace,
          publisherOptions: ctx,
          journalOptions: ctx.effectsJournalOptions ?? {},
        },
      );
      // 131/ADR-005 §4 — AN ACCEPTED MILESTONE IS ANNOUNCED, once, from this door and no other, after
      // the move has been written. A direct awaited call, not an effects reactor: a notification
      // mutates no store, and an at-least-once redelivered post is the volume problem. Awaited
      // because an un-awaited promise in an exiting CLI is dropped. `notify` never throws, so a
      // failing webhook never fails the accept, and the result below carries nothing about it.
      if (item.type === "milestone" && record.status === "done") {
        const envelope = buildNotifyEnvelope("milestone-accepted", { ref: item.ref, outcome: { title: item.title ?? null } }, { config: ctx.workspace.config });
        await notify(ctx.workspace, envelope, { ...(ctx.notifyOptions ?? {}) });
      }
      return threadPropagationWarnings(
        {
          ...record,
          moved: true,
          edges: itemStatusEdges(record.status),
          // The gate's own answer, reported on the RESULT so `--json` carries the claim the
          // operator reads: an accept that went through the gate names the row that let it, and one
          // that went through the override names the reason it recorded. Absent on every other
          // move, which is exactly the set of moves the gate does not govern.
          ...(gateAdmission?.gate ? { regressionGate: gateAdmission.gate } : {}),
          ...(gateAdmission?.override ? { gateOverride: gateAdmission.override } : {}),
        },
        effects,
      );
    } catch (error) {
      // `--if-applicable` — THE EXPECTED REFUSAL AS DATA (74/00). The phase door already
      // works this way (`startedHere`, commands/continue.mjs: `{ statusMoved: false,
      // statusCode }`, and the act still succeeds); this is the same reading on the write
      // face, taken only when the caller asks for it.
      //
      // ONE CODE, AND NO MORE. `ref-not-found`, `invalid-status`, the no-local-checkout
      // refusal and `record-doc-unusable` all mean "stop and look", and they reach an agent
      // through this same channel — narrowing any of them would put the interesting
      // failures back into the bucket the flag exists to empty. The bare verb is unchanged:
      // a refusal an operator TYPED is worth surfacing loudly.
      if (input.ifApplicable !== true || error?.code !== "status-edge-not-applicable") throw error;
      const actualStatus = Object.hasOwn(error?.detail ?? {}, "status") ? error.detail.status : item.status ?? null;
      return {
        ref: item.ref,
        // The writer re-read the record doc at the transition door. Prefer that observed
        // state over a cache-first resolver row that may be older than the checkout.
        status: actualStatus,
        moved: false,
        code: error.code,
        reason: error.message,
        asked: toStatus,
        edges: itemStatusEdges(actualStatus),
      };
    }
  },

  cli: {
    route: ["work", "status"],
    spec: {
      usage: "aof work status <ref> [<status> [--if-applicable] [--gate-override \"<reason>\"]] [--json]",
      flags: {
        ifApplicable: {
          type: "boolean",
          description: "on the move form: report an inapplicable move as data (exit 0) instead of failing",
        },
        // A STRING FLAG, AND THAT IS THE MECHANISM. Declared `string` rather than `boolean`, so
        // `--gate-override` with nothing after it is the face's own `missing-flag-value` refusal
        // before this command runs at all — there is no bare switch spelling of an override.
        gateOverride: {
          type: "string",
          description: "accept a milestone without a green regression gate, recording this reason as its own row",
        },
      },
    },

    // `aof work status <ref> [<status>] [--if-applicable]` — the second positional is the
    // move's target; omitted, the verb reads (and the flag is inert: a read raises no edge
    // refusal to narrow). An unknown word is refused by the lifecycle table with the legal
    // values named, so no vocabulary is duplicated in this adapter.
    argv: (positionals, options = {}) => ({
      ref: positionals[0],
      ...(typeof positionals[1] === "string" && positionals[1] !== "" ? { status: positionals[1] } : {}),
      ...(options.ifApplicable === true ? { ifApplicable: true } : {}),
      // Passed through VERBATIM, whitespace included — the emptiness test is the command's, so
      // `--gate-override "   "` reaches the same refusal a programmatic caller's `""` does rather
      // than being tidied into absence here.
      ...(typeof options.gateOverride === "string" ? { gateOverride: options.gateOverride } : {}),
    }),

    render: (result) => {
      const edges = result.edges?.length > 0 ? result.edges.join(", ") : "none (terminal)";
      if (result.moved) {
        return renderWithPropagationWarnings(
          `${result.ref} — ${result.from ?? "none"} → ${result.status}. Next legal moves: ${edges}.`,
          result,
        );
      }
      // The `--if-applicable` answer — a plain statement of where the item already is. It
      // must never read as a move: the whole point is that an agent (and a hook reading the
      // exit code) can tell "already there" from "it moved" without parsing prose.
      if (result.moved === false) {
        return `${result.ref} — already ${result.status ?? "no status"}; nothing moved (asked for ${result.asked}). Legal moves: ${edges}.`;
      }
      return `${result.ref} — ${result.status ?? "no status"}. Legal moves: ${edges}.`;
    },

    // No path in the result (the record carries its ref) — passes through unchanged.
    json: (result) => result,
  },
};
