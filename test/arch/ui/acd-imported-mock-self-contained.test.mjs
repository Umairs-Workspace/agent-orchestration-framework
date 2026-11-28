// FF-19805 — an imported mock is self-contained (milestone 198 / story 02, 198/ADR-006 §2).
//
// "Every `.dc.html` under a `mocks/` dir that names a canvas URL in its README references only
//  `./support.js`, its sibling files and `ds/*/tokens.json`. It holds no `http(s)://` source other
//  than a Google Fonts `css2` link." Amended by 198 F-07: every component a board mounts with
//  `<dc-import>` is a sibling file the import holds.
//
// Covers E15 of 198/02's tasks/01_import-commits-an-approved-canvas-with-its-provenance.feature.
//
// Why it matters: the fidelity judge reads local files only (m07/ADR-003), and a baseline that
// loads its runtime or its tokens from the network renders differently, or not at all, the day the
// network or the canvas is gone. Only a README with a `Canvas:` line is swept, because only
// `aof design-system mocks import` writes one (Q12); the hand-imported mocks of 21, 25, 46 and 47
// are not imports. A fixture import is swept too, so the control is never vacuous.
//
// The detector is pure over `{ file, text }`, so the red probe feeds it a planted board.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mountedNames } from "@aof/design-system/mocks";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WORK = path.join(repoRoot, "wiki", "work");
const FIXTURE = path.join(repoRoot, "test", "fixtures", "design-system", "imported-mock");
const GOOGLE_FONTS_CSS2 = "https://fonts.googleapis.com/css2?";
const IMPORT_MARK = /^Canvas: https:\/\/claude\.ai\/(?:code\/)?artifact\/\S+ \(version .+\)$/mu;

const posix = (value) => value.replaceAll("\\", "/");

// Every mocks/ directory under the work tree whose README records an import.
function importedMockDirs() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const child = path.join(dir, entry.name);
      if (entry.name === "mocks") {
        const readme = path.join(child, "README.md");
        if (existsSync(readme) && IMPORT_MARK.test(readFileSync(readme, "utf8"))) out.push(child);
      } else if (entry.name !== "node_modules") walk(child);
    }
  };
  walk(WORK);
  return out;
}

// Each board of a mocks dir as `{ file, text }`, its file relative to the repository.
function boardsOf(dir) {
  return readdirSync(dir, { recursive: true })
    .map(String)
    .filter((name) => name.endsWith(".dc.html"))
    .map((name) => ({ file: posix(path.relative(repoRoot, path.join(dir, name))), text: readFileSync(path.join(dir, name), "utf8") }));
}

// Every source a board names: src/href attributes, CSS url(), and the module imports of its
// scripts (through the one import-specifier home, FF-11901).
function sourcesOf(text) {
  const out = [];
  for (const pattern of [/\b(?:src|href)\s*=\s*["']([^"']+)["']/giu, /url\(\s*["']?([^"')\s]+)["']?\s*\)/giu]) {
    for (const match of text.matchAll(pattern)) out.push(match[1]);
  }
  return [...out, ...importSpecifiers(text)];
}

// `<board>: <source> (<why>)` for every source an offline baseline cannot keep. A `<dc-import>`
// mounts a sibling `.dc.html`; one the import does not hold renders blank offline (198 F-07).
export function selfContainedBreaches(boards) {
  const breaches = [];
  const held = new Set(boards.map(({ file }) => file));
  for (const { file, text } of boards) {
    const dir = file.includes("/") ? file.slice(0, file.lastIndexOf("/") + 1) : "";
    for (const name of mountedNames(text)) {
      if (!held.has(`${dir}${name}.dc.html`)) breaches.push(`${file}: <dc-import name="${name}"> (${name}.dc.html is not in the import)`);
    }
    for (const source of sourcesOf(text)) {
      if (source.startsWith("#") || source.startsWith("data:")) continue;
      if (/^https?:\/\//iu.test(source)) {
        if (!source.startsWith(GOOGLE_FONTS_CSS2)) breaches.push(`${file}: ${source} (a network source other than a Google Fonts css2 link)`);
        continue;
      }
      if (/^[a-z][a-z0-9+.-]*:/iu.test(source) || source.startsWith("/") || source.startsWith("\\") || posix(source).split("/").includes("..")) {
        breaches.push(`${file}: ${source} (not a sibling file of the board)`);
      }
    }
  }
  return breaches;
}

const fixtureBoards = () => boardsOf(FIXTURE);

export const archTests = [
  {
    name: "arch/198 FF-19805 · every imported mock is self-contained — the work tree's imports and the fixture import",
    run: () => {
      const fixture = fixtureBoards();
      assert.ok(IMPORT_MARK.test(readFileSync(path.join(FIXTURE, "README.md"), "utf8")), "the fixture's README records an import");
      assert.ok(fixture.length >= 1, "the fixture holds a board, so the control is never vacuous");
      const sources = fixture.flatMap(({ text }) => sourcesOf(text));
      for (const kind of ["./support.js", "ds/aof/tokens.json"]) assert.ok(sources.includes(kind), `the fixture board loads ${kind}`);
      assert.ok(sources.some((source) => source.startsWith(GOOGLE_FONTS_CSS2)), "and a Google Fonts css2 link, which is allowed");
      const boards = [...fixture, ...importedMockDirs().flatMap(boardsOf)];
      assert.deepEqual(selfContainedBreaches(boards), []);
    },
  },
  {
    name: "arch/198 FF-19805 red probe · a fixture board that also loads a script from the network turns the control red, naming the board and the source",
    run: () => {
      const planted = fixtureBoards().map((board) => ({ ...board, text: board.text.replace("</head>", '<script src="https://cdn.example.com/x.js"></script>\n</head>') }));
      const breaches = selfContainedBreaches(planted);
      assert.deepEqual(breaches, ["test/fixtures/design-system/imported-mock/board.dc.html: https://cdn.example.com/x.js (a network source other than a Google Fonts css2 link)"]);
      assert.deepEqual(selfContainedBreaches([{ file: "m/b.dc.html", text: '<script src="../../secret.js"></script>' }]), ["m/b.dc.html: ../../secret.js (not a sibling file of the board)"]);
      // 198 F-07: a board that mounts a component the import does not hold, as the portal's 37 import did.
      const mounting = { file: "m/OnRecord.dc.html", text: '<dc-import name="Messaging" view="record"></dc-import>' };
      assert.deepEqual(selfContainedBreaches([mounting]), ['m/OnRecord.dc.html: <dc-import name="Messaging"> (Messaging.dc.html is not in the import)']);
      assert.deepEqual(selfContainedBreaches([mounting, { file: "m/Messaging.dc.html", text: "<x-dc></x-dc>" }]), [], "held beside it, it is self-contained");
    },
  },
];
