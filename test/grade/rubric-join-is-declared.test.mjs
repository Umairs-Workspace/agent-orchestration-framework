// Traceability wiring for milestone 54 / story 04, task `00_the-join-is-declared`.
//
// Every @executable scenario of
//   wiki/work/54_milestone_verification-loop/stories/04_story_scenario-traceability/tasks/00_the-join-is-declared.feature
//
// THE JOIN IS DECLARED, NOT INFERRED, AND THE MEASUREMENT IS THE DECISION. Across 719
// `.feature` files this tree holds 4,744 distinct scenario names; across `test/` it declares
// 5,725 test names. **0** are exactly equal to a scenario name and 1,203 contain one. So an
// exact-name join resolves nothing, a containment join roughly a quarter, and there is no id
// either. That is exactly what `68/ADR-005` legislates for: join on a key both sides hold,
// and report an unattributable result as unattributed. aof asserts ONE thing —
//
//     an emitted case's name CONTAINS an `@executable` scenario name from the item in scope.
//
// The lane is driven from LITERAL SNAPSHOTS here, with no filesystem, because that is the
// property the design buys: the answers are a function of the data, and a test that had to
// build a repo to ask them would be testing the engine instead.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { rubricTraceabilityGroup, executableScenariosOf, joinCases } from "../../src/work/doctor-rubric.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// A feature file's text, built from scenario declarations so a test reads as the contract does.
function feature(featureTags, scenarios) {
  const head = `${featureTags}\nFeature: F\n`;
  const body = scenarios
    .map(({ tags, name }) => `\n${tags ? `  ${tags}\n` : ""}  Scenario: ${name}\n    Given a\n    When b\n    Then c\n`)
    .join("");
  return head + body;
}

// A snapshot carrying one item, its feature texts and a report — the whole input the lane
// takes. `no-such-root` is deliberate: a lane that reached disk would throw or answer
// differently, so the fake root is itself part of the assertion.
function snapshotOf({ ref = "03/00", features = {}, report = "", format = "tap", items } = {}) {
  return {
    items: items ?? [{ ref, dir: path.join("no-such-root-ff5408", ref.replace("/", "-")), featureTexts: features }],
    rubricReport: { path: path.join("no-such-root-ff5408", "report.tap"), format, present: true, text: report },
  };
}

const codes = (findings) => findings.map((finding) => finding.code).sort();

