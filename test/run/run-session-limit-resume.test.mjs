// Traceability wiring for 348 auto-resume — the session-limit park gate and the
// deterministic re-entry face (work:resume).
//
// WHY THIS SUITE EXISTS. On vista-app milestone 348 three API session limits cost
// 6h18m of dead run. The vocabulary had no word for that failure, so every kill was
// recorded as `runtime_offline`: retryable, but carrying no reset time, so nothing
// could distinguish "retry now" from "retry at 1:10am" and nothing could tell an
// operator what was waiting to come back. These tests pin the three properties that
// close it — the reason is FIRST CLASS, the record carries WHEN, and a retry before
// then is REFUSED rather than burning an attempt into a still-limited window.
//
// Exercises the REAL store + the REAL in-process registry against temp fixture repos
// (mkdtemp → build → run → rm in finally). The clock is INJECTED everywhere (`now`),
// never read, so nothing here is time-of-day flaky.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadWorkspace } from "../../src/work.mjs";
import { invoke, getCommand } from "../../src/command-core.mjs";
import {
  parseResumeAfter, retryReadiness, retryRun, startRun, completeRun, readRuns, isRetryable,
  openRunAsk, parkRunAsk, answerRunAsk, heartbeat, runRecordPath,
} from "../../src/run-store.mjs";
import { answerCommand, resumeCommand } from "../../src/commands/resume.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { loopAsksDir, openAsk, parkAsk, readAsk, answerAsk, askRequestPath } from "../../src/loop/ask-request.mjs";
import { buildNotifyEnvelope } from "../../src/notify/notify.mjs";
import { renderDiscord } from "../../src/notify/discord.mjs";
import { setDegradeSinkForTest } from "../../src/degrade.mjs";
import { openGlobalWorkProjectionStore } from "../../src/global-work-store.mjs";
import { assembleAssignmentRecord, insertAssignment, updateAssignmentState } from "../../src/assignment-record.mjs";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import { withCacheReadFixture, plantCacheRow, runCommand, streamRun, WORKER_NODE } from "../support/cache-read-fixture.mjs";

const ANSWER_REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ANSWER_CLI = path.join(ANSWER_REPO_ROOT, "bin", "aof.mjs");

const FROZEN_KEYS = ["runId", "itemRef", "state", "attempt", "outcome", "sessionId", "brief", "createdAt", "updatedAt", "failureReason", "heartbeatAt", "retryOf", "reclaimedAt", "node", "resumeAfter", "spend", "asks"];

async function makeRepo() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-session-limit-"));
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(workDir, { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2),
    "utf8",
  );
  return { repo, workDir };
}

async function buildMilestone(workDir, { number = "348", slug = "ar-gate", status = "in-progress" } = {}) {
  const dir = path.join(workDir, `${number}_milestone_${slug}`);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "SPEC.md"),
    `---\ntype: milestone\nnumber: ${number}\nslug: ${slug}\nstatus: ${status}\ntitle: "Gate"\ncreated: 2026-08-05\nupdated: 2026-08-05\n---\n# ${number}\n`,
    "utf8",
  );
  return { ref: number, dir };
}

async function ctxFor(repo) {
  return { workspace: await loadWorkspace(repo) };
}

async function expectCode(fn, code) {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, `expected a rejection with code ${code}, got none`);
  assert.equal(caught.code, code, `expected code ${code}, got ${caught.code} (${caught.message})`);
  return caught;
}

