// Fitness function: acd-home-socket-cap-single-arbiter (m49 / ADR-006 and its 2026-08-13
// amendment) —
//
//   "The live-socket ceiling is ONE constant in ONE module, it is an ARGUMENT to the arbiter,
//    it is never greater than the relay mirror's own tail budget on the OTHER side of the
//    build boundary, and it is not justified by a browser limit."
//
// ── THE CROSS-BUILD TIE, AND WHY IT IS A GATE RATHER THAN AN IMPORT ──────────────────────
// `ui/src/**` is bundled by vite for a browser and `src/**` runs under node; there is no
// runtime at which one reads the other's constant. The only place the pair can be compared is a
// test that reads BOTH FILES AS TEXT — the technique `acd-terminal-mirror-geometry-pinned`
// invented for exactly this class of pair (extract each side's literal, assert the consumer
// genuinely USES the constant rather than carrying a second copy, then compare the numbers).
// This is that technique's second instance.
//
// AND THE PLANT THAT PROVES IT IS A TIE AT ALL is the one a build will not write for itself:
// LOWERING THE NODE SIDE while the client stays legal. Every other plant fires just as well
// against a detector that hard-codes 64 on the client side — which would be a gate that reads
// ONE build and believes it read two. That is the same failure
// `acd-terminal-mirror-geometry-pinned` was written against: a cross-build constant believed
// tested, where the tying file had never existed.
//
// ── THE NUMBER MAY NOT BE JUSTIFIED BY A BROWSER LIMIT, and that clause is textual on purpose ─
// RESEARCH §Q3 measured one headless Chromium page holding 255 concurrent WebSockets to a
// single origin (the 256th refused, server-confirmed); the commonly-cited "6" is the HTTP/1.1
// per-host cap and does not govern WebSocket upgrades. RESEARCH's FIRST PASS derived the cap
// from that misreading and produced a completely different product — a 6-pane grid. So the
// declaring module must NAME the three constraints that are real (the replay burst,
// `MAX_TAIL_KEYS`, main-thread contention), and any comment sentence that mentions a browser or
// a per-origin/per-host limit must carry an explicit negation, because the only legitimate
// reason to mention one is to say it is NOT the wall.
//
// ── WHAT IS NOT HERE ─────────────────────────────────────────────────────────────────────
// The VALUE 16 and its argument are ADR-006's; this gate pins that the number is an argument,
// lives in one place, and is tied to `MAX_TAIL_KEYS`. It does not re-argue the number. The
// arbiter's BEHAVIOUR — the no-demote invariant, the fail-closed cap, the two held frames — is
// driven exhaustively in `test/ui/home-socket-cap-arbiter.test.mjs` against this same module.
//
// AND ITS SECOND-COPY SWEEP HAS A DECLARED LIMIT, stated so a reader meets the boundary rather
// than assumes there is none: it catches the number re-typed as a SLICE BOUND (`.slice(0, 16)`)
// or a LENGTH COMPARISON (`.length > 16`) — the two spellings the contract's Trap 4 names — and
// it does NOT catch a bare re-declaration in a component (`const VISIBLE = 16`, `gridRows: 4`,
// a CSS `repeat(4, …)`). Widening it to every `16` in `ui/src/home/**` would trip on tile
// geometry and legend counts, so the clause that actually holds that line is the ONE-DECLARING-
// MODULE clause plus the call-site clause below: a component that types its own ceiling still
// has to get the rows from somewhere, and every call site must feed `MAX_LIVE_PANES`.
//
// ── PLANTS GO TO THE SHIPPED DETECTOR, AS SYNTHESIZED TEXT ───────────────────────────────
// Never by editing a real file, never by string-replacing one on disk. m46's mutation review
// found a plant fed to a locally re-implemented copy of `affordanceFormViolations`, so the
// shipped detector was never once driven to a violation. Every plant asserts it LANDED before
// the detector is asked, and the clean pair is shown quiet in the same lane.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/terminal-gate-detectors.mjs";
import { isUiSourceFile } from "../../support/ui-source-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const HOME_DIR = "ui/src/home";
export const MIRROR_FILE = "src/mesh/terminal-mirror.mjs";
export const ARBITER_NAME = "subscribedPaneSet";

