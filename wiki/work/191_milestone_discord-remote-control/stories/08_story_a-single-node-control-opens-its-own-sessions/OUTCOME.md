# 191/08 · A single-node control opens its own sessions — Outcome

## Delivered

### The control opens a served project at its registered folder
The control's session handler binds its own checkout seams (`createControlCheckoutSeams`). A served workspace's checkout is its registered `project_root`, so a start for a project on the control opens there with no published marker (FF-19108).

### A nominated control always has a loopback relay
A nominated control with no `mesh.relay.url` derives its relay at `ws://127.0.0.1:4183/ws/relay`, beside the stream server on 4182, so the two never share a port. A control with `mesh.relay.url` set keeps that relay unchanged. `DEFAULT_LOOPBACK_RELAY_PORT` has one home (FF-19109).

### The preflight names the control's relay
`aof mesh desktop install|run` prints `control-relay-loopback`. It names the derived relay, fails a `mesh.relay.url` that would collide on a loopback-bound control and says to remove it, and skips a node that is not the control.

## Assumptions

- **The mesh is single-node, or the control serves only its own projects** — the control's seam answers "has the repo" from the registered folder existing on disk, without reading this node's workspace membership (F-10).
