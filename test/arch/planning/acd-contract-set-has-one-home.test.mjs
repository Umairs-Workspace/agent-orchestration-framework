// FF-12403 (124/ADR-003) — ONE HOME FOR THE CONTRACT SET, DIRECTORY INTENT IS AUTHORED, AND THE
// WAVE CHECK ONLY EVER TIGHTENS.
//
// Three claims that are one claim. `src/story-contract.mjs` is a pure leaf — `node:path` and
// nothing else — and that purity is load-bearing rather than tidy: the moment the coverage
// predicate reaches for `stat` to ask whether a declared entry is a directory, the answer starts
// depending on whether the path exists YET, which is precisely when a write-set collision matters
// most. So directory intent is AUTHORED: an entry covers another when the two are equal, or when
// the first was written with a trailing `/` and the second sits beneath it. Measured before it was
// decided — 8 of this stream's declared entries carry a trailing slash and 0 of the rest resolve to
// a real on-disk directory — so the lexical rule reproduces a disk-probing reading of this stream
// EXACTLY, for no filesystem access at all.
//
// `src/ready-wave.mjs` then ADOPTS that predicate, and the adoption is a bug fix wearing a
// refactor's clothes: its collision test was exact-string, and `path.relative` had already stripped
// the authored slash, so a story declaring `files: [src/commands/]` and a sibling declaring
// `src/commands/test.mjs` were read as disjoint and dispatched into ONE wave, where they collide on
// disk. The trap in fixing it is DIRECTION. A parallelism gate that quietly WIDENED would be
// invisible until two builders write the same file, so the tightening is asserted as a superset
// over a generated corpus rather than argued from the shape of the code.
//
// THE FOUR LEGS, and each is falsifiable:
//   1. THE LEAF REACHES NOTHING NEW — zero project imports, no `node:fs`, no `readFile`/`stat`, no
//      `process.cwd`. `96/FF-9602` leg 1's claim, re-asserted HERE because this milestone is the
//      one that would have broken it.
//   2. THE CONSUMER HOLDS NO SECOND RULE — `ready-wave` resolves no declared key of its own and
//      carries no second coverage helper, no `Set` intersection over raw declared strings, and no
//      re-implemented containment.
//   3. COVERAGE IS LEXICAL — asserted over a table of pairs that includes the four real milestone
//      119 edges, and asserted NOT to consult the disk (every row is decided against a project root
//      that exists nowhere).
//   4. THE ADOPTION IS A STRICT TIGHTENING — over a generated corpus of declared sets, every pair
//      colliding under the exact-string rule still collides under coverage.
//
// RED PROBES (recorded in VERIFICATION.md): author a second `covers` helper inside
// `ready-wave.mjs` and leg 2 fails naming it; make coverage a `startsWith` without the authored
// slash and leg 3 fails on `src/commands-old.mjs`. Both are DRIVEN below rather than described,
// because a red probe nobody ran is a claim about a control's behaviour with no witness.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  contractSetCovers,
  declaresDirectory,
  resolveDeclaredSet,
  resolveStoryContractPath,
} from "../../../src/story-contract.mjs";
import { listItems } from "../../../src/work.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const LEAF = "src/story-contract.mjs";
const CONSUMER = "src/ready-wave.mjs";

// Comment-stripped, always. Every leg below is a claim about what the module DOES, and a comment
// naming the thing it refuses would otherwise fail it — which is how a control teaches the next
// author to stop explaining themselves.
const sourceOf = async (relative) => stripComments(await readFile(path.join(repoRoot, relative), "utf8"));

// A project root that is on no disk. Every coverage row is decided against it, so a predicate that
// had reached for `stat` would answer differently here than on a tree where these paths are real.
const NOWHERE_ROOT = path.join(repoRoot, "no-such-root-ff12403");
const NOWHERE_AT = {
  storyDir: path.join(NOWHERE_ROOT, "wiki", "work", "00_milestone_m", "stories", "00_story_s"),
  projectRoot: NOWHERE_ROOT,
};

