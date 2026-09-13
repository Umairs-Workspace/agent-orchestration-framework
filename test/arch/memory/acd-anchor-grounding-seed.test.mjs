import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EDGE_KEYS, GROUND_VALUES } from "../../../src/work/loops.mjs";
import { GROUND_VERDICTS, buildGroundednessReport } from "../../../src/work/loops-checks.mjs";
import { functionBody, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const checksPath = path.join(root, "src/work/loops-checks.mjs");
const endpoint = (raw) => ({ raw, resolved: true });

function graph(seedKind, ground) {
  return {
    source: path.join(root, ".aof", "loops"), present: true, findings: [], nodes: [
      {
        id: `${seedKind}:seed`, kind: seedKind, path: path.join(root, "seed.md"),
        fields: { ground: { kind: "enum", value: ground } },
        edges: { "data-feed": [endpoint("loop:a")] },
      },
      { id: "loop:a", kind: "loop", path: path.join(root, "a.md"), fields: {}, edges: { monitoring: [endpoint("loop:b")] } },
      { id: "loop:b", kind: "loop", path: path.join(root, "b.md"), fields: {}, edges: { monitoring: [endpoint("loop:a")] } },
    ],
  };
}

export const archTests = [
  {
    name: "arch/55 FF-5502: grounding seeds are kind-neutral while edge vocabulary and SCC decomposition stay frozen",
    run: async () => {
      // 59/ADR-001 §3's `reporting` joins the set the SCC decomposition floods over. 55's claim is
      // that the edge vocabulary is frozen and the traversal reads all of it, not that it is five.
      assert.deepEqual([...EDGE_KEYS], ["data-feed", "target-setting", "monitoring", "veto", "parameter-tuning", "reporting"]);
      assert.deepEqual([...GROUND_VERDICTS].sort(), ["anchored", "exogenous-only", "self-referential", "stale"].sort());
      for (const seedKind of ["actor", "anchor"]) {
        for (const ground of GROUND_VALUES) {
          const component = buildGroundednessReport(graph(seedKind, ground)).components.find((entry) => entry.members.includes("loop:a"));
          assert.deepEqual(component.members, ["loop:a", "loop:b"]);
          assert.deepEqual(component.groundClasses, [ground]);
          assert.equal(component.verdict, ground === "exogenous" ? "exogenous-only" : "anchored");
        }
      }

      const source = stripComments(await readFile(checksPath, "utf8"));
      const body = functionBody(source, "export function decomposeLoopGraph(model)");
      assert.ok(body && body.length > 200, "the SCC implementation body was found and is non-vacuous");
      assert.equal(createHash("sha256").update(body).digest("hex"), "14fad85dc54cbf3150c6eb62cf23a7c483385bbe5d905b7b52e9e6bf5845c650", "the milestone-52 SCC body remains byte-identical");
      assert.doesNotMatch(body, /ground|observes|resolution|verdict|anchor/i, "grounding widens the seed set outside the unchanged SCC decomposition");
      assert.match(body, /const \{ ids, adjacency \} = graph\(model\)/);
      assert.match(body, /lowlinks/);
    },
  },
];
