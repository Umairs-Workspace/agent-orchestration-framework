import { link, lstat, mkdir, open, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { diagramFile, diagramReviewPaths, hasAdrSection, isReviewId, readDiagramBrief, reviewRecordPath, stemAdr } from "../../diagrams/layout.mjs";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ELEMENTS = 5000;
const MAX_FILES = 5000;
const ELEMENT_TYPES = new Set(["text", "rectangle", "diamond", "ellipse", "line", "arrow", "freedraw", "image", "frame", "embeddable", "iframe", "magicframe"]);
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_RECORD_BYTES = 1024 * 1024;
const MAX_TEXT = 10000;
const MAX_SUMMARY = 500;
const MAX_REASON = 2000;
const MAX_OPERATIONS = 500;
const MAX_LISTED = 50;
const SCENE_ACTIONS = new Set(["read", "save", "context", "request", "respond", "propose", "proposals", "accept", "reject"]);
const WRITE_ACTIONS = new Set(["save", "request", "respond", "propose", "accept", "reject"]);
const REVISION = /^[0-9a-f]{64}$/;
const RECORD_FILE = /^([a-z0-9]{8,32})\.json$/;
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


// ---- plain-JSON helpers -------------------------------------------------------------------------

// Structural equality over plain JSON (key order does not matter, array order does).
function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((entry, index) => deepEqual(entry, b[index]));
  if (!plainObject(a) || !plainObject(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
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

// ---- review operations --------------------------------------------------------------------------

// Checks the shape of the proposed operations against the base elements (no mutation).
function validateOperations(operations, baseElements) {
  if (!Array.isArray(operations) || operations.length === 0) fail("operations must be a non-empty array; use respond for an answer without changes.", "diagram-proposal-invalid");
  if (operations.length > MAX_OPERATIONS) fail(`operations are limited to ${MAX_OPERATIONS}.`, "diagram-proposal-invalid");
  const byId = new Map(baseElements.map((element) => [element.id, element]));
  const touched = new Set();
  for (const operation of operations) {
    if (!plainObject(operation)) fail("Each operation must be an object.", "diagram-proposal-invalid");
    const id = operation.op === "add" ? operation.element?.id : operation.id;
    if (typeof id !== "string" || id.length === 0) fail("Each operation must name an element id.", "diagram-proposal-invalid");
    if (touched.has(id)) fail(`Element "${id}" appears in more than one operation.`, "diagram-proposal-invalid");
    touched.add(id);
    if (operation.op === "add") {
      if (!plainObject(operation.element)) fail("add requires an element object.", "diagram-proposal-invalid");
      if (byId.has(id)) fail(`Cannot add "${id}": it already exists in the scene.`, "diagram-proposal-invalid");
    } else if (operation.op === "update") {
      if (!plainObject(operation.patch) || Object.keys(operation.patch).length === 0) fail("update requires a non-empty patch object.", "diagram-proposal-invalid");
      if (Object.hasOwn(operation.patch, "id")) fail("A patch may not contain id.", "diagram-proposal-invalid");
      if (!byId.has(id) || byId.get(id).isDeleted === true) fail(`Cannot update "${id}": no such live element.`, "diagram-proposal-invalid");
    } else if (operation.op === "delete") {
      if (!byId.has(id)) fail(`Cannot delete "${id}": no such element.`, "diagram-proposal-invalid");
    } else {
      fail("operation.op must be add, update or delete.", "diagram-proposal-invalid");
    }
  }
  return touched;
}

// Returns a new element list with the operations applied; every other element is untouched.
// Excalidraw reconciles elements by version/versionNonce; a changed element must look changed.
function bumped(next, previous) {
  const version = Number.isInteger(previous.version) ? previous.version + 1 : 1;
  return { ...next, version, versionNonce: randomBytes(4).readUInt32BE(0), updated: Date.now() };
}

function applyOperations(elements, operations) {
  const updates = new Map();
  const additions = [];
  for (const operation of operations) {
    if (operation.op === "add") additions.push(operation.element);
    else if (operation.op === "update") updates.set(operation.id, (element) => bumped({ ...element, ...operation.patch }, element));
    else updates.set(operation.id, (element) => bumped({ ...element, isDeleted: true }, element));
  }
  return [...elements.map((element) => (updates.has(element.id) ? updates.get(element.id)(element) : element)), ...additions];
}

function baseElementsFor(elements, touched) {
  const byId = new Map(elements.map((element) => [element.id, element]));
  return Object.fromEntries([...touched].map((id) => [id, byId.get(id) ?? null]));
}

// The ids whose CURRENT element no longer matches what the proposal was made against.
function staleConflicts(elements, baseElements) {
  const byId = new Map(elements.map((element) => [element.id, element]));
  return Object.keys(baseElements).filter((id) => !deepEqual(byId.get(id) ?? null, baseElements[id]));
}

// ---- review record storage ----------------------------------------------------------------------

async function assertReviewStorage(paths) {
  for (const directory of [paths.dir, paths.requests, paths.proposals]) await assertDirectoryNotSymlink(path.resolve(directory), true);
}

async function readRecordText(file) {
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) fail("Review storage must be a regular file.", "diagram-review-storage-invalid", 409);
    if (stat.size > MAX_RECORD_BYTES) fail("Review record exceeds the 1MB limit.", "diagram-review-too-large", 413);
    return await readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
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
  if (plainObject(record) && record.id === id && record.kind === kind) return record;
  return fail(`Stored ${kind} is invalid.`, "diagram-review-corrupt", 409);
}

async function listRecords(paths, kind) {
  await assertReviewStorage(paths);
  const directory = path.resolve(kind === "request" ? paths.requests : paths.proposals);
  let names;
  try { names = await readdir(directory); } catch (error) { if (error?.code === "ENOENT") return { records: [], skipped: [] }; throw error; }
  const records = [];
  const skipped = [];
  for (const name of names) {
    const id = RECORD_FILE.exec(name)?.[1];
    if (!id) continue;
    const text = await readRecordText(path.join(directory, name));
    // An unreadable record is reported by id, never dropped without a word.
    let record = null;
    try {
      record = JSON.parse(text);
    } catch {
      skipped.push(id);
      continue;
    }
    if (plainObject(record) && record.id === id && record.kind === kind) records.push(record);
    else skipped.push(id);
  }
  records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || b.id.localeCompare(a.id));
  return { records: records.slice(0, MAX_LISTED), skipped };
}

// Atomic write (temp + rename). A NEW record is linked into place so an existing id is never replaced.
async function writeRecord(paths, record, { create = false } = {}) {
  const directory = path.resolve(record.kind === "request" ? paths.requests : paths.proposals);
  const body = JSON.stringify(record);
  if (byteLength(body) > MAX_RECORD_BYTES) fail("Review record exceeds the 1MB limit.", "diagram-review-too-large", 413);
  await mkdir(directory, { recursive: true });
  await assertReviewStorage(paths);
  const target = path.resolve(reviewRecordPath(directory, record.id));
  const temporary = path.join(directory, `.${record.id}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, body, { mode: 0o600, flag: "wx" });
    if (create) await link(temporary, target); else await rename(temporary, target);
  } finally { await removeIfPresent(temporary); }
}

const newReviewId = () => randomBytes(8).toString("hex");

export function createDiagramSceneCommand({ resolveItemExact, requireLocalCheckout }) {
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
        selectedIds: { type: "array", items: { type: "string" } },
        request: { type: "string" },
        requestId: { type: "string" },
        answer: { type: "string" },
        summary: { type: "string" },
        rationale: { type: "string" },
        operations: { type: "array" },
        proposalId: { type: "string" },
        reason: { type: "string" },
      },
      required: ["ref", "file"],
      additionalProperties: false,
    },
    async run(input, ctx) {
      const ref = typeof input.ref === "string" ? input.ref.trim() : "";
      const item = await resolveItemExact(ctx, ref);
      if (!item) fail(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
      const spec = diagramFile(typeof item.dir === "string" ? item.dir : "", input.file);
      if (!spec || spec.ext !== ".excalidraw") fail("Scene file must be a bare ADR-NNN-slug.excalidraw name.", "diagram-scene-file-invalid");
      const action = input.action ?? "read";
      if (!SCENE_ACTIONS.has(action)) fail("Unsupported scene action.", "diagram-scene-action-invalid");
      // An archived item is an accepted one, so `done` covers it.
      const readOnly = item.status === "done";
      const writing = WRITE_ACTIONS.has(action);
      if (writing) requireLocalCheckout(item, ref);
      if (typeof item.dir !== "string" || item.dir.length === 0) return { ref: item.ref, file: spec.name, present: false, revision: null, scene: cloneEmpty(), readOnly: true };

      const file = path.resolve(spec.path);
      const diagramDir = path.dirname(file);
      const projectRoot = ctx?.workspace?.projectRoot ?? ctx?.workspace?.root;
      await assertStorageSafe(item.dir, diagramDir, projectRoot);
      const review = diagramReviewPaths(item.dir, spec.stem);
      const architecture = await textOrNull(path.join(item.dir, "ARCHITECTURE.md")) ?? "";
      const adr = stemAdr(spec.stem);
      const readCurrent = async () => {
        const raw = await textOrNull(file, MAX_BYTES);
        if (raw === null) return { ref: item.ref, file: spec.name, present: false, revision: null, scene: cloneEmpty(), readOnly };
        return { ref: item.ref, file: spec.name, present: true, revision: hash(raw), scene: validateScene(parseScene(raw, true)), readOnly };
      };
      const sceneContext = async (args, out) => {
        if (!out.present) fail("Save an empty scene before requesting scene context.", "diagram-scene-missing", 404);
        let selectedIds = args.selectedIds;
        let request = args.request;
        let stored = null;
        if (args.requestId !== undefined) {
          stored = await readRecord(review, "request", reviewIdInput(args.requestId, "requestId"));
          selectedIds = stored.selectedIds;
          request = stored.request;
        }
        if (request !== undefined && (typeof request !== "string" || request.length > MAX_TEXT)) fail("request must be a string of at most 10,000 characters.");
        selectedIds = stringArray(selectedIds, "selectedIds");
        const selected = new Set(selectedIds);
        const live = out.scene.elements.filter((element) => element.isDeleted !== true);
        const elements = selected.size ? live.filter((element) => selected.has(element.id)) : live;
        const context = { ref: out.ref, file: out.file, revision: out.revision, selectedIds: [...selected], elements, brief: adr ? readDiagramBrief(architecture, adr) : null, architecture, request: typeof request === "string" ? request : "" };
        return stored ? { ...context, requestId: stored.id, requestRevision: stored.revision } : context;
      };
      if (action === "read") return readCurrent();
      if (action === "context") return sceneContext(input, await readCurrent());
      if (action === "proposals") {
        const out = await readCurrent();
        const requests = await listRecords(review, "request");
        const proposals = await listRecords(review, "proposal");
        return {
          ref: out.ref, file: out.file, revision: out.revision,
          requests: requests.records, proposals: proposals.records,
          skipped: { requests: requests.skipped, proposals: proposals.skipped },
        };
      }
      if (readOnly) fail(`${item.ref} is delivered or archived; scene drafts are immutable.`, "diagram-item-delivered", 409);
      if (!adr || !hasAdrSection(architecture, adr)) fail(`${item.ref} has no "## ${adr}" heading in its ARCHITECTURE.md.`, "diagram-adr-unknown", 404);

      // Every write runs serialized in-process AND under the scene's exclusive .lock; `current` is the
      // scene as it is on disk inside that lock.
      const underSceneLock = (work) => serialized(file, async () => {
        await mkdir(diagramDir, { recursive: true });
        await assertDirectoryNotSymlink(diagramDir);
        return withFileLock(file, async () => {
          await assertStorageSafe(item.dir, diagramDir, projectRoot);
          return work(await readCurrent());
        });
      });
      const writeScene = async (scene) => {
        const body = JSON.stringify(scene);
        if (byteLength(body) > MAX_BYTES) fail("Scene exceeds the 2MB limit.", "diagram-scene-too-large", 413);
        const temporary = path.join(diagramDir, `.${spec.name}.${randomUUID()}.tmp`);
        try { await writeFile(temporary, body, { mode: 0o600, flag: "wx" }); await rename(temporary, file); }
        finally { await removeIfPresent(temporary); }
        return { ref: item.ref, file: spec.name, present: true, revision: hash(body), scene, readOnly: false, saved: true };
      };
      const requireSavedRevision = (current) => {
        const baseRevision = revisionInput(input.baseRevision);
        if (!current.present) fail("Save an empty scene before using review actions.", "diagram-scene-missing", 404);
        if (baseRevision !== current.revision) fail("Scene revision conflict.", "diagram-scene-conflict", 409);
        return baseRevision;
      };
      const requirePending = (proposal) => {
        if (proposal.status !== "pending") fail(`Proposal ${proposal.id} is already ${proposal.status}.`, "diagram-proposal-decided", 409);
      };

      if (action === "save") {
        if (!(input.baseRevision === null || (typeof input.baseRevision === "string" && REVISION.test(input.baseRevision)))) fail("baseRevision is required and must be null or a SHA-256 revision.");
        const scene = validateScene(input.scene);
        if (byteLength(JSON.stringify(scene)) > MAX_BYTES) fail("Scene exceeds the 2MB limit.", "diagram-scene-too-large", 413);
        return underSceneLock((current) => {
          if (input.baseRevision !== current.revision) fail("Scene revision conflict.", "diagram-scene-conflict", 409);
          return writeScene(scene);
        });
      }

      if (action === "request") {
        const request = boundedString(input.request, "request", MAX_TEXT);
        const selectedIds = stringArray(input.selectedIds, "selectedIds");
        return underSceneLock(async (current) => {
          const revision = requireSavedRevision(current);
          const record = { id: newReviewId(), kind: "request", createdAt: new Date().toISOString(), revision, selectedIds, request, status: "open", answer: null, answeredAt: null };
          await writeRecord(review, record, { create: true });
          // The agent invocation is composed by the board (apps/ui), beside its other phase commands:
          // exactly one src module authors slash commands (FF-6306).
          return { ref: item.ref, file: spec.name, request: record };
        });
      }

      if (action === "respond") {
        const requestId = reviewIdInput(input.requestId, "requestId");
        const answer = boundedString(input.answer, "answer", MAX_TEXT);
        return underSceneLock(async () => {
          const record = await readRecord(review, "request", requestId);
          const answered = { ...record, status: "answered", answer, answeredAt: new Date().toISOString() };
          await writeRecord(review, answered);
          return { ref: item.ref, file: spec.name, request: answered };
        });
      }

      if (action === "propose") {
        const requestId = reviewIdInput(input.requestId, "requestId");
        const summary = boundedString(input.summary, "summary", MAX_SUMMARY);
        const rationale = boundedString(input.rationale, "rationale", MAX_TEXT);
        if (!Array.isArray(input.operations) || !validJsonTree(input.operations)) fail("operations must be an array of plain JSON operations.", "diagram-proposal-invalid");
        return underSceneLock(async (current) => {
          const baseRevision = requireSavedRevision(current);
          await readRecord(review, "request", requestId);
          const touched = validateOperations(input.operations, current.scene.elements);
          validateScene({ ...current.scene, elements: applyOperations(current.scene.elements, input.operations) });
          const proposal = {
            id: newReviewId(), kind: "proposal", requestId, createdAt: new Date().toISOString(), baseRevision, summary, rationale,
            operations: input.operations, baseElements: baseElementsFor(current.scene.elements, touched),
            status: "pending", decidedAt: null, acceptedRevision: null, reason: null,
          };
          await writeRecord(review, proposal, { create: true });
          return { ref: item.ref, file: spec.name, proposal };
        });
      }

      if (action === "accept") {
        const proposalId = reviewIdInput(input.proposalId, "proposalId");
        return underSceneLock(async (current) => {
          const proposal = await readRecord(review, "proposal", proposalId);
          requirePending(proposal);
          requireSavedRevision(current);
          const conflicts = staleConflicts(current.scene.elements, proposal.baseElements);
          if (conflicts.length > 0) {
            const error = commandError(`Proposal is stale; these elements changed since it was made: ${conflicts.join(", ")}.`, "diagram-proposal-stale", 409);
            error.details = { conflicts };
            throw error;
          }
          const merged = validateScene({ ...current.scene, elements: applyOperations(current.scene.elements, proposal.operations) });
          const saved = await writeScene(merged);
          const accepted = { ...proposal, status: "accepted", decidedAt: new Date().toISOString(), acceptedRevision: saved.revision };
          await writeRecord(review, accepted);
          return { ...saved, proposal: accepted };
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
        return { ref: item.ref, file: spec.name, proposal: rejected };
      });
    },
    cli: {
      route: ["diagram", "scene"],
      spec: { usage: "aof diagram scene <ref> <ADR-NNN-slug.excalidraw> [--action read|save|context|request|respond|propose|proposals|accept|reject] [--input path] [--json]", flags: { action: { type: "string", description: "read, save, context, request, respond, propose, proposals, accept, or reject" }, input: { type: "string", description: "JSON request file (scene, selectedIds, requestId, operations, proposalId, …)" } } },
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
