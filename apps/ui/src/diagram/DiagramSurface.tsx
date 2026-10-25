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
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { SurfaceDock } from "../app/SurfaceSlot";
import { CONTENT_FIXED_HEIGHT_CLASS } from "../app/shell-layout.mjs";
import { TerminalControl } from "../terminal/TerminalControl";
import type { TerminalOrigins } from "../terminal/TerminalControl";
import type { LaterInput } from "../terminal/input-policy.mjs";
import { HOST_BOARD_DOCK } from "../terminal/host-model.mjs";
import { boardHref, diagramAddressOf } from "./diagram-address.mjs";
import { DELIVERY_STARTED, DELIVERY_TYPED, deliveryPlan, diagramDockMount } from "./dock-mount.mjs";
import type { DeliveryKind, DeliveryOutcome, DiagramDockSession } from "./dock-mount.mjs";

const ExcalidrawEditor = lazy(() => {
  (window as Window & { EXCALIDRAW_ASSET_PATH?: string }).EXCALIDRAW_ASSET_PATH = new URL(`${import.meta.env.BASE_URL}excalidraw/`, window.location.href).href;
  return import("@aof/diagrams-ui/editor").then((module) => ({ default: module.ExcalidrawEditor }));
});

export function DiagramSurface({ address }: { address: { pathname: string; search: string; hash: string } }) {
  const target = useMemo(() => diagramAddressOf(address.search), [address.search]);
  const [dockSession, setDockSession] = useState<DiagramDockSession | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  // DELIVERY (171/ADR-005). Each started session is a new control (`dockRun` keys it), so its own
  // command is typed; what it is handed after that goes in as later input once it says it is ready.
  const [dockRun, setDockRun] = useState(0);
  const [laterInputs, setLaterInputs] = useState<LaterInput[]>([]);
  const dockOpenRef = useRef(false);
  const readyRef = useRef(false);
  const handAfterReady = useRef<string[]>([]);
  const nextSeq = useRef(0);
  const hand = (texts: readonly string[]) => setLaterInputs((prior) => [...prior, ...texts.map((text) => ({ seq: (nextSeq.current += 1), text }))]);
  // The surface's ONE delivery function: type into the ready session, start one, or let a note wait.
  const deliver = (ref: string, invocations: string[], kind: DeliveryKind): DeliveryOutcome => {
    const plan = deliveryPlan({ kind, invocations, dockOpen: dockOpenRef.current, sessionReady: readyRef.current });
    if (plan.outcome === DELIVERY_TYPED) hand(plan.type);
    if (plan.outcome === DELIVERY_STARTED) {
      readyRef.current = false;
      handAfterReady.current = [...plan.then];
      setLaterInputs([]);
      setDockSession({ ref, command: plan.command });
      setDockRun((run) => run + 1);
      dockOpenRef.current = true;
      setDockOpen(true);
    }
    return plan.outcome;
  };
  const sessionReady = (ready: boolean) => {
    readyRef.current = ready;
    if (ready && handAfterReady.current.length) { hand(handAfterReady.current); handAfterReady.current = []; }
  };
  // The PTY lives on the server that served this page; this surface mirrors no worker session.
  const origins = useMemo<TerminalOrigins>(() => ({ self: typeof window === "undefined" ? null : window.location.origin, fleet: null }), []);
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
    // Sized as the board is, by the shell's published bands — the dock's included — so an open
    // architect session never covers the editor's bar, where the next note is added (171/04).
    <div className={`flex ${CONTENT_FIXED_HEIGHT_CLASS} min-h-0 flex-col`} aria-label="Diagram editor">
      <Suspense fallback={<p className="p-4 text-sm">Loading Excalidraw…</p>}>
        <ExcalidrawEditor
          itemRef={target.ref}
          svgFile={target.file}
          onRequestClose={() => { window.location.assign(boardHref(target.ref)); }}
          onDeliver={(invocations, kind) => deliver(target.ref, invocations, kind)}
        />
      </Suspense>
      {dockOpen ? (
        <SurfaceDock deps={[dockSession, origins, dockRun, laterInputs]}>
          <TerminalControl
            key={dockRun}
            host={HOST_BOARD_DOCK}
            mount={diagramDockMount(dockSession)}
            origins={origins}
            laterInputs={laterInputs}
            onSessionReady={sessionReady}
            onClose={() => { dockOpenRef.current = false; readyRef.current = false; setDockOpen(false); }}
          />
        </SurfaceDock>
      ) : null}
    </div>
  );
}
