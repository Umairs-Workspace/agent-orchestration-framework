import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { invoke } from "../../../src/command-core.mjs";
import { isLegalTransition } from "../../../src/run-store.mjs";
import { runLoopBody } from "../../../src/commands/loop.mjs";
import { completingDriver, loopFixture, replaceStatus } from "../../loop/loop-command-probe.test.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RECORD_KEYS = Object.freeze(["runId", "itemRef", "state", "attempt", "outcome", "sessionId", "brief", "createdAt", "updatedAt", "failureReason", "heartbeatAt", "retryOf", "reclaimedAt", "node", "resumeAfter", "spend"]);
// 102/00 — EIGHT since the producer gained its loop id. 53/ARCHITECTURE.md's FF-5307 entry
// describes seven; that milestone is `done` and its delivered register is not edited, so the
// superseding statement lives in 102/tasks/00 and the control it pins is widened here.
// 126/02 (ADR-004 §5) appends the NINTH key, `supervised`, by the same additive-supersession
// discipline 102/00 used for the eighth (`id`). The eight before it keep their names, order and
// meanings; 126/01's contract anticipated this move and left it to this story.
const LOOP_KEYS = Object.freeze(["loopRunId", "scope", "level", "cap", "phase", "cycle", "startedAt", "id", "supervised"]);
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
  return execFileSync("git", ["ls-files", "-z", "--", rel], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  }).split("\0").filter(Boolean).map((file) => path.join(root, file));
}

async function normalizedDigest(file) {
  return createHash("sha256").update((await readFile(file, "utf8")).replace(/\r\n/gu, "\n")).digest("hex");
}

