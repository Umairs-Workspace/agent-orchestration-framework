// THE SESSION LAUNCHER'S DECISION MODULE — milestone 50 / story 04, lane C (ADR-008 decision
// 10; DESIGN §The picker's shape, §The state machine, §The failure map, §DG-50-2/3/4/5/7).
//
// WHY A MODULE AND NOT A COMPONENT. This repo has no React test harness, and "a rule that can
// only be exercised through a component is a rule with no test" (./feed-axis.mjs:6-9) — while
// the failure map alone is fourteen testable rows and the machine is eight states resolved
// against two deadlines. So every DECISION lives here and `SessionLauncher.tsx` renders what it
// is told; the tasks' own scenarios read a RETURNED VALUE or the REQUEST BODY, never a pixel.
//
// PURE, TOTAL, AND FRAMEWORK-FREE. No fetch, no timer, no clock, no storage, no browser global
// (`acd-home-layout-is-a-filter` sweeps this whole directory for one). Time arrives as `now` and
// the route's answers arrive as data. A malformed payload yields an empty option list and a
// withheld request body — never a throw inside `SurfaceBoundary`.
//
// `ui/src/home/` IMPORTS NOTHING FROM `ui/src/fleet/` (49/ADR-001, gated), so that surface's
// `POLL_MS`, `ASSIGN_TIMEOUT_MS` and `assignableNodeOptions` are unreachable by construction;
// the home's own `HOME_POLL_MS` is the one cadence this file derives from, in the same
// named-duplication idiom `page-state.mjs` already keeps.
import { HOME_POLL_MS } from "./page-state.mjs";

// The two routes this affordance speaks, beside the home's own `HOME_STATUS_PATH` — the
// launcher's nouns, and nothing else on this surface calls them (ADR-008 decision 10).
export const HOME_SESSION_PATH = "/api/mesh/session";
export const HOME_SESSION_OUTCOME_PATH = "/api/mesh/session-outcome";

// ── TWO DEADLINES, TWO FACTS, TWO NUMBERS (ADR-008 decision 7) ────────────────────────────
// They are NOT one constant and may not be collapsed into one: they wait on different things
// and they answer differently when they expire.
//
// THE POST DEADLINE — the request itself hanging. Two poll intervals, inherited verbatim with
// its reasoning from m38: "one interval is too eager for a cross-machine POST; two is past the
// point any answer is still useful". It abandons THE WAIT, NEVER THE CALL — there is no abort
// and no retry anywhere in this module, because a possibly-successful server-side mint must not
// be made ambiguous.
export const LAUNCHER_POST_DEADLINE_MS = HOME_POLL_MS * 2;

// THE OUTCOME WINDOW — the 200 is in hand and the session is not yet visible. THREE intervals,
// and the third is the substance: the worker's presence ticker (~5s) plus the page poll (5s)
// plus one poll of margin. A launched session reaches the grid in ~10-12s worst case, so a
// two-interval window would render a SUCCESSFUL spawn as a failure.
export const LAUNCHER_OUTCOME_WINDOW_MS = HOME_POLL_MS * 3;

// The outcome lane's own cadence, in ONE home, derived from the same number. The route is a Map
// read with no store open (ADR-008 decision 5), so a sub-poll inside the window is cheap — and
// it is what makes a worker refusal known ~200ms after the dispatch reach the operator in about
// a second rather than five. It STOPS when the window closes: `sessionLauncherView` returns a
// poll descriptor only while `dispatched` holds.
export const LAUNCHER_OUTCOME_POLL_MS = HOME_POLL_MS / 5;

// `started` decays after exactly one poll interval — m38's hold, for m38's reason: the tile is
// the record from that moment on and the launcher stops speaking about the session.
export const LAUNCHER_STARTED_HOLD_MS = HOME_POLL_MS;

// ── THE CLOSED STATE SET (DESIGN §The state machine) ─────────────────────────────────────
// Eight members. DESIGN's heading says "Seven states" while its own table and diagram enumerate
// eight rows/nodes — each with distinct copy, distinct field behaviour and a distinct hold. The
// TABLE governs; the heading's count is routed to the designer as a miscount rather than
// resolved by dropping a row that has observable behaviour (task 02's QA ruling).
export const LAUNCHER_REST = "rest";
export const LAUNCHER_OPEN = "open";
export const LAUNCHER_DISPATCHING = "dispatching";
export const LAUNCHER_DISPATCHED = "dispatched";
export const LAUNCHER_STARTED = "started";
export const LAUNCHER_REFUSED = "refused";
export const LAUNCHER_FAILED = "failed";
export const LAUNCHER_NO_ANSWER = "no answer";

/** The CLOSED set, as a value, so a consumer can prove it is closed. */
export const LAUNCHER_STATE_LIST = Object.freeze([
  LAUNCHER_REST, LAUNCHER_OPEN, LAUNCHER_DISPATCHING, LAUNCHER_DISPATCHED,
  LAUNCHER_STARTED, LAUNCHER_REFUSED, LAUNCHER_FAILED, LAUNCHER_NO_ANSWER,
]);

