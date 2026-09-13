---
type: story
number: 04
slug: the-mesh-god-node-is-split
title: "The mesh god-node is split on the seam its own prior extraction proved — 2,482 lines, 56 dependents, 30 imports, and an exported surface that must not move"
parent: 119
depends: [119/00, 119/01, 119/02, 119/03]
status: done
owner: product-owner
created: 2026-09-06
updated: 2026-09-07
adrs: [ADR-007, ADR-005, ADR-003]
reads:
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-007
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-005
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-003
  - src/agent-session-driver.mjs
  - src/mesh-launcher.mjs
  - src/mesh-assignment.mjs
  - src/mesh-worktree.mjs
  - src/mesh-park-resume.mjs
  - src/mesh-clone-credential-provider.mjs
  - src/mesh-repo-marker.mjs
  - src/run-session-capture.mjs
  - src/run-store.mjs
  - src/global-node-registry.mjs
  - scripts/pin-checkout-id.mjs
  - test/arch/acd-assignment-repo-availability-loud.test.mjs
  - test/agent-session-driver-door.test.mjs
  - wiki/work/TECH_DEBT.md
files:
  - src/mesh/
  # Re-pointed at build: 119/03 gave `test/arch/` an interior, so the five controls this story
  # was authored against live in subject directories now. The declaration named their pre-119/03
  # flat paths, which resolve to nothing — and a write-set entry that resolves to nothing is
  # exactly what makes `--scope impacted` narrow silently.
  - test/arch/session/acd-session-driver-single-home.test.mjs
  - test/arch/assignment/acd-worker-clone-target-scoped.test.mjs
  - test/arch/assignment/acd-worker-clone-no-credential-persisted.test.mjs
  - test/arch/assignment/acd-assignment-repo-availability-loud.test.mjs
  - test/arch/assignment/acd-assignment-resolves-to-a-loop-call.test.mjs
  # Added at build, by 119/00's own precedent (it added two the same way, and recorded why).
  # All four pin a NUMBER about the file this story shrinks, so all four had to move with it and
  # none was findable by reading the subject — only by running the tree. See STATE.md's feedback.
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/session/acd-session-driver-mesh-blind.test.mjs
  - test/arch/audit/acd-control-derives-its-census.test.mjs
  - test/arch/loop/acd-loop-suite-registration.test.mjs
  # Added at behavioural review: three rows of task 01's admission-join Scenario Outline had no
  # delivered test at all, so a third of that table was asserted by nothing across the move.
  - test/mesh/worker/mesh-worker-repo-guard.test.mjs
  - scripts/test.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 04 · The mesh god-node is split

## User story

As **anyone changing mesh worker behaviour**,
I want **`mesh-worker-execution.mjs`'s four independent concerns to be four modules rather than one
file held together by an `assignmentId`**,
so that **a change to launch composition stops being a change to the single point every mesh worker
behaviour passes through** — 2,482 lines, first in the tree, with **56 dependents against 30 imports**
(graph built 2026-09-06T00:48:13.342Z). A hub with high fan-in *and* high fan-out has no side you can
change cheaply, and the current process for growing it is cheaper than splitting it.

## Tasks

- [x] `tasks/00_launch-composition-moves-out.feature` — the directive's `command`/`launch` reads and
      `composeDirectiveLaunchOptions`. The cheapest first cut, already shaped for it, and the concern
      milestone 63/03 added most recently (+85 lines, correctly fenced).
- [x] `tasks/01_repo-admission-moves-out.feature` — `workerHasRepo`, clone-on-miss, the
      clone-credential / clone-url pulls, the scoped-checkout repoint. The largest single block, and
      it carries its own delivered controls (`acd-assignment-repo-availability-loud`).
- [x] `tasks/02_the-split-subtracts.feature` — FF-11907: `createMeshWorkerExecutionHandler`'s exported
      surface asserted **identical** across the split, each extracted symbol asserted **absent** from
      the parent, no extracted module importing its parent back, and `SINK_CEILING` lowered to the
      post-split measured count with the command in its comment.

