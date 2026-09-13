// FF-6603 (milestone 66 / ADR-001, amended by ADR-008 + ADR-009) — A DECLARATION IS
// ID-FIRST INSIDE A FROZEN REGISTER BLOCK; FENCED REGIONS ARE SKIPPED; THE OPENER
// NORMALISES.
//
// "`ID_FORMS`, the register-block set and each block's DECLARING/CITING kind are
//  frozen exported literals. Resolution is against the UNION (ROUND 3/1): register-block
//  declarations for `FF`/`F`/`D`, and memory's WHOLE-DOCUMENT headings for `ADR`/`R`.
//  HTML comment blocks are skipped alongside fences (ROUND 3/11)."
//
// ─────────────────────────────────────────────────────────────────────────────
// MEASURED AT HEAD, 2026-08-15, over the REAL `wiki/work` (ADR-009/A: a claim about
// this tree is a MEASUREMENT and may not be frozen until it has been run and the
// result recorded). Every number below is re-measured by a lane in this file rather
// than narrated, so a corpus that moves fails loudly instead of drifting silently.
//
//   • 261 bare `## R<n>` lesson headings, 0 hyphenated · 343 `## ADR-NNN` headings.
//   • 38 exact `## Fitness functions` and 45 exact `## Findings` openers; the ONE
//     normalisation recovers `## Fitness Functions` ×2, `## Fitness functions (…)` ×6,
//     `## Findings (added at re-open)` ×1, and leaves `## Story NN findings` ×4 out.
//   • THE UNION, and it is the ruling this gate exists to hold (ROUND 3/1). Over 1,221
//     `.md`/`.feature` files: 2,393 qualified (citation, file) pairs.
//         resolved against REGISTER BLOCKS ONLY → 2,383 of 2,393 DANGLE (99.6%)
//         resolved against the UNION           →    27 dangle (1.1%)
//     Resolving `ADR`/`R` register-only is not a stricter check, it is a broken one.
//     The DOCUMENT half harvests only `ARCHITECTURE.md`/`RETROSPECTIVE.md` — the two
//     files memory actually reads — because ROUND 3/1 says "memory's WHOLE-DOCUMENT
//     headings" and 66/02 will code `register-dangling-citation` against this lane as
//     its reference. Narrowing it from every `.md`/`.feature` changed the ratio by
//     nothing (2,356 / 28 either way), which is why it is a precision fix rather than
//     a correction.
//   • THE RUN-ON GUARD (review round 1, and the sharpest thing this gate found). The
//     id alternation ends in a greedy `[A-Za-z0-9-]*`; without `(?![A-Za-z0-9-])` the
//     engine backtracks INTO the id until a hyphen inside it can serve as the
//     separator. Measured over the 101 register files: 173 entries without the guard,
//     153 with it, and ALL 20 differences are a TRUNCATED id becoming `null` — never a
//     real declaration lost. 0 of the 25 rows this story's contract enumerates change.
//     The worst two: `47/VERIFICATION.md` declared `F-47-V` ELEVEN times (a false
//     `register-duplicate-id` for 66/02 on arrival) and `49/VERIFICATION.md` declared
//     `F-49-VER` four times while `F-49-VER-b/-d/-e/-f` were declared nowhere.
//   • THE DOT GUARD IS SCOPED TO THE REGISTER FORMS, and that too is a measurement
//     rather than a preference. A blanket `(?!\.\d)` drops 34 dotted qualified refs
//     here; only ONE is ADR-008 ruling 6's population (`43/VERIFICATION.md`'s
//     `4/F-06.5`, whose base `F-06` is NOT declared, so reading it as `F-06` would
//     itself dangle). The other 33 are clause pointers — 30 `ADR`, 3 `R`, e.g.
//     `27/ADR-006.4` — whose base id really is declared and every one of which
//     RESOLVES. A blanket guard does not produce false findings; it HIDES 34 valid
//     citations from `register-dangling-citation` permanently, which is an unbounded
//     silent coverage hole — for this milestone the worse species, not the lesser one.
//   • THE `.` IN THE LOOKBEHIND CLASS (review round 2), which scoping the guard above
//     unmasked: `.` is an ID-CONTINUATION character here, so a hyphen-only lookbehind
//     lets a clause pointer's own digits start an item ref. 7 fabricated citations —
//     `3/ADR-006` from `ADR-004.3/ADR-006`, `4/ADR-005`, `2/ADR-016` from
//     `F-05.2/ADR-016`, `5/R1`, `2/R4`, `4/R4`, `1/R4`. Six resolved (silently wrong),
//     ONE dangled. Adding the dot: 2,400 → 2,393 refs, a strict subset, and the union's
//     unresolved count 28 → 27 — the one that left IS the fabricated dangle.
//   • THE LOOKBEHIND (ROUND 3/2). Without `(?<![-\w])` the qualified-ref grammar
//     mis-reads this house's own slash-joined id pairs: `ADR-003/ADR-006` becomes item
//     `003`, `F-1/F-2` becomes item `1`. 186 such artifacts today, and dropping them
//     takes the union's unresolved count from 111 to 28.
//
// (ADR-008 measured 259 lessons / 340 ADR / 37 / 44 hours earlier, and ROUND 3/1's
// pair counts were taken over a narrower slice. The corpus moved when 66/00 landed and
// this milestone's own records grew. That is precisely why every assertion here is a
// RATIO or a SET, and the only integers are non-vacuity floors.)
//
// ─────────────────────────────────────────────────────────────────────────────
// THE NON-VACUITY WITNESS FOR THE SEVEN NEGATIVES. A recogniser asked "does this
// declare?" answers "no" identically when it is right and when it is broken. So EVERY
// planted negative is placed in a document that also carries a KNOWN POSITIVE, and the
// positive is asserted found in the same call. "Found nothing" can never be the whole
// answer, which is the only signal that separates a working recogniser from a dead one.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ID_FORMS,
  REGISTER_BLOCKS,
  DECLARATION,
  QUALIFIED_REF,
  declaredIdOn,
  headingCaptureRe,
  headingSplitRe,
  normalizeOpener,
  qualifiedRefsIn,
  registerDeclarations,
  registerEntries,
} from "../../../src/declared-id.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const workDir = path.join(repoRoot, "wiki", "work");

