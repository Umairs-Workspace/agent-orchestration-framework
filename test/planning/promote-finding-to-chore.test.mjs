// Traceability wiring for milestone 71 / story 01 (findings-become-work-items):
//   tasks/00_the-triage-rule-routes-every-finding.feature
//   tasks/01_promote-a-finding-to-a-chore.feature
//   tasks/02_the-loop-creates-nothing-else.feature
//
// …and, since the decider is one module, the stories that narrowed it are wired here too:
//   118 — tasks/00_the-cheap-remedy-is-fixed-not-scheduled.feature, tasks/01_a-chore-review-mints-no-chore.feature
//   123 — tasks/00_the-close-creates-nothing.feature
//
// Two seams, one story, so one suite:
//   · the TRIAGE RULE — `routeFinding`/`routeFindings` (`src/work/loop.mjs`), a pure decider, driven
//     directly. ADR-009 §B is explicit that a four-question router stated only in prose is a claim no
//     scenario can drive; these rows are what that decision bought.
//   · the PROMOTION — the real registered `work:promote-finding`, invoked in-process through the
//     command core against a temp work dir (`withInsertFixture`, the same idiom 39/03's suite uses)
//     and read back black-box from the CHORE.md on disk.
//
// The STRUCTURAL claims are not restated here: one-type/one-placement is FF-7103
// (acd-promotion-creates-one-type) and one-engine/two-faces is FF-7104 (acd-one-promotion-engine).
import assert from "node:assert/strict";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { invoke } from "../../src/command-core.mjs";
import { findWork, listItems, validateWork } from "../../src/work.mjs";
import { FINDING_ROUTINGS, routeFinding, routeFindings } from "../../src/work/loop.mjs";
import { appendPosition } from "../../src/work-promote/promotion.mjs";
import { promoteGapToChoreCommand } from "../../src/commands/promote-gap-to-chore.mjs";
import { withInsertFixture } from "../support/work-insert-fixture.mjs";
import { frontmatter, writeMilestoneItem, writeStoryItem, writeUatItem } from "../support/work-reindex-fixture.mjs";

function sectionBody(text, heading) {
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((line) => line.trim() === heading);
  if (at === -1) return null;
  const body = [];
  for (let i = at + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join("\n");
}

const frontmatterField = (text, key) => (text.match(new RegExp(`^${key}:\\s*(.*)$`, "mu")) ?? [])[1]?.trim() ?? null;

// A reviewed item the promoter's ref guard can resolve: milestone 71 with stories 02 and 03.
async function withReviewedStream(body, { topLevel = 1 } = {}) {
  return await withInsertFixture(async (ctx) => {
    const milestone = await writeMilestoneItem(ctx.workDir, "71");
    await writeStoryItem(milestone, "02", "71");
    await writeStoryItem(milestone, "03", "71");
    for (let n = 1; n < topLevel; n += 1) await writeMilestoneItem(ctx.workDir, String(70 + n).padStart(2, "0"));
    return await body(ctx);
  });
}

const promote = (workspace, input) => invoke("work:promote-finding", input, { workspace });

const FINDING = Object.freeze({
  ref: "71/02",
  title: "F-a the resolver is called twice per row",
  remedy: "hoist the resolver call out of the row loop",
  location: "src/work/loop.mjs:143",
  round: 1,
});

// A finding the triage rule can route, with only the axis under test varied.
const finding = (overrides) => ({ title: "F-a", severity: "important", reproduced: true, ...overrides });

// A top-level item of an arbitrary type (118/01). The shared reindex fixture writes milestones,
// stories and uat gates; the depth bound's own table also needs a `spike` and a parentless `story`,
// and the fixture is a delivered support module this story does not change.
async function writeTopLevelItem(workDir, number, type, doc) {
  const dir = path.join(workDir, `${number}_${type}_probe${number}`);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, doc),
    frontmatter({ type, number, slug: `probe${number}`, status: "not-started", created: "2026-09-05", updated: "2026-09-05", schema: 1 }),
    "utf8",
  );
  return dir;
}

// Every file under the work dir with its bytes, for the "the refusal writes nothing at all" claim.
// A count of top-level items would miss an amended `CHORE.md`, which is one of the three things the
// contract says the refusal must not do.
async function streamSnapshot(dir, prefix = "") {
  const snapshot = {};
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = path.join(dir, entry.name);
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(snapshot, await streamSnapshot(full, key));
    else snapshot[key] = await readFile(full, "utf8");
  }
  return snapshot;
}

