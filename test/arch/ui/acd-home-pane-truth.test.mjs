// Fitness function: acd-home-pane-truth (m49 / ADR-003, and ADR-007 from story 49/03) —
//
//   "The home defines NO state word of its own; the feed axis is derived from the wire and from
//    NO BYTE; and the composition precedence is ONE pure function."
//
// ── WHY EACH CLAUSE, AND WHY IT IS STRUCTURAL RATHER THAN BEHAVIOURAL ────────────────────
//
// NO SECOND VOCABULARY. m46 spent a whole milestone deleting one — `DOCK_STATES` and
// `TERMINAL_VIEW_STATES`, two sets of words for one fact — and a second vocabulary grows ONE
// WORD AT A TIME, which is exactly what review attention is worst at catching. `unfed`,
// `silent`, `orphaned` each read cleanly at a render site. The behavioural half is in
// `test/ui/home-feed-axis.test.mjs` (the union of every word the composition can return, computed
// from the compositions that file actually drives, is a subset of the eight strings m46 froze);
// this is the structural half, and NEITHER IS SUFFICIENT ALONE — a behavioural union only
// constrains the paths a test drives, and a text sweep only constrains the spellings it knows.
//
// ── NARROWED 2026-08-13 (49/03, at the coordinator's ruling): THE RAMP-WORD LITERAL CLAUSE IS
//    SCOPED TO MODULES THAT PARTICIPATE IN PANE COMPOSITION, not to the whole directory. ─────
// The clause was directory-wide and it CRIED WOLF at the first honest file that arrived: story
// 04's `page-state.mjs` names the PAGE's five states, one of which its own locked task feature
// and DESIGN §S1 both fix as `error` (*the payload failed*) — a fact on a completely different
// axis from a pane's TRANSPORT state, and one the fleet's own `pageState` already spells the
// same way in `ui/src/fleet/scope.mjs`. The gate was wrong, not the code.
//
// THE PRECEDENT IS THIS FILE'S OWN, one paragraph down: the BYTE clause is already aimed "at the
// module that declares the axis rather than at the whole directory, because … a directory-wide
// `JSON.parse` ban would be a detector that cried wolf". Same reasoning, same remedy.
//
// AND THE FIX EXPLICITLY REJECTED, recorded so nobody re-proposes it: importing
// `TERMINAL_STATES.ERROR` into `page-state.mjs` would go green — this clause only matches
// LITERALS — while asserting that the page's failure state IS the transport's failure word. That
// is a real coupling and the exact conflation ADR-003 exists to prevent, so it would buy a green
// gate with a lie.
//
// WHAT "PARTICIPATES" MEANS, and it keeps the clause's teeth: a module that declares the feed
// axis, or the composition precedence, or that IMPORTS THE RAMP AT ALL. The third is the one
// that matters — a module holding the ramp's vocabulary and ALSO re-typing one of its words is
// the drift defect BY DEFINITION, whatever else it does. A module that declares none of the
// three is not talking about a pane's connection state, and this clause has nothing to say to it.
//
// NEVER FROM BYTES, AND THIS ONE IS A SECURITY CLAUSE. The browser writes terminal bytes
// STRAIGHT into xterm; sniffing control content out of them would turn a dumb painter into a
// parser, and a worker's own PTY output could then FORGE the pane's state by PRINTING it — the
// same forgery the transport-close design closes server-side. So the feed derivation may not
// parse, match or compare terminal content, and the clause is aimed at the module that declares
// the axis rather than at the whole directory, because the layout composer legitimately parses
// a STORAGE string and a directory-wide `JSON.parse` ban would be a detector that cried wolf.
//
// ONE PRECEDENCE, ONE FUNCTION. Sixteen panes composing their own precedence is sixteen chances
// to disagree, in JSX no test in this repo can reach.
//
// ── ADR-007'S POSTURE CLAUSE, ADDED HERE BY 49/03 IN THE DIFF THAT LANDS ITS SUBJECT ─────
// ~~What this gate does not yet assert~~ — DELIVERED. `producer-known` -> interactive,
// everything else -> a LABELLED read-only, failing closed for every row shape, driven through
// the SHIPPED `ui/src/home/session-mount.mjs`. It lands HERE rather than in a new file beside
// this one, and that is a ruling rather than a preference: this gate's subject is *the home's
// structural truth about a pane*, and the posture is that truth's sharpest instance. Two gates
// over one subject is a duplicated derivation wearing a fitness function's clothes — the day one
// of them is re-aimed the other keeps asserting the old shape, green, and the red line a
// reviewer eventually reads names the wrong subject.
//
// AND THE SET OF `acd-home-*` GATES IS ITSELF A NAMED, SHRINK-ONLY LIST (last lane below),
// because nothing else in this repo refuses the split: `acd-test-suite-registration` would
// happily register a fourth file. The only ratchet in this area rewards ADDING a gate and is
// silent about SPLITTING one, which is the shape of the problem.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments, nonVacuousSource } from "../../support/terminal-gate-detectors.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import { isUiSourceFile } from "../../support/ui-source-files.mjs";
import { TERMINAL_STATE_LIST, UNKNOWN_STATE } from "../../../ui/src/terminal/state-ramp.mjs";
import { POSTURE_INTERACTIVE, POSTURE_READ_ONLY, inputPolicyFor, mountModelFor } from "../../../ui/src/terminal/input-policy.mjs";
import { FEED_NO_PRODUCER, FEED_PRODUCER_KNOWN, FEED_ROSTER_GONE } from "../../../ui/src/home/feed-axis.mjs";
import { homeSessionMount } from "../../../ui/src/home/session-mount.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const HOME_DIR = "ui/src/home";

