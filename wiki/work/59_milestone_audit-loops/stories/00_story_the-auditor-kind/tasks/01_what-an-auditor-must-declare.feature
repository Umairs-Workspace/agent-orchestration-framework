@executable @cli @work @validate
Feature: What an auditor must declare — its subject, its reading, its cadence and its way out

  A watcher must say what it counts; an arbiter must say what it resolves. An auditor must say four
  things, and each of them closes a specific way the audit could quietly become something else.

  It must name the instruments it reads, so "the audit judges instruments, not work" is checkable
  rather than promised — and a work item is deliberately not an admissible subject, because a work
  item is the work. It must say how it reads them, and that reading may not be a prose authority: a
  prose measurement means a person or a model looked and reported, which is the agent-as-judge
  auditing this milestone put out of scope. It must declare a cadence, because an audit that runs when
  somebody remembers is not a loop. And it must declare the actor it can reach directly, because the
  emergency channel has to exist before the emergency.

  ADR-001 §1. FF-5901.

  Scenario Outline: each required key is required, and its absence is named
    Given an auditor record missing only its <key>
    When the registry is loaded
    Then a missing-field finding names <key>
    And the record is not parsed as a complete auditor

    Examples:
      | key         |
      | audits      |
      | measurement |
      | cadence     |
      | escalation  |

  Scenario: the subject list may not be empty
    Given an auditor record declaring an empty audits list
    When the registry is loaded
    Then a finding names the audits key
    And an auditor with no declared subject is not accepted as an auditor of everything

  Scenario Outline: an instrument pointer resolves against the schemes the registry already knows
    Given an auditor declaring <pointer> as something it audits
    When the registry is loaded
    Then the pointer is <verdict>

    Examples:
      | pointer                          | verdict                              |
      | a module path                    | accepted as an instrument            |
      | a registered command             | accepted as an instrument            |
      | a config key                     | accepted as an instrument            |
      | a declared loop id               | accepted as an instrument            |
      | a declared watcher id            | accepted as an instrument            |
      | a declared anchor id             | accepted as an instrument            |
      | a work item reference            | refused, naming the audits key       |
      | a scheme no record has declared  | refused, naming the audits key       |

  Scenario: a work item is refused as a subject, and the refusal says why
    Given an auditor declaring a work item as something it audits
    When the registry is loaded
    Then a bad-value finding names the audits key and quotes the value
    And no node is parsed that audits a work item

  Scenario: an auditor's reading may not be a prose authority
    Given an auditor whose measurement cites only a document
    When the registry is loaded
    Then a bad-value finding names the measurement key
    And the finding distinguishes it from the prose-only warning a loop or a watcher receives for the same value

  Scenario: a loop and a watcher keep the prose measurement they are allowed
    Given a loop and a watcher whose measurement cites only a document
    When the registry is loaded
    Then each is parsed
    And each carries the prose-only warning it has carried since milestone 52
    And neither is refused

  Scenario: the escalation endpoint must be an actor
    Given an auditor whose escalation names a loop rather than an actor
    When the registry is loaded
    Then a bad-value finding names the escalation key
    And a bypass that terminates inside the machinery is not accepted as a bypass

  Scenario: an unparseable cadence is refused as it is for every other cycle
    Given an auditor declaring a cadence outside the cadence vocabulary
    When the registry is loaded
    Then the existing cadence finding names the value
    And no cadence is assumed on the record's behalf
