---
doc: examples
---
# 188/00 · Manual becomes its own command — example map
<!--
Drafted at refine's discovery beat, 2026-10-31. Q1 and Q2 answered by the operator the same day:
`aof:manual`, and `/aof:continue <ref> --manual` deleted completely. Struck because the record answers them: manual
leaves `continue` and becomes its own command (operator, 2026-10-31); the guide it prints is 149's,
unchanged (ADR-001 §2); the CLI door keeps `--manual` and its refusal codes (ADR-002 §2).
-->

## R1 · Manual is its own command, and continue builds only
- E1 · `/aof:manual 149` on a refined story with 2 of 14 scenarios red: prints 149's guide headed by the 2 red scenarios, spawns no agent, and closes its run `done` [proposed]
- E2 · `continue.md` after the move: no `<manual_mode>` region, no `--manual` in its argument hint, and no `guided:` outcome [proposed]
- E6 · `continue.md` after the move names `--manual` nowhere, not even as a pointer to `aof:manual` [stated Q2]

## R2 · The door answers --manual with the manual command
- E3 · `aof work continue 149 --manual` on a story nothing has run: answers `Continue "149" here — run: /aof:manual 149`, and the story moves to `in-progress` [proposed]
- E4 · `/aof:manual 148` on a milestone: the door refuses `continue-manual-not-a-story`, and the session names 148's ready stories [proposed]

## R3 · A manual session never carries on an agent build
- E5 · A READY agent lineage on 149, then `/aof:manual 149`: the mint is refused `duplicate-run` and reported, and nothing is resumed [proposed]

## R4 · A hand-off to an agent is written down, and the build reads it
- E7 · In a `/aof:manual 188/01` session the human says "hand this to an agent" after editing 2 of its 6 files: a `Hand-off 188/01 from manual` entry naming the 2 files, their commits and the red scenarios is appended to 179's `STATE.md`, and `aof:continue 188/01` is named, not run [proposed]
- E8 · `aof:continue 188/01` after that entry: the build reads the entry, starts from the 2 human-written files, and its report names each human-written line it changed [proposed]
- E9 · A standalone task handed off: no `STATE.md` exists, so the hand-off is reported in the terminal only [proposed]

## Questions
- Q1 · business · answered · What is the manual command called: `aof:manual` or `aof:guide`?
- Q2 · business · answered · What does `/aof:continue <ref> --manual` do after the move: stop and point at the new command, or treat `--manual` as unknown?
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-003 · Does the manual command keep continue's re-entry sweep?
