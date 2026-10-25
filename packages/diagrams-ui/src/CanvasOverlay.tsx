import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { getCommonBounds, getSceneVersion } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ANCHOR_GAP, ASK_ACTION, CLOSED_FIELD, MID_GESTURE, besideAnchor, canAsk, cornerAnchor, fieldStep, selectionAction, selectionLabel } from "./canvas-anchor.mjs";
import type { Anchor, FieldEvent, QuestionField, SceneBounds } from "./canvas-anchor.mjs";
import { notePins } from "./note-threads.mjs";
import type { ThreadNote } from "./note-threads.mjs";
import { NotePinButton, NoteThreadPopover, pinSize } from "./NoteThread";

// THE CANVAS OVERLAY (milestone 171 / ADR-001): the one layer aof draws above Excalidraw's canvas,
// rendered as a child of the SDK component so it shares the canvas's origin. It follows the scene
// through the SDK's `onChange` / `onScrollChange` subscriptions, so a pan re-renders this layer and
// not the editor. Where anything sits is `canvas-anchor.mjs`'s answer, never computed here. It holds
// Ask architect at the selection (171/00) and each note's pin and thread beside its shape (171/05).

type Snapshot = { selectedIds: string[]; label: string; bounds: SceneBounds | null; appState: Record<string, unknown>; viewport: { width: number; height: number }; version: number };
const ESTIMATE = { width: 112, height: 30 };
const THREAD_ESTIMATE = { width: 320, height: 240 };
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

export function CanvasOverlay({ api, readOnly, onAsk, notes = [], onReply }: {
  api: ExcalidrawImperativeAPI | null; readOnly: boolean; onAsk: (text: string, selectedIds: string[]) => Promise<void>;
  notes?: ThreadNote[]; onReply?: (note: ThreadNote, text: string) => Promise<string | null>;
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
  // One thread open at a time, by its pin's key.
  const [openPin, setOpenPin] = useState<string | null>(null);
  const [threadSize, setThreadSize] = useState(THREAD_ESTIMATE);
  const thread = useRef<HTMLDivElement | null>(null);
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

  // What is drawn (the action or the open field, and the open thread) is measured, so it is placed and
  // kept inside the canvas edge by its real size.
  useLayoutEffect(() => {
    setSize((prior) => measure(box.current, prior));
    setThreadSize((prior) => measure(thread.current, prior));
  });
  useEffect(() => { if (field.open) input.current?.focus(); else setAskedFor(null); }, [field.open]);
  const selectionKey = snapshot?.selectedIds.join(" ") ?? "";
  useEffect(() => {
    if (field.open && !field.asking && askedFor && askedFor.ids.join(" ") !== selectionKey) dispatch({ type: "escape" });
  }, [selectionKey, field.open, field.asking, askedFor]);

  // The notes pinned beside their shapes, and each pin's scene bounds.
  const version = snapshot?.version ?? 0;
  const pins = useMemo(() => {
    if (!api) return [];
    const elements = api.getSceneElements();
    return notePins(notes, elements as never).map((pin) => {
      const own = elements.filter((element) => pin.elementIds.includes(element.id));
      return { pin, bounds: own.length ? getCommonBounds(own) as unknown as SceneBounds : null };
    });
    // `version` stands for the scene's elements, which the API holds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, notes, version]);
  const opened = pins.find(({ pin }) => pin.key === openPin) ?? null;
  // The thread closes on a press anywhere but itself or a pin — the canvas included — and when its pin goes.
  useEffect(() => {
    if (openPin == null) return undefined;
    if (!opened) { setOpenPin(null); return undefined; }
    const away = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest?.("[data-aof-note-thread], [data-aof-note-pin]")) setOpenPin(null);
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [openPin, opened]);

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
  // Beside the shape and clear of its pin, which straddles the corner by half its width.
  const threadAt = snapshot && opened ? besideAnchor({ bounds: opened.bounds, appState: snapshot.appState, viewport: snapshot.viewport, size: threadSize, gap: ANCHOR_GAP + pinSize(opened.pin).width / 2 }) : null;
  if (!at && placedPins.length === 0) return null;
  const label = askedFor?.label ?? "the selection";
  const rows = Math.min(4, Math.max(1, field.text.split("\n").length));
  // The action and the pins sit at the SDK's own canvas-button layer, under its menus and panels; an
  // open field or thread is a focused popover, so it rises above them rather than be read unseen.
  const layer = field.open || threadAt ? "calc(var(--zIndex-layerUI) + 1)" : "var(--zIndex-canvasButtons)";
  return <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: layer, ...tokens }} data-aof-canvas-overlay="">
    {placedPins.map(({ pin, spot }) => <NotePinButton key={pin.key} pin={pin} at={spot} open={openPin === pin.key}
      onToggle={() => setOpenPin((current) => current === pin.key ? null : pin.key)} />)}
    {opened && threadAt ? <NoteThreadPopover key={opened.pin.key} pin={opened.pin} at={threadAt} boxRef={(element) => { thread.current = element; }}
      canReply={!readOnly && onReply != null} onClose={() => setOpenPin(null)}
      onReply={(note, text) => onReply ? onReply(note, text) : Promise.resolve(null)} /> : null}
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
          {field.error ? <p role="alert" className="mt-1 text-red-700">{field.error}</p> : null}
        </div>}
    </div> : null}
  </div>;
}
