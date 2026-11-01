// 179/03 — the pedagogy is one vocabulary, and the teaching session guides through the problem with
// it: think first, help pulled one labelled rung at a time, and traps taught through the task's own
// examples. Read against the package's `vocabulary.mjs` and the `<guidance>` region of its prompt,
// flattened, so a re-wrapped line cannot move a rule (179/ARCHITECTURE ADR-006).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STAGES, HELP_LADDER, TRAPS } from "@aof/learning/vocabulary";

const TEACH = new URL("../assets/commands/teach.md", import.meta.url);
const MANUAL = new URL("../../core/assets/commands/manual.md", import.meta.url);

const flattened = (value) => String(value).replace(/<!--[^]*?-->/gu, " ").replace(/\s+/gu, " ").trim();

// The prompt's `<guidance>` region, flattened; a missing region fails as NOT FOUND. The tag is
// matched at the start of a line, since the process step that points at it spells it inline.
function guidance() {
  const text = readFileSync(TEACH, "utf8");
  const at = text.indexOf("\n<guidance>\n");
  const end = text.indexOf("\n</guidance>", at);
  assert.ok(at >= 0 && end > at, "teach.md: NOT FOUND — the <guidance> region could not be cut");
  return flattened(text.slice(at + "\n<guidance>\n".length, end));
}

const vocabularyRows = [
  ["STAGES", STAGES, ["reinterpret", "find analogies", "consider solutions", "evaluate a candidate", "implement", "evaluate the implementation"]],
  ["HELP_LADDER", HELP_LADDER, ["diagnostic question", "conceptual hint", "analogous example", "partial scaffold", "worked explanation"]],
].map(([list, value, entries]) => ({
  name: `179/03 the vocabulary holds each list in order [${list}]`,
  run: () => {
    assert.ok(Object.isFrozen(value), `${list} is frozen`);
    assert.deepEqual([...value], entries);
  },
}));

const trapRows = [
  ["Forming", "examples and counterexamples"],
  ["Assumption", "examples and counterexamples"],
  ["Dislodging", "revisiting an approach"],
  ["Achievement", "revisiting an approach"],
  ["Location", "stage awareness"],
  ["Progression", "prerequisite questions"],
  ["Interruption", "pull-based hints"],
  ["Mislead", "source and test checks"],
].map(([trap, control], index) => ({
  name: `179/03 each trap carries the control the SPEC pairs it with [${trap}]`,
  run: () => {
    assert.ok(Object.isFrozen(TRAPS) && Object.isFrozen(TRAPS[index]), "TRAPS and its entries are frozen");
    assert.equal(TRAPS.length, 8, "eight traps");
    assert.deepEqual({ ...TRAPS[index] }, { trap, control });
  },
}));

