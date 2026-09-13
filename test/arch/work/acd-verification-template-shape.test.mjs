// FF-6608 — "The bundle asks for what the checks enforce" (milestone 66 / story 03; ADR-005,
// ADR-006, ADR-007 §1/§3, ADR-009/H+I, ADR-011/E).
//
// WHAT THIS GATE EXISTS FOR. ACD's gates are met by agents reading `src/bundle/` prompts and
// templates, so a refusal no prompt ever asked for arrives as a surprise at `validate` and the
// agent's only recovery is to guess (ADR-007 §1). This suite asserts the ASK is present, in the
// file whose reader must obey it, spelled in the frozen wording — and it is the literal discharge
// of the finding's measured zero: eight falsifiability terms, 0 files each across `src/bundle/`.
//
// MEASURED AT HEAD BEFORE ANY EDIT (ADR-009/A — a "0 files contain X" claim is a MEASUREMENT, and
// this one was run from a script file with each constructed pattern printed beside its result,
// ADR-010/E). Over the 61 files of `src/bundle/` on 2026-08-16, case-insensitive, files-with-match:
//
//   red probe 0 · seen red 0 · vacuous 0 · positive control 0 · falsifi 0 · must fail 0 ·
//   observed failing 0 · probe 0
//
// After this story: 5 · 1 · 1 · 1 · 1 · 1 · 1 · 5. Lane 9 re-measures it here, and carries its own
// probe — blanking the template returns the six template-only terms to the measured zero.
//
// THE SHAPE OF THE PRESENCE SCAN, AND ITS DUAL. A presence-scan's passing state is "found it
// everywhere", which is not the vacuity shape a forbidding-grep has — but the dual applies and is
// asserted (lane 8): the scan must be shown to go RED. Every planted defect below is built by a
// CHECKED replace (assert the search string occurs; assert the result differs), never a blind one,
// and it is planted in a COPY of the file's text — nothing on disk is touched.
//
// THE TWO CROSS-BOUNDARY IDENTITIES ARE THE POINT, not decoration. A markdown template cannot
// import a JS constant, so the red-probe placeholder is two physically separate literals — the one
// 66/02's `recordsARedProbe` refuses and the one the template renders. Nothing but an assertion
// that reads both can hold them equal (`src/work/doctor-controls.mjs:79-88` says so in its own
// comment and names this file). The same applies to the two register headings, which must be the
// openers 66/01's recogniser actually accepts, in the kind ADR-008 ruling 4 assigns them.
import assert from "node:assert/strict";
import { readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REGISTER_BLOCKS,
  registerBlockKind,
  registerDeclarations,
  registerEntries,
  declaredIdOn,
  normalizeOpener,
  qualifiedRefsIn,
} from "../../../src/declared-id.mjs";
import { RED_PROBE_PLACEHOLDER, CONTROL_FINDING_CODES, recordsARedProbe } from "../../../src/work/doctor-controls.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BUNDLE = path.join(repoRoot, "src", "bundle");

const VERIFICATION_TEMPLATE = "templates/milestone/VERIFICATION.md";
const ARCHITECTURE_TEMPLATE = "templates/milestone/ARCHITECTURE.md";
const VERIFY = "commands/verify.md";
const REFINE = "commands/refine.md";
const ARCHITECT = "agents/aof-architect.md";

// The five REVIEWING agents, NAMED rather than counted (m47/R9, and the contract's own
// "the five are named in the guard, so a sixth reviewer added later without the rule fails
// instead of passing unnoticed"). developer / product-owner / researcher are outside the rule
// because they do not report into a findings register.
export const REVIEWING_AGENTS = Object.freeze([
  "agents/aof-architect.md",
  "agents/aof-qa.md",
  "agents/aof-security.md",
  "agents/aof-compliance.md",
  "agents/aof-designer.md",
]);

export const NON_REVIEWING_AGENTS = Object.freeze([
  "agents/aof-developer.md",
  "agents/aof-product-owner.md",
  "agents/aof-researcher.md",
]);

function bundleText(relative) {
  return readFileSync(path.join(BUNDLE, ...relative.split("/")), "utf8");
}

function bundleFiles() {
  const out = [];
  const walk = (dir, prefix) => {
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (statSync(abs).isDirectory()) walk(abs, rel);
      else out.push(rel);
    }
  };
  walk(BUNDLE, "");
  return out.sort();
}

// ─────────────────────────────────────────────────────── the frozen literals ──
//
// The FOUR ADR-005 §1 headings. `## Fitness functions` and `## Findings` are cross-checked against
// 66/01's shipped `REGISTER_BLOCKS` below — they are not free wording, they are the openers the
// recogniser accepts.
export const FROZEN_HEADINGS = Object.freeze([
  Object.freeze({ heading: "## Verification evidence", nearMiss: "## Evidence" }),
  Object.freeze({ heading: "## Fitness functions", nearMiss: "## Fitness register" }),
  Object.freeze({ heading: "## Findings", nearMiss: "## Findings and triage" }),
  Object.freeze({ heading: "## Accept decision", nearMiss: "## Acceptance" }),
]);

export const FITNESS_HEADER_ROW = "| id | enforced by | result | red probe |";
export const FINDINGS_HEADER_ROW = "| id | observed | type | severity | triage | routed-to | status |";

const RUNNABLE_PATH_RULE =
  "**A declared control must resolve to a path a runner can see** — the fitness register names the arch-test's INTENDED PATH in the runnable test tree, registered in a runner; a test-shaped file under the work tree is NOT that place, and a control whose file has not landed yet carries the token `pending` in its own entry rather than being parked anywhere.";

const CITATION_FORM_RULE =
  "**Cite another item's id as `m?<itemRef>/<ID>`** — the `m` prefix is optional, because both spellings are real — **and cite only ids that resolve**: a bare id is addressable only inside its own item's documents, so a cross-item citation carries the ref.";

