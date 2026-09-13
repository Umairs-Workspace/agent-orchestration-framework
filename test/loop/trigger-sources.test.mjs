// milestone 63 / story 04 — THE SIGNALS THAT ARE NOT THE MESH.
//
// Every @executable scenario and every Scenario-Outline row of the story's five task features,
// driven against the real sources (`src/work-trigger/sources.mjs`) and the real scope decision
// (`decideLoopScope`, which is the SAME function `work:loop` refuses a scope with). Nothing here
// re-implements a rule it asserts: the admitted forms, their examples, the refusal code and the
// refusal's reason are all read off the loop, so a test that passed by agreeing with a private
// copy of the grammar is not available.
//
//   00_each-source-answers-only-which-scope   — one question, three signals, one shape; the
//        answer's keys ENUMERATED IN FULL; seven fields a signal may offer and none of them
//        reaching the answer; the clock staying the caller's; and an answer that does not move
//        with the tree it was resolved beside.
//   01_a-finding-triggered-wake-never-classifies — thirteen bodies and seven record differences
//        that change nothing, driven COMPARATIVELY because a body-reading source and a body-blind
//        one agree on every single-capture fixture; and the captures handed in as objects that
//        THROW on any property read, so "the body is unreachable" is a runtime fact.
//   02_a-ci-signal-is-a-signal-not-a-verdict  — nine outcomes and thirteen carried fields that
//        change nothing, plus a RECORDING PROXY over the signal so "the outcome was not read" is
//        asserted as a fact about the read set rather than inferred from an answer.
//   03_a-scope-resolves-through-the-loops-own-forms-or-is-refused — sixteen scopes put to all
//        three sources with ONE answer column; the story-shaped refusal naming its driver and
//        never resolving to it; and the loop's forms MOVED in a copy of the tree, with this
//        family byte-unchanged, so the grammar is proven imported rather than copied.
//   04_a-source-that-cannot-answer-refuses-by-name — nine ways to be unanswerable and what each
//        refusal must NAME; the seven shapes that read as "nothing to do"; and the two sets
//        accounted for by IDENTITY rather than by count.
//
// THE PROXIES ARE THE POINT IN 01 AND 02. An assertion that a value is absent from an answer
// cannot tell a source that read a field and discarded it from one that never read it, and the
// first is one edit away from the defect. So the signals are handed in as objects that record or
// refuse the reads themselves.
import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  SIGNAL_SOURCES,
  TRIGGER_SIGNAL_NOT_SUPPLIED,
  TRIGGER_SIGNAL_NO_CAPTURE,
  TRIGGER_SIGNAL_REFUSALS,
  TRIGGER_SIGNAL_SOURCE_UNKNOWN,
  TRIGGER_SIGNAL_UNREADABLE,
  isResolvedSignal,
  resolveCiSignal,
  resolveCronSignal,
  resolveFindingSignal,
  resolveTriggerSignal,
  resolveTriggerSignals,
} from "../../src/work-trigger/sources.mjs";
import { TRIGGER_SOURCES } from "../../src/work-trigger/declaration.mjs";
import { LOOP_LEVELS, decideLoopScope } from "../../src/work/loop.mjs";
// The two vocabularies the "a refusal carries no more than a resolution does" sweep recognises a
// level and a cadence BY, rather than by the key they arrive under: `runAt: "L3"` is a level and
// `every: "1h"` is a cadence, and a name-exact guard sees neither.
import { parseCadence } from "../../src/work/loops.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ─── the sources, by the names the declaration spells them with ────────────────────────
const CRON = "cron";
const CI = "ci-signal";
const FINDING = "feedback-finding";

// ─── capture fixtures ──────────────────────────────────────────────────────────────────
// A capture as `src/commands/feedback.mjs` writes one. Every field here is a field the finding
// source must not read, which is why it is planted in full rather than represented.
const capture = (overrides = {}) => ({
  kind: "raw",
  id: "feedback:11111111-1111-4111-8111-111111111111",
  text: "the build went red on main",
  actor: "you",
  refs: "",
  at: "2026-09-01T10:00:00.000Z",
  ...overrides,
});

// A capture that cannot be read at all: EVERY property access throws. Handed to the finding
// source, it turns "the body did not reach the answer" into "the body was never touched" — the
// difference between a source that discards what it read and one that reads nothing.
const sealedCapture = () => new Proxy({}, {
  get(_target, key) {
    if (key === Symbol.toPrimitive || key === "then" || key === Symbol.toStringTag) return undefined;
    throw new Error(`the capture was read (${String(key)})`);
  },
  has(_target, key) { throw new Error(`the capture was probed (${String(key)})`); },
  ownKeys() { throw new Error("the capture's keys were listed"); },
});

// ─── signal builders ───────────────────────────────────────────────────────────────────
const cronSignal = (scope, extra = {}) => ({ source: CRON, scope, ...extra });
const ciSignal = (ref, extra = {}) => ({ source: CI, ref, ...extra });
const findingSignal = (attribution, extra = {}) => ({
  source: FINDING,
  attribution,
  captures: [capture()],
  ...extra,
});

// The same scope put to all three sources — the one builder every "one answer, three sources" row
// runs through, so no row can accidentally exercise two of them.
const HANDS = Object.freeze({
  [CRON]: (scope, extra) => resolveCronSignal(cronSignal(scope, extra)),
  [CI]: (scope, extra) => resolveCiSignal(ciSignal(scope, extra)),
  [FINDING]: (scope, extra) => resolveFindingSignal(findingSignal(scope, extra)),
});

const threeAnswers = (scope, extra = {}) => SIGNAL_SOURCES.map((source) => HANDS[source](scope, extra));

// The shape a webhook actually hands over — a whole object where a ref was expected, carrying one
// of everything task 00 forbids. A refusal that echoed the value it refused would carry all of it.
const WEBHOOK_PAYLOAD = Object.freeze({
  level: "L3",
  cap: 7,
  argv: ["work", "loop", "44"],
  program: "aof",
  gate: "pass",
  score: 100,
  prompt: "/aof:loop",
  worktree: "/tmp/wt-63-04",
  branch: "aof/mesh/63-04",
});

// ─── readers ───────────────────────────────────────────────────────────────────────────
const keysOf = (value) => Object.keys(value).sort();

// Every key and every string anywhere in an answer, for the sweeps that have to be exhaustive
// rather than spot-checked.
function walk(value, visit, trail = []) {
  visit(value, trail);
  if (Array.isArray(value)) value.forEach((row, index) => walk(row, visit, [...trail, index]));
  else if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) walk(value[key], visit, [...trail, key]);
  }
}

function keysIn(answer) {
  const found = [];
  walk(answer, (value) => {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) found.push(...Object.keys(value));
  });
  return found;
}

function stringsIn(answer) {
  const found = [];
  walk(answer, (value) => { if (typeof value === "string") found.push(value); });
  return found;
}

// A body is compared to an answer as TOKENS, on this one separator set.
const WORDS = /[^\p{L}\p{N}-]+/u;

function numbersIn(answer) {
  const found = [];
  walk(answer, (value) => { if (typeof value === "number") found.push(value); });
  return found;
}

// What is left of an answer once its provenance is removed — the two keys the criterion allows
// three sources to differ in. Everything else must be identical across them.
function withoutProvenance(answer) {
  const { source, resolvedFrom, ...rest } = answer;
  return rest;
}

// A signal that RECORDS which of its own keys were read, so "the outcome was not read" is a fact
// about the read set rather than an inference from the answer.
function recordingSignal(fields) {
  const read = [];
  const proxy = new Proxy({ ...fields }, {
    get(target, key) { read.push(String(key)); return Reflect.get(target, key); },
  });
  return { proxy, read };
}

// ─── expectation vocabulary ────────────────────────────────────────────────────────────
function expectResolution(answer, scope, source, where) {
  assert.equal(isResolvedSignal(answer), true, `${where}: it resolves`);
  assert.equal(answer.scope, scope, `${where}: to the scope it was handed`);
  assert.equal(answer.source, source, `${where}: naming the source that answered`);
  assert.equal(answer.code, undefined, `${where}: a resolution carries no refusal code`);
  assert.deepEqual(keysOf(answer), ["resolvedFrom", "scope", "source"], `${where}: three keys and no fourth`);
}

function expectRefusal(answer, code, source, where) {
  assert.equal(isResolvedSignal(answer), false, `${where}: a refusal is not a resolution`);
  assert.equal(answer.code, code, `${where}: the code`);
  assert.equal(answer.source, source, `${where}: naming the source that was asked`);
  assert.equal("scope" in answer, false, `${where}: a refusal answers to no scope`);
}

// The loop's own refusal, carried through rather than re-phrased — asserted in BOTH DIRECTIONS
// off the loop's own object (63/01's precedent, `acd-trigger-level-is-a-ceiling:339-341`) rather
// than by enumerating the keys here: every key the loop produced except `scope` is present with
// the loop's own value, and `scope` itself is absent. A hand-written list would go stale silently
// the day `decideLoopScope` gains a key, and would keep reporting green while dropping it.
function expectTheLoopsOwnRefusal(answer, scope, where) {
  const loops = decideLoopScope(scope);
  assert.equal(loops.admitted, undefined, `${where}: the loop refuses it too (else this row asserts nothing)`);
  for (const [key, value] of Object.entries(loops)) {
    if (key === "scope") continue;
    assert.deepEqual(answer[key], value, `${where}: the loop's own ${key}, carried through`);
  }
  assert.equal("scope" in answer, false, `${where}: …with its scope RE-KEYED, so a refusal answers to none`);

  // …and the re-key names the value only when the value is a STRING. A non-string is the caller's
  // own object graph, and it is described by KIND — the same idiom the other three refusals use.
  if (typeof scope === "string") {
    assert.equal(answer.requestedScope, scope, `${where}: the scope it refused, re-keyed`);
    assert.equal("received" in answer, false, `${where}: a string is named, not described`);
  } else {
    assert.equal("requestedScope" in answer, false, `${where}: a non-string scope is never echoed`);
    assert.equal(typeof answer.received, "string", `${where}: …it is described by kind instead`);
  }
}

