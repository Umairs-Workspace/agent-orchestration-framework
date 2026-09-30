// test/arch/terminal/acd-screen-registry-is-recorded.test.mjs — FF-13802, EVERY REGISTERED SCREEN IS
// RECORDED (milestone 138 / story 01, task 04; 138/ADR-002 §1, ADR-003 §1 §2 §4 §7).
//
// Over the live registry and the live fixture directory:
//   - every entry has `test/fixtures/claude-screens/<id>.json`, and every fixture names a registered id:
//     `<id>.json`, or `<id>.<variant>.json` for a further recording of the same screen (the classic
//     renderer's box is `ready.classic.json`, recorded at 138's verify);
//   - every fixture's `claude` field is a version string, or begins `synthetic:`;
//   - rendered through `screen.mjs`, each fixture is recognised by its own entry and, among the
//     entries of its own kind (the frame-deciding ones, or the `wait` ones), by no other (01/01,
//     ruling 5: a `wait` fixture drawn on a REPL frame is `ready`'s too);
//   - `ready` recognises no fixture of a `consent` or `fail` entry;
//   - every `consent` entry names a non-empty `option`, and that option is an item of its own
//     fixture's menu as the door reads it (ADR-003 §4 as amended 2026-09-27: the door walks to it).
// The detector is pure over `{ registry, fixtures }`, so each plant is a copy, never an edit of a
// live file (the m03 self-check).
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLAUDE_SCREENS } from "../../../packages/core/src/terminal/claude-screens.mjs";
import { readConsentMenu } from "../../../packages/core/src/terminal/session-screen.mjs";
import { createScreen } from "../../../packages/core/src/terminal/screen.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const fixtureDir = path.join(repoRoot, "test", "fixtures", "claude-screens");
const VERSION_RE = /^\d+\.\d+\.\d+$/u;
const FRAME_DECIDING = new Set(["type", "consent", "fail"]);

async function render(data) {
  const screen = await createScreen({ cols: data.cols, rows: data.rows });
  try {
    for (const chunk of data.chunks ?? []) await screen.write(chunk.d);
    return screen.snapshot();
  } finally {
    screen.dispose();
  }
}

// screenRegistryViolations({ registry, fixtures }) => [{ rule, entry?, fixture?, other?, message }]
// `fixtures` is `[{ name: "<id>.json", data }]`.
export async function screenRegistryViolations({ registry, fixtures }) {
  const violations = [];
  const say = (violation) => violations.push({ ...violation, message: [violation.fixture, violation.entry, violation.other, violation.rule].filter(Boolean).join(" · ") });
  const byName = new Map(fixtures.map((fixture) => [fixture.name, fixture]));
  const byId = new Map(registry.map((entry) => [entry.id, entry]));

  for (const entry of registry) {
    if (!byName.has(`${entry.id}.json`)) say({ rule: "missing recording", entry: entry.id });
    if (entry.action === "consent" && !(typeof entry.option === "string" && entry.option.length > 0)) say({ rule: "missing option", entry: entry.id });
  }
  for (const { name, data } of fixtures) {
    const own = byId.get(name.replace(/\.json$/u, "").split(".")[0]);
    if (own == null) say({ rule: "missing entry", fixture: name });
    const source = data?.claude;
    if (!(typeof source === "string" && (VERSION_RE.test(source) || source.startsWith("synthetic:")))) say({ rule: "missing version", fixture: name });
    if (own == null) continue;
    const snapshot = await render(data);
    const claimed = registry.filter((entry) => entry.recognise(snapshot));
    if (!claimed.includes(own)) say({ rule: "not recognised by its own entry", fixture: name, entry: own.id });
    const ownKind = FRAME_DECIDING.has(own.action);
    for (const other of claimed) {
      if (other === own || FRAME_DECIDING.has(other.action) !== ownKind) continue;
      say({ rule: "claimed by another entry", fixture: name, entry: own.id, other: other.id });
    }
    const ready = byId.get("ready");
    if ((own.action === "consent" || own.action === "fail") && ready != null && ready.recognise(snapshot)) {
      say({ rule: "the input-box rule: ready claims a dialog", fixture: name, entry: "ready" });
    }
    if (own.action === "consent" && typeof own.option === "string" && own.option.length > 0 && readConsentMenu(snapshot, own.option) == null) {
      say({ rule: "option absent from its menu", fixture: name, entry: own.id });
    }
  }
  return violations;
}

