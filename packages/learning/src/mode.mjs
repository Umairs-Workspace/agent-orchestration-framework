// 179/ADR-002, ADR-004 §3 — teaching's operator-led mode, as the continue door takes one. The door
// derives the `--teach` flag, its usage token and its two refusals from this descriptor, and a local
// answer names `/aof:teach <ref>`. Core hands it to `createPhaseDoorCommands`; `@aof/work` never
// names it.
export const teachMode = Object.freeze({
  flag: "teach",
  command: "teach",
  description: "the operator is taught: start one story or task here and answer `/aof:teach <ref>`, never a build",
});
