import { defaultApplication as _aofApplication } from "aof/default-application";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const invoke = _aofApplication.invoke;
const isLegalTransition = _aofApplication.execution.runs.isLegalTransition;
const runLoopBody = _aofApplication.loop.commandTools.loop.runLoopBody;
import { completingDriver, loopFixture, replaceStatus } from "../../loop/loop-command-probe.test.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RECORD_KEYS = Object.freeze(["runId", "itemRef", "state", "attempt", "outcome", "sessionId", "brief", "createdAt", "updatedAt", "failureReason", "heartbeatAt", "retryOf", "reclaimedAt", "node", "resumeAfter", "spend", "asks"]);
// 102/00 — EIGHT since the producer gained its loop id. 53/ARCHITECTURE.md's FF-5307 entry
// describes seven; that milestone is `done` and its delivered register is not edited, so the
// superseding statement lives in 102/tasks/00 and the control it pins is widened here.
// 126/02 (ADR-004 §5) appends the NINTH key, `supervised`, by the same additive-supersession
// discipline 102/00 used for the eighth (`id`). The eight before it keep their names, order and
// meanings; 126/01's contract anticipated this move and left it to this story.
// 141 appended the tenth, `thinking`, by the same additive discipline.
const LOOP_KEYS = Object.freeze(["loopRunId", "scope", "level", "cap", "phase", "cycle", "startedAt", "id", "supervised", "thinking", "promotedFrom", "refine", "sessions"]);
const STATES = Object.freeze(["queued", "running", "done", "failed", "cancelled"]);
const EDGES = Object.freeze(["queued>running", "queued>cancelled", "running>done", "running>failed", "running>cancelled"]);

async function modulesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await modulesUnder(target));
    else if (entry.name.endsWith(".mjs")) out.push(target);
  }
  return out;
}

function trackedFilesUnder(dir) {
  const rel = path.relative(root, dir).replaceAll("\\", "/");
  // Account for unstaged deletions too. Removing a file changes the pinned digest below;
  // the check must measure that change rather than fail while opening the retired lockfile.
  const deleted = new Set(execFileSync('git', ['ls-files', '--deleted', '-z', '--', rel], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  }).split('\0').filter(Boolean));
  return execFileSync("git", ["ls-files", "-z", "--", rel], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  }).split("\0").filter(Boolean).filter(file => !deleted.has(file)).map((file) => path.join(root, file));
}

async function normalizedDigest(file) {
  return createHash("sha256").update((await readFile(file, "utf8")).replace(/\r\n/gu, "\n")).digest("hex");
}

// THE `ui/` FREEZE, lifted into one assertion over (path, content) pairs (131/05 task 03), so a case
// can hand it an edited tree in memory and watch it refuse. The tree is git's TRACKED list read from
// the working tree: path then LF-normalised content, in path order.
async function uiTreePairs() {
  const manifest = JSON.parse(await readFile(path.join(root, "apps/ui/package.json"), "utf8"));
  // Include the new public development helper before it enters the Git index too.
  const publicFiles = Object.values(manifest.exports ?? {}).map(target => path.resolve(root, "apps", "ui", target));
  // 142 Plan 09: `apps/ui/test/` holds the UI-only suites, which verify the frozen tree rather than being part of it.
  // They are excluded, not re-pinned: the digest below is the one pinned before the tests moved in, and every file
  // under `apps/ui/src/` plus the manifest is still hashed.
  const uiTests = path.join(root, "apps", "ui", "test") + path.sep;
  const frozen = trackedFilesUnder(path.join(root, "apps", "ui")).filter((file) => !file.startsWith(uiTests));
  const files = [...new Set([...frozen, ...publicFiles])].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  return Promise.all(files.map(async (file) => [path.relative(root, file).replaceAll("\\", "/"), await readFile(file, "utf8")]));
}

