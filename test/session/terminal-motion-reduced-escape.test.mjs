// test/session/terminal-motion-reduced-escape.test.mjs — traceability for milestone 49 / story 06 /
// task 00 (`tasks/00_the-pulse-stops-and-the-states-stay-distinguishable.feature`).
// DESIGN DG-49-6; ARCHITECTURE §Fitness functions (MECHANISM RULING + the declined browser lane).
//
// WHAT THIS SUITE COVERS, AND WHAT IT DELIBERATELY DOES NOT.
//
// The task's six scenarios are split three ways by what can honestly be measured, and the split
// is the ARCHITECT's, recorded in `49/ARCHITECTURE.md` §Fitness functions:
//   · SCENARIOS 1 and 5 — this file. They are answerable from the pure `.mjs` source plus the
//     text of `ui/src/index.css`, under plain `node`, with no browser and no DOM. This is the
//     lane that runs everywhere, including the WSL worker.
//   · SCENARIOS 2 and 3 — the computed-animation readings. **THE BROWSER LANE WAS DECLINED FOR
//     MILESTONE 49** and the contract's own header says what happens then: they move to `@manual`
//     unchanged. The reason they can be declined without weakening the proof is the MECHANISM
//     RULING — the escape is ONE CSS rule, so `acd-motion-has-an-escape`'s set containment over
//     `ui/src/**` is a COMPLETE proof of the invariant from source, and a browser would only
//     re-confirm that Chromium implements `@media (prefers-reduced-motion)`, which is a platform
//     fact rather than our invariant. The condition that overturns that decision is named there:
//     the first invariant whose truth depends on rendered geometry or computed style rather than
//     on a declaration we own.
//   · SCENARIO 4 is `@manual` (the real OPERATING-SYSTEM setting on a deployed build — a
//     command-line switch is a proxy for it) and SCENARIO 6 is `@uat` (DG-49-6's close condition:
//     render R-A captured twice and judged).
//
// THE GATE ITSELF IS NOT HERE, and that is on purpose. ARCHITECTURE is explicit that a structural
// set-containment assertion written as Gherkin is a fitness function in the wrong home; it lives
// at `test/arch/loop/acd-motion-has-an-escape.test.mjs` with the other eight, carrying both plants the
// PO's ruling requires (a motion class emitted with no escape, and a file whose only
// `prefers-reduced-motion` is a comment). What is HERE is the observable contract: the class the
// ramp emits is one a preference silences, motion is on exactly the two states that mean "expect
// this to change", and the module's stated mechanism is the mechanism actually in force.
//
// TRAP 1, AND IT IS WHY THIS STORY EXISTS AT ALL: a sweep that does not strip comments is GREEN
// on this defect. `prefers-reduced-motion` appears in `ui/src/terminal/palette.mjs` today — it
// appeared there while the defect was live, inside a false sentence. Every reading below is over
// `stripComments`ed source (LINE comments first, BLOCK comments second — TECH_DEBT item 24), from
// the ONE home, and the stripper is self-checked before it is trusted.
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
  reducedMotionBlocks,
  rel,
  stripComments,
} from "../support/motion-escape-detectors.mjs";

import { TERMINAL_MOTION_CLASS } from "../../ui/src/terminal/palette.mjs";
import {
  MOTION_NONE,
  MOTION_PULSE,
  TERMINAL_STATES,
  TERMINAL_STATE_LIST,
  UNKNOWN_STATE,
  describeTerminalState,
} from "../../ui/src/terminal/state-ramp.mjs";

const TERMINAL_DIR = path.join(UI_SRC, "terminal");
const PALETTE = path.join(TERMINAL_DIR, "palette.mjs");

// The two states DESIGN allows to carry motion, and the ONE reason they may: they mean "expect
// this to change". Every other row, and the unknown descriptor, is still.
const MOTION_CARRYING_STATES = [TERMINAL_STATES.CONNECTING, TERMINAL_STATES.STREAMING];

