// THE MEMORY VOCABULARY — milestone 148 / ADR-001 + ADR-002.
//
// One home for "what is a lesson's meta line, and which values are legal". Three readers need the
// same answer: the retrospective parser (`@aof/knowledge`, which both memory backends and
// `aof work tune` reach), the validate rule and `memory status`. `knowledge` depends on `work` and
// never the reverse, so the vocabulary lives here, where every one of them can import it. Before
// this module its only home was the retrospective prompt's prose (`assets/commands/retrospective.md`),
// which must name exactly these enums (FF-14802).
//
// It holds three things:
//   1. the enums — the four kinds, five areas and three stages the prompt prescribes, and the three
//      gap statuses;
//   2. the `R<n>` section reader and the meta-line reader, LIFTED out of `parseRetrospective` rather
//      than copied. The heading grammar is not respelled here: it is `declared-id`'s, the one home
//      FF-6604 holds;
//   3. the normalisers (ADR-002). A value that STARTS with a vocabulary word is that word, and what
//      follows becomes a tag; a value that starts with none is kept as written and counted, never
//      mapped onto one (the operator's ruling, 148/02 Q1); a blank stays blank, never guessed;
//   4. the hold (ADR-007): which of a retrospective's lessons break the vocabulary, field by field,
//      read by validate for a live item and by doctor's archived lane.
//
// Pure: no disk, no clock, no argv. It imports only the heading grammar.
import { headingCaptureRe, headingSplitRe } from "./declared-id.mjs";

export const LESSON_KINDS = Object.freeze(["mistake", "blocker", "near-miss", "misunderstanding"]);
export const LESSON_AREAS = Object.freeze(["code", "architecture", "contract", "security", "process"]);
export const LESSON_STAGES = Object.freeze(["refine", "build", "verify"]);
export const GAP_STATUSES = Object.freeze(["open", "discharged", "open-by-decision"]);

// The fields of a lesson's meta line that are held to an enum, in TAG ORDER (ADR-003: a record's
// tags follow the order of the fields they came from). Owner is read but never normalised: the
// prompt prescribes "the role/lane", not a list (ADR-002 §4).
export const LESSON_ENUM_FIELDS = Object.freeze({
  kind: LESSON_KINDS,
  area: LESSON_AREAS,
  stage: LESSON_STAGES,
});

const META_LINE_RE = /\*\*(?:Kind|Area|Stage|Owner|Raised by):\*\*/i;
const META_SEGMENT_RE = /\*\*([^:]+):\*\*\s*(.+)/;

// ----------------------------------------------------------- the R<n> reader ----

const RETRO_HEADER_RE = headingSplitRe("R");
const RETRO_HEAD_CAPTURE_RE = headingCaptureRe("R");

// Split a RETROSPECTIVE body into its `R<n>` sections: `{ id, rawTitle, line, body }`, where `line`
// is the 1-based line of the heading (so a record's `source` resolves back to live text) and `body`
// runs to the next `R<n>` heading. The title is returned raw; de-emphasising it is the caller's.
export function lessonSections(text) {
  const sections = [];
  let current = null;
  String(text ?? "").split(/\r?\n/).forEach((line, index) => {
    if (RETRO_HEADER_RE.test(line)) {
      if (current) sections.push(current);
      const [, id = "", rawTitle = ""] = line.match(RETRO_HEAD_CAPTURE_RE) ?? [];
      current = { id, rawTitle, line: index + 1, body: [] };
    } else if (current) {
      current.body.push(line);
    }
  });
  if (current) sections.push(current);
  return sections;
}

// The meta fields live on ONE OR MORE `- **Label:** v` lines, each a `·`-separated run of segments.
// Every meta-labelled line is scanned and the first value of each label wins, so a meta line split
// across two lines still yields all of its fields. Each segment stops at its own `·` and its own
// line end — never at a following field (the `inlineField` swallow this reader must not inherit).
// Keys are lower-cased labels: `kind`, `area`, `stage`, `owner`, `raised by`. Values are raw.
export function readLessonMeta(bodyLines) {
  const meta = {};
  for (const line of bodyLines ?? []) {
    if (!META_LINE_RE.test(line)) continue;
    for (const part of line.split("·")) {
      const match = part.match(META_SEGMENT_RE);
      if (!match) continue;
      const key = match[1].trim().toLowerCase();
      if (!(key in meta)) meta[key] = match[2].trim();
    }
  }
  return meta;
}

// ------------------------------------------------------------ the normalisers ----

