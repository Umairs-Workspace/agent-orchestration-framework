// milestone 49 / story 02 / task 01 — THE SOCKET-CAP ARBITER (@executable).
//
// Every scenario and every Examples ROW of
// `.../02_story_home-core/tasks/01_the-socket-cap-arbiter.feature`, driven against the SHIPPED
// `ui/src/home/socket-cap.mjs` and — for the gate lanes — against the SHIPPED violations
// function exported by `test/arch/ui/acd-home-socket-cap-single-arbiter.test.mjs`.
//
// EVERY PLANT IS SYNTHESIZED SOURCE TEXT handed to that shipped detector. Never by editing a
// real file, never by string-replacing one on disk, and never against a local re-implementation
// — m46's mutation review found exactly that in `affordanceFormViolations`, so the shipped
// detector was never once driven to a violation. Each plant asserts it LANDED before the
// detector is asked, and the CLEAN pair is shown quiet in the same lane.
//
// ISOLATION. The arbiter is pure and the detector reads text. No store, no server, no socket, no
// port — nothing here binds anything.
import assert from "node:assert/strict";
import {
  HELD_AT_CAP,
  HELD_HIDDEN,
  MAX_LIVE_PANES,
  RECOVERY_HIDE_ONE,
  RELEASED_CAP_LOWERED,
  RELEASED_LEFT_INDEX,
  effectiveCap,
  paneKeyOf,
  paneTuple,
  subscribedPaneSet,
} from "../../ui/src/home/socket-cap.mjs";
import { socketCapViolations } from "../arch/ui/acd-home-socket-cap-single-arbiter.test.mjs";
import { UNAVAILABLE_CAUSES, FAILURE_CAUSES } from "../../ui/src/terminal/state-ramp.mjs";

const rows = (count, prefix = "s") =>
  Array.from({ length: count }, (_unused, index) => ({
    nodeId: `worker-${Math.floor(index / 8) + 1}`,
    sessionId: `${prefix}-${String(index).padStart(3, "0")}`,
    repo: "demo",
    lastPingAt: "2026-08-13T00:00:00.000Z",
    workItem: index % 3 === 0 ? { ref: "49/02", assignmentId: `a-${index}` } : null,
  }));
const tupleOf = (row) => ({ nodeId: row.nodeId, sessionId: row.sessionId });
const key = (entry) => `${entry.nodeId}/${entry.sessionId}`;
const snapshot = (value) => JSON.stringify(value);

// ── THE CAP MATRIX ────────────────────────────────────────────────────────────────────────
const CAP_MATRIX = [
  // the boundary around the configured number
  ["an empty grid", 0, 16, 0],
  ["one row, room to spare", 1, 16, 1],
  ["one under the cap", 15, 16, 15],
  ["exactly at the cap", 16, 16, 16],
  ["one over the cap", 17, 16, 16],
  ["four full rotations of the cap", 64, 16, 16],
  ["the mirror's whole tail budget", 65, 16, 16],
  // the cap is an argument, so the degenerate values are reachable and must answer
  ["a cap of zero", 5, 0, 0],
  ["a cap of one", 5, 1, 1],
  ["a cap of one, one row", 1, 1, 1],
  ["a cap of one, no rows", 0, 1, 0],
  ["a cap smaller than the shipped", 20, 4, 4],
  ["a cap larger than the shipped", 20, 40, 20],
  // a malformed cap fails CLOSED — an unreadable ceiling is not an absent one
  ["a negative cap", 5, -1, 0],
  ["a fractional cap", 5, 2.5, 2],
  ["a numeric string", 5, "4", 0],
  ["NaN", 5, Number.NaN, 0],
  ["Infinity", 5, Number.POSITIVE_INFINITY, 0],
  ["absent entirely", 5, undefined, 0],
  ["null", 5, null, 0],
];

// ── THE NO-DEMOTE DELTAS ─────────────────────────────────────────────────────────────────
const arrival = (sessionId) => ({ nodeId: "worker-0", sessionId, repo: "demo", workItem: null });
const NO_DEMOTE_DELTAS = [
  ["a new session sorts above every incumbent", (first) => [arrival("aaa-first"), ...first]],
  ["a new session sorts below every incumbent", (first) => [...first, arrival("zzz-last")]],
  [
    "ten new sessions arrive at once",
    (first) => {
      const next = [...first];
      for (let index = 0; index < 10; index += 1) next.splice(index * 2, 0, arrival(`new-${index}`));
      return next;
    },
  ],
  ["a session's work item appears", (first) => first.map((row, index) => (index === 3 ? { ...row, workItem: { ref: "49/02", assignmentId: "a-x" } } : row))],
  ["a session's work item disappears", (first) => first.map((row, index) => (index === 0 ? { ...row, workItem: null } : row))],
  ["a session's ping time moves", (first) => first.map((row) => ({ ...row, lastPingAt: "2026-08-13T09:99:00.000Z" }))],
  ["the rows are handed in a different order", (first) => [...first].reverse()],
  ["a row leaves and a row arrives", (first) => [...first.slice(1), arrival("replacement")]],
];

// ── THE MALFORMED ROWS ───────────────────────────────────────────────────────────────────
//
// Task 00 drives nine malformed ROW shapes exhaustively; this file drove twenty malformed CAPS
// and, until now, zero malformed rows — `rows(n)` is well-formed everywhere, including inside the
// totality lane. That left the headline's "nothing was dropped, filtered or hidden" and the
// totality lane's "never invents a pane" both ONE-DIRECTIONAL: they check that every returned
// decision belongs to a handed row, and never that every handed row got a decision. Dropping the
// unaddressable rows inside the arbiter (`identified.filter((cell) => cell.key != null)`) survived
// the whole suite — and a pane silently missing from a grid of sixteen is the definition of
// "silent on screen".
const throwingSessionIdRow = () => {
  const cell = { nodeId: "worker-1", repo: "demo" };
  Object.defineProperty(cell, "sessionId", {
    enumerable: true,
    get() {
      throw new Error("this getter throws when read");
    },
  });
  return cell;
};

// [label, build, addressable] — `addressable` is what the ROW is, not what the arbiter says.
const MALFORMED_ROWS = [
  ["a row that is null", () => null, false],
  ["a row that is a string", () => "worker-1/sess-A", false],
  ["a row that is an ARRAY of the two ids", () => ["worker-1", "sess-A"], false],
  ["a row with no `nodeId`", () => ({ sessionId: "sess-A", repo: "demo" }), false],
  ["a row with no `sessionId`", () => ({ nodeId: "worker-1", repo: "demo" }), false],
  ["a row with a blank `sessionId`", () => ({ nodeId: "worker-1", sessionId: "   ", repo: "demo" }), false],
  ["a row whose `sessionId` getter throws when read", throwingSessionIdRow, false],
  ["a FROZEN row", () => Object.freeze({ nodeId: "worker-9", sessionId: "sess-FROZEN", repo: "demo" }), true],
];

