// Milestone 171 / story 02 — the editor follows the stream, driven headlessly: what each event means
// given the editor's facts (`review-stream.mjs`, ADR-003), and when the five-second poll runs
// (`shouldPoll`). The EventSource, a served route and a canvas replaced in place meet in the smoke
// (test/smoke/diagram-editor.smoke.mjs). node:assert/strict, `{ name, run }` shape.
import assert from "node:assert/strict";
import { CANVAS_UPDATED, CHANGED_ELSEWHERE, STREAM_INITIAL, streamStep } from "@aof/diagrams-ui/review-stream";
import { pendingProposals, shouldPoll } from "@aof/diagrams-ui/editor-state";

const clean = { revision: "r1", dirty: false, writing: false };
// Run events in order, collecting every effect, as the editor would carry them out.
function drive(events, facts = clean, state = STREAM_INITIAL) {
  const effects = [];
  for (const event of events) {
    const next = streamStep(state, event, typeof facts === "function" ? facts() : facts);
    state = next.state; effects.push(...next.effects);
  }
  return { state, effects };
}
const connected = drive([{ type: "connect" }, { type: "open" }, { type: "stamp", review: "v1", revision: "r1" }]).state;
const refreshes = (effects) => effects.filter((effect) => effect === "refresh").length;
const polling = (state, visible = true) => shouldPoll({ open: true, visible, stream: state.stream });

export const reviewStreamTests = [
  // ── R1 · What the architect writes appears in the open editor without a reload ──────────────
  { name: "171/02 E1 · a review event refreshes the panel once", run: () => {
    assert.equal(refreshes(drive([{ type: "review", review: "v2" }], clean, connected).effects), 1);
  } },
  { name: "171/02 E2 · a proposal written by the architect is listed after its event", run: () => {
    const { effects } = drive([{ type: "review", review: "v2" }], clean, connected);
    assert.deepEqual(effects, ["refresh"]);
    // The refresh re-reads `proposals`; the panel lists what it answers as pending — Preview, Accept, Reject.
    const reread = [{ id: "p1", status: "pending", summary: "Split the gateway" }];
    assert.deepEqual(pendingProposals(reread).map((proposal) => proposal.id), ["p1"]);
  } },
  { name: "171/02 · a repeated stamp does not refresh twice", run: () => {
    assert.equal(refreshes(drive([{ type: "review", review: "v2" }, { type: "review", review: "v2" }], clean, connected).effects), 1);
  } },
  { name: "171/02 · the first connection learns the review stamp without refreshing", run: () => {
    assert.equal(refreshes(drive([{ type: "connect" }, { type: "open" }, { type: "stamp", review: "v1", revision: "r1" }]).effects), 0);
  } },
  { name: "171/02 E3 · a quiet minute makes no request", run: () => {
    assert.equal(polling(connected), false, "the connected stream stops the poll, so no proposals request is made");
    assert.deepEqual(drive([], clean, connected).effects, [], "and with no event nothing is done");
  } },

  // ── R2 · The canvas follows a draft saved elsewhere, without losing unsaved work ────────────
  { name: "171/02 E4 · a clean canvas takes the saved draft in place", run: () => {
    const { effects, state } = drive([{ type: "scene", revision: "r2" }], clean, connected);
    assert.deepEqual(effects, ["replace"]);
    assert.equal(state.offered, null, "no changed-elsewhere line");
    assert.equal(CANVAS_UPDATED, "Updated from the saved draft");
  } },
  { name: "171/02 E5 · unsaved edits are kept and a reload is offered", run: () => {
    const offered = drive([{ type: "scene", revision: "r2" }], { ...clean, dirty: true }, connected);
    assert.deepEqual(offered.effects, ["offer-reload"], "the canvas keeps the unsaved shape: nothing replaces it");
    assert.equal(offered.state.offered, "r2");
    assert.match(CHANGED_ELSEWHERE, /changed in another window/);
    const reloaded = drive([{ type: "reload" }], { ...clean, dirty: true }, offered.state);
    assert.deepEqual(reloaded.effects, ["replace", "close-line"]);
    assert.equal(reloaded.state.offered, null);
  } },
  ...["E6 · saves", "E7 · accepts a proposal", "publishes the figure"].map((write) => ({
    name: `171/02 ${write.includes("·") ? write.replace(/ · .*/, " · ") : "· "}the editor's own write (${write.replace(/^E\d+ · /, "")}) never looks like a change made elsewhere`,
    run: () => {
      // The write is in flight when the event arrives, or has answered first — in both orders the
      // canvas is not replaced and no line is shown.
      let facts = { revision: "r1", dirty: true, writing: true };
      const during = drive([{ type: "scene", revision: "r2" }], () => facts, connected);
      assert.deepEqual(during.effects, ["defer"], "held while the write is in flight");
      facts = { revision: "r2", dirty: false, writing: false };
      const after = drive([{ type: "scene", revision: "r2" }], () => facts, during.state);
      assert.deepEqual(after.effects, [], "decided again once the server answered r2: it is the editor's own");
      assert.equal(after.state.offered, null);
    },
  })),

  // ── R3 · When the stream cannot run, the editor still updates ───────────────────────────────
  { name: "171/02 E8 · the poll runs while the stream is answered 404", run: () => {
    assert.equal(polling(drive([{ type: "connect" }, { type: "error" }]).state), true);
  } },
  { name: "171/02 · the poll runs when the stream errors after connecting", run: () => {
    assert.equal(polling(drive([{ type: "error" }], clean, connected).state), true);
  } },
  { name: "171/02 · the poll stops when the stream connects", run: () => {
    assert.equal(polling(drive([{ type: "connect" }]).state), true, "while connecting, the poll still covers");
    assert.equal(polling(connected), false);
  } },
  { name: "171/02 · the poll stops when the stream reconnects after an error", run: () => {
    const { state, effects } = drive([{ type: "error" }, { type: "open" }, { type: "stamp", review: "v2", revision: "r1" }], clean, connected);
    assert.equal(polling(state), false);
    assert.equal(refreshes(effects), 1, "what moved while it was down is one refresh");
  } },
  { name: "171/02 E10 · a hidden tab closes the stream, and showing it refreshes once and reconnects", run: () => {
    const hidden = drive([{ type: "hidden" }], clean, connected);
    assert.deepEqual(hidden.effects, ["disconnect"]);
    assert.equal(polling(hidden.state, false), false, "no poll runs while hidden");
    const shown = drive([{ type: "visible" }, { type: "open" }, { type: "stamp", review: "v9", revision: "r1" }], clean, hidden.state);
    assert.deepEqual(shown.effects, ["refresh", "connect"], "one refresh, one reconnect — the new connection's stamp is only the baseline");
  } },
];
