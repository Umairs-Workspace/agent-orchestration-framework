// Milestone 171 / story 01 — Find in libraries, driven headlessly: the filter over the items the editor
// loads (`library-search.mjs`, ADR-002), its ranking and its words, both library roots read through the
// real CLI's `libraries` action, and an insertion that is the Library panel's own item carried by the
// SDK's own drag type. The tab, a click and a drag on a drawn canvas are the smoke's
// (test/smoke/diagram-editor.smoke.mjs). node:assert/strict, `{ name, run }` shape.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { libraryItemsFor } from "@aof/diagrams-ui/compile";
import { LIBRARY_MIME, NO_LIBRARIES, insertionFor, libraryDrag, searchLibraries, searchSummary } from "@aof/diagrams-ui/library-search";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const part = (id, extra = {}) => ({ id, type: "rectangle", x: 0, y: 0, width: 40, height: 40, groupIds: [], ...extra });
const entry = (library, item, elements = [part(`${item}-1`)]) => ({ library, item, id: item.toLowerCase().replace(/\s+/g, "-"), elements });
// The Background's items, in the order the editor loads them (library, then item).
const AWS = "aws-architecture-icons";
const LOADED = [
  entry(AWS, "Kinesis", [part("k1"), part("k2", { type: "line" }), part("k3", { type: "text" })]),
  entry(AWS, "Kinesis Data Firehose"),
  entry(AWS, "Kinesis Data Streams"),
  entry(AWS, "Lambda"),
  entry(AWS, "Lambda Function URL"),
  entry("azure", "Function App"),
];
const names = (results) => results.map(({ entry: found }) => found.item);
const searched = (query, loaded = LOADED) => names(searchLibraries(loaded, query));

// Both roots, read by the real CLI: a throwaway project with its own libraries and a global home.
async function cliLibraries({ project = {}, global = {} }) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-library-search-"));
  try {
    const projectDir = path.join(root, "project");
    const item = path.join(projectDir, "wiki/work/07_milestone_scene");
    await mkdir(path.join(projectDir, ".aof"), { recursive: true });
    await mkdir(item, { recursive: true });
    await writeFile(path.join(projectDir, ".aof/aof.config.json"), JSON.stringify({ name: "library-search", resources: [], work: { dir: "./wiki/work", diagrams: { generator: "diagram-design" } } }));
    await writeFile(path.join(item, "SPEC.md"), "---\ntype: milestone\nnumber: 07\nslug: scene\ntitle: scene\nstatus: in-progress\nschema: 1\n---\n# Scene\n");
    await writeFile(path.join(item, "ARCHITECTURE.md"), "## ADR-002 — Scene\n\n### Diagram\nDraw this.\n");
    const write = async (dir, files, where) => {
      await mkdir(dir, { recursive: true });
      for (const [name, items] of Object.entries(files)) {
        await writeFile(path.join(dir, name), JSON.stringify({ type: "excalidrawlib", version: 2, libraryItems: items.map((itemName, i) => ({ id: `${where}-${name}-${i}`, name: itemName, elements: [part(`${where}-${i}`)] })) }));
      }
    };
    await write(path.join(projectDir, ".aof", "diagrams", "libraries"), project, "project");
    await write(path.join(root, "global", "diagrams", "libraries"), global, "global");
    const cli = path.join(repoRoot, "packages/core/bin/aof.mjs");
    const result = spawnSync(process.execPath, [cli, "diagram", "scene", "07", "ADR-002-scene.excalidraw", "--action", "libraries", "--json"], { cwd: projectDir, encoding: "utf8", env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, "global") } });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout).items;
  } finally { await rm(root, { recursive: true, force: true }); }
}

