// 204/01 — `aof assets apply` over the user's own file at every merge point moves only aof's
// entries, and two writers claiming one file or entry refuse before any write (204/ADR-001 §3,
// ADR-002, ADR-006 §2). The lane is `assets-merge.lane.mjs`; its baselines are
// `baselines/assets-merge/`, written only by `node scripts/golden.mjs --lane assets-merge --update`.
//
// Each scenario runs once per process: its normalised capture is memoised.
//
// Tasks: 00 (R1, the user's entries survive), 01 (R2, CLAUDE.md, .mcp.json and opencode's
// AGENTS.md merged; E9 is in `packages/core/test/render-plan.suite.mjs` and FF-20401 in
// `test/arch/store/acd-codex-output-ownership.test.mjs`), 02 (R3, applying twice), 03 (R4, refusals).
import assert from "node:assert/strict";
import { captureScenario } from "../support/golden/harness.mjs";
import { DEFAULT_BASELINE_ROOT, compareTrees, materialise, readStored, renderReport } from "../support/golden/baseline-store.mjs";
import { LANES, findScenario } from "../support/golden/lanes.mjs";
import { EVERY_KIND } from "./assets-apply.lane.mjs";
import { DOC_CONFLICT, MCP_COLLISION, OPENCODE_AGENTS, USER_FILES } from "./assets-merge.lane.mjs";
import { readToml } from "./assets-apply.test.mjs";

const LANE = "assets-merge";
const START = "<!-- aof-managed:begin -->";
const END = "<!-- aof-managed:end -->";

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
const actionsOf = (id, step = 0) => recordsOf(id)[step].envelope.actions;
const lockEntry = (id, rel) => json(id, ".aof/aof.lock.json").files.find((entry) => entry.path === rel);

const apply = (...extra) => ({ argv: ["assets", "apply", ...extra, "--json"], exit: 0 });
const refused = { argv: ["assets", "apply", "--json"], exit: 1 };

function assertDeclaration(id, { base, files, steps }) {
  assert.equal(scenarioOf(id).base, base);
  assert.deepEqual(scenarioOf(id).files, files);
  assert.deepEqual(scenarioOf(id).steps, steps);
}

// The file is the user's text byte for byte, then exactly one aof-managed block holding `line`.
function assertUserThenBlock(content, userText, line) {
  assert.ok(content.startsWith(userText), `starts with the user's lines:\n${content}`);
  const rest = content.slice(userText.length);
  assert.ok(rest.startsWith(`${START}\n`) && rest.endsWith(`${END}\n`), `what follows is one aof-managed block:\n${rest}`);
  assert.equal(rest.split(START).length, 2, "exactly one block");
  assert.ok(rest.includes(line), `the block holds ${JSON.stringify(line)}`);
}

const GUIDE = "Run `npm test` before every commit.";
const RULE = "Keep each module under 300 lines.";

// ── task 00 · R1 · over the user's own files, apply moves only aof's entries ───────────────

