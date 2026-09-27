---
type: story
number: 04
slug: the-installer-fixes-the-daemon-environment
title: "The installer fixes the daemon environment — login autostart through one injected runner, a coded refusal off Windows, and a preflight the verbs report rather than repair"
parent: 126
depends: []
status: done
owner: product-owner
created: 2026-09-08
updated: 2026-09-09
adrs: [ADR-007]
reads:
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-005
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-007
  - wiki/work/36_milestone_mesh-desktop-app/ARCHITECTURE.md#ADR-003
  - .claude/rules/build-deploy-restart.md
  - src/commands/mesh/face-shared.mjs
  - src/build-info.mjs
  - src/mesh/presence.mjs
  - src/workspace-identity.mjs
  - src/workspace.mjs
  - src/spine/face.mjs
  - src/command-core.mjs
  - src/global-work-store.mjs
  - src/node-identity.mjs
  - src/work.mjs
  - wiki/work/TECH_DEBT.md
  - test/support/source-slice.mjs
  - test/mesh/desktop/mesh-desktop-stop.test.mjs
  - test/mesh/desktop/mesh-desktop-dispatch.test.mjs
  - test/arch/mesh/acd-mesh-command-cli-bijection.test.mjs
files:
  - src/commands/mesh/desktop.mjs
  - test/mesh/desktop/mesh-desktop-install.test.mjs
  - test/mesh/desktop/mesh-desktop-run.test.mjs
  - test/mesh/desktop/mesh-desktop-autostart.test.mjs
  - test/mesh/desktop/index.mjs
  - test/support/mesh-desktop-fixture.mjs
  - test/arch/mesh/acd-autostart-is-one-injected-runner.test.mjs
  - test/arch/mesh/index.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 04 · The installer fixes the daemon environment

## User story

As **the operator of the control node**,
I want **`aof mesh desktop install --autostart` to register the supervisor to start at my login —
idempotently, through one injected runner, refusing by code on a platform it cannot do it on — and
both `install` and `run` to tell me whether the environment those daemons will inherit is fit: that
`claude` resolves and is authenticated, which payload build is installed, and whether every
workspace on this node carries its own pinned identity**,
so that **power on, log in, and declared work resumes — with no operator command — and when it will
not, the reason is a line on the install rather than a burned run record hours later**.

A Windows service is refused on the measured basis, not deferred: session 0 has no login session,
`claude` there is unauthenticated, and every supervised loop would start and die on auth in exactly
the shape the backoff reads as a flapping child. The login session is the requirement, and the
`HKCU\…\Run` key is the ordinary surface that meets it. The preflight repairs nothing — each check
reports pass or fail with a code, and TECH_DEBT item 4's cwd-derived identity is stated here as a
check while its fix at the spawn is `126/02`'s.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_autostart-is-a-flag-on-install.feature` — `--autostart` and `--no-autostart` on the
      existing verb; no fifth `mesh:desktop-*` command; the value is the absolute path of the
      installed app; writing twice and removing an absent value are both successes
- [x] `tasks/01_the-registry-is-reached-through-one-injected-runner.feature` — every registry path
      goes through the injected runner the way `stop` reaches `tasklist`; `--dry-run` writes
      nothing; nothing in CI touches the real hive
- [x] `tasks/02_off-windows-is-a-coded-refusal.feature` — `autostart-unsupported-platform` naming
      the platform, non-zero, never a silent success, over an injected platform
- [x] `tasks/03_the-preflight-is-reported-not-repaired.feature` — three checks by code (`claude`
      resolvable and authenticated; the installed build; every workspace's pinned id), reported by
      both `install` and `run`, writing nothing on any path
- [ ] `tasks/04_the-real-key-on-this-machine.feature` — `@manual`: one write, one OS read-back, one
      removal on the control node's own Run key, and a login that starts the supervisor

## Notes

**Independent by write set and by capability.** `src/commands/mesh/desktop.mjs` has five dependents
and imports one module; nothing else in this milestone touches it. The story shares
`test/arch/mesh/index.mjs` with `126/02` — each appends its own control — and the ready-wave
partition serialises that; it is not a dependency and is not drawn as one.

**The end-to-end "power on, log in, work resumes" is the milestone's verification, not this
story's.** It needs `126/03`'s reconciler and `126/02`'s answer; this story's own acceptance is the
autostart entry, the refusal and the preflight, each provable over injected seams on any host.

**The bijection gate spawns this verb with `--json`** (TECH_DEBT item 20's lesson, inherited by any
machine-wide act): `--dry-run` exists so a probe never performs the act it names. The `install`
verb's existing artifact refusals are unchanged and still fire first.

**The preflight's workspace check reads the key, not the resolver** (found at the feasibility beat).
`resolveWorkspaceId` falls through to the path derivation, so every workspace would read as pinned;
`loadWorkspace` merges the machine-wide mesh config over the workspace's own and carries the one
sanctioned load-time identity WRITE (`healIdentitySidecar`), which can land under a project root.
The check reads `workspacePaths(projectRoot).configPath` directly and reads the node id through
`readSidecar` over the global identity path — no walk up, no mint, no heal. That is why
`src/work.mjs` and `src/node-identity.mjs` are in `reads:`.

**One pre-existing defect to fix in this story at build, not to ledger.** `installDesktopApp` renames
the staged exe over the placed one; when the app is running, Windows' execute lock makes that fail,
and the verb reports `install-dir-not-writable` — a permissions message for a cause that is not
permissions. `scripts/install-local.mjs` already rotates a running binary to a timestamped `.bak`
before placing. The builder adopts that rotation here (the blast radius is one function in this
story's own file) and names the real cause; the `@manual` feature carries the stop-the-supervisor
precondition until then. Two more facts from the same pass: `--dry-run` keeps the artifact refusals
(a dry run that cannot name what it would install has nothing to report, and the bijection probe's
behaviour stays identical), and `~/.aof/bin/launch-desktop.cmd` is a hand-made cwd-pinning shim
nothing in the repository writes — the Run value names the exe, per ADR-007 §1, and the daemons'
cwd is pinned by `126/03` instead.

**`scripts/install-local.mjs` gains nothing.** It is the dev deploy for this checkout; the verb is
the operator-facing act on an installed tree.
