@executable @cli @distribution @adapter
Feature: stop asks the app to quit and waits for it

  WHY. On macOS SIGTERM is a graceful Quit that reaps the daemons (ADR-001 §4). A stop that
  returns before the app has gone lets the next run hand off to a dying instance and leave
  nothing running (RESEARCH M10). The darwin stop never force-kills (ADR-003 §3).

  Background:
    Given a fake runner that models processes by pid, and a clock the test advances

  Rule: R3 · stop asks the app to quit, waits for it, and never force-kills it

    Scenario: E8 · a supervisor that exits after SIGTERM is reported stopped
      Given "pgrep -x aof-mesh-desktop" answers "812"
      And pid 812 exits 2 s after it receives SIGTERM
      When "aof mesh desktop stop --json" runs with platform "darwin"
      Then the runner was asked for "kill -TERM 812"
      And the answer is ok with stopped [812]
      And it returned no earlier than pid 812's exit
      And the runner was never asked for a SIGKILL

    Scenario: E9 · a supervisor still alive after the wait is refused and left running
      Given "pgrep -x aof-mesh-desktop" answers "812"
      And pid 812 ignores SIGTERM
      When "aof mesh desktop stop --json" runs with platform "darwin"
      Then after 20 s it answers ok false with code "desktop-stop-timeout"
      And the message names pid 812
      And the runner was never asked for a SIGKILL

    Scenario: E10 · nothing running is a success
      Given "pgrep -x aof-mesh-desktop" answers nothing
      When "aof mesh desktop stop --json" runs with platform "darwin"
      Then the answer is ok with alreadyStopped true

    Scenario: --dry-run names the pid and signals nothing
      Given "pgrep -x aof-mesh-desktop" answers "812"
      When "aof mesh desktop stop --dry-run --json" runs with platform "darwin"
      Then the answer has wouldStop [812]
      And the runner was asked for no "kill"

    Scenario: Windows stop is unchanged
      Given "tasklist" answers the row for "aof-mesh-desktop.exe" pid 23496
      When "aof mesh desktop stop --json" runs with platform "win32"
      Then the runner was asked for "taskkill /PID 23496 /T /F"
