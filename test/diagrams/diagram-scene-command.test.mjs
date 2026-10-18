import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lstat, mkdtemp, mkdir, open, readFile, readdir, rm, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDiagramSceneCommand } from "../../packages/work/src/commands/diagram/scene.mjs";

const file = "ADR-002-scene.excalidraw";
const scene = (elements = [{ id: "box", type: "rectangle", x: 1, y: 2, width: 30, height: 40, customData: { keep: true } }]) => ({ type: "excalidraw", version: 2, elements, appState: { gridSize: 20 }, files: {} });
async function fixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-scene-")); const item = path.join(root, "wiki", "work", "07_demo");
  await mkdir(path.join(item, "diagrams"), { recursive: true });
  await writeFile(path.join(item, "ARCHITECTURE.md"), options.adr === false ? "# Demo\n" : "# Demo\n\n## ADR-002 — Scene\n\n### Diagram\n\nDraw it.\n");
  const command = createDiagramSceneCommand({ resolveItemExact: async (_ctx, ref) => ref === "07" ? { ref: "07", dir: item, status: options.status ?? "in-progress", archived: options.archived } : null, requireLocalCheckout() {} }).diagramSceneCommand;
  return { root, item, command, ctx: { workspace: { root } } };
}
async function withFixture(fn, options) { const fx = await fixture(options); try { await fn(fx); } finally { await rm(fx.root, { recursive: true, force: true }); } }
async function rejected(run, code) { await assert.rejects(run, (error) => error.code === code); }
const save = (command, ctx, value, baseRevision = null) => command.run({ ref: "07", file, action: "save", baseRevision, scene: value }, ctx);

