// Traceability wiring for milestone 201 / story 00 (recall hands over a picked block), all four
// task features (@executable):
//
//   00_the-block-is-picked-from-a-shortlist.feature   R1
//   01_the-pick-fails-soft-and-says-so.feature        R2
//   02_promoted-lessons-leave-the-shortlist.feature   R3
//   03_only-the-block-is-picked.feature               R4
//
// Drives the REAL pipeline through BOTH doors: the routed command (`createMemoryCommand`, the door
// `aof memory` is) and the in-process entry (`runMemory`), each over the real ranker
// (`recall` from local-retrieval) on a hand-authored fixture index, with a STUB picker injected
// where core injects the model (201/ADR-002 §3). No CLI process and no on-disk index: the routed
// door's stdout is what its own `cli.render` / `cli.json` return, and its stderr is the `announce`
// sink, which is the two documents the face prints. The real CLI is driven in
// test/command/work-memory-command.test.mjs.
//
// RANK IS THE RANKER'S. "The record ranked 7th" is `ranked[6]` of an unbounded recall over the
// same fixture, never a position this file computed. The fixture separates its records by length
// under one term frequency, and the first case holds that the ranking is strict, so a near-tie
// cannot reorder a pair when the pool changes (148/03 R1).
import assert from "node:assert/strict";
import { recall } from "@aof/knowledge/memory/local-retrieval";
import { RECORD_CORPORA } from "@aof/knowledge/engine";
import { createMemory } from "@aof/knowledge/memory";
import { createMemoryCommand } from "@aof/knowledge/commands/memory";
import {
  PICK_CARD_TEXT_LIMIT, PICK_INSTRUCTION, PICK_MISS, PICK_SHORTLIST_SIZE,
  buildPickRequest, isPromotedLesson, pickAnnouncement, readPickAnswer, renderPickRequest, settlePick, shortlistRecords,
} from "@aof/knowledge/memory/recall-pick";

const QUERY = "worktree junction";
const PROMOTED = "control:171/FF-17104";
// A lesson's own words, so the recurrence matcher has something distinctive to match (E15).
const TOP_TEXT = "worktree junction: never delete a linked worktree through its junction, unlink the junction first and remove the tree after";

// ------------------------------------------------------------- fixture ----

// `count` records that all match the query, strictly ranked in the order built: each says the
// query once and is longer than the one before, and the first also carries it in its title.
// `top` overrides the best-ranked record's fields; `each(rank)` overrides any record's.
function matching(count, { top = {}, each = () => ({}) } = {}) {
  return Array.from({ length: count }, (_, index) => {
    const rank = index + 1;
    const base = {
      recordType: "lesson", id: `R${rank}`, item: "50", itemSlug: "fixture",
      title: rank === 1 ? "Worktree junction teardown" : `Lesson number ${rank}`,
      area: "tooling", stage: "build", kind: "near-miss", owner: "developer", status: "", summary: "",
      text: rank === 1 ? TOP_TEXT : `${QUERY} ${"ballast ".repeat(6 * rank)}`.trim(),
      source: `50_milestone_fixture/RETROSPECTIVE.md:${rank * 10}`,
    };
    return { ...base, ...each(rank), ...(rank === 1 ? top : {}) };
  });
}

const refuse = (what) => () => { throw new Error(`the recall-pick rig must not load ${what}`); };
const memory = createMemory({ loadLocalBackend: refuse("the local backend"), loadGraphifyBackend: refuse("the graphify backend") });

// A record backend over the real ranker and a fixture array.
function fixtureBackend(records) {
  return {
    name: "local",
    corpora: RECORD_CORPORA,
    recall: (query, scope, opts) => recall(query, scope, opts, { records }),
    reindex: async () => ({ recordCount: records.length }),
    status: async () => ({ backend: "local", recordCount: records.length }),
  };
}

// The ranker's own order over a fixture, unbounded and unscoped.
async function rankOf(records, scope = {}) {
  return (await recall(QUERY, scope, { limit: Infinity }, { records })).records;
}

// A picker stub: records what it is handed, answers as the scenario says.
const answers = (text) => () => ({ answer: text });
const misses = (code) => () => ({ code });
const throws = () => () => { throw new Error("the picker fell over"); };
function pickerStub(behaviour = answers("[]")) {
  const calls = [];
  return { calls, pick: async (request, context) => { calls.push({ request, context }); return behaviour(request); } };
}

// Split an argv the way the face does, against the command's own flag spec. `--json` is the face's.
function parseArgv(argv, flags) {
  const positionals = [];
  const options = {};
  for (let at = 0; at < argv.length; at += 1) {
    const arg = argv[at];
    if (!arg.startsWith("--")) { positionals.push(arg); continue; }
    const key = arg.slice(2);
    if (key === "json") { options.json = true; continue; }
    assert.ok(flags[key], `${arg} is a flag the command declares`);
    options[key] = flags[key].type === "boolean" ? true : argv[at += 1];
  }
  return { positionals, options };
}

