// FF-11903 — "A path cited in a delivered document resolves at HEAD or through a recorded rename."
// 119/ADR-004, and 119/00 task `02_a-cited-path-resolves.feature`.
//
// THE UNIVERSE NO GATE HAS EVER COVERED, MEASURED AT HEAD ON 2026-09-06 with the anchored extractor
// below over `wiki/work/**`: 2,182 files, 975 of them carrying a `src/**.mjs` citation, 357 distinct
// tokens and 8,252 citations, of which 77 distinct tokens do not resolve. The doctor's own register
// universe — `fitnessDeclarations` + `citedControlPathsIn` over every `wiki/work/*/ARCHITECTURE.md` —
// is the narrower half that already had a gate, and 119/ADR-004 is the ruling that made it survive a
// control move.
//
//   node --input-type=module -e 'const { measure } = await import("./test/arch/command/acd-cited-path-resolves.test.mjs"); const m = await measure(); console.log(m);'
//   git log --diff-filter=R -M --name-status --format= | grep -c '^R'   // 20 rename records
//
// THE LEFT ANCHOR IS LOAD-BEARING AND IS A CRITERION HERE, NOT A DETAIL. `grep -rhoE
// 'src/[A-Za-z0-9_./-]+\.mjs' wiki/work/` — no anchor — reports 22 more distinct tokens, because it
// clips `ui/` off every `apps/ui/src/**` path. An extractor that manufactures phantom casualties prices
// the ceiling wrong on the day it is pinned, so the anchor is asserted below rather than trusted.
//
// THE MAP IS DERIVED FROM HISTORY, SO IT CANNOT GO STALE — and on the day it lands it resolves
// almost nothing, which is the honest shape of this control. Twenty rename records exist in the
// whole reachable history, three of them touching `src/`, and exactly ONE of the 357 cited tokens
// resolves through them (`src/commands/errors.mjs` -> `src/command-error.mjs`, real, committed and
// immutable). A resolver that answered "no renames, ever" would pass every leg of this control
// silently — which is the defect one contract over — so the map's own non-vacuity is asserted.
//
// WHAT WOULD QUIETLY UNDO THIS: a hand-kept redirect table, which is 119/ADR-003 species 1 at the
// scale of 8,252 citations; a rename map that answers empty and is never asked whether it is; an
// extractor without the left anchor; a ceiling that rises "just once"; and widening
// `control-unresolved` to mean *somebody moved a file*, which blinds the gate for every future item
// to buy this one milestone's move.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { ChildProcess, execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";
import {
  RENAME_LEDGER_PATH,
  RENAME_LOG_ARGS,
  buildRenameMap,
  parseRenameRecords,
  resolveCitedPath,
  resolveThroughRenames,
} from "@aof/work/cited-path-resolve";

import { readCitationHistory } from "@aof/work/citation-history";
const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WORK_DIR = path.join(root, "wiki", "work");
const RESOLVER = "packages/work/src/cited-path-resolve.mjs";
const SPINE = "packages/work/src/doctor/index.mjs";
const EDGE = "packages/work/src/commands/doctor.mjs";

// THE ANCHORED EXTRACTOR. The lookbehind is the whole difference between 357 tokens and 379: without
// it, `apps/ui/src/fleet/scope.mjs` is read as `src/fleet/scope.mjs` and counted as a casualty.
const CITATION = /(?<![A-Za-z0-9_./-])(?:src|packages\/[A-Za-z0-9_-]+\/src)\/[A-Za-z0-9_./-]+\.mjs/gu;

