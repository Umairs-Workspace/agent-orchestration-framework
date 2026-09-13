// Fitness function for milestone 03 / ADR-003:
// "The PTY/terminal native stack is confined to the SERVER — node-pty (and ws)
//  are dependencies of the ROOT package.json (never ui/package.json), and no
//  import/require of node-pty appears under ui/src/; the browser terminal imports
//  only @xterm/*."
//
// AMENDED BY MILESTONE 46 / STORY 04 (ADR-001 + ADR-006): the third clause STOPS HARD-CODING A
// PATH AND DISCOVERS ONE. It used to read `ui/src/board/TerminalDock.tsx` by name — which was
// two things at once, a file list to maintain and, once a SECOND `new Terminal(` site appeared
// in `ui/src/fleet/terminal-view/`, a rule that policed one of them and said nothing about the
// other. It now sweeps `ui/src` for construction sites, asserts there is EXACTLY ONE, and
// applies the `@xterm/*`-only rule to the site it FINDS.
//
// THAT SINGLE-SITE CLAUSE IS THIS MILESTONE'S HEADLINE, EXPRESSED STRUCTURALLY, and it cannot be
// satisfied by a partial landing — deliberately. Re-homing the board and leaving the fleet peek
// "for now" is the two-implementations state the milestone exists to end, and this is the gate
// that refuses it. A gate that cannot be broken by a file move is strictly better than one whose
// list must be maintained (ADR-006).
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments, stripperSelfCheck } from "../../support/terminal-gate-detectors.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function readJson(rel) {
  return JSON.parse(await readFile(path.join(repoRoot, rel), "utf8"));
}

// Recursively collect files under a dir matching an extension set.
async function collectFiles(dir, exts) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectFiles(full, exts)));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

export const archTests = [
  {
    name: "arch/ADR-003: node-pty and ws are ROOT dependencies, not ui/ dependencies",
    run: async () => {
      const root = await readJson("package.json");
      const ui = await readJson("ui/package.json");
      const rootDeps = { ...root.dependencies, ...root.devDependencies };
      const uiDeps = { ...ui.dependencies, ...ui.devDependencies };

      assert.ok(rootDeps["node-pty"], "root package.json depends on node-pty");
      assert.ok(rootDeps["ws"], "root package.json depends on ws");
      assert.ok(!uiDeps["node-pty"], "ui/package.json does NOT depend on node-pty");
      assert.ok(!uiDeps["ws"], "ui/package.json does NOT depend on ws");
    },
  },
  {
    name: "arch/ADR-003: no node-pty import/require anywhere under ui/src",
    run: async () => {
      const files = await collectFiles(path.join(repoRoot, "ui", "src"), [".ts", ".tsx", ".js", ".jsx", ".mjs"]);
      assert.ok(files.length > 0, "found ui/src source files to scan");
      const offenders = [];
      for (const file of files) {
        const text = await readFile(file, "utf8");
        if (/node-pty/.test(text) || /require\(['"]node-pty['"]\)/.test(text) || /from\s+['"]node-pty['"]/.test(text)) {
          offenders.push(path.relative(repoRoot, file));
        }
      }
      assert.deepEqual(offenders, [], "no ui/src file references node-pty");
    },
  },
  {
    name: "arch/03 ADR-003 + 46 ADR-001 (acd-terminal-server-only): EXACTLY ONE `new Terminal(` construction site exists under ui/src, and it is DISCOVERED rather than named — the browser terminal imports only @xterm/* for the terminal engine",
    run: async () => {
      // The stripper first: this clause is a COUNT, and a blinded stripper would count zero and
      // report the browser terminal missing rather than report a second one (TECH_DEBT item 24).
      assert.deepEqual(stripperSelfCheck(), [], "the shared stripper is line-comments-first — the other order eats the file and this sweep would find no site at all");
      const files = await collectFiles(path.join(repoRoot, "ui", "src"), [".ts", ".tsx", ".js", ".jsx", ".mjs"]);
      assert.ok(files.length > 30, `ui/src was actually read (non-vacuous): ${files.length} files`);

      // The sweep. `new Terminal(` is the construction site; nothing else in this tree spells it.
      //
      // COMMENTS ARE STRIPPED FIRST, with the shared line-comments-first stripper. A raw sweep
      // counts PROSE: this milestone's own files discuss `new Terminal(` in their headers (the
      // vibeyard attribution names it, and so does the boundary gate's rationale), so a comment
      // would have become a phantom second site and failed the single-site clause for a sentence.
      const sites = [];
      for (const file of files) {
        const text = stripComments(await readFile(file, "utf8"));
        if (/\bnew\s+Terminal\s*\(/.test(text)) sites.push(path.relative(repoRoot, file).split(path.sep).join("/"));
      }

      assert.deepEqual(
        sites.length,
        1,
        `EXACTLY ONE terminal is constructed under ui/src; found ${sites.length}: ${sites.join(", ") || "(none)"}. Two construction sites is two implementations behind one name — and the two this milestone deleted had ALREADY drifted by one addon (the board dock loaded WebLinksAddon and the fleet peek did not), which is what drift looks like before anyone notices. ZERO is not a pass either: the browser terminal must still exist.`,
      );

      // The `@xterm/*`-only rule now applies to the site the sweep FOUND.
      const text = await readFile(path.join(repoRoot, sites[0]), "utf8");
      assert.ok(/from\s+["']@xterm\/xterm["']/.test(text), `${sites[0]} imports the terminal engine from @xterm/xterm`);
      assert.ok(/from\s+["']@xterm\/addon-fit["']/.test(text), `${sites[0]} imports FitAddon from @xterm/addon-fit`);
      // PO ruling (46/04): WebLinksAddon is loaded on BOTH sources. It is not new exposure — the
      // dock already rendered `mirror` sessions and already loaded it unconditionally — and
      // making the peek match REMOVES an arbitrary difference between two views of the same
      // bytes, which is the milestone's whole thesis. It touches no input path.
      assert.ok(/from\s+["']@xterm\/addon-web-links["']/.test(text), `${sites[0]} imports WebLinksAddon from @xterm/addon-web-links`);
      // No server-side transport/native deps leak into the browser component.
      assert.ok(!/from\s+["']ws["']/.test(text), `${sites[0]} does not import ws`);
      assert.ok(!/node-pty/.test(text), `${sites[0]} does not import node-pty`);
      // The deprecated unscoped xterm package is not used.
      assert.ok(!/from\s+["']xterm["']/.test(text), "does not use the deprecated unscoped xterm package");
    },
  },
];
