@manual @cli @work @work-stream
Feature: a blocking screen is named in seconds on both nodes — a claude nobody has set up stops the drive and the loop as first-run, zero-token, with the picker in the degrade log

  ADR-003 §5, ADR-004. An empty `CLAUDE_CONFIG_DIR` gives the deployed driver a real `claude` that
  shows the first-run theme picker, which no retry can get past. The drive must stop as
  `blocked_screen` with `screen: { id: "first-run" }` within seconds, the loop's halt line must name
  it, and the degrade log must hold the picker as drawn. Nothing is typed into that claude, so no
  turn starts and no token is spent.

  RULINGS (PO, 2026-09-27). (1) This node's legs run on the standing test-bed, never this
  repository. They need two refined `not-started` stories, one per leg, because the first leg
  leaves its story with a run that is not retryable. When the test-bed has no such pair, the
  builder adds two small fixture stories on the test-bed's own branch and says so. (2) The empty
  config directory is a fresh scratch directory, set only in the environment of the command that
  runs the leg. The direct drive runs first, so a misrouted variable costs one bounded drive, not a
  loop. (3) The WSL leg drives the distro's own deployed tree (`~/source/aof`) through
  `driveInteractiveClaudeSession` from a scratch script outside every repository, with
  `commandDelayMs` 5000 (a real launch), in a scratch cwd, under an empty config directory. The
  script is not committed. (4) Wall-clock times are measured around the command and pasted.
  "Within seconds" is under 30 s from launch to exit, where the cap is 60 s. (5) The failed fixture
  runs stay as evidence. They are recorded in `STATE.md`, and nothing retries them.

  RULINGS (QA, 2026-09-27). (1) The degrade log is read at `~/.aof/mesh/logs/degrade.log` on each
  node: the lines written after the leg started, filtered to the leg's ref or probe name. (2) A
  stop at the cap (`screen-not-ready`) is a failure of this story even though nothing was typed:
  it means the recogniser missed the real screen. The rows it recorded are pasted as a finding.
  (3) The config left untouched is shown by the scratch directory now holding claude's files, and
  by `~/.claude.json`'s modification time, which is the same before and after.

  Scenario: the direct drive stops as first-run within seconds
    Given an empty scratch config directory, and `~/.claude.json`'s modification time pasted
    When `aof work drive continue <first story> --json` runs in the test-bed with `CLAUDE_CONFIG_DIR` set to it
    Then the document holds `outcome` `failed`, `failureReason` `blocked_screen` and `screen` `{ id: "first-run" }`, and the command exited under 30 s, both pasted
    And `aof work run-status <first story> --json` shows the run `failed` with `blocked_screen`, pasted

  Scenario: the degrade log holds the picker, and nothing else went wrong
    When this node's degrade log is read for that drive
    Then it holds one `session-screen` line whose message names the ref and `failed/blocked_screen` and whose `screen.rows` include `Choose the text style`, pasted
    And it holds no `screen-model-unavailable`, `screen-not-ready` or `tui-ready-marker-absent` line for that drive
    And `~/.claude.json`'s modification time is the one pasted before

  Scenario: the loop names the screen in its halt line
    Given a second empty scratch config directory
    When `aof work loop <scope of the second story>` runs in the test-bed with `CLAUDE_CONFIG_DIR` set to it
    Then the loop halts `run-not-retryable` within 60 s, its halt line holds `failureReason=blocked_screen` and `screen=first-run`, and the second story was driven once, all pasted
    And when the story ran in a lane, the narration holds `settle: failed (blocked_screen: first-run).`, pasted

  Scenario: the WSL node names the same screen
    Given the distro's `claude --version` pasted, and an empty scratch config directory and cwd in the distro
    When the scratch script drives the distro's deployed driver there
    Then it resolves `failed`, `blocked_screen` and `screen: { id: "first-run" }` in under 30 s, pasted
    And the distro's degrade log holds one `session-screen` line whose rows are the picker as the Linux build drew it, pasted
