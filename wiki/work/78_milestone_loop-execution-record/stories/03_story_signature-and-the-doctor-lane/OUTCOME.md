# 03 · The signature and the doctor lane — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. This is an ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — `STORY.md` stays that.
-->

## Delivered

### A sign-off block in a shape a check can read

Every `EXECUTION.md` ends with a frozen block: the `h2` `## Sign-off`, the header row
`| loop | signer | date | verdict |`, and the divider `|---|---|---|---|`. One row per engagement, each
naming its own loop, and the block is emitted even for a document with no engagements. A human
signature in this record is now findable by a program rather than only by a reader.

### The loop id stands alone in the first cell

Following m66/ADR-001's positional rule, a sign-off row's first cell carries the loop id and nothing
else. A first cell carrying prose declares nothing, and both the writer and the checker refuse such a
document rather than reading a signature out of it. The block is deliberately NOT a `REGISTER_BLOCKS`
member and this milestone added no new member to m66's closed `ID_FORMS` set — the five it pinned are
still five.

### Signed means complete

A row is signed only when signer, date and verdict are all filled. A partially filled row is unsigned,
an empty row is unsigned, and the `—` placeholder every freshly written record is full of is unsigned.
A `rejected` verdict is a signature, not an absence.

### Three independent copies of the frozen shape, held byte-equal

The literals live in the writer (`src/commands/loop-record.mjs`), in the checker
(`src/work-doctor-loop-record.mjs`), and a third time in FF-7809's own source. The checker's direct
imports are exactly `["node:path"]`, so the instrument cannot inherit its subject's opinion of the
shape it polices, and it drags neither the registry loader nor the filesystem into a `work-doctor*`
module's import closure. The freeze is round-tripped as well as compared: the block the writer emits is
parsed back by the checker's own parser.

### A doctor lane that reports the record and gates nothing

`loopRecordLane` (`src/work-doctor-loop-record.mjs`) is registered once in `CHECK_GROUPS`, appended
after every lane that existed before it, and emits four codes — `loop-record-unsigned`,
`loop-record-part-signed`, `loop-record-stale`, `loop-record-malformed`. It reads the record when one is
present and never demands one: an item with no record produces no finding.

### Every finding is a warning, structurally

The lane's severity is one module constant and it names no `error` anywhere; it does not consult the
acceptance horizon, so a record on a `done` item reports the same warning it reported while the item
was open. Its four codes are a different frozen array from `CONTROL_FINDING_CODES`, and
`DOCTOR_GATE_CODES` is derived from that array — so no code of this lane can reach the gate ladder even
if one were hardened. No status, validate or acceptor door names the record, its signature or its
codes; the doctor engine reads the record at its one impure edge and renders no verdict about it. An
item carrying an unsigned record moves to `done` and `work:validate` stays green.

### Staleness answered from the runs, not from the document

The lane's staleness check compares the record's engagements against the engagement list projected from
the item's run records — it does not parse the document's own fact lines. An orphaned signed row is not
staleness, a record behind its runs is reported with what is missing named, and with no engagement list
available the lane makes no staleness claim at all.

## Assumptions

- **The lane is handed a snapshot, not a filesystem** — it answers from literal snapshot items with no filesystem present; the record's read happens at the doctor engine's one impure edge, which is why the lane can stay pure while still reporting on a file.
- **The writer and the checker will be edited by different hands at different times** — the three-copy freeze is what makes that safe, and it is only safe while the checker keeps its own copy rather than importing the writer's.
- **`warn` is the right severity forever, not just for now** — the lane has no mechanism to harden, so promoting the record to a gate is a deliberate future change to this module rather than a configuration.

## Gaps

### There is no way to sign a record from the CLI

- **Status:** open
- **Discharge condition:** a command or flag exists that fills a sign-off row's signer, date and
  verdict, or the decision is recorded that hand-editing is the intended and only ritual.

Signing is a hand edit of a markdown table. That is deliberate — the signature is the one thing no
input can derive, and a command that filled it would be the machine claiming a human judgement, which
is the failure 59 names. The residual is that nothing guides the operator through it beyond the block's
own prose, and nothing records WHO ran the command versus who signed.

### The lane reports a missing signature but nothing ever asks for one

- **Status:** open
- **Discharge condition:** a decision is taken that an unsigned record should surface somewhere an
  operator is obliged to look, or that it should not.

`loop-record-unsigned` is a warning among other warnings in `aof work doctor`. No door reads it, by
design (ADR-007), and no workflow prompts for a signature. A record that is never signed therefore
produces one warning forever and changes nothing — which is the observability failure `78/SPEC.md`
opens by naming, held at bay here only by the record being committed and reviewed in the pull request.
