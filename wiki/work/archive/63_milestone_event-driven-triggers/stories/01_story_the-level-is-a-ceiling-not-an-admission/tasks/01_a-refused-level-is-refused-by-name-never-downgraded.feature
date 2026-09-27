@executable @cli @work @work-stream
Feature: A level the gate refuses is refused with the failing half named, and no lower level is put in its place

  The substitution this refuses is the helpful-looking one. A trigger asks for the unattended rung,
  the workspace does not qualify, and running it one rung down looks like a kindness: something still
  happens, nothing dangerous is admitted, and the caller is not blocked. It is the milestone's whole
  failure mode wearing a friendly face. The caller asked for a run nobody would attend, and a quiet
  downgrade gives it an attended run with nobody attending — the level that was actually granted is
  then a fact no declaration states and no diff shows.

  The naive test passes a downgrade without noticing. Assert that resolution succeeded, that the
  answer carries a level, and that the level is one the ladder knows, and a substituted rung satisfies
  all three. The leg has to be driven positively instead: over facts the gate fails, the resolved set
  contains no entry for that trigger at any level at all, and the only thing produced for it is a
  refusal.

  A refusal that amounts to "not yet" is the second failure. What the caller is owed is which half
  failed and what failed it — the score with the threshold it missed and the checks that blocked it,
  or the components that came back self-referential, stale or grounded only from outside — because
  that is the difference between a system with an opinion and a system with an argument. This is the
  most-read output the story produces, since by definition it is what a workspace sees until it
  qualifies.

  The matrix below walks every way the gate has of failing, one half at a time, then both. The rows
  where the score sits exactly at its threshold but clears a lower rung, and where no score was read
  at all, are the ones an implementation that checks only the number gets wrong.

  ADR-004 §1, §3. FF-6304.

  Scenario Outline: which half failed, and what the refusal has to name for it
    Given a trigger declaring L3
    And gate facts whose score reading is <score> and whose report is <report>
    When the trigger is resolved
    Then the answer <outcome>
    And it names <particulars>

    Examples: one half at a time, then both, and the two readings that are missing rather than failing
      | score                       | report                              | outcome                    | particulars                                   |
      | at the threshold, clears L3 | reported, present, nothing failing  | admits L3                  | the level it admitted                         |
      | one short of the threshold  | reported, present, nothing failing  | refuses on the score       | the score, the threshold and the checks       |
      | at the threshold, clears L2 | reported, present, nothing failing  | refuses on the score       | the level the score actually clears           |
      | at the threshold, clears L1 | reported, present, nothing failing  | refuses on the score       | the level the score actually clears           |
      | never read at all           | reported, present, nothing failing  | refuses on the score       | that no score was read                        |
      | at the threshold, clears L3 | never reached the reported state    | refuses on groundedness    | the state the report came back in             |
      | at the threshold, clears L3 | reported but not present            | refuses on groundedness    | the state the report came back in             |
      | at the threshold, clears L3 | one self-referential component      | refuses on groundedness    | that component and its members                |
      | at the threshold, clears L3 | one stale component                 | refuses on groundedness    | that component and the authority that decayed |
      | at the threshold, clears L3 | one exogenous-only component        | refuses on groundedness    | that component and its ground classes         |
      | at the threshold, clears L3 | three failing components            | refuses on groundedness    | all three, not the first                      |
      | one short of the threshold  | one stale component                 | refuses on both halves     | the particulars of both halves                |
      | never read at all           | never reached the reported state    | refuses on both halves     | the particulars of both halves                |

  Scenario: a refused trigger is resolved at no level at all
    Given a trigger declaring L3 over gate facts the gate fails
    When the declaration is resolved
    Then the answer for that trigger is a refusal
    And the resolved set carries no entry for it at L3
    And it carries no entry for it at L2, at L1, or at any other level
    And no work:loop input and no argv is emitted for it

  Scenario: the refusal names the level that was asked for and offers no other
    Given a trigger refused at L3
    When the refusal is read
    Then it names L3 as the level that was requested
    And it names no level the run may use instead
    And it does not report the trigger as resolved

  Scenario: asking for less is an edit to the declaration, which is a diff a reviewer sees
    Given a trigger refused at L3
    When its declaration is changed to declare L2 and it is resolved again over the same failing facts
    Then it resolves at L2
    And the level it now runs at is stated in the declaration rather than chosen at resolution

  Scenario: the refusal is machine-readable and is not a crash
    Given gate facts the gate fails
    When a trigger declaring L3 is resolved
    Then the resolution completes and reports the refusal
    And the refusal carries a code
    And it carries the failing halves and their particulars as structured values
    And no exception escapes to the caller

  Scenario Outline: no source is trusted with the rung and no scope is exempt from the gate
    Given gate facts the gate fails
    And a trigger declaring L3 whose signal came from <source> over <scope>
    When it is resolved
    Then it is refused
    And the refusal names the failing half rather than the source

    Examples: a trusted source would be a config key with a nicer name
      | source              | scope     |
      | a mesh assignment   | a driver  |
      | a cadence           | a range   |
      | a CI signal         | a driver  |
      | an inbound finding  | a range   |
