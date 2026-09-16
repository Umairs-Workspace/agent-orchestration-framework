---
doc: research
---
<!--
  Milestone RESEARCH.md — answers ONE question: what did we learn that constrains the choices?
  Owner: researcher. Conditional (only if there was a real unknown to resolve). Shared by the
  milestone's stories.
  Does NOT contain: the decision the findings led to (→ ARCHITECTURE.md). Report facts; the
  architect decides what to do about them.
-->
# 124 · The edges aof does not draw — a declared graph nobody checks, and three return paths that stop one node short — Research

## Method

`work.agents.delegation` is absent from `.aof/aof.config.json` (`grep -n "delegation" .aof/aof.config.json`
→ no match, exit 1) → **off**. Every fact below was gathered directly on this model; no `codex exec`
delegation was used.

The census (Measurement 1) is a THROWAWAY node script that imports the real `src/work.mjs` and
`src/story-contract.mjs` exports and reads `wiki/work/` — it was written to and run from the scratchpad
dir, never committed, and touches no aof global state (it calls no `loadWorkspace`, no CLI, no test
runner — only `listItems`/`recordDoc`/`parseFrontmatter`/`siblingDependencyNumber` and plain
`fs.readFile`), so `AOF_GLOBAL_HOME` was not required. Measurement 2 is read-only inspection of the
committed run-store JSON files already in `wiki/work/**/runs/**/*.json` (git-tracked, confirmed with
`git log`/`git check-ignore`) plus reading of `src/commands/loop.mjs`, `src/work/loop.mjs`,
`src/run-store.mjs`, `src/loop-progress.mjs`, `src/effects/run-transitions.mjs`. No git command wrote,
reset, or checked out anything.

## The two verdicts, first — these decide what gets built

**Measurement 1 — the phantom-edge census: the premise HOLDS, but narrowly and inside a large blind
spot.** The census names real phantom edges — 14 by exact-match, 10 that survive a more generous
directory-prefix reading — so the story should be **built, not dropped**. But **182 of 230 depends
edges in this stream (79%) cannot be evaluated at all**, and every one of those 182 is a *type*
exclusion, not a missing-declaration edge case: `reads:`/`files:` exist **only** on `STORY.md` (68 of
300 stories in the stream declare them at all — nothing else, not `SPEC.md`, not `SESSION.md`, not
`SPIKE.md`, not `CHORE.md`, ever carries them). Every edge whose dependent or dependency is a
milestone/uat/spike/chore is therefore unevaluable **by construction**, before any question of an
individual item's completeness — 124 of the 182. The census's real reach is `story → sibling-story`
edges only (105 of the 230 total edges), and even there 57 are unevaluable because the story predates
the `reads:`/`files:` convention (`src/story-contract.mjs` first committed 2026-08-28; the earliest
story to carry the fields, item 79, was created 2026-08-16 — the convention is roughly two weeks old
at measurement time and covers 68/300 = 23% of all stories in the stream). **The evaluable set is 48
edges** (34 grounded + 14 phantom); phantom rate *among the evaluable* is 14/48 = 29% (exact-match) or
10/44 = 23% (directory-aware).

**Measurement 2 — the SCOPE line: the premise's own factual claim is FALSE, and the result is
unmeasurable, not merely thin.** `changeBaseline`/`progressBaseCommit` are **not persisted anywhere**
— not in the run-store's JSON schema (`src/run-store.mjs`, grep for either name across the file: zero
hits), not in the progress ledger (`src/loop-progress.mjs:17-24`'s `SAMPLE_KEYS` has no `baseCommit`
key), not anywhere else `src/commands/loop.mjs` writes to disk (it writes to disk nowhere itself). They
are transient JS locals threaded between `drivePhase` calls **within one `aof work loop` process
invocation** and discarded at exit. Independently of that: **zero of the 90 run records actually on
disk in this repo's committed history carry a populated `brief.progress` or `brief.review`** — the
loop engine's own findings-driven correction-cycle machinery (`runBrief`, the gate ladder, the progress
decider) has **never completed a cycle in this codebase's real history**. `n=0` — there is nothing to
diff, and the SPEC's premise as literally stated ("the run store records `changeBaseline` and
`progressBaseCommit` per cycle") does not hold. Whether a SCOPE line is still worth building on
principle is an architect call this research cannot settle by measurement, but it cannot be grounded
the way the SPEC proposed, and the SPEC's own citation of the run store needs correcting regardless of
what the architect decides.

---

## Measurement 1 — the phantom-edge census

### The machinery reused, and its exact shapes

