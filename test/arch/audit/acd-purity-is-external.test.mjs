// FF-11901 — "Purity is about external dependencies, and no purity guard in this tree asserts it by
// banning a token." 119/ADR-002, and 119/00 task `00_purity-is-external.feature`.
//
// THE CLASS, MEASURED RATHER THAN INHERITED. `grep -rn 'doesNotMatch(.*import' test/arch/*.test.mjs`
// returned 31 assertion sites in 20 files at HEAD on 2026-09-06. Keeping only those whose pattern
// carries no specifier (`from "…/command-core.mjs"`, `node:fs`) and is not scoped to a dynamic
// `import(` left ELEVEN sites in NINE files. Six of the nine are not the three 119/ADR-002 names,
// and two of those six guard `src/work-acceptor/rule.mjs` and `src/work-acceptor/ledger.mjs` —
// modules already inside ONE family directory, with the guard forbidding the edge between them.
// That is why the claim below is asserted as a CLASS over `test/arch/**` rather than over three
// named files: a tenth guard written next year with the token ban would otherwise re-open it.
//
// WHAT WOULD QUIETLY UNDO THIS, and what each leg below is for:
//   · a tenth guard written with the token ban            → the class sweep (leg 1)
//   · a family resolver that answers the empty set        → the non-vacuity legs (leg 5)
//   · a second hand-rolled classifier beside the one home → the one-home leg (leg 4)
//   · a control spelling its own specifier extractor      → the extractor sweep (leg 7, chore 121)
//   · widening the unit while quietly dropping another
//     leg, which reads as a green diff                    → the every-other-leg plants (leg 6)
//
// THE SWEEP MUST NOT RED THE LEGITIMATE SPECIFIER BANS IT SHARES THE TREE WITH. A ban naming
// `command-core.mjs`, `node:fs` or `work-audit-drive.mjs` is a dependency ban and is the shape this
// milestone WANTS; a ban scoped to `import(` is a dynamic-execution ban and is untouched. The
// classifier that separates the two is `classifyImportBan`, exported so the plants below drive the
// same instrument the real tree is measured by.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { blankStringLiterals, stripComments } from "../../support/source-slice.mjs";
import { suitePathByBasename } from "../../support/registration/registration-surface.mjs";
import {
  assertFamilyPurity,
  classifySpecifier,
  computedDynamicImports,
  familyPurity,
  impureReaches,
  importSpecifiers,
  purityProblems,
  resolveFamily,
} from "../../support/module-family.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ARCH_DIR = path.join(root, "test", "arch");
const ONE_HOME = "test/support/module-family.mjs";
const STRIPPER_HOME = "test/support/source-slice.mjs";

// The nine carriers and the subject each one guards, measured at HEAD 2026-09-06. This list is a
// DECISION under 119/ADR-003 §1 — it records which controls this story converted, which no walk of
// the tree can answer — and the class sweep below is what makes it unnecessary as an oracle: a
// tenth carrier is caught by the sweep whether or not it is named here.
const CONVERTED = Object.freeze([
  ["acd-session-driver-single-home.test.mjs", "src/phase-brief"],
  ["acd-phase-brief-single-bag.test.mjs", "src/phase-brief"],
  ["acd-loop-checks-pure.test.mjs", "src/work/loops-checks"],
  ["acd-acceptor-ledger-accrues-across-epochs.test.mjs", "src/work-acceptor"],
  ["acd-acceptor-rule-is-one-object.test.mjs", "src/work-acceptor"],
  ["acd-loop-cap-single-home.test.mjs", "src/loop-bounds"],
  ["acd-provenance-stamped-at-write.test.mjs", "src/claim-provenance"],
  ["acd-trial-metric-declared.test.mjs", "src/work/counters"],
  ["acd-work-counters-read-only.test.mjs", "src/work/counters"],
]);

