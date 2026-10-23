// FF-16901 — milestone 169 / ADR-003: one registry module is the only core module that names an
// integration package. No module under packages/core/src imports `@aof/integration-*` except
// packages/core/src/integrations.mjs; Notion is the one named exception, which the follow-up chore
// removes by moving Notion onto the seam. (169/ADR-003 locates Notion's import in command-core.mjs;
// measured at this story, Notion is imported from nine core modules, so the exception is the package.) An integration core imports from its lowest layers cannot be
// moved, removed or replaced without editing core.
//
// FF-16902 — 169/ADR-001 + ADR-004: what only an integration renders lives in its package, and
// the model's runtimes are exactly the three.
//
// Also 169/01 task 01 R2: Hyperagent's four verbs reach the application through that registry,
// contributed under the package's own name.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApplication } from "../../../packages/core/src/application/assemble.mjs";
import { integrationContributions } from "../../../packages/core/src/application/bindings/command-core.mjs";
import { INTEGRATIONS } from "../../../packages/core/src/integrations.mjs";
import { assetPath, packageAssetClass, readAssetText } from "../../../packages/core/src/asset-base.mjs";
import { RUNTIMES, supportedRuntimes } from "../../../packages/core/src/model.mjs";
import { existsSync } from "node:fs";
import { moduleReferences } from "../../../scripts/workspace-boundaries.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CORE_SRC = path.join(repoRoot, "packages", "core", "src");
const REGISTRY = "packages/core/src/integrations.mjs";
// The one named exception (169/ADR-003), removed by the Notion chore.
const EXCEPTION = "@aof/integration-notion";
const HYPERAGENT_VERBS = ["hyperagent:brief", "hyperagent:result", "hyperagent:check", "hyperagent:doctor"];

async function modules(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await modules(full));
    else if (/\.m?js$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Every core module that imports an integration package, other than the registry and the named
// exception, as `<module> imports <specifier>` lines.
export async function integrationImportViolations(root = repoRoot, srcDir = CORE_SRC) {
  const violations = [];
  for (const file of await modules(srcDir)) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    if (relative === REGISTRY) continue;
    // The workspace boundary check's own parser: a specifier in a comment or a string is not an
    // import, and a dynamic import() is.
    for (const { specifier } of moduleReferences(await readFile(file, "utf8"), file).references) {
      if (!specifier?.startsWith("@aof/integration-")) continue;
      if (specifier !== EXCEPTION && !specifier.startsWith(`${EXCEPTION}/`)) violations.push(`${relative} imports ${specifier}`);
    }
  }
  return violations;
}

// FF-16902 — 169/ADR-001 + ADR-004: what only an integration renders lives in its package. Every
// file an integration's fragment names (member files and variant files) is absent from core's
// bundle root, and core's own `bundle.json` declares none of the fragment's member ids.
export async function integrationAssetViolations({ coreRoot = assetPath("bundle"), integrations = INTEGRATIONS } = {}) {
  const violations = [];
  const core = JSON.parse(await readFile(path.join(coreRoot, "bundle.json"), "utf8"));
  const coreIds = new Set(core.members.map((member) => member.id));
  for (const integration of integrations) {
    if (!integration.assets?.package) continue;
    const fragment = JSON.parse(readAssetText(packageAssetClass(integration.assets.package), "bundle.json"));
    for (const member of fragment.members ?? []) {
      if (coreIds.has(member.id)) violations.push(`core's bundle.json declares ${integration.name}'s member ${member.id}`);
      const files = [member.file, ...Object.values(member.variants ?? {}).filter(Boolean).map((variant) => variant.file)];
      for (const file of files) if (file && existsSync(path.join(coreRoot, file))) violations.push(`core's assets hold ${file}, which ${integration.name} renders`);
    }
  }
  return violations;
}

export const archTests = [
  {
    name: "FF-16901 · 169/01 E1 · the only core importer of an integration package is the registry, plus the one named Notion exception",
    run: async () => {
      assert.deepEqual(await integrationImportViolations(), []);
      assert.match(await readFile(path.join(repoRoot, REGISTRY), "utf8"), /from\s+"@aof\/integration-hyperagent\/contribution"/, "the registry is where Hyperagent is named");
    }
  },
  {
    name: "FF-16901 · 169/01 E2 · a planted core import of an integration package fails the control, naming the module",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff16901-"));
      try {
        const src = path.join(root, "packages", "core", "src");
        await mkdir(path.join(src, "work"), { recursive: true });
        await writeFile(path.join(src, "integrations.mjs"), 'import { contribution } from "@aof/integration-hyperagent/contribution";\n');
        await writeFile(path.join(src, "work", "planted.mjs"), 'import { HYPERAGENT_RUNTIME } from "@aof/integration-hyperagent/runtime";\n');
        assert.deepEqual(await integrationImportViolations(root, src), ["packages/core/src/work/planted.mjs imports @aof/integration-hyperagent/runtime"]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  },
  {
    name: "FF-16902 · core's assets hold no file an integration renders, and the model's runtimes are exactly claude, codex and opencode",
    run: async () => {
      assert.deepEqual(await integrationAssetViolations(), []);
      assert.deepEqual(Object.keys(RUNTIMES), ["claude", "codex", "opencode"]);
      assert.deepEqual(supportedRuntimes(), ["claude", "codex", "opencode"]);
    }
  },
  {
    name: "FF-16902 · a planted copy of an integration's file under core's assets fails the control, naming the file",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff16902-"));
      try {
        await writeFile(path.join(root, "bundle.json"), JSON.stringify({ members: [] }));
        await mkdir(path.join(root, "commands"), { recursive: true });
        await writeFile(path.join(root, "commands", "hyperplan.md"), "planted\n");
        assert.deepEqual(await integrationAssetViolations({ coreRoot: root }), ["core's assets hold commands/hyperplan.md, which @aof/integration-hyperagent renders"]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  },
  {
    name: "169/01 E3 · the four hyperagent verbs are registered from the contribution",
    run: async () => {
      const contributed = integrationContributions({ commandError: () => new Error("stub"), gitExec: async () => ({}), validateWork: async () => [], readJson: async () => ({}) });
      const hyperagent = contributed.find((contribution) => contribution.name === "@aof/integration-hyperagent");
      assert.deepEqual(hyperagent.commands.map((command) => command.id), HYPERAGENT_VERBS);
      const app = createApplication();
      try {
        const ids = app.listCommands().map((command) => command.id);
        for (const id of HYPERAGENT_VERBS) assert.ok(ids.includes(id), `${id} is in the application's command list`);
      } finally {
        await app.close();
      }
    }
  }
];
