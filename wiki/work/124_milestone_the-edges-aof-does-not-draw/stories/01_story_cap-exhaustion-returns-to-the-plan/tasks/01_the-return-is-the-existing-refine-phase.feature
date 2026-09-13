@executable @cli @work @work-stream
Feature: The hand-off is the act the engine already returns, aimed at a plan ref nobody authored

  The return needs no new mechanism because the shape already exists and already runs.
  `decideLoopPhase` returns `boundedDrive(ref, "refine", …)` at `src/work/loop.mjs:892-894` (a
  milestone with zero stories) and at `:901` (a story with no `.feature` tasks); `drive()`
  (`:95-101`) mints `{act:"drive", ref, phase, cycle}`; the shell dispatches it as
  `work:drive-${phase}` (`src/commands/loop.mjs:1002`) into `createPhaseDriverCommand`
  (`src/commands/drive.mjs:99`), which admits exactly `PHASES = ["refine", "continue", "verify"]`
  (`:39`) and refuses anything else at `:100-102`. `refineDriverCommand` is registered as
  `work:drive-refine` (`drive.mjs:362`). So the plan hand-off is one existing act aimed at a
  different ref — not a new act kind, not a new command, not a `GATE_ORDER` row.

  The plan ref is DERIVED, and the derivation is not a matter of taste: `listItems`
  (`src/work.mjs:395-421`) builds a story's `ref` as `` `${number}/${sNumber}` `` and its `parent`
  as `number` from the SAME directory walk, so `parent` and the ref's leading driver number are one
  fact with two spellings. A record doc's authored `parent:` frontmatter key is never consulted for
  either — `validateWork` only checks that it resolves to some milestone (`src/work.mjs:1157-1158`).
  That makes "derived, never authored" testable rather than decorative: a story whose `STORY.md`
  says `parent: 77` while sitting under `124_milestone_…` must still hand off to `124`. A
  parentless story is a driver of the stream in its own right (`src/work.mjs:476`, `:1077-1081`)
  and its plan is itself.

  The vocabulary does not grow. `LOOP_STOPS` (`src/work/loop.mjs:26-39`) is 12 members, and every
  loop state publishes them verbatim as `stops` (`src/commands/loop.mjs:733-744`) — so "no
  thirteenth member" is readable straight off `aof work loop … --json`. `cap-exhausted` keeps its
  name for the terminal cases; what changes is what the decision carries, not what it is called.

  Line numbers into `src/work/loop.mjs` are the working tree's; at `adca2f80` those below line 361
  sit 32 lower (item 123's uncommitted diff, `:180-361`). Citations into `src/work.mjs`,
  `src/commands/loop.mjs` and `src/commands/drive.mjs` are unaffected.

  What would quietly undo this: a thirteenth `LOOP_STOPS` member, or a `plan` act kind, added
  because the hand-off "is not really a drive"; a phase string spelled at the hand-off site instead
  of taken from the set `drive.mjs` admits, so a rename reds only at an agent's runtime; a plan ref
  read off the record doc's `parent:` key, which agrees with the directory today and is authored
  and therefore will not always; and a hand-off act missing `cycle`, which the counter in task 02
  needs to bound it.

  ADR-005 §1, §3, §4. 62/ADR-003. FF-12404.

  Scenario: the hand-off is the existing drive act, and it is what actually runs
    Given a unit that has exhausted the shell's cycle cap and whose plan is inside the declared scope
    When the decider answers the cycle-cap branch
    Then the act is `{act:"drive", ref:<planRef>, phase:"refine"}` with a positive integer `cycle`
    And its key set is the key set `drive()` mints, with no key the engine's other drive acts lack
    And the command the shell invokes for it is `work:drive-refine`
    And `state.driven` gains a row `{ref:<planRef>, phase:"refine"}`

  Scenario Outline: the plan ref is derived from the item graph, never from an authored key
    Given a unit <ref> of type <type> whose record doc's frontmatter `parent:` reads <authored>
    When it exhausts the shell's cycle cap
    Then the derived plan ref is <plan>
    And the derivation reads no frontmatter key of the unit's record doc

    Examples: the three shapes a driven unit can have, and the one that disagrees with itself
      | ref    | type      | authored | plan | why                                        |
      | 124/01 | story     | 124      | 124  | a story's plan is its parent milestone      |
      | 124    | milestone | absent   | 124  | a driver's plan is itself                   |
      | 79     | story     | absent   | 79   | a parentless story IS a driver of the stream|
      | 124/01 | story     | 77       | 124  | the directory decides, the key does not     |

  Scenario: the phase comes from the set the driver admits
    Given the phase the hand-off carries
    When it is compared with `PHASES` in `src/commands/drive.mjs:39`
    Then it is a member of that set
    And a registered command `work:drive-<phase>` exists for it
    And no phase string is introduced that `createPhaseDriverCommand` would refuse at `drive.mjs:100`

  Scenario: the stop vocabulary is exactly as long as it was
    Given `LOOP_STOPS` at `src/work/loop.mjs:26-39`
    When the hand-off ships
    Then it still has 12 members in the same order
    And `aof work loop <scope> --json` reports those same 12 as `state.stops`
    And no act kind outside `{done, drive, gate, halt}` is ever reported
    And no new command id is registered by this change
