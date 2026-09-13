// THE ONE HOME for "what is this module, and what does it depend on?" — 119/ADR-002.
//
// WHY IT EXISTS, MEASURED. Nine controls under `test/arch/` asserted a module's purity by banning
// the TOKEN `import` in its text (eleven assertion sites, measured at HEAD 2026-09-06 with
// `grep -rn 'doesNotMatch(.*import' test/arch/*.test.mjs`, keeping only the sites whose pattern
// carries no specifier and is not scoped to a dynamic `import(`). A token ban forbids the only
// decomposition that would fix the module it guards: `src/phase-brief.mjs` is 1,651 lines (432 when
// its guard was written) and `src/work/loops-checks.mjs` is 1,284 (380). Two of the nine guard
// `src/work-acceptor/rule.mjs` and `src/work-acceptor/ledger.mjs` — modules ALREADY inside one
// family directory, with the guard forbidding the edge between them.
//
// THE UNIT MOVES; NOTHING ELSE DOES. A purity guard constrains a module's EXTERNAL dependency set.
// A module is a FAMILY: `src/<name>/` when the directory exists, else `src/<name>.mjs`. A specifier
// resolving INSIDE the family is not an import OUT of the module. Every other leg — no `node:fs`,
// no `readFile`/`readdir`/`stat`/`access`, no `process.cwd`, no clock, no `fetch`, no
// `child_process`, no dynamic `import()` leaving the family — is re-asserted per file over the
// whole family. The guard is not relaxed.
//
// ONE HOME, NOT NINE. Nine controls each spelling their own specifier extractor is the duplication
// this milestone exists to remove — the argument `stripComments` already won (TECH_DEBT item 24,
// ratcheted by `test/arch/audit/acd-comment-stripper-order.test.mjs`). Comments are stripped THROUGH THAT
// ONE HOME here, and nowhere else: no stripper is hand-rolled in this module or in any caller.
// FF-11901 (`test/arch/audit/acd-purity-is-external.test.mjs`) asserts both halves as a class over
// `test/arch/**`, so a tenth guard written next year cannot re-introduce the token ban.
import path from "node:path";
import { readFile, readdir, stat } from "node:fs/promises";

import { stripComments } from "./source-slice.mjs";

const toPosix = (value) => String(value).split(path.sep).join("/");

// `src/phase-brief.mjs`, `src/phase-brief` and `src/phase-brief/` all name ONE subject. The
// extension is dropped so the two spellings of the same module cannot resolve to two families.
export function normalizeSubject(subject) {
  return toPosix(subject).replace(/\/+$/u, "").replace(/\.mjs$/u, "");
}

async function walkMjs(dir, repoRoot, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkMjs(full, repoRoot, out);
    else if (entry.name.endsWith(".mjs")) out.push(toPosix(path.relative(repoRoot, full)));
  }
  return out;
}

// THE FAMILY, RESOLVED FROM THE TREE RATHER THAN NAMED AS A FILE. The directory wins where it
// exists — that is the whole point: a module that has been decomposed into `src/<name>/` is still
// ONE module — and `files` is every `.mjs` beneath it at any depth. `root` is the containment
// boundary a specifier is tested against; for a single-file family it is that file, so no relative
// specifier can be inside it and every import is still an import OUT.
//
// A subject that resolves to NEITHER returns an empty family. Callers assert on that (see
// `purityProblems`), so a rename FAILS the guard naming the subject rather than emptying it.
export async function resolveFamily(repoRoot, subject) {
  const rel = normalizeSubject(subject);
  let isDirectory = false;
  try {
    isDirectory = (await stat(path.join(repoRoot, rel))).isDirectory();
  } catch {
    isDirectory = false;
  }
  if (isDirectory) {
    const files = (await walkMjs(path.join(repoRoot, rel), repoRoot)).sort();
    return { subject: rel, root: rel, isDirectory: true, files };
  }
  const file = `${rel}.mjs`;
  try {
    if ((await stat(path.join(repoRoot, file))).isFile()) {
      return { subject: rel, root: file, isDirectory: false, files: [file] };
    }
  } catch {
    // falls through to the empty family below
  }
  return { subject: rel, root: null, isDirectory: false, files: [] };
}

