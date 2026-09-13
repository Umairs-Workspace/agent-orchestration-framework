// Traceability wiring for milestone 41 / story 02 (insert-top-level), task
//   wiki/work/41_milestone_work-item-insertion/stories/02_story_insert-top-level/
//     tasks/00_insert-top-level-places-and-scaffolds.feature
// Every @executable scenario (and each Scenario Outline row) below is wired
// against the REAL registered commands `work:insert-milestone` / `work:insert-uat`
// (src/commands/insert-milestone.mjs, insert-uat.mjs — thin wrappers over story
// 01's engine via src/commands/insert-shared.mjs), invoked in-process through the
// command core (src/command-core.mjs), and read back black-box via
// findWork/listItems/validateWork (src/work.mjs) — mirroring the feature's own
// LITMUS note: every Then is confirmable from the command's result envelope plus a
// FRESH find/validate read, no source read.
//
// SECOND BINDING — traceability wiring for milestone 127 / story 02 (promote-mints-the-number), task
//   wiki/work/127_milestone_backlog-and-archive/stories/02_story_promote-mints-the-number/
//     tasks/03_insert-verbs-are-aliases-of-promote.feature
// `workInsertAliasTests` (below the delivered array) wires EVERY @executable scenario and EVERY
// Scenario Outline row of task 03: `insert-milestone|chore|uat --at P` are now a COMPOSITION of
// `scaffoldBacklogDriver` (src/commands/insert-shared.mjs — the un-numbered write side) and
// `promote --at P` (src/commands/promote.mjs — the one mint, ADR-003 §4), `insert-story` keeps the
// nested engine, and the slot-open's callers under src/commands are promote and nothing else. The
// alias cases sit HERE, beside the delivered insert assertions they must keep green, because the
// budget row for test/work/stream/ asks that new cases land on the insert/reindex/promote suites.
// Driven through the REAL registered commands via the command core and read back black-box —
// findWork / listItems / validateWork, a whole-tree byte snapshot for every "identical" claim, and
// the effects journal for the one event claim; the source scan (the last scenario) reads
// src/commands/** comment-stripped through the ONE strip home (test/support/source-slice.mjs).
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, readFile, readdir, rm, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { invoke } from "../../../src/command-core.mjs";
import { findWork, listItems, validateWork, loadWorkspace } from "../../../src/work.mjs";
import { scaffoldBacklogDriver } from "../../../src/commands/insert-shared.mjs";
import { packageVersionString } from "../../../src/asset-base.mjs";
import { openEffectsJournal, readEvents } from "../../../src/effects/journal.mjs";
import { withInsertFixture, buildTopLevelMilestones, writeStoryItem, setMilestoneDepends, frontmatter } from "../../support/work-insert-fixture.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { matchedParenSpan, stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import { buildThreeRootFixture } from "./work-backlog-archive-enumerate.test.mjs";

export const workInsertTopLevelPlacesTests = [
  // Headline: insert-milestone places the new milestone at P and every
  // pre-existing item >= P shifts up by exactly one.
  {
    name: "work-insert/places: insert-milestone places the new milestone at P and every pre-existing item >= P shifts up by exactly one",
    run: () =>
      withInsertFixture(async ({ workDir, workspace }) => {
        await buildTopLevelMilestones(workDir, 5); // 00-04 (alpha..echo)

        const result = await invoke("work:insert-milestone", { slug: "widget-support", at: 2 }, { workspace });

        assert.equal(Number(result.created.ref), 2, `reports the new item's ref as 2 (got ${result.created.ref})`);

        const found = await findWork(workDir, "2");
        const widget = found.find((row) => row.slug === "widget-support");
        assert.ok(widget, "a fresh find 2 resolves a milestone with slug widget-support");
        assert.equal(widget.type, "milestone");

        // The item that was previously "02" (slug charlie) now resolves at ref 3.
        const charlie = (await findWork(workDir, "charlie"))[0];
        assert.equal(Number(charlie.ref), 3, `previously-02 item now resolves at ref 3 (got ${charlie.ref})`);

        // The item that was previously "04" (slug echo) now resolves at ref 5.
        const echo = (await findWork(workDir, "echo"))[0];
        assert.equal(Number(echo.ref), 5, `previously-04 item now resolves at ref 5 (got ${echo.ref})`);
      }),
  },

  // Headline: insert-uat places a new uat session at P the same way.
  {
    name: "work-insert/places: insert-uat places the new uat session at P and every pre-existing item >= P shifts up by exactly one",
    run: () =>
      withInsertFixture(async ({ workDir, workspace }) => {
        await buildTopLevelMilestones(workDir, 5); // 00-04 (alpha..echo)

        const result = await invoke("work:insert-uat", { slug: "release-gate", at: 1 }, { workspace });

        assert.equal(Number(result.created.ref), 1, `reports the new item's ref as 1 (got ${result.created.ref})`);

        const found = await findWork(workDir, "1");
        const gate = found.find((row) => row.slug === "release-gate");
        assert.ok(gate, "a fresh find 1 resolves a uat session with slug release-gate");
        assert.equal(gate.type, "uat");

        // The item that was previously "01" (slug bravo) now resolves at ref 2.
        const bravo = (await findWork(workDir, "bravo"))[0];
        assert.equal(Number(bravo.ref), 2, `previously-01 item now resolves at ref 2 (got ${bravo.ref})`);
      }),
  },

  // Scenario Outline: the new item is scaffolded from the SAME template
  // add-<type> uses, with correct identity frontmatter — validate-green.
  ...[
    { type: "milestone", slug: "widget-support" },
    { type: "uat", slug: "release-gate" },
  ].map(({ type, slug }) => ({
    name: `work-insert/places: the new ${type} is scaffolded from the same template add-${type} uses, with correct identity frontmatter (validate-green)`,
    run: () =>
      withInsertFixture(async ({ workDir, workspace }) => {
        await buildTopLevelMilestones(workDir, 5); // 00-04

        const commandId = type === "milestone" ? "work:insert-milestone" : "work:insert-uat";
        const result = await invoke(commandId, { slug, at: 2 }, { workspace });
        assert.equal(Number(result.created.ref), 2);

        const found = await findWork(workDir, "2");
        const row = found.find((r) => r.slug === slug);
        assert.ok(row, `a fresh find 2 resolves a ${type} with slug ${slug}`);
        assert.equal(row.type, type);

        const findings = await validateWork(workDir, workspace.config);
        const own = findings.filter((f) => f.path.startsWith(row.dir));
        assert.deepEqual(own, [], `zero findings for the new item's record doc: ${JSON.stringify(own)}`);
      }),
  })),

  // The re-order is correct end-to-end and validate-green (ADR-003 Tier 1): after
  // the insert, the whole stream — including a depends edge and a nested-story
  // parent that pointed at a shifted item — resolves clean.
  {
    name: "work-insert/places: after an insert-milestone, the whole stream is validate-green with no manual repair (nested parent + depends rewritten)",
    run: () =>
      withInsertFixture(async ({ workDir, workspace }) => {
        const dirs = await buildTopLevelMilestones(workDir, 5); // 00-04 (alpha..echo)
        // The milestone at "03" (slug delta) has a nested story "beta-flow".
        await writeStoryItem(dirs.delta, "00", "03", { slug: "beta-flow" });
        // Item "04" (slug echo) declares depends: [3] (targeting delta/03).
        await setMilestoneDepends(workDir, "04", "echo", [3]);

        const result = await invoke("work:insert-milestone", { slug: "widget-support", at: 2 }, { workspace });
        assert.equal(Number(result.created.ref), 2);

        const findings = await validateWork(workDir, workspace.config);
        assert.deepEqual(findings, [], `a fresh validate over the whole stream reports zero findings: ${JSON.stringify(findings)}`);

        const betaFlow = (await findWork(workDir, "beta-flow"))[0];
        assert.ok(betaFlow, "beta-flow still resolves");
        assert.equal(Number(betaFlow.parent), 4, `beta-flow resolves under its milestone's new ref 4 (got ${betaFlow.parent})`);
      }),
  },
];

