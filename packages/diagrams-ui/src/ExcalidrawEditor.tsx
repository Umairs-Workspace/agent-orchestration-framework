import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaptureUpdateAction, Excalidraw, convertToExcalidrawElements, exportToBlob, exportToSvg, restoreElements, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { canvasDefaults } from "@aof/diagrams/house-style";
import { parseProfile } from "@aof/diagrams/mermaid-profile";
import { projectScene, sceneView, selectionIds } from "@aof/diagrams/scene-view";
import { compileProposal, firstDraftSkeletons, libraryItemsFor, operationsFor } from "./compile.mjs";
import { CanvasOverlay } from "./CanvasOverlay";
import { LibrarySearchSidebar } from "./LibrarySearch";
import { replyToNote } from "./note-threads.mjs";
import type { ThreadNote } from "./note-threads.mjs";
import { CANVAS_UPDATED, CHANGED_ELSEWHERE, STREAM_INITIAL, streamStep } from "./review-stream.mjs";
import type { StreamEvent, StreamState } from "./review-stream.mjs";
import { POLL_MS, askArchitect, reviewInvocations, describeCounts, describeError, diagramReviewInvocation, openNotes, pendingProposals, sceneFileName, sceneFingerprint, selectionFor, shouldPoll, touchedIds } from "./editor-state.mjs";

// THE EDITOR (milestone 170, ADR-010..ADR-013). The diagram is stored as Excalidraw's own scene, so
// this canvas IS the diagram: anything can be drawn, and your project's libraries are in the Library
// panel. The architect reads the scene as Mermaid and proposes edited Mermaid; Accept compiles the
// proposal's changes into element edits here and the server applies them, refusing whatever you
// changed since. Publish exports the figure the ADR shows from this same canvas.

type Scene = { type: "excalidraw"; version: 2; elements: CanvasElement[]; appState: Record<string, unknown>; files: Record<string, unknown> };
type SceneResponse = { ref: string; file: string; present: boolean; revision: string | null; scene: Scene; readOnly: boolean; assigned?: Record<string, string>; palette?: Record<string, string> | null };
type LibraryEntry = { library: string; item: string; id: string; elements: CanvasElement[] };
type ReviewRequest = { id: string; request: string; status: string; answer: string | null; selectedIds?: string[]; createdAt?: string; thread?: ThreadNote["thread"] };
type ReviewProposal = { id: string; requestId?: string; summary: string; rationale: string; status: string; text?: string; changes?: Array<{ key: string; change: string }>; reason?: string | null };
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
const ARCHITECT_NOTICE = "Architect session started in the dock below the canvas. Answers and proposals appear in the review panel.";
const SENT_NOTICE = "Sent to the architect's session in the dock. Answers and proposals appear in the review panel.";
const NOTE_SENT = "Note recorded and sent to the architect's session in the dock.";
const NOTE_NOT_RUNNING = "Note recorded. The architect session in the dock is not running — Review notes starts one.";
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

type Delivery = "typed" | "started" | "waiting" | "not-running";

