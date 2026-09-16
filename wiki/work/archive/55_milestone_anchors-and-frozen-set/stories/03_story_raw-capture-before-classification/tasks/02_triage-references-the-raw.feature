@executable @cli @work @work-stream
Feature: Triage points at what was said; it does not become it

  Classification is not forbidden — it is deferred, and then kept separate. The distinction that has
  to survive is between the two questions a reader will one day ask: what did the person actually
  say, and what did we decide that meant. If those live in one record, the second answer overwrites
  the first and nobody can tell that it did.

  The cheap wrong shape is a single record with a nullable classification field, filled in later.
  That is a menu with a blank option — it makes the classification part of the captured artifact,
  and it makes "was this classified at capture or afterwards" unanswerable from the record itself.

  ADR-005. FF-5507.

  Scenario: a classification is a separate record referencing the raw one
    Given a raw capture that has been triaged
    When both records are read
    Then the classification names the raw record it applies to
    And the raw record contains no classification

  Scenario: the two questions have two answers
    Given a raw capture whose triage assigned it a severity and a routing
    When the records are read
    Then what was said and what it was filed as are separately readable

  Scenario: re-triage does not disturb the raw record
    Given a raw capture that has been triaged twice
    When the raw record is read
    Then its text is the original text

  Scenario: an untriaged capture is complete on its own
    Given a raw capture that has never been triaged
    When it is read
    Then it is a complete record
    And nothing about it is reported as missing

  Scenario: a classification cannot exist without a raw record to point at
    Given a classification referencing a raw record that does not exist
    When it is written
    Then the write is refused
