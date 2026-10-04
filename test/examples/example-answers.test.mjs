import { defaultSessionDriver as _aofSessions } from "aof/session-services";
import { defaultFoundation as _aofFoundation } from "aof/foundation-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 134 / story 03 — the answer is read from the harness.
//
// Covers EVERY @executable scenario in three task features, except the two noted:
//   tasks/00_one-reader-turns-a-persons-answer-into-a-record.feature
//     (FF-13401 is `test/arch/examples/acd-example-answer-one-reader.test.mjs`)
//   tasks/01_the-answer-is-stamped-once-at-settle-and-collected-for-a-story.feature
//   tasks/02_settle-reads-the-transcript-store-that-exists.feature
//     ("a hand-run settle now stamps spend" is `test/run/run-spend-ingest.test.mjs`, the spend
//      suite the story names; FF-13404 is `test/arch/examples/acd-settle-reads-the-transcript-store.test.mjs`)
//
// The transcripts are fixture `.jsonl` texts in the line shapes RESEARCH R1 measured: an
// `assistant` line holding the asking `tool_use` block, and a `user` line holding its
// `tool_result` with the harness's top-level `toolUseResult`. Every project, run store, transcript
// directory and Claude config directory is a fresh temp directory; nothing reads the real
// `~/.claude`. One test object per @executable scenario, Scenario Outline rows folded into one
// entry iterating the rows. node:assert/strict, `{ name, run }` shape.
//
// And, for milestone 136 / story 01 (a loop answer anchors the example), EVERY @executable scenario
// in
//   tasks/00_an-answered-loop-question-is-a-persons-answer-to-its-token.feature
//   tasks/01_an-ask-that-cannot-name-its-one-token-anchors-none.feature
//     (FF-13601 is `test/arch/examples/acd-example-answer-one-reader.test.mjs`)
// over story 04's fixture project renumbered to `7/2`, its asks written by 131's own run-store
// writers and the doctor driven through the real CLI.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { E, Q, QUESTIONS, R, mapOf, withExamplesProject } from "./doctor-examples-lane.test.mjs";

const HUMAN_INPUT_TOOL_NAMES = _aofSessions.agentSessionDriver.HUMAN_INPUT_TOOL_NAMES;
const setDegradeSinkForTest = _aofFoundation.degrade.setDegradeSinkForTest;
const transitionRunComplete = _aofApplication.execution.transitions.transitionRunComplete;
const completeRun = _aofApplication.execution.runs.completeRun;
const readRuns = _aofApplication.execution.runs.readRuns;
const recordAnswers = _aofApplication.execution.runs.recordAnswers;
const retryRun = _aofApplication.execution.runs.retryRun;
const runRecordPath = _aofApplication.execution.runs.runRecordPath;
const startRun = _aofApplication.execution.runs.startRun;
const { answerRunAsk, openRunAsk, parkRunAsk, runNodeRecordPath } = _aofApplication.execution.runs;
const collectAnswers = _aofApplication.work.examples.answers.collectAnswers;
const readAnswers = _aofApplication.work.examples.answers.readAnswers;
const projectSlug = _aofSessions.workObserve.projectSlug;

// ── transcript fixtures ─────────────────────────────────────────────────────

const ASKED_AT = "2026-09-24T10:00:00.000Z";
const ANSWERED_AT = "2026-09-24T10:01:00.000Z";
const SESSION = "sess-1";
const Q1 = "134/02 Q1 · who may borrow?";

// The asking line: one `tool_use` block, by default an `AskUserQuestion` call.
function ask(id, questions, { name = "AskUserQuestion", sessionId = SESSION, at = ASKED_AT } = {}) {
  const input = name === "AskUserQuestion"
    ? { questions: questions.map((question) => ({ question, header: "Q", options: [{ label: "a", description: "a" }], multiSelect: false })) }
    : { command: "echo hi" };
  return JSON.stringify({
    type: "assistant",
    sessionId,
    timestamp: at,
    message: { role: "assistant", model: "claude-opus", content: [{ type: "tool_use", id, name, input }] },
  });
}

// The answering line. `answers` is the harness's `answers` object; `result` replaces the whole
// `toolUseResult` (a refusal is the string); `noEntrypoint` leaves the `entrypoint` key off the line.
function answer(id, answers, { result, isError = false, sessionId = SESSION, at = ANSWERED_AT, entrypoint = "cli", noEntrypoint = false } = {}) {
  const line = {
    type: "user",
    sessionId,
    timestamp: at,
    message: {
      role: "user",
      content: [{ type: "tool_result", tool_use_id: id, content: "The user answered.", ...(isError ? { is_error: true } : {}) }],
    },
    toolUseResult: result !== undefined ? result : { questions: Object.keys(answers).map((question) => ({ question })), answers },
  };
  if (!noEntrypoint) line.entrypoint = entrypoint;
  return JSON.stringify(line);
}

const REFUSAL = { result: "User rejected tool use", isError: true };
const usage = (sessionId = SESSION) => JSON.stringify({
  type: "assistant",
  sessionId,
  timestamp: ASKED_AT,
  message: { model: "claude-opus", usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }, content: [{ type: "text", text: "ok" }] },
});
const jsonl = (lines) => `${lines.join("\n")}\n`;
const answered = (question, text, id = "toolu_01") => [ask(id, [question]), answer(id, { [question]: text })];

// ── store fixtures ──────────────────────────────────────────────────────────