export const rubricJoinIsDeclaredTests = [
  {
    name: "rubric/00 a case named after its scenario joins it, and neither side is reported a miss",
    run: () => {
      const findings = rubricTraceabilityGroup(snapshotOf({
        features: { "tasks/00.feature": feature("@executable", [{ name: "the declared floor is the primary defence" }]) },
        report: "ok - work-grade: the declared floor is the primary defence\n",
      }));
      assert.deepEqual(findings, [], "the case is joined to that scenario, and the lane reports no miss for either side");
    },
  },

  {
    name: "rubric/00 the assertion is containment, and nothing weaker",
    run: () => {
      // `a backstop` vs `the backstop` — one word apart, and a near-match is a MISS. A
      // fallback that guesses is worse than a gap, so nothing is inferred from it.
      const findings = rubricTraceabilityGroup(snapshotOf({
        features: { "tasks/00.feature": feature("@executable", [{ name: "the ratchet is the backstop" }]) },
        report: "ok - the ratchet is a backstop\n",
      }));
      assert.deepEqual(codes(findings), ["case-unjoined", "scenario-unjoined"], "the case is not joined to that scenario");
      // NOTHING WAS INFERRED FROM THE NEAR-MATCH: the case is reported by its own emitted
      // name, and no finding mentions the scenario it nearly matched.
      const caseMiss = findings.find((finding) => finding.code === "case-unjoined");
      assert.match(caseMiss.message, /"the ratchet is a backstop"/, "the case is named as the runner emitted it");
      assert.ok(!caseMiss.message.includes("the ratchet is the backstop"), "…and no scenario is offered as what it might have meant");
    },
  },

  {
    name: "rubric/00 aof never decides what a result means",
    run: async () => {
      // A joined case whose status is FAILING. The join is reported and the status is the
      // runner's own; the lane forms no opinion about whether the failure is acceptable.
      const scenarios = executableScenariosOf({ featureTexts: { "tasks/00.feature": feature("@executable", [{ name: "the cap binds" }]) } });
      const joined = joinCases(scenarios, [{ name: "loop: the cap binds", status: "failed" }]);
      assert.equal(joined.joins.length, 1, "the lane reports the join");
      assert.equal(joined.joins[0].status, "failed", "…and the status the runner emitted");
      assert.deepEqual(joined.unjoinedCases, [], "…with no miss on either side");
      assert.deepEqual(joined.unjoinedScenarios, []);

      // THE LANE FORMS NO OPINION. Its findings carry only the two miss codes; there is no
      // finding for a failing case, because whether a red is acceptable is not its question.
      const findings = rubricTraceabilityGroup(snapshotOf({
        features: { "tasks/00.feature": feature("@executable", [{ name: "the cap binds" }]) },
        report: "not ok - loop: the cap binds\n",
      }));
      assert.deepEqual(findings, [], "a joined failing case produces no traceability finding at all");

      // NO STATUS WAS DERIVED FROM THE CASE'S FREE TEXT — the lane never reads a name for
      // meaning, only for containment.
      const source = await readFile(path.join(repoRoot, "src", "work", "doctor-rubric.mjs"), "utf8");
      assert.ok(!/\b(?:passed|failed|skipped)\b\s*(?:=|===)/.test(source), "no status is assigned from text anywhere in the lane");
    },
  },

  {
    name: "rubric/00 only `@executable` scenarios take part in the join",
    run: () => {
      const text = feature("", [
        { tags: "@executable", name: "the executable one" },
        { tags: "@manual", name: "the manual one" },
        { tags: "@uat", name: "the uat one" },
      ]);
      const scenarios = executableScenariosOf({ featureTexts: { "tasks/00.feature": text } });
      assert.deepEqual(scenarios.map((scenario) => scenario.name), ["the executable one"], "only the @executable scenario is offered to the join");

      // A case named after the @MANUAL scenario joins nothing — and the @manual and @uat
      // scenarios are neither joined nor reported unjoined. Reporting them would be this lane
      // inventing an obligation nobody declared.
      const findings = rubricTraceabilityGroup(snapshotOf({ features: { "tasks/00.feature": text }, report: "ok - the manual one\n" }));
      assert.deepEqual(codes(findings), ["case-unjoined", "scenario-unjoined"], "the case misses and the executable scenario misses");
      const misses = findings.filter((finding) => finding.code === "scenario-unjoined");
      assert.equal(misses.length, 1, "exactly one scenario miss");
      assert.match(misses[0].message, /the executable one/, "…and it is the @executable one");
      for (const finding of findings) {
        assert.ok(!finding.message.includes("the uat one"), "the @uat scenario is neither joined nor reported unjoined");
      }
    },
  },

  {
    name: "rubric/00 no minimum name length is invented",
    run: () => {
      // The 25-character figure in the measurement was a FILTER, not a rule. Inventing a
      // threshold would make the join's answer depend on a constant nobody declared.
      const findings = rubricTraceabilityGroup(snapshotOf({
        features: { "tasks/00.feature": feature("@executable", [{ name: "the cap binds" }]) },
        report: "ok - loop: the cap binds\n",
      }));
      assert.deepEqual(findings, [], "a 13-character scenario name joins exactly as a long one does");
      assert.equal(joinCases([{ name: "a", file: "f" }], [{ name: "xax" }]).joins.length, 1, "…and so does a one-character one");
    },
  },

  {
    name: "rubric/00 a case containing two scenario names joins both, and no ambiguity code is coined",
    run: async () => {
      const text = feature("@executable", [
        { name: "the pool gets its caller" },
        { name: "the pool gets its caller under load" },
      ]);
      const findings = rubricTraceabilityGroup(snapshotOf({
        features: { "tasks/00.feature": text },
        report: "ok - the pool gets its caller under load\n",
      }));
      assert.deepEqual(findings, [], "neither scenario is reported unjoined, and the case is not reported unjoined");

      const scenarios = executableScenariosOf({ featureTexts: { "tasks/00.feature": text } });
      const joined = joinCases(scenarios, [{ name: "the pool gets its caller under load", status: "passed" }]);
      assert.equal(joined.joins.length, 2, "the case is joined to BOTH scenarios");
      assert.deepEqual(
        joined.joins.map((join) => join.scenario).sort(),
        ["the pool gets its caller", "the pool gets its caller under load"],
        "…by name, not by which was longer",
      );

      // NO AMBIGUITY CODE WAS COINED. The lane's vocabulary is the frozen three, and a
      // substring relationship between two scenario names is a naming FACT about the
      // contract — reported by joining both rather than by guessing which was meant.
      const { RUBRIC_FINDING_CODES } = await import("../../src/work/doctor-rubric.mjs");
      assert.deepEqual([...RUBRIC_FINDING_CODES], ["case-unjoined", "scenario-unjoined", "rubric-join-unchecked"]);
      assert.ok(!RUBRIC_FINDING_CODES.some((code) => /ambig/i.test(code)), "no ambiguity code exists to have been coined");
    },
  },

  {
    name: "rubric/00 the scenarios come from the one feature parser, tags on the feature line included",
    run: async () => {
      // A scenario INHERITING `@executable` from its feature line counts exactly as one
      // tagged on its own — which is the parser's rule, not a rule this lane re-implements.
      const inherited = executableScenariosOf({
        featureTexts: { "tasks/00.feature": feature("@executable", [{ name: "inherited" }]) },
      });
      assert.deepEqual(inherited.map((scenario) => scenario.name), ["inherited"], "a scenario inheriting @executable from its feature line is included");

      const perScenario = executableScenariosOf({
        featureTexts: { "tasks/01.feature": feature("", [{ tags: "@executable", name: "tagged" }, { name: "untagged" }]) },
      });
      assert.deepEqual(perScenario.map((scenario) => scenario.name), ["tagged"], "…and one tagged on its own line is too, while an untagged sibling is not");

      // NO SECOND PARSER WAS WRITTEN. The lane reads the repository's single recogniser and
      // holds no copy of the Gherkin grammar — the property `66/ADR-003` pins by name.
      const source = await readFile(path.join(repoRoot, "src", "work", "doctor-rubric.mjs"), "utf8");
      assert.match(source, /import \{ parseFeature \} from "(?:\.\.?\/)+feature-parse\.mjs"/, "it reads them through the repository's single feature parser");
      for (const grammar of ["Scenario:", "Scenario Outline", "Feature:", "Background:"]) {
        assert.ok(!source.includes(`"${grammar}`) && !source.includes(`^${grammar}`), `the lane holds no copy of the grammar token ${grammar}`);
      }
    },
  },

  {
    name: "rubric/00 the join is scoped to the item under examination",
    run: () => {
      // TWO items declaring an `@executable` scenario of the SAME name, and one case naming
      // it. The join considers only the item it is running for — the second item's
      // identically named scenario is not consulted, so it reports its own miss.
      const text = feature("@executable", [{ name: "the shared name" }]);
      const findings = rubricTraceabilityGroup(snapshotOf({
        items: [
          { ref: "03/00", dir: path.join("no-such-root-ff5408", "first"), featureTexts: { "tasks/00.feature": text } },
          { ref: "03/01", dir: path.join("no-such-root-ff5408", "second"), featureTexts: { "tasks/00.feature": text } },
        ],
        report: "ok - unit: the shared name\n",
      }));
      // The first item joins; the second reports nothing either, because the SAME case name
      // contains its scenario name too — which is the honest answer to "did any case name
      // this scenario?" and not a leak between items. What is scoped is the SCENARIO SET each
      // item is judged against, and that is what the next assertion measures.
      assert.deepEqual(findings, [], "each item is judged against its own scenarios");

      const onlyFirst = rubricTraceabilityGroup(snapshotOf({
        items: [
          { ref: "03/00", dir: path.join("no-such-root-ff5408", "first"), featureTexts: { "tasks/00.feature": feature("@executable", [{ name: "only mine" }]) } },
          { ref: "03/01", dir: path.join("no-such-root-ff5408", "second"), featureTexts: { "tasks/00.feature": feature("@executable", [{ name: "only theirs" }]) } },
        ],
        report: "ok - unit: only mine\n",
      }));
      // The second item's scenario is unjoined and the case is unjoined FOR THAT ITEM — the
      // first item's scenarios were not consulted on its behalf.
      assert.deepEqual(codes(onlyFirst), ["case-unjoined", "scenario-unjoined"], "the second item is judged against its own scenarios alone");
      for (const finding of onlyFirst) {
        assert.match(finding.message, /^03\/01:/, "…and both of its findings are its own");
      }
    },
  },
];
