// Fitness function for story 79 — REGENERATION IS BYTE-IDENTICAL ON UNCHANGED INPUTS.
//
// Inherited, not re-decided: 78/ADR-002 owns the generated-document discipline and 78/ADR-010
// says in as many words that "79 inherits them". Only the half that applies is taken. 78's writer
// is a read-modify-write because it must carry a human signature forward verbatim; this document
// has no sign-off block and nothing in it that is not derived, so it is a truncate-and-emit and
// the obligation reduces to one clause: THE SAME REGISTRY PRODUCES THE SAME BYTES.
//
// The claim is asserted at both scales it can fail at, because they fail for different reasons:
// IN-PROCESS (a composer that iterated a Set, or sorted unstably, or read a clock) and ACROSS
// SEPARATE PROCESSES (a composer that reached an environment, a working directory, a hash seed).
// A generated artefact that is not byte-stable across processes cannot be committed at all — the
// drift check would red on the next contributor's machine for no reason anyone could act on.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadWorkspace } from "../../../src/command-core.mjs";
import { loopDocumentCommand } from "../../../src/commands/loop-document.mjs";
import { loopDocumentPath } from "../../../src/loop-document.mjs";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { RECORDS, loop, withRepo, writeRegistry } from "../../support/loop-document-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

export const archTests = [
  {
    name: "arch/79/01 regeneration is byte-identical on unchanged inputs, in-process",
    run: async () => {
      await withRepo({}, async (repo) => {
        const workspace = await loadWorkspace(repo.root);
        const target = loopDocumentPath(workspace);
        const first = await loopDocumentCommand.run({ write: true }, { workspace });
        const second = await loopDocumentCommand.run({ write: true }, { workspace });
        const third = await loopDocumentCommand.run({}, { workspace });

        assert.equal(second.text, first.text, "the composed bytes do not move");
        assert.equal(third.text, first.text, "and the bare face composes the same bytes the writer wrote");
        assert.equal(await readFile(target, "utf8"), first.text, "the file carries them");
        assert.equal(second.changed, false, "and the writer reports honestly that nothing moved");
      });
    },
  },
  {
    name: "arch/79/01 regeneration is byte-identical across separate processes",
    run: async () => {
      await withRepo({}, async (repo) => {
        const env = { ...process.env, AOF_GLOBAL_HOME: repo.root };
        const target = path.join(repo.workDir, "loops.md");

        const runs = [];
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const spawned = spawnCliSync(process.execPath, [cliPath, "work", "loops", "document", "--write"], { cwd: repo.root, encoding: "utf8", env });
          assert.equal(spawned.status, 0, `process ${attempt} wrote it: ${spawned.stderr}`);
          runs.push(await readFile(target, "utf8"));
        }
        assert.equal(runs[1], runs[0], "two fresh processes produce byte-identical documents");

        // A THIRD process from a DIFFERENT working directory, resolving the same project through
        // --config. A document whose bytes depended on where the command was run from could not
        // be committed: the drift check would red for every contributor who ran it from a
        // subdirectory.
        const elsewhere = spawnCliSync(
          process.execPath,
          [cliPath, "work", "loops", "document", "--config", path.join(repo.aofDir, "aof.config.json"), "--write"],
          { cwd: repoRoot, encoding: "utf8", env }
        );
        assert.equal(elsewhere.status, 0, `a process in another working directory wrote it: ${elsewhere.stderr}`);
        assert.equal(await readFile(target, "utf8"), runs[0], "and its bytes are identical too");
      });
    },
  },
  {
    name: "arch/79/01 a changed registry is the ONLY thing that moves the bytes",
    run: async () => {
      // The complement of the two entries above, and the reason they are not vacuous: a composer
      // that emitted a constant would satisfy byte-identity perfectly. It must be identical on
      // unchanged inputs AND different on changed ones.
      await withRepo({}, async (repo) => {
        const workspace = await loadWorkspace(repo.root);
        const before = (await loopDocumentCommand.run({ write: true }, { workspace })).text;
        await writeRegistry(repo, { ...RECORDS, "extra.md": loop("loop:extra", "Extra loop") });
        const after = (await loopDocumentCommand.run({ write: true }, { workspace })).text;
        assert.notEqual(after, before, "a registry edit moves the bytes");
        assert.equal((await loopDocumentCommand.run({ write: true }, { workspace })).text, after, "and they settle again on the new registry");
      });
    },
  },
];
