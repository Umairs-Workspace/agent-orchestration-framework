import { assets } from "./support/assets-services.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
const capabilitiesPayload = assets.configEditor.capabilitiesPayload;
const loadEditableConfig = assets.configEditor.loadEditableConfig;
const saveEditableResource = assets.configEditor.saveEditableResource;
const saveEditableSections = assets.configEditor.saveEditableSections;
const validateEditableResource = assets.configEditor.validateEditableResource;

export const configEditorTests = [
  { name: "156 — phase assistant settings roundtrip without replacing unrelated loop settings", run: async () => withExecutionProject(async ({ root, configPath, options }) => {
    const edit = { runtime: "claude", phaseRuntimes: { refine: "codex", continue: "claude", verify: "claude" }, runtimes: { codex: { session: { models: { refine: "gpt-6-astra" }, effort: { refine: "high" } } }, claude: { session: { models: { continue: "sonnet", verify: "sonnet" } } } } };
    const result = await saveEditableSections(root, { executionSettings: edit }, options);
    assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
    const loaded = await loadEditableConfig(root, options);
    assert.deepEqual(loaded.executionSettings, edit);
    assert.equal(loaded.execution.runtime, "mixed");
    assert.equal(loaded.execution.phases.refine.runtime, "codex");
    assert.equal(loaded.execution.phases.continue.model, "sonnet");
    assert.equal(JSON.parse(await readFile(configPath, "utf8")).work.loop.reviewRounds, 2);
    const before = await readFile(configPath, "utf8");
    assert.equal((await saveEditableSections(root, { executionSettings: { phaseRuntimes: { refine: "unknown" } } }, options)).ok, false);
    assert.equal(await readFile(configPath, "utf8"), before);
  }) },
  { name: "154/10 task00 E1 — installed assets remain separate from the inherited Claude execution and provenance", run: executionDefaults },
  { name: "154/10 task00 E2 — execution roundtrip preserves memory, assets, overrides and legacy Claude without processes", run: executionRoundtrip },
  ...[
    ["unknown execution runtime", { runtime: "other" }, "work.loop.runtime"],
    ["malformed phase settings", { runtimes: { codex: { session: { models: [] } } } }, "work.agents.runtimes.codex.session.models"],
    ["unsupported effort for the selected model", { runtime: "codex", runtimes: { codex: { session: { models: { continue: "fixture" }, effort: { continue: "low" } } } } }, "work.agents.runtimes.codex.session.effort.continue"],
    ["invalid runtime-scoped model map", { runtimes: { codex: { models: [] } } }, "work.agents.runtimes.codex.models"],
  ].map(([name, edit, field]) => ({ name: `154/10 task00 invalid edit — ${name} leaves persisted bytes unchanged`, run: () => invalidExecutionEdit(edit, field) })),
  { name: "154/10 execution settings refuse global scope and do not create a global execution config", run: globalExecutionRefusal },
  {
    name: "exposes central capability payload",
    run: exposesCapabilities
  },
  {
    name: "saves file-backed asset and runtime body override",
    run: savesAssetAndOverride
  },
  {
    name: "loads editable config with resolved body",
    run: loadsEditableConfig
  },
  {
    name: "saves command files under asset files folder",
    run: savesCommandFilesUnderAssetFilesFolder
  },
  {
    name: "loads and saves expanded editable sections",
    run: loadsAndSavesExpandedSections
  },
  {
    name: "saves workflow backed editable resources",
    run: savesWorkflowBackedEditableResources
  },
  {
    name: "editable config includes adapter warnings",
    run: includesAdapterWarnings
  },
  {
    name: "rejects invalid editable resource saves",
    run: rejectsInvalidSave
  },
  {
    name: "supported config edits preserve the complete work subtree",
    run: preservesWorkConfig
  }
];

async function withExecutionProject(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-execution-editor-"));
  const configPath = path.join(root, ".aof", "aof.config.json");
  const config = {
    name: "execution-editor", resources: [{ kind: "skill", id: "context", body: "Keep context", runtimes: ["claude", "codex"] }], packages: [],
    memory: { backend: "local" }, runtimes: { codex: { config: { model: "asset-model" } } },
    settings: { claude: { permissions: { allow: ["Read"] } } },
    work: { dir: "./delivery", loop: { reviewRounds: 2 }, agents: { mode: "solo", session: { models: { continue: "legacy-claude" }, effort: { continue: "high" } }, runtimes: { claude: { models: { "aof-architect": "claude-role" } } } } },
  };
  const options = { env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, "global") } };
  try {
    await mkdir(path.dirname(configPath));
    await writeFile(configPath, JSON.stringify(config));
    await writeFile(path.join(root, ".aof", "aof.lock.json"), JSON.stringify({ version: 2, runtimes: ["claude"], work: { runtimes: ["codex"] } }));
    await run({ root, config, configPath, options });
  } finally { assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)); await rm(root, { recursive: true, force: true }); }
}

