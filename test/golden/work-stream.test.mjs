import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertScenarioMatches, captureScenario, compareScenario } from "../support/golden/harness.mjs";
import { DEFAULT_BASELINE_ROOT, materialise } from "../support/golden/baseline-store.mjs";
import { workStreamLanes as lanes } from "./work-stream.lane.mjs";

import { resolveWorkItemStore } from "@aof/work/store/work-item-store";
import { defaultApplication } from "aof/default-application";
import { azureItem, azureRecording, azureDefinition } from "./fixtures/work-stream/azure-adapter.test-support.mjs";

const laneId = "work-stream-fixture";
const fixture = lanes.find(lane => lane.id === laneId);
const options = scenarioId => ({ lanes, laneId, scenarioId });
const expectation = scenarioId => materialise(options(scenarioId));
const capture = id => captureScenario(fixture, fixture.scenarios.find(scenario => scenario.id === id));
const rows = id => JSON.parse(expectation(id).tree.get("project/stdout"));
const directories = dir => readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();

function scratch(run) {
  const root = mkdtempSync(path.join(tmpdir(), "work-stream-drift-"));
  try {
    cpSync(path.join(DEFAULT_BASELINE_ROOT, laneId), path.join(root, laneId), { recursive: true });
    run(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

export const workStreamTests = [
  ...lanes.flatMap(lane => lane.scenarios.map(scenario => ({
    name: `208/05 explicit files [${lane.id}/${scenario.id}]`,
    run() {
      const previous = process.env.AOF_WORK_STREAM_STORE;
      process.env.AOF_WORK_STREAM_STORE = "files";
      try { assertScenarioMatches({ lanes, laneId: lane.id, scenarioId: scenario.id }); }
      finally {
        if (previous === undefined) delete process.env.AOF_WORK_STREAM_STORE;
        else process.env.AOF_WORK_STREAM_STORE = previous;
      }
    },
  }))),
  ...lanes.flatMap(lane => lane.scenarios.map(scenario => ({
    name: `205 ${scenario.entry.title} [${lane.id}/${scenario.id}]`,
    run() {
      const selected = { lanes, laneId: lane.id, scenarioId: scenario.id };
      assertScenarioMatches(selected);
      if (scenario.entry.observe) {
        const { tree } = materialise(selected);
        for (const [index, query] of scenario.entry.observe.entries()) {
          const rows = JSON.parse(tree.get(`project/observation-${index + 1}/stdout`));
          assert.ok(Array.isArray(rows) && rows.length > 0, `${scenario.id}: ${query} must preserve its JSON output`);
        }
      }
    },
  }))),
  { name: "205/00 · family and case registration agrees with the baseline inventory", run() {
    assert.deepEqual(directories(DEFAULT_BASELINE_ROOT).filter(id => id.startsWith("work-stream-")), lanes.map(lane => lane.id).sort());
    for (const lane of lanes) assert.deepEqual(directories(path.join(DEFAULT_BASELINE_ROOT, lane.id)), lane.scenarios.map(s => s.id).sort());
  } },
  { name: "205/00 E2 · The fixture distinguishes both lifecycle vocabularies", run() {
    const items = rows("inventory");
    assert.deepEqual(new Set(items.map(item => item.type)), new Set(["milestone", "story", "task", "chore", "spike", "uat", "prototype"]));
    assert.deepEqual(items.filter(i => i.type === "prototype").map(i => [i.ref,i.status]), [["15","active"],["16","paused"],["17","done"],["18","abandoned"]]);
    assert.deepEqual(new Set(items.filter(i => i.type !== "prototype" && i.status).map(i => i.status)), new Set(["not-started","in-progress","blocked","in-review","done"]));
    assert.deepEqual(rows("ready").wave.map(i => i.ref), ["10/00"]);
    assert.deepEqual(rows("blocked").waitingOn, ["10/00"]);
    assert.equal(items.find(i => i.ref === "30").archived, true);
    assert.match(expectation("seed").tree.get("project/stream/files/11_chore_labels/CHORE.md"), /depends: \[30\]/);
  } },
  { name: "205/00 Copies expose each numbered or unnumbered identity in two fresh copies", run() {
    for (const [id,slug] of [["identity-child","pack"], ["identity-backlog","queued"], ["identity-archive","ledger"]]) {
      const a = capture(id), b = capture(id);
      assert.deepEqual(a.tree,b.tree);
      assert.equal(JSON.parse(a.tree.get("project/stdout"))[0].slug,slug);
    }
  } },
  { name: "205/00 E4 · An unchanged capture reproduces the same baseline twice", run() {
    const expected = expectation("text-list");
    for (let i = 0; i < 2; i++) {
      const actual = capture("text-list");
      assert.deepEqual(actual.tree, expected.tree);
      assert.equal(actual.steps, expected.steps);
      assert.ok(actual.tree.get("project/stdout").endsWith("\n"));
    }
  } },
  { name: "205/00 E6 · Replaying a mutation under a different work root preserves its delta", run() {
    const normal = capture("tail"), relocated = capture("relocated");
    assert.deepEqual(normal.tree, relocated.tree);
    assert.ok(normal.tree.has("project/stream/files/31_chore_queued/CHORE.md"));
    assert.ok(normal.tree.has("project/before/files/backlog/chore_queued/CHORE.md"));
  } },
  ...[
    ["E5 · A single changed byte identifies the affected artifact", "seed", "stream/files/19_chore_receipt/evidence/note.txt", text => text.replace(" \n", "\n")],
    ["E5 · A single changed byte identifies the affected artifact", "seed", "stream/files/19_chore_receipt/evidence/sample.bin", () => "Af8BgA==\n"],
    ["A normal comparison exposes drift without updating", "text-list", "stdout", text => text + "\n"],
    ["A normal comparison exposes drift without updating", "seed", "stream/inventory.json", text => text.replace("19_chore_receipt/evidence/empty", "lost")],
  ].map(([title, scenarioId, artifact, change]) => ({
    name: `205/00 ${title} [${artifact}]`,
    run() { scratch(root => {
      const file = path.join(root, laneId, scenarioId, "project", artifact + ".golden");
      const old = readFileSync(file, "utf8"), edited = change(old);
      assert.notEqual(edited, old);
      writeFileSync(file, edited);
      const result = compareScenario({ ...options(scenarioId), root });
      assert.equal(result.passed, false);
      assert.ok(result.report.includes(artifact));
      assert.ok(result.report.includes(scenarioId));
      assert.equal(readFileSync(file, "utf8"), edited);
    }); },
  })),
  { name: "205/00 A normal comparison exposes drift without updating [missing baseline]", run() { scratch(root => {
    rmSync(path.join(root, laneId, "text-list", "steps.golden"));
    const result = compareScenario({ ...options("text-list"), root });
    assert.equal(result.passed, false);
    assert.match(result.report, /text-list.*has no baseline/);
  }); } },
];

async function selectedAzureFixture(itemCount, run) {
  const root = mkdtempSync(path.join(tmpdir(), "aof-selected-azure-"));
  try {
    const dir = path.join(root, ".aof", "boards");
    mkdirSync(dir, { recursive: true });
    const items = Array.from({ length: itemCount }, (_, i) => azureItem(i + 1));
    items.push(azureItem(itemCount + 1));
    items.at(-1).fields["System.AreaPath"] += "\\Neighbour";
    const last = items.at(-2);
    last.fields["System.WorkItemType"] = "User Story";
    last.fields[azureDefinition().mappings.fields.ref] = "410/00";
    last.relations = [];
    const manifest = structuredClone(azureDefinition());
    manifest.adapter = "./fixture.mjs";
    writeFileSync(path.join(dir, "board.yaml"), JSON.stringify(manifest));
    const config = { work: { store: { manifest: ".aof/boards/board.yaml" } } };
    writeFileSync(path.join(root, ".aof/aof.config.json"), JSON.stringify(config));
    const support = new URL("./fixtures/work-stream/azure-adapter.test-support.mjs", import.meta.url).href;
    const edges = [
      { source: { id: 410 }, target: { id: itemCount }, rel: "System.LinkTypes.Hierarchy-Forward" },
      { source: { id: 1 }, target: { id: itemCount }, rel: "System.LinkTypes.Dependency-Forward" },
    ];
    writeFileSync(path.join(dir, "fixture.mjs"), `
      import { azureRecording } from ${JSON.stringify(support)};
      const { adapter } = await azureRecording({ items: ${JSON.stringify(items)}, edges: ${JSON.stringify(edges)} });
      export const { readItems, readChanges, applyChanges, accessProbe, copyAttachment } = adapter;
    `);
    const env = { ...process.env, AOF_GLOBAL_HOME: path.join(root, "home") };
    const workspace = await defaultApplication.loadWorkspace(root, undefined, { env });
    await run(workspace, { workspace, globalWorkStoreOptions: { env } });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

workStreamTests.push(
  { name: "209/01 task00 E1 and task01 E3 · Selected Azure board reports the whole area, ranks and cross-batch relations", async run() {
    await selectedAzureFixture(2505, async (workspace, ctx) => {
      const { rows } = await defaultApplication.invoke("work:find", { query: "410" }, ctx);
      assert.equal(rows[0].type, "milestone");
      assert.equal(rows[0].status, "in-progress");
      const store = resolveWorkItemStore(workspace);
      const full = await store.readItems({});
      assert.equal(full.items.length, 2505);
      assert.equal(new Set(full.items.map(item => item.id)).size, 2505);
      assert.deepEqual(full.items.slice(-2).map(item => [item.id, item.rank]), [[2504, 2504], [2505, 2505]]);
      assert.equal(full.items.at(-1).parent, "410");
      assert.deepEqual(full.items.at(-1).depends, ["1"]);
      const snapshot = await store.snapshot();
      const feature = await snapshot.read("410");
      assert.equal(feature.boardId, 410);
      assert.equal(feature.revision, 8);
    });
  } },
  { name: "209/01 task00 E2 · Missing Blocked state prevents a board mutation", async run() {
    const { adapter, requests } = await azureRecording({ missingState: "Blocked" });
    await assert.rejects(adapter.applyChanges({ changes: [{ id: 410, expectedRevision: 8 }] }), /User Story.*Blocked/);
    assert.ok(requests.every(request => ["GET"].includes(request.method)));
  } },
  { name: "209/01 task00 E9 · Personal account header and token expiry reach the recorded HTTP boundary", async run() {
    const fixture = await azureRecording();
    const { adapter } = fixture;
    await adapter.readItems({ ids: [410] });
    fixture.advance(5);
    await adapter.readItems({ ids: [410] });
    assert.equal(fixture.mints(), 1);
    fixture.advance(26);
    const fresh = await adapter.readItems({ ids: [410] });
    assert.equal(fixture.mints(), 2);
    assert.doesNotMatch(JSON.stringify(fresh), /fixture-access/);
    fixture.advance(31);
    fixture.signOut();
    const before = fixture.requests.length;
    await assert.rejects(adapter.readItems({ ids: [410] }), error => error.code === "azure-board-auth" && !error.message.includes("fixture-access"));
    assert.equal(fixture.requests.length, before);
  } },
  { name: "209/01 task01 E4 · A targeted read accounts for every missing ID without a whole-area query", async run() {
    const { adapter, requests } = await azureRecording({ items: [azureItem(410)] });
    const reply = await adapter.readItems({ ids: [410, 411] });
    assert.deepEqual(reply.items.map(({ id, revision }) => [id, revision]), [[410, 8]]);
    assert.deepEqual(reply.missingIds, [411]);
    assert.equal(requests.filter(request => request.endpoint === "wit/wiql").length, 0);
    assert.deepEqual(requests.find(request => request.endpoint === "wit/workitemsbatch").body.ids, [410, 411]);
  } },
  ...["milestone", "story", "task", "chore", "spike", "uat", "prototype"].map(type => ({
    name: `209/01 task01 · ${type} round-trips each mapped state and membership`, async run() {
      const values = Object.keys(azureDefinition().mappings.states[type]).flatMap(status =>
        ["active", "backlog", "archived"].map(membership => ({ type, status, membership })));
      const { adapter } = await azureRecording({ items: [] });
      const changes = values.map((value, i) => ({ ...value, key: `k${i}`, ref: String(i + 1), title: `Case ${i}` }));
      const { results } = await adapter.applyChanges({ changes });
      assert.ok(results.every(result => result.outcome === "applied"));
      const { items } = await adapter.readItems({ ids: results.map(result => result.id) });
      assert.deepEqual(items.map(({ type, status, membership }) => ({ type, status, membership })), values);
      assert.ok(items.every(item => item.fault == null));
    },
  })),
  { name: "209/01 task01 · An unmapped board status identifies the affected item", async run() {
    const { adapter } = await azureRecording({ items: [azureItem(410, { type: "story", status: "Foreign" })] });
    const { items: [item] } = await adapter.readItems({ ids: [410] });
    assert.equal(item.status, undefined);
    assert.match(item.fault.message, /410.*Foreign/);
  } },
  { name: "209/01 task02 E5 and E6 · Each guarded update reports its own outcome", async run() {
    const fixture = await azureRecording({ items: [azureItem(410), azureItem(411, { revision: 4 })] });
    const { adapter } = fixture;
    const result = await adapter.applyChanges({ changes: [
      { key: "k1", id: 410, expectedRevision: 8, type: "milestone", status: "in-review", parentId: 411, rank: 40 },
      { key: "k2", id: 411, expectedRevision: 3, type: "milestone", status: "done" },
    ] });
    assert.deepEqual(result.results, [
      { key: "k1", id: 410, revision: 9, outcome: "applied" },
      { key: "k2", id: 411, outcome: "refused", code: "azure-board-stale" },
    ]);
    const stale = await adapter.applyChanges({ changes: [{ key: "k3", id: 410, expectedRevision: 8, type: "milestone", status: "done" }] });
    assert.equal(stale.results[0].code, "azure-board-stale");
    const { items } = await adapter.readItems({ ids: [410, 411] });
    assert.deepEqual(items.map(({ id, revision, status, parentId }) => [id, revision, status, parentId]),
      [[410, 9, "in-review", 411], [411, 4, "in-progress", null]]);
    assert.deepEqual(fixture.requests.filter(request => request.method === "PATCH").map(request => request.body[0].value), [8, 3, 8]);
  } },
  { name: "209/01 task02 · A lost create acknowledgement retains the caller's correlation key", async run() {
    const { adapter, requests } = await azureRecording({ loseCreate: true });
    const { results } = await adapter.applyChanges({ changes: [{ key: "draft-17", type: "milestone", ref: "17", title: "Created", status: "not-started", membership: "active" }] });
    assert.deepEqual(results, [{ key: "draft-17", id: null, outcome: "unknown", code: "azure-board-transport" }]);
    const create = requests.find(request => request.endpoint.startsWith("wit/workitems/$"));
    assert.ok(create.body.some(entry => entry.path === "/fields/Custom.AofKey" && entry.value === "draft-17"));
    const { items } = await adapter.readItems({ keys: ["draft-17"] });
    assert.deepEqual(items.map(({ id, ref }) => [id, ref]), [[700, "17"]]);
  } },
  ...[false, true].map(hideAttachment => ({
    name: `209/01 task02 E12 · Upload is acknowledged only with item relation [relation=${!hideAttachment}]`, async run() {
      const { adapter, requests } = await azureRecording({ hideAttachment });
      const bytes = Buffer.from("flow");
      const result = await adapter.copyAttachment({ id: 410, name: "flow.png", bytes, contentKey: "hash", expectedRevision: 8 });
      assert.equal(bytes.toString(), "flow");
      assert.equal(result.outcome, hideAttachment ? "unknown" : "applied");
      assert.equal(requests.filter(request => request.endpoint === "wit/workitems/410" && request.method === "GET").length, 2);
      if (!hideAttachment) {
        assert.match(result.url, /attachments\/flow$/);
        const recovered = await adapter.copyAttachment({ id: 410, name: "flow.png", bytes, contentKey: "hash", expectedRevision: 8 });
        assert.equal(recovered.url, result.url);
        assert.equal(requests.filter(request => request.endpoint === "wit/attachments").length, 1);
      }
    },
  })),
  { name: "209/01 task03 E7 · Feed pagination preserves two revisions for one item and resumes", async run() {
    const fixture = await azureRecording();
    const reply = await fixture.adapter.readChanges({ cursor: "c17" });
    assert.equal(reply.cursor, "c18");
    assert.deepEqual(reply.changes.map(({ id, revision }) => [id, revision]), [[410, 9], [410, 10]]);
    await fixture.adapter.readChanges({ cursor: reply.cursor });
    const pages = fixture.requests.filter(request => request.endpoint === "wit/reporting/workitemrevisions");
    assert.deepEqual(pages.map(page => page.query.continuationToken), ["c17", "p2", "c18"]);
    assert.deepEqual(fixture.waits, [5_000]);
  } },
  { name: "209/01 task03 E8 · Expired cursors fail coverage and keep the operator's position", async run() {
    const { adapter } = await azureRecording({ oldCursor: true });
    assert.deepEqual(await adapter.readChanges({ cursor: "c17" }), { changes: [], cursor: "c17", coverage: false });
  } },
  ...[
    ["quiet", [], []],
    ["deletion", [{ id: 410, rev: 11, isDeleted: true }], [[410, 11, true]]],
    ["edit", [{ id: 410, rev: 12, fields: { "System.Title": "Edited" } }], [[410, 12, false]]],
  ].map(([state, feed, wanted]) => ({
    name: `209/01 task03 · The next five-second poll observes ${state}`, async run() {
      const fixture = await azureRecording();
      await fixture.adapter.readChanges({ cursor: "c17" });
      fixture.setFeed(feed.map(item => item.fields ? {
        ...item, fields: { ...item.fields, "System.AreaPath": azureDefinition().board.area },
      } : item));
      const reply = await fixture.adapter.readChanges({ cursor: "c18" });
      assert.deepEqual(fixture.waits, [5_000]);
      assert.equal(reply.cursor, "c19");
      assert.deepEqual(reply.changes.map(({ id, revision, deleted }) => [id, revision, deleted]), wanted);
    },
  })),
);
