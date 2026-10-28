import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaptureUpdateAction, Excalidraw, convertToExcalidrawElements, exportToBlob, exportToSvg, getSceneVersion, restoreElements, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { canvasDefaults } from "@aof/diagrams/house-style";
import { parseProfile } from "@aof/diagrams/mermaid-profile";
import { projectScene, sceneView, selectionIds } from "@aof/diagrams/scene-view";
import { compileProposal, firstDraftSkeletons, libraryItemsFor, operationsFor } from "./compile.mjs";
import { selectionLabel } from "./canvas-anchor.mjs";
import { CanvasOverlay } from "./CanvasOverlay";
import { ConversationPanel } from "./ConversationPanel";
import { LibrarySearchSidebar } from "./LibrarySearch";
import { conversationOf, replyToNote, threadHolding, withLiveTurns } from "./conversation-model.mjs";
import type { ConversationNote, Thread, ThreadNote } from "./conversation-model.mjs";
import { CONVERSATION_INITIAL, batchLine, conversationStep, sessionChip } from "./conversation-stream.mjs";
import type { ConversationEvent, ConversationState } from "./conversation-stream.mjs";
import { CANVAS_UPDATED, CHANGED_ELSEWHERE, STREAM_INITIAL, streamStep } from "./review-stream.mjs";
import type { StreamEvent, StreamState } from "./review-stream.mjs";
import { POLL_MS, askArchitect, deliveryFor, describeCounts, describeError, diagramReviewInvocation, openNotes, publishNotice, sceneFileName, sceneFingerprint, selectionFor, shouldPoll, touchedIds } from "./editor-state.mjs";

// THE EDITOR (milestone 170, ADR-010..ADR-013). The diagram is stored as Excalidraw's own scene, so
// this canvas IS the diagram: anything can be drawn, and your project's libraries are in the Library
// panel. The architect reads the scene as Mermaid and proposes edited Mermaid; Accept compiles the
// proposal's changes into element edits here and the server applies them, refusing whatever you
// changed since. Publish exports the figure the ADR shows from this same canvas. Since 172/ADR-003 every
// conversation about it — notes, answers, replies and proposals — is read in one panel beside the canvas.

type Scene = { type: "excalidraw"; version: 2; elements: CanvasElement[]; appState: Record<string, unknown>; files: Record<string, unknown> };
type SceneResponse = { ref: string; file: string; present: boolean; revision: string | null; scene: Scene; readOnly: boolean; assigned?: Record<string, string>; palette?: Record<string, string> | null };
type LibraryEntry = { library: string; item: string; id: string; elements: CanvasElement[] };
type ReviewRequest = { id: string; request: string; status: string; answer: string | null; selectedIds?: string[]; createdAt?: string; thread?: ThreadNote["thread"] };
type ReviewProposal = { id: string; requestId?: string; summary: string; rationale: string; status: string; createdAt?: string; decidedAt?: string | null; text?: string; changes?: Array<{ key: string; change: string }>; reason?: string | null };
type ReviewList = { requests: ReviewRequest[]; proposals: ReviewProposal[] };
type CanvasElement = Record<string, unknown> & { id: string; type: string; isDeleted?: boolean; customData?: Record<string, unknown>; x: number; y: number; width: number; height: number; containerId?: string | null; frameId?: string | null };

