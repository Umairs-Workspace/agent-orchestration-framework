@executable @cli @work @validate
Feature: An arbiter must name the conflict, order the contenders, and say how long an adjustment stands

  An arbiter that does not say which conflict it owns is a veto edge with a title attached — it
  clears a check and records nothing, which is the outcome this kind exists to refuse. So the three
  declarations are required, not optional: the conflict it resolves, the order in which the
  contending loops win, and the dwell an adjustment stands for before a reversion is considered. A
  reader must be able to see the whole trade-off without running anything, and without opening
  another file — so the conflict is a phrase in the register a watcher's counter already uses, and a
  pointer at the contended actuator is not admitted in its place. The check derives that actuator for
  itself, and a record that points elsewhere for its own subject is not the reviewable half of
  anything.

  The dwell grammar is closed at two shapes — a count of cycles, or explicitly none — and it
  deliberately does not admit the sentinel the rest of this registry uses for absence. That sentinel
  exists for facts the repository does not supply; a dwell is not a discovered fact but a policy its
  author chooses, and "no dwell" already has a name. A field whose author may write "I do not know"
  in place of a decision is a field that records the evening's mood, so the refusal is the feature —
  and it is the same refusal on both of this kind's policy scalars, because an arbiter that will not
  name the conflict it owns has recorded no more than one that will not choose its own dwell.

  Nothing here judges the declarations against each other. Whether the order names exactly the loops
  the arbiter vetoes is a check's question and belongs to a later story; this one settles what shapes
  are admitted, and it adds no finding code to do it — a malformed value is refused by the
  bad-value finding the loader already had.

  ADR-003 §2, §4, §5. ADR-004 §3. FF-5801.

  Scenario: a complete arbiter is read clean
    Given an arbiter declaring the conflict it resolves, an ordered priority and a dwell
    When the registry is loaded
    Then it is parsed without a finding
    And the conflict it resolves is readable off the node
    And the count of cycles its dwell declares is readable off the node

  Scenario: an absent dwell is a missing field, not an assumed none
    Given an arbiter declaring a conflict and a priority but no dwell
    When the registry is loaded
    Then a missing-field finding names the dwell key
    And the parsed node carries no dwell value

  Scenario: the priority order is carried through exactly as declared
    Given an arbiter declaring a priority of three loops, most important first
    When the registry is loaded
    Then the parsed node reports those three loops in the order they were declared
    And no finding is raised about which loops the order names

  Scenario: a priority declared as a single value is refused as a non-list
    Given an arbiter declaring priority as one scalar reference
    When the registry is loaded
    Then the existing expected-list finding names the priority key

  Scenario: an empty priority is refused as an empty list
    Given an arbiter declaring priority as an empty list
    When the registry is loaded
    Then the existing empty-list finding names the priority key

  Scenario: the sentinel for an absent fact is refused for a dwell and still admitted where a fact can be absent
    Given an arbiter declaring its dwell unknown
    And a loop declaring its cadence unknown
    When the registry is loaded
    Then a bad-value finding names the dwell key
    And the loop's cadence is admitted with the existing cadence-unknown finding naming it

  Scenario: a malformed dwell is refused with the value quoted back
    Given an arbiter declaring a dwell the grammar does not admit
    When the registry is loaded
    Then the bad-value finding names the dwell key and quotes the value
    And the set of finding codes the loader can report is unchanged by this story

  Scenario: the conflict an arbiter resolves and the metric a watcher counts are read by one rule
    Given a value a watcher's counter refuses
    When an arbiter declares it as the conflict it resolves
    Then it is refused in the same way, naming the resolves key
    And every value either key admits, the other admits

  Scenario Outline: which fields an arbiter must carry
    Given an arbiter record omitting <field>
    When the registry is loaded
    Then the record reports a missing field naming <field>

    Examples: identity and the three declarations, and no default for any of them
      | field    |
      | id       |
      | kind     |
      | title    |
      | resolves |
      | priority |
      | dwell    |

  Scenario Outline: what a dwell admits
    Given an arbiter declaring dwell as <value>
    When the registry is loaded
    Then the record <outcome>

    Examples: a count of cycles at or above one, or none — and the boundary is one, not zero
      | value       | outcome                     |
      | cycles:1    | parses without a finding    |
      | cycles:2    | parses without a finding    |
      | cycles:12   | parses without a finding    |
      | none        | parses without a finding    |
      | cycles:0    | is refused as a bad value   |
      | cycles:-1   | is refused as a bad value   |
      | cycles:     | is refused as a bad value   |
      | cycles      | is refused as a bad value   |
      | cycles:2.5  | is refused as a bad value   |
      | cycles:two  | is refused as a bad value   |
      | 2           | is refused as a bad value   |
      | periodic:2  | is refused as a bad value   |
      | unknown     | is refused as a bad value   |
      | uncapped    | is refused as a bad value   |
      | [cycles:2]  | is refused as a non-scalar  |

  Scenario Outline: what a conflict declaration admits, and a counter with it
    Given an arbiter declaring resolves as <value>
    And a watcher declaring counter as the same value
    When the registry is loaded
    Then both records <outcome>

    Examples: one register for both keys — a phrase, never a pointer, never a sentinel
      | value                                    | outcome                    |
      | which loop wins the shared agent         | parse without a finding    |
      | speed vs thoroughness: whose demand wins | parse without a finding    |
      | prose:src/bundle/agents/aof-developer.md | are refused as a bad value |
      | config:work.loop.reviewRounds            | are refused as a bad value |
      | module:src/work-loops.mjs#loadLoops      | are refused as a bad value |
      | command:aof work loops validate          | are refused as a bad value |
      | unknown                                  | are refused as a bad value |
      | uncapped                                 | are refused as a bad value |
      | none                                     | are refused as a bad value |
      | (empty)                                  | are refused as a bad value |
      | [which loop wins the shared agent]       | are refused as non-scalars |
