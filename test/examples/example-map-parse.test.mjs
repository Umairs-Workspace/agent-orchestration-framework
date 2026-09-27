// Traceability wiring for milestone 134 / story 02 — the example map's grammar and its queries.
//
// Covers EVERY @executable scenario in two task features:
//   tasks/00_the-map-parses-in-a-closed-grammar-and-fails-closed.feature
//   tasks/01_the-queries-and-the-token-have-one-home.feature
//
// `src/work-examples/map.mjs` is pure, so every map text here is held in memory and handed to the
// real parser: no file is written or read. One test object per @executable scenario, Scenario
// Outline rows folded into one entry iterating the rows. node:assert/strict, `{ name, run }` shape.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXAMPLES_DOC,
  MALFORMED_REASONS,
  PROVENANCE,
  QUESTION_CLASSES,
  QUESTION_STATES,
  malformedLines,
  mapToken,
  openBusinessQuestions,
  parseExampleMap,
  provenanceClaims,
  readMapToken,
  ruleCount,
  rulesWithoutExample,
} from "../../src/work-examples/map.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MAP_MODULE = path.join(repoRoot, "src", "work-examples", "map.mjs");

// ── fixtures ─────────────────────────────────────────────────────────────────

const FRONT = ["---", "doc: examples", "---", "# 134/02 · Example map"];
const R1 = "## R1 · a loan in arrears is not offered";
const E1 = "- E1 · active loan, two payments in arrears → not offered [proposed]";
const Q_HEAD = "## Questions";
const Q1 = "- Q1 · business · answered · who may borrow?";

const text = (lines) => `${lines.join("\n")}\n`;
// The map of R1, E1 and Q1 the id and admitted-line outlines start from.
const BASE = [...FRONT, "", R1, E1, "", Q_HEAD, Q1];

// ADR-001 §2's sample, verbatim in shape.
const ADR_SAMPLE = [
  ...FRONT,
  "",
  "## R1 · a customer with a loan in arrears is not offered another",
  "- E1 · new customer, no loans → offered [proposed]",
  "- E2 · active loan, two payments in arrears → not offered [confirmed]",
  "- E3 · closed loan, repaid in full → offered [stated Q1]",
  "",
  Q_HEAD,
  "- Q1 · business · answered · who may borrow?",
  "- Q2 · business · open · does a guarantor change it?",
  "- Q3 · technical · defaulted ADR-004 · which seam reads the ledger?",
];

const reasons = (map) => map.malformed.map((entry) => entry.reason);
const shape = (map) => ({
  rules: map.rules.map((rule) => ({ id: rule.id, text: rule.text, examples: rule.examples.map(({ line, ...rest }) => rest) })),
  questions: map.questions.map(({ line, ...rest }) => rest),
  notApplicable: map.notApplicable,
});

function isDeepFrozen(value) {
  if (!value || typeof value !== "object") return true;
  return Object.isFrozen(value) && Object.values(value).every(isDeepFrozen);
}

// Every reason any scenario below reports, collected as the scenarios run, so the closed-vocabulary
// scenario can assert that none of them is outside `MALFORMED_REASONS`.
const reported = new Set();
const parse = (input) => {
  const map = parseExampleMap(input);
  for (const entry of map.malformed) reported.add(entry.reason);
  return map;
};

// A map whose one rule holds the example carrying `label` (an empty label leaves a trailing space),
// and whose Questions section holds Q1 answered.
const provenanceMap = (label) => text([...FRONT, "", R1, `- E1 · a loan in arrears → not offered ${label}`, "", Q_HEAD, Q1]);

const oneQuestionMap = (line) => text([...FRONT, "", R1, E1, "", Q_HEAD, line]);

// ── task 00 — the closed grammar ─────────────────────────────────────────────

