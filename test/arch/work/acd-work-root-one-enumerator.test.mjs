// FF-12701 — milestone 127 / ADR-001 §5: ONE ENUMERATOR, ONE REGEX HOME.
//
// Before this milestone `ITEM_RE` had three homes and seven modules paired a `readdir` of a work
// root with an item-name match of their own — so a new root (the backlog, the archive) would
// have had to be taught to eight scanners, and would have been taught to some. This control
// holds the cut in two sweeps over a comment-stripped read of every file under `src/**`:
//
//   1. THE REGEX HOME. `ITEM_RE` and `BACKLOG_ITEM_RE` are each bound to a regex literal
//      (`const … = /…/`) in exactly one src file, `src/work.mjs`; every other src reference to
//      either name is an import from it (or a re-export of that import). The two root names are
//      spelled as string literals in that file alone.
//   2. THE PAIRING. A file that holds a `readdir`/`readdirSync` AND an item-name match — the
//      identifiers `ITEM_RE`/`BACKLOG_ITEM_RE`, a regex literal containing
//      `_(milestone|story|task|uat|spike|chore)_` or `_milestone_`, or a numbered-folder regex
//      literal beginning `/^(\d+)` — is a scanner. Exactly one is the enumerator (`src/work.mjs`,
//      whose pairing the sweep MUST find, or the control is vacuous); every other is one of six
//      allow-listed keepers, each carrying the reason it may keep its listing. An allow-listed
//      path whose pairing the sweep no longer finds is itself a failure — a stale keeper cannot
//      outlive its reason.
//
// `src/memory/local-indexing.mjs` is asserted to hold NO item-name match at all: it walks the
// wiki for `AOF.md` files and de-duplicates against the enumerator's row dirs, and the item
// shape lives only in its comments — which the strip removes. The assertion is what keeps it
// from becoming a keeper silently.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { stripComments, functionBody } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ENUMERATOR = "src/work.mjs";

// The six keepers, by path and reason (task 01's table; ADR-001 §5 as corrected there).
export const KEEPERS = Object.freeze([
  { file: "src/work/doctor.mjs", reason: "the orphan lane's raw listing — it exists to see what the enumerator DROPS, so it cannot ask the enumerator; it learns the roots through the exported names" },
  { file: "src/integrations/routing.mjs", reason: "matches a FOREIGN `NN-slug`/`NN_slug` form (NUMBERED_FOLDER_RE) the shared grammar does not admit" },
  { file: "src/import/recovery.mjs", reason: "scans a FOREIGN source tree (AOF_MILESTONE_RE + loose forms); not a work-root scanner" },
  { file: "src/commands/migrate-folder.mjs", reason: "scans a FOREIGN source tree's stories/tasks with STORY_FOLDER_RE, read-only; its work-root scan (nextFreeSlot) is retired onto appendPosition" },
  { file: "src/work-tune/provenance.mjs", reason: "a SYNCHRONOUS resolver (resolveCitationAtEmit → emitProposals) that cannot take the async enumerator; a second readdirSync over the SHARED regex, walking root + archive, never a second regex home" },
  { file: "src/commands/ratchet.mjs", reason: "walks an ITEM subtree for files and parses path SEGMENTS with /^(\\d+)_/, never a listing" },
]);

export const ASSERTED_NO_MATCH = "src/memory/local-indexing.mjs";

