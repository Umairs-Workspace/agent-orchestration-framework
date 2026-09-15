// Traceability wiring for milestone 127 / story 03 — "Archive is a move".
//
// Every @executable scenario (and every Scenario Outline Examples row) of tasks 00-04 is asserted
// here against the REAL registered command `work:archive` (src/commands/archive.mjs), invoked
// in-process through the command core or through the real CLI as a child process, and read back
// black-box through findWork / listItems / listStream / nextWork / validateWork / doctorWork, the
// effects journal and the global work store. The textual half of the story's control (FF-12705)
// lives in test/arch/work/acd-archive-never-renumbers.test.mjs.
//
// THE FIXTURE IS 127/01'S THREE-ROOT FIXTURE EXTENDED (task 00's `buildArchiveFixture`, through
// the same `writeItem` that suite exports):
//
//   live     10_milestone_alpha (in-progress, + stories/00_story_alpha-one, + mocks/README.md)
//            11_chore_beta (not-started, depends: [12])
//            12_milestone_theta (DONE, + stories/00_story_theta-one, STATE.md in CRLF,
//                                runs/.heartbeats.ndjson, tasks/00_theta.feature, reference/retired.mjs)
//            13_chore_iota (DONE)
//   backlog  chore_gamma (group ""), ideas/milestone_delta, ideas/later/spike_epsilon
//   archive  05_milestone_zeta (+ story), 06_chore_eta
//   root     TECH_DEBT.md
//
// …with exactly the prose links task 01 enumerates, so a scenario can cite each by name.
//
// TWO CONTRACT NOTES, flagged rather than silently resolved (see the milestone STATE.md feedback):
//   · task 01's convergence scenario asks that archiving 12 then 13 yields the SAME BYTES as
//     archiving both at once; task 01's own Examples row for `archive/05_milestone_zeta` asks for
//     "the same syntactic insert, not a re-normalised `../12_…`" on the identical shape. The two
//     cannot both hold under one rule. The rule the contract declares as the invariant — every
//     link resolves to the same path — is what is asserted for convergence, plus the syntactic
//     bytes the rewriter actually produces.
//   · task 03's "no third path-reader is left" was measured at build: the census below finds
//     readers beyond the two the refine counted (the loop suites' feature ledgers, among others).
//     They are outside this story's write set and are 05's to retire before its `--done`; the
//     census names them explicitly so a NEW one cannot arrive unnoticed.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir, stat, rename, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { invoke, listCommands } from "../../../src/command-core.mjs";
import { listItems, listStream, findWork, nextWork, validateWork, loadWorkspace, ARCHIVE_ROOT } from "../../../src/work.mjs";
import { doctorWork } from "../../../src/work/doctor.mjs";
import { EFFECTS } from "../../../src/effects/table.mjs";
import { transitionStreamArchived } from "../../../src/effects/stream-transitions.mjs";
import { openEffectsJournal, readEvents, readEventSteps } from "../../../src/effects/journal.mjs";
import { publishGlobalWorkSnapshot } from "../../../src/global-work-publisher.mjs";
import { readWorkspaceItems } from "../../../src/global-work-store.mjs";
import { ITEM_LOCKED_CODE } from "../../../src/item-lock.mjs";
import { readDescriptor } from "../../../src/work/bundle.mjs";
import { resolveWorkspaceId } from "../../../src/workspace-identity.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import { withItemLockFixture, seedActive, withStore, refuse } from "../../support/item-lock-fixture.mjs";
import { buildThreeRootFixture, writeItem } from "./work-backlog-archive-enumerate.test.mjs";
import { archTests as tuneReaderTests } from "../../arch/planning/acd-tune-carries-no-second-rule.test.mjs";
import { archTests as spellerReaderTests } from "../../arch/command/acd-declared-program-single-speller.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

const slash = (value) => String(value).replaceAll("\\", "/");
const rel = (work, dir) => slash(path.relative(work, dir));
const refsOf = (rows) => rows.map((row) => row.ref);
const byRef = (rows, ref) => rows.find((row) => row.ref === ref);

// ── the archive fixture (task 00) ─────────────────────────────────────────────────────────────

const THETA_SPEC_BODY = [
  "# 12 · Theta",
  "",
  "[alpha](../10_milestone_alpha/SPEC.md) and [roadmap](../../ROADMAP.md) and [cli](../../../src/cli.mjs)",
  "[state](./STATE.md) [story](stories/00_story_theta-one/STORY.md) [gone](../99_milestone_gone/SPEC.md)",
  "[iota](../13_chore_iota/CHORE.md) [site](https://example.com/12_milestone_theta) [abs](/wiki/work/12_milestone_theta)",
  "[tasks](#tasks) [mock](../10_milestone_alpha/mocks/a%20b.png)",
  "",
  "```",
  "a fenced link: ](../10_milestone_alpha/SPEC.md)",
  "```",
  "",
  "see 10/ADR-001",
  "",
].join("\n");

const THETA_STATE_CRLF = "# 12 · Theta state\r\n\r\n[alpha](../10_milestone_alpha/SPEC.md)\r\n";
const THETA_STORY_BODY = "[alpha](../../../10_milestone_alpha/SPEC.md) [cli](../../../../../src/cli.mjs) [spec](../../SPEC.md)\n";
const THETA_FEATURE = "@executable\nFeature: theta\n  # a feature is not markdown: ](../10_milestone_alpha/SPEC.md)\n  Scenario: x\n    Given y\n";
const THETA_RETIRED = 'import "../../../../src/work.mjs";\nexport const retired = true;\n';
const THETA_HEARTBEATS = '{"at":"2026-09-11T00:00:00.000Z"}\n';
const BETA_BODY = "[theta](../12_milestone_theta/SPEC.md) [theta tasks](../12_milestone_theta/stories/00_story_theta-one/STORY.md#tasks)\n";
const ALPHA_STORY_BODY = "[theta](../../../12_milestone_theta/SPEC.md)\n";
const ALPHA_MOCKS_README = "# mocks\n\n[theta](../../12_milestone_theta/SPEC.md)\n";
const TECH_DEBT = "# tech debt\n\n[theta](12_milestone_theta/SPEC.md) [theta2](./12_milestone_theta/STATE.md)\n";
const GAMMA_BODY = "[theta](../../12_milestone_theta/SPEC.md)\n";
const IOTA_BODY = "[theta](../12_milestone_theta/SPEC.md)\n";
const ZETA_BODY = "[theta](../../12_milestone_theta/SPEC.md)\n";

export async function buildArchiveFixture() {
  const { root, work } = await buildThreeRootFixture();
  await writeItem(work, "12_milestone_theta", { type: "milestone", number: "12", slug: "theta", status: "done", title: "Theta", body: THETA_SPEC_BODY });
  await writeItem(work, "12_milestone_theta/stories/00_story_theta-one", { type: "story", number: "00", slug: "theta-one", parent: "12", status: "done", title: "Theta one", body: THETA_STORY_BODY });
  await writeFile(path.join(work, "12_milestone_theta", "STATE.md"), THETA_STATE_CRLF, "latin1");
  await mkdir(path.join(work, "12_milestone_theta", "runs"), { recursive: true });
  await writeFile(path.join(work, "12_milestone_theta", "runs", ".heartbeats.ndjson"), THETA_HEARTBEATS, "utf8");
  await mkdir(path.join(work, "12_milestone_theta", "tasks"), { recursive: true });
  await writeFile(path.join(work, "12_milestone_theta", "tasks", "00_theta.feature"), THETA_FEATURE, "utf8");
  await mkdir(path.join(work, "12_milestone_theta", "reference"), { recursive: true });
  await writeFile(path.join(work, "12_milestone_theta", "reference", "retired.mjs"), THETA_RETIRED, "utf8");
  await writeItem(work, "13_chore_iota", { type: "chore", number: "13", slug: "iota", status: "done", title: "Iota", body: IOTA_BODY });
  await writeItem(work, "11_chore_beta", { type: "chore", number: "11", slug: "beta", title: "Beta", depends: "[12]", body: BETA_BODY });
  await writeItem(work, "10_milestone_alpha/stories/00_story_alpha-one", { type: "story", number: "00", slug: "alpha-one", parent: "10", title: "Alpha one", body: ALPHA_STORY_BODY });
  await mkdir(path.join(work, "10_milestone_alpha", "mocks"), { recursive: true });
  await writeFile(path.join(work, "10_milestone_alpha", "mocks", "README.md"), ALPHA_MOCKS_README, "utf8");
  await writeFile(path.join(work, "TECH_DEBT.md"), TECH_DEBT, "utf8");
  await writeItem(work, "backlog/chore_gamma", { type: "chore", slug: "gamma", title: "Gamma", body: GAMMA_BODY });
  await writeItem(work, "archive/05_milestone_zeta", { type: "milestone", number: "05", slug: "zeta", status: "done", title: "Zeta", body: ZETA_BODY });
  return { root, work };
}

async function withFixture(body) {
  const { root, work } = await buildArchiveFixture();
  try {
    return await body({ root, work, workspace: await loadWorkspace(root) });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// A hermetic global home for every CLI child and every in-process seam call — the effects journal
// and the mesh store must never touch the real `~/.aof`.
async function withHome(body) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-127-archive-home-"));
  try {
    return await body(home);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

function runCli(root, args, { home } = {}) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1", ...(home ? { AOF_GLOBAL_HOME: home } : {}) },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const parse = (result) => {
  assert.ok(result.status != null, `the CLI ran (stderr: ${result.stderr})`);
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(result.stdout); }, `one parseable document (stdout: ${result.stdout.slice(0, 300)}; stderr: ${result.stderr.slice(0, 300)})`);
  return parsed;
};

