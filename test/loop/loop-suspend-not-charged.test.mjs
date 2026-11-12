import { defaultApplication as _aofApplication } from "aof/default-application";
// 2026-11-12 — A HOST SUSPEND IS CHARGED TO NOBODY. Loops 07 and 14 slept 00:14 → 05:07; on wake the
// lane deadline killed two live sessions, and the lineage budget then charged the five sleeping hours
// to the attempt and halted the loop `deadline-exhausted`. Pins:
//   - a SETTLED attempt with no `suspended` spans whose close is more than one staleness window past
//     its last liveness ends one window after that liveness (the measured 14/03 record admits)
//   - a settled attempt that closes inside the window is charged to its close, as before
//   - `suspended` spans are subtracted exactly, merged with ask waits (an overlap counts once)
//   - the store writes `suspended` only when a span falls inside the attempt, clipped to it; a run
//     that never slept keeps its seventeen keys
//   - the drive status line's last activity is the newer of the heartbeat and the transcript write
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { decideScheduleToClose, lineageElapsedMs } from "../../packages/work-loop/src/engine.mjs";
import { createDriveStatus } from "../../packages/work-loop/src/drive-status.mjs";

const isStale = _aofApplication.execution.runs.isStale;
const startRun = _aofApplication.execution.runs.startRun;
const completeRun = _aofApplication.execution.runs.completeRun;

const MIN = 60_000;
const HEARTBEAT_MS = 25 * MIN;
const CEILING_MS = 3 * 60 * MIN;

// The measured record (project-sijil 14/03, run 20261111T234134656Z-0000), keys the budget reads.
const MEASURED_14_03 = {
  runId: "20261111T234134656Z-0000",
  retryOf: null,
  state: "failed",
  failureReason: "timeout",
  createdAt: "2026-11-11T23:41:34.656Z",
  heartbeatAt: "2026-11-11T23:58:43.212Z",
  updatedAt: "2026-11-12T05:07:11.220Z",
  reclaimedAt: null,
  asks: [],
};

const elapsed = (runs) => lineageElapsedMs({ runs, now: "2026-11-12T06:00:00.000Z", stalenessMs: HEARTBEAT_MS, isStale });

