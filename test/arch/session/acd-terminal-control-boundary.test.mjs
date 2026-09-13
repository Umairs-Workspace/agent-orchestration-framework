// Fitness function: acd-terminal-control-boundary (milestone 46 / ADR-001 + ADR-002 + ADR-005)
// — WHOLE, since 46/04.
//
//   "ALL of the one terminal control's logic is framework-free `.mjs` and the `.tsx` is a thin
//    consumer, and that split is an INVARIANT rather than a preference. The shared set imports
//    NOTHING from `ui/src/fleet/` or `ui/src/board/`. There is ONE state vocabulary and ONE
//    palette home. And a call site obtains a session descriptor from the TABLE — never by
//    assembling one."
//
// THE SPLIT IS OVER. 46/03 authored this gate in two halves because only one could be green on
// arrival; the WHOLE-TREE clauses — neither `DOCK_STATES` nor `TERMINAL_VIEW_STATES` survives
// anywhere in `ui/src`, and DG-46-2's five hex literals have ONE home — sat in a parked
// `acd-terminal-control-boundary.mjs`, off the suite glob, until 46/04 deleted the duplicate.
// They are MERGED IN below and the parked sibling is gone. One invariant, one file.
//
// WHY THE HALF THAT WAS ALWAYS GREEN MATTERED ANYWAY. 46/04 and 46/05 are the stories that write
// the React component against this `.mjs` set. Without these clauses registered, NOTHING failed
// CI on `import { useState } from "react"` in a shared module, on a `window.location` read
// re-entering the URL builder, or on `import { assignmentChip } from "../fleet/assignments.mjs"`
// — precisely the three plants ADR-001 and ADR-005 name. ADR-001 is explicit that this gate is
// the whole difference between an invariant and a preference, "because no reviewer reliably
// notices an absence".
//
// ═══ THE CALL-SITE RATCHET, ADDED BY 46/04 (ADR-002) ══════════════════════════════════════════
// The core's URL builder keys on the descriptor's FIELDS and never on its kind — deliberately,
// and it is load-bearing: a third source must be a table ROW, not a new word inside the builder.
// The cost of that duck-typing is that a hand-built `{ ...LOCAL_PTY, originRole: "fleet" }` is
// accepted and produces a perfectly plausible FLEET url for a board PTY. The core cannot refuse
// it without giving up the property, so the refusal belongs at the CALL SITE: a production
// module under `ui/src` obtains a descriptor from `sessionSourceFor` / `sessionSourceTable` and
// WRITES no descriptor field of its own. `ui/src/terminal/source-table.mjs` is the one home, and
// it is the only exemption.
//
// WHY THE `.mjs` HALF IS AN INVARIANT AND NOT A STYLE PREFERENCE. This repo has NO React test
// harness — no vitest, no testing-library — so a decision that lives in JSX is a decision no
// test can reach. All three headless harnesses stub the terminal out BY MODULE PATH because it
// wants a real DOM. Anything left in the `.tsx` is, by construction, untestable here.
//
// …AND "UNTESTABLE HERE" IS NOT A LICENCE, which is the lesson of 2026-08-09: the whole of that
// day's blocker — a control that rendered correctly and never opened a socket, at both call sites,
// for both sources — lived in the `.tsx`, under this gate, with 537 tests green.
// `test/session/terminal-control-opens-its-socket.test.mjs` now MOUNTS the real component (mini-react
// attaches host nodes to refs on request) and asserts the socket. The split below is unchanged and
// still right; what changed is that the residue in the `.tsx` is no longer beyond reach.
//
// WHY THE FLEET EDGE IS NAMED SPECIFICALLY. `view-state.mjs → ui/src/fleet/assignments.mjs`
// was the ONLY outward edge any of the five predecessor helpers had, and it carried
// fleet-DOMAIN wording (*"no live output — assignment failed · reclaimed"*). That copy is
// correct and must not be lost — but a shared control importing it would re-couple the two
// surfaces this milestone exists to decouple, and it would do it INVISIBLY, from inside a
// module named for terminals. So the describer takes an injected `reason` string and this gate
// fails the build if anyone re-admits the import.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  TERMINAL_DIR,
  UI_SRC,
  PALETTE,
  PALETTE_HOME,
  BROWSER_GLOBALS,
  collect,
  rel,
  stripComments,
  stripperSelfCheck,
  nonVacuousSource,
} from "../../support/terminal-gate-detectors.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

// The one home of the frozen table, and the ONLY file allowed to write a descriptor's fields.
const SOURCE_TABLE = "ui/src/terminal/source-table.mjs";
const CORE_HOME = "ui/src/terminal/";

// The descriptor's own field names. WRITING one of these — as an object-literal key, or as an
// assignment target — is how a hand-built descriptor comes into existence. READING one
// (`source.originRole`) is exactly what the core is supposed to do and is untouched here.
//
// `path` is deliberately NOT in this list on its own: it is a common word (a route, a file, a
// breadcrumb) and a bare `path:` sweep would cry wolf across the whole tree — the drag clamp and
// DESIGN's box constants already taught the sibling gate that a detector which cries wolf gets
// relaxed rather than obeyed. It is caught by the SPREAD clause below instead, where the value
// makes it unambiguous.
const DESCRIPTOR_FIELDS = ["originRole", "resizeControlFrame", "fixedGeometry", "canInput"];

