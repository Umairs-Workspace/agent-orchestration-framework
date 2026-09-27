---
type: story
number:
slug: a-running-loop-is-visible-in-the-ui
title: "A running loop is visible in the UI — its Claude session streams live to its session card, and the loop shows its progress"
status: not-started
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
schema: 1
aofVersion: 0.1.0
tags: [bug, loop, ui]
reads: []
files: []
---
# A running loop is visible in the UI

## User story

As **the operator who runs `aof work loop` and walks away**,
I want **to open the web UI (or the desktop app) and watch what the loop's Claude session is
doing right now, live, and to see at a glance how far the loop has got and whether it is working
or stalled**,
so that **I can tell a loop that is quietly working from one that is stuck, without reading
transcript files by hand, and stop it or leave it alone on evidence. Today every refine drive
runs for 60–80 minutes behind a frozen `Driving 03/07` line, the UI's session card for that
session says "no live output — no assignment is relaying this session", and on 2026-09-27 the
operator stopped and restarted a healthy loop twice because it looked dead.**

## Tasks

<!-- Authored by `aof:refine`. The outcomes this story must deliver, as found on 2026-09-27: -->

- **The bug: loop sessions never stream.**
  - The terminal stream only exists for mesh-daemon assignments: `onOutputChunk → client.sendTerminalFrame` is wired in `src/mesh/launcher.mjs` only.
  - A loop drive runs `aof work drive` as a child process (`src/loop/child-drive.mjs`), and its session driver is given no `onOutputChunk`.
  - So the session card for a loop-driven session (measured: `89b1d500`, language-tutor 03/07) renders empty with "no assignment is relaying this session", even though the session is registered and busy.
  - Outcome: a loop-driven session's PTY output reaches its session card, live and read-only, for the sequential drive and for each wave lane.
- **The loop's progress in the UI.**
  - The fleet's loop line (130/03) names the scope, phase, current ref and cycle, but nothing shows how long the current drive has run, whether its session or subagents are active, or when they last did something.
  - Outcome: the running loop shows elapsed time on the current drive and last activity (heartbeat or transcript) where the operator looks first. That means the home page, not only the fleet node card.
- **The loop's progress in the terminal.**
  - `aof work loop` prints only when a drive starts or ends.
  - Outcome: while a drive runs, the loop prints a periodic status line, e.g. `03/07 — 36 min, 2 subagents active, last activity 5 s ago`.
- **The home page's empty state tells the truth.**
  - With runs in flight it says "no session is reporting a terminal", and blames the bundle, even when the cause is that loop drives never relay.
  - Outcome: the page names the running loop and its session. It never shows an empty grid next to "N runs in flight".

## Notes

- **Found live 2026-09-27 (language-tutor loop 03).** The only working view was an ad-hoc transcript tailer, `~/.aof/watch-session.mjs <project>`. It follows the newest session's assistant text, tool calls and subagent activity from `~/.claude/projects/<slug>/`. That is the fallback shape of "what is it doing" when a PTY stream is unavailable (a session on another node, or history after the fact), and it is worth folding into the same surface.
- **Two defects in the same visibility chain were fixed outside this story on 2026-09-27.** Neither is in scope here.
  - A stale `~/.aof/mesh/identity.json` (re-minted to the hostname stem) made the UI treat this node's own loops as remote: no Stop button, sessions filtered out. It was repaired with `aof mesh identity --name node-7297`. The root cause, an old SEA embedded bundle run during `install-local`'s src/ gap, is fixed in scripts/install-local.mjs and scripts/sea-entry.mjs.
  - The fleet showed a ghost `loop 02` line from a lane copy of a milestone run still marked `running` after its loop exited.
- **Known leftovers that sit next to this story but are not part of it:**
  - Dispatch lanes register themselves as separate workspaces (one consumer repository had seven registrations, some for deleted lanes, which flood mesh-serve.log with `workspace-workdir-unresolvable`).
  - A node row in `projection.sqlite` has no prune path once its record file is gone.
- **The stream must stay read-only.** The loop's session is unattended, and typing into it from the UI would race the driver's own directive and nudge. Operator interaction stays with `aof work answer` and the loop's `--stop`.
