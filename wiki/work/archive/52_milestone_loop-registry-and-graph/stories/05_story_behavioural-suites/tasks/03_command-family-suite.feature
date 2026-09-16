@executable @cli @work @validate @bug @finding-F-52-04-H
Feature: The command family suite — the three verbs driven as commands and as processes, each where its claim actually lives

  `test/work-loops-commands.test.mjs`, registered in `scripts/test.mjs`. It mechanises all four features
  of 52/02 — `00_loops-show` (23 scenarios), `01_loops-validate` (17), `02_loops-graph-mermaid` (23) and
  `03_registration-and-routing` (14) — 77 scenarios, of which roughly 38 are this suite's to decide.

  TWO SUBJECTS, DELIBERATELY, because the covered features make two different kinds of claim. A claim
  about the RESULT — the frozen `--json` key sets, the raw-absolute `source`, `resolved`'s three values,
  `summary.checks` — is decided by driving `command.run(input, {workspace: {workDir}})` in process, which
  is the seam milestone 53 composes through and therefore the seam worth pinning. A claim about the
  PROCESS — the exit code, exactly one JSON document on stdout, the face path relativised against the
  invocation cwd, byte identity across two separate processes — is decided by a real spawn through
  `test/support/cli-spawn.mjs`. Driving a process claim in process proves nothing, and driving a result
  claim through a process is a spawn spent on a value a function call already returns. Roughly 35 spawns
  is the budget; every scenario above that number must justify itself.

  THE CWD TRAP, measured at refine. All three verbs relativise their face output through
  `path.relative(process.cwd(), value)`. In process that resolves against the TEST RUNNER's cwd, not the
  fixture's — and `process.chdir` is unsafe here, because `scripts/test.mjs` runs every suite
  sequentially in one process. On Windows `path.relative` also returns an ABSOLUTE path when the fixture
  lands on a different drive from the cwd. Every relativisation case therefore asserts
  `path.resolve(cwd, printed) === source`, never a literal relative string.

  WHAT IS ALREADY DECIDED. FF-5207 owns the three route triples through `resolveRoute`, the null for the
  bare family word, and the absence of a `loops` branch in `cli.mjs`'s ladder. FF-5208 owns the Mermaid
  text literal, the three glyphs, total key mangling, the collision suffix, shuffle-invariance and
  `nodeCount` against the node-line count. FF-5209 owns the four-key envelope, the raw-absolute rule on
  the command result, `summary.checks` key ORDER, and the combined loader-then-checks finding order
  emitted by the real `work:loops-validate` — with both mutation non-vacuity legs, which is how
  F-52-04-E was closed. None of those is re-asserted here.

  ONE SCENARIO MIGRATES IN, and one gate leg migrates out. `05_frozen-finding-codes`' *"the three `ran`
  cases, pinned at the seam"* is a claim about `work:loops-validate`, not about a check, and is decided
  here. In the other direction, `acd-loop-command-route-only.test.mjs` lines 51-68 carry a self-declared
  note that their absent-registry leg is *"the one to retire"* once a behavioural suite covers it — this
  is that suite, so the leg is retired as part of this task and the gate keeps its first leg and its
  file name, leaving FF-5209's nine-file roster intact.

  ADR-008, ADR-009, ADR-011 §11, §12, ADR-012 §4, §5.

  Background:
    Given a fixture workspace holding a "loops/" registry and an ".aof/aof.config.json"

  Scenario: show returns the frozen result and the same data reaches stdout as one document
    Given a registry of two loop records and one actor record
    When "work:loops-show" is run in process and "aof work loops show --json" is spawned
    Then the result's key set is exactly source, present, nodes
    And three nodes are returned, each carrying id, kind, title, fields, edges and path
    And the spawn writes exactly one JSON document to stdout and exits 0
    And the key-set assertion is made in the same case as an assertion on the node values, so an empty node list cannot satisfy it

  Scenario: the result carries raw absolutes and the face carries paths relative to the invocation cwd
    Given the same registry, spawned from the workspace root and from a nested subdirectory with an explicit "--config"
    When the results and the printed output are compared
    Then the in-process source and node paths are OS-native raw absolutes
    And each printed path resolves against its own invocation cwd back to the same location on disk
    And no case asserts a literal relative string

  Scenario: a field's shape on the wire comes from its key, and the identity keys are not fields
    Given one record per row of the declared-value table
    When "work:loops-show" is run
    Then each field's list-ness follows its key and each entry's kind and payload match the row
    And id, kind and title appear in no field map

  Scenario: an endpoint's resolution reaches the wire as three distinct values
    Given a record declaring a data-feed to a declared loop and to an undeclared one, and a monitoring edge to a registered command
    When "work:loops-show" is run
    Then the three resolved values are true, false and null, asserted by identity
    And the process still exits 0 — an unresolved endpoint is a report, not a failure

  Scenario: the id filter narrows the node list and never changes the registry's own answer
    Given the three-record registry, filtered in turn by a declared loop id, a declared actor id, an undeclared id, and not at all
    When "work:loops-show" is run for each
    Then one, one, zero and three nodes are returned
    And present stays true in all four
    And the empty case prints no error envelope and exits 0

  Scenario: validate reports the loader lane and the five checks under one envelope
    Given a registry engineered to fire a code from each lane
    When "aof work loops validate --json" is spawned
    Then the document's key set is exactly source, present, findings, summary
    And every finding carries exactly the four envelope keys
    And the error and warn counts sum to the number of findings
    And the process exits 0 — validate reports, it does not enforce

  Scenario: each reported code is anchored at the record that caused it
    Given one record per row of the registry-state table
    When validate is run
    Then each row's code is reported, anchored at that row's own record
    And no other record in the fixture carries that code
    And the process exits 0 on every row

  # THE MIGRATED SCENARIO. The `ran` flag is the command's composition of the loader's `present` with
  # the five checks; no check can decide it.
  Scenario: the three ran cases are pinned at the seam
    Given a workspace with no "loops/" directory, one with an empty "loops/", and one with a populated registry
    When validate is run over each
    Then the first reports every check not run, with a zero count
    And the second reports every check run, with a zero count
    And the third reports every check run, with its own count
    And at least three checks carry DIFFERENT non-zero counts, so a counter that always returns the same number fails
    And no loader-lane finding is counted against any check

  Scenario: graph returns its six-key envelope and the text a reader sees
    Given a registry of two loop records and one actor joined by two edges
    When "aof work loops graph --json" is spawned and the bare command is spawned
    Then the document's key set is exactly source, present, format, text, nodeCount, edgeCount
    And format is mermaid, nodeCount is 3 and edgeCount is 2
    And the JSON text is byte-identical to the diagram the bare command prints
    And "--format mermaid" is byte-identical to the no-flag output

  Scenario: the counts describe the picture the reader is looking at
    Given a registry whose records declare a resolving edge, a dangling edge and an extra-registry edge
    When graph is run
    Then edgeCount counts every declared edge, resolving or not
    And nodeCount equals the number of nodes "work:loops-show" reports over the same registry
    And the two counts are asserted together, so a renderer that dropped an endpoint node is caught

  Scenario: an unsupported format is one coded envelope and a non-zero exit
    Given any registry
    When "aof work loops graph --format dot --json" is spawned
    Then exactly one JSON document is written, carrying ok false and a stable code
    And it carries no text key
    And the process exits non-zero

  Scenario: absence and emptiness are distinguishable on every verb
    Given a workspace with no "loops/" directory and one whose "loops/" holds no records
    When each of the three verbs is run over each
    Then every verb reports present false for the first and present true for the second
    And every verb exits 0 for both
    And graph's two texts are byte-identical valid empty diagrams
    And validate's five check entries appear in the same order in both, differing only in whether they ran

  Scenario: the three verbs answer on their route words and nothing else does
    Given each argv form of the routing table
    When each is spawned
    Then each route-word form resolves to its own command and exits 0
    And the hyphenated id spellings, the bare family word, the singular family word and an unknown verb each print no envelope and exit non-zero

  Scenario: an undeclared flag is refused before the command runs
    Given "aof work loops show --loop loop:alpha --json"
    When it is spawned
    Then exactly one error envelope is written, carrying an unknown-flag code
    And no node list is printed
    And the process exits non-zero

  Scenario: the family shadows no existing command and writes nothing
    Given a fixture work stream carrying items and no "loops/" directory
    And a recorded snapshot of the fixture's file list and every file's bytes
    When all three verbs are run and "aof work list --json" is spawned
    Then each verb prints exactly one parseable document reporting the registry absent and exits 0
    And "work list" prints its own envelope unchanged and exits 0
    And the fixture's file list and bytes are unchanged

  Scenario: the suite spends a process only where the claim is about the process
    Given every case in this suite
    When the suite runs
    Then every result-shape claim is decided by an in-process run or a direct render call
    And every exit-code, stdout-document, cwd-relativisation and cross-process byte-identity claim is decided by a real spawn
    And every spawn goes through the shared CLI spawn helper rather than a raw process call

  # THE ROUTING TABLE. Each row is one argv form and the answer it must produce at the process boundary.
  # FF-5207 decides the route RESOLUTION; this suite decides what the process does with it.
  Examples:
    | argv                                        | answer at the process boundary                          |
    | work loops show --json                      | the show envelope, exit 0                               |
    | work loops validate --json                  | the validate envelope, exit 0                           |
    | work loops graph --json                     | the graph envelope, exit 0                              |
    | work loops show                             | the human listing, exit 0                               |
    | work loops-show --json                      | no envelope, exit non-zero                              |
    | work loops-validate --json                  | no envelope, exit non-zero                              |
    | work loops-graph --json                     | no envelope, exit non-zero                              |
    | work loops                                  | no envelope, exit non-zero                              |
    | work loop show                              | no envelope, exit non-zero                              |
    | work loops frobnicate                       | no envelope, exit non-zero                              |
    | work loops show --loop loop:alpha --json    | one unknown-flag error envelope, exit non-zero          |
    | work loops graph --format dot --json        | one unsupported-format error envelope, no text, exit non-zero |

  # THE SUITE'S CASE TABLE. The "driven as" column is the design constraint: it is what keeps the spawn
  # budget honest and what stops a process claim being decided in process.
  Examples:
    | covered feature             | driven as              | fixture the case needs                                                     | deciding observation                                                                     |
    | 00_loops-show               | in process + one spawn | two loop records and one actor record                                       | key set exactly {source, present, nodes} asserted BESIDE the three nodes' own values      |
    | 00_loops-show               | spawn ×2               | the same registry, from the root and from a nested dir with --config        | printed paths resolve against their OWN cwd back to the same location; never a literal    |
    | 00_loops-show               | in process             | one record per row of the declared-value table                              | list-ness from the KEY; kind and payload per row; id/kind/title in no field map            |
    | 00_loops-show               | in process             | a declared, an undeclared and an extra-registry endpoint on one record      | true / false / null by IDENTITY; exit still 0                                             |
    | 00_loops-show               | in process             | the three-record registry filtered four ways                                | 1 / 1 / 0 / 3 nodes; present true throughout; the empty case is not an error              |
    | 01_loops-validate           | spawn                  | a registry firing a code from each lane                                     | key set exactly the four; four-key findings; error+warn === findings.length; exit 0       |
    | 01_loops-validate           | in process             | one record per row of the registry-state table                              | the row's code fires, anchored at ITS record, and no other fixture record carries it       |
    | 01_loops-validate           | in process ×3          | no "loops/" · empty "loops/" · a populated registry                          | ran false/true/true with counts 0/0/own; ≥3 checks carry DIFFERENT non-zero counts         |
    | 02_loops-graph-mermaid      | spawn ×2               | two loops and an actor joined by two edges                                   | six-key envelope; format mermaid; JSON text byte-identical to the printed diagram          |
    | 02_loops-graph-mermaid      | in process             | a resolving, a dangling and an extra-registry edge                           | edgeCount counts all declared edges; nodeCount equals show's node count over the same registry |
    | 02_loops-graph-mermaid      | spawn                  | any registry, with "--format dot"                                            | one error envelope, ok false, a stable code, NO text key, exit non-zero                    |
    | 02_loops-graph-mermaid      | spawn ×2               | no "loops/" and an empty "loops/"                                            | present false vs true; both texts byte-identical valid empty diagrams; both exit 0          |
    | 03_registration-and-routing | spawn ×12              | any registry, over the routing table above                                   | each row's exit code and envelope presence exactly as tabled                               |
    | 03_registration-and-routing | in process             | a well-formed registry                                                       | the three ids return their contract results with no process spawned                        |
    | 03_registration-and-routing | spawn ×4               | a work stream carrying items and no "loops/" directory, with a byte snapshot  | one parseable absent-registry document per verb, exit 0, "work list" unchanged, fixture bytes unchanged |
