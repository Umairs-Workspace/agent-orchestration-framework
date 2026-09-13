// Milestone 62 / story 03 — executable traceability for all five task features.
import assert from "node:assert/strict";

import { NOT_ADMISSIBLE } from "../../src/work-acceptor/admissibility.mjs";
import {
  DISTANCE_LIMBS,
  DISTANCE_STATES,
  attachProposalDistances,
  distanceToLive,
  runAttributionReading,
} from "../../src/work-tune/distance.mjs";

const KEY = "work.fixture.rounds";

const tunable = (overrides = {}) => ({
  target: { kind: "config", id: KEY, key: KEY },
  lane: "tunable",
  laneBasis: { presence: "present", ground: null },
  reason: null,
  ...overrides,
});

const advisory = (overrides = {}) => ({
  target: { kind: "model", id: "developer" },
  lane: "advisory",
  laneBasis: {
    presence: "absent",
    ground: { code: "model-class-advisory", permanent: true },
  },
  reason: null,
  ...overrides,
});

const consumerGround = (key = KEY, sites = [{
  rel: "src/example.mjs",
  line: 12,
  spelling: "config-resolver",
  disposition: "resolved-then-discarded",
}]) => ({
  code: NOT_ADMISSIBLE,
  key,
  records: ["loop:fixture"],
  declaringHome: "src/fixture-bounds.mjs",
  sites,
  inspections: [],
  consumers: [],
});

const refusal = (code, removal, grounds = null) => ({
  code,
  removal,
  ...(grounds == null ? {} : { detail: { grounds } }),
});

const harnessGround = () => ({
  code: "harness-not-introspectable",
  condition: "prompt-names-no-config-key",
});

const row = (overrides = {}) => ({
  key: KEY,
  verdict: "report-only",
  refusals: [refusal(NOT_ADMISSIBLE, "the acceptor's current treatment", [consumerGround()])],
  admissibility: { considered: true, refusals: [consumerGround()] },
  constructionRefusals: [],
  ...overrides,
});

const attributedItems = () => [{
  ref: "62/fixture",
  status: "done",
  acceptedAt: "2026-08-31T12:00:00.000Z",
  runs: [{ createdAt: "2026-08-31T11:00:00.000Z", sessionId: "session-1" }],
}];

const unattributedItems = () => [{
  ref: "62/fixture",
  status: "done",
  acceptedAt: "2026-08-31T12:00:00.000Z",
  runs: [
    { createdAt: "2026-08-31T10:00:00.000Z", sessionId: null },
    { createdAt: "2026-08-31T11:00:00.000Z", sessionId: "" },
  ],
}];

const context = (overrides = {}) => ({
  acceptorReport: { proposals: [row()] },
  roundsItems: attributedItems(),
  ...overrides,
});

