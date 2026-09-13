// Fitness function: acd-cache-read-surface-boundary (milestone 43 / ADR-005) —
//
//   "The readers migrate through a NEW cache-first seam (src/work/read.mjs) that IMPORTS
//    work.mjs and is never imported back; the worker-side and structural readers are
//    PINNED to disk BY POSITIVE ASSERTION."
//
// WHY the positive half matters more than the negative half. RESEARCH measured 33 disk-read
// call sites across 21 modules in three categories: (a) control-side, must migrate — 13
// modules / 18 sites; (b) WORKER-side, must NOT migrate — 2 modules / 7 sites; (c)
// structural, stays on disk — 6 modules / 8 sites. A negative-only guard ("nobody imports
// the disk readers") would happily accept a later well-meaning "finish the migration" that
// moves a WORKER onto the control's cache — which would make a worker read someone else's
// opinion of its own checkout — or moves the RENAME engine off the disk it is renaming.
// Those two mistakes are unrecoverable-looking and silent. So (b) and (c) are asserted
// POSITIVELY: they must still import work.mjs's disk readers.
//
// The direction clause reuses m41/ADR-001 verbatim: `src/work.mjs` is the god-node —
// imported by 37 modules, imports only 3 — so a new capability lives BESIDE it, importing
// its readers, never inside it, and it must never be imported back.
//
// Proofs:
//  1. GREEN — the worker-side readers still read their own checkout through work.mjs.
//  2. GREEN — the structural readers (rename/insert/upgrade/reindex-reactors) still read
//     the disk that is the SUBJECT of their operation.
//  3. ARMED — once src/work/read.mjs exists: it imports ./work.mjs, work.mjs never imports
//     it back, and the control-side (a)-list modules no longer import the four disk-reader
//     symbols from work.mjs — each entry anchored to the SUBJECT whose read migrated, so a
//     module the read has LEFT cannot satisfy the absence for free (110).
//  Self-check (m03 non-vacuous): the symbol detector distinguishes a disk-reader import
//  from any other work.mjs import, and a planted work.mjs->work-read.mjs edge trips the
//  direction guard.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WORK = path.join(repoRoot, "src", "work.mjs");
const READ_SEAM = path.join(repoRoot, "src", "work", "read.mjs");

const DISK_READERS = ["listItems", "findWork", "nextWork", "listStream"];

// EVERY PIN CARRIES ITS SUBJECT (m43/ADR-016/G2 — the RELOCATION hole, measured).
//
// A pin of the form "module X must still import symbol S" is satisfied by ANY surviving
// occurrence of S in X. Measured at 43/06's review: this file pinned
// `src/global-work-store.mjs` for `listItems` to protect what ADR-005 names "the WORKER-side
// content read" (`readWorkspaceContentRecords`) — and 43/03 MOVED that function to
// `src/work/content-read.mjs`. The pin went on passing, green, on a DIFFERENT `listItems`
// call in the publish path, while the guarantee it was written to hold had left the file.
// Grep green, guarantee relocated — retro lesson R2/m08, and ADR-015/F1's rule from the
// other side: a detector keyed on a SPELLING measures the author's vocabulary, not the
// invariant. So each entry also names the FUNCTION whose read is being pinned, and the pin
// fails the moment that function is not declared in that module — which is the signal to
// RE-POINT the pin, not to delete it.
const declares = (name) => new RegExp(`(?:function|const|let|class)\\s+${name}\\b|\\b${name}\\s*[:=]\\s*(?:async\\s*)?(?:function|\\()`);