const PROVENANCE_ROWS = [
  { label: "[proposed]", provenance: "proposed", question: null, malformed: [] },
  { label: "[confirmed]", provenance: "confirmed", question: null, malformed: [] },
  { label: "[stated Q1]", provenance: "stated", question: "Q1", malformed: [] },
  { label: "[confirmd]", provenance: undefined, malformed: ["bad-provenance"] },
  { label: "[Proposed]", provenance: undefined, malformed: ["bad-provenance"] },
  { label: "[ruled]", provenance: undefined, malformed: ["bad-provenance"] },
  { label: "[stated]", provenance: undefined, malformed: ["bad-provenance"] },
  { label: "[stated Q]", provenance: undefined, malformed: ["bad-provenance"] },
  { label: "[stated Q01]", provenance: undefined, malformed: ["bad-provenance"] },
  { label: "[proposed] [confirmed]", provenance: undefined, malformed: ["bad-provenance"] },
  { label: "[proposed].", provenance: undefined, malformed: ["bad-provenance"] },
  { label: "", provenance: undefined, malformed: ["bad-provenance"] },
  { label: "[stated Q9]", provenance: "stated", question: "Q9", malformed: ["stated-names-no-question"] },
  { label: "[draft] [proposed]", provenance: "proposed", question: null, text: "a loan in arrears → not offered [draft]", malformed: [] },
];

const CLASS_ROWS = [
  { line: "- Q1 · technical · open · which seam?", class: "technical", state: "open", malformed: [] },
  { line: "- Q1 · policy · answered · who pays?", class: "business", state: "answered", malformed: ["bad-class"] },
  { line: "- Q1 · Business · answered · who pays?", class: "business", state: "answered", malformed: ["bad-class"] },
  { line: "- Q3 · answered · who pays?", class: "business", state: "open", malformed: ["bad-class"] },
  { line: "- Q1 · business - open - who pays?", class: "business", state: "open", malformed: ["bad-class"] },
  { line: "- Q1 · business · asked · who pays?", class: "business", state: "asked", malformed: [] },
  { line: "- Q1 · business · Answered · who pays?", class: "business", state: "open", malformed: ["bad-state"] },
  { line: "- Q1 · technical · defaulted ADR-004 · which seam?", class: "technical", state: "defaulted", pointer: "ADR-004", malformed: [] },
  { line: "- Q1 · business · defaulted ADR-004 · who pays?", class: "business", state: "defaulted", pointer: "ADR-004", malformed: [] },
  { line: "- Q1 · technical · defaulted · which seam?", class: "technical", state: "open", malformed: ["bad-state"] },
  { line: "- Q1 · technical · defaulted ADR-004 §2 · which seam?", class: "technical", state: "open", malformed: ["bad-state"] },
  { line: "- Q1 · business · open · who pays · and when?", class: "business", state: "open", text: "who pays · and when?", malformed: [] },
];

