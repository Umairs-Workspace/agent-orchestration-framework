---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 136 · Discovery questions in the loop — State

## Progress

- [x] broken down at refine, 2026-10-03: two stories in one wave (ARCHITECTURE ADR-003)
- [x] 01 a loop answer anchors the example — built and reviewed 2026-10-03 (solo), in-review
- [x] 02 a driven refine asks through the loop — built and reviewed 2026-10-03 (solo), in-review

## Notes & decisions in flight

- **Framed 2026-09-23** by `aof:shatter` from
  `wiki/planning/research/RESEARCH-specification-by-example.md`, the third of three drivers. It is
  kept apart from 134 so that interactive discovery ships without waiting for 131.
- **Small by design.** If 131's refine shows its ask path already carries everything this needs, 136
  may reduce to one story. Refine decides that, not this framing.
- **Refined 2026-10-03 (`aof:refine 136 --autonomous`, solo).** 131 already carries a driven
  `AskUserQuestion` to the operator, waits in that lane and resumes the session with the answer;
  the missing link is that the answer never reaches 134's collector. Two stories, not one: the
  reader (code) and the ask (prose) have no shared file. Default decisions taken, all technical:
  - one token per ask in a driven session, so a cascade asks its questions one after another
    (ADR-002 §2);
  - a question carrying two tokens anchors neither (ADR-001 §2);
  - the ask's answer is read where 131 wrote it and never stamped a second time (ADR-001 §4).
- **SPEC drift, noted not edited.** The SPEC puts answering from Discord out of scope because 131
  deferred it; 131 later shipped answer-by-reply (131/09–12). Whether that answer may confirm an
  example is asked as 136/01 Q1, not assumed.
- **136/01 Q1 answered 2026-10-03 by the operator at the end review: all three channels count**
  (terminal, board, an allowlisted Discord reply). ADR-001 §5 records it; E6 and E7 are `stated Q1`.
- **Graph:** built 2026-10-03T17:18:10Z, code only, no egress. `refine.md` is not covered (prose).
- **Continued 2026-10-03 (`aof:continue 136`, solo by the operator's choice).** Built on a local
  branch `136-discovery-questions-in-the-loop` stacked on `134-discovery-example-map` (136 depends
  on 134, which is not on main yet). One wave, both stories inline, review lenses played in this
  session; no Blocker in either story, so one round each.

## Feedback (for retro)

- **FF-11903 is red, and not by 136.** 01's importer sweep ran
  `test/arch/command/acd-cited-path-resolves.test.mjs`: 348 unresolved `src/` citations under
  `wiki/work/**` against a ceiling of 55, mostly archived 142 plans, and its rename probe expects
  `packages/core/src/command-error.mjs` where it now answers `packages/contracts/src/error.mjs`.
  136 adds no unresolved citation. The milestone gate at verify will meet it.
- **02's `files:` omits `.aof/aof.lock.json`.** `aof work update` rewrites the lock with every
  rendered copy's hash, so a story that changes bundle prose writes it. Committed with 02, as 134/05
  and 135/05 did. Recorded finding.
- **01's build brief asked for FF-13601's red probes in `VERIFICATION.md`.** The probes are
  self-checking cases in the arch suite (a second reader in `doctor-lane.mjs`, three token
  patterns, a read outside the helper); `VERIFICATION.md` is verify's to write.

## Verification

- [ ] `@executable` suite green
- [ ] `@manual` signed off: one live loop-driven discovery question, answered