// (b) WORKER-side reads — a worker reading its OWN materialized worktree is the intended
// behaviour (SPEC), and must survive the migration untouched.
const WORKER_SIDE = [
  // The worker's five execution reads (`:258`, `:2510`, `:2790`, `:2863`, `:3007`) — the
  // ref it was dispatched, resolved against the worktree it is actually working in.
  { file: path.join("src", "mesh", "worker-execution.mjs"), symbols: ["findWork", "listItems"], subject: "createMeshWorkerExecutionHandler" },
  // ADR-005 (b) names this read as `global-work-store:601`. It MOVED to its own module at
  // 43/03 and is re-pointed here at 43/06's review (ADR-016/G2). It is the read that turns
  // a worker's own worktree into the artifact bodies it streams: it must never be answered
  // by another node's copy of those bodies.
  { file: path.join("src", "work", "content-read.mjs"), symbols: ["listItems"], subject: "readWorkspaceContentRecords" },
  // The dual-use self-report read (ADR-005: "how a node reads its own disk to report its own
  // state"). Not a reader that must migrate, and not a worker-side read either — it is the
  // publish path's own disk scan, and a cache-first version of it would make a node report
  // someone else's opinion as its own observation.
  { file: path.join("src", "global-work-store.mjs"), symbols: ["listItems"], subject: "readWorkspaceProjectionItems" },
  // FOUND at 43/06's review (ADR-016/G2): the launcher's stream tick reads the ACTIVE
  // WORKTREE's own items (`mesh-launcher.mjs:1532`) to build the frame it pushes. The
  // module's own comment already says the import "must stay" — a rule living in a comment
  // is not a rule, and this is the assertion that makes it one. The launcher's OTHER read
  // (the control-side presence aggregation) correctly migrated; the two must not be
  // conflated on a later tidy-up.
  { file: path.join("src", "mesh", "launcher.mjs"), symbols: ["listItems"], subject: "startLauncher" },
];

// (c) STRUCTURAL reads — the disk is the SUBJECT of the operation (SPEC's out-of-scope
// bullet: "work-reindex renames real folders … disk is the subject … not a stale copy").
const STRUCTURAL = [
  { file: path.join("src", "work", "reindex.mjs"), symbols: ["listItems"], subject: "rewriteReferences" },
  // RE-POINTED at 127/02 (ADR-016/G2 again). The subject was `preflightTopLevelScaffold`, the
  // top-level axis's pre-mutation read of the real stream — DELETED by 127/ADR-003 §4 when the
  // top-level axis left `insert-shared.mjs` (`runInsertTopLevel` now lives in `promote.mjs`, and
  // `insert-*` are aliases of scaffold-into-backlog + `promote --at`). The NESTED axis stayed, and
  // `runInsertStory` is its structural read: it enumerates the real top-level folders to resolve
  // `--under` to a LIVE milestone before the slot-open writes into it. The pin moves to the read
  // that remained, and the top-level read is pinned at its new home below — never deleted.
  { file: path.join("src", "commands", "insert-shared.mjs"), symbols: ["listItems"], subject: "runInsertStory" },
  // 127/02 — the top-level structural read's NEW home. `promoteRow` reads the stream's width, the
  // destination-exists check and the archived-collision set from the disk that is the subject of
  // the move it is about to make (a rename into the numbered stream); answered from a cache it
  // could mint a number an archived row already holds, or rename onto a folder that is there.
  { file: path.join("src", "commands", "promote.mjs"), symbols: ["listItems"], subject: "promoteRow" },
  { file: path.join("src", "work", "upgrade.mjs"), symbols: ["listItems"], subject: "planUpgrade" },
  { file: path.join("src", "effects", "table.mjs"), symbols: ["listItems"], subject: "remapRunRecordRefs" },
  { file: path.join("src", "effects", "reconcile.mjs"), symbols: ["listItems"], subject: "reconcileRunRecords" },
  // work-doctor keeps ONE disk snapshot; ADR-005 overlays cache facts onto it in the
  // snapshot BUILDER (per-fact, ADR-010/R6.1) rather than splitting the snapshot's
  // source per check-group. The ITEM SET stays the disk's — that is what makes doctor's
  // findings claims about folders that are actually here.
  { file: path.join("src", "work", "doctor.mjs"), symbols: ["listItems"], subject: "buildSnapshot" },
  // ADR-010/R6.3 — RECLASSIFIED from control-side (a) to structural (c) at Three Amigos.
  // The read scans top-level items to choose the append position for a folder it then creates
  // on disk through the m41 reindex engine. A cache-derived answer would land the insert past
  // the end of the real stream and leave a numbering gap — a structural-placement read, not an
  // item-state read.
  //
  // RE-POINTED at 88 (ADR-016/G2 doing exactly what it was written to do). The read was
  // `promote-gap-to-chore.mjs`'s `defaultAt(workDir)` until milestone 71 / story 01 extracted the
  // promotion ENGINE to `src/work-promote/promotion.mjs` (ADR-004: one engine, two faces), where
  // it is now `appendPosition(workDir)` and answers for BOTH faces rather than one. The subject
  // anchor caught the relocation and named it as a re-point rather than passing green on a
  // surviving symbol — the guarantee moved, so the pin moved with it.
  { file: path.join("src", "work-promote", "promotion.mjs"), symbols: ["listItems"], subject: "appendPosition" },
  // The SAME module's SECOND structural read, pinned separately at 107 — because a pin carries ONE
  // subject and this module has two. `findPromotedChore(workDir)` scans the real top-level folders to
  // decide whether a finding is ALREADY scheduled, immediately before the promotion writes; answered
  // from a cache it could miss a chore created moments ago and mint a duplicate of finished work —
  // the disk is the subject of the write it is about to make. Pinning only `appendPosition` would
  // leave this read green-by-accident if IT relocated while its neighbour stayed: the ADR-016/G2
  // relocation hole one level out, in the very module G2 was re-pointed to at 88.
  { file: path.join("src", "work-promote", "promotion.mjs"), symbols: ["listItems"], subject: "findPromotedChore" },
];

