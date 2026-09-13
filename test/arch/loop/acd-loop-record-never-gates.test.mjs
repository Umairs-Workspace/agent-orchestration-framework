// FF-7808 (78/ADR-007) — THE RECORD NEVER GATES. No status, doctor, validate or acceptor door reads
// the signature as a verdict, and doctor's findings for it carry severity `warn`.
//
// THIS IS THE MILESTONE'S MOST DELIBERATE RESTRAINT, and three arguments stand behind it. 66 faced
// exactly this question about the observability report and declined (*"the measure→decide path already
// works through a human"*). 59's thesis is that an agent-generated record a human rubber-stamps *"may
// be worse than none, because it launders a machine claim as human judgement."* And the measurement
// taken at 78's refine settles it: 0 of 61 run records carry `brief.loop`, so a gate's first act would
// be to refuse every accept in the stream over a fact no operator can currently supply. A gate whose
// first act is to block the whole stream is not a gate, it is an outage.
//
// A PROMISE IS NOT AN INVARIANT, so this gate asserts the property four independent ways:
//   1. THE SEVERITY IS A CONSTANT — the lane cannot emit an `error`, for any input, on any item
//      status. Asserted structurally AND by running it over every cause it has.
//   2. THE CODES ARE STRUCTURALLY UNGATEABLE — they are a different frozen array from
//      `CONTROL_FINDING_CODES`, and `DOCTOR_GATE_CODES` is DERIVED from that array, so no member of
//      this lane's set can reach the loop's gate ladder even at `error`.
//   3. NO DOOR NAMES THE SIGNATURE — the four doors ADR-007 names are swept for the sign-off
//      vocabulary and the record's basename.
//   4. BEHAVIOURALLY — an item carrying an unsigned record moves to `done`, and `work:validate` is
//      green over a stream whose only findings come from this lane.
import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { invoke } from "../../../src/command-core.mjs";
import { CHECK_GROUPS, doctorWork } from "../../../src/work/doctor.mjs";
import { CONTROL_FINDING_CODES } from "../../../src/work/doctor-controls.mjs";
import { DOCTOR_GATE_CODES } from "../../../src/commands/loop.mjs";
import { LOOP_RECORD_FINDING_CODES, loopRecordLane } from "../../../src/work/doctor-loop-record.mjs";
import { loopRecordCommand } from "../../../src/commands/loop-record.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import { ITEM_REF, ctxFor, signInPlace, withRepo } from "../../loop/loop-record-command.test.mjs";
import { seedGreenRegressionGate } from "../../support/regression-gate-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The four doors ADR-007 names, plus the acceptor's two leaves. A door that read the signature would
// have to name it, so the sweep is over the vocabulary a reader of the block would need.
const DOORS = [
  "src/commands/item-status.mjs",
  "src/commands/validate.mjs",
  "src/work-acceptor/admissibility.mjs",
  "src/work-acceptor/rule.mjs",
];

const SIGNATURE_VOCABULARY = ["EXECUTION.md", "Sign-off", "SIGNOFF", "signoff", "isSignedRow", "loop-record-unsigned", "loopEngagements"];

const NOWHERE = path.join("no-such-root-ff7808", "item");
const BLOCK = ["## Sign-off", "", "| loop | signer | date | verdict |", "|---|---|---|---|"];
const document = (...rows) => ["# 03", "", ...BLOCK, ...rows, ""].join("\n");

// Every cause this lane has, as literal snapshot items — so claim 1 is measured over the lane's whole
// answer surface rather than over one convenient input.
const EVERY_CAUSE = [
  { code: "loop-record-unsigned", text: document("| loop:a | — | — | — |"), engagements: ["loop:a"] },
  { code: "loop-record-part-signed", text: document("| loop:a | U | 2026-09-03 | accepted |", "| loop:b | — | — | — |"), engagements: ["loop:a", "loop:b"] },
  { code: "loop-record-stale", text: document("| loop:a | — | — | — |"), engagements: ["loop:a", "loop:b"] },
  { code: "loop-record-malformed", text: document("| loop:a | — | — | — |").replace("## Sign-off", "## Signoff"), engagements: ["loop:a"] },
];

const itemFor = (cause, index, status) => ({
  ref: `1${index}`,
  dir: path.join(NOWHERE, `i${index}`),
  type: "milestone",
  status,
  meta: { status },
  executionRecord: { present: true, text: cause.text },
  loopEngagements: cause.engagements,
});

