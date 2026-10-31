// engine — milestone 179 / story 01. The knowledge-engine port answers four verbs and routes each
// by the corpora a backend declares (179/ADR-001).
//
//   task 00 (`00_the-port-routes-by-declared-corpus.feature`) — the four verbs, routing, the record
//     backend's ingest-as-reindex, the structured miss and the keyed status.
//   task 01 (`01_a-misdeclared-backend-is-refused-at-construction.feature`) — the construction
//     refusals and the frozen vocabularies. Its FF-17901 scenario is the arch control
//     `test/arch/memory/acd-knowledge-engine-port.test.mjs`.
//
// THE FIXTURE is the feature's: two in-memory stubs that record every call they receive and answer
// with their own name and the arguments they were given. "records" is a record backend (reindex,
// recall, status over RECORD_CORPORA); "edges" is an engine backend (ingest, relations, status over
// code). The port is driven by stubs alone — no graphify, config or disk.
import assert from "node:assert/strict";
import { createKnowledgeEngine, KNOWLEDGE_CORPORA, ENGINE_VERBS, RECORD_CORPORA } from "@aof/knowledge/engine";

function stub(name, corpora, methods) {
  const calls = [];
  const backend = { name };
  if (corpora !== undefined) backend.corpora = corpora;
  for (const method of methods) {
    backend[method] = async (...args) => {
      calls.push({ method, args });
      return { from: name, method, args };
    };
  }
  return { backend, calls };
}

const records = () => stub("records", RECORD_CORPORA, ["reindex", "recall", "status"]);
const edges = () => stub("edges", { code: ["ingest", "relations", "status"] }, ["ingest", "relations", "status"]);

function compose(...stubs) {
  return { port: createKnowledgeEngine({ backends: stubs.map((each) => each.backend) }), stubs };
}

const ctx = Object.freeze({ projectRoot: "/fixture" });
const scope = Object.freeze({ area: "adr" });

const assertMiss = (answer, corpus, verb, backends) => {
  assert.deepEqual(answer, { served: false, code: "corpus-unserved", corpus, verb, backends });
  assert.ok(Object.isFrozen(answer), "the miss is frozen");
};

// Task 00's routing outline: each verb reaches the backend that declared its pair, with the
// arguments the backend's own signature takes.
const ROUTES = [
  { call: 'recall "pin line endings" scoped to area adr', backend: "records", ask: (port) => port.recall("pin line endings", scope, { limit: 5 }, ctx), received: { method: "recall", args: ["pin line endings", scope, { limit: 5 }, ctx] } },
  { call: 'relations of "a.mjs" and "b.mjs"', backend: "edges", ask: (port) => port.relations(["a.mjs", "b.mjs"], ctx), received: { method: "relations", args: [["a.mjs", "b.mjs"], ctx] } },
  { call: 'ingest of "code" with path "."', backend: "edges", ask: (port) => port.ingest("code", { path: "." }, ctx), received: { method: "ingest", args: ["code", { path: "." }, ctx] } },
  { call: 'status of "operator"', backend: "records", ask: (port) => port.status("operator", ctx), received: { method: "status", args: [ctx] } },
];

const INGESTS = [
  { corpus: "work", input: 'only "39"', value: { only: "39" }, only: "39" },
  { corpus: "work", input: "no input", value: undefined, only: null },
  { corpus: "imports", input: 'only "13"', value: { only: "13" }, only: "13" },
];

const UNSERVED = [
  { call: 'to ingest "planning"', corpus: "planning", verb: "ingest", ask: (port) => port.ingest("planning", {}, ctx) },
  { call: 'status of "planning"', corpus: "planning", verb: "status", ask: (port) => port.status("planning", ctx) },
];

// Task 01's refusal outline: a declaration the port cannot honour, and the entry the message names.
const MISDECLARED = [
  { declaration: "planning: ingest", corpora: { planning: ["ingest"] }, methods: ["ingest", "status"], entry: "planning" },
  { declaration: "code: search", corpora: { code: ["search"] }, methods: ["search", "status"], entry: "search" },
  { declaration: "code: relations", corpora: { code: ["relations"] }, methods: ["status"], entry: "relations" },
  { declaration: "work: recall", corpora: { work: ["recall"] }, methods: ["recall", "status"], entry: "work:recall" },
];

