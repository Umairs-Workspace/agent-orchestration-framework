// Fitness function — THIS REPO MUST NOT NAME A PRIVATE PROJECT.
//
// WHAT HAPPENED. This repo was PUBLIC until 2026-08-15. Measured that day:
// 100 tracked files carried 419 references to downstream projects that are not
// public — as testbed names, as `C:\Source\…` paths, and as per-milestone measurements
// ("on <project> 348, three kills cost 6h18m"). None of it is product internals; all of it
// discloses that those projects exist, what they are called, and how their delivery went.
// The disclosure was never a decision — it accumulated one honest example at a time, because
// naming the real testbed is what makes a measurement credible.
//
// IT IS A HARD ZERO, BECAUSE THE TREE IS CLEAN. The scrub ran first (2026-08-15): all 419
// occurrences were replaced with length- AND sort-order-preserving placeholders, so there is
// nothing left to ratchet down from and no reason to accept a single one. The BASELINE map
// below is therefore EMPTY, and it exists rather than being deleted so that the only way to
// re-admit a reference is to add a line to it — a visible, reviewable act, never a silent one.
//
// (The first scrub pass preserved length but not alphabetical order, and two fleet fixtures
// assert a sorted board list — caught by running them, not by reading them. The placeholders
// now preserve both.)
//
// WHY THE TERMS ARE NOT IN THIS FILE. Writing the private names into the guard would publish
// them in the very commit that claims to protect them — the shape this repo keeps hitting,
// where the control reproduces the defect it names. The list lives in `.aof/private-terms.json`
// (gitignored, seeded per machine). ABSENT ⇒ the guard SKIPS with a message naming what to
// create, which is the guard-if-present idiom `scripts/test.mjs` already uses for the cargo
// lane. That means it does NOT protect a fresh CI clone; it protects the machine where a
// leak is authored, which is the only place a leak can be prevented rather than discovered.
//
// SELF-EXEMPTION, DECLARED. This file discusses the rule, so a scan that included it would
// report itself — "self-inclusion of the guard's own file or message" is a documented
// vacuity shape (see `wiki/planning/FINDING-acd-executable-gate.md` §1a). It is excluded by
// path, once, here — never by an entry on the baseline, which must keep meaning "a file we
// decided about".
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const TERMS_FILE = path.join(repoRoot, ".aof", "private-terms.json");
const SELF = "test/arch/work/acd-no-internal-project-names.test.mjs";

// Paths that legitimately hold the terms, each with a written reason. An exemption is a
// window with a justification, never a permission (m352's rule, adopted).
const EXEMPT = new Set([
  SELF,                        // the guard itself — see the header
  ".aof/private-terms.json",   // the list, gitignored and never tracked
]);

// A file listed here may carry AT MOST its recorded count; a file absent from the map must
// carry NONE. The map is empty, so the rule is currently a hard zero.
const BASELINE = new Map([
  // EMPTY BY DESIGN — the tree carries no references. An entry here is an explicit,
  // reviewable decision to tolerate one, and must carry a written reason.
]);

function loadTerms() {
  if (!existsSync(TERMS_FILE)) return null;
  const parsed = JSON.parse(readFileSync(TERMS_FILE, "utf8"));
  const terms = Array.isArray(parsed) ? parsed : parsed?.terms;
  if (!Array.isArray(terms) || terms.length === 0) return null;
  return terms.filter((t) => typeof t === "string" && t.trim().length > 0).map((t) => t.trim());
}

const escape = (term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Count per TRACKED file — `git ls-files`, so an untracked scratch file is not the subject
// (the rule is about what is PUBLISHED, not about what sits on disk).
function countPerFile(terms) {
  const pattern = new RegExp(terms.map(escape).join("|"), "gi");
  const listed = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 })
    .toString("utf8").split("\0").filter(Boolean);
  const counts = new Map();
  for (const rel of listed) {
    if (EXEMPT.has(rel)) continue;
    let text = "";
    try { text = readFileSync(path.join(repoRoot, rel), "utf8"); } catch { continue; }
    const hits = text.match(pattern);
    if (hits && hits.length > 0) counts.set(rel, hits.length);
  }
  return counts;
}

