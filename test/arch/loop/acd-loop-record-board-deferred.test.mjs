// FF-7807 (78/ADR-008) — REGISTRATION, THE FROZEN LISTS, AND THE DEFERRAL THAT IS A DECISION.
//
// The command registers into the SAME core every `work:*` command uses (08/ADR-001), which is what
// makes the registry-derived bijections cover it with no edit of their own. Two frozen lists then
// move deliberately — the `WORK_IDS` census and the `BOARD_DEFERRED` carve-out — and the board door
// stays shut.
//
// THE DEFERRAL IS A DECISION, NOT AN OVERSIGHT, and the milestone's own `SPEC.md` asked for the
// opposite: *"`work:loops-*` becomes board-reachable … A record nobody can reach from the board is
// half a deliverable."* That was true when 78 was written and is not any more. Chore 64 — `done` —
// closed the gap in the OPPOSITE direction, by documented carve-out rather than by route, recording
// that *"a board face for this family is not a deferral awaiting a decision — it is a decision
// already recorded at 53's gate"*, because 52/FF-5202 asserts `ui/` never references the loop family.
// So the scope item is WITHDRAWN, this command joins the same carve-out with its own entry, and the
// surface stays the one `SPEC.md` names: a committed markdown file the operator already has open.
//
// AND THE ROUTE IS `aof work loop-record <ref>`, not a fifth `aof work loops …` verb. That family's
// four reads and story 79's writer all answer for the framework-wide REGISTRY and take no ref; this
// one answers for ONE ITEM and its first positional is that item. Asserted here so the divergence is
// a recorded decision rather than something a later reader tidies away.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getCommand, listCommands } from "../../../src/command-core.mjs";
import { deriveRouteTable, resolveRoute } from "../../../src/spine/face.mjs";
import { readDescriptor } from "../../../src/work/bundle.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import { ITEM_REF, withRepo } from "../../loop/loop-record-command.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ROUTE_COVERAGE = path.join(repoRoot, "test/arch/work/acd-work-command-route-coverage.test.mjs");
const CORE_CONTRACT = path.join(repoRoot, "test/command/command-core-contract.test.mjs");
const BOARD_UI = path.join(repoRoot, "src/board-ui.mjs");
const ID = "work:loop-record";
const OP = "loop-record";

