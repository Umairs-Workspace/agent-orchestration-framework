@executable @cli @work @work-stream
Feature: The operator reads every question the loop is waiting on

  WHY. A loop that stops a lane to ask leaves its question in an ask file, and today nothing prints
  it: `aof work resume` names the ref without the question and `aof work list --json` buries it in
  a field. `aof work questions` prints each open question in full with the line that answers it,
  read from the ask files and the local mesh store alone, so it answers when the portal is stale.
  An answer line is offered only where `aof work answer` would really reach a live question.

  Rule: R1 · Every question waiting on me in this workspace is listed with what I need to answer it

    Scenario: E1 · a waiting refine question is printed whole with its answer line
      Given item "011" has a running run whose claude session asked at "2026-10-17T14:02:00Z" during refine
      And its ask file holds the question "Which store owns the cache?\nOptions: A) disk B) memory"
      When "aof work questions" is run at "2026-10-17T14:32:00Z"
      Then one row is printed for "011"
      And the row names the phase "refine", the runtime "claude", the asked instant "2026-10-17T14:02:00Z" and the wait "30m"
      And the row prints both lines of the question
      And the row prints the answer line "aof work answer 011 \"…\""

    Scenario: E2 · a codex question's choices are numbered under it
      Given item "011" has a running run whose codex session asked a question with the choices "disk", "memory" and "both"
      When "aof work questions" is run
      Then the row lists "1. disk", "2. memory" and "3. both" under the question

    Scenario: E3 · a parked question is listed, marked parked, with the loop's resume line
      Given item "04/02" has a running run whose ask file is parked, in loop scope "04"
      When "aof work questions" is run
      Then the row for "04/02" is marked parked
      And the row prints the answer line "aof work answer 04/02 \"…\""
      And the row says the loop resumes with "aof work loop 04 --resume" once it is answered

    Scenario Outline: E4 · with nothing waiting the verb prints one line and exits 0
      Given the workspace's ask store holds <asks>
      When "aof work questions" is run
      Then the output is exactly "No open questions."
      And the exit code is 0

      Examples:
        | example | asks                                   |
        | E4      | no ask file                            |
        | E4      | only asks in the answered state        |
        | E4      | only another workspace's waiting asks  |

    Scenario: E5 · --json emits one row per open question
      Given item "011" has a running run whose claude session asked during refine
      When "aof work questions --json" is run
      Then the output parses as an array of one row
      And the row carries "ref", "runId", "phase", "runtime", "askedAt", "workspace", "state", "question", "choices" and "answer"
      And the row's "answer" is "aof work answer 011 \"…\""

    Scenario: E12 · a question on a lane running on another machine is listed with its node
      Given the local mesh store holds an active running assignment of "05/01" on "node-9549" with code "needs-input" and a session
      And its stored ask carries the question "Ship the migration now?" asked during continue
      And no ask file names "05/01"
      When "aof work questions" is run
      Then the row for "05/01" is marked as on "node-9549"
      And the row prints "Ship the migration now?"
      And the row prints the answer line "aof work answer 05/01 \"…\""

    Scenario: E13 · a worker question whose text never reached this machine says where to read it
      Given the local mesh store holds an active running assignment of "05/01" on "node-9549" with code "needs-input" and a session
      And its stored ask carries no question text
      When "aof work questions" is run
      Then the row for "05/01" says the question did not reach this machine and to open the worker's terminal to read it
      And the row prints the answer line "aof work answer 05/01 \"…\""

  Rule: R2 · Only a question `aof work answer` would actually reach is offered an answer line

    Scenario: E6 · of two open asks on one ref only the latest is listed
      Given item "011" has a waiting ask from run "A" asked at "2026-10-17T09:00:00Z" with the question "first?"
      And item "011" has a waiting ask from run "B" asked at "2026-10-17T11:00:00Z" with the question "second?"
      And both runs are running
      When "aof work questions" is run
      Then exactly one row is printed for "011"
      And it prints "second?" and not "first?"

    Scenario: E7 · a ref whose latest ask is already answered is not listed
      Given item "011" has a running run whose ask file is answered but not yet cleared
      When "aof work questions" is run
      Then no row is printed for "011"

    Scenario: E11 · an ask whose run has stopped is marked stale with no answer line
      Given item "011" has an ask file in the waiting state for run "A"
      And run "A" is failed in the item's records and in its dispatch lane
      When "aof work questions" is run
      Then the row for "011" is marked stale because its loop stopped
      And the row prints no "aof work answer" line
      And the row says "aof work loop 011 --resume" clears it

    Scenario: an ask whose run is running in the item's dispatch lane is live
      Given item "011" has a waiting ask for run "L"
      And run "L" is running only in the dispatch lane worktree for "011"
      When "aof work questions" is run
      Then the row for "011" is not marked stale
      And the row prints the answer line "aof work answer 011 \"…\""

    Scenario: a local ask outranks a worker's ask on the same ref
      Given item "05/01" has a running run with a waiting ask file asking "local?"
      And the local mesh store holds a needs-input assignment of "05/01" on "node-9549" asking "worker?"
      When "aof work questions" is run
      Then exactly one row is printed for "05/01"
      And it prints "local?" and not "worker?"
