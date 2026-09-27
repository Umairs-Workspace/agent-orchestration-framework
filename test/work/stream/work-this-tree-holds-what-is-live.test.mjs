// Traceability wiring for milestone 127 / story 05 — "This tree holds what is live".
//
//   tasks/00_the-repository-sets-intake-to-backlog.feature          (@executable)
//   tasks/02_the-outsider-check-passes-on-the-real-stream.feature   (@executable)
//   tasks/01_every-done-driver-moves-under-archive.feature          (@manual — VERIFICATION.md)
//
// THIS SUITE READS THE REAL TREE AND WRITES NOTHING TO IT. Every read of `wiki/work` goes through
// the real CLI as a child process from the repository root (`spawnCliSync`, the way
// `cache-authority-own-disk-read` reads this repository) under an isolated `AOF_GLOBAL_HOME`, so
// the live cache is never opened and every `find` is `answeredFrom: "disk"`, or through the real
// board face (`handleWorkApi`, `projectDir: <repo root>`). The one act that WRITES — the add →
// promote round trip of task 00 — runs on a SHAPE COPY of the stream (every `.md` and `.feature`
// under `wiki/work`, no `runs/`, no `mocks/`, no `renders/`, no `observability/`) under a scratch
// project carrying this repository's own `.aof/aof.config.json`, so the copy has the real live
// root, the real `archive/`, the real `depends:` edges, the real `32_uat` gate and the real
// `42_structural-overhaul`, and `next`'s candidacy walk, `validate`'s numbering lanes and the
// board's derivation run over the stream's actual shape.
//
// A CHECK OVER THE REAL TREE NAMES REAL ITEMS, by ref and by the status read off their own record
// doc — never by a count of folders the next accept would move. `52` is the SPEC's own example of
// an archived milestone; `32` is the live gate satisfied only through archived drivers. The ONE
// hard-coded count is the link ratchet below.
//
// FOUR CONTRACT DELTAS, measured at the build (2026-09-16) and recorded in the milestone STATE.md
// `## Feedback (for retro)` rather than silently resolved:
//   · `aof work validate --json` over the whole tree is NOT `[]` at HEAD, and was not before this
//     story: 117 `story reads path "…" does not exist` findings on done records whose `reads:`
//     cite modules 119 moved, because the public-repo move (2026-09-13) cut the git history the
//     cited-path resolver reads renames from. The move itself adds none once its commit lands
//     (the same resolver follows the 2,289 renames it records), so the claim this suite holds is
//     the RATCHET: no finding of any other class, and no more of that class than before.
//   · `aof work doctor 52 --json` carries eight `control-unresolved` warnings for the same reason
//     (FF-5201…FF-5209 cite `test/arch/acd-loop-*.test.mjs`, moved by 119/03); held as a ratchet.
//   · `aof work init-config --json` re-serialises the config canonically (`JSON.stringify(…, 2)`),
//     and this repository's config carries two hand-compacted lines (b5f6cd5) — so "byte-identical"
//     cannot hold; the verb is run on a COPY of the config and asserted JSON-equal with
//     `intakeWritten: false` and `intake: "backlog"`.
//   · `find --json`'s live row is the frozen seven keys (127/01) — it carries no `number` key, so
//     the promoted row is asserted on `ref` and on the ABSENCE of `backlog`, not on `number`.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { bundleSurface } from "../../support/react-app-harness.mjs";
import { handleWorkApi } from "../../../src/board-ui.mjs";
import { ITEM_RE, ARCHIVE_ROOT, BACKLOG_ROOT, parseFrontmatter, recordDoc } from "../../../src/work.mjs";
import { archTests as intakeWriteSideTests } from "../../arch/work/acd-intake-write-side-only.test.mjs";
import { archTests as tuneReaderTests } from "../../arch/planning/acd-tune-carries-no-second-rule.test.mjs";
import { archTests as spellerReaderTests } from "../../arch/command/acd-declared-program-single-speller.test.mjs";
import { censusItemPathMentions } from "./work-archive-is-a-move.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");
const workRoot = path.join(repoRoot, "wiki", "work");
const MODEL_TS = path.join(repoRoot, "ui", "src", "board", "model.ts");
const THIS_SUITE = "test/work/stream/work-this-tree-holds-what-is-live.test.mjs";

const slash = (value) => String(value).replaceAll("\\", "/");
const refsOf = (rows) => rows.map((row) => row.ref);

// ── THE RATCHETS, measured by the developer immediately before task 01's move ─────────────────
//
// The link census: 03/01's syntactic scan (inline `](…)` links with a RELATIVE target under
// `wiki/work/**/*.md`, resolved against the file's directory, existence checked) over this
// working tree at `ba25547` on 2026-09-16, immediately before `aof work archive --done --yes`.
// Measured again immediately after: 3,069 / 2,312 — identical, every link resolving to the same
// path under the one remap. What the suite pins from it, and why the two halves differ:
//   · the WHOLE tree is a `>=` on both counts. The contract spells `==` on the total, but the
//     live records keep being written — this build's own `VERIFICATION.md` and `STATE.md` entries
//     under 127 raised the total within the hour — and a `==` over a tree that is still authored
//     would red on the next verify's prose, never on a move (delta, STATE.md);
//   · the MOVED files are the `==`: an accepted item's records are never edited, so the links in
//     the files that moved are exactly the links those files held before, and a link the move
//     invented or lost is the one thing that changes the number.
// Re-measured 2026-09-22 at f820ae9 (129's gate, F-73): 3069 → 3067. The two links were the source
// citations inside a TECH_DEBT entry that 130/03 DISCHARGED (c55b2f1) — a shrink-only ledger deletes
// paid entries, and the floor moves down with them. Nothing was lost by the archive move: resolving
// ROSE 2312 → 2317, and the into-archive legs below are untouched.
export const LINKS_BEFORE = Object.freeze({ total: 3067, resolving: 2317, measuredAt: "2026-09-22", commit: "f820ae9" });
export const LINKS_IN_MOVED_BEFORE = Object.freeze({ total: 2810, resolving: 2121 });
// Of the 1,156 links that targeted a folder the move would archive, 48 did not resolve BEFORE it —
// bare `src/work.mjs#L458`-shaped citations in OUTCOME.md files, resolving inside the item folder
// where no such file ever was. "Every link into archive/ resolves" is therefore held as the same
// ratchet: no more broken links into the archive than were broken into those folders before.
// 2026-09-22 (129's gate, F-76): 48 → 51 when 127 itself was archived — its own three bare
// `src/…#L…`-shaped citations moved under archive/ with it (broken before the move inside the root
// folder, broken after inside the archived one; "into archive/" is where they now resolve). Every
// later archive of a folder carrying such citations moves this number the same way.
// 2026-09-24 (130's door, F-23): 51 → 52 when 129 was archived. Its VERIFICATION.md:572 carries a
// literal `](target)` placeholder link, broken inside the root folder before the move and broken
// inside the archived one after it. 132 and 137 carried none.
export const BROKEN_INTO_MOVED_BEFORE = 52;

