@executable @cli @work @work-stream
Feature: resume sends the operator to the questions, from one waiting-on-a-human rule

  WHY. `aof work resume` already reports a run waiting on an answer, but it reads that from its own
  copy of the rule, `openLastAsk`, beside the loop's `standingAsk`. The two drift: `standingAsk`
  refuses an array entry and `openLastAsk` does not. Resume keeps its row, takes the loop's rule,
  and points at `aof work questions` for the text rather than growing a second listing.

  Rule: R4 · `aof work resume` sends me to `aof work questions` for the question text

    Scenario: E10 · a waiting row keeps NEEDS YOUR ANSWER and the tail names the questions verb
      Given item "011" has a running run whose last ask is unanswered
      When "aof work resume" is run
      Then the row for "011" reads "NEEDS YOUR ANSWER"
      And the output says to read the question with "aof work questions"
      And the output prints no question text

    Scenario Outline: resume and the loop agree on whether a run waits on a human
      Given a running run with a fresh heartbeat whose last asks entry is <entry>
      When "aof work resume" is run
      Then the row's state is <state>
      And the loop's "standingAsk" returns <standing> for the same record

      Examples:
        | entry                                 | state           | standing  |
        | an object with no answeredAt          | waiting-on-you  | the entry |
        | an object with an answeredAt          | in-flight       | null      |
        | an array                              | in-flight       | null      |

    Scenario: the waiting-on-a-human rule is written once
      Given the comment-stripped source of "packages/work/src/commands/resume.mjs"
      When it is searched for a definition of "openLastAsk"
      Then none is found
      And the reentry commands receive "standingAsk" from the loop's ask services
