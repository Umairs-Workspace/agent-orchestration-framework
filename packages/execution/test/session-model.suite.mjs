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
  resolveSessionLaunch,
  SESSION_MODEL_CONFIG_PATH,
} from "@aof/execution/session-model";

// Story 141 superseded 70/01's "absence is silence" for the EFFORT half only: an unrouted phase now
// launches at the default effort. The model half is unchanged, so an unrouted phase still resolves
// no model — these 70/01 cases keep their meaning with the default effort added to the answer.
const UNROUTED = Object.freeze({ effort: "high", effortSource: "default" });

export const sessionModelTests = [
  // ═══════════ 01_model-and-effort-chosen.feature — the resolver ═══════════
  // Scenario: the spawn states which model it wants (resolver half)
  {
    name: "70/01 task01 a configured session model resolves from work.agents.session for the phase",
    run: async () => {
      const config = { work: { agents: { session: { models: { continue: "claude-opus-4-1" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { model: "claude-opus-4-1", ...UNROUTED });
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
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { model: "claude-opus-4-1", ...UNROUTED });
      assert.deepEqual(resolveSessionLaunch(config, "verify"), { model: "claude-sonnet-4-1", ...UNROUTED });
    },
  },
  {
    name: "70/01 task01 outline a model for one phase only — a phase with no routing entry resolves nothing for the others",
    run: async () => {
      const config = { work: { agents: { session: { models: { verify: "claude-opus-4-1" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "verify"), { model: "claude-opus-4-1", ...UNROUTED });
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
      assert.deepEqual(r, { model: "claude-opus-4-1", ...UNROUTED });
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
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { model: "claude-opus-4-1", ...UNROUTED }, "the session model resolves from work.agents.session");
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
];
