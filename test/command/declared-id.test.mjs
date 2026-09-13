// Traceability wiring for milestone 66 / story 01 — BOTH task features:
//   tasks/00_the-declaration-grammar.feature          (every row of every Outline)
//   tasks/01_memory-parsers-share-the-one-home.feature (every row of every Outline)
// against the LOCKED surfaces: `src/declared-id.mjs`, and the two parsers of
// `src/memory/local-indexing.mjs` reached through the real memory stack.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHICH SURFACE EACH OUTLINE DRIVES, AND WHY IT IS NOT THE SAME ONE.
//
// Feature 00's SECOND outline ("the id namespace, and the token that must follow the
// id") is a contract about the RECOGNISER — the id forms and the separator token — so
// it drives `declaredIdOn(line)` line by line. Two of its rows are `## ADR-001:` and
// `### R1 —`, and under ADR-008 ruling 2 those are WHOLE-DOCUMENT declarations that
// need no register block at all: the outline's "inside a register block" Given
// establishes declaration territory, not the scope rule. Both rows are additionally
// asserted against the whole-document composition memory actually runs, so the two
// halves of the union (ROUND 3/1) are shown to agree on them rather than assumed to.
//
// Feature 00's FIRST and THIRD outlines are contracts about POSITION — which file,
// which block, which region — so they drive the full `registerDeclarations` walk over
// a real document, never the line matcher.
//
// THE THIRD OUTLINE'S LAST ROW IS DRIVEN AGAINST THIS STORY'S OWN FEATURE FILE ON
// DISK. It claims a task `.feature` declares nothing "including this file's own
// Examples table" — a file that quotes 30-odd declaration-shaped lines. Asserting it
// against a fabricated fixture would prove the fixture; asserting it against the file
// itself is the claim.
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  ID_FORMS,
  REGISTER_BLOCKS,
  DECLARATION,
  QUALIFIED_REF,
  declaredIdOn,
  headingSplitRe,
  headingCaptureRe,
  normalizeOpener,
  qualifiedRefsIn,
  registerDeclarations,
  registerEntries,
} from "../../src/declared-id.mjs";
import { parseArchitecture, parseRetrospective } from "../../src/memory/local-indexing.mjs";
import { rankRecords } from "../../src/memory/local-retrieval.mjs";
import { runMemory, resolveConfiguredBackend } from "../../src/work/memory.mjs";
// THE PRE-EXTRACTION GOLDEN, from its one home. FF-6604 owns the differential and
// therefore owns the second implementation that drives it (the 66/00 idiom — its arch
// gates export the pure functions their lanes run). A third copy of "what the parsers
// used to do" living here would be the debt this story exists to close, in the test.
import { BEFORE, goldenRecords } from "../arch/command/acd-declared-id-single-home.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const workDir = path.join(repoRoot, "wiki", "work");
const storyDir = path.join(workDir, "66_milestone_controls-that-run", "stories", "01_story_declaration-form");

// ─────────────────────────────────────────────────────────── document builders ──

// A record document with ONE register block, opened by `opener` and closed by the
// next h2 — the shape every placement row varies one dimension of.
const docWith = (opener, ...body) =>
  ["---", "doc: record", "---", "# A record", "", opener, "", ...body, "", "## User sign-off", "", "signed."].join("\n");

// The subject row of feature 00's third outline: "a findings row whose first cell
// holds `**FF-6603**` alone".
const SUBJECT_ROW = "| **FF-6603** | the invariant | test/arch/x.test.mjs |";

// `declarations(text, file)` → just the ids, which is what every row asserts.
const declaredIn = (text, file) => registerDeclarations(text, file).map((entry) => entry.id);

// ───────────────────────────────────────────── the corpus, walked for real ──

