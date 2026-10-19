// scripts/test-ci-summary.mjs — the pull request suite's verdict over its shards (160/ADR-014 §4).
//
// Every shard job runs `scripts/test-sharded.mjs --shard <i>/<n> --report-json <file>`. This script reads those
// reports, merges their per-file timings, and judges them as one run:
//   - a shard with a failing case fails the run, naming the case and its shard;
//   - a missing shard report fails the run, naming the shard;
//   - the shards together must execute every registered case exactly once: a case no shard ran, or a file whose
//     positions two shards both held, fails the run;
//   - a unit that did not finish (its limit, or the budget) fails the run as not finished, never as a failure;
//   - the suite's wall time — the slowest shard's run — over `--budget-min` fails the run.
// Each file's time is compared with the baseline timings `main` last saved, and the drift is reported. Drift alone
// never fails the run.
//
//   node scripts/test-ci-summary.mjs --reports <dir> --shards <n> [--budget-min 10] [--baseline <timings.json>]
//     [--timings-out <timings.json>] [--summary-md <file>] [--drift-seconds 5] [--drift-ratio 1.5]
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The shards' verdict. `reports` are the parsed `--report-json` files; `baseline` is `main`'s per-file timings.
export function judgeShards({ reports, shards, budgetMinutes = null, baseline = {}, driftSeconds = 5, driftRatio = 1.5 }) {
  const problems = [];
  const byShard = new Map(reports.map((report) => [report.shard, report]));
  for (let shard = 1; shard <= shards; shard += 1) if (!byShard.has(shard)) problems.push(`shard ${shard}/${shards} wrote no report`);

  const failures = reports.flatMap((report) => report.failures.flatMap(({ unit, cases }) => (cases.length > 0 ? cases : [`${unit} (no case named)`]).map((name) => `shard ${report.shard}: ${name}`)));
  for (const failure of failures) problems.push(`not ok - ${failure}`);
  const notFinished = reports.flatMap((report) => report.notFinished.map((unit) => `shard ${report.shard}: ${unit}`));
  for (const unit of notFinished) problems.push(`not finished - ${unit}`);
  const notStarted = reports.reduce((sum, report) => sum + report.notStarted.length, 0);
  if (notStarted > 0) problems.push(`not started: ${notStarted} units`);

  // Exactly once: no file position held by two shards, and every registered case held by one.
  const holders = new Map();
  for (const report of reports) {
    for (const [key, positions] of Object.entries(report.planned ?? {})) {
      const held = holders.get(key) ?? holders.set(key, new Map()).get(key);
      for (const position of positions) held.set(position, [...(held.get(position) ?? []), report.shard]);
    }
  }
  const doubled = [...holders].filter(([, held]) => [...held.values()].some((owners) => owners.length > 1)).map(([key]) => key).sort();
  for (const key of doubled) problems.push(`a case ran in two shards: ${key}`);
  const registeredTotal = Math.max(0, ...reports.map((report) => report.registeredTotal ?? 0));
  const held = [...holders.values()].reduce((sum, positions) => sum + positions.size, 0);
  const executed = reports.reduce((sum, report) => sum + report.executed, 0);
  if (reports.length === shards && doubled.length === 0 && held < registeredTotal) problems.push(`${registeredTotal - held} registered case(s) that no shard ran`);
  if (reports.length === shards && failures.length === 0 && notFinished.length === 0 && notStarted === 0 && executed !== held) {
    problems.push(`the shards executed ${executed} of the ${held} cases they held`);
  }

  const slowest = reports.reduce((top, report) => (top == null || report.wallSeconds > top.wallSeconds ? report : top), null);
  const wallSeconds = slowest?.wallSeconds ?? 0;
  if (budgetMinutes != null && wallSeconds > budgetMinutes * 60) {
    problems.push(`over budget: the suite took ${minutes(wallSeconds)} against ${budgetMinutes} min (slowest: shard ${slowest.shard})`);
  }

  const timings = Object.assign({}, ...reports.map((report) => report.perFile ?? {}));
  const drift = [];
  for (const [key, entry] of Object.entries(timings)) {
    const before = baseline[key]?.seconds;
    if (!Number.isFinite(before) || !Number.isFinite(entry.seconds)) continue;
    const delta = entry.seconds - before;
    const ratio = before > 0 ? entry.seconds / before : Infinity;
    if (Math.abs(delta) >= driftSeconds && (ratio >= driftRatio || ratio <= 1 / driftRatio)) {
      drift.push({ key, before, after: entry.seconds, delta, direction: delta > 0 ? "slower" : "faster" });
    }
  }
  drift.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    passed: problems.length === 0,
    problems,
    wallSeconds,
    slowestShard: slowest?.shard ?? null,
    summedSeconds: reports.reduce((sum, report) => sum + report.summedSeconds, 0),
    executed,
    registeredTotal,
    flakes: reports.flatMap((report) => report.flakes.flatMap(({ cases }) => cases.map((name) => `shard ${report.shard}: ${name}`))),
    drift,
    timings,
  };
}