`src/ready-wave.mjs` exports one function, `partitionReadySetByDeclaredFiles(readySet, options)`
(`:45-80`) — a greedy stable partition of `nextWork`'s ready set into a parallel `wave` and a `heldSet`,
by write-set collision. It has no exported helper for resolving `reads:`/`files:` in isolation; the
resolution logic lives in a **private** helper, `declaredWriteSet(member, {projectRoot, readText})`
(`:12-40`), which:
- **only handles `member.type === "story"`** (`:13` — returns `null` for anything else, unconditionally
  — a milestone/uat/spike/chore member is *always* "unknown");
- reads `STORY.md` from `member.path` and parses `files:` via `storyContractList(text, "files")`
  (from `src/story-contract.mjs`);
- **the untouched-scaffold exception** (`:24-32`): an empty `files: []` is treated as "unknown" (not
  "writes nothing") **unless** the story also declares a non-empty `reads:` — the template ships both
  empty, so a never-refined story must not be read as "writes nothing" and parallelised against every
  sibling; a genuinely doc-only story (reads something, writes nothing) is the one case where empty
  `files:` is trusted as a real empty set;
- resolves every declared path via `resolveStoryContractPath` (`src/story-contract.mjs:96-114`), and if
  **any single entry** fails to resolve (absolute, backslash, `..`-escaping) the **whole set** returns
  `null` (conservative — an unknown entry poisons the whole write-set for collision purposes).

`src/story-contract.mjs` is where the actually-reusable building blocks live:
`storyContractList(text, key)` (`:71-94`, returns `{present, malformed, values}`, parses a frontmatter
key as either an inline `[a, b]` list or a YAML block list, comment-tolerant) and
`resolveStoryContractPath(entry, {storyDir, projectRoot})` (`:96-114`, handles `#anchor` stripping,
rejects absolute/backslash paths, resolves `./`/`../`-prefixed entries relative to the story's own dir
and everything else relative to `projectRoot`, rejects anything that escapes the project root, and
**returns no directory/file distinction** — `path.relative` strips any trailing slash before the string
ever reaches a Set).

**There is no exported "resolve `reads:`" helper anywhere in the codebase.** The census below applies
`storyContractList`/`resolveStoryContractPath` — the same two functions `declaredWriteSet` uses for
`files:` — to the `reads:` key as well, mirroring `declaredWriteSet`'s own scaffold rule for `files:`
only (there is no analogous rule for `reads:`; none was needed for ready-wave's write-collision use
case). This satisfies "reuse the machinery, don't reinvent it" honestly: it is not a call to an
existing exported function, because the milestone's own premise ("the same two sets answer a question
nobody asks") requires a use `ready-wave.mjs` was never built for.

### `depends:` resolution, per `src/work.mjs`

Two separate mechanisms, confirmed by reading `validateWork` (`:1043-1251`) and `nextWork`
(`:1347-…`):

1. **Driver-level** (`isDriver`, `:460-461` — milestone/uat/spike/chore, unexported): a driver's
   `depends:` numbers resolve against `dependTargetNumbers` — every driver **plus every parentless
   story** (`isDependTarget`, `:476`, exported; widened at milestone 78/79 per the comment at `:463-476`
   — a parentless story is a legal `depends` target though never itself a driver). Checked at
   `validateWork:1184-1195` (resolution) and `:1227-1229` (acyclicity, `findCycle(graph)`).
2. **Story-sibling-level** (`item.type === "story" && item.parent != null`): a child story's `depends:`
   resolves **only against its siblings under the same parent milestone** — never against a driver, and
   never against another milestone's stories — via `siblingDependencyNumber(dep, parentNumber)`
   (`:565-571`, accepts a bare `NN` or a full `MM/NN` ref whose `MM` must equal the story's own parent)
   and `siblingGate(depends, story, siblings, statusOf)` (`:578-591`). Checked at `validateWork:1197-1208`
   (resolution) and `:1231-1240` (per-milestone acyclicity).

**A parentless story's own `depends:` is never read by either mechanism** (`isDriver` excludes it, and
`item.parent != null` excludes it from the sibling branch too) — it can be a *target*, never a
*source*, of a `depends:` edge. Confirmed no such case exists in the stream (the one parentless story
with an inbound edge, item 79, is targeted by milestone 78: `78 → 79`, counted below).

### The run

Script: `phantom-edge-census.mjs` in the scratchpad dir, run with plain `node` (no aof CLI, no test
runner). For every item carrying a resolvable `depends:` edge, it resolves the edge exactly as
`validateWork` does (above), then classifies the pair using `contractSet(item, "reads"|"files")` (the
`declaredWriteSet`-style resolver described above, applied to both keys).