// A fixture project holding milestone `134` and its stories `134/02` and `134/04`, plus a separate
// transcript directory. `AOF_GLOBAL_HOME` is already a temp directory under the runner.
async function project() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-answers-"));
  const repo = path.join(root, "repo");
  const milestone = { ref: "134", dir: path.join(repo, "wiki", "work", "134_milestone_discovery") };
  const s02 = { ref: "134/02", dir: path.join(milestone.dir, "stories", "02_story_the-map") };
  const s04 = { ref: "134/04", dir: path.join(milestone.dir, "stories", "04_story_the-gate") };
  for (const item of [s02, s04]) await mkdir(item.dir, { recursive: true });
  const projectsDir = path.join(root, "transcripts");
  await mkdir(projectsDir, { recursive: true });
  return { root, repo, milestone, s02, s04, projectsDir, done: () => rm(root, { recursive: true, force: true }) };
}

const writeTranscript = (dir, sessionId, text) => mkdir(dir, { recursive: true }).then(() => writeFile(path.join(dir, `${sessionId}.jsonl`), text, "utf8"));

// "a valid record for T".
function valid(token, over = {}) {
  return { token, question: `${token} · a question?`, answer: "an answer", toolUseId: "toolu_01", sessionId: SESSION, at: ASKED_AT, entrypoint: "cli", ...over };
}
function without(record, key) {
  const copy = { ...record };
  delete copy[key];
  return copy;
}

// A settled run of `item`, optionally stamped. `failed` settles runtime_offline so a retry is legal.
async function settled(item, { outcome = "done", answers = null, sessionId = SESSION, now = ASKED_AT } = {}) {
  const run = await startRun(item, { sessionId, now });
  await completeRun(item, { runId: run.runId, outcome, failureReason: outcome === "failed" ? "runtime_offline" : null, now });
  if (answers) await recordAnswers(item, { runId: run.runId, answers });
  return run;
}

const runOf = async (item, runId) => (await readRuns(item)).find((run) => run.runId === runId);

// Capture degrade events for one case; the reporter's throttle is cleared by the reset.
async function capturingDegrades(body) {
  const events = [];
  setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
  try {
    await body(events);
  } finally {
    setDegradeSinkForTest(undefined);
  }
  return events;
}
const namesAnswers = (events) => events.filter((event) => event.code === "run-store" && /answers not stamped/.test(event.message));

