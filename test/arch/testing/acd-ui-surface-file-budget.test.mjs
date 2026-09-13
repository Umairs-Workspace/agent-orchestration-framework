// Fitness function: acd-ui-surface-file-budget (m43 / ADR-015/F2) —
//
//   "A React surface file gains CHILD COMPONENTS, not blocks. The `ui/` half of the
//    codebase gets the same ratchet the `src/` half already has."
//
// WHY, MEASURED RATHER THAN FELT. ADR-012/B4 put a line ceiling on
// `src/global-work-store.mjs` because it went 885 -> 1,233 lines in ONE story, and named
// the failure mode: `mesh-worker-execution.mjs` reached 3,174 lines the same way, "one
// justified block at a time, with no single diff ever looking wrong" (TECH_DEBT item 10).
// `ui/` had no equivalent, and it has been running the identical trajectory unwatched.
// Measured 2026-08-03 across the repo's own history:
//
//   file                            m03      m26      07-30    43/03    43/04
//   ui/src/board/DetailPanel.tsx     434      707        814      839    1,123   +284 (+34%)
//   ui/src/fleet/Fleet.tsx             —      508      1,463    1,463    1,521    +58
//   ui/src/board/Board.tsx           315      367        437      485      581    +96
//
// DetailPanel grew MORE in story 43/04 alone (+284) than in the whole month before it
// (+132), and crossed 1,000 lines in that one diff. That is B4's own curve, one layer over.
//
// THE ESCAPE HATCH IS THE OUTCOME WE WANT, and in `ui/` it is cheaper than anywhere else: a
// React surface's natural unit of extraction is a CHILD COMPONENT with a prop boundary, and
// this milestone already built the pattern twice in the same story — the freshness ramp's
// pure logic to `freshness.mjs`, the Resync state machine to `resync.mjs`, the badge and
// the legend to `StaleBadge.tsx`. What did NOT follow was `ProvenanceLine`: a ~180-line
// self-contained component with four hooks and a clean prop boundary, landed as a block
// inside `DetailPanel.tsx`. Same story, same author, both moves available — which is what
// makes this a ratchet worth having rather than a judgement call worth repeating.
//
// TWO THINGS THIS DELIBERATELY IS NOT:
//   - NOT a repo-wide file-size rule. A limit one milestone imposes on everyone else's
//     files is what the codebase-health rule rejects. This is a NAMED table of the surface
//     modules this milestone measurably enlarged, each with its own reason.
//   - NOT satisfiable by deleting explanation. ADR-014/E3 stated the general rule and it
//     binds here verbatim: "a line ceiling is a proxy for structural cost, and deleting
//     rationale to fit under it RAISES the real cost while lowering the measured one. If a
//     change cannot fit under the ceiling without removing existing explanation, the change
//     belongs in another module — that is the ratchet working." Raising a number here is a
//     decision that needs an ADR, not a diff.
//
// `ui/src/board/Board.tsx` is deliberately NOT capped, and the reason is on the record so a
// later reviewer meets the decision rather than the omission: it is the composition ROOT.
// Its +96 is almost entirely prop threading (`freshnessOf`, `pollMs`, `onResyncWatch`) and
// two effects, which is what a root is FOR — capping it would push state back down into the
// leaves, which is the opposite of the shape this file exists to protect.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
// ONE predicate for "what counts as a ui/src source file", shared with m49's
// `acd-ui-directory-budget` (the per-DIRECTORY half of the same ratchet). Extracted 2026-08-13
// rather than re-typed there: two copies of this regex is how the per-file gate and the
// per-directory gate come to report different totals for the same tree.
import { isUiSourceFile } from "../../support/ui-source-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The named table. `floor` makes each entry non-vacuous: a rename, a move or a truncated
// read cannot turn a ceiling into a silent pass on a file that is no longer there.
const BUDGETS = [
  {
    file: "ui/src/board/DetailPanel.tsx",
    ceiling: 1000,
    floor: 400,
    // Set BELOW the delivered 1,123 on purpose (ADR-015/F2): the extraction of
    // `ProvenanceLine` into its own module is a required outcome of 43/04's second-pass
    // review, and a ratchet that ratifies the size it was raised against would be
    // decoration. Post-extraction the file lands near 950, so this leaves real headroom
    // without dictating the shape of the move.
    why: "the board's detail panel — it hosts the header, the provenance box, four doc tabs, the tasks view and the runs view; each milestone adds one more region. `ProvenanceLine` belongs in its own module (its pure half already is: ./resync.mjs), called from here.",
  },
  {
    file: "ui/src/fleet/Fleet.tsx",
    ceiling: 1560,
    floor: 600,
    // Set just ABOVE the delivered 1,521, and that asymmetry with DetailPanel is
    // deliberate: 43/04 added 58 lines here, so its size is a debt this story did not
    // create and must not be made to pay. The ceiling holds the line for the NEXT author.
    why: "the largest file in ui/ (508 -> 1,521). Its regions — nodes, boards, milestones, the assign affordance, diagnostics, the legend — are already separate components in one file; the next one belongs in its own.",
  },
  {
    file: "ui/src/config/App.tsx",
    ceiling: 1300,
    floor: 500,
    // Added 2026-08-07 at the architect's structural review of 45/03, the milestone that
    // MADE this a file: `<App>` was 1,260 of `ui/src/main.tsx`'s 1,267 lines, so the
    // second-largest surface in `ui/` has never been visible to this ratchet — the budget
    // could not name a file that did not exist. It does now (1,276 lines), and the moment
    // a thing becomes a file is the moment to cap it.
    // Set just ABOVE the delivered 1,276, the same asymmetry with DetailPanel's ceiling
    // that Fleet's entry above records and for the identical reason: 45/03 MOVED this
    // surface without touching one view of it (SPEC: "re-skinning the config editor is out
    // of scope"), so its size is debt that story did not create and must not be made to
    // pay. The ceiling holds the line for the NEXT author instead.
    why: "the config editor — one file holding the sidebar, the section editors, the resource editors, the review panel and every dialog. Each milestone that adds a config section adds another block here; the next one belongs in its own module under ui/src/config/.",
  },
  {
    file: "ui/src/terminal/TerminalControl.tsx",
    ceiling: 840,
    floor: 300,
    // Added 2026-08-08 at milestone 46 / story 04's delivery, the story that MADE this a file —
    // the same rule that added `ui/src/config/App.tsx` at m45's structural review: the moment a
    // thing becomes a file is the moment to cap it, and 46's own ARCHITECTURE §Codebase health
    // finding 2 REQUIRED the entry rather than leaving it to be discovered.
    //
    // Set just ABOVE the delivered 821, the same asymmetry Fleet's and config/App's entries
    // record. The number that matters is the one it is measured AGAINST: the two components it
    // replaced were 467 + 447 = 914 lines, and ARCHITECTURE named "a naive union is a ~900-line
    // component" as the failure mode — "which is how DetailPanel.tsx reached 1,123 and Fleet.tsx
    // 1,532, one justified block at a time". It landed net-negative, and this ceiling is what
    // stops the next milestone giving that back.
    //
    // ADR-014/E3 BINDS HERE HARDER THAN ANYWHERE ELSE ON THIS TABLE: the ceiling may NOT be met
    // by deleting rationale. Two comments in this file are hard-won and were carried across the
    // move deliberately — the 80x24 two-machine soak (why a `mirror` scales and must never
    // reflow) and the collapse-must-not-tear-the-session-down rule. A diff that fits under this
    // number by removing either has raised the real cost while lowering the measured one.
    why: "the ONE terminal control — three hosts (the board dock, the fleet card peek, the fullscreen overlay) of one component. Its LOGIC already lives in ui/src/terminal/*.mjs by ADR-001's invariant, so growth here is JSX: the next region belongs in a sibling component with a prop boundary, not another block.",
  },
  {
    file: "ui/src/app/Shell.tsx",
    ceiling: 860,
    floor: 400,
    // LOWERED 940 -> 860 on 2026-09-12, when the nav was CUT to ui/src/app/ShellNav.tsx — the
    // first of the two cuts this entry's own `why` names. The shell sat at 929 and DG-45-5's
    // producer (the origin probe) needed a home; the cut took the nav and its probe out
    // together (847 delivered). The ceiling follows the delivered size DOWN, the direction
    // `acd-ui-directory-budget` records nobody remembers: 940 left standing would have been a
    // 93-line permission granted by a diff that was removing lines.
    //
    // Added 2026-08-08 at milestone 46 / story 05's delivery, and it was a NAMED OBLIGATION of
    // that story rather than a discovery: 46/ARCHITECTURE §Codebase health finding 5 recorded
    // that `ui/src/app/Shell.tsx` (842) and `shell-layout.mjs` (845) arrived in m45 "new, large,
    // and unbudgeted", and routed the entry CONDITIONALLY — "if m46's dock-host work touches
    // Shell.tsx, that story adds the budget entry at delivery". ADR-009 touched it (the third
    // contribution slot, the published dock inset, the occupant-owned chrome), so here it is.
    //
    // The conditionality is the same ruling m43 and m45 both made and is worth restating: a limit
    // one milestone imposes on another's files fails CI for reasons unrelated to the diff that
    // trips it. This entry is imposed by the milestone that edited the file.
    //
    // Set just ABOVE the delivered 905, the asymmetry Fleet's and config/App's entries record and
    // for the identical reason: m46/05 added ~60 lines to a file whose 842-line starting size is
    // debt this story did not create and must not be made to pay. The ceiling holds the line for
    // the NEXT author — and the shell has three more milestones queued against it (47's repo
    // filter, 49's terminal grid), which is exactly the "one justified block at a time" curve
    // ADR-015/F2 exists to interrupt.
    why: "the app shell — five rows, the nav, the not-found and landing states, the surface-crash boundary, the fullscreen adoption slot and now the dock's overlay host. Its DECISIONS already live in ui/src/app/shell-layout.mjs and shell-nav.mjs by ADR-005's invariant, so growth here is DOM: the next region belongs in a sibling component (the top bar and the nav are the two obvious cuts), not another block inside the root.",
  },
  {
    file: "ui/src/app/shell-layout.mjs",
    ceiling: 1060,
    floor: 400,
    // Added 2026-08-08 alongside `Shell.tsx`, and it should have been added WITH it: 46's health
    // finding 5 named "`Shell.tsx` (842) and `shell-layout.mjs` (845)" in one breath and then
    // phrased its route around only the first, so the second went on growing unwatched — 845 →
    // 1,006 in this story alone. That is the whole ADR-015/F2 curve in one milestone, on the file
    // three downstream milestones bind to by name.
    //
    // Set just above the delivered 1,006. It is a MODULE rather than a component, so the remedy
    // reads differently and is stated rather than left to be invented: this file is already four
    // vocabularies in one (regions/rows, the chrome budget, the content modes, the z ladder, the
    // fullscreen machine) and each is a clean import boundary.
    why: "the shell's whole layout vocabulary in one module — the regions and rows, the published chrome height and its budget, the content modes, the closed z ladder and the fullscreen state machine. Every downstream milestone binds to these names, which is exactly why the next vocabulary belongs in its own module beside this one (`shell-fullscreen.mjs` is the obvious first cut) rather than appended here.",
  },
  {
    file: "ui/src/home/session-launcher.mjs",
    ceiling: 840,
    floor: 400,
    // Added 2026-08-14 at milestone 50 / story 04's structural review, and it is owed by THIS
    // story under this table's own rule — "This entry is imposed by the milestone that edited
    // the file" (see `ui/src/app/Shell.tsx` above). The file is the story's own creation.
    //
    // IT WAS AT EXACTLY THE THRESHOLD, WHICH IS THE WORST PLACE TO BE. Measured by the sweep's
    // own arithmetic (`source.split(/\r?\n/).length`) the module is 800 lines, and the sweep
    // below is `lines > BUDGET_REQUIRED_ABOVE` with that constant at 800 — so `800 > 800` is
    // false and it carried ZERO headroom. The next author to add a two-line comment would have
    // met a CI refusal for a file with no ceiling, no `why` and no named next extraction: the
    // "declare your intent" line firing as a size limit, which is precisely what the threshold
    // is documented NOT to be. A table row costs one diff; that experience costs a reader.
    //
    // THE ROW IS THE FIX, AND SPLITTING THE MODULE WOULD NOT BE. 50/ADR-008 decision 10 raised
    // `ui/src/home/` from 15 to 18 files with allowance 0 and argued the raise BEFORE the files
    // existed — its closing sentence is that the domain now has a reader set and one writer and
    // "the NEXT member is still a split". A 19th file added by the very story that argued that
    // ceiling would re-open the conversation in the same milestone that had it, and would do it
    // by reflex rather than by decision.
    //
    // Set just above the delivered 800, the asymmetry Fleet's, config/App's and Shell's entries
    // record. ADR-014/E3 binds as everywhere on this table: the ceiling may NOT be met by
    // deleting rationale — this module's comments carry DESIGN's two-deadline derivation and the
    // reason each refusal code says what it says.
    why: "the home surface's ONE writer — the eight-state machine, the two derived deadlines, the three field derivations and the code->language failure map, in the module form this repo requires because it has no React test harness. Its next extraction is NAMED and is not the state machine: the COPY + FAILURE-MAP block (the closed state set, DESIGN's operator-facing strings and the fourteen-row REFUSAL_MAP, ~140 lines of frozen strings ending at LAUNCHER_REFUSAL_FALLBACK) is the largest self-contained region and the only one with a seam a reader can see — no logic, no imports of its own, and every consumer already reads it by name. `session-launcher-copy.mjs` beside this file, imported and re-exported, is the move; the machine keeps its home.",
  },
];

