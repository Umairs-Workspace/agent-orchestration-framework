// FF-12404 — "Cap exhaustion asks the engine, returns the EXISTING refine act aimed at a
// derived plan ref, and is bounded twice by counters that already exist."
//
// milestone 124 / story 01, ADR-005 §1-§7 and ADR-006. The STRUCTURAL half of the story; the
// driven half is `test/loop/loop-cap-exhaustion-carries-the-record.test.mjs`'s
// `loopCapExhaustionReturnsToThePlanTests`, and the split is deliberate — a walk's behaviour is
// measured by walking, and a claim about which module may spell a literal is measured by reading
// the tree. Neither half restates the other.
//
// WHAT THIS CONTROL EXISTS TO CATCH, in the contract's own words: a second
// `haltDecision("cap-exhausted", …)` written at the next cap site because that is where the trip
// is detected; a consult whose answer is computed and then discarded on one branch; a decider
// handed the engine's always-`undefined` `cycle` instead of the shell's counter; a thirteenth
// `LOOP_STOPS` member or a `plan` act kind added because the hand-off "is not really a drive"; a
// plan ref read off the record doc's authored `parent:` key; and a second counter, Set or
// persisted key that makes the bound a thing to keep in sync rather than a thing already kept.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  LOOP_STOPS,
  decideCycleCapExhaustion,
  decideReadySetExhausted,
  loopPlanRef,
  loopScopeIncludes,
} from "../../../src/work/loop.mjs";
import { LOOP_FIX_TRANSPORT_KEYS, loopCommand } from "../../../src/commands/loop.mjs";
// THE COMMENT STRIPPER, FROM ITS ONE HOME (chore 106 / TECH_DEBT item 24). A hand-rolled one is
// what `acd-comment-stripper-order` exists to refuse: strip block comments first and a line
// comment containing `/*` blinds every source-reading assertion below it, so an absence sweep
// passes over what it can no longer see. The shared scanner keeps that lesson by construction —
// a `/*` inside a line comment cannot open a block run — and it also leaves string content alone,
// which matters here because a PRODUCER NAME is a string and the strings are the subject.
import { stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ENGINE = "src/work/loop.mjs";
const SHELL = "src/commands/loop.mjs";
const DRIVER = "src/commands/drive.mjs";

/** Every `.mjs` under `src/`, relative and forward-slashed. */
async function sourceModules() {
  const dir = path.join(root, "src");
  const entries = await readdir(dir, { recursive: true });
  return entries
    .map((entry) => `src/${String(entry).replaceAll("\\", "/")}`)
    .filter((rel) => rel.endsWith(".mjs"))
    .sort();
}

const read = async (rel) => await readFile(path.join(root, rel), "utf8");

/** The keys `drive()` mints, taken from a drive act the engine produces on an untouched path. */
const DRIVE_KEYS = ["act", "ref", "phase", "cycle"];

export const archTests = [
  {
    name: "arch/124/01 FF-12404 leg 1: ONE module decides this stop — no other module under src/ spells `cap-exhausted`, and none spells `loop-cycle-cap` at all",
    run: async () => {
      const modules = await sourceModules();
      assert.ok(modules.length > 100, `non-vacuity: the sweep read ${modules.length} modules under src/`);
      assert.ok(modules.includes(ENGINE) && modules.includes(SHELL), "…including both halves of the loop");

      const offenders = [];
      for (const rel of modules) {
        if (rel === ENGINE) continue;
        if (stripComments(await read(rel)).includes("cap-exhausted")) offenders.push(rel);
      }
      assert.deepEqual(offenders, [], "the stop is named in the engine and nowhere else — the shell consults, it does not decide");

      // NON-VACUITY: the engine really does spell it, so an empty offender list is a property of
      // the tree rather than of a sweep that reads nothing.
      assert.ok(stripComments(await read(ENGINE)).includes("cap-exhausted"), "guard: the engine spells the stop");

      // AND THE SHELL'S OWN PRODUCER IS GONE ENTIRELY — comments included, because the string
      // is the thing an operator greps for and a stale one sends them to a site that is not there.
      for (const rel of modules) {
        assert.equal((await read(rel)).includes("loop-cycle-cap"), false, `${rel} no longer names the shell's own cap producer`);
      }
    },
  },

  {
    name: "arch/124/01 FF-12404 leg 2 (task 00): the act the invocation performs is the act the decider returned — the four answers the cycle-cap branch can receive",
    run: () => {
      const rows = [
        { input: { ref: "124/01", type: "story", phase: "continue", cycle: 4, cap: 3, scope: "120-130", planReEntries: 0 }, act: { act: "drive", ref: "124", phase: "refine", cycle: 1 } },
        { input: { ref: "124", type: "milestone", phase: "verify", cycle: 4, cap: 3, scope: "120-130", planReEntries: 0 }, act: { act: "drive", ref: "124", phase: "refine", cycle: 1 } },
        { input: { ref: "124", type: "milestone", phase: "refine", cycle: 4, cap: 3, scope: "120-130", planReEntries: 3 }, halt: "engine:plan-re-entry>=cap" },
        { input: { ref: "124/01", type: "story", phase: "continue", cycle: 4, cap: 3, scope: "124", planReEntries: 3 }, halt: "engine:plan-re-entry>=cap" },
      ];
      for (const row of rows) {
        const act = decideCycleCapExhaustion(row.input);
        if (row.act) {
          assert.deepEqual(act, row.act, `${row.input.ref} under ${row.input.phase} with ${row.input.planReEntries} re-entries drives the plan`);
          // THE KEY SET IS `drive()`'s, WITH NO KEY THE ENGINE'S OTHER DRIVE ACTS LACK.
          assert.deepEqual(Object.keys(act).sort(), [...DRIVE_KEYS].sort(), "the hand-off mints no key of its own");
        } else {
          assert.equal(act.act, "halt", `${row.input.ref} with ${row.input.planReEntries} re-entries is terminal`);
          assert.equal(act.stop, "cap-exhausted", "…keeping the stop it already had");
          assert.equal(act.producer, row.halt);
          assert.equal(act.plan, "124", "…naming the plan it refused");
        }
      }
    },
  },

  {
    name: "arch/124/01 FF-12404 leg 3 (task 01): the plan ref is DERIVED from the item graph — three shapes, and the one that disagrees with itself",
    run: () => {
      // `listItems` builds a story's `ref` as `${number}/${sNumber}` and its `parent` as `number`
      // from ONE directory walk, so the ref grammar answers all three shapes with no second
      // source of truth. The fourth row is the disagreement: an authored key the derivation
      // never sees, because the shell supplies none.
      assert.equal(loopPlanRef({ ref: "124/01", type: "story" }), "124", "a story's plan is its parent milestone");
      assert.equal(loopPlanRef({ ref: "124", type: "milestone" }), "124", "a driver's plan is itself");
      assert.equal(loopPlanRef({ ref: "79", type: "story" }), "79", "a parentless story IS a driver of the stream");
      assert.equal(loopPlanRef({ ref: "124/01", type: "story", parent: 124 }), "124", "a directory-derived parent agrees with the ref");

      // THE DERIVATION READS NO RECORD DOC AND NO FRONTMATTER KEY. It is a function of the ref,
      // and the module it lives in reaches no filesystem at this seam.
      const body = stripComments(String(loopPlanRef));
      for (const forbidden of ["parseFrontmatter", "readFile", "meta", "STORY.md", "frontmatter"]) {
        assert.equal(body.includes(forbidden), false, `the derivation names no ${forbidden}`);
      }

      // AND THE SHELL SUPPLIES NO AUTHORED KEY: its one call site passes what `work:next`
      // answered, and `ready()` (`src/work.mjs:1301-1308`) carries no `parent` at all.
      assert.equal(body.includes("input?.parent"), true, "a caller-supplied parent is still honoured, which is what makes the out-of-scope guard reachable");
    },
  },

  {
    name: "arch/124/01 FF-12404 leg 4 (task 03): a plan ref outside the declared scope is TERMINAL and names the plan",
    run: () => {
      const act = decideCycleCapExhaustion({ ref: "124/01", type: "story", parent: 77, phase: "continue", cycle: 4, cap: 3, scope: "120-130", planReEntries: 0 });
      assert.equal(act.act, "halt", "a drive is never produced for a ref outside the declared scope");
      assert.equal(act.stop, "cap-exhausted");
      assert.equal(act.producer, "engine:plan-out-of-scope");
      assert.equal(act.plan, "77", "the out-of-scope plan ref is named in the halt");

      // THE PROPERTY THAT MAKES THE GUARD UNREACHABLE THROUGH THE COMMAND, pinned rather than
      // assumed: a derived plan ref always carries the same leading driver number as the unit it
      // came from, so it is in scope whenever the unit is. A future ref grammar that loosened
      // this reds here rather than silently widening the walk.
      for (const ref of ["124/01", "124", "79", "7/00", "1000/99"]) {
        const plan = loopPlanRef({ ref });
        for (const scope of ["124", "120-130", "79", "7", "1000", "1-2000"]) {
          assert.equal(
            loopScopeIncludes(scope, plan),
            loopScopeIncludes(scope, ref),
            `${ref} and its derived plan ${plan} are in scope together under ${scope}`,
          );
        }
      }
      // …and `decideLoopScope` admits only the two forms that derivation is safe under.
      assert.equal(loopScopeIncludes("124", "124/01"), true, "guard: the scope check has teeth");
      assert.equal(loopScopeIncludes("124", "77"), false);
    },
  },

  {
    name: "arch/124/01 FF-12404 leg 5 (task 01): the phase comes from the set the driver admits, and the stop vocabulary is 124's twelve unrenamed plus only the three lane stops 129/01 appended after them",
    run: async () => {
      const act = decideCycleCapExhaustion({ ref: "124/01", type: "story", phase: "continue", cycle: 4, cap: 3, scope: "124", planReEntries: 0 });
      const driverBody = await read(DRIVER);
      const phases = /PHASES\s*=\s*Object\.freeze\(\[([^\]]*)\]\)/u.exec(driverBody)?.[1];
      assert.ok(phases != null, "guard: `PHASES` was found in the phase-driver module");
      const admitted = [...phases.matchAll(/"([a-z]+)"/gu)].map((match) => match[1]);
      assert.deepEqual(admitted, ["refine", "continue", "verify"], "guard: the admitted phase set is the one the contract cites");
      assert.ok(admitted.includes(act.phase), "the hand-off's phase is one `createPhaseDriverCommand` admits");
      // …AND A REGISTERED COMMAND EXISTS FOR IT. The id is BUILT from the phase
      // (`work:drive-${phase}`, `drive.mjs:105`) and the phase's own driver is exported at
      // `:362`, so the pair is asserted rather than a literal string being grepped for — a
      // literal would go stale the moment the id template changed, which is the drift 62/ADR-003
      // names.
      assert.ok(/id:\s*`work:drive-\$\{phase\}`/u.test(driverBody), "the driver's id is built from the phase it admits");
      assert.ok(new RegExp(`createPhaseDriverCommand\\("${act.phase}"\\)`, "u").test(driverBody), `a ${act.phase} driver is exported`);

      // NO STOP ADDED FOR THE HAND-OFF: 124's twelve, in the same order — and after them ONLY
      // the three lane stops 129/01 appended (129/ADR-008 §5), none of which the hand-off
      // raises. A `plan-exhausted` slipped in anywhere is a red here.
      assert.deepEqual([...LOOP_STOPS], [
        "uat-gate", "dependency-blocked", "cap-exhausted", "deadline-exhausted", "progress-exhausted",
        "no-progress", "grade-indeterminate", "session-needs-input", "run-not-retryable", "retry-parked",
        "unmapped-item-type", "operator-interrupt",
        "lane-open-failed", "lane-merge-refused", "lane-merge-conflict",
      ], "the vocabulary is 124's 12 members in the same order, then 129's 3 lane stops");

      // NO ACT KIND OUTSIDE `{done, drive, gate, halt}` — over every act this story's deciders
      // can mint, plus the exhausted-ready-set terminus.
      const kinds = new Set([
        decideCycleCapExhaustion({ ref: "124/01", phase: "continue", cycle: 4, cap: 3, scope: "124", planReEntries: 0 }).act,
        decideCycleCapExhaustion({ ref: "124/01", phase: "continue", cycle: 4, cap: 3, scope: "124", planReEntries: 3 }).act,
        decideReadySetExhausted({ ref: "124/01", cap: 3 }).act,
      ]);
      for (const kind of kinds) assert.ok(["done", "drive", "gate", "halt"].includes(kind), `${kind} is an existing act kind`);

      // AND NO NEW COMMAND ID: the loop's own id is unchanged.
      assert.equal(loopCommand.id, "work:loop");
    },
  },

  {
    name: "arch/124/01 FF-12404 leg 6 (task 02): no counter, no persisted key, and no second bound — the shapes that may not grow",
    run: async () => {
      // THE TRANSPORT IS STILL EXACTLY ITS NINE KEYS.
      assert.deepEqual([...LOOP_FIX_TRANSPORT_KEYS], [
        "buildRun", "resumeBuildRun", "findings", "changeUnderReview", "changeBaseline",
        "blocker", "blockers", "blockerCount", "progressContinuation",
      ], "the fix transport gained nothing");

      // THE LOOP DECLARATION IS STILL EXACTLY ITS EIGHT KEYS, read off the module that builds it.
      const engine = await read(ENGINE);
      const declaration = /export function buildLoopDeclaration[\s\S]*?\n  return \{([\s\S]*?)\n  \};/u.exec(engine)?.[1];
      assert.ok(declaration != null, "guard: the declaration's return shape was found");
      const declared = [...declaration.matchAll(/^\s{4}([a-zA-Z]+):/gmu)].map((match) => match[1]);
      assert.equal(declared.length, 9, `the loop declaration written to each run record has exactly 9 keys (found ${declared.join(", ")})`);

      // THE SHELL HOLDS ONE CYCLE COUNTER, RECONSTRUCTED IN ONE PLACE. A second Map — or a Set of
      // "already handed off" refs persisted beside the runs — is the shape ADR-005 §5 refuses.
      const shell = stripComments(await read(SHELL));
      assert.equal((shell.match(/reconstructCycleCounts\(/gu) ?? []).length, 2, "one definition, one call — the counter is rebuilt in exactly one place");
      assert.equal((shell.match(/\$\{plan\}\\0refine/gu) ?? []).length, 1, "the plan's re-entry count is read under the key the counter already uses");
      assert.equal(shell.includes("planReEntries: cycles.get("), true, "…off the SAME Map, never a new one");

      // AND THE SET-ASIDE IS IN-PROCESS: it is a `Set` the walk holds, and nothing writes it.
      assert.equal((shell.match(/const setAside = new Set\(\)/gu) ?? []).length, 1, "one in-process set-aside");
      assert.equal(/setAside[^\n]*writeFile|writeFile[^\n]*setAside/u.test(shell), false, "…that is never persisted");
    },
  },

  {
    name: "arch/124/01 FF-12404 leg 7 (task 00, ADR-006): the shell hands the decider ITS OWN cycle — `nextDecision` still passes none, and the engine's dead branches stay dead",
    run: async () => {
      const shell = stripComments(await read(SHELL));

      // THE SIX CALL SITES, AND NOT ONE OF THEM NAMES `cycle`. This is ADR-006's measurement,
      // re-asserted so that "helpfully" wiring one key — one live branch beside three dead — is a
      // red rather than a quiet behaviour change.
      const calls = [...shell.matchAll(/nextDecision\([^;]*?\);/gsu)].map((match) => match[0]).filter((call) => !call.includes("async function"));
      assert.equal(calls.length, 6, `six \`nextDecision\` call sites (found ${calls.length})`);
      for (const call of calls) {
        assert.equal(/\bcycle\b/u.test(call), false, "no `nextDecision` call site passes a cycle");
      }

      // THE SEVENTH ENTRY IS NOT `nextDecision` AND DOES PASS ONE — the direct `decideLoop` call
      // that keeps `src/work/loop.mjs:910` LIVE. 124/ADR-006's "four dead branches" is three, and
      // this story must not assert otherwise: `test/loop/loop-only-fail-redrives.test.mjs` drives
      // that branch green today.
      const direct = /requireDecision\(decideLoop\(\{[\s\S]*?\}\)\);/gu;
      const directCalls = [...shell.matchAll(direct)].map((match) => match[0]);
      assert.ok(directCalls.some((call) => /\bcycle,/u.test(call) && /\bgate:/u.test(call)), "the direct `decideLoop` call passes a real cycle and gate");

      // AND THE CYCLE-CAP BRANCH PASSES THE SHELL'S OWN COUNTER, never the engine's undefined one.
      const consult = /decideCycleCapExhaustion\(\{[\s\S]*?\}\);/u.exec(shell)?.[0];
      assert.ok(consult != null, "the shell consults the engine at the cycle-cap branch");
      assert.ok(/cycle,/u.test(consult), "…handing it the cycle it was already holding");
      assert.ok(/cap: resolved\.cap/u.test(consult), "…and the invocation's own resolved cap");
      assert.equal((shell.match(/decideCycleCapExhaustion\(/gu) ?? []).length, 1, "exactly ONE consult site — a second cap site would be a second decision");
    },
  },

  {
    name: "arch/124/01 FF-12404 leg 8 (task 03): every `cap-exhausted` producer still carries a name, and only the shell's site became non-terminal",
    run: async () => {
      const engine = stripComments(await read(ENGINE));
      // EVERY SITE THAT SPELLS THE STOP NAMES A PRODUCER — the leg that keeps a halt greppable.
      const sites = [...engine.matchAll(/halt\(\s*"cap-exhausted"\s*,\s*"([^"]+)"/gu)].map((match) => match[1]);
      assert.ok(sites.length >= 6, `every cap-exhausted site names a producer (found ${sites.length})`);
      for (const producer of sites) assert.notEqual(producer, "", "a non-empty producer string");
      const named = new Set(sites);
      for (const producer of ["review:rounds>=hard-cap", "review:rounds>=cap", "engine:cycle>=cap"]) {
        assert.ok(named.has(producer), `${producer} is unchanged`);
      }
      for (const producer of ["engine:plan-re-entry>=cap", "engine:plan-out-of-scope", "engine:ready-set-exhausted"]) {
        assert.ok(named.has(producer), `${producer} is this story's, and it is the engine's`);
      }
      // `run-store:attempts-exhausted` is mapped rather than halted, and is still terminal.
      assert.ok(engine.includes("run-store:attempts-exhausted"), "the store refusal keeps its producer");

      // ONLY ONE SITE IN THE SHELL'S WALK DOES NOT RETURN ON A HALT. Every other decision that
      // answers `halt` returns the state immediately; the hand-off is the single exception, and a
      // second one would be a stop quietly behaving differently from the eleven beside it.
      const shell = stripComments(await read(SHELL));
      const handOff = /if \(capDecision\.act === "halt"\) \{[\s\S]{0,1200}?return state;/u.exec(shell);
      assert.ok(handOff != null, "the consult's halt answer returns immediately, exactly as every other stop does");
      assert.equal((shell.match(/capDecision\.act === "halt"/gu) ?? []).length, 1, "…at one site, so no second stop can be routed through the same question");
      assert.equal((shell.match(/setAside\.add\(/gu) ?? []).length, 1, "exactly one site sets a unit aside");
    },
  },

  {
    name: "arch/124/01 FF-12404 leg 9 (task 03): every other stop — the fourteen — still ENDS the range — one return site, and the hand-off is the single exception",
    run: async () => {
      // A STOP VOCABULARY IN WHICH ONE MEMBER QUIETLY BEHAVES DIFFERENTLY IS WORSE THAN AN OPEN
      // ONE, so the others are asserted rather than assumed — and asserted as a CLASS, which is
      // the honest shape here. The walk does not branch per stop: every `halt` act reaches ONE
      // site, which returns the state without asking `work:next` again. Driving fourteen agent
      // sessions to re-measure one `if` would be fourteen fixtures proving a property of a line.
      // (Eleven when 124 wrote this; 129/01 appended three lane stops, which end the range the
      // same way — 129/ADR-002 §3's "a lane that cannot be merged home is a named stop".)
      const shell = stripComments(await read(SHELL));
      const walk = /for \(;;\) \{[\s\S]*?\n {2}\} finally \{/u.exec(shell)?.[0];
      assert.ok(walk != null, "guard: the walk's body was found");

      // THE ONE SITE. Every stop the engine raises arrives as `act.act === "halt"` and is
      // returned there; `done` shares it, which is why the test reads the pair.
      const returns = walk.match(/if \(act\.act === "done" \|\| act\.act === "halt"\) \{/gu) ?? [];
      assert.equal(returns.length, 1, "exactly one site reads a decision's kind and ends the range");
      assert.ok(/if \(act\.act === "done" \|\| act\.act === "halt"\) \{[\s\S]{0,900}?return state;/u.test(walk), "…and it returns");

      // …AND THE SINGLE EXCEPTION IS THE CYCLE-CAP BRANCH, entered on a CYCLE COUNT rather than
      // on a stop's name — so no stop can be routed into it by being renamed, and a second
      // `cap-exhausted` producer (a review-round cap, the store's attempt ceiling) cannot become
      // non-terminal by sharing the word.
      assert.equal((walk.match(/setAside\.add\(/gu) ?? []).length, 1, "one unit-set-aside site");
      assert.ok(/if \(cycle > resolved\.cap\) \{/u.test(walk), "…entered on the shell's own cycle count, not on a stop name");
      assert.equal(/setAside\.add\([\s\S]{0,200}?stop/u.test(walk), false, "the hand-off never reads a stop's name");

      // THE FOURTEEN, NAMED. Each is a member of the vocabulary and none of them is the one this
      // story changed — so "the others" is a computed set rather than a list that can drift; the
      // count is pinned so a member added without a home here is noticed.
      const others = LOOP_STOPS.filter((stop) => stop !== "cap-exhausted");
      assert.equal(others.length, 14, "fourteen other stops — 124's eleven and 129's three lane stops");
      for (const stop of others) {
        assert.ok(LOOP_STOPS.includes(stop));
        // None of them is spelled at the hand-off, in either module.
        assert.equal(new RegExp(`setAside[^\\n]*${stop}|${stop}[^\\n]*setAside`, "u").test(shell), false, `${stop} is not routed through the hand-off`);
      }
    },
  },

  {
    name: "arch/124/01 FF-12404 NON-VACUITY: each leg's detector fires on a planted violation",
    run: async () => {
      // A PLANTED SECOND SPELLER of the stop is caught by leg 1's reading, driven over text
      // rather than by editing a file.
      const planted = "const halt = haltDecision(\"cap-exhausted\", act.ref, \"loop-cycle-cap\");";
      assert.equal(stripComments(planted).includes("cap-exhausted"), true, "leg 1 sees a planted second speller");
      assert.equal(stripComments("// a comment mentioning cap-exhausted\n").includes("cap-exhausted"), false, "…and does NOT see the comment that explains the rule");

      // A PLANTED `cycle` ON A `nextDecision` CALL is caught by leg 7's reading.
      assert.equal(/\bcycle\b/u.test("nextDecision(scope, level, cap, ctx, { l3Gate, cycle });"), true, "leg 7 sees a planted cycle");
      assert.equal(/\bcycle\b/u.test("nextDecision(scope, level, cap, ctx, { l3Gate: resolved.l3Gate, setAside });"), false, "…and is quiet on the real call");

      // A DECIDER THAT READ THE AUTHORED KEY would answer `77` for a story sitting under `124`.
      // The shipped one is never given the key, so the two answers are genuinely different.
      assert.notEqual(loopPlanRef({ ref: "124/01", parent: 77 }), loopPlanRef({ ref: "124/01" }), "a supplied parent really does change the answer, so 'the shell supplies none' is load-bearing");

      // AND A HAND-OFF WITH NO BOUND would drive forever: at `planReEntries` one below the cap it
      // still drives, and at the cap it must not.
      assert.equal(decideCycleCapExhaustion({ ref: "124/01", cap: 3, scope: "124", planReEntries: 2 }).act, "drive");
      assert.equal(decideCycleCapExhaustion({ ref: "124/01", cap: 3, scope: "124", planReEntries: 3 }).act, "halt");
      // …and a cap that never resolved is terminal rather than unbounded.
      assert.equal(decideCycleCapExhaustion({ ref: "124/01", scope: "124", planReEntries: 0 }).act, "halt", "an unresolved cap halts rather than driving without a bound");
    },
  },
];
