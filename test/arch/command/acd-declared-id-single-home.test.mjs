// FF-6604 (milestone 66 / ADR-001 §7, scoped by ADR-008 ruling 2) — THE GRAMMAR HAS
// ONE HOME, THE TWO EXPORTS ARE SEPARATE, AND THE EXTRACTION CHANGED NO RECORD.
//
// "`src/memory/local-indexing.mjs` holds no id pattern of its own, builds both
//  `headerRe`s from `ID_FORMS`, and imports no register-block predicate. `ID_FORMS`
//  carries the SEPARATOR CLASS `[:·—–-]` as well as the id shape (ROUND 3/6): each
//  parser holds TWO literals — the split and the capture head — and 'holds no id
//  pattern of its own' reaches all four, or the re-home is half done."
//
// ─────────────────────────────────────────────────────────────────────────────
// MEASURED AT HEAD BEFORE THIS STORY (ADR-009/A's ratchet: a "no code path does X"
// invariant is a MEASUREMENT and may not be frozen until it has been run against HEAD
// and the result recorded). Run against commit `24fc181`, the tip 66/01 started from:
//
//   src/memory/local-indexing.mjs  →  ADR-\d   R\d+   [:·—–-]
//   src/import/recovery.mjs        →  ADR-\d   R\d+   [:·—–-]
//
// TWO modules, not one. ADR-001 §7's invariant says "no second copy exists in `src/`,
// including in `src/memory/local-indexing.mjs`" and named only the one it knew about;
// `recoverAofDecisions` (`:296-297`) and `recoverAofOutcomes` (`:321-322`) held a
// verbatim copy of the same four literals. It was re-homed here rather than named-and-
// excluded, because a gate that excludes the copy it found is wrong about the tree
// (m45/R5), and because the invariant's own words are "no second copy".
//
// 13/ADR-001 STILL HOLDS THERE. Recovery keeps its own `splitSections` — it PRODUCES
// the recovered shape and never imports the parsers — and importing a ZERO-IMPORT
// GRAMMAR LEAF is not importing a parser. The algorithm stayed; the grammar left.
//
// AFTER: exactly ONE module under `src/` carries any of the six shapes —
// `src/declared-id.mjs` — with 0 false positives across all 227 modules.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE DIFFERENTIAL CARRIES NO CONSTANT AND IS A SELF-COMPARISON (ROUND 3/7+8).
//
// A stored count is unrunnable here, and the previously stored one was also WRONG:
// `buildRecords` returns 342 `adr` + 258 `lesson` = 600, not 599, because it filters
// `type === "milestone" && parent == null` (`local-indexing.mjs:611-613`) so a
// top-level STORY's retrospective is never read — and the adr half moved again when
// ADR-008 and ADR-009 were appended to milestone 66's own register. So: the four
// PRE-EXTRACTION literals are held here as local constants (a test is code; the
// no-second-copy invariant is scoped to `src/`), the corpus is walked, and the section
// splits and `(id, title, line)` captures are asserted SET-EQUAL to the shipped
// composition, with a non-vacuity floor of `adr > 0 && lesson > 0`.
//
// THE WALK IS OVER THE REAL `wiki/work`, and that is the load-bearing choice. All 22
// test suites that depend on `local-indexing.mjs` plant temp-dir fixtures, and a
// re-home defect here is a SILENT SHRINK — fewer records, not wrong ones — which every
// one of those 22 stays green through. Only the real corpus, which writes the bare-`R`
// form 261 times and `ADR-NNN` 343 times, can see it.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE STRIPPER IS IMPORTED, NOT WRITTEN (TECH_DEBT item 24, and 66/00's own review
// finding). A block-comments-first stripper turns a `//` comment containing `/*` into
// a phantom block running to the next `*/`; measured over this tree that hides 1,349
// lines across five modules from any sweep, and a sweep that cannot see a region
// reports green over it. The one home's correct-order stripper is read from
// `test/support/source-slice.mjs`, and the guard below refuses ANY stripper that
// leaves less code behind than it does.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { ID_FORMS, headingCaptureRe, headingSplitRe } from "../../../src/declared-id.mjs";
import { parseArchitecture, parseRetrospective } from "../../../src/memory/local-indexing.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const srcDir = path.join(repoRoot, "src");
const workDir = path.join(repoRoot, "wiki", "work");

