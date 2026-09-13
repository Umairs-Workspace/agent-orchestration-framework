// PLANTED CONTROL SOURCES for FF-11902 (`test/arch/audit/acd-control-derives-its-census.test.mjs`).
//
// WHY THEY LIVE HERE AND NOT IN THE CONTROL. FF-11902 detects a shape in the SOURCE TEXT of every
// control under `test/`, and its own red probes are control-shaped source. Held inline, the control
// matched its own plants — a `const … = path.join(root, …)` inside a string literal reads exactly
// like a root binding to a text detector — and the only way to keep the sweep green was to exclude
// the control from its own class by name. That exclusion is a hole: it exempts the whole file from
// all three detectors forever, and nothing would notice a real carrier hiding in it.
//
// A `test/support/*.mjs` fixture is not a `*.test.mjs` control, so the sweep does not walk it and no
// exclusion is needed. The plants stay literal, the detector stays honest about every control in the
// tree including the one that owns it, and each plant is still asserted to be CAUGHT by the probes
// that import it.
//
// Each export is a STRING: control-shaped source, never an executable module.

const HEADER = [
  'import path from "node:path";',
  'import { fileURLToPath } from "node:url";',
  'import { readdir } from "node:fs/promises";',
  'const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");',
  'const COMMANDS = path.join(root, "src", "commands");',
].join("\n");

const open = "export const archTests = [{ name: 'planted', run: async () => {";
const close = "} }];";

// THE CRITERION'S OWN GIVEN, exactly: "a planted control that filters a `readdir` by filename prefix
// with no non-vacuity leg". No try/catch — the scenario never mentions one, and a detector that
// needed one would be watching the wrong half of the shape.
export const NAKED_PREFIX_FILTER = [
  HEADER,
  open,
  '  const files = (await readdir(COMMANDS)).filter((n) => n.startsWith("mesh-"));',
  "  assert.ok(files.length <= 1);",
  close,
].join("\n");

// …AND THE SAME PLANT ONCE IT "gains a floor asserted over the filtered set". This must pass.
export const GUARDED_PREFIX_FILTER = [
  HEADER,
  open,
  '  const files = (await readdir(COMMANDS)).filter((n) => n.startsWith("mesh-"));',
  "  assert.ok(files.length > 0, `walked ${COMMANDS}`);",
  "  assert.ok(files.length <= 1);",
  close,
].join("\n");

// A floor spelled against another measured set rather than a literal — the shape
// `acd-loop-finding-envelope.test.mjs:498` really uses. It is a floor, and must pass.
export const DERIVED_FLOOR_PREFIX_FILTER = [
  HEADER,
  open,
  "  const expected = [\"mesh-identity.mjs\"];",
  '  const files = (await readdir(COMMANDS)).filter((n) => n.startsWith("mesh-"));',
  "  assert.ok(files.length >= expected.length, `the mesh-* sweep was non-vacuous: ${files.length}`);",
  close,
].join("\n");

// THE WIDER SPECIES (chore 120): the walk narrowed by a filename PREDICATE that is not a prefix.
// Measured 2026-09-10, the live tree held 27 such walks of which 15 carried no floor, and every one
// of them was invisible to a detector that only knew `startsWith("x-")`. A suffix is the commonest
// narrowing there is — `endsWith(".md")` over a records directory — and it goes vacuous the moment
// that family gains an interior, exactly as a prefix does.
export const NAKED_SUFFIX_FILTER = [
  HEADER,
  open,
  '  const files = (await readdir(COMMANDS)).filter((n) => n.endsWith(".mjs"));',
  "  assert.ok(files.length <= 40);",
  close,
].join("\n");

export const GUARDED_SUFFIX_FILTER = [
  HEADER,
  open,
  '  const files = (await readdir(COMMANDS)).filter((n) => n.endsWith(".mjs"));',
  "  assert.ok(files.length > 0, `the sweep of ${COMMANDS} found no .mjs module`);",
  "  assert.ok(files.length <= 40);",
  close,
].join("\n");

// …and a REGEX test on the name — `test/arch/work/acd-advisory-lane-never-gates.test.mjs`'s
// `/^doctor-.*\.mjs$/u.test(name)` is this shape.
export const NAKED_REGEX_FILTER = [
  HEADER,
  open,
  "  const files = (await readdir(COMMANDS)).filter((n) => /^mesh-.*\\.mjs$/u.test(n));",
  "  assert.ok(files.length <= 1);",
  close,
].join("\n");

