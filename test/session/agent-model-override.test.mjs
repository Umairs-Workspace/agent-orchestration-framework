import { defaultApplication as _aofApplication } from "aof/default-application";
// Story 30 · task 02 — a project overrides the per-role model default via config.
//
// Traceability for tasks/02_per-project-config-override.feature. Two surfaces:
//   (a) override-wins-at-render — bound to the NEW config-aware render path
//       renderBundleOutputsWithConfig(bundle, projectConfig, opts) in
//       packages/core/src/work/bundle.mjs. Binding task 01's bundle-only renderBundleOutputs
//       here would false-green (it ignores config), so these rows call the
//       config-aware pass explicitly.
//   (b) validation — the override KEY matrix + the override VALUE matrix, bound
//       to the REAL validateConfig() over a fixture .aof/aof.config.json (the
//       diagnostics `aof project validate` surfaces). validateConfig marks the
//       config invalid ONLY on a "severity: error" diagnostic.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadBundle, renderBundleOutputs, renderBundleOutputsWithConfig } from "../../packages/core/src/work/bundle.mjs";
const validateConfig = _aofApplication.assets.configInspect.validateConfig;

// The shipped defaults, READ FROM THE BUNDLE rather than copied from it.
//
// This was a frozen literal map, and it went stale the day `aof-developer` was
// deliberately moved `sonnet` -> `opus`: the gate then failed reporting
// `'opus' !== 'sonnet'` about a product change that was correct, which is the shape
// that teaches a reader to skip the line. Milestone 57's gate did skip it, and
// attributed it to a branch commit without checking.
//
// The scenario's subject is that overriding ONE role does not perturb the others —
// which is true whatever the defaults happen to be. Reading them makes the check
// independent of the values, so a future model change moves nothing here.
function shippedDefaultModels() {
  const agentsDir = new URL("../../packages/core/assets/agents/", import.meta.url);
  const roles = readdirSync(agentsDir)
    .filter((name) => name.startsWith("aof-") && name.endsWith(".md"))
    .map((name) => name.slice(0, -3));
  const map = {};
  for (const role of roles) {
    const source = readFileSync(new URL(`${role}.md`, agentsDir), "utf8");
    const end = source.indexOf("\n---", 3);
    const model = /^model:[ \t]?(.*)$/m.exec(end === -1 ? source : source.slice(0, end))?.[1]?.trim();
    if (model) map[role] = model;
  }
  return map;
}

const DEFAULT_MODEL_BY_ROLE = shippedDefaultModels();

function renderedModelValue(content) {
  const end = content.indexOf("\n---", 3);
  const block = end === -1 ? content : content.slice(0, end);
  const match = /^model:[ \t]?(.*)$/m.exec(block);
  return match ? match[1] : null;
}

// Count the `model:` lines in a rendered agent file's frontmatter — the
// degenerate override==default row asserts exactly ONE clean line, not a
// duplicated/errored pair.
function modelLineCount(content) {
  const end = content.indexOf("\n---", 3);
  const block = end === -1 ? content : content.slice(0, end);
  return (block.match(/^model:/gm) ?? []).length;
}

// Render the bundle applying a project config's per-role override map, indexed
// by ".claude/agents/<role>.md".
function renderWithOverrides(models) {
  const projectConfig = { work: { agents: { models } } };
  const outputs = renderBundleOutputsWithConfig(loadBundle(), projectConfig, { runtimes: ["claude"] });
  const byPath = new Map();
  for (const output of outputs) {
    if (output.resource?.kind !== "agent") continue;
    byPath.set(String(output.path).replaceAll("\\", "/"), output);
  }
  return byPath;
}

function agentContent(byPath, role) {
  const output = byPath.get(`.claude/agents/${role}.md`);
  assert.ok(output, `rendered .claude/agents/${role}.md exists`);
  return output.content;
}

