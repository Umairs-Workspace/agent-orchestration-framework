// Fitness function FF-12705 (milestone 127 / ADR-004, story 03 task 05) —
//
//   "Archive never renumbers."
//
// `aof work archive` is a verbatim MOVE: a done driver's folder goes under `archive/`, its number is
// its identity and stays, and nothing a citation depends on is rewritten. The structural form of
// that promise (ADR-004 §5) is what this control holds, over BOTH files the story lands — the face
// `src/commands/archive.mjs` (the register row's subject) and the engine `src/work/archive.mjs`
// (task 03's placement, ratified at refine: the seam imports its fact-writers, and a command
// cannot be one without a cycle). Five legs:
//
//   (a) DIRECT IMPORTS ARE A CLOSED SET. The face's import specifiers resolve to a subset of
//       { node:*, src/work.mjs, src/effects/stream-transitions.mjs, src/command-error.mjs }; the
//       engine's to a subset of { node:*, src/work.mjs }. Neither names `src/work/reindex.mjs`,
//       `src/commands/insert-shared.mjs`, `src/work-promote/promotion.mjs` or any `src/commands/*`.
//   (b) THE TRANSITIVE PATH IS THE SEAM AND NOTHING ELSE. A breadth-first walk over `src/**` from
//       each file, following relative import specifiers over comment-stripped source: every path
//       to `src/work/reindex.mjs` or `src/commands/insert-shared.mjs` passes through
//       `src/effects/stream-transitions.mjs` — the ONE sanctioned stream-store seam, whose own
//       reindex import belongs to the insert cascade (FF-12703's to hold). SOURCE-LEVEL, the
//       acd-one-mint way, because `graphify-out/` is gitignored (m38/ADR-016) and a control that
//       read it would be red on every clean checkout. Non-vacuous: the leg must FIND the seam path.
//   (c) NO NUMBER IS WRITTEN. Neither file's comment-stripped source contains `number:`,
//       `parseInt(`, `Math.max(` or `appendPosition`.
//   (d) THE REWRITER MATCHES LINK SYNTAX ONLY. `rewriteCrossingLinks` is driven over a scratch
//       text whose frontmatter carries `number: 12` and whose body carries a crossing link: the
//       link changes and the `number:` line is byte-identical; over frontmatter alone it returns
//       the text unchanged with zero links. The regex it uses is asserted to require `](`.
//   (e) THE COMMAND CALLS THE SEAM, NOT THE ENGINE. The face references
//       `transitionStreamArchived(` and never `archiveItems(`; `archiveItems(`'s src callers are
//       exactly the seam.
//
// Red probes (task 05, recorded in VERIFICATION.md): import `reindex.mjs` into the face; import
// `insert-shared.mjs` into the face; import `promotion.mjs` into the engine; write `number:` in
// the rewriter; loosen the regex to `(../`; call `archiveItems(` from the face; and, for (b), an
// intermediate `archive-flags.mjs` re-exporting from `insert-shared.mjs`.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { rewriteCrossingLinks, INLINE_LINK_RE } from "../../../src/work/archive.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const FACE = "src/commands/archive.mjs";
const ENGINE = "src/work/archive.mjs";
const SEAM = "src/effects/stream-transitions.mjs";
const REINDEX = "src/work/reindex.mjs";
const INSERT_SHARED = "src/commands/insert-shared.mjs";
const PROMOTION = "src/work-promote/promotion.mjs";

const FACE_ALLOWED = new Set(["src/work.mjs", SEAM, "src/command-error.mjs"]);
const ENGINE_ALLOWED = new Set(["src/work.mjs"]);

const toPosix = (value) => value.split(path.sep).join("/");

// resolveSpecifier(specifier, fromRel) — a relative specifier resolved to a repo-relative posix
// path, or null for a bare / builtin specifier (which the walk never follows).
function resolveSpecifier(specifier, fromRel) {
  if (!specifier.startsWith(".")) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), specifier));
}

async function readRel(rel) {
  return readFile(path.join(repoRoot, ...rel.split("/")), "utf8");
}

async function srcGraph() {
  const graph = new Map();
  for (const file of await readSrcFiles(repoRoot)) {
    const rel = `src/${file.rel}`;
    const code = await readFile(file.path, "utf8");
    const edges = importSpecifiers(code)
      .map(({ specifier }) => resolveSpecifier(specifier, rel))
      .filter((target) => target != null && target.startsWith("src/"));
    graph.set(rel, edges);
  }
  return graph;
}