// THE SHRINK-ONLY CEILING, pinned to the count measured on the day this control landed, with NO
// HEADROOM — so the next unresolvable citation has to come here and be argued for. Produced by the
// exported `sweep()` below, run over this repository at HEAD on 2026-09-06:
//
//   node --input-type=module -e 'const { measure } = await import("./test/arch/command/acd-cited-path-resolves.test.mjs"); const m = await measure(); console.log(m.unresolved.length, m.citations, m.distinct, m.scanned);'
//
// which printed `77 8252 357 2182` — 77 distinct unresolvable tokens carrying 414 citations, out of
// 357 distinct tokens and 8,252 citations across 2,182 files (975 of them carrying a citation).
//
// The value is a DECISION under 119/ADR-003 §2 — a declared bound, not a fact about the tree — and
// it exists because the count is not zero today and a control that must be green before it can land
// is a control that never lands. It MAY FALL and MAY NEVER RISE: `HIGH_WATER` below is what refuses
// a raise, so lowering the ceiling as citations are repaired needs no further decision and raising
// it fails this control rather than passing quietly.
// LOWERED 77 -> 65 by 119/01, re-measured with the command in the note above, which printed
// `65 8265 359 2188` after the family moves were committed: the 72 renames are recorded history
// now, so every citation of a moved module resolves through them.
// LOWERED 65 -> 47 at 124's accept (2026-09-08), re-measured with the same command, which printed
// `47 8498 357 2110`: the sweep stopped reading the two machine-written subtrees (`MACHINE_WRITTEN`
// above — the ratchet could not fall while its own failure text was a document), and the ledger's
// citation of the moved debt module was repaired.
// RE-PINNED 47 -> 54 at 127's accept (2026-09-16), the one raise in this row's history, and it is
// argued for here as the note above demands. Measured with the same command, which printed
// `54 10166 395 2328` — AFTER the rename ledger (RENAME_LEDGER_PATH, 127/VERIFICATION F-A) restored
// the 1,128 pre-cut renames the public root at e4c8824 had dropped: without it the count read 148.
// The seven above 47 are, every one, in a document nobody may edit or a module nobody has landed:
//   · 129/03's and 129/04's DELIVERED features spell nine Examples-table fixtures as `src/<x>.mjs`
//     (`src/a.mjs`, `b`, `c`, `x`, `y`, `added`, `n`, `new`, `promote`; 129/VERIFICATION F-09 — an
//     Examples-table fixture is not a citation, and the contract is immutable);
//   · 130's two modules (`src/loop/stop-request.mjs`, `src/loop/stop.mjs`), cited by its ADRs and
//     stories before its builds land them — the same species as 127/01's F-09, and they CLEAR by
//     landing (this row should fall to 52 at 130's accept);
//   · 127/03 task 05's probe names a hypothetical `src/commands/archive-flags.mjs` that exists so
//     the transitive leg can name a chain through it — never a module to land.
// The five that were live at 47 and are not in these seven cleared as their modules landed
// (`promote.mjs`, `archive.mjs`, `wave.mjs`, `cycle.mjs`, `child-drive.mjs`) or were respelled
// (`lanes.mjs`, the ledger's two proposals). HIGH_WATER is untouched.
// RE-PINNED 54 -> 55 at 130's accept (2026-09-24), argued here as the note above demands. Measured
// with the same command in a clean detached worktree, which printed `56 10473 418 2460` before one
// repair and 55 after it. 130's two modules cleared by landing, as predicted above, so the row
// would have read 52. Three were added and one was repaired:
//   · 134's refine (2bf716f) cites the three modules its stories will land:
//     `packages/work/src/examples/map.mjs`, `packages/work/src/examples/answers.mjs` and
//     `src/work/doctor-examples.mjs`. They are the same species as 130's pair, and they CLEAR by
//     landing, so this row should fall to 52 at 134's accept;
//   · 134's SPEC cited `src/observe.mjs`, a module that never existed. It is re-pointed to
//     `src/work/observe.mjs`, the transcript reader it meant (130/VERIFICATION F-19).
// 131's uncommitted refine, measured in the primary checkout, adds five more of the planned-module
// species. They are not counted here because a clean gate cannot read them. HIGH_WATER is untouched.
// HELD at 55 through 136's accept (2026-10-03). 142's squash (88ebd022) had pushed the count to 348:
// a module that moved and changed in one squash reads as D + A, and a module split behind a forward
// left only its original source on main. The rename ledger now records PR #5's 1,106 renames and its
// 311 forwards (136/VERIFICATION F-136-01), and the same command printed `55 14614 866 2895`.
// HELD at 55 through 148's accept (2026-10-06). PR #6's squash (678c3a52) read 135/01's move of the
// examples modules as D + A, and 147 and 149 cited two test-bed files as bare `src/` paths, which
// pushed the count to 60. The rename ledger now records PR #6's 9 renames (148/VERIFICATION
// F-148-03), the test-bed paths are spelled `aof-test-repo/src/…`, and 148/02 removed two.
// SCOPED TO LIVE WORK at 148's accept (F-148-06): the sweep reads only the documents of items that
// are not done (`liveDocuments` above), and the same command printed `0 228 110 58`. All 55 were in
// done records. The ceiling is NOT lowered to 0: an in-flight refine legitimately cites the modules
// its stories will land (the 130 and 134 species above), and a ceiling of 0 would let one live item's
// planned citations fail another item's sign-off.
const UNRESOLVED_CEILING = 55;
const HIGH_WATER = 77;

// MACHINE-WRITTEN SUBTREES ARE NOT DOCUMENTS. An item's `runs/` (run records and progress ndjson,
// written by `aof work loop`) and `observability/` (snapshots, written by `aof work observe`) are
// never authored, and what they carry is a path an instrument SAW, not a module a record relies on.
// Measured 2026-09-08 at 124's accept, with the sweep still reading them: a graded run record
// persists this control's OWN failure text, so 49 of the 66 casualties were kept alive by three run
// records no document repair could reach, and one observe snapshot added a path an agent typed once.
// Read as documents they jam the ratchet shut — the count can only rise. 119/ADR-004's subject is a
// path cited in a DELIVERED DOCUMENT, and these two names are the subtrees the tooling writes; the
// set is a decision (119/ADR-003 §2), so a third machine-written subtree has to come here and argue.
const MACHINE_WRITTEN = new Set(["runs", "observability"]);

