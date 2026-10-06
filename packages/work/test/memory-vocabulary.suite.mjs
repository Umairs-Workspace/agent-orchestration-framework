// Milestone 148 / story 02 — the memory vocabulary's own contract (ADR-001 + ADR-002): the enums,
// the R<n> reader, the meta-line reader and the normalisers, exercised directly. The parser- and
// backend-level scenarios of the story's three task features are wired in the knowledge package,
// which owns the parsers (`packages/knowledge/test/memory-meta-normalised.suite.mjs`).
import assert from "node:assert/strict";
import {
  GAP_STATUSES,
  LESSON_AREAS,
  LESSON_ENUM_FIELDS,
  LESSON_KINDS,
  LESSON_STAGES,
  lessonSections,
  normaliseField,
  normaliseGapStatus,
  normaliseLessonMeta,
  normaliseValue,
  readLessonMeta,
} from "@aof/work/memory-vocabulary";

export const memoryVocabularyTests = [
  {
    name: "148/02 vocabulary: the enums are the ones the retrospective prompt prescribes",
    run: () => {
      assert.deepEqual([...LESSON_KINDS], ["mistake", "blocker", "near-miss", "misunderstanding"]);
      assert.deepEqual([...LESSON_AREAS], ["code", "architecture", "contract", "security", "process"]);
      assert.deepEqual([...LESSON_STAGES], ["refine", "build", "verify"]);
      assert.deepEqual([...GAP_STATUSES], ["open", "discharged", "open-by-decision"]);
      assert.deepEqual(Object.keys(LESSON_ENUM_FIELDS), ["kind", "area", "stage"], "tag order is kind, area, stage");
    },
  },
  {
    name: "148/02 vocabulary: the R<n> reader keeps each heading's id, raw title and 1-based line",
    run: () => {
      const text = ["# Retro", "", "## R1 — First `lesson`", "body one", "", "### R2: Second", "body two"].join("\r\n");
      const sections = lessonSections(text);
      assert.deepEqual(sections.map((s) => [s.id, s.rawTitle, s.line]), [["R1", "First `lesson`", 3], ["R2", "Second", 6]]);
      assert.deepEqual(sections[0].body, ["body one", ""]);
    },
  },
  {
    name: "148/02 vocabulary: the meta reader takes the first value of each label and stops at each segment",
    run: () => {
      const meta = readLessonMeta([
        "- **Kind:** blocker (stall) · **Area:** process",
        "- **Kind:** mistake · **Stage:** build · **Owner:** orchestrator · **Raised by:** observe",
        "- **What happened:** a field that is not a meta label",
      ]);
      assert.deepEqual(meta, { kind: "blocker (stall)", area: "process", stage: "build", owner: "orchestrator", "raised by": "observe" });
    },
  },
  {
    name: "148/02 vocabulary: a token matches only when the word ends, longest first, a space standing for a hyphen",
    run: () => {
      assert.deepEqual(normaliseValue("near-miss (recurring)", LESSON_KINDS), { value: "near-miss", tag: "recurring", conforms: true });
      assert.deepEqual(normaliseValue("near missing", LESSON_KINDS), { value: "near missing", tag: null, conforms: false });
      assert.deepEqual(normaliseValue("mistakes", LESSON_KINDS), { value: "mistakes", tag: null, conforms: false });
      assert.deepEqual(normaliseValue("near miss", LESSON_KINDS), { value: "near-miss", tag: null, conforms: true });
      assert.deepEqual(normaliseValue("Open By Decision", GAP_STATUSES), { value: "open-by-decision", tag: null, conforms: true });
      assert.deepEqual(normaliseValue("open by", GAP_STATUSES), { value: "open", tag: "by", conforms: true });
    },
  },
  {
    name: "148/02 vocabulary: only a remainder that is ONE parenthesised group loses its parentheses",
    run: () => {
      assert.equal(normaliseValue("build (caught at review)", LESSON_STAGES).tag, "caught at review");
      assert.equal(normaliseValue("build (a) and (b)", LESSON_STAGES).tag, "(a) and (b)");
      assert.equal(normaliseValue("build ((nested))", LESSON_STAGES).tag, "(nested)");
      assert.equal(normaliseValue("**build** `(x)`", LESSON_STAGES).tag, "x", "emphasis is stripped");
    },
  },
  {
    name: "148/02 vocabulary: a blank is blank, never guessed; Owner is never normalised",
    run: () => {
      assert.deepEqual(normaliseValue("  ", LESSON_KINDS), { value: "", tag: null, conforms: false });
      assert.deepEqual(normaliseField("owner", " developer (Story 00) "), { value: "developer (Story 00)", tag: null });
      assert.deepEqual(normaliseLessonMeta({}), { kind: "", area: "", stage: "", owner: "", tags: [] });
    },
  },
  {
    name: "148/02 vocabulary: a lesson's tags follow field order, without repeats",
    run: () => {
      const out = normaliseLessonMeta({ kind: "near-miss (recurring)", area: "process (recurring)", stage: "build (caught at review)", owner: "qa" });
      assert.deepEqual(out, { kind: "near-miss", area: "process", stage: "build", owner: "qa", tags: ["recurring", "caught at review"] });
    },
  },
  {
    name: "148/02 vocabulary: a gap with no written status is open",
    run: () => {
      assert.deepEqual(normaliseGapStatus(""), { value: "open", tag: null });
      assert.deepEqual(normaliseGapStatus(undefined), { value: "open", tag: null });
      assert.deepEqual(normaliseGapStatus("discharged (by story `86`, 2026-09-04)"), { value: "discharged", tag: "by story 86, 2026-09-04" });
    },
  },
];
