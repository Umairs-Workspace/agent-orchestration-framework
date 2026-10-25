// THE `/diagram` ROUTE, headlessly: the table row, the nav that lists it under no item, the
// content mode, the surface's address vocabulary (the one link builder and its parser) and its
// dock mount (the surface's one posture author). Framework-free modules driven by node:assert,
// the house pattern; the surface component itself is a leaf the headless harness stubs, as it
// stubs the terminal and the editor.
import assert from "node:assert/strict";
import { NOT_FOUND_ROUTE, ROUTES, routeFor } from "../src/app/routes.mjs";
import { navModel } from "../src/app/shell-nav.mjs";
import { CONTENT_MODE_FIXED, contentModeFor } from "../src/app/shell-layout.mjs";
import { POSTURE_INTERACTIVE } from "../src/terminal/input-policy.mjs";
import { sessionSourceFor } from "../src/terminal/source-table.mjs";
import { DIAGRAM_ROUTE_ID, boardHref, diagramAddressOf, diagramHref, isDiagramMember } from "../src/diagram/diagram-address.mjs";
import { DIAGRAM_DOCK_SOURCE, UNBOUND_DIAGRAM_DOCK_MOUNT, deliveryPlan, diagramDockMount } from "../src/diagram/dock-mount.mjs";
import { reviewInvocations } from "@aof/diagrams-ui/editor-state";

const ADDRESS = (pathname, search = "", hash = "") => ({ pathname, search, hash });

const addressTests = [
  {
    name: "diagram-route: the table has a frozen `diagram` row at `/diagram`, resolved like every other path and absent from the bar",
    run: () => {
      const row = ROUTES.find((route) => route.id === DIAGRAM_ROUTE_ID);
      assert.deepEqual({ ...row }, { id: "diagram", path: "/diagram" });
      assert.equal(Object.isFrozen(row), true);
      assert.equal(routeFor("/diagram").id, "diagram");
      assert.equal(routeFor("/diagram/").id, "diagram", "a single trailing slash is matched in place");
      assert.equal(routeFor("/Diagram"), NOT_FOUND_ROUTE, "case-sensitive");
      assert.equal(routeFor("/diagram//"), NOT_FOUND_ROUTE);
      const nav = navModel({ address: ADDRESS("/diagram", "?ref=133&file=ADR-002-seam.svg"), viewportWidth: 1280 });
      assert.deepEqual(nav.items.map((item) => item.id), ["landing", "fleet", "board", "config"], "the nav lists the four, and the editor under no item");
      assert.equal(nav.items.length, 4);
      assert.deepEqual(nav.gaps ?? [], [], "…so the four-item budget reports no gap");
      assert.equal(nav.items.some((item) => item.current), false, "no item claims the editor's address as its own");
      assert.equal(contentModeFor("diagram").mode, CONTENT_MODE_FIXED, "the editor hosts a canvas and the dock: content:fixed, like the board");
    },
  },
  {
    name: "diagram-address: the one link builder derives the path from the table and spells the query with URLSearchParams",
    run: () => {
      assert.equal(diagramHref("133", "ADR-002-seam.svg"), "/diagram?ref=133&file=ADR-002-seam.svg");
      assert.equal(diagramHref("133/04", "ADR-002-seam.svg"), "/diagram?ref=133%2F04&file=ADR-002-seam.svg", "a story ref is encoded, never a second path segment");
      assert.equal(diagramHref(" 133 ", "ADR-002-seam.svg"), "/diagram?ref=133&file=ADR-002-seam.svg", "the ref is trimmed");
      for (const [ref, file] of [["", "ADR-002-seam.svg"], ["133", "ADR-002-seam.png"], ["133", "../ADR-002-seam.svg"], ["133", "a/b.svg"], ["133", "x.svg?y"], ["133", ""], [null, "ADR-002-seam.svg"]]) {
        assert.equal(diagramHref(ref, file), null, `${JSON.stringify([ref, file])} builds no link`);
      }
    },
  },
  {
    name: "diagram-address: the parser round-trips the builder, is total, and names nothing for a hostile or partial address",
    run: () => {
      assert.deepEqual(diagramAddressOf("?ref=133%2F04&file=ADR-002-seam.svg"), { ref: "133/04", file: "ADR-002-seam.svg" });
      assert.equal(Object.isFrozen(diagramAddressOf("?ref=1&file=a.svg")), true);
      const built = diagramHref("133/04", "ADR-002-seam.svg");
      assert.deepEqual(diagramAddressOf(built.slice(built.indexOf("?"))), { ref: "133/04", file: "ADR-002-seam.svg" }, "what the builder spells, the parser reads");
      for (const search of ["", "?", "?ref=133", "?file=ADR-002-seam.svg", "?ref=&file=a.svg", "?ref=133&file=..%2Fsecret.svg", "?ref=133&file=a%2Fb.svg", "?ref=133&file=a.html", null, undefined, 42]) {
        assert.equal(diagramAddressOf(search), null, `${JSON.stringify(search)} names nothing`);
      }
      assert.equal(isDiagramMember("ADR-002-seam.svg"), true);
      assert.equal(isDiagramMember("ADR-002-seam.svg "), false);
    },
  },
  {
    name: "diagram-address: Close returns to the board, selecting the item by the fragment the board reads",
    run: () => {
      assert.equal(boardHref("133/04"), "/board#133/04");
      assert.equal(boardHref(""), "/board");
      assert.equal(boardHref(null), "/board");
    },
  },
  {
    name: "diagram-dock: the surface's one posture author binds a local PTY with the invocation, interactive and spawned here — and idles without a ref or a command",
    run: () => {
      const bound = diagramDockMount({ ref: "133/04", command: "/aof:diagram-review 133/04 ADR-002-seam.excalidraw req-1" });
      assert.equal(bound.bound, true);
      assert.equal(bound.posture, POSTURE_INTERACTIVE);
      assert.equal(bound.spawnedHere, true);
      assert.equal(bound.rendersPanel, true);
      assert.equal(bound.source, sessionSourceFor(DIAGRAM_DOCK_SOURCE).source, "a WHOLE row off the frozen table, never assembled here");
      assert.deepEqual({ ...bound.params }, { ref: "133/04" });
      assert.equal(bound.command, "/aof:diagram-review 133/04 ADR-002-seam.excalidraw req-1");
      assert.equal(bound.farEnd, null); assert.equal(bound.detail, null); assert.equal(bound.unavailable, null);
      assert.equal(Object.isFrozen(bound), true);
      for (const session of [null, undefined, {}, { ref: "133" }, { command: "/aof:x" }, { ref: "", command: "/aof:x" }]) {
        assert.equal(diagramDockMount(session), UNBOUND_DIAGRAM_DOCK_MOUNT, `${JSON.stringify(session)} idles`);
      }
      assert.equal(UNBOUND_DIAGRAM_DOCK_MOUNT.posture, POSTURE_INTERACTIVE, "the host does not stop being interactive when it has nothing to show");
      assert.equal(UNBOUND_DIAGRAM_DOCK_MOUNT.rendersPanel, true);
    },
  },
];

