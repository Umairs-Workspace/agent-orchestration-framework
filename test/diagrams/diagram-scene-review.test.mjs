import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDiagramSceneCommand } from "@aof/diagrams/commands/scene";
import { parseProfile, serializeProfile } from "@aof/diagrams/mermaid-profile";
import { projectScene } from "@aof/diagrams/scene-view";
import { compileProposal, operationsFor } from "@aof/diagrams-ui/compile";

// The review loop over the stored scene (milestone 170, ADR-011/ADR-012): notes name Mermaid ids; a
// proposal is the Mermaid view edited, recorded with its changes and a snapshot of the elements they
// touch; accept applies the editor's compiled element operations, refusing as stale — by Mermaid id —
// anything a person changed since, and refusing an operation outside what the proposal touches.
const file = "ADR-002-scene.excalidraw";
const el = (id, type, extra = {}) => ({ id, type, x: 0, y: 0, width: 100, height: 60, strokeColor: "#1e1e1e", backgroundColor: "transparent", version: 1, ...extra });
const TWO = [
  el("e-api", "rectangle", { customData: { aof: { id: "API" } } }), el("t-api", "text", { containerId: "e-api", text: "API", originalText: "API" }),
  el("e-db", "rectangle", { x: 300, customData: { aof: { id: "DB" } } }), el("t-db", "text", { containerId: "e-db", text: "DB", originalText: "DB" }),
  el("a1", "arrow", { x: 100, y: 30, width: 200, height: 0, points: [[0, 0], [200, 0]], startBinding: { elementId: "e-api" }, endBinding: { elementId: "e-db" }, strokeStyle: "solid", strokeWidth: 2, endArrowhead: "arrow" }),
];
const scene = (elements) => ({ type: "excalidraw", version: 2, elements, appState: {}, files: {} });
const VIEW = 'flowchart LR\n  API["API"]\n  DB["DB"]\n  API --> DB\n';
const RENAMED = VIEW.replace('API["API"]', 'API["Gateway"]');

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-review-"));
  const item = path.join(root, "wiki", "work", "07_demo");
  await mkdir(path.join(item, "diagrams"), { recursive: true });
  await writeFile(path.join(item, "ARCHITECTURE.md"), "# Demo\n\n## ADR-002 — Scene\n\n### Diagram\n\nDraw it.\n");
  const state = { status: "in-progress", archived: false, diagrams: { enabled: true, formats: ["svg", "png"] } };
  const command = createDiagramSceneCommand({
    resolveItemExact: async (_ctx, ref) => (ref === "07" ? { ref: "07", dir: item, status: state.status, archived: state.archived } : null),
    requireLocalCheckout() {},
    resolveWorkDiagrams: () => state.diagrams,
  }).diagramSceneCommand;
  const ctx = { workspace: { root, projectRoot: root, config: {} } };
  const run = (action, input = {}) => command.run({ ref: "07", file, action, ...input }, ctx);
  const target = path.join(item, "diagrams", file);
  const saved = async (elements, baseRevision = null) => run("save", { baseRevision, scene: scene(elements) });
  return { root, item, state, run, target, saved };
}
async function withFixture(fn) { const fx = await fixture(); try { await fn(fx); } finally { await rm(fx.root, { recursive: true, force: true }); } }
async function rejected(promise, code) { await assert.rejects(promise, (error) => error.code === code, `expected ${code}`); }
async function seeded(fx) {
  const saved = await fx.saved(TWO);
  const { request } = await fx.run("request", { baseRevision: saved.revision, selectedIds: ["API"], request: "Rename API" });
  return { saved, request };
}
const propose = (fx, request, baseRevision, text = RENAMED) => fx.run("propose", { requestId: request.id, baseRevision, summary: "Rename API", rationale: "Because", text });
// What the editor compiles for the rename: the label's text, nothing else.
const RENAME_OPS = [{ op: "update", id: "t-api", patch: { text: "Gateway", originalText: "Gateway", width: 70 } }];

// milestone 171 / story 02 — the stamp a watcher compares (ADR-003): stats only, one per kind of write.
const moved = (before, after) => ({ scene: JSON.stringify(before.scene) !== JSON.stringify(after.scene), review: before.review !== after.review });
async function stampAround(fx, write) {
  const before = await fx.run("stamp");
  await write();
  return moved(before, await fx.run("stamp"));
}
const ONE_MORE = [...TWO, el("e-cache", "rectangle", { x: 600 })];

// milestone 171 / story 03 — the house style a proposal fills in (ADR-004), from a style guide whose
// semantic roles give paper #f3f5f7 and ink #1b1f27.
const STYLE_GUIDE = [
  "# Style", "", "### Semantic roles", "", "| Role | Purpose | Light | Dark |", "|---|---|---|---|",
  "| `paper` | node fill | `#f3f5f7` | `#1b1f27` |", "| `ink` | text and stroke | `#1b1f27` | `#f3f5f7` |",
  "| `muted` | arrows | `#585f6a` | `#aab1bc` |", "| `link` | flows | `#13766d` | `#3fa89c` |", "| `accent` | focal | `#ba2646` | `#d8486a` |", "",
].join("\n");
async function styled(fx) {
  await writeFile(path.join(fx.root, "style.md"), STYLE_GUIDE);
  fx.state.diagrams = { ...fx.state.diagrams, style: "style.md" };
}
const HOUSE = "fill:#f3f5f7,stroke:#1b1f27,color:#1b1f27";
const styleLines = (text, id) => text.split("\n").map((line) => line.trim()).filter((line) => line.startsWith(`style ${id} `));
async function emptyWithNote(fx) {
  const saved = await fx.saved([]);
  const { request } = await fx.run("request", { baseRevision: saved.revision, selectedIds: [], request: "Draw a first draft." });
  return { saved, request };
}
const proposeText = (fx, request, baseRevision, text) => fx.run("propose", { requestId: request.id, baseRevision, summary: "Draft", rationale: "Because", text });
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

