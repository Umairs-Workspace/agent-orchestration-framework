@executable @cli @work @work-stream
Feature: work:loops show — the declared loop model, over the wire

  `aof work loops show [--id <node-id>] [--json]` hands back the parsed registry as data:
  one node per record, every field carrying its `kind` so a declared gap can never read as
  a filled value, and every endpoint carrying a three-valued `resolved` so "not resolved
  here" can never read as "resolved fine". 52/ADR-008 freezes the envelope; 52/ADR-002 as
  completed by 52/ADR-011 §2 freezes `Field` — ELEVEN kinds, exported as `FIELD_KINDS`
  (52/ADR-012 §2/B4), and a shape fixed by the KEY rather than by the data; 52/ADR-004 §3
  as completed by 52/ADR-011 §11/D4 freezes `Endpoint`, which carries `symbol?` split by the
  same rule `Field.pointer` uses. Every path in the command's result is a raw absolute in
  this OS's native form — nothing is projected inside the command; the face relativises
  EVERY path it prints, `source` and each node's `path` alike (52/ADR-011 §11/D5, ratified
  52/ADR-012 §4/D5).

  The fixture registry throughout is three hand-authored records — `loops/alpha.md`
  (`id: loop:alpha`), `loops/beta.md` (`id: loop:beta`) and `loops/root.md`
  (`id: actor:root`, `ground: exogenous`) — authored by the test, not by 52/03.

  Scenario: the JSON envelope over a declared registry
    Given a workspace whose <work.dir>/loops/ holds the 3 fixture records
    When I run `aof work loops show --json`
    Then exactly one JSON document is printed on stdout
    And it carries the keys source, present and nodes
    And present is true
    And nodes has 3 entries — one per record
    And the process exits 0

  Scenario: every node carries the six contract keys
    Given a workspace whose <work.dir>/loops/ holds the 3 fixture records
    When I run `aof work loops show --json`
    Then each node carries id, kind, title, fields, edges and path
    And each node's id is the id declared in its record
    And each node's path names the record file it was read from
    And no node's fields map carries id, kind or title — those three are node-level scalars, never fields

  Scenario: the command result's source is a RAW ABSOLUTE path
    Given a workspace whose <work.dir>/loops/ holds the 3 fixture records
    When I invoke the command id "work:loops-show" in-process with {}
    Then source is an absolute path, in this OS's native separator form, naming <work.dir>/loops
    And each node's path is likewise an absolute path, in this OS's native separator form
    And no path anywhere in the result is expressed relative to any base

  Scenario: the CLI face relativises source to the invocation cwd
    Given a workspace whose <work.dir>/loops/ holds the 3 fixture records
    When I run `aof work loops show --json` from the workspace root
    Then the printed source is that same directory expressed relative to the invocation cwd
    And each printed node path is likewise relative to that cwd
    When I run `aof work loops show --config <workspace>/.aof/aof.config.json --json` from a nested subdirectory of the workspace
    Then the printed source is the same directory expressed relative to THAT cwd
    And both runs name the same directory on disk

  Scenario: a declared `owner: unknown` is visibly a gap, never an empty string
    Given `loops/alpha.md` declares `owner: unknown`
    When I run `aof work loops show --json`
    Then loop:alpha's fields.owner is { key: "owner", raw: "unknown", kind: "unknown" }
    And fields.owner.raw is not the empty string
    And every field of every node carries a kind

  Scenario: a pointer field carries its parsed pointer parts
    Given `loops/alpha.md` declares `actuator: [module:src/run-store.mjs#reclaimStaleRuns]`
    When I run `aof work loops show --json`
    Then that entry's kind is "pointer"
    And its pointer is { scheme: "module", operand: "src/run-store.mjs", symbol: "reclaimStaleRuns" }

  Scenario: a `prose:` field is kind "prose" and is not conflated with "unknown"
    Given `loops/beta.md` declares `measurement: [prose:src/bundle/commands/continue.md]`
    And `loops/beta.md` declares `owner: unknown`
    When I run `aof work loops show --json`
    Then loop:beta's measurement entry has kind "prose"
    And that entry's path is "src/bundle/commands/continue.md" — the paragraph's home, carried as data
    And loop:beta's fields.owner has kind "unknown"
    And the two kinds are different values

  Scenario: `fields` is shaped by the KEY, not by the data
    Given `loops/alpha.md` declares `reference: [command:work:next]` and `actuator: [module:src/run-store.mjs#reclaimStaleRuns]`
    And `loops/alpha.md` declares `controlled: "run state reaching a terminal value"`
    When I run `aof work loops show --json`
    Then fields.reference, fields.measurement, fields.actuator and fields.ceiling are each an ARRAY of Field
    And fields.controlled, fields.cadence, fields.owner and fields.optimizing are each a SINGLE Field
    And a key's array-ness is the same on every node that declares it, whatever that node declared

  Scenario: a lone sentinel on a list key is still an array of one
    Given `loops/beta.md` declares `ceiling: uncapped`
    And `loops/alpha.md` declares `ceiling: [config:work.autonomous.maxAttempts]`
    When I run `aof work loops show --json`
    Then loop:beta's fields.ceiling is [ { key: "ceiling", raw: "uncapped", kind: "uncapped" } ]
    And loop:alpha's fields.ceiling is an array of one pointer Field
    And both are arrays — the sentinel and the pointer list have the same outer shape

  Scenario: a duplicate entry in a field list is KEPT — an enumeration of authorities, never a set like an edge list
    Given `loops/alpha.md` declares `actuator: [command:a, command:a]`
    When I run `aof work loops show --json`
    Then loop:alpha's fields.actuator is an array of TWO Field entries, not one
    And each entry is { key: "actuator", raw: "command:a", kind: "pointer" } carrying pointer { scheme: "command", operand: "a" }
    And the two appear in the order the record declared them — multiplicity and order are the author's statement, which `show` round-trips verbatim

  Scenario: `cadence` arrives NORMALISED, never as a string a consumer must parse
    Given `loops/alpha.md` declares `cadence: periodic:15s`
    And `loops/beta.md` declares `cadence: event:per-item`
    When I run `aof work loops show --json`
    Then loop:alpha's fields.cadence is { key: "cadence", raw: "periodic:15s", kind: "periodic", ms: 15000 }
    And ms is a number of milliseconds, not a string
    And loop:beta's fields.cadence is { key: "cadence", raw: "event:per-item", kind: "event", trigger: "per-item" }
    And no cadence field reaches the consumer with kind "phrase" or "pointer"

  Scenario: `owner`, `optimizing` and `ground` carry their own typed kinds
    Given `loops/beta.md` declares `owner: actor:root` and `optimizing: true`
    And `loops/root.md` declares `kind: actor` and `ground: exogenous`
    When I run `aof work loops show --json`
    Then loop:beta's fields.owner has kind "ref", scheme "actor" and operand "root"
    And loop:beta's fields.optimizing has kind "flag" and value true — the boolean, not the string "true"
    And actor:root's fields.ground has kind "enum" and value "exogenous"
    And loop:beta's fields.owner is not kind "pointer" — an owner is a ref, not one of the three pointer schemes

  Scenario: an intra-registry endpoint that resolves carries resolved true
    Given `loops/alpha.md` declares `data-feed: [loop:beta]`
    When I run `aof work loops show --json`
    Then loop:alpha's edges."data-feed" holds one endpoint
    And that endpoint is { raw: "loop:beta", scheme: "loop", operand: "beta", resolved: true }

  Scenario: a dangling intra-registry endpoint carries resolved false
    Given `loops/alpha.md` declares `data-feed: [loop:nowhere]` and no `loops/nowhere.md` exists
    When I run `aof work loops show --json`
    Then that endpoint's resolved is false
    And the process exits 0

  Scenario: an extra-registry endpoint carries resolved null — distinct from false
    Given `loops/alpha.md` declares `monitoring: [command:work:next]`
    And `loops/alpha.md` declares `data-feed: [loop:nowhere]`
    When I run `aof work loops show --json`
    Then the command:work:next endpoint carries scheme "command" and resolved null
    And the loop:nowhere endpoint carries resolved false
    And the loop:beta endpoint carries resolved true
    And the three resolved values are null, false and true respectively — never coerced to one another

  Scenario: a `module:` endpoint splits into operand and symbol, exactly as a pointer field does
    Given `loops/alpha.md` declares `monitoring: [module:src/run-store.mjs#isStale]`
    When I run `aof work loops show --json`
    Then that endpoint is { raw: "module:src/run-store.mjs#isStale", scheme: "module", operand: "src/run-store.mjs", symbol: "isStale", resolved: null }
    And its operand and symbol are split exactly as fields.actuator's pointer splits the same raw text
    And an endpoint with no `#` — loop:beta, command:work:next — carries no symbol key at all

  Scenario: a node's edges map carries only the edge types it declared
    Given `loops/alpha.md` declares `data-feed` and `monitoring` and no other edge key
    When I run `aof work loops show --json`
    Then loop:alpha's edges carries exactly the keys data-feed and monitoring
    And no other edge key appears with an empty array
    And actor:root, which declares no edge key, carries an edges map with no keys at all

  Scenario: --id returns just that node
    Given a workspace whose <work.dir>/loops/ holds the 3 fixture records
    When I run `aof work loops show --id loop:alpha --json`
    Then nodes has exactly 1 entry
    And that entry's id is "loop:alpha"
    And present is true
    And the process exits 0

  Scenario: an unknown --id returns an empty node list, not an error
    Given a workspace whose <work.dir>/loops/ holds the 3 fixture records
    When I run `aof work loops show --id loop:not-declared --json`
    Then nodes is empty
    And present is true
    And no error envelope is printed
    And the process exits 0

  Scenario: an existing but EMPTY loops directory is present, with zero nodes
    Given a workspace whose <work.dir>/loops/ exists and holds no `.md` file
    When I run `aof work loops show --json`
    Then present is true
    And nodes is empty
    And the process exits 0

  Scenario: no loops directory at all is present false — a different fact from an empty one
    Given a workspace with no <work.dir>/loops/ directory
    When I run `aof work loops show --json`
    Then present is false
    And nodes is empty
    And source still names the <work.dir>/loops directory that would hold the registry
    And the process exits 0

  Scenario: the human render lists the nodes legibly
    Given a workspace whose <work.dir>/loops/ holds the 3 fixture records
    When I run `aof work loops show`
    Then the output names each node's id, kind and title
    And the output states how many nodes were found
    And the process exits 0

  Scenario: the human render states an absent registry rather than printing nothing
    Given a workspace with no <work.dir>/loops/ directory
    When I run `aof work loops show`
    Then the output states that no loop registry is declared, naming the directory it looked in
    And the output is not empty
    And the process exits 0

  Examples: the declared value, and the Field a consumer receives
    | key         | declared value                          | fields[key] | kind     | payload beyond key + raw                                        |
    | controlled  | run state reaching a terminal value      | Field       | phrase   | (none — raw only)                                               |
    | reference   | [command:work:next]                      | Field[]     | pointer  | pointer { scheme: "command", operand: "work:next" }             |
    | actuator    | [module:src/run-store.mjs#isStale]       | Field[]     | pointer  | pointer { scheme: "module", operand: "src/run-store.mjs", symbol: "isStale" } |
    | actuator    | [command:a, command:a]                   | Field[]     | pointer  | pointer { scheme: "command", operand: "a" } — TWICE, in order   |
    | measurement | [prose:src/bundle/commands/continue.md]  | Field[]     | prose    | path "src/bundle/commands/continue.md"                          |
    | cadence     | periodic:15s                             | Field       | periodic | ms 15000 (a number)                                             |
    | cadence     | event:per-item                           | Field       | event    | trigger "per-item"                                              |
    | cadence     | unknown                                  | Field       | unknown  | (none — raw only)                                               |
    | ceiling     | [config:work.autonomous.maxAttempts]     | Field[]     | pointer  | pointer { scheme: "config", operand: "work.autonomous.maxAttempts" } |
    | ceiling     | uncapped                                 | Field[]     | uncapped | (none — one-entry array)                                        |
    | ceiling     | none                                     | Field[]     | none     | (none — one-entry array)                                        |
    | ceiling     | unknown                                  | Field[]     | unknown  | (none — one-entry array)                                        |
    | owner       | actor:root                               | Field       | ref      | scheme "actor", operand "root"                                  |
    | owner       | unknown                                  | Field       | unknown  | (none — raw only)                                               |
    | optimizing  | true                                     | Field       | flag     | value true (boolean)                                            |
    | ground      | exogenous  (kind: actor only)            | Field       | enum     | value "exogenous"                                               |

  Examples:
    | --id             | registry state                 | present | nodes | exit |
    | (absent)         | 3 fixture records              | true    | 3     | 0    |
    | loop:alpha       | 3 fixture records              | true    | 1     | 0    |
    | actor:root       | 3 fixture records              | true    | 1     | 0    |
    | loop:not-declared| 3 fixture records              | true    | 0     | 0    |
    | (absent)         | loops/ exists, no .md files    | true    | 0     | 0    |
    | (absent)         | no loops/ directory            | false   | 0     | 0    |
    | loop:alpha       | no loops/ directory            | false   | 0     | 0    |
