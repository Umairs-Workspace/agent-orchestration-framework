// Unit coverage for the state-aware primary action mapping (ui/src/board/action.ts
// — DESIGN: the detail panel's primary "Run agent" button is state-aware). Pure
// data: status + ctx in, { kind, label, command?, disabled? } out. Imported here
// the same way the React DetailPanel imports it, so the lifecycle mapping
// (refine → continue → verify, plus blocked/done/view) is asserted headlessly.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { askCardState, primaryAction } from "../../ui/src/board/action.mjs";
import { stripComments } from "../support/source-slice.mjs";

// A minimal WorkItem stub — primaryAction reads only `status` and `ref`.
const item = (status, ref = "03") => ({ ref, type: "milestone", slug: "x", status, title: null, parent: null, dir: "" });

export const boardActionTests = [
  {
    name: "board-action/in-review → Verify running /aof:verify <ref>",
    async run() {
      const a = primaryAction(item("in-review"), { hasBreakdown: true, liveForRef: false });
      assert.equal(a.kind, "verify");
      assert.equal(a.label, "Verify");
      assert.equal(a.command, "/aof:verify 03");
      assert.notEqual(a.disabled, true);
    },
  },
  {
    name: "board-action/not-started WITHOUT a breakdown → Refine running /aof:refine <ref>",
    async run() {
      const a = primaryAction(item("not-started"), { hasBreakdown: false, liveForRef: false });
      assert.equal(a.kind, "refine");
      assert.equal(a.label, "Refine");
      assert.equal(a.command, "/aof:refine 03");
    },
  },
  {
    name: "board-action/not-started WITH a breakdown → Continue running /aof:continue <ref>",
    async run() {
      const a = primaryAction(item("not-started"), { hasBreakdown: true, liveForRef: false });
      assert.equal(a.kind, "continue");
      assert.equal(a.label, "Continue");
      assert.equal(a.command, "/aof:continue 03");
    },
  },
  {
    name: "board-action/in-progress → Continue running /aof:continue <ref>",
    async run() {
      const a = primaryAction(item("in-progress"), { hasBreakdown: true, liveForRef: false });
      assert.equal(a.kind, "continue");
      assert.equal(a.command, "/aof:continue 03");
    },
  },
  {
    // 2026-07-26 (operator, live soak): an item a WORKER was actively executing still
    // offered "Continue", and clicking it dispatched a second run that the assign core
    // refused — "already has an active assignment held by <node>". The row already
    // carries the answer; running work is watched, not restarted.
    name: "board-action/a worker is executing it (session not yet captured) → disabled, names the node, offers NO continue",
    async run() {
      const running = { ...item("in-progress"), execution: { assignmentId: "a1", active: true, state: "running", nodeId: "umamis-mac-mini", sessionId: null, updatedAt: null, branch: null } };
      const a = primaryAction(running, { hasBreakdown: true, liveForRef: false });
      assert.equal(a.kind, "running");
      assert.equal(a.label, "Running on umamis-mac-mini");
      assert.equal(a.disabled, true);
      assert.equal(a.command, undefined, "a running item offers no command to launch");
    },
  },
  {
    // m42 item 6 (reworked at the operator's insistence): the board has ONE terminal
    // surface — the dock — and a running item WITH a captured session opens it as the
    // worker's live session (INTERACTIVE since m42's terminal-input path). A remote
    // session is a SOURCE of the dock, never a second widget.
    name: "board-action/a worker is executing it WITH a captured session → Open terminal opens the dock on the worker's live session",
    async run() {
      const running = { ...item("in-progress"), execution: { assignmentId: "a1", active: true, state: "running", nodeId: "umamis-mac-mini", sessionId: "3ffa37de-ce0c", updatedAt: null, branch: null } };
      const a = primaryAction(running, { hasBreakdown: true, liveForRef: false });
      assert.equal(a.kind, "mirror");
      assert.equal(a.label, "Open terminal — umamis-mac-mini");
      assert.equal(a.needsInput, false, "a working session is not waiting on a human");
      assert.equal(a.nodeId, "umamis-mac-mini");
      assert.equal(a.sessionId, "3ffa37de-ce0c", "the full (nodeId, sessionId) tuple rides the action — the dock needs both");
      assert.equal(a.disabled, undefined, "watchable running work is not a dead end");
    },
  },
  {
    // m42 interactive worker terminals — a session the worker reports WAITING ON A
    // HUMAN (code: needs-input) leads with that: the terminal affordance is the
    // door the answer is typed through, not just a viewport.
    name: "board-action/a running session waiting on a human (code: needs-input) → the affordance says Answer",
    async run() {
      const waiting = { ...item("in-progress"), execution: { assignmentId: "a1", active: true, state: "running", nodeId: "umamis-mac-mini", sessionId: "3ffa37de-ce0c", code: "needs-input", updatedAt: null, branch: null } };
      const a = primaryAction(waiting, { hasBreakdown: true, liveForRef: false });
      assert.equal(a.kind, "mirror");
      assert.equal(a.label, "Answer on umamis-mac-mini");
      assert.equal(a.needsInput, true);
      assert.equal(a.sessionId, "3ffa37de-ce0c");
    },
  },
  {
    // The mirror case: a SETTLED remote run (withdrawn/done/failed) is not executing, so
    // the item is continuable again — the guard must key on `active`, not on the mere
    // presence of an execution record (every finished mesh run leaves one behind).
    name: "board-action/a SETTLED remote run → Continue is offered again",
    async run() {
      const settled = { ...item("in-progress"), execution: { assignmentId: "a1", active: false, state: "withdrawn", nodeId: "umamis-mac-mini", sessionId: null, updatedAt: null, branch: null } };
      const a = primaryAction(settled, { hasBreakdown: true, liveForRef: false });
      assert.equal(a.kind, "continue");
      assert.equal(a.command, "/aof:continue 03");
    },
  },
  {
    // A LOCAL dock session still wins over everything — unchanged.
    name: "board-action/a live local session wins over a remote execution record",
    async run() {
      const running = { ...item("in-progress"), execution: { assignmentId: "a1", active: true, state: "running", nodeId: "umamis-mac-mini", sessionId: null, updatedAt: null, branch: null } };
      const a = primaryAction(running, { hasBreakdown: true, liveForRef: true });
      assert.equal(a.kind, "view");
      assert.equal(a.label, "View terminal");
    },
  },
  {
    name: "board-action/blocked → disabled, no command",
    async run() {
      const a = primaryAction(item("blocked"), { hasBreakdown: true, liveForRef: false });
      assert.equal(a.kind, "blocked");
      assert.equal(a.label, "Blocked");
      assert.equal(a.disabled, true);
      assert.equal(a.command, undefined);
    },
  },
  {
    name: "board-action/done → ad-hoc Run agent with no command",
    async run() {
      const a = primaryAction(item("done"), { hasBreakdown: true, liveForRef: false });
      assert.equal(a.kind, "adhoc");
      assert.equal(a.label, "Run agent");
      assert.equal(a.command, undefined);
    },
  },
  {
    name: "board-action/null status → ad-hoc Run agent (unknown falls through)",
    async run() {
      const a = primaryAction(item(null), { hasBreakdown: true, liveForRef: false });
      assert.equal(a.kind, "adhoc");
      assert.equal(a.command, undefined);
    },
  },
  {
    name: "board-action/a live session for the ref → View terminal (takes precedence over status)",
    async run() {
      // Even an in-review item shows "View terminal" when a session is live for it.
      const a = primaryAction(item("in-review"), { hasBreakdown: true, liveForRef: true });
      assert.equal(a.kind, "view");
      assert.equal(a.label, "View terminal");
      assert.equal(a.command, undefined);
    },
  },
  // 131/04 — hoisted below.
  ...askCardTests(),
];

