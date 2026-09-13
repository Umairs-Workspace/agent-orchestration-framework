@executable @cli @work @distribution
Feature: An autonomous assignment dispatches a loop launch carrying its scope and its level, and nothing is typed into a session

  An autonomous assignment is today a sentence typed into an interactive session, and that session
  decides for itself the order of refine, build and verify on a machine nobody is watching. What
  replaces it has to carry the same two facts — which scope, at which level — as data a machine reads,
  because the entire point of the change is that the ordering stops being one model's reading of a
  prompt and becomes a sequence in code with declared gates.

  Two facts, and both of them written down. A launch that named a scope and left the level to be
  defaulted somewhere downstream would be the same unattended run with one fewer thing stated, and the
  level is precisely the field this arc waited to be able to state at all. So the level rides the
  launch explicitly, at every dispatch, and nothing on the assignment path raises it: a mesh assignment
  is not a place where autonomy is granted, only a place where a request is made.

  What this refuses, in order of how plausible the mistake is. A directive carrying both a launch and a
  slash-command string, so that whichever end reads first decides what runs. A scope that is not the ref
  the operator assigned — most temptingly a story-shaped ref quietly widened to the milestone above it,
  which is a whole-stream walk nobody asked for, and just as bad a milestone narrowed to the one story
  a worker would have started with. And the loop's argv rendered into the command field so that older
  workers "still do something", which is the alternative this decision rejects by name: an old worker
  would type that argv into a session as prose and a model would decide what to make of it.

  A wrong implementation slips past by resolving once and remembering. A scope or a level decided when
  the assignment was minted, rather than when the directive was sent, is a stale permission carried to
  a machine nobody is watching — and it would also have to be stored somewhere, which is why the record
  having nowhere to keep it is the same rule seen from the other side.

  ADR-006 §1, §3. ADR-005 §2. FF-6306.

  Scenario: an autonomous assignment goes out as a loop launch rather than as a command to type
    Given an item assigned to a worker on the autonomous phase
    When the directive for it is dispatched
    Then the directive carries a launch whose kind is a loop rather than a session
    And the launch names the scope the loop is to walk and the level it is to walk it at
    And the directive carries no slash-command string for that assignment
    And no other assignment's directive changes as a result

  Scenario: nothing is typed into a session for a loop launch
    Given an assignment on the autonomous phase whose worker has accepted it
    When the worker acts on the directive
    Then the driver is asked to run the declared launch rather than to type a command into a session
    And no `/aof:` text is delivered to any session's input for that assignment
    And the order of refine, build and verify is the loop's, not a session's reading of a prompt

  Scenario Outline: the assignment path states no level at all, and nothing on it can introduce one
    Given an item assigned on the autonomous phase
    And <declaration>
    When the directive is dispatched
    Then the launch carries no level of any kind
    And the run proceeds at <level>

    Examples: a mesh assignment is the one signal that carries no level, and none of these makes it one
      | declaration                                               | level                          |
      | nothing on the assignment path declaring a level          | the loop's own default         |
      | a config key in the workspace asking for L3               | the loop's own default, unchanged |
      | an environment variable on the control asking for L3      | the loop's own default, unchanged |
      | an extra argument passed to the assign verb asking for L3 | the loop's own default, unchanged |

  Scenario: the level is the loop's to default, and this path does not restate it
    Given an item assigned on the autonomous phase
    When the launch that goes out is read
    Then no part of it names a level
    And the default that applies is read from the loop rather than written here
    And a change to the loop's own default changes this launch with no edit on the assignment path

  Scenario Outline: the scope is the ref that was assigned, and no ref becomes one nobody named
    Given an assignment on the autonomous phase for <item>
    When the directive is dispatched
    Then <outcome>
    And <never> is not observed for that assignment

    Examples: a widening and a narrowing are the same defect in opposite directions
      | item                                        | outcome                                                                                             | never                                       |
      | a milestone, `63`                           | the launch carries `63` as its scope, character for character                                       | a scope the operator did not name           |
      | a milestone whose stories are unrefined, `63` | the launch carries `63` as its scope, character for character                                       | a scope narrowed to one story under it      |
      | a story, `63/03`                            | no loop is launched over a scope the loop declares no form for, and the refusal names the scope     | a run that walks the whole of `63`          |

  Scenario: the refusal of a scope the loop cannot express is visible without opening the session
    Given an assignment on the autonomous phase for a ref the loop declares no scope form for
    When the operator reads what the control sent and what the assignment did
    Then the refusal is readable there, carrying a code and naming the scope it refused
    And the assignment does not sit in a state indistinguishable from a worker that never answered
    And no session is spawned to be told about it instead

  Scenario: the refusal happens before anything is sent, not inside a run nobody is reading
    Given an assignment on the autonomous phase for a story-shaped ref
    When the dispatch is attempted
    Then no directive of any kind leaves the control for that assignment
    And no worktree is minted and no deadline starts running for it
    And the reason is recorded where the operator already looks, rather than only inside a launched process

  Scenario: the refusal is scoped to the phase that resolves a loop, and reaches no other
    Given the same story-shaped ref assigned on the continue phase, and again on the verify phase
    When each is dispatched
    Then each produces its directive exactly as it does today
    And neither is refused for the shape of its ref
    And the gate ladder the assign verb applies is unchanged for every phase

  Scenario: the launch is resolved when the directive is sent, never remembered from when it was minted
    Given an item assigned on the autonomous phase
    When the assignment is minted and the directive is dispatched some time later
    Then nothing recorded at mint time carries a scope, a level or a launch
    And the launch that goes out is the one resolved at dispatch
    And a second dispatch of the same item resolves again rather than replaying the first answer

  Scenario: the loop launch and the typed command are alternatives, never both
    Given one assignment on each of the dispatchable phases
    When every directive they produce is read
    Then no directive carries both a loop launch and a command to type
    And the one that carries a launch is the autonomous phase's, and only that one
