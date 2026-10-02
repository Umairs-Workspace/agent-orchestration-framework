// One work unit of the sharded whole-tree run (`scripts/test-sharded.mjs`): import ONE suite file, take the cases
// the parent assigned it BY POSITION in the file's runner-shaped exports, and run them through `runCases` - the
// runner's one execution loop, with its per-case isolated global home. It never imports the registry, which is
// what makes a unit cheap to start.
//
//   node scripts/test-shard.mjs <suite file> [<comma-separated case positions>]
//
// With no positions it runs every case the file exports. A position the file does not have is an error, never a
// silent skip: the parent compares the executed count with what it assigned.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runCases, runnerShapedExports } from "./test-harness.mjs";

const [file, positions] = process.argv.slice(2);
if (!file) {
  console.error("not ok - test-shard needs a suite file");
  process.exit(2);
}
// A suite that imports the runner itself (to test it) sits on an import ring: the runner imports that suite's
// directory index, which imports the suite. The whole-tree run always enters the ring at the runner; a unit
// entering at the suite would read the index's array before it is initialised. Such a suite enters the same way.
if (/(?:from\s*|import\s*\(\s*)["'][^"']*scripts\/test\.mjs["']/u.test(readFileSync(path.resolve(file), "utf8"))) {
  await import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "test.mjs")).href);
}
const module = await import(pathToFileURL(path.resolve(file)).href);
const cases = runnerShapedExports(module).flat();
let selected = cases;
if (positions) {
  const wanted = positions.split(",").map(Number);
  const missing = wanted.filter((index) => !Number.isInteger(index) || index < 0 || index >= cases.length);
  if (missing.length) {
    console.error(`not ok - ${file} has ${cases.length} cases; positions ${missing.join(",")} do not exist`);
    process.exit(2);
  }
  selected = wanted.map((index) => cases[index]);
}
const failures = await runCases(selected);
// Exit once stdout has drained: a case that leaves a timer or server open must not hold the unit (and its worker
// slot) forever. The serial runner never had to decide this, because it ran to the end of the whole tree.
process.stdout.write("", () => process.exit(failures > 0 ? 1 : 0));
