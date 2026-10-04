---
doc: research
---
# 135 · Key examples in the contract — Research

**Gathered:** 2026-10-03
**Method:** the parser was run on a probe feature (below); the corpus and sibling repositories were
counted. Nothing was installed (supply-chain policy).
**Status:** Desk research and the in-tree runner measurement complete; external runners not present.

## R1 · aof's own binding sees a scenario under `Rule:`, by name

- **Finding:** `parseFeature` (`packages/work/src/feature-parse.mjs`) returns scenarios under a
  `Rule:` with their names, lanes and Examples blocks intact. aof binds a scenario to a test by
  **name containment** (`packages/work/src/doctor/rubric.mjs`, `joinCases`), and a `Rule:` never
  changes a scenario's name. So the rubric join, the validate tag check and the ratchet keep working.
- **Constraint:** no change is needed for binding. The parser changes are about *grouping*.
- **Source:** probe run 2026-10-03, a feature with two `Rule:` blocks, a Background under a rule,
  a tagged rule, an `Example:` scenario and an outline with an `example` column.

## R2 · A tag on a `Rule:` line leaks onto the next scenario

- **Finding:** tags read before `Rule:` stay pending, and the next `Scenario:` takes them as its
  own. In the probe, `@manual` on `Rule: R2` gave that rule's later `@executable` scenario two
  verification tags (`lane: null`). The scenario in between was lost (see R3). Gherkin's own
  semantics are that a rule's tags apply to **every** scenario in that rule.
- **Constraint:** the parser must give rule tags rule scope, or validate reports a false
  "2 verification tags" on the wrong scenario.

## R3 · `Example:` is not read as a scenario, and the scenario vanishes without a trace

- **Finding:** Gherkin 6 added `Example:` as a synonym for `Scenario:`, alongside `Rule:`.
  The parser does not admit it. In the probe, `Example: E4 · …` under a `Background:` produced
  **no scenario and no structural finding**. Its steps read as the Background's.
- **Constraint:** this is exactly how an example falls out of a contract without anyone noticing.
  The parser admits `Example:` beside `Scenario Template:`.

## R4 · Examples rows are counted, not read

- **Finding:** an Examples block reports `{ header, rows, line }`. Cell values are discarded.
- **Constraint:** a trace that resolves an example to a table row needs the column names and the
  row values, as new keys.

## R5 · The corpus has nothing to migrate

| Fact | Value |
|---|---|
| Task feature files | 1,291 |
| … with a `Rule:` line | 0 |
| … with an `Example:` line | 0 |
| … with an Examples column headed `example` | 0 |
| … with a scenario whose name starts with an example id (`E<n> · `) | 0 |
| Stories with an `EXAMPLES.md` | 1 (144, `in-review`, 3 tasks, 3 `stated` examples) |

Commands: `grep -rlE '^\s*Rule:' --include=*.feature wiki/work | wc -l`, and so on for each row.
- **Constraint:** every parser change is additive. A delivered feature parses to the same
  scenarios. 144 is the one story the trace could reach (ADR-004 §4).

## R6 · No governed project on this machine uses a third-party Gherkin runner

- **Finding:** apart from the origin research and a parser comment, no file under this repository
  mentions `@amiceli/vitest-cucumber`, `@cucumber/*`, `playwright-bdd`, `jest-cucumber` or
  `quickpickle`. No `package.json` up to three levels deep under `C:\Source` does either. The
  aof test-bed (`aof-test-repo`) has none. So the only runner in the tree is aof's own (R1).
  A quick check of vitest-cucumber's public docs neither confirmed nor ruled out `Rule:` support,
  and nothing was installed to try it.
- **Constraint:** a runner that does not bind `Rule:` is not hypothetical, so the design needs a
  fallback that keeps the trace intact. ADR-002 names it: one feature per rule, with the feature
  title starting with the rule id.

## Assumptions to confirm

- **A1 — the trace holds end to end on a real refine.** One mapped story formulated and linted.
  This is the milestone's `@manual` live run. Testable in CI: no.
