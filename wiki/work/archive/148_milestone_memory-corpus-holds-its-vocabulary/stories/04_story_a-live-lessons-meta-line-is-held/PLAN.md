# 04 · A live lesson's meta line is held — build plan

## Mechanism

One pure function decides conformance per lesson. Add `lessonMetaProblems(text)` to story 02's
`memory-vocabulary.mjs`, composed from 02's section reader and normalisers: it returns, per lesson,
the fields that fail after normalisation. Both new callers use it, so neither spells the
rule.

- **validate** (`packages/work/src/commands/validate.mjs`): after the core findings, for each row
  where `isLiveStreamRow(row)` is true (resolve a nested story through its parent's liveness), read
  `RETROSPECTIVE.md` when present, and add one finding per failing field:
  `R2 Kind "risk" is not one of mistake | blocker | near-miss | misunderstanding — a qualifier goes
  after the word, as "near-miss (risk)"`. Scope follows the command's existing `itemInScope`.
- **doctor**: a new lane module, `doctor/lesson-meta.mjs`, exporting `LESSON_META_FINDING_CODES =
  Object.freeze(["lesson-meta-archived"])` and a pure group over archived rows: one `warn` per file
  with any failing lesson, naming the count and the ids. Register it in `CHECK_GROUPS`. If the
  snapshot carries no doc text, read it the way the other text-reading lanes do.

## Verification step

1. `aof work validate` (source-run, from the repository root) passes over the live tree after the
   re-classification, and fails, naming the lesson, if one fixed line is reverted.
2. `aof work doctor --json` shows `lesson-meta-archived` warnings for archived files only (about
   95 on 2026-10-04), and none for a live file.
3. 124/FF-12402, the advisory-lane control, is green with the new lane registered.

## Out of scope

- Rewriting any archived retrospective. Never back-filled.
- Promotion and recurrence fields (`memory-closes-the-loop`).
- Gap status in OUTCOME. Story 02 normalises it, and no rule holds it here.

## Known traps

- Every `aof work validate` run in a lane reads the whole tree. Re-classify before landing the rule,
  or the lane's own gate goes red on the inherited lessons.
- The prompt has rendered copies under `.claude`, `.opencode` and `.codex`. Change the asset, then
  re-render.
- FF-14802 compares the prompt's Kind, Area and Stage lists with the module's enums. A sentence
  added to the prompt must not re-list the vocabulary differently.