// ============================================================================
// milestone 127 / story 02, task 03 — insert-milestone, insert-chore and insert-uat are
// scaffold-into-backlog plus promote --at P (ADR-003 §4).
// ============================================================================

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const slash = (value) => String(value).replaceAll("\\", "/");
const rel = (base, target) => slash(path.relative(base, target));
const splitLines = (text) => text.split(/\r?\n/);

// One `today` for both halves of a byte-identity claim, and for every dated frontmatter line.
const TODAY = "2026-09-13";
const THRESHOLD_CONFIG = { work: { insert: { confirmThreshold: 5 } } };
const RECORD_DOC = { milestone: "SPEC.md", uat: "SESSION.md", chore: "CHORE.md", story: "STORY.md" };
const ALIAS_COMMAND = { milestone: "work:insert-milestone", chore: "work:insert-chore", uat: "work:insert-uat" };

// Every file in a tree as `relative path -> bytes` — the byte-identity channel every "identical" /
// "leaves the tree as it was" claim reads. The same shape the promote suite's `snapshot` has; an
// absent dir is an empty map, so "nothing exists that did not before" is one deepEqual.
async function snapshot(dir) {
  const out = new Map();
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.set(rel(dir, full), await readFile(full, "utf8"));
    }
  };
  if (existsSync(dir)) await walk(dir);
  return out;
}
const sorted = (map) => [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));

// A refusal as `{ code, message, detail, shifted }` — never a thrown assertion, so a case can say
// which code it got when it got the wrong one.
async function refusal(run) {
  try {
    const result = await run();
    return { code: null, result };
  } catch (error) {
    return { code: error.code ?? null, message: String(error.message ?? ""), detail: error.detail ?? null, shifted: error.shifted };
  }
}

const templateText = (type, doc) => readFile(path.join(repoRoot, ".aof", "templates", "work", type, doc), "utf8");
const frontmatterLine = (text, key) => splitLines(text).find((line) => line === `${key}:` || line.startsWith(`${key}: `)) ?? null;

// The three-root fixture (127/01, exported by work-backlog-archive-enumerate.test.mjs) carries no
// templates; the two scenarios that name it say "with the <type> template present", so the REAL
// committed template for each named type is copied in — the same copy `withInsertFixture` makes.
async function withThreeRootsAndTemplates(types, body) {
  const { root, work } = await buildThreeRootFixture();
  try {
    for (const type of types) {
      await cp(path.join(repoRoot, ".aof", "templates", "work", type), path.join(root, ".aof", "templates", "work", type), { recursive: true });
    }
    return await body({ root, work, workspace: await loadWorkspace(root) });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// An archived chore folder — `archive/<NN>_chore_<slug>/CHORE.md` carrying `number: NN` — for the
// refusal row whose shift would land on an archived number.
async function writeArchivedChore(workDir, number, slug) {
  const dir = path.join(workDir, "archive", `${number}_chore_${slug}`);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "CHORE.md"),
    frontmatter({ type: "chore", number, slug, status: "done", created: "2026-07-16", updated: "2026-07-16", schema: 1 }),
    "utf8",
  );
  return dir;
}

// The composition outline's rows, verbatim from the feature table. `at: undefined` is the
// `(no --at)` row; a row's `expect` is asserted against the envelope AND a fresh read.
const COMPOSITION_ROWS = [
  { verb: "milestone", slug: "widget-support", at: 0, folder: "00_milestone_widget-support", shifted: 3, why: "zero shifts everything", after: ["01_milestone_alpha", "02_milestone_bravo", "03_milestone_charlie"] },
  { verb: "milestone", slug: "widget-support", at: 3, folder: "03_milestone_widget-support", shifted: 0, why: "at the tail, nothing moves" },
  { verb: "milestone", slug: "widget-support", at: 9, folder: "09_milestone_widget-support", shifted: 0, why: "beyond the tail leaves a gap, as insert always has", gap: [3, 4, 5, 6, 7, 8] },
  { verb: "chore", slug: "Tidy-Config", at: 1, folder: "01_chore_tidy-config", createdSlug: "tidy-config", why: "the alias lowercases, as normalizeSlug always has" },
  { verb: "chore", slug: " tidy ", at: 1, folder: "01_chore_tidy", createdSlug: "tidy", why: "and trims" },
  { verb: "uat", slug: "gate", at: 1, depends: "2,0", folder: "01_uat_gate", dependsOut: [3, 0], why: "order as given; only the entry at or above P moves" },
  { verb: "uat", slug: "gate", at: 1, depends: "1", folder: "01_uat_gate", dependsOut: [2], why: "the named target itself shifts" },
  { verb: "uat", slug: "gate", at: 1, depends: "0", folder: "01_uat_gate", dependsOut: [0], why: "below P — unchanged" },
  { verb: "uat", slug: "gate", at: 1, folder: "01_uat_gate", dependsOut: [], why: "no --depends is an empty list on a uat, present in the envelope" },
  { verb: "uat", slug: "gate", at: 1, depends: "7", code: "promote-depends-unresolved", names: "7", why: "promote's check reaches the alias — a target must exist NOW" },
  { verb: "milestone", slug: "Widget_Support", at: 1, code: "insert-invalid-slug", why: "_ is outside the slug grammar" },
  { verb: "milestone", slug: "-widget", at: 1, code: "insert-invalid-slug", why: "a slug starts with a letter or digit" },
  { verb: "milestone", slug: "widget-support", at: undefined, code: "insert-invalid-at", why: "the alias keeps --at required — only bare promote appends" },
  { verb: "milestone", slug: "widget-support", at: -1, code: "insert-invalid-at", why: "the alias's own code, not promote-invalid-at" },
];