export const loopSuspendNotChargedTests = [
  {
    name: "suspend/01 the measured 14/03 attempt is charged to one window past its last heartbeat, and the budget admits its retry",
    run() {
      const charged = elapsed([MEASURED_14_03]);
      // 23:41:34.656 → 23:58:43.212 + 25 min
      assert.equal(charged, Date.parse("2026-11-11T23:58:43.212Z") + HEARTBEAT_MS - Date.parse(MEASURED_14_03.createdAt));
      assert.ok(charged < CEILING_MS, `${charged} ms is under the 3 h ceiling`);
      assert.equal(decideScheduleToClose({ elapsedMs: charged, ceilingMs: CEILING_MS }).admitted, true);
      // Without the threshold (the render's question) the close is still the end.
      assert.equal(lineageElapsedMs({ runs: [MEASURED_14_03], now: "2026-11-12T06:00:00.000Z" }), Date.parse(MEASURED_14_03.updatedAt) - Date.parse(MEASURED_14_03.createdAt));
    },
  },
  {
    name: "suspend/02 a settled attempt that closed inside one window of its last liveness is charged to its close",
    run() {
      const record = { ...MEASURED_14_03, heartbeatAt: "2026-11-12T00:30:00.000Z", updatedAt: "2026-11-12T00:41:34.656Z" };
      assert.equal(elapsed([record]), 60 * MIN);
      const neverBeat = { ...MEASURED_14_03, heartbeatAt: null, updatedAt: "2026-11-12T02:41:34.656Z" };
      assert.equal(elapsed([neverBeat]), 3 * 60 * MIN, "a record that never beat falls back to its close, unchanged");
    },
  },
  {
    name: "suspend/03 recorded suspended spans are subtracted exactly, and an ask wait overlapping one counts once",
    run() {
      const record = {
        ...MEASURED_14_03,
        heartbeatAt: "2026-11-12T05:30:00.000Z",
        updatedAt: "2026-11-12T05:41:34.656Z",
        suspended: [{ from: "2026-11-12T00:14:00.000Z", to: "2026-11-12T05:07:00.000Z" }],
      };
      const wall = Date.parse(record.updatedAt) - Date.parse(record.createdAt);
      const slept = Date.parse("2026-11-12T05:07:00.000Z") - Date.parse("2026-11-12T00:14:00.000Z");
      assert.equal(elapsed([record]), wall - slept);
      const asked = {
        ...record,
        asks: [{ question: "q", askedAt: "2026-11-12T00:00:00.000Z", answeredAt: "2026-11-12T00:30:00.000Z", parkedAt: null }],
      };
      assert.equal(elapsed([asked]), wall - (Date.parse("2026-11-12T05:07:00.000Z") - Date.parse("2026-11-12T00:00:00.000Z")), "00:00–00:30 ∪ 00:14–05:07 is subtracted once");
    },
  },
  {
    name: "suspend/04 the store stamps `suspended` clipped to the attempt, and only when a span falls inside it",
    run: async () => {
      const dir = await mkdtemp(path.join(tmpdir(), "aof-suspend-"));
      try {
        const item = { ref: "14/03", dir };
        const { runId } = await startRun(item, { now: "2026-11-11T23:41:34.656Z" });
        const settled = await completeRun(item, {
          runId,
          outcome: "failed",
          failureReason: "timeout",
          now: "2026-11-12T05:07:11.220Z",
          suspended: [
            [Date.parse("2026-11-11T20:00:00.000Z"), Date.parse("2026-11-11T21:00:00.000Z")],
            [Date.parse("2026-11-12T00:14:00.000Z"), Date.parse("2026-11-12T06:00:00.000Z")],
            "not a span",
          ],
        });
        assert.deepEqual(settled.suspended, [{ from: "2026-11-12T00:14:00.000Z", to: "2026-11-12T05:07:11.220Z" }]);

        const other = { ref: "14/04", dir: path.join(dir, "other") };
        const minted = await startRun(other, { now: "2026-11-11T23:25:13.828Z" });
        const clean = await completeRun(other, { runId: minted.runId, outcome: "done", now: "2026-11-11T23:55:00.000Z", suspended: [] });
        assert.equal(Object.hasOwn(clean, "suspended"), false, "a run that never slept carries no `suspended` key");
        assert.equal(Object.keys(clean).length, 17);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "suspend/05 the status line's last activity is the session transcript's write when it is newer than the consumed heartbeat",
    run: async () => {
      const T0 = Date.parse("2026-11-11T23:25:13.828Z");
      const projects = "C:/scripted/projects";
      const transcript = path.join(projects, "s1.jsonl");
      const status = createDriveStatus({
        readRuns: async () => [{ runId: "r1", sessionId: "s1", heartbeatAt: null }],
        claudeProjectsDir: () => projects,
        readdir: async () => { throw Object.assign(new Error("ENOENT"), { code: "ENOENT" }); },
        stat: async (file) => {
          if (file === transcript) return { mtimeMs: T0 + 29 * MIN };
          throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        },
        reportDegrade: () => {},
        clock: () => T0 + 30 * MIN,
      });
      const facts = await status.readDriveFacts({ item: { ref: "14/04" }, runId: "r1", lane: "C:/lanes/14-04", atMs: T0 + 30 * MIN });
      assert.equal(facts.lastActivityAgeMs, MIN);
      assert.equal(status.driveStatusLine({ ref: "14/04", elapsedMs: 30 * MIN, ...facts }), "14/04 — 30 min, 0 subagents active, last activity 1 min ago");
    },
  },
];
