// THE EXAMPLE MAP — its grammar, its one parser, and the pure queries over it (milestone 134 /
// ADR-001 §2, ADR-004 §2, FF-13402).
//
// A story's example map is a sibling `EXAMPLES.md`, written by an agent and read by code: the
// doctor lane, the continue door and the discovery prose all judge the same text, and they can only
// agree if ONE module reads it. This is that module. It is a pure leaf with no imports at all: it
// takes the text and returns a deeply frozen value, and it reads no file, no config and no clock.
//
// THE GRAMMAR IS CLOSED. A line it does not admit is reported as `{ line, text, reason }` and the
// walk carries on, so one bad line never hides the lines after it — and a misspelt label such as
// `[confirmd]` is a malformed line the gate reports, never a line the parser drops. Where a field
// can be read fail-closed it is: a question class the grammar does not admit reads `business`
// (ADR-004 §2a), and a state it does not admit reads `open`, so a typo only makes the gate stricter.
//
// Every `R<n>` / `E<n>` / `Q<n>` map pattern in `src/` lives in this file and nowhere else, and so
// does the map's file name. FF-13402 (`test/arch/examples/acd-example-map-single-home.test.mjs`)
// holds both. Since 193/00 so does the `F<n>` finding id, its `researched` label and state, and the
// research document's name (FF-19201): the finding a map cites is read beside the label citing it.

export const EXAMPLES_DOC = "EXAMPLES.md";
export const RESEARCH_DOC = "RESEARCH.md";

// The one spelling of each vocabulary. `ruled` joins none of them (ADR-001 §3): a business rule
// decided by an ADR is the smuggled default this milestone exists to stop.
// 193/ADR-001 §1–§3: `domain` is a fact about the world, `policy` a decision only a person makes,
// and `business` the old spelling of `policy`, kept for good because a delivered map is never
// rewritten. A fact may be closed by a cited finding, `researched F<n>`, and an example may cite one.
export const PROVENANCE = Object.freeze(["proposed", "confirmed", "stated", "researched"]);
export const QUESTION_STATES = Object.freeze(["open", "asked", "answered", "defaulted", "researched"]);
export const QUESTION_CLASSES = Object.freeze(["domain", "policy", "technical", "business"]);

// The reasons a line is reported for — closed, and in the order the contract names them.
export const MALFORMED_REASONS = Object.freeze([
  "unknown-line",
  "bad-id",
  "duplicate-id",
  "bad-provenance",
  "stated-names-no-question",
  "bad-class",
  "bad-state",
  "misplaced-example",
  "misplaced-question",
  "duplicate-section",
  "bad-not-applicable",
  "not-applicable-with-rules",
  "empty-map",
]);

// The field separator: U+00B7 with one space either side.
const SEP = " · ";
const QUESTIONS_HEADING = "## Questions";
const NOT_APPLICABLE = "Not applicable:";
// A line is known by its marker. The id's digits are read loosely here so that `E01` and `R0`
// reach the id check and report `bad-id`, rather than reading as a line with no marker.
const ID_LINE = /^(## R|- E|- Q)(\d+)(.*)$/;
const KIND_BY_MARKER = { "## R": "rule", "- E": "example", "- Q": "question" };
const PREFIX_BY_KIND = { rule: "R", example: "E", question: "Q" };
const POSITIVE = /^[1-9]\d*$/;
const PROVENANCE_GROUP = /^(.*)\[([^[\]]*)\]$/;
const STATED = /^stated Q([1-9]\d*)$/;
// A finding's id, the one spelling `[researched F<n>]`, the state and the research heading share.
const FINDING_ID = String.raw`F[1-9]\d*`;
// A bracket earlier in an example's text is text — unless it holds a provenance label, when the
// line is `bad-provenance`: two labels are never read as one.
const EARLIER_LABEL = /\[\s*(?:proposed|confirmed|(?:stated|researched)\b[^\]]*)\s*\]/;
// The two states that carry a pointer: a default's citation, and the finding a fact was settled by.
// `researched` reads the same `F<n>` as the example label it shares the pattern with.
const DEFAULTED = /^defaulted (\S+)$/;
const RESEARCHED = new RegExp(`^researched (${FINDING_ID})$`);

/**
 * Parse an example map's text. Total over strings: every string returns, and a value that is not a
 * string throws `TypeError`. The value is deeply frozen:
 *
 *   { rules: [{ id, line, text, examples: [{ id, line, text, provenance, question, finding }] }],
 *     questions: [{ id, line, class, state, pointer, text }],
 *     notApplicable: <reason> | null,
 *     malformed: [{ line, text, reason }] }
 *
 * Line numbers are 1-based lines of the original text; CRLF reads as LF.
 */