// (a) CONTROL-side readers that must move onto the seam (RESEARCH §5.2).
//
// EVERY ENTRY CARRIES ITS SUBJECT TOO — ADR-016/G2 read from the NEGATIVE side (added at 110).
// A control-side entry asserts an ABSENCE ("this module no longer imports the disk readers"), and an
// absence is satisfied for free by a module the read has LEFT: move `resolveItem` into some module
// that still imports `findWork` and this list goes on reporting the migration as done. That is the
// same relocation hole the positive pins closed, inverted — and worse, because a positive pin fails
// loudly on the relocation while this one goes green on it. So each entry names the FUNCTION whose
// read migrated, and fails the moment that function is not declared in that module — the signal to
// RE-POINT the entry, never to delete it. ONE entry per SUBJECT, so a module with two migrated reads
// carries two, exactly as STRUCTURAL does for `promotion.mjs`.
const CONTROL_SIDE = [
  { file: path.join("src", "commands", "next.mjs"), subject: "nextCommand" },
  { file: path.join("src", "commands", "find.mjs"), subject: "findCommand" },
  { file: path.join("src", "commands", "resolve.mjs"), subject: "resolveItem" },
  { file: path.join("src", "commands", "resolve.mjs"), subject: "resolveItemExact" },
  { file: path.join("src", "commands", "list.mjs"), subject: "listCommand" },
  { file: path.join("src", "commands", "run-start.mjs"), subject: "runStartCommand" },
  { file: path.join("src", "commands", "mesh", "heartbeat.mjs"), subject: "meshHeartbeatCommand" },
  // (promote-gap-to-chore.mjs moved to STRUCTURAL — ADR-010/R6.3)
  //
  // CLASSIFIED at 110, the third read of the promotion family and the only one of the three that is
  // control-side. `runPromoteFindingToChore`'s ref-resolution scan asks whether the reviewed ref
  // resolves and whether it is itself a chore (the 118/01 depth bound) — item-STATE questions that
  // reach through neither a row's `dir` nor its `number`, which is exactly what separates it from
  // its two structural neighbours in `promotion.mjs`. The category is a property of the READ, not of
  // the module or the family: one function here makes all three, and they are classified apart.
  { file: path.join("src", "commands", "promote-finding-to-chore.mjs"), subject: "runPromoteFindingToChore" },
  { file: path.join("src", "commands", "notion-associate.mjs"), subject: "notionAssociateCommand" },
  { file: path.join("src", "notion", "sync-work.mjs"), subject: "syncMilestoneWork" },
  { file: path.join("src", "memory", "local-indexing.mjs"), subject: "buildRecords" },
  { file: path.join("src", "mesh", "assignment.mjs"), subject: "assignWork" },
  { file: path.join("src", "mesh", "assignment.mjs"), subject: "withdrawWork" },
  { file: path.join("src", "mesh", "assignment-reclaim.mjs"), subject: "reclaimStaleAssignments" },
];

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// The named bindings a module imports FROM work.mjs (any relative depth).
function workImportBindings(commentStrippedSource) {
  const bindings = new Set();
  const re = /import\s*\{([^}]*)\}\s*from\s*["'][^"']*\bwork\.mjs["']/g;
  let m;
  while ((m = re.exec(commentStrippedSource)) !== null) {
    for (const raw of m[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name.length > 0) bindings.add(name);
    }
  }
  return bindings;
}

