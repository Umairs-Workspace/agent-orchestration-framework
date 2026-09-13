// work:insert-chore — place a new chore at a target position P in the TOP-LEVEL
// number space (ARCHITECTURE ADR-002/ADR-005, mirrored from insert-milestone.mjs /
// insert-uat.mjs). A THIN wrapper over insert-shared.mjs's runInsertTopLevel — the
// SAME engine insert-milestone/insert-uat/insert-story call — reusing the existing
// scaffold seam, never a bespoke writer (39/ADR-001, feasibility flag 4). A chore
// is a top-level DRIVER (milestone 37): it groups no stories and carries no
// depends-framing concept, exactly like insert-milestone.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 39 / story 03 (gap-to-chore, ADR-001, feasibility flag 4) —
//   work:insert-chore joins the SAME top-level pair above (a THIN wrapper over
//   insert-shared.mjs's runInsertTopLevel, reusing the mechanics, not a bespoke
//   writer). work:promote-gap is the promotion verb: given a declared gap
//   (title + discharge condition), it calls the SAME runInsertTopLevel engine to
//   scaffold a chore, then seeds its Definition of Done + back-reference — the
//   mechanical bridge from "a gap is a note" to "a gap is schedulable debt".
import { INSERT_FLAGS } from "./insert-shared.mjs";
// milestone 127 / ADR-003 §4 — THE IMPORT MOVED, AND THAT IS THE WHOLE DIFF HERE. This verb is now a
// thin alias of scaffold-into-backlog + `promote --at P`, and `runInsertTopLevel` moved WITH the
// mint to `promote.mjs` (the other import direction would be a cycle). Its signature, its envelope
// and every refusal code this face shipped are unchanged; `INSERT_FLAGS` still comes from the
// mechanics module.
import { runInsertTopLevel } from "./promote.mjs";

export const insertChoreCommand = {
  id: "work:insert-chore",
  input: {
    type: "object",
    properties: {
      slug: { type: "string" },
      at: { type: ["number", "string"] },
      yes: { type: "boolean" },
      today: { type: "string" },
    },
    required: ["slug", "at"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    return await runInsertTopLevel(ctx, {
      type: "chore",
      slug: input.slug,
      at: input.at,
      yes: Boolean(input.yes),
      today: input.today,
    });
  },

  cli: {
    // m42 wave (d) leg d1 (wave 2) — routed through the registry-derived table +
    // the ONE generic face; the cli.mjs workInsertCli branch is deleted.
    route: ["work", "insert-chore"],
    spec: {
      usage: "aof work insert-chore <slug> --at <P> [--yes] [--json]",
      flags: INSERT_FLAGS,
    },
    // `aof work insert-chore <slug> --at <P> [--yes|--force] [--json]`.
    argv: (positionals, options) => ({
      slug: positionals[0],
      at: options.at,
      yes: Boolean(options.yes || options.force),
    }),

    render(result) {
      return `Inserted chore "${result.created.slug}" at ${result.created.ref} (shifted ${result.shifted} item(s)).`;
    },

    // The --json envelope: ADR-004's { shifted, at, space } plus ADR-006's
    // created identity echo. insert-chore reports no depends (created carries no
    // `depends` key at all — same framing parity as insert-milestone).
    json: (result) => result,
  },
};
