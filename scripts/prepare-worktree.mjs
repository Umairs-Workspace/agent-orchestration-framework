// scripts/prepare-worktree.mjs — THE DECLARED `work.worktree.prepare` STEP (72/ADR-007).
//
// WHY A SCRIPT AND NOT `npm ci` DECLARED DIRECTLY. The prepare seam hands the operating system an
// argument vector and no shell reads it (72/ADR-001 §5, `src/work-audit/spawn.mjs`). On Windows
// every package manager's entry point is a `.cmd` batch shim — a shell script — which Node refuses
// to spawn shell-lessly, and which `src/work/toolchain.mjs` therefore refuses to COMPILE as a
// declaration at all (`SHIM_EXTENSIONS`, `worktree-prepare-unresolvable`, and its `SHIM_REMEDY`:
// "declare an executable and the script it runs"). So `.aof/aof.config.json` names `node` — an
// executable on every platform this repo runs on — and this file is the script it runs. That is
// `scripts/ui-build.mjs`'s shape (`process.execPath` plus a `.js` entry inside `node_modules`) and
// it is here for the same reason.
//
// SHARING HAPPENS OUTSIDE THE TREE (ADR-007 §2). npm's content-addressable cache is user-level
// (`~/.npm`, `%LocalAppData%\npm-cache`) — outside every worktree by construction — so the install
// is cache-warm without anything being linked into the tree. NOTHING HERE CREATES A LINK: TECH_DEBT
// item 36 is a junctioned `node_modules` that `git worktree remove --force` followed out of the
// worktree and into the real tree, 113 tracked files gone. Dependencies arrive by INSTALL, and the
// install is the only thing this script does.
//
// THE INSTALL IS NOT NARROWED, AND THAT IS A MEASURED DECISION (chore 112, 2026-09-05). The review
// finding this chore was promoted from asked the fair question — the prepare installs the `ui`
// workspace on every dispatch, the whole install had been seen taking ~6 minutes, and no lane had
// measured whether the workspace has to be there. Measured, in a real detached worktree, three
// alternating runs each, `node_modules` cleared between runs:
//
//   | arm                                                 | median | packages | files | node_modules |
//   | --------------------------------------------------- | ------ | -------- | ----- | ------------ |
//   | `npm ci` (what this script runs)                     | 15.0s  | 158      | 8,216 | 198.5 MB     |
//   | `npm ci --workspaces=false --include-workspace-root` |  3.4s  |  42      | 1,262 |  82.5 MB     |
//   | `npm ci --omit=dev`                                  | 15.0s  | 147      | 7,514 | 158.7 MB     |
//
// Every median above is the SAME worktree — mixing a stripped fixture's timings with a worktree's
// would have made `--omit=dev` read as slower than the full install rather than identical to it.
// The package/file/byte columns are lockfile-determined and so context-independent.
//
// So the `ui` workspace is 77% of a cache-warm install (11.5s of 15.0s) and the lever is real. IT IS
// STILL NOT TAKEN, because BOTH narrowings break the suite every lane runs — not the ui lanes, EVERY
// lane — and each breaks it for its own reason:
//
//   · `--workspaces=false` drops `clsx`, `tailwind-merge` and `marked`. The ROOT test suite
//     esbuild-bundles REAL, unmodified `ui/src` components through `test/support/react-app-harness.mjs`
//     (`TerminalControl`, `SessionGrid`, `Markdown`, …). That harness substitutes `react`,
//     `react-dom`, `@xterm/*` and `lucide-react` — and nothing else, deliberately — so the rest
//     resolve from `node_modules` like any import. Measured: the narrowed tree reds
//     `test/session/terminal-harness-drives-a-grid.test.mjs` with `Could not resolve "clsx"` at
//     `ui/src/lib/utils.ts:1`. The workspace is not UI-lane weight; it is suite weight.
//   · `--omit=dev` is the wrong lever twice over. It saves NOTHING MEASURABLE — median 15.0s against
//     the full install's own 15.0s — because `ui`'s vite/react/tailwind are `dependencies` and not
//     `devDependencies`, so the weight it is aimed at is not the weight it removes. What it does
//     remove is the ROOT's `esbuild` and `ajv`: the bundler that harness runs on, and the validator
//     the schema suites need.
//
// A lane that touches `ui/` therefore does nothing special: the workspace it needs is already there,
// which is the point. Narrowing would have INVERTED that — every lane paying a red suite so that the
// ui lanes could pay an install the others had skipped.
//
// AND THE LINK HALF, ALSO MEASURED, because it is the half that reads as a hazard. A full install
// does create `node_modules/@aof/ui`, and on Windows it is a JUNCTION with an ABSOLUTE target —
// TECH_DEBT 36's mechanism exactly. Two facts bound it. First, the target is INTRA-TREE
// (`<worktree>/node_modules/@aof/ui` → `<worktree>/ui`), so a delete that follows it reaches only
// files the worktree removal was already taking; 36's incident was a junction aimed OUT of a scratch
// worktree and into the real tree, which is a shape npm's own workspace link cannot produce.
// Second — and this is the uncomfortable one — of the five removers probed against a junction
// pointing at a canary OUTSIDE the tree, `node fs.rm({recursive})`, `rm -rf`, PowerShell
// `Remove-Item -Recurse -Force` and `cmd rmdir /s /q` ALL unlink the reparse point and leave the
// canary intact, while `git worktree remove --force` (git 2.47.0.windows.1) TRAVERSES IT and empties
// the canary. The remover ADR-007 §3 blesses is the one remover that follows a junction. That does
// not change §3 — git-managed removal is still right, and the intra-tree target is what makes it
// safe here — but anyone who reads "removal stays git-managed" as "and therefore junctions are
// harmless" is reading it wrong, and 36's rule is still the operative one: the hazard is any
// recursive delete whose path crosses a junction into a git-managed directory.
//
// READ ADR-007 §2 PRECISELY, for the same reason. *"aof creates no symlink or junction whose path
// lies inside a worktree, ever"* is true as written and is about AOF'S OWN CODE — FF-7207 censuses
// `src/`. It is NOT the claim that no junction lies inside a prepared worktree: one does, on every
// dispatch, and this script's own `npm ci` is what puts it there. The two statements differ by who
// created the link, which is exactly the distinction that matters when the next reader is deciding
// whether a tree is junction-free before deleting something.
//
// The ~6 minutes that raised the finding cannot have been cache-warm; a cache-warm install here is
// 15 seconds. The cost this script carries is a cold cache once per machine, not per dispatch.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The tree to install INTO is this script's own repository root, derived from the script's location
// rather than from `cwd`. The seam already runs the step with `cwd` set to the worktree
// (`prepareWorktree`, `src/mesh/worktree.mjs`), and a worktree carries its own copy of this file —
// so the two agree. Deriving it is what keeps them agreeing when the step is run by hand.
const treeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// npm's OWN JavaScript entry, run through `process.execPath`. Three candidates, because the layout
// differs by platform and by installer, and a templated single path is a bug with a release fuse:
//
//   · `npm_execpath` — set when something already invoked us through npm. Taken only when it names
//     a `.js` file: under a `.cmd` shim it names the shim, which is the thing we cannot spawn.
//   · `<node dir>/node_modules/npm/…` — the Windows layout, where `node.exe` and `node_modules` are
//     siblings (`C:\Program Files\nodejs`, and nvm-windows' version directories).
//   · `<node dir>/../lib/node_modules/npm/…` — the POSIX layout, where `bin/node` sits beside
//     `lib/node_modules` (Homebrew, the Linux tarballs, nvm's version directories, and the WSL
//     worker node's own clone).
//
// Resolving to nothing is a REFUSAL naming the remedy, never a silent skip: a prepare step that
// quietly installed nothing is the invisible non-install ADR-007 §5 exists to keep sayable.
function resolveNpmCli() {
  const nodeDir = path.dirname(process.execPath);
  const fromEnv = process.env.npm_execpath;
  const candidates = [
    ...(typeof fromEnv === "string" && fromEnv.endsWith(".js") ? [fromEnv] : []),
    path.join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(nodeDir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  return candidates.map((candidate) => path.resolve(candidate)).find((candidate) => existsSync(candidate)) ?? null;
}

const npmCli = resolveNpmCli();
if (npmCli == null) {
  console.error(
    `prepare-worktree: npm's own CLI entry (npm-cli.js) was found at no known layout beside ${process.execPath}. ` +
      "The prepare seam spawns an argument vector with no shell, so a `.cmd`/`.bat` shim cannot be used — " +
      "install a Node distribution that ships npm, or point `npm_execpath` at an npm-cli.js.",
  );
  process.exit(1);
}

// `ci` when the lockfile is there, `install` when it is not. `ci` is the right verb for a freshly
// materialised worktree — it installs the resolved tree exactly, and it is the one that refuses when
// `package.json` and `package-lock.json` have drifted, which is a fault worth hearing about at the
// door rather than as a mystery three tests later.
const lockfile = path.join(treeRoot, "package-lock.json");
const verb = existsSync(lockfile) ? "ci" : "install";

console.log(`prepare-worktree: npm ${verb} in ${treeRoot}`);

// `stdio: "inherit"` so npm's own output reaches THIS process's stdout/stderr, which the bounded
// seam pipes and captures — ADR-007 §4 removes the half-installed tree on failure, so the diagnosis
// has to ride the thrown message rather than stay behind in the tree that carried it.
const result = spawnSync(process.execPath, [npmCli, verb], {
  cwd: treeRoot,
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(`prepare-worktree: npm ${verb} failed to start: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
