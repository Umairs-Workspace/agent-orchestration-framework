// Fitness function FF-12703 for milestone 127 / ADR-003 — "ONE MINT."
//
// Two places minted a top-level number before this milestone: the `aof:add-*` prompts' "next number
// = max across work.dir + 1" (agent arithmetic over a directory listing — 41/ADR-002 named it the
// thing the deterministic CLI exists to replace) and `appendPosition`
// (`src/work-promote/promotion.mjs`), reached by the two `promote-*-to-chore` faces and, since
// 127/01, `migrate-folder.mjs`. `insert-*` opened its own slot through the re-index engine. After
// story 02 the only minting CODE PATH is `aof work promote`, and every other minter is a caller of
// the SAME `appendPosition`.
//
// THE FIVE LEGS, as the story's contract sharpens them (tasks 00 and 03, ratified in the contract
// beat), each with a NON-VACUITY leg beside it because every one of them is a sweep that would pass
// on an empty answer:
//
//   (a) `appendPosition` is DEFINED in `src/work-promote/promotion.mjs` only, and its src callers are
//       exactly `promote.mjs`, `promote-finding-to-chore.mjs`, `promote-gap-to-chore.mjs` and
//       `migrate-folder.mjs` — the register's "promote family", read as that set (127/01 made the
//       last one a caller). Non-vacuous: the sweep finds FOUR callers.
//   (b) the TOP-LEVEL slot-open (`transitionStreamReindexed` with `space: "top-level"`) is called
//       from `src/commands/promote.mjs` and nowhere else under `src/commands/`, and
//       `runInsertTopLevel` is DEFINED there (the other import direction would be a cycle, so the
//       engine moved to the verb rather than the verb to the engine). Non-vacuous: the sweep finds
//       the ONE call.
//   (c) none of the four verb faces `insert-{milestone,chore,uat,story}.mjs` contains `parseInt`,
//       `Math.max` or a `number:` write. The mechanics module keeps `parsePosition` and the nested
//       axis's own parses — this leg is about the FACES. Non-vacuous: the same three patterns are
//       shown to match where they legitimately live.
//   (d) `src/work/reindex.mjs`'s src importers, read from IMPORT SPECIFIERS over comment-stripped
//       source, are `{ src/commands/insert-shared.mjs, src/effects/stream-transitions.mjs }` or a
//       strict subset. Four comment-only mentions of the path exist in the tree, which is exactly
//       why this is a specifier sweep and not a grep. Non-vacuous: the resolver finds importers at
//       all (today it finds the two).
//   (e) no `src/bundle/commands/add-*.md` computes a number. Non-vacuous: it reads the five
//       scaffolding prompts (six files match the glob today — `add-task` is swept too, and the floor
//       is a floor rather than a census).
//
// HOW IT IS BUILT, and why each choice:
//   · COMMENT-STRIPPED through the ONE home (`test/support/source-slice.mjs`), and the import
//     specifiers through the ONE extractor (`test/support/module-family.mjs`) — FF-11901 forbids a
//     tenth private copy of either, and the comment-only mentions in leg (d) are precisely the class
//     of false positive a private regex gets wrong.
//   · EVERY FAILURE NAMES THE OFFENDING FILE, because the register's red probes are stated as
//     file-named sentences ("insert-milestone.mjs as an insert verb that computes a number"), and a
//     control that says only "the rule is broken" leaves the reader to find the occurrence.
//   · the tree is WALKED, not listed: a sixth module that starts calling `appendPosition` is caught
//     the day it lands rather than the day someone remembers to add it here.
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importSpecifiers } from "../../support/module-family.mjs";
import { matchedParenSpan, stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const toPosix = (value) => String(value).split(path.sep).join("/");

const HOME = "src/work-promote/promotion.mjs";
// The promote FAMILY — `appendPosition`'s callers, as the register reads them.
const APPEND_CALLERS = Object.freeze([
  "src/commands/migrate-folder.mjs",
  "src/commands/promote-finding-to-chore.mjs",
  "src/commands/promote-gap-to-chore.mjs",
  "src/commands/promote.mjs",
]);
const VERB = "src/commands/promote.mjs";
const INSERT_FACES = Object.freeze([
  "src/commands/insert-chore.mjs",
  "src/commands/insert-milestone.mjs",
  "src/commands/insert-story.mjs",
  "src/commands/insert-uat.mjs",
]);
const ENGINE = "src/work/reindex.mjs";
const ENGINE_IMPORTERS = Object.freeze(["src/commands/insert-shared.mjs", "src/effects/stream-transitions.mjs"]);
// The five the prompts' rewrite names (task 05). The glob is the SUBJECT; these are the floor, so a
// renamed prompt fails as missing rather than quietly shrinking the sweep.
const NAMED_ADD_PROMPTS = Object.freeze([
  "add-chore.md",
  "add-milestone.md",
  "add-spike.md",
  "add-story.md",
  "add-uat.md",
]);

// Every `.mjs` under a directory, repo-relative and forward-slashed.
async function walkMjs(rel, out = []) {
  for (const entry of await readdir(path.join(repoRoot, rel), { withFileTypes: true })) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) await walkMjs(child, out);
    else if (entry.name.endsWith(".mjs")) out.push(child);
  }
  return out;
}

