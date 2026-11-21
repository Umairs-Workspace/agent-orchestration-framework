// 203/02 — `aof work update` changes exactly what it should (203/ADR-006): nothing on its own
// output, never the user's edit, and exactly a release's changes on an older tree. The lane is
// `work-update.lane.mjs`; its baselines are `baselines/work-update/`, deltas over `work-init`'s.
//
// Every run is memoised per process. Idempotence runs each `work-init` scenario once more, with an
// update step added, read from that lane's own list so a scenario added there is covered here.
//
// Tasks: 00 (R1, idempotence), 01 (R2, the user's edit), 02 (R3, the upgrade and the rebuild).
// Task 03 is @manual, on the Windows control node.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { hashContent } from "../../packages/core/src/lock.mjs";
import { captureScenario } from "../support/golden/harness.mjs";
import { DEFAULT_BASELINE_ROOT, INSTALL_RECORDS, compareTrees, materialise, readStored, rebuild, renderReport } from "../support/golden/baseline-store.mjs";
import { normaliseContext } from "../support/golden/normalise.mjs";
import { LANES, findScenario } from "../support/golden/lanes.mjs";
import workInit from "./work-init.lane.mjs";
import workUpdate, { OLDER_RELEASE, USER_LINE, olderStart, rebuildInit, startingFiles } from "./work-update.lane.mjs";

const LANE = "work-update";
const UPDATE_STEP = Object.freeze({ argv: ["work", "update", "--json"], exit: 0 });
const LOCK = "project/.aof/aof.lock.json";
const PLACEHOLDER = /<project>|<home>|<timestamp>|<version>|<build-id>|sha256:<hash>/u;

const memo = new Map();
const once = (key, run) => {
  if (!memo.has(key)) memo.set(key, run());
  return memo.get(key);
};

const capture = (laneDecl, scenario) => {
  const actual = captureScenario(laneDecl, scenario);
  return { ...actual, records: JSON.parse(actual.steps) };
};
const updateEnvelope = (actual) => actual.records.at(-1).envelope;
const scenarioOf = (id) => findScenario(LANES, LANE, id).scenario;
const actualOf = (id) => once(`${LANE}/${id}`, () => capture(workUpdate, scenarioOf(id)));
const expectedOf = (laneId, id) => materialise({ lanes: LANES, root: DEFAULT_BASELINE_ROOT, laneId, scenarioId: id });
const stored = (id) => readStored(DEFAULT_BASELINE_ROOT, LANE, id);

function assertMatches(id) {
  const expected = expectedOf(LANE, id);
  assert.ok(!expected.missing, expected.missing);
  const difference = compareTrees(expected, actualOf(id));
  if (!difference.passed) assert.fail(renderReport(difference, { expected, actual: actualOf(id), laneId: LANE, scenarioId: id }));
}

// The tree a rebuild fills: a temp project and home whose paths stand in for a run's.
function withValues(run) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "aof-golden-rebuild-"));
  try {
    const project = path.join(dir, "project");
    const home = path.join(dir, "home");
    mkdirSync(project);
    mkdirSync(home);
    const ctx = normaliseContext({ project, home });
    return run({ project, home, version: ctx.version, buildId: ctx.buildId }, dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function snapshot(root) {
  const files = new Map();
  const walk = (dir, segments) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, [...segments, entry.name]);
      else files.set([...segments, entry.name].join("/"), `${statSync(full).mtimeMs}:${readFileSync(full).length}`);
    }
  };
  walk(root, []);
  return files;
}

function assertOnlyAction(envelope, action, rel) {
  const others = envelope.actions.filter((entry) => entry.path !== rel);
  assert.deepEqual(envelope.actions.filter((entry) => entry.path === rel), [{ action, path: rel }], `"${action}" for ${rel}`);
  assert.deepEqual(others.filter((entry) => entry.action !== "skip"), [], "skip for every other planned file");
  assert.equal(envelope.summary.skipped, others.length);
}

// ── task 00 · R1 · update on its own output changes nothing ────────────────────────────────

const idempotent = (id) =>
  once(`idempotent/${id}`, () => {
    const scenario = workInit.scenarios.find((candidate) => candidate.id === id);
    return capture(workInit, { ...scenario, steps: [...scenario.steps, UPDATE_STEP] });
  });

// One case per scenario the `work-init` lane declares, read from the lane, never listed again.
const idempotenceCases = workInit.scenarios.map(({ id }) => ({
  name: `203/02 task00 ${id === "default" ? "E1" : "E2"} — update after init leaves work-init/${id}'s tree as its baseline, and skips every planned file`,
  run: async () => {
    const actual = idempotent(id);
    const expected = expectedOf("work-init", id);
    const difference = compareTrees({ tree: expected.tree, steps: "" }, { tree: actual.tree, steps: "" });
    if (!difference.passed) assert.fail(renderReport(difference, { expected, actual, laneId: "work-init", scenarioId: id }));
    const last = actual.records.at(-1);
    assert.deepEqual(last.argv, UPDATE_STEP.argv);
    assert.equal(last.exit, 0);
    const { summary, actions } = last.envelope;
    assert.deepEqual({ created: summary.created, updated: summary.updated, deleted: summary.deleted, drift: summary["drift-warning"] }, { created: 0, updated: 0, deleted: 0, drift: 0 });
    assert.ok(actions.length > 0 && actions.every((entry) => entry.action === "skip"), "every planned file is reported skipped");
    assert.equal(summary.skipped, actions.length);
  },
}));