// A DONE ITEM'S DOCUMENTS ARE HISTORY, AND HISTORY NEVER GATES NEW WORK (148/VERIFICATION F-148-06).
// Code moves after an item is accepted, and the citations in its records go dark with it — a fact
// about the record, never a defect of whichever later item happened to move the file. So the sweep
// reads the documents of items that are not done: everything under `archive/` is skipped, and so is
// any item folder whose record doc reads `status: done`. A citation in live work still resolves or
// is reported, which is the control's point.
const RECORD_DOCS = ["SPEC.md", "STORY.md", "CHORE.md", "SESSION.md", "SPIKE.md", "AOF.md"];
const DONE_STATUS = /^status:\s*done\s*$/mu;

async function isDoneItem(dir) {
  for (const name of RECORD_DOCS) {
    const file = path.join(dir, name);
    if (existsSync(file)) return DONE_STATUS.test(await readFile(file, "utf8"));
  }
  return false;
}

async function liveDocuments(workDir) {
  const out = [];
  for (const entry of await readdir(workDir, { withFileTypes: true })) {
    const full = path.join(workDir, entry.name);
    if (!entry.isDirectory()) out.push(full);
    else if (entry.name === "archive" || MACHINE_WRITTEN.has(entry.name)) continue;
    else if (entry.name === "backlog") {
      for (const row of await readdir(full, { withFileTypes: true })) {
        const rowDir = path.join(full, row.name);
        if (!row.isDirectory()) out.push(rowDir);
        else if (!(await isDoneItem(rowDir))) await walk(rowDir, out, MACHINE_WRITTEN);
      }
    } else if (!(await isDoneItem(full))) await walk(full, out, MACHINE_WRITTEN);
  }
  return out;
}

async function walk(dir, out = [], skip = new Set()) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skip.has(entry.name)) await walk(full, out, skip);
    } else out.push(full);
  }
  return out;
}

const rel = (full) => path.relative(root, full).split(path.sep).join("/");

