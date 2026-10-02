// Traceability wiring for milestone 70 / story 01 — cache-stable-launch, task
// 01_model-and-effort-chosen.feature (ADR-005).
//
// This file tests the PURE resolver `resolveSessionLaunch` — the "resolving the session
// model per phase" and "configuration that cannot be honoured" outlines, plus the
// surface-independence scenario. The launch-argv half of these scenarios ("the argv
// carries <passed>", "states which model/effort it wants", "unconfigured launches as
// today") lives in the driver's own drives test file, the file the milestone-53 census
// already admits to name the driver seam.
import assert from "node:assert/strict";
import {
  DEFAULT_EFFORT,
  EFFORT_SPELLINGS,
  normalizeEffort,
  parseSessionChoices,
  resolveSessionLaunch,
  SESSION_CHOICE_CONFLICT,
  SESSION_CHOICE_EMPTY,
  SESSION_CHOICE_UNKNOWN_PHASE,
  SESSION_MODEL_CONFIG_PATH,
  THINKING_UNKNOWN_LEVEL,
} from "@aof/execution/session-model";

// Story 141 superseded 70/01's "absence is silence" for the EFFORT half only: an unrouted phase now
// launches at the default effort. The model half is unchanged, so an unrouted phase still resolves
// no model — these 70/01 cases keep their meaning with the default effort added to the answer.
const UNROUTED = Object.freeze({ effort: "high", effortSource: "default" });
// 143/02 appended `modelSource` last, present exactly when a model resolves: a configured route
// answers it as `config`. The 70/01 rows below keep their model and effort, with that key added.
const FROM_CONFIG = Object.freeze({ modelSource: "config" });

