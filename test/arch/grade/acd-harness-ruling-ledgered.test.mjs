// FF-6108 (milestone 61 / ADR-007) — `harness.ruled` is a declared event; the harness
// write has ONE home; and an undeclared name is now refused instead of resolving to zero
// reactors.
//
// THE HOLE THIS CLOSES, measured rather than remembered. `table.mjs:461` claimed of itself
// that "appendEvent refuses a name not declared here". It did not. `appendEvent` validates
// only that a name is non-empty, so a misspelled name appended SILENTLY and resolved to
// zero reactors: the fact filed, and the thing that was supposed to happen because of it
// owed to nobody, with the raising seam getting back exactly what a correctly spelled
// event with nothing to do would give it. The comment described a control this milestone
// is about to depend on. It is true at HEAD for the first time, and the refusal lives in
// the module that KNOWS what a name means rather than in the storage underneath it — dumb
// storage that learned the vocabulary in order to police it would invert the one layering
// this family is built on.
//
// THE LEGS:
//   (1) EFFECTS gains exactly ONE name and no tenth; its reactor set is one entry with a
//       known locus and an async apply; the eight already declared are byte-intact.
//   (2) The ledger has ONE WRITER, and the chain is closed at three links: the path's
//       literal has one home, exactly one module imports it, and exactly one module
//       performs a write against it.
//   (3) The knob write is SURGICAL — planted, as a property of a pure string transform:
//       every other key, its order and the file's own formatting survive.
//   (4) No module in `src/` writes at a DECLARED TUNABLE KNOB PATH in code. Resolved from
//       the registry's `parameter-tuning:` edge, never spelled here.
//   (5) The store is reached only from the seam and its reactor.
//   (6) Re-appending the same ruling identity yields a byte-identical ledger.
//   (7) `applicableReactors` refuses an undeclared name with a CODE, disjoint from the
//       journal's storage faults and from the ruling refusal vocabulary.
//   (8) Every `appendEvent` call site in `src/` is in the admitted seam set, which gained
//       exactly the new seam; and `journal.mjs` still imports no vocabulary.
//   (9) The ledger path is ABSENT from `AOF_GITIGNORE_ENTRIES` — it is not derived and not
//       regenerable, and being tracked is what makes `git revert` carry the evidence with
//       the change.
//
// ONE LEG IS NARROWER THAN FF-6108'S WORDING, DELIBERATELY, AND THE REASON IS MEASURED.
// The register says the store is "the only module in `src/` that writes ... the `work.*`
// section of `.aof/aof.config.json`". That is FALSE at HEAD and was false before this
// story: `src/work/headroom.mjs` writes `work.headroom`, `src/work/delegation.mjs` writes
// `work.agents.delegation` and `work.agents.delegationModel`, and `src/work/orchestrator.mjs`
// writes `work.agents.models` — three operator-INTENT writers that predate the acceptor and
// that this story may not edit. ADR-007 §2a's actual subject is narrower and correct:
// nothing in `src/` writes a HARNESS KNOB VALUE, and `config-editor.mjs` preserves `work`
// verbatim rather than being a path to one. Leg 4 enforces that, from the registry's own
// declaration of which keys are knobs, so it stays true as the tunable set moves.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { matchedParenSpan } from "../../support/source-slice.mjs";
import { codeOnly } from "../run/acd-progress-ledger-consumed.test.mjs";
import { AOF_GITIGNORE_ENTRIES } from "../../../src/aof-gitignore.mjs";
import { loadLoops } from "../../../src/work/loops.mjs";
import { tunableSet } from "../../../src/work-acceptor/admissibility.mjs";
import { EFFECTS, EVENT_NOT_DECLARED, applicableReactors, isKnownLocus, knownEvents } from "../../../src/effects/table.mjs";
import { appendEvent, openEffectsJournal } from "../../../src/effects/journal.mjs";
import { HARNESS_RULED, STAMP_EVIDENCE } from "../../../src/effects/harness-transitions.mjs";
import { LEDGER_RELPATH, criterionDigest, defaultCriterion } from "../../../src/work-acceptor/criterion.mjs";
import { STORE_REFUSALS, appendRuling, readLedger, setKnobValue } from "../../../src/work-acceptor/store.mjs";
import { PAIR_OUTCOMES } from "../../../src/work-acceptor/rule.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC_DIR = path.join(root, "src");