const archiveJson = (root, args, home) => {
  const result = runCli(root, ["work", "archive", ...args, "--json"], { home });
  return { status: result.status, doc: parse(result), stderr: result.stderr };
};

const archive = (workspace, input, ctx = {}) => invoke("work:archive", input, { workspace, ...ctx });

async function refusal(run) {
  try {
    const result = await run();
    return { code: null, message: null, result };
  } catch (error) {
    if (error?.code == null) throw error;
    return { code: error.code, message: error.message, detail: error.detail ?? null, status: error.status };
  }
}

// ── tree snapshots ────────────────────────────────────────────────────────────────────────────

async function walkFiles(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

async function snapshot(work) {
  const files = new Map();
  for (const file of await walkFiles(work)) {
    const info = await stat(file);
    files.set(rel(work, file), { bytes: await readFile(file), mtimeMs: info.mtimeMs });
  }
  return files;
}

function assertIdentical(before, after, label) {
  assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort(), `${label}: the same set of files`);
  for (const [file, { bytes }] of before) {
    assert.ok(bytes.equals(after.get(file).bytes), `${label}: ${file} is byte-identical`);
  }
}

const bytesOf = (snap, file) => snap.get(file)?.bytes;

// ── the link census (task 01) ─────────────────────────────────────────────────────────────────

const LINK_RE = /\]\(([^\s)]+)[^)]*\)/g;
const isRelative = (target) => !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith("/") && !target.startsWith("#");

async function collectLinks(work) {
  const links = [];
  for (const file of (await walkFiles(work)).filter((f) => f.endsWith(".md")).sort()) {
    const text = (await readFile(file)).toString("latin1");
    for (const match of text.matchAll(LINK_RE)) {
      const target = match[1];
      if (!isRelative(target)) continue;
      const pathPart = target.split(/[#?]/)[0];
      const resolved = path.resolve(path.dirname(file), pathPart.split("/").map((seg) => { try { return decodeURIComponent(seg); } catch { return seg; } }).join("/"));
      links.push({ file: rel(work, file), target, resolved, exists: existsSync(resolved) });
    }
  }
  return links;
}

// The one remap the move applies to a recorded path: `<work>/12_milestone_theta/…` is now
// `<work>/archive/12_milestone_theta/…`.
const remapped = (work, absolute, names) => {
  for (const name of names) {
    const oldRoot = path.join(work, name);
    const relPath = path.relative(oldRoot, absolute);
    if (relPath === "" || (!relPath.startsWith("..") && !path.isAbsolute(relPath))) return path.join(work, ARCHIVE_ROOT, name, relPath);
  }
  return absolute;
};
const remappedRel = (relFile, names) => {
  for (const name of names) if (relFile === name || relFile.startsWith(`${name}/`)) return `${ARCHIVE_ROOT}/${relFile}`;
  return relFile;
};

async function gitInit(root) {
  const git = (args) => spawnCliSync("git", args, { cwd: root, encoding: "utf8" });
  const init = git(["init", "-q"]);
  assert.equal(init.status, 0, `git init (${init.stderr})`);
  git(["config", "user.email", "fixture@example.com"]);
  git(["config", "user.name", "fixture"]);
  git(["config", "core.autocrlf", "false"]);
  assert.equal(git(["add", "-A"]).status, 0, "git add");
  assert.equal(git(["commit", "-q", "-m", "fixture"]).status, 0, "git commit");
  return git;
}

// ── the expected rewrites, by file (task 01's Examples, keyed by the file's NEW path) ──────────

const OUTWARD = [
  ["archive/12_milestone_theta/SPEC.md", "../10_milestone_alpha/SPEC.md", "../../10_milestone_alpha/SPEC.md"],
  ["archive/12_milestone_theta/SPEC.md", "../../ROADMAP.md", "../../../ROADMAP.md"],
  ["archive/12_milestone_theta/SPEC.md", "../../../src/cli.mjs", "../../../../src/cli.mjs"],
  ["archive/12_milestone_theta/SPEC.md", "../99_milestone_gone/SPEC.md", "../../99_milestone_gone/SPEC.md"],
  ["archive/12_milestone_theta/SPEC.md", "../10_milestone_alpha/mocks/a%20b.png", "../../10_milestone_alpha/mocks/a%20b.png"],
  ["archive/12_milestone_theta/SPEC.md", "../13_chore_iota/CHORE.md", "../../13_chore_iota/CHORE.md"],
  ["archive/12_milestone_theta/STATE.md", "../10_milestone_alpha/SPEC.md", "../../10_milestone_alpha/SPEC.md"],
  ["archive/12_milestone_theta/stories/00_story_theta-one/STORY.md", "../../../10_milestone_alpha/SPEC.md", "../../../../10_milestone_alpha/SPEC.md"],
  ["archive/12_milestone_theta/stories/00_story_theta-one/STORY.md", "../../../../../src/cli.mjs", "../../../../../../src/cli.mjs"],
];
const INWARD = [
  ["11_chore_beta/CHORE.md", "../12_milestone_theta/SPEC.md", "../archive/12_milestone_theta/SPEC.md"],
  ["11_chore_beta/CHORE.md", "../12_milestone_theta/stories/00_story_theta-one/STORY.md#tasks", "../archive/12_milestone_theta/stories/00_story_theta-one/STORY.md#tasks"],
  ["10_milestone_alpha/stories/00_story_alpha-one/STORY.md", "../../../12_milestone_theta/SPEC.md", "../../../archive/12_milestone_theta/SPEC.md"],
  ["10_milestone_alpha/mocks/README.md", "../../12_milestone_theta/SPEC.md", "../../archive/12_milestone_theta/SPEC.md"],
  ["TECH_DEBT.md", "12_milestone_theta/SPEC.md", "archive/12_milestone_theta/SPEC.md"],
  ["TECH_DEBT.md", "./12_milestone_theta/STATE.md", "./archive/12_milestone_theta/STATE.md"],
  ["backlog/chore_gamma/CHORE.md", "../../12_milestone_theta/SPEC.md", "../../archive/12_milestone_theta/SPEC.md"],
  ["archive/05_milestone_zeta/SPEC.md", "../../12_milestone_theta/SPEC.md", "../../archive/12_milestone_theta/SPEC.md"],
  ["13_chore_iota/CHORE.md", "../12_milestone_theta/SPEC.md", "../archive/12_milestone_theta/SPEC.md"],
];
const UNTOUCHED = [
  ["archive/12_milestone_theta/SPEC.md", "./STATE.md"],
  ["archive/12_milestone_theta/SPEC.md", "stories/00_story_theta-one/STORY.md"],
  ["archive/12_milestone_theta/stories/00_story_theta-one/STORY.md", "../../SPEC.md"],
  ["archive/12_milestone_theta/SPEC.md", "https://example.com/12_milestone_theta"],
  ["archive/12_milestone_theta/SPEC.md", "/wiki/work/12_milestone_theta"],
  ["archive/12_milestone_theta/SPEC.md", "#tasks"],
];
// The fenced link is the SPEC's second occurrence of `](../10_milestone_alpha/SPEC.md)`; the
// Examples row names it separately, and the count below is what proves it was rewritten too.
const REWRITTEN_AFTER_12 = [
  { path: "10_milestone_alpha/mocks/README.md", links: 1 },
  { path: "10_milestone_alpha/stories/00_story_alpha-one/STORY.md", links: 1 },
  { path: "11_chore_beta/CHORE.md", links: 2 },
  { path: "13_chore_iota/CHORE.md", links: 1 },
  { path: "TECH_DEBT.md", links: 2 },
  { path: "archive/05_milestone_zeta/SPEC.md", links: 1 },
  { path: "archive/12_milestone_theta/SPEC.md", links: 7 },
  { path: "archive/12_milestone_theta/STATE.md", links: 1 },
  { path: "archive/12_milestone_theta/stories/00_story_theta-one/STORY.md", links: 2 },
  { path: "backlog/chore_gamma/CHORE.md", links: 1 },
];
const LINKS_AFTER_12 = REWRITTEN_AFTER_12.reduce((sum, entry) => sum + entry.links, 0);

// Apply the named `](before)` → `](after)` edits to a recorded text — the expectation for "the
// file's every other byte is unchanged".
function expectedText(beforeBytes, edits) {
  let text = beforeBytes.toString("latin1");
  for (const [before, after] of edits) {
    assert.ok(text.includes(`](${before})`), `the fixture carries ](${before})`);
    text = text.split(`](${before})`).join(`](${after})`);
  }
  return text;
}

// ── the census of literal item paths outside wiki/ (task 03) ──────────────────────────────────

const ITEM_PATH_RE = /wiki\/work\/(\d+_(?:milestone|story|task|uat|spike|chore)_[a-z0-9-]+)/g;

async function listMjs(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await listMjs(full, out);
    else if (entry.name.endsWith(".mjs")) out.push(full);
  }
  return out;
}

// KNOWN READERS the census found at build (2026-09-15) beyond the two the contract counted, each
// reading a REAL item folder at run time and each outside this story's `files:`. They are 05's
// to resolve by ref before its `--done` moves 52, 58, 59 and 00; a new one fails the census.
const KNOWN_READERS_FOR_05 = new Set([
  "test/loop/work-loops-checks.test.mjs",
  "test/loop/work-loops-commands.test.mjs",
  "test/loop/work-loops-coverage-ledger.test.mjs",
  "test/loop/work-loops-record.test.mjs",
  "test/loop/work-loops-registry-census.test.mjs",
  "test/loop/work-loops-value.test.mjs",
  "test/memory/anchor-taxonomy.test.mjs",
  "test/work/record/work-story-depends.test.mjs",
  "test/loop/drive-command-phase-drivers.test.mjs",
  "test/work/lifecycle/work-dispatch-lanes.test.mjs",
]);

export async function censusItemPathMentions() {
  const real = new Set(await readdir(path.join(repoRoot, "wiki", "work")));
  const rows = [];
  for (const dir of ["src", "test", "scripts"]) {
    for (const file of await listMjs(path.join(repoRoot, dir))) {
      const lines = (await readFile(file, "utf8")).split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const match of line.matchAll(ITEM_PATH_RE)) {
          const folder = match[1];
          const comment = /^\s*(\/\/|\*|\/\*)/.test(line);
          const exists = real.has(folder);
          let kind;
          if (comment) kind = "comment";
          else if (!exists) kind = "fixture-plant";
          else if (KNOWN_READERS_FOR_05.has(slash(path.relative(repoRoot, file)))) kind = "reader (05 retires)";
          else kind = "string-or-pattern";
          rows.push({ file: slash(path.relative(repoRoot, file)), line: index + 1, folder, kind, text: line.trim() });
        }
      });
    }
  }
  return rows;
}

