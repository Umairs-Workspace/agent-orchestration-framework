// milestone 63 / story 00 — THE TRIGGER DECLARATION.
//
// Every @executable scenario and every Scenario-Outline row of the story's five task features,
// driven against the real compiler (`compileTriggerDeclaration`), the real loop loader
// (`loadLoops`) and the real install path (`initWork` / `updateWork`). Nothing here re-implements
// a rule it asserts:
//
//   00_the-declaration-is-data-with-one-compiler   — one compiler, HANDED its declaration; the
//        closed SOURCE axis and its near-misses; absence is not the sentinel.
//   01_a-member-that-does-not-compile-refuses-the-whole-set — the refusal is of the WHOLE set,
//        wherever the bad member sits; twenty enumerated faults; the declaration's own refusals.
//   02_the-cadence-is-imported-never-copied        — the same string asked of a LOOP RECORD and
//        of a trigger member, boundary for boundary, with the two answers deep-equal.
//   03_a-trigger-faster-than-the-loop-it-wakes-is-a-contradiction — the comparison on OPERANDS,
//        and the three answers (compared / not compared / in contradiction) kept distinct.
//   04_the-shipped-declaration-is-the-one-aof-installs — byte-identity over BYTES, the
//        drift-protected states, and the file aof ships being the file the compiler reads.
//
// The cadence table in task 02 is asked of a REAL loop record for every string a record can
// author, because a copy of the grammar and an import of it are indistinguishable on
// `periodic:1h` — the boundaries are the only place the two differ, and comparing the trigger's
// answer against a literal here would compare a copy with a copy.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, readFile, writeFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TRIGGER_DECLARATION_RELPATH,
  TRIGGER_PAIRING_REASONS,
  TRIGGER_PAIRING_STATES,
  TRIGGER_SOURCES,
  TriggerDeclarationError,
  bundledTriggerDeclaration,
  compileTriggerDeclaration,
  readTriggerDeclaration,
  triggerDeclarationPath,
} from "../../src/work-trigger/declaration.mjs";
import { loadLoops } from "../../src/work/loops.mjs";
import { initWork } from "../../src/work/init.mjs";
import { updateWork } from "../../src/work/update.mjs";
import { makeLoopRegistry, loopRecord } from "../support/loop-registry-fixture.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BUNDLED_SOURCE = path.join(REPO_ROOT, "src", "bundle", "triggers.jsonc");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function scratch(body, prefix = "aof-63-00-") {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ─── declaration builders ──────────────────────────────────────────────────────────────
// Every fixture is authored as the DATA a reviewer would read in the file, so a case reads like
// the row it mechanises and no builder can quietly become the thing under test.

const member = (overrides = {}) => ({
  id: "t-0",
  protects: "the driver from stalling unattended",
  source: "cron",
  scope: "63",
  level: "L1",
  ...overrides,
});

const declaration = (members, extra = {}) => ({ version: 1, members, ...extra });

const without = (object, key) => {
  const copy = { ...object };
  delete copy[key];
  return copy;
};

const goodMembers = (count, from = 0) => Array.from({ length: count }, (unused, index) => member({
  id: `good-${from + index}`,
  protects: `what good-${from + index} is for`,
}));

// Compile and hand back the refusal, asserting that NOTHING was handed back in its place. The
// sentinel is what makes "no partially-compiled set is ever returned" an observation rather than
// an assumption: a compiler that returned a partial answer AND threw would fail here.
function refusalFrom(decl, options = undefined, note = "") {
  let handedBack = "NOTHING-WAS-RETURNED";
  let error = null;
  try {
    handedBack = compileTriggerDeclaration(decl, options);
  } catch (caught) {
    error = caught;
  }
  assert.ok(error instanceof TriggerDeclarationError, `${note}: the compile is refused${error ? ` (got ${error})` : " — it returned instead"}`);
  assert.equal(handedBack, "NOTHING-WAS-RETURNED", `${note}: no compiled set is handed back`);
  assert.equal(typeof error.code, "string", `${note}: the refusal carries a code`);
  assert.ok(error.code.length > 0, `${note}: the code is not empty`);
  return error;
}

const idsOf = (answer) => answer.triggers.map((trigger) => trigger.id);
const pairingFor = (answer, id) => answer.pairings.filter((entry) => entry.triggerId === id);

// ─── task 00 · the declaration is data with one compiler ───────────────────────────────

