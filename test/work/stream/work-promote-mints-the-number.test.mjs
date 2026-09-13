// Traceability wiring for milestone 127 / story 02 — "Promote mints the number".
//
// Every @executable scenario (and every Scenario Outline Examples row) of tasks 00, 01 and 02 is
// asserted here against the REAL registered command `work:promote`
// (src/commands/promote.mjs), invoked in-process through the command core
// (src/command-core.mjs) and read back black-box through findWork / listItems / listStream /
// nextWork / validateWork, plus the real CLI as a child process for the face's own envelope. Task
// 04's ONE promote-side scenario — the not-found text that explains a stream-intake project —
// lives here too, because it is a refusal of this verb and the only `intake` read in the verb.
//
// THE FIXTURE IS 127/01'S THREE-ROOT FIXTURE (`buildThreeRootFixture` / `withThreeRoots`, exported
// by work-backlog-archive-enumerate.test.mjs), named once by task 00 for the whole story:
//
//   live     10_milestone_alpha (+ stories/00_story_alpha-one), 11_chore_beta (depends: [05])
//   backlog  chore_gamma (group ""), ideas/milestone_delta, ideas/later/spike_epsilon
//   archive  05_milestone_zeta (+ story), 06_chore_eta
//
// `appendPosition` over it is 12. The Examples rows that need a DIFFERENT stream (the pad widths,
// the gap, the archive-only stream, the archived-collision matrix) use `withStream` below, which
// plants rows from their folder paths so a row's identity is the grammar's, never a second spelling.
//
// Task 03's scenarios (the `insert-*` aliases) are wired as `workInsertAliasTests`, the SECOND
// binding work-insert-top-level-places.test.mjs exports — beside the delivered insert assertions
// they must keep green, and spread by test/work/stream/index.mjs. The textual halves of the story's
// contracts (FF-12703 / FF-12704) live in test/arch/work.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { invoke } from "../../../src/command-core.mjs";
import { listItems, listStream, findWork, nextWork, validateWork, loadWorkspace } from "../../../src/work.mjs";
import { appendPosition } from "../../../src/work-promote/promotion.mjs";
import { openEffectsJournal, readEvents } from "../../../src/effects/journal.mjs";
import { ITEM_LOCKED_CODE } from "../../../src/item-lock.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { withItemLockFixture, seedActive } from "../../support/item-lock-fixture.mjs";
import { buildThreeRootFixture } from "./work-backlog-archive-enumerate.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

const RECORD_DOC = { milestone: "SPEC.md", story: "STORY.md", uat: "SESSION.md", spike: "SPIKE.md", chore: "CHORE.md" };
const ITEM_RE = /^(\d+)_(milestone|story|task|uat|spike|chore)_([a-z0-9-]+)$/;
const BACKLOG_RE = /^(milestone|story|chore|spike|uat)_([a-z0-9-]+)$/;

const slash = (value) => String(value).replaceAll("\\", "/");
const rel = (work, dir) => slash(path.relative(work, dir));
const refsOf = (rows) => rows.map((row) => row.ref);

function frontmatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

// ── `withStream`: a work directory planted from FOLDER PATHS ──────────────────────────────────
//
// Each entry is the path a row would have on disk, so its identity is read out of the grammar
// exactly as `listItems` reads it: `100_milestone_wide` is a live driver, `archive/007_uat_old` an
// archived one, `backlog/ideas/milestone_x` a backlog leaf, and
// `02_milestone_alpha/stories/07_story_seven` a nested story whose `parent:` is its ancestor's
// number. A second spelling of "what type is this row" is how a fixture and the enumerator come to
// disagree, which is the whole reason the Examples rows are written as paths in the feature too.
async function plantRow(work, relPath, extra = {}) {
  const parts = relPath.split("/");
  const leaf = parts[parts.length - 1];
  const numbered = leaf.match(ITEM_RE);
  const backlog = leaf.match(BACKLOG_RE);
  assert.ok(numbered || backlog, `fixture path "${relPath}" is not a work-item folder name`);
  const type = numbered ? numbered[2] : backlog[1];
  const slug = numbered ? numbered[3] : backlog[2];
  const number = numbered ? numbered[1] : undefined;
  const owner = parts.includes("stories") ? parts[parts.indexOf("stories") - 1]?.match(ITEM_RE)?.[1] : undefined;
  const dir = path.join(work, ...parts);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, RECORD_DOC[type]),
    frontmatter({
      type,
      number,
      slug,
      status: extra.status ?? "not-started",
      title: `"${extra.title ?? slug}"`,
      parent: owner,
      depends: extra.depends,
      created: "2026-09-12",
      updated: "2026-09-12",
      schema: 1,
    }) + (extra.body ?? ""),
    "utf8",
  );
  return dir;
}

