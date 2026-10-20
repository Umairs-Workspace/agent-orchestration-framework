import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDiagramSceneCommand } from "@aof/diagrams/commands/scene";

const file = "ADR-002-scene.excalidraw";
const box = (id, extra = {}) => ({ id, type: "rectangle", x: 1, y: 2, width: 30, height: 40, ...extra });
const scene = (elements) => ({ type: "excalidraw", version: 2, elements, appState: { gridSize: 20 }, files: {} });

async function fixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-review-"));
  const item = path.join(root, "wiki", "work", "07_demo");
  await mkdir(path.join(item, "diagrams"), { recursive: true });
  await writeFile(path.join(item, "ARCHITECTURE.md"), "# Demo\n\n## ADR-002 — Scene\n\n### Diagram\n\nDraw it.\n");
  const state = { status: "in-progress", archived: false };
  const command = createDiagramSceneCommand({
    resolveItemExact: async (_ctx, ref) => (ref === "07" ? { ref: "07", dir: item, status: state.status, archived: state.archived } : null),
    requireLocalCheckout() {},
  }).diagramSceneCommand;
  const ctx = { workspace: { root } };
  const run = (action, input = {}) => command.run({ ref: "07", file, action, ...input }, ctx);
  const target = path.join(item, "diagrams", file);
  const savedScene = async (elements, baseRevision = null) => run("save", { baseRevision, scene: scene(elements) });
  return { root, item, state, run, target, savedScene, options };
}
async function withFixture(fn) { const fx = await fixture(); try { await fn(fx); } finally { await rm(fx.root, { recursive: true, force: true }); } }
async function rejected(promise, code) { await assert.rejects(promise, (error) => error.code === code, `expected ${code}`); }
// A saved two-box scene, one request about it, and a proposal that updates "a" and adds "aof-new".
async function seeded(fx) {
  const saved = await fx.savedScene([box("a"), box("b")]);
  const { request } = await fx.run("request", { baseRevision: saved.revision, selectedIds: ["a"], request: "Widen a" });
  return { saved, request };
}
const widen = [{ op: "update", id: "a", patch: { width: 99 } }, { op: "add", element: box("aof-new", { x: 100 }) }];
const propose = (fx, request, baseRevision, operations = widen) => fx.run("propose", { requestId: request.id, baseRevision, summary: "Widen a", rationale: "Because", operations });

