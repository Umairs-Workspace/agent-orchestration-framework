// Traceability: 69/00/tasks/03_the-cap-binds-the-loop.feature (authoritative
// amended contract supplied from the orchestrator's main checkout).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { reviewRoundsFromConfig } from "../../src/loop-bounds.mjs";
import {
  REVIEW_BLOCKER_CLASSES,
  decideReviewGate,
  isReviewBlockerClaim,
  reviewBlockerClaim,
} from "../../src/work/loop.mjs";
import { loopCommand, runLoopBody } from "../../src/commands/loop.mjs";
import { completingDriver, loopFixture } from "./loop-command-probe.test.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// THE SIX BOUNDS THE SHELL RESOLVES THROUGH loop-bounds, asserted as MEMBERSHIP of its one import
// from that module rather than as the literal spelling of the import statement (129/04: the shell
// also imports the concurrency MODE and the two child-deadline bounds from the same home, and a pin
// on the exact six-name statement would red on the seventh name without protecting anything more).
const LOOP_BOUND_IMPORTS = Object.freeze(["MAX_REVIEW_ROUNDS", "buildNoProgressRoundsFromConfig", "heartbeatFromConfig", "progressMaxResetsFromConfig", "reviewRoundsFromConfig", "scheduleToCloseFromConfig"]);
function assertLoopBoundsImport(source) {
  const statement = /import \{([^}]+)\} from "\.\.\/loop-bounds\.mjs"/u.exec(source);
  assert.ok(statement, "the shell imports its bounds from ../loop-bounds.mjs");
  const names = statement[1].split(",").map((name) => name.replace(/\/\/[^\n]*/gu, "").trim()).filter(Boolean);
  for (const name of LOOP_BOUND_IMPORTS) assert.ok(names.includes(name), `${name} is resolved through loop-bounds`);
  assert.equal((source.match(/from "\.\.\/loop-bounds\.mjs"/gu) ?? []).length, 1, "one import statement from the bounds home");
}
const plainFinding = (problem = "the locked contract is still red") => ({ path: "tasks/00.feature", problem });
const claimedFinding = (blockerClass, problem = "the blocker remains") => ({
  ...plainFinding(problem),
  blockerClaim: reviewBlockerClaim(blockerClass, problem, { producer: "review" }),
});

function decision({ consumed, cap = 1, findings }) {
  return decideReviewGate({ completedRounds: consumed, cap, findings });
}

const truthRows = [
  [0, null, true],
  [0, "production-defect", true],
  [1, null, false],
  [1, "production-defect", true],
  [1, "guard-protects-nothing", true],
  [1, "locked-contract-violation", true],
  [2, null, false],
  [2, "locked-contract-violation", true],
];

const claimRows = [
  ["an admitted class, declared as a claim", reviewBlockerClaim("production-defect", "production is broken"), true],
  ["a class outside the admitted set", { class: "preference", finding: "rename this" }, false],
  ["a finding record carrying a path and a problem", plainFinding(), false],
  ["reviewer prose naming a class in passing", "this is a production-defect", false],
  ["an empty claim", {}, false],
  ["a malformed claim", { class: "production-defect" }, false],
  ["nothing at all", null, false],
];