// The refusal outline's rows, verbatim. `setup` plants what the row names and returns the
// `backlog/` snapshot the alias must leave exactly as it found it.
const REFUSAL_ROWS = [
  { setup: "nothing", verb: "milestone", slug: "Widget_Support", at: 2, yes: true, code: "insert-invalid-slug", why: "refused before any scaffold" },
  { setup: "nothing", verb: "milestone", slug: "widget-support", at: "ten", yes: true, code: "insert-invalid-at", why: "refused before any scaffold" },
  { setup: "nothing", verb: "milestone", slug: "widget-support", at: 5, yes: false, code: "insert-confirm-required", why: "five shifted meets the threshold of five" },
  { setup: "the chore template deleted", verb: "chore", slug: "tidy", at: 2, yes: true, code: "insert-template-missing", why: "pre-flight: every template is read before any write" },
  { setup: "backlog/uat_gate/SESSION.md already present", verb: "uat", slug: "gate", at: 2, yes: true, code: "insert-backlog-exists", why: "the pre-existing leaf is untouched — the alias never promotes it" },
  { setup: "nothing", verb: "uat", slug: "gate", at: 2, depends: "42", yes: true, code: "promote-depends-unresolved", why: "promote's refusal after the scaffold — the transient leaf is gone" },
  { setup: "a stray 02_milestone_widget-support/ (no SPEC.md)", verb: "milestone", slug: "widget-support", at: 2, yes: true, code: "promote-destination-exists", why: "the destination check precedes the shift" },
  { setup: "archive/10_chore_old", verb: "milestone", slug: "widget-support", at: 2, yes: true, code: "promote-number-archived", why: "09's +1 would land on the archived 10" },
];

async function plantRefusalSetup(setup, { repo, workDir }) {
  switch (setup) {
    case "nothing":
      return;
    case "the chore template deleted":
      await rm(path.join(repo, ".aof", "templates", "work", "chore", "CHORE.md"), { force: true });
      return;
    case "backlog/uat_gate/SESSION.md already present": {
      const dir = path.join(workDir, "backlog", "uat_gate");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "SESSION.md"), frontmatter({ type: "uat", slug: "gate", status: "not-started", created: "2026-07-16", updated: "2026-07-16", schema: 1 }), "utf8");
      return;
    }
    case "a stray 02_milestone_widget-support/ (no SPEC.md)":
      await mkdir(path.join(workDir, "02_milestone_widget-support"), { recursive: true });
      return;
    case "archive/10_chore_old":
      await writeArchivedChore(workDir, "10", "old");
      return;
    default:
      throw new Error(`unknown setup "${setup}"`);
  }
}

// The blank-render outline's rows, verbatim. A `literal` row names a template line (or lines) that
// must survive BOTH renders unchanged; a `backlog` / `promoted` row names the exact line each side.
const BLANK_RENDER_ROWS = [
  { type: "milestone", doc: "SPEC.md", line: "`number: NN`", backlog: "number:", promoted: "number: 00", why: "the one identity line" },
  { type: "milestone", doc: "SPEC.md", line: "`# NN · <Milestone Title>`", backlog: "# Alpha Idea", promoted: "# 00 · Alpha Idea", why: "the prefix goes with the number and returns with it" },
  { type: "milestone", doc: "SPEC.md", line: "the `NN_story_<slug>` bullets under `## Stories`", literal: /^- \[ \] `NN_story_<slug>` — <one-line outcome>$/, count: 2, why: "a story's placeholder is never the milestone's number" },
  { type: "milestone", doc: "SPEC.md", line: "the comment `… NN_story_<slug> item with parent: NN.`", literal: /NN_story_<slug> item with parent: NN\.$/, count: 1, why: "prose NN is a placeholder, not an identity" },
  { type: "milestone", doc: "STATE.md", line: "`# NN · <Milestone Title> — State`", backlog: "# Alpha Idea — State", promoted: "# 00 · Alpha Idea — State", why: "the companion's heading follows" },
  { type: "milestone", doc: "STATE.md", line: "the `NN_story_<slug>` bullet", literal: /^- \[ \] `NN_story_<slug>` — <status \/ current task>$/, count: 1, why: "the same rule in the companion" },
  { type: "uat", doc: "SESSION.md", line: "`# NN · <Session Title> — UAT Session`", backlog: "# Alpha Idea — UAT Session", promoted: "# 00 · Alpha Idea — UAT Session", why: "the uat heading" },
  { type: "uat", doc: "SESSION.md", line: "`depends: [<milestone numbers this session accepts>]`", backlog: "depends: []", promoted: "depends: []", why: "the operator's list replaces the placeholder, empty or not" },
  { type: "uat", doc: "STATE.md", line: "`# NN · <Session Title> — State`", backlog: "# Alpha Idea — State", promoted: "# 00 · Alpha Idea — State", why: "the uat companion" },
  { type: "chore", doc: "CHORE.md", line: "`# NN · <Chore Title>`", backlog: "# Alpha Idea", promoted: "# 00 · Alpha Idea", why: "the chore heading" },
  { type: "chore", doc: "CHORE.md", line: "`depends: []`", backlog: "depends: []", promoted: "depends: []", why: "the chore template's own literal, kept" },
];

// A finding the finding face can promote on the 00–02 fixture: `ref` names the live milestone `01`.
const FINDING = Object.freeze({
  ref: "01",
  title: "F-a the resolver is called twice per row",
  remedy: "hoist the resolver call out of the row loop",
  location: "src/work/loop.mjs:143",
  round: 1,
});

