// THE DECLARATION FORM (milestone 66 / story 01 — ADR-001, amended by ADR-008) — one
// home for "what a declared id looks like", and for the one question every register
// check has to answer first: is this line DECLARING an id, or CITING one?
//
// ZERO IMPORTS, DELIBERATELY. This is a grammar, not a reader: nothing here touches
// the filesystem, spawns, or reads a clock. Story 66/02's controls lane is forbidden
// (FF-6605) from reaching `node:fs` through its direct imports, so a leaf is the only
// shape that lets both the lane and `src/memory/local-indexing.mjs` share it.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE MODULE HAS TWO INDEPENDENT HALVES, AND THAT SEPARATION IS LOAD-BEARING
// (ADR-008 ruling 2). They are exported as SEPARATE BINDINGS, never one bundle:
//
//   (1) THE WHOLE-DOCUMENT HALF — `ID_FORMS` and the two heading compositions built
//       from it. This is the grammar `parseRetrospective` and `parseArchitecture`
//       have run since m05/ADR-007, and their reach is the WHOLE document.
//   (2) THE REGISTER-SCOPED HALF — `DECLARATION`, `REGISTER_BLOCKS` and the block
//       walk. Story 66/02 only.
//
// MEMORY IMPORTS (1) AND NEVER (2), and an import of (2) by `local-indexing.mjs` is a
// DEFECT rather than a shortcut. Measured over the real `wiki/work` on 2026-08-15:
// 0 of 343 `ADR-NNN` headings and 0 of 261 `R<n>` headings sit inside a register
// block — memory's sources live in the open document, so scoping its parse to a
// register block would return 0 records where it returns 600 today.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE ID NAMESPACE IS A CLOSED SET OF FORMS, NOT ONE PATTERN (ADR-008 ruling 1,
// superseding ADR-001 §2's single `(FF|F|D|R|ADR)-[0-9]+…`). `R<n>` CARRIES NO
// HYPHEN. Re-measured today over every `RETROSPECTIVE.md` under `wiki/work`: 261 bare
// `## R<n>` headings, 0 hyphenated. A single hyphenated pattern returns ZERO lesson
// records — memory would lose every one of them.
//
// (ADR-008 measured 259 lessons / 340 ADR headings on the same tree hours earlier.
// The corpus moved: 66/00 landed and this milestone's own records grew. That drift is
// exactly why FF-6604 asserts a SET-EQUALITY and never a stored count.)
//
// A DOTTED ID DECLARES NOTHING, DELIBERATELY (ADR-008 ruling 6). `.` stays outside
// every form because `F-05` and `F-05.1` have a relationship no check can know, so
// duplicate detection over them would be wrong in both directions. The hole is
// DECLARED and bounded — 18 distinct dotted ids, every one inside a `done` item.

// The separator that may stand between an id and its title. Frozen with the forms
// (ADR-008 ROUND 3/6) rather than beside them, because the shipped parsers hold TWO
// literals each — the section split AND the capture head — and only the capture head
// spells the separator. A re-home that moves one and leaves the other is half done.
const SEPARATOR_CLASS = "[:·—–-]";

// The block anchor for a heading in the WHOLE-DOCUMENT grammar: h2 or h3, then
// whitespace. `\s+` (not `[ \t]+`) is the literal both memory parsers have used since
// m05/ADR-007 and is preserved verbatim, so the composition below is byte-identical to
// what it replaces.
const HEADING_ANCHOR = "^#{2,3}\\s+";

// THE CLOSED SET OF FORMS — one entry per namespace member. Extended by ADR only.
//
//   `id`         the regex source matching the id itself
//   `scope`      where a DECLARATION of this form may live (ADR-008 ruling 2 +
//                ROUND 3/1's union): `"document"` for the two forms memory parses
//                whole-document, `"register"` for the three that declare only inside
//                a frozen register block. Resolution unions the two — resolving
//                `ADR`/`R` against register blocks alone makes EVERY qualified
//                citation in this repo dangle.
//   `terminator` what must follow the id in a whole-document HEADING SPLIT — the
//                "no run-on" guard. `R\d+` carries `\b` and `ADR-\d+` carries NOTHING,
//                because those are the two shipped literals: adding `\b` to the ADR
//                form would newly reject `## ADR-001a`, which is a behaviour change
//                wearing a tidy-up's clothes, and byte-identity is this task's whole
//                contract. The three register-scoped forms ship no whole-document
//                split at all; they carry the same guard for the same reason `R` does.
//   `separator`  the separator class, carried per form (ROUND 3/6).
export const ID_FORMS = Object.freeze([
  Object.freeze({ name: "ADR", scope: "document", id: "ADR-\\d+", terminator: "", separator: SEPARATOR_CLASS }),
  Object.freeze({ name: "FF", scope: "register", id: "FF-\\d+[A-Za-z0-9-]*", terminator: "\\b", separator: SEPARATOR_CLASS }),
  Object.freeze({ name: "F", scope: "register", id: "F-\\d+[A-Za-z0-9-]*", terminator: "\\b", separator: SEPARATOR_CLASS }),
  Object.freeze({ name: "D", scope: "register", id: "D-\\d+[A-Za-z0-9-]*", terminator: "\\b", separator: SEPARATOR_CLASS }),
  Object.freeze({ name: "R", scope: "document", id: "R\\d+", terminator: "\\b", separator: SEPARATOR_CLASS }),
]);

