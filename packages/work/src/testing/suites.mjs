import picomatch from "picomatch";

// 210/ADR-008: the suite predicate, moved out of the retired selector. `--all`, the gate, a named
// run's check, the importer scan, the layout family and story-contract derivation all ask it.

// THE SUITE PREDICATE (72/ADR-002 §1a, widened by 190/ADR-003 §1): a file under a declared root that
// ends in a declared suffix. The suffixes default to `.test.mjs`, today's predicate, so a project
// that declares none sees no change. Nothing under a `node_modules` directory is ever a suite.
export const DEFAULT_SUITE_SUFFIXES = Object.freeze([".test.mjs"]);

// 190/ADR-008 §7 — a test-shaped file the declaration says the runner does not run
// (`work.test.exclude`, `[{ paths, why }]`). It is never a suite, and the predicate below asks this,
// so membership stays one decision (FF-19006).
export function isExcludedTest(file, exclude = []) {
  if (typeof file !== "string") return false;
  const normalized = file.replaceAll("\\", "/");
  return (exclude ?? []).some((entry) => picomatch.isMatch(normalized, entry.paths, { dot: true }));
}

export function isSuiteFile(file, roots, suffixes = DEFAULT_SUITE_SUFFIXES, exclude = []) {
  if (typeof file !== "string") return false;
  const normalized = file.replaceAll("\\", "/");
  if (!(suffixes ?? DEFAULT_SUITE_SUFFIXES).some((suffix) => normalized.endsWith(suffix))) return false;
  if (isExcludedTest(normalized, exclude)) return false;
  if (normalized.split("/").includes("node_modules")) return false;
  return (roots ?? []).some((root) => {
    const prefix = `${String(root).replaceAll("\\", "/").replace(/\/+$/u, "")}/`;
    return normalized.startsWith(prefix);
  });
}
