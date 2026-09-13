@executable @cli @work @work-stream
Feature: One selector, three scopes, and the build and review lanes ask for the story's own

  A second selector is the failure milestone 72's module exists to prevent, rebuilt beside it. Two
  selection authorities agree until the day the assembly changes and only one notices, and the
  agent holding the wrong subset has been told a falsehood in the shape of an answer. So this story
  adds an input and asserts, structurally, that it added nothing else: `selectSuites` is the only
  suite-selection function in `src/`, and `TEST_SCOPES` is still three.

  There is no fourth scope. `--scope` is already required and already refuses to default — *"a scope
  aof picked for you is a selection nobody asked for, and a narrowed run reported as a whole one is
  the failure this command exists to refuse."* `--story` does not add a form; it swaps which producer
  supplies `changed` inside the form that already exists.

  What the lanes gain is measured and it is per-run rather than per-milestone. In this repo tests are
  3h14m over 1,243 calls, mean 9.4s — 7.8% of a milestone's span. Downstream they are 7h19m over 902
  calls at a 29.3s mean. But inside the runs that matter they are 30–59% of wall: a behavioural review
  at 58.6% test, another at 54.3%, a fix round at 45.6%. A behavioural review that is 59% test runner
  is a lane the operator waits on for no information. And the tail is worse than the mean — test
  invocations dying at the 600-second tool ceiling in both repos, producing no result and then being
  retried.

  The narrowed lane is only safe because the milestone gate exists. 63/R7 is explicit: the scoping
  trade is sound and should stay, but it makes the milestone gate load-bearing rather than
  ceremonial, and F-63-H is the escape that proved it — a story lane green, the failure appearing only
  at the full-suite gate. This story does not narrow anything until story 04's gate is in place.

  What would quietly undo this: a helper that picks suites "just for this lane"; a lane prompt that
  names suite files by hand, which is `--scope file` wearing prose; and a narrowed run rendered
  without its scope, which is the whole-run claim the command refuses to let a caller make.

  ADR-007 §2. FF-9604.

  Scenario: the selector has one home
    Given the module set of `src/` after this story lands
    When it is examined for suite-selection functions
    Then `selectSuites` is the only one

  Scenario: the scope vocabulary does not grow
    Given the command's exported scopes
    When they are read
    Then there are three
    And they are impacted, file and all

  Scenario Outline: the scope is still required and still never defaulted
    Given the invocation <invocation>
    When `aof test` runs
    Then it <outcome>

    Examples: the existing refusal, unweakened by the new option
      | invocation                        | outcome                                  |
      | with no scope at all              | is refused, naming the three forms       |
      | with an unrecognised scope        | is refused, naming the three forms       |
      | `--story <ref>` and no scope      | is refused, naming the three forms       |

  Scenario: the story's own task suites always run
    Given a story whose `files:` names its own task suites
    When `aof test --scope impacted --story <ref>` runs
    Then those suites are among the selected
    And they are selected from the declaration rather than from a lane's judgement

  Scenario: the build lane asks for the story's scope
    Given the shipped continue command document
    When its build instructions are read
    Then they name `--scope impacted --story <ref>` as the story lane's run
    And they do not name individual suite files

  Scenario: the review lane asks for the story's scope
    Given the shipped continue command document
    When its review instructions are read
    Then they name `--scope impacted --story <ref>` as the review lane's run
    And they state that a story-scoped green does not accept a milestone

  Scenario: a narrowed run is never rendered as a whole one
    Given a run at `--scope impacted --story <ref>`
    When its result is rendered
    Then it states the scope it ran as
    And it does not report itself as a gate