// Each case: the lines, and the 1-based line the one entry must name.
const UNADMITTED_CASES = [
  {
    case: "a one-line prose paragraph under a rule",
    lines: [...FRONT, "", R1, "This is a paragraph of prose.", E1, "", Q_HEAD, Q1],
    at: 7, reason: "unknown-line",
  },
  {
    case: "an example line before the first rule",
    lines: [...FRONT, "", "- E2 · two loans → not offered [proposed]", R1, E1, "", Q_HEAD, Q1],
    at: 6, reason: "misplaced-example",
  },
  {
    case: "two examples both numbered E2, under two rules",
    lines: [...FRONT, "", R1, E1, "- E2 · two loans → not offered [proposed]", "## R2 · a second rule", "- E2 · a closed loan → offered [proposed]", "", Q_HEAD, Q1],
    at: 10, reason: "duplicate-id",
  },
  {
    case: "an example `[stated Q9]` in a map with no Q9",
    lines: [...FRONT, "", R1, E1, "- E2 · two loans → not offered [stated Q9]", "", Q_HEAD, Q1],
    at: 8, reason: "stated-names-no-question",
  },
  {
    case: "a second `# ` title line after the first",
    lines: [...FRONT, "# a second title", "", R1, E1, "", Q_HEAD, Q1],
    at: 5, reason: "unknown-line",
  },
  {
    case: "a `## Notes` heading after the questions",
    lines: [...BASE, "", "## Notes"],
    at: 12, reason: "unknown-line",
  },
  {
    case: "a `---` line after the first rule",
    lines: [...FRONT, "", R1, "---", E1, "", Q_HEAD, Q1],
    at: 7, reason: "unknown-line",
  },
  {
    case: "a `<!--` opener after the last line, never closed",
    lines: [...BASE, "<!-- an unclosed comment"],
    at: 11, reason: "unknown-line",
  },
  {
    case: "a second `## Questions` heading holding one more question",
    lines: [...BASE, "", Q_HEAD, "- Q2 · business · open · who pays?"],
    at: 12, reason: "duplicate-section",
  },
  {
    case: "an example line under `## Questions`",
    lines: [...BASE, "- E2 · two loans → not offered [proposed]"],
    at: 11, reason: "misplaced-example",
  },
  {
    case: "a question line before the first rule",
    lines: [...FRONT, "", "- Q2 · business · open · who pays?", R1, E1, "", Q_HEAD, Q1],
    at: 6, reason: "misplaced-question",
  },
];

// `where`: "after the questions" appends; "under R1" puts it after E1; "under Questions" after Q1;
// "after the title" puts it right after the title line.
function insert(line, where) {
  const lines = [...BASE];
  const at = { "after the questions": lines.length, "under R1": lines.indexOf(E1) + 1, "under Questions": lines.indexOf(Q1) + 1, "after the title": FRONT.length }[where];
  lines.splice(at, 0, line);
  return { lines, number: at + 1 };
}

const ID_ROWS = [
  { line: "## R0 · a second rule", where: "after the questions", reason: "bad-id" },
  { line: "- E01 · two loans → not offered [proposed]", where: "under R1", reason: "bad-id" },
  { line: "- E01 · two loans → not offered [confirmd]", where: "under R1", reason: "bad-id" },
  { line: "- Q01 · business · open · who pays?", where: "under Questions", reason: "bad-id" },
  { line: "## R1 · the same rule again", where: "after the questions", reason: "duplicate-id" },
  { line: "- Q1 · technical · open · which seam?", where: "under Questions", reason: "duplicate-id" },
  { line: "- E2 - two loans → not offered [proposed]", where: "under R1", reason: "unknown-line" },
  { line: "- E2 | two loans → not offered [proposed]", where: "under R1", reason: "unknown-line" },
  { line: "- E2 · [proposed]", where: "under R1", reason: "unknown-line" },
  { line: "## r2 · a second rule", where: "after the questions", reason: "unknown-line" },
  { line: "## questions", where: "after the questions", reason: "unknown-line" },
  { line: "not applicable: a rename", where: "after the title", reason: "unknown-line" },
  { line: "- Q2 · policy · open · who pays?", where: "under R1", reason: "misplaced-question" },
];

const ADMITTED_CASES = [
  { case: "a blank line between every two lines", lines: BASE.flatMap((line) => [line, ""]) },
  { case: "a frontmatter block holding `owner: [not, checked]`", lines: ["---", "doc: examples", "owner: [not, checked]", "---", ...BASE.slice(3)] },
  { case: "no frontmatter and no title", lines: BASE.slice(4) },
  { case: "the whole-line comment `<!-- one rule per heading -->` under R1", lines: [...FRONT, "", R1, "<!-- one rule per heading -->", E1, "", Q_HEAD, Q1] },
  { case: "a three-line comment block holding `## Notes` and `- E9 · x [confirmd]`", lines: [...FRONT, "", R1, "<!-- ## Notes", "- E9 · x [confirmd]", "-->", E1, "", Q_HEAD, Q1] },
];

