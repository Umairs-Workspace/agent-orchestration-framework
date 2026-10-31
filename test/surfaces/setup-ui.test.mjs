import { defaultApplication as _aofApplication } from "aof/default-application";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { withMountedApp, findAll, textOf } from "../../apps/ui/test/support/react-app-harness.mjs";
const serveSetupUi = _aofApplication.server.setupUi.serveSetupUi;

export const setupUiTests = [
  { name: "154/10 task01 mounted loading and legacy empty settings retain inherited sources", run: mountedExecutionLoading },
  { name: "154/10 task00 E2 + task01 populated scoped form saves, reloads and preserves both providers", run: mountedExecutionRoundtrip },
  { name: "154/10 task01 mounted validation errors associate with named fields and retain unsaved input", run: mountedExecutionValidation },
  { name: "154/10 task01 mounted load failure retries without a stale save", run: mountedExecutionLoadFailure },
  { name: "154/10 task01 older asset-only payload degrades to a retryable execution load error", run: mountedExecutionOldPayload },
  { name: "154/10 task01 asset-only save success is refused without discarding unsaved execution edits", run: mountedExecutionOldSavePayload },
  { name: "154/10 task01 mounted save failure retains edits and retries through the real API", run: mountedExecutionSaveFailure },
  { name: "154/10 task01 global scope explains project-only execution and sends no mutation", run: mountedGlobalExecution },
  {
    name: "setup UI exposes capabilities and saves config resources",
    run: savesConfigResourceThroughApi
  },
  {
    name: "setup UI rejects malformed JSON and route mismatches",
    run: rejectsMalformedJsonAndRouteMismatch
  },
  {
    name: "setup UI saves and validates expanded config sections",
    run: savesAndValidatesExpandedSections
  },
  {
    name: "setup UI saves workflow backed resources",
    run: savesWorkflowBackedResources
  },
  {
    name: "setup UI saves global resources and associated files",
    run: savesGlobalResourcesAndAssociatedFiles
  },
  {
    name: "setup UI manages project global references",
    run: managesProjectGlobalReferences
  },
  {
    name: "setup UI serves adapter warning review payload",
    run: servesAdapterWarningPayload
  },
  {
    name: "setup UI hardens catalog endpoint validation",
    run: hardensCatalogEndpointValidation
  },
  {
    name: "setup UI rejects oversized request bodies",
    run: rejectsOversizedBodies
  },
  {
    name: "setup UI keeps static paths inside ui root",
    run: keepsStaticPathsInsideUiRoot
  },
  // 180/03 — the config editor's Memory section (see `memorySectionTests`).
  ...memorySectionTests(),
];

const runtimeEntry = path.resolve("apps/ui/src/config/RuntimeSettings.tsx");
const inputById = (app, id) => findAll(app.tree(), node => node.props?.id === id)[0];
const runtimeForm = app => findAll(app.tree(), node => node.type === "form")[0];
const editRuntime = async (app, value) => { inputById(app, "execution-runtime").props.onChange({ target: { value } }); await app.flush(); };
const editContinue = async (app, runtime, part, value) => { inputById(app, `execution-${runtime}-phase-${part}-continue`).props.onChange({ target: { value } }); await app.flush(); };
const submitRuntime = async app => { await runtimeForm(app).props.onSubmit({ preventDefault() {} }); await app.flush(); };

