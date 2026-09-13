// The ONE composition seam the fleet serve-face (`src/mesh/ui-serve.mjs`) calls for
// its GLOBAL `/api/mesh/status` read (milestone 34 / story 03; ARCHITECTURE ADR-006).
//
// ADR-006 keeps `mesh-ui-serve.mjs` a THIN UI/API layer: it must not import the
// low-level global-work-store / global-node-registry query surfaces directly, and it
// must not open the SQLite projection itself. This module is the single query surface
// the serve face talks to instead — it opens the global projection store, runs the
// story 00 work-projection query AND the story 02 registry query, and SHAPES the two
// into the ONE payload the fleet API answers for scope "global".
//
// A store-open failure (no SQLite runtime, schema too new, or any other open-time
// throw) is mapped to the coded `global-store-unavailable` error the API surfaces as a
// 503 (task 03) — the operator-facing path is always the global mesh database path
// (globalMeshPaths().databasePath), never a raw stack trace.
import { globalMeshPaths } from "./workspace.mjs";
import { openGlobalWorkProjectionStore, queryGlobalWorkProjection, globalStoreError, workspaceIdFor } from "./global-work-store.mjs";
import { queryGlobalRegistry } from "./global-node-registry.mjs";
import { MESH_GLOBAL_DISABLED_CODE } from "./global-work-publisher.mjs";
// milestone 35 / story 03 — the READ-ONLY assignment-lifecycle affordance
// (ADR-007: the fleet UI stays read-only; this thread extends the READ shape
// only, never a write branch). `listAllAssignments` is the bulk read helper
// story 03 added to Story 00's frozen assignment-record module (assignment-
// record.mjs) — a plain SELECT, no new writer.
import { listAllAssignments } from "./assignment-record.mjs";
// m43 / story 04 (ADR-006 + ADR-010/R4.1) — the cache-staleness WINDOW's ONE resolver and
// ONE documented default. The fleet payload states it once for the whole response, exactly
// as the board's list envelope does, so `ui/` carries no default and no literal on either
// surface and the two can never disagree about the same instant.
import { resolveCacheStalenessSeconds } from "./cache-provenance.mjs";

// Re-exported so the serve face (ADR-006 "thin … talks to a query surface") can
// resolve a `?scope=local` deep-link's workspace id WITHOUT importing
// global-work-store.mjs itself — this module stays the ONE query surface it reaches.
export { workspaceIdFor as workspaceIdForProjectRoot };

// queryGlobalMeshStatus({ workspaceId?, now?, ... }) → the shaped global status
// payload: { scope:"global", workspaces, items, nodes, diagnostics }.
//
// `workspaceId` narrows both the work-projection query AND the registry query to one
// workspace — this is how the `?scope=local` deep-link (task 01, "a local filter can
// be requested through the API query string") reads the SAME global projection but
// scoped to the current workspace, without a second store/open path.
export async function queryGlobalMeshStatus(options = {}) {
  const paths = options.paths ?? globalMeshPaths(options);
  const store = options.store ?? (await openGlobalStoreOrCodedError({ ...options, paths }));
  const ownsStore = options.store == null;
  try {
    const workProjection = queryGlobalWorkProjection(store, { workspaceId: options.workspaceId ?? null });
    const registry = await queryGlobalRegistry(store, {
      workspaceId: options.workspaceId ?? null,
      now: options.now,
      stalenessSeconds: options.stalenessSeconds,
    });
    // milestone 35 / story 03 — the ONE additional read this seam threads
    // through: every assignment row (bulk, unfiltered — shapeGlobalStatus does
    // the per-item/per-node join, keeping the join logic PURE and headlessly
    // testable rather than a second SQL WHERE clause here).
    const assignments = listAllAssignments(store);

    return shapeGlobalStatus({
      paths,
      workProjection,
      registry,
      assignments,
      now: options.now,
      // m43 / story 04 (ADR-006) — the CACHE-freshness window, resolved through the ONE
      // resolver. Deliberately a DISTINCT option from `options.stalenessSeconds` above,
      // which is the PRESENCE window the registry query takes: they answer different
      // questions ("is this node alive" vs "how old is this copy") over different cadences,
      // and collapsing them onto one option is how two facts come to share a number.
      cacheStalenessSeconds: options.cacheStalenessSeconds ?? resolveCacheStalenessSeconds(options.config),
    });
  } finally {
    if (ownsStore) store.close?.();
  }
}

