import { defaultApplication as _aofApplication } from "aof/default-application";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
const doctorConfig = _aofApplication.assets.configInspect.doctorConfig;
const inspectConfig = _aofApplication.assets.configInspect.inspectConfig;
const inspectGlobalConfig = _aofApplication.assets.configInspect.inspectGlobalConfig;
const resolveWorkDiagrams = _aofApplication.assets.configInspect.resolveWorkDiagrams;
const validateConfig = _aofApplication.assets.configInspect.validateConfig;
const validateGlobalConfig = _aofApplication.assets.configInspect.validateGlobalConfig;
import { generatorIds } from "@aof/diagrams/generators";
import { realpathSync } from "node:fs";
import { utimes } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import { operatorLevel, operatorProfileFromConfig } from "@aof/contracts/operator-profile";

export const configInspectTests = [
  {
    name: "154/09 task01 E2 + outline — effective configuration reports the legacy Claude dependency, explicit extractor and local without changing configuration or corpus",
    run: async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-memory-inspect-"));
      try {
        await mkdir(path.join(dir, ".aof"));
        const file = path.join(dir, ".aof", "aof.config.json");
        const corpus = path.join(dir, ".aof", "aof.memory.graphify.index.json");
        const bytes = '{"records":[{"id":"R1","source":"RETROSPECTIVE.md:1"}]}\n';
        await writeFile(corpus, bytes);
        for (const [memory, extractionBackend, source, dependency] of [
          [{ backend: "graphify" }, "claude-cli", "legacy default", "Claude CLI (claude)"],
          // 180/ADR-004 — spelled at its new home; the legacy `memory.graphify` reads with a warning (180/01 task 00).
          [{ backend: "graphify", backends: { graphify: { extractionBackend: "ollama" } } }, "ollama", "project setting", "Ollama"],
          [{ backend: "local" }, null, "project setting", null],
        ]) {
          const configBytes = JSON.stringify({ name: "demo", resources: [], memory, work: { loop: { runtime: "codex" } } }, null, 2) + "\n";
          await writeFile(file, configBytes);
          const report = await inspectConfig(dir);
          assert.deepEqual(report.diagnostics, []);
          assert.equal(report.memory.backend, memory.backend);
          assert.equal(report.memory.extraction?.backend ?? null, extractionBackend);
          assert.equal(report.memory.extraction?.source ?? report.memory.source, source);
          assert.ok(dependency ? report.memory.dependencies.includes(dependency) : report.memory.dependencies.length === 0);
          if (extractionBackend === "claude-cli") assert.match(report.memory.extraction.alternative, /"local"/);
          assert.equal(await readFile(file, "utf8"), configBytes);
          assert.equal(await readFile(corpus, "utf8"), bytes);
        }
      } finally { await rm(dir, { recursive: true, force: true }); }
    },
  },
  {
    name: "154/09 task00 — unsupported extractor is a named project diagnostic; schema agrees with the existing graph backend catalog",
    run: async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-memory-invalid-"));
      try {
        await mkdir(path.join(dir, ".aof"));
        const config = { name: "demo", resources: [], memory: { backend: "graphify", graphify: { extractionBackend: "codex" } } };
        await writeFile(path.join(dir, ".aof", "aof.config.json"), JSON.stringify(config));
        const diagnostics = await validateConfig(dir);
        assert.deepEqual(diagnostics.map(entry => [entry.path, entry.code]), [["memory.graphify.extractionBackend", "invalid-memory-extraction-backend"]]);
        assert.match(diagnostics[0].message, /codex/);
        assert.equal((await inspectConfig(dir)).memory, null);
        const { GRAPHIFY_BACKENDS } = await import("../../packages/knowledge/src/graphify-backends.mjs");
        const schema = JSON.parse(await readFile(new URL("../../schemas/aof.schema.json", import.meta.url), "utf8"));
        // 180/ADR-004 — the extractor's home is `backends.graphify`; the deprecated `graphify` block keeps the same enum for one release.
        for (const block of [schema.$defs.memory.properties.backends.properties.graphify, schema.$defs.memory.properties.graphify]) {
          assert.deepEqual(block.properties.extractionBackend.enum, GRAPHIFY_BACKENDS.map(entry => entry.backend));
        }
        const Ajv2020 = (await import("ajv/dist/2020.js")).default;
        const validate = new Ajv2020({ strict: false }).compile(schema);
        assert.equal(validate(config), false);
        for (const { backend } of GRAPHIFY_BACKENDS) { config.memory.graphify.extractionBackend = backend; assert.equal(validate(config), true); }
        for (const value of [null, 1, "", [], {}]) { config.memory.graphify.extractionBackend = value; assert.equal(validate(config), false); }
        delete config.memory.graphify.extractionBackend; assert.equal(validate(config), true);
      } finally { await rm(dir, { recursive: true, force: true }); }
    },
  },
  {
    name: "154/01 task00 — installed asset targets and delegation do not select execution; next runtime is explicit",
    run: async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-execution-inspect-"));
      try {
        await mkdir(path.join(dir, ".aof"));
        const file = path.join(dir, ".aof", "aof.config.json");
        const config = { name: "demo", resources: [], work: { agents: { delegation: "on", delegationModel: "delegated-model" } } };
        await writeFile(path.join(dir, ".aof", "aof.lock.json"), JSON.stringify({ version: 2, runtimes: ["claude"], work: { runtimes: ["codex"] } }));
        await writeFile(file, JSON.stringify(config));
        let report = await inspectConfig(dir);
        assert.equal(report.execution.runtime, "claude"); assert.equal(report.execution.runtimeSource, "default");
        assert.deepEqual(report.assetRuntimes, ["claude", "codex"]);
        assert.deepEqual(report.delegation, { enabled: "on", model: "delegated-model" });
        config.work.loop = { runtime: "codex" }; config.work.agents.runtimes = { codex: { session: { models: { continue: "opus" } } } };
        await writeFile(file, JSON.stringify(config));
        report = await inspectConfig(dir, { capabilities: { codex: { models: [{ id: "native", model: "native", isDefault: true, supportedReasoningEfforts: [{ reasoningEffort: "high" }] }] } } });
        assert.ok(report.diagnostics.some(value => value.code === "unsupported-model" && value.path === "work.agents.runtimes.codex.session.models.continue"));
        assert.equal(report.execution, null);
        config.work.agents.runtimes.codex.session.models = [];
        await writeFile(file, JSON.stringify(config));
        report = await inspectConfig(dir);
        assert.ok(report.diagnostics.some(value => value.code === "invalid-runtime-settings" && value.path === "work.agents.runtimes.codex.session.models"));
      } finally { await rm(dir, { recursive: true, force: true }); }
    },
  },
  {
    name: "inspects valid config with resources and packages",
    run: inspectsValidConfig
  },
  {
    name: "validates multiple semantic config errors",
    run: validatesSemanticErrors
  },
  {
    name: "validates runtime capability contract for commands",
    run: validatesRuntimeCapabilityContractForCommands
  },
  {
    name: "validates simple asset argument markers",
    run: validatesSimpleAssetArgumentMarkers
  },
  {
    name: "validates workflow declarations",
    run: validatesWorkflowDeclarations
  },
  {
    name: "validates workflow backed resources",
    run: validatesWorkflowBackedResources
  },
  {
    name: "validates asset reference placeholders",
    run: validatesAssetReferencePlaceholders
  },
  {
    name: "doctor reports stale legacy config and package intent",
    run: doctorReportsHealth
  },
  {
    name: "reports malformed config JSON as structured diagnostic",
    run: reportsMalformedConfigJson
  },
  {
    name: "reports malformed runtime override JSON as structured diagnostic",
    run: reportsMalformedOverrideJson
  },
  {
    name: "tolerates extension fields while validating core fields",
    run: toleratesExtensionFields
  },
  {
    name: "inspection and doctor expose adapter warnings",
    run: exposesAdapterWarnings
  },
  {
    name: "validates global config from AOF_GLOBAL_HOME",
    run: validatesGlobalConfig
  },
  {
    name: "project validation does not scan unrelated malformed global drafts",
    run: projectValidationIgnoresUnreferencedGlobalDrafts
  },
  {
    name: "validates referenced global resources",
    run: validatesReferencedGlobalResources
  },
  {
    name: "validates referenced global workflows",
    run: validatesReferencedGlobalWorkflows
  },
  {
    name: "reports missing and conflicting global references",
    run: reportsMissingAndConflictingGlobalReferences
  },
  {
    name: "validates associated files on referenced global skills",
    run: validatesAssociatedFilesOnReferencedGlobalSkills
  },
  {
    name: "validates associated file runtime references",
    run: validatesAssociatedFileRuntimeReferences
  },
  {
    name: "reports unsafe associated file declarations",
    run: reportsUnsafeAssociatedFileDeclarations
  },
  // milestone 133 / story 01 / task 00 — `work.diagrams` names the generator, absent means off,
  // and one reader answers for every consumer (ADR-001).
  {
    name: "133/01 task 00: the one reader resolves every legal work.diagrams shape, frozen",
    run: resolvesEveryLegalDiagramsShape
  },
  {
    name: "133/01 task 00: an absent work.diagrams raises no diagnostic",
    run: absentDiagramsRaisesNothing
  },
  {
    name: "133/01 task 00: a bad work.diagrams shape is one coded error, and still resolves to off",
    run: badDiagramsShapeIsCodedAndOff
  },
  {
    name: "133/01 task 00: an unknown generator is refused by naming what is registered, never by falling back",
    run: unknownGeneratorListsRegistered
  },
  {
    name: "133/01 task 00: a style path that does not exist is not a config error",
    run: missingStyleFileIsNotAConfigError
  },
  {
    name: "133/01 task 00: the schema describes the same work.diagrams object",
    run: schemaDescribesDiagrams
  },
  // 180/01 task 02 — the schema's memory node (see `memoryNodeSchemaTests`).
  ...memoryNodeSchemaTests(),
  // 180/01 task 03 — the faces print the memory node's new paths (see `memoryNodeFaceTests`).
  ...memoryNodeFaceTests(),
  // 199 — the per-person local config (see `localConfigTests`).
  ...localConfigTests(),
];

const DIAGRAMS_ID = generatorIds()[0];
const DIAGRAMS_DEFAULT = { enabled: false, generator: "off", formats: ["svg", "png"], style: null, browser: null };

