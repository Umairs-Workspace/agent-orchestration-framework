@executable @work @assets
Feature: each check starts unaided and is grounded in the record

  WHY. A check is evidence only if the human answered before being helped, and the help they did get
  is named (ADR-003 §2). It is evidence of the right thing only if it is compared with a reference the
  record grounds, never with how sure the human sounded (§3–§4). The checks are prose a session
  follows, so these scenarios read `grill-me.md`'s `<checks>` region, flattened, as
  `grill-me-guide.suite.mjs` cuts it. 02 observes a live session.

  Rule: R1 · Every check is tried unaided first, and its help is labelled

    Scenario: E1 · an answer given before any help records no help
      When the `<checks>` region is read
      Then it says each check is put to the human before any help is offered
      And it says a result given before any help is recorded as `help: none`

    Scenario: E2 · pulled help is recorded by its rung
      When the `<checks>` region is read
      Then it says help is given one `HELP_LADDER` rung at a time, only when the human asks
      And it says each result records the strongest rung given before the human's final answer, as `help: <rung>`

    Scenario: E3 · a revealed answer is recorded as revealed
      When the `<checks>` region is read
      Then it says the answer is shown only when the human asks for it
      And it says such a result is recorded as `help: answer revealed`

  Rule: R2 · No check counts as passed unless it was answered and grounded

    Scenario: E4 · a skipped check is skipped, not passed
      When the `<checks>` region is read
      Then it says the human may skip any check, and a skipped check's result is `skipped`

    Scenario: E5 · a kind with no grounded reference is unmeasured
      When the `<checks>` region is read
      Then it says a kind with no grounded reference for this story is `unmeasured`
      And it names, for explain, the absence of an ADR in the story's `reads:` as such a case

    Scenario: E6 · confidence does not change a result
      When the `<checks>` region is read
      Then it says neither the human's confidence nor a fluent answer is evidence
      And it says an answer that contradicts the reference is `not consistent`, however sure the human is

    Scenario: E7 · an ambiguous answer gets one follow-up, then is unclear
      When the `<checks>` region is read
      Then it says an ambiguous answer gets exactly one follow-up question
      And it says an answer still ambiguous after it is `unclear`

    Scenario Outline: each kind names the reference it is compared with
      When the `<checks>` region's paragraph for `<kind>` is read
      Then it names <reference> as that kind's reference

      Examples:
        | kind                           | reference                                                                 |
        | explain a design choice        | the reasons the ADR in the story's `reads:` gives                         |
        | predict an unseen input        | the contract's example or scenario, or output the human observes by running it |
        | diagnose a faulty example      | the defect the session seeded, named after the human answers             |
        | adapt to a changed requirement | the session's reading of the code under `files:`, labelled a hypothesis   |

    Scenario: a faulty example is disposable and analogous
      When the `<checks>` region's paragraph for "diagnose a faulty example" is read
      Then it says the example is a short snippet printed in the terminal, analogous to the story's code
      And it says the defect is never placed in a project file

    Scenario Outline: a default the record leaves open is stated in the prompt
      When the `<checks>` region is read
      Then it says <default>

      Examples:
        | default                                                                  |
        | each kind offers one item, and another only on request                   |
        | the kinds are offered in the order explain, predict, diagnose, adapt     |
