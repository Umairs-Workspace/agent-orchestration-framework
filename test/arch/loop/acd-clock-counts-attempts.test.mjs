// FF-12601 — "The clock's subject is the ATTEMPT SERIES, not the calendar: `scheduleToClose` sums
// attempt durations over the `retryOf` lineage, and downtime is charged to nobody."
//
// milestone 126 / story 00, ADR-001 (AMENDED twice). The STRUCTURAL half plus the engine's own
// pure table; the DRIVEN half — what the two shell sites do with it — is
// `test/loop/loop-command-resume.test.mjs`'s clock lane. The split is the one 124/01 drew: a
// decider's arithmetic is measured over literal fixtures, a walk's behaviour by walking.
//
// WHAT THIS CONTROL EXISTS TO CATCH, in the contract's own words: a summer that ends a reclaimed
// attempt at `updatedAt` (the same 11-hour bill under a new name); a summer that ends a STALE
// `running` attempt at `now` even when the threshold was supplied (the same bill again, before the
// sweep writes the stamp down); a BUDGET call site that omits `stalenessMs` or the predicate and so
// silently gets the render's reading; an `age > threshold` test written inline in the engine
// instead of the store's own predicate handed in, which is a fourth home for a definition that has
// one; an accumulator written onto the declaration; a decider that keeps accepting
// `{startedAt, now}` beside `{elapsedMs}` so the old arithmetic survives on one branch; a
// `stalenessMs` resolved inside the engine instead of passed in; and a second `retryOf` traversal
// authored beside the one this contract moves into the engine.
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  attemptElapsedMs,
  buildLoopDeclaration,
  decideScheduleToClose,
  lineageElapsedMs,
  retryLineage,
} from "../../../src/work/loop.mjs";
import { isStale, startRun } from "../../../src/run-store.mjs";
// THE COMMENT STRIPPER, FROM ITS ONE HOME (chore 106 / TECH_DEBT item 24) — a hand-rolled one is
// what `acd-comment-stripper-order` refuses, and every absence sweep below depends on it.
import { functionBody, matchedParenSpan, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ENGINE = "src/work/loop.mjs";
const SHELL = "src/commands/loop.mjs";
const read = async (rel) => await readFile(path.join(root, rel), "utf8");
const source = async (rel) => stripComments(await read(rel));

const DAY = "2026-09-08T";
const at = (clock) => (clock === "absent" ? undefined : `${DAY}${clock}Z`);
const STALENESS = 900_000;

/** One run record in the store's own shape. `absent` omits the key entirely. */
function record({ state, createdAt, heartbeatAt = null, updatedAt, reclaimedAt = null, runId = "r", retryOf = null }) {
  return {
    runId,
    retryOf,
    state,
    ...(createdAt === "absent" ? {} : { createdAt: at(createdAt) }),
    heartbeatAt: heartbeatAt == null ? null : at(heartbeatAt),
    ...(updatedAt === "absent" ? {} : { updatedAt: at(updatedAt) }),
    reclaimedAt: reclaimedAt == null ? null : at(reclaimedAt),
  };
}

// THE MEASURED FAILURE, from 124/00's own run folder — the record this milestone was framed from.
const MEASURED = {
  runId: "20260907T233233272Z-0000",
  retryOf: null,
  state: "failed",
  createdAt: "2026-09-07T23:32:33.272Z",
  heartbeatAt: "2026-09-08T00:02:19.028Z",
  updatedAt: "2026-09-08T11:02:13.985Z",
  reclaimedAt: "2026-09-08T11:02:13.985Z",
  failureReason: "runtime_offline",
  brief: { loop: { startedAt: "2026-09-07T23:32:31.685Z" } },
};
const MEASURED_ATTEMPT_MS = 1_785_756;
const MEASURED_WALL_MS = 41_380_713;

export const archTests = [
  {
    name: "arch/126/00 FF-12601 leg 1: a reclaimed attempt ends at its last heartbeat, never at its reclaim stamp — and the record reads the same as the stale `running` row it was for eleven hours",
    run() {
      const now = "2026-09-08T11:30:00.000Z";
      assert.equal(
        lineageElapsedMs({ runs: [MEASURED], now, stalenessMs: STALENESS, isStale }),
        MEASURED_ATTEMPT_MS,
      );
      assert.equal(
        Date.parse(MEASURED.updatedAt) - Date.parse(MEASURED.createdAt),
        MEASURED_WALL_MS,
        "the wall-clock span is the figure this contract deletes",
      );
      assert.notEqual(MEASURED_ATTEMPT_MS, MEASURED_WALL_MS);

      // THE SAME RECORD AS IT STOOD AT 11:00Z — still `running`, never reclaimed, not yet swept.
      // Charging this at `now` is the original bill under a state name instead of a stamp.
      const asItStood = {
        ...MEASURED,
        state: "running",
        reclaimedAt: null,
        updatedAt: MEASURED.heartbeatAt,
      };
      const earlier = "2026-09-08T11:00:00.000Z";
      assert.equal(
        lineageElapsedMs({ runs: [asItStood], now: earlier, stalenessMs: STALENESS, isStale }),
        MEASURED_ATTEMPT_MS,
        "reclaimed and stale are the same physical fact and are charged identically",
      );
      assert.equal(
        Date.parse(earlier) - Date.parse(asItStood.createdAt),
        41_246_728,
        "…where `now` minus `createdAt` at that instant is the bill again",
      );

      // The declaration's own origin is not read: the same record stripped of it answers the same.
      const { brief, ...withoutDeclaration } = MEASURED;
      assert.equal(
        lineageElapsedMs({ runs: [withoutDeclaration], now, stalenessMs: STALENESS, isStale }),
        MEASURED_ATTEMPT_MS,
      );
    },
  },
  {
    name: "arch/126/00 FF-12601 leg 2: an attempt ends where its own record says it ended — four shapes, and the threshold is what tells the budget's question from the render's",
    run() {
      const now = at("12:00:00.000");
      const rows = [
        // settled — the close is the end, whatever the record beat, and the threshold is inert
        ["done", "10:00:00.000", "10:00:10.000", "10:00:20.000", null, STALENESS, 20_000],
        ["failed", "10:00:00.000", null, "10:00:20.000", null, STALENESS, 20_000],
        ["cancelled", "10:00:00.000", null, "10:00:05.000", null, STALENESS, 5_000],
        ["done", "10:00:00.000", "10:00:10.000", "10:00:20.000", null, undefined, 20_000],
        // reclaimed — the last liveness is the end, and the reclaim stamp is never read
        ["failed", "10:00:00.000", "10:00:30.000", "11:00:00.000", "11:00:00.000", STALENESS, 30_000],
        ["failed", "10:00:00.000", null, "11:00:00.000", "11:00:00.000", STALENESS, 3_600_000],
        ["failed", "10:00:00.000", "10:00:30.000", "11:00:00.000", "11:00:00.000", undefined, 30_000],
        // non-terminal and STALE — the shape the amendment adds, charged like a reclaim
        ["running", "10:00:00.000", "10:30:00.000", "10:30:00.000", null, STALENESS, 1_800_000],
        ["running", "10:00:00.000", "11:44:59.999", "11:44:59.999", null, STALENESS, 6_299_999],
        ["running", "10:00:00.000", null, "10:00:00.000", null, STALENESS, 0],
        ["queued", "10:00:00.000", null, "10:00:00.000", null, STALENESS, 0],
        // THE THRESHOLD TELLS THE TWO QUESTIONS APART — one record, two honest answers
        ["running", "10:00:00.000", "10:30:00.000", "10:30:00.000", null, undefined, 7_200_000],
        ["running", "10:00:00.000", "10:30:00.000", "10:30:00.000", null, null, 7_200_000],
        ["running", "10:00:00.000", "10:30:00.000", "10:30:00.000", null, 0, 7_200_000],
        ["running", "10:00:00.000", "10:30:00.000", "10:30:00.000", null, "900000", 7_200_000],
        // non-terminal and FRESH — it ends at `now` either way; `isStale` is strict `>`
        ["running", "10:00:00.000", "11:59:00.000", "11:59:00.000", null, STALENESS, 7_200_000],
        ["running", "10:00:00.000", "11:45:00.000", "11:45:00.000", null, STALENESS, 7_200_000],
        ["running", "12:00:00.000", null, "12:00:00.000", null, STALENESS, 0],
        ["running", "12:00:01.000", null, "12:00:01.000", null, STALENESS, 0],
        // an instant the record does not carry contributes nothing, and never NaN
        ["running", "absent", null, "absent", null, STALENESS, 0],
        ["done", "10:00:00.000", null, "absent", null, STALENESS, 0],
      ];
      for (const [state, createdAt, heartbeatAt, updatedAt, reclaimedAt, stalenessMs, ms] of rows) {
        const label = `${state} c=${createdAt} h=${heartbeatAt} u=${updatedAt} r=${reclaimedAt} s=${stalenessMs}`;
        const answer = lineageElapsedMs({
          runs: [record({ state, createdAt, heartbeatAt, updatedAt, reclaimedAt })],
          now,
          stalenessMs,
          isStale,
        });
        assert.equal(answer, ms, label);
        assert.ok(Number.isFinite(answer) && answer >= 0, `${label} — neither negative nor NaN`);
      }
    },
  },
  {
    name: "arch/126/00 FF-12601 leg 3: the staleness definition is the store's, handed in — the engine holds none of its own",
    run: async () => {
      const run = record({ state: "running", createdAt: "10:00:00.000", heartbeatAt: "10:30:00.000", updatedAt: "10:30:00.000" });
      const now = at("12:00:00.000");
      const calls = [];
      const spy = (...args) => {
        calls.push(args);
        return isStale(...args);
      };
      assert.equal(lineageElapsedMs({ runs: [run], now, stalenessMs: STALENESS, isStale: spy }), 1_800_000);
      assert.deepEqual(calls, [[run, Date.parse(now), STALENESS]], "the store's own (run, nowMs, threshold) shape");

      assert.equal(
        lineageElapsedMs({ runs: [run], now, stalenessMs: STALENESS }),
        7_200_000,
        "with no predicate to ask there is no stale attempt",
      );

      const engine = await source(ENGINE);
      assert.match(engine, /isStale\(/u, "the engine ASKS for the verdict");
      assert.doesNotMatch(
        engine,
        /(?:age|elapsed|Date\.parse)[^\n]*[<>]=?[^\n]*stalenessMs/u,
        "the engine compares no age against the threshold — it computes the liveness INSTANT and asks the handed-in predicate for the VERDICT",
      );
      assert.equal(
        (await read(ENGINE)).split("\n").filter((line) => /^import /u.test(line)).length,
        0,
        "src/work/loop.mjs imports nothing, exactly as it does today",
      );
      assert.doesNotMatch(
        engine,
        /heartbeatFromConfig|work\.loop\.heartbeatMs/u,
        "the threshold is passed in, never resolved inside the engine (69/FF-6901)",
      );
    },
  },
  {
    name: "arch/126/00 FF-12601 leg 4: the retryOf walk has ONE home, and it is the engine",
    run: async () => {
      const mk = (runId, retryOf) => record({ runId, retryOf, state: "done", createdAt: "10:00:00.000", updatedAt: "10:00:00.010" });
      const runs = [mk("C", "B"), mk("B", "A"), mk("A", null)];
      const walked = retryLineage({ runs, record: runs[0] });
      assert.deepEqual(walked.map((r) => r.runId), ["A", "B", "C"], "oldest first");
      assert.ok(Object.isFrozen(walked));

      assert.deepEqual(
        retryLineage({ runs: [mk("A", null)], record: mk("A", null) }).map((r) => r.runId),
        ["A"],
      );
      // a `retryOf` naming a run no record carries ends the walk there
      const broken = [mk("C", "B"), mk("B", "gone"), mk("A", null)];
      assert.deepEqual(retryLineage({ runs: broken, record: broken[0] }).map((r) => r.runId), ["B", "C"]);
      // a cycle ends the walk rather than spinning, and each record is visited at most once
      const cyclic = [mk("C", "B"), mk("B", "C")];
      assert.deepEqual(retryLineage({ runs: cyclic, record: cyclic[0] }).map((r) => r.runId), ["B", "C"]);

      // 129/04 (ADR-008 §3) — the summer's callers moved with the ladder into `src/loop/cycle.mjs`
      // (`budgetElapsedMs`, the one budget home); the shell and the wave reach the walk through it.
      // No member of the family traverses `retryOf` itself.
      for (const rel of [SHELL, "src/loop/cycle.mjs", "src/loop/wave.mjs"]) {
        assert.doesNotMatch(await source(rel), /\.retryOf/u, `${rel} declares no \`retryOf\` traversal of its own: the one walk is the engine's`);
      }
      assert.match(await source("src/loop/cycle.mjs"), /retryLineage\(/u, "…and the ladder's budget home calls it");
    },
  },
  {
    name: "arch/126/00 FF-12601 leg 5: the per-attempt term answers for ONE record, and says so when it cannot",
    run() {
      const rows = [
        ["failed", "2026-09-07T23:32:33.272Z", "2026-09-08T00:02:19.028Z", "2026-09-08T11:02:13.985Z", "2026-09-08T11:02:13.985Z", "2026-09-08T12:00:00.000Z", 1_785_756, 1_785_756],
        ["failed", "2026-09-08T10:00:00.000Z", null, "2026-09-08T11:00:00.000Z", "2026-09-08T11:00:00.000Z", "2026-09-08T12:00:00.000Z", 3_600_000, 3_600_000],
        ["done", "2026-09-08T10:00:00.000Z", "2026-09-08T10:12:00.000Z", "2026-09-08T10:18:00.000Z", null, "2026-09-08T12:00:00.000Z", 1_080_000, 1_080_000],
        ["running", "2026-09-08T10:00:00.000Z", "2026-09-08T10:10:00.000Z", "2026-09-08T10:10:00.000Z", null, "2026-09-08T10:25:00.000Z", 1_500_000, 1_500_000],
        ["running", "2026-09-08T10:00:00.000Z", "2026-09-08T10:10:00.000Z", "2026-09-08T10:10:00.000Z", null, "2026-09-08T10:40:00.000Z", 2_400_000, 600_000],
        ["running", "2026-09-08T10:00:00.000Z", null, "2026-09-08T10:00:00.000Z", null, "2026-09-08T10:25:00.000Z", 1_500_000, 0],
        ["running", "absent", null, "absent", null, "2026-09-08T12:00:00.000Z", null, null],
      ];
      for (const [state, createdAt, heartbeatAt, updatedAt, reclaimedAt, now, ms, staleMs] of rows) {
        const run = {
          runId: "r",
          retryOf: null,
          state,
          ...(createdAt === "absent" ? {} : { createdAt }),
          heartbeatAt,
          ...(updatedAt === "absent" ? {} : { updatedAt }),
          reclaimedAt,
        };
        assert.equal(attemptElapsedMs({ record: run, now }), ms, `${state} ${createdAt} @ ${now}`);
        assert.equal(
          attemptElapsedMs({ record: run, now, stalenessMs: STALENESS, isStale }),
          staleMs,
          `${state} ${createdAt} @ ${now} with the threshold`,
        );
      }
    },
  },
  {
    name: "arch/126/00 FF-12601 leg 6: the four attempt shapes compose into one total, order-blind, and downtime is the only difference the threshold makes",
    run() {
      const now = at("12:00:00.000");
      const runs = [
        record({ runId: "d", retryOf: "c", state: "running", createdAt: "11:50:00.000", heartbeatAt: "11:59:00.000", updatedAt: "11:59:00.000" }),
        record({ runId: "c", retryOf: "b", state: "running", createdAt: "11:00:00.000", heartbeatAt: "11:10:00.000", updatedAt: "11:10:00.000" }),
        record({ runId: "b", retryOf: "a", state: "done", createdAt: "10:30:00.000", heartbeatAt: "10:35:00.000", updatedAt: "10:40:00.000" }),
        record({ runId: "a", retryOf: null, state: "failed", createdAt: "10:00:00.000", heartbeatAt: "10:05:00.000", updatedAt: "10:20:00.000", reclaimedAt: "10:20:00.000" }),
      ];
      const contributions = {
        reclaimed: 5 * 60_000,   // a: last heartbeat − createdAt
        settled: 10 * 60_000,    // b: updatedAt − createdAt
        stale: 10 * 60_000,      // c: last heartbeat − createdAt
        fresh: 10 * 60_000,      // d: now − createdAt
      };
      const total = Object.values(contributions).reduce((sum, ms) => sum + ms, 0);
      const answer = lineageElapsedMs({ runs, now, stalenessMs: STALENESS, isStale });
      assert.equal(answer, total);
      for (const [shape, ms] of Object.entries(contributions)) {
        const one = runs.find((r) => ({ reclaimed: "a", settled: "b", stale: "c", fresh: "d" })[shape] === r.runId);
        assert.equal(attemptElapsedMs({ record: one, now, stalenessMs: STALENESS, isStale }), ms, shape);
      }
      // Without the threshold the stale attempt is read as alive; the totals differ by exactly
      // its downtime and by nothing else.
      const loose = lineageElapsedMs({ runs, now });
      assert.equal(loose - answer, (Date.parse(now) - Date.parse(at("11:10:00.000"))), "exactly the stale attempt's downtime");
      assert.ok(loose > answer);

      assert.equal(lineageElapsedMs({ runs: [], now, stalenessMs: STALENESS, isStale }), 0);
      const shuffled = [runs[2], runs[0], runs[3], runs[1]];
      assert.equal(lineageElapsedMs({ runs: shuffled, now, stalenessMs: STALENESS, isStale }), answer, "order-blind");
    },
  },
  {
    name: "arch/126/00 FF-12601 leg 7: the decider answers over milliseconds, keeps both answer shapes, and refuses anything that is not two numbers",
    run: async () => {
      const verdicts = [
        [0, 100, "admitted"], [1, 100, "admitted"], [99, 100, "admitted"],
        [100, 100, "halt"], [101, 100, "halt"],
        [0, 7_200_000, "admitted"], [1_785_756, 7_200_000, "admitted"], [7_199_999, 7_200_000, "admitted"],
        [7_200_000, 7_200_000, "halt"], [41_380_713, 7_200_000, "halt"],
      ];
      for (const [elapsedMs, ceilingMs, verdict] of verdicts) {
        const answer = decideScheduleToClose({ elapsedMs, ceilingMs });
        assert.equal(answer.act === "halt" ? "halt" : "admitted", verdict, `${elapsedMs}/${ceilingMs}`);
      }

      assert.deepEqual(decideScheduleToClose({ elapsedMs: 99, ceilingMs: 100 }), { admitted: true, ceilingMs: 100, elapsedMs: 99 });
      const halted = decideScheduleToClose({ elapsedMs: 100, ceilingMs: 100 });
      assert.equal(halted.stop, "deadline-exhausted");
      assert.equal(halted.producer, "loop:schedule-to-close>=ceiling");
      assert.equal(halted.deadline, "scheduleToClose");
      assert.equal(halted.ceilingMs, 100);
      assert.equal(halted.elapsedMs, 100);
      assert.equal(halted.disposition, "preserved-for-triage");

      // THE ELAPSED HALF — the two-instant form is REFUSED here rather than accepted on a branch.
      const twoInstant = decideScheduleToClose({ startedAt: at("10:00:00.000"), now: at("10:00:00.099"), ceilingMs: 100 });
      assert.equal(twoInstant.code, "loop-bound-unresolved");
      assert.equal(twoInstant.field, "scheduleToCloseMs");
      assert.equal(twoInstant.resolution, "elapsedMs");
      assert.doesNotMatch(JSON.stringify(twoInstant), /startedAt|"now"/u, "and names neither `startedAt` nor `now`");
      for (const elapsedMs of [undefined, -1, 1.5, "99"]) {
        const refused = decideScheduleToClose({ elapsedMs, ceilingMs: 100 });
        assert.equal(refused.code, "loop-bound-unresolved", String(elapsedMs));
        assert.equal(refused.resolution, "elapsedMs", String(elapsedMs));
      }
      // THE CEILING HALF — unchanged, and still decided FIRST.
      for (const ceilingMs of [0, null, "100"]) {
        const refused = decideScheduleToClose({ elapsedMs: 99, ceilingMs });
        assert.equal(refused.code, "loop-bound-unresolved", String(ceilingMs));
        assert.equal(refused.resolution, "work.loop.scheduleToCloseMs", String(ceilingMs));
      }
      assert.equal(
        decideScheduleToClose({ elapsedMs: -1, ceilingMs: 0 }).resolution,
        "work.loop.scheduleToCloseMs",
        "the ceiling is decided first",
      );

      // NO BRANCH KEEPS THE OLD ARITHMETIC ALIVE. The body is cut through the ONE home
      // (`test/support/source-slice.mjs`) rather than positionally: an `indexOf` sentinel end
      // assumes a declaration order nothing pins, and `47/F-47-04-ARCH-2` ledgers that class at
      // zero because six instruments in this repo were found wrong about the tree that way.
      const engine = await source(ENGINE);
      const body = functionBody(engine, "export function decideScheduleToClose(");
      assert.ok(body != null, "the decider's body is locatable — a failed cut is reported, never asserted over");
      assert.doesNotMatch(body, /startedAt/u, "the decider reads no start instant");
    },
  },
  {
    name: "arch/126/00 FF-12601 leg 8: both shell budget sites obtain elapsed from the summer, hand it the store's `isStale` and a threshold from the ONE bound home, and pass no instants",
    run: async () => {
      // 129/04 — THREE budget sites now, over the family: the shell's resume-lineage site, the
      // ladder's in-process retry site (`src/loop/cycle.mjs`, moved with the retry ladder) and the
      // wave's lane-resume site (`src/loop/wave.mjs`). Every one obtains its elapsed from the ONE
      // budget home (`budgetElapsedMs`, in the ladder module) and the summer is called exactly once.
      const shell = [await source(SHELL), await source("src/loop/cycle.mjs"), await source("src/loop/wave.mjs")].join("\n");
      const shellOnly = await source(SHELL);
      // The call's arguments are cut by MATCHING PARENS, not by a regex looking for the next
      // `})` — the elapsed argument is itself a call with a bag, so a non-greedy pattern would
      // stop inside it and assert over half the arguments. `47/F-47-04-ARCH-2`'s lesson applied
      // to a shape it does not itself catch.
      const callArgs = (needle) => {
        const found = [];
        for (let at = shell.indexOf(needle); at > -1; at = shell.indexOf(needle, at + 1)) {
          const span = matchedParenSpan(shell, at + needle.length - 1);
          assert.ok(span != null, `${needle} at ${at} closes`);
          found.push(span.body);
        }
        return found;
      };
      const calls = callArgs("decideScheduleToClose(");
      assert.equal(calls.length, 3, "exactly three deadline sites across the family");
      // The DECIDER's own keys, read at depth 0 — the elapsed argument is itself a call whose bag
      // legitimately carries a `now`, and a flat text sweep would see it and read the decider as
      // still taking instants.
      const topLevelKeys = (args) => {
        const keys = [];
        let depth = 0;
        for (let i = 0; i < args.length; i += 1) {
          const ch = args[i];
          if ("({[".includes(ch)) depth += 1;
          else if (")}]".includes(ch)) depth -= 1;
          else if (depth === 1) {
            const key = /^([A-Za-z_$][\w$]*)\s*:/u.exec(args.slice(i));
            if (key && !/[\w$]/u.test(args[i - 1] ?? "")) keys.push(key[1]);
          }
        }
        return keys;
      };
      for (const args of calls) {
        assert.deepEqual(
          topLevelKeys(args),
          ["elapsedMs", "ceilingMs"],
          "the decider is handed two numbers and nothing else — no `startedAt`, no `now`",
        );
        assert.match(args, /budgetElapsedMs\(/u, "elapsed comes from the summer, through the one budget home");
      }

      // THE ONE BUDGET HOME hands the summer both halves of the correction. A budget site that
      // omitted either would get a well-formed number that charges a dead runtime to `now` — the
      // original defect, restored silently, with nothing red. Routing both sites through one
      // helper is what makes that unrepresentable rather than merely unwritten.
      const summers = callArgs("lineageElapsedMs(");
      assert.equal(summers.length, 1, "one summer call, so neither budget site can drift from the other");
      assert.match(summers[0], /stalenessMs,/u, "the threshold is passed in, never defaulted at the call site");
      assert.match(summers[0], /isStale,/u, "the staleness definition is asked for, not restated");
      assert.match(summers[0], /retryLineage\(/u, "over the records the engine's one walk returns");

      // …and it traces to the ONE bound home, resolved ONCE per invocation and shared with the
      // reclaim sweep. That sharing is load-bearing rather than tidy: a run the sweep calls stale
      // and the clock calls alive is exactly the disagreement that reproduces the bill.
      assert.match(shellOnly, /const stalenessMs = heartbeatFromConfig\(ctx\.workspace\);/u);
      assert.match(shellOnly, /stalenessThreshold: stalenessMs,/u, "the reclaim sweep reads the same value");
      assert.equal(
        (shellOnly.match(/heartbeatFromConfig\(/gu) ?? []).length,
        2,
        "69/FF-6901: this module resolves the threshold only through loop-bounds, and adding a "
        + "consumer added no resolution",
      );
      assert.doesNotMatch(shell, /work\.loop\.heartbeatMs/u, "no member of the family names the config key");
      assert.doesNotMatch(shell.replace(shellOnly, ""), /heartbeatFromConfig\(/u, "the ladder and the wave resolve nothing: the threshold is handed to them");
      for (const args of calls) {
        assert.match(args, /stalenessMs/u, "each budget site passes the threshold — a site that omitted it would silently get the render's reading");
      }
    },
  },
  {
    // THE MEASURED LINEAGES, read off 124/00's OWN run folder rather than restated as literals.
    // This is the story's strongest evidence and the reason it exists: three real lineages, one
    // of which the wall clock refuses forever. If these records are ever pruned the test says so
    // rather than passing over an empty set.
    name: "arch/126/00 FF-12601 leg 10: the measured lineages — the summer admits what the wall clock refuses",
    run: async () => {
      const dir = path.join(
        root, "wiki", "work", "archive", "124_milestone_the-edges-aof-does-not-draw",
        "stories", "00_story_the-census-reports-its-denominator", "runs", "node-7297",
      );
      const records = new Map();
      for (const entry of await readdir(dir)) {
        if (!entry.endsWith(".json")) continue;
        const run = JSON.parse(await readFile(path.join(dir, entry), "utf8"));
        records.set(run.runId.slice(-5), run);
      }
      assert.ok(records.size >= 8, "124/00's run folder is present — the subject of this leg, not a literal");

      const rows = [
        { lineage: ["-0000"], now: "2026-09-08T11:30:00.000Z", attemptMs: 1_785_756, priorMs: 43_046_728, halts: true },
        { lineage: ["-0001", "-0002", "-0003"], now: "2026-09-08T13:10:00.000Z", attemptMs: 4_101_267, priorMs: 4_220_552, halts: false },
        { lineage: ["-0005", "-0006", "-0007"], now: "2026-09-08T15:40:00.000Z", attemptMs: 3_180_481, priorMs: 7_639_935, halts: true },
      ];
      const CEILING = 7_200_000;
      for (const row of rows) {
        const runs = row.lineage.map((id) => records.get(id));
        assert.ok(runs.every(Boolean), `every record of ${row.lineage.join(" -> ")} is on disk`);

        // The lineage is what the WALK returns, from the newest record, not what the row lists.
        const walked = retryLineage({ runs, record: runs.at(-1) });
        assert.deepEqual(walked.map((r) => r.runId.slice(-5)), row.lineage, `${row.lineage.join(" -> ")}: the walk finds it`);

        const attemptMs = lineageElapsedMs({ runs: walked, now: row.now, stalenessMs: STALENESS, isStale });
        assert.equal(attemptMs, row.attemptMs, `${row.lineage.join(" -> ")}: attempt time`);

        // The reading the two shell sites produced BEFORE this change: `now` minus the lineage
        // root's `createdAt`.
        const priorMs = Date.parse(row.now) - Date.parse(walked[0].createdAt);
        assert.equal(priorMs, row.priorMs, `${row.lineage.join(" -> ")}: the prior reading`);

        assert.equal(decideScheduleToClose({ elapsedMs: attemptMs, ceilingMs: CEILING }).admitted, true,
          `${row.lineage.join(" -> ")}: the summer ADMITS, leaving ${CEILING - attemptMs} ms`);
        const prior = decideScheduleToClose({ elapsedMs: priorMs, ceilingMs: CEILING });
        assert.equal(prior.act === "halt", row.halts,
          `${row.lineage.join(" -> ")}: the prior reading ${row.halts ? "halts" : "admits"}`);
      }

      // The same record read BOTH ways — as the reclaimed record it became, and as the stale
      // `running` record it was between 00:02Z and 11:02Z — for the same figure. That agreement
      // is the clearest available proof the two paths do not diverge.
      const measured = records.get("-0000");
      const asItStood = { ...measured, state: "running", reclaimedAt: null, updatedAt: measured.heartbeatAt };
      assert.equal(
        lineageElapsedMs({ runs: [asItStood], now: "2026-09-08T11:00:00.000Z", stalenessMs: STALENESS, isStale }),
        1_785_756,
      );
    },
  },
  {
    // ADR-001 §6's STATED COST, measured on the one lineage where nothing went down: the
    // inter-attempt latency this contract no longer charges. Named so the widening is a number
    // somebody chose rather than a consequence nobody measured.
    name: "arch/126/00 FF-12601 leg 11: the cost ADR-001 §6 names, measured on the lineage where nothing went down",
    run: async () => {
      const dir = path.join(
        root, "wiki", "work", "archive", "124_milestone_the-edges-aof-does-not-draw",
        "stories", "00_story_the-census-reports-its-denominator", "runs", "node-7297",
      );
      const runs = [];
      for (const entry of await readdir(dir)) {
        if (!entry.endsWith(".json")) continue;
        const run = JSON.parse(await readFile(path.join(dir, entry), "utf8"));
        if (["-0001", "-0002", "-0003"].includes(run.runId.slice(-5))) runs.push(run);
      }
      assert.equal(runs.length, 3);
      const walked = retryLineage({ runs, record: runs.at(-1) });
      const attemptMs = lineageElapsedMs({ runs: walked, now: "2026-09-08T13:10:00.000Z", stalenessMs: STALENESS, isStale });
      assert.equal(attemptMs, 4_101_267);

      const spanMs = Date.parse(walked.at(-1).updatedAt) - Date.parse(walked[0].createdAt);
      assert.equal(spanMs, 4_104_442, "root createdAt to the last record's updatedAt");
      assert.equal(spanMs - attemptMs, 3_175, "the inter-attempt latency this contract no longer charges");

      for (const elapsedMs of [attemptMs, spanMs]) {
        assert.equal(
          decideScheduleToClose({ elapsedMs, ceilingMs: 7_200_000 }).admitted,
          true,
          "both readings admit here, so the widening costs no verdict on this lineage",
        );
      }
    },
  },
  {
    name: "arch/126/00 FF-12601 leg 9: nothing new is persisted — the run record's seventeen keys (131 appended asks) and the declaration's eight are unchanged",
    run: async () => {
      const declaration = buildLoopDeclaration({
        loopRunId: "l", scope: "03", level: "L2", cap: 3, l3Gate: null,
        phase: "continue", cycle: 1, startedAt: at("10:00:00.000"), id: "id",
      });
      const declarationKeys = Object.keys(declaration);
      assert.equal(declarationKeys.length, 9, "126/02 appended the ninth, `supervised`, in its own contract — the expected succession this line anticipated");
      assert.deepEqual(declarationKeys.slice(0, 8).at(-1), "id", "…the first eight in the same order, ending `id`");

      const dir = await mkdtemp(path.join(tmpdir(), "aof-126-clock-"));
      try {
        const minted = await startRun({ ref: "03/01", dir }, { brief: { loop: declaration }, now: at("10:00:00.000") });
        const recordKeys = Object.keys(minted);
        // 131/ADR-003 §3 appended `asks` — instants and a decision, never a derived wait, so the
        // no-duration sweep below still holds over it.
        assert.equal(recordKeys.length, 17, "the run record has exactly the seventeen keys it has today");
        for (const key of [...recordKeys, ...declarationKeys]) {
          assert.doesNotMatch(
            key,
            /elapsed|accumulat|duration|attemptMs/iu,
            `no key of either names an accumulated or elapsed duration (${key})`,
          );
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
];
