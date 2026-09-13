@executable @cli @work @work-stream
Feature: A finding-triggered wake reads that a capture exists and which item it is about, never what it says

  Capture already refuses this at the door. `work:feedback` accepts raw text and attribution and
  nothing else, and any classification key handed to it is a coded refusal deferring the judgement to
  triage. A trigger that woke a loop *because a finding was a bug* would be performing exactly that
  judgement one layer away, in a place no refusal is watching — so the rule is not restated here as
  caution, it is the same rule holding at its second consumer.

  What the source may read is that a capture exists and which item it is attributed to. What it may
  not do is read, infer, score or branch on what the capture says. The distinction is invisible in a
  test that ever plants only one capture, which is how a wrong implementation survives: a body-reading
  source and a body-blind source agree on every single-capture fixture ever written. The observable
  form is therefore comparative and it is the whole point of the first table below — two captures
  differing only in what they say produce answers that are identical, character for character.

  The tempting version is helpful rather than careless. "Wake at L3 when the finding reads like a
  blocker" is a sentence someone will write, and it is a severity, a type and a priority decided by a
  regular expression over prose nobody triaged. There is no field in the answer where such a reading
  could be stored, and no summary, excerpt, length or digest of the body either — a digest is content
  that has been shortened, not content that was not read.

  Attribution is the whole input, so everything else a capture carries is out too: who raised it, what
  it referenced, when it landed, what its record id was, where it sits in the file, and how many of
  them there are. A count is a score with no scale. And a capture that has since been triaged is
  still not readable here — triage's verdict is a classification whether or not this family computed
  it, and reading one would be the same failure wearing somebody else's answer.

  ADR-007 §1, §2. 55/ADR-005. ADR-001 §2. FF-6307.

  Scenario Outline: what a capture says never reaches the answer
    Given two captures attributed to the same item, one reading <text> and one a plain sentence
    When a finding signal is resolved for each of them
    Then the two answers are identical, character for character
    And neither carries any part of what either capture says
    And the scope of both is the one the attribution names

    Examples: the body varies wildly and the answer does not vary at all
      | text                                                        |
      | a plain sentence about a build                              |
      | a sentence calling the finding a blocker                    |
      | a sentence calling the finding a defect                     |
      | a sentence calling the finding an enhancement               |
      | a sentence asking for a phase by name                       |
      | a sentence asking to be run at L3                           |
      | a sentence naming another item's ref                        |
      | a sentence naming a scope range                             |
      | a sentence quoting the refusal code capture itself raises   |
      | a single word                                               |
      | ten thousand characters of prose                            |
      | punctuation and no words at all                             |
      | a body in a language the reader does not speak              |

  Scenario Outline: nothing else a capture carries changes the answer either
    Given two captures attributed to the same item, differing only in <difference>
    When a finding signal is resolved for each of them
    Then the two answers are identical
    And the difference is named nowhere in either answer

    Examples: attribution is the input; the rest of the record is not
      | difference                                              |
      | who raised them                                         |
      | what they reference                                     |
      | when each was captured                                  |
      | the record id each was written under                    |
      | the order they sit in within the record                 |
      | one having since been triaged and one not               |
      | the classification a later triage attached to one       |

  Scenario: the scope comes from the attribution alone
    Given one capture attributed to one item and one attributed to an item under another driver
    When both finding signals are resolved
    Then each answers with the scope its own attribution names
    And the two answers differ only in that scope

  Scenario: how many captures an item carries is not a reading of them
    Given one item carrying a single capture and another carrying nine
    When a finding signal is resolved for each
    Then both answer with the scope their attribution names
    And neither answer names a count, a rate, a score or a severity

  Scenario: the answer says a capture exists and which item, and nothing about what kind of finding it is
    Given a resolved finding signal
    When the whole answer is read
    Then it records that a capture exists and the item it is attributed to
    And it carries no excerpt, no summary, no length and no digest of the capture
    And it carries no severity, no type, no priority and no triage verdict

  Scenario: existence is the key, so an item carrying no capture wakes nothing
    Given a finding signal naming an item that carries no capture at all
    When it is resolved
    Then no scope is resolved for it
    And the answer is a refusal naming the finding source and the item that carried none
    And no capture belonging to any other item is consulted to answer it
