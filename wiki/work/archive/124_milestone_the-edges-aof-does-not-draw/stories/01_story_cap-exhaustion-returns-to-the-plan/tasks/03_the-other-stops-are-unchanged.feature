@executable @cli @work @work-stream
Feature: Exactly one halt site becomes non-terminal, and a vocabulary that looks closed still is

  `LOOP_STOPS` (`src/work/loop.mjs:26-39`) is 12 members and each one ends the range today. This
  story changes one site — the shell's own cycle-cap halt at `src/commands/loop.mjs:1454-1457` —
  and a stop vocabulary in which one member quietly behaves differently is worse than an open one,
  so the other eleven are asserted rather than assumed.

  "The stop" and "the site" are not the same set, and the difference is measurable.
  `grep -n 'halt("cap-exhausted"' src/work/loop.mjs` finds `:506` (`review:rounds>=hard-cap`),
  `:542` (`review:rounds>=cap`) and `:823`/`:880`/`:910`/`:923` (`engine:cycle>=cap`) — of which
  `:910` is the one that is **reached in the live path**, via the direct `decideLoop` call at
  `src/commands/loop.mjs:1786` (a seventh entry into the decider that is not `nextDecision`, passing a
  real `cycle` and `gate`); the other three are reachable only through cycle-less `nextDecision` and
  stay unreached. Plus
  `mapLoopStoreRefusal` at `:837` (`run-store:attempts-exhausted`). Only the shell's
  `loop-cycle-cap` site hands off. The four engine-cycle sites are unreachable in the live path —
  `nextDecision` passes no `cycle` at any of its six call sites, so `boundedDrive`'s guard
  (`:821-829`) never fires — and 124/ADR-006 rules that unrepaired and ledgered, so "still not
  reached" is the correct post-condition for them, not "still terminal by test".

  ADR-005 §6's out-of-scope guard is worth keeping and cannot be driven end-to-end, and saying so
  is the honest form. `loopScopeIncludes` (`src/work/loop.mjs:681-689`) derives a driver number
  from a ref with `/^(\d+)(?:\/|$)/`, and `decideLoopScope` (`:665-679`) admits only a driver
  number or an `lo-hi` range. `listItems` (`src/work.mjs:395-421`) builds a story's `ref` as
  `` `${number}/${sNumber}` `` and its `parent` as `number` from one directory walk — so a derived
  plan ref always carries the same leading driver number as the unit it came from, and is in scope
  whenever the unit is. The guard is therefore exercised at the decider's own seam, with a `parent`
  that disagrees with the ref, and the structural reason it cannot arise through `aof work loop` is
  pinned so a future ref grammar cannot loosen it unnoticed.

  Line numbers into `src/work/loop.mjs` are the working tree's; at `adca2f80` those below line 361
  sit 32 lower (item 123's uncommitted diff, `:180-361`). `LOOP_STOPS` and `loopScopeIncludes`
  citations are unaffected.

  What would quietly undo this: a shared "should this halt end the range?" helper that a second
  stop is later routed through because it reads like the same question; a hand-off that fires for
  any `cap-exhausted` act rather than for the shell's cycle-cap site, quietly making a review-round
  cap non-terminal; a scope check dropped as dead code once someone measures that it never fires
  live; and a `--dry-run` probe or an `L1` pass that starts driving because the cap branch moved.

  ADR-005 §6, §7. 53/ADR-003. 124/ADR-006. FF-12404.

  Scenario Outline: each of the other eleven stops still ends the range where it is raised
    Given a loop invocation over a range with more ready units after the one that stops
    When <stop> is raised by <producer>
    Then the invocation returns that act without asking `work:next` again
    And `state.state` is <state> and `state.act.stop` is <stop>
    And `state.driven` gains no row after the stop
    And no `refine` drive is performed for any plan

    Examples: eleven stops — `LOOP_STOPS` less `cap-exhausted`, one row each
      | stop                | producer                          | state   |
      | uat-gate            | work:next:type=uat                | halted  |
      | dependency-blocked  | work:next:state=blocked           | blocked |
      | deadline-exhausted  | loop:schedule-to-close>=ceiling   | halted  |
      | progress-exhausted  | progress:resets>=bound            | halted  |
      | no-progress         | progress:failing-count            | halted  |
      | grade-indeterminate | the grade stop producer           | halted  |
      | session-needs-input | driver:needs-input                | halted  |
      | run-not-retryable   | run-store:not-retryable           | halted  |
      | retry-parked        | run-store:retry-parked            | halted  |
      | unmapped-item-type  | work:next:type=spike              | halted  |
      | operator-interrupt  | SIGINT                            | halted  |

  Scenario Outline: only one of `cap-exhausted`'s five producers hands off
    Given the producer <producer> raised at <site>
    When it reaches the loop's walk
    Then the outcome is <outcome>

    Examples: the sites that spell the stop, and what each does after this story
      | producer                     | site                          | outcome                            |
      | review:rounds>=hard-cap      | src/work/loop.mjs:506         | terminal, unchanged                |
      | review:rounds>=cap           | src/work/loop.mjs:542         | terminal, unchanged                |
      | run-store:attempts-exhausted | src/work/loop.mjs:837         | terminal, unchanged                |
      | engine:cycle>=cap            | src/work/loop.mjs:823,880,923     | still not reached (124/ADR-006) |
      | engine:cycle>=cap            | src/work/loop.mjs:910             | LIVE today, terminal, unchanged |
      | the shell's cycle cap        | src/commands/loop.mjs:1443-1457   | hands off, then bounded twice  |

  Scenario: a plan ref outside the declared scope is terminal and names the plan
    Given the decider called with a unit in scope whose supplied `parent` names a different driver
    When the cycle-cap branch is answered
    Then the act is a halt with `stop:"cap-exhausted"`, not a drive
    And the out-of-scope plan ref is named in the reported halt
    And no act is produced for any ref outside the declared scope

  Scenario: the scope check cannot be reached through the command, and that is a property not an accident
    Given `decideLoopScope`'s two admitted forms and `loopScopeIncludes`'s driver-number derivation
    When a derived plan ref is compared with the unit it was derived from
    Then both resolve to the same leading driver number for every item the directory walk can build
    And `aof work loop` admits no scope form under which they could differ
    And a story's `ref` and its `parent` are shown to come from the same directory walk

  Scenario: the range keeps running past a hand-off, which is the only behaviour that changed
    Given a range whose first ready unit exhausts its cap and whose later units close normally
    When the invocation runs
    Then `state.driven` holds the plan's `refine` row followed by rows for the later units
    And the invocation's final act is decided by the later units, not by the exhausted one
    And that same range terminates at the first unit today

  Scenario: the read-only surfaces are untouched
    Given `aof work loop <scope> --dry-run` and `aof work loop <scope> --level L1`
    When each runs over a range containing a unit that would exhaust its cap
    Then neither performs any drive
    And the probe reports one decision for the head of the ready set, as it does today
    And the `L1` pass reports one row per in-scope not-`done` item, as it does today