// `{ ...SOMETHING, originRole: "fleet" }` — the exact shape ADR-002 names — and its route twin
// `{ ...SOMETHING, path: "/ws/terminal…" }`. The route form requires the VALUE to be a terminal
// socket route, because `{ ...file, path: undefined }` in the config editor is not a descriptor
// and a gate that said it was would be wrong in a way that costs it its authority.
const DESCRIPTOR_SPREAD_ORIGIN = /\{[^{}]*\.\.\.[^{}]*\boriginRole\s*:/;
const DESCRIPTOR_SPREAD_ROUTE = /\{[^{}]*\.\.\.[^{}]*\bpath\s*:\s*["'`]\/ws\/terminal/;

// A file that NAMES a session-source kind AND reaches into the terminal core is a file choosing
// a source, and it must do that through the table's own lookup rather than by restating the row.
//
// THE `importsTerminalCore` GUARD IS NOT A LOOPHOLE, it is what keeps the detector truthful. The
// board's ACTION vocabulary independently uses the word `mirror` (`primaryAction` returns
// `{ kind: "mirror" }`, read by DetailPanel) — a different concept that happens to share a
// string, and forcing it through the session-source table would be wrong. A module that has no
// edge to `ui/src/terminal/` is not choosing a session source.
const NAMES_A_SOURCE_KIND = /["']local-pty["']|["']mirror["']/;
const USES_THE_TABLE = /\bsessionSourceFor\s*\(|\bsessionSourceTable\s*\(/;
const IMPORTS_TERMINAL_CORE = /from\s+["'][^"']*\/terminal\/[^"']+["']/;

// TECH_DEBT 18(a)'s FIRST GATE, three milestones after it was recorded.
//
// `ui/src/fleet/` reaching into `ui/src/board/` is the measured defect m45 half-paid and ADR-001
// pays the terminal instalment of. Its own Alternatives-rejected names the risk in terms — *"A
// sixth would be added by the one milestone chartered to reduce coupling"* — and a structural
// review found exactly that: `terminal-mount.d.mts` importing the mount contract from
// `../board/dock-mount.mjs`. It was TYPE-ONLY, so `aof graph impact` could not see it, and the
// sibling clause above sweeps only `ui/src/terminal/**`.
//
// SHRINK-ONLY, and `.d.mts` IS SWEPT — the whole point is that the invisible kind counts. Each
// entry is a SPECIFIER, so re-pointing one at a new board module is a new entry rather than a
// silent re-use of an old permission. Removing one is always allowed; adding one fails CI.
const FLEET_TO_BOARD_BASELINE = Object.freeze([
  "../board/StaleBadge",
  "../board/api",
  "../board/freshness.mjs",
  "../board/runs.mjs",
  "../board/status",
]);

// ═══ THE SECOND BASELINE, AND IT IS EMPTY — `ui/src/home/ →` (m49/ADR-001), added by 49/02 ═══════
//
// ADR-001 in terms: *"`ui/src/home/` IMPORTS NOTHING FROM `ui/src/fleet/` OR `ui/src/board/`. It
// imports DOWN into `ui/src/terminal/` and `ui/src/app/`, and nothing sideways."*
//
// AN EMPTY BASELINE IS THE STRONGEST FORM THIS RATCHET HAS, and it is only available ONCE — on the
// diff that creates the directory. That is why it lands with 49/02 and not later: the fleet's list is
// five entries long because nobody wrote it down until three milestones after the first one, and by
// then the ratchet could only stop a SIXTH. The home starts at zero, so every sideways edge it could
// ever grow is a red line rather than a negotiation about which ones were already there.
//
// WHY THE HOME IS SWEPT FOR *BOTH* SURFACES WHILE THE FLEET IS SWEPT FOR ONE. The fleet→board list
// is a DEBT being paid down (TECH_DEBT 18(a)); the home's is a rule with no debt behind it. Both
// surfaces are named because absorbing the home into the fleet was ADR-001's rejected alternative
// and importing from it is the same coupling arriving one file at a time.
//
// WHAT IS NOT SWEPT, DELIBERATELY: `../terminal/`, `../app/`, `../components/`, `../lib/`. Those are
// the DOWNWARD edges ADR-001 grants, and a gate that forbade them would forbid the very structure it
// exists to protect — the shared home the sideways edge is supposed to be refactored INTO. The
// "both directions" self-check below drives that half too, because a detector that flagged
// everything would be relaxed within a milestone.
const HOME_TO_SURFACE_BASELINE = Object.freeze([]);

// ONE PREDICATE, TWO BASELINES. The fleet's clause and the home's ask the same question of a
// specifier — "does this reach into a SURFACE folder?" — and two spellings of it would be two
// chances to disagree about what an import is, in the file whose whole subject is one home per fact.
//
// The segment form `(^|/)<folder>/` catches every depth and every spelling that resolves there:
// `../board/api`, `../../board/api` from a subdirectory, and an aliased `@/board/api`. It does NOT
// catch `../terminal/board-chrome.mjs` or a `fleet-app-harness` — the folder must be a whole path
// segment, because a detector that cries wolf gets relaxed rather than obeyed (this file's own
// recorded lesson from the drag clamp).
//
// MEASURED BEFORE BROADENING: every `ui/src/fleet/**` specifier reaching the board is spelled
// `../board/…` today, so the five-entry baseline above sees exactly what it saw before.
function crossSurfaceSpecifiers(text, folders) {
  return importSpecifiers(text).map((entry) => entry.specifier).filter((specifier) => folders.some((folder) => new RegExp(`(^|/)${folder}/`).test(specifier)));
}

function fleetToBoardSpecifiers(text) {
  return crossSurfaceSpecifiers(text, ["board"]);
}

function homeToSurfaceSpecifiers(text) {
  return crossSurfaceSpecifiers(text, ["fleet", "board"]);
}

function descriptorAssemblyProblems(relative, clean) {
  const problems = [];
  if (relative === SOURCE_TABLE) return problems;

  // The FIELD-WRITE clause is aimed at CALL SITES. Inside `ui/src/terminal/` the core builds
  // results that legitimately carry a descriptor's field names — the URL builder's own refusal
  // shape reports the `originRole` it could not resolve — and that half of the boundary is
  // already held by the framework-free and no-surface-import clauses above plus ADR-003's
  // forbidden-spelling clause below.
  if (!relative.startsWith(CORE_HOME)) {
    for (const field of DESCRIPTOR_FIELDS) {
      if (new RegExp(`(^|[\\s{,(])${field}\\s*:`, "m").test(clean)) {
        problems.push(`${relative}: writes \`${field}:\` — a session descriptor is a WHOLE ROW off the frozen table (${SOURCE_TABLE}), never assembled at a call site`);
      }
      if (new RegExp(`\\.${field}\\s*=[^=]`).test(clean) || new RegExp(`\\[\\s*["']${field}["']\\s*\\]\\s*=[^=]`).test(clean)) {
        // BOTH SPELLINGS. `s.originRole = "fleet"` and `s["originRole"] = "fleet"` are one edit;
        // a detector that saw only the dotted form would have been walked past by the bracket one.
        problems.push(`${relative}: assigns \`${field}\` — a descriptor is frozen DATA; overriding a field of one produces a route/origin pair the table never declared`);
      }
    }
  }

  if (DESCRIPTOR_SPREAD_ORIGIN.test(clean) || DESCRIPTOR_SPREAD_ROUTE.test(clean)) {
    problems.push(`${relative}: spreads a descriptor and overrides \`originRole\`/\`path\` — \`{ ...LOCAL_PTY, originRole: "fleet" }\` builds a FLEET url for a board PTY, and the core's duck-typing (which is deliberate: a third source is a table ROW) cannot refuse it`);
  }
  if (NAMES_A_SOURCE_KIND.test(clean) && IMPORTS_TERMINAL_CORE.test(clean) && !USES_THE_TABLE.test(clean)) {
    problems.push(`${relative}: names a session-source kind and reaches into the terminal core, but never calls \`sessionSourceFor\`/\`sessionSourceTable\` — a call site that knows a kind must ASK for the row rather than restate it`);
  }
  return problems;
}

// ADR-003's FORBIDDEN SPELLINGS, named in that ADR so a reviewer can grep for them. They are the
// core's own half of the same rule the ratchet above puts on the call sites: every derivation is
// keyed on a descriptor FIELD, never on which kind it is or where it is rendered.
const FORBIDDEN_SPELLINGS = [
  ["if (remote", /\bif\s*\(\s*!?\s*remote\b/],
  ["isRemote", /\bisRemote\b/],
  ['kind === "mirror"', /\bkind\s*===?\s*["']mirror["']/],
  ['kind === "local-pty"', /\bkind\s*===?\s*["']local-pty["']/],
  ["origin ===", /\borigin\s*===/],
];

export const archTests = [
  // ══ THE STRIPPER ITSELF, FIRST — TECH_DEBT item 24. Every clause below is an ABSENCE sweep
  //    over comment-stripped source, and a blinded stripper turns every one of them green while
  //    asserting nothing. The subject here is `ui/src/terminal/**`, whose ADRs REQUIRE prose
  //    explaining the defects it guards against, so the fuse is lit in this folder by design.
  {
    name: "arch/46 (acd-terminal-control-boundary) self-check: the shared comment stripper is not blinded — a line comment containing `/*` does not delete the file below it (TECH_DEBT item 24)",
    run: async () => {
      assert.deepEqual(stripperSelfCheck(), [], "the stripper strips LINE comments first and BLOCK comments second; the other order eats the file at the first `//` containing `/*`");
    },
  },

  {
    name: "arch/46 ADR-001 (acd-terminal-control-boundary): the ui/src/terminal/ set imports no React, touches no DOM global, and is loadable by plain node",
    run: async () => {
      // THE TEXT SWEEP READS `.d.mts` TOO. The declaration siblings are part of the shared set
      // and can import a framework as freely as the modules can — `import type { RefObject }
      // from "react"` in a `.d.mts` would drag React's types into the boundary while a
      // `.mjs`-only sweep read green. All of them are clean today, so this closes a hole in
      // the gate rather than a violation in the code, which is exactly when it is cheap.
      const swept = await collect(TERMINAL_DIR, [".mjs", ".d.mts"]);
      const modules = swept.filter((file) => file.endsWith(".mjs"));
      assert.ok(modules.length >= 5, `the shared set was actually read (non-vacuous): ${modules.length} modules`);
      assert.ok(swept.length >= modules.length * 2, `…and its declaration siblings: ${swept.length - modules.length} .d.mts`);

      const reactOffenders = [];
      const domOffenders = [];
      for (const file of swept) {
        const text = await readFile(file, "utf8");
        const clean = stripComments(text);
        for (const specifier of importSpecifiers(text).map((entry) => entry.specifier)) {
          if (/^react(-dom)?(\/|$)/.test(specifier) || /^@xterm\//.test(specifier)) {
            reactOffenders.push(`${rel(file)} → ${specifier}`);
          }
        }
        if (/\bJSX\b|<\/[A-Za-z]/.test(clean)) reactOffenders.push(`${rel(file)} → JSX`);
        for (const global of BROWSER_GLOBALS) {
          if (new RegExp(`\\b${global}\\b`).test(clean)) domOffenders.push(`${rel(file)} → ${global}`);
        }
      }

      assert.deepEqual(reactOffenders, [], "a decision that lives in JSX is a decision no test in this repo can reach — the shared set holds the logic and imports no framework, in its modules AND in its declarations");
      assert.deepEqual(domOffenders, [], "the shared set does not READ a browser global; it RECEIVES one. That is what makes the origin handling, the geometry, the drag clamp and the state ramp testable at all.");

      // Asserted as behaviour as well as text: every module loads under plain `node`, with no
      // bundler and no DOM.
      for (const file of modules) {
        const loaded = await import(`file://${file.replaceAll("\\", "/")}`);
        assert.ok(Object.keys(loaded).length > 0, `${rel(file)} loads under plain node and exports something`);
      }

      // Each `.mjs` carries its `.d.mts` sibling, as every existing helper here does — the
      // `.tsx` consumer gets its types from the module that owns the decision.
      const missingTypes = [];
      for (const file of modules) {
        const sibling = file.replace(/\.mjs$/, ".d.mts");
        try {
          await readFile(sibling, "utf8");
        } catch {
          missingTypes.push(rel(file));
        }
      }
      assert.deepEqual(missingTypes, [], "every .mjs has its .d.mts sibling");
    },
  },

  {
    name: "arch/46 ADR-005 (acd-terminal-control-boundary): the shared set imports NOTHING from ui/src/fleet/ or ui/src/board/",
    run: async () => {
      const files = await collect(TERMINAL_DIR, [".mjs", ".d.mts", ".ts", ".tsx"]);
      assert.ok(files.length >= 5, `non-vacuous: ${files.length} files`);

      const offenders = [];
      for (const file of files) {
        for (const specifier of importSpecifiers(await readFile(file, "utf8")).map((entry) => entry.specifier)) {
          if (specifier.startsWith(".")) {
            const resolved = path.resolve(path.dirname(file), specifier);
            const relative = rel(resolved);
            if (relative.startsWith("ui/src/fleet/") || relative.startsWith("ui/src/board/")) {
              offenders.push(`${rel(file)} → ${specifier}`);
            }
          }
          if (/(^|\/)(fleet|board)\//.test(specifier)) offenders.push(`${rel(file)} → ${specifier}`);
        }
      }

      assert.deepEqual(
        offenders,
        [],
        "a shared control importing `ui/src/fleet/assignments.mjs` would re-couple the two surfaces this milestone exists to decouple, invisibly, from inside a module named for terminals. The fleet's assignment-derived wording is INJECTED as a `reason` string by the call site.",
      );

      // The clean baseline, asserted positively so the rule reads as a REPLACEMENT rather than
      // a prohibition: the shared describer accepts an injected reason, and the shared identity
      // model accepts an injected far-end name.
      const ramp = stripComments(await readFile(path.join(TERMINAL_DIR, "state-ramp.mjs"), "utf8"));
      assert.match(ramp, /\breason\b/, "the shared describer takes the wording it cannot compute as an argument");
      assert.ok(!/assignmentChip|assignments\.mjs/.test(ramp), "…and computes no assignment state of its own");
      const identity = stripComments(await readFile(path.join(TERMINAL_DIR, "pane-identity.mjs"), "utf8"));
      assert.equal(nonVacuousSource("ui/src/terminal/pane-identity.mjs", identity), null);
      assert.match(identity, /\bfarEnd\b/, "the shared identity model takes the far end's NAME as an argument rather than reaching for a surface's vocabulary");
      assert.ok(!/\bnodeId\b|\bsessionId\b|\btargetNodeId\b/.test(identity), "…and names no source's params, so a third source needs no edit here");
    },
  },

  // ══ PROMOTED BY 46/04 out of the parked `acd-terminal-control-boundary.mjs`, in the same diff
  //    that deleted the duplicate. Body unchanged: it was written against the post-deletion tree.
  //
  //    WHY IT WAS RED UNTIL NOW, which is its non-vacuity proof:
  //    `ui/src/board/terminal/dock-state.mjs` defined `DOCK_STATES` and
  //    `ui/src/fleet/terminal-view/view-state.mjs` defined `TERMINAL_VIEW_STATES`.
  {
    name: "arch/46 ADR-005 (acd-terminal-control-boundary): ONE state vocabulary — neither DOCK_STATES nor TERMINAL_VIEW_STATES is defined anywhere in ui/src",
    run: async () => {
      const files = await collect(UI_SRC, [".mjs", ".d.mts", ".ts", ".tsx", ".js", ".jsx"]);
      assert.ok(files.length > 30, `ui/src was actually read (non-vacuous): ${files.length} files`);

      const offenders = [];
      for (const file of files) {
        const clean = stripComments(await readFile(file, "utf8"));
        for (const retired of ["DOCK_STATES", "TERMINAL_VIEW_STATES"]) {
          if (new RegExp(`\\b(const|let|var|declare const)\\s+${retired}\\b`).test(clean)) {
            offenders.push(`${rel(file)} → ${retired}`);
          }
        }
      }

      assert.deepEqual(
        offenders,
        [],
        "two ramps shipped and neither was a superset of the other; after this milestone there is ONE. A surviving second vocabulary is how the same fact acquires two words again — `running` beside `streaming`, `disconnected` beside `error` — and the operator reads whichever surface they happen to be on.",
      );

      // Non-vacuity in the other direction: the ONE vocabulary genuinely exists and is the
      // seven-plus-fallback set, so this clause cannot be satisfied by deleting both.
      const { TERMINAL_STATE_LIST } = await import(`file://${path.join(TERMINAL_DIR, "state-ramp.mjs").replaceAll("\\", "/")}`);
      assert.deepEqual(
        [...TERMINAL_STATE_LIST],
        ["idle", "connecting", "waiting", "streaming", "ended", "error", "unavailable"],
        "…and the ONE vocabulary is the merged seven",
      );
    },
  },

  {
    name: "arch/46 DG-46-2 (acd-terminal-control-boundary): the terminal palette has ONE home, read by BOTH consumers",
    run: async () => {
      const files = await collect(UI_SRC, [".mjs", ".d.mts", ".ts", ".tsx", ".js", ".jsx", ".css"]);
      const homes = new Map();
      for (const file of files) {
        const text = await readFile(file, "utf8");
        for (const hex of PALETTE) {
          if (text.includes(hex)) {
            if (!homes.has(hex)) homes.set(hex, []);
            homes.get(hex).push(rel(file));
          }
        }
      }

      const offenders = [];
      for (const hex of PALETTE) {
        const where = homes.get(hex) ?? [];
        if (where.length !== 1 || where[0] !== PALETTE_HOME) offenders.push(`${hex} → ${where.join(", ") || "(nowhere)"}`);
      }
      assert.deepEqual(
        offenders,
        [],
        `the four dark surface literals plus the foreground get ONE named home (${PALETTE_HOME}). After this milestone they are painted by one component, so a second copy is a second product. NOTE FOR A BUILD THAT TRIPS THIS: DESIGN's §C0/§S1 checklists spell these classes as literal hex strings, and copying DESIGN verbatim into JSX is exactly what this clause refuses — the component IMPORTS the class constants.`,
      );

      // BOTH CONSUMERS read from that home — the xterm `theme: { background, foreground }`
      // object and the documented class list. Half of DG-46-2 is "one home"; the other half is
      // "read by both", and a constant only one consumer reads is a constant the other will
      // drift away from.
      const palette = await import(`file://${path.join(TERMINAL_DIR, "palette.mjs").replaceAll("\\", "/")}`);
      assert.equal(palette.TERMINAL_XTERM_THEME.background, palette.TERMINAL_VIEWPORT_BG, "consumer 1: the xterm theme's background IS the named constant");
      assert.equal(palette.TERMINAL_XTERM_THEME.foreground, palette.TERMINAL_FOREGROUND, "consumer 1: …and its foreground");
      assert.ok(palette.TERMINAL_VIEWPORT_BG_CLASS.includes(palette.TERMINAL_VIEWPORT_BG), "consumer 2: the class list carries the same value");
      assert.ok(palette.TERMINAL_CHROME_BG_CLASS.includes(palette.TERMINAL_CHROME_BG));
      assert.ok(palette.TERMINAL_BORDER_CLASS.includes(palette.TERMINAL_BORDER));
      assert.ok(palette.TERMINAL_PICKER_WELL_BG_CLASS.includes(palette.TERMINAL_PICKER_WELL_BG));
      assert.ok(palette.TERMINAL_FOREGROUND_CLASS.includes(palette.TERMINAL_FOREGROUND));

      // AND THE CLASS STRINGS STAY LITERALS THE SCANNER CAN SEE — m45's GAP-4 lesson, not an
      // invitation to build class names at runtime. A Tailwind class assembled from a variable
      // is a class Tailwind never emits.
      const paletteText = stripComments(await readFile(path.join(TERMINAL_DIR, "palette.mjs"), "utf8"));
      for (const hex of PALETTE) {
        assert.ok(
          new RegExp(`"[a-z-]*\\[${hex}\\][^"]*"|"[a-z:-]*\\[${hex}\\][^"]*"`).test(paletteText),
          `${hex}'s class is a literal string the Tailwind scanner can see, never assembled at runtime`,
        );
      }
      assert.ok(!/`[^`]*\$\{[^}]*\}[^`]*\[#/.test(paletteText), "no class name is interpolated");
    },
  },

  // ══ THE CALL-SITE RATCHET (46/04, ADR-002) ══════════════════════════════════════════════════
  {
    name: "arch/46 ADR-002 (acd-terminal-control-boundary): a production ui/src module obtains a session descriptor from the TABLE — it never assembles or overrides one",
    run: async () => {
      const files = await collect(UI_SRC, [".mjs", ".ts", ".tsx", ".js", ".jsx"]);
      assert.ok(files.length > 30, `ui/src was actually read (non-vacuous): ${files.length} files`);

      const offenders = [];
      let callSites = 0;
      for (const file of files) {
        const relative = rel(file);
        const clean = stripComments(await readFile(file, "utf8"));
        if (USES_THE_TABLE.test(clean)) callSites += 1;
        offenders.push(...descriptorAssemblyProblems(relative, clean));
      }

      assert.deepEqual(
        offenders,
        [],
        "ADR-002: the control derives every behaviour from a WHOLE row of the frozen table, and the builder keys on the descriptor's FIELDS rather than on its kind so a third source is a table ROW. The cost of that (deliberate, load-bearing) duck-typing is that a hand-built `{ ...LOCAL_PTY, originRole: \"fleet\" }` is accepted and dials the FLEET for a board PTY — so the refusal lives here, at the call site.",
      );

      // NON-VACUOUS: real call sites exist and really do use the lookup. A ratchet that fired on
      // nobody would be satisfied by deleting both call sites, which is precisely the class of
      // green-and-vacuous gate ADR-006 caught in invariant 4's sibling.
      // RAISED 2 → 3 by m49/03, in the diff that lands the third call site
      // (`ui/src/home/session-mount.mjs`). It is a LIST, not an invariant: the RULE is that a
      // call site asks the table rather than restating a row, and this number is only its
      // non-vacuity. It rises when a call site lands and never falls to accommodate one.
      assert.ok(callSites >= 3, `all THREE call-site mount modules resolve their source through the table — found ${callSites}`);

      // …and the detector genuinely fires. Hand-written plants, each asserted to LAND before the
      // detector is asserted to trip on it, and a clean baseline that must stay quiet.
      const clean = 'const lookup = sessionSourceFor("mirror");\nconst source = lookup.source;';
      assert.deepEqual(descriptorAssemblyProblems("ui/src/fleet/plant.mjs", clean), [], "the clean baseline — ask the table for the row — stays quiet");

      const plants = [
        ["the spread override ADR-002 names", 'const source = { ...LOCAL_PTY, originRole: "fleet" };'],
        ["a route overridden on a spread descriptor", 'const source = { ...MIRROR, path: "/ws/terminal" };'],
        ["a descriptor written out by hand", 'const source = { kind: "mirror", path: "/ws/terminal-view", originRole: "fleet", canInput: true };'],
        ["a field assigned after the fact", "source.canInput = false;"],
        ["…and the same edit spelled with a bracket", 'source["originRole"] = "fleet";'],
        [
          "a kind named without asking the table, in a module that reaches into the core",
          'import { geometryPlanFor } from "../terminal/geometry.mjs";\nif (session.kind === "local-pty") return { ref, provider };',
        ],
      ];
      for (const [label, plant] of plants) {
        assert.notEqual(plant, clean, `${label}: the plant differs from the clean baseline`);
        assert.ok(
          descriptorAssemblyProblems("ui/src/board/plant.mjs", plant).length > 0,
          `self-check: ${label} trips the ratchet — ${plant}`,
        );
      }

      // The ONE exemption is the table's own home, and it is exempt BY PATH so nothing else can
      // acquire the licence by looking similar.
      assert.deepEqual(
        descriptorAssemblyProblems(SOURCE_TABLE, plants.map(([, plant]) => plant).join("\n")),
        [],
        "the frozen table's own module is the one place a descriptor field is written",
      );
    },
  },

  {
    name: "arch/46 ADR-001 / TECH_DEBT 18(a) (acd-terminal-control-boundary): the `fleet → board` import set is SHRINK-ONLY, and `.d.mts` counts — a type-only edge is invisible to the graph and is exactly how a sixth one arrived",
    run: async () => {
      // `.d.mts` IS IN THIS LIST DELIBERATELY. The edge this ratchet was written for was a
      // `import type { … } from "../board/dock-mount.mjs"` in a declaration file: no runtime
      // import, no graph edge, no reviewer's eye — and a shared CONTRACT living in one consumer's
      // folder, which is 18(a)'s exact shape.
      const files = await collect(path.join(UI_SRC, "fleet"), [".mjs", ".d.mts", ".ts", ".tsx"]);
      assert.ok(files.length >= 8, `the fleet surface was actually read (non-vacuous): ${files.length} files`);

      const found = new Set();
      const where = new Map();
      for (const file of files) {
        for (const specifier of fleetToBoardSpecifiers(await readFile(file, "utf8"))) {
          found.add(specifier);
          if (!where.has(specifier)) where.set(specifier, []);
          where.get(specifier).push(rel(file));
        }
      }

      const added = [...found].filter((specifier) => !FLEET_TO_BOARD_BASELINE.includes(specifier)).sort();
      assert.deepEqual(
        added,
        [],
        `NEW \`fleet → board\` import(s): ${added.map((s) => `${s} (in ${where.get(s).join(", ")})`).join("; ")}. TECH_DEBT 18(a) is the fleet reaching into the board's folder — measured at SEVEN cross-imports at m43 and at FIVE modules here — and ADR-001 exists to reduce it, not to add to it: "a sixth would be added by the one milestone chartered to reduce coupling". A shared thing belongs in a shared home (\`ui/src/terminal/\`), which both surfaces import DOWN into; a thing only the board needs stays the board's.`,
      );

      // SHRINK-ONLY: a baseline entry that no longer fires must be DELETED, or the list rots into
      // a permission slip — the same discipline `acd-shell-z-ladder-single-home` keeps.
      const stale = FLEET_TO_BOARD_BASELINE.filter((specifier) => !found.has(specifier));
      assert.deepEqual(
        stale,
        [],
        `these baseline entries no longer fire and must be REMOVED: ${stale.join(", ")}. The list may only ever shrink.`,
      );

      // …and the detector genuinely sees a `.d.mts` edge, which is the whole reason it exists.
      const planted = 'import type { TerminalMountDeclaration } from "../board/dock-mount.mjs";\nexport type X = TerminalMountDeclaration;';
      assert.deepEqual(fleetToBoardSpecifiers(planted), ["../board/dock-mount.mjs"], "self-check: a TYPE-ONLY import into the board's folder is an edge this gate counts");
      assert.deepEqual(fleetToBoardSpecifiers('import type { X } from "../terminal/mount.mjs";'), [], "…and the shared home is not");
    },
  },

  {
    // ═══ m49/ADR-001's INSTALMENT: the `home →` baseline, and it is EMPTY ═════════════════════════
    // Delivered by story 49/02, in the milestone that creates `ui/src/home/`, because an empty
    // baseline is a thing a directory has exactly once. Graph-measured at this delivery (project-root
    // build, 9,836 nodes / 23,762 edges, egress none, built 2026-08-13T14:12:15.984Z):
    // `ui/src/home/feed-axis.mjs → ui/src/home/socket-cap.mjs, ui/src/terminal/host-model.mjs,
    // ui/src/terminal/state-ramp.mjs` — DOWN into `terminal/` only, and `layout.mjs`/`socket-cap.mjs`
    // are leaves (→ 0). The rule holds today; this pins it so story 03's mount declaration, 04's route
    // and 05's grid cannot reach sideways for "just the one" fleet helper.
    name: "arch/49 ADR-001 (acd-terminal-control-boundary): the `home → fleet|board` import set is EMPTY and stays empty — the home imports DOWN into ui/src/terminal/ and ui/src/app/, and NOTHING sideways",
    run: async () => {
      const HOME_DIR = path.join(UI_SRC, "home");
      const files = await collect(HOME_DIR, [".mjs", ".d.mts", ".ts", ".tsx"]);

      // NON-VACUITY FIRST, AND IT IS NOT DECORATION HERE. `collect()` returns `[]` for a directory
      // that does not exist — so on a tree where `ui/src/home/` was renamed, moved or not yet
      // created, an empty-baseline check would sweep NOTHING and report a perfect green. An empty
      // answer from a sweep is indistinguishable from a clean tree unless the sweep says how much it
      // saw, which is the shape this repo keeps re-finding (`acd-ui-surface-file-budget`'s
      // `scanned > 50`, and this file's own `files.length >= 8` beside it).
      assert.ok(
        files.length >= 3,
        `the terminals home was actually read (non-vacuous): found ${files.length} files under ui/src/home/. If this directory moved, RE-AIM this sweep at it — an empty-baseline ratchet pointed at a directory that is not there is the strongest-looking green in the file and asserts nothing.`,
      );

      const found = new Set();
      const where = new Map();
      for (const file of files) {
        for (const specifier of homeToSurfaceSpecifiers(await readFile(file, "utf8"))) {
          found.add(specifier);
          if (!where.has(specifier)) where.set(specifier, []);
          where.get(specifier).push(rel(file));
        }
      }

      const added = [...found].filter((specifier) => !HOME_TO_SURFACE_BASELINE.includes(specifier)).sort();
      assert.deepEqual(
        added,
        [],
        `NEW \`home → fleet|board\` import(s): ${added.map((s) => `${s} (in ${where.get(s).join(", ")})`).join("; ")}. The baseline is EMPTY and shrink-only from zero, so there is no such thing as an allowed one (m49/ADR-001). The home reads the same \`/api/mesh/status\` payload the fleet polls and will keep wanting its client, its chips and its empty states — and taking them by import is precisely how \`ui/src/board/\` became the shared library by accident (TECH_DEBT 18(a), still five edges wide in the baseline above). If the home and the fleet genuinely want the same thing, it goes to \`ui/src/components/\` or to \`ui/src/terminal/\`, which both surfaces import DOWN into. Adding an entry to this list is NOT the fix and never will be: it is a five-line refactor recorded as a permission.`,
      );

      // BOTH DIRECTIONS, because a detector that flagged every import would be relaxed inside a
      // milestone and would be forbidding the refactor it is supposed to force.
      const sideways = [
        ["a runtime import of the fleet's API client", 'import { fetchMeshStatus } from "../fleet/api";'],
        ["a runtime import of a board helper", 'import { freshnessOf } from "../board/freshness.mjs";'],
        ["a TYPE-ONLY import — invisible to the graph, and exactly how a sixth fleet→board edge arrived", 'import type { MeshSession } from "../fleet/api";'],
        ["a deeper file reaching back up two levels", 'import { assignmentChip } from "../../fleet/assignments.mjs";'],
        ["an aliased specifier that resolves to the same place", 'import { runsOf } from "@/board/runs.mjs";'],
      ];
      for (const [label, plant] of sideways) {
        assert.ok(homeToSurfaceSpecifiers(plant).length > 0, `self-check: ${label} is an edge this gate counts — ${plant}`);
        assert.deepEqual([...homeToSurfaceSpecifiers(plant)].filter((s) => HOME_TO_SURFACE_BASELINE.includes(s)), [], `…and the EMPTY baseline forgives none of it: ${label}`);
      }

      const permitted = [
        ["the shared terminal core — the whole point of ADR-001", 'import { sessionSourceFor } from "../terminal/source-table.mjs";'],
        ["the shell's published region constants", 'import { CONTENT_REGION_ID } from "../app/shell-layout.mjs";'],
        ["the tree's actual shared component home", 'import { EmptyState } from "../components/EmptyState.tsx";'],
        ["a sibling inside the home itself", 'import { MAX_LIVE_PANES } from "./socket-cap.mjs";'],
        ["a terminal module whose NAME contains a surface word", 'import { boardChrome } from "../terminal/board-chrome.mjs";'],
      ];
      for (const [label, allowed] of permitted) {
        assert.deepEqual(homeToSurfaceSpecifiers(allowed), [], `self-check: ${label} is NOT an edge this gate counts — forbidding it would forbid the structure ADR-001 exists to protect. ${allowed}`);
      }

      // AND THE RATCHET IS DRIVEN THROUGH THE SAME COMPARISON THE CLAUSE ABOVE USES, over a
      // synthesized file listing — never by writing a plant into `ui/src/home/`, which would race
      // every other suite reading that tree and would survive a crashed run.
      const plantedFound = new Set(homeToSurfaceSpecifiers('import { fetchMeshStatus } from "../fleet/api";\nimport { StaleBadge } from "../board/StaleBadge";'));
      const plantedAdded = [...plantedFound].filter((specifier) => !HOME_TO_SURFACE_BASELINE.includes(specifier)).sort();
      assert.deepEqual(
        plantedAdded,
        ["../board/StaleBadge", "../fleet/api"],
        "self-check: the ratchet's OWN comparison (found minus baseline) reports a planted sideways pair — the empty baseline subtracts nothing, which is what makes it strict",
      );
      assert.ok(plantedAdded.length > 0, "…and the plant genuinely LANDED before the comparison was asked");
    },
  },

  {
    // `collapsed` CAN RE-ENTER THE SESSION EFFECT WITH EVERY OTHER GATE GREEN, and a structural
    // review proved it: planting `collapsed` into the dep array passes everything, because the
    // string-identity design is a CONVENTION at the consumer and nothing reads it back.
    //
    // `host-model.mjs` exports `HOST_LAYOUT_FLAGS` for exactly this and nothing consumed it. This
    // is the consumer.
    name: "arch/46 (acd-terminal-control-boundary): the session effect's dependency list contains NO layout fact — collapsing must not tear the session down, and that is now read back rather than trusted",
    run: async () => {
      const { HOST_LAYOUT_FLAGS } = await import(`file://${path.join(TERMINAL_DIR, "host-model.mjs").replaceAll("\\", "/")}`);
      assert.ok(HOST_LAYOUT_FLAGS.length >= 2, `the layout flags are enumerated (non-vacuity): ${HOST_LAYOUT_FLAGS.join(", ")}`);

      const control = stripComments(await readFile(path.join(TERMINAL_DIR, "TerminalControl.tsx"), "utf8")).replace(/\r\n/g, "\n");
      assert.equal(nonVacuousSource("ui/src/terminal/TerminalControl.tsx", control), null);

      // THE SESSION EFFECT IS FOUND BY WHAT IT DOES, not by what it depends on — the one that
      // OPENS THE SOCKET. Picking it by "mentions `sessionKey`" would also catch the LAYOUT
      // effect, which legitimately re-runs on collapse and on fullscreen (the pane must re-fit
      // into a box that just changed), and forbidding a layout fact there would be forbidding
      // layout from responding to layout. Two effects, two jobs, one of them session-identity's.
      const effects = [];
      for (const match of control.matchAll(/useEffect\(\s*\(\)\s*=>\s*\{/g)) {
        const open = control.indexOf("{", match.index + "useEffect(".length);
        let depth = 0;
        let end = open;
        for (; end < control.length; end += 1) {
          if (control[end] === "{") depth += 1;
          else if (control[end] === "}") {
            depth -= 1;
            if (depth === 0) break;
          }
        }
        const body = control.slice(open, end + 1);
        const deps = /^\s*,\s*\[([^\]]*)\]/.exec(control.slice(end + 1));
        effects.push({ body, deps: deps?.[1] ?? null });
      }
      assert.ok(effects.length >= 2, `the component's effects were found (non-vacuity): ${effects.length}`);

      const sessionDeps = effects.filter((effect) => /new WebSocket\(/.test(effect.body)).map((effect) => effect.deps);
      assert.equal(sessionDeps.length, 1, `exactly ONE effect opens the socket — that is the session effect, and it is the one this clause is about (found ${sessionDeps.length})`);
      assert.ok(sessionDeps[0] != null, "…and its dependency list is readable");

      for (const list of sessionDeps) {
        for (const flag of HOST_LAYOUT_FLAGS) {
          assert.ok(
            !new RegExp(`\\b${flag}\\b`).test(list),
            `\`${flag}\` is in a session effect's dependency list: [${list.trim()}]. Collapsing must NOT tear the session down — the WebSocket, the PTY, the running agent and the scrollback all survive it — and a layout fact in these deps is exactly how that free operation starts costing an operator their agent. The dependency is \`sessionKey\`, whose inputs are the source, its params, the posture and the run token, and nothing else.`,
          );
        }
      }

      // NON-VACUOUS IN THE OTHER DIRECTION: the effect really does depend on the identity string
      // rather than on a props object. The fleet card builds a NEW mount object every render, so
      // an effect keyed on props identity would tear the session down on every poll.
      assert.match(control, /const sessionKey = useMemo\(/, "the identity is memoised as a value");
      assert.match(control, /terminalSessionIdentity\(/, "…by the shared model, not by a local join");
    },
  },

  {
    // ADDED 46/05, and it pins a MEASURED defect rather than a preference. The control reads the
    // shell's published `--aof-shell-chrome-height` to derive the box its drag clamp is half of.
    // It read it off `document.documentElement` — and the shell publishes on the shell ROOT, a
    // DESCENDANT of that element. A CSS custom property inherits DOWNWARDS, so the read returned
    // the EMPTY STRING and every clamp silently degraded back to the viewport: the exact defect
    // the clamp exists to fix, wearing the fix's own name, with every suite green.
    //
    // Verified in headless Chromium against this DOM shape: `""` off `document.documentElement`,
    // `"48px"` off the dock's own section, `"48px"` off an element inside a `position: fixed` box.
    //
    // WHY A GATE AND NOT A TEST. `readContentBoxHeight` is module-private in a `.tsx`, and all
    // three SURFACE harnesses stub the control out BY MODULE PATH because it wants a real DOM.
    // (Since 2026-08-09 `terminal-control-opens-its-socket` does mount the control and does run
    // this function — but against a `getComputedStyle` stand-in that answers for every element,
    // so it can never see the WRONG-ELEMENT read this clause is about. A gate is still the only
    // thing that can.) The ARITHMETIC now lives in `clamp.mjs` where tests can reach it; what is
    // left in the component is the read, and this is what holds the read.
    name: "arch/46 ADR-009 (acd-terminal-control-boundary): the control reads the shell's published custom property off an ELEMENT it holds a ref to — never off `document.documentElement`, which is the shell root's PARENT and inherits nothing down to it",
    run: async () => {
      const file = path.join(TERMINAL_DIR, "TerminalControl.tsx");
      const control = stripComments(await readFile(file, "utf8"));
      assert.equal(nonVacuousSource("ui/src/terminal/TerminalControl.tsx", control), null);

      // It reads the property at all (non-vacuity: this clause is about HOW, so it must fail
      // loudly if the read is gone rather than pass because there is nothing to check).
      assert.match(control, /getComputedStyle\s*\(/, "the control reads the published property");
      assert.match(control, /CHROME_HEIGHT_PROPERTY/, "…by its imported name, never a retyped string");

      // …and NOT off the document element, in any spelling.
      const offenders = [...control.matchAll(/getComputedStyle\s*\(([^)]*)\)/g)].map((match) => match[1].trim());
      for (const argument of offenders) {
        assert.ok(
          !/document\s*\.\s*documentElement|document\s*\.\s*body/.test(argument),
          `\`getComputedStyle(${argument})\` reads the shell's published property off a document-level element. The shell publishes on the shell ROOT — a DESCENDANT of \`document.documentElement\` — and a custom property inherits DOWNWARDS, so this returns "" and the clamp silently falls back to the whole viewport. Read it off an element the control itself renders (it is inside the shell root, so it inherits).`,
        );
      }
      assert.ok(offenders.length > 0, `the detector actually found a \`getComputedStyle\` call (non-vacuous): ${offenders.length}`);

      // …and the ARITHMETIC is not back in the component: the box is derived by the shared
      // module, which is what makes it drivable at all (ADR-001).
      assert.match(control, /contentRegionHeight\s*\(/, "the box is derived by clamp.mjs's `contentRegionHeight`, not by arithmetic inlined here");
      const { contentRegionHeight } = await import(`file://${path.join(TERMINAL_DIR, "clamp.mjs").replaceAll("\\", "/")}`);
      assert.equal(contentRegionHeight(800, "48px"), 752, "…and that derivation is a value a test can read");
      assert.equal(contentRegionHeight(800, ""), 800, "…including the no-shell case the `0px` CSS fallback mirrors");
      assert.equal(contentRegionHeight(0, "48px"), null, "…and an unusable viewport is UNMEASURED, never a negative box");
    },
  },

  {
    name: "arch/46 ADR-003 (acd-terminal-control-boundary): no module in ui/src/terminal/ keys a derivation on the KIND, on `isRemote`, on a transport or on an origin — the descriptor's declared FIELDS are the only input",
    run: async () => {
      const files = (await collect(TERMINAL_DIR, [".mjs", ".tsx"])).filter((file) => rel(file) !== SOURCE_TABLE);
      assert.ok(files.length >= 8, `the control's own set was actually read (non-vacuous): ${files.length} files`);

      const offenders = [];
      for (const file of files) {
        const clean = stripComments(await readFile(file, "utf8"));
        assert.equal(nonVacuousSource(rel(file), clean), null);
        for (const [label, needle] of FORBIDDEN_SPELLINGS) {
          if (needle.test(clean)) offenders.push(`${rel(file)} → ${label}`);
        }
      }

      assert.deepEqual(
        offenders,
        [],
        "ADR-003 names these spellings so a reviewer can grep for them: `remote` names a TRANSPORT while every behaviour it used to gate is a property of the FAR END. The spike measured a `resize(143, 41)` reaching a board PTY over a CROSS-ORIGIN socket, so resizability is not a property of which origin served the page — and a control that branched on the kind would need a fourth edit for a third source instead of a table row.",
      );

      // …and the detector fires on every one of them.
      for (const [label, needle] of FORBIDDEN_SPELLINGS) {
        const plant = {
          "if (remote": "if (remote != null) return SCALE;",
          isRemote: "const mode = isRemote ? 'scale' : 'fit';",
          'kind === "mirror"': 'if (source.kind === "mirror") return FIXED;',
          'kind === "local-pty"': 'const fit = source.kind === "local-pty";',
          "origin ===": 'if (origin === fleetOrigin) return SCALE;',
        }[label];
        assert.ok(needle.test(plant), `self-check: the detector fires on ${label} — ${plant}`);
      }
    },
  },
];
