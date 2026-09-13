#!/usr/bin/env node
// PreToolUse guard (Bash/PowerShell) — THIS REPOSITORY'S OWN, hand-owned and unmarked.
//
// It blocks running the aof suite WITHOUT AOF_GLOBAL_HOME isolation. An unisolated
// `node scripts/test.mjs` / `node --test` / `npm test` falls back to os.homedir()/.aof —
// the machine's REAL global mesh store, shared by every project and every live daemon —
// and a passing test can silently write fixture records (node descriptors, presence,
// aof.config.json) into it, polluting a live fleet/soak. See memory:
// test-suite-can-corrupt-real-global-config.
//
// WHY IT LIVES HERE AND NOT IN THE BUNDLE (story 87). The hazard's subject is this
// repository's suite and this machine's store; a team installing aof to govern their
// work stream inherits none of it. The predicate travelled anyway and refused their own
// build command, so the framework stopped shipping it. The protection stays here.
//
// HAND-OWNED MEANS UNMARKED. The settings entry that invokes this file carries no
// `aofManaged` key, so aof neither adopts, edits, retracts nor drift-reports it — the
// ownership escape hatch 55/ADR-004 deliberately preserved. That is what makes this
// guard survive every future `aof work update`, and it is what keeps 55/FF-5505 true
// here: an unmarked entry is the operator's rule, not an untraced framework one.
//
// THE PREDICATE IS THE COMPILED ONE (55/04), not the three-regex version this tree ran
// before story 87. It judges what a command INVOKES rather than what text it contains:
// it splits the command into segments, tokenises each, steps over here-documents and
// quoted prose, and clears on an isolation prefix in any of its spellings. The weaker
// version blocked a read-only search for the suite path and the heredoc writing a
// document that quotes it.
//
// Exit 2 => the tool call is BLOCKED and this stderr is shown to Claude, which then
// re-runs the command with the AOF_GLOBAL_HOME prefix. Every undecidable/error path
// exits 0 — a guard that cannot decide gets out of the way.
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const PROTECTS = "the real ~/.aof global store from unisolated aof test runs";

function withoutHereDocuments(command) {
  let text = command.replace(/@'[^]*?'@/g, " ").replace(/@\"[^]*?\"@/g, " ");
  const lines = text.split(/\r?\n/);
  const kept = [];
  let delimiter = null;
  for (const line of lines) {
    if (delimiter != null) {
      if (line.trim() === delimiter) delimiter = null;
      continue;
    }
    kept.push(line);
    const match = /<<-?\s*['\"]?([A-Za-z_][A-Za-z0-9_]*)['\"]?/.exec(line);
    if (match) delimiter = match[1];
  }
  return kept.join("\n");
}

function segments(command) {
  const source = withoutHereDocuments(command);
  const out = [];
  let current = "";
  let quote = null;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\" && quote !== "'") {
      current += char;
      escaped = true;
      continue;
    }
    if (quote != null) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    const pair = source.slice(index, index + 2);
    if (char === ";" || char === "\n" || char === "|" || pair === "&&" || pair === "||") {
      if (current.trim()) out.push(current.trim());
      current = "";
      if (pair === "&&" || pair === "||") index += 1;
      continue;
    }
    current += char;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function tokens(segment) {
  const out = [];
  let current = "";
  let quote = null;
  let escaped = false;
  for (const char of segment) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === "\\" && quote !== "'") {
      current += char;
    } else if (quote != null) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === "'" || char === '"') {
      quote = char;
    } else if (/\s/.test(char)) {
      if (current) out.push(current), current = "";
    } else {
      current += char;
    }
  }
  if (current) out.push(current);
  return out;
}

function executableName(value) {
  return String(value ?? "").replaceAll("\\", "/").split("/").at(-1).toLowerCase();
}

function isTestInvocation(argv) {
  let index = 0;
  while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[index] ?? "")) index += 1;
  if (argv[index] === "&" || argv[index] === "env") index += 1;
  while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[index] ?? "")) index += 1;
  const executable = executableName(argv[index]);
  const args = argv.slice(index + 1);
  if (executable === "node" || executable === "node.exe") {
    if (args.includes("--test")) return true;
    const script = args.find((arg) => !arg.startsWith("-"));
    return /(?:^|\/)scripts\/test\.mjs$/i.test(String(script ?? "").replaceAll("\\", "/"));
  }
  if (["npm", "npm.cmd", "npm.exe"].includes(executable)) {
    if (/^test(?::|$)/.test(args[0] ?? "")) return true;
    return args[0] === "run" && /^test(?::|$)/.test(args[1] ?? "");
  }
  if (["pwsh", "pwsh.exe", "powershell", "powershell.exe", "bash", "sh", "cmd", "cmd.exe"].includes(executable)) {
    const commandFlag = args.findIndex((arg) => ["-c", "-lc", "-command", "/c"].includes(arg.toLowerCase()));
    // A quoted nested command is one token (`"npm test"`); an unquoted one is
    // several. Re-tokenise the joined command in either case instead of treating
    // the quoted form as an executable literally named "npm test".
    return commandFlag >= 0 && segments(args.slice(commandFlag + 1).join(" "))
      .some((nested) => isTestInvocation(tokens(nested)));
  }
  return false;
}

function segmentIsolated(argv, persistent) {
  return persistent || argv.some((token) => /^AOF_GLOBAL_HOME=/.test(token) || /^\$env:AOF_GLOBAL_HOME=/i.test(token));
}

export function unisolatedTestInvocation(command) {
  if (typeof command !== "string" || command.length === 0) return null;
  let persistentIsolation = false;
  for (const segment of segments(command)) {
    const argv = tokens(segment);
    if (/\$env:AOF_GLOBAL_HOME\s*=/i.test(segment)
      || argv.some((token) => /^\$env:AOF_GLOBAL_HOME=/i.test(token))
      || (argv[0] === "export" && /^AOF_GLOBAL_HOME=/.test(argv[1] ?? ""))) {
      persistentIsolation = true;
    }
    if (isTestInvocation(argv) && !segmentIsolated(argv, persistentIsolation)) return segment;
  }
  return null;
}

export function evaluate(payload) {
  const command = payload?.tool_input?.command;
  const blocked = unisolatedTestInvocation(command);
  if (blocked == null) return { blocked: false };
  return {
    blocked: true,
    reason:
      "BLOCKED by this repository's test-isolation guard.\n"
      + `Protects ${PROTECTS}.\n`
      + "Re-run with a throwaway global home, for example:\n"
      + `  AOF_GLOBAL_HOME=\"$(mktemp -d)\" ${blocked}\n`,
  };
}

function main() {
  let raw;
  try {
    raw = readFileSync(0, "utf8");
  } catch {
    return 0;
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return 0;
  }
  const result = evaluate(payload);
  if (!result.blocked) return 0;
  process.stderr.write(result.reason);
  return 2;
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) process.exit(main());
