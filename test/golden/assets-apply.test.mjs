// 204/00 — `aof assets apply` over a project holding every asset kind, held to its committed
// baseline (204/ADR-001, ADR-003). The lane is `assets-apply.lane.mjs`; its baselines are
// `baselines/assets-apply/`, written only by `node scripts/golden.mjs --lane assets-apply --update`.
//
// Each scenario runs once per process: its normalised capture is memoised, and every case that
// reads a scenario's output reads that capture.
//
// Tasks: 00 (R1, R3, every kind and the records), 01 (R2, each runtime alone), 02 (R4, applying
// twice). The TOML merge's own cases (ADR-003 §4) are in `packages/core/test/codex-ownership.suite.mjs`.
import assert from "node:assert/strict";
import { captureScenario } from "../support/golden/harness.mjs";
import { DEFAULT_BASELINE_ROOT, compareTrees, materialise, readStored, renderReport } from "../support/golden/baseline-store.mjs";
import { LANES, findScenario } from "../support/golden/lanes.mjs";
import { EVERY_KIND } from "./assets-apply.lane.mjs";

const LANE = "assets-apply";
const RUNTIMES = ["claude", "codex", "opencode"];

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
const projectPaths = (id) => [...actualOf(id).tree.keys()].filter((key) => key.startsWith("project/")).map((key) => key.slice("project/".length));
const fixtureConfig = () => JSON.parse(EVERY_KIND[".aof/aof.config.json"]);

