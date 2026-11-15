@executable @docs @work @planning
Feature: What research settles comes back as one batch to skim

  WHY. A stream of "research says X, agree?" questions would be the interruption this milestone
  removes. A story's researched examples reach the operator once, together, to skim and object to
  (SPEC Scope, second bullet; ADR-004 §6, §7). The batch carries no map token, because the anchor
  of a researched example is its finding; an objection reopens the example as a decision.

  THE TEXT UNDER TEST: "the fixture" as in task 00. "The batch paragraph" is the paragraph of the
  fixture's discovery passage that names the researched examples' batch; the "--autonomous" block
  is the fixture's too.

  Rule: R3 · What research settles comes back as one batch to skim

    Scenario: E8 · a story's researched examples are one question
      When the batch paragraph is read
      Then it says a story's researched examples are put to the operator as one question, never one question each
      And it says the question lists each example with its finding and that finding's source
      And it says the operator answers that they have no objection, or names what is wrong

    Scenario: E9 · an objection reopens the example as a decision
      When the batch paragraph is read
      Then it says an example the operator objects to goes back to "proposed"
      And it says its question is relabelled "policy" and asked by its own token
      And it says the other examples in the batch stand

    Scenario: E10 · a driven session asks the batch once per story, and waits
      When the batch paragraph is read
      Then it says that in a session whose environment carries "AOF_RUN_ID" the batch is one ask per story
      And it says it is asked after that story's "policy" questions
      And it says a batch left unanswered leaves the story at the Contract gate, with no "tasks/" written

    Scenario: the batch carries no map token
      When the batch paragraph is read
      Then it says the batch's question opens with the story ref and names itself the researched examples
      And it says it carries no "Q<n>" or "E<n>" token

    Scenario: the batch's specimen question anchors nothing
      Given the batch paragraph holds a specimen question in backticks
      When the specimen is read through the package's token reader "readMapToken"
      Then it answers no token

    Scenario Outline: the batch is pitched at the level
      When the batch paragraph is read
      Then it says that at level "<level>" each example comes <form>

      Examples:
        | level   | form                                    |
        | working | as one line with its source             |
        | new     | after a background line for its rule    |

    Scenario: a story with nothing researched has no batch
      When the batch paragraph is read
      Then it says a story whose map holds no researched example is asked no batch

    Scenario: the cascade asks the batch at its one stop
      When the "--autonomous" block is read
      Then it says each story's batch is asked at the single end review, with that story's other questions
      And it says the review surface lists what research settled, apart from the questions asked and the defaults taken

    Scenario: the doctor is still asked after the answers
      When the discovery passage is read
      Then it still says to run "aof work doctor <story> --json" once the questions are asked
      And it still says any error-severity "example-" finding stops the Contract stage before the first headline Scenario