```
Total depends: declarations in wiki/work/: 230 resolved edges, 0 that name nothing at all
  (every depends: entry in this stream currently resolves to a real item — the phantom-edge
  question is orthogonal to resolution validity, which validateWork already guards)
```

**Breakdown by (dependent type → dependency type):**

| pair | count |
|---|---:|
| milestone → milestone | 107 |
| story → story (sibling) | 105 |
| uat → milestone | 11 |
| milestone → spike | 5 |
| milestone → story (parentless) | 1 |
| milestone → chore | 1 |
| **total** | **230** |

**Unevaluable — 182 of 230 (79%).** Split by the reason (dependent's `reads:` kind / dependency's
`files:` kind):

| reason | count |
|---|---:|
| dependent is not a story (no contract fields exist at all) × dependency is not a story | 124 |
| both are stories, but at least one has no `reads:`/`files:` present (absent or malformed) | 57 |
| dependent is not a story × dependency IS a story with a real `files:` set | 1 |
| **total unevaluable** | **182** |

The single row-3 case is `78(milestone) → 79(story)` — the exact edge cited in `work.mjs`'s own
comments (`:1080-1082`) as the reason `isDependTarget` was widened. `79_story_committed-loop-graph`
does declare `files:`, but milestone 78 (a `SPEC.md`) has no `reads:` field to intersect it against —
unevaluable from the dependent side alone.

**Grounded (reads: intersects files:) — 34, all `story → story`.** E.g. `119/03 → 119/00`,
`61/06 → 61/00..05`, `77/05 → 77/00..03`, `59/04 → 59/01`, `96/02 → 96/01` (full list in the script
output; omitted here for length — every one is a same-milestone sibling pair).

**Phantom candidates (both sets present, zero intersection) — 14, all `story → story`:**

