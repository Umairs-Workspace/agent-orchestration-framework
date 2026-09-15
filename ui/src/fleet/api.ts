// The fleet view's read model + its `/api/mesh/status` client. The wire shapes
// mirror the LOCKED mesh:status aggregate (ARCHITECTURE 25/ADR-002) and the ONE
// server route in src/mesh/ui-serve.mjs. The fleet view reads this ONE command and
// adds no second read (ADR-003) — every node/board fact on the page comes from
// this single fetch.

// milestone 47 / story 01 (ADR-006(b)) — `RunState`, `FleetBoard` and `MeshStatus`
// LEFT THIS FILE with the unreachable local-shape branch that was their last reader
// (`ui/src/fleet/Fleet.tsx`'s `BoardsRegion`/`BoardTile`/`boardRunState`/
// `BoardDrillIn`, and the `isGlobalStatus` narrowing above them). They were the
// residue of a SUPERSEDED decision, not a gap: m25/ADR-002's "one command, both
// faces" was replaced for nodes, workspaces and items by m34/ADR-006's global
// projection, and the boards half was never migrated — so this face has never been
// served a payload carrying them. The `boards` aggregate itself is untouched and
// still produced by `mesh:status` (`src/commands/mesh-identity.mjs`) for the CLI
// face, which still renders it. A future boards region on THIS face is described by
// m47/ADR-006, and its row must carry `workspaceId` and come from the global
// projection — at which point the wire type it needs is a new one, not this one
// restored. `RunState` went with them: `FleetBoard.currentRun` was its only user
// here (the board surface keeps its own in `ui/src/board/api.ts`).

// A live coding-assistant session, projected onto the presence record (milestone 38
// / story 00; ARCHITECTURE ADR-001/002) — already TTL-filtered to LIVE sessions only
// by the presence aggregate before the wire ever carries it (the card renders only
// what it is handed, never recomputing liveness itself).
//
// milestone 48 / story 01 (ADR-005) — the FROZEN, ORDERED SIX. This declaration is
// the TYPED MIRROR of what `readLiveSessions` (src/mesh/presence.mjs) emits: exactly
// these six keys, in this order. It is a type ON THE WIRE, not a UI surface — a type
// that lags the wire is how the next milestone reads a field that is not there. The
// entry grew by INSERTION at the head and APPEND at the tail; the m38 four keep their
// relative order (m38/ADR-001's additive discipline, one level down from the record).
//   - `sessionId` is `string | null` and is NEVER absent (ADR-001): *absent* would
//     mean "this producer does not speak this dimension", and after this milestone
//     every producer does; `null` is the honest "speaks it, has no id" — a session
//     that is LIVE but not ADDRESSABLE. No tuple ⇒ no socket.
//   - `workspaceHasRun` is the FACT (a run was live in this session's workspace when
//     the record was assembled), never the DECISION: subsumption is a display rule the
//     formatter applies (ADR-004), so a reader must not treat this as "hide me".
export type PresenceSession = {
  sessionId: string | null;
  workspaceId: string;
  repo: string;
  assistant: string;
  lastPingAt: string;
  workspaceHasRun: boolean;
  // milestone 50 / story 04 (ADR-008 decision 8) — the SEVENTH key, APPENDED AT THE TAIL,
  // which is the only growth m48/ADR-005 permits this projection ("an INSERTION at the head
  // and an APPEND at the tail, NEVER a reorder"). The typed mirror of `readLiveSessions`'s
  // own append; acd-session-entry-frozen-wire pins the two in step.
  //
  // The WORKER states it and only the worker: something is bridging this session's PTY
  // output up its stream. Always present, always a boolean — the projection reads the
  // record with a strict `=== true`, so a record written before this key existed projects
  // `false` rather than `undefined`.
  relaying: boolean;
};

// A presence record (m23 story 00 — { nodeId, heartbeatAt, activeRuns, aofVersion });
// milestone 38 / story 00 (ADR-001) grows it ADDITIVELY to FIVE keys, `sessions`
// inserted before `aofVersion` — a no-session node emits `sessions: []` (present,
// never omitted). Present ONLY when the node has beat at least once; a never-beat
// node OMITS this key entirely (the m23 locked rule) and reads stale:false.
export type PresenceRecord = {
  nodeId: string;
  heartbeatAt: string;
  activeRuns: string[];
  sessions: PresenceSession[];
  aofVersion: string;
};

