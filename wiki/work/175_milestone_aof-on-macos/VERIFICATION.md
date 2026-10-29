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
| F-02 | A renamed `/bin/sleep` called `aof-mesh-desktop` (pid 87074), left by the refine session's `MAXCOMLEN` probe, is stuck in state `UE` and matches `pgrep -x aof-mesh-desktop`. 175/04 E4's "straight away `pgrep -x aof-mesh-desktop` prints nothing" cannot read clean on this laptop until a reboot. | test-gap | low | non-blocker. Environmental: readings exclude pid 87074. A process lesson for the retrospective: a probe named like the product must not outlive its session. | retrospective | open |
