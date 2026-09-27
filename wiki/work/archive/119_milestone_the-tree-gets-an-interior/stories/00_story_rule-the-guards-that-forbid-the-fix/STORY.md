---
type: story
number: 00
slug: rule-the-guards-that-forbid-the-fix
title: "Rule the guards that forbid the fix — purity is external, a control derives its facts, and a cited path survives a rename"
parent: 119
status: done
owner: product-owner
created: 2026-09-06
updated: 2026-09-07
adrs: [ADR-001, ADR-002, ADR-003, ADR-004]
reads:
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-001
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-002
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-003
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-004
  - src/phase-brief.mjs
  - src/work-loops-checks.mjs
  - src/agent-session-driver.mjs
  - src/work-audit/census.mjs
  - src/work-audit/evidence.mjs
  - test/support/source-slice.mjs
  - test/arch/acd-criterion-frozen-in-epoch.test.mjs
  - test/arch/acd-loop-finding-envelope.test.mjs
  - test/arch/acd-controls-never-execute.test.mjs
  - test/arch/acd-mesh-ui-single-data-command.test.mjs
  - src/work-acceptor/rule.mjs
  - src/work-acceptor/ledger.mjs
  - test/frozen-set-compiled.test.mjs
  - test/framework-stops-shipping-guard.test.mjs
  - test/bundle/bundle-asset-manifest-complete.test.mjs
  - wiki/work/TECH_DEBT.md
files:
  - src/cited-path-resolve.mjs
  - src/work-doctor.mjs
  - src/work-doctor-controls.mjs
  - test/arch/acd-session-driver-single-home.test.mjs
  - test/arch/acd-phase-brief-single-bag.test.mjs
  - test/arch/acd-loop-checks-pure.test.mjs
  - test/arch/acd-acceptor-ledger-accrues-across-epochs.test.mjs
  - test/arch/acd-acceptor-rule-is-one-object.test.mjs
  - test/arch/acd-loop-cap-single-home.test.mjs
  - test/arch/acd-provenance-stamped-at-write.test.mjs
  - test/arch/acd-trial-metric-declared.test.mjs
  - test/arch/acd-work-counters-read-only.test.mjs
  - test/arch/acd-loop-finding-envelope.test.mjs
  - test/agent-session-driver-door.test.mjs
  - test/arch/acd-purity-is-external.test.mjs
  - test/arch/acd-control-derives-its-census.test.mjs
  - test/arch/acd-cited-path-resolves.test.mjs
  - test/work-doctor.test.mjs
  - test/work-doctor-controls.test.mjs
  - test/cited-path-resolve.test.mjs
  - test/support/module-family.mjs
  - test/support/census-carrier-plants.mjs
  - test/arch/acd-mesh-ui-single-data-command.test.mjs
  - test/arch/acd-gate-door-lives-in-the-command-layer.test.mjs
  - test/arch/acd-trigger-level-is-a-ceiling.test.mjs
  - scripts/test.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · Rule the guards that forbid the fix

## User story

As **the engineer who reaches for the obvious decomposition**,
I want **this tree's guards to constrain what a module depends *on* rather than how many files it
occupies, to derive their facts about the tree rather than storing them, and to keep resolving a
cited path after the file behind it moves**,
so that **the four stories behind me can move several hundred files without each one discovering, at
build time, a control it had no way of knowing it would break** — which is the measured cost today:
four consecutive stories of milestone 63 landed outside their declared write sets, each by a
*different* control, and `phase-brief.mjs` grew 432 → 1,651 lines because the only fix available
fails CI.

## Tasks

- [ ] `tasks/00_purity-is-external.feature` — a purity guard resolves its subject as a **family**
      (`src/<name>/` if the directory exists, else `src/<name>.mjs`) and classifies intra-family
      imports as admitted; no guard in the tree asserts purity by banning the token `import`.
- [ ] `tasks/01_a-control-derives-its-fact.feature` — a control stores a **decision** (a declared
      bound, a policy allowlist) and derives a **fact** (a count, a census, an import allowlist);
      every sweep asserts its own non-vacuity so a move reds it rather than emptying it.
- [ ] `tasks/02_a-cited-path-resolves.feature` — a path cited in a delivered document resolves at
      HEAD **or** through the repository's own git rename records; one resolver, two readers, and
      the map derived from history rather than a hand-kept redirect table.

## Notes

- **This story ships no move.** It makes the four that follow *legal*. `phase-brief.mjs` and
  `work-loops-checks.mjs` are read here as the carriers whose guards are being re-expressed; neither
  is split in this story, and neither appears in `files:`.
