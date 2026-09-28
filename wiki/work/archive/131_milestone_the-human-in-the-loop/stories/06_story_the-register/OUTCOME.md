
# 06 · The register — Outcome

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

### Nine resolved controls over the human-in-the-loop seams
FF-13101…FF-13109 are arch-tests in three files under `test/arch/loop/`: `acd-loop-ask-single-home`, `acd-loop-ask-waits-in-place` and `acd-loop-ask-reaches-every-face`. They are registered by import and spread in `test/arch/loop/index.mjs`, and the `test/arch/loop` budget row is 65. `ARCHITECTURE.md` carries no `pending — 131/06` marker, and `aof work doctor 131` reports no `control-unresolved`.

### Every control has been seen red
Each control's named mutation reds exactly that control, and each is recorded in `VERIFICATION.md`'s register. The non-vacuity needles of FF-13101 and FF-13107 red when misspelled.

### FF-13106 reds upstream of the redaction backstop
FF-13106 carries a structural degrade-message leg, so a URL placed in a degrade message reds even though `degrade()`'s redaction would strip it from the fixture's output.

## Assumptions

- **The sweeps read `src/` as text** — each control resolves specifiers through `test/support/module-family.mjs` and strips comments, so a site spelled through an alias the family does not resolve is out of its reach.
