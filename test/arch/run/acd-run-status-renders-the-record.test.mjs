// FF-12603 — "`run-status` renders what the record holds: the RENDER moves, the DOCUMENT does not."
//
// milestone 126 / story 01, ADR-003 §1-§5 (AMENDED). The STRUCTURAL half plus task 02's document
// freeze; the driven half — what the line actually says for a record — is
// `test/run/run-status-render.test.mjs`. Neither restates the other.
//
// WHAT THIS CONTROL EXISTS TO CATCH, in the contract's own words: a `Date.now()` in the renderer; a
// second `updatedAt − createdAt` in the render so a reclaimed run shows eleven hours where the
// clock charges thirty minutes; a `now` smuggled onto the command's input so the instant arrives
// through `run()` and the frozen document grows an input key; a helpful key added to the result
// "since the render needs it"; the four-key streamed path quietly given a `reportedBy` for
// symmetry; and the byte-pin entry DELETED to make `53/FF-5307` green rather than re-pinned.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { runStatusCommand } from "../../../src/commands/run-status.mjs";
import { functionBody, matchedBraceBody, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MODULE = "src/commands/run-status.mjs";
const FACE = "src/spine/face.mjs";
const PIN_CONTROL = "test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs";
const read = async (rel) => await readFile(path.join(root, rel), "utf8");
const source = async (rel) => stripComments(await read(rel));

export const archTests = [
  {
    name: "arch/126/01 FF-12603 leg 1: the module reads no clock and writes no file, and the per-attempt term is IMPORTED rather than written a second time",
    run: async () => {
      const module = await source(MODULE);
      assert.doesNotMatch(module, /Date\.now\s*\(/u, "no Date.now() in the renderer");
      assert.doesNotMatch(module, /new\s+Date\s*\(/u, "no `new Date(` — the instant is injected");
      assert.doesNotMatch(module, /\breadFile\b/u, "the render reads no file");

      assert.match(
        module,
        /import \{ attemptElapsedMs \} from "\.\.\/work\/loop\.mjs"/u,
        "the arithmetic has ONE home and this module imports it",
      );
      // The second `updatedAt − createdAt` is the defect this leg exists to catch: it would print
      // eleven hours where the clock charges thirty minutes, on the very record this milestone was
      // framed from. This module parses instants for ONE purpose — the heartbeat age, a different
      // question with a different fallback (20/ADR-004) — so `createdAt` must appear nowhere in it:
      // every use of it belongs to the imported term.
      assert.doesNotMatch(module, /createdAt/u, "`createdAt` is the engine's input, never read here");
      assert.doesNotMatch(module, /reclaimedAt[^\n]*Date\.parse|Date\.parse[^\n]*reclaimedAt/u, "the reclaimed rule is the engine's too");
      assert.equal(
        (module.match(/Date\.parse\(/gu) ?? []).length,
        2,
        "exactly two instant parses, both of them the heartbeat age's two operands",
      );
      assert.match(module, /attemptElapsedMs\(\{ record: run, now \}\)/u, "the elapsed is ASKED FOR, not computed");
    },
  },
  {
    name: "arch/126/01 FF-12603 leg 2: `now` is a RENDER input — the command's declared input is unchanged and `run()` takes none",
    run: async () => {
      // The document is frozen, so an instant must not arrive through `run()`.
      assert.deepEqual(Object.keys(runStatusCommand.input.properties), ["ref"], "`ref` alone");
      assert.deepEqual(runStatusCommand.input.required, ["ref"]);
      assert.equal(runStatusCommand.input.additionalProperties, false);
      assert.ok(!("now" in runStatusCommand.input.properties), "no `now` on the command's input");

      const module = await source(MODULE);
      assert.match(module, /render\(result, faceCtx = \{\}\)/u, "the render takes the second argument the face already passes");
      assert.match(module, /faceCtx\?\.now|faceCtx\.now/u, "…and reads its instant from it");
      assert.match(module, /json: \(result\) => result/u, "the machine face is still identity");

      // `run()` never sees an instant.
      // The body is cut through the ONE home, not by an `indexOf` sentinel end: that assumes a
      // declaration order nothing pins, and it is the class 47/F-47-04-ARCH-2 ledgers at zero.
      const runBody = functionBody(module, "async run(input, ctx)");
      assert.ok(runBody != null, "run()s body is locatable — a failed cut is reported, never asserted over");
      assert.doesNotMatch(runBody, /\bnow\b/u, "run() takes no `now` and mentions none");
    },
  },
  {
    name: "arch/126/01 FF-12603 leg 3: the face supplies `now` on the faceCtx of EVERY render, from one wall-clock read in that module",
    run: async () => {
      const face = await source(FACE);
      assert.match(
        face,
        /const faceCtx = \{ positionals: options\._, options, now: new Date\(\)\.toISOString\(\) \}/u,
        "one additive key on the ONE faceCtx construction site, so the next renderer inherits it",
      );
      assert.equal(
        (face.match(/new Date\(/gu) ?? []).length,
        1,
        "ONE wall-clock read in this module and no other",
      );
      // There is exactly one construction and one render call, which is what makes "every render"
      // true by construction rather than by a sweep.
      assert.equal((face.match(/const faceCtx = /gu) ?? []).length, 1, "one faceCtx construction site");
      assert.equal((face.match(/cli\.render\(/gu) ?? []).length, 1, "one cli.render call site");
    },
  },
  {
    name: "arch/126/01 FF-12603 leg 4: the document does not change — every producing site keeps the keys it has today, and none gains a render's fact",
    run: async () => {
      const module = await source(MODULE);
      // The body is cut through the ONE home, not by an `indexOf` sentinel end: that assumes a
      // declaration order nothing pins, and it is the class 47/F-47-04-ARCH-2 ledgers at zero.
      const runBody = functionBody(module, "async run(input, ctx)");
      assert.ok(runBody != null, "run()s body is locatable — a failed cut is reported, never asserted over");

      // Six producing return sites and one refusal, with three distinct key sets — and the
      // asymmetry is deliberate: the streamed-item-row path answers with four keys and NO
      // `reportedBy`, and giving it one "for symmetry" is a documented way to undo this.
      // The object literals are cut by MATCHING BRACES and split at depth-0 commas, not by a regex
      // — `runs: streamed.runs` and a nested option bag both defeat a character-class pattern, and
      // a key sweep that silently mis-parses is the class of instrument this repo has been wrong
      // with before.
      const returns = [];
      for (let at = runBody.indexOf("return {"); at > -1; at = runBody.indexOf("return {", at + 1)) {
        const body = matchedBraceBody(runBody, at);
        assert.ok(body != null, `the return object at ${at} closes`);
        returns.push(body);
      }
      assert.equal(returns.length, 6, `six producing return sites: ${returns.length}`);
      const keySets = returns.map((body) => {
        const keys = [];
        let depth = 0;
        let segment = "";
        for (const ch of `${body},`) {
          if ("({[".includes(ch)) depth += 1;
          else if (")}]".includes(ch)) depth -= 1;
          if (ch === "," && depth === 0) {
            const name = /^\s*([A-Za-z_$][\w$]*)/u.exec(segment);
            if (name) keys.push(name[1]);
            segment = "";
          } else segment += ch;
        }
        return keys;
      });
      const shapes = new Set(keySets.map((keys) => keys.join(",")));
      assert.deepEqual(
        [...shapes].sort(),
        [
          "ref,runs,answeredFrom",
          "ref,runs,fromWorker,answeredFrom",
          "ref,runs,fromWorker,answeredFrom,reportedBy",
        ].sort(),
        "three key sets, unchanged by this story",
      );
      assert.equal(
        keySets.filter((keys) => keys.join(",") === "ref,runs,fromWorker,answeredFrom").length,
        1,
        "exactly ONE four-key path — the streamed item row with no runs, which gains no reportedBy",
      );
      // No key the render needs was added to the document to get it there.
      for (const forbidden of ["now", "elapsed", "heartbeatAge", "age", "line", "rendered"]) {
        assert.ok(
          !keySets.some((keys) => keys.includes(forbidden)),
          `no producing site carries a \`${forbidden}\` key`,
        );
      }
      assert.match(runBody, /throw commandError\([^)]*"ref-not-found", 404\)/u, "the coded refusal is unchanged");
    },
  },
  {
    name: "arch/126/01 FF-12603 leg 5: the render writes nothing back to the result it is handed",
    run() {
      const result = Object.freeze({
        ref: "03/01",
        answeredFrom: "disk",
        runs: [Object.freeze({
          runId: "r-1", itemRef: "03/01", state: "running", attempt: 1,
          createdAt: "2026-09-08T10:00:00.000Z", updatedAt: "2026-09-08T10:10:00.000Z",
          heartbeatAt: "2026-09-08T10:10:00.000Z", reclaimedAt: null, failureReason: null,
          sessionId: null, node: null, resumeAfter: null, retryOf: null, outcome: null, spend: null,
          brief: Object.freeze({}),
        })],
      });
      const before = JSON.parse(JSON.stringify(result));
      const first = runStatusCommand.cli.render(result, { now: "2026-09-08T10:20:00.000Z" });
      const second = runStatusCommand.cli.render(result, { now: "2026-09-08T11:20:00.000Z" });
      assert.notEqual(first, second, "two `now` values an hour apart produce two different lines");
      assert.deepEqual(JSON.parse(JSON.stringify(result)), before, "the render reads the result and writes nothing back");
    },
  },
  {
    name: "arch/126/01 FF-12603 leg 6: 53/FF-5307's pin MOVED for this file and for no other, and it carries its reason",
    run: async () => {
      const control = await read(PIN_CONTROL);
      // The entry is re-pinned, never dropped: an unpinned file is covered by no byte-freeze at
      // all (55/VERIFICATION F-55-02-1).
      assert.match(control, /\["src\/commands\/run-status\.mjs", "[0-9a-f]{64}"\]/u, "the entry is present");
      assert.doesNotMatch(control, /a537cec0cf802828d2a8de55d6f87b70c57e9e261742d60860d6cc2e3a5df858/u, "…at a NEW digest");

      // The rest of the freeze is untouched by this story.
      // 126/02 re-pins this one for its own additive `isRunning` export, so this leg reads it as
      // "present and re-pinned with a reason" rather than freezing it at a literal this story does
      // not own. The claim 126/01 makes is that IT moved the run-status pin and no other.
      assert.match(control, /\["src\/run-store\.mjs", "[0-9a-f]{64}"\]/u);
      assert.match(control, /\["src\/board-ui\.mjs", "d76bfdaf42032c937165d6e4d6344bd56f30e5f17b1f31f3ed53c520220b7b73"\]/u);
      assert.equal((control.match(/\["src\/[^"]+", "[0-9a-f]{64}"\]/gu) ?? []).length, 3, "three file entries beside the ui/ tree hash");

      // The moved pin names this story and why the file moved, as 119/01's re-pin does.
      const at = control.indexOf(`["src/commands/run-status.mjs"`);
      const preamble = control.slice(Math.max(0, at - 1400), at);
      assert.match(preamble, /126\/01/u, "the reason names the story that moved it");
      assert.match(preamble, /RE-PINNED by 126\/01/u);

      // And the pin is non-vacuous: one changed byte breaks it.
      const { createHash } = await import("node:crypto");
      const body = (await read(MODULE)).replace(/\r\n/gu, "\n");
      const pinned = /\["src\/commands\/run-status\.mjs", "([0-9a-f]{64})"\]/u.exec(control)[1];
      assert.equal(createHash("sha256").update(body).digest("hex"), pinned, "the pin matches the file");
      assert.notEqual(createHash("sha256").update(`${body} `).digest("hex"), pinned, "…and not a file with one byte changed");
    },
  },
  {
    name: "arch/126/01 FF-12603 leg 7: `src/board-ui.mjs` and `ui/` stay untouched — nothing here reopens the board",
    run: async () => {
      const module = await source(MODULE);
      assert.doesNotMatch(module, /board-ui/u, "the render does not reach into the board");
      // The board's own pin is asserted by 53/FF-5307 itself; this leg records that 126/01
      // declared neither file and touched neither.
      const control = await read(PIN_CONTROL);
      const at = control.indexOf(`["src/board-ui.mjs"`);
      assert.ok(at > -1);
      assert.doesNotMatch(control.slice(Math.max(0, at - 200), at), /126\/01/u, "126/01 moved no board pin");
    },
  },
];