const UNNUMBERED_RULE =
  "**Report findings UNNUMBERED** — an ordered list, one line each. The id (and therefore any `@finding-<id>` tag) is allocated by the SINGLE WRITER at the moment of landing the finding in the register, never chosen by you.";

const SINGLE_WRITER_RULE =
  "**The single writer allocates ids at the moment of landing them in the register** — for a `VERIFICATION.md` that is the product owner running `aof:verify`, already the sole author of the record documents. Nobody is asked to check first, because a stale read is impossible when there is no second reader.";

// THE ACCEPT RULE IS AN INSTRUCTION TO A READER, NOT A DESCRIPTION OF MACHINERY, and the wording has
// to say so. ADR-011/E is explicit that the refusal is UNBUILT: aof's own repo carries it as an
// arch-test (`acd-milestone-66-controls-resolve.test.mjs`), but a downstream project has no such
// test and sees only `control-unresolved` — at `warn` whenever a `pending` marker stands, and a
// warn-only doctor result does not fail `aof:validate` (`validate.md`'s own words). The earlier
// wording derived "an item is never accepted…" from "…not admitted once the item is `done`" with an
// invalid *so*, which shipped this milestone's own thesis — a control that depends on somebody
// remembering is a wish — as a promise into every future project's templates.
const ACCEPT_RULE =
  "**Do not accept an item whose `ARCHITECTURE.md` register declares a control that does not resolve** — marker or no marker. Nothing refuses the transition for you: `aof work doctor <ref>` reports each one as `control-unresolved`, a standing `pending` marker downgrades it to `warn`, and a warn-only doctor result does not fail `aof:validate`. What clears it is landing the file or dropping the declaration, never re-marking it `pending`.";

const RED_PROBE_ASK =
  "The `red probe` cell records what was changed to make the control fail, and the message observed.";

// THE SEVENTH ASK — ADR-010/D's write-apart rule, frozen in an ADR and shipped to nobody. Measured
// over `src/bundle/` before this round: 0 files carried it, in any spelling. The other five citation
// asks all say "cite only ids that resolve" and say NOTHING about how to quote an id that does not —
// so `register-dangling-citation` shipped as a refusal whose prevention lived only in a document no
// downstream project reads. That is the trap ADR-007 §1 forbids, in the milestone that wrote it.
//
// THE EVIDENCE IS THIS MILESTONE'S OWN RECORD, three occurrences from three authors: 66's
// `ARCHITECTURE.md` was refused by the gate 66 ships, over two joined specimens; ADR-010/D records
// the same slip twice while drafting its own row; and the ruling that forbids it wrote both
// specimens joined again, caught only on re-measure.
//
// THE SENTENCE PLANTS NOTHING ITSELF, deliberately: it carries no digits and no slash-joined id, so
// the qualified-ref grammar finds nothing in it — which matters, because this one ships INTO a
// scaffolded `ARCHITECTURE.md` and `qualifiedRefsIn` reads raw text without skipping comments.
const WRITE_APART_RULE =
  "**When you QUOTE an id that does not resolve, write it APART (`item` + `id`), never joined** — a joined specimen is not a specimen: the grammar reads it as a real citation and plants it in your own register.";

// ADR-005 §4's honesty boundary, as FOUR WHOLE SENTENCES rather than four noun phrases. A fragment
// is polarity-blind: measured, "It is fine to accept an item that declares a control that does not
// resolve." satisfied the old 7-word `accept-precondition` token, and "This field DOES catch a
// fabricated probe, which no declarative model catches." satisfied the old scope-limit token. A
// sentence carrying its own "does NOT" cannot be satisfied by its own reversal, and lane 12 drives
// exactly that, per ask.
const SCOPE_FABRICATED = "This field does NOT catch a fabricated probe, which no declarative model catches.";
const SCOPE_NOT_A_CONTROL =
  "This field does NOT reach any assertion that is not a declared control — the obligation reaches `FF-NN` ids alone, never every scenario in every `.feature`, and never an assertion inside a behavioural suite.";
const SCOPE_SHIPPED_BYTES = "This field does NOT record whether the probe was performed on the bytes that actually shipped.";
// THE FOURTH HOLE, named rather than left to be found (this milestone's own doctrine). `recordsARedProbe`
// compares the trimmed cell against ONE frozen literal, so a placeholder that gains a single extra
// internal space — a markdown reflow — is no longer that literal and reads as a RECORDED probe.
// The SHIPPED template side is fully guarded (lane 7 drives the drift); the author side is not, and
// cannot be, because the check has no way to tell a reflowed placeholder from a written sentence.
const SCOPE_REFLOWED_PLACEHOLDER =
  "This field does NOT survive a reflow of its own placeholder: the check compares the probe cell against one frozen literal, so a placeholder that gains an extra internal space reads as a RECORDED probe rather than a missing one.";

// THE LITERALS AS THEIR ADRs FREEZE THEM. Two of them are IMPORTED rather than transcribed —
// `RED_PROBE_PLACEHOLDER` (ADR-009/H, from 66/02) and the two register openers (ADR-008 ruling 3/4,
// from 66/01) — so a drift on either side of the module boundary is a red here, which is the whole
// reason FF-6608 owns this pair.
export const ADR_LITERALS = Object.freeze({
  "fitness-register-columns": FITNESS_HEADER_ROW, //                       ADR-005 §1
  "findings-register-columns": FINDINGS_HEADER_ROW, //                     ADR-005 §1 (verify.md:99)
  "red-probe-cell": RED_PROBE_PLACEHOLDER, //                              ADR-009/H — imported
  "red-probe-ask": RED_PROBE_ASK, //                                       ADR-005 §1
  "scope-limit-fabricated": SCOPE_FABRICATED, //                           ADR-005 §4
  "scope-limit-not-a-control": SCOPE_NOT_A_CONTROL, //                     ADR-005 §4
  "scope-limit-shipped-bytes": SCOPE_SHIPPED_BYTES, //                     ADR-005 §4
  "scope-limit-reflowed-placeholder": SCOPE_REFLOWED_PLACEHOLDER, //       ADR-005 §4, fourth hole
  "declaration-id-first": "ALONE in the first cell", //                    ADR-001 §2
  "runnable-path": RUNNABLE_PATH_RULE, //                                  ADR-004 §3
  "pending-token": "carries the token `pending` in its own entry", //      ADR-004 §3 / ADR-009/B
  "citation-form": CITATION_FORM_RULE, //                                  ADR-009/I
  "write-apart": WRITE_APART_RULE, //                                      ADR-010/D
  "unnumbered-findings": UNNUMBERED_RULE, //                               ADR-006 decision 1
  "single-writer-allocates": SINGLE_WRITER_RULE, //                        ADR-006 decision 2
  "accept-precondition": ACCEPT_RULE, //                                   ADR-011/E
});

