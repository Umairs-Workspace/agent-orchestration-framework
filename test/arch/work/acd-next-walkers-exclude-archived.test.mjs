// FF-12706 — milestone 127 / ADR-002 §1–§3: THE SCHEDULING WALKERS FILTER THROUGH THE ONE
// PREDICATE; THE RESOLVING READERS DO NOT.
//
// `isLiveStreamRow` (`src/work.mjs`) is the only place `number` and `archived` are read together
// as a scheduling question. Two kinds of reader hang off it, and they must not drift:
//   · the walkers that answer "what is next" — `nextWork`, `listStream`'s default path, and
//     `recent` through `work:list` — REFERENCE the predicate (asserted textually) and, driven
//     over the three-root fixture, return no backlog and no archived row;
//   · the readers that answer "what is this ref" — `findWork`, `validateWork`, `src/work/doctor.mjs`
//     — contain NO `archived` filter, and driven over the same fixture `findWork("05")` answers
//     the archived row with `archived: true`.
// The loop has no walk of its own: `src/commands/loop.mjs` and `src/work/loop.mjs` import none
// of the four disk readers from `src/work.mjs`, so its only views of the stream are the
// registered `work:next` and `work:list`, which filter.
//
// The `.archived` member token appears in `src/**` only in `src/work.mjs`, and there only inside
// the bodies of `isLiveStreamRow`, `listItems`, `listStream` and `findWork` — so a status-based
// or location-based exclusion cannot grow in a second module without failing here.
//
// Red probes (task 05): `.filter((row) => !row.archived)` on `findWork`'s match set fails the
// textual leg naming `findWork` AND the fixture leg (`findWork("05")` empty); dropping the
// predicate from `nextWork`'s driver walk fails the textual leg naming `nextWork` AND the
// fixture leg (an archived or backlog ref in the ready set).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { stripComments, functionBody, blankStringLiterals } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import { findWork, listStream, nextWork } from "../../../src/work.mjs";
import { withThreeRoots } from "../../work/stream/work-backlog-archive-enumerate.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WORK = path.join(repoRoot, "src", "work.mjs");

