# Build brief

## Mechanism

Lift `graphBuildCommand.run`'s body out of `createGraphBuildCommand`, everything except share, into
`createGraphifyCodeBackend({ resolveGraphifyBinary, runGraphifyBuild, readGraph, normalizeGraph,
graphJsonPath, graphArtifactBuiltAt, isCodeOnlyWholeRootBuild, ensureGraphifyOutGitignore })` as
`ingest("code", input)`. Add one call, `ensureGraphifyOutGitignore(outRoot)`, after a build that
persisted, which closes 149's gap. `graph:build.run` then does three things: takes a published graph
when share says so, calls `engine.ingest("code", input)`, and publishes.

`relations(paths)` uses one availability function, which `status("code")` shares:
- `existsSync(artifact)` false → `no-graph`;
- `readGraph` or `normalizeGraph` throws → `graph-unreadable`, with the error's `code` or message as
  `cause`;
- otherwise `computeImpact(graph, paths)`, with `builtAt` from `graphArtifactBuiltAt`.

`graph:impact.run` keeps its order: the `no-graph` 424 before `no-paths`. So check `status("code")`
for the artifact first, or keep `existsSync` in the face only for the message order. Either way the
code comes from the port's answer.

`computeImpact` goes one-pass. Build a map from each requested path to the node ids it resolves to,
using the same three-way match. Walk the edges once, adding to every requested file whose id set
holds the source or target. Sort at the end. The outputs must be byte-identical, and
`graph-impact.suite.mjs` holds the existing cases. Add a case that asks fifty paths and asserts one
walk, with an edge-iteration counter on a proxy graph.

Watch for:
- `acd-graphify-backend-classified` asserts the claude-cli egress "live against graph-build.mjs".
  Repoint it at the module that now classifies, and keep the assertion.
- `acd-codebase-grounding-no-parse` and `-via-commands` name `graph-build`/`graph-impact` by path.
  Re-read each before editing it. They guard the agents' grounding, not the file layout.
- Never run the whole suite on this machine. The graph suites spawn the CLI. Run the declared ones.

## Verification

Under an isolated `AOF_GLOBAL_HOME`, on a temp git repo with no `.gitignore` for `graphify-out`:
1. Run `aof graph build . --json`, then `git status --porcelain`. It must not list `graphify-out/`.
2. Diff the `--json` of `aof graph impact <three files>` before and after the change, over the same
   artifact. It must be identical.
3. With `PATH` stripped of graphify, run `graph build --json`. It must answer `graphify-missing`.
4. Delete the artifact and run `graph impact x --json`. It must answer `no-graph`.

Record FF-17903's red probe: import `computeImpact` into `commands/graph-impact.mjs` and quote the
message.

## Out of scope

The three core readers (04). The record corpora (03). Query, triage, serve and the share verbs.