export const archTests = [
  {
    name: "arch/53 FF-5307 (acd-loop-state-rides-the-run-record): brief.loop round-trips unchanged through work:run-status with exactly nine keys",
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
      const engine = stripComments(await readFile(path.join(root, "src", "work", "loop.mjs"), "utf8"));
      assert.doesNotMatch(engine, /node:(?:fs|fs\/promises|child_process|process|os)|Date\.now\s*\(|new\s+Date\s*\(|\bimport\s*\(/u);
      const command = stripComments(await readFile(path.join(root, "src", "commands", "loop.mjs"), "utf8"));
      assert.doesNotMatch(command, /\b(?:writeFile|mkdir|rename)\s*\(/u);
      const modules = await modulesUnder(path.join(root, "src"));
      assert.ok(modules.length > 150, `src was actually walked: ${modules.length} modules`);
      const stores = modules.filter((file) => /(?:^|[-/\\])loop(?:[-/\\].*)?[-]store\.mjs$/u.test(path.relative(root, file)));
      assert.deepEqual(stores, [], `loop facts must not acquire a sidecar store: ${stores.join(", ")}`);
    },
  },
  {
    name: "arch/53 FF-5307 (acd-loop-state-rides-the-run-record): frozen store and board read surfaces remain byte-identical to the milestone base",
    run: async () => {
      // `src/run-store.mjs` is RE-PINNED at its post-55/02 digest, not dropped (55/VERIFICATION
      // F-55-02-1): 55/02's change to the store is in scope, and the repair to a seam a story
      // legitimately moved is a new pin, never a deleted entry — an unpinned file is covered by
      // no byte-freeze at all. `src/board-ui.mjs` stays at the milestone base: 55/01's
      // groundedness route was removed rather than blessed (F-55-01-1), so this seam never moved.
      const pins = new Map([
        // RE-PINNED by 119/01: each carries exactly one changed line, and it is a path citation of
        // a module this story moved — `src/mesh-presence.mjs` → `src/mesh/presence.mjs` in the
        // store, and `src/board-worker-stream.mjs` → `src/cache-read.mjs` in the command. No
        // behaviour, no export and no signature moved in either.
        // RE-PINNED by 126/02 for ONE additive export: `isRunning`, the `isLegalTransition`
        // sibling. The declaration predicate must answer "is this attempt still in flight" without
        // SPELLING a run state — this store owns that vocabulary — and the only alternative was a
        // second home for it in the engine. Nothing else in the file moved: no behaviour, no
        // signature, no existing export. Re-pinned rather than dropped (55/VERIFICATION F-55-02-1).
        ["src/run-store.mjs", "f18e5080e3e3d9990c1495ff2ec477729ef583f1220ece318e49c62ea615293d"],
        // RE-PINNED by 126/01 (ADR-003 §4), and the invariant it belongs to is NARROWED in the
        // open rather than quietly worked around: `53/ADR-004`'s intent was that loop state needs
        // no new FACE — which remains true and is why the `--json` document is untouched by that
        // story, key for key, on all six of its producing sites. Its LETTER froze the file, and a
        // renderer that printed two of the record's sixteen keys was the defect 126 was framed
        // from. So: the DOCUMENT is frozen, the RENDER is not. What moved is `cli.render` and the
        // helpers beneath it; `run()`, the input schema and `json: (result) => result` are
        // byte-identical. Re-pinned rather than dropped, per 55/VERIFICATION F-55-02-1 — an
        // unpinned file is covered by no byte-freeze at all.
        ["src/commands/run-status.mjs", "fbf7f25f6c9f32383043044a3a1448eab040ff3d6c7f47aec70655e2dc027ee3"],
        // RE-PINNED by 127/04 (ADR-006 §2, task 02): `/api/work/list` threads `includeArchived=1`
        // through to `work:list`'s own `all` — the ONE parameter that story adds. The run/board seam
        // is otherwise untouched: no run key, no loop-state read, the envelope's shape unchanged.
        // Re-pinned rather than dropped, per 55/VERIFICATION F-55-02-1 (aof:verify 127).
        ["src/board-ui.mjs", "959ebf96fc19bd207654f3f4cbf2f02b093ecf0d28d548c714ed6ffb60f07518"],
      ]);
      for (const [rel, digest] of pins) assert.equal(await normalizedDigest(path.join(root, rel)), digest, `${rel}: frozen run/board seam changed`);
      const uiFiles = trackedFilesUnder(path.join(root, "ui")).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
      assert.ok(uiFiles.length > 100, `ui tree was actually read: ${uiFiles.length} files`);
      const hash = createHash("sha256");
      for (const file of uiFiles) {
        hash.update(`${path.relative(root, file).replaceAll("\\", "/")}\0`);
        hash.update((await readFile(file, "utf8")).replace(/\r\n/gu, "\n"));
        hash.update("\0");
      }
      // RE-PINNED by 119/01 — 11 lines across 9 files under `ui/src/{board,fleet,home,terminal}/`,
      // in `.ts`, `.mjs` and `.d.mts`. EVERY ONE is a comment citation of a module this story
      // moved (`src/mesh-*` -> `src/mesh/*`, `src/board-worker-stream.mjs` -> `src/cache-read.mjs`);
      // no component, style, route, export or behaviour changed. `git diff 7893d02c..HEAD -- ui/`
      // is the whole of it, and it is the diff to read before accepting this pin.
      //
      // RE-PINNED AGAIN by 119/03, same species and the same test applied: 12 files under
      // `ui/src/{app,fleet,home,terminal}/`, 36 changed lines, and EVERY ONE is a comment citation
      // of a SUITE this story moved (`test/x.test.mjs` -> `test/<subject>/x.test.mjs`). Measured
      // rather than asserted — `git show adca2f80 -- ui/` filtered to non-comment changed lines is
      // EMPTY — so the zero-board-change contract holds and only the pin moves. That measurement is
      // the condition of accepting this pin: a re-pin taken without it converts the freeze into a
      // rubber stamp, which is the one way a digest gate quietly stops being one.
      // RE-PINNED 2026-09-11 for an operator-requested FLEET change, and the contract this pin
      // guards is measured intact: `git diff -- ui/` is five files, all under `ui/src/fleet/`
      // (`scope.mjs` + `.d.mts`, `Fleet.tsx`, `RepoPicker.tsx`, `FilterBanner.tsx`) — a third
      // narrowing over milestone rows by work status, open by default, and the workspace cards
      // as a second door into the repo narrowing. NOTHING under `ui/src/board/` moved, no run
      // record key is read that was not read before, and the loop's state still rides the run
      // record with no face of its own — which is what 53/ADR-004 froze this tree to protect.
      // The pin is a proxy for that contract, not for the fleet's look; it moves with the diff.
      //
      // RE-PINNED by 127/04 (ADR-006 §2–§4; DESIGN.md surfaces 1 and 2), measured the same way:
      // `git diff d7806cb..b8cd0a1 -- ui/` is 9 files, 376 insertions, all under `ui/src/board/`
      // (`ArchivedPill.tsx` new; `Board.tsx`, `BoardLanes.tsx`, `DetailPanel.tsx`, `Overview.tsx`,
      // `api.ts`, `model.ts`) and `ui/src/fleet/{api.ts,scope.mjs}` — the backlog rows, the
      // `Show archived` toggle threading `includeArchived` into the LIST request, the archived pill,
      // and the fleet's backlog partition. Filtered to added lines that name a run record (`runs`,
      // `runId`, `run.state`, `run.brief`, `heartbeat`, `retryOf`) the diff is EMPTY: the board reads
      // the WORK LIST differently and no run-record key it did not read before, so the loop's state
      // still rides the run record with no face of its own. Re-pinned at aof:verify 127.
      //
      // RE-PINNED by 130/03 (ADR-005 §5-§6; ADR-006 §3), measured the same way: `git diff -- ui/`
      // is EIGHT files, all under `ui/src/fleet/` — `api.ts`, `runs.mjs`, `runs.d.mts`,
      // `scope.mjs`, `scope.d.mts`, `Fleet.tsx` (the six the ADR named) plus
      // `assign-affordance.mjs` and `assign-affordance.d.mts` (the one orchestrator generalised
      // by two additive options, `refusalCopy` / `timedOut`, so the loop line's Stop rides the
      // assign affordance's machine instead of a second copy of its deadline race). It is the
      // fleet node card's loop line and its Stop: `presence.loops[]` rendered beside the pinned
      // current-work lines, ONE button on the serving node's card, `fleetApi.loopStop` the one
      // fetch. NOTHING under `ui/src/board/` moved (`git diff -- ui/src/board/` is empty);
      // `src/board-ui.mjs`'s digest above is UNCHANGED (959ebf96…), as is `src/run-store.mjs`'s;
      // and the `ui/` diff reads NO run record at all — every `runId` it names is a field of the
      // presence record's additive `loops[]` entry (the node's projection of its own run
      // records, src/mesh/presence.mjs), so the loop's state still rides the run record with no
      // face of its own and the board's frozen seam is byte-identical. `work:loop` stays
      // BOARD_DEFERRED; no `/api/work/loop` exists.
      assert.equal(hash.digest("hex"), "5766c6089f3d4aabc856e347e95dd218a8d7c41d137ac6b3bbfdb5fb5dcb6b45", "ui/ changed despite the zero-board-change contract");
    },
  },
];
