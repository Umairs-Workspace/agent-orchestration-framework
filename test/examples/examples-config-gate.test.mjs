// Traceability wiring for milestone 134 / story 02 — the `work.examples.enabled` gate.
//
// Covers EVERY @executable scenario in
//   tasks/02_the-examples-gate-is-off-unless-a-project-turns-it-on.feature
//
// The resolver is asked directly, and the validator is driven through the real `validateConfig`
// over a fixture project `P` in a fresh temp directory, its global home another fresh temp
// directory handed in through the options' `env` — so no run reads or writes the real `~/.aof`.
// One test object per @executable scenario, Scenario Outline rows folded into one entry.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { examplesEnabledFromConfig, planEnabledFromConfig, validateConfig } from "../../src/config-inspect.mjs";

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
      assert.deepEqual(Object.keys(examples.properties), ["enabled"]);
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
];
