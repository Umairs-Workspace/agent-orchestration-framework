// FF-6607b (milestone 66 / ADR-004 §1/§3, ADR-007 §1, ADR-009/B + /J) — THIS
// MILESTONE'S OWN CONTROLS RESOLVE.
//
// "Every `FF-66NN` declared here passes both ADR-004 legs" — and the gate parses THIS
// REGISTER with the SHIPPED recogniser, so a row added to it without a file fails
// immediately. That is m22/R1's own-coverage rule, and the guard against a gate for
// guards that is itself ungated.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT "PASSES BOTH LEGS" MEANS WHILE THE MILESTONE IS STILL BEING BUILT (ADR-004 §3,
// ADR-009/B). A declaration authored ahead of its subject declares itself `pending`,
// which is ACD's `xfail`: a time-boxed statement that the control is KNOWN-ABSENT,
// instead of an invisible absence. So the invariant this gate holds is the one that is
// true at every point of the build AND refuses the accept:
//
//   every declaration either RESOLVES under both legs, or carries the pending token
//
// and a row with neither is a failure of this gate on the run after it is written.
// The marker is inadmissible at `done`, so the resolve leg greens as each `pending`
// clears and the milestone cannot be accepted holding one.
//
// LEG B IS DRIVEN WITH THE TWO RUNNERS NAMED EXPLICITLY, and that is deliberate rather
// than convenient: this repo declares no `work.controls.runners`, so in production leg
// B is an honest no-op here (`control-runner-unchecked`). Naming the two runner files
// in the gate is what makes the "both legs" claim CHECKED rather than deferred —
// and it inherits TECH_DEBT item 50's hole (a substring search cannot see an
// imported-but-never-spread suite), which 66 states rather than pretends to close.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSnapshot } from "../../../src/work/doctor.mjs";
import { controlGroup, fitnessDeclarations } from "../../../src/work/doctor-controls.mjs";
import { resolveThroughRenames } from "../../../src/cited-path-resolve.mjs";
import { registeredSuitePaths } from "../../support/registration/registration-surface.mjs";
import { renameMapFromHistory, renameMapProblems, resolveCitedSuite } from "../../support/registration/cited-suite-path.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const workDir = path.join(repoRoot, "wiki", "work");
const milestoneDir = path.join(workDir, "archive", "66_milestone_controls-that-run");
const architecturePath = path.join(milestoneDir, "ARCHITECTURE.md");

// Both runners, NAMED (never globbed): measured, 287 suites in `test/arch/` are named
// by one of the two and exactly one — `work-content-free-discovery` — by only one of
// them, so a glob would report all 287 as visible including a suite no runner names.
// A gate wrong in the safe direction is still a gate that is wrong (m45/R5).
const RUNNERS = ["scripts/test.mjs", "scripts/test-unit.mjs"];

// DOES THIS CITED CONTROL PATH STILL NAME SOMETHING? Resolved, never merely stat-ed.
//
// 119/ADR-004 §3 and its 119/03 amendment: a register in a DELIVERED record cites its control by
// path, and 119/03 moved 1,030 suites into subject directories. Those registers are immutable, so
// there is no legal edit that repairs the citation — and a bare `stat` would report every one of
// them as a control that never landed, which is the accept-transition refusal firing on a move
// rather than on a missing control. The citation is ANSWERED through the rename this repository's
// own history records; nothing is rewritten. A path that names nothing under either reading is
// still unresolved, which is what keeps the leg's non-vacuity plants honest.
const exists = async (relative) => {
  try {
    if ((await stat(path.join(repoRoot, relative))).isFile()) return true;
  } catch { /* not at HEAD — ask the rename map below */ }
  try {
    return (await resolveCitedSuite(relative, repoRoot)).resolved;
  } catch {
    return false;
  }
};

// THE TEXT `scripts/test.mjs` IS REPRESENTED BY IN LEG B, since 119/03.
//
// The runner names DIRECTORIES now — each directory's index names its own members — so no
// control's path appears in the runner's source at all, and leg B read literally would report
// every landed control as unreached. What leg B asks is "does a configured runner name this
// control?", and the honest answer is the set of paths the registry actually reaches: every
// registered suite, PLUS every citation that resolves to one through a rename this repository's
// own history records (119/ADR-004). The second half is what keeps DELIVERED registers readable
// after a move they may not be edited to follow.
//
// This is sharper than the substring search over a 5,000-line file it replaces — that one would
// have matched a path named in a comment — and it inherits none of TECH_DEBT item 50's hole,
// because `registeredSuitePaths` requires the spread as well as the import.
async function reachedByTheRegistry() {
  const registered = await registeredSuitePaths(repoRoot);
  const renameMap = await renameMapFromHistory(repoRoot);
  const lines = [...registered];
  for (const from of renameMap.keys()) {
    const to = resolveThroughRenames(from, renameMap);
    if (to != null && registered.has(to)) lines.push(from);
  }
  return lines.join("\n");
}

