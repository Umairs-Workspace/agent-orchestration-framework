// FF-5312 — the production registry has one home: <workspace.aofDir>/loops.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLoops } from "../../../src/work/loops.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const sourceDir = path.join(root, "src", "bundle", "loops");
const installedDir = path.join(root, ".aof", "loops");

async function sourceModules(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await sourceModules(absolute));
    else if (entry.isFile() && entry.name.endsWith(".mjs")) files.push(absolute);
  }
  return files;
}

function actorRecord(id) {
  return `---\nid: actor:${id}\nkind: actor\ntitle: ${id}\nground: exogenous\n---\n# ${id}\n`;
}

export const archTests = [
  {
    name: "arch/53 FF-5312: workspace.aofDir is the sole production registry home",
    run: async () => {
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-registry-home-"));
      try {
        const aofDir = path.join(temp, ".aof");
        const firstWork = path.join(temp, "wiki", "work");
        const secondWork = path.join(temp, "docs", "stream");
        await mkdir(path.join(aofDir, "loops"), { recursive: true });
        await mkdir(path.join(firstWork, "loops"), { recursive: true });
        await writeFile(path.join(aofDir, "loops", "operator.md"), actorRecord("operator"));
        await writeFile(path.join(firstWork, "loops", "wrong.md"), actorRecord("wrong"));

        const first = await loadLoops({ projectRoot: temp, workDir: firstWork, aofDir });
        const second = await loadLoops({ projectRoot: temp, workDir: secondWork, aofDir });
        assert.equal(first.source, path.join(aofDir, "loops"));
        assert.equal(second.source, first.source, "work.dir does not influence the home");
        assert.deepEqual(first.nodes.map((node) => node.id), ["actor:operator"]);
        assert.equal(first.nodes.some((node) => node.id === "actor:wrong"), false, "old work.dir registry is ignored");

        const stringOverload = await loadLoops(aofDir);
        assert.equal(stringOverload.source, first.source, "the fixture-only string overload remains <base>/loops");
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/53 FF-5312: commands pass the workspace object and no src caller rebuilds the home",
    run: async () => {
      const commandFiles = ["loops-show.mjs", "loops-graph.mjs", "loops-validate.mjs"];
      for (const name of commandFiles) {
        const source = await readFile(path.join(root, "src", "commands", name), "utf8");
        assert.match(source, /loadLoops\(ctx\.workspace\)/, `${name}: passes the workspace object`);
        assert.doesNotMatch(source, /loadLoops\(ctx\.workspace\.workDir\)/, `${name}: no old string call`);
        assert.doesNotMatch(source, /path\.(?:join|resolve)\([^\n]*["']loops["']/, `${name}: does not build the home`);
      }
      const modules = await sourceModules(path.join(root, "src"));
      for (const file of modules) {
        if (file === path.join(root, "src", "work", "loops.mjs")) continue;
        const source = await readFile(file, "utf8");
        assert.doesNotMatch(source, /loadLoops\(\s*(?:["'`]|ctx\.workspace\.workDir)/, `${path.relative(root, file)}: no production string door`);
      }
    },
  },
  {
    name: "arch/53 FF-5312: source, installed dogfood and retired work-stream home are exact",
    run: async () => {
      const names = (await readdir(sourceDir)).filter((name) => name.endsWith(".md")).sort();
      assert.ok(names.length >= 9);
      const installed = (await readdir(installedDir)).filter((name) => name.endsWith(".md")).sort();
      assert.ok(installed.length > 0, `the sweep of ${installedDir} found no .md record — a walk whose subject set empties must FAIL naming the directory (119/ADR-003 §4)`);
      assert.deepEqual(installed, names);
      for (const name of names) {
        assert.equal(await readFile(path.join(installedDir, name), "utf8"), await readFile(path.join(sourceDir, name), "utf8"), `${name}: installed bytes equal source`);
      }
      assert.equal(existsSync(path.join(root, "wiki", "work", "loops")), false, "the old non-item directory is gone");
      for (const name of names) {
        let ignored = true;
        try { execFileSync("git", ["check-ignore", "-q", "--", `.aof/loops/${name}`], { cwd: root }); } catch { ignored = false; }
        assert.equal(ignored, false, `${name}: installed record is visible to git`);
      }
    },
  },
];