// Write a fixture project whose .aof/aof.config.json carries the given config
// object, run the REAL validateConfig, and return its diagnostics.
async function diagnosticsForConfig(config) {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-model-override-"));
  try {
    await mkdir(path.join(targetDir, ".aof"), { recursive: true });
    await writeFile(
      path.join(targetDir, ".aof", "aof.config.json"),
      `${JSON.stringify(config, null, 2)}\n`,
      "utf8"
    );
    return await validateConfig(targetDir);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

const hasError = (diagnostics) => diagnostics.some((d) => d.severity === "error");
const modelMapErrors = (diagnostics) =>
  diagnostics.filter((d) => d.severity === "error" && String(d.path ?? "").startsWith("work.agents.models"));

// The override-wins outline rows (feature Examples, verbatim).
const OVERRIDE_WIN_ROWS = [
  { role: "aof-architect", override: "sonnet" },        // decide-role down (default opus)
  { role: "aof-developer", override: "opus" },          // execute-role up (default sonnet)
  { role: "aof-qa", override: "claude-opus-4-8" },      // a fully-pinned id (default opus)
  { role: "aof-researcher", override: "inherit" },      // "inherit" rendered verbatim
  { role: "aof-architect", override: "opus" }           // degenerate override==default (clean no-op)
];

// Key matrix (feature Examples). accepted = a real ACD role; rejected = outside
// the set, wrong casing, missing prefix, or padded.
const KEY_ROWS = [
  { key: "aof-architect", accepted: true },
  { key: "aof-researcher", accepted: true },
  { key: "aof-product-owner", accepted: true },
  { key: "aof-orchestrator", accepted: false },
  { key: "developer", accepted: false },
  { key: "aof-designerr", accepted: false },
  { key: "aof-QA", accepted: false },
  { key: "AOF-architect", accepted: false },
  { key: " aof-qa", accepted: false }, // leading whitespace — untrimmed match
  { key: "aof-qa ", accepted: false }  // trailing whitespace — untrimmed match
];

// Value matrix (feature Examples). Non-literal cells carry a TYPE, bound to the
// concrete JSON value here.
const VALUE_ROWS = [
  { label: "opus", value: "opus", accepted: true },
  { label: "sonnet", value: "sonnet", accepted: true },
  { label: "claude-opus-4-8", value: "claude-opus-4-8", accepted: true },
  { label: "haiku (an alias aof does not use)", value: "haiku", accepted: true },
  { label: "empty string", value: "", accepted: false },
  { label: "whitespace only", value: "   ", accepted: false },
  { label: "a number, not a string", value: 42, accepted: false },
  { label: "null", value: null, accepted: false }
];

export const agentModelOverrideTests = [
  // ====================================================================
  // Scenario Outline: a configured per-role override wins over the bundle default.
  // Bound to the config-aware render path (renderBundleOutputsWithConfig).
  // ====================================================================
  {
    name: "agent-model-override: a configured per-role override wins over the bundle default (down, up, pinned id, inherit, degenerate)",
    run: async () => {
      for (const { role, override } of OVERRIDE_WIN_ROWS) {
        const byPath = renderWithOverrides({ [role]: override });
        const content = agentContent(byPath, role);
        assert.equal(
          renderedModelValue(content),
          override,
          `override "${override}" for ${role} wins in the rendered file`
        );
        // The value is rendered VERBATIM (inherit is not reinterpreted; a pinned
        // id is not expanded) — renderedModelValue already asserts the exact string.

        // Degenerate override==default (and every row) renders exactly one clean
        // `model:` line — no duplicate/errored pair.
        assert.equal(modelLineCount(content), 1, `${role} renders exactly one model line for override "${override}"`);
      }
    }
  },

  // ====================================================================
  // Scenario: an un-overridden role keeps its shipped default.
  // ====================================================================
  {
    name: "agent-model-override: overriding one role leaves every other role on its shipped default",
    run: async () => {
      // Override only aof-architect (opus -> sonnet, a value that differs so a
      // leak would show).
      const byPath = renderWithOverrides({ "aof-architect": "sonnet" });
      assert.equal(renderedModelValue(agentContent(byPath, "aof-architect")), "sonnet", "the overridden role took the override");
      for (const [role, defaultModel] of Object.entries(DEFAULT_MODEL_BY_ROLE)) {
        if (role === "aof-architect") continue;
        assert.equal(
          renderedModelValue(agentContent(byPath, role)),
          defaultModel,
          `un-overridden ${role} keeps its shipped default "${defaultModel}"`
        );
      }
    }
  },

  // ====================================================================
  // Scenario Outline: the override key must be one of the 8 ACD roles.
  // Bound to validateConfig over a fixture; a valid model value is used so only
  // the KEY drives the verdict.
  // ====================================================================
  {
    name: "agent-model-override: the override key must be one of the 8 ACD roles (accepted rows vs rejected typo/casing/prefix/padding)",
    run: async () => {
      for (const { key, accepted } of KEY_ROWS) {
        const diagnostics = await diagnosticsForConfig({
          work: { agents: { models: { [key]: "opus" } } }
        });
        const keyErrors = modelMapErrors(diagnostics).filter(
          (d) => d.code === "model-map-unknown-role"
        );
        if (accepted) {
          assert.equal(keyErrors.length, 0, `key "${key}" reports no error for the override`);
        } else {
          assert.ok(keyErrors.length >= 1, `key "${key}" reports an error that the key is not an ACD role`);
          assert.ok(
            keyErrors.some((d) => /not an ACD role/i.test(d.message)),
            `key "${key}" error message says it is not an ACD role`
          );
        }
      }
    }
  },

  // ====================================================================
  // Scenario Outline: the override value must be a well-formed model string.
  // A valid key (aof-architect) is used so only the VALUE drives the verdict.
  // The "haiku" row is load-bearing: an unused alias must still be accepted.
  // ====================================================================
  {
    name: "agent-model-override: the override value must be a well-formed model string (alias/pinned/haiku accepted; empty/whitespace/number/null rejected)",
    run: async () => {
      for (const { label, value, accepted } of VALUE_ROWS) {
        const diagnostics = await diagnosticsForConfig({
          work: { agents: { models: { "aof-architect": value } } }
        });
        const valueErrors = modelMapErrors(diagnostics).filter(
          (d) => d.code === "model-map-bad-value"
        );
        if (accepted) {
          assert.equal(valueErrors.length, 0, `value ${label} reports no error`);
          // And no error at all from the model-map for an accepted value+key.
          assert.equal(modelMapErrors(diagnostics).length, 0, `value ${label} keeps the model map error-free`);
        } else {
          assert.ok(valueErrors.length >= 1, `value ${label} reports an error`);
        }
      }
    }
  },

  // A valid override (key ∈ roles, non-empty value) surfaces NO error at all —
  // the config stays valid under `aof project validate`.
  {
    name: "agent-model-override: a well-formed override map keeps the config valid (no error diagnostics)",
    run: async () => {
      const diagnostics = await diagnosticsForConfig({
        work: { agents: { models: { "aof-architect": "sonnet", "aof-developer": "opus" } } }
      });
      assert.equal(hasError(diagnostics), false, "a well-formed override map yields no error diagnostic");
    }
  },

  // ════════ story 141 task 02 — a role can pin its own effort; an unpinned role thinks at its session's ════════
  {
    name: "141/02 a pinned role renders its effort directly after model:, and an unpinned role renders none",
    run: async () => {
      const outputs = renderBundleOutputsWithConfig(loadBundle(), { work: { agents: { effort: { "aof-architect": "extra-high", "aof-qa": "medium" } } } }, { runtimes: ["claude"] });
      const byPath = new Map(outputs.filter((o) => o.resource?.kind === "agent").map((o) => [String(o.path).replaceAll("\\", "/"), o]));
      for (const [role, level] of [["aof-architect", "xhigh"], ["aof-qa", "medium"], ["aof-developer", null]]) {
        const lines = frontmatterLines(agentContent(byPath, role));
        const at = lines.findIndex((line) => line.startsWith("effort:"));
        if (level == null) {
          assert.equal(at, -1, `${role} carries no effort: line`);
          continue;
        }
        assert.equal(lines[at], `effort: ${level}`, `${role} carries effort: ${level}`);
        assert.ok(lines[at - 1].startsWith("model:"), `${role}: the effort line sits directly after model:`);
        assert.equal(lines.filter((line) => line.startsWith("effort:")).length, 1);
      }
    }
  },
  {
    name: "141/02 with no effort map, every rendered agent is byte-identical to the bundle render and carries no effort: line",
    run: async () => {
      const bundle = loadBundle();
      const plain = renderBundleOutputs(bundle, { runtimes: ["claude"] }).filter((o) => o.resource?.kind === "agent");
      const configured = renderBundleOutputsWithConfig(bundle, { work: { agents: {} } }, { runtimes: ["claude"] }).filter((o) => o.resource?.kind === "agent");
      assert.equal(configured.length, 8);
      assert.deepEqual(configured.map((o) => o.content), plain.map((o) => o.content), "an unset map changes no agent file");
      for (const output of configured) assert.equal(frontmatterLines(output.content).some((line) => line.startsWith("effort:")), false, output.path);
    }
  },
  {
    name: "154/03 native Codex agent effort is retained and OpenCode remains unchanged (supersedes 141/02)",
    run: async () => {
      const bundle = loadBundle();
      const config = { work: { agents: { effort: { "aof-architect": "extra-high" } } } };
      for (const runtime of ["codex", "opencode"]) {
        const pinned = renderBundleOutputsWithConfig(bundle, config, { runtimes: [runtime] }).filter((o) => o.resource?.kind === "agent" && o.resource.id === "aof-architect");
        const plain = renderBundleOutputsWithConfig(bundle, {}, { runtimes: [runtime] }).filter((o) => o.resource?.kind === "agent" && o.resource.id === "aof-architect");
        assert.equal(pinned.length, 1, runtime);
        assert.doesNotMatch(pinned[0].content, /^effort:/mu, `${runtime}: no effort line`);
        if (runtime === "codex") {
          assert.match(pinned[0].content, /^model_reasoning_effort = "xhigh"$/m);
          assert.doesNotMatch(plain[0].content, /^model_reasoning_effort =/m);
        } else assert.equal(pinned[0].content, plain[0].content, `${runtime}: the render is unchanged`);
      }
    }
  },
  // Scenario Outline: project validate checks the role map as it checks the model map
  ...[
    [{ "aof-qa": "extra-high" }, undefined, []],
    [{ "aof-tester": "high" }, undefined, [["error", "effort-map-unknown-role", "work.agents.effort.aof-tester"]]],
    [{ "aof-qa": "turbo" }, undefined, [["error", "effort-map-bad-value", "work.agents.effort.aof-qa"]]],
    [{ "aof-qa": "" }, undefined, [["error", "effort-map-bad-value", "work.agents.effort.aof-qa"]]],
    [[], undefined, [["error", null, "work.agents.effort"]]],
    [{ "aof-qa": "high" }, "solo", [["info", "effort-map-inert-under-solo", "work.agents.effort"]]],
  ].map(([map, mode, expected]) => ({
    name: `141/02 validate — work.agents.effort ${JSON.stringify(map)}${mode ? ` under ${mode}` : ""} reports ${expected.length === 0 ? "nothing" : expected.map((e) => e[1] ?? e[0]).join(", ")}`,
    run: async () => {
      const diagnostics = await diagnosticsForConfig({ work: { agents: { effort: map, ...(mode ? { mode } : {}) } } });
      const effortDiagnostics = diagnostics.filter((d) => String(d.path ?? "").startsWith("work.agents.effort"));
      assert.equal(effortDiagnostics.length, expected.length, JSON.stringify(effortDiagnostics));
      for (const [severity, code, at] of expected) {
        const hit = effortDiagnostics.find((d) => d.path === at && d.severity === severity);
        assert.ok(hit, `${severity} at ${at}`);
        if (code != null) assert.equal(hit.code, code);
      }
    }
  })),
  // 141/00 Scenario Outline: a configured session effort is checked by project validate
  ...[
    ["continue", "extra-high", false],
    ["refine", "turbo", true],
    ["verify", "", true],
    ["continue", 3, true],
  ].map(([phase, value, errors]) => ({
    name: `141/00 validate — work.agents.session.effort.${phase} = ${JSON.stringify(value)} reports ${errors ? "effort-bad-value" : "nothing"}`,
    run: async () => {
      const diagnostics = await diagnosticsForConfig({ work: { agents: { session: { effort: { [phase]: value } } } } });
      const at = diagnostics.filter((d) => d.path === `work.agents.session.effort.${phase}`);
      if (!errors) {
        assert.deepEqual(at, []);
        return;
      }
      assert.equal(at.length, 1);
      assert.equal(at[0].severity, "error");
      assert.equal(at[0].code, "effort-bad-value");
    }
  })),
  {
    name: "141/00 and 02 the schema describes work.agents.session (models and effort by phase) and the role effort map",
    run: async () => {
      const schema = JSON.parse(readFileSync(new URL("../../schemas/aof.schema.json", import.meta.url), "utf8"));
      const agents = schema.$defs.work.properties.agents.properties;
      assert.deepEqual(Object.keys(agents.session.properties), ["models", "effort"]);
      const spellings = ["low", "medium", "high", "xhigh", "extra-high", "max"];
      assert.deepEqual(agents.session.properties.effort.additionalProperties.enum, spellings);
      for (const spelling of spellings) assert.ok(agents.session.properties.effort.description.includes(spelling), spelling);
      assert.match(agents.session.properties.effort.description, /launches at high, the default/u);
      assert.equal(agents.effort.type, "object");
      assert.equal(agents.effort.additionalProperties.type, "string");
      assert.match(agents.effort.description, /inherits its session's effort/u);
      assert.match(agents.effort.description, /[Ii]nert[^.]*under mode "solo"/u);
    }
  }
];

function frontmatterLines(content) {
  const end = content.indexOf("\n---", 3);
  return (end === -1 ? content : content.slice(0, end)).split(/\r?\n/u);
}
