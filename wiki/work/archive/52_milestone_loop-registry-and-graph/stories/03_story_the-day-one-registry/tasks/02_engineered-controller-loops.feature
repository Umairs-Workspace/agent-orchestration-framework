@executable @docs @work @work-stream
Feature: The engineered controllers — declare the machinery, never duplicate it

  run-resilience and mesh-assignment-reclaim are the two loops RESEARCH found with every field
  backed by a named symbol rather than a paragraph, and retrospective→memory-ingest is the third
  record this task authors. Their records are where "declare, never duplicate" is tested: a record
  that restated the transition table or the retryable set would drift the day someone adds a
  failure reason, and nothing would notice. Being the best-engineered loop does not manufacture an
  owner, either.

  THE CITATION AUTHORITY FOR THIS FILE IS ADR-011 §13's TABLE, NOT ADR-010's PARENTHETICALS. A
  `module:` pointer names the module that DEFINES the symbol — its `export function`/`export const`
  site — never one that imports, re-exports or merely calls it. ADR-010's parentheticals pointed at
  import sites and at a constant in four places and are corrected in §13 (measured 2026-08-14); a
  record author who follows ADR-010's citations authors four wrong pointers. A `command:` pointer
  names a REGISTERED command id (one present in `COMMANDS`) — a CLI surface served only by a legacy
  `src/cli.mjs` ladder branch is not a `command:` pointer. And an actuator names the narrowest
  artifact that acts, never the prompt or ladder that merely orchestrates it (ADR-011 §10).
  ADR-003, ADR-004's worked record, ADR-010 rows 5-7, ADR-011 §5, §10 and §13, RESEARCH §Q1.5 and
  §Q1's eighth-loop finding, ADR-012 §6/F1, §6/F2 and §6/F4.

  Scenario: run-resilience declares every machinery field as a pointer
    Given the day-one registry under <work.dir>/loops/
    When I read loops/run-resilience.md's reference, measurement, actuator and ceiling
    Then every entry is a `module:`, `command:` or `config:` pointer
    And no entry is `prose:`
    And no entry is `unknown`
    And no list is empty — an empty machinery list is `loop-empty-list` (error, ADR-011 §5), never a way to declare nothing
    And the pointers name isLegalTransition, isRetryable, isStale, retryReadiness and shouldRetry — the symbols RESEARCH §Q1.5 measured
    And its actuator names at least one registered `command:work:run-*` id

  Scenario: the run-resilience record restates none of the machinery it points at
    Given loops/run-resilience.md
    When I search the whole record — frontmatter and prose body alike
    Then no member of the transition table appears: not "queued>running", "queued>cancelled", "running>done", "running>failed" or "running>cancelled"
    And no member of the failure classification appears: not "runtime_offline", not "session_limit", not "agent_error"
    And no declared field value states a numeric attempt limit
    And in place of each, the record declares the pointer that owns it

  Scenario: run-resilience still declares an unknown owner
    Given loops/run-resilience.md
    When I read its `owner`
    Then it declares "unknown"
    And its prose body cites the frozen 15-key run record (src/run-store.mjs:344-362) as carrying no owner key
    And no `owner:` value is inferred from the record's `node` provenance key, which is partition provenance and not an owner

  Scenario: run-resilience declares its own cadence and does not borrow the mesh's clock
    Given loops/run-resilience.md
    When I read its `cadence`
    Then it declares "event:per-run-start"
    And it declares no `periodic:` cadence — the 15s wall-clock tick belongs to a different module and a different loop (RESEARCH §Q1.5)

  Scenario: mesh-assignment-reclaim is the day-one registry's only loop on a clock
    Given the nine records under <work.dir>/loops/
    When I collect every record declaring a `periodic:` cadence
    Then the collection holds exactly one record, loops/mesh-assignment-reclaim.md
    And that record declares cadence "periodic:15s"
    And its prose body cites src/mesh-sync-cadence.mjs:25 for the 15s default and a `path:line` in src/mesh-launcher.mjs for the control-role-only wiring
    And that record declares ceiling "none" — each reclaim tick is single-shot and terminates by construction, so the 15s is its RATE and not a bound it iterates toward (ADR-012 §6/F1)
    And it declares neither "ceiling: unknown" nor "ceiling: uncapped" — the evidence was looked for and the answer is "not applicable", not "not found", so this record contributes no `loop-ceiling-unknown` warn
    And its prose body carries that rate-versus-bound reasoning, so the next reader does not re-open the ceiling as an unanswered question

  Scenario: the dual staleness gate declares the AND, not merely its two operands
    Given loops/mesh-assignment-reclaim.md
    When I read its `reference` and `measurement`
    Then each names `module:src/mesh-assignment-reclaim.mjs#dualStalenessDecision` — the exported predicate that ANDs both clocks (ADR-011 §13/F3)
    And each also names isNodeStale and isStale as two separate pointer entries, so the gate and its halves are all three declared
    And neither collapses the two clocks into a single "staleness" entry, and neither drops the AND by declaring only the halves
    And the `isNodeStale` pointer names src/mesh-presence.mjs, whose DEFINING site is :453 — never src/mesh-presence.mjs:57, which is DEFAULT_PRESENCE_STALENESS_SECONDS and not the predicate
    And the `isStale` pointer names src/run-store.mjs, whose DEFINING site is :667 — never src/mesh-assignment-reclaim.mjs, which only imports it
    And its prose body records that both predicates are imported and shared, never re-derived (src/mesh-assignment-reclaim.mjs:17-21)
    And it declares owner "unknown"

  Scenario: retrospective-memory-ingest declares a per-milestone trigger and no per-loop owner
    Given the day-one registry under <work.dir>/loops/
    When I read loops/retrospective-memory-ingest.md
    Then it declares cadence "event:per-milestone", citing src/bundle/commands/verify.md:95-99
    And it declares ceiling "none"
    And it declares owner "unknown"
    And its prose body records that src/bundle/commands/retrospective.md:44 declares a per-LESSON owner, which is not a per-loop owner
    And its `measurement` is `prose:src/bundle/commands/retrospective.md` — agent triage, no deterministic grader

  Scenario: the ingest actuator is authored as a module pointer or prose, never as a command that is not registered
    Given loops/retrospective-memory-ingest.md
    When I read its `actuator` list
    Then no entry is `command:work:memory-ingest` — no `work:memory*` id exists in the registry, so that pointer names nothing
    And no entry is any other `command:` pointer at the memory surface: `aof work memory` is dispatched through the legacy ladder at src/cli.mjs:8, which is not a registered command
    And the ingest actuator is `module:src/work-memory.mjs#runMemory` (ADR-012 §6/F2) — not a `prose:` path, because a real export exists and `prose:` would under-report the machinery aof has
    And no entry names a finer-grained symbol such as an ingest-specific export, because none exists: `ingest` is an alias of `reindex` dispatched inside runMemory, and the frozen backend interface is `{name, recall, reindex, status}`
    And where the entry is a `module:` pointer, the symbol is exported by src/work-memory.mjs itself, not by a caller of it — runMemory is an `export async function` at :317, which is what FF-5204's definition-form resolution reads
    And its prose body carries the aliasing evidence (src/work-memory.mjs:209 and MEMORY_VERBS at :28) so the pin is re-derivable, and cites src/cli.mjs:8 as the reason the `command:` form is unavailable, so the next author does not re-add it

  Scenario: none of the three engineered controllers claims to be an optimizer
    Given loops/run-resilience.md, loops/mesh-assignment-reclaim.md and loops/retrospective-memory-ingest.md
    When I read each record's `optimizing` value and its prose body
    Then each of the three declares optimizing false (ADR-012 §6/F4)
    And loops/run-resilience.md's body justifies it as a regulator holding runs against the transition table, with no metric pushed to an extremum
    And loops/mesh-assignment-reclaim.md's body justifies it as a regulator holding assignments against a staleness threshold
    And loops/retrospective-memory-ingest.md's body justifies it as a capture pass with no extremum to reach
    And each justification sits in the record's own body, because `optimizing` is the one field no check can re-derive from evidence
    And each value is the literal false, never a sentinel and never a quoted string
    And the unpaired-optimizer check names none of the three, so the day-one count of three optimizers is drawn entirely from the ACD phase loops — three of that file's four (ADR-012 §6/F4)

  Scenario: every pointer these three records declare names a real, correctly located authority
    Given loops/run-resilience.md, loops/mesh-assignment-reclaim.md and loops/retrospective-memory-ingest.md
    When I read every `module:`, `command:` and `config:` pointer they declare
    Then each `module:` pointer's path is the module that DEFINES the named symbol, never a module that merely imports it
    And where ADR-010's parenthetical and ADR-011 §13's table disagree, the record follows §13 — isNodeStale at src/mesh-presence.mjs:453, isStale at src/run-store.mjs:667, transitionAssignmentState at src/effects/assignment-transitions.mjs:143, transitionRunReclaimed at src/effects/run-transitions.mjs:137
    And each `command:` pointer names an id registered in src/command-core.mjs — work:next, work:run-start, work:run-retry, work:run-complete
    And no pointer names a CLI surface reachable only through a src/cli.mjs ladder branch, which is not a registered command and therefore not a `command:` pointer
    And each actuator entry names the narrowest artifact that acts — a defining symbol or an agent definition — never an orchestrating prompt or ladder (ADR-011 §10)
    And where the narrowest act is not itself an exported symbol, the pointer names the narrowest EXPORTED symbol on the path to it — never a symbol invented to be narrower, and never `prose:` where a real export exists (ADR-012 §6/F2)
    And no `command:` or `config:` pointer carries a `#`: the symbol split is `module:`-only, and a `#` anywhere else is `loop-bad-value` (ADR-012 §4/D3), a code this registry reports zero times
    And every `module:` path is repo-relative with forward slashes, never absolute and never OS-separated

  Examples:
    | loop                             | field       | declared pointer                                                    | the symbol it names                                       |
    | loop:run-resilience              | reference   | module:src/run-store.mjs#isLegalTransition                          | the closed transition table — never its members           |
    | loop:run-resilience              | reference   | module:src/run-store.mjs#isRetryable                                | the failure classification — never its members            |
    | loop:run-resilience              | measurement | module:src/run-store.mjs#isStale                                    | heartbeat age against a threshold                         |
    | loop:run-resilience              | measurement | module:src/run-store.mjs#retryReadiness                             | park/resume readiness for a session-limit failure         |
    | loop:run-resilience              | ceiling     | config:work.autonomous.maxAttempts                                  | the attempt ceiling, resolved outside the store           |
    | loop:run-resilience              | ceiling     | module:src/run-store.mjs#shouldRetry                                | the predicate that ANDs class with ceiling                |
    | loop:run-resilience              | actuator    | command:work:run-retry                                              | a registered command id                                   |
    | loop:run-resilience              | actuator    | command:work:run-complete                                           | a registered command id                                   |
    | loop:run-resilience              | cadence     | event:per-run-start                                                 | the local reclaim scan's trigger                          |
    | loop:mesh-assignment-reclaim     | reference   | module:src/mesh-assignment-reclaim.mjs#dualStalenessDecision        | the exported AND of both clocks — the gate itself         |
    | loop:mesh-assignment-reclaim     | reference   | module:src/mesh-presence.mjs#isNodeStale                            | half the dual gate — presence, 90s                        |
    | loop:mesh-assignment-reclaim     | reference   | module:src/run-store.mjs#isStale                                    | the other half — run heartbeat, imported never re-derived |
    | loop:mesh-assignment-reclaim     | measurement | module:src/mesh-assignment-reclaim.mjs#dualStalenessDecision        | the same AND on the measurement axis (ADR-011 §13/F3)     |
    | loop:mesh-assignment-reclaim     | measurement | module:src/mesh-presence.mjs#isNodeStale                            | the presence clock, observed                              |
    | loop:mesh-assignment-reclaim     | measurement | module:src/run-store.mjs#isStale                                    | the heartbeat clock, observed                             |
    | loop:mesh-assignment-reclaim     | actuator    | module:src/effects/assignment-transitions.mjs#transitionAssignmentState | the reclaim write on the assignment                    |
    | loop:mesh-assignment-reclaim     | actuator    | module:src/effects/run-transitions.mjs#transitionRunReclaimed       | the linked run's reclaim edge                             |
    | loop:mesh-assignment-reclaim     | cadence     | periodic:15s                                                        | a real wall-clock tick (src/mesh-sync-cadence.mjs:25)     |
    | loop:mesh-assignment-reclaim     | ceiling     | none                                                                | single-shot per tick — the cadence is the rate (ADR-012 §6/F1) |
    | loop:retrospective-memory-ingest | measurement | prose:src/bundle/commands/retrospective.md                          | agent triage — the only authority is a paragraph          |
    | loop:retrospective-memory-ingest | actuator    | module:src/work-memory.mjs#runMemory                                | the narrowest EXPORTED symbol on the path to the ingest act |

  Examples:
    | symbol                    | what ADR-010's parenthetical said                     | what that site actually is              | the DEFINING site the record cites (ADR-011 §13) |
    | isNodeStale               | src/mesh-presence.mjs:57                              | DEFAULT_PRESENCE_STALENESS_SECONDS      | src/mesh-presence.mjs:453                        |
    | isStale                   | src/mesh-assignment-reclaim.mjs:83                    | an import plus a threshold              | src/run-store.mjs:667                            |
    | transitionAssignmentState | src/mesh-assignment-reclaim.mjs:32-37                 | import lines                            | src/effects/assignment-transitions.mjs:143       |
    | transitionRunReclaimed    | src/mesh-assignment-reclaim.mjs:32-37                 | import lines                            | src/effects/run-transitions.mjs:137              |
    | dualStalenessDecision     | not cited at all — RESEARCH never surfaced it         | the exported AND of both clocks         | src/mesh-assignment-reclaim.mjs:96               |
    | the memory ingest surface | implied command:work:memory-ingest                    | a legacy src/cli.mjs:8 ladder branch    | src/work-memory.mjs:317 — `export async function runMemory` |