// ── milestone 171 / story 04 (ADR-005) — the surface's one delivery decision ────────────────────
// `deliveryPlan` (dock-mount.mjs) over what the editor hands it (`reviewInvocations`, the editor's
// pure state): a ready session is typed into, a note otherwise waits, a question otherwise starts a
// session that also takes the waiting notes (171/04 Q1). The control typing it is the terminal suite's.
const FILE = "ADR-003-push-stream.excalidraw";
const single = (id) => `/aof:diagram-review 171 ${FILE} ${id}`;
const BATCH = `/aof:diagram-review 171 ${FILE}`;
const handed = (requestId, waiting = 0) => reviewInvocations({ ref: "171", file: FILE, requestId, waiting });
const running = { dockOpen: true, sessionReady: true };
const closed = { dockOpen: false, sessionReady: false };
const exited = { dockOpen: true, sessionReady: false };

const deliveryTests = [
  // R1 · With the architect's session running, a new note is typed into it
  { name: "171/04 E1 · a note added while the session runs is typed into it", run: () => {
    const plan = deliveryPlan({ kind: "note", invocations: handed("n4"), ...running });
    assert.equal(plan.outcome, "typed", "the editor says the note was sent to the architect");
    assert.deepEqual(plan.type, [single("n4")]);
  } },
  { name: "171/04 E2 · a note added with the dock closed waits, as in 170", run: () => {
    const plan = deliveryPlan({ kind: "note", invocations: handed("n4"), ...closed });
    assert.equal(plan.outcome, "waiting", "the editor says the note waits for a review session");
    assert.deepEqual([plan.type, plan.command], [[], null], "nothing is handed to a dock");
  } },
  { name: "171/04 E3 · a note added after the session exited waits and says the session is not running", run: () => {
    const plan = deliveryPlan({ kind: "note", invocations: handed("n4"), ...exited });
    assert.equal(plan.outcome, "not-running");
    assert.deepEqual([plan.type, plan.command], [[], null], "nothing is typed");
  } },
  // R2 · Ask architect goes into the open session, and a new session also takes the waiting notes
  { name: "171/04 E4 · Ask architect with the session running types into it, and starts no session", run: () => {
    const plan = deliveryPlan({ kind: "ask", invocations: handed("n5"), ...running });
    assert.equal(plan.outcome, "typed");
    assert.deepEqual(plan.type, [single("n5")]);
    assert.equal(plan.command, null, "no new session");
  } },
  { name: "171/04 E5 · Ask architect with the dock closed opens a session typed the question, as in 170", run: () => {
    const plan = deliveryPlan({ kind: "ask", invocations: handed("n5"), ...closed });
    assert.equal(plan.outcome, "started");
    assert.equal(plan.command, single("n5"));
  } },
  { name: "171/04 · Ask architect on a dock whose session exited starts a new one (no longer a silent miss)", run: () => {
    const plan = deliveryPlan({ kind: "ask", invocations: handed("n5"), ...exited });
    assert.equal(plan.outcome, "started");
    assert.equal(plan.command, single("n5"));
  } },
  { name: "171/04 E9 · a new session takes the question, then the waiting notes", run: () => {
    const plan = deliveryPlan({ kind: "ask", invocations: handed("n5", 2), ...closed });
    assert.equal(plan.command, single("n5"), "typed the question");
    assert.deepEqual(plan.then, [BATCH], "then handed the batch invocation for the waiting notes");
  } },
  { name: "171/04 E10 · with no note open, a new session is typed only the question's invocation", run: () => {
    const plan = deliveryPlan({ kind: "ask", invocations: handed("n5", 0), ...closed });
    assert.deepEqual([plan.command, plan.then], [single("n5"), []]);
  } },
  { name: "171/04 · with a note open, a first draft's session is typed the first draft's invocation, then the batch", run: () => {
    const plan = deliveryPlan({ kind: "ask", invocations: handed("fd1", 1), ...closed });
    assert.deepEqual([plan.command, plan.then], [single("fd1"), [BATCH]]);
  } },
  { name: "171/04 · \"Review 2 notes with the architect\" starts a session typed the batch invocation once", run: () => {
    const plan = deliveryPlan({ kind: "ask", invocations: handed(null), ...closed });
    assert.deepEqual([plan.command, plan.then], [BATCH, []]);
  } },
];

export const diagramAddressTests = [...addressTests, ...deliveryTests];
