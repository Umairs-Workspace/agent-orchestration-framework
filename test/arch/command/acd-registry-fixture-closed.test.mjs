// FF-5809 — A REGISTRY FIXTURE COPIES AN ENDPOINT-CLOSED SUBSET, THROUGH ONE HELPER.
//
// Milestone 58 / story 00, from 58/ADR-007 §3a. The invariant:
//
//   Every test that copies records out of `src/bundle/loops/` into a temp registry does so through
//   the single helper in `test/support/registry-fixture.mjs`, which transitively adds every record
//   named by a copied record's endpoint; no such fixture produces `loop-graph-dangling-endpoint`;
//   and no test file reaches `src/bundle/loops/` to build a fixture by any other route.
//
// WHY IT IS A CONTROL AND NOT A FIX. Three suites carried hand-written subset lists — 55's
// `acd-anchor-taxonomy-additive`, 57's `acd-watcher-taxonomy-additive` and `watcher-node` — and
// each asserted an exact finding set or a zero-error sweep over the subset those names copy. The
// claim all three encode is *"every record already on disk still parses exactly as it did"*, and
// that claim is only meaningful over a subset CLOSED under the endpoints its members declare. 55,
// 57 and 58 have each had to remember to extend those lists by hand; this is the third instance,
// which is what turns a fix into a ratchet. In 58 the failure would also have been misleading
// rather than merely red: `operator.md`'s new edge would read `loop-bad-value` before 58/00 and
// `loop-graph-dangling-endpoint` after, `error` either way, from a widening that broke nothing —
// so the suite that exists to prove back-compatibility would have reported a compatibility break.
//
// WHY LEG 3's BASELINE IS NAMED RATHER THAN REGEXED. "Builds a subset fixture" is not decidable
// from source text without a heuristic, and a heuristic verdict over twelve files is how a gate
// comes to be wrong about the TREE rather than about the rule. So every test file that reaches the
// shipped registry is CLASSIFIED here, by name, into one of FOUR lanes with its reason, and the
// sweep must equal the union: the next file to reach `src/bundle/loops/` fails this gate until
// somebody says which lane it is in. That is `acd-test-suite-registration`'s shrink-only shape,
// applied to a second species.
//
// LANE 4 WAS ADDED AT MILESTONE 62's GATE (finding D-03) and is the one lane that is NOT about
// reaching the shipped registry: the sweep's route test is a text match, so a suite that plants
// `<tempCwd>/src/bundle/loops/<name>.md` in its own fixture tree trips it while touching nothing
// this framework ships. Naming that case is honest where classifying it as a reader would not be,
// and lane 4 carries its own leg so it cannot become the drawer unclassified files are put in.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLoops } from "../../../src/work/loops.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import {
  SHIPPED_LOOPS_DIR, shippedRecords, shippedRegistryFiles, withShippedRegistry,
} from "../../support/registry-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const HELPER = "test/support/registry-fixture.mjs";
const TEST_DIRS = ["test", path.join("test", "arch"), path.join("test", "support")];

// LANE 1 — copies records out of the shipped registry THROUGH THE HELPER. A SUBSET copy must be
// here, because a subset is only meaningful when it is endpoint-closed; a WHOLE-directory copy may
// be here too, and a suite written after the helper existed should be (58/01's `…supervision-complete`
// is the first). These are the three suites 58/ADR-007 §3a names plus what has since joined them,
// and the list is expected to GROW: a new fixture over the shipped registry belongs here.
const THROUGH_THE_HELPER = Object.freeze([
  "test/arch/memory/acd-anchor-taxonomy-additive.test.mjs",
  "test/arch/loop/acd-watcher-taxonomy-additive.test.mjs",
  "test/loop/watcher-node.test.mjs",
  "test/arch/loop/acd-arbiter-taxonomy-additive.test.mjs",
  "test/arch/loop/acd-day-one-supervision-complete.test.mjs",
  // milestone 59 / story 00 — the auditor kind's compatibility leg over the SIXTEEN pre-59 records,
  // and the anchor-freshness gate's "no shipped record declares a `checked:` date". Both name a
  // seed set rather than the whole directory, so both must go through the closing helper.
  "test/arch/audit/acd-auditor-taxonomy-additive.test.mjs",
  "test/arch/memory/acd-anchor-freshness-declared.test.mjs",
  // story 102 / task 01 — the shell's drift check. It asks two questions of the records this
  // framework SHIPS (the id the loop shell mints is declared, and as `kind: loop`), and the second
  // arms the check by re-pointing that record's `id:` and reloading. Its first shape copied
  // `src/bundle` recursively by hand and turned leg 3 red on the day it landed (102/F-102-A); it
  // takes the helper's route instead. The whole registry is its own closure, so the seed is `null`
  // and the fixture's own `names.length` is what its parse count is asserted against.
  "test/arch/mesh/acd-shell-loop-id-is-declared.test.mjs",
]);

