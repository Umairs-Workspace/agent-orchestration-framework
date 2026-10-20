import { useCallback, useEffect, useRef, useState } from "react";
import { CaptureUpdateAction, Excalidraw, restoreElements, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { POLL_MS, describeCounts, describeError, diagramReviewInvocation, pendingProposals, sceneFileName, sceneFingerprint, selectionFor, shouldPoll, touchedIds } from "./editor-state.mjs";

type Scene = { type: "excalidraw"; version: 2; elements: unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> };
type SceneResponse = { ref: string; file: string; present: boolean; revision: string | null; scene: Scene; readOnly: boolean };

type ReviewRequest = { id: string; request: string; status: string; answer: string | null };
type ReviewProposal = { id: string; summary: string; rationale: string; status: string; operations: Array<{ op: string; id?: string; element?: { id?: string } }>; reason?: string | null };
type ReviewList = { requests: ReviewRequest[]; proposals: ReviewProposal[] };

class ApiError extends Error {
  code: string | null;
  constructor(message: string, code: string | null) { super(message); this.code = code; }
}
async function jsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) throw new ApiError(body.error ?? `Request failed (${response.status})`, body.code ?? null);
  return body as T;
}
const failure = (reason: unknown) => reason instanceof ApiError ? describeError(reason.code, reason.message) : reason instanceof Error ? reason.message : "Draft operation failed";
const ARCHITECT_NOTICE = "Architect session started in the board's terminal dock (behind this fullscreen view). Proposals appear below.";