async function register() {
  const text = await readFile(architecturePath, "utf8");
  return { text, declarations: fitnessDeclarations(text, "ARCHITECTURE.md") };
}

// The snapshot the lane answers from, built by hand HERE so the gate drives the shipped
// groups over this milestone's real register with both legs live.
async function snapshotFor(text) {
  const controlProbes = {};
  for (const declaration of fitnessDeclarations(text, "ARCHITECTURE.md")) {
    for (const control of declaration.controls) controlProbes[control] = await exists(control);
  }
  const runnerTexts = {};
  for (const runner of RUNNERS) {
    runnerTexts[runner] = runner === "scripts/test.mjs" ? await reachedByTheRegistry() : await readFile(path.join(repoRoot, runner), "utf8");
  }
  return {
    workDir: path.dirname(milestoneDir),
    projectRoot: repoRoot,
    topEntries: ["66_milestone_controls-that-run"],
    storyEntries: {},
    selfNode: null,
    controlProbes,
    runnerTexts,
    items: [
      {
        number: "66",
        type: "milestone",
        slug: "controls-that-run",
        name: "66_milestone_controls-that-run",
        ref: "66",
        parent: null,
        dir: milestoneDir,
        meta: { status: "in-progress" },
        stagedControls: [],
        docTexts: { "ARCHITECTURE.md": text },
        docs: {},
        docSizes: {},
        hasTasks: false,
      },
    ],
  };
}

// ─────────────────────────────────── THE ACCEPT-TRANSITION REFUSAL (ADR-011/E) ──
//
// ADR-004 §3 ends with "at `status: done` it is not admitted — a milestone cannot be
// accepted holding a pending control. That is the discharge, and the whole mechanism."
// Until now nothing enforced it, and the obvious reading of it is WRONG.
//
// THE GATE IS ON RESOLUTION, NOT ON THE MARKER, and the correction is the ruling.
// Read literally, ADR-004 §3 refuses a `done` item that carries a `pending` TOKEN — but
// measured over the real stream, m53 holds **13 unresolved declarations and not one of
// them is marked**. A marker-shaped gate waves all thirteen through at the first real
// accept, which is precisely the case the mechanism exists for. So the invariant is:
//
//     a `done` item's register declares NO UNRESOLVED control — marker or no marker.
//
// A stale marker on a landed control stays a declared no-op (ADR-009/J): the marker is
// never the subject, the resolution is.
//
// WHY A FITNESS FUNCTION AND NOT A CHECK — this was forced, not chosen. `work:doctor`
// reports the state it is HANDED, while the refusal is a claim about a PROSPECTIVE
// state, and after the transition ADR-002 §1 forbids `error` against the record at all
// (which is exactly why ADR-009/C puts the check BEFORE the transition, on an item that
// is still open). A ninth code is an ADR act and would still exit 0 at `warn`.
// `validateWork` has no severity. aof has NO transition hook — `status` is frontmatter
// an agent edits. And `--strict` was refused as the carrier for the same reason ROUND
// 3/4 refused a transitive purity rule: it would gate on all 17 unrelated warns in this
// stream and be red on arrival. What remains is ACD's third gate, a fitness function —
// this milestone's own idiom (ADR-007 §1).
//
// THE ASK THAT GOES WITH IT is 66/03's (`verify.md` step 4 naming this precondition),
// because ADR-007 §1 forbids a refusal no prompt asks for. `src/bundle/` is that
// story's exclusive territory and is untouched here.

// The gate, as a PURE function of item rows so the planted fixture drives exactly the
// code the real stream does — never a second implementation shaped to pass.
async function unresolvedUnderDone(items, probe) {
  const violations = [];
  for (const item of items) {
    if (item.meta?.status !== "done") continue;
    const architecture = item.docTexts?.["ARCHITECTURE.md"];
    if (typeof architecture !== "string") continue;
    for (const declaration of fitnessDeclarations(architecture, "ARCHITECTURE.md")) {
      const missing = [];
      // A declaration naming NO path fails leg A too — there is no path a runner could
      // ever see, which is the same defect wearing a blank cell.
      if (declaration.controls.length === 0) missing.push("(no control path in its `enforced by` cell)");
      for (const control of declaration.controls) if (!(await probe(control))) missing.push(control);
      if (missing.length > 0) violations.push({ ref: item.ref, id: declaration.id, missing, pending: declaration.pending });
    }
  }
  return violations;
}

