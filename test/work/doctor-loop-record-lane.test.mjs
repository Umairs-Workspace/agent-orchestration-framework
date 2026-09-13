// Traceability wiring for milestone 78 / story 03, task `01_the-doctor-lane`.
//
// Covers EVERY @executable scenario in
//   wiki/work/78_milestone_loop-execution-record/stories/03_story_signature-and-the-doctor-lane/tasks/01_the-doctor-lane.feature
//
// ONE LANE, APPENDED. `CHECK_GROUPS` is an append-only array of pure `(snapshot, ctx) => Finding[]`
// functions; this milestone appends one entry, the shape 66/02 and 54/04 each used. The group is
// PURE — it answers from the snapshot and reads no disk — so most of what follows is asserted against
// LITERAL snapshots whose paths name a directory that does not exist. That is not a convenience: a
// lane tested only through a real tree can hide a filesystem read behind a passing assertion.
//
// IT REPORTS AND NEVER GATES (ADR-007). Every finding is `warn`, and a warn-only doctor result does
// not fail `aof:validate`. The two scenarios that need a real stream — validate staying green, and an
// unsigned record not blocking `done` — run against a fixture repo, because those are claims about
// the DOORS rather than about the lane.
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { invoke } from "../../src/command-core.mjs";
import { CHECK_GROUPS, buildSnapshot, doctorWork } from "../../src/work/doctor.mjs";
import {
  LOOP_RECORD_FINDING_CODES,
  SIGNOFF_DIVIDER,
  SIGNOFF_HEADER,
  SIGNOFF_HEADING,
  SIGNOFF_PLACEHOLDER,
  loopRecordLane,
} from "../../src/work/doctor-loop-record.mjs";
import { loopRecordCommand } from "../../src/commands/loop-record.mjs";
import {
  ENGAGED_RUNS,
  ITEM_REF,
  ctxFor,
  declaration,
  runRecord,
  seedRuns,
  signInPlace,
  signedRow,
  withRepo,
} from "../loop/loop-record-command.test.mjs";
import { seedGreenRegressionGate } from "../support/regression-gate-fixture.mjs";

// A directory that does not exist, so a lane that reached the filesystem would fault rather than
// quietly pass.
const NOWHERE = path.join("no-such-root-ff7808", "item");

const documentWith = (...rows) =>
  ["---", "doc: execution", "item: 03", "---", "# 03 · The loop execution record", "", SIGNOFF_HEADING, "", SIGNOFF_HEADER, SIGNOFF_DIVIDER, ...rows, ""].join("\n");

const placeholder = (loop) => `| ${loop} | ${SIGNOFF_PLACEHOLDER} | ${SIGNOFF_PLACEHOLDER} | ${SIGNOFF_PLACEHOLDER} |`;

// One literal snapshot item. `executionRecord` and `loopEngagements` are exactly the two facts the
// engine reads at its impure edge; everything else a lane might want is deliberately absent, which is
// what proves this lane needs nothing else.
const itemWith = ({ ref = "03", dir = NOWHERE, text = null, engagements = null } = {}) => ({
  ref,
  dir,
  type: "milestone",
  executionRecord: text == null ? { present: false, text: null } : { present: true, text },
  loopEngagements: engagements,
});

const snapshotOf = (...items) => ({ items });
const codesOf = (findings) => findings.map((entry) => entry.code);

const write = async (repo) => await loopRecordCommand.run({ ref: ITEM_REF, write: true }, await ctxFor(repo));

