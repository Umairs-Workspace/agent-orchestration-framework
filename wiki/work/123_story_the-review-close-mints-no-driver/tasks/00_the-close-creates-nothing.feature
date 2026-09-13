@executable @cli @work @work-stream
Feature: The review close creates nothing — a remedy is fixed inline or handed back as a story

  `routeFinding` (`src/work/loop.mjs`) question 3 routes `checklistDischargeable === true` to a
  top-level chore. 118/00 put the cost test in front of it and 118/01 stopped it firing when the
  reviewed item is itself a chore. Both narrowed the door; neither closed it.

  **Measured on this repository, 2026-09-06.** Milestone 119's review closes minted chores 120, 121
  and 122. The depth bound answered CORRECTLY for all three — the item under review was a milestone
  or a story, not a chore — and the chore was created anyway. A bound keyed to the reviewed item's
  type was never the whole rule, because the reviewed item was never the problem.

  **The operator's rule, stated once:** *fix tech debt inline if it's small (a chore); otherwise log
  it as a story.* Question 2 is already the small half. This task deletes the other half: a
  checklist-shaped remedy that is not cheap is neither small enough to fix nor the loop's to
  schedule, so it is handed back as a story shape with the existing `operator-refines` vehicle.

  **The cost bar RISES as a consequence, and that is the point.** The only driver left for question 2
  to weigh a remedy against is a story — strictly more ceremony than the chore it weighed against
  before — so more remedies answer question 2 and are fixed in the beat that found them. The
  operator's rule read literally moves work from "scheduled" to "done", not from "scheduled" to
  "dropped".

  **This SUPERSEDES a delivered criterion, deliberately and in the open.**
  `118/00/tasks/00_the-cheap-remedy-is-fixed-not-scheduled.feature` maps *"is checklist-dischargeable
  and not cheap"* to `chore` and delivers a routing table whose `chore` row reads
  `creates: chore, owner: loop`. That feature is delivered and is therefore immutable: it is not
  edited, not annotated and not tagged. The new rule lives here — the same move 118/00 made against
  `71/01/tasks/00`.

  **`FINDING_ROUTINGS` is UNTOUCHED**, which is this repository's additive-supersession discipline
  running in the only direction left: the export keeps all five members with their names, meanings
  and positions, `chore` included, so 118/00's *"in their prior order"* and *"no sixth member
  appears"* both still read forward. What narrows is which routings the DECIDER can reach. The
  routing name still names something real — the operator's own `work:promote-gap` creates a chore by
  hand and is not touched here.

  **`LOOP_CREATED_ITEM_TYPE` and `work:promote-finding` both STAY.** The constant is what 118/01's
  depth bound compares against and what FF-7103 pins to `PROMOTED_TYPE`; the verb stays reachable to
  a person exactly as the gap face is. 71/ADR-003 is narrowed to zero rather than contradicted: "one
  type, one placement, zero shifts" survives as an upper bound the loop no longer spends, so no
  superseding ADR is owed.

  **The bound is EXHAUSTIVE, not enumerated.** The prose layer has now failed twice — once before
  118/01, once again at 119 — so the claim asserted is over every combination of the decider's
  declared inputs rather than over the combinations someone thought to list. A router that creates
  nothing is provable that way and a router that creates one thing was not.

  Scenario: a checklist-shaped remedy that is not cheap is handed back, not scheduled
    Given an Important, checklist-dischargeable finding that is not cheaper than a driver
    And the item under review is of type `story`
    When it is routed
    Then its routing is `story`
    And its vehicle is `operator-refines`
    And it creates nothing
    And its owner is the operator

  Scenario Outline: the reviewed item's type no longer decides whether an item is created
    Given a checklist-dischargeable finding that is not cheaper than a driver
    And the item under review is of type <type>
    When it is routed
    Then its routing is <routing>
    And it creates nothing

    Examples:
      | type      | routing   |
      | chore     | amendment |
      | story     | story     |
      | milestone | story     |
      | spike     | story     |
      | uat       | story     |

  Scenario: the fold-in for a chore's own review is unchanged
    Given a checklist-dischargeable finding that is not cheaper than a driver
    And the item under review is of type `chore`
    When it is routed
    Then its routing is `amendment`
    And its vehicle names the reviewed chore's own Definition of Done
    And 118/01's delivered depth bound is satisfied by this task, not weakened

  Scenario: with no reviewed-item context, the decider still creates nothing
    Given the same finding
    And no reviewed-item context is supplied to the decider
    When it is routed
    Then its routing is `story`
    And it creates nothing

  Scenario: the decider creates nothing for ANY input, asserted exhaustively
    Given every combination of the decider's declared finding inputs
    And every reviewed-item type the stream admits, and none at all
    When each is routed
    Then no decision carries a non-null `creates`
    And the assertion enumerates no allowed exception

  Scenario: a close routes every surviving finding and creates nothing
    Given a close whose surviving findings include one cheap, one checklist-shaped and one nit
    When the close routes them
    Then the `creates` subset is empty
    And the cheap finding is routed `fixed`
    And the checklist-shaped finding is routed `story` and owned by the operator
    And the nit is routed `recorded`

  Scenario Outline: the first question that answers still decides
    Given a surviving non-Blocker finding that <character>
    When the ordered questions are put to it
    Then it is routed to <routing>
    And no later question is asked of it

    Examples:
      | character                                                    | routing   |
      | requires a change to a delivered .feature                    | amendment |
      | requires a change to an ADR                                  | amendment |
      | is a Nit that is also cheap and also checklist-dischargeable | recorded  |
      | is cheaper than the driver that would carry it               | fixed     |
      | is cheap and also checklist-dischargeable                    | fixed     |
      | is checklist-dischargeable and not cheap                     | story     |
      | needs new acceptance criteria and is not cheap               | story     |
      | answers none of the questions                                | recorded  |

  Scenario: the routing set keeps its five delivered members
    Given the exported `FINDING_ROUTINGS` after this change
    When its members are read
    Then it carries `amendment`, `chore`, `story`, `recorded` and `fixed` in their delivered order
    And no member is removed and no sixth member appears
    And `chore` is a routing the decider can no longer reach

  Scenario: the operator's own faces are untouched
    Given the shipped `work:promote-gap` and `work:promote-finding`
    When each is invoked by hand as it is today
    Then `work:promote-gap` behaves exactly as it does today, `--at` included
    And `work:promote-finding` still refuses a finding raised while reviewing a chore
    And nothing in this change removes either verb

  Scenario: the block instructs no creation at all
    Given the `<finding_triage>` region cut from `src/bundle/commands/continue.md`
    When it is read
    Then it states that the loop creates no item
    And it names no verb that would create one
    And it still names every member of `FINDING_ROUTINGS`
    And it still asks the cost question ahead of the checklist question

  Scenario: the control asserts the stronger claim, not the one the block no longer poses
    Given FF-7103's prose leg after this change
    When the block is read
    Then the leg asserts that no creating verb is named, rather than which one is
    And a block re-introducing a promotion instruction is reported
    And the leg is not left green by the absence of the question it used to read

  Scenario: the control is not vacuous
    Given the shipped decider
    When the control runs
    Then it is green
    And with question 3 restored to the `chore` routing in the source, the control reports it

  Scenario: the rule the bundle ships is the rule this repository runs
    Given `src/bundle/commands/continue.md` carrying this change
    When the bundle is re-rendered and the manifest regenerated
    Then each of the three tracked rendered copies states that the loop creates no item
    And every `src/bundle/manifest.json` entry hashes to its re-rendered member

  Examples:
    | routing   | vehicle                              | creates | owner    |
    | amendment | accepting-item-contract              | null    | loop     |
    | amendment | superseding-adr                      | null    | loop     |
    | amendment | reviewed-chore-definition-of-done    | null    | loop     |
    | fixed     | fixed-at-close                       | null    | loop     |
    | story     | operator-refines                     | null    | operator |
    | recorded  | state-feedback                       | null    | loop     |

  Examples:
    | what the close may do with a surviving finding | who carries it |
    | ratify it as an amendment                      | the loop       |
    | fix it at the close                            | the loop       |
    | record it for the retro                        | the loop       |
    | hand it back as a story shape                  | the operator   |