## Notes

- **This runs LAST, after `119/01`**, because the file must already be inside `src/mesh/` — which
  makes the split **intra-family** and therefore legal under ADR-002's ruling. Split it before the
  move and it is exactly the decomposition item 61 measured as forbidden.
- **The 56 dependents are untouched by construction.** Only 4 are non-test source
  (`src/mesh-launcher.mjs`, `src/global-node-registry.mjs`, `src/mesh-clone-credential-provider.mjs`,
  `scripts/pin-checkout-id.mjs`); the rest are 50 suites and 2 fixtures, and every one of them reaches
  the module through `createMeshWorkerExecutionHandler`. Holding that surface identical is what makes
  this a refactor rather than a rewrite — and FF-11907 asserts it rather than trusting it.
- **A split has already been done once here and it worked**: 3,286 → 2,313 on 2026-08-20, when
  `mesh-park-resume.mjs` and `run-session-capture.mjs` were extracted. It has regrown +169 since, in
  +12 to +85 line increments, **none of which was wrong**. That is the whole argument: the per-diff
  review cannot see this, only the trend line can.
- **`SINK_CEILING` is lowered, never softened or deleted** (item 83's explicit "what not to do"). Its
  value is that raising it costs an ADR sentence, and those sentences are the evidence base of the
  ledger entry. It stays shrink-only with no headroom.
- **Sequential handoff with `119/00` on `test/arch/acd-session-driver-single-home.test.mjs`.** That
  story re-expresses the file's *purity* leg; this one **extends** it with the split's subtraction
  legs. The two write it in sequence, never concurrently — which the milestone's ordering already
  guarantees, this being last.
- **Only the first two seams are in scope.** Item 83 names four (repo admission, launch composition,
  worktree lifecycle, run bracketing). Worktree lifecycle and run bracketing are **not** split here;
  the story delivers the two cuts the prior extraction proved tractable and leaves the ledger's own
  sequencing intact for a later item.
- **The split silently DISARMS two delivered security controls unless they move with it** — raised at
  this story’s contract authoring and confirmed at the source. Both assert *negatives* over the
  parent module’s source text, so once the clone lives in a sibling they pass over a subject that no
  longer contains what they forbid:
  - `test/arch/acd-worker-clone-target-scoped.test.mjs:40-67` — `assertStructural` is all-negative and
    its single positive leg is gated at `:59` on
    `const hasClone = /["']clone["']/.test(code) || /git\s+clone/.test(code)`. Move the clone out and
    `hasClone` is false, `problems` is `[]`, and 38/F1’s scoped-target invariant is asserted over
    nothing — permanently. Its own self-check runs over *planted strings*, so it cannot see the vacuity.
  - `test/arch/acd-worker-clone-no-credential-persisted.test.mjs:60-104` — the same shape over the
    SECURITY T1/T2/T3 negatives. Only `assertHelperResetControl:120-129` is positive and reds loudly,
    so a builder who repairs the loud leg alone leaves the negatives vacuous.
  Both are now in `files:`. This is the **item-81 species landing on a security control**, and the
  instrument already exists: FF-11902 (non-vacuity, `119/00`) lands three stories ahead of this one.
- **`test/arch/acd-assignment-resolves-to-a-loop-call.test.mjs`’s `MESH_FILES` is a frozen three-file
  census** (`:51-55`). After the split the launch-composition and clone code lives in files it does not
  name, so every “no second speller” leg covers less than it reads as covering. In `files:` for the
  same reason.
- **Ordering corrected at refine.** `depends:` first read `[119/00, 119/01]`, which would have let this
  story become ready before `119/02` and `119/03`. ADR-007 §4 and the Notes both put it **last**, and
  `119/03` moves `test/arch/**` and replaces per-suite registration in `scripts/test.mjs` with a
  per-directory index — so this story’s control paths and registration surface both depend on it
  having run. The declaration now says so.
