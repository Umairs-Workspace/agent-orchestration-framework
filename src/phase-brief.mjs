// src/phase-brief.mjs — THE PHASE BRIEF compiler (milestone 70 / story 00, ADR-001/002/003;
// story 05, ADR-009).
//
// The milestone's headline artefact: a phase is handed ~2,000 tokens of context BY VALUE
// instead of being pointed at a tree to rediscover. The compiler is a PURE LEAF — it
// pulls in nothing from `src/`, performs no filesystem read and reads no wall-clock —
// because the driver that sends the brief has a FROZEN export contract (FF-5302, the
// seventeen) and because a bound (ADR-003) is only testable if the thing being bounded is
// deterministic. Same shape as `otel-attribution.mjs` (68/ADR-005 §2): the pure builder
// lives here, the seam merely SETS the result on the bag.
//
// THE BAG (ADR-001). The driver's first parameter is already named `brief`
// ({ itemRef, worktreeCwd, task, command }). This module produces the ADDITIVE key
// `brief.context` and nothing else — no rival "context/payload/digest" object exists.
// The four existing keys keep their meaning.
//
// THE BOUND (ADR-003; ADR-009 §1 leaves it exactly where ADR-003 put it). The ceiling
// lives IN THE WRITE PATH: `compilePhaseBrief` refuses to return an over-ceiling brief. It
// never silently ships the overflow, and it never returns an empty brief. The budget is
// characters at a declared chars-per-token ratio; the ratio is applied below.
//
// THE POLICY (ADR-009, story 05). ADR-003's *drop-whole* packing does not stand. A section
// is CONDENSED to fit before it is ever given up, and the two operations that reduce a
// section are separated by name:
//
//   ADDRESSING   is unconditional and belongs to the reader's call site. A document is
//                never handed over whole; what is handed over is the block the section
//                means. It happens at every size and is NEVER announced. The addressing
//                helpers are exported from here (they are pure) and called by
//                `phase-brief-read.mjs` — FF-7010.
//   CONDENSING   is budget-triggered and belongs to this module. It reduces an ALREADY
//                addressed section further when the budget cannot hold it, and it is
//                ALWAYS announced (§6).
//
// And a section leaves the brief by one of three distinguishable dispositions (§3):
//   CONDENSED    — shortened to fit, still carried, named as condensed with the form that
//                  survived and a pointer to where the full text is read.
//   SACRIFICED   — could have been carried, given up to make room. Strictly BOTTOM-UP:
//                  the lowest-priority retained section goes first.
//   UNSHIPPABLE  — cannot be carried in ANY declared form (even its condenser exceeds the
//                  whole ceiling, or the section cannot be represented at all). Skipped
//                  IN PLACE. It frees nothing, so it never cascades onto the sections
//                  below it. `lowerPriorityDropped` — the prefix cut that turned one miss
//                  into every miss — is deleted.
//
// The section list stays OPEN (ADR-003's "one number in one module") with exactly one added
// obligation (ADR-009): a new section arrives with its declared reduction or it does not
// arrive — FF-7009.
export const PHASE_BRIEF_CHARS_PER_TOKEN = 4;
export const PHASE_BRIEF_CEILING_TOKENS = 2000;
// The one ceiling literal. ~2,000 tokens at 4 chars/token — Anthropic's sub-agent
// guidance for a condensed hand-back. ADR-009 §1: the measurement says the budget is
// HALF-SPENT, so a larger ceiling would spend none of the extra.
export const PHASE_BRIEF_MAX_CHARS = PHASE_BRIEF_CEILING_TOKENS * PHASE_BRIEF_CHARS_PER_TOKEN;
// Compatibility name retained for the story-00 callers/tests. Both names point at the
// same single bound; MAX is the precise contract because it covers the COMPLETE context
// sent to the model (rendered sections plus any truncation notice).
export const PHASE_BRIEF_CEILING_CHARS = PHASE_BRIEF_MAX_CHARS;

// The declared section set, IN PRIORITY ORDER (highest first). Sacrifice runs from the
// bottom of this list, never from input order. `item` is always retained — a phase handed
// nothing is worse than a phase handed a truncated something (ADR-003).
export const BRIEF_SECTION_PRIORITY = Object.freeze([
  "item", "story", "objective", "tasks", "architecture", "fitness", "dependencies",
]);

export const PHASE_BRIEF_PHASES = Object.freeze(["refine", "continue", "verify"]);

// Per-phase section selection (ADR-001's "the brief a phase is handed matches its phase").
// Each phase carries only the sections that phase needs, not every section that exists:
//   refine   — the full picture (the phase that decides the shape)
//   continue — the outcome + contract + constraints it must satisfy while building
//   verify   — the contract + constraints it must check against
// `refine` is the WHOLE declared list, so it IS the declared list — a second element-for-
// element copy of `BRIEF_SECTION_PRIORITY` would let an eighth section be added to the
// priority order, given a declared reduction (FF-7009 checks that), and still be silently
// absent from every refine brief with the arch gate green. FF-7009 now compiles a refine
// brief and asserts it offers exactly the declared set, which is the behavioural half of
// the same rule.
const PHASE_SECTIONS = Object.freeze({
  refine: BRIEF_SECTION_PRIORITY,
  continue: ["item", "story", "tasks", "architecture", "fitness"],
  verify: ["item", "tasks", "architecture", "fitness"],
});

const SECTION_TITLES = Object.freeze({
  item: "ITEM",
  story: "STORY — outcome and benefit",
  objective: "MILESTONE OBJECTIVE",
  tasks: "TASK CONTRACTS",
  architecture: "ARCHITECTURE SLICE (declared ADRs)",
  fitness: "STRUCTURAL CONSTRAINTS (fitness register)",
  dependencies: "DEPENDENCIES",
});

// WHERE THE FULL TEXT IS READ (ADR-009 §6). Every disposition — condensed, sacrificed or
// unshippable — points a phase at the document the section was addressed out of, so a
// phase that needs the detail a reduction removed knows where to go rather than guessing.
export const BRIEF_SECTION_SOURCES = Object.freeze({
  item: "the item's own ref",
  story: "STORY.md",
  objective: "SPEC.md § Objective",
  tasks: "the story's tasks/ directory",
  architecture: "ARCHITECTURE.md",
  fitness: "ARCHITECTURE.md § Fitness functions",
  dependencies: "the item's frontmatter (depends:)",
});

// ───────────────────────── shared markdown structure ─────────────────────────

