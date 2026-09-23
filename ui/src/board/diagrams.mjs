// THE DIAGRAM FIGURE — milestone 133 / story 04 (ADR-007 §4-§5, DESIGN §"Surface — the ARCHITECTURE
// tab"). One pure, framework-free, headless ESM module — no React, no DOM, no IO — the `runs.mjs` /
// `freshness.mjs` contract, so the node suites and the panel drive the SAME code.
//
// WHAT IT OWNS: which images in a document are diagrams (`diagrams/<member>.svg`, one level, no
// further `/`), the data URI a diagram's SVG body becomes, the mapping from a doc response to one of
// four figure states, the figure's markup per state, and the `marked` renderer that puts a figure
// where its ADR links it. Since 133/VERIFICATION F-133-01/02 it also owns the expand hook a populated
// figure carries and the route a pasted block's `diagrams/` link is pointed at.
//
// THE TRUST MODEL THIS PRESERVES (ADR-007 §4, FF-13304). The board renders its markdown unsanitised,
// which is safe only because every body is the operator's own local record. A diagram is a
// GENERATOR's output, so its SVG body reaches the page ONLY as `encodeURIComponent(body)` inside a
// `data:image/svg+xml` URI in an `<img src>`. An image runs no script and loads no sub-resource. The
// body never passes through `marked.parse`, and never becomes markup. The figure's alt text and
// caption are escaped, so the data URI is the only diagram-derived content in the markup.

const MEMBER_SRC = /^diagrams\/([^/\\]+\.svg)$/;
const IMAGE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
// A pasted block's link into the item's own `diagrams/` folder (the source, the SVG or the PNG).
const FILE_HREF = /^diagrams\/([^/\\]+\.(?:html|svg|png))$/;

// The member a diagram image's `src` names, or null when the src is an ordinary image.
export function diagramMember(src) {
  return MEMBER_SRC.exec(String(src ?? ""))?.[1] ?? null;
}

// Each distinct diagram member, in first-appearance order — fetched once however often it is linked.
export function diagramMembers(markdown) {
  const members = [];
  for (const match of String(markdown ?? "").matchAll(IMAGE)) {
    const member = diagramMember(match[1]);
    if (member != null && !members.includes(member)) members.push(member);
  }
  return members;
}

// The board route that serves one committed diagram file BY BYTES under a sandbox CSP
// (133/VERIFICATION F-133-02). A relative `diagrams/…` href resolves against the board's own URL
// and 404s, so the pasted block's links are pointed here instead.
export function diagramFileUrl(ref, file) {
  return `/api/diagram/file?ref=${encodeURIComponent(ref)}&file=${encodeURIComponent(file)}`;
}

