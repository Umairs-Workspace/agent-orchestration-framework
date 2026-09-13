@executable @cli @work @work-stream
Feature: The two doors — the driver's own and the sink's re-export, one implementation behind both

  What a CONSUMER observes at each door. ADR-001 §2 is what makes the move affordable: the
  SEVENTEEN frozen names — §1's sixteen plus `ensureWorktreeTrusted`, which ADR-010 §18 admits
  by name as the seventeenth — leave `src/mesh-worker-execution.mjs` and are re-exported from
  it, so every dependent keeps the import line it already has. The cardinality claim — the
  new module exports exactly seventeen, the sink defines none of them, and each name resolves
  to the SAME REFERENCE through both doors — is FF-5302's, asserted structurally in
  `test/arch/acd-session-driver-single-home.test.mjs`, and is deliberately NOT restated
  here. What is observable from outside is narrower and sharper, and it is what this feature
  decides. First, an ESM named import of a name a module does not export is a LINK-TIME
  error, never a runtime `undefined` — so "importable at this door" is a real observable a
  suite can make and a missing re-export cannot survive. Second, a consumer that binds a
  constant at ONE door and drives a launch built at the OTHER door observes agreement or it
  observes drift: a duplicated-then-drifted definition is exactly the failure the reference
  check catches structurally and a value check would miss on the day it is committed but
  catch on the day it drifts — both are wanted, and this one runs over the real driver.
  Third, three of the seventeen are not merely re-exported outward but consumed INWARD by the
  sink's own remaining handler code, measured again at the reopened contract pass:
  `defaultSpawnRuntime` is
  `createMeshWorkerExecutionHandler`'s `spawnRuntime` default (`mesh-worker-execution.mjs:1097`)
  and `defaultPtySpawn` is `createMeshWorkerTerminalResumeHandler`'s `probeSpawn` fallback
  (`:2118`); that same resume handler defaults its runtime to
  `driveInteractiveClaudeSession` (`:2028`). So the sink carries an
  `import { defaultSpawnRuntime, defaultPtySpawn, driveInteractiveClaudeSession } from
  "./agent-session-driver.mjs";` AS WELL AS the verbatim `export … from` line, because a
  re-export binds no local name and those sites would otherwise be a `ReferenceError`
  (ADR-010 §17a). `defaultPtySpawn` is module-PRIVATE today (`const defaultPtySpawn =
  createTerminalSpawn(loadNodePty);`, `:1373`, no `export` keyword), so this move is also
  the moment it first becomes a name any consumer can reach — the one door that opens rather
  than moves. `ensureWorktreeTrusted` is both the house precedent this whole decision rests on
  (`:1442`, re-exported from `claude-trust.mjs` "so every existing importer is untouched") and
  the SEVENTEENTH member: ADR-010 §18 admits it by name because the driver's own body needs it
  and leaving it only in the sink would make the sink's re-export line the single reason the
  driver's importers still need the sink. It must resolve at both doors.
  Seam: `test/agent-session-driver-door.test.mjs`, registered in `scripts/test.mjs` in this
  story's own labelled milestone-53 story-00 block. It imports both modules by static
  named import (so the link itself is the assertion), and drives the real chain over
  `test/support/mesh-worker-terminal-fixture.mjs`'s `createFakeWhich` / `createFakePtySpawn`
  at the injected `{ptySpawn, which}` seam — no real node-pty, no real `claude`, no network.
  ADR-001 §1 and §2, as measured by RESEARCH §Q1 and §Q8.

  Scenario: all seventeen frozen names are importable by name from the new module
    Given a consumer module that statically imports all seventeen names from `src/agent-session-driver.mjs`
    When that consumer is imported in a fresh process
    Then the module link succeeds
    And every one of the seventeen bindings is defined
    And a name absent from the new module would fail the link, not read `undefined`

  Scenario: all seventeen frozen names are importable by name from the sink, unchanged
    Given a consumer module that statically imports all seventeen names from `src/mesh-worker-execution.mjs`
    When that consumer is imported in a fresh process
    Then the module link succeeds
    And every one of the seventeen bindings is defined
    And the consumer's import line is the one a pre-existing dependent already writes

  Scenario: the nine frozen constants carry the same value at both doors
    Given each of the nine constant members of the frozen seventeen bound at both doors
    When the two bindings are compared by value
    Then they are equal
    And `HUMAN_INPUT_TOOL_NAMES` is compared as a deep equality, being an array

  Scenario: the eight frozen functions are callable at both doors
    Given each of the eight function members of the frozen seventeen bound at both doors
    When each binding's `typeof` is read
    Then it is `function` at both doors
    And `defaultPtySpawn` is among them — a name no consumer could reach before this move

  Scenario: the sentinel a consumer imports from the SINK is the sentinel the DRIVER's launch actually carries
    Given `NEEDS_INPUT_SENTINEL` and `DIRECTIVE_COMPLETE_SENTINEL` imported from `src/mesh-worker-execution.mjs`
    And a session driven through `driveInteractiveClaudeSession` imported from `src/agent-session-driver.mjs`
    When the launch argv recorded by the fake spawn is read
    Then the `--append-system-prompt` payload contains both sentinels as imported from the sink
    And a second, drifted definition of either sentinel in either module would fail this
    And the check is made on the payload the driver actually spawned, never on a re-derived string

  Scenario: the same drive through either door produces the same observables
    Given the terminal fixture with `claude` present on the fake PATH and a scripted clean exit
    And the same `brief` of `{itemRef, worktreeCwd, task, command}` and the same options bag
    When `driveInteractiveClaudeSession` is driven once from the new module's door and once from the sink's
    Then both record exactly one spawn call
    And both spawn calls carry the same `bin` and a deep-equal `args`
    And both PTYs record the same single write
    And both resolve the same `{outcome, sessionId, failureReason}` shape

  Scenario: `INTERACTIVE_COMMAND_READY_DELAY_MS` still reaches its one production consumer through the sink
    Given `src/mesh-launcher.mjs` unedited, importing the constant from `src/mesh-worker-execution.mjs` at `:62`
    When the constant is read at that door
    Then it is `5000`
    And it is the value the launcher wires as `commandDelayMs` at its two driver call sites
    And the launcher's import line is byte-unchanged by this story

  Scenario: the sink's own remaining handler code still reaches the three names it consumes inward
    Given the fake `{ptySpawn, which}` seam
    And both sink handlers are constructed without overriding their runtime or probe spawn
    When `createMeshWorkerExecutionHandler` is constructed with no `spawnRuntime` override
    Then its default runtime drives the interactive path through the injected seam exactly once
    And the handler never needed to be told where `defaultSpawnRuntime` now lives
    And the resume handler reaches both `defaultPtySpawn` and `driveInteractiveClaudeSession` through its inward import

  Scenario: `ensureWorktreeTrusted` is the SEVENTEENTH name and resolves at both doors
    Given `src/mesh-worker-execution.mjs` and `src/agent-session-driver.mjs`
    When `ensureWorktreeTrusted` is imported from each
    Then the binding is a function at both doors and is the same reference at both
    And it is a member of the frozen set the cardinality check counts, not an exception to it (ADR-010 §18)
    And `src/mesh-launcher.mjs`'s existing named import of it from the sink is unaffected

  Scenario: a door does not invent names — a name neither module owns is absent at both
    Given a namespace import of each module
    When a name that is not one of the frozen seventeen and not a pre-existing export is read
    Then it is `undefined` at both doors
    And the probe is non-vacuous: a name that IS one of the seventeen reads defined at both doors in the same check

  Scenario: the doors are checked in a fresh process, never against a warm module cache
    Given the door suite
    When it runs
    Then each module is resolved by its own static import in this run
    And no assertion rests on a binding captured before the move

  # THE FROZEN SEVENTEEN — ADR-001 §1 plus `ensureWorktreeTrusted` (ADR-010 §18), with the three
  # the SINK still consumes inward marked. `kind` is what a consumer's `typeof` reads;
  # `value / shape` is what the constant rows are compared on.
  Examples:
    | frozen name                        | kind     | value / shape                                          | sink still consumes it inward |
    | NEEDS_INPUT_SENTINEL               | string   | "NEEDS_INPUT"                                          | no                            |
    | NEEDS_INPUT_INSTRUCTION            | string   | embeds ${NEEDS_INPUT_SENTINEL}                         | no                            |
    | DIRECTIVE_COMPLETE_SENTINEL        | string   | "AOF_DIRECTIVE_COMPLETE"                               | no                            |
    | DIRECTIVE_COMPLETE_INSTRUCTION     | string   | embeds ${DIRECTIVE_COMPLETE_SENTINEL}                  | no                            |
    | WORKER_SESSION_INSTRUCTION         | string   | the two instructions concatenated, in that order       | no                            |
    | COMPLETION_IDLE_MS                 | number   | 900000 — 15 min                                        | no                            |
    | DECLARED_COMPLETION_IDLE_MS        | number   | 10000 — 10 s                                           | no                            |
    | HUMAN_INPUT_TOOL_NAMES             | array    | ["AskUserQuestion"] — deep-equal                       | no                            |
    | INTERACTIVE_COMMAND_READY_DELAY_MS | number   | 5000                                                   | no                            |
    | defaultWatchTranscriptSessionId    | function | async ({cwd,env,signal,maxWaitMs}) => string \| null   | no                            |
    | defaultWatchTranscriptCompletion   | function | async ({cwd,env,sessionId,signal,…}) => outcome \| null | no                           |
    | defaultPtySpawn                    | function | createTerminalSpawn(loadNodePty)'s spawn               | YES — resume handler probeSpawn |
    | resolveInteractiveDriverLaunch     | function | (driver, options) => {bin,args,env,providerId} \| null | no                            |
    | driveInteractiveClaudeSession      | function | async (brief, options) => {outcome, sessionId, …}      | YES — resume handler runtime default |
    | buildDriverCommand                 | function | (driver, brief) => {bin,args} \| null                  | no                            |
    | defaultSpawnRuntime                | function | (brief, options) => Promise<{outcome, …}>              | YES — handler spawnRuntime default |
    | ensureWorktreeTrusted              | function | re-exported from claude-trust.mjs — the seventeenth     | no                            |

  # THE DIRECTIONS THAT MUST BOTH WORK. Every row is a real consumer shape; `new module` and
  # `sink` are the two doors, and no row is allowed to be satisfied by only one of them.
  Examples:
    | consumer shape                                                  | door       | must    |
    | a pre-existing mesh test's `import { … } from "…/mesh-worker-execution.mjs"` | sink       | resolve |
    | `src/mesh-launcher.mjs:62`'s fourteen-name import                | sink       | resolve |
    | a local-loop caller importing `driveInteractiveClaudeSession`    | new module | resolve |
    | a local-loop caller importing `defaultSpawnRuntime`              | new module | resolve |
    | a local-loop caller importing `NEEDS_INPUT_SENTINEL`             | new module | resolve |
    | a local-loop caller importing `defaultPtySpawn`                  | new module | resolve — newly reachable |
    | the sink's own `createMeshWorkerExecutionHandler` spawnRuntime default | inward | resolve `defaultSpawnRuntime` |
    | the sink's own `createMeshWorkerTerminalResumeHandler` probeSpawn fallback | inward | resolve `defaultPtySpawn` |
    | the sink's own `createMeshWorkerTerminalResumeHandler` runtime default | inward | resolve `driveInteractiveClaudeSession` |
    | `ensureWorktreeTrusted`                                          | sink       | resolve — the precedent |
