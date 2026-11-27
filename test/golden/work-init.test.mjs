// 203/01 — every way a project can be initialised, held to its committed baseline (203/ADR-005).
// The lane is `work-init.lane.mjs`; its baselines are `baselines/work-init/`, written only by
// `node scripts/golden.mjs --lane work-init --update`.
//
// Each scenario runs once per process: its normalised capture is memoised, and every case that
// reads a scenario's output reads that capture. The twice-run check (task 03) runs `default` twice
// more, each in its own temp root.
//
// Tasks: 00 (R1, each runtime), 01 (R2, each profile), 02 (R3, a customised project), 03 (R4, the
// render is stable). Task 04 is @manual; its evidence is in the story's `evidence/` folder.
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSyncHardened } from "../support/cli-spawn.mjs";
import { captureScenario, runScenario } from "../support/golden/harness.mjs";
import { RULES, normaliseSteps, normaliseTree } from "../support/golden/normalise.mjs";
import { DEFAULT_BASELINE_ROOT, compareTrees, materialise, readStored, renderReport } from "../support/golden/baseline-store.mjs";
import { LANES, findScenario } from "../support/golden/lanes.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LANE = "work-init";
const LANE_ROOT = path.join(DEFAULT_BASELINE_ROOT, LANE);
const ALL = "claude,codex,opencode";
const PROFILES = ["all-practices", "notion", "hyperagent"];

// aof's own install records. They list every member a render installed, so a scenario that adds
// a member stores them changed by construction: the lock gains its entries, and the apply journal
// its actions. They are not a member's render.
const INSTALL_RECORDS = ["project/.aof/aof.lock.json", "project/.aof/aof.apply-journal.json"];

// The R1 outline's `records` column (amended at verify, 2026-11-21): a runtime's `removed.golden`
// also names the `.aof/` records that only another runtime receives. The apply journal is the
// Codex hooks merge's, and the loop records are bundle members declared
// `runtimes: ["claude", "codex"]`. This list is closed: a case below asserts the removed `.aof/`
// paths are exactly these, so it cannot grow silently.
const RUNTIME_SCOPED_AOF_RECORDS = Object.freeze({
  claude: ["project/.aof/aof.apply-journal.json"],
  codex: [],
  opencode: ["project/.aof/aof.apply-journal.json", "project/.aof/loops/"],
});

const lane = LANES.find((candidate) => candidate.id === LANE);
const scenarioOf = (id) => findScenario(LANES, LANE, id).scenario;

const captured = new Map();
const actualOf = (id) => {
  if (!captured.has(id)) captured.set(id, captureScenario(lane, scenarioOf(id)));
  return captured.get(id);
};

// The suite's comparison over the memoised capture: the store's own materialise, compare and report.
function assertMatches(id) {
  const expected = materialise({ lanes: LANES, root: DEFAULT_BASELINE_ROOT, laneId: LANE, scenarioId: id });
  assert.ok(!expected.missing, expected.missing);
  const difference = compareTrees(expected, actualOf(id));
  if (!difference.passed) assert.fail(renderReport(difference, { expected, actual: actualOf(id), laneId: LANE, scenarioId: id }));
}

const stored = (id) => readStored(DEFAULT_BASELINE_ROOT, LANE, id);
const storedProjectFiles = (id) => [...stored(id).files.keys()].filter((key) => key.startsWith("project/")).sort();
const stepsOf = (id) => JSON.parse(stored(id).steps);
const text = (id, rel) => actualOf(id).tree.get(`project/${rel}`);
const json = (id, rel) => JSON.parse(text(id, rel));

function assertOneInitStep(id, runtimes) {
  assert.deepEqual(scenarioOf(id).steps, [{ argv: ["work", "init", "--runtime", runtimes, "--json"], exit: 0 }]);
  const steps = stepsOf(id);
  assert.equal(steps.length, 1);
  assert.deepEqual(steps[0].argv, ["work", "init", "--runtime", runtimes, "--json"]);
  assert.equal(steps[0].exit, 0);
}

