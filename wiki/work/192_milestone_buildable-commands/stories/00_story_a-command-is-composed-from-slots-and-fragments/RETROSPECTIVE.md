---
doc: retrospective
---
# 192/00 · A command is composed from slots and fragments — retrospective

Written at the milestone's close (2026-11-14). The story was accepted on 2026-11-13 without one;
its lessons come from `STATE.md`'s feedback for 192/00 and its grade round.

## R1 · A new module on the bundle path owes two ceilings that refine's write set did not name

**Kind:** mistake · **Area:** process (planning) · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** The story declared two directory-budget moves and the build needed a third:
`packages/core/test` went from 44 to 45 for `bundle-compose.suite.mjs`. The grade round then found
FF-16004 red, because `aof work find` loads one module more (754 → 755 when 192/02 added the
contribution leaf, 756 when 192/03 added the lane binding). Neither the budget row nor
`test/arch/command/acd-cli-entry-executes.test.mjs` was in the story's `files:`. The same two
ceilings recurred in 192/02 and 192/03.

**Why:** Refine derived the write set by hand from the graph and a phrase search. Neither one finds
a control that counts modules or files, because those controls name no module.

**Lesson:** When a story adds a module that `loadBundle` or the CLI entry reaches, or adds a suite
to a package's test directory, put the source-directory budget control and FF-16004's ceiling test
in its `files:` at refine.

## R2 · An arch control reads imports through the shared extractor, never its own

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** FF-19207's control first spelled its own import extractor. FF-11901 went red at
the grade round, and the control was changed to read `importSpecifiers` and
`computedDynamicImports` from `test/support/module-family.mjs`.

**Why:** The rule that one module extracts imports is enforced by a control the story's by-file run
did not select.

**Lesson:** A new control that asks what a module imports takes its extractor from
`test/support/module-family.mjs`.