export const doctorLoopRecordLaneTests = [
  {
    name: "doctor-loop-record/01 an item with no record produces no finding",
    run() {
      // The record is read WHEN PRESENT and never demanded (ADR-001): an item that ran no loops owes
      // no record, and a lane that demanded one from every item would report on the whole stream on
      // day one — which is the noise that made `observability/report.md` unread.
      assert.deepEqual(loopRecordLane(snapshotOf(itemWith({}))), [], "no finding for an item with no EXECUTION.md");
      // …and it is not reported as MISSING, which is a different claim from "no finding": a lane that
      // emitted `loop-record-missing` would satisfy "produces no finding for that item" nowhere.
      assert.deepEqual(loopRecordLane(snapshotOf(itemWith({}), itemWith({ ref: "04", dir: path.join(NOWHERE, "four") }))), []);
      // An item row with the field absent entirely (a snapshot built before this lane existed) is the
      // same answer, never a crash.
      assert.deepEqual(loopRecordLane({ items: [{ ref: "03", dir: NOWHERE }] }), []);
    },
  },
  {
    name: "doctor-loop-record/01 each finding is produced by its own cause, and every one is a warning",
    run() {
      const rows = [
        {
          code: "loop-record-unsigned",
          item: itemWith({ text: documentWith(placeholder("loop:a"), placeholder("loop:b")), engagements: ["loop:a", "loop:b"] }),
        },
        {
          code: "loop-record-part-signed",
          item: itemWith({ text: documentWith(signedRow("loop:a"), placeholder("loop:b")), engagements: ["loop:a", "loop:b"] }),
        },
        {
          // The record is about a DIFFERENT set of engagements than the item's runs now project.
          code: "loop-record-stale",
          item: itemWith({ text: documentWith(signedRow("loop:a")), engagements: ["loop:a", "loop:b"] }),
        },
        {
          code: "loop-record-malformed",
          item: itemWith({ text: documentWith(signedRow("loop:a")).replace(SIGNOFF_HEADER, "| loop | who | when | verdict |"), engagements: ["loop:a"] }),
        },
      ];
      for (const row of rows) {
        const findings = loopRecordLane(snapshotOf(row.item));
        assert.deepEqual(codesOf(findings), [row.code], `${row.code} is produced by its own cause and nothing else`);
        assert.equal(findings[0].path, path.join(NOWHERE, "EXECUTION.md"), `${row.code} is anchored at EXECUTION.md`);
        assert.equal(findings[0].severity, "warn", `${row.code} is a warning`);
        assert.match(findings[0].message, /^03: /, "and it names the item it is about");
      }
    },
  },
  {
    name: "doctor-loop-record/01 every code in the lane is reachable, and no other code is emitted",
    run() {
      // A fixture stream engineered to fire every code AT ONCE — four items, one cause each, plus two
      // items the lane must stay silent about.
      const stream = snapshotOf(
        itemWith({ ref: "10", dir: path.join(NOWHERE, "ten"), text: documentWith(placeholder("loop:a")), engagements: ["loop:a"] }),
        itemWith({ ref: "11", dir: path.join(NOWHERE, "eleven"), text: documentWith(signedRow("loop:a"), placeholder("loop:b")), engagements: ["loop:a", "loop:b"] }),
        // STALE = the record does not name an engagement the runs project. NOT "the record names one
        // the runs no longer project": a signed row for a vanished engagement is a sanctioned orphan
        // (78/02's writer preserves it), so using that as the stale cause would test the wrong rule.
        itemWith({ ref: "12", dir: path.join(NOWHERE, "twelve"), text: documentWith(signedRow("loop:a")), engagements: ["loop:a", "loop:b"] }),
        itemWith({ ref: "13", dir: path.join(NOWHERE, "thirteen"), text: documentWith(signedRow("loop:a")).replace(SIGNOFF_HEADING, "## Signoff"), engagements: ["loop:a"] }),
        itemWith({ ref: "14", dir: path.join(NOWHERE, "fourteen") }),
        itemWith({ ref: "15", dir: path.join(NOWHERE, "fifteen"), text: documentWith(signedRow("loop:a")), engagements: ["loop:a"] }),
      );
      const findings = loopRecordLane(stream);
      assert.deepEqual(
        [...new Set(codesOf(findings))].sort(),
        [...LOOP_RECORD_FINDING_CODES].sort(),
        "each frozen code is produced at least once",
      );
      for (const code of codesOf(findings)) {
        assert.ok(LOOP_RECORD_FINDING_CODES.includes(code), `no code outside the frozen set reaches a reader (${code})`);
      }
      // The two silent items really are silent: an item with no record, and a fully signed, current
      // one. Without them the assertion above would pass on a lane that reported on everything.
      assert.deepEqual(codesOf(findings).length, 4, "one finding per cause, and none for the two clean items");
    },
  },
  {
    name: "doctor-loop-record/01 the severity does not harden once the item is done",
    run() {
      // `severityFor` answers `error` INSIDE the acceptance horizon, which is exactly the hardening
      // this lane must not do (ADR-007). The lane is handed the same record on an open item and on a
      // `done` one, and answers `warn` in both cases — asserted rather than assumed, because the
      // horizon is the spine's default and opting out of it is the deliberate choice here.
      const text = documentWith(placeholder("loop:a"));
      for (const status of ["in-progress", "done"]) {
        const findings = loopRecordLane(snapshotOf({ ...itemWith({ text, engagements: ["loop:a"] }), meta: { status }, status }));
        assert.deepEqual(codesOf(findings), ["loop-record-unsigned"], `the finding is produced while the item is ${status}`);
        assert.equal(findings[0].severity, "warn", `and it is warn when the item is ${status}`);
      }
    },
  },
  {
    name: "doctor-loop-record/01 the group answers from a literal snapshot with no filesystem present",
    run() {
      // The paths name a directory that does not exist, so a lane that read disk would fault.
      const snapshot = snapshotOf(itemWith({ text: documentWith(placeholder("loop:a")), engagements: ["loop:a"] }));
      const once = loopRecordLane(snapshot);
      const twice = loopRecordLane(snapshot);
      assert.equal(once.length, 1, "it returns its findings without reading disk");
      // BYTE-IDENTICAL, not merely equal in count: a lane that iterated a Set or sorted unstably
      // would produce a different message order between two calls over one snapshot.
      assert.equal(JSON.stringify(twice), JSON.stringify(once), "calling it twice with the same snapshot returns byte-identical findings");
      // And it is registered exactly once in the engine's array.
      assert.equal(CHECK_GROUPS.filter((group) => group === loopRecordLane).length, 1, "the lane appears in the check registry exactly once");
    },
  },
  {
    name: "doctor-loop-record/01 doctor's existing answers are unchanged over a stream carrying no record",
    async run() {
      await withRepo({}, async (repo) => {
        // The fixture stream has no `EXECUTION.md` anywhere — the ordinary case in this repository
        // today. Doctor's findings must be code-for-code and path-for-path what they were before this
        // lane existed, which is measured by running the engine with and without the lane registered.
        const args = [repo.workDir, { name: "fixture" }, undefined];
        const withLane = await doctorWork(...args, { groups: CHECK_GROUPS, projectRoot: repo.root });
        const without = await doctorWork(...args, { groups: CHECK_GROUPS.filter((group) => group !== loopRecordLane), projectRoot: repo.root });
        assert.deepEqual(
          withLane.map((entry) => [entry.code, entry.path, entry.severity]),
          without.map((entry) => [entry.code, entry.path, entry.severity]),
          "identical to the pre-change answer, code for code and path for path",
        );

        // AND THE SNAPSHOT'S NEW FIELDS ARE HONESTLY EMPTY for such a stream — the probe happened and
        // found nothing, so no run record was read at all.
        const snapshot = await buildSnapshot(repo.workDir, { projectRoot: repo.root });
        for (const item of snapshot.items) {
          assert.equal(item.executionRecord.present, false, `${item.ref}: no record`);
          assert.equal(item.loopEngagements, null, `${item.ref}: and no run read was performed for it`);
        }
      });
    },
  },
  {
    name: "doctor-loop-record/01 a real record reaches the lane through the engine, and a stale one is reported",
    async run() {
      await withRepo({}, async (repo) => {
        // END TO END through the REAL snapshot boundary: the record is written, then the item's runs
        // move on, and doctor reports the record stale — which is the only way to prove the two new
        // snapshot fields are actually populated from disk.
        await write(repo);
        const clean = await doctorWork(repo.workDir, { name: "fixture" }, undefined, { groups: [loopRecordLane], projectRoot: repo.root });
        assert.deepEqual(codesOf(clean), ["loop-record-unsigned"], "a freshly written, unsigned record reports unsigned");

        await seedRuns(repo, [
          ...ENGAGED_RUNS,
          runRecord({ runId: "lr-c-0000", createdAt: "2026-09-01T03:00:00.000Z", loop: declaration({ id: "loop:review-fix", loopRunId: "lr-c" }) }),
        ]);
        const stale = await doctorWork(repo.workDir, { name: "fixture" }, undefined, { groups: [loopRecordLane], projectRoot: repo.root });
        assert.deepEqual(codesOf(stale), ["loop-record-stale"], "a new engagement makes the record stale");
        assert.match(stale[0].message, /aof work loop-record 03 --write/, "and the finding names the remedy");

        // Regenerate, and the staleness is gone — the finding is actionable, not permanent.
        await write(repo);
        assert.deepEqual(
          codesOf(await doctorWork(repo.workDir, { name: "fixture" }, undefined, { groups: [loopRecordLane], projectRoot: repo.root })),
          ["loop-record-unsigned"],
          "regenerating clears it",
        );
      });
    },
  },
  {
    name: "doctor-loop-record/01 a warn-only result does not fail validate, and the findings are still reported",
    async run() {
      await withRepo({}, async (repo) => {
        await write(repo);
        const ctx = await ctxFor(repo);
        // THE LANE'S FINDINGS ARE THERE…
        const doctor = await invoke("work:doctor", {}, ctx);
        const mine = doctor.findings.filter((entry) => LOOP_RECORD_FINDING_CODES.includes(entry.code));
        assert.ok(mine.length > 0, "the doctor findings are still reported");
        for (const entry of mine) assert.equal(entry.severity, "warn");
        // …AND VALIDATE IS GREEN. `work:validate` is the structural gate and knows nothing of this
        // lane, which is the point: a warn-only doctor result cannot fail it.
        const validate = await invoke("work:validate", {}, ctx);
        assert.deepEqual(validate.findings, [], `validate is green: ${JSON.stringify(validate.findings)}`);
      });
    },
  },
  {
    name: "doctor-loop-record/01 no door reads the signature as a verdict — an unsigned record does not block `done`",
    async run() {
      await withRepo({}, async (repo) => {
        await write(repo);
        const ctx = await ctxFor(repo);
        // The record is UNSIGNED — every row a placeholder.
        const findings = await doctorWork(repo.workDir, { name: "fixture" }, undefined, { groups: [loopRecordLane], projectRoot: repo.root });
        assert.deepEqual(codesOf(findings), ["loop-record-unsigned"]);

        // …and the item moves to `done` anyway. If this ever DOES gate, ADR-007 records that the gate
        // belongs here — on `work:status`'s door — so asserting it here is asserting the decision at
        // the exact place a future change would have to touch.
        // 96/04 — this milestone's accept door now also holds the regression gate. Seed its green
        // row so the move reaches THIS suite's claim instead of being refused by a newer, unrelated one.
        await seedGreenRegressionGate(repo.itemDir);
        const moved = await invoke("work:status", { ref: ITEM_REF, status: "done" }, ctx);
        assert.equal(moved.moved, true, "the move succeeds");
        assert.equal(moved.status, "done");

        // And it still does not gate once the item IS done — the severity does not harden.
        const after = await doctorWork(repo.workDir, { name: "fixture" }, undefined, { groups: [loopRecordLane], projectRoot: repo.root });
        assert.deepEqual(codesOf(after), ["loop-record-unsigned"]);
        assert.equal(after[0].severity, "warn");
      });
    },
  },
  {
    name: "doctor-loop-record/01 a malformed record is reported and never repaired, and it blocks no other answer",
    async run() {
      await withRepo({}, async (repo) => {
        const rendered = (await write(repo)).text;
        const broken = signInPlace(rendered, "loop:build-to-green").replace(SIGNOFF_DIVIDER, "| :-- | :-- | :-- | :-- |");
        await writeFile(repo.recordPath, broken, "utf8");

        const findings = await doctorWork(repo.workDir, { name: "fixture" }, undefined, { groups: [loopRecordLane], projectRoot: repo.root });
        assert.deepEqual(codesOf(findings), ["loop-record-malformed"], "one finding — a record that cannot be parsed cannot also be judged unsigned or stale");
        assert.equal(findings[0].severity, "warn");
        // ACD NEVER REPAIRS: the file is left exactly as it was found.
        assert.equal(await readFile(repo.recordPath, "utf8"), broken, "doctor changed nothing");
        // …and the rest of doctor still answers over the same stream.
        const all = await doctorWork(repo.workDir, { name: "fixture" }, undefined, { groups: CHECK_GROUPS, projectRoot: repo.root });
        assert.ok(all.some((entry) => entry.code === "loop-record-malformed"), "the lane's finding reaches the full run");
      });
    },
  },
  {
    name: "doctor-loop-record/01 an orphaned SIGNED row is not staleness, and a regeneration clears the finding",
    async run() {
      // THE DEFECT THIS ENTRY EXISTS FOR, found reviewing this lane against 78/02's writer. That
      // writer PRESERVES a signed row whose engagement no longer exists (ADR-002: the signature is the
      // one thing a regeneration never destroys, and `pruneRun` really can remove a run). A lane that
      // compared engagement SETS would report such a record stale — and regenerating would not clear
      // it, because the writer carries the orphan forward every time. A permanent warning nobody can
      // act on is the wall-of-inherited-red pathology, at warn severity.
      const signedOrphan = signedRow("loop:gone");
      assert.deepEqual(
        loopRecordLane(snapshotOf(itemWith({ text: documentWith(signedRow("loop:a"), signedOrphan), engagements: ["loop:a"] }))),
        [],
        "a fully signed record carrying a signed orphan is current and fully signed",
      );

      // …AND SIGNEDNESS IS JUDGED OVER THE CURRENT ROWS ONLY. One old signature must not make two
      // unsigned engagements read as merely PART-signed.
      assert.deepEqual(
        codesOf(loopRecordLane(snapshotOf(itemWith({
          text: documentWith(placeholder("loop:a"), placeholder("loop:b"), signedOrphan),
          engagements: ["loop:a", "loop:b"],
        })))),
        ["loop-record-unsigned"],
        "an orphan's signature says nothing about the engagements that are current",
      );

      // A leftover UNSIGNED row IS staleness — the writer re-derives those away, so its presence means
      // the record predates the change.
      const stray = codesOf(loopRecordLane(snapshotOf(itemWith({
        text: documentWith(signedRow("loop:a"), placeholder("loop:gone")),
        engagements: ["loop:a"],
      }))));
      assert.deepEqual(stray, ["loop-record-stale"]);

      // END TO END: sign a row, drop the runs, regenerate, and the lane is silent — the finding really
      // is clearable, which is the whole point.
      await withRepo({}, async (repo) => {
        await writeFile(repo.recordPath, signInPlace((await write(repo)).text, "loop:build-to-green"), "utf8");
        await seedRuns(repo, ENGAGED_RUNS.filter((record) => record.brief.loop.loopRunId === "lr-a"));
        await write(repo);
        assert.deepEqual(
          codesOf(loopRecordLane(await buildSnapshot(repo.workDir, { projectRoot: repo.root }))),
          [],
          "one engagement, signed, and the vanished one's unsigned row re-derived away — nothing left to report",
        );
      });
    },
  },
  {
    name: "doctor-loop-record/01 a record that is behind its runs is stale, and the finding names what is missing",
    run() {
      const findings = loopRecordLane(snapshotOf(itemWith({
        text: documentWith(signedRow("loop:a")),
        engagements: ["loop:a", "loop:b", "loop:c"],
      })));
      assert.deepEqual(codesOf(findings), ["loop-record-stale"]);
      assert.match(findings[0].message, /2 engagement\(s\) it does not name \(loop:b, loop:c\)/, "the finding names them, so the operator can see what changed");
      assert.match(findings[0].message, /aof work loop-record 03 --write/, "and names the remedy");
    },
  },
  {
    name: "doctor-loop-record/01 with no engagement list the lane makes no staleness claim",
    run() {
      // `loopEngagements: null` means the engine never looked. It must NOT be read as "nothing ran":
      // that would report a fully signed record stale on any snapshot built without the field.
      assert.deepEqual(loopRecordLane(snapshotOf(itemWith({ text: documentWith(signedRow("loop:a")), engagements: null }))), []);
      assert.deepEqual(
        codesOf(loopRecordLane(snapshotOf(itemWith({ text: documentWith(placeholder("loop:a")), engagements: null })))),
        ["loop-record-unsigned"],
        "the signedness answer is still given — only the staleness claim is withheld",
      );
    },
  },
  {
    name: "doctor-loop-record/01 an item whose record has no engagements is silent, signed or not",
    async run() {
      // The record for an item where no loop ran carries the frozen block and no rows. There is
      // nothing for a human to sign, so reporting it unsigned would put a warning on every item in
      // this repository the day the writer shipped.
      const empty = documentWith();
      assert.deepEqual(loopRecordLane(snapshotOf(itemWith({ text: empty, engagements: [] }))), []);
      // …but a record with no rows for an item whose runs DO now project an engagement is stale,
      // which is the finding that gets the operator to regenerate it.
      assert.deepEqual(
        codesOf(loopRecordLane(snapshotOf(itemWith({ text: empty, engagements: ["loop:a"] })))),
        ["loop-record-stale"],
      );
      await withRepo({ runs: [] }, async (repo) => {
        await rm(path.join(repo.itemDir, "runs"), { recursive: true, force: true });
        await write(repo);
        assert.deepEqual(
          loopRecordLane(await buildSnapshot(repo.workDir, { projectRoot: repo.root })),
          [],
          "and end to end, an item with no runs and a written record is silent",
        );
      });
    },
  },
];
