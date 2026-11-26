import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync, utimesSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { RECORD_DOC_BY_TYPE } from "../../../../packages/work/src/identity.mjs";
import { BOARD_KEY_FILE } from "../../../../packages/work/src/store/board-links.mjs";

const seed = JSON.parse(readFileSync(new URL("./seed.json", import.meta.url)));
const templates = fileURLToPath(new URL("../../../../.aof/templates/work/", import.meta.url));
const seedDate = "2026-01-15";
const seedTime = new Date(seedDate);
const docs = new Set(["ARCHITECTURE", "RETROSPECTIVE", "VERIFICATION", "EXECUTION", "EXAMPLES", "OUTCOME", "STATE"]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
// 209/05 — the board a case selects, named by AOF_WORK_STREAM_STORE. `azure` is the shipped Azure
// definition over the recorded board; `alternate` is a second, project-owned in-memory board.
const BOARD_STORES = Object.freeze({
  azure: { definition: "../../../../.aof/boards/azure-devops/board.yaml", adapter: "./board-adapter.mjs", factory: "azure" },
  alternate: { definition: "./alternate-board.yaml", adapter: "./alternate-board.mjs", factory: "alternate" },
});
const BOARD_MANIFEST = ".aof/boards/board.yaml";
// The board store's own bookkeeping in a document home. It is not a document, so the portable
// view leaves it out and a board-backed run exports the same tree as a file-backed one.
const BOARD_KEY = BOARD_KEY_FILE;

export function selectBoard(project, name) {
  const selected = BOARD_STORES[name];
  const dir = path.join(project, ".aof", "boards");
  const definition = JSON.parse(JSON.stringify(yaml.load(readFileSync(new URL(selected.definition, import.meta.url), "utf8"), { schema: yaml.JSON_SCHEMA })));
  definition.adapter = "./adapter.mjs";
  write(path.join(dir, "board.yaml"), JSON.stringify(definition, null, 2) + "\n");
  const support = new URL(selected.adapter, import.meta.url).href;
  write(path.join(dir, "adapter.mjs"), selected.factory === "azure" ? `
import { fileURLToPath } from "node:url";
import { createAzureAdapter } from ${JSON.stringify(new URL("../../../../.aof/boards/azure-devops/adapter.mjs", import.meta.url).href)};
import { recordedTransport } from ${JSON.stringify(support)};
const state = fileURLToPath(new URL("./recorded-board.json", import.meta.url));
let selected;
const adapter = ({ definition }) => selected ??= createAzureAdapter(definition, recordedTransport(state, definition));
export const readItems = (input, context) => adapter(context).readItems(input);
export const readChanges = (input, context) => adapter(context).readChanges(input);
export const applyChanges = (input, context) => adapter(context).applyChanges(input);
export const accessProbe = (input, context) => adapter(context).accessProbe(input);
export const copyAttachment = (input, context) => adapter(context).copyAttachment(input);
` : `
import { fileURLToPath } from "node:url";
import { createAlternateBoard } from ${JSON.stringify(support)};
const board = createAlternateBoard(fileURLToPath(new URL("./alternate-board.json", import.meta.url)));
export const readItems = input => board.readItems(input);
export const readChanges = input => board.readChanges(input);
export const applyChanges = input => board.applyChanges(input);
`);
  return { manifest: BOARD_MANIFEST };
}

function write(file, content) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  utimesSync(file, seedTime, seedTime);
}

function objectKeys(value, allowed) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) throw Error("expected a fixture object");
  for (const k of Object.keys(value)) if (!allowed.includes(k)) throw Error(`unknown fixture field ${k}`);
}

export function validateVariant(variation = {}) {
  objectKeys(variation, ["items", "duplicate", "orphan", "examples", "rubric", "budget"]);
  for (const k of ["duplicate", "orphan", "examples", "rubric", "budget"]) {
    if (k in variation && typeof variation[k] !== "boolean") throw Error(`invalid fixture option ${k}`);
  }
  if (variation.items !== undefined) objectKeys(variation.items, seed.map(item => item.slug));
  for (const change of Object.values(variation.items ?? {})) {
    objectKeys(change, ["status", "depends", "created", "updated", "recordSlug", "documents", "body", "verificationCapture"]);
    for (const [key, val] of Object.entries(change)) {
      if (key === "documents") {
        objectKeys(val, [...docs]);
        if (Object.values(val).some(body => typeof body !== "string")) throw Error("invalid document body");
      } else if (key === "depends") {
        if (!Array.isArray(val) || val.some(ref => typeof ref !== "string" || !/^[\w/-]+$/u.test(ref))) throw Error("invalid dependency");
      } else if (typeof val !== "string" && !(["created", "updated"].includes(key) && val === null)) throw Error(`invalid ${key}`);
    }
  }
}

