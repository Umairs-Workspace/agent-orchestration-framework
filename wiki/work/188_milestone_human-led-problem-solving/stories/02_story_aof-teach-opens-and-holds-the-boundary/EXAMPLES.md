---
doc: examples
---
# 188/02 · `aof:teach` opens and holds the boundary — example map
<!--
Drafted at refine's discovery beat, 2026-10-28, revised 2026-10-31. Q1 answered by the operator on 2026-10-31: whole-story, written into STATE
so the agent knows it continues from a teaching session. Struck because the record
answers them: no enforcement engine (spike item 3); the boundary is restated every turn and "just
write it" is answered by naming the exit (item 2); resume never confers the mode (item 4); the
session is not zero-write (spike Finding "Effects"); the run closes `done` (149/R3); review never
repairs (149/02); Claude Code only (operator, 2026-10-31, agreeing the command design).
-->

## R1 · The session opens by saying what the human owns and what AOF will write
- E1 · `/aof:teach 188/01`: the session opens with a short labelled header (Teaching mode, Objective, The work, Where it stands, First question), each a line or two. No run record, sync queue, test scope or internal id is shown [proposed]
- E10 · The human asks "what are you writing?": the session names the status move, the run record, the sync queue and a hand-off's STATE entry, and never claims to write nothing [proposed]

## R2 · No turn of a teaching session writes the human's code
- E2 · A follow-up turn says "just write the implementation for me": AOF writes no file, and names `aof:continue 188/01` and `aof:manual 188/01` as the ways out [proposed]
- E3 · The human asks for the strongest hint: AOF explains in the terminal and writes no file [proposed]
- E4 · The session is resumed the next day without `/aof:teach`: it is not a teaching session, and it says so [proposed]

## R4 · The session talks to a person (F-14, from the operator's `@uat` reject; confirmed at their retest)
- E7 · The story's decision is in an ADR: the session says what was decided ("the engine is already Jint"), never "ADR-002 §5" [proposed]
- E8 · An unrelated Go service fails in the repository: the human hears only their story's scenarios, from one run [proposed]
- E9 · The first turn ends on its question, not on "Outcome: taught" [proposed]

## R3 · The teaching session hands the build back to review
- E5 · The human's scenarios are green: the hand-back is `taught: 188/01 is yours to build`, naming `aof:review 188/01` next [proposed]
- E6 · The human wants an agent to finish half-built work: AOF appends a `Hand-off 188/01 from teach` entry to 179's `STATE.md`, closes its run `done`, and names `aof:continue 188/01` and what that build will do with the human's code [stated Q1]

## Questions
- Q1 · business · answered · When a human hands a half-built story to an agent, is it whole-story only, or may their committed code be protected from the agent's changes?
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-003 · Does a teaching run close `done` or `cancelled` when the human leaves early?