// ── THE N+1th LARGE FILE FAILS CI, instead of needing a reviewer's memory ───────────────────────
//
// Added 2026-08-08 (m46/05, architect's review). Every entry in the table above was added the same
// way: a reviewer NOTICED a file had got large and remembered that this ratchet exists. That is a
// process, not a gate, and it has already failed once in this very milestone — `shell-layout.mjs`
// was named beside `Shell.tsx` in 46's own health findings and still arrived here unbudgeted,
// because the routing sentence only mentioned the other one.
//
// So the table itself is now ratcheted: any `ui/src` file over the threshold must CARRY an entry.
// The threshold is deliberately below every current ceiling — it is a "declare your intent" line,
// not a size limit — so crossing it costs one table row with a stated reason, and nothing else.
const BUDGET_REQUIRED_ABOVE = 800;

// ── AND NO ui/src SOURCE FILE MAY BE BINARY TO GIT ──────────────────────────────────────────────
//
// Added 2026-08-13 (m49/02, architect's review), as the N+1th instance of a defect this gate is the
// natural home for: it already reads every `ui/src` source file, and a file it measures in LINES
// must be a file a reviewer can READ AS LINES.
//
// THE MEASURED INSTANCE. Two production modules of milestone 49 shipped with a RAW U+0000 byte as
// the pane-key separator (`ui/src/home/socket-cap.mjs`, `ui/src/home/layout.mjs`) instead of the
// source-level escape `"\0"`. The runtime key is identical; everything else is not:
//   ·  git calls the file `Bin 0 -> 14098 bytes` — `git diff` shows NO CONTENT, `git log -p` shows
//      none, `git blame` cannot run, and a PR review of the milestone's critical-path arbiter is a
//      file name and a byte count.
//   ·  ripgrep SKIPS a binary file silently, so `git grep -n MAX_LIVE_PANES -- ui/src/home/`
//      answered `Binary file … matches` and a plain `rg` sweep answers NOTHING AT ALL — in a repo
//      whose ADRs are routinely argued from grep-verified absence claims. A gate that sweeps
//      sources would read one too (`readFile(…, "utf8")` yields U+FFFD, so a text clause looking
//      for a literal walks straight past it).
// The escape costs one character and gives all of it back, so the raw byte is refused outright
// rather than budgeted. This clause is deliberately about the BYTE and not about the character
// class: a `.tsx` full of legitimate emoji or box-drawing runes is text and diffs fine.
export const BINARY_BYTE = String.fromCharCode(0);

