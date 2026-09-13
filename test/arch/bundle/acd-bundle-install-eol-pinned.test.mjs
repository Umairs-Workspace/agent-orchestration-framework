// Fitness function: acd-bundle-install-eol-pinned (chore 108 — the guard for the pin
// chore 108 landed).
//
//   "The INSTALLED bundle trees — `.claude/`, `.codex/`, `.opencode/`, the render targets
//    of `aof work init` / `aof work update` — are pinned `text eol=lf` in .gitattributes,
//    exactly as their LF-pinned `src/bundle/**` source already is."
//
// WHY THIS EXISTS. `planApplyActions` (src/render-plan.mjs) classifies a managed file by
// comparing its ON-DISK BYTES against both the desired render's hash and the install
// manifest's, and refuses to overwrite a divergent one without `--force`. The renderer
// emits LF; `src/bundle/**` is pinned LF. With the install targets unpinned, a
// `core.autocrlf=true` Windows checkout writes CRLF and every rendered file is drift by
// construction — so `aof work update` stops re-rendering the repo's own bundle, silently,
// and the installed prompts freeze at whatever text was last force-written. Measured at
// HEAD before this chore, on this control node: 21 `drift-warning` actions across the
// three trees, `git ls-files --eol` reporting `i/lf w/crlf attr/` for every one, and a
// genuinely stale `aof-agent-architect` render hiding behind them. On Linux CI nothing
// reds, so deleting the rule would land green and re-arm the freeze — a rule with no gate
// behind it. This is that gate.
//
// THE METHOD is `acd-runs-eol-pinned`'s and `acd-loop-document-eol-pinned`'s, deliberately:
// assert through `git check-attr`, git's OWN attribute matcher, never a literal grep of
// .gitattributes (a grep passed while the real path stayed unpinned — the m23/R3
// near-miss). The subjects are REAL render-output paths taken from the three runtimes'
// distinct output shapes (claude command, claude agent, codex skill, codex agent, opencode
// command, opencode agent, claude hook, opencode plugin), so a pin narrowed to one runtime
// or one member kind reds here. Non-vacuous via an out-of-scope control that must stay
// `unspecified`.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSyncHardened } from "../../support/cli-spawn.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// Forward-slash pathspec form. check-attr matches patterns, so the files need not exist —
// which is the point: these stand for the SHAPE of each runtime's render output, and a new
// member landing in any of them inherits the pin.
const INSTALL_TARGETS = [
  ".claude/commands/aof/verify.md",
  ".claude/agents/aof-architect.md",
  ".claude/hooks/aof/run-heartbeat-enqueue.mjs",
  ".codex/skills/aof-verify/SKILL.md",
  ".codex/agents/aof-architect.md",
  ".codex/hooks.json",
  ".opencode/commands/aof/verify.md",
  ".opencode/agents/aof-architect.md",
  ".opencode/plugins/aof-opencode-session-start.js",
];

// The control proving the matcher can say no. A source file outside the three install
// trees and outside every other pin in .gitattributes.
const CONTROL = "src/render-plan.mjs";

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
    name: "arch/bundle-install-eol-pinned: every installed bundle render target — across all three runtimes and every member kind — is pinned eol=lf (git-semantics matching via check-attr; without this, a core.autocrlf=true checkout makes every rendered file drift and `aof work update` stops re-rendering)",
    run: async () => {
      const attrs = checkAttr(INSTALL_TARGETS);
      for (const target of INSTALL_TARGETS) {
        assert.equal(
          attrs[target]?.eol,
          "lf",
          `${target} is pinned eol=lf, so the bytes on disk match the LF the renderer wrote and the manifest hashed — got ${JSON.stringify(attrs[target])}`
        );
        assert.equal(
          attrs[target]?.text,
          "set",
          `${target} is treated as text (so the eol pin applies)`
        );
      }
    },
  },
  {
    name: "arch/bundle-install-eol-pinned: the matcher is non-vacuous — a source file outside the install trees reports `unspecified` (the control proving check-attr can say no)",
    run: async () => {
      const attrs = checkAttr([CONTROL]);
      assert.equal(
        attrs[CONTROL]?.eol,
        "unspecified",
        `an out-of-scope source file carries NO eol pin (the control — if this matched, the proof would be vacuous) — got ${JSON.stringify(attrs[CONTROL])}`
      );
    },
  },
];
