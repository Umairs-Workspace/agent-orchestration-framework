// chore 94 — a malformed aof config must not read as an empty one.
//
// `loadWorkspace` answers `{ config: {} }` for a project with NO config, and answered the
// SAME thing for a config with a JSON typo. Since every optional declaration is read as
// `config.x ?? default`, that typo silently disabled the lot — `work.worktree.prepare`
// never prepared, `work.test` never selected — with nothing said anywhere.
//
// These tests pin both halves of the fix: the door still DEGRADES (a torn config never
// throws out of `loadWorkspace`, which every daemon and face loads through) but now RECORDS
// which of the two happened in `configFault`; and the caller that drives the distinction —
// `work:doctor`, the health lane — turns that record into an `error` finding naming the file.
// An ABSENT config stays no fault at all: an unconfigured project is a legitimate state.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadWorkspace } from "../../src/work.mjs";
import { invoke } from "../../src/command-core.mjs";

// A fixture project whose config is planted VERBATIM (so a deliberately torn one stays
// torn), or omitted entirely for the no-config case.
async function fixtureRepo({ configText } = {}) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-config-fault-"));
  await mkdir(path.join(repo, "wiki", "work"), { recursive: true });
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  if (configText !== undefined) {
    await writeFile(path.join(repo, ".aof", "aof.config.json"), configText, "utf8");
  }
  return repo;
}

const VALID_CONFIG = `${JSON.stringify(
  {
    name: "fixture",
    work: { dir: "./wiki/work", worktree: { prepare: { command: "node", args: ["scripts/prepare-worktree.mjs"] } } },
  },
  null,
  2,
)}\n`;

// The same config with ONE trailing comma — the whole failure mode in one character.
const MALFORMED_CONFIG = `{
  "name": "fixture",
  "work": {
    "dir": "./wiki/work",
    "worktree": { "prepare": { "command": "node", "args": ["scripts/prepare-worktree.mjs"] } },
  }
}
`;

async function cleanup(repo) {
  await rm(repo, { recursive: true, force: true });
}

