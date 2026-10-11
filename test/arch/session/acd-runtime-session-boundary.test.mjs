import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export function assertRuntimeSessionBoundary(source) {
  assert.doesNotMatch(source, /(?:app-server|thread\/start|turn\/start|claudeProjectsDir|\.jsonl|node-pty)/u,
    "FF-15401: loop sequencing must not own vendor protocol or transcript policy");
}

export const archTests = [{
  name: "arch/154 FF-15401 — runtime session boundary keeps protocol policy outside loop sequencing",
  run: async () => {
    for (const file of ["engine", "cycle", "wave"]) {
      const source = await readFile(new URL(`../../../packages/work-loop/src/${file}.mjs`, import.meta.url), "utf8");
      assertRuntimeSessionBoundary(source);
    }
    assert.throws(() => assertRuntimeSessionBoundary('client.send("turn/start", brief)'), /FF-15401/);
    assert.throws(() => assertRuntimeSessionBoundary('const file = claudeProjectsDir(cwd)'), /FF-15401/);
  },
}];