| dependent → dependency | reads: (dependent) | files: (dependency) |
|---|---|---|
| `119/03 → 119/02` | `…architecture.md, src/cited-path-resolve.mjs, src/work-audit/census.mjs, src/work-test-select.mjs, src/commands/test.mjs, test/arch/acd-suite-registration-single-decider.test.mjs, test/arch/acd-source-directory-budget.test.mjs, scripts/test-unit.mjs, wiki/work/TECH_DEBT.md` | `src/command-core.mjs, src/commands/, src/cli.mjs, test/, test/arch/acd-mesh-ui-single-data-command.test.mjs, test/arch/acd-graph-no-face-spawn.test.mjs, test/arch/acd-console-log-confined.test.mjs, test/arch/acd-registry-cites-never-explains.test.mjs, scripts/test.mjs` |
| `119/04 → 119/01` | `…architecture.md, src/agent-session-driver.mjs, src/mesh-launcher.mjs, src/mesh-assignment.mjs, src/mesh-worktree.mjs, src/mesh-park-resume.mjs, src/mesh-clone-credential-provider.mjs, src/mesh-repo-marker.mjs, src/run-session-capture.mjs, src/run-store.mjs, src/global-node-registry.mjs, scripts/pin-checkout-id.mjs, test/arch/acd-assignment-repo-availability-loud.test.mjs, test/agent-session-driver-door.test.mjs, wiki/work/TECH_DEBT.md` | `src/, test/, scripts/, ui/src/, test/arch/acd-source-directory-budget.test.mjs, test/arch/acd-path-is-not-behaviour.test.mjs, scripts/test.mjs` |
| `119/04 → 119/02` | (same reads: as above) | `src/command-core.mjs, src/commands/, src/cli.mjs, test/, test/arch/acd-mesh-ui-single-data-command.test.mjs, test/arch/acd-graph-no-face-spawn.test.mjs, test/arch/acd-console-log-confined.test.mjs, test/arch/acd-registry-cites-never-explains.test.mjs, scripts/test.mjs` |
| `119/04 → 119/03` | (same reads: as above) | `test/, scripts/test.mjs, scripts/test-unit.mjs, test/arch/acd-loop-suite-registration.test.mjs, test/arch/acd-suite-registration-single-decider.test.mjs` |
| `58/02 → 58/01` | `…58/architecture.md, …58/research.md, …52/architecture.md, …57/architecture.md, src/work-loops-checks.mjs, src/work-loops.mjs, src/commands/loops-validate.mjs, src/bundle/commands/validate.md` | 27 entries: `src/bundle/loops/*.md` ×11, `.aof/loops/*.md` ×11, `src/bundle/bundle.json`, `src/bundle/manifest.json`, `.aof/aof.lock.json`, `test/arch/acd-day-one-supervision-complete.test.mjs`, `test/work-loops-home-and-delivery.test.mjs`, `scripts/test.mjs` |
| `58/03 → 58/01` | `…58/architecture.md, src/commands/loops-show.mjs, src/commands/loops-graph.mjs, src/work-loops.mjs, test/arch/acd-loop-render-deterministic.test.mjs` | (same 27-entry `files:` as row above) |
| `59/04 → 59/00` | `…59/architecture.md, …58/architecture.md, …15/architecture.md, src/commands/doctor.mjs, src/commands/loops-validate.mjs, src/command-core.mjs, …59/stories/01…/STORY.md, …59/stories/02…/STORY.md, …59/stories/03…/STORY.md, src/work-loops-checks.mjs, src/bundle/loops/build-to-green-watcher.md, src/bundle/loops/operator.md` | `src/work-loops.mjs, test/arch/acd-auditor-taxonomy-additive.test.mjs, test/arch/acd-anchor-freshness-declared.test.mjs, test/anchor-taxonomy.test.mjs, test/work-loops-record.test.mjs, scripts/test.mjs, src/commands/loops-graph.mjs, test/arch/acd-loop-vocabulary-closed.test.mjs, test/arch/acd-anchor-taxonomy-additive.test.mjs, test/arch/acd-watcher-taxonomy-additive.test.mjs, test/arch/acd-arbiter-taxonomy-additive.test.mjs, test/arch/acd-registry-framework-owned.test.mjs, test/arch/acd-anchor-grounding-seed.test.mjs, test/arch/acd-registry-fixture-closed.test.mjs, test/work-loops-value.test.mjs` |
| `59/04 → 59/02` | (same reads: as row above) | `src/work-audit/evidence.mjs, scripts/drive-control.mjs, test/support/evidence-control-fixture.mjs, test/arch/acd-evidence-oracle-is-a-message.test.mjs, test/arch/acd-controls-never-execute.test.mjs, test/evidence-re-run.test.mjs, scripts/test.mjs` |
| `61/04 → 61/01` | `…61/architecture.md, …57/architecture.md, src/run-store.mjs, src/loop-bounds.mjs, …61/stories/01…/STORY.md, …60_spike…/SPIKE.md` | `src/acceptance-horizon.mjs, src/work-acceptor/criterion.mjs, src/bundle/frozen-set.jsonc, .aof/frozen-set.jsonc, test/arch/acd-acceptance-horizon-single-predicate.test.mjs, test/arch/acd-criterion-frozen-in-epoch.test.mjs, test/frozen-set-compiled.test.mjs, test/framework-stops-shipping-guard.test.mjs, test/acceptor-criterion.test.mjs, scripts/test.mjs` |
| `61/05 → 61/04` | `…61/architecture.md, src/effects/item-transitions.mjs, src/effects/run-transitions.mjs, src/effects/journal.mjs, src/config-editor.mjs, src/aof-gitignore.mjs, …61/stories/04…/STORY.md, …60_spike…/SPIKE.md` | `src/work-acceptor/rule.mjs, src/work-acceptor/ledger.mjs, src/work-counters.mjs, test/arch/acd-acceptor-rule-is-one-object.test.mjs, test/arch/acd-trial-metric-declared.test.mjs, test/arch/acd-per-knob-sizing.test.mjs, test/arch/acd-acceptor-ledger-accrues-across-epochs.test.mjs, test/acceptor-rule.test.mjs, test/acceptor-ledger.test.mjs, test/work-counters.test.mjs, scripts/test.mjs` |
| `63/05 → 63/02` | `…63/architecture.md, src/work-trigger/declaration.mjs, src/work-trigger/level.mjs, src/work-trigger/sources.mjs, src/commands/loop.mjs, src/commands/tune.mjs, src/command-core.mjs, …62/architecture.md` | `src/frozen-set.mjs, src/agent-session-driver.mjs, .aof/frozen-set.jsonc, src/bundle/frozen-set.jsonc, src/bundle/manifest.json, test/frozen-set-compiled.test.mjs, test/arch/acd-frozen-set-compiled.test.mjs, test/unattended-launch-envelope.test.mjs, test/arch/acd-unattended-launch-is-declared.test.mjs, scripts/test.mjs` |
| `63/05 → 63/03` | (same reads: as row above) | `src/mesh-assignment-directive.mjs, src/mesh-assignment-reclaim.mjs, src/mesh-worker-execution.mjs, test/mesh-assignment-directive.test.mjs, test/mesh-assignment-loop-directive.test.mjs, test/arch/acd-assignment-resolves-to-a-loop-call.test.mjs, scripts/test.mjs` |
| `63/06 → 63/03` | `…63/architecture.md, src/agent-session-driver.mjs, src/work-loop.mjs, src/commands/drive.mjs, src/workspace.mjs` | (same `files:` as row above) |
| `96/03 → 96/01` | `…96/architecture.md, src/work-test-select.mjs, src/work-test-changed.mjs, src/work-toolchain.mjs, src/story-contract.mjs, src/graph-impact.mjs, src/commands/resolve.mjs` | `src/story-contract-derive.mjs, src/commands/validate.mjs, src/bundle/commands/refine.md, test/story-contract-derive.test.mjs, test/arch/acd-derivation-proposes-never-writes.test.mjs, test/arch/acd-codebase-grounding-no-parse.test.mjs, test/arch/acd-codebase-grounding-via-commands.test.mjs, scripts/test.mjs, src/bundle/manifest.json, .claude/commands/aof/refine.md, .codex/skills/aof-refine/SKILL.md, .opencode/commands/aof/refine.md` |

