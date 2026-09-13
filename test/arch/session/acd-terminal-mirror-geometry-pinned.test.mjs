// Fitness function: acd-terminal-mirror-geometry-pinned (milestone 46 / ADR-002 + ADR-003) —
//
//   "The `mirror` descriptor's `fixedGeometry` EQUALS the worker's own `ptySpawn` geometry."
//
// EXPECTATION AT REFINE: **GREEN ON ARRIVAL** (80 = 80, 24 = 24). This gate preserves a
// property that is TRUE and, until now, entirely UNGUARDED — which is the whole reason it
// exists.
//
// WHY IT HAD TO BE A FITNESS FUNCTION AND NOT A `.feature` SCENARIO. The tie is a structural
// assertion ACROSS TWO BUILDS THAT CANNOT IMPORT EACH OTHER: `ui/src/**` is bundled by vite
// for a browser and `src/**` runs under node in the CLI. There is no runtime at which one
// could read the other's constant, so the only place the pair can be compared is a test that
// reads BOTH FILES AS TEXT.
//
// WHY IT IS WORTH A GATE AT ALL, measured. The worker spawns its interactive `claude` PTY at
// a fixed 80x24 and that TUI paints every line for THAT screen with ABSOLUTE CURSOR
// ADDRESSING. If the browser mirror renders the same bytes into an xterm of a different size,
// every absolutely-positioned line lands at the wrong column and the screen overlaps itself
// into an unreadable scatter. That was a real defect, found and fixed in a live two-machine
// soak in m38.
//
// AND THE PREDECESSOR CLAIMED THIS TIE WAS ALREADY HELD. `ui/src/fleet/terminal-view/geometry.mjs:20-23`
// states in terms: "the tie is held by test/fleet-terminal-view-geometry.test.mjs, which reads
// BOTH files and fails if the numbers drift apart." THAT FILE HAS NEVER EXISTED — confirmed on
// the codebase graph (geometry.mjs had no test importer at all) and by grep
// (`WORKER_TERMINAL_COLS`, `terminalFitScale` and `geometry.mjs` returned zero hits under
// `test/` and `scripts/`). A cross-build constant whose drift produces an unreadable screen
// was untested AND BELIEVED TESTED, which is worse than untested because the comment stopped
// anyone looking. This file is that claim, made true.
//
// WHAT A PLANT THAT MUST TRIP IT LOOKS LIKE: setting the descriptor to `{ cols: 100, rows: 30 }`
// while the worker still spawns 80x24 — the exact drift that produced the unreadable render in
// the first place.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const UI_SOURCE_TABLE = path.join("ui", "src", "terminal", "source-table.mjs");
const WORKER_EXECUTION = path.join("src", "mesh", "worker-execution.mjs");

async function read(rel) {
  // A hard-coded path that THROWS when the file moves is the correct behaviour here: the
  // whole point is that a move must not silently un-tie the two builds.
  return readFile(path.join(repoRoot, rel), "utf8");
}

// THE WORKER DRIVER'S SOURCE, FOLLOWED RATHER THAN PINNED (milestone 53 / story 00). The
// interactive `ptySpawn(...)` call this gate measures the geometry at moved OUT of
// mesh-worker-execution.mjs when the session driver was extracted — and a gate that pins
// a filename reads red (or, worse, vacuously green) over a file that no longer carries
// its subject. That is memory near-miss R2 (m10) exactly: FOLLOW THE FUNCTION, NOT THE
// FILE. So the modules the sink RE-EXPORTS from are parsed out of the sink itself and
// read alongside it. No second filename is typed here, which is what makes the NEXT
// extraction followed too rather than merely this one repaired.
async function workerDriverSource() {
  const sink = await read(WORKER_EXECUTION);
  // 119/01 — the specifier is resolved against the SINK's own directory. Joining it onto `src/`
  // assumed the sink sat at the root, and the driver is one directory up from `src/mesh/`.
  const reExported = [...sink.matchAll(/export\s*\{[\s\S]*?\}\s*from\s*["'](\.\.?\/[^"']+)["']/g)].map((m) => m[1]);
  const parts = await Promise.all(reExported.map((spec) => read(path.join(path.dirname(WORKER_EXECUTION), spec))));
  return [sink, ...parts].join("\n");
}

