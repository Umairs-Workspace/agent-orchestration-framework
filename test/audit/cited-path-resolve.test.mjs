// 119/00 task 02 — the resolver's own behaviour: one answer for every citation, at HEAD or through
// a rename the repository itself recorded (119/ADR-004).
//
// The positive rename case is driven against THIS repository's real history rather than a fixture:
// `src/commands/errors.mjs` -> `src/command-error.mjs` is committed and immutable, so it is a case
// the control can drive without inventing one. Everything a fixture is genuinely needed for — a
// double rename, a rename whose target has since been deleted, an uncommitted move — is driven over
// literal rename records instead, because those shapes do not exist in this history and planting
// them in it is not something a test may do.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  RENAME_LOG_ARGS,
  buildRenameMap,
  parseRenameRecords,
  resolveCitedPath,
  resolveThroughRenames,
  splitLocator,
} from "../../src/cited-path-resolve.mjs";
import { readRenameMap } from "../../src/commands/doctor.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const KNOWN_RENAME = Object.freeze({ from: "src/commands/errors.mjs", to: "src/command-error.mjs" });

async function realRenameMap() {
  const { stdout } = await execFileAsync("git", [...RENAME_LOG_ARGS], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  return buildRenameMap(parseRenameRecords(stdout));
}

export const citedPathResolveTests = [
  {
    name: "119/00 task02 — the rename records are parsed from git's own name-status stream, and nothing else in it is guessed at",
    run: () => {
      const stdout = [
        "",
        "R100\tsrc/commands/errors.mjs\tsrc/command-error.mjs",
        "R074\tscripts/drive-control.mjs\tsrc/work/audit-drive.mjs",
        "M\tsrc/untouched.mjs",
        "A\tsrc/added.mjs",
        "not a name-status line at all",
        "",
      ].join("\n");
      assert.deepEqual(parseRenameRecords(stdout), [
        { from: "src/commands/errors.mjs", to: "src/command-error.mjs" },
        { from: "scripts/drive-control.mjs", to: "src/work/audit-drive.mjs" },
      ], "only R<score> rows are renames; a modify, an add and prose are ignored rather than misread");
      assert.deepEqual(parseRenameRecords(""), [], "an empty stream is an empty record list");
      assert.deepEqual(parseRenameRecords(null), [], "…and so is no stream at all");
    },
  },

  {
    name: "119/00 task02 — the map takes the MOST RECENT rename of a path, because git prints newest first",
    run: () => {
      // A name reused across two lives: the newest record wins, and the older one is a previous
      // life of that name rather than a correction of the newer.
      const map = buildRenameMap([
        { from: "src/a.mjs", to: "src/newest.mjs" },
        { from: "src/a.mjs", to: "src/older.mjs" },
      ]);
      assert.equal(map.get("src/a.mjs"), "src/newest.mjs");
      assert.equal(buildRenameMap([]).size, 0);
      assert.equal(buildRenameMap(null).size, 0);
      assert.equal(buildRenameMap([{ from: "", to: "src/x.mjs" }, { from: "src/y.mjs", to: "" }]).size, 0, "a half-empty record names nothing and is dropped");
    },
  },

  {
    name: "119/00 task02 — a chain of renames resolves to the FINAL path, and a cycle terminates rather than hanging the gate",
    run: () => {
      const chain = buildRenameMap([
        { from: "src/b.mjs", to: "src/c.mjs" },
        { from: "src/a.mjs", to: "src/b.mjs" },
      ]);
      assert.equal(resolveThroughRenames("src/a.mjs", chain), "src/c.mjs", "renamed twice — resolved at its final path");
      assert.equal(resolveThroughRenames("src/b.mjs", chain), "src/c.mjs");
      assert.equal(resolveThroughRenames("src/c.mjs", chain), null, "a path history records no rename FROM is not resolved through the map");
      const cyclic = buildRenameMap([{ from: "src/a.mjs", to: "src/b.mjs" }, { from: "src/b.mjs", to: "src/a.mjs" }]);
      assert.equal(typeof resolveThroughRenames("src/a.mjs", cyclic), "string", "a cyclic history terminates");
      assert.equal(resolveThroughRenames("src/a.mjs", new Map()), null, "an EMPTY map resolves nothing — which is what makes its own non-vacuity worth asserting");
      assert.equal(resolveThroughRenames("src/a.mjs", null), null);
    },
  },

  {
    name: "119/00 task02 — one resolver answers every citation: two ways to resolve, and four ways not to",
    run: async () => {
      const renameMap = await realRenameMap();
      const present = new Set(["src/work/doctor.mjs", "src/command-error.mjs", "ui/src/fleet/scope.mjs"]);
      const existsAtHead = (candidate) => present.has(candidate);
      const answer = (cited, map = renameMap) => resolveCitedPath(cited, { existsAtHead, renameMap: map });

      const head = answer("src/work/doctor.mjs");
      assert.deepEqual([head.resolved, head.at, head.via], [true, "src/work/doctor.mjs", "head"], "a src/ path that exists at HEAD resolves at its own path");

      const renamed = answer(KNOWN_RENAME.from);
      assert.deepEqual([renamed.resolved, renamed.at, renamed.via], [true, KNOWN_RENAME.to, "rename"], "a path this repository's history records as renamed resolves at its new path");

      const twice = resolveCitedPath("src/a.mjs", {
        existsAtHead: (candidate) => candidate === "src/c.mjs",
        renameMap: buildRenameMap([{ from: "src/b.mjs", to: "src/c.mjs" }, { from: "src/a.mjs", to: "src/b.mjs" }]),
      });
      assert.deepEqual([twice.resolved, twice.at], [true, "src/c.mjs"], "a path renamed twice resolves at its final path");

      const goneTarget = resolveCitedPath("src/a.mjs", {
        existsAtHead: () => false,
        renameMap: buildRenameMap([{ from: "src/a.mjs", to: "src/deleted-later.mjs" }]),
      });
      assert.deepEqual([goneTarget.resolved, goneTarget.at], [false, null], "a path renamed to somewhere that no longer exists is UNRESOLVED");

      const deleted = answer("src/mesh-sync.mjs");
      assert.equal(deleted.resolved, false, "a path deleted with no rename record is unresolved");
      const invented = answer("src/never-existed-anywhere.mjs");
      assert.equal(invented.resolved, false, "a src/ path that never existed is unresolved");

      const located = answer("src/work/doctor.mjs:522");
      assert.deepEqual([located.resolved, located.path, located.locator], [true, "src/work/doctor.mjs", ":522"], "a cited path carrying a :line locator resolves ON THE FILE, the locator dropped");
      assert.equal(answer("src/work/doctor.mjs:513-529").path, "src/work/doctor.mjs", "…and so does a range locator");

      // THE LEFT ANCHOR IS A CRITERION, NOT A DETAIL. An extractor without one clips `ui/` off
      // `ui/src/**` paths and manufactures phantom casualties; the resolver must never treat the
      // two as one path either.
      const ui = answer("ui/src/fleet/scope.mjs");
      assert.deepEqual([ui.resolved, ui.at], [true, "ui/src/fleet/scope.mjs"], "a ui/src path resolves as itself");
      assert.equal(answer("src/fleet/scope.mjs").resolved, false, "…and is NEVER read as src/fleet/scope.mjs");
    },
  },

  {
    name: "119/00 task02 — with no existence oracle the resolver answers only where history says the path went, which is what the doctor's spine asks it",
    run: () => {
      const map = buildRenameMap([{ from: "src/a.mjs", to: "src/b.mjs" }]);
      const spineAnswer = resolveCitedPath("src/a.mjs", { renameMap: map });
      assert.deepEqual([spineAnswer.at, spineAnswer.via], ["src/b.mjs", "rename"], "the candidate the caller then probes");
      assert.equal(resolveCitedPath("src/untouched.mjs", { renameMap: map }).at, null, "no rename recorded — nothing for the caller to probe, so leg A's miss stands");
      assert.equal(resolveCitedPath("src/a.mjs", { renameMap: null }).at, null, "a null map is an honest no-op: every miss stays a miss");
    },
  },

  {
    name: "119/00 task02 — an uncommitted move is not yet a recorded rename",
    run: async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-rename-"));
      try {
        const git = async (...args) => execFileAsync("git", args, { cwd: dir, encoding: "utf8", windowsHide: true });
        await git("init", "-q");
        await git("config", "user.email", "probe@example.invalid");
        await git("config", "user.name", "probe");
        await mkdir(path.join(dir, "src"), { recursive: true });
        await writeFile(path.join(dir, "src", "before.mjs"), "export const x = 1;\n", "utf8");
        await git("add", "-A");
        await git("commit", "-qm", "seed");
        // The move happens in the WORKING TREE and is never committed.
        await writeFile(path.join(dir, "src", "after.mjs"), "export const x = 1;\n", "utf8");
        await rm(path.join(dir, "src", "before.mjs"));

        const map = await readRenameMap(dir);
        assert.equal(resolveThroughRenames("src/before.mjs", map), null, "the resolver answers UNRESOLVED for the old path");
        const answer = resolveCitedPath("src/before.mjs", { existsAtHead: () => false, renameMap: map });
        assert.equal(answer.resolved, false, "…and the rename is not in the repository's history");

        // …and once it IS committed as a rename, the same resolver answers.
        await git("add", "-A");
        await git("commit", "-qm", "move");
        const after = await readRenameMap(dir);
        assert.equal(resolveThroughRenames("src/before.mjs", after), "src/after.mjs", "a COMMITTED rename is what the map is derived from");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },

  {
    name: "119/00 task02 — the map is DERIVED from history: the command edge spawns, the resolver stays pure, and a repository with no history yields an empty map rather than an error",
    run: async () => {
      const map = await realRenameMap();
      // NON-VACUITY. A resolver that answered "no renames, ever" would pass every leg of FF-11903
      // silently, and this history is nearly empty — twenty records in the whole reachable tree.
      assert.ok(map.size > 0, `the rename map is non-empty (${map.size} records)`);
      assert.equal(map.get(KNOWN_RENAME.from), KNOWN_RENAME.to, "…and it resolves a rename this repository really recorded, so an empty map cannot read as a pass");

      // The edge is asked for the SAME read, through the resolver's own argv.
      const seen = [];
      const stub = await readRenameMap(repoRoot, async (args) => {
        seen.push(args);
        return "R100\tsrc/from.mjs\tsrc/to.mjs\n";
      });
      assert.deepEqual(seen, [[...RENAME_LOG_ARGS]], "the edge spells no argv of its own — it runs the resolver's");
      assert.equal(stub.get("src/from.mjs"), "src/to.mjs");

      assert.equal(await readRenameMap(null), null, "no project root means no map at all, and the probe degrades to leg A alone");
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-nogit-"));
      try {
        const empty = await readRenameMap(dir);
        assert.ok(empty instanceof Map && empty.size === 0, "a directory that is not a checkout yields an EMPTY map, never a thrown gate");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },

  {
    name: "119/00 task02 — the locator split is the one grammar, and it never eats a path",
    run: () => {
      assert.deepEqual(splitLocator("src/a.mjs:12"), { path: "src/a.mjs", locator: ":12" });
      assert.deepEqual(splitLocator("src/a.mjs:12-19"), { path: "src/a.mjs", locator: ":12-19" });
      assert.deepEqual(splitLocator("src/a.mjs"), { path: "src/a.mjs", locator: null });
      assert.deepEqual(splitLocator("  src/a.mjs  "), { path: "src/a.mjs", locator: null }, "surrounding whitespace is not part of the path");
      assert.deepEqual(splitLocator(null), { path: "", locator: null });
    },
  },
];
