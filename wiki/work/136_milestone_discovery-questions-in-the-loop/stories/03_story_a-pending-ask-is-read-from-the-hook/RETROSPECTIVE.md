---
doc: retrospective
updated: 2026-10-04
---
# 136/03 · A pending ask is read from the hook — Retrospective

## R1 — a new suite file tripped two censuses its cases did not

- **Kind:** mistake · **Area:** contract · **Stage:** build · **Owner:** developer
- **Raised by:** the whole-tree gate at `6a98ebf7`

**What happened.** 03's cases first landed in a suite of their own. The gate redded `test/loop`'s
directory ceiling (FF-11904, 138/00) and the session driver's named-consumer census (53/00), plus
FF-7106 (the hook's tracked render undeclared) and 96/02 (the plan restated two declared paths).
Moving the cases into the two suites that own the subject cleared the first two without a new
row.

**Lesson.** Before adding a test file, ask which existing suite owns the subject; a new file is a
new member of every census over its directory. A story that adds a bundle member declares its
tracked render and the lock in the same `files:` (FF-7106).

## R2 — a delivered test was stricter than the contract it enforces

- **Kind:** near-miss · **Area:** contract · **Stage:** build · **Owner:** architect
- **Raised by:** `aof:verify 136`

**What happened.** 87/00's scenario says the framework plants no entry "that judges a command before
it runs". Its suite asserted no framework `PreToolUse` entry at all. The recorder judges nothing,
so the suite was re-aimed to the scenario's own words, with the recorder admitted by name and its
group held to `AskUserQuestion` alone.

**Lesson.** When a delivered test blocks a change, read the scenario it enforces before reading the
assertion. A test is code and may change; the scenario may not.
