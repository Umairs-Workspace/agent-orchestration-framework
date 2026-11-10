@executable @ui @adapter @distribution
Feature: The guard judges a sustained overrun from the OS's own sample

  WHY. The desktop app supervised a daemon burning a core for 17 hours and showed a healthy tray.
  A daemon that busy cannot be trusted to report on itself, so the app samples each daemon's CPU
  from the operating system. It judges that sample against the budget the status read hands it,
  and calls it an overrun only after 5 minutes over budget, so a big sync's spike does not
  alarm.

  Background:
    Given a guard for "serve" and "ui" on an injected clock, fed a sample every 3 seconds
    And the status read hands it a budget of 2% idle and 10% viewer-open

  Rule: R1 · A sustained overrun is shown and logged, and a short spike is not

    Scenario: E1 · five minutes over the idle budget is an overrun
      Given "serve" is "idle"
      When "serve" uses 60% of a core for 5 minutes
      Then the guard reports that "serve" entered overrun at 60% against 2% "idle"

    Scenario: E2 · a forty-second spike is not an overrun
      Given "serve" is "idle"
      When "serve" uses 90% of a core for 40 seconds and then 1% for 5 minutes
      Then the guard reports no overrun for "serve"

    Scenario: E3 · a minute back under budget ends the overrun
      Given "serve" entered overrun
      When "serve" uses 1% of a core for 60 seconds
      Then the guard reports that "serve" left overrun

    Scenario Outline: the sustained duration's edges
      Given "serve" is "idle"
      When "serve" uses 60% of a core for <span>
      Then the guard <verdict>

      Examples:
        | span                  | verdict                                  |
        | 4 minutes 57 seconds  | reports no overrun for "serve"           |
        | 5 minutes             | reports that "serve" entered overrun     |

  Rule: R2 · The guard judges only against a budget it was handed

    Scenario: E4 · with no budget from the status read, nothing is judged
      Given the status read fails or carries no cost budget
      When "serve" uses 100% of a core for 10 minutes
      Then the guard reports no overrun for "serve"

    Scenario: E5 · a daemon that stopped reporting is judged against the looser budget
      Given "serve"'s snapshot reads "not-reporting"
      When the OS shows "serve" using 100% of a core for 5 minutes
      Then the guard reports that "serve" entered overrun at 100% against 10% "viewer-open"

    Scenario: a daemon the OS cannot sample is never judged
      Given the sampler returns no reading for "ui"
      When 10 minutes pass
      Then the guard reports no overrun for "ui"