// pathsTo(graph, from, targets, { through }) — breadth-first over the import graph from `from`,
// NOT expanding `through` (the seam): every chain that reaches a target is one that did not cross
// it. Returns the offending chains as arrays of repo paths.
function chainsAvoiding(graph, from, targets, through) {
  const parent = new Map([[from, null]]);
  const queue = [from];
  const found = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (targets.has(current)) {
      const chain = [];
      for (let node = current; node != null; node = parent.get(node)) chain.unshift(node);
      found.push(chain);
      continue;
    }
    if (current === through) continue;
    for (const next of graph.get(current) ?? []) {
      if (parent.has(next)) continue;
      parent.set(next, current);
      queue.push(next);
    }
  }
  return found;
}

// The seam path, found by the SAME walk with the seam expanded — the non-vacuity of leg (b).
function chainThrough(graph, from, target, through) {
  const parent = new Map([[from, null]]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === target) {
      const chain = [];
      for (let node = current; node != null; node = parent.get(node)) chain.unshift(node);
      return chain.includes(through) ? chain : null;
    }
    for (const next of graph.get(current) ?? []) {
      if (parent.has(next)) continue;
      parent.set(next, current);
      queue.push(next);
    }
  }
  return null;
}

function closedSetProblems(rel, code, allowed) {
  const problems = [];
  for (const { specifier } of importSpecifiers(code)) {
    if (specifier.startsWith("node:")) continue;
    const resolved = resolveSpecifier(specifier, rel);
    if (resolved == null || !allowed.has(resolved)) {
      problems.push(`${path.basename(rel)} imports \`${specifier}\`${resolved ? ` (${resolved})` : ""}, outside its closed set {${["node:*", ...allowed].join(", ")}}`);
    }
  }
  return problems;
}