const task00 = [
  {
    name: "204/01 task00 E1 — the assets-merge lane is registered, and customised names base assets-apply/every-kind, starts with EVERY_KIND and USER_FILES, runs one apply, and passes",
    run: async () => {
      assert.ok(LANES.includes(lane));
      assertDeclaration("customised", { base: "assets-apply/every-kind", files: { ...EVERY_KIND, ...USER_FILES }, steps: [apply()] });
      assertMatches("customised");
    },
  },
  {
    name: "204/01 task00 E2 — the Claude settings keep the user's allow and Stop hook, before aof's lint-on-stop",
    run: async () => {
      assert.deepEqual(JSON.parse(USER_FILES[".claude/settings.json"]).permissions.allow, ["Bash(npm test)"]);
      const settings = json("customised", ".claude/settings.json");
      assert.ok(settings.permissions.allow.includes("Bash(npm test)"));
      const stop = settings.hooks.Stop.flatMap((group) => group.hooks);
      const mine = stop.findIndex((hook) => hook.command === "say done" && !hook.aofManaged);
      const ours = stop.findIndex((hook) => hook.command === "npm run lint" && hook.aofManaged === "lint-on-stop");
      assert.ok(mine >= 0 && ours > mine, `the user's hook, then aof's: ${JSON.stringify(stop)}`);
    },
  },
  {
    name: "204/01 task00 E3 — the Codex config keeps the user's key and server byte for byte, and parses with model at the top level and servers mine, docs and remote",
    run: async () => {
      assert.equal(USER_FILES[".codex/config.toml"], 'approval_policy = "never"\n\n[mcp_servers.mine]\ncommand = "my-mcp"\n');
      const toml = text("customised", ".codex/config.toml");
      assert.ok(toml.split("\n").includes('approval_policy = "never"'));
      assert.ok(toml.includes('[mcp_servers.mine]\ncommand = "my-mcp"\n'));
      const config = readToml(toml);
      assert.equal(config.model, "o3");
      assert.equal(config.approval_policy, "never");
      assert.deepEqual(Object.keys(config.mcp_servers), ["mine", "docs", "remote"]);
    },
  },
  {
    name: "204/01 task00 — the Codex hooks keep the user's Stop group first, then aof's",
    run: async () => {
      const commands = json("customised", ".codex/hooks.json").hooks.Stop.map((group) => group.hooks.map((hook) => hook.command));
      assert.deepEqual(commands, [["echo mine"], ["npm run lint"]]);
    },
  },
  ...[
    ["AGENTS.md", GUIDE, "the project doc guide"],
    ["src/AGENTS.md", RULE, "the rule my-rule"],
  ].map(([file, line, holding]) => ({
    name: `204/01 task00 E4 — ${file} starts with the user's lines byte for byte, then one aof-managed block holding ${holding}`,
    run: async () => assertUserThenBlock(text("customised", file), USER_FILES[file], line),
  })),
  {
    name: "204/01 task00 E5 — the root .gitignore is kept and reported nothing, because aof renders no such file",
    run: async () => {
      assert.equal(text("customised", ".gitignore"), "node_modules/\n");
      assert.ok(!actionsOf("customised").some((action) => action.path === ".gitignore"));
    },
  },
  {
    name: "204/01 task00 E5 — the user's .claude/.gitignore is kept and reported drift-warning",
    run: async () => {
      assert.equal(text("customised", ".claude/.gitignore"), "local.json\n");
      assert.deepEqual(actionsOf("customised").filter((action) => action.path === ".claude/.gitignore").map((action) => action.action), ["drift-warning"]);
    },
  },
];

// ── task 01 · R2 · CLAUDE.md, .mcp.json and opencode's AGENTS.md are merged ────────────────

const task01 = [
  {
    name: "204/01 task01 E6 — the user's CLAUDE.md keeps its lines, then one aof-managed block holding the guide; not overwritten, and locked with guidance ownership",
    run: async () => {
      assertUserThenBlock(text("customised", "CLAUDE.md"), "# Claude\nMine.\n", GUIDE);
      const [action] = actionsOf("customised").filter((item) => item.path === "CLAUDE.md");
      assert.notEqual(action.reason, "existing file will be overwritten");
      assert.equal(lockEntry("customised", "CLAUDE.md").ownership.kind, "guidance");
    },
  },
  {
    name: "204/01 task01 E7 — the user's MCP server mine is kept as written and docs and remote follow it; the lock owns docs and remote, not mine",
    run: async () => {
      const servers = json("customised", ".mcp.json").mcpServers;
      assert.deepEqual(Object.keys(servers), ["mine", "docs", "remote"]);
      assert.deepEqual(servers.mine, JSON.parse(USER_FILES[".mcp.json"]).mcpServers.mine);
      const { ownership } = lockEntry("customised", ".mcp.json");
      assert.equal(ownership.kind, "mcp-servers");
      assert.deepEqual(Object.keys(ownership.servers).sort(), ["docs", "remote"]);
    },
  },
  {
    name: "204/01 task01 E8 — opencode-agents, the guide on opencode alone over the user's AGENTS.md, passes, and AGENTS.md is the user's lines then aof's block",
    run: async () => {
      assertDeclaration("opencode-agents", { base: "assets-apply/opencode", files: OPENCODE_AGENTS, steps: [apply("--runtime", "opencode")] });
      assert.deepEqual(JSON.parse(OPENCODE_AGENTS[".aof/aof.config.json"]).projectDocs.find((doc) => doc.id === "guide").runtimes, ["opencode"]);
      assertMatches("opencode-agents");
      assertUserThenBlock(text("opencode-agents", "AGENTS.md"), "# Agents\nMine.\n", GUIDE);
      assert.equal(lockEntry("opencode-agents", "AGENTS.md").ownership.kind, "guidance");
    },
  },
];

