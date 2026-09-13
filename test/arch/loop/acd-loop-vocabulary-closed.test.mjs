import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ADMITTED_KEYS, CADENCE_KINDS, EDGE_KEYS, ENDPOINT_SCHEMES, EVENT_TRIGGERS, FIELD_KINDS,
  GROUND_VALUES, LOADER_FINDING_CODES, NODE_KINDS, PERIODIC_UNITS, POINTER_SCHEMES,
  SENTINEL_TOKENS, loadLoops,
} from "../../../src/work/loops.mjs";
import * as loaderModule from "../../../src/work/loops.mjs";
import { CHECK_FINDING_CODES, CHECK_IDS } from "../../../src/work/loops-checks.mjs";
import { COMPOSED_CHECK_IDS } from "../../../src/work/doctor-loop-ready.mjs";

// 59/ADR-001 §3 appends `reporting` — the SIXTH edge key, outbound from an auditor. Every literal
// below is stated as the whole frozen set after the widening, never as a delta, so a member silently
// dropped by a later milestone still fails here.
const edges = ["data-feed", "target-setting", "monitoring", "veto", "parameter-tuning", "reporting"];
const control = ["controlled", "reference", "measurement", "actuator", "cadence", "ceiling", "owner", "optimizing"];
// A key no kind admits, used by the outside-the-union row below and asserted to still be one.
const OUTSIDE_THE_UNION = "handover";
function sorted(value) { return [...value].sort(); }
function equalSet(actual, expected) { assert.deepEqual(sorted(actual), sorted(expected)); }

const valid = (stem, extra = "") => `---\nid: loop:${stem}\nkind: loop\ntitle: ${stem}\ncontrolled: state\nreference: [prose:a.md]\nmeasurement: [prose:a.md]\nactuator: [prose:a.md]\ncadence: event:per-item\nceiling: none\nowner: unknown\noptimizing: false\n${extra}---\n# ${stem}\n`;
// An ACTOR record — `kind: actor` admits `ground` and none of the eight control fields
// (ADR-011 §3), which is the other half of the kind-scoped admitted-key set and the half no
// loader fixture reached before.
const validActor = (stem, extra = "") => `---\nid: actor:${stem}\nkind: actor\ntitle: ${stem}\nground: exogenous\n${extra}---\n# ${stem}\n`;

