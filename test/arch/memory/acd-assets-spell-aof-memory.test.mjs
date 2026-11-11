// FF-17802 — milestone 178 / ADR-003: no file under `packages/*/assets/` spells `aof work memory`.
// The assets are the source every runtime folder is rendered from, so while they spell the alias,
// every agent run in Claude Code, Codex, opencode and Cowork calls the alias and the canonical
// command is the one nobody calls. The pattern is whitespace-tolerant (`aof\s+work\s+memory`), so
// a markdown wrap between the words cannot hide one.
//
// WHY HERE AND NOT UNDER test/arch/bundle. ARCHITECTURE named that directory, but FF-12405 leg 10
// freezes its controls at 23 with a ceiling that may only fall, and its budget row says a control
// of another subject that concerns a shipped artefact goes to its subject's directory. The subject
// is memory's face, so the control lives beside the learning-edge control that reads the same
// invocations.
//
// The rest of the file is 178/02's contract over the rendered folders and the docs: the render is
// re-run, never hand-edited, the lock is true of the disk, and history keeps the alias.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashContent } from "../../../packages/core/src/lock.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8").replace(/\r\n/gu, "\n");
const OLD = /aof\s+work\s+memory/gu;
const NEW = /aof\s+memory\b/gu;

// Every file under every `packages/<name>/assets/`, as `{ rel, text }`.
export function assetFiles() {
  const files = [];
  const walk = (rel) => {
    for (const name of readdirSync(path.join(root, rel))) {
      const child = `${rel}/${name}`;
      if (statSync(path.join(root, child)).isDirectory()) walk(child);
      else files.push({ rel: child, text: read(child) });
    }
  };
  for (const pkg of readdirSync(path.join(root, "packages"))) {
    try {
      if (statSync(path.join(root, "packages", pkg, "assets")).isDirectory()) walk(`packages/${pkg}/assets`);
    } catch {
      // a package without assets
    }
  }
  return files;
}

// The FF-17802 check: every old spelling as `{ rel, line }`, the line being where `aof` stands.
export function oldSpellings(files) {
  const found = [];
  for (const { rel, text } of files) {
    for (const match of text.matchAll(OLD)) found.push({ rel, line: text.slice(0, match.index).split("\n").length });
  }
  return found;
}

function newSpellingCensus(files) {
  const counts = files.map(({ text }) => [...text.matchAll(NEW)].length);
  return { carriers: counts.filter((count) => count > 0).length, count: counts.reduce((sum, count) => sum + count, 0) };
}