async function openGlobalStoreOrCodedError(options) {
  try {
    return await openGlobalWorkProjectionStore(options);
  } catch (error) {
    // Any store-open failure (missing SQLite runtime, a too-new schema, a locked/
    // corrupt database file, …) surfaces as ONE stable code the UI/API can render —
    // "global-store-unavailable" — carrying the database path so the operator knows
    // exactly which file to inspect (task 03: "the error state includes the global
    // mesh path").
    throw globalStoreError(
      `The global mesh work store is unavailable at ${options.paths.databasePath}: ${error.message}`,
      "global-store-unavailable",
      503,
      { path: options.paths.databasePath, cause: error.code ?? null },
    );
  }
}

// milestone 35 / story 03 (DESIGN §2a/§2b; task 00) — the ADR-001 active states,
// restated here (not re-imported from assignment-record.mjs) because this
// function must stay a PURE function of its plain-object inputs only — no store,
// no live import graph beyond what its caller already threads in. Kept in the
// SAME order/spelling as ACTIVE_ASSIGNMENT_STATES so the two never drift.
const ACTIVE_ASSIGNMENT_STATES_FOR_SHAPE = new Set(["assigned", "accepted", "running"]);

// The "most-relevant" assignment for one (workspaceId, itemRef) pair (DESIGN §2a
// PRIMARY attachment — the item row carries exactly one assignment, the chip
// anatomy's subject). An ACTIVE assignment (assigned/accepted/running) always
// wins over a terminal one — it is the "more actionable state" the chip
// prioritises; `listAllAssignments` already orders most-recent-first, so among
// several rows for the same item the first active row, or else the first
// (latest) row overall, is picked. Never fabricates a row when none exists.
function pickItemAssignment(rows) {
  if (!rows || rows.length === 0) return null;
  const active = rows.find((row) => ACTIVE_ASSIGNMENT_STATES_FOR_SHAPE.has(row.state));
  return active ?? rows[0];
}

// The read-shape's assignment projection (task 00: "the read layer applies no
// chip label or colour to the row — that is the render layer's job"). Carries
// the chip-anatomy fields VERBATIM off the ADR-001 record — state and
// reclaimedAt travel byte-for-byte so a `reclaimed` row keeps its provenance for
// task 01's helper to read.
// milestone 38 / story 06 / task 04 (BLOCKER F-38.06c; ADR-013 + ADR-014) —
// `sessionId` is an ADDITIVE key appended AFTER the eight pre-existing ones,
// every one of which keeps its m35 meaning byte-for-byte. It is the OTHER half
// of the ADR-014 (nodeId, sessionId) routing tuple — the projected row already
// carried `targetNodeId`, so with the session id the browser can finally resolve
// WHICH `/ws/terminal-view` stream this card should open.
//
// "ABSENT, NOT FALSE" — the same house rule the `assignment`/`assignments`
// attachments below keep: an assignment with no session id yet OMITS the key
// entirely rather than shipping a fabricated `""`/placeholder, so a card can
// never mistake "not captured yet" for "a stream you can open".
//
// milestone 49 / story 00 — `code` is the SECOND additive key, appended after
// `sessionId` under the SAME guard, and it is the one hop that stood between a
// fact this system already produces and a browser that could read it. The worker
// reports a live blocked agent as `sendAssignmentStatus(id, "running", { code:
// "needs-input" })` (mesh-worker-execution.mjs), the control node persists it
// (control-stream-server.mjs) and the shared row mapper already returns it
// (assignment-record.mjs) — only this literal dropped it.
//
// IT IS A COLUMN, NOT A `needs-input` FLAG, and the projection COPIES it: no
// whitelist, no boolean translation, no closed-set validation. Production writes
// `"resumed"` on this same column (the one sanctioned terminal revival) and a
// future build will write words this one has never heard of; a filter here would
// make the read shape a SECOND authority over a vocabulary the worker owns. The
// consequence belongs to the reader: a `needs input` mark keys on the exact word,
// never on truthiness, or a resumed session renders as one waiting on a human.
//
// The guard tests the VALUE, never the key: every row reaching this function came
// through `mapAssignmentRow`, which normalises to `code: null`, so `"code" in row`
// is true for every row ever projected. `typeof === "string" && length > 0` is
// `sessionId`'s own guard byte-for-byte — deliberately not a trimming rule its
// sibling key does not have — and it is what keeps a code-less row at exactly the
// pre-existing eight keys.
function projectAssignment(row) {
  if (!row) return null;
  const projected = {
    assignmentId: row.assignmentId,
    state: row.state,
    targetNodeId: row.targetNodeId,
    issuer: row.issuer,
    runId: row.runId,
    assignedAt: row.assignedAt,
    updatedAt: row.updatedAt,
    reclaimedAt: row.reclaimedAt,
  };
  if (typeof row.sessionId === "string" && row.sessionId.length > 0) {
    projected.sessionId = row.sessionId;
  }
  if (typeof row.code === "string" && row.code.length > 0) {
    projected.code = row.code;
  }
  return projected;
}