export const diagramSceneCommandTests = [
  { name: "scene: real CLI routes save, read and context with declared flags", run: async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aof-scene-cli-"));
    try {
      const project = path.join(root, "project");
      const item = path.join(project, "wiki/work/07_milestone_scene");
      await mkdir(path.join(project, ".aof"), { recursive: true });
      await mkdir(item, { recursive: true });
      await writeFile(path.join(project, ".aof/aof.config.json"), JSON.stringify({ name: "scene-test", resources: [], work: { dir: "./wiki/work" } }));
      await writeFile(path.join(item, "SPEC.md"), "---\ntype: milestone\nnumber: 07\nslug: scene\ntitle: scene\nstatus: in-progress\nschema: 1\n---\n# Scene\n");
      await writeFile(path.join(item, "ARCHITECTURE.md"), "## ADR-002 — Scene\n\n### Diagram\nDraw this.\n");
      const cli = fileURLToPath(new URL("../../packages/core/bin/aof.mjs", import.meta.url));
      const invoke = (...args) => {
        const result = spawnSync(process.execPath, [cli, "diagram", "scene", "07", file, ...args, "--json"], { cwd: project, encoding: "utf8", env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, "global") } });
        assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout);
      };
      assert.equal(invoke().present, false);
      const input = path.join(root, "save.json");
      await writeFile(input, JSON.stringify({ baseRevision: null, scene: scene() }));
      const saved = invoke("--action", "save", "--input", input);
      assert.equal(saved.saved, true);
      assert.equal(invoke().revision, saved.revision);
      await writeFile(input, JSON.stringify({ selectedIds: ["box"], request: "Explain this" }));
      assert.equal(invoke("--action", "context", "--input", input).elements[0].id, "box");
    } finally { await rm(root, { recursive: true, force: true }); }
  } },
  { name: "scene: delivered and archived items reject writes, while an ADR heading is required", run: async () => {
    for (const options of [{ status: "done" }, { archived: true }]) await withFixture(async ({ command, ctx }) => rejected(() => save(command, ctx, scene()), "diagram-item-delivered"), options);
    await withFixture(async ({ command, ctx }) => rejected(() => save(command, ctx, scene()), "diagram-adr-unknown"), { adr: false });
  } },
  { name: "scene: save/read preserve payload and a read never writes storage", run: () => withFixture(async ({ command, ctx, item }) => {
    const before = await readdir(path.join(item, "diagrams"));
    const missing = await command.run({ ref: "07", file, action: "read" }, ctx);
    assert.equal(missing.present, false); assert.deepEqual(await readdir(path.join(item, "diagrams")), before);
    const saved = await save(command, ctx, scene()); assert.match(saved.revision, /^[0-9a-f]{64}$/);
    const read = await command.run({ ref: "07", file, action: "read" }, ctx);
    assert.deepEqual(read.scene.elements[0].customData, { keep: true });
  }) },
  { name: "scene: context returns relabel text unchanged and empty selection means all visible elements", run: () => withFixture(async ({ command, ctx }) => {
    const label = { id: "label", type: "text", x: 0, y: 0, width: 50, height: 20, text: "Renamed label", originalText: "Original label", customData: { tag: "preserved" } };
    const deleted = { id: "gone", type: "rectangle", x: 0, y: 0, width: 1, height: 1, isDeleted: true };
    await save(command, ctx, scene([label, deleted]));
    const selected = await command.run({ ref: "07", file, action: "context", selectedIds: ["label"] }, ctx);
    assert.deepEqual(selected.elements, [label]); assert.equal(selected.brief, "Draw it.");
    const all = await command.run({ ref: "07", file, action: "context", selectedIds: [] }, ctx);
    assert.deepEqual(all.elements, [label]);
  }) },
  { name: "scene: rejects duplicate ids, NaN, and UTF-8 byte-limit input without changing source", run: () => withFixture(async ({ command, ctx, item }) => {
    await save(command, ctx, scene()); const target = path.join(item, "diagrams", file); const original = await readFile(target, "utf8");
    await rejected(() => save(command, ctx, scene([{ id: "x", type: "rectangle", x: 0, y: 0, width: 1, height: 1 }, { id: "x", type: "rectangle", x: 0, y: 0, width: 1, height: 1 }])), "diagram-scene-invalid");
    await rejected(() => save(command, ctx, scene([{ id: "nan", type: "rectangle", x: Number.NaN, y: 0, width: 1, height: 1 }])), "diagram-scene-invalid");
    await rejected(() => save(command, ctx, scene([{ id: "wide", type: "text", x: 0, y: 0, width: 1, height: 1, text: "é".repeat(1_100_000) }])), "diagram-scene-too-large");
    assert.equal(await readFile(target, "utf8"), original);
  }) },
  { name: "scene: stale and simultaneous writers conflict rather than overwrite", run: () => withFixture(async ({ command, ctx }) => {
    const first = await save(command, ctx, scene()); await save(command, ctx, scene([{ id: "next", type: "rectangle", x: 0, y: 0, width: 1, height: 1 }]), first.revision);
    await rejected(() => save(command, ctx, scene(), first.revision), "diagram-scene-conflict");
    const current = await command.run({ ref: "07", file, action: "read" }, ctx);
    const [a, b] = await Promise.allSettled([save(command, ctx, scene([{ id: "a", type: "rectangle", x: 0, y: 0, width: 1, height: 1 }]), current.revision), save(command, ctx, scene([{ id: "b", type: "rectangle", x: 0, y: 0, width: 1, height: 1 }]), current.revision)]);
    assert.equal([a, b].filter((row) => row.status === "fulfilled").length, 1);
    assert.equal([a, b].filter((row) => row.status === "rejected" && row.reason.code === "diagram-scene-conflict").length, 1);
  }) },
  { name: "scene: exclusive lock is retained and refuses a writer", run: () => withFixture(async ({ command, ctx, item }) => {
    const lock = path.join(item, "diagrams", `${file}.lock`); const handle = await open(lock, "wx");
    try { await rejected(() => save(command, ctx, scene()), "diagram-scene-locked"); assert.equal((await lstat(lock)).isFile(), true); }
    finally { await handle.close(); await unlink(lock); }
  }) },
  { name: "scene: symlinked storage and failed exclusive write retain source unchanged", run: () => withFixture(async ({ command, ctx, item, root }) => {
    const saved = await save(command, ctx, scene()); const target = path.join(item, "diagrams", file); const original = await readFile(target, "utf8");
    const lock = await open(`${target}.lock`, "wx");
    try { await rejected(() => save(command, ctx, scene([{ id: "atomic", type: "rectangle", x: 0, y: 0, width: 1, height: 1 }]), saved.revision), "diagram-scene-locked"); }
    finally { await lock.close(); await unlink(`${target}.lock`); }
    assert.equal(await readFile(target, "utf8"), original);
    await rm(path.join(item, "diagrams"), { recursive: true }); const outside = path.join(root, "outside"); await mkdir(outside); await symlink(outside, path.join(item, "diagrams"));
    await rejected(() => command.run({ ref: "07", file, action: "read" }, ctx), "diagram-scene-storage-invalid");
  }) },
];
