// chore 103 — `work doctor` reported health over a stream it could not see.
//
// THE FAILURE, measured at 78's gate (F-78-K): the same ref, on the same tree, answered
// 8 findings and `Loop-Ready: 70% (7/10)` from the repo root and `healthy — 78 is
// coherent.` with `Loop-Ready: 50% (2/4)` from any subdirectory. `aof:verify` step 4 names
// doctor as the check to read before setting `status: done`, so this is a false green in
// the one instrument the acceptance gate trusts — and it nearly landed an acceptance.
//
// THE CAUSE was one directory up from doctor: `findProjectConfig` answered only for the
// literal directory handed to it, so from `src/` it invented `src/.aof/aof.config.json`,
// `loadWorkspace` took `src/` as the project root, and `work.dir` resolved to
// `src/wiki/work` — a directory that does not exist. Every check group then correctly
// produced nothing over zero items. Fixed at that SHARED resolution site, so every reader
// of a workspace path is cwd-independent, not doctor alone.
//
// These tests pin BOTH halves, and the belt-and-braces third:
//   1. the same ref, doctored from three working directories, answers identically —
//      driven through the REAL CLI with a real `cwd`, because a cwd-derived path is
//      exactly what an injected directory would paper over;
//   2. discovery walks UP to the enclosing project, and stops short of the global AOF
//      home (which is an ANCESTOR of ordinary working directories — `os.tmpdir()` on
//      Windows lives under `~` — so an unbounded walk adopts aof's own config as a
//      project);
//   3. a scan that finds ZERO items is an error naming the directory it looked in and a
//      non-zero exit, never a pass: an empty result and a clean result must stop
//      rendering identically (78/RETROSPECTIVE R4).
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSyncHardened } from "../support/cli-spawn.mjs";
import { findProjectConfig, workspacePaths } from "../../src/workspace.mjs";
import { loadWorkspace } from "../../src/work.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

// Three days back — the same relative-date discipline doctor-command-core.test.mjs uses,
// so the freshness group stays inert instead of aging red a month after this is written.
const FIXTURE_DATE = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const FIXTURE_MTIME = new Date(Date.parse(FIXTURE_DATE + "T00:00:00Z"));

function frontmatter(fields) {
  return `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n`;
}

async function pin(dir, names) {
  for (const name of names) {
    try {
      await utimes(path.join(dir, name), FIXTURE_MTIME, FIXTURE_MTIME);
    } catch {
      // best-effort — a missing file is simply not pinned
    }
  }
}

// A repo whose stream holds ONE milestone + ONE story, plus the two nested directories a
// person actually types from: a source dir, and a work-item folder inside the stream.
async function fixtureRepo({ withStream = true } = {}) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-chore103-"));
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2),
    "utf8",
  );
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(workDir, { recursive: true });
  await mkdir(path.join(repo, "src", "nested"), { recursive: true });

  if (!withStream) return { repo, workDir, itemDir: null };

  const itemDir = path.join(workDir, "07_milestone_alpha");
  await mkdir(itemDir, { recursive: true });
  await writeFile(
    path.join(itemDir, "SPEC.md"),
    frontmatter({
      type: "milestone",
      number: "07",
      slug: "alpha",
      status: "in-progress",
      title: '"Alpha"',
      created: FIXTURE_DATE,
      updated: FIXTURE_DATE,
    }) + "# 07 · Alpha\n",
    "utf8",
  );
  await writeFile(path.join(itemDir, "ARCHITECTURE.md"), "# Architecture\n\nADR-000.\n", "utf8");

  const storyDir = path.join(itemDir, "stories", "00_story_spine");
  await mkdir(path.join(storyDir, "tasks"), { recursive: true });
  await writeFile(
    path.join(storyDir, "STORY.md"),
    frontmatter({
      type: "story",
      number: "00",
      slug: "spine",
      status: "in-progress",
      title: '"Spine"',
      parent: "7",
      created: FIXTURE_DATE,
      updated: FIXTURE_DATE,
    }) + "# 00 · Spine\n",
    "utf8",
  );
  await writeFile(path.join(storyDir, "tasks", "00_task.feature"), "@executable\nFeature: fixture\n", "utf8");

  // A typo'd story folder — one deliberate `orphan-folder` finding, so "the answers are
  // equal" is a claim about a NON-EMPTY set. Two empty sets comparing equal is the bug.
  await mkdir(path.join(itemDir, "stories", "not-a-valid-folder"), { recursive: true });

  await pin(itemDir, ["SPEC.md", "ARCHITECTURE.md"]);
  await pin(storyDir, ["STORY.md"]);
  await pin(path.join(storyDir, "tasks"), ["00_task.feature"]);

  return { repo, workDir, itemDir };
}

