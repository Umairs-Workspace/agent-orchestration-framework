// Traceability wiring for milestone 66 / story 03 —
// tasks/02_reviewers-report-findings-unnumbered.feature ("A reviewer reports findings unnumbered,
// and the single writer allocates on landing", @executable).
//
// THE SHARPEST MECHANISM IN THE INVESTIGATION. An architect EXECUTED the read-based countermeasure
// — read the register's last entry, saw `D-28`, allocated `D-29` — and collided anyway, because
// `D-29` had been allocated hours earlier in a concurrent lane. "A stale read looks exactly like a
// fresh one." The countermeasure is not weak against this; it is UNSOUND, and no restatement of it
// can be made safe under fan-out. Story 65 made concurrent story dispatch a first-class answer, so
// this repo now RECOMMENDS the fan-out that produces the hazard.
//
// This task is prose across six bundle files and no code, so every assertion here is over the
// SHIPPED BYTES of a NAMED file. The one @manual scenario (a reviewer reading one prompt end to end
// and being left EXPECTING no number — an effect two literally compatible sentences can still
// produce together) is agent-run at `aof:verify`.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADR_LITERALS,
  REVIEWING_AGENTS,
  NON_REVIEWING_AGENTS,
  FINDINGS_HEADER_ROW,
  missingAsks,
} from "../arch/work/acd-verification-template-shape.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(repoRoot, "src");
const bundleText = (relative) => readFileSync(path.join(SRC, "bundle", ...relative.split("/")), "utf8");
const flat = (relative) => bundleText(relative).replace(/\s+/g, " ");

const VERIFY = "commands/verify.md";

// The reviewer-side sentence must NOT tell a reviewer to read a register and take its last id. These
// are the instruction shapes the rule replaces; each is asserted absent from every reviewing agent.
const ALLOCATION_INSTRUCTIONS = [
  /read the (?:last|register).{0,40}\bid\b/i,
  /take (?:the|its) last id/i,
  /allocate the next (?:free )?id/i,
  /next free id/i,
  /increment the (?:last|highest) id/i,
];

function checkedRemove(text, needle, label) {
  assert.ok(text.includes(needle), `sanity: ${label} — the string to remove is present first`);
  const planted = text.split(needle).join("");
  assert.notEqual(planted, text, `sanity: ${label} — the removal changed the text`);
  return planted;
}