const allStrings = (value, into = []) => {
  if (typeof value === "string") into.push(value);
  else if (value && typeof value === "object") for (const child of Object.values(value)) allStrings(child, into);
  return into;
};

function walkFiles(dir, segments = [], into = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) walkFiles(path.join(dir, entry.name), [...segments, entry.name], into);
    else into.push([...segments, entry.name].join("/"));
  }
  return into;
}

// ── task 00 · R1 · each runtime renders to its baseline ────────────────────────────────────

const task00 = [
  {
    name: "203/01 task00 E1 — default, on three runtimes, is held whole: it passes, names no base, runs one init step, and stores every file it wrote",
    run: async () => {
      assertMatches("default");
      assert.equal(scenarioOf("default").base, undefined);
      assertOneInitStep("default", ALL);
      const written = [...actualOf("default").tree.keys()].filter((key) => key.startsWith("project/"));
      assert.deepEqual(storedProjectFiles("default"), written.sort(), "the committed project tree is every file the step wrote");
      assert.ok(written.length >= 200, `non-vacuity: ${written.length} files (238 when this was written)`);
    },
  },
  ...[
    ["E2", "claude", [".agents/", ".codex/", ".opencode/"]],
    ["E3", "codex", [".claude/", ".opencode/"]],
    ["E3", "opencode", [".agents/", ".claude/", ".codex/"]],
  ].map(([example, id, absent]) => ({
    name: `203/01 task00 ${example} — ${id} alone is held as a delta over default, whose removed.golden lists only paths under ${absent.join(", ")}`,
    run: async () => {
      assertMatches(id);
      assert.equal(scenarioOf(id).base, "default");
      assertOneInitStep(id, id);
      const removed = stored(id).removed;
      assert.ok(removed.length > 0, "the other runtimes' files are listed");
      const scoped = RUNTIME_SCOPED_AOF_RECORDS[id];
      const outside = removed.filter((key) => !absent.some((tree) => key.startsWith(`project/${tree}`)));
      assert.deepEqual(
        outside.filter((key) => !scoped.some((record) => (record.endsWith("/") ? key.startsWith(record) : key === record))),
        [],
        "every removed path is under an absent runtime's tree, or is a flagged runtime-scoped .aof record",
      );
      for (const record of scoped) assert.ok(outside.some((key) => (record.endsWith("/") ? key.startsWith(record) : key === record)), `the flagged allowance ${record} is still needed — drop it if not`);
      for (const tree of absent) assert.ok(removed.some((key) => key.startsWith(`project/${tree}`)), `${tree} is among what ${id} lacks`);
    },
  })),
  {
    name: "203/01 task00 — the global home stays empty in every scenario of the lane, and no baseline stores a file under home/",
    run: async () => {
      for (const { id } of lane.scenarios) {
        assert.deepEqual([...actualOf(id).tree.keys()].filter((key) => key.startsWith("home/")), [], `${id}'s captured home tree is empty`);
        assert.deepEqual([...stored(id).files.keys()].filter((key) => key.startsWith("home/")), [], `${id} stores nothing under home/`);
      }
    },
  },
  {
    name: "203/01 task00 E4 — every step's envelope is held: default's steps.golden holds init's summary, runtimes and actions, and every path in it is relative to <project>",
    run: async () => {
      assertMatches("default");
      const [{ envelope }] = stepsOf("default");
      assert.equal(typeof envelope.summary, "object");
      assert.ok(Number.isInteger(envelope.summary.created) && envelope.summary.created > 0, "the summary counts what init created");
      assert.deepEqual(envelope.runtimes, ["claude", "codex", "opencode"]);
      assert.ok(Array.isArray(envelope.actions) && envelope.actions.length > 0);
      for (const action of envelope.actions) assert.ok(!path.isAbsolute(action.path) && !/^[A-Za-z]:/u.test(action.path), `action path ${action.path} is relative`);
      for (const value of allStrings(envelope)) {
        assert.ok(!/^(?:\/|[A-Za-z]:[\\/])/u.test(value), `no absolute path escapes normalisation: ${value}`);
        if (value.includes("<project>")) assert.ok(value.startsWith("<project>"), `a project path is relative to <project>: ${value}`);
      }
    },
  },
  {
    name: "203/01 task00 — the lane's baselines are inert and pinned: every file ends .golden, and each runtime tree's first file is eol=lf",
    run: async () => {
      const files = walkFiles(LANE_ROOT);
      assert.ok(files.length > 200, `non-vacuity: ${files.length} baseline files`);
      assert.deepEqual(files.filter((rel) => !rel.endsWith(".golden")), []);
      const firsts = [".agents/", ".claude/", ".codex/", ".opencode/"].map((tree) => {
        const first = files.filter((rel) => rel.startsWith(`default/project/${tree}`)).sort()[0];
        assert.ok(first, `default holds a ${tree} tree`);
        return path.posix.join("test/golden/baselines", LANE, first);
      });
      const r = spawnSyncHardened("git", ["check-attr", "eol", "--", ...firsts], { cwd: repoRoot, encoding: "utf8" });
      assert.equal(r.status, 0, r.stderr);
      for (const first of firsts) assert.ok(r.stdout.includes(`${first}: eol: lf`), `${first} is pinned eol=lf:\n${r.stdout}`);
    },
  },
];

