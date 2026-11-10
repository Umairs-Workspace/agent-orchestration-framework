---
doc: retrospective
updated: 2026-10-08
---
# 155 · One agent-mode setting governs every session — Retrospective

The story ran solo end to end. There was one lesson.

## R1 — The contract named a removed CLI verb, and the test reached the behaviour without it

- **Kind:** near-miss · **Area:** process · **Stage:** refine → build · **Owner:** product owner (refine) / builder · **Raised by:** verifier
- **What happened:** Task 02's scenarios run `aof config inspect --json`. That verb was removed before this story and now errors. Refine copied the name from the inspector's module (`config-inspect.mjs`) and from story 30's wording. The build tested the notice through the inspector directly, so nothing ever typed the command. Verify tried it live, and it failed.
- **Why:** Nobody checked that a CLI command named in a `When` step still exists. A test that calls the module directly passes whatever the step says about the command line.
- **Lesson:** When a scenario's `When` step names a CLI command, run it (or its `--help`) at refine before locking the contract. A build whose test calls the module directly should note in the review that the named command was not exercised.
- **Refs:** VERIFICATION F-01