const THE_ONE_HOME = "src/declared-id.mjs";
// The two modules whose reach is the WHOLE DOCUMENT, and which must therefore take the
// forms and never the register-block predicate (ADR-008 ruling 2). Named, never counted.
const WHOLE_DOCUMENT_IMPORTERS = ["src/memory/local-indexing.mjs", "src/import/recovery.mjs"];

// ────────────────────────────────────── the leaf's two halves, partitioned ──
//
// Held here as literals so that ADDING AN EXPORT forces a decision: the set-equality
// below fails until the new name is classified as whole-document or register-scoped.
// That is the mechanism ADR-008 ruling 2 asks for — the separation is checkable, not
// remembered.
const DOCUMENT_HALF = ["ID_FORMS", "idForm", "headingSplitRe", "headingCaptureRe"];
const REGISTER_HALF = [
  "DECLARATION",
  "QUALIFIED_REF",
  "REGISTER_BLOCKS",
  "declaredIdOn",
  "normalizeOpener",
  "qualifiedRefsIn",
  "registerBlockKind",
  "registerDeclarations",
  "registerEntries",
];

// THE FOUR PRE-EXTRACTION LITERALS — `local-indexing.mjs:107/111/160/166` as they
// stood at commit `24fc181`, character for character. This is "before"; the shipped
// composition is "after"; the assertion is the comparison.
export const BEFORE = {
  lesson: { split: /^#{2,3}\s+R\d+\b/, head: /^#{2,3}\s+(R\d+)\s*[:·—–-]?\s*(.*)$/ },
  adr: { split: /^#{2,3}\s+ADR-\d+/, head: /^#{2,3}\s+(ADR-\d+)\s*[:·—–-]?\s*(.*)$/ },
};

// ───────────────────────────────── the golden, at all 13 fields ──
//
// AN INDEPENDENT SECOND IMPLEMENTATION of `parseRetrospective`/`parseArchitecture`,
// driven by the PRE-EXTRACTION literals. Round 1 of review found the differential
// asserted at three fields (`id`, `title`, source line) while the contract claims
// "identical across all 13 fields, `source` line number included" — so it is widened
// here rather than argued about: the same field extractors, fed the `BEFORE` regexes,
// deep-equalled against the whole shipped record.
//
// A second implementation in a TEST is the opposite of the debt this milestone closes:
// the no-second-copy invariant is scoped to `src/` (ROUND 3/7), and a differential's
// entire job is to be an independent reading of the same corpus. If this drifts from
// the shipped parser, that is the differential working.
const cleanTitle = (raw) => raw.replace(/`/g, "").trim();

function splitSections(text, headerRe) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;
  lines.forEach((line, index) => {
    if (headerRe.test(line)) {
      if (current) sections.push(current);
      current = { header: line, line: index + 1, body: [] };
    } else if (current) {
      current.body.push(line);
    }
  });
  if (current) sections.push(current);
  return sections;
}

function inlineField(body, label) {
  const re = new RegExp(`\\*\\*${label}[:.]\\*\\*\\s*([\\s\\S]*?)(?:\\n\\s*\\n|\\n\\s*(?:-\\s*)?\\*\\*|$)`, "i");
  const match = body.join("\n").match(re);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

// goldenRecords(text, kind, meta) → the full 13-field MemoryRecord list the
// PRE-EXTRACTION parsers produced. Exported so the behavioural suite carries the same
// claim from the same one home rather than growing a third copy of it.
export function goldenRecords(text, kind, { item, itemSlug, workRelPath }) {
  const { split, head } = BEFORE[kind];
  return splitSections(text, split).map((section) => {
    const match = section.header.match(head);
    const id = match ? match[1] : "";
    const title = match ? cleanTitle(match[2]) : "";
    const source = `${workRelPath}:${section.line}`;
    if (kind === "adr") {
      const statusLine = section.body.find((line) => /\*\*Status:\*\*/i.test(line)) ?? "";
      const status = (statusLine.match(/\*\*Status:\*\*\s*(.+)/) ?? [, ""])[1].trim();
      const context = inlineField(section.body, "Context");
      const decision = inlineField(section.body, "Decision");
      const invariant = inlineField(section.body, "Invariant");
      return {
        recordType: "adr", id, item, itemSlug, title,
        area: "architecture", stage: "", kind: "", owner: "", status,
        summary: decision || invariant,
        text: [title, context, decision, invariant].filter(Boolean).join(" \n "),
        source,
      };
    }
    const meta = {};
    for (const line of section.body) {
      if (!/\*\*(?:Kind|Area|Stage|Owner|Raised by):\*\*/i.test(line)) continue;
      for (const part of line.split("·")) {
        const field = part.match(/\*\*([^:]+):\*\*\s*(.+)/);
        if (field) {
          const key = field[1].trim().toLowerCase();
          if (!(key in meta)) meta[key] = field[2].trim();
        }
      }
    }
    const what = inlineField(section.body, "What happened");
    const why = inlineField(section.body, "Why");
    const lesson = inlineField(section.body, "Lesson");
    return {
      recordType: "lesson", id, item, itemSlug, title,
      area: meta.area ?? "", stage: meta.stage ?? "", kind: meta.kind ?? "", owner: meta.owner ?? "",
      status: "",
      summary: lesson,
      text: [title, what, why, lesson].filter(Boolean).join(" \n "),
      source,
    };
  });
}

// The shapes that ARE the grammar. Each is checked in BOTH spellings — the regex
// literal (`/ADR-\d+/`) and the string a `new RegExp` would be built from
// (`"ADR-\\d+"`) — because a copy that composes its pattern from a string is still a
// copy, and the one-spelling scan is blind to exactly the shape this leaf itself uses.
//
// `#{2,3}` — THE HEADING ANCHOR — joined the list at review round 1. It had a SECOND
// SPELLING four times over, in the `headMatch ? … : header.replace(/^#{2,3}\s+/, "")`
// fallback at `local-indexing.mjs:139`/`:194` and `recovery.mjs:304`/`:329`, and the
// fallback was also DEAD: measured over the real corpus, 604 headings matched by the
// splits and the fallback branch was reached 0 times, because the capture head is
// strictly more permissive than the split that produced the section. Deleted rather
// than excused, and the anchor is now scanned so it cannot come back.
const ID_PATTERN_SHAPES = ["ADR-\\d", "R\\d+", "FF-\\d", "F-\\d", "D-\\d", "[:·—–-]", "#{2,3}"];
const carriesIdPattern = (body) =>
  ID_PATTERN_SHAPES.filter((shape) => body.includes(shape) || body.includes(shape.replaceAll("\\", "\\\\")));

// THE NON-VACUITY ASSERTION ON THE SWEEP'S OWN EYESIGHT (TECH_DEBT item 24 fix (b);
// 66/00 shipped FF-6602 green for the wrong reason without it). A stripper's failure
// is silent: the sweep still runs, finds nothing in the region it can no longer see,
// and reports green. The WITNESS is the NON-BLANK CODE-LINE COUNT, measured in 66/00
// against all four modules the trap order blinds: last-code-line survives 0 of 4, an
// export count 2 of 4, a declaration count 3 of 4, and non-blank code lines 4 of 4
// with 0 false positives across the whole tree. `strip` is a parameter for exactly one
// reason — so the lane at the bottom can drive this guard with a trap-order stripper
// and prove it has teeth, without anyone editing a file to run a red probe.
function strippedSources(sources, strip = stripComments) {
  const codeLines = (code) => code.split(/\r?\n/).filter((line) => line.trim() !== "").length;
  return sources.map((entry) => {
    const body = strip(entry.text);
    const hidden = codeLines(stripComments(entry.text)) - codeLines(body);
    assert.ok(
      hidden <= 0,
      `the comment stripper hid ${hidden} line(s) of code in ${entry.file} that the one home (test/support/source-slice.mjs) keeps — TECH_DEBT item 24, the phantom block a \`//\` comment containing \`/*\` opens: every sweep below is blind to that region and would report green over it`,
    );
    return { ...entry, body };
  });
}

async function readSources() {
  const sources = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith(".mjs")) {
        sources.push({ file: path.relative(repoRoot, full).replaceAll("\\", "/"), text: await readFile(full, "utf8") });
      }
    }
  };
  await walk(srcDir);
  return sources;
}

