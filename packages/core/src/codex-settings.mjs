// Codex coauthored outputs: compare only recorded fragments, preserve their neighbours.
// Planning is read-only. Every apply door uses the render-plan preflight before writing.
import path from "node:path";
import { lstat, readFile, realpath } from "node:fs/promises";
import { hashContent, readLock, writeLock } from "./lock.mjs";
import { runtimeAssetRoot } from "./model.mjs";
import { writeText } from "@aof/foundation/fs";
import { CODEX_PROFILE } from "@aof/execution/codex-protocol-profile";

const START = "<!-- aof-managed:begin -->";
const END = "<!-- aof-managed:end -->";
const portable = value => String(value).replaceAll("\\", "/");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const protectedKey = keys => {
  const field = keys[0] === "profiles" ? keys[2] : keys[0];
  return /^(?:projects|profile|sandbox|sandbox_mode|sandbox_workspace_write|approval_policy|permissions|trust|auth|auth_file|api_key|credentials|allow_managed_hooks_only)$/u.test(field ?? "");
};

export function codexOwnershipBaseline(lock) {
  return lock ? { ...lock, files: (lock.files ?? []).filter(entry => entry.runtime === "codex") } : null;
}

export function codexSharedOutput(output) {
  const name = portable(output.path);
  return output.runtime === "codex" && (name.endsWith("/config.toml") || name.endsWith("/hooks.json") || path.basename(name) === "AGENTS.md");
}

