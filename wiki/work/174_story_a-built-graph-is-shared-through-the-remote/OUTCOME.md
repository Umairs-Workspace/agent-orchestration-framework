# 174 · A built graph is shared through the project's own remote — Outcome

## Delivered

### A commit's codebase graph on the project's own remote
A project's remote can hold one graph bundle per commit, as a blob behind `refs/aof/graph/v1/<full commit sha>`. A plain `git clone` never downloads it.
- **The remote accepts a ref that points at a blob outside `refs/heads/`** — measured on GitHub at spike 173 and again at verify (1.45 MB bundle, `d78cca7`).

### `aof graph build` takes the published graph on a miss
With `graph.share: "git-refs"`, a whole-root code build with no current local graph first fetches the graph published for HEAD from `graph.remote` (default `origin`). It keeps that graph, with no graphify run, only when its inputs match the tree. Otherwise it rebuilds as before, and an unusable remote is a warning, never a failed build.
- **The clone's config at HEAD matches the published commit's** — `.aof/aof.config.json` is a graphify input, so a local, uncommitted edit (including the one that turns sharing on) makes every fetched graph a miss.

### Clean default-branch builds are published once, and the remote keeps the newest 20
After a build, the graph is published only when it was built at HEAD from a clean tree and HEAD is on the remote default branch's tip, which must be present locally. Any other build names its reason and pushes nothing. The first publish of a commit wins, nothing is force-pushed, and every successful publish prunes refs to the newest 20 first-parent default-branch commits.
- **The node has push access** — a node without it fetches only, and its publish is a warning.

### `aof graph fetch`, `aof graph publish` and `aof graph prune`
Each half runs by hand, whether or not sharing is on. `fetch` lays out the published graph through `graph:import`'s own staged swap and refusals. `publish` and `prune` apply the build's rules and report what they did or why not. Unlike the build, each verb exits non-zero on a remote it cannot reach.

### Only the codebase graph rides the transport
`graph-share.mjs` is the one module that names `refs/aof/graph/`. No memory module reaches it, and it reaches no memory or mesh module, so the memory work graph and index are never fetched or published (FF-17401). No push to the namespace forces, and every remote call runs with `GIT_TERMINAL_PROMPT=0` (FF-17402).

## Gaps

### `graph.remote` naming a remote other than `origin`
- **Status:** open
- **Discharge condition:** an `@executable` scenario under R4 builds or fetches through a remote not named `origin`.
The setting is honoured: verify fetched through a remote renamed `upstream`. But no scenario locks it, so a regression to a hard-coded `origin` would pass the suite.

### A shared graph after sharing is switched on locally
- **Status:** open
- **Discharge condition:** the README tells the operator to commit `graph.share`, or the build skips the fetch when a graphify input is uncommitted (174/F-03).
Until the setting is committed, every build on that clone downloads the bundle, discards it and runs the full build.