// LANE 2 — copies the WHOLE directory into a temp registry, which is endpoint-closed by
// construction: a set containing every record contains every record its members name. These need
// no helper and are not defects.
const WHOLE_DIRECTORY = Object.freeze([
  "test/arch/loop/acd-day-one-pairing-complete.test.mjs",
  "test/arch/grade/acd-oracle-is-a-message-not-a-count.test.mjs",
  "test/arch/loop/acd-watcher-counter-resolves.test.mjs",
  "test/arch/command/acd-registry-single-home.test.mjs",
  "test/work/pairing-table.test.mjs",
]);

// LANE 3 — reads shipped record TEXT for an assertion about that text (delivery byte-equality, a
// stamped authority, a cited bound) and builds no registry fixture out of it. Closure is not a
// property these can have, because they copy nothing anywhere.
const READS_WITHOUT_COPYING = Object.freeze([
  "test/memory/anchor-taxonomy.test.mjs",
  "test/arch/command/acd-registry-framework-owned.test.mjs",
  "test/loop/loop-progress.test.mjs",
  "test/loop/work-loops-resolved-ceilings.test.mjs",
  // milestone 59 / story 04 — the audit face's three suites. Each loads the shipped registry IN
  // PLACE (`loadLoops(src/bundle)`) to assert a property of the records this framework really
  // ships — exactly one auditor, an addressee that is never the audited loop, zero gating
  // findings — and copies nothing into a temp registry, so endpoint-closure is not a property
  // any of them can have. They read the whole directory or nothing, never a hand-written subset.
  "test/arch/loop/acd-day-one-audit-complete.test.mjs",
  "test/arch/audit/acd-audit-reports-to-the-owner.test.mjs",
  "test/audit/audit-command.test.mjs",
  // milestone 61 / story 00 — the clamp's two suites. Both read the arbiter record's
  // `parameter-tuning:` edge to assert that the conflated key STAYS in the declared tunable set
  // (what 61/00 refuses is committing a step on it, not proposing one). They read that one
  // record's text and copy nothing into a temp registry, so endpoint-closure is not a property
  // either can have.
  "test/arch/loop/acd-loop-cap-single-home.test.mjs",
  "test/loop/loop-bounds.test.mjs",
  // milestone 71 / story 00 — FF-7101 sweeps `src/bundle/**` IN PLACE to assert that every
  // `work.loop.*` key a shipped asset names resolves and every value it states equals its bound's
  // own answer. Two of the bound facts it pins are the `ceiling:` lines of `loops/review-fix-
  // rereview.md` and `loops/build-to-green.md` — a cited bound read out of shipped record text,
  // which is precisely what this lane is for. It plants its mutations on the in-memory asset list
  // it already read, and copies nothing into a temp registry, so endpoint-closure is not a
  // property it can have.
  "test/arch/command/acd-prompt-bounds-name-their-home.test.mjs",
]);

