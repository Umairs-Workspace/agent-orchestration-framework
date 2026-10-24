// THE DIAGRAM SURFACE — what the `/diagram` route renders: ONE Excalidraw draft, addressed by
// `?ref=<item>&file=<ADR-NNN-slug.svg>`, as a routed surface of the shell rather than a
// fullscreen occupant of the board. That is the whole reason it exists: an occupant is not
// addressable (no deep link from the architect's hand-back, nothing to refresh back into) and
// never stacks (being replaced is being dismissed, unsaved work and all), while a route is a
// place — and a surface owns its shell contributions, so the architect's session sits in the
// dock BESIDE the canvas instead of behind it.
//
// The editor itself is @aof/diagrams-ui's, reached through ONE dynamic import so the SDK stays
// out of every other page's bundle; the board links here (`diagram-address.mjs`) and never
// imports the editor. This surface reads nothing of the board's: its address vocabulary and its
// dock mount are its own modules in this directory, and the dock is the shared terminal control
// at the board-dock host, contributed to the shell's overlay slot exactly as the board does it.
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { SurfaceDock } from "../app/SurfaceSlot";
import { TerminalControl } from "../terminal/TerminalControl";
import type { TerminalOrigins } from "../terminal/TerminalControl";
import { HOST_BOARD_DOCK } from "../terminal/host-model.mjs";
import { boardHref, diagramAddressOf } from "./diagram-address.mjs";
import { diagramDockMount } from "./dock-mount.mjs";
import type { DiagramDockSession } from "./dock-mount.mjs";

const ExcalidrawEditor = lazy(() => {
  (window as Window & { EXCALIDRAW_ASSET_PATH?: string }).EXCALIDRAW_ASSET_PATH = new URL(`${import.meta.env.BASE_URL}excalidraw/`, window.location.href).href;
  return import("@aof/diagrams-ui/editor").then((module) => ({ default: module.ExcalidrawEditor }));
});

export function DiagramSurface({ address }: { address: { pathname: string; search: string; hash: string } }) {
  const target = useMemo(() => diagramAddressOf(address.search), [address.search]);
  const [dockSession, setDockSession] = useState<DiagramDockSession | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  // The PTY lives on the server that served this page; this surface mirrors no worker session.
  const origins = useMemo<TerminalOrigins>(() => ({ self: typeof window === "undefined" ? null : window.location.origin, fleet: null }), []);
  // The opt-out seam (170/ADR-002) holds on a direct address too: the surface asks the capability
  // before it imports the editor, so a project with diagrams off fetches none of it. Any failure
  // answers "not editable", as the board's asker does.
  const [editor, setEditor] = useState<boolean | null>(null);
  useEffect(() => {
    let current = true;
    fetch("/api/diagram/capability")
      .then((response) => (response.ok ? response.json() : null))
      .then((answer: { editor?: unknown } | null) => answer?.editor === true, () => false)
      .then((on) => { if (current) setEditor(on); });
    return () => { current = false; };
  }, []);

  if (target != null && editor !== true) {
    return (
      <section className="p-4 text-sm" aria-label="Diagram editor">
        <p role="status">{editor === null ? "Checking whether this project draws diagrams…" : "Diagrams are off in this project (work.diagrams), so there is no draft editor."}</p>
        {editor === false ? <p className="mt-2"><a href={boardHref(target.ref)} className="underline">Back to the board</a></p> : null}
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
    <div className="flex h-full min-h-0 flex-col" aria-label="Diagram editor">
      <Suspense fallback={<p className="p-4 text-sm">Loading Excalidraw…</p>}>
        <ExcalidrawEditor
          itemRef={target.ref}
          svgFile={target.file}
          onRequestClose={() => { window.location.assign(boardHref(target.ref)); }}
          onAskArchitect={(command) => { setDockSession({ ref: target.ref, command }); setDockOpen(true); }}
        />
      </Suspense>
      {dockOpen ? (
        <SurfaceDock deps={[dockSession, origins]}>
          <TerminalControl
            host={HOST_BOARD_DOCK}
            mount={diagramDockMount(dockSession)}
            origins={origins}
            onClose={() => setDockOpen(false)}
          />
        </SurfaceDock>
      ) : null}
    </div>
  );
}
