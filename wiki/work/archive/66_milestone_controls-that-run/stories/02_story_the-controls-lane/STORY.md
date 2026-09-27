---
type: story
number: 02
slug: the-controls-lane
title: "The Controls Lane"
parent: 66
depends: [66/00, 66/01]
status: done
owner: product-owner
created: 2026-08-15
updated: 2026-08-16
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · The Controls Lane

## User story

As the reviewer accepting a milestone,
I want `aof work doctor` to tell me that a declared control does not exist, that an id collides with
a sibling's, that a citation resolves to nothing, and that an assertion has no recorded failing
observation,
so that "the controls are green" stops being a claim I have to take on trust and becomes one I can
refuse.

<!-- This is the milestone's thesis made mechanical: a control is a resolvable citation with three
     properties — declared once, located where a runner can see it, carrying a recorded red
     observation. One lane checks all three. ACD executes nothing: leg A is a `stat`, leg B is a text
     read (`SPEC §Scope` out-of-scope item 1, held structurally rather than by intention). -->

## Tasks

- [x] `tasks/00_one-lane-that-reads-and-never-runs.feature` — `src/work-doctor-controls.mjs` is
      appended to `CHECK_GROUPS` as one lane of pure `(snapshot, ctx) => Finding[]` groups with a
      frozen eight-code envelope, and the snapshot extension rides reads doctor already performs
- [x] `tasks/01_a-register-declares-once.feature` — the duplicate-id and dangling-citation checks,
      generalised from `duplicate-driver-number` and `loop-graph-dangling-endpoint` to any register
- [x] `tasks/02_a-control-resolves-or-declares-itself-pending.feature` — the two-leg resolution, the
      `pending` marker as ACD's declarative `xfail`, the staging-folder prohibition, and the named
      shrink-only baseline of 20 grandfathered citations
- [x] `tasks/03_a-new-assertion-carries-a-red-probe.feature` — a declared `FF-NN` with no
      corresponding red-probe row in the item's `VERIFICATION.md` is a finding, checked by **shape
      only**

## Notes

**Read `ARCHITECTURE.md` ADR-003 §2–§5, ADR-004 and ADR-005 §2–§3 before building.** This story is
their mechanisation. The *ask* that goes with these rules ships in 66/03, concurrently — both build
against the same frozen paper contract (ADR-001 §2, ADR-005 §1, ADR-006) and neither waits on the
other.

**This story is the single editor of the milestone's only shared edit point.** `CHECK_GROUPS`
(`src/work-doctor.mjs:411-426`) is an append-only array, and the partition was revised specifically so
that three stories do not append to it — *"three stories appending to one array is merge friction with
no independence gain"*, priced against story 65's own record (`65/STORY.md:69-74`: two stories the
architect had partitioned as independent both edited one file, ×9 and ×8). One story owns the array;
one new module holds all three groups.

**Both `depends` edges are real source-side import edges, not sequencing preferences.** This lane
imports `src/declared-id.mjs` (66/01) for the recogniser and the acceptance-horizon predicate (66/00)
for its severity. `depends: [66/00, 66/01]` is data since story 65, so `aof work next` will hold this
story until both land.

**Purity is the half of m52/ADR-007 that survives verbatim — and the dependency direction INVERTS.**
All I/O stays at the snapshot boundary: `buildSnapshot` (`src/work-doctor.mjs:242`) gains the text
`fileState` already reads and discards (`:126-133`), plus one genuinely new probe per declared control
path. But this lane must be a **true leaf**: both existing lanes import the spine
(`work-doctor-coherence.mjs:17`, `work-doctor-freshness.mjs:19` → `work-doctor.mjs` → `node:fs`), so
following the house idiom would fail FF-6605. This lane therefore takes identity from the snapshot
rows rather than importing `ITEM_RE`/`isDriver`, and **the spine imports the lane** — calling its pure
extractors to learn which paths to probe — not the reverse. FF-6605 is scoped to **direct** imports
plus a named leaf allowlist, because the transitive wording is unsatisfiable alongside the house
idiom. Two riders measured at refine: `projectRoot` must ride onto the snapshot (a group may
`path.join` but must never `path.resolve` a bare relative, which reads `process.cwd()`), and the
record-doc read at `:259` needs extending alongside `fileState` or `SESSION.md` findings registers are
invisible.

