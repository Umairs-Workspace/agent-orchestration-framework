// test/support/loop/git-fake.mjs — THE GIT MODEL (milestone 160 / story 01, ADR-002): an in-memory
// repository behind the loop's exec port, for the loop suites whose subject is not git.
//
// The loop never spawns git itself: it calls `exec(args, { cwd })` and reads `{ stdout, stderr, status }`.
// This model answers that port for exactly the argv the loop sends after 160/ADR-001, in git's own
// envelope and words, and makes git's filesystem effects for real and in-process: `worktree add` writes
// the commit's files into the lane directory, `worktree remove` deletes it, `merge --ff-only` rewrites
// the files the merge changes, `merge --no-ff` writes a two-parent merge of a three-way file-map merge
// (160/08), and `status --porcelain` diffs the directory against the index and HEAD.
//
// IT REFUSES WHAT IT DOES NOT MODEL, BY NAME (ADR-002 §2). An unmodelled verb or option is a thrown
// error naming the argv — never a default answer — so a case misclassified onto the model fails loudly
// rather than passing on an answer git would not have given. FF-16002 (`test/arch/testing/
// acd-git-fake-parity.test.mjs`) holds every verb here to real git, step by step.
//
// Commits are file-map snapshots (path → bytes); refs, HEAD per worktree, the registered worktrees and
// an index per worktree are the rest of the state. Object ids are 40 hex characters, minted from a
// counter, and printed abbreviated to 7 as git prints a small repository's. No `.git` directory exists:
// a linked worktree gets the `.git` FILE git writes, pointing at a directory that is not there, so any
// git reached outside this port fails at once rather than answering for another repository.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";

const ZERO = { stdout: "", stderr: "", status: 0 };
const answer = (stdout = "", status = 0, stderr = "") => ({ stdout, stderr, status });
const fatal = (message, status = 128) => answer("", status, `fatal: ${message}\n`);
const posix = (value) => String(value).replaceAll("\\", "/");

export class GitModelRefusal extends Error {
  constructor(args, why) {
    super(`the git model does not answer \`git ${args.join(" ")}\`${why ? ` (${why})` : ""} — it models only what the loop sends through its port; run this case on real git`);
    this.code = "git-model-unmodelled";
    this.argv = [...args];
  }
}

// ── ignore rules: the subset the fixtures use, refused loudly beyond it ─────────────────────────
function ignoreRules(text) {
  const rules = [];
  for (const raw of String(text ?? "").split(/\r?\n/u)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (/[!\[\]?]|\*\*/u.test(line)) throw new Error(`the git model's .gitignore subset does not include the pattern ${JSON.stringify(line)}`);
    const dirOnly = line.endsWith("/");
    const body = line.replace(/^\/|\/$/gu, "");
    const anchored = line.startsWith("/") || body.includes("/");
    const source = body.split("*").map((part) => part.replace(/[.+^${}()|\\]/gu, "\\$&")).join("[^/]*");
    rules.push({ dirOnly, anchored, re: new RegExp(`^${source}$`, "u") });
  }
  return rules;
}

// Is `rel` (posix, relative to the worktree) ignored — itself, or under an ignored directory?
function isIgnored(rules, rel, { isDir = false } = {}) {
  const parts = rel.split("/");
  for (let depth = 1; depth <= parts.length; depth += 1) {
    const prefix = parts.slice(0, depth).join("/");
    const name = parts[depth - 1];
    const prefixIsDir = depth < parts.length || isDir;
    for (const rule of rules) {
      if (rule.dirOnly && !prefixIsDir) continue;
      if (rule.anchored ? rule.re.test(prefix) : rule.re.test(name)) return true;
    }
  }
  return false;
}

