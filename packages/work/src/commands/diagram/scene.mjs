import { lstat, mkdir, open, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { diagramFile, hasAdrSection, readDiagramBrief, stemAdr } from "../../diagrams/layout.mjs";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ELEMENTS = 5000;
const MAX_FILES = 5000;
const ELEMENT_TYPES = new Set(["text", "rectangle", "diamond", "ellipse", "line", "arrow", "freedraw", "image", "frame", "embeddable", "iframe", "magicframe"]);
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const locks = new Map();
const EMPTY = Object.freeze({ type: "excalidraw", version: 2, source: "aof", elements: [], appState: {}, files: {} });

const hash = (text) => createHash("sha256").update(text).digest("hex");
const byteLength = (text) => Buffer.byteLength(text, "utf8");
const plainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const fail = (message, code = "diagram-scene-invalid", status = 400) => { throw commandError(message, code, status); };
const cloneEmpty = () => ({ ...EMPTY, elements: [], appState: {}, files: {} });

function validJsonTree(value, depth = 0) {
  if (depth > 60) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((entry) => validJsonTree(entry, depth + 1));
  if (!plainObject(value) || Object.keys(value).some((key) => DANGEROUS_KEYS.has(key))) return false;
  return Object.values(value).every((entry) => validJsonTree(entry, depth + 1));
}

function parseScene(text, stored = false) {
  if (byteLength(text) > MAX_BYTES) fail("Scene exceeds the 2MB limit.", "diagram-scene-too-large", 413);
  try { return JSON.parse(text); } catch { fail(stored ? "Stored scene is invalid." : "Scene must be valid JSON.", stored ? "diagram-scene-corrupt" : "diagram-scene-invalid", stored ? 409 : 400); }
}

function validateScene(scene) {
  if (!validJsonTree(scene) || !plainObject(scene) || scene.type !== "excalidraw" || scene.version !== 2
    || !Array.isArray(scene.elements) || !plainObject(scene.appState) || !plainObject(scene.files)) {
    fail("Scene must be a plain finite Excalidraw version 2 scene.");
  }
  if (scene.elements.length > MAX_ELEMENTS || Object.keys(scene.files).length > MAX_FILES) fail("Scene has too many elements or files.", "diagram-scene-too-large", 413);
  const ids = new Set();
  for (const element of scene.elements) {
    if (!plainObject(element) || typeof element.id !== "string" || element.id.length === 0 || element.id.length > 200 || ids.has(element.id)) fail("Scene elements require unique string ids.");
    if (!ELEMENT_TYPES.has(element.type)) fail("Scene contains an unsupported element type.");
    for (const field of ["x", "y", "width", "height"]) {
      if (!Number.isFinite(element[field])) fail(`Scene element ${field} must be finite.`);
    }
    if (element.width < 0 || element.height < 0) fail("Scene element dimensions cannot be negative.");
    ids.add(element.id);
  }
  return { type: "excalidraw", version: 2, source: "aof", elements: scene.elements, appState: scene.appState, files: scene.files };
}

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
    if (limitBytes !== null && stat.size > limitBytes) fail("Scene exceeds the 2MB limit.", "diagram-scene-too-large", 413);
    return await readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function withFileLock(file, work) {
  const lock = `${file}.lock`;
  let handle;
  try { handle = await open(lock, "wx", 0o600); }
  catch (error) { if (error?.code === "EEXIST") fail("Scene is locked by another writer; retry later.", "diagram-scene-locked", 409); throw error; }
  try { return await work(); } finally { await handle.close(); await unlink(lock).catch(() => {}); }
}

export function createDiagramSceneCommand({ resolveItemExact, requireLocalCheckout }) {
  const diagramSceneCommand = {
    id: "diagram:scene",
    input: { type: "object", properties: { ref: { type: "string" }, file: { type: "string" }, action: { type: "string" }, baseRevision: { type: ["string", "null"] }, scene: { type: "object" }, selectedIds: { type: "array" }, request: { type: "string" } }, required: ["ref", "file"], additionalProperties: false },
    async run(input, ctx) {
      const ref = typeof input.ref === "string" ? input.ref.trim() : "";
      const item = await resolveItemExact(ctx, ref);
      if (!item) fail(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
      const spec = diagramFile(typeof item.dir === "string" ? item.dir : "", input.file);
      if (!spec || spec.ext !== ".excalidraw") fail("Scene file must be a bare ADR-NNN-slug.excalidraw name.", "diagram-scene-file-invalid");
      const action = input.action ?? "read";
      if (!new Set(["read", "save", "context"]).has(action)) fail("Unsupported scene action.", "diagram-scene-action-invalid");
      const readOnly = item.status === "done" || item.archived === true;
      if (action === "save") requireLocalCheckout(item, ref);
      if (typeof item.dir !== "string" || item.dir.length === 0) return { ref: item.ref, file: spec.name, present: false, revision: null, scene: cloneEmpty(), readOnly: true };

      const file = path.resolve(spec.path);
      const diagramDir = path.dirname(file);
      await assertStorageSafe(item.dir, diagramDir, ctx?.workspace?.projectRoot ?? ctx?.workspace?.root);
      const architecture = await textOrNull(path.join(item.dir, "ARCHITECTURE.md")) ?? "";
      const adr = stemAdr(spec.stem);
      const envelope = async () => {
        const raw = await textOrNull(file, MAX_BYTES);
        if (raw === null) return { ref: item.ref, file: spec.name, present: false, revision: null, scene: cloneEmpty(), readOnly };
        return { ref: item.ref, file: spec.name, present: true, revision: hash(raw), scene: validateScene(parseScene(raw, true)), readOnly };
      };
      if (action === "read") return envelope();
      if (action === "context") {
        if (input.request !== undefined && (typeof input.request !== "string" || input.request.length > 10000)) fail("request must be a string of at most 10,000 characters.");
        const out = await envelope();
        if (!out.present) fail("Save an empty scene before requesting scene context.", "diagram-scene-missing", 404);
        if (!Array.isArray(input.selectedIds) || input.selectedIds.some((id) => typeof id !== "string") || input.selectedIds.length > 10000) fail("selectedIds must be an array of at most 10,000 strings.");
        const selected = new Set(input.selectedIds);
        const elements = selected.size ? out.scene.elements.filter((element) => selected.has(element.id) && element.isDeleted !== true) : out.scene.elements.filter((element) => element.isDeleted !== true);
        return { ref: out.ref, file: out.file, revision: out.revision, selectedIds: [...selected], elements, brief: adr ? readDiagramBrief(architecture, adr) : null, architecture, request: typeof input.request === "string" ? input.request : "" };
      }
      if (readOnly) fail(`${item.ref} is delivered or archived; scene drafts are immutable.`, "diagram-item-delivered", 409);
      if (!adr || !hasAdrSection(architecture, adr)) fail(`${item.ref} has no "## ${adr}" heading in its ARCHITECTURE.md.`, "diagram-adr-unknown", 404);
      if (!(input.baseRevision === null || (typeof input.baseRevision === "string" && /^[0-9a-f]{64}$/.test(input.baseRevision)))) fail("baseRevision is required and must be null or a SHA-256 revision.");
      const scene = validateScene(input.scene);
      const body = JSON.stringify(scene);
      if (byteLength(body) > MAX_BYTES) fail("Scene exceeds the 2MB limit.", "diagram-scene-too-large", 413);
      return serialized(file, async () => {
        await mkdir(diagramDir, { recursive: true });
        await assertDirectoryNotSymlink(diagramDir);
        return withFileLock(file, async () => {
        await assertStorageSafe(item.dir, diagramDir, ctx?.workspace?.projectRoot ?? ctx?.workspace?.root);
        const before = await textOrNull(file, MAX_BYTES);
        const revision = before === null ? null : hash(before);
        if (input.baseRevision !== revision) fail("Scene revision conflict.", "diagram-scene-conflict", 409);
        const temporary = path.join(diagramDir, `.${spec.name}.${randomUUID()}.tmp`);
        try { await writeFile(temporary, body, { mode: 0o600, flag: "wx" }); await rename(temporary, file); }
        finally { await unlink(temporary).catch(() => {}); }
        return { ref: item.ref, file: spec.name, present: true, revision: hash(body), scene, readOnly: false, saved: true };
      });
      });
    },
    cli: {
      route: ["diagram", "scene"],
      spec: { usage: "aof diagram scene <ref> <ADR-NNN-slug.excalidraw> [--action read|save|context] [--input path] [--json]", flags: { action: { type: "string", description: "read, save, or context" }, input: { type: "string", description: "JSON scene request file" } } },
      argv: (positionals, options) => {
        let extra = {};
        if (options.input) { const raw = readFileSync(options.input, "utf8"); if (byteLength(raw) > MAX_BYTES) fail("Input exceeds the 2MB limit.", "diagram-scene-too-large", 413); extra = JSON.parse(raw); if (!plainObject(extra)) fail("Input JSON must be an object."); }
        return { ...extra, ref: positionals[0], file: positionals[1], action: options.action ?? extra.action ?? "read" };
      },
      render: (result) => JSON.stringify(result),
      json: (result) => result,
    },
  };
  return { diagramSceneCommand };
}