// ── THE COPY (DESIGN §The copy this milestone adds) ──────────────────────────────────────
export const LAUNCHER_TRIGGER_WORDS = "New session";
export const LAUNCHER_TRIGGER_CARET = "▾";
/** K50-1. The caret is `aria-hidden` in the render; the accessible name is the whole label. */
export const LAUNCHER_TRIGGER_LABEL = `${LAUNCHER_TRIGGER_WORDS} ${LAUNCHER_TRIGGER_CARET}`;
/** K50-2 — "we do not know", which is a different fact from "there is nothing". */
export const LAUNCHER_NO_PAYLOAD_REASON = "The mesh has not answered yet — a session cannot be started until it does.";
/** K50-3. */
export const LAUNCHER_NO_NODES_REASON = "No nodes have published to this mesh yet.";
/** K50-7. */
export const LAUNCHER_NO_ITEMS_REASON = "This repo has no work items in the mesh projection.";
/** K50-9 — the anti-coercion rule, made visible. DG-50-7 rule 2 scopes it to F1 and F2. */
export const LAUNCHER_DEPARTED_NOTE = "no longer in the mesh — pick another";
// F3's OWN, because K50-9 would be FALSE here: F3's list is narrowed to one repo, so a ref that is
// not in it may still be in the mesh under another (measured: 50/04 in ws-aof, then a repo change).
export const LAUNCHER_ITEM_DEPARTED_NOTE = "not in this repo — pick another, or none";
/** K50-10 — the ONE sentence that stops the panel implying anything but a shell (ADR-007). */
export const LAUNCHER_CAPTION = "Opens your default shell on that machine.";
/** K50-13. */
export const LAUNCHER_PANEL_TITLE = "Start a session";
/** K50-14 — the default's EFFECT, not its absence. Always F3's first row, in every state. */
export const LAUNCHER_ITEM_ROOT_LABEL = "none — open the repo root";

// TWO REASONS DESIGN DOES NOT COVER, WRITTEN HERE RATHER THAN LEFT AS A GREYED CONTROL WITH NO
// EXPLANATION (§The picker's shape: "an unavailable control must have its reason on screen").
// Both are routed to the designer as copy gaps; neither invents a new state or a new control.
export const LAUNCHER_NO_REPOS_REASON = "No repos have been published to this mesh yet.";
export const LAUNCHER_ITEM_NEEDS_REPO_REASON = "Choose a repo first — work items are listed per repo.";

export const LAUNCHER_FIELD_NODE = "node";
export const LAUNCHER_FIELD_REPO = "repo";
export const LAUNCHER_FIELD_ITEM = "item";
/** Three fields, and no fourth (DG-50-4, PO-ruled 2026-08-14). */
export const LAUNCHER_FIELD_LIST = Object.freeze([LAUNCHER_FIELD_NODE, LAUNCHER_FIELD_REPO, LAUNCHER_FIELD_ITEM]);
export const LAUNCHER_FIELD_LABELS = Object.freeze({ node: "Node", repo: "Repo", item: "Item (optional)" });

export const LAUNCHER_ACTION_REST = "Start session →";
export const LAUNCHER_ACTION_BUSY = "Starting…";

// The trigger's compact forms — a WORD, never a count (SPEC scopes one session at a time), and
// rendered only while the panel is closed over an unresolved outcome. `started` NEVER appears
// here: it decays into the grid. `refused` has no form in DESIGN §S1's three; one is given here
// because closing the panel over a stated refusal must not swallow it, and it is routed.
export const LAUNCHER_COMPACT_STARTING = "starting…";
export const LAUNCHER_COMPACT_FAILED = "failed";
export const LAUNCHER_COMPACT_REFUSED = "refused";
export const LAUNCHER_COMPACT_NO_ANSWER = LAUNCHER_NO_ANSWER;

/** Every label the trigger ever reads — the width is reserved to the longest (DG-50-6 rule 4). */
const COMPACT_WORDS = [LAUNCHER_COMPACT_STARTING, LAUNCHER_COMPACT_FAILED, LAUNCHER_COMPACT_REFUSED, LAUNCHER_COMPACT_NO_ANSWER];
export const LAUNCHER_TRIGGER_LABELS = Object.freeze([LAUNCHER_TRIGGER_LABEL, ...COMPACT_WORDS.map((word) => `${LAUNCHER_TRIGGER_WORDS} · ${word}`)]);
export const LAUNCHER_TRIGGER_WIDTH_CH = Math.max(...LAUNCHER_TRIGGER_LABELS.map((label) => label.length));

/** K50-4 — what was done AND what is being waited on, the two halves DG-50-2 requires. */
export const launcherDispatchedLine = (nodeId) => `starting on ${nodeId} · waiting for it to appear`;
/** K50-5 — reports the DISPATCH's completion, not the session's state (rail 1). */
export const launcherStartedLine = (nodeId) => `started on ${nodeId}`;
/** K50-6. */
export const LAUNCHER_NO_ANSWER_LINE = "no answer — the session has not appeared";
/** K50-8 — membership stated as a fact, never as a prohibition. */
export const LAUNCHER_REPO_GROUP_ON = "on this node";
export const launcherRepoGroupOff = (nodeId) => `not on ${nodeId}`;

// K50-12, verbatim — the long form for the two expiries where it is TRUE.
export const LAUNCHER_NO_ANSWER_DETAIL =
  "The dispatch was accepted and a session id was minted, but no session has appeared and the node has reported nothing. "
  + "The request may still have succeeded: if the session registers, it will appear in the grid on its own.";

// …and the three cases where K50-12's middle clause would be FALSE. ADR-008 decision 7 surfaced
// the first ("the node has reported nothing" is false once the lane carries `ok:true`) and left
// the copy to the designer; the module's job is to keep the CAUSES distinguishable in its
// returned value, which `cause` does. These strings are build-authored and routed.
export const LAUNCHER_NO_ANSWER_DETAIL_ACKED =
  "The dispatch was accepted and the node reported that it opened a terminal, but no session has appeared in the grid. "
  + "The request may still have succeeded: if the session registers, it will appear in the grid on its own.";
export const LAUNCHER_NO_ANSWER_DETAIL_LANE =
  "The dispatch was accepted and a session id was minted, but this machine cannot hear answers from its workers, so no "
  + "outcome could arrive. The request may still have succeeded: if the session registers, it will appear in the grid on its own.";
export const LAUNCHER_NO_ANSWER_DETAIL_NO_ID =
  "The dispatch was accepted but this machine answered without a session id, so there is nothing to wait on. "
  + "The request may still have succeeded: if the session registers, it will appear in the grid on its own.";
export const LAUNCHER_NO_ANSWER_DETAIL_REJECTED =
  "The connection to this machine failed before it answered, so it is not known whether the dispatch was received. "
  + "The request may still have succeeded: if the session registers, it will appear in the grid on its own.";

