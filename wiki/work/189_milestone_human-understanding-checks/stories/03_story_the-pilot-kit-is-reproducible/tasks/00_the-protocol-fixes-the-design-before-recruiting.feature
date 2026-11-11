@executable @docs @planning
Feature: the protocol fixes the design before anyone is recruited

  WHY. A pilot run before its design is written down can be tuned to its result. So the protocol
  states the audience, the budget, the arms, the order, the measures and the data rules before the
  first session (ADR-005). The scenarios read `packages/learning/pilot/PROTOCOL.md` and
  `OBSERVATION-SHEET.md`, in `packages/learning/test/pilot-kit.suite.mjs`.

  Rule: R1 · The protocol fixes the design before anyone is recruited

    Scenario: E1 · the audience and budget come first, and gate recruiting
      When `PROTOCOL.md`'s first section is read
      Then it records the audience as experienced developers learning an unfamiliar codebase
      And it records the sample as one participant, the operator, and a total model spend of $10
      And it says no session starts while the audience or the budget is blank

    Scenario: E2 · the arms are counterbalanced, or the order is drawn and recorded
      When `PROTOCOL.md`'s design section is read
      Then it says that with two or more participants, half build pack A manually and pack B taught, and half the reverse
      And it says that with one participant the order is drawn before the first session and recorded
      And it says the manual arm uses `aof:manual` and the taught arm uses `aof:teach`

    Scenario Outline: the protocol records every measure the SPEC names
      When `PROTOCOL.md`'s measures section is read
      Then it names <measure> and says when it is taken

      Examples:
        | measure                                              |
        | baseline knowledge                                   |
        | help used during the build                           |
        | assisted completion and its quality                  |
        | immediate unaided items, one of each check kind      |
        | time per session                                     |
        | perceived effort                                     |
        | a delayed unaided item about a week later            |

    Scenario: the held-out items are given without AI, the same way in both arms
      When `PROTOCOL.md`'s measures section is read
      Then it says the held-out items are given with no AI assistant, identically in both arms
      And it says `aof:grill-me` is not the pilot's instrument
      And it says the participant does not open a pack's `FACILITATOR.md` until that pack's sessions are done, and an item seen early is `unmeasured`

  Rule: R3 · The sheet records coded observations only

    Scenario: E5 · an item is recorded as a code, never as the participant's words
      When `OBSERVATION-SHEET.md` is read
      Then each item row has columns for the item, its result from `CHECK_RESULTS`, its help, and its minutes
      And it holds no column for the participant's answer or a transcript
      And `PROTOCOL.md` says no raw answer or transcript is kept, and nothing is sent anywhere

    Scenario: the report template asks for every limitation
      When `packages/learning/pilot/REPORT-TEMPLATE.md` is read
      Then it has sections for the audience, the sample size, the missing observations, the spend and the limitations
      And it says no efficacy is claimed beyond what was measured