const DECLARATION_IS_DATA = [
  {
    name: "63/00/00 the declaration is data a reviewer reads, and every compiled trigger traces to its member",
    run: async () => {
      // The declaration this repository itself runs, read from the working tree — not a fixture.
      const declared = await readTriggerDeclaration(REPO_ROOT);
      assert.ok(Array.isArray(declared.members) && declared.members.length > 0, "the declaration carries members");
      for (const [index, entry] of declared.members.entries()) {
        for (const key of ["id", "protects", "source", "scope", "level"]) {
          assert.equal(typeof entry[key], "string", `member #${index} names ${key}`);
          assert.ok(entry[key].length > 0, `member #${index}'s ${key} is not empty`);
        }
      }

      const answer = compileTriggerDeclaration(declared);
      const declaredIds = declared.members.map((entry) => entry.id);
      assert.deepEqual(idsOf(answer), declaredIds, "every compiled trigger names the member that declared it");
      assert.deepEqual([...answer.accepted], declaredIds, "…and the accepted ids are those members");
      for (const entry of declared.members) {
        const compiled = answer.triggers.find((trigger) => trigger.id === entry.id);
        assert.ok(compiled != null, `${entry.id} compiled`);
        assert.equal(compiled.scope, entry.scope, `${entry.id} carries its member's scope`);
        assert.equal(compiled.level, entry.level, `${entry.id} carries its member's level`);
        assert.equal(compiled.source, entry.source, `${entry.id} carries its member's source`);
        assert.equal(compiled.protects, entry.protects, `${entry.id} carries what its member protects`);
      }
      // The other direction, which is the one a compiler that invented a default would fail.
      for (const trigger of answer.triggers) {
        assert.ok(declaredIds.includes(trigger.id), `no compiled trigger exists that no member declared: ${trigger.id}`);
      }
    },
  },

  {
    name: "63/00/00 the compiler is handed its declaration and reads nothing to answer",
    run: async () => scratch(async (dir) => {
      const decl = declaration([member({ id: "nowhere-on-disk" })]);
      const first = compileTriggerDeclaration(decl);
      assert.deepEqual(idsOf(first), ["nowhere-on-disk"], "a declaration that exists nowhere on disk compiles");

      // A DECOY: a different declaration installed at the path a loader would reach for. An
      // implementation that read the installed file when asked to compile answers differently
      // here, and passes every scenario written against the shipped declaration.
      await mkdir(path.join(dir, ".aof"), { recursive: true });
      await writeFile(
        triggerDeclarationPath(dir),
        `${JSON.stringify(declaration([member({ id: "the-decoy" })]), null, 2)}\n`,
        "utf8",
      );
      const previousCwd = process.cwd();
      try {
        process.chdir(dir);
        const beside = compileTriggerDeclaration(decl);
        assert.deepEqual(beside, first, "nothing about the answer depends on what is installed in the workspace");
      } finally {
        process.chdir(previousCwd);
      }

      const second = compileTriggerDeclaration(decl);
      assert.deepEqual(second, first, "the second answer equals the first");
    }),
  },

  {
    name: "63/00/00 the answer is one whole object, or one refusal, and never both",
    run: () => {
      const answer = compileTriggerDeclaration(declaration(goodMembers(3)));
      assert.deepEqual(idsOf(answer), ["good-0", "good-1", "good-2"], "the answer carries the compiled triggers");
      assert.deepEqual([...answer.accepted], ["good-0", "good-1", "good-2"], "…and the ids it accepted");

      assert.ok(Object.isFrozen(answer), "the answer cannot be mutated after it is handed back");
      assert.ok(Object.isFrozen(answer.triggers), "…nor its trigger list");
      for (const trigger of answer.triggers) assert.ok(Object.isFrozen(trigger), `…nor ${trigger.id}`);
      assert.throws(() => { answer.triggers.push({ id: "smuggled" }); }, "a trigger cannot be appended after the fact");
      assert.throws(() => { answer.triggers[0].level = "L3"; }, "a compiled level cannot be raised after the fact");

      // "No member is applied while another is still being validated": the whole set is refused
      // for a member in the LAST position, where an in-order validator has already built four.
      const late = refusalFrom(
        declaration([...goodMembers(4), member({ id: "bad", source: "webhook" })]),
        undefined,
        "a bad member in the last position",
      );
      assert.equal(late.memberId, "bad");
    },
  },

  {
    name: "63/00/00 a member that declares no cadence carries none, and that is not the sentinel",
    run: () => {
      const answer = compileTriggerDeclaration(declaration([
        without(member({ id: "silent" }), "cadence"),
        member({ id: "sentinel", cadence: "unknown" }),
      ]));
      const [silent, sentinel] = answer.triggers;
      assert.equal(Object.hasOwn(silent, "cadence"), false, "the first compiled trigger carries no cadence at all");
      assert.deepEqual(sentinel.cadence, { key: "cadence", raw: "unknown", kind: "unknown" }, "the second carries the sentinel");
      assert.notDeepEqual(silent, sentinel, "the two are distinguishable from each other in the answer");
      assert.notEqual(
        Object.hasOwn(silent, "cadence"),
        Object.hasOwn(sentinel, "cadence"),
        "…and the distinction is absence against a value, not two spellings of one thing",
      );
    },
  },

  // Scenario Outline: the sources a member may name, and the near-misses that are not among them.
  ...[
    ["the source a cron cadence declares", TRIGGER_SOURCES[0], "accepted"],
    ["the source a mesh work-assignment declares", TRIGGER_SOURCES[1], "accepted"],
    ["the source a PR or CI signal declares", TRIGGER_SOURCES[2], "accepted"],
    ["the source an inbound feedback finding declares", TRIGGER_SOURCES[3], "accepted"],
    ["a fifth source no member has ever declared", "webhook", "refused"],
    ['"per-item", an event trigger from the loop registry', "per-item", "refused"],
    ['"per-milestone", likewise', "per-milestone", "refused"],
    ['"periodic:1h", a cadence in the source field', "periodic:1h", "refused"],
    ["a real source differing only in its case", "Cron", "refused"],
    ["a real source with surrounding whitespace", " cron ", "refused"],
    ["the empty string", "", "refused"],
    ["a source that is not a string", 42, "refused"],
  ].map(([label, source, outcome]) => ({
    name: `63/00/00 a member naming ${label} as its source is ${outcome}`,
    run: () => {
      const decl = declaration([member({ id: "subject", source })]);
      if (outcome === "accepted") {
        const answer = compileTriggerDeclaration(decl);
        assert.equal(answer.triggers[0].source, source, "the compiled trigger carries the source its member declared");
        return;
      }
      const error = refusalFrom(decl, undefined, label);
      assert.equal(error.memberId, "subject", "the refusal names the member that declared it");
      // Never read as its neighbour: nothing was trimmed, folded or coerced into a real source.
      assert.equal(TRIGGER_SOURCES.includes(source), false, "the near-miss is genuinely not a member of the axis");
    },
  })),

  {
    name: "63/00/00 the refusal for an unknown source names the member and lists the sources that exist",
    run: () => {
      const error = refusalFrom(
        declaration([...goodMembers(1), member({ id: "wrong-axis", source: "webhook" })]),
        undefined,
        "an unknown source",
      );
      assert.equal(error.code, "trigger-source-unknown", "it is refused with a code");
      assert.equal(error.memberId, "wrong-axis", "the refusal names the member that declared it");
      for (const source of TRIGGER_SOURCES) {
        assert.ok(error.message.includes(source), `the message lists ${source}`);
      }
      assert.deepEqual(error.sources, [...TRIGGER_SOURCES], "the listed sources come from the axis itself");
      // …and they are the ones a member may ACTUALLY name, decided by compiling each rather than
      // by comparing one list of strings against another list of strings.
      for (const source of error.sources) {
        const answer = compileTriggerDeclaration(declaration([member({ id: `names-${source}`, source })]));
        assert.equal(answer.triggers[0].source, source, `a member naming "${source}" compiles`);
      }
    },
  },

  {
    name: "63/00/00 the source field and the cadence field are checked against different vocabularies",
    run: () => {
      const first = member({ id: "right-axis", source: TRIGGER_SOURCES[0], cadence: "event:per-item" });
      const second = member({ id: "wrong-axis", source: "per-item", cadence: "event:per-item" });

      const error = refusalFrom(declaration([first, second]), undefined, "an ordinal in the source field");
      assert.equal(error.memberId, "wrong-axis", "the refusal names the second member");
      assert.equal(error.code, "trigger-source-unknown", "the refusal is about the source it named");
      assert.equal(error.source, "per-item", "…naming the value it found in the SOURCE field");
      // Not about its cadence — asserted over what the refusal CARRIES rather than over its
      // prose, because one of the four sources is itself spelled `cadence` and a substring
      // search would call this refusal a cadence refusal for the wrong reason.
      assert.equal(Object.hasOwn(error, "cadence"), false, "…and carries no cadence detail at all");
      const sameCadenceRightSource = compileTriggerDeclaration(declaration([member({ id: "wrong-axis", source: TRIGGER_SOURCES[1], cadence: "event:per-item" })]));
      assert.equal(sameCadenceRightSource.triggers[0].cadence.raw, "event:per-item", "…and that very cadence compiles once the source is a source");

      const answer = compileTriggerDeclaration(declaration([first]));
      assert.deepEqual(idsOf(answer), ["right-axis"], "the same declaration without the second member compiles");
      assert.equal(answer.triggers[0].cadence.raw, "event:per-item", "…and `event:per-item` is a perfectly good CADENCE");
    },
  },
];

// ─── task 01 · one bad member refuses the whole set ────────────────────────────────────