export const runSessionLimitResumeTests = [
  {
    name: "session-limit/parse: the three REAL 348 kills resolve to the right absolute instant, across the BST/GMT boundary",
    run: async () => {
      // Every row is a kill this milestone actually took, with the platform's own
      // words and the wall-clock instant it arrived. Getting "1:10am" wrong by a day
      // is a four-hour early resume into a still-limited window.
      const rows = [
        ["1:10am (Europe/London)", "2026-08-05T21:05:00.000Z", "2026-08-06T00:10:00.000Z", "BST: already past today ⇒ tomorrow, −1h to UTC"],
        ["8:10pm (Europe/London)", "2026-08-05T16:58:00.000Z", "2026-08-05T19:10:00.000Z", "BST: still ahead today"],
        ["2:40pm (Europe/London)", "2026-08-06T11:06:00.000Z", "2026-08-06T13:40:00.000Z", "BST: still ahead today"],
        // The SAME words in winter must NOT give the same offset — this is the row
        // that fails if a fixed offset is ever substituted for real zone maths.
        ["1:10am (Europe/London)", "2026-01-15T21:05:00.000Z", "2026-01-16T01:10:00.000Z", "GMT: no offset"],
        ["12:30am (America/New_York)", "2026-08-05T21:05:00.000Z", "2026-08-06T04:30:00.000Z", "EDT −4"],
        ["20:10 (UTC)", "2026-08-05T16:58:00.000Z", "2026-08-05T20:10:00.000Z", "24-hour form"],
        ["2026-08-06T01:00:00.000Z", "2026-08-05T21:05:00.000Z", "2026-08-06T01:00:00.000Z", "an explicit ISO instant passes through"],
      ];
      for (const [words, now, expected, why] of rows) {
        const parsed = parseResumeAfter(words, { now });
        assert.equal(parsed.resumeAfter, expected, `"${words}" seen at ${now} ⇒ ${expected} (${why})`);
        assert.ok(parsed.source === "clock" || parsed.source === "iso", `"${words}" is read, not guessed`);
      }
    },
  },
  {
    name: "session-limit/parse: an unreadable reset parks conservatively and SAYS it guessed — it never throws on the failure path",
    run: async () => {
      // This runs while the run is already dying. A throw here would lose the
      // failure record itself, which is strictly worse than a wrong park.
      for (const bad of [null, undefined, "", "gibberish", "resets soon", "3:00pm (Not/AZone)", "99:99pm (UTC)"]) {
        const parsed = parseResumeAfter(bad, { now: "2026-08-05T21:05:00.000Z" });
        assert.equal(parsed.source, "fallback", `${JSON.stringify(bad)} falls back`);
        assert.equal(parsed.resumeAfter, "2026-08-05T22:05:00.000Z", "the default park is one hour on");
        assert.match(parsed.note, /no readable reset/, "the guess is DECLARED — a fallback must never read as an authority");
        assert.notEqual(parsed.source, "clock", "a fallback is never reported as a read reset");
      }
    },
  },
  {
    name: "session-limit/classify: session_limit is retryable as a class, and the clock gate is a SEPARATE pure function",
    run: async () => {
      assert.equal(isRetryable("session_limit"), true, "the platform stopping us is infra, not a bad agent output");
      assert.equal(isRetryable("agent_error"), false, "the closed table is otherwise unchanged");

      const parked = { failureReason: "session_limit", attempt: 1, resumeAfter: "2026-08-06T00:10:00.000Z" };
      assert.deepEqual(
        retryReadiness(parked, 3, Date.parse("2026-08-05T21:06:00.000Z")),
        { ready: false, state: "parked", readyAt: "2026-08-06T00:10:00.000Z" },
        "one minute after the kill: parked, and it says until when",
      );
      assert.deepEqual(
        retryReadiness(parked, 3, Date.parse("2026-08-06T00:11:00.000Z")),
        { ready: true, state: "ready", readyAt: "2026-08-06T00:10:00.000Z" },
        "one minute after the reset: ready",
      );
      // The ceiling and the classification still outrank the clock.
      assert.equal(retryReadiness({ ...parked, attempt: 3 }, 3, Date.parse("2026-08-06T00:11:00.000Z")).state, "attempts-exhausted");
      assert.equal(retryReadiness({ failureReason: "agent_error", attempt: 1 }, 3, 0).state, "not-retryable");
      // NO REGRESSION: a failure with no park stamp is ready immediately, which is
      // exactly today's behaviour for every pre-348 record and reason.
      assert.deepEqual(
        retryReadiness({ failureReason: "runtime_offline", attempt: 1, resumeAfter: null }, 3, 0),
        { ready: true, state: "ready", readyAt: null },
        "an unparked retryable failure is ready at once (the fourteen-key record's behaviour, unchanged)",
      );
    },
  },
  {
    name: "session-limit/record: run-complete stamps the park onto the record, and only for session_limit",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      try {
        const item = await buildMilestone(workDir);
        const ctx = await ctxFor(repo);

        await invoke("work:run-start", { ref: "348", sessionId: "sess-1", now: "2026-08-05T20:28:00.000Z" }, ctx);
        const failed = await invoke(
          "work:run-complete",
          { ref: "348", outcome: "failed", reason: "session_limit", resumeAfter: "1:10am (Europe/London)", now: "2026-08-05T21:05:00.000Z" },
          ctx,
        );
        assert.equal(failed.failureReason, "session_limit");
        assert.equal(failed.resumeAfter, "2026-08-06T00:10:00.000Z", "the park rides the SAME →failed edge that records the reason");
        assert.equal(failed.resumeAfterSource, "clock", "the park is marked as READ from the platform's words, not guessed");
        assert.match(failed.resumeAfterNote, /Europe\/London/, "the provenance names the zone it resolved in");

        // The stamp is on disk, in the frozen key order — not just in the envelope.
        const [onDisk] = await readRuns(item);
        assert.deepEqual(Object.keys(onDisk), FROZEN_KEYS, "the persisted record carries the fifteen frozen keys, in order");
        assert.equal(onDisk.resumeAfter, "2026-08-06T00:10:00.000Z");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "session-limit/record: every OTHER reason is byte-unchanged — no park stamp, retryable immediately",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      try {
        await buildMilestone(workDir);
        const ctx = await ctxFor(repo);
        // Even when a caller passes --resume-after by mistake, a non-session_limit
        // failure must not park: this path is load-bearing for the reclaim flow.
        await invoke("work:run-start", { ref: "348", now: "2026-08-05T20:28:00.000Z" }, ctx);
        const failed = await invoke(
          "work:run-complete",
          { ref: "348", outcome: "failed", reason: "runtime_offline", resumeAfter: "1:10am (Europe/London)", now: "2026-08-05T21:05:00.000Z" },
          ctx,
        );
        assert.equal(failed.resumeAfter, null, "only session_limit parks — every other reason keeps today's semantics");
        const retried = await invoke("work:run-retry", { ref: "348", now: "2026-08-05T21:06:00.000Z" }, ctx);
        assert.equal(retried.attempt, 2, "an unparked retryable failure still resumes at once");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "session-limit/gate: a retry before the reset is REFUSED retry-parked and mints nothing; after the reset it resumes on lineage",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      try {
        const item = await buildMilestone(workDir);
        const ctx = await ctxFor(repo);
        await invoke("work:run-start", { ref: "348", sessionId: "sess-1", now: "2026-08-05T20:28:00.000Z" }, ctx);
        await invoke(
          "work:run-complete",
          { ref: "348", outcome: "failed", reason: "session_limit", resumeAfter: "1:10am (Europe/London)", now: "2026-08-05T21:05:00.000Z" },
          ctx,
        );

        const before = (await readRuns(item)).length;
        const refusal = await expectCode(
          () => invoke("work:run-retry", { ref: "348", now: "2026-08-05T21:06:00.000Z" }, ctx),
          "retry-parked",
        );
        assert.match(refusal.message, /parked until 2026-08-06T00:10/, "the refusal names the instant it becomes ready");
        assert.equal((await readRuns(item)).length, before, "a refused retry mints NOTHING — the whole point is not to burn an attempt");

        // After the reset: the lineage resumes, carrying the session forward.
        const resumed = await invoke("work:run-retry", { ref: "348", now: "2026-08-06T00:11:00.000Z" }, ctx);
        assert.equal(resumed.attempt, 2, "attempt + 1");
        assert.equal(resumed.sessionId, "sess-1", "the prior session is carried — a resume, never a fresh start");
        assert.equal(resumed.state, "running");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "session-limit/gate: --force overrides the park, but NOT the ceiling or the classification",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      try {
        await buildMilestone(workDir);
        const ctx = await ctxFor(repo);
        await invoke("work:run-start", { ref: "348", now: "2026-08-05T20:28:00.000Z" }, ctx);
        await invoke(
          "work:run-complete",
          { ref: "348", outcome: "failed", reason: "session_limit", resumeAfter: "1:10am (Europe/London)", now: "2026-08-05T21:05:00.000Z" },
          ctx,
        );
        const forced = await invoke("work:run-retry", { ref: "348", force: true, now: "2026-08-05T21:06:00.000Z" }, ctx);
        assert.equal(forced.attempt, 2, "the operator override resumes before the stated reset");

        // …but force is ONLY the park override. A ceiling refusal still refuses.
        await invoke("work:run-complete", { ref: "348", outcome: "failed", reason: "session_limit", now: "2026-08-05T21:10:00.000Z" }, ctx);
        await expectCode(
          () => invoke("work:run-retry", { ref: "348", force: true, maxAttempts: 2, now: "2026-08-05T23:00:00.000Z" }, ctx),
          "attempts-exhausted",
        );
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "session-limit/resume: the sweep reports what is waiting and when, and never invents work it cannot execute",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      try {
        await buildMilestone(workDir, { number: "348", slug: "ar-gate" });
        await buildMilestone(workDir, { number: "349", slug: "other" });
        const ctx = await ctxFor(repo);

        // 348 dies on a session limit; 349 dies on a bad agent output.
        await invoke("work:run-start", { ref: "348", now: "2026-08-05T20:28:00.000Z" }, ctx);
        await invoke(
          "work:run-complete",
          { ref: "348", outcome: "failed", reason: "session_limit", resumeAfter: "1:10am (Europe/London)", now: "2026-08-05T21:05:00.000Z" },
          ctx,
        );
        await invoke("work:run-start", { ref: "349", now: "2026-08-05T20:28:00.000Z" }, ctx);
        await invoke("work:run-complete", { ref: "349", outcome: "failed", reason: "agent_error", now: "2026-08-05T21:05:00.000Z" }, ctx);

        const parked = await invoke("work:resume", { now: "2026-08-05T21:06:00.000Z" }, ctx);
        assert.equal(parked.resumed, false, "a bare sweep REPORTS; it never acts");
        assert.deepEqual(parked.pending.map((row) => row.ref), ["348"], "a judged agent_error is not 'waiting to come back'");
        assert.equal(parked.pending[0].state, "parked");
        assert.equal(parked.pending[0].readyAt, "2026-08-06T00:10:00.000Z");
        assert.deepEqual(parked.ready, [], "nothing is offered as actionable while it is still parked");

        const ready = await invoke("work:resume", { now: "2026-08-06T00:11:00.000Z" }, ctx);
        assert.deepEqual(ready.ready, ["348"], "after the reset the sweep names exactly what to resume");
        assert.equal(ready.pending[0].state, "ready");

        // And the ACT face resumes the lineage through the same store authority.
        const resumed = await invoke("work:resume", { ref: "348", now: "2026-08-06T00:12:00.000Z" }, ctx);
        assert.equal(resumed.resumed, true);
        assert.equal(resumed.attempt, 2);

        // An item whose run is now in flight is not offered again — resuming it
        // would be refused duplicate-run, and offering an impossible action is
        // exactly the "confidently wrong next step" this command exists to remove.
        const after = await invoke("work:resume", { now: "2026-08-06T00:13:00.000Z" }, ctx);
        assert.deepEqual(after.ready, [], "an item with a running run is not offered for resume");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "session-limit/stranded: an orchestrator killed mid-turn records NOTHING — the sweep still finds it, and resuming reclaims then retries",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      try {
        const item = await buildMilestone(workDir);
        const ctx = await ctxFor(repo);

        // The 348 overnight shape: a run starts, the session limit kills the main
        // thread mid-turn, and NO run-complete ever happens. The record is left
        // `running` for ever — the state the sweep was originally blind to, which is
        // worse than useless: it reported "nothing to resume" over stranded work.
        await invoke("work:run-start", { ref: "348", sessionId: "sess-1", now: "2026-08-05T21:00:00.000Z" }, ctx);
        const [live] = await readRuns(item);
        assert.equal(live.state, "running");
        assert.equal(live.failureReason, null, "a killed session records no outcome — that is the whole problem");

        // Inside the liveness window it is WORKING, not stranded. Offering to resume
        // here would fight a live agent.
        const soon = await invoke("work:resume", { now: "2026-08-05T21:05:00.000Z" }, ctx);
        assert.equal(soon.pending[0].state, "in-flight", "a recent run is working, not stranded");
        assert.deepEqual(soon.ready, [], "a live run is never offered for resume");

        // Three hours later, silent past the heartbeat window: STRANDED and offered.
        const later = await invoke("work:resume", { now: "2026-08-06T00:00:00.000Z" }, ctx);
        assert.equal(later.pending[0].state, "stranded");
        assert.equal(later.pending[0].silentSince, "2026-08-05T21:00:00.000Z", "it says how long nothing has been driving it");
        assert.deepEqual(later.ready, ["348"], "the operator is given exactly one thing to do");

        // Acting on it reclaims the stranded run FIRST (it has no terminal state, so
        // a bare retry would refuse no-retryable-run) and then resumes its lineage.
        const resumed = await invoke("work:resume", { ref: "348", now: "2026-08-06T00:01:00.000Z" }, ctx);
        assert.equal(resumed.resumed, true);
        assert.equal(resumed.attempt, 2, "the resume is on the SAME lineage, not a fresh start");
        assert.equal(resumed.sessionId, "sess-1", "the killed session is carried forward");
        assert.deepEqual(resumed.reclaimed, [live.runId], "the stranded run was reclaimed, and the resume says so");

        const runs = await readRuns(item);
        assert.equal(runs.length, 2, "reclaim + resume, not a duplicate mint");
        assert.equal(runs[0].state, "failed");
        assert.equal(runs[0].failureReason, "runtime_offline", "a crashed host is infra — the reclaimed run stays retryable");
        assert.ok(runs[0].reclaimedAt, "reclaimedAt distinguishes a reclaimed failure from a reported one");
        assert.equal(runs[1].retryOf, runs[0].runId, "the lineage is linked");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "session-limit/stranded: a stranded run at the attempt ceiling is reported, not offered",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      try {
        const item = await buildMilestone(workDir);
        const ctx = await ctxFor(repo);
        await invoke("work:run-start", { ref: "348", now: "2026-08-05T21:00:00.000Z" }, ctx);
        // Drive the lineage to the ceiling, then strand the last attempt.
        await invoke("work:run-complete", { ref: "348", outcome: "failed", reason: "runtime_offline", now: "2026-08-05T21:01:00.000Z" }, ctx);
        await invoke("work:run-retry", { ref: "348", now: "2026-08-05T21:02:00.000Z" }, ctx);
        await invoke("work:run-complete", { ref: "348", outcome: "failed", reason: "runtime_offline", now: "2026-08-05T21:03:00.000Z" }, ctx);
        await invoke("work:run-retry", { ref: "348", now: "2026-08-05T21:04:00.000Z" }, ctx);

        const swept = await invoke("work:resume", { now: "2026-08-06T00:00:00.000Z" }, ctx);
        assert.equal(swept.pending[0].attempt, 3, "the stranded run is the third attempt");
        assert.equal(swept.pending[0].state, "attempts-exhausted", "the ceiling outranks strandedness");
        assert.deepEqual(swept.ready, [], "a genuinely-failing item halts instead of looping — 20/ADR-002 unchanged");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "session-limit/compat: a fourteen-key record (no park stamp) reads forward and resumes exactly as it does today",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      try {
        const item = await buildMilestone(workDir);
        // A genuine pre-348 record, written straight to disk with no resumeAfter.
        const legacy = {
          runId: "20260805T202800000Z-0000",
          itemRef: "348",
          state: "failed",
          attempt: 1,
          outcome: "failed",
          sessionId: "sess-legacy",
          brief: {},
          createdAt: "2026-08-05T20:28:00.000Z",
          updatedAt: "2026-08-05T21:05:00.000Z",
          failureReason: "runtime_offline",
          heartbeatAt: null,
          retryOf: null,
          reclaimedAt: null,
          node: null,
        };
        assert.equal(Object.keys(legacy).length, 14, "the fixture IS a genuine fourteen-key record (non-vacuous)");
        await mkdir(path.join(item.dir, "runs"), { recursive: true });
        await writeFile(path.join(item.dir, "runs", `${legacy.runId}.json`), JSON.stringify(legacy, null, 2), "utf8");

        const [normalized] = await readRuns(item);
        assert.deepEqual(Object.keys(normalized), FROZEN_KEYS, "it normalizes to the fifteen keys");
        assert.equal(normalized.resumeAfter, null, "absence is benign");

        // No park stamp ⇒ no gate ⇒ resumes immediately, as it always has.
        const resumed = await retryRun(item, { maxAttempts: 3, now: "2026-08-05T21:06:00.000Z" });
        assert.equal(resumed.attempt, 2);
        assert.equal(resumed.sessionId, "sess-legacy");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "session-limit/store: the park survives a direct store round-trip (the command layer is not the only writer)",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      try {
        const item = await buildMilestone(workDir);
        await startRun(item, { sessionId: "sess-1", now: "2026-08-05T20:28:00.000Z" });
        await completeRun(item, {
          outcome: "failed",
          failureReason: "session_limit",
          resumeAfter: "2026-08-06T00:10:00.000Z",
          now: "2026-08-05T21:05:00.000Z",
        });
        const [record] = await readRuns(item);
        assert.equal(record.resumeAfter, "2026-08-06T00:10:00.000Z", "the store persists the stamp it is handed");
        await expectCode(() => retryRun(item, { maxAttempts: 3, now: "2026-08-05T21:06:00.000Z" }), "retry-parked");
        const resumed = await retryRun(item, { maxAttempts: 3, now: "2026-08-06T00:11:00.000Z" });
        assert.equal(resumed.attempt, 2);
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // 131/04 — work:answer and the sweep's waiting row (hoisted factories below).
  ...answerVerbTests(),
  ...answerMeshTests(),
  ...answerSweepTests(),
];

// ---- 131/04 — work:answer (task 00 and the mesh leg of task 03) and the sweep's waiting row (task 04)
//
// The verb's cases run against a real fixture workspace whose id is pinned (`w1` for task 00,
// `ws-1` for task 03's mesh leg) under an isolated aof home per case, so the ask files and the
// global store the verb reads are the case's own. `fetch` is always a spy: nothing reaches a network.

const ANSWER_NOW = "2026-09-23T17:12:00.000Z";
const ANSWER_ASKED = "2026-09-23T17:00:00.000Z";
const ANSWER_SECRET = "https://discord.com/api/webhooks/111/secret-token";
const ANSWER_DOC_KEYS = ["ok", "ref", "runId", "delivery", "state", "by", "answeredAt", "resume"];
const DEFAULT_BY = { actor: "you", via: "cli", node: "node-7297" };

function answerConfig({ mesh = { workspaceId: "w1", nodeId: "node-7297" }, notify = true } = {}) {
  return {
    name: "fixture",
    work: { dir: "./wiki/work", ...(notify ? { notify: { channels: { ops: { type: "discord", urlEnv: "HOOK_A" } } } } : {}) },
    ...(mesh ? { mesh } : {}),
  };
}

async function buildStoryUnder(workDir, milestoneFolder, { number = "01", slug = "s", parent = "03" } = {}) {
  const dir = path.join(workDir, milestoneFolder, "stories", `${number}_story_${slug}`);
  await mkdir(path.join(dir, "tasks"), { recursive: true });
  await writeFile(
    path.join(dir, "STORY.md"),
    `---\ntype: story\nnumber: "${number}"\nslug: ${slug}\nstatus: in-progress\ntitle: "Story"\nparent: "${parent}"\ncreated: 2026-09-23\nupdated: 2026-09-23\n---\n# ${number}\n`,
    "utf8",
  );
  return { dir };
}

// A spy standing in for `fetch`, the 131/02 suites' shape: a response is the three members
// `sendDiscord` reads.
function answerFetchSpy(answer = () => answerResponse(204)) {
  const calls = [];
  const spy = (url, init) => {
    calls.push({ url, init });
    return answer(url, init, calls.length);
  };
  spy.calls = calls;
  return spy;
}
function answerResponse(status, { body } = {}) {
  return { status, headers: { get: () => null }, json: async () => body ?? {} };
}

function degradeRecorder() {
  const events = [];
  setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
  return events;
}

// answerWorld — W, H and the Background's ask for R1, opened waiting at ANSWER_ASKED.
async function answerWorld({ config = answerConfig(), ask = {}, open = true, fetchAnswer, notifyOptions } = {}) {
  const { repo, workDir } = await makeRepo();
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-answer-home-"));
  await writeFile(path.join(repo, ".aof", "aof.config.json"), JSON.stringify(config, null, 2), "utf8");
  const milestone = await buildMilestone(workDir, { number: "03", slug: "m" });
  const story = await buildStoryUnder(workDir, "03_milestone_m");
  const env = { AOF_GLOBAL_HOME: home };
  const dir = loopAsksDir(env);
  if (open) {
    await openAsk(dir, { runId: "R1", workspaceId: "w1", ref: "03/01", sessionId: "S1", phase: "build", scope: "03", now: () => new Date(ANSWER_ASKED), ...ask });
  }
  const fetch = answerFetchSpy(fetchAnswer);
  const invoked = [];
  const ctx = {
    workspace: await loadWorkspace(repo),
    globalWorkStoreOptions: { env },
    notifyOptions: notifyOptions ?? { env: { HOOK_A: ANSWER_SECRET }, fetch },
    invokeRegistered: async (...args) => {
      invoked.push(args);
      throw new Error("the file leg invokes nothing");
    },
  };
  const cleanup = async () => {
    await rm(repo, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  };
  return { repo, workDir, home, env, dir, ctx, fetch, invoked, milestone, story: { ref: "03/01", dir: story.dir }, cleanup };
}

async function snapshotFiles(dir) {
  const snap = {};
  let names = [];
  try { names = await readdir(dir); } catch { return snap; }
  for (const name of names) snap[name] = await readFile(path.join(dir, name), "utf8");
  return snap;
}

function envelopeBody(elapsedMs, { ref = "03/01", by = "you", answer = "take b", config = answerConfig() } = {}) {
  return renderDiscord(buildNotifyEnvelope(
    "session-answered",
    { ref, phase: "build", elapsedMs, outcome: { by, answer } },
    { config, now: () => new Date(ANSWER_NOW) },
  ));
}

async function withAnswerWorld(options, body) {
  const world = await answerWorld(options);
  try {
    return await body(world);
  } finally {
    setDegradeSinkForTest(undefined);
    await world.cleanup();
  }
}

function answerCli(world, args, { env = {} } = {}) {
  const childEnv = { ...process.env, AOF_GLOBAL_HOME: world.home, NODE_NO_WARNINGS: "1", ...env };
  delete childEnv.HOOK_A;
  const result = spawnCliSync(process.execPath, [ANSWER_CLI, ...args], { cwd: world.repo, encoding: "utf8", env: childEnv });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function answerVerbTests() {
  return [
    {
      name: "131/04 task00 — work:answer is registered beside work:resume with a closed five-key schema",
      run: async () => {
        const command = getCommand("work:answer");
        assert.equal(command, answerCommand, "the registry entry is resume.mjs's answerCommand");
        assert.deepEqual(command.cli.route, ["work", "answer"]);
        assert.deepEqual(Object.keys(command.input.properties), ["ref", "text", "as", "via", "now"]);
        assert.equal(command.input.additionalProperties, false, "the schema is closed");
        assert.equal(getCommand("work:resume"), resumeCommand, "work:resume is unchanged in its home");
      },
    },
    {
      name: "131/04 task00 — a waiting ask is answered verbatim, with who and when, in the eight-key document",
      run: () => withAnswerWorld({}, async ({ ctx, dir }) => {
        const document = await invoke("work:answer", { ref: "03/01", text: "take b — keep the tests", now: ANSWER_NOW }, ctx);
        assert.deepEqual(Object.keys(document), ANSWER_DOC_KEYS, "the eight keys, in order");
        assert.deepEqual(document, { ok: true, ref: "03/01", runId: "R1", delivery: "waiting", state: "answered", by: DEFAULT_BY, answeredAt: ANSWER_NOW, resume: null });
        const record = await readAsk(dir, "R1");
        assert.equal(record.state, "answered");
        assert.equal(record.answer, "take b — keep the tests");
        assert.equal(record.answeredAt, ANSWER_NOW);
        assert.deepEqual(record.by, document.by);
      }),
    },
    {
      name: "131/04 task00 — who answered is read from as, via and the config, never from the machine (twelve rows)",
      run: async () => {
        const eighty = "a".repeat(80);
        const pinnedNoNode = answerConfig({ mesh: { workspaceId: "w1" } });
        const rows = [
          [undefined, {}, DEFAULT_BY],
          [undefined, { as: "  umami  " }, { ...DEFAULT_BY, actor: "umami" }],
          [undefined, { as: "" }, DEFAULT_BY],
          [undefined, { as: "   " }, DEFAULT_BY],
          [undefined, { as: 42 }, DEFAULT_BY],
          [undefined, { as: { name: "umami" } }, DEFAULT_BY],
          [undefined, { via: "board" }, { ...DEFAULT_BY, via: "board" }],
          [undefined, { via: "BOARD" }, DEFAULT_BY],
          [undefined, { via: "ssh" }, DEFAULT_BY],
          [undefined, { via: 7 }, DEFAULT_BY],
          [pinnedNoNode, { as: "umami", via: "board" }, { actor: "umami", via: "board", node: null }],
          [undefined, { as: eighty }, { ...DEFAULT_BY, actor: eighty }],
        ];
        assert.equal(rows.length, 12, "every row of the outline is walked");
        for (const [index, [config, extra, by]] of rows.entries()) {
          await withAnswerWorld(config ? { config } : {}, async ({ ctx, dir }) => {
            const document = await invoke("work:answer", { ref: "03/01", text: "take b", now: ANSWER_NOW, ...extra }, ctx);
            assert.deepEqual(document.by, by, `row ${index}: the document's by`);
            assert.deepEqual((await readAsk(dir, "R1")).by, by, `row ${index}: the file's by`);
          });
        }
      },
    },
    {
      name: "131/04 task00 — without an injected clock the answer is stamped with the real time",
      run: () => withAnswerWorld({}, async ({ ctx, dir }) => {
        const t0 = Date.now();
        const document = await invoke("work:answer", { ref: "03/01", text: "take b" }, ctx);
        const t1 = Date.now();
        assert.match(document.answeredAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
        const at = Date.parse(document.answeredAt);
        assert.ok(at >= t0 && at <= t1, "stamped between the two clock readings");
        assert.equal((await readAsk(dir, "R1")).answeredAt, document.answeredAt);
      }),
    },
    {
      name: "131/04 task00 — a parked ask is answered, and the document says how the loop comes back",
      run: () => withAnswerWorld({}, async ({ ctx, dir }) => {
        await parkAsk(dir, "R1", { now: () => new Date("2026-09-23T17:05:00.000Z") });
        const document = await invoke("work:answer", { ref: "03/01", text: "take b", as: "umami", now: ANSWER_NOW }, ctx);
        assert.equal(document.delivery, "parked");
        assert.equal(document.by.actor, "umami");
        assert.equal(document.resume, "aof work loop 03 --resume");
        const record = await readAsk(dir, "R1");
        assert.equal(record.state, "answered");
        assert.equal(record.parkedAt, "2026-09-23T17:05:00.000Z", "its parkedAt is kept");
      }),
    },
    {
      name: "131/04 task00 — a parked ask's resume names the ask's scope, else the ref's top-level item (five rows)",
      run: async () => {
        const rows = [
          ["03/01", "03", "aof work loop 03 --resume"],
          ["03/01", null, "aof work loop 03 --resume"],
          ["03/01", "", "aof work loop 03 --resume"],
          ["03", null, "aof work loop 03 --resume"],
          ["03/01", "03/01", "aof work loop 03/01 --resume"],
        ];
        for (const [index, [ref, scope, resume]] of rows.entries()) {
          await withAnswerWorld({ ask: { ref, scope } }, async ({ ctx, dir }) => {
            await parkAsk(dir, "R1");
            const document = await invoke("work:answer", { ref, text: "take b", now: ANSWER_NOW }, ctx);
            assert.equal(document.delivery, "parked", `row ${index}`);
            assert.equal(document.runId, "R1", `row ${index}`);
            assert.equal(document.resume, resume, `row ${index}`);
          });
        }
      },
    },
    {
      name: "131/04 task00 — the answer is announced once, as a wait, and the announcement never changes the document",
      run: async () => {
        const announced = await withAnswerWorld({}, async ({ ctx, fetch }) => {
          const document = await invoke("work:answer", { ref: "03/01", text: "take b", now: ANSWER_NOW }, ctx);
          assert.equal(fetch.calls.length, 1, "one post");
          assert.equal(fetch.calls[0].url, ANSWER_SECRET);
          assert.deepEqual(JSON.parse(fetch.calls[0].init.body), envelopeBody(720000));
          return document;
        });
        await withAnswerWorld({ config: answerConfig({ notify: false }) }, async ({ ctx, fetch }) => {
          const document = await invoke("work:answer", { ref: "03/01", text: "take b", now: ANSWER_NOW }, ctx);
          assert.deepEqual(document, announced, "the same document with no work.notify");
          assert.equal(fetch.calls.length, 0, "nothing was posted without a channel");
        });
      },
    },
    {
      name: "131/04 task00 — the announced wait runs from the ask to the answer, and is never negative (five rows)",
      run: async () => {
        const rows = [
          [ANSWER_NOW, false, 0],
          ["2026-09-23T17:00:00.000Z", true, 720000],
          ["2026-09-22T11:12:00.000Z", true, 108000000],
          ["2026-09-24T09:00:00.000Z", false, 0],
          [null, false, null],
        ];
        for (const [index, [askedAt, parked, elapsedMs]] of rows.entries()) {
          await withAnswerWorld({ open: askedAt != null, ask: {} }, async ({ ctx, dir, fetch }) => {
            if (askedAt == null) {
              // A hand-written file: the fifteen keys with askedAt null.
              await mkdir(dir, { recursive: true });
              await writeFile(askRequestPath(dir, "R1"), JSON.stringify({
                runId: "R1", ref: "03/01", workspaceId: "w1", loopRunId: null, scope: "03", sessionId: "S1", phase: "build", node: null,
                question: null, askedAt: null, state: "waiting", parkedAt: null, answer: null, answeredAt: null, by: null,
              }), "utf8");
            } else {
              await openAsk(dir, { runId: "R1", workspaceId: "w1", ref: "03/01", sessionId: "S1", phase: "build", scope: "03", now: () => new Date(askedAt) });
            }
            if (parked) await parkAsk(dir, "R1");
            await invoke("work:answer", { ref: "03/01", text: "take b", now: ANSWER_NOW }, ctx);
            assert.equal(fetch.calls.length, 1, `row ${index}: one post`);
            assert.deepEqual(JSON.parse(fetch.calls[0].init.body), envelopeBody(elapsedMs), `row ${index}: elapsed ${elapsedMs}`);
          });
        }
      },
    },
    {
      name: "131/04 task00 — however the channel fails, the answer stands and the failure is one named degrade (five rows)",
      run: async () => {
        const reference = await withAnswerWorld({}, ({ ctx }) => invoke("work:answer", { ref: "03/01", text: "take b", now: ANSWER_NOW }, ctx));
        const untilAborted = (init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason ?? new Error("aborted"))));
        const rows = [
          ["throws", { fetchAnswer: () => { throw new Error("socket hang up"); } }, "notify-delivery-failed"],
          ["500", { fetchAnswer: () => answerResponse(500) }, "notify-delivery-failed"],
          ["429", { fetchAnswer: () => answerResponse(429, { body: { retry_after: 2 } }) }, "notify-rate-limited"],
          ["never settles", { hang: true }, "notify-delivery-failed"],
          ["no HOOK_A", { noHook: true }, "notify-channel-unconfigured"],
        ];
        for (const [label, row, code] of rows) {
          const spy = answerFetchSpy(row.hang ? (_url, init) => untilAborted(init) : row.fetchAnswer);
          const notifyOptions = row.noHook
            ? { env: {}, fetch: spy }
            : { env: { HOOK_A: ANSWER_SECRET }, fetch: spy, ...(row.hang ? { timeoutMs: 50 } : {}) };
          await withAnswerWorld({ notifyOptions }, async ({ ctx, dir }) => {
            const events = degradeRecorder();
            const document = await invoke("work:answer", { ref: "03/01", text: "take b", now: ANSWER_NOW }, ctx);
            assert.deepEqual(document, reference, `${label}: the delivering case's document`);
            assert.equal((await readAsk(dir, "R1")).state, "answered", `${label}: the file reads answered`);
            const notices = events.filter((event) => String(event.code).startsWith("notify-"));
            assert.deepEqual(notices.map((event) => event.code), [code], `${label}: one ${code}`);
            assert.ok(!JSON.stringify(document).includes("secret-token"), `${label}: the document carries no URL`);
            for (const event of events) assert.ok(!JSON.stringify(event).includes("secret-token"), `${label}: no degrade carries the URL`);
            if (row.noHook) assert.equal(spy.calls.length, 0, "an unconfigured channel is never called");
          });
        }
      },
    },
    {
      name: "131/04 task00 — an item with no ask anywhere is refused answer-not-waiting, and nothing is written or posted",
      run: () => withAnswerWorld({ open: false }, async ({ ctx, dir, fetch }) => {
        const before = await snapshotFiles(dir);
        const error = await expectCode(() => invoke("work:answer", { ref: "03/01", text: "take b", now: ANSWER_NOW }, ctx), "answer-not-waiting");
        assert.equal(error.status, 409);
        assert.deepEqual(await snapshotFiles(dir), before, "the listing of dir is unchanged");
        assert.equal(fetch.calls.length, 0);
      }),
    },
    {
      name: "131/04 task00 — every refusal is coded by the first rung that fails, and writes, posts and invokes nothing (fourteen rows)",
      run: async () => {
        const long = "a".repeat(8001);
        const rows = [
          [null, "03/01", "", "answer-empty", 400],
          [null, "03/01", undefined, "answer-empty", 400],
          [null, "03/01", 42, "answer-empty", 400],
          [null, "03/01", "ok\u001b[201~rm -rf .", "answer-control-chars", 400],
          [null, "03/01", "ok\u007f", "answer-control-chars", 400],
          [null, "03/01", long, "answer-too-long", 400],
          ["answered", "03/01", "c", "ask-already-answered", 409],
          ["answered", "03/01", "", "answer-empty", 400],
          [null, "999/99", "take b", "ref-not-found", 404],
          [null, "999/99", "", "ref-not-found", 404],
          [null, "3/1", "take b", "ref-not-found", 404],
          [null, undefined, "take b", "ref-not-found", 404],
          ["overlay", "03/01", "ok\u001b", "answer-control-chars", 400],
          ["none", "03/01", long, "answer-too-long", 400],
        ];
        assert.equal(rows.length, 14);
        for (const [index, [given, ref, text, code, status]] of rows.entries()) {
          await withAnswerWorld({ open: given !== "overlay" && given !== "none" }, async ({ ctx, dir, fetch, invoked, env }) => {
            if (given === "answered") await answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: "a", by: { actor: "umami", via: "cli", node: null } });
            if (given === "overlay") await seedAssignmentRow(env, { itemRef: "03", workspaceId: "w1", sessionId: "S9", at: "2026-09-23T16:00:00.000Z" });
            const before = await snapshotFiles(dir);
            const error = await expectCode(() => invoke("work:answer", { ref, text, now: ANSWER_NOW }, ctx), code);
            assert.equal(error.status, status, `row ${index}: status`);
            assert.deepEqual(await snapshotFiles(dir), before, `row ${index}: every file is byte-unchanged and none was added`);
            assert.equal(fetch.calls.length, 0, `row ${index}: nothing posted`);
            assert.equal(invoked.length, 0, `row ${index}: nothing invoked`);
          });
        }
      },
    },
    {
      name: "131/04 task00 — an actor that cannot be recorded is refused after the ref and before the text (six rows)",
      run: async () => {
        const rows = [
          ["03/01", "b", "a".repeat(81), "answer-actor-invalid", 400],
          ["03/01", "b", "a\u0000b", "answer-actor-invalid", 400],
          ["03/01", "b", "line\nbreak", "answer-actor-invalid", 400],
          ["03/01", "b", "tab\there", "answer-actor-invalid", 400],
          ["03/01", "", "a".repeat(81), "answer-actor-invalid", 400],
          ["999/99", "b", "a".repeat(81), "ref-not-found", 404],
        ];
        for (const [index, [ref, text, as, code, status]] of rows.entries()) {
          await withAnswerWorld({}, async ({ ctx, dir, fetch }) => {
            const before = await snapshotFiles(dir);
            const error = await expectCode(() => invoke("work:answer", { ref, text, as, now: ANSWER_NOW }, ctx), code);
            assert.equal(error.status, status, `row ${index}`);
            assert.deepEqual(await snapshotFiles(dir), before, `row ${index}: byte-unchanged`);
            assert.equal(fetch.calls.length, 0, `row ${index}: nothing posted`);
          });
        }
      },
    },
    {
      name: "131/04 task00 — the ref is trimmed before it is resolved",
      run: () => withAnswerWorld({}, async ({ ctx, dir }) => {
        const document = await invoke("work:answer", { ref: " 03/01 ", text: "take b", now: ANSWER_NOW }, ctx);
        assert.equal(document.ok, true);
        assert.equal(document.ref, "03/01");
        assert.equal(document.runId, "R1");
        assert.equal((await readAsk(dir, "R1")).state, "answered");
      }),
    },
    {
      name: "131/04 task00 — of two asks on one ref, the latest askedAt is answered, and the document names its run (four rows)",
      run: async () => {
        const rows = [
          ["2026-09-23T17:05:00.000Z", "waiting", { runId: "R3", delivery: "waiting" }, "R1"],
          ["2026-09-23T17:05:00.000Z", "parked", { runId: "R3", delivery: "parked" }, "R1"],
          ["2026-09-23T17:05:00.000Z", "answered", "ask-already-answered", "R1"],
          ["2026-09-23T16:55:00.000Z", "waiting", { runId: "R1" }, "R3"],
        ];
        for (const [index, [r3At, r3, outcome, untouched]] of rows.entries()) {
          await withAnswerWorld({}, async ({ ctx, dir }) => {
            await openAsk(dir, { runId: "R3", workspaceId: "w1", ref: "03/01", sessionId: "S3", phase: "build", scope: "03", now: () => new Date(r3At) });
            if (r3 === "parked") await parkAsk(dir, "R3");
            if (r3 === "answered") await answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: "a", by: { actor: "umami", via: "cli", node: null } });
            const before = await readFile(askRequestPath(dir, untouched), "utf8");
            if (typeof outcome === "string") {
              const error = await expectCode(() => invoke("work:answer", { ref: "03/01", text: "take b", now: ANSWER_NOW }, ctx), outcome);
              assert.equal(error.status, 409, `row ${index}`);
            } else {
              const document = await invoke("work:answer", { ref: "03/01", text: "take b", now: ANSWER_NOW }, ctx);
              for (const [key, value] of Object.entries(outcome)) assert.equal(document[key], value, `row ${index}: ${key}`);
            }
            assert.equal(await readFile(askRequestPath(dir, untouched), "utf8"), before, `row ${index}: ${untouched}'s file is byte-unchanged`);
          });
        }
      },
    },
    {
      name: "131/04 task00 — anything outside the refused set is stored and posted verbatim (four rows)",
      run: async () => {
        const texts = ["  take b — keep the tests\n", "a\tb\r\nc", "a".repeat(8000), "a\u009b[201~b"];
        for (const [index, text] of texts.entries()) {
          await withAnswerWorld({}, async ({ ctx, dir, fetch }) => {
            const document = await invoke("work:answer", { ref: "03/01", text, now: ANSWER_NOW }, ctx);
            assert.equal(document.ok, true, `row ${index}`);
            assert.equal((await readAsk(dir, "R1")).answer, text, `row ${index}: stored verbatim`);
            assert.deepEqual(JSON.parse(fetch.calls[0].init.body), envelopeBody(720000, { answer: text }), `row ${index}: posted verbatim`);
          });
        }
      },
    },
    {
      name: "131/04 task00 — a second answer is refused naming the first, and is not announced again",
      run: () => withAnswerWorld({}, async ({ ctx, dir, fetch }) => {
        await invoke("work:answer", { ref: "03/01", text: "take b", now: ANSWER_NOW }, ctx);
        const error = await expectCode(() => invoke("work:answer", { ref: "03/01", text: "take c", as: "umami", now: ANSWER_NOW }, ctx), "ask-already-answered");
        assert.equal(error.status, 409);
        assert.match(error.message, /\byou\b/u, "the refusal names who answered first");
        assert.equal((await readAsk(dir, "R1")).answer, "take b");
        assert.equal(fetch.calls.length, 1, "one post across both calls");
      }),
    },
    {
      name: "131/04 task00 — the verb reads no run record and writes none",
      run: () => withAnswerWorld({}, async ({ ctx, story }) => {
        await startRun(story, { sessionId: "S1", now: "2026-09-23T16:59:00.000Z" });
        const runs = path.join(story.dir, "runs");
        const before = await snapshotFiles(runs);
        assert.equal(Object.keys(before).length, 1, "R1's record is on disk");
        await invoke("work:answer", { ref: "03/01", text: "take b", now: ANSWER_NOW }, ctx);
        assert.deepEqual(await snapshotFiles(runs), before, "every file under runs/ is byte-unchanged");
        const source = (await readFile(path.join(ANSWER_REPO_ROOT, "src", "commands", "resume.mjs"), "utf8")).replace(/\/\/[^\n]*/gu, "");
        for (const writer of ["openRunAsk", "parkRunAsk", "answerRunAsk"]) assert.ok(!source.includes(writer), `resume.mjs calls no ${writer}`);
      }),
    },
    {
      name: "131/04 task00 — the argv adapter reads the ref, the quoted answer and --as, and nothing else (seven rows)",
      run: async () => {
        const argv = getCommand("work:answer").cli.argv;
        assert.deepEqual(argv(["03/01", "take b"], { json: true }), { ref: "03/01", text: "take b" });
        assert.deepEqual(argv(["03/01", "take b"], { as: "umami" }), { ref: "03/01", text: "take b", as: "umami" });
        for (const positionals of [["03/01", "take", "b"], ["03/01", "a b", "c"]]) {
          let refused = null;
          try { argv(positionals, {}); } catch (error) { refused = error; }
          assert.ok(refused, `${positionals.join(" ")} is refused by the adapter`);
          assert.match(refused.message, /[Qq]uote the answer/u, "the usage error says to quote the answer");
        }
        assert.deepEqual(argv(["03/01"], {}), { ref: "03/01" });
        assert.deepEqual(argv([], {}), {});
        await withAnswerWorld({}, async (world) => {
          const before = await snapshotFiles(world.dir);
          const refused = answerCli(world, ["work", "answer", "03/01", "take b", "--via", "board"]);
          assert.notEqual(refused.status, 0, "--via is refused before the command runs");
          assert.match(`${refused.stderr}${refused.stdout}`, /unknown[- ]flag|Unknown flag/iu);
          assert.deepEqual(await snapshotFiles(world.dir), before, "dir is byte-unchanged");
          const quoted = answerCli(world, ["work", "answer", "03/01", "take", "b"]);
          assert.notEqual(quoted.status, 0, "an unquoted answer exits non-zero");
          assert.match(`${quoted.stderr}${quoted.stdout}`, /[Qq]uote the answer/u);
          assert.deepEqual(await snapshotFiles(world.dir), before, "…and writes nothing");
        });
      },
    },
    {
      name: "131/04 task00 — the CLI's --json is the in-process document, and a refusal exits non-zero",
      run: () => withAnswerWorld({}, async (world) => {
        const result = answerCli(world, ["work", "answer", "03/01", "take b", "--json"]);
        assert.equal(result.status, 0, result.stderr);
        const printed = JSON.parse(result.stdout);
        assert.deepEqual(Object.keys(printed), ANSWER_DOC_KEYS, "the eight keys, in order");
        const record = await readAsk(world.dir, "R1");
        assert.deepEqual(printed, { ok: true, ref: "03/01", runId: "R1", delivery: "waiting", state: "answered", by: DEFAULT_BY, answeredAt: record.answeredAt, resume: null });
        const again = answerCli(world, ["work", "answer", "03/01", "take c", "--json"]);
        assert.notEqual(again.status, 0);
        assert.match(`${again.stdout}${again.stderr}`, /ask-already-answered/u);
      }),
    },
    {
      name: "131/04 task00 — the render says what happened and what comes next (two rows)",
      run: async () => {
        const rows = [
          [false, "Answered 03/01 — the waiting session resumes with your answer (run R1)."],
          [true, "Answered 03/01 — its run is parked; resume the loop with: aof work loop 03 --resume"],
        ];
        for (const [parked, line] of rows) {
          await withAnswerWorld({}, async (world) => {
            if (parked) await parkAsk(world.dir, "R1");
            const result = answerCli(world, ["work", "answer", "03/01", "take b"]);
            assert.equal(result.status, 0, result.stderr);
            assert.equal(result.stdout.trim(), line);
          });
        }
      },
    },
  ];
}

// seedAssignmentRow — one global_assignments row, parked needs-input unless told otherwise, the
// terminal-resume suites' own writers.
async function seedAssignmentRow(env, { itemRef, workspaceId, sessionId = "sess-89d1", runId = "run-17", state = "running", code = "needs-input", node = "umamis-mac-mini", at = "2026-09-23T16:00:00.000Z" }) {
  const store = await openGlobalWorkProjectionStore({ env });
  try {
    const record = assembleAssignmentRecord({ itemRef, workspaceId, targetNodeId: node, issuer: "control-a", now: at });
    insertAssignment(store, record);
    if (state !== "assigned") updateAssignmentState(store, record.assignmentId, state, { now: at, runId, sessionId, code });
    return record.assignmentId;
  } finally {
    store.close?.();
  }
}

// meshWorld — task 03's Background: workspace `ws-1` holding 18 and 18/02, no ask file, and the
// global store's row for 18 parked needs-input on sess-89d1 (unless the case builds its own).
async function meshWorld({ seed = true, invokeAnswer } = {}) {
  const { repo, workDir } = await makeRepo();
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-answer-mesh-"));
  const config = answerConfig({ mesh: { workspaceId: "ws-1", nodeId: "node-7297" } });
  await writeFile(path.join(repo, ".aof", "aof.config.json"), JSON.stringify(config, null, 2), "utf8");
  await buildMilestone(workDir, { number: "18", slug: "m" });
  await buildStoryUnder(workDir, "18_milestone_m", { number: "02", parent: "18" });
  const env = { AOF_GLOBAL_HOME: home };
  if (seed) await seedAssignmentRow(env, { itemRef: "18", workspaceId: "ws-1" });
  const fetch = answerFetchSpy();
  const invoked = [];
  const ctx = {
    workspace: await loadWorkspace(repo),
    globalWorkStoreOptions: { env },
    notifyOptions: { env: { HOOK_A: ANSWER_SECRET }, fetch },
    invokeRegistered: async (id, input, passed) => {
      invoked.push([id, input, passed]);
      if (typeof invokeAnswer === "function") return invokeAnswer();
      return invokeAnswer ?? { ok: true, dispatched: true, confirmed: true, refused: false, refusalCode: null, node: "umamis-mac-mini", confirmedRunId: "run-17" };
    },
  };
  const cleanup = async () => {
    await rm(repo, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  };
  return { repo, home, env, dir: loopAsksDir(env), ctx, fetch, invoked, cleanup };
}

async function withMeshWorld(options, body) {
  const world = await meshWorld(options);
  try {
    return await body(world);
  } finally {
    await world.cleanup();
  }
}

function coded(message, code, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function answerMeshTests() {
  const BY = { actor: "umami", via: "board", node: "node-7297" };
  return [
    {
      name: "131/04 task03 — the verb hands a worker's ask to terminal-resume with the answer, who gave it and when it parked",
      run: () => withMeshWorld({}, async ({ ctx, dir, fetch, invoked }) => {
        const document = await invoke("work:answer", { ref: "18", text: "take b", as: "umami", via: "board", now: ANSWER_NOW }, ctx);
        assert.equal(invoked.length, 1);
        const [id, input, passed] = invoked[0];
        assert.equal(id, "mesh:terminal-resume");
        assert.deepEqual(input, { session: "sess-89d1", answer: { text: "take b", by: BY, askedAt: "2026-09-23T16:00:00.000Z" } });
        assert.equal(passed, ctx, "the verb's own ctx carries the terminal-resume seams");
        assert.deepEqual(document, { ok: true, ref: "18", runId: "run-17", delivery: "mesh", state: "resumed", by: BY, answeredAt: ANSWER_NOW, resume: null });
        assert.deepEqual(await snapshotFiles(dir), {}, "no ask file was written");
        assert.equal(fetch.calls.length, 0, "no notification on the mesh leg");
      }),
    },
    {
      name: "131/04 task03 — what the row says decides the leg (fourteen rows)",
      run: async () => {
        const rows = [
          ["as seeded", "18", "mesh"],
          ["as seeded", "18/02", "mesh-inherited"],
          [{ code: "resumed" }, "18", "answer-not-waiting"],
          [{ state: "assigned" }, "18", "answer-not-waiting"],
          [{ state: "done", code: null }, "18", "answer-not-waiting"],
          [{ sessionId: null }, "18", "answer-not-waiting"],
          ["none", "18", "answer-not-waiting"],
          [{ code: null }, "18", "answer-not-waiting"],
          [{ sessionId: "" }, "18", "answer-not-waiting"],
          [{ workspaceId: "ws-2" }, "18", "answer-not-waiting"],
          ["story done", "18/02", "answer-not-waiting"],
          ["file waiting", "18", "file"],
          ["file answered", "18", "ask-already-answered"],
          ["as seeded", "19", "ref-not-found"],
        ];
        assert.equal(rows.length, 14);
        for (const [index, [row, ref, outcome]] of rows.entries()) {
          const custom = typeof row === "object";
          await withMeshWorld({ seed: row !== "none" && !custom }, async ({ ctx, env, dir, invoked }) => {
            if (custom) await seedAssignmentRow(env, { itemRef: "18", workspaceId: "ws-1", ...row });
            if (row === "story done") await seedAssignmentRow(env, { itemRef: "18/02", workspaceId: "ws-1", state: "done", code: null, at: "2026-09-23T16:30:00.000Z" });
            if (row === "file waiting" || row === "file answered") {
              await openAsk(dir, { runId: "L1", workspaceId: "ws-1", ref: "18", sessionId: "L", phase: "build", scope: "18", now: () => new Date(ANSWER_ASKED) });
              if (row === "file answered") await answerAsk(dir, { workspaceId: "ws-1", ref: "18", text: "a", by: { actor: "umami", via: "cli", node: null } });
            }
            const call = () => invoke("work:answer", { ref, text: "take b", now: ANSWER_NOW }, ctx);
            if (outcome === "mesh" || outcome === "mesh-inherited") {
              const document = await call();
              assert.equal(document.delivery, "mesh", `row ${index}`);
              assert.equal(invoked.length, 1, `row ${index}: the spy is called once`);
              assert.equal(invoked[0][1].session, "sess-89d1", `row ${index}: the milestone's session`);
            } else if (outcome === "file") {
              const document = await call();
              assert.equal(document.delivery, "waiting", `row ${index}`);
              assert.equal(invoked.length, 0, `row ${index}: the spy was never called`);
            } else {
              const error = await expectCode(call, outcome);
              assert.equal(error.status, outcome === "ref-not-found" ? 404 : 409, `row ${index}`);
              assert.equal(invoked.length, 0, `row ${index}: the spy was never called`);
            }
          });
        }
      },
    },
    {
      name: "131/04 task03 — the resume's own answer decides the document or the refusal (eight rows)",
      run: async () => {
        const rows = [
          [{ ok: true, confirmed: true, refused: false, confirmedRunId: "run-17" }, { state: "resumed", runId: "run-17" }],
          [{ ok: true, confirmed: true, refused: false, assignmentState: "done", confirmedRunId: "run-17" }, { state: "resumed", runId: "run-17" }],
          [{ ok: true, confirmed: false, refused: false, confirmedRunId: null }, { state: "dispatched", runId: null }],
          [{ ok: true, confirmed: false, refused: true, refusalCode: "terminal-resume-not-started" }, ["terminal-resume-not-started", 409]],
          [() => { throw coded("not parked", "session-not-parked", 409); }, ["session-not-parked", 409]],
          [() => { throw coded("full", "resume-capacity-full", 409); }, ["resume-capacity-full", 409]],
          [() => { throw coded("no relay", "relay-unconfigured", 400); }, ["relay-unconfigured", 400]],
          [() => { throw coded("unknown", "session-unknown", 404); }, ["session-unknown", 404]],
        ];
        for (const [index, [result, outcome]] of rows.entries()) {
          await withMeshWorld({ invokeAnswer: result }, async ({ ctx }) => {
            const call = () => invoke("work:answer", { ref: "18", text: "take b", now: ANSWER_NOW }, ctx);
            if (Array.isArray(outcome)) {
              const error = await expectCode(call, outcome[0]);
              assert.equal(error.status, outcome[1], `row ${index}`);
            } else {
              const document = await call();
              assert.equal(document.state, outcome.state, `row ${index}`);
              assert.equal(document.runId, outcome.runId, `row ${index}`);
            }
          });
        }
      },
    },
    {
      name: "131/04 task03 — the render says whether the answer was typed or only dispatched (two rows)",
      run: async () => {
        const render = getCommand("work:answer").cli.render;
        const base = { ok: true, ref: "18", delivery: "mesh", by: BY, answeredAt: ANSWER_NOW, resume: null };
        assert.equal(render({ ...base, runId: "run-17", state: "resumed" }), "Answered 18 — typed into the worker's session (run run-17).");
        assert.equal(
          render({ ...base, runId: null, state: "dispatched" }),
          "Answered 18 — dispatched but NOT CONFIRMED within the window; the reservation stands, do not answer again while the row reads resumed.",
        );
        // …and it is the render of the verb's own document, not of a hand-built one.
        await withMeshWorld({}, async ({ ctx }) => {
          const document = await invoke("work:answer", { ref: "18", text: "take b", now: ANSWER_NOW }, ctx);
          assert.equal(render(document), "Answered 18 — typed into the worker's session (run run-17).");
        });
      },
    },
    {
      name: "131/04 task03 — through the real registry the pushed envelope carries the answer, and the reservation refuses a second answer",
      run: () => withMeshWorld({}, async ({ ctx }) => {
        const pushed = [];
        const real = {
          ...ctx,
          invokeRegistered: undefined,
          workspace: { ...ctx.workspace, config: { ...ctx.workspace.config, work: { ...ctx.workspace.config.work, dispatch: { concurrency: 1 } } } },
          createTerminalResumePush: () => ({ push: async (envelope) => { pushed.push(envelope); }, close() {} }),
          confirmTimeoutMs: 50,
        };
        const document = await invoke("work:answer", { ref: "18", text: "take b", as: "umami", via: "board", now: ANSWER_NOW }, real);
        assert.equal(document.delivery, "mesh");
        assert.equal(document.state, "dispatched");
        assert.equal(document.runId, null);
        assert.equal(pushed.length, 1);
        assert.deepEqual(pushed[0].signal.answer, { text: "take b", by: BY, askedAt: "2026-09-23T16:00:00.000Z" });
        const error = await expectCode(() => invoke("work:answer", { ref: "18", text: "take c", now: ANSWER_NOW }, real), "answer-not-waiting");
        assert.equal(error.status, 409);
        assert.match(error.message, /resumed/u, "the row now reads resumed");
        assert.equal(pushed.length, 1, "nothing more is pushed");
      }),
    },
    {
      name: "131/04 task03 — a bad answer never reaches the worker",
      run: () => withMeshWorld({}, async ({ ctx, invoked }) => {
        const error = await expectCode(() => invoke("work:answer", { ref: "18", text: "ok\u001b[201~", now: ANSWER_NOW }, ctx), "answer-control-chars");
        assert.equal(error.status, 400);
        assert.equal(invoked.length, 0);
      }),
    },
  ];
}

// ---- task 04: the sweep names a run waiting on an answer --------------------------------------

const SWEEP_NOW = "2026-08-06T00:00:00.000Z";

// The Background: 348 with one run R minted at 20:00, running, one ask opened at 21:00.
async function sweepWorld() {
  const { repo, workDir } = await makeRepo();
  const item = await buildMilestone(workDir, { number: "348", slug: "ar-gate" });
  const other = await buildMilestone(workDir, { number: "349", slug: "other" });
  const ctx = await ctxFor(repo);
  return { repo, workDir, item, other, ctx, cleanup: () => rm(repo, { recursive: true, force: true }) };
}

async function withSweepWorld(body) {
  const world = await sweepWorld();
  try {
    return await body(world);
  } finally {
    await world.cleanup();
  }
}

async function waitingRun(item, { at = "2026-08-05T20:00:00.000Z", asked = "2026-08-05T21:00:00.000Z" } = {}) {
  const record = await startRun(item, { sessionId: "sess-r", now: at });
  await openRunAsk(item, record.runId, { question: "a or b?", phase: "build", now: asked });
  return record.runId;
}

async function rewriteRecord(item, runId, change) {
  const file = runRecordPath(item, runId);
  const record = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, JSON.stringify(change(record), null, 2), "utf8");
}

const sweepLines = (text) => text.split("\n");

function answerSweepTests() {
  const ELEVEN = ["ref", "runId", "attempt", "maxAttempts", "failureReason", "sessionId", "resumeAfter", "ready", "state", "readyAt", "silentSince"];
  return [
    {
      name: "131/04 task04 — a beaten waiting run is reported as waiting on you, not in flight",
      run: () => withSweepWorld(async ({ ctx, item }) => {
        const runId = await waitingRun(item);
        await heartbeat(item, runId, { now: "2026-08-05T23:59:30.000Z" });
        const swept = await invoke("work:resume", { now: SWEEP_NOW }, ctx);
        assert.equal(swept.pending.length, 1);
        const [row] = swept.pending;
        assert.equal(row.ref, "348");
        assert.equal(row.state, "waiting-on-you");
        assert.equal(row.ready, false);
        assert.equal(row.runId, runId);
        assert.equal(row.attempt, 1);
        assert.equal(row.askedAt, "2026-08-05T21:00:00.000Z");
        assert.equal(row.parkedAt, null);
        assert.equal(row.silentSince, "2026-08-05T23:59:30.000Z");
        assert.equal(row.readyAt, null);
        assert.equal(row.failureReason, null);
        assert.deepEqual(swept.ready, []);
      }),
    },
    {
      name: "131/04 task04 — the waiting row carries two keys more, and every other row is as it was",
      run: () => withSweepWorld(async ({ ctx, item }) => {
        const runId = await waitingRun(item);
        await heartbeat(item, runId, { now: "2026-08-05T23:59:30.000Z" });
        await invoke("work:run-start", { ref: "349", now: "2026-08-05T23:00:00.000Z" }, ctx);
        await invoke("work:run-complete", { ref: "349", outcome: "failed", reason: "session_limit", resumeAfter: "2026-08-06T00:10:00.000Z", now: "2026-08-05T23:30:00.000Z" }, ctx);
        const swept = await invoke("work:resume", { now: SWEEP_NOW }, ctx);
        assert.deepEqual(swept.pending.map((row) => row.ref), ["348", "349"], "348 is listed before 349");
        const [waiting, parked] = swept.pending;
        assert.deepEqual(Object.keys(waiting), [...ELEVEN, "askedAt", "parkedAt", "status", "title"]);
        assert.equal(waiting.resumeAfter, null);
        assert.equal(waiting.sessionId, "sess-r", "the record's sessionId");
        assert.ok(!("askedAt" in parked) && !("parkedAt" in parked), "349's row has no askedAt or parkedAt key");
        assert.equal(parked.state, "parked");
      }),
    },
    {
      name: "131/04 task04 — a parked, silent waiting run is still waiting on you, never stranded",
      run: () => withSweepWorld(async ({ ctx, item }) => {
        const runId = await waitingRun(item);
        await heartbeat(item, runId, { now: "2026-08-05T21:00:00.000Z" });
        await parkRunAsk(item, runId, { now: "2026-08-05T22:00:00.000Z" });
        const swept = await invoke("work:resume", { now: SWEEP_NOW }, ctx);
        const row = swept.pending.find((entry) => entry.ref === "348");
        assert.equal(row.state, "waiting-on-you");
        assert.equal(row.parkedAt, "2026-08-05T22:00:00.000Z");
        assert.equal(row.ready, false);
        assert.ok(!swept.pending.some((entry) => entry.state === "stranded"), "no row reads stranded");
      }),
    },
    {
      name: "131/04 task04 — the render prints the answer command, with or without a parked clause, and never offers to resume it",
      run: () => withSweepWorld(async ({ ctx, item }) => {
        const render = getCommand("work:resume").cli.render;
        const runId = await waitingRun(item);
        await heartbeat(item, runId, { now: "2026-08-05T23:59:30.000Z" });
        const unparked = render(await invoke("work:resume", { now: SWEEP_NOW }, ctx));
        assert.ok(
          sweepLines(unparked).includes(`  348  NEEDS YOUR ANSWER — asked 2026-08-05T21:00:00.000Z  — answer: aof work answer 348 "…" (attempt 1/3, run ${runId})`),
          unparked,
        );
        await parkRunAsk(item, runId, { now: "2026-08-05T22:00:00.000Z" });
        const text = render(await invoke("work:resume", { now: SWEEP_NOW }, ctx));
        const lines = sweepLines(text);
        assert.ok(lines.includes(`  348  NEEDS YOUR ANSWER — asked 2026-08-05T21:00:00.000Z, parked 2026-08-05T22:00:00.000Z  — answer: aof work answer 348 "…" (attempt 1/3, run ${runId})`), text);
        const answerAt = lines.indexOf("Answer:");
        assert.ok(answerAt > 0, "the tail holds Answer:");
        assert.equal(lines[answerAt + 1], '  aof work answer 348 "…"');
        assert.ok(!lines.includes("  aof work resume 348"), "no resume line for a waiting run");
        assert.ok(!text.includes("waiting on you"), "the sweep never spells the notify phrase");
      }),
    },
    {
      name: "131/04 task04 — the tail answers first, then resumes, and says nothing new when nothing waits (four rows)",
      run: async () => {
        const NOTHING_WAITING = "Nothing is ready yet — answer the questions above, or re-run this command after the earliest readyAt.";
        const rows = [
          ["only 348 waits", ["", "Answer:", '  aof work answer 348 "…"', "", NOTHING_WAITING]],
          ["349 ready", ["", "Answer:", '  aof work answer 348 "…"', "", "Resume now:", "  aof work resume 349"]],
          ["349 parked", ["", "Answer:", '  aof work answer 348 "…"', "", NOTHING_WAITING]],
          ["348 answered, 349 parked", ["", "Nothing is ready yet — re-run this command after the earliest readyAt above."]],
        ];
        for (const [label, tail] of rows) {
          await withSweepWorld(async ({ ctx, item }) => {
            const runId = await waitingRun(item);
            await heartbeat(item, runId, { now: "2026-08-05T23:59:30.000Z" });
            if (label.startsWith("348 answered")) await answerRunAsk(item, runId, { answer: "b", by: { actor: "you", via: "cli", node: null }, now: "2026-08-05T23:00:00.000Z" });
            if (label !== "only 348 waits") {
              await invoke("work:run-start", { ref: "349", now: "2026-08-05T23:00:00.000Z" }, ctx);
              const resumeAfter = label === "349 ready" ? "2026-08-05T23:40:00.000Z" : "2026-08-06T00:10:00.000Z";
              await invoke("work:run-complete", { ref: "349", outcome: "failed", reason: "session_limit", resumeAfter, now: "2026-08-05T23:30:00.000Z" }, ctx);
            }
            const result = await invoke("work:resume", { now: SWEEP_NOW }, ctx);
            const lines = sweepLines(getCommand("work:resume").cli.render(result));
            const lastRow = lines.findLastIndex((line) => /^ {2}\d/u.test(line) && /\(attempt /u.test(line));
            assert.deepEqual(lines.slice(lastRow + 1), tail, label);
          });
        }
      },
    },
    {
      name: "131/04 task04 — a cache-only row is skipped as today, even when its run waits on another node",
      async run() {
        await withCacheReadFixture(async (fx) => {
          const workspace = await loadWorkspace(fx.root, undefined, { env: fx.env });
          const item = await resolveItemExact({ workspace }, "00");
          const runId = await waitingRun(item);
          await heartbeat(item, runId, { now: "2026-08-05T23:59:30.000Z" });
          const without = await runCommand(fx, "work:resume", { now: SWEEP_NOW });
          await plantCacheRow(fx, "07", { node: WORKER_NODE });
          await streamRun(fx, { ref: "07", runId: "w-07", state: "running", node: WORKER_NODE });
          const listed = await runCommand(fx, "work:list", {});
          const cacheOnly = listed.find((row) => row.ref === "07");
          assert.ok(cacheOnly != null && !cacheOnly.dir, "the stream answers 07 as a cache-only row (no dir)");
          const swept = await runCommand(fx, "work:resume", { now: SWEEP_NOW });
          assert.ok(!swept.pending.some((row) => row.ref === "07"), "no row names 07");
          assert.deepEqual(swept, without, "the sweep answers as it does without that row");
          assert.equal(swept.pending[0]?.state, "waiting-on-you", "the local waiting run is still named");
        }, { stream: [{ number: "00", stories: [] }] });
      },
    },
    {
      name: "131/04 task04 — the waiting case outranks every other, and only an open last entry is waiting (twelve rows)",
      run: async () => {
        const recent = "2026-08-05T23:59:30.000Z";
        const answered = { answer: "b", by: { actor: "you", via: "cli", node: null }, now: "2026-08-05T21:30:00.000Z" };
        const toCeiling = async (item) => {
          await startRun(item, { now: "2026-08-05T19:00:00.000Z" });
          await completeRun(item, { outcome: "failed", failureReason: "runtime_offline", now: "2026-08-05T19:01:00.000Z" });
          await retryRun(item, { maxAttempts: 3, now: "2026-08-05T19:02:00.000Z" });
          await completeRun(item, { outcome: "failed", failureReason: "runtime_offline", now: "2026-08-05T19:03:00.000Z" });
          const third = await retryRun(item, { maxAttempts: 3, now: "2026-08-05T19:04:00.000Z" });
          await openRunAsk(item, third.runId, { now: "2026-08-05T21:00:00.000Z" });
          return third.runId;
        };
        const rows = [
          ["open ask after a retryable failure", async (item) => {
            await startRun(item, { now: "2026-08-05T19:00:00.000Z" });
            await completeRun(item, { outcome: "failed", failureReason: "runtime_offline", now: "2026-08-05T19:01:00.000Z" });
            const r = await retryRun(item, { maxAttempts: 3, now: "2026-08-05T20:00:00.000Z" });
            await openRunAsk(item, r.runId, { now: "2026-08-05T21:00:00.000Z" });
            await heartbeat(item, r.runId, { now: recent });
            return r.runId;
          }, { state: "waiting-on-you", runIdIsR: true }],
          ["one answered ask", async (item) => {
            const r = await waitingRun(item);
            await answerRunAsk(item, r, answered);
            await heartbeat(item, r, { now: recent });
            return r;
          }, { state: "in-flight" }],
          ["answered then open", async (item) => {
            const r = await waitingRun(item);
            await answerRunAsk(item, r, answered);
            await openRunAsk(item, r, { now: "2026-08-05T22:00:00.000Z" });
            return r;
          }, { state: "waiting-on-you" }],
          ["asks: []", async (item) => {
            const r = (await startRun(item, { now: "2026-08-05T20:00:00.000Z" })).runId;
            await heartbeat(item, r, { now: recent });
            return r;
          }, { state: "in-flight" }],
          ["a sixteen-key record", async (item) => {
            const r = (await startRun(item, { now: "2026-08-05T20:00:00.000Z" })).runId;
            await heartbeat(item, r, { now: recent });
            await rewriteRecord(item, r, ({ asks, ...rest }) => rest);
            return r;
          }, { state: "in-flight" }],
          ["open ask at attempt 3 of 3", async (item) => {
            const r = await toCeiling(item);
            await heartbeat(item, r, { now: recent });
            return r;
          }, { state: "waiting-on-you" }],
          ["open parked ask, silent a day, at 3 of 3", async (item) => {
            const r = await toCeiling(item);
            await parkRunAsk(item, r, { now: "2026-08-05T21:30:00.000Z" });
            return r;
          }, { state: "waiting-on-you", ready: false }],
          ["open ask after an agent_error", async (item) => {
            await startRun(item, { now: "2026-08-05T19:00:00.000Z" });
            await completeRun(item, { outcome: "failed", failureReason: "agent_error", now: "2026-08-05T19:01:00.000Z" });
            const r = await waitingRun(item);
            await heartbeat(item, r, { now: recent });
            return r;
          }, { state: "waiting-on-you", runIdIsR: true }],
          ["answered, silent past the window", async (item) => {
            const r = await waitingRun(item);
            await answerRunAsk(item, r, answered);
            await rewriteRecord(item, r, (record) => ({ ...record, heartbeatAt: "2026-08-05T21:30:00.000Z", updatedAt: "2026-08-05T21:30:00.000Z" }));
            return r;
          }, { state: "stranded", ready: true }],
          ["asks: \"x\" on disk", async (item) => {
            const r = (await startRun(item, { now: "2026-08-05T20:00:00.000Z" })).runId;
            await heartbeat(item, r, { now: recent });
            await rewriteRecord(item, r, (record) => ({ ...record, asks: "x" }));
            return r;
          }, { state: "in-flight" }],
          ["first open, last answered, written directly", async (item) => {
            const r = (await startRun(item, { now: "2026-08-05T20:00:00.000Z" })).runId;
            await heartbeat(item, r, { now: recent });
            const open = { question: null, phase: null, askedAt: "2026-08-05T21:00:00.000Z", parkedAt: null, answer: null, answeredAt: null, by: null };
            await rewriteRecord(item, r, (record) => ({ ...record, asks: [open, { ...open, answer: "b", answeredAt: "2026-08-05T21:10:00.000Z", by: answered.by }] }));
            return r;
          }, { state: "in-flight" }],
          ["settled failed with its last entry open", async (item) => {
            const r = await waitingRun(item);
            await rewriteRecord(item, r, (record) => ({ ...record, state: "failed", outcome: "failed", failureReason: "runtime_offline" }));
            return r;
          }, { state: "ready", noAskedAt: true }],
        ];
        assert.equal(rows.length, 12);
        for (const [label, build, expected] of rows) {
          await withSweepWorld(async ({ ctx, item }) => {
            const runId = await build(item);
            const swept = await invoke("work:resume", { now: SWEEP_NOW }, ctx);
            const row = swept.pending.find((entry) => entry.ref === "348");
            assert.ok(row, `${label}: a row for 348`);
            assert.equal(row.state, expected.state, `${label}: state`);
            if (expected.runIdIsR) assert.equal(row.runId, runId, `${label}: runId is R`);
            if (expected.ready !== undefined) assert.equal(row.ready, expected.ready, `${label}: ready`);
            if (expected.noAskedAt) assert.ok(!("askedAt" in row), `${label}: no askedAt key`);
          });
        }
      },
    },
    {
      name: "131/04 task04 — the act face leaves a waiting run alone, and only a waiting one (two rows)",
      run: async () => {
        await withSweepWorld(async ({ ctx, item }) => {
          const runId = await waitingRun(item);
          await heartbeat(item, runId, { now: "2026-08-05T23:59:30.000Z" });
          await parkRunAsk(item, runId, { now: "2026-08-05T22:00:00.000Z" });
          const before = await readFile(runRecordPath(item, runId), "utf8");
          const error = await expectCode(() => invoke("work:resume", { ref: "348", now: SWEEP_NOW }, ctx), "no-retryable-run");
          assert.equal(error.status, 409);
          assert.equal((await readRuns(item)).length, 1, "348 has one run");
          assert.equal(await readFile(runRecordPath(item, runId), "utf8"), before, "R's record is byte-unchanged");
        });
        await withSweepWorld(async ({ ctx, item }) => {
          const runId = await waitingRun(item);
          await answerRunAsk(item, runId, { answer: "b", by: { actor: "you", via: "cli", node: null }, now: "2026-08-05T21:10:00.000Z" });
          await rewriteRecord(item, runId, (record) => ({ ...record, heartbeatAt: "2026-08-05T00:00:00.000Z", updatedAt: "2026-08-05T21:10:00.000Z" }));
          const resumed = await invoke("work:resume", { ref: "348", now: SWEEP_NOW }, ctx);
          assert.equal(resumed.resumed, true);
          assert.deepEqual(resumed.reclaimed, [runId], "R is reclaimed first");
          assert.equal(resumed.attempt, 2, "and attempt 2 resumes — today's path");
        });
      },
    },
  ];
}