// THE FRAGMENTS THAT REMAIN, named as a SHRINK-ONLY BASELINE rather than left silent (m47/R9). Each
// is a noun phrase, so a text asserting its OPPOSITE still satisfies it; each is measured in lane 12
// rather than asserted. They survive this round because making them whole sentences means rewriting
// four and three shipped sites respectively, which is a wider edit than this round's ruling scoped.
// The set is asserted EXACT, so a fifteenth ask added as a fragment fails instead of joining quietly.
export const POLARITY_BLIND_ASKS = Object.freeze(["declaration-id-first", "pending-token"]);

// THE ASK SET: which file's reader must obey each rule. "The same rule present only in some OTHER
// bundle file does not satisfy this row" (the contract) is what makes this a per-file map rather
// than a bundle-wide grep — and lane 8 proves the distinction is real.
// THE SCOPE BOUNDARY AND THE CITATION FORM NOW BIND TO EVERY FILE THAT SHIPS THEM, not just the
// template. `verify.md` carried a SECOND, unfrozen copy of ADR-005 §4 ("run on the bytes that
// shipped" against the template's "performed on … actually shipped") — a duplicated home on the one
// paragraph that must never inflate, free to drift into an over-claim with nothing red. Binding the
// same literal to both files is what makes the two spellings one spelling.
export const FROZEN_ASKS = Object.freeze([
  Object.freeze({ id: "fitness-register-columns", files: [VERIFICATION_TEMPLATE] }),
  Object.freeze({ id: "findings-register-columns", files: [VERIFICATION_TEMPLATE] }),
  Object.freeze({ id: "red-probe-cell", files: [VERIFICATION_TEMPLATE] }),
  Object.freeze({ id: "red-probe-ask", files: [VERIFICATION_TEMPLATE, VERIFY] }),
  Object.freeze({ id: "scope-limit-fabricated", files: [VERIFICATION_TEMPLATE, VERIFY] }),
  Object.freeze({ id: "scope-limit-not-a-control", files: [VERIFICATION_TEMPLATE, VERIFY] }),
  Object.freeze({ id: "scope-limit-shipped-bytes", files: [VERIFICATION_TEMPLATE, VERIFY] }),
  Object.freeze({ id: "scope-limit-reflowed-placeholder", files: [VERIFICATION_TEMPLATE, VERIFY] }),
  Object.freeze({ id: "declaration-id-first", files: [ARCHITECTURE_TEMPLATE, VERIFICATION_TEMPLATE, ARCHITECT, VERIFY] }),
  Object.freeze({ id: "runnable-path", files: [REFINE, ARCHITECT, ARCHITECTURE_TEMPLATE] }),
  Object.freeze({ id: "pending-token", files: [REFINE, ARCHITECT, ARCHITECTURE_TEMPLATE] }),
  Object.freeze({ id: "citation-form", files: [REFINE, ARCHITECT, ARCHITECTURE_TEMPLATE, VERIFY, VERIFICATION_TEMPLATE] }),
  // The seventh ask rides the three files whose readers WRITE a register: the two prompts an
  // architect reads and the template they author into. `verify.md`'s reader cites, it does not
  // quote unresolved ids, so binding it there would be a rule nobody in that file can break.
  Object.freeze({ id: "write-apart", files: [REFINE, ARCHITECT, ARCHITECTURE_TEMPLATE] }),
  Object.freeze({ id: "unnumbered-findings", files: [...REVIEWING_AGENTS] }),
  Object.freeze({ id: "single-writer-allocates", files: [VERIFY] }),
  // The accept rule shipped in FOUR wordings with one guarded. One sentence, five files, one guard.
  Object.freeze({ id: "accept-precondition", files: [VERIFY, REFINE, ARCHITECT, ARCHITECTURE_TEMPLATE, VERIFICATION_TEMPLATE] }),
]);

// REVERSED-POLARITY PROBES. For each ask this round widened to a whole sentence: a text asserting
// the OPPOSITE, which the OLD fragment token accepted and the shipped sentence refuses. The pair is
// the evidence that widening it was not cosmetic — `fragment` is the literal that shipped before.
export const POLARITY_PROBES = Object.freeze([
  Object.freeze({
    ask: "accept-precondition",
    fragment: "declares a control that does not resolve",
    reversed: "It is fine to accept an item that declares a control that does not resolve.",
  }),
  Object.freeze({
    ask: "accept-precondition",
    fragment: "declares a control that does not resolve",
    reversed: "Nothing stops an accept when the register declares a control that does not resolve.",
  }),
  Object.freeze({
    ask: "scope-limit-fabricated",
    fragment: "a fabricated probe, which no declarative model catches",
    reversed: "This field DOES catch a fabricated probe, which no declarative model catches.",
  }),
  Object.freeze({
    ask: "scope-limit-not-a-control",
    fragment: "any assertion that is not a declared control",
    reversed: "This field DOES reach any assertion that is not a declared control, scenarios included.",
  }),
  Object.freeze({
    ask: "scope-limit-shipped-bytes",
    fragment: "whether the probe was performed on the bytes that actually shipped",
    reversed: "The row proves whether the probe was performed on the bytes that actually shipped.",
  }),
  Object.freeze({
    ask: "red-probe-ask",
    fragment: "red probe",
    reversed: "No red probe is required for a control you are confident in.",
  }),
  // The seventh ask is the one MOST likely to be paraphrased into uselessness — it is a typographic
  // instruction, and a fragment of it survives any wording that revokes it.
  Object.freeze({
    ask: "write-apart",
    fragment: "write it APART (`item` + `id`), never joined",
    reversed: "Ignore the old advice to write it APART (`item` + `id`), never joined — quote a specimen however reads best.",
  }),
]);

