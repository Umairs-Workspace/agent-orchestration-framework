---
doc: examples
---
# 136/02 · A driven refine asks through the loop — example map
<!--
Drafted at refine's discovery beat, 2026-10-03. Struck before asking, because the record answers
them: whether a driven refine may default a business question (SPEC: never); the form of the ask
(SPEC: 131's producer form, carrying the rule and the example); and whether the other lanes wait
(SPEC and 131/ADR-004: only that lane). No business question is left.
-->

## R1 · A driven refine asks each business question as its own message
- E1 · A loop refines 136/01 with Q1 open → one question asked, carrying only Q1; the operator gets one message [proposed]
- E2 · A loop cascade over three stories leaves two business questions → asked one after the other, each its own message and wait [proposed]
- E3 · An operator refines interactively with three questions open → they may still be asked together [proposed]

## R2 · The message carries the map
- E4 · Q1 bears on rule R3 and would settle E6 → its first line reads "136/01 Q1 · Discovery question — rule R3 · …; settles E6", then Decision needed, Options, I would pick, What the answer changes [proposed]

## R3 · A driven refine never decides a business question itself
- E5 · Nobody answers before the bound → the question stays asked, and the story stays at the gate with no tasks written [proposed]
- E6 · A technical question comes up → it takes its documented default and nobody is asked [proposed]

## Questions
- Q1 · technical · defaulted ADR-002 · How does a session know it is driven? (its environment carries AOF_RUN_ID)
- Q2 · technical · defaulted ADR-002 · May a discovery question go out as a NEEDS_INPUT sentinel turn? (no: the question tool only)
