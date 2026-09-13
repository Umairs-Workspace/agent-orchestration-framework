// Fitness function: acd-fleet-filter-single-home (m47 / ADR-001 + ADR-003) —
//
//   "The fleet's repo filter has ONE home: `ui/src/fleet/scope.mjs`. No sibling filter module
//    exists, no module outside that home names the `repo` query key — not the router, not the
//    shell nav — and the narrowing has exactly ONE call site."
//
// EXPECTED, at refine time (2026-08-10): **2 GREEN, 1 RED**. The two structural sweeps pass on
// the CURRENT tree — there is no sibling module and nothing names `repo` yet — so they are
// ratchets that arm before the build rather than reports on it. The third is RED until m47's
// stories land: `filterToWorkspace` (`scope.mjs:162`) is exported, typed (`scope.d.mts:44`) and
// pinned by `test/ui/fleet-scope.test.mjs`, and **`Fleet.tsx` does not import it**. That is the
// measurement ADR-002 turns on — the client-side narrowing already exists, is already tested,
// and has never rendered anything.
//
// WHY A SIBLING MODULE IS THE FAILURE MODE, and why it is the tidy-looking one. `scope.mjs`
// already owns the narrowing concept: the URL round-trip (`withScopeParam`/`scopeFromSearch`),
// the client filter (`filterToWorkspace`), the empty predicate (`isEmptyStatus`) and the empty
// copy (`emptyStateCopy`). A new `repo-filter.mjs` would not be a new concept — it would be HALF
// of an existing one, and the two halves would each own a different half of the same question
// ("what is this view narrowed to"). m45/ADR-006 pinned the same rule one layer up in terms:
// "`scope` keeps its existing ONE home in `ui/src/fleet/scope.mjs`".
//
// WHY THE `repo` KEY SWEEP REACHES THE ROUTER AND THE SHELL. m45/ADR-006 makes the router a PATH
// router that carries every unrecognised parameter through by copy-and-delete, and
// `ui/src/app/shell-nav.mjs:161-169`'s href rule is POSITIONAL for the same reason — its own
// comment says a rule that forwarded fleet parameters onto the board "would require the shell to
// know which parameters belong to which surface — which is exactly what keeps milestone 47's repo
// filter local to the fleet." So the filter working "for free" through the shell is a property of
// the shell NOT KNOWING THE NAME, and the way that property dies is one special case, added in a
// hurry, in `routes.mjs` or `shell-nav.mjs`. This sweep is what fails instead.
//
// The m45 invariant "the route module names no query key but `mode`" is NOT re-asserted here:
// `acd-route-logic-framework-free.test.mjs:182-196` already makes exactly that claim, with its
// own non-vacuity check. Two files failing for one cause is the duplicated-home shape these ADRs
// refuse. What is asserted here is the NEW claim — that the filter does not grow a second home.
//
// ── ASSERTION 4 (added 2026-08-12, F-47-04-ARCH-1) — ADR-008's ONE HOME, WHICH WAS UNRATCHETED ──
//
// ADR-008 gives region 5's drop decision ONE home — `ui/src/fleet/assign-affordance.mjs`, "as a
// pure function beside the budget it reads" — and nothing in this repo enforced it. The
// structural review of 47/04 proved that by planting `ui/src/fleet/region5-name-drop.mjs`, a
// SECOND home for the drop predicate with the original export left in place, and the whole
// milestone's gates passed **51 / 51**: this file's sibling-module rule matches
// `/(repo|filter|narrow)/i`, which `region5NameDropped` is not, and its narrowing vocabulary does
// not carry region 5's geometry either. A one-home ADR with no gate is a preference.
//
// NON-VACUITY, SELF-CONTAINED AND RE-RUNNABLE, because this assertion is GREEN ON ARRIVAL — the
// tree honours ADR-008 today, so a green here proves nothing on its own (the milestone has already
// been bitten by a gate whose evidence was a red it produced once, historically, and by a
// self-check that could only run if the assertion it proved had passed). The lane therefore plants
// FIVE mutants in band, through the identical detector the real tree goes through, and requires
// each verdict: the review's own `region5NameDropped` sibling; a differently-NAMED sibling that
// reads a budget (`nameDropped`); a copy that hard-codes the budget's VALUE; a second budget
// constant; and — the case that must stay SILENT — a presentational child that renders a decision
// it is handed. It names the CONCEPT, never today's symbol list: the budgets and their values are
// read OFF the home at run time, so ADR-014 moving `abbreviateDrillIn`/`slotFits` in beside them
// (or renaming any of them) leaves this assertion true without an edit.
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments, functionBody } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const UI_SRC = path.join(repoRoot, "ui", "src");
const FLEET_DIR = path.join(UI_SRC, "fleet");

// THE ONE HOME (m47/ADR-001), and its type sidecar. One module, one sidecar — a second `.d.mts`
// is a second home wearing a type hat.
const FILTER_HOME = "ui/src/fleet/scope.mjs";
const FILTER_HOME_SIDECAR = "ui/src/fleet/scope.d.mts";
const REPO_KEY_ALLOWED = new Set([FILTER_HOME, FILTER_HOME_SIDECAR]);

// The surface that wires the filter up — one call site, and it lives here (m47/ADR-004's seam).
const FLEET_TSX = "ui/src/fleet/Fleet.tsx";

// The narrowing, and the two URL helpers. THE SPELLINGS ARE CANONICAL AND BINDING, and that is a
// lesson paid for in m45: its [Amigos-1] amendment records a build that would have satisfied its
// story brief and failed CI because the brief and the ADR spelled the exported names differently.
// m47/ADR-001 and this test agree, once: `filterToWorkspace`, `repoFromSearch`, `withRepoParam`.
const NARROWING = "filterToWorkspace";
const URL_HELPERS = ["repoFromSearch", "withRepoParam"];

