@executable @cli @work @distribution
Feature: Each daemon counts its work by cause and writes a cost snapshot

  WHY. `mesh serve` held more than a core for 17 hours, and the only trace was a degrade line
  throttled to one every 5 s that did not name its workspace. Each daemon now counts what it does
  by cause, with the workspace on every count and every degrade line. Every 15 s it writes what it
  spent and on what, where a separate command can read it.

  Background:
    Given an isolated global home with this node "node-7297"
    And an injected clock and ticker

  Rule: R1 · Each daemon counts its work by cause, and names the workspace

    Scenario: E1 · disk reads are counted even when the degrade line is throttled
      Given the cache holds no rows for workspace "aof" of 1800 record docs
      When the board's list route is polled 40 times within one minute
      Then the "serve" counters hold 40 "full-disk-read" labelled with the workspace id of "aof"
      And the degrade log holds at most 12 "work-read-cache-unavailable" lines
      And the "degrade" counter for code "work-read-cache-unavailable" is 40

    Scenario: E2 · requests are counted by route and by client
      When the fleet polls "/api/mesh/status" 12 times with client header "fleet"
      And the board polls "/api/work/list" 12 times with client header "board"
      And "/api/mesh/status" is requested twice with no client header
      Then the "ui" counters hold 12 "request" for route "/api/mesh/status" and client "fleet"
      And 12 "request" for route "/api/work/list" and client "board"
      And 2 "request" for route "/api/mesh/status" and client "unknown"

    Scenario: E3 · a degrade raised while reading a workspace names it
      When a read of workspace "52294b307214c27d" raises "work-read-cache-unavailable"
      Then the degrade line carries workspaceId "52294b307214c27d"

    Scenario: a cause outside the closed set is refused
      When a site counts the cause "cpu-spike"
      Then the meter refuses it naming "cpu-spike" and the causes it accepts

    Scenario Outline: each daemon writes its snapshot every 15 seconds and at a clean stop
      Given the "<daemon>" daemon has been running for <elapsed>
      When <event>
      Then the "<daemon>" snapshot under the cost directory was written at <written>

      Examples:
        | daemon | elapsed    | event                         | written            |
        | serve  | 14 seconds | nothing else happens          | no time yet        |
        | serve  | 15 seconds | nothing else happens          | 15 seconds         |
        | ui     | 31 seconds | nothing else happens          | 30 seconds         |
        | ui     | 20 seconds | the daemon is stopped cleanly | 20 seconds         |

    Scenario: a snapshot carries what the readers need
      Given the "serve" daemon has run for 75 seconds and counted 40 "full-disk-read" for "aof"
      When its snapshot is written
      Then the snapshot holds its pid, the daemon "serve", the time, its CPU share over the last 60 seconds and since start, its event-loop utilisation, its state and its top causes with their labels
