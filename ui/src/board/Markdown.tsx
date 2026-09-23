// Renders a markdown string as HTML for the detail panel's doc tabs.
//
// TRUST MODEL — read before touching this. The `source` is the operator's OWN
// local work docs (SPEC/STORY/VERIFICATION etc.) read off their own disk and
// served by their own board over 127.0.0.1 — single-user, same-origin, fully
// trusted. There is NO untrusted/third-party content path here, so this renders
// `marked.parse` output via dangerouslySetInnerHTML WITHOUT sanitization, by
// design. (A previous `<script>`-only strip was deliberately removed: it read as
// protection while doing nothing against `<img onerror=…>`, `javascript:` hrefs,
// `<iframe>`, etc. — a half-defense is worse than an explicit none.) If this ever
// renders content from another origin or another user, add a real sanitizer
// (e.g. DOMPurify) here — do NOT re-add a partial regex strip.
//
// ONE GENERATED BODY DOES REACH THIS PANEL, and it never passes through the model above: an ADR's
// diagram (milestone 133, ADR-007 §4). Its SVG arrives through `api.doc(ref, "DIAGRAMS", member)`
// and becomes a `data:` URI in an `<img src>` (diagrams.mjs) — never markup, never `marked.parse`.
//
// Callers pass the ALREADY frontmatter/comment-stripped body (see cleanDoc in
// DetailPanel) — this component only does markdown → HTML.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Marked, marked } from "marked";
import type { DocResponse } from "./api";
import { diagramFileUrl, diagramMembers, diagramRenderer, figureState } from "./diagrams.mjs";
import type { DiagramImages, DiagramResponse } from "./diagrams.mjs";

// GFM on (tables, etc.); synchronous parse so we can render inline.
marked.setOptions({ gfm: true, breaks: false });

function renderHtml(source: string, images?: DiagramImages, ref?: string): string {
  // Trusted local same-origin doc files — no sanitization (see trust model above).
  if (images == null) return marked.parse(source, { async: false }) as string;
  // A per-call instance, so the diagram renderer never leaks into the global `marked`.
  return new Marked({ gfm: true, breaks: false }).use({ renderer: diagramRenderer(images, { ref: ref ?? null }) }).parse(source, { async: false }) as string;
}

export function Markdown({ source, images, itemRef }: { source: string; images?: DiagramImages; itemRef?: string }) {
  const html = useMemo(() => renderHtml(source, images, itemRef), [source, images, itemRef]);
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}

// The full-size viewer a populated figure opens (133/VERIFICATION F-133-01): the SAME data-URI
// `<img>` the figure holds — never markup — over a backdrop, at fit-to-screen or at twice its viewBox
// width with scrolling on both axes. Esc, the backdrop and the close button dismiss it.
function DiagramViewer({ figure, alt, fileHref, onClose }: { figure: { uri: string; width: number | null }; alt: string; fileHref: string; onClose: () => void }) {
  const [full, setFull] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const actual = (figure.width ?? 1000) * 2;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-50 flex flex-col bg-foreground/80" onClick={onClose}>
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-2 text-sm" onClick={(event) => event.stopPropagation()}>
        <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{alt}</span>
        <button type="button" className="rounded border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted" onClick={() => setFull((value) => !value)}>
          {full ? "Fit to screen" : "Actual size"}
        </button>
        <a href={fileHref} target="_blank" rel="noopener noreferrer" className="rounded border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted">
          Open in new tab
        </a>
        <button ref={closeRef} type="button" aria-label="Close" className="rounded px-2 py-1 text-lg leading-none text-muted-foreground hover:text-foreground" onClick={onClose}>
          ×
        </button>
      </div>
      <div className={`min-h-0 flex-1 overflow-auto p-4 ${full ? "" : "grid place-items-center"}`}>
        <img
          src={figure.uri}
          alt={alt}
          onClick={(event) => {
            event.stopPropagation();
            setFull((value) => !value);
          }}
          className={`rounded-md ${full ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          style={full ? { width: `${actual}px`, maxWidth: "none", height: "auto" } : { width: "100%", height: "100%", maxWidth: `${actual}px`, objectFit: "contain" }}
        />
      </div>
    </div>,
    document.body,
  );
}

// The ARCHITECTURE tab's body: the document, with each `diagrams/<member>.svg` image drawn as a
// figure where its ADR links it. Each distinct member is loaded once per render of the tab through
// the caller's `load` (the panel's `api.doc(ref, "DIAGRAMS", member)`).
export function DiagramMarkdown({
  source,
  itemRef,
  load,
  elsewhere,
}: {
  source: string;
  itemRef: string;
  load: (member: string) => Promise<DocResponse>;
  elsewhere: string | null;
}) {
  const [expanded, setExpanded] = useState<{ key: string; alt: string } | null>(null);
  const close = useCallback(() => setExpanded(null), []);
  const members = useMemo(() => diagramMembers(source), [source]);
  const [answers, setAnswers] = useState<Record<string, DiagramResponse>>({});
  useEffect(() => {
    let cancelled = false;
    setAnswers({});
    for (const member of members) {
      load(member)
        .then((response) => ({ response }) as { response: DiagramResponse })
        .catch((error: unknown) => ({ response: { error: error instanceof Error ? error.message : "Load failed" } }))
        .then(({ response }) => {
          if (!cancelled) setAnswers((previous) => ({ ...previous, [member]: response }));
        });
    }
    return () => {
      cancelled = true;
    };
    // `load` is a fresh closure per render; the members are what the fetch depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);
  const images = useMemo(
    () =>
      Object.fromEntries(
        members.map((member) => [`diagrams/${member}`, figureState(answers[member], { member, elsewhere })]),
      ) as DiagramImages,
    [members, answers, elsewhere],
  );
  // One delegated listener: a figure is markup, so its button is found by its `data-diagram-expand`.
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-diagram-expand]");
    if (button == null) return;
    setExpanded({ key: button.dataset.diagramExpand ?? "", alt: button.dataset.diagramAlt ?? "" });
  };
  const figure = expanded == null ? null : images[expanded.key];
  return (
    <div onClick={onClick}>
      <Markdown source={source} images={images} itemRef={itemRef} />
      {expanded != null && figure?.state === "populated" ? (
        <DiagramViewer
          figure={figure}
          alt={expanded.alt}
          fileHref={diagramFileUrl(itemRef, expanded.key.slice(expanded.key.indexOf("/") + 1))}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