async function renameMapFromHistory(cwd = root) {
  return readCitationHistory(cwd, async args => {
    const { stdout } = await execFileAsync("git", args, { cwd, encoding: "utf8", timeout: 30_000, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
    return stdout;
  });
}

// The sweep, exported so the red probe drives the instrument the real tree is measured by.
export async function sweep({ documents, srcFiles, renameMap }) {
  const existsAtHead = (candidate) => srcFiles.has(candidate);
  const tokens = new Map();
  let citations = 0;
  let documentsWithCitations = 0;
  for (const { rel: where, text } of documents) {
    let any = false;
    for (const match of text.matchAll(CITATION)) {
      citations += 1;
      any = true;
      if (!tokens.has(match[0])) tokens.set(match[0], new Set());
      tokens.get(match[0]).add(where);
    }
    if (any) documentsWithCitations += 1;
  }
  const unresolved = [];
  let viaRename = 0;
  for (const [token, where] of tokens) {
    const answer = resolveCitedPath(token, { existsAtHead, renameMap });
    if (answer.via === "rename") viaRename += 1;
    if (!answer.resolved) unresolved.push({ token, documents: [...where].sort() });
  }
  return {
    scanned: documents.length,
    documentsWithCitations,
    distinct: tokens.size,
    citations,
    viaRename,
    unresolved: unresolved.sort((a, b) => a.token.localeCompare(b.token)),
  };
}

// The measurement the ceiling above carries the command for, exported so a later story re-measures
// with the SAME instrument rather than with a grep of its own — which is how the anchor gets lost.
export async function measure() {
  return (await realSweep()).result;
}

async function realSweep() {
  const documents = [];
  for (const full of await liveDocuments(WORK_DIR)) {
    let text;
    try {
      text = await readFile(full, "utf8");
    } catch {
      continue;
    }
    documents.push({ rel: rel(full), text });
  }
  const srcFiles = new Set();
  for (const owner of await readdir(path.join(root, "packages"))) {
    const source = path.join(root, "packages", owner, "src");
    if (existsSync(source)) {
      const owned = await walk(source);
      assert.ok(owned.length > 0, `${owner}: the actual source root must not be empty`);
      for (const file of owned) srcFiles.add(rel(file));
    }
  }
  // 609 actual source files remain after retiring 226 configured/alias entries.
  // Each owner is independently nonempty above; none of the deleted scaffolding
  // contributes to this implementation floor.
  assert.ok(srcFiles.size >= 600, `the citation sweep covers actual workspace implementations and configured core bindings (${srcFiles.size} files)`);
  return { result: await sweep({ documents, srcFiles, renameMap: await renameMapFromHistory() }), documents, srcFiles };
}

// ── 160/ADR-007 · FF-16007 — citation history is read only when a citation misses on disk ──────────
//
// The real `work:doctor` and `work:validate` commands, run in this process over a fixture stream, with
// every git process they start counted where every spawn passes (`ChildProcess.prototype.spawn`). Only
// the three history reads and the memo's `rev-parse HEAD` are classified: the claim is about history.
const HISTORY_READS = Object.freeze({
  renameLog: (args) => args[0] === "log" && args.includes("--diff-filter=R"),
  deletedLog: (args) => args[0] === "log" && args.includes("--diff-filter=D"),
  historyDiff: (args) => args[0] === "diff" && args.includes("--unified=10000"),
  revParseHead: (args) => args.length === 2 && args[0] === "rev-parse" && args[1] === "HEAD",
});

function historyReadCounts(spawns) {
  return Object.fromEntries(Object.entries(HISTORY_READS).map(([name, matches]) => [name, spawns.filter(matches).length]));
}

async function gitSpawnsUnder(dir, run) {
  const under = (await realpath(dir)).toLowerCase();
  const spawns = [];
  const original = ChildProcess.prototype.spawn;
  ChildProcess.prototype.spawn = function countedSpawn(options) {
    const file = path.basename(String(options?.file ?? "")).toLowerCase();
    const cwd = options?.cwd == null ? "" : path.resolve(String(options.cwd)).toLowerCase();
    if ((file === "git" || file === "git.exe") && cwd.startsWith(under)) spawns.push(options.args.slice(1));
    return original.call(this, options);
  };
  try {
    return { result: await run(), spawns };
  } finally {
    ChildProcess.prototype.spawn = original;
  }
}

// A project whose wiki page, story `reads:` and fitness register each cite `cites`; `src/present.mjs` and
// the cited control exist. `checkout` makes it a git repository; `renamed` records `src/old.mjs` →
// `src/new.mjs` in a commit.
async function withCitingProject({ cites, checkout = true, renamed = false }, run) {
  const dir = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-lazy-history-")));
  const write = async (rel, text) => {
    await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
    await writeFile(path.join(dir, rel), text, "utf8");
  };
  try {
    await write(".aof/aof.config.json", JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2));
    await write("src/present.mjs", "export const present = 1;\n");
    await write("test/arch/acd-fixture-present.test.mjs", "export const archTests = [];\n");
    if (checkout) {
      const git = (...args) => execFileAsync("git", args, { cwd: dir, encoding: "utf8", windowsHide: true });
      await git("init", "-q");
      await git("config", "user.email", "probe@example.invalid");
      await git("config", "user.name", "probe");
      if (renamed) await write("src/old.mjs", "export const moved = 1;\n");
      await git("add", "-A");
      await git("commit", "-qm", "seed");
      if (renamed) {
        await git("mv", "src/old.mjs", "src/new.mjs");
        await git("commit", "-qm", "move");
      }
    }
    const milestone = "wiki/work/01_milestone_fixture";
    await write(`${milestone}/SPEC.md`, "---\ntype: milestone\nnumber: 01\nslug: fixture\ntitle: \"fixture\"\nstatus: in-progress\nschema: 1\n---\n# 01 · fixture\n");
    await write(`${milestone}/ARCHITECTURE.md`, "---\ndoc: architecture\n---\n# fixture\n\n## Fitness functions\n\n| id | invariant | enforced by (arch-test) | from |\n|---|---|---|---|\n| FF-0101 | an invariant | `test/arch/acd-fixture-present.test.mjs` | ADR-001 |\n");
    await write(`${milestone}/stories/00_story_fixture/STORY.md`, `---\ntype: story\nnumber: 00\nslug: fixture\ntitle: "fixture"\nparent: 01\nstatus: not-started\nschema: 1\ndepends: []\nreads: [${cites}]\nfiles: []\n---\n# 00 · fixture\n`);
    await mkdir(path.join(dir, milestone, "stories/00_story_fixture/tasks"), { recursive: true });
    await write("wiki/notes.md", `# notes\n\nThe fixture reads \`${cites}\`.\n`);
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runCommand(name, dir) {
  const { defaultApplication } = await import("aof/default-application");
  const { defaultWorkspace } = await import("aof/workspace-services");
  const ctx = { workspace: await defaultWorkspace.work.loadWorkspace(dir) };
  return defaultApplication.getCommand(name).run({}, ctx);
}

const NO_HISTORY_READ = Object.freeze({ renameLog: 0, deletedLog: 0, historyDiff: 0, revParseHead: 0 });
const HISTORY_READ_ONCE = Object.freeze({ renameLog: 1, deletedLog: 1, historyDiff: 1, revParseHead: 1 });

export const archTests = [
  {
    name: "arch/119 FF-11903: one resolver answers every citation — at HEAD, or through a rename this repository recorded",
    run: async () => {
      const renameMap = await renameMapFromHistory();
      const present = new Set(["src/work/doctor.mjs", "packages/contracts/src/error.mjs", "apps/ui/src/fleet/scope.mjs"]);
      const existsAtHead = (candidate) => present.has(candidate);
      const answer = (cited, map = renameMap) => resolveCitedPath(cited, { existsAtHead, renameMap: map });

      assert.equal(answer("src/work/doctor.mjs").via, "head", "a src/ path that exists at HEAD resolves at its own path");
      assert.deepEqual(
        [answer("src/commands/errors.mjs").resolved, answer("src/commands/errors.mjs").at],
        [true, "packages/contracts/src/error.mjs"],
        "a path renamed once in history resolves at its new path — real, committed, immutable",
      );
      const chained = buildRenameMap([{ from: "src/b.mjs", to: "packages/contracts/src/error.mjs" }, { from: "src/a.mjs", to: "src/b.mjs" }]);
      assert.equal(answer("src/a.mjs", chained).at, "packages/contracts/src/error.mjs", "a path renamed twice resolves at its final path");
      assert.equal(answer("src/a.mjs", buildRenameMap([{ from: "src/a.mjs", to: "src/vanished.mjs" }])).resolved, false, "a path renamed to somewhere that no longer exists is unresolved");
      assert.equal(answer("src/mesh-sync.mjs").resolved, false, "a path deleted with no rename record is unresolved");
      assert.equal(answer("src/never-was.mjs").resolved, false, "a src/ path that never existed is unresolved");
      assert.deepEqual([answer("src/work/doctor.mjs:522").resolved, answer("src/work/doctor.mjs:522").locator], [true, ":522"], "a locator is dropped for resolution and reported, never resolved against");
      assert.equal(answer("apps/ui/src/fleet/scope.mjs").resolved, true, "a apps/ui/src path resolves as itself…");
      assert.equal(answer("src/fleet/scope.mjs").resolved, false, "…and is never read as src/fleet/scope.mjs");
    },
  },

  {
    name: "arch/119 FF-11903: ONE home, three readers, and no second rename-resolution rule anywhere",
    run: async () => {
      const spine = stripComments(await readFile(path.join(root, SPINE), "utf8"));
      const control = stripComments(await readFile(path.join(root, "test/arch/command/acd-cited-path-resolves.test.mjs"), "utf8"));
      // 119/01 — the spine's specifier is a fact about where the SPINE sits, and it moved into
      // `src/work/` in this story. The claim is that the spine imports THE RESOLVER, so the
      // specifier is resolved before it is compared rather than matched as a spelling; a control
      // that pinned `"./cited-path-resolve.mjs"` was asserting the doctor's depth, not its edge.
      const resolverSpecifier = spine.match(/from "((?:\.\.?\/)+cited-path-resolve\.mjs)"/u);
      assert.ok(resolverSpecifier != null, "reader 1 — the doctor's control probe imports the exported resolver");
      assert.equal(
        path.posix.normalize(path.posix.join(path.posix.dirname(SPINE), resolverSpecifier[1])),
        RESOLVER,
        "reader 1 — …and the specifier it uses resolves to the ONE home, from wherever the spine sits",
      );
      // 119/03 — DEPTH-AGNOSTIC, and that is the same correction 119/01 made for reader 1 one line
      // up: this control moved into `test/arch/command/` when the arch tree gained an interior, so a
      // pinned `../../` was asserting where the CONTROL sits rather than which module it calls. A
      // re-pointed subject with a token that was not re-pointed with it is 119/01's round-2 Blocker.
      assert.match(control, /from "@aof\/work\/cited-path-resolve"/u, "reader 2 — this sweep calls the same exported resolver");

      // READER 3 (119/03) — a suite path cited in a delivered `.feature`. ADR-004 was amended to
      // name it: 489 such citations across 156 immutable task features are stranded by the test
      // tree's move, and no legal edit repairs them. It resolves through the SAME home, so the
      // ruling is still one resolver asked three times rather than three rules that agree today.
      const THIRD_READER = "test/support/registration/cited-suite-path.mjs";
      const featureReader = stripComments(await readFile(path.join(root, THIRD_READER), "utf8"));
      assert.match(featureReader, /from "@aof\/work\/cited-path-resolve"/u, "reader 3 — the .feature-evidence reader calls the same exported resolver");
      assert.match(featureReader, /\bresolveCitedPath\(/u, "reader 3 — …and calls it rather than re-implementing the fall-through");
      assert.doesNotMatch(featureReader, /\bwhile\s*\([^)]{0,120}\.has\(/u, "reader 3 — it follows no rename chain of its own; the one home does that");
      assert.match(spine, /resolveCitedPath\(control, \{ renameMap \}\)/u, "…and the spine calls it rather than re-implementing the fall-through");

      // NO SECOND RESOLUTION RULE. Every module that walks a rename record does it through the one
      // home; nothing re-derives the chain, and nothing stores a redirect table.
      const sources = [...(await walk(path.join(root, "packages"), [], new Set(["node_modules", "assets", "dist", "target"]))), ...(await walk(path.join(root, "test")))]
        .filter((full) => full.endsWith(".mjs"))
        .map((full) => rel(full));
      assert.ok(sources.length > 0, "the sweep of src/ and test/ found no .mjs module — a walk whose subject set empties must FAIL naming the directory (119/ADR-003 §4)");
      const rivals = [];
      const tables = [];
      for (const where of sources) {
        if (where === RESOLVER) continue;
        const code = stripComments(await readFile(path.join(root, where), "utf8"));
        // A SECOND CHAIN-WALKER — a loop that follows a rename map from one path to the next,
        // which is the resolution RULE. Reading a map (`map.get(x)` in an assertion) is not a rule
        // and is deliberately not caught here: the claim is that the chain is followed in one
        // place, not that nobody may look at a record.
        if (/while\s*\([^)]{0,120}\.has\(/u.test(code) && /\brename/iu.test(code)) rivals.push(where);
        // A hand-kept redirect table: a DECLARED literal map from an old path to a new one. The
        // check is on the declaration rather than on the name, so a control that merely spells the
        // names it forbids — this one — is not its own violation.
        if (/(?:const|let|var)\s+(?:MOVED_PATHS|RENAMED_PATHS|PATH_REDIRECTS|MOVED_MODULES)\s*=/u.test(code)) tables.push(where);
      }
      assert.deepEqual(rivals, [], "no second rename-resolution rule exists in src/ or test/ — one home, asked twice");
      assert.deepEqual(tables, [], "no file in the repository stores a redirect table of moved paths (119/ADR-003 species 1, at the scale of 8,252 citations)");
      // …and the other spelling of the same defect: a document that keeps the moves by hand.
      // AN ABSENCE CLAIM: the floor belongs on the listing, never on the filtered set, which is
      // meant to be empty. Bound first, so the swept set is the one asserted non-vacuous.
      const rootEntries = await readdir(root);
      assert.ok(rootEntries.length > 0, `the listing of ${root} is empty — the walk behind this absence claim must have read something`);
      const strays = rootEntries.filter((name) => /^MOVES\.md$/iu.test(name));
      assert.deepEqual(strays, [], "no MOVES.md — the map is derived from history, which is why it cannot go stale");
    },
  },

  {
    name: "arch/119 FF-11903: the spine still executes nothing, and the git read is HANDED to it by the command edge",
    run: async () => {
      const spine = stripComments(await readFile(path.join(root, SPINE), "utf8"));
      for (const door of ["child_process", "execFileSync", "spawnSync", "execSync"]) {
        assert.equal(spine.includes(door), false, `the spine names no ${door} — nothing between the register and the finding executes anything`);
      }
      assert.match(spine, /controlProbes\[control\]\s*=\s*\(await stat\(path\.join\(projectRoot, control\)\)\)/u, "leg A still assigns controlProbes[control] from an await stat( of the joined path…");
      const legAAt = spine.indexOf("controlProbes[control] = (await stat(path.join(projectRoot, control))");
      const fallThroughAt = spine.indexOf("resolveCitedPath(control, { renameMap })");
      assert.ok(legAAt >= 0 && fallThroughAt > legAAt, "…and it is the FIRST branch, with the rename map consulted only on its miss");
      assert.match(spine, /renameMap = null \} = \{\}\) \{/u, "the rename map reaches the snapshot as data supplied by the caller");

      const edge = stripComments(await readFile(path.join(root, EDGE), "utf8"));
      assert.match(edge, /execFileAsync\("git", args/u, `${EDGE} is the module that reads the repository's history`);
      assert.match(edge, /const history = readRenameMap\(/u, "…and hands the snapshot a history LOADER as data, exactly as projectRoot already is (160/ADR-007)");
      assert.match(edge, /^\s*history,$/mu, "…passed to the snapshot, which loads it only on a miss");
      assert.match(edge, /readCitationHistory\(projectRoot, run\)/u, "…using the common history reader, which owns the resolver's argv and recorded module links");
    },
  },

  {
    name: "arch/119 FF-11903: the map is DERIVED and is asserted to be non-empty — an empty map must not read as a pass",
    run: async () => {
      const renameMap = await renameMapFromHistory();
      assert.ok(renameMap.size > 0, `the rename map is non-empty (${renameMap.size} records) — read from git's own rename records and from no file in the tree`);
      assert.equal(
        resolveThroughRenames("src/commands/errors.mjs", renameMap),
        "packages/contracts/src/error.mjs",
        "the control names ONE known rename it resolved, so a map that answered nothing could not report green",
      );
      const resolver = stripComments(await readFile(path.join(root, RESOLVER), "utf8"));
      for (const forbidden of ["child_process", "node:fs", "readFile", "execFile"]) {
        assert.equal(resolver.includes(forbidden), false, `the resolver is PURE — it names no ${forbidden}, so the map can only arrive as data`);
      }
    },
  },

  {
    name: "arch/119 FF-11903: the citation sweep is bounded by a shrink-only ceiling pinned to a measured count",
    run: async () => {
      const { result } = await realSweep();
      const named = result.unresolved.map((entry) => `${entry.token} (cited in ${entry.documents.length} document(s), e.g. ${entry.documents[0]})`);
      assert.ok(
        result.unresolved.length <= UNRESOLVED_CEILING,
        `${result.unresolved.length} distinct src/ citations under wiki/work/** resolve neither at HEAD nor through a recorded rename, against a ceiling of ${UNRESOLVED_CEILING}. `
          + "The ceiling may FALL and may never RISE: repair the citation, or land the module it names.\n  - "
          + named.join("\n  - "),
      );
      // SHRINK-ONLY. Raising the ceiling fails here rather than passing quietly — the leg that makes
      // the ratchet a ratchet rather than a number somebody re-stamps.
      assert.ok(UNRESOLVED_CEILING <= HIGH_WATER, `the ceiling may fall and may never rise: ${UNRESOLVED_CEILING} against the ${HIGH_WATER} recorded when this control landed`);
      // …and each unresolvable citation is REPORTED BY PATH, not merely counted.
      for (const entry of result.unresolved) {
        assert.match(entry.token, /^(?:src|packages\/[A-Za-z0-9_-]+\/src)\//u, `${entry.token} is reported by path`);
        assert.ok(entry.documents.length > 0, `${entry.token} names the document citing it`);
      }
    },
  },

  {
    name: "arch/119 FF-11903: the sweep cannot pass by reading nothing",
    run: async () => {
      const { result } = await realSweep();
      assert.ok(result.scanned > 1, `the sweep scanned more than one document (${result.scanned} files under wiki/work/**)`);
      assert.ok(result.documentsWithCitations > 1, `…more than one of which carries a src/ citation (${result.documentsWithCitations})`);
      assert.ok(result.citations > 1, `…and it extracted more than one src/ citation (${result.citations} across ${result.distinct} distinct tokens)`);
      // A walk that yields no citations FAILS rather than reporting zero unresolvable.
      const empty = await sweep({ documents: [{ rel: "wiki/work/none.md", text: "no citations here" }], srcFiles: new Set(), renameMap: new Map() });
      assert.equal(empty.citations, 0);
      assert.deepEqual(empty.unresolved, [], "…which would report ZERO unresolvable — the exact vacuous pass the floors above refuse");
    },
  },

  {
    name: "arch/119 FF-11903: the extractor's LEFT ANCHOR is a criterion — a apps/ui/src path is never clipped into a phantom src/ casualty",
    run: () => {
      const text = "see apps/ui/src/fleet/scope.mjs and src/work/doctor.mjs and node_modules/x/src/y.mjs";
      assert.deepEqual([...text.matchAll(CITATION)].map((m) => m[0]), ["src/work/doctor.mjs"], "only the unprefixed src/ path is a citation");
      const unanchored = /src\/[A-Za-z0-9_./-]+\.mjs/gu;
      assert.equal([...text.matchAll(unanchored)].length, 3, "an extractor without the anchor reports three, two of them manufactured");
    },
  },

  {
    name: "arch/119 FF-11903: the RED PROBE is a citation to a path that never existed, and removing it returns the sweep to green",
    run: async () => {
      const srcFiles = new Set(["src/work/doctor.mjs"]);
      const renameMap = await renameMapFromHistory();
      const planted = { rel: "wiki/work/99_milestone_probe/SPEC.md", text: "it is enforced by src/planted-never-existed.mjs, beside src/work/doctor.mjs" };
      const clean = { rel: "wiki/work/99_milestone_probe/SPEC.md", text: "it is enforced by src/work/doctor.mjs" };

      const red = await sweep({ documents: [planted], srcFiles, renameMap });
      assert.deepEqual(red.unresolved.map((entry) => entry.token), ["src/planted-never-existed.mjs"], "the sweep fails naming the planted path…");
      assert.deepEqual(red.unresolved[0].documents, [planted.rel], "…and the document citing it");

      const green = await sweep({ documents: [clean], srcFiles, renameMap });
      assert.deepEqual(green.unresolved, [], "removing the planted citation returns the sweep to green");
      assert.equal(green.citations, 1, "…without emptying the walk, which would be a different kind of green");
    },
  },

  {
    name: "arch/119 FF-11903: an uncommitted move is not yet a recorded rename",
    run: async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-uncommitted-"));
      try {
        const git = async (...args) => execFileAsync("git", args, { cwd: dir, encoding: "utf8", windowsHide: true });
        await git("init", "-q");
        await git("config", "user.email", "probe@example.invalid");
        await git("config", "user.name", "probe");
        await mkdir(path.join(dir, "src"), { recursive: true });
        await writeFile(path.join(dir, "src", "before.mjs"), "export const x = 1;\n", "utf8");
        await git("add", "-A");
        await git("commit", "-qm", "seed");
        await writeFile(path.join(dir, "src", "after.mjs"), "export const x = 1;\n", "utf8");
        await rm(path.join(dir, "src", "before.mjs"));

        const map = await renameMapFromHistory(dir);
        const answer = resolveCitedPath("src/before.mjs", { existsAtHead: (c) => c === "src/after.mjs", renameMap: map });
        assert.equal(answer.resolved, false, "the resolver answers UNRESOLVED for the old path");
        assert.equal(resolveThroughRenames("src/before.mjs", map), null, "…because the rename is not in the repository's history");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "160/06 task00 [outline] A command over a stream whose citations all resolve spawns no git for history (2 rows)",
    run: async () => {
      for (const command of ["work:doctor", "work:validate"]) {
        await withCitingProject({ cites: "src/present.mjs" }, async (dir) => {
          const { result, spawns } = await gitSpawnsUnder(dir, () => runCommand(command, dir));
          assert.ok(Array.isArray(result.findings), `${command} answered its findings envelope`);
          assert.deepEqual(historyReadCounts(spawns), NO_HISTORY_READ, `${command}: no "log" walk, no history "diff" and no "rev-parse HEAD" for the memo (spawned: ${JSON.stringify(spawns)})`);
        });
      }
    },
  },

  {
    name: "160/06 task00 A citation of a renamed file still resolves through history",
    run: async () => {
      await withCitingProject({ cites: "src/old.mjs", renamed: true }, async (dir) => {
        const { result, spawns } = await gitSpawnsUnder(dir, () => runCommand("work:doctor", dir));
        assert.deepEqual(historyReadCounts(spawns), HISTORY_READ_ONCE, "history was read once");
        assert.deepEqual(result.findings.filter((finding) => finding.message?.includes("src/old.mjs")), [], "the citation resolves to src/new.mjs, so doctor reports nothing for it, exactly as before this story");
        const { result: validated } = await gitSpawnsUnder(dir, () => runCommand("work:validate", dir));
        assert.deepEqual(validated.findings.filter((finding) => finding.problem?.includes("src/old.mjs")), [], "…and validate resolves the same reads entry through the same history");
      });
    },
  },

  {
    name: "160/06 task00 A citation history cannot resolve reports as it did",
    run: async () => {
      await withCitingProject({ cites: "src/never-existed.mjs" }, async (dir) => {
        const { result, spawns } = await gitSpawnsUnder(dir, () => runCommand("work:validate", dir));
        const story = path.join(dir, "wiki", "work", "01_milestone_fixture", "stories", "00_story_fixture", "STORY.md");
        assert.deepEqual(
          result.findings.filter((finding) => finding.problem?.includes("src/never-existed.mjs")),
          [{ path: story, problem: 'story reads path "src/never-existed.mjs" does not exist' }],
          "the finding is byte-identical to the one validate reported before this story",
        );
        assert.equal(historyReadCounts(spawns).renameLog, 1, "…and it was reached through history, which was read for the miss");
      });
    },
  },

  {
    name: "160/06 task00 A directory that is not a checkout still answers an empty map, and only on a miss",
    run: async () => {
      await withCitingProject({ cites: "src/missing.mjs", checkout: false }, async (dir) => {
        const result = await runCommand("work:doctor", dir);
        assert.deepEqual(
          result.findings.filter((finding) => finding.code === "wiki-source-unresolved").map((finding) => finding.message),
          ["wiki/notes.md cites src/missing.mjs (first at line 3), which resolves to no current file and has no recorded move to one"],
          "the miss is reported as it was, and no error is raised",
        );
      });
    },
  },

  {
    name: "arch/160 FF-16007: doctor and validate load history through a loader, on a miss, and the red probe — an eager load — is detected",
    run: async () => {
      const edge = stripComments(await readFile(path.join(root, EDGE), "utf8"));
      const spine = stripComments(await readFile(path.join(root, SPINE), "utf8"));
      const validate = stripComments(await readFile(path.join(root, "packages/work/src/commands/validate.mjs"), "utf8"));
      const tune = stripComments(await readFile(path.join(root, "packages/work/src/commands/tune.mjs"), "utf8"));
      const eager = (source) => /await readRenameMap\([^)]*\)\.load\(\)|renameMap: await readRenameMap\(/u.test(source);
      assert.match(edge, /function readRenameMap\(projectRoot, runGit = null\) \{\s*if \(projectRoot == null\) return null;\s*let loaded = null;\s*return Object\.freeze\(\{ load: \(\) => \(loaded \?\?= readHistory\(projectRoot, runGit\)\) \}\);/u, "readRenameMap builds a loader that reads history once, on its first load()");
      for (const [name, source] of [["doctor", edge], ["validate", validate], ["tune", tune]]) assert.equal(eager(source), false, `${name} never loads history eagerly`);
      assert.match(spine, /if \(controlProbes\[control\] === true\) continue;\s*renameMap \?\?= history == null \? null : await history\.load\(\);/u, "the snapshot loads history only past a miss");
      assert.match(validate, /if \(target == null\) \{[\s\S]*?resolveCitedPath\(resolved\.projectPath, \{ renameMap: await history\?\.load\(\) \?\? null \}\)/u, "validate loads history only where a reads entry missed on disk");
      assert.match(tune, /if \(history != null && citationMissedOnDisk\(resolved\)\) resolved = resolveWith\(await history\.load\(\)\);/u, "tune re-resolves through history only when a cited document missed");

      // THE RED PROBE — load history eagerly again, at the doctor edge.
      const reverted = edge.replace("const history = readRenameMap(ctx.workspace.projectRoot ?? null);", "const history = readRenameMap(ctx.workspace.projectRoot ?? null); await readRenameMap(ctx.workspace.projectRoot ?? null).load();");
      assert.notEqual(reverted, edge, "the mutation changed the edge");
      assert.equal(eager(reverted), true, "an eager load is red");
    },
  },
];
