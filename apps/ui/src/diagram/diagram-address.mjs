// THE DIAGRAM SURFACE'S ADDRESS — the `/diagram` route's one query vocabulary, and the ONE place
// an editor link is built. Framework-free (no React, no DOM), the house pattern for a decision
// that must be testable without a bundler, like `fleet/scope.mjs` owns `?repo=` for the fleet.
//
// `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>` names ONE draft: the item and the SVG member the
// ARCHITECTURE tab linked. The path is read off the route table, never spelled here (ADR-002's
// closed producer set; `acd-no-surface-mode-url-literal` sweeps for a minted route path), and
// the query is spelled with `URLSearchParams`, so an emptied query is never a bare "?".
//
// The member grammar is kept LOOSE on purpose: a bare `.svg` name with no path, no `..` and no
// query characters. The server validates the ADR grammar (`diagramFile` in @aof/diagrams'
// layout) and refuses with a coded error; this only keeps a hostile address from reaching the
// editor as a path.
import { ROUTES } from "../app/routes.mjs";

export const DIAGRAM_ROUTE_ID = "diagram";
const BOARD_ROUTE_ID = "board";
const SVG_MEMBER = /^[A-Za-z0-9][A-Za-z0-9._-]*\.svg$/;

const pathOf = (id) => ROUTES.find((route) => route.id === id)?.path ?? null;

// A bare `.svg` member: no separator, no `..`, no query or fragment characters.
export function isDiagramMember(file) {
  return typeof file === "string" && SVG_MEMBER.test(file) && !file.includes("..");
}

// The editor's address for one draft, or null when the route table has no diagram row or the
// inputs are not a ref and a member (a link that cannot be built is not built).
export function diagramHref(ref, file) {
  const path = pathOf(DIAGRAM_ROUTE_ID);
  const itemRef = typeof ref === "string" ? ref.trim() : "";
  if (path == null || itemRef.length === 0 || !isDiagramMember(file)) return null;
  const params = new URLSearchParams();
  params.set("ref", itemRef);
  params.set("file", file);
  return `${path}?${params.toString()}`;
}

// What a `/diagram` address names: `{ ref, file }`, or null when it names nothing the editor
// can open. TOTAL: it answers for every input and never throws.
export function diagramAddressOf(search) {
  let params;
  try {
    params = new URLSearchParams(typeof search === "string" ? search : "");
  } catch {
    return null;
  }
  const ref = (params.get("ref") ?? "").trim();
  const file = (params.get("file") ?? "").trim();
  if (ref.length === 0 || !isDiagramMember(file)) return null;
  return Object.freeze({ ref, file });
}

// Where Close goes: the board, selecting the item by the fragment the board already reads
// (`Board.tsx` sets `location.hash = ref`). With no ref, the bare board.
export function boardHref(ref) {
  const path = pathOf(BOARD_ROUTE_ID) ?? "/";
  const itemRef = typeof ref === "string" ? ref.trim() : "";
  return itemRef.length > 0 ? `${path}#${itemRef}` : path;
}
