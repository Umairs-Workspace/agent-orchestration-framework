// Fitness function: acd-worktree-never-linked (milestone 72 / story 04, FF-7207;
// ADR-007 §2, §3, TECH_DEBT item 36).
//
//   "The hazard is not `npm ci`. It is any recursive delete whose path crosses a junction into a
//    git-managed directory."
//
// This repository has the scar that makes this control non-negotiable. A reviewing agent junctioned
// `node_modules` into a scratch worktree to avoid an install; `git worktree remove --force` then
// followed the junction, emptied the real `node_modules`, and the `node_modules/@aof/ui` workspace
// junction carried the delete on into `ui/` — 113 tracked files gone, plus uncommitted work across
// five stories, two of them already accepted. It happened TWICE in four hours. `package.json` still
// declares `workspaces: ["ui"]`, so the junction that carried it is still there: the conditions have
// not changed, only the practice has, and a practice is not a control.
//
// BOTH HALVES ARE ONE HAZARD and are held together. A link nobody creates cannot be followed, and a
// delete that does not recurse cannot follow one.
//
// ── IT IS A RATCHET, GREEN ON ARRIVAL, WHICH IS WHY THE PLANTS MATTER MORE THAN THE PASS ─────
//
// Measured 2026-09-02: `src/` holds zero link-creating calls and ten recursive deletes, none of them
// derived from a worktree. A census that has never been seen red over a tree that never held the
// defect proves nothing by passing — so every row below is driven against a PLANTED source through
// the same pure classifier the shipped tree goes through, and the admitted rows are driven too.
//
// ── THE CLASSIFICATION IS BY DERIVATION FROM THE KEYED SEAM, NEVER BY RESOLVING A PATH ───────
//
// This is the clause that keeps the census honest, and it is measured rather than fastidious:
// `src/mesh/worker-execution.mjs:635` recursively deletes an askpass shim directory that, when its
// `scriptsRoot` is a worktree, lies strictly INSIDE one — correct, shipped code, in a file this
// story may not edit. A census that resolved paths would red on it. So what is asked of a call is
// whether its path EXPRESSION comes from the worktree seam: one of the three keyed path producers,
// or a literal the shared derivation itself classifies as inside a tree. A delete of something that
// merely happens to live in a worktree is not a delete OF a worktree.
//
// And the root is DERIVED, never matched as a literal: the classifier is composed over the module's
// own exported predicates, so a renamed root cannot evade it — which a `.aof/mesh/worktrees` string
// in this file would let it do the day the rename lands.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { enclosingParenGroup, matchedParenSpan, stripComments } from "../../support/source-slice.mjs";
import {
  isInsideMeshWorktree,
  meshDispatchWorktreePath,
  meshSessionWorktreePath,
  meshWorktreePath,
  meshWorktreesRoot,
  removeWorktree,
} from "../../../src/mesh/worktree.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const selfPath = fileURLToPath(import.meta.url);
const SOURCE_FLOOR = 80;

// A project root that is NOT this repository's, so every classification row is about the derivation
// rather than about where this suite happens to be running.
const PROBE_ROOT = path.join(path.sep, "tmp", "a-project");
const OTHER_ROOT = path.join(path.sep, "tmp", "another-project");

// ── WHAT REACHES A WORKTREE ──────────────────────────────────────────────────────────────────

// The three KEYED path producers — each returns a tree. The three ROOT producers are deliberately
// absent: a root is not a worktree, and a recursive delete of one is a lane teardown rather than
// TECH_DEBT 36.
const WORKTREE_PRODUCERS = Object.freeze(["meshWorktreePath", "meshSessionWorktreePath", "meshDispatchWorktreePath"]);