async function withRuntimeApi(run, { legacy = false, failure = null } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-runtime-form-"));
  const configPath = path.join(root, ".aof", "aof.config.json");
  const config = { name: "runtime-form", resources: [], packages: [], memory: { backend: "local" },
    work: { agents: { session: { models: { continue: "opus" } }, ...(legacy ? {} : { runtimes: { codex: { session: { models: { continue: "saved-codex" }, effort: { continue: "high" } } }, claude: { session: { models: { continue: "saved-claude" } } } } }) } } };
  await mkdir(path.dirname(configPath));
  await writeFile(configPath, JSON.stringify(config));
  const { server, url } = await serveSetupUi({ listItems: () => [], upsertItem: () => {} }, { port: 0, projectDir: root, env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, "global") } });
  const originalFetch = globalThis.fetch;
  let failed = false;
  if (failure) globalThis.fetch = async (input, init) => {
    if (!failed && String(input).includes(failure === "save" || failure === "old-save-api" ? "/api/config/sections" : "/api/config/project")) {
      failed = true;
      const oldConfig = { resources: [], diagnostics: [] };
      const body = failure === "old-api" ? oldConfig : failure === "old-save-api" ? { ok: true, config: oldConfig } : { ok: false, error: "Fixture request unavailable" };
      return new Response(JSON.stringify(body), { status: failure.startsWith("old-") ? 200 : 503, headers: { "content-type": "application/json" } });
    }
    return originalFetch(input, init);
  };
  try { await run({ root, configPath, config, url }); }
  finally { globalThis.fetch = originalFetch; server.close(); assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)); await rm(root, { recursive: true, force: true }); }
}

async function mountedExecutionLoading() {
  await withRuntimeApi(async ({ url }) => {
    await withMountedApp({ entry: runtimeEntry, exportName: "RuntimeSettings", url, settle: "render", holdFromStart: "/api/config/project" }, async app => {
      assert.match(textOf(app.tree()), /Loading project execution settings/);
      assert.equal(findAll(app.tree(), node => node.type === "form").length, 0);
      app.startHolds()[0].release(); await app.flush();
      // 156: a legacy session model is a Claude alias, so every phase infers Claude Code; the phase
      // field reads the shared `work.agents.session` value and its source names that key.
      assert.match(textOf(app.tree()), /Primary execution assistant: Claude Code/);
      assert.match(textOf(app.tree()), /work.agents.session.models.continue/);
      assert.equal(inputById(app, "execution-runtime").props.value, "");
      assert.equal(inputById(app, "execution-claude-phase-models-continue").props.value, "opus");
    });
  }, { legacy: true });
}

async function mountedExecutionRoundtrip() {
  await withRuntimeApi(async ({ url, configPath, config }) => {
    // 156: phase models and efforts are one shared map (`work.agents.session`) and the assistant is
    // inferred from each model, so the form has no per-assistant phase fields. Both providers' saved
    // scoped settings are preserved untouched by a phase edit.
    await withMountedApp({ entry: runtimeEntry, exportName: "RuntimeSettings", url }, async app => {
      assert.equal(inputById(app, "execution-claude-phase-models-continue").props.value, "opus");
      await editContinue(app, "claude", "models", "gpt-5-codex");
      await submitRuntime(app);
      assert.match(textOf(app.tree()), /Saved execution settings/);
      assert.match(textOf(app.tree()), /continue · Codex/);
      const saved = JSON.parse(await readFile(configPath, "utf8"));
      assert.deepEqual(saved.memory, config.memory);
      assert.equal(saved.work.agents.session.models.continue, "gpt-5-codex");
      assert.deepEqual(saved.work.agents.runtimes, config.work.agents.runtimes);
      assert.deepEqual(app.requests().map(value => new URL(value.url).pathname), ["/api/config/project", "/api/config/sections"]);
    });
    await withMountedApp({ entry: runtimeEntry, exportName: "RuntimeSettings", url }, async app => {
      assert.equal(inputById(app, "execution-claude-phase-models-continue").props.value, "gpt-5-codex");
      assert.match(textOf(app.tree()), /work.agents.session.models.continue/);
      await editContinue(app, "claude", "models", "");
      await submitRuntime(app);
      const saved = JSON.parse(await readFile(configPath, "utf8"));
      assert.equal(saved.work.agents.session?.models?.continue, undefined);
      assert.deepEqual(saved.work.agents.runtimes, config.work.agents.runtimes);
      assert.match(textOf(app.tree()), /Primary execution assistant: Claude Code/);
    });
  });
}

