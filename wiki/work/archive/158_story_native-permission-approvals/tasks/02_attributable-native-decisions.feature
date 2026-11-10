@cli @work @work-stream
Feature: Native review results remain attributable observations

  Rule: R3 · Native review outcomes are attributable and never manufactured

    @executable
    Scenario: E2 · A business answer cannot decide a native permission review
      Given a run has an in-progress native permission review
      When a business-question answer contains the text approve
      Then the native review outcome is unchanged
      And no positive native approval reply is emitted by AOF
      And business-question delivery retains its own existing semantics

    @executable
    Scenario: E3 · An old turn's result cannot decide work in a new turn
      Given a new turn is observing review-7
      When an approved result for review-7 arrives with the prior turn's identity
      Then the new turn's review remains pending
      And its run observation and phase result are unchanged

    @executable
    Scenario: E10 · Native denial remains denial without overriding the reviewer
      Given a native automatic review concerns a required test operation
      When the reviewer reports denied
      Then the run records that native denial without fabricating approval
      And AOF neither retries the denied action nor reports successful verification from the denial
      And the native agent may continue with a different permitted operation
      And only the eventual valid native phase result may settle the phase

    @executable
    Scenario Outline: Review outcomes retain their native meaning across request families
      Given an admitted profile reports a review of <action>
      When that review completes with <status>
      Then the matching run records <status> with native decision source agent
      And review completion alone never counts as tool completion or phase success

      Examples:
        | action             | status   |
        | command            | approved |
        | command            | denied   |
        | applyPatch         | approved |
        | applyPatch         | denied   |
        | requestPermissions | approved |
        | requestPermissions | denied   |
        | requestPermissions | timedOut |
        | command            | aborted  |
        | networkAccess      | approved |

    @executable
    Scenario Outline: Invalid or repeated observations cannot rewrite native history
      Given the current run owns session s1 and turn t1
      When a review notification has <condition>
      Then <result>
      And no positive native reply or synthetic successful phase is produced

      Examples:
        | condition                            | result                                               |
        | another session identity             | the current run remains unchanged                    |
        | another turn identity                | the current run remains unchanged                    |
        | an exact duplicate terminal event    | the existing terminal observation remains unchanged   |
        | a conflicting terminal decision      | the drive reports invalid native review evidence      |
        | a missing review id in this turn     | the drive reports invalid native review evidence      |
        | an unknown status in this turn       | the drive reports invalid native review evidence      |
        | malformed timestamps in this turn    | the drive reports invalid native review evidence      |
        | a completion with no observed start  | only observed completion and missing-start are stored |
        | a valid network review with no item  | the review is attributed by its native review id      |

    @executable
    Scenario Outline: Unexpected client approval requests cannot bypass automatic review
      Given native automatic review was acknowledged for the current turn
      When a well-formed client request of family <family> arrives instead
      Then AOF sends only that profile's no-grant response to the matching RPC
      And the drive stops with an explicit automatic-review routing failure
      And no business question, operator approval request or fallback session is created

      Examples:
        | family            |
        | command execution |
        | file change       |
        | permission scope  |

    @executable
    Scenario Outline: Unknown or malformed client requests fail without granting access
      When the native server sends <request>
      Then AOF reports an explicit protocol failure and performs bounded cleanup
      And it does not return a positive grant or treat the request as a business answer

      Examples:
        | request                         |
        | an unknown mandatory method     |
        | a missing request identity      |
        | a mismatched session or turn    |
        | an unsupported permission shape |

    @executable
    Scenario: Sensitive review payloads do not enter shared AOF artifacts
      Given raw native action, cwd, permission and rationale fields contain distinct fixture canaries
      When review activity is persisted and reported through the loop and worker paths
      Then run records and ordinary output contain only the declared review metadata
      And logs and notification payloads contain none of the canaries
      And absent native evidence remains absent rather than inferred from rationale text
