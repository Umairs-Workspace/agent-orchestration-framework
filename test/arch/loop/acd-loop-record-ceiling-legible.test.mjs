import assert from "node:assert/strict";
import { projectExecution } from "../../../src/loop-record.mjs";
import { renderExecutionDocument } from "../../../src/loop-record-render.mjs";

// FF-7806 — DECLARED-CEILING STATES ARE DISTINGUISHABLE IN THE RENDERED RECORD. `SPEC.md` states the
// requirement and the failure in one line: "a `ceiling: uncapped` loop and a capped one must not
// produce identical records; today they do." ADR-004 keeps the three non-numeric ceilings apart
// because they have three different remedies — `none` terminates by construction, `unknown` means
// nobody has said, `uncapped` is deliberately unbounded — and collapsing them to "no limit" would
// be the record we already have.
//
// Asserted over the RENDERED BYTES, not over the model. The model's states being distinct is
// 78/00's contract; this is the one that matters to a reader, and it is the one that can regress
// silently when a renderer folds two branches together.

const CAP_KEY = "work.autonomous.maxAttempts";

const ceilingField = (declared) => (
  ["none", "unknown", "uncapped"].includes(declared)
    ? [{ key: "ceiling", raw: declared, kind: declared }]
    : [{ key: "ceiling", raw: `config:${CAP_KEY}`, kind: "pointer", pointer: { scheme: "config", operand: CAP_KEY } }]
);

const registryFor = (declared) => [{
  id: "loop:the-loop",
  kind: "loop",
  title: "The loop",
  path: ".aof/loops/the-loop.md",
  fields: { ceiling: ceilingField(declared) },
  edges: {},
}];

// One set of observed facts, rendered under each declared ceiling in turn. Identical in every way
// EXCEPT the declaration, which is precisely the pair the requirement is about.
const runs = Array.from({ length: 4 }, (unused, index) => ({
  runId: `lr-1-000${index}`,
  itemRef: "78/01",
  state: "running",
  attempt: 1,
  outcome: null,
  sessionId: null,
  brief: {
    loop: {
      loopRunId: "lr-1",
      id: "loop:the-loop",
      scope: "78",
      level: "L1",
      cap: 3,
      phase: "continue",
      cycle: index + 1,
      startedAt: "2026-09-01T00:00:00.000Z",
    },
  },
  createdAt: `2026-09-01T00:0${index}:00.000Z`,
  updatedAt: `2026-09-01T00:0${index}:00.000Z`,
  failureReason: null,
  heartbeatAt: null,
  retryOf: null,
  reclaimedAt: null,
  node: "test-node",
}));

const renderUnder = (declared) => {
  const registry = registryFor(declared);
  const model = projectExecution({ registry, runs, config: { work: { autonomous: { maxAttempts: 6 } } } });
  return renderExecutionDocument({ model, registry, ref: "78/01" });
};

const DECLARATIONS = ["bounded", "none", "unknown", "uncapped"];

export const archTests = [
  {
    name: "arch/78 FF-7806: a capped loop and an uncapped, unknown or none loop never render identically",
    run: () => {
      const rendered = new Map(DECLARATIONS.map((declared) => [declared, renderUnder(declared)]));
      for (const [declared, text] of rendered) {
        assert.ok(text.length > 0, `${declared} renders something`);
      }
      // PAIRWISE, not merely "all four differ from the capped one": the value of ADR-004 is that
      // `none`, `unknown` and `uncapped` are distinguishable FROM EACH OTHER, which a gate that
      // only compared each against the capped rendering would not catch.
      for (const left of DECLARATIONS) {
        for (const right of DECLARATIONS) {
          if (left === right) continue;
          assert.notEqual(
            rendered.get(left),
            rendered.get(right),
            `a ceiling declared ${left} renders the same bytes as one declared ${right}`,
          );
        }
      }
    },
  },
  {
    name: "arch/78 FF-7806: each non-numeric ceiling names its own remedy rather than a shared no-limit word",
    run: () => {
      assert.match(renderUnder("none"), /ceiling `none` — terminates by construction/);
      assert.match(renderUnder("unknown"), /ceiling `unknown` — nothing has declared one/);
      assert.match(renderUnder("uncapped"), /ceiling `uncapped` — deliberately unbounded/);
      for (const declared of ["none", "unknown", "uncapped"]) {
        assert.ok(!renderUnder(declared).includes("no limit"),
          `${declared} is not collapsed into a shared "no limit" phrase`);
      }
    },
  },
  {
    name: "arch/78 FF-7806: a numeric bound renders the observed cycles against it, and says when it was exceeded",
    run: () => {
      const within = renderUnder("bounded");
      assert.match(within, /4 cycles against a declared ceiling of 6/);
      assert.ok(!within.includes("over the bound"), "4 of 6 is within the bound and does not claim otherwise");
      // The record states what was declared and what was observed; it never asserts that the bound
      // was RESPECTED — that judgement stays with the reader and the signature (ADR-004).
      assert.ok(!/\b(?:respected|violated|breach)\b/i.test(within), "the record passes no judgement on the bound");
    },
  },
];
