---
doc: verification
---
# 174 · A built graph is shared through the project's own remote — verification

## Verification evidence

Verified 2026-10-27 on the Mac (`umamis-mac-mini`), against the working tree on
`milestone/172-excalidraw-phase-3`, where 174's change set is uncommitted (F-02). `aof` is npm-linked
to this checkout (`0.1.0 (source f275c4d+dirty)`), so every CLI run below executed 174's code.

### 174 — the story's own scenarios and both declared controls

- **`node scripts/test-shard.mjs test/graph/graph-share.test.mjs` + the two FF files**, run with an isolated
  `AOF_GLOBAL_HOME`: 33/33 scenario cases green (143 s), FF-17401 4/4 and FF-17402 3/3. Run twice: once
  before and once after `1bbdfdc` (172/02) landed mid-verify, green both times.
  `verifies → tasks/00_build-takes-the-graph-published-for-its-commit.feature`,
  `tasks/01_only-a-clean-default-branch-graph-is-published-once.feature`,
  `tasks/02_sharing-is-opt-in-and-runs-by-hand.feature`,
  `tasks/03_only-the-newest-twenty-graphs-are-kept.feature` (every `@executable` scenario)

### 174 — the neighbour suites in its write set

The modified suites (`graph-bundle`, `acd-graph-command-cli-bijection`, both `acd-codebase-grounding-*`,
`application-assembly`, `acd-cli-entry-executes`, `yarn-installation`, `acd-source-directory-budget`) plus
`packages/core/test/application.test.mjs` under `node --test` (2/2). Final run, after `1bbdfdc`: 123 cases,
3 red. None of the three is 174's, and each was attributed by measurement (F-01):

- `application/registration preserves every descriptor`: the drift is `diagram:scene`'s `session` action,
  committed at HEAD by 172/00. 174's fixture hunk adds only `graph:fetch`, `graph:publish` and `graph:prune`.
- `FF-16004 … module count`: `aof work find 160` evaluates 739 modules. That is 730, plus exactly 174's
  seven (`graph-share.mjs`, three command modules, three bindings; it declared 737), plus 172/00's two
  (`execution/src/conversation-session.mjs`, `diagrams/src/review-session.mjs`), from the hook's module list.
- `yarn-installation/extracted kernels …`: the one violation is `execution/src/conversation-session.mjs`
  importing `node:child_process` (172/00). The knowledge kernel, 174's four new allowlist rows included, is clean.

The first run's other nine reds are resolved. Six `acd-source-directory-budget` reds were
`diagrams-ui/src` at 20/18 from 172/02's uncommitted files, and `1bbdfdc` cleared them. Three
`yarn-installation` path reds are macOS-only (`os.tmpdir()` is `/var/…`, its realpath `/private/var/…`):
they pass with `TMPDIR` set to its realpath.

### @manual — a real GitHub remote carries a graph from one clone to another

Procedure: a detached worktree at `origin/main` (`d78cca7`), clean. `aof graph build . --json` (graphify
0.9.5 from the managed store, AST only, egress `none`): 150 s, 20,696 nodes. `aof graph publish --json`
there, then a plain `git clone` of the GitHub remote, checked out at `d78cca7`, and `aof graph fetch
--force --json` in it.

One deviation from the scenario's wording. Setting `graph.share` in an `origin/main` checkout dirties
`.aof/aof.config.json`, which publish refuses by design. So the two verbs ran with sharing unset, which
`tasks/02` "the explicit verbs work while sharing is off" sanctions.

Result:

| step | timing | observed |
|---|---|---|
| publish | 5.66 s | `published`, ref `refs/aof/graph/v1/d78cca7…`, blob `339b3de`, a `blob` of 1,454,837 bytes |
| publish again | — | `already-published`, nothing pushed (R3, live) |
| `git ls-remote origin 'refs/aof/graph/*'` | — | lists `339b3de…  refs/aof/graph/v1/d78cca7…` |
| plain `git clone` | 10.2 s | 0 refs under `refs/aof/`, and blob `339b3de` absent from its object store |
| fetch in the fresh clone | 4.67 s | `commitState: at-head`, 585 cache entries kept, still 0 local refs under `refs/aof/` |
| compare | — | `graphify-out/graph.json` byte-identical, sha256 `b2a66fb8…e80a7` in both |

The ref is kept. `d78cca7` is the tip of `main`, so it is the newest of the 20 the scenario retains.
`verifies → tasks/00_build-takes-the-graph-published-for-its-commit.feature` (the `@manual` scenario)

