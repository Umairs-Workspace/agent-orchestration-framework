// `work:doctor`'s engine — the deterministic, cross-item HEALTH lane over an ACD
// work stream (milestone 15 / ADR-003). A SIBLING of `work.mjs`'s `validateWork`,
// a new *consumer* of the model: it reuses `listItems` for identity, a `readMeta`
// pass for frontmatter, the raw `workDir` listing for orphan detection, and a
// per-item folder-mtime probe for the freshness lane — and adds NO new identity
// parsing. It must NOT duplicate `validateWork`'s per-file checks (folder↔
// frontmatter, tag vocabulary, the depends graph): those stay in the VALIDITY
// lane. Doctor's groups are strictly the cross-item / docs-for-status / freshness
// / structural-integrity facts validate cannot see.
//
// The shape (ADR-001/ADR-003):
//   Finding = { code, severity: "warn"|"error", path, message }   — basis-neutral
//             (path is a RAW ABSOLUTE in its on-disk OS form; the FACE relativises).
//   doctorWork(workDir, config, scope, { now, staleWindow }) builds the snapshot
//   ONCE, runs each pure (snapshot, ctx) => Finding[] group in the registry,
//   concatenates + de-dupes identical code+path+message, and filters to scope.
//
// DETERMINISM (ADR-003, a fitness function): this module reads NO wall-clock —
// `now`/`staleWindow` arrive through `ctx`. The only FS time read is the snapshot's
// `stat` pass, taken once at build, handed to the groups as data (not a clock they
// call). Same fixture + same `now` ⇒ byte-identical findings.
import path from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";
// milestone 127 / ADR-001 §5 — the item grammar, the backlog leaf grammar and the two root
// names all come from their ONE home. This module used to carry its own `ITEM_RE` copy (a
// milestone-37 vocabulary change had to be made three times); now the orphan lane below
// matches against the same bindings the enumerator walks with, and spells no root name.
import {
  listItems,
  parseFrontmatter,
  isDependTarget,
  siblingDependencyNumber,
  ITEM_RE,
  BACKLOG_ITEM_RE,
  BACKLOG_ROOT,
  ARCHIVE_ROOT,
} from "../work.mjs";
// Story 01/02 check-groups, each a pure (snapshot, ctx) => Finding[] APPENDED to
// the registry below (ADR-003). They consume isDependTarget from this module
// (the cycle is safe — the bindings are read only inside the group bodies at run
// time, never at module-evaluation time). Both lanes asked `isDriver` until chore 104;
// both of their questions were the NAMING one, and the export below still carries
// `isDriver` for a phase-question lane that does not exist yet.
import { statusCoherenceGroup, lifecycleCompletenessGroup, cacheAuthorityGroup } from "./doctor-coherence.mjs";
import { freshnessGroup, structuralIntegrityGroup } from "./doctor-freshness.mjs";
import { budgetGroup, PLAN_BASENAME } from "./doctor-budget.mjs";
// story 80 / task 02 — the subtree-scope RULE, in one zero-import home (below).
import { itemInScope } from "./ref-scope.mjs";
// milestone 33 / story 00 (ADR-004.4, F-3203) — the mesh-identity-committed warn group.
import { meshIdentityCommittedGroup } from "./doctor-identity.mjs";
// milestone 66 / story 02 (ADR-003, ROUND 3/3) — THE CONTROLS LANE, and the ONE import
// edge in this file that runs the OTHER WAY. Every other check-group module imports
// the spine for its item identity (`ITEM_RE`/`isDependTarget`); the controls lane must not, because the spine
// imports `node:fs/promises` and FF-6605 forbids the lane reaching it in one hop. So
// the lane is a true leaf that takes item identity from the snapshot ROWS, and the
// SPINE imports IT — calling the pure extractors below to learn which paths to probe
// and which filenames are control-shaped. There is no edge back, and the two pure
// extractors are the whole of the coupling.
import { controlsLane, citedControlPathsIn, isControlFileName } from "./doctor-controls.mjs";
// 119/ADR-004 — the ONE resolver, deliberately NOT named `work-doctor-*`: the lane roster in
// `test/arch/audit/acd-controls-never-execute.test.mjs` pins this spine's `./work-doctor-*.mjs` imports
// against a closed list, so a sibling-shaped name here would red a delivered control. It is PURE,
// and the git output it resolves through is handed in by `src/commands/doctor.mjs`.
import { resolveCitedPath } from "../cited-path-resolve.mjs";
// milestone 54 / story 04 — the traceability lane, a SIBLING of the controls lane and not an
// edit to it (`66/FF-6605` guards that file). Same `(snapshot, ctx) => Finding[]` shape,
// same registry seam, same never-executes discipline.
import { rubricTraceabilityGroup, declaredReportFrom } from "./doctor-rubric.mjs";
// milestone 78 / story 03 — THE LOOP-RECORD LANE and the two snapshot facts it needs, both read at
// this engine's one impure edge (below) so the lane stays a pure function of the snapshot.
// `projectExecution` is 78/00's PURE leaf and is the ONE home for the `brief.loop` join — a second
// reading of that envelope here would be the copy that drifts. It is called with an EMPTY registry
// on purpose: the registry only decorates an engagement (`declared`, `ceiling`), and this module may
// not name the registry family at all (52/FF-5202 sweeps every `src/work-doctor*.mjs`), so the join
// is taken and the decoration is left to the command that owns it.
import { loopRecordLane, EXECUTION_RECORD_BASENAME } from "./doctor-loop-record.mjs";
import { projectExecution } from "../loop-record.mjs";
import { readRuns } from "../run-store.mjs";
// milestone 124 / story 00 (ADR-002 §1) — THE DEPENDS LANE, a fourth advisory group in the shape
// 54/04 and 78/03 already hold, and the ONE resolution of a declared contract set it reads
// (124/ADR-003 §1). The resolver is called at this engine's impure edge below, so the lane itself
// opens no file: `src/story-contract.mjs` is a pure leaf with zero project imports, and asking it
// here rather than in the lane is what keeps the lane replayable from a literal snapshot.
import { dependsLane } from "./doctor-depends.mjs";
import { resolveDeclaredSet } from "../story-contract.mjs";

// The record-doc mapping is owned by `work.mjs`; doctor is a consumer. `work.mjs` does
// not export the type→doc map, so the snapshot pass replicates that tiny body here (the
// same closed vocabulary) rather than re-globbing identity. The item-identity regex is
// NOT replicated any more (127/ADR-001 §5): it is imported above, and `isDependTarget`
// showed the direction of travel — exported there, imported here, never mirrored (chore
// 104).
const DAY_MS = 24 * 60 * 60 * 1000;

const recordDoc = (type) =>
  type === "milestone"
    ? "SPEC.md"
    : type === "story"
      ? "STORY.md"
      : type === "uat"
        ? "SESSION.md"
        : type === "spike"
          ? "SPIKE.md"
          : type === "chore"
            ? "CHORE.md"
            : null;

// Top-level drivers of the stream — the items that carry a number the resolver
// keys on (milestones + uat sessions + spike/chore — milestone 37 / ADR-001).
// Mirrors `work.mjs`'s `isDriver`.
export const isDriver = (item) =>
  item.type === "milestone" || item.type === "uat" || item.type === "spike" || item.type === "chore";

