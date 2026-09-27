@executable @cli @work @work-stream
Feature: a slug edge is never read as a number — the shift, promote and validate split an entry with one predicate

  THREE READERS, TWO RULES, MEASURED. A `depends:` entry is a number or a slug, and the tree
  answers that question twice. `classifyDepends` (`src/commands/promote.mjs`) asks `/^\d+$/`, so
  `10x-faster` is a slug there. The shift's per-entry rewriter (`rewriteToken`,
  `src/work/reindex.mjs`) and validate's driver path (`src/work.mjs`, the graph build and check 3a)
  ask `Number.parseInt`, which reads `10x-faster` as `10`. Until this story no backlog doc held a
  slug edge, so the difference never showed. Once shatter writes them, opening a slot at 10
  rewrites `depends: [10x-faster]` to `[11]` — silently re-pointing the edge at whatever alpha
  became — and validate resolves a numbered item's `10x-faster` as item 10.

  THE RULING. The split is ONE predicate: an entry, as `parseFrontmatter` hands it (quotes and
  surrounding spaces stripped), is a number iff it is all digits. It is exported from
  `src/work.mjs`, which gains no import (the ADR-015 §5 reach ceiling measured in its own
  comments), and read by the shift's rewriter, promote's classifier and validate's numbered path.
  The shift rewrites a number entry exactly as it did, width and quotes kept. A slug entry it
  never touches.

  WHERE IT STOPS. `nextWork`'s readiness walk and the doctor depends lane also parse a numbered
  item's entries. Neither is changed here. A slug on a numbered item is already invalid, and
  validate now reports every shape of it, digit-led included. So the only state that could fool
  those two readers is one validate refuses.

  Cases land where each act already has a suite: the shift on
  `test/work/stream/work-reindex-depends-parent-rewrite.test.mjs`, promote on
  `test/work/stream/work-promote-mints-the-number.test.mjs`, validate on
  `test/work/stream/work-backlog-archive-enumerate.test.mjs`. Each is driven over the three-root
  fixture plus `backlog/milestone_10x-faster/SPEC.md`, so the digit-led slug names a real
  backlog item.

  What would quietly undo this: a `Number.parseInt` or `Number(...)` test of an entry anywhere on
  the three paths; a `/^\d/` (starts-with) test standing in for all-digits; a second copy of the
  predicate in `reindex.mjs` or `promote.mjs`.

  Scenario Outline: the shift rewrites a number entry and leaves a slug entry alone
    Given the three-root fixture plus `backlog/milestone_10x-faster`, with `backlog/ideas/milestone_delta/SPEC.md`'s depends line written as <before>
    When `aof work promote gamma --at 10 --yes` runs, shifting `10` to `11` and `11` to `12`
    Then that line reads <after>

    Examples:
      | before                          | after                           | why                                                   |
      | `depends: [10x-faster]`         | `depends: [10x-faster]`         | a digit-led slug is a slug (headline — today `[11]`)  |
      | `depends: [10x-faster, 10]`     | `depends: [10x-faster, 11]`     | the number beside it still shifts                     |
      | `depends: ["10x-faster"]`       | `depends: ["10x-faster"]`       | quoted, still a slug                                  |
      | `depends: [010]`                | `depends: [011]`                | a padded number keeps its width, as delivered         |
      | `depends: ["11"]`               | `depends: ["12"]`               | a quoted number is still a number                     |
      | `depends: [10a]`                | `depends: [10a]`                | not all digits, so never shifted                      |

  Scenario Outline: promote reads a digit-led entry as the slug it is
    Given the three-root fixture plus `backlog/milestone_10x-faster`, with `backlog/ideas/milestone_delta/SPEC.md` declaring `depends: <depends>`
    When `aof work promote delta --json` runs
    Then it answers <outcome>

    Examples:
      | depends        | outcome                                                                          | why                                          |
      | [10x-faster]   | refused `promote-depends-backlog`, naming `10x-faster`                           | a backlog slug, never item 10                |
      | [10]           | promoted to `12_milestone_delta` with `created.depends` `[10]`                   | a number entry resolves as it always has     |

  Scenario: promoting a digit-led slug rewires its dependents like any other slug
    Given the three-root fixture plus `backlog/milestone_10x-faster`, with `backlog/ideas/milestone_delta/SPEC.md` declaring `depends: [10x-faster, 10]`
    When `aof work promote 10x-faster --json` runs
    Then `12_milestone_10x-faster` exists
    And `backlog/ideas/milestone_delta/SPEC.md` carries `depends: [12, 10]`

  Scenario Outline: validate's numbered path neither resolves nor graphs a digit-led slug
    Given the three-root fixture, with <declarations>
    When `validateWork` runs
    Then it reports <finding>

    Examples:
      | declarations                                                                        | finding                                                                                                                             | why                                                                   |
      | `11_chore_beta` declaring `depends: [10x-faster]`                                   | `depends "10x-faster" does not resolve to a top-level item (a milestone, uat gate, spike, chore, or parentless story)`               | today it resolves silently to 10                                      |
      | `10_milestone_alpha` declaring `depends: [11]` and `11_chore_beta` `[10x-faster]`   | the unresolved message for `10x-faster`, and no `depends cycle:` finding                                                            | today the graph gains a phantom `11 → 10` edge and reports `10 → 11 → 10` |
      | `10_milestone_alpha` declaring `depends: [11]` and `11_chore_beta` `[10]`           | `depends cycle: 10 → 11 → 10`                                                                                                       | a real cycle is still reported                                        |
