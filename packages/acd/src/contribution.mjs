// ACD's ONE contribution to core (chore 207), read by core's methodology registry
// (`packages/core/src/methodology.mjs`):
//
//   id       the methodology's name in the registry
//   assets   the package whose `assets/bundle.json` is the methodology's descriptor: every agent,
//            command, skill, template, fragment, reference, Codex variant, loop record, the frozen
//            set and the trigger declaration. Core's own `assets/bundle.json` declares only its
//            runtime plumbing — the session, heartbeat, ask and artifact-sync hooks
//   files    the methodology's files core reads by role rather than as bundle members, so no core
//            module spells an ACD asset's path (the methodology registry's fitness function)
//
// A data leaf: it imports nothing, so a CLI path that never renders the bundle pays for this
// module and nothing behind it.
export const contribution = Object.freeze({
  id: "acd",
  name: "@aof/acd",
  assets: Object.freeze({ package: "@aof/acd" }),
  files: Object.freeze({
    frozenSet: "frozen-set.jsonc",
    manifest: "manifest.json",
    digestTemplate: "templates/milestone/AOF.md",
  }),
});
