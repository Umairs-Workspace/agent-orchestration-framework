import { assets } from "./support/assets-services.mjs";
// 169/01 — Hyperagent is an INTEGRATION, not a runtime (169/ADR-001, ADR-004, ADR-005;
// wiki/hyperagent-support.md). Its bundle members live in @aof/integration-hyperagent/assets and reach
// core's descriptor through the package's contribution; they render only for a project whose config
// carries `work.integrations.hyperagent`, in a dev checkout and a packaged sidecar alike. The model
// knows exactly claude, codex and opencode, and core's own assets hold none of Hyperagent's files.
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile, mkdir, cp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { RUNTIMES, CAPABILITIES, supportedRuntimes } from "../src/model.mjs";
import { parseRuntimes } from "../src/spine/flags.mjs";
import { readDescriptor, loadBundle } from "../src/work/bundle.mjs";
import { assetPath, setSeaSentinelForTest, setSidecarAnchorForTest } from "../src/asset-base.mjs";
import { updateWork } from "../src/work/update.mjs";

const initWork = assets.work.init.initWork;

const SKILLS = ["add-milestone", "add-story", "add-task", "prd", "refine", "shatter", "validate"].map((id) => `aof-${id}`);
const MEMBERS = ["hyperplan", "hyperagent-planner-instructions", ...SKILLS];
const PACKAGE_ASSETS = path.resolve(import.meta.dirname, "..", "..", "integration-hyperagent", "assets");
const HYPERAGENT_FILES = [".hyperagent/AGENT.md", ...SKILLS.map((id) => `.hyperagent/skills/${id}/SKILL.md`)];
const HYPERPLAN = ".claude/commands/aof/hyperplan.md";

