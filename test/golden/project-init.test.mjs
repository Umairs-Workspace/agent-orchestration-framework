// 204/03 — `aof init` keeps the ignore lines it did not write, and `--global` writes only into the
// temp home (204/ADR-001 §4, ADR-005). The lane is `project-init.lane.mjs`; its baselines are
// `baselines/project-init/`, written only by `node scripts/golden.mjs --lane project-init --update`.
//
// Each scenario runs once per process: its normalised capture is memoised.
//
// Tasks: 00 (R1, the scaffold and a second init), 01 (R2, lines and sections init did not write),
// 02 (R3, the global path).
import assert from "node:assert/strict";
import { captureScenario } from "../support/golden/harness.mjs";
import { DEFAULT_BASELINE_ROOT, compareTrees, materialise, readStored, renderReport } from "../support/golden/baseline-store.mjs";
import { LANES, findScenario } from "../support/golden/lanes.mjs";
import { CUSTOMISED_FILES, GLOBAL_STEPS } from "./project-init.lane.mjs";

const LANE = "project-init";
const ALL = "claude,codex,opencode";

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

const stored = (id) => readStored(DEFAULT_BASELINE_ROOT, LANE, id);
const recordsOf = (id) => JSON.parse(actualOf(id).steps);
const text = (id, rel) => actualOf(id).tree.get(`project/${rel}`);
const json = (id, rel) => JSON.parse(text(id, rel));
const homeKeys = (id) => [...actualOf(id).tree.keys()].filter((key) => key.startsWith("home/")).map((key) => key.slice("home/".length)).sort();
const step = (argv, exit = 0) => ({ argv: [...argv, "--json"], exit });
const init = (runtimes, exit = 0) => step(["init", "--runtime", runtimes], exit);

const workInitClaude = () => materialise({ lanes: LANES, root: DEFAULT_BASELINE_ROOT, laneId: "work-init", scenarioId: "claude" }).tree;

// ── task 00 · R1 · init writes its scaffold, and a second init refuses ─────────────────────

const task00 = [
  {
    name: "204/03 task00 E1 — empty names no base, starts with no file, runs init on three runtimes, passes, and leaves the home empty",
    run: async () => {
      assert.ok(LANES.includes(lane));
      assert.equal(scenarioOf("empty").base, undefined);
      assert.equal(scenarioOf("empty").files, undefined);
      assert.deepEqual(scenarioOf("empty").steps, [init(ALL)]);
      assertMatches("empty");
      assert.deepEqual(homeKeys("empty"), []);
    },
  },
  {
    name: "204/03 task00 — the scaffold is exactly init's three files: the config names the runtimes and no resource, the lock holds no items, the ignore file holds /work/",
    run: async () => {
      assert.deepEqual([...actualOf("empty").tree.keys()].sort(), ["project/.aof/.gitignore", "project/.aof/aof.config.json", "project/.aof/aof.lock.json"]);
      const config = json("empty", ".aof/aof.config.json");
      assert.deepEqual(config.runtimes, ["claude", "codex", "opencode"]);
      assert.deepEqual(config.resources, []);
      const lock = json("empty", ".aof/aof.lock.json");
      assert.deepEqual(lock.items, []);
      assert.deepEqual(lock.runtimes, ["claude", "codex", "opencode"]);
      assert.equal(text("empty", ".aof/.gitignore"), "/work/\n");
    },
  },
  {
    name: "204/03 task00 E2 — re-init runs init twice, the second exits 1 with config-exists, and its delta holds only steps.golden",
    run: async () => {
      assert.equal(scenarioOf("re-init").base, "empty");
      assert.deepEqual(scenarioOf("re-init").steps, [init(ALL), init(ALL, 1)]);
      assertMatches("re-init");
      const [, second] = recordsOf("re-init");
      assert.equal(second.exit, 1);
      assert.equal(second.envelope.code, "config-exists");
      assert.deepEqual([...stored("re-init").files.keys()], []);
      assert.deepEqual(stored("re-init").removed, []);
    },
  },
];

// ── task 01 · R2 · init keeps every line and section it did not write ──────────────────────

