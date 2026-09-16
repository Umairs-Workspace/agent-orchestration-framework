# 126/04 · The installer fixes the daemon environment — Outcome

## Delivered

### Login autostart is a flag pair on the existing install verb
`aof mesh desktop install --autostart` writes one `REG_SZ` value named `aof-mesh-desktop` under
`HKCU\Software\Microsoft\Windows\CurrentVersion\Run` whose data is the absolute path of
`aof-mesh-desktop.exe` in the resolved install dir; `--no-autostart` removes it. Writing twice yields
one entry and two successes, and removing an absent value succeeds. `listCommands()` still holds
exactly `mesh:desktop-install`, `mesh:desktop-run` and `mesh:desktop-stop` — there is no fourth
`mesh:desktop-*` command. `--autostart` together with `--no-autostart` is the coded refusal
`autostart-flags-conflict`, raised on the input before any act.

### Every registry path goes through one injected runner
`src/commands/mesh/desktop.mjs` contains no un-injectable `reg`, `spawnSync` or `execFile` call at
all; `reg` is only ever an argument handed to the injected runner, the shape `stop` already uses for
`tasklist`. Both invocations carry `/f`, so neither can prompt a child that has no console to answer.
CI never touches a hive.

### Off Windows the answer is a coded, non-zero refusal
`admitAutostartPlatform` admits exactly `win32` and answers `autostart-unsupported-platform` naming
the platform for every other value — for `--no-autostart` as well as `--autostart`, since a removal
that silently succeeds where no entry could exist is the same lie in the other direction. The platform
is an argument at the act, never a `process.platform` read inside it, so both branches run on any
host.

### `--dry-run` covers the whole verb
`--dry-run` is new on `install` and performs nothing — no placement and no registry write — while its
render still names both what would be installed and what would be written. The verb's existing
artifact refusals are unchanged and still fire first, so the CLI-bijection gate can spawn this verb
without performing the act it names.

### A three-check preflight both verbs report and neither repairs
`PREFLIGHT_CHECKS` is `["claude-authenticated", "payload-build", "workspace-identity-pinned"]`,
reported identically by `install` and by `run`, writing nothing on any path — no config, no minted
identity, no registry runner. `claude-authenticated` parses `loggedIn` from `claude auth status`'s
JSON on stdout rather than its exit code, which is 0 either way, and spawns no session.
`payload-build` reads the launcher's own mode and fails an `embedded` launcher by name.
`workspace-identity-pinned` reads `workspacePaths(projectRoot).configPath` directly and the node id
through `readSidecar` over the global identity path — no walk up, no mint, no heal — so a workspace
that only resolves by path derivation reads as unpinned. A failing check refuses neither verb.

### A running app is named as a running app
`moveInPlace` rotates a locked target to `<name>.bak.<ts>` before placing, the way
`scripts/install-local.mjs` already does, and refuses `desktop-app-running` naming the real cause and
the verb that fixes it if even that fails. The pre-existing `install-dir-not-writable` — a permissions
message for a cause that is not permissions — is gone from that path.

## Assumptions

- **A login session is the requirement, not a service** — `HKCU\…\Run` runs the supervisor in the
  operator's own interactive session, where `claude` is authenticated. A Windows service would run in
  session 0 with no login session and every supervised loop would start and die on auth.
- **`claude auth status` emits JSON on stdout** — the check fails closed if the output cannot be read
  as JSON, so an unparseable answer is a FAIL rather than a pass.
- **The projection store can be enumerated** — an unenumerable node is a FAIL for
  `workspace-identity-pinned` rather than a pass, so "no workspaces answered" is never read as "all
  workspaces are pinned".

## Gaps

### The preflight reports the daemon environment; it does not fix it
- **Status:** open
- **Discharge condition:** an item makes workspace identity independent of cwd (TECH_DEBT item 4), at
  which point `workspace-identity-pinned` has nothing left to report.
Each check names a fault and writes nothing. `workspace-identity-pinned` states TECH_DEBT item 4 as a
check while the fix at the spawn is `126/02`'s row `cwd`; a workspace that is unpinned stays unpinned
after a green install.

### The two seeded daemons inherit the logon cwd under autostart
- **Status:** open
- **Discharge condition:** `126/03`'s open gap is discharged — the daemons' `current_dir` is ratified
  one way or the other.
Autostart is exactly the surface that creates this: the app starts at logon with the logon working
directory, and `126/03`'s delivered contract gives the two seeded daemons `cwd: None`. Every
DECLARATION spawn carries its own `cwd`, and `mesh-workspace-unconfigured` still refuses publishing
from a non-workspace cwd, so the residue is narrow and is not nothing.