// A WALK ROOTED BY ITS DECLARATION, narrowed at the CALL SITE. `test/arch/ui/acd-home-pane-truth`'s
// `(await readHomeFiles()).filter(/session-mount\.mjs$/)` is this shape: the statement that filters
// names no root, because the helper's own body does. A detector that required the root to appear
// in the filtering statement reported this carrier CLEAN.
export const NAKED_ROOTED_HELPER_FILTER = [
  HEADER,
  "async function listCommands() {",
  "  return await readdir(COMMANDS);",
  "}",
  open,
  '  const files = (await listCommands()).filter((n) => n.endsWith(".mjs"));',
  "  assert.ok(files.length <= 40);",
  close,
].join("\n");

// THE BIND-FIRST SHAPE (chore 120, second round): the listing bound to a name and narrowed a
// statement LATER. The first widening drew its line at the statement that calls the walk, which
// made binding first an evasion; the walked set is now followed through pure set-narrowing —
// `filter`, `map`, `sort`, a spread, `new Set` — and through nothing else, because a CALL may add
// a plant (see `PLANT_PROBE_EQUALITY` below).
export const NAKED_BOUND_FIRST_FILTER = [
  HEADER,
  open,
  "  const listing = await readdir(COMMANDS);",
  '  const files = listing.filter((n) => n.endsWith(".mjs"));',
  "  assert.ok(files.length <= 40);",
  close,
].join("\n");

export const GUARDED_BOUND_FIRST_FILTER = [
  HEADER,
  open,
  "  const listing = await readdir(COMMANDS);",
  '  const files = listing.filter((n) => n.endsWith(".mjs"));',
  "  assert.ok(files.length > 0, `the sweep of ${COMMANDS} found no .mjs module`);",
  "  assert.ok(files.length <= 40);",
  close,
].join("\n");

// A ROOTED READ THROUGH AN IMPORTED READER — `readFile` handed a root-derived path — narrowed to an
// ABSENCE claim. Four controls carry this shape over `src/work.mjs`'s and `src/run-store.mjs`'s
// import lists. The floor belongs on the READ, never on the filtered set, which is meant to be
// empty: an import list that came back empty would pass the absence claim over nothing.
export const NAKED_ROOTED_READ_ABSENCE = [
  HEADER,
  'const WORK = path.join(root, "src", "work.mjs");',
  'function importSpecifiers(source) { return [...source.matchAll(/from "([^"]+)"/gu)].map((m) => m[1]); }',
  open,
  '  const specs = importSpecifiers(await readFile(WORK, "utf8"));',
  "  const leaked = specs.filter((s) => /mesh/u.test(s));",
  "  assert.deepEqual(leaked, []);",
  close,
].join("\n");

export const GUARDED_ROOTED_READ_ABSENCE = [
  HEADER,
  'const WORK = path.join(root, "src", "work.mjs");',
  'function importSpecifiers(source) { return [...source.matchAll(/from "([^"]+)"/gu)].map((m) => m[1]); }',
  open,
  '  const specs = importSpecifiers(await readFile(WORK, "utf8"));',
  "  assert.ok(specs.length > 0, `${WORK} was read and has imports`);",
  "  const leaked = specs.filter((s) => /mesh/u.test(s));",
  "  assert.deepEqual(leaked, []);",
  close,
].join("\n");

// THE SILENT SPECIES, 119/ADR-003's named specimen shape: the walk's failure is swallowed into an
// empty list. Reported as its own species, because a floor alone would still leave the swallow.
export const SWALLOWING_CATCH = [
  HEADER,
  open,
  "  let files = [];",
  "  try {",
  '    files = (await readdir(COMMANDS)).filter((n) => n.startsWith("mesh-"));',
  "  } catch {",
  "    files = [];",
  "  }",
  "  assert.ok(files.length > 0, `walked ${COMMANDS}`);",
  "  assert.ok(files.length <= 1);",
  close,
].join("\n");

// THE SAME SILENT SPECIES, pushed far enough down the `try` body that a fixed-window detector stops
// reaching the `catch`. This is the evasion a `[\s\S]{0,600}` bound admits, and it is why the
// detector cuts the `try` block by MATCHING BRACES instead.
export const SWALLOWING_CATCH_DEEP = [
  HEADER,
  open,
  "  let files = [];",
  "  try {",
  ...Array.from({ length: 40 }, (_, i) => `    const filler${i} = "${"x".repeat(48)}";`),
  '    files = (await readdir(COMMANDS)).filter((n) => n.startsWith("mesh-"));',
  "  } catch {",
  "    files = [];",
  "  }",
  "  assert.ok(files.length <= 1);",
  close,
].join("\n");

