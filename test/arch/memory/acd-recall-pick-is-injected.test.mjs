import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness function: acd-recall-pick-is-injected — FF-20102 (201/ADR-002 §3).
//
// THE INVARIANT — knowledge starts no model. The pick's contract leaf, the memory seam and its
// routed door import no `node:child_process` and nothing from `@aof/execution`. The pick reaches a
// process only through the `pickRecords` capability core injects, the way `record-recall` reaches
// the ledger through `recordRecall`.
//
// WHY A CONTROL. The cheapest way to make the pick work is to spawn `claude` where the shortlist
// is built. Every test with a stub picker stays green through that, and knowledge then owns a
// launch argv, an environment scrub and a time limit that 201/ADR-004 gives to one execution leaf
// (FF-20103). Two legs: the imports, with red probes, and the behaviour that the absence implies:
// a seam handed no picker asks nothing and says so on the result.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import { recall } from "@aof/knowledge/memory/local-retrieval";
import { RECORD_CORPORA } from "@aof/knowledge/engine";
const runMemory = _aofApplication.knowledge.work.memory.runMemory;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The knowledge modules on the pick's path.
const PICK_PATH = [
  "packages/knowledge/src/memory/recall-pick.mjs",
  "packages/knowledge/src/memory.mjs",
  "packages/knowledge/src/commands/memory.mjs",
];

// Every module specifier a source names: static, side-effect and dynamic imports, and `require`,
// read by the one extractor (FF-11901).
const importedSpecifiers = (code) => importSpecifiers(code).map((entry) => entry.specifier);

/** THE SHIPPED DETECTOR over one module's source: one message per forbidden import. */
export function startsAModelFailures(rel, source) {
  const failures = [];
  for (const specifier of importedSpecifiers(stripComments(source))) {
    if (/^(?:node:)?child_process$/u.test(specifier)) failures.push(`${rel} imports ${specifier}: knowledge starts no process for the pick (ADR-002 §3)`);
    if (/^@aof\/execution(?:\/|$)/u.test(specifier)) failures.push(`${rel} imports ${specifier}: the model call is execution's, reached only through the injected picker (ADR-002 §3)`);
  }
  return failures;
}

export const archTests = [
  {
    name: "arch/201 FF-20102: knowledge starts no model — the pick's leaf, the seam and its door import no child_process and nothing from @aof/execution",
    run: async () => {
      for (const rel of PICK_PATH) {
        const source = await readFile(path.join(repoRoot, rel), "utf8");
        // NON-VACUITY: each module is on the pick's path, so the absence is measured where it matters.
        assert.match(stripComments(source), /\bpick/iu, `${rel} is on the pick's path`);
        assert.ok(importedSpecifiers(stripComments(source)).length > 0, `${rel}: the import scan saw imports`);
        assert.deepEqual(startsAModelFailures(rel, source), []);
      }
      // The picker arrives as a parameter of the one core path, absent by default.
      const seam = stripComments(await readFile(path.join(repoRoot, PICK_PATH[1]), "utf8"));
      assert.match(seam, /async function runMemoryVerb\(input, \{.*\bpickRecords = null\b.*\} = \{\}\)/u, "runMemoryVerb takes pickRecords as an injected option, null by default");
    },
  },
  {
    name: "arch/201 FF-20102 (red probes): a child_process import, an @aof/execution import, a dynamic import and a require each fire; a comment does not",
    run: () => {
      const fires = (source, pattern) => assert.ok(startsAModelFailures("probe.mjs", source).some((failure) => pattern.test(failure)), `${JSON.stringify(source)} fires ${pattern}`);
      fires(`import { spawn } from "node:child_process";`, /imports node:child_process/u);
      fires(`import { execFile } from "child_process";`, /imports child_process/u);
      fires(`import { askModel } from "@aof/execution/model-ask";`, /imports @aof\/execution\/model-ask/u);
      fires(`const { askModel } = await import("@aof/execution/model-ask");`, /imports @aof\/execution\/model-ask/u);
      fires(`const cp = require("node:child_process");`, /imports node:child_process/u);
      assert.deepEqual(startsAModelFailures("probe.mjs", `// import { spawn } from "node:child_process";\nimport path from "node:path";`), []);
      assert.deepEqual(startsAModelFailures("probe.mjs", `import { x } from "@aof/execution-notes";`), [], "a package that only shares the prefix is not execution");
    },
  },
  {
    name: "arch/201 FF-20102: a seam handed no picker asks nothing — the block is the lexical one and the result says pick-unwired",
    run: async () => {
      const records = Array.from({ length: 8 }, (_, index) => ({
        recordType: "lesson", id: `R${index + 1}`, item: "50", itemSlug: "fixture", title: `Lesson ${index + 1}`, area: "tooling", stage: "build",
        kind: "near-miss", owner: "developer", status: "", summary: "", text: `worktree junction ${"ballast ".repeat(6 * (index + 1))}`.trim(),
        source: `50_milestone_fixture/RETROSPECTIVE.md:${index + 1}`,
      }));
      const backend = { name: "local", corpora: RECORD_CORPORA, recall: (query, scope, opts) => recall(query, scope, opts, { records }), reindex: async () => ({ recordCount: 8 }), status: async () => ({ backend: "local", recordCount: 8 }) };
      const { result } = await runMemory(["recall", "worktree junction", "--block"], { config: {}, resolveBackend: async () => backend, log: () => {} });
      assert.deepEqual(result.records.map((record) => record.id), ["R1", "R2", "R3", "R4", "R5"]);
      assert.deepEqual(result.pick, { mode: "lexical", code: "pick-unwired", shortlisted: 8, model: null });
    },
  },
];
