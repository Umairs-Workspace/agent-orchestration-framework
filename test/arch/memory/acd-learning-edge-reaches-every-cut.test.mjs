// FF-12405 — "The learning edge reaches EVERY cut-making command, in a form the shipped CLI
// actually parses, and the edited bundle source re-renders into all three of its mirrors."
//
// milestone 124 / story 02, ADR-007. Four claims, and each one is a claim about a different tree:
//
//   1. `shatter.md` carries ONE PO recall, keyed to the seam, placed before the cut (task 00).
//   2. Every verb and flag a recall block spells resolves in `src/work/memory.mjs`'s OWN parse
//      surface — never in `memoryUsage()`, never in `--help`, never in the command registry, which
//      has no `work memory` entry to find (task 01).
//   3. The cut-making roster is named and asserted in BOTH directions, so a third cutter cannot
//      arrive without a recall and the roster cannot be shrunk to keep this green (task 02).
//   4. The three tracked renders of the edited member match a fresh re-render, and the two hash
//      records agree where they overlap (task 03).
//
// WHY THE SURFACE IS READ FROM CODE. `aof work memory` WAS a deliberately-unrouted door:
// `src/cli.mjs` dispatched it by string compare and `src/command-core.mjs` named it nowhere, so a
// registry lookup found nothing and a lenient one passed forever. Story 128 registered it
// (`work:memory`, route `work memory`), and the surface is STILL the seam: the routed command's
// `cli.argv` re-serialises the face's parse and hands it to `parseMemoryArgv`, so the module's own
// branches remain the one place a flag either resolves or does not. Worse, an invented flag produces
// NO runtime signal — `parseMemoryArgv` skips an unknown flag without consuming its value, so the
// value falls through to the positionals and is folded into the query. `--scope architecture` exits
// 0 and silently rewrites the question. There is nothing downstream to catch it, which is the whole
// reason this assertion is static.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MEMORY_VERBS, SCOPE_FLAGS } from "../../../src/work/memory.mjs";
import { loadBundle, renderBundleOutputs } from "../../../src/work/bundle.mjs";
import { hashContent } from "../../../src/lock.mjs";
import { listCommands } from "../../../src/command-core.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const slash = (value) => String(value).split("\\").join("/");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const COMMANDS_DIR = "src/bundle/commands";
const SHATTER = `${COMMANDS_DIR}/shatter.md`;
const REFINE = `${COMMANDS_DIR}/refine.md`;

// ────────────────────────────────────────────────── reading an invocation, not a line ──
//
// Markdown wraps a command mid-token: `refine.md`'s block ends one line at `aof work memory` and
// begins the next at `recall "<…>" --area architecture --block`. A per-line regex reads that as
// one invocation with no verb and no flags — which is the shape most likely to pass vacuously. So
// every reading below is over the JOINED body, and an invocation runs to the end of its sentence.
const joined = (text) => text.replace(/\r?\n\s*/gu, " ");