// The finding's eight falsifiability terms (§1b), spelled as the SOURCES of the regexes rather than
// as regex literals, so the constructed pattern can be printed beside its result when this is
// re-measured by hand (ADR-010/E).
export const FALSIFIABILITY_TERMS = Object.freeze([
  Object.freeze({ label: "red probe", source: String.raw`red\s+probe` }),
  Object.freeze({ label: "seen red", source: String.raw`seen\s+red` }),
  Object.freeze({ label: "vacuous", source: String.raw`vacuous` }),
  Object.freeze({ label: "positive control", source: String.raw`positive\s+control` }),
  Object.freeze({ label: "falsifi*", source: String.raw`falsifi` }),
  Object.freeze({ label: "must fail", source: String.raw`must\s+fail` }),
  Object.freeze({ label: "observed failing", source: String.raw`observed\s+failing` }),
  Object.freeze({ label: "probe", source: String.raw`probe` }),
]);

// A CHECKED replace (m66 carry-forward: build a counterpart by asserting the search string occurs
// AND that the result differs — a blind `String.replace` returns the input unchanged and a planted
// defect that was never planted is a false green).
function checkedRemove(text, needle, label) {
  assert.ok(text.includes(needle), `sanity: ${label} — the string to remove is present before the removal`);
  const planted = text.split(needle).join("");
  assert.notEqual(planted, text, `sanity: ${label} — removing it actually changed the text`);
  return planted;
}

// WHICH ASK WOULD HAVE PREVENTED WHICH REFUSAL (ADR-007 §1). Exported because story 66/03's
// behavioural suites wire the same contract row and a second copy of this table is precisely the
// second home this milestone exists to refuse.
//
// `control-runner-unchecked` maps to NOTHING, and correctly so: it always reports the CHECKER's own
// coverage (leg B did not run because no runner is configured), never a refusal an author could
// have prevented.
// THE PAIRING IS THE ASSERTION, not the file list. The earlier shape mapped a code to FILES and
// asked only that each file carried SOME frozen ask — which every named file does, so the table was
// vacuous: measured, `staged-control` → the VERIFICATION template, `verification-register-missing` →
// `aof-designer.md` and `control-unregistered` → `verify.md` all PASSED. Naming the ask that would
// actually have prevented each code is what makes a wrong mapping fail, and lane 13 drives those
// three wrong mappings to prove it.
export const CODE_ASKED_BY = Object.freeze({
  "register-duplicate-id": Object.freeze([
    Object.freeze({ file: VERIFY, asks: Object.freeze(["single-writer-allocates"]) }),
    ...REVIEWING_AGENTS.map((agent) => Object.freeze({ file: agent, asks: Object.freeze(["unnumbered-findings"]) })),
  ]),
  // BOTH halves: the citation form is how you write one that resolves, write-apart is how you quote
  // one that does not. Shipping only the first is what made this code a refusal with no ask for the
  // case that actually fires — three measured occurrences in this milestone's own record.
  "register-dangling-citation": Object.freeze(
    [ARCHITECTURE_TEMPLATE, REFINE, ARCHITECT].map((file) =>
      Object.freeze({ file, asks: Object.freeze(["citation-form", "write-apart"]) }),
    ),
  ),
  "verification-register-missing": Object.freeze([
    Object.freeze({ file: VERIFICATION_TEMPLATE, asks: Object.freeze(["fitness-register-columns", "findings-register-columns"]) }),
  ]),
  "verification-missing-red-probe": Object.freeze([
    Object.freeze({ file: VERIFICATION_TEMPLATE, asks: Object.freeze(["red-probe-ask", "red-probe-cell"]) }),
    Object.freeze({ file: VERIFY, asks: Object.freeze(["red-probe-ask"]) }),
  ]),
  "control-unresolved": Object.freeze(
    [REFINE, ARCHITECT, ARCHITECTURE_TEMPLATE].map((file) =>
      Object.freeze({ file, asks: Object.freeze(["runnable-path", "pending-token"]) }),
    ),
  ),
  "control-unregistered": Object.freeze(
    [REFINE, ARCHITECT].map((file) => Object.freeze({ file, asks: Object.freeze(["runnable-path"]) })),
  ),
  "control-runner-unchecked": Object.freeze([]),
  "staged-control": Object.freeze([Object.freeze({ file: REFINE, asks: Object.freeze(["runnable-path"]) })]),
});

