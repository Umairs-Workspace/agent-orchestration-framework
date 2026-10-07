import { bundleFixtureRoot, installedBundlePath, readBundleProse } from "../support/cli-spawn.mjs";
// Story 150 — `/aof:explain` says what a work item is for, without writing anything.
//
// task 01 (the bundle ships it, read-only) and task 02 (what each answer holds). Task 00, the
// folder-path branch of `findWork`, is proven in packages/work/test/work-resolve.suite.mjs.
//
// The command is prose a session follows, so the @executable scenarios read that prose: what it
// resolves through, what it marks, what it reads per type, and what it forbids. The @manual run
// and the @uat sign-off judge real answers.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const SOURCE = "packages/core/assets/commands/explain.md";
const COPIES = [".claude/commands/aof/explain.md", ".opencode/commands/aof/explain.md", ".agents/skills/aof-explain/SKILL.md"];
const WRITE_VERBS = ["aof work run-start", "aof work status", "aof work feedback", "aof work promote", "aof work archive"];

const read = async (rel) => readBundleProse(rel, repoRoot).replace(/\r\n/g, "\n");

async function source() {
  const text = await read(SOURCE);
  const [, frontmatter = "", body = text] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text) ?? [];
  // One line per sentence is not how prose is wrapped, so every check reads it with its line
  // breaks folded to single spaces.
  return { frontmatter, body, prose: body.replace(/\s+/g, " ") };
}

const field = (frontmatter, key) => new RegExp(`^${key}:\\s*(.*)$`, "m").exec(frontmatter)?.[1]?.trim();

// A sentence ends at `.`, `!` or `?` followed by whitespace; a colon or a list does not end one.
const sentences = (prose) => prose.split(/(?<=[.!?])\s+/);
const FORBIDS = /\b(never|not|no)\b/i;