async function assertPinned(group, label) {
  const problems = [];
  for (const { file, symbols, subject } of group) {
    const source = stripComments(await readFile(path.join(repoRoot, file), "utf8"));
    // THE SUBJECT ANCHOR first: if the pinned read has left this module, the symbol pin
    // below is measuring something else and must be re-pointed rather than trusted.
    if (!declares(subject).test(source)) {
      problems.push(`${file} no longer declares ${subject}() — the ${label} read this pin protects has MOVED; re-point the pin at its new home (ADR-016/G2), never delete it`);
      continue;
    }
    const bindings = workImportBindings(source);
    for (const symbol of symbols) {
      if (!bindings.has(symbol)) {
        problems.push(`${file} no longer imports ${symbol} from work.mjs — ${label} reads (${subject}) must stay on DISK (ADR-005)`);
      }
    }
  }
  assert.deepEqual(problems, [], `pinned-reader problems: ${JSON.stringify(problems)}`);
}

export const archTests = [
  {
    name: "arch/43 ADR-005 (acd-cache-read-surface-boundary): the WORKER-side readers still read their own checkout through work.mjs — a worker must never read the control's opinion of its own worktree",
    run: async () => assertPinned(WORKER_SIDE, "worker-side"),
  },
  {
    name: "arch/43 ADR-005 (acd-cache-read-surface-boundary): the STRUCTURAL readers (reindex / insert / upgrade / reactors / doctor) still read the disk that is the SUBJECT of their operation",
    run: async () => assertPinned(STRUCTURAL, "structural"),
  },
  {
    name: "arch/43 ADR-005 (acd-cache-read-surface-boundary): ARMED — once src/work/read.mjs exists it imports ./work.mjs, work.mjs never imports it back, and the control-side readers are off the disk readers",
    run: async () => {
      assert.ok(existsSync(READ_SEAM), `the read seam must be readable at ${READ_SEAM} — a subject a control cannot find is a FAILURE, never a skip (119/01, ADR-003 §4): this gate returned green having asserted nothing, so a move of its subject was undetectable at review`);

      const seamSpecs = importSpecifiers(stripComments(await readFile(READ_SEAM, "utf8"))).map((entry) => entry.specifier);
      assert.ok(
        seamSpecs.some((s) => /(^|\/)work\.mjs$/.test(s)),
        `src/work/read.mjs must import ./work.mjs (the seam consumes the readers, never the reverse) — imports: ${seamSpecs.join(", ")}`,
      );
      const workSpecs = importSpecifiers(stripComments(await readFile(WORK, "utf8"))).map((entry) => entry.specifier);
      assert.deepEqual(
        workSpecs.filter((s) => /(^|\/)work-read\.mjs$/.test(s)),
        [],
        "src/work.mjs must NEVER import the read seam — the 37-module god-node's blast radius does not grow (m41/ADR-001)",
      );

      const stragglers = [];
      for (const { file, subject } of CONTROL_SIDE) {
        const full = path.join(repoRoot, file);
        // A MISSING module is a re-point signal, not a skip. The positive pins have always treated
        // it as one (`assertPinned` just reads the file), and a `continue` here would let a deleted
        // module satisfy the absence exactly as a relocated subject would — the same hole, one level
        // out. Closed at 110, with the anchor it belongs to.
        if (!existsSync(full)) {
          stragglers.push(`${file} is gone — the control-side read this entry names (${subject}) has MOVED; re-point the entry at its new home (ADR-016/G2), never delete it`);
          continue;
        }
        const source = stripComments(await readFile(full, "utf8"));
        // THE SUBJECT ANCHOR, same as the positive pins and for the inverse reason: a module the
        // migrated read has LEFT satisfies "no longer imports the disk readers" for free.
        if (!declares(subject).test(source)) {
          stragglers.push(`${file} no longer declares ${subject}() — the control-side read this entry names has MOVED; re-point the entry at its new home (ADR-016/G2), never delete it`);
          continue;
        }
        const bindings = workImportBindings(source);
        const still = DISK_READERS.filter((symbol) => bindings.has(symbol));
        if (still.length > 0) stragglers.push(`${file} still imports ${still.join("/")} from work.mjs (${subject})`);
      }
      assert.deepEqual(stragglers, [], `control-side (a) problems (a straggler still on the disk readers, or a relocated subject to re-point): ${JSON.stringify(stragglers)}`);
    },
  },
  {
    name: "arch/43 ADR-005 (acd-cache-read-surface-boundary): self-check — the binding detector distinguishes a disk-reader import from any other work.mjs import, and ignores unrelated modules",
    run: async () => {
      const sample = 'import { findWork, listItems, loadWorkspace } from "./work.mjs";';
      const bindings = workImportBindings(sample);
      assert.ok(bindings.has("findWork") && bindings.has("listItems"), "the detector sees the disk readers");
      assert.ok(bindings.has("loadWorkspace"), "the detector sees a non-reader binding too (it does not pre-filter)");

      const renamed = workImportBindings('import { listItems as diskListItems } from "../work.mjs";');
      assert.ok(renamed.has("listItems"), "the detector follows a renamed import back to its exported name");

      const unrelated = workImportBindings('import { listItems } from "./catalog.mjs";');
      assert.equal(unrelated.size, 0, "the detector does NOT flag an unrelated module's listItems (catalog.mjs — a verified false positive)");

      const seamOnly = workImportBindings('import { resolveItem } from "./work/read.mjs";');
      assert.equal(seamOnly.size, 0, "the detector does not confuse work-read.mjs for work.mjs");
    },
  },

  {
    name: "arch/43 ADR-016/G2 (acd-cache-read-surface-boundary): self-check — the SUBJECT anchor catches the relocation that a symbol-only pin goes green through (the measured global-work-store:601 case)",
    run: async () => {
      // The exact shape that fooled the symbol-only pin: the subject function is GONE from
      // the module, but the pinned symbol survives on an unrelated call.
      const relocated = 'import { listItems } from "./work.mjs";\nexport function publishWorkspaceSnapshot(){ const items = listItems(dir); }';
      assert.ok(workImportBindings(relocated).has("listItems"), "the symbol pin alone is satisfied (this is the hole)");
      assert.ok(!declares("readWorkspaceContentRecords").test(relocated), "…and the subject anchor is NOT — it sees the function has left");

      // …and it does not misfire on the ordinary declaration spellings this repo uses.
      assert.ok(declares("buildSnapshot").test("export async function buildSnapshot(workDir, opts) {}"), "an exported async function declaration is seen");
      assert.ok(declares("defaultAt").test("async function defaultAt(workDir) {}"), "a module-private async function is seen");
      assert.ok(declares("mergeWorkerItems").test("export const mergeWorkerItems = (rows) => rows;"), "an arrow-function const is seen");
      assert.ok(!declares("buildSnapshot").test("const x = await buildSnapshot(dir);"), "a CALL is not a declaration");
    },
  },
];