const NA = "Not applicable: a rename with no rule a person owns.";
const NOT_APPLICABLE_ROWS = [
  { case: "the declaration alone", body: [NA], notApplicable: "a rename with no rule a person owns.", malformed: [] },
  { case: "the declaration and a rule", body: [NA, "## R1 · a rule", "- E1 · a → b [proposed]"], notApplicable: null, malformed: [{ at: 5, reason: "not-applicable-with-rules" }] },
  { case: "no trailing period", body: ["Not applicable: a rename"], notApplicable: "a rename", malformed: [] },
  { case: "an empty reason", body: ["Not applicable:"], notApplicable: null, malformed: [{ at: 5, reason: "bad-not-applicable" }] },
  { case: "a blank reason", body: ["Not applicable:   "], notApplicable: null, malformed: [{ at: 5, reason: "bad-not-applicable" }] },
  { case: "the declaration and a question", body: [NA, Q_HEAD, "- Q1 · business · open · who pays?"], notApplicable: null, malformed: [{ at: 5, reason: "not-applicable-with-rules" }] },
  { case: "prose alone", body: ["This story has no rules."], notApplicable: null, malformed: [{ at: 5, reason: "unknown-line" }] },
];

const EMPTY_ROWS = [
  { text: "the empty string", input: "", line: 1 },
  { text: "frontmatter and title, with a final newline", input: text(FRONT), line: 4 },
  { text: "frontmatter, title, a blank line and a comment", input: text([...FRONT, "", "<!-- write the map here -->"]), line: 6 },
];

