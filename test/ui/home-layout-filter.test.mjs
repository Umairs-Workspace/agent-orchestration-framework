// milestone 49 / story 02 / task 02 — THE LAYOUT FILTER (@executable).
//
// Every scenario and every Examples ROW of
// `.../02_story_home-core/tasks/02_the-layout-filter.feature`, driven against the SHIPPED
// `ui/src/home/layout.mjs` with a HAND-WRITTEN storage double whose `getItem` and `setItem` can
// each be made to throw, to return a non-string, or to be absent entirely.
//
// THE TEST PROCESS HAS NO DOM, and that is the point: `globalThis.window`,
// `globalThis.document` and `globalThis.localStorage` are all undefined here, so a module that
// reached for one would not be "less testable" — it would be a crash. One scenario goes further
// and POISONS all three, which catches what a text sweep cannot: a global reached through a
// computed property, an aliased binding, or a helper imported from elsewhere.
//
// ISOLATION. No `~/.aof`, no store, no server, no port.
import assert from "node:assert/strict";
import { LAYOUT_SCHEMA_VERSION, LAYOUT_STORAGE_KEY, composeHomeLayout, saveHomeLayout } from "../../ui/src/home/layout.mjs";
import { paneKeyOf, paneTuple } from "../../ui/src/home/socket-cap.mjs";
import { TERMINAL_STATE_LIST, UNKNOWN_STATE } from "../../ui/src/terminal/state-ramp.mjs";

const row = (nodeId, sessionId, extra = {}) => ({ nodeId, sessionId, repo: "demo", ...extra });
const stored = (panes, focus = null, version = LAYOUT_SCHEMA_VERSION) => JSON.stringify({ version, panes, focus });

/** The hand-written double. Every knob the feature's Background names, and nothing else. */
function storageDouble({ value = null, onRead, onWrite, noGetItem = false, noSetItem = false, getterThrows = false } = {}) {
  const calls = { getItem: 0, setItem: 0 };
  let held = value;
  const double = {
    calls,
    get raw() {
      return held;
    },
  };
  if (getterThrows) {
    Object.defineProperty(double, "getItem", {
      enumerable: true,
      get() {
        throw new Error("SecurityError: the property ACCESS itself throws (private mode)");
      },
    });
  } else if (!noGetItem) {
    double.getItem = (key) => {
      calls.getItem += 1;
      assert.equal(key, LAYOUT_STORAGE_KEY, "the composer reads its own per-origin key");
      if (onRead) return onRead();
      return held;
    };
  }
  if (!noSetItem) {
    double.setItem = (key, next) => {
      calls.setItem += 1;
      if (onWrite) return onWrite(key, next);
      held = next;
      return undefined;
    };
  }
  return double;
}

const A = row("n-A", "sess-A");
const B = row("n-B", "sess-B");
const C = row("n-C", "sess-C");
const D = row("n-D", "sess-D");
const E = row("n-E", "sess-E");
const NEW = row("worker-1", "sess-NEW");

// ── Scenario Outline: a live row is never suppressed by anything storage can hold ─────────
const WATCHED_SET_ROWS = [
  ["a brand new session, never seen before", stored([["n-A", "sess-A"]])],
  ["an empty stored list", stored([])],
  ["a stored list naming only other sessions", stored([["x", "1"], ["y", "2"], ["z", "3"]])],
  ["a stored key that looks like a hidden set", JSON.stringify({ version: LAYOUT_SCHEMA_VERSION, panes: [["worker-1", "sess-NEW"]], focus: null, hidden: [["worker-1", "sess-NEW"]] })],
  ["a stored key spelled `excluded`", JSON.stringify({ version: LAYOUT_SCHEMA_VERSION, panes: [["worker-1", "sess-NEW"]], focus: null, excluded: [["worker-1", "sess-NEW"]] })],
  ["a stored per-tuple visible flag", JSON.stringify({ version: LAYOUT_SCHEMA_VERSION, panes: [{ nodeId: "worker-1", sessionId: "sess-NEW", visible: false }], focus: null })],
  ["a stored per-tuple subscribed flag", JSON.stringify({ version: LAYOUT_SCHEMA_VERSION, panes: [{ nodeId: "worker-1", sessionId: "sess-NEW", subscribed: false }], focus: null })],
  ["a stored layout from a different origin", JSON.stringify({ version: LAYOUT_SCHEMA_VERSION, "https://other.example": { panes: [["worker-1", "sess-NEW"]] } })],
];