async function withStream(paths, body, { config = {} } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-127-promote-"));
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, ...config }, null, 2)}\n`,
    "utf8",
  );
  const work = path.join(root, "wiki", "work");
  await mkdir(work, { recursive: true });
  for (const entry of paths) {
    if (typeof entry === "string") await plantRow(work, entry);
    else await plantRow(work, entry.path, entry);
  }
  try {
    return await body({ root, work, workspace: await loadWorkspace(root) });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// The three-root fixture with a loaded workspace — the shape every task 00/01/02 case wants.
async function withFixture(body, { config, ...options } = {}) {
  const { root, work } = await buildThreeRootFixture(options);
  if (config) {
    await writeFile(
      path.join(root, ".aof", "aof.config.json"),
      `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work", ...config.work }, ...config.rest }, null, 2)}\n`,
      "utf8",
    );
  }
  try {
    return await body({ root, work, workspace: await loadWorkspace(root) });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const promote = (workspace, input, ctx = {}) => invoke("work:promote", input, { workspace, ...ctx });

// A refusal, as `{ code, message, detail }` — never a thrown assertion, so a case can say which
// code it got when it got the wrong one.
async function refusal(run) {
  try {
    const result = await run();
    return { code: null, result };
  } catch (error) {
    return { code: error.code ?? null, message: String(error.message ?? ""), detail: error.detail ?? null, shifted: error.shifted };
  }
}

// ── document surgery the scenarios ask for ───────────────────────────────────────────────────
const docPathOf = (work, relDir, type) => path.join(work, ...relDir.split("/"), RECORD_DOC[type]);

async function setFrontmatterLine(docPath, key, value) {
  const text = await readFile(docPath, "utf8");
  // An empty value writes the BARE `key:` line the outline's "number: (bare)" row names — a
  // trailing space would be a different line from the one the contract asks about.
  const line = value === "" ? `${key}:` : `${key}: ${value}`;
  const updated = new RegExp(`^${key}:.*$`, "m").test(text)
    ? text.replace(new RegExp(`^${key}:.*$`, "m"), line)
    : text.replace(/^(---\n)/, `$1${line}\n`);
  await writeFile(docPath, updated, "utf8");
  return updated;
}

async function replaceFrontmatter(docPath, lines) {
  const text = await readFile(docPath, "utf8");
  const body = text.replace(/^---\n[\s\S]*?\n---\n?/, "");
  await writeFile(docPath, `---\n${lines.join("\n")}\n---\n${body}`, "utf8");
}

async function setBody(docPath, body) {
  const text = await readFile(docPath, "utf8");
  const block = text.match(/^---\n[\s\S]*?\n---\n/);
  await writeFile(docPath, `${block[0]}${body}`, "utf8");
}

// Every file in a tree as `relative path -> bytes` — the byte-identity channel the "leaves the
// folder's other files exactly where they were" and "nothing on disk changed" scenarios read.
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

function runCli(root, args) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export const workPromoteMintsTheNumberTests = [
  // ============================================================================
  // 00_promote-mints-the-number.feature
  // ============================================================================

  // Scenario: promoting a backlog item appends it to the stream with the next number
  {
    name: "work/promote-mints-the-number: 00 promoting a backlog item appends it to the stream with the next number",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const leafDir = path.join(work, "backlog", "ideas", "milestone_delta");
        const specPath = path.join(leafDir, "SPEC.md");
        await setBody(specPath, "# Delta\n\n## Objective\n\nthe delta theme\n");
        const before = await readFile(specPath, "utf8");

        const envelope = await promote(workspace, { slug: "delta" });

        assert.ok(!existsSync(leafDir), "the backlog leaf no longer exists at its old path");
        const destination = path.join(work, "12_milestone_delta");
        assert.ok(existsSync(destination), "12_milestone_delta exists at the stream root");
        assert.deepEqual(envelope, {
          shifted: 0,
          at: 12,
          space: "top-level",
          created: { ref: "12", type: "milestone", slug: "delta", parent: null, dir: destination },
          from: { ref: "delta", backlog: "ideas", dir: leafDir },
        }, `the envelope is the contract's, exactly: ${JSON.stringify(envelope)}`);
        assert.ok(!("depends" in envelope.created), "created carries no depends key — the fixture's SPEC.md carries no depends: line");

        const after = await readFile(path.join(destination, "SPEC.md"), "utf8");
        const numberLines = after.split("\n").filter((line) => /^number:/.test(line));
        assert.deepEqual(numberLines, ["number: 12"], `exactly one number: 12 line (got ${JSON.stringify(numberLines)})`);
        const lines = after.split("\n");
        assert.equal(lines[lines.indexOf("number: 12") - 1], "type: milestone", "…directly after the type: line");

        // Byte-identity, stated as the two edits and nothing else: the inserted line, and the heading.
        assert.equal(
          after,
          before.replace("type: milestone\n", "type: milestone\nnumber: 12\n").replace("# Delta\n", "# 12 · Delta\n"),
          "every other frontmatter line and the whole body are byte-identical",
        );
        assert.ok(after.includes("updated: 2026-09-11"), "updated: is NOT bumped — promotion is placement, not authorship");

        assert.ok(existsSync(path.join(work, "backlog", "ideas")), "the group directory backlog/ideas still exists");
        assert.ok(existsSync(path.join(work, "backlog", "ideas", "later", "spike_epsilon")), "…still holding later/spike_epsilon");
      }),
  },

  // Scenario: the four readers agree on the promoted item
  {
    name: "work/promote-mints-the-number: 00 the four readers agree on the promoted item",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const beforeFindings = await validateWork(work, workspace.config);
        // `nextWork` with a FREE-TEXT scope falls through to the whole stream by design (`inRange` in
        // src/work.mjs — story 86 / TECH_DEBT 49 refuses only story-grained shapes), so it answers
        // `ready` for `10/00` here. The claim the contract makes is "a backlog row is never proposed":
        // the backlog row is NOWHERE in the answer — not the head, not a ready-set member.
        const beforeNext = await nextWork(work, "delta");
        assert.notEqual(beforeNext.ref, "delta", "before the promotion, a backlog row is never the head of next's answer");
        const beforeReady = beforeNext.readySet ?? [];
        assert.deepEqual(beforeReady.filter((member) => member.ref === "delta" || member.slug === "delta"), [], "…nor a member of its ready set");
        assert.deepEqual(beforeReady.filter((member) => String(member.path ?? "").includes("backlog")), [], "…and no ready-set member lives under backlog/");

        await promote(workspace, { slug: "delta" });

        const frozen = { ref: "12", type: "milestone", slug: "delta", status: "not-started", parent: null };
        for (const query of ["12", "delta"]) {
          const rows = await findWork(work, query);
          assert.equal(rows.length, 1, `find ${query} answers exactly one row`);
          const { dir, title, ...rest } = rows[0];
          assert.deepEqual(rest, frozen, `find ${query} answers the frozen live-row shape: ${JSON.stringify(rows[0])}`);
          assert.ok(!("number" in rows[0]) && !("backlog" in rows[0]), `find ${query} carries neither a number nor a backlog key`);
        }

        const findings = await validateWork(work, workspace.config);
        assert.deepEqual(findings.filter((finding) => finding.path.includes("12_milestone_delta")), [], "zero findings for 12_milestone_delta");
        assert.deepEqual(findings, beforeFindings, "…and zero findings anywhere it did not report before the promotion");

        const next = await nextWork(work, "12");
        assert.equal(next.state, "ready", `next 12 answers ready — a live zero-story milestone is offered for break-down (got ${JSON.stringify(next)})`);
        assert.equal(next.ref, "12");

        const listed = refsOf(await listStream(work));
        assert.equal(listed.indexOf("12"), listed.indexOf("11") + 1, "list shows 12 after 11");
        assert.ok(listed.indexOf("12") < listed.indexOf("gamma"), "…and before every remaining backlog row");
        assert.ok(listed.indexOf("12") < listed.indexOf("epsilon"));
      }),
  },

  // Scenario: the mint reads live and archived rows, never the backlog
  {
    name: "work/promote-mints-the-number: 00 the mint reads live and archived rows, never the backlog",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        assert.equal(await appendPosition(work), 12, "appendPosition answers 12 — one past the highest over 10, 11, 05 and 06");
        const items = await listItems(work);
        assert.equal(items.filter((item) => item.number == null).length, 3, "the three backlog rows move neither the highest nor the count");

        await rename(path.join(work, "11_chore_beta"), path.join(work, "archive", "11_chore_beta"));
        const envelope = await promote(workspace, { slug: "gamma" });
        assert.equal(envelope.created.ref, "12", "gamma is minted 12, not 11 — an archived number is never re-minted");
      }),
  },

  // Scenario Outline: the mint is the highest number ever minted plus one, at the stream's own width
  ...[
    { rows: [], folder: "00_chore_narrow", number: "00", why: "an empty stream mints the first number at the default width" },
    { rows: ["backlog/ideas/milestone_x", "backlog/spike_y"], folder: "00_chore_narrow", number: "00", why: "backlog rows hold no number" },
    { rows: ["100_milestone_wide"], folder: "101_chore_narrow", number: "101", why: "the stream's own width: three digits" },
    { rows: ["09_milestone_last"], folder: "10_chore_narrow", number: "10", why: "the width is two and the number grows past it unpadded" },
    { rows: ["03_milestone_gap", "07_milestone_last"], folder: "08_chore_narrow", number: "08", why: "the highest plus one, never the count" },
    { rows: ["archive/05_milestone_zeta"], folder: "06_chore_narrow", number: "06", why: "an archive-only stream: the archived highest and width govern" },
    { rows: ["archive/007_uat_old"], folder: "008_chore_narrow", number: "008", why: "the first numbered row is archived and three wide" },
    { rows: ["005_milestone_a", "10_chore_b"], folder: "011_chore_narrow", number: "011", why: "the first numbered top-level row by number (005) sets the width" },
    { rows: ["02_milestone_alpha", "02_milestone_alpha/stories/07_story_seven"], folder: "03_chore_narrow", number: "03", why: "a nested story is not a top-level row" },
  ].map(({ rows, folder, number, why }) => ({
    name: `work/promote-mints-the-number: 00 the mint is the highest number ever minted plus one, at the stream's own width — ${folder} (${why})`,
    run: () =>
      withStream([...rows, "backlog/chore_narrow"], async ({ work, workspace }) => {
        const envelope = await promote(workspace, { slug: "narrow" });
        assert.ok(existsSync(path.join(work, folder)), `${folder} exists at the root (got ${JSON.stringify(await readdir(work))})`);
        const doc = await readFile(path.join(work, folder, "CHORE.md"), "utf8");
        assert.match(doc, new RegExp(`^number: ${number}$`, "m"), `its record doc carries number: ${number}`);
        assert.equal(envelope.created.ref, number, `created.ref is "${number}"`);
        assert.equal(envelope.at, Number.parseInt(number, 10), "at is the same number as an integer");
        assert.equal(envelope.shifted, 0);
      }),
  })),

  // Scenario: the stamp replaces a bare number line when the doc carries one
  {
    name: "work/promote-mints-the-number: 00 the stamp replaces a bare number line when the doc carries one",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const chorePath = docPathOf(work, "backlog/chore_gamma", "chore");
        await replaceFrontmatter(chorePath, [
          "type: chore",
          "number:",
          "slug: gamma",
          "status: not-started",
          'title: "Gamma"',
          "created: 2026-09-11",
          "updated: 2026-09-11",
          "schema: 1",
        ]);

        await promote(workspace, { slug: "gamma" });

        const after = (await readFile(path.join(work, "12_chore_gamma", "CHORE.md"), "utf8")).split("\n");
        assert.equal(after[2], "number: 12", `the bare line now reads number: 12 in the same position (got ${JSON.stringify(after.slice(0, 5))})`);
        assert.equal(after.filter((line) => /^number:/.test(line)).length, 1, "no second number: line was inserted");
      }),
  },

  // Scenario Outline: the stamp is one line — replaced where a number line exists, inserted after
  // type: where none does
  ...[
    {
      label: 'a quoted empty value is still the one number line, replaced whole',
      block: ["type: chore", 'number: ""', "slug: gamma", "status: not-started", 'title: "Gamma"', "created: 2026-09-11", "updated: 2026-09-11", "schema: 1"],
      expect: { line: 2, reads: "number: 12" },
    },
    {
      label: "a literal null is a number line like any other",
      block: ["type: chore", "number: null", "slug: gamma", "status: not-started", 'title: "Gamma"', "created: 2026-09-11", "updated: 2026-09-11", "schema: 1"],
      expect: { line: 2, reads: "number: 12" },
    },
    {
      label: "a stale value is replaced, never read — the row was a backlog row",
      block: ["type: chore", "number: 07", "slug: gamma", "status: not-started", 'title: "Gamma"', "created: 2026-09-11", "updated: 2026-09-11", "schema: 1"],
      expect: { line: 2, reads: "number: 12" },
    },
    {
      label: "after type: wherever it sits, not at line 2",
      block: ["slug: gamma", "status: not-started", "type: chore", 'title: "Gamma"', "created: 2026-09-11", "updated: 2026-09-11", "schema: 1"],
      expect: { line: 4, reads: "number: 12" },
    },
    {
      label: "number: is matched as a whole key — numbers: [1] is untouched",
      block: ["type: chore", "numbers: [1]", "slug: gamma", "status: not-started", 'title: "Gamma"', "created: 2026-09-11", "updated: 2026-09-11", "schema: 1"],
      expect: { line: 2, reads: "number: 12", keeps: "numbers: [1]" },
    },
    {
      label: "no insert point — the stamp must not be able to fail after the rename",
      block: ["slug: gamma", "status: not-started", 'title: "Gamma"', "created: 2026-09-11", "updated: 2026-09-11", "schema: 1"],
      expect: { refused: "promote-record-doc-unusable" },
    },
    {
      label: "a fence that is not line 1 is not a block (41/ADR-001)",
      raw: '<!-- aof-generated: bundle -->\n\n---\ntype: chore\nslug: gamma\nstatus: not-started\ntitle: "Gamma"\n---\n',
      expect: { refused: "promote-record-doc-unusable" },
    },
    {
      label: "an unclosed block is not locatable",
      raw: '---\ntype: chore\nslug: gamma\nstatus: not-started\ntitle: "Gamma"\n',
      expect: { refused: "promote-record-doc-unusable" },
    },
    {
      label: "an empty file — the headline's no block, at its smallest",
      raw: "",
      expect: { refused: "promote-record-doc-unusable" },
    },
  ].map(({ label, block, raw, expect }) => ({
    name: `work/promote-mints-the-number: 00 the stamp is one line — ${label}`,
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const leafDir = path.join(work, "backlog", "chore_gamma");
        const chorePath = path.join(leafDir, "CHORE.md");
        if (raw != null) await writeFile(chorePath, raw, "utf8");
        else await replaceFrontmatter(chorePath, block);
        const before = await snapshot(leafDir);

        const outcome = await refusal(() => promote(workspace, { slug: "gamma" }));

        if (expect.refused) {
          assert.equal(outcome.code, expect.refused, `refused ${expect.refused} (got ${outcome.code})`);
          assert.ok(existsSync(leafDir), "the leaf is untouched at its old path");
          assert.deepEqual(sorted(await snapshot(leafDir)), sorted(before), "…byte for byte");
          return;
        }
        assert.equal(outcome.code, null, `it proceeds (refused ${outcome.code}: ${outcome.message})`);
        const after = (await readFile(path.join(work, "12_chore_gamma", "CHORE.md"), "utf8")).split("\n");
        assert.equal(after[expect.line], expect.reads, `line ${expect.line} reads "${expect.reads}" (got ${JSON.stringify(after.slice(0, 6))})`);
        assert.equal(after.filter((line) => /^number:/.test(line)).length, 1, "exactly one number: line");
        if (expect.keeps) assert.ok(after.includes(expect.keeps), `${expect.keeps} is untouched`);
        // Every byte outside that one line is unchanged: drop the stamped line and compare.
        const beforeLines = before.get("CHORE.md").split("\n");
        assert.deepEqual(
          after.filter((line, index) => index !== expect.line),
          expect.line === 2 && /^number:/.test(beforeLines[2] ?? "") ? beforeLines.filter((line, index) => index !== 2) : beforeLines,
          "every byte outside that one line is unchanged",
        );
      }),
  })),

  // Scenario Outline: the heading courtesy is one prefix on the first H1 of the record doc and of
  // STATE.md, and no other file is opened
  ...[
    { label: "already begins with a number — a stale one is the operator's to fix", body: "# 07 · Delta\n", after: "# 07 · Delta\n" },
    { label: 'begins with a number is the whole test; the " · " is not required', body: "# 12 Delta\n", after: "# 12 Delta\n" },
    { label: "the courtesy adds no heading where there is none", body: "just prose, no heading at all\n", after: "just prose, no heading at all\n" },
    { label: "the FIRST first-level heading, wherever it sits", body: "## Context\n\n# Delta\n", after: "## Context\n\n# 12 · Delta\n" },
    { label: "one heading, once", body: "# Delta\n\n# Appendix\n", after: "# 12 · Delta\n\n# Appendix\n" },
    {
      label: "the milestone companion gets the same courtesy",
      body: "# Delta\n",
      after: "# 12 · Delta\n",
      companion: { name: "STATE.md", text: "# Delta — State\n", after: "# 12 · Delta — State\n" },
    },
    {
      label: "the companion follows the same begins-with-a-number test",
      body: "# Delta\n",
      after: "# 12 · Delta\n",
      companion: { name: "STATE.md", text: "# 03 · Delta — State\n", after: "# 03 · Delta — State\n" },
    },
    {
      label: "the same bound on the companion — a STATE.md with no H1",
      body: "# Delta\n",
      after: "# 12 · Delta\n",
      companion: { name: "STATE.md", text: "## Progress\n\nnothing yet\n", after: "## Progress\n\nnothing yet\n" },
    },
    {
      label: "no other file in the folder is opened",
      body: "# Delta\n",
      after: "# 12 · Delta\n",
      companion: { name: "notes.md", text: "# Delta\n", after: "# Delta\n" },
    },
  ].map(({ label, body, after, companion }) => ({
    name: `work/promote-mints-the-number: 00 the heading courtesy is one prefix on the first H1 — ${label}`,
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const leafDir = path.join(work, "backlog", "ideas", "milestone_delta");
        await setBody(path.join(leafDir, "SPEC.md"), body);
        if (companion) await writeFile(path.join(leafDir, companion.name), companion.text, "utf8");

        await promote(workspace, { slug: "delta" });

        const destination = path.join(work, "12_milestone_delta");
        const spec = await readFile(path.join(destination, "SPEC.md"), "utf8");
        assert.equal(spec.slice(spec.indexOf("\n---\n") + 5), after, `the promoted SPEC.md's body is as the row says (got ${JSON.stringify(spec.slice(spec.indexOf("\n---\n") + 5))})`);
        if (companion) {
          assert.equal(await readFile(path.join(destination, companion.name), "utf8"), companion.after, `${companion.name} is as the row says`);
        } else {
          assert.ok(!existsSync(path.join(destination, "STATE.md")), "nothing was created");
        }
      }),
  })),

  // Scenario: a promote leaves the folder's other files exactly where they were
  {
    name: "work/promote-mints-the-number: 00 a promote leaves the folder's other files exactly where they were",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const leafDir = path.join(work, "backlog", "chore_gamma");
        await mkdir(path.join(leafDir, "runs"), { recursive: true });
        const runBody = `${JSON.stringify({ runId: "r-1", itemRef: "gamma" })}\n`;
        await writeFile(path.join(leafDir, "runs", "20260901T000000000Z-0000.json"), runBody, "utf8");
        await writeFile(path.join(leafDir, "notes.md"), "a note that travels\n", "utf8");

        await promote(workspace, { slug: "gamma" });

        const destination = path.join(work, "12_chore_gamma");
        assert.equal(await readFile(path.join(destination, "runs", "20260901T000000000Z-0000.json"), "utf8"), runBody, "the run record travelled byte-identical");
        assert.equal(await readFile(path.join(destination, "notes.md"), "utf8"), "a note that travels\n", "…and so did notes.md");
      }),
  },

  // Scenario: the argument must resolve to exactly one backlog row
  {
    name: "work/promote-mints-the-number: 00 the argument must resolve to exactly one backlog row",
    run: async () => {
      await withFixture(async ({ work, workspace }) => {
        await plantRow(work, "backlog/chore_delta-two");
        await plantRow(work, "13_milestone_delta-lake");
        const envelope = await promote(workspace, { slug: "delta" });
        assert.equal(rel(work, envelope.from.dir), "backlog/ideas/milestone_delta", "the exact slug match wins over the substring matches");
      });
      await withFixture(async ({ work, workspace }) => {
        await plantRow(work, "backlog/chore_delta-two");
        await plantRow(work, "13_milestone_delta-lake");
        const before = await snapshot(work);
        const outcome = await refusal(() => promote(workspace, { slug: "delt" }));
        assert.equal(outcome.code, "promote-ambiguous", `refused promote-ambiguous (got ${outcome.code})`);
        assert.match(outcome.message, /ideas\/milestone_delta/, "the message names ideas/milestone_delta");
        assert.match(outcome.message, /chore_delta-two/, "…and chore_delta-two");
        assert.deepEqual(sorted(await snapshot(work)), sorted(before), "nothing on disk changed");
      });
      await withFixture(async ({ workspace }) => {
        const outcome = await refusal(() => promote(workspace, { slug: "alpha" }));
        assert.equal(outcome.code, "promote-not-found");
        assert.match(outcome.message, /10_milestone_alpha/, "the message names 10_milestone_alpha as already in the stream");
      });
      await withFixture(async ({ workspace }) => {
        const outcome = await refusal(() => promote(workspace, { slug: "nothing-here" }));
        assert.equal(outcome.code, "promote-not-found");
        assert.ok(!/Already in the stream/.test(outcome.message), `the message names no candidate: ${outcome.message}`);
      });
    },
  },

  // Scenario Outline: the resolution matrix — what the argument reaches, and which refusal it earns
  ...[
    { extra: [], argument: "DELTA", promotes: "backlog/ideas/milestone_delta", why: "the match is case-insensitive" },
    { extra: [], argument: "  delta  ", promotes: "backlog/ideas/milestone_delta", why: "the argument is trimmed" },
    { extra: [], argument: "delt", promotes: "backlog/ideas/milestone_delta", why: "one substring match is one row" },
    { extra: [], argument: "eps", promotes: "backlog/ideas/later/spike_epsilon", why: "the group is a path, never part of the match" },
    { extra: [], argument: "milestone_delta", promotes: "backlog/ideas/milestone_delta", why: "the folder name matches too" },
    { extra: [], argument: "milestone", promotes: "backlog/ideas/milestone_delta", why: "one backlog row is enough" },
    { extra: [], argument: "a", refused: "promote-ambiguous", names: ["chore_gamma", "ideas/milestone_delta"], why: "two backlog substring matches, neither exact" },
    { extra: ["backlog/notes/spike_delta"], argument: "delta", refused: "promote-ambiguous", names: ["ideas/milestone_delta", "notes/spike_delta"], why: "two EXACT matches" },
    { extra: ["backlog/chore_delta-two"], argument: "delta-two", promotes: "backlog/chore_delta-two", why: "the needle is the whole argument" },
    { extra: ["backlog/chore_x1"], argument: "x1", promotes: "backlog/chore_x1", why: "a digit inside a slug is not an all-digit argument" },
    { extra: ["13_milestone_delta-lake"], argument: "delta-lake", refused: "promote-not-found", names: ["13_milestone_delta-lake"], why: "a slug only a live item matches" },
    { extra: [], argument: "zeta", refused: "promote-not-found", names: ["archive/05_milestone_zeta"], why: "an archived row is already in the stream too" },
    { extra: [], argument: "alpha-one", refused: "promote-not-found", names: ["alpha-one"], why: "a nested story is a live row, never a backlog leaf" },
    { extra: [], argument: "10/00", refused: "promote-not-found", names: ["10/00"], why: "a story ref reaches the pair branch, which holds no backlog row" },
    { extra: [], argument: "ideas/delta", refused: "promote-not-found", names: [], why: "<group>/<slug> is not a ref" },
    { extra: [], argument: "007", refused: "promote-numeric-ref", why: "leading zeros are still all digits" },
    { extra: [], argument: "0", refused: "promote-numeric-ref", why: "the smallest numbered ref" },
  ].map(({ extra, argument, promotes, refused, names, why }) => ({
    name: `work/promote-mints-the-number: 00 the resolution matrix — "${argument}" ${promotes ? `promotes ${promotes}` : `is refused ${refused}`} (${why})`,
    run: () =>
      withFixture(async ({ work, workspace }) => {
        for (const entry of extra) await plantRow(work, entry);
        const before = await snapshot(work);

        const outcome = await refusal(() => promote(workspace, { slug: argument }));

        if (promotes) {
          assert.equal(outcome.code, null, `it proceeds (refused ${outcome.code}: ${outcome.message})`);
          assert.equal(rel(work, outcome.result.from.dir), promotes, `it promotes ${promotes}`);
          return;
        }
        assert.equal(outcome.code, refused, `refused ${refused} (got ${outcome.code}: ${outcome.message})`);
        for (const named of names ?? []) assert.match(outcome.message, new RegExp(named.replace(/\//g, "\\/")), `the message names ${named}`);
        if ((names ?? []).length === 0 && refused === "promote-not-found") {
          assert.ok(!/Already in the stream/.test(outcome.message), `the message names no candidate: ${outcome.message}`);
        }
        assert.deepEqual(sorted(await snapshot(work)), sorted(before), "a refusal leaves the backlog and the stream byte-identical");
      }),
  })),

  // Scenario: an all-digit argument is refused before the numbered space is consulted
  {
    name: "work/promote-mints-the-number: 00 an all-digit argument is refused before the numbered space is consulted",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        await plantRow(work, "backlog/milestone_12");
        const outcome = await refusal(() => promote(workspace, { slug: "12" }));
        assert.equal(outcome.code, "promote-numeric-ref");
        assert.match(outcome.message, /promoted by its slug/, "the message says a backlog item is promoted by its slug");
        assert.match(outcome.message, /all-digit slug is unreachable/, "…and that an all-digit slug is unreachable");
        assert.match(outcome.message, /rename its folder/, "…— rename its folder");
        assert.ok(!existsSync(path.join(work, "12_milestone_12")), "12_milestone_12 does not exist");
        assert.ok(existsSync(path.join(work, "backlog", "milestone_12", "SPEC.md")), "backlog/milestone_12 is untouched");
      }),
  },

  // Scenario: a promote whose destination already exists is refused before anything moves
  {
    name: "work/promote-mints-the-number: 00 a promote whose destination already exists is refused before anything moves",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        await writeFile(path.join(work, "12_milestone_delta"), "a stray FILE, not a directory\n", "utf8");
        const before = await snapshot(work);
        const outcome = await refusal(() => promote(workspace, { slug: "delta" }));
        assert.equal(outcome.code, "promote-destination-exists", `refused promote-destination-exists (got ${outcome.code}: ${outcome.message})`);
        assert.match(outcome.message, /12_milestone_delta/, "the refusal names the path");
        assert.ok(existsSync(path.join(work, "backlog", "ideas", "milestone_delta", "SPEC.md")), "the backlog leaf is untouched");
        assert.deepEqual(sorted(await snapshot(work)), sorted(before), "…and so is everything else");
      }),
  },

  // Scenario: a record doc without a frontmatter block is refused before the rename
  {
    name: "work/promote-mints-the-number: 00 a record doc without a frontmatter block is refused before the rename",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const leafDir = path.join(work, "backlog", "chore_gamma");
        await writeFile(path.join(leafDir, "CHORE.md"), "# Gamma\n\nno frontmatter block at all\n", "utf8");
        const outcome = await refusal(() => promote(workspace, { slug: "gamma" }));
        assert.equal(outcome.code, "promote-record-doc-unusable", `refused promote-record-doc-unusable (got ${outcome.code})`);
        assert.ok(existsSync(path.join(leafDir, "CHORE.md")), "backlog/chore_gamma is untouched at its old path");
        assert.ok(!existsSync(path.join(work, "12_chore_gamma")), "…and nothing landed in the stream");
      }),
  },

  // Scenario: the CLI face carries the envelope and the refusal alike
  {
    name: "work/promote-mints-the-number: 00 the CLI face carries the envelope and the refusal alike",
    run: async () => {
      await withFixture(async ({ root, work }) => {
        const result = runCli(root, ["work", "promote", "delta", "--json"]);
        assert.equal(result.status, 0, `exits 0 (stderr: ${result.stderr})`);
        const parsed = JSON.parse(result.stdout);
        assert.deepEqual(parsed, {
          shifted: 0,
          at: 12,
          space: "top-level",
          created: { ref: "12", type: "milestone", slug: "delta", parent: null, dir: slash(path.join(work, "12_milestone_delta")) },
          from: { ref: "delta", backlog: "ideas", dir: slash(path.join(work, "backlog", "ideas", "milestone_delta")) },
        }, `stdout is the envelope, dir values forward-slashed: ${result.stdout}`);
      });
      await withFixture(async ({ root, work }) => {
        await plantRow(work, "backlog/chore_delta-two");
        const result = runCli(root, ["work", "promote", "delt", "--json"]);
        assert.equal(result.status, 1, `exits 1 (stdout: ${result.stdout}; stderr: ${result.stderr})`);
        const parsed = JSON.parse(result.stdout);
        assert.equal(parsed.ok, false, "the ONE generic face's refusal shape: ok:false");
        assert.equal(parsed.code, "promote-ambiguous");
        assert.equal(typeof parsed.error, "string");
      });
    },
  },

  // Scenario: appendPosition has one home and four callers
  {
    name: "work/promote-mints-the-number: 00 appendPosition has one home and four callers",
    run: async () => {
      const definitions = [];
      const callers = [];
      for (const file of await readSrcFiles(repoRoot)) {
        const source = (await readFile(file.path, "utf8")).replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
        const relPath = `src/${slash(file.rel)}`;
        if (/export\s+async\s+function\s+appendPosition\s*\(/.test(source)) definitions.push(relPath);
        if (/(?<!function\s)\bappendPosition\s*\(/.test(source.replace(/export\s+async\s+function\s+appendPosition\s*\([^)]*\)/, ""))) callers.push(relPath);
      }
      assert.deepEqual(definitions, ["src/work-promote/promotion.mjs"], "appendPosition is defined once, in src/work-promote/promotion.mjs");
      assert.deepEqual(callers.sort(), [
        "src/commands/migrate-folder.mjs",
        "src/commands/promote-finding-to-chore.mjs",
        "src/commands/promote-gap-to-chore.mjs",
        "src/commands/promote.mjs",
      ], `its callers are exactly the promote family plus migrate-folder (got ${JSON.stringify(callers)})`);
    },
  },

  // ============================================================================
  // 01_at-opens-the-slot-through-the-engine.feature
  // ============================================================================

  // Scenario: --at P shifts every live item at or above P and lands the folder in the slot
  {
    name: "work/promote-mints-the-number: 01 --at P shifts every live item at or above P and lands the folder in the slot",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const beforeFindings = await validateWork(work, workspace.config);

        const envelope = await promote(workspace, { slug: "delta", at: 10 });

        assert.ok(existsSync(path.join(work, "10_milestone_delta")), "10_milestone_delta exists at the root");
        assert.ok(existsSync(path.join(work, "11_milestone_alpha")), "10_milestone_alpha is now 11_milestone_alpha");
        assert.ok(existsSync(path.join(work, "11_milestone_alpha", "stories", "00_story_alpha-one")), "…its story is still stories/00_story_alpha-one");
        assert.ok(existsSync(path.join(work, "12_chore_beta")), "11_chore_beta is now 12_chore_beta");
        assert.equal(envelope.shifted, 2);
        assert.equal(envelope.at, 10);
        assert.equal(envelope.space, "top-level");
        assert.equal(envelope.created.ref, "10");

        assert.deepEqual(await validateWork(work, workspace.config), beforeFindings, "validate reports no findings it did not report before");

        const alpha = await findWork(work, "11");
        assert.ok(alpha.some((row) => row.slug === "alpha"), "find 11 answers alpha");
        const alphaOne = await findWork(work, "11/00");
        assert.ok(alphaOne.some((row) => row.slug === "alpha-one"), "find 11/00 answers alpha-one — the cascade the remap carried");
        const storyDoc = await readFile(path.join(work, "11_milestone_alpha", "stories", "00_story_alpha-one", "STORY.md"), "utf8");
        assert.match(storyDoc, /^parent: 11$/m, "…and its parent: is rewritten to 11");
      }),
  },

  // Scenario: the shift raises the one existing event with its remap
  {
    name: "work/promote-mints-the-number: 01 the shift raises the one existing event with its remap",
    run: () =>
      withFixture(async ({ workspace }) => {
        const globalHome = await mkdtemp(path.join(os.tmpdir(), "aof-127-promote-gh-"));
        const journalOptions = { env: { ...process.env, AOF_GLOBAL_HOME: globalHome } };
        try {
          await promote(workspace, { slug: "delta", at: 10 }, { effectsJournalOptions: journalOptions });
          const journal = await openEffectsJournal(journalOptions);
          try {
            const all = readEvents(journal, { limit: 100 });
            const reindexed = all.filter((event) => event.name === "stream.reindexed");
            assert.equal(reindexed.length, 1, `exactly one stream.reindexed event was appended (got ${JSON.stringify(all.map((event) => event.name))})`);
            assert.deepEqual(reindexed[0].payload.remap, [
              { from: "11", to: "12" },
              { from: "10", to: "11" },
              { from: "10/00", to: "11/00" },
            ], "…carrying the remap in the engine's descending order");
            assert.equal(reindexed[0].payload.at, 10);
            assert.equal(reindexed[0].payload.space, "top-level");
            assert.equal(reindexed[0].payload.shifted, 2);
            assert.deepEqual(all.map((event) => event.name), ["stream.reindexed"], "no event of any other name was appended for the promotion itself");
          } finally {
            journal.close();
          }
        } finally {
          await rm(globalHome, { recursive: true, force: true });
        }
      }),
  },

  // Scenario: an append raises no event
  {
    name: "work/promote-mints-the-number: 01 an append raises no event",
    run: () =>
      withFixture(async ({ workspace }) => {
        const globalHome = await mkdtemp(path.join(os.tmpdir(), "aof-127-promote-gh-"));
        const journalOptions = { env: { ...process.env, AOF_GLOBAL_HOME: globalHome } };
        try {
          const envelope = await promote(workspace, { slug: "delta" }, { effectsJournalOptions: journalOptions });
          assert.equal(envelope.shifted, 0);
          const journal = await openEffectsJournal(journalOptions);
          try {
            assert.deepEqual(readEvents(journal, { name: "stream.reindexed" }), [], "no stream.reindexed event was appended");
          } finally {
            journal.close();
          }
        } finally {
          await rm(globalHome, { recursive: true, force: true });
        }
      }),
  },

  // Scenario: --at beyond the tail shifts nothing and is not an error
  {
    name: "work/promote-mints-the-number: 01 --at beyond the tail shifts nothing and is not an error",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const envelope = await promote(workspace, { slug: "delta", at: 20 });
        assert.ok(existsSync(path.join(work, "20_milestone_delta")), "20_milestone_delta exists");
        assert.equal(envelope.shifted, 0);
        assert.ok(existsSync(path.join(work, "10_milestone_alpha")), "10 is untouched");
        assert.ok(existsSync(path.join(work, "11_chore_beta")), "…and so is 11");
      }),
  },

  // Scenario: the confirm gate is the insert gate
  {
    name: "work/promote-mints-the-number: 01 the confirm gate is the insert gate",
    run: async () => {
      const threshold = { work: { insert: { confirmThreshold: 2 } } };
      await withFixture(async ({ work, workspace }) => {
        const before = await snapshot(work);
        const outcome = await refusal(() => promote(workspace, { slug: "delta", at: 10 }));
        assert.equal(outcome.code, "insert-confirm-required", `refused insert-confirm-required (got ${outcome.code})`);
        assert.match(outcome.message, /2/, `the message names 2: ${outcome.message}`);
        assert.equal(outcome.shifted, 2, "error.shifted = 2");
        assert.deepEqual(outcome.detail, { shifted: 2 }, "error.detail.shifted = 2");
        assert.deepEqual(sorted(await snapshot(work)), sorted(before), "nothing on disk changed — 10, 11 and the backlog leaf are all at their old paths");
      }, { config: { rest: threshold } });
      await withFixture(async ({ work, workspace }) => {
        const envelope = await promote(workspace, { slug: "delta", at: 10, yes: true });
        assert.equal(envelope.shifted, 2);
        assert.ok(existsSync(path.join(work, "10_milestone_delta")) && existsSync(path.join(work, "11_milestone_alpha")) && existsSync(path.join(work, "12_chore_beta")), "it proceeds exactly as the headline");
      }, { config: { rest: threshold } });
      await withFixture(async ({ root, work }) => {
        const result = runCli(root, ["work", "promote", "gamma", "--at", "10", "--force", "--json"]);
        assert.equal(result.status, 0, `--force is the alias of --yes here as everywhere (stdout: ${result.stdout}; stderr: ${result.stderr})`);
        assert.equal(JSON.parse(result.stdout).shifted, 2, "shifting 2 at the threshold of 2");
        assert.ok(existsSync(path.join(work, "10_chore_gamma")));
      }, { config: { rest: threshold } });
    },
  },

  // Scenario: a below-threshold shift needs no confirmation
  {
    name: "work/promote-mints-the-number: 01 a below-threshold shift needs no confirmation",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const envelope = await promote(workspace, { slug: "delta", at: 11 });
        assert.equal(envelope.shifted, 1, "shifted is 1 (beta 11 -> 12)");
        assert.ok(existsSync(path.join(work, "10_milestone_alpha")), "alpha is untouched");
        assert.ok(existsSync(path.join(work, "12_chore_beta")));
      }),
  },

  // Scenario Outline: the gate fires at the threshold and never before, and the archived check comes first
  ...[
    { extra: [], threshold: 1, flags: { at: 11 }, refused: "insert-confirm-required", shifted: 1, why: "at the threshold refuses — the comparison is at-or-above" },
    { extra: [], threshold: 1, flags: { at: 12 }, shifted: 0, why: "one below" },
    { extra: [], threshold: 1, flags: {}, shifted: 0, why: "an append never meets the gate" },
    { extra: [], threshold: 2, flags: { at: 11 }, shifted: 1, why: "one below" },
    { extra: [], threshold: 2, flags: { at: 10, force: true }, shifted: 2, why: "--force passes a shift AT the threshold" },
    { extra: [], threshold: 5, flags: { at: 10 }, shifted: 2, why: "the default threshold: two is below five" },
    { extra: ["12_milestone_l12", "13_milestone_l13", "14_milestone_l14"], threshold: null, flags: { at: 10 }, refused: "insert-confirm-required", shifted: 5, why: "the default is 5, and five live rows at or above 10 meet it" },
    { extra: ["12_milestone_l12", "13_milestone_l13", "14_milestone_l14"], threshold: null, flags: { at: 11 }, shifted: 4, why: "one below the default" },
    { extra: ["12_milestone_l12", "13_milestone_l13", "14_milestone_l14"], threshold: null, flags: { at: 10, yes: true }, shifted: 5, why: "the bypass" },
    { extra: [], threshold: 1, flags: { at: 5 }, refused: "promote-number-archived", why: "the archived check precedes the gate" },
    { extra: [], threshold: 1, flags: { at: 5, yes: true }, refused: "promote-number-archived", why: "--yes passes the gate, never the archive" },
    { extra: [], threshold: 0, flags: { at: 20 }, refused: "insert-confirm-required", shifted: 0, why: "the delivered gate at 0 refuses every slot-open without --yes" },
    { extra: [], threshold: 0, flags: {}, shifted: 0, why: "an append takes no count, so a threshold of 0 cannot touch it" },
  ].map(({ extra, threshold, flags, refused, shifted, why }) => ({
    name: `work/promote-mints-the-number: 01 the gate fires at the threshold and never before — threshold ${threshold ?? "absent"} ${JSON.stringify(flags)} (${why})`,
    run: () =>
      withFixture(async ({ work, workspace }) => {
        for (const entry of extra) await plantRow(work, entry);
        const input = { slug: "delta", ...(flags.at == null ? {} : { at: flags.at }), yes: Boolean(flags.yes || flags.force) };
        const outcome = await refusal(() => promote(workspace, input));
        if (refused) {
          assert.equal(outcome.code, refused, `refused ${refused} (got ${outcome.code}: ${outcome.message})`);
          if (shifted != null) assert.equal(outcome.shifted, shifted, `error.shifted = ${shifted}`);
          if (refused === "insert-confirm-required" && shifted === 5) assert.match(outcome.message, /5/, "naming 5");
          return;
        }
        assert.equal(outcome.code, null, `it proceeds (refused ${outcome.code}: ${outcome.message})`);
        assert.equal(outcome.result.shifted, shifted, `shifted: ${shifted}`);
      }, { config: threshold == null ? undefined : { rest: { work: { insert: { confirmThreshold: threshold } } } } }),
  })),

  // Scenario: landing on an archived number is refused before anything moves
  {
    name: "work/promote-mints-the-number: 01 landing on an archived number is refused before anything moves",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const before = await snapshot(work);
        const outcome = await refusal(() => promote(workspace, { slug: "delta", at: 5 }));
        assert.equal(outcome.code, "promote-number-archived", `refused promote-number-archived (got ${outcome.code})`);
        assert.match(outcome.message, /05/, "the message names 05");
        assert.match(outcome.message, /archive\/05_milestone_zeta/, "…and archive/05_milestone_zeta");
        assert.deepEqual(outcome.detail, { collisions: [{ number: "05", folder: "archive/05_milestone_zeta" }] }, "detail.collisions names it");
        assert.deepEqual(sorted(await snapshot(work)), sorted(before), "the backlog leaf, the stream and the archive are byte-identical to before");
      }),
  },

  // Scenario: shifting a live item onto an archived number is refused too
  {
    name: "work/promote-mints-the-number: 01 shifting a live item onto an archived number is refused too",
    run: async () => {
      await withFixture(async ({ work, workspace }) => {
        await plantRow(work, "04_chore_theta");
        const outcome = await refusal(() => promote(workspace, { slug: "delta", at: 4, yes: true }));
        assert.equal(outcome.code, "promote-number-archived", `refused promote-number-archived (got ${outcome.code})`);
        assert.match(outcome.message, /05/, "the message names 05 — theta's post-shift number");
        assert.match(outcome.message, /archive\/05_milestone_zeta/);
      });
      await withFixture(async ({ work, workspace }) => {
        await plantRow(work, "04_chore_theta");
        const envelope = await promote(workspace, { slug: "delta", at: 7, yes: true });
        assert.ok(existsSync(path.join(work, "07_milestone_delta")), "07 is free, so it proceeds");
        assert.equal(envelope.shifted, 2);
        assert.ok(existsSync(path.join(work, "11_milestone_alpha")) && existsSync(path.join(work, "12_chore_beta")), "10 and 11 shift to 11 and 12");
        assert.ok(existsSync(path.join(work, "archive", "05_milestone_zeta")) && existsSync(path.join(work, "archive", "06_chore_eta")), "…without touching 05 or 06");
      });
    },
  },

  // Scenario Outline: the archived-number check is over every number the promotion writes
  ...[
    { live: [10, 11], archived: [5, 6], at: 6, refused: "promote-number-archived", names: ["06", "archive/06_chore_eta"], why: "P itself is written" },
    { live: [10, 11], archived: [5, 6], at: 4, folder: "04_chore_x", shifted: 2, why: "the writes are 4, 11, 12 — 05 and 06 sit inside the range, unmoved" },
    { live: [3, 4], archived: [5, 6], at: 3, refused: "promote-number-archived", names: ["05"], why: "a two-step cascade (3 -> 4 -> 5) still lands on the archive" },
    { live: [4], archived: [6], at: 4, folder: "04_chore_x", shifted: 1, why: "the +1 lands one short of the archive" },
    { live: [10, 11], archived: [5, 6, 12], at: 10, refused: "promote-number-archived", names: ["12"], why: "the tail's +1 lands on an archived number ABOVE the live tail" },
    { live: [10, 11], archived: [5, 6, 12], at: null, folder: "13_chore_x", shifted: 0, why: "an append never collides" },
    { live: [10, 11], archived: [5, 6], at: 12, folder: "12_chore_x", shifted: 0, why: "P equal to the append answer shifts nothing" },
    { live: [], archived: [5, 6], at: 5, refused: "promote-number-archived", names: ["05"], why: "with no live row to shift, P is the whole check" },
    { live: [], archived: [5, 6], at: 7, folder: "07_chore_x", shifted: 0, why: "a free number above an archive-only stream" },
    { live: [10, 11], archived: [5, 6], at: 0, folder: "00_chore_x", shifted: 2, why: "zero is a position, not a refusal" },
  ].map(({ live, archived, at, folder, shifted, refused, names, why }) => ({
    name: `work/promote-mints-the-number: 01 the archived-number check is over every number the promotion writes — live [${live}] archived [${archived}] ${at == null ? "append" : `--at ${at}`} (${why})`,
    run: () => {
      const NAMES = { 3: "chore_l3", 4: "chore_l4", 10: "chore_l10", 11: "chore_l11" };
      const ARCHIVED = { 5: "milestone_zeta", 6: "chore_eta", 12: "chore_twelve" };
      const rows = [
        ...live.map((n) => `${String(n).padStart(2, "0")}_${NAMES[n]}`),
        ...archived.map((n) => `archive/${String(n).padStart(2, "0")}_${ARCHIVED[n]}`),
        "backlog/chore_x",
      ];
      return withStream(rows, async ({ work, workspace }) => {
        const outcome = await refusal(() => promote(workspace, { slug: "x", ...(at == null ? {} : { at }), yes: true }));
        if (refused) {
          assert.equal(outcome.code, refused, `refused ${refused} (got ${outcome.code}: ${outcome.message})`);
          for (const named of names) assert.match(outcome.message, new RegExp(named.replace(/\//g, "\\/")), `the message names ${named}`);
          return;
        }
        assert.equal(outcome.code, null, `it proceeds (refused ${outcome.code}: ${outcome.message})`);
        assert.ok(existsSync(path.join(work, folder)), `${folder} exists (got ${JSON.stringify(await readdir(work))})`);
        assert.equal(outcome.result.shifted, shifted, `shifted: ${shifted}`);
      });
    },
  })),

  // Scenario: a shift rewrites the depends of a backlog leaf before it moves
  {
    name: "work/promote-mints-the-number: 01 a shift rewrites the depends of a backlog leaf before it moves",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        await setFrontmatterLine(docPathOf(work, "backlog/ideas/milestone_delta", "milestone"), "depends", "[10]");
        const envelope = await promote(workspace, { slug: "delta", at: 10 });
        const doc = await readFile(path.join(work, "10_milestone_delta", "SPEC.md"), "utf8");
        assert.match(doc, /^depends: \[11\]$/m, "10_milestone_delta/SPEC.md carries depends: [11] — it still names alpha, which moved");
        assert.deepEqual(envelope.created.depends, [11], "the envelope's created.depends is [11]");
      }),
  },

  // Scenario: a shift rewrites references in the archive and in the rest of the backlog
  {
    name: "work/promote-mints-the-number: 01 a shift rewrites references in the archive and in the rest of the backlog",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        await setFrontmatterLine(docPathOf(work, "archive/06_chore_eta", "chore"), "depends", "[10]");
        await setFrontmatterLine(docPathOf(work, "backlog/chore_gamma", "chore"), "depends", "[11, 05]");

        await promote(workspace, { slug: "delta", at: 10 });

        const eta = await readFile(docPathOf(work, "archive/06_chore_eta", "chore"), "utf8");
        assert.match(eta, /^depends: \[11\]$/m, "the archived doc is reached");
        assert.match(eta, /^number: 06$/m, "…and its number: 06 line is untouched");
        const gamma = await readFile(docPathOf(work, "backlog/chore_gamma", "chore"), "utf8");
        assert.match(gamma, /^depends: \[12, 05\]$/m, "the shifted entry rewritten, the archived entry byte-identical");
        const beta = await readFile(path.join(work, "12_chore_beta", "CHORE.md"), "utf8");
        assert.match(beta, /^depends: \[05\]$/m, "11_chore_beta (now 12_chore_beta) still carries depends: [05]");
      }),
  },

  // Scenario Outline: the rewrite reaches every root, touches only the entries that shifted, and
  // keeps each entry's own format
  ...[
    { doc: "11_chore_beta", type: "chore", key: "depends", line: "[10]", after: "depends: [11]", at: "12_chore_beta", why: "a shifted live doc's own edge to another shifted item" },
    { doc: "11_chore_beta", type: "chore", key: "depends", line: "[010]", after: "depends: [011]", at: "12_chore_beta", why: "a leading zero keeps its original width" },
    { doc: "archive/06_chore_eta", type: "chore", key: "depends", line: '["10"]', after: 'depends: ["11"]', at: "archive/06_chore_eta", why: "an archived doc is reached, and its quotes are kept" },
    { doc: "backlog/chore_gamma", type: "chore", key: "depends", line: "[ 10 , 05 ]", after: "depends: [ 11 , 05 ]", at: "backlog/chore_gamma", why: "spacing is kept per entry; the archived entry is untouched" },
    { doc: "backlog/chore_gamma", type: "chore", key: "depends", line: "[9, 10]", after: "depends: [9, 11]", at: "backlog/chore_gamma", why: "an entry below P is byte-identical" },
    { doc: "backlog/ideas/later/spike_epsilon", type: "spike", key: "depends", line: "[11]", after: "depends: [12]", at: "backlog/ideas/later/spike_epsilon", why: "a leaf two groups deep is reached too" },
    { doc: "10_milestone_alpha/stories/00_story_alpha-one", type: "story", key: "parent", line: '"10"', after: 'parent: "11"', at: "11_milestone_alpha/stories/00_story_alpha-one", why: "the nested parent rewrite keeps the quotes" },
    { doc: "archive/05_milestone_zeta/stories/00_story_zeta-one", type: "story", key: "parent", line: "05", after: "parent: 05", at: "archive/05_milestone_zeta/stories/00_story_zeta-one", why: "an archived story's parent did not shift" },
    { doc: "backlog/chore_gamma", type: "chore", key: "number", line: "", after: "number:", at: "backlog/chore_gamma", why: "a number: line outside the shift set is never touched" },
  ].map(({ doc, type, key, line, after, at, why }) => ({
    name: `work/promote-mints-the-number: 01 the rewrite reaches every root and keeps each entry's format — ${doc} ${key}: ${line || "(bare)"} (${why})`,
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const before = await setFrontmatterLine(docPathOf(work, doc, type), key, line);
        await promote(workspace, { slug: "delta", at: 10, yes: true });
        const text = await readFile(docPathOf(work, at, type), "utf8");
        assert.match(text, new RegExp(`^${after.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"), `carries "${after}" (got ${JSON.stringify(text.split("\n").filter((l) => l.startsWith(`${key}:`)))})`);
        // …and is otherwise byte-identical: the one line differs and nothing else.
        const expected = before.split("\n").map((l) => (l.startsWith(`${key}:`) ? after : l));
        const actual = text.split("\n").map((l) => (l.startsWith(`${key}:`) ? after : l));
        assert.deepEqual(actual.filter((l) => !/^(number|parent):/.test(l)), expected.filter((l) => !/^(number|parent):/.test(l)), "otherwise byte-identical");
      }),
  })),

  // Scenario Outline (body-is-never-read leg, held apart because it asserts an ABSENCE of a rewrite
  // in prose rather than a frontmatter line)
  {
    name: "work/promote-mints-the-number: 01 the rewrite never reads the body — prose naming 10 and 11 is unchanged",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const specPath = docPathOf(work, "10_milestone_alpha", "milestone");
        await setBody(specPath, "# Alpha\n\nsee 10 and 11 for the rest.\n");
        await promote(workspace, { slug: "delta", at: 10, yes: true });
        const moved = await readFile(path.join(work, "11_milestone_alpha", "SPEC.md"), "utf8");
        assert.ok(moved.endsWith("# Alpha\n\nsee 10 and 11 for the rest.\n"), `the body is never read — depends: and parent: are the two references (got ${JSON.stringify(moved)})`);
      }),
  },

  // Scenario: a held item in the shift range refuses the promotion through the lock the seam
  // already has
  //
  // Driven over the ITEM-LOCK fixture rather than the three-root one, because a lease is a row in
  // the global store of a mesh-configured workspace — so the three-root rows are planted INTO that
  // fixture rather than the lock being faked onto this one. The refusal is the seam's own
  // (`guardItemLock` in front of `reindexForInsert`): promote adds no lock of its own, which is the
  // whole point of reaching the slot-open through the existing transition.
  {
    name: "work/promote-mints-the-number: 01 a held item in the shift range refuses the promotion through the lock the seam already has",
    run: () =>
      withItemLockFixture(async (fx) => {
        await plantRow(fx.workDir, "10_milestone_alpha", { status: "in-progress" });
        await plantRow(fx.workDir, "10_milestone_alpha/stories/00_story_alpha-one");
        await plantRow(fx.workDir, "11_chore_beta");
        await plantRow(fx.workDir, "backlog/ideas/milestone_delta");
        await seedActive(fx, { itemRef: "11" });

        const before = await snapshot(fx.workDir);
        const outcome = await refusal(() => invoke("work:promote", { slug: "delta", at: 10, yes: true }, fx.ctx));

        assert.equal(outcome.code, ITEM_LOCKED_CODE, `refused with the item-lock's own code (got ${outcome.code}: ${outcome.message ?? JSON.stringify(outcome.result)})`);
        assert.match(outcome.message, /11/, `…naming the holder of 11: ${outcome.message}`);
        assert.deepEqual(sorted(await snapshot(fx.workDir)), sorted(before), "nothing moved");
      }, { stream: [] }),
  },

  // Scenario Outline: an unusable --at is refused before any read of the stream
  ...[
    { at: "", refused: "promote-invalid-at", why: 'at: "" in-process is not an append' },
    { at: -1, refused: "promote-invalid-at", why: "a position is non-negative" },
    { at: "ten", refused: "promote-invalid-at", why: "parseInt answers NaN" },
    { at: "1e1", accepts: 1, why: "parseInt stops at e and answers 1 — accepted as 1, NOT refused" },
  ].map(({ at, refused, accepts, why }) => ({
    name: `work/promote-mints-the-number: 01 an unusable --at is refused before any read of the stream — --at ${JSON.stringify(at)} (${why})`,
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const before = await snapshot(work);
        const outcome = await refusal(() => promote(workspace, { slug: "delta", at, yes: true }));
        if (accepts != null) {
          assert.equal(outcome.code, null, `it proceeds (refused ${outcome.code})`);
          assert.equal(outcome.result.at, accepts, `the lenient parser answers ${accepts}`);
          return;
        }
        assert.equal(outcome.code, refused, `refused ${refused} (got ${outcome.code})`);
        assert.deepEqual(sorted(await snapshot(work)), sorted(before), "nothing changed");
      }),
  })),

  // ============================================================================
  // 02_depends-are-validated-at-promotion.feature
  // ============================================================================

  // Scenario: numeric entries naming live and archived items resolve, and the promoted doc keeps them
  {
    name: "work/promote-mints-the-number: 02 numeric entries naming live and archived items resolve, and the promoted doc keeps them",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const before = await setFrontmatterLine(docPathOf(work, "backlog/chore_gamma", "chore"), "depends", "[10, 05]");
        const envelope = await promote(workspace, { slug: "gamma", at: undefined });
        const after = await readFile(path.join(work, "12_chore_gamma", "CHORE.md"), "utf8");
        assert.match(after, /^depends: \[10, 05\]$/m, "the depends line is byte-identical");
        assert.equal(
          after,
          before.replace("type: chore\n", "type: chore\nnumber: 12\n"),
          "…and so is every other byte",
        );
        assert.deepEqual(envelope.created.depends, [10, 5], "created.depends is [10, 5]");

        const findings = await validateWork(work, workspace.config);
        assert.deepEqual(findings.filter((finding) => finding.path.includes("12_chore_gamma")), [], "validate reports no findings on 12_chore_gamma — the archived 05 resolves as a depends target there too");

        const next = await nextWork(work, "12");
        assert.equal(next.state, "blocked", `next 12 answers blocked (got ${JSON.stringify(next)})`);
        const waiting = (next.waitingOn ?? []).map(String).join(",");
        assert.match(waiting, /10/, "naming 10 (alpha is in-progress)");
        assert.ok(!/\b0?5\b/.test(waiting), `and not 05 (zeta is done): ${waiting}`);
      }, { archiveEtaStatus: "done" }),
  },

  // Scenario: a backlog slug in depends is refused as a planning note
  {
    name: "work/promote-mints-the-number: 02 a backlog slug in depends is refused as a planning note",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        await setFrontmatterLine(docPathOf(work, "backlog/chore_gamma", "chore"), "depends", "[delta]");
        const before = await snapshot(path.join(work, "backlog", "chore_gamma"));
        const outcome = await refusal(() => promote(workspace, { slug: "gamma" }));
        assert.equal(outcome.code, "promote-depends-backlog", `refused promote-depends-backlog (got ${outcome.code})`);
        assert.match(outcome.message, /delta/, "the message names delta");
        assert.match(outcome.message, /Promote `delta` first, or drop the entry/, "…and says to promote it first or drop the entry");
        assert.deepEqual(outcome.detail, { entries: [{ entry: "delta", code: "promote-depends-backlog" }] }, "detail.entries is the one offender");
        assert.deepEqual(sorted(await snapshot(path.join(work, "backlog", "chore_gamma"))), sorted(before), "backlog/chore_gamma is untouched");
      }),
  },

  // Scenario: the order the operator promotes is the order the numbers exist
  {
    name: "work/promote-mints-the-number: 02 the order the operator promotes is the order the numbers exist",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        const chorePath = docPathOf(work, "backlog/chore_gamma", "chore");
        await setFrontmatterLine(chorePath, "depends", "[delta]");
        await promote(workspace, { slug: "delta" });
        await setFrontmatterLine(chorePath, "depends", "[12]");
        const envelope = await promote(workspace, { slug: "gamma" });
        assert.equal(envelope.created.ref, "13");
        assert.match(await readFile(path.join(work, "13_chore_gamma", "CHORE.md"), "utf8"), /^depends: \[12\]$/m, "13_chore_gamma carries depends: [12]");
      }),
  },

  // Scenario: a number nothing holds is refused
  {
    name: "work/promote-mints-the-number: 02 a number nothing holds is refused",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        await setFrontmatterLine(docPathOf(work, "backlog/chore_gamma", "chore"), "depends", "[10, 42]");
        const outcome = await refusal(() => promote(workspace, { slug: "gamma" }));
        assert.equal(outcome.code, "promote-depends-unresolved", `refused promote-depends-unresolved (got ${outcome.code})`);
        assert.match(outcome.message, /42/, "the message names 42");
        assert.ok(!/\b10\b/.test(outcome.message), `…and not 10: ${outcome.message}`);
      }),
  },

  // Scenario: every offending entry is named in one refusal
  {
    name: "work/promote-mints-the-number: 02 every offending entry is named in one refusal",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        await setFrontmatterLine(docPathOf(work, "backlog/chore_gamma", "chore"), "depends", "[42, delta, 10, 99]");
        const outcome = await refusal(() => promote(workspace, { slug: "gamma" }));
        assert.deepEqual(outcome.detail, {
          entries: [
            { entry: "42", code: "promote-depends-unresolved" },
            { entry: "delta", code: "promote-depends-backlog" },
            { entry: "99", code: "promote-depends-unresolved" },
          ],
        }, "detail.entries names 42 and 99 as unresolved and delta as backlog, in the order written");
        assert.equal(outcome.code, "promote-depends-unresolved", "the error's code is the code of the first offending entry");
      }),
  },

  // Scenario: an empty or absent depends is nothing to check
  {
    name: "work/promote-mints-the-number: 02 an empty or absent depends is nothing to check",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        await setFrontmatterLine(docPathOf(work, "backlog/chore_gamma", "chore"), "depends", "[]");
        const gamma = await promote(workspace, { slug: "gamma" });
        assert.deepEqual(gamma.created.depends, [], "gamma's created.depends is []");
        const delta = await promote(workspace, { slug: "delta" });
        assert.ok(!("depends" in delta.created), "delta's created carries no depends key");
      }),
  },

  // Scenario: a depends entry naming the number the promotion itself will occupy still resolves as written
  {
    name: "work/promote-mints-the-number: 02 a depends entry naming the number the promotion itself will occupy still resolves as written",
    run: () =>
      withFixture(async ({ work, workspace }) => {
        await setFrontmatterLine(docPathOf(work, "backlog/ideas/milestone_delta", "milestone"), "depends", "[10]");
        const envelope = await promote(workspace, { slug: "delta", at: 10 });
        assert.equal(envelope.created.ref, "10", "10 resolved to alpha before the shift");
        assert.match(await readFile(path.join(work, "10_milestone_delta", "SPEC.md"), "utf8"), /^depends: \[11\]$/m, "the promoted doc carries depends: [11], alpha's new number");
      }),
  },

  // Scenario Outline: the target set is the depend-target set, live or archived
  ...[
    { extra: [], entry: "10", promoted: true, why: "a live milestone" },
    { extra: [], entry: "11", promoted: true, why: "a live chore" },
    { extra: [], entry: "05", promoted: true, why: "an archived milestone is satisfied, not missing" },
    { extra: [], entry: "06", promoted: true, why: "an archived chore" },
    { extra: [], entry: "5", promoted: true, why: "sameNum — 5 and 05 are one number" },
    { extra: ["07_story_solo"], entry: "07", promoted: true, why: "a parentless story is a depend target" },
    { extra: ["08_uat_gate"], entry: "08", promoted: true, why: "a uat gate" },
    { extra: [], entry: "10/00", refused: "promote-depends-unresolved", why: "a driver's depends never names a story" },
    { extra: [], entry: "05/00", refused: "promote-depends-unresolved", why: "an archived story form is no more a target" },
    { extra: [], entry: "gamma", refused: "promote-depends-backlog", why: "itself — a self-edge is still a backlog slug" },
    { extra: [], entry: "zeta", refused: "promote-depends-unresolved", why: "an archived SLUG is not a ref form for depends" },
    { extra: [], entry: "alpha", refused: "promote-depends-unresolved", why: "a live SLUG is not a ref form either" },
    { extra: [], entry: '"10"', promoted: true, why: "quotes are stripped at parse" },
    { extra: [], entry: " 10 ", promoted: true, why: "surrounding spaces are stripped at parse" },
    { extra: [], entry: "12", refused: "promote-depends-unresolved", why: "the number the NEXT promotion mints is held by nothing yet" },
    { extra: [], entry: "10a", refused: "promote-depends-unresolved", why: "not all-digit, so free text — and no slug is 10a" },
    { extra: [], entry: "Delta", refused: "promote-depends-unresolved", why: "exact is exact — a slug is lowercase by grammar" },
    { extra: [], entry: "epsilon", refused: "promote-depends-backlog", why: "a leaf two groups deep is a backlog slug like any other" },
    { extra: [], entry: '"delta"', refused: "promote-depends-backlog", why: "quotes stripped — the entry is the slug" },
  ].map(({ extra, entry, promoted, refused, why }) => ({
    name: `work/promote-mints-the-number: 02 the target set is the depend-target set, live or archived — depends: [${entry}] ${promoted ? "promoted" : `refused ${refused}`} (${why})`,
    run: () =>
      withFixture(async ({ work, workspace }) => {
        for (const row of extra) await plantRow(work, row);
        await setFrontmatterLine(docPathOf(work, "backlog/chore_gamma", "chore"), "depends", `[${entry}]`);
        const outcome = await refusal(() => promote(workspace, { slug: "gamma" }));
        if (promoted) {
          assert.equal(outcome.code, null, `it proceeds (refused ${outcome.code}: ${outcome.message})`);
          return;
        }
        assert.equal(outcome.code, refused, `refused ${refused} (got ${outcome.code}: ${outcome.message})`);
      }),
  })),

  // Scenario Outline: one refusal names every offending entry in the order written, and the code is
  // the first offender's
  ...[
    { entries: "delta, 42", refused: "promote-depends-backlog", detail: [["delta", "promote-depends-backlog"], ["42", "promote-depends-unresolved"]], why: "the first offender sets the code" },
    { entries: "10, delta", refused: "promote-depends-backlog", detail: [["delta", "promote-depends-backlog"]], why: "a resolved entry ahead of the offender is not an offender" },
    { entries: "delta, epsilon", refused: "promote-depends-backlog", detail: [["delta", "promote-depends-backlog"], ["epsilon", "promote-depends-backlog"]], why: "two notes, one refusal" },
    { entries: "42, 42", refused: "promote-depends-unresolved", detail: [["42", "promote-depends-unresolved"], ["42", "promote-depends-unresolved"]], why: "a duplicate offender is named once per entry as written" },
    { entries: "delta, 10/00, alpha", refused: "promote-depends-backlog", detail: [["delta", "promote-depends-backlog"], ["10/00", "promote-depends-unresolved"], ["alpha", "promote-depends-unresolved"]], why: "the offender kinds in one note" },
    { entries: "10, 10", promotedDepends: [10, 10], why: "a duplicate target is kept, not deduplicated" },
    { entries: "10, , 11", promotedDepends: [10, 11], why: "an empty entry is dropped by the parser and is nothing to check" },
  ].map(({ entries, refused, detail, promotedDepends, why }) => ({
    name: `work/promote-mints-the-number: 02 one refusal names every offending entry in the order written — depends: [${entries}] (${why})`,
    run: () =>
      withFixture(async ({ work, workspace }) => {
        await setFrontmatterLine(docPathOf(work, "backlog/chore_gamma", "chore"), "depends", `[${entries}]`);
        const outcome = await refusal(() => promote(workspace, { slug: "gamma" }));
        if (promotedDepends) {
          assert.equal(outcome.code, null, `it proceeds (refused ${outcome.code}: ${outcome.message})`);
          assert.deepEqual(outcome.result.created.depends, promotedDepends, `created.depends is ${JSON.stringify(promotedDepends)}`);
          return;
        }
        assert.equal(outcome.code, refused, `the code is the first offender's, ${refused} (got ${outcome.code})`);
        assert.deepEqual(outcome.detail, { entries: detail.map(([entry, code]) => ({ entry, code })) }, "detail.entries names them in that order");
      }),
  })),

  // ============================================================================
  // 04_intake-is-the-write-side-default.feature — the ONE promote-side scenario
  // ============================================================================

  // Scenario: promote's not-found text explains a stream-intake project
  {
    name: "work/promote-mints-the-number: 04 promote's not-found text explains a stream-intake project",
    run: async () => {
      await withFixture(async ({ workspace }) => {
        const outcome = await refusal(() => promote(workspace, { slug: "nothing-here" }));
        assert.equal(outcome.code, "promote-not-found");
        assert.match(outcome.message, /work\.intake: "stream"/, `the message names work.intake: "stream": ${outcome.message}`);
        assert.match(outcome.message, /Nothing is born in the backlog/, "…and says nothing is born in the backlog under it");
      }, { config: { rest: { work: { intake: "stream" } } } });
      await withFixture(async ({ workspace }) => {
        const outcome = await refusal(() => promote(workspace, { slug: "nothing-here" }));
        assert.equal(outcome.code, "promote-not-found");
        assert.ok(!/intake/.test(outcome.message), `under "backlog" the message carries no mention of intake: ${outcome.message}`);
      }, { config: { rest: { work: { intake: "backlog" } } } });
      await withFixture(async ({ work, workspace }) => {
        const envelope = await promote(workspace, { slug: "gamma" });
        assert.equal(envelope.created.ref, "12", "a leaf that exists is promoted whatever the intake says");
        assert.ok(existsSync(path.join(work, "12_chore_gamma")));
      }, { config: { rest: { work: { intake: "stream" } } } });
    },
  },
];
