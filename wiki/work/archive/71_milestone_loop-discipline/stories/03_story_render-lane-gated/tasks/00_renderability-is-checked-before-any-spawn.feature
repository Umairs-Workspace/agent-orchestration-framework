@docs @work @design
Feature: The design lane checks it can render before it spawns anything
  In order that a lane whose outcome the config already determined costs one recorded line instead of
  three breakpoints of failed invocations and two agent spawns
  the render step must evaluate a renderability precondition first, and on failure record the reason
  and skip.

  # Contract, not restated: ADR-005. The three verdict tokens are 07's closed set and are not widened.
  # That the precondition is STATED before the render invocation, in both commands, is FF-7102's
  # ordering claim; this feature is what the lane does once it is evaluated.

  Background:
    Given the bundled commands "src/bundle/commands/continue.md" and "src/bundle/commands/verify.md"
    And a story with a DESIGN surface

  @executable
  Scenario Outline: each half of the precondition resolves in a declared order
    Given "<declared>" is <declared-state> and <fallback> is <fallback-state>
    When the precondition resolves that half
    Then it resolves to <resolved>

    Examples: the base URL
      | declared | declared-state | fallback          | fallback-state | resolved                     |
      | --url    | given          | work.ui.baseUrl   | set            | the --url value              |
      | --url    | given          | work.ui.baseUrl   | absent         | the --url value              |
      | --url    | absent         | work.ui.baseUrl   | set            | the work.ui.baseUrl value    |
      | --url    | absent         | work.ui.baseUrl   | absent         | unresolved                   |

    Examples: the renderer
      | declared         | declared-state | fallback                | fallback-state | resolved                  |
      | work.ui.renderer | set            | the ms-playwright cache | populated      | the work.ui.renderer value |
      | work.ui.renderer | set            | the ms-playwright cache | empty          | the work.ui.renderer value |
      | work.ui.renderer | absent         | the ms-playwright cache | populated      | the discovered binary      |
      | work.ui.renderer | absent         | the ms-playwright cache | empty          | unresolved                 |

  @executable
  Scenario Outline: the precondition's own truth table
    Given the base URL is <url>, the renderer is <renderer> and the surface's Route is <route>
    When the design lane runs
    Then the lane <outcome>
    And the reason names <reason>
    And no invocation is attempted at any breakpoint unless the lane rendered

    Examples:
      | url        | renderer   | route      | outcome                                     | reason                              |
      | resolved   | resolved   | present    | renders and hands the screenshot on         | nothing — there is no reason to give |
      | resolved   | resolved   | absent     | records the reason, skips, spawning nothing | the missing Route                   |
      | resolved   | unresolved | present    | records the reason, skips, spawning nothing | the missing renderer                |
      | unresolved | resolved   | present    | records the reason, skips, spawning nothing | work.ui.baseUrl                     |
      | resolved   | unresolved | absent     | records the reason, skips, spawning nothing | the renderer and the Route          |
      | unresolved | resolved   | absent     | records the reason, skips, spawning nothing | work.ui.baseUrl and the Route       |
      | unresolved | unresolved | present    | records the reason, skips, spawning nothing | work.ui.baseUrl and the renderer    |
      | unresolved | unresolved | absent     | records the reason, skips, spawning nothing | all three                           |

  @executable
  Scenario: a failed precondition is a skip, not a spawn
    Given the precondition fails
    When the lane hands back
    Then the verdict is INCONCLUSIVE
    And the reason is recorded against the item
    And no designer session is spawned
    And no QA session is spawned
    And the story lane continues to its next step

  @executable
  Scenario: the precondition is evaluated per surface where it is per surface
    Given a story with two DESIGN surfaces, one of which declares no Route
    When the design lane runs with a resolved base URL and renderer
    Then the surface with a Route is rendered and judged
    And the surface without one is INCONCLUSIVE naming its missing Route
    And the lane does not skip the story's other surface

  @executable
  Scenario: a missing baseline is a different reason from a missing render
    Given the precondition passes and a screenshot is produced
    And the surface has neither a committed mock nor a binding checklist
    When the verdict is recorded
    Then it is INCONCLUSIVE naming the missing baseline
    And the reason names no missing precondition half

  @manual
  Scenario: an unconfigurable repository pays one line for the lane
    When a UI story is driven by "aof:continue" in a workspace with no "work.ui" key
    Then the run records one INCONCLUSIVE naming "work.ui.baseUrl"
    And no designer and no QA session was spawned for that story
    And no render was attempted at any breakpoint
