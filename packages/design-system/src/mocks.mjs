// The canvas-to-baseline assembly behind `aof design-system mocks import|capture` (198/ADR-006).
//
// Pure: it reads no file and writes none. The verb layer (`./commands.mjs`) lists the pulled
// directory, reads `canvas.json` and the milestone's `mocks/README.md`, hands them here, and applies
// what comes back. Everything that decides — which pulled file is admitted, where it lands, what a
// re-import replaces, what the README says, which boards are framed at what size — is here, so the
// suites drive every rule with plain data.
//
// ONE CANVAS, A PAGE PER MILESTONE (ADR-006 §0, amended 2026-11-27). The project draws every
// milestone's mocks on one canvas, each on a page of its own, so `--page <id>` imports that page's
// boards alone and writes a `canvas.json` that names only them: capture then frames exactly what was
// imported. A board with no `page` is on the canvas's first page, as the Design type reads it.
//
// THE README IS THE RECORD. Only `import` writes its `Canvas:` line, which is how a later import
// tells its own files from a person's (Q5), how capture knows there is an import (E18) and how
// FF-19805 finds an imported mock (Q12). It lists the files the import wrote and, once captured,
// the frames, so a re-import removes exactly those and nothing beside them (E14).

export const MOCKS_DIR = "mocks";
export const README = "README.md";
export const CANVAS = "project/canvas.json";
export const RUNTIME = "artifact-type/dc-runtime.js";
export const SUPPORT = "support.js";
export const CAPTURE_SCALE = 2; // Q8 — milestone 47's frames were taken at 2

const BOARD_SUFFIX = ".dc.html";
const TOKENS = /^project\/ds\/[^/]+\/tokens\.json$/u;

// The one reason a path from a pulled canvas may not be used as a path at all, or null.
export function pathFault(rel) {
  const value = String(rel);
  if (value.startsWith("/")) return 'a path may not start with "/"';
  if (value.includes("\\")) return 'a path may not hold "\\"';
  if (value.split("/").includes("..")) return 'a path may not hold ".."';
  return null;
}

// `canvas.json`'s boards in canvas order: `order` first, then any board it leaves out, by name. With
// a `page` id, only the boards on that page. Answers `{ boards: [{ name, frame }], canvas, page }` or
// `{ fault }`; `page` is the `{ id, name }` entry when one was asked for.
export function canvasBoards(text, pageId) {
  let canvas;
  try {
    canvas = JSON.parse(text);
  } catch {
    return { fault: `"${CANVAS}" is not JSON` };
  }
  const all = canvas?.boards;
  if (all == null || typeof all !== "object" || Array.isArray(all) || Object.keys(all).length === 0) {
    return { fault: `"${CANVAS}" names no boards` };
  }
  let boards = all;
  let page;
  if (pageId !== undefined) {
    const pages = Array.isArray(canvas.pages) ? canvas.pages : [];
    page = pages.find((entry) => entry?.id === pageId);
    if (page == null) return { fault: `"${CANVAS}" has no page "${pageId}"${pages.length > 0 ? `: its pages are ${pages.map((entry) => `"${entry?.id}"`).join(", ")}` : ""}` };
    const first = pages[0]?.id;
    boards = Object.fromEntries(Object.entries(all).filter(([, frame]) => (frame?.page ?? first) === pageId));
    if (Object.keys(boards).length === 0) return { fault: `"${CANVAS}" names no boards on the page "${pageId}"` };
  }
  const names = Object.keys(boards);
  const order = Array.isArray(canvas.order) ? canvas.order.filter((name) => names.includes(name)) : [];
  const ordered = [...new Set([...order, ...names.filter((name) => !order.includes(name)).sort()])];
  for (const name of ordered) {
    const fault = pathFault(name);
    if (fault) return { fault: `"${CANVAS}" names the board "${name}": ${fault}` };
    if (!name.endsWith(BOARD_SUFFIX)) return { fault: `"${CANVAS}" names the board "${name}", which is not a ${BOARD_SUFFIX} file` };
  }
  return { boards: ordered.map((name) => ({ name, frame: boards[name] })), canvas, ...(page ? { page: { id: page.id, name: page.name ?? page.id } } : {}) };
}

// The `canvas.json` an import of one page writes: every key kept, its boards, `order` and notes cut
// to the page, and `pages` to the page alone, which is then the first page.
export function pageCanvas(canvas, page, boards) {
  const kept = new Set(boards.map((board) => board.name));
  const notes = canvas.notes != null && typeof canvas.notes === "object" && !Array.isArray(canvas.notes)
    ? Object.fromEntries(Object.entries(canvas.notes).filter(([, note]) => note?.page === page.id))
    : canvas.notes;
  return `${JSON.stringify({
    ...canvas,
    pages: [{ id: page.id, name: page.name }],
    ...(canvas.launch?.page !== undefined ? { launch: { ...canvas.launch, page: page.id } } : {}),
    boards: Object.fromEntries(Object.entries(canvas.boards).filter(([name]) => kept.has(name))),
    order: Array.isArray(canvas.order) ? canvas.order.filter((name) => kept.has(name)) : [...kept],
    ...(notes !== undefined ? { notes } : {}),
  }, null, 2)}\n`;
}