**Costs, measured rather than estimated.** Carrying the text costs **~12.4 MiB retained** across 399
files — 2× what the byte count suggests, because all 399 are non-ASCII and V8 cannot use its one-byte
representation — against a `buildSnapshot` baseline of 571–660 ms. The citation scan is **6.7 ms** over
1,220 files; the finding's 346 ms figure was measuring per-citation re-globbing, not a regex pass. One
open item the contract names: `staged-control` needs a recursive filename walk nothing carries today —
it can ride `newestFileMtimeMs` (`:87-104`), which already recurses and `stat`s every file and discards
the names, but that runs per item dir, so the lane's predicate is narrower than FF-6607's `**`.

**The eight codes are a consumed contract the moment this lands** (ADR-003 §5) —
`register-duplicate-id`, `register-dangling-citation`, `verification-register-missing`,
`verification-missing-red-probe`, `control-unresolved`, `control-unregistered`,
`control-runner-unchecked`, `staged-control`. Severity is **not** per-code: it is ADR-002's predicate
— inside the horizon `error`, outside `warn` — except `control-runner-unchecked`, always `warn`,
because it reports that a leg did not run.

**Leg B is an honest no-op when unconfigured, never a silent pass.** With no
`config.work.controls.runners` the check says so (`control-runner-unchecked`), the idiom copied
verbatim from `roadmap-folder-mismatch` — *"an honest NO-OP until a structured, machine-parseable
milestone index is configured"* (`src/work-doctor-freshness.mjs:9-11`). Measured reason it cannot be a
glob: both this repo's runners register by explicit import + spread, and exactly one of 287 arch
suites (`test/arch/work-content-free-discovery.test.mjs`) is named by only one of them — a glob would
report all 287 as visible. A gate wrong in the safe direction is still wrong (m45/R5).

**Two populations this story must not swamp.** ACD's own registers cite **215 distinct `test/arch/…`
paths; 183 resolve, 32 do not** — 13 in the in-flight m53 (the legitimate declared-ahead-of-subject
state) and **20 across seven `done` milestones**, at least two of which were deliberately retired with
their eliminated subjects (TECH_DEBT item 5) and can therefore never be cleared by any legal edit.
Those twenty are a **named, shrink-only baseline** — never a count (m47/R9), never a blanket `done`
exemption — so the twenty-first fails.

**66 does not fix TECH_DEBT item 50.** Leg B uses the same substring predicate as
`test/arch/acd-test-suite-registration.test.mjs:151` and inherits the same hole (an
imported-but-never-spread suite is invisible). Stated rather than absorbed; item 50 says it wants a
story of its own.

**A lane is not responsible for the findings it makes visible.** The day this lands, `aof work doctor`
exits non-zero on this repo with roughly 25 errors — **13 `control-unresolved`** against milestone 53,
whose thirteen declarations carry no `pending` markers, and **2 `verification-register-missing`**
(m53 and m66 have no `VERIFICATION.md` yet). **None of it is this story's to fix.** m53's accept owns
the marking act — the same act ADR-009/B performed on 66's own register — and 66's own missing
register is discharged by 66/03's template plus this milestone's verify. This is stated here so it is
not discovered at verify and mistaken for a defect in the lane.

**Fitness functions owned here** (ADR-007 §1): **FF-6605** `test/arch/acd-controls-never-execute.test.mjs`,
**FF-6606** `test/arch/acd-controls-finding-envelope.test.mjs`, **FF-6607**
`test/arch/acd-no-staged-control.test.mjs` + `test/arch/acd-milestone-66-controls-resolve.test.mjs` —
the second parses **this milestone's own register** with the shipped recogniser, so a row added to it
without a file fails immediately. That is m22/R1's own-coverage rule, and the guard against a gate for
guards that is itself ungated.