async function scratch(body, prefix = "aof-63-04-") {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function inDirectory(dir, body) {
  const previous = process.cwd();
  process.chdir(dir);
  try {
    return await body();
  } finally {
    process.chdir(previous);
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════
// TASK 00 — three signals, one question, and an answer that carries nothing else
// ════════════════════════════════════════════════════════════════════════════════════════

const ONE_QUESTION = [
  {
    name: "63/04/00 one declared scope, three signals, one answer — and the three differ in nothing but which source answered and what it resolved from",
    run: () => {
      for (const scope of ["63", "7", "60-63", "63-63"]) {
        const answers = threeAnswers(scope);
        answers.forEach((answer, index) => {
          expectResolution(answer, scope, SIGNAL_SOURCES[index], `scope ${scope} / ${SIGNAL_SOURCES[index]}`);
        });

        // The whole answer, minus the two keys that are ALLOWED to differ.
        const [first, ...rest] = answers.map(withoutProvenance);
        for (const other of rest) assert.deepEqual(other, first, `scope ${scope}: one answer, three sources`);
        assert.deepEqual(first, { scope }, `scope ${scope}: and what is left is the scope`);

        // …and none of them names an item, a phase, a level or a command to run.
        for (const answer of answers) {
          const where = `scope ${scope} / ${answer.source}`;
          for (const text of stringsIn(answer)) {
            assert.equal(text.includes("/"), false, `${where}: no item-shaped ref (${text})`);
            assert.equal(/^L\d+$/.test(text), false, `${where}: no level (${text})`);
            assert.equal(["refine", "build", "verify", "accept", "research", "plan"].includes(text), false,
              `${where}: no phase (${text})`);
            assert.equal(text.includes("aof "), false, `${where}: nothing to run (${text})`);
          }
          for (const key of keysIn(answer)) {
            assert.equal(["item", "ref", "phase", "level", "command", "argv", "program"].includes(key), false,
              `${where}: no ${key} key`);
          }
        }
      }
    },
  },

  {
    name: "63/04/00 what no source's answer ever carries — seven fields a signal offers, absent from all three, with no value passed through",
    run: () => {
      // Each row is the field as a signal would really offer it, with values distinctive enough
      // that a pass-through anywhere in the answer is visible.
      const rows = [
        ["a level to run at", { level: "L3" }],
        ["a cap, a cycle count or any other bound", { cap: 7, cycles: 3, maxAttempts: 9, deadline: "2026-09-09T00:00:00.000Z" }],
        ["a gate verdict, a score or a threshold", { gate: "admitted", score: 100, threshold: 100, verdict: "pass" }],
        // The offered argv names a DIFFERENT driver from the one the signal declares, so a
        // pass-through is visible as itself rather than hidden behind the scope's own token.
        ["a program, an argv or anything to execute", { program: "aof", argv: ["work", "loop", "44"], bin: "node", command: "aof work loop 44" }],
        ["a phase directive", { phase: "build", directive: "/aof:build" }],
        ["a prompt or a slash command", { prompt: "drive the loop until it stops", slashCommand: "/aof:loop" }],
        ["a session, a worktree or a branch", { sessionId: "s-63-04", worktree: "/tmp/wt-63-04", branch: "aof/mesh/63-04" }],
      ];

      for (const [field, offered] of rows) {
        const answers = threeAnswers("63", offered);
        for (const answer of answers) {
          const where = `${field} / ${answer.source}`;
          expectResolution(answer, "63", answer.source, where);

          const keys = keysIn(answer);
          for (const key of Object.keys(offered)) {
            assert.equal(keys.includes(key), false, `${where}: ${key} is absent from the answer`);
          }
          // …and no VALUE the signal offered for it survives anywhere either.
          const strings = stringsIn(answer);
          const numbers = numbersIn(answer);
          for (const value of Object.values(offered).flat()) {
            if (typeof value === "string") {
              // `work`, `loop` and `63` are the scope's own neighbourhood; the assertion is that
              // the offered value never appears as a value in the answer.
              assert.equal(strings.includes(value), false, `${where}: the offered ${JSON.stringify(value)} is not passed through`);
            } else if (typeof value === "number") {
              assert.equal(numbers.includes(value), false, `${where}: the offered ${value} is not passed through`);
            }
          }
        }
      }
    },
  },

  {
    name: "63/04/00 the whole answer is a scope and its provenance, enumerated — and there is no fourth key",
    run: () => {
      for (const source of SIGNAL_SOURCES) {
        const answer = HANDS[source]("63", {});
        assert.deepEqual(keysOf(answer), ["resolvedFrom", "scope", "source"],
          `${source}: the scope, the source that answered, and what it resolved the scope from`);
        assert.equal(Object.keys(answer).length, 3, `${source}: there is no fourth key`);
        assert.equal(typeof answer.resolvedFrom.field, "string", `${source}: …and the provenance names the field it read`);
      }

      // What each source resolved FROM is the field it actually read, and the finding source's
      // provenance additionally records that a capture exists — which is the whole of what it may
      // know about one.
      assert.deepEqual(resolveCronSignal(cronSignal("63")).resolvedFrom, { field: "scope" });
      assert.deepEqual(resolveCiSignal(ciSignal("63")).resolvedFrom, { field: "ref" });
      assert.deepEqual(resolveFindingSignal(findingSignal("63")).resolvedFrom, { field: "attribution", capture: "exists" });
    },
  },

  {
    name: "63/04/00 a cadence source resolves a declared scope and the clock stays the caller's — two instants far apart, one answer, and nothing waited for",
    run: () => {
      const signal = cronSignal("63", { cadence: "periodic:1h", wakes: "loop:build" });
      const realNow = Date.now;
      let first;
      let second;
      const startedAt = realNow();
      try {
        Date.now = () => 0;
        first = resolveCronSignal(signal);
        Date.now = () => 31_536_000_000; // a year later, to the millisecond
        second = resolveCronSignal(signal);
      } finally {
        Date.now = realNow;
      }
      const elapsed = realNow() - startedAt;

      assert.deepEqual(second, first, "both answers are identical across a year of clock");
      assert.equal(JSON.stringify(first), JSON.stringify(second), "…character for character");
      expectResolution(first, "63", CRON, "a cadence trigger");

      // Neither carries a next fire time, a due-at, or an interval to wait for.
      for (const key of keysIn(first)) {
        assert.equal(/next|due|fire|interval|wait|deadline|at$|cadence|schedule/i.test(key), false,
          `a cadence answer carries no ${key}`);
      }
      for (const text of stringsIn(first)) {
        assert.equal(text.includes("periodic:1h"), false, "the declared cadence is not carried either");
      }
      // Each resolution returns without waiting for any part of the cadence to elapse: the answer
      // is a value rather than a promise, and two of them cost no measurable time.
      assert.equal(typeof first.then, "undefined", "the answer is not a promise");
      assert.ok(elapsed < 1000, `two resolutions returned promptly (${elapsed}ms)`);
    },
  },

  {
    name: "63/04/00 a cadence that has not come round yet is still answered — and no source decides whether now is the right moment to fire",
    run: () => {
      // A cadence far longer than the gap between the two calls: an implementation holding a
      // clock would withhold the second (or the first), and both must answer.
      const signal = cronSignal("63", { cadence: "periodic:30d" });
      const first = resolveCronSignal(signal);
      const second = resolveCronSignal(signal);

      for (const [answer, which] of [[first, "first"], [second, "second"]]) {
        expectResolution(answer, "63", CRON, `${which} call inside the cadence`);
        assert.equal(answer.scope, "63", `${which}: the declared scope, not a withheld one`);
      }
      assert.deepEqual(second, first, "neither answer is withheld as not yet due");

      // The same holds for the other two sources: none of them holds a "not yet" answer at all.
      for (const source of SIGNAL_SOURCES) {
        const answer = HANDS[source]("63", { cadence: "periodic:30d", lastFiredAt: "2026-09-01T09:59:59.000Z" });
        expectResolution(answer, "63", source, `${source}: no source decides the moment`);
        for (const key of keysIn(answer)) {
          assert.equal(/withheld|pending|notyet|skipped|suppressed/i.test(key), false, `${source}: no ${key}`);
        }
      }
    },
  },

  {
    name: "63/04/00 every answer names the source that produced it, and the three remain distinguishable by that name alone",
    run: () => {
      const answers = threeAnswers("63");
      const names = answers.map((answer) => answer.source);
      assert.deepEqual(names, [...SIGNAL_SOURCES], "each answer names its own source");
      assert.equal(new Set(names).size, 3, "…and the three are distinguishable by that name alone");
      for (const answer of answers) assert.equal(answer.scope, "63", "all three carry the same scope");
    },
  },

  {
    name: "63/04/00 a source answers from what it is handed and reads nothing else — two working directories, two work trees, one answer",
    run: async () => {
      await scratch(async (root) => {
        // Two trees that could not look less alike to anything that read one: an empty directory,
        // and a directory carrying a work tree with an item bearing the very scope in question.
        const bare = path.join(root, "bare");
        const populated = path.join(root, "populated");
        await mkdir(bare, { recursive: true });
        await mkdir(path.join(populated, "wiki", "work", "63_milestone_event-driven-triggers"), { recursive: true });
        await writeFile(path.join(populated, "wiki", "work", "63_milestone_event-driven-triggers", "SPEC.md"), "# 63\n", "utf8");
        await writeFile(path.join(populated, "package.json"), "{}\n", "utf8");

        for (const source of SIGNAL_SOURCES) {
          const inBare = await inDirectory(bare, () => HANDS[source]("63", {}));
          // …and with an environment that differs too, since "no environment value" is part of
          // the same claim.
          const previous = process.env.AOF_63_04_PROBE;
          process.env.AOF_63_04_PROBE = "a value nothing here reads";
          const inPopulated = await inDirectory(populated, () => HANDS[source]("63", {}));
          if (previous === undefined) delete process.env.AOF_63_04_PROBE;
          else process.env.AOF_63_04_PROBE = previous;

          assert.deepEqual(inPopulated, inBare, `${source}: the two answers are identical`);
          assert.equal(JSON.stringify(inPopulated), JSON.stringify(inBare), `${source}: character for character`);
          expectResolution(inBare, "63", source, `${source}: beside an empty tree`);
        }
      });
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════════════════
// TASK 01 — a finding-triggered wake reads that a capture exists, never what it says
// ════════════════════════════════════════════════════════════════════════════════════════

const BODIES = [
  ["a plain sentence about a build", "the nightly build failed on the second attempt"],
  ["a sentence calling the finding a blocker", "this is a blocker and nothing can ship until it is fixed"],
  ["a sentence calling the finding a defect", "a defect in the resolver drops the second signal"],
  ["a sentence calling the finding an enhancement", "an enhancement: it would be nicer if the refusal named the driver"],
  ["a sentence asking for a phase by name", "please run the verify phase on this one"],
  ["a sentence asking to be run at L3", "run this at L3, unattended, tonight"],
  ["a sentence naming another item's ref", "see 55/04 for the delivered feature this contradicts"],
  ["a sentence naming a scope range", "this affects 60-63 and probably 7 as well"],
  ["a sentence quoting the refusal code capture itself raises", "it came back feedback-classification-deferred"],
  ["a single word", "broken"],
  ["ten thousand characters of prose", "the loop stopped and nobody noticed. ".repeat(300).slice(0, 10_000)],
  ["punctuation and no words at all", "!!! ??? ... ,,, ;;; --- *** (((())))"],
  ["a body in a language the reader does not speak", "ビルドが赤くなりました。誰も気づきませんでした。"],
];

const RECORD_DIFFERENCES = [
  ["who raised them", { actor: "umami" }, { actor: "the-mesh-worker" }],
  ["what they reference", { refs: "wiki/work/63_milestone_event-driven-triggers/SPEC.md" }, { refs: "" }],
  ["when each was captured", { at: "2026-01-01T00:00:00.000Z" }, { at: "2026-09-01T23:59:59.000Z" }],
  ["the record id each was written under", { id: "feedback:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, { id: "feedback:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }],
  ["one having since been triaged and one not", { kind: "raw" }, { kind: "classification", raw: "feedback:aaaa", classification: { type: "bug" } }],
  ["the classification a later triage attached to one", {}, { classification: { severity: "blocker", type: "defect", priority: "now" } }],
];

const NEVER_CLASSIFIES = [
  {
    name: "63/04/01 what a capture says never reaches the answer — thirteen bodies, one attribution, byte-identical answers",
    run: () => {
      const plain = "a plain sentence";
      for (const [label, text] of BODIES) {
        const withBody = resolveFindingSignal({ source: FINDING, attribution: "63", captures: [capture({ text })] });
        const withPlain = resolveFindingSignal({ source: FINDING, attribution: "63", captures: [capture({ text: plain })] });

        assert.equal(JSON.stringify(withBody), JSON.stringify(withPlain), `${label}: identical, character for character`);
        expectResolution(withBody, "63", FINDING, label);
        assert.equal(withBody.scope, "63", `${label}: the scope of both is the one the attribution names`);

        // Neither carries any part of what either capture says. Compared as TOKENS rather than as
        // substrings: `feedback-finding` contains the four characters of `back`, and a substring
        // sweep would report that collision as a leak while missing nothing a token sweep does.
        const carried = new Set(stringsIn(withBody).flatMap((value) => value.split(WORDS)));
        for (const word of `${text} ${plain}`.split(WORDS).filter((token) => token.length >= 4)) {
          assert.equal(carried.has(word), false, `${label}: no part of the body reaches the answer (${word})`);
        }
      }
    },
  },

  {
    name: "63/04/01 the capture's body is UNREACHABLE, not merely unused — captures that throw on every property read still resolve",
    run: () => {
      // The comparative rows above cannot tell a source that read a body and discarded it from one
      // that never read it. This one can: any property access at all explodes.
      const answer = resolveFindingSignal({
        source: FINDING,
        attribution: "63",
        captures: [sealedCapture(), sealedCapture(), sealedCapture()],
      });
      expectResolution(answer, "63", FINDING, "a sealed capture");
      assert.deepEqual(answer.resolvedFrom, { field: "attribution", capture: "exists" },
        "existence is all it learned");

      // …and the same through the dispatcher, so no second path reads what this one does not.
      const dispatched = resolveTriggerSignal({ source: FINDING, attribution: "63", captures: [sealedCapture()] });
      assert.deepEqual(dispatched, answer, "the dispatcher reads no more than the source does");
    },
  },

  {
    name: "63/04/01 nothing else a capture carries changes the answer either — six record differences, and the order they sit in",
    run: () => {
      for (const [label, left, right] of RECORD_DIFFERENCES) {
        const first = resolveFindingSignal({ source: FINDING, attribution: "63", captures: [capture(left)] });
        const second = resolveFindingSignal({ source: FINDING, attribution: "63", captures: [capture(right)] });

        assert.deepEqual(second, first, `${label}: the two answers are identical`);
        const rendered = JSON.stringify(first);
        for (const value of [...Object.values(left), ...Object.values(right)]) {
          const text = typeof value === "string" ? value : JSON.stringify(value);
          if (text.length >= 3) {
            assert.equal(rendered.includes(text), false, `${label}: the difference is named nowhere (${text})`);
          }
        }
      }

      // …and the order two captures sit in within the record.
      const one = capture({ id: "feedback:1", text: "first" });
      const two = capture({ id: "feedback:2", text: "second" });
      const forwards = resolveFindingSignal({ source: FINDING, attribution: "63", captures: [one, two] });
      const backwards = resolveFindingSignal({ source: FINDING, attribution: "63", captures: [two, one] });
      assert.deepEqual(backwards, forwards, "the order they sit in within the record changes nothing");
    },
  },

  {
    name: "63/04/01 the scope comes from the attribution alone — two items under two drivers, answers differing only in that scope",
    run: () => {
      const here = resolveFindingSignal(findingSignal("63"));
      const elsewhere = resolveFindingSignal(findingSignal("7"));

      expectResolution(here, "63", FINDING, "attributed to an item under 63");
      expectResolution(elsewhere, "7", FINDING, "attributed to an item under another driver");
      assert.deepEqual(
        { ...here, scope: null },
        { ...elsewhere, scope: null },
        "the two answers differ only in that scope",
      );
    },
  },

  {
    name: "63/04/01 how many captures an item carries is not a reading of them — one against nine",
    run: () => {
      const one = resolveFindingSignal({ source: FINDING, attribution: "63", captures: [capture()] });
      const nine = resolveFindingSignal({
        source: FINDING,
        attribution: "63",
        captures: Array.from({ length: 9 }, (_row, index) => capture({ id: `feedback:${index}`, text: `note ${index}` })),
      });

      expectResolution(one, "63", FINDING, "one capture");
      expectResolution(nine, "63", FINDING, "nine captures");
      assert.deepEqual(nine, one, "the count is not a reading");

      // Neither answer names a count, a rate, a score or a severity — asserted as the absence of
      // any number at all, since a count is a score with no scale.
      for (const [answer, which] of [[one, "one"], [nine, "nine"]]) {
        assert.deepEqual(numbersIn(answer), [], `${which}: no figure of any kind reaches the answer`);
        for (const key of keysIn(answer)) {
          assert.equal(/count|total|rate|score|severity|priority|weight/i.test(key), false, `${which}: no ${key}`);
        }
      }
    },
  },

  {
    name: "63/04/01 the answer says a capture exists and which item — and carries no excerpt, summary, length, digest, severity, type, priority or triage verdict",
    run: () => {
      const answer = resolveFindingSignal(findingSignal("63"));
      assert.deepEqual(keysOf(answer), ["resolvedFrom", "scope", "source"], "the whole answer, read in full");
      assert.equal(answer.resolvedFrom.capture, "exists", "it records that a capture exists");
      assert.equal(answer.scope, "63", "…and the item it is attributed to");

      for (const key of keysIn(answer)) {
        assert.equal(
          /excerpt|summary|length|digest|body|text|snippet|severity|type|priority|triage|verdict|classification|label/i.test(key),
          false,
          `the answer carries no ${key}`,
        );
      }
      for (const text of stringsIn(answer)) {
        assert.equal(
          /blocker|defect|enhancement|bug|severity|priority|triage/i.test(text),
          false,
          `the answer says nothing about what kind of finding it is (${text})`,
        );
      }
    },
  },

  {
    name: "63/04/01 existence is the key, so an item carrying no capture wakes nothing — and no other item's capture is consulted to answer it",
    run: () => {
      const answer = resolveFindingSignal({ source: FINDING, attribution: "63", captures: [] });
      expectRefusal(answer, TRIGGER_SIGNAL_NO_CAPTURE, FINDING, "an item carrying no capture");
      assert.equal(answer.item, "63", "the refusal names the item that carried none");
      assert.equal(isResolvedSignal(answer), false, "no scope is resolved for it");

      // No capture belonging to any other item is consulted: the source reads its OWN signal and
      // three keys of it, proven by the read set rather than by the answer.
      const { proxy, read } = recordingSignal({ source: FINDING, attribution: "63", captures: [] });
      resolveFindingSignal(proxy);
      assert.deepEqual([...new Set(read)].sort(), ["attribution", "captures"],
        "the finding source read its own attribution and whether a capture exists, and nothing else");

      // …and beside a batch in which another item DOES carry captures, the empty one still refuses
      // while the other still resolves.
      const batch = resolveTriggerSignals([
        { source: FINDING, attribution: "63", captures: [] },
        { source: FINDING, attribution: "7", captures: [capture()] },
      ]);
      assert.equal(batch.refused.length, 1, "the empty item is refused");
      assert.equal(batch.resolved.length, 1, "…and the other item's capture answered only for it");
      assert.equal(batch.resolved[0].scope, "7", "…under its own attribution");
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════════════════
// TASK 02 — a CI signal names a ref, and the build's outcome is read by nobody here
// ════════════════════════════════════════════════════════════════════════════════════════

const OUTCOMES = [
  ["a failure", { status: "failure", conclusion: "failure" }],
  ["a cancellation", { status: "completed", conclusion: "cancelled" }],
  ["a timeout", { status: "completed", conclusion: "timed_out" }],
  ["a skipped run", { status: "completed", conclusion: "skipped" }],
  ["an errored run", { status: "completed", conclusion: "action_required", error: "runner exploded" }],
  ["a neutral or inconclusive run", { status: "completed", conclusion: "neutral" }],
  ["a status of a spelling nobody knows", { status: "flurgled", conclusion: "wibble" }],
  ["a status field that is empty", { status: "", conclusion: "" }],
  ["no status field at all", {}],
];

const CARRIED_FIELDS = [
  ["a pipeline name", { pipeline: "nightly-integration" }],
  ["a workflow and job name", { workflow: "ci.yml", job: "unit-tests" }],
  ["a failure class", { failureClass: "flaky-network" }],
  ["the names of the tests that failed", { failedTests: ["trigger sources answer a scope", "the loop refuses a story"] }],
  ["a count of failures", { failureCount: 17 }],
  ["a duration", { durationMs: 903_112 }],
  ["a commit sha", { commit: "231ee134c0ffee0987654321abcdef0123456789" }],
  ["a pull-request number", { pullRequest: 26 }],
  ["an author", { author: "umami" }],
  ["a branch name", { branch: "aof/mesh/63-04" }],
  ["a repository name", { repository: "Vendorco-ai/agent-orchestration-framework" }],
  ["a retry or attempt number", { attempt: 3, retryOf: "run-9910" }],
  ["a label reading urgent", { labels: ["urgent", "release-blocker"] }],
];

const NOT_A_VERDICT = [
  {
    name: "63/04/02 the same ref under any outcome is the same answer — nine outcomes, none of them reported back",
    run: () => {
      const success = resolveCiSignal(ciSignal("63", { status: "completed", conclusion: "success" }));
      for (const [label, outcome] of OUTCOMES) {
        const answer = resolveCiSignal(ciSignal("63", outcome));
        assert.deepEqual(answer, success, `${label}: the two answers are identical`);
        expectResolution(answer, "63", CI, label);

        const rendered = JSON.stringify(answer);
        for (const value of Object.values(outcome)) {
          if (typeof value === "string" && value.length > 0) {
            assert.equal(rendered.includes(value), false, `${label}: the outcome it was handed is not reported (${value})`);
          }
        }
        for (const key of keysIn(answer)) {
          assert.equal(/status|conclusion|outcome|result|success|failure/i.test(key), false, `${label}: no ${key}`);
        }
      }
    },
  },

  {
    name: "63/04/02 the outcome is not merely unreported, it is UNREAD — a recording signal shows the read set is the ref alone",
    run: () => {
      const { proxy, read } = recordingSignal({
        source: CI,
        ref: "63",
        status: "failure",
        conclusion: "failure",
        pipeline: "nightly-integration",
        failureClass: "flaky-network",
      });
      const answer = resolveCiSignal(proxy);
      expectResolution(answer, "63", CI, "a signal carrying a status, a pipeline and a failure class");
      assert.deepEqual([...new Set(read)].sort(), ["ref"],
        "the CI source read the ref and nothing else — not the status, not the pipeline, not the failure class");

      // …AND ON THE REFUSAL PATH, which the row above cannot see: a signal that HAS a ref returns
      // before anything placed after the `ref === undefined` branch, so a leak living there
      // (`const { status, conclusion } = signal;` on the way to a refusal) is never proxied by it.
      // The read set of a signal with NO ref is the same one field.
      const refused = recordingSignal({ source: CI, status: "failure", conclusion: "failure", pipeline: "nightly" });
      const refusal = resolveCiSignal(refused.proxy);
      assert.equal(isResolvedSignal(refusal), false, "a signal with no ref is refused (else this half asserts nothing)");
      assert.deepEqual([...new Set(refused.read)].sort(), ["ref"],
        "…and on the way to that refusal it still read the ref alone");

      // The same on the other two sources' refusal paths, so the seam is covered for all three.
      const cronRefused = recordingSignal({ source: CRON, cadence: "periodic:1h", level: "L3" });
      assert.equal(isResolvedSignal(resolveCronSignal(cronRefused.proxy)), false, "a cadence trigger with no scope is refused");
      assert.deepEqual([...new Set(cronRefused.read)].sort(), ["scope"],
        "…having read the scope alone, not the cadence and not the level");

      const findingRefused = recordingSignal({ source: FINDING, captures: [capture()], actor: "you" });
      assert.equal(isResolvedSignal(resolveFindingSignal(findingRefused.proxy)), false, "a finding with no attribution is refused");
      assert.deepEqual([...new Set(findingRefused.read)].sort(), ["attribution"],
        "…having read the attribution alone, and never reached the captures");
    },
  },

  {
    name: "63/04/02 the rest of what a signal carries reaches nothing — thirteen fields, named nowhere in either answer",
    run: () => {
      const bare = resolveCiSignal(ciSignal("63"));
      for (const [label, carried] of CARRIED_FIELDS) {
        const answer = resolveCiSignal(ciSignal("63", carried));
        assert.deepEqual(answer, bare, `${label}: the two answers are identical`);

        const keys = keysIn(answer);
        const strings = stringsIn(answer);
        const numbers = numbersIn(answer);
        for (const key of Object.keys(carried)) {
          assert.equal(keys.includes(key), false, `${label}: ${key} is named nowhere`);
        }
        for (const value of Object.values(carried).flat()) {
          if (typeof value === "string") {
            assert.equal(strings.includes(value), false, `${label}: its value reaches nothing (${value})`);
          } else if (typeof value === "number") {
            // Compared as a VALUE, not as a substring: the scope `63` contains the digit an
            // attempt number is spelled with, and a substring sweep would fail on the collision.
            assert.equal(numbers.includes(value), false, `${label}: its value reaches nothing (${value})`);
          }
        }
      }
    },
  },

  {
    name: "63/04/02 a green build is answered, never withheld",
    run: () => {
      const answer = resolveCiSignal(ciSignal("63", { status: "completed", conclusion: "success" }));
      expectResolution(answer, "63", CI, "a successful build");
      assert.equal(answer.scope, "63", "it answers with the scope the ref names");
      assert.equal(answer.code, undefined, "the answer is not withheld, deferred or emptied because the build passed");
      for (const key of keysIn(answer)) {
        assert.equal(/withheld|deferred|skip|ignored/i.test(key), false, `no ${key}`);
      }
    },
  },

  {
    name: "63/04/02 the ref decides, and only the ref — four signals, two outcomes, and swapping them changes no answer",
    run: () => {
      const failure = { status: "completed", conclusion: "failure" };
      const success = { status: "completed", conclusion: "success" };

      const asDeclared = [resolveCiSignal(ciSignal("63", failure)), resolveCiSignal(ciSignal("7", success))];
      const swapped = [resolveCiSignal(ciSignal("63", success)), resolveCiSignal(ciSignal("7", failure))];

      expectResolution(asDeclared[0], "63", CI, "a failure for 63");
      expectResolution(asDeclared[1], "7", CI, "a success for 7");
      assert.deepEqual(swapped, asDeclared, "swapping the outcomes changed no answer");
    },
  },

  {
    name: "63/04/02 no pipeline is privileged and none is excluded — and neither is checked against a list before it is answered",
    run: () => {
      const first = resolveCiSignal(ciSignal("63", { pipeline: "nightly-integration", owner: "platform" }));
      const second = resolveCiSignal(ciSignal("63", { pipeline: "someone-elses-fork-build", owner: "a stranger" }));
      assert.deepEqual(second, first, "two pipelines sharing no name, owner or history get one answer");

      const { proxy, read } = recordingSignal({ source: CI, ref: "63", pipeline: "nightly-integration" });
      resolveCiSignal(proxy);
      assert.equal(read.includes("pipeline"), false, "neither pipeline is checked against a list before it is answered");
    },
  },

  {
    name: "63/04/02 a signal that names no ref is refused, never guessed at — not from the branch, the commit, the pipeline or a previous signal",
    run: () => {
      // A previous signal that DID resolve, so a source holding the last good scope would have one
      // to reach for.
      const previous = resolveCiSignal(ciSignal("60-63"));
      assert.equal(previous.scope, "60-63", "the previous signal resolved (else this row asserts nothing)");

      // EVERY FIELD A FALLBACK WOULD REACH FOR CARRIES A WELL-FORMED SCOPE. A fixture whose branch
      // and commit match no admitted form leaves nothing for a fallback to resolve TO, so the only
      // assertion left is a string sweep and the row cannot fail: a source falling back to the
      // branch would answer `{ scope: "63" }` and stay green. These four resolve, so an inference
      // is a RESOLUTION and the refusal assertion below kills it.
      for (const [field, value] of [["branch", "63"], ["commit", "60-63"], ["pipeline", "7"], ["head", "63-63"]]) {
        assert.equal(decideLoopScope(value).admitted, true, `${field} carries a scope the loop admits`);
      }
      const answer = resolveCiSignal({
        source: CI,
        status: "completed",
        conclusion: "failure",
        pipeline: "7",
        pipelineName: "nightly-integration",
        commit: "60-63",
        commitSha: "231ee134c0ffee0987654321abcdef0123456789",
        branch: "63",
        head: "63-63",
      });
      expectRefusal(answer, TRIGGER_SIGNAL_NOT_SUPPLIED, CI, "a CI signal naming no ref");
      assert.equal(answer.unresolved, "ref", "the refusal names the ref it could not find");
      assert.equal(isResolvedSignal(answer), false, "no scope is resolved for it");

      const rendered = JSON.stringify(answer);
      for (const guess of ["63", "60-63", "7", "63-63", "231ee134", "nightly-integration"]) {
        assert.equal(rendered.includes(guess), false, `no scope is inferred from ${guess}`);
      }
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════════════════
// TASK 03 — one grammar answers all three sources
// ════════════════════════════════════════════════════════════════════════════════════════

// One answer column, three sources. `resolves as <form>` reads the FORM off the loop rather than
// asserting a form spelled here, so the column cannot drift from the grammar it describes.
const SCOPE_ROWS = [
  ["63", "resolves as driver"],
  ["7", "resolves as driver"],
  ["60-63", "resolves as range"],
  ["63-63", "resolves as range"],
  ["999", "resolves as driver"],
  ["63/04", "refused, naming driver 63"],
  ["63/04/02", "refused, naming driver 63"],
  ["63-", "refused"],
  ["-63", "refused"],
  ["63-60", "refused"],
  ["60-63-66", "refused"],
  ["the-signals-that-are-not-the-mesh", "refused"],
  ["", "refused"],
  ["   ", "refused"],
  [" 63 ", "refused, untrimmed"],
  [63, "refused, uncoerced"],
];

const ONE_GRAMMAR = [
  {
    name: "63/04/03 one grammar, three sources, one answer — sixteen scopes, and the three differ in nothing but which source produced them",
    run: () => {
      for (const [scope, expected] of SCOPE_ROWS) {
        const answers = threeAnswers(scope);
        const label = `scope ${JSON.stringify(scope)}`;

        for (const answer of answers) {
          const where = `${label} / ${answer.source}`;
          if (expected.startsWith("resolves")) {
            const form = expected.split(" ").pop();
            expectResolution(answer, scope, answer.source, where);
            assert.equal(decideLoopScope(scope).form, form, `${where}: the loop reads it as a ${form}`);
          } else {
            expectRefusal(answer, decideLoopScope(scope).code, answer.source, where);
            expectTheLoopsOwnRefusal(answer, scope, where);
            if (expected === "refused, naming driver 63") {
              assert.equal(answer.driver, "63", `${where}: 63 is named as the driver it belongs to`);
            } else {
              assert.equal("driver" in answer, false, `${where}: no driver is invented`);
            }
          }
        }

        const [first, ...rest] = answers.map(withoutProvenance);
        for (const other of rest) {
          assert.deepEqual(other, first, `${label}: the three answers differ in nothing but which source produced them`);
        }
      }

      // The two near-miss rows say something only if the repaired form WOULD have resolved.
      assert.equal(decideLoopScope("63").admitted, true, "a scope is neither trimmed nor repaired: ` 63 ` is refused while `63` resolves");
      assert.equal(resolveCronSignal(cronSignal(" 63 ")).code, "loop-scope-unsupported", "…and the untrimmed one is refused");
      assert.equal(
        resolveCronSignal(cronSignal(63)).reason,
        decideLoopScope(63).reason,
        "values are never coerced, and the reason for that is the loop's own",
      );
    },
  },

  {
    name: "63/04/03 a story-shaped signal is refused with its driver named, and no answer anywhere carries that driver as a resolved scope",
    run: () => {
      const batch = resolveTriggerSignals([
        cronSignal("63/04"),
        ciSignal("63/04"),
        findingSignal("63/04"),
      ]);

      assert.equal(batch.resolved.length, 0, "no answer produced for that signal carries that driver as a resolved scope");
      assert.equal(batch.refused.length, 3, "all three are refused");
      for (const answer of batch.refused) {
        const where = `${answer.source} handed 63/04`;
        assert.equal(typeof answer.code, "string", `${where}: it is refused with a code`);
        assert.equal(answer.driver, "63", `${where}: the refusal names the driver that item belongs to`);
        assert.equal("scope" in answer, false, `${where}: and never widens to it`);
        assert.equal(answer.alternative, decideLoopScope("63/04").alternative,
          `${where}: the caller is pointed at the command that drives a single item instead`);
      }
      // Nothing in any answer reads as a resolution of 63.
      for (const answer of batch.answers) {
        assert.equal(isResolvedSignal(answer), false, "no story-shaped signal resolves");
      }
    },
  },

  {
    name: "63/04/03 the refusal is the loop's own answer rather than a re-phrasing of it",
    run: () => {
      const loops = decideLoopScope("63/04");
      for (const source of SIGNAL_SOURCES) {
        const answer = HANDS[source]("63/04", {});
        assert.equal(answer.code, loops.code, `${source}: the code the loop's own scope decision produces`);
        assert.deepEqual(answer.admits, loops.admits, `${source}: the same admitted forms, with their examples, in the same order`);
        assert.equal(answer.reason, loops.reason, `${source}: its stated reason is the loop's own`);
        // Non-vacuity: the loop really does say something here, in the order asserted.
        assert.deepEqual(loops.admits.map((row) => row.id), ["driver", "range"], "the loop names two forms, in order");
        assert.ok(loops.reason.length > 0, "…and a reason");
      }
    },
  },

  {
    name: "63/04/03 when the loop's admitted forms move, these answers move with them — and no file in this family was edited to bring it about",
    run: async () => {
      const FORMS_DRIVER = '{ id: "driver", pattern: /^\\d+$/ },';
      const FORMS_RANGE = '{ id: "range", pattern: /^\\d+-\\d+$/ },';
      const DRIVER_COERCION = "only: BigInt(scope)";

      // Each row moves the loop's own scope forms and NOTHING ELSE IN THE TREE. The two rows that
      // ADMIT a new shape must also relax the numeric coercion the driver branch applies to a
      // matched form — that coercion is part of how the loop reads a driver, and a form admitting
      // a non-numeric scope is unreadable without it; the two WITHDRAWAL rows move the forms
      // literal alone, which is the pure-data half of the same claim.
      const rows = [
        ["a story-shaped form is admitted", "63/04", "resolves",
          [[FORMS_DRIVER, '{ id: "driver", pattern: /^\\d+(?:\\/\\d+)*$/ },'], [DRIVER_COERCION, "only: null"]]],
        ["a slug form is admitted", "the-signals-that-are-not-the-mesh", "resolves",
          [[FORMS_DRIVER, '{ id: "driver", pattern: /^[a-z][a-z0-9-]*$/ },'], [DRIVER_COERCION, "only: null"]]],
        ["the range form is withdrawn", "60-63", "is refused",
          [[FORMS_RANGE, '{ id: "range", pattern: /(?!)/ },']]],
        ["the driver form stops admitting a single digit", "7", "is refused",
          [[FORMS_DRIVER, '{ id: "driver", pattern: /^\\d\\d+$/ },']],
          // THE DRIVER A REFUSAL NAMES IS THE LOOP'S ANSWER, NOT A SPLIT. Under a tree that no
          // longer admits a single digit as a driver, `7/04` must be refused WITHOUT naming `7`:
          // an implementation returning the head of the split unasked would offer a driver the
          // loop no longer admits as the scope to declare instead, and every other row here
          // stays green while it does.
          (moved, change) => {
            const answer = moved.resolveCronSignal({ source: CRON, scope: "7/04" });
            assert.equal(moved.isResolvedSignal(answer), false, `${change}: 7/04 is still refused`);
            assert.equal("driver" in answer, false,
              `${change}: …and names no driver, because the loop no longer admits 7 as one`);
            // …while a head the moved forms DO still admit is still named, so this is not
            // passing because the naming stopped happening altogether.
            const wider = moved.resolveCronSignal({ source: CRON, scope: "63/04" });
            assert.equal(wider.driver, "63", `${change}: a head the loop still admits is still named`);
          }],
      ];

      const loopSource = await readFile(path.join(REPO_ROOT, "src", "work", "loop.mjs"), "utf8");
      const familySource = await readFile(path.join(REPO_ROOT, "src", "work-trigger", "sources.mjs"), "utf8");

      for (const [change, scope, expected, patches, probe] of rows) {
        // In THIS tree the row's scope answers the other way, so the row measures movement rather
        // than a constant.
        const before = resolveCronSignal(cronSignal(scope));
        assert.equal(isResolvedSignal(before), expected === "is refused",
          `${change}: before the change, ${JSON.stringify(scope)} answers the other way`);

        await scratch(async (root) => {
          const src = path.join(root, "src");
          await mkdir(path.join(src, "work-trigger"), { recursive: true });
          // 119/01 — the loop module lives at `src/work/loop.mjs` now, so the copy needs the
          // family directory as well as the sub-family one.
          await mkdir(path.join(src, "work"), { recursive: true });

          let patched = loopSource;
          for (const [find, replacement] of patches) {
            assert.ok(patched.includes(find), `${change}: the loop's own scope forms carry \`${find}\``);
            patched = patched.replace(find, replacement);
          }
          assert.notEqual(patched, loopSource, `${change}: the copy really was changed`);

          await writeFile(path.join(src, "work/loop.mjs"), patched, "utf8");
          await cp(path.join(REPO_ROOT, "src", "work-trigger", "sources.mjs"), path.join(src, "work-trigger", "sources.mjs"));

          // No file in this family was edited to bring it about.
          assert.equal(await readFile(path.join(src, "work-trigger", "sources.mjs"), "utf8"), familySource,
            `${change}: the source family in the copy is byte-identical to this one`);

          const moved = await import(pathToFileURL(path.join(src, "work-trigger", "sources.mjs")).href);
          const answer = moved.resolveCronSignal({ source: CRON, scope });
          assert.equal(
            moved.isResolvedSignal(answer),
            expected === "resolves",
            `${change}: ${JSON.stringify(scope)} ${expected} under the moved forms`,
          );
          if (expected === "resolves") assert.equal(answer.scope, scope, `${change}: to the scope it was handed`);
          else assert.equal(typeof answer.code, "string", `${change}: with a code`);

          // The other two sources moved with it too — one grammar, not three.
          const ci = moved.resolveCiSignal({ source: CI, ref: scope });
          const finding = moved.resolveFindingSignal({ source: FINDING, attribution: scope, captures: [capture()] });
          assert.equal(moved.isResolvedSignal(ci), expected === "resolves", `${change}: the CI source moved with it`);
          assert.equal(moved.isResolvedSignal(finding), expected === "resolves", `${change}: the finding source moved with it`);
          if (probe) probe(moved, change);
        }, "aof-63-04-moved-");
      }

      // The control in THIS tree: 7 IS a driver here, so 7/04 is refused with 7 named — which is
      // what makes the moved row above a measurement rather than a constant.
      assert.equal(resolveCronSignal(cronSignal("7/04")).driver, "7",
        "in this tree, where a single digit is a driver, 7/04 is refused with 7 named");

      // The tree this test read is unchanged by it.
      assert.equal(readFileSync(path.join(REPO_ROOT, "src", "work", "loop.mjs"), "utf8"), loopSource,
        "the repository's own loop module was not edited");
    },
  },

  {
    name: "63/04/03 a well-formed scope naming no item is a scope, not a refusal — and no source consults the work tree to decide",
    run: async () => {
      await scratch(async (root) => {
        const empty = path.join(root, "empty");
        await mkdir(empty, { recursive: true });

        for (const source of SIGNAL_SOURCES) {
          const here = HANDS[source]("999", {});
          const beside = await inDirectory(empty, () => HANDS[source]("999", {}));

          expectResolution(here, "999", source, `${source}: a driver no item bears`);
          assert.equal(decideLoopScope("999").form, "driver", `${source}: it resolves as a driver`);
          assert.deepEqual(beside, here, `${source}: the same answer beside an empty work tree and beside this one`);
        }
      });
    },
  },

  {
    name: "63/04/03 the three sources are not three grammars — one admitted set, one refused set, one code",
    run: () => {
      const resolving = "63";
      const refused = "63/04";

      const admitted = SIGNAL_SOURCES.map((source) => HANDS[source](resolving, {}));
      for (const answer of admitted) expectResolution(answer, resolving, answer.source, `${answer.source} / ${resolving}`);
      assert.equal(new Set(admitted.map((answer) => answer.scope)).size, 1, "the resolving one resolves for all three, in the same form");

      const refusals = SIGNAL_SOURCES.map((source) => HANDS[source](refused, {}));
      assert.equal(new Set(refusals.map((answer) => answer.code)).size, 1, "the refused one is refused by all three, under the same code");
      assert.equal(refusals[0].code, decideLoopScope(refused).code, "…and the code is the loop's");

      // No source admits a form the other two refuse — swept over every row in the table.
      for (const [scope] of SCOPE_ROWS) {
        const verdicts = SIGNAL_SOURCES.map((source) => isResolvedSignal(HANDS[source](scope, {})));
        assert.equal(new Set(verdicts).size, 1, `scope ${JSON.stringify(scope)}: the three sources agree`);
      }
    },
  },

  {
    name: "63/04/03 the three sources this module answers for are three of the four the declaration declares — and the fourth is the mesh assignment",
    run: () => {
      for (const source of SIGNAL_SOURCES) {
        assert.equal(TRIGGER_SOURCES.includes(source), true, `${source} is a declared trigger source`);
      }
      assert.deepEqual(
        TRIGGER_SOURCES.filter((source) => !SIGNAL_SOURCES.includes(source)),
        ["mesh-assignment"],
        "the one declared source this module does not answer for is the mesh assignment (ADR-006's)",
      );

      // Membership is not dispatch. `SIGNAL_SOURCES` claims to be DERIVED from the table that
      // answers, so the claim is put to the dispatcher: every name in it is answered by a source,
      // and a name outside it is refused as unknown — which is what makes "a source added and not
      // wired, or wired and not named, cannot exist" a fact rather than a comment.
      for (const source of SIGNAL_SOURCES) {
        const answer = resolveTriggerSignal({ source, scope: "63", ref: "63", attribution: "63", captures: [capture()] });
        assert.notEqual(answer.code, TRIGGER_SIGNAL_SOURCE_UNKNOWN, `${source} is dispatched, not refused as unknown`);
        assert.equal(isResolvedSignal(answer), true, `${source} answers`);
        assert.equal(answer.source, source, `${source} answers as itself`);
      }
      for (const outside of ["mesh-assignment", "a-webhook-somebody-wired", "toString", "CRON", "cron "]) {
        const answer = resolveTriggerSignal({ source: outside, scope: "63" });
        assert.equal(answer.code, TRIGGER_SIGNAL_SOURCE_UNKNOWN, `${JSON.stringify(outside)} is refused as unknown`);
        assert.deepEqual(answer.sources, [...SIGNAL_SOURCES], `…naming the sources that answer here`);
      }
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════════════════
// TASK 04 — a source that cannot answer refuses with a code, and says which source
// ════════════════════════════════════════════════════════════════════════════════════════

const UNANSWERABLE = [
  [
    "a cadence trigger declaring no scope at all",
    () => resolveCronSignal({ source: CRON, cadence: "periodic:1h" }),
    (answer) => {
      expectRefusal(answer, TRIGGER_SIGNAL_NOT_SUPPLIED, CRON, "no scope declared");
      assert.equal(answer.unresolved, "scope", "it names that no scope was declared");
      assert.equal("requestedScope" in answer, false, "…and names no scope it was handed, because it was handed none");
    },
  ],
  [
    "a cadence trigger whose scope is present and empty",
    () => resolveCronSignal({ source: CRON, scope: "" }),
    (answer) => {
      expectRefusal(answer, "loop-scope-unsupported", CRON, "an empty scope");
      assert.equal(answer.requestedScope, "", "it names the empty scope handed to it");
    },
  ],
  [
    "a CI signal naming no ref",
    () => resolveCiSignal({ source: CI, status: "failure" }),
    (answer) => {
      expectRefusal(answer, TRIGGER_SIGNAL_NOT_SUPPLIED, CI, "no ref");
      assert.equal(answer.unresolved, "ref", "it names the ref it could not find");
    },
  ],
  [
    "a CI signal whose ref is blank",
    () => resolveCiSignal({ source: CI, ref: "   " }),
    (answer) => {
      expectRefusal(answer, "loop-scope-unsupported", CI, "a blank ref");
      assert.equal(answer.requestedScope, "   ", "it names the blank ref, unrepaired");
    },
  ],
  [
    "a CI signal that is not an object at all",
    () => resolveCiSignal("63"),
    (answer) => {
      expectRefusal(answer, TRIGGER_SIGNAL_UNREADABLE, CI, "not an object");
      assert.equal(answer.unresolved, "signal", "it names the signal it could not read");
      assert.equal(answer.received, "a string", "…and what it was handed instead");
    },
  ],
  [
    "a finding signal naming an item that carries no capture",
    () => resolveFindingSignal({ source: FINDING, attribution: "63", captures: [] }),
    (answer) => {
      expectRefusal(answer, TRIGGER_SIGNAL_NO_CAPTURE, FINDING, "no capture");
      assert.equal(answer.item, "63", "it names the item that carried none");
    },
    // What the CALLER named, for the "suggests no scope the caller did not name" sweep below:
    // a refusal may echo the caller's own ref back, and may invent nothing else.
    "63",
  ],
  [
    "a finding signal carrying no attribution",
    () => resolveFindingSignal({ source: FINDING, captures: [capture()] }),
    (answer) => {
      expectRefusal(answer, TRIGGER_SIGNAL_NOT_SUPPLIED, FINDING, "no attribution");
      assert.equal(answer.unresolved, "attribution", "it names the missing attribution");
    },
  ],
  [
    "a signal naming a source nobody declared",
    () => resolveTriggerSignal({ source: "a-webhook-somebody-wired", scope: "63" }),
    (answer) => {
      assert.equal(answer.code, TRIGGER_SIGNAL_SOURCE_UNKNOWN, "the unknown-source code");
      assert.equal(answer.source, "a-webhook-somebody-wired", "it names the unknown source");
      assert.deepEqual(answer.sources, [...SIGNAL_SOURCES], "…and the sources that are known");
      assert.equal(isResolvedSignal(answer), false, "no scope is resolved for it");
    },
  ],
  [
    "a signal whose scope matches no admitted form",
    () => resolveCronSignal(cronSignal("the-signals-that-are-not-the-mesh")),
    (answer) => {
      expectRefusal(answer, "loop-scope-unsupported", CRON, "no admitted form");
      assert.equal(answer.requestedScope, "the-signals-that-are-not-the-mesh", "it names the scope it refused");
    },
  ],
];

// Every shape a "graceful" implementation reaches for, and each is the same silence in different
// clothes. They are asserted STRUCTURALLY — a caller that reads nothing else must be able to tell.
const SILENT_SHAPES = [
  ["an empty resolution", (answer) => {
    assert.equal(isResolvedSignal(answer), false, "not a resolution");
    assert.ok(Object.keys(answer).length > 0, "not empty either");
  }],
  ["a resolution whose scope is null, empty or absent", (answer) => {
    assert.equal("scope" in answer, false, "there is no scope key to read as nothing");
  }],
  ["a resolution carrying a default or fallback scope", (answer) => {
    for (const key of keysIn(answer)) {
      assert.equal(/default|fallback|assumed|guess/i.test(key), false, `no ${key}`);
    }
  }],
  ["a resolution carrying the last scope that did resolve", (answer, previous) => {
    const rendered = JSON.stringify(answer);
    assert.equal(rendered.includes(previous), false, `the last scope that resolved (${previous}) is not reached for`);
  }],
  ["the signal's simple absence from the answer", (answer, _previous, batch) => {
    assert.equal(batch.answers.length, 2, "every signal handed in has an entry");
    assert.equal(batch.answers[1], answer, "…including the one that could not be resolved, in its own position");
  }],
  ["a resolved answer with a warning attached to it", (answer) => {
    for (const key of keysIn(answer)) {
      assert.equal(/warning|warn|ok$|success/i.test(key), false, `no ${key}`);
    }
    assert.equal(isResolvedSignal(answer), false, "it is not a resolved answer at all");
  }],
  ["prose carrying no code a caller can branch on", (answer) => {
    assert.equal(typeof answer, "object", "the answer is an object, not a sentence");
    assert.equal(typeof answer.code, "string", "…carrying a code");
    assert.ok(answer.code.length > 0, "…that a caller can branch on");
  }],
];

const REFUSES_BY_NAME = [
  {
    name: "63/04/04 what a source could not resolve, said by name — nine unanswerable signals, each naming its source and what it could not resolve",
    run: () => {
      for (const [label, resolve, expect] of UNANSWERABLE) {
        const answer = resolve();
        assert.equal(isResolvedSignal(answer), false, `${label}: no scope is resolved for it`);
        assert.equal(typeof answer.code, "string", `${label}: the answer is a refusal carrying a code`);
        assert.ok(answer.code.length > 0, `${label}: …a non-empty one`);
        assert.equal(typeof answer.reason, "string", `${label}: …and a reason a reader can act on`);
        expect(answer);
      }
    },
  },

  {
    name: "63/04/04 an unresolvable signal is never any of the seven shapes that read as nothing to do",
    run: () => {
      const previous = "60-63";
      // One that resolves, then one that cannot — so a source keeping the last good scope would
      // have one to hand back, and a source dropping the unanswerable one would leave a hole.
      const batch = resolveTriggerSignals([ciSignal(previous), ciSignal("63/04")]);
      const answer = batch.answers[1];

      for (const [shape, check] of SILENT_SHAPES) {
        check(answer, previous, batch);
      }
      // …and the same over every refusal this module can produce, not only this one.
      for (const [label, resolve] of UNANSWERABLE) {
        const refusal = resolve();
        for (const [shape, check] of SILENT_SHAPES) {
          if (shape === "the signal's simple absence from the answer") continue;
          check(refusal, previous, batch);
        }
        assert.equal(isResolvedSignal(refusal), false, `${label}: still a refusal`);
      }
    },
  },

  {
    name: "63/04/04 every signal has exactly one answer — the two sets account for every signal handed in, by identity",
    run: () => {
      const signals = [
        cronSignal("63"),
        { source: CRON, cadence: "periodic:1h" },
        ciSignal("60-63"),
        { source: CI, status: "failure" },
        findingSignal("7"),
        { source: FINDING, attribution: "63", captures: [] },
        { source: "a-webhook-somebody-wired" },
        "not a signal at all",
      ];
      const batch = resolveTriggerSignals(signals);

      assert.equal(batch.answers.length, signals.length, "every signal appears once");
      assert.equal(batch.resolved.length + batch.refused.length, batch.answers.length,
        "the two sets together account for every signal handed in");
      for (const answer of batch.answers) {
        const inResolved = batch.resolved.includes(answer);
        const inRefused = batch.refused.includes(answer);
        assert.equal(inResolved && inRefused, false, "no signal appears as both");
        assert.equal(inResolved || inRefused, true, "no signal appears as neither");
      }
      assert.equal(batch.resolved.length, 3, "the three answerable signals resolved");
      assert.equal(batch.refused.length, 5, "…and the five unanswerable ones are refusals");
    },
  },

  {
    name: "63/04/04 one refusal does not cost another signal its answer, and the run is not abandoned at the first",
    run: () => {
      const batch = resolveTriggerSignals([
        cronSignal("63"),
        { source: CRON },
        ciSignal("60-63"),
        findingSignal("7"),
      ]);

      assert.equal(batch.refused.length, 1, "the refusal is present for the one that could not be resolved");
      assert.equal(batch.refused[0].unresolved, "scope", "…naming what it could not resolve");
      assert.deepEqual(batch.resolved.map((answer) => answer.scope), ["63", "60-63", "7"],
        "every other signal still carries its own resolved scope");
      assert.equal(batch.answers.length, 4, "the run is not abandoned at the first signal that could not be answered");
    },
  },

  {
    name: "63/04/04 a refusal carries no more than a resolution does — swept DEEP and by VOCABULARY: no level, no bound, no gate verdict, nothing to execute, and no scope the caller did not name",
    run: () => {
      // Swept beside them: the story-shaped refusal, which is the one that legitimately NAMES a
      // driver, and a scope handed in as an OBJECT, which is the one place a refusal could carry
      // a caller's entire object graph.
      const rows = [
        ...UNANSWERABLE,
        ["a story-shaped signal", () => resolveCiSignal(ciSignal("63/04")), null, "63/04"],
        ["a scope handed in as an object", () => resolveCiSignal(ciSignal(WEBHOOK_PAYLOAD)), null, null],
      ];

      for (const [label, resolve, , named] of rows) {
        const refusal = resolve();

        // THE LOOP'S OWN PAYLOAD IS EXEMPT, and it is identified by COMPARISON with what
        // `decideLoopScope` returns rather than by a list of key names kept here — a list would
        // keep exempting a key that had stopped being the loop's. The admitted forms and the
        // alternative are constant across the loop's refusals, so any refused value probes them,
        // and a leak planted INSIDE them makes them differ from the loop's and is swept.
        const loops = decideLoopScope("63/04");
        const carried = new Set(Object.keys(loops).filter((key) =>
          key !== "scope" && JSON.stringify(loops[key]) === JSON.stringify(refusal[key])));

        // DEEP, not depth 0. The guard this replaces read `Object.entries(refusal)` only, so a
        // suggested scope one level down (`hint: { instead: "63" }`) survived it.
        const seen = [];
        walk(refusal, (value, trail) => {
          if (trail.length > 0 && carried.has(String(trail[0]))) return;
          seen.push([trail.length === 0 ? null : String(trail[trail.length - 1]), value, trail.join(".") || "(root)"]);
        });
        assert.ok(seen.length > 3, `${label}: the sweep really walked the refusal`);
        // The two vocabularies below are only worth asserting against if they still recognise
        // anything: a leg that admits nothing bans nothing, which is the failure this whole round
        // is about. Both are probed with a value they must recognise before either is used.
        assert.ok(LOOP_LEVELS.length > 0, "the level vocabulary is loaded");
        assert.notEqual(parseCadence("periodic:1h"), null, "the cadence vocabulary is loaded and admits a real cadence");

        for (const [key, value, at] of seen) {
          if (key !== null) {
            assert.equal(
              /^(level|cap|cycles|bound|deadline|gate|score|threshold|verdict|program|bin|argv|command|prompt|session|worktree|branch|hint|instead|suggested|suggestion)$/i.test(key),
              false,
              `${label}: a refusal carries no ${key} (at ${at})`,
            );
          }
          // A FIGURE IS A FIGURE whatever it is called: a score, a cap, a cycle count and a
          // threshold are all numbers, and no refusal this module produces carries one at all.
          assert.notEqual(typeof value, "number", `${label}: a refusal carries no figure (${value} at ${at})`);
          if (typeof value !== "string") continue;
          // A level and a cadence are recognised BY THE VOCABULARIES THAT OWN THEM rather than by
          // the key they arrive under, so a level under `runAt` is caught as readily as one under
          // `level`, and an echoed cadence is caught wherever it is put.
          assert.equal(LOOP_LEVELS.includes(value), false, `${label}: a refusal carries no level (${value} at ${at})`);
          assert.equal(parseCadence(value), null, `${label}: a refusal carries no cadence (${value} at ${at})`);
          if (decideLoopScope(value).admitted !== true) continue;
          // It suggests no scope the caller did not name: an admitted scope may appear only where
          // this module NAMES the caller's own ref back, and must be that ref or its head.
          assert.ok(["driver", "item"].includes(key),
            `${label}: ${JSON.stringify(value)} sits at ${at}, which is not a place this module names the caller's own ref`);
          const handed = named ?? refusal.requestedScope ?? refusal.item;
          assert.equal(typeof handed, "string", `${label}: and the caller handed a ref for it to be the head of`);
          assert.equal(handed.startsWith(value), true, `${label}: ${key} is the caller's own ref, or its head`);
        }
        assert.equal("scope" in refusal, false, `${label}: it carries no partially resolved scope`);
      }
    },
  },

  {
    name: "63/04/04 a refusal names the KIND of a scope it could not read, never the caller's object graph",
    run: () => {
      for (const source of SIGNAL_SOURCES) {
        const where = `${source} handed an object where a scope was expected`;
        const answer = HANDS[source](WEBHOOK_PAYLOAD, {});
        expectRefusal(answer, decideLoopScope(WEBHOOK_PAYLOAD).code, source, where);
        assert.equal(answer.received, "an object", `${where}: it says WHAT it was handed`);
        assert.equal("requestedScope" in answer, false, `${where}: and never echoes the value`);

        const keys = keysIn(answer);
        const strings = stringsIn(answer);
        const numbers = numbersIn(answer);
        for (const [key, value] of Object.entries(WEBHOOK_PAYLOAD)) {
          assert.equal(keys.includes(key), false, `${where}: ${key} is not carried`);
          for (const one of [].concat(value)) {
            if (typeof one === "string") assert.equal(strings.includes(one), false, `${where}: nor its ${JSON.stringify(one)}`);
            else if (typeof one === "number") assert.equal(numbers.includes(one), false, `${where}: nor its ${one}`);
          }
        }
      }

      // Every other kind is described the same way, and a string is still NAMED — what the answer
      // turns on is the kind of thing it was handed, not whether it liked it.
      assert.equal(resolveCronSignal(cronSignal([1, 2, 3])).received, "an array", "an array");
      assert.equal(resolveCronSignal(cronSignal(null)).received, "null", "null");
      assert.equal(resolveCronSignal(cronSignal(63)).received, "a number", "a number");
      assert.equal(resolveCronSignal(cronSignal("63/04")).requestedScope, "63/04", "a string is named, not described");
    },
  },

  {
    name: "63/04/04 a set never handed in, a set that cannot be read, and an EMPTY set are three different answers",
    run: () => {
      // The batch HANDLE is the seam this module's own header promised to hold everywhere: an
      // empty set is a caller that looked and found nothing, while an absent one is a caller whose
      // gather FAILED — and an unattended reader handed three empty lists reads "nothing to fire".
      const empty = resolveTriggerSignals([]);
      assert.deepEqual(
        { answers: [...empty.answers], resolved: [...empty.resolved], refused: [...empty.refused] },
        { answers: [], resolved: [], refused: [] },
        "an empty set is three empty lists",
      );

      for (const label of ["undefined", "null", "no argument at all"]) {
        const batch = label === "no argument at all"
          ? resolveTriggerSignals()
          : resolveTriggerSignals(label === "null" ? null : undefined);
        assert.equal(batch.resolved.length, 0, `${label}: nothing resolves`);
        assert.equal(batch.refused.length, 1, `${label}: a set nobody handed in is a REFUSAL, not silence`);
        assert.equal(batch.refused[0].code, TRIGGER_SIGNAL_NOT_SUPPLIED, `${label}: with the not-supplied code`);
        assert.equal(batch.refused[0].unresolved, "signals", `${label}: naming what was not supplied`);
        assert.notEqual(JSON.stringify(batch), JSON.stringify(empty), `${label}: and it is not the empty set's answer`);
      }

      // A handle that is not a set at all is a THIRD answer, and it REFUSES rather than throwing:
      // a batch must not be louder about a wrong type than about a missing one.
      for (const [label, handle] of [["a number", 42], ["a string", "63"], ["an object", { source: CRON }]]) {
        const batch = resolveTriggerSignals(handle);
        assert.equal(batch.refused.length, 1, `${label}: refused`);
        assert.equal(batch.refused[0].code, TRIGGER_SIGNAL_UNREADABLE, `${label}: as unreadable`);
        assert.equal(batch.refused[0].unresolved, "signals", `${label}: naming the handle it could not read`);
        assert.equal(batch.refused[0].received, label, `${label}: described by kind`);
      }

      // Each of those answers is one a caller that reads nothing else can branch on.
      for (const handle of [undefined, null, 42]) {
        const answer = resolveTriggerSignals(handle).refused[0];
        for (const [shape, check] of SILENT_SHAPES) {
          if (shape === "the signal's simple absence from the answer") continue;
          check(answer, "60-63", null);
        }
      }

      // A set that IS handed in still answers per signal, by any iterable, so the guard costs the
      // caller nothing.
      assert.equal(resolveTriggerSignals(new Set([cronSignal("63")])).resolved.length, 1, "a Set is a set of signals");
      assert.equal(resolveTriggerSignals([cronSignal("63"), ciSignal("7")]).resolved.length, 2, "and so is an array");
    },
  },

  {
    name: "63/04/04 the refusal vocabulary is exported, pinned to its wire spelling, and complete in both directions",
    run: () => {
      // THE WIRE SPELLING. These four codes are what an unattended caller branches on and what a
      // face will render; renaming one is a wire change, so they are pinned literally here — the
      // one place in this suite that spells them rather than importing them.
      assert.deepEqual([...TRIGGER_SIGNAL_REFUSALS], [
        "trigger-signal-not-supplied",
        "trigger-signal-unreadable",
        "trigger-signal-source-unknown",
        "trigger-signal-no-capture",
      ], "the four codes this module authors, by name and in order");
      assert.equal(TRIGGER_SIGNAL_NOT_SUPPLIED, "trigger-signal-not-supplied", "the not-supplied code");
      assert.equal(TRIGGER_SIGNAL_UNREADABLE, "trigger-signal-unreadable", "the unreadable code");
      assert.equal(TRIGGER_SIGNAL_SOURCE_UNKNOWN, "trigger-signal-source-unknown", "the unknown-source code");
      assert.equal(TRIGGER_SIGNAL_NO_CAPTURE, "trigger-signal-no-capture", "the no-capture code");

      // The vocabulary is COMPLETE IN BOTH DIRECTIONS against what the module can actually
      // produce: every code a refusal path emits is a member, and every member is reachable.
      const produced = new Set([
        ...UNANSWERABLE.map(([, resolve]) => resolve()),
        resolveCiSignal(ciSignal(WEBHOOK_PAYLOAD)),
        resolveFindingSignal({ source: FINDING, attribution: "63", captures: 7 }),
        resolveTriggerSignals(undefined).refused[0],
        resolveTriggerSignals(42).refused[0],
        resolveTriggerSignal(undefined),
      ].map((refusal) => refusal.code));

      const loopsOwn = decideLoopScope("63/04").code;
      assert.equal(produced.has(loopsOwn), true, "the loop's scope refusal is among the answers (else this is vacuous)");
      assert.deepEqual(
        [...produced].filter((code) => code !== loopsOwn).sort(),
        [...TRIGGER_SIGNAL_REFUSALS].sort(),
        "every code this module produces is a member of its vocabulary, and every member is produced",
      );
      assert.equal(TRIGGER_SIGNAL_REFUSALS.includes(loopsOwn), false,
        "and the loop's own code is NOT re-declared here: it is carried through, not authored");
    },
  },

  {
    name: "63/04/04 refusing and resolving-to-an-empty-stream are different answers, distinguishable without reading either as prose",
    run: () => {
      const empty = resolveCronSignal(cronSignal("999"));
      const unresolvable = resolveCronSignal(cronSignal("63/04"));

      expectResolution(empty, "999", CRON, "a well-formed driver no item bears");
      assert.equal(typeof unresolvable.code, "string", "the second is a refusal carrying a code");
      assert.equal(isResolvedSignal(empty), true, "the two are distinguishable without reading either as prose");
      assert.equal(isResolvedSignal(unresolvable), false, "…by structure alone");
      assert.equal("code" in empty, false, "a resolution carries no code");
      assert.equal("scope" in unresolvable, false, "a refusal carries no scope");
    },
  },

  {
    name: "63/04/04 a refusal says what failed, not merely that something did — two refusals from one source, differing in what they name",
    run: () => {
      const noScope = resolveCronSignal({ source: CRON, cadence: "periodic:1h" });
      const badScope = resolveCronSignal(cronSignal("63/04"));

      assert.notEqual(noScope.code, badScope.code, "the two refusals differ in what they name");
      assert.notEqual(noScope.reason, badScope.reason, "…and neither is satisfied by a single catch-all sentence");
      assert.equal(noScope.unresolved, "scope", "the first names that no scope was declared");
      assert.equal(badScope.requestedScope, "63/04", "the second names the scope it could not resolve");
      assert.equal(badScope.driver, "63", "…and the driver that item belongs to");

      // The same pair for the finding source, where the difference is the one this milestone has
      // produced four times: NOBODY LOOKED against NOTHING IS THERE.
      const neverLooked = resolveFindingSignal({ source: FINDING, attribution: "63" });
      const carriesNone = resolveFindingSignal({ source: FINDING, attribution: "63", captures: [] });
      assert.notEqual(neverLooked.code, carriesNone.code,
        "a caller that never read the record and an item that carries no capture are different answers");
      assert.equal(neverLooked.unresolved, "captures", "the first names the captures it was never handed");
      assert.equal(carriesNone.item, "63", "the second names the item that carries none");
    },
  },
];

export const triggerSourcesTests = [
  ...ONE_QUESTION,
  ...NEVER_CLASSIFIES,
  ...NOT_A_VERDICT,
  ...ONE_GRAMMAR,
  ...REFUSES_BY_NAME,
];
