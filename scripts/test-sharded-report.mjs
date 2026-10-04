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
export function fileTimings(results) {
  const perFile = {};
  for (const result of results) {
    const entry = perFile[result.unit.key] ?? (perFile[result.unit.key] = { seconds: 0, cases: 0 });
    entry.seconds += result.seconds;
    entry.cases += result.unit.positions.length;
  }
  return perFile;
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

export function shardedReport({ stamp, executed, registered, units, wallSeconds, summedSeconds, jobs, failures, flakes, perFile, logs }) {
  return [
    `# sharded run ${stamp}`,
    `# ${executed} of ${registered} registered cases executed in ${units} units; wall ${(wallSeconds / 60).toFixed(1)} min, summed ${(summedSeconds / 60).toFixed(1)} min, ${jobs} workers`,
    `# failures: ${failures.length} unit(s); not isolated (red in the pool, green alone): ${flakes.length} unit(s)`,
    ...failureLines(failures),
    ...notIsolatedLines(flakes),
    // A run that executed fewer cases than the registry holds, with no failing unit to explain it, lost cases.
    ...(executed !== registered && failures.length === 0 ? [`not ok - executed ${executed} cases, the registry holds ${registered}`] : []),
    ...slowestFiles(perFile),
    `# logs: ${logs}`,
  ];
}

// Red on a failure or a lost case; a not-isolated case is logged and passes, unless --strict.
export function shardedExit({ failures, flakes, executed, registered, strict = false }) {
  const lost = executed !== registered && failures.length === 0;
  return failures.length > 0 || lost || (strict && flakes.length > 0) ? 1 : 0;
}