### Beyond the contract — the build path and `graph.remote`, live

In the same fresh clone, `origin` was renamed `upstream`, `graph: { share: "git-refs", remote: "upstream" }`
was set, `graphify-out/` was removed, and `aof graph build . --json` was run. It fetched the published graph
**from `upstream`**: `share.fetched.remote: "upstream"`, blob `339b3de`. That answers the review's
unexampled `graph.remote` with a live run (it is still not locked by a scenario; see OUTCOME Gaps). The
fetched graph was then **not used** ("its inputs differ from this tree, so it was rebuilt", 148.8 s),
because the uncommitted config edit is itself a graphify input. The publish skip correctly named
`.aof/aof.config.json`. This is F-03.

### Doctor

`aof work doctor 174`: no `control-unresolved` at either severity. The `control-runner-unchecked` warn
is covered by inspection: both FF files are imported and spread in `test/arch/graph/index.mjs`.
`example-map-too-many-rules` (5 rules, limit 4) is advisory.

## Fitness functions

Opened at refine (2026-10-27) so both declared controls have a row; both landed at build
(2026-10-27), registered in `test/arch/graph/index.mjs`, and each was probed red against a planted
violation and restored.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-17401 | `test/arch/graph/acd-graph-share-code-graph-only.test.mjs` | green, 4/4 | `packages/knowledge/src/memory.mjs` given `import { graphRef } from "./graph-share.mjs"` and a `"refs/aof/graph/v1/probe"` literal: red 2/4 (the one-namer leg names `memory.mjs`; the importer leg names it as a memory importer); restored, green |
| FF-17402 | `test/arch/graph/acd-graph-share-never-forces.test.mjs` | green, 3/3 | the publish push in `graph-share.mjs` given `"--force"`: red 2/3 (the static force-literal leg, and the live leg, whose recorded push argv carried it); restored, green |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | Three neighbour controls are red in this tree, and none implicates 174. `application-assembly` (the `diagram:scene` `session` descriptor is absent from the inventory fixture), FF-16004 (739 modules against 174's ceiling of 737, the +2 being `conversation-session.mjs` and `review-session.mjs`) and the `execution` kernel check (`conversation-session.mjs` imports `node:child_process`) all trace to 172/00, committed in this checkout. The same cause as m123/F-123-D, a concurrent lane's reds in a shared checkout. Two consequences: 174's FF-16004 ceiling must become 739 on whichever lands second, and milestone 172's regression gate will refuse until these are repaired. | defect | medium | non-blocker for 174 → repair in 172 before its regression gate | 172 (milestone gate) | open |
| F-02 | 174's whole change set (12 modified, 9 new files, plus its work folder and spike 173's) is uncommitted, on branch `milestone/172-excalidraw-phase-3`. 172/02 committed `1bbdfdc` into the same checkout during this verify. So the accepted story exists only in the working tree, and committed as it stands it would ship inside 172's PR. Related to m129/F-12 (a checkout carrying another story's work), but not the same, because no file is shared with 172/02's hunks. | defect | medium | non-blocker → commit 174 on its own branch off `main` (or by deliberate choice onto 172's) | operator | open |
| F-03 | Turning sharing on by editing `.aof/aof.config.json`, which is what the README says to do, guarantees a miss until that edit is committed. The config file is a graphify input (170 occurrences in `graph.json`), so on any clone whose config differs from the published commit's, the build downloads the 1.45 MB bundle, discards it ("its inputs differ"), and runs the full build. Measured: 148.8 s after a 4.7 s fetch. The same applies on any node carrying a local config edit, like this checkout's uncommitted `memory.backend` change. Distinct from m166/F-01 (an import that rebuilt because of line endings, a cache-key cause): here the input really did change. | enhancement | low | non-blocker → backlog: the README should say to commit `graph.share`; consider not fetching when the tree is dirty in a graphify input | product-owner (backlog) | open |

## Accept decision

**ACCEPTED** — 2026-10-27. All 33 `@executable` cases are green, both declared controls are green
with recorded red probes, and the contracted `@manual` round trip through the real GitHub remote
produced a byte-identical graph in a plain fresh clone that holds no `refs/aof/` ref. No `@uat`
scenario exists, so there is no human sign-off. Doctor reports no `control-unresolved`. No blocker
finding is open. Carried forward: F-01 to 172's gate, F-02 to the operator (commit 174 before it can
be merged), and F-03 to the backlog.
