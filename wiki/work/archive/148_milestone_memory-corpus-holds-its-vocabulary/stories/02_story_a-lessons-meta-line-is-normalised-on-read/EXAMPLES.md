---
doc: examples
---
# 148/02 · A lesson's meta line is normalised on read — example map
<!--
Drafted at refine's discovery beat, 2026-10-04, from the live index (2,871 records). Struck before
asking, because the record answers them: whether the four kinds, five areas or three stages widen
(SPEC: held to the vocabulary the retrospective prescribes); whether an archived source is rewritten
(SPEC: never back-filled); whether a lesson that states no kind is given one (SPEC: counted, never
guessed); whether Owner is held to a list (the prompt prescribes "the role/lane", not a list).
-->

## R1 · A value that starts with one of the vocabulary's words is indexed as that word, and the rest becomes a tag
- E1 · m40/R3 writes Kind "near-miss (cross-milestone, discovered here)" → kind "near-miss", tags ["cross-milestone, discovered here"] [proposed]
- E2 · Stage "build (caught at review)" → stage "build", tags ["caught at review"] [proposed]
- E3 · m16/R1 writes Area "process (calibration)" → area "process", tags ["calibration"] [proposed]
- E4 · Kind "Near-Miss" → kind "near-miss", no tag [proposed]
- E5 · Stage "build→verify" → stage "build", tags ["→verify"] [proposed]

## R2 · A value that does not start with a vocabulary word is kept as written, and counted
- E6 · Kind "mistakes" → kind "mistakes", no tag: the word runs on, so it is not "mistake" [proposed]
- E7 · Kind "blind spot" (15 lessons) → kind "blind spot", counted as non-enum, never mapped to "near-miss" [stated Q1]
- E8 · m46/R1 has no meta line at all → kind, area and stage "", tags [] [proposed]

## R3 · A gap's status is open, discharged or open-by-decision, and its date and cause become tags
- E9 · Status "discharged (by story `86`, 2026-09-04)" → status "discharged", tags ["by story 86, 2026-09-04"] [proposed]
- E10 · Status "open by decision" → status "open-by-decision", no tag, and never "open" tagged "by decision" [proposed]
- E11 · A gap with no Status line → status "open" [proposed]

## R4 · Every record carries tags, and a store built before index version 2 is reported stale
- E12 · An ADR record and a capability record → each carries `tags: []` [proposed]
- E13 · A version-1 store whose records carry no `tags` → recall returns them unchanged and does not fail [proposed]
- E14 · A version-1 store → `status` reports `index: { version: 1, current: 2, stale: true }`, and the text names "aof work memory ingest" [proposed]
- E15 · A version-2 store → `index.stale` is false, and the text has no stale line [proposed]

## Questions
- Q1 · business · answered · 140 of 775 lessons write a Kind outside the four: "process" (40), "defect" and its variants (43), "blind spot" (15), and 23 that record what worked ("confirmed approach" 10, "insight" 7, "confirmation" 6), which no kind fits. Index them as written and count them as non-enum, or map the failure words onto the four through a fixed table ("defect" and "bug" to "mistake", "blind spot" to "near-miss")? (as written, counted as non-enum; no synonym table, 2026-10-04)
- Q2 · technical · defaulted ADR-003 · Is `tags` a new field, or does it ride a frozen one? (a new array field, index version 2)
- Q3 · technical · defaulted ADR-002 · Does normalisation change the text that ranking reads? (no, only kind, area, stage, status and tags)
- Q4 · technical · defaulted ADR-001 · Where does the vocabulary live, given validate cannot import `@aof/knowledge`? (`@aof/work/memory-vocabulary`)
