# 117 · The Marker S Ref Is A Placeholder So The Copied Line Still Does Not Run — Outcome

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

### The regeneration line an operator copies out of EXECUTION.md is invokable verbatim
`renderExecutionDocument` spells the `aof-generated` marker as `regenerateCommand(ref)`, so the marker
of a record rendered for item `117` reads `aof work loop-record 117 --write` — the copied line runs as
copied, with nothing left for the operator to substitute.

### All three faces of the spelling name the same runnable command
The marker (`src/loop-record-render.mjs:237`), the sign-off prose (`signoffProse(ref)`,
`src/commands/loop-record.mjs:93`) and the `--json` face's `regenerate` field
(`src/commands/loop-record.mjs:342`) each interpolate the item's own ref through the single
`regenerateCommand(ref)` home; `ref` reaches the sign-off block from `item.ref` at the call site, and
`SIGNOFF_PROSE` is a per-ref function rather than a module-load frozen constant.

### A call carrying no ref degrades to the placeholder rather than to a malformed line
`REGENERATE_REF_PLACEHOLDER` (`<ref>`) survives as `regenerateCommand`'s fallback for an absent or
blank ref, so the well-formedness chore 100 delivered holds for every caller while the ref-carrying
callers get the runnable form.

### The marker's bytes are pinned over the interpolated form
78/01's marker byte assertion is re-pinned as "the generated marker spells the regeneration command
with the ref the verb requires" (`test/loop-record-render.test.mjs`), so a marker that regresses to a
literal `<ref>` for a ref-carrying render turns that suite red.

## Gaps

### The regeneration spelling has a second, unpinned-against-the-first home
`src/work-doctor-loop-record.mjs:260` hand-spells `` `aof work loop-record ${item.ref} --write` `` as
its remedy, and FF-7809 freezes `heading`, `header`, `divider`, `placeholder` and `basename` — not the
regeneration command — so the two copies are held byte-equal by nothing but their separate suites
(`loop-record-render.test.mjs` and `doctor-loop-record-lane.test.mjs`). The copies previously
disagreed visibly (`<ref>` against `${item.ref}`) and now agree, so a future divergence is no longer
self-announcing.
- **Status:** open
- **Discharge condition:** FF-7809 extends its frozen-literal set to the regeneration command, or the
  doctor lane's remedy is derived from a shared spelling that does not create the FF-5202 import edge
  the doctor module forbids.
