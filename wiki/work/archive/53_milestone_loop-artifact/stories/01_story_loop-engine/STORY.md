---
type: story
number: 01
slug: loop-engine
title: "The loop engine — every decision the shell makes, as a pure function"
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
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · The loop engine

## User story

As an **operator whose overnight run has to be trustworthy**, I want the loop's caps, stop
conditions, phase dispatch and autonomy levels computed by **code that cannot skip an instruction**,
so that "it stops at three attempts" and "L3 is unavailable" are facts a test can prove rather than
sentences a model may ignore.

## Context

`src/work-loop.mjs` (new): a **pure leaf** — no `node:fs`, no `node:child_process`, no clock, no
dynamic import, zero source imports in either direction. Every export is `(plain data) => decision`.
It decides; it never executes. That is what lets this story be built and tested against literal
fixture inputs, concurrently with 53/00 and 53/03.

The milestone's opening sentence is the reason this module exists: aof's build-loop cap *"is
unenforceable: it is an instruction a model may skip."* RESEARCH §Q7 confirmed it at the source —
`autonomous.md`'s stop conditions and phase mapper are prose, and there is no code path that stops a
model mid-turn. Five frozen vocabularies move that from prose into a decidable function:

**The scope guard exists because `nextWork` fails open.** RESEARCH §Q3 measured it: passing `18/02`
to `nextWork` matches *every* driver silently (`src/work.mjs:847-860`). A loop handed `53/02` would
cheerfully start driving milestone 12. `LOOP_SCOPE_FORMS` admits two forms and refuses everything
else out loud, and the refusal names `aof work drive <phase> <ref>` as the way to drive one story.

**Every stop names its producer.** A stop the shell *decides* would be product judgment; a stop it
*reports* because a store or a driver returned a code is deterministic control. That is why the two
`autonomous.md` conditions that are genuinely model judgments — an infeasible scenario, an open
decision — are deliberately **absent** from the set and arrive instead as `session-needs-input`.

**The phase map is dispatch, not phase logic.** It is transcribed from `autonomous.md:60-81` without
addition. `spike`/`chore` halt rather than guess: the prose mapper never covered them, and a shell
that invents a phase for an unmapped type is the shell encoding judgment.

ADR references: 53/ADR-003 (scope), 53/ADR-004 (the `brief.loop` envelope, resumed-not-restored),
53/ADR-005 §4–§6 (stops, phase map, gate order), 53/ADR-006 (the levels and the L3 lock).

## Acceptance

- **`LOOP_SCOPE_FORMS`** is exactly the two frozen forms — `driver` (`^\d+$`) and `range`
  (`^\d+-\d+$`). Every other scope — a story ref, a slug, an empty string — decides
  `loop-scope-unsupported`, carrying both admitted forms, the reason, and the `aof work drive`
  alternative. The refusal is decided **before** anything could be spawned, minted or written.
- **`LOOP_LEVELS`** is exactly `["L1","L2"]` and **`LOCKED_LOOP_LEVELS`** has exactly the key `L3`
  with `unlockedBy: 55` and its reason. `--level L3` decides `loop-level-locked` naming milestone 55;
  an unrecognised level decides `loop-level-unknown`. L2 is the default when no level is given — a
  silent downgrade to L1 would surprise every existing `/aof:autonomous` caller.
- **`LOOP_STOPS`** is the closed eight-member set of ADR-005 §4, and every stop the engine decides
  carries a `producer` drawn from a **code or a fact**, never a message match. The two model
  judgments named in ADR-005 §4 are absent by construction. `work:next` answering `state: "held"`
  maps onto the existing **`dependency-blocked`**, carrying `skipped` verbatim — no ninth stop
  (ADR-010 §4).
- **`LOOP_REFUSALS`** is a SECOND frozen exported set beside it, four members —
  `loop-scope-unsupported`, `loop-level-locked`, `loop-level-unknown`, `loop-bound-unresolved` —
  because a stop is a loop that ran and stopped and a refusal is a loop that never started
  (ADR-010 §5/§10a). The store-refusal map is its own pure function with codomain
  `LOOP_STOPS ∪ {null}`; `null` means "re-ask `work:next`", and `act` stays closed at exactly
  `drive | gate | halt | done` (ADR-010 §10b).
- **The phase map** decides `drive refine` / `drive continue` / `drive verify` / `gate` / `halt` /
  `done` exactly as the frozen table in ADR-005 §5 reads — including `halt uat-gate` for a ready
  `uat` item and for a story whose tasks report `counts.uat > 0`, and `halt unmapped-item-type` for
  `spike`/`chore`. The `hasTasks` and `@uat` predicates arrive as **inputs**, sourced by the caller
  from the one registered command `work:tasks` — this module parses no feature file and reads no
  doctor internal.
- **`GATE_ORDER`** is frozen: `drive continue` → `validate` (deterministic, no model) → on findings,
  re-`drive continue` up to `cap` → `drive verify`. The engine **reads** the cap; it never chooses a
  value or supplies a default of its own (ADR-009 §1).
- **The `brief.loop` envelope shape** is frozen at the seven keys of ADR-004 §2, and the resume
  declaration reader implements *resumed, not restored*: it recovers `{loopRunId, scope, level, cap,
  startedAt}` from the most recent declaration, an explicit `--level`/`--cap` on the resume
  invocation **wins**, an absent one inherits, and **no position is ever read or written** — where
  the loop is gets re-derived from `work:next`.
- **Purity is provable.** The same inputs decide byte-identical outputs on repeated invocation and
  in a fresh process. No `Date.now()`, no `new Date()`, no filesystem, no dynamic import, and **no
  import of `src/agent-session-driver.mjs` in either direction** — the driver's
  `{outcome: done|failed|needs-input}` vocabulary arrives as frozen input data, which is exactly what
  keeps this story parallel with 53/00.
- **The story's evidence lands WITH the story, registered.** Seven new suites under this story's
  frozen name family — `test/work-loop-{scope-guard,level-ladder,phase-map,stop-set,gate-order,declaration,determinism}.test.mjs`
  — **imported AND spread** in `scripts/test.mjs` inside this story's own labelled
  `// milestone 53 / story 01` block, in the same diff as the module they mechanise. Because the
  engine is pure, this is the cheapest evidence in the milestone; there is no excuse for it arriving
  later, and a story accepted on evidence the runner never invokes is TECH_DEBT item 48 exactly
  (ADR-011 §1).

## Tasks

- [x] [00 — two admitted scope forms, and a coded refusal for every other shape](tasks/00_scope-guard.feature)
- [x] [01 — L1 and L2 admitted, L3 refused by name, and no silent downgrade](tasks/01_level-ladder.feature)
- [x] [02 — the frozen phase map, dispatching `work:next`'s answer to one prompt](tasks/02_phase-map.feature)
- [x] [03 — the closed eight stops, each carrying the code or fact that produced it](tasks/03_stop-set.feature)
- [x] [04 — the gate before any model turn, and a cap the engine reads but never chooses](tasks/04_gate-order-and-cap.feature)
- [x] [05 — the frozen `brief.loop` declaration and a resume that recovers no position](tasks/05_declaration-and-resume.feature)
- [x] [06 — the same input decides the same output, in any process and any tree](tasks/06_same-input-same-decision.feature)

## Notes

`spike`/`chore` halting is a **documented default, flagged for the operator** (milestone STATE):
mapping them to `continue` is probably right and is exactly the kind of "probably" that ships a
silently-wrong dispatch. The fix, when someone measures it, is one row in a frozen table.
