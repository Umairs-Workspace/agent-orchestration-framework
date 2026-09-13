// Fitness function: acd-session-input-lane-fallthrough (milestone 50 / story 03) —
// "the launched-session input lane may CLAIM a frame; it may never STARVE the assignment
// lane."
//
// ── THE MEASURED DEFECT THIS PINS ──────────────────────────────────────────────────────
// `client.onTerminalInput` holds exactly ONE handler, so the launcher — not a second
// registration that would silently displace the first — is where the m50 launched-session
// lane and the m42 assignment lane are ordered. The shipped ordering was:
//
//     client.onTerminalInput?.((frame) => {
//       try {
//         if (sessionSpawnHandler.handleTerminalInput(frame)) return;
//         terminalInputHandler(frame);
//       } catch (error) { reportDegrade("mesh-launcher", error); }
//     });
//
// and the recorded rationale for the unguarded property access was "so a broken injection
// is loud". IT IS NOT LOUD. The enclosing `try` turns the TypeError into a degrade event,
// and because the throw PRECEDES `terminalInputHandler(frame)`, every keystroke to every
// assignment PTY is dropped — silently, for the daemon's lifetime. A defect in the NEW
// lane becomes a TOTAL OUTAGE of the SHIPPED one, which is strictly the worse failure:
// the assignment lane is how an operator answers a needs-input agent.
//
// ── WHAT THIS GATE ASSERTS, AND WHY IT IS STRUCTURAL ───────────────────────────────────
// Its predecessor was a pair of regexes inside the story's own traceability suite,
// matching the launcher's source LITERALLY (`if (…) return;\n  terminalInputHandler(frame);`)
// — it broke on a reformat and passed on a semantic change elsewhere. What survives here
// is the PROPERTY, expressed over the language's own structure:
//
//   1. EXACTLY ONE `client.onTerminalInput(` registration in mesh-launcher.mjs. A second
//      would silently displace the first, and the displaced lane is invisible.
//   2. BOTH lanes are named inside it — the launched lane is consulted, and the
//      assignment handler is called. (A gate that only forbade things would be satisfied
//      by deleting the fall-through.)
//   3. The launched lane is PROPERTY-GUARDED (`typeof … === "function"`), so an
//      absent/partial handler is a miss rather than a throw.
//   4. NO `try` BLOCK CONTAINS BOTH CALLS. This is the clause that actually carries the
//      invariant, and it is a claim about structure rather than about text: if the
//      launched lane's call and the assignment lane's call share a `try`, then by
//      construction a throw from the first skips the second. Reformat it however you
//      like; put the guard wherever you like; the assignment lane stays reachable.
//
// The behavioural companion lives in test/mesh/session/mesh-session-spawn-handler.test.mjs — a REAL
// launcher, a deliberately broken launched-lane handler, and the assignment lane still
// receiving the frame. This file is the structural half; neither replaces the other.
//
// Every plant is HAND-WRITTEN (never a string-replace on the real file) and asserts it
// LANDED before the detector is asked about it.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments, matchedParenSpan, matchedBraceBody } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LAUNCHER = path.join(repoRoot, "src", "mesh", "launcher.mjs");

function lf(source) {
  return source.replace(/\r\n/g, "\n");
}

