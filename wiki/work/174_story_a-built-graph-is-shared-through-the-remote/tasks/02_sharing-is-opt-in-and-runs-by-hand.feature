@cli @work @distribution
Feature: sharing is opt-in per project, and its fetch and publish halves run by hand

  WHY. Publishing puts a derived description of the code on the project's remote for good, so a
  project turns it on itself (174 Q4). Until it does, a build behaves exactly as it does today. The
  build's automatic fetch and publish are also available as verbs, so an operator can move a graph
  without running a build, and see why a publish did not happen (ADR-001).

  THE FIXTURE BELOW: as in task 00 — a bare "origin.git" and a clone of it at "a816d6d…" on
  "main" — with the clone's config varied per scenario.

  Rule: R4 · Sharing is opt-in, and each half can be run by hand

    @executable
    Scenario Outline: E12 · a project that has not turned sharing on never contacts the remote
      Given the clone's ".aof/aof.config.json" <setting>
      And "origin.git" holds a published graph for "a816d6d"
      And the clone has no "graphify-out/"
      When "aof graph build . --json" runs in the clone
      Then graphify has run 1 time
      And "origin.git" receives no fetch and no push for that build
      And the JSON result carries no sharing section

      Examples:
        | example | setting                           |
        | E12     | has no "graph" key                |
        |         | sets "graph.share" to "off"       |

    @executable
    Scenario: E13 · initialising a new project writes no sharing setting
      When "aof work init" runs in an empty temp git repo
      Then ".aof/aof.config.json" has no "graph" key

    @executable
    Scenario: a sharing setting aof does not know is refused before anything runs
      Given the clone's ".aof/aof.config.json" sets "graph.share" to "rsync"
      When "aof graph build . --json" runs in the clone
      Then it exits non-zero with code "graph-share-unknown", naming "graph.share" and the accepted values "git-refs" and "off"
      And graphify has run 0 times

    @executable
    Scenario Outline: E14 · aof graph fetch lays out the graph published for HEAD, with import's refusals
      Given "origin.git" holds a published graph for "a816d6d"
      And the clone <local graph>
      When "aof graph fetch <flag> --json" runs in the clone
      Then <outcome>

      Examples:
        | example | local graph            | flag    | outcome                                                                        |
        | E14     | has no "graphify-out/" |         | "graphify-out/graph.json" is the published graph's, and graphify has run 0 times |
        |         | already has a graph    |         | it exits non-zero with code "graph-import-graph-exists", and the old graph is byte-identical |
        |         | already has a graph    | --force | the old graph is replaced whole by the published one                            |

    @executable
    Scenario: aof graph fetch with nothing published says so and changes nothing
      Given "origin.git" holds no ref under "refs/aof/graph/"
      When "aof graph fetch --json" runs in the clone
      Then it exits non-zero with code "graph-fetch-none-published", naming "a816d6d"
      And the clone's "graphify-out/" is unchanged

    @executable
    Scenario: E15 · aof graph publish applies the build's rules and says why it published nothing
      Given the clone has an untracked, non-ignored file "scratch.mjs"
      When "aof graph publish --json" runs in the clone
      Then it exits 0
      And "origin.git" holds no ref under "refs/aof/graph/"
      And the JSON result reports nothing published, with a reason that names "scratch.mjs"

    @executable
    Scenario: the explicit verbs work while sharing is off
      Given the clone's ".aof/aof.config.json" has no "graph" key
      When "aof graph publish --json" runs in the clone
      Then "origin.git" holds "refs/aof/graph/v1/<full sha of a816d6d>"
