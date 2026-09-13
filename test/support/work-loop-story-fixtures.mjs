const freezePlain = (value) => {
  if (Array.isArray(value)) {
    value.forEach(freezePlain);
    return Object.freeze(value);
  }
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freezePlain);
    return Object.freeze(value);
  }
  return value;
};

export const WORK_LOOP_STORY_FIXTURE_FAMILIES = Object.freeze([
  "scope-guard",
  "level-ladder",
  "phase-map",
  "stop-set",
  "gate-order",
  "declaration",
]);

export const WORK_LOOP_STORY_FIXTURES = freezePlain([
  {
    family: "scope-guard",
    name: "an admitted range is preserved verbatim",
    fn: "decideLoopScope",
    args: ["50-53"],
    expected: { admitted: true, form: "range", scope: "50-53" },
  },
  {
    family: "scope-guard",
    name: "a story ref is a coded scope refusal",
    fn: "decideLoopScope",
    args: ["53/01"],
    expected: {
      code: "loop-scope-unsupported",
      scope: "53/01",
      admits: [
        { id: "driver", example: "53" },
        { id: "range", example: "50-53" },
      ],
      reason: "scope matched neither admitted loop scope form",
      alternative: "aof work drive <phase> <ref>",
    },
  },
  {
    family: "level-ladder",
    name: "an absent level resolves to L2",
    fn: "resolveLoopLevel",
    args: [],
    expected: { admitted: true, level: "L2" },
  },
  {
    family: "level-ladder",
    name: "L3 is part of the executable ladder",
    fn: "resolveLoopLevel",
    args: ["L3"],
    expected: { admitted: true, level: "L3" },
  },
  {
    family: "phase-map",
    name: "a milestone with no stories drives refine",
    fn: "decideLoopAction",
    args: [{ next: { state: "ready", ref: "53", type: "milestone" }, stories: { total: 0 }, cap: 3 }],
    expected: { act: "drive", ref: "53", phase: "refine", cycle: 1 },
  },
  {
    family: "phase-map",
    name: "a story with tasks drives continue",
    fn: "decideLoopAction",
    args: [{
      next: { state: "ready", ref: "53/01", type: "story" },
      tasks: { tasks: [{ counts: { uat: 0 } }] },
      cap: 3,
    }],
    expected: { act: "drive", ref: "53/01", phase: "continue", cycle: 1 },
  },
  {
    family: "stop-set",
    name: "SIGTERM reports the launcher producer",
    fn: "decideLoopAction",
    args: [{ signal: "SIGTERM", next: { ref: "53/01" } }],
    expected: { act: "halt", stop: "operator-interrupt", producer: "launcher:signal=SIGTERM", ref: "53/01" },
  },
  {
    family: "stop-set",
    name: "a pending session question carries its observable identity",
    fn: "decideLoopAction",
    args: [{
      next: { state: "ready", ref: "53/01", type: "story" },
      phase: "continue",
      session: { outcome: "needs-input", sessionId: "sess-9f2" },
    }],
    expected: {
      act: "halt",
      stop: "session-needs-input",
      producer: "session-driver:outcome=needs-input",
      ref: "53/01",
      phase: "continue",
      sessionId: "sess-9f2",
    },
  },
  {
    family: "gate-order",
    name: "a red gate below cap increments continue",
    fn: "decideLoopAction",
    args: [{
      next: { state: "ready", ref: "53/01", type: "story" },
      tasks: { tasks: [{ counts: { uat: 0 } }] },
      gate: { findings: [{ code: "red-a" }] },
      cycle: 1,
      cap: 3,
    }],
    expected: { act: "drive", ref: "53/01", phase: "continue", cycle: 2, findings: [{ code: "red-a" }] },
  },
  {
    family: "gate-order",
    name: "a clean gate starts the verify phase even above the spent continue cap",
    fn: "decideLoopAction",
    args: [{
      next: { state: "ready", ref: "53/01", type: "story" },
      tasks: { tasks: [{ counts: { uat: 0 } }] },
      gate: { findings: [] },
      cycle: 4,
      cap: 3,
    }],
    expected: { act: "drive", ref: "53/01", phase: "verify", cycle: 1 },
  },
  {
    family: "declaration",
    // 102/00 — the envelope is EIGHT keys: 53's seven in their original order and meanings,
    // and the loop id appended last. The seven values below are byte-identical to what this
    // fixture asserted before the eighth key existed, which is the additive claim made
    // executable rather than argued.
    // 126/02 — and the NINTH, `supervised`, appended last by the same discipline. The eight
    // before it keep their values byte-identical, which is the additive claim made executable.
    name: "the declaration carries the seven-key envelope, the appended loop id and the supervision key",
    fn: "buildLoopDeclaration",
    args: [{
      loopRunId: "lr-7",
      scope: "53",
      level: "L2",
      cap: 3,
      phase: "continue",
      cycle: 2,
      startedAt: "2026-08-15T00:52:42.569Z",
      id: "loop:autonomous-cascade",
    }],
    expected: {
      loopRunId: "lr-7",
      scope: "53",
      level: "L2",
      cap: 3,
      phase: "continue",
      cycle: 2,
      startedAt: "2026-08-15T00:52:42.569Z",
      id: "loop:autonomous-cascade",
      supervised: false,
    },
  },
  {
    family: "declaration",
    name: "no prior declaration is observable with ordinary L2 resolution",
    fn: "resolveLoopResume",
    args: [{ scope: "53", runs: [], cap: 3 }],
    expected: {
      resumed: false,
      supervised: false,
      loopRunId: null,
      scope: "53",
      priorScope: null,
      level: "L2",
      cap: 3,
      startedAt: null,
      source: { level: "default", cap: "overridden" },
      lastDeclaration: null,
      message: "No prior loop declaration exists for scope 53.",
    },
  },
]);

export function workLoopStoryFixturesFor(family) {
  return WORK_LOOP_STORY_FIXTURES.filter((fixture) => fixture.family === family);
}
