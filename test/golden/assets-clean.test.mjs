// 204/02 — `aof assets clean` removes exactly what aof wrote (204/ADR-004, ADR-006 §1). The lane is
// `assets-clean.lane.mjs`; its baselines are `baselines/assets-clean/`, written only by
// `node scripts/golden.mjs --lane assets-clean --update`.
//
// Each scenario runs once per process: its normalised capture is memoised.
//
// Tasks: 00 (R1, every file aof wholly owns), 01 (R2, every merged file handed back; FF-20402 is in
// `test/arch/store/acd-codex-output-ownership.test.mjs`), 02 (R3, an edited file survives; the
// step-script cases are in `golden-harness.test.mjs`, E9 in `packages/core/test/clean.suite.mjs`).
import assert from "node:assert/strict";
import { captureScenario } from "../support/golden/harness.mjs";
import { DEFAULT_BASELINE_ROOT, compareTrees, materialise, renderReport } from "../support/golden/baseline-store.mjs";
import { LANES, findScenario } from "../support/golden/lanes.mjs";
import { EVERY_KIND } from "./assets-apply.lane.mjs";
import { AGENT_NOTE, CLAUDE_HEADING, USER_EDIT } from "./assets-clean.lane.mjs";
import { USER_FILES } from "./assets-merge.lane.mjs";
import { readToml } from "./assets-apply.test.mjs";

const LANE = "assets-clean";
const CO_AUTHORED = ["AGENTS.md", "src/AGENTS.md", "CLAUDE.md", ".mcp.json", ".codex/config.toml", ".codex/hooks.json"];

const lane = LANES.find((candidate) => candidate.id === LANE);
const scenarioOf = (id) => findScenario(LANES, LANE, id).scenario;

const captured = new Map();
const actualOf = (id) => {
  if (!captured.has(id)) captured.set(id, captureScenario(lane, scenarioOf(id)));
  return captured.get(id);
};

function assertMatches(id) {
  const expected = materialise({ lanes: LANES, root: DEFAULT_BASELINE_ROOT, laneId: LANE, scenarioId: id });
  assert.ok(!expected.missing, expected.missing);
  const difference = compareTrees(expected, actualOf(id));
  if (!difference.passed) assert.fail(renderReport(difference, { expected, actual: actualOf(id), laneId: LANE, scenarioId: id }));
}

const recordsOf = (id) => JSON.parse(actualOf(id).steps);
const text = (id, rel) => actualOf(id).tree.get(`project/${rel}`);
const json = (id, rel) => JSON.parse(text(id, rel));
const projectKeys = (id) => [...actualOf(id).tree.keys()].filter((key) => key.startsWith("project/")).map((key) => key.slice("project/".length));
const reported = (id, step, rel) => recordsOf(id)[step].envelope.actions.filter((action) => action.path === rel).map((action) => action.action);

const apply = { argv: ["assets", "apply", "--json"], exit: 0 };
const clean = { argv: ["assets", "clean", "--json"], exit: 0 };

function assertDeclaration(id, { base, files, steps }) {
  assert.equal(scenarioOf(id).base, base);
  assert.deepEqual(scenarioOf(id).files, files);
  assert.deepEqual(scenarioOf(id).steps, steps);
}

// ── task 00 · R1 · clean removes every file aof wholly owns ────────────────────────────────

const task00 = [
  {
    name: "204/02 task00 — the assets-clean lane is registered, and plain names no base, starts with EVERY_KIND, applies, cleans twice, and passes",
    run: async () => {
      assert.ok(LANES.includes(lane));
      assertDeclaration("plain", { base: undefined, files: EVERY_KIND, steps: [apply, clean, clean] });
      assertMatches("plain");
    },
  },
  {
    name: "204/02 task00 E1 — every file the apply created is gone but .claude/settings.json, the co-authored ones included, each deleted because nothing of a user's was left; the lock holds no file entry",
    run: async () => {
      const created = recordsOf("plain")[0].envelope.actions.filter((action) => action.action === "create").map((action) => action.path);
      assert.ok(created.length >= 23, `non-vacuity: ${created.length} created`);
      assert.deepEqual(created.filter((rel) => text("plain", rel) !== undefined), []);
      for (const rel of CO_AUTHORED) {
        assert.equal(text("plain", rel), undefined, `${rel} is gone`);
        assert.deepEqual(reported("plain", 1, rel), ["delete"], `${rel} is reported delete`);
      }
      assert.ok(text("plain", ".claude/settings.json") !== undefined);
      assert.deepEqual(json("plain", ".aof/aof.lock.json").files, []);
    },
  },
  {
    name: "204/02 task00 E2 — a second clean exits 0, reports no action, and changes nothing",
    run: async () => {
      const [, second, third] = recordsOf("plain");
      assert.equal(third.exit, 0);
      assert.deepEqual(third.envelope.actions, []);
      assert.ok(second.envelope.actions.length > 0, "non-vacuity: the first clean acted");
      // The same scenario stopped after the first clean: its tree is the tree the third step met.
      const afterFirstClean = captureScenario(lane, { ...scenarioOf("plain"), steps: [apply, clean] });
      assert.deepEqual([...actualOf("plain").tree], [...afterFirstClean.tree], "the second clean changed no file");
    },
  },
  {
    name: "204/02 task00 E3 — held: the merged Claude settings keep aof's lint-on-stop hook, and the apply journal stays",
    run: async () => {
      const stop = json("plain", ".claude/settings.json").hooks.Stop.flatMap((group) => group.hooks);
      assert.ok(stop.some((hook) => hook.command === "npm run lint" && hook.aofManaged === "lint-on-stop"));
      assert.ok(text("plain", ".aof/aof.apply-journal.json") !== undefined);
    },
  },
  {
    name: "204/02 task00 — the source .aof/ is untouched: the config and every asset body hold exactly what EVERY_KIND holds",
    run: async () => {
      for (const [rel, body] of Object.entries(EVERY_KIND)) assert.equal(text("plain", rel), body, rel);
    },
  },
];

