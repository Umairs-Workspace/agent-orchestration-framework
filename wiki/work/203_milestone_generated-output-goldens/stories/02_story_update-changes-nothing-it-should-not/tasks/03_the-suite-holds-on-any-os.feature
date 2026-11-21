@executable @cli @assets @scaffold
Feature: The suite holds on any OS by construction

  WHY. The SPEC's last acceptance line is that one baseline holds on macOS, Windows and Linux. What
  another OS changes is the bytes a capture holds, never the comparison: CRLF line endings, "\"
  between path segments (JSON-escaped inside a step record), and a temp root spelled in a case or
  short-name form its realpath does not share. Each is produced here on purpose from the committed
  baselines, so the property is proven on whatever OS runs the suite, with no run on a particular
  machine (ADR-002, ADR-003 §4). Tree keys need no such case: the harness joins directory entry
  names with "/", never an OS path. The baselines are LF in every checkout by FF-20303, and the real
  global home is untouched by 203/00 task 00 E5.

  Amended at verify, 2026-11-21: this task was `@manual`, a run of both lanes on the Windows
  control node. A property of the normaliser and the baselines does not need a machine to prove it.

  Background:
    Given every scenario in lanes "work-init" and "work-update", materialised from its committed baseline
    And a Windows normalising context: a temp root under "C:\Users\RUNNER~1\AppData\Local\Temp", a realpath under "C:\Users\runneradmin\…", and paths compared case-insensitively

  Rule: R4 · A Windows-shaped capture of every scenario normalises to its committed baseline

    Scenario: E12 · CRLF files with real run values normalise to their LF baselines
      When every file is given CRLF line endings, and a real instant, hash and version in place of each placeholder
      Then normalising each file gives exactly its committed bytes
      And no file of any baseline holds a temp path

    Scenario: step records with Windows temp paths normalise to their steps.golden
      When every "<project>" and "<home>" in a scenario's step records is written as the Windows realpath in lower case, with "\" between segments
      And the records are serialised as JSON, so each "\" is escaped
      Then normalising them gives exactly the scenario's "steps.golden"