export const engineTests = [
  {
    name: "179/01 task 00: the port answers exactly four verbs",
    run() {
      const { port } = compose(records(), edges());
      assert.deepEqual(Object.keys(port).sort(), ["ingest", "recall", "relations", "status"]);
      assert.ok(Object.isFrozen(port), "the port is frozen");
    },
  },
  ...ROUTES.map((row) => ({
    name: `179/01 task 00 outline: each verb reaches the backend that declared its pair — ${row.call}`,
    async run() {
      const { port, stubs } = compose(records(), edges());
      const answer = await row.ask(port);
      const target = stubs.find((each) => each.backend.name === row.backend);
      assert.deepEqual(target.calls, [row.received], `${row.backend} receives the call`);
      assert.equal(answer.from, row.backend, "the answer is the declaring backend's");
      for (const other of stubs.filter((each) => each !== target)) assert.deepEqual(other.calls, [], `${other.backend.name} receives no call`);
    },
  })),
  ...INGESTS.map((row) => ({
    name: `179/01 task 00 outline: a record backend's ingest is its reindex — ${row.corpus} with ${row.input}`,
    async run() {
      const { port, stubs: [recordStub, edgeStub] } = compose(records(), edges());
      await port.ingest(row.corpus, row.value, ctx);
      assert.deepEqual(recordStub.calls, [{ method: "reindex", args: [row.only, ctx] }]);
      assert.deepEqual(edgeStub.calls, []);
    },
  })),
  ...UNSERVED.map((row) => ({
    name: `179/01 task 00 outline: an unserved pair is answered by the port, and no backend is called — ${row.call}`,
    async run() {
      const { port, stubs } = compose(records(), edges());
      assertMiss(await row.ask(port), row.corpus, row.verb, ["records", "edges"]);
      for (const each of stubs) assert.deepEqual(each.calls, [], `${each.backend.name} receives no call`);
    },
  })),
  {
    name: "179/01 task 00: a port without a code backend reports relations as unserved",
    async run() {
      const { port, stubs: [recordStub] } = compose(records());
      assertMiss(await port.relations(["a.mjs"], ctx), "code", "relations", ["records"]);
      assert.deepEqual(recordStub.calls, []);
    },
  },
  {
    name: "179/01 task 00: a port without a record backend reports recall as unserved",
    async run() {
      const { port, stubs: [edgeStub] } = compose(edges());
      assertMiss(await port.recall("anything", {}, {}, ctx), "work", "recall", ["edges"]);
      assert.deepEqual(edgeStub.calls, []);
    },
  },
  {
    name: "179/01 task 00: status with no corpus answers every declared corpus by name",
    async run() {
      const { port, stubs: [recordStub, edgeStub] } = compose(records(), edges());
      const answer = await port.status(undefined, ctx);
      assert.deepEqual(Object.keys(answer).sort(), ["code", "imports", "operator", "work"]);
      for (const corpus of ["work", "operator", "imports"]) assert.deepEqual(answer[corpus], { from: "records", method: "status", args: [ctx] }, corpus);
      assert.deepEqual(answer.code, { from: "edges", method: "status", args: ["code", ctx] });
      assert.equal(recordStub.calls.length, 1, "a record backend's corpus-free status is asked once for all its corpora");
      assert.deepEqual(edgeStub.calls, [{ method: "status", args: ["code", ctx] }]);
    },
  },
  ...MISDECLARED.map((row) => ({
    name: `179/01 task 01 outline: a misdeclared backend is refused naming the backend and the entry — ${row.declaration}`,
    run() {
      const bad = stub("bad", row.corpora, row.methods);
      assert.throws(() => compose(records(), bad), (error) => {
        assert.ok(error instanceof TypeError, "construction fails with a type error");
        assert.match(error.message, /backend "bad"/);
        assert.ok(error.message.includes(row.entry), `the message names ${row.entry}: ${error.message}`);
        return true;
      });
    },
  })),
  {
    name: '179/01 task 01: a backend that declares no corpora is refused',
    run() {
      const bare = stub("bare", undefined, ["ingest", "status"]);
      assert.throws(() => compose(bare), (error) => error instanceof TypeError && /backend "bare"/.test(error.message) && error.message.includes("corpora"));
    },
  },
  {
    name: "179/01 task 01: the vocabularies are the four corpora and the four verbs, and are frozen",
    run() {
      assert.deepEqual([...KNOWLEDGE_CORPORA], ["work", "code", "operator", "imports"]);
      assert.deepEqual([...ENGINE_VERBS], ["ingest", "recall", "relations", "status"]);
      for (const vocabulary of [KNOWLEDGE_CORPORA, ENGINE_VERBS]) {
        assert.ok(Object.isFrozen(vocabulary));
        assert.throws(() => vocabulary.push("search"), TypeError, "a vocabulary cannot be added to at runtime");
      }
      assert.deepEqual(Object.keys(RECORD_CORPORA).sort(), ["imports", "operator", "work"]);
      assert.ok(Object.isFrozen(RECORD_CORPORA));
      for (const verbs of Object.values(RECORD_CORPORA)) {
        assert.deepEqual([...verbs], ["ingest", "recall", "status"]);
        assert.ok(Object.isFrozen(verbs));
      }
    },
  },
];