### A necessary caveat, checked, not assumed: directory-shaped `files:` entries

`resolveStoryContractPath` strips trailing slashes (`path.relative` never returns one), so a `files:`
entry authored as a **directory** (`src/commands/`, `test/`) resolves to the exact same string shape as
a file (`src/commands`, `test`) — the real machinery (`declaredWriteSet`'s `Set` membership,
`src/ready-wave.mjs:37`) does **exact-string** collision detection, never prefix/directory-aware
matching. Milestone 119's four stories are the one place in the stream that declare directory-shaped
`files:` (`wiki/work/119_milestone_the-tree-gets-an-interior/stories/02_story_commands-gets-an-interior/STORY.md:28-37`:
`files: [src/command-core.mjs, src/commands/, src/cli.mjs, test/, …]`), and a second pass
(`phantom-edge-census-2.mjs`) checking whether any dependency `files:` entry is a real on-disk directory
that prefixes a dependent `reads:` entry found **exactly the four 119-internal edges** benefit from this
(e.g. `119/03`'s `reads: [… src/commands/test.mjs …]` sits under `119/02`'s `files: [… src/commands/ …]`
— 3 prefix hits; `119/04 → 119/01` — 13 hits). **The other 10 phantom candidates have zero
directory-shaped `files:` entries at all** — every one of their dependency `files:` lists names files
only, so the directory-granularity gap cannot explain their non-intersection. **10 of 14 phantom
candidates survive the most generous plausible reading; the census's own literal machinery (matching
`ready-wave.mjs` exactly) reports 14.**

One phantom was spot-checked for face validity: `96/03 → 96/01` — `96/01`'s `files:` is verified
verbatim against `wiki/work/96_milestone_the-declaration-earns-its-keep/stories/01_story_the-sets-are-derived/STORY.md:17-29`;
`96/03` reads a genuinely disjoint set (it reads `src/story-contract.mjs`, which `96/01` itself only
*reads*, never writes) — exactly the "capability ordering, not data flow" shape the milestone's own
Scope section anticipates as a legitimate non-phantom use of `depends:`.

### Verdict

**The premise holds**: the census, run over this actual stream with the real resolution machinery,
names concrete edges with no data-flow relationship (10-14 of them, depending on how generously
directory declarations are read). **But its practical reach is much narrower than "the graph's `depends`
edges" suggests**: 79% of all edges in the stream are structurally outside its evaluable domain — 54%
of that (124/230, the whole driver-level layer) permanently so, by the contract fields' own scope
(story-only), and the rest (57/230) only until more of the stream's 300 stories adopt a two-week-old
convention. An advisory check built on this machinery will, on this stream *today*, stay silent about
roughly four edges in five.

---

## Measurement 2 — the SCOPE line

### Where the run store actually lives, and its real schema

`src/run-store.mjs:13-15` (comment, confirmed against real files with `find`): one JSON file per run,
co-located with the item —

```
wiki/work/NN_type_slug/runs/<run-id>.json
wiki/work/NN…/stories/SS_story_…/runs/<run-id>.json
wiki/work/NN…/runs/<node>/<run-id>.json           (node-partitioned, 26/ADR-001)
```

Not SQLite, not `.aof/` — plain git-tracked JSON beside the item (confirmed one is git-tracked and not
gitignored: `git log --oneline -1 -- wiki/work/102…/runs/…json` returns a real commit;
`git check-ignore -v` on the same path exits 1). A representative record
(`wiki/work/102_story_the-declaration-names-its-loop/runs/umamis-msi/20260905T120923366Z-0001.json`):

```json
{
  "runId": "…", "itemRef": "102", "state": "done", "attempt": 1, "outcome": "done",
  "sessionId": "…", "brief": {}, "createdAt": "…", "updatedAt": "…", "failureReason": null,
  "heartbeatAt": null, "retryOf": null, "reclaimedAt": null, "node": "umamis-msi",
  "resumeAfter": null, "spend": null
}
```

