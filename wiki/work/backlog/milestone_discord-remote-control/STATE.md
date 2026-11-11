---
doc: state
---
# Discord drives the work from a phone — State

## Progress

- Captured in the backlog 2026-11-10; not yet promoted or broken down.

## Notes & decisions

- 2026-11-10 — Framed from the operator's conversation about using AOF while away from the desk.
  These options were weighed and rejected:
  - A native mobile app. It would show the same data as the web UI, and adds a second client to
    keep in sync, app-store signing and a new authentication surface.
  - Hermes. It is a second agent with its own memory and its own picture of the projects, and it
    would drive `aof` through the shell, outside the loop's gates.
  - Relying on Remote Control alone. A session has to be opened before leaving, so it cannot cover
    an unplanned debug or a quick fix.
  The command shape the operator agreed: `/session start project:<p>`, with Claude and Remote
  Control on by default, not as flags.

## Verification