// A fleet node — the m22 node record (nodeId + capability footer fields) joined
// with its presence + the derived stale flag (mesh:status, src/commands/
// mesh-identity.mjs). presence is absent for a never-beat node; stale is a FACT the
// card renders (it never recomputes staleness).
//
// milestone 47 / story 01 — IT STAYS, and this note is why a "reduce api.ts to what
// still has a reader" pass must not take it: ADR-006(b)'s deletion removed its last
// reader in `Fleet.tsx`, but `./scope.d.mts` still types `nodePanelFacts` and
// `nodeCurrentWork` against it — both of which deliberately span BOTH node shapes,
// which is exactly what lets the global node panel render whatever roster it is
// handed.
export type FleetNode = {
  nodeId: string;
  host?: string;
  os?: string;
  runtimes?: string[];
  skills?: string[];
  aofVersion?: string;
  publishedAt?: string;
  presence?: PresenceRecord;
  stale: boolean;
  // The "this node" marker — mesh:status flags the node whose id is the local
  // install's config.mesh.nodeId (25/design-gap B). Present (true) ONLY on the
  // local node; omitted otherwise (the never-beat "absent, not false" idiom).
  local?: boolean;
};

// --- milestone 34 / story 03 — the GLOBAL scope shapes (ADR-006 default read) ---

// A workspace row from the global work-projection + registry join
// (src/global-mesh-query.mjs shapeGlobalStatus) — the "workspaces summary" region.
export type GlobalWorkspace = {
  workspaceId: string;
  projectRoot: string;
  workDir: string;
  name: string | null;
  lastPublishedAt: string | null;
  meshEnabled: boolean | null;
  controlNode: string | null;
};

// milestone 35 / story 03 (DESIGN §2a/§2b; ADR-001/ADR-007) — the READ-ONLY
// assignment-lifecycle wire shape src/global-mesh-query.mjs's `shapeGlobalStatus`
// attaches onto item/node rows (task 00). Carries the ADR-001 record's
// chip-anatomy fields VERBATIM (no label/token/mark applied at the read layer —
// that mapping is the pure `assignmentChip` helper, ./assignments.mjs).
//
// milestone 38 / story 06 / task 04 (BLOCKER F-38.06c; ARCHITECTURE ADR-013 +
// ADR-014) — `sessionId` is ADDITIVE: the worker-captured interactive session id
// that, together with `targetNodeId`, forms the (nodeId, sessionId) tuple the
// read-only `/ws/terminal-view` mirror routes by. OPTIONAL by design — an
// assignment whose worker has not captured a session yet omits the key entirely
// ("absent, not false"), and a card with no resolvable tuple opens NO socket
// (ADR-014 invariant 4: never a guessed or defaulted session).
export type WorkAssignment = {
  assignmentId: string;
  state: string;
  targetNodeId: string;
  issuer: string;
  runId: string | null;
  assignedAt: string;
  updatedAt: string;
  reclaimedAt: string | null;
  sessionId?: string;
  // milestone 49 / story 00 — the status-refinement `code` the worker already
  // reports (`needs-input`, `resumed`, …) reaches the wire. OPTIONAL and
  // `string`, never `string | null`: the projection OMITS the key when the row
  // states no code, so this says exactly what `sessionId` above says. A reader
  // keys on the EXACT word, never on truthiness — `resumed` is not `needs-input`.
  code?: string;
};

