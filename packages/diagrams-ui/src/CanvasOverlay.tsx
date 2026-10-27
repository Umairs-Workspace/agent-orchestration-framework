import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { getCommonBounds, getSceneVersion } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ASK_ACTION, CLOSED_FIELD, MID_GESTURE, canAsk, cornerAnchor, fieldStep, selectionAction, selectionLabel } from "./canvas-anchor.mjs";
import type { Anchor, FieldEvent, QuestionField, SceneBounds } from "./canvas-anchor.mjs";
import { notePins } from "./conversation-model.mjs";
import type { NotePin, Thread } from "./conversation-model.mjs";

// THE CANVAS OVERLAY (milestone 171 / ADR-001): the one layer aof draws above Excalidraw's canvas,
// rendered as a child of the SDK component so it shares the canvas's origin. It follows the scene
// through the SDK's `onChange` / `onScrollChange` subscriptions, so a pan re-renders this layer and
// not the editor. Where anything sits is `canvas-anchor.mjs`'s answer, never computed here. It holds
// Ask architect at the selection (171/00) and each thread's pin on its shape's corner (171/05). Since
// 172/ADR-003 a pin opens its thread in the conversation panel beside the canvas, and nothing opens
// over the drawing but the ask field.

type Snapshot = { selectedIds: string[]; label: string; bounds: SceneBounds | null; appState: Record<string, unknown>; viewport: { width: number; height: number }; version: number };
const ESTIMATE = { width: 112, height: 30 };
// The app-state fields the anchor and the hide rule read; a change to any other does not re-render.
const WATCHED = ["scrollX", "scrollY", ...MID_GESTURE];

function snapshotOf(api: ExcalidrawImperativeAPI): Snapshot {
  const appState = api.getAppState() as unknown as Record<string, unknown> & { selectedElementIds: Record<string, boolean>; zoom: { value: number }; width: number; height: number };
  const elements = api.getSceneElements();
  const ids = appState.selectedElementIds ?? {};
  const selected = elements.filter((element) => ids[element.id]);
  // An object-valued flag (a menu, an element being drawn) is read only as set or unset.
  const watched = Object.fromEntries(WATCHED.map((key) => [key, appState[key] !== null && typeof appState[key] === "object" ? true : appState[key]]));
  return {
    selectedIds: selected.map((element) => element.id),
    label: selected.length ? selectionLabel(elements as never, ids) : "",
    bounds: selected.length ? getCommonBounds(selected) as unknown as SceneBounds : null,
    appState: { ...watched, zoom: { value: appState.zoom?.value ?? 1 } },
    viewport: { width: appState.width, height: appState.height },
    // A shape moved, added or removed re-places the pins.
    version: getSceneVersion(elements),
  };
}
const sameSnapshot = (a: Snapshot | null, b: Snapshot) => a !== null && JSON.stringify(a) === JSON.stringify(b);
const reduceField = (field: QuestionField, event: FieldEvent) => fieldStep(field, event).state;
const RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// A THREAD'S PIN (171/ADR-006, moved here from `NoteThread.tsx` at 172/01): a small filled circle on the
// shape's corner — the console's primary colour when the architect has the last word, muted while the
// thread waits — with a count when the shape holds more than one note. Choosing it opens the thread.
export const PIN_SIZE = 12;
export const pinSize = (pin: NotePin) => ({ width: pin.count > 1 ? 20 : PIN_SIZE, height: PIN_SIZE });
export function NotePinButton({ pin, at, open, onOpen }: { pin: NotePin; at: { x: number; y: number }; open: boolean; onOpen: () => void }) {
  const size = pinSize(pin);
  return <button type="button" data-aof-note-pin={pin.key} aria-expanded={open}
    aria-label={`${pin.count} note${pin.count === 1 ? "" : "s"} on ${pin.label}${pin.answered ? ", the architect answered" : ""}`}
    onClick={onOpen} style={{ left: at.x, top: at.y, width: size.width, height: size.height }}
    className={`pointer-events-auto absolute flex items-center justify-center rounded-full text-[9px] font-semibold leading-none text-white shadow-sm ${pin.answered ? "bg-primary" : "bg-muted-foreground"} ${RING}`}>
    {pin.count > 1 ? pin.count : null}
  </button>;
}
// INSIDE EXCALIDRAW'S CONTAINER THE SDK REDEFINES TWO CONSOLE TOKENS — `--color-primary` (its purple)
// and `--color-muted` — so a `bg-primary` pin read the SDK's colour, not the console's teal. aof's
// chrome roots re-declare both from the document root, where the console's theme defines them, so the
// theme stays their one home. Read once per mount; the console has one theme.
const SHADOWED_TOKENS = ["--color-primary", "--color-muted"];
export function consoleTokens(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const root = getComputedStyle(document.documentElement);
  return Object.fromEntries(SHADOWED_TOKENS.map((token) => [token, root.getPropertyValue(token).trim()]).filter(([, value]) => value));
}
const measure = (element: HTMLElement | null, prior: { width: number; height: number }) => {
  const rect = element?.getBoundingClientRect();
  if (!rect?.width || !rect.height) return prior;
  const measured = { width: Math.round(rect.width), height: Math.round(rect.height) };
  return measured.width === prior.width && measured.height === prior.height ? prior : measured;
};

