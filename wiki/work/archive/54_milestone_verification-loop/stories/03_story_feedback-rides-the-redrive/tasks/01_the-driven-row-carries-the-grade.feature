@executable @cli @work @work-stream
Feature: The grade rides the driven row — ten top-level keys, and an act whitelist, both untouched

  `LoopState` is a frozen document with three consumers already contracted against it (62, 63, 78),
  and the contract is literal: `test/arch/acd-loop-probe-contract.test.mjs` asserts
  `Object.keys(state)` **deep-equals** ten keys, order included, and `actShape()`
  (`src/commands/loop.mjs:87-94`) strips anything outside `["ref","phase","stop","producer"]` from
  `state.act`. An eleventh key, or a `findings` key on `act`, is a renegotiation with three
  milestones — for a fact none of them asked for.

  The `driven` array is the one place in that frozen document which is **per-drive, additive, and
  pinned by nobody**: re-measured at HEAD, every assertion on `state.driven` in this tree is either
  `deepEqual(driven, [])` or a `.map()` projection (`test/loop-command-gate.test.mjs:37`,
  `sequencing:23`, `stops:251,434`) — **no test pins a `driven` row's key set**. So `drivenRow()`
  (`src/commands/loop.mjs:373-382`) gains the verdict, the code list and the observed counts, and
  nothing above it moves.

  The row carries the grade's **summary**, not its failures: what a reader of `LoopState` needs is
  what the verdict was, which codes produced it and how much was actually observed. The failure
  texts ride the fix payload and the run's brief (task 00) — the two places that already carry
  per-run detail.

  ADR-008 §1, §2; `53/ADR-004`; FF-5409.

  Scenario: a graded drive's row carries the verdict, the codes and the observed counts
    Given a loop that drove a build and graded it
    When its loop state is read
    Then the driven row for that drive carries the grade's verdict
    And it carries the grade's codes in the frozen order they are declared in
    And it carries the observed case totals

  Scenario: the ten top-level keys are exactly the ten, in the same order
    Given any loop state this shell returns
    Then its top-level key set deep-equals the frozen ten, order included
    And no key was added for the grade
    And the three consumers of that document renegotiate nothing

  Scenario: the act whitelist is untouched
    Given a loop state whose act is a drive
    Then the act carries only `ref`, `phase`, `stop` and `producer`
    And a halt act carries only `ref`, `stop` and `producer`
    And no grade fact reached the act

  Scenario: an ungraded drive's row is exactly what it is today
    Given a repository that declares no `work.rubric`
    And a loop that drove a build
    When its loop state is read
    Then the driven row carries the same keys it carries today
    And it carries no verdict, no codes and no counts

  Scenario Outline: every verdict is reported on the row, including the ones that stop the loop
    Given a loop whose grade returned <verdict>
    When its loop state is read
    Then the driven row's verdict reads <verdict>
    And the observed counts are reported whether or not the verdict is <verdict>

    Examples: the counts are the evidence, always reported
      | verdict       |
      | pass          |
      | fail          |
      | indeterminate |

  Scenario: a retried drive on the same cycle gets its own row
    Given a build phase that failed once and was retried on the same lineage
    And a grade on each attempt
    When the loop state is read
    Then each attempt has its own driven row
    And each row carries its own grade
    And no row overwrote another's

  Scenario: the existing projections over driven rows still read
    Given a loop state carrying graded driven rows
    When the shipped projections over `driven` are applied
    Then each still yields what it yields today
    And an empty loop still reports an empty driven array
