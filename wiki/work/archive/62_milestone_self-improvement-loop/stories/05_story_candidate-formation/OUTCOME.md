# 62/05 · Candidate formation — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### A partition, proven two ways
`formCandidates` puts every record on exactly one candidate, asserted as membership and as arithmetic,
so neither a dropped record nor a double-carried one passes. Over this repository it takes 796 records
into 593 candidates.

### Lossless citation carry
A cluster carries every citation its members carry — 654 citations behind 402 lesson records at the
gate, where 154 records carry more than one — so the distinct-document evidence floor downstream is
measured against everything that stands behind a candidate, never a sample.

### A tie-break that reads content
The tie-break is the lexicographically least source citation; no input index, position or iteration
order is reachable from it, and a shuffled input yields byte-identical candidates over both planted
ties and the real lessons lane.

### A criterion with a declared ordered range
`minimum-shared-metadata-fields` names its four dimensions, declares a loosest and a tightest admitted
value, refuses anything outside that range with a coded error, and defaults to 3.

### A default that must re-earn its place
The tradeoff justifying 3 is recomputed against the corpus as it stands on every run — the largest
loose cluster must collapse, recurring multi-source classes must survive, and the tightest setting must
fragment — with the dated measurement kept beside it as provenance rather than as an expectation.

### A pure leaf
`formation.mjs` takes records and returns candidates: no filesystem, no clock, no argv, no static
import of the command registry. A candidate carries exactly `sources`, `citations` and a bare-ref
`target`, and attaches no lane, patch, applier, verdict or distance.

## Assumptions

- **Every lane the corpus registry declares reaches formation** — asserted from that registry rather
  than from a literal three, so a fourth lane is covered with no edit here.
- **`target: null` is still a candidate** — a record naming no unambiguous config pointer is carried,
  not dropped, so the evidence behind it survives to the gate that judges it.
