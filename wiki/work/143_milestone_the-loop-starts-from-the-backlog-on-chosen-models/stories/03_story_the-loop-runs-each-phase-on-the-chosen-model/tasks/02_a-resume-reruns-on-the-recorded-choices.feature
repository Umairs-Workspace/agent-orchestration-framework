@executable @cli @work @work-stream
Feature: a resume reruns on the recorded choices

  A supervisor relaunch is always a `--resume`, so the recorded choices are what keep a relaunched loop
  on the operator's models. The rule (ADR-004 §3) works on the session flags as a SET:

  - With no `--model` and no `--thinking` given, the resume re-applies every recorded `sessions`
    entry part whose source is a flag. Config-sourced and default parts re-resolve from the current
    config, because a config edit is the operator's standing choice.
  - With any session flag given, the recorded flag choices are all dropped, and the new flags resolve
    alone over the config.
  - A declaration written before 143 has no `sessions`. It falls back to its `thinking`, exactly as
    141 resumes it.

  Scenario Outline: the recorded flag parts survive a resume, and new flags replace them
    Given a halted loop on 143 whose declaration `sessions` records refine `opus` (`--model`) at `xhigh` (`--model`) and continue no model at `high` (`config`)
    And `work.agents.session.effort.continue` is now <cfgEffort>
    When `aof work loop 143 --resume <flags>` mints its next run
    Then that run's `sessions.refine` is <refine> and its `sessions.continue` is <continue>

    Examples:
      | cfgEffort  | flags                    | refine                                         | continue                                       |
      | `"high"`   |                          | `opus` (`--model`) at `xhigh` (`--model`)      | no model at `high` (`config`)                  |
      | `"low"`    |                          | `opus` (`--model`) at `xhigh` (`--model`)      | no model at `low` (`config`)                   |
      | `"high"`   | `--model refine=sonnet`  | `sonnet` (`--model`) at `high` (`default`)     | no model at `high` (`config`)                  |
      | `"high"`   | `--thinking max`         | no model at `max` (`--thinking`)               | no model at `max` (`--thinking`)               |

  Scenario: a resumed refine drive is lent the recorded model
    Given the halted loop above
    When `aof work loop 143 --resume` drives a refine as a child
    Then the child drive's argv carries `--model opus --thinking xhigh`

  Scenario Outline: a declaration written before 143 resumes as 141 did
    Given a stored loop declaration with no `sessions` key and `thinking` <thinking>
    When `aof work loop 143 --resume <flags>` mints its next run
    Then every phase's effort in that run's `sessions` is <effort>

    Examples:
      | thinking   | flags            | effort                                         |
      | `"xhigh"`  |                  | `xhigh` from `--thinking`                      |
      | `null`     |                  | resolved from config, else `high` (`default`)  |
      | `"xhigh"`  | `--thinking low` | `low` from `--thinking`                        |

  Scenario: a supervisor relaunch keeps the operator's models
    Given a supervised loop launched with `--model verify=fable:high`, halted by a node restart
    When the supervisor relaunches it with `--resume` and no session flag
    Then its verify drive's session launches with `--model fable --effort high`
