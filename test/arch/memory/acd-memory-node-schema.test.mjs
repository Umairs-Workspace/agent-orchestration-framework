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
import { ALWAYS_SERVED_CORPORA } from "@aof/knowledge/memory-config";
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
];