// ── task 02 · R3 · applying twice over the user's files changes nothing ────────────────────

const MERGED = ["CLAUDE.md", ".mcp.json", "AGENTS.md", "src/AGENTS.md", ".codex/config.toml", ".codex/hooks.json", ".claude/settings.json"];

const task02 = [
  {
    name: "204/01 task02 E10 — customised-re-apply passes; both steps exit 0; the second skips every action but .claude/.gitignore's drift-warning; its delta holds only steps.golden",
    run: async () => {
      assertDeclaration("customised-re-apply", { base: "customised", files: { ...EVERY_KIND, ...USER_FILES }, steps: [apply(), apply()] });
      assertMatches("customised-re-apply");
      const [first, second] = recordsOf("customised-re-apply");
      assert.deepEqual([first.exit, second.exit], [0, 0]);
      assert.equal(second.envelope.actions.length, first.envelope.actions.length, "non-vacuity: the second step reports every output");
      const notSkipped = second.envelope.actions.filter((action) => action.action !== "skip").map((action) => `${action.action} ${action.path}`);
      assert.deepEqual(notSkipped, ["drift-warning .claude/.gitignore"]);
      assert.equal(second.envelope.claudeSettings.written, false);
      assert.deepEqual([...stored("customised-re-apply").files.keys()], []);
      assert.deepEqual(stored("customised-re-apply").removed, []);
    },
  },
  ...MERGED.map((file) => ({
    name: `204/01 task02 — a second apply leaves ${file} byte for byte as the first left it`,
    run: async () => {
      assert.ok(text("customised", file) !== undefined, `${file} exists`);
      assert.equal(text("customised-re-apply", file), text("customised", file));
    },
  })),
];

// ── task 03 · R4 · two writers claiming one file or entry refuse before any write ─────────

const startingTree = (files) => Object.keys(files).map((rel) => `project/${rel}`).sort();

const task03 = [
  {
    name: "204/01 task03 E11 — mcp-collision: a user's server named docs refuses with co-authored-output-conflict on .mcp.json, and the tree is the starting files alone",
    run: async () => {
      assertDeclaration("mcp-collision", { base: undefined, files: MCP_COLLISION, steps: [refused] });
      assert.deepEqual(JSON.parse(MCP_COLLISION[".mcp.json"]).mcpServers, { docs: { command: "their-docs" } });
      assertMatches("mcp-collision");
      const [{ envelope }] = recordsOf("mcp-collision");
      assert.equal(envelope.code, "co-authored-output-conflict");
      assert.match(envelope.error, /\.mcp\.json/u);
      assert.deepEqual([...actualOf("mcp-collision").tree.keys()].sort(), startingTree(MCP_COLLISION));
      assert.equal(text("mcp-collision", ".mcp.json"), MCP_COLLISION[".mcp.json"]);
    },
  },
  {
    name: "204/01 task03 E12 — doc-conflict, held: the guide also on opencode refuses with Generated output conflict at AGENTS.md, and the tree is the starting files alone",
    run: async () => {
      assertDeclaration("doc-conflict", { base: undefined, files: DOC_CONFLICT, steps: [refused] });
      assert.deepEqual(JSON.parse(DOC_CONFLICT[".aof/aof.config.json"]).projectDocs.find((doc) => doc.id === "guide").runtimes, ["claude", "codex", "opencode"]);
      assertMatches("doc-conflict");
      assert.match(recordsOf("doc-conflict")[0].envelope.error, /Generated output conflict at AGENTS\.md/u);
      assert.deepEqual([...actualOf("doc-conflict").tree.keys()].sort(), startingTree(DOC_CONFLICT));
    },
  },
  ...["mcp-collision", "doc-conflict"].map((id) => ({
    name: `204/01 task03 — ${id} writes none of its outputs: no lock, journal, Claude settings or runtime folder`,
    run: async () => {
      const keys = [...actualOf(id).tree.keys()];
      for (const rel of [".aof/aof.lock.json", ".aof/aof.apply-journal.json", ".claude/settings.json"]) assert.ok(!keys.includes(`project/${rel}`), `${rel} is absent`);
      for (const folder of [".claude/", ".codex/", ".agents/", ".opencode/"]) assert.ok(!keys.some((key) => key.startsWith(`project/${folder}`)), `${folder} is absent`);
    },
  })),
];

export const assetsMergeTests = [...task00, ...task01, ...task02, ...task03];
