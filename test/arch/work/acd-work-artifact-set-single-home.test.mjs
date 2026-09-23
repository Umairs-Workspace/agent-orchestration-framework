// Fitness function: acd-work-artifact-set-single-home (milestone 43 / ADR-007) —
//
//   "The streamed/requestable artifact set becomes a bounded two-kind MANIFEST living in
//    ONE module; WORK_ITEM_DOC_FILES is DERIVED from it — never a second literal list —
//    so the streamed set and the requestable set can never drift."
//
// This invariant is not new; it is the one the existing constant's own comment already
// states (src/global-work-store.mjs:14-16, verbatim): "The record docs a board/CLI face
// may request by NAME (work:doc's input contract) and therefore exactly the doc bodies a
// worker streams for its active worktree — ONE home for the set … so the streamed set and
// the requestable set can never drift." ADR-007 WIDENS the set (tasks/*.feature,
// ARCHITECTURE.md, DESIGN.md, RESEARCH.md, STATE.md) and MOVES it to a pure-leaf module
// (src/work/artifacts.mjs, 0 imports) so its three consumers need not travel through
// global-work-store.mjs's 6-module import closure to read a constant table. The widening
// and the move are exactly the two moments a second literal list gets written by
// accident. This guard makes that a CI failure instead of a drift nobody notices until a
// face asks for a name the worker never streamed.
//
// Scope note (deliberate): the guard is keyed on the named CONSTANT, not on the record-doc
// FILENAMES. Several modules legitimately list record-doc names for unrelated purposes —
// work-doctor.mjs's CONVENTION_DOCS, import/recovery.mjs's RECORD_DOC_NAMES,
// import/materialize.mjs's RETROSPECTIVE_FILE. Those are different sets answering
// different questions; flagging them would be a false positive that teaches people to
// ignore this test.
//
// Proofs:
//  1. GREEN — the artifact-set constant is DECLARED in exactly one module in src/; every
//     other mention is an import or a re-export.
//  2. GREEN — the declaring module actually declares the four record docs (non-vacuous:
//     the guard is watching a real set, not an empty name).
//  Self-check (m03 non-vacuous): a planted second declaration trips the detector, and an
//  import / a re-export does not.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC = path.join(repoRoot, "src");

// FF-7008's per-ADR-sibling detector (milestone 70 / story 03, tightened at 70/05's
// structural review). A sibling artifact is either a per-ADR FILE (`ADR-009.md`,
// `ADR-${id}.md`) or a per-ADR DIRECTORY, and a directory shows up one of two ways: inside
// a path literal that carries its own separator, or as a bare segment handed to
// join/resolve. Both alternatives are ANCHORED, and deliberately so:
//
//   - without the string-literal anchor the pattern rejected a regex literal (`/ADRS/u`), a
//     URL and a line of prose — and it bent this repo's own source comments to work around
//     itself before the anchor was added;
//   - a bare quoted `"adrs"` cannot be the anchor for the segment case either, because
//     `adrs:` is the STORY-FRONTMATTER KEY 70/03 introduced (ADR-006), parsed in the very
//     module this guard reads. `const ADRS_KEY = "adrs";` and `frontmatter["adrs"]` are
//     first-class concepts of this milestone and are likelier to appear here than the
//     sibling directory the guard hunts. So the segment case is anchored to the call that
//     makes it a path.
//
// A false positive here is a red run with a confident message about the wrong thing, which
// is how a guard comes to shape source prose instead of guarding it. Its own self-check —
// both directions — is the test at the bottom of this file.
const SIBLING_ADR_ARTIFACT = /ADR-\$?\{?\w+\}?\.md|["'`][^"'`]*adrs\/|(?:path\.)?(?:join|resolve)\([^)]*["'`]adrs["'`]/iu;

// The set's names, before and after ADR-007's widening — either is the one home.
const SET_NAMES = ["WORK_ITEM_DOC_FILES", "WORK_ITEM_ARTIFACTS"];