// A `const NAME = [ … ]` literal cut on its brackets rather than on a character window (TECH_DEBT
// item 24's species). The same cut `acd-loop-document-board-deferred` makes, for the same two lists.
async function frozenList(file, name) {
  const source = stripComments(await readFile(file, "utf8"));
  const at = source.indexOf(name);
  assert.notEqual(at, -1, `${path.basename(file)} declares ${name}`);
  const open = source.indexOf("[", at);
  const close = source.indexOf("]", open);
  assert.ok(open > 0 && close > open, `${name}'s member list is a bracketed literal`);
  return source.slice(open + 1, close).split(",").map((entry) => entry.trim().replace(/^["']|["']$/gu, "")).filter(Boolean);
}

// The `ui/` SOURCE tree — `dist` is minified onto single lines and `node_modules` is not authored
// here, exactly as 52/FF-5202 excludes them.
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
    name: "arch/78/02 FF-7807 the command is registered exactly once, in the shared core, and reachable as `aof work loop-record`",
    run: async () => {
      const matching = listCommands().filter((command) => command.id === ID);
      assert.equal(matching.length, 1, "the registry exposes work:loop-record exactly once");
      const command = getCommand(ID);
      assert.equal(command, matching[0], "and getCommand resolves the same object");

      assert.deepEqual(command.cli.route, ["work", "loop-record"], "reachable as `aof work loop-record`");
      assert.equal(deriveRouteTable().get("work loop-record")?.id, ID, "the registry-derived route table carries it");
      assert.equal(resolveRoute(["work", "loop-record", "78/02"]).command.id, ID, "and it resolves with a ref, without a ladder");
      for (const key of ["argv", "render", "json"]) assert.equal(typeof command.cli[key], "function", `${ID}/${key}`);

      // THE ROUTE IS NOT A FIFTH `loops` VERB, deliberately (see the header). The registry family's
      // five commands are all ref-less; this one requires a ref.
      assert.ok(!command.cli.route.includes("loops"), "it is not filed under the registry-scoped `loops` noun");
      assert.deepEqual(command.input.required, ["ref"], "because it answers for ONE ITEM and requires its ref");
      assert.equal(command.input.additionalProperties, false, "and it accepts no caller-supplied output path");
      assert.deepEqual(Object.keys(command.input.properties).sort(), ["ref", "write"]);
      // The id carries the EXECUTION family's name, which is what 52/FF-5201 forces (ADR-009).
      assert.ok(!ID.startsWith("work:loops-"), "the id carries the execution family's name, not the registry family's");
    },
  },
  {
    name: "arch/78/02 FF-7807 the CLI face and the registered command agree, as a real subprocess",
    run: async () => {
      const { spawnCliSync } = await import("../../support/cli-spawn.mjs");
      const command = getCommand(ID);
      const cliPath = path.join(repoRoot, "bin", "aof.mjs");

      await withRepo({}, async (repo) => {
        const env = { ...process.env, AOF_GLOBAL_HOME: repo.root };
        const run = (...args) => spawnCliSync(process.execPath, [cliPath, ...command.cli.route, ...args], { cwd: repo.root, encoding: "utf8", env });

        // THE VERB, invoked with the registry entry's own route words, so the two cannot be spelled
        // differently and both still pass. The BARE face is probed — it is the read.
        const bare = run(ITEM_REF, "--json");
        assert.equal(bare.status, 0, `the CLI face runs the registered verb: ${bare.stderr}`);
        // ONE document: the whole of stdout parses as a single JSON value.
        const parsed = JSON.parse(bare.stdout);
        assert.equal(parsed.ref, ITEM_REF, "`--json` emits one parseable document carrying the command's own result");
        assert.equal(parsed.written, false, "and the bare face reports that it wrote nothing");

        // THE FLAGS: every flag the registry entry declares is accepted, and one it does not is
        // refused. The set is DERIVED from the command, so a flag added to one face and not the
        // other is caught with no edit here.
        for (const flag of Object.keys(command.cli.spec.flags)) {
          const accepted = run(ITEM_REF, `--${flag.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, "--json");
          assert.equal(accepted.status, 0, `the CLI face accepts the declared flag --${flag}: ${accepted.stderr}`);
        }
        assert.notEqual(run(ITEM_REF, "--undeclared", "--json").status, 0, "and refuses one it does not declare");

        // THE POSITIONAL is the ref, and a missing one is refused rather than defaulted — a face that
        // guessed an item would write a record into the wrong folder.
        assert.notEqual(run("--json").status, 0, "the ref is required at the CLI too");
      });
    },
  },
  {
    name: "arch/78/02 FF-7807 the frozen command census admits the new id, and the registry exposes exactly what it names",
    run: async () => {
      const census = await frozenList(CORE_CONTRACT, "WORK_IDS");
      assert.ok(census.includes(ID), `the frozen WORK_IDS census carries ${ID}`);
      // The literal OPENS with a spread of the milestone-08 six (`...SIX_IDS`), so the members read
      // out of the source are a subset by construction and this gate cannot reconstruct the census.
      assert.ok(census.some((entry) => entry.startsWith("...")), "the census literal opens with the six-id spread");

      // SO THE EXACTNESS CLAUSE IS ASSERTED WHERE IT CAN BE — in `command-core-contract` itself,
      // against the real constant. This gate holds that the assertion is still THERE and still
      // two-way, rather than restating a list it cannot see whole. A census that stopped being exact
      // would make the membership above meaningless, which is why the clause is checked at all.
      const contract = stripComments(await readFile(CORE_CONTRACT, "utf8"));
      assert.match(
        contract,
        /deepEqual\(\s*\[\.\.\.workIds\]\.sort\(\),\s*\[\.\.\.WORK_IDS\]\.sort\(\)/,
        "command-core-contract asserts the registry exposes exactly the ids the census names",
      );
      assert.match(contract, /workIds\.length,\s*WORK_IDS\.length/, "and that there are no other registered work commands");

      // …and this command really is registered, which is the half of the two-way claim this gate owns.
      assert.ok(listCommands().some((command) => command.id === ID), `${ID} is one of them`);
    },
  },
  {
    name: "arch/78/02 FF-7807 the command is a documented BOARD_DEFERRED member with no served route",
    run: async () => {
      const members = await frozenList(ROUTE_COVERAGE, "BOARD_DEFERRED");
      assert.ok(members.includes(OP), `${OP} is a member of the BOARD_DEFERRED set`);

      // ITS ENTRY CARRIES THE RECORDED REASON — the carve-out is documented, not a bare token in a
      // list. Read from the UNSTRIPPED source, since the reason lives in the comment above it.
      const source = await readFile(ROUTE_COVERAGE, "utf8");
      const at = source.indexOf(`"${OP}",`);
      assert.ok(at > 0, "the entry is present in the source");
      const preceding = source.slice(0, at);
      const comment = preceding.slice(preceding.lastIndexOf("\n\n") + 1);
      assert.match(comment, /milestone 78/, "its entry names the story that recorded the deferral");
      assert.match(comment, /FF-5202|no UI is permitted to open/, "and the reason names WHY, not merely that");
      assert.match(comment, /chore 64|withdrawn/, "and that it is a decision already recorded rather than one awaiting");

      const board = stripComments(await readFile(BOARD_UI, "utf8"));
      assert.ok(!board.includes(`/api/work/${OP}`), "no /api/work/loop-record route exists");
    },
  },
  {
    name: "arch/78/02 FF-7807 the UI gains no reference to this command",
    run: async () => {
      const files = await uiSourceFiles(path.join(repoRoot, "ui"));
      assert.ok(files.length > 10, "the ui/ sweep is non-vacuous");
      // This command's own tokens, plus the family tokens 52/FF-5202 already bans — asserted here
      // for THIS story rather than as a re-run of that gate, so a `ui/` reference added by this
      // milestone reds against this milestone's own control.
      const tokens = [ID, OP, "loopRecord", "EXECUTION.md", "work-loops", "loops-graph"];
      for (const file of files) {
        const source = stripComments(await readFile(file, "utf8"));
        for (const token of tokens) {
          assert.ok(!source.includes(token), `${path.relative(repoRoot, file)} carries no token naming this command or its record (${token})`);
        }
      }
    },
  },
  {
    name: "arch/78/02 FF-7807 no ACD command wrapper is owed, and its absence is deliberate",
    run: async () => {
      // The CLI↔bundle parity control is scoped to the `work:insert-*` family — the placement twins
      // of the `add-*` scaffolders. It demands no wrapper for this command, exactly as it demands
      // none for the four `work:loops-*` reads or story 79's writer.
      const parity = stripComments(await readFile(path.join(repoRoot, "test/arch/work/acd-work-insert-command-bundle-parity.test.mjs"), "utf8"));
      assert.match(parity, /startsWith\("work:insert-"\)/, "the parity control derives its set from the work:insert-* family");
      assert.ok(!parity.includes(ID) && !parity.includes(OP), "and names this command nowhere");

      const wrapped = new Set(readDescriptor().members.filter((member) => member.kind === "command").map((member) => member.id));
      assert.ok(!wrapped.has(OP), "this command ships without a bundle command wrapper");
      assert.ok(!wrapped.has("loop-document"), "as story 79's writer does");
    },
  },
];