const minutes = (seconds) => `${(seconds / 60).toFixed(1)} min`;

// The verdict as Markdown, for the job summary and the log.
export function summaryMarkdown(verdict, { shards, budgetMinutes = null }) {
  const lines = [
    `## Test suite: ${verdict.passed ? "passed" : "failed"}`,
    "",
    `- Suite wall: **${minutes(verdict.wallSeconds)}**${budgetMinutes != null ? ` (budget ${budgetMinutes} min)` : ""}, slowest shard ${verdict.slowestShard ?? "-"} of ${shards}`,
    `- Summed: ${minutes(verdict.summedSeconds)} · ${verdict.executed} of ${verdict.registeredTotal} registered cases executed`,
  ];
  if (verdict.problems.length > 0) lines.push("", "### Problems", "", ...verdict.problems.map((problem) => `- ${problem}`));
  if (verdict.flakes.length > 0) lines.push("", `### Red in the pool, green alone (${verdict.flakes.length})`, "", ...verdict.flakes.slice(0, 30).map((name) => `- ${name}`));
  lines.push("", `### Drift against main (${verdict.drift.length} files)`, "");
  if (verdict.drift.length === 0) lines.push("No file moved past the threshold.");
  else {
    lines.push("| file | main | this run | change |", "|---|---|---|---|");
    for (const row of verdict.drift.slice(0, 40)) lines.push(`| \`${row.key}\` | ${row.before.toFixed(1)} s | ${row.after.toFixed(1)} s | ${row.delta > 0 ? "+" : ""}${row.delta.toFixed(1)} s ${row.direction} |`);
  }
  return lines.join("\n");
}

async function main(argv) {
  const value = (name, fallback = null) => { const at = argv.indexOf(name); return at < 0 ? fallback : argv[at + 1]; };
  const reportsDir = value("--reports");
  const shards = Number(value("--shards"));
  if (!reportsDir || !Number.isInteger(shards) || shards < 1) {
    console.error("usage: node scripts/test-ci-summary.mjs --reports <dir> --shards <n> [--budget-min M] [--baseline F] [--timings-out F] [--summary-md F]");
    return 2;
  }
  const budget = value("--budget-min");
  const baselinePath = value("--baseline");
  const files = existsSync(reportsDir) ? walk(reportsDir).filter((file) => file.endsWith(".json")) : [];
  const reports = files.map((file) => JSON.parse(readFileSync(file, "utf8"))).filter((report) => Number.isInteger(report.shard));
  const verdict = judgeShards({
    reports,
    shards,
    budgetMinutes: budget == null ? null : Number(budget),
    baseline: baselinePath && existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : {},
    driftSeconds: Number(value("--drift-seconds", 5)),
    driftRatio: Number(value("--drift-ratio", 1.5)),
  });
  const markdown = summaryMarkdown(verdict, { shards, budgetMinutes: budget == null ? null : Number(budget) });
  console.log(markdown);
  const summaryPath = value("--summary-md");
  if (summaryPath) appendFileSync(summaryPath, `${markdown}\n`);
  const timingsOut = value("--timings-out");
  if (timingsOut && verdict.passed) writeFileSync(timingsOut, JSON.stringify(verdict.timings, null, 1));
  return verdict.passed ? 0 : 1;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
