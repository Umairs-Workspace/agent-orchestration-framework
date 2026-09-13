// Fitness function: acd-duplication-rule-states-its-blindness (milestone 77 / story 00, FF-7702;
// ADR-004 §1-§4).
//
//   "The duplication rule matches EXACTLY and states its own blindness in its output."
//
// ── WHY THIS ROW IS SEPARATE FROM FF-7701, THOUGH BOTH LAND ON ONE MODULE ────────────────────
//
// They fail for different reasons and their red probes mutate different things. FF-7701 guards the
// capability rule's NARROWNESS; this one guards the duplication rule's HONESTY. Merging them would
// give one failure two meanings.
//
// ── THE THREE THINGS THAT WOULD QUIETLY UNDO IT ──────────────────────────────────────────────
//
//   (A) A SIMILARITY THRESHOLD. The measured case is four logical copies of one block totalling
//       8,402 B that share no sentence between them, and exact BLOCK matching finds zero of them.
//       The tempting repair is a near-duplicate detector with a threshold — and it is refused,
//       because a threshold is a model inside a command specified to have none, and the number
//       that decides truth is un-reviewable. So no similarity, distance, ratio or overlap
//       computation may exist in the module at all.
//
//   (B) THE FLOOR AS A BURIED LITERAL. The floor is a gradient, not a detail: 21 duplicated groups
//       at 120 bytes, 12 at 200, and 0 at 300. A number that decides the entire output that
//       steeply must be declared once, and the value the run actually used must reach the reader —
//       so it is an exported constant, it is never compared against as a numeral, and the limit
//       reports the value the run applied.
//
//   (C) A SECOND SPELLING OF THE INSTALLED LAYER. The corpus is the prompt layer AS INSTALLED,
//       discovered through the runtime local roots and resource-kind plurals the model already
//       declares. A path literal here would be a second declaration that drifts from the first —
//       and it would also quietly re-scope the rule, because `src/bundle/**` exists only in a
//       framework checkout while what actually runs is what is installed.
//
// ── WHAT THE CENSUS DELIBERATELY DOES NOT READ, AND WHY ──────────────────────────────────────
//
// Comments are stripped, and the sweep registry's own `blindness` prose is CUT (on the language's
// parens, never a byte window). Both are the module EXPLAINING the rejected design — the first to a
// reader of the source, the second to an operator reading the run's output. A census that could not
// tell an explanation from an implementation would force this lane to stop explaining itself, which
// is the very failure this milestone was commissioned to end. The cut region is asserted non-empty
// and is asserted to CARRY the explanation, so it cannot become a hiding place.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { matchedParenSpan, stripComments } from "../../support/source-slice.mjs";
import { RESOURCE_KINDS, RUNTIMES } from "../../../src/model.mjs";
import {
  PROMPT_LAYER_SWEEPS,
  SENTENCE_FLOOR,
  runPromptLayer,
} from "../../../src/work-audit/prompt-layer.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MODULE_REL = "src/work-audit/prompt-layer.mjs";
const moduleSource = () => readFileSync(path.join(repoRoot, MODULE_REL), "utf8");

const SOURCE_FLOOR = 2000;

// The computations ADR-004 refuses. A rule that scores two sentences for likeness has a number in
// it that decides truth, and no reviewer can check that number by reading two lines.
const REFUSED_COMPUTATIONS = Object.freeze([
  "similarity", "levenshtein", "jaccard", "dice", "cosine",
  "distance", "fuzzy", "ngram", "overlap", "threshold", "tolerance",
]);

// ── FIXTURES ─────────────────────────────────────────────────────────────────────────────────

function project(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), "aof-ff7702-"));
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
}