// ───────────────────────────────── the fleet-side session index (m48/story 03) ──
//
// milestone 48 / story 03 (ADR-007, with ADR-003's authority split and ADR-010's R2
// miss ruling) — "what live sessions exist across the mesh, and what is each one
// doing", answered as an O(1) lookup on `(nodeId, sessionId)` instead of a scan of
// assignments. It lives HERE, in the module that already IS the control node's no-I/O
// shaper over `{ registry, assignments }` and already groups the assignment rows by
// `targetNodeId` — no new table, no new file, no new `src/` root sibling (ADR-009).
//
// A PROJECTION, NEVER A TABLE, and that negative is the load-bearing one. The source
// of truth is a TTL-expiring disk record, so a SQLite table would make the control
// node a WRITER of session state with its own row lifetime and therefore its own
// expiry rule: a second authority over liveness (forbidden by the SPEC and ADR-003)
// and a second staleness rule (forbidden by `acd-session-ttl-reuses-isstale`). This
// function opens no store, writes no file, holds no state and caches nothing, so the
// same `{ nodes, assignments }` always rebuild a content-identical index and nothing
// here can ever go stale.
//
// A LOOKUP IN-PROCESS, AN ARRAY ON THE WIRE. `lookup(nodeId, sessionId)` answers the
// tuple question; `sessions` is its deterministic array form, sorted by
// `(nodeId, sessionId)` ascending codepoint order so a polling fleet never sees rows
// reshuffle. The lookup is NESTED (node → session) and NEVER materialises a composed
// `"${nodeId}::${sessionId}"` key: that string is the terminal mirror's own private
// routing spelling (`mesh-terminal-mirror.mjs`), and two spellings of one tuple drift.
// A nested lookup has no spelling to drift — and it keeps this pure shaper free of any
// import edge to the relay transport.
//
// THE THIRD MEMBER OF THE ADR'S SIGNATURE, `now`, IS DELIBERATELY NOT READ. Callers
// may pass it (`buildSessionIndex({ nodes, assignments, now })` is the documented
// call), but there is no clock in this function to read it with: session-level
// liveness is NEVER re-derived at the control. The publishing node already TTL-filtered
// its own sessions before publishing and the control carries that through VERBATIM —
// a second TTL evaluation here could disagree with the publisher (two machines, two
// configured `config.mesh.session.ttlSeconds`) and would be exactly the second
// authority the SPEC forbids. Node-level gate: yes. Session-level re-filter: no.
//
// A DUPLICATE TUPLE IS RESOLVED, NEVER COLLAPSED BY ARRIVAL ORDER (48/ADR-013 R12).
// `(nodeId, sessionId)` is required-unique HERE because it is an ADDRESS — an address
// that resolves to two things is not an address — but it is NOT unique in the STORE:
// ADR-002 keys the record on `(nodeId, workspaceId, assistant, sessionId)` and the hook
// derives `workspaceId` from the payload's own cwd, so ONE session whose working
// directory moves between repos legitimately pings a SECOND leaf under the SAME id and
// both records are live for one TTL window. That is a session mid-move, not an error.
// The candidates are therefore ordered and the FIRST one wins, so the index is
// byte-identical whatever order the filesystem handed the leaves over in — the previous
// `if (forNode.has(sessionId)) continue` kept whichever leaf `readdir` returned first,
// a different answer on NTFS than on ext4.
export function buildSessionIndex({ nodes, assignments } = {}) {
  const rowsByNodeSession = sessionAssignmentRows(assignments);
  // nodeId -> Map<sessionId, entry> — the NESTED lookup (no composed key, ever). It is
  // also where the R12 resolution happens: the map holds the WINNER for each tuple, and
  // the wire array below is the candidates the map still points at.
  const byNode = new Map();
  // Every candidate entry, in arrival order. It is NOT the answer: a tuple that was
  // published twice contributes twice here and exactly once to the index.
  const sessions = [];

  // A value that is not a string STATES NOTHING (ADR-010 R3's discipline, one layer up),
  // and a fact nobody stated cannot win a comparison — it sorts LAST in whichever
  // direction the field is read.
  const stated = (value) => (typeof value === "string" ? value : null);

  // R12's TOTAL ORDER over the candidates for ONE `(nodeId, sessionId)`: latest
  // `lastPingAt` first (DESCENDING), then ascending `workspaceId`, `repo`, `assistant`.
  // Returns true when `candidate` outranks the entry already held for the tuple.
  //
  // LATEST PING WINS is the only answer that can be RIGHT rather than merely stable: the
  // duplicate exists because the session MOVED, so the freshest record is where it
  // actually is — picking the oldest or the first-read addresses a workspace the session
  // has already left, which is a wrong repo label and a wrong-workspace terminal.
  //
  // COMPARED AS A STRING, with the same plain `<`/`>` codepoint comparison ADR-007
  // already mandates for the array sort: NO `Date.parse` and NO clock, so ADR-007's
  // no-clock clause holds byte-for-byte. It is chronological for the ISO-8601 UTC-Z form
  // every producer in this fleet emits, and deterministic for anything else.
  //
  // It lives INSIDE this function deliberately: the fitness function
  // (`acd-session-index-derived-not-stored`) scopes its no-I/O / no-clock / no-TTL rules
  // to the index-path function bodies it names, and a comparison hoisted to an unnamed
  // module-level sibling would sit outside every one of those rules.
  const outranks = (candidate, held) => {
    const candidatePing = stated(candidate.lastPingAt);
    const heldPing = stated(held.lastPingAt);
    if (candidatePing !== heldPing) {
      if (candidatePing === null) return false;
      if (heldPing === null) return true;
      return candidatePing > heldPing;
    }
    for (const field of ["workspaceId", "repo", "assistant"]) {
      const candidateValue = stated(candidate[field]);
      const heldValue = stated(held[field]);
      if (candidateValue === heldValue) continue;
      if (candidateValue === null) return false;
      if (heldValue === null) return true;
      return candidateValue < heldValue;
    }
    // Equal under the whole stated order: the tuple is already answered, so the held
    // entry stays. Nothing observable distinguishes the two.
    return false;
  };

  for (const node of nodes ?? []) {
    const nodeId = node?.nodeId;
    if (typeof nodeId !== "string" || nodeId.length === 0) continue;
    // THE FRESHNESS GATE — required, not defensive (ADR-007). A node that stops
    // heartbeating leaves its presence file frozen on disk with its sessions inside
    // it, which would otherwise read as live forever. This reads the fact the registry
    // ALREADY derived (`freshnessFor`, global-node-registry.mjs) rather than
    // re-deriving node liveness, so the index and the fleet's own health dot can never
    // disagree about one machine. `"stale"` and `"unknown"` contribute ZERO —
    // ambiguity fails CLOSED (m26/ADR-003).
    if (node.freshness !== "live") continue;
    // `presence` comes off disk through a raw JSON.parse and is passed through
    // unvalidated, so `sessions` is whatever that file held. A non-array (an object, a
    // string, a number) is NOT iterable, and a `for…of` over it would throw out of
    // `shapeGlobalStatus` — the control node's only status shaper, behind `/api/status`,
    // the fleet page and `aof mesh status --json`. One corrupt presence record must not
    // blind the whole fleet: this is the ARRAY-level half of the guard whose ENTRY-level
    // half is one line below, and it is the same house rule this seam already keeps
    // (`safeSessionArray` at the control's wire hop; `readSessionRecordsForNode` skips a
    // torn record "rather than blinding the whole list"). Ambiguity fails CLOSED
    // (m26/ADR-003): the node contributes no sessions, it does not take the fleet down.
    for (const session of Array.isArray(node.presence?.sessions) ? node.presence.sessions : []) {
      if (session == null || typeof session !== "object") continue;
      const sessionId = session.sessionId;
      // An ANONYMOUS session (`sessionId: null`, ADR-001) is absent from the index —
      // arithmetic, not policy: an index keyed on `(nodeId, sessionId)` cannot hold an
      // entry whose id is null. It stays COMPLETE and first-class in
      // `nodes[].presence.sessions[]`, which this function never edits: `sessions[]` is
      // the complete liveness truth, the index is its ADDRESSABLE subset.
      if (typeof sessionId !== "string" || sessionId.length === 0) continue;
      let forNode = byNode.get(nodeId);
      if (!forNode) {
        forNode = new Map();
        byNode.set(nodeId, forNode);
      }
      // THE ENTRY (ADR-007), in this exact order: `nodeId` leads (the other half of the
      // routing tuple), then ADR-005's frozen six verbatim and in order, then the ONE
      // derived field. It is SELF-SUFFICIENT — a consumer answers "what live sessions
      // exist across the mesh" from this array alone, with no join back into
      // `nodes[].presence`.
      const entry = {
        nodeId,
        sessionId,
        workspaceId: session.workspaceId,
        repo: session.repo,
        assistant: session.assistant,
        lastPingAt: session.lastPingAt,
        // The FACT, never the decision (ADR-004) — and read with the SAME strict
        // comparison ADR-010's R3 fixes at the formatter, for the same reason: a
        // producer that sends no boolean (a pre-m48 node, which already applied the
        // subsumption rule at its own producer) has not STATED the fact, and an
        // unstated fact is `false`. One rule covers the absent key and the malformed
        // value, and the wire keeps its unconditional eight-key entry.
        workspaceHasRun: session.workspaceHasRun === true,
        // DERIVED ONTO the session and stored nowhere (ADR-003): `null` for a free
        // session — never omitted, never a fabricated ref — and `{ ref, assignmentId }`
        // when an assignment matches on BOTH node and session.
        workItem: sessionWorkItem(rowsByNodeSession, nodeId, sessionId),
        // 50/ADR-008 decision 8, hop 4 of 4 — the NINTH key, APPENDED after `workItem`,
        // UNCONDITIONAL and read with the SAME strict `=== true` as `workspaceHasRun`
        // three lines up, for the same reason: a node that STATES nothing has not stated
        // this, and an unstated fact is `false`. It rides to the browser, where m49's feed
        // axis reads it as the SECOND half of a disjunction — `establishedProducer(workItem)
        // OR relaying === true` — so a launched session (no assignment, `workItem: null`,
        // but genuinely bridged) renders as a live pane instead of a dead tile. The wire
        // states a TRANSPORT fact; the browser keeps its own word. No vocabulary crosses.
        relaying: session.relaying === true,
      };
      // ONE TUPLE, ONE ENTRY — resolved, not collapsed (R12). The held entry keeps the
      // address unless this candidate outranks it under the stated total order. The
      // WITHHELD candidate is not lost and is not a degrade: `nodes[].presence.sessions[]`
      // still carries BOTH records, which is ADR-007's own division restated —
      // `sessions[]` is the complete liveness truth, the index is its ADDRESSABLE subset.
      const held = forNode.get(sessionId);
      if (held && !outranks(entry, held)) continue;
      forNode.set(sessionId, entry);
      sessions.push(entry);
    }
  }

  // ONE ROW PER TUPLE, and the map is what says which one. A candidate the map no longer
  // points at was outranked by a later one, so it is not the address's answer — an
  // identity check, never a second copy of the ordering rule.
  const indexed = sessions.filter((entry) => byNode.get(entry.nodeId)?.get(entry.sessionId) === entry);

  // Ascending codepoint order, node then session — a plain `<`/`>` comparison, never a
  // locale-sensitive collation, so two surfaces can never disagree about order. Every
  // tuple is unique after the resolution above, so this is a TOTAL order on the array:
  // the same candidates, in any arrival order, sort to a byte-identical result.
  indexed.sort((a, b) => {
    if (a.nodeId !== b.nodeId) return a.nodeId < b.nodeId ? -1 : 1;
    if (a.sessionId !== b.sessionId) return a.sessionId < b.sessionId ? -1 : 1;
    return 0;
  });

  return {
    sessions: indexed,
    // ADR-010 R2 — a MISS is `null`, returned EXPLICITLY, never `undefined`. "Asked,
    // and found nothing" is `null` everywhere on this path (`readSessionRecord`,
    // `pickItemAssignment`, `configuredRelayUrl`), and `undefined` cannot distinguish
    // "no such session" from "no such lookup" — a distinction an addressability check
    // may not lose. It never throws for any input: anything that is not a non-empty
    // string in either position is a miss, because a half-specified tuple is not
    // addressable (ambiguity fails CLOSED). A HIT returns the SAME entry object the
    // array carries, not a second shape a caller would have to discriminate.
    lookup(nodeId, sessionId) {
      if (typeof nodeId !== "string" || nodeId.length === 0) return null;
      if (typeof sessionId !== "string" || sessionId.length === 0) return null;
      return byNode.get(nodeId)?.get(sessionId) ?? null;
    },
  };
}