async function withDiagramsProject(diagrams, fn) {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-diagrams-"));
  const previous = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = await mkdtemp(path.join(os.tmpdir(), "aof-diagrams-home-"));
  try {
    const config = { name: "demo", resources: [], work: { dir: "./wiki/work", ...(diagrams === undefined ? {} : { diagrams }) } };
    await mkdir(path.join(targetDir, ".aof"), { recursive: true });
    await writeFile(path.join(targetDir, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
    return await fn(targetDir, config);
  } finally {
    await rm(process.env.AOF_GLOBAL_HOME, { recursive: true, force: true });
    restoreEnv("AOF_GLOBAL_HOME", previous);
    await rm(targetDir, { recursive: true, force: true });
  }
}

const diagramsDiagnostics = (diagnostics) => diagnostics.filter((item) => item.path.startsWith("work.diagrams"));

const LEGAL_DIAGRAMS_ROWS = () => [
  [undefined, DIAGRAMS_DEFAULT],
  [{ generator: "off" }, DIAGRAMS_DEFAULT],
  [{ generator: DIAGRAMS_ID }, { enabled: true, generator: DIAGRAMS_ID, formats: ["svg", "png"], style: null, browser: null }],
  [{ generator: DIAGRAMS_ID, formats: ["svg"] }, { enabled: true, generator: DIAGRAMS_ID, formats: ["svg"], style: null, browser: null }],
  [{ generator: DIAGRAMS_ID, formats: ["png", "svg"] }, { enabled: true, generator: DIAGRAMS_ID, formats: ["svg", "png"], style: null, browser: null }],
  [{ generator: DIAGRAMS_ID, style: ".aof/diagrams/style.md" }, { enabled: true, generator: DIAGRAMS_ID, formats: ["svg", "png"], style: ".aof/diagrams/style.md", browser: null }],
  [{ generator: DIAGRAMS_ID, browser: "C:/Tools/chrome.exe" }, { enabled: true, generator: DIAGRAMS_ID, formats: ["svg", "png"], style: null, browser: "C:/Tools/chrome.exe" }],
];

async function resolvesEveryLegalDiagramsShape() {
  for (const [diagrams, resolved] of LEGAL_DIAGRAMS_ROWS()) {
    await withDiagramsProject(diagrams, async (targetDir, config) => {
      const answer = resolveWorkDiagrams(config);
      assert.deepEqual(answer, resolved, JSON.stringify(diagrams));
      assert.ok(Object.isFrozen(answer), "the answer is frozen");
      assert.ok(Object.isFrozen(answer.formats), "its formats are frozen");
      assert.deepEqual(diagramsDiagnostics(await validateConfig(targetDir)), [], `${JSON.stringify(diagrams)} validates`);
    });
  }
}

async function absentDiagramsRaisesNothing() {
  await withDiagramsProject(undefined, async (targetDir) => {
    assert.deepEqual(diagramsDiagnostics(await validateConfig(targetDir)), []);
  });
}

async function badDiagramsShapeIsCodedAndOff() {
  const rows = [
    [DIAGRAMS_ID, "work.diagrams", "diagrams-bad-shape"],
    [{ formats: ["svg"] }, "work.diagrams.generator", "diagrams-generator-required"],
    [{ generator: "mermaid" }, "work.diagrams.generator", "diagrams-generator-unknown"],
    [{ generator: DIAGRAMS_ID, formats: ["png"] }, "work.diagrams.formats", "diagrams-formats-invalid"],
    [{ generator: DIAGRAMS_ID, formats: ["svg", "pdf"] }, "work.diagrams.formats", "diagrams-formats-invalid"],
    [{ generator: DIAGRAMS_ID, formats: ["svg", "svg"] }, "work.diagrams.formats", "diagrams-formats-invalid"],
    [{ generator: DIAGRAMS_ID, formats: [] }, "work.diagrams.formats", "diagrams-formats-invalid"],
    [{ generator: DIAGRAMS_ID, style: "../outside/style.md" }, "work.diagrams.style", "diagrams-style-invalid"],
    [{ generator: DIAGRAMS_ID, style: "C:/abs/style.md" }, "work.diagrams.style", "diagrams-style-invalid"],
    [{ generator: DIAGRAMS_ID, browser: "chrome.exe" }, "work.diagrams.browser", "diagrams-browser-invalid"],
    [{ generator: DIAGRAMS_ID, format: ["svg"] }, "work.diagrams.format", "diagrams-key-unknown"],
  ];
  for (const [diagrams, pathName, code] of rows) {
    await withDiagramsProject(diagrams, async (targetDir, config) => {
      const errors = (await validateConfig(targetDir)).filter((item) => item.severity === "error");
      assert.deepEqual(errors.map((item) => [item.path, item.code]), [[pathName, code]], JSON.stringify(diagrams));
      assert.equal(resolveWorkDiagrams(config).enabled, false, `${JSON.stringify(diagrams)} resolves off`);
    });
  }
}

async function unknownGeneratorListsRegistered() {
  await withDiagramsProject({ generator: "mermaid" }, async (targetDir, config) => {
    const [error] = diagramsDiagnostics(await validateConfig(targetDir));
    assert.equal(error.code, "diagrams-generator-unknown");
    assert.match(error.message, /mermaid/);
    assert.ok(error.message.includes([...generatorIds(), "off"].join(", ")), "lists every registered id, then off");
    assert.equal(resolveWorkDiagrams(config).generator, "off");
  });
}

async function missingStyleFileIsNotAConfigError() {
  await withDiagramsProject({ generator: DIAGRAMS_ID, style: ".aof/diagrams/style.md" }, async (targetDir) => {
    assert.deepEqual(diagramsDiagnostics(await validateConfig(targetDir)), []);
  });
}

async function schemaDescribesDiagrams() {
  const schemaUrl = new URL("../../schemas/aof.schema.json", import.meta.url);
  const schema = JSON.parse(await readFile(schemaUrl, "utf8"));
  const diagrams = schema.$defs.work.properties.diagrams;
  assert.equal(diagrams.type, "object");
  assert.deepEqual(Object.keys(diagrams.properties).sort(), ["browser", "formats", "generator", "style"]);
  assert.equal(diagrams.additionalProperties, false);
  assert.equal(diagrams.properties.formats.type, "array");
  assert.equal(diagrams.properties.formats.uniqueItems, true);
  assert.deepEqual(diagrams.properties.formats.items.enum, ["svg", "png"]);
  const Ajv2020 = (await import("ajv/dist/2020.js")).default;
  const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  for (const [shape] of LEGAL_DIAGRAMS_ROWS()) {
    const config = { name: "x", resources: [], work: shape === undefined ? {} : { diagrams: shape } };
    assert.equal(validate(config), true, `${JSON.stringify(shape)}: ${JSON.stringify(validate.errors)}`);
  }
}

async function inspectsValidConfig() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    await writeProject(targetDir);
    const report = await inspectConfig(targetDir);
    assert.equal(report.name, "demo");
    assert.equal(report.resources[0].id, "context");
    assert.equal(report.packages[0].id, "gsd");
    assert.deepEqual(report.diagnostics, []);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function validatesSemanticErrors() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    await mkdir(path.join(targetDir, ".aof"), { recursive: true });
    await writeFile(path.join(targetDir, ".aof", "aof.config.json"), `${JSON.stringify({
      resources: [
        { kind: "unknown", id: "bad", path: "missing.md", runtimes: ["other"], overrides: { other: {} } }
      ],
      packages: [
        { id: "other", source: "git:example", runtimes: [] }
      ]
    }, null, 2)}\n`, "utf8");
    const diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.length >= 5);
    assert.ok(diagnostics.some((item) => item.path === "resources[0].kind"));
    assert.ok(diagnostics.some((item) => item.code === "missing-file"));
    assert.ok(diagnostics.some((item) => item.path === "packages[0].namespace"));
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function validatesRuntimeCapabilityContractForCommands() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    await mkdir(path.join(targetDir, ".aof", "assets", "commands", "ci"), { recursive: true });
    await mkdir(path.join(targetDir, ".aof", "assets", "skills", "ci"), { recursive: true });
    await writeFile(path.join(targetDir, ".aof", "assets", "commands", "ci", "COMMAND.md"), "Run CI\n", "utf8");
    await writeFile(path.join(targetDir, ".aof", "assets", "skills", "ci", "SKILL.md"), "Run CI\n", "utf8");

    await writeFile(path.join(targetDir, ".aof", "aof.config.json"), `${JSON.stringify({
      name: "demo",
      resources: [
        { kind: "command", id: "ci", path: "assets/commands/ci/COMMAND.md", runtimes: ["codex"] }
      ]
    }, null, 2)}\n`, "utf8");
    let diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.code === "unsupported-runtime-capability" && item.message.includes("Command assets are not supported for Codex")));

    await writeFile(path.join(targetDir, ".aof", "aof.config.json"), `${JSON.stringify({
      name: "demo",
      resources: [
        { kind: "command", id: "ci", path: "assets/commands/ci/COMMAND.md" }
      ]
    }, null, 2)}\n`, "utf8");
    diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.code === "unsupported-runtime-capability"));

    await writeFile(path.join(targetDir, ".aof", "aof.config.json"), `${JSON.stringify({
      name: "demo",
      resources: [
        { kind: "command", id: "ci", path: "assets/commands/ci/COMMAND.md", runtimes: ["claude"] },
        { kind: "skill", id: "ci", path: "assets/skills/ci/SKILL.md", runtimes: ["codex"] }
      ]
    }, null, 2)}\n`, "utf8");
    assert.deepEqual(await validateConfig(targetDir), []);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function validatesSimpleAssetArgumentMarkers() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const workspaceDir = path.join(targetDir, ".aof");
    await mkdir(path.join(workspaceDir, "assets", "skills", "args", "overrides"), { recursive: true });
    await writeFile(path.join(workspaceDir, "assets", "skills", "args", "SKILL.md"), "Use $ARGUMENTS here.\n", "utf8");
    await writeFile(path.join(workspaceDir, "assets", "skills", "args", "overrides", "codex.json"), `${JSON.stringify({ body: "Use {{args.phase}} here." })}\n`, "utf8");
    await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
      name: "demo",
      resources: [
        {
          kind: "skill",
          id: "args",
          path: "assets/skills/args/SKILL.md",
          runtimes: ["codex"],
          arguments: [{ name: "phase" }],
          overrides: { codex: "assets/skills/args/overrides/codex.json" }
        },
        {
          kind: "agent",
          id: "inline",
          body: "Use {{GSD_ARGS}} here.",
          runtimes: ["codex"]
        }
      ]
    }, null, 2)}\n`, "utf8");

    const diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.path === "resources[0].arguments" && item.code === "simple-asset-arguments"));
    assert.ok(diagnostics.some((item) => item.path === "resources[0].path" && item.code === "simple-asset-arguments"));
    assert.ok(diagnostics.some((item) => item.path === "resources[0].overrides.codex" && item.code === "simple-asset-arguments"));
    assert.ok(diagnostics.some((item) => item.path === "resources[1].body" && item.code === "simple-asset-arguments"));
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function validatesWorkflowDeclarations() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const workspaceDir = path.join(targetDir, ".aof");
    await mkdir(path.join(workspaceDir, "assets", "workflows", "audit"), { recursive: true });
    await writeFile(path.join(workspaceDir, "assets", "workflows", "audit", "WORKFLOW.md"), "Workflow body\n", "utf8");

    await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
      name: "demo",
      workflows: [
        {
          id: "audit",
          path: "assets/workflows/audit/WORKFLOW.md",
          argumentHint: "<milestone>",
          arguments: [{ name: "milestone", description: "Milestone number", required: true }]
        }
      ],
      resources: [
        { kind: "skill", id: "audit", workflow: "audit", runtimes: ["codex"] }
      ]
    }, null, 2)}\n`, "utf8");

    assert.deepEqual(await validateConfig(targetDir), []);
    const inspection = await inspectConfig(targetDir, { runtimes: ["codex"] });
    assert.equal(inspection.workflows[0].id, "audit");

    await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
      name: "demo",
      workflows: [
        { id: "audit", path: "assets/workflows/audit/missing.md" },
        { id: "audit", body: "Duplicate", arguments: [{ name: "bad name" }] }
      ],
      resources: []
    }, null, 2)}\n`, "utf8");
    const diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.code === "missing-workflow-file"));
    assert.ok(diagnostics.some((item) => item.path === "workflows[1].arguments[0].name" && item.code === "invalid-workflow-argument"));
    assert.ok(diagnostics.some((item) => item.path === "workflows[1].id" && item.message.includes("Duplicate workflows id")));
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function validatesWorkflowBackedResources() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const workspaceDir = path.join(targetDir, ".aof");
    await mkdir(workspaceDir, { recursive: true });
    await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
      name: "demo",
      workflows: [
        {
          id: "audit",
          body: "Workflow body",
          runtimes: ["codex"],
          arguments: [{ name: "milestone" }]
        }
      ],
      resources: [
        { kind: "skill", id: "good", workflow: "audit", runtimes: ["codex"], argumentOverrides: { milestone: { description: "Milestone id" } } },
        { kind: "skill", id: "missing", workflow: "missing", runtimes: ["codex"] },
        { kind: "command", id: "wrong-runtime", workflow: "audit", runtimes: ["claude"] },
        { kind: "skill", id: "bad-arg", workflow: "audit", runtimes: ["codex"], argumentOverrides: { phase: { description: "Phase" } } },
        { kind: "skill", id: "simple-override", body: "Body", runtimes: ["codex"], argumentOverrides: { phase: {} } }
      ]
    }, null, 2)}\n`, "utf8");

    const diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.path === "resources[1].workflow" && item.code === "missing-workflow"));
    assert.ok(diagnostics.some((item) => item.path === "resources[2].workflow" && item.code === "workflow-runtime-mismatch"));
    assert.ok(diagnostics.some((item) => item.path === "resources[3].argumentOverrides.phase" && item.code === "invalid-workflow-argument"));
    assert.ok(diagnostics.some((item) => item.path === "resources[4].argumentOverrides" && item.code === "invalid-workflow-argument"));
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function validatesAssetReferencePlaceholders() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const globalDir = await mkdtemp(path.join(os.tmpdir(), "aof-global-"));
  const previousGlobalHome = process.env.AOF_GLOBAL_HOME;
  try {
    process.env.AOF_GLOBAL_HOME = globalDir;
    const workspaceDir = path.join(targetDir, ".aof");
    await mkdir(workspaceDir, { recursive: true });

    await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
      name: "demo",
      workflows: [
        { id: "audit", body: "Audit with {{skills.ci}}.", runtimes: ["codex"] }
      ],
      resources: [
        { kind: "skill", id: "ci", body: "Run CI.", runtimes: ["codex"] },
        { kind: "skill", id: "review", body: "Use {{skills.ci}} and {{ workflows.audit }}.", runtimes: ["codex"] }
      ]
    }, null, 2)}\n`, "utf8");
    assert.deepEqual(await validateConfig(targetDir), []);

    await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
      name: "demo",
      resources: [
        { kind: "skill", id: "review", body: "Use {{commands.ci}}, {{skill.ci}}, and {{skills.missing}}.", runtimes: ["codex"] }
      ]
    }, null, 2)}\n`, "utf8");
    let diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.code === "invalid-asset-reference" && item.message.includes("commands")));
    assert.ok(diagnostics.some((item) => item.code === "invalid-asset-reference" && item.message.includes("skill")));
    assert.ok(diagnostics.some((item) => item.code === "missing-asset-reference" && item.message.includes("{{skills.missing}}")));

    await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
      name: "demo",
      resources: [
        { kind: "skill", id: "ci", body: "Run CI.", runtimes: ["claude"] },
        { kind: "skill", id: "review", body: "Use {{skills.ci}}.", runtimes: ["codex"] }
      ]
    }, null, 2)}\n`, "utf8");
    diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.code === "asset-reference-runtime-mismatch" && item.message.includes("codex")));

    await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
      name: "demo",
      resources: [
        { kind: "skill", id: "ci", body: "Run CI.", runtimes: ["codex"] },
        {
          kind: "skill",
          id: "review",
          body: "Shared body.",
          runtimes: ["claude", "codex"],
          overrides: { codex: { body: "Use {{skills.ci}}." } }
        }
      ]
    }, null, 2)}\n`, "utf8");
    assert.deepEqual(await validateConfig(targetDir), []);

    await writeGlobalResource(globalDir, {
      kind: "skill",
      id: "shared",
      body: "Global uses {{skills.local-ci}} and {{workflows.local-audit}}.",
      runtimes: ["codex"]
    });
    await writeProjectWithGlobalRefs(targetDir, [{ kind: "skill", id: "shared" }], {
      resources: [
        { kind: "skill", id: "local-ci", path: "assets/skills/local-ci/SKILL.md", body: "Local CI" }
      ],
      workflows: [
        { id: "local-audit", body: "Local audit", runtimes: ["codex"] }
      ]
    });
    assert.deepEqual(await validateConfig(targetDir), []);
  } finally {
    restoreEnv("AOF_GLOBAL_HOME", previousGlobalHome);
    await rm(targetDir, { recursive: true, force: true });
    await rm(globalDir, { recursive: true, force: true });
  }
}