export const diagramSceneReviewTests = [
  { name: "review: a corrupt record is reported as skipped in the listing and refused by id, never silently dropped", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    await propose(fx, request, saved.revision);
    const proposalsDir = path.join(fx.item, "diagrams", "ADR-002-scene.review", "proposals");
    await writeFile(path.join(proposalsDir, "deadbeefdeadbeef.json"), "{ not json");
    const listed = await fx.run("proposals");
    assert.equal(listed.proposals.length, 1, "the healthy proposal is still listed");
    assert.deepEqual(listed.skipped, { requests: [], proposals: ["deadbeefdeadbeef"] });
    await rejected(fx.run("reject", { proposalId: "deadbeefdeadbeef" }), "diagram-review-corrupt");
  }) },
  { name: "review: request needs a saved scene and the current revision, and leaves the invocation to the board", run: () => withFixture(async (fx) => {
    await rejected(fx.run("request", { baseRevision: "0".repeat(64), selectedIds: [], request: "x" }), "diagram-scene-missing");
    const saved = await fx.savedScene([box("a")]);
    await rejected(fx.run("request", { baseRevision: "f".repeat(64), selectedIds: [], request: "x" }), "diagram-scene-conflict");
    await rejected(fx.run("request", { baseRevision: saved.revision, selectedIds: [], request: "" }), "diagram-scene-invalid");
    await rejected(fx.run("request", { baseRevision: saved.revision, selectedIds: [], request: "x".repeat(10001) }), "diagram-scene-invalid");
    const out = await fx.run("request", { baseRevision: saved.revision, selectedIds: ["a"], request: "Explain" });
    assert.match(out.request.id, /^[a-f0-9]{16}$/);
    assert.equal("invocation" in out, false, "the board composes the slash command (FF-6306)");
    assert.deepEqual({ ...out.request, id: "", createdAt: "" }, { id: "", kind: "request", createdAt: "", revision: saved.revision, selectedIds: ["a"], request: "Explain", status: "open", answer: null, answeredAt: null });
    assert.ok(!Number.isNaN(Date.parse(out.request.createdAt)));
  }) },
  { name: "review: context by requestId uses the stored request; unknown ids are refused", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    await fx.savedScene([box("a"), box("b"), box("c")], saved.revision);
    const context = await fx.run("context", { requestId: request.id, selectedIds: ["b"], request: "ignored" });
    assert.deepEqual(context.elements.map((e) => e.id), ["a"]);
    assert.equal(context.request, "Widen a");
    assert.equal(context.requestId, request.id);
    assert.equal(context.requestRevision, saved.revision);
    assert.notEqual(context.revision, saved.revision);
    await rejected(fx.run("context", { requestId: "deadbeefdeadbeef" }), "diagram-review-unknown");
    await rejected(fx.run("context", { requestId: "../../etc/passwd" }), "diagram-review-id-invalid");
  }) },
  { name: "review: respond records the answer and never touches the scene", run: () => withFixture(async (fx) => {
    const { request } = await seeded(fx);
    const before = await readFile(fx.target, "utf8");
    const out = await fx.run("respond", { requestId: request.id, answer: "Because it is shared." });
    assert.equal(out.request.status, "answered");
    assert.equal(out.request.answer, "Because it is shared.");
    assert.ok(out.request.answeredAt);
    assert.equal(await readFile(fx.target, "utf8"), before);
    await rejected(fx.run("respond", { requestId: request.id, answer: "" }), "diagram-scene-invalid");
    await rejected(fx.run("respond", { requestId: "abcdef0123456789", answer: "x" }), "diagram-review-unknown");
    const listed = await fx.run("proposals");
    assert.equal(listed.requests[0].answer, "Because it is shared.");
  }) },
  { name: "review: propose validates every operation shape and the resulting scene", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const bad = async (operations, code = "diagram-proposal-invalid") => rejected(propose(fx, request, saved.revision, operations), code);
    await bad([]);
    await bad([{ op: "update", id: "nope", patch: { width: 1 } }]);
    await bad([{ op: "delete", id: "nope" }]);
    await bad([{ op: "update", id: "a", patch: { width: 1 } }, { op: "delete", id: "a" }]);
    await bad([{ op: "add", element: box("a") }]);
    await bad([{ op: "update", id: "a", patch: { id: "z" } }]);
    await bad([{ op: "update", id: "a", patch: {} }]);
    await bad([{ op: "scale", id: "a" }]);
    await bad([{ op: "update", id: "a", patch: { width: -5 } }], "diagram-scene-invalid");
    await bad([{ op: "add", element: { id: "n", type: "blob", x: 0, y: 0, width: 1, height: 1 } }], "diagram-scene-invalid");
    await bad(Array.from({ length: 501 }, (_, i) => ({ op: "add", element: box(`n${i}`) })));
    await rejected(propose(fx, request, "f".repeat(64)), "diagram-scene-conflict");
    await rejected(fx.run("propose", { requestId: "abcdef0123456789", baseRevision: saved.revision, summary: "s", rationale: "r", operations: widen }), "diagram-review-unknown");
    await rejected(fx.run("propose", { requestId: request.id, baseRevision: saved.revision, summary: "x".repeat(501), rationale: "r", operations: widen }), "diagram-scene-invalid");
    assert.deepEqual((await fx.run("proposals")).proposals, []);
    const { proposal } = await propose(fx, request, saved.revision);
    assert.equal(proposal.status, "pending");
    assert.equal(proposal.requestId, request.id);
    assert.equal(proposal.baseRevision, saved.revision);
    assert.deepEqual(proposal.baseElements, { a: box("a"), "aof-new": null });
    assert.equal(proposal.acceptedRevision, null);
    assert.equal((await fx.run("read")).revision, saved.revision);
  }) },
  { name: "review: a stale proposal baseRevision is refused after the scene moved on", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    await fx.savedScene([box("a"), box("b"), box("c")], saved.revision);
    await rejected(propose(fx, request, saved.revision), "diagram-scene-conflict");
  }) },
  { name: "review: accept merges the touched elements and keeps unrelated human edits", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    const humanEdit = await fx.savedScene([box("a"), box("b", { x: 500 }), box("human")], saved.revision);
    const out = await fx.run("accept", { proposalId: proposal.id, baseRevision: humanEdit.revision });
    assert.equal(out.saved, true);
    assert.equal(out.proposal.status, "accepted");
    assert.equal(out.proposal.acceptedRevision, out.revision);
    assert.ok(out.proposal.decidedAt);
    const byId = Object.fromEntries(out.scene.elements.map((e) => [e.id, e]));
    assert.equal(byId.a.width, 99);
    assert.equal(byId.a.version, (proposal.baseElements.a.version ?? 0) + 1, "an accepted update bumps the element version");
    assert.equal(typeof byId.a.versionNonce, "number");
    assert.equal(byId.b.x, 500);
    assert.deepEqual(byId.b, box("b", { x: 500 }), "an untouched human-edited element is carried over unchanged");
    assert.ok(byId.human && byId["aof-new"]);
    assert.equal(out.scene.appState.gridSize, 20);
    const read = await fx.run("read");
    assert.equal(read.revision, out.revision);
    assert.deepEqual(read.scene, out.scene);
    const listed = await fx.run("proposals");
    assert.equal(listed.proposals[0].status, "accepted");
    assert.equal(listed.revision, out.revision);
  }) },
  { name: "review: accept is refused as stale when a touched element changed, leaving the file unchanged", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    const edited = await fx.savedScene([box("a", { x: 77 }), box("b"), box("aof-new")], saved.revision);
    const before = await readFile(fx.target, "utf8");
    await assert.rejects(fx.run("accept", { proposalId: proposal.id, baseRevision: edited.revision }), (error) => {
      assert.equal(error.code, "diagram-proposal-stale");
      assert.equal(error.status, 409);
      assert.deepEqual(error.details.conflicts, ["a", "aof-new"]);
      assert.match(error.message, /a, aof-new/);
      return true;
    });
    assert.equal(await readFile(fx.target, "utf8"), before);
    assert.equal((await fx.run("proposals")).proposals[0].status, "pending");
  }) },
  { name: "review: accept needs the current revision and a pending proposal; double decisions are refused", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    const second = (await propose(fx, request, saved.revision, [{ op: "delete", id: "b" }])).proposal;
    await rejected(fx.run("accept", { proposalId: proposal.id, baseRevision: "e".repeat(64) }), "diagram-scene-conflict");
    await rejected(fx.run("accept", { proposalId: "abcdef0123456789", baseRevision: saved.revision }), "diagram-review-unknown");
    const accepted = await fx.run("accept", { proposalId: proposal.id, baseRevision: saved.revision });
    await rejected(fx.run("accept", { proposalId: proposal.id, baseRevision: accepted.revision }), "diagram-proposal-decided");
    await rejected(fx.run("reject", { proposalId: proposal.id }), "diagram-proposal-decided");
    const rejectedOut = await fx.run("reject", { proposalId: second.id, reason: "Not now" });
    assert.equal(rejectedOut.proposal.status, "rejected");
    assert.equal(rejectedOut.proposal.reason, "Not now");
    assert.ok(rejectedOut.proposal.decidedAt);
    await rejected(fx.run("reject", { proposalId: second.id }), "diagram-proposal-decided");
    await rejected(fx.run("accept", { proposalId: second.id, baseRevision: accepted.revision }), "diagram-proposal-decided");
    assert.equal((await fx.run("read")).revision, accepted.revision);
  }) },
  { name: "review: reject marks the proposal, bounds the reason and leaves the scene alone", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    await rejected(fx.run("reject", { proposalId: proposal.id, reason: "x".repeat(2001) }), "diagram-scene-invalid");
    const out = await fx.run("reject", { proposalId: proposal.id });
    assert.equal(out.proposal.status, "rejected");
    assert.equal(out.proposal.reason, null);
    assert.equal((await fx.run("read")).revision, saved.revision);
  }) },
  { name: "review: a delete operation sets isDeleted instead of removing the element", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision, [{ op: "delete", id: "b" }]);
    const out = await fx.run("accept", { proposalId: proposal.id, baseRevision: saved.revision });
    assert.equal(out.scene.elements.length, 2);
    assert.equal(out.scene.elements.find((e) => e.id === "b").isDeleted, true);
    assert.equal(out.scene.elements.find((e) => e.id === "a").isDeleted, undefined);
  }) },
  { name: "review: delivered items refuse writes but proposals and context still read", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const { proposal } = await propose(fx, request, saved.revision);
    fx.state.status = "done";
    for (const [action, input] of [
      ["request", { baseRevision: saved.revision, selectedIds: [], request: "x" }],
      ["respond", { requestId: request.id, answer: "x" }],
      ["propose", { requestId: request.id, baseRevision: saved.revision, summary: "s", rationale: "r", operations: widen }],
      ["accept", { proposalId: proposal.id, baseRevision: saved.revision }],
      ["reject", { proposalId: proposal.id }],
    ]) await rejected(fx.run(action, input), "diagram-item-delivered");
    const listed = await fx.run("proposals");
    assert.equal(listed.proposals.length, 1);
    assert.equal(listed.requests.length, 1);
    assert.deepEqual(listed.skipped, { requests: [], proposals: [] }, "nothing is skipped in a healthy listing");
    assert.equal(listed.proposals[0].status, "pending");
    assert.equal((await fx.run("context", { requestId: request.id })).requestId, request.id);
  }) },
  { name: "review: proposals lists newest first, caps at 50 and is empty without a review folder", run: () => withFixture(async (fx) => {
    const empty = await fx.run("proposals");
    assert.deepEqual({ requests: empty.requests, proposals: empty.proposals, revision: empty.revision }, { requests: [], proposals: [], revision: null });
    const saved = await fx.savedScene([box("a")]);
    const ids = [];
    for (let i = 0; i < 52; i += 1) ids.push((await fx.run("request", { baseRevision: saved.revision, selectedIds: [], request: `r${i}` })).request.id);
    const listed = await fx.run("proposals");
    assert.equal(listed.requests.length, 50);
    assert.equal(listed.requests[0].createdAt >= listed.requests[49].createdAt, true);
  }) },
  { name: "review: review storage refuses symlinks and non-regular records", run: () => withFixture(async (fx) => {
    const { saved, request } = await seeded(fx);
    const reviewDir = path.join(fx.item, "diagrams", `${file.replace(/\.excalidraw$/, "")}.review`);
    const outside = path.join(fx.root, "outside");
    await mkdir(outside);
    await rm(path.join(reviewDir, "proposals"), { recursive: true, force: true });
    await symlink(outside, path.join(reviewDir, "proposals"));
    await rejected(propose(fx, request, saved.revision), "diagram-scene-storage-invalid");
    await rejected(fx.run("proposals"), "diagram-scene-storage-invalid");
    assert.deepEqual(await readdir(outside), []);
    await rm(path.join(reviewDir, "proposals"));
    await mkdir(path.join(reviewDir, "proposals"));
    await symlink(path.join(fx.root, "outside"), path.join(reviewDir, "proposals", "abcdef0123456789.json"));
    await rejected(fx.run("reject", { proposalId: "abcdef0123456789" }), "diagram-review-storage-invalid");
    await writeFile(path.join(reviewDir, "requests", `${request.id}.json`), "x".repeat(1024 * 1024 + 1));
    await rejected(fx.run("respond", { requestId: request.id, answer: "y" }), "diagram-review-too-large");
  }) },
  { name: "review: real CLI runs request, propose, proposals and accept", run: async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aof-review-cli-"));
    try {
      const project = path.join(root, "project");
      const item = path.join(project, "wiki/work/07_milestone_scene");
      await mkdir(path.join(project, ".aof"), { recursive: true });
      await mkdir(item, { recursive: true });
      await writeFile(path.join(project, ".aof/aof.config.json"), JSON.stringify({ name: "scene-test", resources: [], work: { dir: "./wiki/work" } }));
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
      const saved = await invoke("save", { baseRevision: null, scene: scene([box("a")]) });
      const requested = await invoke("request", { baseRevision: saved.revision, selectedIds: ["a"], request: "Make it wider" });
      assert.match(requested.request.id, /^[a-f0-9]{16}$/);
      const proposed = await invoke("propose", { requestId: requested.request.id, baseRevision: saved.revision, summary: "Wider", rationale: "r", operations: [{ op: "update", id: "a", patch: { width: 80 } }] });
      const listed = await invoke("proposals");
      assert.equal(listed.proposals[0].id, proposed.proposal.id);
      assert.equal(listed.requests[0].id, requested.request.id);
      const accepted = await invoke("accept", { proposalId: proposed.proposal.id, baseRevision: saved.revision });
      assert.equal(accepted.scene.elements[0].width, 80);
      assert.equal((await invoke("proposals")).proposals[0].status, "accepted");
    } finally { await rm(root, { recursive: true, force: true }); }
  } },
];