export const archTests = [
  // ════════════════════════════ task 00 R1 — every shipped asset spells aof memory ═══════════
  {
    name: "arch/178/02 FF-17802 (acd-assets-spell-aof-memory) E2: no file under packages/*/assets/ spells aof work memory, and at least 53 aof memory occurrences across at least 15 files stand in their place",
    run: () => {
      const files = assetFiles();
      const found = oldSpellings(files);
      assert.deepEqual(found.map(({ rel, line }) => `${rel}:${line}`), [], "no asset spells the retired path");
      const census = newSpellingCensus(files);
      assert.ok(census.count >= 53, `at least 53 aof memory occurrences (found ${census.count})`);
      assert.ok(census.carriers >= 15, `the guard is not vacuous: it scanned at least 15 asset files that spell aof memory (found ${census.carriers})`);
    },
  },
  {
    name: "arch/178/02 FF-17802 E3 red probe: a planted old spelling fails naming the file and line 4, however it is wrapped — `aof work\\n  memory recall`, `aof work memory ingest`, `` `aof  work  memory status` ``",
    run: () => {
      const rel = "packages/core/assets/commands/planted.md";
      for (const planted of ['aof work\n  memory recall "x" --block', "aof work memory ingest", "`aof  work  memory status`"]) {
        const text = `# planted\n\nline three\n${planted}\n`;
        assert.deepEqual(oldSpellings([...assetFiles(), { rel, text }]), [{ rel, line: 4 }], `${JSON.stringify(planted)} fails naming ${rel}:4`);
      }
    },
  },
  {
    name: "arch/178/02 E1: refine's architect recall spells aof memory, and the codex workflow variant spells it wherever it spelled the alias",
    run: () => {
      const refine = read("packages/core/assets/commands/refine.md").replace(/\n\s*/gu, " ");
      assert.ok(refine.includes('aof memory recall "<the decision in a few words>" --area architecture --block'), "refine's architect recall reads the canonical command");
      const codex = read("packages/core/assets/variants/codex/workflow.md");
      assert.equal([...codex.matchAll(OLD)].length, 0, "the codex variant spells no aof work memory");
      assert.ok([...codex.matchAll(NEW)].length >= 21, "…and spells aof memory at least as often as it spelled the alias (21)");
    },
  },

  // ═══════════════════ task 00 R2 — the generated folders are re-rendered, never hand-edited ══
  {
    name: "arch/178/02 E4: the rendered runtime folders carry the new spelling — .claude, .agents and .opencode refine hold aof memory recall; the codex workflow contract and the ingest loop hold no aof work memory",
    run: () => {
      for (const rel of [".claude/commands/aof/refine.md", ".agents/skills/aof-refine/procedure.md", ".opencode/commands/aof/refine.md"]) {
        assert.ok(read(rel).includes("aof memory recall"), `${rel} holds aof memory recall`);
      }
      for (const rel of [".codex/aof/workflows/workflow-contract.md", ".aof/loops/retrospective-memory-ingest.md"]) {
        assert.equal(/aof\s+work\s+memory/u.test(read(rel)), false, `${rel} holds no aof work memory`);
      }
    },
  },
  {
    name: "arch/178/02 E5: the work install renders all three runtimes, and every rendered file's hash in .aof/aof.lock.json matches the file on disk",
    run: () => {
      const lock = JSON.parse(read(".aof/aof.lock.json"));
      assert.deepEqual(lock.work.runtimes, ["claude", "codex", "opencode"], "the work install records the three runtimes it renders");
      assert.ok(lock.work.files.some((entry) => entry.path === ".opencode/commands/aof/refine.md"), "the lock owns the opencode render");
      for (const entry of lock.work.files) {
        let onDisk;
        try {
          onDisk = readFileSync(path.join(root, entry.path), "utf8");
        } catch {
          continue;
        }
        assert.equal(hashContent(onDisk), entry.hash, `${entry.path}'s recorded hash matches the file on disk`);
      }
    },
  },

  // ═══════════════ task 01 R4 — the docs spell aof memory, tests and history keep the alias ════
  {
    name: "arch/178/02 E8: the README's memory block and command reference spell aof memory, with the six verbs",
    run: () => {
      const readme = read("README.md");
      for (const line of ["aof memory status", "aof memory reindex", 'aof memory recall "pin line endings"']) {
        assert.ok(readme.split("\n").some((text) => text.startsWith(line)), `the memory block holds ${line}`);
      }
      const reference = readme.split("\n").find((line) => line.startsWith("aof memory <verb> [args] [--json]"));
      assert.ok(reference, "the command reference line reads aof memory <verb> [args] [--json]");
      for (const verb of ["recall", "record-recall", "recurrence", "ingest", "reindex", "status"]) assert.ok(reference.includes(verb), `…naming ${verb}`);
      assert.equal(reference.includes("brief"), false, "…and not the retired brief");
    },
  },
  {
    name: "arch/178/02: the README's delivered-milestones table keeps milestone 05's row as it was, naming aof work memory",
    run: () => {
      const row = read("README.md").split("\n").find((line) => line.startsWith("| 05 | Work Memory |"));
      assert.ok(row?.includes("aof work memory"), `the 05 row is history and keeps its spelling: ${row}`);
    },
  },
  {
    name: "arch/178/02 E9: the schema's memory.backend description names the aof memory verbs, and the knowledge README names memory and its alias",
    run: () => {
      const schema = read("schemas/aof.schema.json");
      assert.ok(schema.includes("answers the `aof memory` verbs"), "the schema names the `aof memory` verbs");
      assert.equal(/aof\s+work\s+memory/u.test(schema), false, "…and not the alias");
      assert.ok(read("packages/knowledge/README.md").includes("the five graph commands, `memory`, its alias `work:memory`, and `import:milestone`"), "the knowledge README names memory, its alias and import:milestone");
    },
  },
  {
    name: "arch/178/02 E10: the alias's own tests keep the old spelling, and the migration rewrote nothing under wiki/work/",
    run: () => {
      assert.ok(read("test/integration/features/work-memory.feature").includes("work memory status"), "the alias's integration feature still runs work memory status");
      // The migration is a source edit plus a render; neither writes the work stream. Tracked
      // history under wiki/work/ still spells the alias wherever it recorded it.
      const tracked = execFileSync("git", ["grep", "-l", "-E", "aof work memory", "--", "wiki/work"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
      assert.ok(tracked.length > 0, `the work stream's records keep aof work memory (${tracked.length} files)`);
    },
  },
];
