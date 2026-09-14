// Fitness function: acd-gate-propagation-never-discards (milestone 43 / ADR-008; EXTENDED by
// milestone 129 / story 05 as FF-12904, 129/ADR-002) —
//
//   "Gate propagation advances the item branch by fast-forward when possible and a real
//    MERGE otherwise — NEVER a rebase, a force-update or a reset. No worker commit is
//    ever discarded. A conflicting merge is aborted and refused, never left half-applied."
//
// WHY an ABSENCE is the right shape of guard. The gap is exact and is stated in the source
// itself (mesh-worker-execution.mjs:2369-2375): "The reuse doors ignore it by design: an
// existing line continues from where it is." Closing it means running a git operation
// against a branch that already carries the worker's commits — and every CONVENIENT way to
// do that destroys them: `rebase` rewrites the worker's history, `push --force` /
// `reset --hard` / `checkout -B` / `branch -f` / `update-ref` discard it outright. No
// scenario can prove an absence; a source guard can.
//
// The baseline is clean at HEAD and worth locking before the story lands: the only force
// in the path is `git worktree remove --force` (removing a WORKTREE, not a branch —
// sanctioned, and excluded from the detector by name), the only reset is a path-scoped
// `git reset -q -- .aof`, and the only push is a plain `git push origin <branch>`
// (mesh-worker-execution.mjs:583).
//
// 129/ADR-002 (FF-12904) — MERGE-HOME NEVER DISCARDS. The loop merges each lane home in the
// PRIMARY through the same verb (`advanceBranchToBase`), and three more modules now run git
// against a branch that carries commits: `src/work/dispatch.mjs` (the composed lane verbs),
// `src/loop/wave.mjs` and `src/loop/cycle.mjs`. They JOIN `BRANCH_PATH_MODULES` — an extension
// of this control, never a twin, so the ONE detector (`discardingOps`) judges all six; the
// sanctioned forms stay sanctioned (`worktree remove --force`, the path-scoped `reset -q -- .aof`
// that moved into `worktree.mjs` with `commitWorktreeChanges`, the two `merge` doors, the plain
// push); the ARMED leg — an `--abort` beside every `merge`, IN THE SAME MODULE — judges each
// module by its own argvs, `dispatch.mjs` included; and `advanceBranchToBase`'s `dirtyPolicy`
// literal set is pinned to exactly `{"strict", "touched-paths"}`, so a third policy is a decision
// somebody names rather than a string somebody spells.
//
// Proofs:
//  1. GREEN — no history-rewriting or force git operation exists in the branch-advance
//     path, across all six modules.
//  2. ARMED — once a `merge` verb appears in a module, an abort path exists BESIDE IT IN THAT
//     MODULE: a conflicting merge is `--abort`ed, never left for an agent to start a phase on.
//  3. PINNED — the dirty-policy vocabulary is exactly two, and an empty vocabulary is not a pin.
//  Self-check (m03 non-vacuous): each forbidden form trips the detector, every sanctioned form
//  does not, and each planted defect is caught by the same sweep the real tree is measured by —
//  driven over an injected loader, so no checkout is touched.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { functionBody, stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The modules that may run git against the item branch — posix, repo-relative, so a finding
// names the module the way the register does.
export const BRANCH_PATH_MODULES = Object.freeze([
  "src/mesh/worktree.mjs",
  "src/mesh/worker-execution.mjs",
  "src/mesh/recovery-push.mjs",
  // 129/ADR-002 — the merge-home path.
  "src/work/dispatch.mjs",
  "src/loop/wave.mjs",
  "src/loop/cycle.mjs",
]);
const WORKTREE = "src/mesh/worktree.mjs";
export const DIRTY_POLICIES = Object.freeze(["strict", "touched-paths"]);

// THE DEFAULT LOADER reads with `readFile` and nothing else — a member absent from disk REJECTS
// with ENOENT naming its path, and is never skipped into a green.
const readModule = (rel) => readFile(path.join(repoRoot, ...rel.split("/")), "utf8");

