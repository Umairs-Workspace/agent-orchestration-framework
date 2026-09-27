// Fitness function FF-7101 for milestone 71 / ADR-002:
// "A bound stated in a bundled prompt names its home, and equals it."
//
// The complement of `acd-loop-cap-single-home`, which walks `src/**/*.mjs` and never reads
// `src/bundle/**`. Measured at HEAD before 71/00: `src/bundle/loops/*.md` named four `work.loop.*`
// keys and all four resolved, while `src/bundle/commands/*.md` named ZERO keys and stated three
// numerals — "Review runs once by default", "Three rounds is the hard cap" (×2). Three untethered
// numerals, and nothing that failed when their one home changed.
//
// THREE LEGS, and each is derived from `src/loop-bounds.mjs` rather than enumerated here:
//   (a) every `work.loop.*` key a bundled asset names RESOLVES through `LOOP_BOUND_VALUE_RESOLVERS`;
//   (b) every value a bundled asset STATES for such a key equals that bound's own declared answer —
//       binding to the CLAMP when an exported clamp identifier stands in the same sentence, and to
//       the config key otherwise (ADR-009 §6);
//   (c) the three bound facts the COMMANDS state, and the ceiling each loop record declares, name
//       their home.
//
// SCOPE IS A KEY'S NEIGHBOURHOOD, NEVER A NUMERAL HUNT (ADR-002). Two narrowings do that work, and
// both exist because a wider instrument was measured to red on correct prose:
//   · the SENTENCE is the neighbourhood, so ADR-006's spawn stagger and the 390/768/1280 breakpoints
//     — numerals beside no key and no clamp — are out of reach by construction;
//   · a cardinal is a STATED VALUE only when it quantifies the bound's OWN UNIT, read off the key's
//     last camelCase segment (`reviewRounds` → "round"). Without that leg this gate reds on
//     `loops/operator.md:28` and `loops/mesh-assignment-reclaim.md:53`, which both say "the two
//     numbers this gate resolves — `work.loop.heartbeatMs` and …": a count of the keys named, not a
//     value of either. That is m01/R1's standing lesson — a requiring-grep control that penalises
//     correct prose gets weakened or deleted, so it is narrowed here instead of shipped broad.
//
// THE NARROWING'S KNOWN LIMIT, stated rather than discovered: the unit is the key's last camelCase
// segment, so a bound whose prose counts it in a DIFFERENT unit than its key names — "the 30 minute
// start-to-close (`work.loop.startToCloseMs`)", counted in minutes against a key that says `Ms` — is
// not bound, and its drift is missed. That is a false NEGATIVE on a bound no bundled asset states
// today (only the two `*Rounds` keys carry values here), and the trade is deliberate: leg (b) exists
// to catch a numeral that drifted from its home, and a control that reds on correct prose does not
// survive to catch anything. The fix, if a millisecond bound ever gains a stated value, is to state
// it in the key's own unit rather than to widen the match.
//
// Every leg is driven by PLANTING a mutation and reading what the pure checker answers, so the
// control is proven non-vacuous in both directions rather than asserted to be.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as loopBounds from "../../../src/loop-bounds.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BUNDLE = path.join(root, "src", "bundle");

// Generated indexes, not authored prose. `manifest.json` is a whole-bundle content address and
// `bundle.json` is the member list; neither states a bound, and both would drag derived bytes into
// a sweep whose subject is what an agent READS.
const GENERATED = Object.freeze(new Set(["manifest.json", "bundle.json"]));

// The clamps, DERIVED from the leaf's own exports rather than named here: a clamp added there is in
// this control's reach the day it lands.
const CLAMPS = Object.freeze(Object.entries(loopBounds)
  .filter(([name, value]) => /^MAX_[A-Z0-9_]+$/u.test(name) && typeof value === "number")
  .map(([name, value]) => Object.freeze({ name, value })));

const CARDINALS = new Map([
  ["zero", 0], ["once", 1], ["one", 1], ["twice", 2], ["two", 2], ["three", 3], ["four", 4],
  ["five", 5], ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10],
]);