export const archTests = [
  // ==========================================================================
  // (a) direct imports are a closed set
  // ==========================================================================
  {
    name: "arch/127 FF-12705 (a): the face's and the engine's import specifiers are each a closed set, and neither names reindex, insert-shared, promotion or a command",
    run: async () => {
      const face = stripComments(await readRel(FACE));
      const engine = stripComments(await readRel(ENGINE));
      const problems = [...closedSetProblems(FACE, face, FACE_ALLOWED), ...closedSetProblems(ENGINE, engine, ENGINE_ALLOWED)];
      assert.deepEqual(problems, [], problems.join("\n"));
      // Non-vacuous: each file imports something, and the forbidden names are absent by name too.
      assert.ok(importSpecifiers(face).length >= 3, "the face imports its readers, the seam and the error contract");
      assert.ok(importSpecifiers(engine).length >= 2, "the engine imports node:* and the readers");
      for (const [rel, code] of [[FACE, face], [ENGINE, engine]]) {
        for (const forbidden of ["reindex.mjs", "insert-shared.mjs", "promotion.mjs"]) {
          assert.ok(!importSpecifiers(code).some(({ specifier }) => specifier.endsWith(forbidden)), `${rel} does not import ${forbidden}`);
        }
        assert.ok(!importSpecifiers(code).some(({ specifier }) => (resolveSpecifier(specifier, rel) ?? "").startsWith("src/commands/")), `${rel} imports no src/commands/* module`);
      }
    },
  },

  // ==========================================================================
  // (b) the transitive path is the seam and nothing else
  // ==========================================================================
  {
    name: "arch/127 FF-12705 (b): every transitive path from the face or the engine to reindex.mjs or insert-shared.mjs crosses the stream seam — and the seam path is found",
    run: async () => {
      const graph = await srcGraph();
      assert.ok(graph.has(FACE) && graph.has(ENGINE) && graph.has(SEAM), "the walk read the three files");
      const targets = new Set([REINDEX, INSERT_SHARED]);
      const offending = [...chainsAvoiding(graph, FACE, targets, SEAM), ...chainsAvoiding(graph, ENGINE, targets, SEAM)];
      assert.deepEqual(
        offending.map((chain) => chain.join(" → ")),
        [],
        `a path reaches the reindex engine or insert-shared without crossing the seam:\n${offending.map((chain) => chain.join(" → ")).join("\n")}`,
      );
      // Non-vacuous: the sanctioned path exists and is the one excluded.
      const seamPath = chainThrough(graph, FACE, REINDEX, SEAM);
      assert.deepEqual(seamPath, [FACE, SEAM, REINDEX], `the seam path ${FACE} → ${SEAM} → ${REINDEX} is found and excluded (got ${seamPath?.join(" → ")})`);
    },
  },

  // ==========================================================================
  // (c) no number is written
  // ==========================================================================
  {
    name: "arch/127 FF-12705 (c): neither file's comment-stripped source contains `number:`, `parseInt(`, `Math.max(` or `appendPosition`",
    run: async () => {
      for (const rel of [FACE, ENGINE]) {
        const code = stripComments(await readRel(rel));
        for (const token of ["number:", "parseInt(", "Math.max(", "appendPosition"]) {
          assert.ok(!code.includes(token), `${rel} contains \`${token}\` — the archive writes no number (ADR-004 §5)`);
        }
      }
    },
  },

  // ==========================================================================
  // (d) the rewriter matches link syntax only
  // ==========================================================================
  {
    name: "arch/127 FF-12705 (d): the rewriter rewrites the link line and leaves the `number:` line byte-identical, returns frontmatter alone unchanged, and its regex requires `](`",
    run: async () => {
      const scratch = path.join(repoRoot, "scratch-work");
      const moving = [{ name: "12_milestone_theta", from: path.join(scratch, "12_milestone_theta"), to: path.join(scratch, "archive", "12_milestone_theta") }];
      const dir = path.join(scratch, "11_chore_beta");

      const text = "---\ntype: chore\nnumber: 12\ndepends: [12]\nparent: 12\n---\n# 12 · beta\n\n[theta](../12_milestone_theta/SPEC.md)\n";
      const { text: rewritten, links } = rewriteCrossingLinks(text, { dir, moving });
      assert.equal(links, 1, "one link rewritten");
      assert.ok(rewritten.includes("](../archive/12_milestone_theta/SPEC.md)"), "the link line changed");
      assert.equal(rewritten.match(/^number:.*$/m)[0], "number: 12", "the number: line is byte-identical");
      assert.equal(rewritten.match(/^depends:.*$/m)[0], "depends: [12]");
      assert.equal(rewritten.match(/^parent:.*$/m)[0], "parent: 12");
      assert.equal(rewritten.split("\n").length, text.split("\n").length, "no line added or removed");

      const frontmatterOnly = "---\ntype: chore\nnumber: 12\ndepends: [12]\nparent: 12\n---\n";
      const untouched = rewriteCrossingLinks(frontmatterOnly, { dir, moving });
      assert.equal(untouched.links, 0, "zero links counted");
      assert.equal(untouched.text, frontmatterOnly, "returned unchanged");

      assert.ok(INLINE_LINK_RE.source.startsWith("\\]\\("), `the regex requires \`](\` before the target (${INLINE_LINK_RE.source})`);
      const engine = stripComments(await readRel(ENGINE));
      assert.match(engine, /INLINE_LINK_RE = \/\\\]\\\(/, "…and it is the one regex the engine's rewriter uses");
      assert.equal((engine.match(/\.replace\(INLINE_LINK_RE/g) ?? []).length, 1, "the rewrite is one replace over the one regex");
    },
  },

  // ==========================================================================
  // (e) the command calls the seam, not the engine
  // ==========================================================================
  {
    name: "arch/127 FF-12705 (e): the face calls `transitionStreamArchived(` and never `archiveItems(`, whose src callers are exactly the seam",
    run: async () => {
      const face = stripComments(await readRel(FACE));
      assert.match(face, /\btransitionStreamArchived\s*\(/, "the face calls the seam");
      assert.doesNotMatch(face, /\barchiveItems\s*\(/, "the face never calls the engine");
      const callers = [];
      for (const file of await readSrcFiles(repoRoot)) {
        const rel = `src/${file.rel}`;
        if (rel === ENGINE) continue;
        const code = stripComments(await readFile(file.path, "utf8"));
        if (/\barchiveItems\s*\(/.test(code)) callers.push(rel);
      }
      assert.deepEqual(callers, [SEAM], `archiveItems( is called from the seam and nowhere else (callers: ${callers.join(", ")})`);
    },
  },
];
