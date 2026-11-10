import picomatch from "picomatch";
import { isExcludedTest, isSuiteFile } from "./select.mjs";

// THE TEST-LAYOUT CHECK FAMILY (190/ADR-008 §1, §5). Every key 190 added keeps the old behaviour
// when it is absent, which is right for the code and silent for a project already on aof: it takes
// 190 through `aof work update` and keeps widening to the whole tree. This names each part of the
// declaration that narrowing and resume cannot use, and its repair.
//
// ONE PURE FUNCTION, TWO FACES. `aof project doctor` lists the checks and `aof work update` prints
// the warnings, and both call this, so the two cannot disagree. It takes the COMPILED toolchain and
// gate (`toolchain.mjs` is the one reader of `work.test.*`, FF-7201), the tracked files git listed
// at the caller's edge, and the work dir. It reads no record, no graph and no file, and it never
// runs a test. Suite membership is `isSuiteFile`'s alone (FF-19006).

// The one repair every warning names.
export const TEST_LAYOUT_REPAIR = "/aof:map-tests";

export const TEST_LAYOUT_CHECK_IDS = Object.freeze(["test-layout-suites", "test-layout-couplings", "test-layout-resume"]);

// THE LANGUAGE-NEUTRAL NAME SET, frozen: what a file that is a test looks like in the runners a
// project is likely to use. It decides only what is COUNTED; whether a file is a suite is the
// declared predicate's question.
export const TEST_SHAPED_NAMES = Object.freeze([
  Object.freeze({ shape: ".test.", matches: (base) => base.includes(".test.") }),
  Object.freeze({ shape: ".spec.", matches: (base) => base.includes(".spec.") }),
  Object.freeze({ shape: ".suite.", matches: (base) => base.includes(".suite.") }),
  Object.freeze({ shape: "_test.", matches: (base) => base.includes("_test.") }),
  Object.freeze({ shape: "test_*.py", matches: (base) => base.startsWith("test_") && base.endsWith(".py") }),
  Object.freeze({ shape: "__tests__/", matches: (base, dirs) => dirs.includes("__tests__") }),
]);

// How many directories the suites warning lists, largest first.
const LISTED_DIRECTORIES = 5;

// A directory segment a declared root is usually named after. The warning groups files by the
// shortest such prefix so it names a root the declaration could add, not every nested folder.
const ROOT_SEGMENTS = new Set(["test", "tests", "__tests__", "spec", "specs"]);

const posix = (file) => String(file).replaceAll("\\", "/");

export function isTestShaped(file) {
  const parts = posix(file).split("/");
  const base = parts.at(-1) ?? "";
  const dirs = parts.slice(0, -1);
  return TEST_SHAPED_NAMES.some((name) => name.matches(base, dirs));
}

function rootOf(file) {
  const dirs = posix(file).split("/").slice(0, -1);
  const at = dirs.findIndex((segment) => ROOT_SEGMENTS.has(segment));
  return (at >= 0 ? dirs.slice(0, at + 1) : dirs).join("/") || ".";
}

function under(file, dir) {
  const prefix = `${posix(dir).replace(/^\.\//u, "").replace(/\/+$/u, "")}/`;
  return prefix !== "/" && file.startsWith(prefix);
}

// The tracked files the declaration can see at all: nothing under `node_modules` (never a suite, so
// never a gap the declaration could close), and nothing under the work dir (66/ADR-004 already
// forbids test-shaped files there).
function considered({ tracked, workDir }) {
  return tracked
    .map(posix)
    .filter((file) => !file.split("/").includes("node_modules"))
    .filter((file) => workDir == null || !under(file, workDir));
}

// The test-shaped files the declaration cannot select. A file a coupling's `paths` matches is
// accounted for, and so is a file `work.test.exclude` names: the declaration says the runner does
// not run it (190/ADR-008 §7).
function unselectable({ files, toolchain }) {
  return files
    .filter((file) => isTestShaped(file))
    .filter((file) => !isSuiteFile(file, toolchain.roots, toolchain.suiteSuffixes, toolchain.exclude))
    .filter((file) => !isExcludedTest(file, toolchain.exclude))
    .filter((file) => !toolchain.couplings.some((entry) => picomatch.isMatch(file, entry.paths, { dot: true })));
}

