// pre-commit — REFUSE A COMMIT THAT NAMES A PRIVATE DOWNSTREAM PROJECT.
//
// WHY A HOOK AS WELL AS A FITNESS FUNCTION. `test/arch/acd-no-internal-project-names.test.mjs`
// asserts the same rule, but it only fires when someone runs the suite. This repo's own
// measured lesson is that a control which depends on somebody remembering to run it is a wish,
// not a control — 419 references accumulated over three months with a test suite running the
// whole time. A commit hook is the earliest point where the disclosure can be PREVENTED rather
// than DISCOVERED, so both exist: this refuses the commit, the arch test refuses the merge.
//
// IT SCANS THE STAGED CONTENT, NOT THE WORKING TREE. What is about to be published is the index,
// so that is the subject. A dirty working file that is not staged is not this hook's business.
//
// THE TERM LIST IS GITIGNORED (`.aof/private-terms.json`), so this hook publishes nothing and
// SKIPS on a machine that has no list — the guard-if-present idiom used by the arch test and by
// the cargo lane in `scripts/test.mjs`. Seed it per machine:
//   {"terms":["some-private-project","another-one"]}
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const TERMS_FILE = path.join(repoRoot, ".aof", "private-terms.json");

// Paths allowed to hold the terms, each for a written reason (mirrors the arch test's EXEMPT).
const EXEMPT = new Set([
  ".aof/private-terms.json",                             // the list itself, never tracked
  "test/arch/acd-no-internal-project-names.test.mjs",    // the fitness function, which discusses the rule
  ".githooks/pre-commit.mjs",                            // this hook, same reason
]);

function loadTerms() {
  if (!existsSync(TERMS_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(TERMS_FILE, "utf8"));
    const terms = Array.isArray(parsed) ? parsed : parsed?.terms;
    if (!Array.isArray(terms) || terms.length === 0) return null;
    return terms.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim());
  } catch {
    // A malformed list must not silently disable the guard — fail LOUD and refuse.
    console.error(`pre-commit: ${path.relative(repoRoot, TERMS_FILE)} is present but unreadable/malformed.`);
    process.exit(1);
  }
}

const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const terms = loadTerms();
if (terms == null) process.exit(0); // no list on this machine — skip, exactly like the arch test

const pattern = new RegExp(terms.map(escape).join("|"), "gi");

// Staged, non-deleted paths.
const staged = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=d", "-z"], {
  cwd: repoRoot, maxBuffer: 64 * 1024 * 1024,
}).toString("utf8").split("\0").filter(Boolean);

const offences = [];
for (const rel of staged) {
  if (EXEMPT.has(rel)) continue;
  let blob = "";
  try {
    // Read the STAGED blob, not the file on disk — they can differ.
    blob = execFileSync("git", ["show", `:${rel}`], { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
  } catch { continue; } // binary or unreadable — nothing to scan
  const lines = blob.split(/\r?\n/);
  lines.forEach((line, i) => {
    const hits = line.match(pattern);
    if (hits) offences.push(`  ${rel}:${i + 1}  ${[...new Set(hits.map((h) => h.toLowerCase()))].join(", ")}`);
  });
}

if (offences.length > 0) {
  console.error("");
  console.error("COMMIT REFUSED — staged content names a private downstream project.");
  console.error("");
  console.error(offences.slice(0, 40).join("\n"));
  if (offences.length > 40) console.error(`  …and ${offences.length - 40} more`);
  console.error("");
  console.error("Replace the name with a placeholder. If a reference is genuinely unavoidable,");
  console.error("add the path to EXEMPT in .githooks/pre-commit.mjs AND in");
  console.error("test/arch/acd-no-internal-project-names.test.mjs, with a written reason.");
  console.error("");
  process.exit(1);
}
