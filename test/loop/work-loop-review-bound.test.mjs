// Traceability: 69/00/tasks/01_review-round-is-one.feature.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { reviewRoundsFromConfig } from "../../src/loop-bounds.mjs";
import {
  REVIEW_BLOCKER_CLASSES,
  decideReviewRound,
  isReviewBlockerClaim,
  reviewBlockerFromFinding,
  reviewFindingDisposition,
} from "../../src/work/loop.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultCap = reviewRoundsFromConfig({ config: {} });
const findingRows = [
  ["a production defect", true, "production-defect"],
  ["a guard that protects nothing", true, "guard-protects-nothing"],
  ["a violation of the locked contract", true, "locked-contract-violation"],
  ["a naming preference", false, null],
  ["a suggested refactor with no defect", false, null],
  ["a documentation improvement", false, null],
];

export const workLoopReviewBoundTests = [
  {
    name: "69/00 review/01 first review round is admitted without a blocker",
    run() {
      assert.deepEqual(decideReviewRound({ completedRounds: 0, cap: defaultCap }), {
        admitted: true, act: "review", round: 1, cap: 1, blocker: null,
      });
    },
  },
  {
    name: "69/00 review/01 second round without a named blocker is refused and names all admitting classes",
    run() {
      const result = decideReviewRound({ completedRounds: 1, cap: defaultCap });
      assert.equal(result.act, "halt");
      assert.equal(result.stop, "cap-exhausted");
      assert.deepEqual(result.blockerClasses, REVIEW_BLOCKER_CLASSES);
      assert.match(result.message, /production defect/u);
      assert.match(result.message, /guard that protects nothing/u);
      assert.match(result.message, /locked-contract violation/u);
    },
  },
  {
    name: "69/00 review/01 second round with a named blocker is admitted and carries it",
    run() {
      const blocker = reviewBlockerFromFinding("a production defect");
      const result = decideReviewRound({ completedRounds: 1, cap: defaultCap, blocker });
      assert.equal(result.admitted, true);
      assert.equal(result.round, 2);
      assert.deepEqual(result.blocker, blocker);
    },
  },
  ...findingRows.map(([finding, admitted, blockerClass]) => ({
    name: `69/00 review/01 blocker matrix row — ${finding}`,
    run() {
      const blocker = reviewBlockerFromFinding(finding);
      const result = decideReviewRound({
        completedRounds: 1,
        cap: defaultCap,
        finding,
        ...(blocker === null ? {} : { blocker }),
      });
      assert.equal(result.admitted === true, admitted);
      if (admitted) {
        assert.equal(result.blocker.class, blockerClass);
        assert.equal(isReviewBlockerClaim(result.blocker), true);
      }
      else {
        assert.equal(blocker, null);
        assert.equal(result.stop, "cap-exhausted");
        assert.deepEqual(result.findingDisposition, { finding, disposition: "work-item" });
        assert.deepEqual(reviewFindingDisposition(finding), { finding, disposition: "work-item" });
      }
    },
  })),
  {
    name: "69/00 amended F-6900 free-form blocker prose cannot admit a production re-review",
    run() {
      for (const finding of [
        "a production defect",
        "a guard that protects nothing",
        "a violation of the locked contract",
      ]) {
        const result = decideReviewRound({ completedRounds: 1, cap: defaultCap, finding });
        assert.equal(result.act, "halt");
        assert.equal(result.stop, "cap-exhausted");
        assert.equal(result.blocker, undefined);
      }
    },
  },
  {
    name: "69/00 amended F-6900 only complete structured blocker claims are admitted",
    run() {
      for (const blocker of [
        "production-defect",
        { class: "production-defect" },
        { class: "production-defect", finding: "" },
        { class: "reviewer-preference", finding: "rename it" },
        Object.create({ class: "production-defect", finding: "inherited prose" }),
        null,
      ]) {
        assert.equal(isReviewBlockerClaim(blocker), false);
        assert.equal(decideReviewRound({ completedRounds: 1, cap: defaultCap, blocker }).act, "halt");
      }
    },
  },
  {
    name: "69/00 amended F-6900 an explicit blocker admits a further re-review after the declared rounds",
    run() {
      const blocker = reviewBlockerFromFinding("a production defect");
      assert.equal(decideReviewRound({ completedRounds: 1, cap: defaultCap, blocker }).round, 2);
      const third = decideReviewRound({ completedRounds: 2, cap: defaultCap, blocker });
      assert.equal(third.admitted, true);
      assert.equal(third.act, "review");
      assert.equal(third.round, 3);
      assert.equal(third.cap, 1);
    },
  },
  {
    name: "69/00 review/01 exhausted review is a counted cap stop, not a crash",
    run() {
      assert.doesNotThrow(() => decideReviewRound({ completedRounds: 1, cap: defaultCap }));
      assert.deepEqual(
        (({ act, stop, round, cap }) => ({ act, stop, round, cap }))(decideReviewRound({ completedRounds: 1, cap: defaultCap })),
        { act: "halt", stop: "cap-exhausted", round: 1, cap: 1 },
      );
    },
  },
  {
    name: "69/00 review/01 configured review count bounds the decision with no literal in work-loop",
    async run() {
      const cap = reviewRoundsFromConfig({ config: { work: { loop: { reviewRounds: 2 } } } });
      assert.equal(decideReviewRound({ completedRounds: 1, cap }).admitted, true);
      const source = await readFile(path.join(root, "src", "work", "loop.mjs"), "utf8");
      const body = source.slice(source.indexOf("export function decideReviewRound"), source.indexOf("function taskFacts"));
      assert.doesNotMatch(body, /\bcap\s*=\s*1\b|DEFAULT_REVIEW_ROUNDS/u);
    },
  },
  {
    name: "69/00 review/01 configured review count halts exactly when that cap is exhausted",
    run() {
      const cap = reviewRoundsFromConfig({ config: { work: { loop: { reviewRounds: 2 } } } });
      assert.equal(decideReviewRound({ completedRounds: 1, cap }).admitted, true);
      assert.deepEqual(
        (({ act, stop, round, cap: measuredCap }) => ({ act, stop, round, cap: measuredCap }))(
          decideReviewRound({ completedRounds: 2, cap }),
        ),
        { act: "halt", stop: "cap-exhausted", round: 2, cap: 2 },
      );
    },
  },
  {
    name: "69/00 review/01 malformed and unsafe caps refuse against work.loop.reviewRounds",
    run() {
      for (const cap of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, "2", null]) {
        const refusal = decideReviewRound({ completedRounds: 0, cap });
        assert.equal(refusal.code, "loop-bound-unresolved");
        assert.equal(refusal.field, "reviewRounds");
        assert.equal(refusal.resolution, "work.loop.reviewRounds");
      }
    },
  },
];