const DISK_READERS = ["listItems", "listStream", "findWork", "nextWork"];
// A member access, not a spread: `...archived` is a spread of a local, `row.archived` a read.
const ARCHIVED_MEMBER_RE = /(?<!\.)\.archived\b/g;
// A `.filter(…)` whose argument reads `archived` — the callback's own parameter list is one nested
// paren group (`.filter((row) => !row.archived)`), so one level of nesting is admitted — or a
// status test standing in for the location.
const ARCHIVED_FILTER_RE = /\.filter\((?:[^()]|\([^()]*\))*archived|status\s*===\s*"done"/;

const bodyOf = (code, name) => functionBody(code, `function ${name}(`) ?? functionBody(code, `async function ${name}(`);

// The disk readers `rel` imports from src/work.mjs. Reads the import CLAUSE of a `work.mjs`
// import — the specifier is matched, never captured, so this is not a second specifier
// extractor (FF-11901 · 121: the one home is `importSpecifiers`, which answers specifiers, not
// the bindings a clause names). `importSpecifiers` is what proves the file reaches work.mjs at all.
function importsDiskReaderFromWork(stripped, rel) {
  const dir = path.posix.dirname(rel);
  const reachesWork = importSpecifiers(stripped).some((entry) => path.posix.normalize(path.posix.join(dir, entry.specifier)) === "src/work.mjs");
  if (!reachesWork) return [];
  const hits = [];
  for (const match of stripped.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*\bwork\.mjs["']/g)) {
    for (const name of match[1].split(",").map((entry) => entry.trim().split(/\s+as\s+/)[0])) {
      if (DISK_READERS.includes(name)) hits.push(name);
    }
  }
  return hits;
}

export const archTests = [
  {
    name: "arch/FF-12706 (acd-next-walkers-exclude-archived): nextWork and listStream's default path reference isLiveStreamRow; findWork, validateWork and doctor.mjs contain no archived filter",
    run: async () => {
      const work = stripComments(await readFile(WORK, "utf8"));
      assert.match(work, /export function isLiveStreamRow\(row\)/, "the predicate has one home");
      const predicate = bodyOf(work, "isLiveStreamRow");
      assert.match(predicate, /row\.number != null && row\.archived !== true/, "⇔ number != null && archived !== true");
      for (const walker of ["nextWork", "listStream"]) {
        const body = bodyOf(work, walker);
        assert.ok(body, `${walker} is declared`);
        assert.ok(/\bisLiveStreamRow\b/.test(body), `${walker} references isLiveStreamRow — a walker that stops filtering through the one predicate fails here`);
      }
      for (const reader of ["findWork", "validateWork"]) {
        const body = bodyOf(work, reader);
        assert.ok(body, `${reader} is declared`);
        assert.ok(!ARCHIVED_FILTER_RE.test(body), `${reader} is a resolving reader and filters on neither \`archived\` nor a status standing in for it`);
        assert.ok(!/\bisLiveStreamRow\b/.test(body), `${reader} does not filter through the scheduling predicate either`);
      }
      const doctor = stripComments(await readFile(path.join(repoRoot, "src", "work", "doctor.mjs"), "utf8"));
      assert.ok(!ARCHIVED_MEMBER_RE.test(doctor) && !/\bisLiveStreamRow\b/.test(doctor), "src/work/doctor.mjs reads no `.archived` and applies no live-row filter — doctor sees all three roots");
    },
  },
  {
    name: "arch/FF-12706 (acd-next-walkers-exclude-archived): the `.archived` token appears in src/** only in src/work.mjs, inside isLiveStreamRow, listItems, listStream and findWork",
    run: async () => {
      const outside = [];
      for (const file of await readSrcFiles(repoRoot)) {
        const rel = `src/${file.rel}`;
        if (rel === "src/work.mjs") continue;
        // A member READ, never a string: the stream's own event name `stream.archived`
        // (127/ADR-004, story 03) is a literal the seam and the ledger spell, not a read of a
        // row's flag — so string literals are blanked before the token is looked for, exactly
        // as comments are.
        const stripped = blankStringLiterals(stripComments(await readFile(file.path, "utf8")));
        if (new RegExp(ARCHIVED_MEMBER_RE.source).test(stripped)) outside.push(rel);
      }
      assert.deepEqual(outside, [], "no src module other than src/work.mjs reads `.archived`");
      const work = stripComments(await readFile(WORK, "utf8"));
      const allowed = ["isLiveStreamRow", "listItems", "listStream", "findWork"].map((name) => bodyOf(work, name)).filter(Boolean);
      assert.equal(allowed.length, 4, "the four bodies are found");
      const inside = allowed.reduce((count, body) => count + (body.match(ARCHIVED_MEMBER_RE) ?? []).length, 0);
      const total = (work.match(ARCHIVED_MEMBER_RE) ?? []).length;
      assert.ok(total > 0, "non-vacuous: the token is read somewhere in src/work.mjs");
      assert.equal(total, inside, `every \`.archived\` read in src/work.mjs sits inside one of the four bodies (${total - inside} outside)`);
    },
  },
  {
    name: "arch/FF-12706 (acd-next-walkers-exclude-archived): the loop has no walk of its own — src/commands/loop.mjs and src/work/loop.mjs import none of the four disk readers from src/work.mjs",
    run: async () => {
      for (const rel of ["src/commands/loop.mjs", "src/work/loop.mjs"]) {
        const stripped = stripComments(await readFile(path.join(repoRoot, ...rel.split("/")), "utf8"));
        assert.deepEqual(importsDiskReaderFromWork(stripped, rel), [], `${rel} imports no disk reader from src/work.mjs — the loop reaches the stream only through the registered work:next and work:list`);
      }
      const loopShell = stripComments(await readFile(path.join(repoRoot, "src", "commands", "loop.mjs"), "utf8"));
      assert.ok(/"work:next"/.test(loopShell) && /"work:list"/.test(loopShell), "…and those two are the legs it does use");
    },
  },
  {
    name: "arch/FF-12706 (acd-next-walkers-exclude-archived): driven over the three-root fixture — nextWork and the default listStream return no archived or backlog row; findWork(\"05\") returns the archived row",
    run: () =>
      withThreeRoots({ archiveEtaStatus: "not-started" }, async ({ work }) => {
        const next = await nextWork(work);
        const ready = next.readySet.map((row) => row.ref);
        assert.deepEqual(ready, ["10/00", "11"], `the ready set holds the live rows only (got ${ready.join(", ")})`);
        for (const ref of ["05", "05/00", "06", "gamma", "delta", "epsilon"]) assert.ok(!ready.includes(ref), `${ref} is never proposed`);
        const listed = await listStream(work);
        assert.ok(!listed.some((row) => row.archived === true), "the default listing carries no archived row");
        assert.deepEqual(listed.map((row) => row.ref), ["10", "10/00", "11", "gamma", "delta", "epsilon"]);
        const zeta = await findWork(work, "05");
        assert.equal(zeta.length, 1, "findWork(\"05\") answers the archived driver");
        assert.equal(zeta[0].archived, true);
        assert.equal(zeta[0].status, "done");
      }),
  },
];