export const sessionModelTests = [
  // ═══════════ 01_model-and-effort-chosen.feature — the resolver ═══════════
  // Scenario: the spawn states which model it wants (resolver half)
  {
    name: "70/01 task01 a configured session model resolves from work.agents.session for the phase",
    run: async () => {
      const config = { work: { agents: { session: { models: { continue: "claude-opus-4-1" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { model: "claude-opus-4-1", ...UNROUTED, ...FROM_CONFIG });
    },
  },
  // Scenario: the spawn states which effort it wants (resolver half)
  {
    name: "70/01 task01 a configured session effort resolves from work.agents.session for the phase",
    run: async () => {
      const config = { work: { agents: { session: { effort: { continue: "high" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { effort: "high", effortSource: "config" });
    },
  },
  // Scenario: an unconfigured phase launches exactly as it does today (resolver half)
  {
    name: "70/01 task01 an unconfigured phase resolves nothing — no session config → {} (neither flag)",
    run: async () => {
      assert.deepEqual(resolveSessionLaunch({ work: { agents: {} } }, "continue"), UNROUTED);
      assert.deepEqual(resolveSessionLaunch({}, "continue"), UNROUTED);
      assert.deepEqual(resolveSessionLaunch(undefined, "continue"), UNROUTED);
    },
  },
  // Scenario Outline: resolving the session model per phase
  {
    name: "70/01 task01 outline a model for every phase — each routed phase resolves its own model, other phases nothing",
    run: async () => {
      const config = { work: { agents: { session: { models: { continue: "claude-opus-4-1", verify: "claude-sonnet-4-1" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { model: "claude-opus-4-1", ...UNROUTED, ...FROM_CONFIG });
      assert.deepEqual(resolveSessionLaunch(config, "verify"), { model: "claude-sonnet-4-1", ...UNROUTED, ...FROM_CONFIG });
    },
  },
  {
    name: "70/01 task01 outline a model for one phase only — a phase with no routing entry resolves nothing for the others",
    run: async () => {
      const config = { work: { agents: { session: { models: { verify: "claude-opus-4-1" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "verify"), { model: "claude-opus-4-1", ...UNROUTED, ...FROM_CONFIG });
      assert.deepEqual(resolveSessionLaunch(config, "continue"), UNROUTED, "an unrouted phase resolves nothing");
      assert.deepEqual(resolveSessionLaunch(config, "refine"), UNROUTED, "an unrouted phase resolves nothing");
    },
  },
  {
    name: "70/01 task01 outline no per-phase configuration at all — the continue phase resolves neither flag",
    run: async () => {
      assert.deepEqual(resolveSessionLaunch({ work: { agents: {} } }, "continue"), UNROUTED);
    },
  },
  {
    name: "70/01 task01 outline an effort but no model — the continue phase resolves the effort only",
    run: async () => {
      const config = { work: { agents: { session: { effort: { continue: "high" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { effort: "high", effortSource: "config" });
    },
  },
  // Scenario Outline: configuration that cannot be honoured
  {
    name: "70/01 task01 outline a known phase and a model — the model is resolved",
    run: async () => {
      const r = resolveSessionLaunch({ work: { agents: { session: { models: { continue: "claude-opus-4-1" } } } } }, "continue");
      assert.deepEqual(r, { model: "claude-opus-4-1", ...UNROUTED, ...FROM_CONFIG });
    },
  },
  {
    name: "70/01 task01 outline a phase name that is not one — that entry is not applied and the launch proceeds",
    run: async () => {
      const r = resolveSessionLaunch({ work: { agents: { session: { models: { notAPhase: "claude-opus-4-1" } } } } }, "continue");
      assert.deepEqual(r, UNROUTED, "an entry keyed by a phase that is not one is not applied");
    },
  },
  {
    name: "70/01 task01 outline an empty model string — no model is resolved",
    run: async () => {
      const r = resolveSessionLaunch({ work: { agents: { session: { models: { continue: "" } } } } }, "continue");
      assert.deepEqual(r, UNROUTED, "an empty model string resolves no model");
    },
  },
  {
    name: "70/01 task01 outline not an object at all — no routing is applied and the launch proceeds",
    run: async () => {
      const r = resolveSessionLaunch({ work: { agents: { session: "not-an-object" } } }, "continue");
      assert.deepEqual(r, UNROUTED, "a non-object session value resolves nothing");
    },
  },
  // Scenario: the two model surfaces do not read each other
  {
    name: "70/01 task01 the two model surfaces do not read each other — the session resolver reads work.agents.session, never work.agents.models, and a role map does not leak through",
    run: async () => {
      // The role map `work.agents.models` is present and populated; the session resolver
      // must ignore it entirely — a role-keyed map is not a session route.
      const config = { work: { agents: { models: { "aof-developer": "opus" }, session: { models: { continue: "claude-opus-4-1" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { model: "claude-opus-4-1", ...UNROUTED, ...FROM_CONFIG }, "the session model resolves from work.agents.session");
      // With NO session config at all, even a populated role map yields nothing.
      const configNoSession = { work: { agents: { models: { "aof-developer": "opus" } } } };
      assert.deepEqual(resolveSessionLaunch(configNoSession, "continue"), UNROUTED, "the session resolver does not read work.agents.models");
    },
  },
  {
    name: "70/01 task01 the session config path is the distinct declared constant",
    run: async () => {
      assert.equal(SESSION_MODEL_CONFIG_PATH, "work.agents.session", "the session config path is the declared distinct path");
    },
  },

  // ═══════════ 141 task 00 — one effort vocabulary, and a high session default ═══════════
  // Scenario Outline: a level is read through the one vocabulary
  ...[
    ["low", "low"],
    ["medium", "medium"],
    ["high", "high"],
    ["xhigh", "xhigh"],
    ["extra-high", "xhigh"],
    ["max", "max"],
    ["Extra-High", null],
    ["x-high", null],
    ["ultra", null],
    ["", null],
  ].map(([given, answer]) => ({
    name: `141/00 normalizeEffort(${JSON.stringify(given)}) answers ${answer == null ? "a refusal" : answer}`,
    run: async () => {
      assert.equal(normalizeEffort(given), answer);
    },
  })),
  {
    name: "141/00 the vocabulary names six accepted spellings and a high default",
    run: async () => {
      assert.deepEqual([...EFFORT_SPELLINGS], ["low", "medium", "high", "xhigh", "extra-high", "max"]);
      assert.equal(DEFAULT_EFFORT, "high");
      assert.equal(normalizeEffort(undefined), null, "a non-string is a refusal");
      assert.equal(normalizeEffort(3), null, "a number is a refusal");
    },
  },
  // Scenario Outline: the session effort resolves from the flag, then the phase's config, then high
  ...[
    [undefined, undefined, "high", "default"],
    ["medium", undefined, "medium", "config"],
    ["extra-high", undefined, "xhigh", "config"],
    ["turbo", undefined, "high", "default"],
    ["medium", "extra-high", "xhigh", "--thinking"],
    [undefined, "low", "low", "--thinking"],
  ].map(([configured, thinking, effort, source]) => ({
    name: `141/00 session effort — configured ${configured ?? "unset"}, --thinking ${thinking ?? "absent"} → ${effort} (${source})`,
    run: async () => {
      const config = configured === undefined
        ? { work: { agents: {} } }
        : { work: { agents: { session: { effort: { continue: configured } } } } };
      const resolved = resolveSessionLaunch(config, "continue", thinking === undefined ? {} : { thinking });
      assert.equal(resolved.effort, effort);
      assert.equal(resolved.effortSource, source);
      assert.equal(Object.hasOwn(resolved, "model"), false, "the model half keeps its absence-is-silence rule");
    },
  })),

  // ═══════════ 143/02 task 00 — a choice is read by one grammar ═══════════
  // Scenario Outline: a --model value is read into its parts
  ...[
    ["opus", "refine", { model: "opus", modelFlag: "--model" }],
    ["opus", "verify", { model: "opus", modelFlag: "--model" }],
    ["sonnet:medium", "continue", { model: "sonnet", modelFlag: "--model", effort: "medium", effortFlag: "--model" }],
    ["verify=fable", "verify", { model: "fable", modelFlag: "--model" }],
    ["verify=fable", "refine", undefined],
    ["verify=fable:high", "verify", { model: "fable", modelFlag: "--model", effort: "high", effortFlag: "--model" }],
    ["refine=:xhigh", "refine", { effort: "xhigh", effortFlag: "--model" }],
    ["refine=:extra-high", "refine", { effort: "xhigh", effortFlag: "--model" }],
    [":max", "continue", { effort: "max", effortFlag: "--model" }],
    ["anthropic.claude-opus-v1:0", "refine", { model: "anthropic.claude-opus-v1:0", modelFlag: "--model" }],
    ["verify=anthropic.claude-opus-v1:0:high", "verify", { model: "anthropic.claude-opus-v1:0", modelFlag: "--model", effort: "high", effortFlag: "--model" }],
    ["opus:turbo", "refine", { model: "opus:turbo", modelFlag: "--model" }],
  ].map(([value, phase, choice]) => ({
    name: `143/02 task00 --model ${JSON.stringify(value)} → ${phase} ${choice === undefined ? "nothing chosen" : JSON.stringify(choice)}`,
    run: async () => {
      const answer = parseSessionChoices({ model: [value] });
      assert.equal(answer.refusal, undefined);
      assert.deepEqual(answer.choices[phase], choice);
    },
  })),
  // Scenario Outline: a --thinking value is read into an effort
  ...[
    ["high", "refine", { effort: "high", effortFlag: "--thinking" }],
    ["verify=max", "verify", { effort: "max", effortFlag: "--thinking" }],
    ["verify=max", "continue", undefined],
    ["extra-high", "continue", { effort: "xhigh", effortFlag: "--thinking" }],
  ].map(([value, phase, choice]) => ({
    name: `143/02 task00 --thinking ${JSON.stringify(value)} → ${phase} ${choice === undefined ? "nothing chosen" : JSON.stringify(choice)}`,
    run: async () => {
      assert.deepEqual(parseSessionChoices({ thinking: [value] }).choices[phase], choice);
    },
  })),
  // Scenario Outline: a phased value beats an unphased one, across both flags
  ...[
    [{ model: ["sonnet:high", "verify=fable"] },
      { model: "fable", modelFlag: "--model", effort: "high", effortFlag: "--model" },
      { model: "sonnet", modelFlag: "--model", effort: "high", effortFlag: "--model" }],
    [{ model: ["sonnet:high"], thinking: ["verify=max"] },
      { model: "sonnet", modelFlag: "--model", effort: "max", effortFlag: "--thinking" },
      { model: "sonnet", modelFlag: "--model", effort: "high", effortFlag: "--model" }],
    [{ model: ["verify=fable"], thinking: ["low"] },
      { model: "fable", modelFlag: "--model", effort: "low", effortFlag: "--thinking" },
      { effort: "low", effortFlag: "--thinking" }],
  ].map(([given, verify, refine]) => ({
    name: `143/02 task00 specificity — ${JSON.stringify(given)}`,
    run: async () => {
      const { choices } = parseSessionChoices(given);
      assert.deepEqual(choices.verify, verify);
      assert.deepEqual(choices.refine, refine);
    },
  })),
  // Scenario Outline: a value it cannot read is refused with a code
  ...[
    [{ model: ["build=opus"] }, SESSION_CHOICE_UNKNOWN_PHASE, ["build", "refine", "continue", "verify"]],
    [{ thinking: ["Refine=high"] }, SESSION_CHOICE_UNKNOWN_PHASE, ["Refine", "refine", "continue", "verify"]],
    [{ model: ["refine=:turbo"] }, THINKING_UNKNOWN_LEVEL, ["turbo", ...EFFORT_SPELLINGS]],
    [{ thinking: ["verify=ultra"] }, THINKING_UNKNOWN_LEVEL, ["ultra", ...EFFORT_SPELLINGS]],
    [{ model: [""] }, SESSION_CHOICE_EMPTY, ['""']],
    [{ model: ["verify="] }, SESSION_CHOICE_EMPTY, ["verify="]],
    [{ model: ["verify=fable", "verify=opus"] }, SESSION_CHOICE_CONFLICT, ["verify=fable", "verify=opus", "for verify"]],
    [{ model: ["verify=fable:high"], thinking: ["verify=max"] }, SESSION_CHOICE_CONFLICT, ["verify=fable:high", "verify=max", "for verify"]],
    [{ model: [":high"], thinking: ["high"] }, SESSION_CHOICE_CONFLICT, ['":high"', '"high"']],
    [{ thinking: ["high", "max"] }, SESSION_CHOICE_CONFLICT, ['"high"', '"max"']],
  ].map(([given, code, named]) => ({
    name: `143/02 task00 refused ${code} — ${JSON.stringify(given)}`,
    run: async () => {
      const answer = parseSessionChoices(given);
      assert.equal(answer.choices, undefined);
      assert.equal(answer.refusal.code, code);
      for (const part of named) assert.ok(answer.refusal.message.includes(part), `${answer.refusal.message} names ${part}`);
    },
  })),
  {
    name: "143/02 task00 no flags is no choice",
    run: async () => {
      assert.deepEqual(parseSessionChoices({}), { choices: {} });
      assert.deepEqual(parseSessionChoices(), { choices: {} });
    },
  },

  // ═══════════ 143/02 task 01 — each part resolves from flag, config, then default ═══════════
  ...[
    [undefined, undefined, undefined, undefined, undefined, "high", "default"],
    ["opus", "medium", undefined, "opus", "config", "medium", "config"],
    ["opus", "medium", { model: "fable", modelFlag: "--model" }, "fable", "--model", "medium", "config"],
    ["opus", "medium", { effort: "xhigh", effortFlag: "--model" }, "opus", "config", "xhigh", "--model"],
    ["opus", undefined, { effort: "max", effortFlag: "--thinking" }, "opus", "config", "max", "--thinking"],
    [undefined, undefined, { model: "fable", modelFlag: "--model", effort: "high", effortFlag: "--model" }, "fable", "--model", "high", "--model"],
    ["  ", "turbo", undefined, undefined, undefined, "high", "default"],
  ].map(([cfgModel, cfgEffort, choice, model, modelSource, effort, effortSource]) => ({
    name: `143/02 task01 verify — config ${cfgModel ?? "unset"}/${cfgEffort ?? "unset"}, choice ${choice ? JSON.stringify(choice) : "absent"} → ${model ?? "none"} (${modelSource ?? "absent"}) at ${effort} (${effortSource})`,
    run: async () => {
      const session = {
        ...(cfgModel === undefined ? {} : { models: { verify: cfgModel } }),
        ...(cfgEffort === undefined ? {} : { effort: { verify: cfgEffort } }),
      };
      const resolved = resolveSessionLaunch({ work: { agents: { session } } }, "verify", choice === undefined ? {} : { choice });
      assert.equal(resolved.model, model);
      assert.equal(resolved.modelSource, modelSource);
      assert.equal(Object.hasOwn(resolved, "modelSource"), model !== undefined, "modelSource is present exactly when a model resolves");
      assert.equal(resolved.effort, effort);
      assert.equal(resolved.effortSource, effortSource);
    },
  })),
  {
    name: "143/02 task01 the 141 option still means an unphased --thinking",
    run: async () => {
      const config = { work: { agents: { session: { effort: { continue: "medium" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "continue", { thinking: "extra-high" }), { effort: "xhigh", effortSource: "--thinking" });
    },
  },
  {
    name: "143/02 task01 the role map does not leak into the session",
    run: async () => {
      const config = { work: { agents: { models: { "aof-developer": "haiku" } } } };
      const resolved = resolveSessionLaunch(config, "continue", { choice: { effort: "low", effortFlag: "--thinking" } });
      assert.equal(Object.hasOwn(resolved, "model"), false);
      assert.equal(Object.hasOwn(resolved, "modelSource"), false);
    },
  },
];
