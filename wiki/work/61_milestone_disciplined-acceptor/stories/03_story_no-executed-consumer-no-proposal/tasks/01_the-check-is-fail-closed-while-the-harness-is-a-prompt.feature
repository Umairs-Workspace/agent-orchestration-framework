@executable @cli @work @validate
Feature: Where consumption cannot be decided, the answer is refusal — and the report says which ground

  The path that built every item this system has ever delivered is a prompt document, and a prompt
  names no configuration key: it states its policy in prose — three rounds is the hard cap — and
  nothing can read a number out of a sentence and show that a decision turned on it. For that harness
  the previous question is not decidable in either direction: nobody can prove the knob is consumed,
  and nobody can prove it is not.

  There are two honest answers to an undecidable question and they are not symmetric. Answering
  admissible lets a whole class of proposals through on a question no one answered, which is the exact
  failure the control exists to remove. Answering refused costs nothing while no knob is live. So the
  answer is refusal, and the check is fail-closed.

  What is worth arguing about is that this is a SWITCH and not a judgement about any particular knob:
  while it applies it refuses everything alike and discriminates between nothing. That is why it must
  say so on the surface — a switch mistaken for a discriminating control is a false claim about how
  much of this machinery is working — and why its condition must be evaluated against the declared
  harness rather than asserted as a constant. The day the harness names the key, this ground must stop
  refusing, with nothing edited here to bring it about.

  ADR-008 §2. FF-6109.

  Scenario Outline: the fall-back is decided by reading the declared harness, never asserted
    Given a harness of record that is <harness>
    When a proposal is assessed
    Then the undecidable ground <verdict>

    Examples:
      | harness                                                       | verdict              |
      | a prompt stating its policy in prose and naming no config key | refuses the proposal |
      | a prompt that names the knob's configuration key              | does not apply       |
      | a path whose decisions can be read without a prompt           | does not apply       |
      | a document that is declared but cannot be read                | refuses the proposal |
      | not declared at all                                           | refuses the proposal |

  Scenario: while the ground applies it refuses every proposal alike
    Given a harness of record from which no configuration key can be read
    When proposals on several different knobs are assessed
    Then every one of them is refused
    And no proposal is refused for a reason particular to its own knob

  Scenario: evidence does not outvote a fail-closed refusal
    Given a harness of record from which no configuration key can be read
    And evidence on a knob that would otherwise be enough to commit
    When the proposal is assessed
    Then it is refused
    And the evidence changes nothing about the outcome

  Scenario: the report names the ground it fell back on
    Given a proposal refused because the harness cannot be read for a configuration key
    When the refusal is read
    Then it names the harness of record it consulted
    And it says the refusal is a fall-back rather than a finding about this knob
    And it is distinguishable from a refusal for want of an executed consumer

  Scenario: a proposal failing on both grounds is told both
    Given a knob whose value reaches no decision
    And a harness of record that names no configuration key
    When the proposal is assessed
    Then the refusal names both grounds
    And closing either one on its own still leaves the proposal refused

  Scenario: naming the key in the harness re-opens the question with nothing else edited
    Given a harness of record that names no configuration key, and every proposal refused
    When the harness is changed so that it names the key and decides by it
    And the same proposal is assessed again
    Then the undecidable ground no longer refuses it
    And the proposal is judged on whether the knob has an executed consumer
    And the only thing that changed is the harness document

  Scenario: the surface does not dress a switch as a discriminating control
    Given the fall-back is refusing every proposal
    When the report is read
    Then it states that the ground applied to every proposal alike
    And no knob is presented as having been judged on its own merits