// JSON-safe malformed shapes, for the totality lane's snapshot comparison — plus a DUPLICATE of
// the first row, which is the shape that tells `subscribed` counts PANES from `subscribed` counts
// ROWS. Two rows naming one tuple are ONE socket, so a per-row spelling reports two and breaks I1
// on an input this function is required to answer.
const MALFORMED_MIX = [null, "sess-A", { nodeId: "worker-9" }, { nodeId: "worker-9", sessionId: "  " }];
const interleaveMalformed = (base) => {
  if (base.length === 0) return [...MALFORMED_MIX];
  const mixed = base.flatMap((row, index) => (index % 4 === 0 ? [MALFORMED_MIX[(index / 4) % MALFORMED_MIX.length], row] : [row]));
  return [...mixed, { ...base[0] }];
};

// The addressability rule, RE-DERIVED here on purpose: a property whose expected set is computed
// by the module under test is a property that cannot fail.
const keyOfRow = (row) => {
  if (row == null || typeof row !== "object" || Array.isArray(row)) return null;
  const nodeId = typeof row.nodeId === "string" && row.nodeId.trim() !== "" ? row.nodeId : null;
  const sessionId = typeof row.sessionId === "string" && row.sessionId.trim() !== "" ? row.sessionId : null;
  return nodeId != null && sessionId != null ? `${nodeId}/${sessionId}` : null;
};

// ── THE SYNTHESIZED CLEAN PAIR, and every plant is a hand-written variant of it ───────────
const CLEAN_CLIENT = [
  "// The live-socket ceiling. The number is argued from the mirror's synchronous replay burst,",
  "// from its MAX_TAIL_KEYS tail budget, and from DOM-renderer main-thread contention.",
  "// The platform is NOT the wall and this number is not derived from one.",
  "export const MAX_LIVE_PANES = 16;",
  "",
  "export function subscribedPaneSet(rows, cap, intents, currentlySubscribed) {",
  "  return { cap, rows, intents, currentlySubscribed, decisions: [], subscribed: [] };",
  "}",
].join("\n");
const CLEAN_MIRROR = [
  "export const MAX_TAIL_BYTES_PER_KEY = 256 * 1024;",
  "export const MAX_TAIL_KEYS = 64;",
].join("\n");
const cleanPair = () => ({ files: [{ path: "ui/src/home/socket-cap.mjs", source: CLEAN_CLIENT }], mirror: CLEAN_MIRROR });

const PLANTS = [
  [
    "the cap rises past the mirror's tail budget",
    () => ({ files: [{ path: "ui/src/home/socket-cap.mjs", source: CLEAN_CLIENT.replace("MAX_LIVE_PANES = 16", "MAX_LIVE_PANES = 128") }], mirror: CLEAN_MIRROR }),
    [/MAX_TAIL_KEYS/, /milestone 49 \/ ADR-006/],
  ],
  [
    "the cap rises to exactly one over",
    () => ({ files: [{ path: "ui/src/home/socket-cap.mjs", source: CLEAN_CLIENT.replace("MAX_LIVE_PANES = 16", "MAX_LIVE_PANES = 65") }], mirror: CLEAN_MIRROR }),
    [/MAX_TAIL_KEYS/, /\b65\b/, /\b64\b/],
  ],
  [
    // THE ROW THAT PROVES THE GATE IS A TIE AT ALL. Every other plant fires just as well
    // against a detector that hard-codes 64 on the client side — which would be a gate that
    // reads ONE build and believes it read two. Lowering the NODE side while the client stays
    // legal is the only plant that distinguishes them.
    "the MIRROR's budget is lowered instead",
    () => ({ files: [{ path: "ui/src/home/socket-cap.mjs", source: CLEAN_CLIENT }], mirror: CLEAN_MIRROR.replace("MAX_TAIL_KEYS = 64", "MAX_TAIL_KEYS = 8") }),
    [/MAX_LIVE_PANES/, /\b8\b/],
  ],
  [
    "the client constant is deleted",
    () => ({ files: [{ path: "ui/src/home/socket-cap.mjs", source: CLEAN_CLIENT.replace("export const MAX_LIVE_PANES = 16;\n", "") }], mirror: CLEAN_MIRROR }),
    [/CLIENT half could not be read/],
  ],
  [
    "the client constant is renamed",
    () => ({ files: [{ path: "ui/src/home/socket-cap.mjs", source: CLEAN_CLIENT.replace("MAX_LIVE_PANES = 16", "PANE_LIMIT = 16") }], mirror: CLEAN_MIRROR }),
    [/CLIENT half could not be read/],
  ],
  [
    "the mirror constant is deleted",
    () => ({ files: [{ path: "ui/src/home/socket-cap.mjs", source: CLEAN_CLIENT }], mirror: CLEAN_MIRROR.replace("export const MAX_TAIL_KEYS = 64;", "") }),
    [/NODE half could not be read/],
  ],
  [
    "a component holds the number",
    () => ({
      files: [
        { path: "ui/src/home/socket-cap.mjs", source: CLEAN_CLIENT },
        { path: "ui/src/home/Home.tsx", source: "export function Home({ rows }) {\n  return rows.slice(0, 16);\n}" },
      ],
      mirror: CLEAN_MIRROR,
    }),
    [/ui\/src\/home\/Home\.tsx/, /slice\(0, 16\)/],
  ],
  [
    "a second module declares a cap",
    () => ({
      files: [
        { path: "ui/src/home/socket-cap.mjs", source: CLEAN_CLIENT },
        { path: "ui/src/home/grid.mjs", source: "export const MAX_LIVE_PANES = 16;" },
      ],
      mirror: CLEAN_MIRROR,
    }),
    [/ui\/src\/home\/socket-cap\.mjs/, /ui\/src\/home\/grid\.mjs/],
  ],
  [
    "the arbiter ignores its argument",
    () => ({
      files: [
        {
          path: "ui/src/home/socket-cap.mjs",
          source: CLEAN_CLIENT.replace(
            "export function subscribedPaneSet(rows, cap, intents, currentlySubscribed) {\n  return { cap, rows, intents, currentlySubscribed, decisions: [], subscribed: [] };",
            "export function subscribedPaneSet(rows, intents, currentlySubscribed) {\n  const cap = MAX_LIVE_PANES;\n  return { cap, rows, intents, currentlySubscribed, decisions: [], subscribed: [] };",
          ),
        },
      ],
      mirror: CLEAN_MIRROR,
    }),
    [/cap must be an ARGUMENT/],
  ],
  [
    "a second copy of the number",
    () => ({
      files: [
        {
          path: "ui/src/home/socket-cap.mjs",
          source: CLEAN_CLIENT.replace(
            "  return { cap, rows, intents, currentlySubscribed, decisions: [], subscribed: [] };",
            "  if (rows.length > 16) return { cap, rows: rows.slice(0, cap), intents, currentlySubscribed, decisions: [], subscribed: [] };\n  return { cap, rows, intents, currentlySubscribed, decisions: [], subscribed: [] };",
          ),
        },
      ],
      mirror: CLEAN_MIRROR,
    }),
    [/ui\/src\/home\/socket-cap\.mjs/, /length > 16/],
  ],
  // ── THE PO-NAMED CLAUSE, DRIVEN AS THE **TWO** INDEPENDENT CLAUSES IT IS ────────────────────
  // "The number may NOT be justified by a browser limit" is enforced by two clauses that do not
  // overlap: (i) the declaring module must NAME all three real justifications, and (ii) no comment
  // sentence may derive the number from a browser/per-origin limit without a negation. A single
  // plant that REPLACES the whole rationale block fires BOTH, so deleting either clause left all
  // 207 lanes green — and the assertion was only `/255/`, which both refusals carry. The two rows
  // below drive one clause each and assert that clause's OWN wording, never the shared number.
  //
  // CASE B IS HOW REAL DRIFT ARRIVES, and it is the row a build will not write for itself: nobody
  // deletes the ADR rationale, they ADD a sentence underneath it. `forbidden` is what makes each
  // row single-clause — it asserts the OTHER clause stayed quiet, so neither row can be satisfied
  // by the one it is not about.
  [
    "the rationale is REMOVED and no browser limit is mentioned at all",
    () => ({
      files: [
        {
          path: "ui/src/home/socket-cap.mjs",
          source: CLEAN_CLIENT.replace(
            [
              "// The live-socket ceiling. The number is argued from the mirror's synchronous replay burst,",
              "// from its MAX_TAIL_KEYS tail budget, and from DOM-renderer main-thread contention.",
              "// The platform is NOT the wall and this number is not derived from one.",
            ].join("\n"),
            "// The live-socket ceiling for the terminals home.",
          ),
        },
      ],
      mirror: CLEAN_MIRROR,
    }),
    [/does not name .*replay/, /MAX_TAIL_KEYS/, /main[- ]thread/],
    [/derives the number from a browser/],
  ],
  [
    "the rationale is INTACT and a browser-limit sentence is added underneath it",
    () => ({
      files: [
        {
          path: "ui/src/home/socket-cap.mjs",
          source: CLEAN_CLIENT.replace(
            "// The platform is NOT the wall and this number is not derived from one.",
            [
              "// The platform is NOT the wall and this number is not derived from one.",
              "// It also sits a comfortable margin under the browser's per-origin socket limit of 6.",
            ].join("\n"),
          ),
        },
      ],
      mirror: CLEAN_MIRROR,
    }),
    [/derives the number from a browser\/per-origin socket limit/, /per-origin socket limit of 6/, /255/],
    [/does not name/],
  ],

  // ── THE ARBITER'S OWN EXISTENCE FLOOR ───────────────────────────────────────────────────────
  // Every four-argument clause in the detector is scoped by FINDING `subscribedPaneSet`, so a
  // rename vacates all three at once and reports zero violations. These three rows are what stops
  // that being a silent edit — and the second is the one the suite never asked for: the detector
  // refuses a signature that keeps `cap` and DROPS `currentlySubscribed` correctly, and no lane
  // had ever driven it.
  [
    "the arbiter is RENAMED, which would vacate every clause scoped by its signature",
    () => ({
      files: [{ path: "ui/src/home/socket-cap.mjs", source: CLEAN_CLIENT.replace("export function subscribedPaneSet(", "export function paneSubscriptions(") }],
      mirror: CLEAN_MIRROR,
    }),
    [/ARBITER could not be found/, /vacate/, /amendment \(1\)/],
  ],
  [
    "the arbiter keeps its cap but DROPS the currently-subscribed set",
    () => ({
      files: [
        {
          path: "ui/src/home/socket-cap.mjs",
          source: CLEAN_CLIENT.replace(
            "export function subscribedPaneSet(rows, cap, intents, currentlySubscribed) {\n  return { cap, rows, intents, currentlySubscribed, decisions: [], subscribed: [] };",
            "export function subscribedPaneSet(rows, cap, intents) {\n  return { cap, rows, intents, decisions: [], subscribed: [] };",
          ),
        },
      ],
      mirror: CLEAN_MIRROR,
    }),
    [/CURRENTLY-SUBSCRIBED set as an argument/, /do not demote/],
    [/cap must be an ARGUMENT/],
  ],
  [
    "a second module declares an arbiter of its own",
    () => ({
      files: [
        { path: "ui/src/home/socket-cap.mjs", source: CLEAN_CLIENT },
        {
          path: "ui/src/home/grid.mjs",
          source: "export function subscribedPaneSet(rows, cap, intents, currentlySubscribed) {\n  return { cap, rows, intents, currentlySubscribed };\n}",
        },
      ],
      mirror: CLEAN_MIRROR,
    }),
    [/declared in MORE THAN ONE module/, /ui\/src\/home\/grid\.mjs/, /two answers/],
  ],

  // ── THE `.d.mts` SIBLING'S LITERAL TYPE IS CHECKED FOR AGREEMENT, NOT IGNORED ────────────────
  // The clause fired correctly from the day it was written and no plant had ever driven it, so
  // deleting it changed nothing. A declaration sibling is the one legitimate SECOND spelling of
  // the number, which is exactly what makes it the easiest place for the two to drift apart.
  [
    "the `.d.mts` sibling's literal type disagrees with the shipped constant",
    () => ({
      files: [
        { path: "ui/src/home/socket-cap.mjs", source: CLEAN_CLIENT },
        { path: "ui/src/home/socket-cap.d.mts", source: "export declare const MAX_LIVE_PANES: 8;\nexport declare function subscribedPaneSet(): unknown;\n" },
      ],
      mirror: CLEAN_MIRROR,
    }),
    [/socket-cap\.d\.mts/, /declares `MAX_LIVE_PANES` as 8 while the shipped constant is 16/, /two numbers for one ceiling/],
  ],
];