function assertUiFrozen(pairs) {
  const hash = createHash("sha256");
  for (const [rel, content] of pairs) {
    hash.update(`${rel}\0`);
    // Plan 03 changes one import to its owning public package and declares that
    // dependency. Normalize only those exact ownership edits; the UI behavior
    // and every other byte still have to match the existing frozen digest.
    let normalized = content.replace(/\r\n/gu, "\n");
    if (rel === "apps/ui/src/board/action.mjs") normalized = normalized.replace('"@aof/messaging/form"', '"../../../src/notify/form.mjs"');
    if (rel === "apps/ui/package.json") normalized = normalized.replace('    "@aof/messaging": "workspace:*",\n', '');
    // 142 Plan 09: the UI-only suites run through the workspace's own `test` script; that one added line is the whole manifest change.
    if (rel === "apps/ui/package.json") normalized = normalized.replace(',\n    "test": "node ../../scripts/test-workspace.mjs @aof/ui"', '');
    hash.update(normalized);
    hash.update("\0");
  }
  // RE-PINNED by 119/01 — 11 lines across 9 files under `apps/ui/src/{board,fleet,home,terminal}/`,
  // in `.ts`, `.mjs` and `.d.mts`. EVERY ONE is a comment citation of a module this story
  // moved (`packages/core/src/mesh-*` -> `packages/core/src/mesh/*`, `packages/core/src/board-worker-stream.mjs` -> `packages/core/src/cache-read.mjs`);
  // no component, style, route, export or behaviour changed. `git diff 7893d02c..HEAD -- ui/`
  // is the whole of it, and it is the diff to read before accepting this pin.
  //
  // RE-PINNED AGAIN by 119/03, same species and the same test applied: 12 files under
  // `apps/ui/src/{app,fleet,home,terminal}/`, 36 changed lines, and EVERY ONE is a comment citation
  // of a SUITE this story moved (`test/x.test.mjs` -> `test/<subject>/x.test.mjs`). Measured
  // rather than asserted — `git show adca2f80 -- ui/` filtered to non-comment changed lines is
  // EMPTY — so the zero-board-change contract holds and only the pin moves. That measurement is
  // the condition of accepting this pin: a re-pin taken without it converts the freeze into a
  // rubber stamp, which is the one way a digest gate quietly stops being one.
  // RE-PINNED 2026-09-11 for an operator-requested FLEET change, and the contract this pin
  // guards is measured intact: `git diff -- ui/` is five files, all under `apps/ui/src/fleet/`
  // (`scope.mjs` + `.d.mts`, `Fleet.tsx`, `RepoPicker.tsx`, `FilterBanner.tsx`) — a third
  // narrowing over milestone rows by work status, open by default, and the workspace cards
  // as a second door into the repo narrowing. NOTHING under `apps/ui/src/board/` moved, no run
  // record key is read that was not read before, and the loop's state still rides the run
  // record with no face of its own — which is what 53/ADR-004 froze this tree to protect.
  // The pin is a proxy for that contract, not for the fleet's look; it moves with the diff.
  //
  // RE-PINNED by 127/04 (ADR-006 §2–§4; DESIGN.md surfaces 1 and 2), measured the same way:
  // `git diff d7806cb..b8cd0a1 -- ui/` is 9 files, 376 insertions, all under `apps/ui/src/board/`
  // (`ArchivedPill.tsx` new; `Board.tsx`, `BoardLanes.tsx`, `DetailPanel.tsx`, `Overview.tsx`,
  // `api.ts`, `model.ts`) and `apps/ui/src/fleet/{api.ts,scope.mjs}` — the backlog rows, the
  // `Show archived` toggle threading `includeArchived` into the LIST request, the archived pill,
  // and the fleet's backlog partition. Filtered to added lines that name a run record (`runs`,
  // `runId`, `run.state`, `run.brief`, `heartbeat`, `retryOf`) the diff is EMPTY: the board reads
  // the WORK LIST differently and no run-record key it did not read before, so the loop's state
  // still rides the run record with no face of its own. Re-pinned at aof:verify 127.
  //
  // RE-PINNED by 142 Plan 04: `ui/` moved to `apps/ui/` (paths are part of the digest). Measured the same way:
  // `git diff -M HEAD` over the moved tree, filtered to non-comment changed lines, is EMPTY apart from one CSS
  // comment continuation, plus the two developer-facing citations inside `shell-layout.mjs`'s refusal text (now
  // `apps/ui/src/...`; the dock test asserts the new path). The config editor placeholder `e.g. src, ui/src` is an
  // example path scope for the operator's own repository, not this tree, and was left untouched on purpose.
  //
  // RE-PINNED by 130/03 (ADR-005 §5-§6; ADR-006 §3), measured the same way: `git diff -- ui/`
  // is EIGHT files, all under `apps/ui/src/fleet/` — `api.ts`, `runs.mjs`, `runs.d.mts`,
  // `scope.mjs`, `scope.d.mts`, `Fleet.tsx` (the six the ADR named) plus
  // `assign-affordance.mjs` and `assign-affordance.d.mts` (the one orchestrator generalised
  // by two additive options, `refusalCopy` / `timedOut`, so the loop line's Stop rides the
  // assign affordance's machine instead of a second copy of its deadline race). It is the
  // fleet node card's loop line and its Stop: `presence.loops[]` rendered beside the pinned
  // current-work lines, ONE button on the serving node's card, `fleetApi.loopStop` the one
  // fetch. NOTHING under `apps/ui/src/board/` moved (`git diff -- apps/ui/src/board/` is empty);
  // `packages/core/src/board-ui.mjs`'s digest above is UNCHANGED (959ebf96…), as is `packages/core/src/run-store.mjs`'s;
  // and the `ui/` diff reads NO run record at all — every `runId` it names is a field of the
  // presence record's additive `loops[]` entry (the node's projection of its own run
  // records, packages/core/src/mesh/presence.mjs), so the loop's state still rides the run record with no
  // face of its own and the board's frozen seam is byte-identical. `work:loop` stays
  // BOARD_DEFERRED; no `/api/work/loop` exists.
  //
  // RE-PINNED by the placeholder-node-name rename (2026-09-23, operator request), measured the
  // same way: `git diff -- ui/` is ONE file, `apps/ui/src/fleet/assign-affordance.mjs`, 4 lines,
  // all COMMENTS — a fixture node name in prose, swapped for a same-length placeholder. No
  // code moved, nothing under `apps/ui/src/board/`, no run-record key read.
  //
  // RE-PINNED by 133/04 (ADR-007 §3-§5; DESIGN §"Surface — the ARCHITECTURE tab"), measured the same
  // way: `git diff -- ui/` is FIVE files, all under `apps/ui/src/board/` — `diagrams.mjs` + `.d.mts`
  // (new; the figure states, markup and renderer), `Markdown.tsx` (an optional `images` prop and
  // the `DiagramMarkdown` wrapper), `api.ts` (`ARCHITECTURE` in `DocName`, an optional member on
  // `doc`) and `DetailPanel.tsx` (the tab, the Records row, one call). Filtered to added lines that
  // name a run record (`runs`, `runId`, `run.state`, `run.brief`, `heartbeat`, `retryOf`) the diff
  // holds only two COMMENT lines (a citation of the `runs.mjs` contract, and "runs no script"): no
  // run-record key is read, and the loop's state still rides the run record with no face of its own.
  //
  // RE-PINNED at `aof:verify 133` (F-133-01/02, story 04 task 03), measured the same way: THREE
  // files, all under `apps/ui/src/board/` — `diagrams.mjs` + `.d.mts` (the expand hook on a populated
  // figure, `diagramFileUrl`, and a `link` override that points the block's `diagrams/` links at
  // `/api/diagram/file`), `Markdown.tsx` (the full-size `DiagramViewer` over the same data URI, presented as the shell's fullscreen occupant through `requestFullscreen`)
  // and `DetailPanel.tsx` (one `itemRef` prop on the one call). The run-key filter over the
  // added lines hits nothing: no run-record key is read.
  //
  // RE-PINNED by 131/05 (ADR-006 §2, §4; DESIGN §1): an ask face, not a loop face. Measured the
  // same way, with `AskCard.tsx` in the index: `git diff --numstat -- ui/` is SIX files, all
  // under `apps/ui/src/board/` — `AskCard.tsx` (new, 122), `DetailPanel.tsx` (+2: the import and the
  // mount), `action.mjs` (+89 −1: `askCardState` and the header relabel), `action.d.mts` (+33 −2),
  // `api.ts` (+47: `AskFact`, `AnswerDocument`, `workApi.answer`) and `Board.tsx` (+5 −3: the
  // silent list poll also arms while a row carries an ask, and its comment). What it reads is the ask
  // fact on a list row and the answer route. Filtered to added lines that name a run record, the
  // only hits are the ask fact's and the answer document's own `runId` keys and the card's React
  // key: no run-record key, cycle, level or loop state is read, so the loop's state still rides
  // the run record with no face of its own.
  // 142: only ui/package-lock.json is retired in favor of the authoritative root yarn.lock.
  // 142/06 adds explicit exports and the Node-only vite-cli development helper.
  // The helper resolves Vite from its UI owner; browser sources, styles and run/board reads
  // are unchanged. The complete remaining tree, including this public helper, stays pinned.
  // RE-PINNED by 142 Plan 09: `apps/ui/package.json` loses four dependencies nothing in the tree imports
  // (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `tunnel-rat`). Measured: recomputing this digest
  // with the previous manifest reproduces the previous pin (181fc155…); the four deleted lines are the whole diff,
  // and no file under `apps/ui/src` changed.
  // RE-PINNED by 142's CodeQL fixes (js/incomplete-multi-character-sanitization): the detail panel's HTML-comment
  // strip runs to a fixed point. Measured: `git diff --numstat -- apps/ui/src` is TWO files, both under
  // `apps/ui/src/board/` — `Markdown.tsx` (+31: `stripHtmlComments`, the fixed-point loop over a linear `htmlCommentsOnce` scan) and `DetailPanel.tsx` (+2 −2: the
  // import and the one call that replaces the single-pass regex). No run-record key, cycle, level or loop state is read.
  // RE-PINNED by 135/03 (ADR-005) and at `aof:verify 135` (F-135-01): a rule heading, not a loop face. 135/03
  // changed the tree without re-pinning, and its verify both re-pins and extracts. Measured with `TasksTab.tsx` in
  // the index: `git diff --numstat 10879bef -- apps/ui/src` is THREE files, all under `apps/ui/src/board/`:
  // `TasksTab.tsx` (new, 134: the TASKS tab moved out whole, with its rule grouping), `DetailPanel.tsx` (+2 −96:
  // the import and the mount stay) and `api.ts` (+3 −1: `TaskScenario.rule`). What it reads is a scenario's
  // rule title on the tasks route. No run-record key, cycle, level or loop state is read.
  assert.equal(hash.digest("hex"), "af02d79e4a94520bd3d4b1895b70e5702999edb8b5d51edbd791bc619c92c390", "ui/ changed despite the zero-board-change contract");
}

