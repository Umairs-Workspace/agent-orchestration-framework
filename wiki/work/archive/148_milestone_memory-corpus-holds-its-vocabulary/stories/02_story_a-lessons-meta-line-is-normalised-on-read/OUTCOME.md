# 02 · A lesson's meta line is normalised on read — Outcome

## Delivered

### One home for the memory vocabulary
`@aof/work/memory-vocabulary` (`packages/work/src/memory-vocabulary.mjs`) is the only source that spells the meta-label grammar, the Kind, Area and Stage enums and the three gap statuses. FF-14802 holds that, and holds the retrospective prompt's lists and the OUTCOME template's status comment to the same words.

### Meta values normalised on read
The one retrospective parser indexes a lesson's Kind, Area and Stage, and a gap's status, as the vocabulary word the written value starts with, and keeps the rest as a tag. A value outside the vocabulary is indexed as written, and a blank stays blank. Title, summary and text are unchanged. On the live corpus (489 lessons) non-enum Kind falls from 65 to 53, Stage from 88 to 15, and gap status from 12 spellings to 3.

- **No synonym table** — a value that does not start with a vocabulary word is never mapped onto one (148/02 Q1, 2026-10-04).

### Every record carries tags
Every `MemoryRecord` has a `tags` array (`[]` when there is none) holding the qualifiers stripped from kind, area, stage or gap status, in that order. `INDEX_VERSION` and `GRAPHIFY_INDEX_VERSION` are both 2.

### A store built before version 2 is reported stale
Each backend's `status` carries `index: { version, current, stale }`, and a stale store names `aof work memory ingest` as the fix.
