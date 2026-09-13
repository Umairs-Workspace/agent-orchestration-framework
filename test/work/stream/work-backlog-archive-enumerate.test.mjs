// Traceability wiring for milestone 127 / story 01 — "One enumerator, three roots".
//
// Every @executable scenario (and every Scenario Outline Examples row) of the story's five
// executable task features is asserted here against the LOCKED engine in src/work.mjs and its
// consumers, driven over THE THREE-ROOT FIXTURE task 00 names once for the whole story:
//
//   <work>/10_milestone_alpha/SPEC.md            in-progress   + stories/00_story_alpha-one  not-started
//   <work>/11_chore_beta/CHORE.md                not-started   depends: [05]
//   <work>/backlog/chore_gamma/CHORE.md                        (group "")
//   <work>/backlog/ideas/milestone_delta/SPEC.md               (group "ideas")
//   <work>/backlog/ideas/later/spike_epsilon/SPIKE.md          (group "ideas/later")
//   <work>/archive/05_milestone_zeta/SPEC.md     done          + stories/00_story_zeta-one   done
//   <work>/archive/06_chore_eta/CHORE.md         done
//   <work>/TECH_DEBT.md                                        (a file at the root, unmatched today)
//
// The fixture builder is EXPORTED so the story's three arch-tests (FF-12701/12702/12706) drive
// the same tree rather than a second spelling of it. The textual halves of the contracts —
// the sweeps, the allow-lists, the `.archived` token rule — live in those arch-tests; this
// suite is the behavioural half. Sections follow the task features in order (00 → 04, then
// task 01's behavioural legs).
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import {
  listItems,
  listStream,
  findWork,
  nextWork,
  validateWork,
  loadWorkspace,
  isLiveStreamRow,
  ITEM_RE,
  BACKLOG_ITEM_RE,
  BACKLOG_ROOT,
  ARCHIVE_ROOT,
} from "../../../src/work.mjs";
import { doctorWork, buildSnapshot } from "../../../src/work/doctor.mjs";
import { resolvedDependsEdges } from "../../../src/work/doctor-depends.mjs";
import { statusCoherenceGroup } from "../../../src/work/doctor-coherence.mjs";
import { appendPosition } from "../../../src/work-promote/promotion.mjs";
import { countShiftedByInsert, refsTouchedByInsert } from "../../../src/work/reindex.mjs";
import { buildRecords } from "../../../src/memory/local-indexing.mjs";
import { resolveCitationAtEmit } from "../../../src/work-tune/provenance.mjs";
import { resolveMilestoneFolder } from "../../../src/work/observe.mjs";
import { migrateFolderCommand } from "../../../src/commands/migrate-folder.mjs";
import { docCommand } from "../../../src/commands/doc.mjs";
import { invoke } from "../../../src/command-core.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

const RECORD_DOC = { milestone: "SPEC.md", story: "STORY.md", uat: "SESSION.md", spike: "SPIKE.md", chore: "CHORE.md" };
const SEVEN_KEYS = ["dir", "parent", "ref", "slug", "status", "title", "type"];
const ENUMERATOR_KEYS = ["dir", "name", "number", "parent", "ref", "slug", "type"];

function frontmatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

// writeItem(work, rel, { type, number?, slug, status, title?, parent?, depends?, body? }) — one
// record doc, valid by default (schema: 1 beside its status, created + updated). `number`
// is OMITTED for a backlog item, which is the rule task 03 checks.
async function writeItem(work, rel, { type, number, slug, status = "not-started", title, parent, depends, extra = {}, body = "" }) {
  const dir = path.join(work, ...rel.split("/"));
  await mkdir(dir, { recursive: true });
  const fields = {
    type,
    number,
    slug,
    status,
    title: `"${title ?? slug}"`,
    parent,
    depends,
    created: "2026-09-11",
    updated: "2026-09-11",
    schema: 1,
    ...extra,
  };
  await writeFile(path.join(dir, RECORD_DOC[type]), frontmatter(fields) + body, "utf8");
  return dir;
}

