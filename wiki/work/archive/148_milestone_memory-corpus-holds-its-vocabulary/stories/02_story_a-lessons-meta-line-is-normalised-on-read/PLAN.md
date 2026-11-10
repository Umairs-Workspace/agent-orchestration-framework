# 02 · A lesson's meta line is normalised on read — build plan

## Mechanism

Lift, don't copy. `parseRetrospective` (`local-indexing.mjs:148-193`) holds the `R<n>` section
split and an inline meta-line loop. Move both into `packages/work/src/memory-vocabulary.mjs`, beside
the enums and two normalisers: `normaliseField(field, raw)` returns `{ value, tag }`, and
`normaliseGapStatus(raw)` does the same over the gap statuses. Then re-point the parser at the
module. The section split keeps using `declared-id`'s `headingSplitRe("R")` and
`headingCaptureRe("R")`, so the heading grammar keeps its one home (FF-6604 scans for a
re-spelling). Export it from `packages/work/package.json` the way `./declared-id` is exported.

The parser then sets `kind`, `area` and `stage` from the normalised values, `tags` from their tags
in that order, and leaves `owner`, `title`, `summary` and `text` as they are. `extractGapParts`
(`:348-363`) runs the status through `normaliseGapStatus`. Every other parser (ARCHITECTURE, AOF,
OUTCOME capability) emits `tags: []`. `tags` joins `MEMORY_RECORD_FIELDS`, and both index versions
go to 2. Recall over a version-1 store (records with no `tags`) must not fail. Both backends' `status` already read the
store, so each adds `index: { version, current, stale }` from it (nested, never a top-level number),
and the status text adds a stale line naming `aof work memory ingest`.

## Verification step

1. Build records in memory from the real `wiki/work` (`buildRecords(null, ctx)`, isolated
   `AOF_GLOBAL_HOME`), and tally Kind, Area, Stage and gap status. Exact-enum counts rise by the
   number of normalised values, blanks stay about 90, and no lesson's `text` differs from a build
   at `HEAD` (diff the `text` arrays).
2. `aof work memory recall "adding a new record kind every consumer" --json` from a source-run CLI
   shows m40/R3 with `kind: "near-miss"` and `tags: ["cross-milestone, discovered here"]`.
3. FF-14801 (story 01) stays green. If 01 has not landed, step 1's `text` diff is the evidence.

## Out of scope

- Validate and doctor findings (story 04), and the `status` counts (story 05).
- Reading story retrospectives (story 03). This story changes no reading of which files are read.
- Any synonym table, unless Q1 rules one in.

## Known traps

- `splitSections` is shared by the AOF and OUTCOME parsers. Lift only the `R` use, not the helper.
- `inlineField` swallows a following field when there is no blank line. The meta reader must stop
  at the end of each meta line, as today's loop does.
- The tune corpus derives section ends from each lesson's `source` line. Keep `source` exactly as
  it is.
