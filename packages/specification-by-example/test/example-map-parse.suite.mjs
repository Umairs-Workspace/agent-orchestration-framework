// Traceability wiring for milestone 134 / story 02 — the example map's grammar and its queries.
//
// Covers EVERY @executable scenario in two task features:
//   tasks/00_the-map-parses-in-a-closed-grammar-and-fails-closed.feature
//   tasks/01_the-queries-and-the-token-have-one-home.feature
//
// …and, since milestone 193 / story 00, every @executable scenario of its tasks 00–03 (the fact,
// the decision and the cited finding — 193/ADR-001), in the block headed `193/00` below. Task 04's
// scenarios are FF-19201's, in `test/arch/examples/acd-example-map-single-home.test.mjs`.
//
// `packages/specification-by-example/src/map.mjs` is pure, so every map text here is held in memory and handed to the
// real parser: no file is written or read. One test object per @executable scenario, Scenario
// Outline rows folded into one entry iterating the rows. node:assert/strict, `{ name, run }` shape.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { parseFeature } from "@aof/work/feature-parse";
import {
  EXAMPLES_DOC,
  MALFORMED_REASONS,
  PROVENANCE,
  QUESTION_CLASSES,
  QUESTION_STATES,
  RESEARCH_DOC,
  findingNamed,
  malformedLines,
  mapToken,
  openBusinessQuestions,
  openQuestions,
  parseExampleMap,
  provenanceClaims,
  readFindings,
  readMapToken,
  researchClaims,
  ruleCount,
  rulesWithoutExample,
  untracedExamples,
} from "@aof/specification-by-example/map";
import { spawnCliSync } from "../../../test/support/cli-spawn.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MAP_MODULE = path.join(repoRoot, "packages", "specification-by-example", "src", "map.mjs");

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
  // `policy` joined the grammar at 193/00; a word it still does not admit fails closed as before.
  { line: "- Q1 · regulatory · answered · who pays?", class: "business", state: "answered", malformed: ["bad-class"] },
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
      // 193/ADR-001 §1–§3 widened each one: the 134 words are all still there, in their order.
      assert.deepEqual(PROVENANCE, ["proposed", "confirmed", "stated", "researched"]);
      assert.deepEqual(QUESTION_STATES, ["open", "asked", "answered", "defaulted", "researched"]);
      assert.deepEqual(QUESTION_CLASSES, ["domain", "policy", "technical", "business"]);
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

// ── 193/00 — the map tells a fact from a decision (193/ADR-001) ─────────────────────────────────

const ids = (questions) => questions.map((question) => question.id);
const questionMap = (...lines) => parse(text([Q_HEAD, ...lines]));
const ruleMap = (...lines) => parse(text([R1, ...lines]));
// A malformed reason as the outlines spell it: `none`, or the quoted reason.
const reasonOf = (map) => (map.malformed.length === 0 ? "none" : map.malformed.map((entry) => entry.reason).join(","));

// The research document of E7, and the shapes the reader's outlines vary.
const E7_HEADING = "## F2 · What notice must a landlord give before entry?";
const FINDING_LINE = "- **Finding:** At least 24 hours' written notice, at a reasonable time of day.";
const SOURCE = "- **Source:** https://www.legislation.gov.uk/ukpga/1985/70/section/11";
const research = (lines) => readFindings(text(["---", "doc: research", "---", "# 193 · Research", "", ...lines]));
const findingIds = (read) => read.findings.map((finding) => finding.id);

