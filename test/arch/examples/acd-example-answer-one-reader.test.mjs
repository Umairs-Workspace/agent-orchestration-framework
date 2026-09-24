// FF-13401 (milestone 134 / ADR-003 §1, §3) — THE HARNESS'S ANSWER HAS ONE READER, AND ITS STAMP
// ONE WRITER.
//
// "`toolUseResult` appears in `src/work-examples/answers.mjs` and in no other module;
//  `answers.mjs` does not spell the string `AskUserQuestion`; and `answers` is written onto a run's
//  `brief` only inside `recordAnswers` in `src/run-store.mjs`."
//
// Why it matters: an example labelled `confirmed` or `stated` is checked against the person's
// answer in the harness transcript. Two readers of that record can disagree about what counts as an
// answer (a refusal, an untokened question, an `is_error` result), and a second writer of the stamp
// can put on the run record an answer no reader ever saw. The tool's name has its one home in
// `HUMAN_INPUT_TOOL_NAMES`, so the reader imports it rather than spelling it.
//
// The writer detector matches the three ways JavaScript writes a property: an assignment through
// `brief.answers` (or `brief?.answers`), an assignment through `brief["answers"]`, and an
// `answers` key (or shorthand) inside an object literal that is the value of a `brief:` key.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { functionBody, matchedBraceBody, stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const THE_READER = "src/work-examples/answers.mjs";
const THE_WRITER = "src/run-store.mjs";
const WRITER_HEADER = "export async function recordAnswers(";

async function modules(dir = path.join(repoRoot, "src")) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "bundle") out.push(...await modules(full));
    } else if (entry.name.endsWith(".mjs")) {
      out.push(full);
    }
  }
  return out;
}

// Does this (comment-stripped) code read the harness's answer record?
const readsToolUseResult = (code) => /\btoolUseResult\b/.test(code);

// The writes of `answers` onto a `brief` in this (comment-stripped) code.
function briefAnswersWrites(code) {
  const hits = [];
  if (/\bbrief\s*(?:\?\.|\.)\s*answers\s*=(?!=)/.test(code)) hits.push("assigns brief.answers");
  if (/\bbrief\s*(?:\?\.)?\s*\[\s*["'`]answers["'`]\s*\]\s*=(?!=)/.test(code)) hits.push("assigns brief[\"answers\"]");
  for (const match of code.matchAll(/\bbrief\s*:\s*\{/g)) {
    const body = matchedBraceBody(code, match.index);
    if (body != null && /(?<![\w$.])answers\s*(?::|,|$)/.test(body)) hits.push("writes an answers key into a brief literal");
  }
  return hits;
}

// The writer module, with the one sanctioned writer's body cut out: what is left may write nothing.
function outsideTheWriter(code) {
  const body = functionBody(code, WRITER_HEADER);
  return body == null ? code : code.replace(body, "");
}

export const archTests = [
  {
    name: "arch/134 FF-13401: `toolUseResult` is read in src/work-examples/answers.mjs and in no other module",
    run: async () => {
      const readers = [];
      for (const full of await modules()) {
        const file = path.relative(repoRoot, full).replace(/\\/g, "/");
        if (readsToolUseResult(stripComments(await readFile(full, "utf8")))) readers.push(file);
      }
      assert.deepEqual(readers, [THE_READER], "the harness's answer has one reader");
    },
  },
  {
    name: "arch/134 FF-13401: answers.mjs takes the tool's name from HUMAN_INPUT_TOOL_NAMES and never spells it",
    run: async () => {
      const code = stripComments(await readFile(path.join(repoRoot, THE_READER), "utf8"));
      assert.doesNotMatch(code, /AskUserQuestion/, "answers.mjs does not spell the tool's name");
      assert.match(code, /import\s*\{[^}]*\bHUMAN_INPUT_TOOL_NAMES\b[^}]*\}\s*from\s*["']\.\.\/agent-session-driver\.mjs["']/, "it imports the list from its one home");
    },
  },
  {
    name: "arch/134 FF-13401: `answers` is written onto a run's brief only inside recordAnswers in src/run-store.mjs",
    run: async () => {
      const writers = [];
      for (const full of await modules()) {
        const file = path.relative(repoRoot, full).replace(/\\/g, "/");
        let code = stripComments(await readFile(full, "utf8"));
        if (file === THE_WRITER) {
          const body = functionBody(code, WRITER_HEADER);
          assert.ok(body != null, "recordAnswers is found in the run store");
          assert.ok(briefAnswersWrites(body).length > 0, "the detector sees recordAnswers's own write — the sweep is not vacuous");
          code = outsideTheWriter(code);
        }
        for (const hit of briefAnswersWrites(code)) writers.push(`${file}: ${hit}`);
      }
      assert.deepEqual(writers, [], "no second writer of brief.answers");
    },
  },
  {
    name: "arch/134 FF-13401 red probe: a planted second reader, a planted spelling of the tool name, or a planted second writer turns the control red",
    run: async () => {
      // A second reader.
      assert.ok(readsToolUseResult(stripComments("const result = entry.toolUseResult;")), "a second reader is seen");
      assert.ok(!readsToolUseResult(stripComments("// the toolUseResult is read elsewhere\nconst x = 1;")), "a comment is not a reader");
      // The tool's name spelt in the reader.
      const reader = await readFile(path.join(repoRoot, THE_READER), "utf8");
      const spelt = stripComments(reader.replace("HUMAN_INPUT_TOOL_NAMES.includes(block.name)", "block.name === \"AskUserQuestion\""));
      assert.notEqual(spelt, stripComments(reader), "the plant landed");
      assert.match(spelt, /AskUserQuestion/, "a planted spelling of the tool name is seen");
      // A second writer, in each form, in another module.
      for (const planted of [
        "record.brief.answers = answers;",
        "run.brief?.answers = [];",
        "record.brief[\"answers\"] = answers;",
        "await persist(item, { ...record, brief: { ...record.brief, answers: list } });",
        "const next = { brief: { loop, answers } };",
      ]) {
        assert.ok(briefAnswersWrites(stripComments(planted)).length > 0, `${planted} is seen as a writer`);
      }
      for (const benign of [
        "const { loop: _loop, answers: _answers, ...rest } = prior;",
        "if (record.brief?.answers != null) return record.brief.answers;",
        "found.push(...run.brief.answers);",
      ]) {
        assert.deepEqual(briefAnswersWrites(stripComments(benign)), [], `${benign} is not a writer`);
      }
      // A second writer inside the run store, outside recordAnswers.
      const store = await readFile(path.join(repoRoot, THE_WRITER), "utf8");
      const plantedStore = stripComments(store.replace("function carriedBrief(prior) {", "function carriedBrief(prior) {\n  prior.brief.answers = [];"));
      assert.ok(briefAnswersWrites(outsideTheWriter(plantedStore)).length > 0, "a second writer in the run store is seen");
    },
  },
];
