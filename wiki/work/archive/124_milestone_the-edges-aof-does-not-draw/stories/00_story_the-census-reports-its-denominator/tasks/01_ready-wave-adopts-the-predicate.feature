@executable @cli @work @work-stream
Feature: The parallel wave adopts the predicate it was missing, and the adoption can only tighten

  `src/ready-wave.mjs` is 80 lines whose only import is the shared leaf (`:4`), with three dependents:
  `src/commands/next.mjs:36`, `test/work/story-context-contract.test.mjs:9` and
  `test/work/story-contract-derive.test.mjs:26`. Its answer is observable at `aof work next --json`,
  whose `wave` and `heldSet` are this partition's own output (`src/commands/next.mjs:38-51`).

  The defect is exact-string collision. `declaredWriteSet` resolves each declared entry and adds
  `collisionKey(resolved.projectPath)` to a `Set` (`:37`), and the collision test is
  `occupied.has(entry)` (`:70`). `path.relative` (`src/story-contract.mjs:107`) has already stripped
  the authored slash by then, so a story declaring `files: [src/commands/]` and a sibling declaring
  `src/commands/test.mjs` are read as disjoint and both enter the same parallel wave, where they
  collide on disk. That is live rather than hypothetical: milestone 119's four stories are this
  stream's only directory-shaped declarations, and a census pass over all 230 resolved `depends:`
  edges finds exactly four pairs where one side's declared path sits beneath the other's authored
  directory — `119/03 → 119/02`, `119/04 → 119/01`, `119/04 → 119/02` and `119/04 → 119/03`.

  Two behaviours have to survive the collapse onto the shared predicate. Case-folding stays in this
  module (`collisionKey`, `:6-10`): a false overlap only serialises work, while a missed case-only
  overlap can corrupt a case-insensitive checkout, so the key is lower-cased before any comparison.
  So does the conservatism about unknown write sets (`:60-68`): a member whose set could not be
  resolved runs alone if it is first in ready order, and is held otherwise.

  The adoption is a strict tightening, and that is a property rather than an intention. Equality is
  coverage's first leg, so every pair colliding under exact-string equality still collides under
  coverage — a wave can lose a member but can never gain one.

  What would quietly undo this: case-folding moved into the shared predicate and dropped here, so a
  case-only overlap stops colliding on the node where it corrupts a checkout; the untouched-scaffold
  rule (`:24-32`) lost in the rewrite, so every never-refined story declares "I write nothing" and
  parallelises against every sibling; a second coverage helper authored in this module because the
  shared one takes a different argument shape; and a coverage rule that widens rather than narrows,
  which is a parallelism gate quietly opening.

  ADR-003 §3. FF-12403.

  Scenario: the authored directory and the file beneath it stop sharing a wave
    Given a ready set whose earlier member declares `files: [src/commands/]` and whose later member declares `files: [src/commands/test.mjs]`
    When `aof work next --json` partitions that ready set
    Then the earlier member is in `wave` and the later member is in `heldSet`
    And the same two members are in one wave under the exact-string rule this replaces
    And the original ready set is returned unreordered and unreduced

  Scenario Outline: the wave's verdict for a pair of declared write sets
    Given a ready set whose earlier member declares <earlier> and whose later member declares <later>
    When the ready set is partitioned
    Then the later member is <verdict>

    Examples: the rule, its boundary, and the two properties that must not move
      | earlier               | later                    | verdict | why                                                        |
      | src/commands/         | src/commands/test.mjs    | held    | the file sits beneath the authored directory               |
      | src/commands/         | src/commands             | held    | the two resolve to one path, as they already did today     |
      | src/commands          | src/commands/test.mjs    | waved   | no authored slash, so one path was claimed and not a subtree |
      | src/commands/         | src/commands-old.mjs     | waved   | a shared prefix is not containment                         |
      | src/Commands/         | src/commands/test.mjs    | held    | the collision key case-folds, and still does               |
      | test/                 | test/arch/work/index.mjs | held    | 119/02's real declaration against 119/03's                 |
      | src/story-contract.mjs | src/ready-wave.mjs      | waved   | genuinely disjoint, exactly as today                       |

  Scenario: no pair that collides today enters a wave tomorrow
    Given every pair of declared write sets in this stream that collides under exact-string equality
    When the same pairs are tested under the shared coverage predicate
    Then every one of them still collides
    And the set of colliding pairs under coverage is a superset of the set under equality
    And no member held under the old rule is waved under the new one

  Scenario: an unresolvable write set is still handled conservatively
    Given a ready set whose second member's `files:` cannot be resolved
    When the ready set is partitioned
    Then that member is held rather than waved
    And a member with an unresolvable set that is FIRST in ready order is waved alone
    And a story whose `files:` is empty and whose `reads:` is empty is treated as unknown, not as writing nothing

  Scenario: the wave and the census read one rule, not two
    Given a dependent declaring `reads: [src/commands/test.mjs]` and a dependency declaring `files: [src/commands/]`
    When the wave is asked whether the two collide and the depends lane is asked whether the edge is witnessed
    Then both answers come from the same predicate call
    And `src/ready-wave.mjs` holds no second coverage rule and no `Set` intersection over raw declared strings
