// FF-11902 — "A control stores a DECISION and derives a FACT." 119/ADR-003, and 119/00 task
// `01_a-control-derives-its-fact.feature`; widened by chore 120 to the species its register row
// claims, in two rounds — and TECH_DEBT item 81 discharged by the second.
//
// WHY, MEASURED. A control that asserts against a STORED fact about the tree sends its next bill to
// a stranger: it has forced FOUR consecutive stories of one milestone outside their declared write
// sets, each by a different control, and each story could only discover which control by running it.
// This milestone moves several hundred files, so the ruling is load-bearing for the four stories
// behind this one rather than decoration.
//
// THE SPECIES SPLITS THREE WAYS WHEN THE TREE MOVES, AND ONLY TWO OF THE THREE ARE DEFECTS.
//   · LOUD — the control opens a path that no longer exists and fails in the same seconds with the
//     file named. THAT IS NOT A DEFECT: a control must name its subject, and naming it is what makes
//     it a control. `test/arch/audit/acd-controls-never-execute.test.mjs:664` is the model — its
//     `startsWith("work-doctor")` filter is backed by `assert.ok(edges >= 1, …)`, so a move REDS it.
//   · SILENT — the assertion goes vacuous. `test/arch/mesh/acd-mesh-ui-single-data-command.test.mjs` set
//     `files = []` inside a `catch` and then asserted `joiners.length <= 1`, so once
//     `src/commands/mesh-*.mjs` moves the claim is asserted over the empty set forever, with no
//     message anywhere. This story de-silences it; the sweep below is what stops the next one.
//   · UNFIXABLE — loud, but its subject is an immutable delivered document. FF-11903 is that class.
//
// WHAT A WALKED SET IS. Everything below is stated over names DERIVED from the tree, and the
// derivation is structural: a name is derived when it is bound from a WALK of the repository (a
// `readdir`, or a locally declared helper that reaches one, rooted at this repository's own
// directory by the statement, by the helper's declaration, or by the call sites of the helper it
// sits in), or from a READ handed a root-derived path as its first positional argument
// (`readFile(path.join(root, …))`, `loadLoops(path.join(root, "src", "bundle"))`), and then through
// PURE SET-NARROWING and nothing else — `filter`, `map`, `sort`, `flat`, `slice`, a spread, `new Set`.
// A CALL is not a narrowing: `check([...files, planted])` may add a plant, and the ~50 red probes
// that assert "exactly one offender" over the real tree plus a plant are exact for good reason. A
// name resolves to its nearest preceding binding, so a helper's `grown` and a later test's `grown`
// are two names. A walk of a temp fixture the test itself built is not a walk of the tree — the
// fixture IS the oracle (which is why the ~1,690 exact `assert.equal(x.length, N)` sites in this
// tree are overwhelmingly correct) — and a test body that calls `mkdtemp` is such a fixture even
// when it names its directory `root`. A dynamic `import(new URL(…, import.meta.url))` is a module,
// not a root.
//
// WHAT THIS CONTROL REFUSES, over that set:
//   1. THE WALK NARROWED BY A FILENAME PREDICATE with no non-vacuity leg over the result — a prefix,
//      a suffix, a substring, a regex test, a `basename`/`extname` read, an equality against a
//      literal name — whether the `.filter` is chained on the walk or on a name bound from it. For
//      an ABSENCE claim (`deepEqual(leaked, [])`) the floor belongs on the read that produced the
//      set, never on the filtered set, which is meant to be empty. Measured 2026-09-10 at HEAD
//      with these detectors: 61 such walks, 22 with no floor (the first round's narrower line —
//      the walker call in the filtering statement — saw 27 and 15).
//   2. THE WALK'S FAILURE SWALLOWED into an empty list by a `catch`.
//   3. THE RETYPED EQUALITY — an exact `assert.equal`/`strictEqual` of a derived set's `.length` or
//      `.size` against a literal, in either operand order. Measured at HEAD: 6 (3 under the first
//      round's line).
//   4. THE RETYPED CENSUS — `assert.deepEqual(derived, ["a", "b"])` against a string-array literal:
//      the register row's own "member census, list of suites importing a module, import
//      allowlist". Measured at HEAD: 9, of which five were TECH_DEBT item 81's frozen-set
//      censuses (converted by hand, since `bundledFrozenSet()` reads its own module-relative path
//      and no text detector can see a zero-argument reader) and the rest "exactly one, and it is
//      X" claims. A single-home DECISION is spelled as the floor that keeps the sweep non-vacuous,
//      a declared ceiling carrying its reason, and the home named AMONG what the sweep found — the
//      form the register row admits, and the form `SINGLE_HOME_DERIVED` plants. A policy allowlist
//      is spelled the same way: its members asserted among the set, every member asserted in the
//      allowlist, never the set enumerated as the answer.
//
// WHAT IS STILL OUTSIDE THE LINE, named so the next widening starts from a measure rather than a
// claim: an absence claim over a HELPER's whole return — `deepEqual(await srcFilesContaining(root,
// X), [])` — whose floor would have to sit on the helper's own walk inside `test/support/`; a
// zero-argument imported reader; and a NUMBER ABOUT a file's content (119/F-34), which is a
// different species from a set drawn from the tree.
//
// THE CUTS ARE STRUCTURAL, NEVER POSITIONAL (47/F-47-04-ARCH-2). An earlier draft of this file cut
// its regions with `+ 800` / `+ 500` character windows and `[\s\S]{0,600}` bounds; the ratchet in
// `test/arch/testing/acd-test-suite-registration.test.mjs` reds on exactly that, and it was right to —
// measured, a silent carrier whose `try` body ran past the window was reported CLEAN by the earlier
// draft. Every region below is cut by `test/support/source-slice.mjs`'s matched-brace/paren helpers
// or by the language's own statement delimiters, and the statement cut is PAREN-AWARE: the braces
// of `readdir(dir, { withFileTypes: true })` are inside an argument list, not a statement boundary.
// String literals are blanked (same length, same offsets) before any cut, so a `{` inside a
// template is never a boundary either; the text quoted back to the reader is the unblanked line.
//
// A DERIVATION THAT ASSERTS LESS IS A WEAKENING, NOT A FIX. Each equality is replaced by the
// property it was standing in for, asserted over EVERY member, with a floor kept for non-vacuity —
// the floor is a bound nobody can compute and stays stored, the equality goes. Where the number
// was a DECISION wearing an equality — "exactly ONE bar site", "no new parity control" — it is
// spelled as the floor plus a declared ceiling with its reason.
//
// WHAT WOULD QUIETLY UNDO THIS: a derivation that keeps the count and drops the property, which
// reads as a smaller diff; a "known carriers" baseline list, which is the stored fact one level up
// (there is none here — the carrier set is DERIVED, and the two named files are asserted to be AMONG
// what the walk found rather than enumerated as the answer); a sweep whose own walk can empty;
// softening `SINK_CEILING` to make a later story cheaper, whose whole value is that raising it costs
// an ADR sentence; and a walked set laundered through a CALL that adds nothing — `identity(files)` —
// which is the one shape the plant-probe rule cannot tell from a probe, and which a reviewer reads
// as the evasion it is.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  blankStringLiterals,
  blockOrStatementAfter,
  enclosingParenGroup,
  functionBody,
  matchedBraceBody,
  matchedParenSpan,
  stripComments,
} from "../../support/source-slice.mjs";
import {
  DERIVED_EQUALITY,
  DERIVED_FLOOR_PREFIX_FILTER,
  DYNAMIC_IMPORT_IS_NOT_A_ROOT,
  EXPRESSION_ARROW_NOT_A_WALKER,
  FIXTURE_BODY_WALK,
  FIXTURE_WALK,
  GUARDED_BOUND_FIRST_FILTER,
  GUARDED_PREFIX_FILTER,
  GUARDED_ROOTED_READ_ABSENCE,
  GUARDED_SUFFIX_FILTER,
  NAKED_BOUND_FIRST_FILTER,
  NAKED_PREFIX_FILTER,
  NAKED_REGEX_FILTER,
  NAKED_ROOTED_HELPER_FILTER,
  NAKED_ROOTED_READ_ABSENCE,
  NAKED_SUFFIX_FILTER,
  PLANT_PROBE_EQUALITY,
  RETYPED_CENSUS,
  RETYPED_EQUALITY,
  RETYPED_REVERSED_EQUALITY,
  RETYPED_SIZE_EQUALITY,
  SINGLE_HOME_DERIVED,
  SWALLOWING_CATCH,
  SWALLOWING_CATCH_DEEP,
  WALKER_BEHIND_A_HELPER,
} from "../../support/census-carrier-plants.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DOOR = "test/session/agent-session-driver-door.test.mjs";
const MESH_UI = "test/arch/mesh/acd-mesh-ui-single-data-command.test.mjs";
const SINK_GUARD = "test/arch/session/acd-session-driver-single-home.test.mjs";
// The sink ceiling as it stood when THIS control was written (119/00). It is the bound the
// shrink-only leg below compares against — never the value that must still be there, because
// 119/ADR-007 §4 schedules a story whose whole job is to lower it.
const SINK_CEILING_WHEN_DECLARED = 2482;