export function parseExampleMap(text) {
  if (typeof text !== "string") throw new TypeError("parseExampleMap: the map text must be a string");
  const lines = textLines(text);

  const rules = [];
  const questions = [];
  const malformed = [];
  const seenIds = new Set();
  const declarations = [];
  let context = "none"; // "none" | "rule" | "questions"
  let currentRule = null;
  let titleSeen = false;
  let questionsSeen = false;
  let bodyMarkers = 0;
  let index = 0;

  const report = (at, reason) => malformed.push({ line: at + 1, text: lines[at], reason });

  // One frontmatter block, fenced by `---` from line 1. Its contents are not checked.
  if (lines[0] === "---") {
    const close = lines.indexOf("---", 1);
    if (close === -1) {
      report(0, "unknown-line");
      index = 1;
    } else {
      index = close + 1;
    }
  }

  for (; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "") continue;

    // Whole-line comments and multi-line `<!-- -->` blocks; their contents are not read.
    if (line.startsWith("<!--")) {
      const close = commentClose(lines, index);
      if (close === -1 || (close === index && !line.trimEnd().endsWith("-->"))) report(index, "unknown-line");
      if (close !== -1) index = close;
      continue;
    }

    // One `# ` title, before the first rule.
    if (line.startsWith("# ") && !titleSeen && rules.length === 0 && !questionsSeen && bodyMarkers === 0) {
      titleSeen = true;
      continue;
    }

    if (line === QUESTIONS_HEADING) {
      bodyMarkers += 1;
      context = "questions";
      currentRule = null;
      if (questionsSeen) report(index, "duplicate-section");
      questionsSeen = true;
      continue;
    }

    if (line.startsWith(NOT_APPLICABLE)) {
      const reason = line.slice(NOT_APPLICABLE.length).trim();
      declarations.push({ at: index, reason });
      continue;
    }

    const marked = ID_LINE.exec(line);
    if (!marked || !marked[3].startsWith(SEP)) {
      report(index, "unknown-line");
      continue;
    }
    bodyMarkers += 1;
    const kind = KIND_BY_MARKER[marked[1]];
    const digits = marked[2];
    const rest = marked[3].slice(SEP.length);
    const id = `${PREFIX_BY_KIND[kind]}${digits}`;

    // Placement first, then the fields left to right; a line reports ONE entry, its first failure.
    if (kind === "example" && context !== "rule") { report(index, "misplaced-example"); continue; }
    if (kind === "question" && context !== "questions") { report(index, "misplaced-question"); continue; }
    if (!POSITIVE.test(digits) || seenIds.has(id)) {
      report(index, POSITIVE.test(digits) ? "duplicate-id" : "bad-id");
      // A rule heading that did not parse owns no examples: those under it are reported, not lost.
      if (kind === "rule") { context = "none"; currentRule = null; }
      continue;
    }
    seenIds.add(id);

    if (kind === "rule") {
      if (rest.trim() === "") {
        report(index, "unknown-line");
        context = "none";
        currentRule = null;
        continue;
      }
      currentRule = { id, line: index + 1, text: rest.trim(), examples: [] };
      rules.push(currentRule);
      context = "rule";
      continue;
    }

    if (kind === "example") {
      const example = readExample(rest);
      if (typeof example === "string") { report(index, example); continue; }
      currentRule.examples.push({ id, line: index + 1, ...example });
      continue;
    }

    // A question, read by position: id, class, state, then the text (which may hold ` · `).
    const [rawClass = "", rawState = "", ...words] = rest.split(SEP);
    const admittedClass = QUESTION_CLASSES.includes(rawClass);
    const state = readState(rawState);
    const admittedState = state !== null;
    questions.push({
      id,
      line: index + 1,
      class: admittedClass ? rawClass : "business",
      state: admittedState ? state.state : "open",
      pointer: admittedState ? state.pointer : null,
      text: words.join(SEP),
    });
    if (!admittedClass) report(index, "bad-class");
    else if (!admittedState) report(index, "bad-state");
  }

  // A `stated Q<n>` naming no question is reported once the whole map is read: a question may be
  // written after the example that cites it. The example still reads `stated Q<n>`.
  const questionIds = new Set(questions.map((question) => question.id));
  for (const rule of rules) {
    for (const example of rule.examples) {
      if (example.provenance === "stated" && !questionIds.has(example.question)) {
        report(example.line - 1, "stated-names-no-question");
      }
    }
  }

  // Not applicable is a body of exactly one line, with a reason, and nothing to map beside it.
  let notApplicable = null;
  for (const [position, declaration] of declarations.entries()) {
    if (position > 0 || declaration.reason === "") report(declaration.at, "bad-not-applicable");
    else if (bodyMarkers > 0) report(declaration.at, "not-applicable-with-rules");
    else notApplicable = declaration.reason;
  }

  if (rules.length === 0 && questions.length === 0 && declarations.length === 0 && malformed.length === 0) {
    malformed.push({ line: lines.length, text: lines.at(-1), reason: "empty-map" });
  }

  malformed.sort((a, b) => a.line - b.line);
  return deepFreeze({ rules, questions, notApplicable, malformed });
}