// This module is loaded only when the operator opens the editor. The SDK owns editing;
// AOF owns draft persistence. A scene save deliberately never publishes an ADR diagram.
export function ExcalidrawEditor({ itemRef, svgFile, onRequestClose, onAskArchitect }: { itemRef: string; svgFile: string; onRequestClose: () => void; onAskArchitect?: (invocation: string) => void }) {
  const file = sceneFileName(svgFile);
  const url = `/api/diagram/scene?ref=${encodeURIComponent(itemRef)}&file=${encodeURIComponent(file)}`;
  const [loaded, setLoaded] = useState<SceneResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState<string | null>(null);
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const revision = useRef<string | null>(null);
  const current = useRef<Scene | null>(null);
  const baseline = useRef<string | null>(null);
  const busyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [invocation, setInvocation] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewList>({ requests: [], proposals: [] });
  const [reviewOpen, setReviewOpen] = useState(true);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [previewNote, setPreviewNote] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal }).then(jsonResponse<SceneResponse>).then((answer) => {
      revision.current = answer.revision;
      setLoaded(answer);
    }).catch((reason: Error) => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [url]);

  // Native SDK serialization strips transient state (selection, collaborators, dialogs).
  // Compare document content, not onChange counts: pan/zoom/selection are not edits.
  const remember = useCallback((elements: Parameters<typeof serializeAsJSON>[0], appState: Parameters<typeof serializeAsJSON>[1], files: Parameters<typeof serializeAsJSON>[2]) => {
    const scene = JSON.parse(serializeAsJSON(elements, appState, files, "local")) as Scene;
    current.current = scene;
    const fingerprint = sceneFingerprint(scene);
    if (baseline.current === null) baseline.current = fingerprint;
    setDirty(fingerprint !== baseline.current);
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const post = async <T,>(body: Record<string, unknown>) => fetch(url, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, ref: itemRef, file }),
  }).then(jsonResponse<T>);

  const refreshReview = useCallback(async () => {
    try {
      const answer = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "proposals", ref: itemRef, file }) }).then(jsonResponse<ReviewList>);
      setReview({ requests: answer.requests ?? [], proposals: answer.proposals ?? [] });
      setReviewError(null);
    } catch (reason) { setReviewError(failure(reason)); }
  }, [url, itemRef, file]);

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

  const saveSnapshot = async () => {
    if (loaded?.readOnly || current.current === null) throw new Error("The editable scene is not ready.");
    const snapshot = current.current;
    const answer = await post<SceneResponse>({ action: "save", baseRevision: revision.current, scene: snapshot });
    revision.current = answer.revision;
    baseline.current = sceneFingerprint(snapshot);
    // Do not reload initialData after a save: newer in-canvas edits must survive the response.
    setLoaded((prior) => prior && ({ ...prior, present: true, revision: answer.revision }));
    setDirty(sceneFingerprint(current.current) !== baseline.current);
    return answer;
  };
  const perform = async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try { await operation(); }
    catch (reason) { setError(failure(reason)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const prepare = async () => {
    if (!question.trim()) throw new Error("Enter a question or requested change first.");
    if (dirty || !loaded?.present) await saveSnapshot();
    const selectedIds = Object.entries(api.current?.getAppState().selectedElementIds ?? {}).filter(([, selected]) => selected).map(([id]) => id);
    const answer = await post<Record<string, unknown>>({ action: "context", selectedIds, request: question.trim() });
    if (answer.revision !== revision.current || sceneFingerprint(current.current) !== baseline.current) {
      throw new Error("The scene changed while context was prepared. Save and prepare it again.");
    }
    setContext(JSON.stringify(answer, null, 2));
  };
  const selectedIdsNow = () => Object.entries(api.current?.getAppState().selectedElementIds ?? {}).filter(([, selected]) => selected).map(([id]) => id);
  const ask = async () => {
    if (!question.trim()) throw new Error("Enter a question or requested change first.");
    if (dirty || !loaded?.present) await saveSnapshot();
    setNotice(null); setInvocation(null);
    const answer = await post<{ request?: { id?: string } }>({ action: "request", baseRevision: revision.current, selectedIds: selectedIdsNow(), request: question.trim() });
    const command = answer.request?.id ? diagramReviewInvocation(itemRef, file, answer.request.id) : null;
    if (command && onAskArchitect) { onAskArchitect(command); setNotice(ARCHITECT_NOTICE); }
    else if (command) { setInvocation(command); setNotice("Request recorded. Run this command in your architect session."); }
    await refreshReview();
  };
  const preview = (proposal: ReviewProposal) => {
    const existing = touchedIds(proposal, { existingOnly: true });
    if (existing.length === 0) { setPreviewNote("This proposal only adds new elements; there is nothing existing to highlight."); return; }
    const all = (api.current?.getSceneElements() ?? []) as Parameters<NonNullable<typeof api.current>["scrollToContent"]>[0];
    const targets = (all as unknown as Array<{ id: string }>).filter((element) => existing.includes(element.id));
    api.current?.updateScene({ appState: { selectedElementIds: selectionFor(existing) } as never });
    if (targets.length) api.current?.scrollToContent(targets as never, { fitToContent: true });
    const missing = existing.length - targets.length;
    setPreviewNote(`Highlighted ${targets.length} element${targets.length === 1 ? "" : "s"}${touchedIds(proposal).length > existing.length ? "; new elements appear after you accept" : ""}${missing ? `; ${missing} no longer on the canvas` : ""}.`);
  };
  const accept = async (proposal: ReviewProposal) => {
    if (dirty) await saveSnapshot();
    setNotice(null);
    try {
      const answer = await post<SceneResponse>({ action: "accept", proposalId: proposal.id, baseRevision: revision.current });
      // Agent-authored elements may omit SDK defaults; restore them (and repair bindings)
      // exactly as an import would, then fingerprint what the canvas actually holds.
      const restored = restoreElements(answer.scene.elements as never, null, { repairBindings: true });
      api.current?.updateScene({ elements: restored, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
      revision.current = answer.revision;
      const live = api.current;
      const canvas = live ? JSON.parse(serializeAsJSON(live.getSceneElements(), live.getAppState(), live.getFiles(), "local")) as Scene : answer.scene;
      current.current = canvas;
      baseline.current = sceneFingerprint(canvas);
      setLoaded((prior) => prior && ({ ...prior, present: true, revision: answer.revision }));
      setDirty(false);
      setNotice("Proposal accepted and saved to the draft.");
    } finally { await refreshReview(); }
  };
  const reject = async (proposal: ReviewProposal) => {
    try {
      await post({ action: "reject", proposalId: proposal.id, ...(reason.trim() ? { reason: reason.trim() } : {}) });
      setRejecting(null); setReason(""); setNotice("Proposal rejected.");
    } finally { await refreshReview(); }
  };
  const close = () => { if (!busy && (!dirty || window.confirm("Discard unsaved draft edits?"))) onRequestClose(); };

  return <section className="flex min-h-0 flex-1 flex-col bg-background" aria-label="Excalidraw architecture draft">
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs">
      <strong>{file}</strong>
      <span role="status">{loaded?.readOnly ? "Read-only" : dirty ? "Unsaved draft" : loaded?.present ? "Saved draft — not approved" : "New draft — not saved"}</span>
      <button type="button" disabled={!ready || busy || loaded?.readOnly} onClick={() => void perform(async () => { await saveSnapshot(); })} className="ml-auto rounded border px-3 py-1 disabled:opacity-50">{busy ? "Working…" : "Save draft"}</button>
      <button type="button" disabled={busy} onClick={close} className="rounded border px-3 py-1 disabled:opacity-50">Close editor</button>
    </header>
    {!loaded && !error ? <p className="px-4 py-2 text-sm">Loading native draft…</p> : null}
    {loaded && !loaded.present ? <p className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-950">No native scene exists. This is an empty canvas, not a conversion of the SVG. Import a native .excalidraw scene or draw a draft.</p> : null}
    {error ? <p role="alert" className="border-b px-4 py-2 text-sm text-red-700">{error} Your canvas has not been replaced. On a revision conflict, export your drawing before reopening the latest saved draft.</p> : null}
    <p className="px-4 py-1 text-xs text-muted-foreground">Draft saves do not update the ADR or its SVG preview. Asking the architect records a request for a terminal session; nothing is applied until you accept a proposal.</p>
    {loaded ? <div className="min-h-0 flex-1" style={{ minHeight: "40vh" }}><Excalidraw
      initialData={loaded.scene as unknown as Parameters<typeof Excalidraw>[0]["initialData"]}
      viewModeEnabled={loaded.readOnly}
      validateEmbeddable={() => false}
      excalidrawAPI={(value) => { api.current = value; setReady(true); }}
      onChange={remember}
      UIOptions={{ canvasActions: { loadScene: !loaded.readOnly, saveToActiveFile: false } }}
    /></div> : null}

    <section className="shrink-0 border-t border-border px-4 py-2 text-xs" aria-label="Architect review">
      <div className="flex items-center gap-2"><strong>Review</strong>
        <span className="text-muted-foreground">{pendingProposals(review.proposals).length} pending proposal{pendingProposals(review.proposals).length === 1 ? "" : "s"}</span>
        <button type="button" aria-expanded={reviewOpen} aria-label={reviewOpen ? "Collapse review panel" : "Expand review panel"} onClick={() => setReviewOpen((value) => !value)} className="ml-auto rounded border px-2 py-0.5">{reviewOpen ? "Collapse" : "Expand"}</button></div>
      {reviewOpen ? <div className="mt-2 max-h-48 space-y-2 overflow-auto">
        {reviewError ? <p role="alert" className="text-red-700">{reviewError}</p> : null}
        {previewNote ? <p role="status">{previewNote}</p> : null}
        {review.requests.length === 0 && review.proposals.length === 0 ? <p className="text-muted-foreground">No architect requests yet.</p> : null}
        {review.requests.length ? <div><h3 className="font-semibold">Requests</h3><ul className="space-y-1">{review.requests.slice(0, 10).map((item) => <li key={item.id} className="rounded border px-2 py-1"><span className="font-medium">{item.request}</span> <span className="text-muted-foreground">— {item.status}</span>{item.answer ? <p className="mt-1 whitespace-pre-wrap">{item.answer}</p> : null}</li>)}</ul></div> : null}
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
      <label className="text-xs" htmlFor="architect-request">Question or requested change about selected elements (no selection means the whole scene)</label>
      <div className="mt-1 flex gap-2"><input id="architect-request" value={question} maxLength={10000} onChange={(event) => setQuestion(event.target.value)} className="min-w-0 flex-1 rounded border px-2 py-1 text-sm" placeholder="Why does this service write directly to the database?" />
                <button type="button" aria-label="Ask architect" disabled={!ready || busy || !question.trim() || loaded?.readOnly} onClick={() => void perform(ask)} className="rounded border px-3 py-1 text-xs disabled:opacity-50">Ask architect</button>
        {onAskArchitect ? null : <button type="button" disabled={!ready || busy || !question.trim() || (loaded?.readOnly && !loaded.present)} onClick={() => void perform(prepare)} className="rounded border px-3 py-1 text-xs disabled:opacity-50">Prepare architect context</button>}</div>
      {notice ? <p role="status" className="mt-2 text-xs">{notice}</p> : null}
      {invocation ? <div className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded border px-2 py-1 text-xs" aria-label="Architect command">{invocation}</code>
        <button type="button" aria-label="Copy architect command" onClick={() => void navigator.clipboard.writeText(invocation).catch(() => setError("Clipboard unavailable; select and copy the command manually."))} className="rounded border px-2 py-1 text-xs">Copy command</button></div> : null}
      {context ? <div className="mt-2"><p className="text-xs">Copy this context to your architect session. It has not been sent automatically.</p><textarea aria-label="Architect context JSON" readOnly value={context} className="mt-1 h-24 w-full rounded border p-2 font-mono text-xs" />
        <button type="button" onClick={() => void navigator.clipboard.writeText(context).catch(() => setError("Clipboard unavailable; select and copy the JSON manually."))} className="rounded border px-2 py-1 text-xs">Copy context</button></div> : null}
    </div>
  </section>;
}