async function walkWork(dir = workDir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkWork(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

// THE DIFFERENTIAL, as a pure function of a composition — so the lane at the bottom can
// drive it with a DELIBERATELY WRONG one and prove it fails, rather than trusting that
// a comparison which found no difference was looking.
//
// `compose` supplies the "after" side: `{ lesson: { split, head }, adr: { split, head } }`.
// Returns `{ lesson, adr }` record counts. Throws on the first divergence.
function differential(corpus, compose) {
  const totals = { lesson: 0, adr: 0 };
  for (const { file, kind, text } of corpus) {
    const before = BEFORE[kind];
    const after = compose[kind];
    const cut = (split, head) => {
      const out = [];
      text.split(/\r?\n/).forEach((line, index) => {
        if (!split.test(line)) return;
        const match = line.match(head);
        out.push({
          id: match ? match[1] : "",
          title: match ? match[2].replace(/`/g, "").trim() : "",
          line: index + 1,
        });
      });
      return out;
    };
    const goldenSplit = text.split(/\r?\n/).map((line, index) => (before.split.test(line) ? index + 1 : 0)).filter(Boolean);
    const shippedSplit = text.split(/\r?\n/).map((line, index) => (after.split.test(line) ? index + 1 : 0)).filter(Boolean);
    assert.deepEqual(shippedSplit, goldenSplit, `${file}: the SECTION SPLIT moved — the shipped composition cuts different lines than the pre-extraction literal`);
    assert.deepEqual(cut(after.split, after.head), cut(before.split, before.head), `${file}: an (id, title, line) capture moved across the extraction`);
    totals[kind] += goldenSplit.length;
  }
  return totals;
}

let corpusCache = null;
async function memoryCorpus() {
  if (corpusCache == null) {
    const files = await walkWork();
    const out = [];
    for (const file of files) {
      const base = path.basename(file);
      const kind = base === "RETROSPECTIVE.md" ? "lesson" : base === "ARCHITECTURE.md" ? "adr" : null;
      if (kind == null) continue;
      out.push({ file: path.relative(repoRoot, file).replaceAll("\\", "/"), kind, text: await readFile(file, "utf8") });
    }
    corpusCache = out;
  }
  return corpusCache;
}

const SHIPPED = {
  lesson: { split: headingSplitRe("R"), head: headingCaptureRe("R") },
  adr: { split: headingSplitRe("ADR"), head: headingCaptureRe("ADR") },
};

export const archTests = [
  {
    name: "arch/FF-6604: exactly ONE module under src/ carries an id pattern — src/declared-id.mjs",
    run: async () => {
      const sources = strippedSources(await readSources());
      assert.ok(sources.length > 100, `non-vacuity: the scan walked src/ (${sources.length} modules)`);
      const homes = sources.filter((entry) => carriesIdPattern(entry.body).length > 0);
      assert.deepEqual(
        homes.map((entry) => entry.file).sort(),
        [THE_ONE_HOME],
        `the grammar has ONE home; hits: ${JSON.stringify(homes.map((e) => ({ file: e.file, shapes: carriesIdPattern(e.body) })), null, 1)}`,
      );
      // …and the one home really does carry ALL SIX shapes, so "one home" is not one
      // home plus a scattering the scan happens to miss.
      assert.deepEqual(carriesIdPattern(homes[0].body).sort(), [...ID_PATTERN_SHAPES].sort(), "the one home carries the whole namespace and the separator class");
      // THE FOUR LITERALS ROUND 3/6 NAMES, checked at their call sites: `local-indexing.mjs`
      // holds neither a split nor a capture head of its own, for either parser.
      for (const file of WHOLE_DOCUMENT_IMPORTERS) {
        const body = sources.find((entry) => entry.file === file).body;
        assert.deepEqual(carriesIdPattern(body), [], `${file} holds no id pattern of its own — both literals, both parsers`);
        assert.match(body, /headingSplitRe\(/, `${file} builds its split from the leaf`);
        assert.match(body, /headingCaptureRe\(/, `${file} builds its capture head from the leaf too — a re-home reaching only the split is half done`);
      }
    },
  },
  {
    name: "arch/FF-6604: the leaf's exports partition into two halves, and memory takes only the whole-document one",
    run: async () => {
      // (a) Every export is classified. Adding one fails this until it is placed.
      const leaf = await import("../../../src/declared-id.mjs");
      assert.deepEqual(
        Object.keys(leaf).sort(),
        [...DOCUMENT_HALF, ...REGISTER_HALF].sort(),
        "every export of the leaf is classified as whole-document or register-scoped — the separation ADR-008 ruling 2 makes load-bearing",
      );
      assert.deepEqual(DOCUMENT_HALF.filter((name) => REGISTER_HALF.includes(name)), [], "the two halves are disjoint");

      // (b) THE IMPORT-BINDING PARSE. Memory's reach is the whole document — 0 of 343
      //     ADR and 0 of 261 lesson headings sit inside a register block — so an import
      //     of the block predicate here returns 0 of 600 records. A defect, not a
      //     shortcut, and this is where it is caught.
      const sources = strippedSources(await readSources());
      for (const file of WHOLE_DOCUMENT_IMPORTERS) {
        const body = sources.find((entry) => entry.file === file).body;
        const edge = body.match(/import\s*\{([^}]*)\}\s*from\s*"[^"]*declared-id\.mjs"/);
        assert.ok(edge, `${file} reaches the grammar by importing the leaf`);
        const bound = edge[1].split(",").map((name) => name.trim().split(/\s+as\s+/)[0]).filter(Boolean).sort();
        assert.ok(bound.length > 0, `${file} binds at least one name`);
        assert.deepEqual(
          bound.filter((name) => !DOCUMENT_HALF.includes(name)),
          [],
          `${file} takes ONLY the whole-document half; bound: ${bound.join(", ")}`,
        );
        assert.deepEqual(
          bound.filter((name) => REGISTER_HALF.includes(name)),
          [],
          `${file} imports no register-block predicate — the register rule scopes the DECLARATION recogniser alone, never memory's document parse`,
        );
      }

      // (c) No importer of the leaf anywhere under src/ invents a name — a binding the
      //     leaf does not export is a stale import that fails at load, and naming it
      //     here fails it at review instead. Stays green as 66/02 adds the register half.
      const exported = new Set(Object.keys(leaf));
      for (const entry of sources) {
        for (const edge of entry.body.matchAll(/import\s*\{([^}]*)\}\s*from\s*"[^"]*declared-id\.mjs"/g)) {
          for (const name of edge[1].split(",").map((n) => n.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
            assert.ok(exported.has(name), `${entry.file} imports \`${name}\`, which the leaf does not export`);
          }
        }
      }
      // (d) The leaf is a LEAF. Zero imports is what lets 66/02's controls lane take it
      //     without reaching `node:fs` (FF-6605), and what makes "one home" a fact of
      //     the module graph rather than of discipline.
      const leafBody = sources.find((entry) => entry.file === THE_ONE_HOME).body;
      assert.equal(/^import\s|require\(/m.test(leafBody), false, "the grammar leaf has zero imports");
    },
  },
  {
    name: "arch/FF-6604: THE DIFFERENTIAL — over the real wiki/work, the shipped composition cuts the same sections and yields records identical at ALL 13 FIELDS",
    run: async () => {
      const corpus = await memoryCorpus();
      assert.ok(corpus.length > 80, `non-vacuity: the walk found the corpus (${corpus.length} RETROSPECTIVE/ARCHITECTURE files under wiki/work)`);
      const totals = differential(corpus, SHIPPED);
      // The floor ROUND 3/8 prescribes. Never a stored count: 342 + 258 = 600 today,
      // and it moves with every ADR block and every lesson this repo writes.
      assert.ok(totals.adr > 0 && totals.lesson > 0, `the walk really parsed records: ${totals.adr} adr, ${totals.lesson} lesson`);
      // The bare-`R` form is the whole risk (ADR-008 ruling 1: a hyphenated pattern
      // returns ZERO lessons), so the lesson half is asserted to be the large one it is.
      assert.ok(totals.lesson > 100, `the bare-\`R\` form still yields its lessons (${totals.lesson}; 261 headings measured at HEAD)`);
      assert.ok(totals.adr > 100, `and the ADR half too (${totals.adr}; 343 headings measured at HEAD)`);

      // …and the same comparison through the SHIPPED PARSERS end to end, AT ALL 13
      // FIELDS — the claim feature 01 actually makes ("each is identical to its golden
      // across all 13 fields, `source` line number included"). Round 1 of review found
      // this asserted at three; the golden is now a full independent reimplementation
      // driven by the same pre-extraction literals.
      let compared = 0;
      for (const { file, kind, text } of corpus) {
        const meta = { item: "00", itemSlug: "x", workRelPath: file };
        const records = (kind === "lesson" ? parseRetrospective : parseArchitecture)(text, meta);
        const golden = goldenRecords(text, kind, meta);
        assert.deepEqual(records, golden, `${file}: a record moved across the extraction`);
        // The field set is frozen at 13 (ADR-005), and asserting it here is what makes
        // "all 13" a checked claim rather than a comment.
        for (const record of records) assert.equal(Object.keys(record).length, 13, `${file}: ${record.id} carries the frozen 13 fields`);
        compared += records.length;
      }
      assert.equal(compared, totals.adr + totals.lesson, `every record was compared field for field (${compared})`);
    },
  },
  {
    name: "arch/FF-6604: NON-VACUITY — a planted second copy is detected, in either spelling",
    run: () => {
      const planted = [
        { file: THE_ONE_HOME, text: 'export const ID = ["ADR-\\\\d+", "R\\\\d+"];\n' },
        // The regex-literal spelling — a copy-paste of `local-indexing.mjs:107`.
        { file: "src/pretend-second-parser.mjs", text: "const headerRe = /^#{2,3}\\s+R\\d+\\b/;\nconst head = /^#{2,3}\\s+(R\\d+)\\s*[:·—–-]?\\s*(.*)$/;\n" },
        // The string-composed spelling — invisible to a one-spelling scan, and the very
        // shape the one home itself uses, which is what makes it the likely copy.
        { file: "src/pretend-composed.mjs", text: 'const headerRe = new RegExp("^#{2,3}\\\\s+ADR-\\\\d+");\n' },
        // …and a module that merely MENTIONS an id is not a copy.
        { file: "src/pretend-mentions.mjs", text: 'const note = "see ADR-001 and R1 for the rationale";\n' },
      ];
      const hits = planted.filter((entry) => carriesIdPattern(stripComments(entry.text)).length > 0).map((entry) => entry.file);
      assert.deepEqual(
        hits.sort(),
        [THE_ONE_HOME, "src/pretend-composed.mjs", "src/pretend-second-parser.mjs"],
        "both spellings of a second copy are visible, and a prose mention of an id is not",
      );
      // The separator class alone is a copy too — ROUND 3/6's whole point is that the
      // capture head is the literal a half-done re-home leaves behind.
      assert.deepEqual(
        carriesIdPattern("const head = /^#{2,3}\\s+(X)\\s*[:·—–-]?\\s*(.*)$/;"),
        ["[:·—–-]", "#{2,3}"],
        "a leftover capture head is a leftover copy — separator class AND heading anchor",
      );
      // …and the heading-anchor half alone, which is the shape the four deleted
      // fallbacks had: no id, no separator, just a second spelling of the anchor.
      assert.deepEqual(carriesIdPattern('header.replace(/^#{2,3}\\s+/, "").trim()'), ["#{2,3}"], "the deleted fallback's own shape is caught if it comes back");
    },
  },
  {
    name: "arch/FF-6604: NON-VACUITY — the item-24 stripper guard has teeth: a TRAP-ORDER stripper is refused before any sweep runs",
    run: async () => {
      // Block comments stripped FIRST, so a `//` comment containing `/*` opens a
      // phantom block running to the next `*/`. Driven here rather than by editing a
      // file, so the probe is repeatable.
      const trapOrder = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
      const sources = await readSources();
      assert.throws(
        () => strippedSources(sources, trapOrder),
        /hid \d+ line\(s\) of code .*TECH_DEBT item 24/s,
        "a blinded stripper must be refused at the door — a sweep that cannot see a region reports green over it, which is how 66/00's FF-6602 first shipped",
      );
      // The reach is a PROPERTY, not a count: every module the trap order blinds is
      // caught one at a time, rather than the walk happening to include one that is.
      const codeLines = (code) => code.split(/\r?\n/).filter((line) => line.trim() !== "").length;
      const blinded = sources.filter((entry) => codeLines(trapOrder(entry.text)) < codeLines(stripComments(entry.text)));
      assert.ok(blinded.length > 0, "non-vacuity: the trap order really does blind this tree");
      for (const entry of blinded) assert.throws(() => strippedSources([entry], trapOrder), /TECH_DEBT item 24/, `${entry.file} is blinded and must be caught`);
      // …and the shipped stripper is 0 false positives over the same tree.
      assert.equal(strippedSources(sources).length, sources.length);
    },
  },
  {
    name: "arch/FF-6604: NON-VACUITY — the differential has teeth: a hyphenated `R` form and a dropped separator class both fail it",
    run: async () => {
      const corpus = await memoryCorpus();
      // ADR-008 ruling 1's exact hazard: `R-\d+` returns ZERO lesson records, and the
      // 22 fixture-planting suites all stay green through that silent shrink. Only a
      // differential over the REAL corpus sees it.
      const hyphenated = {
        ...SHIPPED,
        lesson: { split: /^#{2,3}\s+R-\d+\b/, head: /^#{2,3}\s+(R-\d+)\s*[:·—–-]?\s*(.*)$/ },
      };
      assert.throws(
        () => differential(corpus, hyphenated),
        /the SECTION SPLIT moved/,
        "a hyphenated `R` form loses every lesson in the corpus and the differential must say so",
      );
      // ROUND 3/6's other half: dropping the SEPARATOR CLASS from the capture head
      // leaves the split intact and silently folds the separator into the title — a
      // change no split-only differential can see.
      const noSeparator = {
        ...SHIPPED,
        adr: { split: headingSplitRe("ADR"), head: /^#{2,3}\s+(ADR-\d+)\s*\s*(.*)$/ },
      };
      assert.throws(
        () => differential(corpus, noSeparator),
        /an \(id, title, line\) capture moved/,
        "the capture head is the second literal, and a re-home that drops it is half done",
      );
      // …and the shipped composition passes the same instrument, so the two throws
      // above are the instrument working rather than the corpus being unparseable.
      const totals = differential(corpus, SHIPPED);
      assert.ok(totals.adr > 0 && totals.lesson > 0);
    },
  },
  {
    name: "arch/FF-6604: the composition is byte-identical to the literals it replaced, form by form",
    run: () => {
      // The four regexes, compared as SOURCE against the pre-extraction literals. This
      // is what makes "no record moves" true by construction rather than by corpus.
      assert.equal(headingSplitRe("R").source, BEFORE.lesson.split.source, "the lesson split");
      assert.equal(headingCaptureRe("R").source, BEFORE.lesson.head.source, "the lesson capture head");
      assert.equal(headingSplitRe("ADR").source, BEFORE.adr.split.source, "the adr split");
      assert.equal(headingCaptureRe("ADR").source, BEFORE.adr.head.source, "the adr capture head");
      // The ADR form deliberately carries NO terminator, because its shipped literal
      // did not: adding `\b` would newly reject `## ADR-001a`, a behaviour change
      // wearing a tidy-up's clothes.
      assert.equal(ID_FORMS.find((form) => form.name === "ADR").terminator, "", "the ADR form's terminator is empty, as the shipped literal was");
      assert.equal(ID_FORMS.find((form) => form.name === "R").terminator, "\\b", "…and the `R` form's is `\\b`, as its shipped literal was");
      assert.equal(headingSplitRe("ADR").flags, "", "no `g` flag: both call sites feed these to a `.test(line)` loop, and `lastIndex` would drop every other heading");
      assert.equal(headingSplitRe("R").flags, "");
    },
  },
];
