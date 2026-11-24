// FF-16901 — milestone 169 / ADR-003: one registry module is the only core module that names an
// integration package. No module under packages/core/src imports `@aof/integration-*` except
// packages/core/src/integrations.mjs, with no exceptions: chores 175 and 176 moved Notion onto the
// seam, and chore 177 removed the named Notion exception this control carried until then. An
// integration core imports from its lowest layers cannot be moved, removed or replaced without
// editing core.
//
// FF-16902 — 169/ADR-001 + ADR-004: what only an integration renders lives in its package, and
// the model's runtimes are exactly the three.
//
// Also 169/01 task 01 R2: Hyperagent's four verbs reach the application through that registry,
// contributed under the package's own name.
//
// FF-20701 — chore 207: the methodology's twin of FF-16901. ACD reaches core through one
// contribution object, read by one registry (packages/core/src/methodology.mjs). No other core
// module imports or spells `@aof/acd`, and none spells the path of a file under the methodology's
// assets as a string literal: a file core reads by role is named on the contribution (`files`),
// and core asks the registry for it. `bundle.json` is exempt, because every contributor's fragment
// carries that name. It lives in this file because its subject is the same — each of core's
// registries is the one home of what it names — and test/arch/command is at its ceiling.
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
import { METHODOLOGY } from "../../../packages/core/src/methodology.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CORE_SRC = path.join(repoRoot, "packages", "core", "src");
const REGISTRY = "packages/core/src/integrations.mjs";
const METHODOLOGY_REGISTRY = "packages/core/src/methodology.mjs";
// 169/02 E6 adds `package` (169/ADR-007).
const HYPERAGENT_VERBS = ["hyperagent:brief", "hyperagent:result", "hyperagent:check", "hyperagent:doctor", "hyperagent:package"];

async function modules(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await modules(full));
    else if (/\.m?js$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Every core module that imports an integration package, other than the registry, as
// `<module> imports <specifier>` lines.
export async function integrationImportViolations(root = repoRoot, srcDir = CORE_SRC) {
  const violations = [];
  for (const file of await modules(srcDir)) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    if (relative === REGISTRY) continue;
    // The workspace boundary check's own parser: a specifier in a comment or a string is not an
    // import, and a dynamic import() is.
    for (const { specifier } of moduleReferences(await readFile(file, "utf8"), file).references) {
      if (specifier?.startsWith("@aof/integration-")) violations.push(`${relative} imports ${specifier}`);
    }
  }
  return violations;
}