**`changeBaseline` and `progressBaseCommit` are not among the persisted top-level keys, and `grep -n
"changeBaseline\|progressBaseCommit" src/run-store.mjs` returns zero matches anywhere in that file.**
`brief` is where a run's loop-produced context would ride if anything did — `runBrief` (see below) is
the only producer, and its own field set has no `changeBaseline`/`progressBaseCommit` key either.

### `runBrief`, the correction cycle, and where the two values actually live

`runBrief(declaration, {…})` (`src/commands/loop.mjs:295-325`) builds the object that becomes a run's
persisted `.brief` (via `transitionRunStart`'s `edge.brief`, `src/effects/run-transitions.mjs:53,64-65`
→ `startRun`). Its **exact field set**: `{ loop, grade?, review?, progress? }` — `grade` present only
when a rubric graded this cycle (`writtenGrade`, `:276-279`); `review` present only when a blocker claim
was admitted or the gate raised one (`admittedBlockerClaim(s)`/`blockerClaim(s)`, `:305-311`); `progress`
present only when the no-progress decider ran (`resets`, `attemptRunId`, `summary`,
`continuation`, `:316-323`). **No `changeBaseline`/`progressBaseCommit` key, ever.**

The two values named in the SPEC are computed and consumed entirely **in-process**, never written to
disk:

- `readBuildBaseline(cwd)` (`:108-130`) snapshots the complete worktree into a git tree (via a temporary
  index, `git read-tree`/`add -A`/`write-tree` — never touching the real index) and returns
  `{tree, commit}` where `commit` is `HEAD` at snapshot time. This is `roundBaseline` at the call site
  (`:1494-1498`).
- `changeBaseline` (`:1499-1501`) is `roundBaseline.tree` (or the transported prior value on a
  progress-continuation cycle) — a git **tree** object id, not a commit.
- `progressBaseCommit` (`:1502`) is `roundBaseline.commit` — the `HEAD` commit at the round's start.
- `readChangeUnderReview(cwd, baseline)` (`:135-147`) is what actually **diffs** across a cycle —
  `git diff --no-ext-diff <priorTree> <currentTree> --`, run against a **fresh** `readBuildBaseline`
  snapshot of the post-build worktree — i.e. **tree-to-tree**, not `changeBaseline..progressBaseCommit`
  as the SPEC's phrasing implies (`progressBaseCommit` is never one side of any diff in the code; it
  only feeds `git rev-list --count <baseCommit>..HEAD` inside `sampleWorktreeProgress`,
  `src/loop-progress.mjs:82-84`, to count commits made, not to diff files).
- Both values are threaded forward only as call arguments/closure locals across the same
  `drivePhase`/`fixTransport` chain within one `aof work loop` process (`src/commands/loop.mjs:985-1015,
  528-538, 1729, 1748`) and **die with the process**. `changeBaseline` does ride the in-memory
  `fixTransport` bag (`LOOP_FIX_TRANSPORT_KEYS`, `:516-526` — 9 keys: `buildRun, resumeBuildRun,
  findings, changeUnderReview, changeBaseline, blocker, blockers, blockerCount, progressContinuation`;
  **no `scope` key today**) so the *next* cycle in the same run can reuse it — but that bag is never
  persisted either; it lives in the `pendingFixes` `Map` for the remainder of the one invocation.
- The literal maker-facing document is `composeFixInput(command, {findings, changeUnderReview})`
  (`src/commands/drive.mjs:87-93`): `<command>\n\n## REVIEW FINDINGS\n<findings>\n\n## CHANGE UNDER
  REVIEW\n<diff>`. **This is the precise seam where a `## SCOPE` section would be added** — a third
  block appended the same way `## CHANGE UNDER REVIEW` is today, sourced (per the milestone's own Scope
  line) from the failing item's own declared `files:` rather than from `changeBaseline`/
  `progressBaseCommit` at all.
- The persisted progress ledger (`src/loop-progress.mjs`, `item.dir/runs/[node/]<runId>.progress.ndjson`,
  `appendProgressSample`/`progressLedgerPath:95-108`) has a **closed, validated key set**
  (`SAMPLE_KEYS`, `:17-24`): `at, runId, filesTouched, linesChanged, commitsMade, failingScenarios` — no
  `baseCommit`/`changeBaseline` key; `readProgressSamples` (`:110-…`) throws on any record whose keys
  don't match this set exactly, so a smuggled extra key would be a hard fault, not a silent pass.

### The measurement: how many correction cycles actually exist

