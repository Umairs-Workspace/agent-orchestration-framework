---
type: story
number: 03
slug: the-preflight-checks-the-mac
title: "The preflight names the macOS prerequisites and probes `claude` in the daemons' own environment"
parent: 175
status: done
owner: product-owner
created: 2026-10-28
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
depends: [02]
reads: [wiki/work/175_milestone_aof-on-macos/ARCHITECTURE.md#adr-004, wiki/work/175_milestone_aof-on-macos/RESEARCH.md, packages/mesh/src/commands/desktop-layout.mjs, packages/mesh/src/commands/desktop-launch-agent.mjs, packages/mesh/src/commands/desktop.mjs, packages/core/src/application/bindings/commands/mesh/desktop-preflight.mjs, test/mesh/desktop/mesh-desktop-preflight-heartbeat.test.mjs, test/support/source-slice.mjs]
files: [packages/mesh/src/commands/desktop-preflight.mjs, test/mesh/desktop/mesh-desktop-preflight-macos.test.mjs, test/mesh/desktop/index.mjs, test/mesh/desktop/mesh-desktop-install.test.mjs, test/mesh/desktop/mesh-desktop-run.test.mjs, test/arch/mesh/acd-autostart-is-one-injected-runner.test.mjs]
---
# 03 · The preflight checks the Mac

## User story

As **the operator setting up a Mac**,
I want **`install` and `run` to tell me what my Mac is missing: build tools, a quarantined app,
or a `claude` the daemons cannot find or that is signed out in their environment**,
so that **I learn about a run that would die on auth before it burns a run, and not from a
run record afterwards.**

## Tasks

- [x] [00 · On macOS the preflight adds its prerequisite checks](tasks/00_the-mac-adds-its-prerequisite-checks.feature)
- [x] [01 · The daemons' `claude` is probed in the daemons' own environment](tasks/01_the-daemons-claude-is-probed-in-their-environment.feature)
- [ ] [02 · The preflight on a real Mac](tasks/02_the-preflight-on-a-real-mac.feature)

## Notes

- **`PREFLIGHT_CHECKS` stays the four,** so FF-12607's literal leg and Windows' answer are
  untouched. The darwin checks are their own frozen list, appended when the platform is
  `darwin`. The platform reaches the preflight as a seam, `ctx.platform` through
  `preflightSeams`.
- **A check that does not apply has a third status, `skip`,** rendered `--`. It is used only by
  `daemon-claude-authenticated` when no LaunchAgent is registered. It is never a pass, because
  nothing was probed.
- **The suites that pin the preflight's answer** (`mesh-desktop-install`, `mesh-desktop-run`)
  get an explicit `platform: "win32"` in their preflight context. Otherwise they would change
  answer when run on a Mac host.
- Depends on 02 for the plist's path (the layout module) and its PATH reader. 02 also writes
  two of the suites this story amends, so the two are serialized.
