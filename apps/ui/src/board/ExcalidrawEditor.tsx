import { useCallback, useEffect, useRef, useState } from "react";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { sceneFileName, sceneFingerprint } from "./scene-draft.mjs";

type Scene = { type: "excalidraw"; version: 2; elements: unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> };
type SceneResponse = { ref: string; file: string; present: boolean; revision: string | null; scene: Scene; readOnly: boolean };

async function jsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body as T;
}

// This module is loaded only when the operator opens the editor. The SDK owns editing;
// AOF owns draft persistence. A scene save deliberately never publishes an ADR diagram.
export function ExcalidrawEditor({ itemRef, svgFile, onRequestClose }: { itemRef: string; svgFile: string; onRequestClose: () => void }) {
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
    catch (reason) { setError(reason instanceof Error ? reason.message : "Draft operation failed"); }
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
    <p className="px-4 py-1 text-xs text-muted-foreground">Draft saves do not update the ADR or its SVG preview. Architect requests below are prepared for copying, not dispatched.</p>
    {loaded ? <div className="min-h-0 flex-1"><Excalidraw
      initialData={loaded.scene as unknown as Parameters<typeof Excalidraw>[0]["initialData"]}
      viewModeEnabled={loaded.readOnly}
      validateEmbeddable={() => false}
      excalidrawAPI={(value) => { api.current = value; setReady(true); }}
      onChange={remember}
      UIOptions={{ canvasActions: { loadScene: !loaded.readOnly, saveToActiveFile: false } }}
    /></div> : null}
    <div className="shrink-0 border-t border-border px-4 py-2">
      <label className="text-xs" htmlFor="architect-request">Question or requested change about selected elements (no selection means the whole scene)</label>
      <div className="mt-1 flex gap-2"><input id="architect-request" value={question} maxLength={10000} onChange={(event) => setQuestion(event.target.value)} className="min-w-0 flex-1 rounded border px-2 py-1 text-sm" placeholder="Why does this service write directly to the database?" />
        <button type="button" disabled={!ready || busy || !question.trim() || (loaded?.readOnly && !loaded.present)} onClick={() => void perform(prepare)} className="rounded border px-3 py-1 text-xs disabled:opacity-50">Prepare architect context</button></div>
      {context ? <div className="mt-2"><p className="text-xs">Copy this context to your architect session. It has not been sent automatically.</p><textarea aria-label="Architect context JSON" readOnly value={context} className="mt-1 h-24 w-full rounded border p-2 font-mono text-xs" />
        <button type="button" onClick={() => void navigator.clipboard.writeText(context).catch(() => setError("Clipboard unavailable; select and copy the JSON manually."))} className="rounded border px-2 py-1 text-xs">Copy context</button></div> : null}
    </div>
  </section>;
}