// Both doors over one fixture and one picker. `cli(argv)` is `aof memory <argv>`; `inProcess(argv)`
// is `runMemory`. Each answers { stdout, stderr, exitCode, result }.
function rig(records, picker = null) {
  const backend = fixtureBackend(records);
  const pickRecords = picker?.pick ?? null;
  const stderr = [];
  const { memoryCommand } = createMemoryCommand({
    ...memory, recordRecall: null, renderWithPropagationWarnings: (head) => head,
    resolveConfiguredBackend: async () => backend, pickRecords, announce: (line) => stderr.push(line),
  });
  async function cli(argv) {
    stderr.length = 0;
    const { positionals, options } = parseArgv(argv, memoryCommand.cli.spec.flags);
    const outcome = await memoryCommand.run(memoryCommand.cli.argv(positionals, options), { workspace: { config: {} } });
    const rendered = options.json ? JSON.stringify(memoryCommand.cli.json(outcome), null, 2) : memoryCommand.cli.render(outcome);
    return { stdout: rendered === null ? "" : `${rendered}\n`, stderr: stderr.map((line) => `${line}\n`).join(""), exitCode: 0, result: outcome.result };
  }
  async function inProcess(argv) {
    const lines = [];
    const outcome = await memory.runMemory(argv, { config: {}, resolveBackend: async () => backend, pickRecords, log: (line) => lines.push(line) });
    return { stdout: lines.map((line) => `${line}\n`).join(""), exitCode: outcome.exitCode, result: outcome.result };
  }
  return { cli, inProcess };
}

const blockLines = (stdout) => (stdout === "" ? [] : stdout.replace(/\n+$/, "").split("\n"));
// What the face prints for a block of these records: the render, then the newline `console.log` adds.
const blockOf = (records) => (records.length === 0 ? "" : `${memory.renderRecallBlock({ records }, { limit: Infinity })}\n`);
const ids = (records) => records.map((record) => record.id);
const at = (ranked, ...ranks) => ranks.map((rank) => ranked[rank - 1]);
const missLine = (code, count) => `[memory] pick unavailable (${code}) — this block is the lexical top ${count}; records intact.\n`;

// The card numbers a picker was handed, and the records they stand for.
function cardsOf(picker) {
  assert.equal(picker.calls.length, 1, "the picker was asked exactly once");
  return picker.calls[0].request.cards;
}