// A board's frame as a window size, or null when it is not a positive whole number of CSS pixels.
export function frameSize(frame) {
  const { w, h } = frame ?? {};
  return [w, h].every((side) => Number.isInteger(side) && side > 0) ? { width: w, height: h } : null;
}

export const frameOf = (board) => `${board.slice(0, -BOARD_SUFFIX.length)}.png`;

// Where a pulled file lands under mocks/: the runtime as `support.js`, everything else beside the
// boards with its `project/` prefix dropped, so the tokens keep their relative path (ADR-006 §2).
const destinationOf = (rel) => (rel === RUNTIME ? SUPPORT : rel.slice("project/".length));

// The previous import a README records, or null when it holds no `Canvas:` line (a person's file).
export function readImport(text) {
  if (typeof text !== "string") return null;
  const line = (label) => new RegExp(`^${label}: (.+)$`, "mu").exec(text)?.[1]?.trim() ?? null;
  const canvas = /^(\S+) \(version (.+)\)$/u.exec(line("Canvas") ?? "");
  if (!canvas) return null;
  const system = /^(\S+) \(version (.+)\)$/u.exec(line("System") ?? "");
  const page = /^(\S+)(?: \((.*)\))?$/u.exec(line("Page") ?? "");
  const listed = (heading) => {
    const start = text.indexOf(`\n## ${heading}\n`);
    if (start < 0) return [];
    const rest = text.slice(start + heading.length + 5);
    const end = rest.search(/\n## /u);
    return [...(end < 0 ? rest : rest.slice(0, end)).matchAll(/^(?:- |\| )`([^`]+)`/gmu)].map((match) => match[1]);
  };
  return {
    canvas: canvas[1],
    canvasVersion: canvas[2],
    system: system?.[1] ?? null,
    systemVersion: system?.[2] ?? null,
    page: page?.[1] ?? null,
    approval: line("Approval"),
    files: listed("Files"),
    frames: listed("Frames"),
  };
}

// The README an import writes. It names no frame until capture adds them.
export function importReadme({ canvas, canvasVersion, page, pageName, system, systemVersion, approval, date }, files) {
  return [
    "# Mocks",
    "",
    "The approved Design canvas this milestone's surfaces are judged against (198/ADR-006). It was",
    "written by `aof design-system mocks import`: a re-import replaces this file and every file it",
    "lists, and nothing else in this directory. Open a board from disk to see it; it needs no network.",
    "",
    `Canvas: ${canvas} (version ${canvasVersion})`,
    ...(page != null ? [`Page: ${page} (${pageName ?? page})`] : []),
    `System: ${system} (version ${systemVersion})`,
    `Imported: ${date}`,
    `Approval: ${approval}`,
    "",
    "## Files",
    "",
    ...files.map((file) => `- \`${file}\``),
    "",
  ].join("\n");
}

// The README with its frame table, replacing any earlier one: capture's only change to it.
export function withFrames(readme, frames) {
  const start = readme.indexOf("\n## Frames\n");
  const base = start < 0 ? readme.replace(/\n*$/u, "\n") : readme.slice(0, start + 1);
  return [
    base,
    "## Frames",
    "",
    `Captured by \`aof design-system mocks capture\` at scale ${CAPTURE_SCALE}, each board at its own size, in canvas order.`,
    "",
    "| Frame | Board | Size (CSS px) |",
    "|---|---|---|",
    ...frames.map((frame) => `| \`${frame.frame}\` | \`${frame.board}\` | ${frame.width}x${frame.height} |`),
    "",
  ].join("\n");
}

