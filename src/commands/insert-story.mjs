// work:insert-story — place a new story at a target LOCAL position SS under a
// milestone NN, on the NESTED axis (ARCHITECTURE ADR-002/ADR-005/ADR-006). A
// thin wrapper over insert-shared.mjs's runInsertStory, mirroring
// insert-milestone.mjs / insert-uat.mjs's thin-over-engine shape. `--under NN`
// maps onto the engine's REQUIRED `parent` selector (ADR-006). Independent of
// story 02's top-level pair — disjoint number space, own scaffold, own
// best-effort `## Stories` checklist update (ADR-003 Tier 2).
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 41 / story 03 (insert-story, ADR-002/004/005/006) — work:insert-
//   story, the NESTED-axis sibling: places a new story at local position SS
//   under a milestone NN, reusing the SAME insert-shared.mjs mechanics
//   (count-gate, template-scaffold-strip) via `runInsertStory`. Independent of
//   story 02's top-level pair above — disjoint number space, own command file.
import { INSERT_FLAGS, runInsertStory } from "./insert-shared.mjs";

export const insertStoryCommand = {
  id: "work:insert-story",
  input: {
    type: "object",
    properties: {
      slug: { type: "string" },
      at: { type: ["number", "string"] },
      under: { type: ["number", "string"] },
      yes: { type: "boolean" },
      today: { type: "string" },
    },
    required: ["slug", "at", "under"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    return await runInsertStory(ctx, {
      slug: input.slug,
      at: input.at,
      under: input.under,
      yes: Boolean(input.yes),
      today: input.today,
    });
  },

  cli: {
    // m42 wave (d) leg d1 (wave 2) — routed through the registry-derived table +
    // the ONE generic face; the cli.mjs workInsertCli branch is deleted.
    route: ["work", "insert-story"],
    spec: {
      usage: "aof work insert-story <slug> --at <P> --under <M> [--yes] [--json]",
      flags: {
        ...INSERT_FLAGS,
        under: { type: "string", description: "the parent milestone number (required)" },
      },
    },
    // `aof work insert-story <slug> --at <SS> --under <NN> [--yes|--force] [--json]`.
    argv: (positionals, options) => ({
      slug: positionals[0],
      at: options.at,
      under: options.under,
      yes: Boolean(options.yes || options.force),
    }),

    render(result) {
      const note = result.checklist?.skipped ? " (## Stories checklist update skipped)" : "";
      return `Inserted story "${result.created.slug}" at ${result.created.ref} (shifted ${result.shifted} sibling story/stories)${note}.`;
    },

    // The --json envelope: ADR-004's { shifted, at, space } plus ADR-006's
    // created identity echo (parent = the milestone number, never null — a
    // nested insert always names a milestone), plus the ADR-003 Tier 2
    // best-effort checklist result (never gates success/failure).
    json: (result) => result,
  },
};
