import { lstat, mkdir, open, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { diagramFile, diagramLibrariesDir, diagramPaths, globalDiagramLibrariesDir, diagramReviewPaths, hasAdrSection, isReviewId, readAdrTitle, readDiagramBrief, renderDiagramBlock, reviewRecordPath, stemAdr } from "../layout.mjs";
import { LIMITS, diffModels, parseProfile, serializeProfile, validateModel } from "../mermaid-profile.mjs";
import { assignAliases, projectScene } from "../scene-view.mjs";
import { REVIEW_SESSION_TOOLS, reviewInvocation } from "../review-session.mjs";

// diagram:scene — `aof diagram scene <ref> <ADR-NNN-slug.excalidraw>` (milestone 170, ADR-010..ADR-013).
// A diagram is stored as Excalidraw's own scene: it holds everything the editor draws, library items
// and free drawing included. The architect reads it as Mermaid (scene-view.mjs) and proposes edited
// Mermaid; the editor compiles the proposal's changes into element edits, and accept applies them —
// refusing, by name, anything the proposal touches that a person changed since. Notes, answers and
// proposals are review records beside the diagram, naming Mermaid ids. Publish writes the figure.
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_ELEMENTS = 10000;
const MAX_FILES = 500;
const ELEMENT_TYPES = new Set(["text", "rectangle", "diamond", "ellipse", "line", "arrow", "freedraw", "image", "frame", "magicframe", "embeddable", "iframe"]);
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const KEPT_APP_STATE = ["viewBackgroundColor", "gridSize", "gridStep", "gridModeEnabled"];
const MAX_RECORD_BYTES = 2 * MAX_BYTES + 64 * 1024; // a proposal carries the element snapshot it was made against
const MAX_TEXT = 10000;
const MAX_SUMMARY = 500;
const MAX_REASON = 2000;
const MAX_OPERATIONS = 2000;
const MAX_LISTED = 50;
const MAX_SVG = 4 * 1024 * 1024;
const MAX_PNG = 6 * 1024 * 1024;
const MAX_LIBRARY_BYTES = 8 * 1024 * 1024;
const SCENE_ACTIONS = new Set(["read", "save", "context", "request", "withdraw", "respond", "propose", "proposals", "accept", "reject", "publish", "libraries", "stamp", "reply", "session"]);
const WRITE_ACTIONS = new Set(["save", "request", "withdraw", "respond", "reply", "propose", "accept", "reject", "publish"]);
const REVISION = /^[0-9a-f]{64}$/;
const RECORD_FILE = /^([a-z0-9]{8,32})\.json$/;
const SVG_DOCUMENT = /^\s*(?:<\?xml[^>]*>\s*)?(?:<!DOCTYPE[^>]*>\s*)?<svg[\s>][\s\S]*<\/svg>\s*$/;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const locks = new Map();

const hash = (text) => createHash("sha256").update(text).digest("hex");
const byteLength = (text) => Buffer.byteLength(text, "utf8");
const plainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const fail = (message, code = "diagram-scene-invalid", status = 400) => { throw commandError(message, code, status); };
const emptyScene = () => ({ type: "excalidraw", version: 2, source: "aof", elements: [], appState: {}, files: {} });

function validJsonTree(value, depth = 0) {
  if (depth > 60) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((entry) => validJsonTree(entry, depth + 1));
  if (!plainObject(value) || Object.keys(value).some((key) => DANGEROUS_KEYS.has(key))) return false;
  return Object.values(value).every((entry) => validJsonTree(entry, depth + 1));
}

// A scene aof stores: Excalidraw version 2, plain finite JSON, unique element ids, known types.
function validateScene(scene) {
  if (!validJsonTree(scene) || !plainObject(scene) || scene.type !== "excalidraw" || scene.version !== 2
    || !Array.isArray(scene.elements) || !plainObject(scene.appState ?? {}) || !plainObject(scene.files ?? {})) {
    fail("Scene must be a plain finite Excalidraw version 2 scene.");
  }
  if (scene.elements.length > MAX_ELEMENTS || Object.keys(scene.files ?? {}).length > MAX_FILES) fail("Scene has too many elements or files.", "diagram-scene-too-large", 413);
  const ids = new Set();
  for (const element of scene.elements) {
    if (!plainObject(element) || typeof element.id !== "string" || element.id.length === 0 || element.id.length > 200 || ids.has(element.id)) fail("Scene elements require unique string ids.");
    if (!ELEMENT_TYPES.has(element.type)) fail(`Scene contains an unsupported element type "${element.type}".`);
    for (const field of ["x", "y", "width", "height"]) if (!Number.isFinite(element[field])) fail(`Scene element ${field} must be finite.`);
    if (element.width < 0 || element.height < 0) fail("Scene element dimensions cannot be negative.");
    ids.add(element.id);
  }
  const appState = Object.fromEntries(KEPT_APP_STATE.filter((key) => scene.appState?.[key] !== undefined).map((key) => [key, scene.appState[key]]));
  return { type: "excalidraw", version: 2, source: "aof", elements: scene.elements, appState, files: scene.files ?? {} };
}

// THE CANONICAL FILE: keys sorted, the volatile `updated` timestamp dropped, one element per line —
// so a diff shows which elements changed, and a revision is a fact about the drawing.
const sortedJson = (value) => JSON.stringify(value, (key, inner) => (plainObject(inner) ? Object.fromEntries(Object.keys(inner).sort().map((k) => [k, inner[k]])) : inner));
export function canonicalScene(scene) {
  const elements = scene.elements.map(({ updated, ...element }) => `    ${sortedJson(element)}`);
  return `{\n  "type": "excalidraw",\n  "version": 2,\n  "source": "aof",\n  "elements": [${elements.length ? `\n${elements.join(",\n")}\n  ` : ""}],\n  "appState": ${sortedJson(scene.appState ?? {})},\n  "files": ${sortedJson(scene.files ?? {})}\n}\n`;
}

function parseSceneText(text, { stored = false } = {}) {
  if (byteLength(text) > MAX_BYTES) fail("The diagram is over its size limit.", "diagram-scene-too-large", 413);
  try { return JSON.parse(text); } catch { return fail(stored ? "Stored scene is not valid JSON." : "Scene must be valid JSON.", stored ? "diagram-scene-corrupt" : "diagram-scene-invalid", stored ? 409 : 400); }
}

// A profile refusal keeps its code and line.
function profileModel(text) {
  try {
    return parseProfile(text);
  } catch (error) {
    if (typeof error?.code !== "string" || !error.code.startsWith("diagram-mermaid")) throw error;
    const refusal = commandError(error.message, error.code, error.code === "diagram-mermaid-too-large" ? 413 : 400);
    if (error.line) refusal.details = { line: error.line };
    throw refusal;
  }
}

// ---- element operations (accept) ----------------------------------------------------------------
function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((entry, index) => deepEqual(entry, b[index]));
  if (!plainObject(a) || !plainObject(b)) return false;
  const keys = Object.keys(a).filter((k) => k !== "updated");
  const other = Object.keys(b).filter((k) => k !== "updated");
  return keys.length === other.length && keys.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
}
// Excalidraw reconciles elements by version/versionNonce: an element aof changes must look changed.
function bumped(next, previous) {
  const version = Number.isInteger(previous?.version) ? previous.version + 1 : 1;
  return { ...next, version, versionNonce: randomBytes(4).readUInt32BE(0) };
}
function applyOperations(elements, operations, allowed) {
  if (!Array.isArray(operations) || operations.length === 0) fail("accept needs the editor's element operations for this proposal.", "diagram-proposal-invalid");
  if (operations.length > MAX_OPERATIONS) fail(`operations are limited to ${MAX_OPERATIONS}.`, "diagram-proposal-invalid");
  const byId = new Map(elements.map((element) => [element.id, element]));
  const updates = new Map();
  const additions = [];
  const seen = new Set();
  for (const operation of operations) {
    if (!plainObject(operation)) fail("Each operation must be an object.", "diagram-proposal-invalid");
    const id = operation.op === "add" ? operation.element?.id : operation.id;
    if (typeof id !== "string" || id.length === 0 || seen.has(id)) fail("Each operation names one element, once.", "diagram-proposal-invalid");
    seen.add(id);
    if (operation.op === "add") {
      if (!plainObject(operation.element) || byId.has(id)) fail(`Cannot add "${id}": it is not a new element.`, "diagram-proposal-invalid");
      additions.push(operation.element);
    } else if (operation.op === "update" || operation.op === "delete") {
      if (!byId.has(id)) fail(`Cannot change "${id}": no such element.`, "diagram-proposal-invalid");
      if (!allowed.has(id)) fail(`Element "${id}" is outside what this proposal touches.`, "diagram-proposal-invalid");
      if (operation.op === "update") {
        if (!plainObject(operation.patch) || Object.hasOwn(operation.patch, "id")) fail("update requires a patch object without id.", "diagram-proposal-invalid");
        updates.set(id, (element) => bumped({ ...element, ...operation.patch }, element));
      } else {
        updates.set(id, (element) => bumped({ ...element, isDeleted: true }, element));
      }
    } else fail("operation.op must be add, update or delete.", "diagram-proposal-invalid");
  }
  return [...elements.map((element) => (updates.has(element.id) ? updates.get(element.id)(element) : element)), ...additions];
}

