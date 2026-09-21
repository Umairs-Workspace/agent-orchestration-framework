// FF-12602 — "The loop narrates in flight through the ONE injected printer it already has, by
// default; `--quiet` silences in-flight lines and nothing else."
//
// milestone 126 / story 00, ADR-002 (AMENDED). The STRUCTURAL half; the driven half —
// what actually reaches a collector, in what order, and what `--quiet` does to it — is
// `test/loop/loop-command-narration.test.mjs`. Neither half restates the other: this one reads
// the tree and the registered command, that one walks the loop.
//
// WHAT THIS CONTROL EXISTS TO CATCH, in the contract's own words: a second `console.log` for
// progress (the ratchet forbids it, and one injected function already reaches stdout); an
// in-flight line routed through `report` so that `--quiet` cannot silence it; an ACCOUNT line
// routed through `narrate`, which is how `--level L1` loses its whole output; a `narrate` that is
// a second parameter rather than derived from `report`, so a caller injecting one collector misses
// half the lines; the flag accepted by the argv shaper but absent from the closed schema; and a
// `--verbose` that makes the loud default the opt-in.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { loopCommand } from "../../../src/commands/loop.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SHELL = "src/commands/loop.mjs";
// 129/04 (ADR-008 §3) — THE NEEDLE SCAN IS EXTENDED OVER THE FAMILY. The per-story ladder, the
// retry ladder and the drive/settle trio moved from the shell into `src/loop/cycle.mjs`, and the
// wave tick lives in `src/loop/wave.mjs`; `narrate` and `report` are PARAMETERS of every
// function there, never a second printer. So the in-flight lines this control finds are found at
// the narrate seam WHEREVER THEY NOW LIVE, and the family as a whole is read where the shell alone
// was read before.
const FAMILY = Object.freeze([SHELL, "src/loop/cycle.mjs", "src/loop/wave.mjs"]);
const PRINTERS_CONTROL = "test/arch/command/acd-console-log-confined.test.mjs";
const read = async (rel) => await readFile(path.join(root, rel), "utf8");
const source = async (rel) => stripComments(await read(rel));
const family = async () => (await Promise.all(FAMILY.map(source))).join("\n");

/** Every `await report(...)` / `await narrate(...)` call in the stripped shell, with its seam. */
function printCalls(shell) {
  return [...shell.matchAll(/await (report|narrate)\(\s*([\s\S]{0,160}?)[,)]/gu)]
    .map((m) => ({ seam: m[1], text: m[2].trim() }));
}