// A WALK BEHIND A LOCALLY-DECLARED HELPER, which is what de-silencing the real specimen produced.
// A detector that only watched `readdir(` call sites would stop seeing the carrier it was written
// for the moment the walk was extracted into a function.
export const WALKER_BEHIND_A_HELPER = [
  HEADER,
  "async function listMeshCommands(dir) {",
  "  const entries = await readdir(dir, { withFileTypes: true });",
  '  return entries.filter((e) => e.name.startsWith("mesh-")).map((e) => e.name);',
  "}",
  open,
  "  const files = await listMeshCommands(COMMANDS);",
  "  assert.ok(files.length <= 1);",
  close,
].join("\n");

// A TEMP-FIXTURE walk: the same filter shape over a directory the test itself built. NOT a carrier —
// the fixture is the oracle — and a sweep that reported it would be reporting ~1,690 sites of which
// almost all are exact for good reason.
export const FIXTURE_WALK = [
  'import path from "node:path";',
  'import { mkdtemp, readdir } from "node:fs/promises";',
  'import os from "node:os";',
  open,
  '  const dir = await mkdtemp(path.join(os.tmpdir(), "probe-"));',
  '  const files = (await readdir(dir)).filter((n) => n.startsWith("mesh-"));',
  "  assert.ok(files.length <= 1);",
  close,
].join("\n");

// A FIXTURE BODY in a control that ALSO knows its repository root: the test builds a temp directory,
// names it `root` exactly as the file names the repository, and walks it. Measured (chore 120):
// `test/arch/audit/acd-no-staged-control.test.mjs`'s red probe does this, and a name-matched root
// reported its planted `.spec.ts` census as a retyped tree fact. The fixture is the oracle; a test
// body that builds one is not a claim about the tree.
export const FIXTURE_BODY_WALK = [
  HEADER,
  'import { mkdtemp } from "node:fs/promises";',
  'import os from "node:os";',
  open,
  '  const root = await mkdtemp(path.join(os.tmpdir(), "probe-"));',
  '  const files = (await readdir(root)).filter((n) => n.endsWith(".mjs"));',
  "  assert.equal(files.length, 2);",
  '  assert.deepEqual(files, ["a.mjs", "b.mjs"]);',
  close,
].join("\n");

// A RETYPED TREE-WALK EQUALITY behind a helper whose name no caller supplies — the shape that must
// be DERIVED from the file rather than from a hand-passed roster of producer names.
export const RETYPED_EQUALITY = [
  HEADER,
  "async function listMeshCommands(dir) {",
  "  const entries = await readdir(dir, { withFileTypes: true });",
  '  return entries.filter((e) => e.name.endsWith(".mjs")).map((e) => e.name);',
  "}",
  open,
  "  const files = await listMeshCommands(COMMANDS);",
  "  assert.equal(files.length, 12);",
  close,
].join("\n");

// THE SAME RETYPED FACT in the two other spellings an equality takes: over a `Set`'s `.size`, and
// with the literal on the LEFT. A detector that knew only `assert.equal(x.length, N)` would have
// admitted both, and a control converted by swapping the operands would read as fixed.
export const RETYPED_SIZE_EQUALITY = [
  HEADER,
  "async function listMeshCommands(dir) {",
  "  const entries = await readdir(dir, { withFileTypes: true });",
  '  return entries.filter((e) => e.name.endsWith(".mjs")).map((e) => e.name);',
  "}",
  open,
  "  const files = new Set(await listMeshCommands(COMMANDS));",
  "  assert.strictEqual(files.size, 12);",
  close,
].join("\n");

export const RETYPED_REVERSED_EQUALITY = [
  HEADER,
  "async function listMeshCommands(dir) {",
  "  const entries = await readdir(dir, { withFileTypes: true });",
  '  return entries.filter((e) => e.name.endsWith(".mjs")).map((e) => e.name);',
  "}",
  open,
  "  const files = await listMeshCommands(COMMANDS);",
  "  assert.equal(12, files.length);",
  close,
].join("\n");