export const memoryRecallPickTests = [
  {
    name: "201/00 fixture: 60 records match the query and the ranker orders them strictly, in the order they were built",
    run: async () => {
      const ranked = await rankOf(matching(60));
      assert.deepEqual(ids(ranked), Array.from({ length: 60 }, (_, index) => `R${index + 1}`), "rank order is build order");
      for (let index = 1; index < ranked.length; index += 1) {
        assert.ok(ranked[index - 1].score > ranked[index].score, `rank ${index} scores strictly above rank ${index + 1}: no tie decides an order`);
      }
    },
  },

  // ===================================================================
  // 00_the-block-is-picked-from-a-shortlist.feature — R1
  // ===================================================================
  {
    name: "201/00 task 00 E1 · the picker is handed the 20 best-ranked records, and the block is what it picked",
    run: async () => {
      const records = matching(60);
      const ranked = await rankOf(records);
      const picker = pickerStub(answers("[7, 2, 15]"));
      const { stdout, stderr, exitCode } = await rig(records, picker).cli(["recall", QUERY, "--block"]);
      const cards = cardsOf(picker);
      assert.deepEqual(cards.map((card) => card.number), Array.from({ length: 20 }, (_, index) => index + 1), "20 cards, numbered 1 to 20");
      assert.deepEqual(cards.map((card) => card.line), blockLines(blockOf(ranked.slice(0, 20))), "…in rank order: card n is the record ranked nth");
      const picked = at(ranked, 7, 2, 15);
      assert.equal(stdout, blockOf(picked), "the block is 3 lines: the records ranked 7th, 2nd and 15th, in that order");
      const lines = blockLines(stdout);
      assert.equal(lines.length, 3);
      lines.forEach((line, index) => assert.ok(line.endsWith(` · ${picked[index].source}`), `line ${index + 1} ends with its record's path:line`));
      assert.match(picked[0].source, /^[^:]+:\d+$/, "a source is path:line");
      assert.deepEqual([stderr, exitCode], ["", 0]);
    },
  },
  {
    name: "201/00 task 00 a card carries what the picker needs to judge a record: its block line, its text cut at 1,500 characters, and the query",
    run: async () => {
      const long = `${QUERY} ${"x".repeat(4000)}`.slice(0, 4000);
      const records = matching(60, { each: (rank) => (rank === 3 ? { text: long } : {}) });
      const ranked = await rankOf(records);
      const picker = pickerStub();
      await rig(records, picker).cli(["recall", QUERY, "--block"]);
      const { request } = picker.calls[0];
      assert.equal(request.query, QUERY, "the picker is handed the query");
      assert.equal(request.cap, 5, "…and the cap it may pick up to");
      request.cards.forEach((card, index) => {
        const record = ranked[index];
        assert.equal(card.line, blockLines(blockOf([record]))[0], `card ${card.number} carries its record's block line`);
        assert.equal(card.text, record.text.slice(0, 1500), `card ${card.number} carries its record's text`);
      });
      const longCard = request.cards.find((card) => card.line.includes(" · Lesson number 3 · "));
      assert.ok(longCard, "the long record is shortlisted");
      assert.equal(long.length, 4000);
      assert.equal(longCard.text.length, 1500, "a 4,000-character text is handed over as its first 1,500");
      assert.equal(longCard.text, long.slice(0, 1500));
      assert.equal(PICK_CARD_TEXT_LIMIT, 1500);
    },
  },
  {
    name: "201/00 task 00 E3 · scope is applied before the shortlist: with --kind finding the picker is handed 12 cards, every one a finding",
    run: async () => {
      const records = matching(60, { each: (rank) => (rank % 5 === 0 ? { kind: "finding" } : {}) });
      assert.equal(records.filter((record) => record.kind === "finding").length, 12, "12 of the 60 matching records are findings");
      const picker = pickerStub();
      await rig(records, picker).cli(["recall", QUERY, "--kind", "finding", "--block"]);
      const cards = cardsOf(picker);
      assert.equal(cards.length, 12, "the picker was handed 12 cards");
      for (const card of cards) assert.match(card.line, / · finding · /, `card ${card.number} is a finding`);
    },
  },
  {
    name: "201/00 task 00 E5 · a pick of nothing prints nothing: stdout and stderr are empty and the exit code is 0",
    run: async () => {
      const picker = pickerStub(answers("[]"));
      const { stdout, stderr, exitCode, result } = await rig(matching(60), picker).cli(["recall", QUERY, "--block"]);
      assert.equal(cardsOf(picker).length, 20, "the picker was asked, over a 20-card shortlist");
      assert.deepEqual([stdout, stderr, exitCode], ["", "", 0]);
      assert.deepEqual(result.pick, { mode: "model", code: null, shortlisted: 20, model: null }, "an empty pick is the model's answer, not a miss");
    },
  },
  {
    // The feature's When names a bare query miss. Under the local ranker a bare miss still ranks
    // every survivor (178/01 E3 pins that), so its shortlist is not empty. The shortlist is empty
    // when no record is in scope, which is what the rule and EXAMPLES E6 say, and what runs here.
    name: "201/00 task 00 E6 · an empty shortlist asks no picker: a recall with no record in scope prints nothing",
    run: async () => {
      const picker = pickerStub(answers("[1]"));
      const { stdout, stderr, exitCode, result } = await rig(matching(60), picker).cli(["recall", "no record says this", "--kind", "no-such-kind", "--block"]);
      assert.deepEqual([stdout, stderr, exitCode], ["", "", 0]);
      assert.equal(picker.calls.length, 0, "the picker was not asked");
      assert.deepEqual(result.pick, { mode: "lexical", code: null, shortlisted: 0, model: null });
      // An index that holds nothing is the same answer.
      const empty = pickerStub(answers("[1]"));
      assert.equal((await rig([], empty).cli(["recall", QUERY, "--block"])).stdout, "");
      assert.equal(empty.calls.length, 0);
      // The bare miss itself: every record still ranks, so the picker IS asked, and may pick nothing.
      const bare = pickerStub(answers("[]"));
      const missed = await rig(matching(60), bare).cli(["recall", "no record says this", "--block"]);
      assert.equal(cardsOf(bare).length, 20, "a bare query miss still shortlists 20 records");
      assert.deepEqual([missed.stdout, missed.stderr], ["", ""], "…and a picker that finds nothing in them prints nothing");
    },
  },
  {
    name: "201/00 task 00 outline: the shortlist and the cap, at their edges — E2 3 matching | E4 eight numbers | 20 | 21 | a repeat and a stranger | prose around the array | zero and a negative",
    run: async () => {
      const rows = [
        { example: "E2", matching: 3, answer: "[1, 3]", cards: 3, block: [1, 3] },
        { example: "E4", matching: 60, answer: "[9, 8, 7, 6, 5, 4, 3, 2]", cards: 20, block: [9, 8, 7, 6, 5] },
        { example: "20 matching", matching: 20, answer: "[20]", cards: 20, block: [20] },
        { example: "21 matching", matching: 21, answer: "[20]", cards: 20, block: [20] },
        { example: "a repeat and a stranger", matching: 60, answer: "[4, 4, 99, 2]", cards: 20, block: [4, 2] },
        { example: "prose around the array", matching: 60, answer: "Here: [2, 5]. Done.", cards: 20, block: [2, 5] },
        { example: "zero and a negative", matching: 60, answer: "[0, -1, 3]", cards: 20, block: [3] },
      ];
      for (const row of rows) {
        const records = matching(row.matching);
        const ranked = await rankOf(records);
        const picker = pickerStub(answers(row.answer));
        const { stdout, stderr, exitCode } = await rig(records, picker).cli(["recall", QUERY, "--block"]);
        assert.equal(cardsOf(picker).length, row.cards, `[${row.example}] the picker was handed ${row.cards} cards`);
        assert.equal(stdout, blockOf(at(ranked, ...row.block)), `[${row.example}] the block is the records ranked ${row.block.join(", ")}`);
        assert.deepEqual([stderr, exitCode], ["", 0], `[${row.example}] a readable answer announces nothing`);
      }
    },
  },
  {
    name: "201/00 task 00 the result says how the block was made: the four frozen keys, and a pick report of mode model, no code and 20 shortlisted",
    run: async () => {
      const records = matching(60);
      const ranked = await rankOf(records);
      const { result } = await rig(records, pickerStub(() => ({ answer: "[7, 2]", model: "stub-model" }))).inProcess(["recall", QUERY, "--block"]);
      assert.deepEqual(Object.keys(result), ["query", "scope", "records", "text"], "the result's keys are exactly query, scope, records and text");
      assert.deepEqual(ids(result.records), ids(at(ranked, 7, 2)));
      assert.deepEqual(result.pick, { mode: "model", code: null, shortlisted: 20, model: "stub-model" });
      assert.equal(Object.getOwnPropertyDescriptor(result, "pick").enumerable, false, "the report is non-enumerable, as graphSignal is");
      assert.equal(JSON.stringify(result).includes("shortlisted"), false, "…so it never reaches a serialised result");
      for (const record of result.records) assert.ok(result.text.includes(`[${record.id} · m${record.item}]`), "text is rendered from the picked records");
      assert.equal(result.text.includes("[R1 · m50]"), false, "…and from no other");
    },
  },

  // ===================================================================
  // 01_the-pick-fails-soft-and-says-so.feature — R2
  // ===================================================================
  {
    name: "201/00 task 01 E7 · a picker that does not answer in time leaves the lexical top 5, with the pick-timeout line on stderr and exit 0",
    run: async () => {
      const records = matching(60);
      const ranked = await rankOf(records);
      const { stdout, stderr, exitCode } = await rig(records, pickerStub(misses("pick-timeout"))).cli(["recall", QUERY, "--block"]);
      assert.equal(stdout, blockOf(ranked.slice(0, 5)), "the block is the 5 best-ranked records, in rank order");
      assert.equal(stderr, "[memory] pick unavailable (pick-timeout) — this block is the lexical top 5; records intact.\n");
      assert.equal(exitCode, 0);
    },
  },
  {
    name: "201/00 task 01 E8 · an answer with no array in it is unreadable: the lexical top 5, and stderr names pick-unreadable",
    run: async () => {
      const records = matching(60);
      const ranked = await rankOf(records);
      const { stdout, stderr } = await rig(records, pickerStub(answers("I think the second one"))).cli(["recall", QUERY, "--block"]);
      assert.equal(stdout, blockOf(ranked.slice(0, 5)));
      assert.equal(stderr, missLine("pick-unreadable", 5));
    },
  },
  {
    name: "201/00 task 01 E9 · a caller that injects no picker gets the lexical top 5, unannounced: mode lexical, code pick-unwired",
    run: async () => {
      const records = matching(60);
      const ranked = await rankOf(records);
      const doors = rig(records, null);
      const { result } = await doors.inProcess(["recall", QUERY, "--block"]);
      assert.deepEqual(ids(result.records), ids(ranked.slice(0, 5)), "the result's records are the 5 best-ranked records");
      assert.deepEqual(result.pick, { mode: "lexical", code: "pick-unwired", shortlisted: 20, model: null });
      const routed = await doors.cli(["recall", QUERY, "--block"]);
      assert.equal(routed.stdout, blockOf(ranked.slice(0, 5)));
      assert.equal(routed.stderr, "", "nothing is announced");
      assert.equal(pickAnnouncement(result.pick, 5), null);
    },
  },
  {
    name: "201/00 task 01 outline: every miss leaves the same block, and only a failure is announced — pick-unavailable | pick-failed | a throw | [21, 40] | an empty answer | an object | pick-off",
    run: async () => {
      const rows = [
        { miss: "misses with pick-unavailable", behaviour: misses("pick-unavailable"), names: "pick-unavailable" },
        { miss: "misses with pick-failed", behaviour: misses("pick-failed"), names: "pick-failed" },
        { miss: "throws an error", behaviour: throws(), names: "pick-failed" },
        { miss: "answers [21, 40]", behaviour: answers("[21, 40]"), names: "pick-unreadable" },
        { miss: "answers an empty string", behaviour: answers(""), names: "pick-unreadable" },
        { miss: "answers an object", behaviour: answers("{ \"cards\": [1] }"), names: "pick-unreadable" },
        { miss: "misses with pick-off", behaviour: misses("pick-off"), names: null },
      ];
      const records = matching(60);
      const lexical = blockOf((await rankOf(records)).slice(0, 5));
      for (const row of rows) {
        const { stdout, stderr, exitCode, result } = await rig(records, pickerStub(row.behaviour)).cli(["recall", QUERY, "--block"]);
        assert.equal(stdout, lexical, `[${row.miss}] the block is the 5 best-ranked records, in rank order`);
        assert.equal(stderr, row.names === null ? "" : missLine(row.names, 5), `[${row.miss}] stderr ${row.names === null ? "is empty" : `names ${row.names}`}`);
        assert.equal(exitCode, 0, `[${row.miss}] the exit code is 0`);
        assert.equal(result.pick.mode, "lexical", `[${row.miss}] the report says the block is lexical`);
      }
      // A picker that resolves to nothing it was asked for, or to a code no one defined, failed.
      for (const behaviour of [() => undefined, () => "[1]", () => ({}), misses("pick-on-holiday")]) {
        const { stdout, stderr } = await rig(records, pickerStub(behaviour)).cli(["recall", QUERY, "--block"]);
        assert.deepEqual([stdout, stderr], [lexical, missLine("pick-failed", 5)]);
      }
    },
  },
  {
    name: "201/00 task 01 a miss on a short shortlist names how many records the block holds: 3 records, and the line says the lexical top 3",
    run: async () => {
      const records = matching(3);
      const ranked = await rankOf(records);
      const { stdout, stderr } = await rig(records, pickerStub(misses("pick-timeout"))).cli(["recall", QUERY, "--block"]);
      assert.equal(stdout, blockOf(ranked), "the block is those 3 records, in rank order");
      assert.equal(stderr, "[memory] pick unavailable (pick-timeout) — this block is the lexical top 3; records intact.\n");
    },
  },
  {
    name: "201/00 task 01 the door's own sink is stderr: built with no announce of its own, the routed command writes the miss line through console.error, once, and nothing through console.log",
    run: async () => {
      const backend = fixtureBackend(matching(60));
      const { memoryCommand } = createMemoryCommand({
        ...memory, recordRecall: null, renderWithPropagationWarnings: (head) => head,
        resolveConfiguredBackend: async () => backend, pickRecords: async () => ({ code: "pick-timeout" }),
      });
      const written = { error: [], log: [] };
      const original = { error: console.error, log: console.log };
      console.error = (...args) => written.error.push(args.join(" "));
      console.log = (...args) => written.log.push(args.join(" "));
      try {
        await memoryCommand.run(memoryCommand.cli.argv(["recall", QUERY], { block: true }), { workspace: { config: {} } });
      } finally {
        console.error = original.error;
        console.log = original.log;
      }
      assert.deepEqual(written.error, [missLine("pick-timeout", 5).trimEnd()], "one line, on stderr");
      assert.deepEqual(written.log, [], "the command prints nothing itself: the block is the face's to print");
    },
  },
  {
    name: "201/00 task 01 the announcement never reaches stdout: every line of stdout is a record line, under --block and under --block --json",
    run: async () => {
      const records = matching(60);
      const ranked = await rankOf(records);
      const doors = rig(records, pickerStub(misses("pick-failed")));
      const block = await doors.cli(["recall", QUERY, "--block"]);
      assert.deepEqual(blockLines(block.stdout), blockLines(blockOf(ranked.slice(0, 5))), "every line of stdout is a record line");
      assert.equal(block.stdout.includes("[memory]"), false);
      const json = await doors.cli(["recall", QUERY, "--block", "--json"]);
      assert.deepEqual(ids(JSON.parse(json.stdout)), ids(ranked.slice(0, 5)), "the JSON document is the records array alone");
      assert.equal(json.stderr, missLine("pick-failed", 5), "…and the miss is still said, on stderr");
      // The in-process door reports the miss on the result and prints nothing of its own.
      const quiet = await doors.inProcess(["recall", QUERY, "--block"]);
      assert.equal(quiet.stdout, block.stdout);
      assert.equal(quiet.result.pick.code, "pick-failed");
    },
  },

  // ===================================================================
  // 02_promoted-lessons-leave-the-shortlist.feature — R3
  // ===================================================================
  {
    name: "201/00 task 02 E10 · a promoted lesson is not a card, and the next record takes its place: 20 cards, and the record ranked 21st is card 20",
    run: async () => {
      const records = matching(60, { top: { status: PROMOTED } });
      const ranked = await rankOf(records);
      assert.equal(ranked[0].status, PROMOTED, "the best-ranked record is the promoted lesson");
      const picker = pickerStub();
      await rig(records, picker).cli(["recall", QUERY, "--block"]);
      const cards = cardsOf(picker);
      const lineOf = (record) => blockLines(blockOf([record]))[0];
      assert.equal(cards.length, 20, "the picker was handed 20 cards");
      assert.equal(cards.some((card) => card.line === lineOf(ranked[0])), false, "no card is that lesson");
      assert.equal(cards[19].line, lineOf(ranked[20]), "the record ranked 21st is card 20");
      assert.equal(cards[0].line, lineOf(ranked[1]), "…and the record ranked 2nd is card 1");
    },
  },
  {
    name: "201/00 task 02 E11 · a lesson with no promotion yet is still a card: promotion none and a legacy lesson with no field are cards 1 and 2",
    run: async () => {
      const records = matching(60, { top: { status: "none" } });
      const legacy = records[1];
      delete legacy.status; // a legacy lesson carries no promotion field at all
      const ranked = await rankOf(records);
      assert.deepEqual([ranked[0].status, "status" in ranked[1]], ["none", false]);
      const picker = pickerStub();
      await rig(records, picker).cli(["recall", QUERY, "--block"]);
      const lineOf = (record) => blockLines(blockOf([record]))[0];
      assert.deepEqual(cardsOf(picker).slice(0, 2).map((card) => card.line), [lineOf(ranked[0]), lineOf(ranked[1])], "cards 1 and 2 are those two lessons");
    },
  },
  {
    name: "201/00 task 02 E12 · a caller that asks by promotion is shown the promoted lesson: with --status control it is card 1",
    run: async () => {
      const records = matching(60, { top: { status: PROMOTED } });
      const picker = pickerStub();
      await rig(records, picker).cli(["recall", QUERY, "--status", "control", "--block"]);
      const cards = cardsOf(picker);
      assert.equal(cards[0].line, blockLines(blockOf([(await rankOf(records))[0]]))[0], "card 1 is that lesson");
      assert.equal(cards.length, 1, "…and the scope left only the records whose status names a control");
    },
  },
  {
    name: "201/00 task 02 outline: what drops a record from the shortlist, and what does not — a rule | a prompt | Control: | blank | prose | an accepted ADR | a discharged gap | an ADR that names a control",
    run: async () => {
      const rows = [
        { type: "lesson", status: "rule:.claude/rules/build-deploy-restart.md", card: false },
        { type: "lesson", status: "prompt:packages/core/assets/commands/verify.md", card: false },
        { type: "lesson", status: "Control:171/FF-17104", card: false },
        { type: "lesson", status: "", card: true },
        { type: "lesson", status: "planned: a control next milestone", card: true },
        { type: "adr", status: "Accepted", card: true },
        { type: "gap", status: "discharged", card: true },
        { type: "adr", status: "control:171/FF-17104", card: true },
      ];
      for (const row of rows) {
        const label = `${row.type} whose status is ${JSON.stringify(row.status)}`;
        const records = matching(60, { top: { recordType: row.type, status: row.status, ...(row.type === "lesson" ? {} : { kind: "" }) } });
        const ranked = await rankOf(records);
        assert.deepEqual([ranked[0].recordType, ranked[0].status], [row.type, row.status], `[${label}] it is the best-ranked record`);
        const picker = pickerStub();
        await rig(records, picker).cli(["recall", QUERY, "--block"]);
        const cards = cardsOf(picker);
        const line = blockLines(blockOf([ranked[0]]))[0];
        if (row.card) assert.equal(cards[0].line, line, `[${label}] that record is card 1`);
        else assert.equal(cards.some((card) => card.line === line), false, `[${label}] that record is not a card`);
        assert.equal(isPromotedLesson(ranked[0]), !row.card, `[${label}] the filter's own predicate agrees`);
      }
    },
  },
  {
    name: "201/00 task 02 the filter holds when the pick misses: with the best-ranked lesson promoted, a timed-out pick leaves the records ranked 2nd to 6th",
    run: async () => {
      const records = matching(60, { top: { status: PROMOTED } });
      const ranked = await rankOf(records);
      const { stdout, stderr } = await rig(records, pickerStub(misses("pick-timeout"))).cli(["recall", QUERY, "--block"]);
      assert.equal(stdout, blockOf(ranked.slice(1, 6)), "the block is the records ranked 2nd to 6th");
      assert.equal(stderr, missLine("pick-timeout", 5));
      // …and with no picker at all, which is the door every existing caller comes through.
      assert.equal((await rig(records, null).cli(["recall", QUERY, "--block"])).stdout, blockOf(ranked.slice(1, 6)));
    },
  },

  // ===================================================================
  // 03_only-the-block-is-picked.feature — R4
  // ===================================================================
  {
    name: "201/00 task 03 E13 · the JSON recall is the ranker's first five, as today: the promoted lesson first, and the picker was not asked",
    run: async () => {
      const records = matching(60, { top: { status: PROMOTED } });
      const ranked = await rankOf(records);
      const picker = pickerStub(answers("[2]"));
      const { stdout, stderr } = await rig(records, picker).cli(["recall", QUERY, "--json"]);
      const printed = JSON.parse(stdout);
      assert.ok(Array.isArray(printed), "it prints a JSON array");
      assert.deepEqual(ids(printed), ids(ranked.slice(0, 5)), "…of the 5 best-ranked records");
      assert.equal(printed[0].status, PROMOTED, "the promoted lesson first");
      assert.equal(picker.calls.length, 0, "the picker was not asked");
      assert.equal(stderr, "");
    },
  },
  {
    name: "201/00 task 03 E14 · a whole-history recall is never picked: --item 157 --area delivery --all --json prints all 34 records",
    run: async () => {
      const delivery = Array.from({ length: 34 }, (_, index) => ({
        recordType: "run", id: `RUN-${index + 1}`, item: "157", itemSlug: "episodic", title: `run ${index + 1}`, area: "delivery",
        stage: "build", kind: "", owner: "", status: "", summary: "", text: `delivery run ${index + 1}`, source: `157_milestone_episodic/runs/${index + 1}.json:1`,
      }));
      const picker = pickerStub(answers("[1]"));
      const { stdout } = await rig([...matching(60, { top: { status: PROMOTED } }), ...delivery], picker).cli(["recall", "", "--item", "157", "--area", "delivery", "--all", "--json"]);
      const printed = JSON.parse(stdout);
      assert.equal(printed.length, 34, "it prints all 34 records");
      assert.ok(printed.every((record) => record.item === "157" && record.area === "delivery"));
      assert.equal(picker.calls.length, 0, "the picker was not asked");
    },
  },
  {
    name: "201/00 task 03 E15 · recurrence still sees a promoted lesson: a new lesson that repeats it qualifies against it, and the picker was not asked",
    run: async () => {
      const records = matching(60, { top: { status: PROMOTED } });
      const picker = pickerStub(answers("[1]"));
      const { stdout } = await rig(records, picker).cli(["recurrence", TOP_TEXT, "--json"]);
      const decision = JSON.parse(stdout);
      assert.equal(decision.qualifying, "50/R1", "its qualifying reference is the promoted lesson");
      assert.equal(picker.calls.length, 0, "the picker was not asked");
    },
  },
  {
    name: "201/00 task 03 E16 · a limit on a block is the block's cap: --block --limit 3 hands the picker 20 cards and prints 3 lines",
    run: async () => {
      const records = matching(60, { top: { status: PROMOTED } });
      const ranked = (await rankOf(records)).slice(1);
      const picker = pickerStub(answers("[1, 2, 3, 4, 5]"));
      const { stdout } = await rig(records, picker).cli(["recall", QUERY, "--block", "--limit", "3"]);
      const cards = cardsOf(picker);
      assert.equal(cards.length, 20, "the picker was handed 20 cards");
      assert.equal(picker.calls[0].request.cap, 3, "…and told the cap is 3");
      assert.equal(stdout, blockOf(ranked.slice(0, 3)), "the block is 3 lines");
    },
  },
  {
    name: "201/00 task 03 outline: which recalls ask the picker — the text view | --limit 8 --json | --block --all | --block --limit 30 | --block --json | status",
    run: async () => {
      const records = matching(60, { top: { status: PROMOTED } });
      const ranked = await rankOf(records);
      const unpromoted = ranked.slice(1);
      const run = async (argv, behaviour = answers("[3, 1]")) => {
        const picker = pickerStub(behaviour);
        return { picker, ...(await rig(records, picker).cli(argv)) };
      };

      const text = await run(["recall", QUERY]);
      assert.equal(text.picker.calls.length, 0, "[recall] the picker was not asked");
      assert.equal(text.stdout, `${(await recall(QUERY, {}, {}, { records })).text}\n`, "[recall] the output is the text view of the 5 best-ranked records");
      assert.equal(text.result.records.length, 5);
      assert.equal(text.result.pick, undefined, "[recall] an unpicked recall carries no pick report");

      const limited = await run(["recall", QUERY, "--limit", "8", "--json"]);
      assert.equal(limited.picker.calls.length, 0, "[--limit 8 --json] the picker was not asked");
      assert.deepEqual(ids(JSON.parse(limited.stdout)), ids(ranked.slice(0, 8)), "[--limit 8 --json] a JSON array of the 8 best-ranked records");

      const all = await run(["recall", QUERY, "--block", "--all"]);
      assert.equal(all.picker.calls.length, 0, "[--block --all] the picker was not asked");
      assert.equal(all.stdout, blockOf(ranked), "[--block --all] a block of all 60 records, the promoted lesson among them");
      assert.equal(blockLines(all.stdout).length, 60);

      const thirty = await run(["recall", QUERY, "--block", "--limit", "30"], answers(JSON.stringify(Array.from({ length: 30 }, (_, index) => index + 1))));
      assert.equal(cardsOf(thirty.picker).length, 30, "[--block --limit 30] the picker was handed 30 cards");
      assert.equal(thirty.stdout, blockOf(unpromoted.slice(0, 30)), "[--block --limit 30] a block of at most 30 lines");

      const json = await run(["recall", QUERY, "--block", "--json"]);
      assert.equal(cardsOf(json.picker).length, 20, "[--block --json] the picker was handed 20 cards");
      assert.deepEqual(ids(JSON.parse(json.stdout)), ids(at(unpromoted, 3, 1)), "[--block --json] a JSON array of the records the picker chose");

      const status = await run(["status"]);
      assert.equal(status.picker.calls.length, 0, "[status] the picker was not asked");
      assert.match(status.stdout, /^memory: backend=local records=60\n/, "[status] a record count that includes the promoted lesson");
    },
  },
  {
    name: "201/00 task 03 the in-process door and the CLI hand out the same block: both are the records ranked 7th and 2nd",
    run: async () => {
      const records = matching(60);
      const ranked = await rankOf(records);
      const doors = rig(records, pickerStub(answers("[7, 2]")));
      const routed = await doors.cli(["recall", QUERY, "--block"]);
      const direct = await doors.inProcess(["recall", QUERY, "--block"]);
      assert.equal(routed.stdout, blockOf(at(ranked, 7, 2)));
      assert.equal(direct.stdout, routed.stdout, "both blocks are the records ranked 7th and 2nd");
      assert.deepEqual(ids(direct.result.records), ids(routed.result.records));
    },
  },

  // ===================================================================
  // The contract leaf, on its own (201/ADR-002 §6, §7; ADR-003).
  // ===================================================================
  {
    name: "201/00 recall-pick leaf: the answer reader takes the first array outside an object, drops strangers and repeats, cuts at the cap, and calls the rest unreadable",
    run: () => {
      const read = (answer, cards = 20, cap = 5) => readPickAnswer(answer, { cards, cap });
      assert.deepEqual(read("[7, 2, 15]"), [7, 2, 15]);
      assert.deepEqual(read("[]"), [], "an empty array is a pick of nothing");
      assert.deepEqual(read("```json\n[2, 5]\n```"), [2, 5], "a fenced answer is read");
      assert.deepEqual(read("none of [these] apply: [4]"), [4], "a bracket that is not JSON is passed over");
      assert.deepEqual(read("[1, 2, 3]", 20, 2), [1, 2], "the cap cuts");
      assert.deepEqual(read("[3, \"4\", 2.5, null, [1]]"), [3], "only whole numbers name a card");
      assert.equal(read("[\"4\"]"), null, "a non-empty array naming no card is unreadable, never an empty block");
      assert.equal(read("[21]"), null);
      assert.equal(read("{\"cards\": [1]}"), null, "an array inside an object is not the answer asked for");
      assert.equal(read("[1, 2"), null, "an unclosed array is unreadable");
      assert.equal(read(""), null);
      assert.equal(read(undefined), null);
      assert.equal(read(["[1]"]), null, "the answer is text");
    },
  },
  {
    name: "201/00 recall-pick leaf: the shortlist is 20 or the cap when larger, the request renders as numbered cards, and only a failure has an announcement",
    run: () => {
      const records = matching(60, { top: { status: PROMOTED } });
      assert.equal(PICK_SHORTLIST_SIZE, 20);
      assert.equal(shortlistRecords(records, { scope: {}, cap: 5 }).length, 20);
      assert.equal(shortlistRecords(records, { scope: {}, cap: 30 }).length, 30, "a cap above 20 widens the shortlist to the cap");
      assert.equal(shortlistRecords(records, { scope: {}, cap: 5 })[0].id, "R2", "the promoted lesson is dropped before the cut");
      assert.equal(shortlistRecords(records, { scope: { status: "control" }, cap: 5 })[0].id, "R1", "the filter stands down when the scope names status");
      assert.equal(shortlistRecords(records, { scope: { status: "" }, cap: 5 })[0].id, "R2", "a blank status scope asks for nothing by promotion");

      const request = buildPickRequest({ query: QUERY, shortlist: records.slice(1, 4), cap: 5, lineOf: (record) => `line of ${record.id}` });
      assert.deepEqual(request.cards.map((card) => [card.number, card.line]), [[1, "line of R2"], [2, "line of R3"], [3, "line of R4"]]);
      const prompt = renderPickRequest(request);
      assert.ok(prompt.startsWith(`Query: ${QUERY}\n`), "the request text opens with the query");
      assert.ok(prompt.includes("Pick at most 5 of the 3 cards below, or none."));
      for (const card of request.cards) assert.ok(prompt.includes(`[${card.number}] ${card.line}\n${card.text}`), `card ${card.number} is rendered under its number`);
      assert.match(PICK_INSTRUCTION, /JSON array of card numbers/);
      assert.match(PICK_INSTRUCTION, /\[\] when none applies/);

      assert.deepEqual(Object.values(PICK_MISS).sort(), ["pick-failed", "pick-off", "pick-timeout", "pick-unavailable", "pick-unreadable", "pick-unwired"]);
      const announced = Object.values(PICK_MISS).filter((code) => pickAnnouncement({ mode: "lexical", code }, 5) !== null);
      assert.deepEqual(announced.sort(), ["pick-failed", "pick-timeout", "pick-unavailable", "pick-unreadable"], "off and unwired are the configured behaviour");
      assert.equal(pickAnnouncement({ mode: "model", code: null }, 2), null);
      assert.equal(pickAnnouncement(undefined, 0), null, "a result with no pick report has nothing to announce");

      const settled = settlePick({ shortlist: records.slice(1, 21), cap: 5, outcome: { answer: "[2]", model: "haiku" } });
      assert.deepEqual([ids(settled.records), settled.pick], [["R3"], { mode: "model", code: null, shortlisted: 20, model: "haiku" }]);
    },
  },
];
