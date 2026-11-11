@executable @cli @work @work-stream
Feature: A prototype folder resolves like any work item and moves through its own four statuses

  WHY. A prototype has to sit in the work tree next to the governed work, found by the same
  refs, without borrowing the five words the governed lifecycle uses. `paused` is not `blocked`,
  `abandoned` has no word in the five, and a prototype's `done` can be reopened.

  Background:
    Given an isolated work tree whose stream ends at item 168

  Rule: R1 · A `NN_prototype_<slug>` folder at the root is a work item that every ref reader resolves

    Scenario: E1 · a numbered prototype folder is found by its number
      Given a folder "169_prototype_csv-importer" holding a well-formed "PROTOTYPE.md" at status "active"
      When "aof work find 169 --json" runs
      Then it answers one row with type "prototype", slug "csv-importer" and status "active"

    Scenario: E2 · a backlog prototype is found by its slug with no number
      Given a backlog folder "prototype_csv-importer" holding a "PROTOTYPE.md" with no number
      When "aof work find csv-importer --json" runs
      Then it answers one row with type "prototype" and number null

    Scenario Outline: only the exact type word makes a folder an item
      Given a folder "<folder>" at the root of the work tree
      When "aof work find 169 --json" runs
      Then it answers <rows> row(s)

      Examples:
        | example | folder                          | rows |
        | E3      | 169_prototypes_csv-importer     | 0    |
        |         | 169_Prototype_csv-importer      | 0    |
        |         | 169_prototype_csv-importer      | 1    |

    Scenario: the record doc of a prototype is PROTOTYPE.md
      When the record doc of an item of type "prototype" is asked for
      Then the answer is "PROTOTYPE.md"
      And a milestone folder holding "AOF.md" still answers "AOF.md"

  Rule: R2 · A prototype has its own four status words and only their moves

    Scenario: E4 · the status verb lists a prototype's legal moves
      Given prototype 169 at status "active"
      When "aof work status 169" runs with no target
      Then it lists the legal moves "paused", "done" and "abandoned"

    Scenario: E5 · a done prototype reopens
      Given prototype 169 at status "done" with updated "2026-10-22"
      When "aof work status 169 active" runs on "2026-10-23"
      Then the status of 169 is "active"
      And its updated date is "2026-10-23"

    Scenario Outline: a prototype's moves are its own four-word table
      Given prototype 169 at status "<from>"
      When "aof work status 169 <to>" runs
      Then the move is <outcome>

      Examples:
        | example | from      | to          | outcome                                                       |
        |         | active    | paused      | made                                                          |
        |         | paused    | active      | made                                                          |
        |         | paused    | abandoned   | made                                                          |
        |         | abandoned | active      | made                                                          |
        | E6      | active    | in-review   | refused as "status-edge-not-applicable" naming paused, done and abandoned |
        |         | done      | paused      | refused as "status-edge-not-applicable" naming active |
        |         | active    | active      | refused as "status-edge-not-applicable" naming paused, done and abandoned |

    Scenario: E7 · the governed five never gain a prototype word
      Given milestone 168 at status "in-progress"
      When "aof work status 168 paused" runs
      Then the move is refused and the status of 168 is still "in-progress"
