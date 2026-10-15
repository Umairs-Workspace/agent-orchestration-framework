// Node's module compile cache (160/ADR-004 §1), turned on as this module evaluates. The runner, the
// shard entry and the sharded runner all import this module statically and load suites dynamically
// afterwards, so every suite a unit loads compiles once per machine rather than once per process.
// Optional, because a runtime older than Node 22.1 has no such function.
import module from "node:module";

module.enableCompileCache?.();

export async function runCases(tests) {
  let failures = 0;
  // Per-test hermetic global AOF home (34/story 00) — see scripts/test-unit.mjs for the
  // rationale: the node identity is machine-wide now, so each test gets its OWN empty
  // global home to stop identity/global-store state leaking across tests (or onto the real
  // machine). The integration lane below keeps process.env untouched afterward.
  //
  // Rooted under ~/.aof-test (never ~/.aof, the real machine's global home) — a fixed,
  // dedicated, gitignored test root, not raw OS tmpdir, so stray test fixtures are
  // trivially auditable/wipeable in one place instead of scattered across the OS temp dir.
  const { homedir } = await import("node:os");
  const { join } = await import("node:path");
  const { rmSync } = await import("node:fs");
  const ghRoot = join(homedir(), ".aof-test", `gh-${process.pid}`);
  let ghIndex = 0;

  console.log("# unit");
  for (const { name, run } of tests) {
    const prevHome = process.env.AOF_GLOBAL_HOME;
    process.env.AOF_GLOBAL_HOME = join(ghRoot, `t-${ghIndex++}`);
    try {
      await run();
      console.log(`ok - ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`not ok - ${name}`);
      console.error(error.stack ?? error.message);
    } finally {
      if (prevHome === undefined) delete process.env.AOF_GLOBAL_HOME;
      else process.env.AOF_GLOBAL_HOME = prevHome;
    }
  }
  try { rmSync(ghRoot, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }

  console.log(`# executed ${tests.length} cases; failures ${failures}`);
  return failures;
}

// Every runner-shaped array a module exports, deduped by identity. ALL of them rather than the first one found:
// a file exporting two registered arrays would otherwise contribute half its tests (the `--only` rule, 72/ADR-004).
export function runnerShapedExports(module) {
  const found = [];
  for (const value of Object.values(module ?? {})) {
    if (!Array.isArray(value) || value.length === 0) continue;
    if (!value.every((entry) => entry != null && typeof entry === "object" && typeof entry.name === "string" && typeof entry.run === "function")) continue;
    if (!found.includes(value)) found.push(value);
  }
  return found;
}

// Import each named file and take its tests. A file that is not on disk, that does not evaluate,
// or that exports nothing runner-shaped is UNUSABLE and is reported BY PATH - never dropped, and
// never left to contribute zero tests in silence, which would read as a green run. Shared by the
// runner's `--only` and the shard entry a focused `aof test` launches (160/ADR-003).
export async function loadSelected(files) {
  const { resolve } = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const selected = [];
  const unusable = [];
  for (const file of files) {
    let module;
    try {
      module = await import(pathToFileURL(resolve(file)).href);
    } catch (error) {
      unusable.push({ file, reason: `could not be loaded: ${error?.message ?? String(error)}` });
      continue;
    }
    const found = runnerShapedExports(module);
    if (found.length === 0) {
      unusable.push({ file, reason: "exports no array of { name, run } entries, so there is nothing in it to run" });
      continue;
    }
    for (const array of found) selected.push(...array);
  }
  return { selected, unusable };
}

// Suite state belongs to its process. Timings may split only suites that explicitly
// promise independent cases; faster machines and different thresholds cannot opt others in.
export function suiteCaseChunks(positions, { independentCases = false, seconds = 0, splitSeconds = 60 } = {}) {
  if (!positions.length) return [];
  if (independentCases !== true) return [positions.slice()];
  if (!Number.isFinite(splitSeconds) || splitSeconds <= 0 || !Number.isFinite(seconds) || seconds < 0) {
    throw new TypeError("suiteCaseChunks: timings must be finite, with a positive split threshold");
  }
  const count = Math.min(positions.length, Math.max(1, Math.ceil(seconds / splitSeconds)));
  const size = Math.ceil(positions.length / count);
  const chunks = [];
  for (let start = 0; start < positions.length; start += size) chunks.push(positions.slice(start, start + size));
  return chunks;
}

// A file's estimate for the schedule: its recorded seconds, or half a second a case when it has none.
export function fileEstimate(timings, key, caseCount) {
  return timings?.[key]?.seconds ?? caseCount * 0.5;
}

// SHORT FILES SHARE A UNIT (160/ADR-010 §1). Every unit is a process that pays node, the harness and the
// application import before its first case. A plan entry for one whole file whose estimate is under
// `packSeconds` is packed, largest first, into a unit of other such files whose estimates sum to at most
// `targetSeconds`; a file is never split, and a chunk of a file, a lane, and a file at or over the threshold
// keep their own units. A packed unit is `{ key, packed: true, files: [{ file, key, positions }], positions,
// estimate }`, its `positions` every position it holds; a bin that ends with one file stays that file's unit.
// m160/F-06: a packed unit names every file on its command line, and Windows refuses one over 32,767 characters.
// The bound leaves room for the node path and the shard entry's path.
export const PACK_MAX_ARG_CHARS = 24_000;

export function packUnits(plan, { packSeconds = 15, targetSeconds = 60, maxArgChars = PACK_MAX_ARG_CHARS } = {}) {
  if (!Number.isFinite(packSeconds) || packSeconds <= 0 || !Number.isFinite(targetSeconds) || targetSeconds <= 0) {
    throw new TypeError("packUnits: the pack threshold and target must be positive");
  }
  const packable = (entry) => entry.lanes !== true && entry.chunked !== true && entry.file != null && entry.estimate < packSeconds;
  // A bin also closes when its command line would pass `maxArgChars` (m160/F-06): each file adds `--file <file>
  // <positions>`, counted as Windows counts it, each argument with a space and two quotes.
  const argChars = (entry) => ["--file", entry.file, entry.positions.join(",")].reduce((sum, arg) => sum + arg.length + 3, 0);
  const bins = [];
  for (const entry of plan.filter(packable).sort((a, b) => b.estimate - a.estimate || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))) {
    const chars = argChars(entry);
    const bin = bins.find((candidate) => candidate.estimate + entry.estimate <= targetSeconds && candidate.chars + chars <= maxArgChars);
    if (bin == null) bins.push({ entries: [entry], estimate: entry.estimate, chars });
    else { bin.entries.push(entry); bin.estimate += entry.estimate; bin.chars += chars; }
  }
  const packed = bins.map((bin) => (bin.entries.length === 1 ? bin.entries[0] : {
    key: `packed ${bin.entries.length} files from ${bin.entries[0].key}`,
    packed: true,
    files: bin.entries.map((entry) => ({ file: entry.file, key: entry.key, positions: entry.positions })),
    positions: bin.entries.flatMap((entry) => entry.positions),
    estimate: bin.estimate,
  }));
  return [...plan.filter((entry) => !packable(entry)), ...packed];
}

// The shard entry's argv for one file unit, `<file> <positions>`, or for a packed unit, `--file <file> <positions>`
// per file (160/ADR-010 §2).
export function shardArgs(unit) {
  if (unit.files != null) return unit.files.flatMap((entry) => ["--file", entry.file, entry.positions.join(",")]);
  return [unit.file, unit.positions.join(",")];
}

// The plan's first line: how many processes the run will start, how many of them are packed, and how many files
// those hold.
export function planSummary(plan) {
  const packed = plan.filter((unit) => unit.files != null);
  return `# plan: ${plan.length} units; ${packed.length} packed, holding ${packed.reduce((sum, unit) => sum + unit.files.length, 0)} files`;
}

// Every (file, position) a plan runs, against the registry's assignment (`Map<file, positions[]>`): the cases a
// plan would lose or run twice, as one refusal line, or null when the plan runs each exactly once.
export function planCoverageProblem(plan, assigned) {
  const runs = new Map();
  for (const entry of plan) {
    if (entry.lanes === true) continue;
    for (const { file, positions } of entry.files ?? [{ file: entry.file, positions: entry.positions }]) {
      for (const position of positions) runs.set(`${file}\0${position}`, (runs.get(`${file}\0${position}`) ?? 0) + 1);
    }
  }
  let lost = 0;
  for (const [file, positions] of assigned) for (const position of positions) if (!runs.has(`${file}\0${position}`)) lost += 1;
  const doubled = [...runs.values()].filter((count) => count > 1).length;
  const stray = [...runs.keys()].filter((key) => { const [file, position] = key.split("\0"); return !(assigned.get(file) ?? []).includes(Number(position)); }).length;
  return lost || doubled || stray ? `not ok - the sharded plan does not run every registered case once: ${lost} lost, ${doubled} run twice, ${stray} not registered` : null;
}

