// Traceability wiring for milestone 48 / story 02 — task 01
// (tasks/01_the-formatter-keeps-the-line.feature): "the fleet renders exactly the line
// it rendered before, now that the wire carries the sessions a run already accounts
// for".
//
// THE FUNCTION UNDER TEST is the PURE `fleetCurrentWorkLines` (ui/src/fleet/runs.mjs)
// — no React, no DOM, no I/O, no clock — imported directly and called with literal
// presence objects. NO STORE, NO SERVER, NO PORT: nothing here touches `~/.aof` and
// nothing binds. (The suite still runs under the house per-test hermetic
// `AOF_GLOBAL_HOME`; it simply has nothing to write there.)
//
// "The new wire shape" is a session entry carrying `workspaceHasRun`, as story 48/01
// defines it; "the old wire shape" is the PRE-milestone-48 payload for the same
// situation, where the producer had already dropped a subsumed session. The headline
// scenario renders BOTH and asserts they are deep-equal — the strongest available form
// of ADR-004's "rendered behaviour preserved byte-for-byte".
//
// NOT ASSERTED HERE, each with an owner: what reaches the wire (task 00,
// test/mesh/launcher/mesh-launcher-session-wire-complete.test.mjs); the entry's key order (story
// 48/01); the structural halves — that the producer filter is gone and that the
// formatter reads the fact STRICTLY — (the amended fitness function
// test/arch/session/acd-session-run-reconciliation.test.mjs). The Rust desktop surface needs no
// change: `current_work` (app/desktop/crates/core/src/view_model.rs) short-circuits on
// `!runs.is_empty()` BEFORE it reads sessions, so a newly-present entry is never
// rendered there — stated so nobody goes looking for a change that is deliberately
// absent.
//
// AMENDED BY MILESTONE 49 / story 01 (DESIGN §The `(session)` line — the dedupe rule,
// RULED; ADR-010). Exactly ONE row of this suite moves: the two-sessions-in-one-repo row,
// which m48 pinned to today's duplicate rendering under its own explicit HOLD and whose
// comment said the rule was m49's DESIGN question to answer. It is REWRITTEN to the
// answer (`working · demo ×2 (session)`) and its rule-form assertion is REPLACED BY
// ANOTHER RULE — never deleted, never downgraded to a string. Every other row is
// untouched and still passes byte-for-byte: the dedupe changes nothing that has no
// duplicate. (The paragraph above also stops being true for m49: the Rust surface DOES
// move for the dedupe — in `session_line_parts()`, in the same commit — but its run
// short-circuit, which is what that paragraph is about, is untouched.)
//
// THIS IS NOT A UI-SURFACE TASK. `runs.mjs` is framework-free; no component, layout,
// interaction or style is in scope.
import assert from "node:assert/strict";
import { fleetCurrentWorkLines } from "../../../ui/src/fleet/runs.mjs";
// milestone 49 / story 01 (ADR-010) — the RULE that replaces m48's own rule-form
// assertion on the two-sessions-one-repo row below. One home, shared with this story's
// suite (test/mesh/fleet/mesh-fleet-repo-dedupe-count.test.mjs), because a rule with two
// implementations is a rule that can disagree with itself.
import { sessionLineRuleViolations } from "../../support/session-line-rule.mjs";

const PING = "2026-08-10T12:00:00.000Z";

// A session entry in the NEW wire shape (m48/ADR-005's frozen ordered six). `extra`
// overrides `workspaceHasRun` for the defensive rows — including deleting the key, to
// spell a PRE-m48 node's entry exactly.
function session(repo, { workspaceId = `ws-${repo}`, sessionId = `sess-${repo}`, workspaceHasRun = false, lastPingAt = PING } = {}) {
  return { sessionId, workspaceId, repo, assistant: "claude-code", lastPingAt, workspaceHasRun };
}

function withoutRunFact(entry) {
  const { workspaceHasRun, ...rest } = entry; // eslint-disable-line no-unused-vars
  return rest;
}

