# 191/02 · Build brief

## Mechanism

Lift the route's resolve, identity, freshness and relay checks out of `ui-serve.mjs` into a pure
`planSessionStart` in `session-start.mjs`. Keep their order and codes, and give each refusal the
route's HTTP status so the route only writes what the plan says. The route keeps its admission and
body parsing.

`commands/session.mjs` follows `commands/terminal-resume.mjs`: a factory taking
`queryGlobalMeshStatus`, `loadWorkspace`, the relay push factory, a relay subscriber factory and the
node identity, and returning `meshSessionStartCommand` and `meshSessionListCommand`. Start resolves
the project among local workspace rows by id, then by folder name. It checks `item` with
`invoke("work:find")` in that workspace, and plans. With `waitMs > 0`, it opens a relay subscription
for the one `(nodeId, sessionId)` tuple before it pushes the frame, with
`launch: "claude-remote-control"`. Then it waits for the first link match, a refusal ack, or the
bound, and closes the subscription.

The CLI face is `aof mesh session start <project> [--node] [--item] [--wait <ms>] [--json]` and
`aof mesh session list [<project>] [--json]`.

## Known traps

- Subscribe before the push. A fast session paints its footer before a late subscriber connects.
- The relay subscriber must be closed on every exit, including a throw, or the daemon keeps a socket.
- Scan at most 64 KiB, and strip nothing before matching. The URL may sit inside an OSC-8 sequence.

## Verification

Route suite unchanged, plus the new scenarios. The verbs suite, against a fake relay and a fake
mesh status. FF-19103's leg and its red probe. By hand: `aof mesh session start
agent-orchestration-framework --wait 45000 --json` on this laptop answers a link or `no-link` with
the name.

## Out of scope

Ending (03). Discord (06). Any change to the outcome registry's lane.
