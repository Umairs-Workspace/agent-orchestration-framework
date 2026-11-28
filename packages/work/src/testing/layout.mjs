import { isExcludedTest, isSuiteFile } from "./suites.mjs";

// 210/ADR-001: the project doctor and work update share these pure checks over the
// compiled declaration. The toolchain owns config and filesystem reads; this module
// owns the messages. Suite membership remains isSuiteFile's decision.

// The one repair every warning names.
export const TEST_LAYOUT_REPAIR = "/aof:map-tests";

export const TEST_LAYOUT_CHECK_IDS = Object.freeze(["test-instructions", "test-layout-suites", "test-layout-resume"]);

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

// Test-shaped files outside the suite predicate are gaps unless explicitly excluded.
function unselectable({ files, toolchain }) {
  return files
    .filter((file) => isTestShaped(file))
    .filter((file) => !isSuiteFile(file, toolchain.roots, toolchain.suiteSuffixes, toolchain.exclude))
    .filter((file) => !isExcludedTest(file, toolchain.exclude));
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
    // 190/ADR-008 §8 — an empty whole suite is never `ok`: `--all` and the gate would run nothing.
    if (!seen.some((file) => isSuiteFile(file, toolchain.roots, toolchain.suiteSuffixes, toolchain.exclude))) {
      return Object.freeze({
        id: "test-layout-suites",
        severity: "warning",
        message: `No tracked file is a suite under work.test's roots and suffixes, so the whole suite is empty and \`aof test --all\` runs nothing. Declare the roots and suffixes the runner's suites use with ${TEST_LAYOUT_REPAIR}.`,
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
    message: `${files.length} tracked test file${files.length === 1 ? " is" : "s are"} not a suite under work.test's roots and suffixes, so the declared runner cannot select ${files.length === 1 ? "it" : "them"}: ${listed.join(", ")}${more}. Declare them as suites, or exclude them with a reason where the runner does not run them, with ${TEST_LAYOUT_REPAIR}.`,
    details: Object.freeze(ranked.map(([dir, count]) => Object.freeze({ dir, count }))),
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

// A missing declared instructions file and a removed key (210/ADR-008) stay visible even though
// compilation failed: each is reported with the compiler's own message.
export function testLayoutChecks({ compiled, compiledGate, tracked = null, workDir = null } = {}) {
  if (compiled?.ok !== true) {
    if (compiled?.key === "work.test.instructions") {
      return Object.freeze([Object.freeze({ id: "test-instructions", severity: "error", message: compiled.message })]);
    }
    if (compiled?.code === "test-config-key-removed") {
      return Object.freeze([Object.freeze({ id: "test-config-key-removed", severity: "error", message: compiled.message, details: Object.freeze([compiled.key]) })]);
    }
    return Object.freeze([]);
  }
  const toolchain = compiled.toolchain;
  const instructions = Object.freeze(toolchain.instructions == null
    ? { id: "test-instructions", severity: "warning", message: `work.test.instructions is not declared. Draft the project's testing instructions with ${TEST_LAYOUT_REPAIR}.` }
    : { id: "test-instructions", severity: "ok", message: `Testing instructions: ${toolchain.instructions}.` });
  const checks = [instructions, suitesCheck({ toolchain, tracked, workDir })];
  if (compiledGate?.ok === true && compiledGate.gate != null) checks.push(resumeCheck({ gate: compiledGate.gate }));
  return Object.freeze(checks);
}