export const exampleAnswersTests = [
  // ══ 00_one-reader-turns-a-persons-answer-into-a-record.feature ══
  {
    name: "examples/134-03 00 an answered question with a token becomes one record (outline: 18 cases)",
    run: async () => {
      const Qwho = "134/02 Q1 · who?";
      const Qwhen = "134/02 Q2 · when?";
      const E2 = "134/02 E2 · active loan → not offered. Is that right?";
      const rows = [
        ["one tokened question", answered(Q1, "anyone with an account"), [{ token: "134/02 Q1", answer: "anyone with an account" }]],
        ["an example put to confirm", answered(E2, "Yes"), [{ token: "134/02 E2", answer: "Yes" }]],
        ["a free-text \"Other\" answer", answered(Q1, "Members only — not on Sundays."), [{ token: "134/02 Q1", answer: "Members only — not on Sundays." }]],
        ["an answer with outer spaces", answered(Q1, " anyone, mostly "), [{ token: "134/02 Q1", answer: " anyone, mostly " }]],
        ["several questions in one call", [ask("toolu_01", [Qwho, Qwhen, "Which seam?"]), answer("toolu_01", { [Qwho]: "members", [Qwhen]: "weekdays", "Which seam?": "the store" })],
          [{ token: "134/02 Q1", answer: "members", toolUseId: "toolu_01" }, { token: "134/02 Q2", answer: "weekdays", toolUseId: "toolu_01" }]],
        ["an untokened question", answered("Which seam should the reader hang off?", "the store"), []],
        ["a token not at the head", answered("Is 134/02 Q1 settled?", "yes"), []],
        ["a refused call", [ask("toolu_01", [Q1]), answer("toolu_01", {}, REFUSAL)], []],
        ["an error with an object result", [ask("toolu_01", [Q1]), answer("toolu_01", { [Q1]: "anyone" }, { isError: true })], []],
        ["a result for another tool", [ask("toolu_01", [], { name: "Bash" }), answer("toolu_01", { [Q1]: "anyone" })], []],
        ["a result with no asking block", [ask("toolu_01", [Q1]), answer("toolu_02", { [Q1]: "anyone" })], []],
        ["an answer to a question not asked", [ask("toolu_01", [Q1]), answer("toolu_01", { "134/02 Q2 · who may lend?": "anyone" })], []],
        ["an empty answer", answered(Q1, ""), []],
        ["an answer that is not a string", [ask("toolu_01", [Q1]), answer("toolu_01", { [Q1]: ["a", "b"] })], []],
        ["a question still pending", [ask("toolu_01", [Q1])], []],
        ["asked again after a refusal", [ask("toolu_01", [Q1]), answer("toolu_01", {}, REFUSAL), ask("toolu_02", [Q1]), answer("toolu_02", { [Q1]: "anyone" })],
          [{ token: "134/02 Q1", answer: "anyone", toolUseId: "toolu_02" }]],
        ["a malformed line between", [ask("toolu_01", [Q1]), "{not json", answer("toolu_01", { [Q1]: "anyone" })], [{ token: "134/02 Q1", answer: "anyone" }]],
        ["a line with no entrypoint", [ask("toolu_01", [Q1]), answer("toolu_01", { [Q1]: "anyone" }, { noEntrypoint: true })], [{ token: "134/02 Q1", entrypoint: null }]],
      ];
      for (const [label, lines, expected] of rows) {
        const records = readAnswers(jsonl(lines));
        assert.equal(records.length, expected.length, `${label}: ${expected.length} record(s), got ${JSON.stringify(records)}`);
        expected.forEach((want, index) => {
          for (const [key, value] of Object.entries(want)) {
            assert.equal(records[index][key], value, `${label}: record ${index} ${key}`);
          }
        });
      }
    },
  },
  {
    name: "examples/134-03 00 the record carries the token, the question, the answer and the channel that gave it",
    run: async () => {
      const [record, ...rest] = readAnswers(jsonl([
        ask("toolu_01", [Q1]),
        answer("toolu_01", { [Q1]: "anyone with an account" }, { sessionId: "sess-9", at: "2026-09-24T10:07:00.000Z", entrypoint: "claude-vscode" }),
      ]));
      assert.equal(rest.length, 0, "one record");
      assert.deepEqual(Object.keys(record), ["token", "question", "answer", "toolUseId", "sessionId", "at", "entrypoint"], "exactly the seven keys — no field names a person");
      assert.deepEqual(record, {
        token: "134/02 Q1",
        question: Q1,
        answer: "anyone with an account",
        toolUseId: "toolu_01",
        sessionId: "sess-9",
        at: "2026-09-24T10:07:00.000Z",
        entrypoint: "claude-vscode",
      }, "the token, the asking block's id, and the answering line's own sessionId, timestamp and entrypoint");
    },
  },
  {
    name: "examples/134-03 00 the tool's name is read from its one home",
    run: async () => {
      const text = jsonl(answered(Q1, "anyone"));
      assert.equal(readAnswers(text).length, 1, "control: the answered, tokened call is read under the real list");
      const saved = HUMAN_INPUT_TOOL_NAMES.splice(0, HUMAN_INPUT_TOOL_NAMES.length, "SomeOtherTool");
      try {
        assert.deepEqual(readAnswers(text), [], "a list without AskUserQuestion yields no record");
      } finally {
        HUMAN_INPUT_TOOL_NAMES.splice(0, HUMAN_INPUT_TOOL_NAMES.length, ...saved);
      }
    },
  },
  {
    name: "examples/134-03 00 a transcript the reader cannot read yields nothing and never throws (outline: 7 inputs)",
    run: async () => {
      const inputs = [null, undefined, "", 42, {}, "{not json\n}{", jsonl([usage(), usage()])];
      for (const input of inputs) {
        let records;
        assert.doesNotThrow(() => { records = readAnswers(input); }, `${JSON.stringify(input)} does not throw`);
        assert.deepEqual(records, [], `${JSON.stringify(input)} yields an empty list`);
      }
    },
  },

  // ══ 01_the-answer-is-stamped-once-at-settle-and-collected-for-a-story.feature ══
  {
    name: "examples/134-03 01 the writer validates before it writes (outline: 19 rows)",
    run: async () => {
      const q1 = valid("134/02 Q1");
      const rows = [
        { given: [q1], after: [q1] },
        { before: "no-brief", given: [q1], after: [q1] },
        { before: "anchor", given: [q1], after: [q1] },
        { given: [q1, valid("134/02 Q2")], after: [q1, valid("134/02 Q2")] },
        { given: [valid("134/04 Q1")], after: [valid("134/04 Q1")] },
        { given: [valid("134/02 Q1", { entrypoint: null })], after: [valid("134/02 Q1", { entrypoint: null })] },
        { given: [], throws: true },
        { given: null, throws: true },
        { given: q1, throws: true },
        { given: [without(q1, "sessionId")], throws: true },
        { given: [valid("134/02 Q1", { answer: "" })], throws: true },
        { given: [valid("134/02 Q1", { entrypoint: 1 })], throws: true },
        { given: [without(q1, "entrypoint")], throws: true },
        { given: [valid("134/02 Q01")], throws: true },
        { given: [valid("134/02 Q1 · who may borrow?")], throws: true },
        { given: [valid("134/02 Q1", { person: "someone" })], throws: true },
        { given: [q1, valid("134/02 Q1", { toolUseId: "" })], throws: true },
        { before: "stamped", given: [valid("134/02 E2")], after: [q1], identical: true },
        { before: "stamped", given: [without(valid("134/02 E2"), "sessionId")], throws: true, after: [q1], identical: true },
      ];
      for (const [index, row] of rows.entries()) {
        const fx = await project();
        try {
          const run = await settled(fx.s02);
          const file = runRecordPath(fx.s02, run.runId);
          if (row.before === "no-brief") {
            const raw = JSON.parse(await readFile(file, "utf8"));
            delete raw.brief;
            await writeFile(file, JSON.stringify(raw, null, 2), "utf8");
          } else if (row.before === "anchor") {
            const raw = JSON.parse(await readFile(file, "utf8"));
            raw.brief = { ...(raw.brief ?? {}), anchorReadings: [{ anchor: "a-1", value: 3 }] };
            await writeFile(file, JSON.stringify(raw, null, 2), "utf8");
          } else if (row.before === "stamped") {
            await recordAnswers(fx.s02, { runId: run.runId, answers: [q1] });
          }
          const anchorsBefore = (await runOf(fx.s02, run.runId)).brief.anchorReadings;
          const bytes = await readFile(file, "utf8");
          if (row.throws) {
            await assert.rejects(recordAnswers(fx.s02, { runId: run.runId, answers: row.given }), { code: "answers-invalid" }, `row ${index + 1} throws answers-invalid`);
          } else {
            await recordAnswers(fx.s02, { runId: run.runId, answers: row.given });
          }
          const after = await runOf(fx.s02, run.runId);
          assert.deepEqual(after.brief.answers, row.after, `row ${index + 1}: brief.answers`);
          if (row.identical || (row.throws && !row.before)) assert.equal(await readFile(file, "utf8"), bytes, `row ${index + 1}: the file is byte-identical`);
          if (row.before === "anchor") {
            assert.ok(Array.isArray(anchorsBefore) && anchorsBefore.length === 1, "the fixture holds one anchor reading");
            assert.deepEqual(after.brief.anchorReadings, anchorsBefore, "the anchorReadings entry is kept");
          }
        } finally {
          await fx.done();
        }
      }
    },
  },
  {
    name: "examples/134-03 01 settle stamps the answers beside spend, from the run's own session",
    run: async () => {
      const fx = await project();
      try {
        await writeTranscript(fx.projectsDir, SESSION, jsonl([usage(), ...answered(Q1, "anyone with an account")]));
        await writeTranscript(fx.projectsDir, "sess-other", jsonl(answered("134/02 Q2 · who may lend?", "nobody", "toolu_99")));
        const run = await startRun(fx.s02, { sessionId: SESSION, now: ASKED_AT });
        await completeRun(fx.s02, { runId: run.runId, outcome: "done", now: ANSWERED_AT, projectsDir: fx.projectsDir });
        const record = await runOf(fx.s02, run.runId);
        assert.equal(record.brief.answers.length, 1, "one record, from the run's own session only");
        assert.equal(record.brief.answers[0].token, "134/02 Q1");
        assert.equal(record.brief.answers[0].answer, "anyone with an account");
        assert.ok(record.spend != null, "spend is stamped beside it");

        const bare = await startRun(fx.s04, { sessionId: "sess-none", now: ASKED_AT });
        await completeRun(fx.s04, { runId: bare.runId, outcome: "done", now: ANSWERED_AT, projectsDir: fx.projectsDir });
        const twin = await runOf(fx.s04, bare.runId);
        for (const key of ["state", "outcome", "attempt", "retryOf", "failureReason", "updatedAt"]) {
          assert.deepEqual(record[key], twin[key], `${key} is what it would be with no transcript at all`);
        }
      } finally {
        await fx.done();
      }
    },
  },
  {
    name: "examples/134-03 01 a settle with no answer to stamp writes none, and says so only when it could not read (outline: 7 cases)",
    run: async () => {
      const rows = [
        ["whose sessionId is null", { sessionId: null }, true],
        ["whose sessionId names no transcript in the directory", {}, true],
        ["whose session's .jsonl is empty", { text: "" }, true],
        ["whose session's transcript holds one answered, untokened question", { text: jsonl(answered("Which seam?", "the store")) }, false],
        ["whose session's transcript holds one refused call asking 134/02 Q1", { text: jsonl([ask("toolu_01", ["134/02 Q1 · who?"]), answer("toolu_01", {}, REFUSAL)]) }, false],
        ["whose session's transcript is only lines that are not JSON", { text: "{not json\n}{\n" }, false],
        ["whose session's transcript holds no human-input call at all", { text: jsonl([usage()]) }, false],
      ];
      for (const [label, { sessionId = SESSION, text }, reported] of rows) {
        const fx = await project();
        try {
          if (text !== undefined) await writeTranscript(fx.projectsDir, SESSION, text);
          const run = await startRun(fx.s02, { sessionId, now: ASKED_AT });
          const events = await capturingDegrades(() => completeRun(fx.s02, { runId: run.runId, outcome: "done", now: ANSWERED_AT, projectsDir: fx.projectsDir }));
          const record = await runOf(fx.s02, run.runId);
          assert.equal(record.state, "done", `${label}: the run settles done`);
          assert.equal(Object.hasOwn(record.brief, "answers"), false, `${label}: brief holds no answers`);
          assert.equal(namesAnswers(events).length > 0, reported, `${label}: ${reported ? "a run-store degrade names the answers as unread" : "no degrade names the answers"} (${JSON.stringify(events)})`);
          if (!reported) assert.equal(events.some((event) => /answers/.test(event.message)), false, `${label}: no degrade names the answers`);
        } finally {
          await fx.done();
        }
      }
    },
  },
  {
    name: "examples/134-03 01 a story's answers are collected from where they live (outline: 17 sources)",
    run: async () => {
      const q1 = valid("134/02 Q1");
      const rows = [
        ["a done run of 134/02 stamped 134/02 Q1", async (fx) => { await settled(fx.s02, { answers: [q1] }); }, [q1]],
        ["a failed run of 134/02 stamped 134/02 Q1", async (fx) => { await settled(fx.s02, { outcome: "failed", answers: [q1] }); }, [q1]],
        ["a done run of milestone 134 stamped 134/02 Q1 and 134/04 Q1", async (fx) => {
          await settled(fx.milestone, { answers: [q1, valid("134/04 Q1", { toolUseId: "toolu_02" })] });
        }, [q1]],
        ["a done run of 134/04 stamped 134/02 Q1", async (fx) => { await settled(fx.s04, { answers: [q1] }); }, []],
        ["a done run of 134/02 stamped the milestone token 134 Q1", async (fx) => { await settled(fx.s02, { answers: [valid("134 Q1")] }); }, []],
        ["a running run of 134/02 whose transcript holds an answered 134/02 Q1", async (fx) => {
          await writeTranscript(fx.projectsDir, SESSION, jsonl(answered(Q1, "anyone")));
          await startRun(fx.s02, { sessionId: SESSION });
        }, [{ token: "134/02 Q1", question: Q1, answer: "anyone", toolUseId: "toolu_01", sessionId: SESSION, at: ANSWERED_AT, entrypoint: "cli" }]],
        ["a running run of milestone 134 whose transcript holds an answered 134/02 E2", async (fx) => {
          await writeTranscript(fx.projectsDir, SESSION, jsonl(answered("134/02 E2 · right?", "Yes")));
          await startRun(fx.milestone, { sessionId: SESSION });
        }, [{ token: "134/02 E2", question: "134/02 E2 · right?", answer: "Yes", toolUseId: "toolu_01", sessionId: SESSION, at: ANSWERED_AT, entrypoint: "cli" }]],
        ["a running run of 134/02 with 134/02 Q1 asked and not yet answered", async (fx) => {
          await writeTranscript(fx.projectsDir, SESSION, jsonl([ask("toolu_01", [Q1])]));
          await startRun(fx.s02, { sessionId: SESSION });
        }, []],
        ["a running run of 134/02 whose sessionId is null", async (fx) => { await startRun(fx.s02, { sessionId: null }); }, []],
        ["a running run of 134/02 whose session names no transcript", async (fx) => { await startRun(fx.s02, { sessionId: "sess-none" }); }, []],
        ["a failed run and its retry, both of 134/02, each stamped the same 134/02 Q1", async (fx) => {
          await settled(fx.s02, { outcome: "failed", answers: [q1] });
          const retry = await retryRun(fx.s02, { maxAttempts: 3 });
          await completeRun(fx.s02, { runId: retry.runId, outcome: "done" });
          await recordAnswers(fx.s02, { runId: retry.runId, answers: [q1] });
        }, [q1]],
        ["a done run stamped 134/02 Q1, and a running run whose session re-reads that toolUseId", async (fx) => {
          const stamped = (await Promise.resolve(readAnswers(jsonl(answered(Q1, "anyone")))));
          await settled(fx.s02, { answers: stamped });
          await writeTranscript(fx.projectsDir, "sess-2", jsonl(answered(Q1, "anyone")));
          await startRun(fx.s02, { sessionId: "sess-2" });
        }, [{ token: "134/02 Q1", question: Q1, answer: "anyone", toolUseId: "toolu_01", sessionId: SESSION, at: ANSWERED_AT, entrypoint: "cli" }]],
        ["a done run of 134/02 stamped 134/02 Q1 and 134/02 Q2 under one toolUseId", async (fx) => {
          await settled(fx.s02, { answers: [q1, valid("134/02 Q2")] });
        }, [q1, valid("134/02 Q2")]],
        ["a done run of 134/02 with no brief.answers", async (fx) => { await settled(fx.s02); }, []],
        ["no run of 134/02 or 134 at all", async () => {}, []],
        ["a run stamped 134/02 Q2 at 10:05, minted before a run stamped 134/02 Q1 at 10:00", async (fx) => {
          await settled(fx.s02, { now: "2026-09-24T09:00:00.000Z", sessionId: "sess-a", answers: [valid("134/02 Q2", { at: "2026-09-24T10:05:00.000Z", sessionId: "sess-a", toolUseId: "toolu_a" })] });
          await settled(fx.s02, { now: "2026-09-24T09:30:00.000Z", sessionId: "sess-b", answers: [valid("134/02 Q1", { at: "2026-09-24T10:00:00.000Z", sessionId: "sess-b", toolUseId: "toolu_b" })] });
        }, [valid("134/02 Q1", { at: "2026-09-24T10:00:00.000Z", sessionId: "sess-b", toolUseId: "toolu_b" }), valid("134/02 Q2", { at: "2026-09-24T10:05:00.000Z", sessionId: "sess-a", toolUseId: "toolu_a" })]],
        ["a done run stamped 134/02 Q1, whose session's transcript has since been deleted", async (fx) => {
          await writeTranscript(fx.projectsDir, SESSION, jsonl(answered(Q1, "anyone")));
          const run = await startRun(fx.s02, { sessionId: SESSION });
          await completeRun(fx.s02, { runId: run.runId, outcome: "done", projectsDir: fx.projectsDir });
          await rm(path.join(fx.projectsDir, `${SESSION}.jsonl`));
        }, [{ token: "134/02 Q1", question: Q1, answer: "anyone", toolUseId: "toolu_01", sessionId: SESSION, at: ANSWERED_AT, entrypoint: "cli" }]],
      ];
      for (const [label, arrange, expected] of rows) {
        const fx = await project();
        try {
          await arrange(fx);
          let collected;
          await assert.doesNotReject(async () => { collected = await collectAnswers(fx.s02, { projectsDir: fx.projectsDir }); }, `${label}: does not throw`);
          assert.deepEqual(collected, expected, `${label}`);
        } finally {
          await fx.done();
        }
      }
    },
  },
  {
    name: "examples/134-03 01 a settled run and a running run over the same session answer the same records",
    run: async () => {
      const fx = await project();
      try {
        await writeTranscript(fx.projectsDir, SESSION, jsonl([
          ...answered(Q1, "anyone"),
          ...answered("134/02 E2 · active loan → not offered. Is that right?", "Yes", "toolu_02"),
        ]));
        const run = await startRun(fx.s02, { sessionId: SESSION, now: ASKED_AT });
        const live = await collectAnswers(fx.s02, { projectsDir: fx.projectsDir });
        assert.equal(live.length, 2, "the running run's two answers, read live");
        await completeRun(fx.s02, { runId: run.runId, outcome: "done", now: ANSWERED_AT, projectsDir: fx.projectsDir });
        assert.equal(Array.isArray((await runOf(fx.s02, run.runId)).brief.answers), true, "the settle stamped them");
        assert.deepEqual(await collectAnswers(fx.s02, { projectsDir: fx.projectsDir }), live, "the same records, in the same order");
      } finally {
        await fx.done();
      }
    },
  },

  // ══ 02_settle-reads-the-transcript-store-that-exists.feature ══
  {
    name: "examples/134-03 02 the transcript directory is the caller's, or it is resolved — never the repository root (outline: 9 callers)",
    run: async () => {
      const journalOptions = { env: process.env };
      const rows = [
        ["the fixture workspace and no transcript directory, CLAUDE_CONFIG_DIR the fixture config directory",
          (fx) => ({ opts: { workspace: { projectRoot: fx.repo }, env: { CLAUDE_CONFIG_DIR: fx.config } }, dir: path.join(fx.config, "projects", projectSlug(fx.repo)) })],
        ["the fixture workspace and the explicit transcript directory D",
          (fx) => ({ opts: { workspace: { projectRoot: fx.repo }, projectsDir: fx.d, env: { CLAUDE_CONFIG_DIR: fx.config } }, dir: fx.d })],
        ["no workspace and the explicit transcript directory D",
          (fx) => ({ opts: { projectsDir: fx.d }, dir: fx.d })],
        ["no workspace and no transcript directory, as the mesh callers pass",
          () => ({ opts: {}, dir: null })],
        ["the fixture workspace and no transcript directory, CLAUDE_CONFIG_DIR unset and the injected home H",
          (fx) => ({ opts: { workspace: { projectRoot: fx.repo }, env: {}, home: fx.home }, dir: path.join(fx.home, ".claude", "projects", projectSlug(fx.repo)) })],
        ["the fixture workspace and no transcript directory, CLAUDE_CONFIG_DIR the empty string and home H",
          (fx) => ({ opts: { workspace: { projectRoot: fx.repo }, env: { CLAUDE_CONFIG_DIR: "" }, home: fx.home }, dir: path.join(fx.home, ".claude", "projects", projectSlug(fx.repo)) })],
        ["the fixture workspace and the empty-string transcript directory",
          (fx) => ({ opts: { workspace: { projectRoot: fx.repo }, projectsDir: "", env: { CLAUDE_CONFIG_DIR: fx.config } }, dir: path.join(fx.config, "projects", projectSlug(fx.repo)) })],
        ["the fixture workspace, with the process working directory a subdirectory of the fixture project",
          (fx) => ({ opts: { workspace: { projectRoot: fx.repo }, env: { CLAUDE_CONFIG_DIR: fx.config } }, dir: path.join(fx.config, "projects", projectSlug(fx.repo)), cwd: path.join(fx.repo, "wiki") })],
        ["a workspace whose root is a dispatch worktree of the fixture project",
          (fx) => ({ opts: { workspace: { projectRoot: fx.worktree }, env: { CLAUDE_CONFIG_DIR: fx.config } }, dir: path.join(fx.config, "projects", projectSlug(fx.worktree)) })],
      ];
      for (const [label, arrange] of rows) {
        const fx = await project();
        fx.config = path.join(fx.root, "claude-config");
        fx.home = path.join(fx.root, "home");
        fx.d = path.join(fx.root, "explicit-d");
        fx.worktree = path.join(fx.repo, ".aof", "mesh", "dispatch-worktrees", "dispatch-134-02");
        await mkdir(fx.worktree, { recursive: true });
        const priorCwd = process.cwd();
        try {
          const { opts, dir, cwd } = arrange(fx);
          const text = jsonl([usage(), ...answered(Q1, "anyone")]);
          // The transcript is written only where the caller's directory is meant to be, and at the
          // repository root, which must never be read.
          if (dir) await writeTranscript(dir, SESSION, text);
          await writeTranscript(fx.repo, SESSION, text);
          const run = await startRun(fx.s02, { sessionId: SESSION, now: ASKED_AT });
          if (cwd) process.chdir(cwd);
          const events = await capturingDegrades(() => transitionRunComplete(fx.s02, { runId: run.runId, outcome: "done", now: ANSWERED_AT }, { ...opts, journalOptions, drain: false }));
          process.chdir(priorCwd);
          const record = await runOf(fx.s02, run.runId);
          if (dir) {
            assert.equal(record.brief.answers?.[0]?.token, "134/02 Q1", `${label}: completeRun read ${dir}`);
            assert.ok(record.spend != null, `${label}: spend stamped from the same directory`);
          } else {
            assert.equal(Object.hasOwn(record.brief, "answers"), false, `${label}: no transcript is read`);
            assert.equal(record.spend, null, `${label}: no spend is read`);
            assert.deepEqual(events.filter((event) => event.code === "run-store"), [], `${label}: no degrade is reported`);
          }
        } finally {
          process.chdir(priorCwd);
          await fx.done();
        }
      }
    },
  },
  {
    name: "examples/134-03 02 a spend the caller settled or withheld is not settled again",
    run: async () => {
      const fx = await project();
      try {
        await writeTranscript(fx.projectsDir, SESSION, jsonl([usage(), ...answered(Q1, "anyone")]));
        const run = await startRun(fx.s02, { sessionId: SESSION, now: ASKED_AT });
        await transitionRunComplete(
          fx.s02,
          { runId: run.runId, outcome: "done", now: ANSWERED_AT },
          { workspace: { projectRoot: fx.repo }, projectsDir: fx.projectsDir, spendSettled: true, journalOptions: { env: process.env }, drain: false },
        );
        const record = await runOf(fx.s02, run.runId);
        assert.equal(record.spend, null, "the spend is still null");
        assert.equal(record.brief.answers?.[0]?.token, "134/02 Q1", "brief.answers holds the 134/02 Q1 record");
      } finally {
        await fx.done();
      }
    },
  },

  // ══ 136/01 00_an-answered-loop-question-is-a-persons-answer-to-its-token.feature ══
  {
    name: "examples/136-01 00 E1 an answered ask anchors its token, and the doctor reports nothing",
    run: () => withLoopStory(async (fx) => {
      const run = await askedRun(fx.s04, { state: "done" });
      const records = await collectAnswers(fx.s04, { projectsDir: fx.projectsDir });
      assert.deepEqual(records, [{
        token: "7/2 Q1", question: ASK_Q, answer: "No", toolUseId: null, sessionId: run.sessionId, at: LOOP_AT, entrypoint: null, by: YOU,
      }]);
      assert.deepEqual(unanchored(fx), []);
    }),
  },
  {
    name: "examples/136-01 00 E2 an ask parked at the bound and never answered anchors nothing",
    run: () => withLoopStory(async (fx) => {
      await askedRun(fx.s04, { parked: true, answer: null });
      const [run] = await readRuns(fx.s04);
      assert.ok(run.asks[0].parkedAt != null && run.asks[0].answer == null && run.asks[0].answeredAt == null, "the ask is parked, unanswered");
      const found = unanchored(fx);
      for (const id of ["E2", "Q1"]) {
        assert.ok(found.some((finding) => finding.message.startsWith(`7/2: ${id} (`) && finding.severity === "error"), `${id} is unanchored — ${JSON.stringify(found)}`);
      }
    }),
  },
  {
    name: "examples/136-01 00 E3 an answer written while the run is still running anchors",
    run: () => withLoopStory(async (fx) => {
      await askedRun(fx.s04, { state: "running" });
      assert.deepEqual(tokensOf(await collectAnswers(fx.s04, { projectsDir: fx.projectsDir })), ["7/2 Q1"]);
    }),
  },
  {
    name: "examples/136-01 00 the ask is read from every run of the story and of its parent milestone, in any state (outline: 5 rows)",
    run: async () => {
      for (const [which, state] of [["7/2", "running"], ["7/2", "done"], ["7/2", "failed"], ["7", "running"], ["7", "done"]]) {
        await withLoopStory(async (fx) => {
          await askedRun(which === "7" ? fx.milestone : fx.s04, { state });
          assert.deepEqual(tokensOf(await collectAnswers(fx.s04, { projectsDir: fx.projectsDir })), ["7/2 Q1"], `${which} ${state}`);
        });
      }
    },
  },
  {
    name: "examples/136-01 00 an ask tokened for a sibling story is not this story's answer",
    run: () => withLoopStory(async (fx) => {
      await askedRun(fx.milestone, { question: "7/3 Q1 · Does a reserved book count?" });
      assert.deepEqual(tokensOf(await collectAnswers(fx.s04, { projectsDir: fx.projectsDir })), []);
    }),
  },
  {
    name: "examples/136-01 00 the ask's answer is not stamped onto the run a second time",
    run: () => withLoopStory(async (fx) => {
      const run = await askedRun(fx.s04, { state: "running" });
      const settled = fx.cli("work", "run-complete", "7/2", "--outcome", "done");
      assert.equal(settled.status, 0, `run-complete exits 0 — ${settled.stderr}`);
      const record = (await readRuns(fx.s04)).find((entry) => entry.runId === run.runId);
      assert.equal(record.state, "done", "the run settled");
      assert.deepEqual((record.brief?.answers ?? []).filter((answer) => answer?.token === "7/2 Q1"), [], "brief.answers holds no 7/2 Q1 record");
      assert.deepEqual(tokensOf(await collectAnswers(fx.s04, { projectsDir: fx.projectsDir })), ["7/2 Q1"]);
    }),
  },
  {
    name: "examples/136-01 00 a loop answer and a harness answer both count, in the order they were given",
    run: () => withLoopStory(async (fx) => {
      const harness = valid("7/2 E4", { at: "2026-10-03T09:00:00.000Z" });
      await settled(fx.s04, { answers: [harness] });
      await askedRun(fx.s04, { state: "done" });
      assert.deepEqual(tokensOf(await collectAnswers(fx.s04, { projectsDir: fx.projectsDir })), ["7/2 E4", "7/2 Q1"]);
    }),
  },
  {
    name: "examples/136-01 00 two asks of the same question on two runs are two records",
    run: () => withLoopStory(async (fx) => {
      await askedRun(fx.s04, { state: "done", at: "2026-10-03T10:02:00.000Z" });
      await askedRun(fx.s04, { state: "done", at: "2026-10-03T11:02:00.000Z", now: "2026-10-03T11:00:00.000Z" });
      const records = await collectAnswers(fx.s04, { projectsDir: fx.projectsDir });
      assert.deepEqual(tokensOf(records), ["7/2 Q1", "7/2 Q1"]);
      assert.deepEqual(records.map((record) => record.at), ["2026-10-03T10:02:00.000Z", "2026-10-03T11:02:00.000Z"]);
    }),
  },
  {
    name: "examples/136-01 00 E6 a Discord reply from an allowlisted account anchors, and names the account",
    run: () => withLoopStory(async (fx) => {
      const by = { actor: "@ops-lead", via: "discord", node: "node-7297" };
      await askedRun(fx.s04, { by });
      const records = await collectAnswers(fx.s04, { projectsDir: fx.projectsDir });
      assert.deepEqual(tokensOf(records), ["7/2 Q1"]);
      assert.deepEqual(records[0].by, by);
    }),
  },
  {
    name: "examples/136-01 00 E7 an answer from the board's reply box anchors",
    run: () => withLoopStory(async (fx) => {
      const by = { actor: "you", via: "board", node: "node-7297" };
      await askedRun(fx.s04, { by });
      const records = await collectAnswers(fx.s04, { projectsDir: fx.projectsDir });
      assert.deepEqual(tokensOf(records), ["7/2 Q1"]);
      assert.deepEqual(records[0].by, by);
    }),
  },
  {
    name: "examples/136-01 00 no channel is filtered out (outline: 3 channels)",
    run: async () => {
      for (const via of ["cli", "board", "discord"]) {
        await withLoopStory(async (fx) => {
          await askedRun(fx.s04, { by: { actor: "you", via, node: "node-7297" } });
          assert.deepEqual(unanchored(fx), [], via);
        });
      }
    },
  },

  // ══ 136/01 01_an-ask-that-cannot-name-its-one-token-anchors-none.feature ══
  {
    name: "examples/136-01 01 E4 an ask carrying two tokens anchors neither",
    run: () => withLoopStory(async (fx) => {
      await askedRun(fx.s04, { question: "7/2 Q1 · Does a reserved book count?\n\n7/2 Q2 · May a member swap a book?", answer: "Yes" });
      assert.deepEqual(tokensOf(await collectAnswers(fx.s04, { projectsDir: fx.projectsDir })), []);
    }),
  },
  {
    name: "examples/136-01 01 E5 an ask with no token at its head anchors nothing, and the reader does not fail",
    run: () => withLoopStory(async (fx) => {
      await askedRun(fx.s04, { question: "Decision needed: does a reserved book count?", answer: "Yes" });
      let records;
      await assert.doesNotReject(async () => { records = await collectAnswers(fx.s04, { projectsDir: fx.projectsDir }); });
      assert.deepEqual(records, []);
    }),
  },
  {
    name: "examples/136-01 01 which question shapes anchor (outline: 7 shapes)",
    run: async () => {
      const rows = [
        ["7/2 Q1 · Discovery question …\n- Yes\n- No", ["7/2 Q1"]],
        ["7/2 E2 · Is a sixth loan refused while five are out?", ["7/2 E2"]],
        ["7/2 Q1", ["7/2 Q1"]],
        ["7/2 Q1 · Unlike 7/2 Q2, does a reserved book count?", ["7/2 Q1"]],
        ["7/2 Q1 · Does a reserved book count?\n7/2 E3 · …", []],
        [" 7/2 Q1 · a leading space", []],
        ["Q1 · no story ref", []],
      ];
      for (const [question, expected] of rows) {
        await withLoopStory(async (fx) => {
          await askedRun(fx.s04, { question, answer: "Yes" });
          assert.deepEqual(tokensOf(await collectAnswers(fx.s04, { projectsDir: fx.projectsDir })), expected, JSON.stringify(question));
        });
      }
    },
  },
  {
    name: "examples/136-01 01 an entry with no answer anchors nothing (outline: 3 fields)",
    run: async () => {
      const entry = { question: "7/2 Q1 · Does a reserved book count?", phase: "refine", askedAt: ASK_AT, parkedAt: null, answer: "Yes", answeredAt: LOOP_AT, by: YOU };
      for (const [label, over] of [["answer null", { answer: null }], ["answer empty", { answer: "" }], ["answeredAt null", { answeredAt: null }]]) {
        await withLoopStory(async (fx) => {
          const run = await askedRun(fx.s04, { answer: null });
          await plantAsks(fx.s04, run.runId, [{ ...entry, ...over }]);
          assert.deepEqual(await collectAnswers(fx.s04, { projectsDir: fx.projectsDir }), [], label);
        });
      }
    },
  },
  {
    name: "examples/136-01 01 a run whose asks cannot be read yields no ask records and does not stop the others (outline: 4 shapes)",
    run: async () => {
      const shapes = [
        ["not an array", { question: "7/2 Q1 · x", answer: "Yes", answeredAt: LOOP_AT }],
        ["an array holding a number", [42]],
        ["an array holding null", [null]],
        ["an entry whose question is a number", [{ question: 7, answer: "Yes", answeredAt: LOOP_AT, askedAt: ASK_AT, by: YOU }]],
      ];
      for (const [label, asks] of shapes) {
        await withLoopStory(async (fx) => {
          const broken = await askedRun(fx.s04, { answer: null, state: "done" });
          await plantAsks(fx.s04, broken.runId, asks);
          await askedRun(fx.s04, { state: "done", now: "2026-10-03T11:00:00.000Z" });
          let records;
          await assert.doesNotReject(async () => { records = await collectAnswers(fx.s04, { projectsDir: fx.projectsDir }); }, label);
          assert.deepEqual(tokensOf(records), ["7/2 Q1"], label);
        });
      }
    },
  },
];

