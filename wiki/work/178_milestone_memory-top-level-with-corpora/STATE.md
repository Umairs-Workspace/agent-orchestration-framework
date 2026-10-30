---
doc: state
---
# 178 · Memory is its own command — State

## Progress

- 2026-10-29: refined (break-down, then contracts with `--autonomous`), built and reviewed solo,
  01 → {02, 03}.
- 2026-10-30: verified and accepted (`aof:verify 178`). One blocker, F-01, fixed at verify. The gate
  was accepted through an environment override (F-02). See VERIFICATION `## Accept decision`.

## Decisions (graduated)

- The scope was narrowed by the operator on 2026-10-29 to the face, the prompt migration and
  following the existing `origin:` links. There is no planning corpus, no `--corpus`, no MCP
  memory verbs and no Hyperagent recall. These are SPEC §Scope and ADR-001..003.
- Hyperagent planning uses Hyperagent's own knowledge indexing, and its skills got only the spelling
  change (ADR-003). Cowork is covered by `shatter.md`. Whether `aof` resolves in Cowork's shell
  stays 165's question.
- The slug `memory-top-level-with-corpora` was kept. The title carries the narrowed scope.
- Contract amendments made at build: E3/E4 in 01's `EXAMPLES.md` (Q5, Q6), opencode added to the
  work install (02), and a third origin-resolution candidate (03, ADR-002). The six archived SPECs
  naming the moved research file are not repaired (03 OUTCOME, Gaps).
- FF-17802 lives under `test/arch/memory/`, not `test/arch/bundle/`, because of FF-12405 leg 10
  (VERIFICATION `## Fitness functions`).

## Archived

The build blow-by-blow, the per-story recall ids and the `## Feedback (for retro)` notes have
graduated. The lessons are in each story's `RETROSPECTIVE.md` and the milestone's, and the
evidence is in VERIFICATION. The full pre-compaction text is in git at `30b763b4`.

## Verification

- [x] `@executable` suite green (story scenarios; whole-tree reds are environmental, F-02)
- [x] Fitness functions green (FF-17801..17803, each with a red probe)
- [x] `@manual` / `@uat`: none declared
