---
doc: examples
---
# 190/00 · A repeat `aof test` on unchanged content is answered from the record of the run that already happened — example map
<!--
Drafted at refine's discovery beat, 2026-11-09. No business question is left open. Struck because
the record answers them: who writes the evidence (96/ADR-008 and the SPEC Objective: "the evidence
is a record the command writes"); whether a door may skip testing (SPEC Scope: the doors read the
record, the command decides); whether a deliberate repeat stays possible (SPEC Out of scope, third
bullet). The three engineering choices left are technical and defaulted to the ADRs.
-->

## R1 · A run on content already tested is not run again
- E1 · The build terminator's run is green on content K; the QA lane then asks `aof test --scope impacted --story 190/00` on K: it is answered from that run and no runner starts [proposed]
- E2 · After that green run the developer edits one source file; the lane asks the same question: the suite runs, because the content changed [proposed]
- E3 · After that green run a new untracked file `notes.mjs` appears and nothing else changes; the lane asks: the suite runs, because an untracked file is part of the content [proposed]
- E4 · The green record was made on `win32`; the same content is asked about on `darwin`: the suite runs [proposed]

## R2 · A red answer is only ever the answer to the same question
- E5 · A red run selected `a.test.mjs` and `b.test.mjs`; the same two are asked for on the same content: answered red, with the recorded failures and exit 1 [proposed]
- E6 · A red run selected `a.test.mjs` and `b.test.mjs`; only `a.test.mjs` is asked for: the suite runs [proposed]
- E7 · A green `--scope all` run exists; `--scope impacted` selecting `a.test.mjs` is asked on the same content: answered green [proposed]
- E8 · The newest record on the content is `not-finished`; the same question is asked: the suite runs [proposed]

## R3 · Asking together costs one run
- E9 · Three review lanes ask the same question on content K within a second of each other: one runner starts, and two results say `answered from the run of <instant>` [proposed]
- E10 · The process running the suite is killed while another caller waits on it: the waiter reclaims the lock and runs the suite itself, and nothing is reported green [proposed]

## R4 · A deliberate repeat is labelled
- E11 · `aof test --scope impacted --story 190/00 --fresh` on K, with a green record on K: the suite runs and its record carries `fresh: true` [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-002 · Is a red record reused for the identical selection, or does a red always re-run?
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-001 · Does editing a record under `wiki/work` change the key?
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-001 · Where do records live, so that dispatched worktrees share them?
