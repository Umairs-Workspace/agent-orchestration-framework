// FF-14802 — milestone 148 / ADR-001: "The memory vocabulary has one home."
//
// Three readers need the same answer to "what is a lesson's meta line, and which values are legal":
// the retrospective parser (both memory backends and `aof work tune`), the validate rule and
// `memory status`. A copy per package is the drift milestone 148 exists to stop, so:
//
//   (a) in comment-stripped `packages/*/src/**`, the meta-label alternation (two or more of
//       Kind | Area | Stage | Owner | Raised by joined by `|`) and the token `open-by-decision`
//       appear only in `packages/work/src/memory-vocabulary.mjs`;
//   (b) the retrospective prompt's Kind, Area and Stage lists name exactly its enums;
//   (c) the OUTCOME template's status comment names exactly its gap statuses — in the shipped
//       template and in this repository's rendered copy.
//
// The prompt and the template are where an author learns the vocabulary, so a value added to the
// module and not to them would be legal and never written, and one added to them and not to the
// module would be written and counted non-enum forever.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GAP_STATUSES, LESSON_AREAS, LESSON_KINDS, LESSON_STAGES } from "@aof/work/memory-vocabulary";
import { stripComments } from "../../support/source-slice.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const HOME = "packages/work/src/memory-vocabulary.mjs";

const LABEL = "(?:Kind|Area|Stage|Owner|Raised by)";
const ALTERNATION_RE = new RegExp(`${LABEL}\\s*\\|\\s*${LABEL}`);
const TOKEN_RE = /open-by-decision/;

function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules") continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(mjs|js|cjs)$/.test(name)) out.push(full);
    }
  };
  const packages = path.join(REPO_ROOT, "packages");
  for (const pkg of readdirSync(packages)) {
    const src = path.join(packages, pkg, "src");
    try {
      if (statSync(src).isDirectory()) walk(src);
    } catch {
      // a package with no src/ has nothing to sweep
    }
  }
  return out;
}

const rel = (file) => path.relative(REPO_ROOT, file).split(path.sep).join("/");

// The `|`-separated values after a `**Label:**` on the prompt's vocabulary lines.
function promptList(prompt, label) {
  const match = prompt.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^·\\n]+)`));
  assert.ok(match, `the retrospective prompt states a ${label} list`);
  return match[1].split("|").map((value) => value.trim()).filter(Boolean);
}

function templateStatuses(file) {
  const text = readFileSync(path.join(REPO_ROOT, file), "utf8");
  const match = text.match(/\*\*Status:\*\*[^\n]*<!--\s*([^>]*?)\s*-->/);
  assert.ok(match, `${file} carries a status comment on its Status line`);
  return match[1].split("|").map((value) => value.trim()).filter(Boolean);
}

export const archTests = [
  {
    name: "arch/FF-14802: the meta-label grammar and open-by-decision are spelled only in the vocabulary module",
    run: () => {
      const files = sourceFiles();
      assert.ok(files.length > 100, `the sweep read ${files.length} source files`);
      const homes = { alternation: [], token: [] };
      for (const file of files) {
        const code = stripComments(readFileSync(file, "utf8"));
        if (ALTERNATION_RE.test(code)) homes.alternation.push(rel(file));
        if (TOKEN_RE.test(code)) homes.token.push(rel(file));
      }
      assert.deepEqual(homes.alternation, [HOME], "the meta-label alternation has one home");
      assert.deepEqual(homes.token, [HOME], "the open-by-decision token has one home");
    },
  },
  {
    name: "arch/FF-14802: the retrospective prompt names exactly the vocabulary's kinds, areas and stages",
    run: () => {
      const prompt = readFileSync(path.join(REPO_ROOT, "packages/core/assets/commands/retrospective.md"), "utf8");
      assert.deepEqual(promptList(prompt, "Kind"), [...LESSON_KINDS]);
      assert.deepEqual(promptList(prompt, "Area"), [...LESSON_AREAS]);
      assert.deepEqual(promptList(prompt, "Stage"), [...LESSON_STAGES]);
    },
  },
  {
    name: "arch/FF-14802: the OUTCOME template's status comment names exactly the vocabulary's gap statuses",
    run: () => {
      for (const file of ["packages/core/assets/templates/shared/OUTCOME.md", ".aof/templates/work/shared/OUTCOME.md"]) {
        assert.deepEqual(templateStatuses(file), [...GAP_STATUSES], file);
      }
    },
  },
];