// ───────────────────────────────────────────── the frozen literals, verbatim ──
//
// ADR-001 §2 as amended by ADR-008 ruling 1, spelled out here so the gate compares the
// SHIPPED grammar against the DECIDED one rather than against itself. A change to
// either side without the other is what this lane refuses.
const ADR_ID_FORMS = [
  { name: "ADR", scope: "document", id: "ADR-\\d+" },
  { name: "FF", scope: "register", id: "FF-\\d+[A-Za-z0-9-]*" },
  { name: "F", scope: "register", id: "F-\\d+[A-Za-z0-9-]*" },
  { name: "D", scope: "register", id: "D-\\d+[A-Za-z0-9-]*" },
  { name: "R", scope: "document", id: "R\\d+" },
];
const ADR_SEPARATOR_CLASS = "[:·—–-]";
// ADR-001 §1's two openers, ADR-008 ruling 4's declaring/citing split.
const ADR_REGISTER_BLOCKS = [
  { file: "ARCHITECTURE.md", heading: "fitness functions", kind: "declaring" },
  { file: "VERIFICATION.md", heading: "findings", kind: "declaring" },
  { file: "SESSION.md", heading: "findings", kind: "declaring" },
  { file: "VERIFICATION.md", heading: "fitness functions", kind: "citing" },
];
// ADR-001 §2's frozen recogniser, with `<ID>` expanded over the closed set and the
// RUN-ON GUARD that makes "the first token IS the id" true (66/01 review round 1).
// Without `(?![A-Za-z0-9-])` the engine backtracks INTO a suffixed id until a hyphen
// inside it can serve as the separator, so `| **F-49-VER-b** (GAP-6) | …` declared
// `F-49-VER` — a truncation, not a refusal. The guard is not a new rule: prose after
// an id with no separator was already a citation (`| FF-1 and FF-2 are one guard |`).
const ADR_RUN_ON_GUARD = "(?![A-Za-z0-9-])";
const ADR_DECLARATION_SOURCE =
  `^(?:#{2,3}[ \\t]+|\\|[ \\t]*)\\*{0,2}(${ADR_ID_FORMS.map((form) => form.id).join("|")})${ADR_RUN_ON_GUARD}\\*{0,2}[ \\t]*(?:\\||${ADR_SEPARATOR_CLASS}|$)`;
// The same shape over the REGISTER-SCOPED forms only — what the block walk uses, so a
// `scope: "document"` id inside a block is not declared twice (ROUND 3/1's union).
const ADR_REGISTER_DECLARATION_SOURCE =
  `^(?:#{2,3}[ \\t]+|\\|[ \\t]*)\\*{0,2}(${ADR_ID_FORMS.filter((f) => f.scope === "register").map((form) => form.id).join("|")})${ADR_RUN_ON_GUARD}\\*{0,2}[ \\t]*(?:\\||${ADR_SEPARATOR_CLASS}|$)`;

// ─────────────────────────────────────────────────────── the corpus, walked ──

async function walkWork(dir = workDir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkWork(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

// The leading milestone number of the item a file belongs to — the key a qualified ref
// resolves against. Deliberately the LEADING component: `66/01/F-3` and `m66/ADR-008`
// both address milestone 66's documents, and the id is unique within its register FILE
// (ADR-001 §5), which the milestone folder is the addressable unit of.
const itemOf = (file) => {
  const match = /^(\d+)_/.exec(path.relative(workDir, file).replaceAll("\\", "/"));
  return match ? String(Number(match[1])) : null;
};

const REGISTER_FILES = new Set(REGISTER_BLOCKS.map((block) => block.file));
// The two files memory's whole-document parsers read — `buildRecords` opens exactly
// `RETROSPECTIVE.md` and `ARCHITECTURE.md` per milestone (`local-indexing.mjs:648-657`).
const MEMORY_SOURCE_FILES = new Set(["ARCHITECTURE.md", "RETROSPECTIVE.md"]);

// The two halves of the resolution universe, built separately so the union can be
// taken — or deliberately NOT taken, which is the negative this gate measures.
async function resolutionUniverse(files) {
  const register = new Map();
  const document = new Map();
  const add = (map, item, id) => {
    if (!map.has(item)) map.set(item, new Set());
    map.get(item).add(id);
  };
  const documentForms = ID_FORMS.filter((form) => form.scope === "document").map((form) => ({
    split: headingSplitRe(form.name),
    head: headingCaptureRe(form.name),
  }));
  for (const file of files) {
    const item = itemOf(file);
    if (item == null) continue;
    const base = path.basename(file);
    const text = await readFile(file, "utf8");
    if (REGISTER_FILES.has(base)) for (const entry of registerDeclarations(text, base)) add(register, item, entry.id);
    // THE DOCUMENT HALF IS THE TWO FILES MEMORY ACTUALLY READS (`local-indexing.mjs`
    // `buildRecords`), not every markdown file that happens to carry a heading. ROUND
    // 3/1's union is "memory's WHOLE-DOCUMENT headings", and 66/02 will code
    // `register-dangling-citation` against this lane as its reference — so the
    // universe here has to be the one the ruling names. (Memory further scopes to
    // TOP-LEVEL milestone folders; this lane does not, which over-harvests a story's
    // own ARCHITECTURE.md. Stated rather than discovered — it can only make the
    // measured dangle count LOWER, never the register-only comparison weaker.)
    if (!MEMORY_SOURCE_FILES.has(base)) continue;
    for (const line of text.split(/\r?\n/)) {
      for (const form of documentForms) {
        if (!form.split.test(line)) continue;
        const head = line.match(form.head);
        if (head) add(document, item, head[1]);
      }
    }
  }
  return { register, document };
}

async function citations(files, re) {
  const out = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(re)) {
      out.push({ file, item: String(Number(match[1].split("/")[0])), ref: match[0], id: match[2] });
    }
  }
  return out;
}

