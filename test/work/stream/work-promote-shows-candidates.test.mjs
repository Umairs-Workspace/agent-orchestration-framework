import { bundleFixtureRoot, installedBundlePath } from "../../support/cli-spawn.mjs";
import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
// Traceability wiring for story 152 — "Promote shows what to promote next".
//
// Every @executable scenario (and every Scenario Outline Examples row) of tasks 00, 01 and 02 is
// asserted here: tasks 00 and 01 against the REAL registered command `work:promote`
// (packages/work/src/commands/promote.mjs), in-process through the command core and as a real CLI
// child for the faces; task 02 over the wrapper asset and the three runtime copies `aof work
// update` rendered into this repository.
//
// THE FIXTURE IS TASK 00's BACKGROUND, planted from folder paths so a row's identity is the
// grammar's: live milestone 148 "in-progress", archived milestone 129 "done", and the eight backlog
// rows of the table. `withTree` takes any other backlog for the outline rows that name their own.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../support/cli-spawn.mjs";

const invoke = _aofApplication.invoke;
const loadWorkspace = _aofWorkspace.work.loadWorkspace;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");

const RECORD_DOC = { milestone: "SPEC.md", story: "STORY.md", uat: "SESSION.md", spike: "SPIKE.md", chore: "CHORE.md" };
const ITEM_RE = /^(\d+)_(milestone|story|uat|spike|chore)_([a-z0-9-]+)$/;
const BACKLOG_RE = /^(milestone|story|chore|spike|uat)_([a-z0-9-]+)$/;
const slash = (value) => String(value).replaceAll("\\", "/");

// Task 00's Background, verbatim from the table.
const BACKGROUND = [
  { path: "148_milestone_memory-corpus", status: "in-progress" },
  { path: "archive/129_milestone_old-work", status: "done" },
  { path: "backlog/milestone_memory-closes-the-loop", depends: "[148]", created: "2026-09-27" },
  { path: "backlog/milestone_episodic-memory-is-recallable", depends: "[148, memory-closes-the-loop]", created: "2026-09-27" },
  { path: "backlog/milestone_the-memory-wiki-stays-true", depends: "[148, memory-closes-the-loop, episodic-memory-is-recallable]", created: "2026-09-27" },
  { path: "backlog/milestone_operator-auto-memory-source", depends: "[148]", created: "2026-09-27" },
  { path: "backlog/story_a-halted-lane-is-reaped", created: "2026-09-27" },
  { path: "backlog/story_a-running-loop-is-visible-in-the-ui", created: "2026-09-27" },
  { path: "backlog/story_every-command-runs-over-a-valid-config", depends: "[129]", created: "2026-10-02" },
  { path: "backlog/ideas/chore_orphan-edge", depends: "[no-such-item]", created: "2026-10-01" },
];

async function plantRow(work, { path: relPath, status = "not-started", depends, created }) {
  const parts = relPath.split("/");
  const leaf = parts[parts.length - 1];
  const numbered = leaf.match(ITEM_RE);
  const backlog = leaf.match(BACKLOG_RE);
  assert.ok(numbered || backlog, `fixture path "${relPath}" is not a work-item folder name`);
  const type = numbered ? numbered[2] : backlog[1];
  const slug = numbered ? numbered[3] : backlog[2];
  const fields = [`type: ${type}`];
  if (numbered) fields.push(`number: ${numbered[1]}`);
  fields.push(`slug: ${slug}`, `status: ${status}`, `title: "${slug}"`);
  if (depends !== undefined) fields.push(`depends: ${depends}`);
  if (created !== undefined) fields.push(`created: ${created}`);
  fields.push("schema: 1");
  const dir = path.join(work, ...parts);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, RECORD_DOC[type]), `---\n${fields.join("\n")}\n---\n# ${slug}\n`, "utf8");
}

async function withTree(rows, body, { config = {} } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-152-candidates-"));
  const globalHome = await mkdtemp(path.join(os.tmpdir(), "aof-152-candidates-gh-"));
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work", ...config } }, null, 2)}\n`,
    "utf8",
  );
  const work = path.join(root, "wiki", "work");
  await mkdir(work, { recursive: true });
  for (const row of rows) await plantRow(work, row);
  try {
    return await body({ root, work, globalHome, workspace: await loadWorkspace(root) });
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(globalHome, { recursive: true, force: true });
  }
}

