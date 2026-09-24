// FF-13404 (milestone 134 / ADR-003 §4) — THE SETTLE READS THE TRANSCRIPT STORE THAT EXISTS.
//
// "The seam never hands the repository root to a transcript read. The directory a caller does not
//  give is resolved through `claudeProjectsDir`, and only when the caller names a workspace. The
//  two driven settles each pass their own `projectsDir` and `spendSettled: true`."
//
// Why it matters (RESEARCH R5): `transitionRunComplete` defaulted the transcript directory to
// `workspace.projectRoot`, where no transcript lives, so a hand-run `aof work run-complete` never
// stamped spend and reported nothing wrong. An answer stamp hung on that seam would stamp nothing
// the same way. And the driven settles settle spend themselves against a resume baseline: a seam
// that resolved a directory for them would stamp the WHOLE transcript tree over a spend they
// withheld, charging earlier runs' cost to this one.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { functionBody, matchedParenSpan, stripComments, topLevelArguments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SEAM = "src/effects/run-transitions.mjs";
const DRIVEN = [
  ["src/loop/cycle.mjs", "export async function settleDriven("],
  ["src/commands/drive.mjs", null],
];

const source = async (file) => stripComments(await readFile(path.join(repoRoot, file), "utf8"));

// What, in the seam's (comment-stripped) code, breaks the rule. Empty when it holds.
function seamFindings(code) {
  const findings = [];
  const complete = functionBody(code, "export async function transitionRunComplete(");
  if (complete == null) return ["transitionRunComplete is not found"];
  // The event payload names the workspace root as data; that is not a transcript read.
  const reads = complete.replace(/workspaceRoot\s*:\s*workspace\s*\?\.\s*projectRoot\s*\?\?\s*null/g, "");
  if (/\bprojectRoot\b/.test(reads)) findings.push("transitionRunComplete takes a transcript directory from workspace.projectRoot");
  const call = /\bcompleteRun\s*\(/.exec(complete);
  const args = call ? topLevelArguments(matchedParenSpan(complete, call.index)?.body) : [];
  const options = args[1] ?? "";
  if (!/\bprojectsDir\s*:\s*settleProjectsDir\s*\(/.test(options)) findings.push("completeRun's directory is not the resolved one");
  if (!/\bsettleSpend\s*:\s*!\s*spendSettled\b/.test(options)) findings.push("completeRun is not told whether the caller settled the spend");

  const resolver = functionBody(code, "function settleProjectsDir(");
  if (resolver == null) return [...findings, "settleProjectsDir is not found"];
  const guard = /if\s*\([^)]*\bworkspace\b[^)]*\)\s*return\s+undefined\s*;/.exec(resolver);
  const resolve = /\bclaudeProjectsDir\s*\(\s*\{\s*cwd\s*:\s*workspace\.projectRoot\b/.exec(resolver);
  if (!resolve) findings.push("the directory a caller does not give is not resolved through claudeProjectsDir from the workspace root");
  if (!guard || (resolve && guard.index > resolve.index)) findings.push("the resolution is not confined to a caller that names a workspace");
  if (/return\s+[^;]*\bprojectRoot\s*;/.test(resolver)) findings.push("settleProjectsDir returns the repository root");
  return findings;
}

// The options argument of every `transitionRunComplete(` call in a region.
function settleOptions(region) {
  const out = [];
  for (const match of region.matchAll(/\btransitionRunComplete\s*\(/g)) {
    out.push(topLevelArguments(matchedParenSpan(region, match.index)?.body)[2] ?? "");
  }
  return out;
}

function drivenFindings(region) {
  if (region == null) return ["the driven settle is not found"];
  const calls = settleOptions(region);
  if (calls.length === 0) return ["the driven settle calls no transitionRunComplete"];
  return calls.flatMap((options) => [
    ...(/\bspendSettled\s*:\s*true\b/.test(options) ? [] : ["does not pass spendSettled: true"]),
    ...(/\bprojectsDir\b/.test(options) ? [] : ["does not pass its own projectsDir"]),
  ]);
}

const drivenRegion = (code, header) => (header ? functionBody(code, header) : code);

export const archTests = [
  {
    name: "arch/134 FF-13404: the settle seam never hands the repository root to a transcript read, and resolves through claudeProjectsDir only for a named workspace",
    run: async () => {
      const code = await source(SEAM);
      assert.deepEqual(seamFindings(code), []);
      assert.match(code, /import\s*\{\s*claudeProjectsDir\s*\}\s*from\s*["']\.\.\/work\/observe\.mjs["']/, "the resolution is the one home's");
    },
  },
  {
    name: "arch/134 FF-13404: settleDriven and the drive settle each pass their own projectsDir and spendSettled: true",
    run: async () => {
      for (const [file, header] of DRIVEN) {
        assert.deepEqual(drivenFindings(drivenRegion(await source(file), header)), [], file);
      }
    },
  },
  {
    name: "arch/134 FF-13404 red probe: a planted `projectsDir ?? workspace?.projectRoot`, or a driven settle with its `spendSettled: true` removed, turns the control red",
    run: async () => {
      const seam = await readFile(path.join(repoRoot, SEAM), "utf8");
      const planted = seam.replace(/projectsDir:\s*settleProjectsDir\(\{[^}]*\}\)/, "projectsDir: projectsDir ?? workspace?.projectRoot ?? undefined");
      assert.notEqual(planted, seam, "the plant landed");
      assert.ok(seamFindings(stripComments(planted)).length > 0, "the repository-root fallback is seen");
      const unguarded = seam.replace(/if \(typeof workspace\?\.projectRoot[^\n]*\n/, "");
      assert.notEqual(unguarded, seam, "the guard plant landed");
      assert.ok(seamFindings(stripComments(unguarded)).length > 0, "a resolution with no workspace guard is seen");
      for (const [file, header] of DRIVEN) {
        const text = await readFile(path.join(repoRoot, file), "utf8");
        const stripped = text.replace(/,\s*spendSettled:\s*true/, "");
        assert.notEqual(stripped, text, `${file}: the plant landed`);
        assert.ok(drivenFindings(drivenRegion(stripComments(stripped), header)).length > 0, `${file}: a driven settle without spendSettled: true is seen`);
      }
    },
  },
];