// The eight names that were the whole vocabulary before this story, with what each owed.
// A census rather than a count: "no tenth" is cheap to satisfy by deleting one.
const THE_EIGHT = Object.freeze({
  "run.started": ["advance-status", "publish-projection"],
  "run.completed": ["rollback-status", "publish-projection", "notion-status-sync"],
  "feedback.recorded": ["publish-projection"],
  "item-status.changed": ["publish-projection", "notion-status-sync"],
  "stream.reindexed": ["remap-run-refs", "remap-notion-map", "remap-projection", "remap-control-facts", "publish-projection"],
  // milestone 127 / ADR-004 (story 03) — the ARCHIVE cascade, declared beside the reindex cascade
  // it is the lesser twin of: no ref changes, so its one consequence is the publish. Taught to
  // this census consciously, as every name after the eight must be: "no tenth" is a claim about
  // 61's harness name, never a freeze on the stream's own vocabulary.
  "stream.archived": ["publish-projection"],
  "assignment.reported": ["settle-assignment"],
  "terminal.resume-refused": ["restore-parked-resume"],
  "assignment.settled": ["record-item-branch"],
});

// The admitted event-raising seams — the LIST OF SEAMS, not an amnesty, gaining exactly
// the harness seam. `control-stream-server.mjs` is the d3 bridge fact door and
// `reconcile.mjs` the d5 file-store reconciler; both append only what a transition would.
const APPEND_EVENT_SEAMS = Object.freeze([
  "src/control-stream-server.mjs",
  "src/effects/assignment-transitions.mjs",
  "src/effects/doc-transitions.mjs",
  "src/effects/harness-transitions.mjs",
  "src/effects/item-transitions.mjs",
  "src/effects/reconcile.mjs",
  "src/effects/run-transitions.mjs",
  "src/effects/stream-transitions.mjs",
]);

// ADR-010 §2's frozen RULING vocabulary — the codes that may reach a `refusals` array.
// Spelled here because this gate's subject is that the store's own CONSTRUCTION refusals
// are DISJOINT from them: a thrown refusal means no ruling was produced at all, so it can
// never be a ground a ruling reports about itself. (FF-6112 owns freezing the seven in
// production; this leg only asks that the two vocabularies never overlap.)
const THE_SEVEN = Object.freeze([
  "not-admissible",
  "metric-unmeasurable",
  "trial-unaffordable",
  "yield-bound",
  "evidence-short",
  "budget-exhausted",
  "step-would-be-compound",
]);

// Every door under `src/` through which bytes reach a path.
const WRITE_CALLS = Object.freeze(["writeFile", "writeFileSync", "appendFile", "appendFileSync", "writeText", "createWriteStream", "copyFile", "cp", "rename"]);

async function srcModules() {
  const modules = [];
  const walk = async (dir) => {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith(".mjs")) {
        modules.push({ rel: path.relative(root, full).replaceAll("\\", "/"), code: await readFile(full, "utf8") });
      }
    }
  };
  await walk(SRC_DIR);
  return modules;
}

// ── PURE DETECTORS ───────────────────────────────────────────────────────────────────
//
// Pure so every one of them can be PLANTED: a sweep that cannot be shown to see the defect
// it is looking for is a sweep whose green means nothing, and this milestone's whole
// subject is instruments that report on themselves honestly.

/**
 * Modules performing a write-shaped call whose ARGUMENT REGION names a ledger. The region
 * is cut by matching parens from the one home — never a character window, never a second
 * `indexOf` sentinel.
 *
 * IT IS NOT A GLOBAL CLASSIFIER, and the sweep proved why on its first run: `ledger` is
 * not a unique word in this tree. `src/loop-progress.mjs` appends to 69/03's PROGRESS
 * ledger through an identifier of its own also called `ledgerPath` — a different ledger,
 * legitimately written by its own owner. So this runs over the modules that can REACH the
 * acceptor's ledger (the import leg decides that set), and answers "does the one module
 * that knows where it is actually write it".
 */
