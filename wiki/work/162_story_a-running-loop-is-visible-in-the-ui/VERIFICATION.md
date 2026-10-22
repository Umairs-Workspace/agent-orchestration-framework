# 162 · A running loop is visible in the UI — verification

## Fitness functions

| id | enforced by | result | red probe |
| --- | --- | --- | --- |
| FF-16201 | test/arch/session/acd-loop-terminal-ingress.test.mjs; registered in test/arch/session/index.mjs | green at build (2026-10-17): static clauses over the real bridge, launcher and drive sources, plus a REAL loopback ingress driven by a real client | six plants, each asserted to land and to trip: a `0.0.0.0` host, an ungated upgrade, a reply sink on `message`, a `nodeId` read off the message, the child's id stamped on the control leg, and a drive child that no longer names its `loopRunId` |
| FF-16202 | test/arch/ui/acd-loop-pane-read-only.test.mjs; registered in test/arch/ui/index.mjs | green at build (2026-10-17): seven `loopRunId` shapes through the shipped home mount and the fleet mount, plus a sweep of `apps/ui/src` for the loop line's, the progress segment's and the threshold's homes | a home copy of `fleetLoopLines`, a re-typed `LOOP_QUIET_AFTER_MS`, and a surface re-pointed off the shared module each trip; the posture line's loop clause is pinned as shipped |

FF-16201 extends `acd-terminal-output-signal-source`: the ingress's worker forward (`frame:` in the
launcher's worker branch) is the gate's third enumerated host shape, and its producer ceiling moved
3 → 4 with this story's ADR named. Its own self-checks re-drive the ceiling at a fifth site and the
floor at one.

## Review at continue (2026-10-17, solo — every lens played inline)

Gate ladder: `aof work validate 162` clean; `aof work doctor 162` warnings only (the numbering gap is
this branch being cut from `main`, where 160/161 are not yet merged). One review round.

| lens | verdict | what it found |
| --- | --- | --- |
| architect | fixed in round 1 | **Blocker, fixed:** the ingress's address-file I/O sat in `terminal-relay-bridge.mjs`, which ADR-014 inv.3 keeps in-memory and fs-free, and the token check made the bridge a constant-time match surface where its `code ===` ENOENT checks read as a timing oracle. The file moved to the mesh store (`publishTerminalIngress` / `readTerminalIngress` / `withdrawTerminalIngress`, at `<aof home>/mesh/terminal-ingress.json`), and the bridge takes `publish` / `withdraw` / `readAddress` ports. ADR-001 §1's path, atomic write and per-start token stand unchanged. |
| QA | fixed in round 1 | E11 was driven through `spawnLaneDrive` only; it is now also asserted through the real wave (each lane's spawn carries the wave's printer and its own lane item). A re-statement beat already scheduled when a session ended could re-create the record the hook had removed; the statement now re-checks `ended` at write time. |
| craft | clean | — |
| design | INCONCLUSIVE | No DESIGN surface or mock baseline exists for the home's loop strip or the quiet tone (`text-amber-500`, the board's existing warning colour), so no render was judged. Produce a baseline to judge it. |

The three nits the review recorded are registered under **## Findings** below (F-01..F-03).

Measured along the way: the importer sweep (5,666 cases over every suite index that reaches the changed
seams) surfaced only key-list and count pins this story moves — the session record's ninth key, the
loop entry's three, the producer count 3 → 4, the worker facade's configured closure 159 → 163 — plus
the desktop's captured fixtures, re-captured through the real producer (`view_model.rs`, eight
entries, `"loopRunId": null` appended and nothing else).

## Verification evidence (aof:verify, 2026-10-20)

- **Story lane** — `node scripts/test.mjs --only` over the 38 suite files in `STORY.md` `files:`
  (both FF files included), `AOF_GLOBAL_HOME` isolated, at `bd97c0c1`: **633 ok, 0 not ok, exit 0**
  (both streams read). verifies → every `@executable` scenario in tasks 00–03, FF-16201, FF-16202.
- **Gate ladder** — `aof work validate 162` PASS; `aof work doctor 162` warnings only, no
  `control-unresolved` at either severity (both FF files exist).
- **Design conformance** — `INCONCLUSIVE`: no `DESIGN.md` surface or `Route` for the home's loop strip,
  and `work.ui.baseUrl` is unset. No render was attempted, and no designer or QA session was spawned.
  Same reason as at continue.
- **`@uat` precondition, measured at the source** —
  control node: `~/.aof/bin/aof.exe --version` → `payload 74a3a714+dirty.20261019T201659` (contains
  the 162 merge `a816d6d1`); `mesh-ui.log` `daemon-started` at 2026-10-20T09:09Z on that build;
  `~/.aof/mesh/terminal-ingress.json` present (loopback host, live pid). **Met.**
  WSL worker: `~/source/aof` carries the 162 sources (`publishTerminalIngress` in the mesh store), but
  no `mesh serve` process is running and there is no `~/.aof/mesh/terminal-ingress.json`. **Not met:
  the worker daemon must be started by the operator.**

