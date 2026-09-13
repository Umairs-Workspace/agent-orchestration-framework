// FF-6607a (milestone 66 / ADR-004 §4, ADR-009 ROUND 3/12) — NO STAGED CONTROL.
//
// "Zero `*.test.*`/`*.spec.*` under `<work.dir>/**` (the `reference/` retirement
//  convention, renamed out of every glob, stays admitted as the one exception shape)."
//
// ─────────────────────────────────────────────────────────────────────────────
// THE MEASUREMENT THIS PROHIBITION EXISTS FOR IS SOMEBODY ELSE'S TREE, AND THAT IS THE
// POINT. Of 15 guards staged inside one downstream milestone's documentation tree, 5
// landed byte-identical, 8 CHANGED ON CONTACT WITH A RUNNER (one grew +124%) and 2
// never landed at all — and the failure correlated with COMPLIANCE, because ACD asks
// architects to author guards ahead of their subject and gives them nowhere to run.
// aof has no staging folder today (measured: 0 test-shaped files under `wiki/`), so
// this gate costs nothing now and is a ratchet against importing the habit.
//
// TWO NAMED HOLES, STATED SO NEITHER IS LATER MISTAKEN FOR THE OTHER (ROUND 3/12):
//
//  (a) `wiki/work/02_milestone_planning-init/UAT.md:68` holds a `## Findings` register
//      in a `UAT.md`, which is OUTSIDE ADR-001 §1's frozen three-file set — so its rows
//      declare nothing, to the recogniser and therefore to the register lane. Asserted
//      below rather than described, because a hole nobody can see is the shape this
//      milestone exists to refuse.
//
//  (b) THE DOCTOR LANE'S WALK IS NARROWER THAN THIS GATE'S `**`. The lane rides the
//      per-item-dir recursion `buildSnapshot` already performs (`work-doctor.mjs`'s
//      `scanItemTree`, formerly `newestFileMtimeMs`), which runs PER ITEM DIR — so a
//      test-shaped file sitting directly under `<work.dir>`, or inside an orphan folder
//      that matches no item grammar, is never visited. That is a DIFFERENCE, not a
//      contradiction: this gate holds the wider claim, the lane holds the cheaper one,
//      and the difference is DEMONSTRATED below over a temp fixture rather than
//      asserted, so it cannot quietly become a contradiction.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSnapshot } from "../../../src/work/doctor.mjs";
import { controlGroup, isControlFileName } from "../../../src/work/doctor-controls.mjs";
import { registerBlockKind, registerDeclarations, registerEntries } from "../../../src/declared-id.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const workDir = path.join(repoRoot, "wiki", "work");

// The prohibition's own glob, spelled as the predicate the runners use. A file whose
// NAME carries `.test.` or `.spec.` before its extension is inside a runner's glob;
// anything else is not, which is exactly what the retirement convention exploits.
const STAGED = /\.(?:test|spec)\.[A-Za-z0-9]+$/;

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

let corpus = null;
const files = async () => (corpus ??= await walk(workDir));

