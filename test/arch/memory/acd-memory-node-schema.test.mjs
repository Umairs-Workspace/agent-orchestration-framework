// FF-18002 — milestone 180 / story 01, ADR-002..005.
//
// "`$defs/memory.properties.corpora.items.enum` equals `KNOWLEDGE_CORPORA` and requires `work`,
//  `imports`, `code`; `backends` property names are a subset of the `backend` enum and
//  `backends.graphify.extractionBackend`'s enum equals `GRAPHIFY_BACKENDS`; `memory.graph`'s
//  description carries the never-shared sentence; no `egress` property exists anywhere under
//  `$defs/memory`."
//
// The schema is enforced by the tests, not at load (180/ADR-001), so this control is what keeps the
// shipped schema's vocabularies the code's. Each leg is a pure function of a schema object, so the
// control is proven to bite by running it over a planted copy.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { KNOWLEDGE_CORPORA } from "@aof/knowledge/engine";
import { ALWAYS_SERVED_CORPORA, RECALL_PICK_DEFAULTS, RECALL_PICK_TIMEOUT_MS, readMemoryConfig } from "@aof/knowledge/memory-config";
import { GRAPHIFY_BACKENDS } from "../../../packages/knowledge/src/graphify-backends.mjs";

const SCHEMA_URL = new URL("../../../schemas/aof.schema.json", import.meta.url);
const NEVER_SHARED = "the work graph and the memory index are never shared";

const sorted = (values) => [...values].sort();

// Every property name declared at any depth under a schema node, through `properties`.
function propertyNames(node, out = []) {
  if (node === null || typeof node !== "object") return out;
  for (const [key, value] of Object.entries(node)) {
    if (key === "properties" && value && typeof value === "object") out.push(...Object.keys(value));
    propertyNames(value, out);
  }
  return out;
}

// The violations FF-18002 finds in one schema object; the shipped schema must return none.
function violations(schema) {
  const found = [];
  const memory = schema.$defs?.memory ?? {};
  const props = memory.properties ?? {};
  const corpora = props.corpora ?? {};
  if (JSON.stringify(sorted(corpora.items?.enum ?? [])) !== JSON.stringify(sorted(KNOWLEDGE_CORPORA))) found.push("corpora items enum is not KNOWLEDGE_CORPORA");
  const required = (corpora.allOf ?? []).map((rule) => rule?.contains?.const).filter(Boolean);
  if (JSON.stringify(sorted(required)) !== JSON.stringify(sorted(ALWAYS_SERVED_CORPORA))) found.push("corpora does not require work, imports and code");
  const engines = props.backend?.enum ?? [];
  const blocks = Object.keys(props.backends?.properties ?? {});
  if (blocks.length === 0 || blocks.some((name) => !engines.includes(name))) found.push("a backends block is not a registered backend");
  if (JSON.stringify(sorted(props.backends?.propertyNames?.enum ?? [])) !== JSON.stringify(sorted(engines))) found.push("backends property names are not bounded by the backend enum");
  const extractors = props.backends?.properties?.graphify?.properties?.extractionBackend?.enum ?? [];
  if (JSON.stringify(extractors) !== JSON.stringify(GRAPHIFY_BACKENDS.map((entry) => entry.backend))) found.push("backends.graphify.extractionBackend's enum is not GRAPHIFY_BACKENDS");
  if (!String(props.graph?.description ?? "").includes(NEVER_SHARED)) found.push("memory.graph's description does not state the never-shared rule");
  if (propertyNames(memory).includes("egress")) found.push("an egress property is declared under $defs/memory");
  return found;
}

const shipped = () => JSON.parse(readFileSync(SCHEMA_URL, "utf8"));