// A work item row, carrying its owning workspace id. The global API keeps the
// complete stream even when the UI projects it to milestone cards.
//
// milestone 35 / story 03 — `assignment` is the PRIMARY attachment (DESIGN
// §2a): the most-relevant assignment for this item, when one exists. Absent
// (never a null/empty placeholder) for an item with no assignment — "absent,
// not false".
export type GlobalWorkItem = {
  workspaceId: string;
  ref: string;
  type: string;
  slug: string;
  status: string | null;
  title: string | null;
  parent: string | null;
  sourcePath: string;
  assignment?: WorkAssignment;
  // The CACHE-PROVENANCE pair (milestone 43 / ADR-006) — the SAME two wire names
  // the board's row carries, mapped from `work_items.node_id`/`updated_at` by the
  // one row mapper (`global-work-store.mjs`'s `mapItemRow` → `toWireProvenance`),
  // never a fleet-local translation. Both keys are EXPLICITLY PRESENT (null when
  // unknown) for a cache-published row and ABSENT for a workspace the cache does
  // not publish: presence, not value, is what tells a surface whether this is a
  // copy of something another machine said.
  reportedBy?: string | null;
  syncedAt?: string | null;
  // milestone 127 / ADR-006 — the three roots, as the ONE row mapper (`mapItemRow`) states
  // them, the same three optional keys the board's `WorkItem` carries: a BACKLOG row is
  // `number: null` + `backlog` (its group path, `""` at the top; its ref is its slug), an
  // ARCHIVED row is `archived: true`. All three are ABSENT on a live row. The fleet's milestone
  // list partitions the backlog out on `number === null` (`scope.mjs`) and leaves an archived
  // row to its status filter; nothing here reads a ref's shape.
  number?: null;
  backlog?: string;
  archived?: true;
};

// A global registry node descriptor (src/global-node-registry.mjs) — the "node
// panel" region's control/worker rows. Never carries a credential-shaped field
// (ADR-005; the UI guard in ./scope.mjs re-checks this belt-and-braces).
//
// milestone 35 / story 03 — `assignments` is the SECONDARY attachment (DESIGN
// §2b): every assignment row this node HOLDS (any state), when at least one
// exists. Absent (never an empty array) for a node holding none — "absent, not
// false"; the UI summarises this array down to a compact per-state count line.
export type GlobalNode = {
  nodeId: string;
  role: "control" | "worker" | string;
  controlNode: boolean;
  host: string;
  os: string;
  runtimes: string[];
  skills: string[];
  aofVersion: string;
  publishedAt: string;
  lastSeenAt: string | null;
  fabric: { address: string | null; online: boolean | null };
  recordSource: string;
  workspaceIds: string[];
  freshness: "live" | "stale" | "unknown";
  assignments?: WorkAssignment[];
  // finding F6 (aof:verify 38) — the global registry row now ADDITIVELY carries
  // this node's presence record (src/global-node-registry.mjs's queryGlobalRegistry),
  // alongside the pre-existing `freshness` ramp (unchanged). Absent for a
  // never-beat node — never a fabricated empty record.
  presence?: PresenceRecord;
};

// The health/diagnostics region's payload (task 03 — freshness, skipped
// workspaces, descriptor/projection errors).
export type GlobalDiagnostics = {
  projectedAt: string | null;
  generatedAt: string;
  databasePath: string;
  skippedWorkspaces: { workspaceId: string; reason: string; message: string }[];
  descriptorErrors: { id: string | null; path: string; code: string; message: string }[];
  projectionErrors: { workspaceId: string; sourcePath: string; code: string | null; message: string }[];
};

