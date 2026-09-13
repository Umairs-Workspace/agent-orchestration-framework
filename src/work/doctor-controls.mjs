// work:doctor — milestone 66 / story 02: THE CONTROLS LANE. Three pure
// `(snapshot, ctx) => Finding[]` check-groups — register, verification, control —
// appended to `CHECK_GROUPS` as ONE entry (ADR-003 §2/§3). Doctor's lane count goes
// 4 → 5 AS 66 COUNTED IT — the roster's true count that day was 6, because 54/04's
// `work-doctor-rubric.mjs` already existed. 66's fold-the-family ratchet ("the SIXTH folds
// the family into `src/work-doctor/`") is SUPERSEDED, priced: `wiki/work/TECH_DEBT.md`
// item 10, chore 106. The family stays flat, and its growth is governed by FF-5905's NAMED
// roster (`test/arch/audit/acd-controls-never-execute.test.mjs`) rather than by its placement.
//
// ─────────────────────────────────────────────────────────────────────────────
// THIS MODULE IS A TRUE LEAF, AND THE DEPENDENCY DIRECTION IS INVERTED ON PURPOSE
// (66/ARCHITECTURE ROUND 3/3, FF-6605).
//
// Both existing lanes import the spine (`work-doctor-coherence.mjs:17`,
// `work-doctor-freshness.mjs:19`) and the spine imports `node:fs/promises` — so
// following the house idiom would put `node:fs` one hop away and fail FF-6605 on
// arrival. This lane therefore takes item identity from the SNAPSHOT ROWS rather than
// importing `ITEM_RE`/`isDriver`, and **`work-doctor.mjs` imports THIS module** — it
// calls the pure extractors below to learn which paths to probe and which files are
// control-shaped. There is no edge back.
//
// The only direct imports admitted are `node:path` (join/basename only — never
// `path.resolve`, which reads `process.cwd()` and would make a group impure) and the
// milestone's two zero-import leaves, `./acceptance-horizon.mjs` (66/00) and
// `./declared-id.mjs` (66/01).
//
// ACD NEVER EXECUTES ANYTHING, AND IT IS HELD STRUCTURALLY (ADR-004 §2). Leg A is a
// `stat` taken by the spine; leg B is a text read taken by the spine. Nothing here
// spawns, nothing here `import()`s a cited module (importing runs its module scope,
// which is ACD running a project's test code), nothing here reads a clock. All I/O
// stays at the snapshot boundary, which is what lets every group below be driven from
// a literal in-memory snapshot with no filesystem at all.
//
// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY IS NOT PER-CODE, WITH ONE EXCEPTION (ADR-002, ADR-003 §5). It is the
// acceptance horizon's predicate applied to the OWNING ITEM's own status (ADR-009/F):
// inside the horizon `error`, outside `warn`. `control-runner-unchecked` is always
// `warn`, because it reports that a leg DID NOT RUN rather than a violation to be
// graded. `control-unresolved` under a `pending` marker is downgraded to `warn`
// inside the horizon — that is ACD's `xfail` (ADR-004 §3).
//
// THE BLOCK WALK, NEVER `declaredIdOn` (66/01 F-31, routed here as a contract line).
// `declaredIdOn` and `registerEntries` DELIBERATELY DISAGREE for document-scoped
// forms: `## ADR-001:` and `### R1 —` are declarations to the line matcher and are
// NOT register declarations to the block walk, because an `ADR`/`R` heading is a
// WHOLE-DOCUMENT declaration already counted in the union's other half (ROUND 3/1) and
// declaring it twice would manufacture a false `register-duplicate-id`. The export
// names do not say so, so every call site below says which it means: this lane uses
// the BLOCK WALK exclusively and imports `declaredIdOn` not at all.
import path from "node:path";
import { severityFor } from "../acceptance-horizon.mjs";
import {
  ID_FORMS,
  headingCaptureRe,
  headingSplitRe,
  qualifiedRefsIn,
  registerBlockKind,
  registerDeclarations,
  registerEntries,
} from "../declared-id.mjs";

// ─────────────────────────────────────────────────────────── the frozen envelope ──

