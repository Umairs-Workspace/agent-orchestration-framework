---
doc: retrospective
updated: 2026-10-06
---
# 02 · A lesson's meta line is normalised on read — Retrospective

The build ran solo, and review passed with one architect note (indexing now imports one retrieval
helper, which is accepted). Two lessons, both about the `files:` census.

## R1 — A record-shape change moved pins in twelve suites that `files:` did not name

- **Kind:** mistake (recurring) · **Area:** contract · **Stage:** refine · **Owner:** architect, product-owner · **Raised by:** developer
- **What happened:** `files:` missed six paths: the knowledge-side parser suite and its index, `packages/work/test/index.mjs`, FF-14802's test and its index, and `.aof/aof.lock.json` for the OUTCOME template's hash. The importer sweep then moved pins on the old record shape in 12 suites: 13 fields to 14, `tags` an array, version 1 to 2, m01's stage `build→verify` to `build` plus a tag, the work-memory JSON goldens, and the `knowledge` import allow-list.
- **Why:** Refine counted the files the new code lives in, not the suites pinned to the shape it changes. Adding a field to `MEMORY_RECORD_FIELDS` and bumping `INDEX_VERSION` touches every golden over a record, and a grep for those two names finds them.
- **Lesson:** When a story changes a frozen shape (a field list, a version constant, a JSON golden), refine greps for every test that names it and puts those tests in `files:`, along with the lock file for any template it edits. This is the class that 126/R2 and 127/R3 name.
- **Refs:** m126/R2 · m127/R3 · m141/R1

## R2 — `files:` named a suite that was never written

- **Kind:** mistake · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** verifier
- **What happened:** `files:` declared `packages/knowledge/test/lesson-meta-normalised.suite.mjs`. The build wrote `memory-meta-normalised.suite.mjs` and added the real path to its notes, but left the declared one unchanged. Verify corrected it.
- **Why:** Nothing checks that a declared `files:` path exists once the story is built, so a renamed file leaves a stale declaration that validate passes.
- **Lesson:** When a build renames a declared file, it edits the `files:` entry in the same change. Before review, check every `files:` path with `ls`.
- **Refs:** m148/F-148-02
