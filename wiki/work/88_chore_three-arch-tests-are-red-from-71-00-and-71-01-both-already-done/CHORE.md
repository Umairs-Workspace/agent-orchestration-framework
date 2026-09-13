---
type: chore
number: 88
slug: three-arch-tests-are-red-from-71-00-and-71-01-both-already-done
title: "Three Arch Tests Are Red From 71 00 And 71 01 Both Already Done"
status: done
owner: <role>
created: 2026-09-03
updated: 2026-09-04
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 88 · Three Arch Tests Are Red From 71 00 And 71 01 Both Already Done

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

Three fitness functions in `test/arch/` went red on a clean tree from work that is already `done` — 71/00 and 71/01 — plus a fourth in `test/acceptor-admissibility.test.mjs` found at 71's gate. Each red is a gate correctly reporting that the thing it pinned MOVED or that the condition it was fail-closed on has LIFTED, so the fix in every case is to re-point the control at the new reality, never to delete or weaken it.

## Definition of Done

- [x] Re-point acd-cache-read-surface-boundary's pin from promote-gap-to-chore.mjs's defaultAt() at its new home in src/work-promote/ (the gate's own message says re-point, never delete). Classify test/arch/acd-prompt-bounds-name-their-home.test.mjs into one of acd-registry-fixture-closed's four lanes. Update acd-progress-ledger-consumed's FF-6109 assertion, which requires every declared knob to be refused but now lifts for work.loop.reviewRounds and work.loop.buildNoProgressRounds because continue.md names them - the exact event that test's own comment anticipates. Re-run the full test/arch tree to confirm 1543/1543.
- [x] The SAME `harnessRefusal` lift reddens a fourth test outside `test/arch/`, added at 71's milestone gate (`71/F-71-H`): `test/acceptor-admissibility.test.mjs:589` — "61/03 task 02 — outline row: a key the registry declares tunable is considered, and judged on the other grounds" — expects `["not-admissible", "harness-not-introspectable"]` and now gets `["not-admissible"]` alone. Update it to the same reality FF-6109's own comment anticipated, and re-run BOTH lanes: the `test/arch/` tree AND `test/acceptor-admissibility.test.mjs`.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "Three arch tests are red from 71/00 and 71/01, both already done" (`test/arch/acd-progress-ledger-consumed.test.mjs`)
- **Raised reviewing:** `71/02`, review round 1
- **Promotion key:** `finding:71/02:three arch tests are red from 71/00 and 71/01, both already done`

### What was done (2026-09-04)

Each red was a control correctly reporting a change, and each was re-pointed rather than relaxed:

1. **`acd-cache-read-surface-boundary`** — the structural pin moved from
   `src/commands/promote-gap-to-chore.mjs`'s `defaultAt()` to `src/work-promote/promotion.mjs`'s
   `appendPosition()`. 71/01 extracted the promotion ENGINE (ADR-004: one engine, two faces), taking
   the append-position read with it, so the read now answers for both faces rather than one. ADR-016/G2's
   subject anchor did exactly what it was written to do: it named the relocation instead of passing
   green on a surviving `listItems` symbol.
2. **`acd-registry-fixture-closed` (FF-5809)** — `test/arch/acd-prompt-bounds-name-their-home.test.mjs`
   classified into **lane 3** (`READS_WITHOUT_COPYING`). FF-7101 sweeps `src/bundle/**` in place to
   assert a cited bound out of shipped record text (the `ceiling:` lines of `loops/review-fix-rereview.md`
   and `loops/build-to-green.md`) and copies nothing into a temp registry, so endpoint-closure is not a
   property it can hold. Measured: it was the **only** unclassified file, and no lane entry had gone stale.
3. **`acd-progress-ledger-consumed` (FF-6109)** — the harness leg no longer requires every declared knob
   to be refused. 71/00 (FF-7101) made `commands/continue.md` state each round bound beside its own config
   key, so the fail-closed ground has lifted for `work.loop.reviewRounds` and `work.loop.buildNoProgressRounds`
   with nothing in the acceptor edited — the exact event the leg's own "NOT HARDCODED" comment anticipated.
   The partition is now **read off the harness document's text**, so the next key the prompt names moves
   sides by itself. The "switch, not a discriminating control" claim is re-proved over a harness that names
   NO key, so it no longer rests on how many knobs `continue.md` happens to name today.
4. **`test/acceptor-admissibility.test.mjs`** (71/F-71-H) — the `61/03 task 02` outline row was asserting a
   snapshot (`[not-admissible, harness-not-introspectable]`) of a tree where the prompt named no config key.
   Restated against the RULE the feature actually specifies — *considered, and judged on the other grounds* —
   with the harness ground now asserted to apply **iff** the harness of record does not name the key. It will
   not re-redden the day the prompt names another key.

**Measured after the fix** — `node scripts/test.mjs --only test/arch/*.test.mjs`, and the same over
`test/acceptor-admissibility.test.mjs`: all four named tests **green**, and the four files together run
**53/53 green, exit 0**.

**The `1543/1543` figure in the DoD is stale, and the tree is not wholly green.** The `test/arch` tree is
now **1718** tests (it has grown by 175 since this chore was written), of which **1711 pass and 7 fail**.
None of the 7 is one of this chore's, and all 7 were verified to be outside its subject:

| red | attribution |
| --- | --- |
| `acd-chore-dod-checklist` — `97_chore_…/CHORE.md` has no `## Definition of Done` | chore **97**'s own record; committed at HEAD |
| `acd-command-layer-imports-downward` ×2 — `loop-record-render.mjs → commands/loops-graph.mjs` | the 78/79/81 loop-execution-record commit; committed at HEAD |
| `acd-controls-never-execute` (FF-5905) — a seventh doctor lane module | already scheduled by chore **106** |
| `acd-declared-writes-include-generated-siblings` (FF-7106) — milestone 96's stories | milestone **96** (`not-started`); related to chore **89** |
| `acd-loop-scope-guard` (FF-5308) | **story 86's uncommitted `inRange` change in this checkout** — the test's own message says the red means the fix landed and a follow-on is owed |
| `acd-observe-snapshots-append-only` (FF-6807) — `src/commands/loop-record.mjs` | the 78/79/81 commit; committed at HEAD |

Six of the seven are present at HEAD with none of their subject files touched by any uncommitted change;
the seventh belongs to story 86, in flight in this same tree. The boxes above are ticked for the work this
chore names, with the whole-tree figure recorded here rather than silently claimed.

**Duplicate promotions found.** The same three reds were each promoted a second time, and the pin twice more:
chores **91** (the `defaultAt` pin), **92** (the FF-6109 harness lift), **93** (the FF-5809 unclassified file)
and **107** (the `defaultAt` pin again) all schedule work this chore has now discharged. They should be closed
as already-done rather than built. The promotion idempotence key is `(reviewed ref + finding title)`, so the
same defect raised under a different title, or at a different review, promotes again — worth a look.

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->
