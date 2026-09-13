# 01 · The selection — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### A changed file reaches the suite files that can break it, through the graph the repo already builds
`selectSuites` (`src/work-test-select.mjs`) answers a changed set with the suite files coupled to it, taken from `graphify-out/graph.json` through the shipped `normalizeGraph` and `computeImpact`. It reads the artifact and never builds one: no graphify invocation, no second artifact read, no second parse and no child process exists anywhere in the module or in `src/graph-impact.mjs`.

### An unknown widens the selection to the whole suite and says which unknown did it
A changed file the graph cannot account for produces `scope: "all"`, the whole suite selected, and an entry in `widened[]` naming that file and one of exactly four reasons — `no-graph`, `not-in-graph`, `no-registered-dependent`, `graph-unreadable`. The vocabulary is frozen at four in the module itself, and the rule is checkable from both sides: `wideningRuleProblems` refuses a widened result that selected a proper subset and refuses a non-widened result carrying a changed file that never resolved.

### Presence outranks the union, so a test file created this turn widens rather than selecting itself
A changed file absent from the graph widens even when its own path satisfies the suite predicate. The union of the changed file with its dependents is taken first and the path predicate last, so a changed file that IS a registered suite is in its own selection — but only after presence has been established.

### No option suppresses a widening
`selectSuites` accepts `projectRoot`, `changed`, `allSuites` and `roots` and nothing else. No key that suppresses, narrows or overrides a widening is accepted, no `--no-widen` / `--strict-scope` / `--narrow` / `--assume-fresh` / `--skip-widening` is spelled anywhere in the story's modules, and an unknown suppressing key passed anyway leaves the widening standing and named.

### Every result carries the artifact's own instant, or exactly `null`
`builtAt` is `graphArtifactBuiltAt`'s reading of the artifact's file mtime on every path where the artifact was read — including the two widening paths that read one. On `no-graph` there is no file, and on `graph-unreadable` the file's perfectly good mtime is discarded; both report exactly `null`, with the reason carried in `widened[]`. No module in this family reads a clock.

### Selection is pure across calls
The same changed set against two different artifacts answers twice, differently, in one process, in either order. Nothing is cached — not the normalised graph, not the impact walk, not the answer.

### A selection is a report and decides no transition
Every result carries `gate: false` unless the whole suite was selected AND nothing widened. Nothing in the tree consumes it, so `09/ADR-004` is not crossed by this story.

### A selected suite the runner does not assemble is reported, in the census's own words
`registrationReport` imports `registrationDecision` from `src/work-audit/census.mjs` and carries its verdict verbatim — the same `code` and the same `message`, the census's `audit-suite-unregistered` / `audit-suite-imported-never-spread` / `audit-runtime-membership-unavailable` vocabulary and its baseline's carried reasons. No second derivation exists in this story: no pattern over a suite import line, no spread-row matcher, no second unregistered baseline, no second read of the assembled array.

### The changed set is read from git through the one bounded seam, and three ways of having nothing to select are three answers
`src/work-test-changed.mjs` runs `status --porcelain`, `diff --name-only` and `rev-parse --verify` through `runBounded` with a 60,000 ms bound, keeping untracked files and both ends of a rename. The default base is the working tree; no default branch is inferred, and no branch name — `main`, `master`, `origin/HEAD`, `@{upstream}`, `symbolic-ref`, `merge-base` — is spelled anywhere in it. `since-rev-unresolvable`, `changed-set-empty` and `changed-set-unreadable` are three distinct refusals, none of them a fifth widening reason.

### `computeImpact` has a home below the command layer, and its face is byte-equivalent
`src/graph-impact.mjs` holds the pure coupling core; `src/commands/graph-impact.mjs` re-exports it, so both of its previous importers are unchanged and `graph:impact` behaves exactly as it did. `matchFile`, declared in the command and never used, did not come with it. Both frozen graph-reader allowlists now name `src/work-test-select.mjs` — and not `src/graph-impact.mjs`, which takes an already-normalised graph and names no reader symbol.

## Assumptions

- **The artifact carries no build-time field** — `builtAt` is the file's mtime because `graph.json`'s top-level keys are `directed`, `multigraph`, `graph`, `nodes`, `links`, `hyperedges` and `built_at_commit`, and the last is a commit SHA rather than an instant.
- **`roots` and `allSuites` are supplied by the caller** — the module reads no configuration at all, because FF-7201 makes `src/work-toolchain.mjs` the only reader of `work.test.*` and a selector reaching for the config would red 72/00's control from a parallel lane.
- **`assembled` and `suiteNames` are injected and this module produces neither** — their only shipped producer imports every suite file in the runner's own process, which ADR-001 §4 forbids here. `registrationReport` therefore answers only as well as the provenance it is handed.
- **`runBounded` stays the one seam** — the changed-set reader imports the process module nowhere, names no second spawn API and passes no `shell:` option, so its boundedness is the seam's and not its own.
- **The O(paths × (nodes + edges)) cost is accepted, not missed** — ~80 ms for one changed file and ~400 ms for fifty on the live 17 MB artifact. Hoisting the edge walk or caching the normalised graph is the obvious fix and is what the purity clause forbids.

## Gaps

### Nothing calls the selection
- **Status:** discharged
- **Discharge condition:** 72/02 lands `src/commands/test.mjs`, the registered `test` command that composes 72/00's declared toolchain with this module.
`selectSuites`, `registrationReport` and the changed-set reader are a pure library with no command, no CLI surface and no caller in `src/`. The behaviour ships; nobody can invoke it yet. Discharged 2026-09-03 at the milestone gate: `src/commands/test.mjs` (72/02, `aof test`) composes `selectSuites` and the changed-set reader, and is registered under the id `test`.

### The registration report has no provenance producer
- **Status:** open
- **Discharge condition:** 72/02 supplies `assembled`, `suiteNames` and `importedBy` from the runner's own process, which is where an `await import()` of the suite files is legal.
`registrationReport` decides correctly over what it is given and can produce none of its three inputs. Handed empty ones it reports every selected suite as unregistered, which is a truthful answer to a question nobody has yet asked properly.

### FF-7201's declared module set does not reach `src/work-test-changed.mjs`
- **Status:** discharged
- **Discharge condition:** `MILESTONE_MODULES` (`test/arch/acd-declared-program-single-speller.test.mjs:64-68`) is re-derived over every module 72 adds — possible only at the milestone gate, since ADR-008 §2 makes 72/00 the sole writer of that file and `src/commands/test.mjs` does not exist until 72/02.
The module 72/01 added that actually starts a child is censused for the one-seam and no-shell clauses by FF-7202's self-check, and for the frozen-program-name clause by nothing. No violation exists today — it spells `git`, which the five frozen names deliberately exclude. Recorded as `m72/F-72-AK`. Discharged 2026-09-03 at the milestone gate: `MILESTONE_MODULES` re-derived to four members and FF-7201 re-run 9/9 (`m72/F-72-AK`, closed).