// ── Scenario Outline: every way storage can fail degrades to the live rows ────────────────
const DEGRADE_ROWS = [
  // nothing is stored
  ["no storage object at all", () => undefined],
  ["a null storage object", () => null],
  ["a storage object with no `getItem`", () => ({})],
  ["the key has never been written", () => storageDouble({ value: null })],
  ["the key holds an empty string", () => storageDouble({ value: "" })],
  // something is stored and it cannot be used
  ["truncated JSON", () => storageDouble({ value: "{" })],
  ["the literal string null", () => storageDouble({ value: "null" })],
  ["a JSON number", () => storageDouble({ value: "7" })],
  ["a JSON string", () => storageDouble({ value: '"worker-1"' })],
  ["a JSON array of strings", () => storageDouble({ value: '["worker-1","sess-A"]' })],
  ["an object with none of the known keys", () => storageDouble({ value: '{"theme":"dark"}' })],
  ["the right keys, the wrong types", () => storageDouble({ value: '{"panes":7,"focus":[]}' })],
  ["tuples that are not pairs", () => storageDouble({ value: stored([["worker-1"], ["a", "b", "c"]]) })],
  ["tuples whose halves are not strings", () => storageDouble({ value: stored([[1, 2], [null, null]]) })],
  ["a value written by an older schema", () => storageDouble({ value: stored([["n-B", "sess-B"]], ["n-B", "sess-B"], LAYOUT_SCHEMA_VERSION - 1) })],
  ["a value written by a NEWER schema", () => storageDouble({ value: stored([["n-B", "sess-B"]], ["n-B", "sess-B"], LAYOUT_SCHEMA_VERSION + 1) })],
  [
    "a 5 MB stored value",
    () => storageDouble({ value: stored(Array.from({ length: 200000 }, (_unused, index) => [`ghost-${index}`, `sess-${index}`])) }),
  ],
  // storage itself refuses
  [
    "reading throws (private mode)",
    () =>
      storageDouble({
        onRead() {
          const error = new Error("The operation is insecure.");
          error.name = "SecurityError";
          throw error;
        },
      }),
  ],
  ["reading returns a non-string", () => storageDouble({ onRead: () => ({ panes: [["n-B", "sess-B"]] }) })],
  ["reading returns undefined", () => storageDouble({ onRead: () => undefined })],
  ["the property access itself throws", () => storageDouble({ getterThrows: true })],
];

// ── Scenario Outline: a save that cannot be written is a no-op ────────────────────────────
const WRITE_FAILURE_ROWS = [
  [
    "a quota error",
    () =>
      storageDouble({
        onWrite() {
          const error = new Error("The quota has been exceeded.");
          error.name = "QuotaExceededError";
          throw error;
        },
      }),
  ],
  [
    "a security error",
    () =>
      storageDouble({
        onWrite() {
          const error = new Error("The operation is insecure.");
          error.name = "SecurityError";
          throw error;
        },
      }),
  ],
  ["no `setItem` at all", () => storageDouble({ noSetItem: true })],
  ["a read-only storage", () => storageDouble({ onWrite: () => undefined })],
  ["storage is absent", () => undefined],
];

// ── Scenario Outline: the composed focus is always null or a tuple in the composed rows ───
const FOCUS_ROWS = [
  ["the focused session is live", ["n-B", "sess-B"], ["n-B", "sess-B"]],
  ["the focused session has gone", ["n-Z", "sess-GONE"], null],
  ["nothing was focused", null, null],
  ["the key is absent", undefined, null],
  ["focus stored as a position", 1, null],
  ["focus stored as a bare session id", "sess-B", null],
  ["focus stored as a half tuple", ["n-B"], null],
  ["focus names a row with a blank id", ["n-B", ""], null],
];