async function doctorReportsHealth() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    await writeProject(targetDir);
    await writeFile(path.join(targetDir, "aof.config.json"), "{}\n", "utf8");
    const report = await doctorConfig(targetDir, { runtimes: ["codex"] });
    assert.equal(report.legacyConfigIsStale, true);
    assert.ok(report.checks.some((item) => item.id === "legacy-config" && item.severity === "warning"));
    assert.ok(report.checks.some((item) => item.id === "package-intent" && item.severity === "info"));
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function reportsMalformedConfigJson() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    await mkdir(path.join(targetDir, ".aof"), { recursive: true });
    await writeFile(path.join(targetDir, ".aof", "aof.config.json"), "{ not json\n", "utf8");
    const diagnostics = await validateConfig(targetDir);
    assert.equal(diagnostics[0].path, "config");
    assert.equal(diagnostics[0].code, "malformed-json");
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function reportsMalformedOverrideJson() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const workspaceDir = path.join(targetDir, ".aof");
    await mkdir(path.join(workspaceDir, "assets", "skills", "context", "overrides"), { recursive: true });
    await writeFile(path.join(workspaceDir, "assets", "skills", "context", "SKILL.md"), "Body\n", "utf8");
    await writeFile(path.join(workspaceDir, "assets", "skills", "context", "overrides", "codex.json"), "{ bad\n", "utf8");
    await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
      name: "demo",
      resources: [
        {
          kind: "skill",
          id: "context",
          path: "assets/skills/context/SKILL.md",
          overrides: { codex: "assets/skills/context/overrides/codex.json" }
        }
      ],
      packages: []
    }, null, 2)}\n`, "utf8");
    const diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.path === "resources[0].overrides.codex" && item.code === "malformed-json"));
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function toleratesExtensionFields() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const workspaceDir = path.join(targetDir, ".aof");
    await mkdir(path.join(workspaceDir, "assets", "skills", "context"), { recursive: true });
    await writeFile(path.join(workspaceDir, "assets", "skills", "context", "SKILL.md"), "Body\n", "utf8");
    await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
      name: "demo",
      "x-project": true,
      resources: [
        {
          kind: "skill",
          id: "context",
          path: "assets/skills/context/SKILL.md",
          "x-resource": { keep: true },
          overrides: {
            codex: { body: "Codex", "x-override": true }
          }
        }
      ],
      packages: [
        { id: "gsd", namespace: "gsd", source: "npm:get-shit-done-cc@latest", "x-package": true }
      ]
    }, null, 2)}\n`, "utf8");
    assert.deepEqual(await validateConfig(targetDir), []);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function exposesAdapterWarnings() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const workspaceDir = path.join(targetDir, ".aof");
    await mkdir(workspaceDir, { recursive: true });
    await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
      name: "demo",
      resources: [],
      hooks: [
        { id: "notify", event: "PostToolUse", command: "npm test", timeout: 30 }
      ]
    }, null, 2)}\n`, "utf8");

    const inspection = await inspectConfig(targetDir, { runtimes: ["codex"] });
    assert.equal(inspection.adapterWarnings.length, 1);
    assert.equal(inspection.adapterWarnings[0].code, "adapter.skipped-runtime-output");

    const report = await doctorConfig(targetDir, { runtimes: ["codex"] });
    assert.ok(report.checks.some((item) => item.id === "adapter-degradation" && item.severity === "warning"));
    assert.equal(report.adapterWarnings.length, 1);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function validatesGlobalConfig() {
  const globalDir = await mkdtemp(path.join(os.tmpdir(), "aof-global-"));
  const previousGlobalHome = process.env.AOF_GLOBAL_HOME;
  try {
    process.env.AOF_GLOBAL_HOME = globalDir;
    await mkdir(path.join(globalDir, "assets", "skills", "context"), { recursive: true });
    await writeFile(path.join(globalDir, "assets", "skills", "context", "SKILL.md"), "Global body\n", "utf8");
    await writeFile(path.join(globalDir, "aof.config.json"), `${JSON.stringify({
      name: "aof-global",
      resources: [
        { kind: "skill", id: "context", path: "assets/skills/context/SKILL.md", runtimes: ["codex"] }
      ]
    }, null, 2)}\n`, "utf8");

    assert.deepEqual(await validateGlobalConfig(), []);
    const inspection = await inspectGlobalConfig();
    assert.equal(inspection.resources[0].id, "context");
  } finally {
    restoreEnv("AOF_GLOBAL_HOME", previousGlobalHome);
    await rm(globalDir, { recursive: true, force: true });
  }
}

async function projectValidationIgnoresUnreferencedGlobalDrafts() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const globalDir = await mkdtemp(path.join(os.tmpdir(), "aof-global-"));
  const previousGlobalHome = process.env.AOF_GLOBAL_HOME;
  try {
    process.env.AOF_GLOBAL_HOME = globalDir;
    await writeProject(targetDir);
    await mkdir(globalDir, { recursive: true });
    await writeFile(path.join(globalDir, "aof.config.json"), "{ bad\n", "utf8");

    assert.deepEqual(await validateConfig(targetDir), []);
    const diagnostics = await validateGlobalConfig();
    assert.ok(diagnostics.some((item) => item.code === "malformed-json"));
  } finally {
    restoreEnv("AOF_GLOBAL_HOME", previousGlobalHome);
    await rm(targetDir, { recursive: true, force: true });
    await rm(globalDir, { recursive: true, force: true });
  }
}

async function validatesReferencedGlobalResources() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const globalDir = await mkdtemp(path.join(os.tmpdir(), "aof-global-"));
  const previousGlobalHome = process.env.AOF_GLOBAL_HOME;
  try {
    process.env.AOF_GLOBAL_HOME = globalDir;
    await writeGlobalResource(globalDir, { kind: "skill", id: "shared", body: "Global body" });
    await writeProjectWithGlobalRefs(targetDir, [{ kind: "skill", id: "shared" }]);

    assert.deepEqual(await validateConfig(targetDir), []);
    const inspection = await inspectConfig(targetDir, { runtimes: ["codex"] });
    assert.equal(inspection.globalRefs[0].id, "shared");
    assert.ok(inspection.resources.some((resource) => resource.id === "shared" && resource.source === "global"));
  } finally {
    restoreEnv("AOF_GLOBAL_HOME", previousGlobalHome);
    await rm(targetDir, { recursive: true, force: true });
    await rm(globalDir, { recursive: true, force: true });
  }
}

async function validatesReferencedGlobalWorkflows() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const globalDir = await mkdtemp(path.join(os.tmpdir(), "aof-global-"));
  const previousGlobalHome = process.env.AOF_GLOBAL_HOME;
  try {
    process.env.AOF_GLOBAL_HOME = globalDir;
    await writeGlobalWorkflow(globalDir, { id: "audit", body: "Global workflow", runtimes: ["codex"] });
    await writeProjectWithGlobalRefs(targetDir, [{ kind: "workflow", id: "audit" }], {
      resources: [
        { kind: "skill", id: "audit", path: "assets/skills/audit/SKILL.md", body: "Local body" }
      ]
    });
    let diagnostics = await validateConfig(targetDir);
    assert.deepEqual(diagnostics, []);

    const inspection = await inspectConfig(targetDir, { runtimes: ["codex"] });
    assert.ok(inspection.workflows.some((workflow) => workflow.id === "audit" && workflow.source === "global"));

    await writeProjectWithGlobalRefs(targetDir, [{ kind: "workflow", id: "missing" }]);
    diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.code === "missing-global-workflow"));

    await writeProjectWithGlobalRefs(targetDir, [{ kind: "workflow", id: "audit" }], {
      workflows: [{ id: "audit", body: "Local workflow" }]
    });
    diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.code === "local-global-conflict"));
  } finally {
    restoreEnv("AOF_GLOBAL_HOME", previousGlobalHome);
    await rm(targetDir, { recursive: true, force: true });
    await rm(globalDir, { recursive: true, force: true });
  }
}

async function reportsMissingAndConflictingGlobalReferences() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const globalDir = await mkdtemp(path.join(os.tmpdir(), "aof-global-"));
  const previousGlobalHome = process.env.AOF_GLOBAL_HOME;
  try {
    process.env.AOF_GLOBAL_HOME = globalDir;
    await writeGlobalResource(globalDir, { kind: "skill", id: "shared", body: "Global body" });
    await writeProjectWithGlobalRefs(targetDir, [
      { kind: "skill", id: "shared" },
      { kind: "skill", id: "missing" },
      { kind: "skill", id: "missing" }
    ], {
      resources: [
        { kind: "skill", id: "shared", path: "assets/skills/shared/SKILL.md", body: "Local body" }
      ]
    });

    const diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.code === "missing-global-resource"));
    assert.ok(diagnostics.some((item) => item.code === "local-global-conflict"));
    assert.ok(diagnostics.some((item) => item.path === "globalRefs[2].id"));
  } finally {
    restoreEnv("AOF_GLOBAL_HOME", previousGlobalHome);
    await rm(targetDir, { recursive: true, force: true });
    await rm(globalDir, { recursive: true, force: true });
  }
}

async function validatesAssociatedFilesOnReferencedGlobalSkills() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const globalDir = await mkdtemp(path.join(os.tmpdir(), "aof-global-"));
  const previousGlobalHome = process.env.AOF_GLOBAL_HOME;
  try {
    process.env.AOF_GLOBAL_HOME = globalDir;
    await writeGlobalResource(globalDir, {
      kind: "skill",
      id: "shared",
      body: "Global body",
      files: [{ path: "search.py", body: "print('search')\n" }]
    });
    await writeProjectWithGlobalRefs(targetDir, [{ kind: "skill", id: "shared" }]);

    assert.deepEqual(await validateConfig(targetDir), []);
    assert.deepEqual(await validateGlobalConfig(), []);
  } finally {
    restoreEnv("AOF_GLOBAL_HOME", previousGlobalHome);
    await rm(targetDir, { recursive: true, force: true });
    await rm(globalDir, { recursive: true, force: true });
  }
}

async function validatesAssociatedFileRuntimeReferences() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const commandDir = path.join(targetDir, ".aof", "assets", "commands", "convert-files");
    const skillDir = path.join(targetDir, ".aof", "assets", "skills", "research");
    await mkdir(path.join(commandDir, "files"), { recursive: true });
    await mkdir(path.join(skillDir, "files"), { recursive: true });
    await writeFile(path.join(commandDir, "files", "run.ps1"), "Write-Output convert\n", "utf8");
    await writeFile(path.join(commandDir, "files", "run.sh"), "echo convert\n", "utf8");
    await writeFile(path.join(skillDir, "files", "search.py"), "print('search')\n", "utf8");
    await writeFile(path.join(commandDir, "COMMAND.md"), [
      "On Windows:",
      "pwsh -File .claude/commands/run.ps1",
      ""
    ].join("\n"), "utf8");
    await writeFile(path.join(skillDir, "SKILL.md"), [
      "Use `.codex/skills/research/search.py` for local searches.",
      ""
    ].join("\n"), "utf8");
    await writeFile(path.join(targetDir, ".aof", "aof.config.json"), `${JSON.stringify({
      name: "demo",
      resources: [
        {
          kind: "command",
          id: "convert-files",
          path: "assets/commands/convert-files/COMMAND.md",
          files: ["run.ps1", "run.sh"],
          runtimes: ["claude"]
        },
        {
          kind: "skill",
          id: "research",
          path: "assets/skills/research/SKILL.md",
          files: ["search.py"],
          runtimes: ["codex"]
        }
      ]
    }, null, 2)}\n`, "utf8");

    assert.deepEqual(await validateConfig(targetDir), []);

    await writeFile(path.join(commandDir, "COMMAND.md"), "Run {{files.scripts/run.py}}\n", "utf8");
    let diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.code === "invalid-associated-file-reference" && item.message.includes("not a nested path")));

    await writeFile(path.join(commandDir, "COMMAND.md"), "pwsh -File .claude/commands/missing.ps1\n", "utf8");
    await writeFile(path.join(skillDir, "SKILL.md"), "Use `.codex/skills/research/missing.py`.\n", "utf8");
    diagnostics = await validateConfig(targetDir);
    assert.equal(diagnostics.filter((item) => item.code === "invalid-associated-file-reference").length, 2);
    assert.ok(diagnostics.some((item) => item.message.includes(".claude/commands/missing.ps1")));
    assert.ok(diagnostics.some((item) => item.message.includes(".codex/skills/research/missing.py")));
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function reportsUnsafeAssociatedFileDeclarations() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const globalDir = await mkdtemp(path.join(os.tmpdir(), "aof-global-"));
  const previousGlobalHome = process.env.AOF_GLOBAL_HOME;
  try {
    process.env.AOF_GLOBAL_HOME = globalDir;
    await writeProjectWithGlobalRefs(targetDir, [{ kind: "skill", id: "unsafe" }]);
    await writeGlobalResource(globalDir, {
      kind: "skill",
      id: "unsafe",
      body: "Global body",
      files: [
        { path: "../escape.py", body: "print('escape')\n" },
        { path: "missing.py" },
        { path: "dir", directory: true },
        { path: "SKILL.md" }
      ]
    });

    const diagnostics = await validateConfig(targetDir);
    assert.ok(diagnostics.some((item) => item.code === "associated-file-escape"));
    assert.ok(diagnostics.some((item) => item.code === "missing-associated-file"));
    assert.ok(diagnostics.some((item) => item.code === "associated-file-not-file"));
    assert.ok(diagnostics.some((item) => item.code === "associated-file-body"));

    await writeGlobalResource(globalDir, {
      kind: "command",
      id: "command-helper",
      body: "Command body",
      files: [{ path: "helper.py", body: "print('command')\n" }],
      runtimes: ["claude"]
    });
    assert.deepEqual(await validateGlobalConfig(), []);

    await writeGlobalResource(globalDir, {
      kind: "agent",
      id: "agent-helper",
      body: "Agent body",
      files: [{ path: "helper.py", body: "print('agent')\n" }]
    });
    const kindDiagnostics = await validateGlobalConfig();
    assert.ok(kindDiagnostics.some((item) => item.code === "unsupported-associated-files"));

  } finally {
    restoreEnv("AOF_GLOBAL_HOME", previousGlobalHome);
    await rm(targetDir, { recursive: true, force: true });
    await rm(globalDir, { recursive: true, force: true });
  }
}

async function writeProject(targetDir) {
  const workspaceDir = path.join(targetDir, ".aof");
  await mkdir(path.join(workspaceDir, "assets", "skills", "context"), { recursive: true });
  await writeFile(path.join(workspaceDir, "assets", "skills", "context", "SKILL.md"), "Body\n", "utf8");
  await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
    name: "demo",
    resources: [
      { kind: "skill", id: "context", path: "assets/skills/context/SKILL.md", runtimes: ["codex"] }
    ],
    packages: [
      { id: "gsd", namespace: "gsd", source: "npm:get-shit-done-cc@latest", runtimes: ["codex"] }
    ]
  }, null, 2)}\n`, "utf8");
}

