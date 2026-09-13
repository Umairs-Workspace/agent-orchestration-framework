---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 48 · Routable session identity — State

## Progress

**ACCEPTED 2026-08-11** (`aof:verify 48`) — compacted at accept. All four stories `done`, `SPEC.md`
`done`.

- **Framed 2026-08-02** (`aof:shatter wiki/planning/PRD-web-ui-restructure.md`).
- **Refined 2026-08-10** (`aof:refine 48 --autonomous`) — six blocking unknowns measured
  ([RESEARCH.md](RESEARCH.md)), nine ADRs decided, four stories partitioned (ADR-008), every contract
  authored.
- **Built 2026-08-11** (`aof:continue 48`) — 00 and 01 in parallel, then 02 and 03. Two mid-build
  rulings became ADRs rather than prose: **ADR-010** (the five routed design gaps, settled before any
  code was typed) and **ADR-011** (the id-length finding). Reviewed by architect (structural) and QA
  (behavioural), both PASS WITH FINDINGS; every confirmed finding fixed and re-verified, with three
  review rulings recorded as **ADR-013 (R12–R14)**.
- **Verified + accepted 2026-08-11** (`aof:verify 48`) — 190 pass / 0 fail across all 28 m48 and
  adjacent suites, `cargo test -p mesh-desktop-core` 80/0, `aof work validate 48` PASS. Two findings,
  both closed. Evidence and the accept decision: [VERIFICATION.md](VERIFICATION.md). Lessons:
  [RETROSPECTIVE.md](RETROSPECTIVE.md). What the milestone leaves behind: [OUTCOME.md](OUTCOME.md).

## Notes & decisions in flight

Everything durable from this milestone's run has graduated. The blow-by-blow — the per-story build
records, the measured RED-suite enumeration, the mid-build design-gap settlements, the two
session-limit recoveries — is archived; what it established lives in
[ARCHITECTURE.md](ARCHITECTURE.md) (ADR-001…014) and its fitness functions, and the process lessons in
[RETROSPECTIVE.md](RETROSPECTIVE.md) R1–R7.

Three facts outlive the milestone and are worth carrying:

- **This milestone is the arc's real critical path.** 49 (the grid) and 50 (the launcher) both wait on
  the wire and index delivered here. Neither needs a second session authority: the record, the wire and
  the index are one derivation chain (ADR-003/007).
- **`acd-no-new-silent-catch` is RED at HEAD on `src/board-worker-stream.mjs`, and it is not m48's** —
  the file is untouched at HEAD (last commit `eacbd57`, m43). Carried by
  [TECH_DEBT](../TECH_DEBT.md) item 27, row 1. m48 deliberately did not re-baseline it.
- **The uncommitted tree was shared with another session building m47.** `ui/src/fleet/*`, `scope.mjs`
  and several test-support files carry that work. m48 must be committed by **explicit pathspec** —
  never `git add -A`.

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite + all ten fitness functions green — **190 pass / 0 fail**
      ([VERIFICATION.md](VERIFICATION.md) §Verification evidence).
- [x] Cross-language (Rust) surface green — **80 pass / 0 fail**, against four producer-fed captured
      payloads including the new one that exercises `workspaceHasRun: true` on a real deployed fleet.
- [x] `@manual` / `@uat` — **N/A, measured.** Zero of each in this milestone; all eight task features
      are `@executable`. No `UAT.md` owed.
- [x] **The human gate is DISCHARGED.** `acd-captured-producer-fixture` was red by design until the
      post-m48 build was deployed, the supervisor restarted, and the captured payloads re-taken from
      the real producer — never hand-edited ([VERIFICATION.md](VERIFICATION.md) F-48-1).
- [x] `aof work validate 48` — PASS.
