// Fitness function: acd-ui-directory-budget (m49 / ADR-001 §"the tree-level cost is admitted";
// TECH_DEBT items 28 and 33, fix (b)) —
//
//   "Six per-file ceilings cannot see a tree that grows by ADDING FILES. A ninth top-level
//    directory is a DECISION, and it needs a table entry rather than a diff."
//
// IT LANDS WITH THE DIFF THAT CREATES `ui/src/home/`, because a ratchet authored after the
// growth it was meant to question is a ratchet that RATIFIES it (49/ARCHITECTURE bad cut 4).
//
// ── THE MEASUREMENT THAT BUYS IT, and it is the whole argument ────────────────────────────
// `ui/src` went 54 -> 71 -> 91 -> 99 files across four milestones (+83%) and 10,887 -> 20,228
// lines (+86%), with EVERY per-file gate green throughout: m46 +17 files, m47 +8, m48 +0, m49
// ~+9 and an 8th top-level directory. The tree grows by ADDING FILES, which is the one shape a
// per-file ceiling is structurally blind to — and worse, it is the shape the per-file ceiling
// REWARDS, because the sanctioned remedy for a large file is a new sibling with a prop
// boundary. TECH_DEBT item 33 says so in terms: "the correct per-file move and the tree-level
// degradation are the same move ... Fix (b) has stopped being a suggestion."
//
// ── THE MODEL, and it is `acd-ui-surface-file-budget`'s, one level up ─────────────────────
// A NAMED table with a per-entry ceiling and a `why` that names the next extraction; a
// self-check that every budgeted subject still EXISTS ("a budget entry naming a file that is no
// longer on disk makes the ratchet guard a number that is not true"); a BOTH-DIRECTIONS sweep,
// because a table naming seven of eight directories passes silently on the eighth — the same
// vacuity `BUDGET_REQUIRED_ABOVE` was added to close for files; and a non-vacuity clause that
// the sweep really swept, because a rename of `ui/src` would otherwise empty the loop and leave
// a guard that guards nothing.
//
// ── THE ROOT IS BUDGETED TOO, and that clause is QA's ────────────────────────────────────
// ARCHITECTURE specifies "a NAMED, explicit list of `ui/src/*` top-level directories ... plus a
// per-directory FILE-COUNT ceiling" and says nothing about the root. Driven, that leaves the
// cheapest possible route past the gate wide open: nine new files in `ui/src` itself breach
// nothing. The `src/` half of this codebase already meters exactly that — ARCHITECTURE's own
// health table records "`src/` root-level `.mjs` 109 — flat — item 10's ratchet is holding",
// which is the strongest available evidence that a root counter works. One extra table row is
// the whole cost.
//
// ── EVERY ALLOWANCE IS ZERO, AND THAT IS THE POINT ───────────────────────────────────────
// A ceiling set above the delivered tree "for headroom" is the ratifying move bad cut 4 names,
// and it is what makes the 9th directory a diff instead of a conversation. So each entry
// DECLARES its allowance and every one of them is 0: the ceiling IS the delivered count. The
// asymmetry `acd-ui-surface-file-budget`'s table records for FILES — "just above delivered,
// because that size is debt this story did not create" — does not transfer, because the debt
// here is not any one directory's size, it is the HABIT of adding files, and every milestone
// participates in that habit equally.
//
// ── PLANTS NEVER TOUCH THE REAL TREE ─────────────────────────────────────────────────────
// No lane may `mkdir ui/src/<plant>`: it races every other suite reading the same tree, and a
// crashed run leaves the plant behind so every subsequent run is red for the wrong reason.
// Plants are SYNTHESIZED LISTINGS handed to the shipped detector — never a copy of it (m46's
// mutation review found a plant fed to a locally re-implemented `affordanceFormViolations`, so
// the shipped detector was never once driven to a violation). Every plant asserts it LANDED
// before the detector is asked, and the clean listing is shown quiet in the same lane.
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isUiSourceFile } from "../../support/ui-source-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const UI_SRC_ROOT = "ui/src";

// The root's own entry, kept beside the directories rather than inside them so the arithmetic
// (`total = per-directory + root`) reads as the sum it is.
export const UI_ROOT_BUDGET = Object.freeze({
  directory: UI_SRC_ROOT,
  ceiling: 2,
  allowance: 0,
  why: "the two files that BOOTSTRAP the tree — `main.tsx` and `vite-env.d.ts`. Nothing else belongs at the root: a third root module is the cheapest route past every per-directory ceiling below, and the next bootstrap concern belongs in `ui/src/app/` with the rest of the host set.",
});

