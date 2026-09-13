// test/support/loop-registry-fixture.mjs — the shared temp-workspace + loop-record
// builder for milestone 52 / story 05's behavioural suites. THREE importers, measured:
// tasks 00 (`test/loop/work-loops-record.test.mjs`), 01 (`…-value…`) and 03 (`…-commands…`).
// Task 05's ledger names this path as a constant only — it asserts the file exists and that it is
// correctly NOT swept as a suite — and imports nothing from it.
//
// WHAT THIS IS FOR. The subject of every suite in 52/05 is a PUBLIC surface driven over
// records on disk — `loadLoops(workDir)`, the three `work:loops` verbs — so every case needs
// the same three things: a throwaway `<work.dir>/loops/` directory, records whose frontmatter
// is authored EXACTLY as a `.feature` line writes it, and a teardown that runs even when an
// assertion throws. That is all this module does. It deliberately does NOT import
// `src/work/loops.mjs`: the SUBJECT stays in the suite, so a reader of a test can see the
// loader being called, and no fixture can quietly become the thing under test
// (`00_loader-record-suite.feature`: "every subject is the exported `loadLoops`").
//
// THE RECORD SPEC. A file's content is either a raw string (written verbatim — the
// unparseable / hand-shaped cases) or a SPEC object rendered against one of three bases:
//
//   loopRecord()      a `kind: loop` record carrying all eleven required keys, whose values
//                     are chosen so the record loads with ZERO findings — not even an honesty
//                     warn. That matters: it is what lets a case author ONE slip and assert
//                     the exact finding array for that record, instead of asserting a slip
//                     against a background of prose-only/owner-unknown warns.
//   actorRecord()     a `kind: actor` record (`id`/`kind`/`title`/`ground`), likewise clean.
//   identityRecord()  `id`/`kind`/`title` only — the base the kind-suspension cases need,
//                     where any control key present would add findings of its own.
//
// Every spec field is an authored LINE, never a parsed value: `fields: { cadence: "hourly" }`
// writes `cadence: hourly`, `fields: { owner: null }` DROPS the line, `fields: { actuator: "" }`
// writes `actuator:` with nothing after the colon, and `after: { reference: ["  - module:a#b"] }`
// puts raw continuation lines immediately below a key. A case therefore reads like the feature
// row it mechanises, and the loader's own parser decides what the line means — which is the
// point, since half these cases are about lines the parser DROPS.
//
// Names may be nested ("archive/old-loop.md"): the directory is created and NOT descended by
// the loader, which is a case in its own right.
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { spawnSyncHardened } from "./cli-spawn.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The loader module's absolute path — used for the fresh-process leg, never imported here. */
export const LOADER_MODULE_PATH = path.join(REPO_ROOT, "src", "work", "loops.mjs");

// The finding-free field blocks, in the schema's own authored order. Exported so a suite can
// state which value it is overriding and a reader can see what "otherwise valid" means.
export const CLEAN_LOOP_FIELDS = Object.freeze([
  ["controlled", "attempt count"],
  ["reference", "[module:src/run-store.mjs#isRetryable]"],
  ["measurement", "[module:src/run-store.mjs#attempts]"],
  ["actuator", "[command:work:next]"],
  ["cadence", "event:per-item"],
  ["ceiling", "none"],
  ["owner", "actor:product-owner"],
  ["optimizing", "false"],
].map((pair) => Object.freeze(pair)));

export const CLEAN_ACTOR_FIELDS = Object.freeze([
  ["ground", "exogenous"],
].map((pair) => Object.freeze(pair)));

/** A `kind: loop` record spec. Every field is an authored line; see the header. */
export function loopRecord(overrides = {}) {
  return { base: "loop", ...overrides };
}

/** A `kind: actor` record spec. */
export function actorRecord(overrides = {}) {
  return { base: "actor", ...overrides };
}

/** An `id`/`kind`/`title`-only record spec — no control keys, so no findings but the authored one. */
export function identityRecord(overrides = {}) {
  return { base: "identity", ...overrides };
}

/**
 * Render one record spec to its file text. `stem` comes from the FILENAME, never from the
 * spec, so a case cannot accidentally agree with the id rule it is testing.
 */
export function renderRecord(spec, stem) {
  if (typeof spec === "string") return spec;
  const lines = spec.lines ? [...spec.lines] : defaultLines(spec, stem);
  const body = spec.body ?? `# ${stem}\n`;
  const text = `---\n${lines.map((line) => `${line}\n`).join("")}---\n${body}`;
  // `leadingBlank` is the "--- block preceded by a blank line" record: still a frontmatter
  // block to a human, and unparseable to the loader, which anchors at the FIRST line.
  return spec.leadingBlank ? `\n${text}` : text;
}

