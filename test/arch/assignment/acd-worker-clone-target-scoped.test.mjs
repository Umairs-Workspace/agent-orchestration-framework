// Fitness function: acd-worker-clone-target-scoped (milestone 38 / ADR-005) —
// "the worker's clone-on-miss target is a SCOPED path under a dedicated checkouts root
// (meshCheckoutPath under the global mesh home), keyed by workspaceId — NEVER os.tmpdir(),
// NEVER a path built from directive/ref text."
//
// This re-arms the 35/ADR-004 worktree-scope discipline (acd-assignment-worktree-path-
// scoped: no os.tmpdir(), the ONE meshWorktreePath seam) for the NEW clone target ADR-005
// introduces. A self-provisioning worker that clones to an arbitrary/temp/attacker-shaped
// path is the escape this forbids.
//
// STATE OF BUILD: the clone-on-miss path is built by the worker-repo-checkout story;
// today mesh-worker-execution.mjs's `!hasRepo` branch REFUSES (no clone). The invariant
// is: whenever a `git clone` / `git worktree add` target is constructed in the
// worker-execution module, it is built ONLY from a scoped seam — never os.tmpdir(), never
// composed with directive/ref text. This is TRUE today (no clone target exists) and MUST
// stay true once the clone lands. The detector trips the moment a clone target escapes
// the scoped seam.
//
// Proofs:
//  1. Structural — mesh-worker-execution.mjs contains NO os.tmpdir() feeding a clone/
//     worktree target, and any clone target it builds is derived from a scoped
//     checkout seam (meshCheckoutPath / a global-mesh-home checkouts root), keyed by
//     workspaceId — never path.join(<root>, directive.itemRef) or a raw directive path.
//  2. Structural — the existing worktree call site still routes through the
//     mesh-worktree.mjs seam (no second hand-built worktree path added by this story).
//  Self-check (m03 non-vacuous): a planted os.tmpdir() clone target, and a clone target
//  built from directive text, both trip the SAME detector.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// 119/04 (item 83's seam 1) — THE SUBJECT IS THE MODULE THAT CLONES, AND IT IS NAMED.
//
// This control was ALL NEGATIVE, and its one positive leg was gated on the subject containing a
// clone at all. The clone left `worker-execution.mjs` in this story; had the subject stayed pointed
// there, `hasClone` would have read false, `problems` would have been `[]`, and 38/F1's scoped-target
// invariant would have been asserted over nothing — permanently, and invisibly, because the
// self-check below runs over PLANTED strings and so cannot see the real subject go empty.
//
// So the subject is named, and `clones: true` says which of them is REQUIRED to contain one: a leg
// that fires when the named cloner stops cloning, which is exactly the move that would otherwise
// have disarmed this file. The handler it left is still swept — it must not grow a second, unscoped
// clone target — but it carries no such requirement, because it is no longer supposed to clone.
const SUBJECTS = Object.freeze([
  { rel: "src/mesh/worker-repo-admission.mjs", clones: true },
  { rel: "src/mesh/worker-execution.mjs", clones: false },
]);