const CLIENT_CAP_DECLARATION = /\bexport\s+const\s+MAX_LIVE_PANES\s*=\s*(\d+)\s*;/;
const CLIENT_CAP_ANY_SPELLING = /\bMAX_LIVE_PANES\s*[:=]\s*(\d+)/g;
const MIRROR_TAIL_KEYS = /\bexport\s+const\s+MAX_TAIL_KEYS\s*=\s*(\d+)\s*;/;

// A cap re-typed as a literal. BOTH spellings, because a detector that saw only one would be
// walked past by the other: a slice bound and a length comparison are the same defect.
const RETYPED_SLICE = /\.slice\s*\(\s*0\s*,\s*(\d+)\s*\)/g;
const RETYPED_COMPARE = /\.length\s*[<>]=?\s*(\d+)/g;

// The three constraints ADR-006 actually argues from. All three must be NAMED where the number
// is declared, or the number's justification has silently become something else.
const REQUIRED_JUSTIFICATION = [
  ["the mirror's synchronous replay burst", /replay/i],
  ["the 64-tuple LRU tail budget (`MAX_TAIL_KEYS`)", /MAX_TAIL_KEYS/],
  ["DOM-renderer main-thread contention", /main[- ]thread/i],
];
const BROWSER_LIMIT_PHRASE = /\bbrowsers?\b|per[- ]origin|per[- ]host/i;
const LIMIT_WORD = /\b(limit|cap|ceiling|maximum|max)\b/i;
const NEGATION = /\b(not|never|no|nor|isn't|does not)\b/i;

function commentLines(source) {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("//") || line.startsWith("*") || line.startsWith("/*"));
}

async function collectFiles(relative) {
  const files = [];
  const walk = async (dir) => {
    for (const entry of await readdir(path.join(repoRoot, dir), { withFileTypes: true })) {
      const next = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(next);
      else if (isUiSourceFile(entry.name)) files.push({ path: next, source: await readFile(path.join(repoRoot, next), "utf8") });
    }
  };
  await walk(relative);
  return files;
}

export async function readSocketCapPair() {
  return {
    files: await collectFiles("ui/src"),
    mirror: await readFile(path.join(repoRoot, MIRROR_FILE), "utf8"),
  };
}

/**
 * The shipped detector. Takes BOTH sides of the build boundary as TEXT and returns
 * `{ violations, report }` — the report carrying the two numbers it actually read, because a
 * gate that compares two values it silently failed to extract compares `undefined` with
 * `undefined` and passes.
 */
