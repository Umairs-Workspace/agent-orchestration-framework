// FF-13502 (milestone 135 / ADR-004 §1) — THE TRACE IS DECLARED, NEVER INFERRED.
//
// "The lane resolves an example only through `map.mjs`'s id readers over `parseFeature`'s value. No
//  module in the package compares an example's text to a scenario's text or steps."
//
// Why it matters: an agreed example is joined to the contract by the id a person can see — `E<n> · `
// at the head of a scenario, `E<n>` in an `example` cell, inside a group titled `R<n> · `. A join by
// value ("5 loans" against "holding 5 loans") is the inferred join 54/ADR-006 refuses: it resolves
// examples nobody carried and misses ones carried in other words, and the doctor would then vouch
// for a contract no one checked.
//
// The control reads the package's comment-stripped sources. A parsed feature is walked (`.scenarios`)
// in `map.mjs` alone; there, the trace's two functions read no example `.text` and no `.steps`; the
// lane parses task features only through `@aof/work/feature-parse` and hands them to `map.mjs`'s
// `untracedExamples`. A red probe plants each inference, and a behavioural probe shows the one value
// join a reader might reach for — an example's text equal to a scenario's name — resolves nothing.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFeature } from "@aof/work/feature-parse";
import { contractNamesRules, parseExampleMap, untracedExamples } from "@aof/specification-by-example/map";
import { functionBody, stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PACKAGE_SRC = "packages/specification-by-example/src";
const THE_HOME = "map.mjs";
const TRACE_FUNCTIONS = ["function carriersOf(", "export function untracedExamples("];

// What, in one package module, infers the trace rather than reading its declared ids.
function inferences(file, code) {
  const hits = [];
  if (/\.steps\b/.test(code)) hits.push("reads a scenario's steps");
  if (file !== THE_HOME && /\.scenarios\b/.test(code)) hits.push("walks a parsed feature outside map.mjs");
  if (file === THE_HOME) {
    for (const header of TRACE_FUNCTIONS) {
      const body = functionBody(code, header);
      if (body == null) hits.push(`has no ${header.trim()}…) to hold the trace`);
      else if (/\.text\b/.test(body)) hits.push(`reads a text in ${header.replace(/^export /, "").trim()}…)`);
    }
  }
  return hits;
}

async function packageModules() {
  const names = (await readdir(path.join(repoRoot, PACKAGE_SRC))).filter((name) => name.endsWith(".mjs"));
  assert.ok(names.includes(THE_HOME) && names.includes("doctor-lane.mjs"), "the package's sources were enumerated");
  return Promise.all(names.map(async (name) => ({ name, code: stripComments(await readFile(path.join(repoRoot, PACKAGE_SRC, name), "utf8")) })));
}

const FEATURE = (...lines) => ["Feature: lending", "", "  Rule: R1 · A member may hold at most five loans", "", ...lines].join("\n") + "\n";
const MAP = "# 7/2 · the map\n\n## R1 · A member may hold at most five loans\n- E2 · a sixth loan is refused while five are out [confirmed]\n";

export const archTests = [
  {
    name: "arch/135 FF-13502: the package resolves an example only through map.mjs's id readers over parseFeature's value",
    run: async () => {
      const modules = await packageModules();
      const offenders = modules.flatMap(({ name, code }) => inferences(name, code).map((hit) => `${name}: ${hit}`));
      assert.deepEqual(offenders, []);
      const lane = modules.find(({ name }) => name === "doctor-lane.mjs").code;
      assert.match(lane, /import \{ parseFeature \} from "@aof\/work\/feature-parse";/u, "the lane parses through the one feature parser");
      assert.match(lane, /untracedExamples\(map, parsedFeatures\(featureTexts\)\)/u, "the lane asks map.mjs's trace");
      const parsers = modules.filter(({ code }) => /\bparseFeature\b/.test(code)).map(({ name }) => name);
      assert.deepEqual(parsers, ["doctor-lane.mjs"], "one module of the package parses a feature");
    },
  },
  {
    name: "arch/135 FF-13502 red probe: the detector fires on each planted inference, and not on the declared readers",
    run: () => {
      const home = (body) => `function carriersOf(features) {\n${body}\n}\nexport function untracedExamples(map, features) {\n  return [];\n}\n`;
      const planted = [
        ["doctor-lane.mjs", "const hit = feature.scenarios.some((scenario) => scenario.name === example.text);", "walks a parsed feature outside map.mjs"],
        ["build-door.mjs", "const said = scenario.steps.join(\" \").includes(value);", "reads a scenario's steps"],
        [THE_HOME, home("  return features.filter((entry) => entry.name.includes(example.text));"), "reads a text in function carriersOf(…)"],
        [THE_HOME, "export function untracedExamples(map, features) {\n  return [];\n}\n", "has no function carriersOf(…) to hold the trace"],
      ];
      for (const [file, source, hit] of planted) assert.ok(inferences(file, source).includes(hit), `${file}: ${source} → ${hit}`);
      assert.deepEqual(inferences(THE_HOME, home("  return [scenarioExampleId(scenario.name), rowExampleId(cells[column])];")), [], "the id readers are the declared join");
    },
  },
  {
    name: "arch/135 FF-13502 behavioural probe: an example whose text IS a scenario's name, with no id, is untraced",
    run: () => {
      const map = parseExampleMap(MAP);
      const prose = map.rules[0].examples[0].text;
      const byValue = [{ path: "tasks/00.feature", feature: parseFeature(FEATURE(`    Scenario: ${prose}`, "      Given a member")) }];
      assert.ok(contractNamesRules(byValue), "the contract is formulated from the map");
      assert.deepEqual(untracedExamples(map, byValue).map((example) => example.id), ["E2"]);
      const byId = [{ path: "tasks/00.feature", feature: parseFeature(FEATURE(`    Scenario: E2 · ${prose}`, "      Given a member")) }];
      assert.deepEqual(untracedExamples(map, byId), [], "non-vacuity: the declared id resolves it");
    },
  },
];