export const explainCommandTests = [
  // ------------------------------------------------ task 01 · the bundle ships it, read-only
  {
    name: "150 task 01: the bundle ships /aof:explain in every runtime, in the census, with its argument hint",
    run: async () => {
      for (const copy of COPIES) assert.ok(existsSync(installedBundlePath(copy, repoRoot)), `${copy} is rendered`);
      const dry = spawnSync(process.execPath, [cliPath, "work", "update", "--dry-run", "--json"], { cwd: bundleFixtureRoot(repoRoot), encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } });
      assert.equal(dry.status, 0, dry.stderr);
      const actions = new Map(JSON.parse(dry.stdout).actions.map((action) => [action.path, action.action]));
      for (const copy of COPIES) assert.equal(actions.get(copy), "skip", `${copy} is what a fresh render writes`);

      const descriptor = JSON.parse(await read("packages/core/assets/bundle.json"));
      const commands = descriptor.members.filter((member) => member.kind === "command").map((member) => member.id);
      assert.ok(commands.includes("explain"), "the bundle's command census names explain");
      assert.equal(field((await source()).frontmatter, "argument-hint"), '"<ref…> [--verbose]"');
    },
  },
  {
    name: "150 task 01 E1: the command can read but cannot write, and says it mints no run, moves no status and writes no file",
    run: async () => {
      const { frontmatter, prose } = await source();
      const tools = field(frontmatter, "allowed-tools").replace(/^\[|\]$/g, "").split(",").map((tool) => tool.trim());
      assert.deepEqual(tools, ["Read", "Grep", "Glob", "Bash"]);
      assert.match(prose, /mints no run, moves no status/);
      assert.match(prose, /writes no file/);
    },
  },
  {
    name: "150 task 01: a verb that writes the work tree appears only in a sentence that forbids it — every Examples row",
    run: async () => {
      const { prose } = await source();
      // The prose forbids by allowlist — the four read verbs and no other — so a write verb need
      // not be named at all (127's control keeps `aof work archive` to the two prompts that run it).
      // The allowlist sentence is what keeps this check from passing over nothing.
      assert.match(prose, /runs only the read verbs `aof work find`, `aof work doc`, `aof work list` and `aof work tasks`, and no other `aof work` verb/);
      for (const verb of WRITE_VERBS) {
        for (const sentence of sentences(prose).filter((each) => each.includes(verb))) {
          assert.match(sentence, FORBIDS, `"${verb}" appears in a sentence that does not forbid it: ${sentence}`);
        }
      }
    },
  },

  // ------------------------------------------------ task 02 · what each answer holds
  {
    name: "150 task 02 E3: every ref is resolved through aof work find --json, one at a time, in the order given; nothing is globbed",
    run: async () => {
      const { prose } = await source();
      assert.match(prose, /`aof work find "<ref>" --json`/);
      assert.match(prose, /one at a time, in the order given/);
      assert.match(prose, /Never glob the work tree for a record doc/);
    },
  },
  {
    name: "150 task 02 E4: an empty answer is reported as matching no work item, and the call goes on",
    run: async () => {
      const { prose } = await source();
      assert.match(prose, /\*\*No row:\*\* report that `<ref>` matches no work item, then go on to the next ref/);
    },
  },
  {
    name: "150 task 02 E5: a number: null row is explained and marked in the backlog; a folder path is passed to find as typed",
    run: async () => {
      const { prose } = await source();
      assert.match(prose, /A row with `number: null` is in the backlog: explain it, and mark it as in the backlog and not yet scheduled/);
      assert.match(prose, /Pass a folder path to `aof work find` \*\*as typed\*\*/);
    },
  },
  {
    name: "150 task 02 E6: more than one row lists each ref and title, explains none, and says to ask again with one ref",
    run: async () => {
      const { prose } = await source();
      assert.match(prose, /\*\*More than one row:\*\* list each row's `ref` and `title`, explain none of them, and say to ask again with one ref/);
    },
  },
  {
    name: "150 task 02 E10: an archived: true row is explained and marked archived and done",
    run: async () => {
      const { prose } = await source();
      assert.match(prose, /A row with `archived: true` is archived and done: explain it like any other item, and mark it as archived and done/);
    },
  },
  {
    name: "150 task 02 E7: the default is three to five sentences on what, who and why, read per type from the record's purpose section",
    run: async () => {
      const { prose } = await source();
      assert.match(prose, /\*\*Default \(no `--verbose`\): three to five sentences per item\*\* saying what it delivers, who it is for and why it exists/);
      for (const [type, section] of [["story", "User story"], ["milestone", "Objective"], ["spike", "Question"], ["chore", "Intent"], ["uat", "Scope"]]) {
        assert.match(prose, new RegExp(`\\| ${type} +\\| its \`## ${section}\``), `a ${type}'s purpose is read from ## ${section}`);
      }
    },
  },
  {
    name: "150 task 02 E11: a milestone's default answer counts its stories and how many are done, and names none",
    run: async () => {
      const { prose } = await source();
      assert.match(prose, /A milestone's default answer also says how many stories it groups and how many of those are done/);
      assert.match(prose, /It names none of them\./);
    },
  },
  {
    name: "150 task 02 E8: --verbose adds scope, the stories via aof work list, a story's tasks via aof work tasks, depends edges and what is open",
    run: async () => {
      const { prose } = await source();
      const verbose = prose.slice(prose.indexOf("**`--verbose`: the in-depth answer.**"));
      assert.ok(verbose.length < prose.length, "the --verbose answer is stated");
      assert.match(verbose, /its \*\*scope\*\*/);
      assert.match(verbose, /\*\*the stories it groups\*\*, read through `aof work list <ref>`.*each with its status and a one-line purpose/);
      assert.match(verbose, /for a story, \*\*its tasks\*\*, read through `aof work tasks <ref>`/);
      assert.match(verbose, /its \*\*`depends:` edges\*\*/);
      assert.match(verbose, /\*\*what is still open\*\*/);
    },
  },
  {
    name: "150 task 02 E9: an empty or placeholder purpose is reported as not written down, and nothing the record does not say is stated",
    run: async () => {
      const { prose } = await source();
      assert.match(prose, /If the purpose section is empty, or still holds the template's placeholder/);
      assert.match(prose, /report that the item has \*\*no purpose written down yet\*\*/);
      assert.match(prose, /\*\*Say only what the record says\.\*\*/);
      assert.match(prose, /Never invent one/);
    },
  },
];
