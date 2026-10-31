# 175 · aof on macOS — Outcome

## Delivered

### A Mac is a supervised single-node control node
This MacBook goes from clone to a running fleet with the deploy rules' commands alone (m175/04/the-deploy-rules-carry-a-macos-section). The menu-bar app runs both daemons in the login session and returns at login with no terminal (m175/02/the-desktop-verbs-on-darwin), Quit leaves no `aof` process (m175/00/quit-reaps-the-whole-tree), and a supervised `claude` authenticates in the daemons' environment (m175/03/the-darwin-preflight).

### A launch folder is not a workspace anywhere in the mesh layer
A folder with no aof config of its own, such as launchd's cwd `/`, is not synced, not read for presence and not watched (`hasOwnWorkspaceConfig`, F-11, F-14). `mesh serve --serve --workspace` is honoured, the fleet UI resolves identity through `resolveWorkspaceId`, and repo availability reads the pinned checkout (TECH_DEBT 4 A–D, item 21).

## Assumptions

- **This laptop has no peers** — it is in no mesh, binds `:4182` on `127.0.0.1` with fabric `direct`, and its fleet is `node-6eb3` alone (ADR-005).
- **The app is a local ad-hoc-signed build** — it is not notarised or Developer ID signed, so it runs only where it was built or where its quarantine attribute is cleared.

## Gaps

### A restart over SSH
- **Status:** open-by-decision
- **Discharge condition:** an operator needs to restart this laptop over SSH, and the 02/04 and 04/01 E6 scenarios are run then.
The runbook calls `stop && run` the one restart legal over SSH, and that is not measured live: the operator descoped it on 2026-10-30.

### Duplicate workspace ids
- **Status:** open
- **Discharge condition:** the backlog milestone `workspace-id-rekey` is accepted.
A repo that ended up under a path-derived id and a pinned id keeps its history split across both. Nothing moves rows from one to the other (TECH_DEBT 4 part E).