// ── task 01 · R2 · clean hands every merged file back ──────────────────────────────────────

const task01 = [
  {
    name: "204/02 task01 — customised names base plain, starts with EVERY_KIND and USER_FILES, applies then cleans, and passes",
    run: async () => {
      assertDeclaration("customised", { base: "plain", files: { ...EVERY_KIND, ...USER_FILES }, steps: [apply, clean] });
      assertMatches("customised");
    },
  },
  ...["AGENTS.md", "src/AGENTS.md", "CLAUDE.md"].map((rel) => ({
    name: `204/02 task01 E4 — ${rel} comes back byte for byte, reported retract`,
    run: async () => {
      assert.equal(text("customised", rel), USER_FILES[rel]);
      assert.deepEqual(reported("customised", 1, rel), ["retract"]);
    },
  })),
  ...[
    [".codex/config.toml", readToml],
    [".codex/hooks.json", JSON.parse],
    [".mcp.json", JSON.parse],
  ].map(([rel, parse]) => ({
    name: `204/02 task01 E5 — ${rel}, parsed, equals the user's value, reported retract`,
    run: async () => {
      assert.deepEqual(parse(text("customised", rel)), parse(USER_FILES[rel]));
      assert.deepEqual(reported("customised", 1, rel), ["retract"]);
    },
  })),
  {
    name: "204/02 task01 E6 — the ignore files aof did not write are untouched and not in clean's report",
    run: async () => {
      assert.equal(text("customised", ".gitignore"), "node_modules/\n");
      assert.equal(text("customised", ".claude/.gitignore"), "local.json\n");
      assert.deepEqual(reported("customised", 1, ".gitignore"), []);
      assert.deepEqual(reported("customised", 1, ".claude/.gitignore"), []);
    },
  },
];

// ── task 02 · R3 · a file the user edited survives clean ───────────────────────────────────

const task02 = [
  {
    name: "204/02 task02 — drifted names base plain, applies, appends to my-agent.md and prepends to CLAUDE.md through user-edit.mjs, cleans, and passes",
    run: async () => {
      assertDeclaration("drifted", {
        base: "plain",
        files: EVERY_KIND,
        steps: [
          apply,
          { command: USER_EDIT, argv: [".claude/agents/my-agent.md", "--append", "Mine: a note.\n"], exit: 0 },
          { command: USER_EDIT, argv: ["CLAUDE.md", "--prepend", "# Mine\n"], exit: 0 },
          clean,
        ],
      });
      assert.deepEqual([AGENT_NOTE, CLAUDE_HEADING], ["Mine: a note.\n", "# Mine\n"]);
      assertMatches("drifted");
      assert.deepEqual(recordsOf("drifted").slice(1, 3).map((step) => step.command), [USER_EDIT, USER_EDIT], "the step records name the script");
    },
  },
  {
    name: "204/02 task02 E7 — an edited file aof wholly owned is kept, reported drift-warning, and its lock entry stays",
    run: async () => {
      assert.ok(text("drifted", ".claude/agents/my-agent.md").endsWith(AGENT_NOTE));
      assert.deepEqual(reported("drifted", 3, ".claude/agents/my-agent.md"), ["drift-warning"]);
      assert.deepEqual(json("drifted", ".aof/aof.lock.json").files.map((entry) => entry.path), [".claude/agents/my-agent.md"]);
    },
  },
  {
    name: "204/02 task02 E8 — a user's line beside aof's block is kept and only the block goes: CLAUDE.md is exactly # Mine, reported retract",
    run: async () => {
      assert.equal(text("drifted", "CLAUDE.md"), CLAUDE_HEADING);
      assert.deepEqual(reported("drifted", 3, "CLAUDE.md"), ["retract"]);
      assert.ok(projectKeys("drifted").includes("CLAUDE.md"));
    },
  },
];

export const assetsCleanTests = [...task00, ...task01, ...task02];