export const archTests = [
  {
    name: "arch/53 FF-5307 (acd-loop-state-rides-the-run-record): brief.loop round-trips unchanged through work:run-status with exactly ten keys",
    run: async () => {
      const fx = await loopFixture();
      try {
        const driver = completingDriver(fx, {
          onCommand(command) {
            if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
            if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
          },
        });
        const state = await runLoopBody({ scope: "03", startedAt: "2026-08-17T00:00:00.000Z" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
        assert.ok(state.driven.length > 0, "the loop drive minted records");
        const status = await invoke("work:run-status", { ref: "03/01" }, fx.ctx);
        assert.ok(status.runs.length > 0, `run-status returned ${status.runs.length} records`);
        const record = status.runs.find((run) => run.brief?.loop != null);
        assert.ok(record, "work:run-status exposes the loop-minted brief");
        assert.deepEqual(Object.keys(record), RECORD_KEYS);
        assert.deepEqual(Object.keys(record.brief.loop), LOOP_KEYS);
        assert.equal(record.brief.loop.loopRunId, state.loopRunId);
        assert.equal(record.brief.loop.scope, "03");
        assert.equal(record.brief.loop.startedAt, "2026-08-17T00:00:00.000Z");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "arch/53 FF-5307 (acd-loop-state-rides-the-run-record): the closed five-edge run machine is driven over all twenty-five pairs",
    run: async () => {
      const actual = [];
      let visited = 0;
      for (const from of STATES) for (const to of STATES) {
        visited += 1;
        if (isLegalTransition(from, to)) actual.push(`${from}>${to}`);
      }
      assert.equal(visited, 25);
      assert.deepEqual(actual, EDGES);
      assert.equal(actual.some((edge) => { const [from, to] = edge.split(">"); return from === to; }), false);
    },
  },
  {
    name: "arch/53 FF-5307 (acd-loop-state-rides-the-run-record): the pure engine has no effect source and no loop store or command-side file write exists",
    run: async () => {
      const engine = stripComments(await readFile(path.join(root, "packages", "work-loop", "src", "engine.mjs"), "utf8"));
      assert.doesNotMatch(engine, /node:(?:fs|fs\/promises|child_process|process|os)|Date\.now\s*\(|new\s+Date\s*\(|\bimport\s*\(/u);
      const command = stripComments(await readFile(path.join(root, "packages", "work-loop", "src", "commands", "loop.mjs"), "utf8"));
      assert.doesNotMatch(command, /\b(?:writeFile|mkdir|rename)\s*\(/u);
      const modules = await modulesUnder(path.join(root, "packages", "core", "src"));
      assert.ok(modules.length > 150, `src was actually walked: ${modules.length} modules`);
      const stores = modules.filter((file) => /(?:^|[-/\\])loop(?:[-/\\].*)?[-]store\.mjs$/u.test(path.relative(root, file)));
      assert.deepEqual(stores, [], `loop facts must not acquire a sidecar store: ${stores.join(", ")}`);
    },
  },
  {
    name: "arch/53 FF-5307 (acd-loop-state-rides-the-run-record): frozen store and board read surfaces remain byte-identical to the milestone base",
    run: async () => {
      // `packages/core/src/run-store.mjs` is RE-PINNED at its post-55/02 digest, not dropped (55/VERIFICATION
      // F-55-02-1): 55/02's change to the store is in scope, and the repair to a seam a story
      // legitimately moved is a new pin, never a deleted entry — an unpinned file is covered by
      // no byte-freeze at all. `packages/core/src/board-ui.mjs` stays at the milestone base: 55/01's
      // groundedness route was removed rather than blessed (F-55-01-1), so this seam never moved.
      const pins = new Map([
        // RE-PINNED by 119/01: each carries exactly one changed line, and it is a path citation of
        // a module this story moved — `packages/core/src/mesh-presence.mjs` → `packages/core/src/mesh/presence.mjs` in the
        // store, and `packages/core/src/board-worker-stream.mjs` → `packages/core/src/cache-read.mjs` in the command. No
        // behaviour, no export and no signature moved in either.
        // RE-PINNED by 126/02 for ONE additive export: `isRunning`, the `isLegalTransition`
        // sibling. The declaration predicate must answer "is this attempt still in flight" without
        // SPELLING a run state — this store owns that vocabulary — and the only alternative was a
        // second home for it in the engine. Nothing else in the file moved: no behaviour, no
        // signature, no existing export. Re-pinned rather than dropped (55/VERIFICATION F-55-02-1).
        // RE-PINNED by 130/06 (130/ADR-007 §3): `retryRun`'s carry, when the caller passes no
        // brief, drops `brief.loop` (a new private `carriedBrief`). Measured live: `aof work resume`
        // re-minted a dead loop's lineage under its loop id, and `--stop` aimed at that dead loop.
        // Every loop retry passes its own brief, so the loop's lineage is byte-for-byte what it
        // was. No export, no signature and no state edge moved.
        // RE-PINNED by 134/03 (134/ADR-003 §3): ONE additive export, `recordAnswers` — the one
        // writer of a person's answers, which ride `brief.answers` (no seventeenth key, FF-6908) —
        // and `completeRun` stamping them at settle beside spend, with a `settleSpend` option the
        // driven settles turn off because they settle spend themselves. `carriedBrief` drops
        // `answers` beside `loop`, so a retry stamps its own. No state edge moved, and a settle with
        // no tokened answer writes exactly what it wrote before.
        // RE-PINNED by 131/01 (131/ADR-003 §3): the SEVENTEENTH key, `asks`, appended last by
        // 68/ADR-001's additive discipline (`buildRecord` `[]`, `normalizeRecord` reading a non-array
        // forward as `[]`); three owner-side writers, `openRunAsk`, `parkRunAsk` and `answerRunAsk`,
        // each a no-state-change persist shaped like `heartbeat`; and `staleRunningRuns` skipping a
        // running run whose last ask is unanswered. No state edge moved and no existing signature changed.
        // RE-PINNED by 142: the same store body is factory-wrapped in execution; diagnostics and
        // work-answer readers are supplied, spend is composed locally without a module cycle.
        // Source-body comparison and persisted-byte parity accompany the unchanged schema/edge checks.
        // Plan 01 moves only the strict freshness predicate to contracts; the store returns the same function.
        // 142/06 exports the existing pure retry predicates by identity for framework module ceilings.
        // Their bodies and the run writer are unchanged; the public factory returns those same functions.
        ["packages/execution/src/runs.mjs", "812a7624917cdc50fa7aeec3a0dd1985d99486956d170cdcb8c1b53eb98685e1"],
        // RE-PINNED by 126/01 (ADR-003 §4), and the invariant it belongs to is NARROWED in the
        // open rather than quietly worked around: `53/ADR-004`'s intent was that loop state needs
        // no new FACE — which remains true and is why the `--json` document is untouched by that
        // story, key for key, on all six of its producing sites. Its LETTER froze the file, and a
        // renderer that printed two of the record's sixteen keys was the defect 126 was framed
        // from. So: the DOCUMENT is frozen, the RENDER is not. What moved is `cli.render` and the
        // helpers beneath it; `run()`, the input schema and `json: (result) => result` are
        // byte-identical. Re-pinned rather than dropped, per 55/VERIFICATION F-55-02-1 — an
        // unpinned file is covered by no byte-freeze at all.
        // RE-PINNED by 142: work owns the unchanged command body; core supplies execution and cache services.
        ["packages/work/src/commands/run-status.mjs", "7d2f994f5eaf1469e0c1e04da364a265d25cf958d0c59bd9f73b1ac714773ebe"],
        // RE-PINNED by 127/04 (ADR-006 §2, task 02): `/api/work/list` threads `includeArchived=1`
        // through to `work:list`'s own `all` — the ONE parameter that story adds. The run/board seam
        // is otherwise untouched: no run key, no loop-state read, the envelope's shape unchanged.
        // Re-pinned rather than dropped, per 55/VERIFICATION F-55-02-1 (aof:verify 127).
        // RE-PINNED by 133/04 (ADR-007 §2): `/api/work/doc` forwards a `member` param to `work:doc`,
        // and only when it is present and non-blank, so a request without one is byte-identical. No
        // run key, no loop-state read, and no route added. Re-pinned rather than dropped, per
        // 55/VERIFICATION F-55-02-1. And again at `aof:verify 133` (F-133-02, story 04 task 03): a
        // second exported handler, `handleDiagramApi`, serves `/api/diagram/file` from `diagram:file`
        // OUTSIDE the `/api/work` namespace; `handleWorkApi` is byte-identical. No run key is read.
        // RE-PINNED by 131/04 (ADR-006 §3): one hoisted admission and one route onto `work:answer`;
        // no run key is read; every GET route's body is byte-identical. The measured
        // `git diff -- packages/core/src/board-ui.mjs`, non-comment lines: the five write branches match on
        // pathname and call `admitWriteRequest` (the three phase doors now `return await`), the new
        // `/api/work/answer` branch, `admitWriteRequest` + `sendMethodNotAllowed`, the
        // `./static-serve.mjs` import of `isLoopbackHost`, and `readJsonBody` refusing a non-object
        // body `invalid-body`. Re-pinned rather than dropped, per 55/VERIFICATION F-55-02-1.
        // RE-PINNED by 142: transport factory relocation only; all exported function bodies
        // match the prior source and HTTP integration tests retain routing/persistence coverage.
        ["packages/server/src/board-ui.mjs", "d0a2383b3a210b6ce6d23e2d2757bde1cdfaf3725ca1c869e8f20100d228d9a1"],
      ]);
      for (const [rel, digest] of pins) assert.equal(await normalizedDigest(path.join(root, rel)), digest, `${rel}: frozen run/board seam changed`);
      const uiPairs = await uiTreePairs();
      assert.ok(uiPairs.length > 100, `ui tree was actually read: ${uiPairs.length} files`);
      assertUiFrozen(uiPairs);
    },
  },
  {
    // 131/05 task 03 — the re-pin did not loosen the freeze: one character appended to any tracked
    // `apps/ui/src` file, in memory and one file at a time, turns the pinned assertion red.
    name: "arch/53 FF-5307 (acd-loop-state-rides-the-run-record): a one-character edit to any file under apps/ui/src turns the ui/ freeze red",
    run: async () => {
      const pairs = await uiTreePairs();
      assertUiFrozen(pairs);
      const sources = pairs.map(([rel], index) => [rel, index]).filter(([rel]) => rel.startsWith("apps/ui/src/"));
      assert.ok(sources.length > 100, `every apps/ui/src file is edited in turn: ${sources.length}`);
      for (const [rel, index] of sources) {
        const edited = pairs.map((pair, at) => (at === index ? [pair[0], `${pair[1]}x`] : pair));
        assert.throws(() => assertUiFrozen(edited), /ui\/ changed despite the zero-board-change contract/u, `${rel} + one character is caught`);
      }
    },
  },
];