// …and the WIDER set — the numbers a top-level item may OCCUPY and a `depends:` edge may NAME,
// a parentless story included. Deliberately NOT mirrored like `isDriver` above: it is imported
// from its one home in `work.mjs` and RE-EXPORTED here, so the check-group lanes reach it exactly
// as they reach the identity vocabulary while exactly one body exists (chore 104). Mirroring is
// what let three readers of one question drift apart — `validate` and the readiness walk widened,
// doctor's coherence lane did not, and milestone 78's satisfied edge on the parentless story 79
// read as an unmet dependency at severity `error`.
// …and, for the SAME reason and by the same route (milestone 124 / story 00), the story-level
// half of the rule: `siblingDependencyNumber` is what `validateWork` resolves a child story's
// `depends:` through, and the depends lane's edge set must be exactly the set validate resolves.
// Mirroring it here would be the fourth reader of the naming question drifting from the other
// three — the failure chore 104 paid for.
export { isDependTarget, siblingDependencyNumber };

async function readDirSafe(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function mtimeMs(target) {
  try {
    return (await stat(target)).mtimeMs;
  } catch {
    return null;
  }
}

// ONE recursive pass over an item's subtree, answering TWO questions from the SAME
// traversal (milestone 16 / ADR-002's rule — a measurement rides an existing walk,
// never a second one):
//
//   newest — the newest mtime of any FILE in `dir`'s subtree (the dir's own mtime does
//            NOT move when a descendant file's content changes, which is why milestone
//            15 story 02's `mtime-ahead-of-updated` needs the descendant-FILE mtime).
//            Pure DATA handed to the freshness group; it never re-reads the FS or a clock.
//   staged — milestone 66 / story 02 (ADR-004 §4): the test-shaped FILENAMES this walk
//            already visits and used to discard. The staging prohibition needs a
//            recursive filename walk nothing carried before; this one already recurses
//            and `stat`s every file, so the prohibition costs no second traversal.
//            The name test is `isControlFileName`, imported from the lane — ONE
//            spelling of "a file a runner can see", shared with leg B.
//
// Returns `{ newest, staged }`; `newest` is null for an empty/absent subtree.
async function scanItemTree(dir) {
  let newest = null;
  const staged = [];
  for (const entry of await readDirSafe(dir)) {
    const child = path.join(dir, entry.name);
    // Do NOT follow symbolic links / junctions: on Windows a junctioned dir is
    // reported as a directory, and a cyclic link would recurse to a stack overflow.
    // A symlink is not a content file of this item's tree — skip it entirely.
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      const sub = await scanItemTree(child);
      if (sub.newest != null && (newest == null || sub.newest > newest)) newest = sub.newest;
      staged.push(...sub.staged);
    } else {
      const m = await mtimeMs(child);
      if (m != null && (newest == null || m > newest)) newest = m;
      if (isControlFileName(entry.name)) staged.push(child);
    }
  }
  return { newest, staged };
}

// The convention docs the lifecycle-completeness group (story 01) keys on. Probed
// once at snapshot build as pure DATA (presence + non-emptiness): an empty stub is
// a missing deliverable, mirroring SPEC's "non-empty VERIFICATION.md".
// story 85 / task 01 — `OUTCOME.md` JOINS THE SET rather than getting a probe of its own.
// Every delivered story owes one (story 80 widened outcomes past the milestone), so its
// absence is a convention fact exactly as `RETROSPECTIVE.md`'s is — unlike `EXECUTION.md`,
// which only an item that ran loops owes and which 78/ADR-001 therefore keeps OUT of this
// set. Joining the set is also what gives the story branch of `lifecycleCompletenessGroup`
// both its facts from ONE source, including the per-fact cache overlay: a check whose two
// questions came from two different probes would be one worker-authored item away from
// disagreeing with itself. EXPORTED because `commands/doctor.mjs` asks the mesh cache for
// these same names — two literal lists is how the disk probe and the cache read come to
// answer for different documents (43/ADR-007's lesson, one module over).
export const CONVENTION_DOCS = ["VERIFICATION.md", "RETROSPECTIVE.md", "ARCHITECTURE.md", "OUTCOME.md"];