`find wiki/work -path "*/runs/*.json" | wc -l` → **90 run records**, all git-tracked. For each, read
`.brief.progress` and `.brief.review`:

```
runs with brief.progress populated: 0
runs with brief.review populated:   0
runs with any non-empty .brief key at all: 3 (all carry only a "initiator" key — an unrelated field,
  not loop/grade/review/progress)
runs with retryOf != null: 5 — all traced to the STRANDED-SESSION resume path
  (resumeRetries.set(...), src/commands/loop.mjs:1249/1256, fed by `resolve.stranded`/failed runs,
  mode: "retry" at :1521-1533) — a crash/interrupt resume, not a findings-driven re-drive
```

**`n = 0`.** The `aof work loop` engine's own gate-ladder/grade/review correction machinery
(`runBrief`'s `grade`/`review`/`progress` keys, the mechanism the SPEC's premise is about) has never
completed a cycle that left a trace in this repository's 90-record run history. There is nothing to
diff `changeBaseline..progressBaseCommit` (or tree-to-tree, the actual pair) across, because no cycle
that would have produced one is on record — and, independently, no such diff could be reconstructed
after the fact even if one had run, because neither value is ever written down.

### Verdict

The SPEC's own factual premise — *"the run store records `changeBaseline` and `progressBaseCommit` per
cycle"* — is **false as stated**: neither value is persisted anywhere the run store's schema, the
progress ledger's schema, or any other write site in `src/commands/loop.mjs`/`src/loop-progress.mjs`/
`src/effects/run-transitions.mjs` can be shown to carry. Correcting the premise (the values are
in-process only) does not rescue a measurement: this repo's actual run history contains **zero**
completed correction cycles to inspect at all, by the engine that would produce them. `n=0,
insufficient` is the honest finding for the measurable half of the story (bounding the correction to
what already happened); it says nothing about whether carrying and enforcing a SCOPE line is worth
doing prospectively, which is not a question measurement can answer.

---

## Also established (cheap, for the architect)

### `cap-exhausted`

Member of the **closed stop vocabulary** `LOOP_STOPS` (`src/work/loop.mjs:26-39` — 12 members:
`uat-gate, dependency-blocked, cap-exhausted, deadline-exhausted, progress-exhausted, no-progress,
grade-indeterminate, session-needs-input, run-not-retryable, retry-parked, unmapped-item-type,
operator-interrupt`). Raised from multiple sites, all via the shared `halt(stop, producer, detail)`
constructor (`src/work/loop.mjs:88-93`):

- `src/work/loop.mjs:506` — `halt("cap-exhausted", "review:rounds>=hard-cap", …)`, inside
  `decideReviewRound` (review-round hard cap).
- `src/work/loop.mjs:542` — the sibling review-round soft-cap variant.
- `src/work/loop.mjs:823,880,910,923` — `halt("cap-exhausted", "engine:cycle>=cap", …)`, `boundedDrive`'s
  engine-cycle cap (multiple guard sites inside `decideLoopPhase`, one per phase branch).
- `src/work/loop.mjs:837` — `{ stop: "cap-exhausted", producer: "run-store:attempts-exhausted" }`, the
  run-store attempt-exhaustion variant.
- `src/commands/loop.mjs:1454` — `haltDecision("cap-exhausted", act.ref, "loop-cycle-cap")`: a
  **second, outer** cap layer the shell keeps for itself (a local `cycles` `Map` keyed
  `${act.ref}\0${act.phase}`, `:1443-1446`) — when `cycle > resolved.cap` it halts and **returns
  immediately** (`:1454-1457`), terminating the range rather than re-entering anything.

**Correction to a first-pass reading of this file: `work:loop` DOES already know how to dispatch
`refine` — inside the very same pure-decision function most of the `cap-exhausted` halts above live in.**
`decideLoopPhase` (`src/work/loop.mjs:860-936`) is reached on **every** decision tick of the live shell —
`commands/loop.mjs:23` imports `decideLoop`, `nextDecision` (`commands/loop.mjs:857-870`) calls it at
`:860`, and `decideLoop` (`src/work/loop.mjs:1006-1008`) is a one-line alias for `decideLoopInvocation`
(`:981-1004`), which calls `decideLoopOutcome` (`:993`), which calls `decideLoopPhase` (`:969`) whenever
the session outcome is not itself a signal/needs-input/failed case. Inside it, **two branches already
dispatch phase `"refine"`**: a milestone with zero stories (`:892-894`: `const phase = (input.stories?.total
?? 0) === 0 ? "refine" : "verify"; return boundedDrive(ref, phase, …)`), and a story with no `.feature`
tasks yet (`:900-901`: `if (!facts.hasTasks) return boundedDrive(ref, "refine", input.cycle, input.cap)`).
`drive.mjs:39`'s `PHASES = ["refine", "continue", "verify"]` confirms `refine` is a fully-supported
driven phase end-to-end, not a stub. `GATE_ORDER` (`:74-80`) is a **different, narrower** declaration —
the cost-ladder used only inside a `continue` cycle's own gate block — and genuinely has no `refine`
row; it is not the seam that matters here.

