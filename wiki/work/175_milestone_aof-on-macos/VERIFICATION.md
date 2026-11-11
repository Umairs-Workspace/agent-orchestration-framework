---
doc: verification
---
# 175 · aof on macOS — Verification

## Verification evidence

### Environment — this MacBook (x86_64, macOS 24.6.0), 2026-10-29

- The milestone's work is **uncommitted on `main`** (43 paths dirty against `e2eba906`). Every lane
  below ran against the working tree, and the installed payload is stamped
  `e2eba906+dirty.20261029T102206`.
- **A stray process named `aof-mesh-desktop` (pid 87074) predates this session.** It is a copy of
  `/bin/sleep` (`cmp` identical) at
  `…/fae63f72-…/scratchpad/probe/aof-mesh-desktop 20`, started 2026-10-28 18:11 by the refine
  session's `MAXCOMLEN` probe. It is stuck in state `UE` (exiting, uninterruptible), so it cannot
  be signalled, and it matches `pgrep -x aof-mesh-desktop` until a reboot. Every `pgrep -x` reading
  below excludes it by pid (F-02).

### Automated lanes — `@executable` and the fitness functions

- **`node scripts/test-shard.mjs`** over the 13 suites that 175 adds or amends, under an isolated
  `AOF_GLOBAL_HOME`: FF-17501/02/03, `acd-cli-entry-executes`, `acd-source-directory-budget`,
  `install-local-desktop`, `yarn-installation`, and the six `test/mesh/desktop/*` suites. 160 cases,
  4 failures on the first run:
  - `yarn-installation/extracted kernels cannot import core…` — 175's own (F-01, fixed at verify).
    It is green on the re-run.
  - `yarn-installation/production packaging preserves…`, `…production workspaces retain…` and
    `…production closure includes…` — the `/var` vs `/private/var` realpath class STATE records
    as the Mac baseline. Measured, not assumed: the same file in a detached worktree at `HEAD`
    (`e2eba906`) fails exactly these three.
  `verifies → stories/00…/tasks/00, stories/01…/tasks/00-01, stories/02…/tasks/00-03, stories/03…/tasks/00-01`
- **`cargo test` in `apps/desktop` (the `crates/core` workspace)** — 140 passed, 0 failed,
  including all eight `reap::tests` (E1, E2, E3, E7, the grace and the plan over each state).
  `verifies → stories/00_story_quit-reaps-the-whole-tree-on-macos/tasks/00_the-reap-ladder-is-pure-and-in-core.feature`
