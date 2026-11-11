@manual @cli @work-stream
Feature: a real check session writes nothing and labels its help

  WHY. 00 and 01 hold the prose. This is the observation that a real Claude session follows it. A
  developer runs it in a throwaway external repository with `AOF_GLOBAL_HOME` isolated, playing the
  human, reusing 188/04's test bed shape. They snapshot `git status --untracked-files=all` and a
  SHA-256 of every non-`.git` file before and after each command, cap each session with
  `--max-budget-usd`, and paste the transcripts' relevant turns, the snapshots and each summary into
  the milestone's VERIFICATION.md.

  Rule: R1 · A live check writes nothing

    Scenario: E1 · a check leaves every file as it found it
      Given a refined story `00` in the test bed whose scenarios are green
      When `/aof:grill-me 00` runs and the human answers every check
      Then the SHA-256 of every non-`.git` file is identical before and after
      And `git status --untracked-files=all` is identical before and after
      And the stream holds no Write, Edit, Task or Agent tool call

  Rule: R2 · A live check labels help and refuses to count an unanswered check

    Scenario: E2 · pulled help and a skip are reported as such
      Given a fresh session on story `00`
      When `/aof:grill-me 00` runs, the human asks for a conceptual hint on predict, then answers it, and skips diagnose
      Then the summary's predict line reads `help: conceptual hint`
      And the summary's diagnose line reads `skipped`, and no line calls it passed

    Scenario: E3 · build help is named only when the session saw it
      Given a session that ran `/aof:teach 01` and gave a conceptual hint, and the human made `01` green by hand
      When `/aof:grill-me 01` runs in that same session
      Then the summary names the conceptual hint under help during the build
      And `/aof:grill-me 01` run in a fresh session reads `help during the build: not observed by this session`

    Scenario: the two halves stay apart in a live summary
      When any summary from this walk is read
      Then it has a Shipping half and an Understanding half, with no single combined verdict
      And it prints the limits line
