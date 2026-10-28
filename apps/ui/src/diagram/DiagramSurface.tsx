// THE DIAGRAM SURFACE — what the `/diagram` route renders: ONE Excalidraw draft, addressed by
// `?ref=<item>&file=<ADR-NNN-slug.svg>`, as a routed surface of the shell rather than a
// fullscreen occupant of the board. That is the whole reason it exists: an occupant is not
// addressable (no deep link from the architect's hand-back, nothing to refresh back into) and
// never stacks (being replaced is being dismissed, unsaved work and all), while a route is a
// place.
//
// The editor itself is @aof/diagrams-ui's, reached through ONE dynamic import so the SDK stays
// out of every other page's bundle; the board links here (`diagram-address.mjs`) and never
// imports the editor. This surface reads nothing of the board's. Since 172/ADR-003 §4 it renders no
// terminal: the editor posts each ask to the board's server, whose headless architect session
// answers into the conversation panel (172/ADR-001, ADR-002), so nothing is typed here.
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { CONTENT_FIXED_HEIGHT_CLASS } from "../app/shell-layout.mjs";
import { boardHref, diagramAddressOf } from "./diagram-address.mjs";

const ExcalidrawEditor = lazy(() => {
  (window as Window & { EXCALIDRAW_ASSET_PATH?: string }).EXCALIDRAW_ASSET_PATH = new URL(`${import.meta.env.BASE_URL}excalidraw/`, window.location.href).href;
  return import("@aof/diagrams-ui/editor").then((module) => ({ default: module.ExcalidrawEditor }));
});

export function DiagramSurface({ address }: { address: { pathname: string; search: string; hash: string } }) {
  const target = useMemo(() => diagramAddressOf(address.search), [address.search]);
  // The opt-out seam (170/ADR-002) holds on a direct address too: the surface asks the capability
  // before it imports the editor, so a project with diagrams off fetches none of it. Any failure
  // answers "not editable", as the board's asker does.
  // A server that does not serve the capability at all (the fleet, 404) is not a project with diagrams
  // off, and says so: the editor lives on the project's own board.
  const [editor, setEditor] = useState<"on" | "off" | "unserved" | null>(null);
  useEffect(() => {
    let current = true;
    fetch("/api/diagram/capability")
      .then((response) => (response.status === 404 ? "unserved" : response.ok ? response.json() : null))
      .then((answer: "unserved" | { editor?: unknown } | null) => (answer === "unserved" ? answer : answer?.editor === true ? "on" : "off"), () => "off" as const)
      .then((state) => { if (current) setEditor(state); });
    return () => { current = false; };
  }, []);

  if (target != null && editor !== "on") {
    return (
      <section className="p-4 text-sm" aria-label="Diagram editor">
        <p role="status">{editor === null ? "Checking whether this project draws diagrams…"
          : editor === "unserved" ? "This server does not serve the diagram editor. Open the diagram from the project's own board (Fleet → Open board)."
          : "Diagrams are off in this project (work.diagrams), so there is no draft editor."}</p>
        {editor !== null ? <p className="mt-2"><a href={boardHref(target.ref)} className="underline">Back to the board</a></p> : null}
      </section>
    );
  }

  if (target == null) {
    return (
      <section className="p-4 text-sm" aria-label="Diagram editor">
        <p role="status">No diagram is named. Open one from an item's ARCHITECTURE tab, where each linked figure offers Edit draft.</p>
        <p className="mt-2"><a href={boardHref(null)} className="underline">Back to the board</a></p>
      </section>
    );
  }

  return (
    // Sized as the board is, by the shell's published bands.
    <div className={`flex ${CONTENT_FIXED_HEIGHT_CLASS} min-h-0 flex-col`} aria-label="Diagram editor">
      <Suspense fallback={<p className="p-4 text-sm">Loading Excalidraw…</p>}>
        <ExcalidrawEditor
          itemRef={target.ref}
          svgFile={target.file}
          onRequestClose={() => { window.location.assign(boardHref(target.ref)); }}
        />
      </Suspense>
    </div>
  );
}
