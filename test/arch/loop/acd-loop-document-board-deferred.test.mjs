// Fitness function for story 79 / task 03 — REGISTRATION, THE FROZEN LISTS, AND THE ABSENT DOORS.
//
// The writer registers into the same command core every `work:*` command uses (08/ADR-001), which
// is what makes the registry-derived bijections cover it with no edit. Two frozen lists then move
// deliberately — the `WORK_IDS` census and the `BOARD_DEFERRED` carve-out — and three doors stay
// shut:
//
//   · NO SERVED ROUTE. Chore 64 (done) closed the `work:loops-*` route gap by documented carve-out
//     rather than by route, on the grounds that 52/FF-5202 asserts `ui/` never references the loop
//     family — so a served route would be a door no UI is permitted to open. This command joins
//     that carve-out with its own entry and its own reason, and this story does not reopen 64.
//   · NO `ui/` REFERENCE. Asserted over the `ui/` source tree for THIS command's tokens, so the
//     claim is about this story rather than a re-run of FF-5202.
//   · NO `/aof:` BUNDLE WRAPPER, and its absence is deliberate: the CLI↔bundle parity control is
//     scoped to the `work:insert-*` family, exactly as it is for the four `work:loops-*` reads.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getCommand, listCommands } from "../../../src/command-core.mjs";
import { deriveRouteTable, resolveRoute } from "../../../src/spine/face.mjs";
import { readDescriptor } from "../../../src/work/bundle.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ROUTE_COVERAGE = path.join(repoRoot, "test/arch/work/acd-work-command-route-coverage.test.mjs");
const BOARD_UI = path.join(repoRoot, "src/board-ui.mjs");
const ID = "work:loop-document";
const OP = "loop-document";