// ── the class detector ───────────────────────────────────────────────────────────────────────────
//
// Given the SOURCE TEXT of a regex literal used in a `doesNotMatch`, answer what kind of ban it is.
// A token ban is refused; a specifier ban and a dynamic-import ban are admitted.
export function classifyImportBan(patternSource) {
  const source = String(patternSource);
  const at = source.indexOf("import");
  if (at < 0) return "not-an-import-ban";
  // A ban scoped to `import(` forbids EXECUTION, not decomposition — 66/ADR-004 §2's claim, and it
  // is untouched by this milestone. The paren must be ESCAPED in the pattern (`\(`): an unescaped
  // one opens a GROUP, so `import\s+(?:\*\s+as|…)` is a specifier ban and not a dynamic-import ban.
  if (/import(?:\\s[*+]?|\s)*\\\(/u.test(source)) return "dynamic-import-ban";
  const after = source.slice(at + "import".length);
  // A specifier in the pattern is what makes the ban a DEPENDENCY ban: it names what may not be
  // imported rather than forbidding the act of importing.
  if (/["']|node:|\.mjs|\bfrom\b/u.test(after)) return "specifier-ban";
  // Strip the anchors, word boundaries and whitespace classes from both ends. What remains is the
  // whole claim; when that is the bare word, the pattern bans the TOKEN.
  const core = source
    .replace(/^\^?(?:\\b|\\s[*+]?|\s)*/u, "")
    .replace(/(?:\\b|\\s[*+]?|\s)*$/u, "");
  return core === "import" ? "token-ban" : "specifier-ban";
}

// Every `assert.doesNotMatch(<subject>, /<pattern>/<flags>` site in one control, with the regex
// source text. Read over comment-stripped source through the ONE HOME, so a ban quoted in a comment
// (this file's own header quotes several) is not counted as a live assertion.
// TWO SPELLINGS, because a class claim that watches one of them is a class claim with a door in it.
// `assert.doesNotMatch(source, /…/)` is the form the nine carriers used; `assert.ok(!/…/.test(source))`
// says exactly the same thing to a reader and nothing at all to a detector that only knows the first.
// A tenth guard written next year is as likely to reach for one as the other.
const BAN_FORMS = [
  /assert\.doesNotMatch\(\s*[^,]+,\s*\/((?:\\.|\[(?:\\.|[^\]])*\]|[^/\\])+)\//gu,
  /assert\.(?:ok|equal)\(\s*!\s*\/((?:\\.|\[(?:\\.|[^\]])*\]|[^/\\])+)\/[a-z]*\.test\(/gu,
  /assert\.equal\(\s*\/((?:\\.|\[(?:\\.|[^\]])*\]|[^/\\])+)\/[a-z]*\.test\([^)]*\)\s*,\s*false/gu,
];

export function importBanSites(source) {
  const clean = stripComments(source);
  const sites = [];
  for (const form of BAN_FORMS) {
    for (const match of clean.matchAll(form)) {
      const pattern = match[1];
      const verdict = classifyImportBan(pattern);
      if (verdict === "not-an-import-ban") continue;
      sites.push({ pattern, verdict, line: clean.slice(0, match.index).split("\n").length });
    }
  }
  return sites.sort((a, b) => a.line - b.line);
}

// ── the extractor detector (chore 121) ───────────────────────────────────────────────────────────
//
// TECH_DEBT item 24's species one class over. At 121's opening, TWENTY files under `test/` declared
// an `extract an import specifier` function under one of the four names the chore's grep knew, and
// the shape sweep below found TWENTY-SIX MORE under `test/arch/` alone — 35 regex literals, under
// other names (`moduleSpecifiers`, `importsOf`, `specifiers`) or inline at the call site, measured
// 2026-09-11. They disagreed: `acd-controls-never-execute`'s copy carried the
// line-bounded `[^;\n]*?` spelling that is blind to a multi-line import clause — the defect 119/00
// fixed in the home — and the others each dropped a form the home carries: `export … from`, the
// bare `import "x"`, `require(`, or the dynamic `import(`, every one a hole in a closure or purity claim.
//
// WHAT AN EXTRACTOR IS, TO THIS DETECTOR: a regex literal that CAPTURES a quoted specifier after
// `from`, `import` or `require` — `([^"']+)`, a capture group over "anything but a quote". That
// capture is the signature: a specifier BAN names what may not be imported (`from "[^"]*work-audit-drive"`)
// and captures nothing, so it is untouched, and so is every `classifyImportBan` case above.
//
// ASSEMBLED FROM PARTS, in `acd-comment-stripper-order`'s idiom, so this file's own source holds no
// extractor-shaped literal and cannot be its own subject. Read over `blankStringLiterals`, which
// keeps regex literals and blanks strings, so a spelling quoted in a plant or a message is not a
// live extractor and is not counted.
const KEYWORD = "(?:\\\\b|(?<![A-Za-z_$]))(?:from|import|require)\\b"; // the literal text `\bfrom` puts a `b` before the word
const GAP = "(?:\\\\/|[^\\n/])*?"; // stays inside ONE regex literal; an escaped slash may pass
const QUOTE_CLASS = "\\[\\^[^\\]\\n]*[\"'][^\\]\\n]*\\]"; // [^"'] — a class excluding a quote
const SPECIFIER_CAPTURE = "\\(" + QUOTE_CLASS + "[+*]\\)"; // ([^"']+) — CAPTURED, which is what makes it extraction
const EXTRACTOR_SHAPE = new RegExp(KEYWORD + GAP + SPECIFIER_CAPTURE, "g");

// Every extractor-shaped regex literal in one source, with the line it sits on. The line is taken
// from the RAW source by finding the literal's own text there, because the blanked text has lost
// the newlines a multi-line block comment occupied.
export function extractorSites(source) {
  const blanked = blankStringLiterals(source);
  const sites = [];
  let cursor = 0;
  for (const match of blanked.matchAll(EXTRACTOR_SHAPE)) {
    const at = source.indexOf(match[0], cursor);
    const offset = at >= 0 ? at : match.index;
    if (at >= 0) cursor = at + match[0].length;
    sites.push({ line: source.slice(0, offset).split("\n").length, literal: match[0] });
  }
  return sites;
}

// THE REMAINDER, NAMED AND SHRINK-ONLY. Each entry still spells an extractor for a reason the one
// home does not serve — it needs the import CLAUSE or the CALL FORM, neither of which
// `importSpecifiers` carries — or because another control freezes its bytes. Carried
// by name with that reason, never as a count; a converted file's entry is deleted, and a new entry
// is a decision about the home (or about a freeze), not an edit.
//
// WHAT THE CONVERSION TAUGHT, for the next converter: the home follows the dynamic `import()` form
// too, and a CLOSURE walker that used to spell a static-only extractor must keep that contract with
// `.filter((entry) => !entry.dynamic)` — two walkers were pointed at the home without it and three
// controls' reach ceilings moved (FF-6301, FF-6303, FF-5301, measured 2026-09-11); the ceilings were right.
export const EXTRACTOR_BASELINE = Object.freeze([
  Object.freeze({ file: "test/arch/loop/acd-loop-document-current.test.mjs", why: "asserts on the import BINDINGS (`{ … }` names) taken from the one home; the home's specifier list carries no clause" }),
  Object.freeze({ file: "test/arch/loop/acd-loop-finding-envelope.test.mjs", why: "BYTE-FROZEN by FF-5311 ACCEPT-02 as an accepted milestone-52 suite — the one line that would convert it (`from \"\\.\\/…\"` over an index line) sits outside the permitted regions; converting it is a decision about that freeze, not about the home" }),
  Object.freeze({ file: "test/arch/loop/acd-loop-suite-registration.test.mjs", why: "`importsOf` parses each import's namespace and named BINDINGS — the index-mutation probes assert on who binds what, not only on the specifier" }),
  Object.freeze({ file: "test/arch/testing/acd-test-command-reports-not-decides.test.mjs", why: "hunts the CALL forms `import(` / `require(` specifically; the home marks `dynamic` but folds `require` in with the static forms" }),
  Object.freeze({ file: "test/arch/work/acd-feature-parser-single-home.test.mjs", why: "asserts on the import CLAUSE (`parseFeature` taken by name, not through a re-export); the home's specifier list carries no clause" }),
]);

const readArch = async (name) => readFile(path.join(ARCH_DIR, name), "utf8");

// THE WALK RECURSES, because the class is "no control UNDER `test/arch/`" and 119/03 is about to
// give that directory an interior. A non-recursive `readdir` filtered by `.test.mjs` would answer
// with the controls that stay flat and silently drop the ones that move — the class claim narrowing
// itself on the very move this milestone exists to make, with the floor below still satisfied. Its
// two sibling controls (FF-11902's `controlFiles`, FF-11903's `walk`) already recurse.
async function archControlNames(dir = ARCH_DIR, prefix = "") {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await archControlNames(path.join(dir, entry.name), rel)));
    else if (entry.name.endsWith(".test.mjs")) found.push(rel);
  }
  return found;
}

