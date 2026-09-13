@executable @cli @work @work-stream
Feature: aof work drive takes a lent run and a fix file across the process boundary

  ADR-005 §2. A loop drive has always LENT its run id to `work:drive-<phase>` through
  `ctx.loopDrive.runId` (`src/commands/drive.mjs`: `managedRunId`, `ownsRun = false` — the child
  never mints or settles). A child process has no `ctx`, so the lend crosses the boundary as
  `--run <id>`: `managedRunId` is read from `input.run` BEFORE `ctx.loopDrive`, and under it the
  command mints nothing, settles nothing, heartbeats the lent id (`heartbeat.runId`, `AOF_RUN_ID`),
  and returns the `settlementContext` it hands `ctx.loopDrive.recordSettlementContext` today —
  `{ projectsDir, transcriptBaseline, spendBaselineAvailable }` — as a key of its result, so the
  PARENT can settle spend against it. `--fix <file>` names a JSON file holding the fix transport
  in `fixTransport`'s exact shape (`LOOP_FIX_TRANSPORT_KEYS`, `src/commands/loop.mjs`); the child
  reads it where it reads `ctx.loopDrive.fix` today, and the `continue` phase alone honours it —
  refine and verify ignore a `--fix` exactly as they ignore `ctx.loopDrive.fix`. Both join the
  closed input schema (`run`, `fix`: strings), the CLI flag spec and the argv mapper; the
  registry-derived bijection and route coverage learn them from the spec.

  A BARE DRIVE IS BYTE-IDENTICAL: no `--run`, no `ctx.loopDrive` → it mints, settles and heartbeats
  its own run as today, and `--dry-run` still reports the directive and starts nothing. A `--run`
  that names no readable record is NOT a refusal: the id is lent, the record is the parent's, and
  the child's only obligation to it is the heartbeat and the session id capture (both keyed by id).
  The result's key set gains `settlementContext` on every real drive, lent or owned.

  RULINGS (Three Amigos, 2026-09-13): `--fix` is honoured with an OWNED run too — the fix is read
  independently of who owns the run, exactly as `ctx.loopDrive.fix` is today; when both `--fix` and
  `ctx.loopDrive.fix` are present the FLAG wins (the explicit door, as `--run` wins over
  `ctx.loopDrive.runId`); `run: ""` is absent (the `length > 0` guard `managedRunId` already has);
  and EVERY way a fix file fails to yield a JSON object — missing, a directory, malformed, a
  non-object, empty — is the ONE code `drive-fix-unreadable`, refused before any spawn.

  Background:
    Given a fixture workspace with story `03/01` and a fake session driver injected through `ctx.agentSessionDriverOptions`
    And the driver answers `{ outcome: "done", sessionId: "sess-1" }`
    And `F` names a JSON file holding `fixTransport({ buildRun: { runId: "b1", sessionId: "s-b1" }, findings: [<two findings>] })`, and `T` is that same object in memory
    And `COLD` names `{ projectsDir: claudeProjectsDir({ cwd: <workspace root>, env: <driver env> }), transcriptBaseline: null, spendBaselineAvailable: true }`

  Scenario: a lent run is neither minted nor settled by the child
    When `work:drive-continue` runs with `{ ref: "03/01", run: "20260912T000000000Z-0000" }`
    Then the story's `runs/` holds no record
    And the PTY launch env carries `AOF_RUN_ID` `"20260912T000000000Z-0000"` and `AOF_RUN_ITEM_DIR` the story's dir
    And the result's key set is exactly `ref`, `phase`, `command`, `outcome`, `sessionId`, `settlementContext`
    And `settlementContext` deep-equals `COLD`

  Scenario: a lent id that names the parent's record is captured on it, never settled
    Given a record minted `running` under the story's `runs/` through `transitionRunStart`, with id `P`
    When `work:drive-continue` runs with `{ ref: "03/01", run: P }`
    Then `runs/` still holds exactly that one record
    And its `sessionId` is `"sess-1"` and its `state` is `"running"`

  Scenario: the lent id wins over ctx.loopDrive
    Given `ctx.loopDrive.runId` is `"ctx-run"` beside a `recordSettlementContext` recorder
    When `work:drive-continue` runs with `{ ref: "03/01", run: "flag-run" }`
    Then the PTY launch env carries `AOF_RUN_ID` `"flag-run"`
    And the recorder received the same `settlementContext` value the result carries

  Scenario Outline: the phase, the run's owner and the fix compose independently
    Given `ctx.loopDrive` is <loopDrive>
    When `work:drive-<phase>` runs with `{ ref: "03/01"<input> }`
    Then the driver's brief `task` is <task> and its `command` starts with `/aof:<phase> 03/01`
    And the story's `runs/` holds <records>
    And the PTY launch env's `AOF_RUN_ID` is <runId>

    Examples:
      | phase    | input                   | loopDrive                       | task       | records             | runId         |
      | continue | ``                      | absent                          | "continue" | one, settled `done` | the minted id |
      | continue | `, run: "r1"`           | absent                          | "continue" | none                | "r1"          |
      | continue | `, run: "r1", fix: F`   | absent                          | "fix"      | none                | "r1"          |
      | continue | `, fix: F`              | absent                          | "fix"      | one, settled `done` | the minted id |
      | continue | ``                      | `{ runId: "ctx-run", fix: T }`  | "fix"      | none                | "ctx-run"     |
      | continue | `, run: "flag-run"`     | `{ runId: "ctx-run", fix: T }`  | "fix"      | none                | "flag-run"    |
      | continue | `, run: ""`             | absent                          | "continue" | one, settled `done` | the minted id |
      | refine   | `, run: "r1", fix: F`   | absent                          | "refine"   | none                | "r1"          |
      | verify   | `, run: "r1", fix: F`   | absent                          | "verify"   | none                | "r1"          |
      | refine   | ``                      | `{ runId: "ctx-run", fix: T }`  | "refine"   | none                | "ctx-run"     |
      | verify   | `, run: "r1"`           | absent                          | "verify"   | none                | "r1"          |

  Scenario: a fix file is read as the fix transport for continue
    When `work:drive-continue` runs with `{ ref: "03/01", run: "r1", fix: F }`
    Then the driver's brief `task` is `"fix"`
    And the brief `command` equals `composeFixInput("/aof:continue 03/01", { findings: F.findings, changeUnderReview: F.changeUnderReview })`
    And the two findings appear under `## REVIEW FINDINGS` in the file's order

  Scenario Outline: the fix file is the transport or an unreadable refusal, and a refusal precedes the spawn
    When `work:drive-continue` runs with `{ ref: "03/01", run: "r1", fix: <file> }`
    Then the outcome is <outcome>
    And the driver was launched <launched>

    Examples:
      | file                                                 | outcome                                                                          | launched |
      | a path that does not exist                           | a refusal with code `drive-fix-unreadable`                                       | never    |
      | a directory                                          | a refusal with code `drive-fix-unreadable`                                       | never    |
      | a file holding `not json`                            | a refusal with code `drive-fix-unreadable`                                       | never    |
      | a file holding `[]`                                  | a refusal with code `drive-fix-unreadable`                                       | never    |
      | an empty file                                        | a refusal with code `drive-fix-unreadable`                                       | never    |
      | the transport with `buildRun: null`                  | a launch whose brief `task` is `"continue"`                                      | once     |
      | the transport plus an undeclared key `gradeRecord`   | a launch whose brief `task` is `"fix"` and whose `command` holds no byte of `gradeRecord` | once |

  Scenario Outline: settlementContext reports the baseline the launch actually took
    Given `F2` names a fix file whose `resumeBuildRun` is <resume>, the transcript dir holds <transcripts>, and the driver's `resumeSessionAvailable` is <seam>
    When `work:drive-continue` runs with `{ ref: "03/01", run: "r1", fix: F2 }`
    Then the PTY spawn args <launch>
    And `settlementContext.transcriptBaseline` is <baseline> and `spendBaselineAvailable` is <available>

    Examples:
      | resume                                | transcripts   | seam            | launch                     | baseline                        | available |
      | null                                  | none          | absent          | carry no `--resume`        | null                            | true      |
      | `{ runId: "b1", sessionId: "s-b1" }`  | `s-b1.jsonl`  | absent          | carry `--resume`, `s-b1`   | a snapshot holding `s-b1.jsonl` | true      |
      | `{ runId: "b1", sessionId: "s-b1" }`  | none          | absent          | carry no `--resume`        | null                            | true      |
      | `{ runId: "b1", sessionId: "s-b1" }`  | none          | answering true  | carry `--resume`, `s-b1`   | `{}`                            | false     |

  Scenario Outline: the CLI face carries both flags into the input
    When `parseSpecArgv` parses <argv> against `work:drive-<phase>`'s spec and the argv mapper maps the result
    Then the outcome is <input>

    Examples:
      | phase    | argv                                     | input                                                  |
      | continue | `03/01 --run r1`                         | `{ ref: "03/01", run: "r1" }`                          |
      | continue | `03/01 --run r1 --fix C:/tmp/fix.json`   | `{ ref: "03/01", run: "r1", fix: "C:/tmp/fix.json" }`  |
      | continue | `03/01 --run=r1 --fix=C:/tmp/fix.json`   | `{ ref: "03/01", run: "r1", fix: "C:/tmp/fix.json" }`  |
      | continue | `03/01 --dry-run`                        | `{ ref: "03/01", dryRun: true }`                       |
      | continue | `03/01 --run r1 --dry-run`               | `{ ref: "03/01", run: "r1", dryRun: true }`            |
      | continue | `03/01`                                  | `{ ref: "03/01" }`                                     |
      | refine   | `03/01 --run r1`                         | `{ ref: "03/01", run: "r1" }`                          |
      | verify   | `03/01 --run r1 --fix C:/tmp/fix.json`   | `{ ref: "03/01", run: "r1", fix: "C:/tmp/fix.json" }`  |
      | continue | `03/01 --run`                            | a refusal with code `missing-flag-value`               |
      | continue | `03/01 --fix`                            | a refusal with code `missing-flag-value`               |

  Scenario: the closed input schema and the flag spec declare both flags on all three phases
    When each of `work:drive-refine`, `work:drive-continue` and `work:drive-verify` is read from the registry
    Then its input schema's `properties` keys are exactly `ref`, `dryRun`, `run`, `fix`, with `run` and `fix` `type: "string"` and `additionalProperties: false`
    And its `cli.spec.flags` declares `run` and `fix` as `type: "string"` and its `usage` contains `--run <id>` and `--fix <file>`

  Scenario: a bare drive is byte-identical to today
    When `work:drive-continue` runs with `{ ref: "03/01" }`
    Then exactly one run record is minted under the story's `runs/`, with `state` `"done"`, `outcome` `"done"` and `sessionId` `"sess-1"`
    And the result deep-equals `{ ref: "03/01", phase: "continue", command: "/aof:continue 03/01", outcome: "done", sessionId: "sess-1", settlementContext: COLD }`

  Scenario Outline: --dry-run reports the directive and starts nothing, lent or not
    When `work:drive-continue` runs with `{ ref: "03/01", dryRun: true<extra> }`
    Then the result deep-equals `{ ref: "03/01", phase: "continue", command: "/aof:continue 03/01" }`
    And the driver was never launched and `runs/` holds no record

    Examples:
      | extra                                       |
      | ``                                          |
      | `, run: "r1"`                               |
      | `, run: "r1", fix: "C:/nowhere/fix.json"`   |

  Scenario: the flag wins over ctx.loopDrive.fix
    Given `ctx.loopDrive.fix` carries a transport whose findings name `ctx-finding` and a `--fix` file whose findings name `flag-finding`
    When `work:drive-continue` runs with `{ ref: "03/01", run: "r1", fix: <that file> }`
    Then the driver's brief `command` contains `flag-finding` and not `ctx-finding`