// ── 136/01 fixtures — story 7/2 with the gate on, its map's R1 holding E2 [stated Q1], Q1 answered ──

const ASK_Q = "7/2 Q1 · Discovery question — rule R1 · A member may hold at most five loans; settles E2.\n- Yes\n- No";
const ASK_AT = "2026-10-03T10:00:00.000Z";
const LOOP_AT = "2026-10-03T10:02:00.000Z";
const YOU = Object.freeze({ actor: "you", via: "cli", node: "node-7297" });
const LOOP_MAP = mapOf(R(1, E(1), E(2, "[stated Q1]")), QUESTIONS(Q(1, "business", "answered")));
const tokensOf = (records) => records.map((record) => record.token);

function withLoopStory(body) {
  return withExamplesProject({ examples: { enabled: true }, milestone: "7", story: "2" }, async (fx) => {
    assert.equal(fx.s04.ref, "7/2");
    await fx.writeMap(fx.s04, LOOP_MAP);
    return body(fx);
  });
}

// "the ask": an `asks` entry written by 131's own writers, on a run of `item` left in `state`.
async function askedRun(item, { state = "running", question = ASK_Q, answer = "No", by = YOU, at = LOOP_AT, parked = false, now = ASK_AT, sessionId = `sess-loop-${now}` } = {}) {
  const run = await startRun(item, { sessionId, now });
  await openRunAsk(item, run.runId, { question, phase: "refine", now });
  if (parked) await parkRunAsk(item, run.runId, { now });
  if (answer != null) await answerRunAsk(item, run.runId, { answer, by, now: at });
  if (state !== "running") {
    await completeRun(item, { runId: run.runId, outcome: state, failureReason: state === "failed" ? "runtime_offline" : null, now: at });
  }
  return run;
}

// Replace a run record's `asks` with what no writer of 131's would write.
async function plantAsks(item, runId, asks) {
  const record = (await readRuns(item)).find((run) => run.runId === runId);
  const file = record.node ? runNodeRecordPath(item, record.node, runId) : runRecordPath(item, runId);
  const raw = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, JSON.stringify({ ...raw, asks }, null, 2), "utf8");
}

// The doctor's `example-provenance-unanchored` findings for 7/2, through the real CLI.
function unanchored(fx) {
  const { json } = fx.cli("work", "doctor", "7/2", "--json");
  assert.ok(json, "the doctor answers JSON");
  return (json.findings ?? []).filter((finding) => finding.code === "example-provenance-unanchored" && finding.message.startsWith("7/2:"));
}
