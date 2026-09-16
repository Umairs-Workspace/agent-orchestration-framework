@executable @cli @work @work-stream
Feature: `--resume` — settle, recover, re-ask; the loop is resumed, never restored

  A machine-off leaves two things behind: run records stuck `running` that nothing will ever
  settle, and a loop's declared parameters. `--resume` is three existing acts in that order and
  no new one (ADR-004 §3). (a) SETTLE — every stranded `running` record in scope is force-failed
  as `runtime_offline` through the run store's OWN reclaim path
  (`transitionStaleRunsReclaimed`, the shape `src/commands/resume.mjs:137` already uses), which
  keeps it RETRYABLE, because an infra kill is not the agent's fault. (b) RECOVER — the most
  recent `brief.loop` declaration among the scope's runs is read back; an explicit `--level` or
  `--cap` on the resume invocation WINS, an absent one INHERITS. (c) RE-ASK — `work:next <scope>`,
  and carry on.

  What is deliberately absent is a position. The loop's position is not state: `work:next`
  re-derives "where am I" from the stream's own statuses every tick, so persisting a pointer
  would be a second answer to a question the stream already answers — and it is the answer that
  goes stale. The scenario that decides this ADR is in this feature: a human who fixes a status
  between the crash and the resume must be HONOURED, not overruled by a stale pointer.

  Sessions are settled and re-driven, never re-attached (ADR-004 §4). `claude --resume`
  re-attachment exists in this repo and is deliberately not used: a machine-off killed the PTY,
  the transcript is on disk, and re-driving the phase is the honest recovery. This is observable
  at the spawn seam — the recorded launch args of a resumed drive carry no `--resume <sessionId>`.

  THE SEAM. Every scenario drives the launcher body in-process over a temp-`AOF_GLOBAL_HOME`
  fixture stream with `test/support/mesh-worker-terminal-fixture.mjs`'s `{ptySpawn, which}`
  injected through the declared seam `ctx.agentSessionDriverOptions` (ADR-010 §2). The crash is
  fixtured, not simulated: run records are seeded on disk in the exact
  shape a killed loop leaves — `state: "running"`, a `heartbeatAt` older than the staleness
  window, and a `brief.loop` declaration — and every assertion reads back through
  `aof work run-status <ref> --json` and the recorded spawn calls.
  Mechanised as `test/loop-command-resume.test.mjs`, imported AND spread in `scripts/test.mjs`
  inside this story's own labelled `// milestone 53 / story 02` block, so the evidence lands with
  the contract rather than after it (ADR-011 §1, TECH_DEBT item 48).
  ADR-004 §3 and §4, ADR-005 §3, ADR-009 §1, ADR-010 §2, RESEARCH §Q4 and §Q8.

  Scenario: a stranded run is settled through the store's own reclaim path, and stays retryable
    Given a seeded run on `03/01` left `running`, last heartbeat two hours ago, carrying a `brief.loop` declaration
    When I run the loop body for scope `03` with `--resume`
    Then that run is now `failed` with failure reason `runtime_offline`
    And it carries a `reclaimedAt` stamp
    And it is still classified retryable — the loop may resume its lineage
    And the loop reports what it reclaimed, by runId, before it drove anything

  Scenario: a live run is not settled — the staleness rule is the store's, not the shell's
    Given a seeded run on `03/01` left `running` with a heartbeat from one minute ago
    When I run the loop body for scope `03` with `--resume`
    Then that run is still `running` — it is being worked, not stranded
    And nothing about it was reclaimed, failed or retried
    And the loop does not drive that ref while its run is live

  Scenario: the declaration is recovered from the run records, and nothing else
    Given a seeded stranded run on `03/01` whose `brief.loop` declares scope `03`, level `L2`, cap 2 and a `startedAt`
    When I run `aof work loop 03 --resume --json`
    Then `resumable.lastDeclaration` carries that `loopRunId`, scope, level, cap and `startedAt`
    And `level` and `cap` on the resumed loop are `L2` and 2 — inherited from the declaration
    And no file outside the run store was read to recover them

  Scenario: an explicit level or cap on the resume wins over the declaration
    Given a seeded stranded run whose `brief.loop` declares level `L2` and cap 2
    When I run `aof work loop 03 --resume --cap 5 --json`
    Then `cap` is 5 and `level` is `L2`
    When I run `aof work loop 03 --resume --level L1 --json`
    Then `level` is `L1` and `cap` is 2 — the flag given wins, the flag absent inherits
    And the inherited cap is the declared one even when the config file now says something different

  Scenario: the most recent declaration wins across a range
    Given seeded runs under milestones `50`, `51` and `52`, each carrying a `brief.loop` declaration with a different `startedAt`
    When I run `aof work loop 50-52 --resume --json`
    Then `resumable.lastDeclaration` is the one with the latest `startedAt`
    And its `loopRunId` is the one reported
    And the older declarations are not merged into it

  Scenario: a loop that minted no runs has nothing to resume, and says so
    Given a fixture stream carrying no run records at all
    When I run `aof work loop 03 --resume --json`
    Then `resumable.stranded` is empty and `resumable.lastDeclaration` is null
    And the level and cap are the invocation's own, resolved as for a fresh loop
    When I run the loop body for scope `03` with `--resume`
    Then the output states plainly that there was nothing to resume
    And nothing was reclaimed, failed or retried

  Scenario: NO POSITION IS RESTORED — a human's change between the crash and the resume is honoured
    Given a seeded stranded run on `03/01`, whose `brief.loop` declares the loop was driving `03/01`
    And a human has since set `03/01` to `done` and `03/02` is now the first ready item
    When I run the loop body for scope `03` with `--resume`
    Then the stranded run on `03/01` is settled
    And the first session spawned types `/aof:continue 03/02` — what `work:next` says NOW
    And no session is spawned for `03/01`
    And the loop never consulted a stored position, because none was ever written

  Scenario: the resumed phase is a fresh session, never a re-attachment
    Given a seeded stranded run on `03/01` carrying a captured session id
    When I run the loop body for scope `03` with `--resume`
    Then the recorded launch args of the next session carry no `--resume` and no prior session id
    And a new session id is captured for the new session
    And the prior session id is still readable on the settled run record — the history is not rewritten

  Scenario: `--resume --json` reports what it would settle and settles nothing
    Given a seeded stranded run on `03/01`
    When I run `aof work loop 03 --resume --json`
    Then `resumable.stranded` names that run with its ref, runId and node
    And `aof work run-status 03/01 --json` still shows it `running`
    And zero spawn calls were recorded
    And the settle happens only when the launcher body runs — the probe is a read

  Scenario: settle happens before the first drive, not after it
    Given a seeded stranded run on `03/01` and a ready story `03/01`
    When I run the loop body for scope `03` with `--resume`
    Then the reclaim is recorded before the first spawn call
    And no mint is refused `duplicate-run`, because the stranded record was terminal by then

  Scenario: resuming a loop that halted at a gate halts there again until the gate clears
    Given a fixture stream whose next ready item is the uat session `04`, and no stranded runs
    When I run the loop body for scope `03-04` with `--resume`
    Then nothing is reclaimed and nothing is driven
    And the loop halts with `uat-gate` naming `04`, exactly as the first run did
    And a resume is therefore safe to re-run — it re-asks rather than re-doing

  Scenario: a resume outside the admitted scope forms is refused before anything is settled
    When I run `aof work loop 03/01 --resume --json`
    Then exactly one document is printed carrying `ok: false` and the code `loop-scope-unsupported`
    And no run was reclaimed, failed or retried
    And no declaration was read

  Examples: the three acts, in order, and what each touches (ADR-004 §3)
    | act     | what it does                                          | through                              | writes                      |
    | settle  | force-fail stranded `running` runs in scope           | the run store's own reclaim path     | those run records only      |
    | recover | read the most recent `brief.loop` declaration         | the run records already read         | nothing                     |
    | re-ask  | `work:next <scope>` and carry on                      | the registered command               | nothing until it drives     |

  Examples: what a seeded record looks like, and what `--resume` does to it
    | seeded run state | heartbeat age | failureReason  | after --resume                        | drivable again |
    | running          | 2 hours       | (none)         | failed / runtime_offline / reclaimedAt| yes            |
    | running          | 1 minute      | (none)         | unchanged — still running             | no, it is live |
    | failed           | —             | runtime_offline| unchanged — already terminal          | yes, retryable |
    | failed           | —             | agent_error    | unchanged — already terminal          | no, halts      |
    | done             | —             | (none)         | unchanged                             | n/a            |
    | (no runs at all) | —             | —              | nothing to resume, reported           | fresh start    |

  Examples: level and cap on a resume — explicit wins, absent inherits
    | declared level | declared cap | `--level` given | `--cap` given | resolved level | resolved cap |
    | L2             | 2            | (absent)        | (absent)      | L2             | 2            |
    | L2             | 2            | L1              | (absent)      | L1             | 2            |
    | L2             | 2            | (absent)        | 5             | L2             | 5            |
    | L2             | 2            | L1              | 5             | L1             | 5            |
    | (no runs)      | (no runs)    | (absent)        | (absent)      | L2             | config, else 3 |
    | (no runs)      | (no runs)    | L1              | 1             | L1             | 1            |