const taskGrammarTests = [
  {
    name: "134/02 task 00: the vocabularies are exactly the ones ADR-001 and ADR-004 name, and frozen",
    run: () => {
      assert.deepEqual(PROVENANCE, ["proposed", "confirmed", "stated"]);
      assert.deepEqual(QUESTION_STATES, ["open", "asked", "answered", "defaulted"]);
      assert.deepEqual(QUESTION_CLASSES, ["business", "technical"]);
      for (const vocabulary of [PROVENANCE, QUESTION_STATES, QUESTION_CLASSES]) {
        assert.ok(Object.isFrozen(vocabulary));
        assert.ok(!vocabulary.includes("ruled"), "`ruled` joins no vocabulary (ADR-001 §3)");
      }
      assert.equal(EXAMPLES_DOC, "EXAMPLES.md");
    },
  },
  {
    name: "134/02 task 00: a well-formed map parses into its rules, examples and questions, with line numbers",
    run: () => {
      const map = parse(text(ADR_SAMPLE));
      assert.deepEqual(map.rules.map((rule) => rule.id), ["R1"]);
      const [rule] = map.rules;
      assert.equal(rule.text, "a customer with a loan in arrears is not offered another");
      assert.equal(rule.line, 6);
      assert.deepEqual(rule.examples.map((example) => [example.id, example.line, example.provenance, example.question]), [
        ["E1", 7, "proposed", null],
        ["E2", 8, "confirmed", null],
        ["E3", 9, "stated", "Q1"],
      ]);
      assert.deepEqual(map.questions.map((question) => [question.id, question.line, question.class, question.state, question.pointer]), [
        ["Q1", 12, "business", "answered", null],
        ["Q2", 13, "business", "open", null],
        ["Q3", 14, "technical", "defaulted", "ADR-004"],
      ]);
      assert.deepEqual(map.malformed, []);
      assert.equal(map.notApplicable, null);
      assert.ok(isDeepFrozen(map), "the whole value is deeply frozen");
    },
  },
  {
    name: "134/02 task 00: an example's provenance label is read exactly, and anything else is malformed",
    run: () => {
      for (const row of PROVENANCE_ROWS) {
        const map = parse(provenanceMap(row.label));
        const example = map.rules[0].examples[0];
        if (row.provenance === undefined) {
          assert.equal(example, undefined, `${row.label || "(empty)"}: not an example`);
        } else {
          assert.equal(example.provenance, row.provenance, row.label);
          assert.equal(example.question, row.question, row.label);
          if (row.text) assert.equal(example.text, row.text, row.label);
        }
        assert.deepEqual(reasons(map), row.malformed, `${row.label || "(empty)"}: malformed`);
        for (const entry of map.malformed) assert.equal(entry.line, 7, `${row.label}: the entry names the example's line`);
      }
    },
  },
  {
    name: "134/02 task 00: a question's class fails closed to business",
    run: () => {
      for (const row of CLASS_ROWS) {
        const map = parse(oneQuestionMap(row.line));
        const [question] = map.questions;
        assert.equal(question.class, row.class, `${row.line}: class`);
        assert.equal(question.state, row.state, `${row.line}: state`);
        assert.equal(question.pointer, row.pointer ?? null, `${row.line}: pointer`);
        if (row.text) assert.equal(question.text, row.text, `${row.line}: text`);
        assert.deepEqual(reasons(map), row.malformed, `${row.line}: malformed`);
      }
    },
  },
  {
    name: "134/02 task 00: a line the grammar does not admit is reported with its line and a reason",
    run: () => {
      for (const row of UNADMITTED_CASES) {
        const map = parse(text(row.lines));
        assert.deepEqual(map.malformed, [{ line: row.at, text: row.lines[row.at - 1], reason: row.reason }], row.case);
        // Every well-formed line around it still parses: R1, E1 and Q1 are all there.
        assert.ok(map.rules.some((rule) => rule.id === "R1" && rule.examples.some((example) => example.id === "E1")), `${row.case}: R1 and E1 still parse`);
        assert.ok(map.questions.some((question) => question.id === "Q1"), `${row.case}: Q1 still parses`);
      }
      // The duplicate-section case: the question after the second heading still parses.
      const second = parse(text(UNADMITTED_CASES.find((row) => row.reason === "duplicate-section").lines));
      assert.deepEqual(second.questions.map((question) => question.id), ["Q1", "Q2"]);
    },
  },
  {
    name: "134/02 task 00: an id or a separator the grammar does not admit is reported",
    run: () => {
      for (const row of ID_ROWS) {
        const { lines, number } = insert(row.line, row.where);
        const map = parse(text(lines));
        assert.deepEqual(map.malformed, [{ line: number, text: row.line, reason: row.reason }], row.line);
      }
    },
  },
  {
    name: "134/02 task 00: a line the grammar admits beside the map is read as nothing",
    run: () => {
      const expected = shape(parse(text(BASE)));
      for (const row of ADMITTED_CASES) {
        const map = parse(text(row.lines));
        assert.deepEqual(map.malformed, [], row.case);
        assert.deepEqual(shape(map), expected, `${row.case}: the same rules, examples and questions`);
      }
    },
  },
  {
    name: "134/02 task 00: a rule may follow the Questions section, and a stated example may name a question above it",
    run: () => {
      const map = parse(text([Q_HEAD, Q1, R1, "- E1 · active loan, two payments in arrears → not offered [stated Q1]"]));
      assert.equal(map.rules[0].id, "R1");
      assert.equal(map.rules[0].examples[0].provenance, "stated");
      assert.equal(map.rules[0].examples[0].question, "Q1");
      assert.deepEqual(map.malformed, []);
    },
  },
  {
    name: "134/02 task 00: the one-line not-applicable map",
    run: () => {
      for (const row of NOT_APPLICABLE_ROWS) {
        const lines = [...FRONT, ...row.body];
        const map = parse(text(lines));
        assert.equal(map.notApplicable, row.notApplicable, `${row.case}: notApplicable`);
        assert.deepEqual(map.malformed, row.malformed.map((entry) => ({ line: entry.at, text: lines[entry.at - 1], reason: entry.reason })), `${row.case}: malformed`);
      }
    },
  },
  {
    name: "134/02 task 00: a map with nothing in it is one empty-map entry",
    run: () => {
      for (const row of EMPTY_ROWS) {
        const map = parse(row.input);
        assert.deepEqual(map.malformed.map((entry) => [entry.reason, entry.line]), [["empty-map", row.line]], row.text);
        assert.equal(map.notApplicable, null, row.text);
        assert.deepEqual([map.rules.length, map.questions.length], [0, 0], row.text);
      }
    },
  },
  {
    name: "134/02 task 00: a value that is not a string is refused",
    run: () => {
      for (const value of [undefined, null, 42, Buffer.from(text(BASE))]) {
        assert.throws(() => parseExampleMap(value), TypeError, String(value).slice(0, 20));
      }
    },
  },
  {
    name: "134/02 task 00: parsing is total and pure",
    run: async () => {
      const inputs = ["", text(BASE), text(ADR_SAMPLE).replace(/\n/g, "\r\n"), "---\nowner: x\n---", "---", "<!--", "- E", "## R1 · ", "Not applicable:", "\u0000\n\n·[]"];
      for (const input of inputs) {
        const first = parse(input);
        const second = parse(input);
        assert.deepEqual(first, second, JSON.stringify(input));
      }
      assert.deepEqual(parse(text(ADR_SAMPLE).replace(/\n/g, "\r\n")), parse(text(ADR_SAMPLE)), "CRLF parses to the LF value");
      const source = await readFile(MAP_MODULE, "utf8");
      assert.ok(!/^\s*import\b/m.test(source), "map.mjs has no import statement at all");
    },
  },
  // Last in this group, so every reason the scenarios above reported has been collected.
  {
    name: "134/02 task 00: the malformed reasons are a closed, frozen vocabulary",
    run: () => {
      assert.deepEqual(MALFORMED_REASONS, [
        "unknown-line", "bad-id", "duplicate-id", "bad-provenance", "stated-names-no-question",
        "bad-class", "bad-state", "misplaced-example", "misplaced-question", "duplicate-section",
        "bad-not-applicable", "not-applicable-with-rules", "empty-map",
      ]);
      assert.ok(Object.isFrozen(MALFORMED_REASONS));
      // Re-run every scenario's input so this entry stands alone under a focused run.
      for (const row of PROVENANCE_ROWS) parse(provenanceMap(row.label));
      for (const row of CLASS_ROWS) parse(oneQuestionMap(row.line));
      for (const row of UNADMITTED_CASES) parse(text(row.lines));
      for (const row of ID_ROWS) parse(text(insert(row.line, row.where).lines));
      for (const row of NOT_APPLICABLE_ROWS) parse(text([...FRONT, ...row.body]));
      for (const row of EMPTY_ROWS) parse(row.input);
      assert.deepEqual([...reported].filter((reason) => !MALFORMED_REASONS.includes(reason)), []);
      assert.deepEqual([...MALFORMED_REASONS].filter((reason) => !reported.has(reason)), [], "every reason is reachable by some scenario");
    },
  },
];