// THE TAG-ROUTING SENTENCES — the three prompts that already told a reviewer to route a finding with
// a `@finding-` tag before this milestone.
//
// WHY THIS TABLE EXISTS, and it is the sixth instance of m45/R5 in this milestone: the lane that
// claimed to check this reconciliation asserted only that the prompt CONTAINED `@finding-<id>` and
// that the new frozen literal contained a substring of ITSELF. It never read the routing sentence,
// which is exactly why `aof-qa.md`'s "A bug becomes a SCENARIO tagged `@bug` (+ `@finding-<id>`)"
// sailed through green and needed a human to catch: literally compatible with "never chosen by you",
// and in effect an instruction to write a number.
//
// `was` is the pre-fix wording, kept so the predicate is driven RED by the real drift rather than by
// an invented one.
export const TAG_ROUTING = Object.freeze([
  Object.freeze({
    agent: "agents/aof-qa.md",
    sentence:
      "A bug becomes a SCENARIO tagged `@bug` (+ the `@finding-<id>` the writer allocated) in the relevant task `.feature`, not a bugs file.",
    was: "A bug becomes a SCENARIO tagged `@bug` (+ `@finding-<id>`) in the relevant task `.feature`, not a bugs file.",
    reconciledBy: "names the writer's allocation at the point the tag is written",
  }),
  Object.freeze({
    agent: "agents/aof-security.md",
    sentence: "A finding routes to the developer via the orchestrator with `verifies →` + `@finding-<id>`.",
    was: null,
    reconciledBy: "routes the tag via the orchestrator, downstream of the reviewer",
  }),
  Object.freeze({
    agent: "agents/aof-compliance.md",
    sentence: "A gap routes to the architect/developer via the orchestrator with `@finding-<id>`.",
    was: null,
    reconciledBy: "routes the tag via the orchestrator, downstream of the reviewer",
  }),
]);

// A routing sentence is RECONCILED when it either names the writer's allocation or hands the tag to
// the orchestrator. A sentence that mentions the tag and does neither leaves the reviewer holding it.
export function routingIsReconciled(sentence) {
  if (!String(sentence).includes("@finding-<id>")) return true;
  return /the writer allocated|via the orchestrator/.test(String(sentence));
}

// The three asks that are STRUCTURAL literals rather than prose — a table header row, a table header
// row, and the placeholder token. Polarity is not a property they can carry: they are the bytes a
// parser reads, and a document either has them or does not.
const STRUCTURAL_ASKS = ["fitness-register-columns", "findings-register-columns", "red-probe-cell"];

// Every (code, file) whose named ask is NOT carried by that file — the code→ask pairing check.
export function unpairedCodeAsks(map, readText = bundleText) {
  const out = [];
  for (const [code, entries] of Object.entries(map)) {
    if (entries.length === 0) {
      // Legal for exactly one code, and that is asserted where the set is asserted.
      continue;
    }
    for (const entry of entries) {
      for (const ask of entry.asks) {
        if (!readText(entry.file).includes(ADR_LITERALS[ask])) out.push({ code, file: entry.file, ask });
      }
    }
  }
  return out;
}

// The scan under test, factored out so the planted-defect lane drives THE SAME code path the green
// lane does, over an overridable text source. Exported for the behavioural suites' own red probe.
export function missingAsks(readText = bundleText) {
  const misses = [];
  for (const ask of FROZEN_ASKS) {
    const literal = ADR_LITERALS[ask.id];
    for (const file of ask.files) {
      if (!readText(file).includes(literal)) misses.push({ ask: ask.id, file });
    }
  }
  return misses;
}

