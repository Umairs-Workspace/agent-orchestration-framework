@executable @cli @work @validate
Feature: Three signals, one question — a source answers which scope, and its answer carries nothing else

  A cadence line, a build's signal and an inbound capture arrive from three unrelated places and are
  put to one question: which scope. Everything else an unattended run needs — the level it may run
  at, the bound it stops at, the gate it must clear, the process that carries it — already has an
  owner, and a source that answered any of them would have become the coordinator this milestone was
  written to refuse, one plausible field at a time.

  That is how a wrong implementation gets here: not by ambition, but by convenience. A source holding
  a signal already knows enough to guess a level, and a source that can name an argv can just as
  easily run it. Each addition is one field and every field looks helpful in isolation. So the claim
  is stated as an exhaustive reading of the answer rather than as an intention — the keys are
  enumerated in full, and a fourth key is a failure here rather than a remark at review.

  The cadence source is the one that looks like it should hold a clock, and it does not. It resolves
  a scope that was declared; the caller decides when to ask. Observably that means the answer does
  not move when the clock does, nothing waits before returning, and a cadence that has not come round
  yet is still answered — deciding that now is the wrong moment to fire is scheduling, and the
  scheduler is the crontab line, the CI step or the dispatch that already exists.

  Sameness across the three is the contract rather than a coincidence. Three differently shaped
  answers for one command's input would be three vocabularies to keep in step with it, and the
  difference between them would only ever be discovered by whoever wired the third one up.

  ADR-007 §3, §4. ADR-001 §1, §2. ADR-003 §1. FF-6307.

  Scenario Outline: one declared scope, three signals, one answer
    Given a cadence trigger, a CI signal and an inbound finding that each name scope <scope>
    When each source resolves the signal it was handed
    Then each answers with scope <scope>
    And the three answers differ in nothing but which source answered and what it resolved from
    And none of them names an item, a phase, a level or a command to run

    Examples: the answer is the scope, whichever signal carried it
      | scope |
      | 63    |
      | 7     |
      | 60-63 |
      | 63-63 |

  Scenario Outline: what no source's answer ever carries
    Given one resolved answer from each of the three sources
    And a signal that offers <field> of its own
    When each answer is read key by key
    Then <field> is absent from all three
    And no source passes through the value the signal offered for it

    Examples: every field here already has an owner outside this family
      | field                                        |
      | a level to run at                            |
      | a cap, a cycle count or any other bound      |
      | a gate verdict, a score or a threshold       |
      | a program, an argv or anything to execute    |
      | a phase directive                            |
      | a prompt or a slash command                  |
      | a session, a worktree or a branch            |

  Scenario: the whole answer is a scope and its provenance, enumerated
    Given a resolution from any of the three sources
    When its keys are listed in full
    Then they are the scope, the source that answered, and what that source resolved the scope from
    And there is no fourth key

  Scenario: a cadence source resolves a declared scope, and the clock stays the caller's
    Given a cadence trigger declaring a scope and a cadence
    When it is resolved twice, at two instants far apart
    Then both answers are identical
    And neither carries a next fire time, a due-at, or an interval to wait for
    And each resolution returns without waiting for any part of the cadence to elapse

  Scenario: a cadence that has not come round yet is still answered
    Given a cadence trigger declaring a cadence far longer than the gap between two calls
    When it is resolved twice inside that gap
    Then both calls answer with the declared scope
    And neither answer is withheld as not yet due
    And no source decides whether now is the right moment to fire

  Scenario: every answer names the source that produced it
    Given one resolution from each source, all carrying the same scope
    When each answer is read
    Then it names its own source
    And the three remain distinguishable from one another by that name alone

  Scenario: a source answers from what it is handed, and reads nothing else
    Given one signal resolved twice, from two working directories over two different work trees
    When the two answers are compared
    Then they are identical
    And neither answer changed with the tree it was resolved beside
    And neither reading required a file, a clock or an environment value to be present
