// test/notify/notify-form.test.mjs — milestone 131 / story 02, task 01
// (01_one-form-for-every-face.feature; ADR-006 §1, DESIGN "The one shape").
//
// The one zero-import formatter every face reads: the elapsed ladder, the one-line ask, the seven
// phrases, the headline, the cost and the account line. Envelopes come from the ONE builder
// (`buildNotifyEnvelope`, task 03), never hand-built, except the one row that proves an unknown
// event answers `null`.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accountLine, cost, eventPhrase, formatElapsed, headline, oneLineAsk } from "../../src/notify/form.mjs";
import * as formModule from "../../src/notify/form.mjs";
import { buildNotifyEnvelope } from "../../src/notify/notify.mjs";
import { renderDiscord } from "../../src/notify/discord.mjs";
import { stripComments } from "../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const NOW = () => new Date("2026-09-23T17:00:00.000Z");
// E(fields) — an envelope from the one builder, ref "127/02" unless the fields name another.
const E = ({ event, ...fields }) => buildNotifyEnvelope(event, { ref: "127/02", ...fields }, { config: {}, now: NOW });
const SIX = ["accountLine", "cost", "eventPhrase", "formatElapsed", "headline", "oneLineAsk"];
const a = (n) => "a".repeat(n);
const b = (n) => "b".repeat(n);
const c = (n) => "c".repeat(n);

