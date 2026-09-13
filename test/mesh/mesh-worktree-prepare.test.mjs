// Traceability wiring for milestone 72 / story 04 —
// tasks/00_a-worktree-is-prepared-through-the-declared-program.feature.
//
// One test object per @executable scenario (Scenario-Outline rows folded into one entry), driven
// against the REAL doors in `src/mesh/worktree.mjs` with the module's own two seams injected: the
// `options.exec` git seam it already had, and the bounded-launch seam the prepare step goes through.
// No git binary, no network, no real install — and the SAME code path production takes.
//
// task 01's scenarios are FF-7207's (`test/arch/assignment/acd-worktree-never-linked.test.mjs`), where its row
// declares them.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  WORKTREE_PREPARE_DEADLINE_EXPIRED,
  WORKTREE_PREPARE_FAILED,
  WORKTREE_PREPARE_NOT_STARTED,
  addDispatchWorktree,
  addSessionWorktree,
  addWorktree,
  meshWorktreePath,
  reuseWorktreeOnBranch,
} from "../../src/mesh/worktree.mjs";

// A declaration that compiles: `node` resolves on every machine this suite runs on, which is what
// makes the "command resolving nowhere" row below a real contrast rather than a stub's opinion.
const DECLARED = Object.freeze({ command: process.execPath, args: ["--version"], deadlineMs: 60_000 });

const configWith = (prepare) => (prepare === undefined ? { work: {} } : { work: { worktree: { prepare } } });

// The git seam, faked — and it MATERIALISES the directory on an `add`, because "the prepare runs
// after the worktree exists" is a claim about ordering that a seam which created nothing could not
// witness.
function gitSeam({ addStatus = 0 } = {}) {
  const calls = [];
  const exec = async (args) => {
    calls.push(args);
    if (args[0] === "worktree" && args[1] === "add") {
      if (addStatus !== 0) return { stdout: "", stderr: "add refused", status: addStatus };
      await mkdir(args.find((arg) => arg.includes(`${path.sep}worktrees`) || arg.includes("/worktrees")) ?? args.at(-2), { recursive: true });
      return { stdout: "", stderr: "", status: 0 };
    }
    return { stdout: "", stderr: "", status: 0 };
  };
  return { exec, calls };
}

// The bounded-launch seam, faked. It records what it was handed — the program, the argv, the
// working directory and the deadline — and returns whichever of `runBounded`'s three outcomes the
// row is about.
function launchSeam({ outcome = "exited", exitCode = 0, stdout = "installed", stderr = "" } = {}) {
  const seen = [];
  const launch = async (request) => {
    seen.push({ ...request, existedWhenLaunched: existsSync(request.cwd) });
    return {
      outcome,
      command: request.command,
      args: request.args,
      attempted: `${request.command} ${request.args.join(" ")}`,
      deadlineMs: request.deadlineMs,
      exitCode: outcome === "exited" ? exitCode : null,
      stdout,
      stderr,
      error: outcome === "not-started" ? "spawn ENOENT" : undefined,
    };
  };
  return { launch, seen };
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-72-04-"));
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

// The four doors, so every row that claims "at EVERY door" is driven at all four rather than at the
// one the first draft of ADR-007 §1 named.
const DOORS = Object.freeze([
  { label: "addWorktree (assignment, fresh)", open: (root, options) => addWorktree(root, "a1", "HEAD", options) },
  { label: "reuseWorktreeOnBranch (assignment, continuing — the dominant path)", open: (root, options) => reuseWorktreeOnBranch(root, "a1", "aof/item-72-04", options) },
  { label: "addSessionWorktree (session)", open: (root, options) => addSessionWorktree(root, "72/04", "HEAD", options) },
  { label: "addDispatchWorktree (dispatch)", open: (root, options) => addDispatchWorktree(root, "72/04", "HEAD", options) },
]);

const rejection = async (promise) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
};

