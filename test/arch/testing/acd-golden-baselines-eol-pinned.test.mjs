// Fitness function: acd-golden-baselines-eol-pinned (FF-20303, 203/ADR-003 §4).
//
//   "Baselines are LF-pinned and inert. `git check-attr eol` reports `lf` for sample paths under
//    `test/golden/baselines/`, one per runtime tree and one under `home/`. Every file under that
//    root ends in `.golden`."
//
// WHY THIS EXISTS. A baseline is compared byte for byte with a normalised render that is always
// LF. Unpinned, a `core.autocrlf=true` Windows checkout writes every baseline CRLF and the whole
// golden suite is red by construction on the one platform CI does not run (the 22/R5, 01/R2,
// 40/04 carry-forward: a byte-identity guard must pin line endings). And the `.golden` suffix is
// what keeps a committed `.mjs`, `.feature` or `.md` render out of the source sweeps, the suite
// census, the graph and Claude Code, all at once (ADR-003 §4): a file without it is read by every
// one of them.
//
// THE METHOD is `acd-bundle-install-eol-pinned`'s: assert through `git check-attr`, git's own
// matcher, never a grep of .gitattributes. Patterns match paths, so the samples need not exist and
// the pin holds from this story on; the `.golden` sweep has nothing to sweep until story 01 commits
// the first baselines. Non-vacuous through a control that must stay `unspecified`.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSyncHardened } from "../../support/cli-spawn.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BASELINES = "test/golden/baselines";

// One sample per runtime tree, and one under `home/`, in the shape story 01's init lane writes.
const SAMPLES = [
  `${BASELINES}/init/three-runtimes/project/.claude/agents/aof-architect.md.golden`,
  `${BASELINES}/init/three-runtimes/project/.codex/agents/aof-architect.toml.golden`,
  `${BASELINES}/init/three-runtimes/project/.opencode/commands/aof/verify.md.golden`,
  `${BASELINES}/init/three-runtimes/project/.aof/aof.lock.json.golden`,
  `${BASELINES}/init/three-runtimes/home/mesh/nodes/node.json.golden`,
  `${BASELINES}/init/three-runtimes/steps.golden`,
];

// The control: the golden suite itself sits beside the baselines and carries no pin.
const CONTROL = "test/golden/golden-harness.test.mjs";

function checkAttr(paths) {
  const r = spawnSyncHardened("git", ["check-attr", "text", "eol", "--", ...paths], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(r.status, 0, `git check-attr runs cleanly (stderr: ${r.stderr})`);
  const out = {};
  for (const line of r.stdout.split(/\r?\n/u)) {
    const m = /^(.+?): (text|eol): (.+)$/u.exec(line.trim());
    if (m) (out[m[1]] ??= {})[m[2]] = m[3];
  }
  return out;
}

export function filesWithoutSuffix(root) {
  const strays = [];
  const walk = (dir, segments) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name), [...segments, entry.name]);
      else if (!entry.name.endsWith(".golden")) strays.push([...segments, entry.name].join("/"));
    }
  };
  walk(root, []);
  return strays;
}

export const archTests = [
  {
    name: "arch/203 FF-20303: every baseline path — each runtime tree, the lock, the home tree and the step records — is pinned text eol=lf (git's own matcher)",
    run: async () => {
      const attrs = checkAttr(SAMPLES);
      for (const sample of SAMPLES) {
        assert.equal(attrs[sample]?.eol, "lf", `${sample} is pinned eol=lf — got ${JSON.stringify(attrs[sample])}`);
        assert.equal(attrs[sample]?.text, "set", `${sample} is treated as text, so the pin applies`);
      }
    },
  },
  {
    name: "arch/203 FF-20303: the matcher is non-vacuous — the golden suite beside the baselines reports `unspecified`",
    run: async () => {
      const attrs = checkAttr([CONTROL]);
      assert.equal(attrs[CONTROL]?.eol, "unspecified", `the control carries no eol pin — got ${JSON.stringify(attrs[CONTROL])}`);
    },
  },
  {
    name: "arch/203 FF-20303: every file under test/golden/baselines/ ends in .golden, so no sweep, census, graph or runtime reads it",
    run: async () => {
      assert.deepEqual(filesWithoutSuffix(path.join(repoRoot, BASELINES)), [], "a baseline without the suffix is read as source by every tool that walks test/ (203/ADR-003 §4)");
    },
  },
  {
    name: "arch/203 FF-20303: the suffix sweep fires on a stray file",
    run: async () => {
      const root = mkdtempSync(path.join(os.tmpdir(), "aof-golden-eol-"));
      try {
        mkdirSync(path.join(root, "init", "s", "project", ".claude"), { recursive: true });
        writeFileSync(path.join(root, "init", "s", "steps.golden"), "[]\n");
        writeFileSync(path.join(root, "init", "s", "project", ".claude", "settings.json"), "{}\n");
        assert.deepEqual(filesWithoutSuffix(root), ["init/s/project/.claude/settings.json"]);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
];
