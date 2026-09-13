// Fitness function: acd-reference-corpus-offline-and-sourced (milestone 77 / story 03, FF-7705;
// ADR-007 §1, §2, §2b, §3; ADR-008 §1, §3).
//
//   "The reference corpus is OFFLINE on the audit path, sourced and dated, and the refresh is
//    reachable from no CLI door."
//
// ── WHY EVERY DETECTOR HERE IS PURE AND EVERY CLAIM IS PLANTED AGAINST ───────────────────────
//
// Each leg below asserts an ABSENCE, and an absence measured by a detector nobody has driven is
// indistinguishable from a detector that finds nothing anywhere. So each detector takes its input
// as an argument, the real subject is passed through it, and the same detector is then handed the
// forbidden shape and required to report it. A leg that cannot fail is not a control.
//
// ── THE NETWORK CENSUS IS OVER THE IMPORT CLOSURE, NOT A DIRECTORY ───────────────────────────
//
// The determinism this milestone sells is "the same audit over the same corpus answers the same
// thing tomorrow", and the one thing that could break it is a fetch anywhere the audit can reach.
// A directory sweep would miss a module one level up, which is the exact defect `59/FF-5904` was
// corrected for — so the closure walker is reused from that gate rather than written a second
// time, and the census runs over every module the family can LOAD.
//
// ── AND A URL THAT IS DATA IS NOT A NETWORK CAPABILITY ───────────────────────────────────────
//
// The corpus's whole value is that every row carries a source URL. A census that flagged those
// would force the corpus to stop citing its sources to satisfy the rule that exists to keep it
// honest — so the request-position test is what decides, and the corpus's rows and a documentation
// link in a comment are both driven through it and required to be silent.
//
// ── THE WORD `baseline` (ADR-007 §1, FF-7706's vocabulary leg, scoped to this story) ─────────
//
// `UNREGISTERED_BASELINE` one directory over owns that word for the shrink-only exemption ledger,
// with its own two finding codes. This story's MODULES spell it nowhere and its finding codes
// contain it nowhere. The generated view's FILENAME carries it because the SPEC asked for that file
// by name and the story's declared write set names that exact path; it is a rendering nothing
// parses, and the only place that spells it is the hand-run program under `scripts/`, which is not
// a module of this project and travels nowhere.
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { importClosure, staticImportSpecifiers } from "../audit/acd-audit-never-imports-project-code.test.mjs";
import { AUDIT_FINDING_CODES } from "../../../src/work-audit/census.mjs";
import { HARNESS_REFERENCE_ROWS, REFERENCE_ROW_FLOOR, checkReferenceCorpus, referenceCorpusProblems } from "../../../src/harness-reference.mjs";
import { DECLARED_BOUNDS_FINDING_CODES } from "../../../src/work-audit/declared-bounds.mjs";
import { listCommands } from "../../../src/command-core.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const CORPUS_REL = "src/harness-reference.mjs";
const LANE_REL = "src/work-audit/declared-bounds.mjs";
const REFRESH_REL = "scripts/refresh-harness-reference.mjs";
const VIEW_REL = "wiki/reference/harness-baselines.md";
// The modules THIS STORY ADDS — the subject of the vocabulary and import legs. The refresh is a
// PROGRAM under `scripts/`: nothing imports it, it is in no payload, and it is not a module of this
// project's source.
const STORY_MODULES = Object.freeze([CORPUS_REL, LANE_REL]);

const FAMILY_ROOT = "src/work-audit";
const CLOSURE_FLOOR = 6;

const read = (rel) => readFileSync(path.join(repoRoot, rel), "utf8");

// ── THE DETECTORS, PURE ──────────────────────────────────────────────────────────────────────

const HTTP_CLIENT_PACKAGES = Object.freeze(["undici", "axios", "node-fetch", "got", "superagent", "phin"]);

/**
 * The network capabilities a module names, over COMMENT-STRIPPED source. A URL in a comment is a
 * citation; a URL handed to a call is a request. That distinction is the whole of the corpus's
 * right to carry its own sources.
 */