// structuralH2Headings(text) — the ONE Markdown-structure scan used by every addresser
// and by the ADR condenser. Fenced snippets and HTML comments can contain documentation
// examples that look like h2s; they are not document structure. Starts are source offsets
// so every extractor can preserve the original bytes exactly.
function structuralH2Headings(text) {
  const headings = [];
  let offset = 0;
  let fence = null;
  let inComment = false;
  for (const lineMatch of text.matchAll(/.*(?:\r?\n|$)/g)) {
    if (lineMatch[0] === "") continue;
    const raw = lineMatch[0].replace(/\r?\n$/, "");
    if (fence != null) {
      const close = raw.match(/^[ \t]{0,3}(`+|~+)[ \t]*$/);
      if (close != null && close[1][0] === fence.char && close[1].length >= fence.length) fence = null;
      offset += lineMatch[0].length;
      continue;
    }

    // Mask comments rather than deleting them so a heading after a same-line comment
    // cannot slide into column zero and become structural by accident. Masked INTO A
    // STRING, never into a code-point array: a line with no `<!--` then costs one
    // `indexOf` and allocates nothing, which is 3.3x over this stream (2,091 ms -> 637 ms
    // for all 633 briefs; 5.95 ms -> 0.80 ms for m53's 350,521-char ARCHITECTURE.md) — and
    // this scan runs at every phase SPAWN, not only in CI, which is the milestone's whole
    // thesis. It also keeps the units honest: `raw.indexOf` answers in UTF-16 code units,
    // and indexing a `[...raw]` code-point array with them shifted the mask for any line
    // carrying an astral character earlier on it.
    let structural = raw;
    let cursor = 0;
    while (cursor < raw.length) {
      if (inComment) {
        const end = raw.indexOf("-->", cursor);
        const through = end < 0 ? raw.length : end + 3;
        structural = structural.slice(0, cursor) + " ".repeat(through - cursor) + structural.slice(through);
        cursor = through;
        if (end >= 0) inComment = false;
        continue;
      }
      const start = raw.indexOf("<!--", cursor);
      if (start < 0) break;
      const end = raw.indexOf("-->", start + 4);
      const through = end < 0 ? raw.length : end + 3;
      structural = structural.slice(0, start) + " ".repeat(through - start) + structural.slice(through);
      cursor = through;
      inComment = end < 0;
    }
    const open = structural.match(/^[ \t]{0,3}(`{3,}|~{3,})/);
    if (open != null) {
      fence = { char: open[1][0], length: open[1].length };
      offset += lineMatch[0].length;
      continue;
    }
    const heading = /^##[ \t]+(.*)$/.exec(structural);
    if (heading != null) headings.push({ title: heading[1], start: offset });
    offset += lineMatch[0].length;
  }
  return headings;
}

// extractH2Block(text, matches) — the addressed block for ONE h2 heading: source bytes
// from the heading through to the next structural h2 (or end of document). Null when the
// heading is absent — an ABSENT block yields NO section and NO notice (ADR-009 §4).
export function extractH2Block(text, matches) {
  const source = String(text ?? "");
  const headings = structuralH2Headings(source);
  const index = headings.findIndex((heading) => matches(heading.title.trim()));
  if (index < 0) return null;
  return source.slice(headings[index].start, headings[index + 1]?.start ?? source.length);
}

// norm(text) — trims; returns null when the text is empty/whitespace-only, so an absent or
// blank section is omitted "exactly as if absent". The caller decides what counts as the
// section's text; this is the honest-degrade rule (task 00's Examples).
function norm(value) {
  if (Array.isArray(value)) {
    const joined = value.map((v) => String(v ?? "").trim()).filter((s) => s.length > 0).join("\n\n");
    return joined.length > 0 ? joined : null;
  }
  const s = String(value ?? "").trim();
  return s.length > 0 ? s : null;
}

// normalizeAdrDeclaration(value) — the OPTIONAL story-frontmatter declaration introduced
// by 70/03 (ADR-006). Absence and [] are the same benign answer; an array is de-duplicated
// without changing declaration order; every non-array PRESENT value stays visibly malformed
// rather than being partly read as one id.
export function normalizeAdrDeclaration(value) {
  if (value == null || value === "") return { ids: [], malformed: false };
  if (!Array.isArray(value)) return { ids: [], malformed: true };
  const ids = [];
  const seen = new Set();
  for (const raw of value) {
    const id = String(raw ?? "").trim();
    if (id === "" || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return { ids, malformed: false };
}

// frontmatterBlock(text) — the ONE frontmatter parse, and the reason it is one. ADR-009 §7
// documents exactly this shape going wrong: two copies of this expression existed, one grew
// the `\r?` and the other did not, and 31 of the 41 stories that declare `depends:` lost
// their dependencies section for a year because 201 of this stream's 219 story records are
// CRLF and no fixture is. Two readers of one grammar is how a divergence hides; a second
// copy of this regex is the defect, not the typo in it.
function frontmatterBlock(text) {
  return /^---\r?\n([\s\S]*?)\r?\n---/.exec(String(text ?? ""))?.[1] ?? null;
}

// declaredAdrsInStory(text) — the narrow frontmatter reader needed at the caller-side
// brief seam. It deliberately understands only the inline-list shape the work stream's
// frontmatter grammar admits, and it is CRLF-tolerant through the ONE parse above. The
// pure compiler still performs no I/O.
export function declaredAdrsInStory(text) {
  const frontmatter = frontmatterBlock(text);
  const line = frontmatter?.match(/^adrs:\s*(.*)$/m);
  if (line == null) return { ids: [], malformed: false };
  const raw = line[1].trim();
  if (!(raw.startsWith("[") && raw.endsWith("]"))) {
    return normalizeAdrDeclaration(raw);
  }
  const values = raw.slice(1, -1).split(",")
    .map((part) => part.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
  return normalizeAdrDeclaration(values);
}

// extractAdrBlocks(architectureText, requested) — PURE block addressing over the ONE
// ARCHITECTURE.md artifact (ADR-006 / FF-7008). It matches exact `## ADR-NNN` ids only,
// ends a block at the next h2 heading (therefore also the next ADR), preserves source bytes,
// returns matches in DOCUMENT order, and reports every requested miss. It never guesses an
// adjacent/similar id or absorbs a following register/partition into the last ADR.
export function extractAdrBlocks(architectureText, requested = []) {
  const { ids } = normalizeAdrDeclaration(Array.isArray(requested) ? requested : [requested]);
  if (ids.length === 0) return { blocks: [], missing: [] };
  const text = String(architectureText ?? "");
  // Index EVERY h2 so the last ADR stops before a following register/partition h2,
  // while only exact ADR headings are candidates for return. Fenced snippets and HTML
  // comments are examples, not document structure: ignoring them is what keeps a quoted
  // `## ADR-NNN` from becoming either an address or an early boundary for the real block.
  const headings = structuralH2Headings(text).map((heading) => {
    // The declaration supplies the ids; this extractor only addresses them. Re-parsing
    // the ADR id grammar here would create a second authority beside declared-id.mjs and
    // violate FF-6604. The boundary check keeps ADR-00 from guessing ADR-001.
    const id = ids.find((candidate) => {
      if (!heading.title.startsWith(candidate)) return false;
      const rest = heading.title.slice(candidate.length);
      return rest === "" || /^[ \t:·—–-]/.test(rest);
    });
    return { id: id ?? null, start: heading.start };
  });
  const wanted = new Set(ids);
  const blocks = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    if (!wanted.has(heading.id)) continue;
    const end = headings[index + 1]?.start ?? text.length;
    blocks.push({ id: heading.id, text: text.slice(heading.start, end) });
  }
  const found = new Set(blocks.map((block) => block.id));
  return { blocks, missing: ids.filter((id) => !found.has(id)) };
}

export function extractAdrBlock(architectureText, requested) {
  return extractAdrBlocks(architectureText, [requested]).blocks[0]?.text ?? null;
}

// The fallback for a story with no declaration is the milestone's REGISTER, not the whole
// architecture document. A markdown h2 block ends at the next h2, so Story partition (or
// any later section) cannot leak into the brief.
export function extractFitnessRegister(architectureText) {
  return extractH2Block(architectureText, (title) => /^Fitness functions\b/i.test(title));
}

// ───────────────────────── ADDRESSING (ADR-009 §2/§4) ─────────────────────────
//
// Unconditional, never announced, and TOTAL over its input: every helper below answers
// null when the block it addresses is absent, which is the ABSENT case — no section and
// no notice, because nothing was lost that the brief ever had. A section that IS handed
// over but cannot be represented is a different thing entirely: the compiler drops it and
// DOES announce it (§4). These live here rather than in the reader because ADR-002/§5 puts
// one policy in one home; the reader performs I/O and nothing else.

// addressItemRef(ref) — the `item` section's value. The one section whose subject is not a
// document; addressed for uniformity so that NO section value at the reader's call site is
// a raw read (FF-7010).
export function addressItemRef(ref) {
  const trimmed = String(ref ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

// addressStory(text) — `## User story` plus `## Notes`, matched CASE-INSENSITIVELY:
// three real records in this stream write `## User Story`, and a case-sensitive addresser
// drops the story section for all three (ADR-009 §7). Frontmatter and the record's
// scaffold comment sit OUTSIDE both blocks and therefore never reach the brief.
export function addressStory(text) {
  const userStory = extractH2Block(text, (title) => /^user story$/i.test(title));
  if (userStory == null) return null;
  const notes = extractH2Block(text, (title) => /^notes$/i.test(title));
  return norm(notes == null ? userStory : `${userStory.trimEnd()}\n\n${notes.trimEnd()}`);
}

// addressObjective(text) — the SPEC's `## Objective` block. Measured on this stream:
// present in all 63 specs, and 9,514 chars of whole SPEC becomes 2,639 addressed.
export function addressObjective(text) {
  return norm(extractH2Block(text, (title) => /^objective\b/i.test(title)));
}

// addressTaskContracts(bodies) — the story's `.feature` set, unchanged (the contracts ARE
// the acceptance criteria; addressing has nothing to remove). An EMPTY array is "supplied
// but empty" and stays distinct from ABSENT: the reader answers null when the story has no
// contracts at all, so there is no section and no notice claiming one was lost.
export function addressTaskContracts(bodies) {
  if (bodies == null) return null;
  const list = Array.isArray(bodies) ? bodies : [bodies];
  return norm(list);
}

// addressArchitecture(text, { declared, full }) — the declared ADR blocks, else nothing.
// A milestone brief (`full`) carries the architecture record itself; a story carries only
// the slice it declared (ADR-006). The `declared` ids ride the section value so the notice
// can name exactly which ADRs a disposition affected.
export function addressArchitecture(text, { declared = [], full = false } = {}) {
  if (full === true) {
    const whole = norm(text);
    return whole == null ? null : { full: true, text: whole };
  }
  const { ids } = normalizeAdrDeclaration(declared);
  if (ids.length === 0) return null;
  const extracted = extractAdrBlocks(text, ids);
  const parts = [
    ...extracted.blocks.map((block) => block.text),
    ...(extracted.missing.length > 0 ? [`UNRESOLVED DECLARED ADRS: ${extracted.missing.join(", ")}.`] : []),
  ];
  const joined = norm(parts.join("\n"));
  return joined == null ? null : { declared: ids, text: joined };
}

// addressFitnessRegister(text, { declared, full }) — the milestone register, and ONLY for
// a story that declared no ADR slice of its own. A declaring story's slice replaces the
// fallback; a milestone brief carries the whole record instead of duplicating the register.
export function addressFitnessRegister(text, { declared = [], full = false } = {}) {
  if (full === true) return null;
  if (normalizeAdrDeclaration(declared).ids.length > 0) return null;
  return norm(extractFitnessRegister(text));
}

// addressDependencies(text) — the `depends:` frontmatter edge, read through the ONE
// frontmatter parse above and therefore CRLF-TOLERANT by construction: 201 of 219 story
// records in this stream are CRLF and 31 of the 41 that declare `depends:` got NO
// dependencies section at all under the LF-only match this replaces (ADR-009 §7). It was
// never noticed because no fixture is CRLF.
export function addressDependencies(text) {
  const frontmatter = frontmatterBlock(text);
  if (frontmatter == null) return null;
  const match = frontmatter.match(/^\s*depends:\s*(.+)$/m);
  return match ? norm(match[1]) : null;
}

// ───────────────────────── CONDENSING (ADR-009 §2/§5) ─────────────────────────
//
// Budget-triggered, ALWAYS announced, and living here — in the pure compiler — so the
// policy sits inside the bound it serves rather than beside it (§5: one bound, one policy,
// one home). Each condenser answers null when it cannot represent the section (no
// structure to keep, or no reduction to make); otherwise it answers the reduced text, the
// FORM that survived, where the full text is read, and — for a BOUNDED condenser — its own
// count of what it left out.

// The FORM strings, together — one per form a condenser can announce. They sit in one place
// because a reader comparing them is comparing the whole set, and because a constant used
// above its declaration works only by TDZ timing.
//
// Each BOUNDED condenser has TWO: the form it announces when its own entries are listed, and
// the OPENED form it announces when none of them fitted the room whole (chore 95 for the
// architecture slice, chore 115 for the other two). The opened one is a form and not a
// footnote because the count beside it means something different under it: `1 of 4 decisions
// listed` is true of an opened passage only while the form says the passage was opened.
const TASKS_FORM = "scenario headlines and their tag lines only, without step bodies, data tables or narrative prose";
const TASKS_OPENED_FORM = "the feature and rule headlines, and the opening of the first scenario's own headline — no scenario fitted the room whole";
const ARCHITECTURE_FORM = "each declared ADR's heading and its decision passage, without the context and consequences around it";
const ARCHITECTURE_OPENED_FORM = "each declared ADR's heading, and the opening lines of the first decision passage — no passage fitted the room whole";
const FITNESS_FORM = "each register row's id and invariant only, without the instructional comment wrapping the table";
const FITNESS_OPENED_FORM = "the register's frame, and the opening lines of its first row — no row fitted the room whole";

// countClause(reduction) — ONE fact, ONE format string. A bounded condenser's count is
// stated twice: in the section's own headline (where a phase reading the contract is
// looking) and in the notice's disposition line (where a phase auditing the brief is). Two
// templates for one fact drift, so there is one, and both callers render it.
function countClause({ kept, total, omitted, unit = "entries" }) {
  if (total == null) return "";
  return omitted > 0
    ? ` ${kept} of ${total} ${unit} listed, ${omitted} omitted.`
    : ` All ${total} ${unit} listed, none omitted.`;
}

function condensationHeadline({ form, where, kept, total, omitted, unit = "entries" }) {
  return `CONDENSED — ${form}.${countClause({ kept, total, omitted, unit })} The full text is read in ${where}.`;
}

// roomFor(...) — the room a BOUNDED condenser actually has, in ONE place. Every bounded
// condenser must reserve its own WORST-CASE headline (the one that states the largest
// possible omitted count) before it starts filling, or the count could be the thing that
// pushes the section over its own budget. That reserve was hand-copied three times, and a
// fifth bounded condenser would copy it a fourth — the same shape as the two format
// strings collapsed at S6. `extra` is the architecture slice's unresolved-declaration note,
// which also ships ahead of the fill. The clamp lives here so it is applied ONCE, on every
// path into a condenser, including the direct calls the suites make.
function roomFor({ budget, form, where, total, unit, extra = 0 }) {
  const worstCase = condensationHeadline({ form, where, kept: total, total, omitted: total, unit });
  return Math.max(0, Math.trunc(budget)) - (worstCase.length + 2 + extra);
}

// condensedResult(...) — the ONE place a reduction becomes a section, and therefore the one
// place the SHRINK RULE lives: a condenser that does not shrink answers null. Stated four
// times at the end of four condensers, it was a policy enforced nowhere; a fifth condenser
// that forgot it would emit a section announcing itself CONDENSED while being longer than
// the text it claims to have reduced.
function condensedResult({ source, body, form, where, kept = null, total = null, omitted = 0, unit = "entries" }) {
  // …and the NEVER-A-HUSK rule, for the same reason and in the same home (chore 115). A
  // bounded reduction that names NONE of its own entries is a section that is present,
  // counted as carried, and empty of the thing the phase needs — F-11's shape one level down
  // from the packer. It is not a reduction, so it is not offered as one: the section is then
  // named as ABSENT (dropped, sacrificed or unshippable), where the notice points at the
  // document it is read in full — a true statement about a section that did not arrive,
  // rather than a false one about a section that did. Chore 95 stated the rule at the
  // packer's re-seat site alone, which bound one path into the condensers of five; stated
  // here it binds every path, and a sixth condenser's too.
  if (total > 0 && kept === 0) return null;
  const headline = condensationHeadline({ form, where, kept, total, omitted, unit });
  const text = `${headline}\n\n${body}`;
  if (text.length >= String(source ?? "").length) return null;
  return { text, form, where, kept, total, omitted, unit };
}

// boundedFill({ skeleton, optional, room, join }) — the ONE fill used by every BOUNDED
// condenser. The SKELETON is what names the thing (a Feature line, an ADR heading) and is
// taken first, because a list of scenarios with no feature — or a decision with no ADR id —
// names nothing. The OPTIONAL entries are then taken in document order while the room
// holds. It returns which indices survived, so the caller can emit them IN DOCUMENT ORDER
// rather than in fill order. Overshoot is impossible except for the very first entry, which
// is taken unconditionally so a bounded condenser never answers with an empty body.
function boundedFill({ skeleton, optional, room, join = 1 }) {
  const chosen = new Set();
  let used = 0;
  const take = (entry, budget) => {
    const cost = (chosen.size === 0 ? 0 : join) + entry.length;
    if (used + cost > budget) return false;
    chosen.add(entry.index);
    used += cost;
    return true;
  };
  // A skeleton that fills the room on its own leaves a contract index with no criteria and
  // a register with no rows — a section that names its subject and states nothing about it.
  // So the FIRST optional entry's room is held back while the skeleton fills — but ONLY
  // while that entry could actually claim it (chore 115). An entry larger than the WHOLE
  // room is one no fill can ever take, and holding room back for it starves the skeleton of
  // room nothing will ever spend: measured on milestone 72's ARCHITECTURE.md, three of four
  // ADR HEADINGS were lost to a reserve held for a decision passage that never fitted —
  // against that condenser's own rule that every declared heading is carried. Chore 95
  // recovered them by re-filling the architecture slice against a smaller opened entry,
  // which left the other two condensers starving; the starvation is in the reserve, so it
  // is fixed in the reserve, once, for all three.
  const wanted = optional.length > 0 ? optional[0].length + join : 0;
  const held = wanted <= room ? wanted : 0;
  for (const entry of skeleton) {
    if (!take(entry, room - held) && chosen.size === 0) take(entry, Infinity);
  }
  let kept = 0;
  for (const entry of optional) if (take(entry, room)) kept += 1;
  return { chosen, kept, used };
}

// skeletonCost(skeleton, join) — what a `boundedFill` skeleton costs when ALL of it is
// taken. A caller sizing a replacement optional entry needs the room the skeleton will
// occupy, and it must price the joins the same way `boundedFill` does or the entry it sizes
// will not be the entry that fits.
function skeletonCost(skeleton, join) {
  const bodies = skeleton.reduce((sum, entry) => sum + entry.length, 0);
  return bodies + Math.max(0, skeleton.length - 1) * join;
}

// A bounded condenser's opened form is worth carrying only while it is long enough to be
// read as a decision rather than as a fragment of one. Below this, `openingLines` answers
// null and the section keeps the honest `0 of N` it had — a two-word stub announcing itself
// as a decision would be a husk that lies about being one.
const MIN_OPENING_CHARS = 80;

// openingLines(passage, room) — as many WHOLE leading lines of a passage as `room` holds,
// ellipsed so a phase reading it can see the passage was opened and not listed. When not
// even the first line fits, the leading WORDS of it that do are carried instead: a decision
// passage in this stream is often one long paragraph on one line, so a whole-lines-only
// rule would answer null exactly where the opening is most needed. Answers null when the
// room cannot hold an opening worth reading.
function openingLines(passage, room) {
  const ellipsis = "\n…";
  const available = Math.trunc(room) - ellipsis.length;
  if (available < MIN_OPENING_CHARS) return null;
  const lines = String(passage ?? "").split("\n");
  const taken = [];
  let used = 0;
  for (const line of lines) {
    const cost = (taken.length === 0 ? 0 : 1) + line.length;
    if (used + cost > available) break;
    taken.push(line);
    used += cost;
  }
  if (taken.length === 0) {
    const words = (lines[0] ?? "").split(/(?<=\s)/);
    let partial = "";
    for (const word of words) {
      if (partial.length + word.length > available) break;
      partial += word;
    }
    partial = partial.trimEnd();
    if (partial.length < MIN_OPENING_CHARS) return null;
    return `${partial}${ellipsis}`;
  }
  return `${taken.join("\n").trimEnd()}${ellipsis}`;
}

// boundedFillOrOpen({ skeleton, optional, room, openedRoom, join, passage, pad }) — the ONE
// never-a-husk retry, shared by all three bounded condensers (chore 95 for the architecture
// slice, generalised at chore 115).
//
// An optional entry is taken WHOLE or not at all, so on a record whose every entry is larger
// than the room the packer left, "not at all" is every one of them: the section arrives
// announcing `0 of 4 decisions listed` and names none of them. So when NO entry fitted, the
// FIRST is offered again OPENED — as many of its leading lines as the room holds, cut at a
// line (or, failing that, a word) boundary and ellipsed so a phase can see it was opened
// rather than listed. The others are not re-offered: they did not fit whole, and a second
// pass at them would find the same. The count then says `1 of 4`, and the caller announces
// the OPENED form, so the count stays honest because the form it counts in changed with it.
//
// `passage` is what to open — the entry's own text, or the part of it that NAMES the entry
// (a contract's scenario is named by its headline, not by the tag lines above it). `pad` is
// what the caller's own layout adds around the entry, priced the way its listed form was, or
// the entry this re-fills is not the entry the caller emits.
function boundedFillOrOpen({ skeleton, optional, room, openedRoom, join = 1, passage, pad = 0 }) {
  const fill = boundedFill({ skeleton, optional, room, join });
  if (fill.kept > 0 || optional.length === 0) return { fill, opened: null };
  const opened = openingLines(passage, openedRoom - skeletonCost(skeleton, join) - join);
  if (opened == null) return { fill, opened: null };
  return {
    opened,
    fill: boundedFill({
      skeleton,
      optional: [{ index: optional[0].index, length: opened.length + pad }],
      room: openedRoom,
      join,
    }),
  };
}

// condenseStory(text, options) — the `## User story` block alone, dropping `## Notes`.
// Measured on this stream: 3,108 -> 715.
//
// `options.budget` is ACCEPTED AND IGNORED, deliberately. `story` is not a bounded
// condenser (ADR-010 §1): its reduction selects a BLOCK, not a list, so its output is a
// function of its input alone and no amount of extra room buys more of it. The parameter
// exists because every member of `BRIEF_SECTION_CONDENSERS` is invoked through the one
// call site in `condenseSection` as `condenser(text, { budget })` — a member of a frozen
// map that quietly differs in arity from its siblings works only by JS's tolerance of
// extra arguments, and is exactly what a fifth condenser would copy wrongly.
export function condenseStory(text, options = {}) {
  void options;
  const source = String(text ?? "");
  const userStory = norm(extractH2Block(source, (title) => /^user story$/i.test(title)));
  if (userStory == null) return null;
  return condensedResult({
    source,
    body: userStory,
    form: "the user story block alone, without the record's notes",
    where: BRIEF_SECTION_SOURCES.story,
  });
}

// GHERKIN_HEADLINE — the four structural headlines a contract set condenses to. A phase's
// acceptance criteria as a scenario-title index IS the contract in the sense that matters
// to a brief: it names what must be satisfied, in the author's own exact words, and is
// addressable for the detail. Embedding 12 KB of steps would buy detail the phase can read
// at need and cost it the architecture it cannot.
const GHERKIN_HEADLINE = /^[ \t]*(Feature|Rule|Scenario Outline|Scenario):/;
const GHERKIN_TAGS = /^[ \t]*@\S/;

function gherkinUnits(source) {
  const units = [];
  let pending = [];
  for (const line of source.split(/\r?\n/)) {
    if (GHERKIN_TAGS.test(line)) { pending.push(line); continue; }
    const headline = GHERKIN_HEADLINE.exec(line);
    if (headline != null) {
      units.push({ kind: headline[1], lines: [...pending, line] });
      pending = [];
      continue;
    }
    if (line.trim() !== "") pending = [];
  }
  return units;
}

// The line that NAMES a scenario, which is the LAST of its unit's lines — the tag lines
// carrying its verification lane sit above it. What a bounded opening of a scenario opens.
function headlineOf(unit) {
  return unit == null ? "" : unit.text.split("\n").at(-1);
}

// condenseTaskContracts(text, { budget }) — headlines and TAG LINES only: `Feature:`,
// `Rule:`, `Scenario:` and `Scenario Outline:`, each with the tags that carry its
// verification lane. Measured on this stream: 13% of full size (12,310 -> 1,555).
//
// BOUNDED, and a bounded condenser STATES ITS OWN COUNT. Measured over all 211 stories
// here that have contracts, the headline condenser carries the contract for 202 and still
// overflows for 9 (43/04 at 121,805 -> 11,463; 53/05 at 130,894 -> 10,576). There is no
// single-stage condenser that fits those at 8,000 chars, and pretending otherwise is how a
// contract comes to lie. So it carries as many scenarios as the budget holds and says how
// many it left out and where they are read — NEVER a silent prefix.
export function condenseTaskContracts(text, { budget = PHASE_BRIEF_MAX_CHARS } = {}) {
  const source = String(text ?? "");
  const units = gherkinUnits(source);
  if (units.length === 0) return null;
  const total = units.filter((unit) => unit.kind === "Scenario" || unit.kind === "Scenario Outline").length;
  const room = roomFor({ budget, form: TASKS_FORM, where: BRIEF_SECTION_SOURCES.tasks, total });
  const blocks = units.map((unit, index) => ({ index, kind: unit.kind, text: unit.lines.join("\n") }));
  // The Feature/Rule headlines are the contract's SKELETON — a list of scenarios with no
  // feature to hang them on names nothing — so they are filled first; only the scenarios
  // are bounded, and the count below says exactly how many were left out.
  const isScenario = (block) => block.kind === "Scenario" || block.kind === "Scenario Outline";
  const sized = (block) => ({ index: block.index, length: block.text.length });
  const scenarios = blocks.filter(isScenario);
  // NEVER A HUSK (chore 115). What is opened is the first scenario's own HEADLINE and not
  // its whole block: the block LEADS with its tag lines, so an opening cut from the block
  // would spend the room on `@executable @cli` and name no scenario at all — a husk wearing
  // a count of 1, and a stated count that no longer matches the titles under it.
  const { fill, opened } = boundedFillOrOpen({
    skeleton: blocks.filter((block) => !isScenario(block)).map(sized),
    optional: scenarios.map(sized),
    room,
    openedRoom: roomFor({ budget, form: TASKS_OPENED_FORM, where: BRIEF_SECTION_SOURCES.tasks, total }),
    passage: headlineOf(scenarios[0]),
  });
  const { chosen, kept } = fill;
  const body = blocks
    .filter((block) => chosen.has(block.index))
    .map((block) => (opened != null && block.index === scenarios[0].index ? opened : block.text))
    .join("\n");
  if (body.trim().length === 0) return null;
  return condensedResult({
    source,
    body,
    form: opened != null && kept > 0 ? TASKS_OPENED_FORM : TASKS_FORM,
    where: BRIEF_SECTION_SOURCES.tasks,
    kept,
    total,
    omitted: total - kept,
    unit: "scenarios",
  });
}

// The bold labels that open an ADR's own sub-sections. A decision passage runs from
// `**Decision.**` to the next such label (or the end of the block) — never to the next
// bold SENTENCE, which is prose and does appear inside a decision.
const ADR_SECTION_LABEL = /^\*\*(Status|Context|Decision|Consequences|Alternatives[^*]*)\.?\*\*/;

// The line `addressArchitecture` emits for an id it could not resolve in the document.
const UNRESOLVED_DECLARATION = /^UNRESOLVED DECLARED ADRS:/;

// condenseArchitectureSlice(text, { budget }) — each declared ADR's heading and its
// `**Decision.**` passage, dropping the context and consequences around each decision.
//
// ALSO BOUNDED, under §2's general rule ("a condenser MAY itself be bounded, and a bounded
// condenser states its own count… counting what was omitted is what keeps it honest at any
// size"), and for the same measured reason the contract condenser is. On this repo's own
// data 70/05's declared slice — ADR-002 + ADR-003 + ADR-009 — is 17,401 chars whole and
// 10,870 condensed, still past the whole ceiling; unbounded, the ONE story in the stream
// that declares its ADRs would receive none of them. Every declared ADR's HEADING is
// always carried, because which decisions bind a story is the fact a phase must not lose;
// the decision passages are what the budget bounds, and the count says how many were left.
export function condenseArchitectureSlice(text, { budget = PHASE_BRIEF_MAX_CHARS } = {}) {
  const source = String(text ?? "");
  const headings = structuralH2Headings(source);
  if (headings.length === 0) return null;
  // ONE traversal of the source, and the unresolved-declaration note is lifted OUT of it
  // before the per-block decision scan rather than collected by a second pass over the
  // whole document. The second pass was not merely a repeated traversal: when the last
  // ADR's final labelled block is `**Decision.**`, the trailing note is swept into that
  // decision passage by the `inDecision` scan AND appended again by the collector, and the
  // brief states it twice. (Cosmetic — wasted budget, not a lie — and with no witness on
  // today's stream; reproduced on a constructed one.)
  //
  // The note itself must survive: "the id you declared is not in this document" is exactly
  // the fact a phase must not lose, and it carries no heading of its own to be filed under.
  // The colon matches the exact prefix `addressArchitecture` emits, so a line that merely
  // begins with those words is not mistaken for the note itself.
  const unresolved = [];
  const lines = [];
  for (const match of source.matchAll(/.*(?:\r?\n|$)/g)) {
    if (match[0] === "") continue;
    const line = match[0].replace(/\r?\n$/, "");
    if (UNRESOLVED_DECLARATION.test(line)) unresolved.push(line);
    else lines.push({ text: line, start: match.index });
  }
  // Lines and headings are both in ascending source order, so each line is filed under its
  // heading in one merge rather than by re-slicing the document per block. Lines before the
  // first heading belong to no block and are dropped, exactly as slicing from `heading.start`
  // dropped them.
  const grouped = headings.map(() => []);
  let at = 0;
  for (const line of lines) {
    while (at + 1 < headings.length && line.start >= headings[at + 1].start) at += 1;
    if (line.start >= headings[at].start) grouped[at].push(line.text);
  }
  const blocks = grouped.map((within, index) => {
    const decision = [];
    let inDecision = false;
    for (let i = 1; i < within.length; i += 1) {
      const label = ADR_SECTION_LABEL.exec(within[i]);
      if (label != null) inDecision = label[1] === "Decision";
      if (inDecision) decision.push(within[i]);
    }
    return { index, heading: (within[0] ?? "").trimEnd(), decision: decision.join("\n").trimEnd() };
  });
  const withDecision = blocks.filter((block) => block.decision.length > 0);
  const total = withDecision.length;
  const skeleton = blocks.map((block) => ({ index: block.index, length: block.heading.length }));
  // The room is a function of the FORM announced, and this condenser has two — so it is
  // priced per form, at the fill that uses it, rather than once at the worst case. Reserving
  // the longer headline unconditionally costs 17 chars on every architecture section in the
  // stream, and a bounded fill is granular: measured, those 17 chars cost m08's refine brief
  // a whole 2,865-char decision passage it had been carrying. A path nothing takes pays
  // nothing.
  const roomForForm = (form) => roomFor({
    budget, form, where: BRIEF_SECTION_SOURCES.architecture,
    total, unit: "decisions", extra: unresolved.join("\n").length + 2,
  });
  const { fill, opened } = boundedFillOrOpen({
    skeleton,
    optional: withDecision.map((block) => ({ index: -1 - block.index, length: block.decision.length + 1 })),
    room: roomForForm(ARCHITECTURE_FORM),
    openedRoom: roomForForm(ARCHITECTURE_OPENED_FORM),
    join: 2,
    // The heading and its passage are emitted as one part joined by a newline, so the
    // passage costs one more char than it measures — the listed fill above prices it the
    // same way, and an opened entry priced differently would not be the entry that fits.
    passage: withDecision[0]?.decision ?? "",
    pad: 1,
  });
  const { chosen, kept } = fill;

  const parts = [];
  for (const block of blocks) {
    if (!chosen.has(block.index)) continue;
    if (!chosen.has(-1 - block.index)) { parts.push(block.heading); continue; }
    const passage = opened != null && block.index === withDecision[0].index ? opened : block.decision;
    parts.push(`${block.heading}\n${passage}`);
  }
  const body = [...parts, ...unresolved].filter((entry) => entry.trim().length > 0).join("\n\n");
  if (body.trim().length === 0) return null;
  return condensedResult({
    source,
    body,
    form: opened != null && kept > 0 ? ARCHITECTURE_OPENED_FORM : ARCHITECTURE_FORM,
    where: BRIEF_SECTION_SOURCES.architecture,
    kept,
    total,
    omitted: total - kept,
    unit: "decisions",
  });
}

// condenseFitnessRegister(text, { budget }) — each register row's ID AND INVARIANT, not the
// row whole, and without the instructional comment wrapping the table. Stripping the
// comment ALONE is a near no-op outside this milestone (m43 5,210 -> 5,209), which is why
// the columns are what the condenser reduces.
export function condenseFitnessRegister(text, { budget = PHASE_BRIEF_MAX_CHARS } = {}) {
  const source = String(text ?? "");
  const withoutComments = source.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
  // A register row is written one of TWO ways in this stream, and both are rows: a markdown
  // TABLE row (whose remaining columns are what the reduction drops) and a numbered/bulleted
  // LIST entry (which has no columns to drop, so the entry is carried whole and the COUNT is
  // the reduction). m38's 30,461-char register and m35's 13,790 are list-shaped; a
  // table-only reader answers null for both and makes them unshippable, which is a defect of
  // the reader rather than a fact about the register.
  const entries = [];
  const lines = withoutComments.split(/\r?\n/);
  let separated = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (/^##[ \t]/.test(line)) { entries.push({ kind: "frame", text: line.trimEnd() }); continue; }
    if (trimmed.startsWith("|")) {
      const cells = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
      if (cells.length > 1 && cells.every((cell) => /^:?-{2,}:?$/.test(cell))) {
        if (!separated) { entries.push({ kind: "frame", text: "|---|---|" }); separated = true; }
        continue;
      }
      entries.push({ kind: "row", text: `| ${cells.slice(0, 2).join(" | ")} |` });
      continue;
    }
    if (!/^[ \t]{0,3}(?:\d+[.)]|[-*+])[ \t]+\S/.test(line)) continue;
    const entry = [line.trimEnd()];
    while (index + 1 < lines.length) {
      const next = lines[index + 1];
      if (next.trim() === "") { if (!/^[ \t]+\S/.test(lines[index + 2] ?? "")) break; }
      else if (!/^[ \t]+\S/.test(next)) break;
      entry.push(next.trimEnd());
      index += 1;
    }
    entries.push({ kind: "row", text: entry.join("\n").trimEnd() });
  }
  const total = entries.filter((entry) => entry.kind === "row").length;
  if (total === 0) return null;
  // ALSO BOUNDED, for the same measured reason as the contract and the ADR slice: m53's
  // register is 39,771 chars and 28,801 with only its ids and invariants, and m52's is
  // 13,041 — so unbounded, the 30 stories of this stream's two largest milestones would
  // receive NO structural constraints at all, which is the F-11 shape by another route.
  const indexed = entries.map((entry, index) => ({ ...entry, index, length: entry.text.length }));
  const rows = indexed.filter((entry) => entry.kind === "row");
  // NEVER A HUSK (chore 115), by the retry the architecture slice already uses. A
  // list-shaped register's rows run to hundreds of chars each — m38's is 30,461 over its
  // rows — so a tight budget is exactly where every row is larger than the room left and the
  // section arrives naming none of them. A row LEADS with its id, so its opening names the
  // row it opens, and no reordering is needed to make the opening worth reading.
  const { fill, opened } = boundedFillOrOpen({
    skeleton: indexed.filter((entry) => entry.kind === "frame"),
    optional: rows,
    room: roomFor({ budget, form: FITNESS_FORM, where: BRIEF_SECTION_SOURCES.fitness, total, unit: "rows" }),
    openedRoom: roomFor({ budget, form: FITNESS_OPENED_FORM, where: BRIEF_SECTION_SOURCES.fitness, total, unit: "rows" }),
    passage: rows[0]?.text ?? "",
  });
  const { chosen, kept } = fill;
  const body = indexed
    .filter((entry) => chosen.has(entry.index))
    .map((entry) => (opened != null && entry.index === rows[0].index ? opened : entry.text))
    .join("\n");
  if (body.trim().length === 0) return null;
  return condensedResult({
    source,
    body,
    form: opened != null && kept > 0 ? FITNESS_OPENED_FORM : FITNESS_FORM,
    where: BRIEF_SECTION_SOURCES.fitness,
    kept,
    total,
    omitted: total - kept,
    unit: "rows",
  });
}

// ───────────── THE TWO FROZEN DECLARATIONS (FF-7009, ADR-009 §2) ─────────────
//
// A section's reduction is DECLARED, one way or the other. Their union is exactly
// BRIEF_SECTION_PRIORITY and their intersection is empty, so an eighth section without a
// declared reduction fails on its first commit rather than becoming silently
// droppable-for-size-alone BY OMISSION — which is precisely what let drop-whole hide.
export const BRIEF_SECTION_CONDENSERS = Object.freeze({
  story: condenseStory,
  tasks: condenseTaskContracts,
  architecture: condenseArchitectureSlice,
  fitness: condenseFitnessRegister,
});

// Declared NON-condensable, each for a stated reason:
//   item         — ~50 chars, and never sacrificed either (ADR-003's never-empty guarantee)
//   objective    — addressing to `## Objective` IS its whole reduction (9,514 -> 2,639)
//   dependencies — already an edge list, one line
export const BRIEF_NON_CONDENSABLE_SECTIONS = Object.freeze(["item", "objective", "dependencies"]);

// The BOUNDED condensers, declared by name so the packer can hand each the room actually
// left rather than a guess. A bounded condenser absorbs the slack; every other condenser's
// output is a function of its input alone.
export const BRIEF_BOUNDED_CONDENSERS = Object.freeze(["tasks", "architecture", "fitness"]);

// ───────────────────────── assembly ─────────────────────────

// The sections whose rule is exactly "normalise the input; if anything is left, that is the
// section". Written once as a list rather than four times as the same two lines, so a fifth
// such section is one entry and not one more copy. `item`, `tasks` and `architecture` are
// each special-cased below, for the reasons stated there.
const PLAIN_SECTIONS = Object.freeze(["story", "objective", "fitness", "dependencies"]);

function buildSectionTexts(inputs) {
  const out = {};
  out.item = { id: "item", title: SECTION_TITLES.item, text: `Item: ${inputs.itemRef}` };
  for (const id of PLAIN_SECTIONS) {
    const text = norm(inputs[id]);
    if (text != null) out[id] = { id, title: SECTION_TITLES[id], text };
  }
  // ABSENT vs SUPPLIED-BUT-EMPTY (ADR-009 §4). A caller that hands over no contract set at
  // all gets NO section and no notice claiming one was lost; a caller that hands over an
  // EMPTY set gets a section declaring it empty, because a phase must know it has nothing
  // to satisfy rather than assume the brief lost it.
  if (inputs.tasks != null) {
    const tasks = norm(inputs.tasks);
    out.tasks = { id: "tasks", title: SECTION_TITLES.tasks, text: tasks ?? "The task contract set is empty." };
  }
  const architectureValue = inputs.architecture;
  const architecture = norm(
    architectureValue != null && typeof architectureValue === "object" && !Array.isArray(architectureValue)
      ? architectureValue.text
      : architectureValue,
  );
  if (architecture != null) {
    const declared = normalizeAdrDeclaration(architectureValue?.declared).ids;
    out.architecture = {
      id: "architecture",
      title: architectureValue?.full === true
        ? "ARCHITECTURE DECISIONS (full milestone record)"
        : SECTION_TITLES.architecture,
      text: architecture,
      // The ADR ids the STORY DECLARED — not ids that were dropped. `sectionName` renders
      // them onto every disposition line, `CONDENSED` included, where nothing was dropped
      // at all; the old name said the opposite of what the line means.
      declaredNames: declared,
    };
  }
  return out;
}

function renderSection(section) {
  return `## ${section.title}\n${section.text}`;
}

function renderSections(sections) {
  return sections.map(renderSection).join("\n\n");
}

function headerLength(section) {
  return renderSection(section).length - section.text.length;
}

// condenseSection(section, budget) — the ONE dispatch into the declared condenser map. A
// section with no declared condenser is non-condensable BY DECLARATION, never by omission.
function condenseSection(section, budget) {
  const condenser = BRIEF_SECTION_CONDENSERS[section.id];
  if (condenser == null) return null;
  // No clamp here: `roomFor` applies the one clamp, on every path into a condenser
  // including the direct calls the suites make.
  const result = condenser(section.text, { budget });
  if (result == null) return null;
  return { ...result, section: { ...section, text: result.text } };
}

const DISPOSITION_LABELS = Object.freeze({
  condensed: "CONDENSED (shortened to fit — still carried)",
  sacrificed: "SACRIFICED (given up to make room — not carried)",
  unshippable: "UNSHIPPABLE (over the ceiling in every declared form — not carried)",
  shortened: "SHORTENED (cut to fit the ceiling)",
});

// sourceOf(id) — "where the full text is read", in ONE place. It was rendered at three
// sites with two different fallbacks — prose said "the item's own documents" while the
// machine-readable `where` key said `null` — so a section missing from
// BRIEF_SECTION_SOURCES would have shipped a notice a phase could act on beside a
// disposition the writer's own self-check REFUSES (`conformsToCompilerOutput` requires a
// non-empty string). It cannot fire today, because FF-7009 asserts all seven are declared;
// it is the divergence-by-second-copy shape ADR-009 §7 is written about, and the same
// shape as the CRLF split fixed at S7. One reader of one fact, and `where` is a non-empty
// string by construction.
function sourceOf(id) {
  return BRIEF_SECTION_SOURCES[id] ?? "the item's own documents";
}

function sectionName(section) {
  const title = section.title ?? SECTION_TITLES[section.id] ?? section.id;
  return section.declaredNames?.length > 0 ? `${title}: ${section.declaredNames.join(", ")}` : title;
}

// buildNotice(report) — the truncation statement a phase can act on. It says the brief WAS
// truncated, keeps the literal "Dropped or shortened:" roll-call that two delivered suites
// assert, and ADDS — never substitutes — one labelled line per section naming its
// disposition distinguishably, the form that survived, its own count where a bounded
// condenser left something out, and where the full text is read (ADR-009 §6).
//
// THE LEADING CLAUSE IS CONDITIONAL, because "was truncated by section priority" is a
// CLAIM and not always a true one. Truncation by priority is what SACRIFICE (and the
// last-resort shortening of the item ref) does; a brief whose only reductions are
// CONDENSATION and UNSHIPPABLE was never cut by priority at all — measured at review, an
// unshippable-only brief stated it at 1,384 chars, five-sixths under the ceiling it claimed
// to have exceeded. ADR-003's writer-refuses-a-lie governs the notice as much as the
// payload. `TRUNCATED` and `Dropped or shortened: ` are VERBATIM in both forms — they are
// the substrings the delivered suites assert.
function buildNotice(report, maxChars = PHASE_BRIEF_MAX_CHARS) {
  if (report.length === 0) return null;
  const names = report.map((entry) => sectionName(entry.section));
  const listed = names.length === 1 ? names[0] : names.join(", ");
  const byPriorityCut = report.some((entry) => entry.disposition === "sacrificed" || entry.disposition === "shortened");
  const cause = byPriorityCut
    ? `this brief exceeded its ${PHASE_BRIEF_MAX_CHARS}-char ceiling and was truncated by section priority`
    : `this brief was reduced to fit its ${PHASE_BRIEF_MAX_CHARS}-char ceiling, and no section was truncated by section priority`;
  const prefix = `TRUNCATED: ${cause}. The retained sections are complete as far as they go. Dropped or shortened: `;
  const suffix = ".";
  const head = `${prefix}${listed}${suffix}`;
  const lines = report.map((entry) => `${DISPOSITION_LABELS[entry.disposition]}: ${sectionName(entry.section)} — ${entry.detail}`);
  const whole = [head, ...lines].join("\n");
  if (whole.length <= maxChars) return whole;
  for (let take = lines.length - 1; take >= 0; take -= 1) {
    const candidate = [head, ...lines.slice(0, take)].join("\n");
    if (candidate.length <= maxChars) return candidate;
  }
  const available = Math.max(0, maxChars - prefix.length - suffix.length);
  const boundedList = listed.length <= available
    ? listed
    : available <= 1 ? "" : `${listed.slice(0, available - 1)}…`;
  return `${prefix}${boundedList}${suffix}`.slice(0, maxChars);
}

function renderCompleteContext(text, notice) {
  return notice == null ? text : `${text}\n\n${notice}`;
}

// reportRows(plan) — the dispositions of ONE assembled brief, in the order the notice
// states them: what was shortened but kept, then what was given up, then what could never
// be carried. The ONE place a disposition is turned into words, so `assemble` (which needs
// the notice's length before it can hand a bounded condenser its room) and
// `compilePhaseBrief` (which needs the notice itself) can never disagree about it.
function reportRows({ retained, condensations, sacrificed = [], unshippable = [], shortened = [] }) {
  const rows = [];
  for (const section of retained) {
    const reduction = condensations.get(section.id);
    if (reduction == null) continue;
    rows.push({
      section,
      disposition: "condensed",
      // The SAME formatter the section's own headline uses (S6): one fact, one format
      // string. A second template here would be ~600 chars of an 8,000-char budget spent
      // saying the same thing twice, in words that can drift apart.
      detail: `${reduction.form}.${countClause(reduction)} Read the full text in ${reduction.where}.`,
    });
  }
  for (const section of sacrificed) {
    rows.push({
      section,
      disposition: "sacrificed",
      detail: `it could have been carried, and was given up to make room once the higher-priority sections were placed. Read it in ${sourceOf(section.id)}.`,
    });
  }
  for (const section of unshippable) {
    rows.push({
      section,
      disposition: "unshippable",
      detail: `even its smallest declared form exceeds the whole ${PHASE_BRIEF_MAX_CHARS}-char ceiling, so nothing below it was given up on its account. Read it in ${sourceOf(section.id)}.`,
    });
  }
  for (const section of shortened) {
    rows.push({
      section,
      disposition: "shortened",
      detail: `it alone exceeds the whole ${PHASE_BRIEF_MAX_CHARS}-char ceiling and was cut so the brief still names its subject.`,
    });
  }
  return rows;
}

// assemble(sections) — the ceiling enforcement, IN THE WRITER (ADR-003, amended by
// ADR-009 §3). Two stages, in this order and no other:
//
//   1. UNSHIPPABLE. A section whose SMALLEST declared form still exceeds the whole
//      ceiling — or which cannot be represented at all — is skipped IN PLACE. It frees
//      nothing, so it never cascades onto the sections below it. This is the disposition
//      70/00 never contemplated, and the reason its "lowest-priority first" sentence now
//      governs SACRIFICE alone.
//   2. PLACE, in declared priority order, CONDENSING before anything is sacrificed. Each
//      section may take everything left EXCEPT the smallest declared form of the sections
//      below it. A section that fits whole in what is left is carried whole; one that does
//      not is offered its condenser, and a BOUNDED condenser is handed exactly the room
//      there is. Leaving room for what is below is what stops the contract index from
//      eating the register (measured: it left 41 real stories with no constraints at all)
//      and what stops the register from eating the contract (measured: 12 real stories
//      whose condensed contract then named ZERO of their own scenarios).
//
// This is NOT the per-section reserved budget ADR-009 rejects: nothing is reserved for a
// section that is absent, no floor is fixed in advance, and a section over its share is
// condensed rather than dropped whole.
//
// The caller performs the third stage — bottom-up SACRIFICE — because it alone knows the
// length of the notice, which is part of what actually ships. The budget counts the
// RENDERED length (headers + the "\n\n" joins), never the body-only text.
// `carried` — reductions performed OUTSIDE this plan, by the ADR-010 §4 exhaustion pass.
// They are already in the section text handed in, but the NOTICE still owes each one a
// line, and the reserve loop below is the only thing that knows how to buy it. A plan
// that priced the sections without pricing the sentences announcing them would fit on
// paper and overflow on the wire — measured at 8,166 against 8,000 before this argument
// existed, which then cost two sections to a sacrifice that had nothing to do with them.
// `sacrificed` — sections ALREADY given up by the caller's settlement (chore 95). They are
// not planned here and take no room, but each still owes the notice a line, and the reserve
// loop is the only thing that buys those. A re-plan over the survivors that priced only its
// own sentences would hand the bounded condensers room the sacrifice notice was already
// spending.
function assemble(sections, carried = new Map(), sacrificed = []) {
  const ceiling = PHASE_BRIEF_MAX_CHARS;
  const entries = sections.map((section) => {
    const header = headerLength(section);
    // A section the ADR-010 §4 exhaustion pass has already reduced is IN ITS FINAL FORM and
    // is offered no second reduction: a re-plan never condenses a condensed section, and
    // never emits a doubled headline. The set of such sections is `carried` itself, so the
    // guard is read from the plan's own argument rather than from a flag written onto the
    // section — packer control state does not ride out on a shipped object.
    const best = carried.has(section.id) ? null : condenseSection(section, ceiling - header);
    // A BOUNDED condenser is elastic: its size is whatever room it is given. Its FLOOR —
    // what it costs when given none — is what the packing plan must reserve for it, or a
    // bounded section's at-ceiling size would look like a reason to condense the sections
    // around it that fit perfectly well.
    const bounded = BRIEF_BOUNDED_CONDENSERS.includes(section.id) && !carried.has(section.id);
    const floor = bounded ? condenseSection(section, 0) : best;
    return {
      section,
      header,
      bounded,
      full: renderSection(section).length,
      best,
      bestLength: best == null ? Infinity : header + best.text.length,
      floorLength: floor == null ? Infinity : header + floor.text.length,
    };
  });

  // 1. UNSHIPPABLE, in place — measured against the WHOLE ceiling, never against what is
  //    left after something else was placed. A section is unshippable because of its own
  //    size, not because of its neighbours', which is exactly what stops it cascading.
  //
  //    "Over the ceiling in EVERY DECLARED FORM" is the definition, so every declared form
  //    is what it is measured against — the whole text, the floor, AND the best (chore 115).
  //    The floor alone was enough while a bounded condenser answered at every budget: less
  //    room always bought a smaller form, so the floor was the smallest form there was. It no
  //    longer is. A condenser now DECLINES the room in which it could name none of its own
  //    entries, so a contract that condenses to five scenarios at its real room has no floor
  //    at all — and priced on the floor alone it was called unshippable and left out of the
  //    brief entirely, which is a worse answer than the husk this chore set out to remove.
  const live = [];
  const unshippable = [];
  for (const entry of entries) {
    const smallest = Math.min(entry.full, entry.floorLength, entry.bestLength);
    if (entry.section.id !== "item" && smallest > ceiling) unshippable.push(entry);
    else live.push(entry);
  }

  // What a section BELOW needs, and what a section above must therefore leave it: the
  // smaller of its full size and its best condensed size — the size of its best
  // full-quality form — CAPPED at an equal share of the budget. The cap is what stops a
  // large lower section from condensing everything above it; the need is what stops a
  // higher section from taking so much that the one below becomes a husk. Both failures
  // were measured on this repo's own stream before the cap existed: 41 stories with no
  // structural constraints at all, and 12 whose condensed contract named ZERO of their own
  // scenarios because a 6,400-char story record had taken the room.
  const neededOf = (entry) => Math.min(entry.full, entry.bestLength);

  const plan = (reserve) => {
    const target = ceiling - reserve;
    const share = Math.max(0, Math.floor(target / Math.max(1, live.length)));
    const retained = [];
    const condensations = new Map();
    let used = 0;
    for (let index = 0; index < live.length; index += 1) {
      const entry = live[index];
      const below = live.slice(index + 1);
      const join = retained.length === 0 ? 0 : 2;
      const available = target - used - join - (below.length * 2)
        // THE CAP BINDS ONLY WHAT CAN BE CONDENSED TO IT (ADR-010 §2). A section that CAN
        // be reduced to its share is priced at the share; one that CANNOT reserves its
        // WHOLE size, because it will take its whole size regardless — capping it prices
        // the sections above against a fiction, and they are then handed room that is not
        // there. Measured: five real refine briefs carried a TASK CONTRACTS section naming
        // ZERO of its scenarios, because a non-condensable `objective` was reserved at an
        // equal share, `story` above it fitted the room that fiction left, and everything
        // below paid for the difference at the placement stage — a brief that FITS, so
        // §4's exhaustion pass never sees it.
        - below.reduce((sum, other) => sum + (other.best == null ? other.full : Math.min(neededOf(other), share)), 0);
      if (entry.full <= available || entry.best == null) {
        retained.push(entry.section);
        used += join + entry.full;
        continue;
      }
      const reduction = condenseSection(entry.section, available - entry.header) ?? entry.best;
      retained.push(reduction.section);
      used += join + entry.header + reduction.text.length;
      condensations.set(entry.section.id, { id: entry.section.id, ...reduction });
    }
    // Seed the reductions this plan did not perform, so the reserve loop prices their
    // notice lines exactly as it prices its own.
    for (const section of retained) {
      const done = carried.get(section.id);
      if (done != null && !condensations.has(section.id)) {
        condensations.set(section.id, { id: section.id, ...done });
      }
    }
    return { retained, condensations, unshippable: unshippable.map((item) => item.section) };
  };

  // The notice SHIPS with the sections, so the room a bounded condenser may absorb is the
  // room left AFTER it. Reserving for it is what keeps the contract and the architecture
  // slice in the brief instead of buying them and then sacrificing one to pay for the
  // sentence announcing the other. The reserve is itself a function of the plan — a plan
  // that condenses one more section states one more line — so it is re-derived until it
  // stops growing. Monotone and bounded by the section count, so it settles in a round or
  // two; the caller's bottom-up sacrifice remains the guarantee of last resort. The
  // 16-char slack covers the counts' own digits shifting as the fill changes.
  let reserve = 0;
  let result = plan(0);
  for (let round = 0; round < live.length + 1; round += 1) {
    const notice = buildNotice(reportRows({ ...result, sacrificed }));
    const needed = notice == null ? 0 : notice.length + 2 + 16;
    if (needed <= reserve) break;
    reserve = needed;
    result = plan(reserve);
  }
  return result;
}

// ───────────── TWO PREDICATES, BECAUSE THERE ARE TWO QUESTIONS ─────────────
//
// One predicate cannot answer both, and 70/00 shipped one that tried. The questions:
//
//   EMBED-ADMISSION (ADR-001, absence stays benign) — "is this supplied context worth
//     typing into the session?" Asked by the driver's compose seam about a context it did
//     not build and may not have compiled at all. It must be PERMISSIVE: a hand-built
//     minimal context is still worth embedding, and a key it does not carry is an absence,
//     not a fault. That is `isValidPhaseBrief`, exported, exactly as shipped.
//
//   SELF-REFUSAL (ADR-003, the writer refuses a lie) — "did I just produce a conforming
//     brief?" Asked by `compilePhaseBrief` about its OWN output, which always emits
//     `condensed`, `sacrificed`, `unshippable` and `dispositions`. It must be STRICT: a
//     compiler that stops emitting a key it declares is a defect, and a check that admits
//     the absence verifies nothing about it. That is `conformsToCompilerOutput`, private.
//
// Relaxing the shared predicate to serve the seam is correct for the seam and a silent loss
// at the writer; splitting is what keeps both halves true at once.

// isValidPhaseBrief(context) — the EMBED-ADMISSION predicate (ADR-001/ADR-002). Conformance
// over the declared brief shape, permissive about the additive disposition keys, and the
// one the driver's compose seam calls.
export function isValidPhaseBrief(context) {
  const complete = context != null && typeof context.text === "string"
    ? renderCompleteContext(context.text, context.truncated ? context.notice : null)
    : "";
  return (
    context != null
    && typeof context === "object"
    && typeof context.itemRef === "string" && context.itemRef.length > 0
    && typeof context.phase === "string" && context.phase.length > 0
    && Array.isArray(context.sections)
    && typeof context.truncated === "boolean"
    && Array.isArray(context.dropped)
    // The three dispositions ride ADDITIVELY beside `dropped` (ADR-001's posture for an
    // added key, kept): a context that carries them must carry them as arrays, and one
    // that carries none is still conforming — the compiler always emits them, and a
    // hand-built minimal context is still worth embedding.
    && (context.condensed === undefined || Array.isArray(context.condensed))
    && (context.sacrificed === undefined || Array.isArray(context.sacrificed))
    && (context.unshippable === undefined || Array.isArray(context.unshippable))
    && (context.dispositions === undefined || Array.isArray(context.dispositions))
    && (context.notice === null || typeof context.notice === "string")
    && (context.truncated
      ? typeof context.notice === "string" && context.notice.length > 0
      : context.notice === null)
    && typeof context.chars === "number"
    && context.chars === complete.length
    && context.chars <= PHASE_BRIEF_MAX_CHARS
    && context.ceiling === PHASE_BRIEF_MAX_CHARS
    && typeof context.text === "string"
    && context.text.length > 0
  );
}

function byPriority(a, b) {
  return BRIEF_SECTION_PRIORITY.indexOf(a) - BRIEF_SECTION_PRIORITY.indexOf(b);
}

// DERIVED from the labels, not a second literal copy of them: a fifth disposition added to
// one and not the other would be rendered by the notice and refused by the writer's own
// self-check, or the reverse.
const DISPOSITION_KINDS = Object.freeze(Object.keys(DISPOSITION_LABELS));

// conformsToCompilerOutput(context) — the WRITER's own self-check (ADR-003). Everything
// `isValidPhaseBrief` admits, PLUS the four keys this compiler always emits and the
// agreement between them: every disposition names a declared section, states one of the
// declared kinds, carries the words a phase acts on, and points at where the full text is
// read. Nothing here is optional, because nothing here is optional in what this function
// returns.
function conformsToCompilerOutput(context) {
  if (!isValidPhaseBrief(context)) return false;
  const declared = new Set(BRIEF_SECTION_PRIORITY);
  const lists = [context.condensed, context.sacrificed, context.unshippable, context.dispositions];
  if (!lists.every((list) => Array.isArray(list))) return false;
  for (const list of [context.condensed, context.sacrificed, context.unshippable, context.dropped]) {
    if (!list.every((id) => declared.has(id))) return false;
  }
  // A section cannot be both given up and unable to be carried, nor given up and still
  // carried condensed — the three dispositions are distinguishable or they are decoration.
  const carried = new Set(context.sections.map((section) => section.id));
  if (context.sacrificed.some((id) => context.unshippable.includes(id) || carried.has(id))) return false;
  if (context.condensed.some((id) => !carried.has(id))) return false;
  return context.dispositions.every((entry) => (
    entry != null
    && typeof entry === "object"
    && declared.has(entry.id)
    && DISPOSITION_KINDS.includes(entry.disposition)
    && typeof entry.detail === "string" && entry.detail.length > 0
    && typeof entry.where === "string" && entry.where.length > 0
  ));
}

// compilePhaseBrief(inputs) -> brief.context (ADR-002). PURE over its inputs: the same
// inputs produce a byte-identical brief on every invocation. `inputs = {
//   itemRef, phase, story, tasks, objective, architecture, fitness, dependencies }` where
// every section field is the ADDRESSED EXTRACT handed in by the caller — never a document
// (ADR-009 §4; the reader does the I/O and the addressing call, this module performs no
// read of any kind). A brief with no subject is REFUSED (thrown), never returned.
export function compilePhaseBrief(inputs = {}) {
  const itemRef = typeof inputs?.itemRef === "string" ? inputs.itemRef.trim() : "";
  if (itemRef.length === 0) {
    throw new TypeError("compilePhaseBrief: no item ref — a brief with no subject names nothing.");
  }
  const phase = PHASE_BRIEF_PHASES.includes(inputs?.phase) ? inputs.phase : "continue";
  const sectionTexts = buildSectionTexts({ ...inputs, itemRef });
  const ordered = PHASE_SECTIONS[phase]
    .map((id) => sectionTexts[id])
    .filter((section) => section != null);

  // `let`, not `const`: the ADR-010 §4 pass below RE-PLANS, and a re-plan produces a new
  // retained set, a new unshippable set and a new condensation map. `report()` closes over
  // the bindings rather than the values, so it always reports the current plan.
  let assembled = assemble(ordered);
  let planned = ordered;
  let retained = [...assembled.retained];
  let unshippable = [...assembled.unshippable];
  let condensations = assembled.condensations;
  const sacrificed = [];
  const shortened = [];

  const report = () => reportRows({ retained, condensations, sacrificed, unshippable, shortened });

  let notice = buildNotice(report());
  let text = renderSections(retained);

  // CONDENSATION IS EXHAUSTED BEFORE ANY SACRIFICE (ADR-010 §4).
  //
  // `plan()` condenses a section only when it does not fit the room its own place in the
  // priority order leaves it. That is NOT the same as "every carried section is in its
  // smallest useful form", and the gap is reachable: a NON-CONDENSABLE section is taken
  // whole regardless of `available` (`plan()`'s `|| entry.best == null` disjunct — correct
  // in itself, since a section with one form has nothing else to be), which lets the plan
  // overshoot the target it set itself. The sections ABOVE that overshoot were placed
  // before it and took their full size; the sections BELOW it are then squeezed, and the
  // bottom-up sacrifice below bills them for the difference.
  //
  // Measured on the witness ADR-010 §4 records: a 1,456-char `story` sitting beneath a
  // 5,463-char non-condensable `objective` was carried WHOLE while `tasks`, `fitness` and
  // `dependencies` were sacrificed — the story NOTES survived while the 30-scenario
  // contract index and the register left the brief entirely. That is F-11's own symptom
  // manufactured by the packer rather than by the reader, and it is what task 02's locked
  // row — "each within the ceiling, the sum far past it -> condensed first, then
  // sacrificed bottom-up until it fits" — forbids. PRIORITY MEANS LAST TO PAY, NOT FULL
  // FORM FIRST; the opposite reading is ADR-009's deleted drop-whole re-entering one level
  // up.
  //
  // So the LOWEST-PRIORITY retained section still carried WHOLE is offered its condenser —
  // bottom-up, the order sacrifice already uses, because the lower section pays first
  // whether it pays in detail or in absence — and then the plan is RE-DERIVED. Re-planning
  // is what makes the pass worth doing: the room a reduction frees belongs to the sections
  // below it, and only the planner knows how to share it out (ADR-010 §2). Without it the
  // freed room is stranded and the rescued sections arrive as husks that name none of their
  // own scenarios — the same defect one step further on. Index 0 is never reached, so
  // `item` is untouched by construction, and the pass engages ONLY on overflow: zero of
  // this stream's 633 briefs reach it today.
  //
  // A section reduced HERE is in its final form. `exhausted` IS that set, and it is handed
  // to the re-plan as `carried`, which both suppresses a second reduction and keeps the
  // record of what happened to it in a plan that no longer performs it. Nothing is written
  // onto the section itself: the packer's control state does not ride out on the payload.
  const exhausted = new Map();
  for (let round = 0; round < ordered.length; round += 1) {
    if (renderCompleteContext(text, notice).length <= PHASE_BRIEF_MAX_CHARS) break;
    let target = null;
    for (let index = retained.length - 1; index >= 1; index -= 1) {
      const section = retained[index];
      if (exhausted.has(section.id) || condensations.has(section.id)) continue;
      if (BRIEF_SECTION_CONDENSERS[section.id] == null) continue;
      target = section;
      break;
    }
    if (target == null) break;
    const reduction = condenseSection(target, Math.max(0, PHASE_BRIEF_MAX_CHARS - headerLength(target)));
    exhausted.set(target.id, reduction);
    if (reduction == null) continue;
    planned = planned.map((section) => (
      section.id === target.id ? reduction.section : section
    ));
    assembled = assemble(planned, exhausted);
    retained = [...assembled.retained];
    unshippable = [...assembled.unshippable];
    condensations = assembled.condensations;
    notice = buildNotice(report());
    text = renderSections(retained);
  }

  // ─────────────── SETTLEMENT: give up, then hand the room back (chore 95) ───────────────
  //
  // The bound applies to what is ACTUALLY sent, not merely to the section text. SACRIFICE
  // is strictly BOTTOM-UP: the lowest-priority retained section goes first, then the
  // next-lowest, until the complete context — the sections plus the notice that ships with
  // them — fits. Deliberately in the compiler/write path (ADR-003).
  //
  // BUT BOTTOM-UP BILLING IS NOT THE END OF THE STORY, and shipping it as though it were is
  // what chore 95 fixes. Bottom-up means a section high in the priority order that will not
  // fit is paid for FIRST by every section beneath it and only then by itself — and when it
  // is itself given up, the room its neighbours already paid comes back with nothing left
  // to claim it. The sacrifice loop stops the instant the brief fits, so it never notices;
  // and the exhaustion pass's re-plan, which is the thing that knows how to share room out,
  // engages only while the brief is OVER the ceiling. Measured on this stream: 72/00,
  // 72/01, 72/02 and 72/04's refine briefs each sacrificed `objective`, `tasks`, `fitness`
  // AND `dependencies` to make room for a 4,378-char non-condensable `objective` — which
  // was then sacrificed too, leaving the brief at 4,199–5,725 of 8,000 with the contract
  // index and the dependency edge gone and a THIRD of the budget unspent. That is F-11's
  // symptom again, manufactured this time not by the planner but by the ORDER the bill was
  // settled in.
  //
  // So settlement is three steps, repeated while they change anything: give up bottom-up
  // until it fits, offer the freed room BACK to what was given up, and then RE-PLAN the
  // survivors so the bounded condensers absorb whatever room is still unspent. Each step
  // moves only to a state that fits — the reinstatement verifies every candidate against the
  // complete context and the re-plan is discarded if it overshoots — so no step can
  // reintroduce an overflow, and the loop is bounded by the section count.
  const priorityInsert = (list, section) => {
    const at = list.findIndex((other) => byPriority(other.id, section.id) > 0);
    const next = [...list];
    next.splice(at < 0 ? next.length : at, 0, section);
    return next;
  };
  for (let pass = 0; pass < ordered.length + 1; pass += 1) {
    // 1. SACRIFICE, bottom-up, until the complete context fits.
    while (renderCompleteContext(text, notice).length > PHASE_BRIEF_MAX_CHARS && retained.length > 1) {
      const given = retained.pop();
      condensations.delete(given.id);
      sacrificed.unshift(given);
      notice = buildNotice(report());
      text = renderSections(retained);
    }
    if (sacrificed.length === 0) break;

    // 2. REINSTATE — each sacrificed section is offered the room back, highest priority
    //    first, whole if it fits and condensed to what is left if it does not, and re-seated
    //    at its own place in the priority order. The rounds repeat while one is placed,
    //    because a placement rewrites the notice: a one-line `dependencies` section costs
    //    LESS carried than the sentence announcing its absence, so a candidate that did not
    //    fit before another was seated can fit after.
    for (let round = 0; round < ordered.length && sacrificed.length > 0; round += 1) {
      let placed = false;
      for (let index = 0; index < sacrificed.length && !placed; index += 1) {
        const candidate = sacrificed[index];
        const room = PHASE_BRIEF_MAX_CHARS - renderCompleteContext(text, notice).length;
        // Re-seated from the section as PLANNED, never from the form that was popped. A
        // section `plan()` had condensed leaves the retained list carrying its reduced text
        // AND that text's `CONDENSED —` headline, so offering THAT to the condenser again
        // would emit a second headline over the first and state a count of a count. It is
        // the same rule step 4 follows, and the same rule `carried` enforces inside the
        // planner: a reduction is performed once, on the thing it reduces.
        const source = planned.find((other) => other.id === candidate.id) ?? candidate;
        // Whole first, then the declared condenser bounded to the room actually left — the
        // same order the planner uses, and the reason a reinstated section is never given a
        // form smaller than the one that would have fitted. A section the exhaustion pass
        // already reduced is in its final form and is offered no second reduction.
        const reduction = exhausted.has(source.id)
          ? null
          : condenseSection(source, Math.max(0, room - headerLength(source) - 2));
        const forms = [{ section: source, reduction: null }];
        // A HUSK IS NOT WORTH RE-SEATING — and is no longer offered as a reduction at all
        // (chore 115). A bounded condenser handed a few hundred chars answered with its
        // skeleton and none of its entries, and `condensedResult` now declines to call that a
        // reduction, so this site no longer filters for it: a re-seat that carried one back
        // would have bought a heading and a count with room a phase cannot use. The section
        // stays named as sacrificed, where the notice points at the document it is read in
        // full.
        if (reduction != null) {
          forms.push({ section: reduction.section, reduction });
        }
        for (const form of forms) {
          const trialRetained = priorityInsert(retained, form.section);
          const trialSacrificed = sacrificed.filter((other) => other.id !== candidate.id);
          const trialCondensations = new Map(condensations);
          if (form.reduction != null) {
            trialCondensations.set(candidate.id, { id: candidate.id, ...form.reduction });
          }
          const trialNotice = buildNotice(reportRows({
            retained: trialRetained, condensations: trialCondensations,
            sacrificed: trialSacrificed, unshippable, shortened,
          }));
          const trialText = renderSections(trialRetained);
          if (renderCompleteContext(trialText, trialNotice).length > PHASE_BRIEF_MAX_CHARS) continue;
          retained = trialRetained;
          condensations = trialCondensations;
          sacrificed.splice(index, 1);
          notice = trialNotice;
          text = trialText;
          placed = true;
          break;
        }
      }
      if (!placed) break;
    }

    // 3. RE-PLAN the survivors. Reinstatement decides WHICH sections are carried; only the
    //    planner knows what FORM each should take once a departure has changed the shares —
    //    it is the same argument the exhaustion pass makes for re-planning after a
    //    condensation, and it is what turns the freed room into carried content rather than
    //    slack. Without it 72/00's brief keeps its 306-char contract index in 3,655 chars of
    //    room, because that index was sized against a plan the `objective` was still in.
    const gone = new Set(sacrificed.map((section) => section.id));
    const replanned = assemble(planned.filter((section) => !gone.has(section.id)), exhausted, sacrificed);
    const replannedText = renderSections(replanned.retained);
    const replannedNotice = buildNotice(reportRows({
      retained: replanned.retained, condensations: replanned.condensations,
      sacrificed, unshippable: replanned.unshippable, shortened,
    }));
    if (replannedText === text) break;
    // A re-plan is an improvement or it is nothing: one that overshoots the ceiling is
    // discarded rather than sacrificed back down, so settlement never trades a fitting brief
    // for a round trip through the loop it just came out of.
    if (renderCompleteContext(replannedText, replannedNotice).length > PHASE_BRIEF_MAX_CHARS) break;
    retained = [...replanned.retained];
    unshippable = [...replanned.unshippable];
    condensations = replanned.condensations;
    notice = replannedNotice;
    text = replannedText;
  }

  // 4. SPEND THE ROOM BEFORE CLAIMING THERE WAS NONE (chore 95). A sacrifice is a CLAIM —
  //    "this could have been carried, and was given up to make room" — and a brief that
  //    states it while sitting a tenth of its ceiling below the line is stating something
  //    untrue, which is the same ADR-003 lie the notice's conditional leading clause exists
  //    to avoid. The room survives the re-plan because a bounded condenser's reserve is an
  //    ESTIMATE and its fill is granular: the planner held 1,361 chars for 72/02's register,
  //    whose next whole row would not fit in it, and the 1,080 chars left over were stranded
  //    between a section that had finished filling and one already placed above it.
  //
  //    So while any room is left, the highest-priority bounded section still in a condensed
  //    form is re-offered its own size PLUS the slack, and the larger fill is taken when it
  //    still fits. Only bounded sections grow — theirs is the only reduction whose size is a
  //    function of the room it is given — and one already reduced by the exhaustion pass is
  //    left alone, since that pass's reductions are final by construction. Gated on a
  //    sacrifice having happened, because a brief that gave nothing up has made no claim
  //    about the room and is entitled to leave it unspent.
  for (let round = 0; round < retained.length + 1 && sacrificed.length > 0; round += 1) {
    const slack = PHASE_BRIEF_MAX_CHARS - renderCompleteContext(text, notice).length;
    if (slack <= 0) break;
    let grew = false;
    for (const [index, section] of retained.entries()) {
      if (!BRIEF_BOUNDED_CONDENSERS.includes(section.id)) continue;
      if (exhausted.has(section.id) || !condensations.has(section.id)) continue;
      // Re-condensed from the section as PLANNED, never from the condensed text: a
      // condenser handed its own output would be reducing a reduction, and would answer
      // with the shrink rule rather than with a larger fill.
      const source = planned.find((other) => other.id === section.id);
      const grown = source == null ? null : condenseSection(source, section.text.length + slack);
      if (grown == null || grown.section.text.length <= section.text.length) continue;
      const trialRetained = retained.map((other, at) => (at === index ? grown.section : other));
      const trialCondensations = new Map(condensations).set(section.id, { id: section.id, ...grown });
      const trialNotice = buildNotice(reportRows({
        retained: trialRetained, condensations: trialCondensations, sacrificed, unshippable, shortened,
      }));
      const trialText = renderSections(trialRetained);
      if (renderCompleteContext(trialText, trialNotice).length > PHASE_BRIEF_MAX_CHARS) continue;
      retained = trialRetained;
      condensations = trialCondensations;
      notice = trialNotice;
      text = trialText;
      grew = true;
      break;
    }
    if (!grew) break;
  }

  if (renderCompleteContext(text, notice).length > PHASE_BRIEF_MAX_CHARS) {
    // Never reached in practice — only a first section that alone exceeds the whole
    // ceiling gets here, and the first section is the ~50-char item ref. Shortening it
    // keeps the brief non-empty and within the ceiling rather than refusing the spawn.
    const first = retained[0];
    if (!shortened.includes(first)) shortened.push(first);
    notice = buildNotice(report(), PHASE_BRIEF_MAX_CHARS - 2 - "## ITEM\nI".length);
    const allowedText = PHASE_BRIEF_MAX_CHARS - 2 - notice.length;
    retained[0] = { ...first, text: first.text.slice(0, Math.max(1, allowedText - headerLength(first))) };
    text = renderSections(retained);
  }
  const rows = report();
  const truncated = rows.length > 0;
  notice = truncated ? notice : null;
  const complete = renderCompleteContext(text, notice);

  const condensedIds = rows.filter((row) => row.disposition === "condensed").map((row) => row.section.id);
  const sacrificedIds = sacrificed.map((section) => section.id).sort(byPriority);
  const unshippableIds = unshippable.map((section) => section.id).sort(byPriority);

  const context = {
    itemRef,
    phase,
    sections: retained,
    truncated,
    // `dropped` — the sections that LEFT the brief, the story-00 key with its story-00
    // meaning. The three distinguishable dispositions ride beside it, never instead of it.
    dropped: [...sacrificedIds, ...unshippableIds].sort(byPriority),
    condensed: condensedIds,
    sacrificed: sacrificedIds,
    unshippable: unshippableIds,
    dispositions: rows.map((row) => ({
      id: row.section.id,
      disposition: row.disposition,
      detail: row.detail,
      where: sourceOf(row.section.id),
      ...(row.disposition === "condensed" && condensations.has(row.section.id)
        ? {
            form: condensations.get(row.section.id).form,
            kept: condensations.get(row.section.id).kept,
            total: condensations.get(row.section.id).total,
            omitted: condensations.get(row.section.id).omitted,
          }
        : {}),
    })),
    notice,
    chars: complete.length,
    ceiling: PHASE_BRIEF_MAX_CHARS,
    text,
  };
  // The WRITER refuses its own lie (ADR-003), against the strict predicate — not the
  // permissive one the embed seam uses.
  if (!conformsToCompilerOutput(context)) {
    throw new Error("compilePhaseBrief produced a non-conforming brief.");
  }
  return context;
}

// composePhaseBriefInput(command, context) -> string — the FIRST-INPUT the driver types
// into the session's PTY. PURE. When `context` is a conforming compiled brief, the input is
// the command followed by the brief's rendered text (and its truncation notice, when
// truncated) — so the phase context reaches the model AS INPUT, not as an instruction to go
// and read. When `context` is absent or non-conforming, the input is exactly `command` —
// a caller that supplies no compiled context gets exactly today's behaviour (absence stays
// benign, ADR-001).
export function composePhaseBriefInput(command, context) {
  const base = typeof command === "string" ? command : "";
  if (!isValidPhaseBrief(context)) return base;
  return `${base}\n\n${renderCompleteContext(context.text, context.truncated ? context.notice : null)}`;
}
