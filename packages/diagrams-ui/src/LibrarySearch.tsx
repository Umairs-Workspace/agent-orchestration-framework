import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { DefaultSidebar, Sidebar, exportToSvg } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { insertionFor, libraryDrag, searchLibraries, searchSummary } from "./library-search.mjs";
import type { LibraryEntry } from "./library-search.mjs";
import { consoleTokens } from "./CanvasOverlay";

// FIND IN LIBRARIES (milestone 171 / ADR-002): aof's own tab in the SDK's default sidebar, beside its
// Library tab, so the SDK keeps owning the sidebar and the Library panel is untouched. It filters the
// items the editor already loaded (`library-search.mjs`), and inserts a result through the SDK's own
// library drop — dragged with its drag type, or clicked to drop at the centre of the view, exactly as
// the panel's own click does — so the item keeps the `customData.aof.lib` tag `libraryItemsFor` gave it.

const FIND_TAB = "aof-find";
type PanelItem = { id: string; elements: unknown[] };
// Previews by item id: a tile scrolled away and back is not exported again. The exported node is
// appended (a copy per tile), never re-parsed from markup, and the tile ignores pointer events, so
// nothing an operator-supplied library carries — a link on an element — is live in the preview.
const previews = new Map<string, SVGSVGElement>();

function Preview({ item }: { item: PanelItem }) {
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const target = box.current;
    if (!target) return undefined;
    let live = true;
    const show = (svg: SVGSVGElement) => { if (live) target.replaceChildren(svg.cloneNode(true)); };
    const cached = previews.get(item.id);
    if (cached) { show(cached); return () => { live = false; }; }
    const render = () => {
      exportToSvg({ elements: item.elements as never, appState: { exportBackground: false, viewBackgroundColor: "transparent" } as never, files: null, exportPadding: 4 })
        .then((svg: SVGSVGElement) => {
          svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%");
          previews.set(item.id, svg);
          show(svg);
        })
        .catch(() => { /* the neutral placeholder stays */ });
    };
    // Rendered as it scrolls into view, so a large set costs nothing until it is searched.
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); render(); } });
    observer.observe(target);
    return () => { live = false; observer.disconnect(); };
  }, [item]);
  return <div ref={box} aria-hidden="true" className="pointer-events-none flex aspect-square w-full items-center justify-center overflow-hidden rounded bg-muted p-1 [&>svg]:max-h-full [&>svg]:max-w-full" />;
}

export function LibrarySearch({ api, libraries, libraryItems }: { api: ExcalidrawImperativeAPI | null; libraries: LibraryEntry[]; libraryItems: PanelItem[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchLibraries(libraries, query), [libraries, query]);
  const summary = searchSummary(libraries, query, results);
  const root = useRef<HTMLDivElement | null>(null);
  // The console's tokens, not the SDK's, for the tiles (see `consoleTokens`).
  const tokens = useMemo(consoleTokens, []);
  const field = useRef<HTMLInputElement | null>(null);
  // Focused when the tab opens: on the next frame, because the SDK's tab trigger takes focus on the
  // press that opened it and would win an `autoFocus`.
  useEffect(() => {
    const frame = requestAnimationFrame(() => field.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const dragOf = (index: number) => {
    const item = insertionFor({ index }, libraryItems);
    return item ? libraryDrag(item, window.location.origin) : null;
  };
  const onDragStart = (index: number) => (event: ReactDragEvent<HTMLButtonElement>) => {
    const drag = dragOf(index);
    if (drag) event.dataTransfer.setData(drag.type, drag.data);
  };
  // A click is the same drop, at the centre of the visible canvas — the point the SDK's own Library
  // panel inserts a clicked item at.
  const dropAtCentre = (index: number) => {
    const drag = dragOf(index);
    const container = root.current?.closest(".excalidraw");
    if (!drag || !container || !api) return;
    const state = api.getAppState();
    const data = new DataTransfer();
    data.setData(drag.type, drag.data);
    container.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: data, clientX: state.offsetLeft + state.width / 2, clientY: state.offsetTop + state.height / 2 }));
  };

  return <div ref={root} className="flex min-h-0 flex-1 flex-col gap-2 p-2 text-xs" style={tokens} data-aof-library-search="">
    <div className="flex items-center gap-1">
      <input ref={field} type="search" aria-label="Find in libraries" value={query} onChange={(event) => setQuery(event.target.value)}
        onKeyUp={(event) => event.stopPropagation() /* F-171-02: the SDK's document keyup clears the selection on a space */}
        placeholder="Find an item or library" className="min-w-0 flex-1 [&::-webkit-search-cancel-button]:appearance-none rounded border border-border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      {query ? <button type="button" aria-label="Clear the search" onClick={() => setQuery("")} className="rounded border border-border px-2 py-1">Clear</button> : null}
    </div>
    <p role="status" className="text-muted-foreground">{summary}</p>
    {results.length ? <ul className="grid min-h-0 grid-cols-3 gap-2 overflow-auto" aria-label="Library items found">
      {results.map(({ entry, index }) => {
        const item = libraryItems[index];
        return <li key={item?.id ?? index}>
          <button type="button" draggable onDragStart={onDragStart(index)} onClick={() => dropAtCentre(index)} title={`${entry.item} — ${entry.library}`}
            aria-label={`Insert ${entry.item} from ${entry.library}`} className="flex w-full flex-col items-stretch gap-0.5 rounded border border-border p-1 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {item ? <Preview item={item} /> : null}
            <span className="truncate text-[11px]">{entry.item}</span>
            <span className="truncate text-[10px] text-muted-foreground">{entry.library}</span>
          </button>
        </li>;
      })}
    </ul> : null}
  </div>;
}

// The tab and its trigger, as children of the SDK's default sidebar beside its own two tabs.
export function LibrarySearchSidebar(props: { api: ExcalidrawImperativeAPI | null; libraries: LibraryEntry[]; libraryItems: PanelItem[] }) {
  return <DefaultSidebar>
    <DefaultSidebar.TabTriggers>
      <Sidebar.TabTrigger tab={FIND_TAB} aria-label="Find in libraries" title="Find in libraries">Find</Sidebar.TabTrigger>
    </DefaultSidebar.TabTriggers>
    <Sidebar.Tab tab={FIND_TAB} className="flex min-h-0 flex-1 flex-col"><LibrarySearch {...props} /></Sidebar.Tab>
  </DefaultSidebar>;
}