export function svgDataUri(body) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(body)}`;
}

// The width, in CSS px, the SVG's viewBox asks for — the figure is never upscaled past it.
function viewBoxWidth(body) {
  const root = /<svg\b[^>]*>/i.exec(body)?.[0] ?? "";
  const parts = /\sviewBox\s*=\s*["']([^"']*)["']/.exec(root)?.[1]?.trim().split(/[\s,]+/).map(Number) ?? [];
  return parts.length === 4 && Number.isFinite(parts[2]) && parts[2] > 0 ? Math.ceil(parts[2]) : null;
}

// A doc fetch's answer as a figure state. `response` is undefined while pending, a DocResponse once
// it answered, or `{ error }` when it failed. `context` carries the member and — when the row came
// from another node — that node, for the missing wording.
export function figureState(response, { member = "", elsewhere = null } = {}) {
  if (response == null) return { state: "loading" };
  if (typeof response.error === "string") return { state: "error", text: `Could not load diagram: ${response.error}` };
  if (response.present === true && typeof response.body === "string") {
    return { state: "populated", uri: svgDataUri(response.body), width: viewBoxWidth(response.body) };
  }
  const node = elsewhere ?? (response.fromWorker ? response.reportedBy ?? null : null);
  return {
    state: "missing",
    text: node ? `Diagram not synced from ${node} yet` : `Diagram not found — ${member} is not in this item`,
  };
}

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

const FRAME = "rounded-md border border-border bg-card p-2 sm:p-3";
const DASHED = "rounded-md border border-dashed border-border p-2 sm:p-3";
const FIGURE_STYLE = "margin:1rem 0";
const EXPAND = "relative block w-full cursor-zoom-in transition hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";
const HINT = "pointer-events-none absolute right-2 top-2 rounded border border-border bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

// The figure's markup for one state (DESIGN's binding checklist). A block `<figure>`: the caller
// puts it where the paragraph was, never inside one.
//
// `expand` (133/VERIFICATION F-133-01): a populated figure given its image `src` becomes a BUTTON
// carrying `data-diagram-expand`, which the panel answers by opening the full-size viewer over the
// same data URI. The frame's classes, the image and the caption are unchanged.
export function figureHtml({ alt = "", state, uri = "", text = "", width = null, expand = null }) {
  const label = escapeHtml(alt);
  if (state === "populated") {
    const cap = width == null ? "" : `max-width:${width}px;`;
    const img = `<img src="${uri}" alt="${label}" style="display:block;width:100%;height:auto;max-height:70vh;object-fit:contain;${cap}margin:0 auto">`;
    const frame = expand == null
      ? `<div class="${FRAME}">${img}</div>`
      : `<button type="button" data-diagram-expand="${escapeHtml(expand)}" data-diagram-alt="${label}" title="Click to enlarge" aria-label="Enlarge ${label}" class="${FRAME} ${EXPAND}">${img}<span class="${HINT}">Enlarge</span></button>`;
    return `<figure style="${FIGURE_STYLE}">${frame}<figcaption class="mt-1.5 text-xs text-muted-foreground">${label}</figcaption></figure>`;
  }
  if (state === "loading") {
    return `<figure style="${FIGURE_STYLE}"><div class="${FRAME} grid place-items-center" style="aspect-ratio: 16 / 9"><span class="text-sm text-muted-foreground">Loading diagram…</span></div></figure>`;
  }
  const tone = state === "error" ? "text-accent" : "text-muted-foreground";
  return `<figure style="${FIGURE_STYLE}"><div class="${DASHED}"><span class="text-sm ${tone}">${escapeHtml(text)}</span></div></figure>`;
}

// The renderer `Markdown` hands a per-call `Marked` instance. `images` maps a diagram `src` to its
// figure state; a diagram src the map does not know renders the missing figure. A paragraph that is
// ONLY a diagram image becomes the figure itself (a block inside a `<p>` is split apart by the
// browser); anything else falls back to marked's own rendering, byte for byte.
//
// `ref` — the item the document belongs to (133/VERIFICATION F-133-01/02). Given one, a populated
// figure is expandable and a link into `diagrams/` is pointed at `diagramFileUrl` in a new tab;
// without one the renderer has no item to route to, and both render exactly as before.
export function diagramRenderer(images = {}, { ref = null } = {}) {
  const figureFor = (token) => {
    const member = diagramMember(token.href);
    const known = images[token.href];
    const figure = known ?? figureState({ present: false }, { member });
    return figureHtml({ alt: token.text, ...figure, expand: ref == null ? null : token.href });
  };
  return {
    link(token) {
      const file = ref == null ? null : FILE_HREF.exec(String(token.href ?? ""))?.[1] ?? null;
      if (file == null) return false;
      return `<a href="${escapeHtml(diagramFileUrl(ref, file))}" target="_blank" rel="noopener noreferrer">${escapeHtml(token.text)}</a>`;
    },
    paragraph(token) {
      const inner = (token.tokens ?? []).filter((child) => !(child.type === "text" && child.raw.trim() === ""));
      if (inner.length === 1 && inner[0].type === "image" && diagramMember(inner[0].href) != null) return `${figureFor(inner[0])}\n`;
      return false;
    },
    image(token) {
      return diagramMember(token.href) == null ? false : figureFor(token);
    },
  };
}
