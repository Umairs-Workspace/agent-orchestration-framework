import { assets } from "./support/assets-services.mjs";
// Story 30 · task 03 — per-role model selection is inert under solo mode, and
// surfaced as such.
//
// Traceability for tasks/03_solo-mode-inert-model-map.feature. All 5 scenarios
// run OFFLINE against a fixture .aof/aof.config.json via the REAL validateConfig
// (the diagnostics `aof project validate` surfaces). The notice rides task 02's
// net-new work.agents validation: it is a NON-BLOCKING "info" diagnostic
// (validateConfig marks the config invalid ONLY on "severity: error"), so it
// surfaces AND leaves the config valid. It is conditional on BOTH mode=solo AND
// a per-role map being present.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const validateConfig = assets.configInspect.validateConfig;

async function diagnosticsForConfig(config) {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-solo-inert-"));
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

// The solo-mode inert notice, identified by its stable code.
const soloNotice = (diagnostics) => diagnostics.find((d) => d.code === "model-map-inert-under-solo");
const hasError = (diagnostics) => diagnostics.some((d) => d.severity === "error");

// A representative per-role map shared by the scenarios that carry one.
const MODELS = { "aof-architect": "sonnet" };

export const agentModelSoloInertTests = [
  // ====================================================================
  // Scenario: a per-role model map under solo mode is flagged as having no effect.
  // ====================================================================
  {
    name: "agent-model-solo-inert: a per-role map under solo mode is flagged as having no effect",
    run: async () => {
      const diagnostics = await diagnosticsForConfig({
        work: { agents: { mode: "solo", models: MODELS } }
      });
      const notice = soloNotice(diagnostics);
      assert.ok(notice, "a no-effect-under-solo notice is surfaced");
      assert.ok(
        /no effect under.*solo|solo.*no effect|ignored under solo/i.test(notice.message),
        "the notice states per-role model selection has no effect under solo mode"
      );
    }
  },

  // ====================================================================
  // Scenario: the solo-mode notice does not block — the config stays valid.
  // ====================================================================
  {
    name: "agent-model-solo-inert: the solo-mode notice is informational, not an error — the config stays valid",
    run: async () => {
      const diagnostics = await diagnosticsForConfig({
        work: { agents: { mode: "solo", models: MODELS } }
      });
      const notice = soloNotice(diagnostics);
      assert.ok(notice, "the notice is present");
      assert.notEqual(notice.severity, "error", "the notice is not an error");
      assert.ok(["info", "warning"].includes(notice.severity), "the notice is info/warning, i.e. non-blocking");
      assert.equal(hasError(diagnostics), false, "no error diagnostic — the config is still reported valid");
    }
  },

  // ====================================================================
  // Scenario: under orchestrated mode the same map raises no such notice.
  // ====================================================================
  {
    name: "agent-model-solo-inert: under orchestrated mode the same map raises no solo-mode notice",
    run: async () => {
      const diagnostics = await diagnosticsForConfig({
        work: { agents: { mode: "orchestrated", models: MODELS } }
      });
      assert.equal(soloNotice(diagnostics), undefined, "no no-effect-under-solo notice under orchestrated mode");
    }
  },

  // ====================================================================
  // 155/02 — a per-role map is reported inert wherever the EFFECTIVE mode is solo.
  // `155_story_one-agent-mode-setting/tasks/02_the-inert-map-notice-follows-the-default.feature`,
  // superseding story 30's "with a per-role map and no mode set, no solo-mode notice is surfaced".
  // ====================================================================
  {
    name: "155/02 E9 an unset mode with a per-role model map is reported inert",
    run: async () => {
      const diagnostics = await diagnosticsForConfig({
        work: { agents: { models: { "aof-qa": "opus" } } }
      });
      const notices = diagnostics.filter((d) => d.code === "model-map-inert-under-solo");
      assert.equal(notices.length, 1, "one inert notice");
      assert.equal(notices[0].severity, "info");
      assert.equal(notices[0].path, "work.agents.models");
      assert.equal(hasError(diagnostics), false, "the config is still valid");
      assert.match(notices[0].message, /no effect because the default mode is solo/u, "the message names the default");
    }
  },
  {
    name: "155/02 E10 an orchestrated mode raises no inert notice",
    run: async () => {
      const diagnostics = await diagnosticsForConfig({
        work: { agents: { mode: "orchestrated", models: { "aof-qa": "opus" } } }
      });
      assert.equal(soloNotice(diagnostics), undefined);
    }
  },
  ...[
    [{ effort: { "aof-qa": "high" } }, "effort-map-inert-under-solo", true],
    [{ mode: "solo", models: { "aof-qa": "opus" } }, "model-map-inert-under-solo", true],
    [{ mode: "orchestrated", effort: { "aof-qa": "high" } }, "effort-map-inert-under-solo", false],
    [{ models: {} }, "model-map-inert-under-solo", false],
  ].map(([agents, code, carried]) => ({
    name: `155/02 both maps follow the effective mode [${JSON.stringify(agents)} → ${carried ? "" : "no "}${code}]`,
    run: async () => {
      const diagnostics = await diagnosticsForConfig({ work: { agents } });
      const hits = diagnostics.filter((d) => d.code === code);
      assert.equal(hits.length, carried ? 1 : 0, JSON.stringify(diagnostics));
      if (carried) assert.equal(hits[0].severity, "info");
    }
  })),
  {
    name: "155/02 the inspector reads the effective mode from its one home",
    run: async () => {
      const { readFile } = await import("node:fs/promises");
      const source = await readFile(new URL("../src/application/bindings/config-inspect.mjs", import.meta.url), "utf8");
      const code = source.replace(/\/\*[^]*?\*\//gu, "").replace(/(^|[^:"'`\\])\/\/.*$/gmu, "$1");
      assert.match(code, /import \{ agentModeFromConfig \} from "@aof\/contracts\/agent-mode";/u);
      for (const notice of ["model-map-inert-under-solo", "effort-map-inert-under-solo"]) {
        const at = code.indexOf(`"${notice}"`);
        const guard = code.lastIndexOf("if (", at);
        assert.match(code.slice(guard, code.indexOf("{", guard)), /isEffectivelySolo\(agents\)/u, `${notice}: guarded by the effective mode`);
      }
      assert.match(code, /const effectiveAgentMode = \(agents\) => agentModeFromConfig\(/u, "the effective mode is the chain's answer");
      assert.doesNotMatch(code, /agents\.mode === "solo"|"solo" === agents\.mode/u, "no raw agents.mode is compared against solo");
    }
  },

  // ====================================================================
  // Scenario: solo mode with no per-role map raises no notice.
  // ====================================================================
  {
    name: "agent-model-solo-inert: solo mode with no per-role map raises no notice",
    run: async () => {
      const diagnostics = await diagnosticsForConfig({
        work: { agents: { mode: "solo" } }
      });
      assert.equal(soloNotice(diagnostics), undefined, "solo with no map is silent — the notice is about an inert map");
    }
  }
];