export const configFaultVisibleTests = [
  {
    name: "config-fault/94 a present-but-unparseable config is DISTINGUISHABLE from an absent one (and from a valid one)",
    async run() {
      const torn = await fixtureRepo({ configText: MALFORMED_CONFIG });
      const absent = await fixtureRepo();
      const valid = await fixtureRepo({ configText: VALID_CONFIG });
      try {
        const tornWs = await loadWorkspace(torn);
        assert.ok(tornWs.configFault, "a config that does not parse is reported as a fault");
        assert.equal(tornWs.configFault.code, "malformed-json", "the fault names WHY the config could not be read");
        assert.equal(tornWs.configFault.path, tornWs.configPath, "the fault names the file it could not read");
        assert.match(tornWs.configFault.message, /Invalid JSON/, "the fault carries the parse error itself");

        const absentWs = await loadWorkspace(absent);
        assert.equal(absentWs.configFault, null, "an ABSENT config is not a fault — an unconfigured project is legitimate");

        const validWs = await loadWorkspace(valid);
        assert.equal(validWs.configFault, null, "a config that parses is not a fault");
        assert.equal(validWs.config.work.worktree.prepare.command, "node", "a config that parses is still read normally");

        // The point of the whole chore: these two used to be the same answer.
        assert.notDeepEqual(
          { config: tornWs.config, fault: tornWs.configFault },
          { config: absentWs.config, fault: absentWs.configFault },
          "the torn config and the absent config are no longer the same answer",
        );
      } finally {
        await cleanup(torn);
        await cleanup(absent);
        await cleanup(valid);
      }
    },
  },

  {
    name: "config-fault/94 loadWorkspace still DEGRADES on a torn config — it never throws, and every optional read keeps its default",
    async run() {
      const repo = await fixtureRepo({ configText: MALFORMED_CONFIG });
      try {
        const ws = await loadWorkspace(repo); // must not throw — every daemon/face loads through this door
        assert.deepEqual(ws.config.work?.worktree ?? null, null, "the unreadable declaration is absent, as before");
        assert.equal(ws.workDir, path.resolve(repo, "wiki", "work"), "the workspace still resolves its defaults");
        assert.equal(ws.configPath, path.join(repo, ".aof", "aof.config.json"), "the config path still resolves");
      } finally {
        await cleanup(repo);
      }
    },
  },

  {
    name: "config-fault/94 work:doctor drives the distinction — an error finding names the file, the parse error and what silently is not running",
    async run() {
      const repo = await fixtureRepo({ configText: MALFORMED_CONFIG });
      try {
        const workspace = await loadWorkspace(repo);
        const result = await invoke("work:doctor", {}, { workspace });
        const finding = result.findings.find((f) => f.code === "config-unparseable");
        assert.ok(finding != null, "work doctor reports the unparseable config");
        assert.equal(finding.severity, "error", "a config that silently disables every declaration is an error, not a warn");
        assert.equal(finding.path, workspace.configPath, "the finding anchors on the config file");
        assert.ok(path.isAbsolute(finding.path), "run emits a RAW ABSOLUTE path — the face relativises (08/ADR-002)");
        assert.deepEqual(Object.keys(finding).sort(), ["code", "message", "path", "severity"], "the finding envelope is unchanged");
        assert.match(finding.message, /Invalid JSON/, "the message carries the parse error");
        // Named in PROSE, never as a dotted key: a key spelled in a message string reads as a
        // second reader of it to FF-7201's one-reader census (which strips comments, not strings).
        assert.match(finding.message, /worktree prepare step/, "the message names what is silently not running");
        assert.doesNotMatch(finding.message, /work\s*\??\.\s*worktree\s*\??\.\s*prepare/, "…without spelling the configuration key");
      } finally {
        await cleanup(repo);
      }
    },
  },

  {
    // The OTHER half of "present but unreadable" — a config that cannot even be read as text.
    // It is the same operator-visible failure (every declaration silently gone) arriving through
    // a different errno, and it must not be mistaken for the absent case either.
    name: "config-fault/94 a config that cannot be READ at all is a fault too — reported as unreadable, never as absent",
    async run() {
      const repo = await fixtureRepo();
      // A DIRECTORY where the config file should be: it exists (so it is not the absent case),
      // and reading it fails on the read leg rather than the parse leg.
      await mkdir(path.join(repo, ".aof", "aof.config.json"), { recursive: true });
      try {
        const workspace = await loadWorkspace(repo);
        assert.ok(workspace.configFault, "an unreadable config is a fault, not an absent config");
        assert.equal(workspace.configFault.code, "unreadable-config", "…named as unreadable rather than malformed");
        const result = await invoke("work:doctor", {}, { workspace });
        const finding = result.findings.find((f) => f.code === "config-unreadable");
        assert.ok(finding != null, "work doctor reports it under its own code");
        assert.equal(finding.severity, "error", "with the same severity as an unparseable one");
      } finally {
        await cleanup(repo);
      }
    },
  },

  {
    // The finding is a fact about the WORKSPACE, not about any item, so it is appended outside
    // the engine's scoped run — a scope that selects nothing must not hide it.
    name: "config-fault/94 the config finding survives a scope that selects no item — it is a workspace fact, not an item's",
    async run() {
      const repo = await fixtureRepo({ configText: MALFORMED_CONFIG });
      try {
        const workspace = await loadWorkspace(repo);
        const result = await invoke("work:doctor", { scope: "07" }, { workspace });
        const finding = result.findings.find((f) => f.code === "config-unparseable");
        assert.ok(finding != null, "the unparseable-config finding is not filtered away by scope");
      } finally {
        await cleanup(repo);
      }
    },
  },

  {
    name: "config-fault/94 work:doctor says nothing about the config when it parses, and nothing when there is none",
    async run() {
      const valid = await fixtureRepo({ configText: VALID_CONFIG });
      const absent = await fixtureRepo();
      try {
        for (const [label, repo] of [["a valid config", valid], ["no config at all", absent]]) {
          const workspace = await loadWorkspace(repo);
          const result = await invoke("work:doctor", {}, { workspace });
          const dangling = result.findings.filter((f) => f.code === "config-unparseable" || f.code === "config-unreadable");
          assert.deepEqual(dangling, [], `no dangling config finding with ${label}`);
        }
      } finally {
        await cleanup(valid);
        await cleanup(absent);
      }
    },
  },

  // chore 113 — the OTHER half of the absent case. Chore 94 read every ENOENT as "this
  // project never opted in", which is right for a DISCOVERED config and wrong for one the
  // operator NAMED with --config: they asked for that file, it is not there, and the run
  // proceeded on defaults with nothing said. These pin the discrimination in both directions.
  {
    name: "config-fault/113 a config NAMED with --config that does not exist is a fault — the discovered-absent case stays silent",
    async run() {
      const repo = await fixtureRepo();
      try {
        const named = await loadWorkspace(repo, "./not-here.json");
        assert.ok(named.configFault, "a config the operator NAMED and that is not there is a fault");
        assert.equal(named.configFault.code, "missing-config", "…named as missing rather than unreadable or malformed");
        assert.equal(named.configFault.path, named.configPath, "the fault names the path that was asked for");
        assert.equal(named.configPath, path.resolve(repo, "not-here.json"), "…which is the --config path, resolved");

        const discovered = await loadWorkspace(repo);
        assert.equal(discovered.configFault, null, "the DISCOVERED absent config is still no fault — an unconfigured project is legitimate");

        // The point of the whole chore: these two used to be the same answer.
        assert.notDeepEqual(
          named.configFault,
          discovered.configFault,
          "the named-and-missing config and the simply-unconfigured project are no longer the same answer",
        );
      } finally {
        await cleanup(repo);
      }
    },
  },

  {
    // A named path whose PARENT is a file arrives as ENOTDIR rather than ENOENT. It is the
    // same fact — the file the operator asked for is not there — so it must not be silent
    // either, and must not be mistaken for the present-but-unreadable case.
    name: "config-fault/113 a named --config path whose parent is a file is missing too, not unreadable",
    async run() {
      const repo = await fixtureRepo();
      await writeFile(path.join(repo, "not-a-dir"), "x", "utf8");
      try {
        const ws = await loadWorkspace(repo, path.join("not-a-dir", "aof.config.json"));
        assert.ok(ws.configFault, "a named path under a file is a fault");
        assert.equal(ws.configFault.code, "missing-config", "…reported as missing, through the other errno");
      } finally {
        await cleanup(repo);
      }
    },
  },

  {
    name: "config-fault/113 loadWorkspace still DEGRADES on a named-but-missing config — it never throws, and the defaults still resolve",
    async run() {
      const repo = await fixtureRepo();
      try {
        const ws = await loadWorkspace(repo, "./not-here.json"); // must not throw — every daemon/face loads through this door
        assert.deepEqual(ws.config, {}, "the config degrades to empty, exactly as before");
        assert.equal(ws.workDir, path.resolve(repo, "wiki", "work"), "the workspace still resolves its defaults");
      } finally {
        await cleanup(repo);
      }
    },
  },

  {
    name: "config-fault/113 a config NAMED with --config that EXISTS and parses is still no fault",
    async run() {
      const repo = await fixtureRepo();
      await writeFile(path.join(repo, "custom.json"), VALID_CONFIG, "utf8");
      try {
        const ws = await loadWorkspace(repo, "./custom.json");
        assert.equal(ws.configFault, null, "naming a config that is there is not a fault");
        assert.equal(ws.config.work.worktree.prepare.command, "node", "…and it is read normally");
      } finally {
        await cleanup(repo);
      }
    },
  },

  {
    name: "config-fault/113 work:doctor reports the named-but-missing config through the same finding — its own code, naming the path and what is consequently not running",
    async run() {
      const repo = await fixtureRepo();
      try {
        const workspace = await loadWorkspace(repo, "./not-here.json");
        const result = await invoke("work:doctor", {}, { workspace });
        const finding = result.findings.find((f) => f.code === "config-missing");
        assert.ok(finding != null, "work doctor reports the config that was asked for and is not there");
        assert.equal(finding.severity, "error", "an operator who named a file that is not there is an error, not a warn");
        assert.equal(finding.path, workspace.configPath, "the finding anchors on the path that was asked for");
        assert.ok(path.isAbsolute(finding.path), "run emits a RAW ABSOLUTE path — the face relativises (08/ADR-002)");
        assert.deepEqual(Object.keys(finding).sort(), ["code", "message", "path", "severity"], "the finding envelope is unchanged");
        assert.match(finding.message, /worktree prepare step/, "the message names what is silently not running");
        assert.doesNotMatch(finding.message, /work\s*\??\.\s*worktree\s*\??\.\s*prepare/, "…without spelling the configuration key");
        // There is no file to fix and no position to report — the remediation is the one thing
        // that must differ from the present-but-unusable codes.
        assert.doesNotMatch(finding.message, /reports the exact position/, "the missing case does not send the operator to a parse position that cannot exist");
      } finally {
        await cleanup(repo);
      }
    },
  },

  {
    name: "config-fault/113 the named-but-missing finding is a workspace fact too — a scope that selects no item does not hide it",
    async run() {
      const repo = await fixtureRepo();
      try {
        const workspace = await loadWorkspace(repo, "./not-here.json");
        const result = await invoke("work:doctor", { scope: "07" }, { workspace });
        assert.ok(result.findings.some((f) => f.code === "config-missing"), "the missing-config finding is not filtered away by scope");
      } finally {
        await cleanup(repo);
      }
    },
  },

  {
    name: "config-fault/113 work:doctor says nothing about a config it merely failed to DISCOVER, and nothing about a named one that is there",
    async run() {
      const discovered = await fixtureRepo();
      const named = await fixtureRepo();
      await writeFile(path.join(named, "custom.json"), VALID_CONFIG, "utf8");
      try {
        for (const [label, repo, explicit] of [
          ["no config at all", discovered, undefined],
          ["a named config that is there", named, "./custom.json"],
        ]) {
          const workspace = await loadWorkspace(repo, explicit);
          const result = await invoke("work:doctor", {}, { workspace });
          const dangling = result.findings.filter((f) => f.code === "config-missing");
          assert.deepEqual(dangling, [], `no dangling missing-config finding with ${label}`);
        }
      } finally {
        await cleanup(discovered);
        await cleanup(named);
      }
    },
  },

  {
    // THE COUPLING THE WHOLE DISCRIMINATION RESTS ON. `configFaultFrom` is told the config was
    // named by `Boolean(explicitConfig)`, while `findProjectConfig` decides whether to honour it
    // with its own `if (explicitConfigPath)`. The two must agree on every falsy spelling, or a
    // path that was DISCOVERED gets reported as a named one that is missing — the exact false
    // positive this chore must not introduce while removing a false negative.
    name: "config-fault/113 a falsy --config is DISCOVERY to both halves — the fault predicate and the resolution predicate cannot drift apart",
    async run() {
      const repo = await fixtureRepo();
      try {
        for (const falsy of ["", undefined, null]) {
          const ws = await loadWorkspace(repo, falsy);
          assert.equal(
            ws.configPath,
            path.join(repo, ".aof", "aof.config.json"),
            `a ${JSON.stringify(falsy)} --config is resolved by DISCOVERY, not honoured as a path`,
          );
          assert.equal(
            ws.configFault,
            null,
            `…so it is not a fault either — ${JSON.stringify(falsy)} must not read as "the operator named a file"`,
          );
        }
      } finally {
        await cleanup(repo);
      }
    },
  },
];
