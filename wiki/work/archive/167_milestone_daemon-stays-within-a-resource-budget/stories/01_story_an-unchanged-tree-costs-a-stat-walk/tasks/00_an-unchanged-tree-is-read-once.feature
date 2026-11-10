@executable @cli @work @work-stream
Feature: An unchanged tree is read once, and concurrent reads share it

  WHY. Every daemon tick and every viewer poll re-parsed every record doc, even when nobody had
  touched the tree. With the cache empty, that was a full parse of aof's 1,800 docs every few
  seconds. A read now costs one stat walk while the tree is unchanged, and callers that ask at the
  same moment share one walk.

  Background:
    Given a generated work tree "aof" of 1800 record docs
    And an isolated cost meter

  Rule: R1 · A read of a tree nobody edited parses no record doc

    Scenario: E1 · a second read of an unchanged tree opens no record doc
      Given the stream of "aof" has been read once
      When the stream of "aof" is read again with no edit in between
      Then no record doc is opened by the second read
      And the meter counts 1 "full-disk-read" and 1 "cache-hit" labelled "memo" for "aof"

    Scenario: E2 · an edited status is answered on the next read
      Given the stream of "aof" has been read once
      And story "12/03" is edited from "in-progress" to "done"
      When the stream of "aof" is read again
      Then story "12/03" reads "done"

    Scenario: E3 · a newly scaffolded item is answered on the next read
      Given the stream of "aof" has been read once
      And a story folder "12/04" is scaffolded
      When the stream of "aof" is read again
      Then the items include "12/04"

    Scenario Outline: the memo is bypassed when the tree cannot be fingerprinted
      Given the work dir of "aof" <condition>
      When the stream of "aof" is read twice
      Then each read <outcome>

      Examples:
        | condition                          | outcome                                    |
        | cannot be listed                   | fails, and the second read walks again     |
        | holds a doc that vanishes mid-walk | is answered from disk without remembering  |

  Rule: R2 · Concurrent reads of one tree share one walk

    Scenario: E4 · two callers at the same moment get one parse
      When the presence tick and a board poll read the stream of "aof" at the same moment
      Then the meter counts 1 "full-disk-read" for "aof"
      And both callers receive the same items

    Scenario: E5 · a shared read that fails is never remembered
      Given the work dir of "aof" cannot be listed
      When two callers read the stream of "aof" at the same moment
      Then both callers receive the failure
      And the next read of "aof" walks the tree again

    Scenario: reads of two different trees do not wait on each other
      Given a second generated work tree "aof-test-repo" of 40 record docs
      When "aof" and "aof-test-repo" are read at the same moment
      Then the meter counts 1 "full-disk-read" for each of them