// The three bound facts the COMMANDS must state (ADR-002 leg c) and the ceiling each framework loop
// record declares. `anchor` locates the sentence that states the fact; `home` is what that sentence
// must name beside its value.
export const BOUND_FACTS = Object.freeze([
  { asset: "commands/continue.md", fact: "review rounds by default", anchor: /Review runs one round by default/u, home: "work.loop.reviewRounds" },
  { asset: "commands/continue.md", fact: "the review hard cap", anchor: /Three rounds is the hard cap/u, home: "MAX_REVIEW_ROUNDS" },
  { asset: "commands/continue.md", fact: "the build no-progress stop", anchor: /consecutive no-progress rounds/u, home: "work.loop.buildNoProgressRounds" },
  { asset: "commands/code-review.md", fact: "the review hard cap", anchor: /Three rounds is the hard cap/u, home: "MAX_REVIEW_ROUNDS" },
  { asset: "loops/review-fix-rereview.md", fact: "the review ceiling", anchor: /^ceiling: \[config:/mu, home: "work.loop.reviewRounds" },
  { asset: "loops/build-to-green.md", fact: "the build ceiling", anchor: /^ceiling: \[config:/mu, home: "work.loop.buildNoProgressRounds" },
].map((row) => Object.freeze(row)));

// ── the cuts ────────────────────────────────────────────────────────────────
// A leading list marker is punctuation, not a numeral: "2. `aof work doctor <ref>`" states no value.
const stripListMarkers = (text) => text.replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/gmu, "");
// Inline code carries paths and line ranges (`…/continue.md:55-57`) whose digits are citations, not
// values. The key itself is read from the RAW sentence; only the numeral hunt runs over stripped prose.
const stripCode = (text) => text.replace(/`[^`]*`/gu, " ");

// A `key: value` declaration — a loop record's `ceiling:` pointer and its frontmatter siblings.
const FIELD_LINE = /^[A-Za-z][\w.-]*:\s/u;

// Sentences, never lines: a bound statement wraps, and a paragraph holds several unrelated claims.
// The one exception is a FIELD declaration, whose neighbourhood is its own line — collapsing a
// frontmatter block into one blob would put every field in every other field's neighbourhood.
export function sentences(text) {
  const units = [];
  let prose = [];
  const flush = () => {
    for (const block of prose.join("\n").split(/\n[ \t]*\n/u)) {
      for (const sentence of block.replace(/\s+/gu, " ").trim().split(/(?<=[.!?])\s+/u)) {
        if (sentence.length > 0) units.push(sentence);
      }
    }
    prose = [];
  };
  for (const line of stripListMarkers(text).split("\n")) {
    if (FIELD_LINE.test(line)) {
      flush();
      units.push(line.trim());
    } else prose.push(line);
  }
  flush();
  return units;
}

const stem = (word) => {
  const lower = word.toLowerCase();
  return lower.length > 3 && lower.endsWith("s") ? lower.slice(0, -1) : lower;
};

// The unit a bound is counted in, read off the NAME's own last segment — `work.loop.reviewRounds`
// → "round", `MAX_REVIEW_ROUNDS` → "round", `work.loop.heartbeatMs` → "ms". Derived, so a renamed
// key brings its unit with it and there is nothing here to forget to update.
export function unitOf(name) {
  const tail = name.split(".").pop();
  const segments = tail.includes("_") ? tail.split("_") : tail.split(/(?=[A-Z])/u);
  return stem(segments[segments.length - 1]);
}

// The values a sentence STATES for a bound counted in `unit`: a cardinal (digit or word) whose
// following few words reach that unit. "2 consecutive no-progress rounds" states 2; "the two numbers
// this gate resolves" states nothing, and neither does "whose one home is `src/loop-bounds.mjs`".
export function statedValues(sentence, unit) {
  const words = stripCode(sentence).split(/[^\w-]+/u).filter(Boolean);
  const stated = [];
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i].toLowerCase();
    const value = /^\d+$/u.test(word) ? Number(word) : CARDINALS.get(word);
    if (value === undefined) continue;
    const reaches = words.slice(i + 1, i + 5).some((next) => stem(next) === unit);
    if (reaches) stated.push(value);
  }
  return stated;
}

// A named key, read WHOLE — a dotted key (129/07: `work.loop.agents.refine.mode`) is one key,
// never its first two segments (`work.loop.agents`), which no map carries.
const KEY_RE = /work\.loop\.[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*/gu;

// ── the checker (pure over a supplied asset set, so mutations can be planted) ─
export function boundStatementProblems(assets) {
  const problems = [];
  for (const { rel, text } of assets) {
    for (const sentence of sentences(text)) {
      const named = [...new Set(sentence.match(KEY_RE) ?? [])];
      if (named.length === 0) continue;

      // (a) — resolution, read from the leaf's own map.
      const known = [];
      for (const key of named) {
        if (Object.prototype.hasOwnProperty.call(loopBounds.LOOP_BOUND_VALUE_RESOLVERS, key)) known.push(key);
        else problems.push(`${rel}: names \`${key}\`, which LOOP_BOUND_VALUE_RESOLVERS does not carry — an invented or renamed key`);
      }
      if (known.length === 0) continue;

      // (b) — a stated value binds to the CLAMP when one stands in the same sentence, else to the
      // key's own resolved default. Both are read from `src/loop-bounds.mjs`.
      const clamps = CLAMPS.filter((clamp) => sentence.includes(clamp.name));
      for (const key of known) {
        const resolved = loopBounds.LOOP_BOUND_VALUE_RESOLVERS[key](undefined);
        const admissible = clamps.length > 0 ? clamps.map((clamp) => clamp.value) : [resolved];
        const authority = clamps.length > 0 ? clamps.map((clamp) => clamp.name).join(" / ") : key;
        for (const stated of statedValues(sentence, unitOf(key))) {
          if (!admissible.includes(stated)) {
            problems.push(`${rel}: states ${stated} for \`${key}\`, but ${authority} resolves to ${admissible.join(" / ")}`);
          }
        }
      }
    }
  }
  return problems;
}