// THE NAMED TABLE. Eight top-level directories, measured 2026-08-13 in the working tree by the
// shared predicate, and a ninth is a decision rather than a diff.
export const UI_DIRECTORY_BUDGETS = Object.freeze([
  Object.freeze({
    directory: "app",
    ceiling: 13,
    allowance: 0,
    why: "the HOST set — the shell, the router, the entry plan and the layout vocabulary. LOWERED 13 -> 12 by 49/03 because 49/04 DELETED `Landing.tsx`: a deletion RETURNS the slot rather than banking it, and that is the direction of this ratchet nobody remembers to check. A freed slot left in the ceiling is a silent permission for the next file, granted by a story that was removing one — which is how a budget stops describing the tree it meters. RAISED 12 -> 13 on 2026-09-12 for `ShellNav.tsx`, and it is a CUT rather than a new domain — the one `acd-ui-surface-file-budget`'s entry for `Shell.tsx` named in advance (\"the top bar and the nav are the two obvious cuts\"): the shell stood at 929 of 940 and DG-45-5's producer, the origin probe m45 deferred and m47 carried as DG-47-6, needed a home. Per-file said sibling, this table said no file, and the tie is broken here, in the row, with the shell's own ceiling lowered 940 -> 860 in the same diff so the cut returns its lines rather than banking them. The next growth here is still a CUT out of `shell-layout.mjs` (item 33 fix (a) names `shell-fullscreen.mjs` as its own first extraction); a new DOMAIN belongs in a directory of its own, and that is a table row.",
  }),
  Object.freeze({
    directory: "board",
    ceiling: 22,
    allowance: 0,
    why: "the board surface — and TECH_DEBT 18(a)'s accidental shared library, which the fleet still reaches into five times. Its next growth should be a MOVE: the shared parts out to `ui/src/components/` or `ui/src/terminal/`, which both other surfaces already import DOWN into. A new sibling here deepens the coupling this directory is already the measured instance of. RAISED 21 -> 22 on 2026-09-15 for `ArchivedPill.tsx` (127/04), and the choice is STATED rather than taken quietly: 127/DESIGN §\"The archived mark\" names the file and its home — a sibling of `StaleBadge.tsx`, because the mark is a new READ-ONLY vocabulary of the BOARD and not a sixth status — and the fleet deliberately paints no pill (the fleet partitions the backlog and leaves the archive to its status filter, unmarked), so this is not a shared part the fleet reaches into and not the coupling this row meters. The MOVE this row is right to want is unchanged and still owed: the parts the fleet imports from here.",
  }),
  Object.freeze({
    directory: "components",
    ceiling: 7,
    allowance: 0,
    why: "the tree's ACTUAL shared home, and the smallest of the eight. It is the one directory whose growth is usually right — but a component earns a place here by having TWO surface importers, so the next addition is a PROMOTION out of a surface directory, which is net-zero on the tree, and never a new primitive written straight into it.",
  }),
  Object.freeze({
    directory: "config",
    ceiling: 4,
    allowance: 0,
    why: "the config editor. `App.tsx` is 1,298 of its 1,300-line ceiling, so the next region there MUST become a sibling module in this directory — which is the one growth this table expects to be asked for, and it should be asked for rather than taken.",
  }),
  Object.freeze({
    directory: "fleet",
    ceiling: 20,
    allowance: 0,
    why: "the fleet surface — 12 -> 20 files in milestone 47 alone (+67%), the second-largest directory and the fastest-growing. Its next cut belongs INSIDE its existing modules (`Fleet.tsx`'s regions are already separate components in one file), or in `ui/src/components/` if a second surface wants it. A ninth new sibling here is the m47 curve continuing.",
  }),
  Object.freeze({
    directory: "home",
    ceiling: 18,
    allowance: 0,
    why: "the terminals home, created by milestone 49. RAISED 6 -> 12 across two stories, and the raise is the conversation this ratchet exists to force rather than a re-fit: 49/02 delivered the three decision modules with their `.d.mts` siblings (6), 49/04 the page and its state module (9), and 49/03 the pane's mount declaration, its `.d.mts` and the ONE component that mounts the control (12). EVERY ONE OF THOSE THREE IS LOAD-BEARING AND NONE IS A CONVENIENCE: `session-mount.mjs` is the surface's single posture author, which invariant 4's amended part 1 names by path; its `.d.mts` is ADR-001's split, not optional; and `SessionPane.tsx` is the mount SITE that same amendment's per-surface floor requires to exist, without which the gate is either red or vacuous about the one interactive surface this milestone adds. THE NEXT RAISE IS 49/05's AND IT SHOULD BE ARGUED HARDER THAN THIS ONE: the grid, the roving focus and the live region are the LAST additions this directory has a reason for, and each of them should ask whether it is a new file or a region of `Home.tsx`/`SessionPane.tsx` — the whole point of a domain folder is that its members are the domain's nouns, and by 05 they will all have been named. A member added after that is a decision to split a noun, and it belongs in `ui/src/components/` or `ui/src/terminal/` if a second surface wants it. RAISED 12 -> 15 BY 49/05, AND THE ARGUMENT IS THE ONE THE ENTRY ABOVE DEMANDED. Three files, and each was measured against the two alternatives that clause names — a region of `Home.tsx`, or a region of `SessionPane.tsx`: (1) `grid.mjs` IS the noun ADR-001 enumerates by name (\"the grid, the pane's mount declaration, the feed axis, the subscription arbiter and the layout composer\") and it holds ONE noun's answers to one question — which rows, in what order, which holds the keyboard, what the live region says — because all four read the same two inputs and splitting them would be three modules importing one another and a fourth chance to disagree about what a tile IS; (2) its `.d.mts` is ADR-001's split, which is not optional; (3) `SessionGrid.tsx` cannot be either alternative — `SessionPane.tsx` is ONE tile and invariant 4's per-surface floor requires that it stay the surface's only mount site, while putting the grid's five pieces of cross-tile state (the intents, the previous arbitration, the roving stop, the painted set, the announcement) into `Home.tsx` would put the page's fetch and the grid's arbitration in one component and hand story 04's file a second author. THE DIRECTORY IS NOW COMPLETE: every noun the domain has is named, and the next member is a decision to SPLIT one — which belongs in `ui/src/components/` or `ui/src/terminal/` if a second surface wants it, and needs an ADR either way. RAISED 15 -> 18 BY 50/04, AND IT IS THE ADR THE CLAUSE ABOVE DEMANDED (50/ADR-008 decision 10, argued BEFORE the files existed — the first raise in this tree that was): the launcher is NOT a split of an existing noun, it is the domain's first WRITER, where all fifteen existing members are readers. Three files, each measured against the alternatives that clause names: (1) `session-launcher.mjs` must be a module, not a region of `Home.tsx` — this repo has no React test harness and \"a rule that can only be exercised through a component is a rule with no test\" (`feed-axis.mjs:6-9`), while the thing being ruled is DESIGN's eight-state machine, its two deadlines and a fourteen-row code->language map; (2) its `.d.mts` is 49/ADR-001's split, which is not optional; (3) `SessionLauncher.tsx` is the ONE component (trigger + panel) and cannot be either alternative — `Home.tsx` already owns the page's fetch and its five page states, and this entry's own words warn against handing it a second author, while `ui/src/components/` is for what a SECOND surface imports and nothing else launches sessions (the accidental-shared-library shape TECH_DEBT 18(a) records). `ui/src/fleet/` is forbidden outright: `ui/src/home/` may import nothing from it (49/ADR-001, gated). THE NEXT MEMBER IS STILL A SPLIT, and this raise does not reopen that: the domain now has a reader set and one writer, and a SECOND writer would be the conversation to have.",
  }),
  Object.freeze({
    directory: "lib",
    ceiling: 1,
    allowance: 0,
    why: "one module. A directory holding a single file is a naming decision waiting to be made: the next thing that wants to live here should either JOIN that module or prove there is a second member, and if it empties out this table must say so rather than go on guarding a number about a directory nobody uses.",
  }),
  Object.freeze({
    directory: "terminal",
    ceiling: 30,
    allowance: 0,
    why: "the ONE terminal control and its framework-free core — the largest directory, and the one whose per-file ceilings (`TerminalControl.tsx` 840) already do real work. Its next growth is a MOVE out of `TerminalControl.tsx` into an existing module here, not a new pair: m46 promised this subtree net-negative and shipped 2.2x the files (TECH_DEBT 28), and that prediction is the part worth ratcheting.",
  }),
]);

