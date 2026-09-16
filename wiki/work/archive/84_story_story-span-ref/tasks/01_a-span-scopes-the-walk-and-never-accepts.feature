@cli @work @work-stream
Feature: A span scopes the walk to its stories, keeps the milestone's dependency answer, and never accepts

  A SPAN NEVER ACCEPTS, AND THIS IS THE RULE THE FORM EXISTS UNDER. Every other scope can end with
  "this milestone is ready to accept". A span cannot: the stories outside it were never looked at, so
  their state is not merely unknown to the answer — it was never asked. Offering the driver when the
  in-span stories are all done would hand an operator "44 is ready to accept" on a milestone whose
  story 04 nobody has built, and send them to `aof:verify` on unbuilt work. Every driver-grained
  offer is suppressed for the same reason: the milestone-accept fallthrough, the needs-break-down
  return, and the item-is-the-work return a uat/spike/chore takes.

  THE SILENTLY-DISCARDED SCOPE IS WHAT THIS REPLACES. `inRange` returned `() => true` for any shape
  it could not parse, so before this change a typed `44/01-03` did not fail — it walked the WHOLE
  stream and answered with an unrelated item from another milestone. A scope that is ignored without
  saying so is worse than one that is refused.

  THE SIBLING GATE IS DELIBERATELY NOT NARROWED. The span chooses what to BUILD; it never changes
  what the milestone's `depends` edges mean. So the walk still reads every story's status and every
  sibling edge: an in-span story that depends on an out-of-span sibling still waits on it, and is
  still reported blocked NAMING it. Narrowing the gate's inputs to the span would invent a dependency
  answer the milestone never gave — a story would read ready because the thing blocking it had been
  hidden from the question.

  THE PRE-EXISTING SCOPE FORMS ARE THE REGRESSION SURFACE. Unscoped, single-driver and driver-range
  (`NN-MM`) walks must answer exactly as before; the span pattern is matched only after both numeric
  forms, so a driver range is still driver-grained.

  @executable
  Scenario: the ready set is exactly the in-span stories
    When the walk is scoped to 44/01-03
    Then its ready set is the stories 44/01, 44/02 and 44/03
    And the milestone's other stories are excluded
    And a neighbouring milestone's stories are excluded

  @executable
  Scenario: a span whose stories are all done reports the slice finished, not the milestone acceptable
    Given every story the span names is done
    And a story outside the span is not started
    When the walk is scoped to that span
    Then it answers done without offering any driver ref
    And the same stream scoped to the milestone still offers the unbuilt story

  @executable
  Scenario: an in-span story waiting on an out-of-span sibling is reported blocked, naming that sibling
    Given an in-span story depends on a sibling the span does not include
    When the walk is scoped to that span
    Then it answers blocked at that story
    And it names the out-of-span sibling it is waiting on
    And it carries an empty ready set

  @executable
  Scenario Outline: a driver that groups no stories admits nothing from a span
    Given the driver at that number is <driver>
    When the walk is scoped to a span over it
    Then it offers nothing
    And that same driver is still offered when named without a span

    Examples:
      | driver                              |
      | a uat session                       |
      | a spike                             |
      | a chore                             |
      | a milestone with no stories yet     |

  @executable
  Scenario: a driver-level dependency still blocks a span
    Given the span's milestone depends on a driver that is not done
    When the walk is scoped to that span
    Then it answers blocked at the milestone naming that driver

  @executable
  Scenario Outline: every scope form that existed before the span answers exactly as before
    When the walk is scoped by <form>
    Then it answers <answer>

    Examples:
      | form                        | answer                                        |
      | no scope at all             | the whole stream's ready set                  |
      | a single driver number      | that driver's stories only                    |
      | a driver range NN-MM        | those drivers' stories, driver-grained        |
      | a single-driver range NN-NN | that one driver's stories                     |

  @manual
  Scenario: aof:continue drives a span as a named subset without widening it or accepting its milestone
    When an operator runs aof:continue against a NN/MM-PP span
    Then it walks only the in-span stories to built-and-reviewed
    And it never widens the ref to the bare milestone mid-walk
    And it moves each member story's status but not the milestone's
    And it hands back naming the stories built rather than the milestone as acceptable
