
# 207 · ACD's assets ship from their own package, and nothing aof generates changes — Outcome

## Delivered

### ACD is a methodology package, not core's base bundle
ACD's agents, commands, templates, fragments, references, Codex variants, loops, frozen set and triggers live in `@aof/acd` (`packages/acd/assets`) and reach core only through the one `METHODOLOGY` contribution in `packages/core/src/methodology.mjs`; core's own `assets/` holds just the runtime hooks, and FF-20701 fails when core names an ACD asset outside that registry.

### The rendered bundle is unchanged by the move
`aof work init`, `aof work update` and `apply` render the same tree as before, in dev and from a packaged binary, except that each shipped loop record's self-citation now reads `packages/acd/assets/...`; a release carries core's hooks as an `assets/` sidecar beside the binary, next to the unchanged `bundle/` sidecar.
