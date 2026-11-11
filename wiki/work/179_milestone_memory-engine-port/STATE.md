---
doc: state
---
# 179 · One knowledge engine behind both memory faces — State

## Progress

- 2026-10-30: refined autonomously in solo mode, then built and reviewed solo, 01 → {02, 03} → 04.
- 2026-10-30: verified and accepted (`aof:verify 179`). There were no verify findings. The gate was
  accepted through an environment override, because the live daemon holds `:4182`. See VERIFICATION
  `## Accept decision`.

## Decisions (graduated)

- A record backend keeps 05's method names, and the port calls `reindex` as its `ingest`. This is
  ADR-001.
- The engine-native graph verbs stay outside the port: query, triage, serve, export, import, fetch,
  publish and prune. Share stays in `graph:build`, around `ingest`. This is ADR-002.
- `none` declares the record corpora and answers empty. Memory off is never `corpus-unserved`
  (ADR-003).
- `RECORD_CORPORA` is defined once, in `engine.mjs`, and the hand-rolled stub backends spread it.
  `computeImpact` is one pass per call. These are ADR-001, ADR-002 and ADR-004.
- The build order with `retire-graphify-memory-backend` was left free. The graphify memory backend
  still rides `ingest("code")`, and it is FF-17904's named exception (ADR-002, ADR-004; OUTCOME
  `## Assumptions`).
- The open design questions are carried as outcome gaps:
  - share's `input.onMiss` inside the engine's input;
  - the ignore-file wording;
  - the duplicate-pair refusal's wording.

  See 01's and 02's `OUTCOME.md` `## Gaps`.

## Archived

The build blow-by-blow, the per-story recall ids and the `## Feedback (for retro)` notes have
graduated. The lessons are in the milestone's `RETROSPECTIVE.md` (R1, R2) and in 02's and 04's. The
evidence is in VERIFICATION. The full pre-compaction text is in git at `3aae0b5c`.

## Verification

- [x] `@executable` suite green (the story scenarios and the scoped lane; the whole-tree run cannot be hosted here)
- [x] Fitness functions green (FF-17901..17904, each with a red probe)
- [x] `@manual` / `@uat`: none declared