- **Not run here: the app crate's Windows arm.** This laptop is in no mesh, so the Windows-side
  checks STATE defers to verify (the `--target-dir` equivalence from the 175/01 review, and
  Windows' left-click) could not be reached.

### 175/01 · the bundle and the payload on a real Mac

- **`PATH=~/.cargo/bin:$PATH node scripts/install-local.mjs --desktop`** — exit 0. It synced the
  payload, ran `cargo build --release` (38 s), ad-hoc signed the staged bundle, and placed
  `~/.aof/bin/aof-mesh-desktop.app`.
- **E6** — `~/.aof/bin/aof --version` answered `0.1.0 (payload e2eba906+dirty.20261029T102206)`,
  the `buildId` in `~/.aof/bin/BUILD_ID.json`. `which aof` still answered
  `~/.nvm/versions/node/v24.14.1/bin/aof`. No shell profile (`.zshrc`, `.zprofile`,
  `.bash_profile`) names `.aof/bin`, and none was modified (mtimes from 2023-2026-04).
- **The placed bundle verifies** — `codesign -v ~/.aof/bin/aof-mesh-desktop.app` exits 0, and
  `codesign -dv` reports `Identifier=com.aof.mesh.desktop`, `Signature=adhoc` and a thin x86_64
  Mach-O. The bundle carries no extended attributes, so it is not quarantined.
  `Contents/Info.plist` has `LSUIElement` `true`. Whether that leaves no Dock tile and no Cmd-Tab
  entry is judged at the laptop.
  `verifies → stories/01_story_install-local-builds-the-app-on-macos/tasks/02_the-bundle-on-a-real-mac.feature`

### 175/04 · the deploy rules carry a macOS section

- **Read `.claude/rules/build-deploy-restart.md` § "This MacBook — a standalone single-node mesh"**,
  checking each clause of the feature:
  - First-time setup names, in order: the Xcode command-line tools, rustup,
    `node scripts/install-local.mjs --desktop`, the `controlNode` nomination in
    `~/.aof/aof.config.json` with the id read from `aof mesh relay --json`, and
    `aof mesh desktop install --app-artifact ~/.aof/bin/aof-mesh-desktop.app --autostart`.
  - "Two halves of one deploy loop" says the npm-linked CLI needs no install and the daemons do.
    Deploy is `install-local --skip-ui`, with `--desktop` only for `apps/desktop/`.
  - Verify at the source names `--version` → `payload <buildId>`, `mesh status --json` →
    `isControlNode: true`, and the `env -i PATH="$P" HOME="$HOME" claude -p …` probe over the
    plist's PATH.
  - The restart is `aof mesh desktop stop && aof mesh desktop run`, "the one restart that is legal
    over SSH", ONLY with the LaunchAgent registered. Starting a daemon by hand over SSH is
    forbidden, because the session has no login keychain.
  - The gotchas carry the crash recovery (`pgrep -fl "aof mesh"`, `kill -TERM`, `run`) and the
    re-install after a Node bump.
- **`wiki/work/ROADMAP.md:120-124`** lists "Crash containment for the desktop app on macOS",
  deferred by 175/ADR-001 §5.
- **`apps/desktop/README.md:15-18, 28`** names the Xcode command-line tools and rustup for macOS
  beside MSVC and WebView2. Its install row names `aof-mesh-desktop.exe` and
  `aof-mesh-desktop.app`.
- **`aof mesh relay --json`** answers `"nodeId": "node-6eb3"`, `"nominated": false`. That is the
  id the nomination step reads, and the nomination is not yet written.
  `verifies → stories/04_story_the-mac-runbook-and-acceptance/tasks/00_the-deploy-rules-carry-a-macos-section.feature`

### 175/00 task 01 · exit paths on the running app (agent-run, 2026-10-29)

- **E4 · SIGTERM is a Quit** — `aof mesh desktop stop` sent SIGTERM to the app (pid 50188, then
  serving both daemons). Straight after, `pgrep -fl "aof mesh"` printed nothing, and launchd
  recorded `last exit code = 0`. The verb's own report misfired on the stray pid 87074 (F-06).
- **A quit Apple Event is a Quit** — `osascript -e 'quit app id "com.aof.mesh.desktop"'` exited
  0. Within one 0.5 s sample, neither `pgrep -x 'AOF Desktop'` nor `pgrep -fl "aof mesh"`
  matched anything, and launchd recorded `last exit code = 0`. Which `RunEvent` it arrives as
  (RESEARCH Q1) is not observable from outside. Both paths reaching the reap with code 0 is the
  measured part.
  `verifies → stories/00_story_quit-reaps-the-whole-tree-on-macos/tasks/01_every-exit-path-reaps-the-groups.feature`

### 175/03 · the preflight on a real Mac (agent-run, 2026-10-29)

- **The check agrees with what a supervised run sees.** The Claude Code CLI was installed (2.1.312,
  `~/.local/bin/claude`) and signed in by the operator. `aof mesh desktop install --autostart`
  reported `ok claude-authenticated` and `ok daemon-claude-authenticated` (after F-09). The
  deploy rules' probe, run with the plist's PATH and launchd's `HOME`, `USER` and `LOGNAME` only,
  printed `MESH_AUTH_OK`. Those are the variables `ps eww` shows on the live `mesh serve` process.
- **A stale LaunchAgent PATH is caught before a run burns.** The agent was registered from a shell
  whose PATH held no `claude`, and the preflight then read from the operator's own PATH:
  `ok claude-authenticated`, `FAIL daemon-claude-authenticated — claude is not on the
  LaunchAgent's PATH (…)`. The agent was then re-registered with the real PATH, which now reads ok.
  `verifies → stories/03_story_the-preflight-checks-the-mac/tasks/02_the-preflight-on-a-real-mac.feature`

### The live control node after login (agent-run, 2026-10-30)

- **The LaunchAgent parses and loads at login.** `plutil -lint` on the plist answers OK. After the
  operator's 13:32 login, `launchctl print gui/501/com.aof.mesh.desktop` showed the job running,
  started by launchd at 13:33:05.
- **Nothing survived the logout.** Every `aof` process listed after the login started after it:
  the app, `mesh ui` and `mesh serve --serve`, at 13:33, 13:38 and 15:43.
- **`stop` then `run` is a restart.** It was run at 13:38 to deploy F-14. `mesh serve` printed a
  new `daemon-started … build payload c81c3b89+dirty.20261030T133830` line, and `mesh ui`
  printed its own. The same build came back again at 15:43, from a restart this session did not
  make.
- **A supervised run would authenticate.** `claude auth status`, run with the plist's PATH and
  launchd's `HOME`, `USER` and `LOGNAME` only, answered `loggedIn: true` (`claude.ai`). Those are
  the variables `ps eww` shows on the live `mesh serve`.
- **The fleet is this one node.** `aof mesh status --json` answers `isControlNode: true` and
  nodes `['node-6eb3']`, and `http://127.0.0.1:4181/?mode=fleet` answers 200. `degrade.log` holds
  no line since the F-14 deploy.
  `verifies → stories/02_story_the-desktop-verbs-run-the-app-on-macos/tasks/04_the-verbs-on-a-real-mac.feature, stories/04_story_the-mac-runbook-and-acceptance/tasks/01_a-mac-goes-from-clone-to-a-supervised-fleet.feature (E1, E2, E5)`

### Not run on this laptop, and why

- **The acceptance bar is the operator's (2026-10-30):** "As long as it works as the control
  node here that is enough."
- **The SSH scenarios are descoped by the operator.** They are 02/04 "from SSH, run brings the app
  up inside the login session" and 04/01 E6. The operator: "Forget ssh." The requirement came from
  the Mac mini's SSH-spawned daemons (`.claude/rules/build-deploy-restart.md`, the Mac worker
  section), and this laptop is reached by nobody over SSH. The `run` refusal without a LaunchAgent
  stays covered by `@executable` (02/01 E7). The runbook's SSH clause is not measured live.
