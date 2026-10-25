import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lstat, mkdtemp, mkdir, open, readFile, readdir, rm, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDiagramSceneCommand } from "@aof/diagrams/commands/scene";
import { LIMITS, parseProfile } from "@aof/diagrams/mermaid-profile";

// diagram:scene over Excalidraw's own scene (milestone 170, ADR-010): the store keeps a canonical file,
// stamps a Mermaid id on what a person drew, serves the Mermaid view, reads the project libraries, and
// serializes every write under the diagram's exclusive lock.
const file = "ADR-002-scene.excalidraw";
const el = (id, type, extra = {}) => ({ id, type, x: 0, y: 0, width: 100, height: 60, strokeColor: "#1e1e1e", backgroundColor: "transparent", version: 1, updated: 1700000000000, ...extra });
const scene = (elements = [el("box", "rectangle", { customData: { keep: true } })]) => ({ type: "excalidraw", version: 2, elements, appState: { viewBackgroundColor: "#ffffff", zoom: { value: 2 }, gridSize: 20 }, files: {} });
async function fixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-scene-")); const item = path.join(root, "wiki", "work", "07_demo");
  await mkdir(path.join(item, "diagrams"), { recursive: true });
  await writeFile(path.join(item, "ARCHITECTURE.md"), options.adr === false ? "# Demo\n" : "# Demo\n\n## ADR-002 — Scene\n\n### Diagram\n\nDraw it.\n");
  const command = createDiagramSceneCommand({ resolveItemExact: async (_ctx, ref) => ref === "07" ? { ref: "07", dir: item, status: options.status ?? "in-progress", archived: options.archived } : null, requireLocalCheckout() {}, resolveWorkDiagrams: () => options.diagrams ?? { enabled: true, formats: ["svg"] }, resolveGlobalHome: () => options.globalHome ?? null }).diagramSceneCommand;
  return { root, item, command, ctx: { workspace: { root, projectRoot: root } } };
}
async function withFixture(fn, options) { const fx = await fixture(options); try { await fn(fx); } finally { await rm(fx.root, { recursive: true, force: true }); } }
async function rejected(run, code) { await assert.rejects(run, (error) => error.code === code, `expected ${code}`); }
const save = (command, ctx, value, baseRevision = null) => command.run({ ref: "07", file, action: "save", baseRevision, scene: value }, ctx);

// milestone 171 / story 03 — the palette `read` carries, read from the style guide config names (ADR-004).
const REPO_STYLE = fileURLToPath(new URL("../../.aof/diagrams/style.md", import.meta.url));
const consoleColours = (palette) => palette && { paper: palette.paper, ink: palette.ink, muted: palette.muted, link: palette.link, accent: palette.accent };

