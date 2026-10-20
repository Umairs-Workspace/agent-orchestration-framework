@executable @cli @work @work-stream
Feature: My own records answer from my files

  WHY. Every read laid the cached status over the local frontmatter, whoever reported it, so a
  stale copy of this node's own item hid the edit just made. A cached row now stands in for a local
  record only when another node reported it and the local record has not changed since this node
  last observed it, decided by one predicate the stream readers and doctor share.

  Background:
    Given an isolated global store, with this node "node-7297"
    And a mesh-propagating workspace with the items "164/00", "05/01" and the milestone "07"

  Rule: R1 · A record this node authored answers from its file

    Scenario Outline: E1 · a record this node reported answers from its file
      Given the store's row for "164/00" is reported by "node-7297" with status "<row>"
      And the STORY.md of "164/00" says "<file>"
      When "aof work find 164/00 --json" is run
      Then the row's status is "<file>"
      And the row is answered from "disk"

      Examples:
        | example | row         | file        |
        | E1      | not-started | in-progress |
        | E2      | in-progress | in-progress |

  Rule: R2 · Another machine's report stands in for my untouched scaffold

    Scenario: E3 · a worker's report answers for a scaffold this node has not touched
      Given the store's row for "05/01" is reported by "node-9549" with status "in-review"
      And the STORY.md of "05/01" says "not-started", unchanged since this node last observed it
      When "aof work find 05/01 --json" is run
      Then the row's status is "in-review"
      And the row is answered from "cache", reported by "node-9549"

    Scenario: E4 · a local edit outranks a worker's report
      Given the store's row for "05/01" is reported by "node-9549" with status "in-review"
      And this node last observed "05/01" as "not-started"
      And the STORY.md of "05/01" is hand-edited to "done"
      When "aof work find 05/01 --json" is run
      Then the row's status is "done"
      And the row is answered from "disk"

    Scenario: E5 · with no baseline, a worker's report still answers
      Given the store's row for "05/01" is reported by "node-9549" with status "in-review"
      And this node has no observation of "05/01"
      When "aof work find 05/01 --json" is run
      Then the row's status is "in-review"
      And the row is answered from "cache"

    Scenario: list and next read by the same rule
      Given the store's row for "164/00" is reported by "node-7297" with status "not-started"
      And the STORY.md of "164/00" says "in-progress"
      When "aof work list --json" and "aof work next 164 --json" are run
      Then both read "164/00" as "in-progress"

  Rule: R3 · Doctor reads the same way the stream does

    Scenario: E6 · doctor reads this node's own record from its file and raises no divergence
      Given the store's row for "164/00" is reported by "node-7297" with status "not-started"
      And the STORY.md of "164/00" says "in-progress"
      When "aof work doctor 164 --json" is run
      Then doctor reads "164/00" as "in-progress", from "disk"
      And no "cache-status-divergence" finding names "164/00"

    Scenario: E7 · doctor reads a worker's report exactly as find does
      Given the store's row for "05/01" is reported by "node-9549" with status "in-review"
      And the STORY.md of "05/01" says "not-started", unchanged since this node last observed it
      When "aof work doctor 05 --json" is run
      Then doctor reads "05/01" as "in-review", from "cache"

  Rule: R4 · What the store alone knows is still shown

    Scenario: E8 · an item with no local folder is listed from the store
      Given the store holds a row for "07/02" reported by "node-9549" with status "in-progress"
      And this checkout has no folder for "07/02"
      When "aof work list --json" is run
      Then "07/02" is listed with status "in-progress"