// ── the tests ─────────────────────────────────────────────────────────────────────────────────

export const workArchiveIsAMoveTests = [
  // ============================================================================
  // 00_archive-moves-a-done-driver-verbatim.feature
  // ============================================================================

  // Scenario: archiving a done milestone moves its folder verbatim under archive/
  {
    name: "work/archive-is-a-move: 00 archiving a done milestone moves its folder verbatim under archive/",
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        const git = await gitInit(root);
        const before = await snapshot(work);
        const { status, doc } = archiveJson(root, ["12"], home);
        assert.equal(status, 0, "exit 0");

        assert.ok(!existsSync(path.join(work, "12_milestone_theta")), "the folder is gone from the stream root");
        assert.ok(existsSync(path.join(work, "archive", "12_milestone_theta")), "…and exists under archive/");
        const after = await snapshot(work);
        for (const file of [
          "stories/00_story_theta-one/STORY.md",
          "runs/.heartbeats.ndjson",
          "tasks/00_theta.feature",
          "reference/retired.mjs",
        ]) {
          const moved = bytesOf(after, `archive/12_milestone_theta/${file}`);
          assert.ok(moved != null, `archive/12_milestone_theta/${file} exists`);
          if (file.endsWith(".md")) continue;
          assert.ok(moved.equals(bytesOf(before, `12_milestone_theta/${file}`)), `${file} is byte-identical to the file it was before the move`);
        }

        // SPEC.md differs from its pre-move bytes ONLY on the link lines task 01 names.
        const specBefore = bytesOf(before, "12_milestone_theta/SPEC.md").toString("latin1");
        const specAfter = bytesOf(after, "archive/12_milestone_theta/SPEC.md").toString("latin1");
        const frontmatter = (text) => text.match(/^---\n[\s\S]*?\n---\n/)[0];
        assert.equal(frontmatter(specAfter), frontmatter(specBefore), "the frontmatter block is byte-identical");
        assert.match(specAfter, /^status: done$/m, "status: done stays");
        assert.match(specAfter, /^updated: 2026-09-11$/m, "updated: is not bumped");
        const linesBefore = specBefore.split("\n");
        const linesAfter = specAfter.split("\n");
        assert.equal(linesAfter.length, linesBefore.length, "no line was added or removed");
        linesBefore.forEach((line, index) => {
          if (line === linesAfter[index]) return;
          assert.match(line, /\]\(/, `only a link line differs (line ${index + 1}: ${line})`);
        });

        assert.deepEqual(doc, {
          archived: [{ ref: "12", type: "milestone", slug: "theta", name: "12_milestone_theta", from: slash(path.join(work, "12_milestone_theta")), to: slash(path.join(work, "archive", "12_milestone_theta")) }],
          rewritten: REWRITTEN_AFTER_12,
        });

        // No number: line anywhere changed.
        for (const [file, { bytes }] of before) {
          if (!file.endsWith(".md")) continue;
          const numberBefore = bytes.toString("latin1").match(/^number:.*$/m)?.[0] ?? null;
          const numberAfter = bytesOf(after, remappedRel(file, ["12_milestone_theta"])).toString("latin1").match(/^number:.*$/m)?.[0] ?? null;
          assert.equal(numberAfter, numberBefore, `${file}: the number: line is untouched`);
        }

        // git sees renames for the moved folder and modifications for exactly the rewritten files.
        // (`-M25%`: the fixture's record docs are a dozen lines, half of them the links under test,
        // so they fall under `git status`'s default 50% similarity; a real record doc does not.)
        assert.equal(git(["add", "-A"]).status, 0);
        const changes = git(["diff", "--cached", "--name-status", "-M25%"]).stdout.split(/\r?\n/).filter(Boolean).map((line) => line.split("\t"));
        const renames = changes.filter(([kind]) => kind.startsWith("R"));
        assert.equal(renames.length, 6, `every file of the moved folder reports as a rename (${changes.map((row) => row.join(" ")).join(" | ")})`);
        for (const [, from, to] of renames) {
          assert.ok(from.startsWith("wiki/work/12_milestone_theta/") && to === from.replace("wiki/work/12_milestone_theta/", "wiki/work/archive/12_milestone_theta/"), `a rename of the moved folder (${from} -> ${to})`);
        }
        const modified = changes.filter(([kind]) => kind === "M").map(([, file]) => file.replace(/^wiki\/work\//, "")).sort();
        const expectedModified = REWRITTEN_AFTER_12.map((entry) => entry.path).filter((entry) => !entry.startsWith("archive/12_milestone_theta/")).sort();
        assert.deepEqual(modified, expectedModified, "modifications are exactly the rewritten files outside the moved folder (the moved ones report as R)");
        assert.deepEqual(changes.filter(([kind]) => kind === "A" || kind === "D"), [], "nothing is a bare add or delete");
      })),
  },

  // Scenario: the render is exactly one line
  {
    name: "work/archive-is-a-move: 00 the render (without --json) is exactly one line with task 01's counts",
    run: () =>
      withHome((home) => withFixture(async ({ root }) => {
        const result = runCli(root, ["work", "archive", "12"], { home });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout.trimEnd(), `Archived 12 → archive/12_milestone_theta (${LINKS_AFTER_12} link(s) rewritten in ${REWRITTEN_AFTER_12.length} file(s)).`);
      })),
  },

  // Scenario: every reader that resolves by ref still answers for the archived item, and every
  // walker that answers "what is next" does not
  {
    name: "work/archive-is-a-move: 00 every reader that resolves by ref still answers for the archived item, and every walker that answers what-is-next does not",
    run: () =>
      withHome((home) => withFixture(async ({ root, work, workspace }) => {
        const validateBefore = await validateWork(work, workspace.config);
        const doctorBefore = await doctorWork(work, workspace.config, "12", { now: Date.parse("2026-09-11T00:00:00Z"), projectRoot: root });
        assert.equal(archiveJson(root, ["12"], home).status, 0);

        const find12 = parse(runCli(root, ["work", "find", "12", "--json"], { home }));
        assert.equal(find12.length, 1);
        const { dir, answeredFrom, ...row } = find12[0];
        assert.deepEqual(row, { ref: "12", type: "milestone", slug: "theta", status: "done", title: "Theta", parent: null, archived: true });
        assert.ok(slash(dir).endsWith("archive/12_milestone_theta"), `dir ends in archive/12_milestone_theta (${dir})`);
        const find1200 = parse(runCli(root, ["work", "find", "12/00", "--json"], { home }));
        assert.equal(find1200.length, 1);
        assert.equal(find1200[0].archived, true);
        assert.equal(find1200[0].parent, "12");

        const doc = runCli(root, ["work", "doc", "12", "SPEC"], { home });
        assert.equal(doc.status, 0, doc.stderr);
        assert.match(doc.stdout, /# 12 · Theta/, "doc 12 SPEC prints the moved SPEC.md");
        assert.match(doc.stdout, /\]\(\.\.\/\.\.\/10_milestone_alpha\/SPEC\.md\)/, "…the moved one, with its rewritten link");

        const validateAfter = await validateWork(work, workspace.config);
        const problems = (report) => (report.findings ?? []).map((finding) => `${slash(finding.path ?? "")}: ${finding.problem}`);
        assert.ok(problems(validateAfter).every((line) => !line.includes("12_milestone_theta")), `validate reports no finding naming 12_milestone_theta (${problems(validateAfter).join(" | ")})`);
        assert.deepEqual(problems(validateAfter), problems(validateBefore), "validate reports no finding it did not report before the move");
        const doctorAfter = await doctorWork(work, workspace.config, "12", { now: Date.parse("2026-09-11T00:00:00Z"), projectRoot: root });
        const codes = (report) => (report.findings ?? []).map((finding) => finding.code).sort();
        assert.deepEqual(codes(doctorAfter), codes(doctorBefore), "doctor 12 reports no finding it did not report before the move");

        const next = parse(runCli(root, ["work", "next", "--json"], { home }));
        const nextRefs = JSON.stringify(next);
        assert.ok(!/"12(\/00)?"/.test(nextRefs), `next proposes nothing under 12 (${nextRefs.slice(0, 200)})`);
        const list = parse(runCli(root, ["work", "list", "--json"], { home }));
        assert.ok(!refsOf(list).includes("12") && !refsOf(list).includes("12/00"), "the default list carries no row for 12 or 12/00");
        const all = parse(runCli(root, ["work", "list", "--all", "--json"], { home }));
        assert.equal(byRef(all, "12")?.archived, true);
        assert.equal(byRef(all, "12/00")?.archived, true);

        const next11 = parse(runCli(root, ["work", "next", "11", "--json"], { home }));
        assert.equal(next11.state, "ready", `11's depends: [12] is satisfied by the archived done driver (${JSON.stringify(next11).slice(0, 200)})`);
      })),
  },

  // Scenario Outline: every refusal is coded, names what it found, and lands before any write
  ...[
    { precondition: "nothing changed", argv: [], code: "archive-missing-ref", names: ["aof work archive <NN> | --done"] },
    { precondition: "nothing changed", argv: ["12", "--done"], code: "archive-both-forms", names: ["12", "--done", "two forms of one verb"] },
    { precondition: "nothing changed", argv: ["99"], code: "archive-not-found", names: ["99"] },
    { precondition: "nothing changed", argv: ["12/00"], code: "archive-not-a-driver", names: ["12/00", "moves with its milestone"] },
    { precondition: "nothing changed", argv: ["gamma"], code: "archive-backlog-ref", names: ["gamma", "backlog/chore_gamma", "aof work promote"] },
    { precondition: "nothing changed", argv: ["05"], code: "archive-already-archived", names: ["05", "archive/05_milestone_zeta"] },
    { precondition: "10_milestone_alpha (in-progress)", argv: ["10"], code: "archive-not-done", names: ["10", "in-progress"] },
    { precondition: "11_chore_beta rewritten to in-review", argv: ["11"], code: "archive-not-done", names: ["11", "in-review"], change: (work) => writeItem(work, "11_chore_beta", { type: "chore", number: "11", slug: "beta", status: "in-review", title: "Beta", depends: "[12]", body: BETA_BODY }) },
    { precondition: "11_chore_beta rewritten to blocked", argv: ["11"], code: "archive-not-done", names: ["11", "blocked"], change: (work) => writeItem(work, "11_chore_beta", { type: "chore", number: "11", slug: "beta", status: "blocked", title: "Beta", depends: "[12]", body: BETA_BODY }) },
    { precondition: "11_chore_beta left at not-started", argv: ["11"], code: "archive-not-done", names: ["11", "not-started"] },
    { precondition: "an empty folder archive/12_milestone_theta created by hand", argv: ["12"], code: "archive-destination-exists", names: ["archive/12_milestone_theta"], change: (work) => mkdir(path.join(work, "archive", "12_milestone_theta"), { recursive: true }) },
    { precondition: "12_milestone_theta/SPEC.md rewritten with its status: line deleted", argv: ["12"], code: "archive-not-done", names: ["12", "no status"], change: async (work) => {
      const file = path.join(work, "12_milestone_theta", "SPEC.md");
      await writeFile(file, (await readFile(file, "utf8")).replace(/^status: done\n/m, ""), "utf8");
    } },
  ].map((row) => ({
    name: `work/archive-is-a-move: 00 refusal ${row.code} — ${row.precondition}, argv [${row.argv.join(" ")}]`,
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        if (row.change) await row.change(work);
        const before = await snapshot(work);
        const { status, doc } = archiveJson(root, row.argv, home);
        assert.equal(status, 1, "exit 1");
        assert.equal(doc.ok, false);
        assert.equal(doc.code, row.code);
        assert.equal(typeof doc.error, "string");
        for (const name of row.names) assert.ok(doc.error.includes(name), `the message names ${name} (${doc.error})`);
        assertIdentical(before, await snapshot(work), "a refused archive leaves the work dir byte-identical");
      })),
  })),

  // Scenario Outline: the verb answers every top-level driver type, and only a top-level driver
  ...[
    { type: "chore", folder: "13_chore_iota", ref: "13", slug: "iota" },
    { type: "spike", folder: "14_spike_kappa", ref: "14", slug: "kappa" },
    { type: "uat", folder: "15_uat_lambda", ref: "15", slug: "lambda" },
    { type: "story", folder: "16_story_mu", ref: "16", slug: "mu" },
    { type: "milestone", folder: "12_milestone_theta", ref: "12", slug: "theta" },
  ].map((row) => ({
    name: `work/archive-is-a-move: 00 the verb answers a done top-level ${row.type} (${row.folder})`,
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        if (!existsSync(path.join(work, row.folder))) {
          await writeItem(work, row.folder, { type: row.type, number: row.ref, slug: row.slug, status: "done", title: row.slug });
        }
        const recordDoc = { milestone: "SPEC.md", story: "STORY.md", uat: "SESSION.md", spike: "SPIKE.md", chore: "CHORE.md" }[row.type];
        const before = (await readFile(path.join(work, row.folder, recordDoc))).toString("latin1");
        const { status, doc } = archiveJson(root, [row.ref], home);
        assert.equal(status, 0, JSON.stringify(doc));
        const { from, to, ...identity } = doc.archived[0];
        assert.deepEqual(identity, { ref: row.ref, type: row.type, slug: row.slug, name: row.folder });
        assert.ok(existsSync(path.join(work, "archive", row.folder)));
        // "Its record doc byte-identical" — except the crossing links task 01 rewrites (12's and
        // 13's fixture docs carry one): the frontmatter block is byte-identical, no line is added
        // or removed, and every line that differs is a link line.
        const after = (await readFile(path.join(work, "archive", row.folder, recordDoc))).toString("latin1");
        const frontmatter = (text) => text.match(/^---\n[\s\S]*?\n---\n/)[0];
        assert.equal(frontmatter(after), frontmatter(before), "the record doc's frontmatter is byte-identical");
        const beforeLines = before.split("\n");
        const afterLines = after.split("\n");
        assert.equal(afterLines.length, beforeLines.length);
        beforeLines.forEach((line, index) => {
          if (line !== afterLines[index]) assert.match(line, /\]\(/, `only a link line differs (${line})`);
        });
        if (!before.includes("](")) assert.equal(after, before, "a record doc with no link is byte-identical");
        const [found] = await findWork(work, row.ref);
        assert.equal(found.archived, true);
        assert.equal(found.status, "done");
      })),
  })),

  // Scenario: the verb is registered, and every hand-kept ledger learned it consciously
  {
    name: "work/archive-is-a-move: 00 the verb is registered with its own flags, and every hand-kept ledger learned it consciously",
    run: async () => {
      const command = listCommands().find((entry) => entry.id === "work:archive");
      assert.ok(command, "work:archive is registered");
      assert.deepEqual(command.cli.route, ["work", "archive"]);
      assert.deepEqual(Object.keys(command.cli.spec.flags).sort(), ["done", "force", "yes"]);
      const face = stripComments(await readFile(path.join(repoRoot, "src", "commands", "archive.mjs"), "utf8"));
      assert.doesNotMatch(face, /insert-shared\.mjs/, "the face carries no import of insert-shared.mjs");
      assert.match(face, /export const ARCHIVE_FLAGS/, "the flags are declared in the module");

      const read = (file) => readFile(path.join(repoRoot, ...file.split("/")), "utf8");
      const contract = await read("test/command/command-core-contract.test.mjs");
      assert.match(contract, /"work:archive",/, "WORK_IDS names work:archive");
      const bijection = await read("test/arch/work/acd-work-command-cli-bijection.test.mjs");
      assert.match(bijection, /case "archive": return \["work", "archive", "999", "--json"\]/, "the bijection drives archive 999 --json");
      assert.match(bijection, /"promote", "archive"\]\.includes\(sub\) \? \[0, 1\]/, "…and accepts exit 1 for it");
      const routes = await read("test/arch/work/acd-work-command-route-coverage.test.mjs");
      assert.match(routes, /\r?\n\s*"archive",\r?\n/, "BOARD_DEFERRED names archive");
      assert.match(routes, /milestone 127 \/ story 03[\s\S]{0,900}\n\s*"archive",/, "…with its reason");
      const budget = await read("test/arch/testing/acd-source-directory-budget.test.mjs");
      // `src/work` reads 43 since 127/04 landed `item-row.mjs` on the same row (the ledger is ONE
      // table; the sibling that raises it next moves this literal with it). 03's own claim — the
      // row names 127/03 and `archive.mjs` — is unchanged.
      for (const [directory, ceiling, file] of [["src/commands", 69, "archive.mjs"], ["src/work", 43, "archive.mjs"], ["test/work/stream", 34, "work-archive-is-a-move.test.mjs"], ["test/arch/work", 49, "acd-archive-never-renumbers.test.mjs"]]) {
        const start = budget.indexOf(`directory: "${directory}",`);
        const block = budget.slice(start, budget.indexOf("}),", start));
        assert.match(block, new RegExp(`ceiling: ${ceiling},`), `${directory} reads ${ceiling}`);
        assert.ok(block.includes("127/03") && block.includes(file), `${directory}'s why names 127/03 and ${file}`);
      }
    },
  },
  {
    name: "work/archive-is-a-move: 00 an unknown flag is refused by the generic face with the usage",
    run: () =>
      withHome((home) => withFixture(async ({ root }) => {
        const { status, doc } = archiveJson(root, ["12", "--at", "3"], home);
        assert.equal(status, 1);
        assert.equal(doc.code, "unknown-flag");
        assert.ok(doc.error.includes("aof work archive <NN> | --done [--yes] [--json]"), doc.error);
      })),
  },

  // ============================================================================
  // 01_only-the-links-that-cross-the-line-are-rewritten.feature
  // ============================================================================

  // Scenario: every relative link in the tree resolves to the same path after the move as before
  {
    name: "work/archive-is-a-move: 01 every relative link in the tree resolves to the same path after the move as before",
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        const names = ["12_milestone_theta"];
        const before = await collectLinks(work);
        assert.equal(before.length, 22, `the census found the fixture's 22 relative links (${before.length})`);
        const { status, doc } = archiveJson(root, ["12"], home);
        assert.equal(status, 0);
        const after = await collectLinks(work);
        const key = (link, resolved, file) => `${file} -> ${slash(resolved)}`;
        const expected = before.map((link) => key(link, remapped(work, link.resolved, names), remappedRel(link.file, names))).sort();
        const actual = after.map((link) => key(link, link.resolved, link.file)).sort();
        assert.deepEqual(actual, expected, "every link resolves to the same (remapped) absolute path");
        const existing = (links, file) => links.filter((link) => link.exists).map((link) => `${file(link)} -> ${link.target.replace(/^.*\//, "")}`).sort();
        assert.deepEqual(existing(after, (link) => link.file), existing(before, (link) => remappedRel(link.file, names)), "the set of links resolving to an existing file is the same");
        assert.ok(after.some((link) => link.target.includes("99_milestone_gone") && !link.exists), "[gone] is still absent");
        assert.deepEqual(doc.rewritten, REWRITTEN_AFTER_12, "rewritten names exactly the files that changed, with counts, ordered by path");
      })),
  },

  // Scenario Outline: a link that crosses the line is rewritten by its shape, and a link that
  // does not is untouched — asserted per FILE: the expected text is the recorded text with
  // exactly the named edits applied, so "every other byte is unchanged" is the equality itself.
  ...Object.entries([...OUTWARD, ...INWARD].reduce((byFile, [file, before, after]) => {
    (byFile[file] ??= []).push([before, after]);
    return byFile;
  }, {})).map(([file, edits]) => ({
    name: `work/archive-is-a-move: 01 ${file} — ${edits.length} link(s) rewritten by shape, every other byte unchanged`,
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        const before = await snapshot(work);
        const oldFile = file.startsWith("archive/12_milestone_theta/") ? file.slice("archive/".length) : file;
        assert.equal(archiveJson(root, ["12"], home).status, 0);
        const actual = (await readFile(path.join(work, ...file.split("/")))).toString("latin1");
        assert.equal(actual, expectedText(bytesOf(before, oldFile), edits));
      })),
  })),
  {
    name: "work/archive-is-a-move: 01 the fenced link is a link, and the untouched shapes stay untouched",
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        assert.equal(archiveJson(root, ["12"], home).status, 0);
        const spec = await readFile(path.join(work, "archive", "12_milestone_theta", "SPEC.md"), "latin1");
        assert.match(spec, /```\na fenced link: \]\(\.\.\/\.\.\/10_milestone_alpha\/SPEC\.md\)\n```/, "the fenced link gained the same ../");
        for (const [file, target] of UNTOUCHED) {
          const text = await readFile(path.join(work, ...file.split("/")), "latin1");
          assert.ok(text.includes(`](${target})`), `${file} still carries ](${target})`);
        }
        assert.match(spec, /see 10\/ADR-001/, "a citation by ref is not a link");
        const beta = await readFile(path.join(work, "11_chore_beta", "CHORE.md"), "utf8");
        assert.match(beta, /^depends: \[12\]$/m, "a number is never written");
      })),
  },

  // Scenario: links between two items archived in the same run are left alone, and the same links
  // are rewritten when the items are archived one at a time
  {
    name: "work/archive-is-a-move: 01 links between two items archived in the same run are left alone",
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        const { status, doc } = archiveJson(root, ["--done", "--yes"], home);
        assert.equal(status, 0);
        assert.deepEqual(refsOf(doc.archived), ["12", "13"]);
        assert.match(await readFile(path.join(work, "archive", "13_chore_iota", "CHORE.md"), "utf8"), /\[theta\]\(\.\.\/12_milestone_theta\/SPEC\.md\)/);
        assert.match(await readFile(path.join(work, "archive", "12_milestone_theta", "SPEC.md"), "utf8"), /\[iota\]\(\.\.\/13_chore_iota\/CHORE\.md\)/);
        assert.ok(!doc.rewritten.some((entry) => entry.path === "archive/13_chore_iota/CHORE.md"), "iota's only link points into 12 and is untouched");
        assert.ok(doc.rewritten.some((entry) => entry.path === "archive/12_milestone_theta/SPEC.md" && entry.links === 6), "theta's SPEC lost the iota rewrite (6, not 7)");
      })),
  },
  {
    name: "work/archive-is-a-move: 01 archived one at a time, the same links are rewritten in turn and the two orders converge in resolution (flagged: not in bytes)",
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        assert.equal(archiveJson(root, ["12"], home).status, 0);
        assert.match(await readFile(path.join(work, "13_chore_iota", "CHORE.md"), "utf8"), /\[theta\]\(\.\.\/archive\/12_milestone_theta\/SPEC\.md\)/);
        assert.match(await readFile(path.join(work, "archive", "12_milestone_theta", "SPEC.md"), "utf8"), /\[iota\]\(\.\.\/\.\.\/13_chore_iota\/CHORE\.md\)/);
        const between = await collectLinks(work);
        assert.equal(archiveJson(root, ["13"], home).status, 0);
        // The syntactic rule, applied in turn: outward gains one `../`, inward gains `archive/`.
        const iota = await readFile(path.join(work, "archive", "13_chore_iota", "CHORE.md"), "utf8");
        const theta = await readFile(path.join(work, "archive", "12_milestone_theta", "SPEC.md"), "utf8");
        assert.match(iota, /\[theta\]\(\.\.\/\.\.\/archive\/12_milestone_theta\/SPEC\.md\)/);
        assert.match(theta, /\[iota\]\(\.\.\/\.\.\/archive\/13_chore_iota\/CHORE\.md\)/);
        // …and both resolve to what they resolved to before the second move, which is what the
        // `--done` run's untouched `../12_…` / `../13_…` resolve to as well.
        const after = await collectLinks(work);
        const pick = (links, file, needle) => slash(links.find((link) => link.file === file && link.target.includes(needle)).resolved);
        assert.equal(pick(after, "archive/13_chore_iota/CHORE.md", "12_milestone_theta"), slash(path.join(work, "archive", "12_milestone_theta", "SPEC.md")));
        assert.equal(pick(between, "13_chore_iota/CHORE.md", "12_milestone_theta"), pick(after, "archive/13_chore_iota/CHORE.md", "12_milestone_theta"));
        assert.equal(pick(after, "archive/12_milestone_theta/SPEC.md", "13_chore_iota"), slash(path.join(work, "archive", "13_chore_iota", "CHORE.md")));
        assert.equal(slash(remapped(work, pick(between, "archive/12_milestone_theta/SPEC.md", "13_chore_iota"), ["13_chore_iota"])), pick(after, "archive/12_milestone_theta/SPEC.md", "13_chore_iota"));
      })),
  },

  // Scenario: the rewriter opens only markdown, writes only what changed, and pins every file's
  // own bytes
  {
    name: "work/archive-is-a-move: 01 the rewriter opens only markdown, writes only what changed, and pins every file's own bytes",
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        const before = await snapshot(work);
        // A coarse filesystem clock must not make "kept its mtime" vacuous.
        await new Promise((resolve) => setTimeout(resolve, 30));
        assert.equal(archiveJson(root, ["12"], home).status, 0);
        const after = await snapshot(work);

        assert.ok(bytesOf(after, "archive/12_milestone_theta/tasks/00_theta.feature").equals(bytesOf(before, "12_milestone_theta/tasks/00_theta.feature")));
        assert.ok(bytesOf(after, "archive/12_milestone_theta/tasks/00_theta.feature").toString().includes("](../10_milestone_alpha/SPEC.md)"));
        assert.ok(bytesOf(after, "archive/12_milestone_theta/reference/retired.mjs").equals(bytesOf(before, "12_milestone_theta/reference/retired.mjs")));
        assert.ok(bytesOf(after, "archive/12_milestone_theta/reference/retired.mjs").toString().includes('import "../../../../src/work.mjs"'));

        for (const [oldFile, newFile] of [
          ["12_milestone_theta/runs/.heartbeats.ndjson", "archive/12_milestone_theta/runs/.heartbeats.ndjson"],
          ["10_milestone_alpha/SPEC.md", "10_milestone_alpha/SPEC.md"],
          ["archive/06_chore_eta/CHORE.md", "archive/06_chore_eta/CHORE.md"],
        ]) {
          assert.equal(after.get(newFile).mtimeMs, before.get(oldFile).mtimeMs, `${newFile} kept its mtime`);
        }

        const state = bytesOf(after, "archive/12_milestone_theta/STATE.md").toString("latin1");
        assert.ok(!/[^\r]\n/.test(state) && !state.startsWith("\n"), "every line of the CRLF file still ends \\r\\n");
        assert.equal(state.length, THETA_STATE_CRLF.length + 3, "its byte length grew by exactly 3");

        for (const [file, { bytes }] of before) {
          if (!file.endsWith(".md")) continue;
          const moved = bytesOf(after, remappedRel(file, ["12_milestone_theta"]));
          assert.equal(moved[moved.length - 1] === 0x0a, bytes[bytes.length - 1] === 0x0a, `${file} neither gained nor lost a trailing newline`);
          const fm = (buffer) => buffer.toString("latin1").match(/^---\r?\n[\s\S]*?\r?\n---/)?.[0] ?? null;
          assert.equal(fm(moved), fm(bytes), `${file}: no frontmatter line changed`);
        }
      })),
  },

  // ============================================================================
  // 02_done-archives-every-done-driver-behind-one-gate.feature
  // ============================================================================

  {
    name: "work/archive-is-a-move: 02 without --yes, --done lists what it would move and moves nothing",
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        const before = await snapshot(work);
        const { status, doc } = archiveJson(root, ["--done"], home);
        assert.equal(status, 1);
        assert.equal(doc.ok, false);
        assert.equal(doc.code, "archive-confirm-required");
        assert.deepEqual(doc.candidates, [
          { ref: "12", name: "12_milestone_theta", type: "milestone" },
          { ref: "13", name: "13_chore_iota", type: "chore" },
        ]);
        assert.ok(doc.error.indexOf("12 (12_milestone_theta)") < doc.error.indexOf("13 (13_chore_iota)"), doc.error);
        assert.ok(doc.error.endsWith("re-run with --yes to confirm."), doc.error);
        assertIdentical(before, await snapshot(work), "nothing moved");
      })),
  },
  {
    name: "work/archive-is-a-move: 02 with --yes, --done moves every done root driver in one run and reports each",
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        const before = await snapshot(work);
        const { status, doc } = archiveJson(root, ["--done", "--yes"], home);
        assert.equal(status, 0);
        for (const name of ["12_milestone_theta", "13_chore_iota"]) {
          assert.ok(existsSync(path.join(work, "archive", name)) && !existsSync(path.join(work, name)), `${name} moved`);
        }
        assert.deepEqual(refsOf(doc.archived), ["12", "13"]);
        const paths = doc.rewritten.map((entry) => entry.path);
        for (const expected of [
          "11_chore_beta/CHORE.md",
          "10_milestone_alpha/stories/00_story_alpha-one/STORY.md",
          "10_milestone_alpha/mocks/README.md",
          "TECH_DEBT.md",
          "backlog/chore_gamma/CHORE.md",
          "archive/05_milestone_zeta/SPEC.md",
          "archive/12_milestone_theta/SPEC.md",
          "archive/12_milestone_theta/STATE.md",
          "archive/12_milestone_theta/stories/00_story_theta-one/STORY.md",
        ]) assert.ok(paths.includes(expected), `rewritten names ${expected}`);
        assert.ok(!paths.includes("archive/13_chore_iota/CHORE.md"), "…and NOT iota, whose only link points into 12");
        assert.ok(existsSync(path.join(work, "10_milestone_alpha")) && existsSync(path.join(work, "11_chore_beta")), "the live drivers stay at the root");
        const after = await snapshot(work);
        for (const leaf of ["backlog/chore_gamma/CHORE.md", "backlog/ideas/milestone_delta/SPEC.md", "backlog/ideas/later/spike_epsilon/SPIKE.md"]) {
          if (leaf === "backlog/chore_gamma/CHORE.md") continue; // gamma's crossing link is rewritten (task 01)
          assert.ok(bytesOf(after, leaf).equals(bytesOf(before, leaf)), `${leaf} is byte-identical`);
        }
        const list = parse(runCli(root, ["work", "list", "--json"], { home }));
        assert.deepEqual(refsOf(list), ["10", "10/00", "11", "gamma", "delta", "epsilon"]);
        const all = parse(runCli(root, ["work", "list", "--all", "--json"], { home }));
        assert.deepEqual(refsOf(all), ["10", "10/00", "11", "gamma", "delta", "epsilon", "05", "05/00", "06", "12", "12/00", "13"]);
        for (const ref of ["05", "05/00", "06", "12", "12/00", "13"]) assert.equal(byRef(all, ref).archived, true, `${ref} is archived: true`);
      })),
  },
  {
    name: "work/archive-is-a-move: 02 the --done render is one line per driver then the count",
    run: () =>
      withHome((home) => withFixture(async ({ root }) => {
        const result = runCli(root, ["work", "archive", "--done", "--yes"], { home });
        assert.equal(result.status, 0, result.stderr);
        const lines = result.stdout.trimEnd().split(/\r?\n/);
        assert.equal(lines.length, 3);
        assert.match(lines[0], /^Archived 12 → archive\/12_milestone_theta \(.*\)\.$/);
        assert.match(lines[1], /^Archived 13 → archive\/13_chore_iota \(.*\)\.$/);
        assert.equal(lines[2], "Archived 2 item(s).");
      })),
  },

  // Scenario Outline: the selection is exactly the done drivers at the root
  ...[
    { change: "nothing changed", archived: ["12", "13"], still: ["10_milestone_alpha"] },
    { change: "13_chore_iota rewritten to in-review", archived: ["12"], still: ["13_chore_iota"], apply: (work) => writeItem(work, "13_chore_iota", { type: "chore", number: "13", slug: "iota", status: "in-review", title: "Iota", body: IOTA_BODY }) },
    { change: "12_milestone_theta moved under archive/ by hand beforehand", archived: ["13"], still: ["archive/12_milestone_theta"], apply: (work) => rename(path.join(work, "12_milestone_theta"), path.join(work, "archive", "12_milestone_theta")) },
    { change: "backlog/chore_gamma/CHORE.md rewritten to status: done", archived: ["12", "13"], still: ["backlog/chore_gamma"], apply: (work) => writeItem(work, "backlog/chore_gamma", { type: "chore", slug: "gamma", status: "done", title: "Gamma", body: GAMMA_BODY }) },
    { change: "10_milestone_alpha/stories/00_story_alpha-one rewritten to status: done", archived: ["12", "13"], still: ["10_milestone_alpha", "10_milestone_alpha/stories/00_story_alpha-one"], apply: (work) => writeItem(work, "10_milestone_alpha/stories/00_story_alpha-one", { type: "story", number: "00", slug: "alpha-one", parent: "10", status: "done", title: "Alpha one", body: ALPHA_STORY_BODY }) },
    { change: "12 and 13 both rewritten to in-progress", archived: [], still: ["12_milestone_theta", "13_chore_iota"], apply: async (work) => {
      await writeItem(work, "12_milestone_theta", { type: "milestone", number: "12", slug: "theta", status: "in-progress", title: "Theta", body: THETA_SPEC_BODY });
      await writeItem(work, "13_chore_iota", { type: "chore", number: "13", slug: "iota", status: "in-progress", title: "Iota", body: IOTA_BODY });
    } },
    { change: "12_milestone_theta/SPEC.md rewritten with its status: line deleted", archived: ["13"], still: ["12_milestone_theta"], apply: async (work) => {
      const file = path.join(work, "12_milestone_theta", "SPEC.md");
      await writeFile(file, (await readFile(file, "utf8")).replace(/^status: done\n/m, ""), "utf8");
    } },
  ].map((row) => ({
    name: `work/archive-is-a-move: 02 --done selects exactly the done drivers at the root — ${row.change}`,
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        if (row.apply) await row.apply(work);
        const { status, doc } = archiveJson(root, ["--done", "--yes"], home);
        assert.equal(status, 0, JSON.stringify(doc));
        assert.deepEqual(refsOf(doc.archived), row.archived);
        if (row.archived.length === 0) assert.deepEqual(doc, { archived: [], rewritten: [] });
        for (const still of row.still) assert.ok(existsSync(path.join(work, ...still.split("/"))), `${still} is still where it was`);
      })),
  })),
  {
    name: "work/archive-is-a-move: 02 nothing to archive is a clean answer, rendered",
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        await writeItem(work, "12_milestone_theta", { type: "milestone", number: "12", slug: "theta", status: "in-progress", title: "Theta", body: THETA_SPEC_BODY });
        await writeItem(work, "13_chore_iota", { type: "chore", number: "13", slug: "iota", status: "in-progress", title: "Iota", body: IOTA_BODY });
        const result = runCli(root, ["work", "archive", "--done"], { home });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout.trimEnd(), "Nothing to archive: no done driver at the stream root.");
      })),
  },
  {
    name: "work/archive-is-a-move: 02 a collision anywhere in the set refuses the whole run before the first rename",
    run: () =>
      withHome((home) => withFixture(async ({ root, work }) => {
        await mkdir(path.join(work, "archive", "13_chore_iota"), { recursive: true });
        const before = await snapshot(work);
        const { status, doc } = archiveJson(root, ["--done", "--yes"], home);
        assert.equal(status, 1);
        assert.equal(doc.code, "archive-destination-exists");
        assert.ok(doc.error.includes("archive/13_chore_iota"), doc.error);
        assert.ok(existsSync(path.join(work, "12_milestone_theta")), "12 is still at the root");
        assertIdentical(before, await snapshot(work), "no .md file changed");
      })),
  },
  {
    name: "work/archive-is-a-move: 02 --done and <NN> are one verb and refuse each other's flags",
    run: () =>
      withHome(async (home) => {
        await withFixture(async ({ root, work }) => {
          assert.equal(archiveJson(root, ["12", "--done"], home).doc.code, "archive-both-forms");
          const { status, doc } = archiveJson(root, ["12", "--yes"], home);
          assert.equal(status, 0);
          assert.deepEqual(refsOf(doc.archived), ["12"]);
          assert.deepEqual(doc.rewritten, REWRITTEN_AFTER_12, "--yes changes nothing for a named driver");
          assert.ok(existsSync(path.join(work, "13_chore_iota")), "…and archives only the named one");
        });
        await withFixture(async ({ root }) => {
          const { status, doc } = archiveJson(root, ["--done", "--force"], home);
          assert.equal(status, 0);
          assert.deepEqual(refsOf(doc.archived), ["12", "13"], "--force confirms exactly as --yes does");
        });
      }),
  },

  // ============================================================================
  // 03_the-fleet-follows-and-the-one-path-reader-survives.feature
  // ============================================================================

  {
    name: "work/archive-is-a-move: 03 the move raises exactly one stream.archived event carrying what moved, and the publish is its one reactor",
    run: () =>
      withHome((home) => withFixture(async ({ root, work, workspace }) => {
        const env = { AOF_GLOBAL_HOME: home };
        const result = await archive(workspace, { ref: "12" }, { effectsJournalOptions: { env } });
        const journal = await openEffectsJournal({ env });
        try {
          const events = readEvents(journal, { limit: 100 });
          assert.equal(events.length, 1, `exactly one event (${events.map((event) => event.name).join(", ")})`);
          const [event] = events;
          assert.equal(event.name, "stream.archived");
          assert.equal(event.source, "stream-transition");
          assert.deepEqual(event.payload, {
            workspaceRoot: root,
            workspaceId: resolveWorkspaceId(workspace) ?? null,
            archived: [{ ref: "12", name: "12_milestone_theta", from: path.join(work, "12_milestone_theta"), to: path.join(work, "archive", "12_milestone_theta") }],
            rewritten: result.rewritten,
          });
          const steps = readEventSteps(journal, event.eventId);
          assert.deepEqual(steps.map((step) => step.key), ["publish-projection"]);
          assert.ok(steps.every((step) => step.status !== "pending"), `each step settled after the drain (${steps.map((step) => step.status).join(", ")})`);
        } finally {
          journal.close();
        }
        assert.deepEqual(EFFECTS["stream.archived"].map(({ key, locus }) => ({ key, locus })), [{ key: "publish-projection", locus: "local" }]);
      })),
  },

  {
    name: "work/archive-is-a-move: 03 the fleet cache follows the move at the same ref",
    run: () =>
      withItemLockFixture(async (fx) => {
        await plantArchiveRows(fx.workDir);
        const published = await publishGlobalWorkSnapshot(fx.workspace, fx.ctx);
        assert.equal(published.published, true, JSON.stringify(published));
        const before = await withStore(fx, (store) => readWorkspaceItems(store, fx.workspaceId));
        const source = (rows, ref) => slash(rows.find((row) => row.ref === ref)?.sourcePath ?? "");
        assert.ok(source(before, "12").endsWith("/wiki/work/12_milestone_theta/SPEC.md"), `the store holds 12 at the root (${source(before, "12")})`);

        await archive(fx.workspace, { ref: "12" }, fx.ctx);

        const after = await withStore(fx, (store) => readWorkspaceItems(store, fx.workspaceId));
        for (const [ref, tail] of [["12", "/wiki/work/archive/12_milestone_theta/SPEC.md"], ["12/00", "/wiki/work/archive/12_milestone_theta/stories/00_story_theta-one/STORY.md"]]) {
          const row = after.find((entry) => entry.ref === ref);
          assert.ok(row, `${ref} is still in the store`);
          assert.ok(slash(row.sourcePath).endsWith(tail), `${ref}'s source_path is under archive/ (${row.sourcePath})`);
          assert.equal(row.status, "done");
        }
        assert.ok(!after.some((row) => slash(row.sourcePath).includes("/wiki/work/12_milestone_theta/")), "no row for the old path");
        const others = (rows) => rows.filter((row) => row.ref !== "12" && row.ref !== "12/00").map((row) => JSON.stringify(row)).sort();
        assert.deepEqual(others(after), others(before), "every other row is byte-identical");

        const find = parse(runCli(fx.root, ["work", "find", "12", "--json"], { home: fx.home }));
        assert.equal(find.length, 1);
        assert.ok(slash(find[0].dir).endsWith("archive/12_milestone_theta"), `find 12 answers a dir under archive/ (${find[0].dir}, from ${find[0].answeredFrom})`);
        assert.ok(["cache", "disk"].includes(find[0].answeredFrom));
      }, { stream: [] }),
  },

  {
    name: "work/archive-is-a-move: 03 a held ref refuses the move through the lock the seam already has",
    run: async () => {
      for (const [seededRef, input, refusedRef] of [["12", { ref: "12" }, "12"], ["12/00", { ref: "12" }, "12"], ["13", { done: true, yes: true }, "13"]]) {
        await withItemLockFixture(async (fx) => {
          await plantArchiveRows(fx.workDir);
          await seedActive(fx, { itemRef: seededRef, node: "aof-wsl" });
          const before = await snapshot(fx.workDir);
          const error = await refuse(() => archive(fx.workspace, input, fx.ctx));
          assert.equal(error.code, ITEM_LOCKED_CODE, `seeded on ${seededRef}: refused with the lock's own code (${error.message})`);
          assert.equal(error.holderNode, "aof-wsl");
          assert.equal(error.scopeRef, refusedRef);
          assertIdentical(before, await snapshot(fx.workDir), `seeded on ${seededRef}: nothing moved, no .md changed`);
          assert.ok(existsSync(path.join(fx.workDir, "12_milestone_theta")), "12 did not move");
        }, { stream: [] });
      }
    },
  },

  {
    name: "work/archive-is-a-move: 03 the engine is reachable only through the seam, and the seam owes the journal nothing it cannot pay",
    run: () =>
      withFixture(async ({ root, work, workspace }) => {
        const callers = [];
        for (const file of await readSrcFiles(repoRoot)) {
          if (file.rel === "work/archive.mjs") continue;
          const code = stripComments(await readFile(file.path, "utf8"));
          if (/\barchiveItems\s*\(/.test(code)) callers.push(`src/${file.rel}`);
        }
        assert.deepEqual(callers, ["src/effects/stream-transitions.mjs"], "archiveItems( is called from the seam and nowhere else");
        const face = stripComments(await readFile(path.join(repoRoot, "src", "commands", "archive.mjs"), "utf8"));
        assert.match(face, /transitionStreamArchived\(/);
        assert.doesNotMatch(face, /archiveItems\s*\(/);

        const engine = await readFile(path.join(repoRoot, "src", "work", "archive.mjs"), "utf8");
        const specifiers = importSpecifiers(engine).map((entry) => entry.specifier);
        for (const specifier of specifiers) {
          assert.ok(specifier.startsWith("node:") || specifier === "../work.mjs", `the engine imports node:* and src/work.mjs at most (${specifier})`);
        }
        const fromWork = stripComments(engine).match(/import\s*\{([^}]*)\}\s*from\s*"\.\.\/work\.mjs"/)?.[1] ?? "";
        assert.deepEqual(fromWork.split(",").map((name) => name.trim()).filter(Boolean).sort(), ["ARCHIVE_ROOT", "isLiveStreamRow", "listItems"], "…and from work.mjs only its readers (and the one predicate)");

        // An unwritable journal: a FILE where the global home's directory should be.
        const blocker = path.join(root, "not-a-dir");
        await writeFile(blocker, "x", "utf8");
        const result = await transitionStreamArchived(workspace, { names: ["12_milestone_theta"] }, { journalOptions: { databasePath: path.join(blocker, "journal.sqlite") } });
        assert.equal(result.eventId, null, "the result carries eventId: null");
        assert.ok(existsSync(path.join(work, "archive", "12_milestone_theta")), "the move still landed");
        assert.deepEqual(result.effects.map((effect) => effect.key), ["publish-projection"], "the publish ran ephemerally");
      }),
  },

  // Scenario Outline: the two path-readers resolve their item by ref and survive its milestone
  // being archived
  ...[
    { test: "test/arch/planning/acd-tune-carries-no-second-rule.test.mjs", literal: "62_milestone_", ref: "62/04", folder: "62_milestone_self-improvement-loop", reads: "STORY.md", suite: tuneReaderTests },
    { test: "test/arch/command/acd-declared-program-single-speller.test.mjs", literal: "72_milestone_", ref: "72/00", folder: "72_milestone_inner-loop", reads: "tasks/00_the-runner-is-declared-or-there-is-no-run.feature", suite: spellerReaderTests },
  ].map((row) => ({
    name: `work/archive-is-a-move: 03 ${path.basename(row.test)} resolves ${row.ref} by ref and survives ${row.folder} being archived`,
    run: async () => {
      const source = await readFile(path.join(repoRoot, ...row.test.split("/")), "utf8");
      assert.ok(!source.includes(row.literal), `no literal ${row.literal} path`);
      assert.ok(source.includes(`await findWork(`) && source.includes(`"${row.ref}"`), `reaches the item through findWork with the ref ${row.ref}`);
      assert.match(source, /run: async \(\) =>/, "the reading test's run is async");

      // The same resolution over a scratch work dir where the folder sits under archive/: the
      // ref answers the archived folder, and the file the reader wants is there.
      const scratch = await mkdtemp(path.join(os.tmpdir(), "aof-127-reader-"));
      try {
        const work = path.join(scratch, "wiki", "work");
        const [storyNumber] = row.ref.split("/").slice(1);
        const storyDir = (await readdir(path.join(repoRoot, "wiki", "work", row.folder, "stories"))).find((name) => name.startsWith(`${storyNumber}_`));
        await cp(path.join(repoRoot, "wiki", "work", row.folder, "SPEC.md"), path.join(work, "archive", row.folder, "SPEC.md"));
        await cp(path.join(repoRoot, "wiki", "work", row.folder, "stories", storyDir), path.join(work, "archive", row.folder, "stories", storyDir), { recursive: true });
        const [resolved] = await findWork(work, row.ref);
        assert.ok(resolved?.archived === true, `${row.ref} resolves with archived: true`);
        assert.ok(existsSync(path.join(resolved.dir, ...row.reads.split("/"))), `the file it reads comes from the archived folder (${row.reads})`);
      } finally {
        await rm(scratch, { recursive: true, force: true });
      }

      // And at HEAD with nothing moved, the control itself is green.
      for (const test of row.suite) await test.run();
    },
  })),

  {
    name: "work/archive-is-a-move: 03 the census of literal item paths outside wiki/ classifies every match, and names the readers 05 must retire (flagged: the contract counted two)",
    run: async () => {
      const rows = await censusItemPathMentions();
      assert.ok(rows.length > 100, `the census read the tree (${rows.length} matches)`);
      const readers = rows.filter((row) => row.kind === "reader (05 retires)");
      assert.ok(readers.length > 0, "the known readers are still present (or retire this list with them)");
      const unknown = rows.filter((row) => row.kind === "string-or-pattern");
      // Every remaining real-folder mention is a string inside a probe's source, fixture data
      // (an anchor, a sourcePath, a citation), or a `git check-attr` PATTERN — none reads.
      for (const row of unknown) {
        assert.doesNotMatch(row.text, /\b(readFile(?:Sync)?|existsSync|readdir(?:Sync)?|import)\s*\(/, `${row.file}:${row.line} does not read the folder it names (${row.text})`);
      }
      // The two readers this story rewrote are no longer in the census at all.
      for (const file of ["test/arch/planning/acd-tune-carries-no-second-rule.test.mjs", "test/arch/command/acd-declared-program-single-speller.test.mjs"]) {
        assert.ok(!rows.some((row) => row.file === file), `${file} names no item folder`);
      }
    },
  },

  // ============================================================================
  // 04_the-prompts-drive-the-verb-and-never-archive-on-their-own.feature
  // ============================================================================

  {
    name: "work/archive-is-a-move: 04 the wrapper is declared, rendered into every runtime, and drives the verb",
    run: async () => {
      const member = readDescriptor().members.find((entry) => entry.id === "archive" && entry.kind === "command");
      assert.ok(member, "bundle.json declares the member archive");
      assert.equal(member.file, "commands/archive.md");
      assert.equal(member.commandNamespace, "aof");
      const dry = parse(runCli(repoRoot, ["work", "update", "--dry-run", "--json"], { home: await mkdtemp(path.join(os.tmpdir(), "aof-127-update-")) }));
      const rendered = [".claude/commands/aof/archive.md", ".codex/skills/aof-archive/SKILL.md", ".opencode/commands/aof/archive.md"];
      for (const file of rendered) {
        assert.ok(existsSync(path.join(repoRoot, ...file.split("/"))), `${file} exists`);
        const action = dry.actions.find((entry) => slash(entry.path) === file);
        assert.equal(action?.action, "skip", `${file} is current — the dry run reports nothing to write`);
      }
      const manifest = JSON.parse(await readFile(path.join(repoRoot, "src", "bundle", "manifest.json"), "utf8"));
      const lock = JSON.parse(await readFile(path.join(repoRoot, ".aof", "aof.lock.json"), "utf8"));
      const manifestEntries = manifest.entries.filter((entry) => rendered.includes(slash(entry.path)));
      const lockEntries = (lock.work?.files ?? []).filter((entry) => rendered.includes(slash(entry.path)));
      // The shipped manifest is generated for the claude and codex renders (the promote precedent
      // carries the same two); the lock carries all three the project renders.
      assert.deepEqual(manifestEntries.map((entry) => slash(entry.path)).sort(), rendered.filter((file) => !file.startsWith(".opencode/")), "the manifest carries the claude + codex renders");
      assert.equal(lockEntries.length, 3, "the lock carries the three renders");
      for (const entry of manifestEntries) {
        const inLock = lockEntries.find((candidate) => slash(candidate.path) === slash(entry.path));
        assert.equal(inLock.hash, entry.hash, `${entry.path}: the lock carries the render's hash`);
      }
      const text = await readFile(path.join(repoRoot, "src", "bundle", "commands", "archive.md"), "utf8");
      for (const needle of ["aof work archive", "--json", "archive-confirm-required", "candidates"]) assert.ok(text.includes(needle), `archive.md contains ${needle}`);
      for (const phrase of [/rename\(/u, / mv /u, /git mv/u, /\.\.\/archive\//u]) assert.doesNotMatch(text, phrase);
    },
  },
  {
    name: "work/archive-is-a-move: 04 the parity control admits work:archive and holds the wrapper honest",
    run: async () => {
      const { archTests } = await import("../../arch/work/acd-work-insert-command-bundle-parity.test.mjs");
      const parity = archTests.find((test) => test.name.includes("every work:insert-* command AND work:promote"));
      const honesty = archTests.find((test) => test.name.includes("/aof:archive wrapper"));
      assert.ok(parity && honesty, "both legs are registered");
      await parity.run();
      await honesty.run();
      // The red probe, over a scratch copy of the wrapper: the honesty leg's own predicate fails
      // naming the phrase a hand-moving prompt would need.
      const text = await readFile(path.join(repoRoot, "src", "bundle", "commands", "archive.md"), "utf8");
      const probed = `${text}\nMove the folder with \`git mv <dir> <work.dir>/archive/\` when the verb refuses.\n`;
      assert.match(probed, /git mv/u, "the probe would be caught by the honesty leg's phrase list");
    },
  },
  {
    name: "work/archive-is-a-move: 04 verify.md gains one line and no prompt but archive.md runs the verb",
    run: async () => {
      const line = "Next, for a milestone just accepted: `aof work archive <NN>` moves its folder under `archive/` — the operator's act, never this ceremony's (127/ADR-004).";
      const verify = await readFile(path.join(repoRoot, "src", "bundle", "commands", "verify.md"), "utf8");
      const output = verify.slice(verify.indexOf("<output>"), verify.indexOf("</output>"));
      assert.ok(output.includes(line), "the line sits inside <output>");
      assert.equal((verify.match(/aof work archive/g) ?? []).length, 1, "verify.md names the verb exactly once");
      for (const rendered of [".claude/commands/aof/verify.md", ".codex/skills/aof-verify/SKILL.md", ".opencode/commands/aof/verify.md"]) {
        assert.ok((await readFile(path.join(repoRoot, ...rendered.split("/")), "utf8")).includes(line), `${rendered} carries the line`);
      }
      const dir = path.join(repoRoot, "src", "bundle", "commands");
      const matches = [];
      for (const file of (await readdir(dir)).filter((name) => name.endsWith(".md")).sort()) {
        if ((await readFile(path.join(dir, file), "utf8")).includes("aof work archive")) matches.push(file);
      }
      assert.deepEqual(matches, ["archive.md", "verify.md"]);
    },
  },
  {
    name: "work/archive-is-a-move: 04 the wrapper's text stops where the verb stops",
    run: async () => {
      const text = await readFile(path.join(repoRoot, "src", "bundle", "commands", "archive.md"), "utf8");
      const process_ = text.slice(text.indexOf("<process>"), text.indexOf("</process>"));
      for (const code of ["archive-not-done", "archive-not-a-driver", "archive-backlog-ref", "archive-already-archived"]) {
        assert.ok(process_.includes(code), `names ${code}`);
      }
      assert.match(process_, /archive-confirm-required[\s\S]*--yes/, "the one refusal answered by re-running with --yes");
      assert.match(process_, /candidates/);
      assert.match(process_, /aof work promote/, "names the door for a backlog row");
      assert.match(process_, /A refusal is never\s+reached around by editing the tree/);
    },
  },
];

// The archive fixture's rows, planted into an item-lock fixture's (mesh-configured) work dir.
async function plantArchiveRows(work) {
  await writeItem(work, "10_milestone_alpha", { type: "milestone", number: "10", slug: "alpha", status: "in-progress", title: "Alpha" });
  await writeItem(work, "11_chore_beta", { type: "chore", number: "11", slug: "beta", title: "Beta", depends: "[12]", body: BETA_BODY });
  await writeItem(work, "12_milestone_theta", { type: "milestone", number: "12", slug: "theta", status: "done", title: "Theta", body: THETA_SPEC_BODY });
  await writeItem(work, "12_milestone_theta/stories/00_story_theta-one", { type: "story", number: "00", slug: "theta-one", parent: "12", status: "done", title: "Theta one", body: THETA_STORY_BODY });
  await writeItem(work, "13_chore_iota", { type: "chore", number: "13", slug: "iota", status: "done", title: "Iota", body: IOTA_BODY });
}
