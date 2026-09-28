// test/arch/terminal/acd-screen-has-one-reader.test.mjs — FF-13801, THE SCREEN HAS ONE READER
// (milestone 138 / story 00, task 06; 138/ADR-001 §1 §5, ADR-002 §4 §6).
//
// Three things hold over the live `src/**` tree:
//   1. `@xterm/headless` is imported — statically or by `import()` — by `src/terminal/screen.mjs`
//      and by no other module;
//   2. the comment-stripped session driver spells none of the byte readers that moved into the door
//      (`ANSI_ESCAPE_RE`, `TUI_READY_MARKER`, `2004h`, `PARKED_PASTE_RE`, `PROVIDER_WAIT_RE`,
//      `hasVisibleText`, `screenTail`);
//   3. no comment-stripped module but `src/terminal/session-screen.mjs` spells the byte gate's
//      markers, `?2004h` or `?2004l`.
// Comments are stripped the way `acd-worker-driver-no-headless-print` strips them, so a comment that
// narrates the move is never a violation. Each spelling is PLANTED into a copy of the live sources to
// prove the detector is not vacuous (the m03 self-check); nothing is written to disk.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importSpecifiers } from "../../support/module-family.mjs";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const EMULATOR = "@xterm/headless";
const MODEL = "src/terminal/screen.mjs";
const DOOR = "src/terminal/session-screen.mjs";
const DRIVER = "packages/execution/src/session-driver.mjs";
const DRIVER_SPELLINGS = Object.freeze(["ANSI_ESCAPE_RE", "TUI_READY_MARKER", "2004h", "PARKED_PASTE_RE", "PROVIDER_WAIT_RE", "hasVisibleText", "screenTail"]);
const MARKERS = Object.freeze(["?2004h", "?2004l"]);

// The same strip `acd-worker-driver-no-headless-print` applies.
function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// screenReaderViolations(files) — `files` is `[{ rel, source }]` over `src/**`, `rel` relative to
// `src/`. Answers `[{ file, spelling }]`, `file` repo-relative.
export function screenReaderViolations(files) {
  const violations = [];
  for (const { rel, source } of files) {
    const file = rel;
    if (rel !== MODEL && importSpecifiers(source).some((entry) => entry.specifier === EMULATOR)) {
      violations.push({ file, spelling: EMULATOR });
    }
    const code = stripComments(source);
    if (rel === DRIVER) {
      for (const spelling of DRIVER_SPELLINGS) if (code.includes(spelling)) violations.push({ file, spelling });
    }
    if (rel !== DOOR) {
      for (const spelling of MARKERS) if (code.includes(spelling)) violations.push({ file, spelling });
    }
  }
  return violations;
}

async function liveSources() {
  const files = [];
  for (const { rel, path: full } of await readRuntimeFiles(repoRoot)) files.push({ rel, source: await readFile(full, "utf8") });
  return files;
}

// plant(files, rel, edit) — a copy of the live sources with one module's text edited.
function plant(files, rel, edit) {
  let planted = false;
  const copy = files.map((file) => {
    if (file.rel !== rel) return file;
    const source = edit(file.source);
    planted = source !== file.source;
    return { rel, source };
  });
  assert.ok(planted, `the plant landed in src/${rel}`);
  return copy;
}

export const archTests = [
  {
    name: "arch/138 FF-13801 (acd-screen-has-one-reader): the emulator has one importer, the driver spells no byte reader, and the byte gate's markers have one home",
    run: async () => {
      const files = await liveSources();
      assert.ok(files.length > 100, `non-vacuity: ${files.length} src modules were read`);
      const model = files.find((file) => file.rel === MODEL);
      assert.ok(model != null && importSpecifiers(model.source).some((entry) => entry.specifier === EMULATOR), `${MODEL} is the one importer of ${EMULATOR}`);
      const door = files.find((file) => file.rel === DOOR);
      assert.ok(door != null && MARKERS.every((marker) => stripComments(door.source).includes(marker)), `${DOOR} is the byte gate's one home`);
      assert.deepEqual(screenReaderViolations(files), [], "no module but the model imports the emulator, the driver reads no screen, and only the door spells the markers");
    },
  },
  ...[
    { plant: "`import(\"@xterm/headless\")` added to `src/loop-bounds.mjs`", rel: "src/loop-bounds.mjs", edit: (source) => `${source}\nexport const loadScreen = () => import("@xterm/headless");\n`, spelling: EMULATOR },
    { plant: "`const hasVisibleText = 0;` added to the driver", rel: DRIVER, edit: (source) => `${source}\nconst hasVisibleText = 0;\n`, spelling: "hasVisibleText" },
    { plant: "`PROVIDER_WAIT_RE` added to the driver's import from `loop-bounds.mjs`", rel: DRIVER, edit: (source) => source.replace('import { DEFAULT_HEARTBEAT_MS } from "@aof/contracts/loop-bounds";', 'import { DEFAULT_HEARTBEAT_MS, PROVIDER_WAIT_RE } from "@aof/contracts/loop-bounds";'), spelling: "PROVIDER_WAIT_RE" },
    { plant: "the string `\"\\u001b[?2004h\"` added to `src/terminal/screen.mjs`", rel: MODEL, edit: (source) => `${source}\nexport const PASTE_ON = "\\u001b[?2004h";\n`, spelling: "?2004h" },
  ].map(({ plant: label, rel, edit, spelling }) => ({
    name: `arch/138 FF-13801 outline — each plant turns the control red, naming the file and the spelling [${label}]`,
    run: async () => {
      const violations = screenReaderViolations(plant(await liveSources(), rel, edit));
      assert.deepEqual(violations, [{ file: rel, spelling }], `one violation naming src/${rel} and ${spelling}`);
    },
  })),
  {
    name: "arch/138 FF-13801 — a spelling inside a comment is not a violation",
    run: async () => {
      const files = plant(await liveSources(), DRIVER, (source) => `${source}\n// TUI_READY_MARKER moved to the door\n`);
      assert.deepEqual(screenReaderViolations(files), []);
    },
  },
];
