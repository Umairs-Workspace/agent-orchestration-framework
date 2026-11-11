Feature: Doctor reports lessons whose prevention needs attention

  Rule: R2 · Unpromoted lesson age warnings start at the operator-selected acceptance threshold

    @executable @cli @work @memory
    Scenario: E4 · The default warning starts at five later accepted milestones
      Given a lesson explicitly has Promoted to "none"
      And its item's acceptance boundary is known
      And four distinct top-level milestones have been accepted after that boundary
      When the operator runs normal work doctor without a threshold override
      Then no aged-unpromoted warning is emitted for that lesson
      When a fifth distinct top-level milestone is accepted after the boundary and doctor runs again
      Then an advisory aged-unpromoted warning identifies the lesson, age 5 and default threshold 5

    @executable @cli @work @memory
    Scenario: E5 · Legacy absence is distinguished from an explicit promotion answer
      Given one age-five lesson has no legacy Promoted to field
      And another age-five lesson explicitly has Promoted to "none"
      When doctor examines their promotion state
      Then both are reported as unpromoted
      And the first identifies missing legacy metadata while the second identifies explicit none
      And neither retrospective is back-filled

    @executable @cli @work @memory
    Scenario: E6 · Missing acceptance evidence remains unknown age
      Given an unpromoted lesson has no known acceptance boundary
      And many later-numbered milestones exist in the stream
      When doctor assesses the lesson's age
      Then it identifies the missing acceptance evidence as unknown age
      And it does not issue an aged-unpromoted warning based on the numeric refs

    @executable @cli @work @memory
    Scenario Outline: Only later distinct accepted milestones age a lesson
      Given an unpromoted lesson has a known acceptance boundary and age 4
      And the stream additionally contains "<event>"
      When doctor computes acceptance age
      Then the lesson's age is "<age>" and its aged-unpromoted warning is "<warning>"

      Examples:
        | event                                                     | age | warning |
        | an accepted story after the boundary                      | 4   | absent  |
        | a milestone that is still in progress                     | 4   | absent  |
        | an accepted milestone at the same acceptance instant      | 4   | absent  |
        | an accepted milestone before the boundary                 | 4   | absent  |
        | a duplicate listing of an already-counted milestone       | 4   | absent  |
        | a distinct archived milestone accepted after the boundary | 5   | present |

    @executable @cli @work @memory
    Scenario: Nested and standalone stories use their correct acceptance boundary
      Given a nested story's parent was accepted before five later milestones
      And a standalone story was accepted before four later milestones
      And each story has an unpromoted lesson
      When doctor computes their ages
      Then the nested story's lesson warns at age 5 using its parent's acceptance boundary
      And the standalone story's lesson is quiet at age 4 using its own acceptance boundary
      And story completion itself contributes no accepted-milestone increment

    @executable @cli @work @memory
    Scenario Outline: A recorded promotion removes the aged-unpromoted signal
      Given an age-ten lesson has a valid Promoted to value of kind "<kind>"
      When doctor examines that lesson
      Then it emits no aged-unpromoted warning for that lesson
      And any independent recurrence signal is retained

      Examples:
        | kind    |
        | control |
        | rule    |
        | prompt  |

  Rule: R3 · Health signals advise without becoming acceptance controls

    @executable @cli @work @memory
    Scenario: E7 · A recurring archived lesson remains visible and unchanged
      Given a distinct lesson carries Recurs "45/R13"
      And the predecessor "45/R13" is archived and already promoted
      When doctor examines the stream
      Then a warning identifies the recurring predecessor and the new lesson that references it
      And the promotion does not suppress the recurrence warning
      And the archived retrospective remains byte-identical

    @executable @cli @work @memory
    Scenario: E8 · Memory health warnings preserve normal doctor success
      Given an otherwise healthy fixture has only recurrence and aged-unpromoted findings
      When the operator runs normal work doctor with JSON output
      Then it returns exit 0 with errors 0 and warning-severity memory findings
      And neither memory finding is admitted to acceptance control gate codes
      And live validation does not turn those health signals into new meta errors

    @executable @cli @work @memory
    Scenario: Strict doctor retains its existing warning policy
      Given the same fixture has only advisory memory health warnings
      When the operator runs doctor in strict mode
      Then its existing strict-warning exit policy is preserved
      And the memory findings still have warning severity

    @executable @cli @work @memory
    Scenario: Scoped doctor filters reports without forgetting acceptance context
      Given item "45" has an unpromoted lesson and five later accepted milestones elsewhere in the stream
      And an unrelated item has a recurring lesson
      When doctor is scoped to item "45"
      Then it computes age 5 from the stream's acceptance facts
      And it reports only in-scope lesson findings
      And it does not reset age to zero because later milestones are outside the reporting scope

    @manual @cli @work @memory
    Scenario: Removing the boundary check is observable in the age fixture
      Given the age-four and age-five examples run through the actual doctor command
      When the verifier temporarily changes the default warning comparison to admit age 4
      Then the age-four case fails with an unexpected warning
      And VERIFICATION records that observed failure before the comparison is restored
