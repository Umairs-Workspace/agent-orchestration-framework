// FF-17901 — milestone 179 / ADR-001: the knowledge-engine port answers exactly the four verbs, and
// every backend's declaration stays inside the vocabulary with a method behind each declared verb.
//
// The port is reached through the assembled application, where the faces compose it, so a binding
// that wrapped or widened it would red here rather than in the package suite that builds it raw.
// The declaration half is proven at construction: the port refuses a misdeclared backend, so no
// misdeclared backend can stand behind a composed port. 179/02 added the case that no `code`
// backend declares `recall`, over the real graphify code backend.
//
// The check is exported so the red probe runs it over a planted port with a fifth verb.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { defaultApplication } from "aof/default-application";
import { computedDynamicImports, importSpecifiers } from "../../support/module-family.mjs";

const engine = defaultApplication.knowledge.engine;

// The FF-17901 check over any port: each failure names the verb that is missing or unexpected.
export function portFailures(port) {
  const failures = [];
  const keys = Object.keys(port);
  for (const verb of engine.ENGINE_VERBS) if (!keys.includes(verb)) failures.push(`missing verb "${verb}"`);
  for (const key of keys) if (!engine.ENGINE_VERBS.includes(key)) failures.push(`unexpected verb "${key}"`);
  for (const verb of keys) if (typeof port[verb] !== "function") failures.push(`verb "${verb}" is not a function`);
  if (!Object.isFrozen(port)) failures.push("the port is not frozen");
  return failures;
}

const recordStub = { name: "records", corpora: engine.RECORD_CORPORA, async reindex() {}, async recall() {}, async status() {} };

export const archTests = [
  {
    name: "arch/179/01 FF-17901 (acd-knowledge-engine-port): the assembled port answers exactly ingest, recall, relations and status",
    run() {
      assert.deepEqual([...engine.ENGINE_VERBS], ["ingest", "recall", "relations", "status"]);
      assert.deepEqual(portFailures(engine.createKnowledgeEngine({ backends: [] })), []);
      assert.deepEqual(portFailures(engine.createKnowledgeEngine({ backends: [recordStub] })), []);
    },
  },
  {
    name: "arch/179/01 FF-17901: a declared verb with no method, a verb or corpus outside the vocabulary, and a pair claimed twice are refused at construction",
    run() {
      const refused = (backend) => {
        try {
          engine.createKnowledgeEngine({ backends: [recordStub, backend] });
        } catch (error) {
          assert.ok(error instanceof TypeError, `a type error, not ${error?.name}`);
          return error.message;
        }
        assert.fail(`backend ${JSON.stringify(backend.corpora)} was composed into a port`);
      };
      assert.match(refused({ name: "bad", corpora: { code: ["relations"] }, async status() {} }), /backend "bad".*"relations"/);
      assert.match(refused({ name: "bad", corpora: { code: ["search"] }, async search() {} }), /backend "bad".*"search"/);
      assert.match(refused({ name: "bad", corpora: { planning: ["ingest"] }, async ingest() {} }), /backend "bad".*"planning"/);
      assert.match(refused({ name: "bad", corpora: { work: ["recall"] }, async recall() {} }), /backend "bad".*"work:recall"/);
    },
  },
  {
    name: "arch/179/02 FF-17901: the graphify code backend declares exactly code with ingest, relations and status, and no code backend declares recall",
    run() {
      const backend = engine.graphifyCodeBackend;
      assert.deepEqual(JSON.parse(JSON.stringify(backend.corpora)), { code: ["ingest", "relations", "status"] });
      assert.ok(!backend.corpora.code.includes("recall"), `backend "${backend.name}" declares code and must not declare recall`);
      assert.deepEqual(portFailures(engine.codeEngine), [], "the code readers' port answers exactly the four verbs");
      // It composes beside a record backend: the two declarations claim disjoint pairs.
      assert.doesNotThrow(() => engine.createKnowledgeEngine({ backends: [recordStub, backend] }));
    },
  },
  {
    name: "arch/179/01 FF-17901 red probe: a port that also exposes \"search\" fails, naming the unexpected verb",
    run() {
      const widened = Object.freeze({ ...engine.createKnowledgeEngine({ backends: [] }), search: async () => {} });
      assert.deepEqual(portFailures(widened), ['unexpected verb "search"']);
    },
  },
  {
    name: "arch/179/01 FF-17901: the port is a pure router — engine.mjs imports nothing, so no backend, config or fs reaches it",
    async run() {
      const source = await readFile(new URL("../../../packages/knowledge/src/engine.mjs", import.meta.url), "utf8");
      assert.deepEqual(importSpecifiers(source).map((entry) => entry.specifier), [], "engine.mjs has no external dependency");
      assert.deepEqual(computedDynamicImports(source), [], "engine.mjs computes no import");
    },
  },
  {
    name: "arch/179/01 FF-17901: the control is registered in the memory arch index",
    async run() {
      const index = await readFile(new URL("./index.mjs", import.meta.url), "utf8");
      assert.match(index, /from "\.\/acd-knowledge-engine-port\.test\.mjs"/);
      assert.match(index, /\.\.\.acdKnowledgeEnginePortTests,/);
    },
  },
];
