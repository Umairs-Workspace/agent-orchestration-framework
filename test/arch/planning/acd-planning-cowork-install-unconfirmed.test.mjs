// Fitness functions FF-16506 (milestone 165 / ADR-001) and FF-16507 (ADR-006):
// FF-16506 — "The cowork lock entry records `cowork.installConfirmed: false`, and no
//  planning-init output line claims a cowork install happened."
// FF-16507 — "A cowork run writes nothing inside the target project except
//  `.aof/aof.lock.json`; every package path its lock entry records is relative and
//  under `cowork/`."
//
// aof cannot observe Cowork, so it can write the packages and say how to upload them,
// but never that they are installed. The packages are the same for every project, so
// they live once in the aof home, and the committed lock names them by a path that is
// not machine-specific. Proofs:
//  1. A real cowork run (sha, planner tree and aof home injected) records
//     `installConfirmed: false` on the cowork entry.
//  2. No line of the rendered output — notes, summary, the whole face — contains
//     "installed", and the run says the install is not confirmed.
//  3. The planning-init source never assigns `installConfirmed: true`.
//  4. After a real run the project holds only `.aof/aof.lock.json`, the packages are in
//     the aof home, and every recorded package path is relative and under `cowork/`.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initPlanning, planningEntries, planningLockPath } from "../../../packages/core/src/planning-init.mjs";
import { planningInitCommand } from "../../../packages/core/src/commands/planning-init.mjs";

const SHA = "5042ff6169e0df49086c846f69bf7b6cdb67a6de";
const sourcePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "packages", "core", "src", "planning-init.mjs");

async function plannerTree() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-arch-cowork-tree-"));
  for (const name of ["pm-execution", "pm-product-discovery", "pm-product-strategy", "pm-market-research"]) {
    await mkdir(path.join(dir, name, ".claude-plugin"), { recursive: true });
    await writeFile(path.join(dir, name, ".claude-plugin", "plugin.json"), JSON.stringify({ name }));
  }
  await writeFile(path.join(dir, "LICENSE"), "MIT License\n");
  return dir;
}

async function filesUnder(root, relative = "") {
  const found = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...(await filesUnder(root, child)));
    else found.push(child);
  }
  return found.sort();
}

export const archTests = [
  {
    name: "arch/FF-16506: a cowork run records installConfirmed false, and no output line claims an install",
    run: async () => {
      const repo = await mkdtemp(path.join(os.tmpdir(), "aof-arch-cowork-run-"));
      const aofHome = await mkdtemp(path.join(os.tmpdir(), "aof-arch-cowork-home-"));
      const tree = await plannerTree();
      try {
        for (const withOptional of [false, true]) {
          const notes = [];
          const result = await initPlanning({
            targetDir: repo,
            runtime: "cowork",
            sha: SHA,
            withOptional,
            force: withOptional,
            aofHome,
            plannerSource: { dir: tree, head: SHA },
            log: (line) => notes.push(line)
          });
          assert.equal(result.manifestWritten, true, "the cowork entry was written");
          const entry = planningEntries(JSON.parse(await readFile(planningLockPath(repo), "utf8"))).cowork;
          assert.equal(entry.cowork.installConfirmed, false, "installConfirmed is false");
          const output = planningInitCommand.cli.render({ ...result, notes });
          assert.deepEqual(output.split("\n").filter((line) => /installed/i.test(line)), [], "no line claims an install");
          assert.match(output, /install is not confirmed/);
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(aofHome, { recursive: true, force: true });
        await rm(tree, { recursive: true, force: true });
      }
    }
  },
  {
    name: "arch/FF-16506: planning-init never records a confirmed Cowork install",
    run: async () => {
      const source = await readFile(sourcePath, "utf8");
      assert.ok(/installConfirmed:\s*false/.test(source), "the entry is written unconfirmed");
      assert.ok(!/installConfirmed:\s*true/.test(source), "installConfirmed is never set true");
    }
  },
  {
    name: "arch/FF-16507: a cowork run writes only the lock in the project, and records every package relative to the aof home",
    run: async () => {
      const repo = await mkdtemp(path.join(os.tmpdir(), "aof-arch-cowork-project-"));
      const aofHome = await mkdtemp(path.join(os.tmpdir(), "aof-arch-cowork-home-"));
      const tree = await plannerTree();
      try {
        const result = await initPlanning({
          targetDir: repo,
          runtime: "cowork",
          sha: SHA,
          withOptional: true,
          aofHome,
          plannerSource: { dir: tree, head: SHA },
          log: () => {}
        });
        assert.equal(result.manifestWritten, true, "the cowork run succeeded");
        assert.deepEqual(await filesUnder(repo), [".aof/aof.lock.json"], "the project holds only the lock");
        const entry = planningEntries(JSON.parse(await readFile(planningLockPath(repo), "utf8"))).cowork;
        const recorded = [entry.cowork.bundle, ...entry.plugins.map((plugin) => plugin.package)];
        assert.equal(recorded.length, 5, "the bundle and four planner packages are recorded");
        for (const recordedPath of recorded) {
          assert.ok(!path.isAbsolute(recordedPath) && recordedPath.startsWith("cowork/"), `${recordedPath} is relative and under cowork/`);
          assert.ok(existsSync(path.join(aofHome, recordedPath)), `${recordedPath} exists under the aof home`);
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(aofHome, { recursive: true, force: true });
        await rm(tree, { recursive: true, force: true });
      }
    }
  }
];
