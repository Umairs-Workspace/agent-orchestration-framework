---
type: chore
number: 206
slug: loop-survives-host-sleep
title: "The loop survives a host sleep and recovers instead of halting"
status: done
owner: developer
created: 2026-11-12
updated: 2026-11-12
depends: []
schema: 1
aofVersion: 0.1.0
---
# 206 · The loop survives a host sleep and recovers instead of halting

## Intent

Loops 07 (property-intelligence-platform) and 14 (project-sijil) halted `deadline-exhausted` on
2026-11-12 after the host slept 00:14 → 05:07. Every bound was a wall-clock timer, so on wake the
lane deadline killed live sessions and the 3 h budget charged the five sleeping hours. This chore
makes every deadline count awake time, keeps the budget from charging a suspend, and removes the
smaller faults that made the run read as dead and cost it capacity. The evidence is in
`~/.aof/mesh/logs/loop-diag.14.2026-11-11T15-30-32-291Z.log` and
`loop-diag.07.2026-11-11T18-18-38-190Z.log`.

## Definition of Done

- [x] An awake clock (`@aof/foundation/awake-clock`) records suspended spans. The lane child
      deadline (`bounded-process`), the PTY driver's start-to-close and heartbeat bounds, and the
      Codex adapter's turn and request bounds all count awake time
      (`packages/foundation/test/awake-clock.suite.mjs`).
- [x] The loop's settle stamps the attempt's suspended spans on the run record (`suspended`,
      an optional key written only when a span exists). The budget subtracts them, merged with ask
      waits. A settled record without spans ends at most one staleness window after its last
      liveness, so the measured 14/03 attempt is charged 42 min, not 5 h 26 min
      (`test/loop/loop-suspend-not-charged.test.mjs`).
- [x] A retry of a continue that failed `timeout` resumes the prior attempt's session
      (`--resume`) with a "resumed after the attempt deadline" turn. Any other prior, or a missing
      transcript, launches cold (`test/loop/loop-timeout-retry-resumes-session.test.mjs`).
- [x] The drive status line's last activity is the newer of the consumed heartbeat and the session
      transcript's write. A lane drive killed before its document names the session from the run
      record instead of printing `no session id`.
- [x] A refused lane cleanup is remembered and retried before the next dispatch. Before halting
      at capacity with no lane of its own open, the loop retries its remembered cleanups and any
      holder whose `aof/mesh/<ref>` branch is in its scope, through the gated cleanup verb.
- [x] The suites over the changed code are green, each run on its own:
      `acd-clock-counts-attempts`, `four-deadlines`, `loop-command-narration`,
      `yarn-installation`, `codex-app-server.suite`, `acd-session-driver-mesh-blind`,
      `acd-audit-never-imports-project-code`, `acd-seam-liveness-unknown-is-a-limit`,
      `acd-evidence-oracle-is-a-message`, `acd-loop-family-boundary`, `audit-spawn-bounded`,
      `loop-command-resume`, `loop-command-reconcile`, `loop-command-wave` and
      `drive-command-phase-drivers`.
- [x] `aof work validate` is green (no regression).

## Notes

Mostly bug fixes. No `.feature` or delivered acceptance criterion changes. The three items below
change what a recorded ruling says. Each was decided here, not in a contract:

- **126/ADR-001 (the clock counts attempts).** A settled attempt ended at its close "whatever the
  record beat". It now ends at most `stalenessMs` after its last liveness when the record carries
  no `suspended` spans. FF-12601's rows all close inside that window and are unchanged.
- **The drive's warm-resume rule (ADR-008, "only a fix may derive a target").** A second target is
  now derived: the timed-out prior attempt of a `continue` retry.
- **The run record (131/ADR-003's additive discipline).** It gains an OPTIONAL `suspended` key,
  the way `execution` is optional. A run that never slept keeps its seventeen keys.

Test changes: two import allowlists and the FF-5301 reach census each gain the zero-import awake
clock (41 → 42, 182 → 183). The wave test that counted cleanup calls as merges now counts only
cleanups that closed the lane.

FF-5301 compares a lowercase `c:\` root against realpaths that come back as `C:\`. Run it from a
`C:\` cwd: from `c:\` its leaf checks fail whatever the code.

Not in scope:
- Memory-aware lane admission. Loop 07 ran 6 lanes with a Postgres container each, beside a
  second loop, and one test run was killed for lack of memory.
- The measured workspaces' 1 h `startToCloseMs`.