async function executionDefaults() {
  await withExecutionProject(async ({ root, configPath, options }) => {
    const original = await readFile(configPath, "utf8");
    const payload = await loadEditableConfig(root, options);
    assert.equal(payload.execution.runtime, "claude");
    assert.equal(payload.execution.runtimeSource, "default");
    assert.deepEqual(payload.assetRuntimes, ["claude", "codex"]);
    assert.equal(payload.execution.phases.continue.modelSource, "work.agents.session.models.continue");
    assert.equal(payload.execution.roles["aof-architect"].modelSource, "work.agents.runtimes.claude.models.aof-architect");
    assert.equal(payload.executionSettings.runtime, null);
    assert.equal(payload.executionByRuntime.codex.execution.phases.continue.model, null);
    assert.equal(payload.executionByRuntime.codex.execution.unproven, true);
    assert.equal(await readFile(configPath, "utf8"), original);
  });
}

async function executionRoundtrip() {
  await withExecutionProject(async ({ root, config, configPath, options }) => {
    const originals = Object.fromEntries(["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync"].map(key => [key, childProcess[key]]));
    const calls = [];
    for (const key of Object.keys(originals)) childProcess[key] = (...args) => { calls.push([key, args[0]]); throw new Error("Configuration editing must not launch a process"); };
    syncBuiltinESMExports();
    try {
      const edit = { runtime: "codex", runtimes: { ...config.work.agents.runtimes, codex: { session: { models: { continue: "codex-model" }, effort: { continue: "high" } }, models: { "aof-architect": "codex-role" } } } };
      const result = await saveEditableSections(root, { executionSettings: edit }, options);
      assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
      const saved = JSON.parse(await readFile(configPath, "utf8"));
      for (const key of ["memory", "resources", "runtimes", "settings"]) assert.deepEqual(saved[key], config[key], key);
      assert.deepEqual(saved.work.agents.session, config.work.agents.session);
      assert.deepEqual(saved.work.agents.runtimes.claude, config.work.agents.runtimes.claude);
      assert.equal(saved.work.dir, config.work.dir);
      assert.equal(saved.work.loop.reviewRounds, 2);
      assert.equal(saved.work.agents.mode, "solo");
      const loaded = await loadEditableConfig(root, options);
      assert.deepEqual(loaded.executionSettings, edit);
      assert.equal(loaded.execution.runtime, "codex");
      assert.equal(loaded.execution.runtimeSource, "project");
      assert.equal(loaded.execution.phases.continue.model, "codex-model");
      assert.equal(loaded.execution.phases.continue.modelSource, "work.agents.runtimes.codex.session.models.continue");
      assert.equal(loaded.execution.roles["aof-architect"].model, "codex-role");
      assert.deepEqual(calls, []);
      assert.deepEqual((await readdir(root)).sort(), [".aof"]);
      assert.equal((await saveEditableSections(root, { executionSettings: { runtime: null } }, options)).ok, true);
      assert.equal((await loadEditableConfig(root, options)).execution.runtimeSource, "default");
      assert.equal((await saveEditableSections(root, { settings: config.settings }, options)).ok, true);
      assert.deepEqual(JSON.parse(await readFile(configPath, "utf8")).memory, config.memory);
    } finally { Object.assign(childProcess, originals); syncBuiltinESMExports(); }
  });
}

async function invalidExecutionEdit(edit, field) {
  await withExecutionProject(async ({ root, configPath, options }) => {
    const original = await readFile(configPath, "utf8");
    const capabilities = { codex: { models: [{ id: "fixture", model: "fixture", isDefault: true, supportedReasoningEfforts: ["high"] }] } };
    const result = await saveEditableSections(root, { executionSettings: edit }, { ...options, capabilities });
    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some(value => value.path === field && value.message), JSON.stringify(result.diagnostics));
    assert.equal(await readFile(configPath, "utf8"), original);
  });
}

async function globalExecutionRefusal() {
  await withExecutionProject(async ({ root, configPath, options }) => {
    const original = await readFile(configPath, "utf8");
    const result = await saveEditableSections(root, { executionSettings: { runtime: "codex" } }, { ...options, scope: "global" });
    assert.equal(result.ok, false);
    assert.equal(result.diagnostics[0].path, "scope");
    assert.equal(await readFile(configPath, "utf8"), original);
  });
}