async function walkWork(dir = workDir, out = []) {
  const { readdir } = await import("node:fs/promises");
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkWork(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

// ─────────────────────────────────────────────── the memory stack, wired ──

const MEMORY_CONFIG = { memory: { backend: "local" } };

async function runMemoryIn(ctx, argv) {
  const lines = [];
  const outcome = await runMemory(argv, {
    config: MEMORY_CONFIG,
    resolveBackend: (cfg) => resolveConfiguredBackend(cfg),
    ctx,
    log: (line) => lines.push(line),
  });
  return { outcome, output: lines.join("\n") };
}

// A two-milestone fixture stream: one RETROSPECTIVE, one ARCHITECTURE, and — the
// point of the scope scenario — a `## Fitness functions` register sitting in the
// SAME `ARCHITECTURE.md` as the ADR blocks, with every ADR heading outside it.
const FIXTURE_RETRO = [
  "---",
  "doc: retrospective",
  "---",
  "# 07 · Retro",
  "",
  '## R1 — "Requiring-grep" fitness tests penalise the correct refactor',
  "",
  "- **Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** developer",
  "",
  "**Lesson.** Assert the property, never the grep.",
  "",
  "## R5 · a middot separator",
  "",
  "- **Kind:** insight · **Area:** contract",
  "",
  "**Lesson.** The separator set is unchanged by the re-home.",
  "",
].join("\n");

const FIXTURE_ARCH = [
  "---",
  "doc: architecture",
  "---",
  "# 07 · Architecture Decisions",
  "",
  "## ADR-001: The folder name is the index",
  "",
  "**Status:** Accepted",
  "",
  "**Decision.** The folder name is the index.",
  "",
  "### ADR-012 · a lesson-level ADR authored at h3",
  "",
  "**Status:** Accepted",
  "",
  "**Decision.** h3 anchors at both parsers today and still does.",
  "",
  "## Fitness functions",
  "",
  "| id | invariant | enforced by |",
  "|---|---|---|",
  "| **FF-0701** | the register declares | test/arch/x.test.mjs |",
  "",
  "---",
  "",
].join("\n");

async function fixtureStream() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-declared-id-"));
  const stream = path.join(root, "work");
  const milestone = path.join(stream, "07_milestone_fixture");
  await mkdir(milestone, { recursive: true });
  await writeFile(
    path.join(milestone, "SPEC.md"),
    "---\ntype: milestone\nnumber: 07\nslug: fixture\nstatus: in-progress\ncreated: 2026-08-01\nupdated: 2026-08-01\nschema: 1\n---\n# 07 · Fixture\n",
    "utf8",
  );
  await writeFile(path.join(milestone, "RETROSPECTIVE.md"), FIXTURE_RETRO, "utf8");
  await writeFile(path.join(milestone, "ARCHITECTURE.md"), FIXTURE_ARCH, "utf8");
  return { root, workDir: stream, projectRoot: root, configMemory: MEMORY_CONFIG.memory };
}

// The `(id, title, line)` triples the PRE-EXTRACTION literals cut out of one document —
// the cheap shape, for the lanes that only need heading positions.
function beforeTriples(text, kind) {
  const { split, head } = BEFORE[kind];
  const out = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!split.test(line)) return;
    const match = line.match(head);
    out.push({ id: match ? match[1] : "", title: match ? match[2].replace(/`/g, "").trim() : "", line: index + 1 });
  });
  return out;
}

export const declaredIdTests = [
  // ===================================================================
  // 66/01 task 00 — `00_the-declaration-grammar.feature`
  // ===================================================================
  {
    name: "66/01 grammar: the four forms the findings register is written in, and the two dissolved false positives (Outline, 9 rows)",
    run: () => {
      // Every row is placed inside a `## Findings` block in a `VERIFICATION.md` — the
      // Given, driven literally through the block walk rather than the line matcher.
      const rows = [
        ["| F-2 | Same shape, and the test had been **retitled** … |", "F-2", "the cell boundary terminates the id (51 such rows)"],
        ["| **F-2701** | KR3 soak (task 06) ran single-OS … |", "F-2701", "bold emphasis around the id changes nothing (67 such rows)"],
        ["### F-47-V-1 — Back/Forward does not re-narrow: the address moves", "F-47-V-1", "heading anchor, suffixed id, em-dash separator (21)"],
        ["- **F-1 — No delivered launch path serves the board same-origin…**", null, "a bullet is not an admitted anchor; deliberately not tolerated (7)"],
        ["**Next free id is D-37.**", null, "no block anchor, and the id is not the first token; a reservation"],
        ["### D-17 is now LIVE, and sharper than the ledger said", null, "prose follows the id with no separator, so the id is a subject not a label"],
        ["| F-05.1 | Task 00's cell … is **arithmetically unreachable** |", null, "`.` is outside the namespace, so this row declares nothing (18 rows)"],
        ["| 52/FF-5204 | a qualified ref standing in the first cell |", null, "a cross-file ref declares nothing, with or without the `m`"],
        ["|  | an empty first cell |", null, "there is no id to be first"],
      ];
      for (const [line, expected, why] of rows) {
        const found = declaredIn(docWith("## Findings", line), "VERIFICATION.md");
        assert.deepEqual(found, expected == null ? [] : [expected], `${line}  →  ${expected == null ? "citation" : `declaration of ${expected}`} — ${why}`);
      }
      // …and the `m` half of the last-but-one row: an `m`-prefixed qualified ref in
      // first position declares nothing either (ADR-008 ruling 5).
      assert.deepEqual(declaredIn(docWith("## Findings", "| m52/FF-5204 | with the optional prefix |"), "VERIFICATION.md"), []);
    },
  },
  {
    name: "66/01 grammar: the id namespace, and the token that must follow the id (Outline, 15 rows)",
    run: () => {
      const rows = [
        ["### FF-1 · The loop registry never enters the item vocabulary", "FF-1", "middot separator"],
        ["| **FF-5201 · The loop registry never enters the item vocabulary.** |", "FF-5201", "m52's real row: id first, `·` next, the bold closing late"],
        ["### D-1 — a debt entry", "D-1", "em dash"],
        ["### F-9 – a finding", "F-9", "en dash"],
        ["## ADR-001: The folder name is the index", "ADR-001", "colon"],
        ['### R1 — "Requiring-grep" fitness tests penalise the correct refactor', "R1", "the bare-`R` form, 259 in the corpus and 0 hyphenated"],
        ["### F-47-V-3 - a hyphen separator", "F-47-V-3", "suffixed id, hyphen separator"],
        ["### F-3-bis", "F-3-bis", "end of line terminates the id"],
        ["### R-1 · a hyphenated lesson id", null, "`R<n>` is the form and it takes no hyphen; widening the set is an ADR act"],
        ["### X-1 · id-shaped, outside the namespace", null, "`X` is in none of the forms"],
        ["### ff-6603 · lower case", null, "an id is matched case-sensitively; only the register opener normalises"],
        ["### 17 · a bare number", null, "a number without a prefix is not an id"],
        ["#### FF-1 · an h4", null, "only h2 and h3 anchor a declaration"],
        ["###FF-1 · no whitespace after the hashes", null, "the anchor needs its separating whitespace"],
        ["| FF-1 and FF-2 are one guard | … |", null, "prose follows the id with no separator; the `### D-17` shape, in a cell"],
      ];
      for (const [line, expected, why] of rows) {
        assert.equal(declaredIdOn(line), expected, `${line}  →  ${expected == null ? "citation" : `declaration of ${expected}`} — ${why}`);
      }
      // THE TWO DOCUMENT-SCOPED ROWS, checked against the OTHER half of the union
      // (ROUND 3/1): `## ADR-001:` and `### R1 —` are whole-document declarations, and
      // the composition memory runs agrees with the recogniser on both.
      assert.equal(headingSplitRe("ADR").test("## ADR-001: The folder name is the index"), true);
      assert.equal("## ADR-001: The folder name is the index".match(headingCaptureRe("ADR"))[1], "ADR-001");
      assert.equal(headingSplitRe("R").test('### R1 — "Requiring-grep" fitness tests penalise the correct refactor'), true);
      assert.equal('### R1 — "Requiring-grep" fitness tests penalise the correct refactor'.match(headingCaptureRe("R"))[1], "R1");
      // …and the rejected hyphenated form is rejected by BOTH halves, not just one.
      assert.equal(headingSplitRe("R").test("### R-1 · a hyphenated lesson id"), false);
    },
  },
  {
    name: "66/01 grammar: where a register block opens, where it ends, and what a fence hides (Outline, 13 rows)",
    run: async () => {
      const declares = (text, file) => assert.deepEqual(declaredIn(text, file), ["FF-6603"], text);
      const cites = (text, file, why) => assert.deepEqual(declaredIn(text, file), [], `${why}\n${text}`);

      declares(docWith("## Fitness functions", SUBJECT_ROW), "ARCHITECTURE.md");
      declares(docWith("## Findings", SUBJECT_ROW), "VERIFICATION.md");
      declares(docWith("## Findings", SUBJECT_ROW), "SESSION.md");
      // The block CITES in a VERIFICATION.md (ADR-008 ruling 4) — ADR-005's red-probe
      // row resolves to the architecture declaration instead of making a second one.
      cites(docWith("## Fitness functions", SUBJECT_ROW), "VERIFICATION.md", "the block cites in that file");
      const citing = registerEntries(docWith("## Fitness functions", SUBJECT_ROW), "VERIFICATION.md");
      assert.deepEqual(citing, [{ id: "FF-6603", line: 8, kind: "citing" }], "…and it is a citing ENTRY, not an absent one — 66/02 resolves it");

      declares(docWith("## Fitness Functions", SUBJECT_ROW), "ARCHITECTURE.md");
      declares(docWith("## Fitness functions (this milestone)", SUBJECT_ROW), "ARCHITECTURE.md");
      declares(docWith("## Findings (added at re-open)", SUBJECT_ROW), "VERIFICATION.md");
      cites(docWith("## Story 03 findings", SUBJECT_ROW), "VERIFICATION.md", "a per-story sub-register is grandfathered, never renamed and never admitted");
      // Under the NEXT h2 in the same file — 53 table-row lines sit here at HEAD.
      cites(docWith("## Fitness functions", "", "## User sign-off", "", SUBJECT_ROW), "ARCHITECTURE.md", "the next h2 ends the block");
      cites(docWith("## Findings", "", "---", "", SUBJECT_ROW), "VERIFICATION.md", "a horizontal rule ends the block as surely as a heading");
      // An h3 nested inside does NOT close it — how 21 heading declarations sit.
      declares(docWith("## Findings", "### A sub-heading", "", SUBJECT_ROW), "VERIFICATION.md");
      // Fenced regions (ADR-001 §3) and the fence's three consequences.
      cites(docWith("## Findings", "```", SUBJECT_ROW, "```"), "VERIFICATION.md", "a quoted sample is not a register");
      cites(docWith("# doc", "```", "## Findings", "```", "", SUBJECT_ROW), "VERIFICATION.md", "a fenced opener opens nothing");
      declares(docWith("## Findings", "```", "---", "```", "", SUBJECT_ROW), "VERIFICATION.md");
      // A register block exists only in its own register file.
      for (const file of ["STATE.md", "SPEC.md", "00_the-declaration-grammar.feature", "UAT.md"]) {
        cites(docWith("## Findings", SUBJECT_ROW), file, `a register block exists only in its own register file (${file})`);
        cites(docWith("## Fitness functions", SUBJECT_ROW), file, `a register block exists only in its own register file (${file})`);
      }
      // "…including this file's own Examples table" — asserted against the REAL file,
      // which quotes 30-odd declaration-shaped lines. A fixture would prove the fixture.
      const ownFeature = path.join(storyDir, "tasks", "00_the-declaration-grammar.feature");
      const featureText = await readFile(ownFeature, "utf8");
      assert.ok(featureText.includes("| ### F-3-bis"), "non-vacuity: the feature really does quote declaration-shaped lines");
      assert.deepEqual(
        registerEntries(featureText, path.basename(ownFeature)),
        [],
        "a contract may quote the form at length without declaring anything",
      );
      // …and the HTML-comment rule (ROUND 3/11), whose trigger is already in the tree:
      // a multi-line `<!-- … -->` sits inside a register block in every shipped
      // template and in milestone 66's own fitness register.
      cites(
        docWith("## Fitness functions", "<!-- DOGFOODS ADR-001: the id is ALONE in the first cell,", SUBJECT_ROW, "     so every row DECLARES. -->"),
        "ARCHITECTURE.md",
        "a commented row declares nothing",
      );
      declares(
        docWith("## Fitness functions", "<!-- a note about the register -->", "", SUBJECT_ROW),
        "ARCHITECTURE.md",
        "…and a closed comment above the row hides nothing",
      );
      cites(docWith("<!-- ## Fitness functions -->", SUBJECT_ROW), "ARCHITECTURE.md", "a commented opener opens nothing");
    },
  },
  {
    name: "66/01 grammar: a register that carries no ids declares nothing, and is compliant by construction",
    run: () => {
      // The measured majority: 40 of 43 fitness tables carry no id column at all.
      const noIdColumn = docWith(
        "## Fitness functions",
        "| invariant | enforced by (arch-test) |",
        "|---|---|",
        "| The loop registry never enters the item vocabulary | test/arch/acd-loop-registry-vocabulary.test.mjs |",
        "| Every finding carries a raw absolute path | test/arch/audit/acd-controls-finding-envelope.test.mjs |",
      );
      assert.deepEqual(registerEntries(noIdColumn, "ARCHITECTURE.md"), [], "it yields no declarations");
      // Compliant BY CONSTRUCTION rather than by exemption: the same walk, with no
      // exemption list anywhere in it, and the file acquires obligations the moment it
      // acquires ids — nothing has to be un-exempted for that to happen.
      const withIds = noIdColumn.replace("| The loop registry", "| **FF-5201** | The loop registry");
      assert.deepEqual(declaredIn(withIds, "ARCHITECTURE.md"), ["FF-5201"], "…and one id column later, the same register declares");
    },
  },
  {
    name: "66/01 grammar: an id is unique within its register file, and a cross-file citation carries the item ref",
    run: () => {
      // `FF-5204` declared in milestone 52's register.
      const m52 = docWith("## Fitness functions", "| **FF-5204** | the loop registry is data | test/arch/x.test.mjs |");
      assert.deepEqual(declaredIn(m52, "ARCHITECTURE.md"), ["FF-5204"]);
      // Cited from another milestone's document: both resolving forms are read, and
      // both name the same (item, id) pair.
      for (const ref of ["52/FF-5204", "m52/FF-5204"]) {
        assert.deepEqual(qualifiedRefsIn(`As 52 already ruled (${ref}), the registry is data.`).map((c) => [c.item, c.id]), [["52", "FF-5204"]], ref);
      }
      // A bare `FF-5204` is not a cross-file citation at all — it resolves only inside
      // m52's own register, which is what makes the id unique per FILE rather than
      // globally (ADR-009/D: a bare cross-item id has no addressable target).
      assert.deepEqual(qualifiedRefsIn("a bare FF-5204 in prose"), []);
      // Per-milestone id spaces are therefore both legal, and distinguishable.
      assert.deepEqual(
        qualifiedRefsIn("52/FF-5204 and 66/FF-6604 are different ids").map((c) => `${c.item}/${c.id}`),
        ["52/FF-5204", "66/FF-6604"],
      );
      // THE LOOKBEHIND (ROUND 3/2) — the house's own slash-joined id pairs are not
      // cross-file refs, and reading them as such invents an item `001` and an item `1`.
      assert.deepEqual(qualifiedRefsIn("ADR-001/ADR-008 supersedes it, and F-1/F-2 are one guard"), []);
      // …while a story-scoped ref still parses.
      assert.deepEqual(qualifiedRefsIn("see 66/01/F-3").map((c) => [c.item, c.id]), [["66/01", "F-3"]]);
    },
  },

  // ===================================================================
  // 66/01 task 01 — `01_memory-parsers-share-the-one-home.feature`
  // ===================================================================
  {
    name: "66/01 re-home: the same corpus in, the same records out — every RETROSPECTIVE and ARCHITECTURE under wiki/work (Outline, 2 rows)",
    run: async () => {
      // The golden is RE-RECORDED FROM THE CORPUS, never remembered: the constant moves
      // with the tree (every ADR block and every lesson this repo writes is one more
      // record), so the assertion is the comparison.
      const files = await walkWork();
      let lesson = 0;
      let adr = 0;
      for (const file of files) {
        const base = path.basename(file);
        const kind = base === "RETROSPECTIVE.md" ? "lesson" : base === "ARCHITECTURE.md" ? "adr" : null;
        if (kind == null) continue;
        const text = await readFile(file, "utf8");
        const meta = { item: "07", itemSlug: "fixture", workRelPath: base };
        const parsed = (kind === "lesson" ? parseRetrospective : parseArchitecture)(text, meta);
        // "…one per heading the golden holds, AND each identical to its golden across
        // all 13 fields, `source` line number included" — asserted at all 13, from the
        // one home that owns the pre-extraction implementation.
        assert.deepEqual(
          parsed,
          goldenRecords(text, kind, meta),
          `${path.relative(repoRoot, file)}: one ${kind} record per heading the golden holds, identical across all 13 fields`,
        );
        for (const record of parsed) assert.equal(Object.keys(record).length, 13, `${record.id} carries the frozen 13 fields`);
        // …and the heading positions themselves, which is what "one per heading" means.
        assert.deepEqual(
          parsed.map((record) => Number(record.source.split(":").pop())),
          beforeTriples(text, kind).map((triple) => triple.line),
          `${path.relative(repoRoot, file)}: one record per heading, at the same line`,
        );
        if (kind === "lesson") lesson += parsed.length;
        else adr += parsed.length;
      }
      // Non-vacuity floor (ROUND 3/8) — a stored count is unrunnable here.
      assert.ok(lesson > 0 && adr > 0, `the walk found records: ${lesson} lesson, ${adr} adr`);
      assert.ok(files.length > 500, `non-vacuity: the walk really covered wiki/work (${files.length} files)`);
    },
  },
  {
    name: "66/01 re-home: the header the parsers accept is the header the corpus writes (Outline, 5 rows)",
    run: () => {
      const meta = { item: "07", itemSlug: "fixture", workRelPath: "X.md" };
      const retro = (heading, body = "") => parseRetrospective(`# R\n\n${heading}\n\n${body}\n`, meta);
      const arch = (heading, body = "") => parseArchitecture(`# A\n\n${heading}\n\n${body}\n`, meta);

      const r1 = retro('## R1 — "Requiring-grep" fitness tests penalise the correct refactor');
      assert.equal(r1.length, 1, "one `lesson` record");
      assert.equal(r1[0].id, "R1", "the bare-`R` form the whole corpus writes");
      assert.equal(r1[0].title, '"Requiring-grep" fitness tests penalise the correct refactor', "the title after the dash");
      assert.equal(r1[0].recordType, "lesson");

      const adr1 = arch("## ADR-001: The folder name is the index", "**Status:** Accepted");
      assert.equal(adr1.length, 1, "one `adr` record");
      assert.equal(adr1[0].id, "ADR-001");
      assert.equal(adr1[0].title, "The folder name is the index");
      assert.equal(adr1[0].status, "Accepted", "status read from its `**Status:**` line");

      const adr12 = arch("### ADR-012 · a lesson-level ADR authored at h3", "**Status:** Accepted");
      assert.equal(adr12.length, 1, "h3 anchors at both parsers today and still does");
      assert.equal(adr12[0].id, "ADR-012");

      const r5 = retro("## R5 · a middot separator");
      assert.equal(r5.length, 1, "the separator set is unchanged by the re-home");
      assert.equal(r5[0].id, "R5");
      assert.equal(r5[0].title, "a middot separator");

      assert.deepEqual(arch("## Fitness functions", "| **FF-1** | x |"), [], "a register heading was never a memory source and does not become one");
      assert.deepEqual(retro("## Fitness functions", "| **FF-1** | x |"), []);
    },
  },
  {
    name: "66/01 re-home: memory's reach is the whole document, never a register block",
    run: async () => {
      // An ARCHITECTURE.md whose ADR headings all sit outside its `## Fitness functions`
      // block — the shape 100% of the corpus has (0 of 343 ADR headings sit in one).
      const meta = { item: "07", itemSlug: "fixture", workRelPath: "ARCHITECTURE.md" };
      const records = parseArchitecture(FIXTURE_ARCH, meta);
      assert.deepEqual(records.map((r) => r.id), ["ADR-001", "ADR-012"], "every ADR block still yields its record");
      // The register-block rule scopes the DECLARATION recogniser alone: the same text,
      // read through the register half, yields the register's row and neither ADR.
      assert.deepEqual(registerDeclarations(FIXTURE_ARCH, "ARCHITECTURE.md").map((e) => e.id), ["FF-0701"]);
      // …and memory imports the forms WITHOUT the predicate, so the scope cannot leak
      // in later. (The exhaustive binding parse is FF-6604's; this is the behavioural
      // half — the import line itself.)
      const source = await readFile(path.join(repoRoot, "src", "memory", "local-indexing.mjs"), "utf8");
      const edge = source.match(/^import\s*\{([^}]*)\}\s*from\s*"\.\.\/declared-id\.mjs";/m);
      assert.ok(edge, "local-indexing imports the leaf");
      const bound = edge[1].split(",").map((name) => name.trim()).filter(Boolean).sort();
      assert.deepEqual(bound, ["headingCaptureRe", "headingSplitRe"], `memory takes the forms and nothing else; bound: ${bound.join(", ")}`);
    },
  },
  {
    name: "66/01 re-home: recall answers the same as before, and no query that answered before answers empty",
    run: async () => {
      const ctx = await fixtureStream();
      await runMemoryIn(ctx, ["reindex", "--all"]);
      const QUERY = "the separator set and the folder name index";

      // BEFORE: the records the PRE-EXTRACTION literals cut out of the same two files,
      // at all 13 fields, ranked by the SHIPPED ranker — which is pure
      // (`rankRecords(records, query, scope, opts)`), so "what recall answered before
      // the extraction" is computable now rather than remembered. This is a genuine
      // before-versus-after comparison, not the same query run twice.
      const before = rankRecords(
        [
          ...goldenRecords(FIXTURE_RETRO, "lesson", { item: "07", itemSlug: "fixture", workRelPath: "07_milestone_fixture/RETROSPECTIVE.md" }),
          ...goldenRecords(FIXTURE_ARCH, "adr", { item: "07", itemSlug: "fixture", workRelPath: "07_milestone_fixture/ARCHITECTURE.md" }),
        ],
        QUERY,
      );
      assert.ok(before.length >= 4, `non-vacuity: the pre-extraction golden answers this query (${before.length} records)`);

      // AFTER: the real stack — registry → local backend → on-disk index → recall.
      const after = JSON.parse((await runMemoryIn(ctx, ["recall", QUERY, "--json"])).output);
      assert.deepEqual(
        after.map((record) => [record.id, record.recordType, record.source.replaceAll("\\", "/")]),
        before.map((record) => [record.id, record.recordType, record.source]),
        "the same record ids are returned, in the same order, with the same `source` locations",
      );
      // …and no query that answered before now answers empty.
      assert.ok(after.length > 0, "the query still answers");
      for (const record of before) {
        const match = after.find((hit) => hit.id === record.id);
        assert.ok(match, `${record.id} answered before the extraction and still answers`);
        assert.equal(match.title, record.title, `${record.id} carries the same title`);
        assert.equal(match.summary, record.summary, `${record.id} carries the same summary`);
      }
    },
  },
  {
    name: "66/01 re-home: the two source consumers are served the same records, and neither is edited to absorb a change",
    run: async () => {
      const ctx = await fixtureStream();
      const reindexed = await runMemoryIn(ctx, ["reindex", "--all"]);
      assert.equal(reindexed.outcome.ok, true);
      const status = await runMemoryIn(ctx, ["status"]);
      assert.equal(status.outcome.result.lessons, 2, "`local-backend` is served both lessons");
      assert.equal(status.outcome.result.adrs, 2, "…and both ADRs");
      // The graphify backend consumes the SAME records — it owns its own derived store
      // and reranks over a graph, so it is driven through its OWN reindex. With no graph
      // built for a temp fixture the rerank degrades to the local ranking, which is
      // exactly the path that isolates the RECORD SET (what this task changed) from the
      // ranking (what it did not).
      const graphify = (await import("../../src/memory/graphify-backend.mjs")).default;
      const local = (await import("../../src/memory/local-backend.mjs")).default;
      await graphify.reindex(undefined, { ...ctx, configMemory: { backend: "graphify" } });
      const viaGraphify = await graphify.recall("the separator set", null, { limit: 10 }, { ...ctx, configMemory: { backend: "graphify" } });
      const viaLocal = await local.recall("the separator set", null, { limit: 10 }, ctx);
      const shape = (answer) => answer.records.map((r) => JSON.stringify({ ...r, score: undefined })).sort();
      assert.deepEqual(shape(viaGraphify), shape(viaLocal), "each returns what the other does, field for field");
      assert.ok(viaLocal.records.length > 0, "non-vacuity: both consumers actually returned records");
      // NEITHER CONSUMER IS EDITED TO ABSORB A CHANGE — the checkable residue of that
      // claim: neither module names the declaration grammar in any form.
      for (const consumer of ["local-backend.mjs", "graphify-backend.mjs"]) {
        const text = await readFile(path.join(repoRoot, "src", "memory", consumer), "utf8");
        assert.equal(/declared-id/.test(text), false, `${consumer} does not import the grammar`);
        assert.equal(/ADR-\\d|R\\d\+|\[:·—–-\]/.test(text), false, `${consumer} holds no id pattern either`);
      }
    },
  },

  // ===================================================================
  // The leaf's own frozen shape — the half of ADR-001 that IS behaviour.
  // ===================================================================
  {
    name: "66/01 grammar: the leaf's exports are frozen, and the two halves are separate bindings",
    run: () => {
      assert.equal(Object.isFrozen(ID_FORMS), true, "the closed set is frozen");
      for (const form of ID_FORMS) assert.equal(Object.isFrozen(form), true, `${form.name} is frozen`);
      assert.equal(Object.isFrozen(REGISTER_BLOCKS), true);
      assert.deepEqual(ID_FORMS.map((f) => f.name), ["ADR", "FF", "F", "D", "R"], "one entry per namespace member");
      // A miss fails LOUDLY rather than returning a regex that matches nothing.
      assert.throws(() => headingSplitRe("X"), /the namespace is closed/);
      // The recogniser and the qualified-ref grammar are separate bindings from the
      // forms — the separation ADR-008 ruling 2 makes load-bearing.
      assert.equal(DECLARATION instanceof RegExp, true);
      assert.equal(DECLARATION.global, false, "never global: it is applied per line, and `lastIndex` would drop every other one");
      assert.equal(QUALIFIED_REF.global, true, "…while the citation scan reads every ref on a line");
      assert.equal(headingSplitRe("R").global, false, "the split regex feeds a `.test(line)` loop and must not carry lastIndex");
      // normalizeOpener does the ONE normalisation ADR-008 ruling 3 allows, and no other.
      assert.equal(normalizeOpener("Fitness Functions"), "fitness functions");
      assert.equal(normalizeOpener("Fitness functions (this milestone)"), "fitness functions");
      assert.equal(normalizeOpener("Findings (added at re-open)"), "findings");
      assert.equal(normalizeOpener("Story 03 findings"), "story 03 findings", "nothing else normalises");
      assert.equal(normalizeOpener("Findings:"), "findings:", "…not even a trailing colon");
    },
  },
];
