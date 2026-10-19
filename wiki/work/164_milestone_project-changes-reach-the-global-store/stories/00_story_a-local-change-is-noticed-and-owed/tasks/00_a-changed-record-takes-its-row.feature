@executable @cli @work @distribution
Feature: A changed record takes its row; an unchanged one never steals another node's

  WHY. A publish re-reads a node's own disk but may only refresh rows that node authored, so a
  hand edit or a pull of a ref another machine once reported never reaches the store. A record
  that has changed since this node last observed it now takes its row, exactly as an operator
  verb does. One that has not changed still steps over another node's row. Only a successful
  write advances what this node last observed, so a change is never lost, and a ref another
  machine is working on waits for that machine's lock.

  Background:
    Given an isolated global store, with this node "node-7297"
    And a mesh-propagating workspace "aof" holding the stories "164/00" and "05/01"
    And every record has been published and observed once

  Rule: R1 · A change to my own record file takes its row in the store, and is never lost before it does

    Scenario: E1 · a hand edit of a record this node reported lands
      Given the store's row for "164/00" is reported by "node-7297" with status "not-started"
      And the STORY.md of "164/00" is hand-edited to "in-progress"
      When the sync pass runs for "aof"
      Then the store's row for "164/00" says "in-progress", reported by "node-7297"

    Scenario: E2 · a pulled change takes back a row another node reported
      Given the store's row for "05/01" is reported by "node-9549" with status "in-review"
      And no assignment holds "05/01"
      And a pulled commit changes the STORY.md of "05/01" to "done"
      When the sync pass runs for "aof"
      Then the store's row for "05/01" says "done", reported by "node-7297"

    Scenario: E3 · an untouched scaffold never overwrites another node's report
      Given the store's row for "05/01" is reported by "node-9549" with status "in-review"
      And the STORY.md of "05/01" says "not-started", unchanged since this node last observed it
      When the sync pass runs for "aof"
      Then the store's row for "05/01" says "in-review", reported by "node-9549"

    Scenario: E4 · a prose-only edit claims nothing
      Given the store's row for "05/01" is reported by "node-9549" with status "in-review"
      And the user story text of "05/01" is reworded with no frontmatter change
      When the sync pass runs for "aof"
      Then the store's row for "05/01" is unchanged, reported by "node-9549"

    Scenario: E5 · a write that fails leaves the change owed, and the next pass lands it
      Given the STORY.md of "164/00" is hand-edited to "in-progress"
      And the global store refuses writes
      When the sync pass runs for "aof"
      Then this node's observation of "164/00" is unchanged
      And when the store accepts writes again and the sync pass runs, the row for "164/00" says "in-progress"

    Scenario: E6 · with no observations, the first pass records what it sees and takes nothing
      Given this node's observations are empty
      And the store's row for "05/01" is reported by "node-9549" with status "in-review"
      And the STORY.md of "05/01" says "not-started"
      When the sync pass runs for "aof"
      Then the store's row for "05/01" says "in-review", reported by "node-9549"
      And this node has observed "05/01"

  Rule: R2 · A change on an item another machine is working on waits for that machine

    Scenario: E7 · an edit to a held item is not written, and stays owed
      Given "node-9549" holds an active assignment on "05/01"
      And the STORY.md of "05/01" is hand-edited to "blocked"
      When the sync pass runs for "aof"
      Then the store's row for "05/01" is not written by "node-7297"
      And the pass reports "05/01" skipped as "held-by-assignment"
      And this node's observation of "05/01" is unchanged

    Scenario: E8 · once the lane settles, the held edit lands over the lane's report
      Given "node-9549" holds an active assignment on "05/01"
      And the STORY.md of "05/01" is hand-edited to "blocked"
      And the sync pass has run while the assignment was held
      When the assignment settles and "node-9549" reports "05/01" as "in-review"
      And the sync pass runs for "aof"
      Then the store's row for "05/01" says "blocked", reported by "node-7297"