async function writeProjectWithGlobalRefs(targetDir, globalRefs, options = {}) {
  const workspaceDir = path.join(targetDir, ".aof");
  await mkdir(workspaceDir, { recursive: true });
  const resources = [];
  const workflows = [];
  for (const resource of options.resources ?? []) {
    const resourcePath = path.join(workspaceDir, resource.path);
    await mkdir(path.dirname(resourcePath), { recursive: true });
    await writeFile(resourcePath, `${resource.body}\n`, "utf8");
    resources.push({
      kind: resource.kind,
      id: resource.id,
      path: resource.path,
      runtimes: ["codex"]
    });
  }
  for (const workflow of options.workflows ?? []) {
    workflows.push({
      id: workflow.id,
      body: workflow.body,
      runtimes: workflow.runtimes ?? ["codex"]
    });
  }
  await writeFile(path.join(workspaceDir, "aof.config.json"), `${JSON.stringify({
    name: "demo",
    resources,
    workflows,
    globalRefs
  }, null, 2)}\n`, "utf8");
}

async function writeGlobalResource(globalDir, input) {
  const plural = input.kind === "skill" ? "skills" : input.kind === "command" ? "commands" : input.kind === "agent" ? "agents" : "rules";
  const bodyFile = input.kind === "skill" ? "SKILL.md" : input.kind === "command" ? "COMMAND.md" : input.kind === "agent" ? "AGENT.md" : "RULE.md";
  const resourceDir = path.join(globalDir, "assets", plural, input.id);
  await mkdir(resourceDir, { recursive: true });
  await writeFile(path.join(resourceDir, bodyFile), `${input.body}\n`, "utf8");
  for (const file of input.files ?? []) {
    const filePath = path.join(resourceDir, "files", file.path);
    await mkdir(path.dirname(filePath), { recursive: true });
    if (file.directory) {
      await mkdir(filePath, { recursive: true });
    } else if (file.body !== undefined) {
      await writeFile(filePath, file.body, "utf8");
    }
  }
  await writeFile(path.join(globalDir, "aof.config.json"), `${JSON.stringify({
    name: "aof-global",
    resources: [
      {
        kind: input.kind,
        id: input.id,
        path: `assets/${plural}/${input.id}/${bodyFile}`,
        files: (input.files ?? []).map((file) => file.path),
        runtimes: input.runtimes ?? ["codex"]
      }
    ]
  }, null, 2)}\n`, "utf8");
}

