@executable @cli @work @work-stream
Feature: one repair per halt, then the loop resumes on its own or stops

  WHY. A repair that worked should cost the operator nothing: the loop carries on as if
  `aof work loop <scope> --resume` had been typed, on the choices it started with (143). A repair
  that did not work, or a halt that comes back, stops for the operator with the repair named, so
  the loop never spends sessions on a cause one session could not fix.

  The repair is a run on the halted ref. Its brief carries `loop: { loopRunId, phase: "repair",
  cycle: 1 }` and `halt: { stop, producer }`, and it is settled with the drive's outcome like every
  other loop drive. The bound is read from the run store, keyed by (loopRunId, ref, stop), so it
  holds across a `--resume`, which keeps the loopRunId. After a `done` repair the launch re-enters
  the loop body with `resume: true` in the same process. Nothing is spawned for the loop itself.

  Rule: R3 · One repair per halt, after which the loop resumes on its own or stops

    Scenario: E7 · a repair that ends done resumes the loop on the choices it started with
      Given `aof work loop 03 --model continue=opus --thinking high` halts `lane-merge-conflict` at `03/03`
      And the repair drive for `03/03` answers outcome `done`
      When the launch carries on
      Then the account prints `Repaired lane-merge-conflict at 03/03 (run <repairRunId>) — resuming 03.`
      And the loop body runs again with `resume: true` under the same loopRunId, in the same process
      And the next `continue` drive's run declaration records `sessions.continue` as model `opus` at effort `high`
      And no `loop-halted` notification is sent for the repaired halt

    Scenario: the repair is recorded as a run on the halted ref
      Given the loop halts `lane-merge-conflict` at `03/03` under loopRunId `L1`
      When the repair drive answers outcome `done`
      Then `03/03` holds a run whose `brief.loop` is `{ loopRunId: "L1", phase: "repair", cycle: 1 }`
      And whose `brief.halt` is `{ stop: "lane-merge-conflict", producer: "dispatch:merge-home:conflict" }`
      And whose state is `done`

    Scenario: E8 · the same halt after one repair stops the loop, naming the repair run
      Given the loop halted `lane-merge-conflict` at `03/03`, the repair ended `done` and the loop resumed
      When the loop halts `lane-merge-conflict` at `03/03` again
      Then no second repair drive is spawned
      And the halt line's `Details:` carries `repaired=<repairRunId>`
      And the `loop-halted` notification is sent once

    Scenario Outline: E9 · a repair that does not end done stops the loop with the original halt
      Given the loop halts `lane-merge-conflict` at `03/03`
      When the repair drive answers <answer>
      Then the loop does not resume
      And the halt line names stop `lane-merge-conflict` at `03/03`, and its `Details:` carries `repair=<repairRunId>` and `repairOutcome=<outcome>`
      And the repair run is settled `<outcome>`
      And the `loop-halted` notification is sent once

      Examples:
        | example | answer                                    | outcome   |
        | E9      | outcome `failed`, reason `agent_error`    | failed    |
        | E9      | outcome `cancelled`                       | cancelled |
        |         | a child that times out                    | failed    |
        |         | a child that dies without a document      | failed    |

    Scenario: the bound holds across a resume typed by the operator
      Given the loop halted `lane-merge-conflict` at `03/03`, the repair ended `done`, and the loop process was then killed
      When `aof work loop 03 --resume` halts `lane-merge-conflict` at `03/03`
      Then no repair drive is spawned, and the halt line's `Details:` carries `repaired=<repairRunId>`

    Scenario: a different halt after a repair gets its own repair
      Given the loop halted `lane-merge-conflict` at `03/03`, the repair ended `done` and the loop resumed
      When the loop halts `lane-open-failed` at `03/04`
      Then a repair drive is spawned for `03/04`

    Scenario: a repair that cannot be minted stops the loop with the original halt
      Given `03/03` holds a live run of another phase
      When the loop halts `lane-merge-conflict` at `03/03`
      Then no repair drive is spawned
      And the halt line's `Details:` carries `repair=refused:duplicate-run`