function writeItem(item, dir) {
  mkdirSync(dir, { recursive: true });
  if (item.type !== "task") {
    const numbers = item.ref?.split("/") ?? [];
    const meta = {
      type: item.type, number: numbers.at(-1), slug: item.recordSlug ?? item.slug, title: item.slug,
      status: item.status, parent: numbers.length === 2 ? numbers[0] : undefined,
      depends: `[${(item.depends ?? []).join(", ")}]`, owner: "product-owner",
      created: item.created === undefined ? seedDate : item.created, updated: item.updated === undefined ? seedDate : item.updated,
      schema: 1, aofVersion: "0.1.0",
      ...(item.type === "story" ? { reads: "[README.md]", files: "[]" } : {}),
    };
    const lines = Object.entries(meta).filter(([,v]) => v != null).map(([k,v]) => `${k}: ${v}`);
    write(path.join(dir, RECORD_DOC_BY_TYPE[item.type]), `---\n${lines.join("\n")}\n---\n# ${item.slug}\n\n${item.body ?? ""}`);
  }
  for (const [kind, body] of Object.entries(item.documents ?? {})) write(path.join(dir, kind + ".md"), body);
  if (item.verificationCapture !== undefined) write(path.join(dir, "verification", "original.json"), item.verificationCapture);
  if (item.feature) {
    const parent = item.type === "task" ? dir : path.join(dir, "tasks");
    write(path.join(parent, `00_${item.feature}.feature`), `@executable @cli @work @work-stream\nFeature: ${item.feature}\n  Scenario: Record the ${item.feature} result\n    Then the result is recorded\n`);
  }
  if (item.attachments) {
    write(path.join(dir, "evidence", "note.txt"), "Receipt for 10 apples. \n");
    write(path.join(dir, "evidence", "sample.bin"), Buffer.from([0, 255, 1, 128]));
    mkdirSync(path.join(dir, "evidence", "empty"));
  }
}

export function seedProject(project, { variation = {}, relocated = false, store } = {}) {
  validateVariant(variation);
  const work = { dir: relocated ? "alternate/stream" : "wiki/work" };
  if (variation.examples) work.examples = { enabled: true };
  if (variation.rubric) {
    work.rubric = { command: ["node", "--version"], report: { path: "empty.tap", format: "tap" } };
    write(path.join(project, "empty.tap"), "TAP version 13\n1..0\n");
  }
  if (variation.budget) work.doctor = { budgets: { architecture: 1 } };
  const selection = store != null && Object.hasOwn(BOARD_STORES, store) ? selectBoard(project, store) : store;
  write(path.join(project, ".aof", "aof.config.json"), JSON.stringify({ work: { ...work, ...(selection == null ? {} : { store: selection }) } }));
  write(path.join(project, "README.md"), "Orchard\n");
  cpSync(templates, path.join(project, ".aof/templates/work"), { recursive: true });
  const root = path.join(project, work.dir);
  const dirs = new Map();
  const items = seed.map(item => ({ ...item, ...variation.items?.[item.slug] }));
  if (variation.duplicate) items.push({ ...items.find(item => item.ref === "11"), slug: "duplicate" });
  for (const item of items) {
    const numbers = item.ref?.split("/") ?? [];
    const parent = numbers.length === 2 ? path.join(dirs.get(numbers[0]), "stories") : path.join(root, item.location ?? "");
    if (!slugPattern.test(item.slug)) throw Error("invalid seed slug");
    const dir = path.join(parent, [numbers.at(-1), item.type, item.slug].filter(Boolean).join("_"));
    dirs.set(item.ref, dir);
    writeItem(item, dir);
  }
  if (variation.orphan) mkdirSync(path.join(root, "18-bad-folder"));
  return root;
}

// The portable view includes every file and every empty directory. Text stays reviewable
// and the independent binary inventory distinguishes base64 data from a literal text payload.
export function exportStream(root) {
  const files = new Map();
  const binary = [];
  const empty = [];
  function walk(dir, rel) {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    if (!entries.length) empty.push(rel);
    for (const entry of entries) {
      const name = rel ? rel + "/" + entry.name : entry.name;
      const target = path.join(dir, entry.name);
      if (entry.name === BOARD_KEY) continue;
      if (entry.isDirectory()) walk(target, name);
      else if (entry.isFile()) {
        const bytes = readFileSync(target);
        const text = bytes.toString("utf8");
        if (Buffer.from(text).equals(bytes) && !text.includes("\0")) files.set(name, text);
        else {
          files.set(name, bytes.toString("base64") + "\n");
          binary.push(name);
        }
      } else throw Error(`unsupported entry ${name}`);
    }
  }
  walk(root, "");
  return { files, binary, empty };
}

export function saveExport(project, label, snapshot) {
  for (const [key, body] of snapshot.files) write(path.join(project, label, "files", key), body);
  write(path.join(project, label, "inventory.json"), JSON.stringify({ empty: snapshot.empty, binary: snapshot.binary }, null, 2) + "\n");
}

export function isBoardStore(store) {
  return store != null && Object.hasOwn(BOARD_STORES, store);
}

// Publish every live, numbered top-level item with its children, in stream order, through the
// public publication verb. An item publication refuses — one that depends on archived work, say —
// stays a local draft, which is the state a refinement that could not publish leaves.
export async function publishSeed(project, home) {
  const { defaultApplication } = await import("aof/default-application");
  const env = { ...process.env, AOF_GLOBAL_HOME: home };
  const ctx = async () => ({ workspace: await defaultApplication.loadWorkspace(project, undefined, { env }), globalWorkStoreOptions: { env }, effectsJournalOptions: { env } });
  const published = [];
  for (const item of seed) {
    if (item.ref == null || item.ref.includes("/") || item.location != null) continue;
    try {
      const answer = await defaultApplication.invoke("work:publish-board", { ref: item.ref, refinementComplete: true, descendants: true }, await ctx());
      if (answer.published) published.push(item.ref);
    } catch {
      // A refused publication leaves the item local; the case reads it from its folder.
    }
  }
  return published;
}
