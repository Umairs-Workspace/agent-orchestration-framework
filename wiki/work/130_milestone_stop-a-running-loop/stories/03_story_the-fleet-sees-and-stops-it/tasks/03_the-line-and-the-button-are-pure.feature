@executable @ui @work @board
Feature: the line and the button are pure projections — fleetLoopLines, loopStopAffordance, rememberStopRung in runs.mjs and nodeWorkRegion in scope.mjs, with fleetCurrentWorkLines byte-identical

  ADR-005 §5; DESIGN §Surface 1. Every fact the card renders is computed in a framework-free
  module `node:test` can drive. `runs.mjs` gains three exports: `fleetLoopLines(presence)` →
  ordered entries `{ key, line, title, loopRunId, scope, workspaceId, stop }` (ascending by `scope`
  on the plain codepoint comparison, ties by `loopRunId`; the DESIGN's anatomy — `loop <scope>
  [· stopping | · cancelling] [· <phase> <ref>] · cycle <n>[ of <cap>]`, with `L<n>` and
  `supervised` in `title` only; an absent `loops` key reads as `[]`); `loopStopAffordance({ loop,
  node, localNodeId, remembered })` → `{ button: null | { rung: 1 | 2, label, title, tone }, remote:
  boolean }` — a button ONLY when `localNodeId` is a non-empty string and `node.nodeId ===
  localNodeId`, `null` after rung 2, the rung `max(wire, remembered)`, a remote line's `title` tail
  saying why; `rememberStopRung(memory, loopRunId, rung, runId)` → a NEW `Map` holding
  `{ rung, runId }` that never lowers a rung for the SAME drive and never expires one on a timer. `scope.mjs` gains `nodeWorkRegion(node, localNodeId)` → `{ lines, token,
  loops }`, composing `fleetCurrentWorkLines(node.presence)` with the loop entries and dropping the
  single `idle` line when loops exist. `fleetCurrentWorkLines` and `nodeCurrentWork` are
  byte-identical — the Rust drift pin (`acd-captured-producer-fixture`) reads them.

  RULINGS (PO, 2026-09-13 — closing the QA's design-gap finding). THE MEMORY IS KEYED TO THE
  DRIVE, not to the loop's life: `rememberStopRung` stores `{ rung, runId }` for the `loopRunId`,
  where `runId` is the entry's in-flight run at the click; `loopStopAffordance` reads a remembered
  rung ONLY while `loop.runId === remembered.runId` and treats a memory from another drive as
  absent. The propagation gap the memory guards (a 2xx before the node publishes the request) keeps
  the SAME `runId` — the drive continues while draining — so the guard holds exactly where it must;
  a `--resume` mints a new drive (ADR-003 §6 clears the request; the next `drivePhase` mints a new
  record), so its entry carries a new `runId` and the button returns on its own. No timer, no
  reload. A wire `stop` that is non-null still wins by `max` whatever the memory says.
  RULINGS (QA, 2026-09-13). `rung` is the rung a click REQUESTS: 1 = drain (`Stop`), 2 = cancel
  (`Stop now`); the wire maps `null` → 1, `"drain"` → 2, `"cancel"` → 3, and a rung of 3 (wire or
  remembered) is "nothing left to ask" → `button: null`. The DESIGN's ladder counts standing
  requests (0/1/2) — the same three states, numbered from the click. The button's `title` and
  `aria-label` are the DESIGN's strings (§Surface 1's button table, §Accessibility 2), not draft
  copy. The line fails CLOSED: ` of <cap>` renders only for a positive-integer `cap`, the `cycle`
  segment only for a positive-integer `cycle`, the `<phase> <ref>` segment only when both are
  non-empty strings, and an unrecognised `stop` renders no state word and is reported `null` — the
  line never prints a value the mint could not have produced. The held word: between a 2xx and the
  wire's confirmation the line's state word is the remembered rung's (DESIGN "held locally"); the
  projections here are wire-only over what they are handed, and raising each entry's `stop` to the
  remembered rung before the region is projected is the card's composition — task 04 asserts the
  rendered outcome. A `null`/empty `localNodeId` is neither local nor remote: no button,
  `remote: false`, no tail (DESIGN default 6).

  Background:
    Given `presence` records built by the test, each with `activeRuns`, `sessions` and an optional `loops`
    And a loop entry `E1` = `{ loopRunId: "L1", workspaceId: "w1", scope: "129", level: "L2", cap: 3, phase: "continue", cycle: 1, ref: "129/04", runId: "r1", supervised: false, stop: null }`

  Scenario Outline: fleetLoopLines renders the anatomy from the entry's fields
    Given `presence.loops` is `[<entry>]`
    When `fleetLoopLines(presence)` is called
    Then it answers one entry whose `line` is <line> and whose `title` is <title>
    And its `key` is `"loop:L1"`, `loopRunId` `"L1"`, `scope` `"129"`, `workspaceId` `"w1"`, `stop` <stop>

    Examples:
      | entry                                          | line                                                       | title                                                          | stop       |
      | `E1`                                           | `loop 129 · continue 129/04 · cycle 1 of 3`                | `loop 129 · continue 129/04 · cycle 1 of 3 · L2`               | `null`     |
      | `E1` with `stop: "drain"`                      | `loop 129 · stopping · continue 129/04 · cycle 1 of 3`     | `loop 129 · stopping · continue 129/04 · cycle 1 of 3 · L2`    | `"drain"`  |
      | `E1` with `stop: "cancel"`                     | `loop 129 · cancelling · continue 129/04 · cycle 1 of 3`   | `… · L2`                                                       | `"cancel"` |
      | `E1` with `stop: "halt"`                       | `loop 129 · continue 129/04 · cycle 1 of 3`                | `… · L2`                                                       | `null` — an unknown word is no word |
      | `E1` with `ref: null`                          | `loop 129 · cycle 1 of 3`                                  | `loop 129 · cycle 1 of 3 · L2`                                 | `null`     |
      | `E1` with `phase: null`, `ref: "129/04"`       | `loop 129 · cycle 1 of 3`                                  | `… · L2`                                                       | `null`     |
      | `E1` with `phase: "refine"`, `ref: "129/01"`   | `loop 129 · refine 129/01 · cycle 1 of 3`                  | `… · L2`                                                       | `null`     |
      | `E1` with `phase: "verify"`, `ref: "129"`      | `loop 129 · verify 129 · cycle 1 of 3`                     | `… · L2`                                                       | `null`     |
      | `E1` with `cap: null`                          | `loop 129 · continue 129/04 · cycle 1`                     | `… · L2`                                                       | `null`     |
      | `E1` with `cap: 0`                             | `loop 129 · continue 129/04 · cycle 1`                     | `… · L2`                                                       | `null`     |
      | `E1` with `cycle: null`                        | `loop 129 · continue 129/04`                               | `loop 129 · continue 129/04 · L2`                              | `null`     |
      | `E1` with `stop: "drain"`, `ref: null`, `cap: null` | `loop 129 · stopping · cycle 1`                       | `loop 129 · stopping · cycle 1 · L2`                           | `"drain"`  |
      | `E1` with `level: "L3"`, `supervised: true`    | `loop 129 · continue 129/04 · cycle 1 of 3`                | `loop 129 · continue 129/04 · cycle 1 of 3 · L3 · supervised`  | `null`     |

  Scenario Outline: the entries are ordered and an absent key is empty
    Given `presence.loops` is <loops>
    When `fleetLoopLines(presence)` is called
    Then the answered `scope`s are, in order, <order>

    Examples:
      | loops                                                                       | order                                                             |
      | absent                                                                      | `[]`                                                              |
      | `[]`                                                                        | `[]`                                                              |
      | `null`                                                                      | `[]` — never a throw                                              |
      | `[E1 with scope "131", E1 with scope "129"]`                                | `["129", "131"]`                                                  |
      | `[E1 with scope "129" loopRunId "Lb", E1 with scope "129" loopRunId "La"]`  | `["129", "129"]` with `loopRunId`s `["La", "Lb"]`                 |
      | `[E1 with scope "9", E1 with scope "10", E1 with scope "01-05"]`             | `["01-05", "10", "9"]` — the plain codepoint order the region already uses |

  Scenario Outline: the affordance is local-only and climbs the rung ladder
    Given a loop entry with `stop` <wire> and a remembered rung <remembered> for its `loopRunId`
    And the card's node is <node> and the payload's `localNodeId` is <localNodeId>
    When `loopStopAffordance({ loop, node, localNodeId, remembered })` is called
    Then `button` is <button> and `remote` is <remote>

    Examples:
      | wire       | remembered | node             | localNodeId      | button                                                                                                        | remote |
      | `null`     | none       | `umamis-msi`     | `"umamis-msi"`   | `{ rung: 1, label: "Stop", title: "Stop loop 129 — the current drive finishes first", tone: "muted" }`         | false  |
      | `"drain"`  | none       | `umamis-msi`     | `"umamis-msi"`   | `{ rung: 2, label: "Stop now", title: "Stop loop 129 now — cancels the in-flight session", tone: "destructive" }` | false |
      | `null`     | 1          | `umamis-msi`     | `"umamis-msi"`   | `{ rung: 1, … }` — a memory no higher than the wire changes nothing                                            | false  |
      | `null`     | 2          | `umamis-msi`     | `"umamis-msi"`   | `{ rung: 2, … }` — the memory wins until the wire catches up                                                   | false  |
      | `"drain"`  | 1          | `umamis-msi`     | `"umamis-msi"`   | `{ rung: 2, … }` — the wire wins when it is higher                                                             | false  |
      | `"cancel"` | none       | `umamis-msi`     | `"umamis-msi"`   | `null` — nothing left to ask                                                                                   | false  |
      | `"drain"`  | 3          | `umamis-msi`     | `"umamis-msi"`   | `null`                                                                                                        | false  |
      | `null`     | 3 (same `runId`) | `umamis-msi` | `"umamis-msi"` | `null` — the wire has not caught up under the SAME drive; the memory holds                                    | false  |
      | `null`     | 3 (another `runId`) | `umamis-msi` | `"umamis-msi"` | `{ rung: 1, label: "Stop", … }` — a `--resume` minted a new drive; the old memory is absent                | false  |
      | `"drain"`  | 2 (another `runId`) | `umamis-msi` | `"umamis-msi"` | `{ rung: 2, … }` — the wire's own word, the memory ignored                                                   | false  |
      | `null`     | none       | `umamis-mac-mini`| `"umamis-msi"`   | `null`                                                                                                        | true   |
      | `null`     | none       | `umamis-msi`     | `"ghost"`        | `null` — a `localNodeId` no card carries makes every card remote                                               | true   |
      | `null`     | none       | `umamis-msi`     | `null`           | `null`                                                                                                        | false  |
      | `null`     | none       | `umamis-msi`     | `""`             | `null`                                                                                                        | false  |
      | `null`     | none       | `Umamis-MSI`     | `"umamis-msi"`   | `null` — a strict `===`, never a case fold                                                                     | true   |

  Scenario Outline: the remote tail says why there is no button, and the local line has none
    Given a loop entry `E1` on node <node> with `localNodeId` `"umamis-msi"`
    When `fleetLoopLines` and `loopStopAffordance` are composed for it
    Then the line's `title` <title>

    Examples:
      | node               | title                                                                       |
      | `umamis-mac-mini`  | ends `· L2 · remote — stop from umamis-mac-mini's own console`              |
      | `umamis-msi`       | ends `· L2` and contains no `remote`                                        |

  Scenario Outline: the rung memory never lowers for the same drive, never expires on a timer, and is replaced by a new drive
    Given a memory `Map` holding <before> for `"L1"`
    When `rememberStopRung(memory, "L1", <rung>, <runId>)` is called
    Then it answers a NEW `Map` (not the same object) holding <after> for `"L1"`
    And the original `Map` is unchanged and every other key it held is still present with its value

    Examples:
      | before                      | rung | runId  | after                       |
      | nothing                     | 1    | `"r1"` | `{ rung: 1, runId: "r1" }`  |
      | `{ rung: 1, runId: "r1" }`  | 2    | `"r1"` | `{ rung: 2, runId: "r1" }`  |
      | `{ rung: 1, runId: "r1" }`  | 1    | `"r1"` | `{ rung: 1, runId: "r1" }`  |
      | `{ rung: 2, runId: "r1" }`  | 1    | `"r1"` | `{ rung: 2, runId: "r1" }`  |
      | `{ rung: 3, runId: "r1" }`  | 1    | `"r1"` | `{ rung: 3, runId: "r1" }`  |
      | `{ rung: 3, runId: "r1" }`  | 1    | `"r2"` | `{ rung: 1, runId: "r2" }`  — a new drive starts a new memory |
      | `{ rung: 2, runId: "r1" }`  | 2    | `"r2"` | `{ rung: 2, runId: "r2" }`  |
      | 2, and 1 for `"L2"` | 3 | 3, and `"L2"` still 1 |

  Scenario Outline: nodeWorkRegion composes the pinned lines with the loop entries
    Given a node whose presence has <presence>
    When `nodeWorkRegion(node, <localNodeId>)` is called
    Then `lines` deep-equals <lines>, `token` is <token>, and `loops` has <count> entries

    Examples:
      | presence                                                        | localNodeId    | lines                                                            | token       | count |
      | `activeRuns: []`, `sessions: []`, no loops                      | `"umamis-msi"` | `["idle"]`                                                       | `"muted"`   | 0     |
      | no `presence` at all (a never-beat node)                        | `"umamis-msi"` | `["idle"]`                                                       | `"muted"`   | 0     |
      | `activeRuns: ["r1"]`, no loops                                  | `"umamis-msi"` | `["running 1 run"]`                                              | `"primary"` | 0     |
      | `activeRuns: ["r1"]`, `loops: [E1]`                             | `"umamis-msi"` | `["running 1 run"]` — the loop entries ride `loops`, not `lines` | `"primary"` | 1     |
      | `activeRuns: []`, `sessions: []`, `loops: [E1]`                 | `"umamis-msi"` | `[]` — `idle` is dropped when a loop exists                      | `"primary"` | 1     |
      | `activeRuns: []`, `sessions: [one live, repo "aof"]`, `loops: [E1]` | `"umamis-msi"` | `["working · aof (session)"]`                                | `"primary"` | 1     |
      | `activeRuns: []`, `sessions: []`, `loops: [E1, E1 with scope "9" loopRunId "L2"]` | `"umamis-msi"` | `[]`                                     | `"primary"` | 2 — ordered `"129"` then `"9"` |
      | `activeRuns: []`, `sessions: []`, `loops: [E1]`                 | `null`         | `[]` — the line is not gated by locality                         | `"primary"` | 1     |

  Scenario: the pinned projections are byte-identical
    When `fleetCurrentWorkLines` is driven over the captured producer fixtures `acd-captured-producer-fixture` pins
    Then every answer equals its pinned lines
    And `nodeCurrentWork(node)` still equals `fleetCurrentWorkLines(node.presence)` for every fixture node, including one whose presence carries `loops`

  Scenario: the projections never mutate their input
    Given a frozen `presence` carrying `loops: [E1]` and a frozen node around it
    When `fleetLoopLines`, `loopStopAffordance` and `nodeWorkRegion` are called over them
    Then none throws and the inputs are deep-equal to what they were

  Scenario: the type declarations name the four exports
    When `ui/src/fleet/runs.d.mts` and `ui/src/fleet/scope.d.mts` are read
    Then `runs.d.mts` declares `fleetLoopLines`, `loopStopAffordance` and `rememberStopRung` with the shapes above
    And `scope.d.mts` declares `nodeWorkRegion`