// A directory whose count is within 5% of its ceiling is REPORTED, never failed. That is what
// turns an alarm into a ratchet: the milestone that is ABOUT to spend the last of a budget finds
// out at its own review rather than at the next one's. A warning that can fail CI is a ceiling
// with a second, softer number, which is two ceilings.
const WARNING_BAND = 0.05;

const dirLabel = (directory) => (directory === UI_SRC_ROOT ? UI_SRC_ROOT : `${UI_SRC_ROOT}/${directory}/`);

// ── THE LISTING ──────────────────────────────────────────────────────────────────────────
// The detector takes a TREE LISTING, so a plant is synthesized data and never a directory on
// disk. `readUiTreeListing` is the one place that touches the filesystem, and it FAILS rather
// than returning an empty listing when it cannot read the root — an empty answer from a sweep
// is indistinguishable from a clean tree unless the sweep says how much it saw.
export async function readUiTreeListing(root = UI_SRC_ROOT) {
  const listing = [];
  const walk = async (relative) => {
    const entries = await readdir(path.join(repoRoot, relative), { withFileTypes: true });
    for (const entry of entries) {
      const next = `${relative}/${entry.name}`;
      const within = next.slice(root.length + 1);
      if (entry.isDirectory()) {
        listing.push({ path: within, kind: "dir" });
        await walk(next);
      } else {
        listing.push({ path: within, kind: "file" });
      }
    }
  };
  try {
    await walk(root);
  } catch (error) {
    throw new Error(
      `acd-ui-directory-budget could not read \`${root}\` (${error?.code ?? error?.message}). A sweep that cannot see the tree must FAIL: an empty violations array from a walk that never walked is indistinguishable from a clean tree, and a rename of \`ui/src\` would otherwise leave a guard that guards nothing.`,
    );
  }
  return listing;
}