async function mountedExecutionValidation() {
  await withRuntimeApi(async ({ url, configPath }) => {
    const original = await readFile(configPath, "utf8");
    await withMountedApp({ entry: runtimeEntry, exportName: "RuntimeSettings", url }, async app => {
      await editRuntime(app, "claude");
      await editContinue(app, "claude", "effort", "invalid-effort");
      // Native select/input/summary/button elements supply keyboard behaviour. This
      // headless lane measures names, associations and focus tokens, not pixel focus.
      for (const node of findAll(app.tree(), node => ["input", "select", "button", "summary"].includes(node.type))) {
        const labels = node.props?.id ? findAll(app.tree(), value => value.type === "label" && value.props?.htmlFor === node.props.id) : [];
        assert.ok(labels.length || textOf(node).trim(), `accessible name for ${node.type}`);
        assert.match(node.props.className, /focus-visible:ring-2/);
      }
      await submitRuntime(app);
      const field = inputById(app, "execution-claude-phase-effort-continue");
      assert.equal(field.props.value, "invalid-effort");
      assert.equal(field.props["aria-invalid"], true);
      assert.match(textOf(inputById(app, field.props["aria-describedby"])), /must be one of|unsupported effort/);
      assert.equal(await readFile(configPath, "utf8"), original);
      await editContinue(app, "claude", "effort", "high");
      await submitRuntime(app);
      assert.match(textOf(app.tree()), /Saved execution settings/);
    });
  });
}

async function mountedExecutionLoadFailure() {
  await withRuntimeApi(async ({ url }) => {
    await withMountedApp({ entry: runtimeEntry, exportName: "RuntimeSettings", url }, async app => {
      assert.match(textOf(app.tree()), /Fixture request unavailable/);
      assert.equal(findAll(app.tree(), node => node.type === "form").length, 0);
      findAll(app.tree(), node => node.type === "button")[0].props.onClick(); await app.flush();
      assert.ok(runtimeForm(app));
    });
  }, { failure: "load" });
}

async function mountedExecutionOldPayload() {
  await withRuntimeApi(async ({ url }) => {
    await withMountedApp({ entry: runtimeEntry, exportName: "RuntimeSettings", url }, async app => {
      assert.match(textOf(app.tree()), /does not provide execution settings/);
      assert.equal(findAll(app.tree(), node => node.type === "form").length, 0);
      findAll(app.tree(), node => node.type === "button")[0].props.onClick(); await app.flush();
      assert.ok(runtimeForm(app));
    });
  }, { failure: "old-api" });
}

async function mountedExecutionOldSavePayload() {
  await withRuntimeApi(async ({ url, configPath }) => {
    const original = await readFile(configPath, "utf8");
    await withMountedApp({ entry: runtimeEntry, exportName: "RuntimeSettings", url }, async app => {
      await editContinue(app, "claude", "models", "retained-model");
      await submitRuntime(app);
      assert.match(textOf(app.tree()), /Could not save execution settings.*does not provide execution settings/);
      assert.equal(inputById(app, "execution-claude-phase-models-continue").props.value, "retained-model");
      assert.equal(await readFile(configPath, "utf8"), original);
      await submitRuntime(app);
      assert.match(textOf(app.tree()), /Saved execution settings/);
    });
  }, { failure: "old-save-api" });
}

async function mountedExecutionSaveFailure() {
  await withRuntimeApi(async ({ url }) => {
    await withMountedApp({ entry: runtimeEntry, exportName: "RuntimeSettings", url }, async app => {
      await editContinue(app, "claude", "models", "retry-model");
      await submitRuntime(app);
      assert.match(textOf(app.tree()), /Fixture request unavailable/);
      assert.equal(inputById(app, "execution-claude-phase-models-continue").props.value, "retry-model");
      await submitRuntime(app);
      assert.match(textOf(app.tree()), /Saved execution settings/);
      assert.equal(app.requestsMatching("/api/config/sections").length, 2);
    });
  }, { failure: "save" });
}