- **04/01 E5, "a supervised run started from the board reaches its first turn"**, has no run on
  record. It is stood in for by the daemon-environment auth probe above, which is the failure the
  scenario exists to catch, under the operator's bar.
- **00/01 E7, a declaration's Stop at its tree-kill rung,** was not run live: no supervised work
  loop is declared on this laptop. The reap's E7 case is green in `cargo test` (`reap::tests`).
- **00/02, the icon in every state.** Healthy was confirmed in Light and Dark. Degraded was seen in
  Light (the F-03 flashing). Dark-degraded and Light-stopped were not looked at. The menu's header
  region was confirmed in E8, and its "1 online" text was not recorded separately.
- **The Windows side:** 00/02 "Windows still shows the window on a left-click" and the app crate's
  `--target-dir` equivalence (175/01 review). This laptop reaches no Windows node.

## User sign-off

- **2026-10-29, the operator at this laptop**, after the F-03 to F-05 and F-08 fixes, on payload
  `3f4221c6`, with the app started through launchd:
  - **175/00 task 02 E8**, a left-click opens the menu: it stays open, holding header, Stop mesh,
    Open web UI, Show window, a separator and Quit, in order, and Show window opens the window.
    Confirmed.
  - **175/01 task 02**, the bundle runs with no Dock tile and no Cmd-Tab entry. Confirmed.
  - **F-05**, System Settings → Login Items lists the background item as "AOF Desktop".
    Confirmed.
  - **175/00 task 01 E6**, the window's ✕ hides the window while the menu-bar icon stays.
    Confirmed.
  - **175/00 task 02**, the menu-bar icon reads in both Light and Dark appearance. Confirmed.
  - **175/00 task 01 E1, 175/04 task 01 E3**, Quit from the menu-bar menu: the operator quit.
    Straight after, `pgrep -x 'AOF Desktop'` and `pgrep -fl "aof mesh"` printed nothing, and
    launchd recorded `last exit code = 0`.
  - **The window's node row** with the real hostname overlapped its chips (F-12, reported by the
    operator with a screenshot).
