// Traceability wiring for milestone 66 / story 03 —
// tasks/01_the-architecture-template-asks-for-a-runnable-path.feature ("ACD asks for a control it
// can resolve, at the moment the control is declared", @executable).
//
// A CHECK WITH NO ASK IS A TRAP (ADR-007 §1). ACD's gates are met by agents reading `src/bundle/`
// prompts and templates; a refusal no prompt ever asked for arrives as a surprise at `validate` and
// the agent's only recovery is to guess. The shipped template was itself part of the defect —
// measured at HEAD, `src/bundle/templates/milestone/ARCHITECTURE.md` rendered a fitness table with
// NO ID COLUMN, so ACD asked architects to declare invariants it gave them no way to name.
//
// Every @executable scenario and every Examples row is wired here against the REAL shipped bytes.
// The FROZEN LITERALS and the code→ask map are imported from FF-6608 rather than re-transcribed:
// two copies of one rule become two rules, which is the defect this task exists to close. The
// single @manual scenario (an architect reading `refine.md` and `aof-architect.md` side by side for
// whether they AGREE IN EFFECT) is agent-run at `aof:verify`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerDeclarations, registerEntries, qualifiedRefsIn, declaredIdOn } from "../../src/declared-id.mjs";
import { CONTROL_FINDING_CODES, fitnessDeclarations } from "../../src/work/doctor-controls.mjs";
import {
  ADR_LITERALS,
  FROZEN_ASKS,
  CODE_ASKED_BY,
  missingAsks,
  unpairedCodeAsks,
} from "../arch/work/acd-verification-template-shape.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const bundleText = (relative) => readFileSync(path.join(repoRoot, "src", "bundle", ...relative.split("/")), "utf8");

const ARCHITECTURE_TEMPLATE = "templates/milestone/ARCHITECTURE.md";
const REFINE = "commands/refine.md";
const ARCHITECT = "agents/aof-architect.md";

// Whitespace-collapsed, because a rule wrapped across two lines of a prompt is the same rule.
const flat = (relative) => bundleText(relative).replace(/\s+/g, " ");

// The five (place, ruling) pairs task 01's Examples table fixes, each a phrase that must sit inside
// ONE bullet of `refine.md`'s "Which places count" list.
const PLACE_RULINGS = [
  ["a path in the runnable test tree, named by a runner", "the place a control belongs"],
  ["a test-shaped file under `work.dir`", "**prohibited**"],
  ["a `reference/` file renamed out of every glob", "the one admitted exception: a RETIRED suite"],
  ["an invariant with no path at all", "not a declaration a reviewer or a check can act on"],
  ["a path that does not exist yet, its entry carrying the token `pending`", "admitted while the item is open, refused at accept"],
];

// The bullets of that ONE list, cut on the list's own structure rather than by a character window
// (`test/support/source-slice.mjs`'s founding lesson, applied to markdown): the region opens at the
// list's lead-in and each item opens at `- **`. A bullet's wrapped continuation lines belong to it.
function placeBullets() {
  const text = bundleText(REFINE);
  const start = text.indexOf("Which places count, explicitly:");
  assert.ok(start >= 0, "the guidance's place list is present and its lead-in has not been reworded");
  const end = text.indexOf("\n\n", start);
  assert.ok(end > start, "the place list is terminated by a blank line");
  return text
    .slice(start, end)
    .split(/^\s*- \*\*/m)
    .slice(1)
    .map((bullet) => bullet.replace(/\s+/g, " ").trim());
}

function checkedRemove(text, needle, label) {
  assert.ok(text.includes(needle), `sanity: ${label} — the string to remove is present first`);
  const planted = text.split(needle).join("");
  assert.notEqual(planted, text, `sanity: ${label} — the removal changed the text`);
  return planted;
}

// The nine contract rows: each rule, and the file whose reader must obey it.
const RULE_ROWS = [
  [ARCHITECTURE_TEMPLATE, "the fitness table's first column is `id`, and the id stands alone in its cell"],
  [ARCHITECTURE_TEMPLATE, "each row names the INTENDED PATH of the arch-test that will enforce the invariant"],
  [ARCHITECTURE_TEMPLATE, "a control whose file has not landed carries the token `pending` in its own entry"],
  [ARCHITECTURE_TEMPLATE, "another item's id is cited as `m?<itemRef>/<ID>`, and only ids that resolve are cited"],
  [REFINE, "a declared control must resolve to a path a runner can see"],
  [REFINE, "a test-shaped file under the work tree is NOT that place"],
  [REFINE, "the token `pending` is how a guard authored ahead of its subject is declared"],
  [REFINE, "cite only ids that resolve, in the cross-file form the check answers"],
  [ARCHITECT, "the same four: id-first declaration, intended path, the `pending` token, and the citation form"],
];