// rel → comment-stripped source, for every module in the sweep. Read once per leg, so a leg's
// answer is a fact about one snapshot of the tree.
async function strippedSources(rel = "src") {
  const files = (await walkMjs(rel)).sort();
  const sources = new Map();
  for (const file of files) sources.set(file, stripComments(await readFile(path.join(repoRoot, file), "utf8")));
  return sources;
}

// Every call of `name(` in `code`, as the ARGUMENT TEXT of each call — the span, so a leg can ask
// what was passed rather than matching a whole file. `matchedParenSpan` is the shared reader.
function callArguments(code, name) {
  const spans = [];
  const pattern = new RegExp(`\\b${name}\\s*\\(`, "gu");
  for (const match of code.matchAll(pattern)) {
    // The span is cut from the NAME, so `matchedParenSpan` opens on this call's own paren; a call
    // whose parens never close answers "" rather than swallowing the rest of the file.
    const span = matchedParenSpan(code, match.index);
    spans.push(span == null ? "" : span.body);
  }
  return spans;
}

// A definition of `name`, in any of the three forms this tree uses.
function definesName(code, name) {
  return new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\b`, "u").test(code)
    || new RegExp(`\\b(?:const|let|var)\\s+${name}\\s*=`, "u").test(code);
}

// Does `specifier`, resolved from `fromRel`, name `targetRel`? Relative specifiers only — a bare or
// `node:` specifier can never name a file under `src/`.
function resolvesTo(specifier, fromRel, targetRel) {
  if (!specifier.startsWith(".")) return false;
  return toPosix(path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), specifier))) === targetRel;
}

export const archTests = [
  // ==========================================================================
  // (a) one home, four callers
  // ==========================================================================
  {
    name: "arch/FF-12703 (acd-one-mint): appendPosition is defined only in src/work-promote/promotion.mjs and called by exactly the promote family",
    run: async () => {
      const sources = await strippedSources();
      assert.ok(sources.size > 100, `non-vacuity: the src sweep read ${sources.size} modules`);

      const definitions = [...sources].filter(([, code]) => definesName(code, "appendPosition")).map(([rel]) => rel);
      assert.deepEqual(definitions, [HOME], `appendPosition has ONE home — found: ${definitions.join(", ") || "none"}`);

      const callers = [...sources]
        .filter(([rel, code]) => rel !== HOME && /\bappendPosition\s*\(/u.test(code))
        .map(([rel]) => rel)
        .sort();
      assert.equal(callers.length, 4, `non-vacuity: the sweep finds four callers — found ${callers.length} (${callers.join(", ")})`);
      for (const caller of callers) {
        assert.ok(
          APPEND_CALLERS.includes(caller),
          `${path.basename(caller)} calls appendPosition and is not in the promote family — ONE mint means every minter is a caller of this one function, inside the family the register names (${APPEND_CALLERS.join(", ")})`,
        );
      }
      assert.deepEqual(callers, [...APPEND_CALLERS].sort(), "the promote family is exactly the four callers");
    },
  },

  // ==========================================================================
  // (b) the top-level slot-open has one caller under src/commands, and the
  //     alias engine lives with the verb
  // ==========================================================================
  {
    name: "arch/FF-12703 (acd-one-mint): the top-level slot-open is called from src/commands/promote.mjs and nowhere else under src/commands, and runInsertTopLevel is defined there",
    run: async () => {
      const sources = await strippedSources("src/commands");
      assert.ok(sources.size > 20, `non-vacuity: the src/commands sweep read ${sources.size} modules`);

      let topLevelCalls = 0;
      const callers = [];
      for (const [rel, code] of sources) {
        const topLevel = callArguments(code, "transitionStreamReindexed").filter((args) => /space\s*:\s*"top-level"/u.test(args));
        if (topLevel.length === 0) continue;
        topLevelCalls += topLevel.length;
        callers.push(rel);
      }
      assert.equal(topLevelCalls, 1, `non-vacuity: the sweep finds the ONE top-level slot-open call — found ${topLevelCalls}`);
      for (const caller of callers.sort()) {
        assert.equal(
          caller,
          VERB,
          `${path.basename(caller)} as a second top-level slot-open caller — the top-level re-index is reached from promote.mjs alone (ADR-003 §4); the nested call belongs to insert-shared.mjs's runInsertStory`,
        );
      }

      const definitions = [...sources].filter(([, code]) => definesName(code, "runInsertTopLevel")).map(([rel]) => rel);
      assert.deepEqual(
        definitions,
        [VERB],
        `runInsertTopLevel is defined in promote.mjs (the alias's engine moved WITH the mint — the other import direction is a cycle) — found: ${definitions.join(", ") || "none"}`,
      );
    },
  },

  // ==========================================================================
  // (c) the four verb faces compute nothing
  // ==========================================================================
  {
    name: "arch/FF-12703 (acd-one-mint): no insert verb face contains parseInt, Math.max or a number: write",
    run: async () => {
      const patterns = Object.freeze([
        ["parseInt", /\bparseInt\b/u],
        ["Math.max", /\bMath\.max\b/u],
        ["a `number:` write", /\bnumber\s*:/u],
      ]);

      // Non-vacuity, the honest form for a "contains nothing" leg: show each pattern matching where
      // it legitimately lives. A typo'd regex would otherwise pass this test forever. The `number:`
      // anchor is the VERB (`stampNumber` in promote.mjs writes `number: ${padded}`), not the
      // append home — `promotion.mjs` writes no `number:` line at all; its one match was the
      // ternary `? number : max`, which is not a write and would have anchored nothing (127/02).
      const mechanics = stripComments(await readFile(path.join(repoRoot, "src/commands/insert-shared.mjs"), "utf8"));
      const verb = stripComments(await readFile(path.join(repoRoot, VERB), "utf8"));
      assert.match(mechanics, patterns[0][1], "non-vacuity: the parseInt pattern matches the mechanics module, which legitimately parses");
      assert.match(verb, /\bnumber\s*:/u, "non-vacuity: the `number:` pattern matches where a number IS written — promote.mjs's stampNumber");
      assert.match("const next = Math.max(1, 2) + 1;", patterns[1][1], "non-vacuity: the Math.max pattern matches the probe's own line");

      for (const face of INSERT_FACES) {
        const code = stripComments(await readFile(path.join(repoRoot, face), "utf8"));
        assert.ok(code.trim().length > 0, `non-vacuity: ${face} was read`);
        for (const [what, pattern] of patterns) {
          assert.doesNotMatch(
            code,
            pattern,
            `${path.basename(face)} as an insert verb that computes a number (${what}) — an insert verb is a thin alias of scaffold-into-backlog + promote --at P, and owns no arithmetic (ADR-003 §4)`,
          );
        }
      }
    },
  },

  // ==========================================================================
  // (d) the re-index engine gains no importer
  // ==========================================================================
  {
    name: "arch/FF-12703 (acd-one-mint): src/work/reindex.mjs's src importers are insert-shared.mjs and effects/stream-transitions.mjs, or a strict subset",
    run: async () => {
      const sources = await strippedSources();
      const importers = [...sources]
        .filter(([rel, code]) => rel !== ENGINE && importSpecifiers(code).some(({ specifier }) => resolvesTo(specifier, rel, ENGINE)))
        .map(([rel]) => rel)
        .sort();

      // THE CLAIM IS A CEILING; THE NON-VACUITY IS A FLOOR. A legitimate future removal (one of the
      // two stops importing the engine) must stay green — "or a strict subset" — so the floor is
      // "the resolver found an importer at all". Zero would mean the specifier resolution is broken,
      // which is the one way this leg could pass while saying nothing.
      assert.ok(importers.length >= 1, "non-vacuity: the specifier sweep resolved at least one importer of the engine");
      assert.equal(importers.length, 2, `today the engine has exactly its two importers — found ${importers.length}: ${importers.join(", ")}`);
      for (const importer of importers) {
        assert.ok(
          ENGINE_IMPORTERS.includes(importer),
          `${path.basename(importer)} as a third importer of the engine (${ENGINE}) — the slot-open keeps its two src callers and gains none (ADR-003, Consequences); the four other mentions of this path in src/ are comments, which is why this leg reads import specifiers`,
        );
      }
    },
  },

  // ==========================================================================
  // (e) no add-* prompt computes a number
  // ==========================================================================
  {
    name: "arch/FF-12703 (acd-one-mint): no src/bundle/commands/add-*.md computes a top-level number",
    run: async () => {
      const dir = path.join(repoRoot, "src", "bundle", "commands");
      const prompts = (await readdir(dir)).filter((name) => name.startsWith("add-") && name.endsWith(".md")).sort();
      assert.ok(
        prompts.length >= NAMED_ADD_PROMPTS.length,
        `non-vacuity: the sweep reads at least the five scaffolding prompts — found ${prompts.length}: ${prompts.join(", ")}`,
      );
      for (const named of NAMED_ADD_PROMPTS) {
        assert.ok(prompts.includes(named), `${named} is swept (a renamed prompt must fail here, never narrow the sweep)`);
      }

      // The instrument, self-checked against the LINE the register's red probe pastes back — so this
      // leg cannot pass forever on a typo'd pattern, and it is checked without touching the tree
      // (a probe left in a shared checkout is a defect of its own).
      const PROBE_LINE = "1. Next top-level number `NN` = max `NN` across `work.dir` + 1, zero-padded.";
      const patterns = Object.freeze([["max", /\bmax\b/iu], ["+ 1", /\+\s*1\b/u]]);
      for (const [what, pattern] of patterns) {
        assert.match(PROBE_LINE, pattern, `non-vacuity: the ${what} pattern catches the arithmetic this leg exists to forbid`);
      }

      for (const prompt of prompts) {
        const text = await readFile(path.join(dir, prompt), "utf8");
        assert.ok((await stat(path.join(dir, prompt))).size > 0, `non-vacuity: ${prompt} was read`);
        for (const [what, pattern] of patterns) {
          assert.doesNotMatch(
            text,
            pattern,
            `${prompt} as a prompt that computes a number (${what}) — an item is born un-numbered on the intake and gets its number from \`aof work promote\`, never from arithmetic over a directory listing (ADR-003 §1, 41/ADR-002)`,
          );
        }
      }
    },
  },
];
