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
import { DIAGRAM_DOCK_SOURCE, UNBOUND_DIAGRAM_DOCK_MOUNT, diagramDockMount } from "../src/diagram/dock-mount.mjs";

const ADDRESS = (pathname, search = "", hash = "") => ({ pathname, search, hash });

export const diagramAddressTests = [
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
