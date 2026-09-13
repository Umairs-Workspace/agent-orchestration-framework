// Fitness function: acd-motion-has-an-escape (milestone 49 / DESIGN DG-49-6 / ARCHITECTURE
// §Fitness functions — the NINTH, added 2026-08-13 at the PO's story-06 ruling) —
//
//   "Every `animate-*` utility EMITTED anywhere under `ui/src/**` is named in
//    `ui/src/index.css`'s `@media (prefers-reduced-motion: reduce)` block, and named there in a
//    rule that actually stops the animation."
//
// WHY IT EXISTS, and it is a defect this repo SHIPPED rather than a hazard it imagined.
// Until 49/06, `ui/src/terminal/palette.mjs` carried a comment stating that both terminal pulses
// honoured `prefers-reduced-motion` "through the existing scoping convention in
// `ui/src/index.css`". The only such rule in the whole of `ui/` named `.aof-pending` — a
// different class over a different animation — so the two state dots kept pulsing for every
// operator whose system had asked them to stop. Measured in a real browser at the refine:
// with reduce FORCED, `connecting` and `streaming` both reported `animationName: "pulse", 2s`
// while `.aof-pending` correctly reported `none, 0s`.
//
// A DEFECT PLUS A COMMENT ASSERTING IT IS HANDLED IS WORSE THAN AN UNHANDLED DEFECT, because it
// stops the next reader looking — and it very nearly stopped this gate looking too. THE TRAP,
// stated because it INVERTS the obvious design: a naive `prefers-reduced-motion` word sweep of
// `palette.mjs` was GREEN on the live defect. The string was present; it was present in a false
// sentence. So:
//   · the detector reads COMMENT-STRIPPED source, LINE comments first and BLOCK comments second
//     (TECH_DEBT item 24 — the other order lets a line comment containing `/*` delete the rest of
//     the file, which on an absence sweep is a silent PASS); and
//   · THE PLANT IS A MOTION CLASS EMITTED WITH NO ESCAPE, NEVER A MISSING WORD. Its companion is
//     a file whose only occurrence of `prefers-reduced-motion` is inside a comment, which must
//     NOT satisfy the gate. Both are required, and the second is the one that proves the gate
//     measures the MECHANISM rather than the prose.
//
// SET CONTAINMENT, NOT A WORD SEARCH. The question is "is every emitted utility covered", which
// is answerable only by comparing two sets. And "named" is not enough on its own: a rule that
// names `.animate-pulse` and then sets something other than the animation would satisfy a
// name-only check while leaving the dots pulsing, so `silencesAnimation` is part of the
// membership test.
//
// SCOPE IS THE WHOLE OF `ui/src/**`, DELIBERATELY, and that is a consequence of the MECHANISM
// RULING rather than scope creep by this gate. ARCHITECTURE ruled ONE CSS rule over twelve
// call-site edits: twelve per-site escapes are twelve edits and a thirteenth site is one diff
// away, while the block covers a site nobody has written yet. Because the block is the mechanism,
// the tree-wide set containment is a COMPLETE proof of the invariant from source — which is the
// reason the browser lane was declinable. The condition that overturns that: the first invariant
// here whose truth depends on rendered geometry or computed style rather than on a declaration
// we own.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  EMITTING_EXTENSIONS,
  UI_SRC,
  UI_STYLESHEET,
  carriesAMotionVariant,
  classesSilencedUnderReduce,
  collectFiles,
  emittedAnimateClasses,
  reducedMotionBlocks,
  rel,
  stripComments,
  unescapedMotionSites,
} from "../../support/motion-escape-detectors.mjs";

