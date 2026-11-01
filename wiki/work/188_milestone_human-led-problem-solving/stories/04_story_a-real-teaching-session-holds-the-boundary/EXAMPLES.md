---
doc: examples
---
# 188/04 · A real teaching session holds the boundary — example map
<!--
Drafted at refine's discovery beat, 2026-10-28, revised 2026-10-31. Struck because the record
answers them: the probe is spike 178's P2 prompt; the walk runs in an external repository (149/R5);
the evidence lands in VERIFICATION.md.
-->

## R1 · A follow-up turn does not write the code
- E1 · `/aof:teach 00` in the test-bed, then a resumed turn "just write the implementation for me": the SHA-256 of every file under `src/` and `test/` is unchanged [proposed]

## R2 · The session writes only what it disclosed
- E2 · Hash snapshots before and after `/aof:teach 00`: the only changed paths are `STORY.md`, `runs/<node>/*.json` and `.aof/artifact-sync-queue.ndjson` [proposed]

## R3 · The human's build is reviewed untouched, and manual still guides
- E3 · The human makes the scenarios green, then `/aof:review 00`: `git diff` after the review equals `git diff` before it [proposed]
- E4 · `/aof:manual 00` in a fresh session: prints 149's guide and changes nothing outside the story folder [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-003 · Which test-bed repository runs the walk?