async function liveFixtures() {
  const names = (await readdir(fixtureDir)).filter((name) => name.endsWith(".json")).sort();
  assert.ok(names.length >= 7, `non-vacuity: ${fixtureDir} holds ${names.length} recordings, fewer than the six v1 screens and the classic box`);
  return Promise.all(names.map(async (name) => ({ name, data: JSON.parse(await readFile(path.join(fixtureDir, name), "utf8")) })));
}

const withEntry = (registry, id, change) => registry.map((entry) => (entry.id === id ? { ...entry, ...change } : entry));
const PROMPT = "❯";

export const archTests = [
  {
    name: "arch/138 FF-13802 (acd-screen-registry-is-recorded): every registered screen is recorded, every recording is its own screen, and the input box is never a dialog",
    run: async () => {
      const fixtures = await liveFixtures();
      assert.ok(CLAUDE_SCREENS.length >= 6 && fixtures.length >= 7, `non-vacuity: ${CLAUDE_SCREENS.length} entries, ${fixtures.length} recordings`);
      assert.deepEqual(await screenRegistryViolations({ registry: CLAUDE_SCREENS, fixtures }), []);
    },
  },
  ...[
    {
      plant: "an entry `update-notice` added with no recording",
      copy: (registry, fixtures) => ({ registry: [...registry, { id: "update-notice", action: "fail", recognise: () => false }], fixtures }),
      named: { entry: "update-notice", rule: "missing recording" },
    },
    {
      plant: "a recording `orphan.json` added that no entry names",
      copy: (registry, fixtures) => ({ registry, fixtures: [...fixtures, { name: "orphan.json", data: fixtures.find((fixture) => fixture.name === "login.json").data }] }),
      named: { fixture: "orphan.json", rule: "missing entry" },
    },
    {
      plant: "`login.json`'s `claude` field removed",
      copy: (registry, fixtures) => ({ registry, fixtures: fixtures.map((fixture) => (fixture.name === "login.json" ? { ...fixture, data: { ...fixture.data, claude: undefined } } : fixture)) }),
      named: { fixture: "login.json", rule: "missing version" },
    },
    {
      plant: "`login`'s recogniser replaced by one that also claims `first-run.json`",
      copy: (registry, fixtures) => {
        const login = registry.find((entry) => entry.id === "login");
        const firstRun = registry.find((entry) => entry.id === "first-run");
        return { registry: withEntry(registry, "login", { recognise: (snapshot) => login.recognise(snapshot) || firstRun.recognise(snapshot) }), fixtures };
      },
      named: { fixture: "first-run.json", entry: "first-run", other: "login", rule: "claimed by another entry" },
    },
    {
      plant: "`ready`'s recogniser replaced by one that answers yes wherever a row contains `❯`",
      copy: (registry, fixtures) => ({ registry: withEntry(registry, "ready", { recognise: (snapshot) => snapshot.rows.some((row) => row.includes(PROMPT)) }), fixtures }),
      named: { fixture: "first-run.json", entry: "ready", rule: "the input-box rule: ready claims a dialog" },
    },
    {
      plant: "`trust`'s `option` set to the empty string",
      copy: (registry, fixtures) => ({ registry: withEntry(registry, "trust", { option: "" }), fixtures }),
      named: { entry: "trust", rule: "missing option" },
    },
    {
      plant: "`trust`'s `option` set to `Always trust this folder`",
      copy: (registry, fixtures) => ({ registry: withEntry(registry, "trust", { option: "Always trust this folder" }), fixtures }),
      named: { fixture: "trust.json", entry: "trust", rule: "option absent from its menu" },
    },
  ].map(({ plant, copy, named }) => ({
    name: `arch/138 FF-13802 outline — each breach turns the control red, naming what broke [${plant}]`,
    run: async () => {
      const violations = await screenRegistryViolations(copy(CLAUDE_SCREENS, await liveFixtures()));
      const match = violations.find((violation) => Object.entries(named).every(([key, value]) => violation[key] === value));
      assert.ok(match != null, `a violation naming ${JSON.stringify(named)} — got ${JSON.stringify(violations.map((violation) => violation.message))}`);
    },
  })),
];
