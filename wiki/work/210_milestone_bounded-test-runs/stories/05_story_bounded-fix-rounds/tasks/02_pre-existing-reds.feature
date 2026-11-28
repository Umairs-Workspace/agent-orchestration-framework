@cli @work @validate
Feature: a red that also fails on the work's base is pre-existing, and is not the story's to fix

  WHY. Agents chased environment flakes and old breakage round after round, because nothing
  told them a red was not theirs. A red is pre-existing when the same suite fails the same case on
  the work's base. The base is the commit that added the working item's record doc. HEAD is not
  used, because HEAD already holds the change once it is committed, and is the gated commit after
  a gate (ADR-006). The base runs in its own prepared worktree through the same runner, so its
  result is an ordinary record and is reused. When it cannot be measured, the label says so and
  nothing is assumed. The cases drive the baseline against a temporary repository with an injected
  runner and prepare step.

  Rule: R3 · A red that also fails on the work's base is pre-existing, and is not the story's

    @executable
    Scenario: E8 · a case that fails on the base is labelled, shown apart, and not counted
      Given story 17/02 has a running run, and its STORY.md was added at commit "base17"
      And case X in suite A fails in the working tree and also in a clean tree at "base17"
      When a red run with X is recorded
      Then X is labelled pre-existing
      And the summary shows X apart from the story's failures
      And X is not in the chain's failure set
      And the run is still red

    @executable
    Scenario: E9 · a case that fails only in the working tree is not labelled
      Given story 17/02's base is "base17", and case Y in suite A passes in a clean tree at "base17"
      When a red run with Y is recorded
      Then Y is labelled not pre-existing, and counts in the chain's failure set

    @executable
    Scenario: E10 · a base that cannot be prepared labels every failure unmeasured
      Given story 17/02's base is "base17", and the declared worktree prepare step exits 1
      When a red run with X and Y is recorded
      Then X and Y are labelled "unmeasured", with the prepare step's failure as the reason
      And both count in the chain's failure set

    @executable
    Scenario Outline: which commit is the base
      Given <state>
      When a red run is recorded
      Then the base is <base>

      Examples:
        | state                                                                     | base                                             |
        | story 17/02 has a running run, and its STORY.md was added at "base17"     | "base17"                                         |
        | the red is milestone 17's gate record, and its SPEC.md was added at "m17" | "m17"                                            |
        | no item is running, and the working tree has uncommitted changes          | HEAD                                             |
        | no item is running, and the working tree is clean                         | none: the run says "baseline unmeasured"         |

    @executable
    Scenario: the base's result is reused in later rounds
      Given a round labelled X pre-existing against "base17"
      When the next round fails X again on the same base
      Then the baseline is answered from its record, and no runner is launched in the baseline tree

    @executable
    Scenario: a suite that does not exist at the base is not pre-existing
      Given suite D was added after "base17", and fails in the working tree
      When a red run with D's failure is recorded
      Then D's failure is labelled not pre-existing

    @executable
    Scenario: only the newest two baseline trees are kept
      Given baseline trees exist for three bases, used in the order "b1", "b2", "b3"
      When the baselines are pruned
      Then the trees for "b2" and "b3" remain and the tree for "b1" is removed

    @executable @bug @finding-F-07
    Scenario: the baseline tree is added through the one worktree implementation
      When a baseline tree is made for a base
      Then it is added by the execution package's worktree implementation
      And no module under "packages/work/src/testing/" spawns "git worktree add"

    @executable @bug @finding-F-08
    Scenario: the working item's record doc is read from the identity leaf's one map
      When the base is resolved for a running story or a gate's milestone
      Then the record doc is named by "RECORD_DOC_BY_TYPE" from "packages/work/src/identity.mjs"
      And "packages/work/src/testing/baseline.mjs" declares no type → record-doc map of its own

    @executable @bug @finding-F-11
    Scenario: a base that lacks the working tree's instructions file is still measured
      Given the working project declares "work.test.instructions" as "wiki/TESTING.md"
      And the base commit holds no "wiki/TESTING.md"
      When a red run's failures are labelled against that base
      Then the base's run answers, and each failure is labelled true or false
      And no failure is labelled "unmeasured" for a missing instructions file
