// packages/mesh/src/session-start.mjs — THE ONE START CORE (191/ADR-003 §1, FF-19103).
//
// The fleet's `New session ▾` (POST /api/mesh/session, ui-serve.mjs), the terminal (`aof mesh
// session start`) and Discord (through that verb) must refuse for the same reasons, in the same
// words. The checks have one home — `planSessionStart` — and every face reaches the dispatch only
// through its answer: a face never builds the session-spawn frame or its relay envelope itself. It
// pushes the `envelope` a passing plan hands it.
//
// The checks are the route's own (50/ADR-006), lifted here unchanged, in the route's ORDER, with
// the route's CODES, MESSAGES and HTTP STATUSES, so the route only writes what the plan says and
// its locked scenarios stay green unedited:
//
//   1. workspace-not-found          404  no row in the projection is the workspace asked for
//   2. workspace-not-local          409  the row's checkout is not on this machine (47/ADR-011)
//   3. control-identity-unknown     409  this control has no node identity to issue under
//   4. session-target-not-connected 503  the target node's presence is not `live` (50/ADR-006 §7)
//   5. session-dispatch-unavailable 503  no loopback relay is configured (50/ADR-006 §5)
//
// PURE over its inputs. It reads no store, opens no socket and starts no timer: the caller hands it
// the mesh status payload it already read, the control's identity and whether a relay exists. The
// two facts it must ask the world for are PORTS with production defaults — `pathExists` (the
// reachability probe) and `mintSessionId` (the control-side id, 50/ADR-002 §2) — so a test can pin
// both, and nothing else here can reach outside the call.

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { buildSessionSpawnFrame, buildSessionSpawnEnvelope } from "./session-spawn-directive.mjs";

// refusal(code, status, message) — the one refusal shape: `{ ok: false, code, status, message }`.
// `status` is the HTTP number the route answers it with; the CLI face carries it as the
// commandError status, so both faces state one number for one fact.
function refusal(code, status, message) {
  return Object.freeze({ ok: false, code, status, message });
}

// planSessionStart(request) → a refusal, or `{ ok: true, sessionId, nodeId, workspaceId, row,
// envelope }`.
//
// `status`        the queryGlobalMeshStatus payload (`workspaces[]`, `nodes[]`).
// `workspaceId`   the workspace the session is for.
// `nodeId`        the node it is to run on.
// `issuer`        this control's own node id, or null when it has none.
// `relayAvailable` whether a loopback relay push transport exists.
// `assistant`, `itemRef`, `launch`, `at` — carried into the frame. Their defaults and closed-set
//                 filtering stay the frame builder's (`assistant` → "claude", an unknown `launch`
//                 dropped), never re-spelled here.
export function planSessionStart({
  status,
  workspaceId,
  nodeId,
  issuer,
  relayAvailable,
  assistant,
  itemRef,
  launch,
  at,
  pathExists = existsSync,
  mintSessionId = randomUUID,
} = {}) {
  const row = (status?.workspaces ?? []).find((candidate) => candidate?.workspaceId === workspaceId);
  if (!row) {
    return refusal("workspace-not-found", 404, `Workspace "${workspaceId}" is not in the mesh projection.`);
  }
  if (!row.projectRoot || !pathExists(row.projectRoot)) {
    return refusal("workspace-not-local", 409, `Workspace "${workspaceId}" is not checked out on this machine.`);
  }
  if (typeof issuer !== "string" || issuer.length === 0) {
    return refusal(
      "control-identity-unknown",
      409,
      "This control node has no mesh identity yet — run `aof mesh identity` before starting a session.",
    );
  }
  // `stale`, `unknown` and a node the roster has never seen all fail CLOSED — the fact the grid
  // renders as "online", read off the same payload.
  const target = (status?.nodes ?? []).find((candidate) => candidate?.nodeId === nodeId);
  if (!target || target.freshness !== "live") {
    return refusal("session-target-not-connected", 503, `Node "${nodeId}" has no live connection to this control node.`);
  }
  if (relayAvailable !== true) {
    return refusal(
      "session-dispatch-unavailable",
      503,
      "No mesh relay is configured on this control node, so a session cannot be dispatched (set config.mesh.relay.url).",
    );
  }
  // MINTED CONTROL-SIDE (50/ADR-002 §2): the session has a routable address before any worker
  // sees the frame, which is what lets a face answer it — and what a watch subscribes to.
  const sessionId = mintSessionId();
  const frame = buildSessionSpawnFrame(nodeId, {
    sessionId,
    workspaceId,
    assistant,
    itemRef,
    launch,
    at: typeof at === "string" && at.length > 0 ? at : new Date().toISOString(),
  });
  return Object.freeze({
    ok: true,
    sessionId,
    nodeId,
    workspaceId,
    row,
    envelope: buildSessionSpawnEnvelope(nodeId, frame),
  });
}