// A fixture copy of story 189/00's delivered map (E10), verbatim, and the value it parsed to before
// 193/00 — measured on the parser as it stood at 729ae6a6. 193/00 adds one field, `finding: null`.
const MAP_189_00 = text([
  "---",
  "doc: examples",
  "---",
  "# 189/00 · `aof:grill-me` ships for Claude Code and writes nothing — example map",
  "<!--",
  "Drafted at refine's discovery beat, 2026-11-01. Q1 answered by the operator on 2026-11-01:",
  "`grill-me` (offered `aof:check`, `aof:reflect` and `aof:practice`). Struck because the record answers them: Claude Code",
  "only (188/ADR-007, spike 187 measured Claude alone); no run, status or file (SPEC: \"learning feedback",
  "remains session-local, outside authoritative work status\"); exercises never in project source (SPEC",
  "Scope, first bullet); a check is no sign-off (SPEC Scope, fourth bullet, and the 158 recall).",
  "-->",
  "",
  "## R1 · The check command ships for Claude Code only",
  "- E1 · `aof work update` in a project rendering claude, codex and opencode writes `.claude/commands/aof/grill-me.md` and no Codex skill or OpenCode command for it [proposed]",
  "- E2 · The README's command table lists `/aof:grill-me` and says Codex and OpenCode render no grill-me command [stated Q1]",
  "",
  "## R2 · A check writes nothing, so nothing it observes reaches a gate",
  "- E3 · `/aof:grill-me 188/02` on an `in-review` story: afterwards `git status` and the story's `status:` are exactly as before, and no `runs/` file was added [proposed]",
  "- E4 · `/aof:grill-me 188` names the milestone's stories from `aof work list 188` and checks none of them [proposed]",
  "- E5 · `/aof:grill-me` on a story with no `reads:` sends the operator to `aof:refine <ref>` and checks nothing [proposed]",
  "",
  "## Questions",
  "- Q1 · business · answered · What is the command called? (`aof:grill-me`, chosen over `aof:check`, `aof:reflect` and `aof:practice`)",
  "- Q2 · technical · defaulted ARCHITECTURE.md#ADR-002 · Does a check refuse through code at a door, or in its prompt?",
]);
const MAP_189_00_BEFORE = {
  "rules": [
    {
      "id": "R1",
      "line": 13,
      "text": "The check command ships for Claude Code only",
      "examples": [
        {
          "id": "E1",
          "line": 14,
          "text": "`aof work update` in a project rendering claude, codex and opencode writes `.claude/commands/aof/grill-me.md` and no Codex skill or OpenCode command for it",
          "provenance": "proposed",
          "question": null
        },
        {
          "id": "E2",
          "line": 15,
          "text": "The README's command table lists `/aof:grill-me` and says Codex and OpenCode render no grill-me command",
          "provenance": "stated",
          "question": "Q1"
        }
      ]
    },
    {
      "id": "R2",
      "line": 17,
      "text": "A check writes nothing, so nothing it observes reaches a gate",
      "examples": [
        {
          "id": "E3",
          "line": 18,
          "text": "`/aof:grill-me 188/02` on an `in-review` story: afterwards `git status` and the story's `status:` are exactly as before, and no `runs/` file was added",
          "provenance": "proposed",
          "question": null
        },
        {
          "id": "E4",
          "line": 19,
          "text": "`/aof:grill-me 188` names the milestone's stories from `aof work list 188` and checks none of them",
          "provenance": "proposed",
          "question": null
        },
        {
          "id": "E5",
          "line": 20,
          "text": "`/aof:grill-me` on a story with no `reads:` sends the operator to `aof:refine <ref>` and checks nothing",
          "provenance": "proposed",
          "question": null
        }
      ]
    }
  ],
  "questions": [
    {
      "id": "Q1",
      "line": 23,
      "class": "business",
      "state": "answered",
      "pointer": null,
      "text": "What is the command called? (`aof:grill-me`, chosen over `aof:check`, `aof:reflect` and `aof:practice`)"
    },
    {
      "id": "Q2",
      "line": 24,
      "class": "technical",
      "state": "defaulted",
      "pointer": "ARCHITECTURE.md#ADR-002",
      "text": "Does a check refuse through code at a door, or in its prompt?"
    }
  ],
  "notApplicable": null,
  "malformed": []
};
const withoutFinding = (map) => ({
  ...map,
  rules: map.rules.map((rule) => ({ ...rule, examples: rule.examples.map(({ finding, ...rest }) => rest) })),
});

