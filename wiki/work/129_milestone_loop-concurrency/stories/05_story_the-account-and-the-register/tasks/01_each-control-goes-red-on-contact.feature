@executable @cli @work @validate
Feature: each control goes red under the probe its register row names, and the subject restores byte-identical

  A control nobody has seen red is indistinguishable from a broken one. For each of the seven
  ids the ARCHITECTURE register names a RED PROBE — what to change to make the control fail —
  and this task performs each probe against the shipped bytes, observes exactly the named legs
  red with the named message, restores the subject (verified byte-identical by sha256), and
  hands the observed messages to `VERIFICATION.md`'s register (written there by the single
  writer at verify). A probe that reds the WRONG leg, or reds nothing, is a defect of the control
  and is fixed in this story, never recorded as "observed". The probe column below is the
  register row's own wording; a probe the register does not name is not admitted here. Where a
  probe reaches two legs of one control, each leg has its own row and its own message.

  Background:
    Given the four landed controls and the extended never-discards control
    And the sha256 of each subject file's bytes, taken before any probe

  Scenario Outline: the named probe reds the named leg with the named message
    Given `<subject>` is changed as the register row for <id> describes: <probe>
    When `<file>` runs under an isolated global home
    Then the `<leg>` leg fails with a message containing <message>
    And every other case in `<file>` not named for this probe stays green
    And after `<subject>` is restored its sha256 equals the pre-probe sha256 and `<file>` is green

    Examples:
      | id       | file                                            | subject                   | probe                                                                              | leg                     | message                                                  |
      | FF-12901 | acd-loop-concurrency-single-home.test.mjs       | src/loop-bounds.mjs       | declare `const resolveLanes = (v) => v;` and add `"work.loop.lanes": resolveLanes` to `LOOP_BOUND_VALUE_RESOLVERS` (an undeclared identifier throws at import and reports the FILE unusable, not the leg red)              | leg 1 (the maps)        | `work.loop.lanes` and `LOOP_BOUND_VALUE_RESOLVERS`       |
      | FF-12901 | acd-loop-concurrency-single-home.test.mjs       | src/loop/wave.mjs         | spell the literal `"refine_first"` in a branch (code, not a comment)               | leg 2 (the sweep)       | `src/loop/wave.mjs` and `refine_first`                   |
      | FF-12902 | acd-loop-family-boundary.test.mjs               | src/loop/wave.mjs         | import `driveInteractiveClaudeSession` from `../agent-session-driver.mjs`          | FF-12902 import leg     | `src/loop/wave.mjs` and `agent-session-driver`           |
      | FF-12902 | acd-loop-family-boundary.test.mjs               | src/loop/child-drive.mjs  | pass `shell: true` in the `runBounded(` options                                    | FF-12902 shell leg      | `src/loop/child-drive.mjs` and `shell:`                  |
      | FF-12906 | acd-loop-family-boundary.test.mjs               | src/loop/wave.mjs         | import and call `partitionReadySetByDeclaredFiles` from `../ready-wave.mjs`        | FF-12906 import leg     | `src/loop/wave.mjs` and `ready-wave`                     |
      | FF-12903 | acd-lane-records-and-the-declaration.test.mjs   | src/loop/wave.mjs         | mint the lane run against `resolveItemExact(ctx, ref)` in place of `resolveRefInWorktree(…)` | FF-12903 structural leg | `transitionRunStart` and `resolveRefInWorktree`  |
      | FF-12903 | acd-lane-records-and-the-declaration.test.mjs   | src/loop/wave.mjs         | mint the lane run against `resolveItemExact(ctx, ref)` in place of `resolveRefInWorktree(…)` | FF-12903 fixture leg    | `runs/` and the primary story dir's path         |
      | FF-12907 | acd-lane-records-and-the-declaration.test.mjs   | src/loop/wave.mjs         | mint a lane run with `scope: ref` overriding the wave run's `brief.loop`           | FF-12907 structural leg | `src/loop/wave.mjs` and `brief.loop.scope`               |
      | FF-12907 | acd-lane-records-and-the-declaration.test.mjs   | src/loop/wave.mjs         | mint a lane run with `scope: ref` overriding the wave run's `brief.loop`           | FF-12907 fixture leg    | `scope` and the story ref                                |
      | FF-12905 | acd-lane-grade-is-lane-scoped.test.mjs          | src/loop/wave.mjs         | hand `settleStoryCycle` the loop's own `ctx` in place of the lane ctx for each lane | FF-12905 structural leg | `src/loop/wave.mjs` and `settleStoryCycle`               |
      | FF-12905 | acd-lane-grade-is-lane-scoped.test.mjs          | src/loop/wave.mjs         | hand `settleStoryCycle` the loop's own `ctx` in place of the lane ctx for each lane | FF-12905 fixture leg    | `projectRoot` and the primary root's path                |
      | FF-12904 | acd-gate-propagation-never-discards.test.mjs    | src/work/dispatch.mjs     | add `["reset", "--hard", base]` to `mergeDispatchLaneHome`                         | forbidden-forms leg     | `offenders` and `dispatch.mjs — reset --hard: reset --hard` |

  Scenario Outline: a plant the register's probe does not describe leaves the control green
    Given `<subject>` is changed so that <plant>
    When `<file>` runs under an isolated global home
    Then every case passes
    And after `<subject>` is restored its sha256 equals the pre-probe sha256

    Examples:
      | file                                          | subject                 | plant                                                                         |
      | acd-loop-concurrency-single-home.test.mjs     | src/loop/wave.mjs       | `"refine_first"` appears only inside a `//` comment                           |
      | acd-gate-propagation-never-discards.test.mjs  | src/work/dispatch.mjs   | it gains the argv `["worktree", "remove", "--force", lanePath]`               |
      | acd-gate-propagation-never-discards.test.mjs  | src/work/dispatch.mjs   | it gains the argv `["reset", "-q", "--", ".aof"]`                             |

  Scenario: a probe's collateral red in a standing control is recorded as collateral, never fixed away
    Given the FF-12901 probe (`resolveLanes` declared and the `"work.loop.lanes"` entry added) is in place
    When `test/arch/loop/acd-loop-cap-single-home.test.mjs` runs under an isolated global home
    Then its `arch/61 FF-6111` case fails with a message containing `a value-shaped resolver cannot name a key its config-shaped sibling does not`
    And the story's OUTCOME.md names that red beside FF-12901's row as collateral of the same probe

  Scenario: a probe that reds nothing is a defect of the control, not an observation
    Given a probe from the table reds no leg on first contact
    When the story's build encounters it
    Then the control is amended until the probe reds the named leg with the named message
    And the amendment is recorded in the story's OUTCOME.md with the leg that was blind

  Scenario: the observed messages are handed to the verification register
    When every probe in the table has been observed
    Then the story's OUTCOME.md lists, per id, the probe performed, the leg that went red and the first line of its message, ready for `VERIFICATION.md`'s red-probe cell
    And the sha256 of `wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md` equals its value before the story

  Scenario: FF-12901 leg 1 pins the key set, so the probe reds it by construction
    When `test/arch/loop/acd-loop-concurrency-single-home.test.mjs` is read
    Then its leg 1 asserts `Object.keys(LOOP_BOUND_VALUE_RESOLVERS)` sorted deep-equals the eight FF-6901 keys plus `work.loop.concurrency`, sorted
    And the same assertion is made over `LOOP_BOUND_CONFIG_RESOLVERS`
