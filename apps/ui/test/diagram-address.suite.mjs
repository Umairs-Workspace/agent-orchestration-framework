// THE `/diagram` ROUTE, headlessly: the table row, the nav that lists it under no item, the
// content mode, and the surface's address vocabulary (the one link builder and its parser).
// Framework-free modules driven by node:assert, the house pattern; the surface component itself is
// a leaf the headless harness stubs, as it stubs the editor. The surface holds no terminal and no
// dock mount (172/ADR-003 §4), and the last case here says so of its directory.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NOT_FOUND_ROUTE, ROUTES, routeFor } from "../src/app/routes.mjs";
import { navModel } from "../src/app/shell-nav.mjs";
import { CONTENT_MODE_FIXED, contentModeFor } from "../src/app/shell-layout.mjs";
import { DIAGRAM_ROUTE_ID, boardHref, diagramAddressOf, diagramHref, isDiagramMember } from "../src/diagram/diagram-address.mjs";

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
      assert.equal(contentModeFor("diagram").mode, CONTENT_MODE_FIXED, "the editor hosts a canvas and its conversation panel (172/02 retired the dock from this surface): content:fixed, like the board");
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
];

// ── 172/03 (ADR-003 §4) — the diagram surface has no terminal ────────────────────────────────────
// m171/ADR-005 gave the surface a dock and the dock a posture author; 172/02 stopped rendering the
// dock, and 172/03 removed what then had no caller. The directory is the claim: three files, and no
// source in the workspaces reaching for the module that left.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SKIPPED = new Set(["node_modules", "dist", "build", "coverage", "target", "test"]);
async function sourcesUnder(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIPPED.has(entry.name) || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await sourcesUnder(full)));
    else if (/\.(?:[cm]?[jt]sx?)$/u.test(entry.name)) found.push(full);
  }
  return found;
}

const noDockTests = [
  {
    name: "172/03 task00 · the diagram surface holds no dock module",
    run: async () => {
      const files = (await readdir(path.join(repoRoot, "apps", "ui", "src", "diagram"))).sort();
      assert.deepEqual(files, ["DiagramSurface.tsx", "diagram-address.d.mts", "diagram-address.mjs"]);
      const importers = [];
      for (const root of ["apps", "packages"]) {
        for (const file of await sourcesUnder(path.join(repoRoot, root))) {
          if (/(?:from\s+|import\s*\(\s*)["'][^"']*diagram\/dock-mount(?:\.mjs)?["']/u.test(await readFile(file, "utf8"))) importers.push(path.relative(repoRoot, file));
        }
      }
      assert.deepEqual(importers, [], "no source file under apps or packages imports diagram/dock-mount");
    },
  },
];

export const diagramAddressTests = [...addressTests, ...noDockTests];