export const archTests = [
  {
    name: "arch/52 FF-5203: all thirteen exported vocabularies equal the governing ADR literals",
    run: () => {
      equalSet(ADMITTED_KEYS.loop, ["id", "kind", "title", ...control, "layer", ...edges]);
      equalSet(ADMITTED_KEYS.actor, ["id", "kind", "title", "ground", ...edges]);
      equalSet(ADMITTED_KEYS.anchor, ["id", "kind", "title", "ground", "observes", "checked", ...edges]);
      equalSet(ADMITTED_KEYS.watcher, ["id", "kind", "title", "counter", "determinism", "measurement", ...edges]);
      equalSet(ADMITTED_KEYS.arbiter, ["id", "kind", "title", "resolves", "priority", "dwell", ...edges]);
      // 59/ADR-001 §1 — the auditor's frozen set. `measurement` and `cadence` are REUSED rather than
      // renamed; the ten keys it omits (`actuator`, `optimizing`, `controlled`, `reference`,
      // `ground`, `counter`, `determinism`, `layer`, `owner`, `ceiling`) are absent from this
      // literal, which is where the omission is decided.
      equalSet(ADMITTED_KEYS.auditor, ["id", "kind", "title", "audits", "measurement", "cadence", "escalation", ...edges]);
      equalSet(ADMITTED_KEYS.all, ["id", "kind", "title", "ground", "observes", "checked", "counter", "determinism", "resolves", "priority", "dwell", "audits", "escalation", "layer", ...control, ...edges]);
      equalSet(NODE_KINDS, ["loop", "actor", "anchor", "watcher", "arbiter", "auditor"]);
      equalSet(EDGE_KEYS, edges);
      equalSet(POINTER_SCHEMES, ["module", "command", "config"]);
      equalSet(ENDPOINT_SCHEMES, ["loop", "actor", "item", "command", "config", "module", "arbiter"]);
      equalSet(SENTINEL_TOKENS, ["unknown", "uncapped", "none", "prose:"]);
      equalSet(CADENCE_KINDS, ["periodic:", "event:", "unknown"]);
      equalSet(EVENT_TRIGGERS, ["per-item", "per-phase", "per-milestone", "per-run-start"]);
      equalSet(PERIODIC_UNITS, ["ms", "s", "m", "h", "d"]);
      equalSet(GROUND_VALUES, ["process-exit", "build-stamp", "landed-commit", "live-soak", "frozen-rule", "exogenous"]);
      equalSet(FIELD_KINDS, ["pointer", "prose", "phrase", "unknown", "uncapped", "none", "periodic", "event", "ref", "flag", "enum", "cycles", "date"]);
      equalSet(CHECK_IDS, ["grounding", "anchor-grounding", "pairing", "reference-ownership", "actuator-arbitration", "timescale"]);

      // FF-5807 (58/ADR-005 §3, ADR-006 §Codebase health) — THE CHECK-ID CENSUS HAS ONE AUTHORITY,
      // AND EVERY PRODUCTION COPY AGREES. `src/work/doctor-loop-ready.mjs:13` carries a SECOND copy
      // of these six ids, kept in step by nothing: doctor maps `COMPOSED_CHECK_IDS` to lanes and
      // scores what it finds, so a seventh check id added to `CHECK_IDS` alone would leave doctor
      // silently scoring six of seven and the L3 unlock computed over a check nobody ran. Identical
      // MEMBERS IN IDENTICAL ORDER, because the order is what doctor's lane report is read in.
      assert.deepEqual([...COMPOSED_CHECK_IDS], [...CHECK_IDS],
        "the six check ids have one authority; work-doctor-loop-ready's copy must not drift from it");

      // FF-5807's second half — THE TWO MAGIC-NUMBER COUNTS ARE GONE FROM THIS GUARD. They used to
      // read `CHECK_FINDING_CODES.size === 15` and `LOADER_FINDING_CODES.length === 17`, which is a
      // census asserted as a NUMBER in a file that names every other vocabulary by its members. A
      // count is satisfied by any fifteen codes, so it says nothing about which; and it turns every
      // legitimate widening into an edit to a file the widening's story may not own (58/02 takes the
      // check codes to 21 and may not write this file — ADR-007 §1). The surviving authority is the
      // exhaustive by-name table in `acd-loop-finding-envelope.test.mjs:251-252`, which decides the
      // same fact strictly more precisely, and both sets are still asserted FROZEN below.
      assert.equal(typeof CHECK_FINDING_CODES.size, "number", "…the census itself still exists; what moved is where it is asserted BY NAME");
      assert.ok(LOADER_FINDING_CODES.length > 0, "…and the loader's own lane is non-empty, so the removal above did not silently empty it");

      // THE HOME IS PART OF THE CONTRACT (01_vocabulary-and-records.feature:65, ADR-012 §2/B2):
      // "an id set exported by the loader instead fails the gate, whatever its members". Importing
      // the two check vocabularies BY NAME from the checks module says nothing about where else
      // they might also live — a loader that ALSO exported them would satisfy every set-equality
      // above while re-opening exactly the lane-scoping ADR-011 §1 closed. So the loader's own
      // namespace is asserted not to carry them.
      assert.equal("CHECK_IDS" in loaderModule, false, "the six check ids have ONE home, and it is src/work/loops-checks.mjs — the loader is never asked what the checks are called");
      assert.equal("CHECK_FINDING_CODES" in loaderModule, false, "the checks' fifteen codes have ONE home — a second export of them in the loader is the duplication ADR-011 §1's lane-scoping refuses");
      assert.ok("LOADER_FINDING_CODES" in loaderModule, "…and the assertions above are about the HOME, not about an empty namespace: the loader's own lane IS exported here");
      for (const set of [EDGE_KEYS, NODE_KINDS, POINTER_SCHEMES, SENTINEL_TOKENS, CHECK_FINDING_CODES]) {
        const before = sorted(set); set.add("not-admitted"); assert.deepEqual(sorted(set), before);
      }
    },
  },
  {
    name: "arch/52 FF-5203: outside tokens and shape slips produce one precedence-selected finding",
    run: async () => {
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-loop-vocab-"));
      try {
        const dir = path.join(temp, "loops"); await mkdir(dir);
        const cases = {
          // The blank line and the `#` comment sit INSIDE this record's frontmatter block, above
          // an ordinary key. `01_vocabulary-and-records.feature:100` — "a blank line and a `#`
          // comment line inside the block produce no finding" — is a SKIP RULE, and a skip rule is
          // only asserted by a fixture that contains the lines it must skip: the exact code array
          // below then pins that neither produced a `loop-malformed-frontmatter-line`, and that
          // neither displaced the keys after it.
          // THE TOKEN IS CHOSEN FOR BEING OUTSIDE THE UNION, and is asserted to be so below. It was
          // `escalation:` until 59/ADR-001 §1 made that an auditor's required key — a token picked
          // as "a word the vocabulary has never heard of" stops being one the moment a milestone
          // hears it, and the failure then reads as a code mismatch rather than as what it is.
          [OUTSIDE_THE_UNION]: valid(OUTSIDE_THE_UNION, `${OUTSIDE_THE_UNION}: [loop:x]\n`)
            .replace("cadence: event:per-item\n", "\n# a comment line the parser must skip\ncadence: event:per-item\n"),
          wrongkind: valid("wrongkind", "ground: exogenous\n"),
          malformed: valid("malformed", "veto/constraint: [loop:x]\n"),
          badpointer: valid("badpointer").replace("reference: [prose:a.md]", "reference: [doc:a.md]"),
          badhash: valid("badhash").replace("reference: [prose:a.md]", "reference: [command:work:next#x]"),
          badcadence: valid("badcadence").replace("event:per-item", "event:per-eclipse"),
          scalarlist: valid("scalarlist").replace("controlled: state", "controlled: []"),
          empty: valid("empty").replace("reference: [prose:a.md]", "reference: []"),
          mismatch: valid("other").replace("id: loop:other", "id: loop:not-mismatch"),
          missing: valid("missing").replace("actuator: [prose:a.md]\n", ""),
          // The id-mismatch code has TWO branches and only the stem one had a fixture: here the
          // STEM matches and the SCHEME does not (`id: actor:…` on a `kind: loop` record), which
          // is `01_vocabulary-and-records.feature:155` — "the scheme must match `kind`". Without
          // this row that branch is dead: forcing it false stays green.
          schememismatch: valid("schememismatch").replace("id: loop:schememismatch", "id: actor:schememismatch"),
          // `01_vocabulary-and-records.feature:139` — an empty list fails on an EDGE key exactly
          // as it does on a machinery key ("an absent key is how a record says 'no edges of that
          // type'"); only `reference: []` was exercised, and the two travel different code paths.
          emptyedge: valid("emptyedge", "monitoring: []\n"),
          // `:108-113` — a malformed pointer of an ADMITTED scheme: `module:` with no `#symbol`.
          // Distinct from `badpointer` (an unadmitted scheme) and from `badhash` (a `#` on a
          // non-`module:` pointer), and it was the one of the three with no fixture.
          badmodule: valid("badmodule").replace("reference: [prose:a.md]", "reference: [module:src/run-store.mjs]"),
          // `:90` — a `kind: actor` record carrying a control key fails the same way a loop
          // carrying `ground:` does. No fixture in ANY loader test declared `kind: actor`, so the
          // actor half of the kind-scoped set was unmechanised in both directions; this row also
          // pins `:91` — `ground: exogenous` on an actor produces NO finding, since the record
          // carries it and the expected array below holds nothing for it.
          actorcontrol: validActor("actorcontrol", "cadence: event:per-item\n"),
          // The value gate is reached because `ground` is admitted on this kind; the token
          // remains outside the widened milestone-55 taxonomy.
          actorground: validActor("actorground").replace("ground: exogenous", "ground: measured"),
        };
        for (const [name, text] of Object.entries(cases)) await writeFile(path.join(dir, `${name}.md`), text);
        const model = await loadLoops(temp);
        const codesFor = (name) => model.findings.filter((f) => path.basename(f.path) === `${name}.md`).map((f) => f.code);
        const prose = "loop-field-prose-only";
        const owner = "loop-owner-unknown";
        assert.equal(ADMITTED_KEYS.all.has(OUTSIDE_THE_UNION), false,
          `${OUTSIDE_THE_UNION} must stay outside the admitted-key union, or the row below decides nothing`);
        assert.deepEqual(codesFor(OUTSIDE_THE_UNION), [prose, prose, prose, owner, "loop-unknown-key"]);
        assert.deepEqual(codesFor("wrongkind"), [prose, prose, prose, owner, "loop-key-not-admitted-for-kind"]);
        assert.deepEqual(codesFor("malformed"), ["loop-malformed-frontmatter-line", prose, prose, prose, owner]);
        assert.deepEqual(codesFor("badpointer"), ["loop-bad-value", prose, prose, owner]);
        assert.deepEqual(codesFor("badhash"), ["loop-bad-value", prose, prose, owner]);
        assert.deepEqual(codesFor("badcadence"), [prose, prose, prose, "loop-bad-value", owner]);
        assert.deepEqual(codesFor("scalarlist"), ["loop-expected-scalar", prose, prose, prose, owner]);
        assert.deepEqual(codesFor("empty"), ["loop-empty-list", prose, prose, owner]);
        assert.deepEqual(codesFor("mismatch"), ["loop-id-mismatch", prose, prose, prose, owner]);
        assert.deepEqual(codesFor("missing"), [prose, prose, "loop-missing-field", owner]);
        assert.deepEqual(codesFor("schememismatch"), ["loop-id-mismatch", prose, prose, prose, owner]);
        assert.deepEqual(codesFor("emptyedge"), [prose, prose, prose, owner, "loop-empty-list"]);
        assert.deepEqual(codesFor("badmodule"), ["loop-bad-value", prose, prose, owner]);
        assert.deepEqual(codesFor("actorcontrol"), ["loop-key-not-admitted-for-kind"]);
        assert.deepEqual(codesFor("actorground"), ["loop-bad-value"]);
        // The two actor rows carry ONE finding each and nothing else — which is the assertion for
        // `ground: exogenous` producing none, for an actor needing no `cadence`/`owner`/machinery
        // (no `loop-missing-field`, no honesty warn), and for the ladder stopping at one finding.
        const messageFor = (name) => model.findings.filter((f) => path.basename(f.path) === `${name}.md`).map((f) => f.message);
        assert.deepEqual(messageFor("actorcontrol"), ["Key cadence is not admitted for kind actor"]);
        assert.deepEqual(messageFor("actorground"), ["Invalid value for ground: measured"]);
        assert.deepEqual(messageFor("schememismatch"), [
          "id actor:schememismatch must equal loop:schememismatch",
          "reference is backed only by prose: prose:a.md",
          "measurement is backed only by prose: prose:a.md",
          "actuator is backed only by prose: prose:a.md",
          "owner is declared unknown",
        ], "the scheme branch names the SCHEME it expected, not the stem it already matched");
        assert.equal(messageFor("emptyedge").at(-1), "monitoring must not be empty", "the empty-edge finding names the EDGE key, so a machinery-key message could not stand in for it");
        assert.equal(messageFor("badmodule").at(0), "Invalid value for reference: module:src/run-store.mjs", "the symbol-less module pointer is rejected by value, quoting the pointer as authored");
        equalSet(EDGE_KEYS, edges);
      } finally { await rm(temp, { recursive: true, force: true }); }
    },
  },
];
