// test/golden/fixtures/user-edit.mjs — a user's edit between two verbs (204/ADR-001 §5). A golden
// step names this script as its `command`, so a scenario can run the real apply, edit a file as a
// user would, and run the real clean.
//
//   node user-edit.mjs <path> --append <text>
//   node user-edit.mjs <path> --prepend <text>
//
// It edits one file under its working directory, prints nothing, and exits 1 naming the path when
// the file is absent: an edit to a missing file is a broken scenario, never a new file.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [rel, mode, text] = process.argv.slice(2);
if (!rel || !["--append", "--prepend"].includes(mode) || text === undefined) {
  process.stderr.write("usage: user-edit.mjs <path> --append|--prepend <text>\n");
  process.exit(2);
}
const target = path.resolve(rel);
if (!existsSync(target)) {
  process.stderr.write(`user-edit: ${rel} does not exist\n`);
  process.exit(1);
}
const current = readFileSync(target, "utf8");
writeFileSync(target, mode === "--append" ? current + text : text + current);
