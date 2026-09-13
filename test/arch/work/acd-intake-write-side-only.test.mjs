// Fitness function FF-12704 for milestone 127 / ADR-005 — "INTAKE IS WRITE-SIDE ONLY."
//
// `work.intake: "backlog" | "stream"` says where `aof:add-*` LANDS a new item. It exists so an
// existing project is unchanged without a migration, and the risk it carries is a READER that
// branches on it: a `"stream"` project with a stray `backlog/` folder would then have two truths —
// the folder is there, and the listing pretends it is not. So the key is read on the WRITE side
// only, and the read side (`listItems`, `findWork`, `listStream`, `nextWork`, `validateWork`, doctor,
// the board) walks `backlog/` and `archive/` whenever they exist, under either setting (ADR-005 §2).
//
// THE LEGS:
//   (1) the token appears in `src/**` only in `src/work/init.mjs` (the one WRITER), in
//       `src/commands/init-update.mjs` (the face that projects `intakeWritten`), in
//       `src/commands/promote.mjs` (the one READER — its refusal text explains a stream-intake
//       project) and in `src/bundle/commands/*.md` (the prompts, which are the scaffold path);
//   (2) the NAMED readers contain it ZERO times, spelled out by path so the claim is legible at the
//       place it matters rather than implied by leg (1)'s allow-list;
//   (3) non-vacuity: `init.mjs` and `promote.mjs` each contain it at least once. Without this leg a
//       rename to `mode` — the very refactor that would make the key unfindable while leaving every
//       other leg green — would pass.
//
// THE MATCH IS THE TOKEN, CASE-INSENSITIVE, over comment-stripped source. Deliberately a substring
// rather than a strict `\bintake\b`: the key is spelled `work.intake`, `intakeWritten`,
// `WORK_INTAKE_CONFIG_PATH` and `applyDefaultIntakeSelection` in the code that legitimately owns it,
// and a word-boundary match would see the first and miss the other three — so a reader that grew a
// camelCase or SCREAMING_CASE spelling of the key would sail through the control. Stripping comments
// is what lets the PROSE name the key freely (this file's own header does, and the modules' headers
// must be able to), while the executable text cannot.
//
// `.md` FILES ARE NOT COMMENT-STRIPPED. A markdown prompt has no JS comments, and running a JS
// stripper over prose would eat a `//` inside a URL or a fenced block. The bundle prompts are
// allow-listed wholesale anyway (they ARE the scaffold path), so the distinction costs nothing.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const TOKEN = /intake/iu;

// The WRITE side, by path. `src/bundle/commands/*.md` is a glob because the prompts are the scaffold
// path as a class — a new `aof:add-*` prompt reads the key the day it ships.
const ALLOWED_FILES = Object.freeze(["src/work/init.mjs", "src/commands/init-update.mjs", "src/commands/promote.mjs"]);
const ALLOWED_GLOB = /^src\/bundle\/commands\/[^/]+\.md$/u;
// The two that must carry it — the writer and the reader (ADR-005 §1).
const MUST_CARRY = Object.freeze(["src/work/init.mjs", "src/commands/promote.mjs"]);
// The readers the register names one by one, RESOLVED TO THE MODULES THAT EXIST. Two of the names in
// the register row are spellings of verbs that do not have a module of that path, and both are
// recorded here rather than silently dropped — a named reader that cannot be read must fail as NOT
// FOUND (asserted below), never be skipped:
//   · `src/commands/read.mjs` — the READ seam is `src/work/read.mjs` (the cache-first reader every
//     resolving door goes through); `work:doc`/`work:tasks` are the faces, and `doc.mjs` is named.
//   · `src/commands/recent.mjs` — `aof:recent` is a bundle PROMPT driven through `aof work list
//     --json` (127/01's outcome), so the module that must hold zero is `list.mjs`, already named.
// The doctor family is DERIVED by glob rather than listed: the register says `doctor-*.mjs`, there
// are nine of them, and a tenth must be covered the day it lands.
const NAMED_READERS = Object.freeze([
  "src/work.mjs",
  "src/work/loops.mjs",
  "src/work/read.mjs",
  "src/commands/list.mjs",
  "src/commands/next.mjs",
  "src/commands/find.mjs",
  "src/commands/doc.mjs",
  "src/board-ui.mjs",
  "src/global-work-store.mjs",
  // The aliases pass THROUGH the backlog under either setting and read nothing (task 04).
  "src/commands/insert-shared.mjs",
]);
const DOCTOR_FAMILY = /^doctor.*\.mjs$/u;

