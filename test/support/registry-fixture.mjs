// test/support/registry-fixture.mjs — the ONE way a test copies SHIPPED registry records
// (`src/bundle/loops/`) into a temp registry, and the reason it exists is a defect that has now
// been paid for three times.
//
// THE DEFECT (58/ADR-007 §3a). Three suites each carried a HAND-WRITTEN list of record filenames
// and then asserted an exact finding set or a zero-error sweep over the subset those names copy:
// `acd-anchor-taxonomy-additive` (milestone 55), `acd-watcher-taxonomy-additive` and
// `watcher-node` (milestone 57). The claim all three mean to encode is *"every record already on
// disk still parses exactly as it did"* — and that claim is only meaningful over a subset CLOSED
// under the endpoints its members declare. A subset that names `operator.md` while omitting the
// record `operator.md` points at does not measure back-compatibility; it measures the list. Each
// of 55, 57 and 58 has had to remember to extend those three lists by hand, and 58 is the
// milestone where forgetting would have been silent in a new way: the endpoint would first read
// `loop-bad-value` (an unadmitted scheme) and then `loop-graph-dangling-endpoint`, `error` either
// way, from a widening that broke nothing.
//
// THE HELPER. `shippedRegistryFiles(seeds)` takes the records a suite means to talk ABOUT and
// returns the endpoint-closed set that actually has to be on disk for them to parse as they do in
// the shipped registry. A caller asserts against `names.length` — the CLOSED set's size — rather
// than against a literal, so the day a shipped record grows an edge, the fixture grows with it and
// the suite's own count follows. `FF-5809` (`test/arch/command/acd-registry-fixture-closed.test.mjs`)
// ratchets both halves: the closure, and that no other test file reaches `src/bundle/loops/` to
// build a subset fixture by its own route.
//
// WHY IT DOES NOT IMPORT THE LOADER. Same rule `loop-registry-fixture.mjs` states in its own
// header: the SUBJECT stays in the suite. A fixture that resolved endpoints by calling
// `loadLoops` would agree with the loader by construction, and the closure it computed could
// never disagree with the model the suite then asserts over. The frontmatter reading below is
// deliberately its own four lines.
//
// WHY THE CLOSURE RULE IS SCHEME-FREE. An endpoint pulls in a record when its RAW value equals a
// record's declared `id` — which is exactly the rule `loadLoops` uses to decide whether an
// endpoint dangles, and it needs no copy of `ENDPOINT_SCHEMES` or `INTRA_REGISTRY_SCHEMES` here.
// A scheme list in a fixture is one more frozen literal to forget; `command:work:next` names no
// record's id, so it pulls in nothing, and it does so without this file knowing what a scheme is.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { withLoopRegistry } from "./loop-registry-fixture.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The shipped registry — the framework's own declaration of how it improves itself. */
export const SHIPPED_LOOPS_DIR = path.join(REPO_ROOT, "src", "bundle", "loops");

/** Every `<key>: <value>` line of a record's frontmatter block, values left as authored text. */
function frontmatterLines(text) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return [];
  return block[1]
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].trim()]);
}

/** The declared `id`, or null for a record with no frontmatter at all. */
function declaredId(text) {
  return frontmatterLines(text).find(([key]) => key === "id")?.[1] ?? null;
}

/**
 * Every inline-list entry of every key — the superset the edge keys live in. Reading ALL list
 * keys rather than a copy of `EDGE_KEYS` is the same choice the closure rule makes: a `reference:`
 * or `measurement:` entry is a pointer and names no record id, so it contributes nothing, and this
 * file does not have to be edited when a sixth edge key is added.
 */
function listEntries(text) {
  const entries = [];
  for (const [, value] of frontmatterLines(text)) {
    if (!value.startsWith("[") || !value.endsWith("]")) continue;
    for (const part of value.slice(1, -1).split(",")) {
      const trimmed = part.trim().replace(/^["']|["']$/g, "");
      if (trimmed) entries.push(trimmed);
    }
  }
  return entries;
}

/** Every `.md` record in the shipped registry, as `{ name, text, id }`, in directory order. */
export async function shippedRecords() {
  const names = (await readdir(SHIPPED_LOOPS_DIR)).filter((name) => name.endsWith(".md")).sort();
  return Promise.all(names.map(async (name) => {
    const text = await readFile(path.join(SHIPPED_LOOPS_DIR, name), "utf8");
    return { name, text, id: declaredId(text) };
  }));
}

/**
 * The ENDPOINT-CLOSED file map for a seed set of shipped record filenames.
 *
 * `seeds` may be a list of filenames or `null`/`"all"` for the whole shipped registry (which is
 * closed by construction). The returned `names` are sorted, so a suite's own count assertion is
 * over the closed set and never over the literal it typed.
 *
 * Returns `{ files, names, seeds, added }` — `added` being what the closure pulled in that the
 * caller did not name, which is what makes a fixture's growth visible in a failure message
 * instead of silent.
 */
export async function shippedRegistryFiles(seeds = null) {
  const records = await shippedRecords();
  const byName = new Map(records.map((record) => [record.name, record]));
  const byId = new Map(records.filter((record) => record.id).map((record) => [record.id, record]));
  const requested = seeds === null || seeds === "all" ? records.map((record) => record.name) : [...seeds];

  const chosen = new Map();
  const queue = [...requested];
  while (queue.length > 0) {
    const name = queue.shift();
    if (chosen.has(name)) continue;
    const record = byName.get(name);
    if (!record) throw new Error(`registry-fixture: ${name} is not a record in ${SHIPPED_LOOPS_DIR}`);
    chosen.set(name, record);
    for (const entry of listEntries(record.text)) {
      const target = byId.get(entry);
      if (target && !chosen.has(target.name)) queue.push(target.name);
    }
  }

  const names = [...chosen.keys()].sort();
  return {
    seeds: [...requested].sort(),
    names,
    added: names.filter((name) => !requested.includes(name)),
    files: Object.fromEntries(names.map((name) => [name, chosen.get(name).text])),
  };
}

/**
 * `shippedRegistryFiles` materialised into a temp workspace, with teardown — the shared
 * `loop-registry-fixture.mjs` still owning the temp directory, so there is one home for that and
 * this module adds only the closure. `run` receives the fixture plus `{ files, names, added }`.
 */
export async function withShippedRegistry(seeds, run, options = {}) {
  const closed = await shippedRegistryFiles(seeds);
  return withLoopRegistry(closed.files, (fixture) => run({ ...fixture, ...closed }), options);
}