// ── task 01 — the queries and the token ──────────────────────────────────────

const OPEN_ROWS = [
  { class: "business", state: "open", open: ["Q1"] },
  { class: "business", state: "answered", open: [] },
  { class: "business", state: "defaulted ADR-004", open: ["Q1"] },
  { class: "technical", state: "open", open: [] },
  { class: "business", state: "asked", open: ["Q1"] },
  { class: "business", state: "defaulted", open: ["Q1"] },
  { class: "policy", state: "answered", open: [] },
  { class: "policy", state: "pending", open: ["Q1"] },
  { class: "technical", state: "pending", open: [] },
  { class: "technical", state: "defaulted ADR-004", open: [] },
];

const CLAIM_ROWS = [
  { claim: "- E2 · active loan, two payments in arrears → not offered [confirmed]", listed: [{ id: "E2", provenance: "confirmed", token: "134/02 E2" }] },
  { claim: "- E3 · a closed loan → offered [stated Q1]", listed: [{ id: "E3", provenance: "stated", token: "134/02 Q1" }] },
  { claim: "- Q1 · business · answered · who may borrow?", listed: [{ id: "Q1", state: "answered", token: "134/02 Q1" }] },
  { claim: "- E1 · a new customer → offered [proposed]", listed: [] },
  { claim: "- Q1 · technical · answered · which seam?", listed: [{ id: "Q1", state: "answered", token: "134/02 Q1" }] },
  { claim: "- Q1 · policy · answered · who may borrow?", listed: [{ id: "Q1", state: "answered", token: "134/02 Q1" }] },
  { claim: "- Q1 · business · asked · who may borrow?", listed: [] },
  { claim: "- Q1 · technical · defaulted ADR-004 · which seam?", listed: [] },
  { claim: "- E3 · a closed loan → offered [stated Q9]", listed: [{ id: "E3", provenance: "stated", token: "134/02 Q9" }] },
  { claim: "- E2 · active loan → not offered [confirmd]", listed: [] },
];