// Which frozen literal carries each row's rule, so the row is asserted against the ONE wording
// rather than against a re-phrasing of itself.
const ROW_LITERAL = [
  "declaration-id-first",
  "runnable-path",
  "pending-token",
  "citation-form",
  "runnable-path",
  "runnable-path",
  "pending-token",
  "citation-form",
  "runnable-path",
];

export const bundleAsksRunnablePathTests = [
  // ── Scenario Outline: each rule lands in the file whose reader must obey it ──
  ...RULE_ROWS.map(([file, rule], index) => ({
    name: `bundle-ask (runnable path): \`${file}\` carries the rule that ${rule}`,
    run: async () => {
      const literal = ADR_LITERALS[ROW_LITERAL[index]];
      assert.ok(bundleText(file).includes(literal), `${file} carries the rule, in the frozen wording`);

      // "The same rule present only in some OTHER bundle file does not satisfy this row." Blind the
      // named file and plant the literal in a bundle file that is NOT named by this ask; the scan
      // must still report the named file.
      const decoy = "agents/aof-developer.md";
      const blinded = (relative) => {
        if (relative === file) return checkedRemove(bundleText(relative), literal, `${ROW_LITERAL[index]} in ${relative}`);
        if (relative === decoy) return `${bundleText(relative)}\n${literal}\n`;
        return bundleText(relative);
      };
      assert.ok(
        missingAsks(blinded).some((miss) => miss.ask === ROW_LITERAL[index] && miss.file === file),
        `the rule in ${decoy} does not satisfy ${file}`,
      );
    },
  })),
  {
    name: "bundle-ask (runnable path): the architecture template's fitness table's FIRST column is `id`",
    run: async () => {
      const header = bundleText(ARCHITECTURE_TEMPLATE)
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.startsWith("|") && line.includes("enforced by"));
      assert.ok(header, "the fitness table has a header row");
      const columns = header.split("|").map((cell) => cell.trim()).filter(Boolean);
      assert.equal(columns[0], "id", `the first column is \`id\`; got ${JSON.stringify(columns)}`);
      assert.deepEqual(columns, ["id", "invariant", "enforced by (arch-test)", "from"]);
    },
  },

  // ── Scenario: the shared rule is one sentence, not two paraphrases ──
  {
    name: "bundle-ask (runnable path): the declare-where-a-runner-can-see-it rule is BYTE-IDENTICAL in `commands/refine.md` and `agents/aof-architect.md`",
    run: async () => {
      const rule = ADR_LITERALS["runnable-path"];
      for (const file of [REFINE, ARCHITECT]) {
        const occurrences = bundleText(file).split(rule).length - 1;
        assert.equal(occurrences, 1, `${file} carries the rule sentence exactly once, byte-for-byte`);
      }
      // A PARAPHRASE is what this catches: same meaning, one word moved. Two wordings of one rule
      // become two rules within a milestone, so the guard compares bytes and not sense.
      const paraphrase = rule.replace("must resolve to a path a runner can see", "has to resolve to a path some runner can see");
      assert.notEqual(paraphrase, rule, "sanity: the paraphrase differs");
      assert.ok(!bundleText(REFINE).includes(paraphrase) && !bundleText(ARCHITECT).includes(paraphrase));
      const paraphrased = (relative) => (relative === ARCHITECT ? bundleText(relative).split(rule).join(paraphrase) : bundleText(relative));
      assert.ok(
        missingAsks(paraphrased).some((miss) => miss.ask === "runnable-path" && miss.file === ARCHITECT),
        "a paraphrase in either file is reported",
      );
    },
  },

  // ── Scenario: `pending` is a dated statement of a known-absent control, not a parking space ──
  {
    name: "bundle-ask (runnable path): the guidance tells an architect to declare the intended path and carry the `pending` token in that declaration's own entry",
    run: async () => {
      for (const file of [REFINE, ARCHITECT]) {
        const text = bundleText(file);
        assert.ok(text.includes(ADR_LITERALS["pending-token"]), `${file}: the token lives in the declaration's own entry`);
        assert.ok(text.includes("INTENDED PATH"), `${file}: it names the intended path`);
      }
      const refine = flat(REFINE);
      assert.ok(refine.includes("The token IS the marker"), "the token is what the marker is — no cell position or bullet shape prescribed");
      assert.ok(refine.includes("no cell position or bullet shape is prescribed"));
      assert.ok(refine.includes("reports at **warn** while the item is open"), "a `pending` control reports at warn while the item is open");
      assert.ok(refine.includes("not admitted once the item is `done`"), "…and is not admitted once the item is done");
      assert.ok(
        refine.includes("do not park the file anywhere under the work tree in the meantime"),
        "…and it says not to park the file anywhere under the work tree in the meantime",
      );
    },
  },

  // ── Scenario: the citation form the ask teaches is the form the check resolves ──
  {
    name: "bundle-ask (runnable path): the taught citation form is the one `register-dangling-citation` actually resolves — both spellings, and a bare id is not one",
    run: async () => {
      for (const file of [ARCHITECTURE_TEMPLATE, REFINE, ARCHITECT]) {
        assert.ok(bundleText(file).includes(ADR_LITERALS["citation-form"]), `${file} teaches the cross-file form with the `.concat("`m` prefix optional"));
      }
      // The check's own grammar, driven both ways. Specimens are written APART (item + id, never
      // joined) — ADR-010/D: writing one joined plants a real citation in whatever register the
      // file is scanned as, and that rule was earned by two measured self-inflicted failures.
      const item = "52";
      const id = "ADR-007";
      const prefixed = `m${item}/${id}`;
      const bare = `${item}/${id}`;
      assert.deepEqual(qualifiedRefsIn(`see ${prefixed}`).map((ref) => `${ref.item}:${ref.id}`), [`${item}:${id}`], "the `m` spelling resolves");
      assert.deepEqual(qualifiedRefsIn(`see ${bare}`).map((ref) => `${ref.item}:${ref.id}`), [`${item}:${id}`], "…and so does the bare-ref spelling");
      assert.deepEqual(qualifiedRefsIn(`see ${id} on its own`), [], "a bare id carries no ref, so it is addressable only inside its own item's documents");
      // An ask that taught only ONE of the two real spellings would refuse work it had told an
      // author to write — which is why the frozen sentence says the prefix is optional.
      assert.ok(ADR_LITERALS["citation-form"].includes("the `m` prefix is optional, because both spellings are real"));
      assert.ok(ADR_LITERALS["citation-form"].includes("a bare id is addressable only inside its own item's documents"));
    },
  },

  // ── Scenario Outline: the guidance is explicit about which places count ──
  //
  // THE PAIRING IS THE ASSERTION. Two independent `includes` over the whole file is vacuous: measured,
  // the shipped rows passed with every place and ruling SWAPPED, because each half was somewhere in
  // the document. The place and its ruling must sit in the SAME bullet, and each row drives the swap.
  ...PLACE_RULINGS.map(([place, ruling], index) => ({
    name: `bundle-ask (runnable path): the guidance describes "${place}" as "${ruling}" — in one bullet, not two halves of a file`,
    run: async () => {
      const bullets = placeBullets();
      assert.equal(bullets.length, PLACE_RULINGS.length, `the guidance lists ${PLACE_RULINGS.length} places; got ${bullets.length}`);
      const owning = bullets.filter((bullet) => bullet.includes(place));
      assert.equal(owning.length, 1, `exactly one bullet names "${place}"`);
      assert.ok(owning[0].includes(ruling), `…and that same bullet carries its ruling "${ruling}"; got ${JSON.stringify(owning[0])}`);

      // The swap probe: no OTHER row's ruling sits in this bullet, so a shuffled table is red.
      for (const [otherPlace, otherRuling] of PLACE_RULINGS) {
        if (otherPlace === place) continue;
        assert.ok(
          !owning[0].includes(otherRuling),
          `"${otherRuling}" belongs to "${otherPlace}", not to "${place}" — a swapped pair must fail`,
        );
      }
      void index;
    },
  })),

  // ── Scenario: the architecture template's placeholder row declares nothing ──
  {
    name: "bundle-ask (runnable path): the architecture template's fitness-table placeholder id cell is a bracketed placeholder, not an id in the frozen namespace",
    run: async () => {
      const text = bundleText(ARCHITECTURE_TEMPLATE);
      assert.ok(text.includes("| <FF-NN> |"), "sanity: the placeholder row ships as written");
      assert.deepEqual(registerDeclarations(text, "ARCHITECTURE.md"), [], "a freshly-scaffolded document declares no control it was never given");
      assert.deepEqual(registerEntries(text, "ARCHITECTURE.md"), []);
      assert.equal(declaredIdOn("| <FF-NN> | <invariant> |"), null, "`<FF-NN>` is outside the frozen namespace");
      // POSITIVE CONTROL — the same rows with a real id DO declare, and the declaration carries the
      // `pending` token 66/02 reads, so the template's second row is the shape it advertises.
      const planted = text.split("| <FF-NN> |").join("| **FF-01** |");
      const declared = fitnessDeclarations(planted, "ARCHITECTURE.md");
      assert.equal(declared.length, 2, "both placeholder rows become declarations once given an id");
      assert.deepEqual(declared.map((entry) => entry.pending), [false, true], "…and the second is the `pending` shape the guidance describes");
      // The placeholder PATH is inert too, and that is the second half of the same property: an
      // unfilled `test/arch/<name>.test.ts` is not a path-shaped token, so a scaffolded document
      // cites no control for leg A to probe. Filling it in is what creates the obligation.
      assert.deepEqual(declared[0].controls, [], "an unfilled placeholder path cites no control");
      const filled = fitnessDeclarations(planted.split("<name>.test.ts").join("acd-sample.test.mjs"), "ARCHITECTURE.md");
      assert.deepEqual(filled[0].controls, ["test/arch/acd-sample.test.mjs"], "…and a real intended path IS read out of the enforced-by cell");
    },
  },

  // ── Scenario Outline: no refusal exists that the bundle never asked for ──
  ...CONTROL_FINDING_CODES.map((code) => ({
    name: `bundle-ask (runnable path): the refusal \`${code}\` has an ask — the NAMED ask that would have prevented it, in the file whose reader must obey it`,
    run: async () => {
      const entries = CODE_ASKED_BY[code];
      assert.ok(entries != null, `${code} is mapped — a ninth code with no ask fails here`);
      if (code === "control-runner-unchecked") {
        assert.deepEqual([...entries], [], "nothing, and correctly so: it is always a warn about the CHECKER's own coverage");
        return;
      }
      assert.ok(entries.length > 0, `${code} names at least one asking file`);
      for (const entry of entries) {
        assert.ok(entry.asks.length > 0, `${entry.file} is paired with the specific ask(s) that prevent ${code}`);
        for (const ask of entry.asks) {
          // The PAIRING, not merely the presence: this file must carry THIS ask, and the ask must be
          // one the frozen set binds to this file.
          assert.ok(
            FROZEN_ASKS.some((frozen) => frozen.id === ask && frozen.files.includes(entry.file)),
            `${ask} is bound to ${entry.file} in the frozen set`,
          );
          assert.ok(bundleText(entry.file).includes(ADR_LITERALS[ask]), `${entry.file} carries the ${ask} ask`);
        }
      }
      // …and the pairing is falsifiable: swapping in a file that carries OTHER asks but not this
      // code's is reported. The old shape passed exactly this mutation.
      const decoy = code === "staged-control" ? "templates/milestone/VERIFICATION.md" : "agents/aof-designer.md";
      const mutated = { [code]: [{ file: decoy, asks: entries[0].asks }] };
      assert.ok(
        unpairedCodeAsks(mutated).some((miss) => miss.code === code && miss.file === decoy),
        `pairing ${code} → ${decoy} is reported as unpaired`,
      );
    },
  })),

  // ── Scenario: the guard asserting the ask has itself been seen to fail ──
  {
    name: "bundle-ask (runnable path): the guard has been SEEN RED — removing a rule sentence from one named file fails, naming that file and that rule",
    run: async () => {
      assert.deepEqual(missingAsks(), [], "sanity: green over the shipped bytes before anything is planted");
      const rule = ADR_LITERALS["runnable-path"];
      const blinded = (relative) => (relative === REFINE ? checkedRemove(bundleText(relative), rule, "runnable-path in refine.md") : bundleText(relative));
      const misses = missingAsks(blinded);
      assert.ok(
        misses.some((miss) => miss.ask === "runnable-path" && miss.file === REFINE),
        `the guard fails, naming that file and that rule; got ${JSON.stringify(misses)}`,
      );
      assert.deepEqual([...new Set(misses.map((miss) => miss.file))], [REFINE], "and reports only the file it was removed from");
    },
  },
];
