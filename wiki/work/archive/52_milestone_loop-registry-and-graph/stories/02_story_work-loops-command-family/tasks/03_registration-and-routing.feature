@executable @cli @work @work-stream
Feature: The work:loops surface — three verbs on the derived route table, and the empty repo

  All three verbs are reachable as `aof work loops show|graph|validate` through the
  registry-derived route table's longest-prefix matching (52/ADR-008), each carrying the
  id `work:loops-<verb>` so milestone 53's Loop-Ready score can compose them in-process
  through `invoke()` rather than parsing a render. And the case a fresh repo hits first: a
  workspace with no `loops/` directory is not an error on any of the three — a repo with
  no registry is a valid repo.

  Registering the three ids also extends the CLI↔command bijection gate, and that extension
  is TWO changes, not one (52/ADR-012 §1 / A1-bis — ADR-011's "two legs free" was itself
  half-measured; only the adapter leg is free). The gate must (i) answer the probe argv
  `aof work loops <verb> --json` cleanly against its fixture, a work stream carrying items and
  NO `loops/` directory, and (ii) derive its route-reachability probe from each command's
  `cli.route` WORDS rather than from its id-suffix — `work:loops-*` is the first
  `work:`-namespaced command whose id-suffix (`loops-show`) is not its route words
  (`work loops show`), so a probe built from the id looks up a key the route table does not
  hold. Fix (ii) is GENERAL, not a special case for this family: it covers every multi-word
  route from now on. What an operator can OBSERVE of both is asserted below; wiring either
  fix into the gate is the build's business, not this contract's.

  Scenario: each verb resolves and emits exactly one parseable JSON envelope
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I run `aof work loops show --json`
    Then exactly one JSON document is printed on stdout and it parses
    When I run `aof work loops graph --json`
    Then exactly one JSON document is printed on stdout and it parses
    When I run `aof work loops validate --json`
    Then exactly one JSON document is printed on stdout and it parses
    And all three runs exit 0

  Scenario: each verb is invocable in-process by its command id — the seam 53 composes through
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I invoke the command ids "work:loops-show", "work:loops-graph" and "work:loops-validate" in-process
    Then each returns its contract result without a CLI process being spawned
    And "work:loops-validate" returns a summary a caller can read without parsing any rendered text
    And invoking an id of "work:loops" or "work:loops-frobnicate" is rejected as an unknown command id

  Scenario: the in-process result and the CLI --json projection differ only in path basis
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I invoke "work:loops-show" in-process and run `aof work loops show --json` from the workspace root
    Then the two results carry the same nodes, in the same order
    And the in-process source is an absolute path while the printed source is relative to the invocation cwd

  Scenario: the bijection probe argv answers clean on a work stream with no registry
    Given the CLI-bijection fixture workspace — a work stream carrying items and no <work.dir>/loops/ directory
    When I run `aof work loops show --json` in it
    Then exactly one JSON document is printed on stdout and it parses
    And present is false and nodes is empty
    And the process exits 0
    When I run `aof work loops graph --json` in it
    Then exactly one JSON document is printed on stdout and it parses
    And present is false and nodeCount is 0 and edgeCount is 0
    And the process exits 0
    When I run `aof work loops validate --json` in it
    Then exactly one JSON document is printed on stdout and it parses
    And present is false and findings is empty
    And the process exits 0
    And no probe writes to the fixture, and none exits non-zero — a registry-less repo is a clean run, not a refusal

  Scenario: the hyphenated command id is not an argv form — the route words are
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I run `aof work loops-show --json`
    Then no envelope from any of the three verbs is printed
    And the process exits non-zero
    When I run `aof work loops show --json`
    Then the show envelope is printed and the process exits 0

  Scenario: EVERY verb answers on its route WORDS and NONE answers on its id-suffix
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I run `aof work loops graph --json` and `aof work loops validate --json`
    Then each prints its own envelope and exits 0
    When I run `aof work loops-graph --json` and `aof work loops-validate --json`
    Then neither prints any envelope, and each exits non-zero
    And the id-suffix spelling is a second way in for none of the three verbs — the route words are the only argv form
    And this holds for the whole family, not for `show` alone, because the route words are what the route table is keyed by

  Scenario: an unknown fourth verb resolves to none of the three
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I run `aof work loops frobnicate`
    Then no loop registry is read and no envelope from any of the three verbs is printed
    And the CLI refuses with an unknown-command message
    And the process exits non-zero

  Scenario: the bare family word resolves to nothing
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I run `aof work loops`
    Then no envelope from any of the three verbs is printed
    And the process exits non-zero

  Scenario: a mis-spelled family word resolves to nothing
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I run `aof work loop show`
    Then no envelope from any of the three verbs is printed
    And the process exits non-zero

  Scenario: adding the family shadows no existing work route
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I run `aof work list --json`
    Then the work:list envelope is printed unchanged
    And the process exits 0

  Scenario: an undeclared flag is refused inside the one JSON envelope
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I run `aof work loops show --loop loop:alpha --json`
    Then exactly one JSON document is printed on stdout
    And it is an error envelope carrying ok false and the code "unknown-flag"
    And no node list is printed
    And the process exits non-zero

  Scenario: a workspace with no loops directory is valid on all three verbs
    Given a workspace with no <work.dir>/loops/ directory
    When I run `aof work loops show --json`
    Then present is false and nodes is empty
    When I run `aof work loops graph --json`
    Then present is false and nodeCount is 0 and edgeCount is 0
    When I run `aof work loops validate --json`
    Then present is false and findings is empty
    And all three runs exit 0

  Scenario: every verb still resolves from a nested subdirectory of the workspace
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I run each of the three verbs with `--config <workspace>/.aof/aof.config.json --json` from a nested subdirectory
    Then each resolves to the same command and reports the same registry directory
    And each printed source is relative to that subdirectory
    And all three runs exit 0

  Scenario: the three verbs are usable without --json and print something legible
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I run `aof work loops show`, `aof work loops graph` and `aof work loops validate`
    Then each prints non-empty human output
    And no run prints a raw JSON document
    And all three runs exit 0

  Examples:
    | argv after `aof`                        | resolved command id  | exit     |
    | work loops show                         | work:loops-show      | 0        |
    | work loops show --json                  | work:loops-show      | 0        |
    | work loops show --id loop:alpha --json  | work:loops-show      | 0        |
    | work loops graph                        | work:loops-graph     | 0        |
    | work loops graph --json                 | work:loops-graph     | 0        |
    | work loops graph --format mermaid --json| work:loops-graph     | 0        |
    | work loops graph --format dot --json    | work:loops-graph     | non-zero |
    | work loops validate                     | work:loops-validate  | 0        |
    | work loops validate --json              | work:loops-validate  | 0        |
    | work loops show --loop loop:alpha       | work:loops-show      | non-zero |
    | work loops frobnicate                   | (none)               | non-zero |
    | work loops                              | (none)               | non-zero |
    | work loop show                          | (none)               | non-zero |
    | work loops-show --json                  | (none)               | non-zero |
    | work loops-graph --json                 | (none)               | non-zero |
    | work loops-validate --json              | (none)               | non-zero |
    | work list --json                        | work:list            | 0        |

  Examples: the bijection probe argv, on a fixture with no loops/ directory
    | argv after `aof`             | probes command id    | present | exit |
    | work loops show --json       | work:loops-show      | false   | 0    |
    | work loops graph --json      | work:loops-graph     | false   | 0    |
    | work loops validate --json   | work:loops-validate  | false   | 0    |

  Examples: the id-suffix is NOT the route — the case that falsified the gate's old assumption
    | command id          | id-suffix as argv words | route words         | resolves on the route words | resolves on the id-suffix |
    | work:loops-show     | work loops-show         | work loops show     | yes                         | no                        |
    | work:loops-graph    | work loops-graph        | work loops graph    | yes                         | no                        |
    | work:loops-validate | work loops-validate     | work loops validate | yes                         | no                        |