export const meshWorktreePrepareTests = [
  {
    name: "72/04 task 00 (mesh-worktree): a declared prepare step runs inside the new worktree, after it exists, at every door",
    async run() {
      for (const door of DOORS) {
        const { root, cleanup } = await fixture();
        try {
          const git = gitSeam();
          const seam = launchSeam();
          const worktreePath = await door.open(root, { exec: git.exec, launch: seam.launch, loadWorkspace: async () => ({ config: configWith(DECLARED) }) });

          assert.equal(seam.seen.length, 1, `${door.label}: the prepare step ran exactly once`);
          assert.equal(seam.seen[0].cwd, worktreePath, `${door.label}: with the worktree as its working directory`);
          assert.equal(seam.seen[0].existedWhenLaunched, true, `${door.label}: and it ran AFTER the worktree existed`);
          assert.equal(seam.seen[0].command, DECLARED.command, `${door.label}: launching the declared program`);
          assert.deepEqual(seam.seen[0].args, [...DECLARED.args], `${door.label}: with the declared arguments`);
          assert.ok(git.calls.some((args) => args[0] === "worktree" && args[1] === "add"), `${door.label}: the tree was actually added`);
        } finally {
          await cleanup();
        }
      }
    },
  },

  {
    name: "72/04 task 00 (mesh-worktree): the prepare step goes through the one bounded seam, with a deadline armed from the declaration",
    async run() {
      const { root, cleanup } = await fixture();
      try {
        const git = gitSeam();
        const seam = launchSeam();
        await addWorktree(root, "a1", "HEAD", { exec: git.exec, launch: seam.launch, loadWorkspace: async () => ({ config: configWith({ ...DECLARED, deadlineMs: 12_345 }) }) });

        // The bound comes from the DECLARATION, never from the seam's own default — that gap is
        // measured elsewhere in this milestone at 60 s against a suite that needs 900 s, and a bound
        // nobody chose fails a run nobody can see the cause of.
        assert.equal(seam.seen.length, 1, "the step went through the injected bounded seam");
        assert.equal(seam.seen[0].deadlineMs, 12_345, "…with the declaration's own deadline armed");
        assert.ok(Array.isArray(seam.seen[0].args), "…and an argument vector, never a shell string");
        assert.equal(seam.seen[0].shell, undefined, "…with no shell option, ever");
      } finally {
        await cleanup();
      }
    },
  },

  {
    name: "72/04 task 00 (mesh-worktree): what each declaration shape launches, and what it says when it launches nothing",
    async run() {
      const rows = [
        { label: "complete — a command, arguments and a deadline", prepare: DECLARED, launches: true, code: null },
        { label: "absent entirely", prepare: undefined, launches: false, code: null },
        { label: "present but naming no command", prepare: { args: [], deadlineMs: 1000 }, launches: false, code: "worktree-prepare-declaration-invalid" },
        { label: "present, its deadline absent", prepare: { command: process.execPath, args: [] }, launches: false, code: "worktree-prepare-declaration-invalid" },
        { label: "present, its deadline zero", prepare: { command: process.execPath, args: [], deadlineMs: 0 }, launches: false, code: "worktree-prepare-declaration-invalid" },
        { label: "present, its deadline negative", prepare: { command: process.execPath, args: [], deadlineMs: -1 }, launches: false, code: "worktree-prepare-declaration-invalid" },
        { label: "present, its arguments not a list", prepare: { command: process.execPath, args: "install", deadlineMs: 1000 }, launches: false, code: "worktree-prepare-declaration-invalid" },
        { label: "present, its command resolving nowhere", prepare: { command: "a-program-no-machine-has", args: [], deadlineMs: 1000 }, launches: false, code: "worktree-prepare-unresolvable" },
      ];

      for (const row of rows) {
        const { root, cleanup } = await fixture();
        try {
          const git = gitSeam();
          const seam = launchSeam();
          const options = { exec: git.exec, launch: seam.launch, loadWorkspace: async () => ({ config: configWith(row.prepare) }) };
          const error = await rejection(addWorktree(root, "a1", "HEAD", options));

          assert.equal(seam.seen.length, row.launches ? 1 : 0, `${row.label}: ${row.launches ? "the declared program is launched once" : "nothing is launched"}`);

          if (row.code == null) {
            assert.equal(error, null, `${row.label}: no error and no warning is raised`);
          } else {
            assert.ok(error != null, `${row.label}: a coded refusal is raised`);
            assert.equal(error.code, row.code, `${row.label}: with its own code`);
            // ABSENT AND MALFORMED MUST NOT RENDER IDENTICALLY — that is the gap where a typo
            // becomes an invisible non-install, and it is why the absent row above raises nothing
            // at all while every row here raises something named.
            assert.ok(typeof error.message === "string" && error.message.length > 0, `${row.label}: naming what is wrong`);
          }
        } finally {
          await cleanup();
        }
      }

      // …and the two invalid answers are told apart: a command that is MISSING and a command that
      // RESOLVES NOWHERE are two different repairs.
      assert.notEqual(
        rows.find((row) => row.label.includes("naming no command")).code,
        rows.find((row) => row.label.includes("resolving nowhere")).code,
        "a missing command and an unresolvable one carry different codes",
      );

      // NO SHAPE YIELDS A RUN WITH NO BOUND, and the bound applied is named in what the observer is
      // handed — which is the only place it could be read from, the doors returning a bare path.
      const { root, cleanup } = await fixture();
      try {
        const observed = [];
        await addWorktree(root, "a1", "HEAD", {
          exec: gitSeam().exec,
          launch: launchSeam().launch,
          onPrepare: (report) => observed.push(report),
          loadWorkspace: async () => ({ config: configWith(DECLARED) }),
        });
        assert.equal(observed.length, 1, "the result reports the run's own outcome through the observer");
        assert.equal(observed[0].deadlineMs, DECLARED.deadlineMs, "…and the bound applied is named in it");
        assert.equal(observed[0].outcome, "exited", "…beside the outcome");
      } finally {
        await cleanup();
      }
    },
  },

  {
    name: "72/04 task 00 (mesh-worktree): the outcome each prepare run reports, and whether the tree is handed over as ready",
    async run() {
      const rows = [
        { label: "completes with exit status zero", seam: { outcome: "exited", exitCode: 0 }, code: null },
        { label: "completes with a non-zero exit status", seam: { outcome: "exited", exitCode: 7 }, code: WORKTREE_PREPARE_FAILED },
        { label: "is killed at its deadline", seam: { outcome: "deadline-expired" }, code: WORKTREE_PREPARE_DEADLINE_EXPIRED },
        { label: "never starts", seam: { outcome: "not-started" }, code: WORKTREE_PREPARE_NOT_STARTED },
      ];

      for (const row of rows) {
        const { root, cleanup } = await fixture();
        try {
          const git = gitSeam();
          const seam = launchSeam({ ...row.seam, stdout: "npm output here", stderr: "npm complaint here" });
          const error = await rejection(addWorktree(root, "a1", "HEAD", {
            exec: git.exec,
            launch: seam.launch,
            loadWorkspace: async () => ({ config: configWith(DECLARED) }),
          }));

          const removals = git.calls.filter((args) => args[0] === "worktree" && args[1] === "remove");
          if (row.code == null) {
            assert.equal(error, null, `${row.label}: no prepare outcome beyond the ordinary success`);
            assert.deepEqual(removals, [], `${row.label}: and the tree is reported ready`);
            continue;
          }

          assert.ok(error != null, `${row.label}: the assignment carries a coded outcome`);
          assert.equal(error.code, row.code, `${row.label}: naming this outcome and no other`);

          // THE TREE IS NOT HANDED OVER AS READY. Two shipped callers key on the directory
          // EXISTING — the deliberate lost-the-race reader — so a throw that left the
          // half-installed tree on disk would be read as ready by both, in files this story
          // cannot edit. It is removed through git's own verb, forced, and only then thrown.
          assert.equal(removals.length, 1, `${row.label}: the half-installed tree is removed`);
          assert.deepEqual(removals[0], ["worktree", "remove", "--force", meshWorktreePath(root, "a1")], `${row.label}: through git's own verb, never a filesystem delete`);
          assert.equal(existsSync(meshWorktreePath(root, "a1")), true, `${row.label}: (the fake git seam does not unlink, so the assertion above is about the CALL rather than about the disk)`);

          // …and the diagnosis survives the tree that carried it, which is the price of removing it.
          assert.ok(error.message.includes("npm output here"), `${row.label}: the prepare's stdout rides the thrown message`);
          assert.ok(error.message.includes("npm complaint here"), `${row.label}: and its stderr`);
        } finally {
          await cleanup();
        }
      }

      // THE THREE FAILING OUTCOMES ARE TOLD APART BY THREE DISTINCT CODES, never folded into one:
      // "it failed", "it ran out of time" and "it never started" are three different repairs.
      const codes = new Set([WORKTREE_PREPARE_FAILED, WORKTREE_PREPARE_DEADLINE_EXPIRED, WORKTREE_PREPARE_NOT_STARTED]);
      assert.equal(codes.size, 3, "three outcomes, three codes");
    },
  },

  {
    name: "72/04 task 00 (mesh-worktree): the doors still return a bare path, and a git failure is still the git failure",
    async run() {
      // ADR-007 §4a — the outcome is surfaced through an observer, NEVER by widening the return
      // type: all four doors return a bare path string and three callers outside this story's write
      // set consume it as one.
      const { root, cleanup } = await fixture();
      try {
        for (const door of DOORS) {
          const returned = await door.open(root, { exec: gitSeam().exec, launch: launchSeam().launch, loadWorkspace: async () => ({ config: configWith(DECLARED) }) });
          assert.equal(typeof returned, "string", `${door.label}: returns a bare path string`);
          assert.ok(returned.length > 0, `${door.label}: …a non-empty one`);
        }

        // …and routing the reuse door through the shared choke point left its own coded fault
        // intact, which is what makes the routing invisible to every existing caller.
        const failing = gitSeam({ addStatus: 1 });
        const reuse = await rejection(reuseWorktreeOnBranch(root, "a1", "aof/item-72-04", { exec: failing.exec, launch: launchSeam().launch, loadWorkspace: async () => ({ config: configWith(DECLARED) }) }));
        assert.equal(reuse?.code, "worktree-reuse-failed", "the reuse door still throws its own code");
        assert.ok(reuse.message.startsWith('git worktree add (reuse branch "aof/item-72-04") failed for assignment "a1"'), `…with its own message, byte-unchanged: ${reuse.message}`);

        const fresh = await rejection(addWorktree(root, "a1", "HEAD", { exec: gitSeam({ addStatus: 1 }).exec, launch: launchSeam().launch, loadWorkspace: async () => ({ config: configWith(DECLARED) }) }));
        assert.equal(fresh?.code, "worktree-add-failed", "…and the plain add door still throws its own");

        // A git failure means NO tree was created, so nothing is removed and no prepare runs.
        const quiet = launchSeam();
        const git = gitSeam({ addStatus: 1 });
        await rejection(addWorktree(root, "a1", "HEAD", { exec: git.exec, launch: quiet.launch, loadWorkspace: async () => ({ config: configWith(DECLARED) }) }));
        assert.equal(quiet.seen.length, 0, "a failed add prepares nothing");
        assert.deepEqual(git.calls.filter((args) => args[1] === "remove"), [], "…and removes nothing it did not create");
      } finally {
        await cleanup();
      }
    },
  },
];
