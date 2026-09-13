// Fitness function: acd-home-layout-is-a-filter (m49 / ADR-009, DESIGN DG-49-9) —
//
//   "The persisted layout is a FILTER over the live index and never a SOURCE of rows; storage
//    is an ARGUMENT and no module under `ui/src/home/` reads a browser global; and what is
//    persisted is tuples and focus, and nothing else."
//
// ── THE LOAD-BEARING NEGATIVE ────────────────────────────────────────────────────────────
// A persisted layout that can CONTRIBUTE a row is a screen showing sessions that no longer
// exist. Storage is the one place in this milestone where that lie can be manufactured
// locally, with no producer, no node and no wire involved at all — which is why the subset
// clause below is behavioural and is asserted by object IDENTITY. A composer that rebuilt a row
// from a stored tuple (`{ nodeId, sessionId }` with the rest filled in) would satisfy a
// subset-by-tuple check and would be manufacturing exactly the ghost this milestone exists to
// remove; only identity refuses it.
//
// ── AND STORAGE IS AN ARGUMENT, WHICH IS WHY THIS SUITE CAN EXIST AT ALL ─────────────────
// This repo has no browser harness. A module that reached for `window.localStorage` would be a
// module no `node:test` could drive, and private modes and some embeddings throw on ACCESS
// rather than on write — so `typeof localStorage` is not a safe probe either. The textual
// clause below is the cheap half; the behavioural half (two storages in one process, and
// poisoned globals that throw on ANY property access) lives in
// `test/ui/home-layout-filter.test.mjs`, and it catches what a text sweep cannot: a global reached
// through a computed property, an aliased binding, or a helper imported from elsewhere.
//
// Every plant is fed to the SHIPPED detectors below and asserts it LANDED first.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BROWSER_GLOBALS, stripComments, nonVacuousSource } from "../../support/terminal-gate-detectors.mjs";
import { isUiSourceFile } from "../../support/ui-source-files.mjs";
import { composeHomeLayout, saveHomeLayout } from "../../../ui/src/home/layout.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const HOME_DIR = "ui/src/home";

// The persisted payload's WHOLE vocabulary. A key outside this set is a second, stale authority
// over what the mesh says exists — a persisted `repo` is precisely the field that would still
// say `demo` after the session moved.
export const PERSISTED_KEYS = Object.freeze(["version", "panes", "focus"]);
const FORBIDDEN_PERSISTED_KEYS = Object.freeze([
  "repo",
  "assistant",
  "workItem",
  "lastPingAt",
  "workspaceId",
  "state",
  "subscribed",
  "bytes",
  "scrollback",
]);

export async function readHomeFiles() {
  const files = [];
  const walk = async (dir) => {
    for (const entry of await readdir(path.join(repoRoot, dir), { withFileTypes: true })) {
      const next = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(next);
      else if (isUiSourceFile(entry.name)) files.push({ path: next, source: await readFile(path.join(repoRoot, next), "utf8") });
    }
  };
  await walk(HOME_DIR);
  return files;
}

/** Textual: no module under `ui/src/home/` READS a browser global; it RECEIVES one. */
export function homeStorageGlobalViolations(files) {
  const violations = [];
  const swept = Array.isArray(files) ? files : [];
  if (swept.length === 0) {
    violations.push(`NO files under ${HOME_DIR}/ were handed to this detector — an absence sweep over an empty set asserts nothing.`);
    return violations;
  }
  for (const file of swept) {
    const clean = stripComments(String(file?.source ?? ""));
    const blinded = nonVacuousSource(file?.path, clean);
    if (blinded != null) {
      violations.push(blinded);
      continue;
    }
    for (const global of BROWSER_GLOBALS) {
      if (!new RegExp(`\\b${global}\\b`).test(clean)) continue;
      violations.push(
        `${file.path}: reads the browser global \`${global}\`. ADR-009 takes storage as an ARGUMENT — a module that reaches for a global is a module no \`node:test\` in this repo can drive, and private modes throw on ACCESS rather than on write, so guarding it with \`typeof\` is not a fix.`,
      );
    }
  }
  return violations;
}

