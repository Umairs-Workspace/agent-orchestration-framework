// FF-7803 (78/ADR-002, ADR-010) — REGENERATION IS BYTE-IDENTICAL ON UNCHANGED INPUTS, ACROSS
// SEPARATE PROCESSES.
//
// This is what makes the record a thing a diff can mean something about: regenerate, and a non-empty
// diff says an input changed rather than "somebody ran the command". Without it the document is
// noise in every pull request that touches the item, and an operator learns to ignore it — which is
// the fate `SPEC.md` cites (`observability/report.md`, generated since milestone 45 and present on
// 2 of ~20 items) as the reason this record exists at all.
//
// THE CLAIM IS ASSERTED AT THREE SCALES, because they fail for three different reasons:
//   IN-PROCESS — a composer that iterated a Set, sorted unstably, or read a clock.
//   ACROSS PROCESSES — one that reached an environment variable, a host name or a hash seed.
//   FROM ANOTHER WORKING DIRECTORY — one that leaked a cwd-relative path into the committed bytes.
//     78's document holds no path, but the writer's own `displayPath` is cwd-relative and is used in
//     the malformed refusal, so the separation is worth measuring rather than assuming.
//
// AND THE COMPLEMENT, without which all three are vacuous: a composer that emitted a constant would
// satisfy byte-identity perfectly. It must be identical on unchanged inputs AND different on changed
// ones — and, this record being a read-modify-write, identical again once the change has settled.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loopRecordCommand } from "../../../src/commands/loop-record.mjs";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import {
  ENGAGED_RUNS,
  ITEM_REF,
  ctxFor,
  declaration,
  runRecord,
  seedRuns,
  withRepo,
} from "../../loop/loop-record-command.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

const write = async (repo) => await loopRecordCommand.run({ ref: ITEM_REF, write: true }, await ctxFor(repo));

export const archTests = [
  {
    name: "arch/78/02 FF-7803 regeneration is byte-identical on unchanged inputs, in-process",
    run: async () => {
      await withRepo({}, async (repo) => {
        const first = await write(repo);
        const second = await write(repo);
        const bare = await loopRecordCommand.run({ ref: ITEM_REF }, await ctxFor(repo));

        assert.equal(second.text, first.text, "the composed bytes do not move");
        assert.equal(bare.text, first.text, "and the READ face composes the same bytes the writer wrote");
        assert.equal(await readFile(repo.recordPath, "utf8"), first.text, "the file carries them");
        assert.equal(second.changed, false, "and the writer reports honestly that nothing moved");
      });
    },
  },
  {
    name: "arch/78/02 FF-7803 regeneration is byte-identical across separate processes, and from another working directory",
    run: async () => {
      await withRepo({}, async (repo) => {
        const env = { ...process.env, AOF_GLOBAL_HOME: repo.root };
        const bytes = [];
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const spawned = spawnCliSync(process.execPath, [cliPath, "work", "loop-record", ITEM_REF, "--write"], { cwd: repo.root, encoding: "utf8", env });
          assert.equal(spawned.status, 0, `process ${attempt} wrote it: ${spawned.stderr}`);
          bytes.push(await readFile(repo.recordPath, "utf8"));
        }
        assert.equal(bytes[1], bytes[0], "two fresh processes produce byte-identical records");

        // A THIRD process from a DIFFERENT working directory, resolving the same project through
        // --config. A record whose bytes depended on where the command ran from could not be
        // committed: the diff would move for every contributor who ran it from a subdirectory.
        const elsewhere = spawnCliSync(
          process.execPath,
          [cliPath, "work", "loop-record", ITEM_REF, "--config", path.join(repo.aofDir, "aof.config.json"), "--write"],
          { cwd: repoRoot, encoding: "utf8", env },
        );
        assert.equal(elsewhere.status, 0, `a process in another working directory wrote it: ${elsewhere.stderr}`);
        assert.equal(await readFile(repo.recordPath, "utf8"), bytes[0], "and its bytes are identical too");
      });
    },
  },
  {
    name: "arch/78/02 FF-7803 a changed input is the ONLY thing that moves the bytes, and they settle again",
    run: async () => {
      await withRepo({}, async (repo) => {
        const before = (await write(repo)).text;

        await seedRuns(repo, [
          ...ENGAGED_RUNS,
          runRecord({ runId: "lr-c-0000", createdAt: "2026-09-01T02:00:00.000Z", loop: declaration({ id: "loop:build-to-green", loopRunId: "lr-c" }) }),
        ]);
        const after = (await write(repo)).text;
        assert.notEqual(after, before, "a new run record carrying a declaration moves the bytes");
        assert.equal((await write(repo)).text, after, "and they settle again on the new inputs");
      });
    },
  },
  {
    name: "arch/78/02 FF-7803 the writer reaches no clock, no cwd and no host name",
    run: async () => {
      // The structural half of the claim, and the reason it is not redundant with the three
      // behavioural entries above: those measure two runs a few milliseconds apart in one
      // environment, so a `new Date().toISOString().slice(0, 10)` stamped into the document would
      // pass all three and then move the bytes at midnight, on somebody else's machine, months
      // later. The composition path is held free of the three inputs that do that.
      const { functionBody, stripComments } = await import("../../support/source-slice.mjs");
      const command = stripComments(await readFile(path.join(repoRoot, "src/commands/loop-record.mjs"), "utf8"));
      // `displayPath` is cwd-relative and is DELIBERATELY still allowed: it feeds the human render
      // and the malformed refusal, never the composed document. So the assertion is scoped to the
      // composition — the text is `renderExecutionDocument(...)` plus the sign-off block, and
      // neither may carry a cwd, a clock or a host.
      //
      // The region is cut by the LANGUAGE's own braces (`functionBody`, the one home for a
      // structural cut — F-47-04-ARCH-2), never by a second `indexOf` sentinel: a sentinel end
      // assumes a declaration order nothing pins, and a renamed neighbour would silently move the
      // region this gate measures.
      const composition = functionBody(command, "export function composeSignoffBlock(");
      assert.ok(composition, "composeSignoffBlock is where the sign-off bytes are composed (cut not found — has it been renamed?)");
      for (const forbidden of [/\bnew Date\b/, /\bDate\.now\b/, /\bprocess\.cwd\b/, /\bprocess\.env\b/, /\bhostname\b/, /\bnode:os\b/]) {
        assert.doesNotMatch(composition, forbidden, `the sign-off composition reaches no ${forbidden}`);
      }
      assert.doesNotMatch(command, /\bnew Date\b|\bDate\.now\b|\bnode:os\b/, "and the module as a whole reaches no clock and no host name");
      // The document's own body comes from a PURE renderer (FF-7801/FF-7802 hold that), so the only
      // impure bytes this module could contribute are the sign-off block's.
      assert.match(command, /renderExecutionDocument\(\{ model, registry, ref: item\.ref \}\)/, "the body is the pure renderer's own bytes");
    },
  },
];
