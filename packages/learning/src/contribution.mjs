// Teaching's ONE contribution to core (179/ADR-004 §4), read by core's practices registry
// (`packages/core/src/practices.mjs`):
//
//   id       the practice's name; no `work.integrations` switch gates it — teaching is opted into
//            per invocation, by typing `aof:teach <ref>`, never per project
//   assets   the package whose `assets/bundle.json` fragment core appends to its own descriptor:
//            `/aof:teach` alone, for Claude Code only (179/ADR-007)
//
// A data leaf: it imports nothing, so a CLI path that never renders the bundle pays for this
// module and nothing behind it.
export const contribution = Object.freeze({
  id: "learning",
  name: "@aof/learning",
  assets: Object.freeze({ package: "@aof/learning" }),
});
