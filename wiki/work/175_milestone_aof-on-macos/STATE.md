---
doc: state
---
# 175 · aof on macOS — State

## Progress

- 2026-10-28: framed and refined (`aof:refine 175 --autonomous`, solo). Five stories, four ADRs,
  FF-17501..17503 and a DESIGN delta.
- 2026-10-28 to 2026-10-29: built and reviewed solo, in waves 00 ∥ 02, then 01 ∥ 03, then 04.
- 2026-10-29 to 2026-10-30: verified and accepted (`aof:verify 175`) on this MacBook. Fourteen
  findings were logged. Every blocker was fixed at verify. TECH_DEBT 4 A–D were fixed at the
  operator's request. See VERIFICATION `## Accept decision`.

## Decisions (graduated)

- There is no Tauri `app` target. `install-local` assembles the `.app` from the cargo build using
  one committed `Info.plist`, and the supervisor runs the payload `~/.aof/bin/aof`, never the npm
  link (ADR-002 §1, §6, §7).
- The bundle's executable is `AOF Desktop`, so Login Items shows that name. The directory, bundle
  id and LaunchAgent label are unchanged (ADR-002 §1–§2, amended at verify, F-05).
- The reap grace is 5 s. `stop` waits up to 20 s and never force-kills on darwin. Crash
  containment is deferred to ROADMAP (ADR-001 §2, §5; ADR-003 §3).
- `run` goes through launchd. It reloads a loaded-but-stopped job from its plist, and refuses over
  SSH with no LaunchAgent (ADR-003 §2, F-08).
- The daemon auth probe runs in launchd's environment: the plist's PATH plus `HOME`, `USER` and
  `LOGNAME` (ADR-004 §4, amended at verify, F-09).
- This laptop is a standalone single-node mesh: fabric `direct` on `127.0.0.1`, nominated as its
  own control node, with its own node record from `aof mesh identity` (ADR-005; the runbook, F-03,
  F-10).
- The window on a Mac keeps native traffic lights, and the node row's badges share one centred
  group (DESIGN Surface M3, M4, F-12, F-13).
- The operator descoped the SSH restart scenarios. The acceptance bar is this laptop working as
  its own control node (VERIFICATION `### Not run on this laptop, and why`).
- TECH_DEBT 4 part E (rekeying duplicate workspace ids) is the backlog milestone
  `workspace-id-rekey`.
- ADR-001's diagram is not drawn (`diagram-generator-missing`). Its brief is kept for
  `aof:add-diagram 175 ADR-001`.

## Archived

The build blow-by-blow, the refine run's re-mint, the per-story review closes and the
`## Feedback (for retro)` notes have graduated. The lessons are in each story's
`RETROSPECTIVE.md` and the milestone's, and the evidence is in VERIFICATION. The full
pre-compaction text is in git at `b7a8ccdd`.

## Verification

- [x] `@executable` suite green (story scenarios; whole-tree reds are this Mac's realpath baseline)
- [x] Fitness functions green (FF-17501..17503, each with a red probe)
- [x] `@manual` signed off, with the not-run items recorded
- [x] `@uat`: clone to fleet on a Mac, quit leaves no process, login brings the fleet back