export function CanvasOverlay({ api, readOnly, onAsk, threads = [], openKey = null, onOpenThread }: {
  api: ExcalidrawImperativeAPI | null; readOnly: boolean; onAsk: (text: string, selectedIds: string[]) => Promise<void>;
  threads?: Thread[]; openKey?: string | null; onOpenThread?: (key: string) => void;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [field, dispatch] = useReducer(reduceField, CLOSED_FIELD);
  // The selection the field was opened for. Choosing other shapes while it is open closes it, so a
  // question never sits at one shape while it asks about another.
  const [askedFor, setAskedFor] = useState<{ ids: string[]; label: string } | null>(null);
  const [size, setSize] = useState(ESTIMATE);
  const box = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const lastAt = useRef<Anchor | null>(null);
  const tokens = useMemo(consoleTokens, []);

  useEffect(() => {
    if (!api) return undefined;
    const sync = () => {
      const next = snapshotOf(api);
      setSnapshot((prior) => sameSnapshot(prior, next) ? prior : next);
    };
    sync();
    const offChange = api.onChange(sync);
    const offScroll = api.onScrollChange(sync);
    return () => { offChange(); offScroll(); };
  }, [api]);

  // What is drawn (the action or the open field) is measured, so it is placed and kept inside the
  // canvas edge by its real size.
  useLayoutEffect(() => {
    setSize((prior) => measure(box.current, prior));
  });
  useEffect(() => { if (field.open) input.current?.focus(); else setAskedFor(null); }, [field.open]);
  const selectionKey = snapshot?.selectedIds.join(" ") ?? "";
  useEffect(() => {
    if (field.open && !field.asking && askedFor && askedFor.ids.join(" ") !== selectionKey) dispatch({ type: "escape" });
  }, [selectionKey, field.open, field.asking, askedFor]);

  // The threads pinned on their shapes, and each pin's scene bounds.
  const version = snapshot?.version ?? 0;
  const pins = useMemo(() => {
    if (!api) return [];
    const elements = api.getSceneElements();
    return notePins(threads).map((pin) => {
      const own = elements.filter((element) => pin.elementIds.includes(element.id));
      return { pin, bounds: own.length ? getCommonBounds(own) as unknown as SceneBounds : null };
    });
    // `version` stands for the scene's elements, which the API holds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, threads, version]);

  const submit = async () => {
    if (!canAsk(field) || !askedFor) return;
    const text = field.text.trim();
    dispatch({ type: "submit" });
    try { await onAsk(text, askedFor.ids); dispatch({ type: "asked" }); }
    catch (reason) { dispatch({ type: "failed", error: reason instanceof Error ? reason.message : String(reason) }); }
  };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // The SDK binds most single keys on its container: a key typed here is the field's alone.
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); dispatch({ type: "escape" }); }
    else if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); }
  };
  // 171 VERIFICATION F-171-02 — and its keyup: the SDK's document-level keyup clears the selection on a
  // space when the active tool is not the selection tool, without asking where the key was typed, and a
  // cleared selection closes this field.
  const keepKeyUp = (event: KeyboardEvent<HTMLElement>) => event.stopPropagation();

  const action = snapshot ? selectionAction({ selectedCount: snapshot.selectedIds.length, readOnly, appState: snapshot.appState, bounds: snapshot.bounds, viewport: snapshot.viewport, size }) : null;
  if (action) lastAt.current = action;
  // An open field stays where it opened when its selection is dragged or clicked away from.
  const at = action ?? (field.open ? lastAt.current : null);
  const placedPins = snapshot ? pins.flatMap(({ pin, bounds }) => {
    const spot = cornerAnchor({ bounds, appState: snapshot.appState, viewport: snapshot.viewport, size: pinSize(pin) });
    return spot ? [{ pin, spot }] : [];
  }) : [];
  if (!at && placedPins.length === 0) return null;
  const label = askedFor?.label ?? "the selection";
  const rows = Math.min(4, Math.max(1, field.text.split("\n").length));
  // The action and the pins sit at the SDK's own canvas-button layer, under its menus and panels; an
  // open field is a focused popover, so it rises above them rather than be read unseen.
  const layer = field.open ? "calc(var(--zIndex-layerUI) + 1)" : "var(--zIndex-canvasButtons)";
  return <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: layer, ...tokens }} data-aof-canvas-overlay="">
    {placedPins.map(({ pin, spot }) => <NotePinButton key={pin.key} pin={pin} at={spot} open={openKey === pin.key}
      onOpen={() => onOpenThread?.(pin.key)} />)}
    {at ? <div ref={box} className="pointer-events-auto absolute" style={{ left: at.x, top: at.y }} data-placement={at.placement}>
      {!field.open ? <button type="button" data-aof-canvas-action="ask"
        onClick={() => { if (!snapshot) return; setAskedFor({ ids: snapshot.selectedIds, label: snapshot.label }); dispatch({ type: "open" }); }}
        className={`whitespace-nowrap rounded-md border border-border bg-card p-2 text-xs text-foreground shadow-sm hover:bg-muted ${RING}`}>{ASK_ACTION}</button>
        : <div role="group" aria-label={`Ask the architect about ${label}`} className="w-80 rounded-md border border-border bg-card p-2 text-xs text-foreground shadow-sm">
          <div className="flex items-start gap-2">
            <textarea ref={input} aria-label="Question for the architect" rows={rows} value={field.text} disabled={field.asking} maxLength={10000}
              placeholder={`Ask about ${label}`} onChange={(event) => dispatch({ type: "type", text: event.target.value })} onKeyDown={onKey} onKeyUp={keepKeyUp}
              className={`min-w-0 flex-1 resize-none rounded border border-border bg-background px-2 py-1 text-xs disabled:opacity-60 ${RING}`} />
            <button type="button" disabled={!canAsk(field)} onClick={() => void submit()} className={`rounded border border-border px-2 py-1 disabled:opacity-50 ${RING}`}>{field.asking ? "Asking…" : "Ask"}</button>
            <button type="button" disabled={field.asking} onClick={() => dispatch({ type: "escape" })} className={`rounded border border-border px-2 py-1 disabled:opacity-50 ${RING}`}>Cancel</button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Enter asks · Shift+Enter new line · Esc closes</p>
          {field.error ? <p role="alert" className="mt-1 text-destructive">{field.error}</p> : null}
        </div>}
    </div> : null}
  </div>;
}
