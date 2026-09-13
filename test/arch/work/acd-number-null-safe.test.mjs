// FF-12702 — milestone 127 / ADR-002 §2, §4: EVERY `.number` CONSUMER IS NULL-SAFE.
//
// With three roots a row's `number` may be `null` (a backlog row), and `Number.parseInt(null, 10)`
// is `NaN` — which compares false to everything, sorts nowhere and keys a Map at a slot nothing
// reads. An unguarded site over a backlog row is therefore a SILENT mis-answer, never a crash,
// which is exactly why a textual control holds it rather than a behavioural one.
//
// THE RULE, per site. For every `parseInt(<expr>.number …)` in the eleven files, the text of its
// enclosing TOP-LEVEL function — the outermost declaration, so a comparator or an arrow inside
// it is judged by the function that owns it — from that declaration's opening line to the site
// contains one of:
//   · a call to `isLiveStreamRow` (or `.filter(isLiveStreamRow)`) — the scheduling question;
//   · a `.number != null` / `!== null` / `== null` / `=== null` guard — the numbering question;
//   · a narrowing on `type === "story"` / `type !== "story"` — a story row always carries a number.
// A site the rule cannot classify is admitted ONLY by the explicit allow-list below, keyed by
// file + enclosing function + reason (never by line, which moves), so a new one cannot arrive
// silently. An unguarded, un-allow-listed site fails the control with one finding naming
// `file:line`.
//
// THE SET IS EXACTLY ELEVEN FILES, asserted by set-equality over a comment-stripped sweep of
// `src/**`: a twelfth file gaining a `.number` parse must be added here consciously, and a
// file losing its last site must be removed — either way the control names the drift. The
// contract named ten (task 04's preamble, measured at 2321dce8); 127/02 added the eleventh,
// `src/commands/promote.mjs` — the ONE mint (127/ADR-003) reads the stream's width and the
// archived-collision set over rows, and every one of its sites is guarded by the rule.
//
// Non-vacuous: at least ten sites must be CLASSIFIED by the rule (allow-listed sites do not
// count), so the control cannot pass over an empty or fully allow-listed sweep. (A site count,
// not a file count — it did not move with the eleventh file.)
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The ten files, as the contract names them (task 04's preamble, measured at 2321dce8), plus the
// one 127/02 added.
export const NUMBER_CONSUMER_FILES = Object.freeze([
  "src/work.mjs",
  "src/work/reindex.mjs",
  "src/commands/migrate-folder.mjs",
  "src/commands/insert-shared.mjs",
  "src/work/doctor-depends.mjs",
  "src/work/doctor-freshness.mjs",
  "src/work/doctor.mjs",
  "src/work/doctor-coherence.mjs",
  "src/memory/local-indexing.mjs",
  "src/work-promote/promotion.mjs",
  // 127/02 — the eleventh: the one mint (127/ADR-003) reads the stream's width (`streamWidth`)
  // and the archived-collision set (`archivedCollisions`) over rows, and `numbersWritten`
  // filters through `isLiveStreamRow`. All four sites are guarded; none is allow-listed.
  "src/commands/promote.mjs",
]);

// The sites the rule cannot classify, each with the reason it is admitted. Keyed by file +
// enclosing top-level function — never by line.
export const ALLOWED_UNCLASSIFIED = Object.freeze([
  { file: "src/commands/migrate-folder.mjs", fn: "recoverSourceStories", reason: "source-scan units (a foreign tree's story folders), not enumerator rows" },
  { file: "src/commands/migrate-folder.mjs", fn: "recoverSourceTasks", reason: "source-scan units (a foreign tree's task features), not enumerator rows" },
  { file: "src/work/doctor-freshness.mjs", fn: "roadmapFolderMismatch", reason: "a ROADMAP index entry (`entry?.number`, config data), not a row" },
  { file: "src/work/reindex.mjs", fn: "reindexForInsert", reason: "its rows are `selectAffected`'s output, filtered through isLiveStreamRow there" },
]);

// The site shape — the contract's own grep, `parseInt\([^()]*\.number[^()]*\)`, widened at the
// round-one review close (2026-09-11) to the `Number(<x>.number)` coercion: a spelling the
// contract's grep could not see, and one the build had reached for precisely because it could
// not. `Number.parseInt(…)` matches on its `parseInt(`; the lookbehind keeps `sameNumber(…)` and
// every other `…Number(` identifier out. Unary `+x.number` is not admitted here — no src site
// spells it, and a grammar that guessed at operators would name division expressions.
const SITE_RE = /(?:parseInt|(?<![\w$.])Number)\([^()]*\.number[^()]*\)/g;
// A top-level declaration: a `function` (optionally exported/async) or a `const NAME =` at column 0.
const TOP_LEVEL_RE = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/;
const GUARD_RE = /\bisLiveStreamRow\s*\(|\.filter\(isLiveStreamRow\)|\.number\s*(?:!==?|===?)\s*null|\btype\s*(?:===|!==)\s*"story"/;

// Line-align a stripped-source line back onto the original file: the stripper keeps code bytes
// in order and drops whole-comment lines, so a monotonic forward search over trimmed lines
// recovers the original line number for a finding.
function originalLineOf(strippedLines, originalLines, strippedIndex) {
  let cursor = 0;
  for (let index = 0; index <= strippedIndex; index += 1) {
    const needle = strippedLines[index].trim();
    if (needle === "") continue;
    while (cursor < originalLines.length && !originalLines[cursor].trim().startsWith(needle)) cursor += 1;
    if (index === strippedIndex) return cursor + 1;
    cursor += 1;
  }
  return strippedIndex + 1;
}

// Every `.number` parse site in one file, classified.
export function classifyNumberSites(source) {
  const stripped = stripComments(source);
  const strippedLines = stripped.split("\n");
  const originalLines = source.split("\n");
  const sites = [];
  // Top-level declarations by stripped line index.
  const declarations = [];
  strippedLines.forEach((line, index) => {
    const match = line.match(TOP_LEVEL_RE);
    if (match) declarations.push({ line: index, name: match[1] ?? match[2] });
  });
  strippedLines.forEach((line, index) => {
    for (const match of line.matchAll(SITE_RE)) {
      const owner = [...declarations].reverse().find((declaration) => declaration.line <= index) ?? null;
      const from = owner ? owner.line : 0;
      const window = strippedLines.slice(from, index).join("\n") + "\n" + line.slice(0, match.index);
      sites.push({
        line: originalLineOf(strippedLines, originalLines, index),
        text: match[0],
        fn: owner?.name ?? "(module scope)",
        guarded: GUARD_RE.test(window),
      });
    }
  });
  return sites;
}

export async function sweepNumberSites() {
  const perFile = new Map();
  for (const file of await readSrcFiles(repoRoot)) {
    const rel = `src/${file.rel}`;
    const source = await readFile(file.path, "utf8");
    // A fresh, non-global test: the sweep regex is `g` for matchAll, and `.test` on a `g` regex
    // carries `lastIndex` across calls, which is how a second sweep would silently see nothing.
    if (!new RegExp(SITE_RE.source).test(stripComments(source))) continue;
    perFile.set(rel, classifyNumberSites(source));
  }
  return perFile;
}

export const archTests = [
  {
    name: "arch/FF-12702 (acd-number-null-safe): the set of src files holding a `.number` parse is exactly the eleven named here — the contract's ten plus 127/02's promote.mjs",
    run: async () => {
      const found = [...(await sweepNumberSites()).keys()].sort();
      assert.deepEqual(found, [...NUMBER_CONSUMER_FILES].sort(), "set-equality: a twelfth file (or a file that lost its last site) is a conscious edit here");
    },
  },
  {
    name: "arch/FF-12702 (acd-number-null-safe): every site is guarded within its enclosing top-level function, or allow-listed by file + function + reason — one finding per unguarded site, as file:line",
    run: async () => {
      const findings = [];
      let classified = 0;
      let allowListed = 0;
      const usedAllowances = new Set();
      for (const [file, sites] of await sweepNumberSites()) {
        for (const site of sites) {
          if (site.guarded) {
            classified += 1;
            continue;
          }
          const allowance = ALLOWED_UNCLASSIFIED.find((entry) => entry.file === file && entry.fn === site.fn);
          if (allowance) {
            allowListed += 1;
            usedAllowances.add(`${allowance.file}#${allowance.fn}`);
            continue;
          }
          findings.push(`${file}:${site.line} — \`${site.text}\` in ${site.fn} is preceded by no isLiveStreamRow call, no \`.number != null\` guard and no story narrowing`);
        }
      }
      assert.deepEqual(findings, [], `unguarded .number sites:\n${findings.join("\n")}`);
      assert.ok(classified >= 10, `non-vacuous: at least ten sites classified by the rule (got ${classified}, plus ${allowListed} allow-listed)`);
      // A stale allowance — one whose function no longer holds an unclassified site — is itself
      // a failure, so the allow-list cannot outlive the reasons on it.
      for (const entry of ALLOWED_UNCLASSIFIED) {
        assert.ok(usedAllowances.has(`${entry.file}#${entry.fn}`), `allowance for ${entry.file} ${entry.fn} (${entry.reason}) is stale — no unclassified site remains there`);
      }
    },
  },
  {
    name: "arch/FF-12702 (acd-number-null-safe): self-check — the classifier judges a site by its enclosing top-level function and names an unguarded one",
    run: () => {
      const guardedByPredicate = "export async function walk(items) {\n  const drivers = items.filter(isLiveStreamRow);\n  return drivers.sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10));\n}\n";
      assert.deepEqual(classifyNumberSites(guardedByPredicate).map((site) => [site.fn, site.guarded]), [["walk", true], ["walk", true]]);
      const guardedByNull = "function index(rows) {\n  for (const row of rows) {\n    if (row.number == null) continue;\n    map.set(Number.parseInt(row.number, 10), row);\n  }\n}\n";
      assert.deepEqual(classifyNumberSites(guardedByNull).map((site) => site.guarded), [true]);
      const narrowedOnStory = "const pick = (items) => items.filter((item) => item.type === \"story\" && Number.parseInt(item.number, 10) >= 1);\n";
      assert.deepEqual(classifyNumberSites(narrowedOnStory).map((site) => [site.fn, site.guarded]), [["pick", true]]);
      const unguarded = "// a comment mentioning Number.parseInt(x.number, 10) does not count\nexport function reduce(rows) {\n  return rows.reduce((max, row) => Math.max(max, Number.parseInt(row.number, 10)), -1);\n}\n";
      const sites = classifyNumberSites(unguarded);
      assert.deepEqual(sites.map((site) => [site.fn, site.guarded, site.line]), [["reduce", false, 3]], "the comment is stripped; the site is named by its original line");
      // The `Number(<x>.number)` coercion is a site too; a `…Number(` identifier is not.
      const coerced = "function id(row) {\n  return String(Number(row.number));\n}\n";
      assert.deepEqual(classifyNumberSites(coerced).map((site) => [site.fn, site.guarded, site.line]), [["id", false, 2]], "Number(row.number) is a coercion the control sees");
      assert.deepEqual(classifyNumberSites("const eq = (item) => sameNumber(item.number, 5);\n"), [], "sameNumber(…) is not a coercion");
      // A guard AFTER the site does not count — the window ends at the site.
      const guardAfter = "function late(rows) {\n  const n = Number.parseInt(rows[0].number, 10);\n  return rows.filter((row) => row.number != null && n);\n}\n";
      assert.deepEqual(classifyNumberSites(guardAfter).map((site) => site.guarded), [false]);
    },
  },
];
