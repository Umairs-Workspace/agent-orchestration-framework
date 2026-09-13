// arch/102 FF (acd-shell-loop-id-is-declared) — THE DRIFT CHECK for milestone 102 / story 01.
//
// Covers the two registry-facing @executable scenarios of
//   wiki/work/102_story_the-declaration-names-its-loop/tasks/01_the-shell-declares-the-loop-it-is.feature
//     · the id the shell mints is a loop the shipped registry declares
//     · the drift check is armed
// (the six scenarios that need a real driven loop are `test/loop/loop-command-board-state.test.mjs`.)
//
// WHY A CHECK AND NOT A RUN-TIME REFUSAL. An id the registry does not declare is REPORTED, never
// refused while the loop is running: 78's projection ships `ran-undeclared` for exactly it, a
// consumer repository's `.aof/loops/` may legitimately be absent (`loadLoops` answers
// `present: false` by design), and a shell that refused to run because a record was edited would
// turn a reporting gap into an outage. The drift that DOES matter — the framework's own shell
// naming an id the framework's own SHIPPED registry does not declare — is caught here, before it
// ships, over `src/bundle/loops/`, which is the copy aof controls. `.aof/loops/` is the installed
// copy in a consumer tree and is deliberately not the subject.
//
// WHY IT TAKES THE CLOSING HELPER'S ROUTE AND NOT ITS OWN (58/ADR-007 §3a, FF-5809). Both
// scenarios need the SHIPPED records, and the second needs to mutate one and reload. The first
// shape of this file recursively copied `src/bundle` into a temp tree by hand — a SECOND route
// out of the shipped registry, which is the drift FF-5809 exists to ratchet, and it turned that
// control red the moment this file landed (102/VERIFICATION.md F-102-A). `withShippedRegistry`
// is the one route, it reads the shipped BYTES at call time rather than a snapshot, and the whole
// registry is its own endpoint closure — so "declared by what ships" is still exactly the claim,
// taken through the door that already exists.
//
// ONE LITERAL, ONE HOME. The id checked below is the very binding the shell mints from
// (`SHELL_LOOP_ID`, imported), never a second spelling of the same string in a test — the
// hand-copied-glyph species F-78-E records one milestone over. The RECORD that declares it is
// found by that same id rather than by filename, so a renamed file is not a second literal either.
import assert from "node:assert/strict";

import { SHELL_LOOP_ID } from "../../../src/commands/loop.mjs";
import { loadLoops } from "../../../src/work/loops.mjs";
import { withShippedRegistry } from "../../support/registry-fixture.mjs";

/** The frontmatter line a record declaring the shell's id carries. */
const declaresTheShellId = () => new RegExp(`^id: ${SHELL_LOOP_ID}\\s*$`, "mu");

// THE CHECK ITSELF, as one pure function over (the id the shell mints, the loaded registry). It is
// a function rather than an inline assertion so the second scenario can arm it against a MUTATED
// registry and observe it fail — a check nobody has ever seen fail is not a check.
function checkShellLoopIsDeclared(id, model) {
  const declared = model.nodes.map((node) => node.id);
  const node = model.nodes.find((candidate) => candidate.id === id) ?? null;
  if (node === null) {
    return {
      ok: false,
      message: `The loop shell mints ${id}, which the shipped registry does not declare. Declared ids: ${declared.join(", ")}.`,
      declared,
    };
  }
  if (node.kind !== "loop") {
    return {
      ok: false,
      message: `The loop shell mints ${id}, which the shipped registry declares as kind "${node.kind}" rather than "loop".`,
      declared,
    };
  }
  return { ok: true, message: null, declared, node };
}

export const archTests = [
  {
    // Scenario: the id the shell mints is a loop the shipped registry declares
    name: "arch/102 (acd-shell-loop-id-is-declared): the id the shell mints is declared by src/bundle/loops as a loop",
    run: async () => {
      await withShippedRegistry(null, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.equal(model.present, true, "the shipped registry is present");
        assert.ok(model.nodes.length > 0, "the shipped registry declares records");
        assert.equal(model.nodes.length, fixture.names.length, "every shipped record parsed");

        const result = checkShellLoopIsDeclared(SHELL_LOOP_ID, model);
        assert.equal(result.ok, true, result.message ?? "");
        assert.equal(result.node.id, SHELL_LOOP_ID);
        assert.equal(result.node.kind, "loop");

        // The value itself is pinned once, here, so a silent re-point of the shell to some other
        // declared loop is still a red test rather than a green one.
        assert.equal(SHELL_LOOP_ID, "loop:autonomous-cascade");
      });
    },
  },
  {
    // Scenario: the drift check is armed
    name: "arch/102 (acd-shell-loop-id-is-declared): re-pointing the shipped record's id fails the check, naming both sides",
    run: async () => {
      await withShippedRegistry(null, async (fixture) => {
        const declaring = Object.entries(fixture.files).filter(([, text]) => declaresTheShellId().test(text));
        assert.equal(declaring.length, 1, `exactly one shipped record declares ${SHELL_LOOP_ID}`);
        const [name, before] = declaring[0];

        // The UNMUTATED copy passes first, so what fails below is the drift and not the copying.
        assert.equal(checkShellLoopIsDeclared(SHELL_LOOP_ID, await loadLoops(fixture.workDir)).ok, true,
          `${name} declares the id the shell mints before it is re-pointed`);

        await fixture.write({ [name]: before.replace(declaresTheShellId(), "id: loop:renamed-by-drift") });

        const drifted = await loadLoops(fixture.workDir);
        const result = checkShellLoopIsDeclared(SHELL_LOOP_ID, drifted);

        assert.equal(result.ok, false, "the check fails once the registry no longer declares the id");
        // It names the id the shell mints…
        assert.ok(result.message.includes(SHELL_LOOP_ID), result.message);
        // …and the ids the registry declares, so the failure says what to do about it.
        assert.ok(result.message.includes("loop:renamed-by-drift"), result.message);
        assert.ok(result.declared.includes("loop:renamed-by-drift"));
        assert.equal(result.declared.includes(SHELL_LOOP_ID), false);
      });
    },
  },
];