// The validate ratchet (see the header): the whole-tree finding set at `ba25547`, before the move,
// was 117 findings of exactly one class. The move may not add a finding of any class.
export const VALIDATE_BEFORE = Object.freeze({ findings: 117, problem: /^story reads path "[^"]+" does not exist$/, measuredAt: "2026-09-16", commit: "ba25547" });

// The doctor-52 ratchet (see the header): eight `control-unresolved` warnings at `ba25547`, every
// one a control citing a `test/arch/acd-loop-*.test.mjs` path 119/03 moved, none an error.
export const DOCTOR_52_BEFORE = Object.freeze({ controlUnresolved: 8, measuredAt: "2026-09-16", commit: "ba25547" });

// ── the CLI, as an outsider runs it ──────────────────────────────────────────────────────────

async function withHome(body) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-127-05-home-"));
  try {
    return await body(home);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

function runCli(cwd, args, home) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1", AOF_GLOBAL_HOME: home },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function parse(result, label) {
  assert.ok(result.status != null, `${label}: the CLI ran (stderr: ${result.stderr.slice(0, 300)})`);
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(result.stdout); }, `${label}: one parseable document (stdout: ${result.stdout.slice(0, 300)}; stderr: ${result.stderr.slice(0, 300)})`);
  return parsed;
}

const json = (cwd, args, home) => parse(runCli(cwd, ["work", ...args, "--json"], home), `aof work ${args.join(" ")} --json`);

// The class the ratchet admits, and nothing else.
const isStaleReadsFinding = (finding) => VALIDATE_BEFORE.problem.test(finding.problem);

// ── the real board face, in-process, over a project root ─────────────────────────────────────
//
// The same `writeHead` + `end` shim `test/support/board-face-fixture.mjs` uses (the face's `send`
// is exactly those two synchronous calls). The isolated home is set on `process.env` for the
// duration because the face's mesh overlay opens the store from the process environment.
async function faceList(projectDir, home, { includeArchived = false } = {}) {
  const captured = { status: 200, headers: {}, body: "" };
  const response = {
    writeHead(status, headers) { captured.status = status; captured.headers = headers ?? {}; return this; },
    end(body) { captured.body = typeof body === "string" ? body : body == null ? "" : String(body); },
  };
  const previous = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = home;
  try {
    const handled = await handleWorkApi({ method: "GET", url: `/api/work/list${includeArchived ? "?includeArchived=1" : ""}` }, response, { projectDir });
    assert.equal(handled, true, "the face handled /api/work/list");
  } finally {
    if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previous;
  }
  assert.equal(captured.status, 200, `the face answered 200 (${captured.body.slice(0, 300)})`);
  return JSON.parse(captured.body);
}

// The board's read model, bundled from the REAL `model.ts` through the same esbuild instrument
// the mounted lanes use (test/ui/board-backlog-and-archive), so `deriveBoard` is the production
// derivation and not a re-spelling.
let model = null;
async function loadModel() {
  if (model) return model;
  const source = await bundleSurface({ entry: MODEL_TS, stubs: {}, resolve: [] });
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-127-05-model-"));
  try {
    const file = path.join(tmp, "model.mjs");
    await writeFile(file, source, "utf8");
    model = await import(pathToFileURL(file).href);
    return model;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// ── the shape copy (task 00) ─────────────────────────────────────────────────────────────────

const SHAPE_SKIP = new Set(["runs", "mocks", "renders", "observability"]);

async function walkShape(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SHAPE_SKIP.has(entry.name)) await walkShape(full, out);
    } else if (/\.(md|feature)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Every record doc, ARCHITECTURE/STATE/… and task feature under `wiki/work` — the three roots,
// `TECH_DEBT.md`, `ROADMAP.md`, `loops.md` included — copied byte-for-byte under a scratch project
// with this repository's config. Nothing is renamed or renumbered; `runs/` is not shape.
export async function buildShapeCopy() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-127-05-shape-"));
  const work = path.join(root, "wiki", "work");
  let files = 0;
  for (const file of await walkShape(workRoot)) {
    const to = path.join(work, path.relative(workRoot, file));
    await mkdir(path.dirname(to), { recursive: true });
    await copyFile(file, to);
    files += 1;
  }
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await copyFile(path.join(repoRoot, ".aof", "aof.config.json"), path.join(root, ".aof", "aof.config.json"));
  return { root, work, files };
}

// The `aof:add-milestone` prompt's write under `"backlog"` (02/05): `SPEC.md` + `STATE.md`,
// frontmatter with `type`, `slug`, `title`, `status: not-started`, `depends: []` and NO `number:`.
const ADDED_SLUG = "search-across-the-fleet";
const ADDED_SPEC = [
  "---",
  "type: milestone",
  `slug: ${ADDED_SLUG}`,
  'title: "Search across the fleet"',
  "status: not-started",
  "owner: product-owner",
  // Today's date, as `aof:add-milestone` writes it: a fixed date reds doctor's `mtime-ahead-of-updated`
  // lane the morning after (measured 2026-09-17 at aof:verify 127).
  `created: ${new Date().toISOString().slice(0, 10)}`,
  `updated: ${new Date().toISOString().slice(0, 10)}`,
  "depends: []",
  "schema: 1",
  "aofVersion: 0.1.0",
  "---",
  "# Search across the fleet",
  "",
  "## Objective",
  "",
  "Find a session by what it said, on every node of the fleet.",
  "",
  "## Scope",
  "",
  "## Stories",
  "",
].join("\n");
const ADDED_STATE = "---\ndoc: state\n---\n# Search across the fleet — State\n\n## Progress\n\n## Notes & decisions\n\n## Verification\n";

async function addToBacklog(work) {
  const leaf = path.join(work, BACKLOG_ROOT, `milestone_${ADDED_SLUG}`);
  await mkdir(leaf, { recursive: true });
  await writeFile(path.join(leaf, "SPEC.md"), ADDED_SPEC, "utf8");
  await writeFile(path.join(leaf, "STATE.md"), ADDED_STATE, "utf8");
  return leaf;
}

const rootItemFolders = async (dir) => (await readdir(dir, { withFileTypes: true })).filter((entry) => entry.isDirectory() && ITEM_RE.test(entry.name)).map((entry) => entry.name).sort();
const stripDir = ({ dir, ...rest }) => rest;
// A LIVE row on the listing is the frozen seven keys and nothing else: no `number` (a backlog row
// carries `number: null`), no `archived`. MAX is the highest top-level number among those.
const isLiveRow = (row) => row.number === undefined && row.archived !== true;
// The contract reads MAX off the LIVE rows, which held while the highest number was live. Once the
// highest-numbered driver is archived (137, at 130's door), promote still mints past it, because an
// archived number is never reused (127/ADR-004: `find 137` still answers). So MAX here spans every
// numbered top-level row, live or archived; backlog rows (`number: null`) stay excluded
// (130/VERIFICATION F-23).
const isNumberedRow = (row) => isLiveRow(row) || row.archived === true;
const liveTopLevelMax = (rows) => rows.filter((row) => row.parent == null && isNumberedRow(row)).reduce((max, row) => Math.max(max, Number.parseInt(row.ref, 10)), -1);

// The copy is built once for the add → promote pair (scenario 3 continues scenario 2's copy) and
// removed by the last case that uses it; a fresh one is built for the faithfulness scenario.
let shared = null;
async function sharedCopy() {
  if (shared == null) shared = await buildShapeCopy();
  return shared;
}
async function dropSharedCopy() {
  if (shared == null) return;
  const { root } = shared;
  shared = null;
  await rm(root, { recursive: true, force: true });
}

// ── the link scan (task 02) — 03/01's rule, spelled here so the ratchet is black-box ──────────

const LINK_RE = /\]\(([^\s)]+)[^)]*\)/g;
const isRelativeTarget = (target) => !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith("/") && !target.startsWith("#") && !target.startsWith("\\");
const decodeSegment = (segment) => { try { return decodeURIComponent(segment); } catch { return segment; } };

