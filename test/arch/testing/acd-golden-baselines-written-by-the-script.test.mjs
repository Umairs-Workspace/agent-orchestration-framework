// Fitness function: acd-golden-baselines-written-by-the-script (FF-20302, 203/ADR-004 §4, §5).
//
//   "Only the update script writes a baseline. `test/support/golden/baseline-writer.mjs` is
//    imported by `scripts/golden.mjs` and by nothing else. No module under `test/` imports it. No
//    golden module reads an environment variable that would switch a run to writing."
//
// WHY THIS EXISTS. A check that can rewrite its own expectations is no check. The rejected
// alternative in ADR-004 is the one every snapshot tool ships: `UPDATE=1` in the test run. An
// exported variable left in a shell would then rewrite every baseline inside a gate run and report
// green. So the writer has one importer, a script a person types, and the golden modules read no
// environment variable at all. The harness forwards the parent's environment to the child verb
// (`...process.env`), which reads nothing; a member read (`process.env.X`, `process.env[x]`) or a
// destructure from `process.env` is what a switch would need, and is what this refuses.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WRITER = "test/support/golden/baseline-writer.mjs";
const THE_SCRIPT = "scripts/golden.mjs";
const SWEPT_ROOTS = ["test", "scripts", "packages", "apps"];
const GOLDEN_MODULES_DIR = "test/support/golden";

// Static and literal dynamic import specifiers, in comment-stripped source.
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([^"'\n]+)\1/gu;

export function importersOf(target, sources) {
  return sources
    .filter(({ file, source }) =>
      [...stripComments(source).matchAll(SPECIFIER)].some(([, , specifier]) => specifier.startsWith(".") && path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)) === target),
    )
    .map(({ file }) => file)
    .sort();
}

// A member read of `process.env`, or a destructure from it. A spread (`...process.env`) forwards
// the environment to a child and reads nothing.
const ENV_READ = /process\.env\s*(?:\.|\[|\?\.)|=\s*process\.env\b(?!\s*[,}\]])/u;

export function envReaders(sources) {
  return sources.filter(({ source }) => ENV_READ.test(stripComments(source))).map(({ file }) => file);
}

function walk(rel, into) {
  for (const entry of readdirSync(path.join(repoRoot, rel), { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) continue;
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) walk(child, into);
    else if (/\.(?:mjs|js|cjs|ts|tsx)$/u.test(entry.name)) into.push({ file: child, source: readFileSync(path.join(repoRoot, child), "utf8") });
  }
  return into;
}

const goldenModules = () => [
  ...readdirSync(path.join(repoRoot, GOLDEN_MODULES_DIR))
    .filter((name) => name.endsWith(".mjs"))
    .map((name) => `${GOLDEN_MODULES_DIR}/${name}`),
  THE_SCRIPT,
].map((file) => ({ file, source: readFileSync(path.join(repoRoot, file), "utf8") }));

export const archTests = [
  {
    name: "arch/203 FF-20302: the baseline writer is imported by scripts/golden.mjs and by nothing else in the repository",
    run: async () => {
      assert.ok(existsSync(path.join(repoRoot, WRITER)), `${WRITER} exists`);
      const sources = SWEPT_ROOTS.filter((root) => existsSync(path.join(repoRoot, root))).flatMap((root) => walk(root, []));
      assert.ok(sources.length > 1000, `non-vacuity: ${sources.length} modules were read`);
      assert.deepEqual(importersOf(WRITER, sources), [THE_SCRIPT], "only the update script writes a baseline (203/ADR-004 §5)");
      assert.equal(importersOf(WRITER, sources).filter((file) => file.startsWith("test/")).length, 0, "no module under test/ imports the writer");
    },
  },
  {
    name: "arch/203 FF-20302: no golden module reads an environment variable, so none can switch a run to writing",
    run: async () => {
      const modules = goldenModules();
      assert.ok(modules.length >= 7, `non-vacuity: ${modules.length} golden modules were read`);
      assert.deepEqual(envReaders(modules), [], "a test run is turned into an update by the script's --update flag alone (203/ADR-004 §5)");
    },
  },
  {
    name: "arch/203 FF-20302: the detectors fire on a planted importer and a planted switch, and pass a spread and a mention",
    run: async () => {
      const planted = [
        { file: "test/golden/sneaky.test.mjs", source: 'import { writeScenario } from "../support/golden/baseline-writer.mjs";\n' },
        { file: "test/support/golden/harness.mjs", source: 'const w = await import("./baseline-writer.mjs");\n' },
        { file: "test/arch/testing/mentions.test.mjs", source: 'const WRITER = "test/support/golden/baseline-writer.mjs"; // import x from "./baseline-writer.mjs"\n' },
      ];
      assert.deepEqual(importersOf(WRITER, planted), ["test/golden/sneaky.test.mjs", "test/support/golden/harness.mjs"]);
      const switches = [
        { file: "a.mjs", source: "if (process.env.AOF_GOLDEN_UPDATE) write();\n" },
        { file: "b.mjs", source: 'const on = process.env["AOF_GOLDEN_UPDATE"];\n' },
        { file: "c.mjs", source: "const { AOF_GOLDEN_UPDATE } = process.env;\n" },
        { file: "d.mjs", source: "spawn(cmd, { env: { ...process.env, AOF_GLOBAL_HOME: home } });\n" },
        { file: "e.mjs", source: "// process.env.AOF_GOLDEN_UPDATE is refused\n" },
      ];
      assert.deepEqual(envReaders(switches), ["a.mjs", "b.mjs", "c.mjs"]);
    },
  },
];