export const diagramSceneCommandTests = [
  { name: "171/03 E1 · a project whose work.diagrams.style names a copy of this repository's style guide reads the console's colours", run: () => withFixture(async ({ command, ctx, root }) => {
    await writeFile(path.join(root, "style.md"), await readFile(REPO_STYLE, "utf8"));
    const answer = await command.run({ ref: "07", file, action: "read" }, ctx);
    assert.deepEqual(consoleColours(answer.palette), { paper: "#f3f5f7", ink: "#1b1f27", muted: "#585f6a", link: "#13766d", accent: "#ba2646" });
  }, { diagrams: { enabled: true, formats: ["svg"], style: "style.md" } }) },
  { name: "171/03 E2 · with no work.diagrams.style there is no palette", run: () => withFixture(async ({ command, ctx }) => {
    assert.equal((await command.run({ ref: "07", file, action: "read" }, ctx)).palette, null);
  }, { diagrams: { enabled: true, formats: ["svg"] } }) },
  { name: "171/03 · a style guide named in config but missing from disk gives no palette", run: () => withFixture(async ({ command, ctx }) => {
    assert.equal((await command.run({ ref: "07", file, action: "read" }, ctx)).palette, null);
  }, { diagrams: { enabled: true, formats: ["svg"], style: "missing/style.md" } }) },
  { name: "171/03 · the read answer carries the palette (the real CLI)", run: async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aof-palette-cli-"));
    try {
      const project = path.join(root, "project");
      const item = path.join(project, "wiki/work/171_milestone_style");
      await mkdir(path.join(project, ".aof"), { recursive: true });
      await mkdir(item, { recursive: true });
      await writeFile(path.join(project, "style.md"), await readFile(REPO_STYLE, "utf8"));
      await writeFile(path.join(project, ".aof/aof.config.json"), JSON.stringify({ name: "palette-test", resources: [], work: { dir: "./wiki/work", diagrams: { generator: "diagram-design", style: "style.md" } } }));
      await writeFile(path.join(item, "SPEC.md"), "---\ntype: milestone\nnumber: 171\nslug: style\ntitle: style\nstatus: in-progress\nschema: 1\n---\n# Style\n");
      const cli = fileURLToPath(new URL("../../packages/core/bin/aof.mjs", import.meta.url));
      const result = spawnSync(process.execPath, [cli, "diagram", "scene", "171", "ADR-004-house-style.excalidraw", "--json"], { cwd: project, encoding: "utf8", env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, "global") } });
      assert.equal(result.status, 0, result.stderr);
      const { palette } = JSON.parse(result.stdout);
      assert.equal(palette.paper, "#f3f5f7");
      assert.equal(palette.ink, "#1b1f27");
    } finally { await rm(root, { recursive: true, force: true }); }
  } },
  { name: "scene: real CLI routes save, read and context with declared flags", run: async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aof-scene-cli-"));
    try {
      const project = path.join(root, "project");
      const item = path.join(project, "wiki/work/07_milestone_scene");
      await mkdir(path.join(project, ".aof"), { recursive: true });
      await mkdir(item, { recursive: true });
      await writeFile(path.join(project, ".aof/aof.config.json"), JSON.stringify({ name: "scene-test", resources: [], work: { dir: "./wiki/work", diagrams: { generator: "diagram-design" } } }));
      await writeFile(path.join(item, "SPEC.md"), "---\ntype: milestone\nnumber: 07\nslug: scene\ntitle: scene\nstatus: in-progress\nschema: 1\n---\n# Scene\n");
      await writeFile(path.join(item, "ARCHITECTURE.md"), "## ADR-002 — Scene\n\n### Diagram\nDraw this.\n");
      const cli = fileURLToPath(new URL("../../packages/core/bin/aof.mjs", import.meta.url));
      const invoke = (...args) => {
        const result = spawnSync(process.execPath, [cli, "diagram", "scene", "07", file, ...args, "--json"], { cwd: project, encoding: "utf8", env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, "global") } });
        assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout);
      };
      assert.equal(invoke().present, false);
      const input = path.join(root, "save.json");
      await writeFile(input, JSON.stringify({ baseRevision: null, scene: scene([el("b1", "rectangle"), { ...el("t1", "text", { containerId: "b1", text: "API", originalText: "API" }) }]) }));
      const saved = invoke("--action", "save", "--input", input);
      assert.equal(saved.saved, true); assert.deepEqual(saved.assigned, { b1: "n1" });
      assert.equal(invoke().revision, saved.revision);
      await writeFile(input, JSON.stringify({ selectedIds: ["n1"], request: "Explain this" }));
      const context = invoke("--action", "context", "--input", input);
      assert.match(context.view, /n1\["API"\]/); assert.deepEqual(context.selected.nodes.map((n) => n.id), ["n1"]);
      // Core wires the global home (AOF_GLOBAL_HOME here) as the shared library root.
      await mkdir(path.join(root, "global", "diagrams", "libraries"), { recursive: true });
      await writeFile(path.join(root, "global", "diagrams", "libraries", "shared.excalidrawlib"), JSON.stringify({ type: "excalidrawlib", version: 2, libraryItems: [{ id: "s1", name: "Queue", elements: [el("q", "rectangle")] }] }));
      assert.deepEqual(invoke("--action", "libraries").items.map((i) => `${i.library}/${i.item}`), ["shared/Queue"]);
    } finally { await rm(root, { recursive: true, force: true }); }
  } },
  { name: "scene: libraries come from the global home and the project; a project file shadows a global one of the same name", run: async () => {
    const globalHome = await mkdtemp(path.join(os.tmpdir(), "aof-scene-global-"));
    try {
      await withFixture(async ({ command, ctx, root }) => {
        const shared = path.join(globalHome, "diagrams", "libraries");
        await mkdir(shared, { recursive: true });
        await writeFile(path.join(shared, "aws.excalidrawlib"), JSON.stringify({ type: "excalidrawlib", version: 2, libraryItems: [{ id: "k", name: "Kinesis", elements: [el("k", "rectangle")] }] }));
        await writeFile(path.join(shared, "azure.excalidrawlib"), JSON.stringify({ type: "excalidrawlib", version: 2, libraryItems: [{ id: "g", name: "Global App", elements: [el("g", "rectangle")] }] }));
        const list = async () => (await command.run({ ref: "07", file, action: "libraries" }, ctx)).items.map((i) => `${i.library}/${i.item}`);
        assert.deepEqual(await list(), ["aws/Kinesis", "azure/Global App"], "the global sets, with no project folder");
        const own = path.join(root, ".aof", "diagrams", "libraries");
        await mkdir(own, { recursive: true });
        await writeFile(path.join(own, "azure.excalidrawlib"), JSON.stringify({ type: "excalidrawlib", version: 2, libraryItems: [{ id: "p", name: "Project App", elements: [el("p", "rectangle")] }] }));
        await writeFile(path.join(own, "team.excalidrawlib"), JSON.stringify({ type: "excalidrawlib", version: 2, libraryItems: [{ id: "t", name: "Gateway", elements: [el("t", "rectangle")] }] }));
        assert.deepEqual(await list(), ["aws/Kinesis", "azure/Project App", "team/Gateway"], "the project's azure shadows the global one");
        await save(command, ctx, scene([el("b", "rectangle")]));
        const context = await command.run({ ref: "07", file, action: "context" }, ctx);
        assert.deepEqual(context.libraries, ['aws/"Kinesis"', 'azure/"Project App"', 'team/"Gateway"']);
      }, { globalHome });
    } finally { await rm(globalHome, { recursive: true, force: true }); }
  } },
  { name: "scene: with diagrams off the store writes nothing, and a read still answers", run: () => withFixture(async ({ command, ctx, item }) => {
    await rejected(() => save(command, ctx, scene()), "diagram-disabled");
    await rejected(() => command.run({ ref: "07", file, action: "publish", baseRevision: "0".repeat(64), svg: "<svg></svg>" }, ctx), "diagram-disabled");
    assert.deepEqual(await readdir(path.join(item, "diagrams")), [], "nothing was written");
    assert.equal((await command.run({ ref: "07", file, action: "read" }, ctx)).present, false);
  }, { diagrams: { enabled: false, formats: ["svg"] } }) },
  { name: "scene: delivered and archived items reject writes, while an ADR heading is required", run: async () => {
    for (const options of [{ status: "done" }, { status: "done", archived: true }]) await withFixture(async ({ command, ctx }) => rejected(() => save(command, ctx, scene()), "diagram-item-delivered"), options);
    await withFixture(async ({ command, ctx }) => rejected(() => save(command, ctx, scene()), "diagram-adr-unknown"), { adr: false });
  } },
  { name: "scene: the stored file is canonical — one element per line, keys sorted, no timestamp, only the drawing's app state", run: () => withFixture(async ({ command, ctx, item }) => {
    const before = await readdir(path.join(item, "diagrams"));
    assert.equal((await command.run({ ref: "07", file, action: "read" }, ctx)).present, false);
    assert.deepEqual(await readdir(path.join(item, "diagrams")), before, "a read never writes");
    const saved = await save(command, ctx, scene([el("b", "rectangle", { y: 5, customData: { keep: true } }), el("c", "ellipse")]));
    const text = await readFile(path.join(item, "diagrams", file), "utf8");
    const lines = text.split("\n");
    assert.equal(lines.filter((line) => line.startsWith('    {"backgroundColor"')).length, 2, "each element is one line with its keys sorted");
    assert.doesNotMatch(text, /"updated"/, "the volatile timestamp is not stored");
    assert.match(text, /"appState": \{"gridSize":20,"viewBackgroundColor":"#ffffff"\}/, "camera and zoom are not the drawing");
    const read = await command.run({ ref: "07", file, action: "read" }, ctx);
    assert.equal(read.revision, saved.revision);
    assert.deepEqual(read.scene.elements[0].customData, { keep: true, aof: { id: "n1" } }, "a person's box gets a Mermaid id; its own data is kept");
  }) },
  { name: "scene: a scene file name must be .excalidraw, and a stored file that is not JSON is corrupt", run: () => withFixture(async ({ command, ctx, item }) => {
    await rejected(() => command.run({ ref: "07", file: "ADR-002-scene.mmd", action: "read" }, ctx), "diagram-scene-file-invalid");
    await writeFile(path.join(item, "diagrams", file), "{ not json");
    await rejected(() => command.run({ ref: "07", file, action: "read" }, ctx), "diagram-scene-corrupt");
  }) },
  { name: "scene: context is the Mermaid view, the selection by Mermaid id, the brief and the library items", run: () => withFixture(async ({ command, ctx, root }) => {
    await mkdir(path.join(root, ".aof", "diagrams", "libraries"), { recursive: true });
    await writeFile(path.join(root, ".aof", "diagrams", "libraries", "azure.excalidrawlib"), JSON.stringify({ type: "excalidrawlib", version: 2, libraryItems: [{ id: "i1", status: "unpublished", created: 1, name: "App Service", elements: [el("x", "rectangle")] }] }));
    await save(command, ctx, scene([el("b", "rectangle", { customData: { aof: { id: "API" } } }), el("t", "text", { containerId: "b", text: "API", originalText: "API" }), el("pen", "freedraw", { customData: { aof: { id: "s1" } } })]));
    const context = await command.run({ ref: "07", file, action: "context", selectedIds: ["API", "s1"] }, ctx);
    assert.match(context.view, /^flowchart LR\n  %% aof:profile 1\n  API\["API"\]\n/);
    assert.match(context.view, /%% aof:sketch s1 "freedraw"/);
    assert.deepEqual([context.selected.nodes.map((n) => n.id), context.selected.sketches], [["API"], ["s1"]]);
    assert.deepEqual(context.libraries, ['azure/"App Service"']);
    assert.equal(context.brief, "Draw it."); assert.equal(context.whole, false);
  }) },
  { name: "scene: libraries are read from .aof/diagrams/libraries, named items and unnamed alike; a broken file is refused", run: () => withFixture(async ({ command, ctx, root }) => {
    assert.deepEqual((await command.run({ ref: "07", file, action: "libraries" }, ctx)).items, [], "no folder, no items");
    const dir = path.join(root, ".aof", "diagrams", "libraries");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "azure.excalidrawlib"), JSON.stringify({ type: "excalidrawlib", version: 2, libraryItems: [{ id: "i1", name: "App Service", elements: [el("x", "rectangle")] }, { id: "i2", elements: [el("y", "line")] }] }));
    await writeFile(path.join(dir, "old.excalidrawlib"), JSON.stringify({ type: "excalidrawlib", version: 1, library: [[el("z", "ellipse")]] }));
    await writeFile(path.join(dir, "notes.txt"), "ignored");
    const { items } = await command.run({ ref: "07", file, action: "libraries" }, ctx);
    assert.deepEqual(items.map((i) => [i.library, i.item, i.elements.length]), [["azure", "App Service", 1], ["azure", "item 2", 1], ["old", "item 1", 1]]);
    await writeFile(path.join(dir, "bad.excalidrawlib"), "{ nope");
    await rejected(() => command.run({ ref: "07", file, action: "libraries" }, ctx), "diagram-library-invalid");
  }) },
  { name: "scene: rejects duplicate ids, NaN, unknown types and oversized input without changing the file", run: () => withFixture(async ({ command, ctx, item }) => {
    const saved = await save(command, ctx, scene()); const target = path.join(item, "diagrams", file); const original = await readFile(target, "utf8");
    await rejected(() => save(command, ctx, scene([el("x", "rectangle"), el("x", "rectangle")]), saved.revision), "diagram-scene-invalid");
    await rejected(() => save(command, ctx, scene([el("nan", "rectangle", { x: Number.NaN })]), saved.revision), "diagram-scene-invalid");
    await rejected(() => save(command, ctx, scene([el("w", "widget")]), saved.revision), "diagram-scene-invalid");
    await rejected(() => save(command, ctx, scene([el("big", "text", { text: "é".repeat(2_200_000) })]), saved.revision), "diagram-scene-too-large");
    assert.equal(await readFile(target, "utf8"), original);
  }) },
  { name: "scene: a scene whose Mermaid view the profile could not read back is refused at save, and a claimed id it could not read is re-aliased", run: () => withFixture(async ({ command, ctx, item }) => {
    const saved = await save(command, ctx, scene()); const target = path.join(item, "diagrams", file); const original = await readFile(target, "utf8");
    const long = "x".repeat(LIMITS.label + 1);
    await rejected(() => save(command, ctx, scene([el("b", "rectangle"), el("t", "text", { containerId: "b", text: long, originalText: long })]), saved.revision), "diagram-scene-unviewable");
    assert.equal(await readFile(target, "utf8"), original, "a refused save leaves the file alone");
    const tooLong = `A${"b".repeat(LIMITS.id)}`;
    const next = await save(command, ctx, scene([el("k", "rectangle", { customData: { aof: { id: "end" } } }), el("l", "rectangle", { customData: { aof: { id: tooLong } } })]), saved.revision);
    assert.deepEqual(next.assigned, { k: "n1", l: "n2" }, "a keyword and an over-long id are not kept");
    const { view } = await command.run({ ref: "07", file, action: "context" }, ctx);
    assert.deepEqual(parseProfile(view).nodes.map((n) => n.id), ["n1", "n2"], "the architect's view parses");
  }) },
  { name: "scene: stale and simultaneous writers conflict rather than overwrite", run: () => withFixture(async ({ command, ctx }) => {
    const first = await save(command, ctx, scene()); await save(command, ctx, scene([el("next", "rectangle")]), first.revision);
    await rejected(() => save(command, ctx, scene(), first.revision), "diagram-scene-conflict");
    const current = await command.run({ ref: "07", file, action: "read" }, ctx);
    const [a, b] = await Promise.allSettled([save(command, ctx, scene([el("a", "rectangle")]), current.revision), save(command, ctx, scene([el("b", "rectangle")]), current.revision)]);
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
    try { await rejected(() => save(command, ctx, scene([el("atomic", "rectangle")]), saved.revision), "diagram-scene-locked"); }
    finally { await lock.close(); await unlink(`${target}.lock`); }
    assert.equal(await readFile(target, "utf8"), original);
    await rm(path.join(item, "diagrams"), { recursive: true }); const outside = path.join(root, "outside"); await mkdir(outside); await symlink(outside, path.join(item, "diagrams"), "junction");
    await rejected(() => command.run({ ref: "07", file, action: "read" }, ctx), "diagram-scene-storage-invalid");
  }) },
];