export function networkCapabilities(rel, code) {
  const found = [];
  if (/\bfetch\s*\(/u.test(code)) found.push(`${rel} calls fetch`);
  for (const builtin of ["node:https", "node:http"]) {
    if (new RegExp(`from\\s+"${builtin}"`, "u").test(code)) found.push(`${rel} imports the ${builtin} builtin`);
  }
  for (const specifier of staticImportSpecifiers(code)) {
    if (HTTP_CLIENT_PACKAGES.includes(specifier)) found.push(`${rel} imports the http client "${specifier}"`);
  }
  if (/\bWebFetch\b/u.test(code)) found.push(`${rel} names a web-fetch tool invocation`);
  // A REQUEST POSITION: the literal is an argument of a call. A literal that is a property value,
  // an array element or a bound name is DATA — which is what every row of the corpus is.
  for (const match of code.matchAll(/(\S)\s*(["'`])https?:\/\//gu)) {
    if (match[1] === "(" || match[1] === ",") found.push(`${rel} holds an ${match[0].slice(-8)} literal in a request position`);
  }
  return found;
}

/** The ways a module could reach the refresh program, or the generated view. */
export function pathReaches(rel, code, target) {
  const found = [];
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  if (new RegExp(escaped, "u").test(code)) found.push(`${rel} spells "${target}" as a literal`);
  const basename = target.slice(target.lastIndexOf("/") + 1);
  if (new RegExp(`import\\s*\\(\\s*["'\`][^"'\`]*${basename.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}`, "u").test(code)) {
    found.push(`${rel} dynamically imports ${basename}`);
  }
  for (const specifier of staticImportSpecifiers(code)) {
    if (specifier.includes(basename)) found.push(`${rel} statically imports ${basename}`);
  }
  return found;
}

/** The second meaning of the ledger's word, anywhere in a module this story adds. */
export function baselineUses(rel, code) {
  const found = [];
  if (/baseline/iu.test(code)) found.push(`${rel} spells the exemption ledger's word`);
  if (rel.toLowerCase().includes("baseline")) found.push(`${rel} is a module named for a baseline`);
  return found;
}

/** A reach for the loop-registry god-node, in any of its three shapes. */
export function registryReaches(rel, code) {
  const found = [];
  for (const specifier of staticImportSpecifiers(code)) {
    if (specifier.includes("work/loops.mjs")) found.push(`${rel} statically imports the loop registry module`);
  }
  if (/import\s*\(\s*["'`][^"'`]*work[-/]loops\.mjs/u.test(code)) found.push(`${rel} dynamically imports the loop registry module`);
  if (/export\s*(?:\*|\{[^}]*\})\s*from\s+"[^"]*work[-/]loops\.mjs"/u.test(code)) found.push(`${rel} re-exports from the loop registry module`);
  return found;
}

async function familyClosure() {
  const roots = [];
  async function walk(dir, prefix) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const rel = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), rel);
      else if (entry.name.endsWith(".mjs")) roots.push(rel);
    }
  }
  await walk(path.join(repoRoot, FAMILY_ROOT), FAMILY_ROOT);
  const { closure } = await importClosure(roots, async (rel) => {
    try {
      return await readFile(path.join(repoRoot, rel), "utf8");
    } catch {
      return null;
    }
  });
  return closure;
}

export const archTests = [
  // ── (A) THE AUDIT PATH REACHES NO NETWORK ──────────────────────────────────────────────────
  {
    name: "acd-reference-corpus-offline-and-sourced: no module the audit family can load names a network capability",
    async run() {
      const closure = await familyClosure();
      assert.equal(closure.size >= CLOSURE_FLOOR, true, `the family's import closure was walked (${closure.size} modules, floor ${CLOSURE_FLOOR})`);
      assert.equal(closure.has(LANE_REL), true, "and it holds this story's lane");
      assert.equal(closure.has(CORPUS_REL), true, "…and the corpus it joins against");

      const found = [];
      for (const [rel, code] of closure) found.push(...networkCapabilities(rel, stripComments(code)));
      assert.deepEqual(found, [], "no module in the closure reaches the network");

      // PLANTED, one shape at a time — every way a fetch arrives.
      const plants = [
        ['const answer = await fetch("https://example.invalid");', "a call to fetch"],
        ['import https from "node:https";', "an import of the https builtin"],
        ['import http from "node:http";', "an import of the http builtin"],
        ['import { request } from "undici";', "an import of an http client dependency"],
        ['client.get("http://example.invalid/x");', "an http:// literal in a request position"],
        ['client.get("https://example.invalid/x");', "an https:// literal in a request position"],
        ["await WebFetch({ url });", "a web-fetch tool invocation"],
      ];
      for (const [planted, what] of plants) {
        assert.equal(networkCapabilities(LANE_REL, planted).length > 0, true, `${what} is reported by the file that holds it`);
      }
    },
  },
  {
    name: "acd-reference-corpus-offline-and-sourced: a URL that is data is not a network capability",
    run() {
      const corpus = stripComments(read(CORPUS_REL));
      assert.deepEqual(networkCapabilities(CORPUS_REL, corpus), [], "the corpus's source URLs are data, and are not reported");
      assert.equal(HARNESS_REFERENCE_ROWS.every((row) => /^https?:\/\//u.test(row.source)), true, "…and the rows still carry them");
      const documented = '// see https://example.invalid/docs for the rule\nexport const A = 1;\n';
      assert.deepEqual(networkCapabilities(LANE_REL, stripComments(documented)), [], "a documentation link in a comment is not reported either");
    },
  },

  // ── (B) THE CORPUS IMPORTS NOTHING, AND ITS ROWS ARE SOURCED AND DATED ─────────────────────
  {
    name: "acd-reference-corpus-offline-and-sourced: the corpus imports nothing, so loading it drags no closure behind it",
    run() {
      const code = stripComments(read(CORPUS_REL));
      assert.deepEqual(staticImportSpecifiers(code), [], "no static import");
      assert.equal(/\brequire\s*\(/u.test(code), false, "no require");
      assert.equal(/\bimport\s*\(/u.test(code), false, "no dynamic import");
      // And it derives no root, which is what makes it reachable by module resolution alone.
      assert.equal(/process\.cwd|import\.meta\.url|__dirname/u.test(code), false, "and it derives no root from anybody's directory");

      const planted = 'import { readRecord } from "./work-audit/reads.mjs";\nexport const A = 1;\n';
      assert.deepEqual(staticImportSpecifiers(planted), ["./work-audit/reads.mjs"], "with an import planted in it, that import is reported by the file holding it");
    },
  },
  {
    name: "acd-reference-corpus-offline-and-sourced: every row carries a source URL and a parseable date, against a floor greater than zero",
    run() {
      const check = checkReferenceCorpus();
      assert.deepEqual(check.problems, [], `the shipped corpus is admissible: ${check.problems.join("; ")}`);
      assert.equal(REFERENCE_ROW_FLOOR > 0, true, "the non-vacuity floor is greater than zero");
      assert.equal(check.count >= REFERENCE_ROW_FLOOR, true, `${check.count} row(s) read against a floor of ${REFERENCE_ROW_FLOOR}`);
      assert.equal(referenceCorpusProblems([]).length > 0, true, "and a corpus that emptied could not pass");
    },
  },

  // ── (C) THE REFRESH IS REACHABLE FROM NO DOOR ──────────────────────────────────────────────
  {
    name: "acd-reference-corpus-offline-and-sourced: no module in src/ and no module of the family names the refresh program",
    async run() {
      const files = await readSrcFiles(repoRoot);
      assert.equal(files.length > 50, true, `src/** was walked (${files.length} modules)`);
      const offenders = [];
      for (const file of files) {
        offenders.push(...pathReaches(`src/${file.rel}`, stripComments(await readFile(file.path, "utf8")), REFRESH_REL));
      }
      assert.deepEqual(offenders, [], "no module under src/ imports, spawns or spells the refresh program");

      const closure = await familyClosure();
      const familyOffenders = [];
      for (const [rel, code] of closure) familyOffenders.push(...pathReaches(rel, stripComments(code), REFRESH_REL));
      assert.deepEqual(familyOffenders, [], "and no module the audit family can load names it either");

      const plants = [
        [`import { refreshRows } from "../../${REFRESH_REL}";`, "an import of the refresh program from a module of the audit family"],
        [`await import("../../${REFRESH_REL}");`, "a dynamic import of the refresh program"],
        [`spawn(process.execPath, ["${REFRESH_REL}"]);`, "a spawn of the refresh program from a module under the payload's source"],
      ];
      for (const [planted, what] of plants) {
        assert.equal(pathReaches(LANE_REL, planted, REFRESH_REL).length > 0, true, `${what} is reported by the place that holds it`);
      }
    },
  },
  {
    name: "acd-reference-corpus-offline-and-sourced: no registered command names the refresh, and no option of the audit is a refresh",
    run() {
      const commands = listCommands();
      assert.equal(commands.length > 20, true, `the command registry was read (${commands.length} commands)`);
      const namesTheRefresh = (command) => JSON.stringify({ id: command.id, cli: command.cli ?? null, input: command.input ?? null }).includes("refresh-harness-reference");
      for (const command of commands) {
        assert.equal(namesTheRefresh(command), false, `${command.id} does not name the refresh program`);
      }
      // PLANTED: a registered command whose declaration names the refresh program.
      assert.equal(
        namesTheRefresh({ id: "work:refresh", cli: { route: ["work", "refresh"], spec: { usage: "aof work refresh", program: REFRESH_REL } } }),
        true,
        "a registered command whose declaration named it would be reported",
      );

      const audit = commands.find((command) => command.id === "work:audit");
      assert.notEqual(audit, undefined, "the audit command is registered");
      const surface = JSON.stringify({ cli: audit.cli, input: audit.input });
      const story = STORY_MODULES.map((rel) => read(rel)).join("\n");
      for (const option of ["--refresh-baselines", "--refresh-reference", "--refresh", "--check-sources", "--update-corpus"]) {
        const flag = option.replace(/^--/u, "");
        assert.equal(surface.includes(flag), false, `${option} is absent from the audit command's declared options`);
        assert.equal(story.includes(option), false, `${option} is absent from every module this story adds`);
      }

      // The planted door, so the detector is known to see one.
      assert.equal(JSON.stringify({ flags: { refresh: {} } }).includes("refresh"), true, "a flag named refresh would be seen in that declaration");
    },
  },
  {
    name: "acd-reference-corpus-offline-and-sourced: the corpus travels with the payload and the program that rewrites it does not",
    run() {
      // THE RULE IS READ FROM THE INSTALLER, then its consequence is driven.
      const installer = read("scripts/install-local.mjs");
      const copied = [...installer.matchAll(/cpSync\(path\.join\(repoRoot,\s*"([^"]+)"\)/gu)].map((match) => match[1]);
      assert.equal(copied.includes("src"), true, `the installer copies src/ into the payload (copies: ${copied.join(", ") || "none"})`);
      assert.equal(copied.includes("scripts"), false, "…and copies no scripts/ directory at all");

      const payload = mkdtempSync(path.join(os.tmpdir(), "aof-payload-"));
      try {
        cpSync(path.join(repoRoot, "src"), path.join(payload, "src"), { recursive: true });
        assert.equal(existsSync(path.join(payload, CORPUS_REL)), true, "the corpus is in the payload");
        const rows = readFileSync(path.join(payload, CORPUS_REL), "utf8");
        for (const row of HARNESS_REFERENCE_ROWS) assert.equal(rows.includes(row.id), true, `…and its rows are readable there (${row.id})`);
        assert.equal(existsSync(path.join(payload, REFRESH_REL)), false, "and the refresh program is not");
      } finally {
        rmSync(payload, { recursive: true, force: true });
      }
    },
  },
  {
    name: "acd-reference-corpus-offline-and-sourced: the generated view is a rendering nothing reads",
    async run() {
      const view = read(VIEW_REL);
      assert.match(view, /GENERATED by `scripts\/refresh-harness-reference\.mjs` at /u, "the view carries a stamp naming the program that wrote it and when");
      assert.match(view, /do not hand-edit/iu, "…and says it is not to be hand-edited");
      for (const row of HARNESS_REFERENCE_ROWS) assert.equal(view.includes(row.id), true, `it renders the module's rows (${row.id})`);

      const files = await readSrcFiles(repoRoot);
      const readers = [];
      for (const file of files) {
        readers.push(...pathReaches(`src/${file.rel}`, stripComments(await readFile(file.path, "utf8")), VIEW_REL));
      }
      assert.deepEqual(readers, [], "and no module under src/ reads it, parses it, imports it or spells its path");

      const plants = [
        [`await readFile("${VIEW_REL}", "utf8");`, "a read of the view's path"],
        [`const table = parse(readFileSync("${VIEW_REL}"));`, "a parse of the view's table"],
        [`import view from "../../${VIEW_REL}";`, "an import naming the view"],
        [`export const VIEW = "${VIEW_REL}";`, "the view's path spelled as a literal in a module"],
      ];
      for (const [planted, what] of plants) {
        assert.equal(pathReaches(LANE_REL, planted, VIEW_REL).length > 0, true, `${what} is reported by the file that holds it`);
      }
    },
  },

  // ── (D) ONE WORD, ONE MEANING; AND THREE CODES ────────────────────────────────────────────
  {
    name: "acd-reference-corpus-offline-and-sourced: no module this story adds spells the exemption ledger's word",
    run() {
      const found = [];
      for (const rel of STORY_MODULES) found.push(...baselineUses(rel, stripComments(read(rel))));
      assert.deepEqual(found, [], "the second meaning arrives in none of this story's modules");

      for (const code of DECLARED_BOUNDS_FINDING_CODES) {
        assert.equal(/baseline/iu.test(code), false, `${code} does not contain the word`);
      }
      for (const row of HARNESS_REFERENCE_ROWS) {
        assert.equal(/baseline/iu.test(row.id), false, `no corpus row's id contains the word (${row.id})`);
        assert.deepEqual(Object.keys(row).filter((key) => /baseline/iu.test(key)), [], `no row field is named for it (${row.id})`);
      }

      const plants = [
        ["src/work-audit/baseline-corpus.mjs", "export const A = 1;\n", "a module named for a baseline"],
        [LANE_REL, "export const REFERENCE_BASELINE = 1;\n", "an exported constant whose name contains BASELINE"],
        [LANE_REL, 'const codes = ["audit-baseline-drift"];\n', "a finding code containing the word baseline"],
        [LANE_REL, "const row = { baseline: 10 };\n", "a row field named baseline"],
        [LANE_REL, 'const row = { id: "some-baseline-row" };\n', "a corpus row whose id contains the word baseline"],
      ];
      for (const [rel, planted, what] of plants) {
        assert.equal(baselineUses(rel, planted).length > 0, true, `${what} is reported by the place that holds it`);
      }
    },
  },
  {
    name: "acd-reference-corpus-offline-and-sourced: this story's codes are the three, and the ledger keeps its own",
    run() {
      assert.deepEqual(
        [...DECLARED_BOUNDS_FINDING_CODES],
        ["audit-bound-undeclared", "audit-bound-off-reference", "audit-reference-stale"],
        "the bounds lane can emit exactly these three",
      );
      for (const code of DECLARED_BOUNDS_FINDING_CODES) {
        assert.equal(AUDIT_FINDING_CODES.includes(code), false, `${code} equals no code the census lane already emits`);
      }
      for (const code of ["audit-baseline-stale", "audit-baseline-unreasoned"]) {
        assert.equal(AUDIT_FINDING_CODES.includes(code), true, `the exemption ledger's ${code} is unchanged`);
      }
      const census = read("src/work-audit/census.mjs");
      assert.match(census, /UNREGISTERED_BASELINE = Object\.freeze\(\[/u, "…and the ledger still names suites");
      assert.match(census, /suite: "test\//u, "…by suite path");
    },
  },

  // ── (E) THE LANE NEVER PULLS IN THE REGISTRY GOD-NODE ─────────────────────────────────────
  {
    name: "acd-reference-corpus-offline-and-sourced: the bounds lane reaches the bounds home and never the loop registry module",
    async run() {
      const closure = await familyClosure();
      const reaches = [];
      for (const [rel, code] of closure) reaches.push(...registryReaches(rel, stripComments(code)));
      assert.deepEqual(reaches, [], "no module the family loads reaches src/work/loops.mjs");

      const lane = stripComments(read(LANE_REL));
      assert.match(lane, /from "\.\.\/loop-bounds\.mjs"/u, "the lane resolves config: pointers through the bounds home");
      assert.match(lane, /from "\.\.\/harness-reference\.mjs"/u, "…and joins against the corpus by module resolution");
      assert.equal(/from "node:/u.test(lane), false, "…and imports no node builtin, so it touches no filesystem and no clock");
      assert.equal(/Date\.now\(\)|new Date\(\)/u.test(lane), false, "…and reads no clock: the instant arrives on the call");

      const plants = [
        ['import { loadLoops } from "../work/loops.mjs";', "an import of the loop registry module"],
        ['await import("../work/loops.mjs");', "a dynamic import of the loop registry module"],
        ['export { loadLoops } from "../work/loops.mjs";', "a re-export from the loop registry module"],
      ];
      for (const [planted, what] of plants) {
        assert.equal(registryReaches(LANE_REL, planted).length > 0, true, `${what} is reported by the file that holds it`);
      }
    },
  },
];