// ── THE FAILURE MAP (DESIGN §The failure map — fourteen rows, no code invented) ───────────
//
// THREE RULES BIND EVERY ROW (DG-50-3): the message names the MACHINE the fault is about
// (`this machine` control-side, `<nodeId>` worker-side); the raw code is NEVER the message and
// rides the `title`; and a code this map does not know keeps the SERVER's own sentence rather
// than being re-worded on a guess.
export const LAUNCHER_CONTROL_MACHINE = "this machine";
export const LAUNCHER_PHASE_POST = "post";
export const LAUNCHER_PHASE_LANE = "lane";

const AT_CONTROL = LAUNCHER_CONTROL_MACHINE;
const AT_NODE = "node";

const REFUSAL_MAP = Object.freeze({
  // Control-side — the POST answered, and its coded body carries a server sentence.
  "invalid-body": { at: AT_CONTROL, reads: () => "incomplete request — this build and the route disagree", next: null },
  "workspace-not-found": { at: AT_CONTROL, reads: (c) => `${c.repo} is not in the mesh any more`, next: "· reopen the picker to refresh" },
  "workspace-not-local": { at: AT_CONTROL, reads: (c) => `${c.repo} is not checked out on this machine`, next: "· pick a repo this machine holds" },
  "control-identity-unknown": { at: AT_CONTROL, reads: () => "this machine has no mesh identity yet", next: null },
  // The ONE code minted on BOTH phases — pre-200 by the route's presence check, post-200 by
  // ADR-008 decision 3's synthesis. Same words either way; only the STATE differs by phase.
  "session-target-not-connected": { at: AT_NODE, reads: (c) => `${c.node} is not connected to this machine`, next: "· it must be online to open a session" },
  "session-dispatch-unavailable": { at: AT_CONTROL, reads: () => "this machine cannot reach its workers — no relay is configured", next: null },
  "session-dispatch-failed": { at: AT_CONTROL, reads: () => "the request never left this machine", next: "· the relay is not answering" },
  "session-route-failed": { at: AT_CONTROL, reads: () => "this machine could not answer", next: "· the daemon log has the fault" },
  "cross-origin-refused": { at: AT_CONTROL, reads: () => "this page was refused by its own daemon", next: null },
  "invalid-content-type": { at: AT_CONTROL, reads: () => "this page was refused by its own daemon", next: null },
  // Worker-side — the 200 was already sent; these arrive on ADR-008's lane, which carries a
  // CODE and no message (`buildSessionSpawnAckFrame` has no message field), so these sentences
  // are the module's own and the `title` says so by carrying them rather than a server's.
  "session-repo-unavailable": { at: AT_NODE, reads: (c) => `${c.node} does not have ${c.repo}`, next: "· pick a node that carries it" },
  "session-worktree-failed": { at: AT_NODE, reads: (c) => `${c.node} could not make a worktree for ${c.item}`, next: "· start without an item to open the repo root" },
  "session-spawn-failed": { at: AT_NODE, reads: (c) => `${c.node} could not open a terminal`, next: "· the node's own log has the fault" },
  "session-already-active": { at: AT_NODE, reads: (c) => `that session is already open on ${c.node}`, next: "· it is in the grid" },
});

/** The lane itself — ADR-008 decision 6's code, which DESIGN's map has no row for. */
export const LAUNCHER_LANE_UNAVAILABLE_CODE = "spawn-outcome-lane-unavailable";
export const LAUNCHER_LANE_UNAVAILABLE_LINE = "this machine cannot hear answers from its workers · the grid is the only signal left";

/** A refusal with no code and no server sentence still says something (DG-50-3 rule 4). */
export const LAUNCHER_REFUSAL_FALLBACK = "this machine refused the dispatch and stated no reason";

// ── SMALL TOTAL HELPERS ──────────────────────────────────────────────────────────────────
/**
 * A string the payload actually STATED, carried VERBATIM. Blank and non-string are `null`, and a
 * stated value is never trimmed into a different string — the picker posts what the payload
 * carried, or it posts nothing.
 */
const stated = (value) => (typeof value === "string" && value.trim() !== "" ? value : null);
/** Plain codepoint ascending — the comparison `grid.mjs` and `runs.mjs` already use. */
const codepoint = (left, right) => (left === right ? 0 : left < right ? -1 : 1);

const rowsOf = (value) => (Array.isArray(value) ? value : []);
const isObject = (value) => value != null && typeof value === "object";
const finite = (value, fallback) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

// ── F1 · THE NODE FIELD ──────────────────────────────────────────────────────────────────
/** The three words the product already has. No fourth, and `live` earns no mark. */
export const LAUNCHER_LIVENESS_WORDS = Object.freeze(["live", "stale", "unknown"]);

/**
 * The annotation, closed to the two DEVIATIONS. `live` is unmarked (only a deviation is marked,
 * StaleBadge's own rule); anything the payload does not state as one of the three words is
 * `unknown`, which is what it literally is — never a fourth word invented from the wire.
 */
export function launcherFreshnessAnnotation(freshness) {
  if (freshness === "live") return null;
  if (freshness === "stale") return "stale";
  return "unknown";
}

/**
 * EVERY node the payload carries, in codepoint-ascending order by nodeId, annotated and NEVER
 * filtered — not by freshness, not by role, not by workspace membership, not by capability.
 * The picker ANNOTATES; the route REFUSES (`ui/src/fleet/scope.mjs:590-604`'s standing rule at
 * a new address, applied rather than imported). The control node stays an option deliberately:
 * a spawn aimed at it answers `session-target-not-connected`, and a stated refusal is a better
 * answer than a picker that silently drops a machine the operator can see in the fleet.
 */