// An entry of the FLEET-SIDE SESSION INDEX (milestone 48 / story 03; ADR-007) — the
// typed mirror of what `buildSessionIndex` (src/global-mesh-query.mjs) projects onto
// the payload's `sessions` array. A type ON THE WIRE, not a UI surface: it describes
// the contract the next milestone's surfaces consume, and a type that lags the wire is
// how one of them reads a field that is not there.
//
// THE ORDER IS THE CONTRACT: `nodeId` leads (the other half of the `(nodeId, sessionId)`
// routing tuple), then `PresenceSession`'s frozen six verbatim and in order, then the
// ONE derived field. The entry is SELF-SUFFICIENT — a consumer answers "what live
// sessions exist across the mesh" from this array alone, with no join back into
// `nodes[].presence`.
//   - `sessionId` is a NON-EMPTY STRING here, never `null` (unlike `PresenceSession`'s):
//     an index keyed on the tuple cannot hold an entry with no id, so an anonymous
//     session is absent from this array while staying COMPLETE in
//     `nodes[].presence.sessions[]`. `sessions[]` is the complete liveness truth; this
//     array is its ADDRESSABLE subset.
//   - `workItem` is EXPLICITLY PRESENT and `null` for a free session — never omitted,
//     never a fabricated ref. A session with no work item is a first-class answer, not
//     an absence. When an assignment matches on BOTH node and session it carries
//     exactly `{ ref, assignmentId }`: the item's own title and status stay reachable
//     from `items[]`, joined on the ref, rather than being copied a second time here.
export type MeshSession = {
  nodeId: string;
  sessionId: string;
  workspaceId: string;
  repo: string;
  assistant: string;
  lastPingAt: string;
  workspaceHasRun: boolean;
  workItem: { ref: string; assignmentId: string } | null;
  // milestone 50 / story 04 (ADR-008 decision 8) — the NINTH key, APPENDED, and the typed
  // mirror of `buildSessionIndex`'s own append (acd-session-index-derived-not-stored pins
  // the two in step). The WORKER states it: "something is bridging this session's PTY
  // output up this worker's stream". Always present and always a boolean — the producer
  // reads it with a strict `=== true`, so a node that states nothing arrives as `false`.
  //
  // A BOOLEAN, NEVER A NAMED PRODUCER, and that is the point rather than a simplification:
  // a `producer: "launcher" | "assignment"` would hand any renderer the means to MARK a
  // launched session, which SPEC forbids by name. With a boolean the payload CANNOT
  // distinguish the two populations. The terminals home reads it as the second half of the
  // feed axis's disjunction (`ui/src/home/feed-axis.mjs`); the wire states a TRANSPORT
  // fact and the browser keeps its own word.
  relaying: boolean;
};

// The GLOBAL scope's status payload (src/global-mesh-query.mjs shapeGlobalStatus).
// Also the shape a globally-started server answers for a `?scope=local` deep-link
// (the SAME fields, narrowed to one workspace, with `scope` relabelled "local").
// milestone 43 / story 04 — the payload also carries the cache-freshness WINDOW,
// once for the whole response, beside the rows that carry the facts a reader
// applies it to (`shapeGlobalStatus`, the same key and the same resolver as the
// board's `/api/work/list` envelope). Its WIRE NAME is deliberately not spelled
// in this file: `../board/freshness.mjs`'s `readStalenessWindow` is the ONE
// reader of it in `ui/`, which is what keeps the threshold from growing a second
// copy — or a default — on this side of the wire.
export type GlobalMeshStatus = {
  scope: "global" | "local";
  workspaceId?: string | null;
  workspaces: GlobalWorkspace[];
  items: GlobalWorkItem[];
  nodes: GlobalNode[];
  // milestone 48 / story 03 (ADR-007) — the session index, ONE additive key beside the
  // rows it derives from. Always present: a store with no live session serves
  // `sessions: []`, so a consumer can tell "nobody is working" from "this build does
  // not report sessions".
  sessions: MeshSession[];
  diagnostics: GlobalDiagnostics;
};

// The fleet view's ONE status type. It used to be a UNION — the m25 local shape OR
// the m34 global one — and Fleet.tsx narrowed between them on the presence of
// `workspaces`. Since m34/ADR-006 the face has answered the global shape for BOTH
// scopes (`shapeGlobalStatus` always emits `workspaces`), so the other arm of that
// union has never been on the wire; m47/ADR-006(b) deletes it and the branch it fed.
// The name survives because every reader — `scope.mjs`, `scope.d.mts`, `Fleet.tsx` —
// asks "the status this surface renders", which is a stable question.
export type FleetStatus = GlobalMeshStatus;

export type BoardUrlResponse = {
  url: string;
  workspaceId: string;
  ref: string | null;
};

// review fix P0.5: the coded error body may carry a `path` (mesh-ui-serve.mjs's
// sendApiError, threaded from globalStoreError — task 03 scenario 2's "the response
// body contains path <the global mesh path>"). Carried onto the thrown Error so a
// caller (Fleet.tsx) can render it even though the FAILED response never lands in
// `status` state (a first-load failure has no prior status to attach it to).
// milestone 38 / story 04 (DESIGN §Surface 2 Amendment 2026-07-24 (b), DG-13
// clause 4) — the assign verb attaches EXTRA coded fields beside `code`
// (`holder` on an already-active refusal, `target` on an ineligible node;
// src/commands/mesh-assign.mjs), and the route forwards them byte-for-byte
// (sendApiError's `extra`). They are carried onto the thrown Error here so the
// AFFORDANCE can shape its message from the CODED ENVELOPE rather than printing
// the raw server sentence — the sentence spends its width on the ref (which
// region 1 already shows) and truncates away the holder, the one fact no other
// region carries. The sentence itself is NOT discarded: it stays the Error's
// `message` and becomes the message slot's `title`.
export type FleetApiError = Error & {
  code?: string;
  status?: number;
  path?: string | null;
  holder?: string;
  target?: string;
};

