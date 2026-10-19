// THE SHARDED RUN'S REPORT AND VERDICT — what `scripts/test-sharded.mjs` prints and how it exits, kept out of the
// pool so each line can be tested without starting one (144). Pure: results in, lines and an exit code out.
//
// The lines are read by two readers. The TAP reader behind `aof test` (`packages/work/src/grade.mjs`) counts
// `not ok - <case>` at column 0 as a failure and skips every `#` comment. The regression gate reads three comment
// lines by their own prefixes: `# not isolated - <case>`, the `# slowest files` block and `# logs: <dir>`. So a case
// red in the pool and green alone is logged as a comment — it is a test that is not isolated (144 Q2), and it fails
// neither reader — while a case red twice, or a case the run lost, is a `not ok` line both readers count.

// A unit's failed names, or the unit itself when it failed without naming a case (a crash at import, a kill).
const namesOf = (result) => (result.failed.length > 0 ? result.failed : [`${result.unit.key}: exited ${result.code} with no failing case named`]);

// The refusal printed before any unit runs when a registered case maps to no suite file, or to two.
export function registryRefusal({ unassigned, duplicates }) {
  return `not ok - the sharded run cannot account for the registry: ${unassigned} case(s) map to no suite file, ${duplicates} duplicate entr${duplicates === 1 ? "y" : "ies"}`;
}

// The failure a unit carries when it exited having executed fewer cases than it was assigned.
export function lostUnitFailure(key, executed, assigned) {
  return `${key}: executed ${executed} of ${assigned} assigned cases`;
}

// Seconds and cases per suite file, summed across its chunks — the next run's schedule and the slowest-files block.
// A packed unit (160/ADR-010 §3) is one process holding several files: each file is timed from the
// `# file <path> <seconds> <executed>` line the shard entry printed for it, and the unit itself is never an entry.
export function fileTimings(results) {
  const perFile = {};
  const add = (key, seconds, cases) => {
    const entry = perFile[key] ?? (perFile[key] = { seconds: 0, cases: 0 });
    entry.seconds += seconds;
    entry.cases += cases;
  };
  for (const result of results) {
    if (result.unit.files == null) { add(result.unit.key, result.seconds, result.unit.positions.length); continue; }
    const reported = fileLines(result.output ?? "");
    for (const entry of result.unit.files) {
      const line = reported.get(entry.file);
      if (line != null) add(entry.key, line.seconds, entry.positions.length);
    }
  }
  return perFile;
}

// The `# file <path> <seconds> <executed>` lines a unit printed, by path.
export function fileLines(output) {
  return new Map([...String(output).matchAll(/^# file (.+) (\d+(?:\.\d+)?) (\d+)$/gm)].map((match) => [match[1], { seconds: Number(match[2]), executed: Number(match[3]) }]));
}

export function slowestFiles(perFile, limit = 12) {
  return [
    "# slowest files (seconds summed across their chunks):",
    ...Object.entries(perFile)
      .sort((a, b) => b[1].seconds - a[1].seconds)
      .slice(0, limit)
      .map(([key, value]) => `  ${value.seconds.toFixed(0).padStart(5)}s  ${value.cases} cases  ${key}`),
  ];
}

// One `not ok - <case>` per case red in the pool and red again alone.
export function failureLines(failures) {
  return failures.flatMap(({ retry }) => namesOf(retry).map((name) => `not ok - ${name}`));
}

// One `# not isolated - <case>` per case red in the pool and green alone, in the order the pool reported them.
export function notIsolatedLines(flakes) {
  return flakes.flatMap(({ first }) => namesOf(first).map((name) => `# not isolated - ${name}`));
}

// 160/ADR-006 §2-§3 — one `# not finished - <unit>` per unit the pool killed (a stop, the budget, its own
// time limit), and `# not started: <n> units` for the queue a stop left. Comments, so the TAP reader counts
// no failure for them; the gate reads them by their own prefixes.
export function notFinishedLines(notFinished = [], notStarted = []) {
  return [
    ...notFinished.map((key) => `# not finished - ${key}`),
    ...(notStarted.length > 0 ? [`# not started: ${notStarted.length} units`] : []),
  ];
}

export function shardedReport({ stamp, executed, registered, units, wallSeconds, summedSeconds, jobs, failures, flakes, perFile, logs, notFinished = [], notStarted = [] }) {
  const unfinished = notFinished.length > 0 || notStarted.length > 0;
  return [
    `# sharded run ${stamp}`,
    `# ${executed} of ${registered} registered cases executed in ${units} units; wall ${(wallSeconds / 60).toFixed(1)} min, summed ${(summedSeconds / 60).toFixed(1)} min, ${jobs} workers`,
    `# failures: ${failures.length} unit(s); not isolated (red in the pool, green alone): ${flakes.length} unit(s)`,
    ...failureLines(failures),
    ...notIsolatedLines(flakes),
    ...notFinishedLines(notFinished, notStarted),
    // A run that executed fewer cases than the registry holds, with no failing unit and no unit that did not
    // finish to explain it, lost cases.
    ...(executed !== registered && failures.length === 0 && !unfinished ? [`not ok - executed ${executed} cases, the registry holds ${registered}`] : []),
    ...slowestFiles(perFile),
    `# logs: ${logs}`,
  ];
}

// Red on a failure or a lost case; a not-isolated case is logged and passes, unless --strict. A run with a unit
// that did not finish, or one never started, exits non-zero without being a failure.
export function shardedExit({ failures, flakes, executed, registered, strict = false, notFinished = [], notStarted = [] }) {
  const unfinished = notFinished.length > 0 || notStarted.length > 0;
  const lost = executed !== registered && failures.length === 0 && !unfinished;
  return failures.length > 0 || lost || unfinished || (strict && flakes.length > 0) ? 1 : 0;
}
