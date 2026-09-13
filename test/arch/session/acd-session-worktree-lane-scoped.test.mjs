// Fitness function: acd-session-worktree-lane-scoped (milestone 50 / story 03; TECH_DEBT
// item 47) — "the bare-session lane is a SIBLING of the assignment lane, never a squatter
// in its module or its keyspace."
//
// TWO INVARIANTS, ONE SUBJECT: the boundary between the m50 session lane and the m35
// assignment lane. Both were asserted inside the story's own traceability suite
// (test/mesh/session/mesh-session-spawn-handler.test.mjs) and are LIFTED here, because they are
// source-shape invariants about the whole tree rather than facts about one story's
// scenarios: they must fail CI independently of the story file, they must survive its
// eventual archival, and — the reason that decides it — a structural claim asserted only
// where the feature is tested is a claim nobody checks when the NEXT lane arrives.
//
// ── INVARIANT 1: THE HANDLER IS A SIBLING MODULE ────────────────────────────────────────
// src/mesh/session-spawn-handler.mjs does not import src/mesh/worker-execution.mjs (the
// widest hub in src/, 47+ dependents, entangled with the ASSIGNMENT lifecycle — worktree,
// run record, state machine, terminal reports; a bare session has none of that). Nor does
// it import terminal-providers.mjs or call `resolveProvider`: ADR-007 rules that a
// launched session runs the OPERATOR'S DEFAULT SHELL, so provider resolution is off the
// spawn path entirely, and the PTY is opened through the SAME
// `createTerminalSpawn(loadNodePty)` factory the rest of the tree spawns through.
//
// ── INVARIANT 2: THE KEYSPACES ARE DISJOINT, AND THE RATCHET IS TECH_DEBT 47's ─────────
// `listStrandedWorktreeAssignments` enumerates `<checkout>/.aof/mesh/worktrees/` at every
// worker start and trusts EVERY DIRECTORY NAME THERE as an assignmentId, with no store
// lookup — then reports each as `failed`/`daemon-restarted` through the DURABLE outbox.
// The session lane keyed its worktree `session-<slug>` in exactly that root. Measured
// 2026-08-14:
//
//     stranded entries the launcher would report failed/daemon-restarted: ["session-50"]
//
// TECH_DEBT 47's prescribed ratchet, implemented here: "widen the scan set from one
// hard-coded path to EVERY `src/` module that calls `meshWorktreePath`/`meshWorktreesRoot`,
// so the next lane to compose a path there fails CI instead of needing a reviewer." The
// allowlist below is that scan, as an ALLOWLIST rather than a count — a number would say
// a new caller appeared; a named list says WHICH ONE and WHY THE OTHERS ARE THERE.
//
// Self-checked with hand-written planted violations (never a string-replace on a real
// file): each plant asserts it LANDED before the detector is asked about it.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import {
  meshWorktreesRoot,
  meshSessionWorktreesRoot,
  meshSessionWorktreePath,
  sessionWorktreeSlug,
  isUnderMeshSessionWorktreesRoot,
  isUnderMeshWorktreesRoot,
} from "../../../src/mesh/worktree.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SPAWN_HANDLER = path.join(repoRoot, "src", "mesh", "session-spawn-handler.mjs");
const GITIGNORE = path.join(repoRoot, ".gitignore");

// lf(source) — normalise CRLF -> LF before every regex probe (this repo's tree is checked
// out CRLF; an "\n"-only needle silently no-ops, the failure class m38 was burned by).
function lf(source) {
  return source.replace(/\r\n/g, "\n");
}

async function realSource(file) {
  return lf(stripComments(await readFile(file, "utf8")));
}