// A question's state field: `{ state, pointer }`, or null when the grammar does not admit it. The
// bare words `defaulted` and `researched` name no pointer, and are not admitted.
function readState(raw) {
  const defaulted = DEFAULTED.exec(raw);
  if (defaulted) return { state: "defaulted", pointer: defaulted[1] };
  const researched = RESEARCHED.exec(raw);
  if (researched) return { state: "researched", pointer: researched[1] };
  if (raw === "defaulted" || raw === "researched" || !QUESTION_STATES.includes(raw)) return null;
  return { state: raw, pointer: null };
}

// An example's text after its id: the text, then exactly one bracketed provenance at the end.
// Answers the fields, or the reason the line is malformed.
function readExample(rest) {
  const group = PROVENANCE_GROUP.exec(rest);
  const text = (group ? group[1] : rest).trim();
  if (text === "") return "unknown-line";
  if (!group || EARLIER_LABEL.test(group[1])) return "bad-provenance";
  const label = group[2];
  if (label === "proposed" || label === "confirmed") return { text, provenance: label, question: null, finding: null };
  const stated = STATED.exec(label);
  if (stated) return { text, provenance: "stated", question: `Q${stated[1]}`, finding: null };
  const researched = RESEARCHED.exec(label);
  if (researched) return { text, provenance: "researched", question: null, finding: researched[1] };
  return "bad-provenance";
}

// The lines of a document: CRLF reads as LF, and a final newline adds no line.
function textLines(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 1 && lines.at(-1) === "") lines.pop();
  return lines;
}

// The index of the line that closes a `<!--` opened on line `index` (that line itself for a
// whole-line comment), or -1 when nothing closes it.
function commentClose(lines, index) {
  if (lines[index].includes("-->", 4)) return index;
  for (let close = index + 1; close < lines.length; close += 1) {
    if (lines[close].includes("-->")) return close;
  }
  return -1;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

// ── THE FINDINGS — what a cited `F<n>` points at (193/ADR-001 §6, §9) ──────────────────────────
// A finding is a level-2 heading `## F<n> · <the question>` in the research document. Its block runs
// to the next level-1 or level-2 heading, and it is SOURCED when the block holds a line starting
// `- **Source:**` with text after it. That proves a source is named, never that it says what the
// finding says: the reviewer judges that. An id used twice resolves to neither.
const FINDING_HEADING = new RegExp(`^## (${FINDING_ID}) · (.*)$`);
const SOURCE_LINE = "- **Source:**";

/**
 * Read a research document's findings. Total over strings: every string returns, and a value that
 * is not a string throws `TypeError`. The value is deeply frozen:
 *
 *   { findings: [{ id, line, text, sourced }], duplicates: [{ id, lines }] }
 *
 * `findings` holds each id used exactly once, in document order; an id used more than once is in
 * `duplicates` and nowhere else. Comment blocks are not read; CRLF reads as LF.
 */
export function readFindings(text) {
  if (typeof text !== "string") throw new TypeError("readFindings: the research text must be a string");
  const lines = textLines(text);
  const headings = [];
  let current = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("<!--")) {
      const close = commentClose(lines, index);
      if (close !== -1) index = close;
      continue;
    }
    if (line.startsWith("# ") || line.startsWith("## ")) {
      const heading = FINDING_HEADING.exec(line);
      const question = heading ? heading[2].trim() : "";
      current = question === "" ? null : { id: heading[1], line: index + 1, text: question, sourced: false };
      if (current) headings.push(current);
      continue;
    }
    if (current && line.startsWith(SOURCE_LINE) && line.slice(SOURCE_LINE.length).trim() !== "") current.sourced = true;
  }
  const linesById = new Map();
  for (const heading of headings) linesById.set(heading.id, [...(linesById.get(heading.id) ?? []), heading.line]);
  return deepFreeze({
    findings: headings.filter((heading) => linesById.get(heading.id).length === 1),
    duplicates: [...linesById].filter(([, at]) => at.length > 1).map(([id, at]) => ({ id, lines: at })),
  });
}