function tally(listing) {
  if (!Array.isArray(listing)) {
    throw new Error(
      "acd-ui-directory-budget was handed a listing that is not an array. A sweep that cannot see the tree FAILS, naming what it could not read — it never returns an empty violations array.",
    );
  }
  if (listing.length === 0) {
    throw new Error(
      "acd-ui-directory-budget was handed an EMPTY listing: no directories and no files at all. `ui/src` is never empty, so this is a sweep that did not see the tree, not a clean tree.",
    );
  }

  const counts = new Map();
  let rootFiles = 0;
  let scannedFiles = 0;
  for (const entry of listing) {
    const relative = typeof entry === "string" ? entry : entry?.path;
    if (typeof relative !== "string" || relative === "") continue;
    const segments = relative.split("/");
    const top = segments[0];
    const isDirectory = typeof entry === "object" && entry?.kind === "dir";
    if (isDirectory) {
      if (!counts.has(top)) counts.set(top, 0);
      continue;
    }
    if (!isUiSourceFile(segments[segments.length - 1])) continue;
    scannedFiles += 1;
    if (segments.length === 1) {
      rootFiles += 1;
      continue;
    }
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }

  if (counts.size === 0) {
    throw new Error(
      "acd-ui-directory-budget saw NO top-level directories under `ui/src`. Every directory vanishing is a sweep that did not see the tree, and it must fail rather than report a clean run.",
    );
  }
  return { counts, rootFiles, scannedFiles };
}

/**
 * The shipped detector. Returns `{ violations, report }` — the violations are the refusals, the
 * report is the non-failing summary a green run leaves behind as evidence rather than silence.
 */