export const bundleAsksUnnumberedFindingsTests = [
  // ── Scenario Outline: each reviewing agent is told to report unnumbered ──
  ...REVIEWING_AGENTS.map((agent) => ({
    name: `bundle-ask (unnumbered): \`${agent}\` says to report findings unnumbered, as an ordered list, one line each`,
    run: async () => {
      const text = bundleText(agent);
      assert.ok(text.includes(ADR_LITERALS["unnumbered-findings"]), `${agent} carries the reviewer-side rule, in the frozen wording`);
      assert.ok(ADR_LITERALS["unnumbered-findings"].includes("an ordered list, one line each"), "…and the rule says exactly that");
      for (const shape of ALLOCATION_INSTRUCTIONS) {
        assert.ok(!shape.test(text), `${agent} nowhere tells the reviewer to read a register, take its last id, or allocate the next one (${shape})`);
      }
    },
  })),
  {
    name: "bundle-ask (unnumbered): the instruction shapes the rule replaces are real shapes — the detector fires on each of them",
    run: async () => {
      // NON-VACUITY for the absence half. "Nowhere tells the reviewer to …" is a forbidding-grep,
      // whose passing state is FOUND NOTHING and is therefore indistinguishable from a broken
      // detector by every signal except this probe.
      const specimens = [
        "Read the register and take the last id, then allocate the next one.",
        "take the last id in the file",
        "allocate the next free id yourself",
        "the next free id is yours to claim",
        "increment the highest id you can see",
      ];
      for (const specimen of specimens) {
        assert.ok(
          ALLOCATION_INSTRUCTIONS.some((shape) => shape.test(specimen)),
          `the detector sees a real allocation instruction: ${JSON.stringify(specimen)}`,
        );
      }
      // …and it does NOT fire on the rule's own wording, which mentions ids while forbidding the act.
      assert.ok(
        !ALLOCATION_INSTRUCTIONS.some((shape) => shape.test(ADR_LITERALS["unnumbered-findings"])),
        "the frozen rule itself is not mistaken for an allocation instruction",
      );
    },
  },

  // ── Scenario: the reviewing set is exactly those five, named rather than counted ──
  {
    name: "bundle-ask (unnumbered): exactly five of the eight declared agents report findings into a register — architect, qa, security, compliance, designer",
    run: async () => {
      const agents = readdirSync(path.join(SRC, "bundle", "agents")).sort().map((name) => `agents/${name}`);
      // The floor keeps the identity below non-vacuous; the identity against the two named sets is
      // the exact check, so no count is retyped here (FF-11902).
      assert.ok(agents.length > 0, "the sweep of src/bundle/agents found the declared agents");
      assert.deepEqual([...REVIEWING_AGENTS, ...NON_REVIEWING_AGENTS].sort(), agents, "the five reviewers + the three others are the eight");
      assert.deepEqual(
        [...REVIEWING_AGENTS].sort(),
        ["agents/aof-architect.md", "agents/aof-compliance.md", "agents/aof-designer.md", "agents/aof-qa.md", "agents/aof-security.md"],
        "the five are NAMED in the guard, so a sixth reviewer added later without the rule fails instead of passing unnoticed",
      );
      assert.deepEqual(
        [...NON_REVIEWING_AGENTS].sort(),
        ["agents/aof-developer.md", "agents/aof-product-owner.md", "agents/aof-researcher.md"],
        "developer, product-owner and researcher are outside the rule — they do not report into a register",
      );
      for (const agent of NON_REVIEWING_AGENTS) {
        assert.ok(!bundleText(agent).includes(ADR_LITERALS["unnumbered-findings"]), `${agent} does not carry the reviewer-side rule`);
      }
    },
  },

  // ── Scenario: the rule is one frozen sentence across the six files ──
  {
    name: "bundle-ask (unnumbered): the reviewer-side sentence is BYTE-IDENTICAL in all five reviewing agents, and `commands/verify.md` carries the writer-side half",
    run: async () => {
      const rule = ADR_LITERALS["unnumbered-findings"];
      for (const agent of REVIEWING_AGENTS) {
        assert.equal(bundleText(agent).split(rule).length - 1, 1, `${agent} carries it exactly once, byte-for-byte`);
      }
      assert.equal(bundleText(VERIFY).split(ADR_LITERALS["single-writer-allocates"]).length - 1, 1, "verify.md carries the writer-side sentence");

      // FIVE PARAPHRASES WOULD BE FIVE RULES — the collision arriving by a different road. A single
      // word moved in one agent is reported.
      const paraphrase = rule.replace("an ordered list, one line each", "a list, one line per finding");
      assert.notEqual(paraphrase, rule, "sanity: the paraphrase differs");
      const paraphrased = (relative) => (relative === "agents/aof-qa.md" ? bundleText(relative).split(rule).join(paraphrase) : bundleText(relative));
      assert.ok(
        missingAsks(paraphrased).some((miss) => miss.ask === "unnumbered-findings" && miss.file === "agents/aof-qa.md"),
        "a paraphrase in any one of the five is reported",
      );
    },
  },

  // ── Scenario Outline: a prompt that already tells a reviewer to cite a `@finding-` tag is reconciled ──
  ...["agents/aof-qa.md", "agents/aof-security.md", "agents/aof-compliance.md"].map((agent) => ({
    name: `bundle-ask (unnumbered): \`${agent}\` already routes a finding with a \`@finding-\` tag, and now says the id — and therefore the tag — is applied by the writer`,
    run: async () => {
      const text = bundleText(agent);
      assert.ok(text.includes("@finding-<id>"), "sanity: this prompt routes findings with a `@finding-` tag today");
      assert.ok(text.includes(ADR_LITERALS["unnumbered-findings"]), "…and the rule now travels with it");
      assert.ok(
        ADR_LITERALS["unnumbered-findings"].includes("The id (and therefore any `@finding-<id>` tag) is allocated by the SINGLE WRITER"),
        "the rule reconciles the tag explicitly, so a reviewer following the prompt end to end is never asked to invent a number",
      );
      assert.ok(ADR_LITERALS["unnumbered-findings"].includes("never chosen by you"));
    },
  })),

  // ── Scenario: wherever the seven findings columns are restated, the allocation rule travels ──
  {
    name: "bundle-ask (unnumbered): the two bundle files that restate the seven columns each say who fills the `id` column, and when",
    run: async () => {
      const columns = FINDINGS_HEADER_ROW.split("|").map((cell) => cell.trim()).filter(Boolean);
      const restating = ["commands/verify.md", "agents/aof-qa.md"];
      for (const file of restating) {
        const text = flat(file);
        for (const column of columns) {
          assert.ok(text.includes(column), `${file} restates the column \`${column}\``);
        }
        assert.ok(
          text.includes("at the moment of landing") || text.includes("at the moment the finding lands"),
          `${file} says WHO fills the id column and WHEN — a file that restates the columns without the rule is exactly the drift this catches`,
        );
      }
      // The other bundle files do NOT restate the columns, so the pair above is the whole population
      // rather than a sample. Measured here, at run time, instead of asserted from memory.
      const all = [];
      const walk = (dir, prefix) => {
        for (const name of readdirSync(dir, { withFileTypes: true })) {
          const rel = prefix ? `${prefix}/${name.name}` : name.name;
          if (name.isDirectory()) walk(path.join(dir, name.name), rel);
          else all.push(rel);
        }
      };
      walk(path.join(SRC, "bundle"), "");
      const restaters = all.filter((file) => {
        if (!file.endsWith(".md")) return false;
        const text = flat(file);
        return columns.every((column) => text.includes(column)) && text.includes("routed-to");
      });
      assert.deepEqual(
        restaters.sort(),
        [...restating, "templates/milestone/VERIFICATION.md"].sort(),
        "the files restating the seven are the two prompts plus the template that freezes them",
      );
    },
  },

  // ── Scenario: the verify prompt names the single writer and the moment of allocation ──
  {
    name: "bundle-ask (unnumbered): `commands/verify.md` names the single writer, the moment of allocation, and why nobody is asked to check first",
    run: async () => {
      const text = bundleText(VERIFY);
      const rule = ADR_LITERALS["single-writer-allocates"];
      assert.ok(text.includes(rule));
      assert.ok(rule.includes("allocates ids at the moment of landing them in the register"), "the moment of allocation");
      assert.ok(rule.includes("that is the product owner running `aof:verify`, already the sole author of the record documents"), "the writer, identified");
      assert.ok(
        rule.includes("a stale read is impossible when there is no second reader"),
        "…and why nobody is asked to check first",
      );
      // The reason ADR-006 gives must survive into the prose: the countermeasure is UNSOUND, not weak.
      const flatText = flat(VERIFY);
      assert.ok(flatText.includes("it is **unsound**"), "the prompt says the read-based countermeasure is unsound");
      assert.ok(flatText.includes("saw `D-28`, allocated `D-29`"), "…and carries the measured collision that proves it");
      assert.ok(flatText.includes("A stale read looks exactly like a fresh one"), "…in the words the finding used");
    },
  },

  // ── Scenario: the rule is stated as the prevention and the check as the residue ──
  {
    name: "bundle-ask (unnumbered): the guidance says the rule prevents the collision and the check proves the rule held — never that the check is sufficient alone",
    run: async () => {
      const text = flat(VERIFY);
      assert.ok(text.includes("`register-duplicate-id`"), "the check shipping in 66/02 is named");
      assert.ok(text.includes("residue-catcher, not the prevention"), "the check is the residue-catcher");
      assert.ok(text.includes("the rule prevents the collision and the check proves the rule held"));
      assert.ok(
        text.includes("The check alone is never sufficient — it reports a collision two lanes have already written"),
        "…and it does not present the check as sufficient alone",
      );
    },
  },

  // ── Scenario: no code is required to make this true ──
  {
    name: "bundle-ask (unnumbered): no module under `src/` outside `src/bundle/` changes for this rule, and no dispatcher becomes responsible for a document convention",
    run: async () => {
      // The rule's whole surface is prose in `src/bundle/`: no module outside it names the rule, and
      // nothing under `src/` allocates a finding id. Asserted over the real tree, not from memory.
      const modules = [];
      const walk = (dir) => {
        for (const name of readdirSync(dir, { withFileTypes: true })) {
          if (name.name === "bundle") continue;
          const abs = path.join(dir, name.name);
          if (name.isDirectory()) walk(abs);
          else if (name.name.endsWith(".mjs")) modules.push(abs);
        }
      };
      walk(SRC);
      assert.ok(modules.length > 100, `sanity: the walk reaches the real tree; found ${modules.length} modules`);

      const carriers = modules.filter((file) => readFileSync(file, "utf8").includes(ADR_LITERALS["unnumbered-findings"]));
      assert.deepEqual(carriers, [], "the reviewer-side rule lives in the shipped prompts, and nowhere in `src/` outside `src/bundle/`");

      // …and no dispatcher allocates an id: nothing under `src/` writes a `F-<n>`/`FF-<n>` id into a
      // register. (`src/declared-id.mjs` and `src/work/doctor-controls.mjs` READ the forms — they are
      // the recogniser and the check, which is the opposite of an allocator.)
      const allocators = modules.filter((file) => /nextFreeId|allocateFindingId|nextFindingId/.test(readFileSync(file, "utf8")));
      assert.deepEqual(allocators, [], "no dispatcher becomes responsible for a document convention");
    },
  },

  // ── Scenario: the absence of the rule is detected rather than assumed ──
  {
    name: "bundle-ask (unnumbered): the guard has been SEEN RED — removing the sentence from any ONE of the six files fails, naming that file",
    run: async () => {
      assert.deepEqual(missingAsks(), [], "sanity: green over the shipped bytes before anything is planted");
      const cases = [
        ...REVIEWING_AGENTS.map((agent) => [agent, "unnumbered-findings"]),
        [VERIFY, "single-writer-allocates"],
      ];
      for (const [file, ask] of cases) {
        const rule = ADR_LITERALS[ask];
        const blinded = (relative) => (relative === file ? checkedRemove(bundleText(relative), rule, `${ask} in ${relative}`) : bundleText(relative));
        const misses = missingAsks(blinded);
        assert.ok(
          misses.some((miss) => miss.ask === ask && miss.file === file),
          `the guard fails, naming ${file}; got ${JSON.stringify(misses)}`,
        );
        assert.deepEqual([...new Set(misses.map((miss) => miss.file))], [file], "only that file is reported");
      }
      // A guard still green with the sentence in only five of six is itself the defect this
      // milestone exists to find — asserted by driving all six, one at a time, above.
      assert.equal(cases.length, 6, "six files carry the two halves of one rule");
    },
  },
];
