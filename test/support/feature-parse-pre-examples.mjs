import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const BEGIN = "// BEGIN ADR-005 examples";
const END = "// END ADR-005 examples";

export async function loadPreExamplesParser() {
  const source = await readFile(path.resolve("src/feature-parse.mjs"), "utf8");
  const lines = source.split(/\r?\n/);
  let skipping = false;
  let blocks = 0;
  const legacy = [];
  for (const line of lines) {
    if (line.trim() === BEGIN) {
      if (skipping) throw new Error("nested ADR-005 marker");
      skipping = true;
      blocks += 1;
      continue;
    }
    if (line.trim() === END) {
      if (!skipping) throw new Error("unmatched ADR-005 marker");
      skipping = false;
      continue;
    }
    if (!skipping) legacy.push(line);
  }
  if (skipping || blocks < 1) throw new Error("incomplete ADR-005 marker set");
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

export function withoutExamples(parsed) {
  return {
    ...parsed,
    scenarios: parsed.scenarios.map(({ examples: _examples, ...scenario }) => scenario),
  };
}