// ── task 01 · R2 · every profile renders to its baseline ───────────────────────────────────

const PROFILE_CONFIG = {
  // 198/02 — the design-system practice joined at its first prose: Claude's refine, verify and designer brief.
  "all-practices": { examples: { enabled: true, operatorAware: true }, plan: { enabled: true }, ui: { designSystem: { enabled: true, name: "AOF", mode: "reference" } } },
  notion: { integrations: { notion: {} } },
  hyperagent: { integrations: { hyperagent: {} } },
};

const notInstallRecord = (key) => !INSTALL_RECORDS.includes(key);

const task01 = [
  ...[
    ["E5", "all-practices"],
    ["E6", "notion"],
    ["E7", "hyperagent"],
  ].map(([example, id]) => ({
    name: `203/01 task01 ${example} — ${id} starts with its config, passes, names base default, and runs one init on three runtimes`,
    run: async () => {
      assert.deepEqual(JSON.parse(scenarioOf(id).files[".aof/aof.config.json"]), { work: PROFILE_CONFIG[id] });
      assertMatches(id);
      assert.equal(scenarioOf(id).base, "default");
      assertOneInitStep(id, ALL);
    },
  })),
  {
    name: "203/01 task01 E5 — every practice on changes the practice-gated prose and nothing else",
    run: async () => {
      const renders = [
        ".agents/skills/aof-refine/SKILL.md",
        ".agents/skills/aof-refine/procedure.md",
        ".claude/commands/aof/refine.md",
        ".opencode/commands/aof/refine.md",
        ...["architect", "product-owner", "qa", "researcher"].flatMap((agent) => [`.claude/agents/aof-${agent}.md`, `.codex/agents/aof-${agent}.toml`, `.opencode/agents/aof-${agent}.md`]),
        ".aof/templates/work/milestone/RESEARCH.md",
        ".aof/templates/work/story/EXAMPLES.md",
        // 198/02 — the design-system practice's Claude-only prose; no Codex or OpenCode render moves.
        ".claude/commands/aof/verify.md",
        ".claude/agents/aof-designer.md",
        // 198/03 — its variant of the milestone DESIGN.md template, which every runtime's project holds.
        ".aof/templates/work/milestone/DESIGN.md",
      ];
      assert.equal(renders.length, 21);
      const expected = [".aof/aof.config.json", ...renders].map((rel) => `project/${rel}`).sort();
      assert.deepEqual(storedProjectFiles("all-practices").filter(notInstallRecord), expected);
      assert.deepEqual(storedProjectFiles("all-practices").filter((key) => !notInstallRecord(key)), ["project/.aof/aof.lock.json"], "of the install records, the lock alone");
      assert.deepEqual(stored("all-practices").removed, []);
    },
  },
  {
    name: "203/01 task01 E6 — Notion, which ships no member, changes no generated file: its delta is its config alone",
    run: async () => {
      assert.deepEqual(storedProjectFiles("notion"), ["project/.aof/aof.config.json"]);
      assert.deepEqual(stored("notion").removed, []);
    },
  },
  {
    name: "203/01 task01 E7 — Hyperagent adds its one command in every runtime, and changes nothing else",
    run: async () => {
      const files = storedProjectFiles("hyperagent").filter(notInstallRecord);
      const skill = files.filter((key) => key.startsWith("project/.agents/skills/aof-hyperplan/"));
      assert.ok(skill.length > 0, "the codex skill's files are stored");
      assert.deepEqual(files, ["project/.aof/aof.config.json", ...skill, "project/.claude/commands/aof/hyperplan.md", "project/.opencode/commands/aof/hyperplan.md"].sort());
      const defaults = materialise({ lanes: LANES, root: DEFAULT_BASELINE_ROOT, laneId: LANE, scenarioId: "default" }).tree;
      // Amended at verify (2026-11-21): the install records list every member, so both are stored
      // changed, and "no other file default holds is stored changed" is read over member renders.
      assert.deepEqual(storedProjectFiles("hyperagent").filter((key) => !notInstallRecord(key)), [...INSTALL_RECORDS].sort(), "both install records are stored");
      assert.deepEqual(files.filter((key) => defaults.has(key) && key !== "project/.aof/aof.config.json"), [], "no other file default holds is stored changed");
      assert.deepEqual(stored("hyperagent").removed, []);
    },
  },
  {
    name: "203/01 task01 E8 — learning has no key, so /aof:teach is in default and in no profile's delta",
    run: async () => {
      assert.ok(stored("default").files.has("project/.claude/commands/aof/teach.md"), "default holds /aof:teach for Claude Code");
      for (const id of PROFILES) assert.deepEqual([...stored(id).files.keys()].filter((key) => /teach/u.test(key)), [], `${id}'s delta names no teach file`);
    },
  },
];