export function uiDirectoryBudget(listing, table = UI_DIRECTORY_BUDGETS, rootBudget = UI_ROOT_BUDGET) {
  const { counts, rootFiles, scannedFiles } = tally(listing);
  const budgets = new Map((table ?? []).map((entry) => [entry.directory, entry]));

  const violations = [];
  const directories = [];

  for (const [directory, measured] of [...counts.entries()].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))) {
    const budget = budgets.get(directory);
    const label = dirLabel(directory);
    if (budget == null) {
      violations.push({
        directory: label,
        measured,
        ceiling: null,
        message: `${label} is a NEW top-level directory under ${UI_SRC_ROOT}, holding ${measured} source files, and it is not in this gate's table. A new top-level directory is a DECISION and needs a table entry — with a stated ceiling and a \`why\` — not a diff. The cost this gate meters is the DIRECTORY, so an EMPTY one fires just the same. (m49/ADR-001; TECH_DEBT 28/33 fix (b).)`,
      });
      directories.push({ directory: label, measured, ceiling: null, allowance: null, headroom: null, nearBudget: false });
      continue;
    }
    if (measured === 0) {
      violations.push({
        directory: label,
        measured,
        ceiling: budget.ceiling,
        message: `${label} is named in this gate's table with a ceiling of ${budget.ceiling} and holds ${measured} source files. A budget entry naming a directory nobody uses makes the ratchet guard a number that is not true — remove the entry or re-aim it.`,
      });
    } else if (measured > budget.ceiling) {
      violations.push({
        directory: label,
        measured,
        ceiling: budget.ceiling,
        message: `${label} holds ${measured} source files, over its ceiling of ${budget.ceiling}. ${budget.why} Raising this number is a decision that needs a stated reason in this table — not a diff, and NEVER by deleting rationale (ADR-014/E3).`,
      });
    }
    const headroom = budget.ceiling - measured;
    directories.push({
      directory: label,
      measured,
      ceiling: budget.ceiling,
      allowance: budget.allowance,
      headroom,
      nearBudget: measured * 100 >= budget.ceiling * (100 - WARNING_BAND * 100),
    });
  }

  for (const budget of table ?? []) {
    if (counts.has(budget.directory)) continue;
    const label = dirLabel(budget.directory);
    violations.push({
      directory: label,
      measured: null,
      ceiling: budget.ceiling,
      message: `${label} is named in this gate's table and is NOT in the tree. The table and the tree must agree in BOTH directions: a table naming a directory that no longer exists guards a number about nothing, and reads green while doing it.`,
    });
    directories.push({ directory: label, measured: null, ceiling: budget.ceiling, allowance: budget.allowance, headroom: null, nearBudget: false });
  }

  const rootLabel = dirLabel(UI_SRC_ROOT);
  if (rootBudget != null && rootFiles > rootBudget.ceiling) {
    violations.push({
      directory: rootLabel,
      measured: rootFiles,
      ceiling: rootBudget.ceiling,
      message: `the ROOT of ${UI_SRC_ROOT} holds ${rootFiles} source files, over its ceiling of ${rootBudget.ceiling}. ${rootBudget.why} "Put it in the root" is not the way past the per-directory ceilings.`,
    });
  }

  const root =
    rootBudget == null
      ? { directory: rootLabel, measured: rootFiles, ceiling: null, allowance: null, headroom: null, nearBudget: false }
      : {
          directory: rootLabel,
          measured: rootFiles,
          ceiling: rootBudget.ceiling,
          allowance: rootBudget.allowance,
          headroom: rootBudget.ceiling - rootFiles,
          nearBudget: rootFiles * 100 >= rootBudget.ceiling * (100 - WARNING_BAND * 100),
        };

  const directoryFiles = [...counts.values()].reduce((sum, value) => sum + value, 0);
  const report = {
    directories,
    root,
    directoryFiles,
    rootFiles,
    // The gate's own arithmetic, stated so it CLOSES: a total that does not equal the sum of
    // its parts is a total nobody can reconcile against ARCHITECTURE's health table.
    totalFiles: directoryFiles + rootFiles,
    scannedFiles,
    nearBudget: [...directories.filter((entry) => entry.nearBudget).map((entry) => entry.directory), ...(root.nearBudget ? [root.directory] : [])],
  };

  return { violations, report };
}

/** The violations function by the name the contract uses. Same detector, no second copy. */
export function uiDirectoryBudgetViolations(listing, table = UI_DIRECTORY_BUDGETS, rootBudget = UI_ROOT_BUDGET) {
  return uiDirectoryBudget(listing, table, rootBudget).violations;
}