export const archTests = [
  {
    name: "arch/FF-6607a: ZERO test-shaped files under the work directory, over the WIDE `**` walk",
    run: async () => {
      const all = await files();
      assert.ok(all.length > 1000, `non-vacuity: the walk really reached the tree (${all.length} files)`);
      const staged = all.filter((file) => STAGED.test(path.basename(file)));
      assert.deepEqual(
        staged.map((file) => path.relative(workDir, file).replaceAll("\\", "/")),
        [],
        "a control lands in the runnable tree where a runner can see it — never staged beside its documentation (ADR-004 §4)",
      );
      // …and the predicate the SHIPPED lane uses agrees with this gate's glob over
      // every filename in the tree, so the two cannot drift apart silently.
      for (const file of all) {
        assert.equal(isControlFileName(path.basename(file)), STAGED.test(path.basename(file)), path.basename(file));
      }
    },
  },
  {
    name: "arch/FF-6607a: the RETIREMENT CONVENTION is the one admitted exception shape, and it is a real population",
    run: async () => {
      const all = await files();
      const mjs = all.filter((file) => file.endsWith(".mjs"));
      assert.ok(mjs.length > 20, `non-vacuity: the work tree really does hold executable-looking files (${mjs.length} .mjs)`);
      // Every one of them is admitted, because none is test-shaped: m35's
      // `reference/retired-dispatch-tests/` renamed its suites OUT of every glob when
      // their subjects were eliminated (TECH_DEBT item 5).
      for (const file of mjs) {
        assert.equal(isControlFileName(path.basename(file)), false, `${path.relative(workDir, file)} is admitted — the retirement convention is a rename, not an exemption`);
      }
      const retired = mjs.filter((file) => file.replaceAll("\\", "/").includes("/retired-"));
      assert.ok(retired.length > 20, `non-vacuity: the retirement convention is a real population (${retired.length} files), so "0 staged" is not "0 files"`);
      // The shapes the contract enumerates, one by one.
      for (const [name, staged] of [
        ["thing.test.mjs", true],
        ["thing.spec.ts", true],
        ["thing.test.js", true],
        ["acd-lease-write-scope.mjs", false],
        ["memory-spike.mjs", false],
        ["00_a-task.feature", false],
      ]) {
        assert.equal(isControlFileName(name), staged, name);
      }
    },
  },
  {
    name: "arch/FF-6607a: HOLE (a) — `02_milestone_planning-init/UAT.md`'s `## Findings` register sits outside the frozen file set, so its rows declare nothing",
    run: async () => {
      const uat = path.join(workDir, "02_milestone_planning-init", "UAT.md");
      const text = await readFile(uat, "utf8");
      assert.match(text, /^##[ \t]+Findings\s*$/m, "the register really is there — the hole is real, not hypothetical");
      assert.deepEqual(registerEntries(text, "UAT.md"), [], "and it declares nothing, because ADR-001 §1's frozen file set is ARCHITECTURE.md / VERIFICATION.md / SESSION.md");

      // THE FILE-SET FACT, isolated: the SAME heading opens a register in a frozen file
      // and opens nothing in a `UAT.md`. Asserted through the one home's own predicate,
      // so the hole is a property of the decided set rather than of this document.
      assert.equal(registerBlockKind("## Findings", "UAT.md"), null);
      assert.equal(registerBlockKind("## Findings", "VERIFICATION.md"), "declaring");
      assert.equal(registerBlockKind("## Findings", "SESSION.md"), "declaring");

      // AND THE SECOND REASON, MEASURED RATHER THAN ASSUMED (ADR-009/A). This register's
      // rows would declare nothing even in a frozen file: they are BULLETS — the form
      // ADR-001 deliberately does not admit, because tolerating it is the 33%-precision
      // configuration the finding measured — and their ids are written `F1`, unhyphenated,
      // which is outside `ID_FORMS` altogether. So the file-set hole is real but it is
      // not what silences THIS document, and recording that is cheaper than a later
      // reviewer discovering the gate's claim was bigger than its evidence.
      assert.match(text, /^- \*\*F1 \(blocker/m, "the rows are bullets, not headings or table cells");
      assert.deepEqual(registerEntries(text, "VERIFICATION.md"), [], "…so the identical bytes declare nothing in a frozen file either — two independent reasons, and the gate claims only the one it measured");
    },
  },
  {
    name: "arch/FF-6607a: HOLE (b) — the doctor lane's walk is PER ITEM DIR and therefore narrower than this gate's `**`, demonstrated over a temp fixture",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff6607-"));
      try {
        const stream = path.join(root, "work");
        const item = path.join(stream, "70_milestone_fixture");
        await mkdir(path.join(item, "tasks"), { recursive: true });
        await mkdir(path.join(stream, "not-an-item"), { recursive: true });
        await writeFile(
          path.join(item, "SPEC.md"),
          "---\ntype: milestone\nnumber: 70\nslug: fixture\nstatus: in-progress\ncreated: 2026-08-01\nupdated: 2026-08-01\nschema: 1\n---\n# m70\n",
          "utf8",
        );
        // THREE planted staged controls: one inside the item (SEEN by both), one
        // directly under the work dir and one in an orphan folder (seen only by `**`).
        const inside = path.join(item, "tasks", "inside.test.mjs");
        const atRoot = path.join(stream, "at-root.test.mjs");
        const orphan = path.join(stream, "not-an-item", "orphan.test.mjs");
        for (const file of [inside, atRoot, orphan]) await writeFile(file, "// planted\n", "utf8");

        // The WIDE claim — this gate's own walk.
        const wide = (await walk(stream)).filter((file) => STAGED.test(path.basename(file)));
        assert.deepEqual(wide.sort(), [atRoot, inside, orphan].sort(), "`**` sees all three");

        // The NARROW one — the shipped lane, through the snapshot the spine builds.
        const snapshot = await buildSnapshot(stream, { projectRoot: root });
        const reported = controlGroup(snapshot, {}).filter((finding) => finding.code === "staged-control").map((finding) => finding.path);
        assert.deepEqual(reported, [inside], "the lane sees the one inside an item dir, and neither of the other two");
        assert.equal(reported.includes(atRoot), false, "a file directly under <work.dir> is unseen by the per-item walk");
        assert.equal(reported.includes(orphan), false, "…and so is one under a folder that matches no item grammar");
        // NON-VACUITY on the narrow half: it is not simply blind. Remove the planted
        // file inside the item and the lane reports nothing at all.
        await rm(inside);
        const clean = await buildSnapshot(stream, { projectRoot: root });
        assert.deepEqual(controlGroup(clean, {}).filter((finding) => finding.code === "staged-control"), [], "…and with nothing staged inside an item, the lane is silent");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/FF-6607a: ADR-011/D — a staged path is attributed to the item that OWNS it, so the horizon judges the right owner and no `error` lands under a `done` item",
    run: async () => {
      // THE LATENT DEFECT THIS LANE EXISTS FOR, and it is invisible without a NESTED
      // item: `scanItemTree` walks a whole subtree and a milestone's subtree contains
      // its stories', so before ADR-011/D one file produced TWO findings at two
      // severities, and the engine's code+path+message de-dupe — which does not key on
      // severity — kept whichever came first. The two rows that matter:
      //   open milestone + DONE story  → the story's file was reported at `error`,
      //                                  against a path under a `done` item (ADR-002 §1)
      //   DONE milestone + open story  → the story's `error` was silently lost
      // 0 such files exist in this tree, so nothing but a fixture can see it.
      const fixture = async (milestoneStatus, storyStatus) => {
        const root = await mkdtemp(path.join(os.tmpdir(), "aof-adr011d-"));
        const stream = path.join(root, "work");
        const milestone = path.join(stream, "70_milestone_owner");
        const story = path.join(milestone, "stories", "00_story_child");
        await mkdir(path.join(story, "tasks"), { recursive: true });
        const front = (fields) => `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n`;
        await writeFile(path.join(milestone, "SPEC.md"), front({ type: "milestone", number: 70, slug: "owner", status: milestoneStatus, created: "2026-08-01", updated: "2026-08-01", schema: 1 }), "utf8");
        await writeFile(path.join(story, "STORY.md"), front({ type: "story", number: "00", slug: "child", parent: 70, status: storyStatus, created: "2026-08-01", updated: "2026-08-01", schema: 1 }), "utf8");
        // ONE staged file in the milestone's own dir, ONE inside the story's.
        const onMilestone = path.join(milestone, "milestone-owned.test.mjs");
        const onStory = path.join(story, "tasks", "story-owned.test.mjs");
        await writeFile(onMilestone, "// planted\n", "utf8");
        await writeFile(onStory, "// planted\n", "utf8");
        const snapshot = await buildSnapshot(stream, { projectRoot: root });
        const findings = controlGroup(snapshot, {}).filter((finding) => finding.code === "staged-control");
        return { root, snapshot, findings, onMilestone, onStory };
      };

      for (const [milestoneStatus, storyStatus, expected] of [
        ["in-progress", "in-progress", { milestone: "error", story: "error" }],
        ["in-progress", "done", { milestone: "error", story: "warn" }],
        ["done", "in-progress", { milestone: "warn", story: "error" }],
        ["done", "done", { milestone: "warn", story: "warn" }],
      ]) {
        const built = await fixture(milestoneStatus, storyStatus);
        try {
          const label = `milestone ${milestoneStatus} / story ${storyStatus}`;
          // (a) EACH FILE APPEARS ON EXACTLY ONE ROW — asserted on the snapshot itself,
          //     before de-dupe can hide the duplicate.
          const rows = built.snapshot.items.map((item) => [item.ref, [...item.stagedControls].sort()]);
          assert.deepEqual(
            rows,
            [["70", [built.onMilestone]], ["70/00", [built.onStory]]],
            `${label}: the milestone owns its own file and NOT its story's — the story's dir is a nested item`,
          );
          // (b) …so exactly two findings, one per file, each at its OWNER's severity.
          assert.deepEqual(
            built.findings.map((finding) => [finding.path, finding.severity]).sort(),
            [[built.onMilestone, expected.milestone], [built.onStory, expected.story]].sort(),
            `${label}: the horizon judges the item that owns the path (ADR-009/F)`,
          );
          // (c) THE INVARIANT ADR-002 STATES VERBATIM: no `error` against a path under a
          //     `done` item, whichever level is done.
          for (const finding of built.findings) {
            const owner = built.snapshot.items.find((item) => finding.path.startsWith(item.dir + path.sep) && item.stagedControls.includes(finding.path));
            assert.ok(owner != null, `${label}: every finding has an owning row`);
            if (owner.meta.status === "done") {
              assert.equal(finding.severity, "warn", `${label}: ${finding.path} is under a \`done\` item and must never be an error`);
            }
          }
        } finally {
          await rm(built.root, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "arch/FF-6607a: the wide claim is CHECKED, not merely stated — a planted staged control under the work directory is detected",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff6607-plant-"));
      try {
        await mkdir(path.join(root, "66_milestone_x", "tasks"), { recursive: true });
        await writeFile(path.join(root, "66_milestone_x", "tasks", "guard.spec.ts"), "// planted\n", "utf8");
        await writeFile(path.join(root, "66_milestone_x", "tasks", "00_a-task.feature"), "@executable\nFeature: x\n", "utf8");
        const staged = (await walk(root)).filter((file) => STAGED.test(path.basename(file)));
        assert.deepEqual(staged.map((file) => path.basename(file)), ["guard.spec.ts"], "a planted `.spec.ts` IS found, and a `.feature` beside it is not");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/FF-6607a: this milestone's own register declares only `FF-66NN` ids, read independently of the recogniser",
    run: async () => {
      // m22/R1's own-coverage rule, on the cheap side: the register the resolve gate
      // parses is really this milestone's, and its rows really are its own id space.
      const text = await readFile(path.join(workDir, "66_milestone_controls-that-run", "ARCHITECTURE.md"), "utf8");
      const declared = registerDeclarations(text, "ARCHITECTURE.md").map((entry) => entry.id);
      assert.ok(declared.length > 0, "non-vacuity: the register declares its controls");
      for (const id of declared) assert.match(id, /^FF-66\d\d$/, `${id} is one of this milestone's own id space`);
      const byHand = [...text.matchAll(/^\|\s*\*\*(FF-66\d\d)\*\*\s*\|/gm)].map((match) => match[1]);
      assert.deepEqual(declared, byHand, "the recogniser finds exactly the rows the register carries — no more, no fewer");
    },
  },
];