const task00 = [
  ...idempotenceCases,
  {
    name: "203/02 task00 E3 — the rewritten lock compares equal to work-init/default's, because only its instants moved",
    run: async () => {
      assert.equal(idempotent("default").tree.get(LOCK), expectedOf("work-init", "default").tree.get(LOCK));
    },
  },
  {
    name: "203/02 task00 — the check covers every init scenario, including ones added later: one case per scenario the work-init lane declares",
    run: async () => {
      assert.equal(idempotenceCases.length, workInit.scenarios.length);
      for (const { id } of workInit.scenarios) assert.ok(idempotenceCases.some((entry) => entry.name.includes(`work-init/${id}'s`)), `${id} has its idempotence case`);
    },
  },
];

// ── task 01 · R2 · update keeps what the user changed ──────────────────────────────────────

const REFINE = ".claude/commands/aof/refine.md";
const RELEASE = ".claude/commands/release.md";

const task01 = [
  {
    name: "203/02 task01 — customised-update names base work-init/customised, starts from it rebuilt, runs one update, and renders to its baseline",
    run: async () => {
      assert.equal(scenarioOf("customised-update").base, "work-init/customised");
      assert.equal(typeof scenarioOf("customised-update").files, "function", "its starting files are the rebuilt baseline, made at run time");
      assert.deepEqual(scenarioOf("customised-update").steps, [UPDATE_STEP]);
      assertMatches("customised-update");
    },
  },
  {
    name: "203/02 task01 E4 — an aof file the user edited is kept, and reported as drift",
    run: async () => {
      const actual = actualOf("customised-update");
      assert.ok(actual.tree.get(`project/${REFINE}`).endsWith(`${USER_LINE}\n`), "the user's line is still there");
      const envelope = updateEnvelope(actual);
      assert.deepEqual(envelope.actions.filter((entry) => entry.path === REFINE), [{ action: "drift-warning", path: REFINE }]);
      assert.equal(envelope.summary["drift-warning"], 1);
      assert.equal(envelope.summary.updated, 0);
    },
  },
  {
    name: "203/02 task01 E5 — a file the user added is untouched, and no action names it",
    run: async () => {
      const actual = actualOf("customised-update");
      assert.equal(actual.tree.get(`project/${RELEASE}`), "# Release\n");
      assert.deepEqual(updateEnvelope(actual).actions.filter((entry) => entry.path === RELEASE), []);
    },
  },
  {
    name: "203/02 task01 E6 — the user's merged entries survive the update",
    run: async () => {
      const { tree } = actualOf("customised-update");
      const settings = JSON.parse(tree.get("project/.claude/settings.json"));
      assert.ok(settings.permissions.allow.includes("Bash(npm test)"));
      assert.ok(settings.hooks.Stop.some((group) => group.hooks.some((hook) => hook.command === "say done")));
      const codex = JSON.parse(tree.get("project/.codex/hooks.json"));
      assert.ok(Object.values(codex.hooks).flat().some((group) => group.hooks.some((hook) => hook.command === "echo mine")));
    },
  },
  {
    name: "203/02 task01 — the stored delta is the user's two files and the step record",
    run: async () => {
      const delta = stored("customised-update");
      // Amended at verify (2026-11-21): update moves a drift-warned file's lock entry to the end of
      // the lock (lock.mjs `createLockManifest`), so the lock is stored changed too.
      const files = [...delta.files.keys()].filter((key) => !INSTALL_RECORDS.includes(key)).sort();
      assert.deepEqual(files, [`project/${REFINE}`, `project/${RELEASE}`]);
      assert.deepEqual([...delta.files.keys()].filter((key) => INSTALL_RECORDS.includes(key)), ["project/.aof/aof.lock.json"], "of the install records, the lock alone");
      const entries = JSON.parse(delta.files.get("project/.aof/aof.lock.json")).work.files;
      assert.equal(entries.at(-1).path, REFINE, "the kept file's lock entry is moved to the end");
      assert.ok(delta.steps.length > 0, "it stores steps.golden");
      assert.deepEqual(delta.removed, []);
    },
  },
];

// ── task 02 · R3 · an older tree upgrades to exactly the expected changes ──────────────────

const runOver = (key, files) => once(key, () => capture(workUpdate, { id: key, files, steps: [UPDATE_STEP] }));
const defaultFile = (rel) => expectedOf("work-init", "default").tree.get(`project/${rel}`);