async function laneOver(files, options = {}) {
  const root = project(files);
  try {
    const result = await runPromptLayer({ root, ...options });
    return {
      root,
      limits: result.limits,
      reads: result.reads,
      pairs: result.findings.filter((finding) => finding.code === "audit-instruction-duplicated"),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// Exactly `bytes` bytes of sentence, terminator included, with real word breaks in it.
function sentenceOfBytes(bytes, seed) {
  let text = seed;
  while (text.length < bytes - 1) text += ` ${seed}`;
  text = text.slice(0, bytes - 1);
  if (text.endsWith(" ")) text = `${text.slice(0, -1)}x`;
  return `${text}.`;
}

// The module's source with the comments and the sweep registry's explanatory prose removed. The
// registry is cut on MATCHING PARENS from its own declaration, so a reordered or reformatted
// registry moves the cut with it rather than shifting a byte offset onto unrelated code.
function censusableSource() {
  const code = stripComments(moduleSource());
  assert.equal(code.length > SOURCE_FLOOR, true, `${MODULE_REL} was read and stripped to something real (${code.length} chars, floor ${SOURCE_FLOOR})`);

  const at = code.indexOf("export const PROMPT_LAYER_SWEEPS");
  assert.notEqual(at, -1, "the sweep registry is declared — a renamed export would make every claim below vacuous");
  const registry = matchedParenSpan(code, at);
  assert.notEqual(registry, null, "the sweep registry was cut by matching parens, never by a byte window");
  assert.equal(registry.body.length > 500, true, `the cut region is substantial (${registry.body.length} chars) — an empty cut would prove nothing`);
  assert.equal(/paraphrase|different words|INVISIBLE/iu.test(registry.body), true, "…and it is the region that CARRIES the operator-facing explanation, so it is not a hiding place");

  const rest = code.split(registry.body).join(" ");
  assert.equal(rest.length > SOURCE_FLOOR / 2, true, `the module outside the registry is still substantial (${rest.length} chars)`);
  return { code, registry: registry.body, rest };
}

export const archTests = [
  {
    name: "acd-duplication-rule-states-its-blindness: no similarity, distance or threshold computation exists in the module",
    run() {
      const { rest } = censusableSource();
      for (const token of REFUSED_COMPUTATIONS) {
        assert.equal(
          new RegExp(`\\b${token}`, "iu").test(rest),
          false,
          `\`${token}\` appears nowhere in ${MODULE_REL}'s implementation — a threshold is a model inside a command specified to have none, and the number that decides truth would be un-reviewable`,
        );
      }
    },
  },
  {
    name: "acd-duplication-rule-states-its-blindness: the sentence floor is an exported constant, never a literal at a comparison site",
    run() {
      const { rest } = censusableSource();
      assert.equal(typeof SENTENCE_FLOOR === "number" && Number.isFinite(SENTENCE_FLOOR), true, "the floor is exported as a number");
      assert.equal(SENTENCE_FLOOR > 0, true, "…greater than zero");

      // The numeral exists ONCE, in its own declaration. 21 groups at 120 / 12 at 200 / 0 at 300 is
      // a gradient steep enough that a second copy would decide the output somewhere unread.
      const declaration = `export const SENTENCE_FLOOR = ${SENTENCE_FLOOR};`;
      assert.equal(rest.includes(declaration), true, `${MODULE_REL} declares the floor as \`${declaration}\``);
      const occurrences = rest.split(String(SENTENCE_FLOOR)).length - 1;
      assert.equal(occurrences, 1, `the numeral ${SENTENCE_FLOOR} appears exactly once in the implementation (found ${occurrences})`);

      // And it is never COMPARED against as a numeral, which is the shape the invariant names.
      const comparison = new RegExp(`[<>]=?\\s*${SENTENCE_FLOOR}\\b|===?\\s*${SENTENCE_FLOOR}\\b|\\b${SENTENCE_FLOOR}\\s*[<>]=?`, "u");
      assert.equal(comparison.test(rest), false, `nothing in ${MODULE_REL} compares against the numeral ${SENTENCE_FLOOR}`);
      assert.equal(/<\s*sentenceFloor/u.test(rest), true, "the length comparison reads the floor by NAME, so the value the run was given is the value it applies");
    },
  },
  {
    name: "acd-duplication-rule-states-its-blindness: a paraphrase yields nothing, a byte-identical sentence across two documents is a finding, and one document is never a pair",
    async run() {
      const shared = sentenceOfBytes(SENTENCE_FLOOR + 40, "graphify");

      const paraphrase = await laneOver({
        ".claude/commands/one.md": "Graphify extraction replaces the single project graph, so never target a package subtree — doing that evicts every file outside it and the answer is silently partial.",
        ".claude/commands/two.md": "Never point an extraction at one package: the whole project graph is replaced each time, and every file beyond the subtree you named disappears from it without a word.",
      });
      assert.deepEqual(paraphrase.pairs, [], "two documents stating ONE rule in different words yield no finding — the paraphrase is invisible by design");

      const copied = await laneOver({
        ".claude/commands/one.md": shared,
        ".claude/commands/two.md": shared,
      });
      assert.equal(copied.pairs.length, 1, "…and a byte-identical sentence at or above the floor in two documents IS a finding");

      const within = await laneOver({
        ".claude/commands/one.md": `${shared} Some unrelated text. ${shared}`,
        ".claude/commands/two.md": "A document sharing nothing with the first.",
      });
      assert.deepEqual(within.pairs, [], "a sentence repeated twice inside ONE document is not a pair — one document cannot duplicate a rule ACROSS documents");

      const belowFloor = sentenceOfBytes(SENTENCE_FLOOR - 1, "bravo");
      const under = await laneOver({ ".claude/commands/one.md": belowFloor, ".claude/commands/two.md": belowFloor });
      assert.deepEqual(under.pairs, [], "…and a byte-identical sentence one byte below the floor is not one either");
    },
  },
  {
    name: "acd-duplication-rule-states-its-blindness: findings are aggregated per FILE PAIR with a byte total, never one per sentence group",
    async run() {
      const shared = [225, 225, 225, 225].map((bytes, index) => sentenceOfBytes(bytes, `echo${index}`));
      const single = sentenceOfBytes(200, "foxtrot");

      const result = await laneOver({
        ".claude/commands/a.md": `${shared.join(" ")} ${single}`,
        ".claude/commands/b.md": shared.join(" "),
        ".claude/commands/c.md": single,
      });

      assert.equal(result.pairs.length, 2, `two findings for two file pairs, not five for five sentence groups: got ${result.pairs.length}`);
      const ab = result.pairs.find((finding) => finding.message.includes("b.md"));
      const ac = result.pairs.find((finding) => finding.message.includes("c.md"));
      assert.match(ab.message, /900 redundant bytes/u, "the A↔B pair carries the bytes its four sentences cost");
      assert.match(ac.message, /200 redundant bytes/u, "…and the A↔C pair the bytes of its one");
      assert.equal(result.pairs[0], ab, "ranked by the bytes they cost, because the aggregate is the number a retrospective can plot");
      for (const finding of result.pairs) {
        assert.equal(finding.severity, "warn", "and every one reports at warn — eighteen pairs arrive on day one, and a rule that fails eighteen builds gets disabled");
      }
    },
  },
  {
    name: "acd-duplication-rule-states-its-blindness: the lane emits a limit on EVERY run, naming the floor it applied and the paraphrase it cannot see",
    async run() {
      const clean = await laneOver({ ".claude/commands/a.md": "Nothing of interest.", ".claude/commands/b.md": "Nor here." });
      const dirty = await laneOver({
        ".claude/commands/a.md": sentenceOfBytes(SENTENCE_FLOOR + 40, "hotel"),
        ".claude/commands/b.md": sentenceOfBytes(SENTENCE_FLOOR + 40, "hotel"),
      });
      assert.deepEqual(clean.pairs, [], "the clean run found nothing");
      assert.equal(dirty.pairs.length, 1, "…and the other run found something");

      for (const [label, result] of [["clean", clean], ["with findings", dirty]]) {
        assert.equal(result.limits.length > 0, true, `the ${label} run returns a limit — a limit quoted only into findings says nothing in exactly the case a reader most needs it`);
        const said = result.limits.map((limit) => limit.consequence).join(" ");
        assert.equal(said.includes(String(SENTENCE_FLOOR)), true, `the ${label} run's limit names the floor it applied, as the value it used`);
        assert.match(said, /different words is INVISIBLE/u, `the ${label} run's limit says a rule restated in different words is invisible to it`);
      }

      // The floor the limit reports is the floor the RUN used, not the shipped default.
      const raised = SENTENCE_FLOOR * 3;
      const higher = await laneOver({
        ".claude/commands/a.md": sentenceOfBytes(SENTENCE_FLOOR + 40, "india"),
        ".claude/commands/b.md": sentenceOfBytes(SENTENCE_FLOOR + 40, "india"),
      }, { sentenceFloor: raised });
      assert.deepEqual(higher.pairs, [], "a floor above the duplicated sentence hides it");
      assert.equal(
        higher.limits.some((limit) => limit.consequence.includes(String(raised))),
        true,
        "…and the limit reports the raised value, so a reader of a clean result can tell how much the floor hid",
      );
    },
  },
  {
    name: "acd-duplication-rule-states-its-blindness: the duplication sweep declares basis text, which is what makes the limit obligatory",
    run() {
      const sweep = PROMPT_LAYER_SWEEPS.find((entry) => entry.id.includes("duplication"));
      assert.notEqual(sweep, undefined, "the registry declares a duplication sweep");
      assert.equal(sweep.basis, "text", "it declares `basis: \"text\"` — a text-level sweep that states no limit reports clean in exactly the case where it is blind");
      assert.equal(Object.isFrozen(PROMPT_LAYER_SWEEPS), true, "the registry is frozen, so a lane cannot drop the declaration at run time");
      for (const entry of PROMPT_LAYER_SWEEPS) {
        assert.equal(Object.isFrozen(entry), true, `the \`${entry.id}\` sweep declaration is frozen`);
        assert.equal(entry.floor > 0, true, `…and declares a floor greater than zero (${entry.floor})`);
      }
    },
  },
  {
    name: "acd-duplication-rule-states-its-blindness: the corpus is discovered through RUNTIMES and RESOURCE_KINDS, never through a path literal",
    async run() {
      const { code, rest } = censusableSource();

      assert.match(code, /import \{[^}]*RESOURCE_KINDS[^}]*RUNTIMES[^}]*\} from "\.\.\/model\.mjs"/u, `${MODULE_REL} takes the runtimes and the resource kinds from the model, which is their one home`);

      // NO SECOND SPELLING. The forbidden literals are derived FROM the model rather than typed
      // here, so a fourth runtime or a fifth kind is covered on arrival.
      for (const runtime of Object.values(RUNTIMES)) {
        assert.equal(rest.includes(runtime.localRoot), false, `${MODULE_REL} spells no literal for the ${runtime.id} local root (${runtime.localRoot})`);
      }
      for (const kind of Object.values(RESOURCE_KINDS)) {
        for (const quote of ['"', "'"]) {
          assert.equal(rest.includes(`${quote}${kind.plural}${quote}`), false, `${MODULE_REL} spells no literal for the ${kind.id} kind's directory (${kind.plural})`);
        }
      }

      // And behaviourally: what is INSTALLED is judged, and a bundle copy in the same project is not.
      const shared = sentenceOfBytes(SENTENCE_FLOOR + 40, "juliet");
      const bundleOnly = await laneOver({
        ".claude/commands/one.md": "An installed document sharing nothing.",
        "src/bundle/commands/one.md": shared,
        "src/bundle/commands/two.md": shared,
      });
      assert.deepEqual(bundleOnly.pairs, [], "a duplicate that exists only in a `src/bundle` copy is not reported — what runs is what is installed");

      const installed = await laneOver({ ".claude/commands/one.md": shared, ".claude/rules/two.md": shared });
      assert.equal(installed.pairs.length, 1, "…and the same sentence in two INSTALLED documents is");
      assert.equal(installed.pairs[0].message.includes("src/bundle"), false, "naming the installed paths, never a bundle copy");
    },
  },
];
