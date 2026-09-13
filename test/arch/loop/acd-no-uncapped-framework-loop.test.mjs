// FF-6902: framework ceilings are declarations backed by real authorities.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LOOP_BOUND_CONFIG_RESOLVERS } from "../../../src/loop-bounds.mjs";
import { loadLoops } from "../../../src/work/loops.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
function ceilingProblems(model) {
  const problems = [];
  for (const node of model.nodes.filter((entry) => entry.kind === "loop")) {
    const entries = Array.isArray(node.fields.ceiling) ? node.fields.ceiling : [];
    if (entries.length === 0) problems.push(`${node.id}: no parsed ceiling`);
    for (const entry of entries) {
      if (entry.kind === "uncapped" || entry.kind === "unknown") {
        problems.push(`${node.id}: ceiling is ${entry.kind}`);
      }
    }
  }
  for (const finding of model.findings.filter((entry) => entry.code === "loop-ceiling-pointer-unresolved")) {
    problems.push(`${path.basename(finding.path)}: ${finding.message}`);
  }
  return problems;
}

function loopBoundConfigPointers(model) {
  return model.nodes
    .filter((entry) => entry.kind === "loop")
    .flatMap((node) => {
      const entries = Array.isArray(node.fields.ceiling) ? node.fields.ceiling : [];
      return entries
        .filter((entry) => entry.kind === "pointer"
          && entry.pointer?.scheme === "config"
          && typeof entry.pointer.operand === "string"
          && entry.pointer.operand.startsWith("work.loop."))
        .map((entry) => ({ nodeId: node.id, operand: entry.pointer.operand }));
    });
}

function resolverProblems(model, resolvers = LOOP_BOUND_CONFIG_RESOLVERS) {
  const problems = [];
  for (const pointer of loopBoundConfigPointers(model)) {
    if (typeof resolvers[pointer.operand] !== "function") {
      problems.push(`${pointer.nodeId}: config ceiling ${pointer.operand} has no callable resolver`);
    }
  }
  return problems;
}

export const archTests = [
  {
    name: "arch/69 FF-6902 (acd-no-uncapped-framework-loop): every framework ceiling is none or a pointer to a real authority",
    run: async () => {
      const model = await loadLoops(path.join(root, "src", "bundle"));
      assert.ok(model.nodes.filter((node) => node.kind === "loop").length >= 7);
      const configCeilings = loopBoundConfigPointers(model);
      assert.ok(configCeilings.length > 0, "the real registry supplied a nonzero floor of kind:pointer config ceilings");
      assert.deepEqual(ceilingProblems(model), []);
      assert.deepEqual(resolverProblems(model), []);
      for (const pointer of configCeilings) {
        assert.equal(typeof LOOP_BOUND_CONFIG_RESOLVERS[pointer.operand], "function", `${pointer.nodeId}: ${pointer.operand} resolves to a callable`);
      }
      assert.equal(model.findings.some((finding) => finding.code === "loop-ceiling-uncapped"), false);
      assert.equal(model.findings.some((finding) => finding.code === "loop-ceiling-pointer-unresolved"), false);
      assert.equal(
        resolverProblems(model, {}).length,
        configCeilings.length,
        "removing the resolver registry cannot pass on key-name recognition alone",
      );
    },
  },
  {
    name: "arch/69 FF-6902 (acd-no-uncapped-framework-loop): production loading rejects a framework module ceiling whose export is absent",
    async run() {
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-ff6902-"));
      try {
        await mkdir(path.join(temp, ".aof", "loops"), { recursive: true });
        await mkdir(path.join(temp, "src"), { recursive: true });
        await writeFile(path.join(temp, "src", "authority.mjs"), "export const other = 1;\n");
        await writeFile(path.join(temp, ".aof", "loops", "plant.md"), [
          "---", "id: loop:plant", "kind: loop", "title: Plant", "controlled: state",
          "reference: [prose:README.md]", "measurement: [prose:README.md]", "actuator: [prose:README.md]",
          "cadence: event:per-item", "ceiling: [module:src/authority.mjs#missing]", "owner: unknown",
          "optimizing: false", "---", "# Plant", "",
        ].join("\n"));
        const model = await loadLoops({ aofDir: path.join(temp, ".aof"), projectRoot: temp });
        assert.match(ceilingProblems(model).join("\n"), /module:src\/authority\.mjs#missing/u);
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  },
];