// The import, decided. `pulled` is every file under the pulled directory, as relative POSIX paths;
// `canvasText` is its `canvas.json`, or null; `existing` is every file under mocks/ as relative POSIX
// paths, with `readme` the text of mocks/README.md, or null. `provenance.page`, when given, imports
// that page alone. Answers `{ refusal: { message, code } }` or `{ plan: { copies: [{ from, to } |
// { text, to }], remove: [rel], readme, files, previous } }`: a copy with `text` writes it.
export function planImport({ pulled, canvasText, existing = [], readme = null, provenance, date }) {
  const refuse = (message, code) => ({ refusal: { message, code } });
  for (const rel of pulled) {
    const fault = pathFault(rel);
    if (fault) return refuse(`"${rel}" is refused: ${fault}. Nothing was written.`, "design-system-mocks-bad-path");
  }
  if (canvasText == null || !pulled.includes(CANVAS)) {
    return refuse(`The pulled canvas lacks "${CANVAS}", so its boards are unknown. Read it back with the boards, then import again. Nothing was written.`, "design-system-mocks-incomplete");
  }
  const parsed = canvasBoards(canvasText, provenance.page ?? undefined);
  if (parsed.fault) return refuse(`${parsed.fault}. Nothing was written.`, "design-system-mocks-bad-canvas");
  const boards = parsed.boards.map((board) => `project/${board.name}`);
  const elsewhere = parsed.page ? Object.keys(parsed.canvas.boards).map((name) => `project/${name}`) : [];
  for (const rel of pulled) {
    if (rel === CANVAS || rel === RUNTIME || TOKENS.test(rel) || boards.includes(rel)) continue;
    const reason = elsewhere.includes(rel)
      ? `the board is on another page than "${parsed.page.id}", so it is not this milestone's`
      : rel.startsWith("project/") && rel.endsWith(BOARD_SUFFIX)
        ? `"canvas.json" names no such board`
        : "it is not a file a canvas is imported from (canvas.json, its boards, ds/<system>/tokens.json and the type's dc-runtime.js)";
    return refuse(`"${rel}" is refused: ${reason}. Nothing was written.`, "design-system-mocks-stray-file");
  }
  for (const rel of [...boards, RUNTIME]) {
    if (!pulled.includes(rel)) {
      return refuse(`The pulled canvas lacks "${rel}", so it cannot render offline. Read it back too, then import again. Nothing was written.`, "design-system-mocks-incomplete");
    }
  }

  const admitted = [CANVAS, ...boards, RUNTIME, ...pulled.filter((rel) => TOKENS.test(rel)).sort()];
  const copies = admitted.map((from) => (from === CANVAS && parsed.page
    ? { text: pageCanvas(parsed.canvas, parsed.page, parsed.boards), to: destinationOf(from) }
    : { from, to: destinationOf(from) }));
  const files = copies.map((copy) => copy.to);
  const previous = readImport(readme);
  if (readme != null && previous == null) {
    return refuse(`"${MOCKS_DIR}/${README}" was not written by an import (it has no "Canvas:" line), so it is not replaced. Move it aside, then import again. Nothing was written.`, "design-system-mocks-not-ours");
  }
  const owned = new Set([README, ...(previous?.files ?? []), ...(previous?.frames ?? [])]);
  for (const to of files) {
    if (existing.includes(to) && !owned.has(to)) {
      return refuse(`"${MOCKS_DIR}/${to}" was not written by an import, so it is not replaced. Move it aside, then import again. Nothing was written.`, "design-system-mocks-not-ours");
    }
  }
  const remove = [...(previous?.files ?? []), ...(previous?.frames ?? [])].filter((rel) => !files.includes(rel) && existing.includes(rel) && pathFault(rel) == null);
  return { plan: { copies, remove, files, readme: importReadme({ ...provenance, pageName: parsed.page?.name, date }, files), previous } };
}

// Whether a previous import already records this exact approval of this exact canvas and system.
export function sameImport(previous, provenance) {
  return previous != null
    && previous.canvas === provenance.canvas && previous.canvasVersion === provenance.canvasVersion
    && previous.system === provenance.system && previous.systemVersion === provenance.systemVersion
    && previous.page === (provenance.page ?? null)
    && previous.approval === provenance.approval;
}

// The capture, decided: each board's frame and size, in canvas order. `existing` is every file under
// mocks/; a frame lands only where nothing stands or where this import's own frame stood, so a
// person's PNG of the same name is never overwritten (Q5). Answers `{ frames }` or `{ refusal }`.
export function planCapture({ readme, canvasText, existing = [] }) {
  const refuse = (message, code) => ({ refusal: { message, code } });
  const previous = readImport(readme);
  if (previous == null) {
    return refuse(`There is no imported canvas to frame: "${MOCKS_DIR}/${README}" holds no "Canvas:" line. Run "aof design-system mocks import" first.`, "design-system-mocks-not-imported");
  }
  if (canvasText == null) return refuse(`The import lacks "${MOCKS_DIR}/canvas.json". Run "aof design-system mocks import" again.`, "design-system-mocks-not-imported");
  const parsed = canvasBoards(canvasText);
  if (parsed.fault) return refuse(`${parsed.fault.replace(CANVAS, `${MOCKS_DIR}/canvas.json`)}.`, "design-system-mocks-bad-canvas");
  const frames = [];
  for (const board of parsed.boards) {
    const size = frameSize(board.frame);
    if (size == null) {
      return refuse(`"${board.name}" has no usable size in canvas.json (${JSON.stringify(board.frame ?? null)}): its size is not usable, so it cannot be framed without guessing. A frame needs a positive whole "w" and "h".`, "design-system-mocks-bad-size");
    }
    const frame = frameOf(board.name);
    if (existing.includes(frame) && !previous.frames.includes(frame)) {
      return refuse(`"${MOCKS_DIR}/${frame}" was not written by a capture, so it is not replaced. Move it aside, then capture again. Nothing was captured.`, "design-system-mocks-not-ours");
    }
    frames.push({ board: board.name, frame, ...size });
  }
  return { frames };
}
