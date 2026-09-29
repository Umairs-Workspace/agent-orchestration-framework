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
// holds both.

export const EXAMPLES_DOC = "EXAMPLES.md";

// The one spelling of each vocabulary. `ruled` joins none of them (ADR-001 §3): a business rule
// decided by an ADR is the smuggled default this milestone exists to stop.
export const PROVENANCE = Object.freeze(["proposed", "confirmed", "stated"]);
export const QUESTION_STATES = Object.freeze(["open", "asked", "answered", "defaulted"]);
export const QUESTION_CLASSES = Object.freeze(["business", "technical"]);

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
// A bracket earlier in an example's text is text — unless it holds a provenance label, when the
// line is `bad-provenance`: two labels are never read as one.
const EARLIER_LABEL = /\[\s*(?:proposed|confirmed|stated\b[^\]]*)\s*\]/;
const DEFAULTED = /^defaulted (\S+)$/;

/**
 * Parse an example map's text. Total over strings: every string returns, and a value that is not a
 * string throws `TypeError`. The value is deeply frozen:
 *
 *   { rules: [{ id, line, text, examples: [{ id, line, text, provenance, question }] }],
 *     questions: [{ id, line, class, state, pointer, text }],
 *     notApplicable: <reason> | null,
 *     malformed: [{ line, text, reason }] }
 *
 * Line numbers are 1-based lines of the original text; CRLF reads as LF.
 */
export function parseExampleMap(text) {
  if (typeof text !== "string") throw new TypeError("parseExampleMap: the map text must be a string");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  // A final newline adds no line.
  if (lines.length > 1 && lines.at(-1) === "") lines.pop();

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
      if (line.includes("-->", 4)) {
        if (!line.trimEnd().endsWith("-->")) report(index, "unknown-line");
        continue;
      }
      let close = index + 1;
      while (close < lines.length && !lines[close].includes("-->")) close += 1;
      if (close === lines.length) {
        report(index, "unknown-line");
      } else {
        index = close;
      }
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
    const defaulted = DEFAULTED.exec(rawState);
    const admittedState = defaulted !== null || (rawState !== "defaulted" && QUESTION_STATES.includes(rawState));
    questions.push({
      id,
      line: index + 1,
      class: admittedClass ? rawClass : "business",
      state: admittedState ? (defaulted ? "defaulted" : rawState) : "open",
      pointer: admittedState && defaulted ? defaulted[1] : null,
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

// An example's text after its id: the text, then exactly one bracketed provenance at the end.
// Answers the fields, or the reason the line is malformed.
function readExample(rest) {
  const group = PROVENANCE_GROUP.exec(rest);
  const text = (group ? group[1] : rest).trim();
  if (text === "") return "unknown-line";
  if (!group || EARLIER_LABEL.test(group[1])) return "bad-provenance";
  const label = group[2];
  if (label === "proposed" || label === "confirmed") return { text, provenance: label, question: null };
  const stated = STATED.exec(label);
  if (stated) return { text, provenance: "stated", question: `Q${stated[1]}` };
  return "bad-provenance";
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

// ── THE QUERIES — what the lane and the door ask of a parsed map (ADR-004 §2, ADR-005 §4) ─────
// Pure functions over `parseExampleMap`'s value, so the door and the lane cannot disagree. A
// question that parsed malformed counts by its fail-closed reading (class `business`, state `open`).

// A business question is closed only by `answered`: `defaulted` on a business question is open.
export function openBusinessQuestions(map) {
  return map.questions.filter((question) => question.class === "business" && question.state !== "answered");
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
