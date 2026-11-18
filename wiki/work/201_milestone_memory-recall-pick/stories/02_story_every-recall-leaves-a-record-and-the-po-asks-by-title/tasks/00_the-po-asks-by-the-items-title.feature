@executable @docs @assets @memory
Feature: The PO asks by the item's title

  WHY. Refine's PO recall is scoped to the item being refined, and an item that has just entered
  the stream has no records. 177 measured it empty on 12 of 14 recalls. A text recall on the
  item's title has something to find (SPEC Scope, fourth bullet; ADR-006 §2).

  Background:
    Given the bundle's refine command, read as an agent is handed it

  Rule: R1 · The PO's refine recall asks by the item's title, with no item filter

    Scenario: E1 · the PO is told to recall by the item's title
      Then the PO's recall is "aof memory recall" with the item's title, verbatim, as its query and "--block"
      And that invocation carries no "--item" and no "--area"

    Scenario: E2 · the PO's observation records what was asked
      Then the PO's capture names the edge "refine-po" and the actor "product-owner"
      And it names the title as the query and "{}" as the scope
      And it is submitted once, on the item being refined

    Scenario: E3 · the architect's recall is as it was
      Then the architect's recall still carries "--area architecture --block"
      And the architect's capture still names the scope '{"area":"architecture"}'

    Scenario: an observation written the way the command says is accepted
      Given an observation with edge "refine-po", actor "product-owner", the query "Recall hands an agent what applies" and scope "{}"
      And it holds one record with the verdict "honoured"
      When "aof memory record-recall 201 --input <the observation>" runs
      Then one row of kind "recall" is appended to item 201's ledger, with scope "{}"

    Scenario: a title recall finds records for an item that has none of its own
      Given a memory index with no record for item "201" and three records whose text shares words with its title
      When "aof memory recall '<the title>' --item 201 --json" runs
      And "aof memory recall '<the title>' --json" runs
      Then the first prints an empty array
      And the second prints those three records

    Scenario Outline: every invocation the refine command spells is one the CLI parses
      Then the refine command's "<role>" recall uses only flags the memory seam reads

      Examples:
        | role      |
        | architect |
        | PO        |
