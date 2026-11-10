# 02 · The map is a document — Outcome

## Delivered

### The example map's closed grammar
A story's `EXAMPLES.md` is parsed by one pure module, `packages/work/src/examples/map.mjs`, into rules, examples with one provenance each (`proposed`, `confirmed`, `stated Q<n>`), and questions with a class and a state. Any line outside the grammar is a coded `malformed` entry, never a silent skip.

### One home for the map's queries and its token
Open business questions, unanchored claims and the `<ref> Q<n>` / `<ref> E<n>` token are read through that module alone (FF-13402).

### The `work.examples.enabled` gate
Discovery is off unless a project sets the boolean `true`. Absent, `false` or any other value is off, and an unknown `work.examples` key is `examples-gate-unknown-key`.
