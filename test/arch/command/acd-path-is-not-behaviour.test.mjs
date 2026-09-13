// Fitness function: FF-11905 (119/ADR-008) —
//
//   "No path in this tree is load-bearing for behaviour."
//
// ── WHY THIS EXISTS AT ALL, AND WHY A GREEN SUITE IS NOT IT ──────────────────────────────
// The milestone's verifiable outcome is that the same suites pass and the counts fall. That is
// checkable at the end, and it proves the wrong thing: a green suite after a move proves the
// move did not break what the suites COVER. It says nothing about whether some behaviour was
// derived from a path — and a derivation nobody asserted is found later, by whoever moves the
// next file, in a failure that names their diff rather than this one. Item 78 states the
// property positively ("a command's route is declared in the command, not derived from its
// path") and it is asserted by nothing. This file is that assertion.
//
// ── THE FIVE SUBJECTS THE REGISTER NAMES, AND A SIXTH THIS STORY MEASURED ────────────────
// ADR-008 enumerates route, command name, lane membership, bundle target and registry ordering.
// Building this story found a live instance that is NONE of them and that ADR-008's headline
// sentence covers exactly: `src/work-loops.mjs:318` derived the PACKAGE ROOT from its own module
// location with two `path.dirname` hops. Two hops from `src/work-loops.mjs` is the repository
// root; from `src/work/loops.mjs` it is `src/`, so every framework loop record's ceiling pointer
// would have stopped resolving — `loop-ceiling-pointer-unresolved` on every one — because a
// module moved one directory deeper. It was the ONLY self-located constant in the 71-module
// moving set, and the sixth leg below is what stops the next one arriving unseen. A control that
// would not have caught the one instance its own story found is a control worth extending before
// it ships, not after.
//
// ── THE POSITIVE HALF IS THE LOAD-BEARING ONE ────────────────────────────────────────────
// "No path reaches an identifier" is a negative and negatives go vacuous. So the sweep also
// asserts what the tree DOES do: the route table is built from each command's declared
// `cli.route` words, `COMMANDS` is an array literal of imported bindings that no directory
// listing produces, and the registered set with its routes and declared flags is read from the
// REGISTRY. `aof --help` is assembled from exactly those declarations, which is what makes it a
// byte-identical black-box witness across all four of this milestone's moves.
//
// ── PROBES RUN AGAINST THE SHIPPED DETECTOR ──────────────────────────────────────────────
// Each red probe is a synthesized SOURCE handed to the same function the real assertion uses —
// never a local re-implementation, which is the defect that leaves a shipped detector never once
// driven to a violation. Nothing is written to disk.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const REGISTRY = "src/command-core.mjs";
export const FACE = "src/spine/face.mjs";

// THE SWEEP IS EVERY MODULE UNDER `src/`, and that is a correction (119/01 review). It swept the
// two directories this story moved — a STORED fact about which families had moved, which goes
// SILENTLY stale rather than red: 119/02 moves `src/commands/mesh-*.mjs` into a directory this
// list does not name, both named families stay non-vacuous, and the leg passes having never read
// the module that acquired the defect. That is ADR-003's own carrier species, inside the control
// that closes ADR-008. The invariant was never about moved modules: a root derived by hop
// arithmetic is wrong the day its file moves, whoever moves it.
//
// ADMITTED, and shrink-only. Two modules derive a root from their own location on purpose. Each
// carries its reason here, the list MAY FALL and MAY NEVER RISE (the length assertion in the leg
// is what refuses a raise), and each entry is re-checked to still BE such a module — an
// allowlist naming a module that no longer derives a root is a stale allowlist.
export const ADMITTED_SELF_LOCATED = Object.freeze([
  Object.freeze({
    module: "src/work-audit/toolkit.mjs",
    why: "THE TOOLKIT ROOT IS THIS MODULE'S SUBJECT (m77/ADR-002). It answers 'where was aof itself installed', which is a question about this file's own location and nothing else — deriving it from anywhere but here is the second root TECH_DEBT 72 is made of. It is admitted because the derivation IS the module, and it is safe because `src/work-audit/` is a sub-family directory ADR-005 §3 rules is never nested.",
  }),
  Object.freeze({
    module: "src/commands/loops-groundedness.mjs",
    why: "the SAME latent defect `src/work-loops.mjs` carried, in a file this story does not own: `src/commands/` is 119/02's layer and this module is not in its moving set, so a behavioural fix here would be scope this story cannot verify. Named rather than left invisible — it is wrong the day the file moves, and this row is what makes that a table edit somebody reads.",
  }),
]);

