---
type: story
number: 07
slug: registry-home-and-delivery
title: "The registry gets a home that ships — `.aof/loops/`, delivered by the bundle"
parent: 53
status: done
owner: product-owner
created: 2026-08-15
updated: 2026-08-17
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH.
-->
# 07 · The registry gets a home that ships

## User story

As an operator who has installed aof in my own project,
I want aof's loop registry to live in `.aof/loops/` and arrive with the bundle,
so that the loops aof is actually running in my repo are declared in my repo — instead of `aof work
loops` reporting an empty registry while the nine records describing those very loops exist only in
aof's own checkout.

## Tasks

<!-- Authored by `aof:refine 53/07` (Three Amigos, 2026-08-15). Decisions frozen in ADR-012/ADR-013. -->

- [x] [00 — the home moves to `.aof/loops/`: one resolution, from `aofDir`, and no second door](tasks/00_the-home.feature)
- [x] [01 — the nine records ship as bundle ASSET members: verbatim, unstamped, both runtimes](tasks/01_delivered-as-assets.feature)
- [x] [02 — install, refresh, drift: what `work init`/`work update` do with a delivered record](tasks/02_install-refresh-drift.feature)
- [x] [03 — `src/bundle/loops/` is the single source; this repo's `.aof/loops/` is an installed artifact aof dogfoods](tasks/03_single-source-and-dogfood.feature)
- [x] [04 — a delivered record is immutable framework self-description; the split is deferred with a named trigger](tasks/04_framework-owned.feature)
- [x] [05 — FF-5312 / FF-5313, their registration out of the mined namespace, and the three bundle gates](tasks/05_the-gates.feature)
- [x] [06 — the deployed payload really installs the records, in a real foreign repo](tasks/06_the-payload-install.feature) *(`@manual`)*

## Notes

**Refinement ruling (2026-08-17, `aof:refine 53/07`, per ADR-015 §9):** tasks 01 and 05 froze bundle
census baselines that were already one behind the branch when this story began — the INSTRUMENT was
wrong about the TREE, not the contract about the delivery. An intervening shipped UAT state template
made the true pre-story baselines **62** bundle files and **87** manifest entries, so the contracted
nine records produce **71** and **96**. Measured at source this round: `src/bundle/**` carries 71
files, `bundle.json` 59 members (10 assets = the pre-existing one + nine records), `manifest.json` 96
entries, against 62 / 50 / 87 at the milestone base `9e0f910` — the contracted **+9** intact on every
axis. Both rows are amended to the measured truth (`05:116` and its Examples row, `01:40`); ADR-012's
delivery decision is unamended, no scenario is weakened, the nine-record payload is unchanged, and
deleting that unrelated shipped template to satisfy the older literal is **refused** as a story-boundary
violation.

A fourth pre-existing red task 05 was refined expecting to inherit is **withdrawn** in the same
ruling: `acd-bundle-manifest-hashes` case 1's stale task-example-template hash was cleared elsewhere
on this branch before the story's regeneration ran. Measured focused and isolated: the gate is **3
pass / 0 fail**, so the manifest diff this story owns is **nine ADDED entries, zero changed** — not
the ten changed entries the contract predicted. Task 05's narrative, that scenario and its gate row
now state nine; the three-in-one `bundle.test.mjs` descriptor/loader reds it really does inherit are
unchanged. No `src/` change and no test-code change: the implementation was already at the measured
truth. Tasks 01 and 05 stay unticked for `aof:continue 53/07` to close on a suite re-run.

### The defect

52 shipped nine loop records at `<work.dir>/loops/` — here `wiki/work/loops/` — resolved by
`loopsDirectory()` (`src/work-loops.mjs:490-494`). Three things are wrong with that home, and they
compound:

1. **Ownership.** `<work.dir>` is the *operator's* work stream: milestones, stories, chores, UAT
   sessions. The nine records describe **aof's own internals** — every one cites
   `src/bundle/commands/*.md` and `src/bundle/agents/*.md` — and those are identical in every repo
   that installs aof. Framework self-description is filed as project work.
2. **Delivery.** Nothing under `src/bundle/` matches `*loop*`, so `aof work init` / `work update`
   install **zero** loop records. A consumer repo gets `present: false` from `loadLoops`
   (`src/work-loops.mjs:503`) and an empty registry — while `build-to-green`, `verify-triage-accept`
   and the autonomous cascade are running in that repo the moment they use aof.
3. **Coherence.** `wiki/work/loops/autonomous-cascade.md` already declares
   `ceiling: [config:work.autonomous.maxAttempts]` — a `config:` pointer (`POINTER_SCHEMES`,
   `src/work-loops.mjs:83`) into `.aof/aof.config.json`. The referent lives in `.aof/`; the record
   that points at it does not.

A fourth symptom follows from (1): test suites load the **real** registry and pin its content — aof's
own suite depends on the contents of a directory that, by its declared location, belongs to the user.
~~Seven suites~~ — **corrected at refine: two.** Only `test/work-loops-registry-census.test.mjs`
(`workDir` built at `:56-60` from `import.meta.url`, loaded at `:184`, asserting the roster is the
named nine as an *equality* at `:514-518`) and `test/arch/acd-loop-records-parse.test.mjs` (`:29`,
`:80`, asserting the roster as a *floor* at `:36`). The other five named in the first draft reference
`wiki/work/...` only to read `.feature` files for traceability or `TECH_DEBT.md`, and
`work-loops-coverage-ledger.test.mjs` never calls `loadLoops` at all.

### Why `.aof/loops/`, and why 52/ADR-001 does not block it

The precedent is `.aof/templates/`: aof's own content, hash-stamped in `src/bundle/manifest.json`,
installed into `.aof/`, refreshed by `work update`, and **git-tracked** — `git ls-files .aof/` returns
`aof.config.json`, `aof.lock.json` and all of `templates/`. That is exactly the pipeline these records
need, and it already exists.

52/ADR-001 rejected `.aof/` citing `PRD-graph-engineering.md:185-186` — *"no sidecar config, no
service… if it cannot be reviewed in a PR it is not governed."* What it actually weighed and rejected
was **`.aof/loops.json`**, a machine-generated blob; it treated rejecting that *format* as rejecting
the *directory*. Only the runtime state under `.aof/` is gitignored (`.aof/.gitignore`: `/work/`, the
memory indexes, the sync queue). Markdown-with-frontmatter in `.aof/loops/` lands in a PR diff exactly
as it does today, so the PRD constraint is satisfied either way — it was never the discriminator.

**This story supersedes 52/ADR-001 decision 4** ("the directory is
`path.join(ctx.workspace.workDir, "loops")` … not configurable; one home, no second door"). The
supersession is recorded as an ADR in this milestone's `ARCHITECTURE.md`; ADR-001's decision 3 (one
directory, extended by `kind:`, never by a sibling) is *kept* and carries over to the new home.

### Scope (revised at refine — the first draft is corrected below)

- `loopsDirectory` resolves from the workspace's **`aofDir`**, not its `workDir`. This is smaller in
  code and larger in reach than the first draft said: `loopsDirectory` is **module-private**
  (`src/work-loops.mjs:491`, a bare `function`, one caller — `loadLoops` at `:498`), so there is no
  five-dependent fan-out; the change is `?.workDir` → `?.aofDir` at `:492` — a branch that is **dead
  code on HEAD**, since all three callers pass a string — plus three call sites passing the workspace
  object. `aofDir` already exists on the workspace (`src/work.mjs:174`, returned at `:249`).
- The **string overload survives** as a declared test affordance, which is the single choice that
  keeps the fixture suites and `test/support/loop-registry-fixture.mjs` byte-unchanged. No `src/`
  module may use it.
- The nine records relocate to **`src/bundle/loops/`** — the single source of truth.
  `wiki/work/loops/` ceases to exist. This repo's `.aof/loops/` becomes an **installed artifact**
  regenerated by `aof work update` (aof dogfoods its own delivery), pinned byte-equal to the bundle.
- ~~The seven real-registry suites repoint; the eight fixture arch tests are unaffected.~~
  **Corrected:** *two* suites repoint (above). The fixture arch tests are unaffected **because** the
  string overload was kept — without that choice, four of them plus the shared builder would churn.
  Two real edits remain: the hard assertion at `test/work-loops-record.test.mjs:364`, and the six
  synthetic `{workspace:{workDir}}` sites that hand a command a workspace (`work-loops-commands.test.mjs:199,1362`,
  `acd-loop-registry-not-an-item-type:87`, `acd-loop-render-deterministic:96`,
  `acd-loop-finding-envelope:271`), which must gain `aofDir`.
- The records enter `src/bundle/` + `manifest.json` as **`kind: "asset"` members with an explicit
  `target`** — *not* templates. The templates pipeline is the right precedent and the wrong
  mechanism: `templateOutputPath` (`src/work-bundle.mjs:194-196`) hard-codes
  `.aof/templates/work/<id>/` and cannot address `.aof/loops/`, and `TEMPLATE_STAMP` (`:28`, applied
  at `:207`) prepends a comment before the frontmatter, which makes `rawFrontmatter`
  (`src/work-loops.mjs:154-157`) return `null` — **all nine would install and all nine would fail to
  load.** The asset renderer preserves bytes by design (`:167-183`).
- Both runtimes are declared. An asset defaults to `["claude"]` and is skipped when the selected
  runtimes do not intersect (`:172-174`), so `["claude"]` alone would leave a codex install with no
  registry — this story's own defect, on the other runtime.
- The superseding ADR is recorded (**ADR-012**), with the split's deferral recorded as **ADR-013**.
- Two gates outside the loop family move in this diff: the `62` → `71` file-count literal at
  `test/bundle-asset-manifest-complete.test.mjs:51`, and the **pre-existing** `test/bundle.test.mjs`
  loader mismatch (measured RED on HEAD: descriptor 50 vs `loadedIds` 49, because `loadedIds` omits
  `bundle.assets`; three cases fail). Not this story's defect, but nine new asset members widen it
  from 1 to 10 and the story cannot land green over it.

### The open design question — DECIDED at refine: the move only

**ADR-013 defers the framework-vs-workspace split**, with a named discharge trigger rather than a
debt entry. Three measurements decided it:

1. **Per-project values are already solved, disjointly.** The `config:` pointer is a citation the
   loader validates for shape and never resolves (`src/work-loops.mjs:207`), and its referent
   `.aof/aof.config.json` is in **neither** the shipped manifest's 86 entries **nor** the install
   lock's 82 `work.files` rows (measured) — so a consumer's tune can never be drift-warned or
   clobbered by `work update`. The record ships immutable; the tunable value lives in a file the
   bundle does not manage.
2. **The demand is one field on two records naming one key.** `ceiling` is a `config:` pointer on
   exactly two of nine (`autonomous-cascade`, `run-resilience`), both naming
   `work.autonomous.maxAttempts`; the rest are `none`/`uncapped`. `owner` is `unknown` on six.
3. **A workspace-loop declaration has zero readers** anywhere in 52 or 53. Shipping a merge would
   mean a precedence rule, a collision rule and a provenance field on every node — speculative
   generality, in a milestone whose style is to route rather than merge.

The consumer-edit problem that might have forced a minimum answer does not: it is already answered
generically at `src/render-plan.mjs:38-41` — **drift-warn and leave**, never clobber, `--force` to
overwrite, and `createLockManifest` (`:99-103`) preserves the drifted entry so the warning recurs.

**Discharge trigger:** the first consumer needing a loop aof does not ship, or the first framework
field wanting a per-project value the `config:` scheme cannot express.

### Precedent the first draft missed

`.aof/templates/` is not the only precedent — `loadWorkspace`'s own comment
(`src/work.mjs:170-173`) records that **milestone 28's verify decision already superseded a
work-stream-co-location choice** (22/ADR-002+003) in favour of `.aof/`, because that is where aof's
config and lock live and it is git-tracked. This story is the second application of that ruling, not
a new principle. `src/mesh-store.mjs:48-53` (`aofHome`) is the in-repo shape for the resolution, read
and deliberately **not** imported — a loop module importing the mesh store would blur the family
boundary FF-5202 keeps legible.

### Independence

`03_story_loop-ready-score` is unaffected by the path change: it reaches the registry solely through
`invoke("work:loops-validate")` and "imports no `work-loops*.mjs` — transitively"
(`03_story_loop-ready-score/STORY.md:89`), so it is path-agnostic and the two stories may proceed in
either order. No other story in 53 touches `src/work-loops*.mjs`.

Confirmed at refine against the milestone's "no two stories edit the same file" property: 53/07's
file set is `src/work-loops.mjs`, the three `src/commands/loops-*.mjs`, `src/bundle/` (nine new
records + `bundle.json` + a regenerated `manifest.json`), five test files, two new `test/arch/` gates,
one new behavioural suite, and `scripts/test.mjs` — the one declared shared append-only hub
(ADR-011). None of those is claimed by 53/00–53/05.

**Its two arch-test names are constrained, and the constraint is non-obvious.** Two *accepted*
milestone-52 gates pin the `acd-loop-*` namespace to a literal roster of exactly nine files
(`test/arch/acd-loop-finding-envelope.test.mjs:358-359` and `test/work-loops-coverage-ledger.test.mjs:149-155,702-703`,
the latter forbidding by name any new suite whose basename begins `acd-loop-` or whose alias begins
`acdLoop`). So 53/07's gates are `acd-registry-single-home` and `acd-registry-framework-owned` —
outside the sweep, leaving both accepted gates unedited.