// The sweep found the tree, not an empty directory.
//
// TWO NUMBERS, AND THEY ARE NOT THE SAME NUMBER — stated because the refine's prose and this
// gate's arithmetic disagreed once already. `ui/src` carries TWELVE `animate-pulse`
// OCCURRENCES across EIGHT files (Shell.tsx has three, PageStates.tsx two, and the other six
// files one each, `ui/src/terminal/palette.mjs` among them). The containment question is about
// DISTINCT utilities per file — `animate-pulse` twice in one file is one class to escape — so
// this gate counts FILES that emit at least one `animate-*`, and its floor is set below the
// measured eight so removing a skeleton does not turn the gate red for a reason that has nothing
// to do with the rule, and well above zero so a broken directory walk cannot pass vacuously.
const EMITTING_FILE_FLOOR = 6;

export const archTests = [
  {
    name: "arch/49 DG-49-6 (acd-motion-has-an-escape): every `animate-*` utility emitted under ui/src/** is silenced by the ONE reduced-motion block in ui/src/index.css",
    run: async () => {
      const css = await readFile(UI_STYLESHEET, "utf8");
      const files = await collectFiles(UI_SRC, EMITTING_EXTENSIONS);
      assert.ok(files.length >= 40, `the ui/src tree was actually walked (non-vacuous): ${files.length} files`);

      const blocks = reducedMotionBlocks(css);
      assert.equal(
        blocks.length,
        1,
        "the stylesheet has exactly ONE `@media (prefers-reduced-motion: reduce)` block. A second block is a second home for one fact — the shape milestone 49 exists to end — and it makes 'is this utility escaped' a question with two answers.",
      );

      const { offenders, emittedBy, silenced } = await unescapedMotionSites(files, css, readFile);

      assert.ok(
        emittedBy.size >= EMITTING_FILE_FLOOR,
        `the emitted-utility sweep has teeth: ${emittedBy.size} file(s) under ui/src emit an \`animate-*\` utility, floor ${EMITTING_FILE_FLOOR}. A sweep that finds nothing is contained by anything.`,
      );
      assert.ok(
        emittedBy.has("ui/src/terminal/palette.mjs"),
        "…and the sweep reaches the terminal's own motion column — the file this story repairs. A tree-wide gate that happened to miss the one file it was written for is the vacuity this milestone keeps finding.",
      );
      assert.ok(silenced.size > 0, "the reduced-motion block silences at least one class — an empty escape satisfies containment vacuously");

      assert.deepEqual(
        offenders,
        [],
        "an `animate-*` utility is emitted with NO reduced-motion escape. This is the shipped defect DG-49-6 was written for: motion that an operator's own accessibility setting cannot stop, on a screen designed to be left open all day. THE FIX IS ONE CSS RULE, NOT ONE PER SITE — name the utility in `ui/src/index.css`'s `@media (prefers-reduced-motion: reduce)` block with `animation: none`, which covers every site including the ones nobody has written yet (49/ARCHITECTURE §Fitness functions, MECHANISM RULING).\n"
          + `  emitted, by file:\n${[...emittedBy].map(([file, list]) => `    ${file} → ${list.join(", ")}`).join("\n")}\n`
          + `  silenced under reduce: ${[...silenced].sort().join(", ") || "(nothing)"}`,
      );
    },
  },

  {
    name: "arch/49 DG-49-6 (acd-motion-has-an-escape): self-check — the detector FIRES on a utility with no escape, and a `prefers-reduced-motion` mention that is only a COMMENT satisfies nothing",
    run: async () => {
      // ── THE STRIPPER FIRST. Every clause below is an ABSENCE/PRESENCE reading over stripped
      //    source, so a blinded stripper is a silently green gate (TECH_DEBT item 24).
      const trap = ['// see /* the block-comment trap */ below', 'const marker = "animate-marker";'].join("\n");
      assert.match(
        stripComments(trap),
        /animate-marker/,
        "stripComments() ate the file: a LINE comment carrying `/*` opened a block that swallowed the code below it. Strip line comments FIRST (TECH_DEBT item 24) — the block-first order turns every sweep here into a vacuous pass.",
      );
      assert.doesNotMatch(stripComments("/* animate-ghost */\nconst keep = 1;"), /animate-ghost/, "…and a genuine block comment is still removed");

      const CLEAN_CSS = [
        "@media (prefers-reduced-motion: reduce) {",
        "  .aof-pending { animation: none; }",
        "  .animate-pulse { animation: none; }",
        "}",
      ].join("\n");

      // ── PLANT 1, the one ARCHITECTURE names: a ui/src file emitting `animate-spin` while the
      //    block names only `animate-pulse`. It is fed to the SHIPPED detector — m46 found a plant
      //    being fed to a locally re-implemented copy, so the shipped function was never once
      //    driven to a violation.
      const cleanSource = 'const dot = "inline-block h-2 w-2 animate-pulse rounded-full bg-primary";';
      const planted = 'const dot = "inline-block h-2 w-2 animate-spin rounded-full bg-primary";';
      assert.notEqual(planted, cleanSource, "self-check: the plant LANDED (it differs from the clean baseline)");

      const readPlanted = async (file) => (String(file).endsWith("planted.tsx") ? planted : cleanSource);
      const quiet = await unescapedMotionSites([path.join(UI_SRC, "clean.tsx")], CLEAN_CSS, readPlanted);
      assert.deepEqual(quiet.offenders, [], "self-check: the detector is QUIET on a clean baseline — a detector only ever shown to stay quiet is one mutation from asserting nothing, and one only ever shown to fire is a detector nobody can trust green");

      const fired = await unescapedMotionSites([path.join(UI_SRC, "planted.tsx")], CLEAN_CSS, readPlanted);
      assert.deepEqual(
        fired.offenders,
        ["ui/src/planted.tsx → animate-spin"],
        "self-check: the detector FIRES on an emitted utility the reduce block does not name, and names the SITE in its refusal",
      );

      // ── PLANT 2, the companion, and the one that proves the gate measures the mechanism rather
      //    than the prose: a file whose ONLY occurrence of `prefers-reduced-motion` is a comment.
      //    That is the LIVE defect this milestone found (palette.mjs, until 49/06) and a naive
      //    word sweep is GREEN on it.
      const commentOnly = [
        "// Both pulses honour `prefers-reduced-motion` through the existing scoping convention in",
        "// `ui/src/index.css`, which is why the class is the house's own.",
        'export const MOTION = Object.freeze({ none: "", pulse: "animate-spin" });',
      ].join("\n");
      assert.match(commentOnly, /prefers-reduced-motion/, "self-check: plant 2 LANDED — the false sentence is present in the raw file, which is exactly what makes a word sweep green on it");
      assert.doesNotMatch(stripComments(commentOnly), /prefers-reduced-motion/, "self-check: …and it is present ONLY as prose, so the comment-stripped code says nothing about reduced motion");

      const readCommentOnly = async () => commentOnly;
      const proseIsNoEscape = await unescapedMotionSites([path.join(UI_SRC, "prose.mjs")], CLEAN_CSS, readCommentOnly);
      assert.deepEqual(
        proseIsNoEscape.offenders,
        ["ui/src/prose.mjs → animate-spin"],
        "self-check: a `prefers-reduced-motion` sentence in a COMMENT satisfies nothing. This is the whole finding: the naive sweep certified the exact defect it was written for, out of a comment.",
      );

      // ── AND "NAMED" IS NOT ENOUGH. A block that names the utility without stopping its
      //    animation is the vacuous half of the containment.
      const namedButNotSilenced = "@media (prefers-reduced-motion: reduce) {\n  .animate-spin { opacity: 1; }\n}";
      const notSilenced = await unescapedMotionSites([path.join(UI_SRC, "planted.tsx")], namedButNotSilenced, readPlanted);
      assert.deepEqual(
        notSilenced.offenders,
        ["ui/src/planted.tsx → animate-spin"],
        "self-check: naming the class in the reduce block without stopping the animation does NOT count as an escape",
      );
      assert.ok(classesSilencedUnderReduce(CLEAN_CSS).has("animate-pulse"), "self-check: …while a rule that does stop it does count");

      // ── THE SECOND SANCTIONED MECHANISM is recognised as CODE, not as prose. DESIGN DG-49-6
      //    clause 1 offers `motion-safe:`/`motion-reduce:` variants as the alternative to the CSS
      //    block; ARCHITECTURE ruled the block, but the detector must not be blind to the other.
      assert.equal(carriesAMotionVariant("motion-safe:animate-pulse"), true, "self-check: a motion-safe variant is a reduced-motion-conditional class");
      assert.equal(carriesAMotionVariant("animate-pulse"), false, "self-check: a bare utility is not");
      assert.deepEqual([...emittedAnimateClasses("const c = 'motion-safe:animate-pulse';")], ["animate-pulse"], "self-check: a variant prefix still yields the bare utility a stylesheet rule has to name");

      // ── THE HISTORICAL PLANT, over the REAL TREE. The plants above are synthesized files; this
      //    one is the escape block EXACTLY AS IT SHIPPED, driven against every real file under
      //    `ui/src`. It answers the question a green gate cannot: would this instrument have
      //    caught the defect it was written for? The PO's ruling is that a gate which only ever
      //    shows the rule is present is one refactor from asserting nothing.
      const SHIPPED_BLOCK_BEFORE_49_06 = "@media (prefers-reduced-motion: reduce) {\n  .aof-pending {\n    animation: none;\n  }\n}";
      const realFiles = await collectFiles(UI_SRC, EMITTING_EXTENSIONS);
      const wouldHaveCaught = await unescapedMotionSites(realFiles, SHIPPED_BLOCK_BEFORE_49_06, readFile);
      assert.ok(
        wouldHaveCaught.offenders.length >= EMITTING_FILE_FLOOR,
        `self-check: against the escape block as it SHIPPED — \`.aof-pending\` alone — this gate goes red on the real tree, refusing ${wouldHaveCaught.offenders.length} file(s). If it does not, the gate is measuring something other than the escape.`,
      );
      assert.ok(
        wouldHaveCaught.offenders.includes("ui/src/terminal/palette.mjs → animate-pulse"),
        `self-check: …and the terminal's own motion column is AMONG the files it refuses — the one a comment in that very file claimed was already covered. (Order is alphabetical by path, so it is last rather than first; the claim is membership, never position.) Refused: ${wouldHaveCaught.offenders.join(", ")}`,
      );
      assert.deepEqual(
        (await unescapedMotionSites(realFiles, await readFile(UI_STYLESHEET, "utf8"), readFile)).offenders,
        [],
        "self-check: …and the SAME tree against the SAME detector with the CURRENT stylesheet is clean — so the redness above is the escape block's doing and nothing else's. Two runs, one variable.",
      );
    },
  },

  {
    name: "arch/49 DG-49-6 (acd-motion-has-an-escape): the escape is read from ui/src/index.css itself and names the terminal ramp's own utility — the two artefacts a reader can check without running anything",
    run: async () => {
      const css = await readFile(UI_STYLESHEET, "utf8");
      const clean = stripComments(css);
      assert.ok(clean.replace(/\s+/g, "").length > 0, `${rel(UI_STYLESHEET)}: the comment-stripped stylesheet is EMPTY — that is a blinded stripper, not a clean file`);

      const silenced = classesSilencedUnderReduce(css);
      assert.ok(
        silenced.has("aof-pending"),
        "`.aof-pending`'s own reduce rule is the escape that already WORKED (measured: `none`/`0s` under reduce, `aof-shimmer`/`0.9s` without). Story 49/06 does not touch it, and a mechanism that dropped it would have traded one regression for another.",
      );
      assert.ok(
        silenced.has("animate-pulse"),
        "the utility the terminal's state ramp emits for `connecting…` and `streaming` is silenced by name. Without this row the two dots pulse through an operator's own accessibility setting — the shipped defect DG-49-6 found.",
      );
    },
  },
];