// EVERY STATIC AND DYNAMIC SPECIFIER, over comment-stripped source. The dynamic form is carried
// rather than dropped: a dynamic `import()` leaving the family is a violation exactly as the static
// form is, and one that stays inside it is admitted exactly as the static form is.
//
// THE CLAUSE SPANS LINES, AND THE BOUND MUST TOO. The obvious spelling — `[^;\n]*?` — is
// line-bounded, and this repo's own house style breaks it:
//
//   import {
//     WebSocket,
//   } from "ws";
//
// yields NO specifier under `\n`-bounded matching. Not a violation, not even a classification: the
// guard reports green over an import it never saw, which is precisely the "widening the unit while
// quietly dropping one of the other legs" failure `00_purity-is-external.feature` names, and the
// OLD token ban caught it. The bound is therefore `[^;()]*?` — the STATEMENT's own delimiter, not
// the line's. `(` stays excluded so the clause cannot run through a dynamic `import(` call and
// mis-attribute its specifier; `;` ends the statement. Measured against
// `test/arch/loop/acd-trigger-level-is-a-ceiling.test.mjs:89`, which already had this right.
//
// A TEMPLATE LITERAL WITH NO SUBSTITUTION IS A LITERAL (chore 121). `import(\`./x.mjs\`)` loads
// exactly what `import("./x.mjs")` loads, and `acd-loop-module-import-boundary` measured that form
// loading under Node while a `["']`-only extractor stayed green over it. The CALL forms therefore
// accept a backtick, and a template that carries `${…}` is left to `computedDynamicImports` below —
// it is the one form that cannot be resolved by reading, and the two functions partition it exactly.
const isLiteralSpecifier = (text) => !text.includes("${");

