@executable @cli @work @work-stream
Feature: `aof work drive <phase> <ref>` — one session, one prompt, one outcome, and no where-decision

  The executor half of ADR-002's boundary table. `aof work drive refine|continue|verify <ref>`
  spawns EXACTLY ONE session running `/aof:<phase> <ref>` through 53/00's
  `driveInteractiveClaudeSession`, watches it to `{outcome: done|failed|needs-input}`, captures
  the session id and returns it. It answers "RUN IT HERE", never "where should this run": no
  `--node` flag, no assignment, no local/remote branch, and no `where` key in its document
  (ADR-002 §2). The shipped `work:refine|continue|verify` doors answer the other question and
  are NOT edited (ADR-002 §3) — their `{where, command}` contract is re-asserted here as
  BEHAVIOUR, from the outside, because a door that started spawning is exactly the defect
  `continue.mjs:3-8` records.

  A driver mints NO run record. The run ledger is the loop's (ADR-004 §2: `brief.loop` rides the
  runs `work:loop` mints), and the store's dedup guard refuses a second non-terminal run per item
  (`src/run-store.mjs:405-408`, `duplicate-run`) — so a driver that minted its own run would
  collide with its caller's on the very first composed phase. A bare hand-driven phase is
  therefore exactly as ledger-free as today's local `work:continue` answer, and that is
  deliberate.

  THE SEAM, named because without it none of this is mechanisable (TECH_DEBT item 48). Every
  scenario below drives the registered command in-process over a temp-`AOF_GLOBAL_HOME` fixture
  work stream, with the driver's own `{ptySpawn, which}` pair injected from
  `test/support/mesh-worker-terminal-fixture.mjs` — `createFakePtySpawn` records every
  `{bin, args, options}` and hands back a scripted `IPty` whose `onWrite` fires synchronously
  inside `term.write`, and `createFakeWhich` decides whether the provider binary resolves. The
  fake occupies the SAME seam the mesh worker's own tests occupy (RESEARCH §Q8); nothing here
  needs a real `claude`, a real PTY, a worktree, a git repo or a mesh. The command reads that
  injection point from the DECLARED ctx key `ctx.agentSessionDriverOptions` and passes it verbatim
  into `driveInteractiveClaudeSession` — one name, carried by every driver and by `work:loop`,
  following `ctx.globalWorkStoreOptions` exactly (ADR-010 §2). Without it these scenarios cannot be
  re-run, which is the failure item 48 names.

  `--dry-run` is the driver's report-only form, and it is an ADR-RULED addition to ADR-002 §1's
  command shape rather than this contract's own invention: ADR-010 §3 declares it a boolean flag on
  all three drivers. It resolves the ref, reports `{ref, phase, command}` — the exact command line
  it WOULD type — spawns nothing and exits 0. The reason is measured: the bijection gate spawns a
  real subprocess into which no fake seam can reach
  (`acd-work-command-cli-bijection.test.mjs:256-263`), so without the flag that probe would start a
  real interactive agent against a temp fixture on any machine where `claude` resolves — the
  `work upgrade --dry-run` precedent at `:236`, for the same reason, and it keeps the gate's
  accepted-exit list at `[0]` unwidened.
  Mechanised as `test/drive-command-phase-drivers.test.mjs`, imported AND spread in
  `scripts/test.mjs` inside this story's own labelled `// milestone 53 / story 02` block, so the
  evidence lands with the contract rather than after it (ADR-011 §1, TECH_DEBT item 48).
  ADR-002 §1–§3, ADR-001 §1, ADR-004 §2, ADR-010 §2 and §3, RESEARCH §Q2 and §Q8.

  Scenario: one ready story, one spawned session, one typed command line
    Given a fixture work stream whose story `03/01` is `in-progress` with authored tasks
    And the injected `{ptySpawn, which}` pair, with `claude` resolving
    And a scripted session that emits its completion sentinel after the command is typed
    When I drive `work:drive-continue` with ref `03/01`
    Then exactly 1 spawn call is recorded at the injected seam
    And the session was typed exactly one command line, `/aof:continue 03/01`
    And the spawn's `cwd` option is the fixture workspace's own root — a local drive has no worktree
    And the result carries `outcome: "done"` and the session id the transcript watch captured
    And no second session is spawned for the same act

  Scenario: each phase types its own prompt and nothing else
    Given the fixture stream and the injected seam
    When I drive each of `work:drive-refine`, `work:drive-continue` and `work:drive-verify` with ref `03/01`
    Then each records exactly 1 spawn call
    And each types exactly the command line named in the table below
    And no phase types another phase's prompt
    And no drive types `/aof:autonomous` — the milestone cascade is the DOOR's resolution, never a driver's

  Scenario: the session id is captured and returned, mid-run
    Given a scripted session whose transcript watch resolves a session id before the session settles
    When I drive `work:drive-continue` with ref `03/01`
    Then the returned document carries that session id verbatim
    And the id is reported even when the outcome is `needs-input` — the id is what an operator re-attaches with

  Scenario: the three terminal outcomes are surfaced verbatim, never re-judged
    Given the fixture stream and the injected seam
    When the scripted session settles `done`, then `failed`, then `needs-input` on three separate drives
    Then each drive's document reports that outcome unchanged
    And a `failed` outcome carries the driver's own `failureReason`
    And the driver never re-classifies a failure as retryable or not — that is the run store's (ADR-004)
    And a `failed` outcome is REPORTED, not thrown: one document, no stack trace

  Scenario: an unresolvable provider binary is a coded failed outcome, never a crash
    Given the injected `which` resolves no binary at all
    When I drive `work:drive-continue` with ref `03/01`
    Then no spawn call is recorded
    And the document reports `outcome: "failed"` with failure reason `agent_error`
    And the command does not throw — the driver's never-throw contract is preserved through the command

  Scenario: the driver makes no where-decision
    Given the fixture stream and the injected seam
    When I run `aof work drive continue 03/01 --node aof-wsl --json`
    Then exactly one JSON document is printed and it is the error envelope with code `unknown-flag`
    And no session is spawned
    When I drive `work:drive-continue` with ref `03/01` and the session settles `done`
    Then the document carries no `where`, no `node`, no `assignmentId` and no `scopeRef` key
    And nothing is dispatched to any node

  Scenario: a driver mints no run record — the ledger is the loop's
    Given the fixture stream, the injected seam, and `03/01` carrying no runs
    When I drive `work:drive-continue` with ref `03/01` and the session settles `done`
    And I run `aof work run-status 03/01 --json`
    Then the run history is unchanged — no run was minted, started, completed or reclaimed
    And no `duplicate-run` refusal was raised, because nothing was minted to collide

  Scenario: an unresolvable ref refuses before anything is spawned
    Given the fixture stream and the injected seam
    When I run `aof work drive continue 99/99 --json`
    Then exactly one JSON document is printed carrying `ok: false` and the code `ref-not-found`
    And zero spawn calls are recorded
    And the process exits non-zero

  Scenario: a missing ref refuses before anything is spawned
    Given the fixture stream and the injected seam
    When I run `aof work drive continue --json`
    Then exactly one JSON document is printed carrying `ok: false`
    And zero spawn calls are recorded
    And the message names the usage form `aof work drive <phase> <ref>`

  Scenario: `--dry-run` reports the command line it would type and spawns nothing
    Given the fixture stream and the injected seam
    When I run `aof work drive continue 03/01 --dry-run --json`
    Then exactly one JSON document is printed and it parses
    And it names the ref `03/01`, the phase `continue` and the command `/aof:continue 03/01`
    And zero spawn calls are recorded
    And the run history of `03/01` is unchanged
    And the process exits 0
    When I run `aof work drive continue 03/01 --dry-run`
    Then the human render states the same three facts and prints no raw JSON

  Scenario: the shipped doors keep their contract and still spawn nothing
    Given the fixture stream and the injected seam
    When I run `aof work continue 03/01 --json`
    Then the document carries `where: "local"` and `command: "/aof:continue 03/01"`
    And zero spawn calls are recorded at the injected seam
    When I run `aof work refine 03/01 --json` and `aof work verify 03/01 --json`
    Then each carries `where: "local"` with its own `/aof:<phase> 03/01` command
    And zero spawn calls are recorded for either
    When I run `aof work continue 03 --json`
    Then the milestone door still resolves the `autonomous` directive — `command: "/aof:autonomous 03"`
    And zero spawn calls are recorded

  Scenario: the two families are different commands, reachable at once
    Given the fixture stream and the injected seam
    When I run `aof work continue 03/01 --json` and then `aof work drive continue 03/01 --json`
    Then the first prints a `{where, command}` document and spawns nothing
    And the second spawns exactly one session and prints an `{outcome, sessionId}` document
    And neither answer is the other's

  Examples: the family — one factory, three registered commands (ADR-002 §1)
    | command id          | route words          | argv form                        | types into the session   |
    | work:drive-refine   | work drive refine    | aof work drive refine 03/01      | /aof:refine 03/01        |
    | work:drive-continue | work drive continue  | aof work drive continue 03/01    | /aof:continue 03/01      |
    | work:drive-verify   | work drive verify    | aof work drive verify 03/01      | /aof:verify 03/01        |

  Examples: the outcome matrix — what the scripted session does, and what the document says
    | scripted session behaviour                        | outcome     | failureReason | sessionId | spawn calls |
    | emits the directive-complete sentinel             | done        | (absent)      | captured  | 1           |
    | exits non-zero with no sentinel                   | failed      | present       | captured  | 1           |
    | emits the NEEDS_INPUT sentinel                    | needs-input | (absent)      | captured  | 1           |
    | pauses on a human-input tool and idles            | needs-input | (absent)      | captured  | 1           |
    | never spawns — `which` resolves no binary         | failed      | agent_error   | null      | 0           |
    | spawn itself throws                               | failed      | agent_error   | null      | 1 attempted |

  Examples: the decider / executor boundary, observed from outside (ADR-002 §2)
    | argv                              | answers                    | spawns | mints a run | mints an assignment | document keys include |
    | aof work continue 03/01           | WHERE                      | no     | no          | only when remote    | where, command        |
    | aof work refine 03/01             | WHERE                      | no     | no          | only when remote    | where, command        |
    | aof work verify 03/01             | WHERE                      | no     | no          | only when remote    | where, command        |
    | aof work drive continue 03/01     | RUN IT HERE                | yes    | no          | never               | outcome, sessionId    |
    | aof work drive refine 03/01       | RUN IT HERE                | yes    | no          | never               | outcome, sessionId    |
    | aof work drive verify 03/01       | RUN IT HERE                | yes    | no          | never               | outcome, sessionId    |
    | aof work drive continue 03/01 --dry-run | what it WOULD run    | no     | no          | never               | ref, phase, command   |

  Examples: refusals, all of them before the spawn
    | argv                                          | code            | spawn calls | exit     |
    | aof work drive continue 99/99 --json          | ref-not-found   | 0           | non-zero |
    | aof work drive continue --json                | (missing ref)   | 0           | non-zero |
    | aof work drive continue 03/01 --node x --json | unknown-flag    | 0           | non-zero |
    | aof work drive frobnicate 03/01 --json        | (no such route) | 0           | non-zero |
