@executable @cli @work @work-stream
Feature: The cost ladder — five frozen rows, and the cheapest thing that can say "this is wrong" says it first

  `GATE_ORDER` (`src/work-loop.mjs:39-43`) is three frozen rows today and names exactly one gate
  command, `work:validate`. Measured at refine: `grep -ci "doctor|controls|fitness"` over both loop
  modules returns **0**. The SPEC's own headline — *"`validate` and the fitness functions grade
  before any review turn is spent"* — is half wired, and the fitness half has never graded anything
  in the loop.

  This task lands the order. Four gates, ordered by strictly increasing cost, each able to answer
  alone:

  | # | gate              | cost                                        |
  |---|-------------------|---------------------------------------------|
  | 1 | `work:validate`   | in-process, pure, no configuration          |
  | 2 | `work:doctor`     | in-process, one snapshot                    |
  | 3 | `work:grade --run`| one bounded child process                   |
  | 4 | `drive verify`    | a whole agent session — minutes and tokens  |

  As five `GATE_ORDER` rows that is: `drive continue`, `gate work:validate`, `gate work:doctor`,
  `gate work:grade`, `drive verify`. **Each gate short-circuits the ones after it** — that is
  "deterministic before model" generalised from a boundary into a ladder, and it is what makes this
  story worth landing before the runner exists.

  Two boundaries are stated so the ladder is not half-asserted in silence. **The `work:grade` rung's
  own invocation is 54/03's**, which depends on this story; the row is declared here because
  `GATE_ORDER` is a frozen declaration and 54/03 rebases onto it. So this contract asserts the rung's
  **position** — after the doctor, before the review turn — and that a red doctor never reaches it;
  what the grade's own verdict does to the loop is `54/03/tasks/03_only-fail-redrives.feature`.

  The doctor rung's scope, severity and admitted code set are the sibling task,
  `01_the-doctor-gate-scope-and-severity.feature`. This one is about ORDER and SHORT-CIRCUIT only.

  ADR-007 §1; `53/ADR-005` §6 (which declared the order *"because 54 depends on it"*); FF-5409.

  Scenario: the loop declares the five-step order it will walk
    Given a loop invoked on a story in read-only mode
    When its declaration is rendered
    Then the declared order is five steps
    And the steps read `drive continue`, `gate work:validate`, `gate work:doctor`, `gate work:grade`, `drive verify`, in that order
    And every gate step names a command an operator can invoke by hand

  Scenario: a red validate never pays for the doctor
    Given a story whose build phase completed
    And `work:validate` reports at least one finding for that story
    When the loop reaches its gate block
    Then `work:doctor` is not invoked
    And no runner is spawned
    And no verify session is driven
    And the loop re-drives `continue` carrying the validate findings

  Scenario: a red doctor never pays for the runner, and never for a review turn
    Given a story whose build phase completed
    And `work:validate` reports no finding for that story
    And `work:doctor` reports an admitted error for that story
    When the loop reaches its gate block
    Then `work:validate` was invoked before `work:doctor`
    And no runner is spawned
    And no verify session is driven
    And the loop re-drives `continue` carrying the doctor findings

  Scenario: every gate answers alone, so the doctor rung is useful before the runner exists
    Given a repository that declares no `work.rubric`
    And a story whose build phase completed
    And `work:doctor` reports an admitted error for that story
    When the loop reaches its gate block
    Then the doctor rung still stops the ladder
    And the absence of a configured runner did not weaken the rungs before it

  Scenario Outline: the first red rung is where the ladder stops
    Given a story whose build phase completed
    And the gate results <validate>, <doctor>
    When the loop reaches its gate block
    Then the last gate invoked is <last invoked>
    And a verify session is driven only when <verify driven> reads yes

    Examples: the ladder is walked in order and stops at the first red
      | validate | doctor | last invoked  | verify driven |
      | red      | —      | work:validate | no            |
      | green    | red    | work:doctor   | no            |
      | green    | green  | work:doctor   | yes           |

  Scenario: a clean ladder still crosses to verify exactly as it does today
    Given a story whose build phase completed
    And every deterministic gate reports clean for that story
    When the loop reaches its gate block
    Then the loop drives `verify` for that story
    And it does so without asking `work:next` for a fresh decision
    And the three shipped loop suites observe the same sequence they observe today

  Scenario: the ladder's rungs are invoked at the driven item's own scope
    Given a loop driving story `54/02`
    And a sibling item elsewhere in the stream carrying its own findings
    When the loop reaches its gate block
    Then every gate is invoked with the driven item's own scope
    And no gate is invoked stream-wide
    And the sibling's findings appear in no gate result