// The marker that says "this module declares the feed axis". Keyed on the exported CLOSED SET
// rather than on a filename, so renaming the file cannot silently un-scope the byte clauses.
const AXIS_DECLARATION = /\bexport\s+const\s+FEED_AXIS_VALUES\s*=/;
const COMPOSER_DECLARATION = /\bexport\s+function\s+composeHomePane\s*\(/;

// …and the third and fourth participation markers (see the NARROWED note in the header). Both are
// SPECIFIER tests rather than word tests, so neither can be satisfied or evaded by prose.
//
//   RAMP_IMPORT   a module that holds the ramp's own vocabulary. Re-typing one of its words
//                 beside the import is the drift defect BY DEFINITION, whatever else it does.
//   PANE_IMPORT   a module that consumes the home's own pane modules. ADDED 2026-08-13 at the
//                 architect's review, and it is a REAL hole rather than a tidy-up: measured over
//                 the delivered home, `feed-axis.mjs` was the ONLY participant, so
//                 `session-mount.mjs` — the module that authors the injected `reason` that
//                 REWRITES THE RAMP'S CHIP — was out of scope of the clause about the ramp's
//                 words. It brings the mount module and every story-05 tile component back in
//                 while leaving `page-state.mjs` (which imports only `../app/routes.mjs`)
//                 accepted, which is what the narrowing was for.
const RAMP_IMPORT = /state-ramp/;
const PANE_IMPORT = /(^|\/)(feed-axis|session-mount)\.mjs$/;

function participatesInPaneComposition(clean, source) {
  const specifiers = importSpecifiers(source).map((entry) => entry.specifier);
  return (
    AXIS_DECLARATION.test(clean) ||
    COMPOSER_DECLARATION.test(clean) ||
    specifiers.some((specifier) => RAMP_IMPORT.test(specifier)) ||
    specifiers.some((specifier) => PANE_IMPORT.test(specifier))
  );
}

// A SECOND VOCABULARY, in the two shapes it actually arrives in: a named state TABLE, and a
// module that simply spells the ramp's words itself instead of importing them.
const STATE_TABLE_DECLARATION = /\b(?:const|let|var)\s+[A-Z][A-Z0-9_]*STATES?\b\s*=/;

// The byte lane. Scoped to the axis module (see the header): a derivation that PARSES, MATCHES
// or string-compares is a parser, whatever it is reading.
const BYTE_LANE = Object.freeze([
  ["parses a payload", /JSON\.parse\s*\(/],
  ["builds a regular expression", /new\s+RegExp\s*\(/],
  ["matches against a pattern", /\.match\s*\(/],
  ["string-compares a literal", /\.(includes|indexOf|startsWith|endsWith|search)\s*\(\s*["'`]/],
  ["decodes bytes", /TextDecoder|atob\s*\(|Buffer\./],
  ["wires a keystroke or a frame sink", /\bon(Data|Binary|Key)\b/],
]);
const BYTE_IMPORT = /TerminalByteArea|@xterm|xterm/;

// Every control beneath `test/arch/`, by BASENAME, at any depth.
export async function archBasenames(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) found.push(...(await archBasenames(path.join(dir, entry.name))));
    else if (entry.name.endsWith(".test.mjs")) found.push(entry.name);
  }
  return found;
}

export async function readHomeFiles() {
  const files = [];
  const walk = async (dir) => {
    for (const entry of await readdir(path.join(repoRoot, dir), { withFileTypes: true })) {
      const next = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(next);
      else if (isUiSourceFile(entry.name)) files.push({ path: next, source: await readFile(path.join(repoRoot, next), "utf8") });
    }
  };
  await walk(HOME_DIR);
  return files;
}

/** The shipped detector. `files` is `[{ path, source }]` — synthesized text for every plant. */
export function homePaneTruthViolations(files) {
  const violations = [];
  const swept = Array.isArray(files) ? files : [];
  if (swept.length === 0) {
    return [`NO files under ${HOME_DIR}/ were handed to this detector — an absence sweep over an empty set asserts nothing.`];
  }

  let axisModules = 0;
  let composers = 0;

  for (const file of swept) {
    const source = String(file?.source ?? "");
    const clean = stripComments(source);
    const blinded = nonVacuousSource(file?.path, clean);
    if (blinded != null) {
      violations.push(blinded);
      continue;
    }

    // ── NO STATE WORD OF ITS OWN ──────────────────────────────────────────────────────
    if (STATE_TABLE_DECLARATION.test(clean)) {
      violations.push(
        `${file.path}: declares a *_STATES table. The home defines NO state word of its own — m46 spent a milestone deleting `
          + "`DOCK_STATES`/`TERMINAL_VIEW_STATES`, and a second vocabulary grows one word at a time. Import `TERMINAL_STATES` from `ui/src/terminal/state-ramp.mjs`.",
      );
    }
    // SCOPED (see the header's NARROWED note): a module that talks about a PANE's connection
    // state. A module that declares no axis, no composer and holds no ramp import is on another
    // axis entirely — the PAGE's five states are the measured instance — and a clause that
    // reported it would be a detector that cried wolf, which gets relaxed rather than obeyed.
    if (participatesInPaneComposition(clean, source)) {
      const spelled = [...TERMINAL_STATE_LIST, UNKNOWN_STATE].filter((word) => new RegExp(`["'\`]${word}["'\`]`).test(clean));
      if (spelled.length > 0) {
        const imported = importSpecifiers(source).map((entry) => entry.specifier).some((specifier) => RAMP_IMPORT.test(specifier));
        violations.push(
          `${file.path}: composes a pane and spells the connection-state word(s) ${JSON.stringify(spelled)} as string literal(s)${imported ? " even though it imports the ramp" : ""}. The ramp's words are IMPORTED, never re-typed: a re-typed word is a second copy that drifts silently, and it is how an eighth one gets added.`,
        );
      }
    }

    // ── THE AXIS MODULE READS NO BYTE ─────────────────────────────────────────────────
    if (AXIS_DECLARATION.test(clean)) {
      axisModules += 1;
      for (const [label, pattern] of BYTE_LANE) {
        if (!pattern.test(clean)) continue;
        violations.push(
          `${file.path}: the feed derivation ${label}. The axis is derived from the wire fields the fleet already polls and from NO byte — the browser writes these bytes straight into xterm, so sniffing them turns a painter into a parser, and a worker's own PTY output could FORGE the pane's state by printing it. (m49/ADR-003.)`,
        );
      }
      if (BYTE_IMPORT.test(clean) || importSpecifiers(source).map((entry) => entry.specifier).some((specifier) => BYTE_IMPORT.test(specifier))) {
        violations.push(`${file.path}: the feed derivation reaches into the byte area. It has no business knowing that bytes exist.`);
      }
      if (!/\bworkItem\b/.test(clean)) {
        violations.push(
          `${file.path}: declares the feed axis but never names \`workItem\` — the derivation is arithmetic over ONE wire field the index already carries, and a module that stopped reading it is deriving the axis from something else.`,
        );
      }
    }

    if (COMPOSER_DECLARATION.test(clean)) composers += 1;
  }

  if (axisModules !== 1) {
    violations.push(`the feed axis's closed set is declared in ${axisModules} modules under ${HOME_DIR}/; it must be declared in exactly ONE.`);
  }
  if (composers !== 1) {
    violations.push(
      `the composition precedence is declared in ${composers} modules under ${HOME_DIR}/; it must be ONE pure function. One pane has one header and one pane line, and sixteen panes composing their own precedence is sixteen chances to disagree.`,
    );
  }

  return violations;
}

// ══ m49/03 · ADR-007 — THE POSTURE DERIVATION FAILS CLOSED FOR EVERY ROW SHAPE ═════════════
//
// STRUCTURAL BECAUSE IT IS TOTAL, not because it reads text. The clause a source-grep cannot
// write is exactly the one that matters here: a producer that read the posture OFF THE ROW names
// no `interactive` literal anywhere and sails past every word sweep in this repo, while measuring
// through the real modules as `inputEnabled: true`, a registered `onData`, a blinking cursor and
// NO `read-only` label — every posture signal gone, CI silent.
//
// So the subject is the PRODUCER FUNCTION, handed in, and the matrix is every shape a row or an
// axis can arrive in. `producer-known` is the ONLY answer that costs nothing; everything else —
// an unrecognised axis word, a decoy on the row, a half-tuple, a row that is not an object —
// must come back READ-ONLY AND LABELLED. An unknown input may cost a keystroke; it may never
// cost a lie.
const ADDRESSED = Object.freeze({ nodeId: "node-a", sessionId: "sess-1", repo: "aof" });
const WITH_PRODUCER = Object.freeze({ ...ADDRESSED, workItem: Object.freeze({ ref: "49/03", assignmentId: "asg-1" }) });

export const POSTURE_MATRIX = Object.freeze([
  // The ONE interactive answer, first, so the matrix proves a DISCRIMINATION rather than a
  // constant: a producer hard-coded to read-only passes every other row here.
  { label: "a positively-established producer", row: WITH_PRODUCER, options: { axis: FEED_PRODUCER_KNOWN }, posture: POSTURE_INTERACTIVE },
  { label: "…and the same row with no axis stated, derived from its own wire fact", row: WITH_PRODUCER, options: {}, posture: POSTURE_INTERACTIVE },
  { label: "listed, and nothing will ever feed it", row: ADDRESSED, options: { axis: FEED_NO_PRODUCER }, posture: POSTURE_READ_ONLY },
  { label: "the mesh no longer lists this session", row: ADDRESSED, options: { axis: FEED_ROSTER_GONE }, posture: POSTURE_READ_ONLY },
  { label: "the axis word mis-spelled", row: WITH_PRODUCER, options: { axis: "producer_known" }, posture: POSTURE_READ_ONLY },
  { label: "the axis word in the wrong case", row: WITH_PRODUCER, options: { axis: "PRODUCER-KNOWN" }, posture: POSTURE_READ_ONLY },
  { label: "the posture word smuggled into the axis slot", row: WITH_PRODUCER, options: { axis: POSTURE_INTERACTIVE }, posture: POSTURE_READ_ONLY },
  { label: "a boolean where an axis value was expected", row: WITH_PRODUCER, options: { axis: true }, posture: POSTURE_READ_ONLY },
  { label: "a free session — no work item at all", row: { ...ADDRESSED, workItem: null }, options: {}, posture: POSTURE_READ_ONLY },
  { label: "a payload that omits the key entirely", row: ADDRESSED, options: {}, posture: POSTURE_READ_ONLY },
  { label: "a blank ref — a producer that cannot be named is not established", row: { ...ADDRESSED, workItem: { ref: "", assignmentId: "" } }, options: {}, posture: POSTURE_READ_ONLY },
  { label: "the word, on the row", row: { ...ADDRESSED, posture: POSTURE_INTERACTIVE }, options: { axis: FEED_NO_PRODUCER }, posture: POSTURE_READ_ONLY },
  { label: "the field the word sweep cannot see", row: { ...ADDRESSED, readOnly: false }, options: { axis: FEED_NO_PRODUCER }, posture: POSTURE_READ_ONLY },
  { label: "a capability read as a permission", row: { ...ADDRESSED, canInput: true }, options: { axis: FEED_NO_PRODUCER }, posture: POSTURE_READ_ONLY },
  { label: "a mount object riding along", row: { ...ADDRESSED, mount: { readOnly: false } }, options: { axis: FEED_NO_PRODUCER }, posture: POSTURE_READ_ONLY },
  { label: "a dispatch state that looks alive", row: { ...ADDRESSED, state: "running" }, options: { axis: FEED_NO_PRODUCER }, posture: POSTURE_READ_ONLY },
  // …and the OTHER direction: a decoy may not SILENCE a pane that may genuinely receive bytes.
  { label: "a decoy that would silence a real pane", row: { ...WITH_PRODUCER, posture: POSTURE_READ_ONLY }, options: { axis: FEED_PRODUCER_KNOWN }, posture: POSTURE_INTERACTIVE },
  { label: "…spelled as the field", row: { ...WITH_PRODUCER, readOnly: true }, options: { axis: FEED_PRODUCER_KNOWN }, posture: POSTURE_INTERACTIVE },
  // Unaddressable rows are not panes — and the declaration still fails closed for one.
  { label: "a half-tuple", row: { nodeId: "node-a", repo: "aof" }, options: {}, posture: POSTURE_READ_ONLY },
  { label: "an empty-string session id", row: { ...ADDRESSED, sessionId: "" }, options: {}, posture: POSTURE_READ_ONLY },
  { label: "nothing at all", row: null, options: {}, posture: POSTURE_READ_ONLY },
  { label: "not an object", row: "node-a/sess-1", options: {}, posture: POSTURE_READ_ONLY },
]);

/**
 * The shipped detector. `produce` is a mount PRODUCER — the real one, or a plant. It is driven
 * over the whole matrix and the answer is measured through the SHIPPED policy, never re-derived:
 * a posture that is spelled right and yields a keystroke sink is the defect, not the string.
 */
export function homePostureViolations(produce, matrix = POSTURE_MATRIX) {
  const violations = [];
  if (typeof produce !== "function") return ["no mount producer was handed to this detector — a posture clause over no producer asserts nothing."];
  if (!Array.isArray(matrix) || matrix.length === 0) return ["the posture matrix is empty — a total clause driven over no rows is the vacuity this gate exists to refuse."];

  for (const cell of matrix) {
    let declared;
    try {
      declared = produce(cell.row, cell.options);
    } catch (error) {
      violations.push(`${cell.label}: the producer THREW (${error?.message}). A pane whose posture threw is a blank tile in a grid of sixteen, and the operator reads it as a rendering bug.`);
      continue;
    }
    if (declared?.posture !== cell.posture) {
      violations.push(`${cell.label}: declared \`${declared?.posture}\`, expected \`${cell.posture}\`. Anything other than a positively-established \`producer-known\` is READ-ONLY: research measured a keystroke into a free session swallowed at one of two hops with no error anywhere, so a wrong answer here is an operator typing into a session nothing will deliver to.`);
      continue;
    }
    // …AND IT IS READ-ONLY IN FACT, THROUGH THE SHIPPED POLICY. The word is not the property.
    const interactive = cell.posture === POSTURE_INTERACTIVE;
    const policy = inputPolicyFor(declared.source, declared.posture);
    const model = mountModelFor({ source: declared.source, mount: declared.posture });
    if (policy.inputEnabled !== (interactive && declared.source != null)) {
      violations.push(`${cell.label}: the shipped policy yields inputEnabled=${policy.inputEnabled} for a \`${declared.posture}\` mount`);
    }
    if (policy.disableStdin !== !policy.inputEnabled) {
      violations.push(`${cell.label}: \`disableStdin\` is not the exact negation of \`inputEnabled\` — there is no third state in which a widget accepts keystrokes and drops them`);
    }
    if (!policy.inputEnabled) {
      if (model.keystrokeSinks.length !== 0) violations.push(`${cell.label}: a keystroke sink is registered on a read-only mount — read-only means read-only IN FACT, not one registered and ignored`);
      if (model.sendPath !== null) violations.push(`${cell.label}: a send path is named on a read-only mount — there must be nothing for a later refactor to re-enable by deleting a guard`);
      if (model.readOnlyLabel == null) violations.push(`${cell.label}: NO \`read-only\` label — the label and the non-blinking cursor are the only two signals of the posture left under one control, which is what makes the label mandatory`);
      if (model.cursor.blink !== false) violations.push(`${cell.label}: the cursor blinks on a read-only mount`);
    }
  }
  return violations;
}

// ══ m49/03 — THE `acd-home-*` GATE SET IS A NAMED, SHRINK-ONLY LIST ════════════════════════
//
// Asserted in BOTH directions: a file matching the prefix that is not named here FAILS (a
// subject was split rather than amended), and a NAMED file that is no longer on disk FAILS (the
// list may not rot into a permission slip). It is the identical technique this milestone already
// uses twice — `FLEET_TO_BOARD_BASELINE` and the EMPTY `HOME_TO_SURFACE_BASELINE` — applied to
// gate FILES instead of import specifiers.
//
// AND IT IS SCOPED BY PREFIX, DELIBERATELY, NOT BY A COUNT OVER `test/arch/`. A blanket ceiling
// on that directory would punish new gates, and new gates are the good outcome: this ratchet
// must fire on SPLITTING a subject, never on COVERING a new one.
export const HOME_GATES = Object.freeze([
  "acd-home-layout-is-a-filter.test.mjs",
  "acd-home-pane-truth.test.mjs",
  "acd-home-socket-cap-single-arbiter.test.mjs",
]);
const HOME_GATE_PREFIX = /^acd-home-.*\.test\.mjs$/;

export function homeGateSetViolations(listing, named = HOME_GATES) {
  const violations = [];
  const found = (Array.isArray(listing) ? listing : []).filter((name) => HOME_GATE_PREFIX.test(String(name))).sort();
  if (found.length === 0) {
    return ["NO `test/arch/acd-home-*.test.mjs` file was found at all — a both-directions list over an empty listing asserts nothing, and this milestone ships three."];
  }
  for (const name of found) {
    if (named.includes(name)) continue;
    violations.push(
      `test/arch/${name} is a NEW \`acd-home-*\` gate and is not in this list. THIS SUBJECT ALREADY HAS A GATE — AMEND IT. A second gate over one directory is two homes for one invariant, and the ADR names which one owns it: \`acd-home-pane-truth\` owns the home's structural truth about a pane (the vocabulary, the feed derivation, the precedence and the POSTURE), \`acd-home-socket-cap-single-arbiter\` owns the cap, \`acd-home-layout-is-a-filter\` owns persistence. The day one of two gates over one subject is re-aimed, the other keeps asserting the old shape — green — and the red line a reviewer eventually reads names the wrong subject.`,
    );
  }
  for (const name of named) {
    if (found.includes(name)) continue;
    violations.push(
      `test/arch/${name} is named in this list and is NOT on disk. The list may only ever SHRINK, and shrinking it is an EDIT here — a named file that vanished leaves a ratchet guarding a gate that no longer exists, which reads green while doing it.`,
    );
  }
  return violations;
}

export const archTests = [
  {
    name: "arch/49 ADR-003 (acd-home-pane-truth): the home defines no state word of its own, the feed derivation reads no byte, and the precedence is ONE function",
    run: async () => {
      const files = await readHomeFiles();
      assert.ok(files.length >= 6, `the home was actually swept: ${files.length} files`);
      assert.deepEqual(homePaneTruthViolations(files), [], "the home borrows the ramp's vocabulary and derives from the wire");
    },
  },

  {
    name: "arch/49 ADR-003 (acd-home-pane-truth): the detector FIRES on a second vocabulary, on a byte-sniffing derivation and on a duplicated precedence — and is quiet on the clean home in each lane",
    run: async () => {
      const clean = await readHomeFiles();
      assert.deepEqual(homePaneTruthViolations(clean), [], "the clean baseline is quiet");

      const plants = [
        [
          "a second vocabulary",
          { path: `${HOME_DIR}/plant.mjs`, source: 'const HOME_STATES = { BLOCKED: "blocked", WORKING: "working" };\nexport const x = HOME_STATES;' },
          /HOME_STATES|_STATES table|second vocabulary/i,
        ],
        [
          // NARROWED 2026-08-13: the plant is a module that PARTICIPATES — it holds the ramp's
          // own vocabulary and re-types one of its words beside it, which is the drift defect by
          // definition. The old plant re-typed a word in a module that declared no axis, no
          // composer and no ramp import, and that shape is now (correctly) not this clause's
          // business — see the control lane below, which proves the exemption is real.
          "a re-typed ramp word, in a module that holds the vocabulary it re-typed",
          {
            path: `${HOME_DIR}/plant.mjs`,
            source: 'import { TERMINAL_STATES } from "../terminal/state-ramp.mjs";\nexport function chip(state) {\n  return state === "streaming" ? TERMINAL_STATES.STREAMING : "idle";\n}',
          },
          /streaming|IMPORTED, never re-typed/i,
        ],
        [
          "…and one that composes the pane, which is scoped for the same reason",
          {
            path: `${HOME_DIR}/plant-pane.mjs`,
            source: 'export const FEED_AXIS_VALUES = ["producer-known", "no-producer"];\nexport function axisFor(row) {\n  return row.workItem == null ? "waiting" : FEED_AXIS_VALUES[0];\n}',
          },
          /waiting|IMPORTED, never re-typed/i,
        ],
        [
          "a byte-sniffing derivation",
          {
            path: `${HOME_DIR}/plant-axis.mjs`,
            source: [
              "export const FEED_AXIS_VALUES = [\"producer-known\", \"no-producer\"];",
              "export function feedAxisFor(row, text) {",
              "  if (text.includes(\"$ \")) return FEED_AXIS_VALUES[1];",
              "  return row.workItem == null ? FEED_AXIS_VALUES[1] : FEED_AXIS_VALUES[0];",
              "}",
            ].join("\n"),
          },
          /reads no byte|string-compares a literal/i,
        ],
        [
          "a second composer",
          { path: `${HOME_DIR}/plant-compose.mjs`, source: "export function composeHomePane(input) {\n  return { word: input.state };\n}" },
          /ONE pure function|composition precedence is declared in 2/i,
        ],
      ];

      for (const [label, plant, expected] of plants) {
        const planted = [...clean, plant];
        assert.notEqual(planted.length, clean.length, `${label}: the plant LANDED`);
        const violations = homePaneTruthViolations(planted);
        assert.ok(violations.length >= 1, `${label}: the shipped detector fires`);
        assert.ok(violations.some((violation) => expected.test(violation)), `${label}: the refusal says why — ${JSON.stringify(violations)}`);
        assert.deepEqual(homePaneTruthViolations(clean), [], `${label}: …and the CLEAN home, in this same lane, returns none`);
      }
    },
  },

  {
    // THE CONTROL FOR THE NARROWING (49/03, coordinator's ruling). A clause that is scoped needs
    // BOTH halves driven, or the scope is a hole nobody measured: the lane above proves a pane
    // module still cannot re-type a ramp word, and this one proves a module on ANOTHER AXIS is
    // accepted — which is the whole reason the scope exists.
    name: "arch/49 ADR-003 (acd-home-pane-truth): the ramp-word clause is SCOPED to pane composition — a PAGE-state module naming its own `error` state is accepted, and the shipped page-state module is the live proof",
    run: async () => {
      const control = {
        path: `${HOME_DIR}/plant-page-state.mjs`,
        source: [
          'export const PAGE_STATE_ERROR = "error";',
          'export const PAGE_STATE_POPULATED = "populated";',
          "export function pageStateFor(payload) {",
          "  return payload == null ? PAGE_STATE_ERROR : PAGE_STATE_POPULATED;",
          "}",
        ].join("\n"),
      };
      assert.deepEqual(
        homePaneTruthViolations([control]).filter((violation) => /connection-state word/.test(violation)),
        [],
        "a module that declares no feed axis, no composer and no ramp import is on the PAGE's axis, not a pane's. `error ≡ the payload failed` (DESIGN §S1) and `error ≡ the transport failed` (m46's ramp) are two facts, and forcing the first to borrow the second's constant would assert a coupling that is not there — the exact conflation ADR-003 exists to prevent.",
      );

      // …and it is not a theoretical shape: the SHIPPED page-state module is exactly it.
      const shipped = (await readHomeFiles()).filter((file) => /page-state/.test(file.path));
      assert.ok(shipped.length >= 1, `the shipped page-state module(s) were found: ${shipped.map((file) => file.path).join(", ")}`);
      assert.deepEqual(
        homePaneTruthViolations(shipped).filter((violation) => /connection-state word/.test(violation)),
        [],
        "the page's own state names are its own, and this gate has nothing to say about them",
      );

      // AND THE TEETH ARE STILL THERE, in the same lane, so the exemption is a SCOPE and not a
      // hole: the same file, with the ramp imported beside it, is refused.
      const participating = {
        path: control.path,
        source: `import { TERMINAL_STATES } from "../terminal/state-ramp.mjs";\n${control.source}\nexport const chip = TERMINAL_STATES;`,
      };
      assert.notEqual(participating.source, control.source, "the plant LANDED");
      assert.ok(
        homePaneTruthViolations([participating]).some((violation) => /connection-state word/.test(violation)),
        "the SAME literal, in a module that holds the ramp's vocabulary, is a re-typed ramp word and is refused",
      );

      // …AND SO IS A CONSUMER OF THE HOME'S OWN PANE MODULES (the fourth marker). Without it the
      // clause reached exactly ONE file and not `session-mount.mjs` — the module that authors the
      // injected `reason` that rewrites the ramp's chip.
      const paneConsumer = {
        path: `${HOME_DIR}/plant-tile.tsx`,
        source: 'import { homeSessionMount } from "./session-mount.mjs";\nexport const chip = (s) => (s === "streaming" ? "live" : "off");\n',
      };
      assert.ok(
        homePaneTruthViolations([paneConsumer]).some((violation) => /connection-state word/.test(violation)),
        "a module that consumes the home's pane modules and re-types a ramp word is refused — which is where a story-05 tile component lives",
      );
      // …and the mount module is genuinely IN SCOPE now, on the delivered tree.
      const mount = (await readHomeFiles()).filter((file) => /session-mount\.mjs$/.test(file.path));
      // A FLOOR, not an equality (FF-11902): the walk of the home directory must have found the
      // module, and every member it found is judged below. A count retyped here is a fact about
      // the tree stored in a control, and the next move of that module would be billed to a stranger.
      assert.ok(mount.length >= 1, `the shipped mount module was found under ${HOME_DIR}`);
      const inScope = { path: mount[0].path, source: `${mount[0].source}\nexport const stray = "waiting";\n` };
      assert.ok(
        homePaneTruthViolations([inScope]).some((violation) => /connection-state word/.test(violation)),
        "a ramp word re-typed IN `session-mount.mjs` is now refused — it was not before this marker, and that module is the one that rewrites the chip",
      );
      assert.deepEqual(
        homePaneTruthViolations(mount).filter((violation) => /connection-state word/.test(violation)),
        [],
        "…while the module as SHIPPED is clean, so the marker adds teeth rather than a red",
      );
    },
  },

  // ══ m49/03 · ADR-007 — THE POSTURE ═════════════════════════════════════════════════════════
  {
    name: "arch/49 ADR-007 (acd-home-pane-truth): the home's posture derivation is INTERACTIVE only for a positively-established `producer-known` row and fails closed — read-only IN FACT and LABELLED — for every other row shape, malformed axis and posture-shaped decoy",
    run: async () => {
      const violations = homePostureViolations(homeSessionMount);
      assert.deepEqual(
        violations,
        [],
        "the posture that decides whether an operator may type into another machine is a function of the FEED AXIS and of nothing else. Rows 1-2 are what make this milestone's headline true; the rest are the fail-closed half, and the two decoy rows at the end are what stop a build hard-coding `read-only` and shipping a grid that can never type.",
      );

      // NON-VACUITY, stated as numbers rather than as a claim: the matrix is total over both
      // answers, so "fails closed" is a DISCRIMINATION and not what this producer always says.
      const interactive = POSTURE_MATRIX.filter((cell) => cell.posture === POSTURE_INTERACTIVE);
      assert.ok(POSTURE_MATRIX.length >= 20, `the matrix is non-vacuous: ${POSTURE_MATRIX.length} rows`);
      assert.ok(interactive.length >= 3, `…and ${interactive.length} of them are INTERACTIVE, so a producer hard-coded to read-only cannot pass this lane`);
    },
  },

  {
    name: "arch/49 ADR-007 (acd-home-pane-truth): the posture detector FIRES on a producer that defaults to interactive on an unrecognised row, on one that reads the posture OFF the row, and on one that is read-only in word but not in fact — and is quiet on the SHIPPED producer in the same lane",
    run: async () => {
      assert.deepEqual(homePostureViolations(homeSessionMount), [], "the clean baseline is quiet");

      const source = homeSessionMount(WITH_PRODUCER, { axis: FEED_PRODUCER_KNOWN }).source;
      const plants = [
        [
          "a posture derivation defaulting to INTERACTIVE on an unrecognised row — the fail-open spelling",
          (row, options) => Object.freeze({ ...homeSessionMount(row, options), posture: options?.axis === FEED_NO_PRODUCER ? POSTURE_READ_ONLY : POSTURE_INTERACTIVE }),
          /declared `interactive`, expected `read-only`/,
        ],
        [
          "a producer that reads the posture OFF THE ROW — it names no `interactive` literal and passes every word sweep in this repo",
          (row, options) => Object.freeze({ ...homeSessionMount(row, options), posture: row?.posture ?? row?.readOnly === false ? POSTURE_INTERACTIVE : homeSessionMount(row, options).posture }),
          /expected `read-only`/,
        ],
        [
          "a producer hard-coded to read-only — the OTHER direction, which ships this milestone's headline silently missing",
          (row, options) => Object.freeze({ ...homeSessionMount(row, options), posture: POSTURE_READ_ONLY }),
          /expected `interactive`/,
        ],
        [
          "read-only in WORD but not in FACT — the posture spelled right on a source that still types",
          (row, options) => {
            const declared = homeSessionMount(row, options);
            return Object.freeze({ ...declared, posture: POSTURE_READ_ONLY, source: declared.source ?? source });
          },
          /expected `interactive`|read-only/,
        ],
        [
          "a producer that THROWS on a row it did not expect — a blank tile in a grid of sixteen",
          (row, options) => {
            if (row == null || typeof row !== "object") throw new TypeError("cannot read properties of null");
            return homeSessionMount(row, options);
          },
          /the producer THREW/,
        ],
      ];

      for (const [label, plant, expected] of plants) {
        assert.notEqual(plant, homeSessionMount, `${label}: the plant is a DIFFERENT producer from the shipped one`);
        const fired = homePostureViolations(plant);
        assert.ok(fired.length >= 1, `${label}: the shipped detector fires`);
        assert.ok(fired.some((violation) => expected.test(violation)), `${label}: the refusal says why — ${JSON.stringify(fired.slice(0, 3))}`);
        assert.deepEqual(homePostureViolations(homeSessionMount), [], `${label}: …and the SHIPPED producer, in this same lane, returns none`);
      }
    },
  },

  // ══ m49/03 — THE GATE SET ITSELF, NAMED AND SHRINK-ONLY ════════════════════════════════════
  {
    name: "arch/49 ADR-001 (acd-home-pane-truth): the set of `test/arch/acd-home-*.test.mjs` gates is a NAMED, shrink-only list asserted in BOTH directions — a fourth file fails, and a named file that no longer exists fails",
    run: async () => {
      // 119/03 — `test/arch/` holds directories now, so a flat listing of it returns no gate at
      // all and `homeGateSetViolations` would have refused on its own empty-set leg. The listing is
      // the BASENAMES of every control beneath the arch tree, which is what this detector reads.
      const listing = await archBasenames(path.join(repoRoot, "test", "arch"));
      assert.deepEqual(
        homeGateSetViolations(listing),
        [],
        "three gates, three subjects: the home's pane truth (this file, which owns the posture too), the socket cap, and layout persistence.",
      );
      assert.equal(HOME_GATES.length, 3, "non-vacuity: the list names all three of this milestone's home gates");
      for (const name of HOME_GATES) assert.ok(listing.includes(name), `${name} is on disk`);

      // …and it FIRES in both directions, against the shipped detector, on synthesized listings —
      // never by writing a file into `test/arch/`, which would race every other suite and would
      // survive a crashed run.
      const split = [...listing, "acd-home-posture-fails-closed.test.mjs"];
      assert.notEqual(split.length, listing.length, "the plant LANDED");
      assert.ok(
        homeGateSetViolations(split).some((violation) => /acd-home-posture-fails-closed/.test(violation) && /AMEND IT/.test(violation)),
        `a FOURTH acd-home gate is refused, and the refusal says to amend the gate that already owns the subject: ${JSON.stringify(homeGateSetViolations(split))}`,
      );
      const vanished = listing.filter((name) => name !== "acd-home-socket-cap-single-arbiter.test.mjs");
      assert.notEqual(vanished.length, listing.length, "the second plant LANDED");
      assert.ok(vanished.length > 0, "…and the listing still has members after the plant, so the refusal below is judged over a set");
      assert.ok(
        homeGateSetViolations(vanished).some((violation) => /acd-home-socket-cap-single-arbiter/.test(violation) && /only ever SHRINK/.test(violation)),
        "…and a NAMED gate that is no longer on disk is refused too, so the list cannot rot into a permission slip",
      );
      assert.deepEqual(homeGateSetViolations(listing), [], "…and the real listing, in this same lane, returns none");
    },
  },
];