## Findings

| id | observed | type | severity | triage | routed-to | status |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | 162 added `formatLoopDuration` (`apps/ui/src/components/loop-line.mjs`) and a byte-identical `formatDriveDuration` (`packages/work-loop/src/drive-status.mjs`): one span ladder spelled twice. | defect | minor | non-blocker; fix in the item. Distinct from m57/F-57-M-4, which is the ADR id grammar, not a formatter. | developer | fixed — kept as two fenced copies (operator's call, 2026-10-21): moving the ladder into `@aof/messaging/form` tripped four deliberate fences (131/02's six-export form, the work-loop kernel's import allowlist, arch/48's standalone copy of `loop-line.mjs`, FF-16004's module ceiling). A new FF-16202 case drives both copies over twelve spans (every rung edge, a negative and a multi-hour span) and trips on a copy that abbreviates its minutes; each copy's comment names its twin. |
| F-02 | `packages/work-loop/src/commands/drive.mjs` is now 921 lines; 162 added the loop stream (~100). | debt | nit | non-blocker; extract the loop stream from the drive command. Distinct from m129/F-18 (test-dir ceiling). | developer | fixed — the producer (ingress client, stated facts, re-statement beat, hook composition) moved to `packages/work-loop/src/loop-session-stream.mjs`; `drive.mjs` is 823 lines. FF-16201 now reads `stateLoopSession` there. Pins moved with recorded reasons: `packages/work-loop/src` 14 → 15, FF-5301 closure 164 → 165, FF-16004 `work find` 715 → 716, kernel allowlist row `loop-session-stream.mjs: node:path`. |
| F-03 | E8/E14's warning tone is asserted only as the line's `quiet` flag; nothing asserts the rendered class (`text-amber-500`). | test-gap | nit | non-blocker; assert the class at the home and fleet mounts. Distinct from m119/F-16 (existsSync silent carrier). | developer | fixed — `LOOP_QUIET_CLASS` exported from `loop-line.mjs` and read by `Fleet.tsx` (via `fleet/runs.mjs`) and `Home.tsx`. FF-16202 asserts its one home and value, and that both surfaces render `loop.quiet ? LOOP_QUIET_CLASS`. Its red probes: a re-typed literal, a dropped tone and a re-coloured constant each trip. FF-5307's `ui/` hash re-pinned with the measured six files. |
| F-04 | Live, 2026-10-22: the WSL worker's `aof mesh serve --serve` did not exit on SIGTERM. `serve.mjs` traps the signal `once` and awaits `handle.stop()`, which never settled while the worker stream retried `connect ETIMEDOUT 192.168.1.102:4182`; it took SIGKILL. | defect | minor | non-blocker for 162 (mesh worker shutdown, not this story's surface). Distinct from m34/F-3404 (an inert feed, not a hung stop). | backlog (mesh launcher owner) | open |
| F-05 | Live, 2026-10-22 15:45–15:50Z: the home read "Nothing is running" while loop 11 ran on the control node with a known session. `/api/mesh/status` marked both live nodes `stale`, because their `global_nodes.last_seen_at` stayed frozen at 15:45:34 while their presence files refreshed every few seconds. Cause: before 164 the daemon tick called `publishGlobalWorkSnapshot` every cadence (`a816d6d1` `launcher.mjs:789`), refreshing every node row; since 164 the tick calls `syncWorkspace`, which returns before publishing when nothing changed (`74a3a714` `publisher.mjs:234`). On a quiet tree the registry is never rewritten, the 60 s presence window (`global-node-registry.mjs` `queryGlobalRegistry`) lapses, and E12/R4's loop naming falls to "a loop on a stale node is not named". | defect (regression from 164) | blocker for this `@uat` | blocker: the operator check cannot pass while live nodes read stale. Fix where node liveness is decided (164's sync tick or the registry's freshness source), then re-run the `@uat`. Distinct from m164/F-02 (NUL-filled node records, a torn roster). | developer (164's sync path) | fixed — live re-check passed 2026-10-22 19:06Z on payload `9c2e9cae` (both nodes live, the home names loop 11 and mounts both loop cards; see `## User sign-off`). `queryGlobalRegistry` now reads freshness (and the card's `lastSeenAt`) from the later of `last_seen_at` and the node's current presence `heartbeatAt`, which it already read. Regression case in `global-node-registry.suite.mjs` /03 (a beat after the last publish reads live; a stopped beat still goes stale; a never-beat node stays unknown), red on the unfixed source (`'stale' !== 'live'`). Focused lanes: the registry suite, `global-mesh-query`, `mesh-fleet-presence-plumbing`, `mesh-session-index-projection` — 54 ok, 0 not ok. |
| F-06 | Live, 2026-10-22: a streaming loop card's READ-ONLY badge said "This view mirrors the worker's terminal. It cannot type: keystrokes never reach the worker." — on the control's own session too — while the mount carried E3's reason, which reached only the empty-pane line. | design-gap | minor | non-blocker; fix in the item. No prior occurrence (recall: m35/F-3501 is a chip tooltip truncation). | developer | fixed — `mountModelFor` takes the mount's `reason` and the badge title is that reason when stated, else the generic sentence; `TerminalControl` passes `mount.reason`. FF-16202 asserts the loop reason reaches the badge for every loop-driven row, the generic title for a causeless read-only mount, and none on an interactive one. `ui/` hash re-pinned. Lanes: FF-16202, `terminal-core-input-policy`, `home-session-mount`, `fleet-scope` — green. |
| F-07 | Live, 2026-10-22 19:12Z: the WSL node's own presence lists its loop (`00`, ref `00/02`), but the control's copy of `node-2976` presence carries `loops: []` (sessions do cross — two rows), so a worker's loop line never reaches the control's home or fleet. 162's R2 scenarios are node-local; its `@uat` checks the cards, which stream. | defect | minor | non-blocker; the worker-to-control presence transport, which predates 162. No prior occurrence (recall: m34/F-3404 is an inert feed). | backlog (mesh presence transport) | open |
| F-08 | Live, 2026-10-22: the home's loop strip shows `loop 11 · cancelling · continue 11 · cycle 1 of 3 · 402 h 36 min` — a loop in workspace `2495d28a…` started 2026-10-06 whose run record still reads running with `stop: cancel`. 162's elapsed segment makes the dead entry conspicuous; it did not create it. | defect | minor | non-blocker. Prior occurrence: m130/F-07 (the fleet card showed a loop that had ended) — same cause, left open for its owner. | backlog (loop liveness, m130's owner) | open |

Fixes verified on branch `162-verify-findings` (off `bd97c0c1`), `AOF_GLOBAL_HOME` isolated: the story
lane plus every suite importing a changed module (51 files) — **966 ok, 0 not ok, exit 0**;
`yarn ui:build` green. An earlier sweep's one unrelated red (156's wave test, `git worktree add` failing
on `failed to read .git/worktrees/…/commondir` under contention) was clean on the re-run.

## User sign-off

- `@uat` (task 00) — **the operator watches running loops stream on both machines: PASS**, run by
  the agent at the operator's request ("can you do this? with the aof test repo?", 2026-10-22).
  Operator confirmation: **signed off 2026-10-22** — "screenshots look good", on the grid and expanded-card screenshots of this run.

  **Run, 2026-10-22 19:05–19:08Z, payload `9c2e9cae` on the control node** (desktop app restarted by
  the operator; WSL tree deployed from the same branch). `aof work loop 11 --resume` in
  `aof-test-repo` on the control node (after `aof work answer 11/00`), and `aof work loop 00 --resume`
  in the distro's clone. The home at `http://127.0.0.1:4181/` showed `3 sessions · 2 live`, the loop
  strip above the grid, and two cards marked READ-ONLY and `streaming`: `aof-test-repo → node-2976`
  (session `cd100f2e…`, the WSL verify drive) and `aof-test-repo → node-7297` (session `3bc1d00c…`,
  the resumed refine with the answer applied). The WSL card's content moved on between reads (the
  suite run, then its `@manual` lanes), so it was live. Typing `zzqx` into each card reached neither
  session: the marker appears 0 times in either transcript, both still being written after the
  keystrokes. The control session then parked on its next question (`11/00 Q2`), and its card showed
  `stream ended` (E4). Findings from the run: F-06 (fixed), F-07 and F-08 (non-blockers, open).

  Earlier attempt (blocked by F-05, kept for the record):

  **Attempt, 2026-10-22 14:46–15:50Z.** Setup: the WSL
  tree redeployed from `162-verify-findings`; both nodes' addresses moved to the control's Tailscale
  address (its LAN lease had changed); WSL `claude` re-logged in by the operator. `aof work loop 11`
  ran in `aof-test-repo` on the control node and `aof work loop 00` in the distro's clone (both
  started 14:46Z). Measured at 14:47Z: both drive children stated their sessions `relaying: true`
  with their loop run (control `4bcc4f07…` → `942f542c…`; WSL `60fcf77f…` → `e4c199b7…`), and both
  ingresses were open on loopback under their daemon's pid. Not observed live: by the browser check
  (15:48Z) the control loop had parked on a refine question (`11/00 Q1`), the WSL loop had halted
  `cap-exhausted`, and the home showed "Nothing is running" (F-05).
