import assert from "node:assert/strict";
import { resolveExecution, resolveExecutionResume, inspectExecution, validateExecutionEnvelope, validateExecutionCapabilities } from "../src/runtime-selection.mjs";
import { executionForPhase, executionRuntimes, parseRuntimeChoices } from "@aof/contracts/loop-bounds";
import { normalizeEffort, parseSessionChoices, resolveSessionLaunch } from "../src/session-model.mjs";
import { loopRuntimeFromConfig, resolveLoopRuntime, LOOP_BOUND_CONFIG_KEYS, LOOP_BOUND_VALUE_KEYS } from "@aof/contracts/loop-bounds";

const model = (id, levels = ["low", "medium", "high", "xhigh", "ultra"], isDefault = false) => ({ id, model: id, isDefault, defaultReasoningEffort: "low", supportedReasoningEfforts: levels.map(reasoningEffort => ({ reasoningEffort })) });
const capabilities = { codex: { models: [model("native-default", undefined, true), model("native-small", ["low", "medium", "high"])] } };
const codex = (options = {}) => resolveExecution({}, { runtime: "codex", capabilities, ...options });
const refusal = (code, path) => error => error.code === code && (!path || error.path === path) && typeof error.source === "string";

export const runtimeSelectionTests = [
  { name: "156 — one loop pins Astra refinement and Sonnet implementation and verification", run() {
    const catalog = { codex: { profile: "codex-app-server-v1", profileVersion: 1, models: [model("gpt-6-astra", ["high"], true)] } };
    const config = { work: { loop: { runtime: "claude", runtimes: { refine: "codex" } }, agents: { mode: "solo", runtimes: {
      codex: { session: { models: { refine: "gpt-6-astra" }, effort: { refine: "high" } } },
      claude: { session: { models: { continue: "sonnet", verify: "sonnet" }, effort: { continue: "high", verify: "high" } } },
    } } } };
    const plan = resolveExecution(config, { capabilities: catalog });
    assert.equal(plan.version, 2);
    assert.deepEqual(executionRuntimes(plan), ["codex", "claude"]);
    assert.deepEqual(Object.values(plan.phases).map(entry => [entry.runtime, entry.model, entry.effort]), [["codex", "gpt-6-astra", "high"], ["claude", "sonnet", "high"], ["claude", "sonnet", "high"]]);
    assert.equal(executionForPhase(plan, "review").runtime, "claude");
    assert.equal(executionForPhase(plan, "repair").phases.continue.model, "sonnet");
    assert.deepEqual(validateExecutionEnvelope(plan), plan);
    assert.deepEqual(validateExecutionCapabilities(plan, catalog), plan);
    config.work.loop.runtimes.refine = "claude";
    config.work.agents.runtimes.codex.session.models.refine = "changed-model";
    assert.deepEqual(resolveExecutionResume({ execution: plan }), plan, "resume must not re-resolve current config");
    assert.deepEqual(resolveExecutionResume({ execution: plan }, { runtime: ["refine=codex", "continue=claude"] }), plan);
    assert.throws(() => resolveExecutionResume({ execution: plan }, { runtime: "claude" }), refusal("execution-resume-conflict"));
    assert.throws(() => resolveExecutionResume({ execution: plan }, { choices: { refine: { model: "sonnet" } } }), refusal("execution-resume-conflict"));
    const corrupt = structuredClone(plan); corrupt.phases.refine.runtime = "claude";
    assert.throws(() => validateExecutionEnvelope(corrupt), refusal("invalid-record"));
    assert.throws(() => validateExecutionCapabilities(plan, { codex: { ...catalog.codex, models: [model("unavailable", ["high"], true)] } }), refusal("unsupported-model"));
  } },
  { name: "156 — phase runtime flags override defaults without validating Sonnet as a Codex model", run() {
    const config = { work: { loop: { runtime: "codex", runtimes: { verify: "codex" } } } };
    const result = resolveExecution(config, { runtime: ["claude", "refine=codex"], capabilities, choices: { refine: { model: "native-small", effort: "high" }, continue: { model: "sonnet", effort: "high" }, verify: { model: "sonnet", effort: "high" } } });
    assert.equal(result.phases.refine.model, "native-small");
    assert.equal(result.phases.verify.runtime, "claude");
    assert.equal(executionForPhase(result, "continue").version, 1);
    assert.equal(resolveExecution(config, { runtime: "claude" }).version, 1);
    for (const runtime of [["refine=codex", "refine=claude"], "build=codex", "refine=unknown", ["claude", "codex"]]) assert.throws(() => parseRuntimeChoices(runtime), refusal("unsupported-runtime"));
    assert.throws(() => resolveExecution({ work: { loop: { runtimes: { repair: "codex" } } } }), refusal("invalid-runtime-settings"));
    assert.throws(() => resolveExecution(config, { runtime: ["claude", "refine=codex"], choices: { repair: {} }, capabilities }), refusal("invalid-runtime-settings"));
  } },
  {
    name: "154/01 task00 — advertised native model ids canonicalize phase and role values without aliases",
    run() {
      const config = { work: { loop: { runtime: "codex" }, agents: { runtimes: { codex: { session: { models: { continue: "catalog-id" } }, models: { "aof-qa": "catalog-id" } } } } } };
      const result = resolveExecution(config, { capabilities: { codex: { models: [{ ...model("catalog-id", undefined, true), model: "native-model" }] } }, roles: ["aof-qa"] });
      assert.equal(result.phases.continue.model, "native-model"); assert.equal(result.roles["aof-qa"].model, "native-model");
    },
  },
  ...[
    [undefined, undefined, "claude", "default"], [undefined, "codex", "codex", "project"],
    ["claude", "codex", "claude", "flag"], ["codex", "claude", "codex", "flag"],
  ].map(([runtime, configured, expected, source]) => ({
    name: `154/01 task00 — runtime precedence ${runtime ?? "absent"} / ${configured ?? "absent"}`,
    run() {
      const result = resolveExecution({ runtimes: ["claude", "codex"], work: { loop: { ...(configured === undefined ? {} : { runtime: configured }) }, agents: { delegation: "on" } } }, { runtime, capabilities });
      assert.equal(result.runtime, expected); assert.equal(result.runtimeSource, source);
      assert.equal(Object.hasOwn(result, "sessionId"), false);
      assert.deepEqual(validateExecutionEnvelope(result), result);
    },
  })),
  {
    name: "154/01 task00 — unknown runtime is refused at its source; runtime belongs to both policy maps",
    run() {
      assert.throws(() => codex({ runtime: "opencode" }), refusal("unsupported-runtime", "--runtime"));
      assert.throws(() => resolveExecution({ work: { loop: { runtime: null } } }), refusal("unsupported-runtime", "work.loop.runtime"));
      assert.equal(resolveLoopRuntime(undefined), "claude"); assert.equal(resolveLoopRuntime("opencode"), null);
      assert.equal(loopRuntimeFromConfig({ config: { work: { loop: { runtime: "codex" } } } }), "codex");
      assert.equal(LOOP_BOUND_CONFIG_KEYS.at(-1), "work.loop.runtime"); assert.deepEqual(LOOP_BOUND_CONFIG_KEYS, LOOP_BOUND_VALUE_KEYS);
    },
  },
  ...[
    [{ continue: { model: "opus", modelFlag: "--model" } }, "unsupported-model", "--model"],
    [{ continue: { model: "native-small", effort: "ultra", effortFlag: "--thinking" } }, "unsupported-effort", "--thinking"],
  ].map(([choices, code, path]) => ({
    name: `154/01 task00 — incompatible Codex ${code} refuses before launch with source`,
    run() { assert.throws(() => codex({ choices }), refusal(code, path)); },
  })),
  ...[
    { session: { models: [] } }, { session: { effort: { repair: "high" } } }, { session: null },
  ].map((settings, index) => ({
    name: `154/01 task00 — malformed runtime-scoped phase map ${index} refuses`,
    run() { assert.throws(() => resolveExecution({ work: { agents: { runtimes: { codex: settings } } } }, { capabilities }), refusal("invalid-runtime-settings")); },
  })),
  {
    name: "154/01 task00 — phase and role values retain distinct provenance; scoped Claude overrides only matching legacy values",
    run() {
      const config = { work: { agents: { session: { models: { refine: "opus", continue: "sonnet" }, effort: { continue: "low" } }, models: { "aof-qa": "opus" }, runtimes: {
        claude: { session: { models: { continue: "opus" } }, models: { "aof-qa": "sonnet" } },
        codex: { session: { models: { continue: "native-small" }, effort: { verify: "xhigh" } }, models: { "aof-qa": "native-default" }, effort: { "aof-qa": "low" } },
      } } } };
      const claude = resolveExecution(config, { runtime: "claude", roles: ["aof-qa"] });
      assert.equal(claude.phases.refine.model, "opus"); assert.equal(claude.phases.continue.model, "opus");
      assert.equal(claude.phases.continue.effort, "low"); assert.equal(claude.roles["aof-qa"].model, "sonnet");
      const result = resolveExecution(config, { runtime: "codex", capabilities, roles: ["aof-qa"] });
      assert.equal(result.phases.refine.model, "native-default"); assert.equal(result.phases.continue.model, "native-small");
      assert.equal(result.phases.continue.effort, "high"); assert.equal(result.phases.verify.effort, "xhigh");
      assert.equal(result.roles["aof-qa"].effort, "low");
      assert.equal(result.phases.continue.modelSource, "work.agents.runtimes.codex.session.models.continue");
      assert.equal(result.roles["aof-qa"].modelSource, "work.agents.runtimes.codex.models.aof-qa");
    },
  },
  {
    name: "154/01 task00 — capabilities are mandatory for launch and explicitly unproven at inspection",
    run() {
      assert.throws(() => resolveExecution({}, { runtime: "codex" }), refusal("runtime-capabilities-unavailable"));
      const config = { work: { loop: { runtime: "codex" }, agents: { runtimes: { codex: { session: { effort: { refine: "ultra" } } } } } } };
      const result = inspectExecution(config);
      assert.equal(result.execution.unproven, true); assert.equal(result.execution.phases.refine.effort, "ultra");
      assert.equal(result.execution.diagnostics[0].code, "runtime-capabilities-unavailable");
      assert.throws(() => validateExecutionEnvelope(result.execution), refusal("invalid-record"));
    },
  },
  {
    name: "154/01 task00 — one effort grammar accepts native levels without widening Claude defaults",
    run() {
      assert.equal(normalizeEffort("ultra"), null);
      assert.equal(normalizeEffort("ultra", { levels: ["ultra"] }), "ultra");
      assert.equal(parseSessionChoices({ thinking: "ultra" }).refusal.code, "thinking-unknown-level");
      const { choices } = parseSessionChoices({ model: "continue=native-default:ultra" }, { effortLevels: ["ultra"] });
      assert.equal(codex({ choices }).phases.continue.effort, "ultra");
      assert.equal(resolveSessionLaunch({}, "continue").effort, "high");
    },
  },
  {
    name: "154/01 task00 — inherited reviewer effort is checked against each chosen phase model",
    run() {
      const config = { work: { loop: { runtime: "codex" }, agents: { runtimes: { codex: { session: { models: { continue: "native-small" } }, effort: { "aof-qa": "ultra" } } } } } };
      assert.throws(() => resolveExecution(config, { capabilities, roles: ["aof-qa"] }), refusal("unsupported-effort", "work.agents.runtimes.codex.effort.aof-qa"));
    },
  },
  {
    name: "154/01 task01 — resume retains every recorded choice and original native identity across config changes",
    run() {
      const record = { execution: codex(), sessionId: "native-original" };
      const bytes = JSON.stringify(record);
      const pinned = resolveExecutionResume(record);
      assert.deepEqual(pinned, record.execution); pinned.phases.continue.model = "changed";
      assert.equal(JSON.stringify(record), bytes); assert.equal(record.sessionId, "native-original");
      assert.equal(resolveExecution({ work: { loop: { runtime: "claude" } } }).runtime, "claude");
    },
  },
  ...[
    [{ runtime: "claude" }, "--runtime"],
    [{ choices: { continue: { model: "different", modelFlag: "--model" } } }, "--model"],
    [{ choices: { verify: { effort: "low", effortFlag: "--thinking" } } }, "--thinking"],
  ].map(([options, path]) => ({
    name: `154/01 task01 — conflicting resume ${path} refuses before mutation`,
    run() { const record = { execution: codex() }; const bytes = JSON.stringify(record); assert.throws(() => resolveExecutionResume(record, options), refusal("execution-resume-conflict", path)); assert.equal(JSON.stringify(record), bytes); },
  })),
  ...[null, {}, { ...codex(), phases: {} }].map((execution, index) => ({
    name: `154/01 task01 — malformed present envelope ${index} never enters legacy fallback`,
    run() { assert.throws(() => resolveExecutionResume({ execution }), refusal("invalid-record")); },
  })),
  {
    name: "154/01 task01 — unknown execution profile refuses; absent metadata preserves legacy resume",
    run() {
      assert.throws(() => resolveExecutionResume({ execution: { ...codex(), profile: "future-profile" } }), refusal("unsupported-profile"));
      assert.equal(resolveExecutionResume({ sessionId: "legacy-native" }), null);
      assert.throws(() => resolveExecutionResume({}, { runtime: "codex" }), refusal("execution-resume-conflict"));
    },
  },
];
