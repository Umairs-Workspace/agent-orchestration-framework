
# 04 · The answer reaches the session — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### One verb answers a waiting ask
`aof work answer <ref> "<text>" [--as <actor>] [--json]` (`work:answer`, in `src/commands/resume.mjs`) answers the latest waiting or parked ask on the item. It writes through the ask file for a local lane or primary drive. It records the answer verbatim with `by: { actor, via, node }` and `answeredAt`, and fires `session-answered`, whose `elapsedMs` is the wait. `--as` is at most 80 code points, with no control characters.

### A mesh worker's ask is answerable through `mesh:terminal-resume`
For a worker's `needs-input` assignment, the verb sends `answer: { text, by, askedAt }` on `mesh:terminal-resume` through the control router. The worker types it into the resumed session, and `park-resume.mjs` records it. A worker-refused resume answers `terminal-resume-not-started` (409).

### The board answers through the same verb
`POST /api/work/answer` runs `work:answer` in-process. Every board write route passes one hoisted `admitWriteRequest` before its body is read (FF-13109). A non-object body answers `invalid-body` (400) on every write route, and a non-POST to a write path answers 405.

### One loopback predicate guards both write faces
`isLoopbackHost` in `src/static-serve.mjs` refuses a write whose `Host` is not loopback with `non-loopback-host` (403), on the board and on the fleet alike.

### The resume sweep names a run waiting on an answer
`work:resume`'s sweep renders a waiting run as a `NEEDS YOUR ANSWER` row carrying its answer command.

## Assumptions

- **The operator is the only answerer** — there is no `/aof:answer` bundle wrapper, so a driven session never answers its own question.
- **A worker's question stays on the worker** — the verb answers a mesh ask, but the control never reads its question (ratified in STATE; a follow-up item).

## Gaps

### Board GET routes under DNS rebinding
- **Status:** open
- **Discharge condition:** a board threat model rules on read confidentiality and the GET routes carry the same `Host` check, or it is ruled acceptable (`m131/F-131-08`).
The loopback-`Host` check guards writes only, so a rebinding page can still read the board's GET routes.
