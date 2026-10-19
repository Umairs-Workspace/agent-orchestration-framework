// Traceability wiring for milestone 165 / story 02 `pinned-planner-is-packaged-for-cowork`.
//
// Every @executable scenario and Examples row of the story's two task features runs here
// against the real `packagePlanner`. The tree is a fixture built in a temp dir — injected
// as `source: { dir, head }`, or written by an injected `clone` seam into the temporary
// directory packagePlanner owns (the live path's shape, minus the network). The @manual
// live clone is run by hand and recorded at verify.
//
//   00_packages-come-only-from-the-pinned-commit.feature — E1, E2, E3, E4 outline,
//        the temporary-clone outline (E9, E10), an injected tree is left in place
//   01_each-recommended-plugin-is-a-standalone-package.feature — the set outline (E5),
//        E6, E7, E8, a plugin folder without its manifest
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { packagePlanner } from "../src/planning/cowork-planner.mjs";

const PINNED = "5042ff6169e0df49086c846f69bf7b6cdb67a6de";
const MOVED = "9f1c0000000000000000000000000000000000aa";
const CORE = ["pm-execution", "pm-product-discovery", "pm-product-strategy"];
const ALL_FOLDERS = [...CORE, "pm-market-research", "pm-ai-shipping"];

// Write the planner fixture into `dir`: each plugin folder with its manifest, a skill and
// a command, plus a root LICENSE and README.md.
async function writeTree(dir, { omitManifest } = {}) {
  for (const name of ALL_FOLDERS) {
    await mkdir(path.join(dir, name, ".claude-plugin"), { recursive: true });
    await mkdir(path.join(dir, name, "skills", `${name}-skill`), { recursive: true });
    await mkdir(path.join(dir, name, "commands"), { recursive: true });
    if (name !== omitManifest) {
      await writeFile(path.join(dir, name, ".claude-plugin", "plugin.json"), JSON.stringify({ name }));
    }
    await writeFile(path.join(dir, name, "skills", `${name}-skill`, "SKILL.md"), `# ${name} skill\n`);
    await writeFile(path.join(dir, name, "commands", "run.md"), Buffer.from([0xef, 0xbb, 0xbf, 0x41, 0x0a]));
  }
  await mkdir(path.join(dir, ".git"), { recursive: true });
  await writeFile(path.join(dir, ".git", "HEAD"), "ref\n");
  await writeFile(path.join(dir, "LICENSE"), "MIT License\nCopyright (c) pm-skills\n");
  await writeFile(path.join(dir, "README.md"), "# pm-skills\n");
}