// THE EIGHT CODES ARE A CONSUMED CONTRACT the moment this lands (ADR-003 §5). Adding
// a ninth is an ADR-level act, not an edit to a call site — `acd-controls-finding-envelope`
// asserts set-equality against this array AND that every one of the eight is reachable
// by a fixture, because an unreachable code is as much a defect as an unfrozen one.
export const CONTROL_FINDING_CODES = Object.freeze([
  "register-duplicate-id",
  "register-dangling-citation",
  "verification-register-missing",
  "verification-missing-red-probe",
  "control-unresolved",
  "control-unregistered",
  "control-runner-unchecked",
  "staged-control",
]);

// The red-probe placeholder, frozen in ADR-009/H rather than bought with a `depends`
// edge on 66/03 — freezing a literal in an ADR is the instrument ADR-001 §2 already
// uses for the grammar, and it keeps 66/03 dependency-free.
//
// "ONE HOME" IS UNENFORCEABLE FROM HERE, AND SAYING SO IS THE POINT. 66/03's shipped
// `VERIFICATION.md` template is MARKDOWN: it cannot import this constant, so the two
// literals are physically separate and the only thing that can hold them equal is an
// assertion that reads both. That assertion is **FF-6608**
// (`test/arch/work/acd-verification-template-shape.test.mjs`, 66/03), which must compare the
// template's red-probe cell BYTE-FOR-BYTE against this export. Without it the two
// drift silently and the check passes a template it was meant to report — the exact
// shape of a control that is green for the wrong reason. Stated here rather than
// assumed, because 66/02 cannot enforce it and 66/03 is the story that can.
export const RED_PROBE_PLACEHOLDER = "<what was changed to make it fail, and the message observed>";

// The project-declared key leg B reads. Named here so the honest-no-op finding can
// tell an operator exactly what to set (`roadmap-folder-mismatch`'s idiom verbatim —
// `src/work/doctor-freshness.mjs:9-11`).
export const RUNNERS_CONFIG_KEY = "work.controls.runners";

// ───────────────────────────────────────────────── what a CONTROL PATH looks like ──

// "A FILE A RUNNER CAN SEE" HAS ONE SPELLING, and both the staging prohibition
// (ADR-004 §4, `*.test.*`/`*.spec.*` under `<work.dir>/**`) and the control-citation
// recogniser read it from here. One predicate, because they are the same question
// asked from two directions: leg B asserts a runner names the cited file's basename,
// and only a test-shaped name ever appears in a runner.
const CONTROL_FILE_NAME = /\.(?:test|spec)\.[A-Za-z0-9]+$/;

export function isControlFileName(name) {
  return CONTROL_FILE_NAME.test(String(name ?? ""));
}