// A declared set built through the ONE HOME rather than spelled here: a fixture that hand-rolled
// `{ path, directory }` would keep passing on the day the resolver's answer moved.
const setOf = (...authored) => resolveDeclaredSet(`---\nfiles: [${authored.join(", ")}]\n---\n`, "files", NOWHERE_AT).entries;
const resolvedPath = (entry) => resolveStoryContractPath(entry, NOWHERE_AT).projectPath;

// ── leg 1 ─ the leaf's reach, as a predicate over its source ──────────────────────────────────

// The tokens that would put a filesystem under this module. `process.cwd` is here for the same
// reason the other three are: it makes the answer depend on WHERE the caller ran, which is the
// impurity a lane replayed from a literal snapshot cannot tolerate.
const FILESYSTEM_TOKENS = Object.freeze([
  "node:fs", "node:fs/promises", "readFile", "readFileSync", "writeFile", "writeFileSync",
  "statSync", "existsSync", "readdir", "process.cwd", "fileURLToPath",
]);

const importedSpecifiers = (source) => importSpecifiers(source).map((entry) => entry.specifier);

function leafReachFaults(source) {
  const faults = [];
  for (const specifier of importedSpecifiers(source)) {
    if (specifier !== "node:path") faults.push(`imports ${specifier} — the leaf carries node:path and nothing else`);
  }
  for (const token of FILESYSTEM_TOKENS) {
    // `stat` on its own would match `statSync` and `status`; the bare call form is what matters.
    if (source.includes(token)) faults.push(`names ${token}`);
  }
  if (/\bstat\s*\(/u.test(source)) faults.push("names stat(");
  return faults;
}

// ── leg 2 ─ a second rule in a consumer, as a predicate over its source ───────────────────────

function secondRuleFaults(source) {
  const faults = [];
  if (!/import \{[^}]*\bcontractSetCovers\b[^}]*\} from "\.\/story-contract\.mjs"/u.test(source)) {
    faults.push("the coverage predicate is not imported from its one home");
  }
  if ((source.match(/\bcontractSetCovers\(/gu) ?? []).length < 2) {
    faults.push("the collision test does not call the shared predicate both ways");
  }
  if (/\bnew Set\(/u.test(source)) faults.push("a Set intersection over raw declared strings");
  if (/\.startsWith\(/u.test(source)) faults.push("a re-implemented containment rule");
  if (/(?:function\s+\w*[Cc]overs\b|(?:const|let)\s+\w*[Cc]overs\w*\s*=)/u.test(source)) faults.push("a second coverage helper");
  if (/\bstoryContractList\(/u.test(source)) faults.push("a second resolution of a declared key");
  return faults;
}

// ── leg 3 ─ the lexical rule, as a table ──────────────────────────────────────────────────────
//
// The rule, its boundary, and the FOUR REAL 119 EDGES — the ones an exact-string reading calls
// unwitnessed and a directory-aware one witnesses. Their authored strings are asserted against the
// stream itself further down, so this table is a measurement rather than a story about one.
const COVERAGE_TABLE = Object.freeze([
  { declared: "src/commands/test.mjs", probed: "src/commands/test.mjs", covers: true, why: "equal — coverage's first leg, and what makes the adoption a tightening" },
  { declared: "src/commands/", probed: "src/commands", covers: true, why: "equal once resolved; `path.relative` returns no trailing separator" },
  { declared: "src/commands/", probed: "src/commands/test.mjs", covers: true, why: "authored directory, probed path beneath it" },
  { declared: "src/commands/", probed: "src/commands/mesh/gate.mjs", covers: true, why: "beneath it at any depth" },
  { declared: "src/commands", probed: "src/commands/test.mjs", covers: false, why: "no authored slash, so one path was claimed and not a subtree" },
  { declared: "src/commands/", probed: "src/commands-old.mjs", covers: false, why: "THE BOUNDARY — a shared prefix is not containment, and the separator is what enforces it" },
  { declared: "src/commands/test.mjs", probed: "src/commands", covers: false, why: "a file covers no directory, and no stat decides that" },
  // …the four real 119 edges, by the entries their two STORY.md documents actually declare.
  { declared: "src/commands/", probed: "src/commands/test.mjs", covers: true, why: "119/03 → 119/02" },
  { declared: "src/", probed: "src/mesh-launcher.mjs", covers: true, why: "119/04 → 119/01" },
  { declared: "test/", probed: "test/arch/acd-assignment-repo-availability-loud.test.mjs", covers: true, why: "119/04 → 119/02" },
  { declared: "test/", probed: "test/agent-session-driver-door.test.mjs", covers: true, why: "119/04 → 119/03" },
]);

// The table, evaluated against SOME coverage predicate — the real one on the green path, and the
// planted `startsWith` on the red one. Returns the rows that answered wrong.
function lexicalFailures(covers) {
  const failures = [];
  for (const row of COVERAGE_TABLE) {
    const answered = covers(setOf(row.declared), resolvedPath(row.probed));
    if (answered !== row.covers) failures.push(`{${row.declared}} covers ${row.probed}? expected ${row.covers}, got ${answered} — ${row.why}`);
  }
  return failures;
}

// THE RED PROBE'S PREDICATE: containment by bare prefix, with the authored slash thrown away. It is
// the single most plausible wrong implementation of this rule, and the row it breaks is the one
// that looks like a corner case until `src/commands-old.mjs` exists.
const startsWithWithoutTheSlash = (set, entry) => {
  const probed = typeof entry === "string" ? entry : entry?.path;
  return (set ?? []).some((member) => probed === member.path || probed.startsWith(member.path));
};

// ── leg 4 ─ the generated corpus ──────────────────────────────────────────────────────────────
//
// An alphabet chosen so that every relationship the rule can hold appears in it: equality, a
// directory above a file, a directory above a directory, a shared prefix that is NOT containment,
// and two entries with nothing in common.
const ALPHABET = Object.freeze([
  "src/", "src/a.mjs", "src/nested/", "src/nested/b.mjs", "srcx.mjs", "test/", "test/c.mjs", "docs/d.md",
]);

// Every non-empty declared set of size 1 or 2 over the alphabet. Two is enough: coverage is decided
// entry-by-entry, so a set of three adds combinations and no new relationship.
function generatedSets() {
  const sets = [];
  for (let i = 0; i < ALPHABET.length; i += 1) {
    sets.push(setOf(ALPHABET[i]));
    for (let j = i + 1; j < ALPHABET.length; j += 1) sets.push(setOf(ALPHABET[i], ALPHABET[j]));
  }
  return sets;
}

// THE RULE THIS STORY REPLACES, over resolved sets: equality of the project path, which is exactly
// what a `Set` of `collisionKey(projectPath)` could answer and all it could answer.
const collidesByEquality = (left, right) => left.some((a) => right.some((b) => a.path === b.path));
// …and the rule it holds now, asked BOTH ways, because coverage is directional and a write/write
// collision is not.
const collidesByCoverage = (left, right) =>
  left.some((entry) => contractSetCovers(right, entry)) || right.some((entry) => contractSetCovers(left, entry));

export const archTests = [
  {
    name: "arch/124/00 FF-12403 leg 1: the contract-set leaf keeps zero project imports and reaches no filesystem",
    run: async () => {
      const leaf = await sourceOf(LEAF);
      assert.deepEqual(leafReachFaults(leaf), [], `${LEAF} must stay a pure leaf — 96/FF-9602 leg 1, re-asserted by the milestone that would have broken it`);

      // NON-VACUITY, both ways. The module is real and it DOES import something (so an empty read
      // could not have produced the pass), and the instrument reports a planted filesystem reach.
      assert.deepEqual(importedSpecifiers(leaf), ["node:path"], "the one import is node:path");
      assert.ok(leaf.includes("export function contractSetCovers"), "…and the predicate this milestone added is really in it");
      assert.ok(leaf.includes("export function resolveDeclaredSet"), "…and so is the declared-set resolver");
      const planted = `import { statSync } from "node:fs";\n${leaf}`;
      assert.ok(leafReachFaults(planted).length > 0, "the sweep reports a planted filesystem reach rather than passing over it");

      // …and the predicate really is decided without a disk: NOWHERE_ROOT exists nowhere, so
      // `src/commands/` is a directory on no machine and `src/commands-old.mjs` is a file on none.
      assert.equal(contractSetCovers(setOf("src/commands/"), resolvedPath("src/commands/test.mjs")), true);
      assert.equal(contractSetCovers(setOf("src/commands/"), resolvedPath("src/commands-old.mjs")), false);
    },
  },
  {
    name: "arch/124/00 FF-12403 leg 2: `ready-wave` resolves no declared key of its own and holds no second coverage rule",
    run: async () => {
      const consumer = await sourceOf(CONSUMER);
      assert.deepEqual(secondRuleFaults(consumer), [], `${CONSUMER} must hold no second answer to "what does this contract entry mean"`);

      // The one rule that is genuinely this module's own STAYS its own: case-folding protects a
      // DISK from two writers, where a case-only difference is the same file on win32 and macOS.
      // Moving it into the shared predicate would make the census fold declarations it should
      // compare as written.
      assert.match(consumer, /function collisionKey\(/u, "collisionKey stays here — it is about a disk, not about a declaration");
      assert.match(consumer, /toLowerCase\(\)/u, "…and it still case-folds");

      // NON-VACUITY: the module is real and its resolution really does come from the leaf.
      assert.match(consumer, /\bresolveDeclaredSet\(/u, "the declared key is resolved through the shared home");

      // RED PROBE (a) — a second `covers` helper authored inside the consumer. The leg fails, and
      // it fails NAMING the helper rather than by an off-by-one somewhere else.
      const withSecondHelper = `${consumer}\nconst entryCovers = (a, b) => a === b;\n`;
      assert.ok(
        secondRuleFaults(withSecondHelper).includes("a second coverage helper"),
        "the single-home leg reds on a second coverage helper",
      );
      // …and the other two shapes the same defect wears.
      assert.ok(secondRuleFaults(`${consumer}\nconst seen = new Set(writes);\n`).includes("a Set intersection over raw declared strings"));
      assert.ok(secondRuleFaults(`${consumer}\nif (probed.startsWith(claimed)) return true;\n`).includes("a re-implemented containment rule"));
    },
  },
  {
    name: "arch/124/00 FF-12403 leg 3: coverage is lexical — equal, or authored with a trailing slash and beneath it",
    run: () => {
      assert.deepEqual(lexicalFailures(contractSetCovers), [], "every row of the table, including the four real 119 edges");

      // Directory intent is read off the RAW entry and can be read nowhere else: the resolver
      // returns `projectPath` through `path.relative`, which never carries a trailing separator.
      assert.equal(declaresDirectory("src/commands/"), true);
      assert.equal(declaresDirectory("src/commands"), false);
      assert.equal(declaresDirectory(resolvedPath("src/commands/")), false, "the resolved path cannot answer it");

      // RED PROBE (b) — coverage as a bare `startsWith`, with the authored slash thrown away. The
      // leg fails, and it fails ON THE BOUNDARY ROW: `src/commands/` swallowing `src/commands-old.mjs`.
      const failures = lexicalFailures(startsWithWithoutTheSlash);
      assert.ok(failures.length > 0, "a prefix rule without the separator does not pass this table");
      assert.ok(
        failures.some((row) => row.includes("src/commands-old.mjs")),
        `the boundary row is the one that reds; got ${JSON.stringify(failures)}`,
      );
      // …and the row that catches it is a row the correct rule passes, so the probe measures the
      // rule rather than the table's difficulty.
      assert.equal(contractSetCovers(setOf("src/commands/"), resolvedPath("src/commands-old.mjs")), false);
    },
  },
  {
    name: "arch/124/00 FF-12403 leg 3 (non-vacuity): the four 119 edges the table names are really in this stream, and equality misses all four",
    run: async () => {
      const items = await listItems(path.join(repoRoot, "wiki", "work"));
      const sets = new Map();
      for (const item of items) {
        if (item.type !== "story" || item.parent !== "119") continue;
        const text = await readFile(path.join(item.dir, "STORY.md"), "utf8");
        const at = { storyDir: item.dir, projectRoot: repoRoot };
        sets.set(item.ref, {
          reads: resolveDeclaredSet(text, "reads", at).entries,
          files: resolveDeclaredSet(text, "files", at).entries,
        });
      }
      assert.ok(sets.size >= 5, `milestone 119's stories resolve (${sets.size}) — a walk over nothing proves nothing`);

      // THE FOUR EDGES, each measured both ways. Every one is witnessed under coverage and MISSED
      // under equality, which is the whole difference between the 14 unwitnessed edges an
      // exact-string census would report on this stream and the 10 that survive the truthful one.
      for (const [from, to] of [["119/03", "119/02"], ["119/04", "119/01"], ["119/04", "119/02"], ["119/04", "119/03"]]) {
        const reads = sets.get(from)?.reads ?? [];
        const files = sets.get(to)?.files ?? [];
        assert.ok(reads.length > 0 && files.length > 0, `${from} → ${to}: both contract sets resolve`);
        assert.ok(
          reads.some((entry) => contractSetCovers(files, entry)),
          `${from} → ${to} is witnessed under coverage`,
        );
        assert.equal(
          reads.some((entry) => files.some((claimed) => claimed.path === entry.path)),
          false,
          `…and missed under the exact-string rule this replaces, which is why the edge is one of the four`,
        );
      }

      // …and the authored directory entries those edges turn on really are authored, under
      // `files:`, in milestone 119 — the measurement ADR-003 §2 rests its lexical rule on.
      const authored = [];
      for (const [ref, sides] of sets) {
        for (const key of ["reads", "files"]) {
          for (const entry of sides[key] ?? []) if (entry.directory) authored.push(`${ref}:${key}:${entry.path}`);
        }
      }
      assert.equal(authored.length, 8, `milestone 119 authors the stream's directory-shaped declarations; got ${JSON.stringify(authored)}`);
      assert.deepEqual(authored.filter((entry) => entry.includes(":reads:")), [], "all of them under `files:` — a read claims no subtree");
    },
  },
  {
    name: "arch/124/00 FF-12403 leg 4: the adoption is a STRICT TIGHTENING — every pair colliding under equality still collides under coverage",
    run: () => {
      const corpus = generatedSets();
      assert.ok(corpus.length >= 30, `the generated corpus is real (${corpus.length} declared sets)`);
      for (const set of corpus) assert.notEqual(set, null, "every generated set resolves");

      let byEquality = 0;
      let byCoverage = 0;
      const widened = [];
      const tightened = [];
      for (let i = 0; i < corpus.length; i += 1) {
        for (let j = i; j < corpus.length; j += 1) {
          const equal = collidesByEquality(corpus[i], corpus[j]);
          const covered = collidesByCoverage(corpus[i], corpus[j]);
          if (equal) byEquality += 1;
          if (covered) byCoverage += 1;
          const pair = `{${corpus[i].map((e) => e.path)}} ~ {${corpus[j].map((e) => e.path)}}`;
          if (equal && !covered) widened.push(pair);
          if (covered && !equal) tightened.push(pair);
        }
      }

      // THE SUPERSET, ASSERTED AS SUCH. A wave can lose a member; it can never gain one. The
      // failure this refuses — a parallelism gate quietly OPENING — is invisible until two
      // builders write the same file, which is why it is measured rather than reasoned about.
      assert.deepEqual(widened, [], "no pair that collides under exact-string equality stops colliding under coverage");
      assert.ok(byCoverage >= byEquality, `the coverage relation is a superset (${byCoverage} pairs against ${byEquality})`);

      // NON-VACUITY: the corpus reaches BOTH sides of the difference. A corpus over which the two
      // rules never disagree would satisfy the superset claim and measure nothing.
      assert.ok(byEquality > 0, "the corpus contains pairs that collide under equality");
      assert.ok(tightened.length > 0, "…and pairs that collide only under coverage, so the tightening is real");
      // Equality is coverage's FIRST leg, and that is why the superset holds by construction as
      // well as by measurement — asserted directly, so the reason is in the control and not only
      // in the ADR.
      for (const set of corpus) {
        for (const entry of set) assert.equal(contractSetCovers(set, entry.path), true, "a set always covers its own entries");
      }
    },
  },
];
