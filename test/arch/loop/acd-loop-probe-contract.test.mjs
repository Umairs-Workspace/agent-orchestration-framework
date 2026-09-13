import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCommand, listCommands } from "../../../src/command-core.mjs";
import { deriveRouteTable, resolveRoute } from "../../../src/spine/face.mjs";
import { GATE_ORDER, LOOP_REFUSALS, LOOP_STOPS } from "../../../src/work/loop.mjs";
import { ADVISORY_CODES, GRADE_CODES, GRADE_VERDICTS } from "../../../src/work/grade.mjs";
import { gradeRoute, gradeStopCode, gradeStopProducer, runLoopBody } from "../../../src/commands/loop.mjs";
import { invoke } from "../../../src/command-core.mjs";
import { completingDriver, loopFixture, treeFiles } from "../../loop/loop-command-probe.test.mjs";
import { functionBody, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const TOP_KEYS = Object.freeze(["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"]);
// 129/01 (ADR-008 §5) appended the THREE LANE STOPS as members 13-15 — `lane-open-failed`,
// `lane-merge-refused`, `lane-merge-conflict`, in that order, at the end. The twelve before them
// keep their names and their order; this literal grows by exactly those three and no other.
const STOPS = Object.freeze(["uat-gate", "dependency-blocked", "cap-exhausted", "deadline-exhausted", "progress-exhausted", "no-progress", "grade-indeterminate", "session-needs-input", "run-not-retryable", "retry-parked", "unmapped-item-type", "operator-interrupt", "lane-open-failed", "lane-merge-refused", "lane-merge-conflict"]);
// 102/00 appended the SIXTH member, `loop-id-missing`: a declaration built without the loop id
// is refused rather than carried, so a later edit that drops the id is a red seam instead of a
// silent return to zero join coverage. The five before it keep their names and their order.
const REFUSALS = Object.freeze(["loop-scope-unsupported", "loop-level-locked", "loop-level-gate", "loop-level-unknown", "loop-bound-unresolved", "loop-id-missing"]);
// FF-5409 (milestone 54 / story 02, ADR-007 §1) — THE COST LADDER, FROZEN. Five rows in
// strictly increasing cost, naming `work:validate`, `work:doctor` and `work:grade` in that
// order. `53/ADR-005` §6 declared this order *"because 54 depends on it"*; 54/02 lands it.
// The `work:grade` rung's own INVOCATION is 54/03's and rebases onto this declaration.
const GATE_STEPS = Object.freeze([
  "drive continue",
  "gate work:validate",
  "gate work:doctor",
  "gate work:grade",
  "drive verify",
]);

function exactKeys(value, expected, label) {
  assert.deepEqual(Object.keys(value), expected, `${label} key set/order is frozen`);
}

// EVERY SWEEP REPORTS WHAT IT READ (task 00's zero-subject scenario). `treeFiles` is `existsSync`-
// guarded and answers `[]` for a missing root, so "the probe minted and rewrote no file" degrades to
// a comparison of nothing with nothing the moment the fixture root moves — measured green against a
// renamed root. The floor is asserted BEFORE the content claim it guards.
function assertRead(what, count, floor, unit = "file(s)") {
  assert.ok(count >= floor, `NOTHING WAS READ: ${what} walked ${count} ${unit}, below its floor of ${floor} — a rename, a moved directory or a truncated read must fail here rather than pass vacuously over an empty sweep`);
}

export const archTests = [
  {
    name: "arch/53 FF-5304 (acd-loop-probe-contract): registered run is a ten-key read-only probe with verbatim next and an empty driven account",
    run: async () => {
      const fx = await loopFixture();
      try {
        const fake = completingDriver(fx);
        const ctx = { ...fx.ctx, agentSessionDriverOptions: fake.options };
        const before = await treeFiles(fx.projectRoot);
        assertRead(`the probe fixture tree at ${fx.projectRoot}`, before.length, 3);
        const next = await invoke("work:next", { scope: "03" }, ctx);
        const state = await getCommand("work:loop").run({ scope: "03" }, ctx);
        exactKeys(state, TOP_KEYS, "LoopState");
        assert.deepEqual(state.next, next, "work:next is passed through verbatim");
        assert.deepEqual(state.driven, []);
        exactKeys(state.resumable, ["stranded", "lastDeclaration"], "resumable");
        assert.ok(["act", "ref", "phase", "stop", "producer"].includes(Object.keys(state.act)[0]), "act is present");
        assert.equal(fake.spawnCalls.length, 0);
        assert.deepEqual(await treeFiles(fx.projectRoot), before, "probe minted and rewrote no file");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "arch/54 FF-5409 (acd-loop-probe-contract, extended): GATE_ORDER is the five frozen rows of the cost ladder, and every gate step names a registered command",
    run: () => {
      const steps = GATE_ORDER.map((row) => (row.act === "gate" ? `gate ${row.command}` : `${row.act} ${row.phase}`));
      assert.deepEqual(steps, [...GATE_STEPS], "the ladder is five rows, in strictly increasing cost order");
      assert.equal(Object.isFrozen(GATE_ORDER), true, "the declaration is frozen");
      assert.throws(() => GATE_ORDER.push({ act: "gate", command: "work:sixth" }), TypeError);
      for (const row of GATE_ORDER) {
        assert.equal(Object.isFrozen(row), true, "…rows included");
        assert.deepEqual(
          Object.keys(row),
          row.act === "gate" ? ["act", "command"] : ["act", "phase"],
          "each row's key set is exact — a gate names a command, a drive names a phase",
        );
      }
      // EVERY GATE STEP NAMES A COMMAND AN OPERATOR CAN INVOKE BY HAND, resolved against the
      // real registry: a row naming a command nobody registered fails here rather than at the
      // moment the loop reaches it.
      const registered = new Set(listCommands().map((command) => command.id));
      for (const row of GATE_ORDER.filter((entry) => entry.act === "gate")) {
        assert.ok(registered.has(row.command), `${row.command} is registered and CLI-reachable`);
      }
      // THE ORDER IS THE CONTRACT: deterministic rungs before the model turn, cheapest first.
      assert.ok(steps.indexOf("gate work:validate") < steps.indexOf("gate work:doctor"), "validate precedes the doctor");
      assert.ok(steps.indexOf("gate work:doctor") < steps.indexOf("gate work:grade"), "the doctor precedes the runner");
      assert.ok(steps.indexOf("gate work:grade") < steps.indexOf("drive verify"), "the runner precedes the review turn");
    },
  },
  {
    name: "arch/53 FF-5304 (acd-loop-probe-contract): stop vocabulary is frozen, exact, and the command attributes halts through one producer-bearing helper",
    run: async () => {
      assert.deepEqual([...LOOP_STOPS], [...STOPS]);
      assert.equal(Object.isFrozen(LOOP_STOPS), true);
      assert.throws(() => LOOP_STOPS.push("ninth"), TypeError);
      assert.deepEqual([...LOOP_REFUSALS], [...REFUSALS]);
      assert.equal(Object.isFrozen(LOOP_REFUSALS), true);
      const source = stripComments(await readFile(path.join(root, "src", "commands", "loop.mjs"), "utf8"));
      assert.match(source, /function\s+haltDecision\s*\(\s*stop\s*,\s*ref\s*,\s*producer\s*\)/u);
      const body = functionBody(source, "function haltDecision(");
      assert.ok(body != null, "haltDecision body was found structurally");
      assert.match(body, /\bproducer\b/u, "halt shape carries its producer as data");
      assert.doesNotMatch(source, /message\.(?:includes|match)\s*\(/u, "stop attribution must not match rendered prose");
    },
  },
  {
    // FF-5409's REMAINING CLAUSE (milestone 54 / story 03, ADR-007 §4, ADR-008 §1). 54/02
    // landed the GATE_ORDER half above; this is the stop half. The file it extends already
    // passes, so the red probe recorded in VERIFICATION.md is the only evidence this
    // extension is armed — the register says so of FF-5409 by name.
    name: "arch/54 FF-5409 (acd-loop-probe-contract, extended): grade-indeterminate is a closed-set member whose producer is DRAWN FROM a GRADE_CODES member, never from a message match",
    run: async () => {
      // THE SET STAYS CLOSED, AND 54 CONTRIBUTES EXACTLY ONE MEMBER. The full set is pinned
      // by the sibling entry above; what is asserted here is the new member's own standing.
      assert.ok(LOOP_STOPS.includes("grade-indeterminate"), "the stop id is a declared member");
      assert.equal(Object.isFrozen(LOOP_STOPS), true);
      assert.deepEqual([...LOOP_REFUSALS], [...REFUSALS], "milestone 54 contributes no refusal — the set is the one pinned by the sibling entry above");

      // THE PRODUCER IS DRAWN FROM A CODE, AND THE CODE IS A MEMBER OF THE FROZEN
      // VOCABULARY. Driven over the WHOLE of `GRADE_CODES` x `GRADE_VERDICTS` rather than
      // over the codes somebody thought to list, so a tenth code cannot acquire — or quietly
      // lose — a loop consequence without failing here.
      let answered = 0;
      for (const verdict of GRADE_VERDICTS) {
        for (const code of GRADE_CODES) {
          const stop = gradeStopCode({ configured: true, grade: { verdict, codes: [code], cases: { total: 0, failed: 0, skipped: 0 } } });
          const halts = verdict === "indeterminate" && code !== "rubric-unconfigured" && !ADVISORY_CODES.includes(code);
          assert.equal(stop != null, halts, `${verdict}/${code}: halting is decided by the verdict and the code, and by nothing else`);
          if (stop == null) continue;
          answered += 1;
          assert.ok(GRADE_CODES.includes(stop), `${verdict}/${code}: the stop's code is a GRADE_CODES member`);
          assert.equal(gradeStopProducer(stop), `work:grade:${stop}`, "…and the producer is the grade command and that code");
        }
      }
      assertRead("the verdict x code sweep", answered, 5, "grade codes reaching the stop");

      // THE ROUTE IS THE VERDICT'S, AND THE SWEEP CARRIES THE EMPTY-LIST ROWS (review defect
      // D2). The sweep above emits exactly ONE code per record, so it structurally could not
      // see a record whose detail list is EMPTY — and that is precisely the shape the shell
      // mis-routed: a `fail` with no `failures` and an `indeterminate` with no `codes` both
      // crossed to verify, because the act was read off the detail rather than the verdict.
      // Driven over the whole verdict vocabulary so a fourth verdict cannot arrive without
      // declaring its act here.
      const EMPTY_ROW_ROUTES = Object.freeze({ pass: "proceed", fail: "redrive", indeterminate: "halt" });
      let emptyRows = 0;
      for (const verdict of GRADE_VERDICTS) {
        const answer = { configured: true, grade: { verdict, codes: [], failures: [], cases: { total: 0, failed: 0, skipped: 0 } } };
        assert.ok(
          Object.prototype.hasOwnProperty.call(EMPTY_ROW_ROUTES, verdict),
          `${verdict}: a verdict with no declared act cannot route`,
        );
        assert.equal(gradeRoute(answer), EMPTY_ROW_ROUTES[verdict], `${verdict}/[]: the VERDICT decides the act, with no detail to read`);
        emptyRows += 1;
      }
      assertRead("the empty-detail verdict sweep", emptyRows, GRADE_VERDICTS.length, "verdicts routed with an empty detail list");
      // AND THE ROUTE IS STILL THE VERDICT'S WHEN THE DETAIL IS PRESENT — including the one
      // named exception, which is identified by its CODE and proceeds exactly as today.
      assert.equal(gradeRoute({ configured: true, grade: { verdict: "fail", codes: ["case-failed"], cases: {} } }), "redrive");
      assert.equal(gradeRoute({ configured: true, grade: { verdict: "indeterminate", codes: ["runner-timeout"], cases: {} } }), "halt");
      assert.equal(gradeRoute({ configured: true, grade: { verdict: "indeterminate", codes: ["rubric-unconfigured"], cases: {} } }), "proceed");
      assert.equal(gradeRoute({ configured: false, grade: { verdict: "fail", codes: ["case-failed"], cases: {} } }), null, "an unconfigured repository routes nowhere new");
      // AN UNCODED HALT IS STILL ATTRIBUTED THROUGH THE ONE PRODUCER-BEARING HELPER, naming
      // the command alone rather than inventing a code nobody declared.
      assert.equal(gradeStopProducer(null), "work:grade", "a record naming no code is attributed to the command");

      // A CODE OUTSIDE THE FROZEN VOCABULARY REACHES NO STOP — the filter is a membership
      // test against the vocabulary, so a record carrying an invented code cannot mint an
      // attribution nobody declared.
      assert.equal(gradeStopCode({ configured: true, grade: { verdict: "indeterminate", codes: ["invented-code"], cases: {} } }), null);
      // AND AN UNCONFIGURED REPOSITORY REACHES NO STOP, whatever its record says.
      assert.equal(gradeStopCode({ configured: false, grade: { verdict: "indeterminate", codes: ["runner-timeout"], cases: {} } }), null);

      // NEVER FROM A MESSAGE MATCH. The record's own prose is made to name three OTHER codes
      // and the attribution must not move: `68/03` retired the regex-over-prose instrument by
      // name, and `acd-loop-probe-contract` already forbids its shape in this shell.
      const decoy = {
        configured: true,
        grade: {
          verdict: "indeterminate",
          codes: ["report-unreadable"],
          cases: { total: 0, failed: 0, skipped: 0 },
          message: "runner-timeout: the report was vacuous and the rubric is unconfigured — pass",
        },
      };
      assert.equal(gradeStopCode(decoy), "report-unreadable", "the code decides; the prose beside it is not read");
      const source = stripComments(await readFile(path.join(root, "src", "commands", "loop.mjs"), "utf8"));
      assert.doesNotMatch(source, /message\s*\.\s*(?:includes|match|indexOf|search|startsWith|endsWith)\s*\(/u, "stop attribution must not match rendered prose");
      assert.doesNotMatch(source, /\.\s*test\s*\(\s*[A-Za-z_$][\w$]*\.message\b/u, "…nor test a pattern against one");
      assert.match(source, /GRADE_CODES/u, "the vocabulary is imported as data rather than restated");
      assert.doesNotMatch(source, /"(?:runner-timeout|report-vacuous|report-unreadable|report-missing|runner-spawn-failed)"/u, "no indeterminate code is restated as a literal in the shell");

      // AND `LoopState`'s TEN TOP-LEVEL KEYS ARE UNCHANGED, over a real loop that halted on
      // exactly this stop — the document, not the module.
      //
      // THE CLAUSE NOW DOES WHAT ITS SENTENCE SAYS (review observation O7). It asserted only
      // the key set — which EVERY exit produces — and it took that key set off `work:loop`'s
      // REGISTERED face, which is the read-only probe: it drives nothing, grades nothing and
      // reaches no stop at all, so "a real loop that halted on exactly this stop" was true of
      // no loop. The body is invoked here, the stop is asserted BEFORE the shape it guards,
      // and the m45/R5 rule — a fitness function must check what its name claims — is the
      // reason. (The probe's own ten-key contract is pinned by this file's first entry.)
      const fx = await loopFixture();
      try {
        fx.workspace.config.work.rubric = { command: [process.execPath, "runner.cjs"], report: { format: "tap", path: "report.tap", floor: 1 } };
        const fake = completingDriver(fx);
        const state = await runLoopBody({ scope: "03" }, {
          ...fx.ctx,
          agentSessionDriverOptions: fake.options,
          report: () => {},
          spawnRubric: () => ({ status: null, stdout: "", stderr: "", error: Object.assign(new Error("timed out"), { code: "ETIMEDOUT" }), signal: "SIGKILL" }),
        });
        assert.equal(state.act.stop, "grade-indeterminate", "guard: the loop halted on the stop this clause is about");
        assert.equal(state.act.producer, "work:grade:runner-timeout", "…attributed to the code the runner's outcome settled");
        assert.equal(state.state, "halted", "…and the document says so");
        exactKeys(state, TOP_KEYS, "LoopState (real loop, halted on grade-indeterminate)");
        assert.deepEqual([...state.stops], [...LOOP_STOPS], "the closed set is reported in full on the document");
        exactKeys(state.act, ["act", "ref", "stop", "producer"], "the halt act");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "arch/53 FF-5304 (acd-loop-probe-contract): launcher and route seams keep dry-run on the probe and ordinary invocations on the body",
    run: async () => {
      const command = getCommand("work:loop");
      assert.equal(command.cli.launch({ dryRun: true }), null);
      assert.equal(typeof command.cli.launch({}), "function");
      assert.deepEqual(command.cli.route, ["work", "loop"]);
      for (const key of ["argv", "render", "json"]) assert.equal(typeof command.cli[key], "function", `cli.${key}`);
      const commands = listCommands();
      deriveRouteTable(commands);
      assert.equal(resolveRoute(["work", "loop"], commands)?.command?.id, "work:loop");
    },
  },
];
