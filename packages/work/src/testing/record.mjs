import { createHash, randomUUID } from "node:crypto";
import { copyFile, link, mkdir, mkdtemp, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { gateResult, isNotFinishedRow } from "../regression-record.mjs";

// Application composition supplies execution, graph and shared work services.
export function createTestRecord({ runBounded, reportDegrade = () => {} }) {
// THE TEST RECORD — milestone 190 / story 00 (ADR-001, ADR-002 §1, §4). FF-19001 and FF-19004 are
// its controls.
//
// A run of the suite on content that has not changed tells nobody anything new. The build
// terminator, three review lanes and the story verify each ask `aof test` the same question about
// the same diff, so a story used to pay for roughly seven runs to learn one fact. This leaf is how
// `aof test` remembers the first answer: every run it launches leaves one record, keyed to the
// exact content it ran on, and a repeat on that content is answered from the record.
//
// ── ONE WRITER, AND IT IS THE COMMAND (ADR-001 §1, FF-19001) ─────────────────────────────────
//
// The evidence is produced by the party that ran the suite, never by the party being checked —
// 96's rule, carried down to every run. So this module is the ONLY writer under
// `<git common dir>/aof/test-records/`, and nothing here takes a result from a caller: `write`
// is handed what the RUNNER observed, by `runTest`, after the runner returned.
//
// ── THE KEY IS THE CONTENT, UNTRACKED FILES INCLUDED (ADR-001 §2, FF-19004) ──────────────────
//
// m167/01 R1 is the near-miss this key exists to refuse: a stat-shaped fingerprint reused as a
// cache key served a new folder stale. So the key is the tree id git computes for the working
// tree with every untracked, non-ignored file added — built in a THROWAWAY index, because
// `git add -A` into the real one stages the operator's work (m40 R4). The throwaway starts as a
// copy of the real index so git's stat cache spares it re-hashing unchanged files.
//
// What the key does NOT see, named so it is a decision rather than a surprise: anything
// `.gitignore` excludes. A dependency changes the key through its lockfile; a hand edit inside
// `node_modules` does not, and `--fresh` is the repair for that.
//
// ── WHERE RECORDS LIVE (ADR-001 §5) ──────────────────────────────────────────────────────────
//
// Under the git COMMON dir: outside the tree, so writing one never changes a key, and shared by
// every worktree of one clone, so a review lane in a dispatched worktree is answered by a run
// its sibling made on the same content.

const VCS = "git";

// A key is a handful of sub-second git calls on any tree an inner loop runs in. A minute is a
// generous ceiling, named so there is no unbounded call.
const KEY_DEADLINE_MS = 60_000;

// The store's place under the git common dir, and how much of it is kept (ADR-001 §6). Records
// are evidence for one story's or one milestone's doors, not history: the history of a
// milestone's whole-tree runs stays in its `REGRESSION.md`.
const RECORD_DIR = Object.freeze(["aof", "test-records"]);
const RECORD_LIMIT = 200;


// How often a caller waiting on an in-flight run looks again.
const WAIT_POLL_MS = 250;

// A selection that ran everything. Spelled once, because "ran everything" and "ran these files"
// are the two shapes the match rule distinguishes.
const ALL = "all";

const posix = (file) => String(file).replaceAll("\\", "/");

// ── THE KEY ──────────────────────────────────────────────────────────────────────────────────

async function git(args, { cwd, launch, env }) {
  return await launch({ command: VCS, args, cwd, env, deadlineMs: KEY_DEADLINE_MS });
}

const answered = (observed) => observed.outcome === "exited" && observed.exitCode === 0;

// The content key for `projectRoot`, and the store it is filed under. `{ ok: false, reason }`
// outside a git repository: the run then happens exactly as it always did, and is not recorded.
async function treeKey({ projectRoot, launch = runBounded, env = process.env } = {}) {
  const located = await git(["rev-parse", "--path-format=absolute", "--git-dir", "--git-common-dir"], { cwd: projectRoot, launch, env });
  if (!answered(located)) return Object.freeze({ ok: false, reason: "no git" });
  const [gitDir, commonDir] = String(located.stdout).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!gitDir || !commonDir) return Object.freeze({ ok: false, reason: "no git" });

  // A private directory, so the throwaway index never lands inside the git directory and a
  // killed process leaves nothing there to explain.
  const scratch = await mkdtemp(path.join(os.tmpdir(), "aof-tree-key-"));
  const index = path.join(scratch, "index");
  try {
    await copyFile(path.join(gitDir, "index"), index).catch((error) => {
      // A repository with nothing staged yet has no index; an empty throwaway is the same thing.
      if (error?.code !== "ENOENT") throw error;
    });
    const keyed = { cwd: projectRoot, launch, env: { ...env, GIT_INDEX_FILE: index } };
    const added = await git(["add", "-A"], keyed);
    if (!answered(added)) return Object.freeze({ ok: false, reason: "the working tree could not be read" });
    const written = await git(["write-tree"], keyed);
    const key = String(written.stdout ?? "").trim();
    if (!answered(written) || !/^[0-9a-f]{40,64}$/u.test(key)) {
      return Object.freeze({ ok: false, reason: "the working tree could not be read" });
    }
    return Object.freeze({ ok: true, key, store: path.join(commonDir, ...RECORD_DIR) });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

// ── THE ENVIRONMENT IS PART OF THE MATCH, NOT THE KEY (ADR-001 §3) ───────────────────────────

function currentEnvironment(host = process) {
  const major = Number.parseInt(String(host.versions?.node ?? host.version ?? "").replace(/^v/u, ""), 10);
  return Object.freeze({ platform: host.platform, arch: host.arch, node: Number.isFinite(major) ? major : null });
}

const sameEnvironment = (a, b) => a?.platform === b?.platform && a?.arch === b?.arch && a?.node === b?.node;

// ── THE MATCH RULE (ADR-002 §1) ──────────────────────────────────────────────────────────────

// A selection is `"all"` or a sorted, de-duplicated list of suite files.
function selectionOf(files) {
  if (files === ALL) return ALL;
  return Object.freeze([...new Set((files ?? []).map(posix))].sort());
}

const covers = (ran, asked) => ran === ALL || (asked !== ALL && asked.every((file) => ran.includes(file)));
const identical = (ran, asked) => (ran === ALL || asked === ALL)
  ? ran === asked
  : ran.length === asked.length && ran.every((file, index) => file === asked[index]);

// Does this record answer this question? A GREEN answers anything its run covered. A RED answers
// only the identical question: a case name does not reliably name its file, so a red is never
// split, and a red answered as green for a subset is the confidently-wrong-once failure 72 exists
// to refuse. A `not-finished` answers nothing.
function recordAnswers(record, { key, environment, selection }) {
  if (record?.key !== key || !sameEnvironment(record.environment, environment)) return false;
  const ran = selectionOf(record.selected);
  const asked = selectionOf(selection);
  if (isNotFinishedRow(record)) return false;
  if (record.result === GREEN) return covers(ran, asked);
  if (record.result === RED) return identical(ran, asked);
  return false;
}

// What a run's outcome was, in the gate's own words and by its own precedence (160/ADR-006 §4):
// the gate's rows become records in 190/02 (ADR-005 §4), and two vocabularies for one result
// would be two answers. A failing case is red; a deadline, or a runner that never started, is
// `not-finished` — neither is a verdict about the code; otherwise the exit code decides.
function resultOf({ outcome, exit, failures = [] }) {
  return gateResult({ failures: failures.length, notFinished: outcome !== "exited", passed: exit === 0 });
}

const GREEN = gateResult({ passed: true });
const RED = gateResult({ passed: false });

// ── THE STORE ────────────────────────────────────────────────────────────────────────────────

// `20261109T233038039Z`: fixed width, so a name sort is a time sort.
const compactInstant = (iso) => iso.replaceAll("-", "").replaceAll(":", "").replace(".", "");

const isRecordName = (name) => name.endsWith(".json");

async function recordNames(store) {
  try {
    return (await readdir(store)).filter(isRecordName).sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

// Every record on this key, newest first. The short key in the name spares parsing the rest.
async function recordsFor(store, key) {
  const short = key.slice(0, 12);
  const names = (await recordNames(store)).filter((name) => name.includes(`-${short}-`)).reverse();
  const records = [];
  for (const name of names) {
    const record = await readJson(path.join(store, name));
    if (record?.key === key) records.push(record);
  }
  return records;
}

// The newest record that answers, or null. Newest first, so a flake that turned a green red on
// the same question answers red rather than with the older green.
async function findAnswer({ key, store, environment }, selection) {
  for (const record of await recordsFor(store, key)) {
    if (recordAnswers(record, { key, environment, selection })) return record;
  }
  return null;
}

// Write a file whole or not at all: a reader can never see half a record or half a lock. `link`
// refuses an existing target, so the same call is the lock's exclusive create.
async function placeExclusive(target, text) {
  const staged = `${target}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(staged, text, "utf8");
  try {
    await link(staged, target);
  } finally {
    await unlink(staged).catch((error) => reportDegrade("test-record-staged-cleanup", error));
  }
}

// Write one record and prune the store to its newest RECORD_LIMIT. `fields` is what the runner
// observed, assembled by `runTest` — never a result handed in from outside the command.
//
// `instant` (190/ADR-005 §4) names the instant a regression gate stamped on its row, so the gate's
// record and its `REGRESSION.md` row name one moment, and a resume finds the one from the other.
async function writeRecord({ key, store, environment }, fields, { now = () => new Date(), pid = process.pid, instant: stamped = null } = {}) {
  await mkdir(store, { recursive: true });
  const instant = stamped ?? now().toISOString();
  const stem = `${compactInstant(instant)}-${key.slice(0, 12)}-${pid}`;
  const result = resultOf(fields);
  for (let attempt = 0; ; attempt += 1) {
    const id = attempt === 0 ? stem : `${stem}-${attempt}`;
    const record = Object.freeze({
      schema: 1,
      id,
      key,
      environment,
      instant,
      scope: fields.scope,
      askedScope: fields.askedScope ?? fields.scope,
      story: fields.story ?? null,
      selected: fields.scope === ALL ? ALL : selectionOf(fields.selected),
      widened: Object.freeze([...(fields.widened ?? [])]),
      gate: fields.gate === true,
      result,
      failures: Object.freeze((fields.failures ?? []).map((entry) => Object.freeze({ case: entry.case, message: entry.message ?? "" }))),
      runner: fields.runner ?? null,
      report: fields.report ?? null,
      exit: fields.exit,
      wallMs: fields.wallMs ?? null,
      fresh: fields.fresh === true,
      // Which command ran the suite: `test`, or the regression `gate` (190/ADR-005 §4).
      source: fields.source ?? "test",
    });
    try {
      await placeExclusive(path.join(store, `${id}.json`), `${JSON.stringify(record, null, 2)}\n`);
      await prune(store);
      return record;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }
}

async function prune(store) {
  const names = await recordNames(store);
  const pruned = names.slice(0, Math.max(0, names.length - RECORD_LIMIT));
  if (pruned.length === 0) return;
  // A pruned record takes its attachments with it: a stored report whose record is gone is a
  // report nobody can find again, and a resume must refuse rather than read it.
  const stems = pruned.map((name) => name.slice(0, -".json".length));
  const attachments = (await readdir(store)).filter((name) => stems.some((stem) => name.startsWith(`${stem}.`) && name.endsWith(ATTACHMENT_SUFFIX)));
  for (const name of [...pruned, ...attachments]) {
    await unlink(path.join(store, name)).catch((error) => {
      if (error?.code !== "ENOENT") reportDegrade("test-record-prune", error);
    });
  }
}

// ── ATTACHMENTS (190/ADR-005 §2) ─────────────────────────────────────────────────────────────
//
// What a gate run that did not finish leaves for its resume: the program's own report — each
// unit, and which were killed or never started — stored beside its record and pruned with it. Not
// a `.json` name, so a record listing never mistakes one for a record.
const ATTACHMENT_SUFFIX = ".attachment";
const attachmentPath = (store, record, name) => path.join(store, `${record.id}.${name}${ATTACHMENT_SUFFIX}`);

async function writeAttachment({ store }, record, name, value) {
  await placeExclusive(attachmentPath(store, record, name), `${JSON.stringify(value)}\n`);
}

async function readAttachment({ store }, record, name) {
  return await readJson(attachmentPath(store, record, name));
}

// The newest record a regression gate wrote with this row instant, ON ANY KEY: a resume needs to
// tell "the tree changed since that run" from "that run's record is gone", and only a search that
// ignores the key can.
async function findGateRun({ store }, instant) {
  const names = (await recordNames(store)).reverse();
  for (const name of names) {
    const record = await readJson(path.join(store, name));
    if (record?.source === "gate" && record.instant === instant) return record;
  }
  return null;
}

// ── SINGLE-FLIGHT (ADR-002 §4) ───────────────────────────────────────────────────────────────
//
// The review lanes start together on one diff, so without this three runners start before any
// record exists. A caller that finds a run in flight that WOULD answer its question waits for
// that run's record instead. The wait is bounded by the toolchain's own deadline, a lock whose
// owner has gone or that is older than that deadline is reclaimed, and neither a reclaim nor a
// timeout is ever reported as a pass: the caller then runs the suite itself.

const selectionDigest = (environment, selection) => createHash("sha256")
  .update(JSON.stringify({ environment, selection: selectionOf(selection) }))
  .digest("hex")
  .slice(0, 16);

const lockPath = ({ key, store, environment }, selection) => path.join(store, `${key}.${selectionDigest(environment, selection)}.lock`);

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function locksFor({ key, store }) {
  let names;
  try {
    names = (await readdir(store)).filter((name) => name.startsWith(`${key}.`) && name.endsWith(".lock"));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const locks = [];
  for (const name of names) {
    const file = path.join(store, name);
    locks.push({ file, owner: await readJson(file) });
  }
  return locks;
}

// Take the lock for this question, or say it is taken. Never waits.
async function tryLock(ledger, selection, { now = () => new Date(), pid = process.pid } = {}) {
  await mkdir(ledger.store, { recursive: true });
  const file = lockPath(ledger, selection);
  const owner = { pid, startedAt: now().toISOString(), token: randomUUID(), key: ledger.key, environment: ledger.environment, selected: selectionOf(selection) };
  try {
    await placeExclusive(file, JSON.stringify(owner));
    return Object.freeze({ ok: true, file, token: owner.token });
  } catch (error) {
    return Object.freeze({ ok: false, code: error?.code ?? "unknown", file });
  }
}

// Release a lock only while it is still ours: a waiter may have reclaimed it as stale and taken
// it, and unlinking that one would let a third caller start a runner beside the second.
async function releaseLock(lock) {
  if (lock?.ok !== true) return;
  const owner = await readJson(lock.file);
  if (owner?.token === lock.token) await unlink(lock.file).catch((error) => reportDegrade("test-record-lock-release", error));
}

// Reclaim through rename-then-unlink, so two reclaimers cannot both win, and a lock that was
// replaced between the read and the rename is put back. `false` when the lock could not be moved
// — on Windows a file a dead process held can refuse for a while — and the caller then runs
// without single-flight rather than looping on it.
async function reclaim(file, token) {
  const tomb = `${file}.${process.pid}.${randomUUID()}.reclaimed`;
  try {
    await rename(file, tomb);
  } catch (error) {
    return error?.code === "ENOENT";
  }
  const moved = await readJson(tomb);
  // EEXIST is the ordinary race: a successor already holds the path, and its lock is the live one.
  if (moved?.token !== token) {
    await link(tomb, file).catch((error) => {
      if (error?.code !== "EEXIST") reportDegrade("test-record-lock-restore", error);
    });
  }
  await unlink(tomb).catch((error) => reportDegrade("test-record-lock-reclaim", error));
  return true;
}

const sleepFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Before a run: an answering record, or the lock for this run, or — when single-flight could not
// be had — leave to run without it. Returns `{ answer }`, `{ lock, reclaimed }` or
// `{ lock: null, reclaimed, unlocked }`.
async function acquire(ledger, selection, {
  deadlineMs,
  now = () => new Date(),
  sleep = sleepFor,
  isAlive = processAlive,
  pid = process.pid,
  pollMs = WAIT_POLL_MS,
} = {}) {
  const asked = selectionOf(selection);
  const began = now().getTime();
  let reclaimed = false;
  for (;;) {
    const answer = await findAnswer(ledger, asked);
    if (answer != null) return Object.freeze({ answer, reclaimed });

    let waiting = false;
    for (const { file, owner } of await locksFor(ledger)) {
      const age = now().getTime() - Date.parse(owner?.startedAt ?? "");
      const stale = owner == null || !isAlive(owner.pid) || !(age <= deadlineMs);
      if (stale) {
        if (!(await reclaim(file, owner?.token))) {
          return Object.freeze({ lock: null, reclaimed, unlocked: "a stale lock could not be reclaimed" });
        }
        reclaimed = true;
        continue;
      }
      if (sameEnvironment(owner.environment, ledger.environment) && covers(selectionOf(owner.selected), asked)) waiting = true;
    }

    if (!waiting) {
      const lock = await tryLock(ledger, asked, { now, pid });
      if (lock.ok) return Object.freeze({ lock, reclaimed });
      if (lock.code === "EEXIST") continue;
      return Object.freeze({ lock: null, reclaimed, unlocked: `the lock could not be taken (${lock.code})` });
    }
    if (now().getTime() - began >= deadlineMs) {
      return Object.freeze({ lock: null, reclaimed, unlocked: "the run in flight outlived the deadline" });
    }
    await sleep(pollMs);
  }
}

// The one entry `runTest` needs: the key, the store and the environment, bundled.
async function openLedger({ projectRoot, launch, env, host } = {}) {
  const keyed = await treeKey({ projectRoot, launch, env });
  if (!keyed.ok) return keyed;
  return Object.freeze({ ok: true, key: keyed.key, store: keyed.store, environment: currentEnvironment(host) });
}

return { ALL, KEY_DEADLINE_MS, RECORD_DIR, RECORD_LIMIT, WAIT_POLL_MS, acquire, currentEnvironment, findAnswer, findGateRun, openLedger, readAttachment, recordAnswers, recordsFor, releaseLock, resultOf, treeKey, tryLock, writeAttachment, writeRecord };
}