class ApiError extends Error {
  code: string | null;
  constructor(message: string, code: string | null) { super(message); this.code = code; }
}
async function jsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) throw new ApiError(body.error ?? `Request failed (${response.status})`, body.code ?? null);
  return body as T;
}
const failure = (reason: unknown) => reason instanceof ApiError ? describeError(reason.code, reason.message) : reason instanceof Error ? reason.message : "Diagram operation failed";
const NOTE_WAITING = "Note recorded. It waits until you review the waiting notes with the architect.";
const UNAVAILABLE = "architect-session-unavailable";
const FIRST_DRAFT_REQUEST = "Draw a first draft of this diagram from its ADR and diagram brief.";
const toElements = (skeletons: unknown[]) => convertToExcalidrawElements(skeletons as never, { regenerateIds: false }) as unknown as CanvasElement[];
// Bytes per `String.fromCharCode` call: well under the engine's argument-count limit.
const BASE64_CHUNK = 32768;
const base64Of = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
  return btoa(binary);
};
const newId = () => `aof-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
// The converter's places for a Mermaid view: where each node would sit if Mermaid laid it out.
async function converted(text: string) {
  const { parseMermaidToExcalidraw } = await import("@excalidraw/mermaid-to-excalidraw");
  return (await parseMermaidToExcalidraw(text)).elements as unknown as Array<Record<string, unknown> & { id: string; type: string; x: number; y: number; width: number; height: number }>;
}

export function ExcalidrawEditor({ itemRef, svgFile, onRequestClose }: { itemRef: string; svgFile: string; onRequestClose: () => void }) {
  const file = sceneFileName(svgFile);
  const url = `/api/diagram/scene?ref=${encodeURIComponent(itemRef)}&file=${encodeURIComponent(file)}`;
  const [loaded, setLoaded] = useState<SceneResponse | null>(null);
  const [libraries, setLibraries] = useState<LibraryEntry[]>([]);
  // The Library panel's items, tagged with where each came from: Find inserts these same items.
  const libraryItems = useMemo(() => libraryItemsFor(libraries) as unknown as Array<{ id: string; elements: unknown[] }>, [libraries]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  // The revision this session published, if any: whether an earlier session published it is not known.
  const [publishedRevision, setPublishedRevision] = useState<string | null>(null);
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  // The same API as state, for the canvas overlay's subscriptions.
  const [canvasApi, setCanvasApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const revision = useRef<string | null>(null);
  const baseline = useRef<string | null>(null);
  const busyRef = useRef(false);
  // Read by the review stream's handlers, which outlive any one render.
  const dirtyRef = useRef(false);
  const stream = useRef<StreamState>(STREAM_INITIAL);
  const deferred = useRef<StreamEvent | null>(null);
  const streamDispatch = useRef<(event: StreamEvent) => void>(() => {});
  const [changedElsewhere, setChangedElsewhere] = useState(false);
  const [reloading, setReloading] = useState(false);
  // What the header says when the canvas took a draft saved elsewhere, until the next edit or save.
  const [canvasNote, setCanvasNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [invocation, setInvocation] = useState<string | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewList>({ requests: [], proposals: [] });
  // The records are read once before the panel lists anything; until then it shows its skeleton.
  const [reviewRead, setReviewRead] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  // THE CONVERSATION PANEL (172/ADR-003): which thread is open (one at a time), whether the panel is
  // collapsed, the note whose thread opens once the records list it, and what the composer asks about.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [openingNote, setOpeningNote] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  // The scene's version: a shape added, moved or relabelled re-reads the threads' subjects.
  const [sceneVersion, setSceneVersion] = useState(0);
  // THE ARCHITECT'S SESSION AS THE STREAM REPORTS IT (172/ADR-002 §3): its state and each live turn.
  const [live, setLive] = useState<ConversationState>(CONVERSATION_INITIAL);
  const step = useCallback((event: ConversationEvent) => setLive((prior) => conversationStep(prior, { at: new Date().toISOString(), ...event })), []);
  // How many shapes the canvas holds: an empty diagram is offered a first draft.
  const [liveCount, setLiveCount] = useState(0);

  const post = useCallback(async <T,>(body: Record<string, unknown>) => fetch(url, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, ref: itemRef, file }),
  }).then(jsonResponse<T>), [url, itemRef, file]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(url, { signal: controller.signal }).then(jsonResponse<SceneResponse>),
      post<{ items: LibraryEntry[] }>({ action: "libraries" }).catch(() => ({ items: [] as LibraryEntry[] })),
    ]).then(([answer, library]) => {
      if (controller.signal.aborted) return;
      revision.current = answer.revision;
      setLibraries(library.items ?? []);
      setLoaded(answer);
    }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(failure(reason)); });
    return () => controller.abort();
  }, [url, post]);

  const markDirty = (value: boolean) => { dirtyRef.current = value; setDirty(value); if (value) setCanvasNote(null); };
  const canvasFingerprint = () => {
    const live = api.current;
    if (!live) return null;
    return sceneFingerprint(JSON.parse(serializeAsJSON(live.getSceneElements(), live.getAppState(), live.getFiles(), "local")) as Scene);
  };
  // Native SDK serialization strips transient state (selection, collaborators, dialogs).
  // Compare document content, not onChange counts: pan/zoom/selection are not edits.
  const remember = useCallback((elements: Parameters<typeof serializeAsJSON>[0], appState: Parameters<typeof serializeAsJSON>[1], files: Parameters<typeof serializeAsJSON>[2]) => {
    const scene = JSON.parse(serializeAsJSON(elements, appState, files, "local")) as Scene;
    setLiveCount(scene.elements.filter((element) => element.isDeleted !== true && element.type !== "text").length);
    setSceneVersion(getSceneVersion(elements));
    const ids = (appState as unknown as { selectedElementIds?: Record<string, boolean> }).selectedElementIds ?? {};
    setSelected(Object.values(ids).some(Boolean) ? selectionLabel(elements as never, ids) : "");
    const fingerprint = sceneFingerprint(scene);
    if (baseline.current === null) baseline.current = fingerprint;
    markDirty(fingerprint !== baseline.current);
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const refreshReview = useCallback(async () => {
    try {
      const answer = await post<ReviewList>({ action: "proposals" });
      setReview({ requests: answer.requests ?? [], proposals: answer.proposals ?? [] });
      setReviewError(null);
    } catch (reason) { setReviewError(failure(reason)); }
    finally { setReviewRead(true); }
  }, [post]);

  // A draft saved elsewhere, taken into the canvas in place: the canvas is clean, or the operator
  // chose Reload over their unsaved edits.
  const reloadSaved = useCallback(async () => {
    const live = api.current;
    if (!live) return;
    setReloading(true);
    try {
      const answer = await fetch(url).then(jsonResponse<SceneResponse>);
      live.updateScene({ elements: answer.scene.elements as never, captureUpdate: CaptureUpdateAction.NEVER });
      const files = Object.values(answer.scene.files ?? {});
      if (files.length) live.addFiles(files as never);
      revision.current = answer.revision;
      baseline.current = sceneFingerprint(JSON.parse(serializeAsJSON(live.getSceneElements(), live.getAppState(), live.getFiles(), "local")) as Scene);
      dirtyRef.current = false; setDirty(false);
      setLoaded((prior) => prior && ({ ...prior, present: answer.present, revision: answer.revision }));
      setChangedElsewhere(false);
      setCanvasNote(CANVAS_UPDATED);
    } catch (reason) { setError(failure(reason)); }
    finally { setReloading(false); }
  }, [url]);

  // THE "LOOK NOW" STREAM (171/ADR-003). The face says what moved; `review-stream.mjs` says what that
  // means for this editor, and this effect carries it out. The five-second poll runs only while the
  // stream is not open, and nothing runs while the tab is hidden.
  const isLoaded = loaded !== null;
  useEffect(() => {
    if (!isLoaded) return undefined;
    const address = `/api/diagram/events?ref=${encodeURIComponent(itemRef)}&file=${encodeURIComponent(file)}`;
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    const visible = () => document.visibilityState !== "hidden";
    const syncPoll = () => {
      const poll = shouldPoll({ open: true, visible: visible(), stream: stream.current.stream });
      if (poll && !timer) timer = setInterval(() => void refreshReview(), POLL_MS);
      if (!poll && timer) { clearInterval(timer); timer = null; }
    };
    const connect = () => {
      source?.close();
      const next = new EventSource(address);
      source = next;
      const data = (message: Event) => { try { return JSON.parse((message as MessageEvent).data); } catch { return {}; } };
      next.onopen = () => dispatch({ type: "open" });
      next.onerror = () => dispatch({ type: "error" });
      next.addEventListener("stamp", (message) => dispatch({ type: "stamp", ...data(message) }));
      next.addEventListener("review", (message) => dispatch({ type: "review", ...data(message) }));
      next.addEventListener("scene", (message) => dispatch({ type: "scene", ...data(message) }));
      // The architect's live turn rides the same stream; a connection opens with the session's snapshot.
      next.addEventListener("conversation", (message) => step(data(message) as ConversationEvent));
    };
    const dispatch = (event: StreamEvent) => {
      const { state, effects } = streamStep(stream.current, event, { revision: revision.current, dirty: dirtyRef.current, writing: busyRef.current });
      stream.current = state;
      for (const effect of effects) {
        if (effect === "refresh") void refreshReview();
        else if (effect === "replace") void reloadSaved();
        else if (effect === "offer-reload") setChangedElsewhere(true);
        else if (effect === "close-line") setChangedElsewhere(false);
        else if (effect === "defer") deferred.current = event;
        else if (effect === "connect") connect();
        else if (effect === "disconnect") { source?.close(); source = null; }
      }
      syncPoll();
    };
    streamDispatch.current = dispatch;
    const onVisibility = () => dispatch({ type: visible() ? "visible" : "hidden" });
    void refreshReview();
    dispatch({ type: visible() ? "connect" : "hidden" });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      source?.close();
      if (timer) clearInterval(timer);
      streamDispatch.current = () => {};
      stream.current = STREAM_INITIAL;
    };
  }, [isLoaded, itemRef, file, refreshReview, reloadSaved, step]);
  // A draft event that arrived during one of this editor's own writes is decided once the write has
  // answered — by then the revision it wrote is known, and its own save is not a change made elsewhere.
  const afterWrite = () => {
    const held = deferred.current;
    deferred.current = null;
    if (held) streamDispatch.current(held);
  };

  const sceneNow = (): Scene | null => {
    const live = api.current;
    return live ? JSON.parse(serializeAsJSON(live.getSceneElementsIncludingDeleted(), live.getAppState(), live.getFiles(), "local")) as Scene : null;
  };
  // SAVE: the scene as drawn. The server gives whatever you drew a Mermaid id; those ids are stamped
  // back on the shapes here, so a note can name them and the next save keeps them.
  const saveSnapshot = async () => {
    const live = api.current;
    const scene = sceneNow();
    if (loaded?.readOnly || !live || !scene) throw new Error("The editable diagram is not ready.");
    const answer = await post<SceneResponse>({ action: "save", baseRevision: revision.current, scene });
    revision.current = answer.revision;
    const assigned = answer.assigned ?? {};
    if (Object.keys(assigned).length) {
      const next = (live.getSceneElementsIncludingDeleted() as unknown as CanvasElement[]).map((element) => {
        const id = assigned[element.id];
        if (!id) return element;
        const aof = { ...((element.customData?.aof as Record<string, unknown>) ?? {}), id };
        return { ...element, customData: { ...(element.customData ?? {}), aof } };
      });
      live.updateScene({ elements: next as never, captureUpdate: CaptureUpdateAction.NEVER });
    }
    baseline.current = canvasFingerprint();
    setLoaded((prior) => prior && ({ ...prior, present: true, revision: answer.revision }));
    markDirty(false); setCanvasNote(null);
    return answer;
  };
  const perform = async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try { await operation(); }
    catch (reason) { setError(failure(reason)); }
    finally { busyRef.current = false; setBusy(false); afterWrite(); }
  };
  const selectedIdsNow = () => selectionIds(api.current?.getSceneElements() as never ?? [], api.current?.getAppState().selectedElementIds as never);
  // A NOTE: recorded, and NOTHING is launched. Notes wait in the panel until a review session — the
  // batch `/aof:diagram-review <ref> <file>` from any Claude session, or Review notes below — examines them.
  const recordRequest = async (text: string) => {
    if (dirty || !loaded?.present) await saveSnapshot();
    const answer = await post<{ request?: { id?: string } }>({ action: "request", baseRevision: revision.current, selectedIds: selectedIdsNow(), request: text });
    return answer.request?.id ?? null;
  };
  // DELIVERY (172/ADR-002 §1): each action posts the request ids `deliveryFor` names to the board's
  // conversation route, in order; the server's session answers them one turn at a time and the answer
  // streams back on the events stream. A delivery answered `queued` waits behind the turn in flight; a
  // server with no architect session to launch answers 503, and the command to run is shown instead.
  const conversationUrl = `/api/diagram/conversation?ref=${encodeURIComponent(itemRef)}&file=${encodeURIComponent(file)}`;
  const waitingNotes = (except: string | null = null) => openNotes(review.requests).filter((note) => note.id !== except).length;
  const sendDeliveries = async (bodies: Array<{ requestId?: string }>) => {
    let outcome: "sent" | "unavailable" = "sent";
    for (const body of bodies) {
      const response = await fetch(conversationUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const answer = await response.json().catch(() => ({}));
      if (response.status === 503 && answer.code === UNAVAILABLE) {
        step({ type: "session", state: "unavailable", reason: answer.error ?? null });
        setInvocation(diagramReviewInvocation(itemRef, file));
        outcome = "unavailable";
        break;
      }
      if (!response.ok || answer.ok === false) throw new ApiError(answer.error ?? `Request failed (${response.status})`, answer.code ?? null);
      if (answer.outcome === "queued" && body.requestId) step({ type: "session", queued: [body.requestId] });
    }
    return outcome;
  };
  const deliver = (action: Parameters<typeof deliveryFor>[0], requestId: string | null = null) => sendDeliveries(deliveryFor(action, { requestId, waiting: waitingNotes(requestId) }));
  // A question's own request, then the batch when other notes wait (171/04 Q1).
  const launch = (_command: string, requestId: string) => {
    deliver("ask", requestId).catch((reason: unknown) => setError(failure(reason)));
  };
  // A NOTE is recorded and NOTHING is sent: it waits for Review with the architect.
  const note = async (text: string) => {
    if (!text.trim()) throw new Error("Enter a note first.");
    setNotice(null); setInvocation(null);
    const id = await recordRequest(text.trim());
    setNotice(NOTE_WAITING);
    if (id) setOpeningNote(id);
    await refreshReview();
  };
  // ASK ARCHITECT, from the bar or at the selection on the canvas: one path (171/ADR-001). Either
  // names the canvas elements it is about; their Mermaid ids are read after the save.
  const askAt = async (text: string, elementIds: string[]) => {
    setNotice(null); setInvocation(null);
    const id = await askArchitect({
      text, unsaved: dirty || !loaded?.present, revision: revision.current, save: saveSnapshot,
      selection: () => selectionIds(api.current?.getSceneElements() as never ?? [], selectionFor(elementIds) as never),
      record: async (request) => (await post<{ request?: { id?: string } }>({ action: "request", ...request })).request?.id ?? null,
      launch, invocation: (requestId) => diagramReviewInvocation(itemRef, file, requestId),
    });
    // The new note's thread opens at the top of the panel once the records list it.
    if (id) setOpeningNote(id);
    await refreshReview();
    return id;
  };
  const selectedElementIds = () => { const ids = api.current?.getAppState().selectedElementIds ?? {}; return Object.keys(ids).filter((id) => ids[id]); };
  const ask = async (text: string) => Boolean(await askAt(text, selectedElementIds()));
  const askAtSelection = async (text: string, elementIds: string[]) => {
    if (busyRef.current) throw new Error("The editor is busy; try again in a moment.");
    busyRef.current = true; setBusy(true); setError(null);
    try { if (!await askAt(text, elementIds)) throw new Error("The request was not recorded."); }
    catch (reason) { throw new Error(failure(reason)); }
    finally { busyRef.current = false; setBusy(false); afterWrite(); }
  };
  const reviewNotes = async () => { setNotice(null); setInvocation(null); await deliver("review"); };
  // A REPLY in a note's thread (171/ADR-006), read in the panel (172/ADR-003): recorded on the note, then
  // posted to the architect's session, which the server starts when none runs (172/02 E5).
  const replyInThread = async (note: ThreadNote, text: string) => {
    setInvocation(null);
    const outcome = await replyToNote({
      requestId: note.id, text, record: (reply) => post({ action: "reply", ...reply }),
      deliver: (bodies) => sendDeliveries(bodies as Array<{ requestId?: string }>),
      invocations: (requestId) => deliveryFor("reply", { requestId }) as never,
    });
    await refreshReview();
    return outcome === "unavailable" ? "Reply recorded. No architect session could start here — run the command below." : null;
  };
  // ASK AGAIN: a turn that ended with nothing recorded re-delivers its note.
  const askAgain = async (requestId: string) => { setInvocation(null); await deliver("ask-again", requestId); };
  const firstDraft = async () => {
    setNotice(null); setInvocation(null);
    const id = await recordRequest(FIRST_DRAFT_REQUEST);
    if (id) { setOpeningNote(id); await deliver("first-draft", id); }
    await refreshReview();
  };
  const withdraw = async (request: ReviewRequest) => {
    try { await post({ action: "withdraw", requestId: request.id }); setNotice("Note withdrawn."); }
    finally { await refreshReview(); }
  };
  const selectAndShow = (ids: string[]) => {
    const live = api.current;
    if (!live) return 0;
    const all = live.getSceneElements() as unknown as CanvasElement[];
    const { index } = projectScene(all as never);
    const targets = new Set(ids.flatMap((id) => index[id]?.elementIds ?? []));
    live.updateScene({ appState: { selectedElementIds: selectionFor([...targets]) } as never });
    const shown = all.filter((element) => targets.has(element.id));
    if (shown.length) live.scrollToContent(shown as never, { fitToContent: true, animate: false });
    return shown.length;
  };
  const preview = (proposal: ReviewProposal) => {
    const existing = touchedIds(proposal, { existingOnly: true });
    const added = touchedIds(proposal).length - existing.length;
    const shown = existing.length ? selectAndShow(existing) : 0;
    setPreviewNote(existing.length === 0
      ? `This proposal only adds to the diagram (${describeCounts(proposal)}); what it adds appears when you accept it.`
      : `Selected ${shown} shape${shown === 1 ? "" : "s"} this proposal changes${added > 0 ? `; ${added} new fact${added === 1 ? "" : "s"} appear after you accept` : ""}.`);
  };
  // ACCEPT: compile the proposal's changes into edits of the scene as it is now, let the SDK settle text
  // sizes and bindings, and send exactly the elements touched.
  const accept = async (proposal: ReviewProposal) => {
    if (dirty) await saveSnapshot();
    setNotice(null);
    const live = api.current;
    if (!live || typeof proposal.text !== "string") throw new Error("The proposal cannot be compiled here.");
    const proposed = parseProfile(proposal.text);
    // Excalidraw fetches a font only once the scene draws text in it, so on a canvas that has drawn
    // none (a first draft) every label would be measured, and wrapped, in the fallback font, then
    // overflow its box when the hand-drawn font paints. Its faces are registered at mount; load the
    // default family for this proposal's characters before anything is measured.
    if (typeof document !== "undefined" && document.fonts) await document.fonts.load("20px Excalifont", proposal.text);
    const changes = proposal.changes ?? [];
    const current = live.getSceneElementsIncludingDeleted() as unknown as CanvasElement[];
    const hasNodes = projectScene(current as never).model.nodes.length > 0;
    const adds = changes.some((change) => change.change === "added" && change.key.startsWith("node:"));
    let next: CanvasElement[];
    let touched: Set<string>;
    if (!hasNodes && adds) {
      const { skeletons, frameOf } = firstDraftSkeletons(await converted(proposal.text), proposed, { newId });
      const made = toElements(skeletons);
      const byId = new Map(made.map((element) => [element.id, element]));
      for (const element of made) {
        const owner = element.containerId ? byId.get(element.containerId) : element;
        const id = (owner?.customData?.aof as { id?: string } | undefined)?.id;
        if (id && element.type !== "frame") element.frameId = frameOf(id);
      }
      next = [...current, ...made];
      touched = new Set(made.map((element) => element.id));
    } else {
      const hints = new Map<string, { x: number; y: number; w: number; h: number }>();
      if (adds) for (const skeleton of await converted(proposal.text)) if (skeleton.type !== "arrow") hints.set(skeleton.id, { x: skeleton.x, y: skeleton.y, w: skeleton.width, h: skeleton.height });
      const compiled = compileProposal({ elements: current as never, changes, proposed, hints, libraries: libraries as never, toElements: toElements as never, newId });
      if (compiled.unresolved.length) throw new Error(`This proposal cannot be applied: ${compiled.unresolved.join("; ")}.`);
      next = compiled.elements as CanvasElement[];
      touched = compiled.touched;
    }
    const settled = restoreElements(next as never, null, { refreshDimensions: true, repairBindings: true }) as unknown as CanvasElement[];
    const operations = operationsFor(current, settled, touched);
    try {
      const answer = await post<SceneResponse>({ action: "accept", proposalId: proposal.id, baseRevision: revision.current, operations });
      revision.current = answer.revision;
      live.updateScene({ elements: answer.scene.elements as never, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
      baseline.current = canvasFingerprint();
      setLoaded((prior) => prior && ({ ...prior, present: true, revision: answer.revision }));
      markDirty(false); setCanvasNote(null);
      // Bring what the proposal changed into view: an accepted change off-screen reads as nothing.
      const changed = touchedIds(proposal);
      if (!changed.length || selectAndShow(changed) === 0) live.scrollToContent(undefined, { fitToContent: true, animate: false });
      setNotice("Proposal accepted and saved to the diagram."); setPreviewNote(null);
    } finally { await refreshReview(); }
  };
  const reject = async (proposal: ReviewProposal, reason: string) => {
    try {
      await post({ action: "reject", proposalId: proposal.id, ...(reason.trim() ? { reason: reason.trim() } : {}) });
      setNotice("Proposal rejected."); setPreviewNote(null);
    } finally { await refreshReview(); }
  };
  // PUBLISH: the SVG — and a PNG, written when the project owes one — exported from this canvas, written
  // where the ADR links them. The notice says so, and names a missing ADR link (F-172-16).
  const publish = async () => {
    if (dirty || !loaded?.present) await saveSnapshot();
    const live = api.current;
    if (!live) throw new Error("The editable diagram is not ready.");
    const elements = live.getSceneElements();
    const appState = { ...live.getAppState(), exportBackground: true, exportWithDarkMode: false };
    const files = live.getFiles();
    const svgElement = await exportToSvg({ elements, appState, files, exportPadding: 16 });
    const svg = new XMLSerializer().serializeToString(svgElement);
    const png = await base64Of(await exportToBlob({ elements, appState, files, mimeType: "image/png", exportPadding: 16 }));
    const answer = await post<{ written: string[]; linked: boolean; revision: string }>({ action: "publish", baseRevision: revision.current, svg, png });
    setPublishedRevision(answer.revision);
    setNotice(publishNotice(answer));
  };
  const showView = () => setView(sceneView((api.current?.getSceneElements() ?? []) as never));
  const close = () => { if (!busy && (!dirty || window.confirm("Discard unsaved diagram edits?"))) onRequestClose(); };

  const notes = openNotes(review.requests);
  // THE PANEL'S MODEL (172/ADR-003 §2): threads read from the records and the scene as it is now.
  const recorded = useMemo(
    () => conversationOf(review.requests, review.proposals, (api.current?.getSceneElements() ?? []) as never),
    // `sceneVersion` stands for the canvas's elements, which the API holds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [review, sceneVersion, ready],
  );
  // The live turn merged into its thread until the recorded turn replaces it (172/ADR-002 §4).
  const conversation = useMemo(() => ({ ...recorded, threads: withLiveTurns(recorded.threads, live) }), [recorded, live]);
  // A note just asked or saved opens its thread once the records list it; an open thread that is gone
  // (withdrawn, or its shapes regrouped) closes.
  useEffect(() => {
    if (openingNote) {
      const thread = threadHolding(conversation.threads, openingNote);
      if (thread) { setOpenKey(thread.key); setPanelCollapsed(false); setOpeningNote(null); }
    } else if (openKey && !conversation.threads.some((thread) => thread.key === openKey)) setOpenKey(null);
  }, [conversation, openingNote, openKey]);
  // A pin opens its thread, and the panel with it; one thread is open at a time.
  const openThread = (key: string | null) => { setOpenKey(key); setPreviewNote(null); if (key) setPanelCollapsed(false); };
  // A write the panel waits on: busy while it runs, its failure handed back to the card that asked.
  const performFor = async (operation: () => Promise<void>) => {
    if (busyRef.current) throw new Error("The editor is busy; try again in a moment.");
    busyRef.current = true; setBusy(true); setError(null);
    try { await operation(); }
    catch (reason) { throw new Error(failure(reason)); }
    finally { busyRef.current = false; setBusy(false); afterWrite(); }
  };
  const askFromPanel = async (text: string) => { let asked = false; await performFor(async () => { asked = await ask(text); }); return asked; };
  const noteFromPanel = async (text: string) => { await performFor(() => note(text)); return true; };
  const showOnCanvas = (thread: Thread<ReviewRequest, ReviewProposal>) => { selectAndShow(thread.selectedIds); };
  const copyCommand = (command: string) => void navigator.clipboard.writeText(command).catch(() => setError("Clipboard unavailable; select and copy the command manually."));

  return <section className="flex min-h-0 flex-1 flex-col bg-background" aria-label="Excalidraw architecture diagram">
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2 text-xs">
      <strong>{file}</strong>
      <span role="status">{loaded?.readOnly ? "Read-only" : dirty ? "Unsaved changes" : canvasNote ? canvasNote : !loaded?.present ? "New diagram — not saved" : publishedRevision && publishedRevision === loaded.revision ? "Saved and published" : "Saved"}</span>
      <button type="button" aria-label="Show the Mermaid view" disabled={!ready} onClick={() => (view ? setView(null) : showView())} className="ml-auto rounded border px-3 py-1 disabled:opacity-50">Mermaid view</button>
      <button type="button" disabled={!ready || busy || loaded?.readOnly} onClick={() => void perform(async () => { await saveSnapshot(); setNotice("Saved."); })} className="rounded border px-3 py-1 disabled:opacity-50">{busy ? "Working…" : "Save"}</button>
      <button type="button" aria-label="Publish figure" disabled={!ready || busy || loaded?.readOnly || liveCount === 0} onClick={() => void perform(publish)} className="rounded border px-3 py-1 disabled:opacity-50">Publish</button>
      <button type="button" disabled={busy} onClick={close} className="rounded border px-3 py-1 disabled:opacity-50">Close editor</button>
    </header>
    {changedElsewhere ? <p role="status" data-aof-changed-elsewhere="" className="flex flex-wrap items-center gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-950">
      <span>{CHANGED_ELSEWHERE}</span>
      <button type="button" disabled={reloading} onClick={() => streamDispatch.current({ type: "reload" })} className="rounded border border-amber-900/30 px-3 py-0.5 disabled:opacity-50">{reloading ? "Reloading…" : "Reload"}</button>
    </p> : null}
    {!loaded && !error ? <p className="px-4 py-2 text-sm">Loading the diagram…</p> : null}
    {loaded && ready && liveCount === 0 && !loaded.readOnly ? <p className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-950">This diagram is empty. Request a first draft from the ADR in the panel, draw it, or drag items in from your libraries.</p> : null}
    {error ? <p role="alert" className="border-b px-4 py-2 text-sm text-red-700">{error} Your canvas has not been replaced.</p> : null}
    {notice ? <p role="status" data-aof-editor-notice="" className="border-b px-4 py-1 text-xs text-muted-foreground">{notice}</p> : null}
    {view ? <div className="shrink-0 border-b px-4 py-2 text-xs"><p className="text-muted-foreground">What the architect reads (unsaved shapes get their ids on save):</p><textarea aria-label="Mermaid view" readOnly value={view} className="mt-1 h-28 w-full rounded border p-2 font-mono text-xs" /><button type="button" onClick={() => setView(null)} className="rounded border px-2 py-0.5">Hide</button></div> : null}
    <div className="relative flex min-h-0 flex-1" style={{ minHeight: "40vh" }}>
      {loaded ? <div className="min-h-0 min-w-0 flex-1"><Excalidraw
        initialData={{ elements: loaded.scene.elements as never, appState: { viewBackgroundColor: "#ffffff", ...loaded.scene.appState, ...canvasDefaults(loaded.palette as never) }, files: loaded.scene.files as never, libraryItems: libraryItems as never, scrollToContent: true }}
        viewModeEnabled={loaded.readOnly}
        validateEmbeddable={() => false}
        excalidrawAPI={(value) => { api.current = value; setCanvasApi(value); setReady(true); }}
        onChange={remember}
        UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false } }}
      ><CanvasOverlay api={canvasApi} readOnly={loaded.readOnly} onAsk={askAtSelection} threads={conversation.threads as never} openKey={openKey} onOpenThread={openThread} />
        <LibrarySearchSidebar api={canvasApi} libraries={libraries} libraryItems={libraryItems} /></Excalidraw></div> : <div className="min-w-0 flex-1" />}
      <ConversationPanel<ReviewRequest, ReviewProposal>
        conversation={conversation} openKey={openKey} onOpen={openThread}
        collapsed={panelCollapsed} onCollapse={setPanelCollapsed}
        selectionLabel={selected} readOnly={loaded?.readOnly ?? true} ready={ready} busy={busy} loading={!reviewRead} error={reviewError}
        session={sessionChip(live)} batchLine={batchLine(live)}
        waiting={notes.length} canFirstDraft={Boolean(loaded && ready && !loaded.readOnly && liveCount === 0)}
        notice={null} invocation={invocation} previewNote={previewNote}
        onAsk={askFromPanel} onSaveNote={noteFromPanel}
        onReviewNotes={() => void perform(reviewNotes)} onFirstDraft={() => void perform(firstDraft)}
        onAskAgain={(requestId: string) => void perform(() => askAgain(requestId))}
        onReply={(target: ConversationNote<ReviewRequest, ReviewProposal>, text: string) => replyInThread(target, text)}
        onWithdraw={(target: ConversationNote<ReviewRequest, ReviewProposal>) => void perform(() => withdraw(target))}
        onShowOnCanvas={showOnCanvas} onPreview={preview}
        onAccept={(proposal: ReviewProposal) => performFor(() => accept(proposal))}
        onReject={(proposal: ReviewProposal, reason: string) => performFor(() => reject(proposal, reason))}
        onCopyCommand={copyCommand} />
    </div>
  </section>;
}