// (c) — the bound facts the bundle must state, each naming its home in the sentence that states it.
export function boundFactProblems(assets) {
  const problems = [];
  const byRel = new Map(assets.map(({ rel, text }) => [rel, text]));
  for (const row of BOUND_FACTS) {
    const text = byRel.get(row.asset);
    if (text === undefined) {
      problems.push(`${row.asset}: NOT FOUND — the asset stating "${row.fact}" is not in the bundle`);
      continue;
    }
    if (!row.anchor.test(text)) {
      problems.push(`${row.asset}: NOT FOUND — the bound fact "${row.fact}" is not stated`);
      continue;
    }
    const stating = sentences(text).filter((sentence) => row.anchor.test(sentence));
    if (!stating.some((sentence) => sentence.includes(row.home))) {
      problems.push(`${row.asset}: the bound fact "${row.fact}" states no home — \`${row.home}\` is absent from the sentence that states it`);
    }
  }
  return problems;
}

async function bundleAssets() {
  const assets = [];
  const walk = async (dir, prefix) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), rel);
      else if (!GENERATED.has(entry.name)) assets.push({ rel, text: await readFile(path.join(dir, entry.name), "utf8") });
    }
  };
  await walk(BUNDLE, "");
  return assets;
}

const planted = (assets, rel, mutate) => assets.map((asset) => (asset.rel === rel ? { ...asset, text: mutate(asset.text) } : asset));