const task02 = [
  {
    name: "203/02 task02 — a committed baseline rebuilds into a tree update accepts as current: no placeholder remains, every lock hash is real, every planned file is skipped",
    run: async () => {
      withValues((values) => {
        const tree = rebuildInit("default", values);
        assert.deepEqual([...tree].filter(([, text]) => PLACEHOLDER.test(text)).map(([key]) => key), [], "every placeholder holds the running value");
        const lock = JSON.parse(tree.get(LOCK));
        assert.ok(lock.work.files.length > 200, `non-vacuity: ${lock.work.files.length} lock entries`);
        for (const entry of lock.work.files) assert.equal(entry.hash, hashContent(tree.get(`project/${entry.path}`)), `${entry.path}'s lock hash is its file's`);
      });
      const envelope = updateEnvelope(runOver("rebuilt-default", (values) => startingFiles(rebuildInit("default", values))));
      assert.ok(envelope.actions.length > 0 && envelope.actions.every((entry) => entry.action === "skip"), JSON.stringify(envelope.summary));
    },
  },
  ...[
    ["E7", "older", "update", REFINE, (tree) => assert.equal(tree.get(`project/${REFINE}`), defaultFile(REFINE), "equals the baseline's")],
    ["E8", "retired", "delete", ".claude/commands/aof/retired.md", (tree) => assert.equal(tree.has("project/.claude/commands/aof/retired.md"), false, "does not exist")],
    ["E9", "absent", "create", ".claude/agents/aof-qa.md", (tree) => assert.equal(tree.get("project/.claude/agents/aof-qa.md"), defaultFile(".claude/agents/aof-qa.md"), "equals the baseline's")],
  ].map(([example, mutation, action, rel, after]) => ({
    name: `203/02 task02 ${example} — the older-release mutation "${mutation}" draws exactly "${action}" for ${rel}`,
    run: async () => {
      assert.ok(OLDER_RELEASE[mutation], `the lane declares the "${mutation}" mutation`);
      const actual = runOver(`older-${mutation}`, (values) => startingFiles(olderStart(values, [mutation])));
      assertOnlyAction(updateEnvelope(actual), action, rel);
      after(actual.tree);
    },
  })),
  {
    name: "203/02 task02 E10 — all three together update to exactly 1 created, 1 updated, 1 deleted, and end on work-init/default",
    run: async () => {
      assert.equal(scenarioOf("upgrade").base, "work-init/default");
      assert.deepEqual(scenarioOf("upgrade").steps, [UPDATE_STEP]);
      assertMatches("upgrade");
      const { summary, actions } = updateEnvelope(actualOf("upgrade"));
      assert.deepEqual({ created: summary.created, updated: summary.updated, deleted: summary.deleted, drift: summary["drift-warning"] }, { created: 1, updated: 1, deleted: 1, drift: 0 });
      assert.equal(summary.skipped, actions.length - 3, "the rest are skipped");
      const delta = stored("upgrade");
      assert.deepEqual([...delta.files.keys()].filter((key) => key.startsWith("project/")), [], "its stored delta holds no project file");
      assert.ok(delta.steps.length > 0, "it stores steps.golden");
    },
  },
  {
    name: "203/02 task02 E11 — the committed work-update/customised-update, whose step reports a drift-warning, is not rebuilt, and nothing is written",
    run: async () => {
      const before = snapshot(DEFAULT_BASELINE_ROOT);
      withValues((values, dir) => {
        assert.throws(
          () => rebuild({ lanes: LANES, laneId: LANE, scenarioId: "customised-update", values }),
          (error) => error.message.includes("work-update/customised-update") && error.message.includes(REFINE),
        );
        assert.deepEqual(readdirSync(path.join(dir, "project")), [], "nothing is written into the project");
      });
      assert.deepEqual(snapshot(DEFAULT_BASELINE_ROOT), before, "nothing is written under the baselines");
    },
  },
  {
    name: "203/02 task02 — a baseline whose lock names a file the baseline does not hold is not rebuilt, naming the path",
    run: async () => {
      withValues((values, dir) => {
        const root = path.join(dir, "baselines");
        const scenario = path.join(root, "planted", "s");
        mkdirSync(path.join(scenario, "project", ".aof"), { recursive: true });
        const lock = { work: { generatedAt: "<timestamp>", files: [{ path: "a/missing.md", hash: "sha256:<hash>" }] } };
        writeFileSync(path.join(scenario, "project", ".aof", "aof.lock.json.golden"), `${JSON.stringify(lock, null, 2)}\n`);
        writeFileSync(path.join(scenario, "removed.golden"), "");
        writeFileSync(path.join(scenario, "steps.golden"), "[]\n");
        const lanes = [{ id: "planted", scenarios: [{ id: "s", steps: [] }] }];
        const before = snapshot(root);
        assert.throws(() => rebuild({ lanes, root, laneId: "planted", scenarioId: "s", values }), (error) => error.message.includes("planted/s") && error.message.includes("a/missing.md"));
        assert.deepEqual(snapshot(root), before, "nothing is written");
      });
    },
  },
];

export const workUpdateTests = [...task00, ...task01, ...task02];
