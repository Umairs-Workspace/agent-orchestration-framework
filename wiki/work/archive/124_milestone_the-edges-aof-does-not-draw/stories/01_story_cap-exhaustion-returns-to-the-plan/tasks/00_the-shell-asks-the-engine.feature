@executable @cli @work @work-stream
Feature: One module decides cap exhaustion, and the shell stops being the second one

  `grep -n '"cap-exhausted"' src/commands/loop.mjs` returns exactly one line —
  `src/commands/loop.mjs:1454`, `haltDecision("cap-exhausted", act.ref, "loop-cycle-cap")` — while
  `grep -c` for the same literal in `src/work/loop.mjs` returns 8. That one line is the only cap
  this repository actually enforces. It sits behind a counter the shell keeps for itself: a local
  `cycles` Map (`src/commands/loop.mjs:1220`) keyed `${act.ref}\0${act.phase}` (`:1443`), read at
  `:1444`, incremented at `:1445`, compared at `:1446` — checked AFTER `act` has already been
  decided — and when it trips the shell builds its own halt and returns the state (`:1454-1457`),
  ending the range without asking anything.

  The milestone's first framing said the loop cannot reach `refine`. Measured, it already does,
  live, today. `decideLoopPhase` returns phase `"refine"` for a milestone with zero stories
  (`src/work/loop.mjs:892-894`) and for a story with no `.feature` tasks (`:901`); the shell
  dispatches whatever phase it holds as `work:drive-${phase}` (`src/commands/loop.mjs:1002`), and
  `PHASES = Object.freeze(["refine", "continue", "verify"])` (`src/commands/drive.mjs:39`) gates
  that dispatch at `drive.mjs:100`. `decideLoopPhase` is reached on every tick: `nextDecision`
  (`src/commands/loop.mjs:857-870`) calls `decideLoop` (`src/work/loop.mjs:1006-1008`) →
  `decideLoopInvocation` (`:981`) → `decideLoopOutcome` (`:938`) → `decideLoopPhase` (`:860`).
  `GATE_ORDER` (`:74-80`) is a different, narrower declaration — the cost ladder inside one
  `continue` cycle — and is not this seam. The gap is not the dispatch; it is that the cap which
  halts never asks again.

  Nothing here wakes the engine's own cap. `nextDecision` passes no `cycle` at any of its six call
  sites (`:874`, `:955`, `:1226`, `:1334`, `:1369`, `:1396`), so `boundedDrive`'s guard
  (`src/work/loop.mjs:821-829`) never fires and four decider branches stay unreachable; ADR-006
  rules that deliberately unrepaired and ledgers it. The consult specified here is a SEPARATE call
  carrying the shell's OWN `cycle` and `cap`, and an ordinary tick keeps the act it returns today.

  Every line number above is the WORKING TREE's. At `adca2f80` each citation into
  `src/work/loop.mjs` below line 361 sits 32 lines lower (`decideLoopPhase` at `:828`,
  `boundedDrive` at `:789`); item 123's uncommitted diff is confined to `:180-361` and touches
  nothing named here. `LOOP_STOPS` (`:26-39`) and `GATE_ORDER` (`:74-80`) are unaffected either way.

  What would quietly undo this: a second `haltDecision("cap-exhausted", …)` written at the next cap
  site because that is where the trip is detected; a consult whose answer is computed and then
  discarded on one branch, with the shell's own `return` still standing behind it; a decider handed
  the engine's always-`undefined` `cycle` instead of the shell's counter, which changes how many
  drives a unit gets without changing a single message; and a terminal halt that reaches the report
  line having lost the accumulated record `54/03` put there.

  ADR-005 §1, §2. ADR-006. 54/03. FF-12404.

  Scenario: the stop is named in one module, and the shell names none
    Given `src/commands/loop.mjs:1454` is today the shell's own `cap-exhausted` halt
    When the cycle-cap branch consults the engine instead
    Then no comment-stripped module under `src/` outside `src/work/loop.mjs` spells the literal `cap-exhausted`
    And no act reported by any invocation carries the producer `loop-cycle-cap`
    And every reported `cap-exhausted` act still carries a non-empty `producer` string

  Scenario Outline: the act the invocation performs is the act the decider returned
    Given a loop invocation over scope <scope> whose shell counter has reached `cap` for <ref> under phase <phase>
    And <entries> prior plan re-entries recorded for the derived plan
    When the shell's cycle-cap branch is reached
    Then calling the exported decider alone with the same `{ref, type, parent, phase, cycle, cap, scope}` returns <act>
    And the act the invocation reports is deep-equal to that returned act
    And the `cycle` and `cap` the decider was given are the shell counter's value and `resolved.cap`

    Examples: the answers the cycle-cap branch can receive
      | ref    | phase    | scope   | entries | act                                     |
      | 124/01 | continue | 120-130 | 0       | drive 124 refine                        |
      | 124    | verify   | 120-130 | 0       | drive 124 refine                        |
      | 124    | refine   | 120-130 | cap     | halt cap-exhausted (re-entry exhausted) |
      | 124/01 | continue | 124     | cap     | halt cap-exhausted (re-entry exhausted) |

  Scenario Outline: a unit still gets exactly `cap` drives before it exhausts
    Given `aof work loop <scope> --cap <cap>` over a unit whose drives never close it
    When the invocation runs to its stop
    Then `state.driven` holds exactly <cap> rows for that unit under one phase
    And their `cycle` values are 1..<cap> with no gap and no repeat
    And the decision that follows the <cap>th is the cap-exhaustion decision, never the <cap>+1th drive

    Examples: the default and one override
      | scope   | cap |
      | 124     | 3   |
      | 120-130 | 1   |
      | 120-130 | 5   |

  Scenario: a tick that does not trip the shell's counter is unchanged
    Given a loop invocation whose shell counter is below `cap` for the offered unit
    When the decision tick runs
    Then the act performed is the act `decideLoop` already returns today for those same facts
    And `nextDecision` passes no `cycle` at any of its six call sites
    And no `cap-exhausted` act is produced from `src/work/loop.mjs:823`, `:880` or `:923`
    # NOT `:910`. It is LIVE today through the direct `decideLoop` call at `src/commands/loop.mjs:1786`,
    # which passes a real `cycle` and `gate` and is NOT one of `nextDecision`'s six call sites — proven
    # end-to-end by `test/loop/loop-only-fail-redrives.test.mjs:265-266` (producer `engine:cycle>=cap`,
    # three continue rows, cap 3). 124/ADR-006's "four dead branches" is three; this story must not
    # assert `:910` unreached, and must leave its existing behaviour alone.

  Scenario: a terminal cap-exhausted halt still carries the account it was flagged with
    Given a loop invocation that minted graded runs and then reached a terminal cap-exhaustion
    When the halt is reported
    Then the report line carries `cap=` with the invocation's resolved cap
    And it carries the `findings` union over the runs this `loopRunId` minted, empty only when that union is empty
    And no reported `cap-exhausted` halt carries a hardcoded empty `findings`