async function walkAll(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkAll(full, out);
    else out.push(full);
  }
  return out;
}

export async function scanRelativeLinks(work) {
  const links = [];
  const markdownFiles = (await walkAll(work)).filter((f) => f.toLowerCase().endsWith(".md")).sort();
  assert.ok(markdownFiles.length > 0, `the walk of ${work} found markdown to scan (non-vacuous)`);
  for (const file of markdownFiles) {
    const text = (await readFile(file)).toString("latin1");
    for (const match of text.matchAll(LINK_RE)) {
      const target = match[1];
      if (!isRelativeTarget(target)) continue;
      const pathPart = target.split(/[#?]/)[0];
      if (pathPart === "") continue;
      const resolved = path.resolve(path.dirname(file), pathPart.split("/").map(decodeSegment).join("/"));
      links.push({ file: slash(path.relative(work, file)), target, resolved, exists: existsSync(resolved) });
    }
  }
  return links;
}

// ── git, read-only ───────────────────────────────────────────────────────────────────────────

function git(args) {
  const result = spawnCliSync("git", args, { cwd: repoRoot, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, `git ${args.join(" ")} (${result.stderr})`);
  return result.stdout ?? "";
}

// The diff that ADDED the intake line, path-scoped to the config: the working tree's own diff
// while the story is uncommitted, else the commit the pickaxe finds (the first to add the token),
// against its parent. Stable after any later commit touches the file, since the pickaxe names the
// commit that introduced the line and no other.
function intakeDiff() {
  const configPath = ".aof/aof.config.json";
  const pending = git(["diff", "--numstat", "HEAD", "--", configPath]).trim();
  if (pending !== "") return { source: "working tree", diff: git(["diff", "-U0", "HEAD", "--", configPath]) };
  const commit = git(["log", "--format=%H", "--reverse", "-S", '"intake": "backlog"', "--", configPath]).trim().split(/\r?\n/).filter(Boolean)[0];
  assert.ok(commit, "a commit added the intake line");
  return { source: commit.slice(0, 7), diff: git(["diff", "-U0", `${commit}^`, commit, "--", configPath]) };
}

// ── the tests ─────────────────────────────────────────────────────────────────────────────────

export const workThisTreeHoldsWhatIsLiveTests = [
  // ============================================================================
  // 00_the-repository-sets-intake-to-backlog.feature
  // ============================================================================

  // Scenario: the repository's config carries the intake key and nothing else moves
  {
    name: "work/this-tree-holds-what-is-live: 00 the repository's config carries the intake key between work.dir and work.agents, and the diff that added it is exactly one line",
    run: async () => {
      const text = await readFile(path.join(repoRoot, ".aof", "aof.config.json"), "utf8");
      const config = JSON.parse(text);
      assert.equal(config.work.intake, "backlog", "work.intake is exactly the string \"backlog\"");
      const keys = Object.keys(config.work);
      assert.deepEqual(keys.slice(keys.indexOf("dir"), keys.indexOf("dir") + 3), ["dir", "intake", "agents"], "placed between work.dir and work.agents");
      assert.match(text, /^    "intake": "backlog",\r?$/m, "two-space indented like its neighbours, on its own line");

      const { source, diff } = intakeDiff();
      const changed = diff.split(/\r?\n/).filter((line) => /^[+-]/.test(line) && !/^(\+\+\+|---) /.test(line));
      assert.deepEqual(changed, ['+    "intake": "backlog",'], `the diff against the parent (${source}) is exactly one added line and no removed line`);
    },
  },
  {
    name: "work/this-tree-holds-what-is-live: 00 validate and doctor from the repository root are no redder than before the write — no finding outside the pre-existing stale-reads class, no error-level finding",
    run: () =>
      withHome((home) => {
        const findings = json(repoRoot, ["validate"], home);
        assert.ok(Array.isArray(findings), "validate --json answers an array");
        const foreign = findings.filter((finding) => !isStaleReadsFinding(finding));
        assert.deepEqual(foreign, [], "no finding of any class this story could have caused (folder/frontmatter, tags, depends, numbering) — only the pre-existing stale-reads class");
        assert.ok(findings.length <= VALIDATE_BEFORE.findings, `no more stale-reads findings than before the write (${findings.length} <= ${VALIDATE_BEFORE.findings}, measured ${VALIDATE_BEFORE.measuredAt} at ${VALIDATE_BEFORE.commit})`);

        const doctor = json(repoRoot, ["doctor"], home);
        assert.equal(doctor.errors, 0, "doctor reports no error-level finding");
        assert.deepEqual(doctor.findings.filter((finding) => finding.severity === "error"), [], "…and none in its findings");
      }),
  },
  {
    name: "work/this-tree-holds-what-is-live: 00 init-config over this repository's config answers intakeWritten: false and keeps the document JSON-equal — an existing \"backlog\" is kept (02/04's fill-don't-clobber)",
    run: () =>
      withHome(async (home) => {
        // On a COPY of the config: the verb always re-serialises canonically, so the real file is
        // never handed to it (a test never writes the real tree; see the header's third delta).
        const root = await mkdtemp(path.join(os.tmpdir(), "aof-127-05-init-config-"));
        try {
          await mkdir(path.join(root, ".aof"), { recursive: true });
          const before = await readFile(path.join(repoRoot, ".aof", "aof.config.json"), "utf8");
          await writeFile(path.join(root, ".aof", "aof.config.json"), before, "utf8");
          const result = json(root, ["init-config"], home);
          assert.equal(result.intakeWritten, false, "intakeWritten: false — the existing key is kept");
          assert.equal(result.intake, "backlog", "…and reported as backlog");
          assert.equal(result.created, false, "the config existed, so nothing was created");
          const after = await readFile(path.join(root, ".aof", "aof.config.json"), "utf8");
          assert.deepEqual(JSON.parse(after), JSON.parse(before), "the document is JSON-equal — no key added, moved or clobbered");
          assert.equal(await readFile(path.join(repoRoot, ".aof", "aof.config.json"), "utf8"), before, "the real config is untouched");
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      }),
  },
  {
    name: "work/this-tree-holds-what-is-live: 00 FF-12704 is green over the delivered tree — the intake token is in config, not in a src module outside its allow-list",
    run: async () => {
      assert.ok(intakeWriteSideTests.length > 0, "the control has legs");
      for (const test of intakeWriteSideTests) await test.run();
    },
  },

  // Scenario: an item added under intake backlog is found under backlog/ with no number, and
  // every reader agrees it is not scheduled
  {
    name: "work/this-tree-holds-what-is-live: 00 an item added under intake backlog on the shape copy is found under backlog/ with no number, and find, validate, doctor, next, list, the board face and ls all agree it is not scheduled",
    run: () =>
      withHome(async (home) => {
        const { root, work, files } = await sharedCopy();
        assert.ok(files > 1000, `the shape copy carries the stream's record docs and features (${files} files)`);
        const rootBefore = await rootItemFolders(work);
        const validateBefore = json(root, ["validate"], home);
        const nextBefore = json(root, ["next"], home);

        const leaf = await addToBacklog(work);
        assert.ok(!/^number:/m.test(await readFile(path.join(leaf, "SPEC.md"), "utf8")), "the added record carries no number: line");

        const found = json(root, ["find", ADDED_SLUG], home);
        assert.equal(found.length, 1, "find answers one row");
        const [row] = found;
        assert.equal(row.ref, ADDED_SLUG);
        assert.equal(row.type, "milestone");
        assert.equal(row.number, null);
        assert.equal(row.backlog, "");
        assert.equal(row.parent, null);
        assert.equal(row.status, "not-started");
        assert.ok(slash(row.dir).endsWith(`/${BACKLOG_ROOT}/milestone_${ADDED_SLUG}`), `dir is the backlog leaf (${row.dir})`);
        assert.equal(row.answeredFrom, "disk");

        const validateAfter = json(root, ["validate"], home);
        assert.deepEqual(validateAfter, validateBefore, "validate's finding set is unchanged by the add (a backlog row is not a gap, and the copy's stale-reads class is the same set)");
        assert.deepEqual(validateAfter.filter((finding) => slash(finding.path).includes(ADDED_SLUG)), [], "no finding names the added folder");
        const doctor = json(root, ["doctor"], home);
        assert.deepEqual(doctor.findings.filter((finding) => slash(String(finding.path)).includes(ADDED_SLUG) || String(finding.message).includes(ADDED_SLUG)), [], "doctor reports no finding naming the folder");

        const next = json(root, ["next"], home);
        assert.notEqual(next.ref, ADDED_SLUG, "next proposes a ref that is not the backlog item");
        assert.ok(!refsOf(next.readySet).includes(ADDED_SLUG), "…and its readySet does not contain it");
        assert.deepEqual(refsOf(next.readySet), refsOf(nextBefore.readySet), "the ready set is exactly what it was before the add");

        const listed = json(root, ["list"], home);
        const index = listed.findIndex((entry) => entry.ref === ADDED_SLUG);
        assert.ok(index >= 0, "the default listing carries the row");
        assert.equal(listed[index].number, null);
        assert.equal(listed[index].backlog, "");
        // 129's gate (2026-09-22, F-74): the real tree now carries a backlog row of its own, and a backlog row
        // that sorts before the added one has number === null. The claim is that no LIVE numbered row
        // follows the added item (the slice(index + 1) assertion); rows before it may be live or backlog.
        assert.ok(listed.slice(0, index).every((entry) => (entry.number === undefined || entry.number === null) && entry.archived !== true), "…after every live numbered row");
        assert.ok(listed.slice(index + 1).every((entry) => entry.number === null), "…and no numbered row follows it");

        const envelope = await faceList(root, home);
        const faceRow = envelope.items.find((entry) => entry.ref === ADDED_SLUG);
        assert.ok(faceRow, "GET /api/work/list on the real face over the copy carries the row");
        assert.equal(faceRow.number, null);
        assert.equal(faceRow.backlog, "");

        assert.deepEqual(await rootItemFolders(work), rootBefore, "ls <copy>: no new item folder at the root — the item is born un-numbered");
      }),
  },

  // Scenario: promoting it mints the next number, moves the folder to the root, and find,
  // validate, next and the board see one item
  {
    name: "work/this-tree-holds-what-is-live: 00 promoting it on the shape copy mints MAX+1, moves the folder to the root with one stamped line, and find, validate, doctor, next, the board face and deriveBoard see one live item while no other row moved",
    run: () =>
      withHome(async (home) => {
        const { root, work } = await sharedCopy();
        try {
          const leaf = path.join(work, BACKLOG_ROOT, `milestone_${ADDED_SLUG}`);
          assert.ok(existsSync(leaf), "the previous scenario left the item in the copy's backlog");
          const specBefore = await readFile(path.join(leaf, "SPEC.md"), "utf8");
          const allBefore = json(root, ["list", "--all"], home);
          const validateBefore = json(root, ["validate"], home);
          const max = liveTopLevelMax(allBefore);
          assert.ok(max >= 130, `MAX is the highest live top-level number (${max})`);
          const expected = String(max + 1);

          const promoted = json(root, ["promote", ADDED_SLUG], home);
          assert.equal(promoted.created.ref, expected, "the envelope's created.ref is String(MAX + 1)");
          const folder = path.join(work, `${expected}_milestone_${ADDED_SLUG}`);
          assert.ok(existsSync(folder), "the folder exists at the root");
          assert.ok(!existsSync(leaf), "…and the backlog leaf does not");

          const specAfter = await readFile(path.join(folder, "SPEC.md"), "utf8");
          const frontmatterOf = (text) => text.match(/^---\n[\s\S]*?\n---\n/)[0].split("\n");
          const before = frontmatterOf(specBefore);
          const after = frontmatterOf(specAfter);
          assert.equal(after.length, before.length + 1, "one frontmatter line was added");
          assert.equal(after[2], `number: ${expected}`, "…the number: line, after type:");
          assert.deepEqual([...after.slice(0, 2), ...after.slice(3)], before, "every other frontmatter line is byte-identical");
          // The body: 127/02's one heading courtesy (`# NN · ` on the first heading) and nothing else.
          const bodyBefore = specBefore.slice(specBefore.indexOf("\n---\n") + 5);
          const bodyAfter = specAfter.slice(specAfter.indexOf("\n---\n") + 5);
          assert.equal(bodyAfter, bodyBefore.replace(/^# /, `# ${expected} · `), "the body differs only by the stamped heading prefix");

          const byNumber = json(root, ["find", expected], home);
          const bySlug = json(root, ["find", ADDED_SLUG], home);
          assert.equal(byNumber.length, 1);
          assert.deepEqual(bySlug, byNumber, "find by number and find by slug answer the SAME single row");
          assert.equal(byNumber[0].ref, expected);
          assert.ok(!("backlog" in byNumber[0]) && !("number" in byNumber[0]), "the live row is the frozen seven keys — no backlog key (and no number key: 127/01)");
          assert.match(slash(byNumber[0].dir), new RegExp(`(^|/)wiki/work/${expected}_milestone_${ADDED_SLUG}$`), "dir is at the root");

          const validateAfter = json(root, ["validate"], home);
          assert.deepEqual(validateAfter, validateBefore, "validate's finding set is unchanged by the promotion");
          assert.deepEqual(validateAfter.filter((finding) => slash(finding.path).includes(`${expected}_`)), [], "no finding names the promoted folder");
          const doctor = json(root, ["doctor", expected], home);
          assert.equal(doctor.errors, 0, `doctor ${expected} reports no error`);

          const scoped = json(root, ["next", expected], home);
          assert.equal(scoped.state, "ready", `next ${expected} answers ready (depends: [])`);
          assert.equal(scoped.ref, expected);
          const unscoped = json(root, ["next"], home);
          assert.ok(refsOf(unscoped.readySet).includes(expected), "the unscoped next's readySet contains the new number");

          const envelope = await faceList(root, home);
          const faceRow = envelope.items.find((entry) => entry.ref === expected);
          assert.ok(faceRow, "the real face carries the promoted item");
          // The face stamps `answeredFrom` on every row (m43 / ADR-016) beside the frozen seven; a live
          // row carries no `number`, `backlog` or `archived` key.
          for (const key of ["dir", "parent", "ref", "slug", "status", "title", "type"]) assert.ok(key in faceRow, `…with the frozen key ${key}`);
          assert.deepEqual(Object.keys(faceRow).filter((key) => ["number", "backlog", "archived"].includes(key)), [], "…and none of the widened keys — it is a live row");
          assert.equal(faceRow.answeredFrom, "disk", "…answered from disk");
          const { deriveBoard } = await loadModel();
          const derived = deriveBoard(envelope.items);
          assert.ok(derived.milestones.some((m) => m.item.ref === expected), "deriveBoard places it in milestones");
          assert.ok(!derived.backlog.some((entry) => entry.ref === expected), "…and not in backlog");

          const allAfter = json(root, ["list", "--all"], home);
          const others = allAfter.filter((entry) => entry.ref !== expected).map(stripDir);
          assert.deepEqual(others, allBefore.filter((entry) => entry.ref !== ADDED_SLUG).map(stripDir), "no other row of list --all changed — the promotion appended and shifted nothing (ADR-003 §2)");
          assert.equal(allAfter.length, allBefore.length, "one row left the backlog and one joined the stream");
        } finally {
          await dropSharedCopy();
        }
      }),
  },

  // Scenario: the shape copy is faithful to the stream it copies
  {
    name: "work/this-tree-holds-what-is-live: 00 the shape copy is faithful — list --all over the copy equals list --all over the real tree on every key but dir, and validate agrees on every structural lane",
    run: () =>
      withHome(async (home) => {
        const { root, work } = await buildShapeCopy();
        try {
          const copied = json(root, ["list", "--all"], home);
          const real = json(repoRoot, ["list", "--all"], home);
          assert.ok(real.length > 100, `the real tree lists its rows (${real.length})`);
          assert.deepEqual(copied.map(stripDir), real.map(stripDir), "equal on ref, type, slug, status, title, parent, number, backlog and archived");
          copied.forEach((row, index) => {
            assert.equal(slash(row.dir), slash(real[index].dir).replace(slash(workRoot), slash(work)), `${row.ref}: dir differs only by the copy's root prefix`);
          });

          // validate: the copy has no `src/`, `test/` or git history, so its `reads:` lane cannot
          // resolve what the real tree's resolves — that class is set aside on both sides and the
          // structural lanes (folder/frontmatter, tags, depends, numbering) must agree exactly.
          const copyFindings = json(root, ["validate"], home);
          const realFindings = json(repoRoot, ["validate"], home);
          assert.deepEqual(copyFindings.filter((f) => !isStaleReadsFinding(f)), realFindings.filter((f) => !isStaleReadsFinding(f)), "the structural finding sets are equal (both empty)");
          assert.ok(copyFindings.length >= realFindings.length, "the copy's only extra findings are of the reads-path class");
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      }),
  },

  // ============================================================================
  // 02_the-outsider-check-passes-on-the-real-stream.feature
  // ============================================================================

  // Scenario: the root of the work directory is a short list of live items, and the archive
  // holds only done drivers
  {
    name: "work/this-tree-holds-what-is-live: 02 the root of wiki/work holds only live items, the archive holds only done drivers, list --all carries every archived row last with archived: true, and 42_structural-overhaul is not an item",
    run: () =>
      withHome(async (home) => {
        const rootFolders = await rootItemFolders(workRoot);
        assert.ok(rootFolders.length > 0, "the root holds live items");
        for (const name of rootFolders) {
          const [, number, type] = name.match(ITEM_RE);
          const doc = await readFile(path.join(workRoot, name, recordDoc({ type, dir: path.join(workRoot, name) })), "utf8");
          const { status } = parseFrontmatter(doc);
          assert.notEqual(status, "done", `${number} (${name}) at the root is not done (status: ${status})`);
        }
        assert.ok(rootFolders.some((name) => name.startsWith("32_uat_")), "the live gate 32 is at the root");
        // The scenario's claim is the PROPERTY — a root folder outside the item grammar is never
        // enumerated as an item — and `42_structural-overhaul` was its one instance on the day the
        // move landed. The operator then accepted the GSD-era record as an imported milestone and
        // archived it into the grammar (`archive/42_milestone_structural-overhaul`, 4caeec4), so the
        // instance is gone and 42 IS a row now; the property is asserted over whatever non-item
        // folders the root holds today (none, at aof:verify 127) rather than over a folder that
        // no longer exists (FF-11902's rule: a suite stores no fact about the tree).
        const rootEntries = await readdir(workRoot, { withFileTypes: true });
        assert.ok(rootEntries.length > 0, `the work root was read (${rootEntries.length} entries)`);
        const nonItemRootFolders = rootEntries
          .filter((entry) => entry.isDirectory() && !ITEM_RE.test(entry.name) && entry.name !== ARCHIVE_ROOT && entry.name !== "backlog")
          .map((entry) => entry.name);
        const rootDirectories = rootEntries.filter((entry) => entry.isDirectory()).length;
        const subRootEntries = rootEntries.filter((entry) => entry.isDirectory() && (entry.name === ARCHIVE_ROOT || entry.name === "backlog"));
        // archive/ is always present after the move; backlog/ is not — git carries no empty directory,
        // so a fresh checkout (the gate worktree) has none until the first `aof:add-*` creates it.
        assert.ok(subRootEntries.length >= 1, `archive/ is present (${subRootEntries.map((entry) => entry.name).join(", ")})`);
        // The partition is exact — every root directory is an item folder, a sub-root, or a non-item —
        // spelled as the two bounds so the narrowed set carries its own floor (FF-11902).
        const remainder = rootDirectories - rootFolders.length - subRootEntries.length;
        assert.ok(nonItemRootFolders.length >= remainder, `the non-item folders are at least the remainder of the partition (${nonItemRootFolders.length} >= ${remainder})`);
        assert.ok(nonItemRootFolders.length <= remainder, `…and no more (${nonItemRootFolders.length} <= ${remainder}) — every root directory is an item (${rootFolders.length}), a sub-root (${subRootEntries.length}) or a non-item`);

        const archived = await readdir(path.join(workRoot, ARCHIVE_ROOT), { withFileTypes: true });
        assert.ok(archived.length > 100, `the archive holds the done drivers (${archived.length})`);
        // archive/ may hold a folder outside the item grammar (the GSD-era record keeps its dot-name,
        // `.gsd-archive`, b32929d); the enumerator ignores it as it ignores one at the root, so the
        // claim is over the ITEM_RE entries, and a non-item entry is asserted to be no row.
        const archivedItems = archived.filter((entry) => entry.isDirectory() && ITEM_RE.test(entry.name));
        assert.ok(archivedItems.length > 100, `the archive holds the done drivers as items (${archivedItems.length})`);
        for (const entry of archivedItems) {
          const [, number, type] = entry.name.match(ITEM_RE);
          assert.notEqual(type, "task", `${number}: a top-level driver`);
          const dir = path.join(workRoot, ARCHIVE_ROOT, entry.name);
          const { status, parent } = parseFrontmatter(await readFile(path.join(dir, recordDoc({ type, dir })), "utf8"));
          assert.equal(status, "done", `${number} (${entry.name}) under archive/ reads status: done`);
          assert.ok(parent == null || parent === "", `${number}: never a stories/ child at that level`);
        }

        const all = json(repoRoot, ["list", "--all"], home);
        const firstArchived = all.findIndex((row) => row.archived === true);
        assert.ok(firstArchived > 0, "list --all carries archived rows");
        assert.ok(all.slice(0, firstArchived).every((row) => row.archived !== true), "…after every live and backlog row");
        assert.ok(all.slice(firstArchived).every((row) => row.archived === true), "…and nothing but archived rows after the first");
        assert.deepEqual(all.filter((row) => row.archived === true && row.status !== "done").map((row) => row.ref), [], "no archived: true row whose status is not done");
        for (const entry of archivedItems) {
          const [, number] = entry.name.match(ITEM_RE);
          assert.ok(all.some((row) => row.ref === number && row.archived === true), `archived driver ${number} is a row of list --all`);
        }
        for (const name of nonItemRootFolders) {
          assert.ok(!all.some((row) => slash(row.dir ?? "").includes(`/${name}`)), `${name} appears in no row — a root folder outside the item grammar is not an item`);
        }
        for (const entry of archived.filter((item) => !archivedItems.includes(item))) {
          assert.ok(!all.some((row) => slash(row.dir ?? "").includes(`/${entry.name}`)), `${entry.name} under archive/ is outside the item grammar and appears in no row`);
        }
      }),
  },

  // Scenario Outline: every reader that resolves by ref answers for the archived milestone 52
  // from disk
  {
    name: "work/this-tree-holds-what-is-live: 02 find 52 answers one archived row from disk whose dir is wiki/work/archive/52_milestone_loop-registry-and-graph",
    run: () =>
      withHome((home) => {
        const rows = json(repoRoot, ["find", "52"], home);
        const [row, ...others] = rows;
        assert.ok(row, "find 52 answers a row");
        assert.deepEqual(others, [], "…exactly one");
        assert.equal(row.ref, "52");
        assert.equal(row.type, "milestone");
        assert.equal(row.slug, "loop-registry-and-graph");
        assert.equal(row.status, "done");
        assert.equal(row.parent, null);
        assert.equal(row.archived, true);
        assert.equal(row.answeredFrom, "disk");
        assert.ok(slash(row.dir).endsWith("wiki/work/archive/52_milestone_loop-registry-and-graph"), `dir ends in the archived folder (${row.dir})`);
      }),
  },
  {
    name: "work/this-tree-holds-what-is-live: 02 find 52/00 answers one row with parent 52, archived: true, status done, under the archived folder",
    run: () =>
      withHome((home) => {
        const rows = json(repoRoot, ["find", "52/00"], home);
        const [row, ...others] = rows;
        assert.ok(row, "find 52/00 answers a row");
        assert.deepEqual(others, [], "…exactly one");
        assert.equal(row.parent, "52");
        assert.equal(row.archived, true);
        assert.equal(row.status, "done");
        assert.equal(row.answeredFrom, "disk");
        assert.ok(slash(row.dir).includes("wiki/work/archive/52_milestone_loop-registry-and-graph/stories/00_"), `dir is under the archived folder (${row.dir})`);
      }),
  },
  {
    name: "work/this-tree-holds-what-is-live: 02 doc 52 SPEC answers the moved SPEC.md, byte-identical to wiki/work/archive/52_milestone_loop-registry-and-graph/SPEC.md",
    run: () =>
      withHome(async (home) => {
        const doc = json(repoRoot, ["doc", "52", "SPEC"], home);
        assert.equal(doc.present, true, "the doc is present");
        const onDisk = await readFile(path.join(workRoot, ARCHIVE_ROOT, "52_milestone_loop-registry-and-graph", "SPEC.md"), "utf8");
        assert.equal(doc.body, onDisk, "the body is the file's own bytes (CRLF and all)");
      }),
  },
  {
    name: "work/this-tree-holds-what-is-live: 02 doctor 52 reports no error-level finding, and no control-unresolved beyond the pre-existing lost-history set — none names a path under wiki/work",
    run: () =>
      withHome((home) => {
        const doctor = json(repoRoot, ["doctor", "52"], home);
        assert.equal(doctor.errors, 0, "no error-level finding");
        assert.deepEqual(doctor.findings.filter((finding) => finding.severity === "error"), []);
        const unresolved = doctor.findings.filter((finding) => finding.code === "control-unresolved");
        assert.ok(unresolved.length <= DOCTOR_52_BEFORE.controlUnresolved, `no more control-unresolved than before the move (${unresolved.length} <= ${DOCTOR_52_BEFORE.controlUnresolved}, measured ${DOCTOR_52_BEFORE.measuredAt} at ${DOCTOR_52_BEFORE.commit})`);
        for (const finding of unresolved) {
          assert.match(String(finding.message), /cites test\/arch\/acd-loop-[a-z-]+\.test\.mjs/, `the pre-existing class only — a control 119/03 moved, its rename lost with the history (${finding.message})`);
          assert.ok(!/wiki\/work/.test(String(finding.message)), "…never a path under wiki/work the move could have broken");
        }
      }),
  },
  {
    name: "work/this-tree-holds-what-is-live: 02 validate 52 is [] — the archived milestone validates from disk",
    run: () => withHome((home) => assert.deepEqual(json(repoRoot, ["validate", "52"], home), [])),
  },
  {
    name: "work/this-tree-holds-what-is-live: 02 validate over the whole tree, archive included, holds the ratchet — no finding names an archived path that the move broke, no finding of any class the move could produce",
    run: () =>
      withHome((home) => {
        const findings = json(repoRoot, ["validate"], home);
        assert.deepEqual(findings.filter((finding) => !isStaleReadsFinding(finding)), [], "no folder/frontmatter, tag, depends or numbering finding anywhere — archive included");
        assert.ok(findings.length <= VALIDATE_BEFORE.findings, `no more stale-reads findings than before the move (${findings.length} <= ${VALIDATE_BEFORE.findings})`);
        assert.deepEqual(findings.filter((finding) => /reads path "wiki\/work\/\d+_/.test(finding.problem)), [], "no reads: citation of a root-level item path is left dangling — the resolver follows the recorded renames");
      }),
  },

  // Scenario: every walker that answers "what is next" never proposes an archived item, and a
  // live gate satisfied only by archived drivers is still ready
  {
    name: "work/this-tree-holds-what-is-live: 02 next never proposes an archived item or a backlog slug, next 32 is ready through its eleven archived dependencies, the default list carries no archived row, and list --all carries 52 and its six stories",
    run: () =>
      withHome(async (home) => {
        const archivedNames = await readdir(path.join(workRoot, ARCHIVE_ROOT));
        const archivedRefs = new Set(archivedNames.map((name) => name.match(ITEM_RE)?.[1]).filter(Boolean));
        const all = json(repoRoot, ["list", "--all"], home);
        const live = new Set(all.filter(isLiveRow).map((row) => row.ref));

        const next = json(repoRoot, ["next"], home);
        assert.ok(live.has(next.ref), `the unscoped next's ref is a live row (${next.ref})`);
        for (const row of next.readySet) {
          assert.ok(live.has(row.ref), `${row.ref} in the readySet is a live row`);
          assert.ok(!archivedRefs.has(row.ref.split("/")[0]), `${row.ref} is not under archive/`);
          assert.notEqual(row.ref, "52");
        }

        const gate = json(repoRoot, ["next", "32"], home);
        assert.equal(gate.state, "ready", "next 32 answers ready");
        assert.equal(gate.ref, "32");
        assert.ok(gate.waitingOn == null || gate.waitingOn.length === 0, "…with no waitingOn");
        const session = parseFrontmatter(await readFile(path.join(workRoot, "32_uat_whole-mesh-acceptance", "SESSION.md"), "utf8"));
        const depends = String(session.depends ?? "").replace(/[[\]]/g, "").split(",").map((entry) => entry.trim()).filter(Boolean);
        assert.equal(depends.length, 11, "32 depends on eleven drivers");
        for (const dep of depends) {
          assert.ok(archivedRefs.has(dep), `dependency ${dep} is under archive/`);
          assert.equal(all.find((row) => row.ref === dep && row.archived === true)?.status, "done", `dependency ${dep} is a done driver — satisfied, not missing`);
        }

        const listed = json(repoRoot, ["list"], home);
        assert.deepEqual(listed.filter((row) => row.archived === true), [], "the default list carries no archived: true row");
        assert.ok(!listed.some((row) => row.ref === "52" || row.ref.startsWith("52/")), "…and no row for 52");
        assert.ok(all.some((row) => row.ref === "52" && row.archived === true), "list --all carries 52");
        assert.equal(all.filter((row) => row.parent === "52").length, 6, "…and its six stories");

        // `aof:recent` is a prompt over `work:list`'s default (127/01) — there is no `read` or
        // `recent` verb, so it sees no archived row either.
        const recent = await readFile(path.join(repoRoot, "src", "bundle", "commands", "recent.md"), "utf8");
        assert.match(recent, /aof work list --json/, "the recent prompt reads through work list");
        assert.match(recent, /`--all` only when the operator asks for the archive/, "…and adds --all only on request");
      }),
  },

  // Scenario: the board face over the real repository excludes the archive by default and
  // includes it on the parameter
  {
    name: "work/this-tree-holds-what-is-live: 02 the board face over the real repository excludes the archive by default and includes it on includeArchived=1, and deriveBoard counts three milestones by default and every archived milestone on the parameter",
    run: () =>
      withHome(async (home) => {
        const { deriveBoard } = await loadModel();
        const all = json(repoRoot, ["list", "--all"], home);
        const liveRoots = (await rootItemFolders(workRoot)).map((name) => name.match(ITEM_RE)[1]);

        const byDefault = await faceList(repoRoot, home);
        assert.deepEqual(byDefault.items.filter((row) => row.archived === true), [], "no archived: true row by default");
        for (const ref of liveRoots) assert.ok(byDefault.items.some((row) => row.ref === ref), `${ref} is on the face`);
        // 129's gate (2026-09-22, F-76): 127 is archived now, so the milestone with stories is read off
        // the live roots rather than named — the claim (a live milestone's stories ride the face) is unchanged.
        const liveWithStories = liveRoots.find((ref) => all.some((row) => row.parent === ref));
        assert.ok(liveWithStories != null, "a live milestone with stories exists (non-vacuous)");
        assert.ok(byDefault.items.some((row) => row.parent === liveWithStories), "…with its stories");
        const derived = deriveBoard(byDefault.items);
        assert.equal(derived.milestones.length, all.filter((row) => row.type === "milestone" && row.parent == null && isLiveRow(row)).length, "deriveBoard(items).milestones is exactly the live milestones");
        // No literal count beside the property: "three today (127, 129, 130)" was true for one day and
        // 131's framing made it four — the live-milestone equality above is the assertion (FF-11902's rule).
        assert.equal(derived.archivedMilestones, 0);

        const withArchive = await faceList(repoRoot, home, { includeArchived: true });
        assert.ok(withArchive.items.some((row) => row.ref === "52" && row.archived === true), "includeArchived=1 carries 52");
        for (const row of all.filter((entry) => entry.archived === true)) {
          assert.ok(withArchive.items.some((entry) => entry.ref === row.ref && entry.archived === true), `archived ${row.ref} is on the face with the parameter`);
        }
        const derivedAll = deriveBoard(withArchive.items);
        assert.equal(derivedAll.archivedMilestones, all.filter((row) => row.type === "milestone" && row.archived === true).length, "deriveBoard(items).archivedMilestones equals the archived milestone rows of list --all");
        assert.ok(derivedAll.archivedMilestones > 50, `…and that is the archive (${derivedAll.archivedMilestones})`);
      }),
  },

  // Scenario: no relative link resolves worse than it did before the move, and no link was
  // invented
  {
    name: "work/this-tree-holds-what-is-live: 02 the link ratchet holds — the total equals LINKS_BEFORE.total, the resolving count is >= LINKS_BEFORE.resolving, every link into archive/ resolves, no link targets a root path whose folder now lives under archive/, and the four wiki/memory.md links resolve",
    run: async () => {
      const links = await scanRelativeLinks(workRoot);
      const resolving = links.filter((link) => link.exists).length;
      assert.ok(links.length >= LINKS_BEFORE.total, `the tree holds at least the links measured before the move (${links.length} >= ${LINKS_BEFORE.total}, ${LINKS_BEFORE.measuredAt} at ${LINKS_BEFORE.commit}) — none was lost`);
      assert.ok(resolving >= LINKS_BEFORE.resolving, `the resolving count is >= the count measured before the move (${resolving} >= ${LINKS_BEFORE.resolving})`);

      const archiveRoot = path.join(workRoot, ARCHIVE_ROOT);
      // Over the ITEM folders under archive/: the GSD-era record (`archive/.gsd-archive`, b32929d) is
      // outside the grammar, carries its own internal links to files that never moved with it, and
      // is not "the files that moved".
      const archivedItemDirs = (await readdir(archiveRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory() && ITEM_RE.test(entry.name)).map((entry) => `${ARCHIVE_ROOT}/${entry.name}/`);
      assert.ok(archivedItemDirs.length > 100, `archive/ holds the item folders (${archivedItemDirs.length})`);
      const underArchivedItem = (file) => archivedItemDirs.some((dir) => file.startsWith(dir));
      const inMoved = links.filter((link) => underArchivedItem(link.file));
      assert.ok(inMoved.length > 0, `the files under ${ARCHIVE_ROOT}/ carry links (non-vacuous)`);
      // "The files that moved" is read as everything under archive/, and that set GROWS with every
      // later archive (42's, 4caeec4, brought 63 links under archive/ the same day) — so the "none
      // invented" equality could only ever hold on the day of the move. "None lost" is the property
      // that survives, and it is the same floor the whole-tree ratchet above already holds.
      assert.ok(inMoved.length >= LINKS_IN_MOVED_BEFORE.total, `the files under archive/ hold at least the links the moved files held before the move — none lost (${inMoved.length} >= ${LINKS_IN_MOVED_BEFORE.total})`);
      assert.ok(inMoved.filter((link) => link.exists).length >= LINKS_IN_MOVED_BEFORE.resolving, `…and at least as many of them resolve (${inMoved.filter((link) => link.exists).length} >= ${LINKS_IN_MOVED_BEFORE.resolving})`);
      const archivedNames = new Set(await readdir(archiveRoot));
      const underNonItemArchiveFolder = (file) => file.startsWith(`${ARCHIVE_ROOT}/`) && !underArchivedItem(file);
      const intoArchive = links.filter((link) => slash(link.resolved).startsWith(`${slash(archiveRoot)}/`) && !underNonItemArchiveFolder(link.file));
      assert.ok(intoArchive.length > 1000, `links target the archive (${intoArchive.length})`);
      const broken = intoArchive.filter((link) => !link.exists);
      assert.ok(broken.length <= BROKEN_INTO_MOVED_BEFORE, `every link into archive/ that resolved before the move still resolves — no more than the ${BROKEN_INTO_MOVED_BEFORE} that were broken before it (${broken.length}): ${broken.slice(0, 5).map((link) => `${link.file} -> ${link.target}`).join("; ")}`);
      assert.ok(intoArchive.length - broken.length >= 1156 - BROKEN_INTO_MOVED_BEFORE, `the resolving links into the archive are at least the 1,108 measured before the move (${intoArchive.length - broken.length})`);
      const stale = links.filter((link) => {
        const rel = slash(path.relative(workRoot, link.resolved));
        return archivedNames.has(rel.split("/")[0]);
      });
      assert.deepEqual(stale.map((link) => `${link.file} -> ${link.target}`).slice(0, 20), [], "no link targets a root path wiki/work/<NN>_… whose folder now lives under archive/");

      const memory = await readFile(path.join(repoRoot, "wiki", "memory.md"), "latin1");
      const memoryLinks = [...memory.matchAll(LINK_RE)].map((match) => match[1]).filter((target) => target.includes("05_milestone_work-memory"));
      assert.equal(memoryLinks.length, 4, "wiki/memory.md carries four links into 05_milestone_work-memory");
      for (const target of memoryLinks) {
        assert.ok(target.startsWith("work/archive/05_milestone_work-memory/"), `${target} reads work/archive/05_milestone_work-memory/…`);
        assert.ok(existsSync(path.join(repoRoot, "wiki", target.split(/[#?]/)[0])), `${target} resolves`);
      }
    },
  },

  // Scenario: the two runtime path-readers survive the archive of the items they read
  {
    name: "work/this-tree-holds-what-is-live: 02 the two runtime path-readers are green over the moved tree, and no .mjs under src, test or scripts reads a path under a root-level item folder",
    run: async () => {
      // Both resolve their item by ref (62/04, 72/00 — both archived by task 01) and are green here.
      for (const test of tuneReaderTests) await test.run();
      for (const test of spellerReaderTests) await test.run();

      // 03/03's classification over the moved tree: every `wiki/work/<NN>_…` match in a `.mjs`
      // under src, test or scripts is a comment, a fixture plant or a string — never a read.
      const rows = await censusItemPathMentions();
      assert.ok(rows.length > 100, `the census read the tree (${rows.length} matches)`);
      const reads = rows.filter((row) => row.kind !== "comment" && /\b(readFile(?:Sync)?|existsSync|readdir(?:Sync)?|import)\s*\(/.test(row.text));
      assert.deepEqual(reads.map((row) => `${row.file}:${row.line}`), [], "no match readFiles, existsSyncs or imports the path it names");
      assert.deepEqual(rows.filter((row) => row.kind === "reader (05 retires)"), [], "the readers 127/03 flagged for this story are retired");
    },
  },

  // Scenario: the budget row and the lane index name this suite
  {
    name: "work/this-tree-holds-what-is-live: 02 the test/work/stream budget row's ceiling is 35 with a why naming 127/05 and this file, and the lane index imports and spreads this suite",
    run: async () => {
      const budget = await readFile(path.join(repoRoot, "test", "arch", "testing", "acd-source-directory-budget.test.mjs"), "utf8");
      const row = budget.match(/directory: "test\/work\/stream",[\s\S]*?ceiling: (\d+),[\s\S]*?why: "([^"]*)"/);
      assert.ok(row, "the test/work/stream row exists");
      assert.equal(row[1], "35", "the ceiling is 35");
      assert.match(row[2], /127\/05/, "the why names 127/05");
      assert.match(row[2], /work-this-tree-holds-what-is-live\.test\.mjs/, "…and this file");

      const index = await readFile(path.join(repoRoot, "test", "work", "stream", "index.mjs"), "utf8");
      assert.match(index, /import \{ workThisTreeHoldsWhatIsLiveTests \} from "\.\/work-this-tree-holds-what-is-live\.test\.mjs";/, "the index imports this suite");
      assert.match(index, /\.\.\.workThisTreeHoldsWhatIsLiveTests,/, "…and spreads it");
      const children = await readdir(path.join(repoRoot, "test", "work", "stream"));
      assert.ok(children.length <= 35, `the lane's direct children fit the ceiling (${children.length})`);
      assert.ok(children.includes(path.basename(THIS_SUITE)), "this file is one of them");
    },
  },
];
