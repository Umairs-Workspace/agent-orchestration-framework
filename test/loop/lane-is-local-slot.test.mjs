// Traceability wiring for 69/04 task 02: the local slot is git's dispatch lane.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dispatchCommand } from "../../src/commands/dispatch.mjs";
import {
  cleanupDispatchLane,
  dispatchLaneOccupiesSlot,
  inspectDispatchLaneAdmission,
  inspectDispatchLanes,
  resolveDispatchLane,
  sweepDispatchLanes,
} from "../../src/work/dispatch.mjs";
import { meshDispatchWorktreePath, meshWorktreePath } from "../../src/mesh/worktree.mjs";
import { acquireMeshLauncherLock } from "../../src/mesh/launcher-lock.mjs";
import { withDispatchRepo, git } from "../support/dispatch-lane-fixture.mjs";

const ws = (root, bound) => ({ projectRoot: root, config: { work: { dispatch: { concurrency: bound } } } });
const refused = (entry) => entry?.outcome === "refused" && entry?.code === "dispatch-capacity-full";
const codeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function spawnDispatchProcess(root, refs, bound, { marker = "", delayMs = 0 } = {}) {
  const script = `
    import path from "node:path";
    import { writeFile } from "node:fs/promises";
    import { pathToFileURL } from "node:url";
    const root = process.env.AOF_TEST_PROJECT_ROOT;
    const code = process.env.AOF_TEST_CODE_ROOT;
    const { dispatchCommand } = await import(pathToFileURL(path.join(code, "src", "commands", "dispatch.mjs")));
    const { resolveDispatchLane } = await import(pathToFileURL(path.join(code, "src", "work", "dispatch.mjs")));
    let opened = 0;
    const result = await dispatchCommand.run({ refs: JSON.parse(process.env.AOF_TEST_REFS) }, {
      workspace: { projectRoot: root, config: { work: { dispatch: { concurrency: Number(process.env.AOF_TEST_BOUND) } } } },
      runDispatchLane: async (member) => {
        const lane = await resolveDispatchLane(root, member.ref);
        opened += 1;
        if (opened === 1 && process.env.AOF_TEST_MARKER) await writeFile(process.env.AOF_TEST_MARKER, "opened\\n", "utf8");
        const delay = Number(process.env.AOF_TEST_DELAY_MS);
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        return lane;
      },
    });
    process.stdout.write(JSON.stringify(result));
  `;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
    cwd: root,
    windowsHide: true,
    env: {
      ...process.env,
      AOF_TEST_PROJECT_ROOT: root,
      AOF_TEST_CODE_ROOT: codeRoot,
      AOF_TEST_REFS: JSON.stringify(refs),
      AOF_TEST_BOUND: String(bound),
      AOF_TEST_MARKER: marker,
      AOF_TEST_DELAY_MS: String(delayMs),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += String(chunk); });
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  return {
    child,
    done: new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", (code) => code === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(`dispatch child exited ${code}: ${stderr}`)));
    }),
  };
}

// The deadline is a LIVENESS guard, not a performance assertion: it exists so a child that
// never opens a lane fails loudly instead of hanging the suite. 5000ms made it a performance
// assertion by accident — the child has to boot node and dynamically import two src/ modules
// before it can write the marker, and under load that exceeded five seconds (measured
// 2026-08-24, VERIFICATION F-69-V22: `timed out waiting for …/.first-lane-opened` at 14
// concurrent workers). A longer deadline costs a healthy run nothing, because the wait ends
// on the marker appearing, never on the clock.
async function waitForPath(target, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(target)) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${target}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function exitedProcessPid() {
  const child = spawn(process.execPath, ["-e", "process.exit(0)"], { windowsHide: true, stdio: "ignore" });
  const pid = child.pid;
  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", resolve);
  });
  return pid;
}

