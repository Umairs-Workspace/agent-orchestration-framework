// FF-13301 (milestone 133 / ADR-001 §3, ADR-002, ADR-008 §2) — THE GENERATOR IS NAMED ONCE.
//
// "In a comment-stripped sweep of `src/**` (including `src/bundle/**`), the literal
//  `diagram-design` appears only in `src/diagrams/generator-diagram-design.mjs`.
//  `src/config-inspect.mjs` takes generator ids from `generatorIds()`, and the registry map is
//  built from adapter `id`s. Every registered adapter carries the six contract keys, and
//  `readBack` is present."
//
// Why it matters: swapping the generator must be one config value plus one adapter file. A second
// spelling — in the config validator, the architect prose or a command — is a weld, and the swap
// would then need an edit nobody knows to make.
//
// The needle is ASSEMBLED, so this file is not its own subject. Code files are read through the
// one home's comment stripper (a comment naming the tool is documentation, not a weld); every other
// file under `src/` — the bundle's prose — is read raw, because prose has no comments to strip.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { generatorFor, generatorIds } from "../../../src/diagrams/generators.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const THE_ONE_HOME = "src/diagrams/generator-diagram-design.mjs";
const NEEDLE = ["diagram", "design"].join("-");
const CODE = new Set([".mjs", ".js", ".cjs", ".ts"]);
const CONTRACT_KEYS = ["id", "instructions", "locate", "readBack", "sourceExt", "toSvg"];

async function sourceFiles(dir = path.join(repoRoot, "src")) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await sourceFiles(full));
    else out.push(full);
  }
  return out;
}

// An import specifier that resolves to the one home is the registry reaching its adapter by the
// file name ADR-002 §1 gives it — a path, not a second naming of the tool.
function withoutImportsOfTheHome(file, code) {
  return code.replace(/\bfrom\s*(["'])([^"'\n]*)\1/g, (whole, _quote, specifier) =>
    (path.posix.join(path.posix.dirname(file), specifier) === THE_ONE_HOME ? "" : whole));
}

// The detector the real sweep and the red probe share: which of these { file, text } spell it.
function filesNamingTheGenerator(entries) {
  return entries
    .filter(({ file, text }) => (CODE.has(path.extname(file)) ? withoutImportsOfTheHome(file, stripComments(text)) : text).includes(NEEDLE))
    .map(({ file }) => file);
}

async function readEntries() {
  const entries = [];
  for (const full of await sourceFiles()) {
    entries.push({ file: path.relative(repoRoot, full).replace(/\\/g, "/"), text: await readFile(full, "utf8") });
  }
  return entries;
}

export const archTests = [
  {
    name: "arch/133 FF-13301: the generator's name appears in src/** only in its adapter",
    run: async () => {
      assert.deepEqual(filesNamingTheGenerator(await readEntries()), [THE_ONE_HOME]);
    },
  },
  {
    name: "arch/133 FF-13301: the config validator takes its ids from the registry, and the registry is keyed by each adapter's own id",
    run: async () => {
      const config = stripComments(await readFile(path.join(repoRoot, "src", "config-inspect.mjs"), "utf8"));
      assert.match(config, /import\s*\{[^}]*\bgeneratorIds\b[^}]*\}\s*from\s*["']\.\/diagrams\/generators\.mjs["']/);
      assert.match(config, /\bgeneratorIds\(\)/, "the validator calls generatorIds()");
      const registry = stripComments(await readFile(path.join(repoRoot, "src", "diagrams", "generators.mjs"), "utf8"));
      assert.match(registry, /\.map\(\(adapter\)\s*=>\s*\[adapter\.id,\s*adapter\]\)/, "the map is built from adapter.id");
      for (const id of generatorIds()) {
        assert.equal(generatorFor(id).id, id, `${id} is keyed by its own id`);
      }
    },
  },
  {
    name: "arch/133 FF-13301: every registered adapter carries the six contract keys, with readBack present",
    run: () => {
      assert.ok(generatorIds().length > 0, "at least one adapter is registered");
      for (const id of generatorIds()) {
        const adapter = generatorFor(id);
        assert.deepEqual(Object.keys(adapter).sort(), CONTRACT_KEYS, `${id} carries exactly the contract`);
        assert.ok(Object.hasOwn(adapter, "readBack"), `${id} reserves readBack`);
        assert.ok(Object.isFrozen(adapter), `${id} is frozen`);
        for (const fn of ["locate", "instructions", "toSvg"]) assert.equal(typeof adapter[fn], "function", `${id}.${fn}`);
      }
    },
  },
  {
    name: "arch/133 FF-13301 red probe: the detector fires on a planted spelling in code and in prose, and ignores a comment",
    run: () => {
      const planted = [
        { file: THE_ONE_HOME, text: `export const id = "${NEEDLE}";` },
        { file: "src/config-inspect.mjs", text: `const legal = ["${NEEDLE}", "off"];` },
        { file: "src/bundle/agents/aof-architect.md", text: `Draw with the ${NEEDLE} plugin.` },
        { file: "src/work.mjs", text: `// the ${NEEDLE} plugin draws\nexport const x = 1;` },
        { file: "src/diagrams/generators.mjs", text: `import { a } from "./generator-${NEEDLE}.mjs";` },
        { file: "src/work/other.mjs", text: `import { a } from "./generator-${NEEDLE}.mjs";` },
      ];
      assert.deepEqual(
        filesNamingTheGenerator(planted),
        [THE_ONE_HOME, "src/config-inspect.mjs", "src/bundle/agents/aof-architect.md", "src/work/other.mjs"],
        "only the registry's import of the adapter file is not a naming",
      );
    },
  },
];