// The finding `readFindings` answered under `id`, or null — for an id never written, and for one
// written twice.
export function findingNamed(read, id) {
  return read.findings.find((finding) => finding.id === id) ?? null;
}

// ── THE QUERIES — what the lane and the door ask of a parsed map (ADR-004 §2, ADR-005 §4) ─────
// Pure functions over `parseExampleMap`'s value, so the door and the lane cannot disagree. A
// question that parsed malformed counts by its fail-closed reading (class `business`, state `open`).

// What closes a question, by who owns it (193/ADR-001 §4). A decision — `policy`, or its old
// spelling `business` — is closed only by a person's `answered`. A fact — `domain` — is closed by
// `answered` or by a cited finding, and never by a default. A `technical` question is never gated.
const CLOSED_BY = Object.freeze({
  policy: Object.freeze(["answered"]),
  business: Object.freeze(["answered"]),
  domain: Object.freeze(["answered", "researched"]),
});

function isOpenQuestion(question) {
  const closedBy = CLOSED_BY[question.class];
  return closedBy !== undefined && !closedBy.includes(question.state);
}

// Every gated question still open, in map order: a decision not yet answered, and a fact neither
// answered nor settled by a cited finding.
export function openQuestions(map) {
  return map.questions.filter(isOpenQuestion);
}

// A business question is closed only by `answered`: `defaulted` on a business question is open.
// `policy` is the same class newly spelt, so it is read alike (193/ADR-001 §1).
export function openBusinessQuestions(map) {
  return map.questions.filter((question) => (question.class === "business" || question.class === "policy") && isOpenQuestion(question));
}

// Every line that cites a finding, in line order: an example labelled `[researched F<n>]` and a
// question in state `researched F<n>`, as `{ id, line, finding }`. A citation is not a person's
// claim, so it carries no token (193/ADR-001 §6, §9).
export function researchClaims(map) {
  const claims = [];
  for (const rule of map.rules) {
    for (const example of rule.examples) {
      if (example.provenance === "researched") claims.push({ id: example.id, line: example.line, finding: example.finding });
    }
  }
  for (const question of map.questions) {
    if (question.state === "researched") claims.push({ id: question.id, line: question.line, finding: question.pointer });
  }
  return claims.sort((a, b) => a.line - b.line);
}

// Every claim a person must stand behind, in line order, with the token it is anchored by: a
// `confirmed` example (its own token), a `stated Q<n>` example (the QUESTION's token, even when no
// such question exists), and an `answered` question of either class.
export function provenanceClaims(map, storyRef) {
  const claims = [];
  for (const rule of map.rules) {
    for (const example of rule.examples) {
      if (example.provenance === "confirmed") {
        claims.push({ id: example.id, line: example.line, provenance: "confirmed", token: mapToken(storyRef, example.id) });
      } else if (example.provenance === "stated") {
        claims.push({ id: example.id, line: example.line, provenance: "stated", token: mapToken(storyRef, example.question) });
      }
    }
  }
  for (const question of map.questions) {
    if (question.state === "answered") {
      claims.push({ id: question.id, line: question.line, state: "answered", token: mapToken(storyRef, question.id) });
    }
  }
  return claims.sort((a, b) => a.line - b.line);
}

export function rulesWithoutExample(map) {
  return map.rules.filter((rule) => rule.examples.length === 0);
}

export function ruleCount(map) {
  return map.rules.length;
}

export function malformedLines(map) {
  return [...map.malformed];
}

// ── THE TOKEN — `<story ref> Q<n>` / `<story ref> E<n>` (ADR-003 §2) ───────────────────────────
// Built and read by this one pair, so the answer reader and the discovery prose cannot spell it
// two ways.
const STORY_REF = /^\d+(?:\/\d+)?$/;
const TOKEN_ID = /^[EQ][1-9]\d*$/;
const TOKEN_AT_HEAD = /^(\d+(?:\/\d+)?) ([EQ][1-9]\d*)(?=$| )/;

export function mapToken(storyRef, id) {
  if (typeof storyRef !== "string" || !STORY_REF.test(storyRef)) {
    throw new TypeError(`mapToken: "${String(storyRef)}" is not a story ref`);
  }
  if (typeof id !== "string" || !TOKEN_ID.test(id)) {
    throw new TypeError(`mapToken: "${String(id)}" is not a question or example id`);
  }
  return `${storyRef} ${id}`;
}