async function archControls() {
  const names = (await archControlNames()).sort();
  return Promise.all(names.map(async (name) => ({ name, source: await readArch(name) })));
}

// A CONVERTED carrier's path, RESOLVED rather than joined onto `test/arch/`.
//
// 119/03 — `CONVERTED` keys by BASENAME, and that is right: the basename is the control's identity
// and it survived the move into subject directories; its DIRECTORY did not. Joining the basename
// straight onto `ARCH_DIR` was only ever correct while `test/arch/` was flat, and after the move it
// threw ENOENT on the first row. The resolver is the registration helper's, not a second one here:
// "where does the suite with this name live?" is that module's subject, and this file is the second
// caller to need it.
const archPathOf = async (basename) => (await suitePathByBasename(root, basename, { root: "test/arch" })).replace(/^test\/arch\//u, "");

// A synthetic tree, so every plant below is driven over LITERAL inputs and no module under `src/`
// is edited to prove a guard is armed.
async function withTempFamily(layout, run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-family-"));
  try {
    for (const [rel, contents] of Object.entries(layout)) {
      const full = path.join(dir, rel);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, contents, "utf8");
    }
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export const archTests = [
  // ── leg 1: the class ───────────────────────────────────────────────────────────────────────────
  {
    name: "arch/119 FF-11901: NO control under test/arch/ asserts purity by banning an import statement with no specifier",
    run: async () => {
      const controls = await archControls();
      assert.ok(controls.length > 100, `the sweep read test/arch/ (non-vacuous): ${controls.length} controls`);
      let banSites = 0;
      const tokenBans = [];
      for (const { name, source } of controls) {
        for (const site of importBanSites(source)) {
          banSites += 1;
          if (site.verdict === "token-ban") tokenBans.push(`${name}:${site.line} — /${site.pattern}/`);
        }
      }
      // NON-VACUITY: a sweep that classified nothing would report "no token bans" over the empty
      // set. The tree carries legitimate specifier and dynamic-import bans, so the count is > 0 by
      // construction and a walk that finds none has broken rather than passed.
      assert.ok(banSites > 0, `the sweep classified at least one import-shaped ban (non-vacuous): ${banSites} site(s) across ${controls.length} controls`);
      // THE COMPOSITION IS DRIVEN, not only the classifier. `classifyImportBan` is exercised over
      // pattern strings above; this is the only place `importBanSites` is asked to FIND one, and
      // over a tree that (correctly) holds none it would never be asked at all — a detector proved
      // by the absence of its subject. Both spellings are planted here so the sweep is known to see
      // what it refuses.
      for (const [form, planted] of [
        ["doesNotMatch", 'assert.doesNotMatch(source, /\\bimport\\b/u, "pure");'],
        ["ok(!…test())", 'assert.ok(!/^\\s*import\\s/mu.test(source), "pure");'],
        ["equal(…test(), false)", 'assert.equal(/\\bimport\\b/u.test(source), false, "pure");'],
      ]) {
        const found = importBanSites(planted);
        assert.equal(found.length, 1, `${form}: the sweep sees a token ban written this way`);
        assert.equal(found[0].verdict, "token-ban", `${form}: …and classifies it as one`);
      }
      assert.deepEqual(importBanSites('assert.doesNotMatch(source, /^import .*node:fs/mu, "no fs");').filter((s) => s.verdict === "token-ban"), [], "…and a specifier ban is still admitted through the same reader");

      assert.deepEqual(
        tokenBans,
        [],
        "a purity guard constrains a module's EXTERNAL dependencies, never the number of files it occupies (119/ADR-002). "
          + "These sites ban the TOKEN `import`, which makes `src/<name>/` illegal and is why `src/phase-brief.mjs` grew "
          + `432 -> 1,651 lines under its own guard. Resolve the family through ${ONE_HOME} and classify specifiers instead:\n  - `
          + tokenBans.join("\n  - "),
      );
    },
  },

  {
    name: "arch/119 FF-11901: the class detector separates a token ban from a dependency ban, over the six shapes the contract names",
    run: () => {
      // The `.feature`'s own Examples table, driven through the instrument the real tree is
      // measured by. `refused` is a token ban; `admitted` is a specifier or dynamic-import ban.
      const cases = [
        [String.raw`\bimport\b`, "token-ban"],
        [String.raw`^\s*import\s`, "token-ban"],
        [String.raw`^import .*command-core\.mjs`, "specifier-ban"],
        [String.raw`^import .*node:fs`, "specifier-ban"],
        [String.raw`\bimport\s*\(`, "dynamic-import-ban"],
        [String.raw`from\s+"[^"]*work-audit-drive\.mjs"`, "not-an-import-ban"],
        // The remaining live spellings in this tree, so the detector is measured against what it
        // actually shares the directory with rather than against six chosen rows.
        [String.raw`^\s*import\b`, "token-ban"],
        [String.raw`^\s*import\s`, "token-ban"],
        [String.raw`^import[^\n]+command-core\.mjs`, "specifier-ban"],
        [String.raw`import\s+(?:\*\s+as|[A-Za-z_$])[^;]*from\s+["'][^"']*work\.mjs["']`, "specifier-ban"],
        [String.raw`node:fs|readFile|readdir|access\s*\(|stat\s*\(|process\.cwd|Date\.now|\bfetch\s*\(|\bimport\s*\(`, "dynamic-import-ban"],
      ];
      for (const [pattern, expected] of cases) {
        assert.equal(classifyImportBan(pattern), expected, `/${pattern}/ classifies as ${expected}`);
      }
    },
  },

  {
    name: "arch/119 FF-11901: each of the nine converted carriers carries no token ban and makes its purity claim through the family classifier",
    run: async () => {
      for (const [name, subject] of CONVERTED) {
        const source = await readArch(await archPathOf(name));
        const tokenBans = importBanSites(source).filter((site) => site.verdict === "token-ban");
        assert.deepEqual(tokenBans.map((site) => site.line), [], `${name} carries no token ban`);
        const clean = stripComments(source);
        assert.match(clean, /assertFamilyPurity\s*\(/u, `${name} asserts purity through the one home's family predicate`);
        assert.ok(
          clean.includes(`"${subject}"`) || clean.includes(subject.replace(/^src\//u, "")),
          `${name} names its subject (${subject}) at the call site rather than leaving it to be guessed`,
        );
      }
    },
  },

  // ── leg 4: one home ────────────────────────────────────────────────────────────────────────────
  {
    name: "arch/119 FF-11901: the classifier and the comment stripper each have ONE home, and no purity control spells its own",
    run: async () => {
      const home = await readFile(path.join(root, ONE_HOME), "utf8");
      // The classifier's home strips comments through the stripper's home, and nowhere else. That
      // is TECH_DEBT item 24's ratchet reaching the new module on arrival rather than after it
      // grows its own.
      assert.match(home, /import \{ stripComments \} from "\.\/source-slice\.mjs";/u, `${ONE_HOME} strips comments through ${STRIPPER_HOME}`);
      assert.doesNotMatch(
        stripComments(home).replace(/import \{ stripComments \}[^\n]*\n/u, ""),
        /function\s+strip\w*Comments|replace\([^)]*\/\\\/\\\//u,
        `${ONE_HOME} hand-rolls no comment stripper of its own`,
      );

      for (const [name] of CONVERTED) {
        const source = await readArch(await archPathOf(name));
        const clean = stripComments(source);
        assert.match(
          clean,
          // 119/03 — depth-agnostic (`(?:\.\./)+`), the idiom this tree already uses elsewhere. The
          // pinned `../support/` was true only while every carrier sat directly under `test/arch/`;
          // they sit a directory deeper now and reach the one home by `../../support/`. What this
          // leg claims is the HOME, never the number of hops to it.
          new RegExp(`from\\s+"(?:\\.\\./)+support/module-family\\.mjs"`, "u"),
          `${name} resolves its family and classifies its specifiers through the one home (${ONE_HOME})`,
        );
        // NONE SPELLS ITS OWN SPECIFIER EXTRACTOR — asserted over the nine as members of the CLASS in
        // leg 7 below (chore 121), which is the same instrument over every control under `test/arch/`.
        // The per-carrier spelling this leg used to carry was name-based and missed `acd-loop-checks-pure`'s
        // inline `matchAll(/(?:import|export)…/)`, one of the nine, for a whole milestone.
        assert.doesNotMatch(clean, /function\s+strip\w*Comments/u, `${name} hand-rolls no comment stripper`);
      }
    },
  },

  // ── leg 2: family resolution ───────────────────────────────────────────────────────────────────
  {
    name: "arch/119 FF-11901: a purity guard's subject is a FAMILY resolved from the tree — the directory wins where it exists",
    run: async () => {
      await withTempFamily({ "src/phase-brief.mjs": "export const a = 1;\n" }, async (dir) => {
        const family = await resolveFamily(dir, "src/phase-brief");
        assert.deepEqual(family.files, ["src/phase-brief.mjs"], "only the file exists — the family is that one file");
        assert.equal(family.isDirectory, false);
      });
      await withTempFamily(
        { "src/phase-brief/a.mjs": "", "src/phase-brief/b.mjs": "", "src/phase-brief/c.mjs": "" },
        async (dir) => {
          const family = await resolveFamily(dir, "src/phase-brief");
          assert.deepEqual(family.files, ["src/phase-brief/a.mjs", "src/phase-brief/b.mjs", "src/phase-brief/c.mjs"]);
          assert.equal(family.root, "src/phase-brief");
        },
      );
      await withTempFamily(
        { "src/phase-brief/a.mjs": "", "src/phase-brief/deep/nested/leaf.mjs": "" },
        async (dir) => {
          const family = await resolveFamily(dir, "src/phase-brief");
          assert.deepEqual(family.files, ["src/phase-brief/a.mjs", "src/phase-brief/deep/nested/leaf.mjs"], "every .mjs under it, at any depth");
        },
      );
      await withTempFamily(
        { "src/phase-brief.mjs": "export const stale = 1;\n", "src/phase-brief/a.mjs": "" },
        async (dir) => {
          const family = await resolveFamily(dir, "src/phase-brief");
          assert.deepEqual(family.files, ["src/phase-brief/a.mjs"], "the directory wins, and the file is not in the family");
        },
      );
      // `src/work-acceptor/` as it stands today: the one family directory this ruling's own case
      // lives in. Derived from the tree rather than counted here, with a floor for non-vacuity.
      const acceptor = await resolveFamily(root, "src/work-acceptor");
      assert.equal(acceptor.isDirectory, true, "src/work-acceptor/ is a directory family");
      assert.ok(acceptor.files.length >= 6, `src/work-acceptor/ resolves to its .mjs files (${acceptor.files.length})`);
      for (const rel of acceptor.files) assert.match(rel, /^src\/work-acceptor\/.+\.mjs$/u, `${rel} is inside the family`);
      // Neither the file nor the directory: no members, and the guard FAILS naming the subject.
      await withTempFamily({ "src/other.mjs": "" }, async (dir) => {
        const family = await resolveFamily(dir, "src/absent");
        assert.deepEqual(family.files, [], "an absent subject resolves to no members");
        const problems = purityProblems({ family, scope: [], scanned: 0, bytesRead: 0, classified: [], reaches: [], computed: [], violations: [] });
        assert.equal(problems.length, 1);
        assert.match(problems[0], /src\/absent/u, "the failure NAMES the subject that could not be resolved");
      });
    },
  },

  // ── leg 3: classification ──────────────────────────────────────────────────────────────────────
  {
    name: "arch/119 FF-11901: a specifier is admitted only when it resolves inside the family — intra-family is not an import OUT",
    run: async () => {
      await withTempFamily(
        { "src/thing/a.mjs": "", "src/thing/sibling.mjs": "", "src/thing/nested/leaf.mjs": "" },
        async (dir) => {
          const family = await resolveFamily(dir, "src/thing");
          const from = "src/thing/a.mjs";
          const rows = [
            ["./sibling.mjs", "admitted"],
            ["./nested/leaf.mjs", "admitted"],
            ["../thing/sibling.mjs", "admitted"],
            ["../work/loops-checks.mjs", "violation"],
            ["node:path", "violation"],
            ["node:fs/promises", "violation"],
            ["ws", "violation"],
          ];
          for (const [specifier, verdict] of rows) {
            assert.equal(classifySpecifier(specifier, from, family), verdict, `${specifier} is ${verdict}`);
          }
          // A DYNAMIC import leaving the family is a violation exactly as the static form is.
          await writeFile(path.join(dir, from), 'const m = await import("../x.mjs");\n', "utf8");
          const report = await familyPurity(dir, "src/thing");
          const outward = report.violations.find((entry) => entry.specifier === "../x.mjs");
          assert.ok(outward != null && outward.dynamic === true, "a dynamic import() leaving the family is a violation");
          const problems = purityProblems(report);
          assert.ok(
            problems.some((line) => line.includes(from) && line.includes("../x.mjs")),
            `a violation's message names the offending file and the specifier: ${problems.join(" | ")}`,
          );
        },
      );
      // A single-file family has no inside: every specifier is still an import OUT of the module.
      await withTempFamily({ "src/leaf.mjs": "" }, async (dir) => {
        const family = await resolveFamily(dir, "src/leaf");
        assert.equal(classifySpecifier("./anything.mjs", "src/leaf.mjs", family), "violation");
      });
    },
  },

  // ── leg 6: every other leg, unweakened ─────────────────────────────────────────────────────────
  {
    name: "arch/119 FF-11901: every OTHER purity leg is re-asserted per file over the whole family — the unit changed, the guard did not relax",
    run: async () => {
      const reaches = [
        ['import "node:fs";', "node:fs"],
        ["await readFile(p);", "readFile"],
        ["await readdir(p);", "readdir"],
        ["await stat(p);", "stat"],
        ["await access(p);", "access"],
        ["process.cwd();", "process.cwd"],
        ["Date.now();", "Date.now / new Date()"],
        ["performance.now();", "performance.now"],
        ["process.hrtime.bigint();", "process.hrtime"],
        ["await fetch(url);", "fetch"],
        ['import cp from "child_process";', "node:child_process / child_process"],
      ];
      for (const [line, expected] of reaches) {
        await withTempFamily({ "src/thing/a.mjs": "", "src/thing/b.mjs": `${line}\n` }, async (dir) => {
          const report = await familyPurity(dir, "src/thing");
          assert.ok(report.family.files.length > 1, "the family really has more than one file");
          const problems = purityProblems(report);
          assert.ok(
            problems.some((problem) => problem.includes("src/thing/b.mjs") && problem.includes(expected)),
            `the guard fails naming the file and the reach (${expected}): ${problems.join(" | ")}`,
          );
        });
      }
      // …and the reach scanner itself is non-vacuous over a clean family.
      await withTempFamily({ "src/thing/a.mjs": "export const x = 1;\n" }, async (dir) => {
        assert.deepEqual(purityProblems(await familyPurity(dir, "src/thing")), [], "a clean family carries no problems");
      });
      assert.deepEqual(impureReaches("export const pure = 1;\n"), [], "the scanner reports nothing on pure text");
      assert.ok(impureReaches("// Date.now() in a comment\nexport const x = 1;\n").length === 0, "…and is not fooled by a comment, because it strips through the one home");
    },
  },

  // ── leg 5: non-vacuity ─────────────────────────────────────────────────────────────────────────
  {
    name: "arch/119 FF-11901: the guard cannot pass by finding nothing — a family that resolves to zero files FAILS",
    run: async () => {
      await withTempFamily({ "src/other.mjs": "" }, async (dir) => {
        const report = await familyPurity(dir, "src/gone");
        assert.equal(report.family.files.length, 0);
        const problems = purityProblems(report);
        assert.ok(problems.length > 0, "a zero-file family fails rather than passing over the empty set");
        await assert.rejects(
          async () => assertFamilyPurity(assert, dir, "src/gone"),
          /resolved to NO files/u,
          "the shared assertion itself refuses the empty family",
        );
      });
      // A family that resolves but reads as empty text is the same defect one level in.
      await withTempFamily({ "src/hollow/a.mjs": "" }, async (dir) => {
        const problems = purityProblems(await familyPurity(dir, "src/hollow"));
        assert.ok(problems.some((problem) => problem.includes("empty file")), `an all-empty family fails: ${problems.join(" | ")}`);
      });
      // THE EXTRACTOR IS NON-VACUOUS: at least one specifier is classified over a family that has
      // one. The nine subjects in service carry ZERO specifiers by construction — that is what the
      // guards assert — so the extractor's own non-vacuity is proved here, over a family that does.
      await withTempFamily({ "src/thing/a.mjs": 'import { b } from "./b.mjs";\n', "src/thing/b.mjs": "" }, async (dir) => {
        const report = await familyPurity(dir, "src/thing");
        assert.ok(report.classified.length >= 1, "at least one import specifier was classified across the family");
        assert.deepEqual(purityProblems(report), [], "…and the intra-family edge is admitted");
      });
      assert.ok(importSpecifiers('import x from "a.mjs";\nawait import("b.mjs");\n').length === 2, "the extractor sees both the static and the dynamic form");
      // 121 — a substitution-free template literal is a LITERAL specifier in both call forms, and one
      // that carries `${…}` is computed: the two reports partition the call, and neither drops it.
      assert.deepEqual(
        importSpecifiers("const c = require(`./c.mjs`);\nawait import(`./b.mjs`);\n"),
        [{ specifier: "./c.mjs", dynamic: false }, { specifier: "./b.mjs", dynamic: true }],
        "a backtick-quoted specifier with no substitution is seen in both call forms",
      );
      assert.deepEqual(importSpecifiers("await import(`./${name}.mjs`);\n"), [], "a template with a substitution is not a literal specifier");
      assert.deepEqual(
        computedDynamicImports("await import(`./${name}.mjs`);\nawait import(`./b.mjs`);\nawait import(resolved);\n"),
        ["`./${name}.mjs`", "resolved"],
        "…and it is reported as computed, while the substitution-free template is not reported twice",
      );
    },
  },

  // ── leg 7: the extractor sweep (chore 121) ─────────────────────────────────────────────────────
  {
    name: "arch/119 FF-11901 · 121: NO control under test/arch/ spells an import-specifier extractor of its own — the one home is test/support/module-family.mjs, and the remainder is a named, shrink-only baseline",
    run: async () => {
      // THE DETECTOR IS PROVED BEFORE THE TREE IS JUDGED, on the spellings the tree carried at 121's
      // opening — assembled from parts so this file plants no extractor-shaped literal of its own.
      const Q = "\"'";
      const CAP = "([^" + Q + "]+)";
      const planted = [
        ["the twelve-file named function", "const re = /\\bfrom\\s+[" + Q + "]" + CAP + "[" + Q + "]|\\bimport\\s+[" + Q + "]" + CAP + "[" + Q + "]/g;"],
        ["the line-bounded copy 119/00 replaced", "code.matchAll(/\\b(?:import|export)\\b[^;\\n]*?\\bfrom\\s*[" + Q + "]" + CAP + "[" + Q + "]/g)"],
        ["the inline one-liner", "[...code.matchAll(/\\bimport\\s+[^;]*?\\bfrom\\s+[" + Q + "]" + CAP + "[" + Q + "]/g)].map((m) => m[1])"],
        ["the line-anchored form", "source.matchAll(/^import\\s[^;]*?from\\s+[" + Q + "]" + CAP + "[" + Q + "]/gm)"],
        ["the dynamic form", "clean.matchAll(/\\bimport\\s*\\(\\s*[" + Q + "]" + CAP + "[" + Q + "]\\s*\\)/g)"],
        ["the CJS form", "clean.matchAll(/\\brequire\\s*\\(\\s*[" + Q + "]" + CAP + "[" + Q + "]/g)"],
        ["the double-quote-only capture", 'line.match(/from "\\.\\/([^"]+)"/)?.[1]'],
      ];
      for (const [label, text] of planted) {
        assert.ok(extractorSites(text).length >= 1, `${label} is seen as an extractor: ${text}`);
      }
      // …and a specifier BAN, a dynamic-import BAN and a plant quoted in a STRING are not.
      for (const [label, text] of [
        ["a specifier ban", 'assert.doesNotMatch(source, /from\\s+"[^"]*work-audit-drive\\.mjs"/u);'],
        ["a dynamic-import ban", "assert.doesNotMatch(source, /\\bimport\\s*\\(/u);"],
        ["a specifier ban with a class", 'assert.doesNotMatch(source, /^import .*node:fs/mu);'],
        ["an extractor quoted inside a string literal", "const plant = " + JSON.stringify("[...src.matchAll(/from " + '"' + CAP + '"' + "/g)]") + ";"],
      ]) {
        assert.deepEqual(extractorSites(text), [], `${label} is not an extractor: ${text}`);
      }
      // NON-VACUITY, from the tree: the one home IS the canonical extractor, so the detector must
      // see it there — a detector blind to the home would be blind to every copy of it.
      const home = await readFile(path.join(root, ONE_HOME), "utf8");
      assert.ok(extractorSites(home).length >= 3, `the detector sees the one home's own forms in ${ONE_HOME} (${extractorSites(home).length})`);

      const controls = await archControls();
      assert.ok(controls.length > 100, `the sweep read test/arch/ (non-vacuous): ${controls.length} controls`);
      const carried = new Set(EXTRACTOR_BASELINE.map((entry) => entry.file));
      const stillCarried = new Set();
      const violations = [];
      for (const { name, source } of controls) {
        const file = `test/arch/${name}`;
        const sites = extractorSites(source);
        if (sites.length === 0) continue;
        if (carried.has(file)) {
          stillCarried.add(file);
          continue;
        }
        for (const site of sites) violations.push(`${file}:${site.line} — /${site.literal}/`);
      }
      assert.deepEqual(
        violations,
        [],
        `a control that spells its own \`from "…"\` extractor is the twenty-first home of a function that has one (${ONE_HOME}), `
          + "and the copies disagree about multi-line clauses, `export … from`, the bare form, `require(` and `import(`. "
          + "Import `importSpecifiers` from the one home and read `.specifier` off each entry; a file that needs the CLAUSE or the CALL FORM "
          + "is a decision about the home and belongs in EXTRACTOR_BASELINE with its reason, never absorbed silently:\n  - "
          + violations.join("\n  - "),
      );

      // THE BASELINE IS A LEDGER, NOT A COUNT: every entry names a live file that still carries the
      // shape for the stated reason, or it is stale and the list has stopped being shrink-only.
      assert.equal(EXTRACTOR_BASELINE.length, 5, "the baseline carries exactly five reasoned remainders; a sixth is a decision about the home (or about a freeze), not an edit");
      for (const entry of EXTRACTOR_BASELINE) {
        assert.ok(entry.why && entry.why.length > 20, `${entry.file} is carried with a stated reason`);
        assert.ok(stillCarried.has(entry.file), `${entry.file} no longer spells an extractor — delete its baseline entry (shrink-only), do not leave it`);
      }
    },
  },

  // ── the red probe, both halves, over literal inputs ────────────────────────────────────────────
  {
    name: "arch/119 FF-11901: the red probe has two halves — the intra-family import the token ban reported, and the node builtin it must still report",
    run: async () => {
      await withTempFamily(
        { "src/thing/a.mjs": 'import { b } from "./b.mjs";\n', "src/thing/b.mjs": "export const b = 1;\n" },
        async (dir) => {
          const source = await readFile(path.join(dir, "src/thing/a.mjs"), "utf8");
          // HALF ONE: the OLD predicate reported this, and the new one does not. A guard that has
          // been widened must be shown to have actually widened (119/ADR-001's consequence).
          assert.match(source, /^\s*import\s/mu, "the old token ban DID match this intra-family import");
          assert.deepEqual(purityProblems(await familyPurity(dir, "src/thing")), [], "…and the family classifier reports no violation");

          // HALF TWO: the old predicate's real claim still holds. A widened unit is not a dropped leg.
          await writeFile(path.join(dir, "src/thing/a.mjs"), 'import fs from "node:fs";\n', "utf8");
          const problems = purityProblems(await familyPurity(dir, "src/thing"));
          assert.ok(
            problems.some((problem) => problem.includes("src/thing/a.mjs") && problem.includes("node:fs")),
            `the classifier reports a violation naming the file and node:fs: ${problems.join(" | ")}`,
          );
        },
      );
    },
  },

  {
    name: "arch/119 FF-11901: the tree as it stands is green under the widened predicate, and the guarded modules were not edited to make it so",
    run: async () => {
      const subjects = [
        ["src/phase-brief", null],
        ["src/work/loops-checks", null],
        ["src/loop-bounds", null],
        ["src/claim-provenance", null],
        ["src/work/counters", null],
        ["src/work-acceptor", ["src/work-acceptor/rule.mjs", "src/work-acceptor/ledger.mjs"]],
      ];
      for (const [subject, members] of subjects) {
        const report = await assertFamilyPurity(assert, root, subject, members == null ? {} : { members });
        // THE MODULES WERE NOT EDITED TO PASS. Each subject carried zero import specifiers under the
        // old token ban and carries zero under the new one — the predicate widened around them,
        // rather than the modules being changed to fit it. (The diff-level claim — no module under
        // `src/` edited by this task — is evidenced in VERIFICATION.md; this is its observable half.)
        assert.deepEqual(
          report.classified.map((entry) => `${entry.file}: ${entry.specifier}`),
          [],
          `${subject} still carries no import specifier at all — the guard was converted, the module was not`,
        );
      }
    },
  },
];
