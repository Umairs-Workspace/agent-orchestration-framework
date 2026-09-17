---
type: story
number: 03
slug: the-test-tree-gets-an-interior
title: "The test tree gets an interior — 589 + 433 flat siblings grouped by subject, and a registry that spreads an index instead of growing a line per suite"
parent: 119
depends: [119/00, 119/01, 119/02]
status: done
owner: product-owner
created: 2026-09-06
updated: 2026-09-07
adrs: [ADR-010, ADR-004, ADR-009]
reads:
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-010
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-004
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-009
  - src/cited-path-resolve.mjs
  - src/work-audit/census.mjs
  - src/work-test-select.mjs
  - src/commands/test.mjs
  - test/arch/testing/acd-suite-registration-single-decider.test.mjs
  - test/arch/acd-source-directory-budget.test.mjs
  - scripts/test-unit.mjs
  - wiki/work/TECH_DEBT.md
files:
  - test/
  - scripts/test.mjs
  - scripts/test-unit.mjs
  # Corrected at build: these two named their pre-move flat paths, and this story is the diff that
  # moved them. They are covered by `test/` either way; a declaration that cites a path this very
  # story invalidates is the defect the milestone is about.
  - test/arch/loop/acd-loop-suite-registration.test.mjs
  - test/arch/testing/acd-suite-registration-single-decider.test.mjs
  # Added at build, and STATE records why the omission was visible from the contract alone: task 00
  # requires re-pointing the `test/arch/<name>.test.mjs` literals inside `src/` modules and names
  # `src/work-audit/census.mjs` as the silent one. The build also had to widen that module's
  # text-level lane, because "registered" became transitive and the lane read only the runner.
  - src/work-audit/census.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 03 · The test tree gets an interior

## User story

As **the author of the next suite**,
I want **`test/` and `test/arch/` grouped by subject, with a per-directory index the registry
spreads**,
so that **the family a change belongs to is a directory rather than something reconstructed from a
filename prefix, and `scripts/test.mjs` stops growing a spread per suite** — 5,142 lines over 1,030
spreads today, up 580 lines in the three days before the last re-measure. This is also the soil items
17 and 27 grew in: a suite imported and not spread is invisible, and 26 suites carrying 117 entries
stayed dead for a month because nothing groups the family well enough for an absence to look like one.

## Tasks

- [x] `tasks/00_test-arch-gets-subject-directories.feature` — `test/arch/`'s 433 flat siblings grouped
      by subject, each group carrying an index.
- [x] `tasks/01_test-gets-subject-directories.feature` — `test/`'s 589 flat siblings, the larger half
      item 63 never ledgered until 2026-09-02.
- [x] `tasks/02_the-registry-spreads-an-index.feature` — FF-11906: `registrationDecision`
      (`src/work-audit/census.mjs`) stays the **single** decider; each index reaches the registry by
      import and spread, no index decides its own membership by `readdir`, and the assembled array is
      asserted **unchanged in membership** across the restructure.

## Notes

- **This story has a hard dependency on `119/00`** (ADR-004), not a soft one. `citedControlPathsIn`
  measures **157 distinct control paths / 175 register rows across 20 `ARCHITECTURE.md` documents**
  citing `test/arch/**`. Those 20 registers belong to **done** items, where a `pending` marker is not
  admitted and delivered records are immutable — so without the rename resolver this move would leave
  `aof work doctor` reporting 175 permanent `control-unresolved` findings **that no legal edit could
  clear**. This is the third blocker, and it was invisible to the milestone's own framing.
- **It runs after `119/01` and `119/02`, not before.** Cutting the test tree first is defensible and
  was weighed at the Decide stage: it would let this milestone's six new controls land in their homes
  directly. It is not taken — this story moves 1,022 files and rewrites the registry, and running it
  ahead of three source-move stories makes every one of their diffs a merge against a moving test
  tree. The cost of the chosen order is **one register amendment at this story's structural review**,
  for the six controls declared at flat `test/arch/` paths — bounded and known, against unbounded
  merge risk.
- **This story lowers FF-11904's `test/` and `test/arch/` rows.** The budget table is shrink-only;
  a story that shrinks a layer must lower its row rather than leave headroom.
- **Items 64, 65, 66 stay out of scope and are not worsened.** The three oversized `work-loops-*`
  suites are downstream of this partition by construction — splitting them before the tree has an
  interior lands them back in a flat directory.
- **`scripts/test-unit.mjs` must not become a second index** — asserted by FF-11906, so TECH_DEBT
  item 71 is neither paid nor worsened here.
- **`59/FF-5903` and `72/FF-7203` survive this change untouched**, and that is the test of ADR-010:
  they survive *because* `registrationDecision` stays the single decider. FF-11906 **extends**
  `72/FF-7203`'s control rather than joining it with a sibling.
- **`53/FF-5311`’s digest ceiling is reddened by this story in three independent ways, and no ADR
  grants the residue advance.** `test/arch/acd-loop-suite-registration.test.mjs` pins every byte of
  `test/arch/acd-loop-finding-envelope.test.mjs` (ACCEPT-02) and `test/work-loops-coverage-ledger.test.mjs`
  (ACCEPT-03). This story **(a)** moves both, so the ceiling’s `readFile` throws ENOENT; **(b)**
  re-depths their `../src/` and `../support/` specifiers — and the control’s own self-check proves
  import lines are *not* in a granted region; **(c)** must re-point that suite’s flat
  `readdir(“test/arch”)` and its two literal runner marker comments, which the index restructure
  deletes. TECH_DEBT item 71 records that this exact edit class was ruled ADR-level and refused.
  The control is now in `files:` and `tasks/00` carries the criterion, so the **re-stamp is a visible
  act at structural review** rather than a mid-build surprise — residue advances with its reason and
  the story named, the mask set unchanged, and the next unattributed byte still failing.
- **`scripts/test-unit.mjs` IS touched, and ADR-010 §4’s “not touched” is unbuildable as written.**
  `grep -c 'from “../test/’ scripts/test-unit.mjs` returns **98**, of which 46 are under `test/arch/` —
  every one a file this story moves. Left untouched, the script dies at its first import. §4’s
  *intent* — that it does not become a second index — is what FF-11906 asserts and is preserved; the
  re-point is admitted by ADR-008 as “an import specifier pointing at it”. Wording finding for the
  structural review; no ADR edit sought, and the file is now in `files:`.
- **The membership criterion is TWO scenarios, because either alone is defeatable.** Set equality
  alone cannot see a deletion — if a suite vanishes with its entries, both sides shrink together and
  the equality still holds. So `tasks/00` carries a before/after name-set comparison across the base
  and tip commits **and** an at-HEAD equality in both directions, each floored. Measured green on the
  day it was authored: `node src/work-audit-probe.mjs scripts/test.mjs` → **9,139 entries, 9,139
  distinct**, with 0 assembled-not-on-disk and 0 on-disk-not-assembled across 1,021 walked suites.
- **The comparison must import the runner FIRST.** Suite-then-runner order dies at
  `scripts/test.mjs:3736` with `ReferenceError: Cannot access 'testCommandContractTests' before
  initialization` — TECH_DEBT item 26’s TDZ ring, reached through `test/test-command-contract.test.mjs:51`.
- **All 7 flat `readdir(“test/arch”)` carriers are LOUD** — each backed by a floor or a named lookup,
  checked one at a time. So this story cannot disarm one by emptying it, which is the failure mode
  `119/00`’s FF-11902 exists to catch elsewhere.