export function launcherNodeOptions(status) {
  const seen = new Set();
  const options = [];
  for (const row of rowsOf(status?.nodes)) {
    if (!isObject(row)) continue;
    const nodeId = stated(row.nodeId);
    if (nodeId == null || seen.has(nodeId)) continue;
    seen.add(nodeId);
    // `freshness` is VERBATIM from the payload — the option reports what the wire said, and
    // the ANNOTATION is the closed vocabulary this surface renders.
    const freshness = typeof row.freshness === "string" ? row.freshness : null;
    options.push(Object.freeze({ value: nodeId, label: nodeId, freshness, annotation: launcherFreshnessAnnotation(row.freshness) }));
  }
  options.sort((left, right) => codepoint(left.value, right.value));
  return Object.freeze(options);
}

const membershipOf = (status, nodeId) => {
  if (nodeId == null) return null;
  for (const row of rowsOf(status?.nodes)) {
    if (!isObject(row) || stated(row.nodeId) !== nodeId) continue;
    return new Set(rowsOf(row.workspaceIds).filter((value) => stated(value) != null));
  }
  return new Set();
};

// ── F2 · THE REPO FIELD ──────────────────────────────────────────────────────────────────

/**
 * EVERY workspace on the payload, in two groups: the chosen node's `workspaceIds` first, then
 * the rest under K50-8. Membership GROUPS the list; it never shortens it — the two membership
 * stores can disagree (the control's `global_node_workspaces` projection vs the worker's own
 * re-check at spawn time), so the grouping is the PRE-EMPTIVE half and the route's
 * `session-repo-unavailable` is the AUTHORITATIVE one.
 *
 * With no node chosen there is no membership fact to state, so every option is ungrouped.
 */
export function launcherRepoOptions(status, selection) {
  const nodeId = stated(selection?.nodeId);
  const membership = membershipOf(status, nodeId);
  const seen = new Set();
  const options = [];
  for (const row of rowsOf(status?.workspaces)) {
    if (!isObject(row)) continue;
    const workspaceId = stated(row.workspaceId);
    if (workspaceId == null || seen.has(workspaceId)) continue;
    seen.add(workspaceId);
    const name = stated(row.name);
    const onNode = membership == null ? null : membership.has(workspaceId);
    const group = membership == null ? null : onNode ? LAUNCHER_REPO_GROUP_ON : launcherRepoGroupOff(nodeId);
    // A workspace whose `name` is null is still an option, identified by its id — never
    // omitted, and never the word "null".
    options.push(Object.freeze({ value: workspaceId, label: name ?? workspaceId, name, onNode, group }));
  }
  // Group first (membership), then codepoint by id — NEVER by liveness, recency or session
  // count. A list that re-sorts every 5s under a cursor is the tile-moves-under-the-hand
  // defect, in a menu.
  options.sort((left, right) => {
    const rank = (option) => (option.onNode === true ? 0 : 1);
    return rank(left) - rank(right) || codepoint(left.value, right.value);
  });
  return Object.freeze(options);
}

// ── F3 · THE ITEM FIELD — A PICK, NEVER A TEXT BOX ───────────────────────────────────────

const ITEM_ROOT_OPTION = Object.freeze({ value: null, label: LAUNCHER_ITEM_ROOT_LABEL, ref: null, title: null, root: true });

/**
 * The repo-root row FIRST and ALWAYS, then the chosen workspace's items — each identified by
 * its `ref`, with its `title` beside it and a null title rendering nothing.
 *
 * A ref is offered only when the payload carried it AS A STRING. The route forwards `itemRef`
 * unvalidated, and it measured a NUMBER being dropped to `null` behind a `200` — an operator
 * asking for item 50 got a bare checkout-root shell and was told it worked. The picker's half of
 * that fix is that a chosen ref is always the string the payload itself carried.
 */
export function launcherItemOptions(status, selection) {
  const workspaceId = stated(selection?.workspaceId);
  if (workspaceId == null) return Object.freeze([ITEM_ROOT_OPTION]);
  const seen = new Set();
  const options = [];
  for (const row of rowsOf(status?.items)) {
    if (!isObject(row) || stated(row.workspaceId) !== workspaceId) continue;
    const ref = stated(row.ref);
    if (ref == null || seen.has(ref)) continue;
    seen.add(ref);
    const title = stated(row.title);
    options.push(Object.freeze({ value: ref, label: title == null ? ref : `${ref} · ${title}`, ref, title, root: false }));
  }
  options.sort((left, right) => codepoint(left.value, right.value));
  return Object.freeze([ITEM_ROOT_OPTION, ...options]);
}

// ── DERIVED, NEVER REMEMBERED (DG-50-7) ──────────────────────────────────────────────────

const resolveOne = (preference, options) => {
  const value = stated(preference);
  if (value == null) return Object.freeze({ value: null, departed: false });
  return Object.freeze({ value, departed: !options.some((option) => option.value === value) });
};

/**
 * The operator's PREFERENCE resolved against the CURRENT payload, in ONE place — which is what
 * makes "the value it names is the value it posts" structural. The measured defect this refuses
 * (`ui/src/fleet/Fleet.tsx:1235-1249`) is a select whose DOM value coerced to the first surviving
 * option while React state kept the departed id, so the operator read one name and the POST
 * carried another. Nothing here coerces: a value that left the payload is KEPT, marked
 * `departed`, and the operator re-aims.
 */
export function launcherResolveSelection(status, selection) {
  const nodes = launcherNodeOptions(status);
  const node = resolveOne(selection?.nodeId, nodes);
  const repos = launcherRepoOptions(status, { nodeId: node.value });
  const workspace = resolveOne(selection?.workspaceId, repos);
  const items = launcherItemOptions(status, { workspaceId: workspace.value });
  const item = resolveOne(selection?.itemRef, items);
  return Object.freeze({ node, workspace, item, nodes, repos, items });
}

/**
 * The request body for `POST /api/mesh/session`, or `null` when it would be incomplete — never
 * a partial object with a missing required field. It carries EXACTLY what the panel holds:
 * no `assistant` key at all, so the wire's own `"claude"` default applies untouched (DG-50-4,
 * PO-ruled), and every value is a string the payload itself carried.
 */
