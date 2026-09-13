// FF-6206 — the distance is read from the acceptor and the counter, never copied.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { REFUSAL_REMOVALS, RULING_REFUSAL_ORDER } from "../../../src/commands/acceptor.mjs";
import { NOT_ADMISSIBLE } from "../../../src/work-acceptor/admissibility.mjs";
import {
  DISTANCE_LIMBS,
  distanceToLive,
} from "../../../src/work-tune/distance.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const familyDir = path.join(root, "src", "work-tune");

async function familySources() {
  const names = (await readdir(familyDir)).filter((name) => name.endsWith(".mjs")).sort();
  assert.ok(names.length > 0, `the sweep of ${familyDir} found no .mjs module — a walk whose subject set empties must FAIL naming the directory (119/ADR-003 §4)`);
  return Promise.all(names.map(async (name) => ({
    name,
    source: await readFile(path.join(familyDir, name), "utf8"),
  })));
}

const proposal = {
  target: { kind: "config", id: "work.fixture.bound", key: "work.fixture.bound" },
  laneBasis: { presence: "present", ground: null },
};

const attributed = [{
  ref: "fixture/00",
  status: "done",
  acceptedAt: "2026-08-31T12:00:00.000Z",
  runs: [{ createdAt: "2026-08-31T11:00:00.000Z", sessionId: "session" }],
}];

function report(removal, rel = "src/first.mjs") {
  const ground = {
    code: NOT_ADMISSIBLE,
    key: proposal.target.key,
    records: ["loop:fixture"],
    declaringHome: "src/bounds.mjs",
    sites: [{ rel, line: 1, disposition: "resolved-then-discarded" }],
    inspections: [],
    consumers: [],
  };
  return {
    proposals: [{
      key: proposal.target.key,
      admissibility: { considered: true, refusals: [ground] },
      refusals: [{
        code: NOT_ADMISSIBLE,
        removal,
        detail: {
          grounds: [ground],
        },
      }],
      constructionRefusals: [],
    }],
  };
}

export const archTests = [
  {
    name: "arch/62 FF-6206 every work-tune module contains no acceptor ruling code or removal copy",
    run: async () => {
      const family = await familySources();
      assert.ok(family.some(({ name }) => name === "distance.mjs"));
      for (const { name, source } of family) {
        for (const code of RULING_REFUSAL_ORDER) {
          assert.equal(source.includes(JSON.stringify(code)), false, `${name} must import, not copy, ${code}`);
        }
        for (const removal of Object.values(REFUSAL_REMOVALS)) {
          assert.equal(source.includes(removal), false, `${name} must render report-owned removal text`);
        }
      }
      const distance = family.find(({ name }) => name === "distance.mjs").source;
      assert.match(distance, /import \{ NOT_ADMISSIBLE \}/u);
    },
  },
  {
    name: "arch/62 FF-6206 work-tune builds no source unit set and walks no src tree",
    run: async () => {
      for (const { name, source } of await familySources()) {
        assert.doesNotMatch(source, /\{\s*rel\s*,\s*code\s*\}/u, `${name} must not build source units`);
        assert.doesNotMatch(source, /readdir[^\n]*src|walk\([^\n]*src/u, `${name} must not walk src`);
      }
    },
  },
  {
    name: "arch/62 FF-6206 acceptor wording and grounds move the distance without a local edit",
    run: () => {
      const first = distanceToLive(proposal, { acceptorReport: report("first treatment", "src/first.mjs"), roundsItems: attributed });
      const second = distanceToLive(proposal, { acceptorReport: report("second treatment", "src/second.mjs"), roundsItems: attributed });
      assert.equal(first.standing[0].removal, "first treatment");
      assert.equal(second.standing[0].removal, "second treatment");
      assert.equal(first.standing[0].measurement.subjects[0].sites[0].rel, "src/first.mjs");
      assert.equal(second.standing[0].measurement.subjects[0].sites[0].rel, "src/second.mjs");
    },
  },
  {
    name: "arch/62 FF-6206 one accepted attributed item removes only the attribution limb",
    run: () => {
      const advisory = {
        laneBasis: { presence: "absent", ground: { code: "advisory-class", permanent: true } },
      };
      const open = distanceToLive(advisory, {
        acceptorReport: report("report treatment"),
        roundsItems: [{
          ref: "fixture/00",
          status: "done",
          acceptedAt: "2026-08-31T12:00:00.000Z",
          runs: [{ createdAt: "2026-08-31T11:00:00.000Z", sessionId: null }],
        }],
      });
      const closed = distanceToLive(advisory, { acceptorReport: report("report treatment"), roundsItems: attributed });
      assert.equal(open.standing.some((entry) => entry.code === DISTANCE_LIMBS.RUN_ATTRIBUTION), true);
      assert.equal(closed.standing.some((entry) => entry.code === DISTANCE_LIMBS.RUN_ATTRIBUTION), false);
      assert.equal(closed.standing.some((entry) => entry.code === DISTANCE_LIMBS.DECISION_SITE_CONSUMER), true);
    },
  },
];