// ── task 02 · R3 · a customised project renders to its baseline ────────────────────────────

const AOF_SESSION_HOOKS = ["claude-session-start", "claude-session-prompt-ping", "claude-session-end"];

const task02 = [
  {
    name: "203/01 task02 — the customised project renders to its baseline, from base default with one init on three runtimes",
    run: async () => {
      assert.equal(scenarioOf("customised").base, "default");
      assertOneInitStep("customised", ALL);
      assertMatches("customised");
    },
  },
  ...[
    ["E9", ".claude/commands/deploy.md"],
    ["E12", ".codex/config.toml"],
    ["E12", ".opencode/opencode.json"],
    ["E12", "AGENTS.md"],
    ["E12", "CLAUDE.md"],
    ["E12", ".gitignore"],
  ].map(([example, rel]) => ({
    name: `203/01 task02 ${example} — a user file aof does not write is kept byte for byte: ${rel}`,
    run: async () => {
      const start = scenarioOf("customised").files[rel];
      assert.ok(start, `the customised scenario starts with ${rel}`);
      assert.equal(text("customised", rel), start);
    },
  })),
  {
    name: "203/01 task02 E10 — the Claude settings merge keeps the user's entries beside aof's",
    run: async () => {
      const settings = json("customised", ".claude/settings.json");
      assert.ok(settings.permissions.allow.includes("Bash(npm test)"), "still allows Bash(npm test)");
      const commands = (event) => (settings.hooks[event] ?? []).flatMap((group) => group.hooks);
      assert.ok(commands("Stop").some((hook) => hook.command === "say done"), "still holds the Stop hook that runs say done");
      const managed = Object.keys(settings.hooks).flatMap(commands).map((hook) => hook.aofManaged).filter(Boolean);
      for (const id of AOF_SESSION_HOOKS) assert.ok(managed.includes(id), `aof's ${id} hook is present and marked aofManaged`);
      const denies = json("default", ".claude/settings.json").permissions.deny;
      assert.ok(denies.length > 0);
      for (const deny of denies) assert.ok(settings.permissions.deny.includes(deny), `aof's deny ${deny} is present`);
    },
  },
  {
    name: "203/01 task02 E11 — the Codex hooks merge keeps the user's hook beside aof's",
    run: async () => {
      const hooks = json("customised", ".codex/hooks.json").hooks;
      const commands = Object.values(hooks).flatMap((groups) => groups.flatMap((group) => group.hooks.map((hook) => hook.command)));
      assert.ok(commands.includes("echo mine"), "still holds the hook that runs echo mine");
      for (const event of Object.keys(json("default", ".codex/hooks.json").hooks)) {
        assert.ok((hooks[event] ?? []).some((group) => group.hooks.some((hook) => hook.command.startsWith("aof session"))), `aof's ${event} session hook is present`);
      }
    },
  },
  {
    name: "203/01 task02 E13 — the work dir's gitignore keeps the user's line and gains aof's two heartbeat lines",
    run: async () => {
      const lines = text("customised", "wiki/work/.gitignore").split("\n");
      assert.ok(lines.includes("scratch/"));
      assert.ok(lines.includes("**/runs/.heartbeats.ndjson") && lines.includes("**/runs/.heartbeats.ndjson.batch"), lines.join("\n"));
    },
  },
  {
    name: "203/01 task02 E14 — a user file at an aof path is held as init leaves it today: replaced by aof's architect, reported as update, and not stored in the delta",
    run: async () => {
      assert.equal(scenarioOf("customised").files[".claude/agents/aof-architect.md"], "mine\n");
      assert.equal(text("customised", ".claude/agents/aof-architect.md"), text("default", ".claude/agents/aof-architect.md"));
      const [{ envelope }] = stepsOf("customised");
      assert.deepEqual(envelope.actions.find((action) => action.path === ".claude/agents/aof-architect.md"), { action: "update", path: ".claude/agents/aof-architect.md" });
      assert.equal(stored("customised").files.has("project/.claude/agents/aof-architect.md"), false, "the delta does not store it, because it equals the base's");
    },
  },
];