export function launcherRequestBody(status, selection) {
  const resolved = launcherResolveSelection(status, selection);
  if (resolved.node.value == null || resolved.workspace.value == null) return null;
  const body = { nodeId: resolved.node.value, workspaceId: resolved.workspace.value };
  if (resolved.item.value != null) body.itemRef = resolved.item.value;
  return Object.freeze(body);
}

/**
 * What the panel selects for the operator WHEN IT OPENS, and nothing else. One node ⇒ it is
 * chosen; more than one ⇒ NONE, because a pre-picked target on a fleet-wide control is how work
 * lands on the wrong machine, and pre-selecting the only LIVE node would be an eligibility
 * filter wearing a default's clothes. It is applied at OPEN so a later poll can never clear a
 * field (DG-50-7 rule 4).
 */
export function launcherOpenDefaults(status) {
  const nodes = launcherNodeOptions(status);
  return Object.freeze({ nodeId: nodes.length === 1 ? nodes[0].value : null });
}

// ── THE MACHINE ──────────────────────────────────────────────────────────────────────────
//
// Plain frozen data, advanced by ONE reducer over a closed event set. Every event carries its
// own `at` (the consumer's clock), so the suite drives the machine on a clock it owns.

const EMPTY_SELECTION = Object.freeze({ nodeId: null, workspaceId: null, itemRef: null });

/** The initial machine: closed, nothing chosen, nothing in flight. */
export function launcherRest() {
  return Object.freeze({ open: false, selection: EMPTY_SELECTION, attempt: null });
}

function normaliseMachine(machine) {
  if (!isObject(machine)) return launcherRest();
  const selection = isObject(machine.selection) ? machine.selection : EMPTY_SELECTION;
  return Object.freeze({
    open: machine.open === true,
    selection: Object.freeze({
      nodeId: stated(selection.nodeId),
      workspaceId: stated(selection.workspaceId),
      itemRef: stated(selection.itemRef),
    }),
    attempt: isObject(machine.attempt) ? machine.attempt : null,
  });
}

const FIELD_KEYS = Object.freeze({ node: "nodeId", repo: "workspaceId", item: "itemRef" });

// A 200 answers with a session id or it answers with nothing usable; a non-2xx answers with a
// coded body (`{ ok:false, error, code }`); a transport failure answers NOTHING AT ALL.
// Everything else — an HTML error page, a body that will not parse, a null body — lands in the
// same four shapes rather than a fifth.
function normaliseAnswer(response, at) {
  if (!isObject(response)) return Object.freeze({ at, kind: "refused", code: null, sentence: null, status: null });
  // A REJECTED FETCH IS SILENCE, NOT A REFUSAL — the request may have reached the daemon and
  // minted a session, so `refused` in destructive red would assert a fault nobody observed. Its
  // message is a raw browser exception, which DG-50-3 rule 2 forbids as a cause, so it is carried
  // NOWHERE: no code, no sentence, no id. Reachable on every mesh-ui restart and every sleep.
  if (response.error != null) return Object.freeze({ at, kind: "unreachable", status: null });
  const body = isObject(response.body) ? response.body : null;
  const status = finite(response.status, null);
  if (response.ok === true && body?.ok !== false) {
    const sessionId = stated(body?.sessionId);
    // A 200 with no usable session id cannot be waited on: the whole machine is keyed on the
    // minted id, and holding `dispatched` against a tuple that can never resolve would be a
    // spinner with a reason to spin forever.
    return sessionId == null ? Object.freeze({ at, kind: "unusable", status }) : Object.freeze({ at, kind: "accepted", sessionId, status });
  }
  return Object.freeze({ at, kind: "refused", code: stated(body?.code), sentence: stated(body?.error), status });
}

const OUTCOME_ANSWERS = Object.freeze(["pending", "started", "failed", "unknown"]);
// …and how much each SETTLES: `unknown` is lane connectivity, not an answer about the session.
const OUTCOME_RANK = Object.freeze({ unknown: 0, started: 1, failed: 2 });

function normaliseOutcome(outcome, at) {
  if (!isObject(outcome)) return null;
  const state = typeof outcome.state === "string" && OUTCOME_ANSWERS.includes(outcome.state) ? outcome.state : null;
  // A state no build declared is NOT read as `started` — a newer daemon's word must never
  // silently resolve a wait. It is simply no information, and the window keeps running.
  if (state == null) return null;
  return Object.freeze({ at, state, code: stated(outcome.code) });
}

const sessionIsPresent = (sessions, attempt) =>
  rowsOf(sessions).some((row) => {
    if (!isObject(row) || stated(row.sessionId) !== attempt.sessionId) return false;
    const nodeId = stated(row.nodeId);
    // Keyed on the TUPLE where the row states one — the registry's own discipline, and what
    // stops another node's row resolving a spawn this browser is waiting on.
    return nodeId == null || nodeId === attempt.request.nodeId;
  });

/**
 * The ONE reducer. Unknown events, and events that cannot apply, return the machine unchanged —
 * a launcher that threw inside `SurfaceBoundary` would take the whole surface down.
 */
