// FF-19804 — the design-system verbs reach no network, and the package's prose holds no token parsing
// (milestone 198 / story 01, 198/ADR-003).
//
// Covers the two FF-19804 scenarios of
//   tasks/02_tokens-reads-the-system-from-the-code.feature
//
// Two legs over `@aof/design-system`:
//   - CODE: no module under packages/design-system/src imports an HTTP or socket client, or calls
//     `fetch(`. The verbs work on local files alone; only the session reaches claude.ai (ADR-003).
//   - PROSE: no prose file under packages/design-system/assets holds `@theme` or a `--x: v` custom
//     property declaration. Parsing a stylesheet is the `tokens` verb's, never the command's (§2).
// Each leg is pure over `{ file, text }`, so each planted breach is fed to it as text; the prose leg
// asserts it read at least one file, so it cannot pass over an empty package.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { moduleReferences } from "../../../scripts/workspace-boundaries.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PACKAGE = path.join(repoRoot, "packages", "design-system");

// The clients a verb could reach the network through.
const NETWORK_MODULES = Object.freeze(["node:http", "node:https", "node:http2", "node:net", "node:tls", "node:dgram", "http", "https", "http2", "net", "tls", "dgram", "undici", "node-fetch", "axios", "ws"]);
const DECLARATION = /(?:^|[\s;{`"'(])(--[A-Za-z][\w-]*\s*:\s*[^\s;`"'][^;`"'\n]*)/m;

function walk(dir, keep) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, keep));
    else if (keep(entry.name)) out.push(full);
  }
  return out;
}

const read = (files) => files.map((file) => ({ file: path.relative(repoRoot, file).replaceAll("\\", "/"), text: readFileSync(file, "utf8") }));
export const packageModules = () => read(walk(path.join(PACKAGE, "src"), (name) => /\.m?js$/.test(name)));
export const packageProse = () => read(walk(path.join(PACKAGE, "assets"), (name) => name.endsWith(".md")));

// The code leg: `<file>: <breach>` for every network import or fetch call.
export function networkBreaches(modules) {
  const breaches = [];
  for (const { file, text } of modules) {
    for (const { specifier } of moduleReferences(text, file).references) {
      if (NETWORK_MODULES.includes(specifier)) breaches.push(`${file}: imports ${specifier}`);
    }
    if (/\bfetch\s*\(/.test(stripComments(text))) breaches.push(`${file}: calls fetch(`);
  }
  return breaches;
}

// The prose leg: `<file>: <breach>` for every `@theme` and every custom-property declaration.
export function proseBreaches(prose) {
  const breaches = [];
  for (const { file, text } of prose) {
    if (text.includes("@theme")) breaches.push(`${file}: holds "@theme"`);
    const declaration = DECLARATION.exec(text);
    if (declaration) breaches.push(`${file}: declares a custom property (${declaration[1].trim()})`);
  }
  return breaches;
}

export const archTests = [
  {
    name: "198/01 02 FF-19804 · the verbs reach no network, and the package's prose holds no token parsing",
    run: () => {
      const modules = packageModules();
      assert.ok(modules.length >= 5, "the code leg reads the package's modules");
      assert.deepEqual(networkBreaches(modules), []);
      const prose = packageProse();
      assert.ok(prose.length >= 1, "the prose leg reads at least one file, so it cannot pass over an empty package");
      assert.deepEqual(proseBreaches(prose), []);
    },
  },
  ...[
    ["a module under the package's src that imports \"node:https\"", () => networkBreaches([...packageModules(), { file: "packages/design-system/src/planted.mjs", text: "import https from \"node:https\";\nexport const x = https;\n" }]), "packages/design-system/src/planted.mjs", "node:https"],
    ["a module under the package's src that calls \"fetch(\"", () => networkBreaches([...packageModules(), { file: "packages/design-system/src/planted.mjs", text: "export async function pull(url) { return fetch(url); }\n" }]), "packages/design-system/src/planted.mjs", "fetch("],
    ["a prose file under the package's assets that declares \"--color-x: red\"", () => proseBreaches([...packageProse(), { file: "packages/design-system/assets/commands/planted.md", text: "Read the stylesheet and take each `--color-x: red` line.\n" }]), "packages/design-system/assets/commands/planted.md", "--color-x: red"],
  ].map(([planted, run, file, breach]) => ({
    name: `198/01 02 FF-19804 · each planted breach turns the control red — ${planted}`,
    run: () => {
      const breaches = run();
      assert.equal(breaches.length, 1, breaches.join("\n"));
      assert.ok(breaches[0].startsWith(`${file}:`), `names the file: ${breaches[0]}`);
      assert.ok(breaches[0].includes(breach), `names the breach: ${breaches[0]}`);
    },
  })),
];