async function mountedGlobalExecution() {
  await withRuntimeApi(async ({ root, url }) => {
    const entry = path.join(root, "global-runtime-entry.tsx");
    await writeFile(entry, `import { RuntimeSettings } from ${JSON.stringify(runtimeEntry)}; export function GlobalRuntime() { return <RuntimeSettings scope="global" />; }`);
    await withMountedApp({ entry, exportName: "GlobalRuntime", url }, async app => {
      assert.match(textOf(app.tree()), /Execution settings are project-only/);
      assert.equal(findAll(app.tree(), node => node.type === "form").length, 0);
      assert.deepEqual(app.requests(), []);
    });
  });
}

async function savesConfigResourceThroughApi() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const catalog = {
    listItems: () => [],
    upsertItem: () => {}
  };
  const { server, url } = await serveSetupUi(catalog, { port: 0, projectDir: targetDir });
  try {
    const capabilities = await fetchJson(`${url}api/capabilities`);
    assert.equal(capabilities.capabilities.command.codex, "unsupported-fail");
    assert.equal(capabilities.capabilities.rule.codex, "mapped");

    const save = await fetchJson(`${url}api/config/resources/command/prime`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "prime",
        kind: "command",
        description: "Prime repository context",
        body: "Inspect the repository.",
        runtimes: ["claude"],
        overrides: {}
      })
    });
    assert.equal(save.ok, true);

    const config = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.config.json"), "utf8"));
    assert.equal(config.resources[0].kind, "command");
    assert.equal(config.resources[0].path, "assets/commands/prime/COMMAND.md");
  } finally {
    server.close();
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function servesAdapterWarningPayload() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const catalog = {
    listItems: () => [],
    upsertItem: () => {}
  };
  const { server, url } = await serveSetupUi(catalog, { port: 0, projectDir: targetDir });
  try {
    const save = await fetchJson(`${url}api/config/sections`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hooks: [
          { id: "notify", event: "PostToolUse", command: "npm test", timeout: 30, runtimes: ["codex"] }
        ]
      })
    });
    assert.equal(save.config.adapterWarnings.length, 1);
    assert.equal(save.config.adapterWarnings[0].code, "adapter.skipped-runtime-output");

    const payload = await fetchJson(`${url}api/config`);
    assert.equal(payload.adapterWarnings.length, 1);
    assert.equal(payload.adapterWarnings[0].runtime, "codex");
  } finally {
    server.close();
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function rejectsMalformedJsonAndRouteMismatch() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const catalog = {
    listItems: () => [],
    upsertItem: () => {}
  };
  const { server, url } = await serveSetupUi(catalog, { port: 0, projectDir: targetDir });
  try {
    let response = await fetch(`${url}api/config/resources/command/prime`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "{ bad"
    });
    let payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.ok, false);
    assert.equal(payload.code, "malformed-json");

    response = await fetch(`${url}api/config/resources/command/prime`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "other", kind: "command", body: "Body", runtimes: ["codex"] })
    });
    payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.code, "route-payload-mismatch");

    response = await fetch(`${url}api/config/resources/unknown/prime`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "prime", kind: "unknown", body: "Body", runtimes: ["codex"] })
    });
    payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.code, "invalid-kind");
  } finally {
    server.close();
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function savesAndValidatesExpandedSections() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const catalog = {
    listItems: () => [],
    upsertItem: () => {}
  };
  const { server, url } = await serveSetupUi(catalog, { port: 0, projectDir: targetDir });
  try {
    let response = await fetch(`${url}api/config/sections`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings: "bad" })
    });
    let payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.ok, false);
    assert.ok(payload.diagnostics.some((item) => item.path === "settings"));

    response = await fetch(`${url}api/config/sections`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mcpServers: [
          { id: "docs", transport: "http", url: "https://example.test/mcp", runtimes: ["codex"] }
        ],
        hooks: [
          { id: "test-after-write", event: "PostToolUse", command: "npm test", runtimes: ["codex"] }
        ],
        projectDocs: [
          { id: "root", body: "Guidance", targets: ["AGENTS.md"], runtimes: ["codex"] }
        ],
        settings: {
          codex: { approval_policy: "on-request" }
        }
      })
    });
    payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);

    const config = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.config.json"), "utf8"));
    assert.equal(config.mcpServers[0].id, "docs");
    assert.equal(config.settings.codex.approval_policy, "on-request");
  } finally {
    server.close();
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function savesWorkflowBackedResources() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const catalog = {
    listItems: () => [],
    upsertItem: () => {}
  };
  const { server, url } = await serveSetupUi(catalog, { port: 0, projectDir: targetDir });
  try {
    let save = await fetchJson(`${url}api/config/sections`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workflows: [
          { id: "audit", body: "Audit workflow", runtimes: ["codex"], arguments: [{ name: "milestone" }] }
        ]
      })
    });
    assert.equal(save.ok, true);

    save = await fetchJson(`${url}api/config/resources/skill/audit`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "audit",
        kind: "skill",
        description: "Audit wrapper",
        body: "",
        workflow: "audit",
        argumentHint: "<milestone>",
        arguments: [{ name: "milestone", description: "Milestone number", required: true }],
        runtimes: ["codex"],
        overrides: {}
      })
    });
    assert.equal(save.ok, true);
    assert.equal(save.resource.workflow, "audit");

    const config = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.config.json"), "utf8"));
    assert.equal(config.resources[0].workflow, "audit");
    assert.equal(config.resources[0].path, undefined);
    assert.equal(config.resources[0].arguments[0].required, true);
  } finally {
    server.close();
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function savesGlobalResourcesAndAssociatedFiles() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const globalDir = await mkdtemp(path.join(os.tmpdir(), "aof-global-"));
  const catalog = {
    listItems: () => [],
    upsertItem: () => {}
  };
  const { server, url } = await serveSetupUi(catalog, { port: 0, projectDir: targetDir, env: { AOF_GLOBAL_HOME: globalDir } });
  try {
    const emptyGlobal = await fetchJson(`${url}api/config/global`);
    assert.equal(emptyGlobal.scope, "global");
    assert.equal(emptyGlobal.configPath, path.join(globalDir, "aof.config.json"));

    const save = await fetchJson(`${url}api/config/global/resources/skill/research-helper`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "research-helper",
        kind: "skill",
        description: "Research helper",
        body: "Use the helper script.",
        runtimes: ["codex"],
        files: [
          { path: "search.py", body: "print('search')\n" }
        ],
        overrides: {}
      })
    });
    assert.equal(save.ok, true);
    assert.equal(save.config.scope, "global");

    const config = JSON.parse(await readFile(path.join(globalDir, "aof.config.json"), "utf8"));
    assert.equal(config.resources[0].kind, "skill");
    assert.deepEqual(config.resources[0].files, ["search.py"]);
    assert.match(await readFile(path.join(globalDir, "assets", "skills", "research-helper", "files", "search.py"), "utf8"), /print\('search'\)/);

    const unsafeResponse = await fetch(`${url}api/config/global/resources/skill/unsafe`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "unsafe",
        kind: "skill",
        body: "Unsafe",
        runtimes: ["codex"],
        files: [
          { path: "../escape.py", body: "bad" }
        ]
      })
    });
    const unsafe = await unsafeResponse.json();
    assert.equal(unsafeResponse.status, 400);
    assert.ok(unsafe.diagnostics.some((item) => item.code === "associated-file-escape"));

    const commandSave = await fetchJson(`${url}api/config/project/resources/command/prime`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "prime",
        kind: "command",
        body: "Run the helper.",
        runtimes: ["claude"],
        files: [
          { name: "helper.py", body: "print('prime')\n" }
        ],
        overrides: {}
      })
    });
    assert.equal(commandSave.ok, true);
    const projectConfig = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.config.json"), "utf8"));
    assert.deepEqual(projectConfig.resources[0].files, ["helper.py"]);
    assert.match(await readFile(path.join(targetDir, ".aof", "assets", "commands", "prime", "files", "helper.py"), "utf8"), /print\('prime'\)/);
  } finally {
    server.close();
    await rm(targetDir, { recursive: true, force: true });
    await rm(globalDir, { recursive: true, force: true });
  }
}