export const archTests = [
  {
    name: "arch/126/00 FF-12602 leg 1: the seam is DERIVED from the one printer — no second console.log, no new PRINTERS row, and one injected collector receives both classes of line",
    run: async () => {
      const shell = await source(SHELL);
      const logs = [...shell.matchAll(/console\.log\(/gu)];
      assert.equal(logs.length, 1, "exactly one console.log, the launcher's injected printer");
      for (const rel of FAMILY.slice(1)) {
        assert.doesNotMatch(await source(rel), /console\.(?:log|error)\(|process\.stdout\.write\(/u, `${rel} prints through no printer of its own — narrate and report are its parameters`);
      }
      assert.match(shell, /report:\s*\(line\)\s*=>\s*console\.log\(line\)/u, "…and it is the `cli.launch` body's");

      // DERIVED, not injected beside `report`. A second injected parameter is what would let a
      // caller supply one collector and silently receive half the lines.
      assert.match(
        shell,
        /const narrate = input\.quiet === true \? NO_PRINT : report;/u,
        "narrate is derived from report",
      );
      assert.doesNotMatch(await family(), /suppliedCtx\.narrate|ctx\.narrate/u, "…and is never injected beside it, in the shell or anywhere in the family");

      const printers = await read(PRINTERS_CONTROL);
      assert.match(printers, /\b12\b/u, "the roster's ceiling is still 12");
      assert.equal(
        (printers.match(/^\s*"commands\/loop\.mjs":/gmu) ?? []).length,
        1,
        "the roster carries one row for this module, not a second one for progress",
      );
    },
  },
  {
    name: "arch/126/00 FF-12602 leg 2: the classification is by ROLE — every account line is on `report`, every in-flight line is on `narrate`",
    run: async () => {
      const shell = await source(SHELL);

      // ACCOUNTS: what an invocation RETURNS. The nineteen `reportLine` sites, plus the two the
      // call-site proxy missed — `runL1`'s row lines (an L1 invocation's ENTIRE output) and
      // `Nothing to resume`.
      // Sixteen since 129/04: the three sites that printed the ladder's own halts (the review
      // gate's, the progress halt's, the indeterminate grade's) moved with the ladder and are now
      // ONE site — the shell prints whatever `settleStoryCycle` answered — so the count fell by
      // three; the wave, the reconcile, the refine-end commit and the fresh gate each added one and
      // the L1 / resume sites are unchanged. The account is printed HERE and nowhere in the family:
      // `src/loop/` returns halts, it never prints them (the wave drains its lanes first).
      const reportLineCalls = [...shell.matchAll(/await reportLine\(\s*(\w+)/gu)].map((m) => m[1]);
      assert.equal(reportLineCalls.length, 16, "sixteen reportLine call sites");
      for (const rel of FAMILY.slice(1)) assert.doesNotMatch(await source(rel), /reportLine\(/u, `${rel} prints no account line`);
      for (const seam of reportLineCalls) {
        assert.equal(seam, "report", "every reportLine site is handed the account seam");
      }
      assert.match(
        shell,
        /async function reportLine\(report,/u,
        "reportLine's own two loops print through the account seam it is handed",
      );

      const calls = printCalls(await family());
      const seamOf = (needle) => {
        const hit = calls.find((call) => call.text.includes(needle));
        assert.ok(hit, `no printed line matches ${needle}`);
        return hit.seam;
      };
      assert.equal(seamOf("Nothing to resume in"), "report", "the `Nothing to resume` line is the account");
      assert.equal(
        seamOf("${row.ref} — ${row.act}"),
        "report",
        "the L1 row lines are the account — silencing them would make `--level L1 --quiet` print zero bytes",
      );

      // IN-FLIGHT: printed while a drive or a gate is still PENDING. The three that already
      // existed, and the four this contract adds.
      for (const needle of ["Gate work:validate", "Gate work:doctor", "Gate work:grade"]) {
        assert.equal(seamOf(needle), "narrate", `${needle} is in flight`);
      }
      // The retry ladder moved into `cycle.mjs` (129/04), where the act is `ref`/`phase` rather
      // than `act.ref`/`act.phase`; the wave's own `Resumed`/`Reclaimed` lines are the same lines.
      for (const needle of ["Driving ${act.ref}", "Retrying ${ref}", "Resumed ${act.ref}", "Reclaimed ${entry.item.ref}"]) {
        assert.equal(seamOf(needle), "narrate", `${needle} is in flight`);
      }
      // 2026-09-12 — the settle that lost its race. A run settled out from under the shell
      // (the agent's own `run-complete`, a peer's reclaim) used to be a death; it is now a
      // line printed between the drive and the account, on the in-flight seam by the same
      // role rule as the eight above: it is not part of what the invocation returns, and
      // `--quiet` silences it.
      assert.equal(seamOf("Settle conflict on ${item.ref}"), "narrate", "the settle conflict is in flight");
      // 2026-09-12 — the grade baseline: measured once per story lineage before its first
      // drive, announced like the gate rungs it belongs beside, and silenced by `--quiet` for
      // the same reason — it is a measurement in flight, not part of what the invocation returns.
      assert.equal(seamOf("Baseline work:grade ${act.ref}"), "narrate", "the grade baseline is in flight");
      // 130/02 (ADR-003 §6) — the resume's clear of a standing stop request: printed while the
      // walk is still pending, by the same role rule, and silenced by `--quiet` like the rest.
      assert.equal(seamOf("Cleared stop request for ${loopRunId}"), "narrate", "the cleared stop request is in flight");
      // 129/04 — every in-flight line in the family is on the narrate seam, and the family's
      // count is pinned rather than the shell's alone: the shell's ten stay ten (the retry
      // line and the settle conflict moved down with the ladder; the fresh gate's three grade
      // lines and the refine-phase line arrived); `cycle.mjs` holds the two that moved plus the
      // cross-to-verify act line and the grade rung; `wave.mjs` narrates every lane step. None is
      // on `report`. 130/02 — eleven in the shell: the resume's `Cleared stop request` line.
      const inFlight = calls.filter((call) => call.seam === "narrate");
      assert.equal(calls.filter((call) => call.seam === "report" && /^`(?:Gate |Driving |Retrying |Resumed |Reclaimed |Lane |Wave |Baseline |Cleared )/u.test(call.text)).length, 0, "no in-flight line is on report anywhere in the family");
      assert.equal(printCalls(shell).filter((call) => call.seam === "narrate").length, 11, "eleven in-flight lines in the shell: the two ladder rungs, the fresh gate's three grade lines, Reclaimed, the refine-phase line, the sequential baseline, Resumed, Driving and the cleared stop request");
      assert.equal(printCalls(await source("src/loop/cycle.mjs")).filter((call) => call.seam === "narrate").length, 4, "four in the ladder: Retrying, the settle conflict, Gate work:grade, Driving verify");
      assert.ok(inFlight.length >= 17, `the family narrates at least the seventeen the shell and the ladder hold (${inFlight.length})`);
    },
  },
  {
    name: "arch/126/00 FF-12602 leg 3: every drive announces itself once — `Driving` before the main site, `Retrying` after the store admits the retry",
    run: async () => {
      const shell = await source(SHELL);
      const cycle = await source("src/loop/cycle.mjs");
      // 129/04 — the three drive sites are now spread over the shell and the ladder: the main
      // site stays in the shell, the cross to verify moved to `cycle.mjs` with the ladder, and the
      // in-process retry is the ladder's `drive(retried.record)` seam (the shell hands it
      // `drivePhase`; the wave hands it a child spawn in the same lane). Every one still announces
      // itself, and the count is derived from the sites rather than listed.
      const drives = [
        ...[...shell.matchAll(/await drivePhase\(\{/gu)].map((m) => ({ text: shell, index: m.index })),
        ...[...cycle.matchAll(/await drivePhase\(\{/gu)].map((m) => ({ text: cycle, index: m.index })),
        ...[...cycle.matchAll(/await drive\(retried\.record\)/gu)].map((m) => ({ text: cycle, index: m.index })),
      ];
      assert.equal(drives.length, 3, "three drive sites: the main one (shell), the in-process retry and the cross to verify (both in the ladder)");
      for (const drive of drives) {
        const before = drive.text.slice(0, drive.index);
        const announced = Math.max(
          before.lastIndexOf("await narrate(`Driving "),
          before.lastIndexOf("await narrate(`Retrying "),
        );
        assert.ok(announced > -1, "every drive site announces itself");
        assert.doesNotMatch(
          drive.text.slice(announced, drive.index),
          /await drivePhase\(\{|await drive\(retried\.record\)/u,
          "…with its OWN line, not a previous site's",
        );
      }

      // The act line is IMMEDIATELY before the main drive — the one place a multi-hour wait begins.
      const mainIndex = shell.indexOf("let phaseRun = await drivePhase({");
      const drivingIndex = shell.lastIndexOf("await narrate(`Driving ", mainIndex);
      assert.ok(drivingIndex > -1 && drivingIndex < mainIndex, "the act line precedes the drive");
      assert.doesNotMatch(
        shell.slice(drivingIndex, mainIndex),
        /await (?:invokeRegistered|transitionRun)/u,
        "…with nothing that waits between them",
      );

      // `Retrying` is printed AFTER `transitionRunStart` admits the mint: a retry the store
      // refuses (`not-retryable`, `retry-parked`, `attempts-exhausted`) must not announce itself.
      // (In the ladder since 129/04, for both the shell's drive and the wave's child.)
      const retryIndex = cycle.indexOf("let retryRun = await drive(retried.record);");
      const retryingIndex = cycle.lastIndexOf("await narrate(`Retrying ", retryIndex);
      const retryMint = cycle.lastIndexOf("const retried = await transitionRunStart(", retryingIndex);
      assert.ok(retryMint > -1 && retryMint < retryingIndex && retryingIndex < retryIndex,
        "the mint is admitted, then the line, then the drive");

      const resumedIndex = shell.indexOf("await narrate(`Resumed ");
      const resumeMint = shell.lastIndexOf("const resumed = await transitionRunStart(", resumedIndex);
      assert.ok(resumeMint > -1 && resumeMint < resumedIndex, "`Resumed` announces an admitted mint too");

      // The lines carry the family's own facts and no second spelling of a stop.
      const everywhere = printCalls(await family());
      for (const line of ["Driving", "Retrying", "Resumed", "Reclaimed"]) {
        const call = everywhere.find((c) => c.text.startsWith("`" + line + " "));
        assert.ok(call, `${line} is printed`);
        assert.equal(call.seam, "narrate");
      }
    },
  },
  {
    name: "arch/126/00 FF-12602 leg 4: the flag lands in three places, the schema stays closed, and there is no --verbose anywhere",
    run: async () => {
      const schema = loopCommand.input;
      assert.equal(schema.additionalProperties, false);
      assert.deepEqual(schema.properties.quiet, { type: "boolean" }, "a declared boolean property");
      assert.deepEqual(schema.required, ["scope"], "required is still exactly [scope]");
      // 130/02 (ADR-002 §1) — the NINTH property and the EIGHTH flag, `stop`, by the same
      // three-homes rule this leg pins: an expected succession of the pin, not a drift.
      assert.deepEqual(
        Object.keys(schema.properties).sort(),
        ["cap", "dryRun", "level", "quiet", "resume", "reviewClaims", "scope", "stop", "supervised"],
        "properties gained exactly one key",
      );
      assert.ok(!("verbose" in schema.properties), "`verbose` is an additional key on a closed schema");

      const flags = loopCommand.cli.spec.flags;
      assert.equal(Object.keys(flags).length, 8, "eight flags: --quiet here, --supervised from 126/02, and --stop from 130/02");
      assert.equal(flags.quiet.type, "boolean");
      assert.ok(typeof flags.quiet.description === "string" && flags.quiet.description.length > 0);
      assert.match(loopCommand.cli.spec.usage, /\[--quiet\]/u);

      const argv = loopCommand.cli.argv;
      assert.deepEqual(argv(["03"], { quiet: true }), { scope: "03", quiet: true }, "shaped only when passed");
      assert.deepEqual(argv(["03"], {}), { scope: "03" }, "…and absent otherwise, exactly as --resume and --dry-run are");

      const shell = await source(SHELL);
      assert.doesNotMatch(shell, /verbose/iu, "the ratchet is the flag's direction: silence is what has to be asked for");

      // `--json` still never launches, so the frozen probe is untouched — and neither does
      // `--stop` (130/02): a stop is on the probe side, printed through `render`.
      assert.equal(loopCommand.cli.launch({ dryRun: true }), null);
      assert.equal(loopCommand.cli.launch({ stop: true }), null);
      assert.equal(typeof loopCommand.cli.launch({ quiet: true }), "function", "--quiet does not stop the body launching");
    },
  },
];