// Count lines platform-invariantly (milestone 16 / ADR-003): split on `/\r?\n/` so a
// CRLF (win32) and an LF (CI) line break yield the SAME count, and DROP a single
// trailing empty element so a terminating `\n` does NOT add a phantom line — an empty
// file ⇒ 0 lines, "a\nb\n" ⇒ 2, "a\nb" ⇒ 2 (STATE.md's fixed convention). Pure over
// text the snapshot already read (no FS read of its own).
function splitLines(text) {
  const parts = text.split(/\r?\n/);
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

// `{ present, nonEmpty, lines, text }` for a file — present means it exists; nonEmpty
// means it exists AND has non-whitespace content; lines is the splitLines count of the
// SAME read (milestone 16 / ADR-002: measurement of an existing read, not a second
// read). Absent ⇒ { present:false, nonEmpty:false, lines:0, text:null }.
//
// `text` is milestone 66 / story 02's ONE addition (ADR-003 §4), and it is the text
// this function already read and threw away. The controls lane needs exactly what was
// discarded, so it rides here rather than arriving as a second open of the same
// document. The CALLER decides what to keep: `docs` keeps story 01's `{present,
// nonEmpty}` shape EXACTLY, `docSizes` keeps the count, `docTexts` keeps the text.
async function fileState(target) {
  try {
    const text = await readFile(target, "utf8");
    return { present: true, nonEmpty: text.trim().length > 0, lines: splitLines(text).length, text };
  } catch {
    return { present: false, nonEmpty: false, lines: 0, text: null };
  }
}

// Whether a `tasks/` dir directly under `dir` holds at least one `.feature` file (an
// authored task contract), PLUS the per-`.feature` line counts measured on that SAME
// traversal. A started story with an empty/absent `tasks/` has no acceptance contract
// yet (story 01's `started-story-no-tasks`); the sizes feed the doc-bloat budget
// group's `feature` kind (milestone 16 / ADR-002 — measurement rides an existing walk,
// never a second one). Sizes are keyed `tasks/<name>` so the finding anchors at the
// feature file itself, not at the story folder.
// milestone 54 / story 04 — the SAME read's TEXT is kept alongside its line count, exactly as
// `66/ADR-003` §4 did for the convention docs: no extra traversal, no second open. The
// traceability lane needs each feature's `@executable` scenario names, and taking them off a
// read that already happened is what keeps the lane a pure function of the snapshot.
async function taskFilesState(dir) {
  const tasksDir = path.join(dir, "tasks");
  let hasTasks = false;
  const sizes = {};
  const featureTexts = {};
  for (const entry of await readDirSafe(tasksDir)) {
    if (!entry.isFile()) continue;
    // A TASK CONTRACT IS A `.feature` FILE — the one meaning the other two consumers already
    // use (item 51, paid 2026-09-05). This used to count ANY regular file, so a story whose
    // `tasks/` held `notes.md` and no contract read "has tasks" to `started-story-no-tasks`
    // and to the Loop-Ready `tasks-authored` row, while `aof work tasks <ref>` (which parses
    // `tasks/*.feature`) and `aof work loop` (which dispatches `drive refine` off the same
    // count) correctly reported zero. Two readiness surfaces, one story, opposite answers.
    if (!entry.name.endsWith(".feature")) continue;
    hasTasks = true;
    const state = await fileState(path.join(tasksDir, entry.name));
    if (state.present) {
      sizes[`tasks/${entry.name}`] = { lines: state.lines };
      featureTexts[`tasks/${entry.name}`] = state.text;
    }
  }
  return { hasTasks, sizes, featureTexts };
}

// -------------------------------------------------------------- snapshot ----

// Build the SHARED, read-only snapshot ONCE (ADR-003 step 1). Every group reads
// from this; no group re-traverses the FS for identity. It carries:
//   items        — the `listItems` set, each enriched with { meta, mtimeMs }
//   workDir      — the stream root (so a group can anchor a root-level finding)
//   topEntries   — the raw `workDir` dir listing (dirs only) for orphan detection
//   storyEntries — per milestone, its `stories/` dir listing (dirs only)
// Mtimes come from a single `stat` pass here — the one FS time read, taken at
// build and handed to the freshness group as DATA (never a clock it calls).
// THE CACHE OVERLAY (milestone 43 / story 06, ADR-005 + ADR-010/R6.1).
//
// `work-doctor` does NOT simply migrate onto the cache, and the reason is the whole point:
// doctor's SUBJECT is this node's disk — folder identity, orphans, numbering, folder mtime —
// so a doctor that read its ITEM SET from the cache would start reporting findings whose
// `path` names folders that are not here. But a doctor that read its STATUS from the disk
// would report a FALSE finding against every item a worker authored, because the control's
// disk holds only the stale pre-run scaffold. Neither half is optional.
//
// So the snapshot is still built ONCE, from disk, and the BUILDER overlays the facts the
// cache is authoritative for onto the rows it already has. The pure `(snapshot, ctx) =>
// Finding[]` group architecture is untouched — no group changes its source or its signature.
//
// THE OVERLAY IS PER-FACT, and each fact degrades to disk INDEPENDENTLY, recording its own
// source (ADR-010/R6.1). Overlaying status alone would have created a new false-finding class
// one group over: `lifecycleCompletenessGroup` reads `status × docs × children`, so a
// worker-authored milestone reported `done` would fire missing-verification +
// missing-retrospective + milestone-no-stories against EVERY remote milestone. The stamps
// below are what let that group tell "the cache says this is done AND carries its
// deliverables" apart from "the cache says this is done and I know nothing else about it".
//
// Nothing here reads the FS or a clock: the overlay arrives as plain data through
// `doctorWork`'s options, at the same impure edge `now` / `rawCommittedMesh` already use.
function overlayFor(item, cache, diskMeta, diskDocs) {
  const row = cache?.rows?.get?.(item.ref);
  if (row == null) {
    return {
      meta: diskMeta,
      docs: diskDocs,
      statusFrom: "disk",
      docsFrom: {},
      childrenFrom: "disk",
      cachedChildRefs: [],
      reportedBy: null,
      diskStatus: diskMeta.status ?? null,
    };
  }
  // STATUS — the cache's row wins, whoever reported it. The DISK's own value is kept beside
  // it (never discarded): a disagreement is a finding when this node itself last reported
  // the row, and silent when another node did, and `node_id` is the only thing that tells
  // those two apart (ADR-005). Discarding the disk value would make the pair unaskable.
  const meta = { ...diskMeta, status: row.status ?? null };

  // DOCS — per NAME, because the cache genuinely holds some and not others (a worker streams
  // what it wrote). A name the cache answers for is cache-sourced; every other name keeps the
  // disk's probe, and says so.
  const cachedDocs = cache?.docs?.get?.(item.ref);
  const docs = { ...diskDocs };
  const docsFrom = {};
  for (const name of Object.keys(diskDocs)) {
    const cached = cachedDocs?.get?.(name);
    if (cached == null) continue;
    docs[name] = { present: cached.present, nonEmpty: cached.nonEmpty };
    docsFrom[name] = "cache";
  }

  // CHILDREN — the cache's rows carry `parent`, so a milestone's children are derivable from
  // the same read. Sourced from the cache only when it actually knows of any; a milestone the
  // cache holds with no children is indistinguishable from one it holds nothing about, and
  // guessing the difference is what a `cache-incomplete` finding exists to avoid.
  const cachedChildRefs = item.type === "milestone" && cache?.rows != null
    ? [...cache.rows.values()].filter((r) => r.parent != null && String(r.parent) === item.number).map((r) => r.ref)
    : [];

  return {
    meta,
    docs,
    statusFrom: "cache",
    docsFrom,
    childrenFrom: cachedChildRefs.length > 0 ? "cache" : "disk",
    cachedChildRefs,
    reportedBy: cache?.provenance?.get?.(item.ref)?.reportedBy ?? null,
    diskStatus: diskMeta.status ?? null,
  };
}

// milestone 124 / story 00 (ADR-002 §4, ADR-003 §1) — A STORY'S TWO CONTRACT SETS, resolved from
// the `STORY.md` TEXT THE SNAPSHOT HAS ALREADY READ. The shape is ADR-002 §4's:
// `{ reads, files, present, malformed }`, where `reads`/`files` are the resolved entry lists and
// `null` is the resolver's UNKNOWN (absent, malformed, an untouched scaffold, or a set one
// unresolvable entry poisoned).
//
// `null` FOR A NON-STORY IS A FACT, NOT A GAP: `reads:`/`files:` exist only on `STORY.md`, and
// that permanence is half of what the lane's coverage finding reports.
//
// A SNAPSHOT BUILT WITHOUT A PROJECT ROOT resolves nothing, and says so by answering UNKNOWN —
// the same honest degradation `controlProbes` takes, and for the same reason: no entry can be
// resolved without a root, and a lane must never be handed a set that silently means "empty".
function storyContractSets(item, text, projectRoot) {
  if (item?.type !== "story") return null;
  const unknown = {
    reads: null,
    files: null,
    present: { reads: false, files: false },
    malformed: { reads: false, files: false },
  };
  if (typeof text !== "string" || projectRoot == null) return unknown;
  const reads = resolveDeclaredSet(text, "reads", { storyDir: item.dir, projectRoot });
  const files = resolveDeclaredSet(text, "files", { storyDir: item.dir, projectRoot });
  return {
    reads: reads.entries,
    files: files.entries,
    present: { reads: reads.present, files: files.present },
    malformed: { reads: reads.malformed, files: files.malformed },
  };
}

export async function buildSnapshot(workDir, { cache = null, selfNode = null, projectRoot = null, runners = null, report = null, renameMap = null } = {}) {
  const items = await listItems(workDir);

  // A SNAPSHOT FACT GATHERED BY A RECURSIVE WALK BELONGS TO THE ITEM THAT OWNS THE PATH
  // (milestone 66 / ADR-011/D). `scanItemTree` walks a whole subtree, and a milestone's
  // subtree CONTAINS its stories' — so stamping its result onto every enclosing row
  // makes one file two findings, and the horizon then judges the wrong owner. The
  // engine's de-dupe keys on code+path+message WITHOUT severity, so of the two the
  // FIRST row wins: measured over a fixture, a staged control under a `done` story
  // inside an open milestone was reported at `error` — an error against a path under a
  // `done` item, which ADR-002's own invariant forbids — and under a `done` milestone
  // an open story's `error` was silently lost instead. 0 such files exist today, so it
  // was LATENT; the ruling generalises past `stagedControls` to every future recursive
  // measurement, because the horizon is per-owning-item (ADR-009/F).
  //
  // The nearest owner is the LONGEST item dir that contains the path. `listItems`
  // already knows every one of them, so ownership costs no traversal.
  const itemDirs = items.map((entry) => entry.dir);
  const ownedBy = (dir, target) =>
    !itemDirs.some((other) => other.length > dir.length && target.startsWith(other + path.sep));

  const enriched = [];
  for (const item of items) {
    const doc = recordDoc(item.type);
    // Additive snapshot DATA (milestone 16 / ADR-002, the one allowed snapshot
    // extension): a SEPARATE per-artifact line-count map for the long-form context
    // docs the doc-bloat budget group measures (SPEC.md / ARCHITECTURE.md / STORY.md).
    // Kept distinct from `docs` (story 01's present/non-empty contract) so the two
    // stories' data shapes never entangle. Populated ONLY from text the snapshot
    // already reads — the frontmatter read here and the CONVENTION_DOCS fileState
    // read below — never a second filesystem read of any artifact.
    const docSizes = {};
    // milestone 66 / story 02 (ADR-003 §4) — the TEXT of every document this snapshot
    // already opens, kept instead of discarded. Keyed by file name, present only for
    // documents that exist. THE RECORD-DOC READ IS EXTENDED ALONGSIDE `fileState`
    // deliberately: a `uat` item's record doc is `SESSION.md`, which ADR-001 §1 makes
    // a `## Findings` REGISTER FILE — read it for frontmatter only and every
    // `SESSION.md` findings register is invisible to the register lane.
    //
    // THE BOUNDARY, NAMED RATHER THAN DISCOVERED: this is exactly the set doctor
    // already reads — the CONVENTION_DOCS plus the record doc — and NOT a
    // document more. Story 85 added `OUTCOME.md` to that set for its PRESENCE, so its
    // text arrives here too; no lane parses it, and none may start to without saying so,
    // because every consumer names the files it reads (`REGISTER_FILES` /
    // `MEMORY_SOURCE_FILES` in the controls lane) rather than walking this map. `STATE.md` is therefore outside the controls lane's reach, which
    // is what `00_one-lane-that-reads-and-never-runs.feature`'s last scenario buys
    // ("the only new reads are one existence probe per cited control path and one read
    // per declared runner file").
    const docTexts = {};
    let meta = {};
    if (doc) {
      try {
        const text = await readFile(path.join(item.dir, doc), "utf8");
        meta = parseFrontmatter(text);
        docTexts[doc] = text;
        // SPEC.md (milestone) / STORY.md (story) are budgeted context docs; measure
        // them from THIS read. SESSION.md (uat) is not budgeted — excluded.
        if (doc === "SPEC.md" || doc === "STORY.md") docSizes[doc] = { lines: splitLines(text).length };
      } catch {
        meta = {};
      }
    }
    // Additive snapshot DATA (ADR-003, the one allowed snapshot extension): the
    // convention-doc presence/non-emptiness map + the `tasks/`-non-empty flag the
    // lifecycle-completeness group (story 01) reads, probed once here as pure data.
    const docs = {};
    for (const name of CONVENTION_DOCS) {
      const state = await fileState(path.join(item.dir, name));
      // Preserve story 01's `docs` shape EXACTLY ({ present, nonEmpty }) — never leak
      // `lines` into it (milestone 16 / ADR-002). The ARCHITECTURE.md line count rides
      // the SAME fileState read into the separate docSizes map (no extra traversal).
      docs[name] = { present: state.present, nonEmpty: state.nonEmpty };
      if (name === "ARCHITECTURE.md" && state.present) docSizes["ARCHITECTURE.md"] = { lines: state.lines };
      // …and the SAME read's text into the separate map (no extra traversal, no
      // second open — milestone 66 / ADR-003 §4). The uniform assignment is PINNED by
      // 66/02's own measurement test, which reads this line's shape to prove the text
      // rides a read that already happened; story 85's `OUTCOME.md` is therefore kept
      // like every other member rather than special-cased out of it.
      if (state.present) docTexts[name] = state.text;
    }
    // milestone 78 / story 03 — THE TWO SNAPSHOT FACTS THE LOOP-RECORD LANE ADDS, and the read is
    // deliberately shaped so that an item with no record costs ONE probe and nothing more.
    //
    // `EXECUTION.md` is NOT a `CONVENTION_DOCS` member (78/ADR-001): only items that ran loops owe a
    // record, and a lane that demanded one from every item would report on the whole stream on day
    // one. So the probe is here rather than in the loop above, and its absence is data — the lane
    // reports nothing for it.
    //
    // THE RUN READ HAPPENS ONLY FOR AN ITEM THAT HAS A RECORD, which is what bounds the cost: today
    // that is 0 items in this repository, so doctor's I/O is unchanged until an operator writes a
    // record. `loopEngagements` is the loop id of each engagement the item's runs now project, taken
    // through 78/00's pure leaf; `null` means "not looked at", which the lane reads as "no staleness
    // claim available" rather than as "nothing ran".
    const executionRecord = await fileState(path.join(item.dir, EXECUTION_RECORD_BASENAME));
    let loopEngagements = null;
    if (executionRecord.present) {
      const projected = projectExecution({ registry: [], runs: await readRuns(item), config: {} });
      loopEngagements = projected.engagements.map((engagement) => engagement.loop).filter((id) => typeof id === "string");
    }
    // One `tasks/` walk serves both the lifecycle flag and the per-feature sizes.
    const taskFiles = item.type === "story" ? await taskFilesState(item.dir) : { hasTasks: false, sizes: {}, featureTexts: {} };
    Object.assign(docSizes, taskFiles.sizes);
    // milestone 96 / ADR-006 §1 — the OPTIONAL story build brief, measured into the SAME docSizes map
    // the budget group already reads, so its length is governed with no check of its own. The probe
    // is here rather than in the CONVENTION_DOCS loop above for the reason 78/03's `EXECUTION.md`
    // probe is: only a story in a project that turned the gate on owes a plan, and a lane that
    // demanded one of every story would report on the whole stream on day one. An ABSENT plan
    // records no entry, so the budget group is SILENT for it rather than measuring it as zero —
    // "a story with no plan document is silent, not short". Story-scoped, so it costs one stat per
    // story and nothing at all for a milestone, chore, spike or uat.
    if (item.type === "story") {
      const plan = await fileState(path.join(item.dir, PLAN_BASENAME));
      if (plan.present) docSizes[PLAN_BASENAME] = { lines: plan.lines };
    }
    // milestone 124 / story 00 (ADR-002 §4) — THE CONTRACT SETS, RESOLVED HERE and nowhere else.
    // `reads:`/`files:` live only on `STORY.md`, whose text this snapshot has ALREADY read for
    // its frontmatter (above) — so this costs no traversal and opens no file, exactly as 66/03's
    // `docTexts` and 78/03's engagement list do. Resolving them at this one impure edge is what
    // keeps the depends lane a pure function of the snapshot: it never learns where it ran.
    const contract = storyContractSets(item, docTexts[doc], projectRoot);
    const overlaid = overlayFor(item, cache, meta, docs);
    // ONE recursive pass, two answers (see `scanItemTree`).
    const tree = await scanItemTree(item.dir);
    enriched.push({
      ...item,
      meta: overlaid.meta,
      mtimeMs: await mtimeMs(item.dir),
      // The newest mtime of any file in the item's folder subtree, for the
      // freshness group's `mtime-ahead-of-updated` check. The folder mtime alone is
      // insufficient (it does not move on a descendant-file content change).
      newestFileMtimeMs: tree.newest,
      // The test-shaped files this item OWNS (milestone 66 / ADR-004 §4, ADR-011/D) —
      // the ones in its subtree that sit under no NESTED item, so each file appears on
      // exactly one row and the horizon judges the item that could actually delete it.
      // PER ITEM DIR, which is narrower than FF-6607's `**` — a file directly under
      // `<work.dir>` or inside an orphan folder is unseen here (ROUND 3/12 names this
      // as a difference, not a contradiction; the arch-test holds the wider claim).
      stagedControls: tree.staged.filter((target) => ownedBy(item.dir, target)),
      docs: overlaid.docs,
      docSizes,
      docTexts,
      hasTasks: taskFiles.hasTasks,
      // milestone 78 / story 03 — see the read above. `{ present, text }` is `fileState`'s own shape;
      // `loopEngagements` is null for an item with no record, which is the ordinary case.
      executionRecord: { present: executionRecord.present, text: executionRecord.text },
      loopEngagements,
      // milestone 124 / story 00 — see `storyContractSets` above. `null` for every item that is
      // not a story, because no other record doc carries the keys; `{ reads: null }` for a story
      // that declared nothing, which the lane reads as "cannot be evaluated" rather than as
      // "declares nothing".
      contract,
      // milestone 54 / story 04 — each task feature's TEXT, keyed `tasks/<name>`, off the
      // walk above. The traceability lane parses these through the ONE feature parser; it
      // holds no second copy of the Gherkin grammar and opens no file of its own.
      featureTexts: taskFiles.featureTexts,
      // The per-fact SOURCE stamps (ADR-005 / ADR-010/R6.1). Internal snapshot fields with
      // no black-box channel of their own — a Finding is `{ code, severity, path, message }`
      // and nothing else — so they are observable only through WHICH findings appear, and
      // through the message of the two findings that must NAME the reporting node (R6.2).
      statusFrom: overlaid.statusFrom,
      docsFrom: overlaid.docsFrom,
      childrenFrom: overlaid.childrenFrom,
      cachedChildRefs: overlaid.cachedChildRefs,
      reportedBy: overlaid.reportedBy,
      diskStatus: overlaid.diskStatus,
    });
  }

  // THE ORPHAN LANE'S RAW LISTINGS (127/ADR-001 §5 — a KEEPER, allow-listed in FF-12701).
  // Doctor's ITEM enumeration is `listItems` above; these `readdir`s exist because the orphan
  // lane's job is to see what the enumerator DROPS, so it cannot ask the enumerator. The root
  // listing is unchanged; the archive is listed by the same rule (its milestones' `stories/`
  // likewise); and `backlog/**` is walked for exactly the two shapes the enumerator drops
  // silently there. Every new entry defaults to empty in `orphanFolderGroup`, so a literal
  // snapshot built without them is still a valid snapshot.
  //
  // The raw root listing — directories only (a stray FILE at the root, e.g.
  // ROADMAP.md, is not an item-folder candidate and is not an orphan).
  const topEntries = (await readDirSafe(workDir))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  // Per-milestone `stories/` directory listings (dirs only) — the second place an
  // orphan (a typo'd story folder) can hide.
  const storyEntries = await milestoneStoryListings(workDir, topEntries);

  // The archive, listed exactly as the root is: its entries, and each archived milestone's
  // `stories/`. `readDirSafe` answers `[]` for an absent root, so a project with no archive
  // carries empty listings here.
  const archiveDir = path.join(workDir, ARCHIVE_ROOT);
  const archiveEntries = (await readDirSafe(archiveDir))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const archiveStoryEntries = await milestoneStoryListings(archiveDir, archiveEntries);

  // Under `backlog/` a non-matching directory is a GROUP by definition, so there is no
  // "unknown folder" there. What the walk reports is the two shapes an operator would want
  // told about: a NUMBERED item at any depth (moved in by hand — a numbered item is never
  // de-numbered, and `promote` is the door the other way), and a `stories/` directly under a
  // leaf (a backlog driver has no stories — promote it first). Each is `{ folder, kind }`,
  // `folder` relative to the backlog root and forward-slashed.
  const backlogOrphans = [];
  await walkBacklogForOrphans(path.join(workDir, BACKLOG_ROOT), "", backlogOrphans);

  // milestone 66 / story 02 (ADR-004 §1) — THE TWO LEGS' I/O, and the only genuinely
  // NEW reads this milestone adds. Both happen HERE, at the snapshot boundary, so the
  // controls lane stays a pure function of data.
  //
  // LEG A IS A `stat`. The cited paths come from the LANE's own pure extractor (the
  // inverted dependency — the spine asks the leaf which paths to probe), are unioned
  // across every item so one path cited twice is probed once, and are resolved against
  // `projectRoot` with `path.join`. NOTHING IS EXECUTED: no spawn, and above all no
  // dynamic `import()` of a cited module, because importing runs its module scope,
  // which is ACD running a project's test code (ADR-004 §2).
  //
  // `projectRoot` is null only when a caller builds a snapshot without one; then no
  // path can be resolved and every declared control is honestly `control-unresolved`,
  // rather than silently passing. `commands/doctor.mjs` always passes it.
  const controlProbes = {};
  const cited = new Set();
  for (const item of enriched) {
    const architecture = item.docTexts?.["ARCHITECTURE.md"];
    if (typeof architecture !== "string") continue;
    for (const control of citedControlPathsIn(architecture, "ARCHITECTURE.md")) cited.add(control);
  }
  if (projectRoot != null) {
    for (const control of cited) {
      try {
        controlProbes[control] = (await stat(path.join(projectRoot, control))).isFile();
      } catch {
        controlProbes[control] = false;
      }
    }
    // THE FALL-THROUGH (119/ADR-004). Leg A above is unchanged and is still the FIRST branch: a
    // control that exists at HEAD is resolved there and history is never consulted for it. Only on
    // a MISS is the rename map asked where the file went — so `control-unresolved` keeps its exact
    // meaning, "this register declares a control that does not exist", and stops meaning "somebody
    // moved a file". The registers that need this belong to DONE items, where the record is
    // immutable and no legal edit could clear the finding.
    //
    // THE MAP IS DATA SUPPLIED BY THE COMMAND EDGE, never read here: this spine names no spawn door
    // (`test/arch/audit/acd-controls-never-execute.test.mjs`), so the git read lives in
    // `src/commands/doctor.mjs` exactly as `projectRoot` does. A null map is an honest no-op —
    // every miss stays a miss, which is what a caller that built a snapshot without history gets.
    for (const control of cited) {
      if (controlProbes[control] === true) continue;
      const answer = resolveCitedPath(control, { renameMap });
      if (answer.at == null) continue;
      try {
        controlProbes[control] = (await stat(path.join(projectRoot, answer.at))).isFile();
      } catch {
        controlProbes[control] = false;
      }
    }
  } else {
    for (const control of cited) controlProbes[control] = false;
  }

  // LEG B IS A TEXT READ, and an honest NO-OP when unconfigured. `null` means the key
  // is absent — the lane then reports `control-runner-unchecked` rather than passing
  // silently. An unreadable runner file is kept as an EMPTY string, so it names
  // nothing and the miss is reported rather than swallowed.
  let runnerTexts = null;
  if (Array.isArray(runners)) {
    runnerTexts = {};
    for (const runner of runners) {
      const relative = String(runner);
      try {
        runnerTexts[relative] = await readFile(projectRoot == null ? relative : path.join(projectRoot, relative), "utf8");
      } catch {
        runnerTexts[relative] = "";
      }
    }
  }

  // `selfNode` rides on the snapshot because the two cache findings are decided by AUTHORSHIP
  // and nothing else: a status disagreement on a ref THIS node last reported is a real fault
  // (something wrote the disk without publishing), and the identical disagreement on a ref
  // another node reported is the mesh working as designed.
  //
  // `projectRoot` rides on it for a narrower reason, measured at 66/02's refine: a check-group
  // may `path.join` but must never `path.resolve` a bare relative, because `path.resolve`
  // reads `process.cwd()` and that is a hidden impurity in a lane whose whole contract is
  // that it is a pure function of this object.
  // milestone 54 / story 04 — THE ONE SNAPSHOT FIELD THE TRACEABILITY LANE ADDS. The last
  // runner report, read HERE at the same boundary leg B reads its runner texts, and arriving
  // as plain text the lane normalises through 54/00's pure leaf. `null` means the key is
  // absent (the lane reports the honest no-op and names the key); `present: false` means it
  // was declared and is not on disk. Reading it here is what keeps the lane's answers
  // reproducible from a literal snapshot with no filesystem at all.
  let rubricReport = null;
  if (report != null) {
    const reportPath = projectRoot == null ? report.path : path.join(projectRoot, report.path);
    try {
      const text = await readFile(reportPath, "utf8");
      rubricReport = { path: reportPath, format: report.format ?? null, present: true, text };
    } catch {
      rubricReport = { path: reportPath, format: report.format ?? null, present: false, text: null };
    }
  }

  return { items: enriched, workDir, projectRoot, topEntries, storyEntries, archiveEntries, archiveStoryEntries, backlogOrphans, selfNode, controlProbes, runnerTexts, rubricReport, renameMap };
}

// The per-milestone `stories/` listings (dirs only) under one numbered root — the root and the
// archive share it, so an archived milestone's typo'd story folder is reported exactly as a
// live one's. Keyed by the milestone's folder name, as `storyEntries` always was.
async function milestoneStoryListings(root, entries) {
  const listings = {};
  for (const entry of entries) {
    const match = entry.match(ITEM_RE);
    if (!match || match[2] !== "milestone") continue;
    listings[entry] = (await readDirSafe(path.join(root, entry, "stories")))
      .filter((child) => child.isDirectory())
      .map((child) => child.name);
  }
  return listings;
}

// The backlog walk for the orphan lane — the SAME group/leaf rule the enumerator applies
// (a directory is a leaf iff it matches `BACKLOG_ITEM_RE`, else a group), consulted here only
// to find the two shapes the enumerator drops silently. A numbered directory is reported and
// not descended (its interior is its own); a leaf is checked for `stories/` and not descended
// (the enumerator never descends a leaf); a group is descended, at any depth.
async function walkBacklogForOrphans(dir, group, found) {
  for (const entry of await readDirSafe(dir)) {
    if (!entry.isDirectory()) continue;
    const folder = group === "" ? entry.name : `${group}/${entry.name}`;
    if (ITEM_RE.test(entry.name)) {
      found.push({ folder, kind: "numbered" });
      continue;
    }
    if (BACKLOG_ITEM_RE.test(entry.name)) {
      const stories = (await readDirSafe(path.join(dir, entry.name))).some((child) => child.isDirectory() && child.name === "stories");
      if (stories) found.push({ folder: `${folder}/stories`, kind: "stories" });
      continue;
    }
    await walkBacklogForOrphans(path.join(dir, entry.name), folder, found);
  }
}

// -------------------------------------------------- seed check-groups ----
//
// The TWO seeded, folder-only check-groups story 00 ships (ADR-004 folder-first).
// They are the minimal pair that gives the `--strict` exit matrix a real warn-only
// fixture (orphan-folder) and a real error fixture (duplicate-driver-number).
// Story 02 owns the REST of structural-integrity (numbering-gap, the ROADMAP hook)
// + all freshness — it must NOT re-implement these two codes, only APPEND groups.

// `orphan-folder` (warn): a directory directly under `workDir` (or under any
// milestone's `stories/`) whose name does NOT match ITEM_RE. `listItems` silently
// drops these (work.mjs), so a typo'd folder vanishes from every command — a real
// artifact nothing else reports.
//
// milestone 127 / ADR-001 — THE LANE KNOWS THE TREE. The two roots are not items and not
// orphans (their names come from `work.mjs`, never a literal of this lane's own); the archive
// is walked by the root's rule; and under the backlog the only findings are the two shapes
// the snapshot's walk named — a numbered item and a leaf's `stories/` — each message naming
// the door. The archive and backlog entries default to empty so a snapshot built without
// them (the literal snapshots three suites construct) reports exactly what it did before.
export function orphanFolderGroup(snapshot) {
  const findings = [];
  const orphan = (target, message) => findings.push({ code: "orphan-folder", severity: "warn", path: target, message });
  const listRoot = (rootDir, entries, storyListings) => {
    for (const name of entries) {
      if (!ITEM_RE.test(name)) orphan(path.join(rootDir, name), `folder "${name}" is not a valid NN_type_slug work item (dropped by every command)`);
    }
    for (const [milestone, children] of Object.entries(storyListings)) {
      for (const name of children) {
        if (!ITEM_RE.test(name)) orphan(path.join(rootDir, milestone, "stories", name), `story folder "${name}" is not a valid NN_type_slug work item (dropped by every command)`);
      }
    }
  };
  listRoot(
    snapshot.workDir,
    snapshot.topEntries.filter((name) => name !== BACKLOG_ROOT && name !== ARCHIVE_ROOT),
    snapshot.storyEntries,
  );
  listRoot(path.join(snapshot.workDir, ARCHIVE_ROOT), snapshot.archiveEntries ?? [], snapshot.archiveStoryEntries ?? {});
  for (const { folder, kind } of snapshot.backlogOrphans ?? []) {
    const target = path.join(snapshot.workDir, BACKLOG_ROOT, ...folder.split("/"));
    if (kind === "numbered") {
      orphan(target, `folder "${folder}" is a numbered item under the backlog — a backlog item carries no number; 'aof work promote' is the door into the stream`);
    } else {
      orphan(target, `folder "${folder}" — a backlog driver has no stories; promote it first`);
    }
  }
  return findings;
}

// `duplicate-driver-number` (error): two top-level items sharing a number — `findWork`/
// `nextWork` key on the number, so a duplicate makes depends/next resolution ambiguous (a
// coherence violation). The subject is `isDependTarget`, not `isDriver` (chore 104): this is
// the NAMING question — which numbers a `depends:` edge may resolve over — and a parentless
// story occupies one of those numbers, so a milestone and a story sharing 79 is the very
// ambiguity this finding is about. ONE
// finding per duplicated NUMBER (anchored at the stream root, naming the conflicting
// folders) — the collision is one fact about the stream, not one per participant.
export function duplicateDriverNumberGroup(snapshot) {
  const byNumber = new Map();
  for (const item of snapshot.items) {
    // Every NUMBERED row, live and archived alike (127/ADR-002 §3): an archived row still
    // holds its number, so a live item minted onto it is exactly this collision. A backlog
    // row has no number to share and is skipped — never keyed at `NaN`.
    if (item.parent != null || item.number == null || !isDependTarget(item)) continue;
    const num = Number.parseInt(item.number, 10);
    if (!byNumber.has(num)) byNumber.set(num, []);
    byNumber.get(num).push(item);
  }

  const findings = [];
  for (const [num, drivers] of [...byNumber].sort((a, b) => a[0] - b[0])) {
    if (drivers.length < 2) continue;
    const names = drivers.map((driver) => driver.name).sort();
    findings.push({
      code: "duplicate-driver-number",
      severity: "error",
      path: snapshot.workDir,
      message: `driver number ${num} is shared by ${drivers.length} top-level items (${names.join(", ")}) — ambiguous depends/next resolution`,
    });
  }
  return findings;
}

// The CHECK-GROUP REGISTRY (ADR-003 step 2): the array the engine iterates. Each
// entry is a PURE `(snapshot, ctx) => Finding[]` fn. A new check family = a new fn
// APPENDED here (the milestone-16 seam); it edits no existing group. Story 00 ships
// the two folder-only seeds; stories 01/02 APPEND their groups below (additive,
// order-independent — the engine concatenates + de-dupes):
//   story 01 — statusCoherenceGroup, lifecycleCompletenessGroup (frontmatter-only)
//   story 02 — freshnessGroup (injected clock + mtimes), structuralIntegrityGroup
//   story 02 — freshnessGroup (injected clock + mtimes), structuralIntegrityGroup
//   milestone 16 — budgetGroup (doc-bloat: per-artifact line budgets off ctx.budgets)
//   milestone 33 (story 00) — meshIdentityCommittedGroup (per-install identity in the
//     COMMITTED config — reads ctx.rawCommittedMesh, never ctx.config, ADR-004.4)
export const CHECK_GROUPS = [
  orphanFolderGroup,
  duplicateDriverNumberGroup,
  statusCoherenceGroup,
  lifecycleCompletenessGroup,
  // milestone 43 / story 06 (ADR-005 + ADR-010/R6.1/R6.2) — the two findings the cache
  // overlay itself makes possible: a real status DIVERGENCE on a ref this node reported, and
  // the ONE honest `cache-incomplete` that replaces three false lifecycle findings when the
  // cache knows an item's status but not its deliverables. APPENDED, like every group before
  // it — the registry seam is why the overlay costs doctor no control flow.
  cacheAuthorityGroup,
  freshnessGroup,
  structuralIntegrityGroup,
  budgetGroup,
  meshIdentityCommittedGroup,
  // milestone 66 / story 02 (ADR-003 §2/§3) — THE CONTROLS LANE, appended as ONE
  // entry carrying all three groups (register / verification / control). One story
  // owns this array for the whole milestone: three stories appending to it would be
  // merge friction wearing an independence claim, which story 65's own record prices.
  // Doctor's lane count is now 5 as 66 counted it — 54/04's rubric lane already made the
  // roster six. That fold-the-family ratchet is SUPERSEDED, priced: `wiki/work/TECH_DEBT.md`
  // item 10, chore 106. This family's growth is governed by FF-5905's NAMED roster, not by
  // moving it into `src/work-doctor/`.
  controlsLane,
  // milestone 54 / story 04 (ADR-006) — THE TRACEABILITY LANE, appended as one entry: which
  // `@executable` scenarios no emitted case names, and which cases name no scenario. It fills
  // the note `src/commands/validate.mjs:57` has shipped for six milestones, and fills it
  // OUTSIDE the 256-dependent god-node. Both its legs are ADVISORY and report at `warn` — a
  // deliberate departure from the horizon, because ~75% of this tree's `@executable`
  // scenarios would report unjoined on arrival and an `error` would be a wall of inherited
  // red. Its codes are a DIFFERENT frozen array from `CONTROL_FINDING_CODES`, which is what
  // makes them structurally incapable of reaching 54/02's doctor gate.
  rubricTraceabilityGroup,
  // milestone 78 / story 03 (ADR-007) — THE LOOP-RECORD LANE, appended as one entry: whether an
  // item's committed loop execution record is signed, part-signed, stale against the runs it is
  // about, or not the frozen shape. It reads the record WHEN PRESENT and never demands one, and
  // every finding is `warn` — the record reports and never gates. Its codes are a DIFFERENT frozen
  // array from `CONTROL_FINDING_CODES`, which is what makes them structurally incapable of reaching
  // 54/02's doctor gate or the loop's `DOCTOR_GATE_CODES` (derived from that array).
  loopRecordLane,
  // milestone 124 / story 00 (ADR-001, ADR-002) — THE DEPENDS LANE, appended as one entry: which
  // resolved `depends:` edges no declared contract witnesses, and — once per run, never once per
  // edge — how many edges the check could not evaluate at all and why. It renders no verdict on
  // an edge, because it cannot tell a false one from capability ordering, and every finding is
  // `warn`. Its codes are a DIFFERENT frozen array from `CONTROL_FINDING_CODES`, which is the
  // fourth instance of the mechanism that makes an advisory lane structurally unable to gate —
  // and the instance FF-12402 raises from a promise about one lane to a claim about the class.
  dependsLane,
];

// ----------------------------------------------------------- the engine ----

// Resolve `config.work.doctor.staleWindowDays` to a window in ms; defaults to
// 30 days when absent. (The CLI face supplies this through `ctx.staleWindow`;
// passing it here keeps the engine's wall-clock-free contract.)
export function staleWindowFromConfig(config) {
  const days = config?.work?.doctor?.staleWindowDays;
  const parsed = Number.parseInt(days, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed * DAY_MS : 30 * DAY_MS;
}

// The DOCUMENTED DEFAULT per-artifact line budgets (milestone 16 / ADR-005). These
// numbers live ONLY here — never baked into the budgetGroup body (the config-sourced
// arch-test source-greps the group for them). Calibrated so `aof work doctor` over a
// healthy repo yields zero `doc-over-budget` findings while genuine bloat fires.
// `feature` is the per-task-contract budget — a task feature past it is carrying prose
// that belongs in ARCHITECTURE.md / DESIGN.md. Calibrated the same way as the others
// (a healthy stream yields zero findings; genuine bloat fires): measured across this
// repo's own 643 features the distribution is median 88 / p90 217 / p95 271 / max 500
// at a 35% comment share, so 300 clears the healthy tail. A measured BLOATED stream
// elsewhere ran to a ~387-line median at a 69% comment share — features so large they
// resisted surgical editing, and the authoring agent wrote throwaway scripts to rewrite
// them instead. The authoring guidance (agent brief + task template) is deliberately
// tighter at ~150: advisory guidance ahead of the hard warning.
// `plan` is milestone 96 / ADR-006 §1's row — the optional story build brief. 80 lines, with the
// template's own authoring guidance deliberately tighter at ~60, mirroring the `feature` kind's
// ~150-against-300 convention: advisory guidance ahead of the hard warning. It is a DEFAULT rather
// than a measurement because no plan document exists in any stream yet to measure; when a
// distribution exists the repair is one line, here.
const DEFAULT_BUDGETS = { spec: 300, architecture: 700, story: 150, feature: 300, plan: 80 };

// Resolve `config.work.doctor.budgets = { spec, architecture, story, feature }` (line
// counts) to a fully-populated set of the same keys, substituting the documented
// default for any absent/invalid key (mirrors `staleWindowFromConfig`'s robustness —
// a non-finite-positive-integer key falls back to its default). A partially-set
// `budgets` leaves the unset kinds on their defaults (ADR-006). The resolved budgets
// flow into the group via `ctx.budgets`, keeping the group pure (it reads no config).
export function budgetsFromConfig(config) {
  const raw = config?.work?.doctor?.budgets ?? {};
  const resolve = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    spec: resolve(raw.spec, DEFAULT_BUDGETS.spec),
    architecture: resolve(raw.architecture, DEFAULT_BUDGETS.architecture),
    story: resolve(raw.story, DEFAULT_BUDGETS.story),
    feature: resolve(raw.feature, DEFAULT_BUDGETS.feature),
    plan: resolve(raw.plan, DEFAULT_BUDGETS.plan),
  };
}

// Scope-as-filter with the SAME semantics as `validateWork` (an unresolved scope
// matches nothing → empty, never a throw). A bare number scopes to that driver's
// subtree (the driver + its stories); `NN/SS` to that exact story; free text to a
// slug substring.
//
// story 80 / task 02 — the RULE moved to the zero-import leaf `work-ref-scope.mjs`;
// this stays the doctor's name for it. It had two copies (here and inside
// `validateWork`) and the memory index needed a third reader that can answer from a
// bare REF, since a MemoryRecord carries `item: "39/02"` and nothing else. One home,
// three callers — so the doctor, validate and recall can never disagree about what
// `39` means.
export function inScope(item, scopeRef) {
  return itemInScope(item, scopeRef);
}

// Scope filters only the ITEM-anchored findings. A finding anchored at the workDir
// root is a STREAM-LEVEL integrity fact (numbering-gap, duplicate-driver-number,
// roadmap-folder-mismatch) — it is ALWAYS reported regardless of scope, mirroring
// `validateWork`'s workDir-anchored `depends cycle`. An item-anchored finding is in
// scope when its path belongs to an in-scope item's folder. A scope that resolves to
// no item still yields the stream-level findings (the unresolved-scope contract — an
// empty item set — applies only to the item-anchored findings).
function filterFindingsToScope(findings, snapshot, scopeRef) {
  if (!scopeRef || scopeRef.trim() === "") return findings;
  const scoped = snapshot.items.filter((item) => inScope(item, scopeRef));
  const dirs = scoped.map((item) => item.dir);
  return findings.filter(
    (finding) =>
      finding.path === snapshot.workDir ||
      dirs.some((dir) => finding.path === dir || finding.path.startsWith(dir + path.sep)),
  );
}

function dedupe(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.code}\0${finding.path}\0${finding.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// `doctorWork(workDir, config, scope, { now, staleWindow, groups })` — the engine
// (ADR-003). Build the snapshot ONCE, run every registry group over (snapshot,
// ctx), concatenate, de-dupe identical code+path+message, filter to scope. `now`/
// `staleWindow` are INJECTED (the impure edge — the CLI's Date.now() — lives at
// the command boundary, never here). `groups` defaults to CHECK_GROUPS; the tests
// (and the milestone-16 seam) pass their own registry to prove composition.
//
// milestone 33 / story 00 (ADR-004.4, F-3203) — `rawCommittedMesh` + `committedConfigPath`
// are ALSO injected at this SAME impure edge: the mesh-identity-committed check-group
// (work-doctor-identity.mjs) must warn off the RAW committed config on disk, never
// `ctx.config` (which is the loadWorkspace-HYDRATED object — post-migration it still
// carries mesh.nodeId, sourced from the sidecar, so warning off it would false-positive
// forever on a correctly-migrated repo). `commands/doctor.mjs` reads the committed
// file's mesh block independently and hands it in here as plain data, exactly like
// `now`/`staleWindow` — the engine itself performs no extra disk read.
export async function doctorWork(workDir, config, scope, options = {}) {
  const { now, staleWindow, budgets, groups = CHECK_GROUPS, acceptingRef, rawCommittedMesh, committedConfigPath, legacyIdentitySidecarPresent, legacyIdentitySidecarPath, cache, selfNode, projectRoot } = options;
  // milestone 43 / story 06 (ADR-005) — `cache` + `selfNode` are injected at the SAME impure
  // edge as `now` and `rawCommittedMesh`: plain data, read by `commands/doctor.mjs`, so the
  // engine still performs no store open and still reads no clock. Absent ⇒ the snapshot is
  // byte-identical to the pre-overlay one and every group sees exactly what it saw before.
  // milestone 66 / story 02 — `projectRoot` and the declared runner list reach the
  // snapshot at this same impure edge. `config.work.controls.runners` is read HERE, so
  // the controls lane never reads config: an ABSENT key arrives as `null` (leg B did
  // not run, and the lane says so) and a present one as the runner FILE TEXTS. Reading
  // it here also keeps `runnerTexts` a snapshot fact, which is what makes the lane's
  // answers reproducible from a literal snapshot with no filesystem.
  const snapshot = options.snapshot ?? await buildSnapshot(workDir, {
    cache: cache ?? null,
    selfNode: selfNode ?? null,
    projectRoot: projectRoot ?? null,
    runners: Array.isArray(config?.work?.controls?.runners) ? config.work.controls.runners : null,
    // milestone 54 / story 04 — `work.rubric.report` is read HERE for the same reason
    // `work.controls.runners` is: the traceability lane never reads config, so an ABSENT
    // declaration arrives as `null` (the join was not checked, and the lane says so, naming
    // the key) and a present one as the report's own text. The resolver is the lane's own,
    // so the two snapshot builders cannot come to read the key two ways.
    report: declaredReportFrom(config),
  });
  const ctx = {
    now: now ?? null,
    staleWindow: staleWindow ?? staleWindowFromConfig(config),
    budgets: budgets ?? budgetsFromConfig(config),
    // Present ONLY for the status door's `→ done` preflight. Ordinary scoped/open
    // doctor calls and stream sweeps omit it, so their budget findings stay warnings.
    acceptingRef: acceptingRef ?? null,
    config: config ?? {},
    rawCommittedMesh: rawCommittedMesh ?? {},
    committedConfigPath: committedConfigPath ?? null,
    legacyIdentitySidecarPresent: legacyIdentitySidecarPresent === true,
    legacyIdentitySidecarPath: legacyIdentitySidecarPath ?? null,
  };

  const all = [];
  for (const group of groups) {
    const produced = group(snapshot, ctx);
    if (Array.isArray(produced)) all.push(...produced);
  }

  return filterFindingsToScope(dedupe(all), snapshot, scope);
}