export function socketCapViolations(pair) {
  const violations = [];
  const files = Array.isArray(pair?.files) ? pair.files : [];
  const mirror = typeof pair?.mirror === "string" ? pair.mirror : "";
  const homeFiles = files.filter((file) => typeof file?.path === "string" && file.path.startsWith(`${HOME_DIR}/`));

  // ── THE CLIENT HALF ──────────────────────────────────────────────────────────────────
  const declaring = [];
  let clientCap = null;
  for (const file of homeFiles) {
    const match = CLIENT_CAP_DECLARATION.exec(stripComments(file.source));
    if (match == null) continue;
    declaring.push(file.path);
    if (clientCap == null) clientCap = Number(match[1]);
  }

  if (declaring.length === 0) {
    violations.push(
      `the CLIENT half could not be read: no module under ${HOME_DIR}/ declares \`export const MAX_LIVE_PANES = <n>;\`. A cross-build tie that cannot extract one side compares \`undefined\` with \`undefined\` and passes — so an unreadable client half is a REFUSAL, never a quiet run. (m49/ADR-006.)`,
    );
  } else if (declaring.length > 1) {
    violations.push(
      `\`MAX_LIVE_PANES\` is declared in MORE THAN ONE module: ${declaring.join(", ")}. The live-socket ceiling is ONE constant in ONE module — two declarations is two numbers, and only one of them is the one the arbiter is handed. (m49/ADR-006.)`,
    );
  }

  // ── THE NODE HALF ────────────────────────────────────────────────────────────────────
  const mirrorMatch = MIRROR_TAIL_KEYS.exec(stripComments(mirror));
  const mirrorTailKeys = mirrorMatch == null ? null : Number(mirrorMatch[1]);
  if (mirrorTailKeys == null) {
    violations.push(
      `the NODE half could not be read: \`${MIRROR_FILE}\` does not declare \`export const MAX_TAIL_KEYS = <n>;\`. The tie is between two builds that cannot import each other, so a side that vanishes must FAIL rather than leave the other unchecked. (m49/ADR-006.)`,
    );
  }

  // ── THE TIE ITSELF ───────────────────────────────────────────────────────────────────
  if (clientCap != null && mirrorTailKeys != null && clientCap > mirrorTailKeys) {
    violations.push(
      `the client's \`MAX_LIVE_PANES\` is ${clientCap}, greater than the relay mirror's \`MAX_TAIL_KEYS\` of ${mirrorTailKeys} (${MIRROR_FILE}). Past ${mirrorTailKeys} distinct tuples the control drops the least-recently-fed tail, and a pane whose tail was evicted is byte-indistinguishable from a genuinely silent worker — a dishonesty no rendering can fix. Either lower the client constant or raise the mirror's, in an ADR: milestone 49 / ADR-006 argues ${clientCap > 16 ? "16" : "the shipped number"} from that budget and the cap must sit FAR below it, not merely under it.`,
    );
  }

  // ── ONE PLACE, NO SECOND COPY OF THE NUMBER ──────────────────────────────────────────
  if (clientCap != null) {
    for (const file of homeFiles) {
      const clean = stripComments(file.source);
      // A declaration line — including the `.d.mts` sibling's literal TYPE — is the one
      // legitimate second spelling, and it is checked for agreement rather than ignored.
      for (const match of clean.matchAll(CLIENT_CAP_ANY_SPELLING)) {
        if (Number(match[1]) !== clientCap) {
          violations.push(
            `${file.path}: declares \`MAX_LIVE_PANES\` as ${match[1]} while the shipped constant is ${clientCap} — two numbers for one ceiling, and only one of them is the one the arbiter is handed.`,
          );
        }
      }
      const withoutDeclarations = clean.replace(CLIENT_CAP_ANY_SPELLING, "MAX_LIVE_PANES");
      for (const [label, pattern] of [
        ["a slice bound", RETYPED_SLICE],
        ["a length comparison", RETYPED_COMPARE],
      ]) {
        for (const match of withoutDeclarations.matchAll(pattern)) {
          if (Number(match[1]) !== clientCap) continue;
          violations.push(
            `${file.path}: re-types the cap as the literal \`${match[0].trim()}\` (${label}). The number would then live in two places, one of which no gate reads — and a component holding \`slice(0, ${clientCap})\` is the emergent count SPEC forbids, wearing a literal's clothes. Pass the constant, or the arbiter's returned decisions.`,
          );
        }
      }
    }
  }

  // ── THE CAP IS AN ARGUMENT, NOT MODULE SCOPE ─────────────────────────────────────────
  //
  // AND THE ARBITER HAS AN EXISTENCE FLOOR, because every clause in this block is scoped by
  // FINDING the signature: rename `subscribedPaneSet` to anything and the `continue` below
  // silently vacates the cap-is-an-argument clause, the currently-subscribed clause AND the
  // no-module-scope clause in one edit, with the gate reporting zero violations. The constant
  // has such a floor (`declaring.length === 0` above) and the sibling gate
  // `acd-home-pane-truth` has one for its axis module and its composer; the function that the
  // whole four-argument amendment is ABOUT had none.
  const arbiters = [];
  for (const file of homeFiles) {
    const clean = stripComments(file.source);
    const signature = new RegExp(`\\bexport\\s+function\\s+${ARBITER_NAME}\\s*\\(([^)]*)\\)`).exec(clean);
    if (signature == null) continue;
    arbiters.push(file.path);
    const parameters = signature[1].split(",").map((parameter) => parameter.trim());
    if (!parameters.includes("cap")) {
      violations.push(
        `${file.path}: \`${ARBITER_NAME}\` does not take a \`cap\` PARAMETER (it takes ${JSON.stringify(parameters)}). The cap must be an ARGUMENT: a cap read from module scope passes every scenario that uses the shipped number and fails the moment a cap of 4 is handed in, which is precisely the case a headless test drives. (m49/ADR-006.)`,
      );
    }
    if (!parameters.some((parameter) => /subscribed/i.test(parameter))) {
      violations.push(
        `${file.path}: \`${ARBITER_NAME}\` does not take the CURRENTLY-SUBSCRIBED set as an argument (it takes ${JSON.stringify(parameters)}). A function that cannot see who is already subscribed cannot express "do not demote" — it can only recompute a ranking, and every recomputation silently evicts an incumbent whose scrollback the bounded replay cannot give back. (m49/ADR-006 amendment (1).)`,
      );
    }
    const body = clean.slice(signature.index);
    if (/\bMAX_LIVE_PANES\b/.test(body)) {
      violations.push(
        `${file.path}: \`${ARBITER_NAME}\` reads \`MAX_LIVE_PANES\` from module scope. The cap must be an ARGUMENT — reading the constant is the spelling that makes "the cap is an argument" unprovable, because every call would then quietly produce the shipped number and look right.`,
      );
    }
  }

  if (arbiters.length !== 1) {
    violations.push(
      arbiters.length === 0
        ? `the ARBITER could not be found: no module under ${HOME_DIR}/ declares \`export function ${ARBITER_NAME}(…)\`. Every clause above is scoped by finding that signature, so a rename would otherwise vacate the cap-is-an-argument clause, the currently-subscribed clause and the no-module-scope clause AT ONCE and report zero violations — the amendment would be gone with nothing red. Rename the gate WITH the function, in one diff. (m49/ADR-006 amendment (1).)`
        : `\`${ARBITER_NAME}\` is declared in MORE THAN ONE module under ${HOME_DIR}/: ${arbiters.join(", ")}. Subscription is arbitrated ONCE over the whole row set — two arbiters is two answers to "which panes hold a live socket", and only one of them is the one the grid calls.`,
    );
  }

  // ── THE JUSTIFICATION IS THE MIRROR'S COST, NEVER A BROWSER LIMIT ────────────────────
  for (const file of declaring) {
    const source = homeFiles.find((entry) => entry.path === file).source;
    const comments = commentLines(source);
    const prose = comments.join("\n");
    const missing = REQUIRED_JUSTIFICATION.filter(([, pattern]) => !pattern.test(prose)).map(([label]) => label);
    if (missing.length > 0) {
      violations.push(
        `${file}: the cap's justification does not name ${missing.join(" / ")}. ADR-006 argues the number from the mirror's synchronous replay burst, its 64-tuple LRU tail budget and DOM-renderer main-thread contention — and NOT from a platform ceiling: RESEARCH §Q3 measured 255 concurrent sockets to one origin from a single page, so a build that re-derives this number from a browser ceiling has got it wrong (that misreading is what produced RESEARCH's first-pass 6-pane grid).`,
      );
    }
    for (const line of comments) {
      if (!BROWSER_LIMIT_PHRASE.test(line) || !LIMIT_WORD.test(line)) continue;
      if (NEGATION.test(line)) continue;
      violations.push(
        `${file}: the cap's justification derives the number from a browser/per-origin socket limit — "${line.trim()}". RESEARCH §Q3 MEASURED 255 concurrent WebSockets to one origin from one page (the 256th refused, server-confirmed); the commonly-cited "6" is the HTTP/1.1 per-host cap and does not govern WebSocket upgrades. The only legitimate reason to mention a platform ceiling here is to say it is NOT the constraint.`,
      );
    }
  }

  // ── EVERY CALL SITE FEEDS THE CONSTANT, NEVER A SECOND COPY OF THE NUMBER ────────────
  //
  // VACUOUS ON THE REAL TREE TODAY AND SAID SO OUT LOUD: nothing calls the arbiter yet — story
  // 49/02 delivers the decision and stories 49/03-05 deliver the grid that asks it. The clause
  // is driven by a synthesized plant so it is not merely observed staying quiet, and the report
  // publishes the (currently empty) list so the day it becomes non-empty is visible.
  const capCallSites = [];
  for (const file of files) {
    if (typeof file?.source !== "string") continue;
    const clean = stripComments(file.source);
    for (const match of clean.matchAll(new RegExp(`\\b${ARBITER_NAME}\\s*\\(([^)]*)\\)`, "g"))) {
      // The DECLARATION is not a call site. `function subscribedPaneSet(rows, cap, …)` would
      // otherwise read as a call passing `cap`, which is the one argument spelling this clause
      // is looking for — a detector that counted its own subject would be quiet forever.
      if (/\bfunction\s+$/.test(clean.slice(Math.max(0, match.index - 32), match.index))) continue;
      const argument = (match[1].split(",")[1] ?? "").trim();
      capCallSites.push({ path: file.path, argument });
      if (argument !== "" && !/MAX_LIVE_PANES/.test(argument)) {
        violations.push(
          `${file.path}: calls \`${ARBITER_NAME}\` with a cap of \`${argument}\` rather than the declared \`MAX_LIVE_PANES\`. A second copy of the number is a ceiling only one gate reads, and it is how the configured count becomes emergent again.`,
        );
      }
    }
  }

  if (homeFiles.length === 0) {
    violations.push(
      `NO files under ${HOME_DIR}/ were handed to this detector. An absence sweep over an empty set is a green run that asserted nothing.`,
    );
  }

  return {
    violations,
    report: {
      clientCap,
      mirrorTailKeys,
      declaringFiles: declaring,
      arbiterFiles: arbiters,
      capCallSites,
      capFedFromConstant: capCallSites.every((site) => site.argument === "" || /MAX_LIVE_PANES/.test(site.argument)),
      homeFiles: homeFiles.length,
    },
  };
}