const REGEX_BINDING_RE = /\b(?:const|let|var)\s+(ITEM_RE|BACKLOG_ITEM_RE)\s*=\s*\//g;
const IDENTIFIER_RE = /\b(?:ITEM_RE|BACKLOG_ITEM_RE)\b/;
// A ROOT-NAMING shape (task 00: "no other module carries the string … TO NAME A ROOT"): the
// literal handed to a path builder (`path.join(dir, "archive")`, `resolve(root, "backlog")`) or
// written as a path segment (`"backlog/"`, `` `${dir}/archive` ``). The bare word in another
// vocabulary — a command `route: ["work", "archive"]` (story 03's verb, the universal command
// shape), a config value `intake: "backlog"` (story 02's key) — names no root and is admitted;
// a leg that forbade the literal outright (round-one review, 2026-09-11) would have false-failed
// both stories and been loosened under delivery pressure.
export const ROOT_NAMING_LITERAL_RE = /\b(?:join|resolve)\s*\([^)]*["'`](?:backlog|archive)["'`]|["'`](?:backlog|archive)\/|\/(?:backlog|archive)["'`]/;
const READDIR_RE = /\breaddir(?:Sync)?\b/;
// A regex literal token: `/…/flags`, escapes honoured, never spanning a line. Division
// expressions can match too — harmless, because only the CONTENT is inspected.
const REGEX_LITERAL_RE = /\/(?:[^/\\\n[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[dgimsuy]*/g;
const ITEM_SHAPE_IN_REGEX = (literal) => literal.startsWith("/^(\\d+)") || literal.includes("_(milestone|story|task|uat|spike|chore)_") || literal.includes("_milestone_");

export function itemNameMatchesIn(strippedSource) {
  const matches = [];
  if (IDENTIFIER_RE.test(strippedSource)) matches.push("identifier");
  for (const literal of strippedSource.match(REGEX_LITERAL_RE) ?? []) {
    if (ITEM_SHAPE_IN_REGEX(literal)) matches.push(literal);
  }
  return matches;
}

export function sweepFile(strippedSource) {
  const matches = itemNameMatchesIn(strippedSource);
  return { readdirs: READDIR_RE.test(strippedSource), matches, paired: READDIR_RE.test(strippedSource) && matches.length > 0 };
}

async function sweepSrc() {
  const files = new Map();
  for (const file of await readSrcFiles(repoRoot)) {
    const source = await readFile(file.path, "utf8");
    files.set(`src/${file.rel}`, { source, stripped: stripComments(source) });
  }
  return files;
}

// Does `stripped` import `name` from src/work.mjs? Reads the import CLAUSE of a `work.mjs`
// import (the shape `acd-cache-read-surface-boundary`'s `workImportBindings` uses) — the
// specifier itself is matched, not captured, so this is not a second specifier extractor
// (FF-11901 · 121: `importSpecifiers` in test/support/module-family.mjs is the one home for
// that, and it answers specifiers, not the bindings a clause names).
function importsFromWork(rel, stripped, name) {
  const dir = path.posix.dirname(rel);
  const specifierIsWork = (from) => path.posix.normalize(path.posix.join(dir, from)) === ENUMERATOR;
  for (const match of stripped.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*\bwork\.mjs["']/g)) {
    const from = match[0].slice(match[0].lastIndexOf("from") + 4).trim().replace(/^["']|["']$/g, "");
    if (!specifierIsWork(from)) continue;
    const names = match[1].split(",").map((entry) => entry.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    if (names.includes(name)) return true;
  }
  return false;
}

export const archTests = [
  {
    name: "arch/FF-12701 (acd-work-root-one-enumerator): ITEM_RE and BACKLOG_ITEM_RE are each defined in exactly one src file, src/work.mjs, and every other reference is an import from it",
    run: async () => {
      const files = await sweepSrc();
      const definitions = [];
      for (const [rel, { stripped }] of files) {
        for (const match of stripped.matchAll(REGEX_BINDING_RE)) definitions.push(`${rel}:${match[1]}`);
      }
      assert.deepEqual(definitions.sort(), ["src/work.mjs:BACKLOG_ITEM_RE", "src/work.mjs:ITEM_RE"], "one definition of each, both in src/work.mjs");
      for (const [rel, { stripped }] of files) {
        if (rel === ENUMERATOR) continue;
        for (const name of ["ITEM_RE", "BACKLOG_ITEM_RE"]) {
          if (!new RegExp(`\\b${name}\\b`).test(stripped)) continue;
          assert.ok(importsFromWork(rel, stripped, name), `${rel} references ${name} without importing it from src/work.mjs`);
        }
      }
      // The two root names are spelled once, in the enumerator's file: no other module NAMES a
      // root with the literal (a path-builder argument or a path segment — ROOT_NAMING_LITERAL_RE).
      for (const [rel, { stripped }] of files) {
        if (rel === ENUMERATOR) continue;
        assert.ok(!ROOT_NAMING_LITERAL_RE.test(stripped), `${rel} names a root with a string literal — import BACKLOG_ROOT / ARCHIVE_ROOT from src/work.mjs instead`);
      }
      const work = files.get(ENUMERATOR).stripped;
      assert.equal((work.match(/"backlog"/g) ?? []).length, 1);
      assert.equal((work.match(/"archive"/g) ?? []).length, 1);
      // Self-check: the shape catches a root NAMED and admits the bare word in another vocabulary.
      for (const named of ['path.join(workDir, "archive")', 'resolve(root, "backlog")', 'const p = "backlog/" + name', "const p = `${dir}/archive`"]) {
        assert.ok(ROOT_NAMING_LITERAL_RE.test(named), `catches a root named as: ${named}`);
      }
      for (const bare of ['route: ["work", "archive"]', 'intake: "backlog"', 'if (mode === "archive")']) {
        assert.ok(!ROOT_NAMING_LITERAL_RE.test(bare), `admits the bare word in another vocabulary: ${bare}`);
      }
    },
  },
  {
    name: "arch/FF-12701 (acd-work-root-one-enumerator): doctor's family reaches the regex through one import — doctor.mjs imports ITEM_RE from ../work.mjs and defines none; doctor-freshness.mjs imports no item regex at all",
    run: async () => {
      const files = await sweepSrc();
      const doctor = files.get("src/work/doctor.mjs").stripped;
      assert.ok(importsFromWork("src/work/doctor.mjs", doctor, "ITEM_RE"), "doctor.mjs imports ITEM_RE from ../work.mjs");
      assert.ok(!/\b(?:const|let|var)\s+ITEM_RE\b/.test(doctor), "…and defines none");
      const freshness = files.get("src/work/doctor-freshness.mjs").stripped;
      assert.ok(!IDENTIFIER_RE.test(freshness), "doctor-freshness.mjs imports no ITEM_RE — roadmapFolderMismatch reads milestone numbers off snapshot.items");
      assert.ok(!READDIR_RE.test(freshness), "…and lists nothing of its own");
      const migrate = files.get("src/commands/migrate-folder.mjs").stripped;
      assert.ok(!IDENTIFIER_RE.test(migrate), "migrate-folder.mjs no longer references ITEM_RE (its only use was nextFreeSlot)");
      assert.ok(!/nextFreeSlot/.test(migrate), "nextFreeSlot is gone");
      assert.ok(importsFromWork("src/work-tune/provenance.mjs", files.get("src/work-tune/provenance.mjs").stripped, "ARCHIVE_ROOT"), "provenance imports the archive root's name from src/work.mjs");
      const observe = files.get("src/work/observe.mjs").stripped;
      assert.ok(importsFromWork("src/work/observe.mjs", observe, "listItems"), "observe.mjs takes its items from listItems");
      assert.ok(!/\/\^\(\\d\+\)_/.test(observe), "observe.mjs holds no regex literal beginning /^(\\d+)_");
      assert.deepEqual(itemNameMatchesIn(observe), [], "observe.mjs holds no item-name match of its own");
      // The three retired scanners, per function. `buildSessionItemIndex` and `resolveMilestoneFolder`
      // enumerate through the rows and list nothing themselves. `countUnattributedRuns` is the one
      // whose QUESTION is "which run records sit under no item" — an orphan lane, doctor's shape —
      // so it keeps a raw listing of the work root but takes the item set from `listItems` and
      // matches no item name (the pairing sweep below is what proves that; recorded as a contract
      // deviation at 127/01's build, since the feature's "no readdir of the work root" cannot hold
      // for an orphan count while `work-observe-scope/02` asserts a stray dir's runs are counted).
      for (const header of ["export async function buildSessionItemIndex(", "export async function resolveMilestoneFolder("]) {
        const body = functionBody(observe, header);
        assert.ok(body, `${header} is declared`);
        assert.ok(/listItems\(/.test(body), `${header} takes its items from listItems`);
        assert.ok(!/readdir/.test(body), `${header} holds no readdir of the work root or of a milestone's stories/`);
      }
      const unattributed = functionBody(observe, "async function countUnattributedRuns(");
      assert.ok(unattributed && /listItems\(/.test(unattributed), "countUnattributedRuns takes the item set from listItems");
      assert.ok(/BACKLOG_ROOT/.test(unattributed) && /ARCHIVE_ROOT/.test(unattributed), "…and knows the two roots through their exported names");
      const observeMilestoneBody = functionBody(observe, "export async function observeMilestone(");
      assert.ok(observeMilestoneBody && !/readdir\(storiesDir/.test(observeMilestoneBody), "observeMilestone lists no milestone's stories/ either — its story refs are the enumerator's rows by containment");
    },
  },
  {
    name: "arch/FF-12701 (acd-work-root-one-enumerator): the sweep finds the enumerator's own pairing and no undeclared second one — six keepers by path and reason, each still pairing; local-indexing holds no item-name match",
    run: async () => {
      const files = await sweepSrc();
      const paired = [];
      for (const [rel, { stripped }] of files) {
        if (sweepFile(stripped).paired) paired.push(rel);
      }
      assert.ok(paired.includes(ENUMERATOR), "non-vacuous: the sweep finds src/work.mjs's own readdir + ITEM_RE pairing");
      const keeperPaths = KEEPERS.map((keeper) => keeper.file);
      const undeclared = paired.filter((rel) => rel !== ENUMERATOR && !keeperPaths.includes(rel));
      assert.deepEqual(undeclared, [], `undeclared work-root scanners (a readdir paired with an item-name match): ${undeclared.join(", ")} — retire onto listItems, or add a keeper row WITH its reason`);
      for (const keeper of KEEPERS) {
        assert.ok(typeof keeper.reason === "string" && keeper.reason.length > 20, `keeper ${keeper.file} carries its reason`);
        assert.ok(paired.includes(keeper.file), `stale keeper: ${keeper.file} (${keeper.reason}) no longer pairs a readdir with an item-name match — remove its row`);
      }
      const indexing = files.get(ASSERTED_NO_MATCH);
      assert.ok(indexing, `${ASSERTED_NO_MATCH} exists`);
      assert.ok(READDIR_RE.test(indexing.stripped), "local-indexing walks the wiki (a readdir)…");
      assert.deepEqual(itemNameMatchesIn(indexing.stripped), [], "…with NO item-name match in its code — the shape lives in its comments only, which the strip removes");
    },
  },
  {
    name: "arch/FF-12701 (acd-work-root-one-enumerator): self-check — the sweep sees each of the four match shapes, ignores a comment, and needs the readdir to call it a pairing",
    run: () => {
      assert.deepEqual(itemNameMatchesIn('const m = name.match(ITEM_RE);'), ["identifier"]);
      assert.deepEqual(itemNameMatchesIn('const m = name.match(BACKLOG_ITEM_RE);'), ["identifier"]);
      assert.deepEqual(itemNameMatchesIn('const RE = /^(\\d+)_(milestone|story|task|uat|spike|chore)_([a-z0-9-]+)$/;'), ["/^(\\d+)_(milestone|story|task|uat|spike|chore)_([a-z0-9-]+)$/"]);
      assert.deepEqual(itemNameMatchesIn('const RE = /^(\\d+)_milestone_([a-z0-9-]+)$/;'), ["/^(\\d+)_milestone_([a-z0-9-]+)$/"]);
      assert.deepEqual(itemNameMatchesIn('const RE = /^(\\d+)[-_]+(.+)$/;'), ["/^(\\d+)[-_]+(.+)$/"]);
      assert.deepEqual(itemNameMatchesIn('const RE = /^(\\d+)_/u;'), ["/^(\\d+)_/u"]);
      assert.deepEqual(itemNameMatchesIn(stripComments('// mirrors ITEM_RE: /^(\\d+)_milestone_/\nconst x = 1;')), [], "a comment is not a match");
      assert.equal(sweepFile('const m = ITEM_RE.exec(name);').paired, false, "a match with no readdir is not a scanner");
      assert.equal(sweepFile('import { readdirSync } from "node:fs";\nconst m = ITEM_RE.exec(name);').paired, true);
      assert.equal(sweepFile('await readdir(dir);\nconst n = String(Number(row.number));').paired, false, "a readdir with no item-name match is not a scanner");
    },
  },
];
