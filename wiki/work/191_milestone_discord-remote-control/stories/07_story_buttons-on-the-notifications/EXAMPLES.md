---
doc: examples
---
# 191/07 · Buttons on the notifications — example map
<!--
Drafted at refine's discovery beat, 2026-11-11. Struck because the record answers them: which
notices get which buttons (SPEC Scope); whether a choice needs confirming (SPEC Objective: "with one
tap"); whether free-text questions get buttons (SPEC Scope: they stay answer-by-reply); who may tap
(the channel allowlist, as for a reply, 131/ADR-008 §3). Relabelled technical: the limits on the
number and length of choices, and what a stale tap says.
-->

## R1 · A halt offers the two ways forward
- E1 · `loop-halted` for scope 191 in `aof`, channel allowlist non-empty: the message carries `Resume` and `Open a session here` [proposed]
- E2 · The same halt in a channel with no allowlist: no buttons, as no one could use them [proposed]
- E3 · An allowed user taps `Open a session here` on a halt of item 191/02: a Claude session starts in `aof` at item `191/02`, and the reply carries its link or name [proposed]

## R2 · A fixed-choice question is answered with one tap
- E4 · A question with choices "Yes, ship it" and "No, hold": two buttons, and tapping "No, hold" answers the ask with the text `No, hold` by `@sam` via discord [proposed]
- E5 · A question with 6 choices, or one label of 81 characters: no buttons, and the message says to answer by reply [proposed]
- E6 · A second tap after the ask was answered: refused, naming who answered and when, and the buttons are disabled [proposed]

## R3 · A tap is held to the same allowlist as a reply
- E7 · A user not on the allowlist taps `Resume`: refused `discord-button-not-allowed`, and nothing is dispatched [proposed]
- E8 · A tap on a message older than 30 days, after its index record was pruned: refused `discord-button-expired` [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-007 · How many choices get buttons? (2–5, with each label at most 80 characters, Discord's limit.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-007 · Does `Resume` show on a loop that is not supervised? (Yes; the tap's reply names the terminal command, as `/loop resume`'s refusal does.)