// Each fault is one line of the validator and each one is individually skippable, so each is
// driven on its own rather than described. `locate` says how the refusal must find the member:
// by its id, or — when there is no id to name it by — by its position.
const MEMBER_FAULTS = [
  ["declares no id", without(member(), "id"), "position"],
  ["declares an id an earlier member declared", member({ id: "good-0" }), "duplicate"],
  ["declares an id that is not a string", member({ id: 7 }), "position"],
  ["is null", null, "position"],
  ["is a string rather than an object", "not-a-member", "position"],
  ["is an array rather than an object", [], "position"],
  ["declares no source", without(member({ id: "bad" }), "source"), "id"],
  ["names a source that does not exist", member({ id: "bad", source: "webhook" }), "id+sources"],
  ["declares no scope", without(member({ id: "bad" }), "scope"), "id"],
  ['declares the scope "63/01", a story ref', member({ id: "bad", scope: "63/01" }), "id+scope"],
  ['declares the scope "63-", a range with no end', member({ id: "bad", scope: "63-" }), "id+scope"],
  ["declares a scope that is not a string", member({ id: "bad", scope: 63 }), "id"],
  ["declares no level", without(member({ id: "bad" }), "level"), "id"],
  ['declares the level "L4"', member({ id: "bad", level: "L4" }), "id+levels"],
  ['declares the level "l3", in the wrong case', member({ id: "bad", level: "l3" }), "id+levels"],
  ['declares the cadence "periodic:0s"', member({ id: "bad", cadence: "periodic:0s" }), "id+cadence"],
  ['declares the cadence "event:per-sprint"', member({ id: "bad", cadence: "event:per-sprint" }), "id+cadence"],
  ["declares no statement of what it protects", without(member({ id: "bad" }), "protects"), "id"],
  ["declares an empty statement of what it protects", member({ id: "bad", protects: "   " }), "id"],
];

const MALFORMED_DECLARATIONS = [
  ["is not an object", "a string"],
  ["is an array", [member()]],
  ["is null", null],
  ["declares no member list", { version: 1 }],
  ["declares a member list that is not a list", { version: 1, members: { first: member() } }],
];

const REFUSES_THE_WHOLE_SET = [
  {
    name: "63/00/01 one bad member among good ones refuses the whole compile, and nothing is armed",
    run: () => {
      const good = goodMembers(4);
      const bad = member({ id: "bad", level: "L4" });
      const error = refusalFrom(declaration([good[0], good[1], bad, good[2], good[3]]), undefined, "one bad among five");
      assert.equal(error.memberId, "bad", "the refusal names the member that did not compile");

      // Nothing is armed, installed or reported as accepted — there is no answer at all in which
      // any of the four could appear, which is the only shape in which that claim is true.
      assert.equal(Object.hasOwn(error, "accepted"), false, "the refusal carries no accepted list");
      assert.equal(Object.hasOwn(error, "triggers"), false, "…and no compiled triggers");

      const answer = compileTriggerDeclaration(declaration(good));
      assert.deepEqual(idsOf(answer), ["good-0", "good-1", "good-2", "good-3"], "the four remaining members compile");
      for (const declared of good) {
        const compiled = answer.triggers.find((trigger) => trigger.id === declared.id);
        assert.equal(compiled.protects, declared.protects, `${declared.id} is unchanged from what it declares`);
        assert.equal(compiled.scope, declared.scope);
        assert.equal(compiled.level, declared.level);
        assert.equal(compiled.source, declared.source);
      }
    },
  },

  // Scenario Outline: where the bad member sits does not change the answer.
  ...[["the first of five", 0], ["the third of five", 2], ["the last of five", 4]].map(([label, position]) => ({
    name: `63/00/01 the bad member is ${label} — the answer is the same refusal`,
    run: () => {
      const members = goodMembers(5);
      members[position] = member({ id: "bad", source: "webhook" });
      const error = refusalFrom(declaration(members), undefined, label);
      assert.equal(error.memberId, "bad", "a code naming that member");
      // No member declared before it is armed: there is no answer, and a compile of exactly the
      // members that precede it is the only place any of them exists.
      const preceding = members.slice(0, position);
      if (preceding.length > 0) {
        const alone = compileTriggerDeclaration(declaration(preceding));
        assert.deepEqual(idsOf(alone), preceding.map((entry) => entry.id), "…they compile only when asked without it");
      }
    },
  })),

  // Scenario Outline: the ways a member fails to compile.
  ...MEMBER_FAULTS.map(([fault, bad, locate]) => ({
    name: `63/00/01 a member that ${fault} refuses the set`,
    run: () => {
      // The bad member sits THIRD, among good ones, so every case is also a case of the rule above.
      const members = [...goodMembers(2), bad, ...goodMembers(2, 2)];
      const error = refusalFrom(declaration(members), undefined, fault);

      if (locate === "position") {
        assert.equal(error.memberId, "#2", "the refusal locates the member by its position in the set");
        assert.equal(error.index, 2, "…and carries that position");
      } else if (locate === "duplicate") {
        assert.equal(error.duplicateId, "good-0", "the refusal names the id that was declared twice");
        assert.ok(error.message.includes("good-0"), "…in its message");
      } else {
        assert.equal(error.memberId, "bad", "the refusal names the member");
      }

      if (locate === "id+sources") {
        for (const source of TRIGGER_SOURCES) assert.ok(error.message.includes(source), `…and lists ${source}`);
      }
      if (locate === "id+scope") {
        assert.equal(error.scope, bad.scope, "…and the scope it declared");
        assert.ok(error.message.includes(bad.scope), "…in its message");
      }
      if (locate === "id+levels") {
        assert.equal(error.level, bad.level, "…and the level it declared");
        for (const level of ["L1", "L2", "L3"]) assert.ok(error.message.includes(level), `…and lists ${level}`);
        assert.equal(error.level === "L3", false, "a level in the wrong case is never read as its neighbour");
      }
      if (locate === "id+cadence") {
        assert.equal(error.cadence, bad.cadence, "…and the cadence it declared");
        assert.ok(error.message.includes(bad.cadence), "…in its message");
      }
    },
  })),

  {
    name: "63/00/01 the scopes that do compile, so the refusals above refuse something narrower than everything",
    run: () => {
      const answer = compileTriggerDeclaration(declaration([
        member({ id: "one-driver", scope: "63" }),
        member({ id: "a-range", scope: "60-63" }),
      ]));
      assert.deepEqual(idsOf(answer), ["one-driver", "a-range"], "both compile");
      assert.equal(answer.triggers[0].scope, "63", "each compiled trigger carries the scope its member declared, unaltered");
      assert.equal(answer.triggers[1].scope, "60-63");
    },
  },

  {
    name: "63/00/01 the answer to a bad member is a refusal, never a warning beside a partial answer",
    run: () => {
      const warnings = [];
      const emitWarning = process.emitWarning;
      const consoleWarn = console.warn;
      const consoleError = console.error;
      process.emitWarning = (...args) => warnings.push(["emitWarning", ...args]);
      console.warn = (...args) => warnings.push(["console.warn", ...args]);
      console.error = (...args) => warnings.push(["console.error", ...args]);
      try {
        refusalFrom(declaration([...goodMembers(2), member({ id: "bad", cadence: "periodic:1w" })]), undefined, "a bad cadence");
      } finally {
        process.emitWarning = emitWarning;
        console.warn = consoleWarn;
        console.error = consoleError;
      }
      assert.deepEqual(warnings, [], "nothing is reported on any warning channel in place of the refusal");

      // …and the shape of a SUCCESSFUL answer carries no room for one either.
      const answer = compileTriggerDeclaration(declaration(goodMembers(2)));
      const keys = Object.keys(answer).map((key) => key.toLowerCase());
      for (const forbidden of ["skipped", "dropped", "ignored", "warnings", "count", "compiledcount", "total"]) {
        assert.equal(keys.includes(forbidden), false, `the answer carries no \`${forbidden}\``);
      }
    },
  },

  {
    name: "63/00/01 two bad members are still one refusal, and still nothing compiles",
    run: () => {
      const members = goodMembers(5);
      members[1] = member({ id: "bad-early", source: "webhook" });
      members[4] = member({ id: "bad-late", level: "L4" });
      const error = refusalFrom(declaration(members), undefined, "two bad members");
      assert.ok(["bad-early", "bad-late"].includes(error.memberId), "the refusal names a member that did not compile");
      assert.equal(/\b2\b|two|both/i.test(error.message), false, "…rather than reporting a total");
    },
  },

  // Scenario Outline: a malformed declaration is refused differently from a malformed member.
  ...MALFORMED_DECLARATIONS.map(([shape, decl]) => ({
    name: `63/00/01 a declaration that ${shape} is refused before any member is reached`,
    run: () => {
      const error = refusalFrom(decl, undefined, shape);
      assert.equal(error.memberId, null, "it is refused with a code that names no member");
      assert.equal(error.code, "trigger-declaration-invalid");

      const memberCodes = new Set(MEMBER_FAULTS.map(([, bad]) => refusalFrom(
        declaration([...goodMembers(2), bad, ...goodMembers(2, 2)]),
        undefined,
        "member-fault census",
      ).code));
      assert.equal(memberCodes.has(error.code), false, "and that code is not the one a bad member raises");
    },
  })),

  {
    name: "63/00/01 a declaration with no members compiles to an empty set rather than refusing",
    run: () => {
      const answer = compileTriggerDeclaration(declaration([]));
      assert.deepEqual(idsOf(answer), [], "the answer holds no triggers");
      assert.ok(Array.isArray(answer.triggers), "the answer is an empty set rather than an absent one");
      assert.deepEqual([...answer.accepted], []);
      assert.deepEqual([...answer.pairings], []);
      assert.notEqual(answer.triggers, null);
      assert.notEqual(answer.triggers, undefined);
    },
  },
];