export const meshFleetSessionSubsumptionRenderTests = [
  // ══ Scenario: a run and its own session render one line — the same line the old
  //    payload rendered ══
  {
    name: "mesh-fleet-session-subsumption-render/01 a run and its own session render one line — the same line the old payload rendered",
    async run() {
      // THE NEW WIRE SHAPE: the producer no longer drops the session; it stamps it.
      const newShape = { activeRuns: ["run-1"], sessions: [session("demo", { workspaceHasRun: true })] };
      // THE OLD WIRE SHAPE: the pre-m48 producer had already dropped it.
      const oldShape = { activeRuns: ["run-1"], sessions: [] };

      const rendered = fleetCurrentWorkLines(newShape);
      const before = fleetCurrentWorkLines(oldShape);

      assert.deepEqual(rendered, before, "the two results are deep-equal — same lines, same token, same state");
      assert.deepEqual(rendered.lines, ["running 1 run"], "the rendered lines are exactly `running 1 run` — with NO `working · demo (session)` line");
      assert.equal(rendered.state, "working", "state is \"working\"");
      assert.equal(rendered.token, "primary", "token is \"primary\"");
    },
  },

  // ══ Scenario: a formatter that ignores the run fact would draw the session line
  //    twice over — and must not ══
  //    A formatter that ignored `workspaceHasRun` produces TWO lines here — `running 1
  //    run` AND `working · demo (session)` — which is exactly what a real operator
  //    would see on the live fleet during a merge window where only the producer half
  //    landed. (That a planted formatter genuinely does produce them is proven,
  //    executably, by the amended fitness function's self-check.)
  {
    name: "mesh-fleet-session-subsumption-render/01 a formatter that ignores the run fact would draw the session line twice over — and must not",
    async run() {
      const rendered = fleetCurrentWorkLines({ activeRuns: ["run-1"], sessions: [session("demo", { workspaceHasRun: true })] });

      assert.equal(rendered.lines.length, 1, "`lines` has exactly ONE element");
      assert.equal(rendered.lines.some((line) => line.includes("(session)")), false, "no element of `lines` contains the text `(session)`");
    },
  },

  // ══ Scenario Outline: every other case renders precisely as it does today ══
  {
    name: "mesh-fleet-session-subsumption-render/01 every other case renders precisely as it does today (Examples: 7 rows)",
    async run() {
      const rows = [
        {
          case: "nothing happening",
          presence: { activeRuns: [], sessions: [] },
          lines: ["idle"], state: "idle", token: "muted",
        },
        {
          case: "a session with no run",
          presence: { activeRuns: [], sessions: [session("demo")] },
          lines: ["working · demo (session)"], state: "working", token: "primary",
        },
        {
          case: "run in one repo, session in another",
          presence: { activeRuns: ["run-1"], sessions: [session("other")] },
          lines: ["running 1 run", "working · other (session)"], state: "working", token: "primary",
        },
        {
          case: "several sessions, sorted and joined",
          presence: { activeRuns: [], sessions: [session("zeta"), session("alpha"), session("mid")] },
          lines: ["working · alpha, mid, zeta (session)"], state: "working", token: "primary",
        },
        {
          case: "several runs pluralise",
          presence: { activeRuns: ["run-1", "run-2", "run-3"], sessions: [] },
          lines: ["running 3 runs"], state: "working", token: "primary",
        },
        {
          // ROW 6 — REWRITTEN BY MILESTONE 49 / story 01 (DESIGN §The `(session)` line —
          // the dedupe rule, RULED; ADR-010), NEVER DELETED. It used to pin today's
          // duplicate rendering, `working · demo, demo (session)`, under m48/ADR-010 R4's
          // explicit HOLD — "whether the line should deduplicate is milestone 49's DESIGN
          // question". m49 answered it: DEDUPLICATE **AND COUNT**. So this row survives
          // the change it was written to force, now pinning the new answer.
          //
          // A pin deleted by the diff it was written to catch is the failure mode this
          // codebase has caught more than once, and the PO ruled it out in terms: the pin
          // is REPLACED BY ANOTHER RULE (below), never removed to make the suite pass.
          case: "two sessions in one repo, no run",
          presence: { activeRuns: [], sessions: [session("demo", { sessionId: "sess-1" }), session("demo", { sessionId: "sess-2" })] },
          lines: ["working · demo ×2 (session)"], state: "working", token: "primary",
        },
        {
          // ROW 7 catches a filter applied to the whole ARRAY instead of per entry:
          // drop-all-when-any-run-exists passes rows 1-6 and fails here.
          case: "mixed: subsumed and free, one repo each",
          presence: { activeRuns: ["run-1"], sessions: [session("demo", { workspaceHasRun: true }), session("other")] },
          lines: ["running 1 run", "working · other (session)"], state: "working", token: "primary",
        },
      ];
      for (const row of rows) {
        const rendered = fleetCurrentWorkLines(row.presence);
        assert.deepEqual(rendered.lines, row.lines, `${row.case}: lines`);
        assert.equal(rendered.state, row.state, `${row.case}: state`);
        assert.equal(rendered.token, row.token, `${row.case}: token`);
      }

      // Row 6, stated as a RULE rather than only as a string — REPLACED IN KIND by
      // milestone 49 / story 01 (ADR-010), never downgraded to a literal. m48's rule was
      // `split(", ").length === sessions.length` ("one repo name per session"), written
      // so a future dedupe could not slip past by rewording the expectation. It did its
      // job: m49 had to make the decision deliberately. Its replacement is the m49 rule —
      // one part per DISTINCT surviving repo, counts summing to the surviving sessions,
      // every part's repo published byte-identically, parts in ascending codepoint order
      // (test/support/session-line-rule.mjs) — so the NEXT milestone cannot reword its way
      // past this behaviour either.
      const twoInOneRepo = { activeRuns: [], sessions: [session("demo", { sessionId: "sess-1" }), session("demo", { sessionId: "sess-2" })] };
      const [line] = fleetCurrentWorkLines(twoInOneRepo).lines;
      assert.deepEqual(sessionLineRuleViolations(line, twoInOneRepo.sessions), [], "the delivered line satisfies the m49 rule");
      // …and the rule is not vacuous here: it REJECTS both wrong answers for this very
      // payload — m48's old line (which under-dedupes) and a bare dedupe (which
      // under-counts, DESIGN's named rejected alternative).
      assert.ok(sessionLineRuleViolations("working · demo, demo (session)", twoInOneRepo.sessions).length > 0, "the rule rejects the pre-m49 duplicate rendering");
      assert.ok(sessionLineRuleViolations("working · demo (session)", twoInOneRepo.sessions).length > 0, "the rule rejects a bare dedupe");
    },
  },

  // ══ Scenario: the formatter still recomputes no liveness of its own ══
  //    Liveness is TTL-filtered by the publisher before the wire ever carries it. A
  //    formatter that started filtering by age would be a second staleness authority —
  //    the exact thing ADR-007 refuses at the control, refused here too.
  {
    name: "mesh-fleet-session-subsumption-render/01 the formatter still recomputes no liveness of its own",
    async run() {
      const hoursOld = new Date(Date.parse(PING) - 5 * 60 * 60 * 1000).toISOString();
      const presence = { activeRuns: [], sessions: [session("demo", { lastPingAt: hoursOld, workspaceHasRun: false })] };

      const first = fleetCurrentWorkLines(presence);
      assert.deepEqual(first.lines, ["working · demo (session)"], "that session still contributes its line — the formatter does not second-guess who is live");

      // "The result does not depend on the current time in any way", proven twice
      // over: (a) rendering the same payload at two different instants is deep-equal…
      const second = fleetCurrentWorkLines(presence);
      assert.deepEqual(second, first, "rendering the same payload twice, at two different instants, is deep-equal both times");

      // …and (b) the render cannot even READ a clock: with `Date.now` and the `Date`
      // constructor replaced by throwers for the duration of one call, the render
      // still succeeds and still matches. (`runs.mjs` imports nothing, so this is the
      // whole surface it could have read a clock through.)
      const realDate = globalThis.Date;
      let underStubbedClock;
      try {
        globalThis.Date = new Proxy(realDate, {
          construct() { throw new Error("the formatter read a clock"); },
          apply() { throw new Error("the formatter read a clock"); },
          get(target, property, receiver) {
            if (property === "now") return () => { throw new Error("the formatter read a clock"); };
            return Reflect.get(target, property, receiver);
          },
        });
        underStubbedClock = fleetCurrentWorkLines(presence);
      } finally {
        globalThis.Date = realDate;
      }
      assert.deepEqual(underStubbedClock, first, "the render is identical with the clock removed entirely — it never reads one");
    },
  },

  // ══ Scenario Outline: a payload missing or malforming the new key still renders
  //    honestly ══
  //    Row 1 is m48/ADR-010 R3's compatibility ruling made observable: a node still
  //    running the old build publishes entries with NO `workspaceHasRun`, and its
  //    subsumption was already applied at ITS producer — so an absent key must render,
  //    which is exactly what that node shows today. Rows 2-4 are the "a new key must
  //    not make this brittle" clause: this function already tolerates a malformed
  //    presence, and it still does.
  {
    name: "mesh-fleet-session-subsumption-render/01 a payload missing or malforming the new key still renders honestly (Examples: 4 rows)",
    async run() {
      const rows = [
        {
          case: "a pre-48 node's record, mid-rollout — a session entry with NO workspaceHasRun key at all",
          presence: { activeRuns: ["run-1"], sessions: [withoutRunFact(session("demo"))] },
          expected: { lines: ["running 1 run", "working · demo (session)"], state: "working", token: "primary" },
        },
        {
          // The DETERMINISTIC, DOCUMENTED choice (ADR-010 R3): only the boolean `true`
          // states the fact, so the STRING "true" renders — one rule covering the
          // missing key and the malformed value alike, and never a crash.
          case: "a non-boolean value — workspaceHasRun present as the string \"true\"",
          presence: { activeRuns: ["run-1"], sessions: [session("demo", { workspaceHasRun: "true" })] },
          expected: { lines: ["running 1 run", "working · demo (session)"], state: "working", token: "primary" },
        },
        {
          case: "presence absent entirely",
          presence: undefined,
          expected: { lines: ["idle"], state: "idle", token: "muted" },
        },
        {
          case: "sessions not an array",
          presence: { activeRuns: [], sessions: "not-an-array" },
          expected: { lines: ["idle"], state: "idle", token: "muted" },
        },
      ];
      for (const row of rows) {
        let rendered;
        assert.doesNotThrow(() => { rendered = fleetCurrentWorkLines(row.presence); }, `${row.case}: no error is thrown`);
        assert.deepEqual(rendered, row.expected, `${row.case}: the outcome`);
      }

      // Non-vacuity for row 1: the entry really does carry no such key.
      assert.equal(Object.hasOwn(withoutRunFact(session("demo")), "workspaceHasRun"), false, "the pre-48 row's entry genuinely has NO workspaceHasRun key");
    },
  },
];
