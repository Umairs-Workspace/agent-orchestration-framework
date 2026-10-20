# 166 · A built graph travels to another machine — Outcome

## Delivered

### Graph export to one portable file
`aof graph export <path>` writes the codebase graph, graphify's cache and the inputs stamp to one gzip bundle stamped with the source commit, build time, graphify version and project identity, and replaces an existing file only with `--force`.

### Graph import into a clone of the same project
`aof graph import <path>` lays a bundle out as the clone's `graphify-out/`, refuses a bundle from another project with no override, verifies every file before swapping it in whole, re-keys the carried cache to the clone's line endings, and reports the graph's age and how many commits it is behind HEAD.

### A build that runs graphify only when its inputs changed
A whole-root code-only `aof graph build .` stamps what it read (`graphify-out/aof-inputs.json`, line-ending-neutral) and runs no graphify while no input, git-visible path, graphify version or `graph.json` has changed, on the building clone and on any clone that imported the bundle.

- **graphify's `manifest.json` names every file it read** — the stamp covers inputs by those keys; a manifest with an absolute key is never stamped.
- **A CRLF and an LF checkout of one commit extract to the same graph** — measured equal on this repo's Windows and WSL clones (same nodes, edges and impact sets).

### A code-only build's own time budget
A whole-root code-only build defaults to a 10-minute graphify budget; every other graphify spawn keeps the 2-minute bound.

### A WSL deploy that runs
`scripts/deploy-wsl.sh` writes the distro's `bin/aof.mjs` as a forward to `packages/core/bin/aof.mjs` and completes, including the native reinstall.

## Gaps

### Partial-change builds
- **Status:** open
- **Discharge condition:** `aof graph build` passes graphify only the changed files (graphify's own incremental `_rebuild_code(changed_paths=…)`, measured 44 s for one file here), or graphify's `update` verb gains a changed-files mode.
A build after any input change still runs `graphify update` over the whole corpus (232–299 s on this repo), because graphify 0.8.44 caches no JS/TS.