export const archTests = [
  {
    name: "arch/49 ADR-001 (acd-ui-directory-budget): the real ui/src tree is inside every declared ceiling, and the table and the tree agree in BOTH directions",
    run: async () => {
      const listing = await readUiTreeListing();
      const { violations, report } = uiDirectoryBudget(listing);
      assert.deepEqual(
        violations.map((violation) => violation.message),
        [],
        "the ui/src tree is over a declared directory budget (see the message for the directory, the count and the ceiling)",
      );

      // NON-VACUOUS: the walk really walked. A rename of `ui/src` would otherwise empty the
      // loop and leave a guard that guards nothing — the exact shape m46 keeps finding.
      assert.ok(report.scannedFiles > 50, `ui/src was actually walked: ${report.scannedFiles} source files`);
      assert.ok(report.directories.length >= 8, `…across ${report.directories.length} top-level directories`);
      assert.equal(report.totalFiles, report.directoryFiles + report.rootFiles, "the gate's own arithmetic closes");
      for (const entry of report.directories) {
        assert.ok(Number.isInteger(entry.ceiling) && entry.ceiling > 0, `${entry.directory}: the ceiling is a positive integer`);
        assert.ok(Number.isInteger(entry.measured) && entry.measured > 0, `${entry.directory}: it was actually counted`);
      }
    },
  },

  {
    name: "arch/49 ADR-001 (acd-ui-directory-budget): the delivered numbers are the DELIVERED TREE and not a headroom allowance — every entry declares its allowance, carries a `why`, and ui/src/home/ is budgeted in the diff that creates it",
    run: async () => {
      const listing = await readUiTreeListing();
      const { report } = uiDirectoryBudget(listing);
      const measured = new Map(report.directories.map((entry) => [entry.directory, entry.measured]));

      assert.ok(UI_DIRECTORY_BUDGETS.length > 0, "the table is populated (non-vacuous)");
      const overshoot = [];
      let allowances = 0;
      let ceilings = 0;
      for (const budget of [...UI_DIRECTORY_BUDGETS, UI_ROOT_BUDGET]) {
        const label = dirLabel(budget.directory);
        assert.ok(Number.isInteger(budget.ceiling) && budget.ceiling > 0, `${label}: the ceiling is a positive integer`);
        assert.ok(Number.isInteger(budget.allowance) && budget.allowance >= 0, `${label}: the entry DECLARES its own allowance`);
        assert.ok(
          typeof budget.why === "string" && budget.why.length > 80,
          `${label}: the entry carries a \`why\` naming what the NEXT growth should do instead of adding a sibling`,
        );
        const count = budget.directory === UI_SRC_ROOT ? report.rootFiles : measured.get(label);
        if (budget.ceiling > count + budget.allowance) overshoot.push(`${label} (ceiling ${budget.ceiling}, delivered ${count}, allowance ${budget.allowance})`);
        allowances += budget.allowance;
        ceilings += budget.ceiling;
      }
      assert.deepEqual(
        overshoot,
        [],
        "a ceiling set above the delivered tree 'for headroom' is the ratifying move ARCHITECTURE's bad cut 4 names, and it is what makes the next directory a diff instead of a conversation",
      );
      assert.ok(
        ceilings <= report.totalFiles + allowances,
        `the sum of every ceiling (${ceilings}) is not greater than the delivered file count (${report.totalFiles}) plus the declared allowances (${allowances})`,
      );

      const home = UI_DIRECTORY_BUDGETS.find((budget) => budget.directory === "home");
      assert.ok(home != null, "`ui/src/home/`'s own entry is present in the SAME diff that creates the directory");
      assert.equal(measured.get("ui/src/home/"), home.ceiling, "…and it is set AT the delivered count, not above it");
    },
  },

  {
    name: "arch/49 ADR-001 (acd-ui-directory-budget): the detector FIRES on a synthesized 9th top-level directory, and is quiet on the clean listing in the same lane",
    run: async () => {
      const clean = await readUiTreeListing();
      const planted = [...clean, { path: "panels", kind: "dir" }, { path: "panels/Panels.tsx", kind: "file" }, { path: "panels/panels.mjs", kind: "file" }];
      assert.notDeepEqual(planted, clean, "the plant LANDED — the synthesized listing differs from the clean one");

      const violations = uiDirectoryBudgetViolations(planted);
      assert.ok(violations.length >= 1, "a 9th top-level directory fires the shipped detector");
      assert.ok(
        violations.some((violation) => violation.directory === "ui/src/panels/" && /DECISION and needs a table entry/.test(violation.message)),
        `the refusal names ui/src/panels/ and says a new top-level directory is a decision, not a diff: ${JSON.stringify(violations)}`,
      );
      assert.deepEqual(uiDirectoryBudgetViolations(clean), [], "…and the CLEAN listing, in this same lane, returns none");
    },
  },
];