export const promoteFindingToChoreTests = [
  // ==========================================================================
  // task 00 — the triage rule routes every finding
  // ==========================================================================
  {
    name: "71/01 task00: the first question that answers decides the routing, and no later question is asked",
    run() {
      const rows = [
        ["requires a change to a delivered .feature", { lockedContract: "feature" }, { routing: "amendment", vehicle: "accepting-item-contract", creates: null }],
        ["requires a change to an ADR", { lockedContract: "adr" }, { routing: "amendment", vehicle: "superseding-adr", creates: null }],
        // Q1 answers first even when Q2 would also have answered — the ordering IS the rule.
        ["requires an ADR change and is also checklist-dischargeable", { lockedContract: "adr", checklistDischargeable: true }, { routing: "amendment", vehicle: "superseding-adr", creates: null }],
        // 123 — the checklist question stopped creating. A chore-shaped remedy that question 2 did
        // not find cheap enough to fix at the close leaves as the operator's story, not as a driver.
        ["is discharged by a checklist against existing code", { checklistDischargeable: true }, { routing: "story", vehicle: "operator-refines", creates: null }],
        ["is checklist-dischargeable and also suggests new criteria", { checklistDischargeable: true, needsNewCriteria: true }, { routing: "story", vehicle: "operator-refines", creates: null }],
        ["needs new acceptance criteria a .feature must state", { needsNewCriteria: true }, { routing: "story", vehicle: "operator-refines", creates: null }],
        ["is a preference with no correctness consequence", { severity: "nit" }, { routing: "recorded", vehicle: "state-feedback", creates: null }],
        ["answers none of the first three questions", {}, { routing: "recorded", vehicle: "state-feedback", creates: null }],
      ];
      for (const [character, input, expected] of rows) {
        const decision = routeFinding(finding(input));
        assert.equal(decision.routed, true, character);
        assert.equal(decision.routing, expected.routing, character);
        assert.equal(decision.vehicle, expected.vehicle, character);
        assert.equal(decision.creates, expected.creates, `${character}: creates`);
      }

      // The story routing is the one the OPERATOR owns, and since 123 the checklist question takes
      // it too — every routing the loop still owns creates nothing.
      assert.equal(routeFinding(finding({ needsNewCriteria: true })).owner, "operator");
      assert.equal(routeFinding(finding({ checklistDischargeable: true })).owner, "operator");
      assert.equal(routeFinding(finding({ cheaperThanDriver: true })).owner, "loop");
    },
  },
  {
    name: "71/01 task00: which findings reach the questions at all",
    run() {
      const chased = routeFinding(finding({ severity: "blocker", outstanding: false }));
      assert.deepEqual([chased.routed, chased.reason], [false, "blocker-chased"], "a Blocker fixed inside a round was chased");

      const outstanding = routeFinding(finding({ severity: "blocker", outstanding: true }));
      assert.deepEqual([outstanding.routed, outstanding.reason], [false, "blocker-outstanding"], "a Blocker at the cap is named in the bounded stop");

      const discarded = routeFinding(finding({ reproduced: false, checklistDischargeable: true }));
      assert.deepEqual([discarded.routed, discarded.reason], [false, "not-reproduced"], "a claim that did not reproduce was discarded before the close");

      // An Important finding reaches the questions; a Nit is recorded and is NEVER promoted — even
      // when it would otherwise have answered question 2. The reporting bar is still the throttle,
      // and since 123 what it throttles is how much lands on the operator rather than how many
      // drivers the close mints.
      const important = routeFinding(finding({ severity: "important", checklistDischargeable: true }));
      assert.equal(important.routing, "story", "an Important checklist-shaped finding is the operator's story");
      assert.equal(important.creates, null, "…and the close creates nothing for it");
      const nit = routeFinding(finding({ severity: "nit", checklistDischargeable: true }));
      assert.equal(nit.routing, "recorded", "a Nit is recorded");
      assert.equal(nit.creates, null, "…and is never promoted");

      // One finding raised by two lenses is routed ONCE, after deduplication.
      const twice = routeFindings([
        finding({ title: "F-a", location: "src/x.mjs:10", checklistDischargeable: true }),
        finding({ title: " f-A ", location: "SRC/X.MJS:10", checklistDischargeable: true }),
      ]);
      assert.equal(twice.routed.length, 1, "deduplicated to one routing");
      assert.equal(twice.creates.length, 0, "…and, since 123, no promotion at all");
    },
  },
  {
    name: "71/01 task00: the close routes each surviving finding exactly once, reports what it did, and allocates no finding id",
    run() {
      const close = routeFindings([
        finding({ title: "F-a", checklistDischargeable: true }),
        finding({ title: "F-b", needsNewCriteria: true }),
        finding({ title: "F-c", lockedContract: "adr" }),
        finding({ title: "F-d" }),
        finding({ title: "F-e", severity: "blocker" }),
      ]);
      assert.equal(close.routed.length, 5, "every finding is routed exactly once");
      assert.deepEqual(close.routed.map((d) => d.title), ["F-a", "F-b", "F-c", "F-d", "F-e"], "…and each is named");
      assert.deepEqual(close.creates, [], "since 123 no routing asks the loop to create anything");
      assert.equal(close.nothingToRoute, false);

      // Every routing creates no item — the loop stops at the contract, the code, `STATE.md` or the
      // operator's hands, and never at a new folder in the stream.
      for (const decision of close.routed.filter((d) => d.routed)) {
        assert.equal(decision.creates, null, `${decision.routing} creates nothing`);
      }

      // No finding id is allocated and no @finding-<id> tag is emitted: the only register is the
      // milestone's VERIFICATION.md, and at review-close time it does not exist (66/ADR-006).
      const serialized = JSON.stringify(close);
      assert.equal(serialized.includes("@finding-"), false, "no @finding-<id> tag");
      assert.equal(/"(id|findingId)"\s*:/u.test(serialized), false, "no id is allocated");

      // A close with nothing surviving routes nothing and says so.
      const empty = routeFindings([]);
      assert.deepEqual([empty.routed, empty.creates, empty.nothingToRoute], [[], [], true]);
      const blockersOnly = routeFindings([finding({ severity: "blocker" })]);
      assert.deepEqual([blockersOnly.creates, blockersOnly.nothingToRoute], [[], true], "a close whose only findings were chased routes nothing");
    },
  },

  // ==========================================================================
  // task 01 — a review finding is promoted to a top-level chore
  // ==========================================================================
  {
    name: "71/01 task01: the promotion creates a validate-clean top-level chore seeded from the finding's remedy, with nothing ticked",
    run: () => withReviewedStream(async ({ workDir, workspace }) => {
      const result = await promote(workspace, FINDING);
      assert.equal(result.promoted, true);

      const text = await readFile(path.join(result.chore.dir, "CHORE.md"), "utf8");
      assert.equal(frontmatterField(text, "type"), "chore", "a chore was created");
      assert.equal(frontmatterField(text, "status"), "not-started", "born not-started");

      const dod = sectionBody(text, "## Definition of Done");
      assert.ok(dod.includes(`- [ ] ${FINDING.remedy}`), `the remedy is the close criterion:\n${dod}`);
      assert.equal(/- \[x\]/iu.test(text), false, "no box in the created chore is ticked");

      const found = await findWork(workDir, result.chore.ref);
      assert.equal(found.length, 1, "the created chore resolves by ref");
      assert.deepEqual(await validateWork(workDir, workspace.config, result.chore.ref, { projectRoot: workspace.root }), [], "the created folder validates clean");
    }),
  },
  {
    name: "71/01 task01: the chore carries a back-reference naming the reviewed ref, the round, and the finding's title and file:line",
    run: () => withReviewedStream(async ({ workspace }) => {
      const result = await promote(workspace, FINDING);
      const notes = sectionBody(await readFile(path.join(result.chore.dir, "CHORE.md"), "utf8"), "## Notes");
      assert.ok(notes.includes(FINDING.ref), `names the reviewed item's ref:\n${notes}`);
      assert.ok(notes.includes(`review round ${FINDING.round}`), `names the review round:\n${notes}`);
      assert.ok(notes.includes(FINDING.title), `names the finding's one-line title:\n${notes}`);
      assert.ok(notes.includes(FINDING.location), `names its file:line:\n${notes}`);
    }),
  },
  {
    name: "71/01 task01: each face states its own provenance and never the other's",
    run: () => withReviewedStream(async ({ workspace }) => {
      const fromFinding = await promote(workspace, FINDING);
      const findingNotes = sectionBody(await readFile(path.join(fromFinding.chore.dir, "CHORE.md"), "utf8"), "## Notes");
      assert.ok(findingNotes.includes(FINDING.ref) && findingNotes.includes(FINDING.title), "the finding face names the reviewed ref and the finding");
      assert.equal(/gap/iu.test(findingNotes), false, `…and never an originating gap:\n${findingNotes}`);

      const fromGap = await invoke("work:promote-gap", { title: "a declared gap", discharge: "close it" }, { workspace });
      const gapNotes = sectionBody(await readFile(path.join(fromGap.chore.dir, "CHORE.md"), "utf8"), "## Notes");
      assert.ok(gapNotes.includes("Promoted from gap"), "the gap face names the originating gap");
      assert.equal(/finding|review round/iu.test(gapNotes), false, `…and never a finding or a review round:\n${gapNotes}`);
    }),
  },
  {
    name: "71/01 task01: the promotion appends after every existing top-level item and renumbers nothing",
    run: async () => {
      for (const [label, topLevel] of [["one", 1], ["several", 4]]) {
        await withReviewedStream(async ({ workDir, workspace }) => {
          const before = (await listItems(workDir)).filter((item) => item.parent == null);
          const highest = Math.max(...before.map((item) => Number.parseInt(item.number, 10)));
          const result = await promote(workspace, FINDING);
          assert.equal(result.shifted, 0, `${label}: the reported shifted count is zero`);
          // AFTER every existing top-level item — by NUMBER, which is what the reindex compares.
          assert.equal(Number.parseInt(result.chore.ref, 10), highest + 1, `${label}: it takes the next number in the sequence`);

          const after = (await listItems(workDir)).filter((item) => item.parent == null);
          assert.equal(after.length, before.length + 1, `${label}: exactly one item was added`);
          for (const item of before) {
            assert.ok(after.some((row) => row.name === item.name), `${label}: "${item.name}" was not renumbered`);
          }
        }, { topLevel });
      }
      // …and into an EMPTY stream the append rule answers the first number. The promotion itself
      // cannot be driven from an empty stream — its ref would not resolve — so the row is satisfied
      // at the resolver, which is where "the first number in an empty stream" is actually decided.
      await withInsertFixture(async ({ workDir }) => {
        assert.equal(await appendPosition(workDir), 0, "an empty stream appends at the first number");
      });
      await withInsertFixture(async ({ workspace, workDir }) => {
        await writeMilestoneItem(workDir, "00");
        const milestone = (await listItems(workDir))[0];
        await writeStoryItem(milestone.dir, "02", "00");
        const result = await promote(workspace, { ...FINDING, ref: "00/02" });
        assert.equal(result.shifted, 0);
        assert.equal(result.chore.ref, "01", "the next number in a one-item stream");
      });
    },
  },
  {
    name: "71/01 task01: promotion is idempotent on the pair (reviewed ref, finding title)",
    run: () => withReviewedStream(async ({ workDir, workspace }) => {
      const first = await promote(workspace, FINDING);
      assert.equal(first.promoted, true);
      const countAfterFirst = (await listItems(workDir)).filter((item) => item.parent == null).length;

      const repeats = [
        ["the same pair", { ...FINDING }],
        ["the same pair with a different remedy", { ...FINDING, remedy: "a completely different fix" }],
        ["a title differing only in case and surrounding space", { ...FINDING, title: `  ${FINDING.title.toUpperCase()}  ` }],
        // Review findings quote code constantly, and the key is written inside a backtick span in
        // the chore's own Notes — so a backticked title must not be able to truncate the key it is
        // matched by, and must not read as a different finding either.
        ["a title that quotes code in backticks", { ...FINDING, title: `\`${FINDING.title}\`` }],
      ];
      for (const [label, input] of repeats) {
        const again = await promote(workspace, input);
        assert.equal(again.promoted, false, `${label}: no chore is created`);
        assert.equal(again.chore.ref, first.chore.ref, `${label}: the existing one is reported`);
        assert.equal(
          (await listItems(workDir)).filter((item) => item.parent == null).length,
          countAfterFirst,
          `${label}: the stream is unchanged`,
        );
      }

      // A DIFFERENT reviewed ref, and a different finding title, are different findings.
      const otherRef = await promote(workspace, { ...FINDING, ref: "71/03" });
      assert.equal(otherRef.promoted, true, "the same finding on another item is another finding");
      const otherTitle = await promote(workspace, { ...FINDING, title: "F-b a different defect" });
      assert.equal(otherTitle.promoted, true, "another finding on the same item is another finding");
    }),
  },
  {
    name: "71/01 task01: a second promotion is refused even after the first chore was closed",
    run: () => withReviewedStream(async ({ workDir, workspace }) => {
      const first = await promote(workspace, FINDING);
      const chorePath = path.join(first.chore.dir, "CHORE.md");
      const closed = (await readFile(chorePath, "utf8"))
        .replace(/^status: not-started$/mu, "status: done")
        .replaceAll("- [ ] ", "- [x] ");
      await (await import("node:fs/promises")).writeFile(chorePath, closed, "utf8");

      const again = await promote(workspace, FINDING);
      assert.equal(again.promoted, false, "the work was already scheduled — closing it does not un-schedule it");
      assert.equal(again.chore.ref, first.chore.ref);
      assert.equal((await listItems(workDir)).filter((item) => item.parent == null && item.type === "chore").length, 1);
    }),
  },
  {
    name: "71/01 task01: what the promoter refuses, and what it leaves behind",
    run: () => withReviewedStream(async ({ workDir, workspace }) => {
      const before = (await listItems(workDir)).filter((item) => item.parent == null).length;
      const defects = [
        ["names no reviewed item ref", { ...FINDING, ref: "" }, "promote-finding-invalid-ref"],
        ["names an item ref that does not resolve", { ...FINDING, ref: "99/99" }, "promote-finding-unknown-ref"],
        ["carries no finding title", { ...FINDING, title: "" }, "promote-finding-invalid-title"],
        ["carries a whitespace-only finding title", { ...FINDING, title: "   " }, "promote-finding-invalid-title"],
        ["carries a title that yields no slug", { ...FINDING, title: "—— ·· ——" }, "promote-finding-invalid-title"],
        ["carries no remedy to seed", { ...FINDING, remedy: "" }, "promote-finding-invalid-remedy"],
        ["carries a whitespace-only remedy", { ...FINDING, remedy: "  \t " }, "promote-finding-invalid-remedy"],
      ];
      for (const [label, input, code] of defects) {
        const error = await promote(workspace, input).then(() => null, (thrown) => thrown);
        assert.ok(error, `${label}: is refused`);
        assert.equal(error.code, code, `${label}: with a coded reason`);
        assert.equal(
          (await listItems(workDir)).filter((item) => item.parent == null).length,
          before,
          `${label}: the stream's top-level item count is unchanged`,
        );
      }
      assert.equal((await listItems(workDir)).some((item) => item.type === "chore"), false, "no chore folder was written");
    }),
  },

  // ==========================================================================
  // task 02 — the loop creates nothing else
  // ==========================================================================
  {
    name: "71/01 task02: a finding needing new acceptance criteria stops the loop and names the shape the operator would refine",
    run: () => withReviewedStream(async ({ workDir, workspace }) => {
      const before = (await listItems(workDir)).length;
      const decision = routeFinding(finding({ title: "F-z", needsNewCriteria: true }));
      assert.equal(decision.creates, null, "no work item is created");
      assert.equal(decision.routing, "story", "the routing names the story shape the operator would refine");
      assert.equal(decision.owner, "operator", "…and names it as one the operator owns");
      assert.equal((await listItems(workDir)).length, before, "no item folder is written");
      assert.ok(workspace, "the fixture workspace was built, so a write would have been observable");
    }),
  },
  {
    name: "71/01 task02: the promotion face offers no way to ask for another type or a parent",
    run: () => withReviewedStream(async ({ workDir, workspace }) => {
      const before = (await listItems(workDir)).filter((item) => item.parent == null).length;

      // No type input at all is the ONLY accepted shape, and it creates a top-level chore.
      const plain = await promote(workspace, FINDING);
      assert.equal(plain.promoted, true);
      const created = (await listItems(workDir)).find((item) => item.ref === plain.chore.ref);
      assert.equal(created.type, "chore");
      assert.equal(created.parent, null);

      // …and every attempt to name another type, or a parent, is refused as an unknown input.
      const after = (await listItems(workDir)).filter((item) => item.parent == null).length;
      for (const extra of [{ type: "milestone" }, { type: "story" }, { type: "uat" }, { type: "chore" }, { under: "71" }, { parent: "71" }, { at: 0 }]) {
        const input = { ...FINDING, title: `F-${Object.keys(extra)[0]}-${Object.values(extra)[0]}`, ...extra };
        const error = await promote(workspace, input).then(() => null, (thrown) => thrown);
        assert.ok(error, `${JSON.stringify(extra)}: is refused`);
        assert.match(String(error.message), /additional|unknown|not allowed|properties/iu, `${JSON.stringify(extra)}: as an unknown input`);
        assert.equal(
          (await listItems(workDir)).filter((item) => item.parent == null).length,
          after,
          `${JSON.stringify(extra)}: and creates nothing`,
        );
      }
      assert.equal(after, before + 1, "exactly one item was created across the whole scenario");
    }),
  },
  {
    name: "71/01 task02: every item the promotion path creates is a top-level chore, and it cannot re-enter the walk that created it",
    run: () => withReviewedStream(async ({ workDir, workspace }) => {
      const titles = ["F-a first", "F-b second", "F-c third"];
      const refs = [];
      for (const title of titles) refs.push((await promote(workspace, { ...FINDING, title })).chore.ref);

      const items = await listItems(workDir);
      for (const ref of refs) {
        const created = items.find((item) => item.ref === ref);
        assert.equal(created.type, "chore", `${ref} is a chore`);
        assert.equal(created.parent, null, `${ref} has no parent`);
      }

      // A top-level item is outside the milestone's own scope, which is what stops a capped round
      // loop becoming an uncapped story loop: the walk asks `work next <NN>` and cannot see it.
      const inMilestone = items.filter((item) => item.parent === "71").map((item) => item.ref);
      assert.deepEqual(inMilestone.sort(), ["71/02", "71/03"], "the milestone's members are unchanged by three promotions");
      for (const ref of refs) assert.equal(inMilestone.includes(ref), false, `${ref} is not a member of the walk that created it`);

      // …and it IS real work, visible where work is chosen, with its back-reference intact.
      for (const ref of refs) {
        const created = items.find((item) => item.ref === ref);
        const notes = sectionBody(await readFile(path.join(created.dir, "CHORE.md"), "utf8"), "## Notes");
        assert.ok(notes.includes(FINDING.ref), `${ref} is listed unscoped with its back-reference intact`);
      }
    }),
  },
  // ==========================================================================
  // 118 task 00 — the cheap remedy is fixed at the close that found it
  // ==========================================================================
  {
    name: "118 task00: the routing set gains a fifth member, appended last",
    run() {
      // ADDITIVE SUPERSESSION. The four keep their names, meanings and POSITIONS, so every reader
      // written against ADR-003's four still reads forward; `fixed` is appended, never inserted.
      assert.deepEqual(FINDING_ROUTINGS.slice(0, 4), ["amendment", "chore", "story", "recorded"], "the prior four are unchanged, in their prior order");
      assert.equal(FINDING_ROUTINGS[4], "fixed", "`fixed` is the fifth member");
      assert.equal(FINDING_ROUTINGS.length, 5, "…and the final one — no sixth member appears");
      assert.ok(Object.isFrozen(FINDING_ROUTINGS), "the set stays closed");
    },
  },
  {
    name: "118 task00: a remedy cheaper than the driver that would carry it is fixed, and the cost question is asked before the checklist question",
    run() {
      const cheap = routeFinding(finding({ cheaperThanDriver: true }));
      assert.equal(cheap.routing, "fixed", "its routing is `fixed`");
      assert.equal(cheap.creates, null, "it creates nothing");
      assert.equal(cheap.owner, "loop", "its owner is the loop");
      assert.equal(cheap.vehicle, "fixed-at-close", "its vehicle names the close as where the fix lands");

      // The ORDER is the rule: cheap AND checklist-dischargeable is fixed, not scheduled.
      const both = routeFinding(finding({ cheaperThanDriver: true, checklistDischargeable: true }));
      assert.equal(both.routing, "fixed", "the cost question answers before the checklist question");
      assert.equal(both.creates, null, "…and no chore is created for it");
      assert.equal(both.owner, "loop", "…and the loop, not the operator, carries it");

      // A locked-contract change is never MERELY cheap — question 1 still answers first, so the
      // cost question is never reached for it.
      const locked = routeFinding(finding({ cheaperThanDriver: true, lockedContract: "feature" }));
      assert.equal(locked.routing, "amendment", "a delivered .feature change is an amendment however cheap it is");
      assert.equal(routeFinding(finding({ cheaperThanDriver: true, lockedContract: "adr" })).routing, "amendment", "…and so is an ADR change");

      // A Nit skips to the recorded routing BEFORE the cost question, so the new question never
      // widens what a Nit can trigger — the reporting bar's whole purpose (83).
      const nit = routeFinding(finding({ severity: "nit", cheaperThanDriver: true, checklistDischargeable: true }));
      assert.equal(nit.routing, "recorded", "a Nit is recorded");
      assert.notEqual(nit.routing, "fixed", "…and is never routed to `fixed`");
      assert.equal(nit.creates, null, "…and is never promoted");
    },
  },
  {
    name: "118 task00: the first question that answers still decides, across the whole ordered set",
    run() {
      const rows = [
        ["requires a change to a delivered .feature", { lockedContract: "feature" }, "amendment"],
        ["requires a change to an ADR", { lockedContract: "adr" }, "amendment"],
        ["is cheap and also requires an ADR change", { cheaperThanDriver: true, lockedContract: "adr" }, "amendment"],
        ["is a Nit that is also cheap and also checklist-dischargeable", { severity: "nit", cheaperThanDriver: true, checklistDischargeable: true }, "recorded"],
        ["is cheaper than the driver that would carry it", { cheaperThanDriver: true }, "fixed"],
        ["is cheap and also checklist-dischargeable", { cheaperThanDriver: true, checklistDischargeable: true }, "fixed"],
        ["is cheap and also needs new acceptance criteria", { cheaperThanDriver: true, needsNewCriteria: true }, "fixed"],
        // 123 — was `chore`. A checklist-shaped remedy the cost question did not take is the
        // operator's story now; the loop's answer to this question creates nothing.
        ["is checklist-dischargeable and not cheap", { checklistDischargeable: true }, "story"],
        ["needs new acceptance criteria and is not cheap", { needsNewCriteria: true }, "story"],
        ["answers none of the questions", {}, "recorded"],
      ];
      for (const [character, overrides, routing] of rows) {
        const decision = routeFinding(finding(overrides));
        assert.equal(decision.routing, routing, `a finding that ${character} is routed to ${routing}`);
        assert.ok(FINDING_ROUTINGS.includes(decision.routing), `${character}: and to a routing in the closed set`);
      }
    },
  },
  {
    name: "118 task00: a fix at the close creates nothing, costs no round, and is reported as a routing rather than as silence",
    run() {
      const close = routeFindings([
        finding({ title: "F-cheap", cheaperThanDriver: true }),
        finding({ title: "F-chore", checklistDischargeable: true }),
        finding({ title: "F-nit", severity: "nit" }),
      ]);

      // The `creates` subset — the only thing the loop may ACT on — holds no entry for the fix, and
      // since 123 holds no entry for anything else either.
      assert.deepEqual(close.creates, [], "the creates subset is empty");
      const fixed = close.routed.find((d) => d.title === "F-cheap");
      assert.equal(fixed.creates, null, "…because the fix creates nothing");

      // …and it is REPORTED, not silently absorbed: the close names it with its routing, names the
      // chore-shaped finding it hands back, and names the recorded one.
      assert.deepEqual(
        close.routed.map((d) => [d.title, d.routing]),
        [["F-cheap", "fixed"], ["F-chore", "story"], ["F-nit", "recorded"]],
        "each surviving finding is named with the routing it took",
      );
      assert.equal(close.nothingToRoute, false);

      // TERMINATION IS BY CONSTRUCTION: every surviving finding is routed exactly once, so N
      // findings admit at most N fixes. No numeric bound is owed and none is introduced.
      const many = routeFindings(["a", "b", "c", "d"].map((t) => finding({ title: t, cheaperThanDriver: true })));
      assert.equal(many.routed.length, 4, "four findings route to four decisions");
      assert.deepEqual(many.creates, [], "…and to no creations at all");

      // No finding id is allocated and no @finding-<id> tag is emitted by the new routing either.
      const serialized = JSON.stringify(close);
      assert.equal(serialized.includes("@finding-"), false, "no @finding-<id> tag");
      assert.equal(/"(id|findingId)"\s*:/u.test(serialized), false, "no id is allocated");
    },
  },

  // ==========================================================================
  // 118 task 01 — a chore's review mints no chore
  // ==========================================================================
  {
    name: "118 task01: reviewing a chore, a checklist-dischargeable finding folds into that chore's own Definition of Done",
    run() {
      const folded = routeFinding(finding({ checklistDischargeable: true }), { reviewedType: "chore" });
      assert.equal(folded.routing, "amendment", "the fold REUSES the amendment routing and adds no sixth");
      assert.equal(folded.vehicle, "reviewed-chore-definition-of-done", "…with a vehicle naming the reviewed chore's own Definition of Done");
      assert.equal(folded.creates, null, "it creates nothing");
      assert.equal(folded.owner, "loop", "…and its owner is the loop");

      // The same finding reviewing a STORY is handed back, not promoted (123). 118/01's own claim —
      // that reviewing a chore mints no chore — is satisfied a fortiori: nothing mints one now.
      const handedBack = routeFinding(finding({ checklistDischargeable: true }), { reviewedType: "story" });
      assert.deepEqual(
        [handedBack.routing, handedBack.vehicle, handedBack.creates, handedBack.owner],
        ["story", "operator-refines", null, "operator"],
        "reviewing a story, the remedy leaves as the operator's story shape",
      );

      // …and with NO reviewed-item context supplied, the decider answers the same way, which is what
      // keeps the second argument additive: no existing caller changes.
      assert.deepEqual(routeFinding(finding({ checklistDischargeable: true })), handedBack, "an absent context routes as a present non-chore one does");
      assert.deepEqual(routeFindings([finding({ checklistDischargeable: true })]).creates, [], "…and the close creates nothing");
    },
  },
  {
    name: "118 task01: what the reviewed item's type decides, and a cheap remedy is still fixed whatever is under review",
    run() {
      for (const [reviewedType, routing] of [["chore", "amendment"], ["story", "story"], ["milestone", "story"], ["spike", "story"], ["uat", "story"]]) {
        const decision = routeFinding(finding({ checklistDischargeable: true }), { reviewedType });
        assert.equal(decision.routing, routing, `reviewing a ${reviewedType}, a checklist-dischargeable finding routes to ${routing}`);
        assert.equal(decision.creates, null, `…and creates nothing, whatever is under review`);
      }

      // The cost question answers FIRST, so the depth bound is never reached for a cheap remedy.
      const cheap = routeFinding(finding({ cheaperThanDriver: true, checklistDischargeable: true }), { reviewedType: "chore" });
      assert.equal(cheap.routing, "fixed", "a cheap remedy is fixed even while a chore is under review");
      assert.equal(cheap.vehicle, "fixed-at-close", "…and the depth bound is never reached");

      // The bound is on TYPE, never on PROVENANCE: a chore raised by a person bounds its own review
      // exactly as a promoted one does — 95 and 97 were raised by hand and still minted 115 and 114.
      const context = { reviewedType: "chore" };
      assert.equal(routeFinding(finding({ checklistDischargeable: true, promotionKey: null }), context).routing, "amendment");
      assert.equal(routeFinding(finding({ checklistDischargeable: true, promotionKey: "finding:88:x" }), context).routing, "amendment");
    },
  },
  {
    name: "118 task01: promoting a finding raised while reviewing a chore is refused at the verb, and the refusal writes nothing at all",
    run: () => withReviewedStream(async ({ workDir, workspace }) => {
      // The reviewed chore is made the way the measured six were made: by promoting a finding.
      const seed = await promote(workspace, FINDING);
      assert.equal(seed.promoted, true, "the first promotion, off a story, still succeeds");
      const choreRef = seed.chore.ref;

      const before = await streamSnapshot(workDir);
      const error = await promote(workspace, { ...FINDING, ref: choreRef, title: "F-b raised reviewing the chore" })
        .then(() => null, (thrown) => thrown);

      assert.ok(error, "the verb refuses");
      assert.equal(error.code, "promote-finding-reviewing-a-chore", "with the new coded reason");
      assert.equal(error.status, 400, "…at the refusal exit the other input refusals use — read, never defaulted");
      assert.match(String(error.message), /chore/iu, "the refusal names the reviewed item as a chore");
      assert.match(String(error.message), /Definition of Done/u, "…names the reviewed chore's own Definition of Done");
      assert.match(String(error.message), /operator/iu, "…and names the operator hand-back — the two destinations open to the remedy");

      // …and it wrote NOTHING: no folder, no renumber, no CHORE.md amended. The stream is
      // byte-identical to what it was before the call.
      assert.deepEqual(await streamSnapshot(workDir), before, "the stream is byte-identical to what it was before the refused promotion");
    }),
  },
  {
    name: "118 task01: the refusal decides BEFORE the idempotence scan, so an already-promoted finding cannot cross the bound",
    run: () => withReviewedStream(async ({ workDir, workspace }) => {
      // A finding promoted off a STORY, then re-promoted: the delivered idempotence answer, unchanged.
      const first = await promote(workspace, FINDING);
      const again = await promote(workspace, FINDING);
      assert.equal(again.promoted, false, "a story's already-promoted finding is reported, not refused");
      assert.equal(again.chore.ref, first.chore.ref, "…naming the chore that already schedules it");

      // The SAME shape with a chore under review is REFUSED rather than answered "already promoted".
      // A bound that can be crossed by having already crossed it once is not a bound: all six
      // measured recursions would otherwise have passed straight through it.
      const choreRef = first.chore.ref;
      const raised = { ...FINDING, ref: choreRef, title: "F-c raised reviewing the chore" };
      const firstRefusal = await promote(workspace, raised).then(() => null, (thrown) => thrown);
      assert.equal(firstRefusal?.code, "promote-finding-reviewing-a-chore");

      const before = await streamSnapshot(workDir);
      const repeat = await promote(workspace, raised).then(() => null, (thrown) => thrown);
      assert.equal(repeat?.code, "promote-finding-reviewing-a-chore", "a second attempt is refused by the bound, not admitted by the scan");
      assert.deepEqual(await streamSnapshot(workDir), before, "…and still writes nothing");
    }),
  },
  {
    name: "118 task01: the refusal takes its place in the existing order, and follows the reviewed item's type",
    run: () => withReviewedStream(async ({ workDir, workspace }) => {
      // Every delivered refusal is unchanged, and the new one joins them.
      const chore = (await promote(workspace, { ...FINDING, title: "F-seed the chore" })).chore.ref;
      const unchanged = [
        ["missing a ref", { ...FINDING, ref: "" }, "promote-finding-invalid-ref"],
        ["missing a title", { ...FINDING, title: "" }, "promote-finding-invalid-title"],
        ["missing a remedy", { ...FINDING, remedy: "" }, "promote-finding-invalid-remedy"],
        ["naming a ref that does not resolve", { ...FINDING, ref: "99/99" }, "promote-finding-unknown-ref"],
        ["carrying an input outside the declared set", { ...FINDING, at: 0 }, "promote-finding-unknown-input"],
        ["naming a chore that resolves, with title and remedy", { ...FINDING, ref: chore, title: "F-new" }, "promote-finding-reviewing-a-chore"],
      ];
      for (const [flaw, input, code] of unchanged) {
        const error = await promote(workspace, input).then(() => null, (thrown) => thrown);
        assert.ok(error, `an invocation ${flaw}: is refused`);
        assert.equal(error.code, code, `an invocation ${flaw}: with the ${code} refusal`);
      }

      // A story whose finding was already promoted is NOT a refusal — the existing chore is reported.
      const reported = await promote(workspace, { ...FINDING, title: "F-seed the chore" });
      assert.equal(reported.promoted, false, "a story's repeat promotion still reports rather than refuses");
      assert.equal(reported.chore.ref, chore);

      // …and every OTHER reviewed type promotes exactly as it does today.
      const spike = await writeTopLevelItem(workDir, "82", "spike", "SPIKE.md");
      const topStory = await writeTopLevelItem(workDir, "85", "story", "STORY.md");
      const uat = await writeUatItem(workDir, "32");
      assert.ok(spike && topStory && uat, "the fixture stream carries a spike, a top-level story and a uat gate");
      for (const [ref, type] of [["85", "story"], ["71", "milestone"], ["71/02", "story"], ["82", "spike"], ["32", "uat"]]) {
        const result = await promote(workspace, { ...FINDING, ref, title: `F-off-a-${type}-${ref.replace("/", "-")}` });
        assert.equal(result.promoted, true, `a finding raised reviewing ${ref} (a ${type}) promotes, exactly as it does today`);
      }
    }),
  },
  {
    name: "118 task01: the operator's own face is unbound — `work:promote-gap` reaches nothing this change touched",
    run: () => withReviewedStream(async ({ workDir, workspace }) => {
      const chore = (await promote(workspace, FINDING)).chore.ref;
      assert.ok(chore, "a chore exists in the stream, so the depth bound has a subject to bind");

      // The gap face schedules chore-shaped work with no reviewed ref at all, and its delivered
      // `--at` still chooses a position (71/ADR-009 §1 separates the two seams at the FACE).
      const before = (await listItems(workDir)).filter((item) => item.parent == null).length;
      const gap = await invoke("work:promote-gap", { title: "A gap the operator chose", discharge: "close it", at: 0 }, { workspace });
      assert.equal(gap.chore.ref, "00", "the operator's chosen position is honoured");
      assert.ok(gap.shifted > 0, "…and the stream renumbered beneath it, which the loop's face may never do");
      assert.equal(
        (await listItems(workDir)).filter((item) => item.parent == null).length,
        before + 1,
        "exactly one item was created",
      );
      assert.ok("at" in promoteGapToChoreCommand.input.properties, "the gap face still declares its delivered --at");
    }),
  },
  // ==========================================================================
  // 123 task00 — the close creates nothing
  // ==========================================================================
  // The rows above were re-pointed at 123's rule in place, because they assert 118's questions and
  // 118's questions did not move — only question 3's ANSWER did. That leaves the story's own claim
  // asserted under its predecessor's name, so it is stated here once, under its own, exactly as
  // `arch/123 FF-7103` states the structural half under its own.
  {
    name: "123 task00: a checklist-shaped remedy that is not cheap is handed back, and no reviewed type buys a creation",
    run() {
      // sc.1 — the hand-back, whole: routing, vehicle, creation and owner in one assertion.
      assert.deepEqual(
        (({ routing, vehicle, creates, owner }) => ({ routing, vehicle, creates, owner }))(
          routeFinding(finding({ checklistDischargeable: true }), { reviewedType: "story" }),
        ),
        { routing: "story", vehicle: "operator-refines", creates: null, owner: "operator" },
      );

      // sc.2 + sc.3 — the reviewed item's type no longer decides WHETHER an item is created. The
      // chore row is 118/01's fold-in, satisfied a fortiori rather than weakened: it still routes to
      // `amendment` and still creates nothing.
      for (const [reviewedType, routing] of [["chore", "amendment"], ["story", "story"], ["milestone", "story"], ["spike", "story"], ["uat", "story"]]) {
        const decision = routeFinding(finding({ checklistDischargeable: true }), { reviewedType });
        assert.equal(decision.routing, routing, `reviewing a ${reviewedType}`);
        assert.equal(decision.creates, null, `…and reviewing a ${reviewedType} creates nothing`);
      }

      // sc.4 — with no reviewed-item context at all, the decider still creates nothing.
      const bare = routeFinding(finding({ checklistDischargeable: true }));
      assert.deepEqual([bare.routing, bare.creates], ["story", null], "an absent context still creates nothing");

      // sc.6 — a close of three deposits no driver in the stream, and each finding is still named
      // with the routing it took: the rule moves work from "scheduled" to "done", never to "dropped".
      const close = routeFindings([
        finding({ title: "F-cheap", cheaperThanDriver: true }),
        finding({ title: "F-list", checklistDischargeable: true }),
        finding({ title: "F-nit", severity: "nit" }),
      ]);
      assert.deepEqual(close.creates, [], "the `creates` subset is empty by construction");
      assert.deepEqual(
        close.routed.map((decision) => [decision.title, decision.routing, decision.owner]),
        [["F-cheap", "fixed", "loop"], ["F-list", "story", "operator"], ["F-nit", "recorded", "loop"]],
      );

      // sc.9 — the routing SET is not narrowed with the decider. `chore` keeps its name and its
      // delivered position, because `work:promote-gap` still creates one for an operator who types
      // it; what changed is which member this decider can reach.
      assert.deepEqual(FINDING_ROUTINGS, ["amendment", "chore", "story", "recorded", "fixed"]);
      assert.ok(FINDING_ROUTINGS.includes("chore"), "`chore` is still a member of the delivered set");
    },
  },
];

