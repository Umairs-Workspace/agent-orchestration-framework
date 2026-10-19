// The light entry: run the suite files it is NAMED, through `runCases` - the runner's one execution loop, with its
// per-case isolated global home - and import nothing else. It never imports the registry, which is what makes it
// cheap to start. Three forms:
//
//   node scripts/test-shard.mjs <suite file>... [<comma-separated case positions>]
//   node scripts/test-shard.mjs --file <suite file> <comma-separated case positions> [--file ...]...
//
// A focused `aof test` launches it with the files it selected (160/ADR-003, `work.test.selectProgramArgs`); one
// work unit of the sharded whole-tree run (`scripts/test-sharded.mjs`) launches it with one file and the cases the
// parent assigned it BY POSITION. A trailing argument shaped `^\d+(,\d+)*$` is that positions list, taken over the
// named files' cases in order. With no positions it runs every case the files export. A position the files do not
// have is an error, never a silent skip: the parent compares the executed count with what it assigned. A file
// that will not load, or exports nothing runnable, is reported by path and fails the run - its siblings still run.
//
// A PACKED unit (160/ADR-010 §2) names each of its files with its own positions, `--file <path> <positions>`
// repeated: no path begins with `--file`, so it is never read as a selection. Every form runs ONE `runCases` over
// the cases in order, so `# executed N cases` stays one line, and prints `# file <path> <seconds> <executed>` as
// each file's cases finish, so a unit's timings and lost cases are still accounted per file.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadSelected, runCases } from "./test-harness.mjs";

const POSITIONS = /^\d+(,\d+)*$/u;
const argv = process.argv.slice(2);

// The named files, each with the positions it runs (null = all of its cases), or one positions list over all.
let named;
let positions = null;
if (argv[0] === "--file") {
  named = [];
  for (let at = 0; at < argv.length; at += 3) {
    if (argv[at] !== "--file" || argv[at + 1] == null || !POSITIONS.test(argv[at + 2] ?? "")) {
      console.error(`not ok - test-shard: a packed unit names each file as --file <path> <positions>, not ${JSON.stringify(argv.slice(at, at + 3))}`);
      process.exit(2);
    }
    named.push({ file: argv[at + 1], positions: argv[at + 2].split(",").map(Number) });
  }
} else {
  positions = argv.length > 1 && POSITIONS.test(argv.at(-1)) ? argv.at(-1).split(",").map(Number) : null;
  named = (positions == null ? argv : argv.slice(0, -1)).map((file) => ({ file, positions: null }));
}
if (named.length === 0) {
  console.error("not ok - test-shard needs a suite file");
  process.exit(2);
}
const files = named.map((entry) => entry.file);

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

// Each file's cases, loaded one file at a time so every case keeps the file it came from.
const loaded = [];
const unusable = [];
const loadSeconds = new Map();
for (const file of files) {
  const begun = Date.now();
  const one = await loadSelected([file]);
  loadSeconds.set(file, (loadSeconds.get(file) ?? 0) + (Date.now() - begun) / 1000);
  unusable.push(...one.unusable);
  loaded.push({ file, cases: one.selected });
}
for (const problem of unusable) console.error(`not ok - ${problem.file} ${problem.reason}`);

// The cases to run, each with its file, in order.
let selected = [];
if (positions != null) {
  const all = loaded.flatMap(({ file, cases }) => cases.map((test) => ({ file, test })));
  const missing = positions.filter((index) => index >= all.length);
  if (missing.length) {
    console.error(`not ok - ${files.join(" ")} has ${all.length} cases; positions ${missing.join(",")} do not exist`);
    process.exit(2);
  }
  selected = positions.map((index) => all[index]);
} else {
  for (const [at, { file, cases }] of loaded.entries()) {
    const wanted = named[at].positions;
    if (wanted == null) { selected.push(...cases.map((test) => ({ file, test }))); continue; }
    const missing = wanted.filter((index) => index >= cases.length);
    if (missing.length) {
      console.error(`not ok - ${file} has ${cases.length} cases; positions ${missing.join(",")} do not exist`);
      process.exit(2);
    }
    selected.push(...wanted.map((index) => ({ file, test: cases[index] })));
  }
}

// Consecutive cases from one file are one group. `runCases` is the runner's frozen loop (FF-5311), so the group is
// reported from around its cases: each case's `run` is wrapped, and when a group's last case has run, pass or
// fail, its `# file` line is printed with the seconds since its first case began — plus the seconds its import
// took, so a file whose cost is its import is scheduled by that cost — and the cases it ran.
const groups = [];
for (const { file } of selected) {
  if (groups.at(-1)?.path === file) groups.at(-1).count += 1;
  else groups.push({ path: file, count: 1, started: null, ran: 0 });
}
let group = 0;
const accounted = selected.map(({ test }) => ({
  name: test.name,
  run: async () => {
    const current = groups[group];
    current.started ??= Date.now();
    try {
      return await test.run();
    } finally {
      current.ran += 1;
      if (current.ran === current.count) {
        console.log(`# file ${current.path} ${((Date.now() - current.started) / 1000 + (loadSeconds.get(current.path) ?? 0)).toFixed(3)} ${current.ran}`);
        group += 1;
      }
    }
  },
}));
const failures = await runCases(accounted);
// Exit once stdout has drained: a case that leaves a timer or server open must not hold the unit (and its worker
// slot) forever. The serial runner never had to decide this, because it ran to the end of the whole tree.
process.stdout.write("", () => process.exit(failures > 0 || unusable.length > 0 ? 1 : 0));