async function safeError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as {
      error?: string;
      code?: string;
      path?: string | null;
      holder?: string;
      target?: string;
    };
    const message = body.error ?? `Request failed (${response.status})`;
    const error = new Error(message) as FleetApiError;
    error.code = body.code;
    error.status = response.status;
    error.path = body.path ?? null;
    if (typeof body.holder === "string") error.holder = body.holder;
    if (typeof body.target === "string") error.target = body.target;
    return error;
  } catch {
    return new Error(`Request failed (${response.status})`);
  }
}

export const fleetApi = {
  // The SOLE fleet-data read (ADR-002/ADR-003): a same-origin GET of the one route.
  // milestone 34 / story 03 (ADR-006) — an optional `scope` appends `?scope=<…>`
  // for the deep-link filter (task 01/02); omitted, the server answers whatever
  // scope it was STARTED with (the default global read, or --local's local read).
  async status(scope?: "global" | "local"): Promise<FleetStatus> {
    const response = await fetch(scope ? `/api/mesh/status?scope=${scope}` : "/api/mesh/status");
    if (!response.ok) throw await safeError(response);
    return (await response.json()) as FleetStatus;
  },

  async boardUrl(workspaceId: string, ref: string): Promise<string> {
    const params = new URLSearchParams({ workspaceId, ref });
    const response = await fetch(`/api/mesh/board-url?${params.toString()}`);
    if (!response.ok) throw await safeError(response);
    const body = (await response.json()) as BoardUrlResponse;
    return body.url;
  },

  // milestone 38 / story 04 (ARCHITECTURE ADR-012 + its 2026-07-24 AMENDMENT) —
  // the fleet face's ONE mutation route: a same-origin
  // `POST /api/mesh/assign { ref, nodeId, workspaceId }`, wrapping the existing
  // `assignWork` verb verbatim. A real browser's `fetch` sends the page's own
  // Origin automatically (the route's same-origin admission guard, SECURITY
  // T13) — this client sets no header itself. On a gate miss (unknown node /
  // already-active / unresolvable ref) the coded { ok:false, code } envelope
  // surfaces as a thrown Error (safeError), same shape as every other fleet read
  // failure.
  //
  // `workspaceId` is REQUIRED and is the ITEM's OWN workspace — `m.item
  // .workspaceId`, the SAME datum the drill-in beside it already passes to
  // `boardUrl`. It closes BLOCKER F21: this face is GLOBAL (it lists items from
  // every workspace on the machine) and the route used to resolve every ref
  // against the DAEMON's own workspace, so a card from any other workspace was
  // mis-assigned — and where the ref collided it dispatched entirely different
  // work off a `200 ok`. There is no fallback: a blank/absent workspaceId is a
  // coded 400 `invalid-workspace`, so a stale client fails VISIBLY.
  // `phase` (OPTIONAL, VERIFICATION 2026-07-25) is the lifecycle command the worker
  // runs — "refine" | "continue" | "verify". Absent ⇒ the route + dispatch default to
  // refine (byte-identical to before), so an older caller is unaffected. The route
  // validates it against the closed set, so a bad value can never become arbitrary text
  // typed into a worker PTY.
  async assign(ref: string, nodeId: string, workspaceId: string, phase?: string): Promise<WorkAssignment> {
    const body: { ref: string; nodeId: string; workspaceId: string; phase?: string } = { ref, nodeId, workspaceId };
    if (typeof phase === "string" && phase.length > 0) body.phase = phase;
    const response = await fetch("/api/mesh/assign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw await safeError(response);
    return (await response.json()) as WorkAssignment;
  },
};
