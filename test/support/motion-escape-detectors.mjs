// Detectors for the REDUCED-MOTION ESCAPE — the one home, read by two suites
// (milestone 49 / story 06; DESIGN DG-49-6; ARCHITECTURE §Fitness functions, the ninth gate).
//
// WHY A SHARED MODULE AND NOT A HELPER IN EACH FILE. Two readers need exactly the same three
// primitives — "which `animate-*` utilities does this tree EMIT", "which classes does the
// stylesheet's reduced-motion block actually SILENCE", and "is the answer read from CODE rather
// than from prose":
//   · `test/arch/loop/acd-motion-has-an-escape.test.mjs` — the structural gate (set containment over
//     the WHOLE of `ui/src/**`), which is a fitness function and lives with the other eight.
//   · `test/session/terminal-motion-reduced-escape.test.mjs` — 49/06's task scenarios 1 and 5, which are
//     observable-behaviour claims about the terminal's two motion-carrying states.
// Copying the detector would put the mechanism in two places inside the very milestone whose
// finding is a mechanism claimed in one place and implemented in none. One home, two readers —
// the same argument `test/support/terminal-gate-detectors.mjs` records for its own existence.
//
// COMMENTS ARE STRIPPED BEFORE EVERY READING, AND THAT IS THE WHOLE POINT HERE.
// The defect this milestone found is a COMMENT that claimed the escape existed
// (`ui/src/terminal/palette.mjs`, until 49/06) while the stylesheet's only reduce rule named
// `.aof-pending` alone. A naive `prefers-reduced-motion` word sweep of that file was GREEN on the
// live defect — it would have certified the exact thing it was written to catch, out of a
// sentence. So every function below reads `stripComments`ed source, and the stripper is the ONE
// home at `test/support/source-slice.mjs` (line comments FIRST, block comments SECOND —
// TECH_DEBT item 24; the other order lets a line comment containing `/*` delete the rest of the
// file, which on an absence sweep is a silent PASS).
//
// NOTHING HERE CUTS SOURCE POSITIONALLY. The reduced-motion block is delimited by MATCHING
// BRACES (`matchedBraceBody`), never by a character window or an `indexOf` sentinel pair — the
// species `acd-test-suite-registration` lanes 3-4 ratchet.
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchedBraceBody, stripComments } from "./source-slice.mjs";

export { stripComments };

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const UI_SRC = path.join(repoRoot, "ui", "src");
export const UI_STYLESHEET = path.join(UI_SRC, "index.css");

// The source extensions that can EMIT a utility class. `.css` is deliberately absent: the
// stylesheet is where the escape is DECLARED, and sweeping it as an emitter would let the escape
// satisfy itself.
export const EMITTING_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs"];

export const rel = (file) => path.relative(repoRoot, file).replaceAll("\\", "/");

export async function collectFiles(dir, exts) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collectFiles(full, exts)));
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out.sort();
}

// Every `animate-*` utility this source EMITS, comment-stripped. A variant prefix
// (`motion-safe:animate-pulse`, `group-hover:animate-spin`) still yields the bare utility, which
// is what a stylesheet rule has to name.
export function emittedAnimateClasses(source) {
  return new Set([...stripComments(source).matchAll(/\banimate-[a-z0-9][a-z0-9-]*/g)].map((match) => match[0]));
}

// Does this source carry a reduced-motion-CONDITIONAL variant on a class — the second mechanism
// DESIGN DG-49-6 clause 1 sanctions (`motion-safe:` / `motion-reduce:` Tailwind variants)? Read
// from CODE, so a `prefers-reduced-motion` mention in a comment answers false.
export function carriesAMotionVariant(classString) {
  return /\b(?:motion-safe|motion-reduce):/.test(String(classString ?? ""));
}

// The `@media (prefers-reduced-motion: reduce)` blocks in a stylesheet, cut on MATCHING BRACES.
// Returns one entry per block so a caller can assert there is exactly ONE — a second block is a
// second home for the same fact, which is the shape this milestone exists to end.
export function reducedMotionBlocks(cssText) {
  const clean = stripComments(cssText);
  const blocks = [];
  const opener = /@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*/g;
  for (const match of clean.matchAll(opener)) {
    const body = matchedBraceBody(clean, match.index);
    if (body == null) continue;
    blocks.push({ header: match[0].trim(), body });
  }
  return blocks;
}

// The flat rules inside a CSS block: `{ selector, declarations }` per rule, cut on matching
// braces rather than on a character window. Returns [] when the block holds no rule.
export function cssRulesIn(blockBody) {
  const rules = [];
  let cursor = 0;
  while (cursor < blockBody.length) {
    const open = blockBody.indexOf("{", cursor);
    if (open < 0) break;
    const declarations = matchedBraceBody(blockBody, open);
    if (declarations == null) break;
    rules.push({ selector: blockBody.slice(cursor, open).trim(), declarations });
    cursor = open + declarations.length + 2;
  }
  return rules;
}

// Does this declaration list actually STOP the animation? Naming a class in the reduce block and
// then setting something else on it is the vacuous half of this gate, so "named" is not enough:
// the rule has to silence motion. Both spellings in use are accepted — `animation: none` (this
// repo's) and the `animation-duration: 0` / `0.01ms` idiom.
export function silencesAnimation(declarations) {
  const text = String(declarations ?? "");
  return /\banimation\s*:\s*none\b/.test(text) || /\banimation-duration\s*:\s*0(?:\.\d+)?(?:ms|s)?\b/.test(text);
}

// The bare class names a stylesheet's reduced-motion block SILENCES. A selector that names no
// class, or a rule that names one without stopping its animation, contributes nothing.
export function classesSilencedUnderReduce(cssText) {
  const silenced = new Set();
  for (const block of reducedMotionBlocks(cssText)) {
    for (const rule of cssRulesIn(block.body)) {
      if (!silencesAnimation(rule.declarations)) continue;
      for (const match of rule.selector.matchAll(/\.([A-Za-z_-][\w-]*)/g)) silenced.add(match[1]);
    }
  }
  return silenced;
}

// Every emitted `animate-*` utility across a set of files that the stylesheet does NOT silence,
// reported as `path → class` so a refusal names the site rather than a count.
export async function unescapedMotionSites(files, cssText, readFile) {
  const silenced = classesSilencedUnderReduce(cssText);
  const offenders = [];
  const emittedBy = new Map();
  for (const file of files) {
    const emitted = emittedAnimateClasses(await readFile(file, "utf8"));
    if (emitted.size > 0) emittedBy.set(rel(file), [...emitted].sort());
    for (const utility of [...emitted].sort()) {
      if (!silenced.has(utility)) offenders.push(`${rel(file)} → ${utility}`);
    }
  }
  return { offenders, emittedBy, silenced };
}