async function walkMjs(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkMjs(full, out);
    else if (entry.name.endsWith(".mjs")) out.push(path.relative(root, full).split(path.sep).join("/"));
  }
  return out;
}

// EVERY control under `test/`, recursively — so the interior 119/03 gives the test tree does not
// narrow this sweep to whatever stays flat. No file is excluded: this control's own red-probe
// specimens live in `test/support/census-carrier-plants.mjs`, which is a fixture and not a control,
// precisely so that this file is swept like every other — including by its own predicate detector,
// which sees the `.filter(endsWith(".test.mjs"))` below and finds its floor at the call sites.
const controlFiles = async () => (await walkMjs(path.join(root, "test"))).filter((rel) => rel.endsWith(".test.mjs")).sort();

const lineAt = (clean, index) => clean.slice(0, index).split("\n").length;
const callOf = (name, flags = "u") => new RegExp(`\\b${name}\\s*\\(`, flags);

// ── the classifier ───────────────────────────────────────────────────────────────────────────────
//
// A DECISION is a bound or a policy a reader cannot compute from the tree — pinning it is the point.
// A FACT is derivable from the tree, and a control that retypes one asserts the past. The third
// answer matters as much as the first two: an exact size asserted over a fixture the test itself
// built is NOT a carrier, because the fixture is the oracle.
export function classifyStoredLiteral({ kind, derivedFromTree, fixtureIsOracle = false }) {
  if (fixtureIsOracle) return "not-a-carrier";
  if (!derivedFromTree) return "decision";
  return kind === "bound" || kind === "policy-allowlist" ? "decision" : "fact";
}

// ── the shared reading ───────────────────────────────────────────────────────────────────────────

// The identifiers bound, directly or transitively, to this repository's own root. A walk rooted at
// one of them is a claim ABOUT THE TREE; a walk rooted at a `mkdtemp` directory is a claim about a
// fixture, and the two must never be swept as one class. A binding that resolves `import.meta.url`
// into a MODULE — `await import(new URL(…, import.meta.url))` — is not a root: the module's exports
// are not the tree (measured, chore 120).
export function repoRootBindings(clean) {
  const names = new Set();
  for (const match of clean.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]*import\.meta\.url[^;]*);/gu)) {
    if (/\bimport\s*\(|new\s+URL\s*\(/u.test(match[2])) continue;
    names.add(match[1]);
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const match of clean.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*path\.(?:join|resolve)\(([^;]*)\);/gu)) {
      if (names.has(match[1])) continue;
      if ([...names].some((name) => new RegExp(`\\b${name}\\b`, "u").test(match[2]))) {
        names.add(match[1]);
        grew = true;
      }
    }
  }
  return names;
}

// The names a call to `producer` is assigned into, anywhere in the control — which is where a floor
// over the walk's result has to be asserted when the walk itself sits inside a helper.
export function bindingsFrom(clean, producer) {
  const names = new Set();
  // `[^;{}]` bounds the match to ONE STATEMENT. With `[^;]` the lazy run happily crosses the `{`
  // that opens an arrow body, so `export const archTests = [{ … run: async () => { const files =
  // await listMeshCommands(…)` binds `archTests` instead of `files` — the wrong name, and then no
  // floor is ever found for the right one.
  for (const match of clean.matchAll(new RegExp(`(?:const|let|var)\\s+(\\{[^}]*\\}|[A-Za-z_$][\\w$]*)\\s*=\\s*[^;{}]*?\\b${producer}\\s*\\(`, "gu"))) {
    for (const name of match[1].replace(/[{}]/gu, "").split(",")) {
      const trimmed = name.trim().split(":").pop().trim();
      if (trimmed !== "") names.add(trimmed);
    }
  }
  return names;
}

// The names that READ THE TREE: `readdir` itself, plus every function declared in this file whose
// own body reaches it. DERIVED from the file rather than supplied by the caller — a roster of
// producer names passed in from the test is the stored fact this control exists to refuse, one level
// up, and it goes stale the moment a control names its walker something new.
//
// AN ARROW'S BODY IS WHAT FOLLOWS ITS `=>`, and for an expression-bodied arrow that is ONE
// expression — never the next `{` in the file. `functionBody` cuts from the parameter list to the
// first brace after it, which is right for `function f() {` and wrong for `const f = (x) => x.y`,
// where the first brace after the parameters may open the `archTests` array three lines down.
// Measured (chore 120): a pure in-memory filter above a test whose body read the tree was reported
// as a rooted walker, and a legitimate red-probe equality below it as a retyped tree fact.
export function walkerBodies(clean) {
  const bodies = new Map([["readdir", null]]);
  const headers = [
    [/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gu, "function"],
    [/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/gu, "arrow"],
  ];
  let grew = true;
  while (grew) {
    grew = false;
    for (const [header, kind] of headers) {
      for (const match of clean.matchAll(header)) {
        if (bodies.has(match[1])) continue;
        // STRUCTURAL CUT — the declaration's own body: by matched parens then matched braces for a
        // `function`, and for an arrow by the block or single expression after its `=>`.
        let body = null;
        if (kind === "function") {
          body = functionBody(clean, match[0]);
        } else {
          const params = matchedParenSpan(clean, match.index + match[0].length - 1);
          if (params == null) continue;
          const arrow = /^\s*=>/u.exec(clean.slice(params.close + 1));
          if (arrow == null) continue;
          body = blockOrStatementAfter(clean, params.close + 1 + arrow[0].length)?.body ?? null;
        }
        if (body == null) continue;
        if ([...bodies.keys()].some((name) => callOf(name).test(body))) {
          bodies.set(match[1], body);
          grew = true;
        }
      }
    }
  }
  return bodies;
}

export const walkerNames = (clean) => new Set(walkerBodies(clean).keys());