// The `const BOARD_DEFERRED = new Set([ … ])` literal, cut on matching brackets rather than on a
// character window (TECH_DEBT item 24's species; `test/support/source-slice.mjs` is the one home
// for a structural cut and this file authors no second stripper). The same cut
// `acd-trigger-is-a-caller-not-a-coordinator` makes, for the same list.
async function boardDeferredMembers() {
  const source = stripComments(await readFile(ROUTE_COVERAGE, "utf8"));
  const at = source.indexOf("BOARD_DEFERRED");
  assert.notEqual(at, -1, "the route-coverage control declares BOARD_DEFERRED");
  const open = source.indexOf("[", at);
  const close = source.indexOf("]", open);
  assert.ok(open > 0 && close > open, "its member list is a bracketed literal");
  return source.slice(open + 1, close).split(",").map((entry) => entry.trim().replace(/^["']|["']$/gu, "")).filter(Boolean);
}

// The `ui/` SOURCE tree — `dist` is minified onto single lines and `node_modules` is not authored
// here, exactly as FF-5202 excludes them.
const UNAUTHORED = new Set(["node_modules", "dist"]);
async function uiSourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && UNAUTHORED.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await uiSourceFiles(full));
    else if (/\.(?:mjs|js|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

export const archTests = [
  {
    name: "arch/79/03 the loop-document command is registered exactly once and reachable beside the other loop verbs",
    run: async () => {
      const matching = listCommands().filter((command) => command.id === ID);
      assert.equal(matching.length, 1, "the registry exposes the loop-document command exactly once");
      const command = getCommand(ID);
      assert.equal(command, matching[0], "and getCommand resolves the same object");

      // The route sits beside the four read verbs — where an operator looks — while the id carries
      // the execution family's name. `work:loops-graph` → `aof work loops graph` already
      // establishes that an id need not be its route's own segments.
      assert.deepEqual(command.cli.route, ["work", "loops", "document"], "reachable from the CLI beside the other loop verbs");
      assert.equal(deriveRouteTable().get("work loops document")?.id, ID, "the registry-derived route table carries it");
      assert.equal(resolveRoute(["work", "loops", "document", "tail"]).command.id, ID, "and it resolves without a ladder");
      assert.equal(resolveRoute(["work", "loops"]), null, "the bare `work loops` still claims nothing");
      for (const key of ["argv", "render", "json"]) assert.equal(typeof command.cli[key], "function", `${ID}/${key}`);

      // The id/route divergence is DELIBERATE, and the id is what the FF-5201 family name forces.
      assert.ok(!ID.startsWith("work:loops-"), "the id carries the execution family's name, not the registry family's");
    },
  },
  {
    name: "arch/79/03 the CLI face and the registered command agree, as a real subprocess",
    run: async () => {
      const { spawnCliSync } = await import("../../support/cli-spawn.mjs");
      const { withRepo } = await import("../../support/loop-document-fixture.mjs");
      const command = getCommand(ID);
      const cliPath = path.join(repoRoot, "bin", "aof.mjs");

      await withRepo({}, async (repo) => {
        const env = { ...process.env, AOF_GLOBAL_HOME: repo.root };
        const run = (...args) => spawnCliSync(process.execPath, [cliPath, ...command.cli.route, ...args], { cwd: repo.root, encoding: "utf8", env });

        // THE VERB: the subprocess is invoked with the registry entry's own route words, so the
        // two cannot be spelled differently and both still pass.
        const bare = run("--json");
        assert.equal(bare.status, 0, `the CLI face runs the registered verb: ${bare.stderr}`);
        // ONE document: the whole of stdout parses as a single JSON value. Two concatenated
        // documents — the shape a face that printed both a result and a warning would produce —
        // would not parse at all, which is what makes this the assertion rather than a line count
        // (the document is pretty-printed and spans many lines).
        const parsed = JSON.parse(bare.stdout);
        assert.equal(typeof parsed.path, "string", "`--json` emits one parseable document carrying the command's own result");
        assert.equal(parsed.written, false, "and the bare face reports that it wrote nothing");

        // THE FLAGS: every flag the registry entry declares is accepted by the subprocess, and a
        // flag it does not declare is refused. The set is DERIVED from the command, so a flag
        // added to one face and not the other is caught with no edit here.
        for (const flag of Object.keys(command.cli.spec.flags)) {
          const accepted = run(`--${flag.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, "--json");
          assert.equal(accepted.status, 0, `the CLI face accepts the declared flag --${flag}: ${accepted.stderr}`);
        }
        const refused = run("--undeclared", "--json");
        assert.notEqual(refused.status, 0, "and refuses one it does not declare");
      });
    },
  },
  {
    name: "arch/79/03 the command is a documented BOARD_DEFERRED member with a recorded reason and no served route",
    run: async () => {
      const members = await boardDeferredMembers();
      assert.ok(members.includes(OP), `${OP} is a member of the BOARD_DEFERRED set`);

      // ITS ENTRY CARRIES THE RECORDED REASON — the carve-out is documented, not a bare token in a
      // list. Read from the UNSTRIPPED source, since the reason lives in the comment above it.
      const source = await readFile(ROUTE_COVERAGE, "utf8");
      const at = source.indexOf(`"${OP}",`);
      assert.ok(at > 0, "the entry is present in the source");
      const preceding = source.slice(0, at);
      const comment = preceding.slice(preceding.lastIndexOf("\n\n") + 1);
      assert.match(comment, /story 79/, "its entry carries the recorded reason for the deferral");
      assert.match(comment, /FF-5202|no UI is permitted to open/, "and the reason names why, not merely that");

      // No `/api/work/loop-document` route is served.
      const board = stripComments(await readFile(BOARD_UI, "utf8"));
      assert.ok(!board.includes(`/api/work/${OP}`), "no /api/work route is served for it");
    },
  },
  {
    name: "arch/79/03 the UI gains no reference to the loop family",
    run: async () => {
      const files = await uiSourceFiles(path.join(repoRoot, "ui"));
      assert.ok(files.length > 10, "the ui/ sweep is non-vacuous");
      const tokens = [ID, OP, "loop-document", "loopDocument", "work-loops", "loops-graph", "loops-validate"];
      for (const file of files) {
        const source = stripComments(await readFile(file, "utf8"));
        for (const token of tokens) {
          assert.ok(!source.includes(token), `${path.relative(repoRoot, file)} carries no token naming this command, its modules or its id (${token})`);
        }
      }
    },
  },
  {
    name: "arch/79/03 no ACD command wrapper is owed, and its absence is deliberate",
    run: async () => {
      // The bundle-parity control is scoped to the `work:insert-*` family — the placement twins of
      // the `add-*` scaffolders. It does not demand a wrapper for this command, and this command
      // ships without one, exactly as the four `work:loops-*` read verbs do.
      const parity = stripComments(await readFile(path.join(repoRoot, "test/arch/work/acd-work-insert-command-bundle-parity.test.mjs"), "utf8"));
      assert.match(parity, /startsWith\("work:insert-"\)/, "the parity control derives its set from the work:insert-* family");
      assert.ok(!parity.includes(ID) && !parity.includes(OP), "and names this command nowhere");

      const wrapped = new Set(readDescriptor().members.filter((member) => member.kind === "command").map((member) => member.id));
      assert.ok(!wrapped.has(OP), "this command ships without a bundle command wrapper");
      for (const read of ["loops-show", "loops-graph", "loops-validate", "loops-groundedness"]) {
        assert.ok(!wrapped.has(read), `as the four work:loops-* read verbs do (${read})`);
      }
    },
  },
  {
    name: "arch/79/03 every registry read verb and the new writer leave a fixture registry byte-identical",
    run: async () => {
      const { loadWorkspace } = await import("../../../src/command-core.mjs");
      const { loopsShowCommand } = await import("../../../src/commands/loops-show.mjs");
      const { loopsGraphCommand } = await import("../../../src/commands/loops-graph.mjs");
      const { loopsValidateCommand } = await import("../../../src/commands/loops-validate.mjs");
      const { createLoopsGroundednessCommand } = await import("../../../src/commands/loops-groundedness.mjs");
      const { loopDocumentCommand } = await import("../../../src/commands/loop-document.mjs");
      const { snapshot, withRepo } = await import("../../support/loop-document-fixture.mjs");

      await withRepo({}, async (repo) => {
        const workspace = await loadWorkspace(repo.root);
        const loops = path.join(repo.aofDir, "loops");
        const before = await snapshot(loops);
        for (const command of [loopsShowCommand, loopsGraphCommand, loopsValidateCommand, createLoopsGroundednessCommand()]) {
          await command.run({}, { workspace });
        }
        await loopDocumentCommand.run({ write: true }, { workspace });
        assert.deepEqual(await snapshot(loops), before, "every file in the registry directory is byte-identical to before");
      });
    },
  },
];
