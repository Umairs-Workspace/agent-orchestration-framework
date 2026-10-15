// The light entry: run the suite files it is NAMED, through `runCases` - the runner's one execution loop, with its
// per-case isolated global home - and import nothing else. It never imports the registry, which is what makes it
// cheap to start. Two callers, one form:
//
//   node scripts/test-shard.mjs <suite file>... [<comma-separated case positions>]
//
// A focused `aof test` launches it with the files it selected (160/ADR-003, `work.test.selectProgramArgs`); one
// work unit of the sharded whole-tree run (`scripts/test-sharded.mjs`) launches it with one file and the cases the
// parent assigned it BY POSITION. A trailing argument shaped `^\d+(,\d+)*$` is that positions list, taken over the
// named files' cases in order. With no positions it runs every case the files export. A position the files do not
// have is an error, never a silent skip: the parent compares the executed count with what it assigned. A file
// that will not load, or exports nothing runnable, is reported by path and fails the run - its siblings still run.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadSelected, runCases } from "./test-harness.mjs";

const POSITIONS = /^\d+(,\d+)*$/u;
const argv = process.argv.slice(2);
const positions = argv.length > 1 && POSITIONS.test(argv.at(-1)) ? argv.at(-1) : null;
const files = positions == null ? argv : argv.slice(0, -1);
if (files.length === 0) {
  console.error("not ok - test-shard needs a suite file");
  process.exit(2);
}

// A suite that imports the runner itself (to test it) sits on an import ring: the runner imports that suite's
// directory index, which imports the suite. The whole-tree run always enters the ring at the runner; a unit
// entering at the suite would read the index's array before it is initialised. Such a selection enters the same
// way - and only such a selection, because entering at the runner evaluates the whole registry.
const importsRunner = (file) => {
  try {
    return /(?:from\s*|import\s*\(\s*)["'][^"']*scripts\/test\.mjs["']/u.test(readFileSync(path.resolve(file), "utf8"));
  } catch {
    return false;
  }
};
if (files.some(importsRunner)) {
  await import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "test.mjs")).href);
}

const { selected: cases, unusable } = await loadSelected(files);
for (const problem of unusable) console.error(`not ok - ${problem.file} ${problem.reason}`);
let selected = cases;
if (positions != null) {
  const wanted = positions.split(",").map(Number);
  const missing = wanted.filter((index) => index >= cases.length);
  if (missing.length) {
    console.error(`not ok - ${files.join(" ")} has ${cases.length} cases; positions ${missing.join(",")} do not exist`);
    process.exit(2);
  }
  selected = wanted.map((index) => cases[index]);
}
const failures = await runCases(selected);
// Exit once stdout has drained: a case that leaves a timer or server open must not hold the unit (and its worker
// slot) forever. The serial runner never had to decide this, because it ran to the end of the whole tree.
process.stdout.write("", () => process.exit(failures > 0 || unusable.length > 0 ? 1 : 0));
