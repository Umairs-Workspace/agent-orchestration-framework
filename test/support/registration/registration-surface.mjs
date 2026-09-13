// THE REGISTRATION SURFACE — one home for "where can a suite be registered?" (119/ADR-010).
//
// WHY IT EXISTS. Before 119/03 the answer was one file: `scripts/test.mjs` imported and spread every
// suite, so "is this suite registered?" was "does the runner's text name it?". Since 119/03 the
// registry names DIRECTORIES and each directory's `index.mjs` names its own suites, so registration
// is transitive — a suite is registered when its index imports and spreads it and the runner spreads
// that index. Every control that used to read the runner's text needs the same wider text now, and
// three of them do (`acd-loop-suite-registration`, `acd-test-suite-registration`, and FF-11906's
// extension of `acd-suite-registration-single-decider`).
//
// ONE HOME, NOT THREE. Three controls each spelling their own walk is the duplication this milestone
// exists to remove, and it is the argument `test/support/module-family.mjs` already won for "what is
// this module?". The surface is assembled HERE and nowhere else.
//
// IT IS TEXT, DELIBERATELY. `registrationDecision` (`src/work-audit/census.mjs`) remains the single
// decider of which file contributed which entries; this helper produces one of its INPUTS and
// decides nothing. It imports no suite and spawns nothing.
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { readRegistrationIndexes } from "../../../src/work-audit/census.mjs";

/**
 * Every `index.mjs` beneath `root`, as `{ rel, dir, source }`.
 *
 * DELEGATED, NOT RE-WALKED. The production census needs exactly this walk — its text-level lane
 * reads the same surface — and a copy here would be the second answer this milestone exists to
 * remove. `src/work-audit/census.mjs` owns it; this is the test tree's door onto it.
 */
export const readIndexes = readRegistrationIndexes;

// Every directory beneath `root` that holds a suite or an index, with how many of each.
export async function directoryCensus(repoRoot, root = "test") {
  const dirs = new Map();
  const walk = async (rel) => {
    let suites = 0;
    let indexes = 0;
    for (const entry of await readdir(path.join(repoRoot, rel), { withFileTypes: true })) {
      if (entry.isDirectory()) { await walk(`${rel}/${entry.name}`); continue; }
      if (entry.name.endsWith(".test.mjs")) suites += 1;
      if (entry.name === "index.mjs") indexes += 1;
    }
    if (suites > 0 || indexes > 0) dirs.set(rel, { suites, indexes });
  };
  await walk(root);
  return dirs;
}

/**
 * The runner's text plus every index's text, joined. This is what a control reads when it is asking
 * "does the registration surface name this suite?" — the question that used to be answerable from
 * `scripts/test.mjs` alone.
 */
export async function registrationSurface(repoRoot, { runner = "scripts/test.mjs", root = "test" } = {}) {
  const parts = [await readFile(path.join(repoRoot, runner), "utf8")];
  for (const index of await readIndexes(repoRoot, root)) parts.push(index.source);
  return parts.join("\n");
}

// THE TWO SHAPES A REGISTRATION IS WRITTEN IN, and the reader that pulls the bound names out of the
// first. They live HERE because three readers need them — this file's own `registeredSuitePaths`,
// FF-11906's `indexRegistryProblems`, and any control that asks whether a binding is spread — and a
// regex copied into each reader is the same "one home, not nine" defect one level down from the one
// this milestone is about.
export const IMPORT_OF = /import\s*\{([^}]*)\}\s*from\s*"([^"]+)";/gu;
export const SPREAD_ROW = /^\s*\.\.\.([A-Za-z_$][\w$]*),?\s*$/gmu;
export const bindingsOf = (clause) =>
  clause.split(",").map((part) => (part.includes(" as ") ? part.split(" as ")[1] : part).trim()).filter(Boolean);

/**
 * The REPO-RELATIVE path of every suite the registration surface actually reaches, as a Set.
 *
 * WHY A SET AND NOT THE TEXT. Before 119/03 "is this suite registered?" was answerable by grepping
 * the runner for the suite's full path, because the runner named it in full. An index names its
 * members RELATIVE TO ITSELF (`./acd-x.test.mjs`), so the directory half of the path is carried by
 * the index's own location and appears in no text a control could grep. A control that kept reading
 * text would therefore have to grep for a basename — which is a weaker claim than the one it was
 * making, since two directories may hold the same basename. Resolving each specifier against its
 * index's own directory keeps the claim exactly as strong as it was.
 *
 * Registration is TRANSITIVE and this reader honours both hops: the index must import AND spread the
 * suite, and the runner must import AND spread that index. A suite whose index imports it and never
 * spreads it is NOT registered — that is 59/FF-5903's defect, and reporting it as registered here
 * would hide the very thing the census exists to catch.
 */