export const tuneDistanceTests = [
  {
    name: "tune distance 62/03 task 00 — every emitted proposal keeps its place and gains a distance",
    run: () => {
      const proposals = [
        tunable(),
        tunable({ target: { kind: "config", id: "work.fixture.missing", key: "work.fixture.missing" } }),
        advisory(),
      ];
      const answer = attachProposalDistances(proposals, context());
      assert.equal(answer.length, proposals.length);
      assert.deepEqual(answer.map((entry) => entry.target), proposals.map((entry) => entry.target));
      assert.ok(answer.every((entry) => entry.distance != null));
      assert.equal(answer[1].distance.state, DISTANCE_STATES.UNKNOWN);
    },
  },
  {
    name: "tune distance 62/03 task 00 — different refusal sets stay proposal-specific",
    run: () => {
      const first = distanceToLive(tunable(), context({
        acceptorReport: { proposals: [row({
          refusals: [refusal("first-refusal", "first treatment")],
          admissibility: { considered: true, refusals: [] },
        })] },
      }));
      const second = distanceToLive(tunable(), context({
        acceptorReport: { proposals: [row({
          refusals: [refusal("second-refusal", "second treatment")],
          admissibility: { considered: true, refusals: [] },
        })] },
      }));
      assert.deepEqual(first.standing.map((entry) => entry.code), ["first-refusal"]);
      assert.deepEqual(second.standing.map((entry) => entry.code), ["second-refusal"]);
    },
  },
  {
    name: "tune distance 62/03 task 00 — a candidate demoted before emission is never manufactured here",
    run: () => {
      const emitted = [tunable()];
      const answer = attachProposalDistances(emitted, context());
      assert.equal(answer.length, 1);
      assert.equal(answer.some((entry) => entry.code === "demoted-candidate"), false);
    },
  },
  {
    name: "tune distance 62/03 task 01 — refusal order and removal text are the report's own",
    run: () => {
      const refusals = [
        refusal("unfamiliar-code", "treatment from this report"),
        refusal("another-code", "another report-owned treatment"),
      ];
      const distance = distanceToLive(tunable(), context({
        acceptorReport: { proposals: [row({
          refusals,
          admissibility: { considered: true, refusals: [] },
        })] },
      }));
      assert.deepEqual(
        distance.standing.map(({ code, removal }) => ({ code, removal })),
        refusals,
      );
    },
  },
  {
    name: "tune distance 62/03 task 01 — threshold distance and evidence remain the acceptor's reading",
    run: () => {
      const acceptorDistance = { unit: "rulings", value: 4, reachable: true };
      const evidence = { count: 4, threshold: 8 };
      const distance = distanceToLive(tunable(), context({
        acceptorReport: {
          proposals: [row({
            refusals: [refusal("evidence-short", "four rulings still to accrue")],
            admissibility: { considered: true, refusals: [] },
            distance: acceptorDistance,
            evidence,
          })],
        },
      }));
      assert.deepEqual(distance.acceptor.distance, acceptorDistance);
      assert.deepEqual(distance.acceptor.evidence, evidence);
      assert.equal(distance.standing[0].removal, "four rulings still to accrue");
    },
  },
  {
    name: "tune distance 62/03 task 01 — changing one report changes the treatment with no distance edit",
    run: () => {
      const read = (removal) => distanceToLive(tunable(), context({
        acceptorReport: { proposals: [row({
          refusals: [refusal("moving-code", removal)],
          admissibility: { considered: true, refusals: [] },
        })] },
      })).standing[0].removal;
      assert.equal(read("old words"), "old words");
      assert.equal(read("new subject entirely"), "new subject entirely");
    },
  },
  {
    name: "tune distance 62/03 task 01 — an absent acceptor removal remains unknown",
    run: () => {
      const distance = distanceToLive(tunable(), context({
        acceptorReport: { proposals: [row({
          refusals: [refusal("blank-removal", "")],
          admissibility: { considered: true, refusals: [] },
        })] },
      }));
      assert.equal(distance.standing[0].removal, null);
      assert.equal(distance.state, DISTANCE_STATES.PARTIAL);
      assert.equal(distance.unknown[0].reason, "removal-absent-from-acceptor-report");
    },
  },
  {
    name: "tune distance 62/03 task 01 — a consumer fact beneath a refusal renders once",
    run: () => {
      const distance = distanceToLive(tunable(), context());
      assert.equal(distance.standing.filter((entry) => entry.code === NOT_ADMISSIBLE).length, 1);
      assert.equal(distance.standing.filter((entry) => entry.code === DISTANCE_LIMBS.DECISION_SITE_CONSUMER).length, 0);
      assert.equal(distance.standing[0].measurement.subjects[0].sites[0].disposition, "resolved-then-discarded");
    },
  },
  {
    name: "tune distance 62/03 task 01 — advisory distance uses the run's acceptor reading without inventing a refusal",
    run: () => {
      const distance = distanceToLive(advisory(), context());
      assert.equal(distance.standing.some((entry) => entry.kind === "refusal"), false);
      const limb = distance.standing.find((entry) => entry.code === DISTANCE_LIMBS.DECISION_SITE_CONSUMER);
      assert.equal(limb.measurement.subjects[0].key, KEY);
    },
  },
  {
    name: "tune distance 62/03 task 02 — consumer sites and dispositions move with the grounds",
    run: () => {
      const read = (sites) => distanceToLive(tunable(), context({
        acceptorReport: { proposals: [row({
          refusals: [refusal(NOT_ADMISSIBLE, "acceptor treatment", [consumerGround(KEY, sites)])],
          admissibility: { considered: true, refusals: [consumerGround(KEY, sites)] },
        })] },
      })).standing[0].measurement.subjects[0].sites;
      const first = read([{ rel: "src/a.mjs", line: 1, disposition: "resolved-then-discarded" }]);
      const second = read([{ rel: "src/b.mjs", line: 9, disposition: "handed-off" }]);
      assert.notDeepEqual(first, second);
      assert.equal(second[0].disposition, "handed-off");
    },
  },
  {
    name: "tune distance 62/03 task 02 — a report carrying no grounds stays unmeasured",
    run: () => {
      const distance = distanceToLive(tunable(), context({
        acceptorReport: {
          proposals: [row({
            refusals: [refusal(NOT_ADMISSIBLE, "acceptor treatment")],
            admissibility: undefined,
          })],
        },
      }));
      assert.equal(distance.state, DISTANCE_STATES.PARTIAL);
      assert.equal(distance.standing[0].measurement, undefined);
      assert.equal(distance.unknown[0].reason, "admissibility-grounds-absent");
    },
  },
  {
    name: "tune distance 62/03 task 02 — construction refusal still reads admissibility grounds as a standalone limb",
    run: () => {
      const distance = distanceToLive(tunable(), context({
        acceptorReport: {
          proposals: [row({
            refusals: [],
            admissibility: { considered: true, refusals: [consumerGround()] },
            constructionRefusals: [{ code: "step-unavailable", message: "no step was constructed" }],
          })],
        },
      }));
      const limb = distance.standing.find((entry) => entry.code === DISTANCE_LIMBS.DECISION_SITE_CONSUMER);
      assert.equal(limb.measurement.subjects[0].key, KEY);
      assert.equal(distance.standing.filter((entry) => entry.code === DISTANCE_LIMBS.DECISION_SITE_CONSUMER).length, 1);
      assert.equal(distance.standing.some((entry) => entry.code === "step-unavailable"), true);
    },
  },
  {
    name: "tune distance 62/03 task 02 — asked and clear differs from absent admissibility grounds",
    run: () => {
      const asked = distanceToLive(tunable(), context({
        acceptorReport: { proposals: [row({ refusals: [], admissibility: { considered: true, refusals: [] } })] },
      }));
      const absent = distanceToLive(tunable(), context({
        acceptorReport: { proposals: [row({ refusals: [], admissibility: undefined })] },
      }));
      assert.equal(asked.standing.some((entry) => entry.code === DISTANCE_LIMBS.DECISION_SITE_CONSUMER), false);
      assert.equal(asked.unknown.some((entry) => entry.part === DISTANCE_LIMBS.DECISION_SITE_CONSUMER), false);
      assert.equal(absent.unknown.some((entry) => entry.reason === "admissibility-grounds-absent"), true);
    },
  },
  {
    name: "tune distance 62/03 task 02 — run attribution names both halves of the corpus count",
    run: () => {
      const reading = runAttributionReading(unattributedItems());
      assert.equal(reading.examined, 2);
      assert.equal(reading.attributed, 0);
      assert.deepEqual(reading.missing, ["62/fixture"]);
    },
  },
  {
    name: "tune distance 62/03 task 02 — both limbs name external engineering that closes them",
    run: () => {
      const distance = distanceToLive(advisory(), context({ roundsItems: unattributedItems() }));
      const limbs = distance.standing.filter((entry) => entry.kind === "limb");
      assert.deepEqual(limbs.map((entry) => entry.code), [
        DISTANCE_LIMBS.DECISION_SITE_CONSUMER,
        DISTANCE_LIMBS.RUN_ATTRIBUTION,
      ]);
      assert.ok(limbs.every((entry) => entry.owner === "outside-this-milestone"));
      assert.ok(limbs.every((entry) => typeof entry.removal === "string" && entry.removal.length > 0));
    },
  },
  {
    name: "tune distance 62/03 task 03 — a consumer limb closes when the report no longer refuses it",
    run: () => {
      const closed = distanceToLive(advisory(), context({
        acceptorReport: { proposals: [row({ refusals: [], admissibility: { considered: true, refusals: [] } })] },
      }));
      assert.equal(closed.standing.some((entry) => entry.code === DISTANCE_LIMBS.DECISION_SITE_CONSUMER), false);
    },
  },
  {
    name: "tune distance 62/03 task 03 — canonical rows count one clear knob and name the two unresolved knobs",
    run: () => {
      const rows = [
        row({
          key: "work.fixture.one",
          refusals: [refusal(NOT_ADMISSIBLE, "harness treatment", [harnessGround()])],
          admissibility: { considered: true, refusals: [harnessGround()] },
        }),
        row({
          key: "work.fixture.two",
          admissibility: { considered: true, refusals: [consumerGround("work.fixture.two"), harnessGround()] },
        }),
        row({
          key: "work.fixture.three",
          admissibility: { considered: true, refusals: [consumerGround("work.fixture.three"), harnessGround()] },
        }),
      ];
      const distance = distanceToLive(advisory(), context({
        acceptorReport: { proposals: rows },
      }));
      const limb = distance.standing.find((entry) => entry.code === DISTANCE_LIMBS.DECISION_SITE_CONSUMER);
      assert.equal(limb.measurement.examined, 3);
      assert.equal(limb.measurement.consumed, 1);
      assert.equal(limb.measurement.remaining, 2);
      assert.deepEqual(limb.measurement.subjects.map((subject) => subject.key), [
        "work.fixture.two",
        "work.fixture.three",
      ]);
    },
  },
  {
    name: "tune distance 62/03 task 03 — three canonical clear rows remove the consumer limb",
    run: () => {
      const rows = ["one", "two", "three"].map((name) => row({
        key: `work.fixture.${name}`,
        refusals: [refusal(NOT_ADMISSIBLE, "harness treatment", [harnessGround()])],
        admissibility: { considered: true, refusals: [harnessGround()] },
      }));
      const distance = distanceToLive(advisory(), context({
        acceptorReport: { proposals: rows },
      }));
      assert.equal(distance.standing.some((entry) => entry.code === DISTANCE_LIMBS.DECISION_SITE_CONSUMER), false);
      assert.equal(distance.unknown.some((entry) => entry.part === DISTANCE_LIMBS.DECISION_SITE_CONSUMER), false);
    },
  },
  {
    name: "tune distance 62/03 task 03 — a harness-only NOT_ADMISSIBLE ruling is consumer-clear, not unknown",
    run: () => {
      const distance = distanceToLive(tunable(), context({
        acceptorReport: {
          proposals: [row({
            refusals: [refusal(NOT_ADMISSIBLE, "harness treatment", [harnessGround()])],
            admissibility: { considered: true, refusals: [harnessGround()] },
          })],
        },
      }));
      assert.equal(distance.standing.some((entry) => entry.code === DISTANCE_LIMBS.DECISION_SITE_CONSUMER), false);
      assert.equal(distance.unknown.some((entry) => entry.part === DISTANCE_LIMBS.DECISION_SITE_CONSUMER), false);
      assert.equal(distance.standing.some((entry) => entry.code === NOT_ADMISSIBLE), true);
    },
  },
  {
    name: "tune distance 62/03 task 03 — one fully attributed accepted item closes the attribution limb",
    run: () => {
      const open = distanceToLive(advisory(), context({ roundsItems: unattributedItems() }));
      const closed = distanceToLive(advisory(), context({ roundsItems: attributedItems() }));
      assert.equal(open.standing.some((entry) => entry.code === DISTANCE_LIMBS.RUN_ATTRIBUTION), true);
      assert.equal(closed.standing.some((entry) => entry.code === DISTANCE_LIMBS.RUN_ATTRIBUTION), false);
      assert.ok(closed.standing.every((entry) => open.standing.some((prior) => prior.code === entry.code)));
    },
  },
  {
    name: "tune distance 62/03 task 03 — closing one limb leaves the other reading unchanged",
    run: () => {
      const open = distanceToLive(advisory(), context({ roundsItems: unattributedItems() }));
      const closed = distanceToLive(advisory(), context({ roundsItems: attributedItems() }));
      const code = DISTANCE_LIMBS.DECISION_SITE_CONSUMER;
      assert.deepEqual(
        closed.standing.find((entry) => entry.code === code),
        open.standing.find((entry) => entry.code === code),
      );
    },
  },
  {
    name: "tune distance 62/03 task 04 — asked-and-clear differs from a question never asked",
    run: () => {
      const clear = distanceToLive(tunable(), context({
        acceptorReport: { proposals: [row({ verdict: "eligible", refusals: [], admissibility: { considered: true, refusals: [] } })] },
      }));
      const unknown = distanceToLive(advisory(), context({ acceptorReport: null }));
      assert.equal(clear.state, DISTANCE_STATES.MEASURED);
      assert.equal(clear.clear, true);
      assert.equal(clear.count, 0);
      assert.equal(unknown.state, DISTANCE_STATES.PARTIAL);
      assert.equal(unknown.clear, false);
      assert.equal(unknown.count, null);
      assert.equal(unknown.unknown.some((entry) => entry.part === DISTANCE_LIMBS.DECISION_SITE_CONSUMER), true);
    },
  },
  {
    name: "tune distance 62/03 task 04 — one unreadable half yields a partial distance",
    run: () => {
      const distance = distanceToLive(tunable(), context({
        acceptorReport: { proposals: [row()] },
        roundsItems: [],
      }));
      assert.equal(distance.state, DISTANCE_STATES.PARTIAL);
      assert.equal(distance.measuredCount, 1);
      assert.equal(distance.count, null);
      assert.equal(distance.unknown[0].input, "run-record corpus");
    },
  },
  {
    name: "tune distance 62/03 task 04 — a malformed non-array corpus is unknown and never measured zero",
    run: () => {
      const distance = distanceToLive(tunable(), context({
        acceptorReport: { proposals: [row({ refusals: [], admissibility: { considered: true, refusals: [] } })] },
        roundsItems: { runs: [] },
      }));
      assert.equal(distance.state, DISTANCE_STATES.UNKNOWN);
      assert.equal(distance.count, null);
      assert.equal(distance.clear, false);
      assert.equal(distance.unknown[0].input, "run-record corpus");
      assert.equal(distance.unknown[0].reason, "run-record-corpus-malformed");
      assert.equal(distance.unknown[0].reading.examined, null);
    },
  },
  {
    name: "tune distance 62/03 task 04 — an uncomputable change remains emitted with its cause",
    run: () => {
      const proposal = advisory({ reason: { code: "replacement-not-computable", target: "prompt.md" } });
      const [emitted] = attachProposalDistances([proposal], context());
      assert.equal(emitted.distance.standing.some((entry) => entry.code === "replacement-not-computable"), true);
      assert.equal(emitted.distance.clear, false);
    },
  },
];
