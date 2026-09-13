// work:promote-gap — milestone 39 / story 03 (gap-to-chore, SPEC "a gap is a
// debt, not a note"; ARCHITECTURE ADR-001). Promotes a declared OPEN gap
// (title + discharge condition) into a top-level `chore` (milestone 37) whose
// `## Definition of Done` is seeded from the gap's OWN discharge condition (its
// close criterion) and which records a back-reference to the originating gap —
// so a declared debt becomes SCHEDULABLE work, visible where work is chosen.
//
// 71/01 (ADR-004): this is now a FACE. The promotion mechanics it used to own —
// the DoD seed, the back-reference author, the slug derivation, the append
// position and the call into the chore insert seam — moved WHOLE into
// `src/work-promote/`, and the second face (`work:promote-finding`) reaches the
// same code by import. Nothing here changed shape: the refusals, their codes,
// the rendered lines and the returned document are the ones this verb shipped
// with, and 39's own suite is the control on that (a behavioural claim over a
// seam, so it lives in 71/01's `.feature`, not in a register).
//
// Boundary (QA-added, STORY "Notes"): an already-`discharged` gap has no debt
// left to schedule — the promotion is REFUSED (no chore created), not silently
// scheduled as closed work.
import { INSERT_FLAGS } from "./insert-shared.mjs";
// milestone 127 / ADR-003 §4/§5 — ONE IMPORT LINE MOVED, nothing else. `runInsertTopLevel` went with
// the mint to `promote.mjs`; this face keeps appending through `appendPosition` (71/ADR-003), and its
// `PROMOTED_TYPE` literal, its seed and its idempotence scan are untouched.
import { runInsertTopLevel } from "./promote.mjs";
import { commandError } from "../command-error.mjs";
import { gapBackReference, NO_REGRESSION_ITEM } from "../work-promote/chore-seed.mjs";
import { appendPosition, PROMOTED_TYPE, seedPromotedChore, slugifyTitle } from "../work-promote/promotion.mjs";

// The promotion engine. `gap` is { title, status, dischargeCondition } — the
// minimal shape a declared `## Gaps` record (story 01/02's ADR-001 `gap`
// MemoryRecord) already carries; this module reads it as plain data, coupling
// to no parser. Returns:
//   promoted:false -> { promoted:false, reason, gap }               (refused)
//   promoted:true  -> { promoted:true, gap, chore:{ref,slug,dir}, shifted }
export async function runPromoteGapToChore(ctx, { gap, at: rawAt, yes, today } = {}) {
  const title = gap?.title;
  const status = gap?.status ?? "open";
  const dischargeCondition = gap?.dischargeCondition ?? "";

  if (!title) throw commandError("A gap title is required to promote.", "promote-gap-invalid-title", 400);
  // `invoke` does NOT enforce the input schema's `required` (schema is advisory,
  // not enforced) — a missing/blank --discharge must be refused HERE, mirroring
  // the title guard above, or a chore is born with an empty `- [ ] ` DoD (a debt
  // scheduled with no close criterion — the discharge condition IS the DoD).
  if (!dischargeCondition.trim()) {
    throw commandError("A discharge condition (--discharge) is required to promote a gap.", "promote-gap-invalid-discharge", 400);
  }

  // Boundary: an already-discharged gap has no debt to schedule — refused, not
  // silently scheduled as closed work.
  if (status === "discharged") {
    return { promoted: false, reason: "gap is already discharged", gap: { title, status } };
  }

  // The slug refusal keeps this verb's OWN code (`promote-gap-invalid-title`),
  // which delivered 39/03 criteria stand behind — so it is raised here rather
  // than left to the engine's generic one.
  if (!slugifyTitle(title)) {
    throw commandError(`gap title "${title}" does not yield a valid slug.`, "promote-gap-invalid-title", 400);
  }

  const workDir = ctx.workspace.workDir;
  const slug = slugifyTitle(title);
  // The OPERATOR may choose a position on a promotion they type — `--at <P>` is a delivered 39/03
  // flag and it keeps working. Absent one, the promotion appends and shifts nothing.
  const at = rawAt != null && rawAt !== "" ? rawAt : await appendPosition(workDir);

  // Reuse the SAME chore insert engine `work:insert-chore` calls — never a bespoke writer
  // (feasibility flag 4). The type is the engine's one constant, never a literal spelled here.
  const insertResult = await runInsertTopLevel(ctx, { type: PROMOTED_TYPE, slug, at, yes: Boolean(yes), today });
  await seedPromotedChore(insertResult.created.dir, {
    definitionOfDone: [dischargeCondition, NO_REGRESSION_ITEM],
    backReference: gapBackReference({ title }),
  });

  return {
    promoted: true,
    gap: { title, status },
    chore: { ref: insertResult.created.ref, slug, dir: insertResult.created.dir },
    shifted: insertResult.shifted,
  };
}

export const promoteGapToChoreCommand = {
  id: "work:promote-gap",
  input: {
    type: "object",
    properties: {
      title: { type: "string" },
      discharge: { type: "string" },
      status: { type: "string" },
      at: { type: ["number", "string"] },
      yes: { type: "boolean" },
      today: { type: "string" },
    },
    required: ["title", "discharge"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    return await runPromoteGapToChore(ctx, {
      gap: { title: input.title, status: input.status || "open", dischargeCondition: input.discharge },
      at: input.at,
      yes: Boolean(input.yes),
      today: input.today,
    });
  },

  cli: {
    // m42 wave (d) leg d1 (wave 2) — routed through the registry-derived table +
    // the ONE generic face; the cli.mjs workInsertCli branch is deleted.
    route: ["work", "promote-gap"],
    spec: {
      usage: 'aof work promote-gap "<title>" --discharge "…" [--status open] [--at <P>] [--yes] [--json]',
      flags: {
        ...INSERT_FLAGS,
        discharge: { type: "string", description: "the discharge condition the chore must satisfy" },
        status: { type: "string", description: "the gap's recorded status (default open)" },
      },
    },
    // `aof work promote-gap "<gap title>" --discharge "<condition>" [--status open|discharged] [--at P] [--yes] [--json]`.
    argv: (positionals, options) => ({
      title: positionals[0],
      discharge: options.discharge,
      status: options.status,
      at: options.at,
      yes: Boolean(options.yes || options.force),
    }),

    render(result) {
      if (!result.promoted) {
        return `Gap "${result.gap.title}" is already discharged — nothing to promote.`;
      }
      return `Promoted gap "${result.gap.title}" to chore "${result.chore.slug}" at ${result.chore.ref} (shifted ${result.shifted} item(s)).`;
    },

    json: (result) => result,
  },
};
