// FF-19203 (milestone 193 / ADR-003 §3, §5) — THE OPERATOR PROFILE HAS ONE RESOLVER.
//
// "In comment-stripped runtime source, the three levels are spelt as a vocabulary only in
//  `packages/contracts/src/operator-profile.mjs`, and `work.operator` is read from a config only
//  through that module's resolver and merge."
//
// Why it matters: the doctor, `aof work update`, `init-config`, `project show` and the refine
// session all ask what the operator knows. A second reader that merges the two files its own way,
// or reads an unknown level as `expert`, is a session that pitches a question at the wrong person.
//
// The sweep reads RUNTIME source only, as 134/FF-13402 does: the schema spells the levels as an
// `enum`, and test fixtures spell them as data, and neither is a reader. A level list is matched as
// two of the three words quoted side by side; a read is a property access on `work` naming
// `operator`, matched with every string literal blanked, so a diagnostic's path in a message is
// text and not a read.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { blankStringLiterals, stripComments } from "../../support/source-slice.mjs";
import { OPERATOR_LEVELS } from "@aof/contracts/operator-profile";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const THE_ONE_HOME = "packages/contracts/src/operator-profile.mjs";

const LEVEL = String.raw`["'\`](?:expert|working|new)["'\`]`;
const SHAPES = [
  ["spells the three levels as a vocabulary", new RegExp(`${LEVEL}\\s*,\\s*${LEVEL}`), stripComments],
  ["reads work.operator from a config", /\bwork\s*\??\.\s*operator\b|\bwork\s*\??\.?\s*\[\s*["'`]operator["'`]\s*\]/, (text) => blankStringLiterals(stripComments(text))],
];
const IMPORTS_THE_LEAF = /from\s*["'](?:@aof\/contracts\/operator-profile|\.\/operator-profile\.mjs)["']/;

// The detector the sweep and the red probe share: each shape a module outside the home spells, as
// `<module>: <what> — <the line>`.
function offendersIn(files) {
  return files.flatMap(({ file, text }) => {
    if (file === THE_ONE_HOME) return [];
    return SHAPES.flatMap(([what, pattern, prepare]) => {
      const prepared = prepare(text).split("\n");
      const at = prepared.findIndex((line) => pattern.test(line));
      return at === -1 ? [] : [`${file}: ${what} — ${text.split("\n")[at].trim()}`];
    });
  });
}

async function sweep() {
  const files = [];
  for (const file of await readRuntimeFiles(repoRoot)) {
    files.push({ file: path.relative(repoRoot, file.path).replace(/\\/g, "/"), text: await readFile(file.path, "utf8") });
  }
  return {
    swept: files.map(({ file }) => file),
    offenders: offendersIn(files),
    importers: files.filter(({ text }) => IMPORTS_THE_LEAF.test(stripComments(text))).map(({ file }) => file),
  };
}

export const archTests = [
  {
    name: "arch/193 FF-19203: the operator profile has one resolver",
    run: async () => {
      const { swept, offenders, importers } = await sweep();
      assert.ok(swept.includes(THE_ONE_HOME), `the sweep found the home among the ${swept.length} runtime modules it read`);
      assert.deepEqual(offenders, [], "no other runtime module spells the levels or reads work.operator");
      assert.ok(importers.length >= 2, `the leaf has at least two importers, and has ${importers.length}: ${importers.join(", ")}`);
      // The home is the one module that spells them — the sweep would fire on it otherwise.
      const home = await readFile(path.join(repoRoot, THE_ONE_HOME), "utf8");
      for (const [what, pattern, prepare] of SHAPES) assert.ok(prepare(home).split("\n").some((line) => pattern.test(line)), `the home ${what}`);
      assert.deepEqual(OPERATOR_LEVELS, ["expert", "working", "new"]);
    },
  },
  {
    name: "arch/193 FF-19203: each planted second reader turns the control red (outline: 3 plants)",
    run: () => {
      const at = "packages/work/src/doctor/operator.mjs";
      const planted = [
        ["const LEVELS = [\"expert\", \"working\", \"new\"];", "spells the three levels as a vocabulary"],
        ["const levels = config.work.operator.expertise;", "reads work.operator from a config"],
        ["const role = config?.work?.operator?.role ?? null;", "reads work.operator from a config"],
      ];
      for (const [source, what] of planted) {
        const text = `import path from "node:path";\n${source}\nexport const x = 1;\n`;
        assert.deepEqual(offendersIn([{ file: at, text }]), [`${at}: ${what} — ${source}`], source);
      }
      // What is not a second reader: a diagnostic's path in a message, a comment, a lone word, the home.
      assert.deepEqual(offendersIn([{ file: at, text: "const message = `work.operator.role must be a string`;" }]), [], "a path in a message is text");
      assert.deepEqual(offendersIn([{ file: at, text: "// config.work.operator.expertise, [\"expert\", \"new\"]\nconst a = 1;" }]), [], "a comment is not code");
      assert.deepEqual(offendersIn([{ file: at, text: "const fresh = state === \"new\";" }]), [], "one level alone is not a vocabulary");
      assert.deepEqual(offendersIn([{ file: THE_ONE_HOME, text: "const LEVELS = [\"expert\", \"working\", \"new\"];" }]), [], "the home");
    },
  },
];