/** Behavioural: what was actually WRITTEN carries tuples and focus and nothing else. */
export function persistedLayoutShapeViolations(raw) {
  const violations = [];
  if (typeof raw !== "string" || raw === "") return ["nothing was written, so the persisted shape could not be read — a shape clause over an unwritten payload asserts nothing"];
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return [`the persisted payload is not JSON: ${raw.slice(0, 80)}`];
  }
  const keys = Object.keys(payload ?? {}).sort();
  const extra = keys.filter((key) => !PERSISTED_KEYS.includes(key));
  if (extra.length > 0) {
    violations.push(
      `the persisted payload carries ${JSON.stringify(extra)} beyond ${JSON.stringify([...PERSISTED_KEYS].sort())}. ADR-009 persists PREFERENCES, never SESSIONS: anything more makes the browser a second, stale authority over what the mesh says exists.`,
    );
  }
  for (const forbidden of FORBIDDEN_PERSISTED_KEYS) {
    if (new RegExp(`"${forbidden}"`).test(raw)) {
      violations.push(`the persisted payload names \`${forbidden}\` — the defect is a SPREAD (\`{...row}\`), which writes every field under its own name and passes any assertion that only looks for keys it thought to name.`);
    }
  }
  for (const pane of Array.isArray(payload?.panes) ? payload.panes : []) {
    if (!Array.isArray(pane) || pane.length !== 2 || pane.some((half) => typeof half !== "string")) {
      violations.push(`a persisted pane is not a two-string tuple: ${JSON.stringify(pane)}. Persisting a ROW instead of a tuple is how a stored \`repo\` outlives the session it described.`);
    }
  }
  return violations;
}

/** Behavioural: every composed row is one of the live rows it was handed, BY IDENTITY. */
export function layoutSubsetViolations(composed, liveRows) {
  const violations = [];
  const live = Array.isArray(liveRows) ? liveRows : [];
  const rows = Array.isArray(composed?.rows) ? composed.rows : null;
  if (rows == null) return ["the composer returned no `rows` array"];
  for (const [index, row] of rows.entries()) {
    if (!live.some((candidate) => candidate === row)) {
      violations.push(
        `composed row ${index} (${JSON.stringify(row)}) is NOT ===-identical to any live row: the composer CONSTRUCTED it. A persisted layout that can contribute a row is a screen showing sessions that no longer exist — the ghost this milestone exists to remove.`,
      );
    }
  }
  const keys = Object.keys(composed ?? {}).sort();
  if (keys.join(",") !== "focus,rows") {
    violations.push(`the composer returned ${JSON.stringify(keys)}; exactly \`rows\` and \`focus\` are allowed — a ghost, placeholder, tombstone or error channel is a tile a render site could draw.`);
  }
  return violations;
}

const row = (nodeId, sessionId, extra = {}) => ({ nodeId, sessionId, ...extra });