// The assignment side of the join, grouped by the TWO-COLUMN key
// `(target_node_id, session_id)` — nodeId -> Map<sessionId, row[]>, again nested
// rather than composed.
//
// The two-column key is the whole point (ADR-003): session ids are opaque values from
// another system and nothing guarantees a worker's id is unique across machines, so a
// one-column match would pass the happy path and quietly attribute one machine's work
// to another's session. A row whose `sessionId` is ABSENT or `null` is skipped rather
// than treated as a wildcard — an assignment omits it entirely until its worker
// captures one mid-run (m38/ADR-013's "absent, not false"), and a wildcard there would
// attribute someone else's work to this session.
function sessionAssignmentRows(assignments) {
  const byNode = new Map();
  for (const row of assignments ?? []) {
    const nodeId = row?.targetNodeId;
    const sessionId = row?.sessionId;
    if (typeof nodeId !== "string" || nodeId.length === 0) continue;
    if (typeof sessionId !== "string" || sessionId.length === 0) continue;
    let forNode = byNode.get(nodeId);
    if (!forNode) {
      forNode = new Map();
      byNode.set(nodeId, forNode);
    }
    const rows = forNode.get(sessionId);
    if (rows) rows.push(row);
    else forNode.set(sessionId, [row]);
  }
  return byNode;
}

