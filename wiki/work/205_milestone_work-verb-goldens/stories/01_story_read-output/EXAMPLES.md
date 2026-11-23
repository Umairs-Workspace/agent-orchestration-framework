# 205/01 · Read verbs preserve their JSON and terminal output — example map

## R1 · The read verbs keep their two output formats and exit codes
- E1 · An unknown find query returns an empty JSON array at exit 0 and prints the text miss at exit 1 [proposed]
- E2 · Listing includes backlog queued, adds archived 30 with --all, and preserves parent 10 for both nested story rows [proposed]
- E3 · The missing OUTCOME for 10/00 reports absence in both formats and returns exit 0 [proposed]

## R2 · Readiness distinguishes a ready story from unsatisfied dependencies
- E4 · In scope 10, only 10/00 is in the ready wave [proposed]
- E5 · In scope 10/01, the blocked answer names 10/00, and in scope 13 it names 12 [proposed]

## R3 · Validation and stream diagnostics retain each finding and exit
- E6 · A dated, well-formed chore 11 validates cleanly, while its two missing dates produce two findings [proposed]
- E7 · Two live drivers numbered 11 cause doctor to report duplicate-driver-number and exit 1 [proposed]
- E8 · A warning-only doctor run reports the same findings under --strict, where it exits 1 [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-002 · Which doctor inputs belong in the stream fixture and when does a warning change the exit?