export function ExcalidrawEditor({ itemRef, svgFile, onRequestClose, onDeliver }: { itemRef: string; svgFile: string; onRequestClose: () => void; onDeliver?: (invocations: string[], kind: "ask" | "note") => Delivery }) {
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
  const [question, setQuestion] = useState("");
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
  const [block, setBlock] = useState<string | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewList>({ requests: [], proposals: [] });
  const [reviewOpen, setReviewOpen] = useState(true);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [previewNote, setPreviewNote] = useState<string | null>(null);
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
  }, [isLoaded, itemRef, file, refreshReview, reloadSaved]);
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
  // DELIVERY (171/ADR-005): the surface types into the architect's running session, starts one, or
  // lets a note wait — its one decision. With no surface to deliver through, the command is shown to copy.
  const waitingNotes = () => openNotes(review.requests).length;
  const deliverAsk = (invocations: string[]) => {
    if (!onDeliver) { setInvocation(invocations[0]); setNotice("Run this command in your architect session."); return; }
    setNotice(onDeliver(invocations, "ask") === "typed" ? SENT_NOTICE : ARCHITECT_NOTICE);
  };
  // A question's own invocation, then the batch when other notes wait (171/04 Q1).
  const launch = (_command: string, requestId: string) => deliverAsk(reviewInvocations({ ref: itemRef, file, requestId, waiting: waitingNotes() }));
  const note = async () => {
    if (!question.trim()) throw new Error("Enter a note first.");
    setNotice(null); setInvocation(null);
    const id = await recordRequest(question.trim());
    setQuestion("");
    const outcome = id && onDeliver ? onDeliver(reviewInvocations({ ref: itemRef, file, requestId: id }), "note") : "waiting";
    setNotice(outcome === "typed" ? NOTE_SENT : outcome === "not-running" ? NOTE_NOT_RUNNING
      : `Note recorded. Run ${diagramReviewInvocation(itemRef, file)} in a Claude session, or Review notes, to have the architect examine it.`);
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
    await refreshReview();
    return id;
  };
  const selectedElementIds = () => { const ids = api.current?.getAppState().selectedElementIds ?? {}; return Object.keys(ids).filter((id) => ids[id]); };
  const ask = async () => { if (await askAt(question, selectedElementIds())) setQuestion(""); };
  const askAtSelection = async (text: string, elementIds: string[]) => {
    if (busyRef.current) throw new Error("The editor is busy; try again in a moment.");
    busyRef.current = true; setBusy(true); setError(null);
    try { if (!await askAt(text, elementIds)) throw new Error("The request was not recorded."); }
    catch (reason) { throw new Error(failure(reason)); }
    finally { busyRef.current = false; setBusy(false); afterWrite(); }
  };
  const reviewNotes = async () => { setNotice(null); setInvocation(null); deliverAsk(reviewInvocations({ ref: itemRef, file })); };
  // A REPLY in a note's thread beside its shape (171/ADR-006): recorded on the note, then delivered as
  // a note is — typed into the architect's running session, or left to wait (ADR-005).
  const replyInThread = async (note: ThreadNote, text: string) => {
    const outcome = await replyToNote({
      requestId: note.id, text, record: (reply) => post({ action: "reply", ...reply }),
      deliver: onDeliver ? (invocations) => onDeliver(invocations, "note") : null,
      invocations: (requestId) => reviewInvocations({ ref: itemRef, file, requestId }),
    });
    await refreshReview();
    return outcome === "typed" ? "Sent to the architect's session." : "Reply recorded — it waits for a review session.";
  };
  const firstDraft = async () => {
    setNotice(null); setInvocation(null);
    const id = await recordRequest(FIRST_DRAFT_REQUEST);
    if (id) launch("", id);
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
      setNotice("Proposal accepted and saved to the diagram.");
    } finally { await refreshReview(); }
  };
  const reject = async (proposal: ReviewProposal) => {
    try {
      await post({ action: "reject", proposalId: proposal.id, ...(reason.trim() ? { reason: reason.trim() } : {}) });
      setRejecting(null); setReason(""); setNotice("Proposal rejected.");
    } finally { await refreshReview(); }
  };
  // PUBLISH: the SVG — and a PNG, written when the project owes one — exported from this canvas, written
  // where the ADR links them. The answer is the block the architect pastes.
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
    const answer = await post<{ written: string[]; block: string; revision: string }>({ action: "publish", baseRevision: revision.current, svg, png });
    setPublishedRevision(answer.revision);
    setBlock(answer.block);
    setNotice(`Published ${answer.written.join(" and ")}. The ADR shows the new figure; paste the block below under the ADR if it is not linked yet.`);
  };
  const showView = () => setView(sceneView((api.current?.getSceneElements() ?? []) as never));
  const close = () => { if (!busy && (!dirty || window.confirm("Discard unsaved diagram edits?"))) onRequestClose(); };

  const notes = openNotes(review.requests);
  // The column scrolls: with the architect's dock open the shell's box is shorter than the canvas,
  // panel and bar together, and the bar is where a note is added to that open session (171/04).
  return <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background" aria-label="Excalidraw architecture diagram">
    <header className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2 text-xs">
      <strong>{file}</strong>
      <span role="status">{loaded?.readOnly ? "Read-only" : dirty ? "Unsaved changes" : canvasNote ? canvasNote : !loaded?.present ? "New diagram — not saved" : publishedRevision && publishedRevision === loaded.revision ? "Saved and published" : "Saved"}</span>
      <button type="button" disabled={!ready || busy || loaded?.readOnly} onClick={() => void perform(async () => { await saveSnapshot(); setNotice("Saved."); })} className="ml-auto rounded border px-3 py-1 disabled:opacity-50">{busy ? "Working…" : "Save"}</button>
      <button type="button" aria-label="Publish figure" disabled={!ready || busy || loaded?.readOnly || liveCount === 0} onClick={() => void perform(publish)} className="rounded border px-3 py-1 disabled:opacity-50">Publish</button>
      <button type="button" disabled={busy} onClick={close} className="rounded border px-3 py-1 disabled:opacity-50">Close editor</button>
    </header>
    {changedElsewhere ? <p role="status" data-aof-changed-elsewhere="" className="flex flex-wrap items-center gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-950">
      <span>{CHANGED_ELSEWHERE}</span>
      <button type="button" disabled={reloading} onClick={() => streamDispatch.current({ type: "reload" })} className="rounded border border-amber-900/30 px-3 py-0.5 disabled:opacity-50">{reloading ? "Reloading…" : "Reload"}</button>
    </p> : null}
    {!loaded && !error ? <p className="px-4 py-2 text-sm">Loading the diagram…</p> : null}
    {loaded && ready && liveCount === 0 && !loaded.readOnly ? <p className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-950">This diagram is empty. Request a first draft from the ADR below, draw it, or drag items in from your libraries.</p> : null}
    {error ? <p role="alert" className="border-b px-4 py-2 text-sm text-red-700">{error} Your canvas has not been replaced.</p> : null}
    <p className="px-4 py-1 text-xs text-muted-foreground">Save keeps the drawing; Publish writes the figure the ADR shows. The architect reads it as Mermaid — a note waits for a review session, Ask architect starts one now. Nothing changes until you accept a proposal.</p>
    {loaded ? <div className="min-h-0 flex-1" style={{ minHeight: "40vh" }}><Excalidraw
      initialData={{ elements: loaded.scene.elements as never, appState: { viewBackgroundColor: "#ffffff", ...loaded.scene.appState, ...canvasDefaults(loaded.palette as never) }, files: loaded.scene.files as never, libraryItems: libraryItems as never, scrollToContent: true }}
      viewModeEnabled={loaded.readOnly}
      validateEmbeddable={() => false}
      excalidrawAPI={(value) => { api.current = value; setCanvasApi(value); setReady(true); }}
      onChange={remember}
      UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false } }}
    ><CanvasOverlay api={canvasApi} readOnly={loaded.readOnly} onAsk={askAtSelection} notes={review.requests} onReply={replyInThread} />
      <LibrarySearchSidebar api={canvasApi} libraries={libraries} libraryItems={libraryItems} /></Excalidraw></div> : null}

    <section className="shrink-0 border-t border-border px-4 py-2 text-xs" aria-label="Architect review">
      <div className="flex items-center gap-2"><strong>Review</strong>
        <span className="text-muted-foreground">{pendingProposals(review.proposals).length} pending proposal{pendingProposals(review.proposals).length === 1 ? "" : "s"}</span>
        <button type="button" aria-label="Show the Mermaid view" disabled={!ready} onClick={showView} className="ml-auto rounded border px-2 py-0.5">Mermaid view</button>
        <button type="button" aria-expanded={reviewOpen} aria-label={reviewOpen ? "Collapse review panel" : "Expand review panel"} onClick={() => setReviewOpen((value) => !value)} className="rounded border px-2 py-0.5">{reviewOpen ? "Collapse" : "Expand"}</button></div>
      {view ? <div className="mt-2"><p className="text-muted-foreground">What the architect reads (unsaved shapes get their ids on save):</p><textarea aria-label="Mermaid view" readOnly value={view} className="mt-1 h-28 w-full rounded border p-2 font-mono text-xs" /><button type="button" onClick={() => setView(null)} className="rounded border px-2 py-0.5">Hide</button></div> : null}
      {reviewOpen ? <div className="mt-2 max-h-48 space-y-2 overflow-auto">
        {reviewError ? <p role="alert" className="text-red-700">{reviewError}</p> : null}
        {previewNote ? <p role="status">{previewNote}</p> : null}
        {review.requests.length === 0 && review.proposals.length === 0 ? <p className="text-muted-foreground">No notes or requests yet.</p> : null}
        {review.requests.length ? <div><h3 className="font-semibold">Notes and requests</h3>
          <p className="text-muted-foreground">{notes.length} open note{notes.length === 1 ? "" : "s"}</p>
          <ul className="space-y-1">{review.requests.slice(0, 10).map((item) => <li key={item.id} className="rounded border px-2 py-1">
            <span className="font-medium">{item.request}</span> <span className="text-muted-foreground">— {item.status}{item.selectedIds?.length ? ` · ${item.selectedIds.join(", ")}` : " · whole diagram"}</span>
            {item.status === "open" && !loaded?.readOnly ? <button type="button" aria-label={`Withdraw note: ${item.request}`} disabled={busy} onClick={() => void perform(() => withdraw(item))} className="ml-2 rounded border px-2 py-0.5 disabled:opacity-50">Withdraw</button> : null}
            {item.answer ? <p className="mt-1 whitespace-pre-wrap">{item.answer}</p> : null}</li>)}</ul></div> : null}
        {review.proposals.length ? <div><h3 className="font-semibold">Proposals</h3><ul className="space-y-1">{review.proposals.slice(0, 10).map((item) => <li key={item.id} className="rounded border px-2 py-1">
          <p><span className="font-medium">{item.summary}</span> <span className="text-muted-foreground">— {item.status} · {describeCounts(item)}</span></p>
          {item.rationale ? <p className="mt-1 whitespace-pre-wrap">{item.rationale}</p> : null}
          {item.reason ? <p className="mt-1 text-muted-foreground">Reason: {item.reason}</p> : null}
          {item.status === "pending" ? <div className="mt-1 flex flex-wrap items-center gap-2">
            <button type="button" aria-label={`Preview proposal: ${item.summary}`} disabled={!ready} onClick={() => preview(item)} className="rounded border px-2 py-0.5 disabled:opacity-50">Preview</button>
            <button type="button" aria-label={`Accept proposal: ${item.summary}`} disabled={!ready || busy || loaded?.readOnly} onClick={() => void perform(() => accept(item))} className="rounded border px-2 py-0.5 disabled:opacity-50">Accept</button>
            {rejecting === item.id ? <>
              <input aria-label="Rejection reason (optional)" value={reason} maxLength={2000} onChange={(event) => setReason(event.target.value)} className="min-w-0 flex-1 rounded border px-2 py-0.5" placeholder="Reason (optional)" />
              <button type="button" aria-label={`Confirm reject proposal: ${item.summary}`} disabled={busy || loaded?.readOnly} onClick={() => void perform(() => reject(item))} className="rounded border px-2 py-0.5 disabled:opacity-50">Confirm reject</button>
              <button type="button" onClick={() => { setRejecting(null); setReason(""); }} className="rounded border px-2 py-0.5">Cancel</button></> :
              <button type="button" aria-label={`Reject proposal: ${item.summary}`} disabled={busy || loaded?.readOnly} onClick={() => setRejecting(item.id)} className="rounded border px-2 py-0.5 disabled:opacity-50">Reject</button>}
          </div> : null}</li>)}</ul></div> : null}
      </div> : null}
    </section>
    <div className="shrink-0 border-t border-border px-4 py-2">
      <label className="text-xs" htmlFor="architect-request">Note, question or requested change about the selected shapes (no selection means the whole diagram)</label>
      <div className="mt-1 flex gap-2"><input id="architect-request" value={question} maxLength={10000} onChange={(event) => setQuestion(event.target.value)} className="min-w-0 flex-1 rounded border px-2 py-1 text-sm" placeholder="Why does this service write directly to the database?" />
        <button type="button" aria-label="Add note" disabled={!ready || busy || !question.trim() || loaded?.readOnly} onClick={() => void perform(note)} className="rounded border px-3 py-1 text-xs disabled:opacity-50">Add note</button>
        <button type="button" aria-label="Ask architect" disabled={!ready || busy || !question.trim() || loaded?.readOnly} onClick={() => void perform(ask)} className="rounded border px-3 py-1 text-xs disabled:opacity-50">Ask architect</button></div>
      <div className="mt-2 flex flex-wrap gap-2">
        {notes.length ? <button type="button" aria-label="Review notes" disabled={!ready || busy || loaded?.readOnly} onClick={() => void perform(reviewNotes)} className="rounded border px-3 py-1 text-xs disabled:opacity-50">Review {notes.length} note{notes.length === 1 ? "" : "s"} with the architect</button> : null}
        {loaded && ready && !loaded.readOnly && liveCount === 0 ? <button type="button" aria-label="Request a first draft" disabled={busy} onClick={() => void perform(firstDraft)} className="rounded border px-3 py-1 text-xs disabled:opacity-50">Request a first draft from the ADR</button> : null}
      </div>
      {notice ? <p role="status" className="mt-2 text-xs">{notice}</p> : null}
      {invocation ? <div className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded border px-2 py-1 text-xs" aria-label="Architect command">{invocation}</code>
        <button type="button" aria-label="Copy architect command" onClick={() => void navigator.clipboard.writeText(invocation).catch(() => setError("Clipboard unavailable; select and copy the command manually."))} className="rounded border px-2 py-1 text-xs">Copy command</button></div> : null}
      {block ? <div className="mt-2"><textarea aria-label="ADR diagram block" readOnly value={block} className="h-16 w-full rounded border p-2 font-mono text-xs" />
        <button type="button" onClick={() => void navigator.clipboard.writeText(block).catch(() => setError("Clipboard unavailable; select and copy the block manually."))} className="rounded border px-2 py-1 text-xs">Copy block</button></div> : null}
    </div>
  </section>;
}
