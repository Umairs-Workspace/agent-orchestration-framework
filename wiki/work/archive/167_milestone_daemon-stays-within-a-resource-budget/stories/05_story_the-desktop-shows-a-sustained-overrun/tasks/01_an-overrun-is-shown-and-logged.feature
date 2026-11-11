@executable @ui @adapter @design
Feature: An overrun is shown and logged, never acted on

  WHY. An overrun is something the operator decides about, so the app's job is to say it plainly
  and leave the daemon alone. The tray shows its existing degraded state, and the footer's one
  notice line says which daemon, how much against what budget, and what it is spending its time
  on. One line is logged as the overrun starts and one as it ends. The app never stops, restarts
  or kills a daemon because of it.

  Background:
    Given the supervisor runs "mesh serve" and "mesh ui" with an injected sampler and clock
    And the status read hands it a budget of 2% idle and 10% viewer-open

  Rule: R1 · A sustained overrun is shown and logged, and a short spike is not

    Scenario: E1 · an overrun turns the tray degraded, fills the footer and logs one line
      Given "mesh serve" is "idle" and its snapshot's top cause is "full-disk-read" on "52294b307214c27d"
      When "mesh serve" uses 60% of a core for 5 minutes
      Then the tray state is "degraded"
      And the footer reads "mesh serve is using 60% of a core (idle budget 2%) — mostly full-disk-read on 52294b307214c27d"
      And the degrade log gains exactly 1 line with proc "desktop" and code "daemon-over-budget"

    Scenario: E3 · the end of an overrun clears the footer and logs one line
      Given "mesh serve" is in overrun and shown
      When "mesh serve" uses 1% of a core for 60 seconds
      Then the footer returns to its populated text
      And the tray returns to its fleet state
      And the degrade log gains exactly 1 line with code "daemon-back-within-budget"

    Scenario: E5 · a daemon that stopped reporting is named as such
      Given "mesh serve"'s snapshot reads "not-reporting"
      When the OS shows "mesh serve" using 100% of a core for 5 minutes
      Then the footer reads "mesh serve is using 100% of a core (viewer-open budget 10%) — it has stopped reporting what it is doing"

  Rule: R3 · The guard never stops a daemon

    Scenario: E6 · an hour in overrun issues no stop, restart or kill
      Given "mesh serve" has entered overrun
      When "mesh serve" stays over budget for 1 hour
      Then "mesh serve" is still running
      And the supervisor has issued no stop, restart or kill for it
      And the operator's Stop on "mesh serve" still stops it as before

    Scenario: E7 · a standing exit notice outranks the overrun in the footer
      Given "mesh serve" is in overrun
      And "mesh ui" exited with a standing exit notice
      Then the footer shows the exit notice
      And the tray state is "degraded"
