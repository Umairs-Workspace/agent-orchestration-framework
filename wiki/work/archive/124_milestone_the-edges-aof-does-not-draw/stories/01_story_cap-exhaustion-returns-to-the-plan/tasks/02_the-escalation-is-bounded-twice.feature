@executable @cli @work @work-stream
Feature: The return to the plan is itself an attempt, bounded by the counter that already exists

  Two bounds with two different lifetimes, and neither adds a counter. The first is the walk's own
  memory: an exhausted unit is handed back to its plan at most once, then SET ASIDE for the rest of
  the invocation. That is required, not tidy — the walk re-asks `work:next` on every iteration
  (`src/commands/loop.mjs:1396`), and a still-ready item is offered again forever, so without
  set-aside the hand-off is an infinite loop dressed as progress. The walk has the alternatives
  already in hand: `nextWork` returns `readySet` beside the head (`src/work.mjs:1563`), each member
  in `ready()`'s shape (`:1301-1308`).

  The second is the shell's existing `cycles` Map. A refine drive is a drive, so it increments
  `${planRef}\0refine` in the same Map (`src/commands/loop.mjs:1220`, keyed at `:1443`, bounded at
  `:1446`) against the same `resolved.cap` (`:809` — `work.autonomous.maxAttempts`, default 3). No
  new Map, no new bound, no new persisted key: the loop declaration is 8 keys
  (`src/work/loop.mjs:1043-1057`) and `LOOP_FIX_TRANSPORT_KEYS` is 9 (`src/commands/loop.mjs:516-526`).

  The two lifetimes fall out of where each lives, and that is a property worth pinning. Set-aside
  is in-process, so a new invocation may offer the unit again. The plan counter is reconstructed
  from run records on `--resume` — `reconstructCycleCounts` (`src/commands/loop.mjs:1122-1133`)
  rebuilds `${itemRef}\0${phase}` from each record's `brief.loop` declaration — and the refine drive
  mints its run against the PLAN ref, so the re-entry count survives a resume precisely because
  nothing new was stored.

  One case closes itself and must be shown to. When a milestone exhausts under phase `refine`, its
  derived plan is itself (task 01), so `${planRef}\0refine` IS the key that just tripped: the
  re-entry is refused on its first attempt and the halt stays terminal. The bound "re-enter while
  the count under `${planRef}\0refine` is below `cap`" covers both that case and a story exhausting
  under `continue`, whose plan key is a different, untouched one — which is why it is stated once
  rather than special-cased.

  Line numbers into `src/work/loop.mjs` are the working tree's; at `adca2f80` those below line 361
  sit 32 lower (item 123's uncommitted diff, `:180-361`).

  What would quietly undo this: a second Map, a `Set` of "already handed off" refs persisted beside
  the runs, or a ninth declaration key, any of which makes the bound a thing to keep in sync rather
  than a thing already kept; a set-aside that also suppresses the unit's dependants, silently
  shrinking the range; a refine drive that resets the exhausted unit's build cycles, which is a cap
  an agent's action can clear; and a walk that, having set aside every ready member, keeps calling
  `work:next` instead of stopping.

  ADR-005 §5, §6. FF-12404.

  Scenario: an exhausted unit is handed back once and then stepped over
    Given a range whose first ready unit exhausts its cycle cap and stays `ready` afterwards
    When the invocation continues
    Then `state.driven` holds exactly one `{ref:<plan>, phase:"refine"}` row for that unit's plan
    And no further `state.driven` row names the exhausted unit
    And the next act targets another member of the `readySet` `work:next` returned
    And the exhausted unit's own status is not written by the loop

  Scenario Outline: a plan is re-entered at most `cap` times in one invocation
    Given `aof work loop <scope> --cap <cap>` over <units> units that all exhaust and share one plan
    When the invocation runs to its stop
    Then `state.driven` holds exactly <refines> rows with `phase:"refine"` and the plan's ref
    And their `cycle` values are 1..<refines> under the key `${planRef}\0refine`
    And the invocation ends on a terminal `cap-exhausted` halt once the plan is exhausted

    Examples: fewer units than cap, exactly cap, and more
      | scope   | cap | units | refines |
      | 120-130 | 3   | 2     | 2       |
      | 120-130 | 3   | 3     | 3       |
      | 120-130 | 3   | 5     | 3       |
      | 120-130 | 1   | 4     | 1       |

  Scenario: no counter and no persisted key is added
    Given the shell's counter map and the shapes it is rebuilt from
    When a plan hand-off has occurred
    Then the counter map's key set is exactly `${ref}\0${phase}` strings, with `refine` among the phases
    And the loop declaration written to each run record still has exactly its 8 keys
    And `LOOP_FIX_TRANSPORT_KEYS` is still exactly the same 9 keys
    And no file is written under `.aof/` that was not written before this change

  Scenario: the plan counter survives a resume and the set-aside does not
    Given an invocation that handed one unit back to its plan and was then interrupted
    When it is resumed with `aof work loop <scope> --resume`
    Then the plan's `${planRef}\0refine` count is reconstructed from the run records at its pre-interrupt value
    And the previously set-aside unit may be offered again in the resumed invocation
    And the plan is still re-entered at most `cap` times counting the pre-interrupt re-entries

  Scenario: a plan re-entry resets nothing
    Given a unit that exhausted at `cap` cycles under phase `continue`
    When its plan has been driven `refine` and a later invocation offers the unit again
    Then the unit's `${ref}\0continue` count is not reduced by the refine drive
    And within one invocation the unit is never driven a `cap`+1th time

  Scenario: a unit whose plan is itself does not re-enter itself
    Given a milestone that exhausts the shell's cycle cap under phase `refine`
    When the cycle-cap branch is reached
    Then the derived plan ref is the milestone itself and its `${planRef}\0refine` count is already at `cap`
    And the decision is a terminal `cap-exhausted` halt naming that ref
    And no additional `refine` drive is performed for it

  Scenario: the walk stops when it has nothing left to offer
    Given a range in which every member of the ready set has been set aside
    When the walk asks `work:next` again
    Then the invocation returns rather than iterating further
    And the returned `state.state` is `halted`, never `done`
    And the returned act's `stop` is a member of `LOOP_STOPS` and its `ref` is a unit that exhausted
