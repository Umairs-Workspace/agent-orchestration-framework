---
doc: examples
---
# 189/01 · A check separates unaided from assisted — example map
<!--
Drafted at refine's discovery beat, 2026-11-01. Struck because the record answers them: the four
kinds (SPEC Scope, first bullet); skipped and unavailable checks are unmeasured, not passed (second
bullet); confidence is not evidence, and ambiguity is asked about (second and third bullets); no
grade, ranking or mandatory ritual (third bullet); the line is instruction-level (spike 187, inherited
in STATE). Relabelled technical: how many items per kind, and the order the kinds are offered in.
-->

## R1 · Every check is tried unaided first, and its help is labelled
- E1 · The human answers the predict check for E3 before asking for anything: the result line reads `help: none` [proposed]
- E2 · The human asks for a conceptual hint, then answers: the result line reads `help: conceptual hint` [proposed]
- E3 · The human asks to see the answer: the session shows it, and the result line reads `help: answer revealed` [proposed]

## R2 · No check counts as passed unless it was answered and grounded
- E4 · The human skips the diagnose check: its result is `skipped`, and the summary does not count it [proposed]
- E5 · The story's `reads:` holds no ADR, so there is no design choice to explain: the explain check is `unmeasured` [proposed]
- E6 · The human says "I'm sure it returns null" with no reason, and the contract says it throws: the result is `not consistent`, whatever their confidence [proposed]
- E7 · An explanation could mean either of two designs: the session asks one follow-up; if it is still ambiguous, the result is `unclear` [proposed]

## R3 · Shipping and understanding are reported apart
- E8 · A `done` story where the human revealed both answers: Shipping reads `done — accepted`, and Understanding shows two `answer revealed` lines, never one combined verdict [proposed]
- E9 · `/aof:grill-me` in a new session after a manual build: the summary reads `help during the build: not observed by this session` [proposed]
- E10 · The human disagrees with a `not consistent` result: their disagreement is printed beside it, and the result is not changed [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-003 · How many items does each check kind offer: one, with another on request?
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-003 · In what order are the kinds offered: explain, predict, diagnose, adapt, each skippable?