// A path expression that produces a NAME. `path.basename(...)`, `path.dirname(...)`,
// `path.parse(...)` and the bare `.split("/").pop()` idiom are the four spellings this tree
// actually uses to turn a path into a word.
const NAME_FROM_PATH = /\bpath\s*\.\s*(?:basename|dirname|parse)\s*\(|\.\s*split\s*\(\s*["'`][/\\]["'`]\s*\)\s*\.\s*pop\s*\(/gu;

// The identifiers ADR-008 names: a route, a command id, a registry key, a lane membership, a
// bundle target, a registry ordering. A path expression that lands in one of these is the defect.
const IDENTIFIER_SINKS = Object.freeze(["route", "id", "commandId", "key", "lane", "lanes", "bundle", "target", "order", "name"]);

// Two `path.dirname` hops, or a `path.resolve(..., "..", "..")`, anchored at the module's OWN
// location — the shape that makes a constant a function of the file's depth in the tree.
// Both anchors, because `OWN_LOCATION` below already names both and the pattern named one:
// `import.meta.dirname` is the modern spelling and the one a new module is most likely to use.
const OWN_ANCHOR = String.raw`(?:fileURLToPath\s*\(\s*import\s*\.\s*meta\s*\.\s*url\s*\)|import\s*\.\s*meta\s*\.\s*dirname)`;
const SELF_LOCATED_ROOT = new RegExp(
  `(?:path\\s*\\.\\s*dirname\\s*\\(\\s*path\\s*\\.\\s*dirname\\s*\\(|path\\s*\\.\\s*(?:resolve|join)\\s*\\(\\s*(?:path\\s*\\.\\s*dirname\\s*\\(\\s*)?${OWN_ANCHOR}\\s*\\)?\\s*,\\s*["'\`]\\.\\.["'\`])`,
  "u",
);
// A DIRECTORY LISTING, spelled as this tree spells one. Deliberately anchored on the call rather
// than on the substring: `glob` is a substring of `global-work-store.mjs`, which the face imports,
// and a control that matched it would have been red for a reason that has nothing to do with
// routes — the species of false positive that gets a control deleted rather than fixed.
const DIRECTORY_LISTING = /readdir(?:Sync)?\s*\(|glob(?:Sync)?\s*\(/u;

const OWN_LOCATION = /fileURLToPath\s*\(\s*import\s*\.\s*meta\s*\.\s*url\s*\)|import\s*\.\s*meta\s*\.\s*dirname/u;

/**
 * THE SHIPPED DETECTOR, half one: a path expression whose result reaches an ADR-008 identifier.
 * Takes SOURCE so a probe can be a string, and returns the offending lines rather than a boolean —
 * a refusal that names the file and the derivation is the whole value of the control.
 */
export function pathDerivedIdentifiers(rel, source) {
  const body = stripComments(source);
  const findings = [];
  for (const line of body.split(/\r?\n/u)) {
    NAME_FROM_PATH.lastIndex = 0;
    if (!NAME_FROM_PATH.test(line)) continue;
    // EVERY binding on the line, not the first: `const spec = { id: path.basename(f, ".mjs") }`
    // declares a command id, and an alternation that took the `const` branch first never looked
    // at the object key. And the sink must EQUAL a named subject — `endsWith` made `filename`
    // and `dirName` and `uuid` violations, which is the false positive that gets a control
    // deleted rather than fixed.
    const bindings = [
      ...[...line.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gu)].map((match) => match[1]),
      ...[...line.matchAll(/([A-Za-z_$][\w$]*)\s*:/gu)].map((match) => match[1]),
    ];
    const sink = bindings.find((binding) => IDENTIFIER_SINKS.includes(binding.toLowerCase()));
    if (sink === undefined) continue;
    findings.push({
      file: rel,
      derivation: line.trim(),
      sink,
      message: `${rel} derives \`${sink}\` from a path expression. No route, command id, registry key, lane membership, bundle target or registry ordering is derived from a filename or a directory name (ADR-008) — a move story's diff is a file at a new path plus the specifier that points at it, and this line would make it more.`,
    });
  }
  return findings;
}

/**
 * THE SHIPPED DETECTOR, half two: a module that resolves a repository or package root by counting
 * directory hops from its OWN location. This is the sixth subject, and it is the one whose live
 * instance this story found.
 */
export function selfLocatedRoots(rel, source) {
  const body = stripComments(source);
  const findings = [];
  for (const line of body.split(/\r?\n/u)) {
    if (!OWN_LOCATION.test(line)) continue;
    if (!SELF_LOCATED_ROOT.test(line)) continue;
    const named = line.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/u);
    findings.push({
      file: rel,
      constant: named?.[1] ?? "(unnamed)",
      derivation: line.trim(),
      message: `${rel} resolves a root by counting directory hops from its own module location (\`${named?.[1] ?? line.trim()}\`). That constant is a function of the file's DEPTH: moving the module one directory deeper changes its value and nothing fails at import — the answer is simply wrong from then on. Obtain the root from a seam that does not move with this module (\`assetBase\`, m28/ADR-003).`,
    });
  }
  return findings;
}

async function read(rel) {
  return readFile(path.join(repoRoot, rel), "utf8");
}

// Every `.mjs` under `src/`, recursively. `src/bundle/` is skipped: it is shipped PROSE and
// template assets rather than modules this tree loads, and a template is allowed to spell
// whatever a rendered file will need.
async function sourceModules(rel = "src") {
  const out = [];
  for (const entry of await readdir(path.join(repoRoot, rel), { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "bundle") continue;
      out.push(...(await sourceModules(`${rel}/${entry.name}`)));
    } else if (entry.name.endsWith(".mjs")) {
      out.push(`${rel}/${entry.name}`);
    }
  }
  return out;
}

export const archTests = [
  {
    name: "arch/119 FF-11905: neither the registry nor the face derives a route, a command id, a registry key, a lane, a bundle target or a registry ordering from a path",
    run: async () => {
      const findings = [];
      for (const rel of [REGISTRY, FACE]) {
        const source = await read(rel);
        assert.ok(source.length > 2000, `non-vacuity: ${rel} was actually read (${source.length} bytes)`);
        findings.push(...pathDerivedIdentifiers(rel, source));
      }
      assert.deepEqual(
        findings.map((finding) => finding.message),
        [],
        "a path expression reaches an ADR-008 identifier — see the message for the file and the derivation",
      );

      // …and the stronger, simpler statement the two files actually satisfy today: neither spells
      // a name-from-path expression AT ALL. Kept as a separate assertion from the sink analysis
      // above, because it is the claim a reader can check by eye and the one that would notice a
      // derivation this control's sink list has not learned to name yet.
      for (const rel of [REGISTRY, FACE]) {
        const body = stripComments(await read(rel));
        NAME_FROM_PATH.lastIndex = 0;
        assert.equal(NAME_FROM_PATH.test(body), false, `${rel} spells no basename/dirname/parse-derived name at all — the property item 78 asserts and nothing enforced`);
      }
    },
  },

  {
    name: "arch/119 FF-11905: the route table is built from each command's DECLARED route words, and the registered order is a declared array order rather than a directory listing",
    run: async () => {
      const face = stripComments(await read(FACE));
      const registry = stripComments(await read(REGISTRY));

      // The face reads `cli.route` off the command and joins its words into the table key. That
      // is a declaration travelling with the command, which is why moving the command's FILE
      // cannot move its route.
      assert.match(face, /command\s*\.\s*cli\s*\?\.\s*route/u, "the face reads each command's declared `cli.route`");
      assert.match(face, /route\s*\.\s*join\s*\(\s*["'` ]/u, "…and the table key is those declared words joined, not a filename");
      assert.equal(DIRECTORY_LISTING.test(face), false, "the face performs no directory listing — a route table derived from a listing is one no diff can review");

      // `COMMANDS` is an ARRAY LITERAL of imported bindings. Its order is the registered order,
      // and it is declared: no sort, no listing, no filename comparison produces it.
      const commands = registry.match(/const\s+COMMANDS\s*=\s*\[([\s\S]*?)\n\];/u);
      assert.ok(commands != null, "the registry declares COMMANDS as an array literal");
      const members = commands[1]
        .split(/\r?\n/u)
        .map((line) => line.trim().replace(/,$/u, ""))
        .filter((line) => line.length > 0);
      assert.ok(members.length >= 40, `non-vacuity: the COMMANDS literal holds ${members.length} entries`);
      for (const member of members) {
        assert.match(member, /^[A-Za-z_$][\w$]*$/u, `${member} is a bare imported binding — an array of identifiers is a declaration; anything computed here would be an ordering derived from something`);
      }
      assert.equal(/COMMANDS\s*\.\s*sort\s*\(/u.test(registry), false, "the registered order is the literal's order — nothing re-sorts it");
      assert.equal(DIRECTORY_LISTING.test(registry), false, "the registry performs no directory listing");
    },
  },

  {
    name: "arch/119 FF-11905: the registered set, its routes and its declared flags are read from the REGISTRY rather than from any path",
    run: async () => {
      const core = await import(new URL(`../../../${REGISTRY}`, import.meta.url).href);
      const listed = core.listCommands();
      assert.ok(Array.isArray(listed) && listed.length >= 40, `non-vacuity: the registry lists ${listed.length} commands`);

      let routed = 0;
      for (const entry of listed) {
        const command = core.getCommand(entry.id ?? entry);
        assert.ok(command != null, `${entry.id ?? entry} resolves through the registry`);
        const route = command.cli?.route;
        if (!Array.isArray(route) || route.length === 0) continue;
        routed += 1;
        for (const word of route) {
          assert.equal(typeof word, "string", `${command.id}: every route word is a declared string`);
          assert.equal(word.endsWith(".mjs"), false, `${command.id}: a route word is never a filename`);
        }
        // The id is declared, and it is not the module's base name wearing a different hat.
        assert.match(command.id, /^[a-z][a-z0-9-]*(?::[a-z0-9-]+)*$/u, `${command.id}: the id is a declared identifier, not a path fragment`);
      }
      assert.ok(routed >= 30, `non-vacuity: ${routed} of the registered commands declare a CLI route`);
    },
  },

  {
    name: "arch/119 FF-11905: NO module under src/ resolves a repository or package root by counting hops from its own location, beyond the two that are admitted",
    run: async () => {
      const admitted = new Set(ADMITTED_SELF_LOCATED.map((entry) => entry.module));
      const findings = [];
      const seen = new Set();
      let scanned = 0;
      for (const rel of await sourceModules()) {
        scanned += 1;
        for (const finding of selfLocatedRoots(rel, await read(rel))) {
          seen.add(rel);
          if (!admitted.has(rel)) findings.push(finding);
        }
      }
      assert.ok(scanned >= 250, `non-vacuity: ${scanned} modules under src/ were read — the sweep is the whole tree, not a stored list of families`);
      assert.deepEqual(
        findings.map((finding) => finding.message),
        [],
        "a module derives a root from its own depth — the control names the module and the constant",
      );

      // THE ALLOWLIST IS SHRINK-ONLY AND NON-VACUOUS. Every admitted module must still BE one, so
      // an entry whose module stopped deriving a root, or moved, fails here rather than sitting
      // in the list forever; and the length may fall and may never rise.
      assert.ok(ADMITTED_SELF_LOCATED.length <= 2, `the admitted list may FALL and may never RISE: ${ADMITTED_SELF_LOCATED.length} against the 2 recorded when this control landed`);
      for (const entry of ADMITTED_SELF_LOCATED) {
        assert.ok(seen.has(entry.module), `${entry.module} is admitted as a self-located root and no longer derives one (or has moved) — a stale allowlist entry admits nothing and hides the next real instance`);
        assert.ok(typeof entry.why === "string" && entry.why.length > 120, `${entry.module}: the admitted literal carries its own reason (FF-11902)`);
      }
    },
  },

  {
    name: "arch/119 FF-11905: the red probes FIRE on the shipped detectors, and the unmodified sources are quiet in the same lane",
    run: async () => {
      // (a) a route derived from a file's base name, in the face.
      const plantedRoute = 'const route = [path.basename(file, ".mjs")];';
      const routeFindings = pathDerivedIdentifiers(FACE, plantedRoute);
      assert.equal(routeFindings.length, 1, `a planted basename-derived route fires the shipped detector: ${JSON.stringify(routeFindings)}`);
      assert.match(routeFindings[0].message, /derives `route` from a path expression/u, "…and the refusal names the file and the derivation");
      assert.deepEqual(pathDerivedIdentifiers(FACE, stripComments(await read(FACE))), [], "…and the unmodified face, in this same lane, reports none");

      // (b) a module deriving its root by hops from its own location — the live shape this story
      //     found at `src/work-loops.mjs:318`, reproduced verbatim.
      const plantedRoot = "const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));";
      const rootFindings = selfLocatedRoots("src/work/loops.mjs", plantedRoot);
      assert.equal(rootFindings.length, 1, `a planted self-located root fires the shipped detector: ${JSON.stringify(rootFindings)}`);
      assert.equal(rootFindings[0].constant, "PACKAGE_ROOT", "…and the refusal names the constant");
      assert.match(rootFindings[0].message, /function of the file's DEPTH/u, "…and says why a green suite would never have caught it");
      assert.deepEqual(selfLocatedRoots("src/work/loops.mjs", await read("src/work/loops.mjs")), [], "…and the real module, now asking a seam for the root, reports none in this same lane");

      // (c) the `path.resolve(dirname, "..", "..")` spelling of the same defect is caught too —
      //     one derivation, two idioms, and a control that knew only one would meter half of it.
      const plantedResolve = 'const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");';
      assert.equal(selfLocatedRoots("src/mesh/launcher.mjs", plantedResolve).length, 1, "the resolve-hops spelling fires the same detector");

      // Neither probe touched the tree: both are strings in this process.
      assert.equal(typeof plantedRoute, "string", "the probes are synthesized sources, never files");
    },
  },
];