// One invocation: `aof work memory <verb> …` up to the terminator that ends a command in prose.
// The trailing set is deliberately narrow — a backtick closes an inline code span, and `.`/`;`/`—`
// end the sentence that carries it.
const INVOCATION = /aof work memory\s+([a-z]+)((?:\s+(?:--[a-z-]+(?:=[^\s`]+)?|"[^"]*"|`[^`]*`|<[^>]*>|[A-Za-z0-9_./-]+))*)/gu;

function invocationsIn(text) {
  return [...joined(text).matchAll(INVOCATION)].map((match) => ({
    verb: match[1],
    tail: match[2] ?? "",
    flags: [...(match[2] ?? "").matchAll(/--[a-z-]+/gu)].map((flag) => flag[0]),
    whole: match[0],
  }));
}

// ─────────────────────────────────────────────────── the recall block, cut STRUCTURALLY ──
//
// NOT a fixed window. `47/F-47-04-ARCH-2` names the species: a `+ N` character or line window
// measures the LENGTH of the region containing the thing the rule is about, and this repo has
// measured six instruments made confidently wrong about the TREE that way. The recall block has a
// real boundary — it begins at its own bolded lead and ends where step 2's numbered heading begins
// — so the cut is made against those, and a cut that cannot be made returns `null` and the caller
// reports NOT FOUND loudly rather than asserting over the wrong region.
const STEP_HEADING = /^\d+\. \*\*/u;

function recallBlock(text) {
  const lines = text.split(/\r?\n/u);
  const start = lines.findIndex((line) => line.includes("**Recall prior lessons first"));
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index > start && STEP_HEADING.test(line));
  if (end < 0) return null;
  return { lines, start, end, text: joined(lines.slice(start, end).join("\n")) };
}

/** Every `.md` under the bundle's command directory, sorted. */
const commandFiles = () => readdirSync(path.join(root, COMMANDS_DIR))
  .filter((name) => name.endsWith(".md"))
  .sort();

// ──────────────────────────────────────────────────────────────── the cut roster ──
//
// AUTHORED, and it has to be. `grep -ln "aof-product-owner"` answers SIX files and five of them
// frame or insert exactly one named item — spawning the PO does not make a command a cutter. So
// membership is stated, and the direction that bites is the one that refuses an UNCLASSIFIED file:
// every command file is on this roster or on the excluded list with its own reason, and the union
// must equal the directory listing. A 27th command then reds this control by EXISTING.
const CUT_MAKING = Object.freeze({
  "shatter.md": "partitions one PRD into many drivers",
  "refine.md": "partitions one milestone into many stories",
});

// Each exclusion carries its reason, because a list of bare filenames cannot tell a considered
// exclusion from an oversight — which is the failure this direction exists to prevent.
const EXCLUDED = Object.freeze({
  "add-chore.md": "creates one chore; partitions nothing",
  "add-milestone.md": "frames one named driver; spawns the PO but partitions nothing",
  "add-spike.md": "creates one spike; partitions nothing",
  "add-story.md": "adds one story to an existing milestone",
  "add-task.md": "adds one task feature",
  "add-uat.md": "creates one uat session",
  "assimilate-code.md": "governs code already written; its memory call is `ingest`",
  "autonomous.md": "sequences existing items through the loop shell; cuts nothing",
  "code-review.md": "ships and reviews a branch",
  "continue.md": "builds an existing story; carries its own recall regardless",
  "delegate.md": "sets two model decisions",
  "feedback.md": "captures one raw entry",
  "init.md": "installs ACD and authors a config",
  "insert-chore.md": "inserts one chore at a position and renumbers; no partition",
  "insert-milestone.md": "inserts one driver at a position and renumbers; no partition",
  "insert-story.md": "inserts one story at a position; no partition",
  "insert-uat.md": "inserts one uat session at a position; no partition",
  "migrate.md": "migrates one source folder into one milestone",
  "observe.md": "reads transcript telemetry",
  "pay-debt.md": "pays down ledger entries in the files at hand",
  // 127/02 task 04 — the one wrapper over `work:promote`: moves ONE backlog item into the numbered
  // stream and mints its number; spawns no agent, carries no memory call, partitions nothing.
  "promote.md": "promotes one backlog item into the stream and mints its number; no partition",
  "recent.md": "reads the stream chronologically",
  "retrospective.md": "distils one milestone's lessons",
  "validate.md": "a structural check that spawns no agent and cuts nothing",
  "verify.md": "accepts an item; its memory calls are `ingest`",
});

export const archTests = [
  {
    name: "arch/124/02 FF-12405 leg 1 (task 00): shatter carries exactly ONE memory invocation, it is a PO recall, and it runs before the cut",
    run: () => {
      const text = read(SHATTER);
      const calls = invocationsIn(text);
      assert.equal(calls.length, 1, `shatter spells exactly one \`aof work memory\` invocation (found ${calls.length})`);
      assert.equal(calls[0].verb, "recall", "…and its verb is `recall`, never `ingest`");

      // THE ROLE. The block names the role that runs it, and it is the one the `<process>` spawns.
      const lines = text.split(/\r?\n/u);
      const at = lines.findIndex((line) => line.includes("aof work memory"));
      assert.ok(at >= 0, "guard: the invocation was located by line");
      // CUT STRUCTURALLY AND READ OVER JOINED LINES. Structurally, because a `+ N` window measures
      // the length of the region rather than finding it; joined, because markdown wraps prose
      // mid-phrase and `An **empty block means nothing to / surface**` is exactly the sentence a
      // per-line reading would miss while the clause it checks for is plainly there.
      const cut = recallBlock(text);
      assert.ok(cut != null, "the recall block was located by its own lead and by the step heading that ends it — NOT FOUND is reported loudly rather than asserted over the wrong region");
      const block = cut.text;
      assert.ok(block.includes("aof-product-owner"), "the block names `aof-product-owner` as the role that runs it");
      assert.equal(/aof-architect/u.test(text), false, "no clause in the file names an architect at all, let alone one running a recall");

      // PLACEMENT: after step 1's seam read, before step 2's heading.
      const stepTwo = lines.findIndex((line) => line.startsWith("2. **Identify the drivers"));
      const stepThree = lines.findIndex((line) => line.startsWith("3. **Frame each driver"));
      const seam = lines.findIndex((line) => line.startsWith("1. **Read the seam"));
      assert.ok(seam >= 0 && stepTwo > seam && stepThree > stepTwo, "guard: the numbered steps were located and keep their order");
      assert.ok(at > seam, "the recall sits after step 1's seam read");
      assert.ok(at < stepTwo, "…and before step 2 identifies the drivers");

      // ONCE PER PRD, never once per driver.
      assert.ok(/ONCE for this PRD|Once for the PRD session/u.test(block), "the block states the recall runs once for the PRD session");
      assert.ok(/never once per driver/u.test(block), "…and says explicitly that it is not per driver");

      // THE EMPTY CASE, and the recall's unconditionality.
      assert.ok(/empty block means nothing to surface/u.test(block), "an empty block means nothing to surface");
      assert.ok(/proceed unchanged/u.test(block), "…and the instruction is to proceed unchanged");
      assert.ok(/unconditionally/u.test(block), "the recall itself is unconditional — running it does not depend on memory being enabled");

      // THE ACKNOWLEDGEMENT IS AN OUTCOME, and it lands in a driver's record doc — never in
      // documents that do not exist at framing time.
      assert.ok(/honoured, or consciously departed from/u.test(block), "a surfaced near-miss is honoured or consciously departed from");
      assert.equal(/ARCHITECTURE\.md|STATE\.md/u.test(block), false, "…with no escape to a document framing time has not created");
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 2 (task 00): the acknowledgement names only headings the driver's OWN template declares",
    run: () => {
      const cut = recallBlock(read(SHATTER));
      assert.ok(cut != null, "the recall block was located structurally, by its lead and the step heading that ends it");
      const named = [...cut.text.matchAll(/`## ([^`]+)`/gu)].map((match) => match[1].trim());
      assert.ok(named.length >= 2, `the clause names at least two headings (found ${named.length})`);

      // The two record docs shatter frames, and the headings each template really declares. ADR-007
      // §4 was AMENDED for exactly this: a spike's template has neither `## Scope` nor
      // `## Dependencies`, so a fixed pair of section names would name a heading half the drivers
      // do not have.
      const templates = {
        milestone: ".aof/templates/work/milestone/SPEC.md",
        spike: ".aof/templates/work/spike/SPIKE.md",
      };
      const declared = new Map();
      for (const [type, rel] of Object.entries(templates)) {
        const headings = [...read(rel).matchAll(/^## (.+)$/gmu)].map((match) => match[1].trim());
        assert.ok(headings.length > 0, `guard: ${rel} declares headings`);
        declared.set(type, headings);
      }
      assert.ok(declared.get("milestone").includes("Scope"), "guard: the milestone template really declares `## Scope`");
      assert.equal(declared.get("spike").includes("Scope"), false, "guard: the spike template really does NOT — which is what §4 was amended for");

      // EVERY named heading resolves in AT LEAST ONE of the two templates, and the clause covers
      // BOTH types: a clause naming only milestone headings sends a spike's acknowledgement nowhere.
      const all = new Set([...declared.get("milestone"), ...declared.get("spike")]);
      for (const heading of named) {
        assert.ok(all.has(heading), `\`## ${heading}\` is declared by a template shatter frames`);
      }
      assert.ok(named.some((heading) => declared.get("milestone").includes(heading)), "the clause reaches a milestone's own headings");
      assert.ok(named.some((heading) => declared.get("spike").includes(heading)), "…and a spike's");
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 3 (task 00): the query is keyed to the seam, and refine is read rather than written",
    run: () => {
      const shatter = read(SHATTER);
      const call = invocationsIn(shatter)[0];
      const query = /"([^"]*)"/u.exec(call.whole)?.[1] ?? "";
      assert.ok(query.length > 0, "the invocation carries a quoted query");
      assert.ok(/objective/iu.test(query) && /scope/iu.test(query), "…keyed to the PRD's objective and scope words — the read-out `readSeam` pins");
      assert.equal(/<ref>|\bNN\b/u.test(query), false, "…and it carries no item-ref placeholder");

      // THE ROLES THE COMMAND SPAWNS ARE UNCHANGED. `aof-researcher` appears at `:53` as PROSE
      // about what `aof:refine` does later — a role sweep that counted it would report two.
      const roles = [...shatter.matchAll(/aof-[a-z-]+/gu)].map((match) => match[0]);
      assert.deepEqual([...new Set(roles)].sort(), ["aof-product-owner", "aof-researcher"], "guard: two role tokens appear, and only one is a spawn");
      assert.ok(/Spawn `aof-product-owner`/u.test(shatter), "the `<process>` spawns the product owner");
      assert.equal(/Spawn `aof-researcher`/u.test(shatter), false, "…and never the researcher");

      // REFINE IS READ, NEVER WRITTEN — the property is asserted over the WORKING tree: refine.md
      // still carries exactly its two recall invocations, the architect's and the PO's. It used to
      // be a byte-identity check against `git show HEAD:`, which was a commit-timing tripwire rather
      // than a control — red for every uncommitted legitimate edit to the file (a story's Step 0, a
      // driving-shell hunk) and trivially green after ANY commit, so it guarded nothing (127/02,
      // 2026-09-13). What shatter must not do is take one of these two away or add a third.
      const refineCalls = invocationsIn(read(REFINE));
      assert.equal(refineCalls.length, 2, "refine.md carries exactly its two invocations");
      assert.ok(refineCalls.some((call2) => call2.flags.includes("--area")), "the architect's, with `--area`");
      assert.ok(refineCalls.some((call2) => call2.flags.includes("--item")), "and the PO's, with `--item`");
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 4 (task 01): the surface is read from CODE — the door is asserted routed (story 128) with the seam still its parser, and every token a carrier spells resolves in it",
    run: () => {
      // THE REGISTRY CARRIES THE DOOR (story 128: `work:memory`, route `work memory`), and the surface
      // below is STILL the module, because the routed command's `cli.argv` defers to `parseMemoryArgv`
      // — a registry lookup finds the door but not the flag vocabulary the carriers spell. Asserted,
      // not assumed, so a second unrouting (or a route rename) reds here rather than passing quietly.
      const registered = listCommands().map((command) => (command.cli?.route ?? []).join(" "));
      assert.equal(registered.includes("work memory"), true, "a registered command's route is `work memory` — the door rides the route table since story 128");

      // THE SURFACE: the seam module's own exports, plus `parseMemoryArgv`'s own branches. Never
      // `memoryUsage()` and never `--help`, neither of which knows `--block` — the one flag both
      // carriers actually spell.
      const memory = read("src/work/memory.mjs");
      const parse = /export function parseMemoryArgv[\s\S]*?\n\}/u.exec(memory)?.[0] ?? "";
      assert.ok(parse.length > 0, "guard: the parse function was located");
      const branchFlags = [...parse.matchAll(/key === "([a-z-]+)"/gu)].map((match) => `--${match[1]}`);

      assert.deepEqual([...MEMORY_VERBS], ["recall", "brief", "ingest", "reindex", "status"], "guard: the verb vocabulary is non-empty and is the module's own");
      assert.equal(SCOPE_FLAGS.length, 6, "guard: six scope flags");
      assert.ok(branchFlags.includes("--block"), "guard: `--block` is a real branch of the parser");

      const usage = /function memoryUsage[\s\S]*?\n\}/u.exec(memory)?.[0] ?? "";
      assert.ok(usage.length > 0, "guard: `memoryUsage` exists");
      assert.equal(usage.includes("block"), false, "…and does NOT mention `--block`, which is why it is not the surface");

      const resolves = (token) => token.startsWith("--")
        ? branchFlags.includes(token) || SCOPE_FLAGS.includes(token.slice(2))
        : MEMORY_VERBS.includes(token);

      // The tokens the carriers spell, plus one that exists nowhere.
      const rows = [
        ["recall", true], ["ingest", true],
        ["--block", true], ["--json", true], ["--limit", true],
        ["--area", true], ["--item", true], ["--kind", true],
        ["--scope", false],
      ];
      let present = 0;
      let absent = 0;
      for (const [token, expected] of rows) {
        assert.equal(resolves(token), expected, `${token} is ${expected ? "present" : "absent"} in the shipped surface`);
        if (expected) present += 1; else absent += 1;
      }
      assert.ok(present > 0 && absent > 0, `non-vacuous in both directions: ${present} present, ${absent} absent`);
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 5 (task 01): EVERY memory invocation in the bundle is read over joined lines, and every token each one spells resolves",
    run: () => {
      const memory = read("src/work/memory.mjs");
      const parse = /export function parseMemoryArgv[\s\S]*?\n\}/u.exec(memory)?.[0] ?? "";
      const branchFlags = [...parse.matchAll(/key === "([a-z-]+)"/gu)].map((match) => `--${match[1]}`);
      const known = new Set([...branchFlags, ...SCOPE_FLAGS.map((flag) => `--${flag}`)]);

      const found = [];
      for (const name of commandFiles()) {
        const rel = `${COMMANDS_DIR}/${name}`;
        for (const call of invocationsIn(read(rel))) found.push({ rel, ...call });
      }
      // Seven: `assimilate-code`, `continue`, `refine` ×2, `verify` ×2, and shatter's new one.
      assert.equal(found.length, 7, `the bundle carries seven memory invocations (found ${found.length}: ${found.map((f) => f.rel).join(", ")})`);
      assert.ok(found.length > 1, "the count it examined is reported and is greater than one");

      // THE TWO THAT MARKDOWN WRAPPED MID-COMMAND are each read as ONE invocation with a real verb
      // — the property a per-line regex loses.
      const refineFound = found.filter((call) => call.rel === REFINE);
      assert.equal(refineFound.length, 2, "refine's two wrapped invocations are each read as one");
      for (const call of refineFound) assert.equal(call.verb, "recall", "…with its verb intact across the wrap");

      // EVERY verb and EVERY flag, not only shatter's.
      for (const call of found) {
        assert.ok(MEMORY_VERBS.includes(call.verb), `${call.rel}: \`${call.verb}\` is a verb the module declares`);
        for (const flag of call.flags) {
          assert.ok(known.has(flag), `${call.rel}: \`${flag}\` resolves in the shipped surface — an invented flag exits 0 and folds its value into the query, so nothing downstream would catch it`);
        }
      }

      // NON-VACUITY: an invented flag really is caught by this reading.
      const planted = invocationsIn('run `aof work memory recall "seam" --scope architecture --block`');
      assert.equal(planted.length, 1);
      assert.equal(planted[0].flags.includes("--scope"), true, "the reading sees a planted `--scope`…");
      assert.equal(known.has("--scope"), false, "…and the surface does not know it, so the leg above would fail and name it");
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 6 (task 00, 02): the flags shatter's form spells, and the two it must not",
    run: () => {
      const call = invocationsIn(read(SHATTER))[0];
      assert.deepEqual(call.flags, ["--block"], "shatter's invocation spells `--block` alone");
      for (const forbidden of ["--item", "--area", "--kind"]) {
        assert.equal(call.flags.includes(forbidden), false, `${forbidden} is absent from the invocation`);
      }
      // The two carriers' FORMS DIFFER, and that is ADR-007's decision rather than an
      // inconsistency — a control asserting one shared shape would red the very form it decided.
      const refineCalls = invocationsIn(read(REFINE));
      assert.equal(refineCalls.length, 2, "refine carries two invocations, for two roles");
      assert.deepEqual(
        refineCalls.map((each) => [...each.flags].sort()),
        [["--area", "--block"], ["--block", "--item"]],
        "…each with its own flags, and neither is shatter's",
      );
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 7 (task 02): the cut-making roster is asserted in BOTH directions, and every command file is classified",
    run: () => {
      const files = commandFiles();
      const roster = Object.keys(CUT_MAKING);
      const excluded = Object.keys(EXCLUDED);

      // DIRECTION 1 — every roster entry carries a RECALL. An `ingest` would not satisfy it.
      for (const name of roster) {
        const calls = invocationsIn(read(`${COMMANDS_DIR}/${name}`));
        const recalls = calls.filter((call) => call.verb === "recall");
        assert.ok(recalls.length >= 1, `${name} is a roster entry and carries at least one \`aof work memory recall\``);
      }
      // …and a file carrying only `ingest` would NOT: shown on a real one rather than asserted.
      const verify = invocationsIn(read(`${COMMANDS_DIR}/verify.md`));
      assert.ok(verify.length > 0 && verify.every((call) => call.verb === "ingest"), "guard: verify's memory calls really are all `ingest`, so the recall test has teeth");

      // DIRECTION 2 — every command file is classified, so a 27th reds this by EXISTING.
      const classified = new Set([...roster, ...excluded]);
      const unclassified = files.filter((name) => !classified.has(name));
      assert.deepEqual(unclassified, [], "every command file is on the roster or on the excluded list with its own reason");
      const missing = [...classified].filter((name) => !files.includes(name));
      assert.deepEqual(missing, [], "…and neither list names a file that is not there");
      assert.equal(roster.length + excluded.length, files.length, "the union of the two lists equals the directory listing");

      // EVERY EXCLUSION CARRIES A REASON, so a considered exclusion is distinguishable from an
      // oversight — the failure a list of bare filenames cannot prevent.
      for (const [name, reason] of Object.entries(EXCLUDED)) {
        assert.equal(typeof reason === "string" && reason.trim().length > 10, true, `${name}'s exclusion states why`);
      }

      // THE MEMBERSHIP RULE IS NOT A ROLE GREP. Six files spawn the product owner and five of them
      // partition nothing — asserted so nobody rewrites the roster as a grep.
      const spawnsPo = files.filter((name) => read(`${COMMANDS_DIR}/${name}`).includes("aof-product-owner"));
      assert.ok(spawnsPo.length > roster.length, `${spawnsPo.length} files name the product owner against ${roster.length} cutters — spawning it does not make a command a cutter`);

      // THE DENOMINATOR, REPORTED.
      assert.equal(files.length, roster.length + excluded.length, `${files.length} command files enumerated: ${roster.length} on the roster, ${excluded.length} excluded`);
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 8 (task 03): every tracked render of the edited member matches a fresh re-render, and the block reached all three",
    run: async () => {
      const bundle = await loadBundle();
      const runtimes = ["claude", "codex", "opencode"];
      const outputs = renderBundleOutputs(bundle, { runtimes });
      const mirrors = [
        ".claude/commands/aof/shatter.md",
        ".codex/skills/aof-shatter/SKILL.md",
        ".opencode/commands/aof/shatter.md",
      ];
      const byPath = new Map(outputs.map((output) => [slash(output.path), output]));
      for (const rel of mirrors) {
        const rendered = byPath.get(rel);
        assert.ok(rendered != null, `${rel} is in the render set — asked of \`renderBundleOutputs\`, never derived from a path prefix`);
        const onDisk = read(rel);
        assert.equal(
          hashContent(onDisk.replace(/\r\n/gu, "\n")),
          hashContent(String(rendered.content).replace(/\r\n/gu, "\n")),
          `${rel} matches a fresh re-render — including the opencode mirror, which the shipped manifest hash-checks not at all`,
        );
        // THE NEW BLOCK REACHED IT, exactly once, as a RENDER of the source rather than a
        // separately worded copy.
        const calls = invocationsIn(onDisk);
        assert.equal(calls.length, 1, `${rel} carries the recall exactly once`);
        assert.equal(calls[0].verb, "recall");
        assert.deepEqual(calls[0].flags, ["--block"], `${rel}'s invocation is the source's, flag for flag`);
      }
      // NON-VACUITY: all three really are distinct resources, so one hash cannot be standing in
      // for three.
      assert.equal(new Set(mirrors.map((rel) => hashContent(read(rel)))).size, 3, "the three mirrors are three distinct renders");
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 9 (task 03): the manifest is a true content address, and it agrees with the lock on every path they both name",
    run: async () => {
      const manifest = JSON.parse(read("src/bundle/manifest.json"));
      const bundle = await loadBundle();
      const rendered = new Map(
        renderBundleOutputs(bundle, { runtimes: manifest.runtimes }).map((output) => [slash(output.path), output]),
      );
      assert.ok(Array.isArray(manifest.entries) && manifest.entries.length > 0, "guard: the manifest has entries");

      for (const entry of manifest.entries) {
        assert.match(entry.hash, /^sha256:[0-9a-f]{64}$/u, `${entry.path} carries a well-formed content address`);
        const output = rendered.get(slash(entry.path));
        assert.ok(output != null, `${entry.path} is in the render set under \`manifest.runtimes\``);
        assert.equal(entry.hash, hashContent(String(output.content)), `${entry.path}'s hash equals the hash of the member it names`);
      }
      // …AND NO EXTRA, NO MISSING.
      assert.deepEqual(
        manifest.entries.map((entry) => slash(entry.path)).sort(),
        [...rendered.keys()].sort(),
        "the manifest's path set equals the rendered path set",
      );

      // THE TWO RECORDS AGREE WHERE THEY OVERLAP. The lock is the wider record — it holds the
      // opencode mirror the manifest does not — so this is an intersection, not an equality.
      const lock = JSON.parse(read(".aof/aof.lock.json"));
      const lockHashes = new Map();
      const walk = (node) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (node && typeof node === "object") {
          if (typeof node.path === "string" && typeof node.hash === "string") lockHashes.set(slash(node.path), node.hash);
          Object.values(node).forEach(walk);
        }
      };
      walk(lock);
      assert.ok(lockHashes.size > 0, "guard: the lock carries hashed paths");
      const shared = manifest.entries.filter((entry) => lockHashes.has(slash(entry.path)));
      assert.ok(shared.length > 0, `guard: the two records overlap (${shared.length} shared paths)`);
      for (const entry of shared) {
        assert.equal(lockHashes.get(slash(entry.path)), entry.hash, `${entry.path} carries the same hash in both records`);
      }
      assert.ok(
        shared.some((entry) => slash(entry.path) === ".claude/commands/aof/shatter.md"),
        "…and the edited member's claude render is one of them",
      );

      // AND THE LOCK IS TRUE OF THE DISK, not merely of a re-render — the gap the shipped manifest
      // control has by construction (it hashes its own re-render).
      for (const [rel, hash] of lockHashes) {
        let onDisk;
        try {
          onDisk = read(rel);
        } catch {
          continue;
        }
        assert.equal(hashContent(onDisk), hash, `${rel}'s recorded hash matches the file on disk`);
      }
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 10 (task 03): no new parity control is added, and every file this change lands is line-ending-pinned",
    run: () => {
      // ADR-007's Consequences is explicit: the existing pair already governs the write set and the
      // hashes, and a sibling control is what this tree keeps refusing.
      const bundleControls = readdirSync(path.join(root, "test", "arch", "bundle")).filter((name) => name.endsWith(".test.mjs"));
      // A DECLARED CEILING, never a retyped count (FF-11902): "no new parity control" is the
      // decision, so the bound may fall with a deletion and may never rise; the two controls named
      // below are the floor that keeps it non-vacuous.
      const BUNDLE_CONTROL_CEILING = 23;
      assert.ok(bundleControls.length <= BUNDLE_CONTROL_CEILING, `no new control joins test/arch/bundle — a sibling control is what this tree keeps refusing (found ${bundleControls.length}, ceiling ${BUNDLE_CONTROL_CEILING})`);
      assert.ok(bundleControls.includes("acd-bundle-manifest-hashes.test.mjs"), "…including the manifest hash control the parity claim leans on");
      assert.ok(bundleControls.includes("acd-declared-writes-include-generated-siblings.test.mjs"), "…and the declared-writes one");

      // THE SIX FILES, EACH PINNED. A CRLF-checked-out mirror committed back turns a six-file
      // change into a whole-file diff nobody reads (`01/R2` — content-addressed artifacts must pin
      // line endings or cross-platform hashes diverge).
      const six = [
        SHATTER,
        ".claude/commands/aof/shatter.md",
        ".codex/skills/aof-shatter/SKILL.md",
        ".opencode/commands/aof/shatter.md",
        "src/bundle/manifest.json",
        ".aof/aof.lock.json",
      ];
      const attrs = execFileSync("git", ["check-attr", "text", "eol", "--", ...six], { cwd: root, encoding: "utf8", maxBuffer: 1 << 24 });
      for (const rel of six) {
        assert.match(attrs, new RegExp(`${rel.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}: text: set`, "u"), `${rel} is pinned \`text=set\``);
        assert.match(attrs, new RegExp(`${rel.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}: eol: lf`, "u"), `${rel} is pinned \`eol=lf\``);
        assert.equal(read(rel).includes("\r\n"), false, `${rel} holds no CRLF on disk`);
      }
    },
  },
];