export const librarySearchTests = [
  // ── R1 · Typing filters the items by item name or library name, ignoring case ───────────────
  { name: "171/01 E1 · a part of an item's name shows only the items that contain it", run: () => {
    assert.deepEqual(searched("kinesis"), ["Kinesis", "Kinesis Data Firehose", "Kinesis Data Streams"]);
  } },
  { name: "171/01 E3 · a library's name shows every item of that library", run: () => {
    const results = searchLibraries(LOADED, "aws-architecture");
    assert.equal(results.length, 5);
    assert.ok(results.every(({ entry: found }) => found.library === AWS));
  } },
  { name: "171/01 E5 · a query nothing matches says so", run: () => {
    const results = searchLibraries(LOADED, "zzzz");
    assert.deepEqual(results, []);
    assert.equal(searchSummary(LOADED, "zzzz", results), "No item matches zzzz");
  } },
  { name: "171/01 E2 · case does not matter", run: () => {
    assert.deepEqual(searched("KINESIS"), ["Kinesis", "Kinesis Data Firehose", "Kinesis Data Streams"]);
  } },
  { name: "171/01 E4 · every word must match, in any order", run: () => {
    assert.deepEqual(searched("data stream"), ["Kinesis Data Streams"]);
    assert.deepEqual(searched("streams data"), ["Kinesis Data Streams"]);
    assert.deepEqual(searched("azure function"), ["Function App"], "a library word and an item word together");
  } },
  { name: "171/01 · an empty query shows every item, library by library", run: () => {
    const results = searchLibraries(LOADED, "");
    assert.equal(results.length, 6);
    assert.deepEqual(names(results), LOADED.map((loaded) => loaded.item), "the aws-architecture-icons items before the azure item");
    assert.deepEqual(names(searchLibraries(LOADED, "   ")), names(results), "whitespace is an empty query");
    assert.equal(searchSummary(LOADED, "", results), "6 items");
  } },
  { name: "171/01 · items whose name starts with the query come first", run: () => {
    assert.deepEqual(searched("function"), ["Function App", "Lambda Function URL"]);
  } },

  // ── R2 · Search covers both library roots, and a shadowed library counts once ──────────────
  { name: "171/01 E6 · a project library and a global library are searched together", run: async () => {
    const items = await cliLibraries({ project: { "azure.excalidrawlib": ["Function App"] }, global: { "aws-architecture-icons.excalidrawlib": ["Lambda", "Lambda Function URL"] } });
    assert.deepEqual(searched("function", items), ["Function App", "Lambda Function URL"]);
  } },
  { name: "171/01 E7 · a library in both roots is searched once, from the project", run: async () => {
    const items = await cliLibraries({ project: { "azure.excalidrawlib": ["Function App"] }, global: { "azure.excalidrawlib": ["Function App"] } });
    const results = searchLibraries(items, "function app");
    assert.equal(results.length, 1);
    assert.equal(results[0].entry.library, "azure");
    assert.equal(results[0].entry.id, "project-azure.excalidrawlib-0", "the project's file supplied it, shadowing the global one");
  } },
  { name: "171/01 E8 · with no library at all, the search says where libraries go", run: () => {
    const summary = searchSummary([], "", searchLibraries([], ""));
    assert.equal(summary, NO_LIBRARIES);
    assert.match(summary, /~\/\.aof\/diagrams\/libraries/);
    assert.match(summary, / \.aof\/diagrams\/libraries/);
    assert.match(summary, /\.excalidrawlib/);
  } },

  // ── R3 · An item found by search is inserted exactly as one from the Library panel ─────────
  { name: "171/01 E9 · a found item carries the same elements and provenance as the panel's", run: () => {
    const panel = libraryItemsFor(LOADED);
    const [kinesis] = searchLibraries(LOADED, "kinesis");
    const inserted = insertionFor(kinesis, panel);
    assert.equal(inserted, panel[0], "the panel's own item, not a copy");
    assert.equal(inserted.name, `${AWS}/Kinesis`);
    assert.deepEqual(inserted.elements.map((element) => element.customData.aof.lib), Array(3).fill({ library: AWS, item: "Kinesis" }), "every element tagged");
    const outer = inserted.elements.map((element) => element.groupIds.at(-1));
    assert.ok(outer[0] && outer.every((group) => group === outer[0]), "a multi-element item is held in one outer group");
    const [lambda] = searchLibraries(LOADED, "lambda function");
    assert.equal(insertionFor(lambda, panel), panel[4], "a ranked result still maps to its own panel item");
  } },
  { name: "171/01 E10 · a dragged result uses the SDK's own library drop type", run: async () => {
    const panel = libraryItemsFor(LOADED);
    const drag = libraryDrag(panel[0], "http://127.0.0.1:4177");
    assert.equal(drag.type, "application/vnd.excalidrawlib+json");
    const sdkTypes = await readFile(path.join(repoRoot, "node_modules/@excalidraw/excalidraw/dist/types/excalidraw/constants.d.ts"), "utf8");
    assert.match(sdkTypes, new RegExp(`readonly excalidrawlib: "${LIBRARY_MIME.replace(/[.+]/g, "\\$&")}"`), "the pinned SDK's own drag type");
    const payload = JSON.parse(drag.data);
    assert.equal(payload.type, "excalidrawlib", "the shape the SDK's drop handler parses");
    assert.deepEqual(payload.libraryItems, [panel[0]], "with the item's elements");
  } },
];
