@manual @cli @work @work-stream
Feature: a real launch shows up in the Claude app

  WHY. Whether the Remote Control link is in the PTY's bytes at all, and whether a session worktree
  stops at the trust dialog, can only be measured against a real `claude` (RESEARCH Q1, Q2). These are
  run on this laptop, through the desktop app's own daemons, and the results go in VERIFICATION.md.

  Scenario: a launched Claude session is listed by name in the Claude app
    Given the desktop app is running this build, and `daemon-claude-authenticated` is ok
    When a session-spawn frame with launch "claude-remote-control" is sent for this repository's workspace and this node
    Then the Claude app's Code list shows a session named `<folder>-<first 8 of the id>` with a green dot within 60 seconds
    And the fleet grid shows one tile for it, not two

  Scenario: the footer's link bytes are measured at the launch width
    Given the same launched session
    When its first 64 KiB of PTY output are captured from the loopback relay
    Then VERIFICATION.md records whether a `https://claude.ai/code/` URL appears in them, and in what form
    And if none appears at 200 columns, the width that shows it is recorded and ADR-002 §6 is updated in the same beat

  Scenario: a session worktree of a trusted project does not stop at the trust dialog
    Given this repository's root is a folder Claude Code already trusts
    When a launch names item "191", so it opens in `.aof/mesh/session-worktrees/191`
    Then VERIFICATION.md records whether the trust dialog appeared in that worktree