// ── WHAT COUNTS AS A SECOND HOME (m47/ADR-001, as amended at the developer's feasibility pass,
// 2026-08-10 — [Feasibility-2]) ───────────────────────────────────────────────────────────────
//
// The first cut of this gate refused ANY file under ui/src/fleet/ whose NAME matched the concept,
// and the developer found that it forbids the very thing another gate DEMANDS: a `RepoPicker.tsx`
// or a `FilterBanner.tsx` would fail CI, while `acd-ui-surface-file-budget`'s own failure message
// instructs the author to "Extract the next region into a sibling component with a prop boundary"
// — and story 47/03, which adds the control and the chip to a file with 13 lines of ratchet
// headroom, is the story most likely to need exactly that.
//
// ADR-001's intent was never "no file may be named for the filter". It was ONE LOGIC HOME. So the
// gate now distinguishes the two, in three clauses, and the discriminator is EXPORTS rather than
// names — because what makes something a home is what it OWNS, not what it is called:
//
//   (a) a DIRECTORY named for the concept is refused outright. It declares a home by its name
//       whatever it contains, and ADR-001 names `fleet/filter/` as forbidden in terms.
//   (b) a LOGIC MODULE (.mjs/.mts/.ts, not .d.*, not .tsx) named for the concept is refused. In
//       this repo's pattern a plain module IS where logic lives (scope.mjs's own header states
//       the rule), so `repo-filter.mjs` is a second logic home by construction.
//   (c) ANY file in the subtree that EXPORTS narrowing vocabulary is refused, whatever it is
//       called or where it sits. This is the clause that actually catches a second home, and it
//       is what lets (a) and (b) stay narrow.
//
// A presentational `.tsx` therefore passes: it is not a directory, it is not a logic module, and
// it exports a COMPONENT, not a narrowing. Note it is NOT required to import the one home —
// a chip taking `{ name, onClear }` as props imports nothing and is the BETTER shape; requiring
// the import would push state down into the leaf, which is the opposite of the rule's purpose.
const CONCEPT_NAME = /(repo|filter|narrow)/i;

// The vocabulary that MAKES a module a narrowing home. The canonical three by name, plus the
// prefixes any second implementation would reach for. Deliberately prefix-based: a second home
// would not be called `filterToWorkspace2`, it would be called `narrowStatus` or `repoFromUrl`.
//
// [architect F4, 2026-08-11] `isEmptyView` and `resolvedRepoName` were ADDED after 47/02
// landed them. ADR-009 rules the filter-aware emptiness predicate part of the one home, and
// ADR-010 clause 5 makes the resolution the discriminator the copy branches on — so a
// `RepoChip.tsx` exporting either one is exactly the second home ADR-001 refuses, and the
// gate could not see it. The vocabulary has to track the concept, not the day it was written.
const NARROWING_EXPORT = /^(filterTo|filterBy|narrowT|narrowS|narrowing|withRepo|repoFrom|withScope|scopeFrom|isEmptyView|isEmptyStatus|resolvedRepo)/i;

// A `.d.*` file DECLARES; it never CALLS. That is not a convenience exclusion, it is the
// difference between the two things this file asserts about the sidecar — see the call-site sweep
// below, where getting this wrong made the gate contradict its own ADR.
const DECLARATION_FILE = /\.d\.(mts|ts)$/;

// The comment stripper comes from the ONE HOME (`test/support/source-slice.mjs`) rather than a
// fourth copy — it strips WITHOUT eating URLs (the `[^:]` guard: a naive //-stripper deletes from
// the `//` in `href="http://…/?repo=x"` onward, i.e. it hides the exact violation this file exists
// to find) and it takes LINE COMMENTS FIRST, THEN BLOCKS (TECH_DEBT item 24 — a line comment
// containing `/*` opens a block-comment run for a block-first stripper; measured in this
// milestone's refine at 9,192 characters of `src/mesh/ui-serve.mjs`, including its whole route
// table). The self-check at the bottom of assertion 2 pins both properties from here.

const SCANNED_EXT = new Set([".ts", ".tsx", ".mjs", ".mts", ".js", ".jsx"]);

async function uiSourceFiles(dir = UI_SRC, out = []) {
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    if ((await stat(full)).isDirectory()) await uiSourceFiles(full, out);
    else if (SCANNED_EXT.has(path.extname(entry))) out.push(path.relative(repoRoot, full).replaceAll("\\", "/"));
  }
  return out;
}

// The fleet subtree, RECURSIVELY — directories and files alike. [Feasibility-2]: the first cut
// used a flat `readdir`, so a `ui/src/fleet/filter/` DIRECTORY — the shape ADR-001 forbids by
// name — escaped the gate entirely. A non-recursive sweep of a rule about subtrees is a rule
// about one directory.
async function fleetTree(dir = FLEET_DIR, out = { dirs: [], files: [] }) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(repoRoot, full).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      out.dirs.push(rel);
      await fleetTree(full, out);
    } else {
      out.files.push(rel);
    }
  }
  return out;
}

// ── m47/ADR-008 + ADR-014 clause 4: REGION 5'S GEOMETRY HAS ONE HOME TOO (F-47-04-ARCH-1) ──────
//
// ADR-008: the drop predicate lives "as a pure function BESIDE THE BUDGET IT READS" — in
// `assign-affordance.mjs`, which owns `REGION5_NAME_BUDGET_CH`, `REGION5_CHIP_SLOT_BUDGET_CH` and
// `REGION5_DRILLIN_ABBREV_AT_CH` — and "no budget is relaxed to collect" the width a filter frees.
// ADR-014 (2026-08-12) then extends the same clause to the other two decisions and says WHY the
// rule is structural rather than hygienic: **two independent booleans cannot express one ladder.**
// Rung 2's outcome changes rung 4's budget; a decision taken in two components, each seeing one
// element, "is structurally incapable of being right — which is why the defect is a class of frame
// rather than a typo" (F-47-04-QA-8: `Open board` rendering 0.34px of the 65.06 it needs).
//
// SO THE DISCRIMINATOR IS THE COMPARISON, NOT THE IMPORT. Importing a budget is fine and is what a
// consumer does; putting one in a `< > <= >=` is DECIDING, and the decision belongs in the one
// home. That is ADR-014's own routed clause and it is deliberately blind to what the file is
// called and to whether the symbol is exported — `slotFits` and `abbreviateDrillIn` are LOCAL
// consts, which is exactly how they escaped every gate this milestone owns.
//
// THE CONCEPT IS NAMED HERE, NOT TODAY'S SYMBOLS. The budgets are discovered by their own prefix
// off the LOADED module, and their VALUES are read at run time, so this survives ADR-014's nine new
// px facts, its re-derivation of the two `_CH` budgets (they move DOWN), and any rename. Freezing a
// list of today's symbols would have been wrong within hours of being written — ADR-014 landed the
// same day.
const GEOMETRY_HOME = "ui/src/fleet/assign-affordance.mjs";
const GEOMETRY_HOME_SIDECAR = "ui/src/fleet/assign-affordance.d.mts";
const REGION5_CONCEPT = /region[\s_-]?5/i;
const REGION5_BUDGET = /^REGION5_/;