export const archTests = [
  {
    name: "arch/46 ADR-002+003 (acd-terminal-mirror-geometry-pinned): the mirror descriptor's fixed geometry is the worker's own ptySpawn geometry, read from BOTH builds",
    run: async () => {
      // ── The UI half: the named constants the `mirror` row is built from.
      const uiText = await read(UI_SOURCE_TABLE);
      const uiCols = /export const WORKER_TERMINAL_COLS\s*=\s*(\d+)\s*;/.exec(uiText);
      const uiRows = /export const WORKER_TERMINAL_ROWS\s*=\s*(\d+)\s*;/.exec(uiText);
      assert.ok(uiCols, `${UI_SOURCE_TABLE} exports WORKER_TERMINAL_COLS as a literal`);
      assert.ok(uiRows, `${UI_SOURCE_TABLE} exports WORKER_TERMINAL_ROWS as a literal`);

      // …and that the `mirror` descriptor genuinely USES them, rather than carrying its own
      // second copy of the pair. A constant nothing reads is not a tie.
      assert.match(
        uiText,
        /fixedGeometry:\s*\{\s*cols:\s*WORKER_TERMINAL_COLS\s*,\s*rows:\s*WORKER_TERMINAL_ROWS\s*\}/,
        "the mirror descriptor's fixedGeometry is built FROM the pinned constants, not from a second copy of the numbers",
      );

      // ── The server half: the worker's own PTY spawn, wherever the driver now lives.
      const workerText = await workerDriverSource();
      const spawn = /ptySpawn\([\s\S]{0,400}?cols:\s*(\d+),\s*rows:\s*(\d+),/.exec(workerText);
      assert.ok(spawn, `${WORKER_EXECUTION} (and the modules it re-exports its driver from) spawns the interactive PTY with a literal cols/rows pair`);

      // ── The tie itself.
      assert.equal(
        Number(uiCols[1]),
        Number(spawn[1]),
        `the mirror descriptor's columns (${uiCols[1]}) must equal the worker's ptySpawn columns (${spawn[1]}) — the TUI is absolutely cursor-addressed, so a drift here renders as an unreadable overlapping scatter, not as a slightly-wrong size`,
      );
      assert.equal(
        Number(uiRows[1]),
        Number(spawn[2]),
        `the mirror descriptor's rows (${uiRows[1]}) must equal the worker's ptySpawn rows (${spawn[2]})`,
      );

      // Non-vacuity: the pair is a real, plausible terminal geometry rather than a zero both
      // sides happen to agree on.
      assert.ok(Number(uiCols[1]) > 0 && Number(uiRows[1]) > 0, "the pinned geometry is a real screen");
      assert.equal(Number(uiCols[1]), 80, "the pinned width is the 80 the soak was paid for");
      assert.equal(Number(uiRows[1]), 24, "the pinned height is the 24 the soak was paid for");
    },
  },
  {
    name: "arch/46 ADR-003 (acd-terminal-mirror-geometry-pinned): the shared geometry module carries no second copy of the worker's geometry",
    run: async () => {
      // The pair has ONE home. A module that re-typed `cols: 80` beside the descriptor would
      // be a second copy that this gate could not see drift in.
      const geometry = await read(path.join("ui", "src", "terminal", "geometry.mjs"));
      assert.ok(
        !/\bcols:\s*80\b/.test(geometry) && !/\brows:\s*24\b/.test(geometry),
        "ui/src/terminal/geometry.mjs derives the fixed geometry from the descriptor and never re-types the worker's numbers",
      );
      // …and it really does read the descriptor's own field, so the derivation is live.
      assert.match(geometry, /fixedGeometry/, "the geometry plan reads the descriptor's fixedGeometry");
    },
  },
];
