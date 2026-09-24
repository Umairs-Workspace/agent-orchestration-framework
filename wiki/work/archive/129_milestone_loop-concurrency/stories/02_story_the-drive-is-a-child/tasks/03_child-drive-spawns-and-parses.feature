@executable @cli @work @work-stream
Feature: src/loop/child-drive.mjs spawns the drive shell-lessly and reads exactly one document

  ADR-005 §1 and ADR-008 §1-§2. `spawnLaneDrive({ ref, phase, runId, lane, fixFile, env, deadlineMs,
  signal, graceMs, spawnChild })` in `src/loop/child-drive.mjs` is the ONLY place the loop family
  spawns a drive (FF-12902). It runs `process.execPath` with the argument vector
  `[<this tree's src/cli.mjs>, "work", "drive", <phase>, <ref>, "--run", <runId>, ("--fix",
  <fixFile>)?, "--json"]` — the entry resolved from the module's own `import.meta.url` (so the
  payload install and the repo tree each spawn their own CLI), `cwd` = the lane, env inherited with
  the caller's additions, `stdin: "pipe"` — through `runBounded`, never a shell. It reads EXACTLY ONE
  JSON document from stdout (the face's `--json` contract: one structured document, success or
  failure) and answers `{ outcome, document, exitCode, stderrTail, spawn }`:

    · `exited` with a parseable document whose `ok` is not `false` → `outcome: "document"` and the
      drive's own result as `document` (its `outcome`, `sessionId`, `failureReason`,
      `settlementContext`);
    · `exited` with a coded refusal document (`ok: false`) → `outcome: "refused"`, `document` the
      refusal (`code`, `error`);
    · `exited` with NO document — the PARSE decides, never the exit code alone: an empty stdout, a
      truncated or malformed document, trailing bytes after the document, or a parseable value
      that is not an object (`[]`, `"x"`, `null`, `42`) — or `not-started` → `outcome: "died"`,
      `document: null`, the last 20 lines of stderr as `stderrTail` (an ARRAY, `[]` when empty);
    · `deadline-expired` → `outcome: "timeout"`; `aborted` → `outcome: "aborted"` — each carrying
      whatever document DID parse from the stdout captured before the kill (`null` when none), so a
      child that printed its document and then hung on a lingering handle still hands the parent
      its session id.

  The whole of `stdout.trim()` is parsed as one document (the face pretty-prints it, so it spans
  lines); nothing is extracted from a longer stream. A call missing `ref`, `phase`, `runId` or
  `lane` throws a `TypeError` naming the key — a caller error, never a `died`.

  The CALLER (story 04) maps `died` to `failed / runtime_offline`, `timeout` to `failed / timeout`
  and `aborted` to `cancelled`; this module mints no failure reason and touches no run record.
  `spawnChild` is injectable for the suites, mirroring `runBounded`'s own seam.

  `src/loop/` IS BORN HERE as a declared EXEMPTION in `test/arch/testing/acd-source-directory-budget.test.mjs`
  (ADR-008 §2): three members by the milestone's end, under `FLAT_LAYER_THRESHOLD`, with a `why`
  naming the row it will owe at the ninth file or with the `loop-*` root-leaf move.

  Background:
    Given `spawnLaneDrive` from `src/loop/child-drive.mjs`
    And an injected `spawnChild` double that records the command, args, cwd, env and stdio it was given and plays a scripted stdout/stderr/exit
    And `DOC` names `{ ref: "127/02", phase: "continue", command: "/aof:continue 127/02", outcome: "done", sessionId: "s1", settlementContext: { projectsDir: "C:/p", transcriptBaseline: null, spendBaselineAvailable: true } }`
    And `REFUSAL` names `{ ok: false, code: "ref-not-found", error: "No item resolves to ref \"127/02\"." }`

  Scenario Outline: the argument vector is the CLI entry and the drive verb, no shell
    When `spawnLaneDrive` is called with `ref` `"127/02"`, `phase` <phase>, `runId` `"r1"`, `lane` `C:/lanes/dispatch-127-02` and `fixFile` <fixFile>
    Then the double received `command` equal to `process.execPath` and `args` equal to `[ENTRY, "work", "drive", <phase>, "127/02", "--run", "r1"<tail>, "--json"]`
    And `ENTRY` is `fileURLToPath(new URL("../cli.mjs", import.meta.url))` as resolved from the module itself, and exists on disk
    And `cwd` equals `C:/lanes/dispatch-127-02`, `stdio` is `["pipe", "pipe", "pipe"]`, and the option key set holds no `shell`

    Examples:
      | phase      | fixFile                                   | tail                                                   |
      | "continue" | absent                                    | ``                                                     |
      | "refine"   | absent                                    | ``                                                     |
      | "verify"   | absent                                    | ``                                                     |
      | "continue" | `"C:/home/.aof/mesh/loop-fixes/r1.json"`  | `, "--fix", "C:/home/.aof/mesh/loop-fixes/r1.json"`    |

  Scenario Outline: the child's env is the parent's, plus the caller's additions
    When `spawnLaneDrive` is called with `env` <env>
    Then the double received `env` deep-equal to <received>

    Examples:
      | env                                 | received                                                 |
      | absent                              | `process.env`                                            |
      | `{ AOF_X: "1" }`                    | `{ ...process.env, AOF_X: "1" }`                         |
      | `{ AOF_GLOBAL_HOME: "C:/other" }`   | `process.env` with `AOF_GLOBAL_HOME` `"C:/other"`         |

  Scenario Outline: the child's exit is classified from its one document, never from its exit code alone
    Given the double plays stdout <stdout>, stderr <stderr> and exits <exit>
    When `spawnLaneDrive` runs
    Then the answer's key set is exactly `outcome`, `document`, `exitCode`, `stderrTail`, `spawn`
    And its `outcome` is <outcome>, its `document` is <document>, its `exitCode` is <exit> and `spawn.outcome` is `"exited"`

    Examples:
      | stdout                                                        | stderr              | exit | outcome    | document      |
      | `JSON.stringify(DOC, null, 2)` plus a trailing newline         | ``                  | 0    | "document" | deep-equals `DOC`     |
      | `JSON.stringify(DOC)`                                         | ``                  | 1    | "document" | deep-equals `DOC`     |
      | `JSON.stringify(DOC, null, 2)` written as two chunks split mid-key | ``              | 0    | "document" | deep-equals `DOC`     |
      | `JSON.stringify(REFUSAL, null, 2)`                            | ``                  | 1    | "refused"  | deep-equals `REFUSAL` |
      | `JSON.stringify(REFUSAL)`                                     | ``                  | 0    | "refused"  | deep-equals `REFUSAL` |
      | ``                                                            | `boom` and `stack`  | 1    | "died"     | null                  |
      | ``                                                            | ``                  | 0    | "died"     | null                  |
      | `not json`                                                    | ``                  | 0    | "died"     | null                  |
      | `{"ref":"127/02","outcome":`                                  | ``                  | 1    | "died"     | null                  |
      | ``                                                            | `killed`            | null | "died"     | null                  |

  Scenario: a child that cannot be started is died with the attempt named
    Given the double throws `EACCES` from `spawnChild`
    When `spawnLaneDrive` runs
    Then the answer's `outcome` is `"died"`, `document` null, `exitCode` null and `stderrTail` `[]`
    And `spawn.outcome` is `"not-started"` and `spawn.error` names `process.execPath` and `"work drive"`

  Scenario Outline: stderrTail is the last twenty lines, on every outcome
    Given the double writes <lines> to stderr, plays stdout <stdout> and exits <exit>
    When `spawnLaneDrive` runs
    Then the answer's `outcome` is <outcome> and `stderrTail` is <tail>

    Examples:
      | lines                              | stdout                | exit | outcome    | tail                                |
      | nothing                            | ``                    | 1    | "died"     | `[]`                                |
      | 3 lines                            | ``                    | 1    | "died"     | those 3, in order                   |
      | 20 lines                           | ``                    | 1    | "died"     | all 20, in order                    |
      | 40 lines                           | ``                    | 1    | "died"     | lines 21–40, in order               |
      | 40 lines ending in a newline       | ``                    | 1    | "died"     | lines 21–40, no empty trailing line |
      | 3 lines                            | `JSON.stringify(DOC)` | 0    | "document" | those 3, in order                   |

  Scenario Outline: a deadline and an abort are their own outcomes, and the deadline is named
    Given the double never exits
    When `spawnLaneDrive` runs with <options>
    Then the answer's `outcome` is <outcome>, `document` null, and `spawn.outcome` is <spawnOutcome>
    And <observed>

    Examples:
      | options                                                   | outcome     | spawnOutcome         | observed                                                  |
      | `deadlineMs` 30                                           | "timeout"   | `"deadline-expired"` | `spawn.deadlineMs` is 30                                  |
      | no `deadlineMs`, a `signal` aborting after 10ms, `graceMs` 5 | "aborted" | `"aborted"`         | the double's stdin was ended before its `kill()`          |
      | no `deadlineMs`, no `signal`, the child exits 0 with `JSON.stringify(DOC)` | "document" | `"exited"` | `spawn.deadlineMs` is `DEFAULT_DEADLINE_MS`     |

  Scenario: the module touches no run record and mints no reason
    Given a fixture story whose `runs/` listing is recorded
    When `spawnLaneDrive` runs to each of `document`, `refused`, `died`, `timeout` and `aborted` against it
    Then the `runs/` listing is unchanged after every answer
    And no answer, and no answer's `document` of the `died`, `timeout` or `aborted` kind, carries a `failureReason` key

  Scenario: src/loop is a declared exemption
    When `test/arch/testing/acd-source-directory-budget.test.mjs` runs under an isolated global home
    Then `src/loop` appears in `SOURCE_DIRECTORY_EXEMPTIONS` with a `why` naming the ninth file or the `loop-*` root-leaf move
    And the gate is green with `src/loop/` holding its members

  Scenario Outline: a parseable non-object or trailing bytes are not a document
    Given the double plays stdout <stdout> and exits 0
    When `spawnLaneDrive` runs
    Then the answer's `outcome` is `"died"` and its `document` is null

    Examples:
      | stdout                              |
      | `[]`                                |
      | `"x"`                               |
      | `null`                              |
      | `42`                                |
      | `JSON.stringify(DOC)` then `stray`  |

  Scenario: a document printed before a timeout still reaches the parent
    Given the double plays stdout `JSON.stringify(DOC)` and never exits
    When `spawnLaneDrive` runs with `deadlineMs` 30
    Then the answer's `outcome` is `"timeout"` and its `document` deep-equals `DOC`

  Scenario Outline: a missing required argument is a caller error
    When `spawnLaneDrive` is called without <key>
    Then it throws a `TypeError` whose message names <key>
    And the spawn double was never called

    Examples:
      | key     |
      | `ref`   |
      | `phase` |
      | `runId` |
      | `lane`  |
