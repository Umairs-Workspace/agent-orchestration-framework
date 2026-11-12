@executable @docs @work @planning
Feature: Every question comes with a recommendation, and with background below expert

  WHY. A question with no recommendation asks the operator to be the specialist. Every question
  discovery puts to them now says what the agent would pick and why, and, where the operator is
  not expert in the domain, first says what the term means, why it matters here and what is normal
  (ADR-005). The operator confirms or overrides. A driven ask already carried the recommendation
  (136/ADR-002 §3); the interactive one gains it.

  THE TEXTS UNDER TEST: "the fixture" as in task 00. "The asking bullet" is the bullet of the
  fixture's discovery passage that says the main session asks; "the driven paragraph" is the one
  that names "AOF_RUN_ID".

  Rule: R4 · Every question comes with a recommendation, and with background below expert

    Scenario: E11 · below expert, a question carries background and then the pick
      When the asking bullet is read
      Then it says every question carries a line that begins "I would pick:", naming one of the question's own options and why
      And it says the tool's first option is that pick
      And it says that below "expert" a line that begins "Background:" comes before it

    Scenario: E12 · an expert gets the pick and no background
      When the asking bullet is read
      Then it says a question in a domain the operator knows at "expert" carries no "Background:" line
      And it says it still carries "I would pick:"

    Scenario: E13 · a driven ask carries background inside its length
      When the driven paragraph is read
      Then it places "Background:" after the ask's first line and before "Decision needed:"
      And it still names the four labels "Decision needed:", "Options:", "I would pick:" and "What the answer changes:" in that order
      And it says the whole, background included, stays under 1,500 characters

    Scenario: background says three things, with a source
      When the asking bullet is read
      Then it says the background states what the term means, why it matters to this build, and what is normal in the industry
      And it says the background names its source, and the finding when research ran

    Scenario Outline: the recommendation is on every kind of question discovery asks
      When the discovery passage is read
      Then it says <kind> carries "I would pick:"

      Examples:
        | kind                                             |
        | a question asked by its "Q<n>" token             |
        | a proposed example put to a person by its "E<n>" token |
        | the batch of researched examples                 |

    Scenario: the question asks the operator to confirm or override
      When the asking bullet is read
      Then it says a question is put so the operator can confirm the pick or override it
      And it still says each option says what it costs

    Scenario: a question takes the level of the domain it bears on
      When the asking bullet is read
      Then it says a "policy" question takes the level of the domain it bears on
      And it says a question in a domain the profile does not list is treated as "new"

    Scenario: the token still opens the question
      When the asking bullet and the driven paragraph are read
      Then each still says the question opens with its token
      And the specimen questions, read through "readMapToken", answer their own story ref and id

    Scenario: the PO brief writes questions this way
      When the PO brief is read
      Then it says each question the PO returns carries its recommendation and, below "expert", its background
      And it still says the PO returns its questions and never asks them

    Scenario: the loop's general instruction is left as it is
      When the instruction a driven session is given for a question it cannot settle is read from "packages/execution/src/session-driver.mjs"
      Then it still names the four labels "Decision needed:", "Options:", "I would pick:" and "What the answer changes:"
      And it names no "Background:" line