// idForm(name) — the one entry, or throws. A miss is a programming error (the set is
// closed and frozen), so it fails loudly rather than returning a regex that matches
// nothing and silently empties a caller's record set.
export function idForm(name) {
  const form = ID_FORMS.find((entry) => entry.name === name);
  if (form == null) throw new Error(`declared-id: no such id form "${name}" — the namespace is closed: ${ID_FORMS.map((f) => f.name).join(", ")}`);
  return form;
}

// headingSplitRe(name) — the WHOLE-DOCUMENT section-split pattern for one form:
// "a block-level heading whose first token is an id of this form". This is
// `local-indexing.mjs:107`/`:160` and `import/recovery.mjs:296`/`:321`, composed.
//
// NEVER GLOBAL. Both call sites feed it to a `headerRe.test(line)` loop, and a `g`
// flag would carry `lastIndex` between lines and drop every other heading.
export function headingSplitRe(name) {
  const form = idForm(name);
  return new RegExp(`${HEADING_ANCHOR}${form.id}${form.terminator}`);
}

// headingCaptureRe(name) — the same heading, split into `(id)` and `(title)` across an
// optional separator. This is `local-indexing.mjs:111`/`:166` and
// `import/recovery.mjs:297`/`:322`, composed. The separator is OPTIONAL and the title
// may be empty: a stream's headings are authored with `:`, `·`, `—`, `–`, `-` or bare
// whitespace, and losing a record to that choice is the defect m05/ADR-007 named.
export function headingCaptureRe(name) {
  const form = idForm(name);
  return new RegExp(`${HEADING_ANCHOR}(${form.id})\\s*${form.separator}?\\s*(.*)$`);
}

// ───────────────────────────────────── the REGISTER-SCOPED half (66/02 only) ──
//
// Everything below this line is scoped to a REGISTER BLOCK. `src/memory/local-indexing.mjs`
// must import none of it (FF-6604 asserts the import bindings), because memory's
// reach is the whole document and a register-scoped parse returns 0 of its 600 records.

// A REGISTER BLOCK is the region of a record document opened by a frozen h2 heading,
// ending at the next h2 or a `---` rule (ADR-001 §1).
//
// A BLOCK DECLARES OR CITES (ADR-008 ruling 4). `## Fitness functions` in an
// `ARCHITECTURE.md` declares; the SAME heading in a `VERIFICATION.md` is ADR-005's
// red-probe register and CITES — its rows resolve to the sibling architecture
// declaration and never make a second one. That is what keeps one id to one
// declaration while the evidence lives in its own document.
//
// THE FILE SET IS EXACTLY THESE THREE, and the exclusions are measured rather than
// assumed: `wiki/work/02_milestone_planning-init/UAT.md:68` holds a `## Findings`
// register in a `UAT.md`, and its rows therefore declare nothing (ADR-009 ROUND 3/12
// names this as a silent hole rather than leaving it to be discovered).
export const REGISTER_BLOCKS = Object.freeze([
  Object.freeze({ file: "ARCHITECTURE.md", heading: "fitness functions", kind: "declaring" }),
  Object.freeze({ file: "VERIFICATION.md", heading: "findings", kind: "declaring" }),
  Object.freeze({ file: "SESSION.md", heading: "findings", kind: "declaring" }),
  Object.freeze({ file: "VERIFICATION.md", heading: "fitness functions", kind: "citing" }),
]);