export const workLoopProductionReviewBoundTests = [
  {
    name: "69/00 task03 the first findings-bearing gate re-drives without a blocker claim",
    run() {
      const result = decision({ consumed: 0, findings: [plainFinding()] });
      assert.equal(result.admitted, true);
      assert.equal(result.act, "drive");
      assert.equal(result.phase, "continue");
      assert.equal(result.round, 1);
      assert.equal(result.blocker, null);
    },
  },
  {
    name: "69/00 task03 an exhausted unclaimed production decision halts with measured rounds and admitting classes",
    run() {
      const result = decision({ consumed: 1, findings: [plainFinding()] });
      assert.equal(result.act, "halt");
      assert.equal(result.stop, "cap-exhausted");
      assert.equal(result.round, 1);
      assert.equal(result.cap, 1);
      assert.deepEqual(result.blockerClasses, REVIEW_BLOCKER_CLASSES);
    },
  },
  {
    name: "69/00 task03 an admitted structured claim re-drives and is carried on the production decision",
    run() {
      const claim = reviewBlockerClaim("production-defect", "the shipped path crashes");
      const result = decision({ consumed: 1, findings: [{ ...plainFinding(), blockerClaim: claim }] });
      assert.equal(result.act, "drive");
      assert.equal(result.round, 2);
      assert.deepEqual(result.blocker, claim);
    },
  },
  {
    name: "69/00 task03 refused findings survive the halt as undiscarded work items",
    run() {
      const findings = [plainFinding("first"), plainFinding("second")];
      const result = decision({ consumed: 1, findings });
      assert.deepEqual(result.findings, findings);
      assert.deepEqual(result.workItems, findings.map((finding) => ({ finding, disposition: "work-item" })));
    },
  },
  ...truthRows.map(([consumed, blockerClass, admitted]) => ({
    name: `69/00 task03 production truth row — consumed ${consumed}, claim ${blockerClass ?? "none"}`,
    run() {
      const findings = [blockerClass === null ? plainFinding() : claimedFinding(blockerClass)];
      const result = decision({ consumed, findings });
      assert.equal(result.admitted === true, admitted);
      assert.equal(result.act, admitted ? "drive" : "halt");
      if (admitted && blockerClass !== null) assert.equal(result.blocker.class, blockerClass);
    },
  })),
  ...claimRows.map(([label, carried, blocker]) => ({
    name: `69/00 task03 claim-classification row — ${label}`,
    run() {
      const finding = plainFinding();
      if (label === "a finding record carrying a path and a problem") {
        finding.blockerClaim = carried;
      } else if (carried !== null) {
        finding.blockerClaim = carried;
      }
      const result = decision({ consumed: 1, findings: [finding] });
      assert.equal(isReviewBlockerClaim(carried), blocker);
      assert.equal(result.admitted === true, blocker);
    },
  })),
  {
    name: "69/00 task03 remaining engine cycles cannot buy an unclaimed review round",
    run() {
      const result = decideReviewGate({
        completedRounds: 1,
        cap: 1,
        findings: [plainFinding()],
        engineCycle: 2,
        engineCap: 9,
      });
      assert.equal(result.stop, "cap-exhausted");
      assert.equal(result.cap, 1);
      assert.notEqual(result.cap, 9);
    },
  },
  {
    name: "69/00 task03 a configured round count changes the production decision",
    run() {
      const configuredCap = reviewRoundsFromConfig({ config: { work: { loop: { reviewRounds: 2 } } } });
      const defaultCap = reviewRoundsFromConfig({ config: {} });
      assert.equal(decision({ consumed: 1, cap: configuredCap, findings: [plainFinding()] }).act, "drive");
      assert.equal(decision({ consumed: 1, cap: defaultCap, findings: [plainFinding()] }).act, "halt");
    },
  },
  {
    name: "69/00 task03 the production command resolves the number from loop-bounds once and declares no literal",
    async run() {
      const source = await readFile(path.join(root, "src", "commands", "loop.mjs"), "utf8");
      const body = source.slice(source.indexOf("export async function runLoopBody"), source.indexOf("export function renderLoopState"));
      assertLoopBoundsImport(source);
      assert.equal((body.match(/reviewRoundsFromConfig\(/gu) ?? []).length, 1);
      assert.doesNotMatch(body, /reviewCap\s*=\s*1\b|DEFAULT_REVIEW_ROUNDS/u);
    },
  },
  {
    name: "69/00 blocker fix the production command resolves heartbeat staleness only through loop-bounds",
    async run() {
      const source = await readFile(path.join(root, "src", "commands", "loop.mjs"), "utf8");
      assertLoopBoundsImport(source);
      assert.equal((source.match(/heartbeatFromConfig\(/gu) ?? []).length, 2);
      assert.doesNotMatch(source, /heartbeatStaleMs|DEFAULT_HEARTBEAT_STALE_MS/u);
    },
  },
  {
    name: "69/00 task03 the exhausted refusal is reachable from the production loop command",
    async run() {
      const fx = await loopFixture({ cap: 5, reviewRounds: 1 });
      const reports = [];
      try {
        writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), "Feature: Invalid\n  Scenario: missing lane\n    Given a fixture\n");
        const driver = completingDriver(fx);
        const state = await runLoopBody({ scope: "03" }, {
          ...fx.ctx,
          agentSessionDriverOptions: driver.options,
          report: (line) => { reports.push(line); },
        });
        assert.equal(state.cap, 5, "engine cycles remain available");
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.act.producer, "review:rounds>=cap");
        assert.equal(state.act.round, 1);
        assert.equal(state.act.cap, 1, "machine state carries the review cap, not the engine cap");
        assert.deepEqual(state.act.findings.map((finding) => finding.problem), state.act.workItems.map((item) => item.finding.problem));
        assert.ok(state.act.workItems.every((item) => item.disposition === "work-item"));
        assert.equal(driver.typed.length, 2, "initial maker drive plus the one declared findings-driven re-drive");
        assert.match(reports.at(-1), /round=1; reviewCap=1/u);
        assert.match(reports.at(-1), /workItems=/u);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "69/00 task03 production gate transports valid explicit claims at consumed rounds one and two",
    async run() {
      const fx = await loopFixture({ cap: 6, reviewRounds: 1 });
      try {
        writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), "Feature: Invalid\n  Scenario: missing lane\n    Given a fixture\n");
        const driver = completingDriver(fx);
        const state = await runLoopBody({
          scope: "03",
          reviewClaims: [
            { ref: "03/01", completedRounds: 1, claims: [
              reviewBlockerClaim("production-defect", "the production path still fails", { producer: "review" }),
              reviewBlockerClaim("guard-protects-nothing", "the regression guard is inert", { producer: "review" }),
            ] },
            { ref: "03/01", completedRounds: 2, claim: reviewBlockerClaim("locked-contract-violation", "the locked scenario is still red", { producer: "review" }) },
          ],
        }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
        assert.equal(state.act.producer, "review:rounds>=hard-cap");
        assert.equal(state.act.round, 3, "both explicit post-cap claims admitted a production re-drive");
        assert.equal(driver.typed.length, 4, "initial drive, default round, and both claimed rounds ran");
        assert.deepEqual(state.driven.filter((row) => row.phase === "continue").map((row) => row.cycle), [1, 2, 3, 4]);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "69/00 task03 malformed and non-claims traverse the production gate but admit no post-cap drive",
    async run() {
      const rows = [
        ["outside class", { class: "preference", finding: "rename it" }],
        ["path/problem finding", plainFinding()],
        ["reviewer prose", "a production-defect is mentioned"],
        ["empty", {}],
        ["malformed", { class: "production-defect" }],
        ["null", null],
      ];
      for (const [label, claim] of rows) {
        const fx = await loopFixture({ cap: 5, reviewRounds: 1 });
        try {
          writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), "Feature: Invalid\n  Scenario: missing lane\n    Given a fixture\n");
          const driver = completingDriver(fx);
          const state = await runLoopBody({
            scope: "03",
            reviewClaims: [{ ref: "03/01", completedRounds: 1, claim }],
          }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
          assert.equal(state.act.producer, "review:rounds>=cap", label);
          assert.equal(driver.typed.length, 2, `${label}: no third maker drive`);
          assert.ok(state.act.workItems.length > 0, `${label}: refused findings remain machine-readable`);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "69/00 task03 explicit resume enforces reconstructed review admission before spawning a pending fix",
    async run() {
      const fx = await loopFixture({ cap: 5, reviewRounds: 1 });
      try {
        writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), "Feature: Invalid\n  Scenario: missing lane\n    Given a fixture\n");
        const firstDriver = completingDriver(fx);
        const first = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: firstDriver.options, report: () => {} });
        assert.equal(first.act.producer, "review:rounds>=cap");

        const resumedDriver = completingDriver(fx);
        const resumed = await runLoopBody({ scope: "03", resume: true }, { ...fx.ctx, agentSessionDriverOptions: resumedDriver.options, report: () => {} });
        assert.equal(resumed.loopRunId, first.loopRunId);
        assert.equal(resumed.act.producer, "review:rounds>=cap");
        assert.equal(resumed.act.round, 1);
        assert.equal(resumedDriver.spawnCalls.length, 0, "the refused pending fix never reaches the session driver");
        assert.ok(resumed.act.findings.length > 0);
        assert.equal(resumed.act.findings.length, resumed.act.workItems.length);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "69/00 task03 a non-resume invocation mints a fresh loop id and fresh engine/review budgets",
    async run() {
      const fx = await loopFixture({ cap: 5, reviewRounds: 1 });
      try {
        writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), "Feature: Invalid\n  Scenario: missing lane\n    Given a fixture\n");
        const firstDriver = completingDriver(fx);
        const first = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: firstDriver.options, report: () => {} });
        const secondDriver = completingDriver(fx);
        const second = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: secondDriver.options, report: () => {} });
        assert.notEqual(second.loopRunId, first.loopRunId);
        assert.deepEqual(first.driven.map((row) => row.cycle), [1, 2]);
        assert.deepEqual(second.driven.map((row) => row.cycle), [1, 2], "engine cycles restart only without --resume");
        assert.equal(first.act.round, 1);
        assert.equal(second.act.round, 1, "review admission also starts from a fresh budget");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "69/00 task03 the CLI adapter carries structured review claims as JSON, never prose classification",
    run() {
      const reviewClaims = [{
        ref: "03/01",
        completedRounds: 1,
        claim: reviewBlockerClaim("production-defect", "still failing", { producer: "review" }),
      }];
      assert.deepEqual(
        loopCommand.cli.argv(["03"], { reviewClaims: JSON.stringify(reviewClaims) }).reviewClaims,
        reviewClaims,
      );
    },
  },
];