// The statement `at` sits in, cut to the language's own delimiters rather than to a character
// count — and PAREN-AWARE on the way back: a `;`, `{` or `}` inside an argument list that closes to
// the right of `at` belongs to the statement (`readdir(dir, { withFileTypes: true })`), never ends
// it. Forward, the statement runs to its `;`.
export function statementAround(clean, at) {
  let start = at;
  let depth = 0;
  while (start > 0) {
    const char = clean[start - 1];
    if (char === ")") depth += 1;
    else if (char === "(") { if (depth > 0) depth -= 1; }
    else if (depth === 0 && ";{}".includes(char)) break;
    start -= 1;
  }
  let end = at;
  while (end < clean.length && clean[end] !== ";") end += 1;
  return { start, text: clean.slice(start, end + 1) };
}

// A chain of SET-NARROWING calls: what a walked set may pass through and still be the walked set.
// Nested parens two deep, which is what a callback with a call in it needs; deeper stops the chain,
// which is conservative in the right direction.
const NARROWING = String.raw`(?:\s*\)|\s*\]|\s*\.(?:filter|map|sort|flat|flatMap|slice|concat|values|keys|entries|toSorted)\s*\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))*`;
// The head identifier of an expression that is nothing but a derived name under narrowing.
const CHAIN_HEAD = new RegExp(String.raw`^\s*(?:await\s+)?(?:new\s+Set\s*\(|Array\.from\s*\(|\[\s*\.\.\.|\()*\s*([A-Za-z_$][\w$]*)(${NARROWING})\s*;?\s*$`, "u");
// The same, for the receiver a `.filter` is called on: past a `const x =`, a `return`, an `await`.
const RECEIVER_HEAD = new RegExp(String.raw`^[\s([.]*(?:(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*)?(?:return\s+|await\s+)*(?:new\s+Set\s*\(|Array\.from\s*\(|\[\s*\.\.\.|\()*\s*([A-Za-z_$][\w$]*)(${NARROWING})\s*$`, "u");
// Callees that are handed a root-derived path without READING the tree: fixture builders, path
// helpers, the module loader.
const NOT_A_READER = /\b(?:mkdtemp|mkdir|writeFile|rm|existsSync|pathToFileURL|fileURLToPath|import|relative|dirname|basename|join|resolve)\s*\($/u;

// ONE READING OF A CONTROL, shared by every detector below so they cannot disagree about what a
// walker or a root is. `code` is the comment-stripped source with every string and template literal
// blanked to spaces — same length, same offsets, so a line number or a slice taken on `code` reads
// back from `clean` verbatim. Blanking is what keeps a `{` inside a template out of the statement
// cut and a `path.join(root, …)` inside a plant's string literal out of the root bindings.
// `interiorRooted` is the set of walkers whose bodies are claims about the tree: rooted by their own
// declaration, or called with a root-derived directory somewhere in the control. `inFixture` says
// whether an offset sits in a test body that builds a temp directory — a body that is its own oracle.
function reading(source) {
  const lf = source.replace(/\r\n/gu, "\n");
  const clean = stripComments(lf);
  const blanked = blankStringLiterals(lf);
  // The unblanked text is the fallback when the blanker's same-length promise fails — a fallback
  // that would be a silent degradation of the instrument, which is why `readingFaithful` below is
  // asserted over EVERY control by name: this branch may exist, and may never quietly fire.
  const code = blanked.length === clean.length ? blanked : clean;
  const rootNames = repoRootBindings(code);
  if (rootNames.size === 0) return null;
  const rootRe = new RegExp(`\\b(?:${[...rootNames].join("|")})\\b`, "u");
  const bodies = walkerBodies(code);
  const rootedWalker = (name) => bodies.get(name) != null && rootRe.test(bodies.get(name));
  const callSitesOf = (name) => [...code.matchAll(callOf(name, "gu"))]
    .map((match) => statementAround(code, match.index).text)
    .filter((text) => !text.includes(`function ${name}`) && !new RegExp(`(?:const|let)\\s+${name}\\s*=`, "u").test(text));
  const interiorRooted = new Set([...bodies.keys()].filter((name) => bodies.get(name) != null && (rootedWalker(name) || callSitesOf(name).some((text) => rootRe.test(text)))));
  const fixtureSpans = [];
  for (const match of code.matchAll(/\brun\s*(?::\s*(?:async\s*)?\([^)]*\)\s*=>|\s*\([^)]*\))\s*\{/gu)) {
    const body = matchedBraceBody(code, match.index + match[0].length - 1);
    if (body == null || !/\bmkdtemp\s*\(/u.test(body)) continue;
    const start = code.indexOf("{", match.index);
    fixtureSpans.push([start, start + body.length]);
  }
  const inFixture = (at) => fixtureSpans.some(([from, to]) => at >= from && at <= to);
  return { clean, code, rootRe, bodies, rootedWalker, interiorRooted, inFixture };
}

// THE INSTRUMENT'S OWN FAITHFULNESS: the blanked text is the same length as the stripped text, so
// every cut and every line number above is taken over the source and not over a shifted copy. A
// control whose literals cannot be blanked faithfully would be swept over the unblanked text
// without a word — measured (chore 120), one control's `🌍` did exactly that until the blanker
// stopped collapsing astral characters. Asserted per control, by name, in the sweep below.
export function readingFaithful(source) {
  const lf = source.replace(/\r\n/gu, "\n");
  return blankStringLiterals(lf).length === stripComments(lf).length;
}

const namesOf = (pattern) => pattern.replace(/[{}[\]]/gu, "").split(",").map((name) => name.trim().split(":").pop().trim()).filter((name) => /^[A-Za-z_$][\w$]*$/u.test(name));

// A READ HANDED THE TREE: some callee's FIRST positional argument, past `await` and `path.join(`,
// is a root-derived name. A root inside an options object (`{ workDir, projectRoot }`) is context,
// not a read, and a fixture builder handed a root path is not a reader (`NOT_A_READER`).
function rootedRead(rhs, rootRe) {
  const unwrapped = rhs.replace(/\bpath\.(?:join|resolve)\s*\(/gu, "(").replace(/\bawait\s+/gu, "");
  // The first argument is read through a LOOKAHEAD so an inner callee is not consumed as the outer
  // call's argument: `importSpecifiers(readFile(WORK))` must reach `readFile(WORK`.
  for (const match of unwrapped.matchAll(/([A-Za-z_$][\w$.]*)\s*\(\s*\(*\s*(?=([A-Za-z_$][\w$]*)\b)/gu)) {
    if (NOT_A_READER.test(`${match[1]}(`)) continue;
    if (rootRe.test(match[2])) return true;
  }
  return false;
}

// THE DERIVED NAMES, position-scoped: every binding is judged where it stands, seeded by a rooted
// walk or a rooted read, grown through pure narrowing of an already-derived name, and never inside
// a fixture body. `isDerived(name, at)` resolves the name to its nearest preceding binding.
function derivations(read) {
  const { code, rootRe, bodies, rootedWalker, interiorRooted, inFixture } = read;
  const walkers = [...bodies.keys()];
  const bindings = [];
  for (const match of code.matchAll(/(?:const|let|var)\s+(\{[^}]*\}|\[[^\]]*\]|[A-Za-z_$][\w$]*)\s*=/gu)) {
    const statement = statementAround(code, match.index).text;
    bindings.push({ at: match.index, names: namesOf(match[1]), statement, rhs: statement.slice(statement.indexOf("=") + 1), derived: false });
  }
  const resolve = (name, at) => {
    let found = null;
    for (const binding of bindings) if (binding.at < at && binding.names.includes(name)) found = binding;
    return found;
  };
  for (const binding of bindings) {
    if (inFixture(binding.at)) continue;
    for (const walker of walkers) {
      if (!callOf(walker).test(binding.rhs)) continue;
      if (rootRe.test(binding.statement) || rootedWalker(walker) || [...interiorRooted].some((host) => bodies.get(host)?.includes(binding.statement.trim()))) {
        binding.derived = true;
        break;
      }
    }
    if (!binding.derived && rootedRead(binding.rhs, rootRe)) binding.derived = true;
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const binding of bindings) {
      if (binding.derived || inFixture(binding.at)) continue;
      const head = CHAIN_HEAD.exec(binding.rhs)?.[1];
      if (head == null || resolve(head, binding.at)?.derived !== true) continue;
      binding.derived = true;
      grew = true;
    }
  }
  return { resolve, isDerived: (name, at) => resolve(name, at)?.derived === true };
}

// EVERY repository walk in a control — the REPORTING notion, deliberately wider than the refusing
// ones below. A walk is the repository's when its call site names a root-derived directory, OR when
// the walker's own body does: `walkMjs("test")` reads the tree just as surely as
// `readdir(ARCH_DIR)` does, and a reporting leg that missed it would name fewer carriers than the
// tree holds. Reporting is not refusing — what is REFUSED is the narrower, criterion-named shape.
export function repositoryWalks(source) {
  const read = reading(source);
  if (read == null) return [];
  const { code, rootRe, bodies, rootedWalker } = read;
  const found = [];
  for (const [name] of bodies) {
    for (const match of code.matchAll(callOf(name, "gu"))) {
      const statement = statementAround(code, match.index);
      if (!rootedWalker(name) && !rootRe.test(statement.text)) continue;
      found.push({ line: lineAt(code, match.index), walker: name });
    }
  }
  return found;
}

// A FLOOR IS A LOWER BOUND, and only a lower bound. `assert.ok(files.length <= 1, …)` is the very
// assertion that goes vacuous when the set empties — reading it as a non-vacuity leg would make the
// detector certify the defect it exists to catch. Admitted: `> n`, `>= n` (against a literal or
// another measured set), `!== 0`, the bare truthiness form `assert.ok(files.length, …)`, a named
// member asserted AMONG the set (`assert.ok(files.includes(…))`, `.some(…)`, `.has(…)`), an exact
// non-empty expectation (`assert.deepEqual(files, [x])` — the census legs judge the literal
// separately), and the two helper spellings this tree has for the same claim — `floorProblem(what,
// files.length, n)` in the suite-registration control and this file's own `sweepVacuityProblem`.
const NON_VACUITY = (name) =>
  new RegExp(
    `assert\\.ok\\(\\s*${name}\\.(?:length|size)\\s*(?:>=?\\s*[^,)]+|!==\\s*0|,)`
      + `|assert\\.notEqual\\(\\s*${name}\\.(?:length|size)\\s*,\\s*0`
      + `|assert\\.ok\\(\\s*${name}\\.(?:includes|some|has)\\s*\\(`
      + `|assert\\.deepEqual\\(\\s*${name}${NARROWING}\\s*,\\s*\\[\\s*[^\\]\\s]`
      + `|floorProblem\\([^;]*?\\b${name}\\.(?:length|size)`
      + `|sweepVacuityProblem\\(\\s*${name}\\b`,
    "u",
  );

// AN ABSENCE CLAIM over a name: the filtered set is asserted EMPTY, so its own floor is impossible
// and the floor belongs on the read behind it.
const ABSENCE = (name) => new RegExp(`assert\\.deepEqual\\(\\s*${name}${NARROWING}\\s*,\\s*\\[\\s*\\]|assert\\.(?:equal|strictEqual)\\(\\s*${name}\\.(?:length|size)\\s*,\\s*0\\b`, "u");

// A FILENAME PREDICATE: the ways a `.filter` callback narrows a listing by NAME. Kept wide on
// purpose — a substring test or an equality against a literal empties a swept set exactly as a
// prefix does, and the register row's claim is about vacuity, not about prefixes.
const FILENAME_PREDICATE = /\.(?:startsWith|endsWith|includes|test|match|search)\s*\(|\b(?:extname|basename)\s*\(|[!=]==\s*["'`]/u;

// A repository walk whose result is narrowed by a FILENAME PREDICATE. Returns one entry per site, at
// the FILTER's own line — which is what the criterion asks be named, and what a reader has to go to.
//
// THE RECEIVER IS THE WALK. The expression the `.filter` is called on either calls a walker — rooted
// by the statement, by the walker's own declaration, or by the call sites of the walker whose body
// this statement is in — or it is a DERIVED name (see `derivations`), or a name bound from a walker
// call inside such a walker's body. A `.filter` inside a walker's body over something ELSE —
// `Object.entries(module)` beside the listing — is not a walk and is not reported: measured, the
// first draft attributed every filter in a walker's body to its walk.
export function predicateFilteredWalks(source) {
  const read = reading(source);
  if (read == null) return [];
  const { clean, code, rootRe, bodies, rootedWalker, interiorRooted, inFixture } = read;
  const { resolve, isDerived } = derivations(read);
  const walkerAlternation = [...bodies.keys()].join("|");
  const found = [];
  for (const match of code.matchAll(/\.filter\s*\(/gu)) {
    if (inFixture(match.index)) continue;
    // STRUCTURAL CUT — the argument list the callback belongs to, by matched parens.
    const group = enclosingParenGroup(code, match.index + match[0].length - 1);
    if (group == null) continue;
    if (!FILENAME_PREDICATE.test(group.body)) continue;
    const statement = statementAround(code, match.index);
    const text = statement.text;
    const own = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/u.exec(text)?.[1] ?? null;
    const receiver = text.slice(0, match.index - statement.start);
    const hosts = [...interiorRooted].filter((name) => bodies.get(name).includes(text.trim()));

    let repository = false;
    for (const [name] of bodies) {
      if (!callOf(name).test(receiver)) continue;
      if (rootRe.test(text) || rootedWalker(name) || hosts.length > 0) { repository = true; break; }
    }
    const head = repository ? null : (RECEIVER_HEAD.exec(receiver)?.[1] ?? null);
    if (!repository && head != null) {
      if (isDerived(head, match.index)) repository = true;
      else {
        const boundFromAWalk = new RegExp(`(?:const|let|var)\\s+${head}\\s*=\\s*[^;{}]*?\\b(?:${walkerAlternation})\\s*\\(`, "u");
        repository = hosts.some((name) => boundFromAWalk.test(bodies.get(name)));
      }
    }
    if (!repository) continue;

    // WHERE THE FLOOR MAY BE: over the statement's own binding; over what a call to that binding is
    // assigned into, when the binding is itself a function (`const controlFiles = async () => …`);
    // over what the enclosing walker's calls are assigned into, when the walk sits behind a helper;
    // and for an ABSENCE claim, over the read behind the set — the receiver's head and every name
    // bound by the statement that produced it.
    const bindings = new Set();
    const absence = own != null && ABSENCE(own).test(code);
    if (own != null) {
      bindings.add(own);
      for (const binding of bindingsFrom(code, own)) bindings.add(binding);
    }
    for (const [name, body] of bodies) {
      if (body == null || !body.includes(group.body)) continue;
      for (const binding of bindingsFrom(code, name)) bindings.add(binding);
    }
    if (absence && head != null) {
      bindings.add(head);
      const producer = resolve(head, match.index);
      if (producer != null) {
        for (const name of producer.names) bindings.add(name);
        const callee = /([A-Za-z_$][\w$]*)\s*\(/u.exec(producer.rhs.replace(/\bawait\s+/gu, ""))?.[1];
        if (callee != null) for (const binding of bindingsFrom(code, callee)) bindings.add(binding);
      }
    }
    found.push({
      line: lineAt(code, match.index),
      bindings: [...bindings],
      absence,
      statement: clean.slice(statement.start, statement.start + text.length).trim(),
    });
  }
  return found;
}

// …and of those, the ones with NO non-vacuity leg over the filtered set. This is the criterion's
// own shape: a predicate-narrowed walk with no floor is caught; the same walk once it gains a floor
// is not. The floor may be spelled against a literal or against another measured set — both are
// floors.
export function unguardedPredicateFilters(source) {
  const read = reading(source);
  if (read == null) return [];
  return predicateFilteredWalks(source).filter((site) => {
    if (site.bindings.length === 0) return true;
    return !site.bindings.some((binding) => NON_VACUITY(binding).test(read.code));
  });
}

// THE SILENT SPECIES, reported separately: a `try` that walks the REPOSITORY and a `catch` that
// substitutes an empty list. The `try` block is cut by MATCHING BRACES, so a walk sitting below any
// amount of setup is still seen — a character-bounded scan is exactly the evasion a carrier gets for
// free by growing.
export function silentSweeps(source) {
  const read = reading(source);
  if (read == null) return [];
  const { clean, code, rootRe, bodies } = read;
  const walkerRe = new RegExp(`\\b(?:${[...bodies.keys()].join("|")})\\s*\\(`, "u");
  const found = [];
  for (const match of code.matchAll(/\btry\s*\{/gu)) {
    const body = matchedBraceBody(code, match.index);
    if (body == null) continue;
    if (!walkerRe.test(body) || !rootRe.test(body)) continue;
    // The `try` block's own closing brace, located from its opening one plus the matched body —
    // never a character count. Everything after it is where the `catch` must be.
    const opensAt = code.indexOf("{", match.index);
    const after = code.slice(opensAt + body.length + 1);
    const handler = /^\s*\}\s*catch\s*(?:\([^)]*\))?\s*\{/u.exec(after);
    if (handler == null) continue;
    const handlerBody = matchedBraceBody(after, handler.index + handler[0].length - 1);
    if (handlerBody == null || !/=\s*\[\s*\]/u.test(handlerBody)) continue;
    const handlerAt = opensAt + body.length + 1 + handler.index + handler[0].length;
    found.push({ line: lineAt(code, match.index), handler: clean.slice(handlerAt, handlerAt + handlerBody.length).trim() });
  }
  return found;
}

// A RETYPED TREE-WALK EQUALITY: an exact equality over the length or size of a DERIVED set against
// a literal, in either operand order.
export function treeWalkEqualities(source) {
  const read = reading(source);
  if (read == null) return [];
  const { code, inFixture } = read;
  const { isDerived } = derivations(read);
  const found = [];
  for (const match of code.matchAll(/assert\.(?:equal|strictEqual)\(\s*([A-Za-z_$][\w$]*)\.(?:length|size)\s*,\s*(\d+)\b/gu)) {
    if (inFixture(match.index) || !isDerived(match[1], match.index)) continue;
    found.push({ line: lineAt(code, match.index), subject: match[1], literal: Number(match[2]) });
  }
  for (const match of code.matchAll(/assert\.(?:equal|strictEqual)\(\s*(\d+)\s*,\s*([A-Za-z_$][\w$]*)\.(?:length|size)\b/gu)) {
    if (inFixture(match.index) || !isDerived(match[2], match.index)) continue;
    found.push({ line: lineAt(code, match.index), subject: match[2], literal: Number(match[1]) });
  }
  return found.sort((a, b) => a.line - b.line);
}

// A RETYPED MEMBER CENSUS: a DERIVED set — under narrowing — asserted `deepEqual` to a string-array
// literal. The first argument is cut to the top-level comma by matched brackets, never by a regex
// that stops at the first one.
export function treeWalkCensuses(source) {
  const read = reading(source);
  if (read == null) return [];
  const { clean, code, inFixture } = read;
  const { isDerived } = derivations(read);
  const found = [];
  for (const match of code.matchAll(/assert\.deepEqual\(\s*/gu)) {
    if (inFixture(match.index)) continue;
    const group = enclosingParenGroup(code, match.index + match[0].length - 1);
    if (group == null) continue;
    let depth = 0;
    let cut = -1;
    for (let index = 0; index < group.body.length; index += 1) {
      const char = group.body[index];
      if ("([{".includes(char)) depth += 1;
      else if (")]}".includes(char)) depth -= 1;
      else if (char === "," && depth === 0) { cut = index; break; }
    }
    if (cut < 0) continue;
    const head = CHAIN_HEAD.exec(`${group.body.slice(0, cut)};`)?.[1];
    if (head == null || !isDerived(head, match.index)) continue;
    if (!/^\s*\[\s*["'`]/u.test(group.body.slice(cut + 1))) continue;
    found.push({ line: lineAt(code, match.index), subject: head, expectation: clean.slice(group.open + 1 + cut + 1, group.close).trim().replace(/\s+/gu, " ").slice(0, 100) });
  }
  return found;
}

// A sweep's own non-vacuity, said once so a caller does not spell it nine times. Returns the failure
// message, or null. The message NAMES THE DIRECTORY that was walked (119/ADR-003 §4).
export function sweepVacuityProblem(set, directory) {
  if (Array.isArray(set) && set.length > 0) return null;
  return `the sweep of ${directory} found no members — a control whose subject set empties must FAIL naming the directory it walked, never pass over the empty set`;
}

export const archTests = [
  {
    name: "arch/119 FF-11902: the classifier separates a decision a reader cannot compute from a fact the tree already holds",
    run: () => {
      const rows = [
        [{ kind: "bound", derivedFromTree: false }, "decision", "SINK_CEILING = 2482, a declared ceiling with no headroom"],
        [{ kind: "bound", derivedFromTree: false }, "decision", "SINK_FLOOR = 1500, a declared floor"],
        [{ kind: "policy-allowlist", derivedFromTree: true }, "decision", "a policy allowlist of the modules permitted to open a store"],
        [{ kind: "count", derivedFromTree: true }, "fact", "assert.equal(suites.length, 48) over a walk of test/"],
        [{ kind: "census", derivedFromTree: true }, "fact", "a closed member census over a readdir of test/arch/"],
        [{ kind: "census", derivedFromTree: true }, "fact", "a closed list of the source files that import a module"],
        [{ kind: "citation", derivedFromTree: true }, "fact", "a <path>:<line> citation checked against the symbol it names"],
        [{ kind: "count", derivedFromTree: true, fixtureIsOracle: true }, "not-a-carrier", "an exact size asserted over a temp fixture the test built"],
      ];
      for (const [input, expected, label] of rows) assert.equal(classifyStoredLiteral(input), expected, `${label} -> ${expected}`);
    },
  },

  {
    name: "arch/119 FF-11902: NO control narrows a repository walk by a filename PREDICATE without a non-vacuity leg — a move REDS a control, it never empties one",
    run: async () => {
      const controls = await controlFiles();
      assert.ok(controls.length > 300, `the sweep read the test tree (non-vacuous): ${controls.length} controls`);
      const sites = [];
      const naked = [];
      for (const rel of controls) {
        const source = await readFile(path.join(root, rel), "utf8");
        for (const site of predicateFilteredWalks(source)) sites.push(`${rel}:${site.line}`);
        for (const site of unguardedPredicateFilters(source)) naked.push(`${rel}:${site.line} — ${site.statement}`);
      }
      // THE INSTRUMENT IS ARMED, ASSERTED RATHER THAN ASSUMED — on the way past, against the plants
      // (a walk with no floor is caught, the same walk with a floor is not), and against the LIVE
      // tree, which holds this species in numbers: the floor below is what makes "none is
      // unguarded" a claim about the tree rather than about a detector that stopped looking.
      // Measured 2026-09-10: 61 sites.
      assert.equal(unguardedPredicateFilters(NAKED_PREFIX_FILTER).length, 1, "the detector is armed: a prefix-narrowed walk with no floor is caught");
      assert.equal(unguardedPredicateFilters(NAKED_SUFFIX_FILTER).length, 1, "…and a suffix-narrowed one — the commonest narrowing in the tree");
      assert.equal(unguardedPredicateFilters(NAKED_REGEX_FILTER).length, 1, "…and a regex-tested one");
      assert.equal(unguardedPredicateFilters(NAKED_ROOTED_HELPER_FILTER).length, 1, "…and a walk rooted by its helper's declaration, narrowed at the call site");
      assert.equal(unguardedPredicateFilters(NAKED_BOUND_FIRST_FILTER).length, 1, "…and a listing bound first and narrowed a statement later");
      assert.equal(unguardedPredicateFilters(NAKED_ROOTED_READ_ABSENCE).length, 1, "…and an absence claim over a rooted read with no floor on the read");
      assert.deepEqual(unguardedPredicateFilters(GUARDED_PREFIX_FILTER), [], "…and a floor over the filtered set returns it to green");
      assert.deepEqual(unguardedPredicateFilters(GUARDED_SUFFIX_FILTER), [], "…in every predicate spelling");
      assert.deepEqual(unguardedPredicateFilters(GUARDED_BOUND_FIRST_FILTER), [], "…and however the listing was bound");
      assert.deepEqual(unguardedPredicateFilters(GUARDED_ROOTED_READ_ABSENCE), [], "…and a floor on the READ greens the absence claim over it");
      assert.ok(sites.length >= 40, `the live tree holds predicate-narrowed repository walks and the detector sees them: ${sites.length}`);
      assert.deepEqual(
        naked,
        [],
        "a control that narrows a repository walk by a filename predicate and asserts nothing about the size of the result goes VACUOUS the moment that "
          + "family gains a directory — the claim is then asserted over the empty set, permanently, with no message anywhere (119/ADR-003 §4). "
          + "Assert the swept set is non-empty, naming the directory walked; for an absence claim, floor the read behind it:\n  - "
          + naked.join("\n  - "),
      );
    },
  },

  {
    name: "arch/119 FF-11902: no control walks the repository into a catch that substitutes an empty list",
    run: async () => {
      const controls = await controlFiles();
      assert.ok(controls.length > 300, `the sweep read the test tree (non-vacuous): ${controls.length} controls`);
      const silent = [];
      for (const rel of controls) {
        for (const site of silentSweeps(await readFile(path.join(root, rel), "utf8"))) {
          silent.push(`${rel}:${site.line} — catch { ${site.handler} }`);
        }
      }
      assert.deepEqual(
        silent,
        [],
        "a control that walks the repository and swallows the failure into an empty list asserts its invariant over NOTHING once the tree moves, "
          + "with no message anywhere (119/ADR-003 §4). Let the walk throw, or assert the swept set is non-empty and name the directory:\n  - "
          + silent.join("\n  - "),
      );
    },
  },

  {
    name: "arch/119 FF-11902: NO control retypes a tree-walk equality — the count is derived into the property it stood in for, over every member, with a floor kept",
    run: async () => {
      const controls = await controlFiles();
      assert.ok(controls.length > 300, `the sweep read the test tree (non-vacuous): ${controls.length} controls`);
      const retyped = [];
      for (const rel of controls) {
        for (const site of treeWalkEqualities(await readFile(path.join(root, rel), "utf8"))) {
          retyped.push(`${rel}:${site.line} — assert.equal(${site.subject}.length, ${site.literal})`);
        }
      }
      // ARMED, on the way past: the three spellings are caught, the derivation is not, a probe over
      // the tree PLUS a plant is not, a fixture body is not, and an arrow whose body is one
      // expression does not make a walker of a filter over a model.
      assert.equal(treeWalkEqualities(RETYPED_EQUALITY).length, 1, "the detector is armed: a retyped `.length` equality is caught");
      assert.equal(treeWalkEqualities(RETYPED_SIZE_EQUALITY).length, 1, "…and a `.size` under strictEqual");
      assert.equal(treeWalkEqualities(RETYPED_REVERSED_EQUALITY).length, 1, "…and the literal on the left");
      assert.deepEqual(treeWalkEqualities(DERIVED_EQUALITY), [], "the property over every member, with a floor, is the derivation and passes");
      assert.deepEqual(treeWalkEqualities(PLANT_PROBE_EQUALITY), [], "a checker handed the tree plus a plant is a CALL, not a narrowing — its exact count is a red probe, not a retyped fact");
      assert.deepEqual(treeWalkEqualities(FIXTURE_BODY_WALK), [], "a test body that builds a temp directory is its own oracle, even when it names the directory `root`");
      assert.deepEqual(treeWalkEqualities(EXPRESSION_ARROW_NOT_A_WALKER), [], "an expression-bodied arrow's body is the expression after `=>`, not the next brace in the file");
      assert.deepEqual(treeWalkEqualities(DYNAMIC_IMPORT_IS_NOT_A_ROOT), [], "a module resolved through import.meta.url is not a root, and its exports are not the tree");
      assert.deepEqual(
        retyped,
        [],
        "a control that asserts an exact count over a set it walked out of the repository stores a FACT about the tree, and the next story to move "
          + "that family pays for it without having read this file (119/ADR-003 §2). Derive the equality into the property it stood in for over every "
          + "member and keep a floor; where the number is a DECISION, spell it as the floor plus a declared ceiling carrying its reason:\n  - "
          + retyped.join("\n  - "),
      );
    },
  },

  {
    name: "arch/119 FF-11902: NO control retypes a member census — a derived set is never asserted equal to a string-array literal; a home is named AMONG the set, under a floor and a declared ceiling",
    run: async () => {
      const controls = await controlFiles();
      assert.ok(controls.length > 300, `the sweep read the test tree (non-vacuous): ${controls.length} controls`);
      const retyped = [];
      for (const rel of controls) {
        for (const site of treeWalkCensuses(await readFile(path.join(root, rel), "utf8"))) {
          retyped.push(`${rel}:${site.line} — deepEqual(${site.subject}, ${site.expectation})`);
        }
      }
      assert.equal(treeWalkCensuses(RETYPED_CENSUS).length, 1, "the detector is armed: a member census retyped as a literal is caught");
      assert.deepEqual(treeWalkCensuses(SINGLE_HOME_DERIVED), [], "the floor, the declared ceiling and the home named among the set is the admitted form, and passes");
      assert.deepEqual(treeWalkCensuses(FIXTURE_BODY_WALK), [], "a census over a fixture the test built is not a carrier");
      assert.deepEqual(
        retyped,
        [],
        "a control that asserts a set it drew from the repository equal to a literal list stores a member census — the register row's own words — and "
          + "bills the next mover of that family (119/ADR-003 §2; TECH_DEBT item 81, discharged at chore 120). Name the members that must be present "
          + "AMONG the set, floor it, and where the set is a policy assert every member is admitted — never enumerate the set as the answer:\n  - "
          + retyped.join("\n  - "),
      );
    },
  },

  {
    name: "arch/119 FF-11902: the door's tree-walk equalities are gone, each is the property it stood in for, and the floors remain",
    run: async () => {
      const source = await readFile(path.join(root, DOOR), "utf8");
      assert.deepEqual(treeWalkEqualities(source), [], `${DOOR} retypes no tree-walk count`);
      const clean = stripComments(source);
      // THE PROPERTY, NOT ONLY THE FLOOR. A derivation that keeps the count and drops the property
      // reads as a smaller diff and is the weakening this row exists to refuse.
      assert.match(clean, /importsTheSink\s*\(/u, "each census member's sink import is re-derived from disk, per member");
      assert.match(clean, /partition the \$\{preExisting\.length\} recorded dependents exhaustively/u, "the three classes are asserted to partition the census exhaustively");
      assert.match(clean, /no dependent is counted in two classes/u, "…and disjointly, which the arithmetic never said");
      // 129/02 (2026-09-13): the door's SUITE_FLOOR / CENSUS_FLOOR ratcheted 48 -> 49 / 54 -> 55 with the
      // census (see the no-headroom probe below), so the literals kept here move with them.
      for (const floor of ["SUITE_FLOOR = 49", "FIXTURE_FLOOR = 2", "SOURCE_SIDE_FLOOR = 4", "CENSUS_FLOOR = 55"]) {
        assert.ok(clean.includes(floor), `the non-vacuity floor ${floor} is kept — a floor is a declared bound, and stays stored`);
      }
      for (const floor of [/zeroMention\.length >= 44/u, /importable\.length >= 53/u, /suites\.length >= 49/u]) {
        assert.match(clean, floor, `${floor} — the floor the equality was standing in for is kept`);
      }
    },
  },

  {
    name: "arch/119 FF-11902: a floor is a floor, not a second equality wearing one — driven over the door's REAL census",
    run: async () => {
      // Driven over the shipped census rather than over arithmetic: the door's own walk supplies the
      // members, and the floors are the ones the control really carries.
      const { census } = await import("../../session/agent-session-driver-door.test.mjs");
      const { suites, fixtures, sourceSide, preExisting } = await census();
      // 129/02 (2026-09-13) moved `suites` 48 -> 49 and `preExisting` 54 -> 55: task 01's driver-level
      // `signal` cases in `test/loop/drive-command-phase-drivers.test.mjs` import
      // `driveInteractiveClaudeSession` through the sink (the closed naming allowlist forbids the
      // driver's own path), so the door's census gained one dependent and the no-headroom floors
      // below ratchet with it — in step with the door's own SUITE_FLOOR / CENSUS_FLOOR.
      const floors = { suites: 49, fixtures: 2, sourceSide: 4, preExisting: 55 };
      const live = { suites: suites.length, fixtures: fixtures.length, sourceSide: sourceSide.length, preExisting: preExisting.length };
      for (const [name, floor] of Object.entries(floors)) {
        // A NEW dependent needs no edit to the control…
        assert.ok(live[name] + 1 >= floor, `${name}: adding a dependent keeps the floor satisfied — no edit to the control`);
        // …and a DELETED one reds, which is only true while the floor has no headroom. That is the
        // half an arithmetic probe cannot show: it is a property of the SHIPPED numbers.
        assert.equal(
          live[name] - 1 >= floor,
          false,
          `${name}: the floor (${floor}) has no headroom over the live count (${live[name]}), so a member deleted rather than kept green FAILS the control`,
        );
      }
    },
  },

  {
    name: "arch/119 FF-11902: the named SILENT specimen is de-silenced, and its walk survives the interior 119/02 gives src/commands/",
    run: async () => {
      const source = await readFile(path.join(root, MESH_UI), "utf8");
      const clean = stripComments(source);
      assert.deepEqual(silentSweeps(source), [], `${MESH_UI} no longer substitutes an empty list on a failed walk`);
      assert.deepEqual(unguardedPredicateFilters(source), [], `${MESH_UI}'s walk carries a non-vacuity leg`);
      assert.match(clean, /assert\.ok\(\s*\n?\s*files\.length > 0/u, "it asserts its swept set is non-empty BEFORE asserting anything over it");
      assert.match(clean, /found no mesh command module/u, "…and the failure message names the directory that was walked");
      assert.match(clean, /entry\.isDirectory\(\)/u, "the walk is recursive, so 119/02's `src/commands/mesh/` interior does not empty it");
      assert.match(clean, /startsWith\("mesh\/"\)/u, "…and the family's directory spelling resolves to the same subject as the flat one");
    },
  },

  {
    name: "arch/119 FF-11902: a move REDS a control — the four ways a sweep goes quiet each fail naming the subject",
    run: async () => {
      const DIR = "src/commands";
      // (1) the directory it walks is renamed — the walk THROWS rather than returning [].
      await assert.rejects(async () => readdir(path.join(root, "src", "no-such-directory")), /ENOENT/u, "a renamed directory throws; a catch substituting [] is what hides it");
      // (2) every member matching the filename predicate moves into a subdirectory — the shape the
      //     detector refuses, driven over a plant with no floor.
      assert.equal(unguardedPredicateFilters(NAKED_PREFIX_FILTER).length, 1, "a predicate-narrowed walk with no floor is caught");
      // (3) its readdir throws and the catch WOULD substitute an empty list.
      assert.equal(silentSweeps(SWALLOWING_CATCH).length, 1, "the swallowed failure is caught as its own species");
      assert.equal(sweepVacuityProblem([], DIR) === null, false, "an empty substituted list is a failure, not a pass");
      // (4) the walk succeeds and matches nothing.
      assert.match(String(sweepVacuityProblem([], DIR)), /found no members/u, "a walk that matches nothing fails rather than passing over the empty set");
      assert.equal(sweepVacuityProblem(["mesh-identity.mjs"], DIR), null, "…and a walk that found something is not a failure");
    },
  },

  {
    name: "arch/119 FF-11902: the RED PROBE plants the unguarded filter and is caught AT ITS FILTER'S LINE, and a floor returns it to green",
    run: () => {
      const caught = unguardedPredicateFilters(NAKED_PREFIX_FILTER);
      assert.equal(caught.length, 1, "the planted control is caught");
      const expectedLine = NAKED_PREFIX_FILTER.split("\n").findIndex((line) => line.includes(".filter(")) + 1;
      assert.equal(caught[0].line, expectedLine, `…at the line of its UNGUARDED FILTER (${expectedLine}), which is the site a reader has to go to`);
      assert.match(caught[0].statement, /startsWith\("mesh-"\)/u, "…and the statement that narrows the walk is quoted back, unblanked");

      // "Given the planted control gains a floor asserted over the filtered set … Then it passes."
      assert.deepEqual(unguardedPredicateFilters(GUARDED_PREFIX_FILTER), [], "the same control with a floor over the filtered set passes");
      assert.deepEqual(unguardedPredicateFilters(DERIVED_FLOOR_PREFIX_FILTER), [], "…and so does a floor spelled against another measured set");

      // The wider predicate species, each caught at its filter's line and quoted back.
      const plants = [
        [NAKED_SUFFIX_FILTER, /endsWith\("\.mjs"\)/u],
        [NAKED_REGEX_FILTER, /\.test\(n\)/u],
        [NAKED_ROOTED_HELPER_FILTER, /listCommands\(\)/u],
        [NAKED_BOUND_FIRST_FILTER, /listing\.filter/u],
        [NAKED_ROOTED_READ_ABSENCE, /specs\.filter/u],
      ];
      for (const [plant, spelling] of plants) {
        const [site, ...rest] = unguardedPredicateFilters(plant);
        assert.deepEqual(rest, [], "one site per plant");
        assert.equal(site.line, plant.split("\n").findIndex((line) => line.includes(".filter(")) + 1, `${spelling}: caught at its filter's line`);
        assert.match(site.statement, spelling, `${spelling}: the narrowing statement is quoted back`);
      }
      assert.equal(unguardedPredicateFilters(NAKED_ROOTED_READ_ABSENCE)[0].absence, true, "the absence claim is reported as one, so the message sends the floor to the read");

      // The floor alone must NOT green a swallowed walk — that is a second, separate species.
      assert.equal(silentSweeps(SWALLOWING_CATCH).length, 1, "a floor does not excuse swallowing the failure into an empty list");
      // …and the swallow is caught however far down the try body the walk sits: the block is cut by
      // matching braces, not by a character bound.
      assert.equal(silentSweeps(SWALLOWING_CATCH_DEEP).length, 1, "a walk below 2,000 characters of setup is still inside its try block");

      // A walk behind a locally-declared helper is still a repository walk.
      assert.equal(unguardedPredicateFilters(WALKER_BEHIND_A_HELPER).length, 1, "extracting the walk into a helper does not hide the carrier");
      // …and a retyped equality behind that same helper is still a retyped fact.
      assert.equal(treeWalkEqualities(RETYPED_EQUALITY).length, 1, "the producing names are derived from the file, never supplied by the caller");
      // …and a retyped census over the walk is its own species.
      assert.equal(treeWalkCensuses(RETYPED_CENSUS).length, 1, "a member census retyped as a literal is caught");

      // A TEMP-FIXTURE walk is not a carrier: the fixture is the oracle.
      assert.deepEqual(unguardedPredicateFilters(FIXTURE_WALK), [], "a walk of a directory the test itself built is not a claim about the tree");
      assert.deepEqual(silentSweeps(FIXTURE_WALK), [], "…in either species");
      assert.deepEqual(treeWalkEqualities(FIXTURE_WALK), [], "…or the third");
      assert.deepEqual(unguardedPredicateFilters(FIXTURE_BODY_WALK), [], "…and a fixture built inside the test body is one too, whatever it names its directory");
    },
  },

  {
    name: "arch/119 FF-11902: the two declared BOUNDS are unchanged by this story — a ratchet is a decision, and it is shrink-only",
    run: async () => {
      const source = await readFile(path.join(root, SINK_GUARD), "utf8");
      const clean = stripComments(source);
      // 119/04 LOWERS THE CEILING, and lowering is the one direction a shrink-only ratchet admits
      // without an ADR — so this leg pins the PROPERTY rather than the number. Freezing the literal
      // made this control refuse the very story ADR-007 §4 scheduled: item 83's split subtracts 525
      // lines from the sink, and a ceiling that could not follow them down would have forced either
      // a softened ratchet or an unshrunk file. The bound is still a DECISION and still stored;
      // what is asserted is that it only ever falls.
      const ceiling = Number(/const SINK_CEILING = (\d+);/u.exec(clean)?.[1]);
      assert.ok(Number.isInteger(ceiling), "SINK_CEILING is still a declared integer literal — not softened into a computation, not given a fallback, not deleted");
      assert.ok(ceiling <= SINK_CEILING_WHEN_DECLARED, `SINK_CEILING is ${ceiling}, above the ${SINK_CEILING_WHEN_DECLARED} it stood at when this control was written — shrink-only means it may fall and may never rise`);
      assert.match(clean, /const SINK_FLOOR = 1500;/u, "SINK_FLOOR still reads 1500 — the floor is what keeps the ceiling non-vacuous, and no story lowers it to fit a larger cut");
      // ITEM 81 CLASSED THESE AS CARRIERS; THAT WAS A MISCLASSIFICATION (119/ADR-003 §2). A ceiling
      // declares a bound nobody can derive from the tree, and pinning it is the point.
      assert.equal(classifyStoredLiteral({ kind: "bound", derivedFromTree: false }), "decision", "a declared ceiling is a DECISION and stays stored");
      assert.match(source, /NO HEADROOM is taken/u, "the ceiling carries its reason in its own comment");
      assert.match(clean, /count <= SINK_CEILING/u, "the ratchet is asserted against the measured count…");
      assert.match(clean, /count >= SINK_FLOOR/u, "…with the floor that keeps it non-vacuous");
      assert.match(clean, /SINK_CEILING < 3286/u, "…and shrink-only: the ceiling may fall and may never return to the pre-move size");
    },
  },

  {
    name: "arch/119 FF-11902: the control NAMES the carriers it finds and is non-vacuous on the day it lands",
    run: async () => {
      const controls = await controlFiles();
      const carriers = [];
      const unfaithful = [];
      for (const rel of controls) {
        const source = await readFile(path.join(root, rel), "utf8");
        if (!readingFaithful(source)) unfaithful.push(rel);
        for (const site of silentSweeps(source)) carriers.push({ rel, line: site.line, species: "silent" });
        for (const site of treeWalkEqualities(source)) carriers.push({ rel, line: site.line, species: "retyped-equality" });
        for (const site of treeWalkCensuses(source)) carriers.push({ rel, line: site.line, species: "retyped-census" });
        for (const site of predicateFilteredWalks(source)) carriers.push({ rel, line: site.line, species: "predicate-narrowed-walk" });
        for (const site of repositoryWalks(source)) carriers.push({ rel, line: site.line, species: "repository-walk" });
      }
      // THE SET IT EXAMINED IS NON-EMPTY, and so is what it found. A control that reported "no
      // carriers" over an empty walk would be the species it exists to name.
      assert.ok(controls.length > 300, `the set of controls examined is non-empty: ${controls.length}`);
      // …AND EVERY CONTROL WAS READ FAITHFULLY. The fallback in `reading` may exist; it may never
      // fire without naming the file it fired on.
      assert.deepEqual(unfaithful, [], `every control's string literals blank to the same length, so no control was swept over a shifted copy of itself:\n  - ${unfaithful.join("\n  - ")}`);
      assert.ok(carriers.length > 0, `the sweep NAMED the carriers it found: ${carriers.length}`);
      const named = new Set(carriers.map((carrier) => carrier.rel));
      assert.ok(named.has(MESH_UI), `${MESH_UI} is among the carriers it names (its repository walk, now guarded)`);
      assert.ok(named.has(DOOR), `${DOOR} is among the carriers it names (its sink-fan-in census, now derived)`);
      // Reported by FILE AND LINE, so a reader can go to the site rather than to a category.
      for (const carrier of carriers) {
        assert.ok(Number.isInteger(carrier.line) && carrier.line > 0, `${carrier.rel} carrier is reported with its line (${carrier.line})`);
      }
    },
  },
];