// FF-20701 — every core module other than the methodology registry that imports or spells the
// methodology's package, or spells one of its asset files' paths as a whole string literal, as
// `<module> imports|names <what>` lines. Comments are prose, and are stripped first.
async function assetFiles(dir, prefix = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...await assetFiles(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

export async function methodologyNamingViolations({ root = repoRoot, srcDir = CORE_SRC, assetsDir = assetPath("bundle"), packageName = METHODOLOGY.name } = {}) {
  const named = (await assetFiles(assetsDir)).filter((rel) => rel !== "bundle.json");
  const violations = [];
  for (const file of await modules(srcDir)) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    if (relative === METHODOLOGY_REGISTRY) continue;
    const source = await readFile(file, "utf8");
    for (const { specifier } of moduleReferences(source, file).references) {
      if (specifier === packageName || specifier?.startsWith(`${packageName}/`)) violations.push(`${relative} imports ${specifier}`);
    }
    const code = stripComments(source);
    const literal = (text) => [`"${text}"`, `'${text}'`, `\`${text}\``].some((quoted) => code.includes(quoted));
    if (literal(packageName)) violations.push(`${relative} names ${packageName}`);
    for (const rel of named) if (literal(rel)) violations.push(`${relative} names ${rel}`);
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
    name: "FF-16901 · 169/01 E1 + chore 177 · the only core importer of an integration package is the registry, with no exceptions",
    run: async () => {
      assert.deepEqual(await integrationImportViolations(), []);
      const registry = await readFile(path.join(repoRoot, REGISTRY), "utf8");
      assert.match(registry, /from\s+"@aof\/integration-hyperagent\/contribution"/, "the registry is where Hyperagent is named");
      assert.match(registry, /from\s+"@aof\/integration-notion\/contribution"/, "the registry is where Notion is named");
    }
  },
  {
    name: "FF-16901 · 169/01 E2 + chore 177 · a planted core import of an integration package — Notion's included — fails the control, naming the module",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff16901-"));
      try {
        const src = path.join(root, "packages", "core", "src");
        await mkdir(path.join(src, "work"), { recursive: true });
        await writeFile(path.join(src, "integrations.mjs"), 'import { contribution as notion } from "@aof/integration-notion/contribution";\nimport { contribution } from "@aof/integration-hyperagent/contribution";\n');
        await writeFile(path.join(src, "work", "planted.mjs"), 'import { HYPERAGENT_RUNTIME } from "@aof/integration-hyperagent/runtime";\n');
        await writeFile(path.join(src, "work", "notion.mjs"), 'import { FILE_STORE_CLASSIFICATION } from "@aof/integration-notion/store-metadata";\n');
        assert.deepEqual((await integrationImportViolations(root, src)).sort(), [
          "packages/core/src/work/notion.mjs imports @aof/integration-notion/store-metadata",
          "packages/core/src/work/planted.mjs imports @aof/integration-hyperagent/runtime",
        ]);
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
    name: "FF-20701 · chore 207 · the only core module that names the methodology package or one of its asset files is the methodology registry",
    run: async () => {
      assert.deepEqual(await methodologyNamingViolations(), []);
      const registry = await readFile(path.join(repoRoot, METHODOLOGY_REGISTRY), "utf8");
      assert.match(registry, /from\s+"@aof\/acd\/contribution"/, "the registry is where ACD is named");
      assert.equal(assetPath("bundle"), path.join(repoRoot, "packages", "acd", "assets"), "the bundle asset class is the methodology package's assets");
      for (const file of Object.values(METHODOLOGY.files)) {
        assert.ok(existsSync(path.join(assetPath("bundle"), file)), `the by-role file ${file} exists in the methodology's assets`);
      }
    }
  },
  {
    name: "FF-20701 · chore 207 · a planted core import of the methodology, a planted spelling of it and a planted asset path each fail the control, naming the module",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff20701-"));
      try {
        const src = path.join(root, "packages", "core", "src");
        const assets = path.join(root, "packages", "acd", "assets");
        await mkdir(path.join(src, "work"), { recursive: true });
        await mkdir(path.join(assets, "templates", "milestone"), { recursive: true });
        await writeFile(path.join(assets, "bundle.json"), "{}\n");
        await writeFile(path.join(assets, "frozen-set.jsonc"), "{}\n");
        await writeFile(path.join(assets, "templates", "milestone", "AOF.md"), "# AOF\n");
        await writeFile(path.join(src, "methodology.mjs"), 'import { contribution } from "@aof/acd/contribution";\nexport const FILE = "frozen-set.jsonc";\n');
        await writeFile(path.join(src, "work", "imports.mjs"), 'import { contribution } from "@aof/acd/contribution";\n');
        await writeFile(path.join(src, "work", "spells.mjs"), 'const owner = "@aof/acd";\n');
        await writeFile(path.join(src, "work", "paths.mjs"), "read('templates/milestone/AOF.md');\nread(`frozen-set.jsonc`);\n");
        await writeFile(path.join(src, "work", "clean.mjs"), '// templates/milestone/AOF.md and "@aof/acd" in a comment are prose\nread("bundle.json");\n');
        assert.deepEqual((await methodologyNamingViolations({ root, srcDir: src, assetsDir: assets })).sort(), [
          "packages/core/src/work/imports.mjs imports @aof/acd/contribution",
          "packages/core/src/work/paths.mjs names frozen-set.jsonc",
          "packages/core/src/work/paths.mjs names templates/milestone/AOF.md",
          "packages/core/src/work/spells.mjs names @aof/acd",
        ]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  },
  {
    name: "169/01 E3 + 169/02 E6 · the five hyperagent verbs are registered from the contribution",
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