export function launcherReduce(machine, event) {
  const current = normaliseMachine(machine);
  const type = typeof event?.type === "string" ? event.type : null;
  const at = finite(event?.at, 0);
  const attempt = current.attempt;

  if (type === "open") {
    const defaults = isObject(event.defaults) ? event.defaults : {};
    return Object.freeze({
      ...current,
      open: true,
      selection: Object.freeze({
        nodeId: current.selection.nodeId ?? stated(defaults.nodeId),
        workspaceId: current.selection.workspaceId ?? stated(defaults.workspaceId),
        itemRef: current.selection.itemRef ?? stated(defaults.itemRef),
      }),
    });
  }
  // A dismissal abandons the FORM, never the DISPATCH — the attempt is untouched and resolves
  // on its own deadlines, with its residue on the trigger.
  if (type === "close") return Object.freeze({ ...current, open: false });
  if (type === "choose") {
    const key = FIELD_KEYS[event.field];
    if (key == null) return current;
    return Object.freeze({ ...current, selection: Object.freeze({ ...current.selection, [key]: stated(event.value) }) });
  }
  if (type === "submit") {
    const request = event.request;
    // Derived, never remembered: the caller hands the body the view RENDERED, resolved against
    // the current payload. An incomplete pair is not a dispatch.
    if (!isObject(request) || stated(request.nodeId) == null || stated(request.workspaceId) == null) return current;
    return Object.freeze({
      ...current,
      // A retry starts a WHOLE new attempt — never a resumed one, so the stranded id can never
      // be waited on again and the new answer's id is the only one the machine holds.
      attempt: Object.freeze({ at, request: Object.freeze({ ...request }), answer: null, outcome: null, seenAt: null }),
    });
  }
  if (attempt == null) return current;
  if (type === "answer") {
    if (attempt.answer != null) return current;
    return Object.freeze({ ...current, attempt: Object.freeze({ ...attempt, answer: normaliseAnswer(event.response, at) }) });
  }
  if (type === "outcome") {
    const sessionId = attempt.answer?.kind === "accepted" ? attempt.answer.sessionId : null;
    if (sessionId == null) return current;
    // The lane answers about a TUPLE. An answer about another one is not this dispatch's.
    if (stated(event.outcome?.sessionId) != null && stated(event.outcome.sessionId) !== sessionId) return current;
    const outcome = normaliseOutcome(event.outcome, at);
    if (outcome == null || outcome.state === "pending") return current;
    // A WEAKER LATER ANSWER MAY NOT OVERWRITE A STATED ONE. mesh-ui restarting inside the window
    // empties its registry, so the next poll reads `unknown`/lane-unavailable — and a stated
    // `n1 does not have aof` reverting to "this machine cannot hear its workers" is the screen
    // un-answering itself. The route ranks it the same way; a stated `failed` is TERMINAL.
    const held = attempt.outcome == null ? -1 : OUTCOME_RANK[attempt.outcome.state] ?? -1;
    if (OUTCOME_RANK[outcome.state] <= held) return current;
    return Object.freeze({ ...current, attempt: Object.freeze({ ...attempt, outcome }) });
  }
  if (type === "observe") {
    if (attempt.seenAt != null || attempt.answer?.kind !== "accepted") return current;
    if (!sessionIsPresent(event.sessions, { sessionId: attempt.answer.sessionId, request: attempt.request })) return current;
    return Object.freeze({ ...current, attempt: Object.freeze({ ...attempt, seenAt: at }) });
  }
  // The `started` decay: the tile is the record from that moment on, so the launcher lets go of
  // the attempt entirely and the panel closes (DESIGN open question 5).
  if (type === "settle") return Object.freeze({ ...current, open: false, attempt: null });
  return current;
}

// ── THE CODED LINE ───────────────────────────────────────────────────────────────────────

const titleOf = (parts) => {
  const joined = parts.filter((part) => stated(part) != null).join(" · ");
  return joined === "" ? null : joined;
};

/**
 * ONE coded refusal, rendered. `phase` decides the STATE and the machine for an unmapped code;
 * the map decides the words. `sentence` is the SERVER's own, which only the POST's coded body
 * carries — `buildSessionSpawnAckFrame` has no message field, so the lane's rows carry the
 * module's own sentence in the title and no title ever fabricates a server sentence.
 */
export function launcherRefusal({ phase, code, sentence, node, repo, item, sessionId } = {}) {
  const onLane = phase === LAUNCHER_PHASE_LANE;
  const context = {
    node: stated(node) ?? LAUNCHER_CONTROL_MACHINE,
    repo: stated(repo) ?? "that repo",
    item: stated(item) ?? "that item",
  };
  const known = REFUSAL_MAP[stated(code)];
  const server = stated(sentence);
  let line;
  let machine;
  if (known == null) {
    // DG-50-3 rule 4 — an unmapped code keeps the server's sentence rather than being re-worded
    // on a guess. It is REACHABLE, not hypothetical: the route's catch-all is spelled
    // `error.code ?? "session-route-failed"`, so a thrown fs error surfaces its own `ENOENT`.
    line = server ?? LAUNCHER_REFUSAL_FALLBACK;
    machine = onLane ? context.node : LAUNCHER_CONTROL_MACHINE;
  } else {
    const reads = known.reads(context);
    line = known.next == null ? reads : `${reads} ${known.next}`;
    machine = known.at === AT_NODE ? context.node : LAUNCHER_CONTROL_MACHINE;
  }
  return Object.freeze({
    state: onLane ? LAUNCHER_FAILED : LAUNCHER_REFUSED,
    line,
    // The stranded session id appears ONLY here, never as a live thing on screen.
    title: titleOf([onLane ? line : server ?? line, stated(code), sessionId == null ? null : `session ${sessionId}`]),
    code: stated(code),
    machine,
    tone: "destructive",
  });
}

// ── THE OUTCOME REGION'S DERIVATION ──────────────────────────────────────────────────────

const NOTHING = Object.freeze({ line: null, title: null, tone: null, code: null, machine: null, cause: null });

const repoLabelFor = (status, workspaceId) => {
  for (const row of rowsOf(status?.workspaces)) {
    if (isObject(row) && stated(row.workspaceId) === workspaceId) return stated(row.name) ?? workspaceId;
  }
  return workspaceId;
};

function laneIsDeaf(attempt) {
  return attempt.outcome?.state === "unknown" && attempt.outcome.code === LAUNCHER_LANE_UNAVAILABLE_CODE;
}

const NO_ANSWER_DETAILS = Object.freeze({
  "outcome-expiry-acked": LAUNCHER_NO_ANSWER_DETAIL_ACKED,
  "lane-unavailable": LAUNCHER_NO_ANSWER_DETAIL_LANE,
  "no-session-id": LAUNCHER_NO_ANSWER_DETAIL_NO_ID,
  "post-rejected": LAUNCHER_NO_ANSWER_DETAIL_REJECTED,
});