const EMPHASIS_RE = /\*\*|`/g;
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// One matcher per vocabulary, its tokens tried LONGEST FIRST so `open by decision` is never `open`
// tagged "by decision". A token matches case-insensitively at the start of the value, a space
// standing for a hyphen within it, and only when the next character ends the word: the end, or
// anything that is not a letter, digit or hyphen. So `near-miss (recurring)` is near-miss, while
// `mistakes` and `near-missing` are not.
function matcherFor(vocabulary) {
  return [...vocabulary]
    .sort((a, b) => b.length - a.length)
    .map((token) => ({
      token,
      re: new RegExp(`^${escapeRe(token).replace(/-/g, "[-\\s]")}(?![A-Za-z0-9-])`, "i"),
    }));
}

const MATCHERS = new Map(
  [...Object.values(LESSON_ENUM_FIELDS), GAP_STATUSES].map((vocabulary) => [vocabulary, matcherFor(vocabulary)]),
);

// A remainder that is ONE parenthesised group, end to end — `(a, b)` but never `(a) and (b)`.
function isOneGroup(text) {
  if (!text.startsWith("(") || !text.endsWith(")")) return false;
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") depth -= 1;
    if (depth === 0 && i < text.length - 1) return false;
  }
  return depth === 0;
}

// The remainder after the vocabulary word, as a tag: emphasis stripped, trimmed, one enclosing
// parenthesised group dropped. Nothing else is rewritten. An empty remainder is no tag.
function remainderTag(rest) {
  let tag = rest.replace(EMPHASIS_RE, "").trim();
  if (isOneGroup(tag)) tag = tag.slice(1, -1).trim();
  return tag === "" ? null : tag;
}

// Normalise one raw value against a vocabulary → `{ value, tag, conforms }`.
//   - starts with a vocabulary word: `value` is that word as the vocabulary spells it, `tag` is the
//     remainder (or null), `conforms` is true;
//   - starts with none: `value` is the raw value trimmed, kept as written so it is counted and stays
//     findable, `tag` is null, `conforms` is false;
//   - blank: `value` is "", `tag` null, `conforms` false — counted as blank, never guessed.
export function normaliseValue(raw, vocabulary) {
  const written = String(raw ?? "").trim();
  if (written === "") return { value: "", tag: null, conforms: false };
  const bare = written.replace(EMPHASIS_RE, "").trim();
  const matchers = MATCHERS.get(vocabulary) ?? matcherFor(vocabulary);
  for (const { token, re } of matchers) {
    const match = bare.match(re);
    if (match) return { value: token, tag: remainderTag(bare.slice(match[0].length)), conforms: true };
  }
  return { value: written, tag: null, conforms: false };
}

// A lesson meta field (`kind`, `area` or `stage`) → `{ value, tag }`. Any other field — Owner — is
// returned as written, with no tag.
export function normaliseField(field, raw) {
  const vocabulary = LESSON_ENUM_FIELDS[field];
  if (!vocabulary) return { value: String(raw ?? "").trim(), tag: null };
  const { value, tag } = normaliseValue(raw, vocabulary);
  return { value, tag };
}

// A gap's written status → `{ value, tag }`. A gap with no Status line is `open` (39/ADR-001).
export function normaliseGapStatus(raw) {
  if (String(raw ?? "").trim() === "") return { value: "open", tag: null };
  const { value, tag } = normaliseValue(raw, GAP_STATUSES);
  return { value, tag };
}

// Tags in field order, duplicates dropped.
export function collectTags(tags) {
  return [...new Set(tags.filter((tag) => typeof tag === "string" && tag !== ""))];
}

// ------------------------------------------------------------------- the hold ----
//
// milestone 148 / ADR-007 — the rule validate holds a live lesson to, and the one doctor's archived
// lane reports against. Kind, Area and Stage each START with a vocabulary word (a qualifier after it
// is legal, ADR-002), and Owner is not blank. A lesson with no meta line fails on all four.

// The fields the hold checks, in the order a finding names them, with the label an author writes.
export const LESSON_HELD_FIELDS = Object.freeze([
  Object.freeze({ field: "kind", label: "Kind", vocabulary: LESSON_KINDS }),
  Object.freeze({ field: "area", label: "Area", vocabulary: LESSON_AREAS }),
  Object.freeze({ field: "stage", label: "Stage", vocabulary: LESSON_STAGES }),
  Object.freeze({ field: "owner", label: "Owner", vocabulary: null }),
]);

// The word a finding's qualifier hint is built on: a non-vocabulary value is shown kept as the
// qualifier of a legal word, as `near-miss (risk)` — what ADR-007 §4's re-classification writes.
export const LESSON_QUALIFIER_EXAMPLE = Object.freeze({ kind: "near-miss", area: "process", stage: "build" });

// A RETROSPECTIVE body → one entry per field that breaks the hold, in lesson then field order:
// `{ id, line, field, label, value, missing, legal }`. `missing` is a blank or absent value;
// otherwise `value` is the value as written and `legal` the vocabulary it is not in (null for Owner,
// which is only ever missing). An empty array means every lesson conforms, or there are none.
export function lessonMetaProblems(text) {
  const problems = [];
  for (const section of lessonSections(text)) {
    const meta = readLessonMeta(section.body);
    for (const { field, label, vocabulary } of LESSON_HELD_FIELDS) {
      const written = String(meta[field] ?? "").trim();
      const base = { id: section.id, line: section.line, field, label, legal: vocabulary };
      if (written === "") problems.push({ ...base, value: "", missing: true });
      else if (vocabulary && !normaliseValue(written, vocabulary).conforms) problems.push({ ...base, value: written, missing: false });
    }
  }
  return problems;
}

// A lesson's raw meta (from `readLessonMeta`) → the indexed fields: `kind`, `area` and `stage` as
// their vocabulary word (or as written), `owner` unchanged, and `tags` from the enum fields in order.
export function normaliseLessonMeta(meta = {}) {
  const out = {};
  const tags = [];
  for (const field of Object.keys(LESSON_ENUM_FIELDS)) {
    const { value, tag } = normaliseField(field, meta[field]);
    out[field] = value;
    tags.push(tag);
  }
  return { ...out, owner: meta.owner ?? "", tags: collectTags(tags) };
}