function runCli(cwd, args, extraEnv = {}) {
  const result = spawnSyncHardened(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1", ...extraEnv },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

// `--json` relativises every finding path to the process cwd (the CLI's path-projection
// face — `run` carries the raw absolute). Resolving each back against the cwd it was
// produced from is what turns three cwd-relative answers into one comparable claim: they
// must name the SAME files, not merely the same number of them.
function doctorFrom(cwd, ref) {
  const result = runCli(cwd, ["work", "doctor", ref, "--json"]);
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    assert.fail(`work doctor --json from ${cwd} did not emit JSON.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  }
  return {
    status: result.status,
    loopReady: parsed.loopReady ?? null,
    findings: (parsed.findings ?? [])
      .map((f) => ({ code: f.code, severity: f.severity, message: f.message, path: path.resolve(cwd, f.path) }))
      .sort((a, b) => (a.code + a.path + a.message).localeCompare(b.code + b.path + b.message)),
  };
}

export const doctorCwdIndependenceTests = [
  {
    name: "chore 103 — work doctor answers the SAME findings for one ref from the repo root, a source dir and a work-item folder",
    async run() {
      const { repo, itemDir } = await fixtureRepo();
      try {
        const fromRoot = doctorFrom(repo, "07");
        const fromSrc = doctorFrom(path.join(repo, "src", "nested"), "07");
        const fromItem = doctorFrom(itemDir, "07");

        // The bug's signature was an EMPTY set from the subdirectories, so an equality that
        // could be satisfied by three empty sets would pin nothing at all.
        assert.ok(
          fromRoot.findings.length > 0,
          "the fixture seeds a real finding — otherwise 'equal findings' is vacuous",
        );

        assert.deepEqual(fromSrc.findings, fromRoot.findings, "a source dir doctors the same ref identically to the repo root");
        assert.deepEqual(fromItem.findings, fromRoot.findings, "a work-item folder doctors the same ref identically to the repo root");

        // The OTHER half of the tell recorded in the chore: the output SHAPE changed too —
        // `70% (7/10)` became `50% (2/4)`, because a different readiness level was being
        // scored over an empty set. Equal findings with an unequal denominator is still the
        // bug, so the score is pinned alongside them.
        assert.deepEqual(fromSrc.loopReady, fromRoot.loopReady, "the Loop-Ready score is scored over the same set from a source dir");
        assert.deepEqual(fromItem.loopReady, fromRoot.loopReady, "the Loop-Ready score is scored over the same set from a work-item folder");

        assert.equal(fromSrc.status, fromRoot.status, "the advisory exit code is cwd-independent too");
        assert.equal(fromItem.status, fromRoot.status, "the advisory exit code is cwd-independent too");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "chore 103 — config discovery walks UP, so work.dir resolves against the project root from any depth",
    async run() {
      const { repo, workDir } = await fixtureRepo();
      try {
        const expected = workspacePaths(repo).configPath;
        const from = [
          repo,
          path.join(repo, "src"),
          path.join(repo, "src", "nested"),
          path.join(repo, "wiki", "work", "07_milestone_alpha"),
        ];
        for (const dir of from) {
          assert.equal(await findProjectConfig(dir), expected, `discovery from ${dir} finds the enclosing project's config`);
          const ws = await loadWorkspace(dir);
          assert.equal(ws.projectRoot, path.resolve(repo), "the project root is the directory the config was found in");
          assert.equal(ws.workDir, workDir, "work.dir resolves against the project root, never the current directory");
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "chore 103 — the walk stops short of the global AOF home: aof's own config home is never adopted as a project root",
    async run() {
      // The global home is an ANCESTOR of ordinary working directories (on Windows
      // `os.tmpdir()` is under `~`, beside `~/.aof`), so an unbounded upward walk would
      // resolve every unconfigured directory to aof's OWN config — and, worse, silently
      // point a temp-dir fixture's work dir at the operator's real stream.
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-chore103-home-"));
      try {
        const globalHome = path.join(home, ".aof");
        await mkdir(globalHome, { recursive: true });
        await writeFile(
          path.join(globalHome, "aof.config.json"),
          JSON.stringify({ name: "the-global-home", work: { dir: "./wiki/work" } }, null, 2),
          "utf8",
        );
        // A stream under the global home, so adopting it would be LOUD rather than subtle.
        await mkdir(path.join(home, "wiki", "work", "07_milestone_global"), { recursive: true });

        const project = path.join(home, "workspaces", "unconfigured");
        await mkdir(project, { recursive: true });

        const result = runCli(project, ["work", "doctor", "--json"], { AOF_GLOBAL_HOME: globalHome });
        const parsed = JSON.parse(result.stdout);
        const empty = parsed.findings.find((f) => f.code === "empty-stream");

        assert.ok(empty != null, "an unconfigured directory scans nothing, and says so");
        assert.equal(
          path.resolve(project, empty.path),
          path.join(project, "wiki", "work"),
          "the directory it looked in is the unconfigured project's own — the global home was not adopted",
        );
        assert.notEqual(
          path.resolve(project, empty.path),
          path.join(home, "wiki", "work"),
          "…and specifically NOT the global AOF home's stream",
        );
      } finally {
        await rm(home, { recursive: true, force: true });
      }
    },
  },

  {
    name: "chore 103 — the walk stops at an ancestor .aof: a mesh worktree resolves ITSELF, never the origin it was materialised inside",
    async run() {
      // A per-assignment worktree lives at `<origin>/.aof/mesh/worktrees/<assignmentId>`
      // (m35/ADR-004's one seam), so every upward walk out of it passes through the
      // ORIGIN's `.aof`. Adopting the config found there points the worktree's work dir at
      // the origin's stream — and a worker's doctor then reads the control's cache as
      // authority over the tree it is itself authoring. Two things make that easy to do by
      // accident: `.aof/aof.config.json` also matches the LEGACY `<root>/aof.config.json`
      // shape, and one step further up the origin's canonical config is waiting.
      const { repo } = await fixtureRepo();
      try {
        const worktree = path.join(repo, ".aof", "mesh", "worktrees", "asg-boundary");
        await mkdir(path.join(worktree, "wiki", "work"), { recursive: true });

        assert.equal(
          await findProjectConfig(worktree),
          workspacePaths(worktree).configPath,
          "a checkout inside .aof resolves its OWN config path, not the origin's",
        );

        const ws = await loadWorkspace(worktree);
        assert.equal(ws.projectRoot, worktree, "the worktree is its own project root");
        assert.equal(ws.workDir, path.join(worktree, "wiki", "work"), "…so it reads its own stream, never the origin's");
        assert.notEqual(ws.workDir, path.join(repo, "wiki", "work"), "…and specifically not the origin's stream");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "chore 103 — a scan that finds ZERO items is an error naming the directory, never a pass",
    async run() {
      const { repo, workDir } = await fixtureRepo({ withStream: false });
      try {
        const result = runCli(repo, ["work", "doctor"]);

        assert.notEqual(result.status, 0, "an instrument that can see nothing must refuse — a non-zero exit, not a clean one");
        assert.match(result.stdout, /empty-stream/, "the refusal carries a machine code");
        assert.match(result.stdout, /^error: empty-stream/m, "…at error severity, so --strict is not what makes it fail");
        assert.doesNotMatch(result.stdout, /healthy/, "an empty result and a clean result must stop rendering identically");

        // The finding NAMES the directory it looked in — the one fact an operator needs to
        // see that the scan was pointed somewhere unintended.
        const json = JSON.parse(runCli(repo, ["work", "doctor", "--json"]).stdout);
        const empty = json.findings.find((f) => f.code === "empty-stream");
        assert.ok(empty != null, "the --json face carries the same finding");
        assert.equal(empty.severity, "error", "zero items is an error");
        assert.equal(path.resolve(repo, empty.path), workDir, "the finding names the directory that was scanned");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
];