export async function registeredSuitePaths(repoRoot, { runner = "scripts/test.mjs", root = "test" } = {}) {
  const spreadIn = (source) => new Set([...source.matchAll(SPREAD_ROW)].map((match) => match[1]));

  const runnerSource = await readFile(path.join(repoRoot, runner), "utf8");
  const runnerSpread = spreadIn(runnerSource);
  const reachedDirs = new Set();
  for (const match of runnerSource.matchAll(IMPORT_OF)) {
    if (!match[2].endsWith("/index.mjs")) continue;
    if (!bindingsOf(match[1]).some((binding) => runnerSpread.has(binding))) continue;
    // The runner lives under `scripts/`, so its specifiers are resolved from there.
    reachedDirs.add(path.posix.dirname(path.posix.normalize(path.posix.join(path.posix.dirname(runner), match[2]))));
  }

  const registered = new Set();
  for (const index of await readIndexes(repoRoot, root)) {
    if (!reachedDirs.has(index.dir)) continue;
    const indexSpread = spreadIn(index.source);
    for (const match of index.source.matchAll(IMPORT_OF)) {
      if (!match[2].endsWith(".test.mjs")) continue;
      if (!bindingsOf(match[1]).some((binding) => indexSpread.has(binding))) continue;
      registered.add(path.posix.normalize(path.posix.join(index.dir, match[2])));
    }
  }

  // A FLOOR AT THE ONE HOME, because the empty set is this reader's silent failure mode. Both hops
  // are text matches: a formatting change to the runner or to an index that stopped matching
  // `IMPORT_OF` would resolve nothing, and every caller would then red saying "acd-x is not
  // registered" — true of the answer, and about the wrong file. Each caller's failure direction is
  // already loud, so nothing passes vacuously; what this adds is that the failure NAMES the reader
  // instead of blaming its subject. It is the same "a floor before the claim" rule the census
  // applies to its own sweeps, applied where the sweep actually is.
  if (registered.size === 0 && runnerSource.trim().length > 0) {
    throw new Error(
      `registeredSuitePaths read ${runnerSource.length} characters of ${runner} and resolved NO registered suite. `
        + "Both hops are text matches (an index imported and spread by the runner, a suite imported and spread by that index), "
        + "so this is a broken reader rather than an unregistered tree — repair it here, not at the control that called it.",
    );
  }
  return registered;
}

/**
 * WHERE DOES THE SUITE WITH THIS BASENAME LIVE? — repo-relative, resolved from the tree.
 *
 * A control that names another suite names it by BASENAME, and that is the right key: the name is
 * the suite's identity and it survives a move; its directory does not. Before 119/03 the two were
 * the same thing, so controls joined the basename onto `test/arch/` and were correct by accident.
 * They are not the same thing now, and a join throws ENOENT the moment the subject moves — which is
 * how a control comes to be about a filesystem error instead of about its claim.
 *
 * EXACTLY ONE MATCH, ASSERTED. Two suites sharing a basename would make this ambiguous, and a
 * resolver that silently picked one would be a worse answer than the join it replaces; a basename
 * that names nothing is a renamed or deleted subject, and it is reported as that rather than thrown
 * at. Both are stated in the message, so the caller reds saying which happened.
 */
export async function suitePathByBasename(repoRoot, basename, { root = "test" } = {}) {
  const matches = (await suiteFilesBelow(path.join(repoRoot, root))).filter((rel) => rel.split("/").pop() === basename);
  if (matches.length !== 1) {
    throw new Error(
      `${basename}: expected exactly one suite under ${root}/ with this name, found ${matches.length}`
        + (matches.length === 0 ? " — it was renamed or deleted, which is a change to this control's subject rather than a missing file" : ` (${matches.join(", ")}) — the basename is ambiguous, so it can no longer identify the subject`),
    );
  }
  return `${root}/${matches[0]}`;
}

/**
 * Every `*.test.mjs` beneath `dir`, as paths relative to it, at any depth. The walk a flat `readdir`
 * used to be — and the one that stops a control losing two thirds of its subject in silence when a
 * directory gains an interior (119/ADR-003 §4).
 */
export async function suiteFilesBelow(dir, prefix = "") {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await suiteFilesBelow(path.join(dir, entry.name), rel)));
    else if (entry.name.endsWith(".test.mjs")) found.push(rel);
  }
  return found;
}