// The one-directional derivation itself: the assignment row for this tuple, projected
// to EXACTLY `{ ref, assignmentId }` and nothing else. The item's own title, status and
// workspace are already in the payload's `items[]`, joinable on the ref — copying them
// here would be a second derivation of facts the payload already carries once. The
// tie-break for a tuple that carries several rows is `pickItemAssignment`, this
// module's OWN existing rule (an active row wins over a terminal one, else the
// most-recent row `listAllAssignments` already ordered first) — not a second policy.
function sessionWorkItem(rowsByNodeSession, nodeId, sessionId) {
  const picked = pickItemAssignment(rowsByNodeSession.get(nodeId)?.get(sessionId));
  if (!picked) return null;
  return { ref: picked.itemRef, assignmentId: picked.assignmentId };
}

// Shape the two query results into the ONE global status payload. Kept a pure
// function of its inputs (no I/O) so the shaping is independently testable without a
// live store.
export function shapeGlobalStatus({ paths, workProjection, registry, assignments, now, cacheStalenessSeconds }) {
  const workspaceRows = workProjection.workspaces ?? [];
  const itemRows = workProjection.items ?? [];
  const registryWorkspaces = registry.workspaces ?? [];
  const registryByWorkspaceId = new Map(registryWorkspaces.map((w) => [w.workspaceId, w]));

  // milestone 35 / story 03 (DESIGN §2a/§2b) — attach assignment rows onto the
  // item and node rows. ADDITIVE ONLY: every pre-existing field on `items`/
  // `nodes` keeps its m34 meaning byte-for-byte (the assignment field is a new
  // key appended per row); "absent, not false" — an item/node with no matching
  // assignment carries no `assignment(s)` field at all, never a synthesized
  // zero-count/default row (a reader that ignores the new field is unaffected).
  const assignmentRows = assignments ?? [];
  const assignmentsByItem = new Map();
  const assignmentsByNode = new Map();
  for (const row of assignmentRows) {
    const itemKey = `${row.workspaceId} ${row.itemRef}`;
    if (!assignmentsByItem.has(itemKey)) assignmentsByItem.set(itemKey, []);
    assignmentsByItem.get(itemKey).push(row);

    if (row.targetNodeId != null) {
      if (!assignmentsByNode.has(row.targetNodeId)) assignmentsByNode.set(row.targetNodeId, []);
      assignmentsByNode.get(row.targetNodeId).push(row);
    }
  }

  // The workspaces summary (DESIGN "workspaces summary: … with status/freshness"):
  // join the projection's published-workspace rows with the registry's mesh-enabled /
  // control-node descriptor facts when a matching descriptor exists. A workspace that
  // has published work but has no registry descriptor yet (registry publish lags the
  // work publish) still renders — meshEnabled/controlNode read as unknown (null),
  // never a thrown join failure.
  const workspaces = workspaceRows.map((row) => {
    const descriptor = registryByWorkspaceId.get(row.workspaceId);
    return {
      workspaceId: row.workspaceId,
      projectRoot: row.projectRoot,
      workDir: row.workDir,
      name: row.name,
      lastPublishedAt: row.lastPublishedAt,
      meshEnabled: descriptor ? descriptor.meshEnabled === true : null,
      controlNode: descriptor ? descriptor.controlNode ?? null : null,
    };
  });

  // A registry-only workspace descriptor (published its node/registry snapshot but the
  // work-projection has no rows for it yet, e.g. an empty work stream) still surfaces
  // in the summary — the workspaces list is the UNION of both projections, not just
  // the work-item side.
  for (const descriptor of registryWorkspaces) {
    if (workspaceRows.some((row) => row.workspaceId === descriptor.workspaceId)) continue;
    workspaces.push({
      workspaceId: descriptor.workspaceId,
      projectRoot: descriptor.projectRoot,
      workDir: descriptor.workDir,
      name: descriptor.name,
      lastPublishedAt: descriptor.publishedAt ?? null,
      meshEnabled: descriptor.meshEnabled === true,
      controlNode: descriptor.controlNode ?? null,
    });
  }
  workspaces.sort((a, b) => (a.workspaceId < b.workspaceId ? -1 : a.workspaceId > b.workspaceId ? 1 : 0));

  // The health/diagnostics region (DESIGN "shows projection freshness, disabled/
  // non-propagating workspaces, and store errors"; task 03 scenario "health
  // diagnostics expose projection freshness and skipped workspace counts").
  //
  // A "skipped" workspace is a REAL, derivable fact already carried by the registry
  // projection (ADR-002/ADR-005): a workspace whose descriptor was published with
  // `meshEnabled: false` is one `work doctor` already flags as mesh-configured but not
  // opted into global propagation (ARCHITECTURE ADR-002 consequences) — the SAME
  // "mesh-global-disabled" code the publisher's own enablement predicate returns
  // (global-work-publisher.mjs MESH_GLOBAL_DISABLED_CODE), so the UI and the publisher
  // agree on one vocabulary without a second store table.
  const projectedAt = latestTimestamp(workspaceRows.map((row) => row.lastPublishedAt));
  const skippedWorkspaces = registryWorkspaces
    .filter((descriptor) => descriptor.meshEnabled === false)
    .map((descriptor) => ({
      workspaceId: descriptor.workspaceId,
      reason: MESH_GLOBAL_DISABLED_CODE,
      message: "Global work propagation is disabled until config.mesh.enabled is true.",
    }));
  const descriptorErrors = (registry.errors ?? []).map((entry) => ({
    id: entry.id,
    path: entry.path,
    code: entry.code,
    message: entry.message,
  }));
  const projectionErrors = (workProjection.errors ?? []).map((entry) => ({
    workspaceId: entry.workspaceId,
    sourcePath: entry.sourcePath,
    code: entry.code,
    message: entry.message,
  }));

  // milestone 35 / story 03 (DESIGN §2a PRIMARY) — attach the most-relevant
  // assignment onto each item row, keyed by (workspaceId, ref). Every
  // pre-existing item field is spread through byte-unchanged; `assignment` is
  // the ONLY new key, and it is OMITTED (not a null/empty placeholder) when the
  // item carries no assignment — "absent, not false".
  const items = itemRows.map((item) => {
    const rows = assignmentsByItem.get(`${item.workspaceId} ${item.ref}`);
    const picked = pickItemAssignment(rows);
    if (!picked) return item;
    return { ...item, assignment: projectAssignment(picked) };
  });

  // milestone 35 / story 03 (DESIGN §2b SECONDARY) — attach the assignments a
  // node HOLDS onto its node row, keyed by targetNodeId; the UI summarises
  // counts by state. Omitted (no `assignments` key) when the node holds none.
  const nodes = (registry.nodes ?? []).map((node) => {
    const rows = assignmentsByNode.get(node.nodeId);
    if (!rows || rows.length === 0) return node;
    return { ...node, assignments: rows.map(projectAssignment) };
  });

  return {
    scope: "global",
    workspaceId: workProjection.workspaceId ?? null,
    // m43 / story 04 — the cache-freshness WINDOW, once for the whole payload, beside the
    // rows that carry the facts (`reportedBy`/`syncedAt`) a reader applies it to. The same
    // key, the same resolver and the same "stated once, never per row" discipline as the
    // board's `/api/work/list` envelope. When a caller supplies nothing the payload states
    // the documented default rather than omitting the key: DESIGN's absent-window degrade
    // is for a wire that genuinely cannot answer, not for one that simply did not bother.
    stalenessSeconds: cacheStalenessSeconds ?? resolveCacheStalenessSeconds(undefined),
    workspaces,
    items,
    nodes,
    // milestone 48 / story 03 (ADR-007) — the fleet-side session index, ONE ADDITIVE
    // top-level key. Every pre-existing key above and below keeps its meaning and its
    // relative position byte-for-byte; this is an INSERTION beside the rows it derives
    // from, never a reorder. It is built from the SHAPED `nodes` (the very rows this
    // payload carries), so the index and `nodes[].presence.sessions[]` can never
    // describe different fleets — and `nodes` itself is left untouched: the index
    // DERIVES FROM the per-node liveness, it never replaces or edits it.
    sessions: buildSessionIndex({ nodes, assignments: assignmentRows, now }).sessions,
    diagnostics: {
      projectedAt,
      generatedAt: now ?? new Date().toISOString(),
      databasePath: paths.databasePath,
      skippedWorkspaces,
      descriptorErrors,
      projectionErrors,
    },
  };
}

function latestTimestamp(values) {
  let latest = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) continue;
    const ms = Date.parse(value);
    if (!Number.isFinite(ms)) continue;
    if (ms > latestMs) {
      latestMs = ms;
      latest = value;
    }
  }
  return latest;
}
