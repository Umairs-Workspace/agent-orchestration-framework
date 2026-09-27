# 124/00 · The census reports its denominator — Outcome

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

### The contract set has one home
`src/story-contract.mjs` answers both questions about a story's declared set — what it declares
(`resolveDeclaredSet`, returning `{present, malformed, values}` plus each entry's authored directory
intent) and whether one entry covers another (`contractSetCovers`) — with zero project imports and
no filesystem access. Directory intent is what the author wrote: a trailing `/` claims a subtree, and
nothing `stat`s the disk to second-guess it.

### The parallel wave collides on coverage, not on equality
`src/ready-wave.mjs` asks the shared predicate both ways and holds no coverage rule of its own. A
story declaring `files: [src/commands/]` and a sibling declaring a file beneath it are no longer
waved together, and every pair that collided under exact-string equality still collides — the
adoption is a strict tightening, asserted over a generated corpus.

### A fourth advisory doctor lane names each unwitnessed `depends:` edge
`aof work doctor` runs `src/work/doctor-depends.mjs` as the thirteenth `CHECK_GROUPS` entry. For
every resolved story→story edge whose dependent `reads:` shares nothing with the dependency's
`files:` it emits `depends-edge-unwitnessed` at `warn`, naming both endpoints and both sets. The word
"phantom" appears in none of the lane's codes, messages or exports.

### The lane states its denominator once per run
Exactly one `depends-edges-unchecked` finding per run carries the two exclusion reasons separately —
an endpoint that is not a story, and a story that declared no contract — and the four counts close
as an identity over the edge set `validateWork` resolves. Over this stream at accept: 230 considered
= 38 witnessed + 10 unwitnessed + 125 unchecked by type + 57 unchecked as undeclared.

### An advisory lane cannot gate, as a class
Every module registered in `CHECK_GROUPS` that exports a frozen `*_FINDING_CODES` array is disjoint
from `CONTROL_FINDING_CODES`, names no `"error"` severity literal and consults no acceptance horizon;
`src/work/doctor-controls.mjs` is the one named exemption because its array is the gate's source.
A fifth advisory lane cannot re-introduce a gateable code without failing FF-12402.

### The fitness lane sweeps the interior
`scripts/test-rubric.mjs` walks `test/arch/**` recursively and its zero-lane diagnostic reports
modules swept, names registered and names matched. A control moved into a family folder is still in
the graded lane.

## Assumptions

- **Only `STORY.md` carries contract fields** — an edge touching a milestone, uat, spike or chore is
  unevaluable by type; the lane counts it and cannot read it.
- **Directory intent is lexical** — an entry authored without a trailing `/` claims one path even
  when a directory of that name exists; 0 of the stream's 1,569 declared entries did so at refine.
- **The doctor spine's roster is frozen by name** — `test/arch/audit/acd-controls-never-execute`
  names the lane modules; a fifth lane must be added there or the spine reds on import.

## Gaps

### The edges the census cannot read
- **Status:** open
- **Discharge condition:** a contract field on driver records (milestone, uat, spike, chore), or a
  ruling that driver edges sit outside the check's domain by design.
182 of the stream's 230 resolved edges are reported as unchecked; the lane names the count and the
two reasons, and nothing evaluates them.