// Every git argv array in the module (the repo's exec seam is argv-only, never a shell
// string — mesh-worktree.mjs's own rule), flattened to a scannable token list.
export function gitArgvTokens(code) {
  const groups = [];
  const re = /\[\s*((?:"[^"]*"|'[^']*'|`[^`]*`|[^[\]])*?)\s*\]/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const tokens = [...m[1].matchAll(/["'`]([^"'`]*)["'`]/g)].map((t) => t[1]);
    if (tokens.length > 0) groups.push(tokens);
  }
  return groups;
}

// Forbidden = any git invocation that can DISCARD a commit. `worktree remove --force` is
// sanctioned by name (it removes a worktree, not history); `reset -- <path>` is a
// path-scoped unstage, not `reset --hard`.
export function discardingOps(tokenGroups) {
  const found = [];
  for (const tokens of tokenGroups) {
    const verb = tokens.find((t) => /^[a-z][a-z-]*$/.test(t)) ?? "";
    const joined = tokens.join(" ");
    if (tokens.includes("rebase")) found.push(`rebase: ${joined}`);
    if (tokens.includes("--hard")) found.push(`reset --hard: ${joined}`);
    if (tokens.includes("update-ref")) found.push(`update-ref: ${joined}`);
    if (tokens.includes("checkout") && tokens.includes("-B")) found.push(`checkout -B: ${joined}`);
    if (tokens.includes("branch") && (tokens.includes("-f") || tokens.includes("--force"))) found.push(`branch -f: ${joined}`);
    if (tokens.includes("push") && (tokens.includes("--force") || tokens.includes("--force-with-lease") || tokens.includes("-f"))) {
      found.push(`force push: ${joined}`);
    }
    // A bare `--force` is only sanctioned on `worktree remove`.
    if (tokens.includes("--force") && !(verb === "worktree" && tokens.includes("remove"))) {
      if (!found.some((f) => f.endsWith(joined))) found.push(`unsanctioned --force: ${joined}`);
    }
  }
  return found;
}

// ── THE SWEEPS, pure over an injected loader `load(rel) → source`, so a plant is drivable ──

// Proof 1 over every module of the set: `<module> — <hit>` per offender.
export async function forbiddenFormOffenders(load = readModule, modules = BRANCH_PATH_MODULES) {
  const offenders = [];
  for (const rel of modules) {
    const code = stripComments(await load(rel));
    for (const hit of discardingOps(gitArgvTokens(code))) offenders.push(`${rel} — ${hit}`);
  }
  return offenders;
}

// Proof 2, per module: a module whose argvs hold a `merge` (not `--abort`) must hold a
// `merge --abort` OF ITS OWN. Answers `{ problems, armed }` — `armed` names the modules whose
// merge verb the leg found, so a caller can tell "armed and green" from "nothing to arm".
export async function armedMergeProblems(load = readModule, modules = BRANCH_PATH_MODULES) {
  const problems = [];
  const armed = [];
  for (const rel of modules) {
    const groups = gitArgvTokens(stripComments(await load(rel)));
    const merges = groups.filter((tokens) => tokens.includes("merge") && !tokens.includes("--abort"));
    if (merges.length === 0) continue;
    armed.push(rel);
    const aborts = groups.filter((tokens) => tokens.includes("merge") && tokens.includes("--abort"));
    if (aborts.length === 0) {
      problems.push(`${rel} performs a merge (${merges.map((tokens) => tokens.join(" ")).join("; ")}) with no \`git merge --abort\` argv of its own — a conflicting advance must abort cleanly and refuse in the module that merged, never leave a half-merged tree for an agent to start a phase on; an abort in another module does not arm this one`);
    }
  }
  return { problems, armed };
}