const REGISTRATION = /client\s*\.\s*onTerminalInput\s*\??\.?\s*\(/g;
// The launched lane's call, whatever it is spelled with in between.
const LAUNCHED_LANE = /\bhandleTerminalInput\s*\(/;
// The assignment lane's call. `\b` matters: `handleTerminalInput(` must not satisfy it.
const ASSIGNMENT_LANE = /\bterminalInputHandler\s*\(/;
const PROPERTY_GUARD = /typeof\s+sessionSpawnHandler\s*\??\.?\s*handleTerminalInput\s*===\s*["']function["']/;

// registrationBody(code) — the callback handed to the ONE `client.onTerminalInput(...)`,
// cut by MATCHING PARENS from the call's own opening paren (never a character window and
// never an `indexOf` sentinel — test/support/source-slice.mjs is the one home for cuts).
// Returns null when the registration is absent or unbalanced; callers report NOT FOUND
// rather than asserting over the wrong region.
export function registrationBody(code) {
  REGISTRATION.lastIndex = 0;
  const anchor = REGISTRATION.exec(code);
  if (anchor == null) return null;
  const span = matchedParenSpan(code, anchor.index + anchor[0].length - 1);
  return span?.body ?? null;
}

export function registrationCount(code) {
  return (lf(stripComments(code)).match(REGISTRATION) ?? []).length;
}

// tryBlocks(code) — every `try { … }` body in the region, brace-balanced. A nested try is
// returned alongside its parent, which is exactly what clause 4 needs: a wrapper `try`
// around both calls is itself a block containing both.
function tryBlocks(code) {
  const blocks = [];
  const re = /\btry\s*\{/g;
  let match;
  while ((match = re.exec(code)) !== null) {
    const body = matchedBraceBody(code, match.index);
    if (body != null) blocks.push(body);
  }
  return blocks;
}

// inputLaneProblems(launcherSource) — the four clauses, over the real (or a synthesized)
// launcher module.
export function inputLaneProblems(launcherSource) {
  const code = lf(stripComments(String(launcherSource ?? "")));
  const problems = [];

  const count = registrationCount(code);
  if (count !== 1) {
    problems.push(`mesh-launcher.mjs holds ${count} \`client.onTerminalInput(\` registration(s), not exactly 1 — the client keeps ONE handler, so a second registration silently DISPLACES the first and the displaced lane is invisible`);
  }

  const body = registrationBody(code);
  if (body == null) {
    problems.push("the client.onTerminalInput registration could not be located (or its argument list is unbalanced) — this gate refuses to assert over a region it could not cut");
    return problems;
  }

  if (!LAUNCHED_LANE.test(body)) {
    problems.push("the registration never consults the launched-session lane (handleTerminalInput) — an operator's keystrokes cannot reach a launched shell");
  }
  if (!ASSIGNMENT_LANE.test(body)) {
    problems.push("the registration never calls the assignment input handler (terminalInputHandler(frame)) — the m42 lane that answers a needs-input agent is gone, which is the outage this gate exists to prevent");
  }
  if (!PROPERTY_GUARD.test(body)) {
    problems.push('the launched-session lane is not property-guarded (`typeof sessionSpawnHandler?.handleTerminalInput === "function"`) — an absent or partial handler must be a MISS, never a throw');
  }

  for (const block of tryBlocks(body)) {
    if (LAUNCHED_LANE.test(block) && ASSIGNMENT_LANE.test(block)) {
      problems.push("one `try` block contains BOTH lanes — a throw from the launched-session lane then skips the assignment handler by construction, silently dropping every assignment keystroke for the daemon's lifetime (measured: the enclosing catch reports a degrade event and the frame is lost). Give each lane its own try, or decide the claim before the fall-through runs.");
    }
  }
  return problems;
}

export const archTests = [
  {
    name: "arch/50 (acd-session-input-lane-fallthrough): mesh-launcher.mjs holds exactly ONE onTerminalInput registration, consults the launched-session lane under a property guard, and calls the assignment handler from OUTSIDE that lane's try — the shipped lane can never be starved by the new one",
    run: async () => {
      const problems = inputLaneProblems(await readFile(LAUNCHER, "utf8"));
      assert.deepEqual(problems, [], `input-lane problems:\n  ${problems.join("\n  ")}`);
    },
  },

  {
    name: "arch/50 (acd-session-input-lane-fallthrough): self-check — the SHIPPED-AND-REMOVED shared-try shape trips, as do a displacing second registration, a deleted fall-through and an unguarded property access; the clean synthesized shape stays quiet (non-vacuous)",
    run: async () => {
      const clean = [
        "client.onTerminalInput?.((frame) => {",
        "  let claimed = false;",
        "  try {",
        '    claimed = typeof sessionSpawnHandler?.handleTerminalInput === "function"',
        "      && sessionSpawnHandler.handleTerminalInput(frame) === true;",
        '  } catch (error) { reportDegrade("mesh-launcher", error); }',
        "  if (claimed) return;",
        "  try {",
        "    terminalInputHandler(frame);",
        '  } catch (error) { reportDegrade("mesh-launcher", error); }',
        "});",
      ].join("\n");
      assert.deepEqual(inputLaneProblems(clean), [], "the clean synthesized registration stays quiet");

      // PLANT 1 — THE SHIPPED SHAPE, reconstructed by hand. Both lanes in one try, and
      // the property access unguarded: a TypeError from the launched lane is swallowed
      // into a degrade event and the assignment handler is never reached.
      const shipped = [
        "client.onTerminalInput?.((frame) => {",
        "  try {",
        "    if (sessionSpawnHandler.handleTerminalInput(frame)) return;",
        "    terminalInputHandler(frame);",
        '  } catch (error) { reportDegrade("mesh-launcher", error); }',
        "});",
      ].join("\n");
      assert.notEqual(shipped, clean, "the plant actually differs from the clean shape");
      const shippedProblems = inputLaneProblems(shipped);
      assert.ok(
        shippedProblems.some((problem) => problem.includes("one `try` block contains BOTH lanes")),
        `self-check: the shared-try shape trips the clause that carries the invariant (got ${JSON.stringify(shippedProblems)})`,
      );
      assert.ok(
        shippedProblems.some((problem) => problem.includes("property-guarded")),
        "self-check: …and the unguarded property access trips its own clause",
      );

      // PLANT 2 — an OUTER try wrapping two inner ones. Reformatted into compliance at a
      // glance, still starving the assignment lane. This is why clause 4 is structural.
      const wrapped = [
        "client.onTerminalInput?.((frame) => {",
        "  try {",
        "    let claimed = false;",
        "    try {",
        '      claimed = typeof sessionSpawnHandler?.handleTerminalInput === "function"',
        "        && sessionSpawnHandler.handleTerminalInput(frame) === true;",
        "    } finally { noop(); }",
        "    if (claimed) return;",
        "    terminalInputHandler(frame);",
        '  } catch (error) { reportDegrade("mesh-launcher", error); }',
        "});",
      ].join("\n");
      assert.notEqual(wrapped, clean, "the plant actually differs from the clean shape");
      assert.ok(
        inputLaneProblems(wrapped).some((problem) => problem.includes("one `try` block contains BOTH lanes")),
        "self-check: an OUTER try around both lanes trips — the nesting does not launder it",
      );

      // PLANT 3 — the fall-through deleted outright. A forbid-only gate would be happy.
      const noFallThrough = [
        "client.onTerminalInput?.((frame) => {",
        "  try {",
        '    if (typeof sessionSpawnHandler?.handleTerminalInput === "function") sessionSpawnHandler.handleTerminalInput(frame);',
        '  } catch (error) { reportDegrade("mesh-launcher", error); }',
        "});",
      ].join("\n");
      assert.notEqual(noFallThrough, clean, "the plant actually differs from the clean shape");
      assert.ok(
        inputLaneProblems(noFallThrough).some((problem) => problem.includes("terminalInputHandler")),
        "self-check: deleting the assignment lane trips — the positive clause is what stops 'fix the gate by removing the lane'",
      );

      // PLANT 4 — a SECOND registration. The client holds one handler; the first is
      // silently displaced, and nothing else in the tree would say so.
      const displaced = `${clean}\nclient.onTerminalInput?.((frame) => { auditInput(frame); });`;
      assert.notEqual(displaced, clean, "the plant actually differs from the clean shape");
      assert.ok(
        inputLaneProblems(displaced).some((problem) => problem.includes("registration(s), not exactly 1")),
        "self-check: a second onTerminalInput registration trips",
      );

      // PLANT 5 — the registration removed entirely: the gate must report NOT FOUND, not
      // pass quietly over a file it could not cut.
      const absent = "client.onDirective?.((frame) => { handleDirective(frame); });";
      assert.ok(inputLaneProblems(absent).length > 0, "self-check: no registration at all trips");
      assert.equal(registrationBody(absent), null, "self-check: the cut returns null rather than a wrong region");
    },
  },
];