// ---- 131/05 tasks 01 and 02 — the ask card's one pure function, and the component that paints it --
const T = (clock) => Date.parse(clock);
const at = (hhmm) => `2026-09-23T${hhmm}:00.000Z`;
const UB = { actor: "umami", via: "board", node: "node-7297" };
const A = (fields = {}) => ({
  runId: "R1", state: "waiting", question: "Decision needed: move the residue?\nOptions: a, b", phase: "build",
  askedAt: at("17:00"), parkedAt: null, answeredAt: null, by: null, answer: null, node: "node-7297", local: true, sessionId: "S1", scope: "03",
  ...fields,
});
const D = (fields = {}) => ({ ok: true, ref: "03/01", runId: "R1", delivery: "waiting", state: "answered", by: UB, answeredAt: at("17:12"), resume: null, ...fields });
const CTX = { ref: "03/01", phase: "idle", text: "", expanded: false, nowMs: T(at("17:12")) };
const U = "The session's question could not be read — open its terminal to see it.";
const PARKED_NOTICE = "The session stopped waiting at its bound. Your answer resumes it.";
const HELPER = "Sent to the session word for word and kept on the run record.";
const workerAsk = () => A({ runId: null, state: "waiting", question: null, phase: null, local: false, node: "node-2976", sessionId: "S9" });
const EX = { active: true, state: "running", code: "needs-input", nodeId: "node-2976", sessionId: "S9" };