// A DECLARATION is a block-level line inside a register block whose FIRST token is the
// id, with nothing before it but the line's structural prefix (ADR-001 §2). The two
// admitted anchors are the two markdown block anchors already in service — a heading,
// and a table row's first cell — with optional `**` emphasis, and the id must be
// followed by the cell boundary, a separator, or end of line.
//
// THE RULE IS ABOUT POSITION, NOT PREFIX, and that is what makes it worth freezing:
// the finding's two false positives dissolve as consequences rather than special
// cases. `### D-17 is now LIVE…` has prose after the id with no separator, so the id
// is a subject and not a label; `**Next free id is D-37.**` has no anchor and the id
// is not first. A reservation needs no special case.
//
// THE BULLET FORM IS DELIBERATELY NOT ADMITTED. Tolerating `- **F-28 · BLOCKER…**` is
// exactly the 33%-precision configuration the finding measured; it is grandfathered by
// ADR-001 §6 and is not what new work writes.
//
// THE RUN-ON GUARD `(?![A-Za-z0-9-])` IS LOAD-BEARING, AND ITS ABSENCE WAS A LIVE
// DEFECT (66/01 review round 1). Three of the five forms end in a greedy
// `[A-Za-z0-9-]*`, and without the guard the engine BACKTRACKS INTO THE ID until a
// hyphen *inside* it can serve as the separator — so a suffixed id followed by prose is
// silently TRUNCATED rather than refused. Measured over the real corpus at
// `wiki/work/49_milestone_terminals-home/VERIFICATION.md:603-606`:
//
//   | **F-49-VER-b** (GAP-6) | design-gap (FIXED) | …   →  declared `F-49-VER`
//
// Four rows in that register collapsed to ONE id, which manufactures both halves of
// what 66/02 exists to report: `F-49-VER` declared four times in one file (a false
// `register-duplicate-id`) and `F-49-VER-b/-d/-e/-f` declared nowhere (every citation
// of them dangling). ADR-001 §2 says the first token IS the id; truncated, it is not.
//
// The guard is the ADR-001 §2-correct answer, not a new rule: prose after an id with no
// separator is a CITATION, exactly as `| FF-1 and FF-2 are one guard |` already was.
// Measured: it changes 0 of the 25 rows this story's contract enumerates, and 4 of 157
// corpus entries — all four from a truncated id to `null`.
const RUN_ON_GUARD = "(?![A-Za-z0-9-])";

// declarationRe(forms) — the ONE spelling of the declaration shape, alternated over a
// chosen set of forms. Two callers: `DECLARATION` over the whole namespace (the line
// matcher), and the register-scoped recogniser the block walk uses. Written once
// because a second spelling of this shape is the very thing this module exists to stop.
const declarationRe = (forms) =>
  new RegExp(
    `^(?:#{2,3}[ \\t]+|\\|[ \\t]*)\\*{0,2}(${forms.map((form) => form.id).join("|")})${RUN_ON_GUARD}\\*{0,2}[ \\t]*(?:\\||${SEPARATOR_CLASS}|$)`,
  );

export const DECLARATION = declarationRe(ID_FORMS);

// The same shape over the REGISTER-SCOPED forms only. The block walk uses this and the
// line matcher does not, and the split is deliberate (ADR-008 ruling 2 + ROUND 3/1's
// union): `## ADR-001:` and `### R1 —` ARE declarations — whole-document ones — so
// `declaredIdOn` must answer with their id; but a `scope: "document"` id sitting inside
// a frozen register block must NOT also be declared by the register half, or the union
// counts it twice and 66/02 sees a false duplicate. Measured: 0 such lines in the
// corpus today, so this is prospective — and the first one to land is the one that
// would have been silently double-declared.
const REGISTER_DECLARATION = declarationRe(ID_FORMS.filter((form) => form.scope === "register"));

// declaredIdOn(line) — the id this line declares, or null. The line is judged in
// isolation, over the WHOLE namespace; whether it sits inside a register block, and
// whether its form may declare there, is `registerEntries`' question.
export function declaredIdOn(line) {
  const match = DECLARATION.exec(String(line));
  return match ? match[1] : null;
}