export const homeSocketCapArbiterTests = [
  // ══ Scenario: twenty rows and a cap of sixteen
  {
    name: "49/02 task01 — twenty rows and a cap of sixteen: ONE call decides, every row is still there, the four held rows name the cap, and the order is the handed order",
    run: async () => {
      const handed = rows(20);
      const before = snapshot(handed);
      const result = subscribedPaneSet(handed, 16, {}, []);

      assert.equal(result.subscribed.length, 16, "the subscribed set has exactly 16 members");
      assert.equal(result.decisions.length, 20, "the arbiter returned a decision for all 20 rows — nothing was dropped, filtered or hidden");
      const held = result.decisions.filter((decision) => !decision.subscribed);
      assert.equal(held.length, 4);
      for (const decision of held) {
        assert.equal(decision.subscribed, false);
        assert.equal(decision.cause, HELD_AT_CAP, "…and they name the cap as their cause");
      }
      assert.deepEqual(
        result.decisions.map((decision) => decision.sessionId),
        handed.map((row) => row.sessionId),
        "the returned decisions are in the same order as the rows handed in — the arbiter decides subscription and re-orders nothing",
      );

      const again = subscribedPaneSet(handed, 16, {}, []);
      assert.deepEqual(again, result, "a second call with identical arguments returns a deep-equal answer");
      assert.notEqual(again, result, "…that is not the same object identity");
      assert.equal(snapshot(handed), before, "and the row array it was handed is untouched");
    },
  },

  // ══ Scenario Outline: the subscribed set is exactly min(cap, rows), at every cap
  ...CAP_MATRIX.map(([label, count, cap, expected]) => ({
    name: `49/02 task01 — min(cap, rows): ${label} — ${count} rows, cap ${String(cap)} -> ${expected} subscribed`,
    run: async () => {
      const handed = rows(count);
      let result;
      assert.doesNotThrow(() => {
        result = cap === undefined ? subscribedPaneSet(handed) : subscribedPaneSet(handed, cap, {}, []);
      }, "no error is thrown");
      assert.equal(result.subscribed.length, expected, "the subscribed set's size");
      assert.equal(result.decisions.length, count, "the number of decisions returned is the number of rows");
      assert.ok(result.subscribed.length <= effectiveCap(cap), "…and it never exceeds the cap it was handed, treating a malformed cap as zero");
    },
  })),

  // ══ Scenario: priority is focus, then explicit watches, then the handed order
  {
    name: "49/02 task01 — who gets the sockets is focus, then explicit watches, then the handed order — never arrival order, and the handed array is never sorted",
    run: async () => {
      const handed = rows(20);
      const focused = handed[18]; // 19th in the handed order
      const watched = [handed[11], handed[19]]; // 12th and 20th
      const before = snapshot(handed);
      const intents = { focused: tupleOf(focused), watched: watched.map(tupleOf) };

      const result = subscribedPaneSet(handed, 3, intents, []);
      assert.deepEqual(
        result.subscribed.map(key).sort(),
        [focused, ...watched].map(key).sort(),
        "the subscribed set is exactly the focused row and the two explicitly watched rows",
      );
      for (const row of handed.slice(0, 3)) {
        const decision = result.decisions.find((entry) => entry.sessionId === row.sessionId);
        assert.equal(decision.subscribed, false, "the first three rows in the handed order are NOT subscribed — an explicit intent outranks position");
      }

      const scrambled = [...handed].reverse();
      const rerun = subscribedPaneSet(scrambled, 3, intents, []);
      assert.deepEqual(rerun.subscribed.map(key).sort(), result.subscribed.map(key).sort(), "a deliberately scrambled array yields the same subscribed SET of tuples");
      assert.deepEqual(
        rerun.decisions.map((decision) => decision.sessionId),
        scrambled.map((row) => row.sessionId),
        "…and the decisions still follow the handed order exactly",
      );
      assert.equal(snapshot(handed), before, "the arbiter never sorted, mutated or copied-with-reordering the row array it was handed");
    },
  },

  // ══ Scenario Outline: an unsubscribed pane says why, and the two held cases are DIFFERENT
  ...[
    ["held because the grid is at its cap", () => ({ handed: rows(20), cap: 16, intents: {}, index: 16 }), HELD_AT_CAP, false],
    ["hidden by the operator, room to spare", () => ({ handed: rows(5), cap: 16, intents: { hidden: [tupleOf(rows(5)[2])] }, index: 2 }), HELD_HIDDEN, true],
    ["hidden by the operator, grid at cap", () => ({ handed: rows(20), cap: 16, intents: { hidden: [tupleOf(rows(20)[2])] }, index: 2 }), HELD_HIDDEN, false],
  ].map(([label, build, cause, slotFree]) => ({
    name: `49/02 task01 — an unsubscribed pane says why: ${label} -> cause \`${cause}\`, slot free: ${slotFree ? "yes" : "no"}`,
    run: async () => {
      const { handed, cap, intents, index } = build();
      const result = subscribedPaneSet(handed, cap, intents, []);
      const decision = result.decisions[index];

      assert.equal(decision.subscribed, false, "that row's decision carries `subscribed: false`");
      assert.equal(decision.cause, cause, "its stated cause");
      assert.equal(decision.slotFree, slotFree, "the decision reports whether a live slot is free");
      assert.equal(decision.cap, cap, "the decision carries the configured cap as a VALUE, so no render site types the number into its copy");

      // Nothing shaped like an error: DG-49-4 and DG-49-10 — that block means the ORIGIN could
      // not be resolved, which is false here and would send the operator after the wrong fault.
      const forbidden = ["failureCause", "unavailableCause", "recovery", "error", "message"];
      for (const field of forbidden) assert.ok(!(field in decision), `the decision carries no \`${field}\``);
      const causes = [...Object.values(UNAVAILABLE_CAUSES), ...Object.values(FAILURE_CAUSES)];
      assert.ok(!causes.includes(decision.cause), "…and its cause is not an `unavailable` or a failure cause");

      assert.equal(decision.sessionId, handed[index].sessionId, "the row is still present in the returned decisions, in its handed position, carrying its identity");
      assert.equal(decision.row, handed[index], "…by object identity — it is listed, not hidden, and not rebuilt");
    },
  })),

  // ══ Scenario Outline: a poll never takes a socket away from a pane still in the row set
  ...NO_DEMOTE_DELTAS.map(([label, delta]) => ({
    name: `49/02 task01 — nothing auto-demotes: ${label}`,
    run: async () => {
      const first = rows(16);
      const opening = subscribedPaneSet(first, 16, {}, []);
      assert.equal(opening.subscribed.length, 16, "the first poll subscribed all 16");

      const second = delta(first);
      const result = subscribedPaneSet(second, 16, {}, opening.subscribed);

      const stillListed = new Set(second.map(key));
      const shouldSurvive = opening.subscribed.map(key).filter((tuple) => stillListed.has(tuple));
      const nowSubscribed = new Set(result.subscribed.map(key));
      for (const tuple of shouldSurvive) {
        assert.ok(nowSubscribed.has(tuple), `${tuple} was subscribed in the first poll and is still in the row set, so it is STILL subscribed`);
      }
      // NOT `deepEqual(result.demoted, [])` — that field is gone, and it was gone-in-effect
      // before it was deleted: it returned a frozen literal, so it could not fail. The population
      // it claimed to name is `released` filtered on its own cause (ADR-006 amendment (5c)).
      assert.ok(!("demoted" in result), "there is no `demoted` field to read — a literal is not an observation");
      assert.deepEqual(
        result.released.filter((entry) => entry.cause === RELEASED_CAP_LOWERED),
        [],
        "nothing was unsubscribed by the arbiter's own choice — the cap did not move, so no incumbent was capped out",
      );
      for (const entry of result.released) {
        assert.equal(entry.cause, RELEASED_LEFT_INDEX, "…the only release is a row that LEFT the index, which is not a demotion because there is no session left to demote");
      }
      assert.ok(result.subscribed.length <= 16, `the subscribed set still has at most 16 members (${result.subscribed.length})`);
    },
  })),

  {
    name: "49/02 task01 — a slot that genuinely frees up goes to the newcomer: one incumbent leaves, one row arrives, and the arbiter fills the gap by priority",
    run: async () => {
      const first = rows(16);
      const opening = subscribedPaneSet(first, 16, {}, []);
      const second = [...first.slice(1), arrival("replacement")];
      const result = subscribedPaneSet(second, 16, {}, opening.subscribed);

      assert.equal(result.subscribed.length, 16, "the freed slot is filled");
      assert.ok(result.subscribed.map(key).includes("worker-0/replacement"), "…and it went to the newcomer");
      assert.deepEqual(
        result.released.map(key),
        [key(first[0])],
        "the departed incumbent appears in the result — no pane changes without appearing in it",
      );
    },
  },

  // ══ Scenario: watching a pane at the cap is never answered with a silent nothing
  {
    name: "49/02 task01 — watching a pane while the grid is at its cap is never a silent nothing: the cap holds, the request is DECLINED and the arbiter names the recovery",
    run: async () => {
      const handed = rows(20);
      const opening = subscribedPaneSet(handed, 16, {}, []);
      assert.equal(opening.subscribed.length, 16);

      const overCap = handed[17];
      const result = subscribedPaneSet(handed, 16, { watched: [tupleOf(overCap)] }, opening.subscribed);

      assert.ok(result.subscribed.length <= 16, "the cap is never exceeded, whatever the operator asks for");
      // PER THE PO'S RULING OF 2026-08-13, DESIGN DG-49-4 WINS OVER ADR-006's superseded
      // eviction clause: there is NO auto-demotion, so the second branch of the scenario is the
      // one this build takes — the request is declined and the recovery is named.
      assert.deepEqual(
        result.released.filter((entry) => entry.cause === RELEASED_CAP_LOWERED),
        [],
        "no pane was evicted to make room — and this is read off the ONE population that knows, not off a field that is empty by construction",
      );
      assert.equal(result.declined.length, 1, "the answer is not silence");
      assert.equal(key(result.declined[0]), key(overCap), "…it names the row it declined");
      assert.equal(result.declined[0].recovery, RECOVERY_HIDE_ONE, "…and the recovery the operator can take");
      assert.equal(result.declined[0].cap, 16, "…with the cap as a VALUE, never typed into copy");
      assert.deepEqual(result.released, [], "in neither case does any pane change without appearing in the result");
      assert.deepEqual(result.subscribed.map(key).sort(), opening.subscribed.map(key).sort(), "…and nothing changed at all");
    },
  },

  // ══ Scenario Outline: a malformed row still gets a decision, in its handed position, and the
  //    arbiter never invents a reason it was held
  ...MALFORMED_ROWS.map(([label, build, addressable]) => ({
    name: `49/02 task01 — a malformed row is DECIDED, never dropped: ${label}`,
    run: async () => {
      const [first, last] = rows(2);
      const malformed = build();
      const handed = [first, malformed, last];

      const result = subscribedPaneSet(handed, 16, {}, []);

      // THE DROP TEST. `identified.filter((cell) => cell.key != null)` inside the arbiter is a
      // one-word edit that removes a pane from a grid of sixteen and passes every other lane.
      assert.equal(result.decisions.length, 3, "a decision came back for EVERY handed row — nothing was dropped, filtered or hidden");
      assert.equal(result.decisions[0].row, first, "…the first row is in its handed position");
      assert.equal(result.decisions[1].row, malformed, "…the malformed row is in ITS handed position, by identity");
      assert.equal(result.decisions[2].row, last, "…and the last row is in its handed position");
      assert.equal(result.decisions[0].subscribed, true, "the well-formed rows around it are unaffected — one bad row never poisons its neighbours");
      assert.equal(result.decisions[2].subscribed, true);

      const decision = result.decisions[1];
      assert.equal(result.slotFree, true, "there are 16 slots and at most 3 panes, so a slot is free");
      if (addressable) {
        assert.equal(decision.subscribed, true, "a frozen row is perfectly addressable — the arbiter reads it, it does not write to it");
        assert.equal(decision.cause, null, "…and a watching pane has no hold cause");
        return;
      }

      // A ROW THAT CANNOT BE ADDRESSED IS NOT A PANE (ADR-002), so it holds no socket — and the
      // arbiter may not INVENT a reason for that. `at-cap` here is a fabrication with a cost:
      // DG-49-4 renders it as `<N> live panes already · hide one to watch this`, which sends the
      // operator to hide a live pane to make room for a row that can never take the slot.
      assert.equal(decision.subscribed, false, "an unaddressable row holds no socket");
      assert.notEqual(decision.cause, HELD_AT_CAP, "…and it is NOT held by the cap — 3 rows, a cap of 16, and a free slot");
      assert.equal(decision.cause, null, "…the cause is `null`: a fact nobody stated cannot win a comparison");
      assert.equal(decision.nodeId, null, "…it carries no fabricated identity");
      assert.equal(decision.sessionId, null);
      assert.equal(decision.cap, 16, "…and it still carries the cap as a VALUE, like every other decision");
      assert.deepEqual(
        result.subscribed.filter((entry) => entry.nodeId == null || entry.sessionId == null),
        [],
        "…and it never reaches the subscribed set as a half-identified tuple",
      );
    },
  })),

  {
    name: "49/02 task01 — two rows naming the SAME tuple are ONE pane: both are decided, in their handed positions, with the SAME answer, and the distinct subscribed tuples never exceed the cap",
    run: async () => {
      const twin = { nodeId: "worker-1", sessionId: "sess-TWIN", repo: "demo" };
      const other = { nodeId: "worker-1", sessionId: "sess-TWIN", repo: "moved" };
      const handed = [twin, other, ...rows(2)];

      const result = subscribedPaneSet(handed, 16, {}, []);
      assert.equal(result.decisions.length, 4, "every handed row got a decision, duplicate tuple and all");
      assert.equal(result.decisions[0].row, twin, "…in its handed position");
      assert.equal(result.decisions[1].row, other, "…including the twin, which is a DIFFERENT row object naming the same pane");
      assert.equal(
        result.decisions[0].subscribed,
        result.decisions[1].subscribed,
        "one pane has one answer — two rows keyed to the same tuple can never be told apart by a socket",
      );
      assert.equal(new Set(result.subscribed.map(key)).size <= result.cap, true, "the distinct subscribed tuples are within the cap");
      assert.equal(
        result.subscribed.filter((entry) => key(entry) === key(twin)).length,
        1,
        "…and `subscribed` names that pane ONCE: it counts SOCKETS, not rows",
      );

      // I1 IS A BOUND ON SOCKETS, so it has to hold when two rows name one pane. At a cap of 1 a
      // per-row spelling reports two subscriptions against a ceiling of one — and I1 is the
      // obligation the mirror's 64-tuple tail budget actually buys, so it wins every collision.
      const atOne = subscribedPaneSet([twin, other], 1, {}, []);
      assert.equal(atOne.subscribed.length, 1, "one pane, one socket, one entry — at a cap of one");
      assert.equal(atOne.decisions.length, 2, "…and both rows still get their own decision");
      assert.equal(atOne.decisions[0].subscribed, true);
      assert.equal(atOne.decisions[1].subscribed, true, "…both true, because it is the same socket");

      const held = subscribedPaneSet(handed, 16, { hidden: [tupleOf(twin)] }, []);
      assert.equal(held.decisions[0].cause, HELD_HIDDEN, "hiding the pane hides it");
      assert.equal(held.decisions[1].cause, HELD_HIDDEN, "…and it is the same pane, so the twin says the same thing");
    },
  },

  // ══ A CALLER-SHRUNK CAP IS A RELEASE, IT IS ATTRIBUTED, AND `demoted` IS GONE ─────────────
  //    (QA F-49-02-c; ADR-006 AMENDMENT (5), 2026-08-13.) The shipped answer used to be
  //    `subscribed: 4, demoted: [], released: 12 × "hidden"` — twelve live panes losing their
  //    socket, each labelled as something the operator did, in the same frozen object as a field
  //    claiming nothing had been demoted. Both halves were wrong and neither could tell, because
  //    only one of them was computed.
  ...[
    ["the caller lowers the cap to a quarter", 4, 4, 12],
    ["the caller lowers it to one", 1, 1, 15],
    ["the caller lowers it to zero", 0, 0, 16],
    ["a malformed cap fails closed to zero — the SAME shape, reachable from any caller", null, 0, 16],
    ["a fractional cap truncates", 4.9, 4, 12],
    ["the cap does not move", 16, 16, 0],
    ["the caller RAISES the cap", 40, 16, 0],
  ].map(([label, nextCap, expectedSubscribed, expectedReleased]) => ({
    name: `49/02 task01 — a shrunk cap RELEASES incumbents and says the CALLER did it: ${label} -> ${expectedSubscribed} subscribed, ${expectedReleased} released as \`cap-lowered\``,
    run: async () => {
      const first = rows(16);
      const opening = subscribedPaneSet(first, 16, {}, []);
      assert.equal(opening.subscribed.length, 16, "sixteen incumbents hold sixteen sockets");

      const result = nextCap === null ? subscribedPaneSet(first, null, {}, opening.subscribed) : subscribedPaneSet(first, nextCap, {}, opening.subscribed);

      assert.equal(result.cap, effectiveCap(nextCap), "the answer carries the effective cap the CALLER handed in, malformed values failing closed to zero");
      assert.equal(result.subscribed.length, expectedSubscribed, "I1/I2: exactly `min(|retainable|, limit)` incumbents keep a socket");
      assert.ok(!("demoted" in result), "there is no `demoted` field — it was DELETED, not corrected (amendment (5c))");

      const capped = result.released.filter((entry) => entry.cause === RELEASED_CAP_LOWERED);
      assert.equal(capped.length, expectedReleased, "every incumbent that lost its socket to the ceiling is named, with its OWN cause");
      assert.deepEqual(
        result.released.filter((entry) => entry.cause === HELD_HIDDEN),
        [],
        "…and NONE of them is labelled `hidden`: the operator hid nothing, and a cause is a claim about an ACTOR",
      );
      assert.deepEqual(
        result.released.filter((entry) => entry.cause === RELEASED_LEFT_INDEX),
        [],
        "…nor `left-the-index`: every row is still in the index, which is exactly why this is a demotion",
      );

      // CONSERVATION, and it is half the invariant: `keys(released)` is EXACTLY
      // `incumbents \ result` — no more (a pane that kept its socket is never in it) and no fewer
      // (nothing loses a socket silently).
      const incumbents = opening.subscribed.map(key);
      const survived = new Set(result.subscribed.map(key));
      assert.deepEqual(
        result.released.map(key).sort(),
        incumbents.filter((entry) => !survived.has(entry)).sort(),
        "the released set is exactly the incumbents that are no longer subscribed",
      );
      for (const entry of result.released) {
        assert.ok(!("cap" in entry), "a released pane carries NO second copy of the cap — the arbitration already returns it at top level");
        assert.deepEqual(Object.keys(entry).sort(), ["cause", "nodeId", "sessionId"], "…and nothing else");
      }
    },
  })),

  {
    name: "49/02 task01 — I3: a shrink never takes the FOCUSED pane, and the survivors are ranked by the same priority order that fills free slots",
    run: async () => {
      const first = rows(16);
      const opening = subscribedPaneSet(first, 16, {}, []);
      const focused = first[11];
      const watched = first[14];

      const result = subscribedPaneSet(first, 2, { focused: tupleOf(focused), watched: [tupleOf(watched)] }, opening.subscribed);
      assert.equal(result.subscribed.length, 2, "the caller's ceiling holds");
      assert.deepEqual(
        result.subscribed.map(key).sort(),
        [key(focused), key(watched)].sort(),
        "the focused pane survives, then the explicit watch — the SAME ranking that fills a free slot decides who keeps a socket",
      );
      const capped = result.released.filter((entry) => entry.cause === RELEASED_CAP_LOWERED).map(key);
      assert.equal(capped.length, 14, "the other fourteen are released, and the ceiling is named as the reason");
      assert.ok(!capped.includes(key(focused)), "the operator's own focus is never what a shrink takes");
    },
  },

  {
    name: "49/02 task01 — the THREE release causes are exhaustive and mutually exclusive over one population: a hidden incumbent, a departed incumbent and a capped-out incumbent in ONE answer, each with its own cause",
    run: async () => {
      const first = rows(8);
      const opening = subscribedPaneSet(first, 8, {}, []);
      assert.equal(opening.subscribed.length, 8);

      // The delta: row 0 leaves the index, row 1 is hidden by the operator, the cap drops to 3.
      const second = first.slice(1);
      const result = subscribedPaneSet(second, 3, { hidden: [tupleOf(first[1])] }, opening.subscribed);

      const causeOf = new Map(result.released.map((entry) => [key(entry), entry.cause]));
      assert.equal(causeOf.get(key(first[0])), RELEASED_LEFT_INDEX, "the row the mesh stopped listing — not a demotion, there is no session left to demote");
      assert.equal(causeOf.get(key(first[1])), HELD_HIDDEN, "the row the operator hid — their own spend");
      assert.equal(result.subscribed.length, 3, "three sockets, as the caller asked");
      for (const entry of result.released) {
        assert.ok(
          [RELEASED_LEFT_INDEX, HELD_HIDDEN, RELEASED_CAP_LOWERED].includes(entry.cause),
          `the release-cause enumeration closes at three: ${entry.cause}`,
        );
      }
      assert.equal(result.released.filter((entry) => entry.cause === RELEASED_CAP_LOWERED).length, 3, "…and the remaining three lost their socket to the ceiling");
      assert.equal(result.released.length, 5, "conservation: eight incumbents, three survivors, five releases");

      // …and a pane may carry BOTH a release cause and a hold cause in one answer, deliberately
      // spelled differently: `cap-lowered` says what CHANGED, `at-cap` says what IS.
      const cappedOut = result.released.find((entry) => entry.cause === RELEASED_CAP_LOWERED);
      const decision = result.decisions.find((entry) => key(entry) === key(cappedOut));
      assert.equal(decision.subscribed, false);
      assert.equal(decision.cause, HELD_AT_CAP, "the DECISION says what is: it is not watching, because the grid is at its cap");
      assert.notEqual(decision.cause, cappedOut.cause, "…and the two strings are different on purpose — naming them alike is how a surface reports a change as a state");
    },
  },

  // ══ THE PANE KEY'S SEPARATOR, DRIVEN. Both modules DECLARE that the separator is a byte no id
  //    can carry, "so (\"a-b\",\"c\") and (\"a\",\"b-c\") are not the same pane … sixteen live sockets
  //    are keyed off this" — and changing both to `-` left every lane in this suite green. Real
  //    ids in this mesh are dash-bearing (`worker-1`, `aof-wsl`, `sess-A`), and the failure mode
  //    is two agents sharing one tile.
  {
    name: "49/02 task01 — the pane key's separator is a byte no id can carry: (\"a-b\",\"c\") and (\"a\",\"b-c\") are TWO panes that compete for one slot, and hiding one does not hide the other",
    run: async () => {
      const left = { nodeId: "a-b", sessionId: "c", repo: "demo" };
      const right = { nodeId: "a", sessionId: "b-c", repo: "demo" };
      const handed = [left, right];

      const separator = paneKeyOf({ nodeId: "a", sessionId: "b" }).slice(1, -1);
      assert.equal(separator.length, 1, "the key joins on exactly one character");
      assert.ok(
        separator.charCodeAt(0) < 32,
        `…and it is a control byte no id can carry — not a dash, a space, a slash or a dot: ${JSON.stringify(separator)}`,
      );
      assert.notEqual(paneKeyOf(paneTuple(left)), paneKeyOf(paneTuple(right)), "…so the two tuples key to two different panes");

      const atOne = subscribedPaneSet(handed, 1, {}, []);
      assert.equal(atOne.decisions.length, 2);
      assert.equal(atOne.subscribed.length, 1, "one slot, two panes: exactly one holds the socket — a dash separator would make them one key and subscribe BOTH");
      assert.equal(atOne.decisions[0].subscribed, true, "…and it is the first in the handed order");
      assert.equal(atOne.decisions[1].subscribed, false);
      assert.equal(atOne.decisions[1].cause, HELD_AT_CAP, "…held by the cap, which is true here");

      const hidden = subscribedPaneSet(handed, 16, { hidden: [{ nodeId: "a-b", sessionId: "c" }] }, []);
      assert.equal(hidden.decisions[0].subscribed, false, "the operator hid THAT pane");
      assert.equal(hidden.decisions[0].cause, HELD_HIDDEN);
      assert.equal(hidden.decisions[1].subscribed, true, "…and not the other one, which is a different agent on a different machine");
    },
  },

  // ══ Scenario: the arbiter is total, and never exceeds the cap on any input this file drives
  {
    name: "49/02 task01 — the arbiter is TOTAL over the whole matrix this file drives: no call throws, the cap is never exceeded, EVERY handed row gets a decision in its handed position, no pane is invented, no live incumbent is demoted, and nothing is mutated",
    run: async () => {
      let calls = 0;
      let retentionChecks = 0;
      let cappedReleases = 0;
      for (const [, count, cap] of CAP_MATRIX) {
        const base = rows(count);
        // BOTH SHAPES, so the properties below are driven over malformed rows too: `rows(n)` is
        // well-formed everywhere else in this file, which is precisely how a row-dropping arbiter
        // walked the whole matrix.
        for (const handed of [base, interleaveMalformed(base)]) {
          const intentShapes = [
            {},
            null,
            { focused: count > 0 ? tupleOf(base[count - 1]) : null },
            { watched: base.slice(0, Math.min(3, count)).map(tupleOf) },
            { hidden: base.slice(0, Math.min(2, count)).map(tupleOf) },
            { focused: "not-a-tuple", watched: "not-an-array", hidden: 7 },
          ];
          for (const intents of intentShapes) {
            for (const subscribed of [[], base.slice(0, Math.min(4, count)).map(tupleOf), null, "not-an-array"]) {
              const before = snapshot(handed);
              let result;
              assert.doesNotThrow(() => {
                result = subscribedPaneSet(handed, cap, intents, subscribed);
              }, `no call throws (${handed.length} rows, cap ${String(cap)})`);
              calls += 1;
              const limit = effectiveCap(cap);
              assert.ok(result.subscribed.length <= limit, `|subscribed| <= cap (${result.subscribed.length} <= ${limit})`);
              assert.equal(result.decisions.length, handed.length, "EVERY handed row got a decision — the other direction of 'never invents a pane', and the one a filter walks straight through");
              for (const [index, decision] of result.decisions.entries()) {
                assert.equal(decision.row, handed[index], "…each one in its handed position, by identity");
                assert.ok(handed.includes(decision.row), "each returned decision belongs to a row that was handed in — the arbiter never invents a pane");
                assert.ok(
                  decision.subscribed || decision.cause == null || decision.cause === HELD_AT_CAP || decision.cause === HELD_HIDDEN,
                  `a hold cause is one of the two DG-49-4 frames or nothing at all: ${JSON.stringify(decision.cause)}`,
                );
              }

              // ── ADR-006 AMENDMENT (5a): I2, I2′ AND CONSERVATION, DRIVEN OVER THE MATRIX ──
              // `demoted` used to stand for this and could not: it returned a frozen module
              // constant, so `deepEqual(result.demoted, [])` was the same object every time and
              // could not fail. Every set below is RE-DERIVED from the call's own arguments — a
              // property whose expected value comes from the function under test cannot fail
              // either. The superseded `result ⊇ incumbents ∩ live` is deliberately NOT asserted:
              // it is FALSE at any cap below the retained count, which is a state this function
              // is required to answer in (`effectiveCap(null) = 0`).
              const liveKeys = new Set(handed.map(keyOfRow).filter((entry) => entry != null));
              const hiddenKeys = new Set((Array.isArray(intents?.hidden) ? intents.hidden : []).map(key));
              const incumbents = [...new Set((Array.isArray(subscribed) ? subscribed : []).map(key))];
              const retainable = incumbents.filter((entry) => liveKeys.has(entry) && !hiddenKeys.has(entry));
              const now = new Set(result.subscribed.map(key));

              // I1, as a SET: `subscribed` counts sockets, so one pane named by two rows is one.
              assert.equal(now.size, result.subscribed.length, "the subscribed set holds one entry per PANE, never per row");

              // I2 — RETENTION. The cap is the ONLY thing that can cost an incumbent its socket.
              assert.equal(
                retainable.filter((entry) => now.has(entry)).length,
                Math.min(retainable.length, limit),
                `I2: |result ∩ retainable| = min(${retainable.length}, ${limit})`,
              );

              // I2′ — NO-AUTO-DEMOTE. No NON-incumbent holds a socket while a retainable
              // incumbent does not. This is the checkable form of "priority allocates free slots".
              const retainableSet = new Set(retainable);
              const strangers = [...now].filter((entry) => !retainableSet.has(entry));
              if (strangers.length > 0) {
                for (const entry of retainable) {
                  assert.ok(entry != null && now.has(entry), `I2′: a non-incumbent holds a socket while ${entry} — a live, un-hidden incumbent — does not`);
                }
              }

              // I3 — a shrink never takes the focused pane.
              const focusedKey = intents?.focused != null && typeof intents.focused === "object" ? key(intents.focused) : null;
              if (limit >= 1 && focusedKey != null && retainableSet.has(focusedKey)) {
                assert.ok(now.has(focusedKey), "I3: the focused pane survives a shrink");
              }

              // CONSERVATION — `keys(released)` is EXACTLY `incumbents \ result`, and every entry
              // carries exactly one cause, each of which holds its own BICONDITIONAL. A
              // fall-through would show up here as a cause whose precondition is false.
              assert.deepEqual(
                result.released.map(key).sort(),
                incumbents.filter((entry) => !now.has(entry)).sort(),
                "released is exactly `incumbents \\ result` — no more, no fewer",
              );
              for (const entry of result.released) {
                const entryKey = key(entry);
                const expectedCause = !liveKeys.has(entryKey)
                  ? RELEASED_LEFT_INDEX
                  : hiddenKeys.has(entryKey)
                    ? HELD_HIDDEN
                    : RELEASED_CAP_LOWERED;
                assert.equal(entry.cause, expectedCause, `the release cause is the one its precondition names, for ${entryKey}`);
                assert.equal(entry.cause === RELEASED_LEFT_INDEX, !liveKeys.has(entryKey), "`left-the-index` ⟺ the tuple is not in the handed rows");
                assert.equal(entry.cause === HELD_HIDDEN, liveKeys.has(entryKey) && hiddenKeys.has(entryKey), "`hidden` ⟺ live AND hidden by the operator");
                assert.equal(entry.cause === RELEASED_CAP_LOWERED, retainableSet.has(entryKey), "`cap-lowered` ⟺ retainable — the caller's ceiling is the only other actor");
                if (entry.cause === RELEASED_CAP_LOWERED) {
                  assert.ok(retainable.length > limit, "…and a cap-lowered release can only happen when the retained count is over the ceiling");
                  cappedReleases += 1;
                }
              }
              assert.ok(!("demoted" in result), "there is no `demoted` field: a literal can never be wrong, so it can never be right");
              if (retainable.length > 0) retentionChecks += 1;
              assert.equal(snapshot(handed), before, "the row array handed in is deep-equal to what it was before the call — the arbiter mutates nothing");
            }
          }
        }
      }
      assert.ok(calls >= 900, `the matrix was actually driven: ${calls} calls`);
      assert.ok(retentionChecks >= 100, `…and the retention property was driven with a NON-EMPTY retainable set ${retentionChecks} times, so it is not satisfied vacuously`);
      assert.ok(
        cappedReleases > 0,
        `…and the matrix really reached the cap-lowered branch ${cappedReleases} times — an attribution clause over a case the matrix never produces is a clause nothing drives`,
      );
    },
  },

  {
    name: "49/02 task01 — the shipped cap is a positive integer far below the mirror's 64-tuple tail budget, and it is exposed as a value rather than typed at a call site",
    run: async () => {
      assert.ok(Number.isInteger(MAX_LIVE_PANES) && MAX_LIVE_PANES > 0, `MAX_LIVE_PANES = ${MAX_LIVE_PANES}`);
      assert.ok(MAX_LIVE_PANES <= 64 / 4, "…and it leaves four full rotations before this grid's own churn can evict a tail it still cares about");
      assert.equal(subscribedPaneSet(rows(20), MAX_LIVE_PANES, {}, []).cap, MAX_LIVE_PANES, "the arbiter answers with the cap it was HANDED");
    },
  },

  // ══ Scenario: on the tree as it stands, the gate is quiet and provably read both builds
  {
    name: "49/02 task01 — the SHIPPED detector is quiet on the synthesized clean pair, and reports the two numbers it actually read",
    run: async () => {
      const { violations, report } = socketCapViolations(cleanPair());
      assert.deepEqual(violations, [], "the clean pair is quiet");
      assert.equal(report.clientCap, 16, "it reports the client cap it read");
      assert.equal(report.mirrorTailKeys, 64, "…and the mirror's MAX_TAIL_KEYS");
      assert.ok(report.clientCap > 0 && report.clientCap <= report.mirrorTailKeys, "the client cap is a positive integer no greater than the mirror number");
      assert.equal(report.capFedFromConstant, true, "…and every call site that supplies a cap supplies the declared constant");
    },
  },

  // ══ Scenario Outline: the gate FIRES — every plant is fed to the shipped detector
  ...PLANTS.map(([label, build, expectations, forbidden = []]) => ({
    name: `49/02 task01 — the gate FIRES: ${label}`,
    run: async () => {
      const clean = cleanPair();
      const planted = build();
      assert.notEqual(JSON.stringify(planted), JSON.stringify(clean), "the plant LANDED — the planted text differs from the clean text");

      const violations = socketCapViolations(planted).violations;
      assert.ok(violations.length >= 1, `the shipped detector returns at least one violation: ${JSON.stringify(violations)}`);
      for (const expectation of expectations) {
        assert.ok(violations.some((violation) => expectation.test(violation)), `the refusal names ${expectation}: ${JSON.stringify(violations)}`);
      }
      // …and the clauses this plant is NOT about stayed quiet. A plant that fires two independent
      // clauses at once cannot tell you which one is load-bearing — delete either and the lane
      // stays green, which is how a hollow clause survives a mutation review.
      for (const expectation of forbidden) {
        assert.ok(
          !violations.some((violation) => expectation.test(violation)),
          `this plant drives ONE clause: nothing matching ${expectation} should have fired — ${JSON.stringify(violations)}`,
        );
      }
      assert.deepEqual(socketCapViolations(clean).violations, [], "…and the CLEAN pair, in this same test, returns no violations");
    },
  })),

  {
    name: "49/02 task01 — the gate FIRES on a CALL SITE that types the number instead of feeding the constant (the clause the real tree cannot yet make non-vacuous: nothing calls the arbiter until 49/03-05)",
    run: async () => {
      const clean = cleanPair();
      const planted = {
        files: [
          ...clean.files,
          { path: "ui/src/home/Home.tsx", source: "import { subscribedPaneSet } from \"./socket-cap.mjs\";\nexport const decide = (rows) => subscribedPaneSet(rows, 16, {}, []);" },
        ],
        mirror: clean.mirror,
      };
      assert.notEqual(planted.files.length, clean.files.length, "the plant LANDED");
      const { violations, report } = socketCapViolations(planted);
      assert.ok(violations.some((violation) => /rather than the declared `MAX_LIVE_PANES`/.test(violation)), `the refusal names the second copy: ${JSON.stringify(violations)}`);
      assert.equal(report.capFedFromConstant, false, "…and the report says the cap is not fed from the constant");
      assert.deepEqual(socketCapViolations(clean).violations, [], "…and the CLEAN pair, in this same test, returns none");

      const fixed = {
        files: [
          ...clean.files,
          { path: "ui/src/home/Home.tsx", source: "import { MAX_LIVE_PANES, subscribedPaneSet } from \"./socket-cap.mjs\";\nexport const decide = (rows) => subscribedPaneSet(rows, MAX_LIVE_PANES, {}, []);" },
        ],
        mirror: clean.mirror,
      };
      assert.deepEqual(socketCapViolations(fixed).violations, [], "a call site feeding the declared constant is accepted — the clause is a REPLACEMENT, not a prohibition");
    },
  },

  {
    name: "49/02 task01 — the `.d.mts` sibling's literal TYPE is checked for agreement rather than ignored: the AGREEING declaration is accepted and the disagreeing one fires, so the one legitimate second spelling of the number cannot drift",
    run: async () => {
      const clean = cleanPair();
      const agreeing = {
        files: [...clean.files, { path: "ui/src/home/socket-cap.d.mts", source: "export declare const MAX_LIVE_PANES: 16;\n" }],
        mirror: clean.mirror,
      };
      assert.deepEqual(
        socketCapViolations(agreeing).violations,
        [],
        "a declaration sibling repeating the SAME number is the one legitimate second spelling — the clause checks agreement, it does not forbid the sibling",
      );

      const disagreeing = {
        files: [...clean.files, { path: "ui/src/home/socket-cap.d.mts", source: "export declare const MAX_LIVE_PANES: 8;\n" }],
        mirror: clean.mirror,
      };
      assert.notDeepEqual(disagreeing.files, agreeing.files, "the plant LANDED");
      const violations = socketCapViolations(disagreeing).violations;
      assert.ok(violations.length >= 1, `a declaration type that disagrees with the shipped constant fires: ${JSON.stringify(violations)}`);
      assert.ok(
        violations.some((violation) => /socket-cap\.d\.mts/.test(violation) && /as 8 while the shipped constant is 16/.test(violation)),
        `the refusal names the file and BOTH numbers: ${JSON.stringify(violations)}`,
      );
      assert.deepEqual(socketCapViolations(clean).violations, [], "…and the CLEAN pair, in this same test, returns none");
    },
  },
];