export const notifyFormTests = [
  {
    name: "131/02 task01 — form.mjs imports nothing and exports the six; form.d.mts types exactly those six",
    async run() {
      const source = stripComments(await readFile(path.join(repoRoot, "src", "notify", "form.mjs"), "utf8"));
      assert.doesNotMatch(source, /^\s*import\s/mu, "no import statement");
      assert.doesNotMatch(source, /\bimport\s*\(/u, "no import( call");
      assert.doesNotMatch(source, /\brequire\s*\(/u, "no require( call");
      assert.deepEqual(Object.keys(formModule).sort(), SIX);
      const types = await readFile(path.join(repoRoot, "src", "notify", "form.d.mts"), "utf8");
      const declared = [...types.matchAll(/^export\s+declare\s+function\s+(\w+)/gmu)].map((m) => m[1]).sort();
      assert.deepEqual(declared, SIX, "one exported function declaration for each of the six");
      assert.deepEqual([...types.matchAll(/^export\s/gmu)].length, SIX.length, "and nothing else is exported");
    },
  },
  {
    name: "131/02 task01 — the elapsed wait has one ladder, each rung floors, and its boundary belongs to the next rung",
    run() {
      assert.deepEqual([45_000, 720_000, 11_400_000, 10_800_000, 187_200_000].map(formatElapsed), ["45s", "12m", "3h 10m", "3h", "2d 4h"]);
      for (const [ms, answer] of [
        [0, "0s"], [-0, "0s"], [999, "0s"], [1500.7, "1s"], [59999, "59s"], [60000, "1m"], [3599999, "59m"],
        [3600000, "1h"], [3660000, "1h 1m"], [86399999, "23h 59m"], [86400000, "1d"], [89940000, "1d"],
        [90000000, "1d 1h"], [172800000, "2d"], [189000000, "2d 4h"], [34560000000, "400d"],
      ]) {
        assert.equal(formatElapsed(ms), answer, `formatElapsed(${ms})`);
      }
      for (const ms of [-1, -86400000, NaN, Infinity, -Infinity, "60000", 60000n, new Number(60000), null, undefined]) {
        assert.equal(formatElapsed(ms), null, `formatElapsed(${String(ms)}) has no elapsed`);
      }
    },
  },
  {
    name: "131/02 task01 — the one-line ask collapses, trims, then clips on the last space in the last 20 (eighteen rows)",
    run() {
      const long = `${"word ".repeat(20)}\n\n${"more  text ".repeat(20)}`.slice(0, 300);
      const clipped = oneLineAsk(long);
      assert.ok(!clipped.includes("\n") && !clipped.includes("  "), "one line, no double space");
      assert.ok(clipped.endsWith("…") && [...clipped.slice(0, -1)].length <= 100, "at most 100 before a trailing …");

      for (const [text, answer] of [
        ["  Move the residue?  ", "Move the residue?"],
        ["a\r\nb\tc", "a b c"],
        ["a \n\n  b", "a b"],
        ["a b　c", "a b c"],
        [a(100), a(100)],
        [`  ${a(100)}\n`, a(100)],
        [`${a(50)}   ${b(49)}`, `${a(50)} ${b(49)}`],
        [a(101), `${a(100)}…`],
        [`${a(80)} ${b(20)}`, `${a(80)}…`],
        [`${a(79)} ${b(21)}`, `${a(79)} ${b(20)}…`],
        [`${a(99)} ${b(5)}`, `${a(99)}…`],
        [`${a(100)} b`, `${a(100)}…`],
        [`${a(80)} ${b(19)} ${c(10)}`, `${a(80)}…`],
        [`${a(50)}\n\n\n\n${b(50)}`, `${a(50)} ${b(49)}…`],
        [`${a(85)}  \n ${b(30)}`, `${a(85)}…`],
        ["😀".repeat(100), "😀".repeat(100)],
        ["😀".repeat(101), `${"😀".repeat(100)}…`],
        [`${a(99)}${"😀".repeat(5)}`, `${a(99)}😀…`],
      ]) {
        assert.equal(oneLineAsk(text), answer, JSON.stringify(text).slice(0, 60));
      }
      for (const text of ["", "  \n\t ", " ", null, undefined, 42, ["Q?"]]) {
        assert.equal(oneLineAsk(text), null, `${JSON.stringify(text)} asks nothing`);
      }
    },
  },
  {
    name: "131/02 task01 — the account line is headline, cost and one-line ask; an event with no phase has no cost and no dangling brackets",
    run() {
      assert.equal(accountLine(E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: "Move the residue?\nOptions: a, b" })), "127/02 — waiting on you (build, 12m): Move the residue? Options: a, b");
      assert.equal(accountLine(E({ ref: "131", event: "milestone-accepted", outcome: { title: "The human in the loop" } })), "131 — accepted");
    },
  },
  {
    name: "131/02 task01 — every event has its phrase, and the account line omits what it lacks (thirteen rows)",
    run() {
      const rows = [
        [E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: "Q?" }), "waiting on you", "127/02 — waiting on you (build, 12m): Q?"],
        [E({ event: "session-answered", phase: "build", elapsedMs: 720000, outcome: { by: "umair", answer: "b" } }), "answered by umair", "127/02 — answered by umair (build, 12m)"],
        [E({ event: "session-parked-unanswered", phase: "build", elapsedMs: 11400000, question: "Move?\nOptions: a, b" }), "parked, unanswered", "127/02 — parked, unanswered (build, 3h 10m): Move? Options: a, b"],
        [E({ ref: "127", event: "loop-halted", elapsedMs: 60000, stop: { id: "story-failed", ref: "127/03" } }), "loop halted on story-failed", "127 — loop halted on story-failed"],
        [E({ ref: "127", event: "loop-died", elapsedMs: 60000, outcome: { cause: "SIGKILL" } }), "loop died", "127 — loop died"],
        [E({ ref: "127", event: "loop-relaunched", elapsedMs: 60000, outcome: { cause: null } }), "loop relaunched", "127 — loop relaunched"],
        [E({ ref: "131", event: "milestone-accepted", outcome: { title: "T" } }), "accepted", "131 — accepted"],
        [E({ event: "session-answered", phase: "build", elapsedMs: 720000, outcome: { answer: "b" } }), "answered", "127/02 — answered (build, 12m)"],
        [E({ event: "session-answered", phase: "build", outcome: { by: { actor: "umair" }, answer: "b" } }), "answered", "127/02 — answered (build)"],
        [E({ ref: "127", event: "loop-halted", stop: { remedy: "Fix it." } }), "loop halted", "127 — loop halted"],
        [E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: "  \n " }), "waiting on you", "127/02 — waiting on you (build, 12m)"],
        [E({ event: "session-needs-input", question: "Q?" }), "waiting on you", "127/02 — waiting on you: Q?"],
        [{ event: "session-exploded", ref: "127/02" }, null, null],
      ];
      for (const [envelope, phrase, account] of rows) {
        assert.equal(eventPhrase(envelope), phrase, `phrase of ${envelope.event}`);
        assert.equal(accountLine(envelope), account, `account of ${envelope.event}`);
        if (phrase == null) assert.equal(headline(envelope), null, "no headline without a phrase");
      }
    },
  },
  {
    name: "131/02 task01 — the cost is the phase and the elapsed wait, or nothing (ten rows)",
    run() {
      for (const [event, phase, elapsedMs, answer] of [
        ["session-needs-input", "build", 720000, "(build, 12m)"],
        ["session-needs-input", "refine", 11400000, "(refine, 3h 10m)"],
        ["session-needs-input", "verify", 0, "(verify, 0s)"],
        ["session-needs-input", "build", null, "(build)"],
        ["session-needs-input", "build", -5, "(build)"],
        ["session-needs-input", null, 720000, null],
        ["session-needs-input", null, null, null],
        ["session-needs-input", "", 720000, null],
        ["loop-halted", "build", 60000, null],
        ["milestone-accepted", "verify", 5, null],
      ]) {
        assert.equal(cost(E({ event, phase, elapsedMs })), answer, `${event} ${phase} ${elapsedMs}`);
      }
    },
  },
  {
    name: "131/02 task01 — the Discord line 1 and the account line share their opening bytes (four rows)",
    run() {
      const node = { mesh: { nodeId: "aof-wsl" } };
      const envelope = (event, fields) => buildNotifyEnvelope(event, { ref: "127/02", ...fields }, { config: node, now: NOW });
      for (const [e, prefix] of [
        [envelope("session-needs-input", { phase: "build", elapsedMs: 720000, question: "Q?" }), "127/02 — waiting on you (build, 12m)"],
        [envelope("session-answered", { phase: "build", elapsedMs: 720000, outcome: { by: "umair" } }), "127/02 — answered by umair (build, 12m)"],
        [envelope("loop-halted", { ref: "127", stop: { id: "story-failed", ref: "127/03" } }), "127 — loop halted on story-failed"],
        [envelope("milestone-accepted", { ref: "131", outcome: { title: "T" } }), "131 — accepted"],
      ]) {
        const line1 = renderDiscord(e).content.split("\n")[0].replaceAll("**", "");
        assert.ok(line1.startsWith(prefix), `${line1} begins ${prefix}`);
        assert.ok(accountLine(e).startsWith(prefix), `${accountLine(e)} begins ${prefix}`);
      }
    },
  },
];
