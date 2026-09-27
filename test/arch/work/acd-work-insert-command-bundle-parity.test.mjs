// Fitness function for milestone 41 / RETROSPECTIVE R5 (the packaging axis of the
// registry trio, R3's sibling): "Adding a work:* command IMPLIES its Claude command."
//
// m41 shipped `work:insert-milestone`/`-story`/`-uat` (later `-chore`) at the CLI +
// engine layers and was accepted green — but src/bundle/commands/ carried only the
// `add-*` docs, never `insert-*`. So `aof work update` rendered NOTHING for the new
// commands: the feature existed in the CLI yet was undiscoverable/unusable through the
// ACD command surface it is meant to be driven from. No existing guard caught it — the
// CLI bijection (acd-work-command-cli-bijection) proves the CLI runs; nothing proved a
// bundle wrapper ships.
//
// The guard, REGISTRY-DERIVED (no carve-out, 'no new door'): every `work:insert-*`
// command in the registry must have a matching `src/bundle/commands/<sub>.md` bundle
// command member under the `aof` namespace — so a future insert command cannot ship
// CLI-only and silently skip its Claude command again. Scoped to the insert-* family
// (the placement twins of the `add-*` scaffolders); low-level read ops like
// `work:list`/`work:doc` are correctly NOT command-surfaced and are excluded.
//
// milestone 127 / story 02 task 04 — WIDENED TO `work:promote`, by the same rule and in the same
// control rather than a second one. `promote` is the operator-facing twin of the insert family (it
// is what `insert-* --at P` now delegates to, 127/ADR-003 §4) and it is the ONE verb that mints a
// number: shipping it CLI-only would put the whole backlog→stream door out of reach of the command
// surface it is driven from — exactly the m41 defect, one milestone later. The FAMILY is named as a
// predicate over the registry, so the scope stays derived: a `work:promote-*` helper face
// (`promote-finding-to-chore`, `promote-gap-to-chore`) is NOT the operator's door and is excluded by
// the same predicate that admits `promote` itself.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCommands } from "../../../src/command-core.mjs";
import { readDescriptor } from "../../../src/work/bundle.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// THE WRAPPED FAMILY, as a predicate over the registry id: the placement twins plus the one mint.
// `work:promote-finding-to-chore` / `work:promote-gap-to-chore` are review-lane faces reached by an
// agent through `aof:code-review`, not operator doors with prompts of their own — so the predicate
// admits the bare `work:promote` and nothing suffixed.
// milestone 127 / story 03 task 04 — widened once more, by the same rule and in the same control:
// `work:archive` is the operator's door out of the stream (127/ADR-004 §1), the twin of `promote`'s
// door in, and a `work:*` verb is not done until its wrapper ships (m41 R5). The predicate stays
// EXACT on the bare id, so a helper face could never be admitted by prefix.
const wrappedFamily = (id) => id.startsWith("work:insert-") || id === "work:promote" || id === "work:archive";

const wrappedSubcommands = () =>
  listCommands()
    .filter((command) => wrappedFamily(command.id))
    .map((command) => command.id.slice("work:".length))
    .sort();

// The declared bundle command members, keyed by id (the bundle member id is the
// bare op — `work:insert-milestone` ↔ member id `insert-milestone`).
const bundleCommandMembers = () =>
  new Map(
    readDescriptor()
      .members.filter((member) => member.kind === "command")
      .map((member) => [member.id, member])
  );