async function writeGlobalWorkflow(globalDir, input) {
  const workflowDir = path.join(globalDir, "assets", "workflows", input.id);
  await mkdir(workflowDir, { recursive: true });
  await writeFile(path.join(workflowDir, "WORKFLOW.md"), `${input.body}\n`, "utf8");
  await writeFile(path.join(globalDir, "aof.config.json"), `${JSON.stringify({
    name: "aof-global",
    workflows: [
      {
        id: input.id,
        path: `assets/workflows/${input.id}/WORKFLOW.md`,
        runtimes: input.runtimes ?? ["codex"]
      }
    ],
    resources: []
  }, null, 2)}\n`, "utf8");
}

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

// ------------------------------------------------ 180/01 task 03: the faces ----
//
// Config inspection, project doctor and memory status name the memory node's new paths, and the
// outputs scripts and hooks parse are the same whichever spelling the config uses (180/ADR-001,
// ADR-005). THE FIXTURE is the feature's: a temp project under an isolated AOF_GLOBAL_HOME with a work
// stream holding one ADR, the "legacy config" and its "new-shape twin". Declared as a function so
// the array above can spread it before this module's later bindings are initialised.
function memoryNodeFaceTests() {
  const LEGACY = { name: "p", resources: [], memory: { backend: "local", sources: ["claude-auto-memory"] }, graph: { share: "off" } };
  const TWIN = { name: "p", resources: [], memory: { backend: "local", corpora: ["work", "imports", "code", "operator"], graph: { share: "off" } } };
  const seam = _aofApplication.knowledge.work.memory;
  const cliPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "packages", "core", "bin", "aof.mjs");
  const t = (name, run) => ({ name: `180/01 task 03: ${name}`, run });

  async function withProject(config, fn) {
    const root = await mkdtemp(path.join(os.tmpdir(), "aof-180-faces-"));
    const previous = process.env.AOF_GLOBAL_HOME;
    process.env.AOF_GLOBAL_HOME = path.join(root, "home");
    try {
      const project = path.join(root, "project");
      const milestone = path.join(project, "wiki", "work", "01_milestone_line-endings");
      await mkdir(milestone, { recursive: true });
      await mkdir(path.join(project, ".aof"), { recursive: true });
      await mkdir(process.env.AOF_GLOBAL_HOME, { recursive: true });
      await writeFile(path.join(milestone, "SPEC.md"), "---\ntype: milestone\nnumber: 1\nslug: line-endings\ntitle: Line endings\nstatus: done\n---\n");
      await writeFile(path.join(milestone, "ARCHITECTURE.md"), "## ADR-001: Pin line endings\n\n**Status:** Accepted\n\n**Decision.** Pin line endings in .gitattributes.\n");
      await writeFile(path.join(project, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`);
      return await fn({ root, project, workDir: path.join(project, "wiki", "work") });
    } finally {
      restoreEnv("AOF_GLOBAL_HOME", previous);
      await rm(root, { recursive: true, force: true });
    }
  }

  // Each copy's own paths written as "{root}": its project first, then the temp root that holds it,
  // each in its plain, realpath, Claude-slug and JSON-escaped spellings.
  function rooted(text, { root, project }) {
    for (const dir of [project, root]) {
      for (const form of new Set([dir, realpathSync(dir)])) {
        for (const spelling of [form, form.replace(/[^A-Za-z0-9]/g, "-"), JSON.stringify(form).slice(1, -1)]) text = text.split(spelling).join("{root}");
      }
    }
    return text;
  }

  async function status(config, args = []) {
    return withProject(config, async (copy) => {
      const lines = [];
      const ctx = { projectRoot: copy.project, workDir: copy.workDir, configMemory: config.memory };
      const outcome = await seam.runMemory(["status", ...args], { config, ctx, log: (line) => lines.push(line) });
      return { result: outcome.result, out: lines.join("\n"), rootedOut: rooted(lines.join("\n"), copy) };
    });
  }

  const withoutConfig = ({ config, ...rest }) => rest;

  return [
    t("config inspection reports the node at its new paths", async () => {
      await withProject(TWIN, async ({ project }) => {
        const { memory } = await inspectConfig(project);
        assert.deepEqual(memory.corpora, ["work", "imports", "code", "operator"]);
        assert.equal(memory.corporaSource, "project setting");
        assert.deepEqual(memory.paths, { backend: "memory.backend", corpora: "memory.corpora", graph: "memory.graph", extraction: "memory.backends.graphify.extractionBackend" });
        assert.deepEqual(memory.legacy, []);
      });
    }),
    t("E14 · project doctor warns of each old key and still calls the config valid", async () => {
      await withProject(LEGACY, async ({ project }) => {
        const report = await doctorConfig(project);
        const legacy = report.diagnostics.filter((item) => item.code === "memory-config-legacy");
        assert.deepEqual(legacy.map((item) => [item.severity, item.path]), [["warning", "memory.sources"], ["warning", "graph.share"]]);
        assert.match(legacy[0].message, /memory\.corpora/);
        assert.match(legacy[1].message, /memory\.graph\.share/);
        for (const item of legacy) assert.match(item.message, /`aof work update` rewrites/);
        assert.equal(report.checks.find((check) => check.id === "config-valid").severity, "ok");
        // The text face prints checks, so the warning is a check too.
        assert.equal(report.checks.find((check) => check.id === "memory-config-legacy")?.severity, "warning");
      });
    }),
    t("a conflict is an error in config inspection", async () => {
      await withProject({ name: "p", resources: [], graph: { share: "off" }, memory: { graph: { share: "off" } } }, async ({ project }) => {
        const report = await doctorConfig(project);
        assert.ok(report.diagnostics.some((item) => item.severity === "error" && item.code === "memory-config-conflict"), JSON.stringify(report.diagnostics));
        assert.equal(report.checks.find((check) => check.id === "config-valid").severity, "error");
      });
    }),
    ...[
      ["E13", "new-shape twin", TWIN, ["corpora: work, imports, code, operator"]],
      ["E13", "legacy config", LEGACY, ["corpora: work, imports, code, operator", "memory.sources → memory.corpora", "graph.share → memory.graph.share"]],
    ].map(([example, label, config, added]) => t(`${example} · memory status adds the corpora line, and one line per old key — ${label}`, async () => {
      const { result, out } = await status(config);
      const today = seam.renderMemory("status", withoutConfig(result));
      assert.ok(out.startsWith(`${today}\n`), "today's output comes first, unchanged");
      const lines = out.slice(today.length + 1).split("\n");
      assert.equal(lines.length, added.length, lines.join(" | "));
      added.forEach((text, index) => assert.ok(lines[index].includes(text), `${lines[index]} names ${text}`));
      assert.equal(lines[0], added[0], "the corpora line is exactly that");
    })),
    t("memory status --json carries the node as a config object", async () => {
      const legacy = JSON.parse((await status(LEGACY, ["--json"])).rootedOut);
      const twin = JSON.parse((await status(TWIN, ["--json"])).rootedOut);
      assert.deepEqual(legacy.config.corpora, ["work", "imports", "code", "operator"]);
      assert.equal(legacy.config.corporaSource, "project setting");
      assert.equal(legacy.config.legacy.length, 2);
      assert.deepEqual(withoutConfig(legacy), withoutConfig(twin), "every other field of the answer is unchanged");
    }),
    ...[
      ["E15", ["memory", "recall", "pin line endings", "--block"]],
      ["", ["memory", "recall", "pin line endings", "--json"]],
      ["", ["memory", "ingest", "--json"]],
      ["", ["graph", "impact", "packages/a.mjs", "--json"]],
    ].map(([example, args]) => t(`E15 · a parsed output is the same whichever spelling the config uses — ${example ? `${example} ` : ""}aof ${args.join(" ")}`, async () => {
      const outputs = [];
      for (const config of [LEGACY, TWIN]) {
        await withProject(config, async (copy) => {
          const { root, project } = copy;
          // Each copy's own auto-memory folder holds the feature's one feedback entry.
          const claudeHome = path.join(root, "claude");
          const real = realpathSync(project);
          const memoryDir = path.join(claudeHome, "projects", real.replace(/[^A-Za-z0-9]/g, "-"), "memory");
          await mkdir(memoryDir, { recursive: true });
          await writeFile(path.join(memoryDir, "pin-line-endings.md"), "---\nname: Pin line endings\ndescription: Pin line endings in .gitattributes\nmetadata:\n  type: feedback\n---\nWhy: CRLF churn.\n");
          // …and one code graph, b importing a, at a fixed build time so `builtAt` agrees across copies.
          const graphJson = path.join(project, "graphify-out", "graph.json");
          await mkdir(path.dirname(graphJson), { recursive: true });
          await writeFile(graphJson, JSON.stringify({ directed: true, multigraph: false, graph: {}, hyperedges: [],
            nodes: ["a", "b"].map((id) => ({ id, label: `${id}.mjs`, file_type: "code", source_file: `packages/${id}.mjs`, source_location: "L1" })),
            links: [{ source: "b", target: "a", relation: "imports" }] }));
          await utimes(graphJson, new Date("2026-10-30T00:00:00Z"), new Date("2026-10-30T00:00:00Z"));
          const env = { ...process.env, NODE_NO_WARNINGS: "1", CLAUDE_CONFIG_DIR: claudeHome, AOF_GLOBAL_HOME: process.env.AOF_GLOBAL_HOME };
          const cli = (argv) => spawnCliSync(process.execPath, [cliPath, ...argv], { cwd: project, encoding: "utf8", windowsHide: true, env });
          if (args[1] === "recall") assert.equal(cli(["memory", "ingest", "--json"]).status, 0);
          const result = cli(args);
          assert.equal(result.status, 0, result.stderr);
          const text = rooted(`${result.stdout}${result.stderr}`, copy);
          assert.doesNotMatch(text, /memory-config-legacy|aof work update|→ memory\./, "no legacy warning");
          outputs.push(text);
        });
      }
      if (args[1] === "recall") assert.match(outputs[0], /operator:claude-auto-memory/, "the recall found the operator lesson (non-vacuity)");
      if (args[0] === "graph") assert.match(outputs[0], /packages\/b\.mjs/, "the impact found the dependent (non-vacuity)");
      assert.equal(outputs[1], outputs[0], "byte-identical once each root is {root}");
    })),
  ];
}

// ------------------------------------------ 180/01 task 02: the schema's node ----
//
// THE FIXTURE is the feature's: the shipped "schemas/aof.schema.json" compiled with the project's
// JSON-schema validator (ajv, a declared root dependency). Here rather than in the knowledge package's
// suite, which declares no ajv (05/R3).
function memoryNodeSchemaTests() {
  const t = (name, run) => ({ name: `180/01 task 02: ${name}`, run });
  const validator = async () => {
    const Ajv2020 = (await import("ajv/dist/2020.js")).default;
    const schema = JSON.parse(await readFile(new URL("../../schemas/aof.schema.json", import.meta.url), "utf8"));
    return new Ajv2020({ strict: false }).compile(schema);
  };
  return [
    ...[
      ["accepts", { backends: { graphify: { extractionBackend: "claude-cli" } } }],
      ["accepts", { backends: { graphify: {} } }],
      ["refuses", { backends: { cognee: {} } }],
      ["refuses", { backends: { graphify: { model: "x" } } }],
      ["refuses", { backends: { graphify: { extractionBackend: "codex" } } }],
    ].map(([verdict, memory]) => t(`E11 · the schema admits only registered engines and their known settings — ${verdict} ${JSON.stringify(memory)}`, async () => {
      assert.equal((await validator())({ name: "p", resources: [], memory }), verdict === "accepts");
    })),
    ...[
      ["accepts", { name: "p", resources: [], memory: { backend: "graphify", corpora: ["work", "imports", "code"], graph: { share: "git-refs", remote: "origin" }, backends: { graphify: { extractionBackend: "claude-cli" } } } }],
      ["accepts", { name: "p", resources: [], memory: { backend: "local", sources: ["claude-auto-memory"], graphify: { extractionBackend: "ollama" } }, graph: { share: "off" } }],
      ["refuses", { name: "p", resources: [], memory: { graph: { share: "git-refs" }, egress: "local-only" } }],
      ["refuses", { name: "p", resources: [], memory: { corpora: ["work", "code"] } }],
    ].map(([verdict, config], index) => t(`E12 · the schema holds the new node, still admits the old spelling, and has no egress key — row ${index + 1} ${verdict}`, async () => {
      assert.equal((await validator())(config), verdict === "accepts");
    })),
  ];
}

// ══ 199 · each person keeps their own settings in an uncommitted local config ══
//
// Traceability wiring for story 199. Covers EVERY @executable scenario in
//   tasks/00_the-local-file-wins-and-says-where-each-value-came-from.feature
//   tasks/01_the-local-file-holds-only-per-person-keys.feature
//   tasks/02_the-local-file-is-never-committed.feature
//   tasks/03_init-config-writes-the-operator-profile-locally.feature
//   tasks/04_the-runtime-audit-covers-every-child-process-199-touched.feature (@bug, F-03)
// One entry per scenario, Scenario Outline rows folded into one entry. Every fixture is a project `P`
// in a fresh temp directory, its global home another, named through `AOF_GLOBAL_HOME` (199 Q5): no
// run reads or writes the real `~/.aof`, and the local file is planted as a fixture beside `P`'s config.
function localConfigTests() {
  const ABSENT = Symbol("absent");
  const cliPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "packages", "core", "bin", "aof.mjs");
  const loadWorkspace = _aofApplication.loadWorkspace;
  const examplesEnabledFromConfig = _aofApplication.assets.configInspect.examplesEnabledFromConfig;
  const GIT_IDENTITY = ["-c", "user.email=fixture@example.test", "-c", "user.name=Fixture", "-c", "commit.gpgsign=false"];

  // A dotted path's value as a plain object: "work.operator.role" + "P" → { work: { operator: { role: "P" } } }.
  const at = (dotted, value) => dotted.split(".").reverse().reduce((inner, key) => ({ [key]: inner }), value);
  const deepMerge = (base, over) => {
    const merged = { ...base };
    for (const [key, value] of Object.entries(over)) {
      merged[key] = value && typeof value === "object" && !Array.isArray(value) && merged[key] && typeof merged[key] === "object" ? deepMerge(merged[key], value) : value;
    }
    return merged;
  };
  const valueAt = (config, dotted) => dotted.split(".").reduce((value, key) => (value == null ? undefined : value[key]), config);

  // `project` / `local` / `global` are config objects (or ABSENT); `localText` plants raw text instead.
  // `repo: true` makes `P` a git repository with aof initialised (`aof work init`).
  async function withLocal({ project = {}, local = ABSENT, localText = null, global = ABSENT, repo = false } = {}, body) {
    // Real-pathed: on macOS the temp dir is a symlink, and the CLI names files by the path it runs in.
    const root = realpathSync(await mkdtemp(path.join(os.tmpdir(), "aof-local-config-")));
    const projectDir = path.join(root, "P");
    const home = path.join(root, "home");
    try {
      await mkdir(path.join(projectDir, ".aof"), { recursive: true });
      await mkdir(path.join(projectDir, "wiki", "work"), { recursive: true });
      await mkdir(home, { recursive: true });
      const configPath = path.join(projectDir, ".aof", "aof.config.json");
      const localPath = path.join(projectDir, ".aof", "aof.config.local.json");
      const globalPath = path.join(home, "aof.config.json");
      await writeFile(configPath, `${JSON.stringify(deepMerge({ name: "fixture", resources: [], work: { dir: "./wiki/work" } }, project), null, 2)}\n`, "utf8");
      if (localText != null) await writeFile(localPath, localText, "utf8");
      else if (local !== ABSENT) await writeFile(localPath, `${JSON.stringify(local, null, 2)}\n`, "utf8");
      if (global !== ABSENT) await writeFile(globalPath, `${JSON.stringify(global, null, 2)}\n`, "utf8");
      const env = { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" };
      const cli = (...argv) => {
        const result = spawnCliSync(process.execPath, [cliPath, ...argv], { cwd: projectDir, encoding: "utf8", windowsHide: true, env });
        let json = null;
        try { json = JSON.parse(result.stdout); } catch { json = null; }
        return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", json };
      };
      const git = (...argv) => spawnCliSync("git", [...GIT_IDENTITY, ...argv], { cwd: projectDir, encoding: "utf8", windowsHide: true });
      if (repo) {
        assert.equal(git("init", "-q").status, 0);
        const init = cli("work", "init", "--json");
        assert.equal(init.status, 0, init.stderr || init.stdout);
      }
      const read = async (file) => JSON.parse(await readFile(file, "utf8"));
      await body({
        root, project: projectDir, home, env, cli, git, configPath, localPath, globalPath, read,
        load: (cwd = projectDir) => loadWorkspace(cwd, undefined, { env }),
        resolved: async (cwd = projectDir) => operatorProfileFromConfig((await loadWorkspace(cwd, undefined, { env })).config),
        validate: () => cli("project", "validate", "--json"),
        ignoreLines: async () => (await readFile(path.join(projectDir, ".aof", ".gitignore"), "utf8")).split(/\r?\n/),
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  const localCodes = (report) => (report.json?.diagnostics ?? []).filter((entry) => entry.code?.startsWith("config-local-"));
  const t = (name, run) => ({ name: `199 ${name}`, run });

  return [
    // ── 00 · the local file wins, and every value says which file it came from ──
    t("00 E1 · the local operator role wins over the project's", () => withLocal({
      project: at("work.operator.role", "Builds the mesh"),
      local: at("work.operator.role", "Product owner, new to the codebase"),
    }, async (fx) => {
      assert.equal((await fx.resolved()).role, "Product owner, new to the codebase");
    })),
    t("00 E2 · expertise merges per domain, the local entry winning", () => withLocal({
      project: at("work.operator.expertise", { mesh: "expert", ui: "working" }),
      local: at("work.operator.expertise", { ui: "new" }),
    }, async (fx) => {
      const profile = await fx.resolved();
      assert.equal(operatorLevel(profile, "mesh"), "expert");
      assert.equal(operatorLevel(profile, "ui"), "new");
    })),
    t("00 E3 · with no local file, every value is today's", async () => {
      const project = deepMerge(deepMerge(deepMerge(at("work.operator", { role: "P", expertise: { ui: "working" } }), at("work.agents.session.effort", { build: "high" })), at("mesh.fabric", "direct")), at("work.intake", "backlog"));
      const global = deepMerge(deepMerge(at("work.operator", { role: "G", expertise: { mesh: "expert" } }), at("work.notify.channels", { discord: { type: "discord", channelId: "1" } })), at("mesh.address", "127.0.0.1"));
      await withLocal({ project, global }, async (fx) => {
        const workspace = await fx.load();
        // Today's per-block rules, spelled out: mesh merged, channels replaced, the profile merged by its own rule.
        const expected = deepMerge(await fx.read(fx.configPath), {
          mesh: { address: "127.0.0.1", fabric: "direct" },
          work: { notify: { channels: { discord: { type: "discord", channelId: "1" } } }, operator: { role: "P", expertise: { mesh: "expert", ui: "working" } } },
        });
        const { nodeId, salt, ...mesh } = workspace.config.mesh;
        assert.deepEqual({ ...workspace.config, mesh }, expected);
        assert.equal(workspace.localConfigPath, null);
        assert.equal(workspace.configFault, null);
        assert.deepEqual(Object.values(workspace.configSources).filter((source) => source.layer === "local"), []);
      });
    }),
    t("00 E4 · inspection names the local file as a value's source", () => withLocal({ local: at("work.operator.role", "Product owner") }, async (fx) => {
      const shown = fx.cli("project", "show", "--json");
      assert.equal(shown.status, 0, shown.stderr);
      assert.deepEqual(shown.json.sources["work.operator.role"], { layer: "local", configPath: fx.localPath });
      assert.equal(shown.json.operator.roleSource, "local");
      assert.deepEqual(shown.json.local.overrides, ["work.operator.role"]);
      assert.ok(fx.cli("project", "show").stdout.includes(`local: ${fx.localPath} — overrides work.operator.role`));
    })),
    t("00 E5 · a loop lane reads the local file of the checkout that started it", () => withLocal({ local: at("work.operator.role", "Product owner") }, async (fx) => {
      assert.equal(fx.git("init", "-q").status, 0);
      assert.equal(fx.git("add", ".aof/aof.config.json").status, 0);
      assert.equal(fx.git("commit", "-q", "-m", "fixture").status, 0);
      const lane = path.join(fx.project, ".aof", "mesh", "worktrees", "a1");
      const added = fx.git("worktree", "add", "-q", "--detach", lane);
      assert.equal(added.status, 0, added.stderr);
      await assert.rejects(readFile(path.join(lane, ".aof", "aof.config.local.json")), "the lane holds no local file of its own");
      assert.equal((await fx.resolved(lane)).role, "Product owner");
      assert.equal((await fx.load(lane)).localConfigPath, fx.localPath);
    })),
    t("00 every layer and every allow-listed key, from the right file", async () => {
      const rows = [
        ["work.operator.role", "G", "P", "L", "L", "local"],
        ["work.operator.role", "G", "P", ABSENT, "P", "project"],
        ["work.operator.role", "G", ABSENT, ABSENT, "G", "global"],
        ["work.operator.role", "G", ABSENT, "L", "L", "local"],
        ["work.notify.channels", { discord: { type: "discord", channelId: "G" } }, { discord: { type: "discord", channelId: "P" } }, { discord: { type: "discord", channelId: "L" } }, { discord: { type: "discord", channelId: "L" } }, "local"],
        ["work.notify.channels", { discord: { type: "discord", channelId: "G" } }, ABSENT, ABSENT, { discord: { type: "discord", channelId: "G" } }, "global"],
        ["work.agents.session.effort.build", ABSENT, "high", "xhigh", "xhigh", "local"],
        ["work.agents.session.effort.build", ABSENT, "high", ABSENT, "high", "project"],
      ];
      for (const [key, global, project, local, resolved, source] of rows) {
        const label = `${key} G=${JSON.stringify(global)} P=${JSON.stringify(project)} L=${JSON.stringify(local)}`;
        await withLocal({
          global: global === ABSENT ? ABSENT : at(key, global),
          project: project === ABSENT ? {} : at(key, project),
          local: local === ABSENT ? ABSENT : at(key, local),
        }, async (fx) => {
          const workspace = await fx.load();
          assert.deepEqual(valueAt(workspace.config, key), resolved, label);
          const file = { local: fx.localPath, project: fx.configPath, global: fx.globalPath }[source];
          assert.deepEqual(workspace.configSources[key], { layer: source, configPath: file }, label);
        });
      }
    }),
    t("00 an unreadable local file is reported, never silently skipped", () => withLocal({ localText: "{ not json" }, async (fx) => {
      const [entry, ...rest] = localCodes(fx.validate());
      assert.deepEqual(rest, []);
      assert.equal(entry.code, "config-local-unreadable");
      assert.equal(entry.severity, "error");
      assert.equal(entry.file, fx.localPath);
      assert.ok(entry.message.includes(fx.localPath), entry.message);
      // The load degrades, as it does for a torn project file, but says so: the fault names the file.
      const workspace = await fx.load();
      assert.equal(workspace.configFault?.code, "config-local-unreadable");
      assert.equal(workspace.configFault?.path, fx.localPath);
      assert.ok(fx.cli("project", "show").stdout.includes(`local: ${fx.localPath} — unreadable`), "inspection says the file is unreadable, not that it overrides nothing");
    })),

    // ── 01 · the local file holds only per-person keys ──
    t("01 E6 · an allow-listed key is honoured", () => withLocal({ local: at("work.operator", { role: "Product owner" }) }, async (fx) => {
      const report = fx.validate();
      assert.deepEqual(localCodes(report), [], report.stdout);
      assert.equal((await fx.resolved()).role, "Product owner");
    })),
    t("01 E7 · a team key is refused, and the refusal says where it belongs", () => withLocal({
      project: at("work.intake", "backlog"),
      local: at("work.intake", "stream"),
    }, async (fx) => {
      const [entry, ...rest] = localCodes(fx.validate());
      assert.deepEqual(rest, []);
      assert.deepEqual([entry.code, entry.path, entry.severity], ["config-local-key-not-allowed", "work.intake", "error"]);
      assert.ok(entry.message.includes(".aof/aof.config.json"), entry.message);
      assert.equal((await fx.load()).config.work.intake, "backlog");
    })),
    t("01 E8 · a practice key is refused, so no render or gate differs between teammates", () => withLocal({ repo: true }, async (fx) => {
      const refine = path.join(fx.project, ".claude", "commands", "aof", "refine.md");
      assert.equal(fx.cli("work", "update", "--json").status, 0);
      const without = await readFile(refine, "utf8");
      await writeFile(fx.localPath, `${JSON.stringify(at("work.examples.enabled", true))}\n`, "utf8");
      const [entry, ...rest] = localCodes(fx.validate());
      assert.deepEqual(rest, []);
      assert.deepEqual([entry.code, entry.path], ["config-local-key-not-allowed", "work.examples.enabled"]);
      const updated = fx.cli("work", "update", "--json");
      assert.equal(updated.status, 0, updated.stderr);
      assert.equal(await readFile(refine, "utf8"), without, "the rendered refine command is byte-for-byte the one rendered with no local file");
      assert.equal(examplesEnabledFromConfig((await fx.load()).config), false, "the discovery gate resolves off");
    })),
    t("01 the allow-list, at its edges", async () => {
      const rows = [
        ["work.operator.expertise", { mesh: "expert" }, null],
        ["work.notify.channels", { discord: { channel: "42" } }, null],
        ["work.agents.session.effort", { build: "high" }, null],
        ["work.notify.webhook", "https://example.test", ["config-local-key-not-allowed", "work.notify.webhook"]],
        ["work.agents.session.models", { build: "opus" }, ["config-local-key-not-allowed", "work.agents.session.models.build"]],
        ["work.agents.mode", "orchestrated", ["config-local-key-not-allowed", "work.agents.mode"]],
        ["mesh.address", "127.0.0.1", ["config-local-key-not-allowed", "mesh.address"]],
        ["work.operator.expertise.mesh", "guru", ["operator-profile-bad-value", "work.operator.expertise.mesh"]],
      ];
      for (const [key, value, expected] of rows) {
        await withLocal({ local: at(key, value) }, async (fx) => {
          const report = fx.validate();
          const local = (report.json?.diagnostics ?? []).filter((entry) => entry.layer === "local");
          if (expected == null) {
            assert.deepEqual(localCodes(report), [], `${key}: ${report.stdout}`);
          } else {
            // A refusal names the leaf that was written (199 F-01): `work.agents.session.models.build`, never its object.
            const [code, keyPath] = expected;
            assert.equal(local.length, 1, `${key}: ${report.stdout}`);
            assert.equal(local[0].code, code, `${key}: ${report.stdout}`);
            assert.equal(local[0].path, keyPath, `${key}: reported at ${local[0].path}`);
            assert.ok(local.every((entry) => entry.file === fx.localPath), `${key}: each diagnostic names the local file`);
          }
        });
      }
    }),
    t("01 a refused key never reaches the loaded config", () => withLocal({
      project: at("mesh.address", "127.0.0.1"),
      local: at("mesh.address", "10.0.0.9"),
    }, async (fx) => {
      assert.equal((await fx.load()).config.mesh.address, "127.0.0.1");
    })),

    // ── 02 · the local file is never committed ──
    t("02 E9 · init and update add the ignore entry when it is missing", async () => {
      // An ignore file from before 199: an operator's own line and two of aof's derived entries.
      const before = ["/work/", "aof.memory.index.json", "notion.work-map.json"];
      for (const command of [["work", "init"], ["work", "update"]]) {
        await withLocal({ repo: command[1] === "update" }, async (fx) => {
          await writeFile(path.join(fx.project, ".aof", ".gitignore"), `${before.join("\n")}\n`, "utf8");
          const ran = fx.cli(...command, "--json");
          assert.equal(ran.status, 0, ran.stderr || ran.stdout);
          const after = await fx.ignoreLines();
          assert.equal(after.filter((line) => line.trim() === "aof.config.local.json").length, 1, command.join(" "));
          assert.deepEqual(after.slice(0, before.length), before, `${command.join(" ")}: every line it held before is still there, in order`);
        });
      }
    }),
    t("02 the entry is not added twice", () => withLocal({ repo: true }, async (fx) => {
      assert.equal(fx.cli("work", "update", "--json").status, 0);
      assert.equal(fx.cli("work", "update", "--json").status, 0);
      assert.equal((await fx.ignoreLines()).filter((line) => line.trim() === "aof.config.local.json").length, 1);
    })),
    t("02 E10 · a tracked local file is reported with its fix", () => withLocal({ repo: true, local: at("work.operator.role", "Sam") }, async (fx) => {
      const added = fx.git("add", "-f", ".aof/aof.config.local.json");
      assert.equal(added.status, 0, added.stderr);
      const doctor = fx.cli("work", "doctor", "--json");
      const findings = (doctor.json?.findings ?? []).filter((finding) => finding.code === "config-local-tracked");
      assert.equal(findings.length, 1, doctor.stdout || doctor.stderr);
      assert.equal(findings[0].severity, "warn");
      assert.ok(findings[0].message.includes(".aof/aof.config.local.json"), findings[0].message);
      assert.ok(findings[0].message.includes("git rm --cached .aof/aof.config.local.json"), findings[0].message);
    })),
    t("02 an ignored local file raises nothing", () => withLocal({ repo: true, local: at("work.operator.role", "Sam") }, async (fx) => {
      assert.equal(fx.git("check-ignore", "-q", ".aof/aof.config.local.json").status, 0, "the file is ignored");
      const doctor = fx.cli("work", "doctor", "--json");
      assert.ok(doctor.json != null, doctor.stdout || doctor.stderr);
      assert.deepEqual((doctor.json.findings ?? []).filter((finding) => finding.code === "config-local-tracked"), []);
    })),

    // ── 03 · init-config writes the operator profile to the local file by default ──
    t("03 E11 · the profile goes to a new local file, and the project file is untouched", () => withLocal({ repo: true }, async (fx) => {
      const before = await readFile(fx.configPath);
      const ran = fx.cli("work", "init-config", "--operator-role", "Product owner", "--json");
      assert.equal(ran.status, 0, ran.stderr || ran.stdout);
      assert.equal((await fx.read(fx.localPath)).work.operator.role, "Product owner");
      assert.deepEqual(await readFile(fx.configPath), before, "the project file is byte-for-byte unchanged");
      assert.equal(ran.json.profileWritten, "local");
      assert.equal(ran.json.localConfigPath, ".aof/aof.config.local.json");
      assert.ok(fx.cli("work", "init-config", "--operator-role", "Product owner").stdout.includes(".aof/aof.config.local.json"), "the human output names the local file");
    })),
    t("03 E12 · --project writes it to the committed file", () => withLocal({ repo: true }, async (fx) => {
      const ran = fx.cli("work", "init-config", "--project", "--operator-role", "Product owner", "--json");
      assert.equal(ran.status, 0, ran.stderr || ran.stdout);
      assert.equal((await fx.read(fx.configPath)).work.operator.role, "Product owner");
      await assert.rejects(readFile(fx.localPath), "no local file has been created");
      assert.equal(ran.json.profileWritten, "project");
    })),
    t("03 E13 · a profile already committed is still read, beneath the local one", () => withLocal({
      repo: true,
      project: at("work.operator", { role: "Solo dev", expertise: { mesh: "expert" } }),
    }, async (fx) => {
      const profile = await fx.resolved();
      assert.equal(profile.role, "Solo dev");
      assert.equal(operatorLevel(profile, "mesh"), "expert");
    })),
    t("03 profile flags land in the local file, and other settings do not", async () => {
      const rows = [
        [["--expertise", "ui=new"], async (fx) => {
          const local = await fx.read(fx.localPath);
          assert.equal(local.work.operator.expertise.ui, "new");
          assert.equal(local.work.operator.role, "Old");
        }],
        [["--operator-role", "New"], async (fx) => assert.equal((await fx.read(fx.localPath)).work.operator.role, "New")],
        [["--operator-aware", "on"], async (fx, before) => {
          assert.equal((await fx.read(fx.configPath)).work.examples.operatorAware, true);
          assert.equal(await readFile(fx.localPath, "utf8"), before.local);
        }],
        [["--global", "--operator-role", "G"], async (fx, before) => {
          assert.equal((await fx.read(fx.globalPath)).work.operator.role, "G");
          assert.equal(await readFile(fx.configPath, "utf8"), before.project);
          assert.equal(await readFile(fx.localPath, "utf8"), before.local);
        }],
        [["--project", "--global", "--operator-role", "X"], async (fx, before, ran) => {
          assert.notEqual(ran.status, 0);
          assert.ok(`${ran.stdout}${ran.stderr}`.includes("--project") && `${ran.stdout}${ran.stderr}`.includes("--global"), ran.stdout + ran.stderr);
          assert.equal(await readFile(fx.configPath, "utf8"), before.project);
          assert.equal(await readFile(fx.localPath, "utf8"), before.local);
          await assert.rejects(readFile(fx.globalPath), "nothing changed in the global home");
        }],
      ];
      for (const [flags, check] of rows) {
        await withLocal({ repo: true, project: at("work.examples.enabled", true), local: at("work.operator.role", "Old") }, async (fx) => {
          const before = { project: await readFile(fx.configPath, "utf8"), local: await readFile(fx.localPath, "utf8") };
          const ran = fx.cli("work", "init-config", ...flags, "--json");
          if (!flags.includes("--project")) assert.equal(ran.status, 0, `${flags.join(" ")}: ${ran.stderr || ran.stdout}`);
          await check(fx, before, ran);
        });
      }
    }),
    t("03 the local file it writes is kept out of git", () => withLocal({ repo: true }, async (fx) => {
      const ignorePath = path.join(fx.project, ".aof", ".gitignore");
      await writeFile(ignorePath, (await fx.ignoreLines()).filter((line) => line.trim() !== "aof.config.local.json").join("\n"), "utf8");
      const ran = fx.cli("work", "init-config", "--operator-role", "Product owner", "--json");
      assert.equal(ran.status, 0, ran.stderr || ran.stdout);
      assert.ok((await fx.ignoreLines()).includes("aof.config.local.json"));
      const status = fx.git("status", "--porcelain", "--untracked-files=all");
      assert.ok(!status.stdout.includes("aof.config.local.json"), status.stdout);
    })),

    // ── 04 · the runtime audit covers every child process 199 touched (@bug, F-03) ──
    // The real tree and the real audit, read through the boundary detector `core-workspace` runs, so
    // these cases stay green or red on 199's own files whatever another package's entries do.
    t("04 the boundary detector names no file 199 touched", async () => {
      const { report } = await runtimeAudit();
      const named = report.findings.filter((finding) => AUDITED_199.some((file) => finding.includes(file)));
      assert.deepEqual(named, []);
    }),
    t("04 the doctor's tracked-file probe is audited with its reason", async () => {
      const { audit } = await runtimeAudit();
      const [entry, ...more] = audit.filter((row) => row.file === AUDITED_199[1] && row.kind === "child-process");
      assert.deepEqual(more, []);
      assert.ok(entry?.expression.includes('"ls-files", "--error-unmatch"'), entry?.expression);
      for (const words of ["command edge", "only when that file exists", "constructs no application module"]) {
        assert.ok(entry.reason.includes(words), `the reason says "${words}": ${entry.reason}`);
      }
    }),
    t("04 config-inspect's audited calls are re-stamped, their reasons naming 199", async () => {
      const { audit, report } = await runtimeAudit();
      const rows = audit.filter((row) => row.file === AUDITED_199[0] && row.kind === "child-process");
      assert.equal(rows.length, 3, rows.map((row) => row.expression).join("\n"));
      const live = new Set(report.runtime.filter((row) => row.file === AUDITED_199[0]).map((row) => `${row.digest}:${row.sourceDigest}`));
      for (const row of rows) {
        assert.ok(live.has(`${row.digest}:${row.sourceDigest}`), `matches the file as it now stands: ${row.expression}`);
        assert.ok(row.reason.includes("199") && row.reason.includes("this call and its argv are unchanged"), row.reason);
      }
    }),
  ];
}

const AUDITED_199 = [
  "packages/core/src/application/bindings/config-inspect.mjs",
  "packages/core/src/application/bindings/work/doctor.mjs",
];

async function runtimeAudit() {
  const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const { inspectBoundaries } = await import("../../scripts/workspace-boundaries.mjs");
  const audit = JSON.parse(await readFile(path.join(repoRoot, "scripts", "workspace-runtime-audit.json"), "utf8"));
  return { audit, report: inspectBoundaries(repoRoot, { runtimeAudit: audit }) };
}
