---
doc: state
---
# 180 · One memory node in the config — State

## Progress

- 2026-10-30 · Refined (`aof:refine 180 --autonomous`, solo). ARCHITECTURE ADR-001..006 and DESIGN
  Surface 1 written. Three stories: 01 is wave 1; 02 and 03 are wave 2 and run in parallel. All
  three contracts are authored. 02's was authored after `180/02 Q1` was answered at the review.
- 2026-10-30 · Built and reviewed (`aof:continue 180`, solo). 01, then 02 and 03 inline, all
  `in-review`. Every `@executable` scenario is green. The gate ladder is clean on each story, and
  each story's review lenses ran in this session (no Blocker survived). Left for `aof:verify`: 01's
  docs scenario and 02's init-asset scenario (both `@manual`, checked by grep at build), 03's DESIGN
  conformance (INCONCLUSIVE, no render), and the two controls' red probes for VERIFICATION.
- 2026-10-30 · Verified and accepted (`aof:verify 180`). F-02 was fixed at verify (`c8a236e3`), and
  F-01 is open as a non-blocker. The gate was accepted through an environment override, because the
  live daemon holds `:4182`. See VERIFICATION `## Accept decision`.

## Decisions (graduated)

- One `memory` node, read in one module, `memory-config.mjs`. The selection keeps its single read
  in the memory seam. This is ADR-001 and FF-18001.
- `corpora` absent means `work`, `imports` and `code`, and only `operator` is optional (ADR-002,
  D2). The SPEC's `planning` premise was wrong, because 178 chose link-following, so the migration
  carries `claude-auto-memory` alone (D1).
- `graph` moves under `memory`, unchanged in meaning, and the never-shared rule is scoped to the
  code corpus (ADR-003).
- Per-engine settings sit in `backends.<name>`, and each block is validated whether or not its
  engine is active (ADR-004). B1 put the extractor names in `memory-config.mjs`. B2 added one code,
  `invalid-memory-backends`.
- Egress is never a key (ADR-005, D3), and init's default backend is `local`, the operator's answer
  to `180/02 Q1`.
- `aof work update` fills and never re-authors. An unparsable config still fails the real run, and
  the dry run tolerates one (ADR-006, D9). Only the project config is migrated (D5).
- The editor never writes a legacy key (`memory-config-legacy-write`, D8). The swap that drops the
  root `graph` lives in `replaceMemoryNode`.
- The legacy read is bounded at one release (TECH_DEBT item 93, D4). Doctor shows it as a
  `memory-config-legacy` row (B4).
- Carried: D6's note for `retire-graphify-memory-backend`. If 180 lands first, that item drops
  `memory.backends.graphify` and the legacy spelling through `LEGACY_MEMORY_KEYS`. Also carried:
  this repository's own config, which is migrated by one `aof work update` after `install-local`
  and a restart (OUTCOME `## Gaps`).

## Archived

The build blow-by-blow (B1–B6 detail), the per-story recall ids and the `## Feedback (for retro)`
notes have graduated. The lessons are in the milestone's `RETROSPECTIVE.md` (R1–R4) and in each
story's (01/R1, 02/R1, 03/R1). The evidence is in VERIFICATION. The full pre-compaction text is in
git at `c8a236e3`.

## Verification

- [x] `@executable` suite green (the stories' scenarios; the whole-tree-wide lanes red only on reds recorded before 180, with F-02 fixed)
- [x] Fitness functions green (FF-18001, FF-18002, each with a red probe in VERIFICATION)
- [x] `@manual`: 01's documentation scenario and 02's init asset pass. 03's DESIGN conformance is INCONCLUSIVE (F-01, non-blocker)
