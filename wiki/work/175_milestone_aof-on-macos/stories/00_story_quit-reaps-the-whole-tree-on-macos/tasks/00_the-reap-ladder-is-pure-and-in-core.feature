@executable @cli @work @distribution
Feature: The reap ladder is pure and lives in core

  WHY. On Windows the Job Object reaps the tree; off Windows nothing does (RESEARCH M8). The
  ladder that replaces it — SIGTERM each group, a 5 s grace, SIGKILL the survivors — is a
  decision, so it is pure and `cargo test`-reached; the app crate only carries it out (ADR-001
  §2-§3). A group is named by its leader's pid, because every child leads its own (§1).

  Rule: R1 · Every kill the supervisor makes reaches the whole process group

    Scenario: E1 · groups that exit on SIGTERM are never sent SIGKILL
      Given live groups 4101 and 4102 and a grace of 5 s
      When the reap plan is stepped, and both groups are gone 1 s after their SIGTERM
      Then the plan's steps are "TERM 4101, TERM 4102" then "done"
      And no step names KILL

    Scenario: E2 · a group still alive after the grace is sent SIGKILL, and a gone one is not
      Given live groups 4101 and 4102 and a grace of 5 s
      When the reap plan is stepped, and only group 4101 is still alive when the grace ends
      Then the steps are "TERM 4101, TERM 4102", then "wait until 5 s", then "KILL 4101", then "done"

    Scenario: E3 · a declaration's group is reaped with the daemons
      Given live groups 4101, 4102 and 4210, where 4210 leads a "work loop" declaration
      When the reap plan is stepped
      Then its first step is "TERM 4101, TERM 4102, TERM 4210"

    Scenario: E7 · the stop ladder's last rung names the group, not the pid
      Given a declaration whose child leads group 4210
      When its stop ladder reaches its last rung
      Then the kill it asks for is "KILL group 4210"

    Scenario Outline: the plan over each starting state
      Given live groups <groups> and a grace of 5 s
      And <alive> still alive when the grace ends
      When the reap plan is stepped
      Then its steps are <steps>

      Examples:
        | groups     | alive         | steps                                             |
        | none       | none          | "done"                                            |
        | 4101       | none          | "TERM 4101", "done"                               |
        | 4101       | 4101          | "TERM 4101", "wait until 5 s", "KILL 4101", "done" |
        | 4101, 4102 | 4101, 4102    | "TERM 4101, TERM 4102", "wait until 5 s", "KILL 4101, KILL 4102", "done" |

    Scenario: a group already gone before the reap is not signalled at all
      Given group 4101 was recorded, and its leader exited before the reap began
      When the reap plan is stepped
      Then no step names 4101