// A CROSS-FILE CITATION is `m?<itemRef>/<ID>` (ADR-008 ruling 5, superseding ADR-001
// §5's unprefixed form). The `m` prefix is the minority form — 430 `m52/ADR-007`
// against 1,756 bare `52/ADR-007` across `wiki/work` — but 430 citations dangling on
// the day the check ships would discredit it, and the prefix costs one character.
//
// THE `(?<![-\w.])` LOOKBEHIND IS LOAD-BEARING (ADR-008 ROUND 3/2). Without it the
// grammar mis-reads THIS HOUSE'S OWN slash-joined id pairs: `ADR-001/ADR-008` parses
// as item `001`, `F-1/F-2` as item `1`. 125 such pairs exist, and two of ADR-009/D's
// "authoring noise" examples turned out to be this artifact rather than noise.
//
// THE `.` IN THAT CLASS IS ROUND 3/2's EXACT CLASS WITH A DOT IN PLACE OF THE HYPHEN,
// and it was unmasked by scoping the dot guard above (66/01 review round 2 — one fix
// revealing the next is what a measured grammar looks like). In this corpus `.` is an
// ID-CONTINUATION character, so a hyphen-only lookbehind lets a CLAUSE POINTER's own
// digits start an item ref:
//
//   `ADR-010 R4.1/R4.3`            → `1/R4`, a citation of milestone 1 from text with none
//   `see 43/02/R4.4/R4.5 for both` → `43/02/R4` plus a fabricated `4/R4`
//
// Measured: 7 fabricated citations across `wiki/work` (`3/ADR-006` from
// `ADR-004.3/ADR-006`, `4/ADR-005`, `2/ADR-016` from `F-05.2/ADR-016`, `5/R1`, `2/R4`,
// `4/R4`, `1/R4`). Six resolve — silently wrong — and one dangles, which is a false
// finding 66/02 would report. Adding the dot removes exactly those 7 and no legitimate
// ref: 2,400 → 2,393, a strict subset.
//
// THE DOT GUARD IS RULING 6 ON THE CITING SIDE, AND IT RIDES THE REGISTER-SCOPED FORMS
// ONLY. `52/F-05.1` names a dotted id, which is outside the namespace, so it cites
// nothing; `52/ADR-007.` at the end of a sentence still cites `ADR-007`.
//
// SCOPING IT IS NOT A REFINEMENT, IT IS THE MEASUREMENT (66/01 review round 1). A
// blanket `(?!\.\d)` across all five forms drops **34** dotted qualified refs in this
// corpus, and only **1** of them is ruling 6's population: the other **33** are
// `27/ADR-006.4`-shaped CLAUSE POINTERS — 30 `ADR`, 3 `R` — where the base id really
// is declared and the `.4` names a clause inside it. Dropping those would manufacture
// dangling citations, which is the defect 66/02 exists to report. Ruling 6's own
// measured population is `F-05.1`…`F-06.6`, `F-38.05` — every one a register-scoped
// form — so the guard belongs on exactly those branches and nowhere else.
//
// It is scoped by BAKING IT INTO THE BRANCH rather than by trailing the whole
// alternation, because a regex cannot ask which branch matched after the fact.
const dotGuarded = (form) => (form.scope === "register" ? `${form.id}(?!\\.\\d)` : form.id);

export const QUALIFIED_REF = new RegExp(
  `(?<![-\\w.])m?(\\d{1,4}(?:/\\d{1,3})*)/(${ID_FORMS.map(dotGuarded).join("|")})(?![\\w-])`,
  "g",
);

// qualifiedRefsIn(text) — every cross-file citation, as `{ item, id, ref, line }`.
export function qualifiedRefsIn(text) {
  const out = [];
  String(text)
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const match of line.matchAll(QUALIFIED_REF)) {
        out.push({ item: match[1], id: match[2], ref: match[0], line: index + 1 });
      }
    });
  return out;
}

// normalizeOpener(headingText) — the ONE normalisation a register opener gets
// (ADR-008 ruling 3): matched case-insensitively, with a TRAILING PARENTHETICAL
// stripped, and nothing else.
//
// MEASURED, re-measured today over every ARCHITECTURE/VERIFICATION/SESSION file:
// 38 exact `## Fitness functions` and 45 exact `## Findings` openers, and the rule
// recovers `## Fitness Functions` ×2, `## Fitness functions (…)` ×6 and
// `## Findings (added at re-open)` ×1. `## Story NN findings` ×4 stays OUT — a
// per-story sub-register is grandfathered by ADR-001 §6, never renamed, never admitted.
export function normalizeOpener(headingText) {
  return String(headingText).replace(/\s*\([^()]*\)\s*$/, "").trim().toLowerCase();
}

