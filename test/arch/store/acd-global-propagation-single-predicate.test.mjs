import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const CALLER_FILES = [
  path.join("src/application/bindings/commands/run-start.mjs"),
  path.join("src/application/bindings/commands/run-complete.mjs"),
  path.join("src/application/bindings/commands/feedback.mjs"),
  path.join("src/application/bindings/mesh/launcher.mjs"),
];

export const archTests = [
  {
    name: "arch/34 ADR-004: global propagation enablement is decided by one shared predicate",
    async run() {
      const predicateSource = await readFile(path.join(repoRoot, "packages", "mesh", "src", "publisher.mjs"), "utf8");
      assert.ok(predicateSource.includes("mesh?.enabled === true"), "the shared predicate requires config.mesh.enabled === true");
      assert.ok(predicateSource.includes("mesh-global-disabled"), "the disabled result has the stable skipped code");

      for (const rel of CALLER_FILES) {
        const source = await readFile(path.join(repoRoot, rel), "utf8");
        assert.ok(source.includes("globalWorkPublisherServices"), `${rel} uses the shared global-work-publisher seam`);
        assert.ok(!source.includes("mesh.enabled"), `${rel} does not make its own mesh.enabled decision`);
        assert.ok(!source.includes("config?.mesh?.enabled"), `${rel} does not duplicate the optional-chain predicate`);
      }
      const launcher = await readFile(path.join(repoRoot, "packages/mesh/src/launcher.mjs"), "utf8");
      const adapter = await readFile(path.join(repoRoot, "src/application/bindings/mesh/launcher.mjs"), "utf8");
      for (const text of [launcher, adapter]) assert.match(text, /createMeshLauncher\(\{[^}]*publishGlobalWorkSnapshot/su);
      for (const forbidden of ["mesh.enabled", "config?.mesh?.enabled", "openGlobalWorkProjectionStore", "publishWorkspaceSnapshot"]) assert.ok(!launcher.includes(forbidden), forbidden);
      for (const name of ["feedback", "run-start", "run-complete"]) {
        const implementation = await readFile(path.join(repoRoot, `packages/work/src/commands/${name}.mjs`), "utf8");
        assert.ok(!implementation.includes("mesh.enabled") && !implementation.includes("config?.mesh?.enabled"), `${name}: the package command also delegates propagation policy`);
        assert.match(implementation, /threadPropagationWarnings\(/);
      }
    },
  },
];
