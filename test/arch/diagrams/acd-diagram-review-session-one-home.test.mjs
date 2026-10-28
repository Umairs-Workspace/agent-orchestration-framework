// FF-17202 (milestone 172 / ADR-002 §2) — THE ARCHITECT'S REVIEW VOCABULARY HAS ONE HOME.
//
// "The `/aof:diagram-review` invocation and the architect session's tool list are spelled only in
//  `packages/diagrams/src/review-session.mjs`."
//
// Why it matters: the server types the invocation into a session that runs Bash, and the tool list is
// everything that session may do. A second spelling — the editor composing its own copy, the face
// building the command from what a page posted, a tool list widened in one place — is a second
// authority over both, and the two drift the first time one of them changes. The browser's copy-the-
// command fallback and the scene command's `session` action both import the one module.
//
// Scope: every runtime source under `packages/` and `apps/` (node and browser alike), comments
// stripped, so a comment that names the command is not a spelling. Ownership is what a CODE literal
// says: the invocation's prefix, and the scoped Bash grant only the review session holds.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const HOME = "packages/diagrams/src/review-session.mjs";
const SPELLINGS = [["/aof:diagram-review", "the review invocation"], ["Bash(aof diagram scene", "the session's tool list"]];

function spellings(rel, source) {
  const code = stripComments(source);
  return SPELLINGS.filter(([needle]) => code.includes(needle)).map(([, what]) => `${rel} spells ${what}`);
}

async function offenders(extra = []) {
  const files = (await readRuntimeFiles(repoRoot)).filter((file) => file.rel.startsWith("packages/") || file.rel.startsWith("apps/"));
  assert.ok(files.length > 400, `the packages and apps sources were enumerated (${files.length})`);
  assert.ok(files.some((file) => file.rel === HOME), "the one home is scanned");
  assert.ok(files.some((file) => file.rel.endsWith(".tsx")), "the browser sources are scanned");
  const found = [];
  for (const file of [...files, ...extra]) {
    const hits = spellings(file.rel, file.body ?? await readFile(file.path, "utf8"));
    if (file.rel === HOME) assert.equal(hits.length, SPELLINGS.length, "the home spells both (non-vacuity)");
    else found.push(...hits);
  }
  return found;
}

export const archTests = [
  {
    name: "arch/172 FF-17202: /aof:diagram-review and the architect session's tools are spelled only in review-session.mjs",
    run: async () => assert.deepEqual(await offenders(), []),
  },
  {
    name: "arch/172 FF-17202 red probe: a planted second spelling in another module is reported, and a comment is not one",
    run: async () => {
      const planted = [
        { rel: "packages/diagrams-ui/src/rogue.mjs", body: 'export const again = (ref, file) => `/aof:diagram-review ${ref} ${file}`;\n' },
        { rel: "apps/ui/src/rogue.tsx", body: 'const tools = ["Read", "Bash(aof diagram scene:*)"];\n' },
        { rel: "packages/server/src/rogue.mjs", body: "// the session runs /aof:diagram-review with Bash(aof diagram scene:*)\nconst a = 1;\n" },
      ];
      assert.deepEqual(await offenders(planted), ["packages/diagrams-ui/src/rogue.mjs spells the review invocation", "apps/ui/src/rogue.tsx spells the session's tool list"]);
    },
  },
];
