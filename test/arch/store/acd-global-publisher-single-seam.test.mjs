import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const CALLER_FILES = [
  path.join("packages/core/src/application/bindings/commands/run-start.mjs"),
  path.join("packages/core/src/application/bindings/commands/run-complete.mjs"),
  path.join("packages/core/src/application/bindings/commands/feedback.mjs"),
  path.join("packages/core/src/application/bindings/mesh/launcher.mjs"),
];

export const archTests = [
  {
    name: "arch/34 ADR-004: mutation commands and launcher reach the global store only through the shared publisher seam",
    async run() {
      for (const rel of CALLER_FILES) {
        const source = await readFile(path.join(repoRoot, rel), "utf8");
        assert.ok(source.includes("globalWorkPublisherServices"), `${rel} receives the shared publisher seam`);
        assert.ok(!source.includes("global-work-store.mjs"), `${rel} does not import the SQLite store directly`);
        assert.ok(!source.includes("openGlobalWorkProjectionStore"), `${rel} does not open the global store directly`);
        assert.ok(!source.includes("publishWorkspaceSnapshot"), `${rel} does not call the projection writer directly`);
      }
      const launcher = await readFile(path.join(repoRoot, "packages/mesh/src/launcher.mjs"), "utf8");
      const adapter = await readFile(path.join(repoRoot, "packages/core/src/application/bindings/mesh/launcher.mjs"), "utf8");
      for (const text of [launcher, adapter]) assert.match(text, /createMeshLauncher\(\{[^}]*publishGlobalWorkSnapshot/su);
      for (const forbidden of ["mesh.enabled", "config?.mesh?.enabled", "openGlobalWorkProjectionStore", "publishWorkspaceSnapshot"]) assert.ok(!launcher.includes(forbidden), forbidden);
      for (const name of ["feedback", "run-start", "run-complete"]) {
        const implementation = await readFile(path.join(repoRoot, `packages/work/src/commands/${name}.mjs`), "utf8");
        for (const forbidden of ["global-work-store.mjs", "openGlobalWorkProjectionStore", "publishWorkspaceSnapshot"]) {
          assert.ok(!implementation.includes(forbidden), `${name}: the package command does not access ${forbidden}`);
        }
        const binding = await readFile(path.join(repoRoot, `packages/core/src/application/bindings/commands/${name}.mjs`), "utf8");
        assert.match(binding, /Command\(\{[^}]*threadPropagationWarnings/);
      }
      const composition = await readFile(path.join(repoRoot, "packages/core/src/application/bindings/commands/feedback.mjs"), "utf8");
      assert.match(composition, /createFeedbackCommand\(\{[^}]*threadPropagationWarnings/);
    },
  },
];