- **`src/cited-path-resolve.mjs` is a forward reference** — ADR-004 rules "one resolver, in `src/`,
  with two readers" without naming the file. The name is declared here so the write set is complete;
  a builder who prefers another name inside `src/` amends this line rather than writing undeclared.
- **The purity class is NINE control files, not the three the ADR names** (ADR-002). The three named: `70/FF-7002` in
  `test/arch/acd-session-driver-single-home.test.mjs`, `70/FF-7010` in
  `test/arch/acd-phase-brief-single-bag.test.mjs`, `58/FF-5804` in
  `test/arch/acd-loop-checks-pure.test.mjs`. Every *other* purity leg stays unweakened — no `node:fs`,
  no clock, no `fetch`, no outward dynamic `import()`. Only the **unit** changes, from file to family.
- **`SINK_CEILING` is not softened and not deleted** (item 83's explicit "what not to do"). Its value
  is that raising it costs an ADR sentence. Story `119/04` lowers it after the split; this story only
  re-expresses the purity leg of the same file, and the two write it **in sequence, never
  concurrently**.
- **This story writes `test/agent-session-driver-door.test.mjs`**, whose `suites.length === 48`
  census is the item-81 carrier keyed to `src/mesh-worker-execution.mjs`'s fan-in (graph measures 56
  dependents today, 50 of them suites). The equality becomes derived; the non-vacuity floor stays.
- **Ordering is a hard gate.** Nothing in `119/01`–`119/04` may merge before this story does —
  ADR-004's consequence, and the reason the milestone's break-down order was not re-opened at refine.
- **Six more carriers were measured at contract authoring and are now in `files:`** —
  `test/arch/acd-{acceptor-ledger-accrues-across-epochs,acceptor-rule-is-one-object,loop-cap-single-home,provenance-stamped-at-write,trial-metric-declared,work-counters-read-only}.test.mjs`.
  Five of the six use `/^\s*import\s/mu` — the **same form** as the ADR-named
  `acd-loop-checks-pure.test.mjs`, so FF-11901’s class sweep over `test/arch/**` reds on them and the
  set cannot be narrowed away. Two of them guard `src/work-acceptor/rule.mjs` and
  `src/work-acceptor/ledger.mjs` — already one family directory, with the guard banning the edge
  *between* them. That is ADR-002’s own case, live in the tree, and it is why the ruling is a class
  ruling rather than three instance fixes.
- **Two stale `<path>:<line>` citations were found and are NOT to be trusted by the builder.**
  ADR-003 §3 and TECH_DEBT item 81 both cite `test/agent-session-driver-door.test.mjs:160` for
  `NAMES_THE_NEW_MODULE`; it is at **`:146`** at HEAD. Item 81’s own species 3 — a stale citation —
  inside the entry that names the species. Fixing the class is this story’s job; FF-11903 is what
  stops it recurring.
- **ADR-004’s control-citation counts do not reproduce and the contract does not restate them.**
  Re-measured at authoring with `fitnessDeclarations` + `citedControlPathsIn`: **163 paths / 188 rows
  / 21 documents**, against the ADR’s 157 / 175 / 20. Paths and documents differ by exactly 119’s own
  register; +5 rows are unaccounted for by the instrument the ADR names. Decide is closed, so this is
  recorded rather than folded back — `tasks/02` carries its own measurement with its own command.
- **FF-11903’s ceiling must not be pinned from an unanchored extractor.** Measured: the `src/`
  citation universe is **344 distinct tokens / 8,085 citations across 2,161 files** under
  `wiki/work/**`, of which **67 distinct / 385 citations** do not resolve at HEAD. An extractor
  without a left anchor reports 89/1,110 because it clips `ui/` off `ui/src/**` paths.
- **Five `files:` entries were AMENDED at build**, by the mechanism this contract already names for
  `src/cited-path-resolve.mjs`: the one home (`module-family`), FF-11902's plant fixture, ADR-003's
  named SILENT specimen (declared in `reads:` only — item 81's failure mode inside the story ruling
  it), and the **two further purity carriers the Examples table missed** — its `grep
  'doesNotMatch(.*import'` is blind to the `assert.ok(!/…/.test(x))` spelling, so the class is
  **eleven sites in nine files PLUS two**. Amendments to a write set, never to a criterion.

- **The rename map is nearly empty today, and the contract assumes it.** `git log --diff-filter=R -M
  --name-status --format= | grep -c '^R'` returns **20** rename records in the whole reachable
  history, only 2 under `src/` — so on landing day the map resolves **none** of the 67. The map’s own
  **non-vacuity** must therefore be asserted, or a resolver that answers “no renames, ever” passes
  every leg silently.
