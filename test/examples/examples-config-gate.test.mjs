import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 134 / story 02 — the `work.examples.enabled` gate — and for
// milestone 193 / story 03's switch beside it, `work.examples.operatorAware`.
//
// Covers EVERY @executable scenario in
//   134/02 tasks/02_the-examples-gate-is-off-unless-a-project-turns-it-on.feature
//   193/03 tasks/00_operator-aware-discovery-is-off-unless-a-project-turns-it-on.feature
//
// The resolver is asked directly, and the validator is driven through the real `validateConfig`
// over a fixture project `P` in a fresh temp directory, its global home another fresh temp
// directory handed in through the options' `env` — so no run reads or writes the real `~/.aof`.
// One test object per @executable scenario, Scenario Outline rows folded into one entry.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { E, QUESTIONS, R, citedOf, mapOf, researchDoc, withCited, F } from "./doctor-examples-lane.test.mjs";

const examplesEnabledFromConfig = _aofApplication.assets.configInspect.examplesEnabledFromConfig;
const operatorAwareFromConfig = _aofApplication.assets.configInspect.operatorAwareFromConfig;
const loadWorkspace = _aofApplication.loadWorkspace;
const planEnabledFromConfig = _aofApplication.assets.configInspect.planEnabledFromConfig;
const validateConfig = _aofApplication.assets.configInspect.validateConfig;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// A project `P` carrying only a config, validated against its own fresh global home.
async function withProject(config, body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-examples-gate-"));
  const globalHome = await mkdtemp(path.join(os.tmpdir(), "aof-examples-gate-home-"));
  try {
    await mkdir(path.join(root, ".aof"), { recursive: true });
    await writeFile(path.join(root, ".aof", "aof.config.json"), JSON.stringify({ name: "fixture", ...config }, null, 2), "utf8");
    await body(() => validateConfig(root, { env: { ...process.env, AOF_GLOBAL_HOME: globalHome } }));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(globalHome, { recursive: true, force: true });
  }
}

const ABSENT = Symbol("absent");
const GATE_ROWS = [
  { configured: "absent", examples: ABSENT, resolved: false, diagnosed: [] },
  { configured: "false", examples: { enabled: false }, resolved: false, diagnosed: [] },
  { configured: "true", examples: { enabled: true }, resolved: true, diagnosed: [] },
  { configured: "a string", examples: { enabled: "yes" }, resolved: false, diagnosed: [["work.examples.enabled", "examples-gate-bad-value"]] },
  { configured: "a number", examples: { enabled: 1 }, resolved: false, diagnosed: [["work.examples.enabled", "examples-gate-bad-value"]] },
  { configured: "null", examples: { enabled: null }, resolved: false, diagnosed: [["work.examples.enabled", "examples-gate-bad-value"]] },
  { configured: "the string true", examples: { enabled: "true" }, resolved: false, diagnosed: [["work.examples.enabled", "examples-gate-bad-value"]] },
  { configured: "an empty object", examples: {}, resolved: false, diagnosed: [] },
  { configured: "a boolean", examples: true, resolved: false, diagnosed: [["work.examples", "examples-gate-bad-value"]] },
  { configured: "an array", examples: [], resolved: false, diagnosed: [["work.examples", "examples-gate-bad-value"]] },
  { configured: "a bare string", examples: "on", resolved: false, diagnosed: [["work.examples", "examples-gate-bad-value"]] },
  { configured: "a misspelt key", examples: { enable: true }, resolved: false, diagnosed: [["work.examples.enable", "examples-gate-unknown-key"]] },
  { configured: "an extra key", examples: { enabled: true, extra: 1 }, resolved: true, diagnosed: [["work.examples.extra", "examples-gate-unknown-key"]] },
];

const configOf = (examples) => ({ work: { dir: "./wiki/work", ...(examples === ABSENT ? {} : { examples }) } });
const gateDiagnostics = (diagnostics) => diagnostics.filter((entry) => entry.path.startsWith("work.examples"));