// LANE 4 — SPELLS THE PATH INSIDE ITS OWN FIXTURE TREE and never reaches the shipped registry at
// all (milestone 62 gate, finding D-03). The sweep's proxy for "reaches the shipped registry" is a
// TEXT match, and a suite that writes `<tempCwd>/src/bundle/loops/<name>.md` matches that text
// while touching nothing this framework ships. `test/planning/tune-corpus.test.mjs` plants exactly that file
// under its own temp `cwd` so a lesson's path citation has something to resolve against — it loads
// no shipped record, copies no subset, and asserts nothing about delivered bytes, so it can hold
// neither the closure property lane 1 owns nor the reading property lane 3 owns.
//
// THE SAME PROXY ARTEFACT HAS A SECOND SPECIES (story 102, finding F-102-A): a suite that merely
// CITES `src/bundle/loops/` in its own prose — a header comment pointing a reader at the sibling
// suite that does the registry-facing half — matches the text sweep while executing nothing over
// the path at all. That is the artefact this lane already names, one step weaker: it does not even
// plant the string in a fixture tree. Classifying it as a reader would be a false statement about
// what it does, and rewording the comment to dodge a text match would be editing documentation to
// please a proxy, so it is named here with the other one.
//
// This lane is not a waiver, and the leg below is what stops it becoming one: a file admitted here
// must reach the path ONLY through a fixture root or a citation it never opens, and must not
// import the closing helper. A suite that later starts reading the shipped directory in place
// fails that leg — its mention is rooted at the repo — rather than sitting here silently
// reclassified.
const IN_ITS_OWN_FIXTURE_TREE = Object.freeze([
  "test/planning/tune-corpus.test.mjs",
  // story 102 / task 01 — the six scenarios that need a REAL DRIVEN LOOP. Its fixture has no
  // `.aof/loops/` directory at all (that absence is the registry-blind claim every one of its
  // scenarios witnesses), and its single mention of this directory is the header line handing the
  // two registry-facing scenarios to `acd-shell-loop-id-is-declared` in lane 1.
  "test/loop/loop-command-board-state.test.mjs",
]);

// The helper itself, and this gate, both name the directory and are neither fixtures nor readers.
const OWN_FILES = Object.freeze([HELPER, "test/arch/command/acd-registry-fixture-closed.test.mjs"]);

const fwd = (value) => value.replaceAll("\\", "/");

/** Every `.test.mjs` and `test/support/*.mjs` file, repo-relative with forward slashes. */
async function everyTestFile() {
  // RECURSIVE, and that is the correction 119/03 forced. This was a flat `readdir` over the three
  // roots — correct while every suite was a direct child of `test/` or `test/arch/`, and silently
  // blind the moment they moved into subject directories. It did not fail loudly: it swept 62
  // helper files, cleared its own `> 50` non-vacuity floor, and reported that NO file reaches the
  // shipped registry — the sweep narrowing to nothing while still looking like a sweep. That is
  // the species FF-11905 forbids in `src/` and nothing guards in `test/`.
  const files = [];
  const walk = async (dir) => {
    for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
      if (entry.isDirectory()) { await walk(path.join(dir, entry.name)); continue; }
      if (!entry.name.endsWith(".mjs")) continue;
      files.push(fwd(path.join(dir, entry.name)));
    }
  };
  for (const dir of TEST_DIRS) await walk(dir);
  return [...new Set(files)].sort();
}