export function importSpecifiers(code) {
  const clean = stripComments(code);
  const found = [];
  const push = (specifier, dynamic) => found.push({ specifier, dynamic });
  for (const match of clean.matchAll(/\b(?:import|export)\b[^;()]*?\bfrom\s*["']([^"']+)["']/gu)) push(match[1], false);
  for (const match of clean.matchAll(/\bimport\s*["']([^"']+)["']/gu)) push(match[1], false);
  for (const match of clean.matchAll(/\brequire\s*\(\s*(["'`])([^"'`]+)\1/gu)) if (isLiteralSpecifier(match[2])) push(match[2], false);
  for (const match of clean.matchAll(/\bimport\s*\(\s*(["'`])([^"'`]+)\1/gu)) if (isLiteralSpecifier(match[2])) push(match[2], true);
  return found;
}

// A dynamic `import()` whose specifier is NOT a literal cannot be resolved by reading, and a guard
// that silently ignored it would admit the one form that defeats it. Reported separately so the
// caller names it rather than passing over it. A substitution-free template literal is NOT computed
// — `importSpecifiers` above carries it — so the two reports never name one call twice.
export function computedDynamicImports(code) {
  const clean = stripComments(code);
  const computed = [];
  for (const match of clean.matchAll(/\bimport\s*\(\s*([^)"'][^)]*)\)/gu)) {
    const expression = match[1].trim();
    if (/^`[^`]*`$/u.test(expression) && isLiteralSpecifier(expression)) continue;
    computed.push(expression);
  }
  return computed;
}

// ADMITTED ONLY WHEN IT RESOLVES INSIDE THE FAMILY. A bare specifier and a node builtin are
// violations by construction — neither can name a path under `src/<name>/`.
export function classifySpecifier(specifier, fromRel, family) {
  if (family?.root == null || !family.isDirectory) return "violation";
  if (specifier.startsWith("node:") || !specifier.startsWith(".")) return "violation";
  const joined = path.posix.normalize(path.posix.join(path.posix.dirname(toPosix(fromRel)), specifier));
  const resolved = joined.endsWith(".mjs") ? joined : `${joined}.mjs`;
  return resolved.startsWith(`${family.root}/`) ? "admitted" : "violation";
}

// EVERY OTHER PURITY LEG, UNCHANGED — the set the nine controls already asserted, kept here so it
// is asserted per file over the WHOLE family rather than over whichever single file a guard used to
// name. `import(` is deliberately absent: it is classified against the family above, so a dynamic
// import that stays inside a decomposed module is admitted while one that leaves is a violation.
const REACHES = Object.freeze([
  ["node:fs", /\bnode:fs\b/u],
  ["node:child_process / child_process", /\bchild_process\b/u],
  ["readFile", /\breadFile\s*\(/u],
  ["readdir", /\breaddir\s*\(/u],
  ["stat", /\bstat\s*\(/u],
  ["access", /\baccess\s*\(/u],
  ["process.cwd", /\bprocess\.cwd\b/u],
  ["Date.now / new Date()", /\bDate\.now\b|\bnew\s+Date\s*\(/u],
  ["performance.now", /\bperformance\.now\b/u],
  ["process.hrtime", /\bprocess\.hrtime\b/u],
  ["fetch", /\bfetch\s*\(/u],
]);

export function impureReaches(code) {
  const clean = stripComments(code);
  return REACHES.filter(([, pattern]) => pattern.test(clean)).map(([name]) => name);
}

// THE WHOLE REPORT, so a caller asserts on findings rather than re-deriving them.
//
// `members` narrows the files the OTHER legs are asserted over WITHOUT narrowing the containment
// boundary — the case `src/work-acceptor/` makes live in this tree: `rule.mjs` and `ledger.mjs` are
// two pure leaves inside a family whose other four members legitimately open files, so the edge
// between the two is admitted (that is ADR-002's own case) while the four are not dragged into a
// purity claim no ADR ever made about them. Omitted, every family member is in scope.
export async function familyPurity(repoRoot, subject, { members = null } = {}) {
  const family = await resolveFamily(repoRoot, subject);
  const scope = members == null ? family.files : members.map(toPosix);
  // A NARROWING MAY ONLY NARROW TO MEMBERS THAT EXIST. Without this, `{ members: ["src/x/a.mjs"] }`
  // over a family that has since been split silently scopes the claim to a file that is not in it —
  // one file scanned, `bytesRead > 0`, every non-vacuity leg satisfied, and the family's other
  // members free to import `node:fs` while both guards stay green. The escape hatch that lets the
  // acceptor pair keep its original subject must not also be the hatch that empties a purity claim.
  const strays = scope.filter((rel) => !family.files.includes(rel));
  if (strays.length > 0) {
    throw new Error(
      `module-family: ${subject} was scoped to member(s) that are not in its family — ${strays.join(", ")}. `
        + `The family resolved to ${family.files.length} file(s) from ${family.root ?? "nothing"}; a scope is a subset of the family, never a substitute for it.`,
    );
  }
  const classified = [];
  const reaches = [];
  const computed = [];
  let bytesRead = 0;
  for (const rel of scope) {
    const source = await readFile(path.join(repoRoot, rel), "utf8");
    bytesRead += source.length;
    for (const { specifier, dynamic } of importSpecifiers(source)) {
      classified.push({ file: rel, specifier, dynamic, verdict: classifySpecifier(specifier, rel, family) });
    }
    for (const reach of impureReaches(source)) reaches.push({ file: rel, reach });
    for (const expression of computedDynamicImports(source)) computed.push({ file: rel, expression });
  }
  return {
    family,
    scope,
    scanned: scope.length,
    bytesRead,
    classified,
    reaches,
    computed,
    violations: classified.filter((entry) => entry.verdict === "violation"),
  };
}

// THE FAILURES, AS MESSAGES — one list a caller asserts is empty, so nine controls do not each
// spell nine assertions. NON-VACUITY IS THE FIRST ENTRY, not an afterthought: a family that
// resolved to no files, or a scope whose files were all empty, FAILS here rather than passing over
// nothing, which is what makes a rename red the guard instead of disarming it (ADR-003 §4).
export function purityProblems(report) {
  const problems = [];
  if (report.family.files.length === 0) {
    problems.push(
      `the family for ${report.family.subject} resolved to NO files — neither ${report.family.subject}/ nor ${report.family.subject}.mjs exists. A purity guard whose subject moved must fail, never pass over the empty set.`,
    );
    return problems;
  }
  if (report.scanned === 0) problems.push(`no file of ${report.family.subject}'s family was read — the guard would assert over nothing`);
  if (report.bytesRead === 0) problems.push(`${report.family.subject}'s family read as ${report.scanned} empty file(s) — the guard would assert over nothing`);
  for (const entry of report.violations) {
    problems.push(
      `${entry.file} imports ${entry.specifier}${entry.dynamic ? " (dynamic import)" : ""} — that specifier does not resolve inside the family ${report.family.root}, so it is a dependency OUT of the module`,
    );
  }
  for (const entry of report.computed) {
    problems.push(`${entry.file} carries a dynamic import() with a computed specifier (${entry.expression}) — it cannot be classified by reading, so it is not admitted`);
  }
  for (const entry of report.reaches) problems.push(`${entry.file} reaches ${entry.reach} — the family's other purity legs are unchanged`);
  return problems;
}

// THE ONE ASSERTION EACH PURITY CONTROL MAKES. Kept here so the nine carriers share one failure
// message shape and none of them re-derives the predicate.
export async function assertFamilyPurity(assert, repoRoot, subject, options = {}) {
  const report = await familyPurity(repoRoot, subject, options);
  const problems = purityProblems(report);
  assert.deepEqual(
    problems,
    [],
    `${subject} is not pure as a FAMILY (${report.family.files.length} file(s) resolved from ${report.family.root ?? "nothing"}):\n  - ${problems.join("\n  - ")}`,
  );
  return report;
}