export const archTests = [
  // ── 1 ─ the frozen set is complete against the ADR literals ────────────────
  {
    name: "arch/FF-6608: the exported ask set is set-equal to the ADR-005/ADR-006 literals (no literal unasked, no ask unfrozen)",
    run: async () => {
      const asked = new Set(FROZEN_ASKS.map((ask) => ask.id));
      const frozen = new Set(Object.keys(ADR_LITERALS));
      assert.deepEqual([...asked].sort(), [...frozen].sort(), "every frozen literal has an ask, and every ask names a frozen literal");
      for (const ask of FROZEN_ASKS) {
        assert.ok(typeof ADR_LITERALS[ask.id] === "string" && ADR_LITERALS[ask.id].length > 0, `${ask.id} resolves to a non-empty literal`);
        assert.ok(ask.files.length > 0, `${ask.id} names at least one file whose reader must obey it`);
      }
    },
  },

  // ── 2 ─ every ask is present in the file whose reader must obey it ─────────
  {
    name: "arch/FF-6608: every frozen ask is present in each bundle file whose reader must obey it",
    run: async () => {
      const misses = missingAsks();
      assert.deepEqual(
        misses,
        [],
        `every ask is present in the file whose reader must obey it; missing: ${misses.map((miss) => `${miss.ask} in ${miss.file}`).join(", ")}`,
      );
    },
  },

  // ── 3 ─ the template's four frozen headings, and their near misses ─────────
  {
    name: "arch/FF-6608: the shipped VERIFICATION.md template carries the four frozen h2 headings, and a near miss does not satisfy one",
    run: async () => {
      const lines = bundleText(VERIFICATION_TEMPLATE).split("\n").map((line) => line.trimEnd());
      for (const { heading, nearMiss } of FROZEN_HEADINGS) {
        assert.ok(lines.includes(heading), `the template carries ${JSON.stringify(heading)} spelled exactly, at h2`);
        assert.ok(!lines.includes(nearMiss), `${JSON.stringify(nearMiss)} is NOT what ships — a paraphrase is a different section`);
      }
    },
  },

  // ── 4 ─ the two register headings ARE the openers 66/01's recogniser accepts,
  //        in the kinds ADR-008 ruling 4 assigns them (the cross-module identity)
  {
    name: "arch/FF-6608: the template's two register headings open the frozen blocks — `## Findings` DECLARING, `## Fitness functions` CITING (ADR-008 ruling 4)",
    run: async () => {
      assert.equal(registerBlockKind("## Findings", "VERIFICATION.md"), "declaring");
      assert.equal(registerBlockKind("## Fitness functions", "VERIFICATION.md"), "citing");
      // …and those two are the openers the ONE HOME freezes, not this file's wording.
      const openers = REGISTER_BLOCKS.filter((block) => block.file === "VERIFICATION.md").map((block) => `${block.heading}:${block.kind}`).sort();
      assert.deepEqual(openers, ["findings:declaring", "fitness functions:citing"], "the shipped block set for a VERIFICATION.md");
      for (const { heading, nearMiss } of FROZEN_HEADINGS.filter((entry) => entry.heading === "## Findings" || entry.heading === "## Fitness functions")) {
        assert.equal(normalizeOpener(heading.slice(3)), heading.slice(3).toLowerCase(), `${heading} normalises to itself`);
        assert.equal(registerBlockKind(nearMiss, "VERIFICATION.md"), null, `${JSON.stringify(nearMiss)} opens no register block`);
      }
    },
  },

  // ── 5 ─ the two frozen table headers ───────────────────────────────────────
  {
    name: "arch/FF-6608: the template's fitness and findings header rows are the frozen literals, in that order",
    run: async () => {
      const lines = bundleText(VERIFICATION_TEMPLATE).split("\n").map((line) => line.trim());
      assert.ok(lines.includes(FITNESS_HEADER_ROW), `the fitness register's header row is ${FITNESS_HEADER_ROW}`);
      assert.ok(lines.includes(FINDINGS_HEADER_ROW), `the findings register's header row is ${FINDINGS_HEADER_ROW}`);
      // The seven are the seven `src/bundle/commands/verify.md` prescribes in prose, in order.
      const columns = FINDINGS_HEADER_ROW.split("|").map((cell) => cell.trim()).filter(Boolean);
      assert.deepEqual(columns, ["id", "observed", "type", "severity", "triage", "routed-to", "status"]);
      // …and they are the SAME SEVEN, IN THE SAME ORDER, that verify.md prescribes in prose (the
      // shipped `(id, observed, type, severity, triage, routed-to, status)` list, whose wording
      // predates this template). Asserted as one ordered literal, so a re-ordering is red.
      // Whitespace-collapsed, because the prose list is wrapped in the shipped prompt and a line
      // break inside a prescription is not a change to it.
      const flatVerify = bundleText(VERIFY).replace(/\s+/g, " ");
      assert.ok(
        flatVerify.includes(`(${columns.join(", ")})`),
        `verify.md prescribes the seven columns in prose, in this order: (${columns.join(", ")})`,
      );
      assert.equal(FITNESS_HEADER_ROW.split("|").map((cell) => cell.trim()).filter(Boolean)[0], "id", "the fitness register's first column is `id`");
    },
  },

  // ── 6 ─ the placeholder rows declare nothing, and the recogniser is live here
  {
    name: "arch/FF-6608: the template's placeholder rows declare nothing, while a real id in the same row would (the positive control)",
    run: async () => {
      const text = bundleText(VERIFICATION_TEMPLATE);
      assert.deepEqual(registerDeclarations(text, "VERIFICATION.md"), [], "a freshly-rendered document declares no control it was never given");
      assert.deepEqual(registerEntries(text, "VERIFICATION.md"), [], "…and cites none either — `<FF-NN>`/`<F-NN>` are not ids");

      // POSITIVE CONTROL — without it "found nothing" is indistinguishable from a recogniser that
      // cannot see this document at all. Substituting a real id into the SAME rows declares/cites.
      const withIds = checkedRemove(text, "| <F-NN> |", "findings placeholder") && text
        .replace("| <F-NN> |", "| **F-01** |")
        .replace("| <FF-NN> |", "| **FF-01** |");
      assert.notEqual(withIds, text, "sanity: the substitution changed the text");
      const declared = registerDeclarations(withIds, "VERIFICATION.md").map((entry) => entry.id);
      const entries = registerEntries(withIds, "VERIFICATION.md").map((entry) => `${entry.id}:${entry.kind}`);
      assert.deepEqual(declared, ["F-01"], "the findings block declares — so the recogniser really reads this document");
      assert.deepEqual(entries.sort(), ["F-01:declaring", "FF-01:citing"], "and the fitness block CITES, never declares (ADR-008 ruling 4)");

      // The id-alone form is the rule, and id-plus-prose is not a declaration.
      assert.equal(declaredIdOn("| **F-01** | observed … |"), "F-01");
      assert.equal(declaredIdOn("| F-01 is the one that bit us |"), null, "an id sharing its cell with prose is a citation");
      assert.equal(declaredIdOn("| <F-NN> | <what was observed> |"), null, "the shipped placeholder");
    },
  },

  // ── 7 ─ the red-probe placeholder is ONE literal across the JS/markdown seam
  {
    name: "arch/FF-6608: the template's red-probe placeholder is BYTE-EQUAL to RED_PROBE_PLACEHOLDER, and reads as a MISSING probe",
    run: async () => {
      const text = bundleText(VERIFICATION_TEMPLATE);
      const occurrences = text.split(RED_PROBE_PLACEHOLDER).length - 1;
      assert.equal(occurrences, 1, "the template carries the placeholder exactly once, byte-for-byte as `src/work/doctor-controls.mjs` exports it");
      assert.equal(
        RED_PROBE_PLACEHOLDER,
        "<what was changed to make it fail, and the message observed>",
        "…and that literal is the one ADR-009/H freezes, verbatim",
      );
      assert.equal(recordsARedProbe(` ${RED_PROBE_PLACEHOLDER} `), false, "an untouched placeholder is a MISSING red probe, not a recorded one");
      assert.equal(recordsARedProbe(" Removed the guard → 3 lanes red "), true, "…while a recorded observation is one");

      // The drift this pair exists to catch: a template that spells it ALMOST the same.
      const drifted = checkedRemove(text, RED_PROBE_PLACEHOLDER, "the placeholder").concat("<what was changed to make it fail and the message observed>");
      assert.equal(drifted.split(RED_PROBE_PLACEHOLDER).length - 1, 0, "a one-comma drift is a different literal, and this gate is what reports it");
    },
  },

  // ── 8 ─ THE RED PROBE for this gate: the scan is shown to go red ────────────
  {
    name: "arch/FF-6608 (non-vacuity): removing any one ask from any one named file fails, naming that file — and the same words in a DIFFERENT bundle file do not keep it green",
    run: async () => {
      // The planted-defect arithmetic below is only meaningful over a GREEN baseline: with the
      // shipped bytes already missing an ask, every plant reports a cascade and this lane's message
      // would be about the wrong thing. Say so first, in one line, rather than let lane 2's failure
      // arrive here wearing a disguise.
      const baseline = missingAsks();
      assert.deepEqual(
        baseline,
        [],
        `the shipped bytes are green before anything is planted; already missing: ${baseline.map((miss) => `${miss.ask} in ${miss.file}`).join(", ")}`,
      );
      for (const ask of FROZEN_ASKS) {
        const literal = ADR_LITERALS[ask.id];
        for (const file of ask.files) {
          // (a) remove it from the file that must carry it → reported, naming file AND ask.
          //     `deepEqual` against a single-element list would be wrong rather than stricter: some
          //     literals are substrings of others in the same file (`red probe` sits inside the
          //     fitness header row), so one removal legitimately reports a small cascade. What is
          //     asserted is that the pair IS reported and that NO OTHER FILE is disturbed — which is
          //     the property "present only in some other bundle file does not satisfy this row" needs.
          const blinded = (relative) =>
            relative === file ? checkedRemove(bundleText(relative), literal, `${ask.id} in ${relative}`) : bundleText(relative);
          const misses = missingAsks(blinded);
          assert.ok(
            misses.some((miss) => miss.ask === ask.id && miss.file === file),
            `removing ${ask.id} from ${file} is reported, naming that file and that ask; got ${JSON.stringify(misses)}`,
          );
          assert.deepEqual([...new Set(misses.map((miss) => miss.file))], [file], `only ${file} is reported`);

          // (b) …and putting the same words in a DIFFERENT bundle file does not clear it. A token
          //     found anywhere is the vacuous guard this milestone exists to refuse.
          const decoy = file === "agents/aof-developer.md" ? "agents/aof-researcher.md" : "agents/aof-developer.md";
          const laundered = (relative) => {
            if (relative === file) return checkedRemove(bundleText(relative), literal, `${ask.id} in ${relative}`);
            if (relative === decoy) return `${bundleText(relative)}\n${literal}\n`;
            return bundleText(relative);
          };
          assert.ok(
            missingAsks(laundered).some((miss) => miss.ask === ask.id && miss.file === file),
            `${ask.id} planted in ${decoy} does not satisfy ${file}`,
          );
        }
      }
    },
  },

  // ── 9 ─ the finding's eight falsifiability terms, re-measured ──────────────
  {
    name: "arch/FF-6608: the finding's eight falsifiability terms are no longer at zero across `src/bundle/` (measured 0/0/0/0/0/0/0/0 at HEAD)",
    run: async () => {
      const files = bundleFiles();
      const texts = new Map(files.map((relative) => [relative, bundleText(relative)]));
      const count = (source, source_texts) => {
        const re = new RegExp(source, "i");
        return [...source_texts.entries()].filter(([, text]) => re.test(text)).map(([relative]) => relative);
      };

      const zero = [];
      for (const term of FALSIFIABILITY_TERMS) {
        const hits = count(term.source, texts);
        if (hits.length === 0) zero.push(term.label);
      }
      assert.deepEqual(zero, [], "no term is still at the finding's measured zero");

      // NON-VACUITY for the measurement itself: with the template's text blanked, the six terms only
      // it carries fall back to zero. If they did not, the scan is not reading the file it claims to.
      const blanked = new Map(texts);
      assert.ok(blanked.get(VERIFICATION_TEMPLATE).length > 0, "sanity: the template has content to blank");
      blanked.set(VERIFICATION_TEMPLATE, "");
      const fellBack = FALSIFIABILITY_TERMS.filter((term) => count(term.source, blanked).length === 0).map((term) => term.label);
      assert.deepEqual(
        fellBack.sort(),
        ["falsifi*", "must fail", "observed failing", "positive control", "seen red", "vacuous"],
        "the six template-only terms return to zero when the template is blanked — the scan reads the real file",
      );
    },
  },

  // ── 10 ─ every refusal an author could have prevented has an ask ───────────
  {
    name: "arch/FF-6608: no refusal exists that the bundle never asked for — the eight doctor codes, mapped to the file carrying their ask",
    run: async () => {
      assert.deepEqual(
        Object.keys(CODE_ASKED_BY).sort(),
        [...CONTROL_FINDING_CODES].sort(),
        "the mapping covers exactly the frozen eight — a ninth code without an ask fails here",
      );
      assert.deepEqual(unpairedCodeAsks(CODE_ASKED_BY), [], "every code's named file carries the named ask");
    },
  },
  {
    name: "arch/FF-6608 (non-vacuity): the code→ask PAIRING is falsifiable — the three measured wrong mappings are each reported",
    run: async () => {
      // The earlier shape passed all three of these, which is what made it a table nobody could be
      // wrong in. Each mutation names a file that carries frozen asks — just not THIS code's.
      const wrong = [
        ["staged-control", VERIFICATION_TEMPLATE, ["runnable-path"]],
        ["verification-register-missing", "agents/aof-designer.md", ["fitness-register-columns", "findings-register-columns"]],
        ["control-unregistered", VERIFY, ["runnable-path"]],
      ];
      for (const [code, file, asks] of wrong) {
        const mutated = { ...CODE_ASKED_BY, [code]: [{ file, asks }] };
        const unpaired = unpairedCodeAsks(mutated);
        assert.ok(
          unpaired.some((entry) => entry.code === code && entry.file === file),
          `mapping ${code} → ${file} is reported as unpaired; got ${JSON.stringify(unpaired)}`,
        );
      }
    },
  },
  {
    name: "arch/FF-6608: the write-apart ask ships byte-identical in its three files, and the sentence itself PLANTS NOTHING",
    run: async () => {
      const rule = ADR_LITERALS["write-apart"];
      const carriers = FROZEN_ASKS.find((ask) => ask.id === "write-apart").files;
      assert.deepEqual([...carriers].sort(), [ARCHITECTURE_TEMPLATE, ARCHITECT, REFINE].sort());
      for (const file of carriers) {
        assert.equal(bundleText(file).split(rule).length - 1, 1, `${file} carries the rule exactly once, byte-for-byte`);
      }

      // THE GUARD DOGFOODS THE RULE IT SHIPS. The sentence goes INTO a scaffolded `ARCHITECTURE.md`,
      // and `qualifiedRefsIn` reads raw text without skipping comments — so a joined specimen inside
      // the ask would plant a real citation in every register scaffolded from the template. Asserted,
      // not assumed.
      assert.deepEqual(qualifiedRefsIn(rule), [], "the write-apart sentence quotes no id, so it plants none");
      assert.deepEqual(qualifiedRefsIn(bundleText(ARCHITECTURE_TEMPLATE)), [], "…and neither does the template it ships in");

      // POSITIVE CONTROL, built APART and joined only at runtime — writing it joined in this source
      // would plant it in this file, which is the very defect the rule names (and which this
      // milestone committed three times before the ask existed).
      const item = "52";
      const id = "FF-5204";
      assert.deepEqual(
        qualifiedRefsIn(`a specimen written joined: ${item}/${id}`).map((ref) => `${ref.item}:${ref.id}`),
        [`${item}:${id}`],
        "a JOINED specimen is read as a real citation — which is why the rule exists",
      );
      assert.deepEqual(qualifiedRefsIn(`a specimen written apart: item ${item}, id ${id}`), [], "…and written APART it plants nothing");
    },
  },
  {
    name: "arch/FF-6608: the three tag-routing prompts are reconciled IN THE ROUTING SENTENCE, and the pre-fix wording is driven RED",
    run: async () => {
      for (const routing of TAG_ROUTING) {
        assert.ok(bundleText(routing.agent).includes(routing.sentence), `${routing.agent} ships the reconciled routing sentence verbatim`);
        assert.ok(routingIsReconciled(routing.sentence), `${routing.agent}: the routing sentence ${routing.reconciledBy}`);
        assert.ok(bundleText(routing.agent).includes(UNNUMBERED_RULE), `${routing.agent} also carries the reviewer-side rule`);
      }
      // NON-VACUITY, on the REAL drift rather than an invented one: `aof-qa.md`'s pre-fix sentence
      // mentions the tag, names no writer and routes through nobody — the predicate must refuse it,
      // and it must no longer appear in the shipped bytes.
      const qa = TAG_ROUTING.find((routing) => routing.agent === "agents/aof-qa.md");
      assert.equal(routingIsReconciled(qa.was), false, "the pre-fix `@bug` sentence leaves the reviewer holding the id");
      assert.ok(!bundleText(qa.agent).includes(qa.was), "…and it is no longer what ships");
      // …and the predicate is not simply always-false: a sentence with no tag has nothing to reconcile.
      assert.equal(routingIsReconciled("A finding is reported to the orchestrator."), true);
    },
  },
  {
    name: "arch/FF-6608 (non-vacuity): every ask widened this round REFUSES its own reversal, and the fragment it replaced ACCEPTED it",
    run: async () => {
      for (const probe of POLARITY_PROBES) {
        const shipped = ADR_LITERALS[probe.ask];
        assert.ok(
          probe.reversed.includes(probe.fragment),
          `the fragment that shipped before WOULD have passed on a reversed-polarity text: ${JSON.stringify(probe.reversed)}`,
        );
        assert.ok(
          !probe.reversed.includes(shipped),
          `…and the whole sentence now shipping refuses it: ${JSON.stringify(probe.reversed)}`,
        );
        // Polarity is carried by being a WHOLE SENTENCE, not by containing a negation: the two
        // assertions above are the evidence, and this is the structural property that makes them
        // hold. (`red-probe-ask` is a positive statement and still refuses its reversal.)
        assert.match(shipped.trim(), /^(?:\*\*)?[A-Z].*\.$/s, `${probe.ask} is a whole sentence, which is what carries polarity`);
      }
      // The fragments that REMAIN are named, and the set is exact — a fifteenth ask added as a
      // fragment fails here instead of joining quietly (m47/R9: a baseline is a named, shrink-only
      // list, reviewed by re-measuring).
      const covered = new Set(POLARITY_PROBES.map((probe) => probe.ask));
      const wholeSentence = Object.entries(ADR_LITERALS)
        .filter(([, literal]) => /\.$/.test(literal.trim()) && literal.trim().split(/\s+/).length >= 12)
        .map(([id]) => id);
      const remaining = Object.keys(ADR_LITERALS).filter(
        (id) => !covered.has(id) && !wholeSentence.includes(id) && !STRUCTURAL_ASKS.includes(id),
      );
      assert.deepEqual(remaining.sort(), [...POLARITY_BLIND_ASKS].sort(), "the polarity-blind set is exactly the named baseline");
      // …measured, not asserted: each named fragment really is satisfied by a text asserting its opposite.
      assert.ok("the id must NOT be ALONE in the first cell".includes(ADR_LITERALS["declaration-id-first"]));
      assert.ok("a landed control never carries the token `pending` in its own entry".includes(ADR_LITERALS["pending-token"]));
    },
  },

  // ── 11 ─ the reviewing set is exactly those five, named ────────────────────
  {
    name: "arch/FF-6608: exactly five agents carry the unnumbered-findings rule, and the other three are outside it",
    run: async () => {
      const agents = bundleFiles().filter((relative) => relative.startsWith("agents/"));
      assert.equal(agents.length, 8, "the bundle declares eight agents");
      assert.deepEqual([...REVIEWING_AGENTS, ...NON_REVIEWING_AGENTS].sort(), agents.slice().sort(), "the five + the three are the eight");
      for (const agent of REVIEWING_AGENTS) {
        assert.ok(bundleText(agent).includes(UNNUMBERED_RULE), `${agent} reports findings unnumbered`);
      }
      for (const agent of NON_REVIEWING_AGENTS) {
        assert.ok(!bundleText(agent).includes(UNNUMBERED_RULE), `${agent} is outside the rule — it does not report into a register`);
      }
    },
  },
];