// The map of story 134/02 whose one line is the claim: an example under a rule, or a question
// under the Questions heading.
const claimMap = (claim) => (claim.startsWith("- E") ? text([R1, claim]) : text([Q_HEAD, claim]));
const claimShape = ({ line, ...rest }) => rest;

const TOKEN_ROWS = [
  { storyRef: "134/02", id: "Q1", answer: "134/02 Q1" },
  { storyRef: "134/02", id: "E2", answer: "134/02 E2" },
  { storyRef: "134/02", id: "R1", answer: TypeError },
  { storyRef: "7/1", id: "Q12", answer: "7/1 Q12" },
  { storyRef: "134", id: "E3", answer: "134 E3" },
  { storyRef: "134/02", id: "q1", answer: TypeError },
  { storyRef: "134/02", id: "Q01", answer: TypeError },
  { storyRef: "134/02", id: "Q0", answer: TypeError },
  { storyRef: "134/02", id: "Q", answer: TypeError },
  { storyRef: "", id: "Q1", answer: TypeError },
  { storyRef: "134/", id: "Q1", answer: TypeError },
  { storyRef: "134/02/1", id: "Q1", answer: TypeError },
  { storyRef: "M134", id: "Q1", answer: TypeError },
  { storyRef: " 134/02", id: "Q1", answer: TypeError },
  { storyRef: 134, id: "Q1", answer: TypeError },
];

const READ_ROWS = [
  { text: "134/02 E2 · active loan, two payments in arrears → not offered. Is that right?", read: { storyRef: "134/02", id: "E2" } },
  { text: "134/02 Q1 · who may borrow?", read: { storyRef: "134/02", id: "Q1" } },
  { text: "Is 134/02 Q1 settled?", read: null },
  { text: "Which seam should the reader hang off?", read: null },
  { text: "134/02 Q1", read: { storyRef: "134/02", id: "Q1" } },
  { text: "134/02 Q1 who may borrow?", read: { storyRef: "134/02", id: "Q1" } },
  { text: "134 E3 · a closed loan → offered?", read: { storyRef: "134", id: "E3" } },
  { text: "134/02 Q01 · who may borrow?", read: null },
  { text: "134/02 q1 · who may borrow?", read: null },
  { text: "134/02 R1 · who may borrow?", read: null },
  { text: "134/02 Q1x · who may borrow?", read: null },
  { text: "134/02 Q1· who may borrow?", read: null },
  { text: "134/02  Q1 · who may borrow?", read: null },
  { text: " 134/02 Q1 · who may borrow?", read: null },
  { text: undefined, read: null },
  { text: 42, read: null },
];

