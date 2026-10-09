# 155 · One agent-mode setting governs every session — build plan

## Mechanism

Three seams, built in this order because each later one reads the first.

**1. The chain gets one code home.** A new contracts leaf, `agent-mode.mjs`, exported as
`@aof/contracts/agent-mode`, owns `AGENT_MODE_DEFAULT = "solo"`, `agentModeFromConfig(workspace)` (the
hand-run answer: `work.agents.mode` when it is a member of `LOOP_AGENT_MODES`, else the default)
and `sessionAgentMode(workspace, phase)` (the driven answer: the loop key, else
`agentModeFromConfig`, and `null` for a phase with no resolver). It imports the vocabulary and the
per-phase loop resolvers from `loop-bounds.mjs` and never re-spells them. In `loop-bounds.mjs`,
delete `LOOP_AGENT_MODE_DEFAULTS` and reduce `loopAgentModeFromConfig` to the loop key alone. The
per-key resolvers already answer `null` for unset, so the range probe, the tuner and the
single-home pin are untouched. Only comments that state 140's rule change.

**2. The drive composes from the chain.** `drive.mjs` swaps `loopAgentModeFromConfig` for
`sessionAgentMode` at its one call site. `PHASE_MODE_FLAGS` and `phaseCommand` stay as they are.
Rewrite the 140/01 comment block above `PHASE_MODE_FLAGS`; it must not spell `work.agents.mode`,
because the "bounds home and drive read no workspace twin" case still stands.

**3. The prose follows.** Every role-spawning prompt gets the same sentence: "An unset
`work.agents.mode` resolves to solo." Refine and continue also say what the loop composes, and
name `agent-mode.mjs` as the default's home. Keep each prompt's existing reason sentence for the
default only where it still argues for solo. Continue's "a spawned reviewer did not write the code"
argued for orchestrated: drop it, or turn it into the reason to reach for `--orchestrated`. In
assimilate-code and migrate, replace "any other value → orchestrated" with "`orchestrated` →
orchestrated; unset → solo". Then re-render with `aof work update`, regenerate the manifest, and
let the lock follow. Hand-edit no render.

**R3** is a two-line change in `config-inspect.mjs`: both inert checks compare
`agentModeFromConfig({ config })` to `"solo"` rather than `agents.mode`. The message names the
default when the key is unset.

## Re-pointing the pinned tests

140's cases in the loop-bounds, drive and autonomous-prompt suites, review's "resolves to
orchestrated" row in the story-context suite, and story 30's "no mode set → no notice" case are
rewritten and renamed to `155/0N`, following the 140-vs-129/07 precedent. Keep 129/07's set-key
rows, which still hold. The effort-map rows in the override suite whose mode is `undefined` and whose
map is non-empty gain the new `info` notice. Add it to their expected diagnostics.

## Verification

- Focused runs only: `node scripts/test.mjs --only <file>` for each changed test file, plus every
  importer of `loop-bounds.mjs` the graph lists (the loop, grade, arch/loop and work suites). Run
  each with `AOF_GLOBAL_HOME` set to a fresh temp dir. Read the exit code and both streams.
- End to end: in a scratch workspace with `work.agents.mode: "orchestrated"` and no loop key,
  `aof work drive continue <ref> --dry-run --json` answers `--orchestrated`. Remove the key and
  it answers `--solo`.
- `aof work update --dry-run --json` reports zero changes after the re-render.

## Out of scope

Verify's role spawning (Q1), the mesh directive, `aof work audit`, `decideExecutionMode`, and this
repo's own config pin.