// ── pathspecs: literal paths and directories, `:(exclude)<path>` and `:(glob)**/<tail>` ─────────
function pathspecMatcher(specs, args) {
  if (specs.length === 0) return () => true;
  const include = [];
  const exclude = [];
  for (const spec of specs) {
    const magic = /^:\(([a-z]+)\)(.*)$/u.exec(spec);
    if (magic == null) { include.push(literal(spec)); continue; }
    const [, kind, rest] = magic;
    if (kind === "exclude") exclude.push(literal(rest));
    else if (kind === "glob") include.push(globSpec(rest, args));
    else throw new GitModelRefusal(args, `pathspec magic :(${kind})`);
  }
  return (rel) => (include.length === 0 || include.some((match) => match(rel))) && !exclude.some((match) => match(rel));
}
function literal(spec) {
  const clean = posix(spec).replace(/^\.\//u, "").replace(/\/+$/u, "");
  if (clean === "" || clean === ".") return () => true;
  return (rel) => rel === clean || rel.startsWith(`${clean}/`);
}
function globSpec(spec, args) {
  const tail = /^\*\*\/([^*?[\]]+)$/u.exec(spec);
  if (tail == null) throw new GitModelRefusal(args, `glob pathspec ${spec}`);
  return (rel) => rel === tail[1] || rel.endsWith(`/${tail[1]}`);
}

// ── line arithmetic for diffstats: insertions and deletions of a minimal line diff ──────────────
function lines(buffer) {
  if (buffer == null || buffer.length === 0) return [];
  return String(buffer).match(/[^\n]*\n|[^\n]+$/gu) ?? [];
}
function lineDelta(before, after) {
  const a = lines(before);
  const b = lines(after);
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix += 1;
  const x = a.slice(prefix, a.length - suffix);
  const y = b.slice(prefix, b.length - suffix);
  const row = new Array(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i += 1) {
    let diagonal = 0;
    for (let j = 1; j <= y.length; j += 1) {
      const above = row[j];
      row[j] = x[i - 1] === y[j - 1] ? diagonal + 1 : Math.max(row[j], row[j - 1]);
      diagonal = above;
    }
  }
  const common = row[y.length];
  return { insertions: y.length - common, deletions: x.length - common };
}

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
function summaryLine(changes) {
  const insertions = changes.reduce((sum, change) => sum + change.insertions, 0);
  const deletions = changes.reduce((sum, change) => sum + change.deletions, 0);
  const parts = [` ${plural(changes.length, "file changed", "files changed")}`];
  if (insertions > 0 || deletions === 0) parts.push(`${plural(insertions, "insertion(+)", "insertions(+)")}`);
  if (deletions > 0 || insertions === 0) parts.push(`${plural(deletions, "deletion(-)", "deletions(-)")}`);
  return parts.join(", ");
}
function modeLines(changes) {
  return changes.flatMap((change) => (change.kind === "create" ? [` create mode 100644 ${change.path}`] : change.kind === "delete" ? [` delete mode 100644 ${change.path}`] : []));
}
function statLines(changes) {
  const width = Math.max(...changes.map((change) => change.path.length));
  const countWidth = Math.max(...changes.map((change) => String(change.insertions + change.deletions).length));
  return changes.map((change) => {
    const total = change.insertions + change.deletions;
    const bar = `${"+".repeat(change.insertions)}${"-".repeat(change.deletions)}`;
    return ` ${change.path.padEnd(width)} | ${String(total).padStart(countWidth)}${bar === "" ? "" : ` ${bar}`}`;
  });
}

// ── the model ────────────────────────────────────────────────────────────────────────────────
export function createGitModel({ root, branch = "main" } = {}) {
  const primary = path.resolve(root);
  const commits = new Map(); // id → { id, tree: Map<path, Buffer>, parents, subject }
  const refs = new Map(); // "refs/heads/<b>" → id
  const worktrees = []; // { path, head: { ref } | { detached }, index: Map<path, Buffer> }
  let counter = 0;

  const mint = (tree, parents, subject) => {
    counter += 1;
    const id = createHash("sha1").update(`${counter}\0${parents.join(",")}\0${subject}\0${[...tree.keys()].sort().join("\0")}`).digest("hex");
    commits.set(id, { id, tree: new Map(tree), parents: [...parents], subject });
    return id;
  };
  const short = (id) => id.slice(0, 7);
  const headOf = (tree) => (tree.head.ref != null ? refs.get(tree.head.ref) ?? null : tree.head.detached);
  const treeAt = (id) => commits.get(id)?.tree ?? new Map();

  // The worktree holding `cwd`: the deepest registered path that is it or contains it.
  function worktreeFor(cwd, args) {
    const at = path.resolve(cwd ?? primary);
    let best = null;
    for (const tree of worktrees) {
      if ((at === tree.path || at.startsWith(tree.path + path.sep)) && (best == null || tree.path.length > best.path.length)) best = tree;
    }
    if (best == null) throw new GitModelRefusal(args, `${at} is in no worktree of this model`);
    return best;
  }

  function rulesFor(tree) {
    const file = path.join(tree.path, ".gitignore");
    return ignoreRules(existsSync(file) ? readFileSync(file, "utf8") : "");
  }

  // Every non-ignored file under the worktree, skipping `.git` and any other registered worktree.
  function diskFiles(tree, { ignored = false } = {}) {
    const rules = rulesFor(tree);
    const nested = worktrees.filter((other) => other !== tree && other.path.startsWith(tree.path + path.sep)).map((other) => other.path);
    const files = new Map();
    const walk = (dir, rel) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
        if (entry.name === ".git" && rel === "") continue;
        if (entry.isDirectory()) {
          if (nested.includes(full)) continue;
          if (!ignored && isIgnored(rules, childRel, { isDir: true })) continue;
          walk(full, childRel);
        } else if (entry.isFile()) {
          if (!ignored && isIgnored(rules, childRel)) continue;
          files.set(childRel, readFileSync(full));
        }
      }
    };
    walk(tree.path, "");
    return files;
  }

  const same = (a, b) => (a == null ? b == null : b != null && Buffer.compare(a, b) === 0);

  // Status entries for a worktree: `{ path, x, y }` with git's porcelain v1 columns.
  function statusEntries(tree) {
    const head = treeAt(headOf(tree));
    const disk = diskFiles(tree);
    const entries = [];
    const paths = new Set([...head.keys(), ...tree.index.keys(), ...disk.keys()]);
    for (const rel of [...paths].sort()) {
      const inHead = head.get(rel);
      const inIndex = tree.index.get(rel);
      const onDisk = disk.get(rel);
      if (inIndex == null && inHead == null) {
        if (onDisk != null) entries.push({ path: rel, x: "?", y: "?" });
        continue;
      }
      const x = inIndex == null ? "D" : inHead == null ? "A" : same(inHead, inIndex) ? " " : "M";
      const y = inIndex == null ? " " : onDisk == null ? "D" : same(inIndex, onDisk) ? " " : "M";
      if (x !== " " || y !== " ") entries.push({ path: rel, x, y });
    }
    // Porcelain v1 lists the tracked changes first, then the untracked files, each in path order.
    return [...entries.filter((entry) => entry.x !== "?"), ...entries.filter((entry) => entry.x === "?")];
  }

  // Default untracked mode: an untracked file inside a directory that holds nothing tracked is shown
  // as the outermost such directory, once, with a trailing slash.
  function collapseUntracked(tree, entries) {
    const tracked = [...tree.index.keys()];
    const shown = [];
    const seen = new Set();
    for (const entry of entries) {
      if (entry.x !== "?") { shown.push(entry); continue; }
      const parts = entry.path.split("/");
      let display = entry.path;
      for (let depth = 1; depth < parts.length; depth += 1) {
        const dir = parts.slice(0, depth).join("/");
        if (!tracked.some((rel) => rel.startsWith(`${dir}/`))) { display = `${dir}/`; break; }
      }
      if (seen.has(display)) continue;
      seen.add(display);
      shown.push({ ...entry, path: display });
    }
    const order = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    return [...shown.filter((entry) => entry.x !== "?"), ...shown.filter((entry) => entry.x === "?").sort(order)];
  }

  function resolveRev(tree, name) {
    const rev = String(name).replace(/\^\{commit\}$/u, "");
    if (rev === "HEAD") return headOf(tree);
    if (/^[0-9a-f]{40}$/u.test(rev)) return commits.has(rev) ? rev : null;
    if (refs.has(rev)) return refs.get(rev);
    if (refs.has(`refs/heads/${rev}`)) return refs.get(`refs/heads/${rev}`);
    if (/^[0-9a-f]{4,39}$/u.test(rev)) {
      const matches = [...commits.keys()].filter((id) => id.startsWith(rev));
      return matches.length === 1 ? matches[0] : null;
    }
    return null;
  }

  function ancestors(id) {
    const seen = new Set();
    const stack = id == null ? [] : [id];
    while (stack.length > 0) {
      const next = stack.pop();
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(...(commits.get(next)?.parents ?? []));
    }
    return seen;
  }

  function mergeBase(a, b) {
    const of = ancestors(a);
    const common = [...ancestors(b)].filter((id) => of.has(id));
    return common.find((id) => !common.some((other) => other !== id && ancestors(other).has(id))) ?? null;
  }

  // The per-path changes between two trees, sorted, with line counts.
  function treeChanges(from, to) {
    const paths = [...new Set([...from.keys(), ...to.keys()])].sort();
    const changes = [];
    for (const rel of paths) {
      const before = from.get(rel);
      const after = to.get(rel);
      if (same(before, after)) continue;
      changes.push({ path: rel, kind: before == null ? "create" : after == null ? "delete" : "modify", ...lineDelta(before, after) });
    }
    return changes;
  }

  function writeTree(dir, tree) {
    for (const [rel, bytes] of tree) {
      const full = path.join(dir, ...rel.split("/"));
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, bytes);
    }
  }

  // Init: an unborn `branch` with an empty index, as `git init` leaves it.
  function init() {
    if (worktrees.length > 0) throw new Error("the git model is already initialised");
    const tree = { path: primary, head: { ref: `refs/heads/${branch}` }, index: new Map() };
    worktrees.push(tree);
    return tree;
  }

  // Seed: init, then one root commit on `branch` holding every non-ignored file under the root.
  function seed(subject = "seed") {
    const tree = init();
    const files = diskFiles(tree);
    const id = mint(files, [], subject);
    refs.set(`refs/heads/${branch}`, id);
    tree.index = new Map(files);
    return id;
  }

  // ── the verbs ──
  function parse(args) {
    const config = new Map();
    let index = 0;
    while (index < args.length && String(args[index]).startsWith("-")) {
      if (args[index] === "-c") {
        const [key, ...value] = String(args[index + 1]).split("=");
        config.set(key, value.join("="));
        index += 2;
        continue;
      }
      throw new GitModelRefusal(args, `global option ${args[index]}`);
    }
    return { config, verb: args[index], rest: args.slice(index + 1).map(String) };
  }

  const verbs = {
    "rev-parse": (tree, rest, args) => {
      if (rest.length === 1 && rest[0] === "--git-common-dir") {
        return answer(tree.path === primary ? ".git\n" : `${posix(path.join(primary, ".git"))}\n`);
      }
      const quiet = rest.includes("--quiet") || rest.includes("-q");
      if (rest.includes("--verify")) {
        const names = rest.filter((arg) => !["--verify", "--quiet", "-q"].includes(arg));
        if (names.length !== 1) throw new GitModelRefusal(args);
        const id = names[0] === "MERGE_HEAD" ? null : resolveRev(tree, names[0]);
        return id == null ? answer("", 1, quiet ? "" : "fatal: Needed a single revision\n") : answer(`${id}\n`);
      }
      const out = [];
      let abbrev = false;
      for (const arg of rest) {
        if (arg === "--abbrev-ref") { abbrev = true; continue; }
        if (arg.startsWith("-")) throw new GitModelRefusal(args, `rev-parse option ${arg}`);
        if (abbrev) {
          if (arg !== "HEAD") throw new GitModelRefusal(args);
          out.push(tree.head.ref != null ? tree.head.ref.replace(/^refs\/heads\//u, "") : "HEAD");
          continue;
        }
        const id = resolveRev(tree, arg);
        if (id == null) return answer(`${out.join("")}${arg}\n`, 128, `fatal: ambiguous argument '${arg}': unknown revision or path not in the working tree.\n`);
        out.push(`${id}\n`);
      }
      return answer(out.map((line) => (line.endsWith("\n") ? line : `${line}\n`)).join(""));
    },
    "symbolic-ref": (tree, rest, args) => {
      const quiet = rest.includes("-q") || rest.includes("--quiet");
      const shortForm = rest.includes("--short");
      const names = rest.filter((arg) => !["-q", "--quiet", "--short"].includes(arg));
      if (names.length !== 1 || names[0] !== "HEAD") throw new GitModelRefusal(args);
      if (tree.head.ref == null) return answer("", 1, quiet ? "" : "fatal: ref HEAD is not a symbolic ref\n");
      return answer(`${shortForm ? tree.head.ref.replace(/^refs\/heads\//u, "") : tree.head.ref}\n`);
    },
    "merge-base": (tree, rest, args) => {
      const ancestorCheck = rest[0] === "--is-ancestor";
      const names = ancestorCheck ? rest.slice(1) : rest;
      if (names.length !== 2 || names.some((name) => name.startsWith("-"))) throw new GitModelRefusal(args);
      const [a, b] = names.map((name) => resolveRev(tree, name));
      if (a == null || b == null) return fatal(`Not a valid object name ${a == null ? names[0] : names[1]}`);
      if (ancestorCheck) return answer("", ancestors(b).has(a) ? 0 : 1);
      const base = mergeBase(a, b);
      return base == null ? answer("", 1) : answer(`${base}\n`);
    },
    "show-ref": (tree, rest, args) => {
      if (rest.length !== 3 || rest[0] !== "--verify" || rest[1] !== "--quiet") throw new GitModelRefusal(args);
      return answer("", refs.has(rest[2]) ? 0 : 1);
    },
    "rev-list": (tree, rest, args) => {
      if (rest.length !== 2 || rest[0] !== "--count" || !rest[1].includes("..")) throw new GitModelRefusal(args);
      const [from, to] = rest[1].split("..").map((name) => resolveRev(tree, name));
      if (from == null || to == null) return fatal(`bad revision '${rest[1]}'`);
      const excluded = ancestors(from);
      return answer(`${[...ancestors(to)].filter((id) => !excluded.has(id)).length}\n`);
    },
    worktree: (tree, rest, args) => {
      const [sub, ...options] = rest;
      if (sub === "list") {
        if (options.length !== 1 || options[0] !== "--porcelain") throw new GitModelRefusal(args);
        return answer(worktrees.map((entry) => [
          `worktree ${posix(entry.path)}`,
          `HEAD ${headOf(entry)}`,
          entry.head.ref != null ? `branch ${entry.head.ref}` : "detached",
          "",
        ].join("\n")).join("\n") + "\n");
      }
      if (sub === "add") return worktreeAdd(tree, options, args);
      if (sub === "remove") {
        const force = options[0] === "--force";
        const target = force ? options.slice(1) : options;
        if (target.length !== 1) throw new GitModelRefusal(args);
        const full = path.resolve(tree.path, target[0]);
        const lane = worktrees.find((entry) => entry.path === full && entry.path !== primary);
        if (lane == null) return fatal(`'${target[0]}' is not a working tree`);
        if (!force && statusEntries(lane).length > 0) return fatal(`'${target[0]}' contains modified or untracked files, use --force to delete it`);
        rmSync(full, { recursive: true, force: true });
        worktrees.splice(worktrees.indexOf(lane), 1);
        return ZERO;
      }
      if (sub === "prune") {
        if (options.length !== 0) throw new GitModelRefusal(args);
        for (const entry of [...worktrees]) if (entry.path !== primary && !existsSync(entry.path)) worktrees.splice(worktrees.indexOf(entry), 1);
        return ZERO;
      }
      throw new GitModelRefusal(args);
    },
    branch: (tree, rest, args) => {
      if (rest.length !== 2 || rest[0] !== "-d") throw new GitModelRefusal(args);
      const ref = `refs/heads/${rest[1]}`;
      if (!refs.has(ref)) return answer("", 1, `error: branch '${rest[1]}' not found\n`);
      const holder = worktrees.find((entry) => entry.head.ref === ref);
      if (holder != null) return answer("", 1, `error: cannot delete branch '${rest[1]}' used by worktree at '${posix(holder.path)}'\n`);
      const id = refs.get(ref);
      if (!ancestors(headOf(tree)).has(id)) return answer("", 1, `error: the branch '${rest[1]}' is not fully merged\n`);
      refs.delete(ref);
      return answer(`Deleted branch ${rest[1]} (was ${short(id)}).\n`);
    },
    status: (tree, rest, args) => {
      const known = ["--porcelain", "--untracked-files=all"];
      const at = rest.indexOf("--");
      const flags = at < 0 ? rest : rest.slice(0, at);
      if (!flags.includes("--porcelain") || flags.some((flag) => !known.includes(flag))) throw new GitModelRefusal(args);
      const match = pathspecMatcher(at < 0 ? [] : rest.slice(at + 1), args);
      let entries = statusEntries(tree).filter((entry) => match(entry.path));
      if (!flags.includes("--untracked-files=all")) entries = collapseUntracked(tree, entries);
      return answer(entries.map((entry) => `${entry.x}${entry.y} ${entry.path}\n`).join(""));
    },
    add: (tree, rest, args) => {
      const all = rest.length === 1 && rest[0] === "-A";
      if (!all && rest[0] !== "--") throw new GitModelRefusal(args);
      const specs = all ? [] : rest.slice(1);
      const match = pathspecMatcher(specs, args);
      const disk = diskFiles(tree);
      const candidates = new Set([...disk.keys(), ...tree.index.keys()].filter((rel) => match(rel)));
      if (!all && candidates.size === 0) return fatal(`pathspec '${specs[0]}' did not match any files`);
      for (const rel of candidates) {
        if (disk.has(rel)) tree.index.set(rel, disk.get(rel));
        else tree.index.delete(rel);
      }
      return ZERO;
    },
    reset: (tree, rest, args) => {
      if (rest[0] !== "-q" || rest[1] !== "--") throw new GitModelRefusal(args);
      const match = pathspecMatcher(rest.slice(2), args);
      const head = treeAt(headOf(tree));
      for (const rel of new Set([...head.keys(), ...tree.index.keys()])) {
        if (!match(rel)) continue;
        if (head.has(rel)) tree.index.set(rel, head.get(rel));
        else tree.index.delete(rel);
      }
      return ZERO;
    },
    rm: (tree, rest, args) => {
      const at = rest.indexOf("--");
      const flags = rest.slice(0, at);
      if (at < 0 || flags.join(" ") !== "-r --cached -q --ignore-unmatch") throw new GitModelRefusal(args);
      const match = pathspecMatcher(rest.slice(at + 1), args);
      for (const rel of [...tree.index.keys()]) if (match(rel)) tree.index.delete(rel);
      return ZERO;
    },
    clean: (tree, rest, args) => {
      const at = rest.indexOf("--");
      if (at < 0 || rest.slice(0, at).join(" ") !== "-f -x -q") throw new GitModelRefusal(args);
      const match = pathspecMatcher(rest.slice(at + 1), args);
      for (const rel of diskFiles(tree, { ignored: true }).keys()) {
        if (tree.index.has(rel) || !match(rel)) continue;
        unlinkSync(path.join(tree.path, ...rel.split("/")));
      }
      return ZERO;
    },
    "check-ignore": (tree, rest, args) => {
      if (rest[0] !== "--") throw new GitModelRefusal(args);
      const rules = rulesFor(tree);
      const ignored = rest.slice(1).filter((rel) => isIgnored(rules, posix(rel)));
      return answer(ignored.map((rel) => `${rel}\n`).join(""), ignored.length > 0 ? 0 : 1);
    },
    diff: (tree, rest, args) => {
      const at = rest.indexOf("--");
      const flags = at < 0 ? rest : rest.slice(0, at);
      const match = pathspecMatcher(at < 0 ? [] : rest.slice(at + 1), args);
      const head = treeAt(headOf(tree));
      if (flags.join(" ") === "--cached --name-only") {
        return answer(treeChanges(head, tree.index).filter((change) => match(change.path)).map((change) => `${change.path}\n`).join(""));
      }
      const three = /^HEAD\.\.\.(.+)$/u.exec(flags[2] ?? "");
      if (flags.length === 3 && flags[0] === "--name-only" && flags[1] === "--no-renames" && three != null) {
        const other = resolveRev(tree, three[1]);
        if (other == null) return fatal(`ambiguous argument '${flags[2]}'`);
        const base = mergeBase(headOf(tree), other);
        return answer(treeChanges(treeAt(base), treeAt(other)).filter((change) => match(change.path)).map((change) => `${change.path}\n`).join(""));
      }
      if (flags.join(" ") === "--numstat HEAD" && at >= 0) {
        const disk = diskFiles(tree);
        const tracked = new Map([...new Set([...head.keys(), ...tree.index.keys()])].map((rel) => [rel, disk.get(rel)]));
        for (const [rel, bytes] of [...tracked]) if (bytes == null) tracked.delete(rel);
        return answer(treeChanges(head, tracked).filter((change) => match(change.path)).map((change) => `${change.insertions}\t${change.deletions}\t${change.path}\n`).join(""));
      }
      throw new GitModelRefusal(args);
    },
    commit: (tree, rest, args, config) => {
      const at = rest.indexOf("--");
      const flags = at < 0 ? rest : rest.slice(0, at);
      let message = null;
      let quiet = false;
      for (let i = 0; i < flags.length; i += 1) {
        if (flags[i] === "--no-verify") continue;
        if (flags[i] === "-q") { quiet = true; continue; }
        if (flags[i] === "-m") { message = flags[i + 1]; i += 1; continue; }
        throw new GitModelRefusal(args, `commit option ${flags[i]}`);
      }
      if (message == null) throw new GitModelRefusal(args, "a commit with no -m");
      if (at >= 0) {
        // `commit -- <pathspec>` takes the WORKING-TREE contents of the matched paths into the index.
        const match = pathspecMatcher(rest.slice(at + 1), args);
        const disk = diskFiles(tree);
        for (const rel of new Set([...disk.keys(), ...tree.index.keys()])) {
          if (!match(rel)) continue;
          if (disk.has(rel)) tree.index.set(rel, disk.get(rel));
          else tree.index.delete(rel);
        }
      }
      const parent = headOf(tree);
      const changes = treeChanges(treeAt(parent), tree.index);
      if (changes.length === 0) return answer(`On branch ${tree.head.ref?.replace(/^refs\/heads\//u, "") ?? "HEAD"}\nnothing to commit, working tree clean\n`, 1);
      const subject = String(message).split("\n")[0];
      const id = mint(tree.index, parent == null ? [] : [parent], subject);
      if (tree.head.ref != null) refs.set(tree.head.ref, id); else tree.head.detached = id;
      const abbrev = Number(config.get("core.abbrev") ?? 7);
      const label = tree.head.ref != null ? tree.head.ref.replace(/^refs\/heads\//u, "") : "detached HEAD";
      return answer(quiet ? "" : [
        `[${label}${parent == null ? " (root-commit)" : ""} ${id.slice(0, Math.max(7, Math.min(40, abbrev)))}] ${subject}`,
        summaryLine(changes),
        ...modeLines(changes),
        "",
      ].join("\n"));
    },
    merge: (tree, rest, args) => {
      if (rest[0] === "--no-ff") return mergeNoFf(tree, rest, args);
      if (rest.length !== 2 || rest[0] !== "--ff-only") throw new GitModelRefusal(args);
      const target = resolveRev(tree, rest[1]);
      if (target == null) return answer("", 1, `merge: ${rest[1]} - not something we can merge\n`);
      const current = headOf(tree);
      if (ancestors(current).has(target)) return answer("Already up to date.\n");
      if (!ancestors(target).has(current)) return fatal("Not possible to fast-forward, aborting.");
      const changes = treeChanges(treeAt(current), treeAt(target));
      const dirty = new Set(statusEntries(tree).map((entry) => entry.path));
      const blocked = changes.map((change) => change.path).filter((rel) => dirty.has(rel));
      if (blocked.length > 0) {
        return answer(`Updating ${short(current)}..${short(target)}\n`, 1, `error: Your local changes to the following files would be overwritten by merge:\n${blocked.map((rel) => `\t${rel}\n`).join("")}Please commit your changes or stash them before you merge.\nAborting\n`);
      }
      for (const change of changes) {
        const full = path.join(tree.path, ...change.path.split("/"));
        if (change.kind === "delete") rmSync(full, { force: true });
        else { mkdirSync(path.dirname(full), { recursive: true }); writeFileSync(full, treeAt(target).get(change.path)); }
      }
      if (tree.head.ref != null) refs.set(tree.head.ref, target); else tree.head.detached = target;
      tree.index = new Map(treeAt(target));
      return answer([`Updating ${short(current)}..${short(target)}`, "Fast-forward", ...statLines(changes), summaryLine(changes), ...modeLines(changes), ""].join("\n"));
    },
  };

  // `merge --no-ff [--no-edit] [-m <message>] <commit>` (160/ADR-009 §1): a merge commit with two
  // parents over a three-way merge of file maps. A path takes the side that changed it; a path BOTH sides
  // changed is not modelled — git would merge it line by line or stop on a conflict — so it is refused,
  // naming the path, before anything is written.
  function mergeNoFf(tree, rest, args) {
    let message = null;
    const positional = [];
    for (let i = 1; i < rest.length; i += 1) {
      if (rest[i] === "--no-edit") continue;
      if (rest[i] === "-m") { message = rest[i + 1]; i += 1; continue; }
      if (rest[i].startsWith("-")) throw new GitModelRefusal(args, `merge option ${rest[i]}`);
      positional.push(rest[i]);
    }
    if (positional.length !== 1) throw new GitModelRefusal(args);
    const target = resolveRev(tree, positional[0]);
    if (target == null) return answer("", 1, `merge: ${positional[0]} - not something we can merge\n`);
    const current = headOf(tree);
    if (ancestors(current).has(target)) return answer("Already up to date.\n");
    const base = treeAt(mergeBase(current, target));
    const ours = treeAt(current);
    const theirs = treeAt(target);
    const merged = new Map();
    for (const rel of [...new Set([...base.keys(), ...ours.keys(), ...theirs.keys()])].sort()) {
      const o = base.get(rel);
      const a = ours.get(rel);
      const b = theirs.get(rel);
      let take;
      if (same(a, b) || same(b, o)) take = a;
      else if (same(a, o)) take = b;
      else throw new GitModelRefusal(args, `both sides changed ${rel} since the merge base`);
      if (take != null) merged.set(rel, take);
    }
    const changes = treeChanges(ours, merged);
    const dirty = new Set(statusEntries(tree).map((entry) => entry.path));
    const blocked = changes.map((change) => change.path).filter((rel) => dirty.has(rel));
    if (blocked.length > 0) {
      return answer("", 2, `error: Your local changes to the following files would be overwritten by merge:\n${blocked.map((rel) => `\t${rel}\n`).join("")}Please commit your changes or stash them before you merge.\nAborting\nMerge with strategy ort failed.\n`);
    }
    for (const change of changes) {
      const full = path.join(tree.path, ...change.path.split("/"));
      if (change.kind === "delete") rmSync(full, { force: true });
      else { mkdirSync(path.dirname(full), { recursive: true }); writeFileSync(full, merged.get(change.path)); }
    }
    const subject = String(message ?? `Merge branch '${positional[0]}'`).split("\n")[0];
    const id = mint(merged, [current, target], subject);
    if (tree.head.ref != null) refs.set(tree.head.ref, id); else tree.head.detached = id;
    tree.index = new Map(merged);
    return answer(["Merge made by the 'ort' strategy.", ...(changes.length > 0 ? [...statLines(changes), summaryLine(changes)] : []), ...modeLines(changes), ""].join("\n"));
  }

  function worktreeAdd(tree, options, args) {
    let newBranch = null;
    let detach = false;
    const positional = [];
    for (let i = 0; i < options.length; i += 1) {
      if (options[i] === "-b") { newBranch = options[i + 1]; i += 1; continue; }
      if (options[i] === "--detach") { detach = true; continue; }
      if (options[i].startsWith("-")) throw new GitModelRefusal(args, `worktree add option ${options[i]}`);
      positional.push(options[i]);
    }
    if (positional.length !== 2) throw new GitModelRefusal(args);
    const [where, commitish] = positional;
    const full = path.resolve(tree.path, where);
    if (existsSync(full) && readdirSync(full).length > 0) return fatal(`'${where}' already exists`);
    let head;
    let id;
    let preparing;
    if (newBranch != null) {
      if (refs.has(`refs/heads/${newBranch}`)) return fatal(`a branch named '${newBranch}' already exists`);
      id = resolveRev(tree, commitish);
      if (id == null) return fatal(`invalid reference: ${commitish}`);
      refs.set(`refs/heads/${newBranch}`, id);
      head = { ref: `refs/heads/${newBranch}` };
      preparing = `Preparing worktree (new branch '${newBranch}')\n`;
    } else if (detach) {
      id = resolveRev(tree, commitish);
      if (id == null) return fatal(`invalid reference: ${commitish}`);
      head = { detached: id };
      preparing = `Preparing worktree (detached HEAD ${short(id)})\n`;
    } else {
      const ref = `refs/heads/${commitish}`;
      if (!refs.has(ref)) throw new GitModelRefusal(args, "a worktree add of anything but a local branch, -b or --detach");
      const holder = worktrees.find((entry) => entry.head.ref === ref);
      if (holder != null) return fatal(`'${commitish}' is already used by worktree at '${posix(holder.path)}'`);
      id = refs.get(ref);
      head = { ref };
      preparing = `Preparing worktree (checking out '${commitish}')\n`;
    }
    mkdirSync(full, { recursive: true });
    writeTree(full, treeAt(id));
    writeFileSync(path.join(full, ".git"), `gitdir: ${posix(path.join(primary, ".git", "worktrees", path.basename(full)))}\n`);
    worktrees.push({ path: full, head, index: new Map(treeAt(id)) });
    return answer(`HEAD is now at ${short(id)} ${commits.get(id).subject}\n`, 0, preparing);
  }

  async function exec(args, options = {}) {
    const list = (args ?? []).map(String);
    const { config, verb, rest } = parse(list);
    const handler = verbs[verb];
    if (typeof handler !== "function") throw new GitModelRefusal(list);
    const tree = worktreeFor(options.cwd, list);
    return handler(tree, rest, list, config);
  }

  return Object.freeze({
    root: primary,
    exec,
    init,
    seed,
    verbs: Object.freeze(Object.keys(verbs)),
    head: (cwd = primary) => headOf(worktreeFor(cwd, ["rev-parse", "HEAD"])),
    parents: (id) => [...(commits.get(id)?.parents ?? [])],
    branches: () => [...refs.keys()].map((ref) => ref.replace(/^refs\/heads\//u, "")),
  });
}

// THE REGISTRY of live models by root, so a fixture helper handed a root can find its port.
const models = new Map();
export function registerGitModel(model) { models.set(path.resolve(model.root), model); return model; }
export function forgetGitModel(model) { models.delete(path.resolve(model.root)); }
export function gitModelFor(cwd) {
  const at = path.resolve(cwd);
  let best = null;
  for (const [root, model] of models) if ((at === root || at.startsWith(root + path.sep)) && (best == null || root.length > best.root.length)) best = model;
  return best;
}