// ── task 03 · R4 · the render is the same on every run ─────────────────────────────────────

// Fewer rules than the comparison, so a hash, a version or a build id cannot hide an order.
export const TWICE_RUN_RULES = Object.freeze(["eol", "temp-paths", "instants"]);

const task03 = [
  {
    name: "203/01 task03 E15 — default, run twice in two temp roots, is byte-identical once only eol, temp paths and instants are normalised",
    run: async () => {
      const runs = [0, 1].map(() => runScenario(lane, scenarioOf("default")));
      assert.notEqual(runs[0].root, runs[1].root, "each run had its own temp root");
      const [first, second] = runs.map((run) => ({
        tree: normaliseTree(run.tree, run.ctx, { only: TWICE_RUN_RULES }),
        steps: normaliseSteps(run.steps, run.ctx, { only: TWICE_RUN_RULES }),
      }));
      const difference = compareTrees(first, second);
      if (!difference.passed) assert.fail(`an unstable render — fix it where it is rendered, never with a rule (203/ADR-002 §5):\n${renderReport(difference, { expected: first, actual: second, laneId: LANE, scenarioId: "default" })}`);
      assert.ok(first.tree.size > 200, `non-vacuity: ${first.tree.size} files compared`);
    },
  },
  {
    name: "203/01 task03 — the twice-run check uses only eol, temp-paths and instants, fewer rules than the comparison",
    run: async () => {
      assert.deepEqual([...TWICE_RUN_RULES], ["eol", "temp-paths", "instants"]);
      const all = RULES.map((rule) => rule.id);
      for (const id of TWICE_RUN_RULES) assert.ok(all.includes(id), `${id} is one of the normaliser's own rules, not a second normaliser`);
      assert.ok(TWICE_RUN_RULES.length < all.length);
    },
  },
];

export const workInitTests = [...task00, ...task01, ...task02, ...task03];
