---
type: story
number: 02
slug: repo-filter-model
title: "The repo filter as a pure module — one home for the URL contract and the narrowing"
parent: 47
status: done
owner: product-owner
created: 2026-08-10
updated: 2026-08-13
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · The repo filter as a pure module

## User story

As the operator who deep-links, bookmarks and shares fleet URLs,
I want "narrowed to this repo" to be a stated, testable contract rather than a component's private
state,
so that the same URL means the same thing tomorrow, in someone else's browser, and after the next
milestone edits the page around it.

The benefit is challengeable and it is not "a helper exists". This repo has **no React test
harness** — no vitest, no testing-library — so a narrowing decision that can only be exercised
through a component is a narrowing decision with no tests. It is also the difference between one
answer and several: `filterToWorkspace` has been an exported, typed, *tested* function with **no
production caller** since m34/story 03, and the page has meanwhile grown its own inline
`status.scope === "local"` narrowing line. After this story there is one home, `node:test`
interrogates it directly, and a URL that stops meaning what it meant is a red test rather than a bug
report.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_repo-url-contract.feature` — `?repo=<workspaceId>` reads and writes through one pair of
      pure helpers: absent and malformed are *no filter*, a repeated parameter takes the first, the
      round-trip is idempotent, and every other parameter and the fragment survive untouched
- [ ] `tasks/01_narrowing-completeness.feature` — the narrowing covers EVERY collection on the payload
      that carries workspace identity, and any collection that carries none is DECLARED machine-wide
      rather than silently passed through
- [ ] `tasks/02_scope-composition-and-copy.feature` — `scope` and `repo` compose by intersection,
      neither overriding the other, and each way of arriving at nothing has its own true sentence

## Notes

**A zero-blast-radius stage — that is why it can run first.** This story lands, is fully exercised by
`node:test` through `test/fleet-scope.test.mjs`, and is imported by **no new caller**. Graph-cited:
`ui/src/fleet/scope.mjs` ← 6 (five of them suites) → 1. **Parallel-eligible with `47/01`**; the two
touch disjoint files. `47/03` depends on this one for its functions.

**One home, and it is an existing one.** ADR-001: the filter EXTENDS
[ui/src/fleet/scope.mjs](../../../../../ui/src/fleet/scope.mjs) — there is no sibling filter module,
and no module outside that one home names the `repo` query key. This is the standing house rule
(*extend existing surfaces, never add siblings*) and m45/ADR-006's *"`scope` keeps its existing ONE
home"* made structural rather than remembered.

**Emptiness must become filter-aware — the gap QA found on `47/03`.** `isEmptyStatus` reads the
narrowed payload, so a filter naming a **known-but-quiet** workspace (on the mesh, published, but
with no work items and no nodes) leaves that workspace's own row standing: the predicate answers
`false` and the page renders *populated* exactly where DG-47-3 requires the filtered-empty state.
Closing that is this story's, and the quiet-but-known workspace is an explicit Examples row — it is
the case that falsifies the naive predicate.

**`emptyStateCopy` becomes `{ heading, body }`, and `47/03` owns the consumer change.** It returns a
body only today; the heading is inline JSX in `Fleet.tsx:1523-1525`. DESIGN pins a heading *and* a
body per filtered state, so the shape has to grow — but the one-line `Fleet.tsx` edit belongs to
`47/03`, which keeps this story touching `scope.mjs` + `scope.d.mts` only. That is what preserves the
zero blast radius and the parallel-eligibility with `47/01`. Two lanes in `test/fleet-scope.test.mjs`
read `.body`; the strings they assert on are unchanged.

> **CORRECTED AT BUILD (PO, 2026-08-10) — the paragraph above was wrong, and it was wrong in a way
> that mattered.** Finding **F-47-02-ARCH-F2**: a **breaking return-shape change to a shared export
> cannot have zero blast radius.** `EmptyFleet` renders `emptyStateCopy`'s result as a React child,
> so shipping `{ heading, body }` without the call-site edit renders an object as a child and breaks
> the live empty state at runtime *and* at `tsc` — meaning the deferral this paragraph specifies was
> never available. The one-line adaptation therefore landed in **this** story
> ([Fleet.tsx:1330-1347](../../../../../ui/src/fleet/Fleet.tsx#L1330), labelled *"CALL-SITE
> ADAPTATION ONLY"*, verified behaviour-preserving — heading and body byte-identical to the strings
> the component rendered before). Three consequences, recorded rather than left implicit:
> **(1)** this story is **not** zero-blast-radius and does **not** touch only two files;
> **(2)** its parallel-eligibility with `47/01` is falsified — both edit `Fleet.tsx`, the one file
> `ARCHITECTURE §Story-boundary guidance` serialises everything against;
> **(3)** part of **DG-47-1**'s re-homing (the inline heading ternary → `{copy.heading}`) is done
> early, so `47/03` inherits less than its contract says.
> The engineering call was right; the boundary was wrong. The alternative that would have preserved
> it — keeping `emptyStateCopy` backward-compatible across the two stories — was not considered at
> refine, and that is the retro item.

**Clearing is `withRepoParam(search, null)`** — there is no third export. ADR-003 names the clear form
without naming a function, and the arch test only requires the two, so a `clearRepoParam` would pass
CI and give the URL write two doors.

**Carry the `.d.mts` sidecar.** `scope.d.mts` is type-only, so no import edge reaches it and the
graph is silent about it — but omit it here and `47/03` fails at `tsc` with an error naming the wrong
file.

**The filter is read-side only.** ADR-002: the narrowing is CLIENT-SIDE over the payload the fleet
already holds; `/api/mesh/status` gains no parameter and `src/` is not edited by the filter at all.
That is what keeps `test/mesh-ui-read-only-contract.test.mjs` and `test/arch/acd-mesh-ui-read-only`
green **without being touched** — which is what SPEC asked for.

**`?scope=` survives** (ADR-005, the ruling SPEC required this milestone to record either way):
`scope` and `repo` are different questions — scope narrows at the server, repo narrows the result at
the client. An empty intersection is a correct answer that says so, not a bug. ADR-005 states the
measurable retirement condition for `scope=local`; this milestone does not act on it.

Governing ADRs: **001** (one home, no sibling), **002** (client-side, read-only), **003** (the
`?repo=<workspaceId>` URL contract — stable opaque id, never the mutable name or the machine-local
path), **004** (the completeness rule this module encodes), **005** (`scope` × `repo` compose by
intersection). Fitness functions: `acd-fleet-filter-single-home`, `acd-fleet-filter-every-region`,
`acd-fleet-filter-read-only`.
