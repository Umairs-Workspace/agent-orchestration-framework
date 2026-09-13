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
  resolveSessionLaunch,
  SESSION_MODEL_CONFIG_PATH,
} from "../../src/session-model.mjs";

export const sessionModelTests = [
  // ═══════════ 01_model-and-effort-chosen.feature — the resolver ═══════════
  // Scenario: the spawn states which model it wants (resolver half)
  {
    name: "70/01 task01 a configured session model resolves from work.agents.session for the phase",
    run: async () => {
      const config = { work: { agents: { session: { models: { continue: "claude-opus-4-1" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { model: "claude-opus-4-1" });
    },
  },
  // Scenario: the spawn states which effort it wants (resolver half)
  {
    name: "70/01 task01 a configured session effort resolves from work.agents.session for the phase",
    run: async () => {
      const config = { work: { agents: { session: { effort: { continue: "high" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { effort: "high" });
    },
  },
  // Scenario: an unconfigured phase launches exactly as it does today (resolver half)
  {
    name: "70/01 task01 an unconfigured phase resolves nothing — no session config → {} (neither flag)",
    run: async () => {
      assert.deepEqual(resolveSessionLaunch({ work: { agents: {} } }, "continue"), {});
      assert.deepEqual(resolveSessionLaunch({}, "continue"), {});
      assert.deepEqual(resolveSessionLaunch(undefined, "continue"), {});
    },
  },
  // Scenario Outline: resolving the session model per phase
  {
    name: "70/01 task01 outline a model for every phase — each routed phase resolves its own model, other phases nothing",
    run: async () => {
      const config = { work: { agents: { session: { models: { continue: "claude-opus-4-1", verify: "claude-sonnet-4-1" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { model: "claude-opus-4-1" });
      assert.deepEqual(resolveSessionLaunch(config, "verify"), { model: "claude-sonnet-4-1" });
    },
  },
  {
    name: "70/01 task01 outline a model for one phase only — a phase with no routing entry resolves nothing for the others",
    run: async () => {
      const config = { work: { agents: { session: { models: { verify: "claude-opus-4-1" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "verify"), { model: "claude-opus-4-1" });
      assert.deepEqual(resolveSessionLaunch(config, "continue"), {}, "an unrouted phase resolves nothing");
      assert.deepEqual(resolveSessionLaunch(config, "refine"), {}, "an unrouted phase resolves nothing");
    },
  },
  {
    name: "70/01 task01 outline no per-phase configuration at all — the continue phase resolves neither flag",
    run: async () => {
      assert.deepEqual(resolveSessionLaunch({ work: { agents: {} } }, "continue"), {});
    },
  },
  {
    name: "70/01 task01 outline an effort but no model — the continue phase resolves the effort only",
    run: async () => {
      const config = { work: { agents: { session: { effort: { continue: "high" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { effort: "high" });
    },
  },
  // Scenario Outline: configuration that cannot be honoured
  {
    name: "70/01 task01 outline a known phase and a model — the model is resolved",
    run: async () => {
      const r = resolveSessionLaunch({ work: { agents: { session: { models: { continue: "claude-opus-4-1" } } } } }, "continue");
      assert.deepEqual(r, { model: "claude-opus-4-1" });
    },
  },
  {
    name: "70/01 task01 outline a phase name that is not one — that entry is not applied and the launch proceeds",
    run: async () => {
      const r = resolveSessionLaunch({ work: { agents: { session: { models: { notAPhase: "claude-opus-4-1" } } } } }, "continue");
      assert.deepEqual(r, {}, "an entry keyed by a phase that is not one is not applied");
    },
  },
  {
    name: "70/01 task01 outline an empty model string — no model is resolved",
    run: async () => {
      const r = resolveSessionLaunch({ work: { agents: { session: { models: { continue: "" } } } } }, "continue");
      assert.deepEqual(r, {}, "an empty model string resolves no model");
    },
  },
  {
    name: "70/01 task01 outline not an object at all — no routing is applied and the launch proceeds",
    run: async () => {
      const r = resolveSessionLaunch({ work: { agents: { session: "not-an-object" } } }, "continue");
      assert.deepEqual(r, {}, "a non-object session value resolves nothing");
    },
  },
  // Scenario: the two model surfaces do not read each other
  {
    name: "70/01 task01 the two model surfaces do not read each other — the session resolver reads work.agents.session, never work.agents.models, and a role map does not leak through",
    run: async () => {
      // The role map `work.agents.models` is present and populated; the session resolver
      // must ignore it entirely — a role-keyed map is not a session route.
      const config = { work: { agents: { models: { "aof-developer": "opus" }, session: { models: { continue: "claude-opus-4-1" } } } } };
      assert.deepEqual(resolveSessionLaunch(config, "continue"), { model: "claude-opus-4-1" }, "the session model resolves from work.agents.session");
      // With NO session config at all, even a populated role map yields nothing.
      const configNoSession = { work: { agents: { models: { "aof-developer": "opus" } } } };
      assert.deepEqual(resolveSessionLaunch(configNoSession, "continue"), {}, "the session resolver does not read work.agents.models");
    },
  },
  {
    name: "70/01 task01 the session config path is the distinct declared constant",
    run: async () => {
      assert.equal(SESSION_MODEL_CONFIG_PATH, "work.agents.session", "the session config path is the declared distinct path");
    },
  },
];