// A RETYPED MEMBER CENSUS — the register row's own words: "a member census, a list of suites
// importing a module, an import allowlist" — over a walked set. TECH_DEBT item 81's carriers were
// five of these across two suites, and this shape was outside the first widening's line.
export const RETYPED_CENSUS = [
  HEADER,
  open,
  '  const files = (await readdir(COMMANDS)).filter((n) => n.endsWith(".mjs"));',
  '  assert.deepEqual(files, ["mesh-identity.mjs", "mesh-serve.mjs"]);',
  close,
].join("\n");

// …AND THE FORM THAT REPLACES IT, for the commonest census of all — "exactly one, and it is X":
// the floor that keeps the sweep non-vacuous, a declared ceiling carrying its reason, and the
// named member asserted AMONG what was found rather than enumerated as the answer. This must pass.
export const SINGLE_HOME_DERIVED = [
  HEADER,
  open,
  '  const files = (await readdir(COMMANDS)).filter((n) => n.startsWith("mesh-identity"));',
  "  assert.ok(files.length >= 1, `the sweep of ${COMMANDS} found no identity command`);",
  "  assert.ok(files.length <= 1, `one identity command — found: ${files.join(', ')}`);",
  '  assert.equal(files[0], "mesh-identity.mjs");',
  close,
].join("\n");

// THE DERIVATION the criterion asks for — the equality replaced by the property it stood in for,
// asserted over EVERY member, with a floor kept for non-vacuity. This must pass: it is what every
// converted carrier in the tree now looks like.
export const DERIVED_EQUALITY = [
  HEADER,
  "async function listMeshCommands(dir) {",
  "  const entries = await readdir(dir, { withFileTypes: true });",
  '  return entries.filter((e) => e.name.endsWith(".mjs")).map((e) => e.name);',
  "}",
  open,
  "  const files = await listMeshCommands(COMMANDS);",
  "  assert.ok(files.length >= 1, `the sweep of ${COMMANDS} found no .mjs module`);",
  '  for (const file of files) assert.ok(file.endsWith(".mjs"), `${file}: every member is a module`);',
  close,
].join("\n");

// A RED PROBE OVER THE REAL TREE PLUS A PLANT: the walked set is handed to a checker together with
// a planted member, and exactly one offender is expected. A CALL is not a narrowing — it may add
// the plant — so the checker's result is not the walked set, and the equality is exact for good
// reason. Measured (chore 120): following bindings through calls reported ~50 of these as retyped
// facts; this plant is why derivation stops at a call. This must pass.
export const PLANT_PROBE_EQUALITY = [
  HEADER,
  'function offenders(files) { return files.filter((n) => n.startsWith("planted-")); }',
  open,
  "  const files = await readdir(COMMANDS);",
  "  assert.ok(files.length > 0, `walked ${COMMANDS}`);",
  '  const found = offenders([...files, "planted-one.mjs"]);',
  "  assert.equal(found.length, 1);",
  close,
].join("\n");

// AN EXPRESSION-BODIED ARROW IS NOT A WALKER because the next `{` in the file happens to open a
// block that reads the tree. Measured 2026-09-10: `test/arch/planning/acd-tunable-set-is-the-registry`
// declares `const arbiterDeclarations = (model) => model.nodes.filter(…)` above its tests, and the
// detector cut that arrow's "body" from the first `{` after its parameter list — which was the
// `archTests` array — so a pure filter over an in-memory model was reported as a rooted walk, and a
// legitimate red-probe equality below it was reported as a retyped tree fact. This must pass.
export const EXPRESSION_ARROW_NOT_A_WALKER = [
  HEADER,
  'const pick = (model) => model.nodes.filter((node) => node.kind === "arbiter");',
  open,
  "  const listing = await readdir(COMMANDS);",
  "  assert.ok(listing.length > 0, `walked ${COMMANDS}`);",
  '  const picked = pick({ nodes: [{ kind: "arbiter" }] });',
  "  assert.equal(picked.length, 1);",
  close,
].join("\n");

// A DYNAMIC IMPORT IS NOT A ROOT: `import.meta.url` inside `new URL(…)` resolves a sibling MODULE,
// and the module's exports are not the tree. Measured (chore 120): a `const mod = await import(new
// URL(…, import.meta.url))` was read as a root binding, so a suite's "exactly one runner array"
// claim over its exports was reported as a retyped tree count. This must pass.
export const DYNAMIC_IMPORT_IS_NOT_A_ROOT = [
  HEADER,
  open,
  '  const mod = await import(new URL("./sibling.mjs", import.meta.url).href);',
  "  const arrays = Object.values(mod).filter((value) => Array.isArray(value));",
  "  assert.equal(arrays.length, 1);",
  close,
].join("\n");