// How many `done` items the gate actually LOOKED at — the non-vacuity floor that
// separates "nothing is owed" from "nothing was examined".
const examined = (items) =>
  items.filter((item) => item.meta?.status === "done" && typeof item.docTexts?.["ARCHITECTURE.md"] === "string" && fitnessDeclarations(item.docTexts["ARCHITECTURE.md"], "ARCHITECTURE.md").length > 0);

const frontmatter = (fields) => `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n`;

// A planted stream: one milestone at `status`, whose register declares one control
// citing `control`, optionally carrying the pending marker.
async function plantedStream({ status, control, pending }) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-adr011e-"));
  const stream = path.join(root, "work");
  const dir = path.join(stream, "70_milestone_accepted");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "SPEC.md"),
    frontmatter({ type: "milestone", number: 70, slug: "accepted", status, created: "2026-08-01", updated: "2026-08-01", schema: 1 }),
    "utf8",
  );
  await writeFile(
    path.join(dir, "ARCHITECTURE.md"),
    [
      "# 70 · Accepted",
      "",
      "## Fitness functions",
      "",
      "| id | invariant | enforced by (arch-test) | from |",
      "|---|---|---|---|",
      `| **FF-7001** | an invariant somebody meant to enforce | \`${control}\`${pending ? " **(pending — 70/00)**" : ""} | ADR-004 |`,
      "",
    ].join("\n"),
    "utf8",
  );
  return { root, stream };
}