// A lane inherits only recorded AOF fragments, never the operator's neighbours.
// Read every source and preflight every destination before the first write.
export async function prepareCodexWorktree(projectRoot, worktree) {
  if (path.resolve(projectRoot) === path.resolve(worktree)) return;
  const sourceLock = await readLock(path.join(projectRoot, ".aof/aof.lock.json"));
  const entries = [...(sourceLock?.files ?? []), ...(sourceLock?.work?.files ?? [])].filter(entry => entry.runtime === "codex");
  if (entries.length === 0) throw Object.assign(new Error("No lock-owned Codex assets are available for the worktree"), { code: "runtime-assets-unavailable" });
  const destinationLock = await readLock(path.join(worktree, ".aof/aof.lock.json"));
  const prior = new Map([...(destinationLock?.files ?? []), ...(destinationLock?.work?.files ?? [])].map(entry => [portable(entry.path), entry]));
  const outputs = [];
  await checkCodexTarget({ path: ".aof/aof.lock.json", absolutePath: path.join(worktree, ".aof/aof.lock.json") }, { targetDir: worktree });
  for (const entry of entries) {
    const source = { ...entry, absolutePath: path.resolve(projectRoot, entry.path) };
    await checkCodexTarget(source, { targetDir: projectRoot });
    let current;
    try { current = await readFile(source.absolutePath, "utf8"); }
    catch (error) { if (error.code !== "ENOENT") throw error; throw refusal(source, "recorded source asset is missing", "runtime-asset-missing"); }
    let content = current;
    if (entry.ownership?.kind === "guidance") {
      const start = current.indexOf(START), end = current.indexOf(END);
      const finish = end + END.length + (current[end + END.length] === "\r" ? 2 : current[end + END.length] === "\n" ? 1 : 0);
      if (start < 0 || end < start || current.indexOf(START, start + START.length) >= 0 || current.indexOf(END, end + END.length) >= 0 || hashContent(current.slice(start, finish)) !== entry.ownership.hash) throw refusal(source, "source guidance drifted");
      content = current.slice(start + START.length, end).replace(/^\r?\n/u, "");
    } else if (entry.ownership?.kind === "toml") {
      const found = tomlIndex(source, current);
      const sections = new Map();
      for (const [key, hash] of Object.entries(entry.ownership.entries ?? {})) {
        const owned = found.entries.get(key);
        if (!owned || hashContent(owned.raw) !== hash || protectedKey(owned.keys)) throw refusal(source, "source settings drifted or contain protected keys");
        const table = JSON.stringify(owned.keys.slice(0, -1));
        const lines = sections.get(table) ?? [];
        lines.push(owned.raw.trimEnd()); sections.set(table, lines);
      }
      content = [...sections].sort(([a], [b]) => JSON.parse(a).length - JSON.parse(b).length).map(([table, lines]) => {
        const keys = JSON.parse(table);
        return (keys.length ? `[${keys.map(key => JSON.stringify(key)).join(".")}]\n` : "") + lines.join("\n") + "\n";
      }).join("\n");
    } else if (entry.ownership?.kind === "hooks") {
      const found = parseHooks(source, current), hooks = {};
      for (const [event, hashes] of Object.entries(entry.ownership.groups ?? {})) {
        const selected = (found.hooks?.[event] ?? []).filter(group => hashes.includes(hashContent(JSON.stringify(group))));
        if (selected.length !== hashes.length) throw refusal(source, "source hooks drifted");
        hooks[event] = selected;
      }
      content = `${JSON.stringify({ hooks }, null, 2)}\n`;
    } else if (hashContent(current) !== entry.hash) throw refusal(source, "source exclusive output drifted");
    let output = { ...entry, content, absolutePath: path.resolve(worktree, entry.path) };
    await checkCodexTarget(output, { targetDir: worktree });
    let existing;
    try { existing = await readFile(output.absolutePath, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const recorded = existing === undefined ? null : prior.get(portable(entry.path));
    if (codexSharedOutput(output)) output = await mergeCodexOutput(output, recorded);
    else if (existing !== undefined && (recorded?.runtime !== "codex" || hashContent(existing) !== recorded.hash || existing !== content)) throw refusal(output, "worktree output is edited or unowned");
    outputs.push({ ...output, hash: hashContent(output.content) });
  }
  for (const output of outputs) await writeText(output.absolutePath, output.content);
  const copied = new Map(outputs.map(({ absolutePath, content, ...entry }) => [portable(entry.path), entry]));
  const inWork = new Set([...(sourceLock.work?.files ?? []), ...(destinationLock?.work?.files ?? [])].map(entry => portable(entry.path)));
  const accounted = new Set();
  const merge = (existing, work) => {
    const entries = existing.map(entry => { const key = portable(entry.path); accounted.add(key); return copied.get(key) ?? entry; });
    for (const [key, entry] of copied) if (!accounted.has(key) && inWork.has(key) === work) { entries.push(entry); accounted.add(key); }
    return entries;
  };
  const files = merge(destinationLock?.files ?? [], false);
  const work = destinationLock?.work == null && !outputs.some(entry => inWork.has(portable(entry.path))) ? undefined : { ...(destinationLock?.work ?? {}), files: merge(destinationLock?.work?.files ?? [], true) };
  await writeLock(path.join(worktree, ".aof/aof.lock.json"), { ...(destinationLock ?? {}), version: sourceLock.version, files, ...(work === undefined ? {} : { work }) });
}

function refusal(output, message, code = "codex-output-conflict") {
  const error = new Error(`${code}: ${output.path}: ${message}`);
  error.code = code;
  error.path = output.path;
  return error;
}

// Check both lexical containment and every existing filesystem component. A junction or
// symlink cannot turn a safe-looking relative output into a write outside the chosen root.
export async function checkCodexTarget(output, { targetDir = process.cwd(), global = false } = {}) {
  const root = global ? runtimeAssetRoot("codex", output.resource?.kind, { global }) : path.resolve(targetDir);
  const absolute = path.resolve(output.absolutePath);
  const relative = path.relative(root, absolute);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw refusal(output, "target escapes the configured root", "codex-target-outside-root");
  }
  if (!global && path.resolve(root, output.path) !== absolute) throw refusal(output, "logical and physical targets disagree", "codex-target-outside-root");
  const reserved = /^(?:auth(?:\.[^/]*)?|credentials(?:\.[^/]*)?|trusted[^/]*|hook[-_]trust[^/]*)$/iu;
  if (portable(relative).split("/").some(component => reserved.test(component))) throw refusal(output, "authentication and trust files are operator-owned");
  let component = root;
  for (const segment of relative.split(path.sep)) {
    component = path.join(component, segment);
    try {
      const stat = await lstat(component);
      if (stat.isSymbolicLink()) throw refusal(output, "target traverses a symlink or junction", "codex-target-outside-root");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  // Resolve the root itself, without inspecting any credential store.
  try { await realpath(root); } catch (error) { if (error.code !== "ENOENT") throw error; }
}

export async function mergeCodexOutput(output, prior) {
  let current;
  try { current = await readFile(output.absolutePath, "utf8"); }
  catch (error) { if (error.code !== "ENOENT") throw error; current = ""; }
  let merged;
  const name = portable(output.path);
  if (name.endsWith("/config.toml")) merged = mergeToml(output, current, prior);
  else if (name.endsWith("/hooks.json")) merged = mergeHooks(output, current, prior);
  else merged = mergeGuidance(output, current, prior);
  return { ...output, ...merged, hash: hashContent(merged.content) };
}

function mergeGuidance(output, current, prior) {
  const block = output.content ? `${START}\n${output.content.trimEnd()}\n${END}\n` : "";
  const start = current.indexOf(START);
  const end = current.indexOf(END);
  let prefix = current;
  let suffix = "";
  if (start >= 0 || end >= 0) {
    if (start < 0 || end < start || current.indexOf(START, start + START.length) >= 0 || current.indexOf(END, end + END.length) >= 0) throw refusal(output, "invalid or repeated AOF guidance block");
    const finish = end + END.length + (current[end + END.length] === "\r" ? 2 : current[end + END.length] === "\n" ? 1 : 0);
    const found = current.slice(start, finish);
    if (prior?.ownership?.kind !== "guidance" || hashContent(found) !== prior.ownership.hash) throw refusal(output, "edited or unowned AOF guidance block");
    prefix = current.slice(0, start);
    suffix = current.slice(finish);
  } else if (prior?.ownership?.kind === "guidance") {
    throw refusal(output, "the recorded AOF guidance block was removed");
  } else if (prior) {
    if (hashContent(current) !== prior.hash) throw refusal(output, "legacy AOF guidance was modified");
    prefix = "";
  }
  if (prefix && !prefix.endsWith("\n")) prefix += "\n";
  return { content: prefix + block + suffix, ownership: block ? { kind: "guidance", hash: hashContent(block) } : null };
}

function parseHooks(output, text) {
  let value;
  try { value = text ? JSON.parse(text) : {}; }
  catch { throw refusal(output, "invalid existing hooks JSON", "codex-hooks-unparseable"); }
  if (!value || typeof value !== "object" || Array.isArray(value) || (value.hooks !== undefined && (!value.hooks || typeof value.hooks !== "object" || Array.isArray(value.hooks)))) throw refusal(output, "hooks must be a JSON object", "codex-hooks-unparseable");
  for (const groups of Object.values(value.hooks ?? {})) if (!Array.isArray(groups) || groups.some(group => !group || !Array.isArray(group.hooks))) throw refusal(output, "invalid hook matcher group", "codex-hooks-unparseable");
  return value;
}

function mergeHooks(output, current, prior) {
  const found = parseHooks(output, current);
  const wanted = parseHooks(output, output.content);
  const unsupportedEvents = Object.keys(wanted.hooks ?? {}).filter(event => !CODEX_PROFILE.hookEvents.includes(event));
  for (const event of unsupportedEvents) delete wanted.hooks[event];
  const recorded = prior?.ownership?.groups ?? {};
  if (prior && !prior.ownership && hashContent(current) !== prior.hash) throw refusal(output, "legacy hook file was modified");
  const next = structuredClone(found);
  next.hooks ??= {};
  const groups = {};
  for (const event of new Set([...Object.keys(recorded), ...Object.keys(wanted.hooks ?? {})])) {
    const existing = [...(next.hooks[event] ?? [])];
    if (prior && !prior.ownership) existing.length = 0;
    for (const hash of recorded[event] ?? []) {
      const index = existing.findIndex(group => hashContent(JSON.stringify(group)) === hash);
      if (index < 0) throw refusal(output, `AOF ${event} hook was edited or removed`);
      existing.splice(index, 1);
    }
    const desired = wanted.hooks?.[event] ?? [];
    if (desired.some(group => existing.some(other => same(group, other)))) throw refusal(output, `unowned ${event} hook collides with a requested hook`);
    next.hooks[event] = [...existing, ...desired];
    if (desired.length) groups[event] = desired.map(group => hashContent(JSON.stringify(group)));
  }
  return { content: same(found, next) ? current : `${JSON.stringify(next, null, 2)}\n`, ownership: { kind: "hooks", groups },
    // Installation never grants project/hook trust. Supported event names come
    // from the pinned native profile; execution still requires native review.
    activation: Object.keys(groups).length ? "requires-native-hook-review" : "inactive-unsupported-profile",
    profile: CODEX_PROFILE.name, active: false, unsupportedEvents };
}

// A conservative, lossless TOML index. Only the text of owned statements is edited;
// unfamiliar syntax refuses rather than reserializing or guessing at user values.
function tomlIndex(output, text) {
  const statements = [];
  let begin = 0, quote = "", triple = false, escaped = false, comment = false;
  const brackets = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (comment) { if (char !== "\n") continue; comment = false; }
    else if (quote) {
      if (escaped) { escaped = false; continue; }
      if (quote === '"' && char === "\\") { escaped = true; continue; }
      if (!triple && char === "\n") throw refusal(output, "unterminated TOML string", "codex-toml-unparseable");
      if (char === quote && (!triple || text.slice(i, i + 3) === quote.repeat(3))) { if (triple) i += 2; quote = ""; triple = false; }
      continue;
    } else {
      if (char === "#") { comment = true; continue; }
      if (char === '"' || char === "'") { quote = char; triple = text.slice(i, i + 3) === char.repeat(3); if (triple) i += 2; continue; }
      if (char === "[" || char === "{") brackets.push(char);
      if (char === "]" || char === "}") { if (brackets.pop() !== (char === "]" ? "[" : "{")) throw refusal(output, "unbalanced TOML delimiters", "codex-toml-unparseable"); }
    }
    if (char === "\n" && brackets.length === 0) { statements.push({ start: begin, end: i + 1, raw: text.slice(begin, i + 1) }); begin = i + 1; }
  }
  if (quote || brackets.length) throw refusal(output, "unterminated TOML value", "codex-toml-unparseable");
  if (begin < text.length) statements.push({ start: begin, end: text.length, raw: text.slice(begin) });
  const entries = new Map(), tables = new Map();
  let table = [];
  for (const statement of statements) {
    const meaningful = stripTomlComments(statement.raw).trim();
    if (!meaningful) continue;
    if (meaningful.startsWith("[")) {
      const array = meaningful.startsWith("[[");
      if (array) throw refusal(output, "array tables require an explicit native configuration merge", "codex-toml-unparseable");
      const ending = array ? "]]" : "]";
      if (!meaningful.endsWith(ending)) throw refusal(output, "invalid TOML table", "codex-toml-unparseable");
      table = tomlKey(output, meaningful.slice(array ? 2 : 1, -ending.length));
      const key = JSON.stringify(table);
      if ([...entries.values()].some(entry => entry.keys.length <= table.length && entry.keys.every((part, index) => table[index] === part))) throw refusal(output, "TOML table conflicts with a value", "codex-toml-unparseable");
      if (!array && tables.has(key)) throw refusal(output, "duplicate TOML table", "codex-toml-unparseable");
      tables.set(key, statement);
      statement.table = table;
      continue;
    }
    const match = /^((?:"(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+)(?:\s*\.\s*(?:"(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+))*)\s*=\s*([\s\S]+)$/u.exec(meaningful);
    if (!match || !validTomlValue(match[2].trim())) throw refusal(output, "invalid or unsupported TOML statement", "codex-toml-unparseable");
    const keys = [...table, ...tomlKey(output, match[1])];
    const key = JSON.stringify(keys);
    if ([...entries.values()].some(entry => entry.keys.slice(0, Math.min(entry.keys.length, keys.length)).every((part, index) => keys[index] === part))
      || [...tables.keys()].some(other => { const pieces = JSON.parse(other); return keys.length <= pieces.length && keys.every((part, index) => pieces[index] === part); })) throw refusal(output, "duplicate or conflicting TOML key", "codex-toml-unparseable");
    entries.set(key, { ...statement, keys, value: match[2].trim() });
  }
  return { entries, tables, statements };
}

function stripTomlComments(text) {
  let result = "", quote = "", triple = false, escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (!quote && char === "#") { while (i < text.length && text[i] !== "\n") i++; result += "\n"; continue; }
    result += char;
    if (escaped) { escaped = false; continue; }
    if (quote === '"' && char === "\\") { escaped = true; continue; }
    if (quote) { if (char === quote && (!triple || text.slice(i, i + 3) === quote.repeat(3))) { if (triple) { result += char.repeat(2); i += 2; } quote = ""; triple = false; } }
    else if (char === '"' || char === "'") { quote = char; triple = text.slice(i, i + 3) === char.repeat(3); if (triple) { result += char.repeat(2); i += 2; } }
  }
  return result;
}

function tomlKey(output, text) {
  const parts = [], token = /\s*("(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+)\s*/y;
  let offset = 0;
  while (offset < text.length) {
    token.lastIndex = offset;
    const match = token.exec(text);
    if (!match || (/^["']/u.test(match[1]) && !validTomlString(match[1]))) throw refusal(output, "invalid or unsupported TOML key", "codex-toml-unparseable");
    const value = match[1];
    parts.push(value.startsWith('"') ? decodeTomlString(value.slice(1, -1)) : value.startsWith("'") ? value.slice(1, -1) : value);
    offset = token.lastIndex;
    if (offset === text.length) break;
    if (text[offset++] !== "." || offset === text.length) throw refusal(output, "invalid TOML key", "codex-toml-unparseable");
  }
  if (!parts.length) throw refusal(output, "empty TOML key", "codex-toml-unparseable");
  return parts;
}

function decodeTomlString(text) {
  return text.replace(/\\(?:u([0-9A-Fa-f]{4})|U([0-9A-Fa-f]{8})|([btnfr"\\]))/gu, (_, small, large, escape) =>
    small || large ? String.fromCodePoint(parseInt(small ?? large, 16)) : ({ b: "\b", t: "\t", n: "\n", f: "\f", r: "\r", '"': '"', "\\": "\\" })[escape]);
}

function validTomlString(value) {
  const literal = value.startsWith("'");
  const multiline = value.startsWith(literal ? "'''" : '"""');
  const delimiter = (literal ? "'" : '"').repeat(multiline ? 3 : 1);
  if (value.length < delimiter.length * 2 || !value.endsWith(delimiter)) return false;
  const body = value.slice(delimiter.length, -delimiter.length);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(body) || (!multiline && /[\r\n]/u.test(body))) return false;
  if (literal) return !body.includes(delimiter);
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '"') {
      if (!multiline || body.slice(i, i + 3) === '"""') return false;
    }
    if (body[i] !== "\\") continue;
    const match = /^\\(?:[btnfr"\\]|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/u.exec(body.slice(i));
    if (match) {
      if (/^\\[uU]/u.test(match[0])) {
        const code = parseInt(match[0].slice(2), 16);
        if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return false;
      }
      i += match[0].length - 1;
    } else {
      const continuation = multiline && /^\\[ \t]*\r?\n[ \t\r\n]*/u.exec(body.slice(i));
      if (!continuation) return false;
      i += continuation[0].length - 1;
    }
  }
  return true;
}

function validTomlValue(value) {
  if (/^(?:true|false|[+-]?(?:inf|nan)|[+-]?(?:0|[1-9](?:_?\d)*)(?:\.(?:\d(?:_?\d)*))?(?:[eE][+-]?\d(?:_?\d)*)?|0x[0-9A-Fa-f](?:_?[0-9A-Fa-f])*|0o[0-7](?:_?[0-7])*|0b[01](?:_?[01])*)$/u.test(value)) return true;
  // Dates are not emitted by AOF's native config renderer. Refuse unfamiliar
  // temporal syntax rather than accepting a malformed operator value.
  if (value.startsWith('"') || value.startsWith("'")) return validTomlString(value);
  if ((value.startsWith("[") && value.endsWith("]")) || (value.startsWith("{") && value.endsWith("}"))) {
    const items = splitTomlItems(value.slice(1, -1));
    if (value.startsWith("[")) {
      if (items.at(-1) === "") items.pop();
      return items.every(item => item && validTomlValue(item));
    }
    if (items.length === 1 && !items[0]) return true;
    const keys = new Set();
    return items.every(item => {
      const match = /^((?:"(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+)(?:\s*\.\s*(?:"(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+))*)\s*=\s*([\s\S]+)$/u.exec(item);
      if (!match || !validTomlValue(match[2].trim())) return false;
      let parts;
      try { parts = tomlKey({ path: "inline table" }, match[1]); } catch { return false; }
      if ([...keys].some(key => { const prior = JSON.parse(key); return prior.slice(0, Math.min(prior.length, parts.length)).every((part, index) => parts[index] === part); })) return false;
      keys.add(JSON.stringify(parts)); return true;
    });
  }
  return false;
}

function splitTomlItems(value) {
  const items = [];
  let start = 0, depth = 0, quote = "", triple = false, escaped = false;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (escaped) { escaped = false; continue; }
    if (quote === '"' && char === "\\") { escaped = true; continue; }
    if (quote) { if (char === quote && (!triple || value.slice(i, i + 3) === quote.repeat(3))) { if (triple) i += 2; quote = ""; triple = false; } continue; }
    if (char === '"' || char === "'") { quote = char; triple = value.slice(i, i + 3) === char.repeat(3); if (triple) i += 2; continue; }
    if (char === "[" || char === "{") depth++;
    if (char === "]" || char === "}") depth--;
    if (char === "," && depth === 0) { items.push(value.slice(start, i).trim()); start = i + 1; }
  }
  items.push(value.slice(start).trim());
  return items;
}

function mergeToml(output, current, prior) {
  const found = tomlIndex(output, current);
  const wanted = tomlIndex(output, output.content);
  const recorded = { ...(prior?.ownership?.entries ?? {}) };
  const recordedTables = { ...(prior?.ownership?.tables ?? {}) };
  if (prior && !prior.ownership) {
    if (hashContent(current) !== prior.hash) throw refusal(output, "legacy AOF configuration was modified");
    for (const [key, entry] of found.entries) recorded[key] = hashContent(entry.raw);
    for (const [key, header] of found.tables) if (!protectedKey(JSON.parse(key))) recordedTables[key] = hashContent(header.raw);
  }
  const edits = [], owned = {}, additions = new Map();
  const ownedTables = {};
  for (const [key, hash] of Object.entries(recordedTables)) {
    const header = found.tables.get(key);
    if (!header || hashContent(header.raw) !== hash) throw refusal(output, "an AOF-owned TOML table was edited or removed");
    const parts = JSON.parse(key);
    const beneath = entry => parts.every((part, index) => entry.keys[index] === part);
    const stillDesired = [...wanted.entries.values()].some(beneath);
    const operatorValues = [...found.entries].some(([entryKey, entry]) => beneath(entry)
      && (!Object.hasOwn(recorded, entryKey) || protectedKey(entry.keys)));
    if (!stillDesired && !operatorValues) edits.push({ start: header.start, end: header.end, text: "" });
    else if (stillDesired) ownedTables[key] = hash;
  }
  for (const [key, hash] of Object.entries(recorded)) {
    const entry = found.entries.get(key);
    if (!entry || hashContent(entry.raw) !== hash) throw refusal(output, "an AOF-owned TOML setting was edited or removed");
    if (protectedKey(entry.keys)) continue;
    if (!wanted.entries.has(key)) edits.push({ start: entry.start, end: entry.end, text: "" });
  }
  for (const [key, desired] of wanted.entries) {
    if (protectedKey(desired.keys)) throw refusal(output, "authentication, trust and execution access settings cannot be managed");
    if (desired.keys[0] === "mcp_servers") {
      const server = desired.keys.slice(0, 2);
      const belongs = entry => server.every((part, index) => entry.keys[index] === part);
      const userServer = [...found.entries.values()].some(belongs) || found.tables.has(JSON.stringify(server));
      const ownedServer = Object.keys(recorded).some(record => server.every((part, index) => JSON.parse(record)[index] === part));
      if (userServer && !ownedServer) throw refusal(output, `unowned MCP entry ${server.join(".")} collides with the requested target`);
    }
    const existing = found.entries.get(key);
    if (existing && !Object.hasOwn(recorded, key)) throw refusal(output, `unowned TOML entry ${desired.keys.join(".")} collides with the requested target`);
    if (existing) {
      const replacement = same(existing.value, desired.value) ? existing.raw : desired.raw;
      edits.push({ start: existing.start, end: existing.end, text: replacement });
      owned[key] = hashContent(replacement);
    } else {
      const table = desired.keys.slice(0, -1);
      if (table.some(part => part.startsWith("@"))) throw refusal(output, "new array-table settings require an explicit native configuration merge");
      const tableKey = JSON.stringify(table);
      const list = additions.get(tableKey) ?? [];
      list.push(desired.raw.endsWith("\n") ? desired.raw : desired.raw + "\n");
      additions.set(tableKey, list);
      owned[key] = hashContent(list.at(-1));
    }
  }
  for (const [tableKey, lines] of additions) {
    const table = JSON.parse(tableKey);
    const header = found.tables.get(tableKey);
    if (table.length === 0 || header) {
      const after = header ? header.end : 0;
      const nextTable = found.statements.find(statement => statement.table && statement.start >= after);
      const position = nextTable?.start ?? current.length;
      edits.push({ start: position, end: position, text: (position > 0 && current[position - 1] !== "\n" ? "\n" : "") + lines.join("") });
    } else {
      edits.push({ start: current.length, end: current.length, text: `${current && !current.endsWith("\n") ? "\n" : ""}\n[${table.map(part => /^[A-Za-z0-9_-]+$/u.test(part) ? part : JSON.stringify(part)).join(".")}]\n${lines.join("")}` });
      ownedTables[tableKey] = null;
    }
  }
  let content = current;
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end)) content = content.slice(0, edit.start) + edit.text + content.slice(edit.end);
  const merged = tomlIndex(output, content); // refuse a conflicting parent table before mutation
  for (const key of Object.keys(ownedTables)) ownedTables[key] = hashContent(merged.tables.get(key).raw);
  return { content, ownership: { kind: "toml", entries: owned, tables: ownedTables } };
}

export function codexJournalPath(targetDir) {
  return path.join(path.resolve(targetDir), ".aof", "aof.apply-journal.json");
}

export async function readCodexJournal(targetDir) {
  return await readLock(codexJournalPath(targetDir));
}

export async function recordCodexApply(actions) {
  const journals = new Map();
  for (const action of actions) {
    if (!action.journalPath || !["create", "update", "skip"].includes(action.action)) continue;
    const entries = journals.get(action.journalPath) ?? [];
    entries.push({ path: action.path, runtime: action.runtime, resource: action.resource, hash: action.hash, ...(action.ownership ? { ownership: action.ownership } : {}) });
    journals.set(action.journalPath, entries);
  }
  // Intent is durable BEFORE any target write. Recovery only recognizes matching
  // journal hashes; this never turns a coincidental matching unowned file into ours.
  for (const [journalPath, files] of journals) {
    const intent = { version: 1, files };
    if (!same(await readLock(journalPath), intent)) await writeLock(journalPath, intent);
  }
}
