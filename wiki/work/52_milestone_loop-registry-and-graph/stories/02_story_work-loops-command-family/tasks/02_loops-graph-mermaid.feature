@executable @cli @work @work-stream
Feature: work:loops graph — the one readable picture, byte-for-byte

  `aof work loops graph [--format mermaid] [--json]` emits a deterministic Mermaid
  `flowchart` an operator can commit, diff and read in a PR with no tool installed
  (52/ADR-009). Determinism is the CONTRACT, not an implementation detail: nodes in
  lexicographic `id` order, edges sorted by (source, edge-type, target), the edge type as
  the link label, node shape by `kind`. The `--json` form carries the same text for any
  consumer that wants to render differently (52/ADR-008).

  "fingerprint" below means a hash of the emitted `text`: rows sharing a fingerprint label
  MUST be byte-identical, rows with different labels MUST differ. No literal digest is
  pinned — what those rows assert is the equality relation, not a digest. The GLYPHS, by
  contrast, ARE frozen literals (52/ADR-011 §11/D6) and are asserted verbatim below:
  rectangle for `kind: loop`, stadium for `kind: actor`, parallelogram for an
  extra-registry or dangling endpoint, `A -->|<edge-type>| B` for an edge.

  The node key is the id TOTALLY mangled (52/ADR-012 §5/E1, superseding ADR-011's ":"→"__"
  rule): every character outside `[A-Za-z0-9_]` becomes "_", and two ids colliding on one key
  are suffixed "_2", "_3" … in `id`-sort order. Totality is the point — under the partial rule
  a `module:src/run-store.mjs#isStale` endpoint kept its "/", "." and "#" and could make the
  whole picture unrenderable; and dropping such endpoints instead was REJECTED, because a
  diagram that silently omits declared edges LIES about the graph, where an ugly key merely
  reads badly. The visible label always carries the real id — or, for an endpoint, its raw
  text — verbatim.

  The two counts are registry facts, not picture facts (52/ADR-012 §5/E2): `nodeCount` counts
  DECLARED RECORDS only, so it agrees with `show`; `edgeCount` counts EVERY declared edge,
  including edges to extra-registry and dangling endpoints. A diagram may therefore carry more
  visual node lines than `nodeCount` — that is the contract, never a defect.

  Scenario: the human output is Mermaid flowchart text
    Given a workspace whose <work.dir>/loops/ holds 2 loop records and 1 actor record
    When I run `aof work loops graph`
    Then the diagram's first line begins with "flowchart"
    And the diagram names each of the 3 nodes
    And the process exits 0

  Scenario: byte-identical output across repeated calls in one process
    Given a workspace whose <work.dir>/loops/ holds 2 loop records and 1 actor record
    When I render the graph twice in the same process
    Then the two texts are byte-identical

  Scenario: byte-identical output across separate processes
    Given a workspace whose <work.dir>/loops/ holds 2 loop records and 1 actor record
    When I run `aof work loops graph` in two separate processes
    Then the two stdout captures are byte-identical

  Scenario: output does not depend on the order the records were authored
    Given workspace A whose loops/ records were created in the order alpha, beta, root
    And workspace B holding the same three records created in the order root, beta, alpha
    When I run `aof work loops graph` in each workspace
    Then the two texts are byte-identical

  Scenario: nodes are emitted in lexicographic id order
    Given records declaring the ids loop:zulu, actor:root and loop:alpha
    When I run `aof work loops graph --json`
    Then the node lines appear in the order actor:root, then loop:alpha, then loop:zulu
    And that order is unchanged when the record files are renamed to change directory read order

  Scenario: edges are sorted by source, then edge type, then target
    Given loop:alpha declares `monitoring: [loop:zulu]` and `data-feed: [loop:zulu, loop:beta]`
    And loop:beta declares `data-feed: [loop:zulu]`
    When I run `aof work loops graph --json`
    Then the 4 edge lines appear in this exact order: alpha→beta (data-feed), alpha→zulu (data-feed), alpha→zulu (monitoring), beta→zulu (data-feed)
    And the order is unchanged when the same edges are declared in a different order inside each record

  Scenario: the edge type is the link label
    Given loop:alpha declares `target-setting: [loop:beta]`
    When I run `aof work loops graph --json`
    Then the edge line from loop:alpha to loop:beta carries the label text "target-setting"
    And every edge line in the diagram carries its own edge type as its label

  Scenario: node shape differs by kind, so a loop and an actor are visually distinct
    Given records declaring loop:alpha (kind loop) and actor:root (kind actor)
    When I run `aof work loops graph --json`
    Then the two node lines use different shape delimiters
    And every kind loop node uses the same shape as every other kind loop node
    And every kind actor node uses the same shape as every other kind actor node

  Scenario: the three node glyphs are the frozen literals of the contract
    Given `loops/alpha.md` declares `id: loop:alpha` and `title: Alpha`
    And `loops/root.md` declares `id: actor:root`, `kind: actor` and `title: Root`
    And loop:alpha declares `data-feed: [loop:nowhere]` and no `loops/nowhere.md` exists
    When I run `aof work loops graph --json`
    Then the loop:alpha line is exactly `loop_alpha["loop:alpha · Alpha"]` — the rectangle
    And the actor:root line is exactly `actor_root(["actor:root · Root"])` — the stadium
    And the loop:nowhere line is exactly `loop_nowhere[/"loop:nowhere"/]` — the parallelogram, carrying the RAW endpoint text and no title
    And no `kind: loop` node is emitted with the stadium or parallelogram delimiters
    And the process exits 0

  Scenario: a node key is the id with EVERY character outside [A-Za-z0-9_] replaced by "_"
    Given records declaring loop:alpha and actor:root
    And loop:alpha declares `monitoring: [command:work:next]`
    When I run `aof work loops graph --json`
    Then loop:alpha's node key is `loop_alpha` and actor:root's is `actor_root`
    And the command:work:next endpoint's node key is `command_work_next` — every colon replaced, not only the first
    And no node key anywhere in the diagram contains a ":"
    And each quoted label still carries the id verbatim, colons intact

  Scenario: a `module:` endpoint renders — its "/", "." and "#" are mangled too, and it is NOT dropped
    Given loop:alpha declares `monitoring: [module:src/run-store.mjs#isStale]`
    When I run `aof work loops graph --json`
    Then the diagram carries a node line for that endpoint
    And its node key is `module_src_run_store_mjs_isStale` — the colon, the slash, the dot and the "#" each replaced by one "_"
    And its line is exactly `module_src_run_store_mjs_isStale[/"module:src/run-store.mjs#isStale"/]` — the parallelogram, label raw and verbatim
    And the edge line out of loop:alpha names that same key
    And no declared endpoint is dropped from the picture in exchange for a cleaner key

  Scenario: a `config:` endpoint renders on the same total rule
    Given loop:alpha declares `parameter-tuning: [config:work.autonomous.maxAttempts]`
    When I run `aof work loops graph --json`
    Then that endpoint's node key is `config_work_autonomous_maxAttempts` — both dots replaced too
    And its line is exactly `config_work_autonomous_maxAttempts[/"config:work.autonomous.maxAttempts"/]`
    And the edge line is exactly `loop_alpha -->|parameter-tuning| config_work_autonomous_maxAttempts`
    And edgeCount counts that edge like any other

  Scenario: two endpoints that mangle to the same key are suffixed in id-sort order, never merged
    Given loop:alpha declares `monitoring: [module:src/a.b.mjs#run, module:src/a-b.mjs#run]`
    When I run `aof work loops graph --json`
    Then two distinct node lines are emitted, one per endpoint — the collision merges nothing
    And `module:src/a-b.mjs#run`, which sorts first ("-" before "." in the id sort), keeps the bare key `module_src_a_b_mjs_run`
    And `module:src/a.b.mjs#run` takes the key `module_src_a_b_mjs_run_2`
    And the suffix follows id-sort order, never the order the two were declared in the record
    And each line's label still carries its own raw text verbatim, so an operator tells the two apart by eye
    And a second process over the same registry assigns the same two keys

  Scenario: every node key in the diagram is renderable and unique
    Given a registry whose nodes and endpoints include loop:alpha, actor:root, a dangling loop:nowhere, command:work:next, module:src/run-store.mjs#isStale and config:work.autonomous.maxAttempts
    When I run `aof work loops graph --json`
    Then every node key in the text matches ^[A-Za-z0-9_]+$
    And no two node lines share a node key
    And there is exactly one node line per distinct node or endpoint in the model
    And every key named on an edge line is the key of a node line the same text declares

  Scenario: an edge line is the frozen arrow form
    Given loop:alpha declares `target-setting: [loop:beta]`
    When I run `aof work loops graph --json`
    Then the edge line is exactly `loop_alpha -->|target-setting| loop_beta`
    And the label is the frontmatter key verbatim — never title-cased, pluralised or prettified

  Scenario: the JSON envelope
    Given a workspace whose <work.dir>/loops/ holds 2 loop records and 1 actor record joined by 2 edges
    When I run `aof work loops graph --json`
    Then exactly one JSON document is printed on stdout
    And it carries exactly the keys source, present, format, text, nodeCount and edgeCount
    And format is "mermaid"
    And nodeCount is 3 and edgeCount is 2
    And present is true
    And the process exits 0

  Scenario: the JSON text is the same bytes as the human render's diagram
    Given a workspace whose <work.dir>/loops/ holds 2 loop records and 1 actor record
    When I run `aof work loops graph --json` and `aof work loops graph`
    Then the JSON `text` is byte-identical to the diagram block of the human output

  Scenario: --format mermaid is accepted and is the same output as the default
    Given a workspace whose <work.dir>/loops/ holds 2 loop records and 1 actor record
    When I run `aof work loops graph --format mermaid --json`
    Then format is "mermaid"
    And the text is byte-identical to the text `aof work loops graph --json` emits with no format flag

  Scenario: any other format value is refused with a coded error and no diagram
    Given a workspace whose <work.dir>/loops/ holds 2 loop records and 1 actor record
    When I run `aof work loops graph --format dot --json`
    Then exactly one JSON document is printed on stdout
    And it is an error envelope carrying ok false, a message and a stable code
    And it carries no `text` key and no diagram
    And the process exits non-zero

  Scenario: no loops directory renders a valid EMPTY diagram rather than crashing
    Given a workspace with no <work.dir>/loops/ directory
    When I run `aof work loops graph --json`
    Then present is false
    And nodeCount is 0 and edgeCount is 0
    And text is a syntactically valid Mermaid flowchart with no node lines
    And the process exits 0

  Scenario: an empty loops directory renders the same empty diagram, but present is true
    Given a workspace whose <work.dir>/loops/ exists and holds no `.md` file
    When I run `aof work loops graph --json`
    Then present is true
    And text is byte-identical to the text emitted when the directory is absent
    And nodeCount is 0 and edgeCount is 0
    And the process exits 0

  Scenario: a dangling endpoint still renders, and is not silently dropped
    Given loop:alpha declares `data-feed: [loop:nowhere]` and no `loops/nowhere.md` exists
    When I run `aof work loops graph --json`
    Then the diagram is emitted and the process exits 0
    And the rendering does not present loop:nowhere as an ordinary declared node
    And its line carries the parallelogram delimiters, never the rectangle a declared loop node gets

  Scenario: nodeCount counts DECLARED RECORDS, edgeCount counts EVERY declared edge, and the picture may be larger than both
    Given a workspace whose <work.dir>/loops/ holds exactly the 2 loop records alpha and beta
    And loop:alpha declares `data-feed: [loop:beta, loop:nowhere]` and no `loops/nowhere.md` exists
    And loop:alpha declares `monitoring: [command:work:next]`
    When I run `aof work loops graph --json`
    Then nodeCount is 2 — the declared records, and nothing else
    And edgeCount is 3 — every declared edge, the dangling one and the extra-registry one included
    And the text carries 4 node lines: loop:alpha, loop:beta, loop:nowhere and command:work:next
    And nodeCount is therefore SMALLER than the number of node lines, which is the contract and not a defect
    And nodeCount equals the number of nodes `aof work loops show --json` reports over the same registry
    And the process exits 0

  Examples: the node, and the line it emits
    | node or endpoint                                         | node key                           | emitted line                                                               |
    | id loop:alpha, kind loop, title Alpha                    | loop_alpha                         | loop_alpha["loop:alpha · Alpha"]                                           |
    | id actor:root, kind actor, title Root                    | actor_root                         | actor_root(["actor:root · Root"])                                          |
    | endpoint loop:nowhere — dangling                         | loop_nowhere                       | loop_nowhere[/"loop:nowhere"/]                                             |
    | endpoint command:work:next — extra-registry              | command_work_next                  | command_work_next[/"command:work:next"/]                                   |
    | endpoint module:src/run-store.mjs#isStale                | module_src_run_store_mjs_isStale   | module_src_run_store_mjs_isStale[/"module:src/run-store.mjs#isStale"/]     |
    | endpoint config:work.autonomous.maxAttempts              | config_work_autonomous_maxAttempts | config_work_autonomous_maxAttempts[/"config:work.autonomous.maxAttempts"/] |
    | endpoint module:src/a-b.mjs#run — collides, sorts first  | module_src_a_b_mjs_run             | module_src_a_b_mjs_run[/"module:src/a-b.mjs#run"/]                         |
    | endpoint module:src/a.b.mjs#run — collides, sorts second | module_src_a_b_mjs_run_2           | module_src_a_b_mjs_run_2[/"module:src/a.b.mjs#run"/]                       |
    | edge loop:alpha --target-setting--> loop:beta            | (n/a)                              | loop_alpha -->\|target-setting\| loop_beta                                 |

  Examples:
    | model shape                                      | nodeCount | edgeCount | fingerprint |
    | no loops/ directory                              | 0         | 0         | F0          |
    | loops/ exists, no .md files                      | 0         | 0         | F0          |
    | 1 loop record, no edges                          | 1         | 0         | F1          |
    | 1 loop + 1 actor, 1 target-setting edge          | 2         | 1         | F2          |
    | the same 2 records authored in the reverse order | 2         | 1         | F2          |
    | the same 2 records rendered in a second process  | 2         | 1         | F2          |
    | 2 loops + 1 actor, 3 edges across 2 edge types   | 3         | 3         | F3          |
    | those 3 records with one edge type relabelled    | 3         | 3         | F4          |

  Examples: the counts against the picture (52/ADR-012 §5/E2)
    | model shape                                              | nodeCount | edgeCount | node lines in the text |
    | no loops/ directory                                      | 0         | 0         | 0                      |
    | 1 loop record, no edges                                  | 1         | 0         | 1                      |
    | 2 loop records, 1 loop→loop edge                         | 2         | 1         | 2                      |
    | 2 loop records, 1 loop→loop edge and 1 dangling endpoint | 2         | 2         | 3                      |
    | 2 loop records and 1 `command:` endpoint                 | 2         | 1         | 3                      |
    | 1 loop record, 1 `module:` and 1 `config:` endpoint      | 1         | 2         | 3                      |