async function managesProjectGlobalReferences() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const globalDir = await mkdtemp(path.join(os.tmpdir(), "aof-global-"));
  const catalog = {
    listItems: () => [],
    upsertItem: () => {}
  };
  const { server, url } = await serveSetupUi(catalog, { port: 0, projectDir: targetDir, env: { AOF_GLOBAL_HOME: globalDir } });
  try {
    await fetchJson(`${url}api/config/global/resources/skill/shared-review`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "shared-review",
        kind: "skill",
        description: "Shared review",
        body: "Review shared guidance.",
        runtimes: ["codex"],
        overrides: {}
      })
    });

    const add = await fetchJson(`${url}api/config/project/global-refs/skill/shared-review`, { method: "PUT" });
    assert.equal(add.ok, true);
    assert.deepEqual(add.globalRefs, [{ kind: "skill", id: "shared-review" }]);

    const projectConfig = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.config.json"), "utf8"));
    assert.deepEqual(projectConfig.globalRefs, [{ kind: "skill", id: "shared-review" }]);
    await assert.rejects(readFile(path.join(targetDir, ".aof", "assets", "skills", "shared-review", "SKILL.md"), "utf8"));

    const projectPayload = await fetchJson(`${url}api/config/project`);
    assert.equal(projectPayload.referencedResources[0].source, "global");
    assert.equal(projectPayload.referencedResources[0].readOnly, true);

    const globalPayload = await fetchJson(`${url}api/config/global`);
    assert.equal(globalPayload.resources[0].referencedByProject, true);

    const remove = await fetchJson(`${url}api/config/project/global-refs/skill/shared-review`, { method: "DELETE" });
    assert.equal(remove.ok, true);
    assert.deepEqual(remove.globalRefs, []);
  } finally {
    server.close();
    await rm(targetDir, { recursive: true, force: true });
    await rm(globalDir, { recursive: true, force: true });
  }
}

