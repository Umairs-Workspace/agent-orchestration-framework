// The package's seams: the contribution core registers, the doctor lane's factory, and a command
// reached through a registry built from this package's contribution alone. The two cases that
// moved here from @aof/work's native suites keep their claims; the contribution cases are new with
// the package. node:assert/strict, `{ name, run }` shape.
import assert from "node:assert/strict";
import { createCommandRegistry } from "@aof/contracts/commands";
import { createDiagramsContribution, DIAGRAM_COMMAND_IDS } from "@aof/diagrams/contribution";
import { createDiagramFileCommand } from "@aof/diagrams/commands/file";
import { createDoctorDiagrams } from "@aof/diagrams/doctor-lane";
import { createDiagramCapabilityCommand } from "@aof/diagrams/commands/capability";

export const packageSeamsTests = [
  {
    name: "diagrams/contribution: the contribution is frozen, named for the package, and admits only owned ids",
    run: async () => {
      const { diagramFileCommand } = createDiagramFileCommand({ resolveItemExact: async () => null });
      const contribution = createDiagramsContribution([diagramFileCommand]);
      assert.equal(contribution.name, "@aof/diagrams");
      assert.ok(Object.isFrozen(contribution) && Object.isFrozen(contribution.commands));
      assert.deepEqual([...DIAGRAM_COMMAND_IDS], ["diagram:plan", "diagram:export", "diagram:file", "diagram:scene", "diagram:capability"]);
      assert.throws(() => createDiagramsContribution([]), /non-empty/);
      assert.throws(() => createDiagramsContribution([{ id: "work:list", run: async () => ({}) }]), /not owned by diagrams: work:list/);
    },
  },
  {
    name: "diagrams/contribution: diagram file commands retain remote absence and validation via shared invocation",
    run: async () => {
      const { diagramFileCommand } = createDiagramFileCommand({ resolveItemExact: async () => ({ ref: "01", reportedBy: "peer" }) });
      const registry = createCommandRegistry([createDiagramsContribution([diagramFileCommand])]);
      const result = await registry.invoke("diagram:file", { ref: "01", file: "ADR-001-fixture.svg" }, {});
      assert.equal(result.present, false);
      assert.equal(result.onThisNode, false);
      assert.equal(result.reportedBy, "peer");
      await assert.rejects(registry.invoke("diagram:file", { ref: "01", file: "../secret.svg" }, {}), (error) => error.code === "diagram-file-invalid");
    },
  },
  {
    name: "diagrams/capability: the editor follows the one reader's answer, and the CLI renders both states",
    run: async () => {
      const seen = [];
      const { diagramCapabilityCommand } = createDiagramCapabilityCommand({ resolveWorkDiagrams: (config) => { seen.push(config); return config.on ? { enabled: true, generator: "diagram-design" } : { enabled: false, generator: "off" }; } });
      assert.equal(diagramCapabilityCommand.id, "diagram:capability");
      const on = await diagramCapabilityCommand.run({}, { workspace: { config: { on: true } } });
      assert.deepEqual(on, { absent: false, enabled: true, editor: true, generator: "diagram-design" });
      const off = await diagramCapabilityCommand.run({}, { workspace: { config: {} } });
      assert.deepEqual(off, { absent: false, enabled: false, editor: false, generator: "off" });
      assert.deepEqual(seen, [{ on: true }, {}]);
      assert.match(diagramCapabilityCommand.cli.render(on), /editor is available/);
      assert.match(diagramCapabilityCommand.cli.render(off), /editor is hidden/);
      assert.deepEqual(diagramCapabilityCommand.cli.argv([], {}), {});
      const registry = createCommandRegistry([createDiagramsContribution([diagramCapabilityCommand])]);
      assert.deepEqual(await registry.invoke("diagram:capability", {}, { workspace: { config: {} } }), off);
    },
  },
  {
    name: "diagrams/doctor-lane: diagram checks receive caller configuration without loading application configuration",
    run: () => {
      const seen = [];
      const api = createDoctorDiagrams({ resolveWorkDiagrams: (config) => { seen.push(config); return { enabled: true, formats: ["svg", "png"] }; } });
      assert.deepEqual(seen, []);
      const config = { supplied: true };
      assert.deepEqual(api.diagramsGroup({ items: [] }, { config }), []);
      assert.deepEqual(seen, [config]);
    },
  },
  {
    name: "diagrams/doctor-lane: the listing probe reads through the injected reader, answers null for an absent folder, and refuses to run without one",
    run: async () => {
      const calls = [];
      const { diagramListing } = createDoctorDiagrams({
        resolveWorkDiagrams: () => ({ enabled: false, formats: [] }),
        readdir: async (dir) => {
          calls.push(dir);
          if (dir.endsWith("absent/diagrams")) { const error = new Error("ENOENT"); error.code = "ENOENT"; throw error; }
          return [{ name: "ADR-001-a.svg", isFile: () => true }, { name: "nested", isFile: () => false }, { name: "ADR-001-a.html", isFile: () => true }];
        },
      });
      assert.deepEqual(await diagramListing("/items/present"), ["ADR-001-a.html", "ADR-001-a.svg"]);
      assert.equal(await diagramListing("/items/absent"), null);
      assert.ok(calls.every((dir) => dir.endsWith("diagrams")), "the probe reads the item's diagrams folder, named through the layout");
      const unwired = createDoctorDiagrams({ resolveWorkDiagrams: () => ({ enabled: false, formats: [] }) });
      await assert.rejects(unwired.diagramListing("/items/present"), /no directory reader/);
    },
  },
];