function defaultLines(spec, stem) {
  const base = spec.base ?? "loop";
  const scheme = base === "actor" ? "actor" : "loop";
  const identity = [
    ["id", Object.hasOwn(spec, "id") ? spec.id : `${scheme}:${stem}`],
    ["kind", Object.hasOwn(spec, "kind") ? spec.kind : (base === "identity" ? "loop" : base)],
    ["title", Object.hasOwn(spec, "title") ? spec.title : stem],
  ];
  const defaults = base === "actor" ? CLEAN_ACTOR_FIELDS : base === "identity" ? [] : CLEAN_LOOP_FIELDS;
  const overrides = spec.fields ?? {};
  const known = new Set([...identity, ...defaults].map(([key]) => key));
  const authored = [];
  for (const [key, value] of [...identity, ...defaults]) {
    const line = Object.hasOwn(overrides, key) ? overrides[key] : value;
    if (line === null) continue;
    authored.push([key, line]);
  }
  // Keys the base does not carry are appended in the order the case declared them — edge keys,
  // `ground` on a loop, `status`, `depends`, anything the vocabulary has never heard of.
  for (const [key, value] of Object.entries(overrides)) {
    if (known.has(key) || value === null) continue;
    authored.push([key, value]);
  }
  const after = spec.after ?? {};
  const lines = [];
  for (const [key, value] of authored) {
    lines.push(value === "" ? `${key}:` : `${key}: ${value}`);
    if (after[key]) lines.push(...after[key]);
  }
  lines.push(...(spec.extraLines ?? []));
  return lines;
}

async function writeAll(loopsDir, files) {
  // Sequential ON PURPOSE: entry order is creation order, which is the only lever a case has
  // for "the answer does not vary with the order the directory was written".
  for (const [name, spec] of Object.entries(files ?? {})) {
    const target = path.join(loopsDir, ...name.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, renderRecord(spec, path.basename(name, ".md")), "utf8");
  }
}

/**
 * Materialise a temp workspace. `files === null` means the workspace exists but `loops/` does
 * NOT — the absent-registry case, which is a different fact from an empty directory.
 *
 * Returns { workDir, loopsDir, pathOf, write, cleanup }. `workDir` is what the loader takes;
 * `pathOf(name)` is the OS-native absolute path a finding/node will carry, so a case compares
 * against a JOIN and never against a literal relative string (Windows).
 */
export async function makeLoopRegistry(files, { label = null, parent = "work" } = {}) {
  const temp = await mkdtemp(path.join(os.tmpdir(), "aof-loop-registry-"));
  const workDir = path.join(temp, "work");
  const loopsDir = path.join(temp, parent, "loops");
  await mkdir(workDir, { recursive: true });
  if (files !== null) {
    await mkdir(loopsDir, { recursive: true });
    await writeAll(loopsDir, files);
  }
  return {
    label,
    temp,
    workDir,
    loopsDir,
    files: files ?? {},
    pathOf: (name) => path.join(loopsDir, ...name.split("/")),
    /** Materialise more files later — including the `loops/` directory itself. */
    write: async (more) => {
      await mkdir(loopsDir, { recursive: true });
      await writeAll(loopsDir, more ?? {});
    },
    cleanup: () => rm(temp, { recursive: true, force: true }),
  };
}

/** makeLoopRegistry + guaranteed teardown. The suite loads the registry itself. */
export async function withLoopRegistry(files, run, options = {}) {
  const fixture = await makeLoopRegistry(files, options);
  try {
    return await run(fixture);
  } finally {
    await fixture.cleanup();
  }
}

/** A workspace with NO `loops/` directory at all. */
export async function withoutLoopRegistry(run, options = {}) {
  return withLoopRegistry(null, run, options);
}

/** The same file map, written in the reverse order — creation order, not read order. */
export function reversedFiles(files) {
  return Object.fromEntries(Object.entries(files).reverse());
}

/**
 * Load a registry in a FRESH PROCESS and return both the raw stdout bytes and the parsed
 * value. `expression` is evaluated over the local `model` binding (e.g. "model.findings",
 * "model.nodes.map(n => n.id)"); `env` overlays the child's environment, which is how a case
 * asks for a different host locale. Raw bytes are returned because "byte-identical" is the
 * claim, and a deep-equal of two parses would not decide it.
 */
export function loadLoopsInFreshProcess(workDir, { expression = "model", env = {} } = {}) {
  const loaderUrl = pathToFileURL(LOADER_MODULE_PATH).href;
  const script =
    `import { loadLoops } from ${JSON.stringify(loaderUrl)};` +
    `const model = await loadLoops(${JSON.stringify(workDir)});` +
    `process.stdout.write(JSON.stringify(${expression}));`;
  const result = spawnSyncHardened(process.execPath, ["--input-type=module", "--eval", script], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    const detail = result.stderr || result.error?.message || "(no stderr)";
    throw new Error(`fresh-process load failed (status ${result.status}): ${detail}`);
  }
  return { stdout: result.stdout, value: JSON.parse(result.stdout) };
}

// ——— readers over a loaded model ———————————————————————————————————————————————
// Findings carry `{code, severity, path, message}` and nothing else, so a per-record view is
// built by PATH. Every one of these takes the absolute path a fixture's `pathOf` produced.

export function findingsFor(model, filePath) {
  return model.findings.filter((finding) => finding.path === filePath);
}

export function codesFor(model, filePath) {
  return findingsFor(model, filePath).map((finding) => finding.code);
}

export function messagesFor(model, filePath) {
  return findingsFor(model, filePath).map((finding) => finding.message);
}

export function nodeFor(model, filePath) {
  return model.nodes.find((node) => node.path === filePath) ?? null;
}

export function idsOf(model) {
  return model.nodes.map((node) => node.id);
}

/** The names in a file map whose spec is a `kind: actor` record — the non-vacuity check. */
export function actorRecordNames(files) {
  return Object.entries(files ?? {})
    .filter(([, spec]) => typeof spec === "object" && spec !== null && spec.base === "actor")
    .map(([name]) => name);
}