/** The shipped detector. `files` is `[{ path, source }]` — synthesized text for every plant. */
export function binaryUiSourceViolations(files) {
  const swept = Array.isArray(files) ? files : [];
  if (swept.length === 0) {
    return ["NO ui/src files were handed to the binary-source detector — an absence sweep over an empty set is a green run that asserted nothing."];
  }
  const violations = [];
  for (const file of swept) {
    const source = String(file?.source ?? "");
    if (!source.includes(BINARY_BYTE)) continue;
    // Located by LINE, never by a positional cut over the source (m47/F-47-04-ARCH-2, held by
    // `acd-test-suite-registration`): the report says where to look, so it must not be the kind
    // of instrument that can be confidently wrong about where that is.
    const line = source.split("\n").findIndex((entry) => entry.includes(BINARY_BYTE)) + 1;
    violations.push(
      `${file?.path}: holds a RAW U+0000 byte (first at line ${line}). Write the escape \`"\\0"\` instead — the runtime string is identical and the file stops being BINARY to git: `
        + "`git diff` shows `Bin 0 -> N bytes` and no content, `log -p` and `blame` give a reviewer nothing, and ripgrep skips the file SILENTLY, so an absence sweep over this tree reports \"no hits\" and is believed. A module no reviewer can diff is not a module this ratchet's line count means anything about.",
    );
  }
  return violations;
}