export const homeLayoutFilterTests = [
  {
    name: "49/02 task02 — the test process has no DOM: window, document and localStorage are all undefined, so a module reaching for one would CRASH rather than merely be untestable",
    run: async () => {
      for (const global of ["window", "document", "localStorage", "sessionStorage"]) {
        assert.equal(globalThis[global], undefined, `globalThis.${global} is undefined here`);
      }
    },
  },

  // ══ Scenario: every composed row is one of the live rows it was handed — BY IDENTITY
  {
    name: "49/02 task02 — every composed row is `===`-identical to an element of the live rows: the composer SELECTS, it never constructs",
    run: async () => {
      const live = [A, B, C];
      const before = JSON.stringify(live);
      const storage = storageDouble({
        value: stored([["n-C", "sess-C"], ["ghost-1", "sess-X"], ["n-A", "sess-A"], ["ghost-2", "sess-Y"], ["n-B", "sess-B"]]),
      });

      const composed = composeHomeLayout(live, storage);
      assert.equal(composed.rows.length, 3, "the composed rows contain exactly three entries");
      for (const entry of composed.rows) assert.ok(live.some((candidate) => candidate === entry), "every composed entry is ===-identical to an element of the live rows");
      const named = composed.rows.map((entry) => entry.sessionId);
      assert.ok(!named.includes("sess-X") && !named.includes("sess-Y"), "no composed entry corresponds to a stored-but-not-live tuple");
      assert.equal(JSON.stringify(live), before, "the live rows array is deep-equal to what it was before the call");
      assert.deepEqual(live, [A, B, C], "…and was not sorted in place");
    },
  },

  // ══ Scenario: a ghost tuple leaves no trace at all
  {
    name: "49/02 task02 — a stored tuple for a session the mesh no longer lists leaves NO trace: no ghost, no placeholder, no tombstone, no error — and the preference is FILTERED, not erased",
    run: async () => {
      const live = [B, D];
      const raw = stored([["n-A", "sess-A"], ["n-B", "sess-B"], ["n-C", "sess-C"], ["n-D", "sess-D"], ["n-E", "sess-E"]]);
      const storage = storageDouble({ value: raw });

      const composed = composeHomeLayout(live, storage);
      assert.deepEqual(composed.rows.map((entry) => entry.sessionId), ["sess-B", "sess-D"], "the composed rows are exactly those two, in the stored order");
      assert.deepEqual(Object.keys(composed).sort(), ["focus", "rows"], "no ghost, placeholder, tombstone, `missing`, `dropped` or `ended` entry a render site could turn into a tile");
      const serialised = JSON.stringify(composed);
      for (const word of ["missing", "dropped", "ended", "ghost", "error", "warning", "degraded"]) {
        assert.ok(!new RegExp(`"${word}"`, "i").test(serialised), `nothing reports the absences as \`${word}\``);
      }

      // …and composing again after the three tuples return yields all five, in the stored
      // order. A composer that PRUNED storage on every compose would silently rewrite the
      // operator's layout from a five-second network blip.
      const back = composeHomeLayout([A, B, C, D, E], storage);
      assert.deepEqual(back.rows.map((entry) => entry.sessionId), ["sess-A", "sess-B", "sess-C", "sess-D", "sess-E"]);
      assert.equal(storage.raw, raw, "the stored string is untouched — the preference was FILTERED, not erased");
    },
  },

  // ══ Scenario Outline: a live row is never suppressed by anything storage can hold
  ...WATCHED_SET_ROWS.map(([label, value]) => ({
    name: `49/02 task02 — a live row is never suppressed by anything storage can hold: ${label}`,
    run: async () => {
      const live = [A, NEW, B];
      const composed = composeHomeLayout(live, storageDouble({ value }));
      assert.ok(composed.rows.some((entry) => entry === NEW), "the composed rows contain that session");
      assert.equal(composed.rows.length, live.length, "no stored value of any shape removed a live row from the output");
    },
  })),

  // ══ Scenario Outline: every way storage can fail degrades to the live rows, in order
  ...DEGRADE_ROWS.map(([label, build]) => ({
    name: `49/02 task02 — storage fails and the grid does not: ${label}`,
    run: async () => {
      // Deliberately NON-alphabetical, so "the order they arrived" is distinguishable from any
      // sort the composer might be tempted to apply.
      const live = [D, B, E, A, C];
      const storage = build();
      const started = Date.now();

      let composed;
      assert.doesNotThrow(() => {
        composed = composeHomeLayout(live, storage);
      }, "no error is thrown");
      assert.deepEqual(composed.rows, live, "the composed rows are deep-equal to the live rows array, element for element");
      for (const [index, entry] of composed.rows.entries()) assert.equal(entry, live[index], "…and identity-equal, in the SAME order");
      assert.equal(composed.focus, null, "the composed focus is null");
      assert.deepEqual(Object.keys(composed).sort(), ["focus", "rows"], "nothing is reported to the caller as an error state");

      const again = composeHomeLayout(live, storage);
      assert.deepEqual(again, composed, "a subsequent compose with the same arguments returns the same answer — no retry, no backoff, no repair attempt");
      if (storage?.calls) assert.equal(storage.calls.setItem, 0, "…and nothing was written");
      assert.ok(Date.now() - started < 4000, `the composer is O(live + stored), never O(live x stored): ${Date.now() - started}ms`);
    },
  })),

  // ══ Scenario: two storages in one process, and a poisoned global is never touched
  {
    name: "49/02 task02 — two storages in one process do not see each other, and poisoned `window`/`document`/`localStorage` globals are never touched",
    run: async () => {
      const poison = (name) => {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          get() {
            throw new Error(`the module reached for globalThis.${name} — storage is an ARGUMENT (ADR-009)`);
          },
        });
      };
      const installed = [];
      for (const name of ["window", "document", "localStorage"]) {
        poison(name);
        installed.push(name);
      }
      assert.equal(installed.length, 3, "all three globals were poisoned — this scenario fails LOUDLY rather than silently");

      try {
        const live = [A, B, C];
        const first = composeHomeLayout(live, storageDouble({ value: stored([["n-C", "sess-C"], ["n-A", "sess-A"]]) }));
        const second = composeHomeLayout(live, storageDouble({ value: stored([["n-B", "sess-B"]]) }));

        assert.deepEqual(first.rows.map((entry) => entry.sessionId), ["sess-C", "sess-A", "sess-B"], "the first result reflects its own storage's layout");
        assert.deepEqual(second.rows.map((entry) => entry.sessionId), ["sess-B", "sess-A", "sess-C"], "the second reflects its own");
        assert.notDeepEqual(first.rows, second.rows, "…and they differ from each other");

        const none = composeHomeLayout(live);
        assert.deepEqual(none.rows, live, "composing with no storage argument at all still returns the live rows in the order they arrived");
        assert.doesNotThrow(() => saveHomeLayout(live, undefined), "…and saving with none is a silent no-op");
      } finally {
        for (const name of installed) delete globalThis[name];
      }
      for (const name of installed) assert.equal(globalThis[name], undefined, "the poison is cleaned up");
    },
  },

  // ══ Scenario: saving persists tuples and focus and nothing else, proven with sentinels
  {
    name: "49/02 task02 — saving persists tuples and focus and NOTHING else, proven with sentinel values, and writing twice is byte-identical",
    run: async () => {
      const live = [
        row("n-A", "sess-A", { repo: "SENTINEL-REPO", assistant: "SENTINEL-ASSISTANT", workspaceId: "SENTINEL-WORKSPACE", lastPingAt: "SENTINEL-PING", workItem: { ref: "SENTINEL-REF", assignmentId: "a-1" } }),
        row("n-B", "sess-B", { repo: "SENTINEL-REPO", assistant: "SENTINEL-ASSISTANT", workspaceId: "SENTINEL-WORKSPACE", lastPingAt: "SENTINEL-PING", workItem: { ref: "SENTINEL-REF", assignmentId: "a-2" } }),
        row("n-C", "sess-C", { repo: "SENTINEL-REPO", assistant: "SENTINEL-ASSISTANT", workspaceId: "SENTINEL-WORKSPACE", lastPingAt: "SENTINEL-PING", workItem: { ref: "SENTINEL-REF", assignmentId: "a-3" } }),
      ];
      const storage = storageDouble();
      saveHomeLayout(live, storage, { focus: ["n-B", "sess-B"] });
      const raw = storage.raw;

      for (const cell of live) {
        assert.ok(raw.includes(cell.nodeId), `the raw string contains ${cell.nodeId}`);
        assert.ok(raw.includes(cell.sessionId), `…and ${cell.sessionId}`);
      }
      for (const sentinel of ["SENTINEL-REPO", "SENTINEL-ASSISTANT", "SENTINEL-WORKSPACE", "SENTINEL-PING", "SENTINEL-REF"]) {
        assert.ok(!raw.includes(sentinel), `the raw string contains NONE of the five sentinels: found ${sentinel}`);
      }

      const payload = JSON.parse(raw);
      assert.deepEqual(Object.keys(payload).sort(), ["focus", "panes", "version"], "the top-level keys are exactly the ordered tuple list, the focused tuple and the schema version — no sixth key");
      assert.deepEqual(payload.panes, [["n-A", "sess-A"], ["n-B", "sess-B"], ["n-C", "sess-C"]]);
      assert.deepEqual(payload.focus, ["n-B", "sess-B"]);
      for (const word of [...TERMINAL_STATE_LIST, UNKNOWN_STATE, "subscribed", "bytes", "scrollback"]) {
        assert.ok(!raw.includes(`"${word}"`), `it holds no ${word}`);
      }
      assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(raw), "…and no timestamp");

      const second = storageDouble();
      saveHomeLayout(live, second, { focus: ["n-B", "sess-B"] });
      assert.equal(second.raw, raw, "saving twice with the same rows writes a byte-identical string — the payload carries no clock and no nonce");
    },
  },

  // ══ Scenario Outline: a save that cannot be written is a no-op, and the grid stays functional
  ...WRITE_FAILURE_ROWS.map(([label, build]) => ({
    name: `49/02 task02 — a save that cannot be written is a no-op and the grid stays fully functional: ${label}`,
    run: async () => {
      const live = [D, B, E];
      const storage = build();
      let composed;
      assert.doesNotThrow(() => {
        saveHomeLayout(live, storage, { focus: ["n-B", "sess-B"] });
        composed = composeHomeLayout(live, storage);
      }, "no error is thrown by either call");
      assert.deepEqual(composed.rows, live, "the composed rows are the live rows, and the grid is fully functional");
      assert.deepEqual(Object.keys(composed).sort(), ["focus", "rows"], "nothing is reported to the caller as an error state");
    },
  })),

  // ══ Scenario: the stored order applies to the survivors; newcomers keep the index's order
  {
    name: "49/02 task02 — the stored order applies to the rows that survive, and rows the layout has never seen keep the index's order behind them; the composer never sorts",
    run: async () => {
      const live = [A, B, C, D, E];
      const storage = storageDouble({ value: stored([["n-D", "sess-D"], ["n-B", "sess-B"], ["ghost", "sess-X"]]) });

      const composed = composeHomeLayout(live, storage);
      assert.deepEqual(composed.rows.map((entry) => entry.sessionId), ["sess-D", "sess-B", "sess-A", "sess-C", "sess-E"], "the composed rows begin D, B and the remainder follow as A, C, E");

      // …and no comparison of `repo`, `assistant`, `lastPingAt`, connection state or recency
      // entered the result: the tail is the handed order, whatever the handed order is.
      const reordered = [E, C, A, B, D];
      const again = composeHomeLayout(reordered, storage);
      assert.deepEqual(again.rows.map((entry) => entry.sessionId), ["sess-D", "sess-B", "sess-E", "sess-C", "sess-A"], "changing the live order changes only the tail, never the stored head");
    },
  },

  // ══ THE PRESENCE OF A PREFERENCE MAY NEVER REMOVE A LIVE ROW ─────────────────────────────
  // Three live rows of which two share a tuple, plus ANY stored layout, returned TWO rows: the
  // newcomer pass skipped by KEY rather than by identity, so the row whose key had already been
  // placed was silently dropped. With storage absent all three survived — which made the mere
  // PRESENCE of a preference remove a live row, the exact direction ADR-009 and DG-49-9 forbid,
  // on the one screen built so an operator does not lose track of an agent.
  {
    name: "49/02 task02 — a stored layout can REORDER the live index and can never SHORTEN it: two live rows sharing a tuple both survive, and the stored and unstored paths return the same rows",
    run: async () => {
      const twin = row("n-B", "sess-B", { repo: "moved" });
      const live = [A, B, twin];

      const unstored = composeHomeLayout(live, undefined);
      assert.equal(unstored.rows.length, 3, "with no preference at all, every live row is returned");

      for (const [label, value] of [
        ["a layout naming one of them", stored([["n-B", "sess-B"]])],
        ["a layout naming all of them", stored([["n-A", "sess-A"], ["n-B", "sess-B"]])],
        ["a layout naming none of them", stored([["ghost", "sess-X"]])],
        ["an empty stored list", stored([])],
      ]) {
        const composed = composeHomeLayout(live, storageDouble({ value }));
        assert.equal(composed.rows.length, live.length, `${label}: the composed rows are as many as the live rows`);
        for (const cell of live) {
          assert.equal(composed.rows.filter((entry) => entry === cell).length, 1, `${label}: every live row appears EXACTLY once, by identity`);
        }
        assert.deepEqual(
          [...composed.rows].sort((left, right) => live.indexOf(left) - live.indexOf(right)),
          unstored.rows,
          `${label}: the stored path and the unstored path return the SAME rows — a preference reorders, it never removes`,
        );
      }

      const ordered = composeHomeLayout(live, storageDouble({ value: stored([["n-B", "sess-B"]]) }));
      assert.equal(ordered.rows[0], B, "the stored tuple resolves to the FIRST live row carrying it, in the stored position");
      assert.deepEqual(ordered.rows.slice(1), [A, twin], "…and the rest follow in the order they were handed, the twin included");
    },
  },

  // ══ THE PANE KEY'S SEPARATOR, DRIVEN THROUGH THE COMPOSER ────────────────────────────────
  // The module DECLARES that the separator is a byte no id can carry, "so (\"a-b\",\"c\") and
  // (\"a\",\"b-c\") are not one pane" — and changing it to a dash left every lane in this suite
  // green. Real ids in this mesh are dash-bearing (`worker-1`, `aof-wsl`, `sess-A`), and here the
  // failure mode is a live row DISAPPEARING from the grid because another row's key collided
  // with it.
  {
    name: "49/02 task02 — the pane key's separator is a byte no id can carry: (\"a-b\",\"c\") and (\"a\",\"b-c\") are two panes, so a stored layout naming one orders it alone and drops neither",
    run: async () => {
      const left = row("a-b", "c");
      const right = row("a", "b-c");
      const live = [right, left];

      assert.notEqual(paneKeyOf(paneTuple(left)), paneKeyOf(paneTuple(right)), "the directory's ONE key rule says these are two panes");

      const composed = composeHomeLayout(live, storageDouble({ value: stored([["a-b", "c"]]) }));
      assert.equal(composed.rows.length, 2, "both live rows survive — a dash separator would collide their keys and drop one");
      assert.deepEqual(composed.rows, [left, right], "the stored one leads and the other follows in the handed order");

      const focused = composeHomeLayout(live, storageDouble({ value: stored([["a-b", "c"]], ["a-b", "c"]) }));
      assert.deepEqual(focused.focus, ["a-b", "c"], "focus resolves to the pane the operator focused");

      // …and what is WRITTEN keeps them apart too: a collision here would persist one tuple for
      // two agents, and the operator would come back to a grid with a pane missing.
      const storage = storageDouble();
      saveHomeLayout(live, storage);
      assert.deepEqual(JSON.parse(storage.raw).panes, [["a", "b-c"], ["a-b", "c"]], "both tuples are persisted, in the handed order");
    },
  },

  // ══ Scenario Outline: the composed focus is always null or a tuple in the composed rows
  ...FOCUS_ROWS.map(([label, focus, expected]) => ({
    name: `49/02 task02 — the composed focus is always null or a tuple in the composed rows: ${label}`,
    run: async () => {
      const live = [A, B, C];
      const payload = { version: LAYOUT_SCHEMA_VERSION, panes: [["n-A", "sess-A"], ["n-B", "sess-B"], ["n-C", "sess-C"]] };
      if (focus !== undefined) payload.focus = focus;

      let composed;
      assert.doesNotThrow(() => {
        composed = composeHomeLayout(live, storageDouble({ value: JSON.stringify(payload) }));
      }, "no error is thrown");
      assert.deepEqual(composed.focus, expected);
      if (composed.focus != null) {
        assert.ok(
          composed.rows.some((entry) => entry.nodeId === composed.focus[0] && entry.sessionId === composed.focus[1]),
          "…and when it is not null it names a tuple present in the composed rows",
        );
      }
    },
  })),

  // ══ Scenario: composing twice changes nothing, and reading never writes
  {
    name: "49/02 task02 — composing three times returns deep-equal answers with fresh identities, records ZERO setItem calls, and leaves the stored string byte-identical",
    run: async () => {
      const live = [A, B, C];
      const raw = stored([["n-C", "sess-C"], ["n-A", "sess-A"]], ["n-A", "sess-A"]);
      const storage = storageDouble({ value: raw });

      const first = composeHomeLayout(live, storage);
      const second = composeHomeLayout(live, storage);
      const third = composeHomeLayout(live, storage);

      assert.deepEqual(second, first, "the three results are deep-equal");
      assert.deepEqual(third, first);
      assert.notEqual(second, first, "the second is not the first's object identity — there is no memoised cache handing back a stale answer");
      assert.notEqual(third, first);
      assert.notEqual(second.rows, first.rows);
      assert.equal(storage.calls.setItem, 0, "ZERO setItem calls — composing is a read, and a read that repairs storage is a write nobody asked for");
      assert.equal(storage.calls.getItem, 3, "…and it really read, three times");
      assert.equal(storage.raw, raw, "the raw stored string is byte-identical to what it was before the three calls");
    },
  },
];