// `stripComments` comes from its ONE home. The local copy this replaces lacked that
// module's `[^:]` guard, which exists precisely so a `http://` inside a comment is not
// truncated to `http:` — pre-existing here, and cheap to fold while this file is open.
import { stripComments } from "../../support/source-slice.mjs";

// A LITERAL DECLARATION (`export const X = {` / `const X = [`), never an import and
// never a re-export (`export { X } from "…"` / `export const Y = X`). NOTE what this
// deliberately does NOT match: a DERIVED declaration (`= Object.freeze(Object.fromEntries(`),
// because "is there a second literal list" is precisely the question it answers.
// Whether the derived view is genuinely derived is a different question, asked by
// `declarationInitializer` below — ADR-013/C9, after this guard was measured blind to
// a planted stale literal declared beside the manifest in the SAME module.
function declares(code, name) {
  const decl = new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?const\\s+${name}\\s*=\\s*(?:Object\\.freeze\\s*\\(\\s*)?[[{]`);
  return decl.test(code);
}

// The text of a `const X = …` initializer, up to the next top-level statement — enough
// to ask what the value is BUILT FROM, which is the whole of ADR-007's "one definition,
// one derived compatibility view — never two literal lists".
function declarationInitializer(code, name) {
  const match = new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?const\\s+${name}\\s*=\\s*`).exec(code);
  if (match == null) return null;
  const rest = code.slice(match.index + match[0].length);
  const end = rest.search(/\n(?:export|const|function|async|class)\b/);
  return end < 0 ? rest : rest.slice(0, end);
}

// DERIVED, not literal: the initializer must NAME the manifest and must not open with a
// literal `[`/`{`. This is the clause a stale hand-maintained copy trips.
function derivationProblems(initializer) {
  const problems = [];
  if (initializer == null) return ["WORK_ITEM_DOC_FILES is not declared in the manifest module at all"];
  if (!/\bWORK_ITEM_ARTIFACTS\b/.test(initializer)) {
    problems.push("WORK_ITEM_DOC_FILES' initializer does not reference WORK_ITEM_ARTIFACTS — it is not derived from the manifest");
  }
  if (/^\s*(?:Object\.freeze\s*\(\s*)?[[{]/.test(initializer)) {
    problems.push("WORK_ITEM_DOC_FILES is an object/array LITERAL — ADR-007 forbids a second literal list, however faithful it looks today");
  }
  return problems;
}

async function mjsFilesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await mjsFilesUnder(full)));
    else if (entry.name.endsWith(".mjs")) out.push(full);
  }
  return out;
}

export const archTests = [
  {
    name: "arch/43 ADR-007 (acd-work-artifact-set-single-home): the artifact-set constant is DECLARED in exactly ONE module in src/ — the streamed set and the requestable set cannot drift",
    run: async () => {
      const declarers = new Map();
      for (const file of await mjsFilesUnder(SRC)) {
        const code = stripComments(await readFile(file, "utf8"));
        for (const name of SET_NAMES) {
          if (declares(code, name)) {
            const list = declarers.get(name) ?? [];
            list.push(path.relative(repoRoot, file));
            declarers.set(name, list);
          }
        }
      }
      const declared = [...declarers.entries()];
      assert.ok(declared.length > 0, "the artifact set is declared somewhere (non-vacuous)");
      const problems = declared
        .filter(([, files]) => files.length !== 1)
        .map(([name, files]) => `${name} declared in ${files.length} modules: ${files.join(", ")}`);
      assert.deepEqual(problems, [], `artifact-set drift: ${JSON.stringify(problems)}`);

      // …and if BOTH names exist, they must be in the same module (the derived
      // compatibility view lives beside its source, never as a second literal list).
      if (declarers.size === 2) {
        const [first, second] = [...declarers.values()];
        assert.deepEqual(
          first,
          second,
          "WORK_ITEM_DOC_FILES must be DERIVED from WORK_ITEM_ARTIFACTS in the same module (ADR-007), never a second literal list",
        );
      }
    },
  },
  {
    name: "arch/43 ADR-007 (acd-work-artifact-set-single-home): the declaring module really carries the record-doc set (the guard watches a real set, not an empty name)",
    run: async () => {
      let carrier = null;
      for (const file of await mjsFilesUnder(SRC)) {
        const code = stripComments(await readFile(file, "utf8"));
        if (SET_NAMES.some((name) => declares(code, name))) {
          carrier = code;
          break;
        }
      }
      assert.ok(carrier != null, "found the declaring module");
      for (const doc of ["SPEC.md", "STORY.md", "VERIFICATION.md", "RETROSPECTIVE.md"]) {
        assert.ok(carrier.includes(doc), `the artifact set still names ${doc}`);
      }
    },
  },
  {
    // ADR-013/C9 — THE CLAUSE THIS GUARD WAS MISSING. Measured by QA at 43/03's review:
    // a stale literal `WORK_ITEM_DOC_FILES = { SPEC, STORY, VERIFICATION, RETROSPECTIVE }`
    // planted in the SAME module as the manifest passed the behavioural suite AND every
    // proof above — because "declared in exactly one module" is satisfied by two
    // constants sitting side by side, and because the real derived form
    // (`Object.freeze(Object.fromEntries(`) is not even matched by `declares()`, so the
    // same-module branch never ran. ADR-007's invariant is not "one file"; it is
    // "ONE DEFINITION, one DERIVED view — never two literal lists". That is a property
    // of the initializer, and this is the clause that reads it.
    name: "arch/43 ADR-007 + ADR-013 (acd-work-artifact-set-single-home): WORK_ITEM_DOC_FILES is genuinely DERIVED — its initializer names WORK_ITEM_ARTIFACTS and is not a literal",
    run: async () => {
      let carrier = null;
      let carrierPath = null;
      for (const file of await mjsFilesUnder(SRC)) {
        const code = stripComments(await readFile(file, "utf8"));
        if (declares(code, "WORK_ITEM_ARTIFACTS")) {
          carrier = code;
          carrierPath = path.relative(repoRoot, file);
          break;
        }
      }
      assert.ok(carrier != null, "found the module declaring the manifest");
      const problems = derivationProblems(declarationInitializer(carrier, "WORK_ITEM_DOC_FILES"));
      assert.deepEqual(problems, [], `${carrierPath}: ${JSON.stringify(problems)}`);

      // Non-vacuous, and the two halves are asserted separately so a future refactor
      // cannot satisfy this by deleting the compatibility view instead of deriving it.
      const initializer = declarationInitializer(carrier, "WORK_ITEM_DOC_FILES");
      assert.match(initializer, /WORK_ITEM_ARTIFACTS/, "the real derived view really does read the manifest");
      const { WORK_ITEM_ARTIFACTS, WORK_ITEM_DOC_FILES } = await import("../../../src/work/artifacts.mjs");
      assert.deepEqual(
        Object.entries(WORK_ITEM_DOC_FILES),
        WORK_ITEM_ARTIFACTS.filter((entry) => entry.file != null).map((entry) => [entry.name, entry.file]),
        "…and the derived value equals the manifest's file-kind entries, in manifest order (a stale copy would diverge here)",
      );
    },
  },
  {
    name: "arch/43 ADR-007 + ADR-013 (acd-work-artifact-set-single-home): self-check — the derivation detector fires on QA's planted stale literal and spares the real derived form",
    run: async () => {
      const real = "export const WORK_ITEM_DOC_FILES = Object.freeze(Object.fromEntries(\n  WORK_ITEM_ARTIFACTS.filter((e) => e.file != null).map((e) => [e.name, e.file]),\n));\n";
      assert.deepEqual(derivationProblems(declarationInitializer(real, "WORK_ITEM_DOC_FILES")), [], "the real derived form passes");

      // QA's plant, verbatim in shape: a stale hand-maintained copy of the four names,
      // declared beside the manifest in the same module.
      const planted = 'export const WORK_ITEM_DOC_FILES = Object.freeze({\n  SPEC: "SPEC.md",\n  STORY: "STORY.md",\n  VERIFICATION: "VERIFICATION.md",\n  RETROSPECTIVE: "RETROSPECTIVE.md",\n});\n';
      assert.ok(derivationProblems(declarationInitializer(planted, "WORK_ITEM_DOC_FILES")).length >= 2, "a planted stale literal trips BOTH clauses (not derived, and a literal)");

      const bareLiteral = 'const WORK_ITEM_DOC_FILES = { SPEC: "SPEC.md" };\n';
      assert.ok(derivationProblems(declarationInitializer(bareLiteral, "WORK_ITEM_DOC_FILES")).length >= 2, "an unfrozen literal trips it too");

      assert.deepEqual(
        derivationProblems(declarationInitializer('import { x } from "./y.mjs";\n', "WORK_ITEM_DOC_FILES")),
        ["WORK_ITEM_DOC_FILES is not declared in the manifest module at all"],
        "a module with no declaration is reported as such, never silently passed",
      );
    },
  },
  {
    name: "arch/43 ADR-007 (acd-work-artifact-set-single-home): self-check — a planted second declaration trips the detector; an import and a re-export do not",
    run: async () => {
      assert.ok(declares("export const WORK_ITEM_DOC_FILES = {\n  SPEC: \"SPEC.md\",\n};", "WORK_ITEM_DOC_FILES"), "the detector catches a real object declaration");
      assert.ok(declares("const WORK_ITEM_ARTIFACTS = [\n  { name: \"SPEC\", file: \"SPEC.md\" },\n];", "WORK_ITEM_ARTIFACTS"), "the detector catches an array declaration");
      assert.ok(declares("export const WORK_ITEM_ARTIFACTS = Object.freeze([{ name: \"SPEC\" }]);", "WORK_ITEM_ARTIFACTS"), "the detector catches a frozen declaration");
      assert.ok(
        !declares('import { WORK_ITEM_DOC_FILES } from "../global-work-store.mjs";', "WORK_ITEM_DOC_FILES"),
        "the detector does NOT flag an import (commands/doc.mjs's legitimate consumption)",
      );
      assert.ok(
        !declares('export { WORK_ITEM_DOC_FILES } from "./work/artifacts.mjs";', "WORK_ITEM_DOC_FILES"),
        "the detector does NOT flag a re-export (the ADR-007 compatibility view)",
      );
      assert.ok(
        !declares("const DOC_FILES = WORK_ITEM_DOC_FILES;", "WORK_ITEM_DOC_FILES"),
        "the detector does NOT flag an alias binding (commands/doc.mjs:27)",
      );
    },
  },
  {
    name: "arch/70 FF-7008 (acd-work-artifact-set-single-home, extended): ARCHITECTURE.md stays one artifact, owns the declaring register, and the pure ADR extractor slices that one text instead of naming sibling files",
    run: async () => {
      const { WORK_ITEM_ARTIFACTS } = await import("../../../src/work/artifacts.mjs");
      const { REGISTER_BLOCKS } = await import("../../../src/declared-id.mjs");
      const { extractAdrBlocks } = await import("../../../src/phase-brief.mjs");
      assert.equal(WORK_ITEM_ARTIFACTS.filter((entry) => entry.file === "ARCHITECTURE.md").length, 1, "exactly one architecture artifact is enumerated");
      assert.deepEqual(
        REGISTER_BLOCKS.filter((entry) => entry.kind === "declaring" && entry.heading === "fitness functions").map((entry) => entry.file),
        ["ARCHITECTURE.md"],
        "the fitness declaration register remains in that one artifact",
      );
      const source = "## ADR-001 — one\nONE\n## ADR-002 — two\nTWO\n";
      assert.deepEqual(extractAdrBlocks(source, ["ADR-002"]).blocks.map((block) => block.text), ["## ADR-002 — two\nTWO\n"], "the extractor consumes the single document's text");
      const compilerSource = await readFile(path.join(SRC, "phase-brief.mjs"), "utf8");
      assert.doesNotMatch(compilerSource, SIBLING_ADR_ARTIFACT, "the extractor expects no sibling per-ADR file or directory");
    },
  },
  {
    name: "arch/70 FF-7008 (acd-work-artifact-set-single-home, extended): self-check — a planted per-ADR sibling file or directory trips the detector; a regex literal, prose, and the `adrs:` frontmatter key this milestone introduced do not",
    run: () => {
      // A guard whose pattern cannot be shown to FAIL is not a guard, and a pattern that
      // fires on things that are not the defect is worse than none.
      for (const planted of [
        'const slice = await readFile(path.join(dir, "adrs", id));',
        "const p = join(milestoneDir, 'adrs', id);",
        "const p = resolve(root, `adrs`, x);",
        'const p = "wiki/work/70_milestone_warm-start/adrs/ADR-009.md";',
        "const p = `${milestoneDir}/adrs/${id}`;",
        "const p = 'adrs/ADR-001';",
        'const file = "ADR-009.md";',
        "const file = `ADR-${id}.md`;",
      ]) {
        assert.match(planted, SIBLING_ADR_ARTIFACT, `a planted per-ADR sibling artifact trips the detector (${planted})`);
      }
      for (const innocent of [
        "const x = /ADRS/u;",
        "const unresolved = /^UNRESOLVED DECLARED ADRS:/;",
        "// see wiki/adrs/ for more",
        'const heading = title.startsWith("## ADR-");',
        // …and the `adrs:` frontmatter key 70/03 introduced (ADR-006), which is parsed in
        // the very module this guard reads. Flagging it would make the guard fire on the
        // milestone's own vocabulary.
        'const ADRS_KEY = "adrs";',
        'const declared = frontmatter["adrs"];',
        "const line = block.match(/^adrs:\s*(.*)$/m);",
      ]) {
        assert.doesNotMatch(innocent, SIBLING_ADR_ARTIFACT, `the detector does NOT fire on ${innocent}`);
      }
    },
  },
  // FF-13305 (milestone 133 / ADR-007 §2) — DIAGRAMS RIDE THE ONE MANIFEST: exactly one `dir:
  // "diagrams"` entry, SVG only, one level deep, appended after TASKS with every earlier entry kept.
  {
    name: "arch/133 FF-13305 (acd-work-artifact-set-single-home, extended): the manifest holds one diagrams entry, SVG only, last, and the earlier entries are unchanged",
    run: async () => {
      const { WORK_ITEM_ARTIFACTS, WORK_ITEM_DOC_FILES, artifactForRelativePath } = await import("../../../src/work/artifacts.mjs");
      const diagrams = WORK_ITEM_ARTIFACTS.filter((entry) => entry.dir === "diagrams");
      assert.equal(diagrams.length, 1, "exactly one entry has dir: diagrams");
      assert.deepEqual({ ...diagrams[0] }, { name: "DIAGRAMS", dir: "diagrams", ext: ".svg" });
      assert.equal(WORK_ITEM_ARTIFACTS.at(-1), diagrams[0], "it is the last entry");
      assert.equal(WORK_ITEM_ARTIFACTS.at(-2).name, "TASKS", "…after TASKS, whose place is unchanged");
      assert.equal(Object.values(WORK_ITEM_DOC_FILES).some((file) => file.includes("diagrams")), false, "WORK_ITEM_DOC_FILES carries no diagram — the derived view is file-kind only");
      const rows = [
        ["diagrams/ADR-002-seam.svg", { name: "DIAGRAMS", member: "ADR-002-seam.svg" }],
        ["diagrams\\ADR-002-seam.svg", { name: "DIAGRAMS", member: "ADR-002-seam.svg" }],
        ["diagrams/ADR-002-seam.html", null],
        ["diagrams/ADR-002-seam.png", null],
        ["diagrams/old/ADR-002-seam.svg", null],
        ["diagrams/ADR-002-seam.SVG", null],
        ["tasks/00_a.feature", { name: "TASKS", member: "00_a.feature" }],
      ];
      for (const [relPath, answer] of rows) assert.deepEqual(artifactForRelativePath(relPath), answer, relPath);
    },
  },
];