const groundingRows = [
  ["the story's task features and their scenario names", /the story's task features and their scenario names/u],
  ["the confirmed and stated examples in the story's `EXAMPLES.md`", /the confirmed and stated examples in the story's `EXAMPLES\.md`/u],
  ["the ADR anchors in the story's `reads:`", /the ADR anchors in the story's `reads:`/u],
  ["the `files:` entries and the test files among them", /the `files:` entries and the test files among them/u],
  ["the six problem-solving stages, named as a map and never as a sequence of approvals", /the six problem-solving stages, named as a map and never as a sequence of approvals/u],
].map(([source, rule]) => ({
  name: `179/03 the guidance is grounded in the story's own record [${source}]`,
  run: () => {
    const text = guidance();
    assert.match(text, /Ground every question in the story's own record/u);
    assert.match(text, rule);
  },
}));

export const teachGuideTests = [
  ...vocabularyRows,
  ...trapRows,
  {
    name: "179/03 E1 · the session asks for a restatement before naming a file to change",
    run: () => {
      const text = guidance();
      assert.match(text, /Before naming any file to change, the session asks the human to restate the problem in their own words/u);
      assert.match(text, /It then asks for a prediction of one example's outcome — [^—]* — and then for an approach/u);
      const restate = text.indexOf("restate the problem");
      assert.ok(restate >= 0 && restate < text.indexOf("prediction of one example") && text.indexOf("prediction of one example") < text.indexOf("then for an approach"), "restate → predict → propose");
    },
  },
  {
    name: "179/03 E2 · the human may skip a step",
    run: () => assert.match(guidance(), /The human may skip any thinking-first step: the session moves to the next one without arguing/u),
  },
  {
    name: "179/03 E3 · \"I'm stuck\" climbs one rung, labelled",
    run: () => {
      const text = guidance();
      assert.match(text, /The session offers the next rung only when the human asks or says they are stuck/u);
      assert.match(text, /each answer names the rung it comes from/u);
    },
  },
  {
    name: "179/03 E4 · the worked explanation is given on request, in the terminal",
    run: () => {
      const text = guidance();
      assert.match(text, /The human may ask for any rung directly, the worked explanation included/u);
      assert.match(text, /No rung writes a file/u);
    },
  },
  {
    name: "179/03 E5 · a declined question offers the next rung, not another question",
    run: () => {
      const text = guidance();
      assert.match(text, /When the human declines a question, the session offers the next rung instead of asking another one/u);
      assert.match(text, /It asks one question at a time and never dumps code the human did not ask for/u);
    },
  },
  {
    name: "179/03 E7 · each task starts at the first rung",
    run: () => assert.match(guidance(), /Each task starts at the diagnostic question\*\*, whatever rung the previous task reached/u),
  },
  {
    name: "179/03 E6 · a counterexample from the task, never a diagnosis",
    run: () => {
      const text = guidance();
      assert.match(text, /A trap is taught through the current problem, never as a label on the human/u);
      assert.match(text, /each has a control the session applies to the task in front of it/u);
      assert.match(text, /offer a counterexample from the task's examples/u);
      assert.match(text, /The session never tells the human they fell into a trap, and never names a trap as a judgement of the person/u);
    },
  },
  ...groundingRows,
  {
    name: "179/03 the help ladder is listed weakest first, in the vocabulary's order",
    run: () => {
      const text = guidance().toLowerCase();
      const at = HELP_LADDER.map((rung) => text.indexOf(`**${rung}**`));
      assert.ok(at.every((index) => index >= 0), "every rung is named in bold in the ladder");
      assert.deepEqual([...at].sort((a, b) => a - b), at, "the rungs appear in the vocabulary's order");
    },
  },
  {
    name: "179/03 the guidance names no rung or trap the vocabulary lacks (ADR-006 §2)",
    run: () => {
      const text = guidance();
      const ladder = text.slice(text.indexOf("The help ladder has five rungs"), text.indexOf("The session offers the next rung"));
      const rungs = [...ladder.matchAll(/\d\. an? \*\*([^*]+)\*\*/gu)].map((match) => match[1]);
      assert.deepEqual(rungs, [...HELP_LADDER], "the numbered ladder is exactly HELP_LADDER");
      const trapList = text.slice(text.indexOf("Eight traps are common"), text.indexOf("The session never tells the human"));
      const named = [...trapList.matchAll(/- \*\*([^*]+)\*\*|and \*\*([^*]+)\*\* \(/gu)].map((match) => match[1] ?? match[2]);
      assert.deepEqual(named, TRAPS.map(({ trap }) => trap), "the trap list names exactly TRAPS, in order");
    },
  },
  {
    name: "179/03 plain manual is unchanged",
    run: () => {
      const manual = readFileSync(MANUAL, "utf8");
      assert.match(flattened(manual), /an order to take the tasks in, with the reason for it/u);
      const vocabulary = [...STAGES, ...HELP_LADDER, ...TRAPS.map(({ trap }) => trap)];
      const named = vocabulary.filter((entry) => new RegExp(`\\b${entry.replace(/ /gu, "\\s+")}\\b`, "iu").test(manual));
      assert.deepEqual(named, [], "manual.md names no rung, stage or trap");
    },
  },
];