const H2 = /^##[ \t]+(.*)$/;
const FENCE = /^\s*(?:```|~~~)/;
const HORIZONTAL_RULE = /^---+\s*$/;

const basename = (file) => String(file ?? "").split(/[\\/]/).pop();

// registerBlockKind(line, file) — "declaring" | "citing" | null: which register block,
// if any, this h2 line opens in this file. An h2 that opens no register block still
// CLOSES the previous one, which is `registerEntries`' business rather than this one's.
export function registerBlockKind(line, file) {
  const heading = H2.exec(String(line));
  if (heading == null) return null;
  const opener = normalizeOpener(heading[1]);
  const base = basename(file);
  const block = REGISTER_BLOCKS.find((entry) => entry.file === base && entry.heading === opener);
  return block ? block.kind : null;
}

// FENCED AND COMMENTED REGIONS ARE INERT — both for the block opener and for the
// declarations under it (ADR-001 §3, extended to HTML comments by ADR-008 ROUND 3/11).
//
// Returns one `{ line, text }` per source line, where `text` is the line with every
// fenced and commented span removed. An inert line declares nothing, opens nothing and
// CLOSES nothing: a fenced `## Findings` opens no block, and a fenced `---` closes none.
//
// BOTH RULES ARE PROSPECTIVE AND BOTH TRIGGERS ARE ALREADY NAMED. Measured: 0
// declaration-shaped lines and 0 block openers sit inside a fence or a comment today.
// 66/03 ships a `VERIFICATION.md` template WHOSE BODY IS A REGISTER, and a multi-line
// `<!-- … -->` sits inside a register block in every shipped template — and inside
// milestone 66's own fitness register. A recogniser without these would read a quoted
// sample, or a template's placeholder row, as a declaration.
function visibleLines(text) {
  const out = [];
  let inFence = false;
  let inComment = false;
  const lines = String(text).split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (inFence) {
      if (FENCE.test(raw)) inFence = false;
      out.push({ line: index + 1, text: "" });
      continue;
    }
    // A fence opener inside a comment is prose about a fence, not a fence.
    if (!inComment && FENCE.test(raw)) {
      inFence = true;
      out.push({ line: index + 1, text: "" });
      continue;
    }
    // Comment spans, left to right, so a line that both closes one comment and opens
    // another keeps the visible text between them.
    let rest = raw;
    let visible = "";
    while (rest.length > 0) {
      if (inComment) {
        const close = rest.indexOf("-->");
        if (close < 0) break;
        inComment = false;
        rest = rest.slice(close + 3);
        continue;
      }
      const open = rest.indexOf("<!--");
      if (open < 0) {
        visible += rest;
        break;
      }
      visible += rest.slice(0, open);
      inComment = true;
      rest = rest.slice(open + 4);
    }
    out.push({ line: index + 1, text: visible });
  }
  return out;
}

// registerEntries(text, file) — every id DECLARED or CITED by position inside a
// register block of this document: `{ id, line, kind }`, `kind` the BLOCK's kind
// (ADR-008 ruling 4). Rows outside every block, and rows in a file that carries no
// frozen opener, are absent entirely — a register that declares no ids declares
// nothing, and is compliant by construction rather than by exemption (ADR-001 §6).
//
// A register block exists ONLY in its own register file: `STATE.md`, a `SPEC.md` and a
// task `.feature` carry none, which is why a contract may quote the form — as this
// story's own feature files do, at length — without declaring anything.
export function registerEntries(text, file) {
  const base = basename(file);
  const entries = [];
  let kind = null;
  for (const { line, text: visible } of visibleLines(text)) {
    if (visible.trim() === "") continue;
    // An h2 always ENDS the open block; a frozen one opens a new block in its place.
    // Tested before the declaration below, which is why no `## ADR-NNN` heading can
    // ever be a register declaration — it closes the block it would have sat in.
    if (H2.test(visible)) {
      kind = registerBlockKind(visible, base);
      continue;
    }
    // A horizontal rule ends the block as surely as a heading (ADR-001 §1). An `###`
    // subheading does NOT — which is how the corpus's 21 heading-form declarations sit.
    if (HORIZONTAL_RULE.test(visible)) {
      kind = null;
      continue;
    }
    if (kind == null) continue;
    // REGISTER-SCOPED FORMS ONLY. A `scope: "document"` id (`ADR`, `R`) that happens to
    // sit inside a frozen block is a whole-document declaration and is already in the
    // union's other half; declaring it here too would double it.
    const match = REGISTER_DECLARATION.exec(visible);
    if (match != null) entries.push({ id: match[1], line, kind });
  }
  return entries;
}

// registerDeclarations(text, file) — the DECLARING subset. The one question a
// duplicate-id check asks, and the one a dangling-citation check resolves against.
export function registerDeclarations(text, file) {
  return registerEntries(text, file).filter((entry) => entry.kind === "declaring");
}
