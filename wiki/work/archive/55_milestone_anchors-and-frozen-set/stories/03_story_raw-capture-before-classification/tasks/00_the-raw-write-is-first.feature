@executable @cli @work @work-stream
Feature: What the person said is written first, verbatim, and is never rewritten

  The behaviour here is already correct and already unprotected. What is missing is the ordering
  guarantee — that the verbatim text becomes a durable record before anything else happens to it,
  and that whatever happens afterwards does not reach back and edit it.

  The reason is not tidiness. Once the raw text and its classification live in the same mutable
  record, "what was actually said" and "what it was filed as" become the same field, and every later
  triage silently overwrites the evidence it was supposed to be reasoning about. The exogenous
  ground this whole system rests on is a human's judgment; a record that quietly edits it is not
  ground.

  ADR-005. FF-5507.

  Scenario: the verbatim text is persisted before anything classifies it
    Given a person capturing feedback
    When the capture completes
    Then the text is durably recorded exactly as given
    And no classification exists for it yet

  Scenario: the recorded text is byte-identical to what was given
    Given feedback containing punctuation, line breaks and wording a classifier might normalise
    When it is captured
    Then the recorded text matches the input exactly

  Scenario: a raw record is never opened for rewrite
    Given a raw capture record
    When the same feedback is later triaged
    Then the raw record's text is unchanged

  Scenario: capture succeeds even when nothing downstream is ready to triage it
    Given a workspace with no triage having been run
    When feedback is captured
    Then it is recorded
    And it is readable

  Scenario: the record carries who raised it and when, alongside the text
    Given feedback captured by a named actor
    When the record is read
    Then it carries the actor and the moment beside the verbatim text