// The declaration's own comment: the contiguous run of line comments immediately ABOVE it. Cut on
// the language's structure (a comment run ends at the first non-comment line), never on a
// character window — `acd-test-suite-registration` lanes 3-4.
function commentAbove(source, declaration) {
  const lines = source.split(/\r?\n/);
  const at = lines.findIndex((line) => line.trimStart().startsWith(declaration));
  if (at < 0) return null;
  const run = [];
  for (let i = at - 1; i >= 0 && /^\s*\/\//.test(lines[i]); i -= 1) run.unshift(lines[i]);
  return run.length > 0 ? run.join("\n") : null;
}

// A comment run read as PROSE: the `//` markers dropped and whitespace collapsed, so a sentence
// is matched as a sentence rather than as whatever the wrap column happened to make of it. A
// claim does not stop being a claim because it crossed a line break — and a detector that only
// sees one wrapping is a detector one reflow from asserting nothing.
function proseOf(comment) {
  return String(comment ?? "").replace(/^[ \t]*\/\/ ?/gm, "").replace(/\s+/g, " ").trim();
}

// Every animation this prose NAMES — the utilities and the house classes. The point of reading
// them is that a comment may only claim coverage for animations that are actually covered.
function animationsNamedIn(prose) {
  const named = new Set();
  for (const match of String(prose).matchAll(/\b(animate-[a-z0-9][a-z0-9-]*|aof-[a-z0-9][a-z0-9-]*)\b/g)) named.add(match[1]);
  return named;
}

export const terminalMotionReducedEscapeTests = [
  // ═══ SCENARIO 1 ═══════════════════════════════════════════════════════════════════════════
  // "the motion class the ramp emits is one that a reduced-motion preference silences, by one of
  //  the two sanctioned mechanisms"
  //
  // THE DISJUNCTION IS DELIBERATE AND IS NOT NARROWED HERE. DESIGN DG-49-6 clause 1 leaves the
  // mechanism to the architect (the CSS block, or a `motion-safe:` variant on the class) and this
  // scenario is written to be satisfied by either. ARCHITECTURE then ruled the CSS block — so the
  // right half is what holds today — but the assertion stays a disjunction, because ratifying the
  // chosen mechanism as the ONLY mechanism would make a legitimate future change red for the
  // wrong reason.
  {
    name: "49/06 scenario 1: the motion class the ramp emits is one a reduced-motion preference silences, by one of the two sanctioned mechanisms",
    run: async () => {
      const css = await readFile(UI_STYLESHEET, "utf8");
      const paletteSource = await readFile(PALETTE, "utf8");

      // ── THE STRIPPER IS SELF-CHECKED BEFORE IT IS TRUSTED. Every clause below is a
      //    presence/absence reading over stripped source; a blinded stripper makes them all pass
      //    vacuously, which is exactly how this defect shipped (TECH_DEBT item 24).
      const trap = ['// see /* the block-comment trap */ below', 'const marker = "animate-marker";'].join("\n");
      assert.match(stripComments(trap), /animate-marker/, "stripComments() ate the file — strip LINE comments FIRST (TECH_DEBT item 24), or every sweep here is a silent pass");
      const paletteCode = stripComments(paletteSource);
      assert.ok(paletteCode.replace(/\s+/g, "").length > 0, `${rel(PALETTE)}: the comment-stripped source is EMPTY — a blinded stripper, not a clean file`);

      // ── "the check is made against the module's CODE, with comments stripped: a
      //    `prefers-reduced-motion` mention inside a comment satisfies nothing."
      //    Asserted as a PROPERTY OF THE METHOD rather than as a hope: the disjunction below is
      //    evaluated from the module's exported VALUE and from the stylesheet's RULES, and the
      //    palette's comment-stripped code says nothing about reduced motion at all — so no
      //    sentence in it can be doing the work.
      assert.doesNotMatch(
        paletteCode,
        /prefers-reduced-motion/,
        "the palette's CODE says nothing about reduced motion — the escape is a CSS rule, and if this ever changes the disjunction below must be satisfied by a variant on the class, not by prose",
      );

      // ── THE DISJUNCTION.
      const pulseClass = TERMINAL_MOTION_CLASS.pulse;
      const variantMechanism = carriesAMotionVariant(pulseClass);
      const silenced = classesSilencedUnderReduce(css);
      const cssMechanism = silenced.has(pulseClass.replace(/^.*:/, ""));

      assert.ok(
        variantMechanism || cssMechanism,
        `the class the ramp emits for \`connecting…\` and \`streaming\` — \`${pulseClass}\` — is silenced by NEITHER sanctioned mechanism. DESIGN DG-49-6 clause 1: either \`TERMINAL_MOTION_CLASS.pulse\` carries a reduced-motion-conditional variant, or a \`prefers-reduced-motion: reduce\` block in ui/src/index.css names the class it resolves to. Today the block silences: ${[...silenced].sort().join(", ") || "(nothing)"}.`,
      );

      // ── "…and whichever holds, it is spelled ONCE."
      const blocks = reducedMotionBlocks(css);
      assert.equal(blocks.length, 1, "the stylesheet has ONE reduced-motion block. Two blocks are two homes for one fact, and 'is this class escaped' becomes a question with two answers.");

      const terminalFiles = await collectFiles(TERMINAL_DIR, [...EMITTING_EXTENSIONS, ".tsx"]);
      assert.ok(terminalFiles.length >= 8, `the control's own set was actually read (non-vacuous): ${terminalFiles.length} files`);
      const spellings = [];
      for (const file of terminalFiles) {
        const code = stripComments(await readFile(file, "utf8"));
        for (const _match of code.matchAll(new RegExp(pulseClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))) spellings.push(rel(file));
      }
      assert.deepEqual(
        spellings,
        [rel(PALETTE)],
        `\`${pulseClass}\` has ONE home in the control — \`${rel(PALETTE)}\`. A render site that re-spells it is the second home DESIGN's motion column exists to prevent, and it is the site the one CSS rule would still cover but no reader would find.`,
      );

      // ── "`TERMINAL_MOTION_CLASS` still has exactly two members, `none` and `pulse`, and `none`
      //    is still the EMPTY string — an inert animation class is not the answer."
      //    THE TWO TRAPS THIS PINS: "fixing" it by deleting the pulse (the left column of
      //    scenario 2), and silencing motion for everyone by emitting an inert class instead.
      assert.deepEqual(Object.keys(TERMINAL_MOTION_CLASS).sort(), ["none", "pulse"], "the motion column still has exactly two members");
      assert.equal(TERMINAL_MOTION_CLASS.none, "", "`none` is still the EMPTY string: a state that does not mean 'expect this to change' emits no animation class at all, rather than an inert one");
      assert.ok(String(TERMINAL_MOTION_CLASS.pulse).length > 0, "…and `pulse` is still a real class: the fix is not the deletion of the signal");

      // ── "…the ramp's `motionClass` for every state." MOTION IS ON EXACTLY TWO STATES AND
      //    NOWHERE ELSE — including the `unknown` descriptor, which is NOT a member of
      //    `TERMINAL_STATES` and takes its own row, so a change applied by iterating the ramp
      //    table alone would leave it out.
      const everyState = [...TERMINAL_STATE_LIST, UNKNOWN_STATE, "a word the ramp does not know"];
      const pulsing = [];
      for (const word of everyState) {
        const descriptor = describeTerminalState(word);
        assert.ok(
          descriptor.motionClass === TERMINAL_MOTION_CLASS.none || descriptor.motionClass === TERMINAL_MOTION_CLASS.pulse,
          `${word}: the ramp emits a motion class from the ONE column (got ${JSON.stringify(descriptor.motionClass)})`,
        );
        if (descriptor.motionClass === TERMINAL_MOTION_CLASS.pulse) pulsing.push(descriptor.state);
      }
      assert.deepEqual(
        pulsing.sort(),
        [...MOTION_CARRYING_STATES].sort(),
        "motion is on exactly the two states that mean 'expect this to change' — and on nothing else. An escape that silences everything must not be reached by taking the pulse away from the people who did not ask for that.",
      );
      assert.equal(describeTerminalState("a word the ramp does not know").state, UNKNOWN_STATE, "…and the unknown descriptor is reached (non-vacuous: it is not a member of TERMINAL_STATES and carries its own row)");
      assert.equal(MOTION_PULSE, "pulse", "the ramp's motion token and the palette's key are the same word — the map lookup is name↔value matched");
      assert.equal(MOTION_NONE, "none", "…both of them");

      // ── "`.aof-pending`'s own reduce rule is still present and still names `.aof-pending`."
      //    A CSS-block fix edits the very rule this element depends on, so its survival is a
      //    clause of this scenario rather than a separate claim.
      assert.ok(
        silenced.has("aof-pending"),
        "the reduced-motion escape that already WORKED is undisturbed. Measured before this story: `.aof-pending` reported `none`/`0s` under reduce and `aof-shimmer`/`0.9s` without — it is the one escape that existed, and story 49/06 does not touch it.",
      );
    },
  },

  // ═══ SCENARIO 5 ═══════════════════════════════════════════════════════════════════════════
  // "the module's stated mechanism is the mechanism actually in force"
  //
  // PO RULE 3, and the half that makes this a repair rather than a patch. The defect survived a
  // whole milestone because a comment told the next reader it was handled. A corrected mechanism
  // beside a comment that was already wrong leaves the next author trusting the wrong half.
  {
    name: "49/06 scenario 5: the module's stated mechanism is the mechanism actually in force — the comment names the class that actually carries the escape, and every animation it claims is covered IS covered",
    run: async () => {
      const paletteSource = await readFile(PALETTE, "utf8");
      const css = await readFile(UI_STYLESHEET, "utf8");
      const comment = commentAbove(paletteSource, "export const TERMINAL_MOTION_CLASS");
      assert.ok(comment, "the motion column still carries a comment above it — the rationale is CORRECTED, never deleted (ADR-014/E3: a ceiling met by removing explanation raises the real cost while lowering the measured one)");

      // ── "the comment no longer asserts that these pulses are covered by a scoping convention
      //    that names only `.aof-pending`." The exact false sentence, pinned by its signature.
      assert.doesNotMatch(
        proseOf(comment),
        /honour\s+`?prefers-reduced-motion`?\s+through\s+the\s+existing\s+scoping\s+convention/i,
        "the false sentence is back. It claimed both pulses were covered by a convention in ui/src/index.css that named `.aof-pending` ALONE — a different class over a different animation — and it is the reason this defect survived a whole milestone with a reviewer, a design gate and 500+ tests looking straight at it.",
      );

      // ── "…and whatever mechanism it now describes is one a reader can verify from the two
      //    artefacts it points at, without running anything." THE TEETH: every animation the
      //    comment NAMES must be one the stylesheet actually silences. A comment that claims
      //    coverage for something uncovered is the defect, in general form.
      const silenced = classesSilencedUnderReduce(css);
      const claimed = animationsNamedIn(proseOf(comment));
      assert.ok(claimed.size > 0, "the comment names at least one animation — a mechanism description that names nothing is not checkable from the artefacts it points at");
      assert.deepEqual(
        [...claimed].filter((animation) => !silenced.has(animation)).sort(),
        [],
        `the comment names an animation the reduced-motion block does not silence. That is this milestone's finding in its general form: prose claiming coverage the mechanism does not provide. Silenced today: ${[...silenced].sort().join(", ") || "(nothing)"}.`,
      );

      // ── "…and it names the class or the rule that actually carries the escape, by the same
      //    spelling the code uses."
      assert.ok(
        claimed.has(TERMINAL_MOTION_CLASS.pulse.replace(/^.*:/, "")),
        `the comment names \`${TERMINAL_MOTION_CLASS.pulse}\` — the same spelling the map's value uses — so a reader can put the two artefacts side by side without translating between them`,
      );
      assert.match(proseOf(comment), /index\.css/, "…and it names the file the rule lives in");
      assert.match(proseOf(comment), /prefers-reduced-motion/, "…and the media query that carries it");

      // ── "…and it still says why motion is on exactly two states and why `none` is the empty
      //    string — the existing rationale is corrected, not deleted."
      assert.match(proseOf(comment), /EMPTY string/i, "the `none` rationale survives: it is the empty string on purpose, because a state that does not mean 'expect this to change' emits no animation class at all rather than an inert one");
      assert.match(proseOf(comment), /two states/i, "…and the two-states rationale survives");
      assert.match(proseOf(comment), /connecting/i, "…naming them, so a reader need not go to the ramp to find out which two");
      assert.match(proseOf(comment), /streaming/i, "…both of them");

      // ── THE DETECTOR IS SHOWN TO FIRE, on the real historical text, fed to the SHIPPED
      //    functions. A detector only ever shown to stay quiet is one refactor from asserting
      //    nothing — m46 found exactly that shape, where the one plant was fed to a locally
      //    re-implemented copy so the shipped detector was never once driven to a violation.
      const historical = [
        "// `none` is the EMPTY string on purpose: motion is on exactly the two states that mean",
        '// "expect this to change", and every other state must emit no animation class at all rather',
        "// than an inert one. Both pulses honour `prefers-reduced-motion` through the existing scoping",
        "// convention in `ui/src/index.css`, which is why the class is the house's own and not a",
        "// terminal-local animation.",
        "export const TERMINAL_MOTION_CLASS = Object.freeze({",
      ].join("\n");
      const plantedComment = commentAbove(historical, "export const TERMINAL_MOTION_CLASS");
      assert.notEqual(plantedComment, comment, "self-check: the plant LANDED — the historical comment differs from the one on disk");
      assert.match(
        proseOf(plantedComment),
        /honour\s+`?prefers-reduced-motion`?\s+through\s+the\s+existing\s+scoping\s+convention/i,
        "self-check: the false-sentence detector FIRES on the exact text that shipped",
      );
      assert.deepEqual(
        [...animationsNamedIn(proseOf(plantedComment))],
        [],
        "self-check: …and the historical comment named NO animation at all — which is precisely how it managed to be false without being checkable. The 'names the class the code uses' clause is what closes that.",
      );

      // ── …and the checkability clause fires too, on a comment that claims coverage for
      //    something the block does not silence.
      const overclaiming = "// The dots honour reduced motion: `ui/src/index.css` silences `animate-spin` under\n// `prefers-reduced-motion`.\nexport const TERMINAL_MOTION_CLASS = Object.freeze({";
      const overclaimed = animationsNamedIn(proseOf(commentAbove(overclaiming, "export const TERMINAL_MOTION_CLASS")));
      assert.ok(overclaimed.has("animate-spin"), "self-check: the plant LANDED — the overclaiming comment names an animation");
      assert.deepEqual(
        [...overclaimed].filter((animation) => !silenced.has(animation)),
        ["animate-spin"],
        "self-check: a comment claiming coverage the stylesheet does not provide is REFUSED — the general form of the defect this story repairs",
      );
    },
  },
];
