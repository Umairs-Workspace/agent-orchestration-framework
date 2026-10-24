import { useCallback, useEffect, useRef, useState } from "react";
import { CaptureUpdateAction, Excalidraw, convertToExcalidrawElements, exportToBlob, exportToSvg, restoreElements, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { parseProfile } from "@aof/diagrams/mermaid-profile";
import { projectScene, sceneView, selectionIds } from "@aof/diagrams/scene-view";
import { compileProposal, firstDraftSkeletons, libraryItemsFor, operationsFor } from "./compile.mjs";
import { POLL_MS, describeCounts, describeError, diagramReviewInvocation, openNotes, pendingProposals, sceneFileName, sceneFingerprint, selectionFor, shouldPoll, touchedIds } from "./editor-state.mjs";

// THE EDITOR (milestone 170, ADR-010..ADR-013). The diagram is stored as Excalidraw's own scene, so
// this canvas IS the diagram: anything can be drawn, and your project's libraries are in the Library
// panel. The architect reads the scene as Mermaid and proposes edited Mermaid; Accept compiles the
// proposal's changes into element edits here and the server applies them, refusing whatever you
// changed since. Publish exports the figure the ADR shows from this same canvas.

type Scene = { type: "excalidraw"; version: 2; elements: CanvasElement[]; appState: Record<string, unknown>; files: Record<string, unknown> };
type SceneResponse = { ref: string; file: string; present: boolean; revision: string | null; scene: Scene; readOnly: boolean; assigned?: Record<string, string> };
type LibraryEntry = { library: string; item: string; id: string; elements: CanvasElement[] };
type ReviewRequest = { id: string; request: string; status: string; answer: string | null; selectedIds?: string[] };
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

export function ExcalidrawEditor({ itemRef, svgFile, onRequestClose, onAskArchitect }: { itemRef: string; svgFile: string; onRequestClose: () => void; onAskArchitect?: (invocation: string) => void }) {
  const file = sceneFileName(svgFile);
  const url = `/api/diagram/scene?ref=${encodeURIComponent(itemRef)}&file=${encodeURIComponent(file)}`;
  const [loaded, setLoaded] = useState<SceneResponse | null>(null);
  const [libraries, setLibraries] = useState<LibraryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  // The revision this session published, if any: whether an earlier session published it is not known.
  const [publishedRevision, setPublishedRevision] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const revision = useRef<string | null>(null);
  const baseline = useRef<string | null>(null);
  const busyRef = useRef(false);
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
    setDirty(fingerprint !== baseline.current);
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

  useEffect(() => {
    if (!loaded) return undefined;
    let timer: ReturnType<typeof setInterval> | null = null;
    const sync = () => {
      if (timer) { clearInterval(timer); timer = null; }
      if (shouldPoll({ open: true, visible: document.visibilityState !== "hidden" })) {
        void refreshReview();
        timer = setInterval(() => void refreshReview(), POLL_MS);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => { document.removeEventListener("visibilitychange", sync); if (timer) clearInterval(timer); };
  }, [loaded, refreshReview]);

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
    setDirty(false);
    return answer;
  };
  const perform = async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try { await operation(); }
    catch (reason) { setError(failure(reason)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const selectedIdsNow = () => selectionIds(api.current?.getSceneElements() as never ?? [], api.current?.getAppState().selectedElementIds as never);
  // A NOTE: recorded, and NOTHING is launched. Notes wait in the panel until a review session — the
  // batch `/aof:diagram-review <ref> <file>` from any Claude session, or Review notes below — examines them.
  const recordRequest = async (text: string) => {
    if (dirty || !loaded?.present) await saveSnapshot();
    const answer = await post<{ request?: { id?: string } }>({ action: "request", baseRevision: revision.current, selectedIds: selectedIdsNow(), request: text });
    return answer.request?.id ?? null;
  };
  const launch = (command: string) => {
    if (onAskArchitect) { onAskArchitect(command); setNotice(ARCHITECT_NOTICE); }
    else { setInvocation(command); setNotice("Run this command in your architect session."); }
  };
  const note = async () => {
    if (!question.trim()) throw new Error("Enter a note first.");
    setNotice(null); setInvocation(null);
    await recordRequest(question.trim());
    setQuestion("");
    setNotice(`Note recorded. Run ${diagramReviewInvocation(itemRef, file)} in a Claude session, or Review notes, to have the architect examine it.`);
    await refreshReview();
  };
  const ask = async () => {
    if (!question.trim()) throw new Error("Enter a question or requested change first.");
    setNotice(null); setInvocation(null);
    const id = await recordRequest(question.trim());
    if (id) { launch(diagramReviewInvocation(itemRef, file, id)); setQuestion(""); }
    await refreshReview();
  };
  const reviewNotes = async () => { setNotice(null); setInvocation(null); launch(diagramReviewInvocation(itemRef, file)); };
  const firstDraft = async () => {
    setNotice(null); setInvocation(null);
    const id = await recordRequest(FIRST_DRAFT_REQUEST);
    if (id) launch(diagramReviewInvocation(itemRef, file, id));
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
      setDirty(false);
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
  return <section className="flex min-h-0 flex-1 flex-col bg-background" aria-label="Excalidraw architecture diagram">
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs">
      <strong>{file}</strong>
      <span role="status">{loaded?.readOnly ? "Read-only" : dirty ? "Unsaved changes" : !loaded?.present ? "New diagram — not saved" : publishedRevision && publishedRevision === loaded.revision ? "Saved and published" : "Saved"}</span>
      <button type="button" disabled={!ready || busy || loaded?.readOnly} onClick={() => void perform(async () => { await saveSnapshot(); setNotice("Saved."); })} className="ml-auto rounded border px-3 py-1 disabled:opacity-50">{busy ? "Working…" : "Save"}</button>
      <button type="button" aria-label="Publish figure" disabled={!ready || busy || loaded?.readOnly || liveCount === 0} onClick={() => void perform(publish)} className="rounded border px-3 py-1 disabled:opacity-50">Publish</button>
      <button type="button" disabled={busy} onClick={close} className="rounded border px-3 py-1 disabled:opacity-50">Close editor</button>
    </header>
    {!loaded && !error ? <p className="px-4 py-2 text-sm">Loading the diagram…</p> : null}
    {loaded && ready && liveCount === 0 && !loaded.readOnly ? <p className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-950">This diagram is empty. Request a first draft from the ADR below, draw it, or drag items in from your libraries.</p> : null}
    {error ? <p role="alert" className="border-b px-4 py-2 text-sm text-red-700">{error} Your canvas has not been replaced.</p> : null}
    <p className="px-4 py-1 text-xs text-muted-foreground">Save keeps the drawing; Publish writes the figure the ADR shows. The architect reads it as Mermaid — a note waits for a review session, Ask architect starts one now. Nothing changes until you accept a proposal.</p>
    {loaded ? <div className="min-h-0 flex-1" style={{ minHeight: "40vh" }}><Excalidraw
      initialData={{ elements: loaded.scene.elements as never, appState: { viewBackgroundColor: "#ffffff", ...loaded.scene.appState }, files: loaded.scene.files as never, libraryItems: libraryItemsFor(libraries) as never, scrollToContent: true }}
      viewModeEnabled={loaded.readOnly}
      validateEmbeddable={() => false}
      excalidrawAPI={(value) => { api.current = value; setReady(true); }}
      onChange={remember}
      UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false } }}
    /></div> : null}

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
