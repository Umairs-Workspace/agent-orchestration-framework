import { defaultApplication as _aofApplication } from "aof/default-application";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  }
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
    work: { agents: { session: { models: { continue: "legacy-model" } }, ...(legacy ? {} : { runtimes: { codex: { session: { models: { continue: "saved-codex" }, effort: { continue: "high" } } }, claude: { session: { models: { continue: "saved-claude" } } } } }) } } };
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
      assert.match(textOf(app.tree()), /Primary execution assistant: Claude Code.*source: default/);
      assert.match(textOf(app.tree()), /work.agents.session.models.continue/);
      assert.equal(inputById(app, "execution-runtime").props.value, "");
    });
  }, { legacy: true });
}

async function mountedExecutionRoundtrip() {
  await withRuntimeApi(async ({ url, configPath, config }) => {
    await withMountedApp({ entry: runtimeEntry, exportName: "RuntimeSettings", url }, async app => {
      await editRuntime(app, "codex");
      assert.equal(inputById(app, "execution-codex-phase-models-continue").props.value, "saved-codex");
      await editContinue(app, "codex", "models", "edited-codex");
      await editRuntime(app, "claude");
      assert.equal(inputById(app, "execution-claude-phase-models-continue").props.value, "saved-claude");
      await editContinue(app, "claude", "models", "edited-claude");
      await editRuntime(app, "codex");
      assert.equal(inputById(app, "execution-codex-phase-models-continue").props.value, "edited-codex");
      await submitRuntime(app);
      assert.match(textOf(app.tree()), /Saved execution settings/);
      assert.match(textOf(app.tree()), /Primary execution assistant: Codex.*source: project/);
      const saved = JSON.parse(await readFile(configPath, "utf8"));
      assert.deepEqual(saved.memory, config.memory);
      assert.deepEqual(saved.work.agents.session, config.work.agents.session);
      assert.equal(saved.work.agents.runtimes.claude.session.models.continue, "edited-claude");
      assert.equal(saved.work.agents.runtimes.codex.session.models.continue, "edited-codex");
      assert.deepEqual(app.requests().map(value => new URL(value.url).pathname), ["/api/config/project", "/api/config/sections"]);
    });
    await withMountedApp({ entry: runtimeEntry, exportName: "RuntimeSettings", url }, async app => {
      assert.equal(inputById(app, "execution-runtime").props.value, "codex");
      assert.equal(inputById(app, "execution-codex-phase-models-continue").props.value, "edited-codex");
      assert.match(textOf(app.tree()), /work.agents.runtimes.codex.session.models.continue/);
      assert.match(textOf(app.tree()), /unproven/);
      await editRuntime(app, "");
      assert.equal(inputById(app, "execution-claude-phase-models-continue").props.value, "edited-claude");
      await submitRuntime(app);
      assert.match(textOf(app.tree()), /Primary execution assistant: Claude Code.*source: default/);
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
      assert.match(textOf(inputById(app, field.props["aria-describedby"])), /unsupported effort/);
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
