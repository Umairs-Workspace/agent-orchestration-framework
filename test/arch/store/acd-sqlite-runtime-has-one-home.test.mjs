// Fitness function FF-12608 (milestone 126 / ADR-008) — "The SQLite runtime has ONE import
// home, its warning filter is targeted, and no blanket suppression exists anywhere."
//
// Three claims:
//
//   1. `import("node:sqlite")` occurs in EXACTLY ONE module under `src/`, and both callers
//      reach it by import — asserted by import, not by absence.
//   2. The leaf installs its `emitWarning` wrap, restores the original in a `finally`, and
//      swallows only a warning whose type is `ExperimentalWarning` AND whose message names
//      SQLite. (The BEHAVIOUR is driven in-process by `test/store/sqlite-runtime.test.mjs`;
//      what lands here is the structural half — the `finally` above all, because a wrap with
//      no `finally` leaves the filter installed for the life of the process after a throwing
//      import, and nothing else would notice.)
//   3. NO BLANKET SUPPRESSION, TREE-WIDE: no `--no-warnings`, no `NODE_NO_WARNINGS`, no
//      `--disable-warning` and no `NODE_OPTIONS` warning flag under `src/`, `bin/`,
//      `scripts/`, `src/bundle/` or `package.json`.
//
// WHY `test/` IS DELIBERATELY EXCLUDED. Sixty files there already set `NODE_NO_WARNINGS` on
// a CLI child's env, and three also pass `--no-warnings` — a harness suppressing its own
// child's warnings is a legitimate choice this ADR has no business forbidding. The
// consequence is stated rather than hidden: every CLI integration test is blind to this
// warning by construction, so reverting the leaf reds none of them. That is exactly why the
// behavioural suite drives its real-runtime leg in a child whose environment it BUILDS.
//
// HOW A FILE IS READ BEFORE IT IS JUDGED. `stripComments` is a JAVASCRIPT scanner with no
// model of Markdown — measured, it truncates a prose `https://nodejs.org/…` at the `//`, and
// it reads a fenced block and the paragraph beside it identically. So: a `.mjs`/`.json`
// file is read through `stripComments`, and a `.md` file is read as its FENCED CODE BLOCKS
// ONLY. Prose outside every fence is not swept, which is what lets a bundled command
// FORBID a flag in words without becoming an offender for naming it.
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments, functionBody } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LEAF = path.join(repoRoot, "src", "sqlite-runtime.mjs");

// The roots a blanket suppression may not appear in. `test/` is NOT among them, by decision.
const SWEPT_ROOTS = ["src", "bin", "scripts"];
const SWEPT_FILES = ["package.json"];

// Every form of the blanket, including the env-var twin a flag-only sweep would miss.
const BLANKET_PATTERNS = [
  { name: "--no-warnings", pattern: /--no-warnings\b/ },
  { name: "--disable-warning", pattern: /--disable-warning\b/ },
  { name: "NODE_NO_WARNINGS", pattern: /\bNODE_NO_WARNINGS\b/ },
  // `NODE_OPTIONS` is only an offender when it carries a WARNING flag — the repo is free to
  // set `--max-old-space-size` through it.
  { name: "NODE_OPTIONS warning flag", pattern: /NODE_OPTIONS[^\n]*(?:--no-warnings|--disable-warning)/ },
];

const SWEPT_EXTENSIONS = new Set([".mjs", ".js", ".cjs", ".json", ".jsonc", ".md"]);

/** A file's SWEPT text: JS through `stripComments`, Markdown as its fenced blocks only. */
export function sweptText(filePath, source) {
  if (path.extname(filePath) === ".md") {
    return [...source.matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)].map((match) => match[1]).join("\n");
  }
  return stripComments(source);
}

/** Which blanket suppressions a file's swept text carries. */
export function blanketHits(filePath, source) {
  const text = sweptText(filePath, source);
  return BLANKET_PATTERNS.filter((entry) => entry.pattern.test(text)).map((entry) => entry.name);
}

