// Fitness function: acd-shell-z-ladder-single-home (m45 / ADR-005 [Amigos-5], DESIGN DG-45-2) —
//
//   "Stacking order is a CLOSED, DECLARED vocabulary owned by the shell. `z-50` means
//    'the shell's fullscreen occupant' and nothing else; a rung not on the ladder is a
//    GAP whose fix is to add the rung to the ladder first."
//
// EXPECTED RED until milestone 45 / story 03 lands: `ui/src/app/shell-layout.mjs` does not
// exist, and three of the four `z-50` literals below still live in surface components.
//
// WHY THIS IS A RATCHET AND NOT A SCENARIO. Story 45/03's own feature says, in terms, that
// it does NOT assert "no `z-50` literal survives anywhere else in `ui/src`" — a behavioural
// Then cannot make a whole-tree claim without smuggling a source read into it, and QA
// refused to (correctly). So the gap closes in 03 and reopens the moment 46, 47 or 49 adds
// an overlay — and 49 is PRECISELY the milestone that puts a surface fullscreen. That is the
// Nth-instance case the codebase-health rule says to ratchet rather than to re-review.
//
// WHAT DG-45-2 ACTUALLY MEASURED (2026-08-06, re-verified here): `z-50` is currently three
// unrelated things wearing one number —
//   Board.tsx:528              the dispatch toast          → belongs on `toast` (z-40)
//   Board.tsx:568              the milestone switcher      → belongs on `popover` (z-20)
//   BoardLanes.tsx:373         the switcher's listbox      → belongs on `popover` (z-20)
//   FleetTerminalView.tsx:412  the fleet peek's own portal → see the exemption below
// The three `z-10`s (main.tsx:318, Fleet.tsx:281, BoardLanes.tsx:181) and the one `z-20`
// (Fleet.tsx:360) are already on their correct rungs and need no edit — which is why this
// test asserts the RUNG SET as well as the `z-50` home: it must stay green for them today.
//
// THE ONE EXEMPTION RETIRED WITH ITS FILE, AT MILESTONE 46 / STORY 04, AND THE LIST IS NOW
// EMPTY. FleetTerminalView.tsx:412 was a genuine violation of ADR-005's "no per-surface
// `fixed inset-0` portal" rule, carried on an explicit shrink-only exemption BECAUSE m46 was
// going to delete the file — forcing 45/03 to re-home a fullscreen overlay inside a component
// about to be removed is work done twice. m46/04 deleted it, and the entry is REMOVED rather
// than re-pointed, exactly as its own reason text required.
//
// THE ONE CONTROL THAT REPLACED IT TAKES THE RUNG BY IMPORT (`Z_CLASSES.fullscreen` from
// ui/src/app/shell-layout.mjs), not by retyping the number — which is why this list did not need
// a successor entry. That is the outcome the exemption was betting on, and the stale-exemption
// clause below is what would have caught the bet failing.
//
// The list may only ever shrink: a new entry is a new violation, and the assertion below refuses
// to grow.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const UI_SRC = "ui/src";
const LADDER_MODULE = "ui/src/app/shell-layout.mjs";

// DESIGN DG-45-2 fixes these five rungs and no others. `dock` is reserved for milestone 46's
// docked terminal so that 46 does not have to invent a number under time pressure.
const DECLARED_RUNGS = new Set(["10", "20", "30", "40", "50"]);

// Shrink-only, and EMPTY since milestone 46 / story 04 deleted its one entry's file. Keyed by
// repo-relative path; the value is the reason a reviewer needs. An empty map is the strongest
// state this list can be in — every `z-50` in `ui/src` now comes from the ladder.
const FULLSCREEN_RUNG_EXEMPTIONS = new Map([]);

async function uiSourceFiles() {
  const found = [];
  async function walk(relative) {
    const entries = await readdir(path.join(repoRoot, relative), { withFileTypes: true });
    for (const entry of entries) {
      const next = `${relative}/${entry.name}`;
      if (entry.isDirectory()) await walk(next);
      else if (/\.(tsx?|mjs|css)$/.test(entry.name)) found.push(next);
    }
  }
  await walk(UI_SRC);
  return found.sort();
}

