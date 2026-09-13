// work:insert-milestone — place a new milestone at a target position P in the
// TOP-LEVEL number space (ARCHITECTURE ADR-002/ADR-005). A thin wrapper over
// insert-shared.mjs's runInsertTopLevel, mirroring commands/validate.mjs's
// thin-over-engine shape. Carries NO depends-framing concept (ADR-006 — framing
// parity with add-milestone, which authors no depends either).
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 41 / story 02 (insert-top-level, ADR-002/004/005/006) — work:insert-
//   milestone / work:insert-uat register into the SAME core. Each is a THIN wrapper
//   (src/commands/insert-shared.mjs) over story 01's re-index engine
//   (src/work/reindex.mjs): open the slot at the caller's target position P in the
//   TOP-LEVEL number space, count-gate the confirmation, then scaffold the new
//   item's skeleton from `.aof/templates/work/<type>/` — the SAME templates add-*
//   uses. Additive — the registry-derived acd-work-command-cli-bijection guard
//   covers the new verbs for free (08/ADR-004).
import { INSERT_FLAGS } from "./insert-shared.mjs";
// milestone 127 / ADR-003 §4 — THE IMPORT MOVED, AND THAT IS THE WHOLE DIFF HERE. This verb is now a
// thin alias of scaffold-into-backlog + `promote --at P`, and `runInsertTopLevel` moved WITH the
// mint to `promote.mjs` (the other import direction would be a cycle). Its signature, its envelope
// and every refusal code this face shipped are unchanged; `INSERT_FLAGS` still comes from the
// mechanics module.
import { runInsertTopLevel } from "./promote.mjs";

export const insertMilestoneCommand = {
  id: "work:insert-milestone",
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
      type: "milestone",
      slug: input.slug,
      at: input.at,
      yes: Boolean(input.yes),
      today: input.today,
    });
  },

  cli: {
    // m42 wave (d) leg d1 (wave 2) — routed through the registry-derived table +
    // the ONE generic face (whose --json error envelope carries the confirm
    // refusal's `shifted` count); the cli.mjs workInsertCli branch is deleted.
    route: ["work", "insert-milestone"],
    spec: {
      usage: "aof work insert-milestone <slug> --at <P> [--yes] [--json]",
      flags: INSERT_FLAGS,
    },

    // `aof work insert-milestone <slug> --at <P> [--yes|--force] [--json]`.
    argv: (positionals, options) => ({
      slug: positionals[0],
      at: options.at,
      yes: Boolean(options.yes || options.force),
    }),

    render(result) {
      return `Inserted milestone "${result.created.slug}" at ${result.created.ref} (shifted ${result.shifted} item(s)).`;
    },

    // The --json envelope: ADR-004's { shifted, at, space } plus ADR-006's
    // created identity echo. insert-milestone reports no depends (created carries
    // no `depends` key at all — feature 01's "reports no depends" assertion).
    json: (result) => result,
  },
};
