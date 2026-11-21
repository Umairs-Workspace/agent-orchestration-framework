// The `work-update` golden lane (203/ADR-006 §2, §3). Both scenarios start from a committed
// `work-init` baseline rebuilt into a real tree (placeholders filled, install-record hashes
// recomputed), edit it, and run one `work update`. Their starting files are a function of the run,
// because the rebuild needs the run's own paths and values.
//
// Idempotence (ADR-006 §1) is not a scenario here: it is a property of every `work-init` scenario,
// checked in `work-update.test.mjs` from that lane's own list.
import { rebuild, rehash } from "../support/golden/baseline-store.mjs";
import workInit from "./work-init.lane.mjs";

const update = [{ argv: ["work", "update", "--json"], exit: 0 }];
const LOCK = "project/.aof/aof.lock.json";

export const startingFiles = (tree) => Object.fromEntries([...tree].filter(([key]) => key.startsWith("project/")).map(([key, text]) => [key.slice("project/".length), text]));

export const rebuildInit = (scenarioId, values) => rebuild({ lanes: [workInit], laneId: "work-init", scenarioId, values });

// The user's edits over the rebuilt `customised` tree (E4, E5). They are made after the rebuild and
// never re-hashed: an edit the lock does not know is what makes update report drift.
export const USER_LINE = "Mine: run the linter first.";
export function customisedStart(values) {
  const tree = rebuildInit("customised", values);
  tree.set("project/.claude/commands/aof/refine.md", `${tree.get("project/.claude/commands/aof/refine.md")}${USER_LINE}\n`);
  tree.set("project/.claude/commands/release.md", "# Release\n");
  return tree;
}

// Three edits that model an older release (E7 to E9), each with its lock entry made to match, so
// update reads the tree as a previous release's output rather than as a user's edit. All three are
// on `.claude/` paths: Codex outputs carry recorded ownership, which a mutation would meet.
export const OLDER_RELEASE = Object.freeze({
  // E7: one member's file holds one line of older text. The line is chosen by position, never by
  // its words, so an edit to refine's prose moves the baselines and never breaks this mutation.
  older(tree) {
    const key = "project/.claude/commands/aof/refine.md";
    const lines = tree.get(key).split("\n");
    const at = lines.findLastIndex((line) => line.trim() !== "");
    lines[at] = "An older release's last line.";
    tree.set(key, lines.join("\n"));
  },
  // E8: a command aof no longer ships, present with its lock entry.
  retired(tree, lock) {
    tree.set("project/.claude/commands/aof/retired.md", "old\n");
    const template = lock.work.files.find((entry) => entry.path === ".claude/commands/aof/refine.md");
    lock.work.files.push({ ...template, path: ".claude/commands/aof/retired.md", resource: { id: "retired", kind: "command" } });
  },
  // E9: a current member absent from disk and from the lock.
  absent(tree, lock) {
    tree.delete("project/.claude/agents/aof-qa.md");
    lock.work.files = lock.work.files.filter((entry) => entry.path !== ".claude/agents/aof-qa.md");
  },
});

// The rebuilt `default` tree with the named older-release mutations applied, re-hashed so each
// lock entry matches its (older) file.
export function olderStart(values, names = Object.keys(OLDER_RELEASE)) {
  const tree = rebuildInit("default", values);
  const lock = JSON.parse(tree.get(LOCK));
  for (const name of names) OLDER_RELEASE[name](tree, lock);
  tree.set(LOCK, `${JSON.stringify(lock, null, 2)}\n`);
  return rehash(tree, `the older-release tree (${names.join(", ")})`);
}

export default Object.freeze({
  id: "work-update",
  scenarios: Object.freeze([
    { id: "customised-update", base: "work-init/customised", files: (values) => startingFiles(customisedStart(values)), steps: update },
    { id: "upgrade", base: "work-init/default", files: (values) => startingFiles(olderStart(values)), steps: update },
  ]),
});