// Tailwind stacking utilities as they appear in a class string: `z-10`, `md:z-20`,
// `group-hover:z-50`. Deliberately NOT matching `z-[9999]` — an arbitrary-value rung is
// caught by the rung-set assertion below with a message of its own.
function stackingRungs(source) {
  return [...source.matchAll(/(^|[\s"'`:])z-(\d+)\b/g)].map((match) => match[2]);
}

function arbitraryRungs(source) {
  return [...source.matchAll(/(^|[\s"'`:])z-\[([^\]]+)\]/g)].map((match) => match[2]);
}

// LINE COMMENTS FIRST, block comments second (TECH_DEBT item 24). The number clause below is an
// ABSENCE sweep over files whose headers narrate rungs in prose — `z-30`, `zIndex: 50` — so an
// unstripped source would cry wolf and a blinded stripper would go silently green.
function stripSourceComments(source) {
  return source.replace(/^[ \t]*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
}

export const archTests = [
  {
    name: "arch/45 ADR-005 [Amigos-5] (acd-shell-z-ladder-single-home): the z-ladder is DECLARED in ui/src/app/shell-layout.mjs beside the region names — a rung typed as a class literal in a surface is a rung nobody can find",
    run: async () => {
      let ladder;
      try {
        ladder = await import(new URL(`../../../${LADDER_MODULE}`, import.meta.url).href);
      } catch (error) {
        assert.fail(
          `${LADDER_MODULE} is not loadable by plain node (${error.code ?? error.message}). m45/ADR-005: the stacking ladder is layout vocabulary and belongs in the same framework-free module as the region names — for the same reason, that this repo has no React test harness and a constant only a bundler can read is a constant no test can check.`,
        );
      }

      const exported = Object.entries(ladder).find(([name]) => /^(Z_LADDER|Z_INDEX|zLadder|STACKING)$/.test(name));
      assert.ok(
        exported,
        `${LADDER_MODULE} exports no stacking ladder. m45/ADR-005 [Amigos-5]: DESIGN DG-45-2's five rungs — sticky chrome, popover, dock (reserved for m46), toast, fullscreen — must be importable names, not numbers retyped per surface.`,
      );

      const rungs = new Set(Object.values(exported[1]).map((value) => String(value).replace(/^z-/, "")));
      assert.deepEqual(
        [...rungs].sort(),
        [...DECLARED_RUNGS].sort(),
        `${LADDER_MODULE}'s ladder declares rungs ${[...rungs].sort().join(", ")}; DESIGN DG-45-2 fixes exactly ${[...DECLARED_RUNGS].sort().join(", ")}. The closure rule is the point: "an element that needs a rung not on this list is a GAP whose fix is to add the rung HERE first."`,
      );
    },
  },

  {
    name: "arch/45 ADR-005 [Amigos-5] (acd-shell-z-ladder-single-home): `z-50` appears NOWHERE in ui/src outside the ladder module — it means the shell's fullscreen occupant and nothing else (one named, shrink-only exemption, retiring with m46)",
    run: async () => {
      const offenders = [];
      for (const file of await uiSourceFiles()) {
        if (file === LADDER_MODULE) continue;
        const source = await readFile(path.join(repoRoot, file), "utf8");
        if (stackingRungs(source).includes("50")) offenders.push(file);
      }

      const unexpected = offenders.filter((file) => !FULLSCREEN_RUNG_EXEMPTIONS.has(file));
      assert.deepEqual(
        unexpected,
        [],
        `these files carry a bare \`z-50\` outside the ladder: ${unexpected.join(", ")}. m45/ADR-005 [Amigos-5] / DESIGN DG-45-2: \`z-50\` is the shell's fullscreen occupant ALONE. Measured at m45 refine, \`z-50\` was three unrelated things — a dispatch toast (belongs on \`toast\`), a switcher disclosure and its listbox (both \`popover\`). Import the rung from ${LADDER_MODULE} instead of retyping the number.`,
      );

      // Shrink-only: an exemption that no longer fires must be DELETED, or the list rots into
      // a permission slip. This is what makes m46's deletion of FleetTerminalView.tsx visible
      // here rather than silently leaving a stale entry behind.
      const stale = [...FULLSCREEN_RUNG_EXEMPTIONS.keys()].filter((file) => !offenders.includes(file));
      assert.deepEqual(
        stale,
        [],
        `these z-50 exemptions no longer fire and must be REMOVED from FULLSCREEN_RUNG_EXEMPTIONS: ${stale.join(", ")}. The list may only ever shrink — a spent exemption left standing is how the next violation gets waved through.`,
      );
    },
  },

  {
    // ADDED 46/05 (QA nit N-3). Every clause above matches a Tailwind CLASS, so a rung retyped as
    // a plain NUMBER walked past all of them: `z: 30` in a layout model, or
    // `style={{ zIndex: 50 }}` in a component, is the same defect — a number with no name and no
    // home — and it is the spelling a `.mjs` model naturally reaches for, which is precisely
    // where m46 put the dock's placement. Measured: replacing `z: rungFor("dock")` with `z: 30`
    // in `shell-layout.mjs` survived every gate in the repo.
    //
    // The ladder module is exempt because it is the one place the numbers are DECLARED.
    name: "arch/45 ADR-005 [Amigos-5] (acd-shell-z-ladder-single-home): a rung is not retyped as a NUMBER either — no `z:`/`zIndex:` literal on a declared rung outside the ladder module",
    run: async () => {
      const offenders = [];
      let scanned = 0;
      for (const file of await uiSourceFiles()) {
        if (file === LADDER_MODULE || file.endsWith(".css")) continue;
        scanned += 1;
        const source = stripSourceComments(await readFile(path.join(repoRoot, file), "utf8"));
        for (const match of source.matchAll(/\b(zIndex|z)\s*:\s*(\d+)\b/g)) {
          if (DECLARED_RUNGS.has(match[2])) offenders.push(`${file} → ${match[1]}: ${match[2]}`);
        }
      }
      assert.ok(scanned > 30, `ui/src was actually read (non-vacuous): ${scanned} files`);

      assert.deepEqual(
        offenders,
        [],
        `these spell a declared rung as a NUMBER rather than taking it from the ladder: ${offenders.join(", ")}. The class clauses above cannot see this spelling, and a `
          + `\`.mjs\` layout model reaches for it naturally — import the value (\`Z_LADDER.dock\`, or \`rungFor("dock")\`, which also REFUSES a rung the ladder does not name) so the number keeps one home. \`${LADDER_MODULE}\` is where they are declared and is the only exemption.`,
      );

      // The detector fires on both spellings, and stays quiet for the sanctioned one.
      const plant = 'const placement = { rung: "dock", z: 30 };\nconst style = { zIndex: 50 };';
      const found = [...plant.matchAll(/\b(zIndex|z)\s*:\s*(\d+)\b/g)].filter((match) => DECLARED_RUNGS.has(match[2]));
      assert.equal(found.length, 2, "self-check: both `z: 30` and `zIndex: 50` are seen");
      const clean = 'const placement = { rung: "dock", z: rungFor("dock") };\nconst style = { zIndex: Z_LADDER.fullscreen };';
      assert.deepEqual([...clean.matchAll(/\b(zIndex|z)\s*:\s*(\d+)\b/g)], [], "…and taking the value from the ladder is quiet");
    },
  },

  {
    name: "arch/45 ADR-005 [Amigos-5] (acd-shell-z-ladder-single-home): every stacking utility in ui/src sits on a rung the ladder DECLARES — no arbitrary z-[…] values, no rung invented at the call site",
    run: async () => {
      const undeclared = [];
      const arbitrary = [];
      for (const file of await uiSourceFiles()) {
        const source = await readFile(path.join(repoRoot, file), "utf8");
        for (const rung of stackingRungs(source)) {
          if (!DECLARED_RUNGS.has(rung)) undeclared.push(`${file} → z-${rung}`);
        }
        for (const value of arbitraryRungs(source)) {
          if (file !== LADDER_MODULE) arbitrary.push(`${file} → z-[${value}]`);
        }
      }

      assert.deepEqual(
        undeclared,
        [],
        `these stacking utilities use a rung DESIGN DG-45-2 does not declare: ${undeclared.join(", ")}. The fix is to add the rung to ${LADDER_MODULE} with a stated meaning FIRST — the ladder is closed by design, and a number chosen at the call site is how two overlays end up fighting.`,
      );

      assert.deepEqual(
        arbitrary,
        [],
        `these use an arbitrary-value stacking utility: ${arbitrary.join(", ")}. An arbitrary z-index is a rung with no name and no home — it is the exact failure DG-45-2 records, one escape hatch further along.`,
      );
    },
  },
];
