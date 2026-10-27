# 174 · A built graph is shared through the project's own remote — example map
<!--
Measured in spike 173 (2026-10-27, against this repo's GitHub remote): a ref under refs/aof/
pointing straight at a blob is accepted, listed by ls-remote in ~0.45 s, fetched in ~1.2 s and never
downloaded by a plain clone; a miss probe (ls-remote exit 2) costs ~0.8 s; this repo's bundle is
1.3 MB. Git refuses to move a ref that points at a non-commit unless forced. A deleted ref's objects
stay fetchable by sha. Read from code: a bundle's stamp carries exportedAt and builtAt, so two nodes
that build the same commit never produce byte-identical bundles; graph:build also builds the memory
work graph (outRoot .aof/memory-graph), and its tree snapshot includes untracked, non-ignored files.
-->

## R1 · A clone with no current graph takes the one already published for its commit
- E1 · Sharing is on, the clone at commit `a816d6d` has no graph, and `origin` holds `refs/aof/graph/v1/a816d6d…`: `aof graph build .` fetches and imports it, runs no graphify, and reports the graph as fetched from `origin` [stated Q1]
- E2 · Sharing is on, and `origin` holds no graph for `a816d6d`: `aof graph build .` runs graphify exactly as before [proposed]
- E3 · The clone's own graph is already current for its tree: `aof graph build .` reports "Already current" and makes no network call [proposed]
- E4 · `origin` cannot be reached: the build runs graphify as before and warns that the remote was unreachable; it never fails because of the remote [proposed]
- E5 · The memory backend rebuilds its work graph (`.aof/memory-graph/`): no fetch and no publish happen, whatever `graph.share` says [proposed]

## R2 · Only a graph of a default-branch commit, built from a clean tree, is published
- E6 · Sharing is on, the tree is clean, and `a816d6d` is on `origin/main`: after the build, the graph is published to `refs/aof/graph/v1/a816d6d…` with no step by hand [stated Q1]
- E7 · An untracked, non-ignored `scratch.mjs` sits in the tree: nothing is published, and the reason names `scratch.mjs` [proposed]
- E8 · HEAD is `c0ffee1`, pushed only on the loop lane branch `aof/mesh/174-a`, not on `origin/main`: nothing is published, and the reason says the commit is not on the default branch [stated Q2]
- E9 · The graph on disk was built at `a816d6d` and HEAD has moved to `b669097`: nothing is published, and the reason names both commits [proposed]

## R3 · The first graph published for a commit stays; nothing overwrites it
- E10 · `origin` already holds a graph for `a816d6d` (another node built it first): publish reports it as already published and pushes nothing [proposed]
- E11 · Two nodes publish `a816d6d` at the same moment and git refuses the second push: the second node reports it as already published, not as an error [proposed]

## R4 · Sharing is opt-in, and each half can be run by hand
- E12 · A project with no `graph.share` setting: `aof graph build .` never contacts the remote, exactly as today [stated Q4]
- E13 · `aof init` on a new project writes no `graph.share` setting [stated Q4]
- E14 · `aof graph fetch` lays out the graph published for HEAD, with the same refusals as `aof graph import` (an existing graph is replaced only with `--force`) [proposed]
- E15 · `aof graph publish` publishes the current graph under the same rules as R2 and R3, and says why when it publishes nothing [proposed]

## R5 · Only the newest 20 default-branch commits keep a published graph
- E16 · `origin` holds graphs for 21 default-branch commits; a publish succeeds: the graph of the oldest is deleted, the newest 20 remain, and the publish lists what it pruned [stated Q3]
- E17 · `origin` holds a graph for `c0ffee1`, a commit not on the default branch: the next prune deletes it [stated Q3]
- E18 · `aof graph prune` run by hand applies the same rule and lists what it deleted; with nothing to delete it says so and pushes nothing [stated Q3]

## Questions
- Q1 · business · answered · With sharing on, does `aof graph build` publish automatically after a clean build, or only fetch automatically, leaving publishing to `aof graph publish`?
- Q2 · business · answered · Which commits may have their graph published: any commit already on the remote (feature branches and loop lanes included), or only commits on the default branch?
- Q3 · business · answered · How many of the newest commits' graphs does prune keep, and does prune run by hand only or after every publish?
- Q4 · business · answered · Do new projects (`aof init`) get sharing turned on, or does every project opt in itself?
- Q5 · technical · defaulted ARCHITECTURE.md#ADR-001 · Graphs are keyed by commit under a versioned namespace, `refs/aof/graph/v<bundle version>/<commit>`; the inputs stamp only confirms a fetched graph, because it cannot be computed before a build
- Q6 · technical · defaulted ARCHITECTURE.md#ADR-001 · The ref points straight at the bundle blob (no wrapping commit), and is pushed without `--force`
- Q7 · technical · defaulted ARCHITECTURE.md#ADR-001 · The remote is `origin` unless `graph.remote` names another, and the default branch is the remote's own HEAD; a node without push access fetches only
- Q8 · technical · defaulted ARCHITECTURE.md#ADR-002 · Only the code graph at the project root is shared; the memory index and the memory work graph never use the ref transport, and the transport touches no mesh stream
