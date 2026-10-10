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
  canonicalRecurrence,
  forwardLessonMeta,
  lessonMetaProblems,
  lessonSections,
  normaliseField,
  normaliseGapStatus,
  normaliseLessonMeta,
  normaliseValue,
  promotionBoundary,
  readLessonMeta,
  readPromotion,
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

  // ------------------------------------------------------------------ 153/02 ----
  // The forward fields (ADR-002): `Promoted to` and `Recurs` ride the same meta reader and the same hold.
  {
    name: "153/02 E1: a promotionFrom watermark of 4 owes R4 a promotion and leaves R1 through R3 alone",
    run: () => {
      const meta = "- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer";
      const retro = (r4) => ["---", "promotionFrom: 4", "---", "# Retrospective", "", ...[1, 2, 3].flatMap((n) => [`## R${n} — legacy ${n}`, meta, ""]), "## R4 — new", meta, ...r4, ""].join("\n");
      assert.deepEqual(lessonMetaProblems(retro(["- **Promoted to:** none"])), [], "R4 with Promoted to none conforms, R1..R3 owe nothing");
      const missing = lessonMetaProblems(retro([]));
      assert.deepEqual(missing.map(({ id, field, missing: isMissing }) => ({ id, field, isMissing })), [{ id: "R4", field: "promotion", isMissing: true }]);
      assert.equal(missing[0].label, "Promoted to", "the finding names the field an author writes");
    },
  },
  {
    name: "153/02 E2: with no watermark a lesson is legacy, and a watermark never exempts a later lesson",
    run: () => {
      const meta = "- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer";
      const at = (from) => [...(from ? ["---", `promotionFrom: ${from}`, "---"] : []), "# R", "", "## R1 — a", meta, "", "## R9 — b", meta, ""].join("\n");
      assert.deepEqual(lessonMetaProblems(at(null)), [], "a document with no watermark stays legacy");
      assert.deepEqual(lessonMetaProblems(at(5)).map((problem) => problem.id), ["R9"], "R9 is above the watermark of 5; R1 is below it");
      assert.deepEqual(lessonMetaProblems(at(1)).map((problem) => problem.id), ["R1", "R9"], "a watermark of 1 owes every lesson");
    },
  },
  {
    name: "153/02 E3: Promoted to is kept verbatim as the record's status and Recurs becomes one canonical tag",
    run: () => {
      const meta = readLessonMeta(["- **Kind:** near-miss (recurring) · **Promoted to:** prompt:packages/core/assets/commands/refine.md · **Recurs:** m45/R13"]);
      assert.deepEqual(forwardLessonMeta(meta), { status: "prompt:packages/core/assets/commands/refine.md", recursTag: "recurs:45/R13" });
      assert.deepEqual(forwardLessonMeta({}), { status: "", recursTag: null }, "a legacy lesson carries neither");
      assert.deepEqual(forwardLessonMeta({ recurs: "nonsense" }), { status: "", recursTag: null }, "a malformed reference is not indexed");
      assert.equal(canonicalRecurrence("45/R13"), "45/R13");
      assert.equal(canonicalRecurrence("m45/R13"), "45/R13", "the m prefix is optional and dropped");
      assert.equal(canonicalRecurrence("148/02/R1"), "148/02/R1", "a story's lesson is addressed by its story ref");
      assert.equal(canonicalRecurrence("R13"), null);
    },
  },
  {
    name: "153/02 outline: new metadata syntax is checked by the shared hold — none | rule: | control: | prompt: and one canonical reference",
    run: () => {
      const rows = [
        ["none", null, "conforming"],
        ["rule:.aof/rules/cleanup.md", "45/R13", "conforming"],
        ["control:153/FF-15301", "45/R13", "conforming"],
        ["prompt:packages/core/assets/commands/continue.md", "45/R13", "conforming"],
        ["prompt:", null, "promotion"],
        ["invented:value", null, "promotion"],
        ["none", "nonsense", "recurs"],
      ];
      for (const [promotion, recurrence, result] of rows) {
        const lines = ["---", "promotionFrom: 4", "---", "## R4 — x", "- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** dev", `- **Promoted to:** ${promotion}`, ...(recurrence ? [`- **Recurs:** ${recurrence}`] : [])];
        const fields = lessonMetaProblems(lines.join("\n")).map((problem) => problem.field);
        assert.deepEqual(fields, result === "conforming" ? [] : [result], `${promotion} / ${recurrence ?? "absent"}`);
      }
      assert.equal(readPromotion("`rule:.aof/rules/a.md`").value, "rule:.aof/rules/a.md", "emphasis around a value is not part of it");
    },
  },
  {
    name: "153/02: inline and separate meta lines give the same promotion and recurrence, and the first value wins",
    run: () => {
      const inline = readLessonMeta(["- **Kind:** mistake · **Promoted to:** rule:.aof/rules/a.md · **Recurs:** 45/R13"]);
      const separate = readLessonMeta(["- **Kind:** mistake", "- **Promoted to:** rule:.aof/rules/a.md", "- **Recurs:** 45/R13"]);
      assert.equal(inline["promoted to"], separate["promoted to"]);
      assert.equal(inline.recurs, separate.recurs);
      const repeated = readLessonMeta(["- **Promoted to:** none", "- **Promoted to:** rule:.aof/rules/a.md", "- **Recurs:** 1/R1 · **Recurs:** 2/R2"]);
      assert.equal(repeated["promoted to"], "none", "the first Promoted to wins");
      assert.equal(repeated.recurs, "1/R1", "the first Recurs wins");
    },
  },
  {
    name: "153/02: a malformed forward boundary is reported, never read as legacy — and nothing is rewritten",
    run: () => {
      const body = ["## R4 — x", "- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** dev"];
      for (const value of ["0", "-3", "four", "4.5", "", "4 5"]) {
        const text = ["---", `promotionFrom: ${value}`, "---", ...body].join("\n");
        const before = text;
        const problems = lessonMetaProblems(text);
        assert.equal(promotionBoundary(text).state, "invalid", `"${value}" is an invalid boundary`);
        assert.deepEqual(problems.map((problem) => problem.field), ["promotionFrom"], `"${value}" is the one finding`);
        assert.equal(problems[0].boundary, true);
        assert.equal(text, before, "the reader is pure");
      }
      assert.deepEqual(promotionBoundary("# no frontmatter\n"), { state: "absent" });
      assert.equal(promotionBoundary("---\npromotionFrom: '7'\n---\n").from, 7, "a quoted integer is an integer");
    },
  },
];
