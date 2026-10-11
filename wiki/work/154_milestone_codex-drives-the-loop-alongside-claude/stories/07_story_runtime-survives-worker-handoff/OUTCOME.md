# 154/07 · Workers retain the selected runtime and assets — Outcome

## Delivered

### Durable worker handoff
Worker assignments retain their execution envelope across reconnect, prepare lock-owned native assets and start the lane view through the guarded status transition while retaining one primary-owned run.

## Assumptions

- **Live mesh proof** — the reconnect test uses real local WebSocket transport, native Codex and a local Git origin; it does not claim a cross-host tailnet authentication soak.
