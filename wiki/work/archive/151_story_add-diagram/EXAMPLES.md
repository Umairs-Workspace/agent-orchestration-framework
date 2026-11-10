---
doc: examples
---
# 151 · aof:add-diagram draws the architecture diagrams a refine left undrawn — example map
<!--
Drafted at refine's discovery beat, 2026-10-04, and settled with the operator the same day. Struck before asking, because the record answers
them: which CLI verbs draw (STORY Notes: `aof diagram plan` / `aof diagram export`, no new verb);
what diagrams-off and generator-missing do (refine.md's diagram step: a no-op, and a report that is
never a stop); whether a delivered item's diagram may be drawn (133/ADR-004: refused as
`diagram-item-delivered`, a delivered ADR's diagram is immutable); who edits ARCHITECTURE.md (the
session pastes the returned block, aof never does); whether the ADR's design is revisited (Notes:
never). A `diagram not drawn:` line in STATE.md always leaves its brief behind (refine.md: "keep the
brief"), so an ADR with a brief and no drawn diagram covers both kinds of skipped diagram.
-->

## R1 · With no ADR named, every ADR with a brief but no drawn diagram is drawn
- E1 · ADR-002 has a brief and a pasted diagram, ADR-004 a brief and none, ADR-005 no brief → only ADR-004 is drawn; ADR-002 and ADR-005 are untouched [proposed]
- E2 · STATE.md says `diagram not drawn: generator-missing`, ADR-003 kept its brief, the generator is now installed → ADR-003 is drawn [proposed]
- E11 · ADR-003 and ADR-004 both have a brief and no diagram → both are listed, then each is drawn in turn without a pause [stated Q3]
- E3 · Every brief already has its diagram → the command reports nothing to draw, names how to ask for one ADR, and writes nothing [stated Q1]

## R2 · A named ADR is drawn, its brief drafted first when it has none
- E4 · `aof:add-diagram 140 ADR-002`, ADR-002 has no `### Diagram` section → the session writes ADR-002's brief, then plans, draws, exports and pastes the block under it [proposed]
- E5 · `aof:add-diagram 140 ADR-009`, no ADR-009 heading → the `diagram-adr-unknown` refusal is reported and nothing is written [proposed]
- E6 · The named ADR already has a pasted diagram → reported as already drawn, nothing is changed [stated Q2]

## R3 · The diagram step's own answers stand
- E7 · `work.diagrams` is unset → the off reason is reported and nothing is written [proposed]
- E8 · The generator is not installed → its code and fix are reported, every brief is kept, and the run is not a failure [proposed]
- E9 · The item is done → `diagram-item-delivered` is reported and nothing is written [proposed]
- E10 · The SVG exports but no browser is found for the PNG → the block is still pasted, and the PNG's code and fix are reported [proposed]

## Questions
- Q1 · business · answered · With no ADR named and nothing undrawn, should the command look for ADRs that would benefit from a diagram, or report that there is nothing to draw?
- Q2 · business · answered · When a named ADR already has a diagram, is it redrawn or reported as already drawn?
- Q3 · business · answered · With several undrawn briefs, does one run draw them all, or ask which to draw?
- Q4 · technical · defaulted PLAN.md · How is the diagram's slug chosen?
- Q5 · technical · defaulted PLAN.md · Is the STATE.md `diagram not drawn:` line edited once the diagram is drawn?
- Q6 · technical · defaulted PLAN.md · Does the command commit what it draws?
