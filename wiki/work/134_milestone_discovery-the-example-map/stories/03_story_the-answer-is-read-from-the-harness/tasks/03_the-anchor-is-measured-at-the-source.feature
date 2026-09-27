@manual @cli @work @work-stream
Feature: The anchor is measured at the source — a real settle stamps a real answer onto the run record on disk

  WHY. Near-miss R6 (m62): the ADR that names a reader of a person's answer owes a measured check
  that the reader returns the answer and its giver. Green unit tests do not discharge it. The R5
  gap is exactly how they would pass while nothing is stamped, because a fixture directory hides
  the one thing that was broken: where the transcript store is. So the check runs the installed
  `aof` against this machine's real transcript store and reads the run record on disk, not a
  test double.

  Every leg needs an interactive session that no shell is driving, and the answer leg needs a
  person, so the whole check is operator-gated: the builder writes the procedure and paste slots
  into the milestone `STATE.md` and stops for the operator. It runs on this story itself, once its
  build run has settled, rather than on a throwaway item. A story inserted under `134` would be
  picked up by any loop cascading the milestone, and the records it leaves on `134/03` are the
  evidence the story owes. The token `134/03 Q<n>` names a story with no `EXAMPLES.md`, so no
  gate reads it.

  Every mint names its session with `--session`: `run-start` attributes a session unaided only when
  one live session is strictly newest, and a run minted with `sessionId: null` stamps nothing.

  Evidence is recorded in the milestone `VERIFICATION.md`, pasted from the commands' own output,
  never paraphrased.

  Background:
    Given this story's build is installed with `node scripts/install-local.mjs --skip-ui` and `aof --version` names the new payload build
    And no run of `134/03` is `running`
    And S below is the id of the operator's interactive session, opened in the repository root, the name of its newest `.jsonl` in this repository's folder under `~/.claude/projects`

  Scenario: a hand-run settle stamps spend from this machine's transcript store
    Given the operator mints a run with `aof work run-start 134/03 --session S --json` from an interactive session in the repository root, and the envelope carries that `sessionId`
    When the operator runs `aof work run-complete 134/03 --outcome done` from `wiki/`, a subdirectory of the repository
    Then the `spend` of the run record on disk is not null, and its `turns` are more than 0
    And the run record's path and its `spend` are pasted into the milestone `VERIFICATION.md` from the commands' output

  Scenario: the check stops for the operator with its procedure written down
    Given the story's `@executable` tasks are green and its build run has settled
    When the builder reaches this task
    Then the milestone `STATE.md` holds the three procedures below, word for word, with one empty paste slot per `Then` line
    And the builder's last line is `NEEDS_INPUT`, and the story stays `in-progress` until the slots are filled

  Scenario: a person's answer to a tokened question is stamped with its session and entrypoint
    Given the operator mints a run with `aof work run-start 134/03 --session S --json` from an interactive session
    And in that session the agent asks, through `AskUserQuestion`, one question whose text opens with `134/03 Q1 · `, and the operator answers it in their own words through "Other"
    And the same session asks a second question with no token, which the operator answers
    When the operator runs `aof work run-complete 134/03 --outcome done` in that session
    Then the `brief.answers` of the run record on disk holds exactly one record, for `134/03 Q1`
    And its `answer` is the operator's own words, its `sessionId` is the run's `sessionId`, and its `entrypoint` is the session's entrypoint
    And `collectAnswers` for `134/03`, called with no transcript directory, returns that record

  Scenario: a refused question leaves no record
    Given the operator mints a second run with `aof work run-start 134/03 --session S --json` from an interactive session
    And in that session the operator refuses one `AskUserQuestion` call whose question opens with `134/03 Q2 · `
    When the operator runs `aof work run-complete 134/03 --outcome done` in that session
    Then the `brief.answers` of the run record on disk holds no record for `134/03 Q2`