async function withTempRepo(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-hyperagent-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function writeConfig(dir, config) {
  await mkdir(path.join(dir, ".aof"), { recursive: true });
  await writeFile(path.join(dir, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`);
}

const ENABLED = { work: { integrations: { hyperagent: {} } } };

function rendered(dir) {
  return [HYPERPLAN, ...HYPERAGENT_FILES].filter((file) => existsSync(path.join(dir, file)));
}

// A packaged install: core's bundle beside the exe, with `extra` laid out under bundle/.
async function withSidecar(layout, fn) {
  return withTempRepo(async (anchor) => {
    await cp(assetPath("bundle"), path.join(anchor, "bundle"), { recursive: true });
    await layout(path.join(anchor, "bundle"));
    setSeaSentinelForTest(true);
    setSidecarAnchorForTest(anchor);
    try {
      return await fn(anchor);
    } finally {
      setSeaSentinelForTest(undefined);
      setSidecarAnchorForTest(undefined);
    }
  });
}

export const hyperagentRuntimeTests = [
  {
    name: "169/01 E1 · Hyperagent's members are read from the package's assets",
    run: async () => {
      const contributed = readDescriptor().members.filter((member) => member.integration === "hyperagent");
      assert.deepEqual(contributed.map((member) => member.id).sort(), [...MEMBERS].sort());
      for (const member of contributed) assert.equal(member.assetClass, "package:@aof/integration-hyperagent", member.id);
      const bundle = loadBundle();
      const hyperplan = bundle.resources.find((resource) => resource.id === "hyperplan");
      const source = (await readFile(path.join(PACKAGE_ASSETS, "commands", "hyperplan.md"), "utf8")).replace(/\r\n/g, "\n");
      assert.ok(source.replace(/\r\n/g, "\n").endsWith(hyperplan.body.replace(/\r\n/g, "\n")), "hyperplan's body is the package's file");
      for (const id of ["hyperagent-planner-instructions", ...SKILLS]) {
        const asset = bundle.assets.find((candidate) => candidate.id === id);
        assert.equal(asset.body, await readFile(path.join(PACKAGE_ASSETS, asset.file), "utf8"), `${id} is the package's file`);
      }
      const skill = bundle.assets.find((candidate) => candidate.id === "aof-refine");
      assert.equal(skill.target, ".hyperagent/skills/aof-refine/SKILL.md");
      assert.doesNotMatch(skill.body, /^aof-runtime:/m, "the old runtime line is gone");
    }
  },
  {
    name: "169/01 E2 · a packaged binary reads them from the sidecar",
    run: async () => withSidecar(
      (bundle) => cp(PACKAGE_ASSETS, path.join(bundle, "packages", "integration-hyperagent"), { recursive: true }),
      async () => {
        const contributed = readDescriptor().members.filter((member) => member.integration === "hyperagent");
        assert.deepEqual(contributed.map((member) => member.id).sort(), [...MEMBERS].sort());
        const asset = loadBundle().assets.find((candidate) => candidate.id === "aof-shatter");
        assert.equal(asset.body, await readFile(path.join(PACKAGE_ASSETS, "skills", "aof-shatter", "SKILL.md"), "utf8"));
      }
    )
  },
  {
    name: "169/01 E3 · a contributed member id that core already declares is refused at load",
    run: async () => withSidecar(
      async (bundle) => {
        await mkdir(path.join(bundle, "packages", "integration-fake"), { recursive: true });
        await writeFile(path.join(bundle, "packages", "integration-fake", "bundle.json"), JSON.stringify({ members: [{ id: "refine", kind: "command", file: "commands/refine.md", runtimes: ["claude"] }] }));
      },
      async () => {
        const fake = { id: "fake", name: "@aof/integration-fake", assets: { package: "@aof/integration-fake" } };
        assert.throws(() => readDescriptor({ integrations: [fake] }), (error) => /"refine"/.test(error.message) && /@aof\/integration-fake/.test(error.message));
      }
    )
  },
  {
    name: "169/01 E4 · a project with no work.integrations.hyperagent block gets neither /aof:hyperplan nor .hyperagent/",
    run: async () => withTempRepo(async (dir) => {
      await writeConfig(dir, { work: {} });
      await initWork({ targetDir: dir, runtimes: ["claude", "codex"] });
      assert.deepEqual(rendered(dir), []);
      assert.ok(!existsSync(path.join(dir, ".agents", "skills", "aof-hyperplan")), "no Codex hyperplan skill either");
    })
  },
  {
    name: "169/01 E4 · a project with \"work.integrations.hyperagent\": {} gets /aof:hyperplan and .hyperagent/",
    run: async () => withTempRepo(async (dir) => {
      await writeConfig(dir, ENABLED);
      await initWork({ targetDir: dir, runtimes: ["claude", "codex"] });
      assert.deepEqual(rendered(dir), [HYPERPLAN, ...HYPERAGENT_FILES]);
      assert.ok(existsSync(path.join(dir, ".agents", "skills", "aof-hyperplan", "SKILL.md")), "the Codex hyperplan skill is written");
      assert.match(await readFile(path.join(dir, ".hyperagent", "AGENT.md"), "utf8"), /AOF Planner/);
    })
  },
  {
    name: "169/01 E5 · turning the integration off removes its files on the next update",
    run: async () => withTempRepo(async (dir) => {
      await writeConfig(dir, ENABLED);
      await initWork({ targetDir: dir, runtimes: ["claude", "codex"] });
      await writeConfig(dir, { work: {} });
      const result = await updateWork({ targetDir: dir });
      const deleted = result.actions.filter((item) => item.action === "delete").map((item) => String(item.path).replaceAll("\\", "/")).sort();
      assert.deepEqual(deleted, [".agents/skills/aof-hyperplan/SKILL.md", ".agents/skills/aof-hyperplan/agents/openai.yaml", HYPERPLAN, ...HYPERAGENT_FILES].sort());
      assert.deepEqual(rendered(dir), []);
      const changed = (await updateWork({ targetDir: dir })).actions.filter((item) => item.action !== "skip");
      assert.deepEqual(changed, [], "a second update has nothing left to remove");
    })
  },
  {
    name: "169/01 E6 · the model knows exactly the three runtimes",
    run: async () => {
      assert.deepEqual(Object.keys(RUNTIMES), ["claude", "codex", "opencode"]);
      assert.deepEqual(supportedRuntimes(), ["claude", "codex", "opencode"]);
      for (const [kind, column] of Object.entries(CAPABILITIES)) assert.deepEqual(Object.keys(column), ["claude", "codex", "opencode"], kind);
    }
  },
  {
    name: "169/01 E7 · naming hyperagent as a runtime is refused",
    run: async () => {
      assert.ok(!parseRuntimes({}).includes("hyperagent"), "no flag never yields hyperagent");
      await withTempRepo(async (dir) => {
        await assert.rejects(initWork({ targetDir: dir, runtimes: ["hyperagent"] }), /Unsupported runtime "hyperagent"/);
        assert.ok(!existsSync(path.join(dir, ".hyperagent")));
      });
    }
  },
  {
    name: "169/01 E8 · core's assets hold no Hyperagent file",
    run: async () => {
      const files = [];
      async function walk(dir) {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) await walk(full);
          else files.push(path.relative(assetPath("bundle"), full).replaceAll("\\", "/"));
        }
      }
      await walk(assetPath("bundle"));
      assert.deepEqual(files.filter((file) => /hyperplan|hyperagent|aof-prd/i.test(file) && file !== "manifest.json"), []);
      const core = JSON.parse(await readFile(path.join(assetPath("bundle"), "bundle.json"), "utf8"));
      assert.deepEqual(core.members.filter((member) => MEMBERS.includes(member.id) || member.variants?.hyperagent).map((member) => member.id), []);
      const codex = await readFile(path.join(assetPath("bundle"), "variants", "codex", "workflow.md"), "utf8");
      assert.doesNotMatch(codex, /<!-- variant:hyperplan -->/, "hyperplan's Codex section left core's shared variant file");
    }
  }
];