function suitesCheck({ toolchain, tracked, workDir }) {
  if (tracked == null) {
    return Object.freeze({
      id: "test-layout-suites",
      severity: "ok",
      message: "The tracked files could not be listed (this is not a git checkout, or git did not answer), so no test file was checked against the declared roots and suffixes.",
    });
  }
  const seen = considered({ tracked, workDir });
  const files = unselectable({ files: seen, toolchain });
  if (files.length === 0) {
    // 190/ADR-008 §8 — an empty whole suite is never `ok`: `impacted` would select nothing.
    if (!seen.some((file) => isSuiteFile(file, toolchain.roots, toolchain.suiteSuffixes, toolchain.exclude))) {
      return Object.freeze({
        id: "test-layout-suites",
        severity: "warning",
        message: `No tracked file is a suite under work.test's roots and suffixes, so the whole suite is empty and \`aof test --scope impacted\` selects nothing. Declare the roots and suffixes the runner's suites use with ${TEST_LAYOUT_REPAIR}.`,
      });
    }
    return Object.freeze({ id: "test-layout-suites", severity: "ok", message: "Every tracked test file is a suite under the declared roots and suffixes, or is excluded with a reason." });
  }
  const byRoot = new Map();
  for (const file of files) byRoot.set(rootOf(file), (byRoot.get(rootOf(file)) ?? 0) + 1);
  const ranked = [...byRoot].sort(([a, left], [b, right]) => right - left || a.localeCompare(b));
  const listed = ranked.slice(0, LISTED_DIRECTORIES).map(([dir, count]) => `${dir} (${count})`);
  const more = ranked.length > LISTED_DIRECTORIES ? ` and ${ranked.length - LISTED_DIRECTORIES} more director${ranked.length - LISTED_DIRECTORIES === 1 ? "y" : "ies"}` : "";
  return Object.freeze({
    id: "test-layout-suites",
    severity: "warning",
    message: `${files.length} tracked test file${files.length === 1 ? " is" : "s are"} not a suite under work.test's roots and suffixes, so \`aof test --scope impacted\` can never select ${files.length === 1 ? "it" : "them"}: ${listed.join(", ")}${more}. Declare them as suites, or exclude them with a reason where the runner does not run them, with ${TEST_LAYOUT_REPAIR}.`,
    details: Object.freeze(ranked.map(([dir, count]) => Object.freeze({ dir, count }))),
  });
}

function couplingsCheck({ toolchain }) {
  if (toolchain.couplingsDeclared === true) {
    return Object.freeze({
      id: "test-layout-couplings",
      severity: "ok",
      message: toolchain.couplings.length === 0
        ? "work.test.couplings is declared empty: no suite reads a document."
        : `work.test.couplings declares ${toolchain.couplings.length} coupling${toolchain.couplings.length === 1 ? "" : "s"}.`,
    });
  }
  return Object.freeze({
    id: "test-layout-couplings",
    severity: "warning",
    message: `work.test.couplings is not declared, so every changed document widens the run to the whole suite. Declare which suites read which documents, or [] when none do, with ${TEST_LAYOUT_REPAIR}.`,
  });
}

// Only a declared gate is asked: a project with no gate runs it serially, and a serial gate has
// nothing to resume.
function resumeCheck({ gate }) {
  if (gate.reportArgs != null && gate.filesArgs != null) {
    return Object.freeze({ id: "test-layout-resume", severity: "ok", message: "work.test.gate declares reportArgs and filesArgs, so a gate that did not finish resumes." });
  }
  const missing = [gate.reportArgs == null ? "reportArgs" : null, gate.filesArgs == null ? "filesArgs" : null].filter(Boolean);
  return Object.freeze({
    id: "test-layout-resume",
    severity: "warning",
    message: `work.test.gate declares no ${missing.join(" or ")}, so a stopped gate re-runs the whole tree instead of resuming. ${TEST_LAYOUT_REPAIR} declares them when the gate program honours the resume contract.`,
  });
}

// `compiled` and `compiledGate` are the results of `resolveTestToolchain` and `resolveTestGate`.
// `tracked` is the tracked file list, or null when it could not be read. With `work.test`
// undeclared or malformed the family emits nothing: `aof test` already refuses there, naming the key.
export function testLayoutChecks({ compiled, compiledGate, tracked = null, workDir = null } = {}) {
  if (compiled?.ok !== true || compiledGate?.ok !== true) return Object.freeze([]);
  const toolchain = compiled.toolchain;
  const checks = [suitesCheck({ toolchain, tracked, workDir }), couplingsCheck({ toolchain })];
  if (compiledGate.gate != null) checks.push(resumeCheck({ gate: compiledGate.gate }));
  return Object.freeze(checks);
}
