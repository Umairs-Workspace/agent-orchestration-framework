// Fitness function FF-7105 for milestone 71 / ADR-001:
// "The prompt's gate ladder is the shell's, derived from the shell's own module."
//
// The loop SHELL has always run `work:validate`, then — only on a clean result — `work:doctor`,
// before it reaches its review gate (`invokeGateLadder`, `src/commands/loop.mjs`). A direct
// `aof:continue` never enters that shell, so before 71/00 every reviewer this repository spawned by
// hand was spawned with the free deterministic gate not having run: two commands that cost seconds
// ordered after two agent lanes that cost tens of minutes.
//
// The prompt now walks the same ladder, and this control is what stops the two copies drifting. The
// shell's rung set is READ OUT OF `src/commands/loop.mjs` rather than written down here, so a rung
// added or removed there fails until the prompt agrees. Equality is asserted in BOTH directions — a
// rung the shell runs and the prompt omits fails, and a rung the prompt names and the shell never
// runs fails — and ORDER is asserted too, because the ladder is monotone by cost (54/ADR-007) and a
// prompt running them the other way round would be documenting a different ladder.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { markedRegion, matchedBraceBody, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SHELL = "src/commands/loop.mjs";
const PROMPT = "src/bundle/commands/continue.md";
const LADDER_OPEN = "<gate_ladder>";
const LADDER_CLOSE = "</gate_ladder>";

// The prompt's own step order, cut structurally: build, then the gate, then review. Marked regions
// rather than heading numerals — a renumbered step must not move this control's answer.
const BUILD_MARK = "<build_terminator>";
const REVIEW_MARK = "<review_rounds>";
// The lanes the gate exists to stand in front of. `aof-developer` is deliberately absent: the build
// runs BEFORE the gate, and naming it here would assert the opposite.
const REVIEW_LANES = Object.freeze(["aof-architect", "aof-qa", "aof-designer"]);