function exposesCapabilities() {
  const payload = capabilitiesPayload();
  assert.equal(payload.runtimes.claude.name, "Claude Code");
  assert.equal(payload.resourceKinds.rule.defaultBodyFile, "RULE.md");
  assert.equal(payload.capabilities.command.codex, "unsupported-fail");
  assert.equal(payload.capabilities.rule.codex, "mapped");
}

async function savesAssetAndOverride() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const result = await saveEditableResource(targetDir, {
      kind: "rule",
      id: "project-rule",
      description: "Shared guidance",
      body: "Shared body",
      paths: ["src"],
      runtimes: ["claude", "codex"],
      overrides: {
        codex: {
          enabled: true,
          body: "Codex body"
        },
        claude: {
          enabled: false,
          body: "Ignored"
        }
      }
    });

    assert.equal(result.ok, true);
    const config = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.config.json"), "utf8"));
    assert.equal(config.resources[0].kind, "rule");
    assert.equal(config.resources[0].path, "assets/rules/project-rule/RULE.md");
    assert.equal(config.resources[0].overrides.codex, "assets/rules/project-rule/overrides/codex.json");
    assert.equal(config.resources[0].overrides.claude, undefined);
    assert.equal(await readFile(path.join(targetDir, ".aof", "assets", "rules", "project-rule", "RULE.md"), "utf8"), "Shared body\n");
    const override = JSON.parse(await readFile(path.join(targetDir, ".aof", "assets", "rules", "project-rule", "overrides", "codex.json"), "utf8"));
    assert.equal(override.body, "Codex body");
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function loadsEditableConfig() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    await mkdir(path.join(targetDir, ".aof", "assets", "commands", "prime"), { recursive: true });
    await import("node:fs/promises").then(({ writeFile }) => Promise.all([
      writeFile(path.join(targetDir, ".aof", "assets", "commands", "prime", "COMMAND.md"), "Prime body\n", "utf8"),
      writeFile(path.join(targetDir, ".aof", "aof.config.json"), `${JSON.stringify({
        name: "demo",
        resources: [
          { kind: "command", id: "prime", path: "assets/commands/prime/COMMAND.md", runtimes: ["claude"] }
        ],
        packages: [{ id: "gsd", namespace: "gsd", source: "npm:get-shit-done-cc@latest", runtimes: ["codex"] }]
      }, null, 2)}\n`, "utf8")
    ]));

    const payload = await loadEditableConfig(targetDir);
    assert.equal(payload.resources[0].body, "Prime body\n");
    assert.deepEqual(payload.adapterWarnings, []);
    assert.deepEqual(payload.nextCommands, ["aof assets apply --dry-run", "aof packages install gsd --dry-run"]);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function savesCommandFilesUnderAssetFilesFolder() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const result = await saveEditableResource(targetDir, {
      kind: "command",
      id: "prime",
      body: "Run the helper.",
      runtimes: ["claude"],
      files: [
        { name: "helper.py", body: "print('prime')\n" }
      ],
      overrides: {}
    });

    assert.equal(result.ok, true);
    const config = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.config.json"), "utf8"));
    assert.deepEqual(config.resources[0].files, ["helper.py"]);
    assert.equal(await readFile(path.join(targetDir, ".aof", "assets", "commands", "prime", "files", "helper.py"), "utf8"), "print('prime')\n");
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function includesAdapterWarnings() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const save = await saveEditableSections(targetDir, {
      hooks: [
        { id: "notify", event: "PostToolUse", command: "npm test", timeout: 30, runtimes: ["codex"] }
      ]
    });
    assert.equal(save.ok, true);
    assert.equal(save.config.adapterWarnings.length, 1);
    assert.equal(save.config.adapterWarnings[0].code, "adapter.skipped-runtime-output");

    const payload = await loadEditableConfig(targetDir);
    assert.equal(payload.adapterWarnings.length, 1);
    assert.equal(payload.adapterWarnings[0].path, "hooks[0]");
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function rejectsInvalidSave() {
  const diagnostics = validateEditableResource({
    kind: "skill",
    id: "bad",
    runtimes: ["unknown"]
  });
  assert.ok(diagnostics.some((item) => item.blocking && item.path === "runtimes"));

  const commandDiagnostics = validateEditableResource({
    kind: "command",
    id: "bad-command",
    runtimes: ["codex"]
  });
  assert.ok(commandDiagnostics.some((item) => item.blocking && item.path === "capabilities.command.codex"));

  const argsDiagnostics = validateEditableResource({
    kind: "skill",
    id: "arg-skill",
    runtimes: ["codex"],
    body: "Use {{GSD_ARGS}} here."
  });
  assert.ok(argsDiagnostics.some((item) => item.blocking && item.code === "simple-asset-arguments"));

  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const result = await saveEditableResource(targetDir, { kind: "skill", id: "bad", runtimes: [] });
    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((item) => item.blocking));
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function loadsAndSavesExpandedSections() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const save = await saveEditableSections(targetDir, {
      mcpServers: [
        { id: "docs", transport: "http", url: "https://example.test/mcp", runtimes: ["codex"] }
      ],
      hooks: [
        { id: "test-after-write", event: "PostToolUse", command: "npm test", runtimes: ["codex"] }
      ],
      projectDocs: [
        { id: "root", body: "Guidance", targets: ["AGENTS.md"], runtimes: ["codex"] }
      ],
      workflows: [
        { id: "audit", body: "Audit workflow", runtimes: ["codex"] }
      ],
      settings: {
        codex: { approval_policy: "on-request" }
      }
    });

    assert.equal(save.ok, true);
    const payload = await loadEditableConfig(targetDir);
    assert.equal(payload.mcpServers[0].id, "docs");
    assert.equal(payload.hooks[0].id, "test-after-write");
    assert.equal(payload.projectDocs[0].body, "Guidance");
    assert.equal(payload.workflows[0].id, "audit");
    assert.equal(payload.settings.codex.approval_policy, "on-request");

    const resourceSave = await saveEditableResource(targetDir, {
      kind: "skill",
      id: "context",
      body: "Body",
      runtimes: ["codex"]
    });
    assert.equal(resourceSave.ok, true);
    const config = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.config.json"), "utf8"));
    assert.equal(config.mcpServers[0].id, "docs");
    assert.equal(config.workflows[0].id, "audit");

    const invalid = await saveEditableSections(targetDir, {
      hooks: [
        { id: "bad", event: "Nope", command: "npm test" }
      ]
    });
    assert.equal(invalid.ok, false);
    assert.ok(invalid.diagnostics.some((item) => item.path === "hooks[0].event"));
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function savesWorkflowBackedEditableResources() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  try {
    const sections = await saveEditableSections(targetDir, {
      workflows: [
        { id: "audit", body: "Audit workflow", runtimes: ["codex"], arguments: [{ name: "milestone" }] }
      ]
    });
    assert.equal(sections.ok, true);

    const save = await saveEditableResource(targetDir, {
      kind: "skill",
      id: "audit",
      description: "Audit wrapper",
      body: "",
      workflow: "audit",
      argumentHint: "<milestone>",
      arguments: [{ name: "milestone", description: "Milestone number", required: true }],
      runtimes: ["codex"],
      overrides: {}
    });
    assert.equal(save.ok, true);

    const config = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.config.json"), "utf8"));
    assert.equal(config.resources[0].workflow, "audit");
    assert.equal(config.resources[0].argumentHint, "<milestone>");
    assert.equal(config.resources[0].path, undefined);
    assert.equal(config.resources[0].arguments[0].name, "milestone");

    const payload = await loadEditableConfig(targetDir);
    assert.equal(payload.resources[0].workflow, "audit");
    assert.equal(payload.resources[0].arguments[0].required, true);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function preservesWorkConfig() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const expectedWork = {
    dir: "./delivery",
    autonomous: { maxAttempts: 3 },
    loop: { reviewRounds: 2, buildNoProgressRounds: 4 },
  };
  try {
    await mkdir(path.join(targetDir, ".aof"), { recursive: true });
    await writeFile(path.join(targetDir, ".aof", "aof.config.json"), `${JSON.stringify({
      name: "preserve-work",
      resources: [],
      packages: [],
      work: expectedWork,
    }, null, 2)}\n`);

    const sections = await saveEditableSections(targetDir, { settings: { model: "test" } });
    assert.equal(sections.ok, true);
    let config = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.config.json"), "utf8"));
    assert.deepEqual(config.work, expectedWork);

    const resource = await saveEditableResource(targetDir, {
      kind: "skill",
      id: "preserve-work",
      body: "Body",
      runtimes: ["codex"],
    });
    assert.equal(resource.ok, true);
    config = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.config.json"), "utf8"));
    assert.deepEqual(config.work, expectedWork);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}
