// work:continue — "continue this task", with ONE option: WHERE to continue it.
//
// THE DEFECT (operator, 2026-07-26): there were three different doors to the same act.
// The board's Continue button opened a LOCAL agent on whatever machine serves the board;
// the fleet's Run [continue] → Assign dispatched to a chosen node; the slash command
// `/aof:continue <ref>` was typed by hand inside whichever session you happened to have.
// So clicking Continue on a milestone a worker had been building started a second,
// divergent line of work on the control node — against a checkout holding none of it.
//
// THE RULE (operator, verbatim): "The endpoint should be singular, as is the CLI:
// continue this task. With an option indicating where to continue it. Default is the
// last node that worked on it."
//
// So this command answers exactly one question — WHERE does this continue happen — and
// every face (board button, CLI, fleet) goes through it:
//
//   node given          → there.
//   no node, ran before → the node that last ran it (the SAME execution overlay the
//                         board already reads for its status column, so "the node the
//                         board says last ran this" and "the node this continues on"
//                         can never disagree).
//   no node, never ran  → here, locally.
//
// It does NOT spawn anything itself. A local continue returns the command for the
// caller's own terminal to run (the board's dock, the CLI's session); a remote continue
// mints the assignment and the worker's daemon picks it up. One decision, one place.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
// From the comment on `continueCommand`'s COMMANDS entry:
//   work:continue (2026-07-26) — THE single "continue this task [--node <id>]" door.
//   Every face (board button, CLI, fleet) resolves WHERE a continue happens here, so a
//   board click can no longer start a local run against work that lives on a worker.
//
// From the comment on `refineDoorCommand`'s COMMANDS entry:
//   m42 wave (b) — the one-door-per-act COMPLETION: refine and verify are the SAME
//   door (one factory, one decision, one scope rule) with their own lifecycle phase.
import { commandError } from "../command-error.mjs";
import { assignWork } from "../mesh/assignment.mjs";
import { resolveItem, resolveItemExact } from "./resolve.mjs";
// 2026-08-16 — the LIFECYCLE half of the one-door-per-act rule. Opening the act is the
// moment the item starts, so the door that opens it writes the status: `continue`/`refine`
// on a LOCAL act moves a `not-started`/`blocked` item to `in-progress`. Before this, the
// forward move was prose in the bundle ("set status: in-progress when build starts"),
// filed under bookkeeping after the process steps — so it landed on the way out, or not
// at all, and the board read `not-started` under a story being built.
import { transitionItemStatus } from "../effects/item-transitions.mjs";
import { readExecutionOverlay, resolveScopedExecution, executionScopeRef } from "../board-mesh-execution.mjs";
import { readStreamedItemRow } from "../cache-read.mjs";

// resolveContinueDecision(overlay, ref, { requestedNode, localNodeId }) — the PURE
// where-does-this-continue-happen decision, extracted so it is unit-testable without a
// store (the effectful run() below only executes what this decides).
//
// EXECUTION SCOPE (operator, 2026-07-26 — the story-continue defect): runs, assignments,
// branches and worktrees are recorded against the TOP-LEVEL item, so a story ref has no
// execution row of its own. The original decision looked up the overlay by EXACT ref,
// found nothing for "18/02" while milestone 18 ran on a worker, and fell through to
// "here" — a rival local run, the one-door defect one level down. The decision now
// resolves through the ONE scope rule (board-mesh-execution.mjs), and adds a third
// answer alongside local/remote:
//
//   scope actively running  → "running" — the act is ALREADY happening on <node>;
//                             nothing is minted, nothing local is spawned. Running work
//                             is watched, not restarted.
//   scope ran before        → "remote", dispatched at the SCOPE ref (the unit of mesh
//                             execution — assigning the child ref would mint a second
//                             branch/worktree beside the milestone's, the divergence
//                             this door exists to prevent).
//   never ran / this node   → "local", at the EXACT ref (a local session can continue
//                             a single story directly).
//
// An explicit requestedNode still wins (the operator said where); a dispatch into an
// active assignment is refused loudly by the assign core, never silently rerouted.
export function resolveContinueDecision(overlay, ref, { requestedNode = "", localNodeId = null } = {}) {
  const scopeRef = executionScopeRef(ref);
  const scoped = resolveScopedExecution(overlay, ref);

  if (requestedNode !== "") {
    if (localNodeId != null && requestedNode === localNodeId) {
      return { where: "local", node: localNodeId, dispatchRef: ref, scopeRef, resolvedBy: "requested" };
    }
    return { where: "remote", node: requestedNode, dispatchRef: scopeRef, scopeRef, resolvedBy: "requested" };
  }

  if (scoped?.execution?.active === true) {
    return {
      where: "running",
      node: scoped.execution.nodeId ?? null,
      dispatchRef: scoped.scopeRef,
      scopeRef: scoped.scopeRef,
      resolvedBy: "active-run",
      execution: scoped.execution,
    };
  }

  const last = scoped?.execution?.nodeId ?? "";
  if (last === "" || (localNodeId != null && last === localNodeId)) {
    return {
      where: "local",
      node: localNodeId,
      dispatchRef: ref,
      scopeRef,
      resolvedBy: last === "" ? "no-prior-run" : "last-node",
    };
  }
  return { where: "remote", node: last, dispatchRef: scopeRef, scopeRef, resolvedBy: "last-node" };
}