// Proof 3: the strings `advanceBranchToBase` compares `dirtyPolicy` against — a direct
// `dirtyPolicy === "x"` (either side), or a `NAME.includes(dirtyPolicy)` whose NAME is a
// module-scope array literal of strings. The UNION is the vocabulary; an empty one is NOT FOUND.
export function dirtyPolicyLiteralSet(source) {
  const code = stripComments(source);
  const body = functionBody(code, "function advanceBranchToBase(");
  if (body == null) return null;
  const literals = new Set();
  for (const match of body.matchAll(/\bdirtyPolicy\s*(?:===|!==|==|!=)\s*["']([^"']+)["']/gu)) literals.add(match[1]);
  for (const match of body.matchAll(/["']([^"']+)["']\s*(?:===|!==|==|!=)\s*dirtyPolicy\b/gu)) literals.add(match[1]);
  for (const match of body.matchAll(/\b([A-Za-z_$][\w$]*)\.includes\(\s*dirtyPolicy\s*\)/gu)) {
    const declared = new RegExp(`\\b(?:const|let)\\s+${match[1]}\\s*=\\s*(?:Object\\.freeze\\(\\s*)?\\[([^\\]]*)\\]`, "u").exec(code);
    if (declared == null) continue;
    for (const member of declared[1].matchAll(/["']([^"']+)["']/gu)) literals.add(member[1]);
  }
  return [...literals].sort();
}

// A loader over the real modules with ONE planted, for the self-check.
const plantedLoader = (rel, mutate) => async (name) => {
  const source = await readModule(name);
  return name === rel ? mutate(source) : source;
};