// milestone 171 / story 05 — a note is a thread on its request record (ADR-006).
const QUESTION = "Why does this write to the database?";
async function answeredNote(fx) {
  const saved = await fx.saved(TWO);
  const { request } = await fx.run("request", { baseRevision: saved.revision, selectedIds: ["API"], request: QUESTION });
  await fx.run("respond", { requestId: request.id, answer: "It avoids a queue hop." });
  return { saved, request };
}
const turns = (record) => record.thread.map(({ by, text }) => ({ by, text }));
const listed = async (fx, id) => (await fx.run("proposals")).requests.find((request) => request.id === id);
const recordFile = (fx, id) => path.join(fx.item, "diagrams", "ADR-002-scene.review", "requests", `${id}.json`);
// A request record is bounded by the review record limit: 2 × the 4 MB scene limit, plus 64 KB.
const MAX_RECORD_BYTES = 2 * 4 * 1024 * 1024 + 64 * 1024;

export const diagramSceneReviewTests = [
  { name: "171/02 · the stamp names the scene, the review records and the directories to watch (the real CLI)", run: async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aof-stamp-cli-"));
    try {
      const project = path.join(root, "project");
      const item = path.join(project, "wiki/work/171_milestone_push");
      const stampFile = "ADR-003-push-stream.excalidraw";
      await mkdir(path.join(project, ".aof"), { recursive: true });
      await mkdir(item, { recursive: true });
      await writeFile(path.join(project, ".aof/aof.config.json"), JSON.stringify({ name: "stamp-test", resources: [], work: { dir: "./wiki/work", diagrams: { generator: "diagram-design" } } }));
      await writeFile(path.join(item, "SPEC.md"), "---\ntype: milestone\nnumber: 171\nslug: push\ntitle: push\nstatus: in-progress\nschema: 1\n---\n# Push\n");
      await writeFile(path.join(item, "ARCHITECTURE.md"), "## ADR-003 — Push\n\n### Diagram\nDraw this.\n");
      const cli = fileURLToPath(new URL("../../packages/core/bin/aof.mjs", import.meta.url));
      const invoke = (...args) => {
        const result = spawnSync(process.execPath, [cli, "diagram", "scene", "171", stampFile, ...args, "--json"], { cwd: project, encoding: "utf8", env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, "global") } });
        assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout);
      };
      const input = path.join(root, "input.json");
      await writeFile(input, JSON.stringify({ baseRevision: null, scene: scene(TWO) }));
      const saved = invoke("--action", "save", "--input", input);
      await writeFile(input, JSON.stringify({ baseRevision: saved.revision, selectedIds: ["API"], request: "Why?" }));
      invoke("--action", "request", "--input", input);
      const stamp = invoke("--action", "stamp");
      assert.equal(typeof stamp.scene.size, "number"); assert.equal(typeof stamp.scene.mtimeMs, "number");
      assert.match(stamp.review, /^[0-9a-f]{64}$/);
      const diagrams = path.join(item, "diagrams");
      assert.ok(stamp.watch.length >= 1 && stamp.watch.every((dir) => dir === diagrams || dir.startsWith(diagrams + path.sep)), JSON.stringify(stamp.watch));
      assert.deepEqual(invoke("--action", "stamp"), stamp, "unchanged with nothing written");
    } finally { await rm(root, { recursive: true, force: true }); }
  } },
  { name: "171/02 · responding to the open note moves the review stamp and not the scene stamp", run: () => withFixture(async (fx) => {
    const { request } = await seeded(fx);
    assert.deepEqual(await stampAround(fx, () => fx.run("respond", { requestId: request.id, answer: "Because." })), { scene: false, review: true });
  }) },
  { name: "171/02 · proposing for the open note moves the review stamp and not the scene stamp", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    assert.deepEqual(await stampAround(fx, () => propose(fx, request, saved.revision)), { scene: false, review: true });
  }) },
  { name: "171/02 · withdrawing the open note moves the review stamp and not the scene stamp", run: () => withFixture(async (fx) => {
    const { request } = await seeded(fx);
    assert.deepEqual(await stampAround(fx, () => fx.run("withdraw", { requestId: request.id })), { scene: false, review: true });
  }) },
  { name: "171/02 · saving with one more shape moves the scene stamp and not the review stamp", run: () => withFixture(async (fx) => {
    const { saved } = await seeded(fx);
    assert.deepEqual(await stampAround(fx, () => fx.saved(ONE_MORE, saved.revision)), { scene: true, review: false });
  }) },
  { name: "171/03 E4 · a first draft is stored with every node in the house style", run: () => withFixture(async (fx) => {
    await styled(fx);
    const { saved, request } = await emptyWithNote(fx);
    const { proposal } = await proposeText(fx, request, saved.revision, 'flowchart LR\n  api["API"] --> store("Store")\n  web["Web"] --> api\n');
    for (const id of ["api", "store", "web"]) assert.deepEqual(styleLines(proposal.text, id), [`style ${id} ${HOUSE}`], id);
    for (const id of ["api", "store", "web"]) assert.ok(proposal.changes.some((change) => change.key === `style:${id}`), `a style change for ${id}`);
  }) },
  { name: "171/03 E5 · an added node's own style is kept as written", run: () => withFixture(async (fx) => {
    await styled(fx);
    const { saved, request } = await seeded(fx);
    const { proposal } = await proposeText(fx, request, saved.revision, `${VIEW}  api["Cache"]\n  style api fill:#fbe9ed,stroke:#ba2646\n`);
    assert.deepEqual(styleLines(proposal.text, "api"), ["style api fill:#fbe9ed,stroke:#ba2646"]);
  }) },
  { name: "171/03 E6 · an added library item is never coloured", run: () => withFixture(async (fx) => {
    await styled(fx);
    const libraries = path.join(fx.root, ".aof", "diagrams", "libraries");
    await mkdir(libraries, { recursive: true });
    await writeFile(path.join(libraries, "aws-architecture-icons.excalidrawlib"), JSON.stringify({ type: "excalidrawlib", version: 2, libraryItems: [{ id: "k", name: "Kinesis", elements: [el("k", "rectangle")] }] }));
    const { saved, request } = await seeded(fx);
    const { proposal } = await proposeText(fx, request, saved.revision, `${VIEW}  k1["Kinesis"]\n  %% aof:lib k1 aws-architecture-icons/"Kinesis"\n`);
    assert.deepEqual(styleLines(proposal.text, "k1"), []);
  }) },
  { name: "171/03 E7 · a node that already exists is not recoloured", run: () => withFixture(async (fx) => {
    await styled(fx);
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    assert.match(proposal.text, /API\["Gateway"\]/);
    assert.deepEqual(styleLines(proposal.text, "API"), []);
  }) },
  { name: "171/03 E8 · with no palette the proposal is stored as written", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const text = serializeProfile(parseProfile(`${VIEW}  api["Cache"]\n`));
    const { proposal } = await proposeText(fx, request, saved.revision, text);
    assert.equal(proposal.text, text);
    assert.deepEqual(styleLines(proposal.text, "api"), []);
  }) },
  { name: "171/03 · the filled-in proposal reads back, as Mermaid, as what was stored", run: () => withFixture(async (fx) => {
    await styled(fx);
    const { saved, request } = await emptyWithNote(fx);
    const { proposal } = await proposeText(fx, request, saved.revision, 'flowchart LR\n  api["API"] --> store("Store")\n');
    const model = parseProfile(proposal.text);
    assert.deepEqual(model.styles.api, { fill: "#f3f5f7", stroke: "#1b1f27", color: "#1b1f27" });
    const stored = JSON.parse(await readFile(path.join(fx.item, "diagrams", "ADR-002-scene.review", "proposals", `${proposal.id}.json`), "utf8"));
    assert.equal(stored.text, proposal.text, "the record holds the filled-in text");
  }) },
  { name: "171/03 E12 · context carries the palette by role", run: () => withFixture(async (fx) => {
    await styled(fx);
    const { request } = await seeded(fx);
    const context = await fx.run("context", { requestId: request.id });
    assert.deepEqual({ paper: context.palette.paper, ink: context.palette.ink, muted: context.palette.muted, link: context.palette.link, accent: context.palette.accent },
      { paper: "#f3f5f7", ink: "#1b1f27", muted: "#585f6a", link: "#13766d", accent: "#ba2646" });
  }) },
  { name: "171/03 · the review command tells the architect colours come by themselves (Claude, OpenCode and Codex)", run: async () => {
    for (const rel of [".claude/commands/aof/diagram-review.md", ".opencode/commands/aof/diagram-review.md", ".agents/skills/aof-diagram-review/SKILL.md"]) {
      const text = (await readFile(path.join(REPO_ROOT, rel), "utf8")).replace(/\s+/g, " ");
      assert.match(text, /a node you add is drawn in the house style by itself — write no `style` line for it/u, rel);
      assert.match(text, /A `style` line is for emphasis only: .* using the context's `palette` by role — `link` for a structural flow, `accent` for the one thing to look at first/u, rel);
    }
  } },
  { name: "171/05 E1 · a reply is the thread's third turn and reopens the note", run: () => withFixture(async (fx) => {
    const { request } = await answeredNote(fx);
    const { request: replied } = await fx.run("reply", { requestId: request.id, text: "And what about the cache?" });
    assert.deepEqual(turns(replied), [{ by: "operator", text: QUESTION }, { by: "architect", text: "It avoids a queue hop." }, { by: "operator", text: "And what about the cache?" }]);
    assert.equal(replied.status, "open");
    assert.equal((await listed(fx, request.id)).status, "open", "the batch review's open notes include it");
  }) },
  { name: "171/05 E2 · a reply to a note a proposal closed reopens it and leaves the proposal alone", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    assert.equal((await listed(fx, request.id)).status, "proposed");
    const before = (await fx.run("proposals")).proposals.find((item) => item.id === proposal.id);
    await fx.run("reply", { requestId: request.id, text: "Keep the old label" });
    assert.equal((await listed(fx, request.id)).status, "open");
    assert.deepEqual((await fx.run("proposals")).proposals.find((item) => item.id === proposal.id), before, "the proposal is still pending, unchanged");
  }) },
  { name: "171/05 E3 · a reply to a withdrawn note is refused and changes nothing", run: () => withFixture(async (fx) => {
    const saved = await fx.saved(TWO);
    const { request } = await fx.run("request", { baseRevision: saved.revision, selectedIds: ["API"], request: QUESTION });
    await fx.run("withdraw", { requestId: request.id });
    const before = await readFile(recordFile(fx, request.id), "utf8");
    await rejected(fx.run("reply", { requestId: request.id, text: "One more thing" }), "diagram-request-decided");
    assert.equal(await readFile(recordFile(fx, request.id), "utf8"), before);
  }) },
  { name: "171/05 · a reply to a note whose record is at its size limit is refused and changes nothing", run: () => withFixture(async (fx) => {
    const { request } = await answeredNote(fx);
    const stored = JSON.parse(await readFile(recordFile(fx, request.id), "utf8"));
    const base = JSON.stringify({ ...stored, pad: "" });
    const full = JSON.stringify({ ...stored, pad: "x".repeat(MAX_RECORD_BYTES - Buffer.byteLength(base) - 16) });
    await writeFile(recordFile(fx, request.id), full);
    await rejected(fx.run("reply", { requestId: request.id, text: "One more thing" }), "diagram-review-too-large");
    assert.equal(await readFile(recordFile(fx, request.id), "utf8"), full);
  }) },
  { name: "171/05 · an empty reply is refused and changes nothing", run: () => withFixture(async (fx) => {
    const { request } = await answeredNote(fx);
    const before = await readFile(recordFile(fx, request.id), "utf8");
    await rejected(fx.run("reply", { requestId: request.id, text: "" }), "diagram-scene-invalid");
    assert.equal(await readFile(recordFile(fx, request.id), "utf8"), before);
  }) },
  { name: "171/05 · a reply on a delivered item's read-only diagram is refused and changes nothing", run: () => withFixture(async (fx) => {
    const { request } = await answeredNote(fx);
    const before = await readFile(recordFile(fx, request.id), "utf8");
    fx.state.status = "done";
    await rejected(fx.run("reply", { requestId: request.id, text: "One more thing" }), "diagram-item-delivered");
    assert.equal(await readFile(recordFile(fx, request.id), "utf8"), before);
  }) },
  { name: "171/05 E4 · the architect's response is a turn, and the answer is that turn", run: () => withFixture(async (fx) => {
    const { request } = await answeredNote(fx);
    await fx.run("reply", { requestId: request.id, text: "And what about the cache?" });
    const { request: answered } = await fx.run("respond", { requestId: request.id, answer: "The cache is read-through; it never writes." });
    assert.deepEqual(turns(answered).at(-1), { by: "architect", text: "The cache is read-through; it never writes." });
    assert.equal(answered.answer, "The cache is read-through; it never writes.");
    assert.equal(answered.status, "answered");
    assert.equal(answered.thread.length, 4);
  }) },
  { name: "171/05 E5 · a record from before threads reads as the turns it implies", run: () => withFixture(async (fx) => {
    const saved = await fx.saved(TWO);
    const id = "abcdef0123456789";
    const legacy = { id, kind: "request", createdAt: "2026-10-01T00:00:00.000Z", revision: saved.revision, selectedIds: ["API"], request: QUESTION, status: "answered", answer: "It avoids a queue hop.", answeredAt: "2026-10-01T01:00:00.000Z" };
    await mkdir(path.dirname(recordFile(fx, id)), { recursive: true });
    await writeFile(recordFile(fx, id), JSON.stringify(legacy));
    const expected = [{ by: "operator", text: QUESTION }, { by: "architect", text: "It avoids a queue hop." }];
    assert.deepEqual(turns(await listed(fx, id)), expected, "listed");
    assert.deepEqual(turns(await fx.run("context", { requestId: id })), expected, "its context");
  }) },
  { name: "171/05 E6 · the architect's context carries the whole thread, oldest first", run: () => withFixture(async (fx) => {
    const { request } = await answeredNote(fx);
    await fx.run("reply", { requestId: request.id, text: "And what about the cache?" });
    const context = await fx.run("context", { requestId: request.id });
    assert.deepEqual(context.thread.map((turn) => turn.text), [QUESTION, "It avoids a queue hop.", "And what about the cache?"]);
  }) },
  { name: "171/05 · the review command answers the latest operator turn (Claude, OpenCode and Codex)", run: async () => {
    for (const rel of [".claude/commands/aof/diagram-review.md", ".opencode/commands/aof/diagram-review.md", ".agents/skills/aof-diagram-review/SKILL.md"]) {
      const text = (await readFile(path.join(REPO_ROOT, rel), "utf8")).replace(/\s+/g, " ");
      assert.match(text, /Read the note's thread and answer its latest operator turn/u, rel);
    }
  } },
  { name: "171/02 · the stamp is a read: it answers with diagrams off and on a delivered item, and before anything is saved", run: () => withFixture(async (fx) => {
    const empty = await fx.run("stamp");
    assert.equal(empty.scene, null, "no scene yet");
    await seeded(fx);
    fx.state.diagrams = { enabled: false, formats: ["svg"] };
    assert.ok((await fx.run("stamp")).scene);
    fx.state.status = "done";
    assert.ok((await fx.run("stamp")).review);
  }) },
  { name: "review: a corrupt record is reported as skipped in the listing and refused by id, never silently dropped", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    await propose(fx, request, saved.revision);
    await writeFile(path.join(fx.item, "diagrams", "ADR-002-scene.review", "proposals", "deadbeefdeadbeef.json"), "{ not json");
    const listed = await fx.run("proposals");
    assert.equal(listed.proposals.length, 1);
    assert.deepEqual(listed.skipped, { requests: [], proposals: ["deadbeefdeadbeef"] });
    await rejected(fx.run("reject", { proposalId: "deadbeefdeadbeef" }), "diagram-review-corrupt");
  }) },
  { name: "review: an open note is listed however many decided notes are newer, and a changed record is read again", run: () => withFixture(async (fx) => {
    const { request } = await seeded(fx);
    const requests = path.join(fx.item, "diagrams", "ADR-002-scene.review", "requests");
    const old = { ...request, createdAt: "2000-01-01T00:00:00.000Z" };
    await writeFile(path.join(requests, `${request.id}.json`), JSON.stringify(old));
    for (let i = 0; i < 60; i++) {
      const id = i.toString(16).padStart(16, "0");
      await writeFile(path.join(requests, `${id}.json`), JSON.stringify({ ...request, id, createdAt: new Date(Date.UTC(2030, 0, 1, 0, 0, i)).toISOString(), status: "answered", answer: "done", answeredAt: "2030-01-02T00:00:00.000Z" }));
    }
    let listed = (await fx.run("proposals")).requests;
    assert.equal(listed.length, 51, "the open note and the newest 50 decided notes");
    assert.equal(listed.at(-1).id, request.id);
    await fx.run("withdraw", { requestId: request.id });
    listed = (await fx.run("proposals")).requests;
    assert.equal(listed.length, 50, "withdrawn, the old note falls under the cap");
    assert.equal(listed.some((r) => r.id === request.id), false);
  }) },
  { name: "review: a note needs a saved diagram, the current revision and ids the diagram has", run: () => withFixture(async (fx) => {
    await rejected(fx.run("request", { baseRevision: "0".repeat(64), selectedIds: [], request: "x" }), "diagram-scene-missing");
    const saved = await fx.saved(TWO);
    await rejected(fx.run("request", { baseRevision: "f".repeat(64), selectedIds: [], request: "x" }), "diagram-scene-conflict");
    await rejected(fx.run("request", { baseRevision: saved.revision, selectedIds: [], request: "" }), "diagram-scene-invalid");
    await rejected(fx.run("request", { baseRevision: saved.revision, selectedIds: ["Nope"], request: "x" }), "diagram-review-selection-invalid");
    const out = await fx.run("request", { baseRevision: saved.revision, selectedIds: ["API", "API->DB#1"], request: "Explain" });
    assert.equal("invocation" in out, false, "the editor composes the slash command (FF-6306)");
    // 171/ADR-006: the note is the thread's first turn, at the record's own time.
    assert.equal(out.request.thread[0].at, out.request.createdAt);
    assert.deepEqual({ ...out.request, id: "", createdAt: "", thread: out.request.thread.map((turn) => ({ ...turn, at: "" })) }, { id: "", kind: "request", createdAt: "", revision: saved.revision, selectedIds: ["API", "API->DB#1"], request: "Explain", status: "open", answer: null, answeredAt: null, thread: [{ by: "operator", text: "Explain", at: "" }] });
  }) },
  { name: "review: context by requestId uses the stored note against the diagram as it is now", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    await fx.saved([...TWO, el("e-c", "rectangle", { x: 600, customData: { aof: { id: "C" } } })], saved.revision);
    const context = await fx.run("context", { requestId: request.id, selectedIds: ["DB"], request: "ignored" });
    assert.deepEqual(context.selected.nodes.map((n) => n.id), ["API"]);
    assert.equal(context.request, "Rename API"); assert.equal(context.requestRevision, saved.revision);
    assert.match(context.view, /C\[""\]/);
    await rejected(fx.run("context", { requestId: "deadbeefdeadbeef" }), "diagram-review-unknown");
  }) },
  { name: "review: respond records the answer and never touches the diagram", run: () => withFixture(async (fx) => {
    const { request } = await seeded(fx);
    const before = await readFile(fx.target, "utf8");
    assert.equal((await fx.run("respond", { requestId: request.id, answer: "Because." })).request.status, "answered");
    assert.equal(await readFile(fx.target, "utf8"), before);
  }) },
  { name: "review: a proposal is the edited Mermaid view — its changes and a snapshot of what they touch are recorded, and it closes its note", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    await rejected(propose(fx, request, saved.revision, VIEW), "diagram-proposal-invalid");
    await rejected(propose(fx, request, saved.revision, "flowchart LR\n  A[unclosed"), "diagram-mermaid-invalid");
    await rejected(propose(fx, request, "0".repeat(64)), "diagram-scene-conflict");
    const { proposal } = await propose(fx, request, saved.revision);
    assert.deepEqual(proposal.changes, [{ key: "node:API", change: "changed" }]);
    assert.match(proposal.text, /API\["Gateway"\]/);
    assert.equal("snapshot" in proposal || "base" in proposal, false, "the answer and the listing stay light");
    const stored = JSON.parse(await readFile(path.join(fx.item, "diagrams", "ADR-002-scene.review", "proposals", `${proposal.id}.json`), "utf8"));
    assert.deepEqual(Object.keys(stored.snapshot).sort(), ["a1", "e-api", "t-api"], "a rename touches the node's own elements and its arrows (the box may grow), nothing else");
    assert.deepEqual((await fx.run("proposals")).requests.map((r) => r.status), ["proposed"]);
  }) },
  { name: "review: what a change touches depends on its kind — a rename or move reaches the arrows, a removal the far boxes too", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const snapshotOf = async (text) => {
      const { proposal } = await propose(fx, request, saved.revision, text);
      return Object.keys(JSON.parse(await readFile(path.join(fx.item, "diagrams", "ADR-002-scene.review", "proposals", `${proposal.id}.json`), "utf8")).snapshot).sort();
    };
    assert.deepEqual(await snapshotOf(`${VIEW}  %% aof:node API x=50 y=0\n`), ["a1", "e-api", "t-api"]);
    assert.deepEqual(await snapshotOf('flowchart LR\n  DB["DB"]\n'), ["a1", "e-api", "e-db", "t-api"]);
    assert.deepEqual(await snapshotOf(VIEW.replace("API --> DB", "API -.-> DB")), ["a1", "e-api", "e-db"]);
  }) },
  { name: "review: a proposal may place a library item that exists, once — and never swaps an existing node's item", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const withFn = `${VIEW}  Fn["Function"]\n  %% aof:lib Fn azure/"Function App"\n`;
    await rejected(propose(fx, request, saved.revision, withFn), "diagram-library-unknown");
    const dir = path.join(fx.root, ".aof", "diagrams", "libraries");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "azure.excalidrawlib"), JSON.stringify({ type: "excalidrawlib", version: 2, libraryItems: [{ id: "i1", name: "Function App", elements: [el("x", "rectangle")] }] }));
    const { proposal } = await propose(fx, request, saved.revision, withFn);
    assert.deepEqual(proposal.changes.map((c) => c.key).sort(), ["lib:Fn", "node:Fn"]);
    await rejected(propose(fx, request, saved.revision, `${VIEW}  %% aof:lib API azure/"Function App"\n`), "diagram-proposal-invalid");
  }) },
  { name: "review: accept applies the compiled operations, bumps what it changes, and keeps a person's unrelated edits", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    // The person recolours DB after the proposal: DB is not something the rename touches.
    const now = await fx.saved(TWO.map((e) => (e.id === "e-db" ? { ...e, backgroundColor: "#ffd6d6" } : e)), saved.revision);
    await rejected(fx.run("accept", { proposalId: proposal.id, baseRevision: now.revision }), "diagram-proposal-invalid");
    await rejected(fx.run("accept", { proposalId: proposal.id, baseRevision: now.revision, operations: [{ op: "update", id: "e-db", patch: { x: 1 } }] }), "diagram-proposal-invalid");
    const accepted = await fx.run("accept", { proposalId: proposal.id, baseRevision: now.revision, operations: RENAME_OPS });
    const label = accepted.scene.elements.find((e) => e.id === "t-api");
    assert.equal(label.text, "Gateway"); assert.equal(label.version, 2, "a changed element looks changed to Excalidraw");
    assert.equal(accepted.scene.elements.find((e) => e.id === "e-db").backgroundColor, "#ffd6d6", "the person's edit survives");
    assert.equal(accepted.proposal.status, "accepted"); assert.equal(accepted.proposal.acceptedRevision, accepted.revision);
    assert.match(await readFile(fx.target, "utf8"), /"text":"Gateway"/);
  }) },
  { name: "review: accept is refused as stale, naming the Mermaid id, when a person changed what the proposal touches", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    const mine = await fx.saved(TWO.map((e) => (e.id === "t-api" ? { ...e, text: "Mine", originalText: "Mine" } : e)), saved.revision);
    const before = await readFile(fx.target, "utf8");
    await assert.rejects(fx.run("accept", { proposalId: proposal.id, baseRevision: mine.revision, operations: RENAME_OPS }), (error) => error.code === "diagram-proposal-stale" && error.details.conflicts.includes("API"));
    assert.equal(await readFile(fx.target, "utf8"), before);
  }) },
  { name: "review: accept needs the current revision and a pending proposal; double decisions are refused", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    await rejected(fx.run("accept", { proposalId: proposal.id, baseRevision: "f".repeat(64), operations: RENAME_OPS }), "diagram-scene-conflict");
    const accepted = await fx.run("accept", { proposalId: proposal.id, baseRevision: saved.revision, operations: RENAME_OPS });
    await rejected(fx.run("accept", { proposalId: proposal.id, baseRevision: accepted.revision, operations: RENAME_OPS }), "diagram-proposal-decided");
    await rejected(fx.run("reject", { proposalId: proposal.id }), "diagram-proposal-decided");
  }) },
  { name: "review: an edge into a node inside a subgraph compiles and is accepted — the frame the editor re-fits is in what the proposal touches", run: () => withFixture(async (fx) => {
    // DB sits in a hand-sized frame; the editor re-fits a frame whose member it changes, and a new arrow
    // changes DB's bindings. Before the frames of an edge's ends were in the touched set, accept refused it.
    const framed = [
      ...TWO.filter((e) => e.id !== "a1"),
      el("f1", "frame", { x: 250, y: -100, width: 600, height: 400, name: "Store", customData: { aof: { id: "store" } } }),
    ].map((e) => (e.id === "e-db" || e.id === "t-db" ? { ...e, frameId: "f1" } : e));
    const saved = await fx.saved(framed);
    const { view } = await fx.run("context", {});
    assert.match(view, /subgraph store/);
    const { request } = await fx.run("request", { baseRevision: saved.revision, selectedIds: ["API", "DB"], request: "Join them" });
    const { proposal } = await propose(fx, request, saved.revision, `${view}  API --> DB\n`);
    assert.deepEqual(proposal.changes.map((c) => c.key), ["edge:API->DB#1"]);
    let n = 0;
    // The SDK's converter, closely enough for an unlabelled arrow: its size is its points' extent.
    const toElements = (skeletons) => skeletons.map((s) => ({ strokeColor: "#1e1e1e", backgroundColor: "transparent", groupIds: [], boundElements: null, version: 1, width: Math.abs(s.points?.[1]?.[0] ?? 0), height: Math.abs(s.points?.[1]?.[1] ?? 0), ...s, id: s.id ?? `made${++n}` }));
    const { elements, touched, unresolved } = compileProposal({ elements: framed, changes: proposal.changes, proposed: parseProfile(proposal.text), toElements, newId: () => `new${++n}` });
    assert.deepEqual(unresolved, []);
    assert.ok(touched.has("f1"), "the hand-sized frame is re-fitted around its member");
    const accepted = await fx.run("accept", { proposalId: proposal.id, baseRevision: saved.revision, operations: operationsFor(framed, elements, touched) });
    assert.equal(accepted.proposal.status, "accepted");
    assert.deepEqual(projectScene(accepted.scene.elements).model.edges.map((e) => e.key), ["API->DB#1"]);
  }) },
  { name: "review: an edge to a library item a person dragged in compiles to a new anchor box in its group, and is accepted", run: () => withFixture(async (fx) => {
    // The SDK's panel insertion: the item's elements, tagged with their library, and no anchor box.
    const dragged = [...TWO, el("fn-1", "ellipse", { x: 600, customData: { aof: { lib: { library: "azure", item: "Function App" } } } })];
    const saved = await fx.saved(dragged);
    const { view } = await fx.run("context", {});
    assert.match(view, /%% aof:lib n1 azure\/"Function App"/);
    const { request } = await fx.run("request", { baseRevision: saved.revision, selectedIds: ["API", "n1"], request: "Join them" });
    const { proposal } = await propose(fx, request, saved.revision, `${view}  API --> n1\n`);
    let n = 0;
    const toElements = (skeletons) => skeletons.map((s) => ({ strokeColor: "#1e1e1e", backgroundColor: "transparent", groupIds: [], boundElements: null, version: 1, width: Math.abs(s.points?.[1]?.[0] ?? 0), height: Math.abs(s.points?.[1]?.[1] ?? 0), ...s, id: s.id ?? `made${++n}` }));
    const stored = (await fx.run("read")).scene.elements;
    const { elements, touched, unresolved } = compileProposal({ elements: stored, changes: proposal.changes, proposed: parseProfile(proposal.text), toElements, newId: () => `new${++n}` });
    assert.deepEqual(unresolved, [], "the edge finds a box to bind to");
    const accepted = await fx.run("accept", { proposalId: proposal.id, baseRevision: saved.revision, operations: operationsFor(stored, elements, touched) });
    const { model, index } = projectScene(accepted.scene.elements);
    assert.deepEqual(model.edges.map((e) => e.key), ["API->DB#1", "API->n1#1"]);
    assert.deepEqual(Object.keys(model.libs), ["n1"], "the anchor joins the item: still one library node");
    assert.ok(index.n1.container, "the item now carries its anchor");
  }) },
  { name: "review: accept refuses an added element the proposal does not account for", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    const before = await readFile(fx.target, "utf8");
    for (const extra of [el("loose", "freedraw", { x: 900 }), el("box", "rectangle", { x: 900, customData: { aof: { id: "Other" } } })]) {
      await rejected(fx.run("accept", { proposalId: proposal.id, baseRevision: saved.revision, operations: [...RENAME_OPS, { op: "add", element: extra }] }), "diagram-proposal-invalid");
    }
    assert.equal(await readFile(fx.target, "utf8"), before);
  }) },
  { name: "review: a withdrawn note stays withdrawn and an answer is never overwritten — respond and propose refuse them", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    await fx.run("withdraw", { requestId: request.id });
    await rejected(fx.run("respond", { requestId: request.id, answer: "Too late." }), "diagram-request-decided");
    await rejected(propose(fx, request, saved.revision), "diagram-request-decided");
    const { request: asked } = await fx.run("request", { baseRevision: saved.revision, selectedIds: [], request: "Why?" });
    await fx.run("respond", { requestId: asked.id, answer: "Because." });
    await rejected(fx.run("respond", { requestId: asked.id, answer: "Changed my mind." }), "diagram-request-decided");
    await rejected(propose(fx, asked, saved.revision), "diagram-request-decided");
    const listed = (await fx.run("proposals")).requests;
    assert.deepEqual(listed.map((r) => [r.status, r.answer ?? null]).sort(), [["answered", "Because."], ["withdrawn", null]]);
    // A note a proposal answered may still be proposed for again (its proposal may be rejected).
    const { request: open } = await fx.run("request", { baseRevision: saved.revision, selectedIds: ["API"], request: "Rename" });
    await propose(fx, open, saved.revision);
    await propose(fx, open, saved.revision, RENAMED.replace("Gateway", "Edge"));
  }) },
  { name: "review: reject and withdraw leave the diagram alone", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    const before = await readFile(fx.target, "utf8");
    assert.equal((await fx.run("reject", { proposalId: proposal.id, reason: "Not now" })).proposal.status, "rejected");
    const { request: note } = await fx.run("request", { baseRevision: saved.revision, selectedIds: [], request: "Later" });
    assert.equal((await fx.run("withdraw", { requestId: note.id })).request.status, "withdrawn");
    await rejected(fx.run("withdraw", { requestId: note.id }), "diagram-request-decided");
    assert.equal(await readFile(fx.target, "utf8"), before);
  }) },
  { name: "review: publish writes the SVG and the owed PNG where the ADR links them, and answers the block to paste", run: () => withFixture(async (fx) => {
    const saved = await fx.saved(TWO);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("rest")]).toString("base64");
    await rejected(fx.run("publish", { baseRevision: saved.revision, svg: "<html></html>", png }), "diagram-publish-invalid");
    await rejected(fx.run("publish", { baseRevision: saved.revision, svg }), "diagram-publish-invalid");
    const published = await fx.run("publish", { baseRevision: saved.revision, svg, png });
    assert.deepEqual(published.written, ["diagrams/ADR-002-scene.svg", "diagrams/ADR-002-scene.png"]);
    assert.equal(published.block, "![ADR-002 — Scene](diagrams/ADR-002-scene.svg)\n\nSource: [ADR-002-scene.excalidraw](diagrams/ADR-002-scene.excalidraw) · PNG: [ADR-002-scene.png](diagrams/ADR-002-scene.png)");
  }) },
  { name: "review: delivered items refuse writes but proposals and context still read", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    fx.state.status = "done";
    for (const [action, input] of [
      ["save", { baseRevision: saved.revision, scene: scene(TWO) }],
      ["request", { baseRevision: saved.revision, selectedIds: [], request: "x" }],
      ["propose", { requestId: request.id, baseRevision: saved.revision, summary: "s", rationale: "r", text: RENAMED }],
      ["accept", { proposalId: proposal.id, baseRevision: saved.revision, operations: RENAME_OPS }],
      ["publish", { baseRevision: saved.revision, svg: "<svg></svg>" }],
    ]) await rejected(fx.run(action, input), "diagram-item-delivered");
    assert.equal((await fx.run("proposals")).proposals.length, 1);
    assert.equal((await fx.run("context", { requestId: request.id })).requestId, request.id);
  }) },
  { name: "review: review storage refuses symlinks", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const reviewDir = path.join(fx.item, "diagrams", "ADR-002-scene.review");
    const outside = path.join(fx.root, "outside");
    await mkdir(outside);
    await rm(path.join(reviewDir, "proposals"), { recursive: true, force: true });
    await symlink(outside, path.join(reviewDir, "proposals"), "junction");
    await rejected(propose(fx, request, saved.revision), "diagram-scene-storage-invalid");
    assert.deepEqual(await readdir(outside), []);
  }) },
  { name: "review: real CLI runs request, propose, proposals and accept", run: async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aof-review-cli-"));
    try {
      const project = path.join(root, "project");
      const item = path.join(project, "wiki/work/07_milestone_scene");
      await mkdir(path.join(project, ".aof"), { recursive: true });
      await mkdir(item, { recursive: true });
      await writeFile(path.join(project, ".aof/aof.config.json"), JSON.stringify({ name: "scene-test", resources: [], work: { dir: "./wiki/work", diagrams: { generator: "diagram-design" } } }));
      await writeFile(path.join(item, "SPEC.md"), "---\ntype: milestone\nnumber: 07\nslug: scene\ntitle: scene\nstatus: in-progress\nschema: 1\n---\n# Scene\n");
      await writeFile(path.join(item, "ARCHITECTURE.md"), "## ADR-002 — Scene\n\n### Diagram\nDraw this.\n");
      const cli = fileURLToPath(new URL("../../packages/core/bin/aof.mjs", import.meta.url));
      const inputFile = path.join(root, "input.json");
      const invoke = async (action, input = {}) => {
        await writeFile(inputFile, JSON.stringify(input));
        const result = spawnSync(process.execPath, [cli, "diagram", "scene", "07", file, "--action", action, "--input", inputFile, "--json"], { cwd: project, encoding: "utf8", env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, "global") } });
        assert.equal(result.status, 0, result.stderr || result.stdout);
        return JSON.parse(result.stdout);
      };
      const saved = await invoke("save", { baseRevision: null, scene: scene(TWO) });
      const requested = await invoke("request", { baseRevision: saved.revision, selectedIds: ["API"], request: "Rename API" });
      const proposed = await invoke("propose", { requestId: requested.request.id, baseRevision: saved.revision, summary: "Rename", rationale: "r", text: RENAMED });
      assert.equal((await invoke("proposals")).proposals[0].id, proposed.proposal.id);
      const accepted = await invoke("accept", { proposalId: proposed.proposal.id, baseRevision: saved.revision, operations: RENAME_OPS });
      assert.equal(accepted.scene.elements.find((e) => e.id === "t-api").text, "Gateway");
    } finally { await rm(root, { recursive: true, force: true }); }
  } },
];