// createPhaseDoorCommand(phase) — m42 wave (b), the ONE-DOOR-PER-ACT completion:
// continue was the pattern; refine and verify are the SAME door with a different
// lifecycle phase. ONE implementation (this factory), three registered commands —
// the decision (resolveContinueDecision above), the running/local/remote answers,
// the scope-ref dispatch rule and the loud refusal discipline can never drift
// between the acts. The dispatched slash command is `/aof:<phase> <ref>`; the mesh
// phase directive is the SAME closed set the fleet's assign picker already uses.
const PHASE_VERBS = { continue: "Continuing", refine: "Refining", verify: "Verifying" };
const PHASE_IMPERATIVES = { continue: "Continue", refine: "Refine", verify: "Verify" };

// resolveDirectivePhase(workspace, phase, dispatchRef, storeOptions) — WHAT continuing
// this item means (operator, 2026-07-26: "continue xy should be a continuation of the
// entire milestone. All stories. Why is it not CONTINUING UNTIL COMPLETION"). A
// CONTINUE whose dispatch target is a MILESTONE resolves to the `autonomous` cascade —
// the worker drives refine → build → verify across every story until the milestone is
// done, stopping only at a genuine human gate — because a milestone continue that runs
// one slice and parks is exactly the truncation the operator kept measuring. Every
// other case (a story/task continue, every refine/verify) keeps its single-phase
// directive. The item's type comes from the local index first, else the
// worker-streamed row (the SAME local-then-streamed order every read command uses);
// an unresolvable type degrades to the single phase — the act must never be blocked
// by a type lookup.
export async function resolveDirectivePhase(workspace, phase, dispatchRef, storeOptions) {
  if (phase !== "continue") return phase;
  let type = null;
  try {
    // m43 / story 06 (ADR-005) — through the migrated chokepoint, so a ref only the cache
    // knows resolves its TYPE here instead of falling through to the streamed-row lookup
    // below. The fallback stays: an artifact streamed ahead of the row that names it still
    // answers, and an unresolvable type still degrades to the single phase rather than
    // blocking the act.
    const local = await resolveItem({ workspace, globalWorkStoreOptions: storeOptions ?? {} }, dispatchRef);
    type = local?.type ?? null;
    if (type == null) {
      const streamed = await readStreamedItemRow(workspace, dispatchRef, { globalWorkStoreOptions: storeOptions });
      type = streamed?.type ?? null;
    }
  } catch {
    type = null;
  }
  return type === "milestone" ? "autonomous" : phase;
}

// The PHASES that start work. Opening a `continue` (build) or a `refine` (author the
// contract) means the item is being worked on from now, so the door moves it to
// `in-progress`. `verify` does NOT: an item reaching verification is already past
// in-progress, and its move — `done` — is the acceptance judgement at the END of that
// phase, never a consequence of opening the door (`aof:verify` sets it through
// `aof work status <ref> done` once the gates pass).
const STARTING_PHASES = new Set(["continue", "refine"]);

