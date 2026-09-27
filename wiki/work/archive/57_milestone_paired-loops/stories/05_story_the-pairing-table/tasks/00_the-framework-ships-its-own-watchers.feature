@executable @cli @assets @distribution
Feature: The framework ships watchers for its own optimizing loops

  Eleven loop records ship with aof today and install themselves into every project that runs it.
  Three of the loops they describe optimise something, and none of them is watched. That gap is the
  framework declaring a rule it has not met.

  The fix is three more records installed by the same path as the eleven — no new mechanism, no
  sidecar, no config. They are framework-owned, they carry the generated marker so the next update
  does not mistake them for operator edits, and each one names a counter that resolves to a command
  this milestone ships.

  ADR-001, ADR-007. FF-5707, FF-5708.

  Scenario: three watcher records ship with the bundle
    Given the shipped bundle
    When its loop assets are listed
    Then a watcher record is present for each optimizing loop

  Scenario: the records install by the ordinary update path
    Given a project with an existing loop registry
    When the work assets are updated
    Then the watcher records are installed alongside the loop records

  Scenario: each watcher declares the loop it watches
    Given the installed registry
    When it is loaded
    Then each optimizing loop is the endpoint of a monitoring edge from a watcher

  Scenario: each watcher declares a counter that a machine produces
    Given the installed registry
    When it is loaded
    Then every watcher declares deterministic counting

  Scenario: each declared counter resolves to a command that exists
    Given the installed registry
    When each watcher's measurement pointer is resolved
    Then it names a registered command

  Scenario: the records carry the framework-owned marker
    Given the shipped watcher records
    When each is read
    Then it declares itself framework-owned and installed by the update path

  Scenario: an operator-edited watcher is not silently overwritten
    Given an installed watcher record whose ownership marker has been removed
    When the work assets are updated
    Then the record is left as the operator left it

  Scenario Outline: the day-one pairing table
    Given the installed registry
    When the loop <loop> is examined
    Then it is watched by a watcher counting <counter>

    Examples: three optimizing loops, three counters that pull the other way
      | loop                     | counter                                       |
      | build to green           | whether the acceptance criteria got smaller   |
      | review fix rereview      | findings raised after the item was accepted   |
      | autonomous cascade       | how often a run needed a retry or a hand      |