export const archTests = [
  // VERIFICATION F-05.3 — the discard this invariant forbids was reached WITHOUT any
  // forbidden git verb. The reuse-door predicate asked only `refs/heads/<branch>`, so a
  // checkout holding the line at `refs/remotes/origin/<branch>` and nothing local was
  // judged to have no line at all: the CREATE door then based the item on the pinned
  // base and every commit the previous phase made became unreachable. No rebase, no
  // force, no reset — the history was discarded by NOT LOOKING for it.
  //
  // So this clause keys on the DATA the decision consumes, not on any spelling
  // (ADR-015/F1, ADR-016/G2): the branch-existence question must be asked of the remote
  // as well as of local heads, and the create door must be reachable only after both
  // have been asked.
  {
    name: "arch/43 ADR-008 (acd-gate-propagation-never-discards): the 'does this item already have a line?' question consults the REMOTE, not only local heads — a remote-only line must never be forked",
    run: async () => {
      const worktree = stripComments(await readModule(WORKTREE));
      assert.ok(
        /refs\/remotes\/[^"'`\s]*\$\{branch\}|refs\/remotes\/origin\//.test(worktree),
        "src/mesh/worktree.mjs never verifies a ref under refs/remotes/ — the branch-existence question is local-only, so a worker whose checkout has fetched the item's line but has no local head for it will take the create door and orphan the previous phase's commits (VERIFICATION F-05.3)",
      );

      const execution = stripComments(await readModule("src/mesh/worker-execution.mjs"));
      // The reuse/create decision must be fed by BOTH halves. Keyed on the predicates the
      // decision consumes rather than on the variable's name.
      assert.ok(
        /localBranchExists\s*\(/.test(execution) && /remoteBranchExists\s*\(/.test(execution),
        "src/mesh/worker-execution.mjs decides the reuse door without asking whether the branch exists on the remote — the item's line can then be forked (VERIFICATION F-05.3)",
      );
      assert.ok(
        /adoptRemoteBranch\s*\(/.test(execution),
        "src/mesh/worker-execution.mjs finds a remote-only line but never adopts it as a local head, so the reuse door (and its advance) cannot apply to it (VERIFICATION F-05.3)",
      );
    },
  },
  {
    name: "arch/43 ADR-008 (acd-gate-propagation-never-discards): no history-rewriting or force git operation exists on the branch-advance path — a worker commit can never be discarded",
    run: async () => {
      const offenders = await forbiddenFormOffenders();
      assert.deepEqual(
        offenders,
        [],
        `the branch advance must never rebase/force/reset (ADR-008; 129/ADR-002 over the merge-home path) — offenders: ${JSON.stringify(offenders)}`,
      );
    },
  },
  {
    name: "arch/43 ADR-008 (acd-gate-propagation-never-discards): ARMED — once mesh-worktree.mjs runs a `merge`, a `--abort` path exists beside it (a conflicted tree is never handed to an agent)",
    run: async () => {
      const code = stripComments(await readModule(WORKTREE));
      const groups = gitArgvTokens(code);
      const merges = groups.filter((tokens) => tokens.includes("merge") && !tokens.includes("--abort"));
      if (merges.length === 0) return; // pre-build: a clean skip that arms the moment the advance lands

      const aborts = groups.filter((tokens) => tokens.includes("merge") && tokens.includes("--abort"));
      assert.ok(
        aborts.length > 0,
        "src/mesh/worktree.mjs performs a merge with no `git merge --abort` path — a conflicting advance must abort cleanly and refuse (assignment-gate-propagation-conflict), never leave a half-merged tree for an agent to start a phase on",
      );
      // The advance must also be able to take the cheap door when it exists.
      assert.ok(
        groups.some((tokens) => tokens.includes("--ff-only")) || /ff-only/.test(code),
        "src/mesh/worktree.mjs merges without ever attempting --ff-only — the fast-forward case must not create a merge commit it does not need",
      );
    },
  },
  {
    name: "arch/43 ADR-008 (acd-gate-propagation-never-discards): self-check — every forbidden form trips the detector; `worktree remove --force` and a path-scoped reset do not",
    run: async () => {
      assert.ok(discardingOps([["rebase", "origin/main"]]).length > 0, "rebase trips the detector");
      assert.ok(discardingOps([["reset", "--hard", "HEAD~1"]]).length > 0, "reset --hard trips the detector");
      assert.ok(discardingOps([["push", "--force", "origin", "aof/mesh/43"]]).length > 0, "force push trips the detector");
      assert.ok(discardingOps([["push", "--force-with-lease", "origin", "aof/mesh/43"]]).length > 0, "force-with-lease trips the detector");
      assert.ok(discardingOps([["push", "-f", "origin", "aof/mesh/43"]]).length > 0, "push -f trips the detector");
      assert.ok(discardingOps([["checkout", "-B", "aof/mesh/43", "origin/main"]]).length > 0, "checkout -B trips the detector");
      assert.ok(discardingOps([["branch", "-f", "aof/mesh/43", "HEAD"]]).length > 0, "branch -f trips the detector");
      assert.ok(discardingOps([["branch", "--force", "aof/mesh/43", "HEAD"]]).length > 0, "branch --force trips the detector");
      assert.ok(discardingOps([["update-ref", "refs/heads/aof/mesh/43", "HEAD"]]).length > 0, "update-ref trips the detector");

      assert.deepEqual(discardingOps([["worktree", "remove", "--force", "/path"]]), [], "worktree remove --force is sanctioned (a worktree, not history)");
      assert.deepEqual(discardingOps([["reset", "-q", "--", ".aof"]]), [], "a path-scoped reset is sanctioned");
      assert.deepEqual(discardingOps([["merge", "--ff-only", "abc123"]]), [], "a fast-forward merge is the sanctioned advance");
      assert.deepEqual(discardingOps([["merge", "--no-ff", "abc123"]]), [], "a real merge is the sanctioned fallback (nothing is lost)");
      assert.deepEqual(discardingOps([["merge", "--no-ff", "--no-edit", "-m", "message", "abc123"]]), [], "…with a message, under the mesh identity");
      assert.deepEqual(discardingOps([["merge", "--abort"]]), [], "the abort is sanctioned — it is the discipline");
      assert.deepEqual(discardingOps([["push", "origin", "aof/mesh/43"]]), [], "the existing plain push is untouched");
      assert.deepEqual(discardingOps([["-c", "credential.helper=", "push", "origin", "aof/mesh/43"]]), [], "the worker's credential-less plain push is untouched");
      // 129/ADR-002 §2 — the loop's own-writes commit, scoped to the milestone's folder.
      assert.deepEqual(discardingOps([["add", "--", "wiki/work/129_milestone"]]), [], "a path-scoped add is sanctioned");
      assert.deepEqual(discardingOps([["commit", "--no-verify", "-m", "aof(loop): …"]]), [], "the own-writes commit is sanctioned");

      // The argv extractor sees the module's real call forms.
      const sample = 'const args = ["worktree", "add", "-b", options.branch, worktreePath, commitish];';
      const tokens = gitArgvTokens(sample);
      assert.ok(tokens.some((g) => g.includes("worktree") && g.includes("add")), "the argv extractor reads a real git argv array");
    },
  },

  // ── 129/ADR-002 — FF-12904: merge-home never discards ──────────────────────────────────
  {
    name: "arch/129/05 FF-12904 (acd-gate-propagation-never-discards): the module set is the six — the mesh's three and the merge-home path's three — and every member is read from disk, so an absent one is ENOENT and never a skip",
    run: async () => {
      assert.deepEqual(
        [...BRANCH_PATH_MODULES].sort(),
        ["src/loop/cycle.mjs", "src/loop/wave.mjs", "src/mesh/recovery-push.mjs", "src/mesh/worker-execution.mjs", "src/mesh/worktree.mjs", "src/work/dispatch.mjs"],
        "BRANCH_PATH_MODULES as a set",
      );
      for (const rel of BRANCH_PATH_MODULES) assert.ok((await readModule(rel)).length > 0, `${rel} was read`);
      // A member absent from disk rejects the sweep with ENOENT naming its path.
      await assert.rejects(
        forbiddenFormOffenders(readModule, [...BRANCH_PATH_MODULES, "src/loop/absent.mjs"]),
        (error) => error?.code === "ENOENT" && String(error?.message).includes("absent.mjs"),
        "an absent member fails the sweep with ENOENT naming its path",
      );
    },
  },
  {
    name: "arch/129/05 FF-12904 (acd-gate-propagation-never-discards): ARMED, per module — every `merge` argv has a `--abort` argv beside it IN THE SAME MODULE; dispatch.mjs, reaching merge only through advanceBranchToBase, has nothing of its own to arm on",
    run: async () => {
      const { problems, armed } = await armedMergeProblems();
      assert.ok(armed.includes(WORKTREE), `${WORKTREE}: NOT FOUND — the one merge verb's home holds no merge argv; the armed leg is reading the wrong tree`);
      assert.deepEqual(problems, [], `every merge is armed in its own module:\n${problems.join("\n")}`);
      assert.equal(armed.includes("src/work/dispatch.mjs"), false, "dispatch.mjs spells no merge argv of its own — it composes the verb (129/03)");
    },
  },
  {
    name: "arch/129/05 FF-12904 (acd-gate-propagation-never-discards): advanceBranchToBase's dirtyPolicy literal set is pinned to exactly strict and touched-paths — a third policy is a decision somebody names",
    run: async () => {
      const set = dirtyPolicyLiteralSet(await readModule(WORKTREE));
      assert.ok(set != null, `${WORKTREE}: NOT FOUND — no advanceBranchToBase( declaration`);
      assert.ok(set.length > 0, `${WORKTREE}: NOT FOUND — advanceBranchToBase compares dirtyPolicy against nothing; an empty set is not a pin`);
      assert.deepEqual(set, [...DIRTY_POLICIES].sort(), `the dirtyPolicy literal set is exactly ${DIRTY_POLICIES.join(", ")} — found ${set.join(", ")}${set.filter((policy) => !DIRTY_POLICIES.includes(policy)).map((policy) => `; \`${policy}\` is a policy 129/ADR-002 §1 does not name`).join("")}`);
    },
  },
  {
    name: "arch/129/05 FF-12904 (acd-gate-propagation-never-discards): self-check — each planted defect in a merge-home module is caught by the one sweep the real tree is measured by, and the sanctioned forms leave it green",
    run: async () => {
      const plant = (rel, argv) => plantedLoader(rel, (source) => `${source}\nexport const plant = (exec) => exec([${argv}]);\n`);
      const rows = [
        ["src/work/dispatch.mjs", '"reset", "--hard", base', "src/work/dispatch.mjs — reset --hard: reset --hard"],
        ["src/work/dispatch.mjs", '"checkout", "-B", branch, base', "src/work/dispatch.mjs — checkout -B: checkout -B"],
        ["src/work/dispatch.mjs", '"push", "-f", "origin", branch', "src/work/dispatch.mjs — force push: push -f origin"],
        ["src/loop/wave.mjs", '"rebase", "main"', "src/loop/wave.mjs — rebase: rebase main"],
        ["src/loop/wave.mjs", '"branch", "-f", branch, tip', "src/loop/wave.mjs — branch -f: branch -f"],
        ["src/loop/wave.mjs", '"update-ref", "refs/heads/main", tip', "src/loop/wave.mjs — update-ref: update-ref refs/heads/main"],
        ["src/loop/cycle.mjs", '"push", "--force-with-lease", "origin"', "src/loop/cycle.mjs — force push: push --force-with-lease origin"],
        ["src/loop/cycle.mjs", '"push", "--force", "origin", branch', "src/loop/cycle.mjs — force push: push --force origin"],
        ["src/loop/cycle.mjs", '"branch", "--force", branch, tip', "src/loop/cycle.mjs — branch -f: branch --force"],
      ];
      for (const [rel, argv, expected] of rows) {
        const offenders = await forbiddenFormOffenders(plant(rel, argv));
        assert.deepEqual(offenders, [expected], `[${argv}] in ${rel} is the one offender`);
      }
      for (const [rel, argv] of [
        ["src/work/dispatch.mjs", '"worktree", "remove", "--force", lanePath'],
        ["src/work/dispatch.mjs", '"reset", "-q", "--", ".aof"'],
        ["src/work/dispatch.mjs", '"add", "--", milestoneDir'],
        ["src/work/dispatch.mjs", '"commit", "--no-verify", "-m", message'],
        ["src/mesh/worker-execution.mjs", '"-c", "credential.helper=", "push", "origin", branch'],
      ]) {
        assert.deepEqual(await forbiddenFormOffenders(plant(rel, argv)), [], `[${argv}] in ${rel} is sanctioned`);
      }

      // ARMED, per module: a merge in dispatch.mjs with no abort of its own — even while
      // worktree.mjs holds one — is named; an abort removed from worktree.mjs is named.
      const unarmed = await armedMergeProblems(plant("src/work/dispatch.mjs", '"merge", "--no-ff", tip'));
      assert.ok(unarmed.armed.includes("src/work/dispatch.mjs"), "the planted merge was found");
      assert.ok(unarmed.problems.some((problem) => problem.includes("src/work/dispatch.mjs") && problem.includes("--abort")), `an unarmed merge in dispatch.mjs is named:\n${unarmed.problems.join("\n")}`);
      const disarmed = await armedMergeProblems(plantedLoader(WORKTREE, (source) => source.replace('["merge", "--abort"]', '["merge-base", "HEAD"]')));
      assert.ok(disarmed.problems.some((problem) => problem.includes(WORKTREE) && problem.includes("--abort")), `worktree.mjs with its abort removed is named:\n${disarmed.problems.join("\n")}`);
      const armedBoth = await armedMergeProblems(plant("src/work/dispatch.mjs", '"merge", "--no-ff", tip], ["merge", "--abort"'));
      assert.deepEqual(armedBoth.problems, [], "a merge with an abort beside it in the same module is armed");

      // PINNED: a third comparison is named; no comparison is NOT FOUND.
      const source = await readModule(WORKTREE);
      const lenient = dirtyPolicyLiteralSet(source.replace('if (dirtyPolicy === "strict") {', 'if (dirtyPolicy === "lenient") {} else if (dirtyPolicy === "strict") {'));
      assert.deepEqual(lenient, ["lenient", "strict", "touched-paths"], "a `lenient` comparison joins the set the leg reports");
      const none = dirtyPolicyLiteralSet(source.replace(/DIRTY_POLICIES\.includes\(dirtyPolicy\)/u, "true").replace(/dirtyPolicy === "strict"/u, "options.strict"));
      assert.deepEqual(none, [], "with every comparison removed the set is empty — NOT FOUND, never a green");
      assert.equal(dirtyPolicyLiteralSet(source.replace("function advanceBranchToBase(", "function advanceElsewhere(")), null, "with the verb renamed the leg finds no function");
    },
  },
];
