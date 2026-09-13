// milestone 50 / story 04 / task 02 — THE OPERATOR-VISIBLE STATE MACHINE (@executable).
//
// Every Scenario and every Examples ROW of
// `wiki/work/50_milestone_session-launcher/stories/04_story_session-launcher-affordance/tasks/02_operator-state-machine.feature`,
// driven against the SHIPPED `ui/src/home/session-launcher.mjs` with an INJECTED CLOCK (`now`)
// and INJECTED route answers (the `answer`/`outcome`/`observe` events). The module is pure, so
// the clock and the responses are data and nothing here binds a port or opens a store.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../support/terminal-gate-detectors.mjs";
import { HOME_POLL_MS } from "../../ui/src/home/page-state.mjs";
import {
  HOME_SESSION_OUTCOME_PATH,
  LAUNCHER_DISPATCHED,
  LAUNCHER_DISPATCHING,
  LAUNCHER_FAILED,
  LAUNCHER_LANE_UNAVAILABLE_CODE,
  LAUNCHER_LANE_UNAVAILABLE_LINE,
  LAUNCHER_NO_ANSWER,
  LAUNCHER_NO_ANSWER_DETAIL,
  LAUNCHER_NO_ANSWER_LINE,
  LAUNCHER_OUTCOME_POLL_MS,
  LAUNCHER_OUTCOME_WINDOW_MS,
  LAUNCHER_POST_DEADLINE_MS,
  LAUNCHER_REFUSED,
  LAUNCHER_REST,
  LAUNCHER_STARTED,
  LAUNCHER_STARTED_HOLD_MS,
  LAUNCHER_STATE_LIST,
  launcherOpenDefaults,
  launcherReduce,
  launcherRest,
  launcherStartedLine,
  sessionLauncherView,
} from "../../ui/src/home/session-launcher.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const node = (nodeId, freshness = "live", workspaceIds = []) => ({ nodeId, role: "worker", freshness, workspaceIds });
const workspace = (workspaceId, name = null) => ({ workspaceId, projectRoot: `C:/src/${workspaceId}`, name });
const workItem = (workspaceId, ref, title = null) => ({ workspaceId, ref, type: "story", slug: "s", status: "in-progress", title });

const STATUS = {
  nodes: [node("n1", "live", ["ws-aof"]), node("n2", "live", ["ws-aof"])],
  workspaces: [workspace("ws-aof"), workspace("ws-test")],
  items: [workItem("ws-aof", "50/04", "The affordance")],
  sessions: [],
};

const opened = (status, selection = {}) => {
  let machine = launcherReduce(launcherRest(), { type: "open", defaults: launcherOpenDefaults(status) });
  for (const [field, value] of Object.entries(selection)) machine = launcherReduce(machine, { type: "choose", field, value });
  return machine;
};

const view = (machine, now, status = STATUS) => sessionLauncherView({ status, machine, now });
const stateAt = (machine, now, status = STATUS) => view(machine, now, status).state;

/** Submit, from an open panel, posting the body the panel RENDERED (never a second one). */
function submit(machine, at, status = STATUS) {
  const request = sessionLauncherView({ status, machine, now: at }).panel.request;
  return launcherReduce(machine, { type: "submit", at, request });
}
const answered = (machine, at, response) => launcherReduce(machine, { type: "answer", at, response });
const accepted = (machine, at, sessionId) => answered(machine, at, { ok: true, status: 200, body: { ok: true, sessionId, nodeId: "n1", workspaceId: "ws-aof" } });
const refusedWith = (machine, at, status, body) => answered(machine, at, { ok: false, status, body });
const laneSaid = (machine, at, outcome) => launcherReduce(machine, { type: "outcome", at, outcome });
const sessionAppeared = (machine, at, sessionId, nodeId = "n1") => launcherReduce(machine, { type: "observe", at, sessions: [{ nodeId, sessionId, repo: "aof" }] });

/** An open panel with n1 and ws-aof chosen, submitted at `at`. */
const dispatchAt = (at = 0, selection = { node: "n1", repo: "ws-aof" }) => submit(opened(STATUS, selection), at);