// Reads harness data, so it never throws: a token only at the very head of the text, followed by
// the end of the text or a space. Answers `{ storyRef, id }` or null.
export function readMapToken(text) {
  if (typeof text !== "string") return null;
  const head = TOKEN_AT_HEAD.exec(text);
  return head ? { storyRef: head[1], id: head[2] } : null;
}

// ── THE TRACE — an agreed example resolves by its DECLARED id, inside its rule's group ─────────
// (milestone 135 / ADR-002 §2, ADR-004). Never by value: a map row's prose ("5 loans") never equals
// a step's text, and an inferred join is what 54/ADR-006 refuses. The ids are read here, beside the
// map's own grammar, so a contract and its map are spelt one way (FF-13402); the queries take
// `parseFeature`'s value and never a feature's text, so this module stays a leaf (FF-13502).
//
// A scenario CARRIES `E<n>` when its name starts with `E<n> · `. An Examples row carries it when its
// cell under the column headed `example` is exactly `E<n>`. A scenario's GROUP is the `Rule:` it
// sits under, or its `Feature:` when it sits under none, and a group NAMES `R<n>` when its title
// starts with `R<n> · ` — so one feature per rule (ADR-002 §3) needs no path of its own.
export const EXAMPLE_COLUMN = "example";
const RULE_AT_HEAD = /^(R[1-9]\d*) · /;
const EXAMPLE_AT_HEAD = /^(E[1-9]\d*) · /;
const EXAMPLE_ID = /^E[1-9]\d*$/;

// The rule id a group's title names, or null.
export function groupRuleId(title) {
  return typeof title === "string" ? RULE_AT_HEAD.exec(title)?.[1] ?? null : null;
}

// The example id a scenario's name carries, or null.
export function scenarioExampleId(name) {
  return typeof name === "string" ? EXAMPLE_AT_HEAD.exec(name)?.[1] ?? null : null;
}

// The example id an `example` cell carries — the whole cell, or null.
export function rowExampleId(cell) {
  return typeof cell === "string" && EXAMPLE_ID.test(cell) ? cell : null;
}

// Every carrier in a story's task features, in the order given: `{ id, rule, path, line }`, where
// `rule` is the id the carrier's group names (or null) and `line` is its scenario's line.
//   features — [{ path, feature }], `feature` being `parseFeature`'s value.
function carriersOf(features) {
  const carriers = [];
  for (const { path, feature } of features) {
    for (const scenario of feature?.scenarios ?? []) {
      const rule = groupRuleId(scenario.rule ? scenario.rule.name : feature.feature);
      const ids = [scenarioExampleId(scenario.name)];
      for (const block of scenario.examples ?? []) {
        const column = (block.columns ?? []).indexOf(EXAMPLE_COLUMN);
        if (column === -1) continue;
        for (const cells of block.cells ?? []) ids.push(rowExampleId(cells[column]));
      }
      for (const id of ids) if (id) carriers.push({ id, rule, path, line: scenario.line });
    }
  }
  return carriers;
}

// Was this contract formulated from the map? At least one group — a `Rule:` or a `Feature:` —
// names a rule id (ADR-004 §4). A contract with no task feature, or one written before 135, was not.
export function contractNamesRules(features) {
  return features.some(({ feature }) => groupRuleId(feature?.feature) != null
    || (feature?.rules ?? []).some((rule) => groupRuleId(rule.name) != null));
}

/**
 * The agreed examples a contract formulated from the map does not carry inside their own rule, in
 * map order: `{ id, line, rule, provenance, question, finding, foundAt }`, where `foundAt` is the first
 * carrier of the id in a group that does not name its rule (`{ rule, path, line }`, `rule` null for
 * a group naming no rule id), or null when nothing carries it. A `proposed` example is never
 * required. Answers `[]` for a map declared not applicable and for a contract that names no rule.
 */
export function untracedExamples(map, features) {
  if (map.notApplicable != null || !contractNamesRules(features)) return [];
  const carriers = carriersOf(features);
  const untraced = [];
  for (const rule of map.rules) {
    for (const example of rule.examples) {
      if (example.provenance === "proposed") continue;
      const found = carriers.filter((carrier) => carrier.id === example.id);
      if (found.some((carrier) => carrier.rule === rule.id)) continue;
      const [elsewhere] = found;
      untraced.push({
        id: example.id,
        line: example.line,
        rule: rule.id,
        provenance: example.provenance,
        question: example.question,
        finding: example.finding,
        foundAt: elsewhere ? { rule: elsewhere.rule, path: elsewhere.path, line: elsewhere.line } : null,
      });
    }
  }
  return untraced;
}