function sectionBody(text, heading) {
  const lines = splitLines(text);
  const at = lines.findIndex((line) => line.trim() === heading);
  if (at === -1) return null;
  const body = [];
  for (let i = at + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join("\n");
}

export const workInsertAliasTests = [
  // Scenario: insert-milestone --at P produces the same tree as scaffold-into-backlog plus
  // promote --at P
  {
    name: "work-insert/alias: 03 insert-milestone --at P produces the same tree as scaffold-into-backlog plus promote --at P",
    run: () =>
      withInsertFixture((alias) =>
        withInsertFixture(async (manual) => {
          await buildTopLevelMilestones(alias.workDir, 5); // 00-04
          await buildTopLevelMilestones(manual.workDir, 5); // 00-04
          assert.deepEqual(sorted(await snapshot(alias.workDir)), sorted(await snapshot(manual.workDir)), "guard: the two copies start byte-identical");

          // One copy: the alias.
          const envelope = await invoke("work:insert-milestone", { slug: "widget-support", at: 2, today: TODAY }, { workspace: alias.workspace });

          // The other: the composition by hand, with the SAME `today`.
          const leaf = await scaffoldBacklogDriver(manual.workspace, { type: "milestone", slug: "widget-support", today: TODAY });
          assert.equal(rel(manual.workDir, leaf.dir), "backlog/milestone_widget-support", "scaffoldBacklogDriver wrote backlog/milestone_widget-support");
          const promoted = await invoke("work:promote", { slug: "widget-support", at: 2, yes: true }, { workspace: manual.workspace });
          assert.equal(promoted.created.ref, "02", "promote --at 2 minted 02");

          const left = await snapshot(alias.workDir);
          const right = await snapshot(manual.workDir);
          for (const named of ["02_milestone_widget-support/SPEC.md", "02_milestone_widget-support/STATE.md", "03_milestone_charlie/SPEC.md", "04_milestone_delta/SPEC.md", "05_milestone_echo/SPEC.md"]) {
            assert.ok(left.has(named), `non-vacuity: the alias tree holds ${named}`);
          }
          assert.equal(left.size, 7, `non-vacuity: five fixture SPECs plus the new SPEC + STATE — ${left.size} files compared`);
          assert.deepEqual(sorted(left), sorted(right), "the two work directories are byte-identical file for file");
          const spec = left.get("02_milestone_widget-support/SPEC.md");
          assert.equal(frontmatterLine(spec, "created"), `created: ${TODAY}`, "created: held equal by today");
          assert.equal(frontmatterLine(spec, "updated"), `updated: ${TODAY}`, "updated: held equal by today");

          assert.deepEqual(
            envelope,
            { shifted: 3, at: 2, space: "top-level", created: { ref: "02", type: "milestone", slug: "widget-support", parent: null, dir: path.join(alias.workDir, "02_milestone_widget-support") } },
            `the delivered envelope shape, exactly: ${JSON.stringify(envelope)}`,
          );
          assert.ok(!("depends" in envelope.created), "created carries no depends key");

          assert.ok(!existsSync(path.join(alias.workDir, "backlog")), "the alias tree holds no backlog/ folder — the transient leaf and the root the alias created are gone");
          // The by-hand half wrote the root itself and `promote` never removes a root it did not
          // create (a group is the operator's path), so what remains there is the EMPTY root: no
          // leaf, no file — which is why the file-for-file comparison above is exact.
          assert.ok(!existsSync(leaf.dir), "the by-hand tree's leaf moved out of backlog/");
          assert.deepEqual(await readdir(path.join(manual.workDir, "backlog")), [], "…and its backlog/ holds nothing");
        })),
  },

  // Scenario: insert-chore and insert-uat alias the same way
  {
    name: "work-insert/alias: 03 insert-chore and insert-uat alias the same way",
    run: async () => {
      await withInsertFixture(async ({ workDir, workspace }) => {
        await buildTopLevelMilestones(workDir, 3); // 00-02
        const result = await invoke("work:insert-chore", { slug: "tidy-config", at: 1, today: TODAY }, { workspace });
        const docPath = path.join(workDir, "01_chore_tidy-config", "CHORE.md");
        assert.ok(existsSync(docPath), "01_chore_tidy-config/CHORE.md exists");
        const text = await readFile(docPath, "utf8");
        assert.equal(frontmatterLine(text, "number"), "number: 01", "number: 01");
        assert.ok(splitLines(text).includes("# 01 · Tidy Config"), `the heading reads # 01 · Tidy Config:\n${text}`);
        assert.equal(result.created.ref, "01", "created.ref is 01");
        assert.equal(result.created.type, "chore", "created.type is chore");
        assert.ok(!existsSync(path.join(workDir, "backlog")), "no backlog/ remains");
      });
      await withInsertFixture(async ({ workDir, workspace }) => {
        await buildTopLevelMilestones(workDir, 3); // 00-02, fresh
        const result = await invoke("work:insert-uat", { slug: "release-gate", at: 1, depends: "0,2", today: TODAY }, { workspace });
        const text = await readFile(path.join(workDir, "01_uat_release-gate", "SESSION.md"), "utf8");
        assert.equal(frontmatterLine(text, "depends"), "depends: [0, 3]", "SESSION.md carries depends: [0, 3] — 2 framed post-shift by the engine's rewrite");
        assert.deepEqual(result.created.depends, [0, 3], "created.depends is [0, 3]");
        assert.equal(result.created.ref, "01");
        assert.equal(result.created.type, "uat");
        assert.equal(result.shifted, 2, "01 and 02 shifted");
      });
    },
  },

  // Scenario Outline: each alias is the same composition — the slug normalised, the position
  // required, the depends framed by the engine (one case per row)
  ...COMPOSITION_ROWS.map((row) => ({
    name: `work-insert/alias: 03 composition row — insert-${row.verb} "${row.slug}" ${row.at === undefined ? "(no --at)" : `--at ${row.at}`}${row.depends ? ` --depends ${row.depends}` : ""} → ${row.code ?? row.folder} (${row.why})`,
    run: () =>
      withInsertFixture(async ({ workDir, workspace }) => {
        await buildTopLevelMilestones(workDir, 3); // 00-02
        const before = await listItems(workDir);
        const input = { slug: row.slug, today: TODAY };
        if (row.at !== undefined) input.at = row.at;
        if (row.depends !== undefined) input.depends = row.depends;

        if (row.code) {
          const got = await refusal(() => invoke(ALIAS_COMMAND[row.verb], input, { workspace }));
          assert.equal(got.code, row.code, `refused with ${row.code} (got ${got.code ?? `a result: ${JSON.stringify(got.result)}`})`);
          if (row.names) assert.ok(got.message.includes(row.names), `the refusal names ${row.names}: "${got.message}"`);
          assert.deepEqual(await listItems(workDir), before, "listItems over the fixture is identical to before");
          assert.ok(!existsSync(path.join(workDir, "backlog")), "no leaf remains — no backlog/ at all");
          return;
        }

        const result = await invoke(ALIAS_COMMAND[row.verb], input, { workspace });
        const dir = path.join(workDir, row.folder);
        assert.ok(existsSync(path.join(dir, RECORD_DOC[row.verb])), `${row.folder} exists with its record doc`);
        assert.equal(result.created.dir, dir, "created.dir names the folder");
        assert.equal(result.created.type, row.verb);
        assert.equal(result.space, "top-level");
        assert.equal(result.at, row.at);
        if (row.shifted !== undefined) assert.equal(result.shifted, row.shifted, `shifted: ${row.shifted}`);
        if (row.createdSlug) assert.equal(result.created.slug, row.createdSlug, `created.slug: "${row.createdSlug}"`);
        if (row.after) {
          const names = (await listItems(workDir)).filter((item) => item.parent == null).map((item) => item.name).sort();
          assert.deepEqual(names, [row.folder, ...row.after].sort(), "the three are now 01–03");
        }
        if (row.gap) {
          const numbers = new Set((await listItems(workDir)).filter((item) => item.parent == null).map((item) => Number.parseInt(item.number, 10)));
          for (const n of row.gap) assert.ok(!numbers.has(n), `${String(n).padStart(2, "0")} is empty`);
        }
        if (row.dependsOut) {
          const text = await readFile(path.join(dir, "SESSION.md"), "utf8");
          assert.equal(frontmatterLine(text, "depends"), `depends: [${row.dependsOut.join(", ")}]`, `SESSION.md carries depends: [${row.dependsOut.join(", ")}]`);
          assert.deepEqual(result.created.depends, row.dependsOut, `created.depends: [${row.dependsOut.join(", ")}]`);
        }
        assert.ok(!existsSync(path.join(workDir, "backlog")), "the transient leaf and root are gone");
      }),
  })),

  // Scenario: a refused alias leaves nothing behind
  {
    name: "work-insert/alias: 03 a refused alias leaves nothing behind",
    run: () =>
      withInsertFixture(async ({ repo, workDir, workspace }) => {
        await buildTopLevelMilestones(workDir, 10); // 00-09
        const itemsBefore = await listItems(workDir);
        const treeBefore = await snapshot(workDir);
        assert.equal(itemsBefore.length, 10, "non-vacuity: ten rows");

        const gated = await refusal(() => invoke("work:insert-milestone", { slug: "widget-support", at: 2, today: TODAY }, { workspace }));
        assert.equal(gated.code, "insert-confirm-required", `refused with insert-confirm-required (got ${gated.code})`);
        assert.equal(gated.shifted, 8, "error.shifted names 8");
        assert.deepEqual(gated.detail, { shifted: 8 }, "error.detail.shifted names 8");
        assert.match(gated.message, /\b8\b/, `the message names 8: "${gated.message}"`);
        assert.deepEqual(await listItems(workDir), itemsBefore, "listItems is identical to before — no shift, no backlog/ row");
        assert.ok(!existsSync(path.join(workDir, "backlog")), "no backlog/ directory");
        assert.deepEqual(sorted(await snapshot(workDir)), sorted(treeBefore), "nothing on disk changed");

        await rm(path.join(repo, ".aof", "templates", "work", "milestone", "SPEC.md"));
        const missing = await refusal(() => invoke("work:insert-milestone", { slug: "widget-support", at: 2, yes: true, today: TODAY }, { workspace }));
        assert.equal(missing.code, "insert-template-missing", `refused with insert-template-missing (got ${missing.code})`);
        assert.deepEqual(await listItems(workDir), itemsBefore, "listItems is identical to before");
        assert.ok(!existsSync(path.join(workDir, "backlog")), "no backlog/ directory");
        assert.deepEqual(sorted(await snapshot(workDir)), sorted(treeBefore), "again nothing exists that did not before");
      }, THRESHOLD_CONFIG),
  },

  // Scenario Outline: a refused alias leaves the tree as it was, whichever check refused it (one
  // case per row)
  ...REFUSAL_ROWS.map((row) => ({
    name: `work-insert/alias: 03 refusal row — ${row.setup}; insert-${row.verb} ${row.slug} --at ${row.at}${row.depends ? ` --depends ${row.depends}` : ""}${row.yes ? " --yes" : ""} → ${row.code} (${row.why})`,
    run: () =>
      withInsertFixture(async ({ repo, workDir, workspace }) => {
        await buildTopLevelMilestones(workDir, 10); // 00-09
        await plantRefusalSetup(row.setup, { repo, workDir });
        const backlogDir = path.join(workDir, "backlog");
        const backlogBefore = await snapshot(backlogDir);
        const backlogExisted = existsSync(backlogDir);
        const itemsBefore = await listItems(workDir);
        const treeBefore = await snapshot(workDir);

        const input = { slug: row.slug, at: row.at, yes: row.yes, today: TODAY };
        if (row.depends !== undefined) input.depends = row.depends;
        const got = await refusal(() => invoke(ALIAS_COMMAND[row.verb], input, { workspace }));
        assert.equal(got.code, row.code, `refused with ${row.code} (got ${got.code ?? `a result: ${JSON.stringify(got.result)}`})`);

        assert.deepEqual(await listItems(workDir), itemsBefore, "listItems over the fixture is identical to before");
        assert.deepEqual(sorted(await snapshot(workDir)), sorted(treeBefore), "the whole tree is byte-identical to before");
        assert.equal(existsSync(backlogDir), backlogExisted, backlogExisted ? "backlog/ still exists" : "no backlog/ was left behind");
        assert.deepEqual(sorted(await snapshot(backlogDir)), sorted(backlogBefore), "backlog/ holds exactly what the setup put there and nothing else");
        if (row.setup.startsWith("backlog/uat_gate")) {
          assert.equal(backlogBefore.size, 1, "non-vacuity: the setup planted one leaf file");
          assert.ok(backlogBefore.has("uat_gate/SESSION.md"), "…backlog/uat_gate/SESSION.md");
        }
      }, THRESHOLD_CONFIG),
  })),

  // The feature's "what would quietly undo this" clause — "an alias that leaves
  // `backlog/<type>_<slug>` behind on a refused gate" — witnessed on the ONE input the outline
  // above cannot reach: a `backlog/` root that already exists. Every refusal row runs on a
  // fixture with no prior `backlog/`, so the alias's `finally` (removing a root it created)
  // sweeps an orphaned leaf and the `catch`-side removal is never the thing under test — a
  // mutation dropping it survived all eight rows (127/02 round-two review, 2026-09-13). Here the
  // root is the operator's, the alias may not remove it, and the transient leaf must go alone.
  {
    name: "work-insert/alias: 03 the transient leaf is removed on a post-scaffold refusal even when backlog/ pre-existed",
    run: () =>
      withInsertFixture(async ({ workDir, workspace }) => {
        await buildTopLevelMilestones(workDir, 10); // 00-09
        const otherDir = path.join(workDir, "backlog", "chore_other");
        await mkdir(otherDir, { recursive: true });
        await writeFile(path.join(otherDir, "CHORE.md"), frontmatter({ type: "chore", slug: "other", status: "not-started", created: "2026-07-16", updated: "2026-07-16", schema: 1 }), "utf8");
        const backlogDir = path.join(workDir, "backlog");
        const backlogBefore = await snapshot(backlogDir);
        assert.equal(backlogBefore.size, 1, "non-vacuity: the operator's own leaf is the one file under backlog/");
        const itemsBefore = await listItems(workDir);

        const got = await refusal(() => invoke("work:insert-uat", { slug: "gate", at: 2, depends: "42", yes: true, today: TODAY }, { workspace }));
        assert.equal(got.code, "promote-depends-unresolved", `refused after the scaffold with promote-depends-unresolved (got ${got.code ?? `a result: ${JSON.stringify(got.result)}`})`);

        assert.ok(existsSync(backlogDir), "the operator's backlog/ root is kept — the alias did not create it");
        assert.ok(!existsSync(path.join(backlogDir, "uat_gate")), "…and the transient uat_gate leaf is gone");
        assert.deepEqual(sorted(await snapshot(backlogDir)), sorted(backlogBefore), "backlog/ holds exactly the operator's leaf and nothing else");
        assert.deepEqual(await listItems(workDir), itemsBefore, "listItems over the fixture is identical to before");
      }, THRESHOLD_CONFIG),
  },

  // Scenario: an alias into a stream whose backlog already holds the slug is refused
  {
    name: "work-insert/alias: 03 an alias into a stream whose backlog already holds the slug is refused",
    run: () =>
      withThreeRootsAndTemplates(["chore"], async ({ work, workspace }) => {
        const leafDir = path.join(work, "backlog", "chore_gamma");
        const leafBefore = await snapshot(leafDir);
        assert.equal(leafBefore.size, 1, "non-vacuity: the fixture's backlog/chore_gamma holds its CHORE.md");
        const itemsBefore = await listItems(work);

        const got = await refusal(() => invoke("work:insert-chore", { slug: "gamma", at: 12, yes: true, today: TODAY }, { workspace }));
        assert.equal(got.code, "insert-backlog-exists", `refused with insert-backlog-exists (got ${got.code ?? `a result: ${JSON.stringify(got.result)}`})`);
        assert.ok(got.message.includes("backlog/chore_gamma"), `the refusal names backlog/chore_gamma: "${got.message}"`);
        assert.deepEqual(sorted(await snapshot(leafDir)), sorted(leafBefore), "the leaf is untouched — the alias never promotes a leaf it did not scaffold");
        assert.ok(!existsSync(path.join(work, "12_chore_gamma")), "nothing was promoted");
        assert.deepEqual(await listItems(work), itemsBefore, "listItems is identical to before");
      }),
  },

  // Scenario: the backlog scaffold writes an un-numbered record doc that validate accepts
  {
    name: "work-insert/alias: 03 the backlog scaffold writes an un-numbered record doc that validate accepts",
    run: () =>
      withInsertFixture(async ({ workDir, workspace }) => {
        const leaf = await scaffoldBacklogDriver(workspace, { type: "milestone", slug: "alpha-idea", today: TODAY });
        assert.deepEqual(leaf, { ref: "alpha-idea", type: "milestone", slug: "alpha-idea", parent: null, dir: path.join(workDir, "backlog", "milestone_alpha-idea") }, "the scaffold's own echo");
        const specPath = path.join(leaf.dir, "SPEC.md");
        assert.ok(existsSync(specPath), "backlog/milestone_alpha-idea/SPEC.md exists at the backlog root");
        assert.ok(existsSync(path.join(leaf.dir, "STATE.md")), "…and STATE.md beside it");

        const spec = await readFile(specPath, "utf8");
        const lines = splitLines(spec);
        assert.equal(lines[0], "---", "the leading marker is stripped — the first line is the fence");
        assert.ok(!spec.startsWith("<!-- aof-generated"), "no `<!-- aof-generated` at byte 0");
        for (const expected of ["type: milestone", "number:", "slug: alpha-idea", 'title: "Alpha Idea"', "status: not-started", `created: ${TODAY}`, `updated: ${TODAY}`, "schema: 1", `aofVersion: ${packageVersionString()}`]) {
          assert.ok(lines.includes(expected), `the frontmatter carries the exact line \`${expected}\`:\n${spec}`);
        }
        assert.ok(lines.includes("# Alpha Idea"), "the heading reads # Alpha Idea — no number, no ·");
        assert.ok(!lines.some((line) => /^# .*·/.test(line)), "no H1 carries a ` · ` separator");

        const findings = await validateWork(workDir, workspace.config);
        const own = findings.filter((finding) => String(finding.path ?? "").startsWith(leaf.dir));
        assert.deepEqual(own, [], `validate reports zero findings on the leaf: ${JSON.stringify(own)}`);

        const row = (await listItems(workDir)).find((item) => item.slug === "alpha-idea");
        assert.ok(row, "listItems answers the leaf");
        assert.deepEqual({ number: row.number, ref: row.ref, backlog: row.backlog }, { number: null, ref: "alpha-idea", backlog: "" }, "…as { number: null, ref: \"alpha-idea\", backlog: \"\" }");
      }),
  },

  // Scenario Outline: the blank render empties the number line and the numbered headings, and
  // promotion fills exactly those (one case per row)
  ...BLANK_RENDER_ROWS.map((row) => ({
    name: `work-insert/alias: 03 blank-render row — ${row.type} ${row.doc} ${row.line} → ${row.literal ? "unchanged, literal" : `${JSON.stringify(row.backlog)} then ${JSON.stringify(row.promoted)}`} (${row.why})`,
    run: () =>
      withInsertFixture(async ({ workDir, workspace }) => {
        const template = await templateText(row.type, row.doc);
        const leaf = await scaffoldBacklogDriver(workspace, { type: row.type, slug: "alpha-idea", today: TODAY, depends: row.type === "uat" ? [] : undefined });
        const inBacklog = await readFile(path.join(leaf.dir, row.doc), "utf8");
        const promoted = await invoke("work:promote", { slug: "alpha-idea" }, { workspace });
        assert.equal(promoted.created.ref, "00", "promotion appends at 00 on the empty fixture");
        const afterPromote = await readFile(path.join(promoted.created.dir, row.doc), "utf8");

        if (row.literal) {
          const inTemplate = splitLines(template).filter((line) => row.literal.test(line));
          assert.equal(inTemplate.length, row.count, `non-vacuity: the template carries ${row.count} such line(s) — ${JSON.stringify(inTemplate)}`);
          for (const literal of inTemplate) {
            assert.ok(splitLines(inBacklog).includes(literal), `the backlog leaf keeps the literal line verbatim: ${literal}`);
            assert.ok(splitLines(afterPromote).includes(literal), `…and so does the promoted doc: ${literal}`);
          }
          return;
        }

        const backlogLines = splitLines(inBacklog);
        const promotedLines = splitLines(afterPromote);
        assert.ok(backlogLines.includes(row.backlog), `the backlog leaf reads ${JSON.stringify(row.backlog)}:\n${inBacklog}`);
        assert.ok(promotedLines.includes(row.promoted), `after promotion it reads ${JSON.stringify(row.promoted)}:\n${afterPromote}`);
        if (row.backlog !== row.promoted) {
          assert.ok(!promotedLines.includes(row.backlog), `the blank form ${JSON.stringify(row.backlog)} is gone after promotion`);
          assert.ok(!backlogLines.includes(row.promoted), `the filled form ${JSON.stringify(row.promoted)} is absent in the backlog leaf`);
        }
      }),
  })),

  // Scenario: the two loop faces still append through appendPosition, unchanged in behaviour
  {
    name: "work-insert/alias: 03 the two loop faces still append through appendPosition, unchanged in behaviour",
    run: () =>
      withInsertFixture(async ({ workDir, workspace }) => {
        await buildTopLevelMilestones(workDir, 3); // 00-02

        const first = await invoke("work:promote-finding", { ...FINDING, today: TODAY }, { workspace });
        assert.equal(first.promoted, true, "the finding was promoted");
        assert.equal(first.chore.ref, "03", "the chore lands at 03 — appended");
        assert.equal(first.shifted, 0, "shifted: 0");
        const text = await readFile(path.join(first.chore.dir, "CHORE.md"), "utf8");
        const notes = sectionBody(text, "## Notes");
        assert.ok(notes.includes(FINDING.ref) && notes.includes(FINDING.title) && notes.includes(`review round ${FINDING.round}`), `seeded as before — the promotion key in ## Notes:\n${notes}`);
        assert.ok(sectionBody(text, "## Definition of Done").includes(`- [ ] ${FINDING.remedy}`), "…and the definition of done from the remedy");
        assert.ok(!existsSync(path.join(workDir, "backlog")), "no backlog/ remains");

        const countAfterFirst = (await listItems(workDir)).filter((item) => item.parent == null).length;
        const again = await invoke("work:promote-finding", { ...FINDING, today: TODAY }, { workspace });
        assert.equal(again.promoted, false, "a second run of the same finding is refused as the duplicate it is");
        assert.equal(again.chore.ref, first.chore.ref, "…reporting the chore that already schedules it");
        assert.equal((await listItems(workDir)).filter((item) => item.parent == null).length, countAfterFirst, "…and creating nothing");

        const gap = await invoke("work:promote-gap", { title: "x", discharge: "close it", at: 1, today: TODAY }, { workspace });
        assert.equal(gap.promoted, true);
        assert.equal(gap.chore.ref, "01", "promote-gap \"x\" --at 1 still opens slot 1");
        assert.equal(gap.shifted, 3, "…shifting 01, 02 and the finding's chore (now 04)");
        assert.ok(existsSync(path.join(workDir, "04_chore_f-a-the-resolver-is-called-twice-per-row")), "the finding's chore moved to 04");
      }),
  },

  // Scenario: insert-story keeps the nested engine and refuses an archived owner
  {
    name: "work-insert/alias: 03 insert-story keeps the nested engine and refuses an archived owner",
    run: () =>
      withThreeRootsAndTemplates(["story"], async ({ work, workspace }) => {
        const backlogDir = path.join(work, "backlog");
        const backlogBefore = await snapshot(backlogDir);
        assert.equal(backlogBefore.size, 3, "non-vacuity: the fixture's three backlog leaves");
        const globalHome = await mkdtemp(path.join(os.tmpdir(), "aof-127-alias-gh-"));
        const journalOptions = { env: { ...process.env, AOF_GLOBAL_HOME: globalHome } };
        try {
          const result = await invoke("work:insert-story", { slug: "alpha-two", at: 1, under: 10, today: TODAY }, { workspace, effectsJournalOptions: journalOptions });
          const storyPath = path.join(work, "10_milestone_alpha", "stories", "01_story_alpha-two", "STORY.md");
          assert.ok(existsSync(storyPath), "10_milestone_alpha/stories/01_story_alpha-two/STORY.md exists");
          const story = await readFile(storyPath, "utf8");
          assert.equal(frontmatterLine(story, "parent"), "parent: 10", "with parent: 10");
          assert.equal(frontmatterLine(story, "number"), "number: 01");
          assert.equal(result.space, "nested", "the nested engine placed it");
          assert.deepEqual(sorted(await snapshot(backlogDir)), sorted(backlogBefore), "no backlog leaf was created at any point — backlog/ is byte-identical");

          const journal = await openEffectsJournal(journalOptions);
          try {
            const reindexed = readEvents(journal, { name: "stream.reindexed" });
            for (const event of reindexed) {
              assert.equal(event.payload.space, "nested", "any stream.reindexed raised was the nested space");
              for (const { from, to } of event.payload.remap ?? []) {
                assert.ok(from.includes("/") && to.includes("/"), `no remap names a top-level ref: ${from} → ${to}`);
              }
            }
          } finally {
            journal.close();
          }
        } finally {
          await rm(globalHome, { recursive: true, force: true });
        }

        const itemsBefore = await listItems(work);
        const got = await refusal(() => invoke("work:insert-story", { slug: "zeta-two", at: 1, under: 5, today: TODAY }, { workspace }));
        assert.equal(got.code, "insert-parent-archived", `refused with insert-parent-archived exactly as 127/01 left it (got ${got.code})`);
        assert.deepEqual(await listItems(work), itemsBefore, "…creating nothing");
      }),
  },

  // Scenario: the slot-open's callers in src/commands are promote and nothing else
  {
    name: "work-insert/alias: 03 the slot-open's callers in src/commands are promote and nothing else",
    run: async () => {
      const files = (await readSrcFiles(repoRoot)).filter((file) => file.rel.startsWith("commands/"));
      assert.ok(files.length > 20, `non-vacuity: ${files.length} modules under src/commands`);
      const sources = new Map();
      for (const file of files) sources.set(file.rel, stripComments(await readFile(file.path, "utf8")));
      // `rel` is src/-relative, so a specifier resolved from `commands/x.mjs` lands on `work/reindex.mjs`.
      const resolvesTo = (specifier, fromRel, target) =>
        specifier.startsWith(".") && path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), specifier)) === target;

      // `reindex.mjs` is imported by insert-shared.mjs and by no other module under src/commands/.
      const engineImporters = [...sources].filter(([relPath, code]) => importSpecifiers(code).some(({ specifier }) => resolvesTo(specifier, relPath, "work/reindex.mjs"))).map(([relPath]) => relPath);
      assert.deepEqual(engineImporters, ["commands/insert-shared.mjs"], `reindex.mjs's importers under src/commands: ${engineImporters.join(", ") || "none"}`);

      // `transitionStreamReindexed` with the top-level space: promote.mjs and nowhere else; the
      // nested call sits in insert-shared.mjs's runInsertStory.
      const topLevelCallers = [];
      const nestedCallers = [];
      for (const [relPath, code] of sources) {
        for (const match of code.matchAll(/\btransitionStreamReindexed\s*\(/gu)) {
          const args = matchedParenSpan(code, match.index)?.body ?? "";
          if (/space\s*:\s*"top-level"/u.test(args)) topLevelCallers.push(relPath);
          if (/space\s*:\s*"nested"/u.test(args)) nestedCallers.push(relPath);
        }
      }
      assert.deepEqual(topLevelCallers, ["commands/promote.mjs"], `the ONE top-level slot-open call: ${topLevelCallers.join(", ") || "none"}`);
      assert.deepEqual(nestedCallers, ["commands/insert-shared.mjs"], `the ONE nested call: ${nestedCallers.join(", ") || "none"}`);
      assert.match(sources.get("commands/insert-shared.mjs"), /export\s+async\s+function\s+runInsertStory\b/u, "…inside runInsertStory, which insert-shared.mjs still defines");

      // `runInsertTopLevel` is defined in promote.mjs and imported from there by exactly the five.
      const definers = [...sources].filter(([, code]) => /(?:export\s+)?async\s+function\s+runInsertTopLevel\b/u.test(code)).map(([relPath]) => relPath);
      assert.deepEqual(definers, ["commands/promote.mjs"], `runInsertTopLevel is defined in promote.mjs: ${definers.join(", ") || "none"}`);
      const importers = [...sources]
        .filter(([, code]) => /import\s*\{[^}]*\brunInsertTopLevel\b[^}]*\}\s*from\s*["']\.\/promote\.mjs["']/u.test(code))
        .map(([relPath]) => relPath)
        .sort();
      assert.deepEqual(
        importers,
        ["commands/insert-chore.mjs", "commands/insert-milestone.mjs", "commands/insert-uat.mjs", "commands/promote-finding-to-chore.mjs", "commands/promote-gap-to-chore.mjs"],
        `…and imported from ./promote.mjs by exactly the five: ${importers.join(", ")}`,
      );
      const anyImporters = [...sources].filter(([, code]) => /\brunInsertTopLevel\b/u.test(code) && !/function\s+runInsertTopLevel\b/u.test(code)).map(([relPath]) => relPath).sort();
      assert.deepEqual(anyImporters, importers, "no module reaches runInsertTopLevel by any other route");

      // None of the four faces contains parseInt, Math.max or a number: write; the mechanics
      // module keeps parsePosition (non-vacuity: the patterns match there).
      const faces = ["commands/insert-milestone.mjs", "commands/insert-chore.mjs", "commands/insert-uat.mjs", "commands/insert-story.mjs"];
      const patterns = [["parseInt", /\bparseInt\b/u], ["Math.max", /\bMath\.max\b/u], ["a number: write", /\bnumber\s*:/u]];
      assert.match(sources.get("commands/insert-shared.mjs"), /\bparseInt\b/u, "non-vacuity: the mechanics module parses (parsePosition)");
      assert.match(sources.get("commands/promote.mjs"), /\bnumber\s*:/u, "non-vacuity: the number: pattern matches where the mint writes one");
      for (const face of faces) {
        const code = sources.get(face);
        assert.ok(typeof code === "string" && code.trim().length > 0, `non-vacuity: ${face} was read`);
        for (const [what, pattern] of patterns) assert.doesNotMatch(code, pattern, `${face} contains ${what}`);
      }

      // insert-shared.mjs no longer contains renumberDepends, preflightTopLevelScaffold or
      // writeTopLevelScaffold (comment-stripped — the comments may still name what was deleted).
      const mechanics = sources.get("commands/insert-shared.mjs");
      for (const gone of ["renumberDepends", "preflightTopLevelScaffold", "writeTopLevelScaffold"]) {
        assert.doesNotMatch(mechanics, new RegExp(`\\b${gone}\\b`, "u"), `insert-shared.mjs still contains ${gone}`);
      }
    },
  },
];
