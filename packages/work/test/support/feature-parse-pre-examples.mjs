import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

// The additive families the frozen parser is cut from: 57's Examples metadata (ADR-005) and, since
// milestone 135 (ADR-003), the `Rule:` grouping, rule-scoped tags, `Example:` and the row cells.
// A 135 block may sit inside an ADR-005 block; it is removed with it.
const FAMILIES = [
  { name: "ADR-005", begin: "// BEGIN ADR-005 examples", end: "// END ADR-005 examples" },
  { name: "135/ADR-003", begin: "// BEGIN 135/ADR-003 rules", end: "// END 135/ADR-003 rules" },
];

export async function loadPreExamplesParser() {
  const source = await readFile(path.resolve("packages/work/src/feature-parse.mjs"), "utf8");
  const lines = source.split(/\r?\n/);
  const open = [];
  const blocks = new Map(FAMILIES.map((family) => [family.name, 0]));
  const legacy = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const begins = FAMILIES.find((family) => family.begin === trimmed);
    const ends = FAMILIES.find((family) => family.end === trimmed);
    if (begins) {
      if (open.includes(begins.name)) throw new Error(`nested ${begins.name} marker`);
      open.push(begins.name);
      blocks.set(begins.name, blocks.get(begins.name) + 1);
      continue;
    }
    if (ends) {
      if (open.at(-1) !== ends.name) throw new Error(`unmatched ${ends.name} marker`);
      open.pop();
      continue;
    }
    if (open.length === 0) legacy.push(line);
  }
  if (open.length > 0 || [...blocks.values()].some((count) => count < 1)) throw new Error("incomplete additive marker set");
  const url = `data:text/javascript;base64,${Buffer.from(legacy.join("\n")).toString("base64")}`;
  return (await import(url)).parseFeature;
}

export async function featureFiles(root = path.resolve("wiki/work")) {
  const found = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile() && entry.name.endsWith(".feature")) found.push(target);
    }
  }
  await walk(root);
  return found.sort();
}

// The parse with every additive key removed: 57's `examples`, and 135's `rule` on each scenario and
// top-level `rules` (135/ADR-003). What is left must equal the frozen parser's value.
export function withoutExamples(parsed) {
  const { rules: _rules, ...rest } = parsed;
  return {
    ...rest,
    scenarios: parsed.scenarios.map(({ examples: _examples, rule: _rule, ...scenario }) => scenario),
  };
}

// 135/ADR-003 §2 — a rule's tags have rule scope, and the frozen parser leaks them onto the next
// scenario only. So `verification` and `lane` are comparable only for a scenario outside any rule or
// under a rule that carries no tag; for the rest the frozen value is the defect 135 fixed. Today's
// corpus has no tagged rule, so nothing is masked; the first tagged rule anyone writes keeps the
// whole-tree control honest instead of turning it red.
export function comparableToFrozen(parsed) {
  const tagged = new Set((parsed.rules ?? []).filter((rule) => rule.tags.length > 0).map((rule) => rule.line));
  const plain = withoutExamples(parsed);
  return {
    plain,
    masked: parsed.scenarios.map((scenario) => scenario.rule != null && tagged.has(scenario.rule.line)),
  };
}

// Compare a current parse with the frozen one, leaving out `verification`/`lane` (and the frozen
// parser's leaked tag on the scenario after a tagged rule) exactly where `comparableToFrozen` masks.
export function frozenView(parsed, legacy) {
  const { plain, masked } = comparableToFrozen(parsed);
  const strip = (scenarios) => scenarios.map(({ verification: _v, lane: _l, ...scenario }, index) => (masked[index] ? scenario : scenarios[index]));
  return { current: { ...plain, scenarios: strip(plain.scenarios) }, legacy: { ...legacy, scenarios: strip(legacy.scenarios) } };
}
