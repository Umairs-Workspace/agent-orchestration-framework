# 105 · Outcome Md Is Not In The Streamed Requestable Artifact Set So The Mesh Cache Can Never Answer For It — Outcome

## Delivered

### `OUTCOME.md` is a streamed and requestable artifact
`WORK_ITEM_ARTIFACTS` carries `{ name: "OUTCOME", file: "OUTCOME.md" }` between `VERIFICATION` and
`RETROSPECTIVE` (`src/work-artifacts.mjs:41`), so a worker streams a built worktree's `OUTCOME.md`
alongside its other records and `work:doc OUTCOME` resolves a document that exists on disk instead
of refusing it as a coded `invalid-doc`.

### The derived view widened without an edit
`WORK_ITEM_DOC_FILES` names nine documents from that one definition rather than a second literal
list, and all seven cases of `acd-work-artifact-set-single-home` — including ADR-013/C9's clause
that the derived view EQUALS the manifest's file-kind entries in manifest order — pass untouched.

### The drain suite is sized off the manifest, not off a copy of it
`test/artifact-sync-drain.test.mjs` derives its seed and both of its counts from the fixture's
`RECORD_DOCS`, which derives from the manifest, so a suite that was self-consistently green while
asserting over a smaller set than the code streams now reds when the two diverge.

## Assumptions

- **A worker streams only its ACTIVE worktree** — the entry makes `OUTCOME.md` streamable, not
  present: a story's records reach the cache while that story is being built and not otherwise, so
  the doctor's cache-answered count for a done story's `OUTCOME.md` stays 0 of 286, now bounded
  operationally rather than structurally (`RETROSPECTIVE.md`, which has been in the manifest since
  43, is the control and scores identically).

## Gaps

### The `story-record-missing` justification comment still says the name is absent from the manifest
- **Status:** open
- **Discharge condition:** chore `104`'s lane closes on `src/work-doctor-coherence.mjs` and the one
  stale clause is corrected in both places.
`src/work-doctor-coherence.mjs` and the mirroring comment in
`test/delivered-story-records-reported.test.mjs` justify departing from `43/06`'s R6.1 cache
suppression with "`OUTCOME.md` is not in `WORK_ITEM_ARTIFACTS` at all". Half of that sentence is now
false. The departure itself still stands on its measured half — suppressing on `degraded()` would
silence the backlog the check exists to report — and neither the check's behaviour nor its
measurement changed.