// ─── task 02 · the cadence is imported, never copied ───────────────────────────────────

// Every row is a cadence string a loop record CAN author, so both readers can be asked the same
// question. `expected` pins what the answer must be, so the deep-equality below is two readers
// agreeing on a known answer rather than two readers agreeing on the same mistake.
const CADENCE_ROWS = [
  ["periodic:1ms", { key: "cadence", raw: "periodic:1ms", kind: "periodic", ms: 1 }],
  ["periodic:250ms", { key: "cadence", raw: "periodic:250ms", kind: "periodic", ms: 250 }],
  ["periodic:30s", { key: "cadence", raw: "periodic:30s", kind: "periodic", ms: 30_000 }],
  ["periodic:15m", { key: "cadence", raw: "periodic:15m", kind: "periodic", ms: 900_000 }],
  ["periodic:1h", { key: "cadence", raw: "periodic:1h", kind: "periodic", ms: 3_600_000 }],
  ["periodic:7d", { key: "cadence", raw: "periodic:7d", kind: "periodic", ms: 604_800_000 }],
  ["periodic:01h", { key: "cadence", raw: "periodic:01h", kind: "periodic", ms: 3_600_000 }],
  ["periodic:0s", null],
  ["periodic:0ms", null],
  ["periodic:1.5h", null],
  ["periodic:-1h", null],
  ["periodic:1w", null],
  ["periodic:1H", null],
  ["periodic:h", null],
  ["periodic:1 h", null],
  ["periodic:", null],
  ["periodic:99999999999999999d", null],
  ["event:per-run-start", { key: "cadence", raw: "event:per-run-start", kind: "event", trigger: "per-run-start", scopeRank: 0 }],
  ["event:per-phase", { key: "cadence", raw: "event:per-phase", kind: "event", trigger: "per-phase", scopeRank: 0 }],
  ["event:per-item", { key: "cadence", raw: "event:per-item", kind: "event", trigger: "per-item", scopeRank: 1 }],
  ["event:per-milestone", { key: "cadence", raw: "event:per-milestone", kind: "event", trigger: "per-milestone", scopeRank: 2 }],
  ["event:per-sprint", null],
  ["event:", null],
  ["event:per-item extra", null],
  ["event:Per-Item", null],
  ["unknown", { key: "cadence", raw: "unknown", kind: "unknown" }],
  ["Unknown", null],
  ["none", null],
  ["uncapped", null],
  ["", null],
];

const rowStem = (index) => `row-${String(index).padStart(2, "0")}`;

// ONE registry, one load: every row is a record beside the others, so no case can pass because
// it was the only record in its directory.
let cadenceRegistry = null;
async function loadCadenceRegistry() {
  if (cadenceRegistry != null) return cadenceRegistry;
  const files = {};
  for (const [index, [raw]] of CADENCE_ROWS.entries()) {
    files[`${rowStem(index)}.md`] = loopRecord({ fields: { cadence: raw } });
  }
  const fixture = await makeLoopRegistry(files);
  const loaded = await loadLoops(fixture.workDir);
  await fixture.cleanup();
  cadenceRegistry = new Map(loaded.nodes.map((node) => [node.id, node]));
  cadenceRegistry.set("__findings__", loaded.findings);
  return cadenceRegistry;
}