export const archTests = [
  {
    name: "arch/58 FF-5809: the helper closes a seed set under the endpoints its members declare",
    run: async () => {
      const records = await shippedRecords();
      assert.ok(records.length >= 14, `the sweep of ${SHIPPED_LOOPS_DIR} was non-vacuous: ${records.length} records`);

      // THE CLOSURE IS REAL TODAY, not a promise about tomorrow: several shipped records name
      // another record's id on an edge, so seeding one alone pulls its endpoint in. Measured
      // rather than asserted from a literal — the point is that the helper finds them.
      const pulled = [];
      for (const record of records) {
        const closed = await shippedRegistryFiles([record.name]);
        assert.ok(closed.names.includes(record.name), `${record.name}: the seed is in its own closure`);
        for (const name of closed.added) assert.equal(closed.seeds.includes(name), false, `${record.name}: ${name} was added, not seeded`);
        if (closed.added.length > 0) pulled.push(record.name);
      }
      assert.ok(pulled.length > 0, "at least one shipped record names another, so the closure is exercised and not vacuous");

      // TRANSITIVE, not one hop. A closure that stopped after one step would still pass the leg
      // above; this asserts the fixed point directly — closing the closure adds nothing more.
      for (const record of records) {
        const once = await shippedRegistryFiles([record.name]);
        const twice = await shippedRegistryFiles(once.names);
        assert.deepEqual(twice.names, once.names, `${record.name}: the closure is a fixed point`);
      }

      // AND THE WHOLE REGISTRY IS ITS OWN CLOSURE — the lane-2 suites' implicit claim, made
      // explicit here so it is not merely believed.
      const all = await shippedRegistryFiles(null);
      assert.deepEqual(all.added, [], "a whole-directory copy is closed by construction");
      assert.deepEqual(all.names, records.map((record) => record.name).sort());

      // A SEED THAT IS NOT A SHIPPED RECORD FAILS LOUDLY. A helper that silently skipped an
      // unknown name would let a renamed record shrink a fixture without a word.
      await assert.rejects(() => shippedRegistryFiles(["not-a-record.md"]), /not a record in/u);
    },
  },

  {
    name: "arch/58 FF-5809: no fixture the helper builds reports a dangling endpoint",
    run: async () => {
      // Every singleton seed, and the whole registry: if any subset the helper can produce left an
      // endpoint unresolved, one of these would report it. This is the property the three
      // hand-written lists could not have — and the one 58's operator edge would have broken.
      const records = await shippedRecords();
      for (const record of records) {
        await withShippedRegistry([record.name], async (fixture) => {
          const model = await loadLoops(fixture.workDir);
          assert.equal(model.nodes.length, fixture.names.length, `${record.name}: every copied record parsed`);
          assert.deepEqual(
            model.findings.filter((finding) => finding.code === "loop-graph-dangling-endpoint"),
            [],
            `${record.name}: the closed subset resolves every endpoint its members declare`,
          );
        });
      }
      await withShippedRegistry(null, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings.filter((finding) => finding.code === "loop-graph-dangling-endpoint"), []);
      });

      // NON-VACUITY: the loader really does report that code, so the empty arrays above are a
      // result and not a code path nothing can reach.
      const { files } = await shippedRegistryFiles(null);
      const [first] = Object.keys(files).sort();
      await withShippedRegistry(null, async (fixture) => {
        await fixture.write({ "open.md": "---\nid: actor:open\nkind: actor\ntitle: open\nground: exogenous\ntarget-setting: [loop:no-such-record]\n---\n# open\n" });
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(
          model.findings.filter((finding) => finding.code === "loop-graph-dangling-endpoint").map((finding) => finding.message),
          ["Endpoint does not name a declared node: loop:no-such-record"],
          `an OPEN subset does report it — the control for the ${Object.keys(files).length} closed loads above, alongside ${first}`,
        );
      });
    },
  },

  {
    name: "arch/58 FF-5809: every test file that reaches the shipped registry is classified, and subset fixtures go through the one helper",
    run: async () => {
      const files = await everyTestFile();
      assert.ok(files.length > 50, `the test sweep was non-vacuous: ${files.length} files`);

      // "Reaches the shipped registry" is TWO routes, and both are in the sweep: naming the
      // directory path directly, or going through the helper that names it. Only the first is a
      // route a subset fixture may not take, and a file that takes neither is not this gate's
      // business at all.
      const namesThePath = [];
      const usesTheHelper = [];
      const sources = new Map();
      for (const file of files) {
        const source = await readFile(path.join(root, file), "utf8");
        sources.set(file, source);
        const names = /bundle\/loops|"bundle",\s*"loops"/u.test(fwd(source));
        // AN INDEX IS NOT A TEST FILE THAT REACHES THE REGISTRY (119/ADR-010 §1). A directory's
        // `index.mjs` is its membership list — imports and spreads, nothing executable — and it
        // names `src/bundle/loops/` only because the per-suite RATIONALE moved into it with the
        // suite it introduces. Classifying one into a lane would be a false statement about how it
        // reaches the shipped directory: it does not reach it at all.
        //
        // THE EXCLUSION IS CHECKED, NEVER ASSUMED, which is the difference between this and a
        // silent narrowing. An index is skipped only while its mention is confined to comments; one
        // that names the path in code fails HERE, naming itself, rather than leaving a hole where a
        // registry file could quietly acquire a route.
        if (names && path.posix.basename(file) === "index.mjs") {
          assert.equal(
            /bundle\/loops|"bundle",\s*"loops"/u.test(fwd(stripComments(source))),
            false,
            `${file}: an index names src/bundle/loops/ in CODE — it is no longer only carrying a suite's rationale, so it owes a lane like any other file that reaches the directory`,
          );
          continue;
        }
        if (names) namesThePath.push(file);
        if (!OWN_FILES.includes(file) && /from "\.[^"]*support\/registry-fixture\.mjs"/u.test(source)) usesTheHelper.push(file);
      }
      const reaches = [...new Set([...namesThePath, ...usesTheHelper])].sort();
      assert.ok(namesThePath.length > 0 && usesTheHelper.length > 0, "both routes are exercised, so neither half of the sweep is vacuous");

      const classified = [...THROUGH_THE_HELPER, ...WHOLE_DIRECTORY, ...READS_WITHOUT_COPYING, ...IN_ITS_OWN_FIXTURE_TREE, ...OWN_FILES];
      assert.equal(new Set(classified).size, classified.length, "no file is in two lanes");
      assert.deepEqual(
        reaches,
        [...classified].sort(),
        "every test file that reaches src/bundle/loops/ is classified into exactly one lane — a new one fails here until it is",
      );

      // LANE 1 REALLY GOES THROUGH THE HELPER, and reaches the shipped directory by no other
      // route: it builds no `src/bundle/loops` path of its own.
      assert.deepEqual([...usesTheHelper].sort(), [...THROUGH_THE_HELPER].sort(),
        "the helper's importers ARE lane 1 — a suite that imported it and was not classified here, or the reverse, is the drift this leg catches");

      // LANE 4 EARNS ITS PLACE, rather than being where an unclassified file goes to be quiet: a
      // file here reaches the directory only through a fixture root it created, and takes neither
      // of the two routes the other lanes are about.
      for (const file of IN_ITS_OWN_FIXTURE_TREE) {
        const source = sources.get(file);
        assert.ok(source != null, `${file}: lane 4 names a file the sweep did not find`);
        assert.equal(usesTheHelper.includes(file), false, `${file}: imports the closing helper, so it is lane 1`);
        const mentions = fwd(source).split(/\r?\n/u).filter((line) => /bundle["'/,\s]+["']?loops/u.test(line));
        assert.ok(mentions.length > 0, `${file}: lane 4 is for files that DO name the path`);
        for (const mention of mentions) {
          assert.match(
            mention,
            /path\.join\(\s*cwd\s*,|src\/bundle\/loops\//u,
            `${file}: every mention must be a fixture-rooted join or the citation text it plants — "${mention.trim()}"`,
          );
          assert.doesNotMatch(
            mention,
            /\b(root|repoRoot|fileURLToPath)\b/u,
            `${file}: a mention rooted at the repo reaches the SHIPPED registry — "${mention.trim()}"`,
          );
        }
      }
      for (const file of THROUGH_THE_HELPER) {
        const source = sources.get(file);
        assert.ok(/withShippedRegistry|shippedRegistryFiles|shippedRecords/u.test(source), `${file}: drives the closing helper`);
        assert.equal(
          /path\.join\([^)]*"bundle"[^)]*"loops"/u.test(source),
          false,
          `${file}: reaches src/bundle/loops/ through the helper and by no other route`,
        );
      }

      // LANE 2 IS CLOSED BY CONSTRUCTION because it copies the whole directory — asserted by the
      // `readdir` over the shipped path, which is what "whole" means here.
      for (const file of WHOLE_DIRECTORY) {
        assert.ok(sources.get(file).includes("readdir"), `${file}: copies the directory listing, not a hand-written subset`);
      }

      // LANE 3 BUILDS NO REGISTRY OUT OF SHIPPED TEXT. The discriminator is that none of them
      // passes shipped record text into the temp-registry fixture at all.
      for (const file of READS_WITHOUT_COPYING) {
        const source = sources.get(file);
        assert.equal(source.includes("shippedFiles"), false, `${file}: builds no file map from the shipped directory`);
        assert.equal(source.includes("shippedOriginalFiles"), false, `${file}: nor an original-records map`);
      }

      // AND THE HELPER HAS ONE HOME. A second copy of the closure is the defect this control
      // exists to prevent, one indirection further along.
      const helpers = files.filter((file) => file !== HELPER && /shippedRegistryFiles\s*\(/u.test(sources.get(file)) && sources.get(file).includes("export "));
      for (const file of helpers) {
        assert.ok(sources.get(file).includes("registry-fixture.mjs"), `${file}: any module vending a closure imports this one rather than reimplementing it`);
      }
    },
  },
];