// PURE — does this argument expression name a worktree? By DERIVATION first (the producer that
// built it), and only then by asking the shared classifier about a literal. Both halves go through
// `src/mesh/worktree.mjs`; neither spells a path of its own.
export function reachesAWorktree(expression, projectRoot = PROBE_ROOT) {
  if (WORKTREE_PRODUCERS.some((producer) => expression.includes(producer))) return true;
  for (const match of expression.matchAll(/["'`]([^"'`]+)["'`]/gu)) {
    // The literal is read as SOURCE TEXT, so a Windows path arrives with its separators escaped.
    // Unescaping before classifying is not cosmetic: `path.resolve` reads a leading doubled
    // backslash as a UNC prefix, and the classifier would then be answering about a network share.
    if (isInsideMeshWorktree(projectRoot, match[1].replaceAll("\\\\", "\\"))) return true;
  }
  return false;
}

// Every call of the named functions, with its argument text. The paren span is cut by the ONE home's
// matcher, so an argument list carrying a nested call is cut where the language draws it rather than
// at the first `)`.
function callsOf(code, names) {
  const out = [];
  for (const match of code.matchAll(new RegExp(`\\b(${names.join("|")})\\s*\\(`, "gu"))) {
    const span = matchedParenSpan(code, match.index + match[0].length - 1);
    if (span != null) out.push({ name: match[1], args: span.body });
  }
  return out;
}

// The link-creating forms, in every spelling. `\b` before `link` is load-bearing: without it
// `unlink(` and `isSymbolicLink()` red across seven shipped `src/` sites, none of which creates
// anything.
const LINK_CALLS = Object.freeze(["symlink", "symlinkSync", "link", "linkSync"]);

// The two forms with no call name of their own — a program named inside an argument vector. Matched
// case-insensitively, and attributed to the CALL that encloses them rather than to a line, because
// an argument vector is routinely spread across several.
const LINK_PROGRAMS = Object.freeze([/\bmklink\b/iu, /New-Item[^"'`]*-ItemType\s+Junction/iu]);

// PURE — `[{ rel, code }]` in, the link-creating calls whose path or target reaches a worktree out.
export function linkProblems(sources, projectRoot = PROBE_ROOT) {
  const problems = [];
  for (const { rel, code } of sources) {
    const text = stripComments(code);
    for (const call of callsOf(text, LINK_CALLS)) {
      if (!reachesAWorktree(call.args, projectRoot)) continue;
      problems.push(`${rel} calls \`${call.name}(\` with a path or target inside a worktree — a link into a worktree is what a forced removal follows out of it, and TECH_DEBT item 36 is what that costs.`);
    }
    for (const program of LINK_PROGRAMS) {
      for (const match of text.matchAll(new RegExp(program.source, `${program.flags.replace("u", "")}gu`))) {
        const group = enclosingParenGroup(text, match.index);
        const region = group?.body ?? "";
        if (!reachesAWorktree(region, projectRoot)) continue;
        problems.push(`${rel} names \`${match[0]}\` in an argument vector whose path reaches a worktree — a junction created by a shelled program is the same link, and follows the same way.`);
      }
    }
  }
  return problems;
}

// The recursive-delete forms. `rimraf` needs no flag; the other two do, and "no recursion" is an
// ADMITTED row rather than an omission — one file removed from inside a tree is not the hazard.
const DELETE_CALLS = Object.freeze(["rm", "rmSync", "rimraf"]);
const RECURSION = /\brecursive\s*:\s*true\b/u;

// PURE — the recursive deletes that remove a WORKTREE. See the header: classification is by
// derivation, so a delete of something that merely lives inside a tree is admitted.
export function deleteProblems(sources, projectRoot = PROBE_ROOT) {
  const problems = [];
  for (const { rel, code } of sources) {
    const text = stripComments(code);
    for (const call of callsOf(text, DELETE_CALLS)) {
      const recurses = call.name === "rimraf" || RECURSION.test(call.args);
      if (!recurses) continue;
      if (!reachesAWorktree(call.args, projectRoot)) continue;
      problems.push(`${rel} calls \`${call.name}(\` recursively over a path derived from the worktree seam — removal is git's (\`git worktree remove\`), never a filesystem delete: a recursive delete is what follows a junction, and git's own verb does not.`);
    }
  }
  return problems;
}

async function sourceModules() {
  const out = [];
  const stack = ["src"];
  while (stack.length > 0) {
    const rel = stack.pop();
    for (const entry of await readdir(path.join(repoRoot, rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) stack.push(child);
      else if (entry.name.endsWith(".mjs")) out.push({ rel: child, code: await readFile(path.join(repoRoot, child), "utf8") });
    }
  }
  return out;
}

// A planted module, built from the DERIVATION so this file spells no worktree path of its own.
const planted = (code) => [{ rel: "src/planted.mjs", code }];
const insideAssignmentTree = meshWorktreePath(PROBE_ROOT, "a1");
const insideSessionTree = meshSessionWorktreePath(PROBE_ROOT, "72/04");
const insideDispatchTree = meshDispatchWorktreePath(PROBE_ROOT, "72/04");
const bareRoot = meshWorktreesRoot(PROBE_ROOT);
const q = (value) => JSON.stringify(value);

export const archTests = [
  {
    name: "arch/72 FF-7207 (acd-worktree-never-linked): no link is created whose path lies inside a worktree — over the shipped tree, and over every planted form",
    async run() {
      const modules = await sourceModules();
      assert.ok(modules.length > SOURCE_FLOOR, `src/ was actually walked (non-vacuous): ${modules.length} modules, floor ${SOURCE_FLOOR}`);

      const shipped = linkProblems(modules);
      assert.deepEqual(shipped, [], `aof creates no link into a worktree:\n  ${shipped.join("\n  ")}`);

      // EVERY LINK-CREATING FORM, each with its path inside a worktree.
      const forms = [
        { form: "symlink", code: `await symlink(shared, ${q(insideAssignmentTree)});` },
        { form: "symlinkSync", code: `symlinkSync(shared, ${q(insideSessionTree)});` },
        { form: "link", code: `await link(shared, ${q(insideDispatchTree)});` },
        { form: "linkSync", code: `linkSync(shared, ${q(insideAssignmentTree)});` },
        { form: "symlink with the junction type argument", code: `await symlink(shared, ${q(insideAssignmentTree)}, "junction");` },
        { form: "mklink in an argument vector", code: `await run(["cmd", "/c", "mklink", "/J", ${q(insideAssignmentTree)}, shared]);` },
        { form: "New-Item -ItemType Junction in an argument vector", code: `await run(["powershell", "-Command", "New-Item -ItemType Junction -Path " + ${q(insideAssignmentTree)}]);` },
      ];
      for (const row of forms) {
        const caught = linkProblems(planted(row.code));
        assert.equal(caught.length, 1, `${row.form}: reported`);
        assert.ok(caught[0].startsWith("src/planted.mjs"), `…naming the module (${row.form})`);
      }

      // THE TARGET SIDE — a link whose TARGET is inside a tree and whose path is not is still a
      // route out of the tree, and is reported.
      assert.equal(linkProblems(planted(`await symlink(${q(insideAssignmentTree)}, "/tmp/elsewhere/link");`)).length, 1, "a link whose TARGET resolves inside a worktree is reported");

      // …AND THE CALL THAT MUST STAY ADMITTED. A control that reds on a link outside every worktree
      // is a control somebody switches off.
      assert.deepEqual(linkProblems(planted('await symlink("/tmp/a", "/tmp/b");')), [], "a link with neither end inside a worktree is admitted");
      assert.deepEqual(linkProblems(planted(`await unlink(${q(insideAssignmentTree)});\nif (stat.isSymbolicLink()) return;`)), [], "…and `unlink(` / `isSymbolicLink()` are not link-CREATING calls, which is why the word boundary is load-bearing");
      assert.deepEqual(linkProblems(planted(`// await symlink(shared, ${q(insideAssignmentTree)});\nexport const x = 1;`)), [], "…nor is the same call inside a comment, which is prose about the hazard");
    },
  },

  {
    name: "arch/72 FF-7207 (acd-worktree-never-linked): the worktree root is DERIVED, not matched as a literal",
    async run() {
      const own = await readFile(selfPath, "utf8");
      assert.match(own, /from\s+"(?:\.\.\/)+src\/mesh\/worktree\.mjs"/u, "this control reaches the shared worktree-path derivation by import");
      assert.match(own, /\bisInsideMeshWorktree\b/u, "…and classifies through the composed predicate rather than by hand");

      // NO WORKTREE PATH LITERAL OF ITS OWN. Every path this file reasons about is produced by the
      // derivation, so a renamed root moves the control with it instead of leaving it green.
      const literals = [...stripComments(own).matchAll(/["'`]([^"'`\n]*)["'`]/gu)].map((match) => match[1]);
      // A PATH SEGMENT, never a substring: `worktree` also occurs inside `mesh-worktree.mjs`, which
      // is this file's own import specifier and names the module it is supposed to reach.
      const spelled = literals.filter((literal) => /(?:^|[\\/])worktrees(?:[\\/]|$)/iu.test(literal) || /\.aof[\\/]mesh[\\/]/iu.test(literal));
      assert.deepEqual(spelled, [], `this control spells no worktree path literal of its own: ${spelled.join(", ")}`);
    },
  },

  {
    name: "arch/72 FF-7207 (acd-worktree-never-linked): what the derivation admits as inside a worktree — a keyed child, the bare root, a lookalike sibling and a foreign root",
    async run() {
      assert.equal(isInsideMeshWorktree(PROBE_ROOT, insideAssignmentTree), true, "a path the shared derivation produces for an assignment is inside");
      assert.equal(isInsideMeshWorktree(PROBE_ROOT, insideSessionTree), true, "…and so is the session lane's");
      assert.equal(isInsideMeshWorktree(PROBE_ROOT, insideDispatchTree), true, "…and the dispatch lane's, so all three roots are covered");

      // THE ROOT ITSELF IS NOT A WORKTREE, and this is the row the three shipped predicates cannot
      // express: each compares `resolve(root) + sep` against the same for the candidate, and for the
      // root the two strings are equal, so each returns `true`.
      assert.equal(isInsideMeshWorktree(PROBE_ROOT, bareRoot), false, "the worktrees root itself, with no keyed child beneath it, is not a worktree");

      assert.equal(isInsideMeshWorktree(PROBE_ROOT, `${bareRoot}-extra`), false, "a sibling whose name merely begins with the root's name is not inside");
      assert.equal(isInsideMeshWorktree(PROBE_ROOT, meshWorktreePath(OTHER_ROOT, "a1")), false, "a path derived the same way under a DIFFERENT project root is not inside this one");
    },
  },

  {
    name: "arch/72 FF-7207 (acd-worktree-never-linked): no worktree is removed by a recursive filesystem delete, and the deletes that must stay admitted are",
    async run() {
      const modules = await sourceModules();
      const shipped = deleteProblems(modules);
      assert.deepEqual(shipped, [], `no aof path recursively deletes a worktree:\n  ${shipped.join("\n  ")}`);

      // REPORTED — a recursive delete over a path the worktree seam produced.
      for (const row of [
        { call: "rm with recursion, its path a worktree", code: `await rm(meshWorktreePath(root, id), { recursive: true, force: true });` },
        { call: "rmSync with recursion, its path a worktree", code: `rmSync(meshSessionWorktreePath(root, ref), { recursive: true });` },
        { call: "rimraf, its path a worktree", code: `await rimraf(meshDispatchWorktreePath(root, ref));` },
        { call: "rm with recursion, its path inside a worktree", code: `await rm(path.join(meshWorktreePath(root, id), "node_modules"), { recursive: true });` },
      ]) {
        const caught = deleteProblems(planted(row.code));
        assert.equal(caught.length, 1, `${row.call}: reported`);
      }

      // ADMITTED — and each of these is a real shape in the shipped tree, which is why a
      // path-resolving census would have been wrong on the day it landed.
      assert.deepEqual(deleteProblems(planted("await rm(meshWorktreesRoot(root), { recursive: true, force: true });")), [], "a recursive delete of the worktrees ROOT is a lane teardown, not a worktree removal");
      assert.deepEqual(deleteProblems(planted('await rm(path.join(scriptsRoot, ".askpass", id), { recursive: true, force: true });')), [], "…and one of a directory that merely lives somewhere is admitted — the shipped askpass cleanup is exactly this shape");
      assert.deepEqual(deleteProblems(planted("await rm(meshWorktreePath(root, id));")), [], "…and a NON-recursive delete of one path inside a tree is admitted: it cannot follow a link out");
    },
  },

  {
    name: "arch/72 FF-7207 (acd-worktree-never-linked): removal goes through git's own worktree verb, forced and unforced alike",
    async run() {
      for (const row of [{ force: undefined, label: "without force", expected: ["worktree", "remove"] }, { force: true, label: "with force", expected: ["worktree", "remove", "--force"] }]) {
        const seen = [];
        const exec = async (args) => { seen.push(args); return { stdout: "", stderr: "", status: 0 }; };
        const removed = await removeWorktree(PROBE_ROOT, "a1", { force: row.force, exec });

        assert.equal(seen.length, 1, `${row.label}: exactly one command ran`);
        assert.deepEqual(seen[0].slice(0, row.expected.length), row.expected, `${row.label}: it is git's own worktree removal`);
        assert.equal(seen[0].at(-1), removed, `…over the derived worktree path (${row.label})`);
        assert.equal(removed, meshWorktreePath(PROBE_ROOT, "a1"), `…which is the keyed path (${row.label})`);
      }

      // AND NO FILESYSTEM DELETE IS REACHED — asserted over the module's own source rather than
      // over this call, because "this path did not delete anything" is a weaker claim than "there
      // is nothing here that could".
      const module = await readFile(path.join(repoRoot, "src", "mesh", "worktree.mjs"), "utf8");
      const deletes = callsOf(stripComments(module), DELETE_CALLS);
      assert.deepEqual(deletes.map((call) => call.name), [], `the worktree module reaches no filesystem delete at all: ${deletes.map((call) => call.name).join(", ")}`);
    },
  },
];