export const homeSessionLauncherStateTests = [
  // ══ Scenario: the state set is closed and every member is one of DESIGN's own rows ═══════
  {
    name: "50/04 task02 — the declared state set is exactly the eight of DESIGN's table, `refused` and `no answer` never substitute for one another, and nothing outside it is ever returned",
    run: async () => {
      assert.deepEqual([...LAUNCHER_STATE_LIST], ["rest", "open", "dispatching", "dispatched", "started", "refused", "failed", "no answer"]);
      assert.notEqual(LAUNCHER_REFUSED, LAUNCHER_NO_ANSWER, "two different values for two different facts");

      // Every state this whole file drives is a member — collected as the suite runs and
      // asserted at the end (see the last lane); here, the shapes reachable from one dispatch.
      const seen = new Set();
      const machine = dispatchAt(0);
      for (const now of [0, 1, LAUNCHER_POST_DEADLINE_MS, LAUNCHER_POST_DEADLINE_MS * 3]) seen.add(stateAt(machine, now));
      const ok = accepted(machine, 200, "s-1");
      for (const now of [200, LAUNCHER_OUTCOME_WINDOW_MS, LAUNCHER_OUTCOME_WINDOW_MS + 1000]) seen.add(stateAt(ok, now));
      seen.add(stateAt(sessionAppeared(ok, 1000, "s-1"), 1000));
      seen.add(stateAt(sessionAppeared(ok, 1000, "s-1"), 1000 + LAUNCHER_STARTED_HOLD_MS));
      seen.add(stateAt(refusedWith(machine, 200, 404, { ok: false, error: "gone", code: "workspace-not-found" }), 200));
      seen.add(stateAt(laneSaid(ok, 900, { sessionId: "s-1", state: "failed", code: "session-spawn-failed" }), 900));
      seen.add(stateAt(launcherRest(), 0));
      seen.add(stateAt(opened(STATUS), 0));
      assert.deepEqual([...seen].filter((state) => !LAUNCHER_STATE_LIST.includes(state)), [], `every returned state is a member: ${[...seen].join(", ")}`);
      assert.ok(seen.size >= 7, `…and the drive really reached most of them: ${[...seen].join(", ")}`);
    },
  },

  // ══ Scenario: the happy path is held, then handed to the grid, then let go ═══════════════
  {
    name: "50/04 task02 — the happy path: `dispatching` freezes the chosen values, the 200 becomes `dispatched`, the GRID makes it `started`, and one poll interval later it is `rest` with nothing left over",
    run: async () => {
      let machine = dispatchAt(0);
      let current = view(machine, 0);
      assert.equal(current.state, LAUNCHER_DISPATCHING);
      assert.equal(current.panel.frozen, true, "the chosen values are FROZEN rather than cleared");
      assert.deepEqual(current.panel.fields.map((field) => field.value), ["n1", "ws-aof", null], "…and they are still the chosen values");
      assert.deepEqual(current.panel.fields.map((field) => field.disabled), [true, true, true]);

      machine = accepted(machine, 200, "s-1");
      current = view(machine, 200);
      assert.equal(current.state, LAUNCHER_DISPATCHED);
      assert.ok(current.outcome.line.includes("n1"), "the line names the node");
      assert.ok(/waiting for it to appear/.test(current.outcome.line), "…and states what is being waited on");
      assert.equal(current.panel.actionDisabled, true, "the submit action is disabled while `dispatched` holds");

      machine = sessionAppeared(machine, 11_000, "s-1");
      current = view(machine, 11_000);
      assert.equal(current.state, LAUNCHER_STARTED);
      assert.equal(current.outcome.line, launcherStartedLine("n1"));

      assert.equal(stateAt(machine, 11_000 + LAUNCHER_STARTED_HOLD_MS - 1), LAUNCHER_STARTED, "`started` holds for exactly one poll interval");
      const decayed = view(machine, 11_000 + LAUNCHER_STARTED_HOLD_MS);
      assert.equal(decayed.state, LAUNCHER_REST, "…and then returns to rest");
      assert.deepEqual([decayed.outcome.line, decayed.outcome.title, decayed.trigger.compact, decayed.panel], [null, null, null, null], "with nothing left over");
      assert.equal(decayed.settled, true, "…and it says so, so the consumer can drop the attempt");

      // AT NO POINT DID THE MODULE CONTRIBUTE A ROW, A TILE OR A PLACEHOLDER TO THE GRID.
      for (const at of [0, 200, 11_000, 20_000]) {
        const keys = Object.keys(view(machine, at));
        assert.deepEqual(keys.sort(), ["outcome", "outcomePoll", "panel", "settled", "state", "trigger"], `at ${at}: the view's whole surface`);
      }
    },
  },

  // ══ Scenario: an `ok: true` outcome corroborates the dispatch but does not end the wait ══
  {
    name: "50/04 task02 — ADR-008 decision 7: an `ok:true` lane answer CORROBORATES but does not end the wait — only the grid makes it `started`",
    run: async () => {
      let machine = accepted(dispatchAt(0), 200, "s-1");
      machine = laneSaid(machine, 900, { nodeId: "n1", sessionId: "s-1", state: "started", code: null });
      assert.equal(stateAt(machine, 900), LAUNCHER_DISPATCHED, "STILL dispatched — the launcher does not claim a session the grid does not show");
      assert.equal(view(machine, 900).outcome.line.includes("waiting for it to appear"), true);
      machine = sessionAppeared(machine, 4000, "s-1");
      assert.equal(stateAt(machine, 4000), LAUNCHER_STARTED, "…and when the session appears, it is started");
    },
  },

  // ══ Scenario: the deadlines are derived from the home's own cadence and are not one number ═
  {
    name: "50/04 task02 — two deadlines, two numbers: 2 × HOME_POLL_MS and 3 × HOME_POLL_MS, derived and not literals, and neither imported from ui/src/fleet/",
    run: async () => {
      assert.equal(HOME_POLL_MS, 5000);
      assert.equal(LAUNCHER_POST_DEADLINE_MS, HOME_POLL_MS * 2);
      assert.equal(LAUNCHER_OUTCOME_WINDOW_MS, HOME_POLL_MS * 3);
      assert.notEqual(LAUNCHER_POST_DEADLINE_MS, LAUNCHER_OUTCOME_WINDOW_MS, "they are two numbers because they wait on two facts");
      assert.equal(LAUNCHER_OUTCOME_POLL_MS, HOME_POLL_MS / 5, "the outcome poll's cadence is derived from the same one number");

      const source = stripComments(await readFile(path.join(repoRoot, "ui/src/home/session-launcher.mjs"), "utf8"));
      assert.ok(source.replace(/\s+/g, "").length > 0, "the comment-stripped source is non-empty (the sweep is not blinded)");
      for (const literal of [/\b10000\b/, /\b15000\b/, /\b10\b/, /\b15\b/]) {
        assert.equal(literal.test(source), false, `neither deadline is a second literal (${literal})`);
      }
      assert.equal(/from\s+["'][^"']*fleet\//.test(source), false, "and nothing is imported from ui/src/fleet/");
      assert.ok(/HOME_POLL_MS \* 2/.test(source) && /HOME_POLL_MS \* 3/.test(source), "both are expressed in terms of HOME_POLL_MS");

      // The outcome poll lives in ONE home and STOPS when the window closes.
      const machine = accepted(dispatchAt(0), 200, "s-1");
      const running = view(machine, 1000).outcomePoll;
      assert.deepEqual({ ...running }, { path: HOME_SESSION_OUTCOME_PATH, nodeId: "n1", sessionId: "s-1", everyMs: LAUNCHER_OUTCOME_POLL_MS });
      assert.equal(view(machine, 200 + LAUNCHER_OUTCOME_WINDOW_MS).outcomePoll, null, "…and it stops when the window closes");
      assert.equal(view(dispatchAt(0), 0).outcomePoll, null, "…and it never runs before there is a tuple to ask about");
    },
  },

  // ══ Scenario Outline: each deadline answers for the fact it waits on ════════════════════
  {
    name: "50/04 task02 — each deadline answers for the fact it waits on, and neither answers for the other (8 rows), with no abort and no re-send",
    run: async () => {
      const base = dispatchAt(0);
      const rows = [
        { label: "the POST hangs", machine: base, at: 9999, state: LAUNCHER_DISPATCHING, line: null },
        { label: "the POST hangs past its deadline", machine: base, at: 10_000, state: LAUNCHER_NO_ANSWER, line: LAUNCHER_NO_ANSWER_LINE },
        { label: "the POST answers late, after its deadline", machine: accepted(base, 12_000, "s-late"), at: 12_000, state: LAUNCHER_NO_ANSWER, line: LAUNCHER_NO_ANSWER_LINE },
        { label: "a 200, then nothing", machine: accepted(base, 200, "s-1"), at: 200 + LAUNCHER_OUTCOME_WINDOW_MS, state: LAUNCHER_NO_ANSWER, line: LAUNCHER_NO_ANSWER_LINE },
        { label: "a 200, then the session appears", machine: sessionAppeared(accepted(base, 200, "s-1"), 11_000, "s-1"), at: 11_000, state: LAUNCHER_STARTED, line: launcherStartedLine("n1") },
        { label: "a 200, then a worker refusal", machine: laneSaid(accepted(base, 200, "s-1"), 2000, { sessionId: "s-1", state: "failed", code: "session-repo-unavailable" }), at: 2000, state: LAUNCHER_FAILED, coded: "session-repo-unavailable" },
        { label: "a 200, then a synthesised refusal", machine: laneSaid(accepted(base, 200, "s-1"), 900, { sessionId: "s-1", state: "failed", code: "session-target-not-connected" }), at: 900, state: LAUNCHER_FAILED, coded: "session-target-not-connected" },
        { label: "a coded 4xx", machine: refusedWith(base, 200, 404, { ok: false, error: "no such workspace", code: "workspace-not-found" }), at: 200, state: LAUNCHER_REFUSED, coded: "workspace-not-found" },
      ];
      for (const row of rows) {
        const current = view(row.machine, row.at);
        assert.equal(current.state, row.state, `${row.label}: at ${row.at}ms the state`);
        if (row.line !== undefined) assert.equal(current.outcome.line, row.line, `${row.label}: the line`);
        if (row.coded) {
          assert.equal(current.outcome.code, row.coded, `${row.label}: the coded line`);
          assert.ok(current.outcome.line.length > 0 && current.outcome.line !== row.coded, `${row.label}: the code is never the message`);
        }
        // The machine holds exactly ONE request for the whole attempt: nothing was re-sent.
        if (row.machine.attempt != null) assert.deepEqual({ ...row.machine.attempt.request }, { nodeId: "n1", workspaceId: "ws-aof" }, `${row.label}: one request, unchanged`);
      }
      // …and the module cannot abort or re-send: it issues no request at all.
      const source = stripComments(await readFile(path.join(repoRoot, "ui/src/home/session-launcher.mjs"), "utf8"));
      for (const forbidden of [/AbortController/, /\.abort\s*\(/, /\bfetch\s*\(/, /setTimeout|setInterval/]) {
        assert.equal(forbidden.test(source), false, `the decision module neither calls nor cancels anything (${forbidden})`);
      }
    },
  },

  // ══ Scenario: a session that appears after the window clears the "no answer" line ════════
  {
    name: "50/04 task02 — a LATE arrival wins: a session that appears after the window clears the `no answer` line, moves to `started`, then decays to `rest`",
    run: async () => {
      let machine = accepted(dispatchAt(0), 200, "s-1");
      const expired = 200 + LAUNCHER_OUTCOME_WINDOW_MS;
      assert.equal(stateAt(machine, expired), LAUNCHER_NO_ANSWER);
      machine = sessionAppeared(machine, expired + 3000, "s-1");
      const current = view(machine, expired + 3000);
      assert.equal(current.state, LAUNCHER_STARTED, "the grid is the authority and the launcher never contradicts a tile on screen");
      assert.equal(current.outcome.line, launcherStartedLine("n1"), "the `no answer` line is CLEARED");
      assert.equal(stateAt(machine, expired + 3000 + LAUNCHER_STARTED_HOLD_MS), LAUNCHER_REST, "…then decays to rest");

      // No operator action was needed to notice: the module offers no re-check control at all.
      assert.deepEqual(Object.keys(current.outcome).sort(), ["cause", "code", "line", "machine", "settled", "state", "title", "tone"]);
      // A row for ANOTHER node's session with the same id resolves nothing — the lane and the
      // grid are both keyed on the tuple.
      const foreign = launcherReduce(accepted(dispatchAt(0), 200, "s-1"), { type: "observe", at: 3000, sessions: [{ nodeId: "n2", sessionId: "s-1" }] });
      assert.equal(stateAt(foreign, 3000), LAUNCHER_DISPATCHED, "another node's row is not this dispatch's session");
    },
  },

  // ══ Scenario: re-submission is permitted from every terminal state and mints a new id ════
  {
    name: "50/04 task02 — every terminal state permits a re-submission, the new answer's id is the one waited on, and the stranded id appears only in the title",
    run: async () => {
      const terminals = [
        { label: "refused", machine: refusedWith(dispatchAt(0), 200, 409, { ok: false, error: "not local", code: "workspace-not-local" }), at: 200 },
        { label: "failed", machine: laneSaid(accepted(dispatchAt(0), 200, "s-1"), 900, { sessionId: "s-1", state: "failed", code: "session-spawn-failed" }), at: 900 },
        { label: "no answer", machine: accepted(dispatchAt(0), 200, "s-1"), at: 200 + LAUNCHER_OUTCOME_WINDOW_MS },
      ];
      for (const terminal of terminals) {
        const before = view(terminal.machine, terminal.at);
        assert.equal(before.panel.actionDisabled, false, `${terminal.label}: a re-submission is permitted`);
        assert.equal(before.panel.frozen, false, `${terminal.label}: the fields are released, the selection kept`);
        const stranded = terminal.machine.attempt.answer?.sessionId ?? null;
        if (stranded != null) {
          assert.equal(before.outcome.line.includes(stranded), false, `${terminal.label}: the stranded id is never rendered as a live thing`);
          assert.ok(before.outcome.title.includes(stranded), `${terminal.label}: …it appears only in the title`);
        }

        // The retry: a WHOLE new attempt, and the answer's id is a different one.
        let retried = submit(terminal.machine, terminal.at + 1);
        assert.equal(stateAt(retried, terminal.at + 1), LAUNCHER_DISPATCHING, `${terminal.label}: a fresh dispatch`);
        retried = accepted(retried, terminal.at + 2, "s-2");
        const after = view(retried, terminal.at + 2);
        assert.notEqual("s-2", stranded, `${terminal.label}: the new sessionId differs from the previous one`);
        assert.equal(after.outcomePoll.sessionId, "s-2", `${terminal.label}: the outcome route is polled with the NEW id, never the stranded one`);
        assert.equal(after.outcomePoll.nodeId, "n1");
      }

      // A re-click into a projection that has not caught up draws an ORDINARY coded refusal.
      const again = laneSaid(accepted(submit(opened(STATUS, { node: "n1", repo: "ws-aof" }), 0), 200, "s-2"), 900, {
        sessionId: "s-2",
        state: "failed",
        code: "session-already-active",
      });
      assert.equal(stateAt(again, 900), LAUNCHER_FAILED, "a correct answer rather than a new failure mode");
    },
  },

  // ══ Scenario Outline: every coded refusal renders operator-facing language ═══════════════
  {
    name: "50/04 task02 — the failure map: every coded refusal renders operator-facing language naming its machine, with the raw code in the title and never as the message",
    run: async () => {
      const control = [
        ["invalid-body", 400, "this machine", "incomplete request — this build and the route disagree"],
        ["workspace-not-found", 404, "this machine", "ws-aof is not in the mesh any more · reopen the picker to refresh"],
        ["workspace-not-local", 409, "this machine", "ws-aof is not checked out on this machine · pick a repo this machine holds"],
        ["control-identity-unknown", 409, "this machine", "this machine has no mesh identity yet"],
        ["session-target-not-connected", 503, "n1", "n1 is not connected to this machine · it must be online to open a session"],
        ["session-dispatch-unavailable", 503, "this machine", "this machine cannot reach its workers — no relay is configured"],
        ["session-dispatch-failed", 503, "this machine", "the request never left this machine · the relay is not answering"],
        ["session-route-failed", 500, "this machine", "this machine could not answer · the daemon log has the fault"],
        ["cross-origin-refused", 403, "this machine", "this page was refused by its own daemon"],
        ["invalid-content-type", 400, "this machine", "this page was refused by its own daemon"],
      ];
      for (const [code, status, machineName, reads] of control) {
        const sentence = `The server's own sentence for ${code}.`;
        const current = view(refusedWith(dispatchAt(0), 200, status, { ok: false, error: sentence, code }), 200);
        assert.equal(current.state, LAUNCHER_REFUSED, `${code}: the state`);
        assert.equal(current.outcome.line, reads, `${code}: the operator reads`);
        assert.equal(current.outcome.machine, machineName, `${code}: the line names its machine`);
        assert.notEqual(current.outcome.line, code, `${code}: the raw code is never the message`);
        assert.ok(current.outcome.title.includes(code), `${code}: the title carries the raw code`);
        assert.ok(current.outcome.title.includes(sentence), `${code}: …and the server's own sentence, verbatim`);
        assert.equal(current.outcome.tone, "destructive");
      }

      // Worker-side — the 200 was already sent; these arrive on the lane, which carries NO
      // sentence, so the title carries the code and the module's own mapped words.
      const withItem = submit(opened(STATUS, { node: "n1", repo: "ws-aof", item: "50/04" }), 0);
      const lane = [
        ["session-repo-unavailable", "n1 does not have ws-aof · pick a node that carries it"],
        ["session-worktree-failed", "n1 could not make a worktree for 50/04 · start without an item to open the repo root"],
        ["session-spawn-failed", "n1 could not open a terminal · the node's own log has the fault"],
        ["session-already-active", "that session is already open on n1 · it is in the grid"],
      ];
      for (const [code, reads] of lane) {
        const current = view(laneSaid(accepted(withItem, 200, "s-1"), 900, { sessionId: "s-1", state: "failed", code }), 900);
        assert.equal(current.state, LAUNCHER_FAILED, `${code}: the state`);
        assert.equal(current.outcome.line, reads, `${code}: the operator reads`);
        assert.equal(current.outcome.machine, "n1", `${code}: every worker-side line names the node`);
        assert.ok(current.outcome.line.includes("n1"), `${code}: …in the line itself`);
        assert.ok(current.outcome.title.includes(code), `${code}: the title carries the raw code`);
      }

      // `session-target-not-connected` is the SAME code on BOTH phases: same words, and only
      // the state differs (refused pre-200, failed post-200).
      const pre = view(refusedWith(dispatchAt(0), 200, 503, { ok: false, error: "no live connection", code: "session-target-not-connected" }), 200);
      const post = view(laneSaid(accepted(dispatchAt(0), 200, "s-1"), 900, { sessionId: "s-1", state: "failed", code: "session-target-not-connected" }), 900);
      assert.equal(pre.outcome.line, post.outcome.line, "the operator reads the same true sentence whichever phase caught it");
      assert.deepEqual([pre.state, post.state], [LAUNCHER_REFUSED, LAUNCHER_FAILED]);

      // The lane itself: it may NOT render blank and may NOT be mistaken for `no answer` about
      // the SESSION. It is the module's own sentence, naming this machine, while the wait runs.
      const deaf = view(laneSaid(accepted(dispatchAt(0), 200, "s-1"), 900, { sessionId: "s-1", state: "unknown", code: LAUNCHER_LANE_UNAVAILABLE_CODE }), 900);
      assert.ok(LAUNCHER_STATE_LIST.includes(deaf.state));
      assert.notEqual(deaf.state, LAUNCHER_NO_ANSWER, "not mistaken for `no answer` about the session");
      assert.equal(deaf.outcome.line, LAUNCHER_LANE_UNAVAILABLE_LINE, "the module's own sentence for a lane that cannot hear");
      assert.ok(deaf.outcome.line.length > 0, "…never blank");
      assert.equal(deaf.outcome.machine, "this machine");
      assert.ok(deaf.outcome.title.includes(LAUNCHER_LANE_UNAVAILABLE_CODE));

      // …AND A LANE THAT GOES DEAF LATER DOES NOT UN-ANSWER WHAT WAS ALREADY STATED. Measured
      // 2026-08-14: mesh-ui restarting inside the 15s window empties its registry, the next poll
      // answers `unknown`/lane-unavailable, and the operator's screen reverted from a stated
      // "n1 does not have ws-aof" to "this machine cannot hear answers from its workers". The
      // route already ranks it this way (a retained outcome outranks lane connectivity).
      const statedFailure = laneSaid(accepted(dispatchAt(0), 200, "s-1"), 900, { sessionId: "s-1", state: "failed", code: "session-repo-unavailable" });
      const wentDeaf = laneSaid(statedFailure, 1900, { sessionId: "s-1", state: "unknown", code: LAUNCHER_LANE_UNAVAILABLE_CODE });
      assert.equal(stateAt(wentDeaf, 1900), LAUNCHER_FAILED, "a stated `failed` is TERMINAL for the attempt");
      assert.equal(view(wentDeaf, 1900).outcome.line, "n1 does not have ws-aof · pick a node that carries it", "…and the operator keeps the sentence they were given");
      assert.equal(view(wentDeaf, 1900).outcome.code, "session-repo-unavailable");
      assert.equal(stateAt(sessionAppeared(wentDeaf, 2000, "s-1"), 2000), LAUNCHER_FAILED, "…and a stated failure still outranks the grid, exactly as before");

      // The same rule one rank down, and it is a RANKING rather than a freeze: a delivered ack is
      // not undone by the lane going deaf, and a lane that recovers and STATES a fault is heard.
      const ackedThenDeaf = laneSaid(laneSaid(accepted(dispatchAt(0), 200, "s-1"), 900, { sessionId: "s-1", state: "started", code: null }), 1900, { sessionId: "s-1", state: "unknown", code: LAUNCHER_LANE_UNAVAILABLE_CODE });
      assert.equal(stateAt(ackedThenDeaf, 1900), LAUNCHER_DISPATCHED);
      assert.ok(/waiting for it to appear/.test(view(ackedThenDeaf, 1900).outcome.line), "a deaf lane does not undo a delivered ack");
      const deafThenStated = laneSaid(laneSaid(accepted(dispatchAt(0), 200, "s-1"), 900, { sessionId: "s-1", state: "unknown", code: LAUNCHER_LANE_UNAVAILABLE_CODE }), 1900, { sessionId: "s-1", state: "failed", code: "session-spawn-failed" });
      assert.equal(stateAt(deafThenStated, 1900), LAUNCHER_FAILED, "a lane that recovers and states a fault is still heard");

      // The unmapped code — REACHABLE, not hypothetical (`error.code ?? "session-route-failed"`
      // means a thrown fs error surfaces its own `ENOENT` with a 500).
      const unmapped = view(refusedWith(dispatchAt(0), 200, 500, { ok: false, error: "ENOENT: no such file or directory, open 'C:/src/ws-aof'", code: "ENOENT" }), 200);
      assert.equal(unmapped.state, LAUNCHER_REFUSED);
      assert.equal(unmapped.outcome.line, "ENOENT: no such file or directory, open 'C:/src/ws-aof'", "an unknown code keeps the server's own sentence, unre-worded");
      assert.equal(unmapped.outcome.machine, "this machine");
      assert.ok(unmapped.outcome.title.includes("ENOENT"), "…and it still renders its code");
    },
  },

  // ══ Scenario: the title carries what the answer actually carried ═════════════════════════
  {
    name: "50/04 task02 — the title carries what the answer actually CARRIED: the server's sentence verbatim control-side, the module's own words on the lane, and never a fabricated one",
    run: async () => {
      const sentence = 'Workspace "ws-aof" is not in the mesh projection.';
      const controlSide = view(refusedWith(dispatchAt(0), 200, 404, { ok: false, error: sentence, code: "workspace-not-found" }), 200);
      assert.ok(controlSide.outcome.title.includes(sentence), "the control-side title carries the server's sentence VERBATIM");
      assert.ok(controlSide.outcome.title.includes("workspace-not-found"), "…plus the raw code");

      const workerSide = view(laneSaid(accepted(dispatchAt(0), 200, "s-1"), 900, { sessionId: "s-1", state: "failed", code: "session-repo-unavailable", at: "2026-08-14T12:00:00.000Z" }), 900);
      assert.ok(workerSide.outcome.title.includes("session-repo-unavailable"), "the worker-side title carries the raw code");
      assert.ok(workerSide.outcome.title.includes(workerSide.outcome.line), "…and the module's OWN mapped sentence, because no sentence crossed the wire to carry");
      // Nothing that was never sent: the only sentence in the title is the one the module
      // renders, and it is the same string the operator reads.
      assert.equal(workerSide.outcome.title.startsWith(workerSide.outcome.line), true, "no title fabricates a server sentence that was never sent");
    },
  },

  // ══ Scenario: an idempotency refusal is not painted as the operator's fault ══════════════
  {
    name: "50/04 task02 — `session-already-active` says it once, points at the grid, and does not contradict the tile that is on screen",
    run: async () => {
      const machine = laneSaid(accepted(dispatchAt(0), 200, "s-1"), 900, { sessionId: "s-1", state: "failed", code: "session-already-active" });
      const status = { ...STATUS, sessions: [{ nodeId: "n1", sessionId: "s-1", repo: "aof" }] };
      const withTile = launcherReduce(machine, { type: "observe", at: 1000, sessions: status.sessions });
      const current = sessionLauncherView({ status, machine: withTile, now: 1000 });
      assert.equal(current.state, LAUNCHER_FAILED, "the launcher says it once and stops speaking about that session");
      assert.equal(current.outcome.line, "that session is already open on n1 · it is in the grid", "it points at the grid");
      assert.equal(current.outcomePoll, null, "it does not keep asking");
      // …and the module contributes nothing to, and removes nothing from, the grid.
      assert.deepEqual(status.sessions, [{ nodeId: "n1", sessionId: "s-1", repo: "aof" }], "it does not clear the tile");
      assert.equal(sessionLauncherView({ status, machine: withTile, now: 6000 }).state, LAUNCHER_FAILED, "…and does not re-dispatch or change its mind");
    },
  },

  // ══ Scenario: silence and refusal are different facts ════════════════════════════════════
  {
    name: "50/04 task02 — silence and refusal never read as one another: `no answer` is unknown-not-negative, is not a fault, and keeps its two expiry CAUSES distinguishable",
    run: async () => {
      const timedOut = view(dispatchAt(0), LAUNCHER_POST_DEADLINE_MS);
      assert.equal(timedOut.state, LAUNCHER_NO_ANSWER);
      assert.notEqual(timedOut.state, LAUNCHER_FAILED, "the timed-out one reports `no answer` and never `failed`");
      assert.ok(/may still have succeeded/.test(timedOut.outcome.title), "its long form states that the request may still have succeeded");
      assert.equal(timedOut.outcome.tone, "muted", "the `no answer` outcome is NOT marked as a fault — nothing failed and nothing was confirmed");
      assert.equal(timedOut.outcome.code, null);

      const refused = view(refusedWith(dispatchAt(0), 200, 409, { ok: false, error: "not local", code: "workspace-not-local" }), 200);
      assert.equal(refused.state, LAUNCHER_REFUSED);
      assert.notEqual(refused.state, LAUNCHER_NO_ANSWER, "the refused one reports a stated reason and never `no answer`");
      assert.notEqual(refused.outcome.line, timedOut.outcome.line, "neither is distinguished from the other by colour alone: the WORDS state the outcome");
      assert.equal(refused.outcome.tone, "destructive");

      // K50-12's long form asserts "the node has reported nothing", which is FALSE once the
      // lane has delivered `ok:true`. The two expiry CAUSES stay distinguishable in the
      // returned value so the designer can render the distinction without a wire change.
      // A REJECTED FETCH IS SILENCE, NOT A REFUSAL — the third way the two words blur, and the
      // one that is reachable on EVERY mesh-ui restart and every sleep mid-POST. The request may
      // have reached the daemon and minted a session, so `refused` in destructive red would
      // assert a fault nobody observed; and the browser's own message is the raw platform
      // exception DG-50-3 rule 2 refuses as a cause.
      const rejected = view(answered(dispatchAt(0), 200, { error: new TypeError("Failed to fetch") }), 200);
      assert.equal(rejected.state, LAUNCHER_NO_ANSWER, "a transport rejection is the honest no-answer");
      assert.notEqual(rejected.state, LAUNCHER_REFUSED, "…and never a stated refusal");
      assert.equal(rejected.outcome.tone, "muted", "…so it is not painted as a fault");
      assert.equal(rejected.outcome.line, LAUNCHER_NO_ANSWER_LINE);
      assert.equal(rejected.outcome.code, null, "no code was stated, so none is rendered");
      assert.equal(rejected.outcome.cause, "post-rejected", "…with its own cause, distinguishable from the two expiries");
      assert.ok(/may still have succeeded/.test(rejected.outcome.title), "K50-12's shape: the request may still have succeeded");
      assert.equal(/Failed to fetch|TypeError/.test(JSON.stringify(rejected)), false, "DG-50-3 rule 2: the raw browser exception is surfaced NOWHERE in the returned value");

      const silent = accepted(dispatchAt(0), 200, "s-1");
      const acked = laneSaid(silent, 900, { sessionId: "s-1", state: "started", code: null });
      const at = 200 + LAUNCHER_OUTCOME_WINDOW_MS;
      assert.equal(view(silent, at).outcome.cause, "outcome-expiry");
      assert.equal(view(acked, at).outcome.cause, "outcome-expiry-acked");
      assert.equal(view(dispatchAt(0), LAUNCHER_POST_DEADLINE_MS).outcome.cause, "post-deadline");
      assert.equal(view(silent, at).outcome.title.includes(LAUNCHER_NO_ANSWER_DETAIL), true, "K50-12 verbatim where it is TRUE");
      assert.equal(view(acked, at).outcome.title.includes("reported nothing"), false, "…and never where it would be false");
      assert.deepEqual([view(silent, at).state, view(acked, at).state], [LAUNCHER_NO_ANSWER, LAUNCHER_NO_ANSWER], "both are the same STATE — only the cause differs");
    },
  },

  // ══ Scenario Outline: closing the panel abandons the form, never the dispatch ════════════
  {
    name: "50/04 task02 — dismissal abandons the FORM, never the dispatch: the state still resolves on its own deadlines and the trigger carries the residue, with `started` never in it",
    run: async () => {
      const base = dispatchAt(0);
      const ok = accepted(base, 200, "s-1");
      const rows = [
        { label: "mid-flight", machine: base, at: 0, state: LAUNCHER_DISPATCHING, compact: "starting…" },
        { label: "waiting for the session", machine: ok, at: 200, state: LAUNCHER_DISPATCHED, compact: "starting…" },
        { label: "a worker failure", machine: laneSaid(ok, 900, { sessionId: "s-1", state: "failed", code: "session-spawn-failed" }), at: 900, state: LAUNCHER_FAILED, compact: "failed" },
        { label: "the window expired", machine: ok, at: 200 + LAUNCHER_OUTCOME_WINDOW_MS, state: LAUNCHER_NO_ANSWER, compact: "no answer" },
        { label: "a successful spawn", machine: sessionAppeared(ok, 1000, "s-1"), at: 1000, state: LAUNCHER_STARTED, compact: null },
        { label: "nothing in flight", machine: launcherRest(), at: 0, state: LAUNCHER_REST, compact: null },
      ];
      for (const row of rows) {
        const dismissed = launcherReduce(row.machine, { type: "close" });
        const current = view(dismissed, row.at);
        assert.equal(current.state, row.state, `${row.label}: the module still holds the state`);
        assert.equal(current.panel, null, `${row.label}: the form is gone`);
        assert.equal(current.trigger.compact, row.compact, `${row.label}: the trigger's compact form`);
        if (row.compact != null) assert.ok(current.trigger.label.endsWith(row.compact), `${row.label}: …and it rides the trigger's label`);
        assert.notEqual(current.trigger.compact, LAUNCHER_STARTED, `${row.label}: \`started\` NEVER appears in the compact form`);
        // …and it still resolves on its own deadlines with the panel closed.
        if (row.state === LAUNCHER_DISPATCHING) assert.equal(stateAt(dismissed, LAUNCHER_POST_DEADLINE_MS), LAUNCHER_NO_ANSWER, `${row.label}: the deadline still runs`);
        if (row.state === LAUNCHER_DISPATCHED) assert.equal(stateAt(dismissed, 200 + LAUNCHER_OUTCOME_WINDOW_MS), LAUNCHER_NO_ANSWER, `${row.label}: the window still runs`);
      }
      // A dismissal never cancels the dispatch: the attempt and its request are untouched.
      assert.deepEqual(launcherReduce(ok, { type: "close" }).attempt, ok.attempt);
    },
  },

  // ══ Scenario Outline: every answer the route can give resolves to a state, none throws ═══
  {
    name: "50/04 task02 — TOTALITY: every answer the route can give resolves to one of the eight states with a non-empty line, and none throws",
    run: async () => {
      const base = dispatchAt(0);
      const rows = [
        { label: "a 200 with no sessionId", machine: answered(base, 200, { ok: true, status: 200, body: { ok: true } }), at: 200, state: LAUNCHER_NO_ANSWER },
        { label: "a 200 with a null sessionId", machine: answered(base, 200, { ok: true, status: 200, body: { ok: true, sessionId: null } }), at: 200, state: LAUNCHER_NO_ANSWER },
        { label: "a coded body with no code", machine: refusedWith(base, 200, 409, { ok: false, error: "Something the route said." }), at: 200, state: LAUNCHER_REFUSED, line: "Something the route said." },
        { label: "a coded body with no error sentence", machine: refusedWith(base, 200, 503, { ok: false, code: "session-dispatch-failed" }), at: 200, state: LAUNCHER_REFUSED, line: "the request never left this machine · the relay is not answering" },
        { label: "a body that will not parse", machine: answered(base, 200, { ok: false, status: 500, body: null }), at: 200, state: LAUNCHER_REFUSED },
        // CORRECTED 2026-08-14. This row asserted `refused` with the browser's own
        // "Failed to fetch" AS THE LINE — a build-authored expectation that locked the wrong
        // answer, so the suite would have stayed green over it. A rejected fetch is SILENCE (the
        // POST may have been received and a session minted), and DG-50-3 rule 2 forbids a raw
        // platform exception as the cause. The scenario it is a row of asks only that the state be
        // one of the eight with a non-empty line, so the contract did not have to move.
        { label: "a network failure", machine: answered(base, 200, { error: new Error("Failed to fetch") }), at: 200, state: LAUNCHER_NO_ANSWER, line: LAUNCHER_NO_ANSWER_LINE },
        { label: "an outcome answer with no state", machine: laneSaid(accepted(base, 200, "s-1"), 900, { ok: true, nodeId: "n1", sessionId: "s-1" }), at: 900, state: LAUNCHER_DISPATCHED },
        { label: "an outcome state nobody declared", machine: laneSaid(accepted(base, 200, "s-1"), 900, { sessionId: "s-1", state: "queued" }), at: 900, state: LAUNCHER_DISPATCHED },
      ];
      for (const row of rows) {
        const current = view(row.machine, row.at);
        assert.equal(current.state, row.state, `${row.label}: the state`);
        assert.ok(LAUNCHER_STATE_LIST.includes(current.state), `${row.label}: …and it is one of the declared eight`);
        assert.ok(typeof current.outcome.line === "string" && current.outcome.line.length > 0, `${row.label}: the line is a non-empty sentence`);
        if (row.line) assert.equal(current.outcome.line, row.line, `${row.label}: the line`);
        assert.notEqual(current.state, LAUNCHER_STARTED, `${row.label}: an unknown answer never silently reads as started`);
      }
      // `dispatching` is the one state that renders nothing — the action's own label IS the
      // state, and a second indicator would be two elements reporting one fact.
      const inFlight = view(base, 0);
      assert.equal(inFlight.outcome.line, null);
      assert.equal(inFlight.panel.actionLabel, "Starting…");

      // …and every malformed drive is a no-op rather than a throw.
      for (const event of [null, undefined, {}, { type: "nonsense" }, { type: "submit" }, { type: "choose", field: "assistant", value: "codex" }, { type: "answer" }, { type: "outcome" }, { type: "observe" }]) {
        assert.ok(LAUNCHER_STATE_LIST.includes(view(launcherReduce(base, event), 0).state), `an unusable event (${JSON.stringify(event)}) leaves a declared state`);
      }
      assert.deepEqual(launcherReduce(null, { type: "close" }), launcherRest(), "…and a machine that is not a machine is the resting one");
    },
  },
];