// FF-20105 (201/ADR-004 §5) — the violations in the schema's `memory.recall.pick`: its property
// names are the keys the reader accepts, its bounds are the reader's, and the node stays closed.
function pickViolations(schema) {
  const found = [];
  const memory = schema.$defs?.memory ?? {};
  const recall = memory.properties?.recall ?? {};
  const pick = recall.properties?.pick ?? {};
  const keys = Object.keys(RECALL_PICK_DEFAULTS);
  if (JSON.stringify(sorted(Object.keys(pick.properties ?? {}))) !== JSON.stringify(sorted(keys))) found.push("recall.pick's property names are not the reader's keys");
  if (JSON.stringify(Object.keys(recall.properties ?? {})) !== JSON.stringify(["pick"])) found.push("recall admits a key other than pick");
  for (const [label, node] of [["memory", memory], ["memory.recall", recall], ["memory.recall.pick", pick]]) {
    if (node.additionalProperties !== false) found.push(`${label} is not closed`);
  }
  const timeout = pick.properties?.timeoutMs ?? {};
  if (timeout.type !== "integer" || timeout.minimum !== RECALL_PICK_TIMEOUT_MS.min || timeout.maximum !== RECALL_PICK_TIMEOUT_MS.max) found.push("recall.pick.timeoutMs is not the reader's whole-number range");
  if (pick.properties?.enabled?.type !== "boolean") found.push("recall.pick.enabled is not a boolean");
  if (pick.properties?.model?.type !== "string" || !pick.properties?.model?.pattern) found.push("recall.pick.model admits a blank");
  // Every key the reader accepts, the reader accepts at its default; a key the schema adds, it refuses.
  for (const key of Object.keys(pick.properties ?? {})) {
    try { readMemoryConfig({ memory: { recall: { pick: { [key]: RECALL_PICK_DEFAULTS[key] } } } }); } catch { found.push(`the reader refuses the schema's key ${key}`); }
  }
  return found;
}

export const archTests = [
  {
    name: "arch/180 FF-18002 + 180/01 task 02: FF-18002 — the schema's vocabularies are the code's, and the never-shared rule is stated",
    run: () => {
      const schema = shipped();
      assert.deepEqual(violations(schema), []);

      // Each leg bites on a planted copy.
      const plants = [
        ["corpora item planning", (s) => s.$defs.memory.properties.corpora.items.enum.push("planning")],
        ["imports no longer required", (s) => s.$defs.memory.properties.corpora.allOf.splice(1, 1)],
        ["an unregistered engine block", (s) => { s.$defs.memory.properties.backends.properties.cognee = { type: "object" }; }],
        ["an extractor graphify does not know", (s) => s.$defs.memory.properties.backends.properties.graphify.properties.extractionBackend.enum.push("codex")],
        ["the sentence removed", (s) => { s.$defs.memory.properties.graph.description = "Sharing settings."; }],
        ["an egress key", (s) => { s.$defs.memory.properties.graph.properties = { egress: { enum: ["local-only"] } }; }],
      ];
      for (const [label, plant] of plants) {
        const copy = shipped();
        plant(copy);
        assert.ok(violations(copy).length > 0, `the control reports ${label}`);
      }
    },
  },
  {
    name: "arch/201 FF-20105: the schema's pick keys are the reader's — memory.recall.pick's property names equal the keys readMemoryConfig accepts, its bounds are the reader's, and the memory node stays closed",
    run: () => {
      assert.deepEqual(pickViolations(shipped()), []);
      assert.deepEqual(sorted(Object.keys(RECALL_PICK_DEFAULTS)), ["enabled", "model", "timeoutMs"], "non-vacuity: the reader accepts three keys");
      const pickOf = (schema) => schema.$defs.memory.properties.recall.properties.pick;
      const plants = [
        ["a key the reader does not accept", (s) => { pickOf(s).properties.effort = { type: "string" }; }],
        ["a key the reader accepts, dropped", (s) => { delete pickOf(s).properties.model; }],
        ["an open pick", (s) => { delete pickOf(s).additionalProperties; }],
        ["an open recall", (s) => { s.$defs.memory.properties.recall.additionalProperties = true; }],
        ["an open memory node", (s) => { s.$defs.memory.additionalProperties = true; }],
        ["a second key under recall", (s) => { s.$defs.memory.properties.recall.properties.shortlist = { type: "integer" }; }],
        ["a wider time limit", (s) => { pickOf(s).properties.timeoutMs.maximum = 600000; }],
        ["a fractional time limit", (s) => { pickOf(s).properties.timeoutMs.type = "number"; }],
        ["a blank model", (s) => { delete pickOf(s).properties.model.pattern; }],
      ];
      for (const [label, plant] of plants) {
        const copy = shipped();
        plant(copy);
        assert.ok(pickViolations(copy).length > 0, `the control reports ${label}`);
      }
    },
  },
];