export const archTests = [
  {
    name: "arch/m41 R5 (127/02): every work:insert-* command AND work:promote has a matching bundle command wrapper (usable via `aof work update`, not CLI-only)",
    run: async () => {
      const subs = wrappedSubcommands();
      assert.ok(subs.length > 0, "the registry has at least one work:insert-* command");
      // Non-vacuity with a name on it: the ONE mint must be IN the swept family, so a
      // `work:promote` that stopped being registered fails here rather than narrowing the sweep.
      assert.ok(subs.includes("promote"), "work:promote is registered and therefore swept (127/ADR-003 §1 — the one verb that mints)");
      assert.ok(subs.includes("archive"), "work:archive is registered and therefore swept (127/ADR-004 §1 — the one verb that moves)");
      assert.ok(subs.some((sub) => sub.startsWith("insert-")), "…beside the insert-* placement twins m41 R5 was written for");
      const members = bundleCommandMembers();
      for (const sub of subs) {
        const member = members.get(sub);
        assert.ok(
          member != null,
          `work:${sub} has a bundle command member "${sub}" (src/bundle/commands/${sub}.md) — a work:* command is not usable through the ACD command surface without its Claude command (m41 R5)`
        );
        assert.equal(
          member.commandNamespace,
          "aof",
          `bundle command "${sub}" renders under the aof namespace (so it installs as /aof:${sub})`
        );
      }
    },
  },

  // milestone 127 / story 02 task 04 — "the promote prompt computes nothing". The wrapper EXISTING
  // is the leg above; this is the wrapper being HONEST. A `/aof:promote` that worked the number out
  // for itself would re-open the second minting place this story closes (41/ADR-002: the agent
  // arithmetic the deterministic CLI exists to replace), and it would do it in the one prompt whose
  // entire subject is the mint. Asserted over the member's own file, read through the descriptor so
  // a renamed file fails as NOT FOUND rather than passing over a path that no longer exists.
  {
    name: "arch/127-02 (m41 R5 sibling): the /aof:promote wrapper drives `aof work promote … --json` and states no arithmetic of its own",
    run: async () => {
      const member = bundleCommandMembers().get("promote");
      assert.ok(member != null, "the promote bundle command member is declared (the leg above says why)");
      const text = await readFile(path.join(repoRoot, "src", "bundle", member.file), "utf8");

      assert.match(text, /aof work promote/u, "the prompt drives the verb");
      assert.match(text, /--json/u, "…on its machine face, so the created identity is read rather than guessed");
      for (const phrase of [/\bmax\b/iu, /\+\s*1\b/u]) {
        assert.doesNotMatch(text, phrase, `the promote prompt computes no number of its own (${phrase}) — one verb mints (ADR-003 §1)`);
      }
      assert.match(text, /aof:refine <NN>/u, "a milestone or story is handed to refine at its new number");
      assert.match(text, /aof:verify <NN>/u, "…and a chore / spike / uat to its own record doc, closed by verify");
      for (const doc of ["CHORE.md", "SPIKE.md", "SESSION.md"]) {
        assert.ok(text.includes(doc), `the hand-off names the record doc a ${doc} type is worked in`);
      }
    },
  },

  // milestone 127 / story 03 task 04 — "the archive prompt moves nothing by hand". The wrapper
  // EXISTING is the first leg; this is the wrapper being HONEST. A `/aof:archive` that renamed the
  // folder or rewrote a link itself when the verb refused would re-open the one door 127/ADR-004
  // closes — deciding and moving are the verb's — in the prompt whose entire subject is the move.
  // The phrases are the ones a prompt that moved folders or rewrote links by hand would need.
  {
    name: "arch/127-03 (m41 R5 sibling): the /aof:archive wrapper drives `aof work archive … --json` and moves nothing by hand",
    run: async () => {
      const member = bundleCommandMembers().get("archive");
      assert.ok(member != null, "the archive bundle command member is declared (the first leg says why)");
      const text = await readFile(path.join(repoRoot, "src", "bundle", member.file), "utf8");

      assert.match(text, /aof work archive/u, "the prompt drives the verb");
      assert.match(text, /--json/u, "…on its machine face, so what moved is read rather than guessed");
      assert.match(text, /archive-confirm-required/u, "the one refusal answered by re-running is named");
      assert.match(text, /candidates/u, "…and the list the operator confirms is read from the envelope");
      for (const phrase of [/rename\(/u, / mv /u, /git mv/u, /\.\.\/archive\//u]) {
        assert.doesNotMatch(text, phrase, `the archive prompt moves no folder and rewrites no link by hand (${phrase}) — one verb moves (ADR-004 §1)`);
      }
    },
  },
];