export function ledgerWriteSites(modules) {
  const sites = [];
  for (const { rel, code } of modules) {
    const body = codeOnly(code);
    for (const callee of WRITE_CALLS) {
      for (const match of body.matchAll(new RegExp(`\\b${callee}\\s*\\(`, "gu"))) {
        const args = matchedParenSpan(body, match.index)?.body ?? "";
        if (/ledger/iu.test(args)) sites.push({ rel, callee, args: args.replace(/\s+/gu, " ").trim().slice(0, 120) });
      }
    }
  }
  return sites;
}

/**
 * Modules ASSIGNING at a declared tunable knob path — `config.work.x.y = v`. Reading one
 * is not writing one (69's guard already tracks readers), and a key quoted in a diagnostic
 * is neither: `codeOnly` blanks string literals, which is the same reading that guard uses.
 */
export function knobPathWriters(modules, declaredKeys) {
  const findings = [];
  for (const { rel, code } of modules) {
    const body = codeOnly(code);
    for (const key of declaredKeys) {
      const pattern = new RegExp(`${key.split(".").map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("\\s*\\.\\s*")}\\s*=(?!=|>)`, "u");
      if (pattern.test(body)) findings.push(`${rel} assigns at ${key} in CODE — a harness value moved outside the acceptor's one writer is a change no ruling justified (61/ADR-007 §2a).`);
    }
  }
  return findings;
}

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

// Comments stripped but STRING LITERALS KEPT — `codeOnly` blanks them, and an import's
// whole subject is the specifier inside one. Comments still go, so a module that merely
// discusses an import is not counted as making one.
const withoutComments = (source) => source.replace(/(^|[^:])\/\/[^\n]*/gu, "$1 ").replace(/\/\*[\s\S]*?\*\//gu, " ");

/**
 * Modules importing from another module, by path suffix — optionally only those importing
 * a NAMED binding from it. This is the reachability question: to write a file you have to
 * know where it is.
 */
export function importersOf(modules, suffix, binding = null) {
  const pattern = binding
    ? new RegExp(`import\\s*\\{[^}]*\\b${escape(binding)}\\b[^}]*\\}\\s*from\\s*["'][^"']*${escape(suffix)}["']`, "u")
    : new RegExp(`from\\s*["'][^"']*${escape(suffix)}["']`, "u");
  return modules
    .filter(({ code }) => pattern.test(withoutComments(code)))
    .map(({ rel }) => rel)
    .sort();
}

const shipped = defaultCriterion();
const digest = criterionDigest(shipped);
const W = PAIR_OUTCOMES.FAVOURABLE;

const ruling = (overrides = {}) => ({
  key: "work.loop.reviewRounds",
  from: 1,
  to: 2,
  epochId: "61",
  criterion: digest,
  ledger: [W],
  evalue: 1.5,
  counterMetric: { before: 0, after: 0, measured: true },
  dwell: "cycles:2",
  dwellFrom: "61",
  provenance: "acceptor",
  verdict: "report-only",
  refusals: ["evidence-short"],
  ...overrides,
});

// A CO-AUTHORED configuration: an operator's key order, an operator's formatting.
const CONFIG_TEXT = [
  "{",
  '  "$schema": "https://aof.local/schemas/aof.schema.json",',
  '  "name": "fixture",',
  '  "work": {',
  '    "dir": "./wiki/work",',
  '    "tags": { "layers": ["@cli", "@ui"] },',
  '    "loop": {',
  '      "reviewRounds": 1,',
  '      "buildNoProgressRounds": 2',
  "    },",
  '    "autonomous": { "maxAttempts": 3 }',
  "  },",
  '  "memory": { "backend": "local" }',
  "}",
  "",
].join("\n");

// Every key path in an object, in FILE ORDER — what "its order survives" is a claim about.
function keyPaths(value, prefix = "") {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value).flatMap((key) => [`${prefix}${key}`, ...keyPaths(value[key], `${prefix}${key}.`)]);
}

