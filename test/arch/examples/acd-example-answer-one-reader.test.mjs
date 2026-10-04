// FF-13401 (milestone 134 / ADR-003 §1, §3) — THE HARNESS'S ANSWER HAS ONE READER, AND ITS STAMP
// ONE WRITER.
//
// "`toolUseResult` appears in `packages/work/src/examples/answers.mjs` and in no other module;
// (since 135/01 the reader is `packages/specification-by-example/src/answers.mjs`; the invariant is
// unchanged, its path moved with the package — 135/ADR-001 §5)
//  `answers.mjs` does not spell the string `AskUserQuestion`; and `answers` is written onto a run's
//  `brief` only inside `recordAnswers` in `packages/core/src/run-store.mjs`."
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
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blankStringLiterals, functionBody, matchedBraceBody, stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const THE_READER = "packages/specification-by-example/src/answers.mjs";
const THE_WRITER = "packages/execution/src/runs.mjs";
const WRITER_HEADER = "async function recordAnswers(";

async function modules() {
  return (await readRuntimeFiles(repoRoot)).filter(file => !file.rel.startsWith("packages/core/assets/")).map(file => file.path);
}

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

// FF-13601 (milestone 136 / ADR-001 §1, §2) — 131'S ANSWER IS READ AS PROVENANCE IN ONE PLACE.
//
// "In comment-stripped `packages/specification-by-example/src/**`, a run record's `asks` is read
//  only in `answers.mjs`, and only inside `collectAnswers`; the reader names no token pattern of
//  its own (it calls `readMapToken`)."
//
// `collectAnswers` reads the asks through the one helper it calls, `readAskAnswers`, so that body is
// the sanctioned region. A read is a property access (`.asks`, `?.asks`, `["asks"]`); a token
// pattern is a regular-expression literal naming an `E`/`Q` id. Both detectors are deliberately
// simple: the package is five modules, and a second checker grows there or not at all.
const SBE_SRC = "packages/specification-by-example/src";
const ASK_HELPER = "function readAskAnswers(";
const readsAsks = (code) => /(?:\?\.|\.)\s*asks\b|\[\s*["'`]asks["'`]\s*\]/.test(code);
function ownTokenPatterns(source) {
  const code = blankStringLiterals(source);
  const literals = [...code.matchAll(/(?<![\w$)\]])\/(?![/*])(?:\\.|\[(?:\\.|[^\]\n])*\]|[^/\n\\[])+\/[dgimsuyv]*/g)].map((match) => match[0]);
  return literals.filter((literal) => /\[(?:EQ|QE)\]|[EQ](?:\\d|\[[01]-9\])/.test(literal));
}
async function askReaders(plant = {}) {
  const readers = [];
  const modules = (await readdir(path.join(repoRoot, SBE_SRC))).filter((entry) => entry.endsWith(".mjs")).sort();
  // FF-11902: the sweep must reach the reader it judges, so an emptied walk reds rather than passes.
  assert.ok(modules.includes(path.basename(THE_READER)), `the sweep of ${SBE_SRC} reads ${THE_READER}`);
  for (const name of modules) {
    const file = `${SBE_SRC}/${name}`;
    let code = stripComments(plant[name] ?? await readFile(path.join(repoRoot, file), "utf8"));
    if (file === THE_READER) {
      const body = functionBody(code, ASK_HELPER);
      if (body != null) code = code.replace(body, "");
    }
    if (readsAsks(code)) readers.push(file);
    if (file === THE_READER && ownTokenPatterns(code).length > 0) readers.push(`${file}: a token pattern of its own`);
  }
  return readers;
}

export const archTests = [
  {
    name: "arch/136 FF-13601: a run's asks are read in answers.mjs only, inside collectAnswers's helper, and the reader names no token pattern",
    run: async () => {
      const code = stripComments(await readFile(path.join(repoRoot, THE_READER), "utf8"));
      const helper = functionBody(code, ASK_HELPER);
      assert.ok(helper != null, "readAskAnswers is found in the reader");
      assert.ok(readsAsks(helper), "the detector sees the helper's own read — the sweep is not vacuous");
      assert.match(functionBody(code, "async function collectAnswers(") ?? "", /\breadAskAnswers\(/, "collectAnswers calls the helper");
      assert.match(helper, /\breadMapToken\(/, "the helper reads the token through readMapToken");
      assert.deepEqual(await askReaders(), [], "131's answer has one reader, and it spells no token");
    },
  },
  {
    name: "arch/136 FF-13601 red probe: a second reader of the asks, or a token pattern of the reader's own, turns the control red",
    run: async () => {
      const lane = await readFile(path.join(repoRoot, SBE_SRC, "doctor-lane.mjs"), "utf8");
      const plantedLane = `${lane}\nexport const plantedAsks = (run) => run.asks;\n`;
      assert.deepEqual(await askReaders({ "doctor-lane.mjs": plantedLane }), [`${SBE_SRC}/doctor-lane.mjs`], "a second reader names doctor-lane.mjs");
      const reader = await readFile(path.join(repoRoot, THE_READER), "utf8");
      for (const pattern of ["/Q\\d+/", "/^7\\/2 [EQ][1-9]\\d*/", "/\\bQ[0-9]+/"]) {
        const planted = `${reader}\nexport const plantedToken = (text) => ${pattern}.test(text);\n`;
        assert.deepEqual(await askReaders({ "answers.mjs": planted }), [`${THE_READER}: a token pattern of its own`], `${pattern} names answers.mjs`);
      }
      const outside = reader.replace("async function collectAnswers(story, opts = {}) {", "async function collectAnswers(story, opts = {}) {\n  void story.asks;");
      assert.notEqual(outside, reader, "the plant landed");
      assert.deepEqual(await askReaders({ "answers.mjs": outside }), [THE_READER], "a read outside the helper names answers.mjs");
      for (const benign of ["// run.asks is read by the reader", "const text = \"the asks\";", "const asksCount = 1;"]) {
        assert.equal(readsAsks(stripComments(benign)), false, `${benign} is not a read`);
      }
    },
  },
  {
    name: "arch/134 FF-13401: `toolUseResult` is read in packages/specification-by-example/src/answers.mjs and in no other module",
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
      assert.match(code, /createExampleAnswers\(\{[^}]*HUMAN_INPUT_TOOL_NAMES/, "the reader receives the shared tool vocabulary");
      const adapter = stripComments(await readFile(path.join(repoRoot, "packages/core/src/application/bindings/work-examples/answers.mjs"), "utf8"));
      assert.match(adapter, /const\s*\{[^}]*HUMAN_INPUT_TOOL_NAMES[^}]*\}\s*= agentSessionDriverServices/, "core binds the list from its one home");
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