const taskQueryTests = [
  {
    name: "134/02 task 01: a business question is open until it is answered",
    run: () => {
      for (const row of OPEN_ROWS) {
        const map = parseExampleMap(text([Q_HEAD, `- Q1 · ${row.class} · ${row.state} · who may borrow?`]));
        assert.deepEqual(openBusinessQuestions(map).map((question) => question.id), row.open, `${row.class} · ${row.state}`);
      }
    },
  },
  {
    name: "134/02 task 01: each claim a person must stand behind is listed with the token it is anchored by",
    run: () => {
      for (const row of CLAIM_ROWS) {
        const claims = provenanceClaims(parseExampleMap(claimMap(row.claim)), "134/02");
        assert.deepEqual(claims.map(claimShape), row.listed, row.claim);
      }
    },
  },
  {
    name: "134/02 task 01: the claims are listed in line order, and two claims on one token are both listed",
    run: () => {
      const map = parseExampleMap(text([
        R1,
        "- E1 · a new customer → offered [proposed]",
        "- E2 · active loan, two payments in arrears → not offered [confirmed]",
        "- E3 · a closed loan → offered [stated Q1]",
        Q_HEAD,
        "- Q1 · business · answered · who may borrow?",
        "- Q2 · business · open · does a guarantor change it?",
      ]));
      const claims = provenanceClaims(map, "134/02");
      assert.deepEqual(claims.map((claim) => [claim.id, claim.token]), [["E2", "134/02 E2"], ["E3", "134/02 Q1"], ["Q1", "134/02 Q1"]]);
      assert.deepEqual(claims.map((claim) => claim.line), [3, 4, 6]);
    },
  },
  {
    name: "134/02 task 01: the rule-level queries count what the lane warns on",
    run: () => {
      const map = parseExampleMap(text([
        "## R1 · the first rule",
        "- E1 · a → b [proposed]",
        "- E2 · c → d [proposed]",
        "## R2 · the second rule",
        "## R3 · the third rule",
        "- E3 · e → f [proposed]",
        "a stray line",
      ]));
      assert.deepEqual(rulesWithoutExample(map).map((rule) => rule.id), ["R2"]);
      assert.equal(ruleCount(map), 3);
      assert.deepEqual(malformedLines(map), [{ line: 7, text: "a stray line", reason: "unknown-line" }]);
    },
  },
  {
    name: "134/02 task 01: a not-applicable map answers nothing to every query",
    run: () => {
      const map = parseExampleMap(text([...FRONT, NA]));
      assert.equal(map.notApplicable, "a rename with no rule a person owns.");
      assert.deepEqual(openBusinessQuestions(map), []);
      assert.deepEqual(provenanceClaims(map, "134/02"), []);
      assert.deepEqual(rulesWithoutExample(map), []);
      assert.deepEqual(malformedLines(map), []);
      assert.equal(ruleCount(map), 0);
    },
  },
  {
    name: "134/02 task 01: the token is built one way",
    run: () => {
      for (const row of TOKEN_ROWS) {
        const label = `${JSON.stringify(row.storyRef)} · ${row.id}`;
        if (row.answer === TypeError) assert.throws(() => mapToken(row.storyRef, row.id), TypeError, label);
        else assert.equal(mapToken(row.storyRef, row.id), row.answer, label);
      }
    },
  },
  {
    name: "134/02 task 01: a question's text is read for the token at its head, and only there",
    run: () => {
      for (const row of READ_ROWS) {
        assert.deepEqual(readMapToken(row.text), row.read, JSON.stringify(row.text));
      }
    },
  },
  {
    name: "134/02 task 01: a token built by mapToken is read back by readMapToken",
    run: () => {
      for (const storyRef of ["134/02", "7/1", "134"]) {
        for (const id of ["Q1", "Q12", "E3"]) {
          assert.deepEqual(readMapToken(`${mapToken(storyRef, id)} · the question`), { storyRef, id });
        }
      }
    },
  },
];

export const exampleMapParseTests = [...taskGrammarTests, ...taskQueryTests];