// The elements a proposal's changes touch — what accept may change and what it checks for staleness.
// Precise per kind of change, so a person's edit elsewhere never makes a proposal stale:
//   style                                             the node's own elements, and its frames
//   node changed (label, shape, subgraph)             those, and its arrows (a relabelled box may grow)
//   layout (a move)                                   the node's elements, its arrows, and its frames
//   node removed                                      all that, plus the boxes at its arrows' far ends and their frames
//   node added · lib                                  its frame (the new elements are additions)
//   edge (any)                                        the arrow and its label, the two boxes it binds and their frames
//                                                     (a library item with no anchor box: its elements, which the
//                                                     editor groups under the anchor it adds)
// A box's frame is in because the editor re-fits a frame whose member it changes (a box's bindings change
// when an arrow joins or leaves it), and accept refuses an update outside this set.
//   subgraph                                          the frame and the boxes moving in or out of it
function touchedElements(changes, base, index, proposed) {
  const ids = new Set();
  const addContainer = (id) => { if (index[id]?.container) ids.add(index[id].container); };
  const addOwn = (id) => { for (const e of index[id]?.elementIds ?? []) ids.add(e); };
  const addArrows = (id, farEnds) => {
    for (const key of index[id]?.arrows ?? []) {
      for (const e of index[key]?.elementIds ?? []) ids.add(e);
      if (farEnds) { addContainer(index[key].from); addContainer(index[key].to); addFrames(index[key].from); addFrames(index[key].to); }
    }
  };
  const addFrames = (id) => { for (const parent of [base.nodes.find((n) => n.id === id)?.parent, proposed.nodes.find((n) => n.id === id)?.parent]) if (parent) addContainer(parent); };
  for (const { key, change } of changes) {
    const kind = key.slice(0, key.indexOf(":"));
    const id = key.slice(key.indexOf(":") + 1);
    if (kind === "node" || kind === "style" || kind === "lib") {
      addOwn(id);
      // A removed node takes its arrows (and unbinds their far ends); a relabelled box may grow, so its
      // arrows are re-routed.
      if (kind === "node" && change === "removed") addArrows(id, true);
      else if (kind === "node" && change === "changed") addArrows(id, false);
      addFrames(id);
    } else if (kind === "layout") {
      addOwn(id); addArrows(id, false); addFrames(id);
    } else if (kind === "edge") {
      for (const e of index[id]?.elementIds ?? []) ids.add(e);
      const [from, to] = id.replace(/#\d+$/, "").split("->");
      for (const end of [from, to]) { if (index[end]?.lib && !index[end].container) addOwn(end); addContainer(end); addFrames(end); }
    } else if (kind === "subgraph") {
      addContainer(id);
      for (const node of [...base.nodes, ...proposed.nodes].filter((n) => n.parent === id)) addOwn(node.id);
    }
  }
  return ids;
}

// An added element must belong, in the accepted scene, to a node or frame the proposal adds or changes,
// to an end of an edge it draws (a library item's new anchor box), or to an edge between ends it
// names — never to a sketch, and never to anything the proposal does not touch.
function requireAdditionsProposed(elements, operations, changes) {
  const additions = operations.filter((operation) => operation.op === "add").map((operation) => operation.element.id);
  if (!additions.length) return;
  const ids = new Set();
  const pairs = new Set();
  for (const { key } of Array.isArray(changes) ? changes : []) {
    const kind = key.slice(0, key.indexOf(":"));
    const id = key.slice(key.indexOf(":") + 1);
    if (kind !== "edge") { ids.add(id); continue; }
    const [from, to] = id.replace(/#\d+$/, "").split("->");
    pairs.add(`${from}->${to}`); ids.add(from); ids.add(to);
  }
  const owner = new Map();
  for (const [id, entry] of Object.entries(projectScene(elements).index)) for (const elementId of entry.elementIds) owner.set(elementId, [id, entry]);
  const stray = additions.filter((elementId) => {
    const [id, entry] = owner.get(elementId) ?? [];
    if (!entry || entry.kind === "sketch") return true;
    return entry.kind === "edge" ? !pairs.has(`${entry.from}->${entry.to}`) : !ids.has(id);
  });
  if (stray.length) fail(`Added elements are outside what this proposal touches: ${stray.join(", ")}.`, "diagram-proposal-invalid");
}

// ---- libraries: the global home's, then the project's (*.excalidrawlib) -------------------------
// One root's libraries, by file name. Each root has its own size cap, so a large shared set in the
// global home never crowds out a project's own.
async function readLibraryRoot(dir, where) {
  const libraries = new Map();
  let names;
  try { names = (await readdir(dir)).filter((name) => name.endsWith(".excalidrawlib")).sort(); } catch (error) { if (error?.code === "ENOENT") return libraries; throw error; }
  let total = 0;
  for (const name of names) {
    const file = path.join(dir, name);
    const stat = await lstat(file);
    if (!stat.isFile()) continue;
    total += stat.size;
    if (total > MAX_LIBRARY_BYTES) fail(`The ${where} libraries are over ${MAX_LIBRARY_BYTES} bytes.`, "diagram-library-too-large", 413);
    let parsed;
    try { parsed = JSON.parse(await readFile(file, "utf8")); } catch { fail(`${name} is not a valid Excalidraw library.`, "diagram-library-invalid", 409); }
    const library = name.slice(0, -".excalidrawlib".length);
    const entries = Array.isArray(parsed?.libraryItems) ? parsed.libraryItems
      : Array.isArray(parsed?.library) ? parsed.library.map((elements, i) => ({ id: `${library}-${i + 1}`, elements, name: null })) : null;
    if (!entries) fail(`${name} is not a valid Excalidraw library.`, "diagram-library-invalid", 409);
    const items = [];
    entries.forEach((entry, i) => {
      if (!Array.isArray(entry?.elements)) return;
      items.push({ library, item: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : `item ${i + 1}`, id: String(entry.id ?? `${library}-${i + 1}`), elements: entry.elements });
    });
    libraries.set(library, items);
  }
  return libraries;
}

// Every library this project may draw from: the global home's shared sets, and the project's own. A
// project file shadows a global one of the same name, so a project can pin or customise a set.
async function readLibraries(projectRoot, globalHome) {
  const merged = new Map();
  if (globalHome) for (const [library, items] of await readLibraryRoot(path.resolve(globalDiagramLibrariesDir(globalHome)), "global")) merged.set(library, items);
  if (projectRoot) for (const [library, items] of await readLibraryRoot(path.resolve(diagramLibrariesDir(projectRoot)), "project")) merged.set(library, items);
  return [...merged.keys()].sort().flatMap((library) => merged.get(library));
}
const libraryRef = (lib) => `${lib.library}/"${lib.item}"`;

async function serialized(key, work) {
  const previous = locks.get(key) ?? Promise.resolve();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const tail = previous.then(() => gate);
  locks.set(key, tail);
  await previous;
  try { return await work(); } finally { release(); if (locks.get(key) === tail) locks.delete(key); }
}

async function assertDirectoryNotSymlink(directory, allowMissing = false) {
  try {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail("Scene storage directory must not be a symlink.", "diagram-scene-storage-invalid", 409);
  } catch (error) {
    if (allowMissing && error?.code === "ENOENT") return;
    throw error;
  }
}

async function assertStorageSafe(itemDir, diagramDir, projectRoot) {
  await assertDirectoryNotSymlink(itemDir);
  if (projectRoot) {
    const [itemReal, projectReal] = await Promise.all([realpath(itemDir), realpath(projectRoot)]);
    if (itemReal !== projectReal && !itemReal.startsWith(`${projectReal}${path.sep}`)) fail("Resolved item is outside the project.", "diagram-scene-storage-invalid", 409);
  }
  await assertDirectoryNotSymlink(diagramDir, true);
}

async function textOrNull(file, limitBytes = null) {
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) fail("Scene storage must be a regular file.", "diagram-scene-storage-invalid", 409);
    if (limitBytes !== null && stat.size > limitBytes) fail("The diagram is over its size limit.", "diagram-scene-too-large", 413);
    return await readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

// Best-effort removal of a file this command created. Absence is the expected outcome (a renamed
// temp file); any other failure is surfaced rather than swallowed (acd-no-new-silent-catch).
async function removeIfPresent(file) {
  try {
    await unlink(file);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function withFileLock(file, work) {
  const lock = `${file}.lock`;
  let handle;
  try { handle = await open(lock, "wx", 0o600); }
  catch (error) { if (error?.code === "EEXIST") fail("Scene is locked by another writer; retry later.", "diagram-scene-locked", 409); throw error; }
  try { return await work(); } finally { await handle.close(); await removeIfPresent(lock); }
}

function boundedString(value, name, max, { min = 1 } = {}) {
  if (typeof value !== "string" || value.trim().length < min || value.length > max) {
    fail(`${name} must be a string of ${min > 0 ? "1" : "0"}..${max} characters.`);
  }
  return value;
}

function stringArray(value, name) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string") || value.length > 10000) fail(`${name} must be an array of at most 10,000 strings.`);
  return value;
}

function revisionInput(value) {
  if (typeof value !== "string" || !REVISION.test(value)) fail("baseRevision is required and must be a SHA-256 revision.");
  return value;
}

function reviewIdInput(value, name) {
  if (!isReviewId(value)) fail(`${name} must be a review id.`, "diagram-review-id-invalid", 400);
  return value;
}

// ---- review record storage ----------------------------------------------------------------------

async function assertReviewStorage(paths) {
  for (const directory of [paths.dir, paths.requests, paths.proposals]) await assertDirectoryNotSymlink(path.resolve(directory), true);
}

async function readRecordText(file) {
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) fail("Review storage must be a regular file.", "diagram-review-storage-invalid", 409);
    if (stat.size > MAX_RECORD_BYTES) fail("Review record is over its size limit.", "diagram-review-too-large", 413);
    return await readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

// A NOTE IS A THREAD (171/ADR-006): turns `{ by: "operator" | "architect", text, at }` on the request
// record itself. A record written before threads has the thread its request and answer imply, read
// here — once, for every reader — so the panel, the batch review and `context` see the same turns.
function withThread(record) {
  if (record?.kind !== "request" || Array.isArray(record.thread)) return record;
  const thread = [{ by: "operator", text: record.request, at: record.createdAt }];
  if (typeof record.answer === "string" && record.answer.length > 0) thread.push({ by: "architect", text: record.answer, at: record.answeredAt });
  return { ...record, thread };
}

async function readRecord(paths, kind, id) {
  await assertReviewStorage(paths);
  const directory = kind === "request" ? paths.requests : paths.proposals;
  const text = await readRecordText(path.resolve(reviewRecordPath(directory, id)));
  if (text === null) fail(`No ${kind} "${id}" exists for this diagram.`, "diagram-review-unknown", 404);
  let record;
  try {
    record = JSON.parse(text);
  } catch {
    return fail(`Stored ${kind} is not valid JSON.`, "diagram-review-corrupt", 409);
  }
  if (plainObject(record) && record.id === id && record.kind === kind) return withThread(record);
  return fail(`Stored ${kind} is invalid.`, "diagram-review-corrupt", 409);
}

// The panel polls every five seconds, so a record file is parsed again only when it changed: the
// cache is keyed by path and checked against the file's identity, size and modification time.
const newestFirst = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || b.id.localeCompare(a.id);
const LIVE_STATUS = Object.freeze({ request: "open", proposal: "pending" });
const listedRecords = new Map();
async function parsedRecord(file, id, kind) {
  let stat;
  try { stat = await lstat(file); } catch (error) { if (error?.code === "ENOENT") return null; throw error; }
  const cached = listedRecords.get(file);
  if (cached && cached.ino === stat.ino && cached.size === stat.size && cached.mtimeMs === stat.mtimeMs) return cached.record;
  const text = await readRecordText(file);
  let record = null;
  try { record = JSON.parse(text); } catch { record = null; }
  record = plainObject(record) && record.id === id && record.kind === kind ? withThread(record) : null;
  listedRecords.set(file, { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs, record });
  return record;
}

// The house palette (171/ADR-004), read from the style guide `work.diagrams.style` names; none when no
// guide is named or its file is missing. The reader is loaded only when a palette is asked for, so a
// verb that merely composes the registry (`aof work find`, FF-16004's ceiling) does not evaluate it.
async function readHouseStyle(projectRoot, style) {
  if (typeof style !== "string" || style.length === 0 || !projectRoot) return null;
  let text;
  try { text = await readFile(path.resolve(projectRoot, style), "utf8"); }
  catch (error) { if (error?.code === "ENOENT" || error?.code === "EISDIR") return null; throw error; }
  return (await import("../house-style.mjs")).readPalette(text);
}
const nodeStyleOf = async (palette) => (palette ? (await import("../house-style.mjs")).defaultNodeStyle(palette) : null);

// A STAMP (171/ADR-003): what a watcher compares, by stat alone — nothing is parsed. The scene's
// identity is its size and modification time; the review records' is one digest over every
// request's and proposal's name, size and modification time (the identity `parsedRecord` caches on).
async function statStamp(file) {
  try { const stat = await lstat(file); return stat.isFile() ? { size: stat.size, mtimeMs: stat.mtimeMs } : null; } catch (error) { if (error?.code === "ENOENT") return null; throw error; }
}
async function reviewStamp(paths) {
  await assertReviewStorage(paths);
  const entries = [];
  for (const [kind, directory] of [["requests", paths.requests], ["proposals", paths.proposals]]) {
    let names = [];
    try { names = await readdir(path.resolve(directory)); } catch (error) { if (error?.code !== "ENOENT") throw error; }
    for (const name of names.filter((entry) => RECORD_FILE.test(entry)).sort()) {
      const stamp = await statStamp(path.join(path.resolve(directory), name));
      if (stamp) entries.push(`${kind}/${name}:${stamp.size}:${stamp.mtimeMs}`);
    }
  }
  return hash(entries.join("\n"));
}

async function listRecords(paths, kind) {
  await assertReviewStorage(paths);
  const directory = path.resolve(kind === "request" ? paths.requests : paths.proposals);
  let names;
  try { names = await readdir(directory); } catch (error) { if (error?.code === "ENOENT") return { records: [], skipped: [] }; throw error; }
  const records = [];
  const skipped = [];
  const seen = new Set();
  for (const name of names) {
    const id = RECORD_FILE.exec(name)?.[1];
    if (!id) continue;
    const file = path.join(directory, name);
    seen.add(file);
    const record = await parsedRecord(file, id, kind);
    // An unreadable record is reported by id, never dropped without a word.
    if (record) records.push(record); else skipped.push(id);
  }
  for (const file of listedRecords.keys()) if (path.dirname(file) === directory && !seen.has(file)) listedRecords.delete(file);
  records.sort(newestFirst);
  // An open note or a pending proposal is listed however old it is; only decided records are capped.
  const live = records.filter((record) => record.status === LIVE_STATUS[kind]);
  const decided = records.filter((record) => record.status !== LIVE_STATUS[kind]).slice(0, MAX_LISTED);
  return { records: [...live, ...decided].sort(newestFirst), skipped };
}

// Atomic write (temp + rename). A NEW record never replaces an existing id: every writer holds the
// diagram's exclusive .lock, so the absence checked here still holds at the rename. Not link(): on
// Windows a record first placed by a hard link intermittently refuses its later replacement with
// EPERM (measured at 170's verify: 14 in 1,200 against 0 in 1,200 for a renamed record).
async function recordExists(file) {
  try { await lstat(file); return true; } catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}

async function writeRecord(paths, record, { create = false } = {}) {
  const directory = path.resolve(record.kind === "request" ? paths.requests : paths.proposals);
  const body = JSON.stringify(record);
  if (byteLength(body) > MAX_RECORD_BYTES) fail("Review record is over its size limit.", "diagram-review-too-large", 413);
  await mkdir(directory, { recursive: true });
  await assertReviewStorage(paths);
  const target = path.resolve(reviewRecordPath(directory, record.id));
  const temporary = path.join(directory, `.${record.id}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, body, { mode: 0o600, flag: "wx" });
    if (create && await recordExists(target)) fail(`Review record ${record.id} already exists.`, "diagram-review-id-taken", 409);
    await rename(temporary, target);
  } finally { await removeIfPresent(temporary); }
}

const newReviewId = () => randomBytes(8).toString("hex");

export function createDiagramSceneCommand({ resolveItemExact, requireLocalCheckout, resolveWorkDiagrams = () => ({ enabled: false, formats: ["svg"] }), resolveGlobalHome = () => null }) {
  const diagramSceneCommand = {
    id: "diagram:scene",
    input: {
      type: "object",
      properties: {
        ref: { type: "string" },
        file: { type: "string" },
        action: { type: "string", enum: [...SCENE_ACTIONS] },
        baseRevision: { type: ["string", "null"] },
        scene: { type: "object" },
        text: { type: "string" },
        selectedIds: { type: "array", items: { type: "string" } },
        request: { type: "string" },
        requestId: { type: "string" },
        answer: { type: "string" },
        summary: { type: "string" },
        rationale: { type: "string" },
        proposalId: { type: "string" },
        operations: { type: "array" },
        reason: { type: "string" },
        svg: { type: "string" },
        png: { type: "string" },
      },
      required: ["ref", "file"],
      additionalProperties: false,
    },
    async run(input, ctx) {
      const ref = typeof input.ref === "string" ? input.ref.trim() : "";
      const item = await resolveItemExact(ctx, ref);
      if (!item) fail(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
      const spec = diagramFile(typeof item.dir === "string" ? item.dir : "", input.file);
      if (!spec || spec.ext !== ".excalidraw") fail("A diagram is a bare ADR-NNN-slug.excalidraw name.", "diagram-scene-file-invalid");
      const action = input.action ?? "read";
      if (!SCENE_ACTIONS.has(action)) fail("Unsupported scene action.", "diagram-scene-action-invalid");
      // An archived item is an accepted one, so `done` covers it.
      const readOnly = item.status === "done";
      if (WRITE_ACTIONS.has(action)) requireLocalCheckout(item, ref);
      // The opt-out (ADR-002) holds at the store, not only in the board: with diagrams off, the editor
      // follows the generator switch and nothing is written.
      if (WRITE_ACTIONS.has(action) && resolveWorkDiagrams(ctx?.workspace?.config ?? {}).enabled !== true) {
        fail("Diagrams are off in this project (work.diagrams), so the draft editor writes nothing.", "diagram-disabled", 409);
      }
      const projectRoot = ctx?.workspace?.projectRoot ?? ctx?.workspace?.root;
      if (action === "libraries") return { ref: item.ref, file: spec.name, items: await readLibraries(projectRoot, resolveGlobalHome()) };
      if (typeof item.dir !== "string" || item.dir.length === 0) return { ref: item.ref, file: spec.name, present: false, revision: null, scene: emptyScene(), readOnly: true };

      const file = path.resolve(spec.path);
      const diagramDir = path.dirname(file);
      await assertStorageSafe(item.dir, diagramDir, projectRoot);
      const review = diagramReviewPaths(item.dir, spec.stem);
      const architecture = await textOrNull(path.join(item.dir, "ARCHITECTURE.md")) ?? "";
      const adr = stemAdr(spec.stem);
      const paletteOf = () => readHouseStyle(projectRoot, resolveWorkDiagrams(ctx?.workspace?.config ?? {}).style);
      const readCurrent = async () => {
        const raw = await textOrNull(file, MAX_BYTES);
        if (raw === null) return { ref: item.ref, file: spec.name, present: false, revision: null, scene: emptyScene(), readOnly };
        return { ref: item.ref, file: spec.name, present: true, revision: hash(raw), scene: validateScene(parseSceneText(raw, { stored: true })), readOnly };
      };
      // A selection names Mermaid ids: nodes, subgraphs, sketches, and edge keys.
      const knownIds = (index) => new Set(Object.keys(index));
      const sceneContext = async (args, out) => {
        if (!out.present) fail("Save the diagram before requesting its context.", "diagram-scene-missing", 404);
        let selectedIds = args.selectedIds;
        let request = args.request;
        let stored = null;
        if (args.requestId !== undefined) {
          stored = await readRecord(review, "request", reviewIdInput(args.requestId, "requestId"));
          selectedIds = stored.selectedIds;
          request = stored.request;
        }
        if (request !== undefined && (typeof request !== "string" || request.length > MAX_TEXT)) fail("request must be a string of at most 10,000 characters.");
        selectedIds = [...new Set(stringArray(selectedIds ?? [], "selectedIds"))];
        const { model } = projectScene(out.scene.elements);
        const wanted = new Set(selectedIds);
        const context = {
          ref: out.ref, file: out.file, revision: out.revision, view: serializeProfile(model),
          selectedIds, whole: selectedIds.length === 0,
          selected: {
            nodes: model.nodes.filter((n) => wanted.has(n.id)), subgraphs: model.subgraphs.filter((g) => wanted.has(g.id)),
            edges: model.edges.filter((e) => wanted.has(e.key)), sketches: Object.keys(model.sketches).filter((id) => wanted.has(id)),
          },
          libraries: (await readLibraries(projectRoot, resolveGlobalHome())).map(libraryRef),
          brief: adr ? readDiagramBrief(architecture, adr) : null, architecture, request: typeof request === "string" ? request : "",
          // The house palette by role, so an emphasis is named (`link`, `accent`), never a hex value.
          palette: await paletteOf(),
        };
        // The note's whole thread, oldest first: the architect answers its latest operator turn.
        return stored ? { ...context, requestId: stored.id, requestRevision: stored.revision, thread: stored.thread } : context;
      };
      // `read` carries the palette: the editor's defaults for a shape drawn by hand come from it.
      if (action === "read") return { ...await readCurrent(), palette: await paletteOf() };
      // The directories a watcher arms: the diagrams folder, and the review folder inside it (which a
      // recursive watch on the folder also covers before it exists).
      if (action === "stamp") return { ref: item.ref, file: spec.name, scene: await statStamp(file), review: await reviewStamp(review), watch: [diagramDir, path.resolve(review.dir)] };
      if (action === "context") return sceneContext(input, await readCurrent());
      // SESSION (172/ADR-002 §1): what the architect's session is typed for a request this diagram holds
      // — or, with no request id, the batch review — and the tools it may use. A request id the diagram
      // does not hold is refused, so the board never types an invocation for a note that is not there.
      if (action === "session") {
        let requestId = null;
        if (input.requestId !== undefined) requestId = (await readRecord(review, "request", reviewIdInput(input.requestId, "requestId"))).id;
        return { ref: item.ref, file: spec.name, requestId, invocation: reviewInvocation(item.ref, spec.name, requestId), tools: [...REVIEW_SESSION_TOOLS] };
      }
      if (action === "proposals") {
        const out = await readCurrent();
        const requests = await listRecords(review, "request");
        const proposals = await listRecords(review, "proposal");
        // Listed with what the editor needs to compile one (its changes and proposed view), not its snapshot.
        const listed = proposals.records.map(({ base, snapshot, ...rest }) => rest);
        return {
          ref: out.ref, file: out.file, revision: out.revision,
          requests: requests.records, proposals: listed,
          skipped: { requests: requests.skipped, proposals: proposals.skipped },
        };
      }
      if (readOnly) fail(`${item.ref} is delivered or archived; its diagrams are immutable.`, "diagram-item-delivered", 409);
      if (!adr || !hasAdrSection(architecture, adr)) fail(`${item.ref} has no "## ${adr}" heading in its ARCHITECTURE.md.`, "diagram-adr-unknown", 404);

      // Every write runs serialized in-process AND under the diagram's exclusive .lock; `current` is the
      // diagram as it is on disk inside that lock.
      const underSceneLock = (work) => serialized(file, async () => {
        await mkdir(diagramDir, { recursive: true });
        await assertDirectoryNotSymlink(diagramDir);
        return withFileLock(file, async () => {
          await assertStorageSafe(item.dir, diagramDir, projectRoot);
          return work(await readCurrent());
        });
      });
      const writeAtomic = async (target, body, encoding) => {
        const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp`);
        try { await writeFile(temporary, body, { mode: 0o600, flag: "wx", ...(encoding ? { encoding } : {}) }); await rename(temporary, target); }
        finally { await removeIfPresent(temporary); }
      };
      // Save stamps a Mermaid id on whatever a person drew, and answers which elements it stamped. The
      // architect reads the diagram only as Mermaid (ADR-010), so a scene whose view the profile could
      // not read back is refused here, where the person sees it, rather than breaking every review.
      const writeScene = async (scene) => {
        const { elements, assigned } = assignAliases(scene.elements);
        const { model } = projectScene(elements);
        const problems = validateModel(model);
        if (!problems.length && serializeProfile(model).length > LIMITS.bytes) problems.push(`its Mermaid view is over ${LIMITS.bytes} characters.`);
        if (problems.length) fail(`Not saved: the architect reads this diagram as Mermaid, and ${problems.join(" ")}`, "diagram-scene-unviewable");
        const stamped = { ...scene, elements };
        const text = canonicalScene(stamped);
        if (byteLength(text) > MAX_BYTES) fail("The diagram is over its size limit.", "diagram-scene-too-large", 413);
        await writeAtomic(file, text, "utf8");
        return { ref: item.ref, file: spec.name, present: true, revision: hash(text), scene: stamped, assigned, readOnly: false, saved: true };
      };
      const requireSavedRevision = (current) => {
        const baseRevision = revisionInput(input.baseRevision);
        if (!current.present) fail("Save the diagram before using review actions.", "diagram-scene-missing", 404);
        if (baseRevision !== current.revision) fail("Diagram revision conflict.", "diagram-scene-conflict", 409);
        return baseRevision;
      };
      // A note answered by a proposal is no longer OPEN, so the batch review does not answer it twice
      // and the operator cannot withdraw a note the architect has already acted on.
      const markProposed = async (request, proposal) => {
        if (request.status !== "open") return;
        await writeRecord(review, { ...request, status: "proposed", proposalId: proposal.id, proposedAt: proposal.createdAt });
      };
      // A withdrawn note stays withdrawn and an answer is never overwritten: only an open note, or one a
      // proposal answered (which may be rejected and proposed for again), takes an answer or a proposal.
      const requireAnswerable = (request) => {
        if (request.status === "withdrawn" || request.status === "answered") fail(`Request ${request.id} is already ${request.status}.`, "diagram-request-decided", 409);
      };
      const requirePending = (proposal) => {
        if (proposal.status !== "pending") fail(`Proposal ${proposal.id} is already ${proposal.status}.`, "diagram-proposal-decided", 409);
      };

      if (action === "save") {
        if (!(input.baseRevision === null || (typeof input.baseRevision === "string" && REVISION.test(input.baseRevision)))) fail("baseRevision is required and must be null or a SHA-256 revision.");
        const scene = validateScene(input.scene);
        return underSceneLock((current) => {
          if (input.baseRevision !== current.revision) fail("Diagram revision conflict.", "diagram-scene-conflict", 409);
          return writeScene(scene);
        });
      }

      if (action === "request") {
        const request = boundedString(input.request, "request", MAX_TEXT);
        const selectedIds = stringArray(input.selectedIds ?? [], "selectedIds");
        return underSceneLock(async (current) => {
          const revision = requireSavedRevision(current);
          const known = knownIds(projectScene(current.scene.elements).index);
          const unknown = selectedIds.filter((id) => !known.has(id));
          if (unknown.length) fail(`The selection names ids this diagram does not have: ${unknown.join(", ")}.`, "diagram-review-selection-invalid");
          const createdAt = new Date().toISOString();
          const record = { id: newReviewId(), kind: "request", createdAt, revision, selectedIds, request, status: "open", answer: null, answeredAt: null, thread: [{ by: "operator", text: request, at: createdAt }] };
          await writeRecord(review, record, { create: true });
          // The agent invocation is not answered here: `session` answers it, from review-session.mjs (FF-6306, FF-17202).
          return { ref: item.ref, file: spec.name, request: record };
        });
      }

      if (action === "withdraw") {
        const requestId = reviewIdInput(input.requestId, "requestId");
        return underSceneLock(async () => {
          const record = await readRecord(review, "request", requestId);
          if (record.status !== "open") fail(`Request ${record.id} is already ${record.status}.`, "diagram-request-decided", 409);
          const withdrawn = { ...record, status: "withdrawn", withdrawnAt: new Date().toISOString() };
          await writeRecord(review, withdrawn);
          return { ref: item.ref, file: spec.name, request: withdrawn };
        });
      }

      if (action === "respond") {
        const requestId = reviewIdInput(input.requestId, "requestId");
        const answer = boundedString(input.answer, "answer", MAX_TEXT);
        return underSceneLock(async () => {
          const record = await readRecord(review, "request", requestId);
          requireAnswerable(record);
          // The architect's turn on the thread; `answer` stays the latest architect turn for every reader.
          const answeredAt = new Date().toISOString();
          const answered = { ...record, status: "answered", answer, answeredAt, thread: [...record.thread, { by: "architect", text: answer, at: answeredAt }] };
          await writeRecord(review, answered);
          return { ref: item.ref, file: spec.name, request: answered };
        });
      }

      // A REPLY (171/ADR-006): the operator's next turn on the note's thread. It reopens the note — one a
      // proposal closed too, leaving that proposal as it is — so the batch review takes it again.
      if (action === "reply") {
        const requestId = reviewIdInput(input.requestId, "requestId");
        const text = boundedString(input.text, "text", MAX_TEXT);
        return underSceneLock(async () => {
          const record = await readRecord(review, "request", requestId);
          if (record.status === "withdrawn") fail(`Request ${record.id} is already withdrawn.`, "diagram-request-decided", 409);
          const at = new Date().toISOString();
          const reopened = { ...record, status: "open", repliedAt: at, thread: [...record.thread, { by: "operator", text, at }] };
          await writeRecord(review, reopened);
          return { ref: item.ref, file: spec.name, request: reopened };
        });
      }

      // A PROPOSAL is the Mermaid view as the architect would have it. Its changes are the difference
      // from the view of the diagram now; the elements they touch are snapshotted, so accept can refuse
      // what a person changed since. Sketch lines are the person's and never change through a proposal.
      if (action === "propose") {
        const requestId = reviewIdInput(input.requestId, "requestId");
        const summary = boundedString(input.summary, "summary", MAX_SUMMARY);
        const rationale = boundedString(input.rationale, "rationale", MAX_TEXT);
        const proposed = profileModel(input.text);
        const fill = await nodeStyleOf(await paletteOf());
        return underSceneLock(async (current) => {
          const baseRevision = requireSavedRevision(current);
          const request = await readRecord(review, "request", requestId);
          requireAnswerable(request);
          const { model: base, index } = projectScene(current.scene.elements);
          // The house style (171/ADR-004) fills in every node this proposal ADDS that names no style of
          // its own and is no library item — in the stored text and its changes, so Preview and the
          // record say what will be drawn. A first draft adds every node, so it is covered too.
          if (fill) {
            const existing = new Set(base.nodes.map((n) => n.id));
            for (const node of proposed.nodes) if (!existing.has(node.id) && !proposed.styles[node.id] && !proposed.libs[node.id]) proposed.styles[node.id] = { ...fill };
          }
          // A node always has a place and keeps its library item, so a proposal that leaves out a node's
          // `%% aof:node` or `%% aof:lib` line leaves it as it is; only removing the node removes them.
          const kept = new Set(proposed.nodes.map((n) => n.id));
          const changes = diffModels(base, proposed).filter(({ key, change }) => {
            if (key.startsWith("path:") || key === "direction") return false;
            if (change === "removed" && (key.startsWith("layout:") || key.startsWith("lib:")) && kept.has(key.slice(key.indexOf(":") + 1))) return false;
            return true;
          });
          if (changes.length === 0) fail("The proposal changes nothing; use respond for an answer without a change.", "diagram-proposal-invalid");
          for (const { key, change } of changes) {
            if (!key.startsWith("lib:")) continue;
            const id = key.slice(4);
            if (change !== "added" || base.nodes.some((n) => n.id === id)) fail(`A node's library item cannot change ("${id}"); remove the node and add a new one.`, "diagram-proposal-invalid");
          }
          const libraries = await readLibraries(projectRoot, resolveGlobalHome());
          for (const [id, lib] of Object.entries(proposed.libs)) {
            if (base.libs[id]) continue;
            const matches = libraries.filter((entry) => entry.library === lib.library && entry.item === lib.item);
            if (matches.length !== 1) fail(`${libraryRef(lib)} ${matches.length ? "names more than one" : "is not an"} item in the libraries (the project's ${path.relative(projectRoot, diagramLibrariesDir(projectRoot)).split(path.sep).join("/")}, or the global home's diagrams/libraries).`, "diagram-library-unknown");
          }
          const snapshot = {};
          const byId = new Map(current.scene.elements.map((e) => [e.id, e]));
          for (const elementId of touchedElements(changes, base, index, proposed)) if (byId.has(elementId)) snapshot[elementId] = byId.get(elementId);
          const text = serializeProfile(proposed);
          const proposal = {
            id: newReviewId(), kind: "proposal", requestId, createdAt: new Date().toISOString(), baseRevision, summary, rationale,
            base: serializeProfile(base), text, changes, snapshot, status: "pending", decidedAt: null, acceptedRevision: null, reason: null,
          };
          if (byteLength(JSON.stringify(proposal)) > MAX_RECORD_BYTES) fail("The proposal is over its size limit.", "diagram-review-too-large", 413);
          await writeRecord(review, proposal, { create: true });
          await markProposed(request, proposal);
          const { base: _base, snapshot: _snapshot, ...listed } = proposal;
          return { ref: item.ref, file: spec.name, proposal: listed };
        });
      }

      // ACCEPT applies the element operations the editor compiled from the proposal's changes. It refuses
      // as stale, naming the Mermaid ids, if a person changed any element the proposal touches since it
      // was made; and it refuses an operation that reaches outside those elements.
      if (action === "accept") {
        const proposalId = reviewIdInput(input.proposalId, "proposalId");
        return underSceneLock(async (current) => {
          const proposal = await readRecord(review, "proposal", proposalId);
          requirePending(proposal);
          requireSavedRevision(current);
          if (!plainObject(proposal.snapshot)) fail(`Proposal ${proposal.id} carries no element snapshot.`, "diagram-review-corrupt", 409);
          const byId = new Map(current.scene.elements.map((e) => [e.id, e]));
          const changed = Object.keys(proposal.snapshot).filter((id) => !deepEqual(byId.get(id) ?? null, proposal.snapshot[id]));
          if (changed.length > 0) {
            const { index } = projectScene(current.scene.elements);
            const owners = [...new Set(changed.map((elementId) => Object.entries(index).find(([, entry]) => entry.elementIds.includes(elementId))?.[0] ?? elementId))];
            const error = commandError(`Proposal is stale; these changed since it was made: ${owners.join(", ")}.`, "diagram-proposal-stale", 409);
            error.details = { conflicts: owners };
            throw error;
          }
          if (!Array.isArray(input.operations) || !validJsonTree(input.operations)) fail("accept needs the editor's element operations, as plain JSON.", "diagram-proposal-invalid");
          const elements = applyOperations(current.scene.elements, input.operations, new Set(Object.keys(proposal.snapshot)));
          requireAdditionsProposed(elements, input.operations, proposal.changes);
          const saved = await writeScene(validateScene({ ...current.scene, elements }));
          const accepted = { ...proposal, status: "accepted", decidedAt: new Date().toISOString(), acceptedRevision: saved.revision };
          await writeRecord(review, accepted);
          const { base: _base, snapshot: _snapshot, ...listed } = accepted;
          return { ...saved, proposal: listed };
        });
      }

      // PUBLISH: the editor exports the SVG — and the PNG when `work.diagrams.formats` owes one — from the
      // canvas, and this writes them where the ADR's block links. It answers that block: the architect
      // pastes it under the ADR (the single writer of ARCHITECTURE.md).
      if (action === "publish") {
        if (typeof input.svg !== "string" || byteLength(input.svg) > MAX_SVG || !SVG_DOCUMENT.test(input.svg)) fail("svg must be one SVG document of at most 4 MB.", "diagram-publish-invalid");
        const owed = resolveWorkDiagrams(ctx?.workspace?.config ?? {});
        const formats = owed.enabled && Array.isArray(owed.formats) && owed.formats.length ? owed.formats : ["svg"];
        let png = null;
        if (formats.includes("png")) {
          if (typeof input.png !== "string") fail("This project owes a PNG beside the SVG; publish with png.", "diagram-publish-invalid");
          png = Buffer.from(input.png, "base64");
          if (png.length > MAX_PNG || !png.subarray(0, 8).equals(PNG_MAGIC)) fail("png must be one base64 PNG of at most 6 MB.", "diagram-publish-invalid");
        }
        return underSceneLock(async (current) => {
          const revision = requireSavedRevision(current);
          const paths = diagramPaths(item.dir, spec.stem, ".excalidraw", formats);
          await writeAtomic(path.resolve(paths.svg), input.svg, "utf8");
          if (png) await writeAtomic(path.resolve(paths.png), png);
          const written = [paths.svg, ...(png ? [paths.png] : [])].map((target) => path.relative(item.dir, path.resolve(target)).split(path.sep).join("/"));
          const block = renderDiagramBlock({ adrId: adr, title: readAdrTitle(architecture, adr) ?? adr, stem: spec.stem, sourceExt: ".excalidraw", formats });
          return { ref: item.ref, file: spec.name, revision, written, block };
        });
      }

      // reject
      const proposalId = reviewIdInput(input.proposalId, "proposalId");
      const reason = input.reason === undefined ? null : boundedString(input.reason, "reason", MAX_REASON, { min: 0 });
      return underSceneLock(async () => {
        const proposal = await readRecord(review, "proposal", proposalId);
        requirePending(proposal);
        const rejected = { ...proposal, status: "rejected", decidedAt: new Date().toISOString(), reason };
        await writeRecord(review, rejected);
        const { base: _base, snapshot: _snapshot, ...listed } = rejected;
        return { ref: item.ref, file: spec.name, proposal: listed };
      });
    },
    cli: {
      route: ["diagram", "scene"],
      spec: { usage: "aof diagram scene <ref> <ADR-NNN-slug.excalidraw> [--action read|save|context|request|withdraw|respond|reply|propose|proposals|accept|reject|publish|libraries|stamp|session] [--input path] [--json]", flags: { action: { type: "string", description: "read, save, context, request, withdraw, respond, reply, propose, proposals, accept, reject, publish, libraries, stamp, or session" }, input: { type: "string", description: "JSON request file (scene, text, selectedIds, requestId, proposalId, operations, svg, png, …)" } } },
      argv: (positionals, options) => {
        let extra = {};
        if (options.input) { const raw = readFileSync(options.input, "utf8"); if (byteLength(raw) > MAX_RECORD_BYTES + MAX_SVG + MAX_PNG * 2) fail("Input is too large.", "diagram-scene-too-large", 413); extra = JSON.parse(raw); if (!plainObject(extra)) fail("Input JSON must be an object."); }
        return { ...extra, ref: positionals[0], file: positionals[1], action: options.action ?? extra.action ?? "read" };
      },
      render: (result) => JSON.stringify(result),
      json: (result) => result,
    },
  };
  return { diagramSceneCommand };
}