**But the `cap-exhausted` halt that actually fires in this repository never routes through that
dispatch, for a traceable reason: it is never given a real cycle to exhaust.** `boundedDrive`'s own cap
guard (`:821-829`) only fires when `positiveInteger(currentCycle)` is true; `nextDecision`'s call to
`decideLoop` (`commands/loop.mjs:860-868`) passes `scope, level, cap, next`, `tasks`/`stories` facts, and
`extra` (`l3Gate` or `rows`) — **no `cycle` key, at any of its seven call sites** (`grep -n
"nextDecision(" src/commands/loop.mjs` → none of the `extra` objects carry one). So inside
`decideLoopPhase`, `input.cycle` is always `undefined`, `boundedDrive`'s internal cap check never trips,
and its refine-dispatch branches always return a live `drive`/`refine` act with no cap consulted at all.
**The cap that actually stops the shell is the wholly separate, OUTER counter at
`src/commands/loop.mjs:1443-1457`** — incremented once per executed drive regardless of phase, checked
*after* `act` has already been decided, with no visibility into `decideLoopPhase`'s own
refine-vs-continue-vs-verify branching. When it trips, it halts and returns — it does not re-ask
`decideLoop` for a fresh act with the same ref, so it never reaches the refine-dispatch branch sitting
one function away in the same module. The gap the milestone names is therefore precise: not "the shell
doesn't know how to reach refine" (it does, live, today) but "the outer cap that actually halts never
asks the engine again before terminating" — the fix belongs in `commands/loop.mjs`'s own halt branch
(`:1454-1457`), not a new dispatch mechanism.

### The learning edge — `refine.md` vs `shatter.md`

The exact recall block, `src/bundle/commands/refine.md:121-128`:

> **Recall prior lessons first (before authoring ADRs/stories).** Role-scoped, run unconditionally
> (memory may be off — see below): the **architect**, before writing an ADR, runs `aof work memory
> recall "<the decision in a few words>" --area architecture --block`; the **PO**, before the
> break-down, runs a recall keyed to the milestone's domain — `aof work memory recall "<milestone
> objective keywords>" --item <ref> --block`. Read the returned block and acknowledge any surfaced
> **near-miss** relevant to a decision — honoured, or consciously departed from, in `ARCHITECTURE.md`
> (or `STATE.md`). An **empty block means nothing to surface** (memory may be off) — proceed unchanged.

`grep -n "recall\|memory" src/bundle/commands/shatter.md` → **zero matches**. Confirmed by reading the
whole 110-line file: no memory hook anywhere.

**A straight port is wrong for two structural reasons, both readable in `shatter.md` itself:**

1. **No `--item <ref>` exists at the point recall would need to run.** `refine.md`'s PO recall runs
   against an **already-existing** milestone (`aof:refine <NN>` operates on a folder already on disk).
   `shatter.md` is the opposite direction — it **mints** new top-level drivers from a PRD
   (`shatter.md:6-13`: "the product-owner reads the PRD, identifies each chunk, and frames it") — no
   milestone/spike ref exists until step 3 (`shatter.md:57-66`) creates one. A ported `--item <ref>`
   call has nothing to point at during the one step (identifying drivers, `shatter.md:41-56`) where a
   recall would need to run to inform the framing. The natural key is the PRD's own objective/seam
   (`readSeam(prd)`, `shatter.md:41-44`), not an item ref — closer to the architect's `--area
   architecture` form than the PO's `--item` form.
2. **Only one role runs.** `refine.md`'s block is explicitly **two-role** (architect *and* PO, each with
   its own recall shape). `shatter.md:38` spawns **only** `aof-product-owner` — there is no architect in
   its process at all. Half of the ported block (the architect clause) would have no role to attach to;
   porting it verbatim would introduce a role shatter's own `<process>` never spawns.

Additionally, `shatter.md` operates on **multiple new drivers in one batch session** ("the single
session that sees every new driver at once," `shatter.md:11-13`) where `refine.md`'s recall is scoped
to **one** milestone — a faithful port would need to decide whether recall runs once per PRD (keyed to
the seam) or once per identified driver, a design choice `refine.md`'s shape does not have to make and
does not answer by example.
