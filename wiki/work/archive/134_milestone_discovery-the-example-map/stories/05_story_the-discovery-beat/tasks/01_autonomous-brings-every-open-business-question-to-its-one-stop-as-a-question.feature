@executable @docs @work @planning
Feature: --autonomous brings every open business question to its one end review as a question, never as a default

  WHY. SPEC: "`--autonomous` refine brings those questions to its single end review as questions,
  never as defaults." Today the cascade "takes documented default decisions for non-critical open
  questions", and a business rule decided that way is found at review, when changing it costs an
  amendment round. ADR-006 §4 keeps the cascade's one stop and changes what may take a default:
  a business-rule question is the one class that may not. The rule sits beside the existing
  "documented default decisions" sentence, so the two are read together and cannot drift apart.

  RULINGS (QA, 2026-09-24).
  (1) This suite reads the refine SOURCE's `--autonomous` block and its `<output>` section, and pins
      content, not wording. The rendered copies are task 00's: each is byte-identical to a fresh
      render of the whole file, so they are not checked again here.
  (2) "A question the person does not answer" includes a refused `AskUserQuestion` call: story 03
      stamps no record for a refused result, so it anchors nothing and is a deferral.
  (3) A contract the answers "unblock" is one whose story passes the beat's own doctor stop (task
      00): no error-severity `example-*` finding. The block names that stop; it states no second
      test of its own.
  (4) One deferred question holds its own story only. The other stories' contracts are still
      authored in the stop (ADR-005 §4: one blocked story must not halt the wave).
  (5) The story and spike/chore bullets gain nothing. A story's Contract already opens with the
      beat, whose asking is its one stop; spikes and chores refuse refine before any beat.
  (6) "Conditional" is measured over the block's sentences that name a business question or
      `AskUserQuestion`: each sits in a bullet or paragraph that names `work.examples.enabled`.

  RULINGS (developer, 2026-09-24).
  (1) The `--autonomous` block runs from its bold lead to the `<amendment_ratification>` tag, so
      the rule's sentences sit in its bullets. The paragraph after the closing tag is not read.

  Background:
    Given the `--autonomous` block of `src/bundle/commands/refine.md` is read from this checkout

  Scenario: the rule sits beside the documented-default sentence and excepts business questions from it
    When the milestone cascade bullet is read
    Then it still says the cascade takes documented default decisions for non-critical open questions
    And in the same bullet it says a business-rule question from a story's example map never takes a default

  Scenario: the cascade runs discovery for every story and authors only the contracts no open question blocks
    When the `--autonomous` block is read
    Then it says the cascade runs the discovery beat for every story when `work.examples.enabled` is on
    And it says a story's Contract is authored only when its map has no open business question

  Scenario: the open business questions are asked at the one end review, through AskUserQuestion, with their tokens
    When the `--autonomous` block is read
    Then it says every open business question from every story is asked at the single end review, through `AskUserQuestion`, as a question and never as a default
    And it says each question carries its map token
    And it says the contracts the answers unblock are authored inside that same stop

  Scenario Outline: the one stop settles each story by what became of its question — <response>
    Given a cascade over two stories, each with one open business question
    When the `--autonomous` block is read
    Then by its rules, when the first story's question is <response>, <outcome>
    And the second story, whose question was answered, has its contract authored inside the stop

    Examples:
      | response                                         | outcome                                                                                      |
      | answered                                         | the answer is written into its map, and its contract is authored once the doctor stop is clean |
      | deferred by the person                           | the first story stays at the Contract gate, with no `tasks/` written                          |
      | refused by the harness (an error result)         | the first story stays at the Contract gate, with no `tasks/` written                          |

  Scenario: a question the person defers leaves its story at the gate
    When the `--autonomous` block is read
    Then it says a question the person does not answer leaves its story at the Contract gate, with no `tasks/` written

  Scenario: the autonomous review surface lists the questions asked apart from the defaults taken
    When refine's output section for `--autonomous` is read
    Then it says the review lists the business questions asked and their answers apart from the default decisions taken

  Scenario: with the gate off, the autonomous block reads as it does today
    When the `--autonomous` block is read
    Then every sentence the business-question rule adds is conditional on `work.examples.enabled`