const CADENCE_IS_IMPORTED = [
  ...CADENCE_ROWS.map(([raw, expected], index) => ({
    name: `63/00/02 the cadence "${raw === "" ? "<empty>" : raw}", asked of a loop record and of a trigger member`,
    run: async () => {
      const registry = await loadCadenceRegistry();
      const node = registry.get(`loop:${rowStem(index)}`);
      assert.ok(node != null, "the loop record loaded");
      const loopAnswer = node.fields.cadence ?? null;

      let triggerAnswer = null;
      let refusal = null;
      try {
        const answer = compileTriggerDeclaration(declaration([member({ id: "subject", cadence: raw })]));
        triggerAnswer = answer.triggers[0].cadence ?? null;
      } catch (error) {
        refusal = error;
      }

      if (expected === null) {
        assert.equal(loopAnswer, null, "the loop record does not admit it");
        assert.ok(refusal instanceof TriggerDeclarationError, "…and the trigger member is refused");
        assert.equal(refusal.code, "trigger-cadence-invalid", "…with a code");
        const findings = registry.get("__findings__");
        assert.ok(
          findings.some((finding) => finding.path.endsWith(`${rowStem(index)}.md`) && /cadence/i.test(finding.message)),
          "…and the loop record carries a finding for the same string",
        );
        return;
      }

      assert.equal(refusal, null, `the trigger member compiles${refusal ? ` (got ${refusal.message})` : ""}`);
      assert.deepEqual(loopAnswer, expected, "what the loop record answers");
      assert.deepEqual(triggerAnswer, expected, "what the trigger member answers");
      // The two answers agree on the kind, on the operand, AND on their key sets — neither
      // answer carries anything the other does not.
      assert.deepEqual(triggerAnswer, loopAnswer, "the two answers are the same answer");
      assert.deepEqual(Object.keys(triggerAnswer).sort(), Object.keys(loopAnswer).sort(), "…key for key");
    },
  })),

  {
    name: "63/00/02 a cadence that is not a string is refused, as the loop registry's own grammar refuses it",
    run: () => {
      // A record's frontmatter line can only ever BE a string, so the non-string case is asked of
      // the grammar itself — which, since `cadenceField` now delegates to it, IS the loop
      // record's reader rather than a second one standing in for it.
      const error = refusalFrom(declaration([member({ id: "subject", cadence: 3_600_000 })]), undefined, "a non-string cadence");
      assert.equal(error.code, "trigger-cadence-invalid");
    },
  },

  {
    name: "63/00/02 each kind carries the operand a comparison is handed, and nothing is converted between them",
    run: () => {
      const answer = compileTriggerDeclaration(declaration([
        member({ id: "a-duration", cadence: "periodic:1h" }),
        member({ id: "an-ordinal", cadence: "event:per-milestone" }),
        member({ id: "the-sentinel", cadence: "unknown" }),
      ]));
      const [duration, ordinal, sentinel] = answer.triggers.map((trigger) => trigger.cadence);

      assert.equal(duration.ms, 3_600_000, "the duration carries its length in milliseconds");
      assert.equal(Object.hasOwn(duration, "scopeRank"), false, "…and no rank");
      assert.equal(ordinal.scopeRank, 2, "the ordinal carries its rank");
      assert.equal(Object.hasOwn(ordinal, "ms"), false, "…and no length in milliseconds");
      assert.equal(Object.hasOwn(sentinel, "ms"), false, "the sentinel carries neither");
      assert.equal(Object.hasOwn(sentinel, "scopeRank"), false);

      for (const parsed of [duration, ordinal, sentinel]) {
        const derived = Object.entries(parsed).filter(([key]) => key === "ms" || key === "scopeRank");
        assert.ok(derived.length <= 1, "no answer carries a duration derived from an ordinal, or a rank derived from a duration");
      }
    },
  },

  {
    name: "63/00/02 a cadence the loop registry refuses is refused for a trigger, under every spelling",
    run: async () => {
      const registry = await loadCadenceRegistry();
      for (const [index, [raw, expected]] of CADENCE_ROWS.entries()) {
        if (expected !== null) continue;
        assert.equal(registry.get(`loop:${rowStem(index)}`).fields.cadence ?? null, null, `the registry does not admit "${raw}"`);
        const error = refusalFrom(declaration([member({ id: "subject", cadence: raw })]), undefined, `refused cadence "${raw}"`);
        assert.equal(error.code, "trigger-cadence-invalid", "the compile is refused");
        assert.equal(error.cadence, raw, "the trigger does not admit it under a spelling of its own");
      }
    },
  },

  {
    name: "63/00/02 the loop registry's own answers are unchanged by there being a second reader",
    run: async () => {
      const before = await loadLoops(path.join(REPO_ROOT, ".aof"));
      const declared = before.nodes.filter((node) => node.fields.cadence != null);
      assert.ok(declared.length > 0, "the shipped registry declares cadences to be unchanged");
      for (const node of declared) {
        assert.ok(["periodic", "event", "unknown"].includes(node.fields.cadence.kind), `${node.id} reads as the registry already reports it`);
        assert.equal(node.fields.cadence.key, "cadence");
      }
      const cadenceFindings = before.findings.filter((finding) => /Invalid value for cadence/.test(finding.message));
      assert.deepEqual(cadenceFindings, [], "no record gains a cadence finding it did not have");

      // …and this holds whether or not a trigger declaration has been compiled in the same run.
      compileTriggerDeclaration(bundledTriggerDeclaration());
      const after = await loadLoops(path.join(REPO_ROOT, ".aof"));
      assert.deepEqual(after.findings, before.findings, "the loader's findings are identical after a compile");
      assert.deepEqual(
        after.nodes.map((node) => [node.id, node.fields.cadence ?? null]),
        before.nodes.map((node) => [node.id, node.fields.cadence ?? null]),
        "…and so is every declared cadence",
      );
    },
  },
];

// ─── task 03 · a trigger faster than the loop it wakes ─────────────────────────────────

const LOOP_ID = "loop:the-one-it-wakes";
const registryOf = (cadence) => [cadence === null ? { id: LOOP_ID } : { id: LOOP_ID, cadence }];

function compileAgainst(triggerCadence, loopCadence, overrides = {}) {
  return compileTriggerDeclaration(
    declaration([member({ id: "subject", wakes: LOOP_ID, ...(triggerCadence === null ? {} : { cadence: triggerCadence }), ...overrides })]),
    { loops: registryOf(loopCadence) },
  );
}

const CONTRADICTION_ROWS = [
  ["periodic:5m", "periodic:1h", "contradiction"],
  ["periodic:1h", "periodic:5m", "compared"],
  ["periodic:1h", "periodic:1h", "compared"],
  ["periodic:60m", "periodic:1h", "compared"],
  ["periodic:59m", "periodic:1h", "contradiction"],
  ["periodic:3599999ms", "periodic:1h", "contradiction"],
  ["periodic:3600000ms", "periodic:1h", "compared"],
  ["periodic:3600001ms", "periodic:1h", "compared"],
  ["periodic:1ms", "periodic:7d", "contradiction"],
  ["event:per-item", "event:per-milestone", "contradiction"],
  ["event:per-milestone", "event:per-item", "compared"],
  ["event:per-item", "event:per-item", "compared"],
  ["event:per-run-start", "event:per-phase", "compared"],
  ["event:per-phase", "event:per-run-start", "compared"],
  ["event:per-run-start", "event:per-milestone", "contradiction"],
  ["event:per-phase", "event:per-item", "contradiction"],
  ["periodic:5m", "event:per-milestone", "not-comparable"],
  ["event:per-item", "periodic:5m", "not-comparable"],
  ["unknown", "periodic:5m", "not-comparable"],
  ["periodic:5m", "unknown", "not-comparable"],
  ["unknown", "unknown", "not-comparable"],
];