- **2026-10-30, the operator at this laptop**, on payload `04cf7a79` with the rebuilt app:
  - **F-13 / DESIGN M3 + M4**, the window after the badge, control-bar and title-bar fix: the
    badges share one line, the hostname shows whole, and the window has native traffic lights.
    "That's looking better now." Confirmed.
  - **175/04 task 01 E5, 175/00 task 01 E5, 175/02 task 04 (login)**: the operator logged out
    and back in at 13:32, with no terminal opened. launchd started the app at 13:33:05 (`runs = 1`
    in the new session's `gui/501` domain, `state = running`), and both daemons started on payload
    `04cf7a79` (`daemon-started` at 13:33:11 and 13:33:13). `aof mesh status --json` answered
    `isControlNode: true` with nodes `['node-6eb3']`. The operator: "Logging out and logging in
    worked." Confirmed.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-17501 | `test/arch/ui/acd-desktop-reaps-process-groups.test.mjs` | GREEN (4/4) | Replaced `cmd.process_group(0);` at `supervisor.rs:1001` with a comment: `not ok … every supervised spawn leads its own process group on unix`, with `'supervise_child sets no #[cfg(unix)] cmd.process_group(0)'`. Restored, and `cmp` identical. |
| FF-17502 | `test/arch/mesh/acd-desktop-layout-one-home.test.mjs` | GREEN (3/3) | Appended `const PROBE_BUNDLE = "aof-mesh-desktop.app";` to `desktop.mjs`: `not ok … the desktop app's names are spelled only in the layout module`, with `no module spells a name the layout owns`, `{ file: 'packages/mesh/src/commands/desktop.mjs', found: ['/aof-mesh-desktop\\.app\\b/'] }`. Restored, and `cmp` identical. |
| FF-17503 | `test/arch/mesh/acd-autostart-is-one-injected-runner.test.mjs` | GREEN (8/8) | Changed `stopDesktopApp`'s `kill("kill", ["-TERM", …])` (`desktop.mjs:621`) to `"-KILL"`: `not ok … the darwin stop path sends no SIGKILL`, with `async function stopDesktopApp sends no SIGKILL`. Restored, and `cmp` identical. |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `yarn-installation/extracted kernels cannot import core…` went red. 175/03 added `import os from "node:os"` (for `os.homedir()`, `desktop-preflight.mjs:717`), but the mesh allow-list row for `commands/desktop-preflight.mjs` (`test/bundle/yarn-installation.test.mjs:179`) still named only `node:fs/promises`, `node:child_process` and `node:path`. 175/03's build note lists the ledgers a gate named, and this gate never ran in that story's lane. The recall names the same class with a different module twice before: m145/F-145-01 (`node:fs` in `export.mjs`) and m172/F-172-03 (`node:child_process` in `conversation-session.mjs`). This is a distinct incident of a recurring class, not a duplicate. | defect | high | blocker. Fixed at verify, as m172/F-172-03 was: `node:os` is admitted on the row, as on its siblings `desktop.mjs` and `desktop-layout.mjs`. The existing boundary case is the regression scenario, so no new `@bug` scenario is needed. Re-run green. | product-owner (verify) / 175/03 | closed |
| F-03 | On the first real `run`, the icon flashed degraded. `mesh serve --serve` refused with `fabric-undeclared` and the supervisor restarted it about once a second (new pids every 1-2 s), because the runbook's step 3 nominated the control node but declared no `mesh.fabric`. Nothing in 175's ADRs names the fabric. | defect | high | blocker. Fixed at verify (`61c6562b`): step 3 declares `"fabric": "direct", "address": "127.0.0.1"`, as the operator chose (loopback, no peers), and says why. Measured: serve listens on `127.0.0.1:4182` and stays up. | product-owner (verify) / 175/04 | closed |
| F-04 | The menu-bar menu closed within seconds of a click. `rebuild_tray` (`main.rs`) called `tray.set_menu` with a fresh menu on every refresh (each 3 s poll and every child transition), and `tray-icon` 0.24.1's macOS `set_menu` calls `NSStatusItem.setMenu`, which dismisses a menu that is open. Windows builds its menu at right-click time, so it never showed there. | defect | high | blocker. Fixed at verify (`61c6562b`): the core's `tray_menu::menu_needs_replacing` decides, and the menu is replaced only when its descriptor changes, the icon only when its glyph does. Two new core cases (`an_unchanged_menu_is_not_replaced`, `a_changed_menu_is_replaced`), 142/142 green. The operator re-checked E8 on the running app on 2026-10-29: the menu stays open, its regions are in order, and Show window opens the window. | product-owner (verify) / 175/00 | closed |
| F-05 | The operator asked for the Background Items entry to read "AOF Desktop". It reads `aof-mesh-desktop`: `sfltool dumpbtm` lists the job as a `legacy agent` named after its executable. Adding `AssociatedBundleIdentifiers` to the plist and naming the bundle "AOF Desktop" (`61c6562b`) did NOT change it. Measured after a re-register (new BTM UUID): still `legacy agent`, `Name: aof-mesh-desktop`. macOS attributes a job to its app only under a shared Developer Team ID, and an ad-hoc-signed app has none. | enhancement | medium | The operator chose the rename. Fixed at verify (`3f4221c6`): the bundle's executable is `AOF Desktop` (11 characters, inside MAXCOMLEN), with ADR-002 §2 amended and FF-17502 widened (its red probe trips on a planted `"AOF Desktop"`). The bundle directory, bundle id, label and Windows names are unchanged, and linux keeps its `pgrep` name. The operator confirmed on 2026-10-29 that Login Items reads "AOF Desktop". | product-owner (verify) / 175/02 | closed |
| F-06 | `aof mesh desktop stop` matched the stray pid 87074 (F-02) by `pgrep -x aof-mesh-desktop`, as well as the real app. It SIGTERMed both: the real app quit (exit 0, nothing left under `pgrep -fl "aof mesh"`). Then it waited 20 s on the stray and reported a failure naming only it. `stop` identifies the app by process name, not by the installed bundle's executable path. | defect | low | non-blocker. Backlog: match the executable path. | backlog | open |
| F-07 | There is no `claude` CLI on this laptop (only the VS Code extension's bundled binary and Claude.app). Both the terminal's and the LaunchAgent's PATH miss it, and the preflight says so: `claude-authenticated` FAIL, `daemon-claude-authenticated` FAIL. Every supervised run would die at spawn. | test-gap | high | blocker for 03/02's first scenario and 04/01 E5/E6 (environment). The operator installed the Claude Code CLI 2.1.312 into `~/.local/bin` and signed in on 2026-10-29. Both preflight checks read ok. | operator | closed |
| F-08 | After the rename, `install --autostart` rewrote the plist, but `aof mesh desktop run` kickstarted the job launchd still had loaded, which pointed at the old executable path. The spawn failed (`last exit code = 78: EX_CONFIG`, `job state = spawn failed`), while the kickstart exited 0, so `run` reported "Started". A loaded job keeps its loaded definition until the next login, so the runbook's own re-install after a Node bump would hit the same trap. | defect | high | blocker. Fixed at verify (`6d4dd410`): a job that is loaded but not running, with a plist on disk, is booted out and bootstrapped from that plist. A running job is still kickstarted. New case `175/F-08 · a loaded but stopped job is booted out and bootstrapped…`, and the desktop suites are 125/125. Measured: `run` then started `…/MacOS/AOF Desktop` (pid 6732) with both daemons. | product-owner (verify) / 175/02 | closed |
| F-09 | With `claude` signed in, the daemon probe still read it as logged out. Both the preflight's `daemon-claude-authenticated` (env exactly `{ PATH, HOME }`) and the deploy rules' `env -i PATH HOME` probe got `loggedIn: false` / "Not logged in". `claude` finds its macOS sign-in in the login keychain under account `$USER` (`security find-generic-password -s "Claude Code-credentials"` → `acct umairbutt`), and launchd DOES set `USER` and `LOGNAME` for the job (`ps eww` on `mesh serve`). So the real daemons were authenticated, and the probes reported a false FAIL. | defect | high | blocker. Fixed at verify: the probe's env is launchd's `{ PATH, HOME, USER, LOGNAME }` (a `user` seam, default `os.userInfo().username`, in `PREFLIGHT_SEAMS`). FF-12607's 175 leg, the E8 case, ADR-004 §4, both task contracts and the runbook's probe line are amended. Red probe: the old `{ PATH, HOME }` trips both the leg and E8. Re-run 125/125 green. | product-owner (verify) / 175/03 | closed |
| F-10 | With serve up and `isControlNode: true`, the fleet listed no nodes (`aof mesh status --json` → `"nodes": []`), where 04/01 E1 expects this one. `nodes` is read only from `~/.aof/mesh/nodes/*.json` (`identity.mjs:358`, `store.mjs:138-156`), and only `aof mesh identity` writes the control node's own record (`identity.mjs:243-257`). Presence only decorates an existing entry. The runbook's setup never names that command, and without the record `ui-serve.mjs:560, :702` refuse to start a session or dispatch from the board, which 04/01 E5 needs. | defect | high | blocker. Fixed at verify: the runbook's step 3 now publishes the record with `aof mesh identity`, and says why. Run on this laptop: `nodes/node-6eb3.json` (host `127.0.0.1`), and the fleet lists `node-6eb3`, fresh and local. Its `runtimes: []` (from a `runtimes` config key the global config lacks) is display-only, and no routing reads it. | product-owner (verify) / 175/04 | closed |
| F-11 | `mesh serve`, started by launchd with cwd `/`, logs `mesh-global-disabled … workspace 8a5edab282632443 … path "/"` every 15 s. The cwd-derived workspace identity takes `/` as a workspace. | defect | low | non-blocker, out of SPEC scope (TECH_DEBT 4). The operator asked for TECH_DEBT 4 to be fixed (2026-10-30). Parts A–D landed as their own commits, each with a red-probed case: A `be93f5dd` removes this warning (a folder with no config is asked before the enable arm); B `946f7472`; C `95c235a8`; D `13b4dc14`, which also fixes TECH_DEBT 21. Part E (rekeying duplicate ids) is the backlog milestone `workspace-id-rekey`. | product-owner (verify) / TECH_DEBT 4 | closed |
| F-12 | The window's node row with this laptop's hostname (`MacBookPro.communityfibre.co.uk`): the name overflowed its fixed 212 px column and ran under the `this node` chip, the `control` badge and the version (operator screenshot, reproduced by a fixture render). `.node-name` was `white-space:nowrap` with no overflow handling. The m36 mock assumed short ids. | design-gap | medium | The DESIGN rule came first: 175 DESIGN Surface M3 says a long name truncates with an ellipsis, shows in full on hover, and the chip, badge and version never move. Then the fix: `.node-title`/`.node-name`/`.node-sub` truncate, and the chip is `flex:none`. Rendered before and after at 800 px with headless Chromium 1243 over the window's own fixture with the long hostname: before overlaps; after reads `MacBookPro.commu…` beside a whole THIS NODE chip, with CONTROL and the version in their columns. | product-owner (verify) + designer rule / 175/00 | closed |
| F-13 | After F-12 the window still looked wrong on the Mac (operator screenshot). The THIS NODE chip sat on the name's line, higher than the CONTROL badge centred on the row, and the two had different boxes. The 212 px name column truncated the hostname with half the row empty. The control bar's pill (≈22 px), toggle (25 px) and button (≈26 px) differed in height. The summary read `1 nodes`. The title bar drew Windows –/☐/✕ caption buttons on macOS. | design-gap | medium | The DESIGN rules came first: Surface M3 is amended (one centred badge group, a flexible name column, one 26 px control height) and Surface M4 is added (native traffic lights on a Mac). Then the fix, in `apps/desktop/ui` and a new `crates/app/tauri.macos.conf.json` (Overlay title bar, hidden title, traffic lights at 14,13). Rendered at 800 and 1280 px in light and dark with headless Chromium 1243 over the fixture with the long hostname: the badges share one centre line, the hostname shows whole, no control-bar label wraps. The traffic lights are a native window feature that a headless render cannot show, so the operator's look at the live window is the check. | product-owner (verify) + designer rule / 175/00 | closed |
| F-14 | After the login check, `degrade.log` held `work-tree-watch-unavailable` (`ENOENT … watch '/wiki/work'`) at every `mesh serve` start since 2026-10-29 19:16, and `work-read-cache-unavailable` for workspace `8a5edab282632443` every 15 s (78 to 109 lines an hour). That id is `sha256('/')`: launchd's cwd. F-11 kept the SYNC pass off a folder with no aof config, but the launcher's tick set (`resolveAggregationWorkspaces`) still added the launch folder, so presence read its items through the cache every tick and the work-tree watch was armed on it. Not a regression of TECH_DEBT 4: the same cause, one layer on. | defect | low | non-blocker, fixed at verify, as F-11 was. The "has its own aof config" test now has one home, `hasOwnWorkspaceConfig` in `workspace-identity.mjs`. The publisher's decision asks it, and the launcher's tick set leaves the launch folder out when it fails (a launch workspace with no projectRoot to check is unaffected, as in the publisher). New case "175/F-14 · a launch folder with no aof config is not in the tick's set…" in `mesh-launcher-syncs-every-workspace`. Red probe: the old unconditional `addWorkspace(ws.workDir, …)` makes presence list `launch/wiki/work` three times. 40/40 green, and the presence, launcher, clone-pin, identity, sync-coverage and walker suites are green (87 cases; the 3 failures are the known `yarn-installation` `/var` realpath baseline). The bundle allow-list gains `node:fs` for `workspace-identity.mjs`. | product-owner (verify) / 175/02 | closed |
| F-02 | A renamed `/bin/sleep` called `aof-mesh-desktop` (pid 87074), left by the refine session's `MAXCOMLEN` probe, is stuck in state `UE` and matches `pgrep -x aof-mesh-desktop`. 175/04 E4's "straight away `pgrep -x aof-mesh-desktop` prints nothing" cannot read clean on this laptop until a reboot. | test-gap | low | non-blocker. Environmental: readings exclude pid 87074. A process lesson for the retrospective: a probe named like the product must not outlive its session. | retrospective (175/R2) | closed |

## Accept decision

**Accepted 2026-10-30** (product-owner, `aof:verify 175`).

- Stories 00 to 04 accepted, each with its `OUTCOME.md` and `RETROSPECTIVE.md`.
- FF-17501..17503 are green, each with its red probe.
- `aof work validate 175`: PASS. `aof work doctor 175`: no error and no `control-unresolved`.
- No blocker is open. F-01, F-03, F-04, F-05, F-07, F-08, F-09 and F-10 were blockers, and all
  are closed. F-06 is open, routed to the backlog.
- The bar is the operator's: this laptop works as its own control node. The SSH scenarios are
  descoped, and the items not run here are listed under `### Not run on this laptop, and why`.
- Regression gate: not run here. Accepted through an environment `--gate-override`, with the
  reason recorded in `REGRESSION.md`. The whole tree cannot run on this laptop, because the deploy
  rules forbid it while the live control daemon holds `:4182`. The tree is also red here on the
  `/var` realpath baseline (178's gate row at `30b763b4`). 175's own suites are green apart from
  the three `yarn-installation` realpath cases, which fail identically at `e2eba906`, before 175.
- Not done at triage: the memory recall was recorded for F-01 only. F-03 to F-14 were triaged
  without a recorded recall observation.