async function collectFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "target" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collectFiles(full)));
    else if (entry.isFile() && SWEPT_EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

async function sourceFilesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await sourceFilesUnder(full)));
    else if (entry.isFile() && /\.(mjs|js|cjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

export const archTests = [
  {
    name: "arch/126 FF-12608: `node:sqlite` is imported in EXACTLY ONE module under src/, and both callers reach it BY IMPORT rather than by absence",
    run: async () => {
      const files = await sourceFilesUnder(path.join(repoRoot, "src"));
      assert.ok(files.length > 0, "src/ was scanned (non-vacuous)");

      const importers = [];
      for (const file of files) {
        const source = stripComments(await readFile(file, "utf8"));
        if (/import\(\s*["']node:sqlite["']\s*\)/.test(source) || /from\s+["']node:sqlite["']/.test(source)) {
          importers.push(path.relative(repoRoot, file));
        }
      }
      assert.deepEqual(
        importers,
        [path.relative(repoRoot, LEAF)],
        `exactly one module imports node:sqlite, got: ${JSON.stringify(importers)}`,
      );

      // BY IMPORT, not by absence: both callers actually reach the leaf. A third caller that
      // stopped importing it and re-rolled its own body would satisfy an absence check.
      for (const caller of ["src/effects/journal.mjs", "src/global-work-store.mjs"]) {
        const source = stripComments(await readFile(path.join(repoRoot, caller), "utf8"));
        assert.match(source, /import \{ importSqliteRuntime \} from "[^"]*sqlite-runtime\.mjs"/, `${caller} imports the leaf`);
        assert.match(source, /await importSqliteRuntime\(options\)/, `${caller} resolves the runtime through it, forwarding the options it was handed`);
      }

      // Each caller keeps its OWN refusal and its OWN DatabaseSync check — the leaf decides
      // no policy, so neither caller's behaviour moves (ADR-008 §2).
      const store = stripComments(await readFile(path.join(repoRoot, "src", "global-work-store.mjs"), "utf8"));
      const journal = stripComments(await readFile(path.join(repoRoot, "src", "effects", "journal.mjs"), "utf8"));
      for (const [name, source] of [["global-work-store", store], ["journal", journal]]) {
        const body = functionBody(source, "async function resolveSqlite");
        assert.notEqual(body, null, `${name}'s resolveSqlite region was found`);
        assert.match(body, /typeof sqlite\.DatabaseSync !== "function"/, `${name} keeps its own DatabaseSync check`);
        assert.match(body, /sqlite-unavailable/, `${name} keeps its own coded refusal`);
      }
      assert.match(functionBody(store, "async function resolveSqlite"), /options\.sqlite === false/, "the store keeps its forced-unavailable");

      // …and the leaf itself decides none of it.
      const leaf = stripComments(await readFile(LEAF, "utf8"));
      assert.doesNotMatch(leaf, /sqlite-unavailable/, "the leaf raises neither caller's refusal");
      assert.doesNotMatch(leaf, /DatabaseSync/, "and validates nothing — a leaf that did would collapse the two callers' cases onto one");
    },
  },
  {
    name: "arch/126 FF-12608: the filter is installed around the import and RESTORED IN A `finally`, and its predicate reads both the type and the message",
    run: async () => {
      const leaf = stripComments(await readFile(LEAF, "utf8"));
      const body = functionBody(leaf, "export async function importSqliteRuntime");
      assert.notEqual(body, null, "the leaf's region was found");

      assert.match(body, /process\.emitWarning = /, "it installs a wrap");
      assert.match(body, /finally\s*\{[^}]*process\.emitWarning = original/, "and RESTORES the original in a `finally` — without it a throwing import leaves the filter installed for the life of the process");
      assert.match(body, /original\.apply\(this, args\)/, "a passed warning is forwarded UNCHANGED — a rebuilt call would strip its code and ctor");

      // The predicate is targeted: BOTH the type and the message decide. A predicate on
      // `ExperimentalWarning` alone swallows every experimental warning raised during the
      // import, which is the blanket wearing a smaller coat.
      const predicate = functionBody(leaf, "function isSqliteExperimentalWarning");
      assert.notEqual(predicate, null, "the predicate's region was found");
      assert.match(predicate, /ExperimentalWarning/, "it reads the type");
      assert.match(predicate, /\/SQLite\//, "and the message");
      assert.match(predicate, /instanceof Error/, "and handles the Error form, whose `.name` is the type");

      // The wrap exists only for the duration of a call — nothing is installed at module load.
      const outsideTheFunction = leaf.replace(body, "");
      assert.doesNotMatch(outsideTheFunction, /process\.emitWarning\s*=/, "loading the module installs nothing");
    },
  },
  {
    name: "arch/126 FF-12608: NO blanket suppression under src/, bin/, scripts/, src/bundle/ or package.json — flags AND the NODE_NO_WARNINGS env twin",
    run: async () => {
      const files = [];
      for (const root of SWEPT_ROOTS) files.push(...(await collectFiles(path.join(repoRoot, root))));
      for (const file of SWEPT_FILES) {
        const full = path.join(repoRoot, file);
        try {
          if ((await stat(full)).isFile()) files.push(full);
        } catch { /* absent is fine */ }
      }
      assert.ok(files.length > 0, "the swept roots were actually walked (non-vacuous)");

      // The `.md` leg is not vacuous on the real tree — bundle files carry fenced blocks.
      const fenced = [];
      for (const file of files.filter((f) => path.extname(f) === ".md")) {
        if (sweptText(file, await readFile(file, "utf8")).trim().length > 0) fenced.push(file);
      }
      assert.ok(fenced.length > 0, `at least one swept .md carries a fenced block, so the markdown leg reads something (found ${fenced.length})`);

      const offenders = [];
      for (const file of files) {
        const hits = blanketHits(file, await readFile(file, "utf8"));
        if (hits.length > 0) offenders.push({ file: path.relative(repoRoot, file), hits });
      }
      assert.deepEqual(offenders, [], `no blanket suppression in the swept roots, got: ${JSON.stringify(offenders)}`);
    },
  },
  {
    name: "arch/126 FF-12608: self-check — the sweep decides what a blanket suppression is, over every row of the contract's table (non-vacuous)",
    run: async () => {
      const rows = [
        { text: 'spawn(node, ["--no-warnings", "x"]);', file: "scripts/x.mjs", offender: true },
        { text: 'const argv = ["--disable-warning=ExperimentalWarning"];', file: "bin/x.mjs", offender: true },
        { text: 'const argv = ["--disable-warning", "DeprecationWarning"];', file: "bin/x.mjs", offender: true },
        { text: '{ "scripts": { "t": "NODE_OPTIONS=--no-warnings node x.mjs" } }', file: "package.json", offender: true },
        { text: 'env.NODE_NO_WARNINGS = "1";', file: "src/x.mjs", offender: true },
        { text: 'env.NODE_OPTIONS = "--max-old-space-size=4096";', file: "scripts/x.mjs", offender: false },
        { text: '// never pass --no-warnings here\nconst x = 1;', file: "src/x.mjs", offender: false },
        { text: "Run it:\n\n```sh\nnode --no-warnings x.mjs\n```\n", file: "src/bundle/commands/x.md", offender: true },
        { text: "Never add --no-warnings to this command; it hides deprecations.\n", file: "src/bundle/commands/x.md", offender: false },
      ];

      for (const row of rows) {
        const hits = blanketHits(row.file, row.text);
        assert.equal(
          hits.length > 0,
          row.offender,
          `${row.file} carrying ${JSON.stringify(row.text.slice(0, 46))} is ${row.offender ? "an offender" : "not an offender"} — got ${JSON.stringify(hits)}`,
        );
      }

      // `test/x.test.mjs` is not an offender because `test/` is not swept at all — asserted
      // as a property of the ROOT list rather than of the detector, which is where the
      // decision actually lives.
      assert.ok(!SWEPT_ROOTS.includes("test"), "test/ is deliberately outside the swept roots");
      assert.ok(
        blanketHits("test/x.test.mjs", 'env.NODE_NO_WARNINGS = "1";').length > 0,
        "…and the detector WOULD fire on it, so the exclusion is the root list's doing and not an accident of the pattern",
      );
    },
  },
];
