@manual @cli @assets @scaffold
Feature: The suite is green on Windows

  WHY. The SPEC's last acceptance line is that the suite runs isolated on macOS and Windows. The
  CI gate runs on Linux only, and this MacBook is in no mesh. The run happens on the Windows
  control node from a pull of this branch, and its output is the evidence (ADR-002, ADR-003 §4).

  Rule: R4 · The whole suite holds on Windows

    Scenario: E12 · both lanes pass on Windows against the baselines written on macOS
      Given the Windows control node has pulled this branch with "core.autocrlf=true"
      And "AOF_GLOBAL_HOME" is set to a fresh temp directory
      When "node scripts/golden.mjs" runs with no "--update"
      Then every scenario in lanes "work-init" and "work-update" passes
      And "git status" is clean

    Scenario: the baselines are checked out LF on Windows
      Given the same checkout
      When "git ls-files --eol test/golden/baselines" is read
      Then every file reports "i/lf w/lf attr/text eol=lf"

    Scenario: the real global home is untouched
      Given the modification times of every file under the real "~/.aof" are recorded before the run
      When the run finishes
      Then no file under the real "~/.aof" was created, changed or removed

    Scenario: a Windows-only difference is fixed at its source, not normalised
      Given the run fails on Windows and passes on macOS
      Then the difference is traced to the module that renders it
      And it is fixed there, or recorded as a finding naming that module
      And no normaliser rule is added