export const archTests = [
  ...BUDGETS.map((budget) => ({
    name: `arch/43 ADR-015/F2 (acd-ui-surface-file-budget): ${budget.file} stays under its ${budget.ceiling}-line ratchet — a surface gains child components, not blocks`,
    run: async () => {
      const source = await readFile(path.join(repoRoot, budget.file), "utf8");
      const lines = source.split(/\r?\n/).length;
      assert.ok(
        lines > budget.floor,
        `the measured module was actually read (non-vacuous): ${budget.file} is ${lines} lines`,
      );
      assert.ok(
        lines <= budget.ceiling,
        `${budget.file} is ${lines} lines, over the ${budget.ceiling}-line ratchet (ADR-015/F2) — ${budget.why} Extract the next region into a sibling component with a prop boundary; do NOT trim comments to fit (ADR-014/E3). Raising this number needs an ADR, not a diff.`,
      );
    },
  })),
  {
    name: "arch/43 ADR-015/F2 (acd-ui-surface-file-budget): self-check — every budgeted file exists, and the table is the only place a number lives",
    run: async () => {
      const missing = [];
      for (const budget of BUDGETS) {
        try {
          await readFile(path.join(repoRoot, budget.file), "utf8");
        } catch {
          missing.push(budget.file);
        }
      }
      assert.deepEqual(
        missing,
        [],
        `a budget entry naming a file that is no longer on disk makes the ratchet guard a number that is not true (ADR-013/C5) — remove or re-aim it: ${missing.join(", ")}`,
      );
      assert.ok(BUDGETS.length > 0, "the budget table is populated (non-vacuous)");
      for (const budget of BUDGETS) {
        assert.ok(budget.ceiling > budget.floor, `${budget.file}: the ceiling must exceed the non-vacuity floor`);
      }
    },
  },

  {
    name: `arch/43 ADR-015/F2 (acd-ui-surface-file-budget): EVERY ui/src file over ${BUDGET_REQUIRED_ABOVE} lines carries a budget entry — the ratchet is not a thing a reviewer has to remember`,
    run: async () => {
      const budgeted = new Set(BUDGETS.map((budget) => budget.file));
      const unbudgeted = [];
      const walk = async (relative) => {
        const entries = await readdir(path.join(repoRoot, relative), { withFileTypes: true });
        for (const entry of entries) {
          const next = `${relative}/${entry.name}`;
          if (entry.isDirectory()) {
            await walk(next);
            continue;
          }
          if (!isUiSourceFile(entry.name)) continue;
          const lines = (await readFile(path.join(repoRoot, next), "utf8")).split(/\r?\n/).length;
          if (lines > BUDGET_REQUIRED_ABOVE && !budgeted.has(next)) unbudgeted.push(`${next} (${lines} lines)`);
        }
      };
      await walk("ui/src");

      assert.deepEqual(
        unbudgeted,
        [],
        `these ui/src modules are over ${BUDGET_REQUIRED_ABOVE} lines and carry NO budget entry: ${unbudgeted.join(", ")}.\n`
          + "Add one to BUDGETS with a ceiling just above its delivered size and a `why` naming the NEXT extraction — that is one table row, and it is the whole cost. This clause exists because every existing entry was added by a reviewer happening to notice, and that process demonstrably misses one: 46's own health finding named `shell-layout.mjs` beside `Shell.tsx` and it still arrived unbudgeted while growing 845 -> 1,006 lines in a single story.",
      );

      // NON-VACUOUS: the sweep really walked the tree and really found the files it is meant to
      // see. A rename of `ui/src` would otherwise empty the loop and leave a guard that guards
      // nothing — the exact shape m46 keeps finding.
      let scanned = 0;
      const count = async (relative) => {
        for (const entry of await readdir(path.join(repoRoot, relative), { withFileTypes: true })) {
          if (entry.isDirectory()) await count(`${relative}/${entry.name}`);
          else if (isUiSourceFile(entry.name)) scanned += 1;
        }
      };
      await count("ui/src");
      assert.ok(scanned > 50, `ui/src was actually walked: ${scanned} modules`);
      assert.ok(
        BUDGETS.every((budget) => budget.ceiling > BUDGET_REQUIRED_ABOVE || budget.floor < BUDGET_REQUIRED_ABOVE),
        "the declare-your-intent threshold sits below every ceiling, so crossing it is a table row rather than a size limit",
      );
    },
  },

  {
    name: "arch/49 (acd-ui-surface-file-budget): NO ui/src source file is BINARY to git — a raw U+0000 byte makes a module undiffable and invisible to ripgrep, and the escape `\\0` is the same string",
    run: async () => {
      const files = [];
      const walk = async (relative) => {
        for (const entry of await readdir(path.join(repoRoot, relative), { withFileTypes: true })) {
          const next = `${relative}/${entry.name}`;
          if (entry.isDirectory()) await walk(next);
          else if (isUiSourceFile(entry.name)) files.push({ path: next, source: await readFile(path.join(repoRoot, next), "utf8") });
        }
      };
      await walk("ui/src");
      assert.ok(files.length > 50, `ui/src was actually walked: ${files.length} source files`);
      assert.deepEqual(binaryUiSourceViolations(files), [], "every ui/src source file is TEXT — diffable, greppable, reviewable");

      // THE PLANT is synthesized text, never a file written into the real tree, and it is the
      // exact defect that landed: a key joined on the raw byte rather than on the escape.
      const clean = { path: "ui/src/home/plant.mjs", source: `export const keyOf = (a, b) => \`\${a}${"\\0"}\${b}\`;` };
      const planted = { path: "ui/src/home/plant.mjs", source: `export const keyOf = (a, b) => \`\${a}${BINARY_BYTE}\${b}\`;` };
      assert.notEqual(planted.source, clean.source, "the plant LANDED — the planted text differs from the clean text");
      assert.equal(
        `a-b${BINARY_BYTE}c`,
        "a-b\0c",
        "…and the two spellings are the SAME runtime string, which is exactly why only a gate over the SOURCE can tell them apart",
      );

      const violations = binaryUiSourceViolations([...files, planted]);
      assert.ok(violations.length >= 1, "a raw U+0000 byte in a ui/src source file fires the shipped detector");
      assert.ok(
        violations.some((violation) => violation.includes("plant.mjs") && /RAW U\+0000/.test(violation) && /ripgrep/.test(violation)),
        `the refusal names the file, the byte and why it matters: ${JSON.stringify(violations)}`,
      );
      assert.deepEqual(binaryUiSourceViolations([...files, clean]), [], "…and the ESCAPE spelling, in this same lane, returns none — the fix is accepted, not merely the absence detected");
      assert.deepEqual(binaryUiSourceViolations(files), [], "…and the CLEAN tree, in this same lane, returns none");
      assert.deepEqual(
        binaryUiSourceViolations([]),
        ["NO ui/src files were handed to the binary-source detector — an absence sweep over an empty set is a green run that asserted nothing."],
        "an empty sweep FAILS rather than passing quietly",
      );
    },
  },
];