const SKIP_MESSAGE =
  `skipped — no ${path.relative(repoRoot, TERMS_FILE)} on this machine. ` +
  `Create it (gitignored) as {"terms":["…"]} naming the private projects this repo must not disclose.`;

export const archTests = [
  {
    name: "arch/disclosure (acd-no-internal-project-names): no NEW disclosure — every tracked file is at or below its baseline, and an unlisted file has none",
    run: async () => {
      const terms = loadTerms();
      if (terms == null) { console.log(`ok - ${SKIP_MESSAGE}`); return; }

      const counts = countPerFile(terms);
      const violations = [];
      for (const [rel, n] of [...counts].sort()) {
        const cap = BASELINE.get(rel);
        if (cap == null) violations.push(`${rel}: ${n} reference(s), and this file is NOT on the baseline — a new disclosure`);
        else if (n > cap) violations.push(`${rel}: ${n} reference(s), baseline ${cap} — the count GREW`);
      }
      assert.deepEqual(
        violations,
        [],
        "this repo must not name a private project. The baseline is shrink-only — " +
        "remove the reference, or (if it is legitimate and unavoidable) add an EXEMPT entry with a " +
        `written reason. Never raise a baseline number.\n  ${violations.join("\n  ")}`,
      );
    },
  },
  {
    name: "arch/disclosure (acd-no-internal-project-names): the baseline never rots — every listed file still exists and still carries at least one reference",
    run: async () => {
      const terms = loadTerms();
      if (terms == null) { console.log(`ok - ${SKIP_MESSAGE}`); return; }

      // A baseline entry for a file that is clean (or gone) is a cap nobody is under — it
      // would silently re-admit the disclosure if the file were ever re-dirtied. Any future
      // clean-up must DELETE its entry, and this clause is what forces that.
      const counts = countPerFile(terms);
      const stale = [...BASELINE.keys()].filter((rel) => !counts.has(rel)).sort();
      assert.deepEqual(
        stale,
        [],
        `these files are now CLEAN (or deleted) and their baseline entries must be REMOVED, ` +
        `so the cap cannot be silently re-used:\n  ${stale.join("\n  ")}`,
      );
    },
  },
  {
    name: "arch/disclosure (acd-no-internal-project-names): self-check — the scan is non-vacuous, and it fires on a planted reference",
    run: async () => {
      // NON-VACUITY, because a guard whose passing state is "found nothing" is
      // indistinguishable from a broken one by every signal except a red probe. Drive the
      // real matcher over synthetic text rather than the tree, so the check needs no fixture
      // file and cannot itself add a reference to the repo.
      const terms = ["acme-private-thing", "widgetco-portal"];
      const pattern = new RegExp(terms.map(escape).join("|"), "gi");

      assert.equal("a note about acme-private-thing here".match(pattern)?.length, 1, "fires on a planted reference");
      assert.equal("ACME-PRIVATE-THING shouted".match(pattern)?.length, 1, "case-insensitive — a name in a heading still counts");
      assert.equal("C:\\Source\\widgetco-portal\\x".match(pattern)?.length, 1, "fires inside a path, which is how most of them arrived");
      assert.equal("two: acme-private-thing and widgetco-portal".match(pattern)?.length, 2, "counts every occurrence, so a growing file trips the cap");
      assert.equal("nothing to see".match(pattern), null, "silent on clean text — the guard is not trivially true");

      // …and the metacharacter escape, because a term like `foo.bar` must not match `fooxbar`.
      const dotted = new RegExp(["foo.bar"].map(escape).join("|"), "gi");
      assert.equal("fooxbar".match(dotted), null, "a dot in a term is literal, not a wildcard");
      assert.equal("foo.bar".match(dotted)?.length, 1, "…and still matches itself");

      // The guard must be able to SKIP, and the skip must say what to create.
      assert.match(SKIP_MESSAGE, /private-terms\.json/, "the skip message names the file to create");
    },
  },
];