export const archTests = [
  {
    name: "arch/78/03 FF-7808 the lane cannot emit an error — for any cause, on any item status",
    run: async () => {
      // Every cause × every status the lifecycle has, including `done`, where `severityFor` would
      // answer `error` if this lane consulted the acceptance horizon. It does not, and that opting-out
      // is the deliberate choice ADR-007 makes.
      const statuses = ["not-started", "in-progress", "in-review", "blocked", "done"];
      let produced = 0;
      for (const status of statuses) {
        const items = EVERY_CAUSE.map((cause, index) => itemFor(cause, index, status));
        const findings = loopRecordLane({ items });
        assert.deepEqual(
          [...new Set(findings.map((entry) => entry.code))].sort(),
          [...LOOP_RECORD_FINDING_CODES].sort(),
          `every cause fires while the items are ${status}`,
        );
        for (const entry of findings) assert.equal(entry.severity, "warn", `${entry.code} is warn on a ${status} item`);
        produced += findings.length;
      }
      assert.equal(produced, statuses.length * EVERY_CAUSE.length, "the sweep is non-vacuous");

      // …and structurally: the module holds exactly ONE severity literal, so no future caller can
      // harden one code without this gate reding.
      const code = stripComments(await readFile(path.join(repoRoot, "src/work/doctor-loop-record.mjs"), "utf8"));
      assert.equal((code.match(/"error"/g) ?? []).length, 0, "the lane names no error severity anywhere");
      assert.equal((code.match(/ADVISORY_SEVERITY\s*=\s*"warn"/g) ?? []).length, 1, "its severity is one constant");
      assert.doesNotMatch(code, /severityFor|acceptance|horizon\b/, "and it consults no acceptance horizon");
    },
  },
  {
    name: "arch/78/03 FF-7808 the lane's codes are structurally incapable of reaching a gate",
    run: () => {
      // `DOCTOR_GATE_CODES` — the loop's gate ladder's admitted set — is DERIVED from
      // `CONTROL_FINDING_CODES`. A code in neither array cannot be admitted by that ladder even if
      // something did emit it at `error`, which is what makes "never gates" a property of the shape
      // rather than a promise about behaviour.
      for (const code of LOOP_RECORD_FINDING_CODES) {
        assert.ok(!CONTROL_FINDING_CODES.includes(code), `${code} is not a control finding code`);
        assert.ok(!DOCTOR_GATE_CODES.includes(code), `${code} is not admitted by the loop's gate ladder`);
      }
      // Non-vacuity: the two arrays this claim is about are real and non-empty, and the ladder really
      // does admit something — otherwise the assertions above would hold for any string.
      assert.ok(CONTROL_FINDING_CODES.length > 0 && DOCTOR_GATE_CODES.length > 0);
      assert.ok(DOCTOR_GATE_CODES.every((code) => CONTROL_FINDING_CODES.includes(code)), "the ladder's set is derived from the controls'");
      assert.equal(LOOP_RECORD_FINDING_CODES.length, 4, "and this lane's set is the four codes its contract names");
    },
  },
  {
    name: "arch/78/03 FF-7808 no status, validate or acceptor door names the signature",
    run: async () => {
      for (const rel of DOORS) {
        const source = stripComments(await readFile(path.join(repoRoot, rel), "utf8"));
        for (const token of SIGNATURE_VOCABULARY) {
          assert.ok(!source.includes(token), `${rel} carries no token naming the record or its signature (${token})`);
        }
      }
      // AND THE ACCEPTOR FAMILY WHOLESALE, not just its two named leaves — a door added later would
      // otherwise be outside the sweep.
      const acceptorDir = path.join(repoRoot, "src/work-acceptor");
      const leaves = (await readdir(acceptorDir)).filter((name) => name.endsWith(".mjs"));
      assert.ok(leaves.length >= 2, "the acceptor sweep is non-vacuous");
      for (const name of leaves) {
        const source = stripComments(await readFile(path.join(acceptorDir, name), "utf8"));
        for (const token of SIGNATURE_VOCABULARY) {
          assert.ok(!source.includes(token), `src/work-acceptor/${name} carries no token naming the record (${token})`);
        }
      }
      // `src/work/doctor.mjs` IS permitted to name the record — it performs the snapshot read at the
      // engine's one impure edge — but it must not judge it: no severity decision, no signed test.
      const engine = stripComments(await readFile(path.join(repoRoot, "src/work/doctor.mjs"), "utf8"));
      assert.ok(engine.includes("EXECUTION_RECORD_BASENAME"), "the engine reads the record (the impure edge)");
      for (const token of ["isSignedRow", "readSignoff", "Sign-off", "loop-record-unsigned"]) {
        assert.ok(!engine.includes(token), `but it renders no verdict about it (${token})`);
      }
    },
  },
  {
    name: "arch/78/03 FF-7808 an unsigned record blocks nothing — `done` succeeds and validate is green",
    run: async () => {
      await withRepo({}, async (repo) => {
        const ctx = await ctxFor(repo);
        await loopRecordCommand.run({ ref: ITEM_REF, write: true }, ctx);

        // The record is UNSIGNED and doctor says so…
        const findings = await doctorWork(repo.workDir, { name: "fixture" }, undefined, { groups: [loopRecordLane], projectRoot: repo.root });
        assert.deepEqual(findings.map((entry) => entry.code), ["loop-record-unsigned"]);

        // …`work:validate` is green over the same stream — a warn-only doctor result cannot fail it…
        assert.deepEqual((await invoke("work:validate", {}, ctx)).findings, []);

        // …and the item moves to `done`. ADR-007 records that IF this ever gates, the gate belongs on
        // this door — so asserting it here is asserting the decision at the exact place a future change
        // would have to touch.
        // 96/04 — this milestone's accept door now also holds the regression gate. Seed its green
        // row so the move reaches THIS suite's claim instead of being refused by a newer, unrelated one.
        await seedGreenRegressionGate(repo.itemDir);
        const moved = await invoke("work:status", { ref: ITEM_REF, status: "done" }, ctx);
        assert.equal(moved.moved, true, "the move succeeds");

        // A PARTIALLY signed record is the same answer: it is a warning, not a veto.
        await writeFile(repo.recordPath, signInPlace(await readFile(repo.recordPath, "utf8"), "loop:build-to-green"), "utf8");
        const partial = await doctorWork(repo.workDir, { name: "fixture" }, undefined, { groups: [loopRecordLane], projectRoot: repo.root });
        assert.deepEqual(partial.map((entry) => entry.code), ["loop-record-part-signed"]);
        assert.equal(partial[0].severity, "warn");
        assert.deepEqual((await invoke("work:validate", {}, ctx)).findings, [], "and validate is still green");
      });
    },
  },
  {
    name: "arch/78/03 FF-7808 the lane is appended, and it changes no existing group's answer",
    run: async () => {
      // ONE ENTRY, APPENDED — `CHECK_GROUPS` is an append-only registry and this milestone edits no
      // member of it. "Appended" is asserted as being AFTER every lane that existed before this one,
      // not as being LAST: the next milestone to append a lane would red on `at(-1)`, and a gate that
      // reds on a sanctioned append is a gate the next author deletes rather than reads.
      assert.equal(CHECK_GROUPS.filter((group) => group === loopRecordLane).length, 1, "registered exactly once");
      const { rubricTraceabilityGroup } = await import("../../../src/work/doctor-rubric.mjs");
      assert.ok(
        CHECK_GROUPS.indexOf(loopRecordLane) > CHECK_GROUPS.indexOf(rubricTraceabilityGroup),
        "and appended after the lanes that existed before it, never inserted among them",
      );

      await withRepo({}, async (repo) => {
        // Over a stream carrying a record, the other lanes' findings are identical with and without
        // this one — measured, not assumed, because a lane that mutated the snapshot it was handed
        // would change them.
        await loopRecordCommand.run({ ref: ITEM_REF, write: true }, await ctxFor(repo));
        const args = [repo.workDir, { name: "fixture" }, undefined];
        const others = CHECK_GROUPS.filter((group) => group !== loopRecordLane);
        const before = await doctorWork(...args, { groups: others, projectRoot: repo.root });
        const after = await doctorWork(...args, { groups: CHECK_GROUPS, projectRoot: repo.root });
        const mine = new Set(LOOP_RECORD_FINDING_CODES);
        assert.deepEqual(
          after.filter((entry) => !mine.has(entry.code)).map((entry) => [entry.code, entry.path, entry.severity]),
          before.map((entry) => [entry.code, entry.path, entry.severity]),
          "every other lane's answer is unchanged, code for code and path for path",
        );
        assert.ok(after.length > before.length, "and the new lane really did add its own finding");
      });
    },
  },
];