async function withTree(fn, options) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-planner-fixture-"));
  try {
    await writeTree(dir, options);
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const names = (result) => result.packages.map((entry) => entry.name);

export const planningCoworkPlannerTests = [
  // ====================================================================
  // 00_packages-come-only-from-the-pinned-commit.feature
  // ====================================================================
  {
    name: "pinned-planner-is-packaged-for-cowork/00 E1 · a clone at the recorded commit is packaged",
    run: () => withTree(async (dir) => {
      const result = await packagePlanner({ sha: PINNED, source: { dir, head: PINNED } });
      assert.equal(result.ok, true, "packaging succeeds");
      assert.deepEqual(names(result), CORE);
    })
  },
  {
    name: "pinned-planner-is-packaged-for-cowork/00 E2 · a tag that moved is refused, naming both commits",
    run: () => withTree(async (dir) => {
      const result = await packagePlanner({ sha: PINNED, source: { dir, head: MOVED } });
      assert.equal(result.ok, false);
      assert.equal(result.reason, "head-mismatch");
      assert.ok(result.message.includes(PINNED) && result.message.includes(MOVED), result.message);
      assert.deepEqual(result.packages, [], "no package is produced");
    })
  },
  {
    name: "pinned-planner-is-packaged-for-cowork/00 E3 · a failed clone is refused",
    run: async () => {
      let cloneDir = null;
      const result = await packagePlanner({
        sha: PINNED,
        clone: (dir) => { cloneDir = dir; return { ok: false, message: "fatal: unable to access 'https://github.com/phuryn/pm-skills.git/'" }; }
      });
      assert.equal(result.reason, "clone-failed");
      assert.match(result.message, /clone .*failed/);
      assert.deepEqual(result.packages, [], "no package is produced");
      assert.equal(existsSync(cloneDir), false, "the temporary clone directory is removed");
    }
  },
  ...["main", "v2.0.0", "5042ff6", "5042FF6169E0DF49086C846F69BF7B6CDB67A6DE"].map((ref) => ({
    name: `pinned-planner-is-packaged-for-cowork/00 E4 · ref "${ref}" is refused before any clone`,
    run: async () => {
      let cloned = false;
      const result = await packagePlanner({ sha: ref, clone: () => { cloned = true; return { ok: false }; } });
      assert.equal(result.reason, "sha-not-pinned");
      assert.equal(cloned, false, "no clone was attempted");
    }
  })),
  ...[
    { example: "E9", head: PINNED, outcome: "packaged" },
    { example: "E10", head: MOVED, outcome: "refused" }
  ].map((row) => ({
    name: `pinned-planner-is-packaged-for-cowork/00 ${row.example} · the temporary clone is removed when ${row.outcome}`,
    run: async () => {
      // The live path with the network replaced: the clone seam fills the temp dir
      // packagePlanner created, and reports the HEAD the row states.
      let cloneDir = null;
      const lines = [];
      const outcome = await packagePlanner({
        sha: PINNED,
        log: (line) => lines.push(line),
        clone: async (dir) => {
          cloneDir = dir;
          await writeTree(dir);
          return { ok: true, head: row.head };
        }
      });
      assert.equal(outcome.ok, row.outcome === "packaged" ? true : false, `outcome is ${row.outcome}`);
      assert.ok(cloneDir, "a temporary clone directory was used");
      assert.equal(existsSync(cloneDir), false, "the temporary clone directory no longer exists");
      assert.ok(lines.some((line) => line.startsWith("network-boundary: git ") && line.includes(" clone ")), "the clone is behind a network boundary");
    }
  })),
  {
    name: "pinned-planner-is-packaged-for-cowork/00 an injected source tree is left in place",
    run: () => withTree(async (dir) => {
      await packagePlanner({ sha: PINNED, source: { dir, head: PINNED } });
      assert.equal(existsSync(path.join(dir, "pm-execution")), true, "the injected source tree still exists");
    })
  },
  // ====================================================================
  // 01_each-recommended-plugin-is-a-standalone-package.feature
  // ====================================================================
  ...[
    { example: "", mode: "with the recommended set", withOptional: false, packages: CORE },
    { example: "E5", mode: "with optional plugins", withOptional: true, packages: [...CORE, "pm-market-research"] }
  ].map((row) => ({
    name: `pinned-planner-is-packaged-for-cowork/01 ${row.example ? `${row.example} · ` : ""}packaged ${row.mode}`,
    run: () => withTree(async (dir) => {
      const result = await packagePlanner({ sha: PINNED, withOptional: row.withOptional, source: { dir, head: PINNED } });
      assert.deepEqual(names(result), row.packages);
    })
  })),
  {
    name: "pinned-planner-is-packaged-for-cowork/01 E6 · pm-ai-shipping is never packaged",
    run: () => withTree(async (dir) => {
      const result = await packagePlanner({ sha: PINNED, withOptional: true, source: { dir, head: PINNED } });
      assert.ok(!names(result).includes("pm-ai-shipping"));
    })
  },
  {
    name: "pinned-planner-is-packaged-for-cowork/01 E7 · a package is its plugin folder plus the licence",
    run: () => withTree(async (dir) => {
      const result = await packagePlanner({ sha: PINNED, source: { dir, head: PINNED } });
      const { files } = result.packages.find((entry) => entry.name === "pm-execution");
      const expected = {
        ".claude-plugin/plugin.json": await readFile(path.join(dir, "pm-execution", ".claude-plugin", "plugin.json")),
        "skills/pm-execution-skill/SKILL.md": await readFile(path.join(dir, "pm-execution", "skills", "pm-execution-skill", "SKILL.md")),
        "commands/run.md": await readFile(path.join(dir, "pm-execution", "commands", "run.md")),
        LICENSE: await readFile(path.join(dir, "LICENSE"))
      };
      assert.deepEqual(Object.keys(files).sort(), Object.keys(expected).sort(), "every file under pm-execution/ plus LICENSE");
      for (const [name, bytes] of Object.entries(expected)) assert.ok(Buffer.from(files[name]).equals(bytes), `${name} has the tree's bytes`);
    })
  },
  {
    name: "pinned-planner-is-packaged-for-cowork/01 E8 · a package holds nothing from a sibling folder or the root besides the licence",
    run: () => withTree(async (dir) => {
      const result = await packagePlanner({ sha: PINNED, source: { dir, head: PINNED } });
      const paths = Object.keys(result.packages.find((entry) => entry.name === "pm-execution").files);
      assert.ok(!paths.includes("README.md"), "no root README.md");
      assert.ok(!paths.some((entry) => entry.startsWith("pm-product-discovery/") || entry.includes("pm-product-discovery")), "nothing from pm-product-discovery/");
      assert.ok(!paths.some((entry) => entry.startsWith(".git")), "nothing from .git");
    })
  },
  {
    name: "pinned-planner-is-packaged-for-cowork/01 a plugin folder without its manifest is refused",
    run: () => withTree(async (dir) => {
      const result = await packagePlanner({ sha: PINNED, source: { dir, head: PINNED } });
      assert.equal(result.reason, "plugin-missing");
      assert.match(result.message, /pm-product-strategy/);
      assert.deepEqual(result.packages, []);
    }, { omitManifest: "pm-product-strategy" })
  }
];
