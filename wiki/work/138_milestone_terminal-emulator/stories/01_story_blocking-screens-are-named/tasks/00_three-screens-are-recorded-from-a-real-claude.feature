@manual @cli @work @work-stream
Feature: three screens are recorded from a real claude — login zero-token in an isolated config, trust and MCP approval in a scratch folder the operator is told about and that is cleaned up after

  ADR-003 §2 and §7. No entry without a recording: `trust`, `mcp-approval` and `login` are
  captured here, with RESEARCH Q2's recipe (the driver's own launch seam and spawn, 80×24,
  `WT_SESSION` removed, every `onData` chunk recorded with its offset, the tree killed after the
  frame settles). `first-run` already landed with 00. Each file is
  `test/fixtures/claude-screens/<id>.json` in 00's shape, with the version it was recorded from.

  RULINGS (PO, 2026-09-27). (1) Every capture is zero-token: the probe sends no keys except the
  ones a capture names below, and never a prompt, so no turn starts. (2) `login` is captured under
  an empty `CLAUDE_CONFIG_DIR` in a scratch cwd, past the theme picker with one Enter; nothing
  outside the scratch directory is read or written. (3) `trust` and `mcp-approval` need the
  operator's configured claude in a never-trusted scratch cwd, and claude writes a projects entry
  for that cwd into the operator's real `~/.claude.json`. The builder tells the operator before
  either capture, and removes that entry afterwards. (4) The MCP server in the scratch
  `.mcp.json` runs nothing if approved (a `node` command that exits at once), and it is never
  approved: the capture ends on the dialog. (5) Reaching the MCP dialog needs the trust dialog
  answered first. That is one Enter on `Yes, I trust this folder`, in a launch separate from the
  `mcp-approval` recording, so each file holds one screen. (6) A recording that shows anything the
  operator would not publish (a path under their profile, an account e-mail) is scrubbed as 00's
  are (task 02, ruling 6): same-length substitutions, `acd-no-internal-project-names` green, and
  each substitution named in `VERIFICATION.md`. (7) The cleanup deletes only the two
  scratch keys under `projects`, by one read-modify-write the way `ensureWorktreeTrusted`
  (`src/claude-trust.mjs`) writes its entry, and touches no other key: live sessions share the file.

  RULINGS (QA, 2026-09-27). (1) The evidence for each capture is pasted in `VERIFICATION.md`:
  `claude --version`, the recording's chunk count and duration, and the rendered frame's rows.
  (2) "Removed" is proved at the source: the projects keys of `~/.claude.json` are listed before
  the first capture and after the cleanup, and the two lists are equal. The file is read by key,
  never printed whole.

  Scenario: the operator is told before their config is touched
    Given `~/.claude.json`'s projects keys are listed and pasted
    When the builder reaches the `trust` capture
    Then the builder has said to the operator, before launching, that a projects entry for the scratch cwd will be written and then removed

  Scenario: login is recorded without spending a token or touching real config
    Given a scratch directory holding an empty `cfg` and an empty `cwd`
    When claude is launched in `cwd` with `CLAUDE_CONFIG_DIR` set to `cfg`, one Enter is sent once the theme picker is drawn, and the output is recorded until the login screen settles
    Then `login.json` holds that recording's chunks from the Enter on, and its `claude` field is the version `claude --version` printed
    And rendered through `screen.mjs`, its frame is claude's sign-in screen, and nothing outside the scratch directory changed

  Scenario: trust is recorded as claude draws it, answered by nobody
    Given the operator's configured claude and a new scratch cwd that has never been trusted
    When claude is launched there, and the output is recorded until the trust dialog settles and the tree is killed
    Then `trust.json` holds the recording and its version, and its rendered frame holds a menu row `❯ 1. Yes, I trust this folder`

  Scenario: MCP approval is recorded on the dialog, never approved
    Given a second scratch cwd holding an `.mcp.json` naming one server `probe-mcp` whose command exits at once
    And a first launch there has answered the trust dialog with one Enter and been killed
    When claude is launched there again and recorded until the MCP dialog settles, and the tree is killed
    Then `mcp-approval.json` holds that recording and its version, and its rendered frame names `probe-mcp` in a select menu
    And no key was sent to that second launch

  Scenario: the operator's config is left as it was
    When the captures are done and the scratch projects entries are removed
    Then `~/.claude.json`'s projects keys, listed again, equal the list pasted before the first capture
    And the scratch directories are deleted
