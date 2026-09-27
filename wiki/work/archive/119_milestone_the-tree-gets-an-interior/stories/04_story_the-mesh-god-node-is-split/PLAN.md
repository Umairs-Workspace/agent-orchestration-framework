# 119/04 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

Two extractions from one file, in order of cost. Launch composition first — it is already a
self-contained, nearly pure unit, it was the most recent concern added, and it is the cheapest way to
prove the seam holds. Repo admission second: the largest single block, and the one carrying its own
delivered controls.

The reason this is a refactor and not a rewrite is that the module's consumers all reach it through
one exported factory, and that factory's surface must not move. Everything else in the file is
reachable only from inside it. Both extracted concerns take their collaborators as injected
dependencies rather than importing them, so neither child needs to import the parent and no cycle is
created — that was checked before the story was written, not hoped for.

By the time this runs the file already lives inside its family directory, which is what makes the
split legal at all: intra-family imports are admitted, and the guard that once forbade exactly this
decomposition was re-expressed three stories ago. Do not reach for a different arrangement because the
obvious one looks forbidden — it is not, any more.

The sharp edge is what the extraction does to controls that assert **negatives** over this file's
text. Two of them are security controls, and their only positive leg is gated on the file containing a
clone at all. Move the clone to a sibling and the gate opens false, every negative passes over a
subject that no longer contains what they forbid, and the suite stays green having asserted nothing —
permanently, and invisibly at review. Their own self-checks run over planted strings, so they cannot
see their own vacuity. Point them at the module that now clones, and give them a leg that asserts they
read a subject containing one. A frozen three-file census in a third control has the same problem for
the same reason.

## The verification step

The check that proves the split is that it **subtracts**. Assert the exported name set equal in both
directions across the change, so the consumers are untouched by construction. Then, per extracted
symbol: absent as a *definition* in the parent and present as a re-export — the pairing is what
distinguishes a move from a copy, and a contract that only checked that the new modules exist would
pass on a copy-paste. Derive the extracted set from each child's own definitions with a floor, so the
check cannot go vacuous as the split grows.

Lower the size ceiling to the newly measured value, with the command that measured it in the
constant's own comment.

## Deliberately out of scope

Two of the four seams the ledger names — worktree lifecycle and run bracketing — are not split here.
Do not soften or delete the size ceiling: its entire value is that raising it costs a written
decision, and those written decisions are the evidence base for the entry this story discharges. And
do not add a fifth concern to the parent because the pattern looks established.