export const archTests = [
  {
    name: "arch/49 ADR-009 (acd-home-layout-is-a-filter): no module under ui/src/home/ reads a browser global — storage is an ARGUMENT",
    run: async () => {
      const files = await readHomeFiles();
      assert.ok(files.length >= 6, `the home was actually swept: ${files.length} files`);
      assert.ok(
        files.some((file) => file.path.endsWith(".d.mts")),
        "…including the declaration siblings — a `.d.mts` can name a DOM lib type as freely as a module can reach for a global",
      );
      assert.deepEqual(homeStorageGlobalViolations(files), [], "the home receives its storage; it never reaches for one");
    },
  },

  {
    name: "arch/49 ADR-009 (acd-home-layout-is-a-filter): the globals detector FIRES on a planted `window.localStorage.getItem`, and is quiet on the clean home in the same lane",
    run: async () => {
      const clean = await readHomeFiles();
      const planted = [
        ...clean,
        {
          path: `${HOME_DIR}/plant.mjs`,
          source: ["export function readLayout() {", "  return window.localStorage.getItem(\"aof.home.layout\");", "}"].join("\n"),
        },
      ];
      assert.notEqual(planted.length, clean.length, "the plant LANDED");
      const violations = homeStorageGlobalViolations(planted);
      assert.ok(violations.length >= 1, "a home module reaching for `window`/`localStorage` fires the shipped detector");
      assert.ok(
        violations.some((violation) => violation.includes("plant.mjs") && /localStorage|window/.test(violation)),
        `the refusal names the file and the global: ${JSON.stringify(violations)}`,
      );
      assert.deepEqual(homeStorageGlobalViolations(clean), [], "…and the CLEAN home, in this same lane, returns none");
    },
  },

  {
    name: "arch/49 ADR-009 (acd-home-layout-is-a-filter): the SHIPPED save writes tuples and focus and nothing else, and the shape detector FIRES on a payload carrying `repo`",
    run: async () => {
      let written = null;
      const storage = { getItem: () => null, setItem: (_key, value) => void (written = value) };
      const rows = [
        row("worker-1", "sess-A", { repo: "SENTINEL-REPO", assistant: "SENTINEL-ASSISTANT", lastPingAt: "SENTINEL-PING" }),
        row("worker-2", "sess-B", { workspaceId: "SENTINEL-WORKSPACE", workItem: { ref: "SENTINEL-REF", assignmentId: "a-1" } }),
      ];
      saveHomeLayout(rows, storage, { focus: ["worker-2", "sess-B"] });
      assert.deepEqual(persistedLayoutShapeViolations(written), [], `the shipped payload is tuples and focus: ${written}`);

      const planted = JSON.stringify({ version: 1, panes: [["worker-1", "sess-A"]], focus: null, repo: "demo" });
      assert.notEqual(planted, written, "the plant LANDED");
      const violations = persistedLayoutShapeViolations(planted);
      assert.ok(violations.length >= 1, "a persisted shape carrying `repo` fires the shipped detector");
      assert.ok(violations.some((violation) => violation.includes("repo")), `the refusal names the key: ${JSON.stringify(violations)}`);
      assert.deepEqual(persistedLayoutShapeViolations(written), [], "…and the CLEAN payload, in this same lane, returns none");
    },
  },

  {
    name: "arch/49 ADR-009 (acd-home-layout-is-a-filter): the SHIPPED composer's output is always a SUBSET of the live rows by IDENTITY, and the subset detector FIRES on a ghost-emitting composer",
    run: async () => {
      const live = [row("worker-1", "sess-A"), row("worker-2", "sess-B")];
      const stored = JSON.stringify({
        version: 1,
        panes: [["worker-2", "sess-B"], ["worker-9", "sess-GHOST"], ["worker-1", "sess-A"]],
        focus: ["worker-9", "sess-GHOST"],
      });
      const composed = composeHomeLayout(live, { getItem: () => stored });
      assert.deepEqual(layoutSubsetViolations(composed, live), [], "the shipped composer SELECTS from the live rows");
      assert.equal(composed.rows.length, 2, "the stored tuple the index does not carry left no trace at all");
      assert.equal(composed.focus, null, "…and focus is never a dangling reference");

      // THE GHOST-PANE PLANT, and it is behavioural rather than textual because that is the only
      // way this defect shows: a composer that rebuilds a row from a stored tuple passes every
      // deep-equal check ever written against it.
      const ghost = { rows: [live[1], { nodeId: "worker-9", sessionId: "sess-GHOST" }, live[0]], focus: null };
      assert.notDeepEqual(ghost.rows, composed.rows, "the plant LANDED");
      const violations = layoutSubsetViolations(ghost, live);
      assert.ok(violations.length >= 1, "a composer emitting a stored tuple absent from the live rows fires the shipped detector");
      assert.ok(violations.some((violation) => violation.includes("sess-GHOST")), `the refusal names the manufactured row: ${JSON.stringify(violations)}`);
      assert.deepEqual(layoutSubsetViolations(composed, live), [], "…and the CLEAN composition, in this same lane, returns none");
    },
  },
];
