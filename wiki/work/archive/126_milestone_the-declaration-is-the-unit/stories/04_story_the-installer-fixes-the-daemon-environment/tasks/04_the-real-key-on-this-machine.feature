@manual @cli @distribution @adapter
Feature: The real key on this machine — one write, one read-back, one removal, on the control node's own Run key

  Every other scenario in this story runs over a fake runner so CI never touches a hive. This one
  is the act itself, once, on the machine it was built for, with the evidence read back through the
  operating system rather than through the code that wrote it. The measured baseline (2026-09-08):
  ten `REG_SZ` entries under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, none of them
  aof's; `reg query … /v aof-mesh-desktop` and `reg delete … /v aof-mesh-desktop /f` both answer
  `ERROR: The system was unable to find the specified registry key or value.` on STDERR with an
  EMPTY stdout and exit 1, and the probe left the key at ten. `reg query` prints the data verbatim,
  so the read-back below asserts the path exactly as it was stored.

  Run it only on the Windows control node, with the payload installed by `node
  scripts/install-local.mjs` and the app already placed in `~/.aof/bin`. Take the baseline capture
  FIRST — the last step diffs against it.

  THREE THINGS THIS PROCEDURE NEEDS, each measured or read at this beat:

  · `MSYS_NO_PATHCONV=1` on EVERY `/`-switch command under Git Bash — not only `reg … /v`, which
    answers `ERROR: Invalid syntax.` without it, but `tasklist /v`, which answers
    `ERROR: Invalid argument/option - 'V:/'.` (measured; both are clean with the variable set).
  · The artifact flags, because the verb's existing artifact refusals fire first (ADR-007 §1's
    ergonomics, accepted): both runs hand it the already-placed pair as their own artifacts —
    `--app-artifact ~/.aof/bin/aof-mesh-desktop.exe --bootstrapper-artifact
    ~/.aof/bin/MicrosoftEdgeWebview2Setup.exe` — a re-install of the same bytes, plus the act under
    test.
  · The supervisor STOPPED for both install runs. `installDesktopApp` renames the staged exe over
    the placed `aof-mesh-desktop.exe` (`moveInPlace`, `src/commands/mesh/desktop.mjs:208-216`) and
    Windows holds an execute lock on a running image, which would surface as
    `install-dir-not-writable` — a refusal about permissions, for a cause that is not permissions.
    Confirm with the `tasklist` command below and, if it is up, quit it from the tray or
    `aof mesh desktop stop` first.

  ADR-007 §1, §5. FF-12607. TECH_DEBT 20.

  Scenario: the value is written, read back by the OS, and removed
    Given a baseline capture of `reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run"` holding ten entries, and the supervisor not running
    When `aof mesh desktop install --autostart` runs on the control node with both artifact flags
    Then `reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v aof-mesh-desktop` exits 0
    And it prints one line of `    aof-mesh-desktop    REG_SZ    <the absolute path of the installed aof-mesh-desktop.exe>`
    And that path is the one `aof mesh desktop install` reported, character for character
    And the render's preflight lines report `claude-authenticated` pass on this machine
    When `aof mesh desktop install --no-autostart` runs with the same artifact flags
    Then the same `/v aof-mesh-desktop` query exits 1 with `ERROR: The system was unable to find the specified registry key or value.` on stderr
    And a fresh full capture of the key differs from the baseline in no line

  Scenario: a login starts the supervisor in the operator's own interactive session
    Given the value written and the operator signs out and back in
    When the desktop reaches the tray with no operator command
    Then `MSYS_NO_PATHCONV=1 tasklist /v /FI "IMAGENAME eq aof-mesh-desktop.exe" /FO LIST` lists it with `Session Name: Console` and a non-zero `Session#`, never `Services` and never session 0
    And the newest `"code":"daemon-started"` line in the JSONL at `~/.aof/mesh/logs/mesh-serve.log` reads `mesh serve running (node <nodeId>, build payload <buildId>)` for the installed build
    And that `buildId` matches the `buildId` in `~/.aof/bin/BUILD_ID.json`
    But neither `aof --version` nor the fleet roster's build is accepted as the evidence — both re-read the stamp and report the INSTALLED payload while a daemon still holds the previous module graph (TECH_DEBT 20)
