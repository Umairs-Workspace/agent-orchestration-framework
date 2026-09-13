// THE TOOLKIT ROOT — WHERE AOF'S OWN PROGRAMS LIVE (milestone 77 / story 04). ADR-002 §1, §2, §3.
//
// ── TWO WORDS, TWO MEANINGS, NEITHER BORROWED ────────────────────────────────────────────────
//
// `repoRoot` is the SUBJECT root and keeps its meaning everywhere it already appears: the cited
// controls, the fitness register, the runner, the suite population, the audited loop registry, the
// audited settings file, and the working directory each child is started in. It is the workspace
// the operator pointed the audit at.
//
// The TOOLKIT root is a different thing that had no name: where aof itself was installed. Until
// this module existed the two were one variable, and in THIS repository that is invisible — the
// workspace under audit IS the aof checkout, so both resolve to one directory and every child
// program is found. That green is not evidence; it is the single arrangement in which the defect
// cannot appear. Anywhere else, `path.join(repoRoot, "src", "work", "audit-probe.mjs")` names a file
// that was never going to be there, every register row reports `evidence-unrunnable`, the sweep
// closes at `evidence-none-reproduced` and `aof work audit --strict` fails in every governed
// project — on aof's own file layout, drowning whatever the rules actually found (TECH_DEBT 72).
//
// ── ONE DERIVATION, ONE HOME ─────────────────────────────────────────────────────────────────
//
// The root is derived ONCE, here, from this module's own URL. A second module deriving a root for
// the same purpose is how two roots quietly become three and how the next reader learns that either
// word may mean either thing, so the derivation lives in one file and a gate reports a second one
// rather than a reviewer watching for it.
//
// ── AND A DERIVED ROOT IS ONLY HALF THE FIX ──────────────────────────────────────────────────
//
// TECH_DEBT 72's own prescription stops at "derive it from `import.meta.url`", and that cannot find
// a file that was never shipped: the payload is a copy of `src/` and carries no `scripts/` directory
// at all (`scripts/install-local.mjs`). So the admissible spawn target is constrained here too — a
// program the family starts must live under `src/`, because `src/` is what travels. A target under
// `scripts/`, an absolute path, or anything reaching outside the toolkit root is REFUSED naming the
// path and the reason, rather than silently attempted and reported as a child that would not start.
import path from "node:path";
import { fileURLToPath } from "node:url";

// The directory the payload copies, and therefore the only place a spawn target may live.
export const TOOLKIT_PROGRAM_DIR = "src";

// `<root>/src/work-audit/toolkit.mjs` → `<root>`. In a payload install that is `~/.aof/bin`; in a
// checkout it is the repository. Resolved per call rather than frozen at load, so a test can reason
// about it without a module cache standing in the way.
export function toolkitRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/**
 * PURE. The reasons a spawn target is not admissible, as sentences naming the path. Empty means the
 * target may be started. Driven from both sides by the control, so "no offender found" is never a
 * detector that finds nothing anywhere.
 */
export function toolkitProgramProblems(rel) {
  if (typeof rel !== "string" || rel.length === 0) {
    return ["a spawn target with no path was named — the family starts a declared program, never whatever it was handed"];
  }
  const problems = [];
  if (path.isAbsolute(rel) || /^[A-Za-z]:/u.test(rel)) {
    problems.push(`the spawn target "${rel}" is an absolute path, so it is outside the toolkit root entirely — aof's own programs are named relative to where aof was installed, never to a machine`);
    return problems;
  }
  const normalised = rel.split("\\").join("/");
  const segments = normalised.split("/");
  if (segments.includes("..")) {
    problems.push(`the spawn target "${rel}" reaches outside the toolkit root — a program the family starts is one of aof's own, and a path that climbs out of the install is not`);
  }
  if (segments[0] !== TOOLKIT_PROGRAM_DIR) {
    problems.push(`the spawn target "${rel}" is not under ${TOOLKIT_PROGRAM_DIR}/, and the payload is a copy of ${TOOLKIT_PROGRAM_DIR}/ and nothing else of the source tree — a program filed anywhere else is not carried by an install and could not be started there`);
  }
  return problems;
}

/**
 * A program of aof's own, resolved against the toolkit root. Refuses — loudly, naming the path and
 * the reason — anything the payload would not carry, so a target that cannot travel is reported
 * here rather than at a child process that mysteriously would not start.
 */
export function toolkitProgram(rel) {
  const problems = toolkitProgramProblems(rel);
  if (problems.length > 0) {
    throw new TypeError(`work-audit/toolkit: ${problems.join("; ")}`);
  }
  return path.join(toolkitRoot(), ...rel.split("\\").join("/").split("/"));
}

/**
 * PURE. Is the workspace under audit the install aof itself is running from?
 *
 * The two roots are one directory in THIS repository and in no other, which is what makes the
 * question worth asking rather than assuming: a fact about AOF'S OWN tree — the suites it ships, the
 * exemptions it carries for them — is true of the subject only when the subject IS this install.
 * Asserting one against the other is TECH_DEBT 72's shape a second time, and it reds a governed
 * project's audit for aof's own reasons (chore 99).
 *
 * `path.relative` decides it rather than a hand-rolled compare, so the platform's own rules about
 * drive-letter case and separators stay Node's single answer instead of becoming a second one here.
 * An empty or absent subject root is NOT the toolkit: it would otherwise resolve to the working
 * directory and quietly answer yes from wherever the process happened to be started.
 */
export function isToolkitRoot(subjectRoot, toolkit = toolkitRoot()) {
  if (typeof subjectRoot !== "string" || subjectRoot.trim().length === 0) return false;
  return path.relative(toolkit, subjectRoot) === "";
}