async function hardensCatalogEndpointValidation() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const saved = [];
  const catalog = {
    listItems: () => saved,
    upsertItem: (item) => saved.push(item)
  };
  const { server, url } = await serveSetupUi(catalog, { port: 0, projectDir: targetDir });
  try {
    let response = await fetch(`${url}api/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "x", kind: "command" })
    });
    let payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.code, "validation-failed");
    assert.ok(payload.diagnostics.some((item) => item.path === "kind"));

    response = await fetch(`${url}api/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "helper", kind: "skill", name: "Helper", body: "Body", runtimes: ["codex"] })
    });
    payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(saved[0].id, "helper");
  } finally {
    server.close();
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function rejectsOversizedBodies() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const catalog = {
    listItems: () => [],
    upsertItem: () => {}
  };
  const { server, url } = await serveSetupUi(catalog, { port: 0, projectDir: targetDir });
  try {
    const response = await fetch(`${url}api/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "x", kind: "skill", body: "x".repeat(1_000_001) })
    });
    const payload = await response.json();
    assert.equal(response.status, 413);
    assert.equal(payload.code, "payload-too-large");
  } finally {
    server.close();
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function keepsStaticPathsInsideUiRoot() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-"));
  const catalog = {
    listItems: () => [],
    upsertItem: () => {}
  };
  const { server, url } = await serveSetupUi(catalog, { port: 0, projectDir: targetDir });
  try {
    let response = await fetch(url);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /root/);

    response = await fetch(`${url}%2e%2e%5cpackage.json`);
    assert.equal(response.status, 404);

    response = await fetch(`${url}%E0%A4%A`);
    assert.equal(response.status, 404);

    response = await fetch(`${url}missing-file.js`);
    assert.equal(response.status, 404);
  } finally {
    server.close();
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(payload));
  }
  return payload;
}

// ------------------------------------------------ 180/03: the Memory section ----
//
// THE FIXTURE is the feature's: a temp project under an isolated AOF_GLOBAL_HOME whose config is the
// scenario's, served by the setup UI and mounted in the REAL config App, project scope selected.
// The App's own markup, state and fetches are real. Two leaf families are stubbed, as the board's
// harness stubs them: `lucide-react` (the icons the config sources import, by name) and the six
// `@/components/ui/*` primitives, which need a `forwardRef` the mini React does not have. Each
// primitive becomes the plain host element of the same name and props, so the section's own
// regions, text and handlers are what the tree shows. Declared as a function so the array above
// can spread it before this module's later bindings are initialised.
function memorySectionTests() {
  const configEntry = path.resolve("apps/ui/src/config/App.tsx");
  const UI_PRIMITIVES = { badge: { Badge: "span" }, button: { Button: "button" }, card: { Card: "div", CardContent: "div", CardDescription: "p", CardHeader: "div", CardTitle: "h3" }, input: { Input: "input" }, label: { Label: "label" }, textarea: { Textarea: "textarea" } };
  const t = (task, name, run) => ({ name: `180/03 task ${task}: ${name}`, run });

  // The stubs below are module SOURCE, so every value spliced into them is made safe for code first:
  // a string literal is JSON-encoded with the characters that can end or break a script escaped, and
  // a binding name must be a plain identifier (CodeQL js/bad-code-sanitization, PR #22).
  const codeLiteral = (value) => JSON.stringify(value).replace(/[<>\/\u2028\u2029]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);
  const codeIdentifier = (name) => {
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error(`stub binding ${JSON.stringify(name)} is not a plain identifier`);
    return name;
  };

  async function appStubs() {
    const icons = new Set();
    const dir = path.dirname(configEntry);
    for (const file of await readdir(dir)) {
      if (!/\.tsx?$/.test(file)) continue;
      for (const match of (await readFile(path.join(dir, file), "utf8")).matchAll(/import \{([^}]*)\} from "lucide-react"/g)) {
        for (const name of match[1].split(",").map((part) => part.trim()).filter(Boolean)) icons.add(name);
      }
    }
    const stubs = { __icons__: [...icons].map((name) => `export const ${codeIdentifier(name)} = () => null;`).join("\n") };
    const resolve = [{ filter: /^lucide-react$/, to: "__icons__" }];
    for (const [module, exports] of Object.entries(UI_PRIMITIVES)) {
      stubs[`__ui_${module}__`] = `import { jsx } from "react/jsx-runtime";\n${Object.entries(exports).map(([name, tag]) => `export const ${codeIdentifier(name)} = (props) => jsx(${codeLiteral(tag)}, props);`).join("\n")}`;
      resolve.push({ filter: new RegExp(`^@/components/ui/${module}$`), to: `__ui_${module}__` });
    }
    return { stubs, resolve };
  }

  async function withMemoryApp(config, run) {
    const root = await mkdtemp(path.join(os.tmpdir(), "aof-180-03-"));
    const configPath = path.join(root, ".aof", "aof.config.json");
    await mkdir(path.dirname(configPath));
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
    const { server, url } = await serveSetupUi({ listItems: () => [], upsertItem: () => {} }, { port: 0, projectDir: root, env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, "global") } });
    try {
      await withMountedApp({ entry: configEntry, exportName: "App", url, ...(await appStubs()) }, (app) => run({ app, configPath }));
    } finally {
      server.close();
      assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
      await rm(root, { recursive: true, force: true });
    }
  }

  const buttons = (app) => findAll(app.tree(), (node) => node.type === "button");
  const sidebarEntry = (app, label) => buttons(app).find((node) => textOf(node).startsWith(label) && /^\D+\d+$/.test(textOf(node)));
  const openMemory = async (app) => { sidebarEntry(app, "Memory").props.onClick(); await app.flush(); };
  const textarea = (app) => findAll(app.tree(), (node) => node.type === "textarea")[0];
  const shown = (app) => JSON.parse(textarea(app).props.value);
  const notice = (app) => findAll(app.tree(), (node) => node.props?.["aria-label"] === "Legacy memory keys")[0];
  const save = async (app) => { findAll(app.tree(), (node) => node.type === "form" && textOf(node).includes("JSON object"))[0].props.onSubmit({ preventDefault() {} }); await app.flush(); };
  const expandedGroup = (app) => {
    const labels = ["MCP Servers", "Hooks", "Project Docs", "Settings", "Memory"];
    return buttons(app).map((node) => textOf(node).replace(/\d+$/, "")).filter((label) => labels.includes(label));
  };

  return [
    t("00", "E1 · a new-shape node is shown as written", () => withMemoryApp({ name: "p", resources: [], memory: { backend: "local" } }, async ({ app }) => {
      await openMemory(app);
      assert.deepEqual(shown(app), { backend: "local" });
      assert.equal(textOf(sidebarEntry(app, "Memory")), "Memory1");
      assert.equal(notice(app), undefined);
    })),
    t("00", "E2 · an old-shape node is shown rewritten, with a notice naming each old key", () => withMemoryApp({ name: "p", resources: [], graph: { share: "git-refs" }, memory: { backend: "local", sources: ["claude-auto-memory"] } }, async ({ app }) => {
      await openMemory(app);
      assert.deepEqual(shown(app), { backend: "local", corpora: ["work", "imports", "code", "operator"], graph: { share: "git-refs" } });
      const lines = findAll(notice(app), (node) => node.type === "p").map(textOf);
      assert.deepEqual(lines, ["memory.sources → memory.corpora", "graph.share → memory.graph.share", "Saving writes the new shape."]);
    })),
    t("00", "E3 · a config without a memory node shows an empty object", () => withMemoryApp({ name: "p", resources: [] }, async ({ app }) => {
      await openMemory(app);
      assert.deepEqual(shown(app), {});
      assert.equal(textOf(sidebarEntry(app, "Memory")), "Memory0");
    })),
    t("00", "E7 · a conflicting node is shown as written, with the conflict in the validation panel", () => withMemoryApp({ name: "p", resources: [], graph: { share: "off" }, memory: { graph: { share: "off" } } }, async ({ app }) => {
      await openMemory(app);
      assert.deepEqual(shown(app), { graph: { share: "off" } });
      const text = textOf(app.tree());
      assert.match(text, /memory-config-conflict|spells it twice/);
      assert.ok(text.includes('"graph" and "memory.graph"'), "the panel names both paths");
      assert.equal(notice(app), undefined);
    })),
    t("00", "the section sits in the Expanded DSL group in project scope only", () => withMemoryApp({ name: "p", resources: [], memory: { backend: "local" } }, async ({ app }) => {
      assert.deepEqual(expandedGroup(app), ["MCP Servers", "Hooks", "Project Docs", "Settings", "Memory"]);
      buttons(app).find((node) => textOf(node) === "global").props.onClick();
      await app.flush();
      assert.equal(expandedGroup(app).includes("Memory"), false);
    })),
    t("01", "E4 · saving an old-shape config's shown node writes the new shape and drops the old keys", () => withMemoryApp({ name: "p", resources: [], graph: { share: "git-refs" }, memory: { backend: "local", sources: ["claude-auto-memory"] } }, async ({ app, configPath }) => {
      await openMemory(app);
      await save(app);
      const saved = JSON.parse(await readFile(configPath, "utf8"));
      assert.deepEqual(saved.memory, { backend: "local", corpora: ["work", "imports", "code", "operator"], graph: { share: "git-refs" } });
      assert.equal("graph" in saved, false);
      assert.match(textOf(app.tree()), /Saved Memory/);
      await openMemory(app);
      assert.equal(notice(app), undefined, "reopening the section shows no legacy notice");
    })),
    t("01", "E6 · an invalid node is refused and the draft is kept", () => withMemoryApp({ name: "p", resources: [], memory: { backend: "local" } }, async ({ app, configPath }) => {
      const before = await readFile(configPath, "utf8");
      await openMemory(app);
      const draft = '{"corpora":["work","code"]}';
      textarea(app).props.onChange({ target: { value: draft } });
      await app.flush();
      await save(app);
      assert.match(textOf(app.tree()), /leaves out "imports"/);
      assert.equal(textarea(app).props.value, draft);
      assert.equal(await readFile(configPath, "utf8"), before);
    })),
  ];
}
