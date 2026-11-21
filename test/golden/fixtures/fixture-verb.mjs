// test/golden/fixtures/fixture-verb.mjs — the harness's self-test subject (203/00): a small
// script that does exactly what the JSON spec file named by its one argument tells it, so the
// harness can be proven without any aof verb. The spec is a file rather than the argument
// itself, so a test changes what the verb writes without changing the step's argv.
//
//   { "project": { "<rel>": "<text>" | { "base64": "…" } },
//     "home":    { "<rel>": … },
//     "report":  ["cwd", "home", "files"],
//     "envelope": { … },
//     "stderr":  "<text>",
//     "exit":    <code> }
//
// It writes `project` files under its working directory and `home` files under
// `$AOF_GLOBAL_HOME`, prints a JSON envelope (`envelope`, plus whatever `report` names) and exits
// with `exit`.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const spec = JSON.parse(readFileSync(process.argv[2], "utf8"));

function writeAll(root, files) {
  for (const [rel, content] of Object.entries(files ?? {})) {
    const target = path.join(root, ...rel.split("/"));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, typeof content === "string" ? content : Buffer.from(content.base64, "base64"));
  }
}

function listFiles(root) {
  const found = [];
  const walk = (dir, segments) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name), [...segments, entry.name]);
      else found.push([...segments, entry.name].join("/"));
    }
  };
  walk(root, []);
  return found.sort();
}

const home = process.env.AOF_GLOBAL_HOME;
writeAll(process.cwd(), spec.project);
writeAll(home, spec.home);

const envelope = { ...(spec.envelope ?? {}) };
for (const field of spec.report ?? []) {
  if (field === "cwd") envelope.cwd = process.cwd();
  if (field === "home") envelope.home = home;
  if (field === "files") envelope.files = listFiles(process.cwd());
}
process.stdout.write(`${JSON.stringify(envelope)}\n`);
if (spec.stderr) process.stderr.write(spec.stderr);
process.exitCode = spec.exit ?? 0;