// A strict reader for the TOML subset the Codex config renders: `[a.b]` headers, and `key = value`
// lines whose value is a JSON string, number, boolean or array. Any other line throws, so a file it
// reads is read the same way by Codex. It is deliberately not aof's own TOML index: the merge is
// what is being checked.
export function readToml(source) {
  const root = {};
  let table = root;
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const header = /^\[([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\]$/u.exec(trimmed);
    if (header) {
      table = root;
      for (const part of header[1].split(".")) table = table[part] ??= {};
      continue;
    }
    const pair = /^([A-Za-z0-9_-]+)\s*=\s*(.+)$/u.exec(trimmed);
    if (!pair) throw new Error(`readToml: unsupported line ${JSON.stringify(line)}`);
    if (Object.hasOwn(table, pair[1])) throw new Error(`readToml: duplicate key ${pair[1]}`);
    table[pair[1]] = JSON.parse(pair[2]);
  }
  return root;
}

const apply = (...extra) => ({ argv: ["assets", "apply", ...extra, "--json"], exit: 0 });

function assertDeclaration(id, { base, steps }) {
  assert.equal(scenarioOf(id).base, base);
  assert.deepEqual(scenarioOf(id).files, EVERY_KIND, `${id} starts with the files of EVERY_KIND`);
  assert.deepEqual(scenarioOf(id).steps, steps);
  assert.deepEqual(JSON.parse(stored(id).steps).map(({ argv, exit }) => ({ argv, exit })), steps, `${id}'s stored steps are the declared ones`);
}

// ── task 00 · R1, R3 · every asset kind renders to its baseline ────────────────────────────

// The body line each asset's render must carry, by kind and id: what "rendered from" means here.
// The hook's command is its body; opencode's plugin spells it as an argv.
const BODY_LINE = {
  "agent:my-agent": "Review each change for correctness before it merges.",
  "skill:my-skill": "Run the tests, then summarise what failed.",
  "rule:my-rule": "Keep each module under 300 lines.",
  "command:my-command": "List the open pull requests.",
  "workflow:release": "Tag the commit.",
  "hook:lint-on-stop": ["npm run lint", '["npm","run","lint"]'],
  "project doc:guide": "Run `npm test` before every commit.",
};

const KIND_ROWS = [
  ["agent", "my-agent", "claude", ".claude/agents/my-agent.md"],
  ["agent", "my-agent", "codex", ".codex/agents/my-agent.toml"],
  ["agent", "my-agent", "opencode", ".opencode/agents/my-agent.md"],
  ["skill", "my-skill", "claude", ".claude/skills/my-skill/SKILL.md"],
  ["skill", "my-skill", "codex", ".agents/skills/my-skill/SKILL.md"],
  ["skill", "my-skill", "opencode", ".opencode/skills/my-skill/SKILL.md"],
  ["rule", "my-rule", "claude", ".claude/rules/my-rule.md"],
  ["rule", "my-rule", "opencode", ".opencode/rules/my-rule.md"],
  ["workflow", "release", "claude", ".claude/aof/workflows/release.md"],
  ["workflow", "release", "codex", ".codex/aof/workflows/release.md"],
  ["workflow", "release", "opencode", ".opencode/aof/workflows/release.md"],
  ["hook", "lint-on-stop", "codex", ".codex/hooks.json"],
  ["hook", "lint-on-stop", "opencode", ".opencode/plugins/aof-lint-on-stop.js"],
  ["project doc", "guide", "claude", "CLAUDE.md"],
  ["project doc", "guide", "codex", "AGENTS.md"],
];

const lockOf = (id) => json(id, ".aof/aof.lock.json");
const lockEntry = (id, rel) => lockOf(id).files.find((entry) => entry.path === rel);
const applyActions = (id, step = 0) => recordsOf(id)[step].envelope.actions;

const task00 = [
  {
    name: "204/00 task00 — the assets-apply lane is registered with the harness, and every-kind names no base, starts with EVERY_KIND and runs one apply",
    run: async () => {
      assert.ok(LANES.includes(lane), "the lane is in the registry");
      assert.deepEqual(lane.scenarios.map(({ id }) => id), ["every-kind", ...RUNTIMES, "re-apply"]);
      assertDeclaration("every-kind", { base: undefined, steps: [apply()] });
    },
  },
  {
    name: "204/00 task00 E1 — every-kind, on three runtimes, passes; its stored baseline removes nothing and stores every file the step wrote; the home stays empty",
    run: async () => {
      assertMatches("every-kind");
      assert.deepEqual(stored("every-kind").removed, [], "a whole baseline names no removal");
      const written = [...actualOf("every-kind").tree.keys()].filter((key) => key.startsWith("project/")).sort();
      assert.deepEqual([...stored("every-kind").files.keys()].filter((key) => key.startsWith("project/")).sort(), written);
      assert.deepEqual([...actualOf("every-kind").tree.keys()].filter((key) => key.startsWith("home/")), [], "the captured home tree holds no file");
      assert.equal(applyActions("every-kind").length, 23, "non-vacuity: 23 outputs plus the merged Claude settings (ARCHITECTURE, measured facts)");
    },
  },
  ...KIND_ROWS.map(([kind, id, runtime, output]) => ({
    name: `204/00 task00 — the ${kind} "${id}" renders ${output} for ${runtime}`,
    run: async () => {
      const content = text("every-kind", output);
      assert.ok(content !== undefined, `${output} exists`);
      assert.ok([BODY_LINE[`${kind}:${id}`]].flat().some((line) => content.includes(line)), `${output} carries the ${kind}'s body`);
      const entry = lockEntry("every-kind", output);
      assert.equal(entry?.runtime, runtime, `the lock records ${output} for ${runtime}`);
      if (!["hook", "project doc"].includes(kind)) assert.deepEqual([entry.resource.kind, entry.resource.id], [kind, id]);
    },
  })),
  {
    name: "204/00 task00 — the Claude hook lands in the merged settings as a Stop hook running npm run lint, marked aofManaged lint-on-stop",
    run: async () => {
      const stop = json("every-kind", ".claude/settings.json").hooks.Stop.flatMap((group) => group.hooks);
      assert.deepEqual(stop.filter((hook) => hook.aofManaged === "lint-on-stop"), [{ type: "command", command: "npm run lint", aofManaged: "lint-on-stop" }]);
    },
  },
  {
    name: "204/00 task00 E2 — the command renders for claude and opencode, and nothing under .codex/ or .agents/ is rendered from it",
    run: async () => {
      assert.deepEqual(fixtureConfig().resources.find((resource) => resource.id === "my-command").runtimes, ["claude", "opencode"]);
      assert.ok(text("every-kind", ".claude/commands/my-command.md"));
      assert.ok(text("every-kind", ".opencode/commands/my-command.md"));
      const codexSide = projectPaths("every-kind").filter((rel) => rel.startsWith(".codex/") || rel.startsWith(".agents/"));
      assert.ok(codexSide.length > 0, "non-vacuity: Codex outputs exist");
      for (const rel of codexSide) assert.ok(!text("every-kind", rel).includes(BODY_LINE["command:my-command"]), `${rel} holds nothing of my-command`);
      assert.deepEqual(lockOf("every-kind").files.filter((entry) => entry.resource.id === "my-command").map((entry) => entry.runtime).sort(), ["claude", "opencode"]);
    },
  },
  {
    name: "204/00 task00 E3 — the MCP servers render to .mcp.json and under mcp_servers in the Codex config, and no .opencode/ file declares one",
    run: async () => {
      assert.deepEqual(Object.keys(json("every-kind", ".mcp.json").mcpServers).sort(), ["docs", "remote"]);
      assert.deepEqual(Object.keys(readToml(text("every-kind", ".codex/config.toml")).mcp_servers).sort(), ["docs", "remote"]);
      const opencode = projectPaths("every-kind").filter((rel) => rel.startsWith(".opencode/"));
      assert.ok(opencode.length > 0, "non-vacuity: opencode outputs exist");
      for (const rel of opencode) assert.doesNotMatch(text("every-kind", rel), /docs-mcp|mcp\.example\.com|mcpServers|"mcp"/u, `${rel} declares no MCP server`);
    },
  },
  {
    name: "204/00 task00 E4 — the rule scoped to src renders inside an aof-managed block in src/AGENTS.md, and the root AGENTS.md holds the guide and not the rule",
    run: async () => {
      const scoped = text("every-kind", "src/AGENTS.md");
      const block = /<!-- aof-managed:begin -->([\s\S]*)<!-- aof-managed:end -->/u.exec(scoped);
      assert.ok(block, "src/AGENTS.md holds an aof-managed block");
      assert.ok(block[1].includes(BODY_LINE["rule:my-rule"]), "the block holds my-rule");
      const root = text("every-kind", "AGENTS.md");
      assert.ok(root.includes(BODY_LINE["project doc:guide"]), "AGENTS.md holds the guide");
      assert.ok(!root.includes(BODY_LINE["rule:my-rule"]) && !root.includes("my-rule"), "AGENTS.md holds nothing of my-rule");
    },
  },
  {
    name: "204/00 task00 E8 — the lock holds one entry per output the step reports, none for the merged Claude settings, each naming path, runtime, resource and hash; the Codex config's records toml ownership",
    run: async () => {
      const entries = lockOf("every-kind").files;
      assert.deepEqual(entries.map((entry) => entry.path).sort(), applyActions("every-kind").map((action) => action.path).sort());
      assert.equal(new Set(entries.map((entry) => entry.path)).size, entries.length, "one entry per output");
      assert.ok(!entries.some((entry) => entry.path === ".claude/settings.json"));
      for (const entry of entries) {
        assert.equal(typeof entry.path, "string");
        assert.ok(RUNTIMES.includes(entry.runtime), `${entry.path} names its runtime`);
        assert.ok(entry.resource?.kind && entry.resource?.id, `${entry.path} names its resource`);
        assert.equal(entry.hash, "sha256:<hash>", `${entry.path} carries a hash`);
      }
      assert.equal(lockEntry("every-kind", ".codex/config.toml").ownership.kind, "toml");
    },
  },
  {
    name: "204/00 task00 E9 — the apply journal holds one entry for each output whose runtime is codex, and one for CLAUDE.md and .mcp.json (amended by 204/01, ADR-002 §3)",
    run: async () => {
      const codex = applyActions("every-kind").filter((action) => action.runtime === "codex").map((action) => action.path);
      assert.ok(codex.length > 0, "non-vacuity: Codex outputs exist");
      assert.deepEqual(json("every-kind", ".aof/aof.apply-journal.json").files.map((entry) => entry.path).sort(), [...codex, "CLAUDE.md", ".mcp.json"].sort());
    },
  },
];

// ── task 01 · R2 · each runtime alone renders its own share ────────────────────────────────

const under = (...trees) => (rel) => trees.some((tree) => rel.startsWith(tree));
const exactly = (...paths) => (rel) => paths.includes(rel);
const either = (...tests) => (rel) => tests.some((test) => test(rel));

// The E5/E6 table: what each runtime alone removes from every-kind, and what it keeps.
const ALONE = {
  claude: {
    removed: either(under(".agents/", ".opencode/"), exactly("AGENTS.md", "src/AGENTS.md"), (rel) => rel.startsWith(".codex/") && rel !== ".codex/config.toml"),
    kept: either(under(".claude/"), exactly("CLAUDE.md", ".mcp.json", ".codex/config.toml")),
    codexConfig: (toml) => assert.equal(toml, 'model = "o3"\n'),
  },
  codex: {
    removed: either((rel) => (rel.startsWith(".claude/") && rel !== ".claude/settings.json") || rel.startsWith(".opencode/"), exactly("CLAUDE.md", ".mcp.json")),
    kept: either(under(".codex/", ".agents/"), exactly("AGENTS.md", "src/AGENTS.md", ".claude/settings.json")),
    codexConfig: (toml) => assert.deepEqual(Object.keys(readToml(toml).mcp_servers).sort(), ["docs", "remote"]),
  },
  opencode: {
    removed: either((rel) => under(".claude/", ".codex/", ".agents/")(rel) && !exactly(".claude/settings.json", ".codex/config.toml")(rel), exactly("AGENTS.md", "src/AGENTS.md", "CLAUDE.md", ".mcp.json")),
    kept: either(under(".opencode/"), exactly(".claude/settings.json", ".codex/config.toml")),
    codexConfig: (toml) => assert.equal(toml, 'model = "o3"\n'),
  },
};

const task01 = [
  ...RUNTIMES.map((runtime) => ({
    name: `204/00 task01 — ${runtime} alone names base every-kind, starts with EVERY_KIND, runs apply --runtime ${runtime}, and passes`,
    run: async () => {
      assertDeclaration(runtime, { base: "every-kind", steps: [apply("--runtime", runtime)] });
      assertMatches(runtime);
    },
  })),
  ...RUNTIMES.map((runtime) => ({
    name: `204/00 task01 ${runtime === "claude" ? "E5" : "E6"} — ${runtime} alone's removed.golden names every other runtime's output and none of its own`,
    run: async () => {
      const removed = stored(runtime).removed.map((key) => key.slice("project/".length));
      const expected = projectPaths("every-kind").filter(ALONE[runtime].removed).sort();
      assert.ok(expected.length > 0, "non-vacuity");
      assert.deepEqual(removed, expected, "it names exactly the other runtimes' outputs");
      assert.deepEqual(removed.filter(ALONE[runtime].kept), [], "it names none of its own");
    },
  })),
  ...RUNTIMES.map((runtime) => ({
    name: `204/00 task01 E7 — ${runtime} alone keeps .claude/settings.json and a .codex/config.toml held as today's behaviour`,
    run: async () => {
      assert.ok(text(runtime, ".claude/settings.json"), ".claude/settings.json exists");
      ALONE[runtime].codexConfig(text(runtime, ".codex/config.toml"));
    },
  })),
];

// ── task 02 · R4 · applying twice changes nothing ──────────────────────────────────────────

const task02 = [
  {
    name: "204/00 task02 E10 — re-apply runs apply twice over every-kind, both exit 0, the second skips every action, and its stored delta holds only steps.golden",
    run: async () => {
      assertDeclaration("re-apply", { base: "every-kind", steps: [apply(), apply()] });
      assertMatches("re-apply");
      const [first, second] = recordsOf("re-apply");
      assert.deepEqual([first.exit, second.exit], [0, 0]);
      assert.equal(second.envelope.actions.length, first.envelope.actions.length, "non-vacuity: the second step reports every output");
      assert.deepEqual(second.envelope.actions.filter((action) => action.action !== "skip").map((action) => `${action.action} ${action.path}`), []);
      assert.equal(second.envelope.claudeSettings.written, false, "the merged Claude settings are left alone too");
      assert.deepEqual([...stored("re-apply").files.keys()], [], "no file differs from every-kind's");
      assert.deepEqual(stored("re-apply").removed, []);
    },
  },
  {
    name: "204/00 task02 E11 — every-kind's Codex config parses with model = o3 at the top level and both servers under mcp_servers, neither holding a model",
    run: async () => {
      const config = readToml(text("every-kind", ".codex/config.toml"));
      assert.equal(config.model, "o3");
      assert.deepEqual(Object.keys(config.mcp_servers).sort(), ["docs", "remote"]);
      for (const [id, server] of Object.entries(config.mcp_servers)) assert.ok(!Object.hasOwn(server, "model"), `mcp_servers.${id} holds no model`);
    },
  },
];

export const assetsApplyTests = [...task00, ...task01, ...task02];