let corpusCache = null;
async function corpus() {
  if (corpusCache == null) {
    const files = (await walkWork()).filter((file) => /\.(md|feature)$/i.test(file));
    corpusCache = { files, universe: await resolutionUniverse(files) };
  }
  return corpusCache;
}

// ─────────────────────────────────────────── the planted cases, as documents ──
//
// Each fixture is a REAL document shape: frontmatter, an opener, the planted line, and
// a companion positive. `probe` returns the declared ids, so a lane can assert both
// halves — the negative absent AND the positive present — in one call.
const doc = (...lines) => ["---", "doc: record", "---", "# A record", "", ...lines, ""].join("\n");
const CONTROL_ROW = "| **F-9001** | the companion positive, always found | open |";

export const archTests = [
  {
    name: "arch/FF-6603: the shipped grammar is SET-EQUAL to the ADR-001/ADR-008 literals — forms, scopes, separator, blocks, recogniser",
    run: () => {
      // (a) The id namespace is a closed set of FORMS, one entry per member, in order.
      assert.deepEqual(
        ID_FORMS.map((form) => ({ name: form.name, scope: form.scope, id: form.id })),
        ADR_ID_FORMS,
        "the closed set of forms is exactly ADR-008 ruling 1's — widening it is an ADR act, not a code change",
      );
      // `R<n>` CARRIES NO HYPHEN, asserted as the property rather than as a spelling:
      // the whole corpus writes the bare form, and a hyphenated pattern returns zero.
      assert.equal(headingSplitRe("R").test("## R1 — a lesson"), true, "the bare-`R` form is the one the corpus writes");
      assert.equal(headingSplitRe("R").test("## R-1 — a lesson"), false, "…and the hyphenated one is outside the namespace");
      // (b) EVERY form carries the separator class (ROUND 3/6) — not one shared const
      //     off to the side, because the re-home has to reach both literals per parser.
      for (const form of ID_FORMS) assert.equal(form.separator, ADR_SEPARATOR_CLASS, `${form.name} carries the separator class`);
      assert.match(headingCaptureRe("ADR").source, /\[:·—–-\]/, "…and the capture head is built with it");
      // (c) The register-block set, with each block's DECLARING/CITING kind.
      assert.deepEqual(
        REGISTER_BLOCKS.map((block) => ({ file: block.file, heading: block.heading, kind: block.kind })),
        ADR_REGISTER_BLOCKS,
        "ADR-001 §1's two openers over three files, with ADR-008 ruling 4's citing case",
      );
      // (d) The recogniser itself, character for character.
      assert.equal(DECLARATION.source, ADR_DECLARATION_SOURCE, "the DECLARATION recogniser is ADR-001 §2's frozen literal, with `<ID>` expanded over the closed set");
      // (e) The scope partition ROUND 3/1's union is taken over.
      assert.deepEqual(ID_FORMS.filter((f) => f.scope === "document").map((f) => f.name), ["ADR", "R"], "the two forms memory parses whole-document");
      assert.deepEqual(ID_FORMS.filter((f) => f.scope === "register").map((f) => f.name), ["FF", "F", "D"], "the three that declare only inside a register block");
    },
  },
  {
    name: "arch/FF-6603: FOUR POSITIVES — `## ADR-001:`, the bare-`R` heading, a table-cell FF row, and an `m52/ADR-007` ref",
    run: async () => {
      // 1 — `## ADR-001:` (colon; 343 ADR headings conform at HEAD).
      assert.equal(declaredIdOn("## ADR-001: The folder name is the index"), "ADR-001");
      assert.equal(headingSplitRe("ADR").test("## ADR-001: The folder name is the index"), true, "…and it is a WHOLE-DOCUMENT declaration, which is the union's other half");
      // 2 — `## R1 —`, the bare-`R` form (261 in the corpus, 0 hyphenated).
      assert.equal(declaredIdOn('## R1 — "Requiring-grep" fitness tests penalise the correct refactor'), "R1");
      assert.equal(headingSplitRe("R").test("## R1 — x"), true);
      // 3 — a table-cell FF row inside a DECLARING block.
      assert.deepEqual(
        registerDeclarations(doc("## Fitness functions", "", "| **FF-5201** | the loop registry is data | test/arch/x.test.mjs |"), "ARCHITECTURE.md").map((e) => e.id),
        ["FF-5201"],
      );
      // 4 — an `m52/ADR-007` ref, which must PARSE and must RESOLVE against the real
      //     tree. A grammar that parses a citation nothing can resolve is the scoping
      //     defect this gate exists to refuse.
      assert.deepEqual(qualifiedRefsIn("as m52/ADR-007 rules").map((c) => [c.item, c.id]), [["52", "ADR-007"]]);
      const { universe } = await corpus();
      const declared = new Set([...(universe.document.get("52") ?? []), ...(universe.register.get("52") ?? [])]);
      assert.ok(declared.has("ADR-007"), "m52/ADR-007 resolves against milestone 52's own documents");
    },
  },
  {
    name: "arch/FF-6603: SEVEN PLANTED NEGATIVES — each in a document that also carries a known positive, so `found nothing` is never the whole answer",
    run: async () => {
      const probe = (text, file) => registerDeclarations(text, file).map((entry) => entry.id);

      // 1 — a STATE heading naming an id (§5b false positive 1). A `STATE.md` holds no
      //     register block at all, so the companion positive is asserted by placing the
      //     SAME two lines in a VERIFICATION.md and finding both.
      const stateBody = ["## Findings", "", "### D-17 is now LIVE, and sharper than the ledger said", CONTROL_ROW];
      assert.deepEqual(probe(doc(...stateBody), "STATE.md"), [], "a register block exists only in its own register file");
      assert.deepEqual(probe(doc(...stateBody), "VERIFICATION.md"), ["F-9001"], "…and in the register file the companion positive IS found, while the STATE heading still is not");

      // 2 — `**Next free id is D-37.**` — inside the block, id not first. A reservation.
      assert.deepEqual(probe(doc("## Findings", "", "**Next free id is D-37.**", CONTROL_ROW), "VERIFICATION.md"), ["F-9001"]);

      // 3 — a bullet entry (26 in the corpus; the 33%-precision configuration).
      assert.deepEqual(probe(doc("## Findings", "", "- **F-1 — No delivered launch path serves the board same-origin…**", CONTROL_ROW), "VERIFICATION.md"), ["F-9001"]);

      // 4 — a cell holding id-plus-prose: the `### D-17` shape, in a table row.
      assert.deepEqual(probe(doc("## Findings", "", "| FF-1 and FF-2 are one guard | … |", CONTROL_ROW), "VERIFICATION.md"), ["F-9001"]);

      // 5 — a `## Fitness functions` heading INSIDE A FENCE (prospective; 0 at HEAD,
      //     and its trigger is 66/03's register-bodied template).
      assert.deepEqual(
        probe(doc("## Findings", "", CONTROL_ROW, "", "```markdown", "## Fitness functions", "", "| **FF-6603** | a quoted sample |", "```"), "VERIFICATION.md"),
        ["F-9001"],
        "a fenced opener opens nothing, so the row under it declares nothing — and the unfenced companion is still found",
      );

      // 6 — a dotted `F-05.1` (18 in the corpus, every one inside a `done` item).
      assert.deepEqual(probe(doc("## Findings", "", "| F-05.1 | Task 00's cell is arithmetically unreachable |", CONTROL_ROW), "VERIFICATION.md"), ["F-9001"]);

      // 7 — a row in a CITING block (ADR-008 ruling 4). It is an ENTRY, so 66/02 can
      //     resolve it; it is never a DECLARATION, so the id stays owned by the sibling
      //     ARCHITECTURE.md register.
      const citing = doc("## Fitness functions", "", "| **FF-6603** | probed | changed the separator class; got `0 lesson records` |");
      assert.deepEqual(probe(citing, "VERIFICATION.md"), [], "a citing block never declares");
      assert.deepEqual(registerEntries(citing, "VERIFICATION.md").map((e) => [e.id, e.kind]), [["FF-6603", "citing"]], "…and the row is not invisible either — it is an entry of kind `citing`");
      assert.deepEqual(probe(citing, "ARCHITECTURE.md"), ["FF-6603"], "the SAME bytes in the sibling architecture register DO declare — the file is the whole difference");

      // …and the HTML-comment rule (ROUND 3/11), whose trigger is already in the tree:
      // a multi-line `<!-- … -->` sits inside a register block in every shipped template
      // and in milestone 66's own fitness register.
      assert.deepEqual(
        probe(doc("## Fitness functions", "", "<!-- HARNESS: `{ name, run }`, registered", "| **FF-9999** | a commented placeholder row |", "     by its OWN story. -->", CONTROL_ROW), "ARCHITECTURE.md"),
        ["F-9001"],
        "a commented row declares nothing, and the live row beside it still does",
      );
      // The trigger, asserted rather than described: milestone 66's own register really
      // does carry a multi-line comment INSIDE the block, and its rows still declare.
      //
      // ASSERTED AS A SHAPE, NEVER AS A STORED LIST (66/01 review round 1). This
      // population has already moved TWICE inside this milestone — ADR-008 and ADR-009
      // were appended, and ROUND 3/5 dropped a baseline — so a stored `FF-6601…FF-6608`
      // would turn a 66/01 lane red inside 66/02's or 66/03's build the moment a third
      // closure ADR adds `FF-6609`. That is a cross-story coupling the partition does
      // not declare, and one FF-6607 already owns. The invariant is that the register's
      // OWN ROWS and the recogniser agree — not how many rows there are.
      const ownRegister = await readFile(path.join(workDir, "66_milestone_controls-that-run", "ARCHITECTURE.md"), "utf8");
      const own = registerDeclarations(ownRegister, "ARCHITECTURE.md").map((entry) => entry.id);
      assert.ok(own.length > 0, "this milestone's own register declares its controls, comment and all");
      for (const id of own) assert.match(id, /^FF-66\d\d$/, `${id} is one of this milestone's own id space`);
      // …and the set is exactly the ids its own rows carry, read independently of the
      // recogniser: every `| **FF-NNNN** |` first cell in the file.
      const byHand = [...ownRegister.matchAll(/^\|\s*\*\*(FF-66\d\d)\*\*\s*\|/gm)].map((m) => m[1]);
      assert.deepEqual(own, byHand, "the recogniser finds exactly the rows the register carries — no more, no fewer");
    },
  },
  {
    name: "arch/FF-6603: the opener normalises exactly one way, and the corpus says what that recovers and what it leaves out",
    run: async () => {
      const { files } = await corpus();
      const counts = { exact: 0, capitalised: 0, parenthetical: 0, story: 0 };
      for (const file of files) {
        const base = path.basename(file);
        if (!REGISTER_FILES.has(base)) continue;
        for (const line of (await readFile(file, "utf8")).split(/\r?\n/)) {
          const heading = /^##[ \t]+(.*)$/.exec(line);
          if (heading == null) continue;
          const raw = heading[1].trim();
          const normalised = normalizeOpener(raw);
          const frozen = REGISTER_BLOCKS.some((block) => block.file === base && block.heading === normalised);
          if (!frozen) {
            if (/^story\b.*\bfindings$/i.test(raw)) counts.story += 1;
            continue;
          }
          if (raw === "Fitness functions" || raw === "Findings") counts.exact += 1;
          else if (/\(.*\)\s*$/.test(raw)) counts.parenthetical += 1;
          else counts.capitalised += 1;
        }
      }
      // Non-vacuity floors, never frozen counts — the corpus grows every milestone.
      assert.ok(counts.exact > 50, `the exact openers dominate (${counts.exact} at HEAD; 38 + 45 = 83 measured 2026-08-15)`);
      assert.ok(counts.capitalised > 0, `case-insensitivity recovers real files (${counts.capitalised}; 2 measured)`);
      assert.ok(counts.parenthetical > 0, `the trailing parenthetical recovers real files (${counts.parenthetical}; 7 measured)`);
      assert.ok(counts.story > 0, `and \`## Story NN findings\` stays OUT (${counts.story}; 4 measured) — grandfathered, never renamed`);
      // NOTHING ELSE NORMALISES. Each of these is one edit away from the frozen opener
      // and each stays out, because a recogniser that guesses is the form-tolerant one
      // ADR-001 rejected at 33% precision.
      for (const opener of ["## Fitness function", "## The fitness functions", "## Findings and gaps", "## Findings:", "## Fitness functions (draft) extra"]) {
        assert.deepEqual(
          registerDeclarations(doc(opener, "", CONTROL_ROW), "ARCHITECTURE.md").concat(registerDeclarations(doc(opener, "", CONTROL_ROW), "VERIFICATION.md")),
          [],
          `${opener} is not a frozen opener`,
        );
      }
      assert.deepEqual(registerDeclarations(doc("## Fitness functions", "", CONTROL_ROW), "ARCHITECTURE.md").map((e) => e.id), ["F-9001"], "…while the frozen one is, so the lane above is not vacuous");
    },
  },
  {
    name: "arch/FF-6603: RESOLUTION IS AGAINST THE UNION — register-only makes essentially every qualified citation dangle (ROUND 3/1)",
    run: async () => {
      const { files, universe } = await corpus();
      const cited = await citations(files, QUALIFIED_REF);
      assert.ok(cited.length > 1000, `non-vacuity: the corpus really is full of qualified citations (${cited.length} pairs over ${files.length} files)`);

      const unresolved = (mode) =>
        cited.filter((citation) => {
          const register = universe.register.get(citation.item);
          const document = universe.document.get(citation.item);
          if (mode === "register") return !(register && register.has(citation.id));
          return !((register && register.has(citation.id)) || (document && document.has(citation.id)));
        }).length;

      const registerOnly = unresolved("register");
      const union = unresolved("union");
      // THE RULING, as a property rather than a count. Measured 2026-08-15: 2,355 of 2,365 dangle
      // register-only (99.6%); 28 dangle under the union (1.2%). Re-measured 2026-09-07 over a
      // corpus grown to 3,802 citations: 3,376 dangle register-only (88.8%).
      //
      // THE FLOOR IS 0.75, NOT 0.9, AND THE DRIFT IS THE REASON. This lane's own sibling two legs
      // up says it in as many words — "non-vacuity floors, never frozen counts — the corpus grows
      // every milestone" — and 0.9 was that mistake: a threshold set flush against one day's
      // measurement, which reds on a corpus that grew rather than on a rule that broke. The ratio
      // falls as later milestones declare more of their ADRs in register blocks, which is the
      // house getting BETTER at the thing this leg says register-only cannot carry alone.
      //
      // Nothing is weakened, because this is not where the claim's weight sits. "Essentially every
      // citation dangles" is the qualitative half; the load-bearing half is the COMPARISON two
      // assertions down — the union must be an order of magnitude better — and that one is a ratio
      // between the two modes, so it cannot drift with the corpus at all.
      assert.ok(
        registerOnly / cited.length > 0.75,
        `resolving ADR/R against register blocks only makes essentially EVERY qualified citation dangle (${registerOnly}/${cited.length}) — it is not a stricter check, it is a broken one`,
      );
      assert.ok(
        union / cited.length < 0.1,
        `…and the union resolves them (${union}/${cited.length} unresolved) — register-block declarations for FF/F/D, whole-document headings for ADR/R`,
      );
      assert.ok(union < registerOnly / 10, `the union is an order-of-magnitude improvement, not a nudge (${union} vs ${registerOnly})`);
      // Non-vacuity on the instrument itself: BOTH halves of the universe are populated,
      // so "the union resolves everything" cannot be an artifact of one empty half.
      assert.ok(universe.document.size > 30, `the whole-document half is populated (${universe.document.size} items)`);
      assert.ok(universe.register.size > 0, `the register half is populated (${universe.register.size} items)`);
    },
  },
  {
    name: "arch/FF-6603: the qualified-ref grammar takes the `(?<![-\\w.])` lookbehind — hyphen AND dot — or it mis-reads the house's own id pairs and clause pointers (ROUND 3/2)",
    run: async () => {
      // THE BEHAVIOURAL CLAIM FIRST, so a grammar that loses the lookbehind fails with
      // the DEFECT rather than with a complaint about this lane's own instrument.
      assert.deepEqual(qualifiedRefsIn("ADR-001/ADR-008 supersedes it"), [], "`ADR-001/ADR-008` is one ADR superseding another, not a citation of item `001`");
      assert.deepEqual(qualifiedRefsIn("F-1/F-2 are one guard"), [], "`F-1/F-2` is a pair of findings, not a citation of item `1`");
      // …AND THE DOT, which is the same class with `.` in place of the hyphen: in this
      // corpus `.` is an ID-CONTINUATION character, so a hyphen-only lookbehind lets a
      // CLAUSE POINTER's own digits start an item ref (66/01 review round 2).
      assert.deepEqual(qualifiedRefsIn("ADR-010 R4.1/R4.3"), [], "`R4.1/R4.3` is a pair of lesson clauses — reading `1/R4` cites a milestone the text never names");
      assert.deepEqual(
        qualifiedRefsIn("see 43/02/R4.4/R4.5 for both").map((c) => [c.item, c.id]),
        [["43/02", "R4"]],
        "a slash-chained clause pointer yields ONE citation, not a real one plus a fabricated `4/R4`",
      );
      assert.ok(
        QUALIFIED_REF.source.startsWith("(?<![-\\w.])"),
        `the qualified-ref grammar opens with the \`(?<![-\\w.])\` lookbehind (ROUND 3/2, extended to the dot at review round 2) — without the hyphen, 186 slash-joined id pairs are read as citations of items that do not exist; without the DOT, 7 more are fabricated out of clause pointers; source: ${QUALIFIED_REF.source}`,
      );
      const { files, universe } = await corpus();
      // The same grammar WITHOUT the lookbehind — the shape ADR-009/D's measurement was
      // taken with, and the reason two of its "authoring noise" examples were artifacts.
      //
      // THE `notEqual` BELOW IS NOT CEREMONY. A `String.replace` whose search string
      // does not occur is a SILENT NO-OP that compares a regex against itself and
      // reports "no difference" — that is exactly how the round-1 review measured this
      // guard as dropping zero, and how my own first probe of it printed a false empty.
      // Every counterpart in this file is built through a checked replace.
      const LOOKBEHIND = "(?<![-\\w.])";
      assert.ok(QUALIFIED_REF.source.includes(LOOKBEHIND), "the search string occurs in the shipped source — a no-op replace would compare the grammar with itself");
      const withoutLookbehind = new RegExp(QUALIFIED_REF.source.replace(LOOKBEHIND, ""), "g");
      assert.notEqual(withoutLookbehind.source, QUALIFIED_REF.source, "non-vacuity: the lookbehind really was removed for the comparison");

      const withIt = await citations(files, QUALIFIED_REF);
      const withoutIt = await citations(files, withoutLookbehind);
      const key = (c) => `${c.file}|${c.ref}|${c.id}`;
      const kept = new Set(withIt.map(key));
      const artifacts = withoutIt.filter((c) => !kept.has(key(c)));
      assert.ok(artifacts.length > 50, `the lookbehind drops real artifacts (${artifacts.length}; 186 measured at HEAD)`);

      // EVERY dropped pair is a slash-joined id pair, never a real citation: the
      // character before the item ref is a hyphen or a word character.
      for (const artifact of artifacts.slice(0, 200)) {
        assert.match(artifact.ref, /^\d/, `an artifact is read as a bare item ref: ${artifact.ref}/${artifact.id}`);
      }
      // …and the un-guarded grammar DOES mis-read both of the shapes asserted above.
      assert.deepEqual(withoutLookbehind.test("ADR-001/ADR-008"), true, "the un-guarded grammar reads `ADR-001/ADR-008` as a citation");

      // THE DOT GUARD, FALSIFIED (66/01 review round 1 — it shipped as an assertion
      // nobody had ever seen fail, and asking it to fail found it wrong). ADR-008
      // ruling 6 keeps `.` outside the namespace because `F-05` and `F-05.1` have a
      // relationship no check can know, so `52/F-05.1` must cite NOTHING rather than
      // cite `F-05`. The pair below is what proves the guard NARROW rather than a
      // blanket dot-ban.
      assert.deepEqual(qualifiedRefsIn("see 52/F-05.1"), [], "a dotted id cites nothing — ADR-008 ruling 6 on the citing side");
      assert.deepEqual(
        qualifiedRefsIn("as 52/ADR-007.").map((c) => [c.item, c.id]),
        [["52", "ADR-007"]],
        "…while a full stop ending a sentence is punctuation, not a dotted id — `(?!\\.\\w)` would have wrongly dropped `52/ADR-007.md` too",
      );
      // …AND THE GUARD RIDES THE REGISTER-SCOPED BRANCHES ONLY, which is what the
      // falsification found. A blanket `(?!\.\d)` over all five forms drops 34 dotted
      // qualified refs in this corpus and only ONE is ruling 6's population: the other
      // 33 are CLAUSE POINTERS (30 `ADR`, 3 `R`) whose base id really is declared, so
      // banning them would MANUFACTURE dangling citations — the defect 66/02 reports.
      assert.deepEqual(qualifiedRefsIn("see 27/ADR-006.4 charters").map((c) => [c.item, c.id]), [["27", "ADR-006"]], "an ADR clause pointer still cites its ADR");
      assert.deepEqual(qualifiedRefsIn("see 34/R3.2").map((c) => [c.item, c.id]), [["34", "R3"]], "…and a lesson clause pointer still cites its lesson");
      assert.deepEqual(qualifiedRefsIn("see 38/F-38.05"), [], "…while ruling 6's own measured population still cites nothing");
      // The population, measured rather than asserted: every dotted qualified ref in
      // the corpus whose form is DOCUMENT-scoped must still resolve to its base id.
      const clausePointers = [];
      for (const file of files) {
        const text = await readFile(file, "utf8");
        for (const match of text.matchAll(/(?<![-\w])m?\d{1,4}(?:\/\d{1,3})*\/((?:ADR-|R)\d+)\.\d/g)) clausePointers.push(match[1]);
      }
      assert.ok(clausePointers.length > 10, `non-vacuity: the corpus really writes clause pointers (${clausePointers.length})`);
      for (const id of new Set(clausePointers)) {
        assert.ok(
          [...universe.document.values()].some((ids) => ids.has(id)),
          `${id} is cited with a clause pointer and really is declared — dropping it would invent a dangling citation`,
        );
      }
      // The artifacts were also DANGLING, which is how they reached ADR-009/D's noise
      // column: dropping them strictly improves resolution.
      const unresolvedIn = (list) =>
        list.filter((c) => {
          const register = universe.register.get(c.item);
          const document = universe.document.get(c.item);
          return !((register && register.has(c.id)) || (document && document.has(c.id)));
        }).length;
      assert.ok(
        unresolvedIn(withIt) < unresolvedIn(withoutIt),
        `the lookbehind strictly reduces the unresolved set (${unresolvedIn(withIt)} vs ${unresolvedIn(withoutIt)}) — 28 vs 111 at HEAD`,
      );

      // THE DOT, MEASURED OVER THE CORPUS. Dropping it from the class (leaving ROUND
      // 3/2's original hyphen-only form) FABRICATES citations out of clause pointers,
      // and the shipped ref set is a strict SUBSET of the hyphen-only one — so the
      // character costs nothing and every difference is an invention.
      const hyphenOnly = new RegExp(QUALIFIED_REF.source.replace(LOOKBEHIND, "(?<![-\\w])"), "g");
      assert.notEqual(hyphenOnly.source, QUALIFIED_REF.source, "non-vacuity: the dot really was removed for the comparison");
      const loose = await citations(files, hyphenOnly);
      const kept2 = new Map();
      for (const citation of withIt) kept2.set(key(citation), (kept2.get(key(citation)) ?? 0) + 1);
      const fabricated = [];
      for (const citation of loose) {
        const seen = kept2.get(key(citation)) ?? 0;
        if (seen === 0) fabricated.push(citation);
        else kept2.set(key(citation), seen - 1);
      }
      assert.ok(fabricated.length > 0, `non-vacuity: the hyphen-only form really does fabricate refs here (${fabricated.length}; 7 at HEAD)`);
      assert.equal(loose.length - withIt.length, fabricated.length, "the shipped ref set is a strict SUBSET — the dot drops no legitimate ref, it only refuses inventions");
      // Every fabricated ref is a clause pointer's own digits read as an item — the
      // character before it in the source text is a dot.
      for (const citation of fabricated) {
        const text = await readFile(citation.file, "utf8");
        const at = text.indexOf(citation.ref);
        assert.equal(text[at - 1], ".", `${citation.ref} was fabricated from a clause pointer in ${path.relative(workDir, citation.file)}`);
      }
    },
  },
  {
    name: "arch/FF-6603: the first token IS the id — a suffixed id followed by prose is REFUSED, never truncated (review round 1)",
    run: async () => {
      // THE DEFECT, in the four shapes it was measured in. Without the run-on guard the
      // engine backtracks into the id until a hyphen INSIDE it serves as the separator.
      for (const [line, truncated] of [
        ["| **F-49-VER-b** (GAP-6) | design-gap (FIXED) | …", "F-49-VER"],
        ["| **F-47-V-1** Back/Forward | URL walked, page did not |", "F-47-V"],
        ["| F-45-01-D (= architect blocker) | suite read source |", "F-45-01"],
        ["### F-47-V-9 is closed, and both passes found things", "F-47-V"],
      ]) {
        assert.equal(declaredIdOn(line), null, `prose after the id with no separator is a CITATION, not a declaration of \`${truncated}\`: ${line}`);
        // …and the truncated answer really was reachable, so this lane is not asserting
        // the absence of something that never happened.
        const unguarded = new RegExp(ADR_DECLARATION_SOURCE.replace(ADR_RUN_ON_GUARD, ""));
        assert.equal(unguarded.exec(line)?.[1], truncated, `the un-guarded grammar truncated it to \`${truncated}\``);
      }
      // THE TWO CONSEQUENCES, both this milestone's own failure mode. `F-49-VER`
      // declared four times in ONE register file is a false `register-duplicate-id`;
      // `-b/-d/-e/-f` declared nowhere makes every citation of them dangle.
      const m49 = await readFile(path.join(workDir, "49_milestone_terminals-home", "VERIFICATION.md"), "utf8");
      const declared = registerDeclarations(m49, "VERIFICATION.md").map((entry) => entry.id);
      assert.equal(declared.filter((id) => id === "F-49-VER").length, 0, "the truncated id is declared zero times, not four");
      const duplicated = declared.filter((id, index) => declared.indexOf(id) !== index);
      assert.deepEqual(duplicated, [], `no id is declared twice in one register file; duplicates: ${JSON.stringify(duplicated)}`);
      assert.ok(declared.length > 0, "non-vacuity: m49's register still declares its rows");
      // AND THE GUARD COSTS THE CONTRACT NOTHING — every id-bearing positive this
      // story's features enumerate still declares, suffixes and all.
      for (const [line, id] of [
        ["### F-47-V-1 — Back/Forward does not re-narrow: the address moves", "F-47-V-1"],
        ["### F-47-V-3 - a hyphen separator", "F-47-V-3"],
        ["### F-3-bis", "F-3-bis"],
        ["| **F-2701** | KR3 soak (task 06) ran single-OS … |", "F-2701"],
        ["| **FF-5201 · The loop registry never enters the item vocabulary.** |", "FF-5201"],
      ]) {
        assert.equal(declaredIdOn(line), id, `the guard leaves a properly separated suffixed id alone: ${line}`);
      }
    },
  },
  {
    name: "arch/FF-6603: the BLOCK WALK honours `ID_FORMS[].scope` — a document-scoped id inside a block is not declared twice (review round 1)",
    run: async () => {
      // ROUND 3/1's union puts every `registerDeclarations` id into the register half
      // and every `ADR`/`R` heading into the document half. So an `ADR`/`R` id that
      // lands inside a frozen block would be declared in BOTH, and 66/02 would see a
      // false duplicate. The block walk therefore alternates over the register-scoped
      // forms only — while the LINE MATCHER keeps all five, because feature 00's second
      // Outline requires `## ADR-001:` to answer "declaration".
      const block = doc("## Findings", "", "### R1 — a lesson heading inside a register block", "### ADR-012 · an adr heading inside one", CONTROL_ROW);
      assert.deepEqual(registerDeclarations(block, "VERIFICATION.md").map((e) => e.id), ["F-9001"], "neither document-scoped id is declared by the register half");
      // …and the line matcher still answers with them, which is the split's whole point.
      assert.equal(declaredIdOn("### R1 — a lesson heading inside a register block"), "R1");
      assert.equal(declaredIdOn("### ADR-012 · an adr heading inside one"), "ADR-012");
      // The two recognisers are the SAME shape over different form sets — one spelling,
      // not two (the debt this module exists to close).
      assert.equal(DECLARATION.source, ADR_DECLARATION_SOURCE);
      const registerOnly = new RegExp(ADR_REGISTER_DECLARATION_SOURCE);
      assert.equal(registerOnly.exec("| **F-9001** | x |")?.[1], "F-9001");
      assert.equal(registerOnly.exec("### R1 — a lesson")?.[1], undefined, "the register recogniser does not alternate over the document forms");
      // MEASURED: 0 such lines in the corpus today, so this is prospective — and the
      // first one to land is the one that would have been silently double-declared.
      const { files } = await corpus();
      let inBlock = 0;
      for (const file of files) {
        const base = path.basename(file);
        if (!REGISTER_FILES.has(base)) continue;
        for (const entry of registerEntries(await readFile(file, "utf8"), base)) {
          if (/^(?:ADR-|R\d)/.test(entry.id)) inBlock += 1;
        }
      }
      assert.equal(inBlock, 0, "0 document-scoped ids sit inside a register block at HEAD — the rule is prospective, and its trigger is named");
    },
  },
  {
    name: "arch/FF-6603: NON-VACUITY — a planted form-tolerant recogniser is detected, and the shipped one is not tolerant",
    run: () => {
      // The rejected alternative, built here so the gate can show what it is refusing:
      // heading OR bullet OR bold prose. This is the 33%-precision configuration the
      // finding measured, and every one of the four measured false positives passes it.
      const tolerant = /(?:#{1,6}\s+|[-*]\s+|\s*)\*{0,2}((?:FF|F|D|R|ADR)-?\d[\w.-]*)/;
      const FALSE_POSITIVES = [
        "### D-17 is now LIVE, and sharper than the ledger said",
        "**Next free id is D-37.**",
        "- **F-1 — No delivered launch path serves the board same-origin…**",
        "| F-05.1 | arithmetically unreachable |",
      ];
      for (const line of FALSE_POSITIVES) {
        assert.match(line, tolerant, `the tolerant recogniser accepts ${line} — which is the defect`);
        assert.equal(declaredIdOn(line), null, `…and the shipped one refuses it: ${line}`);
      }
      // …while the shipped one still accepts every measured TRUE positive, so "refuses
      // everything" is not how it passes.
      for (const [line, id] of [
        ["| F-2 | Same shape |", "F-2"],
        ["| **F-2701** | KR3 soak |", "F-2701"],
        ["### F-47-V-1 — Back/Forward does not re-narrow", "F-47-V-1"],
        ["## ADR-001: The folder name is the index", "ADR-001"],
        ["## R1 — a lesson", "R1"],
      ]) {
        assert.equal(declaredIdOn(line), id, line);
      }
    },
  },
];