// A region-5 budget INSIDE A COMPARISON — ADR-014 clause 4's test, in both operand orders.
const REGION5_COMPARISON = /\bREGION5_[A-Z0-9_]+\b\s*(?:<=|>=|<|>|===|!==|==|!=)|(?:<=|>=|<|>|===|!==|==|!=)\s*\bREGION5_[A-Z0-9_]+\b/;

// A file DECLARES a budget when it binds one, not when it imports one: `import { REGION5_… }` is
// the correct shape (AssignmentChip.tsx does exactly that), `const REGION5_… =` is a second home.
const DECLARES_BUDGET = /(?:^|[^.\w])(?:const|let|var)\s+(REGION5_\w+|REGION_5\w*)\s*=/;

// Every exported symbol WITH THE REGION IT DEFINES — a function's body, or a const's initialiser
// up to the depth-zero `;`. The region is what makes clause (c) a claim about what an export DOES
// rather than about what it is called, which is the discriminator ADR-001 was re-ruled onto
// ([Feasibility-2]: "what makes something a home is what it EXPORTS, not what it is called").
function exportedDefinitions(source) {
  const code = stripComments(source);
  const definitions = [];
  for (const match of code.matchAll(/\bexport\s+(?:declare\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) {
    definitions.push({ name: match[1], body: functionBody(code, match[0]) ?? "" });
  }
  for (const match of code.matchAll(/\bexport\s+(?:declare\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
    let depth = 0;
    let end = code.length;
    for (let i = match.index + match[0].length; i < code.length; i += 1) {
      const ch = code[i];
      if (ch === "(" || ch === "[" || ch === "{") depth += 1;
      else if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
      else if (ch === ";" && depth <= 0) { end = i; break; }
    }
    definitions.push({ name: match[1], body: code.slice(match.index, end) });
  }
  return definitions;
}

// THE FOUR CLAUSES, as one pure detector so the real tree and the planted mutants below go through
// the IDENTICAL code path. `budgets` is `[name, value]` pairs read off the loaded home.
function region5SecondHome(rel, source, budgets) {
  const code = stripComments(source);
  const violations = [];

  // (a) A SECOND BUDGET. Importing one is the correct shape and stays silent; BINDING one here is
  //     a second home from the budget end — ADR-008: "no budget is relaxed to collect it".
  const declared = DECLARES_BUDGET.exec(code);
  if (declared) violations.push(`${rel} → declares its own region-5 budget \`${declared[1]}\` (the budgets live in ${GEOMETRY_HOME}; import one, never re-declare one)`);

  // (b) AN EXPORT THAT NAMES REGION 5 — the review's own planted `region5NameDropped`, and any
  //     rename of it that keeps the concept in the name.
  for (const name of exportedNames(source)) {
    if (REGION5_CONCEPT.test(name)) violations.push(`${rel} → exports \`${name}\`, which names region 5's geometry`);
  }

  // (c) A BUDGET INSIDE A COMPARISON — ADR-014 clause 4, and the clause that actually catches the
  //     shape this milestone shipped: `slotFits` and `abbreviateDrillIn` are LOCAL consts in two
  //     components, invisible to any rule stated over exports or file names. Importing a budget is
  //     a consumer's business; comparing against one is the ladder's, and the ladder has one home.
  code.split(/\r?\n/).forEach((line, index) => {
    if (REGION5_COMPARISON.test(line)) {
      violations.push(`${rel}:${index + 1} → decides against a region-5 budget here: \`${line.trim().slice(0, 110)}\``);
    }
  });

  // (d) A HARD-CODED COPY OF A CHARACTER BUDGET'S VALUE — the second home that avoids every name.
  //     Restricted to the `_CH` budgets on purpose: those are the ones a `.length` is measured
  //     against, so the comparison is unambiguous. ADR-014's px facts (`REGION5_CHIP_GAP_PX` 6,
  //     `REGION5_CLUSTER_GAP_PX` 12, `REGION5_DRILLIN_GLYPH_PX` 14 …) are small round numbers that
  //     an unrelated length test could hold by coincidence, and a gate that reds on a coincidence
  //     is the species this milestone keeps paying for. The VALUES are read off the home at run
  //     time, so ADR-014 moving the two `_CH` budgets DOWN re-aims this clause without an edit.
  for (const [name, value] of budgets) {
    if (!name.endsWith("_CH") || !Number.isInteger(value)) continue;
    const copied = new RegExp(`\\.length\\s*(?:>=|<=|>|<|===|!==)\\s*${value}\\b|(?<![\\w.$])${value}\\s*(?:>=|<=|>|<)\\s*[\\w.$]*\\.length`);
    if (copied.test(code)) violations.push(`${rel} → compares a length against the literal ${value}, which is the value of \`${name}\` — a budget with two derivations is a budget that can disagree with itself`);
  }
  return violations;
}

// Every name a module EXPORTS — declarations, re-exports and `export declare` alike, so a `.d.mts`
// that types a second narrowing is caught by the same clause as an `.mjs` that implements one.
function exportedNames(source) {
  const code = stripComments(source);
  const names = [];
  for (const match of code.matchAll(/\bexport\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.push(match[1]);
  for (const match of code.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const part of match[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.push(name);
    }
  }
  return names;
}

// The forms in which a module can NAME a page-query key: the `URLSearchParams` accessors and a
// raw `?key=` / `&key=` URL literal. Deliberately the same two shapes m45's route sweep uses, so
// the two detectors cannot disagree about what "names a key" means.
function queryKeyHits(source, key) {
  const code = stripComments(source);
  const hits = [];
  if (new RegExp(`\\.(?:get|set|has|delete|getAll|append)\\(\\s*["']${key}["']`).test(code)) hits.push(`a .get/.set("${key}") accessor`);
  if (new RegExp(`[?&]${key}=`).test(code)) hits.push(`a \`?${key}=\` URL literal`);
  return hits;
}

export const archTests = [
  {
    name: "arch/47 ADR-001 (acd-fleet-filter-single-home): the filter's ONE home is ui/src/fleet/scope.mjs — it is framework-free and node-loadable, and NO sibling filter module exists under ui/src/fleet/",
    run: async () => {
      // The home is loadable by plain node. That load IS the proof: this repo has no React test
      // harness, so a narrowing decision that can only be exercised through a component is a
      // narrowing decision with no tests (the rule scope.mjs's own header states at :1-6).
      let module;
      try {
        module = await import(new URL(`../../../${FILTER_HOME}`, import.meta.url).href);
      } catch (error) {
        assert.fail(
          `${FILTER_HOME} is not loadable by plain node (${error.code ?? error.message}). m47/ADR-001: the repo filter extends the framework-free helper Fleet.tsx wires up — never inline JSX-only logic, and never a module that needs a bundler to run.`,
        );
      }
      assert.equal(
        typeof module[NARROWING],
        "function",
        `${FILTER_HOME} must export \`${NARROWING}\` — m47/ADR-002 promotes it from a tested-but-uncalled export to the ONE production narrowing.`,
      );

      const code = stripComments(await readFile(path.join(repoRoot, FILTER_HOME), "utf8"));
      const specifiers = importSpecifiers(code).map((entry) => entry.specifier);
      const framework = specifiers.filter((spec) => /^react(-dom)?(\/|$)|\.tsx?$|\/jsx-runtime$/.test(spec));
      assert.deepEqual(framework, [], `${FILTER_HOME} imports a framework/component module (${framework.join(", ")}) — the one home must stay headless.`);
      for (const global of ["window", "document", "location", "navigator", "history"]) {
        assert.ok(
          !new RegExp(`(^|[^.\\w])${global}\\s*\\.`).test(code),
          `${FILTER_HOME} reaches for the \`${global}\` global. Its own header states the rule: "PURE — the caller wires this into history.pushState/replaceState; this module touches no window/location itself (headless-testable)". Fleet.tsx's safeSearch() (:256) is the ONE DOM touch and it stays there.`,
        );
      }

      // NO SECOND LOGIC HOME, in the three clauses [Feasibility-2] settled — RECURSIVELY, because
      // the shape ADR-001 forbids by name is a DIRECTORY and a flat readdir cannot see one.
      const tree = await fleetTree();
      assert.ok(tree.files.length > 5, `ui/src/fleet/ was actually walked (non-vacuous): ${tree.files.length} files, ${tree.dirs.length} directories`);

      const secondHomes = [];
      // (a) a DIRECTORY named for the concept declares a home by its name, whatever it contains.
      for (const rel of tree.dirs) {
        if (CONCEPT_NAME.test(path.basename(rel))) secondHomes.push(`${rel}/ → a directory named for the filter concept (ADR-001 forbids \`fleet/filter/\` in terms)`);
      }
      for (const rel of tree.files) {
        if (rel === FILTER_HOME || rel === FILTER_HOME_SIDECAR) continue;
        const base = path.basename(rel);
        // (b) a LOGIC module named for the concept is a second logic home by this repo's pattern.
        const isComponent = base.endsWith(".tsx") || base.endsWith(".jsx");
        const isDeclaration = DECLARATION_FILE.test(base);
        if (!isComponent && !isDeclaration && CONCEPT_NAME.test(base)) {
          secondHomes.push(`${rel} → a LOGIC module named for the filter concept (a plain module is where logic lives here; a .tsx of the same name would be fine)`);
          continue;
        }
        // (c) …and whatever it is called, ANY file exporting narrowing vocabulary is a home.
        const offending = exportedNames(await readFile(path.join(repoRoot, rel), "utf8")).filter((name) => NARROWING_EXPORT.test(name));
        if (offending.length > 0) secondHomes.push(`${rel} → exports narrowing vocabulary: ${offending.join(", ")}`);
      }

      assert.deepEqual(
        secondHomes,
        [],
        `these paths under ui/src/fleet/ are a SECOND home for the narrowing:\n  ${secondHomes.join("\n  ")}\n`
          + `m47/ADR-001: the repo filter EXTENDS ${FILTER_HOME}. scope.mjs already owns the URL round-trip, the client filter, the empty predicate and the empty copy — a second module would own HALF of one concept, and the two halves would each answer "what is this view narrowed to" differently. Same ruling m45/ADR-006 made for \`scope\`.\n`
          + "WHAT THIS DOES *NOT* FORBID, because the first cut of this gate did and it was wrong: a PRESENTATIONAL child. `RepoPicker.tsx`, `FilterBanner.tsx` and `NarrowingChip.tsx` all pass — they are components, not logic homes, and `acd-ui-surface-file-budget` actively instructs the author to extract exactly those (\"Extract the next region into a sibling component with a prop boundary\"). What makes something a home is what it EXPORTS, not what it is called.",
      );

      // NON-VACUITY, and it is the important half after [Feasibility-2] widened what passes: the
      // gate must still FIRE on each of the three clauses, and must NOT fire on the presentational
      // child the budget gate demands, nor on the fleet's existing modules.
      assert.ok(CONCEPT_NAME.test("filter") && CONCEPT_NAME.test("narrowing"), "self-check (a): a directory named `filter/` or `narrowing/` is detected");
      assert.ok(CONCEPT_NAME.test("repo-filter.mjs") && !"repo-filter.mjs".endsWith(".tsx"), "self-check (b): `repo-filter.mjs` is a LOGIC module named for the concept — refused");
      assert.deepEqual(
        exportedNames("export function narrowStatus(s, id) { return s; }\nexport const repoFromUrl = (u) => u;\nexport { withRepoParam as withRepo };\n").filter((n) => NARROWING_EXPORT.test(n)),
        ["narrowStatus", "repoFromUrl", "withRepo"],
        "self-check (c): a declaration, an arrow const and a renamed re-export of narrowing vocabulary are ALL detected — a second home cannot hide behind `export { x as y }`",
      );
      assert.deepEqual(
        exportedNames("export function RepoPicker({ options, value, onChange }) { return null; }\n").filter((n) => NARROWING_EXPORT.test(n)),
        [],
        "self-check: a presentational `RepoPicker` component exports no narrowing vocabulary — it is NOT a second home, and this is the case the first cut of this gate wrongly refused",
      );
      // [architect F4] …and the two names 47/02 added are IN the vocabulary. A chip that
      // exported its own emptiness predicate or its own id→name resolution would be a second
      // home for the question "what is this view narrowed to", whatever the file is called.
      assert.deepEqual(
        exportedNames("export function isEmptyView(s, r) { return false; }\nexport const resolvedRepoName = (s, r) => null;\n").filter((n) => NARROWING_EXPORT.test(n)),
        ["isEmptyView", "resolvedRepoName"],
        "self-check (F4): the filter-aware emptiness predicate (ADR-009) and the three-valued resolution (ADR-010 clause 5) are narrowing vocabulary — the gate must see a second home that exports either",
      );
      for (const existing of ["assignments.mjs", "api.ts", "runs.mjs", "terminal-mount.mjs"]) {
        assert.ok(!CONCEPT_NAME.test(existing), `self-check: the name clause stays silent on the fleet's existing module ${existing}`);
      }
    },
  },

  {
    name: "arch/47 ADR-003 (acd-fleet-filter-single-home): NO module in ui/src outside the one home names the `repo` query key — not the route module, not the shell nav; the filter stays local to the fleet",
    run: async () => {
      const files = await uiSourceFiles();
      assert.ok(files.length > 50, `the ui/src tree was actually walked (non-vacuous): ${files.length} source files`);
      for (const required of [FLEET_TSX, "ui/src/app/routes.mjs", "ui/src/app/shell-nav.mjs"]) {
        assert.ok(files.includes(required), `the walker reaches ${required} — the modules most likely to grow a special case`);
      }

      const violations = [];
      for (const rel of files) {
        if (REPO_KEY_ALLOWED.has(rel)) continue;
        const hits = queryKeyHits(await readFile(path.join(repoRoot, rel), "utf8"), "repo");
        if (hits.length > 0) violations.push(`${rel} → ${hits.join(", ")}`);
      }
      assert.deepEqual(
        violations,
        [],
        `these ui/src modules name the \`repo\` query key outside the ONE home (${FILTER_HOME}):\n  ${violations.join("\n  ")}\n`
          + "m47/ADR-003: the router and the shell carry the filter through WITHOUT KNOWING ITS NAME — m45/ADR-006's copy-and-delete builder preserves it by default, and shell-nav.mjs:161-169's positional href rule carries the CURRENT route's search byte-identically and gives every other item its bare path. Both of those are properties of not knowing the name, and one special case is how they die. Read the key in scope.mjs and hand the value in.",
      );

      // NON-VACUITY, and it is the important half: the detector must be shown to find a REAL page
      // query key in this REAL tree, not merely to return nothing. Run the identical detector for
      // `scope` — which does exist, in exactly the one home this ADR names — and require a hit.
      const scopeHits = queryKeyHits(await readFile(path.join(repoRoot, FILTER_HOME), "utf8"), "scope");
      assert.ok(
        scopeHits.length > 0,
        `self-check: the detector finds the EXISTING \`scope\` query key in ${FILTER_HOME} (${scopeHits.join(", ")}) — so an empty \`repo\` result means absence, not a broken detector`,
      );
      // …and it fires on both planted forms, including one inside an http:// URL (the case a naive
      // comment stripper destroys), while staying silent on a line comment and on an ordinary word.
      assert.ok(queryKeyHits('const r = new URLSearchParams(search).get("repo");', "repo").length > 0, "self-check: the detector catches a .get(\"repo\") accessor");
      assert.ok(queryKeyHits('href="http://127.0.0.1:4181/fleet?repo=aof"', "repo").length > 0, "self-check: the detector catches a `?repo=` literal inside an http:// URL");
      assert.deepEqual(queryKeyHits('// the operator picks a repo=<workspaceId> in the bar', "repo"), [], "self-check: a line COMMENT naming the key is history, not code");
      assert.deepEqual(queryKeyHits('const repo = workspace.name; // an ordinary identifier', "repo"), [], "self-check: an ordinary `repo` identifier is not a query key");
      // …and the STRIPPER itself does not blind the sweep. TECH_DEBT item 24: a line comment
      // containing `/*` deletes the rest of a file under block-first stripping, after which a
      // negative sweep passes by seeing nothing. Measured live in this milestone's refine on
      // src/mesh/ui-serve.mjs:297-299 (`//api/*`), which cost 9,192 characters of that file.
      assert.ok(
        queryKeyHits('const a = 1; // note: //api/* dodges the guard\nconst r = params.get("repo");\n', "repo").length > 0,
        "self-check: the stripper survives TECH_DEBT item 24's shape — a line comment containing `/*` must not delete the code after it, or every sweep in this file passes vacuously",
      );
    },
  },

  {
    name: "arch/47 ADR-001+004 (acd-fleet-filter-single-home): the one home exports the URL round-trip, and the narrowing has EXACTLY ONE call site in ui/src — in Fleet.tsx [EXPECTED RED until m47's stories land]",
    run: async () => {
      const home = await import(new URL(`../../../${FILTER_HOME}`, import.meta.url).href);
      for (const name of URL_HELPERS) {
        assert.equal(
          typeof home[name],
          "function",
          `${FILTER_HOME} must export \`${name}\` — m47/ADR-003 pins the URL contract's read and write to the ONE home, in the same pure/headless shape as \`scopeFromSearch\`/\`withScopeParam\` beside them. THE SPELLING IS BINDING: m45's [Amigos-1] records a build that satisfied its story brief and failed CI because the brief and the ADR named the exports differently. ADR-001 and this test agree once: repoFromSearch, withRepoParam.`,
        );
      }

      // The sidecar moves with the module — one module, one `.d.mts`.
      const sidecar = await readFile(path.join(repoRoot, FILTER_HOME_SIDECAR), "utf8");
      for (const name of [NARROWING, ...URL_HELPERS]) {
        assert.match(
          sidecar,
          new RegExp(`\\b${name}\\b`),
          `${FILTER_HOME_SIDECAR} must declare \`${name}\` — the type sidecar grows WITH the one home. A second .d.mts is a second home wearing a type hat, and Fleet.tsx would fail at tsc naming the wrong file.`,
        );
      }

      // ONE call site (m47/ADR-004's seam). Counting CALLS, not imports: an import that is never
      // applied is exactly today's state, and it is the thing this assertion exists to end.
      //
      // [Feasibility-1] A `.d.*` FILE IS EXCLUDED, and this is the correction of a defect that
      // would have FAILED A CORRECT IMPLEMENTATION. `path.extname("scope.d.mts")` is `.mts`, so the
      // sidecar is in the walk, and its line 44 reads `export declare function filterToWorkspace(`
      // — which the naive `\bfilterToWorkspace\s*\(` counts as a call site. Measured: the sweep
      // returned `["ui/src/fleet/scope.d.mts (1)"]` TODAY, and would have returned
      // `["ui/src/fleet/Fleet.tsx (1)", "ui/src/fleet/scope.d.mts (1)"]` after 47/02 and 47/03 land
      // correctly — failing the deepEqual against a one-element array, while the assertion twenty
      // lines above REQUIRES that same sidecar to declare that same name. The gate contradicted its
      // own ADR, and was masked only because it fails earlier on `repoFromSearch` today.
      // A declaration is not a call: a `.d.*` file states a TYPE and emits no code at all.
      const files = await uiSourceFiles();
      const scanned = [];
      const callSites = [];
      for (const rel of files) {
        if (rel === FILTER_HOME) continue; // the definition, not a call
        if (DECLARATION_FILE.test(rel)) continue; // [Feasibility-1] a declaration, not a call
        scanned.push(rel);
        const code = stripComments(await readFile(path.join(repoRoot, rel), "utf8"));
        const calls = (code.match(new RegExp(`\\b${NARROWING}\\s*\\(`, "g")) ?? []).length;
        if (calls > 0) callSites.push(`${rel} (${calls})`);
      }

      // The exclusion MUST NOT silently widen: it covers `.d.mts`/`.d.ts` and nothing else, and the
      // sweep must still reach real code — including the one file the seam belongs in. An exclusion
      // that grew to swallow `.tsx` would make this assertion pass by scanning nothing.
      const excluded = files.filter((rel) => rel !== FILTER_HOME && !scanned.includes(rel));
      assert.ok(
        excluded.length > 0 && excluded.every((rel) => DECLARATION_FILE.test(rel)),
        `the call-site exclusion has widened beyond type declarations — excluded: ${excluded.join(", ")}. It covers .d.mts/.d.ts ONLY (a declaration states a type and emits no code); anything else excluded here is a file that could hold a second call site unseen.`,
      );
      assert.ok(
        excluded.includes(FILTER_HOME_SIDECAR),
        `self-check: the sweep really does exclude ${FILTER_HOME_SIDECAR} — the exact false positive [Feasibility-1] fixes (its \`export declare function ${NARROWING}(\` at :44 is a DECLARATION, and the assertion above REQUIRES it to be there)`,
      );
      assert.ok(scanned.includes(FLEET_TSX), `self-check: the sweep still reaches ${FLEET_TSX} — the file the one call site belongs in (non-vacuous)`);
      assert.ok(scanned.length > 50, `self-check: the sweep still covers the ui/src tree (non-vacuous): ${scanned.length} files scanned, ${excluded.length} declarations excluded`);

      assert.deepEqual(
        callSites,
        [`${FLEET_TSX} (1)`],
        `\`${NARROWING}\` must be called EXACTLY ONCE in ui/src, from ${FLEET_TSX} — found: ${callSites.length === 0 ? "NO call site at all" : callSites.join(", ")}.\n`
          + "m47/ADR-004: the narrowing is applied ONCE, above the region fan-out, so `GlobalScopeView` and every region receive an ALREADY-NARROWED payload and a region cannot opt out by construction — which is what makes SPEC's \"every region, or none\" structural instead of a per-region habit that the NEXT milestone's author has no reason to know about.\n"
          + "AT REFINE TIME THIS IS RED FOR A MEASURED REASON, not a missing file: scope.mjs:162 exports the narrowing, scope.d.mts:44 types it and test/ui/fleet-scope.test.mjs pins it, and Fleet.tsx's import list (:28-40) does not name it. The function exists, is tested, and has never rendered anything.",
      );
    },
  },

  {
    name: "arch/47 ADR-008 + ADR-014 clause 4 (acd-fleet-filter-single-home): region 5's GEOMETRY has ONE home — assign-affordance.mjs holds the budgets AND every decision taken against them; no other file under ui/src/fleet/ declares a budget, names region 5 in an export, compares against a budget, or re-derives one from a copy of its value [any violation is reported at the LIVE address it is found at, never a stored one]",
    run: async () => {
      // THE BUDGETS ARE DISCOVERED, NOT LISTED. Reading them off the loaded module is what makes
      // this assertion a statement about the CONCEPT: ADR-014 may add region-5 predicates here,
      // rename them, or re-tune the numbers, and none of that needs an edit in this file.
      const home = await import(new URL(`../../../${GEOMETRY_HOME}`, import.meta.url).href);
      const budgets = Object.entries(home).filter(([name]) => REGION5_BUDGET.test(name));
      assert.ok(
        budgets.length >= 3,
        `${GEOMETRY_HOME} must own region 5's budgets (found ${budgets.length}: ${budgets.map(([n]) => n).join(", ")}). m47/ADR-008 names three — the name budget, the chip slot and the drill-in abbreviation point. If they moved, they moved to a SECOND home and this whole assertion has stopped reaching its subject.`,
      );

      // THE POSITIVE HALF: at least one exported DECISION sits beside them and reads one. A
      // deny-list alone would pass a tree where every predicate had been inlined back into the
      // components — which is the state ADR-008 was written to end (Fleet.tsx:569's inline
      // `nameDropped`), and it is not detectable by absence.
      const homeSource = await readFile(path.join(repoRoot, GEOMETRY_HOME), "utf8");
      const decisions = exportedDefinitions(homeSource).filter(({ body }) => budgets.some(([budget]) => new RegExp(`\\b${budget}\\b`).test(body)));
      assert.ok(
        decisions.length >= 1,
        `${GEOMETRY_HOME} must export at least one DECISION that reads a region-5 budget — m47/ADR-008: "the predicate gets ONE home, as a pure function beside the budget it reads", so that fleet-assign-row-geometry.test.mjs drives the decision directly instead of inferring it from a rendered class name. Found only budgets, no decision: the predicate has gone back inline.`,
      );

      // THE SWEEP — RECURSIVE, because a `ui/src/fleet/region5/` DIRECTORY is a home declared by
      // its name whatever it contains, and a flat readdir cannot see one. That defect is not
      // hypothetical: it is the one [Feasibility-2] fixed in the narrowing clauses above.
      const tree = await fleetTree();
      assert.ok(tree.files.length > 5, `ui/src/fleet/ was actually walked (non-vacuous): ${tree.files.length} files, ${tree.dirs.length} directories`);
      assert.ok(tree.files.includes(GEOMETRY_HOME), `the walk reaches the geometry home itself (non-vacuous): ${GEOMETRY_HOME}`);

      const violations = [];
      for (const rel of tree.dirs) {
        if (REGION5_CONCEPT.test(path.basename(rel))) violations.push(`${rel}/ → a directory named for region 5's geometry declares a home by its name, whatever it contains`);
      }
      for (const rel of tree.files) {
        if (rel === GEOMETRY_HOME || rel === GEOMETRY_HOME_SIDECAR) continue;
        violations.push(...region5SecondHome(rel, await readFile(path.join(repoRoot, rel), "utf8"), budgets));
      }

      assert.deepEqual(
        violations,
        [],
        `these paths under ui/src/fleet/ are a SECOND home for region 5's geometry:\n  ${violations.join("\n  ")}\n`
          + `m47/ADR-008: the drop decision lives "as a pure function BESIDE THE BUDGET IT READS" — ${GEOMETRY_HOME} — because one boolean feeds both the render and DG-22's alignment consequence and the two must not be able to disagree. DG-20's own defect (absence-of-name becoming a second signal for "this card has an assignment") is what a second derivation re-opens, from whichever end it is added.\n`
          + "WHAT THIS DOES *NOT* FORBID: a presentational child that RENDERS the decision it is handed, or IMPORTS a budget to lay itself out (ADR-001 [Feasibility-2]'s carve-out — `acd-ui-surface-file-budget` actively instructs the author to extract such a child). ADR-014 clause 4 draws the line at the COMPARISON: `AssignmentChip` and `BoardDrillIn` become consumers that receive the decision as props, exactly as `BoardDrillIn` already receives `abbreviated`.\n"
          + "THE ADDRESSES ARE THE ONES LISTED ABOVE, READ OFF THE TREE ON THIS RUN — this message deliberately states no count and names no file, and that is a correction rather than a style: an earlier version of it read \"RED at TWO KNOWN ADDRESSES\" and named `Fleet.tsx`'s `abbreviateDrillIn` and `AssignmentChip.tsx`'s `slotFits`, and both were deleted by ADR-014 clause 4's derivation within hours — the first while the review citing it was being written. A gate that stores what it once found reports history; this one reports the tree. The remedy is always the same: the decision moves into the ONE derivation in assign-affordance.mjs and the component takes it as a prop.",
      );
    },
  },

  {
    name: "arch/47 ADR-008 + ADR-014 clause 4 (acd-fleet-filter-single-home): self-check — the region-5 one-home detector fires on the review's planted second home, on a renamed one, on a comparison in a component, on a copied budget VALUE and on a second budget constant; and stays silent on a consumer that only imports one (non-vacuous)",
    run: async () => {
      // A SEPARATE LANE, DELIBERATELY. The assertion above is RED until ADR-014's derivation lands,
      // and anything placed after its `deepEqual` would not execute until then — this milestone
      // measured that exact trap (a self-check unreachable except through the assertion it proved,
      // filed at refine and repeated in STATE). Evidence must not depend on the thing it proves.
      const home = await import(new URL(`../../../${GEOMETRY_HOME}`, import.meta.url).href);
      const budgets = Object.entries(home).filter(([name]) => REGION5_BUDGET.test(name));
      assert.ok(budgets.length >= 3, `the plants below are aimed with the REAL budgets (found ${budgets.length})`);
      const plant = (rel, source) => region5SecondHome(rel, source, budgets);

      // (1) THE REVIEW'S OWN PLANT, verbatim in shape: a second module exporting the drop
      //     predicate under its real name, with the original left in place. This passed 51/51.
      const reviewPlant = plant(
        "ui/src/fleet/region5-name-drop.mjs",
        'export function region5NameDropped({ assignment, workspaceName, repoFiltered } = {}) {\n  if (repoFiltered) return true;\n  return !!assignment && String(workspaceName ?? "").length > 8;\n}\n',
      );
      assert.ok(reviewPlant.some((v) => /exports `region5NameDropped`/.test(v)), `self-check (b): the planted second home the 47/04 review used is detected — ${JSON.stringify(reviewPlant)}`);

      // (2) THE SAME SECOND HOME, RENAMED so no clause about names can see it. It is caught by
      //     what it DOES: it takes a DECISION against a budget that belongs to the one home.
      const renamedPlant = plant(
        "ui/src/fleet/name-drop.mjs",
        'import { REGION5_NAME_BUDGET_CH } from "./assign-affordance.mjs";\nexport function nameDropped(name, filtered) {\n  return filtered || String(name).length > REGION5_NAME_BUDGET_CH;\n}\n',
      );
      assert.ok(renamedPlant.some((v) => /decides against a region-5 budget/.test(v)), `self-check (c): a differently-NAMED second home is caught by what it DOES — ${JSON.stringify(renamedPlant)}`);

      // (2b) THE TWO REAL INSTANCES, verbatim in shape, planted so this evidence SURVIVES the fix.
      //      Today they are in the tree and the lane above is red on them; the day ADR-014's
      //      derivation lands they vanish from the tree and this lane must still prove it can see
      //      them. A local const inside a component is the exact form both take — no export, no
      //      file name, nothing an export-shaped or name-shaped rule could ever have caught.
      const slotFitsPlant = plant(
        "ui/src/fleet/AssignmentChip.tsx",
        'import { REGION5_CHIP_SLOT_BUDGET_CH } from "./assign-affordance.mjs";\nexport function AssignmentChip({ assignment }) {\n  const slotFits = `→ ${assignment.targetNodeId}`.length <= REGION5_CHIP_SLOT_BUDGET_CH;\n  return slotFits ? null : null;\n}\n',
      );
      assert.ok(slotFitsPlant.some((v) => /decides against a region-5 budget/.test(v)), `self-check (ADR-014 clause 4): \`slotFits\` — a LOCAL const in a component — is caught: ${JSON.stringify(slotFitsPlant)}`);
      const abbreviatePlant = plant(
        "ui/src/fleet/Fleet.tsx",
        "  const abbreviateDrillIn = !!assignment\n    && `→ ${assignment.targetNodeId}`.length > REGION5_DRILLIN_ABBREV_AT_CH;\n",
      );
      assert.ok(abbreviatePlant.some((v) => /decides against a region-5 budget/.test(v)), `self-check (ADR-014 clause 4): \`abbreviateDrillIn\` is caught: ${JSON.stringify(abbreviatePlant)}`);

      // (3) THE COPY THAT AVOIDS EVERY NAME — the budget's VALUE, hard-coded. The value is read
      //     off the home, so this clause re-aims itself when a budget is re-tuned.
      //
      //     THE FIXTURE IS SELECTED BY A STATED PREDICATE, not positionally, and that is a defect
      //     this probe already had: it used to take `budgets.find(([, v]) => Number.isInteger(v))`
      //     — "the first one that looks right". A module namespace enumerates ALPHABETICALLY, so
      //     the day ADR-014 added nine px facts to the home, "first integer" moved from
      //     `REGION5_CHIP_SLOT_BUDGET_CH` to `REGION5_CHIP_GAP_PX` (6) — a GAP, not a character
      //     budget — which clause (d) deliberately does not measure a `.length` against. The gate
      //     was right and its own evidence went red: an instrument wrong about the tree rather
      //     than about the rule, this milestone's eighth, and the first caused by a record
      //     decision rather than by a build. A fixture derived from production exports is robust
      //     to RENAMES and fragile to ADDITIONS unless it says what it is asking for.
      const characterBudget = budgets.find(([name, value]) => /_CH$/.test(name) && Number.isInteger(value));
      assert.ok(
        characterBudget,
        `the home must export at least one integer \`*_CH\` character budget for clause (d)'s fixture — found ${JSON.stringify(budgets.map(([n, v]) => [n, v]))}. NOT FOUND is what this says: if the character budgets have become derived non-integers, clause (d) needs re-deriving with them, not silently skipping.`,
      );
      const valuePlant = plant("ui/src/fleet/fit.mjs", `export const fitsRow = (label) => label.length > ${characterBudget[1]};\n`);
      assert.ok(valuePlant.some((v) => /compares a length against the literal/.test(v)), `self-check (d): a hard-coded copy of \`${characterBudget[0]}\`'s VALUE (${characterBudget[1]}) is caught — ${JSON.stringify(valuePlant)}`);

      // (4) THE SECOND BUDGET — the same second home entered from the budget end.
      const budgetPlant = plant("ui/src/fleet/geometry.mjs", "export const REGION5_NAME_BUDGET_CH = 12;\n");
      assert.ok(budgetPlant.some((v) => /declares its own region-5 budget/.test(v)), `self-check (a): a second budget constant is caught — ${JSON.stringify(budgetPlant)}`);

      // (5) THE CASES THAT MUST STAY SILENT, and this is the half the first cut of the narrowing
      //     clauses above got wrong. ADR-001 [Feasibility-2] and ADR-014 clause 4 draw the same
      //     line from two directions: a presentational child that renders a decision it is HANDED
      //     is the shape `acd-ui-surface-file-budget` instructs an author to extract, and a
      //     consumer that IMPORTS a budget to lay itself out — without deciding against it — is
      //     what ADR-014 turns both components into. Refusing either would fail a correct build.
      assert.deepEqual(
        plant("ui/src/fleet/NameCell.tsx", "export function NameCell({ dropped, name }) {\n  return dropped ? null : name;\n}\n"),
        [],
        "self-check: a presentational child that renders the decision it is handed is NOT a second home",
      );
      assert.deepEqual(
        plant(
          "ui/src/fleet/AssignmentChip.tsx",
          'import { REGION5_CHIP_SLOT_BUDGET_CH } from "./assign-affordance.mjs";\nexport function AssignmentChip({ assignment, tailFits }) {\n  const width = `min-w-[${REGION5_CHIP_SLOT_BUDGET_CH}ch]`;\n  return tailFits ? width : null;\n}\n',
        ),
        [],
        "self-check: a consumer that IMPORTS a budget to size itself, and takes the DECISION as a prop, is exactly what ADR-014 clause 4 turns AssignmentChip into — the line is the comparison, not the import",
      );
    },
  },
];
