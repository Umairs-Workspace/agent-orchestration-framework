import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { stripComments } from "../../support/source-slice.mjs";

const owner = "execution/src/runtime-selection.mjs";
export function assertRuntimeChoiceOwner(source, file) {
  if (file === owner) return;
  assert.doesNotMatch(stripComments(source), /\bfunction\s+resolveExecution(?:Resume)?\s*\(|\b(?:const|let)\s+resolveExecution(?:Resume)?\s*=/u,
    "FF-15402: execution choices and resume policy have one owner");
}
export const archTests = [{
  name: "arch/154 FF-15402 — runtime choice and provenance have one owner",
  run: async () => {
    const packages = new URL("../../../packages/", import.meta.url);
    let seen = 0;
    async function walk(url, prefix) {
      for (const entry of await readdir(url, { withFileTypes: true })) {
        const file = `${prefix}${entry.name}`;
        if (entry.isDirectory()) await walk(new URL(`${entry.name}/`, url), `${file}/`);
        else if (entry.name.endsWith(".mjs")) { seen++; assertRuntimeChoiceOwner(await readFile(new URL(entry.name, url), "utf8"), file); }
      }
    }
    for (const pkg of await readdir(packages, { withFileTypes: true })) {
      if (!pkg.isDirectory()) continue;
      try { await walk(new URL(`${pkg.name}/src/`, packages), `${pkg.name}/src/`); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    assert.ok(seen > 200, "the production tree was actually read");
    assertRuntimeChoiceOwner("export function resolveExecution() {}", owner);
    assert.throws(() => assertRuntimeChoiceOwner("export function resolveExecution() {}", "work-loop/src/engine.mjs"), /FF-15402/);
    assert.throws(() => assertRuntimeChoiceOwner("const resolveExecutionResume = () => {};", "core/src/model.mjs"), /FF-15402/);
  },
}];