// startedHere(ctx, phase, ref) — the LOCAL act's status move, as result DATA.
//
// Three bounds, all deliberate:
//   · LOCAL ONLY. A remote act is dispatched to a worker, whose own run mint writes the
//     status inside its worktree (effects/table.mjs's run.started reactor) — the tree that
//     commits the change. A control-side write here would edit the same frontmatter line
//     on this checkout and hand the worker's branch a conflict over one field.
//   · NEVER FATAL. This door's answer is WHERE the act happens; a status that cannot move
//     (already in-progress, an at-least-once repeat) or a record doc that cannot carry one
//     (`record-doc-unusable`, 74/01) must not fail the act. The outcome is reported as
//     data instead — `statusCode` names which, so the fault is legible in the result even
//     though it is not thrown.
//   · FORWARD ONLY, from not-started|blocked (setItemStatus's expectFrom) — opening a
//     continue on an `in-review` item must not drag it back to the bench.
async function startedHere(ctx, phase, ref) {
  if (!STARTING_PHASES.has(phase)) return {};
  try {
    const item = await resolveItemExact(ctx, ref);
    // No local folder ⇒ no record doc to move (the cache-answered row, ADR-010/R6.4).
    if (item?.dir == null) return { statusMoved: false, statusCode: "no-local-checkout" };
    const { record } = await transitionItemStatus(
      item,
      { toStatus: "in-progress", expectFrom: ["not-started", "blocked"] },
      { workspace: ctx.workspace, publisherOptions: ctx, journalOptions: ctx.effectsJournalOptions ?? {} },
    );
    return { statusMoved: true, status: record.status, statusFrom: record.from };
  } catch (error) {
    return { statusMoved: false, statusCode: error?.code ?? "status-move-failed" };
  }
}