// `aof work update --dry-run --json` in this checkout, under an isolated global home: the actions it
// plans, by path. Asked once and shared by the scenarios that read it.
let updatePlan = null;
function plannedUpdate() {
  if (updatePlan) return updatePlan;
  const home = path.join(os.tmpdir(), `aof-193-00-update-${process.pid}`);
  const result = spawnCliSync(process.execPath, [path.join(repoRoot, "packages", "core", "bin", "aof.mjs"), "work", "update", "--dry-run", "--json"], {
    cwd: repoRoot, encoding: "utf8", windowsHide: true, env: { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" },
  });
  assert.equal(result.status, 0, result.stderr);
  updatePlan = JSON.parse(result.stdout).actions;
  return updatePlan;
}

const CLASS_OUTLINE = [
  { line: "- Q1 · domain · asked · x", class: "domain", state: "asked", reason: "none" },
  { line: "- Q1 · policy · answered · x", class: "policy", state: "answered", reason: "none" },
  { line: "- Q1 · technical · defaulted ADR-004 · x", class: "technical", state: "defaulted", reason: "none" },
  { line: "- Q1 · business · open · x", class: "business", state: "open", reason: "none" },
  { line: "- Q1 · Domain · open · x", class: "business", state: "open", reason: "bad-class" },
  { line: "- Q1 · policy/domain · open · x", class: "business", state: "open", reason: "bad-class" },
  { line: "- Q1 ·  · open · x", class: "business", state: "open", reason: "bad-class" },
  { line: "- Q1 · domain · pending · x", class: "domain", state: "open", reason: "bad-state" },
];

const CLOSE_OUTLINE = [
  ["policy", "open", true], ["policy", "asked", true], ["policy", "answered", false],
  ["policy", "defaulted ADR-004", true], ["policy", "researched F2", true],
  ["business", "defaulted ADR-004", true], ["business", "researched F2", true], ["business", "answered", false],
  ["domain", "open", true], ["domain", "asked", true], ["domain", "answered", false], ["domain", "researched F2", false],
  ["technical", "open", false], ["technical", "researched F2", false],
];

const STATE_OUTLINE = [
  { written: "researched F2", state: "researched", pointer: "F2", reason: "none" },
  { written: "researched F12", state: "researched", pointer: "F12", reason: "none" },
  { written: "researched", state: "open", pointer: null, reason: "bad-state" },
  { written: "researched F0", state: "open", pointer: null, reason: "bad-state" },
  { written: "researched F02", state: "open", pointer: null, reason: "bad-state" },
  { written: "researched Q2", state: "open", pointer: null, reason: "bad-state" },
  { written: "researched F2 F3", state: "open", pointer: null, reason: "bad-state" },
];

const LABEL_OUTLINE = [
  ["[researched F2]", "none"],
  ["[researched F0]", "bad-provenance"],
  ["[researched Q1]", "bad-provenance"],
  ["[Researched F2]", "bad-provenance"],
  ["[researched F2] [proposed]", "bad-provenance"],
  ["[researched F2 F3]", "bad-provenance"],
];

const SOURCE_OUTLINE = [
  ["- **Source:** https://example.org/act#s11", true],
  ["- **Source:** Housing Act 1988, section 21", true],
  ["- **Source:** packages/core/src/paths.mjs:42", true],
  ["- **Source:**", false],
  ["- **Source:**    ", false],
  ["- Source: https://example.org", false],
  ["**Source:** https://example.org", false],
];

const HEADING_OUTLINE = [
  ["## F1 · A question", "F1"],
  ["## F12 · A question", "F12"],
  ["### F1 · A question", null],
  ["# F1 · A question", null],
  ["## F1 - A question", null],
  ["## F1 ·", null],
  ["## F0 · A question", null],
  ["## F01 · A question", null],
  ["## R1 · A question", null],
];

const factAndDecisionTests = [
  // ══ 00_a-question-is-a-fact-a-decision-or-an-engineering-choice.feature ══
  {
    name: "193/00 task 00: E1 · a domain question parses as a fact",
    run: () => {
      const map = questionMap("- Q1 · domain · open · What notice must a landlord give before entry?");
      assert.deepEqual([map.questions[0].class, map.questions[0].state], ["domain", "open"]);
      assert.deepEqual(map.malformed, []);
    },
  },
  {
    name: "193/00 task 00: E2 · a policy question parses as a decision",
    run: () => {
      const map = questionMap("- Q2 · policy · open · How many days of arrears before we chase?");
      assert.equal(map.questions[0].id, "Q2");
      assert.equal(map.questions[0].class, "policy");
      assert.deepEqual(map.malformed, []);
    },
  },
  {
    name: "193/00 task 00: E3 · a class the grammar does not know reads as the strictest one",
    run: () => {
      const map = questionMap("- Q3 · regulatory · open · Which body licenses this?");
      assert.equal(map.questions[0].class, "business");
      assert.deepEqual(reasons(map), ["bad-class"]);
    },
  },
  {
    name: "193/00 task 00: the class vocabulary is four words, exported once",
    run: () => {
      assert.deepEqual(QUESTION_CLASSES, ["domain", "policy", "technical", "business"]);
      assert.ok(Object.isFrozen(QUESTION_CLASSES));
    },
  },
  {
    name: "193/00 task 00: a question's class is read by position, and only an exact word is admitted",
    run: () => {
      for (const row of CLASS_OUTLINE) {
        const map = questionMap(row.line);
        assert.deepEqual([map.questions[0].class, map.questions[0].state], [row.class, row.state], row.line);
        assert.equal(reasonOf(map), row.reason, row.line);
      }
    },
  },
  {
    name: "193/00 task 00: a question's text may itself hold the separator",
    run: () => {
      assert.equal(questionMap("- Q1 · domain · open · Notice · in days or hours?").questions[0].text, "Notice · in days or hours?");
    },
  },

  // ══ 01_a-fact-is-closed-by-a-cited-finding.feature ══
  {
    name: "193/00 task 01: E4 · a cited finding closes a fact and never a decision",
    run: () => {
      const map = questionMap(
        "- Q1 · domain · researched F2 · What notice must a landlord give?",
        "- Q2 · policy · researched F2 · How many days of arrears before we chase?",
      );
      assert.deepEqual(ids(openQuestions(map)), ["Q2"]);
    },
  },
  {
    name: "193/00 task 01: E5 · a fact is never closed by a default",
    run: () => {
      assert.deepEqual(ids(openQuestions(questionMap("- Q1 · domain · defaulted ADR-004 · What notice must a landlord give?"))), ["Q1"]);
    },
  },
  {
    name: "193/00 task 01: E6 · an example cites the finding that supports it",
    run: () => {
      const map = ruleMap("- E1 · 24 hours' written notice, entry at 10:00 the next day: allowed [researched F2]");
      const [example] = map.rules[0].examples;
      assert.deepEqual([example.provenance, example.finding, example.question], ["researched", "F2", null]);
      assert.deepEqual(map.malformed, []);
      assert.deepEqual(reasons(ruleMap("- E1 · 24 hours' written notice: allowed [researched]")), ["bad-provenance"]);
    },
  },
  {
    name: "193/00 task 01: what closes a question depends on who owns it",
    run: () => {
      for (const [klass, state, listed] of CLOSE_OUTLINE) {
        const map = questionMap(`- Q1 · ${klass} · ${state} · x`);
        assert.deepEqual(map.malformed, [], `${klass} · ${state} is a legal line`);
        assert.deepEqual(ids(openQuestions(map)), listed ? ["Q1"] : [], `${klass} · ${state}`);
      }
    },
  },
  {
    name: "193/00 task 01: the state names exactly one finding",
    run: () => {
      for (const row of STATE_OUTLINE) {
        const map = questionMap(`- Q1 · domain · ${row.written} · x`);
        assert.deepEqual([map.questions[0].state, map.questions[0].pointer], [row.state, row.pointer], row.written);
        assert.equal(reasonOf(map), row.reason, row.written);
      }
    },
  },
  {
    name: "193/00 task 01: an example's label names exactly one finding, at the end of the line",
    run: () => {
      for (const [label, reason] of LABEL_OUTLINE) assert.equal(reasonOf(ruleMap(`- E1 · some outcome ${label}`)), reason, label);
    },
  },
  {
    name: "193/00 task 01: the map lists every line that cites a finding, in line order",
    run: () => {
      const map = parse(text([
        R1,
        "- E1 · a new customer → offered [proposed]",
        "- E2 · two payments in arrears → not offered [researched F1]",
        Q_HEAD,
        "- Q1 · domain · researched F1 · what counts as arrears?",
        "- Q2 · domain · researched F3 · when is a payment late?",
      ]));
      assert.deepEqual(researchClaims(map), [
        { id: "E2", line: 3, finding: "F1" },
        { id: "Q1", line: 5, finding: "F1" },
        { id: "Q2", line: 6, finding: "F3" },
      ]);
    },
  },
  {
    name: "193/00 task 01: a cited finding is not a person's claim",
    run: () => {
      const map = ruleMap("- E1 · a new customer → offered [proposed]", "- E2 · two payments in arrears → not offered [researched F1]");
      assert.deepEqual(provenanceClaims(map, "193/00"), []);
    },
  },
  {
    name: "193/00 task 01: a finding id is never an answer token",
    run: () => {
      assert.equal(readMapToken("193/00 F1 · Is this finding right?"), null);
    },
  },

  // ══ 02_a-finding-counts-only-when-it-names-its-source.feature ══
  {
    name: "193/00 task 02: E7 · a heading with a Source line is a sourced finding",
    run: () => {
      const read = research([E7_HEADING, FINDING_LINE, SOURCE]);
      assert.deepEqual(read.findings, [{ id: "F2", line: 6, text: "What notice must a landlord give before entry?", sourced: true }]);
      assert.deepEqual(read.duplicates, []);
    },
  },
  {
    name: "193/00 task 02: E8 · a finding with no source is read, and is not sourced",
    run: () => {
      const read = research([E7_HEADING, FINDING_LINE]);
      assert.deepEqual(read.findings.map((finding) => [finding.id, finding.sourced]), [["F2", false]]);
    },
  },
  {
    name: "193/00 task 02: E9 · an id used twice resolves to neither",
    run: () => {
      const read = research([E7_HEADING, SOURCE, "", "## F2 · Is the notice the same for a lodger?", SOURCE]);
      assert.deepEqual(read.duplicates, [{ id: "F2", lines: [6, 9] }]);
      assert.equal(findingNamed(read, "F2"), null);
      assert.deepEqual(read.findings, []);
    },
  },
  {
    name: "193/00 task 02: what counts as a source line",
    run: () => {
      for (const [line, sourced] of SOURCE_OUTLINE) {
        assert.equal(findingNamed(research(["## F1 · A question", FINDING_LINE, line]), "F1").sourced, sourced, JSON.stringify(line));
      }
    },
  },
  {
    name: "193/00 task 02: what counts as a finding heading",
    run: () => {
      for (const [heading, id] of HEADING_OUTLINE) {
        assert.deepEqual(findingIds(research([heading, SOURCE])), id ? [id] : [], heading);
      }
    },
  },
  {
    name: "193/00 task 02: a finding's block ends at the next level-1 or level-2 heading",
    run: () => {
      const read = research(["## F1 · First", FINDING_LINE, "## F2 · Second", SOURCE]);
      assert.deepEqual(read.findings.map((finding) => [finding.id, finding.sourced]), [["F1", false], ["F2", true]]);
      const closed = research(["## F1 · First", "# An appendix", SOURCE]);
      assert.equal(findingNamed(closed, "F1").sourced, false, "a level-1 heading ends the block too");
    },
  },
  {
    name: "193/00 task 02: a level-3 heading stays inside its finding",
    run: () => {
      assert.equal(findingNamed(research(["## F1 · First", "### Detail", SOURCE]), "F1").sourced, true);
    },
  },
  {
    name: "193/00 task 02: a form shown inside a comment is not a finding",
    run: () => {
      assert.deepEqual(research(["<!--", "## F1 · The shape of a finding", SOURCE, "-->"]).findings, []);
      assert.deepEqual(research(["<!-- ## F1 · on one line -->"]).findings, []);
    },
  },
  {
    name: "193/00 task 02: the reader is total over text",
    run: () => {
      assert.deepEqual(readFindings(""), { findings: [], duplicates: [] });
      const lf = text([E7_HEADING, FINDING_LINE, SOURCE, "", "## F3 · Another", FINDING_LINE]);
      assert.deepEqual(readFindings(lf.replace(/\n/g, "\r\n")), readFindings(lf));
      assert.deepEqual(readFindings(text(["---", "doc: research", "---", "# Research", "Nothing found yet."])).findings, []);
      for (const value of [undefined, null, 42, ["## F1 · x"], { text: "## F1 · x" }]) {
        assert.throws(() => readFindings(value), TypeError, String(value));
      }
    },
  },
  {
    name: "193/00 task 02: what the reader answers cannot be changed by its caller",
    run: () => {
      assert.ok(isDeepFrozen(research([E7_HEADING, SOURCE, "## F2 · again", "## F3 · third", SOURCE])));
    },
  },
  {
    name: "193/00 task 02: the research document's file name has one home",
    run: () => {
      assert.equal(RESEARCH_DOC, "RESEARCH.md");
      assert.equal(EXAMPLES_DOC, "EXAMPLES.md", "beside the map's own");
    },
  },

  // ══ 03_a-map-written-before-this-change-reads-as-it-did.feature ══
  {
    name: "193/00 task 03: E10 · a delivered map parses to the value it parsed to before",
    run: () => {
      const map = parse(MAP_189_00);
      assert.deepEqual(withoutFinding(map), MAP_189_00_BEFORE);
      assert.ok(map.rules.flatMap((rule) => rule.examples).every((example) => example.finding === null));
    },
  },
  {
    name: "193/00 task 03: E11 · a business question is open and closed as before",
    run: () => {
      const map = questionMap("- Q1 · business · asked · x", "- Q2 · business · answered · y");
      assert.deepEqual(ids(openQuestions(map)), ["Q1"]);
      assert.deepEqual(ids(openBusinessQuestions(map)), ["Q1"], "the 134 query answers the same");
    },
  },
  {
    name: "193/00 task 03: the default template is untouched and is still a legal map",
    run: async () => {
      const rel = ".aof/templates/work/story/EXAMPLES.md";
      const map = parse(await readFile(path.join(repoRoot, rel), "utf8"));
      assert.deepEqual(map.malformed, []);
      assert.deepEqual(map.questions.map((question) => question.class).sort(), ["business", "business", "business", "technical"]);
      assert.deepEqual(plannedUpdate().filter((action) => action.path === rel).map((action) => action.action), ["skip"]);
    },
  },
  {
    name: "193/00 task 03: every label the old grammar admitted still reads the same",
    run: () => {
      for (const [label, provenance, question] of [["[proposed]", "proposed", null], ["[confirmed]", "confirmed", null], ["[stated Q2]", "stated", "Q2"]]) {
        const map = parse(text([R1, `- E1 · some outcome ${label}`, Q_HEAD, "- Q2 · business · open · x"]));
        const [example] = map.rules[0].examples;
        assert.deepEqual([example.provenance, example.question, example.finding], [provenance, question, null], label);
        assert.deepEqual(map.malformed, [], label);
      }
    },
  },
  {
    name: "193/00 task 03: the claims a person must stand behind are unchanged for an old map",
    run: () => {
      const map = parse(text([R1, "- E2 · two payments in arrears → not offered [confirmed]", "- E3 · a closed loan → offered [stated Q1]", Q_HEAD, Q1]));
      assert.deepEqual(provenanceClaims(map, "134/02").map((claim) => [claim.id, claim.token]), [
        ["E2", "134/02 E2"], ["E3", "134/02 Q1"], ["Q1", "134/02 Q1"],
      ]);
    },
  },
  {
    name: "193/00 task 03: the trace still exempts only a proposed example",
    run: () => {
      const map = parse(text([R1, "- E1 · a → b [proposed]", "- E2 · c → d [confirmed]", "- E3 · e → f [researched F1]"]));
      const feature = parseFeature([
        "@executable",
        "Feature: R1 · a loan in arrears is not offered",
        "",
        "  Scenario: a scenario carrying no example",
        "    Given nothing",
      ].join("\n"));
      assert.deepEqual(untracedExamples(map, [{ path: "tasks/00.feature", feature }]).map((example) => example.id), ["E2", "E3"]);
    },
  },
];

export const exampleMapParseTests = [...taskGrammarTests, ...taskQueryTests, ...factAndDecisionTests, {
  name: "210/03 gate tokens share the map grammar with questions and examples",
  run: () => {
    for (const [text, expected] of [
      ["17 G3 · Run a third whole-tree gate?", { storyRef: "17", id: "G3" }],
      ["17/02 Q1 · Does a reserved book count?", { storyRef: "17/02", id: "Q1" }],
      ["17 E1", { storyRef: "17", id: "E1" }],
      ["17 G0 · Run gate 0?", null], ["17 X3 · Something else", null],
    ]) assert.deepEqual(readMapToken(text), expected);
    assert.equal(mapToken("17", "G3"), "17 G3");
    assert.throws(() => mapToken("17", "G0"));
  },
}];
