@manual @cli @work @work-stream
Feature: three screens are recorded from a real claude — login zero-token in an isolated config, trust and MCP approval in scratch folders the operator is told about and that are cleaned up after, and the trust menu's arrow order measured live

  ADR-003 §2, §4 (amended 2026-09-27) and §7, RESEARCH Q5. No entry without a recording: `trust`,
  `mcp-approval` and `login` are captured here, with RESEARCH Q2's recipe (the driver's own launch
  seam and spawn, 80×24, `WT_SESSION` removed, every `onData` chunk recorded with its offset, the
  tree killed after the frame settles). `first-run` already landed with 00. Each file is
  `test/fixtures/claude-screens/<id>.json` in 00's shape, with the version it was recorded from.

  RULINGS (PO, 2026-09-27; amended at the re-refine, 2026-09-27). (1) Every capture is zero-token:
  the probe sends no keys except the ones a scenario names, and never a prompt, so no turn starts.
  (2) `login` is captured under an empty `CLAUDE_CONFIG_DIR` in a scratch cwd, past the theme
  picker with one Enter; nothing outside the scratch directory is read or written. (3) `trust` and
  `mcp-approval` need the operator's configured claude in never-trusted scratch cwds, and claude or
  aof may write a projects entry for such a cwd into the operator's real `~/.claude.json`. The
  builder tells the operator before any such launch, and removes what was written afterwards.
  (4) The MCP server in the scratch `.mcp.json` runs nothing if approved (a `node` command that
  exits at once), and it is never approved: the capture ends on the dialog. (5) The MCP folder is
  trusted by aof's own pre-write, `ensureWorktreeTrusted` (`src/claude-trust.mjs`), before the
  MCP launch, so no key reaches it and the recording holds one screen. A keyed answer is not used:
  on 2.1.283 an Enter on the trust dialog picks its highlighted default, `No, exit` (RESEARCH Q5).
  (6) A recording that shows anything the operator would not publish (a path under their profile,
  an account e-mail) is scrubbed as 00's are (00/02, ruling 6): same-length substitutions,
  `acd-no-internal-project-names` green, and each substitution named in `VERIFICATION.md`.
  (7) The cleanup deletes only the capture's scratch keys under `projects`, by one
  read-modify-write, temp-then-rename, the way `ensureWorktreeTrusted` writes its entry, and
  touches no other key: live sessions share the file. (8) A recording is the whole of what claude
  drew from the spawn. Ink redraws only the cells that change, so the chunks after a key do not
  render a screen on their own.

  RULINGS (QA, 2026-09-27; amended at the re-refine). (1) The evidence for each capture is pasted
  in `VERIFICATION.md`: `claude --version`, the recording's chunk count and duration, and the
  rendered frame's rows. (2) "Left as it was" is proved at the source. The `projects` keys of
  `~/.claude.json` are read by key and never printed whole. They name private projects, so they are
  pasted as a count and a sha256 of the sorted list, taken before the first capture and after the
  cleanup. Every prior key is still present after, and no scratch key is left. A key another live
  session adds meanwhile is named as such and kept.

  Scenario: the operator is told before their config is touched
    Given `~/.claude.json`'s projects keys are counted and hashed, and the result pasted
    When the builder reaches the first launch in a never-trusted scratch cwd
    Then the builder has said to the operator, before launching, which folders will be used, what may be written for them, and that it will be removed

  Scenario: login is recorded without spending a token or touching real config
    Given a scratch directory holding an empty `cfg` and an empty `cwd`
    When claude is launched in `cwd` with `CLAUDE_CONFIG_DIR` set to `cfg`, one Enter is sent once the theme picker is drawn, and the output is recorded until the login screen settles
    Then `login.json` holds the whole recording from the spawn, and its `claude` field is the version `claude --version` printed
    And rendered through `screen.mjs`, its frame is claude's sign-in screen, and nothing outside the scratch directory changed

  Scenario: trust is recorded as claude draws it, answered by nobody
    Given the operator's configured claude and a new scratch cwd that has never been trusted
    When claude is launched there, and the output is recorded until the trust dialog settles and the tree is killed
    Then `trust.json` holds the recording and its version
    And its rendered frame holds the menu rows ` ❯ No, exit`, highlighted, and `Yes, I trust this folder` below it, neither numbered

  Scenario: MCP approval is recorded on the dialog, never approved
    Given a second scratch cwd holding an `.mcp.json` naming one server `probe-mcp` whose command exits at once
    And that folder has been trusted by `ensureWorktreeTrusted`
    When claude is launched there and recorded until the MCP dialog settles, and the tree is killed
    Then `mcp-approval.json` holds that recording and its version, and its rendered frame names `probe-mcp` in a select menu
    And no key was sent to that launch

  Scenario: an arrow key moves the trust menu's highlight one item, in order, and answers nothing
    Given a third scratch cwd that has never been trusted, and the operator told
    When claude draws the trust dialog, and Down, Up and Down are sent in turn, each after the frame settles, and never an Enter
    Then the rendered highlight reads `Yes, I trust this folder`, then `No, exit`, then `Yes, I trust this folder`
    And the redraw each arrow caused, and the cursor-key mode the frame was in, are pasted in `VERIFICATION.md`

  Scenario: the operator's config is left as it was
    When the captures are done and the scratch projects entries are removed
    Then every projects key counted before the first capture is still present, no scratch key is left, and the count and hash are pasted
    And the scratch directories are deleted