const FASTER_THAN_THE_LOOP = [
  ...CONTRADICTION_ROWS.map(([trigger, loop, verdict]) => ({
    name: `63/00/03 a trigger at ${trigger} against a loop at ${loop} — ${verdict}`,
    run: () => {
      const answer = compileAgainst(trigger, loop);
      const [pairing] = pairingFor(answer, "subject");
      assert.ok(pairing != null, "the pair is in the answer");

      if (verdict === "contradiction") {
        assert.equal(pairing.state, "contradiction", "reports a contradiction");
        assert.deepEqual(answer.contradictions.map((entry) => entry.triggerId), ["subject"], "…naming the trigger");
        assert.equal(pairing.faster, "trigger");
        return;
      }
      assert.deepEqual([...answer.contradictions], [], "reports no contradiction");
      if (verdict === "not-comparable") {
        assert.equal(pairing.state, "not-compared", "reports the pair as not comparable");
        assert.equal(pairing.reason, "not-comparable", "…and says so, rather than saying they agreed");
      } else {
        assert.equal(pairing.state, "compared", "the pair was compared");
        assert.notEqual(pairing.faster, "trigger", "…and the trigger is not the faster of the two");
      }
    },
  })),

  {
    name: "63/00/03 not comparable and not in contradiction are two different answers",
    run: () => {
      const answer = compileTriggerDeclaration(
        declaration([
          member({ id: "agrees", wakes: "loop:a", cadence: "periodic:1h" }),
          member({ id: "incomparable", wakes: "loop:b", cadence: "event:per-item" }),
        ]),
        { loops: [{ id: "loop:a", cadence: "periodic:1h" }, { id: "loop:b", cadence: "periodic:5m" }] },
      );
      const [agrees] = pairingFor(answer, "agrees");
      const [incomparable] = pairingFor(answer, "incomparable");
      assert.equal(agrees.state, "compared", "the first pair is reported as compared and in agreement");
      assert.equal(agrees.faster, "neither", "…in agreement meaning neither is the faster, which is not a contradiction");
      assert.equal(incomparable.state, "not-compared", "the second is reported as not comparable");
      assert.notEqual(agrees.state, incomparable.state, "the two are distinguishable without reading either cadence again");
      assert.deepEqual([...answer.contradictions], []);
    },
  },

  {
    name: "63/00/03 the contradiction says which trigger, which loop, both cadences, and which is faster",
    run: () => {
      const answer = compileAgainst("periodic:5m", "periodic:1h");
      assert.equal(answer.contradictions.length, 1);
      const [found] = answer.contradictions;
      assert.equal(found.triggerId, "subject", "it names the trigger by its id");
      assert.equal(found.loop, LOOP_ID, "it names the loop it points at");
      assert.equal(found.triggerCadence, "periodic:5m", "it states both cadences as they were declared");
      assert.equal(found.loopCadence, "periodic:1h");
      assert.equal(found.faster, "trigger", "it says which of the two is the faster");
    },
  },

  {
    name: "63/00/03 a contradictory declaration never reads as a clean one",
    run: () => {
      const loops = [{ id: LOOP_ID, cadence: "periodic:1h" }];
      const clean = goodMembers(3).map((entry) => ({ ...entry, wakes: LOOP_ID, cadence: "periodic:2h" }));
      const contradictory = member({ id: "too-fast", wakes: LOOP_ID, cadence: "periodic:5m" });

      const withIt = compileTriggerDeclaration(declaration([...clean, contradictory]), { loops });
      const without_ = compileTriggerDeclaration(declaration(clean), { loops });
      assert.notDeepEqual(withIt, without_, "its answer differs from the answer for the same declaration with the trigger removed");

      // The difference is THE CONTRADICTION, not a missing trigger: the same four members, with
      // only the contradictory one's cadence made to agree, still differ — and differ in exactly
      // the contradiction.
      const repaired = compileTriggerDeclaration(
        declaration([...clean, { ...contradictory, cadence: "periodic:2h" }]),
        { loops },
      );
      assert.deepEqual(idsOf(repaired), idsOf(withIt), "the same members are compiled either way");
      assert.equal(withIt.contradictions.length, 1, "the contradictory one is reported");
      assert.deepEqual([...repaired.contradictions], [], "…and the repaired one is not");

      assert.deepEqual(
        withIt.triggers.filter((trigger) => trigger.id !== "too-fast"),
        [...without_.triggers],
        "the three that are not contradictory are compiled exactly as they would be alone",
      );
    },
  },

  // Scenario Outline: there is nothing to compare, and that is not agreement.
  ...[
    ["points at a loop but declares no cadence", { wakes: LOOP_ID }, "periodic:1h", "trigger-declares-no-cadence"],
    ["points at a loop that declares no cadence", { wakes: LOOP_ID, cadence: "periodic:1h" }, null, "loop-declares-no-cadence"],
    ["points at no loop at all", { cadence: "periodic:1h" }, "periodic:1h", "trigger-declares-no-loop"],
    ["points at a loop id no registry entry declares", { wakes: "loop:nowhere", cadence: "periodic:1h" }, "periodic:1h", "loop-not-declared"],
  ].map(([situation, overrides, loopCadence, reason]) => ({
    name: `63/00/03 a trigger that ${situation} is reported as not compared`,
    run: () => {
      const answer = compileTriggerDeclaration(
        declaration([member({ id: "subject", ...overrides })]),
        { loops: registryOf(loopCadence) },
      );
      const [pairing] = pairingFor(answer, "subject");
      assert.equal(pairing.state, "not-compared", "reports it as not compared");
      assert.equal(pairing.reason, reason, "…and why");
      assert.deepEqual([...answer.contradictions], [], "…and no contradiction");
      if (reason === "loop-not-declared") {
        assert.equal(pairing.triggerId, "subject", "a pointer that resolves to nothing is reported by name");
        assert.equal(pairing.loop, "loop:nowhere", "…and names the pointer that resolved to nothing");
      }
    },
  })),

  {
    name: "63/00/03 a registry nobody supplied is not a registry that answered nothing",
    run: async () => {
      // THE FALSIFYING CASE. Compiled with no registry, the shipped declaration's four pointers
      // were reported `loop-not-declared` — a positive claim that `loop:autonomous-cascade`,
      // `loop:build-to-green`, `loop:review-fix-rereview` and `loop:verify-triage-accept` resolve
      // to nothing. All four ARE declared in `.aof/loops/`, so that answer was not imprecise, it
      // was FALSE, and 63/05's face would have rendered it as a sentence.
      const declared = bundledTriggerDeclaration();
      const unasked = compileTriggerDeclaration(declared);
      const pointed = unasked.pairings.filter((entry) => entry.loop != null);
      assert.ok(pointed.length > 0, "the shipped declaration points at loops");
      for (const entry of pointed) {
        assert.equal(entry.state, "not-compared", `${entry.triggerId} was not compared`);
        assert.equal(entry.reason, "registry-not-supplied", `${entry.triggerId}: nobody asked the registry`);
        assert.notEqual(entry.reason, "loop-not-declared", `${entry.triggerId}: and it is NOT reported as a loop that does not exist`);
      }

      // …and the claim that would have been made is demonstrably false: asked, the real registry
      // resolves every one of them.
      const loaded = await loadLoops(path.join(REPO_ROOT, ".aof"));
      const asked = compileTriggerDeclaration(declared, { loops: loaded.nodes });
      for (const entry of asked.pairings.filter((item) => item.loop != null)) {
        assert.notEqual(entry.reason, "loop-not-declared", `${entry.triggerId} resolves against the real registry`);
        assert.notEqual(entry.reason, "registry-not-supplied", `${entry.triggerId}: this registry WAS supplied`);
      }
    },
  },

  {
    name: "63/00/03 an empty registry was asked and answered; an absent one was never asked",
    run: () => {
      const decl = declaration([member({ id: "subject", wakes: LOOP_ID, cadence: "periodic:1h" })]);
      const absent = compileTriggerDeclaration(decl);
      const empty = compileTriggerDeclaration(decl, { loops: [] });
      const present = compileTriggerDeclaration(decl, { loops: registryOf("periodic:1h") });

      assert.equal(absent.pairings[0].reason, "registry-not-supplied", "no registry: the pointer was never looked up");
      assert.equal(empty.pairings[0].reason, "loop-not-declared", "an empty registry: asked, and holds no such id");
      assert.equal(present.pairings[0].state, "compared", "a registry holding it: compared");
      assert.notEqual(absent.pairings[0].reason, empty.pairings[0].reason, "the two are different answers, not one string");
      // All three are still not-a-contradiction, so the distinction is about what was CHECKED.
      for (const answer of [absent, empty]) assert.deepEqual([...answer.contradictions], []);
    },
  },

  {
    name: "63/00/03 a loop whose cadence the loader refuses is not a loop that declared none",
    run: () => {
      const decl = declaration([member({ id: "subject", wakes: LOOP_ID, cadence: "periodic:1h" })]);
      const silent = compileTriggerDeclaration(decl, { loops: [{ id: LOOP_ID }] });
      const malformed = compileTriggerDeclaration(decl, { loops: [{ id: LOOP_ID, cadence: "periodic:1w" }] });

      assert.equal(silent.pairings[0].reason, "loop-declares-no-cadence", "a record with no opinion");
      assert.equal(malformed.pairings[0].reason, "loop-cadence-invalid", "a record the grammar refuses");
      assert.notEqual(silent.pairings[0].reason, malformed.pairings[0].reason, "invalid is not absent");
      assert.equal(malformed.pairings[0].loopCadence, "periodic:1w", "…and the refused value is reported as declared");
      assert.equal(silent.pairings[0].loopCadence, null, "…while silence carries nothing");
      // A malformed loop cadence is REPORTED, never a refusal of the trigger set (ADR-010 §8).
      assert.deepEqual(malformed.triggers.map((trigger) => trigger.id), ["subject"]);
    },
  },

  {
    name: "63/00/03 every reason the answer can carry is declared, and every declared reason is reachable",
    run: () => {
      const loops = [{ id: "loop:has-cadence", cadence: "periodic:1h" }, { id: "loop:silent" }, { id: "loop:broken", cadence: "periodic:1w" }];
      const supplied = compileTriggerDeclaration(declaration([
        member({ id: "no-pointer", cadence: "periodic:1h" }),
        member({ id: "dangling", wakes: "loop:nowhere", cadence: "periodic:1h" }),
        member({ id: "no-cadence", wakes: "loop:has-cadence" }),
        member({ id: "loop-silent", wakes: "loop:silent", cadence: "periodic:1h" }),
        member({ id: "loop-broken", wakes: "loop:broken", cadence: "periodic:1h" }),
        member({ id: "incomparable", wakes: "loop:has-cadence", cadence: "event:per-item" }),
      ]), { loops });
      const unsupplied = compileTriggerDeclaration(declaration([member({ id: "unasked", wakes: "loop:has-cadence", cadence: "periodic:1h" })]));

      const emitted = new Set([...supplied.pairings, ...unsupplied.pairings].map((entry) => entry.reason).filter((reason) => reason != null));
      for (const reason of emitted) {
        assert.ok(TRIGGER_PAIRING_REASONS.includes(reason), `"${reason}" is a declared reason`);
      }
      // Non-vacuity of the vocabulary itself: a reason nothing can emit is a sentence nobody will
      // ever read, and a reason emitted but undeclared is a second vocabulary.
      assert.deepEqual([...emitted].sort(), [...TRIGGER_PAIRING_REASONS].sort(), "every declared reason is reachable");
    },
  },

  {
    name: "63/00/03 every trigger that points at a loop is accounted for, one way or another",
    run: () => {
      const loops = [{ id: "loop:fast" , cadence: "periodic:5m" }, { id: "loop:slow", cadence: "periodic:1h" }, { id: "loop:silent" }];
      const members = [
        member({ id: "in-contradiction", wakes: "loop:slow", cadence: "periodic:5m" }),
        member({ id: "agreed", wakes: "loop:fast", cadence: "periodic:1h" }),
        member({ id: "incomparable", wakes: "loop:slow", cadence: "event:per-item" }),
        member({ id: "no-cadence", wakes: "loop:slow" }),
        member({ id: "loop-silent", wakes: "loop:silent", cadence: "periodic:1h" }),
        member({ id: "no-pointer", cadence: "periodic:1h" }),
        member({ id: "dangling", wakes: "loop:nowhere", cadence: "periodic:1h" }),
      ];
      const answer = compileTriggerDeclaration(declaration(members), { loops });

      assert.equal(answer.pairings.length, members.length, "each trigger appears exactly once in the answer");
      for (const entry of members) {
        const found = pairingFor(answer, entry.id);
        assert.equal(found.length, 1, `${entry.id} appears exactly once`);
        // The three states are read from the module that defines them, never retyped here — one
        // vocabulary, one home, which is the rule this whole story is about.
        assert.ok(TRIGGER_PAIRING_STATES.includes(found[0].state), `${entry.id} carries one of the three states`);
      }
      assert.deepEqual(answer.contradictions.map((entry) => entry.triggerId), ["in-contradiction"]);
      const pointed = members.filter((entry) => entry.wakes != null).map((entry) => entry.id);
      for (const id of pointed) {
        assert.equal(pairingFor(answer, id).length, 1, `no trigger that points at a loop is absent from the answer: ${id}`);
      }
    },
  },
];

