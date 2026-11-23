import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertScenarioMatches, captureScenario, compareScenario } from "../support/golden/harness.mjs";
import { DEFAULT_BASELINE_ROOT, materialise } from "../support/golden/baseline-store.mjs";
import { workStreamLanes as lanes } from "./work-stream.lane.mjs";

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