// The rungs the shell invokes, in invocation order, cut from `invokeGateLadder`'s own body. Returns
// null when the function cannot be cut, so a moved declaration fails as NOT FOUND rather than
// silently asserting over an empty set.
export function ladderIdsFromShell(source) {
  const code = stripComments(source);
  const at = code.indexOf("function invokeGateLadder");
  if (at < 0) return null;
  const body = matchedBraceBody(code, at);
  if (body == null) return null;
  return [...body.matchAll(/invokeRegistered\(\s*"([^"]+)"/gu)].map((match) => match[1]);
}

// The gate command ids the PROMPT names inside its marked ladder region, in the order it names
// them, mapped from the typed form (`aof work validate`) to the registered id (`work:validate`).
export function ladderIdsFromPrompt(text) {
  const region = markedRegion(text, LADDER_OPEN, LADDER_CLOSE);
  if (region == null) return null;
  const ids = [];
  for (const match of region.matchAll(/aof work ([a-z][a-z-]*)/gu)) {
    const id = `work:${match[1]}`;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function gateLadderProblems(shellSource, promptText) {
  const problems = [];
  const shellIds = ladderIdsFromShell(shellSource);
  const promptIds = ladderIdsFromPrompt(promptText);
  if (shellIds == null) return [`${SHELL}: NOT FOUND — invokeGateLadder's body could not be cut`];
  if (promptIds == null) return [`${PROMPT}: NOT FOUND — the ${LADDER_OPEN} region could not be cut`];
  if (shellIds.length === 0) return [`${SHELL}: invokeGateLadder invokes no registered command — the derivation read nothing`];

  for (const id of shellIds) {
    if (!promptIds.includes(id)) problems.push(`${PROMPT}: the shell walks \`${id}\` and the prompt's ladder does not name it`);
  }
  for (const id of promptIds) {
    if (!shellIds.includes(id)) problems.push(`${PROMPT}: the ladder names \`${id}\`, which invokeGateLadder never invokes`);
  }
  if (problems.length === 0 && shellIds.join(" → ") !== promptIds.join(" → ")) {
    problems.push(`${PROMPT}: the ladder's order is ${promptIds.join(" → ")}; the shell's is ${shellIds.join(" → ")}`);
  }

  // …and the ladder's PLACE: after the build's terminator, before the review rounds, and before the
  // first review lane the prompt names. A ladder that runs after the reviewers is the defect itself.
  const at = (needle) => promptText.indexOf(needle);
  for (const [label, needle] of [["the build terminator", BUILD_MARK], ["the review rounds", REVIEW_MARK]]) {
    if (at(needle) < 0) problems.push(`${PROMPT}: NOT FOUND — ${label} (${needle}) is not marked`);
  }
  if (at(BUILD_MARK) >= 0 && at(LADDER_OPEN) >= 0 && at(BUILD_MARK) > at(LADDER_OPEN)) {
    problems.push(`${PROMPT}: the gate ladder is placed before the build step`);
  }
  if (at(REVIEW_MARK) >= 0 && at(LADDER_CLOSE) >= 0 && at(REVIEW_MARK) < at(LADDER_CLOSE)) {
    problems.push(`${PROMPT}: the review rounds are placed before the gate ladder has answered`);
  }
  for (const lane of REVIEW_LANES) {
    const spawnedAt = at(lane);
    if (spawnedAt >= 0 && at(LADDER_CLOSE) >= 0 && spawnedAt < at(LADDER_CLOSE)) {
      problems.push(`${PROMPT}: \`${lane}\` is reachable before the gate ladder has answered`);
    }
  }
  return problems;
}

const read = (rel) => readFile(path.join(root, rel), "utf8");

export const archTests = [
  {
    name: "arch/71 FF-7105 (acd-prompt-gate-ladder-parity): the prompt's ladder is the shell's — same rungs, same order, before any review lane",
    run: async () => {
      const [shell, prompt] = await Promise.all([read(SHELL), read(PROMPT)]);
      const shellIds = ladderIdsFromShell(shell);
      assert.ok(Array.isArray(shellIds) && shellIds.length >= 2, `the shell's ladder was actually derived: ${JSON.stringify(shellIds)}`);
      assert.deepEqual(shellIds, ["work:validate", "work:doctor"], "recorded: what the shell walks today, derived and not assumed");
      assert.deepEqual(gateLadderProblems(shell, prompt), [], "the shipped prompt walks the shell's ladder");

      // The rungs are scoped to the DRIVEN item, never to its parent — the prompt's ladder names a
      // `<ref>` on each rung and no milestone-shaped scope.
      const region = markedRegion(prompt, LADDER_OPEN, LADDER_CLOSE);
      assert.ok(region != null, `${PROMPT}: NOT FOUND — the ladder region could not be cut`);
      for (const verb of ["validate", "doctor"]) {
        assert.match(region, new RegExp(`aof work ${verb} <ref>`, "u"), `the ${verb} rung is scoped to the driven item's own ref`);
      }
      assert.equal(/<NN>|milestone ref/u.test(region), false, "no rung is scoped to the milestone");
    },
  },
  {
    name: "arch/71 FF-7105: equality is asserted in BOTH directions, and the order is too",
    run: async () => {
      const [shell, prompt] = await Promise.all([read(SHELL), read(PROMPT)]);

      // A rung the shell gains and the prompt has not followed.
      const widenedShell = shell.replace(/invokeRegistered\(\s*"work:doctor"/u, 'invokeRegistered("work:audit", {}, ctx);\n  await invokeRegistered("work:doctor"');
      assert.ok(
        gateLadderProblems(widenedShell, prompt).some((problem) => problem.includes("work:audit") && problem.includes("does not name it")),
        "a rung added to the shell fails until the prompt agrees",
      );

      // A rung the prompt names that the shell never runs.
      const widenedPrompt = prompt.replace(LADDER_CLOSE, `     3. \`aof work audit <ref>\` — a third rung.\n     ${LADDER_CLOSE}`);
      assert.ok(
        gateLadderProblems(shell, widenedPrompt).some((problem) => problem.includes("work:audit") && problem.includes("never invokes")),
        "a rung the prompt invents and the shell never walks fails",
      );

      // A rung the shell walks that the prompt dropped.
      const narrowedPrompt = prompt.replace("aof work doctor <ref>", "the second rung");
      assert.ok(
        gateLadderProblems(shell, narrowedPrompt).some((problem) => problem.includes("work:doctor") && problem.includes("does not name it")),
        "a dropped rung is named",
      );

      // The same two rungs in the other order — monotone by cost, so the order is the claim.
      const swapped = prompt
        .replace("aof work validate <ref>", "aof work PLACEHOLDER <ref>")
        .replace("aof work doctor <ref>", "aof work validate <ref>")
        .replace("aof work PLACEHOLDER <ref>", "aof work doctor <ref>");
      assert.ok(
        gateLadderProblems(shell, swapped).some((problem) => problem.includes("order")),
        "the rungs walked in the other order fail on order rather than on membership",
      );
    },
  },
  {
    name: "arch/71 FF-7105: the ladder's PLACE is asserted — a reviewer reachable before it answers fails, and a missing region fails as NOT FOUND",
    run: async () => {
      const [shell, prompt] = await Promise.all([read(SHELL), read(PROMPT)]);

      // The whole point of the ordering: no review lane is reachable until the gate has answered.
      const early = prompt.replace(BUILD_MARK, `Spawn aof-architect first.\n     ${BUILD_MARK}`);
      assert.ok(
        gateLadderProblems(shell, early).some((problem) => problem.includes("aof-architect") && problem.includes("before the gate ladder")),
        "a review lane reachable before the gate is named",
      );

      // A prompt whose ladder region was deleted fails as NOT FOUND, never as "names no rung".
      const unmarked = prompt.replaceAll(LADDER_OPEN, "<gate>").replaceAll(LADDER_CLOSE, "</gate>");
      assert.ok(
        gateLadderProblems(shell, unmarked).some((problem) => problem.includes("NOT FOUND")),
        "a prompt with no marked ladder fails as NOT FOUND",
      );

      // …and so does a shell whose ladder was renamed away.
      const movedShell = shell.replace("function invokeGateLadder", "function invokeSomethingElse");
      assert.ok(
        gateLadderProblems(movedShell, prompt).some((problem) => problem.includes("NOT FOUND") && problem.includes(SHELL)),
        "a moved shell ladder fails as NOT FOUND rather than deriving an empty set",
      );
    },
  },
];