// ── DETECTOR 1 — the sibling-module boundary ───────────────────────────────────────────
export function siblingBoundaryProblems(code) {
  const problems = [];
  if (/from\s*["'][^"']*mesh[-/]worker-execution\.mjs["']/u.test(code)) {
    problems.push("mesh-session-spawn-handler.mjs imports mesh-worker-execution.mjs — that module is the widest hub in src/ and owns the ASSIGNMENT lifecycle; a bare session has no assignmentId, no run, no phase and no settle, so this handler is a SIBLING of it and never an extension (task 00 locks this)");
  }
  if (/from\s*["'][^"']*terminal-providers\.mjs["']/.test(code)) {
    problems.push("mesh-session-spawn-handler.mjs imports terminal-providers.mjs — ADR-007 rules that a launched session opens the OPERATOR'S DEFAULT SHELL, so provider resolution is not on the spawn path");
  }
  if (/resolveProvider\s*\(/.test(code)) {
    problems.push("mesh-session-spawn-handler.mjs calls resolveProvider(...) — ADR-007: `assistant` is a LABEL (which lane of the grid this renders in), never a spawn instruction");
  }
  if (!/from\s*["'](?:\.\.?\/)+terminal-ws\.mjs["']/.test(code) || !/createTerminalSpawn\s*\(\s*loadNodePty\s*\)/.test(code)) {
    problems.push("mesh-session-spawn-handler.mjs does not open its PTY through createTerminalSpawn(loadNodePty) from ./terminal-ws.mjs — the ONE spawn factory the rest of the tree uses (a second spawn path is a second set of native-addon failure modes)");
  }
  return problems;
}

// ── DETECTOR 2 — the assignment lane's keyspace has a NAMED set of callers ─────────────
//
// Every `src/` module that names `meshWorktreePath` / `meshWorktreesRoot` /
// `isUnderMeshWorktreesRoot` must be on this list. It is deliberately an allowlist with
// reasons, not a count: TECH_DEBT 47's whole finding is that the SECOND writer into this
// root cost a review to notice.
export const ASSIGNMENT_KEYSPACE_CALLERS = Object.freeze([
  Object.freeze({
    file: "src/mesh/worktree.mjs",
    why: "THE HOME — it defines the root and the seam. The session lane's own root (meshSessionWorktreesRoot) is defined here too, as a deliberate SIBLING of it.",
  }),
  Object.freeze({
    file: "src/mesh/worker-execution.mjs",
    why: "THE ASSIGNMENT LANE — the one legitimate materializer, and the module whose startup scan trusts every directory name in the root. KNOWN DEBT, recorded rather than hidden: pushWorktreeBranch also builds its one-shot askpass shim at `<worktreesRoot>/.askpass/<uuid>`, so a crash mid-push leaves a `.askpass` directory that the same scan will report as a stranded assignment. Same species as TECH_DEBT 47; a separate fix, in a file milestone 50 does not touch.",
  }),
  Object.freeze({
    file: "src/work/read.mjs",
    why: "READ-SIDE ONLY — `isUnderMeshWorktreesRoot` as a boundary PREDICATE (is this checkout a mesh worktree?). It composes no path and materializes nothing.",
  }),
]);

export function keyspaceCallerOffenders(listing, allowed = ASSIGNMENT_KEYSPACE_CALLERS) {
  const names = new Set((allowed ?? []).map((entry) => entry.file));
  const offenders = [];
  for (const file of Array.isArray(listing) ? listing : []) {
    if (!/\bmeshWorktreePath\b|\bmeshWorktreesRoot\b|\bisUnderMeshWorktreesRoot\b/.test(lf(stripComments(String(file?.source ?? ""))))) continue;
    if (names.has(file.path)) continue;
    offenders.push(
      `${file.path} names the ASSIGNMENT lane's worktree seam (meshWorktreePath / meshWorktreesRoot). That root is enumerated at every worker start by listStrandedWorktreeAssignments, which trusts each directory NAME as an assignmentId and reports it failed/daemon-restarted through the durable outbox — so a directory put there by any other lane becomes a permanent, per-restart, fabricated assignment fact (TECH_DEBT 47, measured). If this is a NEW LANE, give it its own root the way the session lane has meshSessionWorktreePath. If it is genuinely part of the assignment lane, add it to ASSIGNMENT_KEYSPACE_CALLERS above WITH ITS REASON.`,
    );
  }
  // Both directions: an allowlist entry naming a file that no longer calls the seam is a
  // permission with no subject, and it is how a converted module quietly regains one.
  for (const entry of allowed ?? []) {
    const found = (listing ?? []).find((file) => file?.path === entry.file);
    if (found == null) {
      offenders.push(`${entry.file} is allowlisted here and was NOT found in the sweep — re-aim the list; a clause naming a file that does not exist is the strongest-looking green in this gate`);
      continue;
    }
    if (!/\bmeshWorktreePath\b|\bmeshWorktreesRoot\b|\bisUnderMeshWorktreesRoot\b/.test(lf(stripComments(String(found.source ?? ""))))) {
      offenders.push(`${entry.file} is allowlisted as an assignment-keyspace caller but no longer names the seam — drop its entry so the ratchet keeps the ground it just gained`);
    }
  }
  return offenders;
}

// ── DETECTOR 3 — the session lane composes its path at its OWN seam ────────────────────
export function sessionLaneProblems(code) {
  const problems = [];
  if (/\bmeshWorktreePath\s*\(/.test(code) || /\bmeshWorktreesRoot\s*\(/.test(code)) {
    problems.push("the session spawn handler composes a path at the ASSIGNMENT lane's seam (meshWorktreePath / meshWorktreesRoot) — that root's every directory name is read back as an assignmentId at worker start (TECH_DEBT 47); the session lane's own seam is meshSessionWorktreePath");
  }
  if (!/\bmeshSessionWorktreePath\s*\(/.test(code)) {
    problems.push("the session spawn handler never calls meshSessionWorktreePath — its item-keyed worktree must be composed at the session lane's own seam, under the session lane's own root");
  }
  // The slug derivation has ONE home, and it is mesh-worktree.mjs's (where the ref
  // sanitizer lives). Re-deriving it by taking another module's return value apart — the
  // shipped `meshItemBranchName(itemRef).split("/").pop()` — makes a filesystem path
  // depend on a BRANCH-NAMING decision made in a different module.
  if (/meshItemBranchName\s*\([^)]*\)\s*\.\s*split\s*\(/.test(code)) {
    problems.push("the session spawn handler re-derives its path slug by splitting meshItemBranchName's return value — the sanitizer has one home (mesh-worktree.mjs); borrow the slug (sessionWorktreeSlug), never dismantle a branch name to recover it");
  }
  return problems;
}

async function readSrcListing() {
  const { readdir } = await import("node:fs/promises");
  const dir = path.join(repoRoot, "src");
  const listing = [];
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith(".mjs")) {
        listing.push({
          path: path.relative(repoRoot, full).split(path.sep).join("/"),
          source: await readFile(full, "utf8"),
        });
      }
    }
  };
  await walk(dir);
  return listing;
}

export const archTests = [
  {
    name: "arch/50 (acd-session-worktree-lane-scoped): the session spawn handler is a SIBLING module — it imports neither mesh-worker-execution.mjs nor terminal-providers.mjs, calls no resolveProvider, and opens its PTY through the ONE createTerminalSpawn(loadNodePty) factory",
    run: async () => {
      const problems = siblingBoundaryProblems(await realSource(SPAWN_HANDLER));
      assert.deepEqual(problems, [], `sibling-boundary problems:\n  ${problems.join("\n  ")}`);
    },
  },

  {
    name: "arch/50 (acd-session-worktree-lane-scoped): self-check — each planted boundary violation trips its own clause, and the clean synthesized module stays quiet (non-vacuous)",
    run: async () => {
      const clean = [
        'import { createTerminalSpawn, loadNodePty } from "./terminal-ws.mjs";',
        'import { addSessionWorktree, meshSessionWorktreePath } from "./worktree.mjs";',
        'import { startSession } from "./session.mjs";',
        "const defaultPtySpawn = createTerminalSpawn(loadNodePty);",
      ].join("\n");
      assert.deepEqual(siblingBoundaryProblems(clean), [], "the clean synthesized module stays quiet");

      for (const [label, planted] of [
        ["the assignment hub is imported", `${clean}\nimport { workerHasRepo } from "./mesh/worker-execution.mjs";`],
        ["terminal-providers is imported", `${clean}\nimport { resolveProvider } from "./terminal-providers.mjs";`],
        ["resolveProvider is called", `${clean}\nconst bin = resolveProvider(assistant);`],
      ]) {
        assert.notEqual(planted, clean, `${label}: the plant actually differs from the clean shape`);
        assert.ok(siblingBoundaryProblems(planted).length > 0, `self-check: ${label} trips the detector`);
      }

      // …and the POSITIVE clause: a module that spawns through some other factory.
      const otherFactory = clean.replace("createTerminalSpawn(loadNodePty)", "createOwnPtySpawner()");
      assert.notEqual(otherFactory, clean, "the plant actually differs from the clean shape");
      assert.ok(
        siblingBoundaryProblems(otherFactory).length > 0,
        "self-check: a second, private spawn path trips — the PTY factory has one home",
      );
    },
  },

  {
    name: "arch/50 (acd-session-worktree-lane-scoped): TECH_DEBT 47's ratchet — every src/ module that names the ASSIGNMENT lane's worktree seam is on the allowlist, with a reason (the next lane to compose a path in that root fails CI instead of needing a reviewer)",
    run: async () => {
      const listing = await readSrcListing();
      assert.ok(listing.length > 100, `src/ was actually swept (non-vacuous): ${listing.length} modules`);
      const offenders = keyspaceCallerOffenders(listing);
      assert.deepEqual(offenders, [], `assignment-keyspace offenders:\n  ${offenders.join("\n  ")}`);
    },
  },

  {
    name: "arch/50 (acd-session-worktree-lane-scoped): the session spawn handler composes its worktree path at the SESSION lane's own seam — never meshWorktreePath, and never by dismantling meshItemBranchName's return value",
    run: async () => {
      const problems = sessionLaneProblems(await realSource(SPAWN_HANDLER));
      assert.deepEqual(problems, [], `session-lane problems:\n  ${problems.join("\n  ")}`);
    },
  },

  {
    name: "arch/50 (acd-session-worktree-lane-scoped): self-check — the SHIPPED-AND-REMOVED defect (a `session-<slug>` key composed at meshWorktreePath, its slug split out of meshItemBranchName) trips both clauses; a new lane calling the assignment seam trips the sweep (non-vacuous)",
    run: async () => {
      const clean = [
        'import { addSessionWorktree, meshSessionWorktreePath } from "./worktree.mjs";',
        "async function resolveSessionWorktree(projectRoot, itemRef) {",
        "  const worktreePath = meshSessionWorktreePath(projectRoot, itemRef);",
        "  return worktreePath;",
        "}",
      ].join("\n");
      assert.deepEqual(sessionLaneProblems(clean), [], "the clean synthesized resolver stays quiet");

      // THE EXACT SHIPPED SHAPE THIS GATE EXISTS FOR, reconstructed by hand.
      const shipped = [
        'import { addWorktree, meshWorktreePath, meshItemBranchName } from "./worktree.mjs";',
        "function sessionWorktreeKey(itemRef) {",
        '  const slug = meshItemBranchName(itemRef).split("/").pop();',
        "  return `session-${slug}`;",
        "}",
        "async function resolveSessionWorktree(projectRoot, itemRef) {",
        "  return meshWorktreePath(projectRoot, sessionWorktreeKey(itemRef));",
        "}",
      ].join("\n");
      assert.notEqual(shipped, clean, "the plant actually differs from the clean shape");
      const shippedProblems = sessionLaneProblems(shipped);
      assert.ok(
        shippedProblems.some((p) => p.includes("ASSIGNMENT lane's seam")),
        `self-check: composing at meshWorktreePath trips (got ${JSON.stringify(shippedProblems)})`,
      );
      assert.ok(
        shippedProblems.some((p) => p.includes("meshItemBranchName")),
        "self-check: re-deriving the slug by splitting a branch name trips",
      );

      // …and the sweep: a NEW module naming the assignment seam is an offender until it
      // is allowlisted with a reason.
      const planted = [
        { path: "src/mesh/worktree.mjs", source: "export function meshWorktreePath() {} export function meshWorktreesRoot() {}" },
        { path: "src/mesh/worker-execution.mjs", source: "import { meshWorktreePath } from './worktree.mjs';" },
        { path: "src/work/read.mjs", source: "import { isUnderMeshWorktreesRoot } from './worktree.mjs';" },
        { path: "src/mesh-brand-new-lane.mjs", source: "import { meshWorktreePath } from './worktree.mjs';\nconst p = meshWorktreePath(root, `preview-${ref}`);" },
      ];
      const offenders = keyspaceCallerOffenders(planted);
      assert.equal(offenders.length, 1, `self-check: exactly the new lane is reported (got ${JSON.stringify(offenders)})`);
      assert.ok(offenders[0].includes("src/mesh-brand-new-lane.mjs"), "self-check: …and it is named");

      // …and a stale allowlist entry is reported too (a permission with no subject).
      const stale = keyspaceCallerOffenders(planted.filter((f) => f.path !== "src/work/read.mjs"));
      assert.ok(
        stale.some((problem) => problem.includes("src/work/read.mjs") && problem.includes("re-aim")),
        `self-check: an allowlisted file missing from the sweep is reported (got ${JSON.stringify(stale)})`,
      );
    },
  },

  {
    name: "arch/50 (acd-session-worktree-lane-scoped): the two roots are DISJOINT in fact — no session path is ever under the assignment root, no hostile ref escapes either, and the session root carries its own .gitignore line",
    run: async () => {
      const projectRoot = path.join(repoRoot, "fixture-root");
      assert.notEqual(
        path.resolve(meshSessionWorktreesRoot(projectRoot)),
        path.resolve(meshWorktreesRoot(projectRoot)),
        "the two lanes have different roots",
      );
      // A SIBLING, not a child: a child directory would simply BE an entry the assignment
      // scan enumerates — named "session-worktrees" — which is the defect, one level up.
      assert.equal(
        isUnderMeshWorktreesRoot(projectRoot, meshSessionWorktreesRoot(projectRoot)),
        false,
        "the session root is not nested inside the assignment root",
      );

      for (const itemRef of ["50", "50/03", "../../../etc/passwd", "..\\..\\windows", "....//....//x", ".hidden", "", "a b:c*d?e"]) {
        const resolved = meshSessionWorktreePath(projectRoot, itemRef);
        assert.ok(
          isUnderMeshSessionWorktreesRoot(projectRoot, resolved),
          `[${JSON.stringify(itemRef)}] escapes the session worktrees root: ${resolved}`,
        );
        assert.equal(
          isUnderMeshWorktreesRoot(projectRoot, resolved),
          false,
          `[${JSON.stringify(itemRef)}] landed in the ASSIGNMENT lane's keyspace: ${resolved}`,
        );
        const slug = sessionWorktreeSlug(itemRef);
        assert.ok(/^session-[A-Za-z0-9._-]+$/.test(slug), `[${JSON.stringify(itemRef)}] slug is not one flat safe component: ${slug}`);
        assert.ok(!slug.includes(".."), `[${JSON.stringify(itemRef)}] slug carries a traversal run: ${slug}`);
        assert.equal(path.basename(resolved), slug, `[${JSON.stringify(itemRef)}] the slug is the LAST and only composed component`);
      }

      const ignored = lf(await readFile(GITIGNORE, "utf8"));
      assert.ok(/^\.aof\/mesh\/worktrees\/$/m.test(ignored), "the assignment lane's root is git-ignored (unchanged)");
      assert.ok(
        /^\.aof\/mesh\/session-worktrees\/$/m.test(ignored),
        "the session lane's root is git-ignored too — a launched shell's worktree is a full embedded checkout, never a record to commit",
      );
    },
  },
];
