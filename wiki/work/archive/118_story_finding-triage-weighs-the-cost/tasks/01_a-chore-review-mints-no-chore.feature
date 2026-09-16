@executable @cli @work @work-stream
Feature: A chore's review mints no chore — the promotion has a depth bound

  A chore is itself a reviewable driver, so a chore's own review pass runs the same triage and emits
  the next chore. `routeFinding` (`src/work-loop.mjs:211`) is handed the FINDING and never the item
  under review, so it cannot ask whether the routing it is about to take would create the same kind
  of item it is reviewing. Nothing caps the depth.

  **Measured on this repository, 2026-09-05 — six promotions minted from a chore's review:**

    | chore | raised reviewing | the reviewed item      |
    | 110   | 88               | a promoted chore       |
    | 112   | 90               | a promoted chore       |
    | 113   | 94               | a promoted chore       |
    | 114   | 97               | a chore raised by hand |
    | 115   | 95               | a chore raised by hand |
    | 117   | 100              | a promoted chore       |

  A seventh is not in the stream because it was deleted by hand: chore 101's review round promoted a
  stub chore for a ~40-line arch test, and at `aof:verify 101` the operator removed it and folded
  the remedy into 101's own Definition of Done — which is the move this task makes the rule.

  **The bound is on TYPE, not on provenance.** Keying it to a `Promotion key` would catch only four
  of the six: 95 and 97 were raised by a person, and their reviews minted 115 and 114 all the same.
  The user story's claim is *"reviewing a chore stops minting the next chore"*, and that is the claim
  implemented — whatever the reviewed chore's own origin.

  **The reviewed item's type arrives as a SECOND ARGUMENT, additive.** `routeFinding(finding)` is a
  pure decider over one finding and stays one: the type of the item under review is a property of
  the PASS, not of the finding, so putting it on the finding would make every caller carry a field
  that is the same for all of them. `routeFinding(finding, { reviewedType })` and
  `routeFindings(findings, { reviewedType })` default to today's behaviour when no context is given,
  so no existing caller changes and no existing row moves.

  **The fold REUSES the `amendment` routing with a new vehicle**, and adds no sixth routing. What
  the remedy does is land in the contract of the item under review, creating nothing — which is what
  `amendment` already means. A chore's contract is its `## Definition of Done`, so the vehicle names
  that. The delivered criterion *"an amendment creates no item and never edits a delivered
  contract"* (`71/01/tasks/00`) holds unchanged: an open chore's checklist is neither.

  **A SECOND gate at the act, because the verb is reachable by hand.** The decider is what the loop
  consults, but `aof work promote-finding` can be typed directly, and every one of the six above
  reached the stream through it. The verb resolves the reviewed ref's type and refuses. Two layers
  is the right number here precisely because the prose layer already failed once.

  **The LOOP's face only.** `work:promote-gap` keeps its delivered `--at` because the OPERATOR may
  choose (71/ADR-009 §1); this refusal binds `work:promote-finding` at that same seam. A person who
  wants the chore anyway types the gap face, exactly as they do today.

  **The refusal decides BEFORE the idempotence scan**, deliberately. A bound that can be crossed by
  having already crossed it once is not a bound, and every one of the six would otherwise answer
  "already promoted" and pass. 71/01's delivered idempotence criterion is untouched: it says a second
  promotion of the same finding **creates nothing**, and a refusal creates nothing.

  **`PROMOTED_TYPE` stays the one home for the literal.** The type the loop may create is the type it
  may not be promoted FROM, and both readings come from that constant — no second spelling of
  `"chore"` enters the promotion path, so FF-7103's type-authority leg stays green.

  Scenario: reviewing a chore, a checklist-dischargeable finding folds instead of promoting
    Given an Important, checklist-dischargeable finding that is not cheaper than a driver
    And the item under review is of type `chore`
    When it is routed
    Then its routing is `amendment`
    And its vehicle names the reviewed chore's own Definition of Done
    And it creates nothing
    And its owner is the loop

  Scenario: the same finding reviewing a story still promotes
    Given the same finding
    And the item under review is of type `story`
    When it is routed
    Then its routing is `chore`
    And it creates a top-level chore
    And nothing about this decision differs from before this change

  Scenario: with no reviewed type supplied, the decider behaves exactly as it did
    Given the same finding
    And no reviewed-item context is supplied to the decider
    When it is routed
    Then its routing is `chore`
    And every existing caller of the decider is unchanged by this task

  Scenario Outline: what the reviewed item's type decides
    Given a checklist-dischargeable finding that is not cheaper than a driver
    And the item under review is of type <type>
    When it is routed
    Then its routing is <routing>

    Examples:
      | type      | routing   |
      | chore     | amendment |
      | story     | chore     |
      | milestone | chore     |
      | spike     | chore     |
      | uat       | chore     |

  Scenario: a cheap remedy is still fixed, whatever is being reviewed
    Given an Important finding declared cheaper than a driver's ceremony
    And the item under review is of type `chore`
    When it is routed
    Then its routing is `fixed`
    And the depth bound is never reached

  Scenario: promoting a finding raised while reviewing a chore is refused at the verb
    Given a stream carrying the top-level chore `88`
    And a finding with a title and a remedy
    When `aof work promote-finding 88 "<title>" --remedy "…"` runs
    Then the verb refuses
    And the refusal names the reviewed item as a chore
    And it names the two destinations open to the remedy
    And no item is created

  Scenario: the refusal writes nothing at all
    Given the stream before the refused promotion
    When the refusal is taken
    Then no folder is created under the work dir
    And no existing item is renumbered
    And no `CHORE.md` is written or amended
    And the stream is byte-identical to what it was before the call

  Scenario Outline: the refusal takes its place in the existing order
    Given an invocation that is <flaw>
    When the verb runs
    Then the refusal is <refusal>

    Examples:
      | flaw                                                      | refusal                                        |
      | missing a ref                                             | the invalid-ref refusal, unchanged             |
      | missing a title                                           | the invalid-title refusal, unchanged           |
      | missing a remedy                                          | the invalid-remedy refusal, unchanged          |
      | naming a ref that does not resolve                        | the unknown-ref refusal, unchanged             |
      | carrying an input outside the declared set                | the unknown-input refusal, unchanged           |
      | naming a chore that resolves, with title and remedy       | the new reviewing-a-chore refusal              |
      | naming a chore whose finding was ALREADY promoted before  | the new reviewing-a-chore refusal              |
      | naming a story whose finding was already promoted         | not a refusal — the existing chore is reported |

  Scenario Outline: the verb's refusal follows the reviewed item's type
    Given a stream in which `<ref>` is an item of type <type>
    When a finding raised reviewing `<ref>` is promoted
    Then the verb <outcome>

    Examples:
      | ref    | type      | outcome                              |
      | 88     | chore     | refuses, naming the depth bound      |
      | 85     | story     | promotes, exactly as it does today   |
      | 71     | milestone | promotes, exactly as it does today   |
      | 71/01  | story     | promotes, exactly as it does today   |
      | 82     | spike     | promotes, exactly as it does today   |
      | 32     | uat       | promotes, exactly as it does today   |

  Scenario: the operator's own face is unbound
    Given the same stream and the same top-level chore `88`
    When `aof work promote-gap` is used to schedule chore-shaped work
    Then it behaves exactly as it does today
    And its delivered `--at` still chooses a position
    And nothing in this change reaches the gap face

  Scenario: the block names the bound and where the remedy goes instead
    Given the `<finding_triage>` region cut from `src/bundle/commands/continue.md`
    When the chore-routing question is read
    Then it states that the loop creates nothing when the item under review is itself a chore
    And it names the reviewed chore's own `## Definition of Done` as the fold-in destination
    And it names the operator hand-back as the destination for a remedy that does not fold
    And a block that dropped either destination is reported by the control

  Scenario: the control is not vacuous
    Given the shipped finding face
    When the control runs
    Then it is green
    And with the type check removed from the source, the control reports it
    And with the check moved to after the idempotence scan, the control reports it

  Scenario: the rule the bundle ships is the rule this repository runs
    Given `src/bundle/commands/continue.md` carrying this change
    When the bundle is re-rendered and the manifest regenerated
    Then each of the three tracked rendered copies carries the depth bound
    And every `src/bundle/manifest.json` entry hashes to its re-rendered member

  Examples:
    | destination for a remedy raised reviewing a chore | when                                               |
    | the reviewed chore's own `## Definition of Done`  | it is chore-shaped and the chore is open            |
    | fixed at the close                                | it is cheaper than a driver (`tasks/00`)            |
    | handed to the operator as a story shape           | it needs acceptance criteria a `.feature` must state |
    | a recorded finding                                | it is a preference with no correctness consequence  |

  Examples:
    | refusal code                      | exit | creates | shifts |
    | promote-finding-reviewing-a-chore | 400  | nothing | 0      |