// ─── task 04 · the shipped declaration is the one aof installs ─────────────────────────

async function updatedWorkspace(body) {
  return scratch(async (dir) => {
    await initWork({ targetDir: dir, runtimes: ["claude"] });
    await updateWork({ targetDir: dir });
    return await body(dir);
  }, "aof-63-00-ws-");
}

const installedBytes = (dir) => readFile(triggerDeclarationPath(dir));
const bundledBytes = () => readFile(BUNDLED_SOURCE);
const actionFor = (result, relpath) => result.actions.find((entry) => String(entry.path).replaceAll("\\", "/").endsWith(relpath));

const SHIPPED_IS_INSTALLED = [
  {
    name: "63/00/04 an updated workspace holds the declaration, byte-identical to the bundled source",
    run: () => updatedWorkspace(async (dir) => {
      const target = triggerDeclarationPath(dir);
      assert.ok((await stat(target)).isFile(), `it is present at ${TRIGGER_DECLARATION_RELPATH}`);
      const installed = await installedBytes(dir);
      const bundled = await bundledBytes();
      assert.ok(installed.equals(bundled), "its bytes are identical to the bundled source it came from");
      assert.equal(sha256(installed), sha256(bundled), "its content hash equals the hash of the bundled source");
    }),
  },

  {
    name: "63/00/04 byte-identical is asserted over bytes, not over text",
    run: () => updatedWorkspace(async (dir) => {
      const installed = await installedBytes(dir);
      const bundled = await bundledBytes();
      assert.equal(installed.includes(0x0d), false, "no CR was introduced on the way to disk");
      assert.equal(bundled.includes(0x0d), false, "and none is in the source");
      assert.deepEqual(
        [...installed].filter((byte) => byte === 0x0a).length,
        [...bundled].filter((byte) => byte === 0x0a).length,
        "their line endings are identical",
      );
      assert.deepEqual(installed.subarray(-4), bundled.subarray(-4), "their trailing bytes are identical");
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      assert.equal(installed.subarray(0, 3).equals(bom), bundled.subarray(0, 3).equals(bom), "neither carries a byte order mark the other does not");
      assert.equal(installed.length, bundled.length, "the comparison is made without trimming or re-serialising either");
      assert.ok(installed.equals(bundled));
    }),
  },

  // Scenario Outline: what an update does to a declaration already on disk.
  {
    name: "63/00/04 what an update does to a declaration already on disk — absent, identical, deleted, edited, edited twice",
    run: () => updatedWorkspace(async (dir) => {
      const target = triggerDeclarationPath(dir);
      const bundled = await bundledBytes();
      const EDIT = "// a local edit\n{ \"version\": 1, \"members\": [] }\n";

      // absent → created, byte-identical to the bundled source
      await rm(target, { force: true });
      const created = await updateWork({ targetDir: dir });
      assert.equal(actionFor(created, TRIGGER_DECLARATION_RELPATH)?.action, "create", "absent → created");
      assert.ok((await installedBytes(dir)).equals(bundled), "…byte-identical to the bundled source");

      // identical to the bundled source → reported up-to-date, bytes unchanged
      const skipped = await updateWork({ targetDir: dir });
      assert.equal(actionFor(skipped, TRIGGER_DECLARATION_RELPATH)?.action, "skip", "identical → reported up-to-date");
      assert.ok((await installedBytes(dir)).equals(bundled), "…and its bytes are unchanged");

      // deleted after an earlier install → created again
      await rm(target, { force: true });
      const recreated = await updateWork({ targetDir: dir });
      assert.equal(actionFor(recreated, TRIGGER_DECLARATION_RELPATH)?.action, "create", "deleted after an earlier install → created again");
      assert.ok((await installedBytes(dir)).equals(bundled), "…byte-identical to the bundled source");

      // edited locally → reported as drift, edited bytes left where they are
      await writeFile(target, EDIT, "utf8");
      const drifted = await updateWork({ targetDir: dir });
      assert.equal(actionFor(drifted, TRIGGER_DECLARATION_RELPATH)?.action, "drift-warning", "edited locally → reported as drift");
      assert.equal(await readFile(target, "utf8"), EDIT, "…and the edited bytes are left where they are");

      // edited locally, then updated again → drift a second time, still not overwritten
      const driftedAgain = await updateWork({ targetDir: dir });
      assert.equal(actionFor(driftedAgain, TRIGGER_DECLARATION_RELPATH)?.action, "drift-warning", "…reported as drift a second time");
      assert.equal(await readFile(target, "utf8"), EDIT, "…and still not overwritten");
    }),
  },

  {
    name: "63/00/04 a locally edited declaration is re-rendered only when the update is forced",
    run: () => updatedWorkspace(async (dir) => {
      const target = triggerDeclarationPath(dir);
      await writeFile(target, "// mine now\n{ \"version\": 1, \"members\": [] }\n", "utf8");
      const forced = await updateWork({ targetDir: dir, force: true });
      assert.equal(actionFor(forced, TRIGGER_DECLARATION_RELPATH)?.action, "update", "it is re-rendered from the bundled source");
      const installed = await installedBytes(dir);
      assert.ok(installed.equals(await bundledBytes()), "its bytes are identical to it again");
      assert.equal(installed.includes("mine now"), false, "the local edit is gone rather than merged");
    }),
  },

  {
    name: "63/00/04 the declaration is catalogued by the bundle's own manifest",
    run: async () => {
      const manifest = JSON.parse(await readFile(path.join(REPO_ROOT, "src", "bundle", "manifest.json"), "utf8"));
      const entries = manifest.entries.filter((entry) => entry.path === TRIGGER_DECLARATION_RELPATH);
      assert.equal(entries.length, 1, "it carries one entry for the trigger declaration, at the target path it installs to");
      const bundled = await bundledBytes();
      assert.equal(entries[0].hash, `sha256:${sha256(bundled)}`, "that entry's hash is the hash of the bundled source's bytes");
      // Detectable without installing anything: the comparison above is the whole check, and a
      // source whose bytes moved by one character fails it.
      assert.notEqual(entries[0].hash, `sha256:${sha256(Buffer.concat([bundled, Buffer.from(" ")]))}`, "a manifest whose entry disagrees with its own source is detectable");
    },
  },

  {
    name: "63/00/04 it installs on the same run that installs the other declarations, not on a step of its own",
    run: () => updatedWorkspace(async (dir) => {
      const siblings = [".aof/frozen-set.jsonc", ".aof/loops/build-to-green.md"];
      for (const relpath of [TRIGGER_DECLARATION_RELPATH, ...siblings]) {
        await rm(path.join(dir, ...relpath.split("/")), { force: true });
      }
      const once = await updateWork({ targetDir: dir });
      assert.equal(actionFor(once, TRIGGER_DECLARATION_RELPATH)?.action, "create", "the trigger declaration is installed");
      for (const relpath of siblings) {
        assert.equal(actionFor(once, relpath)?.action, "create", `${relpath} is installed by the same run`);
      }
      assert.ok((await installedBytes(dir)).equals(await bundledBytes()), "no separate command, flag or first use is needed");
    }),
  },

  {
    name: "63/00/04 the file aof ships is the file the compiler reads",
    run: () => updatedWorkspace(async (dir) => {
      const installedDeclaration = await readTriggerDeclaration(dir);
      const bundledDeclaration = bundledTriggerDeclaration();
      const fromInstalled = compileTriggerDeclaration(installedDeclaration);
      const fromBundled = compileTriggerDeclaration(bundledDeclaration);
      assert.ok(fromInstalled.triggers.length > 0, "both compile");
      assert.deepEqual(fromInstalled, fromBundled, "the two answers are equal, member for member");

      // The compiler reads the INSTALLED copy from the path the install wrote it to: change that
      // file and the compiler's answer changes with it.
      const target = triggerDeclarationPath(dir);
      const mutated = { ...installedDeclaration, members: [installedDeclaration.members[0]] };
      await writeFile(target, `${JSON.stringify(mutated, null, 2)}\n`, "utf8");
      const afterEdit = compileTriggerDeclaration(await readTriggerDeclaration(dir));
      assert.deepEqual(idsOf(afterEdit), [installedDeclaration.members[0].id], "…and not some other copy of it");
    }),
  },

  {
    name: "63/00/04 an unparseable installed declaration is a coded refusal naming the file",
    run: () => updatedWorkspace(async (dir) => {
      const target = triggerDeclarationPath(dir);
      await writeFile(target, "// aof-generated: bundle\n{ \"members\": [ , ] }\n", "utf8");
      let handedBack = "NOTHING-WAS-RETURNED";
      await assert.rejects(
        async () => { handedBack = await readTriggerDeclaration(dir); },
        (error) => {
          assert.ok(error instanceof TriggerDeclarationError, "it is refused with a code");
          assert.equal(error.code, "trigger-declaration-unparseable");
          assert.equal(error.path, target, "the refusal names the path it was read from");
          assert.ok(error.message.includes(target));
          return true;
        },
      );
      assert.equal(handedBack, "NOTHING-WAS-RETURNED", "no compiled set is handed back");
      // …and the bundled source is not silently used in its place: the refusal is the only answer,
      // and the bundled declaration would have compiled four members.
      assert.ok(compileTriggerDeclaration(bundledTriggerDeclaration()).triggers.length > 0, "the bundled source would have compiled");
    }),
  },

  {
    name: "63/00/04 a declaration that is not installed at all is a coded refusal, never a silent bundled fallback",
    run: () => scratch(async (dir) => {
      await mkdir(path.join(dir, ".aof"), { recursive: true });
      await assert.rejects(
        () => readTriggerDeclaration(dir),
        (error) => error instanceof TriggerDeclarationError
          && error.code === "trigger-declaration-missing"
          && error.path === triggerDeclarationPath(dir),
      );
    }),
  },
];

export const triggerDeclarationTests = [
  ...DECLARATION_IS_DATA,
  ...REFUSES_THE_WHOLE_SET,
  ...CADENCE_IS_IMPORTED,
  ...FASTER_THAN_THE_LOOP,
  ...SHIPPED_IS_INSTALLED,
];
