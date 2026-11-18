---
type: chore
number:
slug: loop-reclaim
title: "A resume settles a dead loop's runs without waiting out the heartbeat window"
status: not-started
owner: developer
created: 2026-11-18
updated: 2026-11-18
depends: []
schema: 1
aofVersion: 0.1.0
---
# A resume settles a dead loop's runs without waiting out the heartbeat window

## Intent

A loop that dies without settling its runs leaves them `running`, and for a whole heartbeat window
(`work.loop.heartbeatMs`, 15 minutes by default) aof reads the loop as alive. On 2026-11-17 a restart
at 21:24:36Z killed loop 25 in voice-vox-company-portal; resumes at 21:31Z and 21:35Z each died on
*a non-terminal run already exists for this item*, and the first one spent its lane's reclaim before
dying, so the second merged the half-built 25/01 home instead of re-driving it. This chore lets a
resume settle those runs at once when it knows the owner is gone: after a restart on its own, and on
the operator's word with `--reclaim`, from a terminal or from Discord.

## Definition of Done

- [x] `ownerGone(run, horizon)` beside `isStale` in `@aof/contracts/freshness`; the stale scan and the
      reclaim sweep take an optional `ownerHorizon`, and without one behave exactly as before
- [x] A resume after a restart reclaims this node's runs last alive before the boot instant, with no
      flag, and says why (`hostBootedAtMs`, read at the launch seam only)
- [x] `aof work loop <scope> --resume --reclaim` settles every run the resumed loop left running on
      this node, primary and lanes alike; a lane is re-driven from its own tree with its dirt in place
- [x] `--reclaim` leaves another node's run and another session's run in the same scope, and names
      each; it is refused alone, with `--stop` and with `--hand-off-start`
- [x] A bare `--resume` inside the window names each run it left, when it becomes reclaimable, and
      `--reclaim`
- [x] `aof work loop <scope> --hand-off --reclaim` skips the `loop-hand-off-running` refusal and
      writes `reclaim: true` on the resume request; the supervisor's relaunch reads it and reclaims
- [x] Discord `/loop resume` takes an optional boolean `reclaim`, with its own reply
- [x] README and `wiki/architecture/discord-notifications.md` say what `--reclaim` and `reclaim:True`
      do, and their limits
- [x] Tests for each path (`test/loop/loop-command-resume`, `-reconcile`,
      `test/run/run-heartbeat-reclaim`, `test/discord/discord-commands`), and the affected loop, run,
      Discord and command suites green
- [ ] Deployed to the daemons (`node scripts/install-local.mjs --skip-ui`, then a restart), so the
      supervisor's relaunch and the Discord bot carry it
- [x] `aof work validate` is green (no regression)

## Notes

- **Re-pinned, each with its reason recorded at the pin:** the loop shell's size bound (2250 → 2278,
  `test/loop/loop-command-wave`), the run store's hash (FF-5307), the shell's in-flight line count
  (15 → 17, FF-12602), and the loop's property list and flag count (FF-5508, FF-12602 leg 4, the
  command inventory fixture).
- **The arch sweep** (loop, run, testing, command, store, and every source-sweeping control) had 17
  reds on the working tree; 16 were red on a clean copy of HEAD `2a732182` as well, and the one this
  change caused (FF-5508's pinned property list) is fixed. FF-16004 reads 760 modules with this
  change applied to HEAD alone, as it did at HEAD.
- **Not built:** a dead-process check without a restart (it needs the owner's pid stamped on the
  run), and releasing a loop the desktop app is holding after a duplicate-run exit (a Rust change in
  `apps/desktop`). Until then a held loop restarts only from the app's Start, or an app restart, which
  then applies the standing reclaim request.
- **Not exercised by a real restart:** the boot path is tested with an injected boot instant, and the
  launch seam's reading was checked against `kern.boottime` (within 2 s, erring early).
