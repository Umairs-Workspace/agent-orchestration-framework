# 201/00 · Recall hands over a picked block — example map
<!--
Drafted 2026-11-17 by the PO at refine's discovery beat. Grounding, measured the same day:
- The block's cap is 5, applied at render (packages/knowledge/src/memory.mjs:280, :303).
- The ranker filters by scope, scores, then cuts at the limit
  (packages/knowledge/src/memory/local-retrieval.mjs:325-349).
- No recall path filters on a lesson's promotion today (ARCHITECTURE "Measured facts").
Every rule here is the SPEC's or 177's. No person was asked, so every example is proposed.
-->

## R1 · A block is what a picker chose from the 20 best-ranked records in scope: at most 5, or none
- E1 · 60 records match "worktree junction". The picker is handed the 20 best-ranked as cards 1 to 20 and answers 7, 2, 15: the block is those three records in that order, each line ending in its `path:line` [proposed]
- E2 · Only 3 records match: the picker is handed 3 cards, answers 1 and 3, and the block is 2 lines [proposed]
- E3 · With `--kind finding`, 12 of the 60 are findings: the picker is handed 12 cards, every one a finding [proposed]
- E4 · The picker answers with 8 card numbers: the block is the first 5 it named [proposed]
- E5 · The picker answers `[]` for a 20-card shortlist: the command prints nothing and exits 0 [proposed]
- E6 · No record in scope matches: nothing is printed, and no picker is asked [proposed]

## R2 · When the pick cannot answer, the block is the lexical top 5 and stderr says why
- E7 · The picker does not answer in time: stdout is the 5 best-ranked records, stderr is `[memory] pick unavailable (pick-timeout) — this block is the lexical top 5; records intact.`, and the exit code is 0 [proposed]
- E8 · The picker answers "I think the second one" with no array: the same, with `pick-unreadable` [proposed]
- E9 · A caller that injects no picker gets the 5 best-ranked records and nothing is announced [proposed]

## R3 · A lesson already promoted to a control, a rule or a prompt is not shortlisted
- E10 · The best-ranked record is a lesson with `Promoted to: control:171/FF-17104`: it is not a card, and the record ranked 21st takes the freed place [proposed]
- E11 · A lesson with `Promoted to: none`, and a legacy lesson with no such field, are still cards [proposed]
- E12 · With `--status control`, the promoted lesson is a card: the caller asked by promotion [proposed]

## R4 · Only the block is picked
- E13 · `aof memory recall "worktree junction" --json`, with no `--block`: the 5 best-ranked records, a promoted lesson included, and no picker is asked [proposed]
- E14 · `aof memory recall "" --item 157 --all --json`: every record in scope, and no picker is asked [proposed]
- E15 · `aof memory recurrence` for a new lesson that repeats a promoted one still names the promoted lesson [proposed]
- E16 · `--block --limit 3`: the picker is handed 20 cards and the block is at most 3 lines [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-002 · Does `--limit` on a block set the cap or the shortlist? (The cap. The shortlist is 20, or the cap when the cap is larger.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-002 · In what order are picked records shown? (The picker's: most applicable first.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-005 · Which promotions drop a lesson? (A control, a rule or a prompt, as 177's candidate 4 measured. `none`, blank and a value outside the three forms keep it.)
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-003 · Is a miss announced when the project turned the pick off, or when no picker is wired? (No. Both are the configured behaviour, not a failure.)
- Q5 · technical · defaulted ARCHITECTURE.md#ADR-002 · What does an answer that names only cards outside the shortlist mean? (It is unreadable, never an empty block.)
