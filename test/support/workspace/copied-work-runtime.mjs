import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { productionDependencyDirs } from "../../../scripts/dependency-inventory.mjs";

// Mutation fixtures need an independent work package as well as the core adapters.
// Other production dependencies are read-only aliases; never mutate those targets.
export function copyWorkRuntime(repoRoot, destination) {
  assert.equal(path.dirname(fs.realpathSync(destination)), fs.realpathSync(os.tmpdir()),
    "the fixture must be a newly-created directory directly under the OS temp root");
  assert.equal(fs.readdirSync(destination).length, 0, "the copy destination is empty");
  fs.cpSync(path.join(repoRoot, "src"), path.join(destination, "src"), { recursive: true });
  const workCopy = path.join(destination, "packages", "work");
  fs.cpSync(path.join(repoRoot, "packages", "work"), workCopy, {
    recursive: true, filter: source => path.basename(source) !== "node_modules",
  });
  for (const dependency of productionDependencyDirs(repoRoot)) {
    const rel = path.relative(repoRoot, dependency);
    if (rel.split(path.sep).slice(1).includes("node_modules")) continue;
    const alias = path.join(destination, rel);
    fs.mkdirSync(path.dirname(alias), { recursive: true });
    const target = rel.replaceAll("\\", "/") === "node_modules/@aof/work" ? workCopy : dependency;
    fs.symlinkSync(target, alias, "junction");
  }
}
