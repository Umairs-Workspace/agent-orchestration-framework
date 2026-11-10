---
doc: examples
---
# 148/04 · A live lesson's meta line is held — example map
<!--
Drafted at refine's discovery beat, 2026-10-04, from the live tree. Struck before asking, because
the record answers them: whether an archived retrospective fails (SPEC: advisory on an archived
item, never back-filled); whether the live lessons that fail on arrival are fixed or exempted (SPEC:
an error on a live item, so the story that lands the rule makes the stream green); whether Owner is
held to a list (the prompt prescribes "the role/lane"). No question is left for a person.
-->

## R1 · A live lesson's Kind, Area and Stage are vocabulary words, a qualifier allowed, and its Owner is present
- E1 · 134/01's R1 writes "**Area:** planning" → validate reports R1's Area "planning" and names code, architecture, contract, security and process [proposed]
- E2 · 144's R2 writes "**Kind:** risk" → validate reports R2's Kind "risk" [proposed]
- E3 · 146's R1 has no meta line → validate reports R1 missing Kind, Area, Stage and Owner [proposed]
- E4 · "**Kind:** near-miss (recurring) · **Area:** process · **Stage:** build (caught at review) · **Owner:** developer" → no finding [proposed]
- E5 · "**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:**" with nothing after it → validate reports Owner missing [proposed]

## R2 · An archived lesson is flagged, never failed and never rewritten
- E6 · Archived 46's retrospective (15 lessons, none with a meta line) → one doctor warning "lesson-meta-archived" naming 15 lessons; validate reports nothing for it [proposed]
- E7 · Archived 01's retrospective (Stage "build→verify", "refine→build", every value starting with a vocabulary word) → no warning [proposed]

## R3 · The live stream is green when the hold lands
- E8 · After this story, `aof work validate` over the live tree reports no meta-line finding, and 144's R2 reads "**Kind:** near-miss (risk)" or another vocabulary word with "(risk)" kept [proposed]

## Questions
- Q1 · technical · defaulted ADR-007 · Where does the archived advisory live, given validate has no severity? (a doctor warn lane)
- Q2 · technical · defaulted ADR-007 · Where is the live check composed? (commands/validate.mjs, beside the other additive checks)