function noAnswer(cause, sessionId) {
  const detail = NO_ANSWER_DETAILS[cause] ?? LAUNCHER_NO_ANSWER_DETAIL;
  return Object.freeze({
    state: LAUNCHER_NO_ANSWER,
    line: LAUNCHER_NO_ANSWER_LINE,
    title: titleOf([detail, sessionId == null ? null : `session ${sessionId}`]),
    // NOT `destructive`. Nothing failed and nothing was confirmed; painting silence red asserts
    // a fault that has not been observed. The WORDS state the outcome.
    tone: "muted",
    code: null,
    machine: LAUNCHER_CONTROL_MACHINE,
    cause,
  });
}

/**
 * The state, the line and the title — resolved from the attempt's stored facts and `now`.
 *
 * THE ORDER IS THE CONTRACT. A stated refusal outranks everything (it is an ANSWER); the GRID
 * resolves a dispatch and clears a `no answer` (it is the success authority, ADR-008 decision 7);
 * the two deadlines answer last, for the fact each waits on.
 */
function resolveOutcome(machine, status, now) {
  const attempt = machine.attempt;
  if (attempt == null) return Object.freeze({ state: machine.open ? LAUNCHER_OPEN : LAUNCHER_REST, settled: false, ...NOTHING });
  const nodeId = attempt.request.nodeId;
  const context = {
    node: nodeId,
    repo: repoLabelFor(status, attempt.request.workspaceId),
    item: attempt.request.itemRef ?? null,
    sessionId: attempt.answer?.kind === "accepted" ? attempt.answer.sessionId : null,
  };

  // 1 — A STATED REASON, from either phase. The lane is the failure authority.
  if (attempt.answer?.kind === "refused") {
    return Object.freeze({ ...launcherRefusal({ phase: LAUNCHER_PHASE_POST, code: attempt.answer.code, sentence: attempt.answer.sentence, ...context }), settled: false });
  }
  if (attempt.outcome?.state === "failed") {
    return Object.freeze({ ...launcherRefusal({ phase: LAUNCHER_PHASE_LANE, code: attempt.outcome.code, ...context }), settled: false });
  }

  // 2 — THE GRID. A session that appeared is the only success signal there is, and it clears a
  // `no answer` line whenever it arrives: the launcher never contradicts a tile on screen.
  if (attempt.seenAt != null) {
    if (now < attempt.seenAt + LAUNCHER_STARTED_HOLD_MS) {
      return Object.freeze({
        state: LAUNCHER_STARTED,
        line: launcherStartedLine(nodeId),
        title: titleOf([context.sessionId == null ? null : `session ${context.sessionId}`]),
        tone: "muted",
        code: null,
        machine: nodeId,
        cause: null,
        settled: false,
      });
    }
    // The hold expired: back to rest with nothing left over.
    return Object.freeze({ state: LAUNCHER_REST, settled: true, ...NOTHING });
  }

  // 3 — TWO ANSWERS THE MACHINE CANNOT WAIT ON: a 200 with no id, and a POST that reached no
  // answer at all. Both are SILENCE — muted, unknown-not-negative — and neither is a fault.
  if (attempt.answer?.kind === "unusable") return Object.freeze({ ...noAnswer("no-session-id", null), settled: false });
  if (attempt.answer?.kind === "unreachable") return Object.freeze({ ...noAnswer("post-rejected", null), settled: false });

  // 4 — THE POST DEADLINE. It abandons the WAIT, never the CALL: a late answer does not
  // resurrect `dispatched`, and no second request is ever sent.
  if (attempt.answer == null) {
    return now < attempt.at + LAUNCHER_POST_DEADLINE_MS
      ? Object.freeze({ state: LAUNCHER_DISPATCHING, settled: false, ...NOTHING })
      : Object.freeze({ ...noAnswer("post-deadline", null), settled: false });
  }
  if (attempt.answer.at - attempt.at >= LAUNCHER_POST_DEADLINE_MS) {
    return Object.freeze({ ...noAnswer("post-deadline", context.sessionId), settled: false });
  }

  // 5 — THE OUTCOME WINDOW. `ok:true` on the lane CORROBORATES the dispatch and does not end
  // the wait (ADR-008 decision 7): a launcher saying "started" while no tile exists is the
  // launcher claiming a session the grid does not show.
  if (now < attempt.answer.at + LAUNCHER_OUTCOME_WINDOW_MS) {
    const deaf = laneIsDeaf(attempt);
    return Object.freeze({
      state: LAUNCHER_DISPATCHED,
      line: deaf ? LAUNCHER_LANE_UNAVAILABLE_LINE : launcherDispatchedLine(nodeId),
      title: titleOf([deaf ? LAUNCHER_LANE_UNAVAILABLE_CODE : null, `session ${context.sessionId}`]),
      tone: "muted",
      code: deaf ? LAUNCHER_LANE_UNAVAILABLE_CODE : null,
      machine: deaf ? LAUNCHER_CONTROL_MACHINE : nodeId,
      cause: null,
      settled: false,
    });
  }
  const cause = laneIsDeaf(attempt) ? "lane-unavailable" : attempt.outcome?.state === "started" ? "outcome-expiry-acked" : "outcome-expiry";
  return Object.freeze({ ...noAnswer(cause, context.sessionId), settled: false });
}

const COMPACT_FORMS = Object.freeze({
  [LAUNCHER_DISPATCHING]: LAUNCHER_COMPACT_STARTING,
  [LAUNCHER_DISPATCHED]: LAUNCHER_COMPACT_STARTING,
  [LAUNCHER_FAILED]: LAUNCHER_COMPACT_FAILED,
  [LAUNCHER_REFUSED]: LAUNCHER_COMPACT_REFUSED,
  [LAUNCHER_NO_ANSWER]: LAUNCHER_COMPACT_NO_ANSWER,
});

// ── THE ONE VIEW ─────────────────────────────────────────────────────────────────────────