function sourcePathOf(rel) {
  return path.join(repoRoot, ...rel.split("/"));
}

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function assertStructural(code, { clones = false } = {}) {
  const problems = [];
  // 119/04 — the non-vacuity leg, FIRST, because every leg after it is a search and a search over
  // an empty or clone-less subject reports nothing. A subject declared as the one that clones and
  // found not to is this control losing its grip, not this control passing.
  if (code.trim().length === 0) {
    problems.push("the subject is EMPTY — every leg below would assert over nothing");
  }
  // No os.tmpdir() feeding any clone/checkout/worktree target in the worker-execution module.
  if (/os\.tmpdir\s*\(/.test(code)) {
    problems.push("a bare os.tmpdir() reference exists in the worker-execution module (a clone target must be scoped)");
  }
  // A clone target must never be path.join'd with directive/ref text (the traversal escape
  // T3b already forbids for worktrees — resolution is enumerate-then-filter, never a
  // path.join(root, ref)).
  if (/path\.join\s*\([^)]*directive\.(itemRef|workspaceId|commit)\b/.test(code)) {
    problems.push("a path is built by path.join with raw directive text — clone/worktree targets must be scoped seams, never directive-text paths");
  }
  if (/path\.join\s*\([^)]*\bitemRef\b/.test(code)) {
    problems.push("a path is built by path.join with itemRef — the ref resolves via enumerate-then-filter, never a path.join(root, ref)");
  }
  // If a clone is wired at all, its target must come from a scoped checkout seam under the
  // global mesh home — presence of a raw `git clone` into a non-seam path is the failure.
  // A `git clone` argv whose destination is meshCheckoutPath(...) (or absent — not yet
  // built) is fine; a `git clone` into any other constructed path is not.
  const hasClone = /["']clone["']/.test(code) || /git\s+clone/.test(code);
  if (clones && !hasClone) {
    problems.push("the subject named as the one that CLONES contains no clone — this control would pass over a file that cannot violate the invariant it forbids violating");
  }
  if (hasClone) {
    const usesScopedSeam = /meshCheckoutPath\s*\(/.test(code);
    if (!usesScopedSeam) {
      problems.push("a git clone is present but its target is not built from the meshCheckoutPath scoped seam");
    }
  }
  return problems;
}

export const archTests = [
  {
    name: "arch/38 ADR-005 (acd-worker-clone-target-scoped): the worker-execution module builds no clone/worktree target from os.tmpdir() or directive/ref text; any clone routes through the meshCheckoutPath scoped seam (structural)",
    run: async () => {
      const problems = [];
      for (const subject of SUBJECTS) {
        const code = stripComments(await readFile(sourcePathOf(subject.rel), "utf8"));
        problems.push(...assertStructural(code, subject).map((problem) => `${subject.rel}: ${problem}`));
      }
      assert.deepEqual(problems, [], `structural problems: ${JSON.stringify(problems, null, 2)}`);
      assert.ok(SUBJECTS.some((subject) => subject.clones), "at least one subject is declared as the one that clones, or nothing here is load-bearing");
    },
  },
  {
    name: "arch/38 ADR-005 (acd-worker-clone-target-scoped): self-check — a planted os.tmpdir() clone target, and a directive-text clone target, both trip the detector",
    run: async () => {
      const cloner = SUBJECTS.find((subject) => subject.clones);
      const code = stripComments(await readFile(sourcePathOf(cloner.rel), "utf8"));
      assert.deepEqual(assertStructural(code, cloner), [], "the real source is clean");

      // 119/04 — THE PLANT THIS CONTROL DID NOT HAVE, and the one that matters: the subject going
      // clone-less. That is not a hypothetical — it is what this story did to the file this control
      // used to read, and every negative leg above would have passed over it in silence. Planted
      // strings cannot see a real subject empty, so the emptiness is asserted as a leg instead.
      assert.ok(assertStructural("", cloner).length > 0, "an EMPTY subject trips the detector rather than passing over nothing");
      assert.ok(
        assertStructural("export function admitWorkspaceRepo() { return { ws: null }; }", cloner).length > 0,
        "a subject declared as the one that clones, but containing no clone, trips the detector — the exact shape a later extraction would leave behind",
      );
      assert.deepEqual(
        assertStructural("export function handleDirective() { return null; }", { clones: false }),
        [],
        "…while a subject that is NOT declared as the cloner is not required to clone, so the handler this story emptied is not falsely red",
      );

      const plantedTmp = `${code}\nimport os from "node:os";\nasync function plantedClone(d) { return path.join(os.tmpdir(), d.workspaceId); }\n`;
      assert.ok(assertStructural(plantedTmp, cloner).length > 0, "a planted os.tmpdir() clone target trips the detector");

      const plantedRefPath = `${code}\nasync function plantedClone2(root, directive) { return path.join(root, directive.itemRef); }\n`;
      assert.ok(assertStructural(plantedRefPath, cloner).length > 0, "a clone target built from directive text trips the detector");

      // The "clone present but no scoped seam anywhere in the module" proof is a
      // module-wide co-occurrence check (by design — proof #2 above already pins the
      // per-call-site path.join discipline). Once the real clone HAS landed (as it has
      // here), the module always legitimately contains meshCheckoutPath(...), so
      // appending a raw clone to the real source can never re-trip that specific
      // co-occurrence rule. Exercise it non-vacuously against a SEAM-LESS baseline
      // (the real source with every meshCheckoutPath(...) reference stripped, as a
      // pre-clone module would have looked) — a bare `git clone` with no scoped seam
      // anywhere in that baseline must still trip.
      const seamlessBaseline = code.replace(/meshCheckoutPath\s*\([^)]*\)/g, "REMOVED_SEAM_CALL");
      assert.ok(!/meshCheckoutPath\s*\(/.test(seamlessBaseline), "the seamless baseline genuinely has no meshCheckoutPath(...) call");
      const seamlessWithRawClone = `${seamlessBaseline}\nasync function plantedClone4(exec, url, dest) { return exec(["clone", url, dest]); }\n`;
      assert.ok(assertStructural(seamlessWithRawClone, cloner).length > 0, "a git clone with NO meshCheckoutPath seam anywhere in the module trips the detector");
    },
  },
];