export const archTests = [
  {
    name: "arch/49 ADR-006 (acd-home-socket-cap-single-arbiter): on the tree as it stands the gate is quiet, and it reports the two numbers it actually read on BOTH sides of the build boundary",
    run: async () => {
      const { violations, report } = socketCapViolations(await readSocketCapPair());
      assert.deepEqual(violations, [], "the shipped pair is inside the tie");
      assert.equal(report.mirrorTailKeys, 64, `the NODE half was really read: ${MIRROR_FILE} declares MAX_TAIL_KEYS = 64`);
      assert.ok(
        Number.isInteger(report.clientCap) && report.clientCap > 0,
        `the CLIENT half was really read: MAX_LIVE_PANES = ${report.clientCap}`,
      );
      assert.ok(report.clientCap <= report.mirrorTailKeys, `${report.clientCap} <= ${report.mirrorTailKeys}`);
      assert.deepEqual(report.declaringFiles, ["ui/src/home/socket-cap.mjs"], "declared in exactly one module");
      assert.deepEqual(
        report.arbiterFiles,
        ["ui/src/home/socket-cap.mjs"],
        "the ARBITER was really found, in exactly one module — the clauses that read its parameter list are scoped by finding it, so an unfound arbiter is a vacated amendment rather than a clean tree",
      );
      assert.equal(report.capFedFromConstant, true, "every call site that supplies a cap supplies the declared constant");
      assert.ok(report.homeFiles >= 6, `the home was actually swept: ${report.homeFiles} files`);
    },
  },
];
