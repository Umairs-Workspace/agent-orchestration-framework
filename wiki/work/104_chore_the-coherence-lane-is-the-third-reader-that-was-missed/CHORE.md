---
type: chore
number: 104
slug: the-coherence-lane-is-the-third-reader-that-was-missed
title: "The Coherence Lane Is The Third Reader That Was Missed"
status: done
owner: product-owner
created: 2026-09-04
updated: 2026-09-05
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
# 104 · The Coherence Lane Is The Third Reader That Was Missed

## Intent

A `depends:` edge naming a top-level parentless story is reported by `aof work doctor` as an unmet
dependency at severity `error`, although the story is `done`. The fix already exists — `isDependTarget`
in `src/work.mjs`, written for this exact pair — and was adopted by `work:next` and `validate` while
doctor's coherence lane, a third reader of the same question, was missed. This chore finishes that
propagation and exports the constant so a fourth reader cannot repeat it.

## Definition of Done

- [x] `isDependTarget` is EXPORTED from its one home (`src/work.mjs`) rather than being a module-local `const` — today a third reader could not share it even if it knew to. (`src/work.mjs:458`; the doctor family reaches it through the spine's re-export, `src/work-doctor.mjs:99`, which is how those lanes already receive item identity.)
- [x] `src/work-doctor-coherence.mjs` uses it at both sites (`:162` building `driverStatusByNumber`, `:229` the `depends-blocked-in-progress` check) in place of the imported `isDriver`, so a parentless story enters the index it is looked up in. (Now `:170` and `:238`; the lane's only import of the predicate is `isDependTarget` — `isDriver` is no longer in scope there to be reached for.)
- [x] `numbering-gap` stops counting a top-level story's number as missing — measured today: `79_story_committed-loop-graph/` exists on disk and 79 is reported among the numbers "missing between 00 and 101". (Measured before: `29, 30, 31, 42, 65, 73, 74, 79, 80, 81, 83, 84, 85, 86, 87, 102` — fifteen existing story folders reported as absences. Measured after, over the same real stream: `42` alone, which is the genuinely item-less `42_structural-overhaul/`.)
- [x] `isDriver` itself is UNCHANGED. What a number may NAME and what drives a PHASE are different questions, and `src/work.mjs`'s own comment says so — widening `isDriver` would change readiness and scheduling as a side effect. (Both bodies byte-unchanged: `src/work.mjs:442`, and the spine's mirror `src/work-doctor.mjs:89`. `nextWork`'s driver walk still filters `isDriver` — scheduling is untouched.)
- [x] Every remaining reader of "which numbers can a `depends:` edge name" is enumerated and uses the one home — a grep for `isDriver` across `src/` with each hit classified as naming-question or phase-question. (The table below.)
- [x] A regression test pins it: a driver depending on a `done` parentless story reports no `depends-blocked-in-progress`. (`test/work-next.test.mjs` already carries the twin for the readiness walk — mirror it for doctor.) (`test/doctor-coherence-completeness.test.mjs` — and its other half, so widening what a number may name cannot make an UNFINISHED one read as met. `test/doctor-freshness-structural.test.mjs` carries the same pair for `numbering-gap`, plus the widened `duplicate-driver-number`.)
- [x] `aof work validate` is green (no regression) (`aof work validate 104` → `PASS — 104 is well-formed`; `aof work doctor 104` → exit 0, one pre-existing `numbering-gap` warn naming 42.)

## Reader enumeration (DoD 5)

Every live `isDriver` / `isDependTarget` site in `src/`, classified. The **naming** question is "which
numbers may a `depends:` edge resolve over, and which numbers does a top-level item occupy" — those
sites take the one home. The **phase** question is "what drives a phase, and what is scheduled" — those
keep `isDriver`. A third class fell out of the sweep and is named honestly rather than folded into
either: the **subject** question, "whose own `depends` is read at all".

| Site | Question | Predicate |
| --- | --- | --- |
| `src/work.mjs:458` | naming — THE ONE HOME | `isDependTarget` (now exported) |
| `src/work.mjs:1072` — `dependTargetNumbers`, validate's depends-resolution target set | naming | `isDependTarget` (already, m78) |
| `src/work.mjs:1340` — `dependTargets`, the readiness walk's status lookup | naming | `isDependTarget` (already, m78) |
| `src/work-doctor-coherence.mjs:170` — `driverStatusByNumber` | naming | `isDependTarget` (fixed here) |
| `src/work-doctor-coherence.mjs:238` — the `depends-blocked-in-progress` subject | naming | `isDependTarget` (fixed here) |
| `src/work-doctor-freshness.mjs:204` — `numbering-gap` | naming — which numbers a top-level item occupies | `isDependTarget` (fixed here) |
| `src/work-doctor.mjs:619` — `duplicate-driver-number` | naming — its own message says the fault is ambiguous `findWork`/`nextWork` resolution, and a parentless story is now resolvable over that number | `isDependTarget` (widened here) |
| `src/work.mjs:442` | phase — the definition | `isDriver`, unchanged |
| `src/work.mjs:1332` — `nextWork`'s driver walk | phase — readiness + scheduling (DoD 4) | `isDriver`, unchanged |
| `src/work-doctor.mjs:89` | phase — the spine's mirror of the definition | `isDriver`, unchanged |
| `src/work.mjs:1091` — validate's driver `depends` CYCLE graph | **subject** — whose own edges are graphed | `isDriver`, unchanged (finding below) |
| `src/work.mjs:1167` — validate's 3a, which items' `depends` are checked to resolve | **subject** — whose own edges are checked | `isDriver`, unchanged (finding below) |
| `src/work-doctor-controls.mjs:18,350` | neither — comments; the lane takes identity from the snapshot ROWS and imports no predicate (FF-6605) | none |

## Notes

- **Promoted from verification finding:** `78/VERIFICATION.md` **F-78-I** (`medium`).
- **Raised by:** `aof:verify 78` — milestone 78 declares `depends: [52, 53, 79]` and 79 is the parentless story `79_story_committed-loop-graph`.
- **It has a fuse, which is why it keeps escaping.** The check fires only for `in-progress` drivers, so accepting the milestone silences it — confirmed at 78's gate, where the error vanished the moment `status` moved to `done`. The next parentless story depended on by a driver rediscovers it from scratch.
- **Two facts are collapsed into one message.** "This dependency is not done" and "this dependency is not in my index" render identically; `driverStatusByNumber.get(79)` is `undefined` and `undefined !== "done"`. Worth separating even after the index is widened.
- **This is the enumerate-every-reader failure**, one concept with three readers and two updated. Sibling finding **F-78-K** is chore **103**.
- **A fourth reader was found by the sweep and is fixed here too:** `duplicate-driver-number` (`src/work-doctor.mjs:619`). Its own message says the fault is ambiguous `findWork`/`nextWork` resolution, and `aof work find 79` resolves the parentless story by its bare number — so a milestone and a story sharing a number is exactly that ambiguity, and the check was blind to it. DoD 5 is what caught it: the enumeration is not paperwork.

## Findings (review close — solo lanes, round 1)

No Blockers. Two findings were fixed at the close; two are recorded for the operator. The loop
created nothing: the item under review is itself a chore, so a promotion here would be the chore
that mints the next chore.

- **`fixed` (architect) — two comments named a binding neither lane imports any more.** `src/work-doctor.mjs`'s registry note and its FF-6605 note both read "`ITEM_RE`/`isDriver`"; the lanes now take `ITEM_RE`/`isDependTarget`. A comment that describes the import that caused the bug is how the next reader learns the wrong lesson.
- **`fixed` (QA) — the SUBJECT side of the widening had no scenario.** `isDependTarget` at the `depends-blocked-in-progress` gate (`:238`) also means an in-progress PARENTLESS STORY is judged for working ahead. Pinned: `doctor/104/coherence an in-progress PARENTLESS STORY whose dependency is unfinished is depends-blocked`, anchored on the story's own `STORY.md`.
- **`recorded` (architect) — a parentless story's OWN `depends` is still read by nobody, and the two engines now disagree about it.** `validate`'s 3a (`src/work.mjs:1167`) and its cycle graph (`:1091`) are both gated on `isDriver`, and the story branch beside them (3a-bis) requires `parent != null` — so five real edges are validated by nothing: `102 → [53, 78]`, `79 → [52]`, `81 → [54]`, `86 → [84]`, `87 → [55]`. A typo in any of them is silent. Widening `:238` here made doctor read those edges as a subject while validate still does not — a new asymmetry, in the opposite direction to the one this chore closed. NOT fixed here: it is a different question from the one this Definition of Done bounds (what a number may NAME), and it widens the stream-wide `validate` gate, which is the operator's call. Measured harmless today — all five targets resolve over `isDependTarget`, and doctor reports no `depends-blocked-in-progress` on the real stream.
- **`recorded` (architect) — the spine's `isDriver` export now has no importer.** Both lanes moved to `isDependTarget`, so `src/work-doctor.mjs:89` is a mirror of `work.mjs`'s predicate that nothing consumes. Left standing on purpose: DoD 4 fences `isDriver` as unchanged, and the doctor family has no other home for the phase question. Worth a decision, not a silent deletion.
- **Unchanged by this chore (the Intent's own note):** `driverStatusByNumber.get(N)` being `undefined` because N is not done and because N is not in the index still render identically. The index is no longer a CAUSE of the second — that was this chore's job — but the two facts are still one message.