const task01 = [
  {
    name: "204/03 task01 E3 — customised keeps the user's ignore lines and appends init's: .aof/.gitignore is scratch/ then /work/, the root .gitignore untouched",
    run: async () => {
      assert.equal(scenarioOf("customised").base, "empty");
      assert.deepEqual(scenarioOf("customised").files, { ".aof/.gitignore": "scratch/\n", ".gitignore": "node_modules/\n" });
      assert.equal(CUSTOMISED_FILES, scenarioOf("customised").files);
      assert.deepEqual(scenarioOf("customised").steps, [init(ALL)]);
      assertMatches("customised");
      assert.equal(text("customised", ".aof/.gitignore"), "scratch/\n/work/\n");
      assert.equal(text("customised", ".gitignore"), "node_modules/\n");
    },
  },
  {
    name: "204/03 task01 E4 — after work init, init keeps every line of work-init/claude's .aof/.gitignore in order, then /work/",
    run: async () => {
      assert.equal(scenarioOf("after-work-init").base, "work-init/claude");
      assert.deepEqual(scenarioOf("after-work-init").steps, [step(["work", "init", "--runtime", "claude"]), init("claude")]);
      assertMatches("after-work-init");
      const before = workInitClaude().get("project/.aof/.gitignore");
      assert.ok(before.split("\n").filter(Boolean).length >= 8, "non-vacuity: work init's entries");
      assert.equal(text("after-work-init", ".aof/.gitignore"), `${before}/work/\n`);
    },
  },
  {
    name: "204/03 task01 E5 — after work init, the lock's work section equals work-init/claude's, and init adds only its own top-level keys",
    run: async () => {
      const before = JSON.parse(workInitClaude().get("project/.aof/aof.lock.json"));
      const after = json("after-work-init", ".aof/aof.lock.json");
      assert.ok(before.work?.files?.length > 0, "non-vacuity: work init's lock section");
      assert.deepEqual(after.work, before.work);
      const added = Object.keys(after).filter((key) => !Object.hasOwn(before, key));
      for (const key of added) assert.ok(["version", "generatedAt", "catalog", "runtimes", "items"].includes(key), `init adds only its own keys, not ${key}`);
      for (const key of Object.keys(before)) if (!["version", "generatedAt", "catalog", "runtimes", "items"].includes(key)) assert.deepEqual(after[key], before[key], `${key} is kept`);
    },
  },
  {
    name: "204/03 task01 — init adds nothing when its line is already there",
    run: async () => {
      const present = { id: "line-present", files: { ".aof/.gitignore": "/work/\nscratch/\n" }, steps: [init("claude")] };
      const { tree } = captureScenario(lane, present);
      assert.equal(tree.get("project/.aof/.gitignore"), "/work/\nscratch/\n");
    },
  },
];

// ── task 02 · R3 · --global writes only into the temp global home ──────────────────────────

const GLOBAL_OUTPUTS = [
  ["skill", "g-skill", ".claude/skills/g-skill/SKILL.md"],
  ["skill", "g-skill", ".agents/skills/g-skill/SKILL.md"],
  ["skill", "g-skill", ".opencode/skills/g-skill/SKILL.md"],
  ["agent", "g-agent", ".claude/agents/g-agent.md"],
  ["agent", "g-agent", ".codex/agents/g-agent.toml"],
  ["agent", "g-agent", ".opencode/agents/g-agent.md"],
  ["rule", "g-rule", ".claude/rules/g-rule.md"],
  ["rule", "g-rule", "AGENTS.md"],
  ["rule", "g-rule", ".opencode/rules/g-rule.md"],
];

const allStrings = (value, into = []) => {
  if (typeof value === "string") into.push(value);
  else if (value && typeof value === "object") for (const child of Object.values(value)) allStrings(child, into);
  return into;
};

const task02 = [
  {
    name: "204/03 task02 — global names base empty, runs init, three global adds, a refused global command, three uses and an apply, and passes",
    run: async () => {
      assert.equal(scenarioOf("global").base, "empty");
      const argvs = GLOBAL_STEPS.map(({ argv, exit }) => [argv.slice(0, 4).join(" "), exit]);
      assert.deepEqual(argvs, [
        ["init --runtime claude,codex,opencode --json", 0],
        ["assets add --global skill", 0],
        ["assets add --global agent", 0],
        ["assets add --global rule", 0],
        ["assets add --global command", 1],
        ["assets use --global skill", 0],
        ["assets use --global agent", 0],
        ["assets use --global rule", 0],
        ["assets apply --json", 0],
      ]);
      assertMatches("global");
    },
  },
  {
    name: "204/03 task02 E6 — the home holds the global config and the three bodies, and nothing else",
    run: async () => {
      assert.deepEqual(homeKeys("global"), ["aof.config.json", "assets/agents/g-agent/AGENT.md", "assets/rules/g-rule/RULE.md", "assets/skills/g-skill/SKILL.md"]);
    },
  },
  {
    name: "204/03 task02 E7 — the fifth step, a global command, exits 1 saying command is not a valid global kind",
    run: async () => {
      const fifth = recordsOf("global")[4];
      assert.equal(fifth.exit, 1);
      assert.match(fifth.envelope.error, /global resource kind "command"/u);
    },
  },
  ...GLOBAL_OUTPUTS.map(([kind, id, output]) => ({
    name: `204/03 task02 E8 — the global ${kind} ${id} renders ${output}`,
    run: async () => {
      assert.ok(text("global", output)?.includes(`Global ${kind} body.`), `${output} carries the global ${kind}'s body`);
      const entry = json("global", ".aof/aof.lock.json").files.find((item) => item.path === output);
      assert.deepEqual([entry?.resource.kind, entry?.resource.id, entry?.resource.scope], [kind, id, "global"]);
    },
  })),
  {
    name: "204/03 task02 — every absolute path in the normalised step records lies under <project> or <home>",
    run: async () => {
      const strings = recordsOf("global").flatMap((record) => allStrings(record));
      assert.ok(strings.some((value) => value.includes("<home>")), "non-vacuity: a step reports a home path");
      for (const value of strings) {
        assert.ok(!/(?:^|[\s"'(])(?:\/(?!work\/)[A-Za-z]|[A-Za-z]:[\\/])/u.test(value.replace(/<(?:project|home)>\/\S*/gu, "")), `no absolute path outside <project> or <home>: ${value}`);
      }
    },
  },
];

export const projectInitTests = [...task00, ...task01, ...task02];
