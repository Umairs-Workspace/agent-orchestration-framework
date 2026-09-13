@executable @cli @work @validate
Feature: A serious finding reaches the declared actor directly, and the owner still hears it

  Addressing a finding to the reference-owner solves the first problem — the audited loop is not the
  one deciding whether its own bad news matters. It does not solve the second: a hierarchy can absorb
  a report on the way up, one polite layer at a time, and the more layers the governance grows the
  more places there are for that to happen.

  The bypass is a declared edge on the auditor, and it goes to an actor rather than to another loop,
  because a bypass that terminated inside the machinery is one more hop through the machinery. It is
  additive, not a re-route: the owner still receives their copy. What the escalation buys is that a
  second copy exists which nobody in the chain had to forward.

  Which findings escalate is a property of the code, in one table, exactly as severity is. Not a
  judgment made per finding, and not a synonym for severity.

  ADR-006 §3. FF-5909.

  Scenario: an escalating finding reaches the declared actor
    Given an audit finding whose code is in the escalating set
    When the report is produced
    Then the finding is addressed to the declared escalation actor

  Scenario: the owner still receives the escalating finding
    Given an audit finding whose code is in the escalating set
    And an instrument whose loop has a reference-owner
    When the report is produced
    Then the finding is addressed to that reference-owner
    And it is also addressed to the escalation actor

  Scenario: a non-escalating finding does not reach the actor
    Given an audit finding whose code is not in the escalating set
    When the report is produced
    Then the finding is addressed to the reference-owner only

  Scenario: whether a finding escalates is decided by its code
    Given two findings of the same severity whose codes differ in escalation
    When the report is produced
    Then one of them reaches the escalation actor and the other does not
    And the difference is attributable to the code rather than the severity

  Scenario: the escalating set has one home
    Given the set of codes that escalate
    When it is read back
    Then it comes from a single declared table
    And no finding decides its own escalation at the point it is raised

  Scenario: the bypass terminates at an actor
    Given the escalation endpoint the auditor declares
    When it is resolved
    Then it names a declared actor
    And it does not name a loop