async function injectedDispatch({ refs, bound, occupied, existingRefs = [], holders = [] }) {
  const opened = [];
  const result = await dispatchCommand.run({ refs }, {
    workspace: ws("/not-used", bound),
    withDispatchAdmissionLock: (operation) => operation(),
    inspectDispatchLaneAdmission: async () => ({ occupied, existingRefs: new Set(existingRefs), holders }),
    runDispatchLane: async (member) => {
      opened.push(member.ref);
      const reused = existingRefs.includes(member.ref);
      return { ref: member.ref, worktree: `/tree/${member.ref.replace("/", "-")}`, branch: `aof/mesh/${member.ref.replace("/", "-")}`, created: !reused, reused };
    },
  });
  return { result, opened };
}

export const laneIsLocalSlotTests = [
  {
    name: "69/04 task 02: a machine at its lane bound refuses the next dispatch and leaves the ref ready",
    run: () => withDispatchRepo(async ({ root, milestoneDir }) => {
      await dispatchCommand.run({ ref: "53/00" }, { workspace: ws(root, 1) });
      const story = path.join(milestoneDir, "stories", "01_story_s01", "STORY.md");
      const before = await readFile(story, "utf8");
      const answer = await dispatchCommand.run({ ref: "53/01" }, { workspace: ws(root, 1) });
      assert.equal(answer.outcome, "refused");
      assert.equal(answer.code, "dispatch-capacity-full");
      assert.equal(existsSync(meshDispatchWorktreePath(root, "53/01")), false);
      assert.equal(await readFile(story, "utf8"), before, "refusal does not consume or mutate the ready ref");
    }),
  },
  {
    name: "69/04 task 02: a capacity refusal leaves no lane or cleanup residue",
    run: () => withDispatchRepo(async ({ root }) => {
      await dispatchCommand.run({ ref: "53/00" }, { workspace: ws(root, 1) });
      const before = (await inspectDispatchLaneAdmission(root, ["53/00", "53/01"])).occupied;
      await dispatchCommand.run({ ref: "53/01" }, { workspace: ws(root, 1) });
      const after = await inspectDispatchLaneAdmission(root, ["53/00", "53/01"]);
      assert.equal(after.occupied, before);
      assert.equal(after.holders.some((lane) => lane.ref === "53/01"), false);
    }),
  },
  {
    name: "69/04 task 02: re-dispatching an existing lane is admitted at the bound without a second slot",
    run: () => withDispatchRepo(async ({ root }) => {
      const first = await dispatchCommand.run({ ref: "53/00" }, { workspace: ws(root, 1) });
      const again = await dispatchCommand.run({ ref: "53/00" }, { workspace: ws(root, 1) });
      assert.equal(again.outcome, undefined);
      assert.equal(again.reused, true);
      assert.equal(again.worktree, first.worktree);
      assert.equal((await inspectDispatchLaneAdmission(root, ["53/00"])).occupied, 1);
    }),
  },
  {
    name: "69/04 task 02: every same-request lane joins the count before the next member; all remaining members are refused",
    run: async () => {
      const { result, opened } = await injectedDispatch({ refs: ["69/00", "69/01", "69/02", "69/03"], bound: 2, occupied: 0 });
      assert.deepEqual(opened, ["69/00", "69/01"]);
      assert.deepEqual(result.dispatched.map((entry) => entry.outcome ?? "opened"), ["opened", "opened", "refused", "refused"]);
      assert.ok(result.dispatched.slice(2).every(refused));
    },
  },
  {
    name: "69/04 task 02: refusal is a coded per-member answer, admitted siblings keep lanes, and the request succeeds",
    run: async () => {
      const { result } = await injectedDispatch({ refs: ["69/00", "69/01", "69/02"], bound: 2, occupied: 0 });
      assert.ok(result.dispatched.slice(0, 2).every((entry) => entry.ok && entry.value.worktree));
      assert.equal(result.dispatched[2].ok, true);
      assert.equal(result.dispatched[2].code, "dispatch-capacity-full");
      assert.equal(dispatchCommand.cli.exit(result), 0);
    },
  },
  {
    name: "69/04 task 02: cleaning a finished lane returns capacity to the next ref",
    run: () => withDispatchRepo(async ({ root }) => {
      await dispatchCommand.run({ ref: "53/00" }, { workspace: ws(root, 1) });
      assert.equal((await cleanupDispatchLane(root, "53/00")).outcome, "removed");
      const next = await dispatchCommand.run({ ref: "53/01" }, { workspace: ws(root, 1) });
      assert.equal(next.created, true);
    }),
  },
  {
    name: "69/04 task 02: an abandoned lane holds capacity and the refusal names its holder and last activity",
    run: () => withDispatchRepo(async ({ root }) => {
      await dispatchCommand.run({ ref: "53/00" }, { workspace: ws(root, 1) });
      const next = await dispatchCommand.run({ ref: "53/01" }, { workspace: ws(root, 1) });
      assert.equal(next.outcome, "refused");
      assert.equal(next.holders.length, 1);
      assert.equal(next.holders[0].branch, "aof/mesh/53-00", "git's branch names the lane even when the fresh request did not enumerate its ref");
      assert.equal(typeof next.holders[0].lastActivityAt, "string");
      assert.match(dispatchCommand.cli.render(next), /aof\/mesh\/53-00.*20\d\d/u);
    }),
  },
  {
    name: "69/04 task 02: sweeping a clean stranded lane returns its capacity",
    run: () => withDispatchRepo(async ({ root }) => {
      await dispatchCommand.run({ ref: "53/00" }, { workspace: ws(root, 1) });
      const swept = await sweepDispatchLanes(root, ["53/00", "53/01"], { remove: true });
      assert.deepEqual(swept.removed.map((lane) => lane.ref), ["53/00"]);
      assert.equal((await dispatchCommand.run({ ref: "53/01" }, { workspace: ws(root, 1) })).created, true);
    }),
  },
  ...[
    { label: "holding uncommitted work", attributable: true },
    { label: "this workspace cannot attribute to any ref", attributable: false },
  ].map(({ label, attributable }) => ({
    name: `69/04 task 02 kept-lane outline [${label}]: sweep keeps it and capacity remains held`,
    run: () => withDispatchRepo(async ({ root }) => {
      const lane = await dispatchCommand.run({ ref: "53/00" }, { workspace: ws(root, 1) });
      if (attributable) await writeFile(path.join(lane.worktree, "uncommitted.txt"), "held\n", "utf8");
      const swept = await sweepDispatchLanes(root, attributable ? ["53/00"] : [], { remove: true });
      assert.equal(swept.removed.length, 0);
      assert.equal(swept.kept.length, 1);
      const next = await dispatchCommand.run({ ref: "53/01" }, { workspace: ws(root, 1) });
      assert.equal(next.outcome, "refused");
    }),
  })),
  ...[
    ["actively changing files", "working", true],
    ["quiet, having changed nothing for an hour", "quiet", true],
    ["quiet, with uncommitted work in it", "quiet", true],
    ["quiet, with nothing uncommitted in it", "quiet", true],
    ["freshly opened, having produced nothing yet", "quiet", true],
    ["whose ref this workspace cannot name", "quiet", true],
    ["whose directory has been deleted underneath it", "prunable", false],
    ["reported by git as prunable", "prunable", false],
  ].map(([label, state, treatment]) => ({
    name: `69/04 task 02 occupied-lane outline [${label}] -> ${treatment ? "holds a slot" : "holds no slot"}`,
    run: state !== "prunable"
      ? () => assert.equal(dispatchLaneOccupiesSlot({ state, dirty: label.includes("uncommitted") }), treatment)
      : () => withDispatchRepo(async ({ root }) => {
          const lane = await dispatchCommand.run({ ref: "53/00" }, { workspace: ws(root, 1) });
          await rm(lane.worktree, { recursive: true, force: true });
          const listed = await inspectDispatchLanes(root, ["53/00"]);
          assert.equal(listed[0]?.state, "prunable", "real git reports the missing tree as prunable");
          assert.equal((await inspectDispatchLaneAdmission(root, ["53/00"])).occupied, 0);
          if (label === "reported by git as prunable") {
            assert.match((await git(["worktree", "list", "--porcelain"], root)).stdout, /prunable/u);
          }
        }),
  })),
  ...[
    [0, 1, true], [1, 1, false], [2, 3, true], [3, 3, false], [4, 3, false],
  ].map(([open, bound, admitted]) => ({
    name: `69/04 task 02 bound-edge outline [open=${open}, bound=${bound}] -> ${admitted ? "admitted" : "refused as at capacity"}`,
    run: async () => {
      const holders = Array.from({ length: open }, (_, index) => ({ ref: `held/${index}`, state: "quiet" }));
      const { result, opened } = await injectedDispatch({ refs: ["69/new"], bound, occupied: open, holders });
      const answer = result.action === "open" ? result : result.dispatched[0];
      assert.equal(refused(answer), !admitted);
      assert.equal(opened.length, admitted ? 1 : 0);
      assert.equal(holders.length, open, "admission removes no existing lane");
    },
  })),
  ...[
    [3, 3, 2, 1, 0, 1],
    [3, 3, 3, 0, 0, 0],
    [2, 3, 1, 2, 1, 1],
    [0, 2, 0, 3, 2, 1],
    [4, 3, 1, 1, 0, 1],
  ].map(([open, bound, reused, fresh, openedExpected, refusedExpected]) => ({
    name: `69/04 task 02 mixed-request outline [open=${open}, bound=${bound}, reused=${reused}, fresh=${fresh}] -> opened=${openedExpected}, refused=${refusedExpected}`,
    run: () => withDispatchRepo(async ({ root }) => {
      const openRefs = Array.from({ length: open }, (_, index) => `53/${String(index).padStart(2, "0")}`);
      for (const ref of openRefs) await resolveDispatchLane(root, ref);
      const reusedRefs = openRefs.slice(0, reused);
      const freshRefs = Array.from({ length: fresh }, (_, index) => `53/${String(open + index).padStart(2, "0")}`);
      const result = await dispatchCommand.run({ refs: [...reusedRefs, ...freshRefs] }, { workspace: ws(root, bound) });
      assert.ok(result.dispatched.slice(0, reused).every((entry) => entry.ok && entry.value.reused));
      assert.equal(result.dispatched.filter((entry) => entry.value?.created).length, openedExpected);
      assert.equal(result.dispatched.filter(refused).length, refusedExpected);
      assert.equal((await inspectDispatchLaneAdmission(root, [...openRefs, ...freshRefs])).occupied, open + openedExpected);
    }),
  })),
  {
    name: "69/04 task 02: independent dispatch processes observe inspect-plan-materialise atomically",
    run: () => withDispatchRepo(async ({ root }) => {
      const marker = path.join(root, ".first-lane-opened");
      const first = spawnDispatchProcess(root, ["53/00", "53/01"], 2, { marker, delayMs: 150 });
      await waitForPath(marker);
      const second = spawnDispatchProcess(root, ["53/02"], 2);
      const [firstResult, secondResult] = await Promise.all([first.done, second.done]);
      assert.equal(firstResult.dispatched.filter((entry) => entry.value?.created).length, 2);
      assert.equal(secondResult.action, "open");
      assert.equal(secondResult.outcome, "refused", "the second process waited and saw both lanes, never a partial snapshot");
      assert.equal((await inspectDispatchLaneAdmission(root, ["53/00", "53/01", "53/02"])).occupied, 2);
    }),
  },
  {
    name: "69/04 task 02: concurrent dispatch stays bounded while recovering a real dead-owner admission lock",
    run: () => withDispatchRepo(async ({ root }) => {
      const stale = await acquireMeshLauncherLock({
        paths: { meshRoot: path.join(root, ".git") },
        lockName: "aof-dispatch-admission.lock",
        pid: await exitedProcessPid(),
      });
      assert.equal(stale.acquired, true, "fixture owns the same repository-scoped lock production dispatch uses");

      const marker = path.join(root, ".reclaimed-first-lane-opened");
      const first = spawnDispatchProcess(root, ["53/00", "53/01"], 2, { marker, delayMs: 150 });
      await waitForPath(marker);
      await Promise.all(Array.from({ length: 8 }, () => stale.release()));
      const second = spawnDispatchProcess(root, ["53/02"], 2);
      const [firstResult, secondResult] = await Promise.all([first.done, second.done]);
      assert.equal(firstResult.dispatched.filter((entry) => entry.value?.created).length, 2);
      assert.equal(secondResult.outcome, "refused", "the successor lock survived stale releases and exposed the complete first request");
      assert.equal((await inspectDispatchLaneAdmission(root, ["53/00", "53/01", "53/02"])).occupied, 2);
    }),
  },
  {
    name: "69/04 task 02: occupancy inspection fails closed when git cannot list worktrees",
    async run() {
      const unavailable = Object.assign(new Error("git unavailable"), { code: "EACCES" });
      await assert.rejects(
        () => inspectDispatchLaneAdmission("/not-used", ["53/00"], { exec: async () => { throw unavailable; } }),
        (error) => error === unavailable,
      );
    },
  },
  {
    name: "69/04 task 02: the command labels its concurrency figure as lane materialisation",
    run: async () => {
      const { result } = await injectedDispatch({ refs: ["69/00", "69/01"], bound: 2, occupied: 0 });
      assert.equal(result.peakKind, "lane-materialisation");
      assert.match(dispatchCommand.cli.render(result), /lane-materialisation peak/u);
    },
  },
  {
    name: "69/04 task 02: deciding room writes only admitted lanes and leaves run bytes untouched",
    run: () => withDispatchRepo(async ({ root }) => {
      const runRecord = path.join(root, "run-record-sentinel.json");
      await writeFile(runRecord, '{"state":"running"}\n', "utf8");
      const before = await readFile(runRecord, "utf8");
      const result = await dispatchCommand.run({ refs: ["53/00", "53/01"] }, { workspace: ws(root, 1) });
      assert.equal(result.dispatched.filter((entry) => entry.value?.created).length, 1);
      assert.equal(await readFile(runRecord, "utf8"), before);
    }),
  },
  {
    name: "69/04 task 02: a mesh assignment tree is excluded from local lane capacity",
    run: () => withDispatchRepo(async ({ root }) => {
      const assignmentTree = meshWorktreePath(root, "assignment-1");
      await mkdir(path.dirname(assignmentTree), { recursive: true });
      const added = await git(["worktree", "add", "-b", "aof/mesh/53-00", assignmentTree, "HEAD"], root);
      assert.equal(added.status, 0);
      const admission = await inspectDispatchLaneAdmission(root, ["53/00"]);
      assert.equal(admission.occupied, 0);
      assert.equal(admission.existingRefs.has("53/00"), true);
      assert.equal((await inspectDispatchLanes(root, ["53/00"])).length, 0);
    }),
  },
  {
    name: "69/04 task 02: a ref already working in a mesh assignment tree is admitted at the local bound without opening a local lane",
    run: () => withDispatchRepo(async ({ root }) => {
      await dispatchCommand.run({ ref: "53/01" }, { workspace: ws(root, 1) });
      const assignmentTree = meshWorktreePath(root, "assignment-1");
      await mkdir(path.dirname(assignmentTree), { recursive: true });
      assert.equal((await git(["worktree", "add", "-b", "aof/mesh/53-00", assignmentTree, "HEAD"], root)).status, 0);
      const answer = await dispatchCommand.run({ ref: "53/00" }, { workspace: ws(root, 1) });
      assert.equal(answer.reused, true);
      assert.equal(answer.worktree, path.resolve(assignmentTree));
      assert.equal(existsSync(meshDispatchWorktreePath(root, "53/00")), false);
    }),
  },
];