function refusalOf(body) {
  try {
    body();
  } catch (error) {
    return error;
  }
  assert.fail("expected a refusal, and nothing was refused");
  return null;
}

export const archTests = [
  {
    name: "arch/61 FF-6108: EFFECTS gains exactly ONE name and no tenth — one reactor at a known locus with an async apply, and the eight already declared are byte-intact",
    run: async () => {
      const names = knownEvents();
      assert.equal(names.length, Object.keys(THE_EIGHT).length + 1, `the vocabulary gained exactly one name: ${names.join(", ")}`);
      assert.deepEqual(names, [...Object.keys(THE_EIGHT), HARNESS_RULED], "…the ruling name, appended after the eight that were already there");

      for (const [name, keys] of Object.entries(THE_EIGHT)) {
        assert.deepEqual(EFFECTS[name].map((reactor) => reactor.key), keys, `${name}: its declared consequences are untouched`);
      }

      const reactors = EFFECTS[HARNESS_RULED];
      assert.equal(reactors.length, 1, "its reactor set is exactly one entry");
      assert.equal(reactors[0].key, STAMP_EVIDENCE);
      assert.ok(isKnownLocus(reactors[0].locus), `carrying a known locus (${reactors[0].locus})`);
      assert.equal(reactors[0].locus, "checkout", "…and it is `checkout`, because the ledger is a working-tree write in the workspace's own tracked state");
      assert.equal(reactors[0].apply.constructor.name, "AsyncFunction", "with an async apply");
      assert.equal(typeof reactors[0].applies, "undefined", "and no applicability predicate: a ruling is owed its record in every workspace");
      assert.ok(Object.isFrozen(EFFECTS) && Object.isFrozen(reactors), "the vocabulary stays closed at runtime");
    },
  },

  {
    name: "arch/61 FF-6108: the ledger has ONE writer — the path's literal has one home, exactly one module imports it, and exactly one module writes against it (planted)",
    run: async () => {
      const modules = await srcModules();
      assert.ok(modules.length > 100, `all of src/ was read: ${modules.length} modules`);

      // (a) THE PATH HAS ONE HOME — declared beside the criterion record it is the evidence
      // for. A second spelling is the second home that goes stale.
      // Comments stripped, string literals KEPT: a path discussed in a comment is not a
      // second home for it, but a path spelled in code is.
      const spells = modules.filter(({ code }) => withoutComments(code).includes(LEDGER_RELPATH)).map(({ rel }) => rel);
      // ONE HOME, spelled as the floor that keeps the sweep non-vacuous plus a declared ceiling —
      // never as a one-member census (FF-11902): the module is named AMONG what the sweep found.
      assert.ok(spells.length >= 1, "the sweep of src/ found no module spelling the ledger path");
      assert.ok(spells.length <= 1, `the ledger path is spelled in exactly one module — found: ${spells.join(", ")}`);
      assert.equal(spells[0], "src/work-acceptor/criterion.mjs", "…and it is the acceptor's criterion module");

      // (b) AND EXACTLY ONE MODULE REACHES IT. Knowing where the ledger is, is what it
      // takes to write it — so with (a) this closes the set: no other module in `src/` can
      // name the acceptor's ledger at all, by literal or by import.
      const reachers = importersOf(modules, "criterion.mjs", "LEDGER_RELPATH");
      assert.deepEqual(reachers, ["src/work-acceptor/store.mjs"], "exactly one module reaches the ledger's path");

      // (c) AND THAT MODULE IS THE ONE THAT WRITES IT — the claim made positively, so the
      // chain is "one home, one reacher, and the reacher really does the write" rather than
      // an absence nobody checked.
      const sites = ledgerWriteSites(modules.filter(({ rel }) => reachers.includes(rel) || rel === spells[0]));
      assert.deepEqual(
        [...new Set(sites.map((site) => site.rel))],
        ["src/work-acceptor/store.mjs"],
        `the ledger is written from one place only, and the module that DECLARES its path does not write it (found: ${JSON.stringify(sites)})`,
      );
      assert.ok(sites.length >= 1, "…and the sweep really found the write it is about");

      // NON-VACUITY, PLANTED BOTH WAYS: the detector sees a second writer, and does not
      // report a write that targets something else.
      assert.equal(ledgerWriteSites([{ rel: "src/planted.mjs", code: "await appendFile(ledgerFile, line);\n" }]).length, 1, "a second ledger writer is reported");
      assert.deepEqual(ledgerWriteSites([{ rel: "src/planted.mjs", code: "await writeFile(configFile, next);\n" }]), [], "…and a write to something else is not");
      assert.deepEqual(ledgerWriteSites([{ rel: "src/planted.mjs", code: "// await appendFile(ledgerFile, line);\n" }]), [], "…nor is a write that exists only in a comment");
    },
  },

  {
    name: "arch/61 FF-6108: the knob write is SURGICAL — planted, every other key, its order, the file's indentation and its trailing newline survive a write",
    run: async () => {
      const next = setKnobValue(CONFIG_TEXT, "work.loop.reviewRounds", 4);
      const before = JSON.parse(CONFIG_TEXT);
      const after = JSON.parse(next);

      assert.equal(after.work.loop.reviewRounds, 4, "the value the ruling named moved");
      assert.deepEqual(keyPaths(after), keyPaths(before), "every other key survives, in its order, at every level");
      before.work.loop.reviewRounds = 4;
      assert.deepEqual(after, before, "…and every other VALUE survives too");

      // THE TEXT, not just the document. A re-render would agree with everything above and
      // still rewrite the operator's file.
      assert.equal(next.endsWith("\n"), true, "the trailing newline survives");
      assert.ok(next.includes('"tags": { "layers": ["@cli", "@ui"] },'), "the compact hand-written line survives verbatim");
      assert.ok(next.includes('"buildNoProgressRounds": 2'), "the sibling key beside the one that moved survives verbatim");
      // Exactly one span differs, and it is the value's own.
      const differsAt = [...CONFIG_TEXT].findIndex((char, index) => char !== next[index]);
      assert.ok(differsAt > 0, "the two texts diverge somewhere");
      assert.equal(CONFIG_TEXT.slice(0, differsAt), next.slice(0, differsAt));
      assert.equal(CONFIG_TEXT.slice(differsAt + 1), next.slice(differsAt + 1), "and they re-converge one character later — one value, nothing else");

      // A FILE WITH DIFFERENT FORMATTING KEEPS ITS OWN. Four-space indent, and it stays.
      const wide = '{\n    "work": {\n        "loop": {\n            "reviewRounds": 1\n        }\n    }\n}\n';
      assert.equal(setKnobValue(wide, "work.loop.reviewRounds", 9), wide.replace('"reviewRounds": 1', '"reviewRounds": 9'), "a differently formatted file keeps its own formatting");

      // AN ABSENT KEY IS INSERTED INTO ITS SECTION rather than rebuilding the file; an
      // absent SECTION is created in the file's own indentation. Refusing instead would
      // leave a declared knob unwritable in a configuration that simply never named it.
      const inserted = JSON.parse(setKnobValue(CONFIG_TEXT, "work.loop.newRounds", 7));
      assert.equal(inserted.work.loop.newRounds, 7, "an absent key is inserted");
      assert.deepEqual(keyPaths(inserted.work.loop), ["reviewRounds", "buildNoProgressRounds", "newRounds"], "…after the members already there, never ahead of them");
      const created = JSON.parse(setKnobValue(CONFIG_TEXT, "work.pace.rounds", 3));
      assert.equal(created.work.pace.rounds, 3, "an absent section is created");
      assert.deepEqual(keyPaths(created).slice(0, 3), keyPaths(before).slice(0, 3), "…with everything before it untouched");

      // AND IT REFUSES RATHER THAN GUESSES. A knob holds one ordered value; a section where
      // a value stands is not a path this file can hold.
      assert.equal(refusalOf(() => setKnobValue(CONFIG_TEXT, "work.loop.reviewRounds", { a: 1 })).code, "knob-value-not-scalar");
      assert.equal(refusalOf(() => setKnobValue(CONFIG_TEXT, "work.dir.deeper", 1)).code, "knob-path-not-a-section");
      assert.equal(refusalOf(() => setKnobValue(CONFIG_TEXT, "", 1)).code, "knob-key-unreadable");
      assert.equal(refusalOf(() => setKnobValue("not json", "work.a", 1)).code, "config-not-an-object");
    },
  },

  {
    name: "arch/61 FF-6108: no module in src/ assigns at a DECLARED TUNABLE KNOB path — the set comes from the registry's parameter-tuning edge, and the sweep can see one that does",
    run: async () => {
      const model = await loadLoops(path.join(root, "src", "bundle"));
      const declared = tunableSet(model).keys;
      assert.ok(declared.length >= 3, `the registry supplied the declared keys: ${declared.join(", ")}`);

      const modules = await srcModules();
      assert.deepEqual(knobPathWriters(modules, declared), [], "a harness value is moved through the acceptor's one writer or not at all");

      // NON-VACUITY, AND THE DISTINCTION. An assignment is reported; a READ of the same key
      // is not (69's guard already tracks readers, and this leg is about writes), and
      // neither is a key quoted in a diagnostic or written in a comment.
      const [key] = declared;
      assert.equal(knobPathWriters([{ rel: "src/planted.mjs", code: `config.${key} = 4;\n` }], declared).length, 1, "an assignment at a declared knob is reported");
      assert.deepEqual(knobPathWriters([{ rel: "src/planted.mjs", code: `const n = config?.${key} ?? 3;\n` }], declared), [], "a read is not a write");
      assert.deepEqual(knobPathWriters([{ rel: "src/planted.mjs", code: `throw new Error("${key} is frozen");\n` }], declared), [], "a key quoted in a diagnostic is not a write");
      assert.deepEqual(knobPathWriters([{ rel: "src/planted.mjs", code: `// config.${key} = 4;\n` }], declared), [], "nor is one that exists only in a comment");

      // …and the module named as NOT being the writer still is not one: `config-editor.mjs`
      // preserves `work` verbatim rather than offering a path into it (ADR-007 §2a).
      const editor = codeOnly(await readFile(path.join(SRC_DIR, "config-editor.mjs"), "utf8"));
      assert.ok(/existing\.work\s*\?\s*\{\s*work:\s*existing\.work\s*\}/u.test(editor), "config-editor still carries `work` through verbatim");
    },
  },

  {
    name: "arch/61 FF-6108: the store is reached only from the seam and its reactor, and no command or face reaches it",
    run: async () => {
      const modules = await srcModules();
      const importers = importersOf(modules, "work-acceptor/store.mjs");
      assert.deepEqual(
        importers,
        ["src/effects/harness-transitions.mjs", "src/effects/table.mjs"],
        "the seam holds the knob write and the reactor holds the ledger append — nothing else reaches either",
      );
      assert.deepEqual(importers.filter((rel) => rel.startsWith("src/commands/")), [], "and no command reaches it: a knob movable from a surface is a knob movable without a ruling");
    },
  },

  {
    name: "arch/61 FF-6108: re-appending the same ruling identity yields a BYTE-IDENTICAL ledger rather than a second line, and a different record under that identity is refused",
    run: async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-ff6108-ledger-"));
      try {
        await mkdir(path.join(dir, ".aof"), { recursive: true });
        const record = ruling();
        const first = await appendRuling(dir, { rulingId: "r-1", ruling: record });
        assert.equal(first.appended, true);
        const before = await readLedger(dir);

        const again = await appendRuling(dir, { rulingId: "r-1", ruling: record });
        assert.equal(again.appended, false, "a redelivery appends nothing");
        assert.equal(again.line, before.lines[0], "…and would have written the identical line");
        const after = await readLedger(dir);
        assert.equal(after.text, before.text, "the ledger is byte-identical");

        // Identity, not resemblance, in BOTH directions: a second ruling that reads the same
        // is two rulings, and the same identity reading differently is a conflict.
        await appendRuling(dir, { rulingId: "r-2", ruling: record });
        assert.equal((await readLedger(dir)).total, 2, "two genuinely separate rulings are two records");
        let conflict = null;
        try {
          await appendRuling(dir, { rulingId: "r-1", ruling: ruling({ to: 3 }) });
        } catch (error) {
          conflict = error;
        }
        assert.equal(conflict?.code, "ledger-line-conflict", "the same identity carrying different contents is refused");
        assert.equal((await readLedger(dir)).total, 2, "…and nothing landed");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },

  {
    name: "arch/61 FF-6108: `applicableReactors` refuses an undeclared name with a CODE — so table.mjs's own comment is true at HEAD for the first time, and the refusal is disjoint from every storage fault and from the ruling vocabulary",
    run: async () => {
      // The refusal, against the supplied table.
      let refusal = null;
      try {
        await applicableReactors("harness.ruleed", {});
      } catch (error) {
        refusal = error;
      }
      assert.equal(refusal?.code, EVENT_NOT_DECLARED, "an undeclared name is refused rather than resolving to zero reactors");
      assert.equal(refusal.event, "harness.ruleed", "…naming the name it was given");

      // AND THE COMMENT IS NOW TRUE. The false sentence is gone, and the module says where
      // the door actually is.
      const table = await readFile(path.join(SRC_DIR, "effects", "table.mjs"), "utf8");
      assert.equal(/appendEvent refuses a name not declared here/u.test(table), false, "the claim that `appendEvent` does the refusing is retired — it never did");
      assert.ok(/refused by `applicableReactors`|REFUSED — by `applicableReactors`/u.test(table), "…and the vocabulary's own file names the door that does");
      assert.ok(/throw new UndeclaredEventError/u.test(codeOnly(table)), "…which is executable, not prose");

      // DISJOINT FROM THE STORAGE FAULTS. "Nobody knows that name" and "the event could not
      // be stored" are different answers and a caller must be able to branch on which.
      const globalHome = await mkdtemp(path.join(os.tmpdir(), "aof-ff6108-gh-"));
      try {
        const journal = await openEffectsJournal({ env: { ...process.env, AOF_GLOBAL_HOME: globalHome } });
        try {
          let stored = null;
          try {
            appendEvent(journal, { name: "", payload: {} }, []);
          } catch (error) {
            stored = error;
          }
          assert.equal(stored?.code, "invalid-event");
          assert.notEqual(stored.code, EVENT_NOT_DECLARED, "a storage fault is told apart from an undeclared name");
        } finally {
          journal.close();
        }
      } finally {
        await rm(globalHome, { recursive: true, force: true });
      }

      // AND DISJOINT FROM THE RULING VOCABULARY. Every code this story mints is a
      // CONSTRUCTION refusal — thrown, meaning no ruling was produced at all — so none of
      // them may ever appear as a ground a ruling reports about itself.
      // The census is the codes this story mints, kept COMPLETE rather than illustrative:
      // the seam's two (a record that did not land, and a drain that may not be skipped)
      // and the store's whole declared set, which is imported so a code added there joins
      // this check without anybody remembering to.
      const minted = [EVENT_NOT_DECLARED, "harness-record-not-stamped", "harness-drain-not-optional", ...STORE_REFUSALS];
      assert.equal(new Set(minted).size, minted.length, "the minted codes are distinct from each other");
      assert.deepEqual(minted.filter((code) => THE_SEVEN.includes(code)), [], "and none of them is a ruling refusal — the two vocabularies stay disjoint");
    },
  },

  {
    name: "arch/61 FF-6108: every appendEvent call site in src/ is an admitted seam — the set gained exactly the new one — and journal.mjs still imports no vocabulary",
    run: async () => {
      const modules = await srcModules();
      const callers = modules
        .filter(({ rel, code }) => rel !== "src/effects/journal.mjs" && /\bappendEvent\s*\(/u.test(codeOnly(code)))
        .map(({ rel }) => rel)
        .sort();
      assert.deepEqual(callers, [...APPEND_EVENT_SEAMS], "the appending seams are the admitted set, and it gained exactly the harness seam");
      assert.ok(callers.includes("src/effects/harness-transitions.mjs"), "…which is in it");

      // THE LAYERING IS UNCHANGED: dumb storage never learned the vocabulary. This is the
      // reason the undeclared-name refusal went where it did.
      const journal = await readFile(path.join(SRC_DIR, "effects", "journal.mjs"), "utf8");
      assert.equal(/from\s+["'][^"']*table\.mjs["']/u.test(journal), false, "journal.mjs imports no vocabulary");
      assert.equal(/\bEFFECTS\b/u.test(codeOnly(journal)), false, "…and names none");
      assert.deepEqual(
        importSpecifiers(journal).map((entry) => entry.specifier).sort(),
        // `../sqlite-runtime.mjs` admitted by milestone 126 / story 05 (ADR-008 §1). The
        // CLAIM this list defends is the two lines above it — dumb storage never learned the
        // vocabulary — and a runtime-import leaf is not vocabulary: it holds no reactor name,
        // decides no policy, and the journal's own refusal and `DatabaseSync` check both stay
        // in `resolveSqlite`. The import is a SUBTRACTION at the tree level: it exists because
        // the journal's `await import("node:sqlite")` and the global store's identical copy
        // collapsed onto one home, so the ExperimentalWarning could be filtered there instead
        // of suppressed by a blanket `--no-warnings` nobody could scope. The list stays exact
        // — this is an admission, not a loosening.
        ["../degrade.mjs", "../sqlite-runtime.mjs", "../workspace.mjs", "node:crypto", "node:fs/promises", "node:path"],
        "its imports are exactly what they were, plus the one runtime-import home 126/05 admitted",
      );
    },
  },

  {
    name: "arch/61 FF-6108: the ledger path is ABSENT from AOF_GITIGNORE_ENTRIES — it is neither derived nor regenerable, and being tracked is what makes one revert carry the evidence with the change",
    run: async () => {
      assert.equal(AOF_GITIGNORE_ENTRIES.includes(LEDGER_RELPATH), false, "the ledger is not in the derived-artifact register");
      assert.equal(AOF_GITIGNORE_ENTRIES.includes(path.posix.basename(LEDGER_RELPATH)), false, "…nor by the basename form that register uses");
      assert.deepEqual(
        AOF_GITIGNORE_ENTRIES.filter((entry) => /acceptor/u.test(entry)),
        [],
        "…nor under any other spelling of the acceptor's records",
      );
      // NON-VACUITY: the register really does carry entries, so the absence above is a
      // measured absence and not an empty list.
      assert.ok(AOF_GITIGNORE_ENTRIES.length >= 5, `the register was read: ${AOF_GITIGNORE_ENTRIES.join(", ")}`);

      // …and the workspace's own `.aof/.gitignore`, written from that register, does not
      // reach the ledger under any pattern either.
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-ff6108-ignore-"));
      try {
        await mkdir(path.join(dir, ".aof"), { recursive: true });
        await writeFile(path.join(dir, ".aof", ".gitignore"), `${AOF_GITIGNORE_ENTRIES.join("\n")}\n`, "utf8");
        const patterns = (await readFile(path.join(dir, ".aof", ".gitignore"), "utf8")).split("\n").map((line) => line.trim()).filter(Boolean);
        const basename = path.posix.basename(LEDGER_RELPATH);
        for (const pattern of patterns) {
          assert.equal(pattern === basename || pattern === "*" || pattern === `*${path.posix.extname(basename)}`, false, `the baseline pattern ${JSON.stringify(pattern)} does not reach the ledger`);
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
];
