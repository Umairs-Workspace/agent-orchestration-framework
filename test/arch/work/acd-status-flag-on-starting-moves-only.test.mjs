// Fitness function for story 74 / task 02 — `--if-applicable` rides the STARTING move,
// and nothing else.
//
// THE DECISION THIS GUARD PINS. The story left it open — pass the flag unconditionally
// (one rule to remember instead of two) or only where the already-started case is expected.
// Only where it is expected: a verb that never fails is a verb whose failures nobody reads,
// and `ref-not-found`, `invalid-status`, `record-doc-unusable` and the no-local-checkout
// refusal all reach an agent through this same channel.
//
// THE LINE IS DRAWN IN CODE, so this is a reading of the system rather than a convention.
// The STARTING moves are the ones something else may have made first: `STARTING_PHASES` is
// `{continue, refine}` (src/commands/continue.mjs) and the `run.started` reactor advances
// from `not-started|blocked` on any mint (src/effects/table.mjs). The JUDGEMENT moves —
// `in-review` and `done` — are made by nothing but this door, so a refusal there means the
// item is not where the prompt believes it is, and must stay loud.
//
// Prose is what this guards, so prose is what it reads: the bundle command surfaces are the
// instructions an agent actually executes, and a hand-edit that adds the flag to a `done`
// move would otherwise ship silently.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUNDLE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src", "bundle");

// Every command surface under src/bundle/ (commands, and any other prose a runtime renders
// verbatim — the sweep is directory-derived so a new surface is covered the day it lands).
function bundleSurfaces(dir = BUNDLE_DIR, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) bundleSurfaces(full, found);
    else if (entry.name.endsWith(".md")) found.push(full);
  }
  return found;
}

// `aof work status <ref> <target> [flags…]` — matched over WHITESPACE-NORMALISED text,
// because a markdown surface wraps an invocation across lines mid-command. The captured
// tail is everything up to the closing backtick / end of sentence, which is where a flag
// would sit.
const INVOCATION = /aof work status\s+(\S+)\s+([a-z-]+)([^`\n]*)/g;

function invocationsIn(text) {
  const flat = text.replace(/\r?\n\s*/g, " ");
  const found = [];
  for (const match of flat.matchAll(INVOCATION)) {
    const [, ref, target, tail] = match;
    // The second word is a lifecycle target only when it IS one — `aof work status <ref>`
    // (the read) is followed by prose, and `--json` is a flag, not a target.
    if (!["not-started", "in-progress", "in-review", "done", "blocked"].includes(target)) continue;
    found.push({ ref, target, flagged: /--if-applicable/.test(tail) });
  }
  return found;
}

export const archTests = [
  {
    name: "arch/74-02: no JUDGEMENT transition in the bundle carries --if-applicable, and every starting move does",
    run: () => {
      const surfaces = bundleSurfaces();
      assert.ok(surfaces.length > 0, "the sweep found bundle surfaces to read");
      let starting = 0;
      let judgement = 0;
      for (const file of surfaces) {
        const relative = path.relative(BUNDLE_DIR, file);
        for (const { ref, target, flagged } of invocationsIn(readFileSync(file, "utf8"))) {
          const site = `${relative}: \`aof work status ${ref} ${target}\``;
          if (target === "in-progress") {
            starting += 1;
            assert.ok(
              flagged,
              `${site} is a STARTING move and must carry --if-applicable — something else (the phase door, the run-mint reactor, a resumed run) has usually made it already, and a scripted caller must not read that as a failure`,
            );
          } else if (target === "in-review" || target === "done") {
            judgement += 1;
            assert.ok(
              !flagged,
              `${site} is a JUDGEMENT move and must NOT carry --if-applicable — nothing but this door makes it, so a refusal there means the item is not where the prompt believes it is and must stay loud`,
            );
          }
        }
      }
      assert.ok(starting > 0, "the sweep actually matched starting moves (a regex that matches nothing proves nothing)");
      assert.ok(judgement > 0, "…and judgement moves");
    },
  },
  {
    name: "arch/74-02: no bundle instructs an agent to disregard a refusal from a work verb",
    run: () => {
      // The workaround this story replaces. Leaving the sentence beside the flag would keep
      // teaching the habit the flag removes — carry on past a non-zero exit — while the flag
      // makes the exit zero.
      //
      // Read per SENTENCE — prose's own unit — not over the whole surface and not over a
      // character window: "carry on" is ordinary English elsewhere (`aof work resume <ref>`
      // and carry on from there), and a guard that cannot tell those apart is a guard that
      // gets deleted the first time it cries wolf.
      const REFUSAL = /status-edge-not-applicable|is refused|the refusal/i;
      const WORKAROUND = /nothing to fix|carry (?:straight )?on|not a problem|ignore (?:it|the refusal|that)|disregard/i;
      for (const file of bundleSurfaces()) {
        const text = readFileSync(file, "utf8");
        if (!/aof work status/.test(text)) continue;
        const sentences = text.replace(/\r?\n\s*/g, " ").split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (!REFUSAL.test(sentence)) continue;
          const hit = sentence.match(WORKAROUND);
          assert.equal(
            hit,
            null,
            `${path.relative(BUNDLE_DIR, file)} tells an agent to step past a status refusal ("${sentence.trim()}") — that behaviour belongs to \`--if-applicable\`, which makes the EXPECTED refusal exit 0; every refusal that still fails is one an agent must READ`,
          );
        }
      }
    },
  },
];
