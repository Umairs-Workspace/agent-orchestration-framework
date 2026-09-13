@executable @cli @work @work-stream
Feature: The cheap remedy is fixed at the close that found it, not scheduled as a driver

  `routeFinding` (`src/work-loop.mjs:211`) asks ADR-003's four ordered questions and routes by
  SHAPE, never by COST. Question 2 — `finding.checklistDischargeable === true` → a top-level chore —
  is equally true of a forty-line arch test and a three-day migration. There is no size floor, so
  the cheapest remedies draw the heaviest ceremony: a driver folder, a record doc, a Definition of
  Done, a validate gate and a whole `aof:verify` session. The block's closing sentence, *"the loop
  creates exactly one type, in exactly one place"*, bounds WHAT it may create and says nothing about
  WHETHER it should.

  **Measured on this repository, 2026-09-05.** Of top-level items 88–117, twenty-three chores carry
  a `Promotion key` — the marker `aof work promote-finding` writes — so they were minted by a review
  close rather than raised by a person. Chore 101's whole remedy was one line in `.gitattributes`.

  **The cost test is CODE, not prose.** 71/ADR-009 §B is explicit that *"a four-question router
  stated only in prose is a claim no scenario can drive"*, which is why `routeFinding` is a pure
  decider. The new question is one more declared input on the finding, exactly like
  `checklistDischargeable` and `needsNewCriteria`: the reviewer supplies the judgement, the decider
  supplies the routing, and the routing is drivable. `STORY.md` `## Notes` asked whether the bound
  is enforceable in the CLI or only assertable over the prompt text — the decider is the answer.

  **Termination is by construction, so no new numeric bound is owed.** Every surviving finding is
  routed exactly once, so N findings admit at most N fixes. `<review_rounds>` already sanctions
  applying a confirmed fix without granting a round for it, and a fix applied at the close is that
  act. Nothing here needs a home in `src/loop-bounds.mjs`, and 71/00/tasks/02's "a stated bound names
  its home" is satisfied by there being no stated bound to home.

  **A Nit still skips to the recorded routing, unchanged.** `71/01/tasks/00` delivers *"a Nit is
  recorded, and is never promoted"*, and the reporting bar's purpose is that only the Important
  population drives action. The cost question sits after that skip, so it never widens what a Nit
  can trigger.

  **This SUPERSEDES a delivered criterion, deliberately and in the open.**
  `71/01/tasks/00_the-triage-rule-routes-every-finding.feature` says *"four ordered questions"* and
  maps *"is discharged by a checklist against existing code"* to *"a top-level chore"* with no cost
  condition. That feature is delivered and is therefore immutable: it is not edited, not annotated
  and not tagged. The new rule lives here — the same move `102/tasks/00_the-eighth-key.feature` made
  against `53/01/05`. **71/ADR-003 is narrowed, never contradicted**, so no superseding ADR is owed:
  the loop still creates exactly one type in exactly one place, and simply creates fewer of them.

  **The fifth routing is APPENDED LAST**, which is this repository's additive-supersession
  discipline: `FINDING_ROUTINGS` keeps its four members with their names, meanings and positions, so
  every reader written against the four still reads forward.

  Scenario: the routing set gains a fifth member, appended last
    Given the exported `FINDING_ROUTINGS` after this change
    When its members are read
    Then it carries `amendment`, `chore`, `story` and `recorded` unchanged, in their prior order
    And `fixed` is the fifth and final member
    And no sixth member appears

  Scenario: a remedy cheaper than the driver that would carry it is fixed, not scheduled
    Given an Important finding declared cheaper than a driver's ceremony
    When it is routed
    Then its routing is `fixed`
    And it creates nothing
    And its owner is the loop
    And its vehicle names the close as where the fix lands

  Scenario: the cost question is asked before the checklist question
    Given an Important finding that is BOTH cheaper than a driver AND checklist-dischargeable
    When it is routed
    Then its routing is `fixed`
    And no chore is created for it

  Scenario: a locked-contract change is never merely cheap
    Given an Important finding that is cheaper than a driver AND requires a delivered `.feature` change
    When it is routed
    Then its routing is `amendment`
    And the cost question is never reached

  Scenario: a Nit is unaffected by the cost question
    Given a Nit that is cheaper than a driver
    When it is routed
    Then its routing is `recorded`
    And it is never routed to `fixed`
    And it is never promoted

  Scenario Outline: the first question that answers still decides
    Given a surviving non-Blocker finding that <character>
    When the ordered questions are put to it
    Then it is routed to <routing>
    And no later question is asked of it

    Examples:
      | character                                                         | routing   |
      | requires a change to a delivered .feature                         | amendment |
      | requires a change to an ADR                                       | amendment |
      | is cheap and also requires an ADR change                          | amendment |
      | is a Nit that is also cheap and also checklist-dischargeable      | recorded  |
      | is cheaper than the driver that would carry it                    | fixed     |
      | is cheap and also checklist-dischargeable                         | fixed     |
      | is cheap and also needs new acceptance criteria                   | fixed     |
      | is checklist-dischargeable and not cheap                          | chore     |
      | needs new acceptance criteria and is not cheap                    | story     |
      | answers none of the questions                                     | recorded  |

  Scenario: a fix at the close creates nothing and costs no round
    Given a close whose surviving findings include one routed `fixed`
    When the close applies its routings
    Then the `creates` subset holds no entry for it
    And no review lens is re-spawned for it
    And the review round counter does not advance

  Scenario: the close reports a fix as a routing, not as silence
    Given a close that fixed one finding, promoted one chore and recorded one nit
    When it hands back
    Then it names the fixed finding with the routing `fixed` and what was changed
    And it names the chore it created by ref
    And it names the recorded finding
    And it allocates no finding id and prints no "@finding-<id>" tag

  Scenario: the control reads the routing set from its one home
    Given FF-7103's assertion that the triage block names every routing
    When the control is read after this change
    Then its routing set is derived from the exported `FINDING_ROUTINGS`
    And it is not a second hand-written list of routing names
    And a routing added to the export is asserted against the block with no edit to the control

  Scenario: the block states the question the decider asks
    Given the `<finding_triage>` region cut from `src/bundle/commands/continue.md`
    When it is read
    Then it states the cost question ahead of the question that routes to a top-level chore
    And it names the ceremony a driver costs rather than stating a line count or a duration
    And it names the `fixed` routing
    And a block that dropped the cost question is reported by the control

  Scenario: the rule the bundle ships is the rule this repository runs
    Given `src/bundle/commands/continue.md` carrying this change
    When the bundle is re-rendered and the manifest regenerated
    Then each of the three tracked rendered copies carries the cost question
    And every `src/bundle/manifest.json` entry hashes to its re-rendered member
    And no tracked rendered copy is left at an earlier render

  Examples:
    | routing   | vehicle                    | creates | owner    | new |
    | amendment | accepting-item-contract    | null    | loop     | no  |
    | amendment | superseding-adr            | null    | loop     | no  |
    | fixed     | fixed-at-close             | null    | loop     | yes |
    | chore     | top-level-chore            | chore   | loop     | no  |
    | story     | operator-refines           | null    | operator | no  |
    | recorded  | state-feedback             | null    | loop     | no  |

  Examples:
    | the ceremony the cost question weighs a remedy against |
    | a top-level folder and its record doc                  |
    | a Definition of Done to author                         |
    | a validate gate the stream must keep green             |
    | an `aof:verify` session to close it                    |
