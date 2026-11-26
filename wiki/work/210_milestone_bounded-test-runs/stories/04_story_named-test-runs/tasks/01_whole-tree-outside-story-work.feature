@cli @work @validate
Feature: the whole tree is refused inside story work, with no override

  WHY. The loop this milestone removes is an agent running the whole tree after every fix (SPEC,
  Objective). Inside story work the tool refuses it and points at the bounded ways on. There is no
  override, because anything an agent can type would bring the loop back (210/04 Q1). Outside
  story work (a UAT sweep, an operator at a shell, CI) it runs (ADR-007).

  Rule: R3 · The whole tree is refused inside story work

    @executable
    Scenario: E6 · a running story run refuses --all and names the ways on
      Given story 17/02 has a running run in this checkout
      When I run "aof test --all"
      Then it is refused as "test-all-in-story-work", naming story "17/02"
      And it names "aof test --failed" and "aof test <suite>… --reason"
      And no runner is launched

    @executable
    Scenario Outline: what counts as story work
      Given <state>
      When I run "aof test --all --json"
      Then <outcome>

      Examples:
        | state                                                                     | outcome                                          |
        | AOF_RUN_ID names a running run on story 17/02                              | it is refused as "test-all-in-story-work"        |
        | AOF_RUN_ID names a running run on a task 17/02/00                          | it is refused as "test-all-in-story-work"        |
        | AOF_RUN_ID names a run on milestone 17 and no story run is running         | the runner is launched with an empty selection   |
        | no AOF_RUN_ID, and a run on story 17/02 has settled as done                | the runner is launched with an empty selection   |
        | no AOF_RUN_ID, and a run on UAT session 32 is running                      | the runner is launched with an empty selection   |
        | no AOF_RUN_ID, and no run is running                                       | the runner is launched with an empty selection   |

    @executable
    Scenario: E11 · a reason does not override the refusal
      Given story 17/02 has a running run in this checkout
      When I run "aof test --all --reason \"operator asked\""
      Then it is refused as "test-all-in-story-work"
      And no runner is launched

    @executable
    Scenario: the refusal has no override of any kind
      Given story 17/02 has a running run in this checkout
      When "aof test --all" is asked with every flag the command accepts and with every AOF_* environment variable the tool reads
      Then every ask is refused as "test-all-in-story-work"

    @executable
    Scenario: E8 · a whole-tree run outside story work is recorded as all
      Given no run is running in this checkout
      When I run "aof test --all --json"
      Then the record written has mode "all" and reason null