function fieldFor(id, options, resolved, { frozen, disabled, reason }) {
  return Object.freeze({
    id,
    label: LAUNCHER_FIELD_LABELS[id],
    required: id !== LAUNCHER_FIELD_ITEM,
    options,
    value: resolved.value,
    departed: resolved.departed,
    // A chosen value that left the payload SAYS SO, in place, and is never silently swapped —
    // in the sentence that is TRUE for the list it left (F3's is repo-scoped, F1's and F2's are not).
    note: !resolved.departed ? null : id === LAUNCHER_FIELD_ITEM ? LAUNCHER_ITEM_DEPARTED_NOTE : LAUNCHER_DEPARTED_NOTE,
    disabled: frozen || disabled === true,
    frozen,
    reason: reason ?? null,
  });
}

/**
 * EVERYTHING the launcher renders, derived from the payload, the machine and `now`.
 *
 * The panel's `request` is the SAME object the trigger's fields were rendered from, so the value
 * the panel names and the value it posts cannot disagree — the consumer posts `panel.request`
 * and has nothing else to post.
 */
export function sessionLauncherView(context) {
  const status = isObject(context?.status) ? context.status : null;
  const machine = normaliseMachine(context?.machine);
  const now = finite(context?.now, 0);
  const outcome = resolveOutcome(machine, status, now);

  const nodes = status == null ? Object.freeze([]) : launcherNodeOptions(status);
  // The two cases in which there is nothing to pick, each stating its own reason. A disabled
  // trigger stays FOCUSABLE (`aria-disabled`, never the `disabled` attribute): an element the
  // keyboard skips hides its explanation from exactly the users who need it.
  const blocked = status == null ? LAUNCHER_NO_PAYLOAD_REASON : nodes.length === 0 ? LAUNCHER_NO_NODES_REASON : null;
  const open = machine.open && blocked == null && !outcome.settled;
  // `open` is the state of a panel that is OPEN. A panel the payload will not let open is not
  // open, whatever the machine remembers — the state word and the render agree or one of them
  // is a lie.
  const state = outcome.state === LAUNCHER_OPEN && !open ? LAUNCHER_REST : outcome.state;
  const compact = open ? null : (COMPACT_FORMS[state] ?? null);

  const trigger = Object.freeze({
    label: compact == null ? LAUNCHER_TRIGGER_LABEL : `${LAUNCHER_TRIGGER_WORDS} · ${compact}`,
    words: compact == null ? LAUNCHER_TRIGGER_WORDS : `${LAUNCHER_TRIGGER_WORDS} · ${compact}`,
    caret: LAUNCHER_TRIGGER_CARET,
    disabled: blocked != null,
    focusable: true,
    reason: blocked,
    expanded: open,
    compact,
    widthCh: LAUNCHER_TRIGGER_WIDTH_CH,
  });

  if (!open) {
    return Object.freeze({ state, trigger, panel: null, outcome, outcomePoll: outcomePollFor(machine, outcome), settled: outcome.settled });
  }

  const resolved = launcherResolveSelection(status, machine.selection);
  const frozen = state === LAUNCHER_DISPATCHING || state === LAUNCHER_DISPATCHED;
  const request = launcherRequestBody(status, machine.selection);
  const itemsEmpty = resolved.items.length === 1;
  const fields = Object.freeze([
    fieldFor(LAUNCHER_FIELD_NODE, resolved.nodes, resolved.node, { frozen }),
    fieldFor(LAUNCHER_FIELD_REPO, resolved.repos, resolved.workspace, {
      frozen,
      disabled: resolved.repos.length === 0,
      reason: resolved.repos.length === 0 ? LAUNCHER_NO_REPOS_REASON : null,
    }),
    // NEVER DISABLED OVER A VALUE THE OPERATOR MUST BE ABLE TO CLEAR (measured: choose 50/04, then
    // a repo with no items — the field held the ref, refused every click, and the one remedy
    // `session-worktree-failed` names, "start without an item", was the act it blocked). A departed
    // ref keeps its field live so the root row stays reachable; its note is then the field's ONE
    // sentence, and the no-items reason does not render a second, contradicting one beside it.
    fieldFor(LAUNCHER_FIELD_ITEM, resolved.items, resolved.item, {
      frozen,
      disabled: itemsEmpty && !resolved.item.departed,
      reason: !itemsEmpty || resolved.item.departed ? null : resolved.workspace.value == null ? LAUNCHER_ITEM_NEEDS_REPO_REASON : LAUNCHER_NO_ITEMS_REASON,
    }),
  ]);

  return Object.freeze({
    state,
    trigger,
    panel: Object.freeze({
      title: LAUNCHER_PANEL_TITLE,
      caption: LAUNCHER_CAPTION,
      fields,
      request,
      actionLabel: state === LAUNCHER_DISPATCHING ? LAUNCHER_ACTION_BUSY : LAUNCHER_ACTION_REST,
      // Enabled ONLY once both required fields hold a value, and disabled while the promise is
      // held — a re-click into a projection that has not caught up is a correct coded refusal,
      // but a second dispatch while the first is unresolved is not.
      actionDisabled: request == null || frozen,
      frozen,
    }),
    outcome,
    outcomePoll: outcomePollFor(machine, outcome),
    settled: outcome.settled,
  });
}

/**
 * The outcome lane's poll, or `null`. It runs ONLY while `dispatched` holds — so it starts when
 * there is a tuple to ask about and stops the moment the window closes — and it always carries
 * the CURRENT attempt's session id, never a stranded one from a previous try.
 */
function outcomePollFor(machine, outcome) {
  if (outcome.state !== LAUNCHER_DISPATCHED) return null;
  const attempt = machine.attempt;
  return Object.freeze({
    path: HOME_SESSION_OUTCOME_PATH,
    nodeId: attempt.request.nodeId,
    sessionId: attempt.answer.sessionId,
    everyMs: LAUNCHER_OUTCOME_POLL_MS,
  });
}