const toPosix = (value) => String(value).split(path.sep).join("/");

// Every file under `src/` this control reads: `.mjs` (comment-stripped) and `.md`/`.jsonc`/`.json`
// (verbatim). The sweep is over the TREE, so a new module carrying the token is caught the day it
// lands rather than the day someone remembers this file.
async function walkSrc(rel = "src", out = []) {
  for (const entry of await readdir(path.join(repoRoot, rel), { withFileTypes: true })) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) await walkSrc(child, out);
    else out.push(child);
  }
  return out;
}

async function readableText(rel) {
  const text = await readFile(path.join(repoRoot, rel), "utf8");
  return rel.endsWith(".mjs") || rel.endsWith(".js") ? stripComments(text) : text;
}

export const archTests = [
  {
    name: "arch/FF-12704 (acd-intake-write-side-only): the token `intake` appears in src/** only in init.mjs, init-update.mjs, promote.mjs and the bundle prompts",
    run: async () => {
      const files = (await walkSrc()).map(toPosix).sort();
      assert.ok(files.length > 200, `non-vacuity: the src sweep read ${files.length} files`);

      const carriers = [];
      for (const rel of files) {
        let text;
        try {
          text = await readableText(rel);
        } catch {
          continue; // a binary member under src/ is not a carrier of a text token
        }
        if (TOKEN.test(text)) carriers.push(rel);
      }

      assert.ok(carriers.length > 0, "non-vacuity: the sweep found the token somewhere (the write side carries it)");
      for (const carrier of carriers) {
        assert.ok(
          ALLOWED_FILES.includes(carrier) || ALLOWED_GLOB.test(carrier),
          `${path.basename(carrier)} carries the token \`intake\` (${carrier}) and is not on the write side — the key is written by init, projected by its face, read by promote's refusal text and named by the bundle prompts, and by nothing else (ADR-005 §1, §2)`,
        );
      }
    },
  },

  {
    name: "arch/FF-12704 (acd-intake-write-side-only): every named reader — and the whole doctor family — contains the token zero times; no reader branches on the setting",
    run: async () => {
      const doctors = (await readdir(path.join(repoRoot, "src", "work")))
        .filter((name) => DOCTOR_FAMILY.test(name))
        .map((name) => `src/work/${name}`)
        .sort();
      assert.ok(doctors.length >= 5, `non-vacuity: the doctor family glob found ${doctors.length} modules`);

      const readers = [...NAMED_READERS, ...doctors];
      for (const reader of readers) {
        // A named reader that cannot be READ is a failure, not a skip: a renamed module would
        // otherwise quietly leave the claim unasserted for that path.
        const text = await readableText(reader);
        assert.ok(text.trim().length > 0, `non-vacuity: ${reader} was read`);
        assert.doesNotMatch(
          text,
          TOKEN,
          `${reader} as a reader carrying the token \`intake\` — the read side is MODE-LESS: it walks backlog/ and archive/ whenever they exist, under either setting, so a "stream" project with a stray backlog leaf has ONE truth rather than two (ADR-005 §2)`,
        );
      }
    },
  },

  {
    name: "arch/FF-12704 (acd-intake-write-side-only): non-vacuity — init.mjs and promote.mjs each carry the token at least once",
    run: async () => {
      for (const writer of MUST_CARRY) {
        const text = await readableText(writer);
        assert.match(
          text,
          TOKEN,
          `${path.basename(writer)} as a writer that no longer carries the token — if the key were renamed (to \`mode\`, say) every other leg of this control would stay green while the setting became unfindable, so the two modules that MUST name it are asserted to name it`,
        );
      }
    },
  },
];