export const archTests = [
  {
    name: "arch/71 FF-7101 (acd-prompt-bounds-name-their-home): every `work.loop.*` key the bundle names resolves, and every value it states equals its bound's own answer",
    run: async () => {
      const assets = await bundleAssets();
      assert.ok(assets.length > 60, `the bundle was actually read: ${assets.length} assets`);
      assert.ok(CLAMPS.length > 0, "the clamp set was derived from the leaf's exports");
      assert.ok(assets.some(({ rel }) => rel === "commands/continue.md"), "continue.md is in the swept set");

      assert.deepEqual(boundStatementProblems(assets), [], "legs (a) and (b) over the shipped bundle");
      assert.deepEqual(boundFactProblems(assets), [], "leg (c) — the bound facts the bundle states each name their home");
    },
  },
  {
    name: "arch/71 FF-7101: leg (a) — a key the resolver map does not carry is named",
    run: async () => {
      const assets = await bundleAssets();
      const renamed = planted(assets, "commands/continue.md", (text) => text.replaceAll("work.loop.reviewRounds", "work.loop.reviewRoundz"));
      const problems = boundStatementProblems(renamed);
      assert.ok(
        problems.some((problem) => problem.includes("work.loop.reviewRoundz") && problem.includes("LOOP_BOUND_VALUE_RESOLVERS")),
        `a renamed key is reported naming the asset and the unknown key\n${problems.join("\n")}`,
      );
      // 129/07 — a DOTTED key is read whole: the real prompt's `work.loop.agents.refine.mode` resolves
      // (never reported as `work.loop.agents`), and a wrong last segment is reported whole.
      assert.ok(assets.some((asset) => asset.rel === "commands/refine.md" && asset.text.includes("work.loop.agents.refine.mode")), "commands/refine.md: NOT FOUND — the prompt does not name work.loop.agents.refine.mode");
      const dotted = planted(assets, "commands/refine.md", (text) => text.replaceAll("work.loop.agents.refine.mode", "work.loop.agents.refine.wrong"));
      const dottedProblems = boundStatementProblems(dotted);
      assert.ok(
        dottedProblems.some((problem) => problem.includes("names `work.loop.agents.refine.wrong`")),
        `a dotted key is reported WHOLE\n${dottedProblems.join("\n")}`,
      );
      assert.ok(!dottedProblems.some((problem) => problem.includes("names `work.loop.agents`")), "…never truncated to its second segment");
    },
  },
  {
    name: "arch/71 FF-7101: leg (b) — a stated value one off its key's default, and one borrowed from another loop key, are each reported",
    run: async () => {
      const assets = await bundleAssets();
      const defaultRounds = loopBounds.LOOP_BOUND_VALUE_RESOLVERS["work.loop.buildNoProgressRounds"](undefined);
      assert.equal(defaultRounds, loopBounds.DEFAULT_BUILD_NO_PROGRESS_ROUNDS, "the resolved default is the leaf's own");

      for (const [label, stated] of [["one more", defaultRounds + 1], ["one less", defaultRounds - 1], ["another loop key's default", loopBounds.DEFAULT_REVIEW_ROUNDS]]) {
        if (stated === defaultRounds) continue;
        const mutated = planted(assets, "commands/continue.md", (text) =>
          text.replace(/\*\*\d+ consecutive no-progress rounds\*\*/u, `**${stated} consecutive no-progress rounds**`));
        const problems = boundStatementProblems(mutated);
        assert.ok(
          problems.some((problem) => problem.includes("commands/continue.md") && problem.includes("work.loop.buildNoProgressRounds") && problem.includes(`states ${stated}`)),
          `${label}: the asset, the key, the stated value and the resolved one are all named\n${problems.join("\n")}`,
        );
      }

      // …and the key standing alone with no numeral is GREEN, because a citation with no value
      // states nothing to compare.
      const citationOnly = planted(assets, "commands/continue.md", (text) =>
        text.replace(/\*\*\d+ consecutive no-progress rounds\*\*/u, "**consecutive no-progress rounds**"));
      assert.deepEqual(
        boundStatementProblems(citationOnly).filter((problem) => problem.includes("buildNoProgressRounds")),
        [],
        "a citation with no numeral states no value",
      );
    },
  },
  {
    name: "arch/71 FF-7101: leg (b) — the hard-cap sentence binds to the CLAMP, not to the config key's default (ADR-009 §6)",
    run: async () => {
      const assets = await bundleAssets();
      // The trap this leg exists for: `MAX_REVIEW_ROUNDS` is 3 and `work.loop.reviewRounds` resolves
      // to 1, and the correct sentence carries both. A bare proximity check reds on it.
      assert.notEqual(loopBounds.MAX_REVIEW_ROUNDS, loopBounds.LOOP_BOUND_VALUE_RESOLVERS["work.loop.reviewRounds"](undefined), "the clamp and the default really do differ");
      assert.deepEqual(boundStatementProblems(assets).filter((problem) => problem.includes("reviewRounds")), [], "the shipped hard-cap sentence is green");

      // Drop the clamp identifier and the same numeral must bind to the key instead — and fail.
      const unclamped = planted(assets, "commands/continue.md", (text) => text.replaceAll("`MAX_REVIEW_ROUNDS` clamp on ", "clamp on "));
      assert.ok(
        boundStatementProblems(unclamped).some((problem) => problem.includes("work.loop.reviewRounds") && problem.includes(`states ${loopBounds.MAX_REVIEW_ROUNDS}`)),
        "without the clamp in the sentence the numeral binds to the key, and 3 is not the key's default",
      );
    },
  },
  {
    name: "arch/71 FF-7101: leg (c) — deleting any one of the three command bound facts is reported",
    run: async () => {
      const assets = await bundleAssets();
      const deletions = [
        ["the review default", "commands/continue.md", (text) => text.replaceAll("work.loop.reviewRounds", "the configured ceiling"), "review rounds by default"],
        ["the review hard cap", "commands/continue.md", (text) => text.replaceAll("MAX_REVIEW_ROUNDS", "the clamp"), "the review hard cap"],
        ["the build no-progress stop", "commands/continue.md", (text) => text.replaceAll("work.loop.buildNoProgressRounds", "the configured bound"), "the build no-progress stop"],
      ];
      for (const [label, rel, mutate, fact] of deletions) {
        const problems = boundFactProblems(planted(assets, rel, mutate));
        assert.ok(
          problems.some((problem) => problem.includes(rel) && problem.includes(fact)),
          `${label}: the missing bound fact is named\n${problems.join("\n")}`,
        );
      }
      // …and the same for the loop records' declared ceilings.
      for (const rel of ["loops/review-fix-rereview.md", "loops/build-to-green.md"]) {
        const problems = boundFactProblems(planted(assets, rel, (text) => text.replace(/^ceiling: .*$/mu, "ceiling: uncapped")));
        assert.ok(problems.some((problem) => problem.includes(rel)), `${rel}: a ceiling that names no home is reported\n${problems.join("\n")}`);
      }
    },
  },
  {
    name: "arch/71 FF-7101: a numeral that names no key and no clamp is OUT OF REACH by construction",
    run: async () => {
      const assets = await bundleAssets();
      const plants = [
        ["a spawn stagger stated in seconds", "\n\nStagger the spawns by 5 seconds so the toolchain is not hit by every lane at once.\n"],
        ["the breakpoints", "\n\nRender at the 390 / 768 / 1280 breakpoints.\n"],
        ["a bare numeral in prose", "\n\nMeasured across 26 stories, exactly 1 under-declares its write set.\n"],
        // The measured false positive this control was narrowed for: a COUNT of the keys named,
        // in the same sentence as one of them.
        ["a count of the keys named", "\n\nThe two numbers this gate resolves — `work.loop.heartbeatMs` and `mesh.presence.stalenessSeconds` — are changed by a hand edit.\n"],
      ];
      for (const [label, line] of plants) {
        const problems = boundStatementProblems(planted(assets, "commands/continue.md", (text) => text + line));
        assert.deepEqual(problems, [], `${label}: leaves the control green\n${problems.join("\n")}`);
      }
    },
  },
];
