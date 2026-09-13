// Fitness function for milestone 03 / ADR-003:
// "Every source file that adapts vibeyard code (PTY spawn-options block, the
//  CliProvider interface, the terminal-pane WS wiring, the ported protocol
//  modules) carries vibeyard's MIT attribution notice; and the repo NOTICE
//  surface records the vibeyard MIT obligation."
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// Each adapted file must name vibeyard AND MIT in its header notice.
// MILESTONE 46 / STORY 04 MOVED FIVE OF THESE ENTRIES, IN THE SAME DIFF THAT MOVED THE CODE.
// The list is hard-coded and `readFile` throws on a missing path, so an under-counted move fails
// CI LOUDLY rather than silently — which is the correct behaviour and must NOT be "fixed" by
// deleting an entry. What each retired path became, so a reviewer can check the move rather than
// the count (ADR-006 cited "4 of 6"; counted at source it was FIVE `ui/` entries, and using the
// FILE rather than the ADR's number is the whole point of writing this down):
//
//   ui/src/board/TerminalDock.tsx                     ─┐  the xterm pane wiring: new Terminal(),
//   ui/src/fleet/terminal-view/FleetTerminalView.tsx  ─┘  FitAddon/WebLinksAddon, open(), fit(),
//                                                         onData → carrier, dispose/close
//                                                    →  ui/src/terminal/TerminalControl.tsx
//   ui/src/board/terminal/dock-state.mjs   → ui/src/terminal/state-ramp.mjs   (the state ramp)
//   ui/src/board/terminal/resize.mjs       → ui/src/terminal/geometry.mjs     (fit → resize)
//   ui/src/board/terminal/provider-picker.mjs → ui/src/terminal/provider-picker.mjs (already
//                                                 listed by 46/03, which created that home)
//
// TWO OF THE NEW ENTRIES ARE NEW GUARDS, NOT RE-POINTS: `state-ramp.mjs` and `geometry.mjs` were
// authored in 46/03 WITHOUT the notice their ancestors carried, so the obligation travelled with
// the code but the header did not. 46/04 adds both headers and both entries. That is a licence
// obligation being repaired, not housekeeping.
const ADAPTED_FILES = [
  "src/terminal-ws.mjs",
  "src/terminal-providers.mjs",
  "ui/src/terminal/TerminalControl.tsx",
  "ui/src/terminal/state-ramp.mjs",
  "ui/src/terminal/geometry.mjs",
  "ui/src/terminal/provider-picker.mjs",
];

export const archTests = [
  ...ADAPTED_FILES.map((rel) => ({
    name: `arch/ADR-003: ${rel} carries the vibeyard MIT attribution notice`,
    run: async () => {
      const text = await readFile(path.join(repoRoot, rel), "utf8");
      // The notice (in the file header) must name vibeyard and MIT.
      assert.ok(/vibeyard/i.test(text), `${rel} names vibeyard`);
      assert.ok(/\bMIT\b/.test(text), `${rel} names the MIT licence`);
      // And it should read as an attribution/adaptation notice, not an incidental
      // mention — the litmus is "Adapted from … vibeyard … (MIT)".
      assert.ok(
        /Adapted from\s+\S*vibeyard/i.test(text),
        `${rel} carries an "Adapted from … vibeyard" attribution notice`
      );
    },
  })),
  {
    // THE NOTICE'S OWN LIST IS PARSED AND COMPARED, not merely grepped for two words.
    //
    // Until 46/04 this clause asked only whether `NOTICE` said "vibeyard" and "MIT" — so when the
    // browser-side derivations moved, the NOTICE went on naming FOUR DELETED FILES and naming
    // none of the four that now carry the per-file notice, and the gate stayed green. ADR-001
    // calls this a LICENCE obligation rather than housekeeping: the repo-level surface is the one
    // a downstream consumer actually reads, and a list of files that do not exist is worse than
    // no list, because it looks like diligence.
    name: "arch/ADR-003: the repo NOTICE surface records the vibeyard MIT obligation, and the file list it publishes is EXACTLY the set of files carrying the per-file notice",
    run: async () => {
      const text = await readFile(path.join(repoRoot, "NOTICE"), "utf8");
      assert.ok(/vibeyard/i.test(text), "the NOTICE names vibeyard");
      assert.ok(/\bMIT\b/.test(text), "the NOTICE records the MIT obligation");

      // The published list: the bulleted paths under the "carry the corresponding per-file …
      // notice" heading. Parsed from the document rather than assumed, so a reformat that loses
      // the list fails here rather than silently emptying the comparison.
      const heading = /attribution notice:\s*\n((?:\s*-\s+\S+\n)+)/.exec(text.replace(/\r\n/g, "\n"));
      assert.ok(heading != null, "the NOTICE publishes a bulleted list of the files carrying the per-file notice");
      const published = heading[1]
        .split("\n")
        .map((line) => line.replace(/^\s*-\s+/, "").trim())
        .filter(Boolean);
      assert.ok(published.length >= 4, `the published list is non-vacuous: ${published.length} entries`);

      assert.deepEqual(
        [...published].sort(),
        [...ADAPTED_FILES].sort(),
        "the NOTICE's published list and this gate's ADAPTED_FILES are ONE set. They drifted at 46/04's first cut — the NOTICE still named `ui/src/board/TerminalDock.tsx`, `ui/src/board/terminal/{dock-state,provider-picker,resize}.mjs` after all four were deleted — and only the per-file half was guarded. Both halves move in the diff that moves the code.",
      );

      // …and every published path is on disk, which is what makes the set-equality a claim about
      // the repository rather than about two lists agreeing with each other.
      for (const relative of published) {
        await readFile(path.join(repoRoot, relative), "utf8");
      }
    },
  },
];
