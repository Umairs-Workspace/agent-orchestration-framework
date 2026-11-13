# 192/00 · A command is composed from slots and fragments — Outcome

## Delivered

### Slot grammar and composition
A command, agent or skill source may carry `<!-- slot:<name> -->` marker lines. `packages/core/src/work/bundle-compose.mjs` is a pure module that fills each marker with the bodies of the practices that are on. With nothing on, it removes the marker, plus the blank line above a block slot, so no marker survives in any composed text.

### Practices and fragments declared in a bundle fragment
A bundle fragment can declare a `practices` list, naming each practice and the config keys that turn it on, and `fragment` members that each name their practice, target, slot and per-runtime bodies. Fragments render in declared contributor and member order, and a fragment may replace another from its own contributor.

### One resolver over the project's own config
`practiceStates` turns a practice on only when every key it names holds the boolean `true` in the config it is handed. `loadBundle({ config })` composes every text before returning. `aof work init` and `aof work update` read only the project's `.aof/aof.config.json`, once, and hand that same read to the synthesis. The machine-wide config never reaches a render.

### Contributions validated at load
A contribution that cannot land is refused at load, naming the member and its package. That covers an unknown practice, a target or slot that does not exist, a runtime body missing for a runtime whose text carries the slot, or a slot name repeated within one source.

### Author reference
`wiki/reference/practice-prose.md` explains how to mark a slot and write a fragment, and every specimen on it is one the loader accepts.

### Three controls
FF-19205 (a slot leaves nothing behind), FF-19206 (every fragment lands on every runtime) and FF-19207 (a render reads the project's config and nothing else) run in `test/arch/practices/`, and each has been seen red.

## Assumptions

- **Fixture-proved** — the mechanism was proved on fixture practices passed through `readFragment` and `bundleOverride`. At this story's close, no shipped source carried a slot; 192/02 is the first to cut shipped prose into slots.