// ══ 193/03 · 00_operator-aware-discovery-is-off-unless-a-project-turns-it-on.feature ══
// A project `P` whose `work.examples` is `examples` (or absent), with a declared memory backend so
// `init-config` has no hole of its own to fill, and a global home whose config is `global` (or none).
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
async function withSwitch({ examples = ABSENT, operator = ABSENT, global = ABSENT } = {}, body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-operator-switch-"));
  const project = path.join(root, "P");
  const home = path.join(root, "home");
  try {
    await mkdir(path.join(project, ".aof"), { recursive: true });
    await mkdir(path.join(project, "wiki", "work"), { recursive: true });
    await mkdir(home, { recursive: true });
    const configPath = path.join(project, ".aof", "aof.config.json");
    const globalPath = path.join(home, "aof.config.json");
    const work = { dir: "./wiki/work", ...(examples === ABSENT ? {} : { examples }), ...(operator === ABSENT ? {} : { operator }) };
    await writeFile(configPath, JSON.stringify({ name: "fixture", resources: [], memory: { backend: "local" }, work }, null, 2), "utf8");
    if (global !== ABSENT) await writeFile(globalPath, JSON.stringify(global, null, 2), "utf8");
    const env = { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" };
    const cli = (...args) => {
      const result = spawnSync(process.execPath, [cliPath, ...args], { cwd: project, encoding: "utf8", env });
      let json = null;
      try { json = JSON.parse(result.stdout); } catch { json = null; }
      return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", json };
    };
    const bytes = async () => [await readFile(configPath, "utf8"), existsSync(globalPath) ? await readFile(globalPath, "utf8") : null];
    const config = async () => JSON.parse(await readFile(configPath, "utf8"));
    await body({ project, home, configPath, globalPath, env, cli, bytes, config,
      validate: () => validateConfig(project, { env }),
      loaded: async () => (await loadWorkspace(project, undefined, { env })).config });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const UNDECLARED = "operator-profile-undeclared";
const undeclaredIn = (json) => (json?.findings ?? []).filter((finding) => finding.code === UNDECLARED);
const examplesCodes = (diagnostics) => (diagnostics ?? []).filter((entry) => entry.code?.startsWith("examples-")).map((entry) => [entry.code, entry.path]);

const SWITCH_ROWS = [
  ["absent", ABSENT, false, []],
  ["{ enabled: true }", { enabled: true }, false, []],
  ["{ enabled: true, operatorAware: false }", { enabled: true, operatorAware: false }, false, []],
  ["{ enabled: true, operatorAware: true }", { enabled: true, operatorAware: true }, true, []],
  ["{ enabled: true, operatorAware: \"true\" }", { enabled: true, operatorAware: "true" }, false, [["examples-gate-bad-value", "work.examples.operatorAware"]]],
  ["{ enabled: true, operatorAware: 1 }", { enabled: true, operatorAware: 1 }, false, [["examples-gate-bad-value", "work.examples.operatorAware"]]],
  ["{ enabled: false, operatorAware: true }", { enabled: false, operatorAware: true }, false, [["examples-operator-aware-without-discovery", "work.examples.operatorAware"]]],
  ["{ operatorAware: true }", { operatorAware: true }, false, [["examples-operator-aware-without-discovery", "work.examples.operatorAware"]]],
  ["{ enabled: true, operatorAwar: true }", { enabled: true, operatorAwar: true }, false, [["examples-gate-unknown-key", "work.examples.operatorAwar"]]],
];

const switchTests = [
  {
    name: "examples/193-03 00 E1 · with the key absent, the switch is off",
    run: () => withSwitch({ examples: { enabled: true } }, async (fx) => {
      assert.equal(operatorAwareFromConfig(await fx.config()), false);
      const validated = fx.cli("project", "validate", "--json");
      assert.deepEqual(examplesCodes(validated.json?.diagnostics), [], validated.stdout || validated.stderr);
      const doctor = fx.cli("work", "doctor", "--json");
      assert.ok(doctor.json, doctor.stdout || doctor.stderr);
      assert.deepEqual(undeclaredIn(doctor.json), []);
    }),
  },
  {
    name: "examples/193-03 00 E2 · one command turns it on and says what is still missing",
    run: () => withSwitch({ examples: { enabled: true } }, async (fx) => {
      const before = await fx.config();
      const turned = fx.cli("work", "init-config", "--operator-aware", "on");
      assert.equal(turned.status, 0, turned.stdout || turned.stderr);
      const after = await fx.config();
      assert.equal(after.work.examples.operatorAware, true);
      delete after.work.examples.operatorAware;
      assert.deepEqual(after, before, "every other key is unchanged");
      assert.ok(turned.stdout.includes(UNDECLARED) && /no operator profile is declared/.test(turned.stdout), turned.stdout);
      assert.ok(turned.stdout.includes("aof work init-config --operator-role"), turned.stdout);
      assert.ok(turned.stdout.includes("aof work update"), "it says to run the update to render it");
    }),
  },
  {
    name: "examples/193-03 00 E3 · it cannot be turned on without discovery",
    run: () => withSwitch({}, async (fx) => {
      const before = await fx.bytes();
      const refused = fx.cli("work", "init-config", "--operator-aware", "on", "--json");
      assert.notEqual(refused.status, 0);
      assert.equal(refused.json?.code, "examples-operator-aware-without-discovery", refused.stdout || refused.stderr);
      assert.ok(refused.json.error.includes("work.examples.enabled"), refused.json.error);
      assert.deepEqual(await fx.bytes(), before, "no file has changed");
    }),
  },
  {
    name: "examples/193-03 00 only the boolean true, beside discovery, turns it on (outline: 9 settings)",
    run: async () => {
      for (const [label, examples, resolved, diagnosed] of SWITCH_ROWS) {
        const config = configOf(examples);
        assert.equal(operatorAwareFromConfig(config), resolved, `${label}: the switch resolves`);
        await withProject(config, async (validate) => {
          const found = gateDiagnostics(await validate());
          assert.deepEqual(found.map((entry) => [entry.code, entry.path]), diagnosed, `${label}: diagnosed`);
          for (const entry of found) assert.equal(entry.severity, "error", `${label}: an error`);
        });
      }
      for (const config of [{}, undefined, null, { work: null }, { work: { examples: "on" } }]) assert.equal(operatorAwareFromConfig(config), false, JSON.stringify(config));
    },
  },
  {
    name: "examples/193-03 00 the switch is the project's alone",
    run: () => withSwitch({ examples: { enabled: true }, global: { work: { examples: { enabled: true, operatorAware: true } } } }, async (fx) => {
      assert.equal(operatorAwareFromConfig(await fx.loaded()), false);
    }),
  },
  {
    name: "examples/193-03 00 the switch has no machine-wide flag",
    run: () => withSwitch({ examples: { enabled: true } }, async (fx) => {
      const before = await fx.bytes();
      const refused = fx.cli("work", "init-config", "--global", "--operator-aware", "on", "--json");
      assert.notEqual(refused.status, 0);
      assert.match(refused.json?.error ?? "", /set per project/, refused.stdout || refused.stderr);
      assert.deepEqual(await fx.bytes(), before, "neither config file has changed");
    }),
  },
  {
    name: "examples/193-03 00 it can be turned off again, and the profile stays",
    run: () => withSwitch({ examples: { enabled: true, operatorAware: true }, operator: { role: "B" } }, async (fx) => {
      const turned = fx.cli("work", "init-config", "--operator-aware", "off");
      assert.equal(turned.status, 0, turned.stdout || turned.stderr);
      const after = await fx.config();
      assert.equal(after.work.examples.operatorAware, false);
      assert.deepEqual(after.work.operator, { role: "B" });
    }),
  },
  {
    name: "examples/193-03 00 turning it on with a profile already declared says nothing is missing",
    run: () => withSwitch({ examples: { enabled: true }, global: { work: { operator: { role: "A" } } } }, async (fx) => {
      const turned = fx.cli("work", "init-config", "--operator-aware", "on");
      assert.equal(turned.status, 0, turned.stdout || turned.stderr);
      assert.ok(!turned.stdout.includes(UNDECLARED), turned.stdout);
    }),
  },
  {
    name: "examples/193-03 00 the schema describes the key",
    run: async () => {
      const schema = JSON.parse(await readFile(path.join(repoRoot, "schemas", "aof.schema.json"), "utf8"));
      const key = schema.$defs.work.properties.examples.properties.operatorAware;
      assert.equal(key?.type, "boolean");
      assert.match(key.description, /off by default/i);
      assert.match(key.description, /enabled/);
      assert.match(key.description, /project's config only/i);
    },
  },
  {
    name: "examples/193-03 00 the switch gates no code path of the map",
    run: async () => {
      const map = mapOf(R(1, E(1, "[researched F1]")), QUESTIONS("- Q1 · domain · researched F1 · question 1?", "- Q2 · policy · open · question 2?"));
      const seen = [];
      for (const examples of [{ enabled: true }, { enabled: true, operatorAware: true }]) {
        await withCited({ examples, map, research: researchDoc(F(1)) }, async (fx) => {
          seen.push(citedOf(fx.cli("work", "doctor", "--json").json?.findings).map(({ code, severity, message }) => ({ code, severity, message })));
        });
      }
      assert.ok(seen[0].some((finding) => finding.code === "example-question-open"), "the open policy question is reported, so the comparison is not of two empty lists");
      assert.deepEqual(seen[1], seen[0]);
    },
  },
];

export const examplesConfigGateTests = [
  {
    name: "134/02 task 02: the gate resolves off unless it is the boolean true",
    run: async () => {
      for (const row of GATE_ROWS) {
        const config = configOf(row.examples);
        assert.equal(examplesEnabledFromConfig(config), row.resolved, `${row.configured}: the gate resolves`);
        await withProject(config, async (validate) => {
          const diagnosed = gateDiagnostics(await validate());
          assert.deepEqual(diagnosed.map((entry) => [entry.path, entry.code]), row.diagnosed, `${row.configured}: diagnosed`);
          for (const entry of diagnosed) assert.equal(entry.severity, "error", `${row.configured}: an error`);
        });
      }
    },
  },
  {
    name: "134/02 task 02: the gate is off for the empty config, and a missing config is not an error",
    run: () => {
      for (const config of [{}, undefined, { name: "no work object" }, null, { work: null }, { work: "x" }]) {
        assert.doesNotThrow(() => examplesEnabledFromConfig(config));
        assert.equal(examplesEnabledFromConfig(config), false, JSON.stringify(config));
      }
    },
  },
  {
    name: "134/02 task 02: the schema types the gate as the validator does",
    run: async () => {
      const schema = JSON.parse(await readFile(path.join(repoRoot, "schemas", "aof.schema.json"), "utf8"));
      const examples = schema.$defs.work.properties.examples;
      assert.ok(examples, "$defs.work.properties.examples exists");
      assert.equal(examples.type, "object");
      assert.deepEqual(Object.keys(examples.properties), ["enabled", "operatorAware"]);
      assert.equal(examples.properties.enabled.type, "boolean");
      assert.equal(examples.additionalProperties, false);
      assert.match(examples.description, /\bOPTIONAL\b/i, "the description says the key is optional");
      assert.match(examples.description, /absent means off/i, "the description says absent means off");
    },
  },
  {
    name: "134/02 task 02: setting the gate changes nothing else in the config's reading",
    run: async () => {
      const withGate = { work: { dir: "./wiki/work", plan: { enabled: true }, examples: { enabled: false } } };
      const withoutGate = { work: { dir: "./wiki/work", plan: { enabled: true } } };
      assert.equal(planEnabledFromConfig(withGate), true);
      assert.equal(examplesEnabledFromConfig(withGate), false);
      let withDiagnostics;
      let withoutDiagnostics;
      await withProject(withGate, async (validate) => { withDiagnostics = await validate(); });
      await withProject(withoutGate, async (validate) => { withoutDiagnostics = await validate(); });
      const comparable = (diagnostics) => diagnostics.map(({ severity, path: at, code }) => ({ severity, path: at, code }));
      assert.deepEqual(comparable(withDiagnostics), comparable(withoutDiagnostics));
    },
  },
  ...switchTests,
];