// A path-shaped token, requiring at least one directory component. MEASURED with the
// shipped extractor over every `## Fitness functions` register in `wiki/work` on
// 2026-08-16: 49 `ARCHITECTURE.md` files, of which 4 carry ids at all (m37, m52, m53,
// m66) for 37 declarations — the rest declare invariants with no id column, and so
// declare nothing and are compliant by construction (ADR-001 §6). Those 37 cells hold
// 56 path-shaped tokens, of which 38 are TEST-SHAPED. The 18 that are not are PROSE —
// `src/cli.mjs`, `src/commands/migrate-folder.mjs:225-229`,
// `wiki/work/02_milestone_planning-init/UAT.md:68` — modules the guard READS, never the
// guard itself. Reading them as control citations puts a permanent false
// `control-unresolved` on `52/FF-5202` (whose cell says `./work.mjs`, prose) and would
// make leg B ask a runner to name `UAT.md`.
const CITED_PATH = /(?:[A-Za-z0-9_@.*-]+\/)+[A-Za-z0-9_@.*-]+\.[A-Za-z0-9]+(?:#L\d+(?:-L?\d+)?|:\d+(?:-\d+)?)?/g;

// A markdown line anchor (`x.test.mjs#L241`) or a line suffix (`x.test.mjs:151`) is a
// READING AID, dropped before the probe. Measured in enforced-by cells today: 0 `#L`
// anchors, 10 `:line` suffixes.
const LOCATOR_SUFFIX = /(?:#L\d+(?:-L?\d+)?|:\d+(?:-\d+)?)$/;

// The cited path as leg A will probe it: locator dropped, and a path written relative
// to the register (`../../../test/arch/x.test.mjs`) reduced to its repo-relative form.
export function normalizeCitedPath(cited) {
  return String(cited ?? "")
    .replace(LOCATOR_SUFFIX, "")
    .replace(/^(?:\.\.\/)+/, "")
    .replace(/^\.\//, "");
}

// Every path-shaped citation, before the control-file predicate is applied. The
// locator is deliberately retained: provenance needs to prove the cited line is on
// disk, while the control lane only needs the file a runner can see.
export function pathCitationsIn(cell) {
  const found = [];
  for (const match of String(cell ?? "").matchAll(CITED_PATH)) {
    if (match[0].includes("*")) continue;
    if (!found.includes(match[0])) found.push(match[0]);
  }
  return found;
}

// Split without publishing the stateful, global locator grammar. For a range the
// last number is the existence boundary: `file:2-9` resolves only when line 9 does.
export function splitPathLocator(cited) {
  const raw = String(cited ?? "");
  const locator = raw.match(LOCATOR_SUFFIX)?.[0] ?? null;
  const numbers = locator?.match(/\d+/g) ?? [];
  return {
    path: normalizeCitedPath(raw),
    line: numbers.length === 0 ? null : Number.parseInt(numbers[numbers.length - 1], 10),
  };
}

// Every CONTROL citation in one cell, de-duplicated, in source order.
//
//   • a family reference containing a wildcard (`test/arch/acd-notion-*.test.mjs`) is
//     NOT a control citation — it names a set, and leg A probes a file;
//   • a truncated prefix in prose (`test/arch/acd-`) carries no extension, so it is
//     not a path at all;
//   • two paths in one cell are two citations, and the declaration resolves only when
//     BOTH do (ADR-009/J) — FF-6607 is that case today.
export function controlPathsIn(cell) {
  const found = [];
  for (const cited of pathCitationsIn(cell)) {
    const rel = normalizeCitedPath(cited);
    if (!isControlFileName(rel)) continue;
    if (!found.includes(rel)) found.push(rel);
  }
  return found;
}

// ──────────────────────────────────────────────────────── markdown table cutting ──

// An HTML comment span on a declaration's own line. The block walk in
// `declared-id.mjs` already refuses any line inside a MULTI-LINE `<!-- … -->`, so the
// only residual case is an inline span on a row that does declare. Measured: 0 today.
const INLINE_COMMENT = /<!--[\s\S]*?-->/g;

// Cells of a markdown table row, or null when the line is not one. Split on an
// UNESCAPED pipe — the house writes `\|` inside a cell to talk about table syntax
// (ADR-001 §1's own table does), and splitting on it would shear the row.
function tableCells(line) {
  const stripped = String(line ?? "").replace(INLINE_COMMENT, "");
  const trimmed = stripped.trim();
  if (!trimmed.startsWith("|")) return null;
  const parts = trimmed.split(/(?<!\\)\|/);
  parts.shift();
  if (parts.length > 0 && parts[parts.length - 1].trim() === "") parts.pop();
  return parts;
}

const isSeparatorRow = (cells) => cells.length > 0 && cells.every((cell) => /^\s*:?-{2,}:?\s*$/.test(cell));

// THE HEADER OF THE TABLE THIS ROW BELONGS TO — cut on the language's own structure
// (the run of table rows above it) rather than by re-walking the register block or by
// a fixed character window. Returns null when nothing above the row is a header.
//
// This is what makes "a path in a cell of any column other than enforced-by is not a
// control citation" decidable, and the scoping is LOAD-BEARING rather than tidy:
// measured with the shipped extractor, 2 of the 37 declarations in this tree carry a
// test-shaped path in some OTHER column — `53/FF-5311` (`test/work/doctor-command-core.test.mjs`)
// and `53/FF-5312` (`test/loop/work-loops-registry-census.test.mjs`,
// `test/arch/loop/acd-loop-records-parse.test.mjs`) — so a whole-row scan would probe, and
// demand a runner for, three files those declarations never enforced with.
//
// A BLANK LINE IS SKIPPED, AND THAT IS A MEASURED CASE RATHER THAN A KINDNESS: a stray
// blank line inside a register block splits the markdown table, and milestone 66's own
// `VERIFICATION.md` has one (`:121`, between the FF-6602 and FF-6603 rows). The block
// walk in `declared-id.mjs` reads all four rows as entries because ADR-001's unit is
// the register BLOCK, not the table — so a header lookup that stopped at the blank
// would report two of this milestone's own recorded red probes as "no red-probe
// column", which is a defect in the instrument, not in the register. The walk still
// stops at any other non-table line (an h2, a rule, prose, a comment's tail), so it
// cannot wander into a different table's header past intervening text.
function headerCellsAbove(lines, lineNumber) {
  let header = null;
  for (let index = lineNumber - 2; index >= 0; index -= 1) {
    const raw = String(lines[index] ?? "");
    if (raw.trim() === "") continue;
    const cells = tableCells(raw);
    if (cells == null) break;
    if (isSeparatorRow(cells)) continue;
    header = cells;
  }
  return header;
}

const columnIndex = (header, pattern) => (header == null ? -1 : header.findIndex((cell) => pattern.test(cell)));

const ENFORCED_BY_COLUMN = /enforced/i;
const RED_PROBE_COLUMN = /red[\s_-]*probe/i;

// `pending` IS A TOKEN IN THE DECLARATION'S OWN ENTRY, NOT A POSITION IN IT
// (ADR-009/B). ADR-004 §3's "after the cited path" was written for the bullet shape;
// a table row carries the same token in ANY cell of its own row — one rule, one
// meaning, two carriers. The ENTRY is the declaration's own block-level line: measured,
// 37 of 37 fitness declarations in this tree are table rows, and a markdown table row
// is exactly one line. A neighbouring row's token is not this declaration's.
const PENDING_TOKEN = /(?<![A-Za-z])pending(?![A-Za-z])/i;

// ───────────────────────────────────────────────────── reading a fitness register ──

// Every DECLARATION in a document's `## Fitness functions` register, with the three
// facts the control lane needs: the enforced-by cell, the control paths cited in it,
// and whether the entry carries the pending token.
//
// The declaration set comes from the BLOCK WALK (`registerDeclarations`), so the whole
// of ADR-001 §2 + ADR-008 + ADR-010 — id-first, the run-on guard, fences and HTML
// comments inert, the citing/declaring split — is the one home's answer, never
// re-derived here.
export function fitnessDeclarations(text, file = "ARCHITECTURE.md") {
  const lines = String(text ?? "").split(/\r?\n/);
  return registerDeclarations(text, file).map((declaration) => {
    const entry = String(lines[declaration.line - 1] ?? "").replace(INLINE_COMMENT, "");
    const cells = tableCells(lines[declaration.line - 1]);
    const index = cells == null ? -1 : columnIndex(headerCellsAbove(lines, declaration.line), ENFORCED_BY_COLUMN);
    // `null` (no enforced-by column at all) is distinguished from `""` (the column
    // exists and is empty): a register that never adopted the convention declares no
    // control obligation — ADR-001 §6, "it acquires obligations only when it acquires
    // ids", applied one convention further out. Measured: 0 such registers today, so
    // this is prospective and its trigger is 66/03's template.
    const enforcedBy = cells != null && index >= 0 ? String(cells[index] ?? "") : null;
    return {
      id: declaration.id,
      line: declaration.line,
      entry,
      enforcedBy,
      controls: enforcedBy == null ? [] : controlPathsIn(enforcedBy),
      pending: PENDING_TOKEN.test(entry),
    };
  });
}

// Every CONTROL PATH cited by a document's fitness register — the pure extractor
// `work-doctor.mjs` imports to learn which paths to probe (ROUND 3/3, the inverted
// dependency). Repo-relative, de-duplicated, locators already dropped.
export function citedControlPathsIn(text, file = "ARCHITECTURE.md") {
  const out = [];
  for (const declaration of fitnessDeclarations(text, file)) {
    for (const control of declaration.controls) if (!out.includes(control)) out.push(control);
  }
  return out;
}

// The kinds of register block a document OPENS (ADR-008 ruling 4). Needed for exactly
// one question the entry list cannot answer: does a `## Fitness functions` register
// exist in this `VERIFICATION.md` at all, or is the document missing it? A register
// carrying zero rows yields zero entries and is indistinguishable from an absent one.
//
// The DECISION stays in the one home — `registerBlockKind` is what says which block an
// h2 opens in which file. Only the line iteration and the fence skip are here.
function openBlockKinds(text, file) {
  const kinds = new Set();
  let inFence = false;
  for (const line of String(text ?? "").split(/\r?\n/)) {
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const kind = registerBlockKind(line, file);
    if (kind != null) kinds.add(kind);
  }
  return kinds;
}

// The RED-PROBE register (ADR-005 §1): `id | enforced by | result | red probe`, in the
// item's `VERIFICATION.md`, CITING the sibling `ARCHITECTURE.md` declarations. Returns
// the first row per id — a duplicate row is `register-duplicate-id`'s business, not
// this one's.
export function redProbeRows(text, file = "VERIFICATION.md") {
  const lines = String(text ?? "").split(/\r?\n/);
  const rows = new Map();
  for (const entry of registerEntries(text, file)) {
    if (entry.kind !== "citing") continue;
    if (rows.has(entry.id)) continue;
    const cells = tableCells(lines[entry.line - 1]);
    const index = cells == null ? -1 : columnIndex(headerCellsAbove(lines, entry.line), RED_PROBE_COLUMN);
    rows.set(entry.id, { line: entry.line, probe: cells != null && index >= 0 ? String(cells[index] ?? "") : null });
  }
  return rows;
}

// SHAPE, NEVER CONTENT (ADR-005 §3) — the trick `duplicate-driver-number` already
// plays. A probe cell records an observation when it is present, carries something
// other than whitespace, and is not the frozen placeholder ALONE. The placeholder
// QUOTED INSIDE a recorded observation is an observation; a single hyphen is one too.
// No natural-language judgment of whether the message is plausible is made or implied.
export function recordsARedProbe(cell) {
  if (cell == null) return false;
  const trimmed = String(cell).trim();
  if (trimmed === "") return false;
  // A cell may wrap the placeholder in the emphasis/backticks a template renders it
  // with; unwrapping ONE such pair is not a semantic judgment, it is the same token.
  const bare = trimmed.replace(/^[`*_]+/, "").replace(/[`*_]+$/, "").trim();
  return trimmed !== RED_PROBE_PLACEHOLDER && bare !== RED_PROBE_PLACEHOLDER;
}

// ───────────────────────────────────────────────── identity, from the SNAPSHOT rows ──
//
// The lane never imports `ITEM_RE`/`isDriver`: identity arrives as data on the rows
// (ROUND 3/3). A DRIVER KEY is the number a qualified citation resolves against —
// deliberately the top-level one, because `66/01/F-3` and `m66/ADR-008` both address
// milestone 66's documents, and an id is unique within its register FILE (ADR-001 §5)
// of which the milestone folder is the addressable unit.
const driverKeyOf = (item) => {
  const raw = item?.parent ?? item?.number;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? String(parsed) : null;
};

const statusOf = (item) => item?.meta?.status ?? null;
const textsOf = (item) => (item?.docTexts != null && typeof item.docTexts === "object" ? item.docTexts : {});
const docPath = (item, name) => path.join(String(item.dir ?? ""), name);

// The three files a register block may live in (ADR-001 §1 + ADR-008 ruling 4), and
// the two memory's whole-document parsers read (`local-indexing.mjs` `buildRecords`).
const REGISTER_FILES = ["ARCHITECTURE.md", "VERIFICATION.md", "SESSION.md"];
const MEMORY_SOURCE_FILES = ["ARCHITECTURE.md", "RETROSPECTIVE.md"];

const DOCUMENT_FORMS = ID_FORMS.filter((form) => form.scope === "document").map((form) => ({
  split: headingSplitRe(form.name),
  head: headingCaptureRe(form.name),
}));

// THE RESOLUTION UNIVERSE IS THE UNION (ROUND 3/1), and taking it is not a nicety:
// resolving `ADR`/`R` against register blocks alone makes essentially EVERY qualified
// citation in this tree dangle, which is a scoping defect in the check rather than a
// defect in the tree. Register-block declarations for `FF`/`F`/`D`; memory's
// whole-document headings for `ADR`/`R`.
function resolutionUniverse(snapshot) {
  const declared = new Map();
  const known = new Set();
  const add = (key, id) => {
    if (!declared.has(key)) declared.set(key, new Set());
    declared.get(key).add(id);
  };
  for (const item of snapshot.items ?? []) {
    const key = driverKeyOf(item);
    if (key == null) continue;
    known.add(key);
    const texts = textsOf(item);
    for (const name of REGISTER_FILES) {
      const text = texts[name];
      if (typeof text !== "string") continue;
      for (const entry of registerDeclarations(text, name)) add(key, entry.id);
    }
    for (const name of MEMORY_SOURCE_FILES) {
      const text = texts[name];
      if (typeof text !== "string") continue;
      for (const line of text.split(/\r?\n/)) {
        for (const form of DOCUMENT_FORMS) {
          if (!form.split.test(line)) continue;
          const head = line.match(form.head);
          if (head) add(key, head[1]);
        }
      }
    }
  }
  return { declared, known };
}

// ─────────────────────────────────────────────────────────── the REGISTER group ──

// `register-duplicate-id` (the generalisation of `duplicate-driver-number`) and
// `register-dangling-citation` (the generalisation of `loop-graph-dangling-endpoint`).
// Neither seed check is re-implemented here — they keep their own findings
// (`src/work/doctor-freshness.mjs:12`'s convention).
//
// THE POLICED CITATION UNIVERSE (ADR-009/D, DISCHARGED BY ADR-011/A) is qualified
// `m?<itemRef>/<ID>` citations anywhere in the item's documents, PLUS the item's own
// CITING register entries — rows that, by their POSITION, assert the id is declared in
// the sibling register (ADR-008 ruling 4). That position is the one bare-id site a
// document's own structure identifies, and it is where ADR-009/D's bare half is
// discharged.
//
// A BARE ID IN FREE PROSE IS OUTSIDE THE UNIVERSE, and ADR-011/A refuses it as
// UNLANDABLE on a measurement rather than a preference: free prose adds 329 (file, id)
// pairs at the literal reading and still 135 at the tightest narrowing proposed, of
// which 304 / 131 stand in `done` items no legal edit can clear — which this feature's
// own settling scenario forbids — and on the LIVE milestone it is 0% precise at every
// scoping. The two contract rows asking for it are superseded there, in the accepting
// item, rather than by editing a delivered feature.
export function registerGroup(snapshot) {
  const findings = [];
  const { declared, known } = resolutionUniverse(snapshot);

  for (const item of snapshot.items ?? []) {
    const key = driverKeyOf(item);
    if (key == null) continue;
    const severity = severityFor(statusOf(item));
    const texts = textsOf(item);

    // ── duplicates: one finding per (register FILE, id), naming both line numbers.
    // The id space is PER REGISTER FILE (ADR-001 §5), so `FF-5204` in m52 and
    // `FF-5204` in m66 are two declarations and no collision.
    for (const name of REGISTER_FILES) {
      const text = texts[name];
      if (typeof text !== "string") continue;
      const lines = new Map();
      for (const entry of registerDeclarations(text, name)) {
        if (!lines.has(entry.id)) lines.set(entry.id, []);
        lines.get(entry.id).push(entry.line);
      }
      for (const [id, at] of lines) {
        if (at.length < 2) continue;
        findings.push({
          code: "register-duplicate-id",
          severity,
          path: docPath(item, name),
          message: `${id} is declared ${at.length} times in one register (lines ${at.join(", ")}) — an id is unique within its register file, so one of them must be renumbered`,
        });
      }
    }

    // ── dangling citations. One finding per (citing document, cited ref): the
    // collision is one fact and the fix is one act, so `D-31` cited five times in one
    // document is ONE finding (the engine's code+path+message de-dupe carries it).
    for (const [name, text] of Object.entries(texts)) {
      if (typeof text !== "string") continue;
      const where = docPath(item, name);
      for (const citation of qualifiedRefsIn(text)) {
        const target = Number.parseInt(String(citation.item).split("/")[0], 10);
        if (!Number.isFinite(target)) continue;
        const targetKey = String(target);
        if (declared.get(targetKey)?.has(citation.id)) continue;
        findings.push({
          code: "register-dangling-citation",
          severity,
          path: where,
          message: known.has(targetKey)
            ? `${citation.ref} cites ${citation.id}, which item ${targetKey}'s registers do not declare — correct the id or declare it`
            : `${citation.ref} cites item ref ${targetKey}, which no work item wears — correct the item ref`,
        });
      }
      // A CITING register entry (ADR-008 ruling 4) asserts by its position that the id
      // is declared in the sibling register of its own item. Feature 03's "the id in
      // the verification register is not itself reported as a dangling citation" is
      // this branch passing, and it is the only bare-id position this lane polices.
      if (!REGISTER_FILES.includes(name)) continue;
      for (const entry of registerEntries(text, name)) {
        if (entry.kind !== "citing") continue;
        if (declared.get(key)?.has(entry.id)) continue;
        findings.push({
          code: "register-dangling-citation",
          severity,
          path: where,
          message: `${entry.id} (line ${entry.line}) cites a declaration item ${key} does not carry — declare it in the sibling register, or correct the id`,
        });
      }
    }
  }
  return findings;
}

// ───────────────────────────────────────────────────── the VERIFICATION group ──

// The obligation runs from one register to the other, id by id (ADR-005 §2): for each
// id declared in the item's `## Fitness functions`, the item's `VERIFICATION.md`
// fitness register must carry a row with that id in first position and a red-probe
// cell that is neither empty nor the frozen placeholder.
//
// A REGISTER ABSENT ALTOGETHER IS ONE FINDING FOR THE DOCUMENT, never one per declared
// id, and it SUPPRESSES the per-id lane — the fix is one act. That is the cardinality
// rule `duplicate-driver-number` already sets ("the collision is one fact about the
// stream, not one per participant", `src/work/doctor.mjs:372-376`).
export function verificationGroup(snapshot) {
  const findings = [];
  for (const item of snapshot.items ?? []) {
    const texts = textsOf(item);
    const architecture = texts["ARCHITECTURE.md"];
    if (typeof architecture !== "string") continue;
    const declared = fitnessDeclarations(architecture, "ARCHITECTURE.md");
    // A register declaring NO ids declares nothing and is compliant by construction
    // (ADR-001 §6) — the 40 fitness tables with no id column acquire obligations only
    // when they acquire ids.
    if (declared.length === 0) continue;

    const severity = severityFor(statusOf(item));
    const verification = texts["VERIFICATION.md"];
    const where = docPath(item, "VERIFICATION.md");
    const hasRegister = typeof verification === "string" && openBlockKinds(verification, "VERIFICATION.md").has("citing");
    if (!hasRegister) {
      findings.push({
        code: "verification-register-missing",
        severity,
        path: where,
        message: `${declared.length} fitness function(s) are declared (${declared.map((entry) => entry.id).join(", ")}) and VERIFICATION.md carries no "## Fitness functions" register to record their red probes`,
      });
      continue;
    }

    const rows = redProbeRows(verification, "VERIFICATION.md");
    for (const entry of declared) {
      const row = rows.get(entry.id);
      if (row == null) {
        findings.push({
          code: "verification-missing-red-probe",
          severity,
          path: where,
          message: `${entry.id} is declared in ARCHITECTURE.md and has no row in VERIFICATION.md's fitness register — record what was changed to make it fail, and the message observed`,
        });
        continue;
      }
      if (recordsARedProbe(row.probe)) continue;
      findings.push({
        code: "verification-missing-red-probe",
        severity,
        path: where,
        message: `${entry.id}'s red-probe cell (line ${row.line}) is ${row.probe == null ? "absent — the register carries no red-probe column" : row.probe.trim() === "" ? "empty" : "the untouched template placeholder"} — an assertion nobody has seen fail is indistinguishable from a broken one`,
      });
    }
  }
  return findings;
}

// ────────────────────────────────────────────────────────── the CONTROL group ──

// THE TWO LEGS (ADR-004 §1), and the cardinalities ADR-009/J confirmed.
//
//   Leg A — the path exists. A miss is `control-unresolved`. A declaration citing two
//           paths resolves only when BOTH do; a declaration citing NO path fails leg A
//           too, because there is no path a runner could ever see. A `pending` marker
//           downgrades the finding to `warn` inside the horizon without silencing it —
//           this is ACD's `xfail`, and it is INADMISSIBLE at `done` (ADR-004 §3),
//           which is what makes it a discharge rather than a park. The refusal bites
//           at the ACCEPT TRANSITION, while the item is still open (ADR-009/C), so no
//           error is ever emitted against an immutable record.
//   Leg B — a declared runner names the cited file's basename. A miss is
//           `control-unregistered`, SUPPRESSED once leg A has failed (a file that is
//           not there cannot be registered, and the fix is one act). When the runner
//           list is absent leg B does not run and SAYS SO — `control-runner-unchecked`,
//           always `warn`, once per item — never a silent pass.
//
// A STALE `pending` ON A LANDED CONTROL IS A DECLARED NO-OP (ADR-009/J), not a ninth
// code: the resolution check already answers what the marker claims.
//
// 66 DOES NOT FIX TECH_DEBT ITEM 50. Leg B uses the same substring predicate as
// `test/arch/testing/acd-test-suite-registration.test.mjs:151` and inherits the same hole —
// an imported-but-never-spread suite is invisible. Stated rather than absorbed.
export function controlGroup(snapshot) {
  const findings = [];
  const probes = snapshot.controlProbes ?? {};
  const runnerTexts = snapshot.runnerTexts ?? null;
  const runnerNames = runnerTexts == null ? null : Object.keys(runnerTexts);
  const namedByARunner = (basename) =>
    runnerTexts != null && Object.values(runnerTexts).some((text) => String(text).includes(basename));

  for (const item of snapshot.items ?? []) {
    const severity = severityFor(statusOf(item));

    // The staging prohibition (ADR-004 §4). Keyed on the NAME, so m35's
    // `reference/retired-dispatch-tests/*.mjs` — 29 files deliberately renamed out of
    // every glob — stay admitted, and a `.feature` anywhere stays admitted because a
    // contract is not a control. THE SHIPPED WALK IS NARROWER THAN FF-6607's `**`
    // (ROUND 3/12): it rides the per-item-dir recursion the snapshot already performs,
    // so a file directly under `<work.dir>` or inside an orphan folder is unseen. A
    // difference, not a contradiction — the arch-test holds the wider claim.
    for (const staged of item.stagedControls ?? []) {
      findings.push({
        code: "staged-control",
        severity,
        path: staged,
        message: `${path.basename(staged)} is a test-shaped file inside the work directory — a control lands in the runnable tree where a runner can see it, never staged beside its documentation`,
      });
    }

    const architecture = textsOf(item)["ARCHITECTURE.md"];
    if (typeof architecture !== "string") continue;
    const declared = fitnessDeclarations(architecture, "ARCHITECTURE.md");
    if (declared.length === 0) continue;
    const where = docPath(item, "ARCHITECTURE.md");

    // The honest NO-OP, once per ITEM (ADR-009/J) and never once per control: m53 and
    // m66 alone would emit 21 warns under per-control cardinality.
    if (runnerTexts == null) {
      findings.push({
        code: "control-runner-unchecked",
        severity: "warn",
        path: where,
        message: `${declared.length} declared control(s) here, and no "${RUNNERS_CONFIG_KEY}" is configured — leg B (does a runner name this file?) did not run, so no control here is known to be registered`,
      });
    }

    for (const entry of declared) {
      const missing = entry.controls.filter((control) => probes[control] !== true);
      if (entry.controls.length === 0 || missing.length > 0) {
        findings.push({
          code: "control-unresolved",
          // The pending marker downgrades INSIDE the horizon and changes nothing
          // outside it — `severityFor` already answers `warn` there.
          severity: entry.pending ? "warn" : severity,
          path: where,
          message:
            entry.controls.length === 0
              ? `${entry.id} declares no control path a runner could see — name the intended path in its "enforced by" cell${entry.pending ? "" : ', or mark the entry "pending"'}`
              : `${entry.id} cites ${missing.join(", ")}, which ${missing.length === 1 ? "is not a file" : "are not files"} on disk${entry.pending ? ' (declared "pending")' : ' and the entry carries no "pending" marker'}`,
        });
        continue;
      }
      if (runnerTexts == null) continue;
      const unregistered = entry.controls.filter((control) => !namedByARunner(path.posix.basename(control)));
      if (unregistered.length === 0) continue;
      findings.push({
        code: "control-unregistered",
        severity,
        path: where,
        message: `${entry.id} cites ${unregistered.join(", ")}, which no configured runner names (${runnerNames.join(", ")}) — a control no runner reaches is a control that never runs`,
      });
    }
  }
  return findings;
}

// The THREE groups, and the ONE entry `CHECK_GROUPS` gains (ADR-003 §2). One story
// owns the array, and one module holds all three groups: three stories appending to
// one array is merge friction wearing an independence claim (`65/STORY.md:69-74`).
export const CONTROL_GROUPS = Object.freeze([registerGroup, verificationGroup, controlGroup]);

export function controlsLane(snapshot, ctx) {
  return CONTROL_GROUPS.flatMap((group) => group(snapshot, ctx));
}