const readUi = async (rel) => stripComments(await readFile(new URL(`../../ui/src/board/${rel}`, import.meta.url), "utf8"));

function askCardTests() {
  return [
    {
      name: "131/05 task01 — a waiting local ask reads as a question with an empty reply and no fast path",
      run() {
        const card = askCardState(A(), CTX);
        assert.deepEqual(Object.keys(card), ["state", "heading", "cost", "question", "unreadable", "toggle", "notice", "helper", "button", "receipt", "message"]);
        assert.deepEqual(card, {
          state: "waiting", heading: "WAITING ON YOU", cost: "build · 12m", question: "Decision needed: move the residue?\nOptions: a, b", unreadable: null,
          toggle: "Show the full question", notice: null, helper: HELPER, button: { label: "Send answer", disabled: true, busy: false }, receipt: null, message: null,
        });
      },
    },
    {
      name: "131/05 task01 — Send is enabled only by words, and never by whitespace (fourteen rows)",
      run() {
        const rows = [
          ["", true], [" ", true], ["\n\n", true], ["\t \r\n", true], [" 　", true], ["\u000b", true], [undefined, true], [null, true], [42, true],
          ["b", false], ["  b  ", false], ["take b —\n  keep the tests", false], ["​", false], ["a".repeat(8001), false],
        ];
        for (const [text, disabled] of rows) assert.equal(askCardState(A(), { ...CTX, text }).button.disabled, disabled, JSON.stringify(text));
      },
    },
    {
      name: "131/05 task01 — the heading, the cost and the button follow the state the ask is in (twelve rows)",
      run() {
        const YOU = { actor: "you", via: "cli", node: "node-7297" };
        const rows = [
          [A({ state: "parked", parkedAt: "2026-09-23T19:10:00.000Z" }), { nowMs: T("2026-09-23T20:10:00.000Z") }, "parked", "PARKED — UNANSWERED", "build · asked 3h 10m · parked 1h", PARKED_NOTICE, "Send answer and resume"],
          [A({ parkedAt: at("17:10") }), {}, "parked", "PARKED — UNANSWERED", "build · asked 12m · parked 2m", PARKED_NOTICE, "Send answer and resume"],
          [A({ state: "parked", askedAt: null, parkedAt: at("17:10") }), {}, "parked", "PARKED — UNANSWERED", "build · parked 2m", PARKED_NOTICE, "Send answer and resume"],
          [A({ state: "answered", parkedAt: "2026-09-23T19:10:00.000Z", answeredAt: "2026-09-23T20:00:00.000Z", by: UB, answer: "take b" }), { nowMs: T("2026-09-23T20:10:00.000Z") }, "answered", "ANSWERED BY UMAMI", "build · 3h", null, null],
          [A(), { sent: D(), nowMs: T(at("17:30")) }, "answered", "ANSWERED BY UMAMI", "build · 12m", null, null],
          [A({ state: "parked", parkedAt: at("17:10") }), { sent: D({ delivery: "parked", resume: "aof work loop 03 --resume" }) }, "answered", "ANSWERED BY UMAMI", "build · 12m", null, null],
          [A({ state: "answered", answeredAt: at("17:05"), by: YOU }), {}, "answered", "ANSWERED BY YOU", "build · 5m", null, null],
          [A({ state: "answered", answeredAt: null, by: null }), {}, "answered", "ANSWERED BY YOU", "build", null, null],
          [A({ phase: null }), {}, "waiting", "WAITING ON YOU", "12m", null, "Send answer"],
          [A({ phase: "  " }), {}, "waiting", "WAITING ON YOU", "12m", null, "Send answer"],
          [A({ askedAt: null }), {}, "waiting", "WAITING ON YOU", "build", null, "Send answer"],
          [A({ phase: null, askedAt: null }), {}, "waiting", "WAITING ON YOU", null, null, "Send answer"],
        ];
        for (const [index, [ask, ctx, state, heading, cost, notice, label]] of rows.entries()) {
          const card = askCardState(ask, { ...CTX, ...ctx });
          assert.deepEqual([card.state, card.heading, card.cost, card.notice, card.button?.label ?? null], [state, heading, cost, notice, label], `row ${index}`);
        }
      },
    },
    {
      name: "131/05 task01 — the wait ticks on the board's clock and is spelled by the one formatter (fourteen rows)",
      run() {
        const rows = [
          ["2026-09-23T17:12:00.000Z", "2026-09-23T17:12:00.000Z", "build · 0s"],
          ["2026-09-23T17:11:01.000Z", "2026-09-23T17:12:00.000Z", "build · 59s"],
          ["2026-09-23T17:11:00.000Z", "2026-09-23T17:12:00.000Z", "build · 1m"],
          ["2026-09-23T17:00:00.000Z", "2026-09-23T17:12:59.999Z", "build · 12m"],
          ["2026-09-23T16:12:00.001Z", "2026-09-23T17:12:00.000Z", "build · 59m"],
          ["2026-09-23T16:12:00.000Z", "2026-09-23T17:12:00.000Z", "build · 1h"],
          ["2026-09-23T14:12:00.000Z", "2026-09-23T17:12:00.000Z", "build · 3h"],
          ["2026-09-23T14:02:00.000Z", "2026-09-23T17:12:00.000Z", "build · 3h 10m"],
          ["2026-09-22T17:12:00.001Z", "2026-09-23T17:12:00.000Z", "build · 23h 59m"],
          ["2026-09-22T17:12:00.000Z", "2026-09-23T17:12:00.000Z", "build · 1d"],
          ["2026-09-21T13:12:00.000Z", "2026-09-23T17:12:00.000Z", "build · 2d 4h"],
          ["2026-09-23T17:12:05.000Z", "2026-09-23T17:12:00.000Z", "build · 0s"],
          ["yesterday", "2026-09-23T17:12:00.000Z", "build"],
          ["2026-09-23T17:00:00.000Z", "not a date", "build"],
        ];
        for (const [askedAt, now, cost] of rows) assert.equal(askCardState(A({ askedAt }), { ...CTX, nowMs: T(now) }).cost, cost, `${askedAt} → ${now}`);
      },
    },
    {
      name: "131/05 task01 — the question is shown verbatim, or said to be unreadable, never re-worded (ten rows)",
      run() {
        const rows = [
          ["```sh\nrm -rf .\n```", "```sh\nrm -rf .\n```", null],
          ["<img src=x onerror=alert(1)>", "<img src=x onerror=alert(1)>", null],
          ["**Decide** [here](javascript:alert(1))", "**Decide** [here](javascript:alert(1))", null],
          ["  Move the residue?  \n", "  Move the residue?  \n", null],
          ["a\r\n\r\n\r\nb", "a\r\n\r\n\r\nb", null],
          ["a".repeat(5000), "a".repeat(5000), null],
          ["", "", U],
          ["  \n\t ", "  \n\t ", U],
          [null, null, U],
          [42, null, U],
        ];
        for (const [question, shown, unreadable] of rows) {
          const card = askCardState(A({ question }), CTX);
          assert.equal(card.question, shown, JSON.stringify(question).slice(0, 40));
          assert.equal(card.unreadable, unreadable, JSON.stringify(question).slice(0, 40));
        }
      },
    },
    {
      name: "131/05 task01 — a worker's ask names its node in the cost and the helper, and nothing else changes (five rows)",
      run() {
        const rows = [
          [{ sessionId: "S9" }, "build · 12m · on node-2976"],
          [{ runId: null, sessionId: "S9", phase: null }, "12m · on node-2976"],
          [{ askedAt: null }, "build · on node-2976"],
          [{ phase: null, askedAt: null }, "on node-2976"],
          [{ askedAt: "2026-09-23T14:02:00.000Z" }, "build · 3h 10m · on node-2976"],
        ];
        for (const [fields, cost] of rows) {
          const remote = askCardState(A({ local: false, node: "node-2976", ...fields }), CTX);
          const local = askCardState(A({ local: true, node: "node-2976", ...fields }), CTX);
          assert.equal(remote.cost, cost);
          assert.ok(remote.helper.endsWith(" Delivered to node-2976."), remote.helper);
          const { cost: _c, helper: _h, ...rest } = remote;
          const { cost: _lc, helper: _lh, ...localRest } = local;
          assert.deepEqual(rest, localRest, `${JSON.stringify(fields)}: every other key equals the local case's`);
        }
      },
    },
    {
      name: "131/05 task01 — sending holds the words and says it is busy (four rows)",
      run() {
        for (const ask of [A(), A({ state: "parked", parkedAt: at("17:10") }), workerAsk(), A({ question: null })]) {
          const card = askCardState(ask, { ...CTX, phase: "sending", text: "take b" });
          assert.deepEqual(card.button, { label: "Sending…", disabled: true, busy: true });
          assert.equal(card.message, null);
        }
      },
    },
    {
      name: "131/05 task01 — an answer is a receipt held in place, naming who and how it resumes (sixteen rows)",
      run() {
        const parked = { state: "parked", parkedAt: at("17:03") };
        const answered = (fields) => A({ state: "answered", answeredAt: at("17:05"), by: UB, ...fields });
        const rows = [
          [A(), { sent: D(), nowMs: T(at("17:30")) }, "✓ Answered by umami · 12m — the session is resuming"],
          [A(parked), { sent: D({ delivery: "parked", resume: "aof work loop 03 --resume" }) }, "✓ Answered by umami · 12m — resumes with the loop (aof work loop 03 --resume)"],
          [A(parked), { sent: D({ delivery: "parked", resume: "aof work loop 03/01 --resume" }) }, "✓ Answered by umami · 12m — resumes with the loop (aof work loop 03/01 --resume)"],
          [A(parked), { sent: D({ delivery: "parked", resume: null }) }, "✓ Answered by umami · 12m — resumes with the loop (aof work loop 03 --resume)"],
          [answered({ answer: "take b" }), { nowMs: T(at("17:30")) }, "✓ Answered by umami · 5m — the session is resuming"],
          [answered({ parkedAt: at("17:03") }), {}, "✓ Answered by umami · 5m — resumes with the loop (aof work loop 03 --resume)"],
          [answered({ scope: null, parkedAt: at("17:03") }), { ref: "03/01" }, "✓ Answered by umami · 5m — resumes with the loop (aof work loop 03 --resume)"],
          [answered({ scope: "  ", parkedAt: at("17:03") }), { ref: "03/01" }, "✓ Answered by umami · 5m — resumes with the loop (aof work loop 03 --resume)"],
          [answered({ scope: null, parkedAt: at("17:03") }), { ref: "03" }, "✓ Answered by umami · 5m — resumes with the loop (aof work loop 03 --resume)"],
          [answered({ scope: "03/01", parkedAt: at("17:03") }), { ref: "03/01" }, "✓ Answered by umami · 5m — resumes with the loop (aof work loop 03/01 --resume)"],
          [answered({ by: { actor: "  ", via: "cli", node: null } }), {}, "✓ Answered by you · 5m — the session is resuming"],
          [answered({ by: null }), {}, "✓ Answered by you · 5m — the session is resuming"],
          [A(), { sent: D({ by: { actor: "", via: "board", node: null } }) }, "✓ Answered by you · 12m — the session is resuming"],
          [A({ askedAt: null }), { sent: D() }, "✓ Answered by umami — the session is resuming"],
          [A(), { sent: D({ answeredAt: "2026-09-23T16:59:58.000Z" }) }, "✓ Answered by umami · 0s — the session is resuming"],
          [workerAsk(), { sent: D({ runId: null, delivery: "mesh", state: "dispatched" }) }, "✓ Answered by umami · 12m — the session is resuming"],
        ];
        for (const [index, [ask, ctx, receipt]] of rows.entries()) {
          const card = askCardState(ask, { ...CTX, ...ctx });
          assert.equal(card.state, "answered", `row ${index}`);
          assert.equal(card.receipt, receipt, `row ${index}`);
          assert.equal(card.button, null, `row ${index}: no button`);
          assert.equal(card.helper, null, `row ${index}: no helper`);
        }
      },
    },
    {
      name: "131/05 task01 — a refusal is named by its code and keeps what was typed (sixteen rows)",
      run() {
        const NO_LONGER = "✕ Not sent — the session is no longer waiting";
        const UNREACHABLE = "✕ Not sent — node-2976 is unreachable";
        const rows = [
          [true, "ask-already-answered", "already answered by umami", NO_LONGER],
          [true, "answer-not-waiting", "03/01 has no waiting ask", NO_LONGER],
          [false, "session-not-parked", "session S9 is not parked", NO_LONGER],
          [false, "terminal-resume-not-started", "the worker refused before spawn", UNREACHABLE],
          [false, "terminal-resume-target-not-connected", "target not connected", UNREACHABLE],
          [false, "session-target-not-connected", "session target not connected", UNREACHABLE],
          [true, "answer-empty", "the answer is empty", "✕ Not sent — the answer is empty"],
          [true, "answer-too-long", "the answer is over 8,000 characters", "✕ Not sent — the answer is over 8,000 characters"],
          [true, "answer-control-chars", "the answer holds a control character", "✕ Not sent — the answer holds a control character"],
          [true, "answer-actor-invalid", "the actor cannot be recorded", "✕ Not sent — the actor cannot be recorded"],
          [false, "resume-capacity-full", "no resume slot is free", "✕ Not sent — no resume slot is free"],
          [true, "non-loopback-host", "non-loopback host", "✕ Not sent — non-loopback host"],
          [true, "ref-not-found", "no item 03/01", "✕ Not sent — no item 03/01"],
          [true, "ASK-ALREADY-ANSWERED", "x", "✕ Not sent — x"],
          [true, "session-exploded", "Request failed (500)", "✕ Not sent — Request failed (500)"],
          [true, undefined, "Failed to fetch", "✕ Not sent — Failed to fetch"],
        ];
        for (const [local, code, message, text] of rows) {
          const card = askCardState(A({ local, node: "node-2976" }), { ...CTX, phase: "error", text: "take b", error: { code, message } });
          assert.deepEqual(card.message, { text, title: message }, String(code));
          assert.deepEqual(card.button, { label: "Send answer", disabled: false, busy: false }, String(code));
          assert.equal(card.state, "waiting", String(code));
        }
      },
    },
    {
      name: "131/05 task01 — no ask is no card",
      run() {
        assert.equal(askCardState(null, CTX), null);
        assert.equal(askCardState(undefined, CTX), null);
      },
    },
    {
      name: "131/05 task01 — while an ask stands, the header offers the terminal and never a second answer (ten rows)",
      run() {
        const ctx = { hasBreakdown: true, liveForRef: false };
        const rows = [
          [{ status: "in-progress", execution: EX, ask: workerAsk() }, "mirror", "Open terminal — node-2976"],
          [{ status: "in-progress", execution: EX }, "mirror", "Answer on node-2976"],
          [{ status: "in-progress", execution: EX, ask: null }, "mirror", "Answer on node-2976"],
          [{ status: "in-progress", execution: EX, ask: A({ state: "answered", answeredAt: at("17:05"), by: UB }) }, "mirror", "Open terminal — node-2976"],
          [{ status: "in-progress", execution: { ...EX, code: null }, ask: A() }, "mirror", "Open terminal — node-2976"],
          [{ status: "in-progress", execution: { ...EX, code: null } }, "mirror", "Open terminal — node-2976"],
          [{ status: "in-progress", execution: { ...EX, sessionId: null }, ask: A() }, "running", "Running on node-2976"],
          [{ status: "in-progress", ask: A() }, "continue", "Continue"],
          [{ status: "in-review", ask: A({ state: "parked", parkedAt: at("17:03") }) }, "verify", "Verify"],
          [{ status: "blocked", ask: A() }, "blocked", "Blocked"],
        ];
        for (const [index, [fields, kind, label]] of rows.entries()) {
          const action = primaryAction({ ...item(fields.status), ...fields }, ctx);
          assert.equal(action.kind, kind, `row ${index}`);
          assert.equal(action.label, label, `row ${index}`);
        }
      },
    },
    {
      name: "131/05 task01 — the card's words come from the one formatter, and the board spells no second one",
      async run() {
        const source = await readUi("action.mjs");
        assert.match(source, /import \{[^}]*\bformatElapsed\b[^}]*\} from "\.\.\/\.\.\/\.\.\/src\/notify\/form\.mjs"/u);
        assert.match(source, /import \{[^}]*\beventPhrase\b[^}]*\} from "\.\.\/\.\.\/\.\.\/src\/notify\/form\.mjs"/u);
        assert.ok(!/waiting on you/iu.test(source), "action.mjs spells no `waiting on you`");
        for (const ladder of ["60000", "3600000", "86400000", "% 60", "/ 60"]) assert.ok(!source.includes(ladder), `no ${ladder}`);
        assert.ok(!/\}[smhd]`/u.test(source), "no template literal ending }s, }m, }h or }d");
        const types = await readUi("action.d.mts");
        assert.match(types, /export function askCardState\(/u);
        const shape = types.slice(types.indexOf("export type AskCardState"));
        const keys = [...shape.slice(0, shape.indexOf("};")).matchAll(/^\s{2}(\w+):/gmu)].map((match) => match[1]);
        assert.deepEqual(keys, ["state", "heading", "cost", "question", "unreadable", "toggle", "notice", "helper", "button", "receipt", "message"]);
      },
    },
    {
      name: "131/05 task02 — the panel holds exactly the import and the mount, first in its body",
      async run() {
        const panel = await readUi("DetailPanel.tsx");
        assert.equal((panel.match(/^import \{ AskCard \} from "\.\/AskCard";$/gmu) ?? []).length, 1);
        assert.equal((panel.match(/<AskCard\b/gu) ?? []).length, 1);
        const lines = panel.split(/\r?\n/u);
        const mount = lines.findIndex((line) => line.includes("<AskCard"));
        assert.match(lines[mount], /<AskCard\b.*\/>\s*$/u, "the element is on one line");
        assert.match(lines[mount - 1], /className="min-h-0 flex-1 overflow-y-auto p-4">\s*$/u, "directly after the body region's opening tag");
        assert.match(lines[mount + 1], /^\s*<DocBody\b/u, "directly before <DocBody");
        const raw = await readFile(new URL("../../ui/src/board/DetailPanel.tsx", import.meta.url), "utf8");
        assert.ok(raw.split(/\r?\n/u).length <= 1000, "at most 1,000 lines");
      },
    },
    {
      name: "131/05 task02 — the card reads the ask fact and the pure state, and nothing else decides a word",
      async run() {
        const card = await readUi("AskCard.tsx");
        assert.match(card, /import \{ askCardState \} from "\.\/action\.mjs";/u);
        assert.match(card, /import \{ workApi \} from "\.\/api";/u);
        assert.ok(card.includes("item.ask"), "reads item.ask");
        assert.ok(!card.includes(".execution"), "never reads .execution");
        assert.ok(!card.includes("./Markdown"), "imports nothing from ./Markdown");
        assert.ok(!card.includes("dangerouslySetInnerHTML"));
        const question = card.slice(card.indexOf("ref={questionRef}") - 200, card.indexOf("{card.question}"));
        assert.ok(question.includes("whitespace-pre-wrap"), "the question's element is whitespace-pre-wrap");
      },
    },
    {
      name: "131/05 task02 — the reply has no fast path (eleven facts)",
      async run() {
        const card = await readUi("AskCard.tsx");
        assert.ok(!/\bplaceholder\b/u.test(card), "no placeholder");
        assert.ok(!card.includes("defaultValue"), "no defaultValue");
        assert.match(card, /const \[text, setText\] = useState\(""\);/u, "text starts empty");
        assert.equal((card.match(/\bsetText\(/gu) ?? []).length, 1, "set only from the textarea's onChange");
        assert.match(card, /onChange=\{\(event\) => setText\(event\.target\.value\)\}/u);
        for (const key of ["onKeyDown", "onKeyUp", "onKeyPress", "addEventListener"]) assert.ok(!card.includes(key), `no ${key}`);
        assert.ok(!card.includes("<form") && !card.includes("onSubmit"), "no <form, no onSubmit");
        // A JSX tag's attributes hold `=>`, so each tag is sliced from its name to its `className=`.
        const tagsOf = (name) => [...card.matchAll(new RegExp(`<${name}\\b`, "gu"))].map((match) => card.slice(match.index, card.indexOf("className=", match.index)));
        const buttons = tagsOf("button");
        assert.equal(buttons.length, 2, "exactly two <button elements");
        for (const button of buttons) assert.match(button, /type="button"/u);
        assert.equal((card.match(/workApi\.answer\(/gu) ?? []).length, 1, "one path reaches workApi.answer");
        assert.equal((card.match(/onClick=\{\(\) => void send\(\)\}/gu) ?? []).length, 1, "one onClick sends");
        const textarea = tagsOf("textarea")[0] ?? "";
        assert.equal((card.match(/<textarea\b/gu) ?? []).length, 1, "one textarea");
        assert.match(textarea, /value=\{text\}/u);
        assert.match(textarea, /onChange=/u);
        assert.match(textarea, /readOnly=\{card\.button\?\.busy === true\}/u);
        const id = textarea.match(/id=\{(\w+)\}/u)?.[1];
        assert.ok(id, "the textarea has an id");
        assert.match(card, new RegExp(`<label htmlFor=\\{${id}\\}[^>]*>\\s*Your answer\\s*</label>`, "u"), "its id is the htmlFor of the Your answer label");
        const send = buttons.find((button) => button.includes("void send()")) ?? "";
        assert.match(send, /disabled=\{card\.button\?\.disabled\}/u);
        assert.match(send, /aria-busy=\{card\.button\?\.busy\}/u);
        assert.ok(!/text-amber-/u.test(card), "no text-amber- class");
        const amber = [...new Set(card.match(/\b(?:border|bg)-amber-[\w/]+/gu))].sort();
        assert.deepEqual(amber, ["bg-amber-500", "bg-amber-500/5", "border-amber-500/40"]);
        const slot = card.match(/[^\n]*aria-live="polite"[^\n]*/u)?.[0] ?? "";
        assert.ok(slot.includes("<p aria-live=\"polite\""), "the slot is an element");
        const before = card.slice(Math.max(0, card.indexOf('aria-live="polite"') - 40), card.indexOf('aria-live="polite"'));
        assert.ok(!/&&\s*\(?\s*<p\s*$|\?\s*\(?\s*<p\s*$/u.test(before), "the slot sits behind no && or ternary");
        for (const lib of ["./Markdown", "marked", "remark", "react-markdown", "innerHTML"]) assert.ok(!card.includes(lib), `no ${lib}`);
        for (const word of ["Send answer", "WAITING ON YOU", "Not sent", "Answered by", "Delivered to"]) assert.ok(!card.includes(word), `spells no ${word}`);
      },
    },
    {
      name: "131/05 task02 — the client posts the three keys to the one route and keeps the refusal's code; the wire type carries the ask fact",
      async run() {
        const api = await readUi("api.ts");
        const answer = api.slice(api.indexOf("async answer("), api.indexOf("async feedback("));
        assert.match(answer, /fetch\("\/api\/work\/answer", \{/u);
        assert.match(answer, /method: "POST"/u);
        assert.match(answer, /"content-type": "application\/json"/u);
        assert.match(answer, /body: JSON\.stringify\(\{ ref, text, actor \}\)/u);
        assert.match(answer, /if \(!response\.ok\) throw await codedError\(response\);/u);
        let fetches = 0;
        const walk = async (dir) => {
          for (const entry of await readdir(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) await walk(full);
            else fetches += ((await readFile(full, "utf8")).match(/fetch\("\/api\/work\/answer"/gu) ?? []).length;
          }
        };
        await walk(fileURLToPath(new URL("../../ui/src", import.meta.url)));
        assert.equal(fetches, 1, "ui/src holds exactly one fetch of the answer route");
        assert.match(api, /\n\s{2}ask\?: AskFact;/u, "WorkItem declares an optional ask");
        const fact = api.slice(api.indexOf("export type AskFact"), api.indexOf("};", api.indexOf("export type AskFact")));
        const keys = [...fact.matchAll(/^\s{2}(\w+):/gmu)].map((match) => match[1]);
        assert.deepEqual(keys, ["runId", "state", "question", "phase", "askedAt", "parkedAt", "answeredAt", "by", "answer", "node", "local", "sessionId", "scope"]);
        assert.match(fact, /local: boolean;/u);
        assert.match(fact, /state: "waiting" \| "parked" \| "answered";/u);
      },
    },
    {
      name: "131/05 task02 — the board type-checks with the card",
      run() {
        const tsc = spawnSync(process.execPath, [fileURLToPath(new URL("../../node_modules/typescript/bin/tsc", import.meta.url)), "-b"], {
          cwd: fileURLToPath(new URL("../../ui", import.meta.url)),
          encoding: "utf8",
          env: { ...process.env, NODE_NO_WARNINGS: "1" },
        });
        assert.equal(tsc.status, 0, `tsc -b in ui/ is clean:\n${tsc.stdout}${tsc.stderr}`);
      },
    },
  ];
}