export const archTests = [
  {
    name: "arch/FF-6607b: the SHIPPED recogniser parses this milestone's own register, and every declaration cites a control path — including the two-path resolution rule, DRIVEN",
    run: async () => {
      const { text, declarations } = await register();
      assert.ok(declarations.length >= 8, `non-vacuity: the register really declares this milestone's controls (${declarations.length})`);
      for (const declaration of declarations) {
        assert.match(declaration.id, /^FF-66\d\d$/, declaration.id);
        assert.ok(declaration.enforcedBy != null, `${declaration.id} has an "enforced by" cell — a register that never adopted the convention would declare no control obligation`);
        assert.ok(declaration.controls.length > 0, `${declaration.id} names at least one control path a runner could see`);
        for (const control of declaration.controls) {
          assert.match(control, /^test\/arch\/[a-z0-9-]+\.test\.mjs$/, `${declaration.id} cites ${control} — this milestone's controls all live in the runnable tree`);
        }
      }
      // FF-6607 is the two-path case ADR-009/J names, and it must stay one.
      const two = declarations.filter((declaration) => declaration.controls.length > 1);
      assert.deepEqual(two.map((declaration) => declaration.id), ["FF-6607"], "FF-6607 is the one declaration in this register that cites two paths");
      const cited = declarations.flatMap((declaration) => declaration.controls);
      assert.equal(cited.length, declarations.length + 1, `${cited.length} \`test/arch/…\` citations across ${declarations.length} declarations`);

      // …AND THE SENTENCE IS DRIVEN, NOT ASSERTED. The line above checks an ID LIST; on
      // its own it would claim more than it checks, which is this milestone's exact
      // defect. So the resolution rule ADR-009/J states — "the declaration resolves only
      // when BOTH do" — is exercised HERE, over this register's own two-path row: with
      // either half of FF-6607 absent, the declaration is reported.
      const [first, second] = two[0].controls;
      const snapshot = await snapshotFor(text);
      for (const [absent, present] of [[first, second], [second, first]]) {
        const findings = controlGroup(
          { ...snapshot, controlProbes: { ...snapshot.controlProbes, [absent]: false, [present]: true } },
          {},
        ).filter((finding) => finding.code === "control-unresolved" && finding.message.startsWith("FF-6607 "));
        assert.equal(findings.length, 1, `FF-6607 with ${absent} absent is reported, though ${present} is on disk — resolving on EITHER path would report nothing`);
        assert.ok(findings[0].message.includes(absent), `…and the finding names ${absent}`);
        assert.equal(findings[0].message.includes(present), false, `…and only that one`);
      }
      // …while with both present it is silent, so the lane above is not simply always red.
      assert.deepEqual(
        controlGroup({ ...snapshot, controlProbes: { ...snapshot.controlProbes, [first]: true, [second]: true } }, {})
          .filter((finding) => finding.code === "control-unresolved" && finding.message.startsWith("FF-6607 ")),
        [],
        "both on disk ⇒ FF-6607 resolves",
      );
    },
  },
  {
    name: "arch/FF-6607b: every declaration RESOLVES under both legs, or carries the pending token — and a row with neither fails on the next run",
    run: async () => {
      const { text, declarations } = await register();
      const owing = [];
      for (const declaration of declarations) {
        const missing = [];
        for (const control of declaration.controls) if (!(await exists(control))) missing.push(control);
        if (missing.length === 0) continue;
        if (declaration.pending) {
          owing.push(`${declaration.id} (pending — ${missing.join(", ")})`);
          continue;
        }
        assert.fail(
          `${declaration.id} cites ${missing.join(", ")}, which is not a file on disk, and its entry carries no \`pending\` marker — declare it pending (ADR-004 §3) or land the file`,
        );
      }
      // The register is not required to be fully landed mid-flight; it IS required to
      // be honest about what has not landed. Reported here so the run says which
      // controls are still owed rather than only that the gate passed.
      if (owing.length > 0) console.log(`      FF-6607b: ${owing.length} control(s) still declared pending — ${owing.join("; ")}`);
      assert.ok(true);

      // NON-VACUITY, and the exact scenario the contract names: a row added to THIS
      // register with no file and no token is reported at ERROR on the next run. Driven
      // over the real register's bytes with one row appended, so the gate is proven to
      // bite on this document rather than on a fixture shaped to make it bite.
      const planted = text.replace(
        /^\| \*\*FF-6608\*\* \|/m,
        "| **FF-9999** | a control nobody landed | `test/arch/acd-never-written.test.mjs` | never measured | ADR-004 |\n| **FF-6608** |",
      );
      assert.notEqual(planted, text, "non-vacuity: the search string occurs in the shipped register — a no-op replace would compare the document with itself");
      const plantedDeclarations = fitnessDeclarations(planted, "ARCHITECTURE.md");
      assert.equal(plantedDeclarations.length, declarations.length + 1, "the planted row is read as a declaration");
      const findings = controlGroup(await snapshotFor(planted), {});
      const unresolved = findings.filter((finding) => finding.code === "control-unresolved" && finding.message.includes("FF-9999"));
      assert.equal(unresolved.length, 1, `the planted row is reported: ${JSON.stringify(findings.map((f) => [f.code, f.severity, f.message.slice(0, 60)]))}`);
      assert.equal(unresolved[0].severity, "error", "at ERROR, because the milestone is open and the entry carries no pending marker");
    },
  },
  {
    name: "arch/FF-6607b: LEG B is live — every control of this milestone that HAS landed is named by a runner",
    run: async () => {
      const { text } = await register();
      const findings = controlGroup(await snapshotFor(text), {});
      const unregistered = findings.filter((finding) => finding.code === "control-unregistered");
      assert.deepEqual(
        unregistered.map((finding) => finding.message),
        [],
        "a control no runner reaches is a control that never runs — every landed FF-66NN is registered in scripts/test.mjs or scripts/test-unit.mjs",
      );
      // NON-VACUITY: leg B is capable of firing. The same snapshot with runners that
      // name nothing reports every LANDED control as unregistered, so "no findings" is
      // an observation about the runners rather than a dead lane.
      const snapshot = await snapshotFor(text);
      // Counted per DECLARATION, because both legs answer per declaration: leg B is
      // suppressed wherever leg A already failed (ADR-009/J), so a declaration citing a
      // path that has not landed contributes no `control-unregistered` either way.
      const landed = fitnessDeclarations(text, "ARCHITECTURE.md").filter((declaration) =>
        declaration.controls.length > 0 && declaration.controls.every((control) => snapshot.controlProbes[control] === true),
      ).length;
      assert.ok(landed > 0, `non-vacuity: at least one of this milestone's controls has landed (${landed})`);
      const blind = controlGroup({ ...snapshot, runnerTexts: { "scripts/test.mjs": "// names nothing" } }, {});
      assert.equal(
        blind.filter((finding) => finding.code === "control-unregistered").length,
        landed,
        "with a runner that names nothing, every landed control is reported — leg B has teeth",
      );
      // …and with NO runner list at all it is an honest no-op, once for the milestone.
      const unchecked = controlGroup({ ...snapshot, runnerTexts: null }, {});
      assert.equal(unchecked.filter((finding) => finding.code === "control-runner-unchecked").length, 1);
      assert.deepEqual(unchecked.filter((finding) => finding.code === "control-unregistered"), [], "leg B is suppressed when it did not run — never a silent pass, and never a guess");
    },
  },
  {
    name: "arch/FF-6607b: ADR-011/E — NO `done` item's register declares an UNRESOLVED control, marker or no marker (the accept-transition refusal)",
    run: async () => {
      const snapshot = await buildSnapshot(workDir, { projectRoot: repoRoot });
      const violations = await unresolvedUnderDone(snapshot.items, exists);

      // NON-VACUITY FIRST, because "0 violations" and "0 items looked at" are the same
      // green and this milestone exists to tell them apart. Measured 2026-08-16: two
      // accepted registers carry ids — m37 (7 declarations) and m52 (9) — and all 16
      // resolve. m53's 13 and m66's FF-6608 are owed, and both items are still OPEN,
      // which is the state ADR-004 §3 admits and this gate refuses at the transition.
      const looked = examined(snapshot.items);
      assert.ok(looked.length >= 2, `non-vacuity: the gate examined ${looked.length} accepted register(s) — a green over an empty set is not a green`);
      const declared = looked.reduce((total, item) => total + fitnessDeclarations(item.docTexts["ARCHITECTURE.md"], "ARCHITECTURE.md").length, 0);
      assert.ok(declared >= 16, `non-vacuity: ${declared} declarations sit under accepted items, and every one of them was probed`);

      assert.deepEqual(
        violations.map((violation) => `${violation.ref}/${violation.id} → ${violation.missing.join(", ")}${violation.pending ? " (and it still carries a `pending` marker)" : ""}`),
        [],
        "a milestone cannot be accepted holding a control that does not resolve — land the file, or do not accept the item (ADR-004 §3, ADR-011/E)",
      );

      // …and the items that DO owe controls are open, so the gate is refusing a
      // transition rather than reporting an accepted defect it can never clear.
      const owing = snapshot.items.filter(
        (item) => typeof item.docTexts?.["ARCHITECTURE.md"] === "string" && fitnessDeclarations(item.docTexts["ARCHITECTURE.md"], "ARCHITECTURE.md").length > 0,
      );
      for (const item of owing) {
        const unresolved = await unresolvedUnderDone([{ ...item, meta: { status: "done" } }], exists);
        if (unresolved.length === 0) continue;
        assert.notEqual(item.meta?.status, "done", `${item.ref} owes ${unresolved.length} control(s) and must not be accepted until they land`);
      }
    },
  },
  {
    name: "arch/FF-6607b: ADR-011/E NON-VACUITY — a planted `done` register holding one unresolved control is REFUSED, and the pending marker does not excuse it",
    run: async () => {
      const ABSENT = "test/arch/acd-never-landed-probe.test.mjs";
      const LANDED = "test/arch/work/acd-milestone-66-controls-resolve.test.mjs";
      assert.equal(await exists(ABSENT), false, "the planted citation really names no file");
      assert.equal(await exists(LANDED), true, "…and the control one really does");

      const drive = async (options) => {
        const planted = await plantedStream(options);
        try {
          const snapshot = await buildSnapshot(planted.stream, { projectRoot: repoRoot });
          assert.equal(snapshot.items.length, 1, "the planted stream is one item");
          return await unresolvedUnderDone(snapshot.items, exists);
        } finally {
          await rm(planted.root, { recursive: true, force: true });
        }
      };

      // (a) THE CASE THE GATE EXISTS FOR: accepted, holding a control that never landed.
      const refused = await drive({ status: "done", control: ABSENT, pending: false });
      assert.equal(refused.length, 1, "a `done` register holding an unresolved control is refused");
      assert.deepEqual(refused[0].missing, [ABSENT], "…naming the path that must land");
      assert.equal(refused[0].id, "FF-7001");

      // (b) THE CORRECTION, and the whole reason this lane is not marker-shaped: the
      //     SAME row carrying `pending` is refused just the same. A marker is a
      //     mid-flight statement, not an accept-time excuse — and m53's thirteen owed
      //     controls carry NO marker at all, so a marker-shaped gate would wave every
      //     one of them through at the first real accept.
      const marked = await drive({ status: "done", control: ABSENT, pending: true });
      assert.equal(marked.length, 1, "the pending marker does not excuse an unresolved control at `done` (ADR-004 §3, ADR-011/E)");
      assert.equal(marked[0].pending, true, "…and the finding records that the marker was there, so the message is not mysterious");

      // (c) A declaration naming NO path is the same defect with a blank cell.
      const planted = await plantedStream({ status: "done", control: ABSENT, pending: false });
      try {
        const blank = path.join(planted.stream, "70_milestone_accepted", "ARCHITECTURE.md");
        const text = await readFile(blank, "utf8");
        const search = `\`${ABSENT}\``;
        assert.ok(text.includes(search), "non-vacuity: the search string occurs — a no-op replace would compare the register with itself");
        const rewritten = text.replace(search, "enforced by review");
        assert.notEqual(rewritten, text, "non-vacuity: the citation really was removed");
        await writeFile(blank, rewritten, "utf8");
        const snapshot = await buildSnapshot(planted.stream, { projectRoot: repoRoot });
        const noPath = await unresolvedUnderDone(snapshot.items, exists);
        assert.deepEqual(noPath.map((violation) => violation.missing), [["(no control path in its `enforced by` cell)"]], "a declaration naming no path resolves under neither leg");
      } finally {
        await rm(planted.root, { recursive: true, force: true });
      }

      // (d) THE THREE WAYS THE GATE MUST STAY SILENT, so it is scoped rather than loud:
      //     an OPEN item owing a control (ADR-004 §3 admits exactly this mid-flight),
      //     an accepted item whose control landed, and an accepted item whose landed
      //     control still carries a stale marker (a declared no-op — ADR-009/J).
      assert.deepEqual(await drive({ status: "in-progress", control: ABSENT, pending: true }), [], "mid-flight, a pending control is admitted — the refusal bites at the transition, not before it");
      assert.deepEqual(await drive({ status: "in-review", control: ABSENT, pending: false }), [], "…and `in-review` is still open, which is where ADR-009/C says the refusal is raised");
      assert.deepEqual(await drive({ status: "done", control: LANDED, pending: false }), [], "an accepted item whose control landed is silent");
      assert.deepEqual(await drive({ status: "done", control: LANDED, pending: true }), [], "…and a STALE marker on a landed control is a declared no-op, never a ninth code (ADR-009/J)");
    },
  },
  {
    name: "arch/FF-6607b: the THREE controls this story lands resolve under both legs, here and now",
    run: async () => {
      // The story's own deliverables, named — the discharge ADR-004 §3 calls mechanical
      // rather than a promise. A `pending` marker on one of these after 66/02 lands
      // would be a stale marker, which ADR-009/J makes a declared no-op — so the
      // resolution is asserted directly rather than through the marker.
      const OWN = [
        "test/arch/audit/acd-controls-never-execute.test.mjs",
        "test/arch/audit/acd-controls-finding-envelope.test.mjs",
        "test/arch/audit/acd-no-staged-control.test.mjs",
        "test/arch/work/acd-milestone-66-controls-resolve.test.mjs",
      ];
      // The same two texts the snapshot's leg B is driven with — `scripts/test.mjs` represented
      // by the set of paths its registry actually reaches (119/03; see reachedByTheRegistry).
      // Reading its source here and the surface there would be two answers to one question.
      const runners = [];
      for (const runner of RUNNERS) {
        runners.push(runner === "scripts/test.mjs" ? await reachedByTheRegistry() : await readFile(path.join(repoRoot, runner), "utf8"));
      }
      for (const control of OWN) {
        assert.equal(await exists(control), true, `leg A: ${control} is a file on disk`);
        assert.ok(runners.some((text) => text.includes(path.posix.basename(control))), `leg B: a configured runner names ${path.posix.basename(control)}`);
      }
      // …and the register really cites all four of them, so this list cannot drift away
      // from the declarations it claims to discharge.
      // 119/03 — the register is a DELIVERED record of an accepted milestone and cites these four
      // at the paths they had when it was written; 119/03 moved them into subject directories and
      // the record may not be edited to follow. So the comparison is made where the citation
      // RESOLVES (119/ADR-004), not on its literal text — the same medicine, and the same refusal
      // to rewrite a record, that `exists` above applies one leg over.
      const { declarations } = await register();
      const cited = new Set();
      for (const control of declarations.flatMap((declaration) => declaration.controls)) {
        const answer = await resolveCitedSuite(control, repoRoot);
        cited.add(answer.resolved ? answer.at : control);
      }
      for (const control of OWN) assert.ok(cited.has(control), `${control} is cited by this milestone's register (at that path, or at the one it was renamed from)`);
    },
  },
];