export function createPhaseDoorCommand(phase) {
  return {
    id: `work:${phase}`,
    input: {
      type: "object",
      properties: {
        ref: { type: "string" },
        node: { type: "string" },
      },
      required: ["ref"],
      additionalProperties: false,
    },

    async run(input, ctx) {
      const ref = typeof input.ref === "string" ? input.ref.trim() : "";
      if (ref === "") throw commandError("A work ref is required.", "missing-ref", 400);

      const storeOptions = ctx.globalWorkStoreOptions ?? {};

      // 127/ADR-003 §1 — A MINT IS NEVER DISPATCHED. This door decides WHERE a phase runs
      // and may hand it to a worker; a number is minted by ONE verb, where the operator is,
      // on the control node. A `promote` inside a dispatched run would mint from the
      // worker's copy of the stream, and two nodes can mint the same number. So a ref that
      // names a BACKLOG row is refused here, before the overlay is read, before any status
      // moves and before an assignment exists — the operator promotes locally and comes
      // back with a number. (The PROMPT `/aof:refine <slug>` does exactly that as its step
      // 0; the loop hands this door live rows only, FF-12706, so it never meets this.)
      //
      // Resolution is the door's OWN exact resolver, unchanged: `DELTA`, `delt` and
      // `ideas/delta` are no row's ref and answer exactly as they did before this story.
      //
      // THE TEST IS `=== null`, NOT `== null`, and not `isLiveStreamRow`. A findWork row
      // carries `number` only when the row came from a NEW root (127/ADR-002 §3): a live
      // row has no `number` key at all, so a `== null` test would refuse the whole stream,
      // and the one predicate reads an absent key as not-live for the same reason. An
      // explicit `null` is the backlog marker, and a cache-answered row (whose number is
      // derived from its ref) is never null either.
      const exact = await resolveItemExact(ctx, ref);
      if (exact?.number === null) {
        throw commandError(
          `\`${exact.ref}\` is a backlog item — \`aof work promote ${exact.ref}\` first; a mint is never dispatched.`,
          "phase-backlog-ref",
          409,
        );
      }

      const localNodeId = ctx.workspace?.config?.mesh?.nodeId ?? null;

      const requestedNode = typeof input.node === "string" ? input.node.trim() : "";
      const overlay = await readExecutionOverlay(ctx.workspace, { globalWorkStoreOptions: storeOptions });
      const decision = resolveContinueDecision(overlay, ref, { requestedNode, localNodeId });

      // Already in flight (the ref itself, or its scope — the milestone a story
      // belongs to). Nothing is minted and nothing local is spawned: the honest
      // answer is WHERE it is running, so the caller watches instead of racing it.
      if (decision.where === "running") {
        return {
          ok: true,
          ref,
          where: "running",
          node: decision.node,
          scopeRef: decision.scopeRef,
          state: decision.execution?.state ?? null,
          assignmentId: decision.execution?.assignmentId ?? null,
          sessionId: decision.execution?.sessionId ?? null,
          resolvedBy: decision.resolvedBy,
        };
      }

      // Local — either nothing has ever run this scope, or the resolved node IS
      // this node. The caller runs it in its own session; nothing is minted, so a
      // local act can never leave an assignment row behind for a run that only ever
      // existed in a terminal. Local acts keep the EXACT ref (a session can refine/
      // continue/verify one story directly). A local MILESTONE continue carries the
      // same cascade its remote form dispatches (resolveDirectivePhase) — the act
      // means the same thing on every machine.
      if (decision.where === "local") {
        const localPhase = await resolveDirectivePhase(ctx.workspace, phase, ref, storeOptions);
        return {
          ok: true,
          ref,
          where: "local",
          node: decision.node,
          resolvedBy: decision.resolvedBy,
          command: `/aof:${localPhase} ${ref}`,
          ...(await startedHere(ctx, phase, ref)),
        };
      }

      // Remote — dispatched at the SCOPE ref (the unit of mesh execution: one
      // branch, one worktree per top-level item; assigning a child ref would mint a
      // divergent second line beside the milestone's own). A milestone continue
      // dispatches the `autonomous` cascade (resolveDirectivePhase above).
      const directivePhase = await resolveDirectivePhase(ctx.workspace, phase, decision.dispatchRef, storeOptions);
      const result = await assignWork(ctx.workspace, decision.dispatchRef, decision.node, { phase: directivePhase, globalWorkStoreOptions: storeOptions });
      if (result?.ok !== true) {
        // assignWork returns expected refusals structurally (already-active, unknown
        // node, repo unavailable) — surfaced as a coded error, never a silent fall
        // back to a local run, which is the exact surprise this door exists to remove.
        throw commandError(result?.error ?? `The ${phase} was refused.`, result?.code ?? `${phase}-refused`, 409);
      }
      return {
        ok: true,
        ref,
        where: "remote",
        node: decision.node,
        scopeRef: decision.scopeRef,
        resolvedBy: decision.resolvedBy,
        assignmentId: result.assignmentId,
        command: `/aof:${directivePhase} ${decision.dispatchRef}`,
      };
    },

    cli: {
      // m42 wave (d) leg d1 (wave 2) — routed through the registry-derived table
      // + the ONE generic face; the cli.mjs runVerbCli branches are deleted.
      route: ["work", phase],
      spec: {
        usage: `aof work ${phase} <ref> [--node <id>] [--json]`,
        flags: {
          node: { type: "string", description: "the node to run on (defaults to the last node that worked on it)" },
        },
      },

      // `aof work <phase> <ref> [--node <id>]`
      argv: (positionals, options = {}) => ({
        ref: positionals[0],
        ...(typeof options.node === "string" ? { node: options.node } : {}),
      }),
      render: (result) => {
        if (result.where === "running") {
          const scope = result.scopeRef && result.scopeRef !== result.ref ? ` (via ${result.scopeRef})` : "";
          return `"${result.ref}" is already running on ${result.node ?? "a worker"}${scope} — watch it, don't restart it.`;
        }
        if (result.where === "remote") {
          const scope = result.scopeRef && result.scopeRef !== result.ref ? ` as ${result.scopeRef}` : "";
          return `${PHASE_VERBS[phase]} "${result.ref}"${scope} on ${result.node} (assignment ${result.assignmentId}).`;
        }
        return `${PHASE_IMPERATIVES[phase]} "${result.ref}" here — run: ${result.command}`;
      },
      json: (result) => result,
    },
  };
}

export const continueCommand = createPhaseDoorCommand("continue");
export const refineDoorCommand = createPhaseDoorCommand("refine");
export const verifyDoorCommand = createPhaseDoorCommand("verify");