const withBackground = (body, options) => withTree(BACKGROUND, body, options);
const promote = (workspace, input) => invoke("work:promote", input, { workspace });
const show = (workspace) => promote(workspace, { showCandidates: true });
const slugs = (rows) => rows.map((row) => row.slug);

async function refusal(run) {
  try {
    return { code: null, result: await run() };
  } catch (error) {
    return { code: error.code ?? null, message: String(error.message ?? "") };
  }
}

function runCli(root, args, globalHome) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1", ...(globalHome ? { AOF_GLOBAL_HOME: globalHome } : {}) },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

// Every file under a directory as `relative path -> bytes` — the byte-identity channel.
async function snapshot(dir) {
  const out = new Map();
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.set(slash(path.relative(dir, full)), (await readFile(full)).toString("base64"));
    }
  };
  if (existsSync(dir)) await walk(dir);
  return [...out.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

// An envelope with its fixture root replaced, so two fresh copies of one tree compare equal.
const rooted = (root, envelope) => JSON.parse(JSON.stringify(envelope).replaceAll(slash(root), "<root>"));

// The outline rows' backlog, written as `type_slug (depends [..], created)` in the feature.
const only = (...rows) => [{ path: "148_milestone_memory-corpus", status: "in-progress" }, ...rows];

export const workPromoteShowsCandidatesTests = [
  // ============================================================================
  // 00_promote-lists-the-candidates.feature
  // ============================================================================

  {
    name: "work/promote-shows-candidates: 00 E1 an item whose dependency is in the stream but not done is a candidate",
    run: () =>
      withBackground(async ({ workspace }) => {
        const { candidates } = await show(workspace);
        assert.ok(slugs(candidates).includes("memory-closes-the-loop"), `memory-closes-the-loop is a candidate: ${slugs(candidates)}`);
        assert.ok(slugs(candidates).includes("every-command-runs-over-a-valid-config"), "…and so is the item whose dependency 129 is archived");
      }),
  },

  {
    name: "work/promote-shows-candidates: 00 E2 an item that depends on another backlog item is not a candidate",
    run: () =>
      withBackground(async ({ workspace }) => {
        const { candidates } = await show(workspace);
        assert.ok(!slugs(candidates).includes("episodic-memory-is-recallable"), "episodic-memory-is-recallable is not a candidate");
        const outcome = await refusal(() => promote(workspace, { slug: "episodic-memory-is-recallable" }));
        assert.equal(outcome.code, "promote-depends-backlog", `a named promote refuses it the same way (got ${outcome.code})`);
      }),
  },

  // Scenario Outline: the candidate set is exactly the set a named promote accepts
  ...[
    { slug: "memory-closes-the-loop", listed: true, outcome: null },
    { slug: "operator-auto-memory-source", listed: true, outcome: null },
    { slug: "a-halted-lane-is-reaped", listed: true, outcome: null },
    { slug: "episodic-memory-is-recallable", listed: false, outcome: "promote-depends-backlog" },
    { slug: "the-memory-wiki-stays-true", listed: false, outcome: "promote-depends-backlog" },
    { slug: "orphan-edge", listed: false, outcome: "promote-depends-unresolved", example: "E3" },
  ].map(({ slug, listed, outcome, example }) => ({
    name: `work/promote-shows-candidates: 00 ${example ? `${example} ` : ""}the candidate set is exactly the set a named promote accepts — ${slug} ${listed ? "listed" : "not listed"}`,
    run: async () => {
      await withBackground(async ({ workspace }) => {
        const { candidates } = await show(workspace);
        assert.equal(slugs(candidates).includes(slug), listed, `${slug} is ${listed ? "" : "not "}in candidates: ${slugs(candidates)}`);
      });
      // "in a fresh copy of the work tree"
      await withBackground(async ({ workspace }) => {
        const result = await refusal(() => promote(workspace, { slug }));
        assert.equal(result.code, outcome, `a named promote of ${slug} ${outcome ? `refuses ${outcome}` : "succeeds"} (got ${result.code})`);
      });
    },
  })),

  {
    name: "work/promote-shows-candidates: 00 E11 listing candidates writes nothing",
    run: () =>
      withBackground(async ({ root, work, globalHome }) => {
        const before = { work: await snapshot(work), home: await snapshot(globalHome) };
        const human = runCli(root, ["work", "promote", "--show-candidates"], globalHome);
        assert.equal(human.status, 0, `the human face exits 0 (stderr: ${human.stderr})`);
        const json = runCli(root, ["work", "promote", "--show-candidates", "--json"], globalHome);
        assert.equal(json.status, 0, `the json face exits 0 (stderr: ${json.stderr})`);
        assert.deepEqual(await snapshot(work), before.work, "every file under the work tree is byte-identical");
        assert.deepEqual(await snapshot(globalHome), before.home, "…and so is the effects journal's home");
      }),
  },

  {
    name: "work/promote-shows-candidates: 00 E4 the item that unblocks the most backlog items comes first",
    run: () =>
      withBackground(async ({ workspace }) => {
        const { candidates } = await show(workspace);
        assert.deepEqual(candidates.map(({ slug, unblocks }) => ({ slug, unblocks })), [
          { slug: "memory-closes-the-loop", unblocks: 2 },
          { slug: "a-halted-lane-is-reaped", unblocks: 0 },
          { slug: "a-running-loop-is-visible-in-the-ui", unblocks: 0 },
          { slug: "operator-auto-memory-source", unblocks: 0 },
          { slug: "every-command-runs-over-a-valid-config", unblocks: 0 },
        ]);
      }),
  },

  {
    name: "work/promote-shows-candidates: 00 E5 among items that unblock the same number, the oldest comes first",
    run: () =>
      withBackground(async ({ workspace }) => {
        const order = slugs((await show(workspace)).candidates);
        assert.ok(order.indexOf("a-halted-lane-is-reaped") < order.indexOf("every-command-runs-over-a-valid-config"), order.join(", "));
      }),
  },

  {
    name: "work/promote-shows-candidates: 00 E6 same unblock count and same created date order by slug",
    run: () =>
      withBackground(async ({ workspace }) => {
        const order = slugs((await show(workspace)).candidates);
        const three = ["a-halted-lane-is-reaped", "a-running-loop-is-visible-in-the-ui", "operator-auto-memory-source"];
        assert.deepEqual(order.filter((slug) => three.includes(slug)), three);
      }),
  },

  // Scenario Outline: the ordering edges
  ...[
    {
      label: "transitive unblocks lead an older item",
      backlog: [
        { path: "backlog/spike_x", created: "2026-10-03" },
        { path: "backlog/story_y", depends: "[x]", created: "2026-10-03" },
        { path: "backlog/story_z", depends: "[y]", created: "2026-10-03" },
        { path: "backlog/chore_w", created: "2026-09-01" },
        { path: "backlog/story_v", depends: "[w]", created: "2026-10-03" },
      ],
      order: ["x", "w"],
      unblocks: [2, 1],
      groups: ["", ""],
    },
    {
      label: "no created line sorts after a dated one",
      backlog: [{ path: "backlog/story_a" }, { path: "backlog/story_b", created: "2026-10-03" }],
      order: ["b", "a"],
      unblocks: [0, 0],
      groups: ["", ""],
    },
    {
      label: "one slug in two groups keeps the backlog listing's order",
      backlog: [
        { path: "backlog/story_same", created: "2026-10-01" },
        { path: "backlog/ideas/story_same", created: "2026-10-01" },
      ],
      order: ["same", "same"],
      unblocks: [0, 0],
      groups: ["", "ideas"],
    },
  ].map(({ label, backlog, order, unblocks, groups }) => ({
    name: `work/promote-shows-candidates: 00 the ordering edges — ${label}`,
    run: () =>
      withTree(only(...backlog), async ({ workspace }) => {
        const { candidates } = await show(workspace);
        assert.deepEqual(slugs(candidates), order);
        assert.deepEqual(candidates.map((row) => row.unblocks), unblocks);
        assert.deepEqual(candidates.map((row) => row.backlog), groups, "each row carries its backlog group");
      }),
  })),

  {
    name: "work/promote-shows-candidates: 00 E7 a blocked item names every backlog item it waits on",
    run: () =>
      withBackground(async ({ workspace }) => {
        const { waiting } = await show(workspace);
        const wiki = waiting.find((row) => row.slug === "the-memory-wiki-stays-true");
        assert.deepEqual(wiki?.waitsOn, [
          { entry: "memory-closes-the-loop", code: "promote-depends-backlog" },
          { entry: "episodic-memory-is-recallable", code: "promote-depends-backlog" },
        ]);
        const episodic = waiting.find((row) => row.slug === "episodic-memory-is-recallable");
        assert.deepEqual(episodic?.waitsOn, [{ entry: "memory-closes-the-loop", code: "promote-depends-backlog" }]);
      }),
  },

  {
    name: "work/promote-shows-candidates: 00 E8 an entry that names nothing is shown as unresolved",
    run: () =>
      withBackground(async ({ workspace }) => {
        const orphan = (await show(workspace)).waiting.find((row) => row.slug === "orphan-edge");
        assert.equal(orphan?.backlog, "ideas");
        assert.deepEqual(orphan?.waitsOn, [{ entry: "no-such-item", code: "promote-depends-unresolved" }]);
      }),
  },

  {
    name: "work/promote-shows-candidates: 00 the human render shows candidates first, then the waiting items, and names the next step",
    run: () =>
      withBackground(async ({ root, globalHome }) => {
        const result = runCli(root, ["work", "promote", "--show-candidates"], globalHome);
        assert.equal(result.status, 0, `exits 0 (stderr: ${result.stderr})`);
        const lines = result.stdout.trimEnd().split(/\r?\n/);
        const order = [
          ["memory-closes-the-loop", "milestone", 2],
          ["a-halted-lane-is-reaped", "story", 0],
          ["a-running-loop-is-visible-in-the-ui", "story", 0],
          ["operator-auto-memory-source", "milestone", 0],
          ["every-command-runs-over-a-valid-config", "story", 0],
        ];
        const at = order.map(([slug, type, unblocks], index) => {
          const found = lines.findIndex((line) => line.includes(`${index + 1}. ${slug} (${type}, unblocks ${unblocks})`));
          assert.ok(found >= 0, `candidate ${index + 1} is ${slug} with its type and unblock count:\n${result.stdout}`);
          return found;
        });
        assert.deepEqual([...at].sort((a, b) => a - b), at, "numbered 1 to 5 in the R2 order");
        const section = lines.findIndex((line) => /^Waiting/u.test(line));
        assert.ok(section > at[4], "the waiting section comes after the candidates");
        for (const [slug, on] of [
          ["episodic-memory-is-recallable", ["memory-closes-the-loop"]],
          ["the-memory-wiki-stays-true", ["memory-closes-the-loop", "episodic-memory-is-recallable"]],
          ["ideas/orphan-edge", ["no-such-item"]],
        ]) {
          const line = lines.slice(section).find((entry) => entry.includes(` ${slug} (`));
          assert.ok(line, `the waiting section names ${slug}`);
          for (const entry of on) assert.ok(line.includes(entry), `…and what it waits on (${entry}): ${line}`);
        }
        const last = lines[lines.length - 1];
        assert.ok(last.includes("aof work promote memory-closes-the-loop") && last.includes("--next-item"), `the last line names the next step: ${last}`);
      }),
  },

  // Scenario Outline: an empty answer is said plainly
  ...[
    { label: "nothing", backlog: [], says: "The backlog is empty.", waiting: 0 },
    {
      label: "only a two-item cycle",
      backlog: [{ path: "backlog/story_b", depends: "[a]" }, { path: "backlog/story_a", depends: "[b]" }],
      says: "No backlog item can be promoted yet.",
      waiting: 2,
    },
  ].map(({ label, backlog, says, waiting }) => ({
    name: `work/promote-shows-candidates: 00 an empty answer is said plainly — ${label}`,
    run: () =>
      withTree(only(...backlog), async ({ root, globalHome }) => {
        const human = runCli(root, ["work", "promote", "--show-candidates"], globalHome);
        assert.equal(human.status, 0, `exits 0 (stderr: ${human.stderr})`);
        assert.ok(human.stdout.includes(says), `the output says "${says}":\n${human.stdout}`);
        const json = runCli(root, ["work", "promote", "--show-candidates", "--json"], globalHome);
        const parsed = JSON.parse(json.stdout);
        assert.deepEqual(parsed.candidates, []);
        assert.equal(parsed.waiting.length, waiting);
      }),
  })),

  {
    name: "work/promote-shows-candidates: 00 the JSON face forward-slashes every dir",
    run: () =>
      withBackground(async ({ root, globalHome }) => {
        const parsed = JSON.parse(runCli(root, ["work", "promote", "--show-candidates", "--json"], globalHome).stdout);
        for (const row of [...parsed.candidates, ...parsed.waiting]) assert.ok(!row.dir.includes("\\"), row.dir);
      }),
  },

  // ============================================================================
  // 01_promote-next-item-promotes-the-head.feature
  // ============================================================================

  {
    name: "work/promote-shows-candidates: 01 E9 the head is promoted to the tail and the edges on it are rewired",
    run: async () => {
      let named;
      await withBackground(async ({ root, globalHome }) => {
        named = rooted(root, JSON.parse(runCli(root, ["work", "promote", "memory-closes-the-loop", "--json"], globalHome).stdout));
      });
      await withBackground(async ({ root, workspace, globalHome }) => {
        const result = runCli(root, ["work", "promote", "--next-item", "--json"], globalHome);
        assert.equal(result.status, 0, `exits 0 (stderr: ${result.stderr})`);
        const envelope = JSON.parse(result.stdout);
        assert.equal(envelope.created.ref, "149");
        assert.equal(envelope.created.slug, "memory-closes-the-loop");
        assert.equal(envelope.created.type, "milestone");
        assert.deepEqual(envelope.rewired.map((entry) => entry.ref).sort(), ["episodic-memory-is-recallable", "the-memory-wiki-stays-true"]);
        assert.deepEqual(Object.keys(envelope).sort(), Object.keys(named).sort(), "the envelope has exactly a named promote's keys");
        assert.deepEqual(rooted(root, envelope), named, "…and is the envelope a named promote of the same item answers");
        const after = await show(workspace);
        assert.equal(after.candidates[0].slug, "episodic-memory-is-recallable", "it now heads the list, waiting on 149 only");
      });
    },
  },

  {
    name: "work/promote-shows-candidates: 01 the human render names the item it chose",
    run: () =>
      withBackground(async ({ root, globalHome }) => {
        const result = runCli(root, ["work", "promote", "--next-item"], globalHome);
        assert.equal(result.status, 0, `exits 0 (stderr: ${result.stderr})`);
        const lines = result.stdout.split(/\r?\n/);
        const promoted = lines.indexOf('Promoted "memory-closes-the-loop" to 149 (appended).');
        assert.ok(promoted > 0, `prints the promoted line:\n${result.stdout}`);
        assert.equal(lines[promoted - 1], "Next candidate: memory-closes-the-loop (milestone, unblocks 2).");
      }),
  },

  {
    name: "work/promote-shows-candidates: 01 --next-item takes --at with the meaning a named promote gives it",
    run: () =>
      withBackground(async ({ root, work, globalHome }) => {
        const result = runCli(root, ["work", "promote", "--next-item", "--at", "148", "--yes", "--json"], globalHome);
        assert.equal(result.status, 0, `exits 0 (stderr: ${result.stderr})`);
        const envelope = JSON.parse(result.stdout);
        assert.equal(envelope.created.ref, "148");
        assert.equal(envelope.shifted, 1);
        assert.ok(existsSync(path.join(work, "149_milestone_memory-corpus")), "live milestone 148 is now 149");
        assert.ok(existsSync(path.join(work, "148_milestone_memory-closes-the-loop")));
      }),
  },

  // Scenario Outline: a refusal from the promotion is the named promote's own refusal
  ...[
    { condition: "archived 129 holds the number --at 129 would write", args: ["--at", "129"], code: "promote-number-archived" },
    {
      condition: "a file named 149_milestone_memory-closes-the-loop exists",
      args: [],
      code: "promote-destination-exists",
      plant: (work) => writeFile(path.join(work, "149_milestone_memory-closes-the-loop"), "stray\n", "utf8"),
    },
    { condition: "the confirm threshold is 0", args: ["--at", "0"], code: "insert-confirm-required", config: { insert: { confirmThreshold: 0 } } },
  ].map(({ condition, args, code, plant, config }) => ({
    name: `work/promote-shows-candidates: 01 a refusal from the promotion is the named promote's own refusal — ${code} (${condition})`,
    run: () =>
      withBackground(async ({ root, work, globalHome }) => {
        if (plant) await plant(work);
        const before = await snapshot(work);
        const result = runCli(root, ["work", "promote", "--next-item", ...args, "--json"], globalHome);
        assert.notEqual(result.status, 0, "exits non-zero");
        assert.equal(JSON.parse(result.stdout).code, code, result.stdout);
        assert.deepEqual(await snapshot(work), before, "every file under the work tree is byte-identical");
      }, { config }),
  })),

  // Scenario Outline: E10 with no candidate, nothing is promoted
  ...[
    { label: "nothing", backlog: [], says: "The backlog is empty." },
    {
      label: "only a two-item cycle",
      backlog: [{ path: "backlog/story_b", depends: "[a]" }, { path: "backlog/story_a", depends: "[b]" }],
      says: "No backlog item can be promoted yet.",
    },
  ].map(({ label, backlog, says }) => ({
    name: `work/promote-shows-candidates: 01 E10 with no candidate, nothing is promoted — ${label}`,
    run: () =>
      withTree(only(...backlog), async ({ root, work, globalHome }) => {
        const before = await snapshot(work);
        const result = runCli(root, ["work", "promote", "--next-item", "--json"], globalHome);
        assert.notEqual(result.status, 0, "exits non-zero");
        const parsed = JSON.parse(result.stdout);
        assert.equal(parsed.code, "promote-no-candidates");
        assert.ok(parsed.error.includes(says), `the message says "${says}": ${parsed.error}`);
        assert.deepEqual(await snapshot(work), before, "every file under the work tree is byte-identical");
      }),
  })),

  // Scenario Outline: E12 conflicting arguments are refused before the work tree is read
  ...[
    { args: ["memory-closes-the-loop", "--next-item"], code: "promote-flag-conflict" },
    { args: ["memory-closes-the-loop", "--show-candidates"], code: "promote-flag-conflict" },
    { args: ["--show-candidates", "--next-item"], code: "promote-flag-conflict" },
    { args: ["--show-candidates", "--at", "3"], code: "promote-flag-conflict" },
    { args: [], code: "promote-missing-slug" },
  ].map(({ args, code }) => ({
    name: `work/promote-shows-candidates: 01 E12 conflicting arguments are refused before the work tree is read — [${args.join(" ")}] ${code}`,
    run: async () => {
      await withBackground(async ({ root, work, globalHome }) => {
        const before = await snapshot(work);
        const result = runCli(root, ["work", "promote", ...args, "--json"], globalHome);
        assert.notEqual(result.status, 0, "exits non-zero");
        assert.equal(JSON.parse(result.stdout).code, code, result.stdout);
        assert.deepEqual(await snapshot(work), before, "every file under the work tree is byte-identical");
      });
      // "the same refusal comes back when the configured work directory does not exist"
      await withTree([], async ({ root, globalHome }) => {
        await rm(path.join(root, "wiki"), { recursive: true, force: true });
        const result = runCli(root, ["work", "promote", ...args, "--json"], globalHome);
        assert.equal(JSON.parse(result.stdout).code, code, `with no work directory: ${result.stdout}`);
      });
    },
  })),

  // Review close (152) — a flag the face does not know arrives as a positional; `-h` is a SUBSTRING
  // of "a-halted-lane-is-reaped", so before this guard it promoted that item. Never a slug.
  {
    name: "work/promote-shows-candidates: 01 a flag-shaped argument is refused, never resolved as a slug",
    run: () =>
      withBackground(async ({ root, work, globalHome }) => {
        const before = await snapshot(work);
        const result = runCli(root, ["work", "promote", "-h", "--json"], globalHome);
        assert.notEqual(result.status, 0, "exits non-zero");
        assert.equal(JSON.parse(result.stdout).code, "promote-flag-conflict", result.stdout);
        assert.deepEqual(await snapshot(work), before, "nothing was promoted");
      }),
  },

  {
    name: "work/promote-shows-candidates: 01 the usage line offers both flags",
    run: async () => {
      const result = runCli(repoRoot, ["work", "promote", "--help"]);
      assert.ok(
        `${result.stdout}${result.stderr}`.includes("aof work promote <slug> | --next-item [--at <P>] [--yes] [--json] | --show-candidates [--json]"),
        `the usage line (stdout: ${result.stdout}; stderr: ${result.stderr})`,
      );
      const inventory = JSON.parse(await readFile(path.join(repoRoot, "test", "fixtures", "application", "command-inventory.json"), "utf8"));
      const entry = inventory.find((command) => command.id === "work:promote");
      assert.ok(!(entry.input.required ?? []).includes("slug"), "slug is no longer required in the inventory fixture");
      assert.deepEqual(entry.input.properties.showCandidates, { type: "boolean" });
      assert.deepEqual(entry.input.properties.nextItem, { type: "boolean" });
    },
  },

  // ============================================================================
  // 02_the-promote-command-offers-both-flags.feature
  // ============================================================================

  {
    name: "work/promote-shows-candidates: 02 the wrapper's argument hint names the three ways to call it",
    run: async () => {
      const text = await readFile(path.join(repoRoot, "packages", "core", "assets", "commands", "promote.md"), "utf8");
      const hint = text.match(/^argument-hint:\s*"([^"]*)"/mu)?.[1];
      assert.equal(hint, "<backlog slug> [at <position P>] | --next-item [at <position P>] | --show-candidates");
    },
  },

  ...[
    { command: "aof work promote --show-candidates --json", what: [/`candidates`\s+in order/u, /`waiting`/u, /writes nothing/u] },
    { command: "aof work promote --next-item", what: [/promotes the\s+first candidate/u, /reports the minted ref, exactly as a named promote does/u] },
  ].map(({ command, what }) => ({
    name: `work/promote-shows-candidates: 02 each mode drives the verb on its machine face — ${command}`,
    run: async () => {
      const text = await readFile(path.join(repoRoot, "packages", "core", "assets", "commands", "promote.md"), "utf8");
      assert.ok(text.includes(command), `the body names ${command}`);
      for (const phrase of what) assert.match(text, phrase);
    },
  })),

  {
    name: "work/promote-shows-candidates: 02 the wrapper chooses nothing by itself",
    run: async () => {
      const text = await readFile(path.join(repoRoot, "packages", "core", "assets", "commands", "promote.md"), "utf8");
      assert.match(text, /Never choose a candidate by reading the backlog or its `depends:` lines/u);
      assert.match(text, /`promote-no-candidates` is a stop to report[^.]*never a reason to search the backlog/u);
      for (const phrase of [/\bmax\b/iu, /\+\s*1\b/u]) assert.doesNotMatch(text, phrase, "the wrapper computes no number of its own");
    },
  },

  {
    name: "work/promote-shows-candidates: 02 the rendered runtime copies match the asset",
    run: async () => {
      const lock = JSON.parse(await readFile(path.join(bundleFixtureRoot(repoRoot), ".aof", "aof.lock.json"), "utf8"));
      const manifest = JSON.parse(await readFile(path.join(repoRoot, "packages", "core", "assets", "manifest.json"), "utf8"));
      const { createHash } = await import("node:crypto");
      for (const copy of [".claude/commands/aof/promote.md", ".opencode/commands/aof/promote.md", ".agents/skills/aof-promote/SKILL.md"]) {
        const text = await readFile(installedBundlePath(copy, repoRoot), "utf8");
        // OpenCode's command frontmatter has no argument-hint field, so the hint is asserted where a
        // copy renders one: claude's `argument-hint:` line and codex's usage line.
        if (!copy.startsWith(".opencode/")) assert.ok(text.includes("--next-item [at <position P>] | --show-candidates"), `${copy} carries the new argument hint`);
        assert.ok(text.includes("aof work promote --show-candidates --json") && text.includes("aof work promote --next-item"), `${copy} carries both modes`);
        const hash = `sha256:${createHash("sha256").update(text).digest("hex")}`;
        // The shipped manifest lists the claude and codex renders; the opencode copy is recorded by the lock alone.
        if (!copy.startsWith(".opencode/")) assert.equal(manifest.entries.find((entry) => entry.path === copy)?.hash, hash, `the manifest records ${copy}'s content hash`);
        assert.ok(JSON.stringify(lock).includes(hash), `.aof/aof.lock.json records ${copy}'s content hash`);
      }
    },
  },
];
