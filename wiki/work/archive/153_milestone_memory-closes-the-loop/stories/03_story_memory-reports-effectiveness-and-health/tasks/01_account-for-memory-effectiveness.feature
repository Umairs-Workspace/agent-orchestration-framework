Feature: Memory status reports observed effectiveness without inventing evidence

  Rule: R1 · Accounting preserves record identity and separates observation from recurrence

    @executable @cli @work @memory
    Scenario: E1 · Surfacing and recurrence are counted from their separate evidence
      Given lesson "45/R13" is returned by two distinct completed recall observations
      And the first verdict is honoured and the second verdict is departed
      And one distinct new lesson carries Recurs "45/R13"
      When the operator runs "aof work memory status --lessons --json"
      Then effectiveness.lessons identifies "45/R13" with surfaced 2, honoured 1, departed 1, irrelevant 0 and recurred 1
      And effectiveness.types includes those counts under lesson
      And the report does not claim that honouring the lesson proves it prevented a mistake

    @executable @cli @work @memory
    Scenario: E2 · Bare lesson ids do not join unrelated items
      Given indexed lessons "45/R13" and "68/R13"
      And only "45/R13" has recall or recurrence evidence
      When status is requested with per-lesson accounting
      Then "68/R13" is included with all five counts zero
      And none of "45/R13" evidence is attributed to "68/R13"

    @executable @cli @work @memory
    Scenario: E3 · A removed target retains its observed history
      Given a completed recall records lesson "45/R13" as honoured
      And "45/R13" is no longer present in the current index
      When status is requested with per-lesson accounting
      Then "45/R13" retains surfaced 1 and honoured 1
      And its provenance is explicitly unresolved rather than invented
      And it still contributes to the lesson effectiveness totals

    @executable @cli @work @memory
    Scenario: Every returned record type contributes only its own observations
      Given one observation returned a lesson as honoured, an ADR as irrelevant and a capability as departed
      When status is requested without the lessons option
      Then effectiveness.types reports surfaced 1 for each of lesson, adr and capability
      And the verdict counters for each type reflect its own returned record
      And per-lesson detail is omitted while legacy status fields and top-level record counts are preserved

    @executable @cli @work @memory
    Scenario Outline: Accounting is shared by every configured backend
      Given the work stream contains two complete observations of lesson "45/R13"
      And the selected memory backend is "<backend>"
      When the operator requests JSON status
      Then the lesson effectiveness totals report surfaced 2
      And status does not write an index, ledger or retrospective

      Examples:
        | backend  |
        | local    |
        | graphify |
        | none     |

    @executable @cli @work @memory
    Scenario: Empty and missing observations do not become lesson exposures
      Given an item has one completed recall with an empty records array
      And another item has no feedback ledger
      When status counts the stream's memory evidence
      Then neither item adds surfaced, honoured, departed, irrelevant or recurred counts
      And the empty observation is not diagnosed as corrupt

    @executable @cli @work @memory
    Scenario: Archived and story evidence is included without transitive recurrence
      Given an archived lesson "45/R13" is recalled by a story-owned observation
      And lesson "68/R10" recurs from "45/R13"
      And a third lesson recurs from "68/R10"
      When status counts the complete work stream
      Then "45/R13" has surfaced 1 and recurred 1
      And "68/R10" has recurred 1
      And the third lesson does not add a second recurrence to "45/R13"

    @executable @cli @work @memory
    Scenario: Identical replay evidence cannot inflate accounting
      Given the source walk encounters the same observation id with identical payload twice for one owner
      And encounters the same canonical new lesson identity twice
      When status aggregates the observations and recurrence stamps
      Then each observation and each new lesson contributes only once
      And separate recall ids with the same query remain separate observations

    @executable @cli @work @memory
    Scenario Outline: Unreadable evidence is not reported as a successful zero
      Given the selected evidence contains "<defect>"
      When status reads memory effectiveness
      Then it reports a diagnostic naming the source and "<defect>"
      And it does not describe the failed read as zero observations
      And no source file is changed

      Examples:
        | defect                              |
        | malformed ledger JSON               |
        | unknown ledger kind                 |
        | conflicting payloads for one recall id |
        | unreadable ledger file              |

    @manual @cli @work @memory
    Scenario: The complete refine and build observation path is inspectable
      Given a disposable stream with architect, PO and developer observations written through the memory command
      And a later lesson explicitly recurs from one returned lesson
      When the verifier compares parsed ledger rows and retrospective sections with JSON status
      Then each returned identity and verdict reconciles to the displayed counts
      And the later lesson contributes one recurrence to its named predecessor
      And VERIFICATION records the command evidence separately from human UAT
