// Fitness function: acd-loop-document-eol-pinned (chore 101 — the guard for the pin
// chore 101 landed).
//
//   "`wiki/work/loops.md` is pinned `text eol=lf` in .gitattributes, and the pin is
//    scoped to that one path rather than a `wiki/work/**/*.md` blanket."
//
// WHY THIS EXISTS. The pin's absence only manifests on a `core.autocrlf=true` Windows
// checkout, where `acd-loop-document-current` reds with a false `STALE` naming a registry
// that never changed (chore 101 reproduced exactly that at HEAD). On Linux CI nothing reds,
// so deleting the rule would land green and re-arm the false red — a rule with no gate
// behind it. This is that gate.
//
// THE METHOD is `acd-runs-eol-pinned`'s, deliberately: assert through `git check-attr`,
// git's OWN attribute matcher, never a literal grep of .gitattributes (a grep passed while
// the real path stayed unpinned — the m23/R3 near-miss). Non-vacuous two ways: an
// out-of-scope path must report `unspecified`, AND the hand-authored record doc that is
// `acd-runs-eol-pinned`'s own control must STAY `unspecified` — the blanket-glob version of
// this rule made that proof vacuous and was rejected under review.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSyncHardened } from "../../support/cli-spawn.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// Forward-slash pathspec form. check-attr matches patterns, so the files need not exist.
const LOOP_DOCUMENT = "wiki/work/loops.md";
// The CONTROL that the rejected `wiki/work/**/*.md` glob would have swallowed — it is
// `acd-runs-eol-pinned`'s non-vacuity control, asserted `unspecified` there.
const SIBLING_CONTROL = "wiki/work/26_milestone_distributed-runs-leasing/SPEC.md";
// A second out-of-scope path under the same directory (a hand-authored doc, no byte guard).
const ROADMAP_CONTROL = "wiki/work/ROADMAP.md";

// Parse `git check-attr text eol -- <paths>` into { path: { attr: value } }.
function checkAttr(paths) {
  const r = spawnSyncHardened("git", ["check-attr", "text", "eol", "--", ...paths], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `git check-attr runs cleanly (stderr: ${r.stderr})`);
  const out = {};
  for (const line of r.stdout.split(/\r?\n/)) {
    const m = /^(.+?): (text|eol): (.+)$/.exec(line.trim());
    if (!m) continue;
    (out[m[1]] ??= {})[m[2]] = m[3];
  }
  return out;
}

export const archTests = [
  {
    name: "arch/loop-document-eol-pinned: the committed loop document wiki/work/loops.md is pinned eol=lf (git-semantics matching via check-attr — without this, deleting the rule lands green on Linux CI and re-arms the false STALE red on a Windows checkout)",
    run: async () => {
      const attrs = checkAttr([LOOP_DOCUMENT]);
      assert.equal(
        attrs[LOOP_DOCUMENT]?.eol,
        "lf",
        `the committed loop document is pinned eol=lf, so its byte-identity drift guard compares LF against the composer's LF — got ${JSON.stringify(attrs[LOOP_DOCUMENT])}`
      );
      assert.equal(
        attrs[LOOP_DOCUMENT]?.text,
        "set",
        "the loop document is treated as text (so the eol pin applies)"
      );
    },
  },
  {
    name: "arch/loop-document-eol-pinned: the pin is SCOPED to the one path — the hand-authored record docs under wiki/work stay `unspecified` (a blanket wiki/work/**/*.md glob would make acd-runs-eol-pinned's non-vacuity control vacuous; measured red under review)",
    run: async () => {
      const attrs = checkAttr([SIBLING_CONTROL, ROADMAP_CONTROL]);
      assert.equal(
        attrs[SIBLING_CONTROL]?.eol,
        "unspecified",
        `acd-runs-eol-pinned's own control doc carries NO eol pin — if this matched, THAT proof would be vacuous — got ${JSON.stringify(attrs[SIBLING_CONTROL])}`
      );
      assert.equal(
        attrs[ROADMAP_CONTROL]?.eol,
        "unspecified",
        `a hand-authored doc under the work directory carries no byte-identity guard, so it carries no pin (the control proving check-attr can say no) — got ${JSON.stringify(attrs[ROADMAP_CONTROL])}`
      );
    },
  },
];