// The three-root fixture, exactly as task 00 spells it. `archiveEtaStatus` is the one knob a
// scenario turns (task 02 sets `06` to `not-started`); everything else a scenario adds, it adds
// through `writeItem` / `mkdir` on the returned `work` dir.
export async function buildThreeRootFixture({ archiveEtaStatus = "done", betaDepends = "[05]" } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-127-three-roots-"));
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`, "utf8");
  const work = path.join(root, "wiki", "work");
  await mkdir(work, { recursive: true });
  await writeItem(work, "10_milestone_alpha", { type: "milestone", number: "10", slug: "alpha", status: "in-progress", title: "Alpha" });
  await writeItem(work, "10_milestone_alpha/stories/00_story_alpha-one", { type: "story", number: "00", slug: "alpha-one", parent: "10", title: "Alpha one" });
  await writeItem(work, "11_chore_beta", { type: "chore", number: "11", slug: "beta", title: "Beta", depends: betaDepends });
  await writeItem(work, "backlog/chore_gamma", { type: "chore", slug: "gamma", title: "Gamma" });
  await writeItem(work, "backlog/ideas/milestone_delta", { type: "milestone", slug: "delta", title: "Delta" });
  await writeItem(work, "backlog/ideas/later/spike_epsilon", { type: "spike", slug: "epsilon", title: "Epsilon" });
  await writeItem(work, "archive/05_milestone_zeta", { type: "milestone", number: "05", slug: "zeta", status: "done", title: "Zeta" });
  await writeItem(work, "archive/05_milestone_zeta/stories/00_story_zeta-one", { type: "story", number: "00", slug: "zeta-one", parent: "05", status: "done", title: "Zeta one" });
  await writeItem(work, "archive/06_chore_eta", { type: "chore", number: "06", slug: "eta", status: archiveEtaStatus, title: "Eta" });
  await writeFile(path.join(work, "TECH_DEBT.md"), "# tech debt\n", "utf8");
  return { root, work };
}

export async function withThreeRoots(options, body) {
  const { root, work } = await buildThreeRootFixture(options);
  try {
    return await body({ root, work });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// A work directory holding ONLY the two live items — "a project with neither root".
async function withLiveOnly(body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-127-live-only-"));
  const work = path.join(root, "wiki", "work");
  await writeItem(work, "10_milestone_alpha", { type: "milestone", number: "10", slug: "alpha", status: "in-progress", title: "Alpha" });
  await writeItem(work, "10_milestone_alpha/stories/00_story_alpha-one", { type: "story", number: "00", slug: "alpha-one", parent: "10", title: "Alpha one" });
  await writeItem(work, "11_chore_beta", { type: "chore", number: "11", slug: "beta", title: "Beta" });
  try {
    return await body({ root, work });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const mkdirs = (work, ...rels) => Promise.all(rels.map((rel) => mkdir(path.join(work, ...rel.split("/")), { recursive: true })));
const refsOf = (rows) => rows.map((row) => row.ref);
const byRef = (rows, ref) => rows.find((row) => row.ref === ref);
const rel = (work, dir) => path.relative(work, dir).split(path.sep).join("/");

function runCli(root, args) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const doctorFindings = async (work, config = {}, scope = undefined, options = {}) =>
  doctorWork(work, config, scope, { now: Date.parse("2026-09-11T00:00:00Z"), projectRoot: path.dirname(path.dirname(work)), ...options });
const withCode = (findings, code) => findings.filter((finding) => finding.code === code);
const orphanPaths = (findings, work) => withCode(findings, "orphan-folder").map((finding) => rel(work, finding.path));

// The pre-story one-root walk, spelled inline (task 00's "a pre-127 reader ignores both roots").
async function oneRootWalk(work) {
  const { readdir } = await import("node:fs/promises");
  const rows = [];
  for (const entry of await readdir(work, { withFileTypes: true })) {
    if (!entry.isDirectory() || !ITEM_RE.test(entry.name)) continue;
    rows.push(entry.name);
    if (entry.name.includes("_milestone_")) {
      let stories = [];
      try { stories = await readdir(path.join(work, entry.name, "stories"), { withFileTypes: true }); } catch { stories = []; }
      for (const child of stories) if (child.isDirectory() && ITEM_RE.test(child.name)) rows.push(`${entry.name}/stories/${child.name}`);
    }
  }
  return rows;
}

export const workBacklogArchiveEnumerateTests = [
  // ============================================================================
  // 00_listitems-walks-three-roots.feature
  // ============================================================================

  // Scenario: a project with neither root is byte-identical to today
  {
    name: "work/backlog-archive-enumerate: 00 a project with neither root is byte-identical to today",
    run: () =>
      withLiveOnly(async ({ work }) => {
        const items = await listItems(work);
        assert.deepEqual(refsOf(items), ["10", "10/00", "11"], "exactly the three rows, in the pre-story order");
        for (const item of items) {
          assert.deepEqual(Object.keys(item).sort(), ENUMERATOR_KEYS, `row ${item.ref} carries exactly the seven enumerator keys`);
          assert.ok(!("backlog" in item) && !("archived" in item), `row ${item.ref} carries neither backlog nor archived`);
        }
      }),
  },

  // Scenario: the backlog is walked recursively and a row names its group as a path
  {
    name: "work/backlog-archive-enumerate: 00 the backlog is walked recursively and a row names its group as a forward-slashed path",
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        const items = await listItems(work);
        const gamma = byRef(items, "gamma");
        assert.deepEqual(gamma, {
          number: null, type: "chore", slug: "gamma", name: "chore_gamma", dir: path.join(work, "backlog", "chore_gamma"), ref: "gamma", parent: null, backlog: "",
        });
        const delta = byRef(items, "delta");
        assert.equal(delta.backlog, "ideas");
        assert.equal(delta.ref, "delta");
        const epsilon = byRef(items, "epsilon");
        assert.equal(epsilon.backlog, "ideas/later", "nested groups are joined with `/` on every platform");
        assert.ok(!epsilon.backlog.includes("\\"), "the group path holds no backslash");
        assert.ok(!items.some((row) => row.name === "ideas" || row.name === "later"), "no row is produced for a group directory");
      }),
  },

  // Scenario: a backlog leaf is never descended, and a task is never a backlog driver
  {
    name: "work/backlog-archive-enumerate: 00 a backlog leaf is never descended, and a task is never a backlog driver",
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        await writeItem(work, "backlog/ideas/milestone_delta/stories/00_story_stray", { type: "story", number: "00", slug: "stray" });
        await mkdirs(work, "backlog/task_lonely");
        const items = await listItems(work);
        assert.ok(!items.some((row) => row.slug === "stray" || row.name === "00_story_stray"), "a leaf is not descended: no row for 00_story_stray");
        assert.ok(!items.some((row) => row.name === "task_lonely" || row.slug === "lonely"), "`task` is not in the leaf grammar");
        assert.ok(!items.some((row) => row.backlog === "task_lonely"), "task_lonely is a group, descended, yielding nothing");
      }),
  },

  // Scenario Outline: the leaf grammar decides what a directory under backlog/ is
  ...[
    { name: "milestone_x", kind: "leaf", row: { type: "milestone", slug: "x", ref: "x" } },
    { name: "story_a-b", kind: "leaf", row: { type: "story", slug: "a-b", parent: null } },
    { name: "uat_x", kind: "leaf", row: { type: "uat" } },
    { name: "milestone_1", kind: "leaf", row: { slug: "1" } },
    { name: "task_x", kind: "group" },
    { name: "Milestone_x", kind: "group" },
    { name: "milestone_X", kind: "group" },
    { name: "milestone_", kind: "group" },
    { name: "milestone_x_y", kind: "group" },
    { name: "milestone-x", kind: "group" },
    { name: "10_milestone_x", kind: "group" },
    { name: "notes", kind: "group" },
    { name: "archive", kind: "group" },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 00 outline [backlog/${row.name}] is a ${row.kind}`,
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        await mkdirs(work, `backlog/${row.name}`);
        const before = (await listItems(work)).length; // 9 fixture rows
        const items = await listItems(work);
        const added = items.filter((item) => item.name === row.name && item.backlog === "");
        if (row.kind === "leaf") {
          assert.equal(added.length, 1, `${row.name} contributes one row`);
          for (const [key, value] of Object.entries(row.row)) assert.equal(added[0][key], value, `${row.name}.${key}`);
          assert.equal(items.length, 9 + 1);
        } else {
          assert.equal(added.length, 0, `${row.name} contributes no row`);
          assert.equal(items.length, 9, `${row.name} is a group and adds nothing (before=${before})`);
        }
      }),
  })),

  // Scenario Outline: a leaf's backlog value is its group path, verbatim and forward-slashed
  ...[
    { path: "chore_gamma", group: "", ref: "gamma" },
    { path: "ideas/later/spike_epsilon", group: "ideas/later", ref: "epsilon" },
    { path: "a/b/c/d/uat_deep", group: "a/b/c/d", ref: "deep" },
    { path: "Whatever-Case/milestone_cased", group: "Whatever-Case", ref: "cased" },
    { path: "task_lonely/milestone_inner", group: "task_lonely", ref: "inner" },
    { path: "10_milestone_x/chore_inside", group: "10_milestone_x", ref: "inside" },
    { path: "archive/chore_x", group: "archive", ref: "x" },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 00 outline [backlog/${row.path}] carries backlog "${row.group}" and ref "${row.ref}"`,
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        await mkdirs(work, `backlog/${row.path}`);
        const found = (await listItems(work)).find((item) => item.ref === row.ref && item.number == null);
        assert.ok(found, `a row for backlog/${row.path}`);
        assert.equal(found.backlog, row.group);
        assert.ok(!found.backlog.includes("\\"), "no backslash even where path.sep is one");
      }),
  })),

  // Scenario: the archive is walked with the same regex, and the location adds one flag
  {
    name: "work/backlog-archive-enumerate: 00 the archive is walked with ITEM_RE, name verbatim, and the location adds `archived: true`",
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        await mkdirs(work, "archive/notes/07_chore_inside");
        const items = await listItems(work);
        assert.deepEqual(byRef(items, "05"), {
          number: "05", type: "milestone", slug: "zeta", name: "05_milestone_zeta", dir: path.join(work, "archive", "05_milestone_zeta"), ref: "05", parent: null, archived: true,
        });
        const story = byRef(items, "05/00");
        assert.deepEqual({ number: story.number, type: story.type, slug: story.slug, ref: story.ref, parent: story.parent, archived: story.archived }, { number: "00", type: "story", slug: "zeta-one", ref: "05/00", parent: "05", archived: true });
        assert.equal(byRef(items, "06").archived, true);
        assert.ok(!items.some((row) => row.name === "notes" || row.slug === "inside"), "archive/notes yields no row and is not descended — the archive is flat");
      }),
  },

  // Scenario Outline: the archive is flat, and a name ITEM_RE refuses is neither a row nor a door
  ...[
    { entry: "07_uat_theta", rows: [{ ref: "07", archived: true }] },
    { entry: "08_milestone_iota/stories/00_story_one", rows: [{ ref: "08", archived: true }, { ref: "08/00", parent: "08", archived: true }] },
    { entry: "08_chore_iota/stories/00_story_one", rows: [{ ref: "08", archived: true }], not: ["08/00"] },
    { entry: "05_milestone_zeta/stories/typo", rows: [] },
    { entry: "notes", rows: [] },
    { entry: "ideas/06_chore_x", rows: [] },
    { entry: "chore_x", rows: [] },
    { entry: "backlog/chore_x", rows: [] },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 00 outline [archive/${row.entry}] contributes ${row.rows.length} row(s)`,
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        await mkdirs(work, `archive/${row.entry}`);
        const items = await listItems(work);
        assert.equal(items.length, 9 + row.rows.length, `archive/${row.entry} adds exactly ${row.rows.length}`);
        for (const expected of row.rows) {
          const found = byRef(items, expected.ref);
          assert.ok(found, `row ${expected.ref}`);
          for (const [key, value] of Object.entries(expected)) assert.equal(found[key], value, `${expected.ref}.${key}`);
        }
        for (const absent of row.not ?? []) assert.ok(!byRef(items, absent), `no row ${absent}`);
        assert.ok(!items.some((item) => item.slug === "x" && item.archived), "a group's contents / a leaf-grammar name under archive/ are never rows");
      }),
  })),

  // Scenario Outline: each root is walked only when it is a directory
  ...[
    { state: "neither backlog nor archive exists", setup: async () => {} },
    { state: "backlog/ exists and is empty", setup: (work) => mkdirs(work, "backlog") },
    { state: "backlog/ideas/later/ exists with no leaf beneath", setup: (work) => mkdirs(work, "backlog/ideas/later") },
    { state: "archive/ exists and is empty", setup: (work) => mkdirs(work, "archive") },
    { state: "backlog is a regular file", setup: (work) => writeFile(path.join(work, "backlog"), "not a dir\n") },
    { state: "archive is a regular file", setup: (work) => writeFile(path.join(work, "archive"), "not a dir\n") },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 00 outline [${row.state}] — exactly the three root rows, without throwing`,
    run: () =>
      withLiveOnly(async ({ work }) => {
        await row.setup(work);
        const items = await listItems(work);
        assert.deepEqual(refsOf(items), ["10", "10/00", "11"]);
        for (const item of items) assert.ok(!("backlog" in item) && !("archived" in item), `row ${item.ref} is a plain root row`);
      }),
  })),

  // Scenario: the walk order is the root, then the backlog, then the archive
  {
    name: "work/backlog-archive-enumerate: 00 the walk order is the root, then the backlog, then the archive",
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        const items = await listItems(work);
        const kind = (row) => (row.archived ? 2 : row.number == null ? 1 : 0);
        const kinds = items.map(kind);
        assert.deepEqual(kinds, [...kinds].sort((a, b) => a - b), `root rows precede backlog rows precede archived rows (got ${items.map((row) => row.ref).join(" ")})`);
        assert.deepEqual(refsOf(items.filter((row) => kind(row) === 0)), ["10", "10/00", "11"], "the root rows are in the pre-story order");
      }),
  },

  // Scenario: the leaf grammar has one home beside the item grammar
  {
    name: "work/backlog-archive-enumerate: 00 the leaf grammar and the two root names have one home beside the item grammar",
    run: async () => {
      assert.equal(BACKLOG_ITEM_RE.source, "^(milestone|story|chore|spike|uat)_([a-z0-9-]+)$");
      assert.equal(ITEM_RE.source, "^(\\d+)_(milestone|story|task|uat|spike|chore)_([a-z0-9-]+)$", "ITEM_RE's value is unchanged");
      assert.equal(BACKLOG_ROOT, "backlog");
      assert.equal(ARCHIVE_ROOT, "archive");
      const source = await readFile(path.join(repoRoot, "src", "work.mjs"), "utf8");
      assert.equal((source.match(/const BACKLOG_ITEM_RE = \//g) ?? []).length, 1, "BACKLOG_ITEM_RE is defined once");
      assert.equal((source.match(/const ITEM_RE = \//g) ?? []).length, 1, "ITEM_RE is defined once");
      assert.equal((source.match(/"backlog"/g) ?? []).length, 1, "the backlog root name is spelled once");
      assert.equal((source.match(/"archive"/g) ?? []).length, 1, "the archive root name is spelled once");
    },
  },

  // Scenario: a pre-127 reader ignores both roots
  {
    name: "work/backlog-archive-enumerate: 00 a pre-127 reader ignores both roots — neither name matches ITEM_RE, and a one-root walk yields the three root rows",
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        assert.equal(ITEM_RE.test(BACKLOG_ROOT), false);
        assert.equal(ITEM_RE.test(ARCHIVE_ROOT), false);
        assert.deepEqual(await oneRootWalk(work), ["10_milestone_alpha", "10_milestone_alpha/stories/00_story_alpha-one", "11_chore_beta"]);
        assert.ok(existsSync(path.join(repoRoot, "wiki", "work", "TECH_DEBT.md")), "this repository's own stream carries TECH_DEBT.md at the root");
        assert.equal(ITEM_RE.test("TECH_DEBT.md"), false, "…and it is still not a row by the same rule");
      }),
  },

  // ============================================================================
  // 02_one-predicate-decides-who-filters.feature
  // ============================================================================

  // Scenario: the predicate has one home and one truth table
  {
    name: "work/backlog-archive-enumerate: 02 the predicate has one home and one truth table over enumerator rows",
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        const items = await listItems(work);
        assert.equal(isLiveStreamRow(byRef(items, "10")), true, "a root row is live");
        assert.equal(isLiveStreamRow(byRef(items, "delta")), false, "a backlog row is not live");
        assert.equal(isLiveStreamRow(byRef(items, "05")), false, "an archived row is not live");
        assert.deepEqual(refsOf(items.filter(isLiveStreamRow)), ["10", "10/00", "11"]);
      }),
  },

  // Scenario Outline: the predicate over every combination of the two flags
  ...[
    { number: "10", archived: undefined, live: true },
    { number: "00", archived: undefined, live: true },
    { number: "10", archived: false, live: true },
    { number: "05", archived: true, live: false },
    { number: null, archived: undefined, live: false },
    { number: null, archived: true, live: false },
    { number: null, archived: false, live: false },
    { number: undefined, archived: undefined, live: false },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 02 outline isLiveStreamRow({ number: ${JSON.stringify(row.number) ?? "absent"}, archived: ${row.archived === undefined ? "absent" : row.archived} }) is ${row.live}`,
    run: () => {
      const enumeratorRow = { type: "milestone", slug: "x", ref: "x", parent: null };
      if (row.number !== undefined) enumeratorRow.number = row.number;
      if (row.archived !== undefined) enumeratorRow.archived = row.archived;
      assert.equal(isLiveStreamRow(enumeratorRow), row.live);
    },
  })),

  // Scenario: next never proposes a backlog row or an archived row, whatever its status
  {
    name: "work/backlog-archive-enumerate: 02 next never proposes a backlog row or an archived row, whatever its status",
    run: () =>
      withThreeRoots({ archiveEtaStatus: "not-started" }, async ({ work }) => {
        const result = await nextWork(work);
        assert.equal(result.state, "ready");
        assert.deepEqual(refsOf(result.readySet), ["10/00", "11"], "the ready set names 10/00 and 11, in that order");
        for (const ref of ["delta", "gamma", "epsilon", "05", "06"]) assert.ok(!result.readySet.some((row) => row.ref === ref), `${ref} is never proposed`);
      }),
  },

  // Scenario: an archived dependency satisfies the edge it is named in
  {
    name: "work/backlog-archive-enumerate: 02 an archived dependency satisfies the edge it is named in, and `aof work next --json` adds no filter of its own",
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        const result = await nextWork(work);
        assert.ok(result.readySet.some((row) => row.ref === "11"), "11 is ready, not blocked (05 is archived and done)");
        const cli = runCli(root, ["work", "next", "--json"]);
        assert.equal(cli.status, 0, cli.stderr);
        const parsed = JSON.parse(cli.stdout);
        assert.deepEqual(refsOf(parsed.readySet), refsOf(result.readySet), "the face reports the same ready set");
      }),
  },

  // Scenario Outline: an edge is scored by its target's status, wherever the target lives
  ...[
    { depends: "[05]", target: "05 archived, done", ready: true },
    { depends: "[06]", target: "06 archived, not-started", ready: false, waitingOn: "06", eta: "not-started" },
    { depends: "[gamma]", target: "gamma a backlog chore", ready: false, waitingOn: "gamma" },
    { depends: "[10]", target: "10 live, in-progress", ready: false, waitingOn: "10" },
    { depends: "[]", target: "none", ready: true },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 02 outline 11 depends ${row.depends} (${row.target}) — 11 is ${row.ready ? "ready" : `blocked, waiting on ${row.waitingOn}`}`,
    run: () =>
      withThreeRoots({ betaDepends: row.depends, archiveEtaStatus: row.eta ?? "done" }, async ({ work }) => {
        const result = await nextWork(work, "11");
        if (row.ready) {
          assert.equal(result.state, "ready");
          assert.equal(result.ref, "11");
        } else {
          assert.equal(result.state, "blocked");
          assert.equal(result.ref, "11");
          assert.deepEqual(result.waitingOn, [row.waitingOn]);
        }
      }),
  })),

  // Scenario: the default listing holds the live rows and the backlog, and --all adds the archive
  {
    name: "work/backlog-archive-enumerate: 02 the default listing holds the live rows and the backlog, and --all adds the archive (byte-stable on the face)",
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        assert.deepEqual(refsOf(await listStream(work)), ["10", "10/00", "11", "gamma", "delta", "epsilon"]);
        assert.deepEqual(refsOf(await listStream(work, { all: true })), ["10", "10/00", "11", "gamma", "delta", "epsilon", "05", "05/00", "06"]);
        const one = runCli(root, ["work", "list", "--json"]);
        const two = runCli(root, ["work", "list", "--json"]);
        assert.equal(one.status, 0, one.stderr);
        assert.equal(one.stdout, two.stdout, "byte-stable across two runs");
        assert.deepEqual(refsOf(JSON.parse(one.stdout)), ["10", "10/00", "11", "gamma", "delta", "epsilon"]);
        const allOne = runCli(root, ["work", "list", "--all", "--json"]);
        const allTwo = runCli(root, ["work", "list", "--all", "--json"]);
        assert.equal(allOne.status, 0, allOne.stderr);
        assert.equal(allOne.stdout, allTwo.stdout, "--all is byte-stable across two runs");
        assert.deepEqual(refsOf(JSON.parse(allOne.stdout)), ["10", "10/00", "11", "gamma", "delta", "epsilon", "05", "05/00", "06"]);
      }),
  },

  // Scenario Outline: the mixed listing sorts live by number, backlog by group path then slug, archived by number
  ...[
    { added: null, tail: ["gamma", "delta", "epsilon", "05", "05/00", "06"] },
    { added: { rel: "backlog/ideas/chore_apple", type: "chore", slug: "apple" }, tail: ["gamma", "apple", "delta", "epsilon", "05", "05/00", "06"] },
    { added: { rel: "backlog/chore_aardvark", type: "chore", slug: "aardvark" }, tail: ["aardvark", "gamma", "delta", "epsilon", "05", "05/00", "06"] },
    { added: { rel: "backlog/zzz/milestone_aaa", type: "milestone", slug: "aaa" }, tail: ["gamma", "delta", "epsilon", "aaa", "05", "05/00", "06"] },
    { added: { rel: "backlog/ideas/early/uat_omega", type: "uat", slug: "omega" }, tail: ["gamma", "delta", "omega", "epsilon", "05", "05/00", "06"] },
    { added: { rel: "archive/03_chore_old", type: "chore", slug: "old", number: "03", status: "done" }, tail: ["gamma", "delta", "epsilon", "03", "05", "05/00", "06"] },
    { added: { rel: "archive/20_milestone_omega/stories/00_story_last", type: "story", slug: "last", number: "00", parent: "20", status: "done", also: { rel: "archive/20_milestone_omega", type: "milestone", slug: "omega", number: "20", status: "done" } }, tail: ["gamma", "delta", "epsilon", "05", "05/00", "06", "20", "20/00"] },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 02 outline mixed listing plus ${row.added?.rel ?? "nothing"} — tail is ${row.tail.join(", ")}`,
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        if (row.added?.also) await writeItem(work, row.added.also.rel, row.added.also);
        if (row.added) await writeItem(work, row.added.rel, row.added);
        const all = refsOf(await listStream(work, { all: true }));
        assert.deepEqual(all.slice(0, 3), ["10", "10/00", "11"]);
        assert.deepEqual(all.slice(3), row.tail);
        const dflt = refsOf(await listStream(work));
        assert.deepEqual(dflt, all.filter((ref) => !["03", "05", "05/00", "06", "20", "20/00"].includes(ref)), "the default call answers the same rows with every archive/ row removed");
      }),
  })),

  // …and the sort is a plain code-point compare, never localeCompare.
  {
    name: "work/backlog-archive-enumerate: 02 the backlog sort compares group path and slug as plain strings (`<`), never localeCompare",
    run: async () => {
      const source = await readFile(path.join(repoRoot, "src", "work.mjs"), "utf8");
      const start = source.indexOf("function byGroupThenSlug");
      assert.ok(start > 0, "the backlog comparator is named");
      const body = source.slice(start, source.indexOf("\n}", start));
      assert.ok(/a\.backlog < b\.backlog/.test(body) && /a\.slug < b\.slug/.test(body), "compared with `<`");
      assert.ok(!/localeCompare/.test(body), "never localeCompare");
    },
  },

  // Scenario: the row shapes are the frozen seven, widened only where the root is new
  {
    name: "work/backlog-archive-enumerate: 02 the row shapes are the frozen seven, widened only where the root is new",
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        const rows = await listStream(work, { all: true });
        for (const ref of ["10", "10/00", "11"]) assert.deepEqual(Object.keys(byRef(rows, ref)).sort(), SEVEN_KEYS, `listStream row ${ref} has exactly the seven keys`);
        const delta = byRef(rows, "delta");
        assert.deepEqual(Object.keys(delta).sort(), [...SEVEN_KEYS, "backlog", "number"].sort());
        assert.equal(delta.number, null);
        assert.equal(delta.backlog, "ideas");
        assert.equal(delta.parent, null);
        const zeta = byRef(rows, "05");
        assert.deepEqual(Object.keys(zeta).sort(), [...SEVEN_KEYS, "archived"].sort());
        assert.equal(zeta.archived, true);
        assert.ok(zeta.dir.includes("/archive/"), "dir under archive/");
        for (const ref of ["10", "11"]) assert.deepEqual(Object.keys((await findWork(work, ref))[0]).sort(), SEVEN_KEYS, `findWork row ${ref} has exactly the seven keys`);
        assert.deepEqual(Object.keys((await findWork(work, "delta"))[0]).sort(), [...SEVEN_KEYS, "backlog", "number"].sort());
        assert.deepEqual(Object.keys((await findWork(work, "05"))[0]).sort(), [...SEVEN_KEYS, "archived"].sort());
      }),
  },

  // Scenario: find, read and depends resolution see all three roots as one stream
  {
    name: "work/backlog-archive-enumerate: 02 find, doc, depends resolution and memory ingest see all three roots as one stream",
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        for (const ref of ["05", "05/00", "delta", "gamma"]) assert.equal((await findWork(work, ref)).length, 1, `findWork(${ref}) answers exactly one row`);
        const zeta = (await findWork(work, "05"))[0];
        assert.equal(zeta.archived, true);
        assert.equal(zeta.status, "done", "status read from the archived SPEC");
        // `aof work doc <ref> SPEC --json` answers from the row's dir — the "read" the SPEC names.
        const workspace = await loadWorkspace(root);
        const ctx = { workspace, globalWorkStoreOptions: {} };
        const zetaDoc = await docCommand.run({ ref: "05", doc: "SPEC" }, ctx);
        assert.equal(zetaDoc.present, true);
        assert.match(zetaDoc.body, /slug: zeta/);
        const deltaDoc = await docCommand.run({ ref: "delta", doc: "SPEC" }, ctx);
        assert.equal(deltaDoc.present, true);
        assert.match(deltaDoc.body, /slug: delta/);
        // depends resolution: the readiness walk and doctor's depends lane both resolve 11 → 05.
        const next = await nextWork(work, "11");
        assert.equal(next.state, "ready", "11's depends: [05] is satisfied by the archived, done 05");
        const snapshot = await buildSnapshot(work, { projectRoot: root });
        const edges = resolvedDependsEdges(snapshot.items).map((edge) => `${edge.from.ref}→${edge.to.ref}`);
        assert.ok(edges.includes("11→05"), `the depends lane resolves 11 → 05 (got ${edges.join(", ")})`);
        // memory ingest indexes the archived milestone's retrospective under item "05".
        await writeFile(
          path.join(work, "archive", "05_milestone_zeta", "RETROSPECTIVE.md"),
          "---\ndoc: retrospective\nref: \"05\"\n---\n# 05 · Zeta — Retrospective\n\n## R1 — A lesson from the archive\n\n- **Kind:** near-miss · **Area:** tooling · **Stage:** build · **Owner:** developer · **Raised by:** developer\n- **What happened:** something.\n- **Why:** a reason.\n- **Lesson:** the archived lesson gist.\n",
          "utf8",
        );
        const records = await buildRecords(null, { workDir: work, projectRoot: root, configMemory: {} });
        assert.ok(records.some((record) => record.item === "05" && /archived lesson/.test(record.text ?? record.gist ?? JSON.stringify(record))), `the archived retrospective is indexed under item "05" (got ${records.map((record) => record.item).join(", ")})`);
      }),
  },

  // Scenario Outline: findWork resolves every ref form over the three roots through the grammar it already has
  ...[
    { ref: "05", refs: ["05"] },
    { ref: "5", refs: ["05"] },
    { ref: "05/00", refs: ["05/00"] },
    { ref: "05/00-00", refs: ["05/00"] },
    { ref: "06", refs: ["06"] },
    { ref: "delta", refs: ["delta"] },
    { ref: "gam", refs: ["gamma"] },
    { ref: "milestone_delta", refs: ["delta"] },
    { ref: "zeta", refs: ["05", "05/00"] },
    { ref: "eta", refs: ["11", "05", "05/00", "06"] },
    { ref: "ideas", refs: [] },
    { ref: "ideas/delta", refs: [] },
    { ref: "07", refs: [] },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 02 outline findWork("${row.ref}") answers ${row.refs.length} row(s): ${row.refs.join(", ") || "none"}`,
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        const rows = await findWork(work, row.ref);
        assert.deepEqual(refsOf(rows), row.refs);
        if (row.ref === "05") assert.equal(rows[0].archived, true);
        if (row.ref === "delta") {
          assert.equal(rows[0].number, null);
          assert.equal(rows[0].backlog, "ideas");
        }
      }),
  })),

  // Scenario: recent enumerates through the listing, not through its own walk
  {
    name: "work/backlog-archive-enumerate: 02 recent enumerates through `aof work list --json`, not through its own NN_type_slug walk",
    run: async () => {
      const recent = await readFile(path.join(repoRoot, "src", "bundle", "commands", "recent.md"), "utf8");
      const process = recent.slice(recent.indexOf("<process>"), recent.indexOf("</process>"));
      assert.match(process, /^1\.[\s\S]*aof work list --json/m, "step 1 runs the listing");
      assert.match(process, /--all/, "…and --all when the operator asks for the archive");
      assert.ok(!/NN_type_slug/.test(recent), "the string NN_type_slug no longer appears as an enumeration instruction");
    },
  },

  // ============================================================================
  // 03_validate-and-doctor-read-three-roots.feature
  // ============================================================================

  // Scenario: a valid three-root stream validates clean
  {
    name: "work/backlog-archive-enumerate: 03 a valid three-root stream validates clean, on the engine and on the face",
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        assert.deepEqual(await validateWork(work, {}), []);
        const cli = runCli(root, ["work", "validate", "--json"]);
        assert.equal(cli.status, 0, cli.stderr);
        assert.deepEqual(JSON.parse(cli.stdout), []);
      }),
  },

  // Scenario Outline: a backlog record doc must not carry a number, and everything else about it is checked as at the root
  ...[
    { edit: "carrying number: 07", fields: { number: "07" }, finding: `frontmatter number "07" on a backlog item — a backlog item carries no number until 'aof work promote' mints one` },
    { edit: "carrying number: with no value", fields: { number: "" }, finding: null },
    { edit: "carrying type: chore", fields: { type: "chore" }, finding: `frontmatter type "chore" ≠ folder type "milestone"` },
    { edit: "carrying slug: other", fields: { slug: "other" }, finding: `frontmatter slug "other" ≠ folder "delta"` },
    { edit: "carrying status: nonsense", fields: { status: "nonsense" }, finding: `invalid status "nonsense"` },
    { edit: "with no created", fields: { created: undefined }, finding: "missing created date" },
    { edit: "with no updated", fields: { updated: undefined }, finding: "missing updated date" },
    { edit: "empty", empty: true, finding: "missing or empty record doc (SPEC.md)" },
    { edit: "valid, with no number:", fields: {}, finding: null },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 03 outline backlog/ideas/milestone_delta/SPEC.md ${row.edit} → ${row.finding ? "one finding" : "no finding"}`,
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        const spec = path.join(work, "backlog", "ideas", "milestone_delta", "SPEC.md");
        if (row.empty) {
          await writeFile(spec, "", "utf8");
        } else {
          const base = { type: "milestone", slug: "delta", status: "not-started", title: '"Delta"', created: "2026-09-11", updated: "2026-09-11", schema: 1 };
          await writeFile(spec, frontmatter({ ...base, ...row.fields }), "utf8");
        }
        const findings = (await validateWork(work, {})).filter((finding) => finding.path === spec);
        if (row.finding == null) {
          assert.deepEqual(findings, [], `no finding on the backlog SPEC (got ${JSON.stringify(findings)})`);
        } else {
          assert.equal(findings.length, 1, `exactly one finding (got ${JSON.stringify(findings)})`);
          assert.equal(findings[0].problem, row.finding);
        }
      }),
  })),

  // Scenario: a backlog row is never a source or a target in the depends graph
  {
    name: "work/backlog-archive-enumerate: 03 a backlog row is never a source or a target in the depends graph",
    run: () =>
      withThreeRoots({ betaDepends: "[gamma]" }, async ({ root, work }) => {
        await writeItem(work, "backlog/ideas/milestone_delta", { type: "milestone", slug: "delta", title: "Delta", depends: "[99, gamma]" });
        const findings = await validateWork(work, {});
        const onDelta = findings.filter((finding) => finding.path.includes("milestone_delta"));
        assert.deepEqual(onDelta, [], "delta's depends: [99, gamma] is a planning note — nothing reported");
        assert.ok(!findings.some((finding) => /NaN/.test(finding.problem)), "no graph key is NaN");
        const onBeta = findings.filter((finding) => finding.path.includes("11_chore_beta"));
        assert.deepEqual(onBeta.map((finding) => finding.problem), [`depends "gamma" does not resolve to a top-level item (a milestone, uat gate, spike, chore, or parentless story)`], "11's depends: [gamma] IS reported");
        const doctor = await doctorFindings(work, {}, undefined, { projectRoot: root });
        assert.ok(!doctor.some((finding) => /\b99\b|gamma/.test(finding.message) && finding.path.includes("milestone_delta")), "the doctor depends lane reports nothing on delta's entries");
        const snapshot = await buildSnapshot(work, { projectRoot: root });
        assert.ok(!resolvedDependsEdges(snapshot.items).some((edge) => edge.from.ref === "delta" || edge.to.ref === "delta"), "delta is neither a source nor a target edge");
      }),
  },

  // Scenario Outline: a depends entry is scored by where its source lives, and resolves only to a number
  ...[
    { source: "backlog/ideas/milestone_delta", type: "milestone", slug: "delta", depends: "[99]", finding: null },
    { source: "backlog/ideas/milestone_delta", type: "milestone", slug: "delta", depends: "[gamma]", finding: null },
    { source: "backlog/ideas/milestone_delta", type: "milestone", slug: "delta", depends: "[11]", finding: null },
    { source: "backlog/chore_gamma", type: "chore", slug: "gamma", depends: "[delta, 05]", finding: null },
    { source: "11_chore_beta", beta: "[05]", finding: null },
    { source: "11_chore_beta", beta: "[06]", finding: null },
    { source: "11_chore_beta", beta: "[gamma]", finding: `depends "gamma" does not resolve to a top-level item (a milestone, uat gate, spike, chore, or parentless story)` },
    { source: "11_chore_beta", beta: "[delta]", finding: `depends "delta" does not resolve to a top-level item (a milestone, uat gate, spike, chore, or parentless story)` },
    { source: "11_chore_beta", beta: "[99]", finding: `depends "99" does not resolve to a top-level item (a milestone, uat gate, spike, chore, or parentless story)` },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 03 outline ${row.source} declaring depends ${row.beta ?? row.depends} → ${row.finding ? "the unresolved-target message" : "nothing"}`,
    run: () =>
      withThreeRoots({ betaDepends: row.beta ?? "[05]" }, async ({ work }) => {
        if (row.depends) await writeItem(work, row.source, { type: row.type, slug: row.slug, title: row.slug, depends: row.depends });
        const findings = (await validateWork(work, {})).filter((finding) => finding.path.includes(row.source.split("/").pop()));
        if (row.finding == null) assert.deepEqual(findings, []);
        else assert.deepEqual(findings.map((finding) => finding.problem), [row.finding]);
      }),
  })),

  // Scenario: an archived item resolves as a dependency target and its own docs are checked as at the root
  {
    name: "work/backlog-archive-enumerate: 03 an archived item resolves as a dependency target and its own docs are checked as at the root",
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        assert.deepEqual(await validateWork(work, {}), [], "11's depends: [05] resolves; the archived story's parent: 05 resolves");
        await writeItem(work, "archive/05_milestone_zeta/stories/00_story_zeta-one", { type: "story", number: "03", slug: "zeta-one", parent: "05", status: "done" });
        const findings = await validateWork(work, {});
        assert.deepEqual(findings.map((finding) => finding.problem), [`frontmatter number "03" ≠ folder "00"`], "exactly as it would be at the root");
      }),
  },

  // Scenario Outline: two backlog leaves sharing a slug are one collision, and a numbered sibling slug is not
  ...[
    { added: [{ rel: "backlog/later/milestone_delta", type: "milestone", slug: "delta" }], problem: `backlog slug "delta" names 2 folders (ideas/milestone_delta, later/milestone_delta) — a backlog ref is its slug, so one must be renamed` },
    { added: [{ rel: "backlog/later/chore_delta", type: "chore", slug: "delta" }], names: ["delta", "ideas/milestone_delta", "later/chore_delta"] },
    { added: [{ rel: "backlog/ideas/chore_gamma", type: "chore", slug: "gamma" }], names: ["gamma", "chore_gamma", "ideas/chore_gamma"] },
    { added: [{ rel: "backlog/later/milestone_delta", type: "milestone", slug: "delta" }, { rel: "backlog/x/spike_delta", type: "spike", slug: "delta" }], names: ["delta", "ideas/milestone_delta", "later/milestone_delta", "x/spike_delta"], count: 1 },
    { added: [{ rel: "12_milestone_delta", type: "milestone", slug: "delta", number: "12" }], none: true },
    { added: [{ rel: "archive/07_chore_delta", type: "chore", slug: "delta", number: "07", status: "done" }], none: true },
    { added: [{ rel: "backlog/ideas/milestone_delta-two", type: "milestone", slug: "delta-two" }], none: true },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 03 outline plus ${row.added.map((item) => item.rel).join(" and ")} → ${row.none ? "no backlog-slug-duplicate" : "one backlog-slug-duplicate"}`,
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        for (const item of row.added) await writeItem(work, item.rel, { ...item, title: item.slug });
        const findings = (await validateWork(work, {})).filter((finding) => /^backlog slug/.test(finding.problem));
        if (row.none) {
          assert.deepEqual(findings, []);
          return;
        }
        assert.equal(findings.length, row.count ?? 1, `one finding per slug (got ${JSON.stringify(findings)})`);
        assert.equal(findings[0].path, path.join(work, "backlog"), "anchored at <work>/backlog");
        assert.ok(!("code" in findings[0]), "validate findings carry no code");
        if (row.problem) assert.equal(findings[0].problem, row.problem);
        for (const name of row.names ?? []) assert.ok(findings[0].problem.includes(name), `names ${name}`);
      }),
  })),

  // Scenario: the numbering lanes run over every numbered row and no backlog row
  {
    name: "work/backlog-archive-enumerate: 03 the numbering lanes run over every numbered row and no backlog row",
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        await writeItem(work, "06_spike_theta", { type: "spike", number: "06", slug: "theta" });
        const cli = runCli(root, ["work", "doctor", "--json"]);
        const findings = JSON.parse(cli.stdout).findings;
        const duplicate = withCode(findings, "duplicate-driver-number");
        assert.equal(duplicate.length, 1);
        assert.match(duplicate[0].message, /driver number 6 is shared by 2 top-level items \(06_chore_eta, 06_spike_theta\)/);
        const gap = withCode(findings, "numbering-gap");
        assert.equal(gap.length, 1);
        assert.match(gap[0].message, /number 07, 08, 09 are missing between 05 and 11/);
        assert.ok(!/gamma|delta|epsilon/.test(gap[0].message), "never names a backlog row");
        const roadmap = withCode(await doctorFindings(work, { work: { roadmap: { index: [{ number: 10 }] } } }, undefined, { projectRoot: root }), "roadmap-folder-mismatch");
        assert.deepEqual(roadmap.map((finding) => finding.message), ["milestone folder 05 exists on disk but the ROADMAP index omits it"], "the archived milestone 05 counts as a folder on disk");
      }),
  },

  // Scenario Outline: the numbering lanes over each shape of stream
  ...[
    { stream: "the three-root fixture", setup: async () => {}, gap: "number 07, 08, 09 are missing between 05 and 11", duplicate: null },
    { stream: "the fixture without archive/", setup: (work) => rm(path.join(work, "archive"), { recursive: true, force: true }), gap: null, duplicate: null },
    { stream: "the fixture plus archive/20_chore_omega/", setup: (work) => writeItem(work, "archive/20_chore_omega", { type: "chore", number: "20", slug: "omega", status: "done" }), gap: "number 07, 08, 09, 12, 13, 14, 15, 16, 17, 18, 19 are missing between 05 and 20", duplicate: null },
    { stream: "the three backlog leaves alone", setup: async (work) => { for (const name of ["10_milestone_alpha", "11_chore_beta", "archive"]) await rm(path.join(work, name), { recursive: true, force: true }); }, gap: null, duplicate: null },
    { stream: "the fixture plus 06_spike_theta/ at the root", setup: (work) => writeItem(work, "06_spike_theta", { type: "spike", number: "06", slug: "theta" }), gap: "number 07, 08, 09 are missing between 05 and 11", duplicate: "driver number 6 is shared by 2 top-level items (06_chore_eta, 06_spike_theta)" },
    { stream: "the fixture plus archive/05_chore_dup/", setup: (work) => writeItem(work, "archive/05_chore_dup", { type: "chore", number: "05", slug: "dup", status: "done" }), gap: "number 07, 08, 09 are missing between 05 and 11", duplicate: "driver number 5 is shared by 2 top-level items (05_chore_dup, 05_milestone_zeta)" },
    { stream: "the fixture plus backlog/chore_eta/", setup: (work) => writeItem(work, "backlog/chore_eta", { type: "chore", slug: "eta" }), gap: "number 07, 08, 09 are missing between 05 and 11", duplicate: null },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 03 outline numbering lanes over ${row.stream}`,
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        await row.setup(work);
        const findings = await doctorFindings(work, {}, undefined, { projectRoot: root });
        const gap = withCode(findings, "numbering-gap");
        if (row.gap == null) assert.deepEqual(gap, []);
        else assert.ok(gap.length === 1 && gap[0].message.includes(row.gap), `numbering-gap: ${JSON.stringify(gap)}`);
        const duplicate = withCode(findings, "duplicate-driver-number");
        if (row.duplicate == null) assert.deepEqual(duplicate, []);
        else assert.ok(duplicate.length === 1 && duplicate[0].message.includes(row.duplicate), `duplicate-driver-number: ${JSON.stringify(duplicate)}`);
        assert.ok(!findings.some((finding) => /NaN/.test(finding.message)), "no NaN in any lane");
      }),
  })),

  // Scenario Outline: roadmap-folder-mismatch counts an archived milestone as a folder and a backlog milestone as nothing
  ...[
    { index: [{ number: 5 }, { number: 10 }], messages: [] },
    { index: [{ number: 10 }], messages: ["milestone folder 05 exists on disk but the ROADMAP index omits it"] },
    { index: [{ number: 5 }, { number: 10 }, { number: 12 }], messages: ["the ROADMAP index lists milestone 12 but no matching folder exists on disk"] },
    { index: null, messages: [] },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 03 outline roadmap-folder-mismatch with index ${row.index ? JSON.stringify(row.index) : "not configured"}`,
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        const config = row.index ? { work: { roadmap: { index: row.index } } } : {};
        const findings = withCode(await doctorFindings(work, config, undefined, { projectRoot: root }), "roadmap-folder-mismatch");
        assert.deepEqual(findings.map((finding) => finding.message), row.messages);
      }),
  })),

  // Scenario: the orphan lane knows the two roots and walks the archive
  {
    name: "work/backlog-archive-enumerate: 03 the orphan lane knows the two roots, walks the archive by the root's rule, and reports the two backlog shapes",
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        await mkdirs(work, "archive/07_widget_x", "archive/05_milestone_zeta/stories/typo", "archive/notes", "backlog/Whatever-Case", "backlog/ideas/52_milestone_moved", "backlog/chore_gamma/stories");
        const cli = runCli(root, ["work", "doctor", "--json"]);
        assert.equal(cli.status, 0, cli.stderr);
        const findings = JSON.parse(cli.stdout).findings;
        const orphans = withCode(findings, "orphan-folder");
        const named = orphans.map((finding) => finding.path.replace(/\\/g, "/"));
        assert.ok(!named.some((target) => /(^|\/)(backlog|archive)$/.test(target)), `no orphan-folder names a root (got ${named.join(", ")})`);
        for (const expected of ["archive/07_widget_x", "archive/05_milestone_zeta/stories/typo", "archive/notes", "backlog/ideas/52_milestone_moved", "backlog/chore_gamma/stories"]) {
          assert.ok(named.some((target) => target.endsWith(`/${expected}`)), `orphan-folder names ${expected} (got ${named.join(", ")})`);
        }
        assert.ok(!named.some((target) => target.endsWith("Whatever-Case")), "a group is not reported");
        const moved = orphans.find((finding) => finding.path.replace(/\\/g, "/").endsWith("backlog/ideas/52_milestone_moved"));
        assert.equal(moved.message, `folder "ideas/52_milestone_moved" is a numbered item under the backlog — a backlog item carries no number; 'aof work promote' is the door into the stream`);
        const stories = orphans.find((finding) => finding.path.replace(/\\/g, "/").endsWith("backlog/chore_gamma/stories"));
        assert.equal(stories.message, `folder "chore_gamma/stories" — a backlog driver has no stories; promote it first`);
        const doctorSource = await readFile(path.join(repoRoot, "src", "work", "doctor.mjs"), "utf8");
        assert.ok(!/"backlog"|"archive"/.test(doctorSource), "doctor.mjs spells neither root name as a quoted literal");
        assert.match(doctorSource, /BACKLOG_ROOT,\s*\r?\n\s*ARCHIVE_ROOT,[\s\S]*from "\.\.\/work\.mjs"/, "both root names are imported from work.mjs");
      }),
  },

  // Scenario Outline: the orphan lane's verdict per directory
  ...[
    { directory: null, names: [], not: ["backlog", "archive"] },
    { directory: "archive/07_widget_x", names: ["archive/07_widget_x"] },
    { directory: "archive/notes", names: ["archive/notes"] },
    { directory: "archive/chore_x", names: ["archive/chore_x"] },
    { directory: "archive/05_milestone_zeta/stories/typo", names: ["archive/05_milestone_zeta/stories/typo"] },
    { directory: "archive/06_chore_eta/stories/typo", names: [], not: ["06_chore_eta"] },
    { directory: null, file: "archive/README.md", names: [], not: ["README"] },
    { directory: "backlog/Whatever-Case", names: [], not: ["Whatever-Case"] },
    { directory: "backlog/10_milestone_x", names: ["backlog/10_milestone_x"] },
    { directory: "backlog/ideas/later/10_milestone_x", names: ["backlog/ideas/later/10_milestone_x"] },
    { directory: "backlog/chore_gamma/stories/00_story_stray", names: ["backlog/chore_gamma/stories"], not: ["00_story_stray"] },
    { directory: "backlog/ideas/notes", names: [], not: ["notes"] },
    { directory: "10_milestone_alpha/stories/typo", names: ["10_milestone_alpha/stories/typo"] },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 03 outline orphan-folder over ${row.directory ?? row.file ?? "the bare fixture"} → ${row.names.length ? `names ${row.names.join(", ")}` : "names nothing new"}`,
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        if (row.directory) await mkdirs(work, row.directory);
        if (row.file) await writeFile(path.join(work, ...row.file.split("/")), "readme\n", "utf8");
        const named = orphanPaths(await doctorFindings(work, {}, undefined, { projectRoot: root }), work);
        assert.deepEqual(named, row.names, `orphan-folder paths (got ${named.join(", ")})`);
        for (const absent of row.not ?? []) assert.ok(!named.some((target) => target.includes(absent)), `${absent} is not named`);
      }),
  })),

  // Scenario Outline: doctor's and validate's scope grammar reach all three roots through the branches they already have
  ...[
    { scope: "delta", items: ["delta"] },
    { scope: "05", items: ["05", "05/00"] },
    { scope: "05/00", items: ["05/00"] },
    { scope: "gam", items: ["gamma"] },
    { scope: "eta", items: ["11", "05", "05/00", "06"] },
    { scope: "ideas", items: [] },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 03 outline scope "${row.scope}" reaches exactly ${row.items.join(", ") || "no item"} on doctor and validate`,
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        // Plant one item-anchored finding per item — a missing `created` for validate, an
        // `updated` far behind the file mtime for doctor (`mtime-ahead-of-updated`) — so the
        // scope's reach is observable through which anchors survive. A finding is attributed
        // to the NEAREST item (the longest containing dir), so a story's doc is the story's.
        const items = await listItems(work);
        for (const item of items) {
          const doc = RECORD_DOC[item.type];
          const text = await readFile(path.join(item.dir, doc), "utf8");
          await writeFile(path.join(item.dir, doc), text.replace(/^created: .*$/m, "").replace(/^updated: .*$/m, "updated: 2020-01-01"), "utf8");
        }
        const owner = (target) => [...items].filter((item) => target === item.dir || target.startsWith(item.dir + path.sep)).sort((a, b) => b.dir.length - a.dir.length)[0]?.ref;
        const scoped = await validateWork(work, {}, row.scope);
        const validateItems = [...new Set(scoped.map((finding) => owner(finding.path)).filter(Boolean))];
        assert.deepEqual(validateItems.sort(), [...row.items].sort(), `validate ${row.scope} (got ${validateItems.join(", ")})`);
        const doctor = await doctorFindings(work, {}, row.scope, { projectRoot: root });
        const doctorItems = [...new Set(doctor.filter((finding) => finding.path !== work).map((finding) => owner(finding.path)).filter(Boolean))];
        assert.deepEqual(doctorItems.sort(), [...row.items].sort(), `doctor ${row.scope} (got ${doctorItems.join(", ")})`);
        if (row.scope === "ideas") {
          assert.deepEqual(scoped, [], "a group is not a scope: validate answers []");
          assert.ok(doctor.every((finding) => finding.path === work), "doctor keeps only the stream-level findings anchored at <work>");
        }
      }),
  })),

  // ============================================================================
  // 04_every-number-consumer-is-null-safe.feature
  // ============================================================================

  // Scenario: the mint counts the archive
  {
    name: "work/backlog-archive-enumerate: 04 the mint counts the archive — 21, not 12, and the backlog rows contribute nothing",
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        await writeItem(work, "archive/20_chore_omega", { type: "chore", number: "20", slug: "omega", status: "done" });
        assert.equal(await appendPosition(work), 21);
        for (const name of ["chore_gamma", "ideas/milestone_delta", "ideas/later/spike_epsilon"]) await rm(path.join(work, "backlog", ...name.split("/")), { recursive: true, force: true });
        assert.equal(await appendPosition(work), 21, "removing every backlog row changes nothing");
      }),
  },

  // Scenario Outline: the mint answers the highest number ever minted plus one, and nothing else moves it
  ...[
    { stream: "the three-root fixture", setup: async () => {}, answer: 12 },
    { stream: "the fixture plus archive/20_chore_omega/", setup: (work) => writeItem(work, "archive/20_chore_omega", { type: "chore", number: "20", slug: "omega", status: "done" }), answer: 21 },
    { stream: "the fixture without archive/", setup: (work) => rm(path.join(work, "archive"), { recursive: true, force: true }), answer: 12 },
    { stream: "archive/05_milestone_zeta and archive/06_chore_eta alone", setup: async (work) => { for (const name of ["10_milestone_alpha", "11_chore_beta", "backlog"]) await rm(path.join(work, name), { recursive: true, force: true }); }, answer: 7 },
    { stream: "the three backlog leaves alone", setup: async (work) => { for (const name of ["10_milestone_alpha", "11_chore_beta", "archive"]) await rm(path.join(work, name), { recursive: true, force: true }); }, answer: 0 },
    { stream: "00_chore_a, 01_chore_b and five backlog leaves", setup: async (work) => { for (const name of ["10_milestone_alpha", "11_chore_beta", "archive"]) await rm(path.join(work, name), { recursive: true, force: true }); await writeItem(work, "00_chore_a", { type: "chore", number: "00", slug: "a" }); await writeItem(work, "01_chore_b", { type: "chore", number: "01", slug: "b" }); await writeItem(work, "backlog/chore_c", { type: "chore", slug: "c" }); await writeItem(work, "backlog/chore_d", { type: "chore", slug: "d" }); }, answer: 2 },
    { stream: "an empty work directory", setup: async (work) => { for (const name of ["10_milestone_alpha", "11_chore_beta", "archive", "backlog"]) await rm(path.join(work, name), { recursive: true, force: true }); }, answer: 0 },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 04 outline appendPosition over ${row.stream} answers ${row.answer}`,
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        await row.setup(work);
        assert.equal(await appendPosition(work), row.answer);
      }),
  })),

  // Scenario: the shift set is the live rows and nothing else
  {
    name: "work/backlog-archive-enumerate: 04 the shift set is the live rows and nothing else",
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        await writeItem(work, "archive/20_chore_omega", { type: "chore", number: "20", slug: "omega", status: "done" });
        assert.deepEqual(await refsTouchedByInsert(work, { at: "10", space: "top-level" }), ["10", "11"]);
        assert.equal(await countShiftedByInsert(work, { at: "10", space: "top-level" }), 2);
        const nested = await refsTouchedByInsert(work, { at: "00", space: "nested", parent: "10" });
        assert.deepEqual(nested, ["10/00", "10"], "the nested selection is 10/00 (plus the owner the touch set adds)");
        assert.equal(await countShiftedByInsert(work, { at: "00", space: "nested", parent: "10" }), 1);
      }),
  },

  // Round-one review close (2026-09-11), the `--under` twin of the shift-set rule: the insert is
  // a WRITE into the stream, so `insert-story --under N` resolves its owner through the one
  // predicate. Over every numbered row an archived milestone resolved, and the story was
  // scaffolded into `archive/` beside its archived siblings — outside the live shift set, so on
  // top of one of them. The refusal names the archive rather than "not found".
  {
    name: "work/backlog-archive-enumerate: 04 insert-story --under an archived milestone is refused, and nothing lands under archive/",
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        const workspace = await loadWorkspace(root);
        await assert.rejects(
          invoke("work:insert-story", { slug: "probe", at: 0, under: 5, yes: true }, { workspace }),
          (error) => error.code === "insert-parent-archived" && /milestone 05 is archived/.test(error.message),
          "the owner lookup passes through isLiveStreamRow, and the refusal names the archive",
        );
        const archivedStories = await readdir(path.join(work, "archive", "05_milestone_zeta", "stories"));
        assert.deepEqual(archivedStories.sort(), ["00_story_zeta-one"], "the archived milestone's stories are untouched");
        assert.equal((await readFile(path.join(work, "archive", "05_milestone_zeta", "stories", "00_story_zeta-one", "STORY.md"), "utf8")).includes("status: done"), true, "…and the archived record doc is not overwritten");
        // A number no root holds is still "not found" — the two refusals are distinct. (The live
        // owner's placement is the insert-story suites' own case; the fixture carries no scaffold
        // templates, so it is not re-driven here.)
        await assert.rejects(
          invoke("work:insert-story", { slug: "probe", at: 0, under: 7, yes: true }, { workspace }),
          (error) => error.code === "insert-parent-not-found",
        );
      }),
  },

  // Scenario Outline: the shift set at every position
  ...[
    { space: "top-level", parent: null, at: "10", set: ["10", "11"] },
    { space: "top-level", parent: null, at: "11", set: ["11"] },
    { space: "top-level", parent: null, at: "12", set: [] },
    { space: "top-level", parent: null, at: "05", set: ["10", "11"] },
    { space: "top-level", parent: null, at: "00", set: ["10", "11"] },
    { space: "top-level", parent: null, at: "20", set: [] },
    { space: "nested", parent: "10", at: "00", set: ["10/00"] },
    { space: "nested", parent: "10", at: "01", set: [] },
    { space: "nested", parent: "05", at: "00", set: [] },
  ].map((row) => ({
    name: `work/backlog-archive-enumerate: 04 outline selectAffected(space ${row.space}, parent ${row.parent ?? "none"}, at ${row.at}) → ${row.set.join(", ") || "nothing"}`,
    run: () =>
      withThreeRoots({}, async ({ work }) => {
        await writeItem(work, "archive/20_chore_omega", { type: "chore", number: "20", slug: "omega", status: "done" });
        const options = { at: row.at, space: row.space, ...(row.parent ? { parent: row.parent } : {}) };
        assert.equal(await countShiftedByInsert(work, options), row.set.length, "the count is the selection's size");
        const touched = await refsTouchedByInsert(work, options);
        const shifted = row.space === "nested" ? touched.filter((ref) => ref !== row.parent) : touched;
        assert.deepEqual(shifted, row.set);
      }),
  })),

  // Scenario: the readers that sort or index by number ignore what has no number
  {
    name: "work/backlog-archive-enumerate: 04 the readers that sort or index by number ignore what has no number, and buildRecords over a backlog slug keys nothing at NaN",
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        await writeFile(
          path.join(work, "backlog", "ideas", "milestone_delta", "ARCHITECTURE.md"),
          "---\ndoc: architecture\n---\n# delta — Architecture Decisions\n\n## ADR-001: A backlog decision\n\n**Status:** Accepted\n**Date:** 2026-09-11\n\n**Context.** some context.\n\n**Decision.** the backlog decision gist.\n",
          "utf8",
        );
        const stream = await listStream(work, { all: true });
        assert.ok(stream.findIndex((row) => row.ref === "delta") > stream.findIndex((row) => row.ref === "11"), "no backlog row is placed among the numbered rows");
        assert.deepEqual(refsOf(await findWork(work, "10/00-00")), ["10/00"]);
        assert.equal((await nextWork(work)).state, "ready");
        assert.deepEqual(await validateWork(work, {}), []);
        const snapshot = await buildSnapshot(work, { projectRoot: root });
        assert.ok(!resolvedDependsEdges(snapshot.items).some((edge) => Number.isNaN(Number.parseInt(edge.to.number, 10))), "no depends edge keys at NaN");
        assert.doesNotThrow(() => statusCoherenceGroup(snapshot));
        const scoped = await buildRecords("delta", { workDir: work, projectRoot: root, configMemory: {} });
        assert.deepEqual(scoped, [], "a slug-scoped rebuild indexes nothing numbered and throws nothing");
        const unscoped = await buildRecords(null, { workDir: work, projectRoot: root, configMemory: {} });
        assert.ok(unscoped.some((record) => record.item === "delta"), `the unscoped rebuild indexes delta's own docs under item "delta" (got ${unscoped.map((record) => record.item).join(", ")})`);
        assert.ok(!unscoped.some((record) => /NaN/.test(String(record.item))), "nothing is keyed at NaN");
      }),
  },

  // ============================================================================
  // 01_item-re-has-one-home.feature — the behavioural legs (the sweeps are FF-12701's)
  // ============================================================================

  // Scenario: migrate-folder mints its append number through the one mint
  {
    name: "work/backlog-archive-enumerate: 01 migrate-folder mints through appendPosition — the migrated milestone lands at 12, never on the archived 05 or 06",
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        const src = await mkdtemp(path.join(os.tmpdir(), "aof-127-migrate-src-"));
        try {
          const sourceMilestone = path.join(src, "wiki", "work", "03_milestone_calls");
          await mkdir(sourceMilestone, { recursive: true });
          await writeFile(path.join(sourceMilestone, "SPEC.md"), "# 03 · Calls — Spec\n\n## Objective\n\nBuild the calls subsystem.\n\n## Scope\n\nIn scope: signaling.\n", "utf8");
          const workspace = await loadWorkspace(root);
          const result = await migrateFolderCommand.run({ folder: src, migratedAt: "2026-09-11" }, { workspace, globalWorkStoreOptions: {} });
          assert.equal(result.milestoneRef, "12", "after 11_chore_beta, never on the archived 05 or 06");
          assert.ok(existsSync(path.join(work, "12_milestone_calls")), "the folder lands at the root");
          const source = await readFile(path.join(repoRoot, "src", "commands", "migrate-folder.mjs"), "utf8");
          assert.ok(!/function nextFreeSlot/.test(source), "nextFreeSlot is gone");
          assert.match(source, /import \{ appendPosition \} from "\.\.\/work-promote\/promotion\.mjs"/);
        } finally {
          await rm(src, { recursive: true, force: true });
        }
      }),
  },

  // Scenario: provenance resolves a managed entry under the root and under the archive
  {
    name: "work/backlog-archive-enumerate: 01 provenance resolves m05/ADR-001 against an ARCHITECTURE.md under archive/05_milestone_zeta",
    run: () =>
      withThreeRoots({}, async ({ root, work }) => {
        await writeFile(path.join(work, "archive", "05_milestone_zeta", "ARCHITECTURE.md"), "## ADR-001: an archived decision\n", "utf8");
        const answer = resolveCitationAtEmit("m05/ADR-001", { rootDir: root });
        assert.equal(answer.ok, true, JSON.stringify(answer));
        const source = await readFile(path.join(repoRoot, "src", "work-tune", "provenance.mjs"), "utf8");
        assert.match(source, /import \{ ITEM_RE \} from "\.\.\/work\.mjs"/);
        assert.match(source, /import \{ ARCHIVE_ROOT \} from "\.\.\/work\.mjs"/);
        assert.ok(!/"archive"|"backlog"/.test(source), "spells neither root name itself");
      }),
  },

  // Scenario: observe enumerates through the enumerator
  {
    name: "work/backlog-archive-enumerate: 01 observe resolves an archived ref through the enumerator — resolveMilestoneFolder(05) answers archive/05_milestone_zeta",
    run: () =>
      withThreeRoots({}, async ({ root }) => {
        assert.deepEqual(await resolveMilestoneFolder({ cwd: root, ref: "05" }), { folder: "archive/05_milestone_zeta", id: "5", story: null, kind: "milestone" });
        assert.equal((await resolveMilestoneFolder({ cwd: root, ref: "5/0" })).folder, "archive/05_milestone_zeta/stories/00_story_zeta-one");
        assert.equal((await resolveMilestoneFolder({ cwd: root, ref: "10" })).folder, "10_milestone_alpha");
        assert.equal((await resolveMilestoneFolder({ cwd: root, ref: "milestone_delta" })).folder, "backlog/ideas/milestone_delta");
      }),
  },
];
