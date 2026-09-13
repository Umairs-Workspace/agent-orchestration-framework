// THE EVIDENCE LANE — milestone 59 / story 02. ADR-002 §2/§3, ADR-004 §1/§3. FF-5906.
//
// A milestone's fitness register says, row by row, which control enforces which invariant and
// what result it had. Today that row is READ. It was also WRITTEN by the same run that produced
// the thing it certifies, which is precisely the arrangement this milestone exists to stop
// trusting — and the predicted failure has already happened here, with evidence subagents
// authoring record docs and recording decisions no node was entitled to make. Reading the
// register more carefully cannot close that. Only re-running it can.
//
// So this lane resolves each row's control to a file, EXECUTES it in a bounded child process
// started by something that did not write it, and confirms the row from what the child did or
// contradicts it. A row that says GREEN over a control that fails is the finding this lane
// exists to produce, and it is reported against the item whose register makes the claim.
//
// ── ONE HOME FOR THE REGISTER GRAMMAR, AND THIS IS NOT IT (ADR-002 §2) ───────────────────────
//
// `fitnessDeclarations` and `redProbeRows` in `src/work/doctor-controls.mjs` already decide which
// lines are declarations, which cell is "enforced by", which cell is the red probe, and what a
// control citation looks like. This module IMPORTS them and re-implements none of it. That module
// is written by nobody in this milestone.
//
// What this module adds is the one thing the register's parser does not offer, because doctor has
// never needed it: the three RECORDED FACTS carried inside a row the one home already located —
// the result token, the recorded failure message, and the recorded size. Those readers
// (`recordedResultIn`, `recordedMessageIn`, `recordedCasesIn`) are token reads over a line the one
// home handed back, never a second walk of the register.
//
// ── THE ORACLE IS THE MESSAGE, AND THE DISPOSITION IS DERIVED FROM IT ────────────────────────
//
// 56's binding constraint, and the reason it binds: nine of this repository's 341 arch gates are
// STANDING RED. On a gate that is already red, breaking the thing it protects changes nothing a
// counter can see — the count before is one failure, the count after is one failure, and the
// instrument reports that nothing happened. 56 also measured the sharper half: banking five real
// violations into a shrink-only ratchet's baseline made the arch set report one FEWER failure,
// 9 -> 8. The gaming move does not evade a count oracle. It IMPROVES it.
//
// So there is no count anywhere on the path to a verdict. `observedMessage()` joins the messages
// the failing cases actually produced; `dispositionOf()` reads "failing" off the PRESENCE of that
// message rather than off any tally; and `verdictFor()` takes a recorded row and one observation
// and returns one of `EVIDENCE_VERDICTS`. The child's exit code is consulted for exactly one
// question — could the control be run at all — and never for whether it passed.
//
// ── THE SIZE CLAIM IS A SEPARATE FINDING, DELIBERATELY (03/…count-recorded…) ─────────────────
//
// A register also records how big its evidence was — nine lanes, twenty-two cases. That number
// decays silently: a suite can lose half its cases and stay green. So the size is re-derived from
// what the RUN produced and compared, and a mismatch is `evidence-size-drift` — its own finding,
// on its own axis. `sizeFor()` never feeds `verdictFor()`, and a control that passes with a drifted
// size is `confirmed` on its result AND separately reported as drift. Making the size an input to
// the verdict would be the count oracle re-entering through the one door this milestone left ajar.
//
// ── EXECUTION IS A CHILD PROCESS, THROUGH 59/01's ONE SEAM (ADR-002 §3) ──────────────────────
//
// 66/ADR-004 §2's refusal is honoured exactly: nothing here imports project code, because
// importing a cited module executes its module scope inside the aof process. Every execution goes
// through `./spawn.mjs` — deadline, kill on expiry, captured output, observed exit code — and the
// thing it starts is `scripts/drive-control.mjs`, a PROGRAM this family spawns rather than a module
// it loads. `node --test <control>` is not used and cannot be: 56 measured it reporting
// "pass 883, fail 0" while 862 of 864 files executed none of their entries.
//
// ── WHAT COULD NOT BE RUN SAYS SO, AND NEVER PASSES FOR HAVING BEEN TRIED ────────────────────
//
// The most dangerous outcome for a re-run lane is the quiet one. Four different things are four
// different findings here, each naming what was attempted: a citation that resolves to nothing
// (`evidence-unrunnable`, naming the path it tried), a control no runner assembles
// (`evidence-unregistered`, naming the runner it looked in), a control that outlived its deadline
// (`evidence-timed-out`, naming the deadline, and explicitly NOT recorded as a failing control —
// "slow" and "broken" are different findings and conflating them is how a flaky gate gets ledgered
// as a real one), and a child that could not be started at all (`evidence-unrunnable`, naming the
// invocation). "It did not run" is never rendered as "it is fine".
//
// ── EVERY SWEEP SAYS WHAT IT READ (ADR-004 §1, AND §1a's CONVERGENCE) ────────────────────────
//
// `runEvidence()` returns `reads` on every run, clean or not, so a lane that found nothing and a
// lane that LOOKED at nothing are distinguishable. The floor lives on the sweep declaration.
//
// AMENDED BY 59/04 (ADR-004 §1a). This lane used to build its read record INLINE — `{...EVIDENCE_
// SWEEP, root, count}`, keyed `id` rather than `sweep` — and performed no floor comparison at all,
// so it was the one lane that could read nothing and say so nowhere. Measured 2026-08-30: the
// census's `readFinding()`, handed that record, rendered `the "undefined" sweep read 0 of a
// required 1 while walking /r`. The record is now built by the ONE definition in `./reads.mjs` and
// put through the SAME floor comparison as every other lane. `EVIDENCE_SWEEP`'s frozen literal is
// unchanged — the obligation was always at the emission site, never in the declaration.
import path from "node:path";
import { stat } from "node:fs/promises";

import { fitnessDeclarations, redProbeRows } from "../work/doctor-controls.mjs";
import { runBounded, DEFAULT_DEADLINE_MS, attemptedCommand } from "./spawn.mjs";
import { limitRecord, readFinding, readRecord } from "./reads.mjs";
import { toolkitProgram } from "./toolkit.mjs";

// The sweep this lane's read record AND its limit are both attributed to. Named once so the two
// cannot drift apart and leave a limit pointing at a sweep no read declares (D-59-3).
const EVIDENCE_SWEEP_ID = "register-rows";

// ── THE FROZEN FINDING CODES ─────────────────────────────────────────────────────────────────
//
// Disjoint from `CONTROL_FINDING_CODES` in `src/work/doctor-controls.mjs` by construction
// (FF-5905): doctor asks whether the documents are coherent, the audit asks whether the
// instruments that produce them still work, and a shared code would let one command's severity
// table decide the other's meaning.
export const EVIDENCE_FINDING_CODES = Object.freeze([
  "evidence-contradicted",
  "evidence-changed",
  "evidence-still-failing",
  "evidence-repaired",
  "evidence-unrunnable",
  "evidence-unregistered",
  "evidence-timed-out",
  "evidence-declares-no-control",
  "evidence-registration-unchecked",
  "evidence-size-drift",
  "evidence-no-register",
  "evidence-none-reproduced",
]);

// ── THE FROZEN VERDICTS ──────────────────────────────────────────────────────────────────────
//
// EVERY row gets exactly one of these, and there is no "skipped" and no absent value: a row with
// no verdict is a row the report passed over in silence, which is this milestone's own subject.
export const EVIDENCE_VERDICTS = Object.freeze([
  "confirmed",
  "contradicted",
  "changed",
  "unchanged",
  "repaired",
  "unrunnable",
  "unregistered",
  "timed-out",
  "no-control",
]);

// The verdicts that mean "the recorded evidence was reproduced by a run". `unrunnable`,
// `unregistered`, `timed-out` and `no-control` are deliberately NOT here — nothing that could not
// be run is counted as evidence.
export const REPRODUCED_VERDICTS = Object.freeze(["confirmed", "contradicted", "changed", "unchanged", "repaired"]);

// ── THE PROGRAM THIS LANE SPAWNS ─────────────────────────────────────────────────────────────
//
// Named as a PATH rather than imported, because it is not a module of ours to load: FF-5904
// refuses a dynamic import inside this family, and the driver's whole job is one. See
// `src/work/audit-drive.mjs`'s header for why it is not a mode of `scripts/test.mjs`.
//
// It is TOOLKIT-relative, and that is 77/ADR-002 §2 (TECH_DEBT 72). It used to be
// `scripts/drive-control.mjs` resolved against the AUDITED root, which exists only in this
// repository — where the audited workspace IS the aof checkout. Everywhere else it named a file
// that was never going to be there, so every register row reported `evidence-unrunnable` and the
// sweep closed at `evidence-none-reproduced`, failing `--strict` on aof's own file layout. Both
// halves were needed: the root had to be derived, AND the program had to move under `src/`, which
// is the only directory a payload install carries.
export const DRIVE_PROGRAM = "src/work/audit-drive.mjs";

// The driver's stdout sentinel. THE SECOND COPY OF A LITERAL THE SEAM WILL NOT LET US IMPORT:
// `src/work-audit/` may not statically import a path outside `src/`, so the two literals are
// physically separate and the only thing that can hold them equal is an assertion that reads
// both — `test/arch/grade/acd-evidence-oracle-is-a-message.test.mjs`, in 66/F-42's shape.
export const DRIVE_RESULT_SENTINEL = "AOF_DRIVE_RESULT ";

// ── WHAT THE REGISTER RECORDED ───────────────────────────────────────────────────────────────

// ── THE RECORDED RESULT COMES FROM THE RESULT COLUMN, AND FROM NOWHERE ELSE ──────────────────
//
// MEASURED OVER ALL 112 REGISTER ROWS IN `wiki/work` (2026-08-30), because the first version of
// this reader token-scanned the whole ROW and got SIX of them wrong in the dangerous direction:
// 52/FF-5207, 52/FF-5208, 54/FF-5408, 57/FF-5702, 57/FF-5703 and 57/FF-5705 all read RED while
// recording nothing of the kind. Two independent causes, and the measurement named both:
//
//   · **Registers do not agree on their columns.** 66's is `id | enforced by | result | red probe`
//     and has a result column. 57's is `id | control | landed | red probe` and 54's is
//     `id | invariant | story | red probe` — NEITHER HAS ONE. 52's declarations have no
//     verification row at all. The word `red` was being read out of prose cells: 57/FF-5703's
//     `landed` cell says *"…which is exactly why the red probe is the only evidence the EXTENSION
//     is armed"*, and 52's cells are long descriptions of what the control asserts.
//   · **A subtraction cannot stand in for a cut.** Removing `probeRow.probe` as a substring
//     removes only the FRAGMENT `redProbeRows` returned, and `tableCells` splits on an unescaped
//     `|` — so a probe cell carrying a pipe inside backticks leaves its tail in the carrier.
//     54/FF-5408's surviving tail is `**1 red:**`.
//
// The consequence was not cosmetic. A `**GREEN**` row in that shape, over a control that now
// fails, yielded `changed` / `[warn] evidence-changed` instead of `contradicted` /
// `[error] evidence-contradicted` — the two verdicts
// `00_the-register-is-re-executed.feature` locks, softened, on input this repository holds today.
//
// SO THE RULE IS THE ONE HOME'S OWN, ONE COLUMN FURTHER OUT. `fitnessDeclarations` distinguishes
// `null` (there is no enforced-by column, so the register never adopted the convention and
// declares no obligation) from `""` (the column exists and is empty). The recorded RESULT is read
// the same way: the cell under the header matching `RESULT_COLUMN`, in the item's own
// `VERIFICATION.md` row that `redProbeRows` located — and **a register with no result column
// records no result**. There is no fallback to an `enforced by` cell, because that cell describes
// a control and has never been a place a result is recorded; reading one out of it is what
// produced four of the six misreads.
//
// A row that records no result still gets a verdict — `verdictFor` reads an absent result as the
// row CLAIMING its invariant holds, which is the loud direction. What is lost is only the
// standing-red comparison, and only for registers that never recorded a result to compare against.
// AND WITHIN THE CELL, THE TOKEN IS THE ONE THE TEMPLATE PUTS FIRST. Cutting the right column is
// necessary and NOT sufficient: a result cell legitimately reads
// "**GREEN** — it holds, and it never carried a `pending` marker, which is exactly why the RED
// PROBE is the only evidence the extension is armed", and a token scan over that cell answers red.
// 66/ADR-005 §1's template writes the result as the cell's LEADING token — `**GREEN** — …`,
// `**RED** — …` — so that is what is read, through whatever emphasis the cell wraps it in.
// Everything after the token is prose about the result, and prose is not a result.
const LEADING_RESULT = /^[\s*`_~]*(green|red|landed)(?![A-Za-z])/iu;

export function recordedResultIn(text) {
  const match = LEADING_RESULT.exec(String(text ?? ""));
  if (match == null) return null;
  return match[1].toLowerCase() === "red" ? "red" : "green";
}

// ── CUTTING A NAMED COLUMN OUT OF A ROW THE ONE HOME LOCATED ─────────────────────────────────
//
// STATED PLAINLY BECAUSE IT IS THE ONE PLACE THIS LANE TOUCHES TABLE MECHANICS. ADR-002 §2 keeps
// the register GRAMMAR in `src/work/doctor-controls.mjs` — which lines are declarations, which
// block declares and which cites, what a control citation is — and every one of those answers is
// still taken from there. But that module exposes exactly two cells (`enforced by`, `red probe`)
// and no way to ask for a third, and it is written by nobody in this milestone. So the cut below
// exists, held to the one home's own rules: split on an UNESCAPED pipe (the house writes an escaped one
// inside a cell), skip the separator row, and take the header from the run of table rows above.
//
// WHEN `work-doctor-controls.mjs` GROWS A COLUMN-BY-HEADER EXTRACTOR, THIS COLLAPSES INTO IT.
// Recorded here rather than left implicit, so the second home is visible to whoever adds the first.
const RESULT_COLUMN = /result/iu;
const CONTROL_COLUMN = /enforced|control/iu;

function rowCells(line) {
  const trimmed = String(line ?? "").trim();
  if (!trimmed.startsWith("|")) return null;
  const parts = trimmed.split(/(?<!\\)\|/u);
  parts.shift();
  if (parts.length > 0 && parts[parts.length - 1].trim() === "") parts.pop();
  return parts;
}

const isSeparatorRow = (cells) => cells.length > 0 && cells.every((cell) => /^\s*:?-{2,}:?\s*$/u.test(cell));

// The header of the table a row belongs to, cut on the language's own structure — the run of table
// rows above it — never a fixed window. A blank line is skipped for the reason the one home skips
// it: a stray blank splits the markdown table while the register BLOCK carries on (66's own
// `VERIFICATION.md` has one).
function headerAbove(lines, lineNumber) {
  let header = null;
  for (let index = lineNumber - 2; index >= 0; index -= 1) {
    const raw = String(lines[index] ?? "");
    if (raw.trim() === "") continue;
    const cells = rowCells(raw);
    if (cells == null) break;
    if (isSeparatorRow(cells)) continue;
    header = cells;
  }
  return header;
}

// The cell under the first header matching `pattern`, or `null` when the table has no such column.
// `null` and `""` are DIFFERENT answers and the caller must keep them apart.
export function cellUnder(lines, lineNumber, pattern) {
  const cells = rowCells(lines[lineNumber - 1]);
  if (cells == null) return null;
  const header = headerAbove(lines, lineNumber);
  if (header == null) return null;
  const index = header.findIndex((cell) => pattern.test(cell));
  if (index < 0) return null;
  return String(cells[index] ?? "");
}

// The size a register row records — "(9 lanes)", "14 lanes", "22 cases". A register that records
// no size is not invented one: `null` is a first-class answer here and
// `03_the-count-recorded-is-the-count-observed.feature` asks for exactly that distinction.
//
// TWO SHAPES, AND THE SECOND IS NARROWER THAN THE FIRST, for the reason above: a parenthesised
// token is unambiguous, while a bare one has to be kept away from prose like "117 test entries".
const RECORDED_SIZE = /\((\d+)\s*(?:lanes?|cases?|tests?|scenarios?|assertions?|checks?)\)|(?<![\w.])(\d+)\s+(?:lanes?|cases?)(?![A-Za-z])/iu;

export function recordedCasesIn(text) {
  const match = RECORDED_SIZE.exec(String(text ?? ""));
  if (match == null) return null;
  const size = Number.parseInt(match[1] ?? match[2], 10);
  return Number.isFinite(size) ? size : null;
}

// The failure message a register row RECORDED, taken from the first carrier that holds one. The
// ORDER is the caller's, because it depends on what the row records: a standing-RED row's failure
// message is its result cell's prose, while a green row's recorded observation is its red-probe
// cell ("what was changed to make it fail, and the message observed", 66/ADR-005 §1).
//
// Backticked spans are unwrapped, because the house writes an observed message inside backticks
// and the backticks are the rendering, never the message.
export function recordedMessageIn(...carriers) {
  for (const carrier of carriers) {
    const raw = String(carrier ?? "").trim();
    if (raw === "") continue;
    const quoted = [...raw.matchAll(/`([^`]+)`/gu)].map((match) => match[1].trim()).filter((part) => part.length > 0);
    if (quoted.length > 0) return quoted.join(" | ");
    return raw;
  }
  return null;
}

// ── THE MESSAGE COMPARISON, AND WHAT IT COMPARED ─────────────────────────────────────────────
//
// A failure message MOVES without changing: a line number shifts when a line is added above it, a
// path separator differs between this machine and the Mac worker, a temp directory carries a pid.
// Reporting `changed` on any of those would make the lane cry wolf on every commit, and a lane
// that cries wolf is a lane somebody mutes — which is the failure mode 56 recorded for gates whose
// rules fire on correct cases.
//
// So the comparison is over a NORMALISED form, and the normalisations are DECLARED here rather
// than buried in a regex chain, because `01_the-oracle-is-the-message.feature` requires the report
// to say which parts of the message it compared.
export const MESSAGE_NORMALISATIONS = Object.freeze([
  Object.freeze({ id: "path-separator", what: "a Windows path separator is read as a forward slash", why: "the same control produces `test\\arch\\x.mjs` here and `test/arch/x.mjs` on the Mac worker" }),
  Object.freeze({ id: "line-locator", what: "a `:line:column`, `:line` or `#Lline` locator on a path is dropped", why: "a line number moves when a line is inserted above it; the assertion did not change" }),
  Object.freeze({ id: "absolute-prefix", what: "an absolute path is reduced to the repo-relative tail it ends with", why: "a worktree, a temp clone and a checkout produce three prefixes for one file" }),
  Object.freeze({ id: "transient-digits", what: "a run-scoped digit run (a pid, a port, a temp-dir suffix) is read as a placeholder", why: "the message is the same message on the second run" }),
  Object.freeze({ id: "whitespace", what: "runs of whitespace collapse to one space and the ends are trimmed", why: "a reflowed message is the same message" }),
]);

const ABSOLUTE_PREFIX = /(?:[A-Za-z]:)?(?:\/[^\s"'`:]*?)?\/((?:src|test|scripts|wiki|app|ui|bin|schemas)\/[^\s"'`:]+)/gu;
const LINE_LOCATOR = /(?:#L\d+(?:-L?\d+)?|:\d+(?::\d+)?)(?=$|[\s"'`,)\]}])/gu;
const TRANSIENT_DIGITS = /(?<=[-_/])\d{3,}/gu;

// PURE. The form two messages are compared in. Every step corresponds to one entry of
// `MESSAGE_NORMALISATIONS`, in that order, so the declaration and the code cannot drift into two
// different rules.
export function normalizeMessage(text) {
  if (text == null) return null;
  let form = String(text).replaceAll("\\", "/");
  form = form.replace(ABSOLUTE_PREFIX, (_match, tail) => tail);
  form = form.replace(LINE_LOCATOR, "");
  form = form.replace(TRANSIENT_DIGITS, "N");
  return form.replace(/\s+/gu, " ").trim();
}

// PURE. Do two messages say the same thing? Absence on either side is NOT agreement: a recorded
// message that is missing cannot agree with an observed one, and answering `true` there would let
// a register with no recorded message confirm itself.
export function messagesAgree(recorded, observed) {
  const left = normalizeMessage(recorded);
  const right = normalizeMessage(observed);
  if (left == null || right == null || left === "" || right === "") return false;
  return left === right;
}

// ── WHAT THE CHILD OBSERVED ──────────────────────────────────────────────────────────────────

// PURE. The message the control ACTUALLY PRODUCED — every case that failed, named, joined. This
// is the oracle. It is built from the text the child reported and from nothing else; a control
// that produced no failure text produces no message, which is what `dispositionOf` reads.
export function observedMessage(caseReports) {
  if (!Array.isArray(caseReports)) return null;
  const broken = caseReports.filter((report) => report?.ok !== true);
  if (broken.length === 0) return null;
  return broken.map((report) => `${report?.name ?? "<unnamed case>"}: ${String(report?.message ?? "the case failed and produced no message").trim()}`).join(" ;; ");
}

// PURE, AND THE HINGE OF ADR-004 §3. The disposition is read off the PRESENCE of a failure
// message, never off a tally of how many cases produced one. That is what makes a standing-red
// gate legible: two runs of one failing gate have identical tallies and different messages, and
// this lane sees the difference the counter cannot.
export function dispositionOf(message) {
  return message == null || String(message).trim() === "" ? "passing" : "failing";
}

// ── THE VERDICT ──────────────────────────────────────────────────────────────────────────────
//
// PURE, and its inputs are exactly (what the register recorded, what one child observed). There
// is no third argument and no closure: with `observation` withheld the answer is `unrunnable`,
// which is FF-5906's sharpest leg — a lane that can agree with its input without running anything
// has not re-run anything.
export function verdictFor(recorded, observation) {
  if (recorded?.controls != null && recorded.controls.length === 0) return "no-control";
  if (observation == null) return "unrunnable";
  if (observation.status === "unresolved" || observation.status === "not-started") return "unrunnable";
  if (observation.status === "unregistered") return "unregistered";
  if (observation.status === "deadline-expired") return "timed-out";
  if (observation.status !== "ran") return "unrunnable";

  const observedDisposition = dispositionOf(observation.message);
  // A row that records no result is read as CLAIMING the invariant holds: a register row exists
  // to say "this control enforces this invariant", and a row with a landed control and no
  // recorded failure is that claim. `pending` is the declared exception and reads as no claim,
  // which `recordedResultIn` already answers with `null` — so a pending row lands here only when
  // it also carries a result token, and then the token is what it says.
  const claimed = recorded?.result === "red" ? "red" : "green";

  if (claimed === "green") return observedDisposition === "passing" ? "confirmed" : "contradicted";
  // A STANDING-RED ROW. This is where the count oracle goes blind and the message does not.
  if (observedDisposition === "passing") return "repaired";
  return messagesAgree(recorded?.message, observation.message) ? "unchanged" : "changed";
}

// ── THE SIZE CLAIM, ON ITS OWN AXIS ──────────────────────────────────────────────────────────
//
// The four answers a size claim can have. `confirmed` is spelled the same as a verdict and that is
// a WORD, not an axis: the register confirms a size the same way it confirms a result, and the
// separation this milestone needs is that `sizeFor`'s answer never reaches `verdictFor`, which is
// asserted structurally rather than by keeping two vocabularies apart.
export const SIZE_KINDS = Object.freeze(["no-size", "unobserved", "confirmed", "drift"]);

// PURE, and deliberately NOT an input to `verdictFor`. A recorded size that no longer matches is
// drift; it is reported as its own finding and it changes no pass-or-fail verdict.
export function sizeFor(recorded, observation) {
  if (recorded?.cases == null) return Object.freeze({ kind: "no-size", recorded: null, observed: observation?.cases ?? null, direction: null });
  if (observation == null || observation.cases == null) {
    return Object.freeze({ kind: "unobserved", recorded: recorded.cases, observed: null, direction: null });
  }
  if (recorded.cases === observation.cases) return Object.freeze({ kind: "confirmed", recorded: recorded.cases, observed: observation.cases, direction: null });
  return Object.freeze({
    kind: "drift",
    recorded: recorded.cases,
    observed: observation.cases,
    direction: observation.cases < recorded.cases ? "smaller" : "larger",
  });
}

// ── READING THE REGISTER, THROUGH THE ONE HOME ───────────────────────────────────────────────

const docPathOf = (item, name) => path.join(String(item?.dir ?? ""), name);

// A register cell with its own CITED CONTROL PATHS subtracted, so a token read over what remains
// is reading the register's prose rather than the citation's spelling.
//
// FOUND BY THE FIXTURES, AND IT IS THE SAME SPECIES AS THE PROBE-CELL SUBTRACTION ABOVE: a row
// enforced by `test/arch/red-a.test.mjs` was read as RECORDING A RED RESULT, because `red-a` is
// the word `red` with non-letters on both sides. The row said nothing of the kind — the control's
// FILENAME did — and the consequence was a real contradiction reported as a mere message change,
// which is the softer verdict and therefore the dangerous direction of the error.
function withoutCitedPaths(cell, controls) {
  let out = String(cell ?? "");
  for (const control of controls ?? []) {
    // The citation may be written repo-relative or with a `../` prefix and a locator suffix; the
    // basename is the part that always appears, and it is the part carrying the trap.
    out = out.split(control).join(" ").split(control.split("/").pop()).join(" ");
  }
  return out;
}

// Every recorded row an item's register declares, as this lane needs them. The DECLARATION set,
// the enforced-by cell and the cited control paths all come from `fitnessDeclarations`; the
// red-probe cell comes from `redProbeRows`; this module contributes only the three token reads
// over lines those two already located.
export function recordedRowsFor(item) {
  const texts = item?.docTexts != null && typeof item.docTexts === "object" ? item.docTexts : {};
  const architecture = texts["ARCHITECTURE.md"];
  if (typeof architecture !== "string") return [];
  const declared = fitnessDeclarations(architecture, "ARCHITECTURE.md");
  if (declared.length === 0) return [];

  const verification = typeof texts["VERIFICATION.md"] === "string" ? texts["VERIFICATION.md"] : "";
  const verificationLines = verification.split(/\r?\n/);
  const probeRows = verification === "" ? new Map() : redProbeRows(verification, "VERIFICATION.md");
  const register = docPathOf(item, "ARCHITECTURE.md");

  return declared.map((declaration) => {
    const probeRow = probeRows.get(declaration.id) ?? null;
    const recordedLine = probeRow == null ? "" : String(verificationLines[probeRow.line - 1] ?? "");
    // THE PROBE CELL IS SUBTRACTED BEFORE ANYTHING ELSE IS READ. `redProbeRows` already located
    // it, so removing it is not a second parse of the table — it is the one home's own answer
    // used to keep the remaining cells legible. Without it a red probe reading "3 of 7 lanes
    // red" makes a GREEN row read red and a 9-lane row read 7 (measured against 66's shipped
    // register, which has both shapes).
    // THE THREE CELLS ARE CUT BY HEADER, NEVER SUBTRACTED FROM THE ROW. A subtraction leaves
    // whatever it failed to identify inside the carrier, and `redProbeRows` returns only the
    // FRAGMENT of a probe cell that precedes an unescaped pipe — 54/FF-5408's tail `**1 red:**`
    // survived one and made a green row read red. Cutting by column leaves a split probe cell's
    // tail in the cells AFTER it, where no reader below is looking.
    const resultCell = probeRow == null ? null : cellUnder(verificationLines, probeRow.line, RESULT_COLUMN);
    const controlCell = probeRow == null ? null : cellUnder(verificationLines, probeRow.line, CONTROL_COLUMN);
    // `null` (this register has no result column, so it never adopted the convention and records
    // no result) is distinguished from `""` (the column is there and empty) — `fitnessDeclarations`
    // draws the same line for `enforcedBy`, and measured over `wiki/work` it is the difference
    // between reading 57's `landed` prose as a result and reading nothing at all.
    const result = recordedResultIn(withoutCitedPaths(resultCell, declaration.controls));
    return Object.freeze({
      id: declaration.id,
      item: item?.ref ?? item?.name ?? null,
      register,
      verification: probeRow == null ? null : docPathOf(item, "VERIFICATION.md"),
      line: declaration.line,
      entry: declaration.entry,
      controls: Object.freeze([...declaration.controls]),
      pending: declaration.pending,
      result,
      // THE RED-PROBE CELL IS THE CONTRACTUAL HOME of a recorded observation — "what was changed
      // to make it fail, and THE MESSAGE OBSERVED" (66/ADR-005 §1) — so it leads whatever the row
      // records; a standing-red row's result cell is the fallback. The backtick unwrap is what
      // keeps the recorded message to the parts the register actually quoted.
      message: recordedMessageIn(probeRow?.probe, resultCell),
      // The SIZE rides in the control cell ("`x.test.mjs` (9 lanes)"), and the declaration's own
      // enforced-by cell is the fallback for a register that carries no verification row.
      cases: recordedCasesIn(controlCell) ?? recordedCasesIn(withoutCitedPaths(declaration.enforcedBy, declaration.controls)),
    });
  });
}

// ── EXECUTION ────────────────────────────────────────────────────────────────────────────────

const onDisk = async (absolute) => {
  try {
    return (await stat(absolute)).isFile();
  } catch {
    return false;
  }
};

// PURE. The child's answer, cut out of its stdout. The sentinel is why a control that prints is
// not mistaken for the report, and why a TRUNCATED read is detectable rather than silently read
// as an empty suite: the last sentinel line is the answer, and no sentinel line at all is an
// error with the output it did get.
export function parseDriveOutput(stdout) {
  const lines = String(stdout ?? "").split(/\r?\n/).filter((line) => line.startsWith(DRIVE_RESULT_SENTINEL));
  if (lines.length === 0) return { payload: null, error: "the driver produced no result line — its answer is prefixed with a sentinel precisely so a partial read is visible" };
  try {
    return { payload: JSON.parse(lines[lines.length - 1].slice(DRIVE_RESULT_SENTINEL.length)), error: null };
  } catch (error) {
    return { payload: null, error: `the driver's answer did not parse (${error?.message ?? String(error)}) — a partial read is reported, never treated as a control that passed` };
  }
}

// Run ONE control in ONE bounded child, and report what was observed. Never memoised: a control
// cited by two rows is run for each row it is cited by, so that neither row's verdict is inferred
// from the other's (00_the-register-is-re-executed.feature).
export async function driveControl({
  repoRoot,
  control,
  deadlineMs = DEFAULT_DEADLINE_MS,
  spawn = runBounded,
  execPath = process.execPath,
  driveProgram = DRIVE_PROGRAM,
} = {}) {
  // TWO ROOTS, NAMED APART (77/ADR-002 §1). The DRIVER comes from the toolkit root — where aof was
  // installed — and the CONTROL, like the child's working directory, stays the subject's.
  const program = toolkitProgram(driveProgram);
  const target = path.resolve(repoRoot ?? ".", control);
  const attempted = attemptedCommand(execPath, [program, target]);
  const result = await spawn({ command: execPath, args: [program, target], cwd: repoRoot, deadlineMs });

  if (result.outcome === "deadline-expired") {
    return Object.freeze({
      control, status: "deadline-expired", attempted, deadlineMs: result.deadlineMs,
      message: null, cases: null, caseReports: null,
      detail: `${attempted} did not finish within its ${result.deadlineMs}ms deadline and was killed`,
    });
  }
  if (result.outcome === "not-started") {
    return Object.freeze({
      control, status: "not-started", attempted, deadlineMs: result.deadlineMs,
      message: null, cases: null, caseReports: null,
      detail: result.error ?? `${attempted} could not be started`,
    });
  }

  // THE OBSERVED EXIT CODE AND THE CAPTURED OUTPUT, and each answers exactly one question.
  // The exit code answers "could the control be run at all" — the driver exits 0 when it DROVE
  // the control, whatever its cases did, and 1 when it could not load or could not find anything
  // to run. It never answers "did it pass": that is the message's job, below, and it is the whole
  // of ADR-004 §3. Both halves must agree before an observation is treated as a run.
  // A CONTROL THAT EXECUTED NOTHING IS NOT EVIDENCE, and `cases: []` is refused here as well as in
  // the driver (whose `isDrivable` already requires a non-empty array). Defence in depth on one
  // specific shape rather than in general: "green while executing nothing" is what spike 56
  // measured over 862 of 864 files, and it is the single failure this milestone exists to catch.
  const { payload, error } = parseDriveOutput(result.stdout);
  if (result.exitCode !== 0 || payload == null || payload.ok !== true || !Array.isArray(payload.cases) || payload.cases.length === 0) {
    const said = payload?.error ?? error ?? `the driver exited ${result.exitCode} and reported no cases`;
    return Object.freeze({
      control, status: "not-started", attempted, deadlineMs: result.deadlineMs,
      message: null, cases: null, caseReports: null,
      detail: `${attempted} did not drive the control (exit ${result.exitCode}): ${said}${result.stderr ? ` — ${result.stderr.trim().split("\n").slice(-2).join(" | ")}` : ""}`,
    });
  }

  const caseReports = Object.freeze(payload.cases.map((report) => Object.freeze({ name: String(report?.name ?? ""), ok: report?.ok === true, message: report?.message ?? null })));
  return Object.freeze({
    control,
    status: "ran",
    attempted,
    deadlineMs: result.deadlineMs,
    // The oracle, and the SIZE the run produced — the number of cases that executed, never a
    // number read out of the file's text.
    message: observedMessage(caseReports),
    cases: caseReports.length,
    caseReports,
    detail: `${attempted} exited ${result.exitCode} having run ${caseReports.length} case(s) in a bounded child process`,
  });
}

// Resolve, then check registration, then run. Each refusal names WHAT WAS TRIED, and the three are
// three verdicts rather than one: the path it tried to resolve, the runner it looked in, and the
// deadline it applied (02_evidence-that-cannot-run-says-so.feature).
export async function observeControl({
  repoRoot,
  control,
  registration = null,
  deadlineMs = DEFAULT_DEADLINE_MS,
  spawn = runBounded,
  execPath = process.execPath,
  driveProgram = DRIVE_PROGRAM,
  exists = onDisk,
} = {}) {
  const absolute = path.resolve(repoRoot ?? ".", control);
  if (!(await exists(absolute))) {
    return Object.freeze({
      control, status: "unresolved", attempted: absolute, deadlineMs,
      message: null, cases: null, caseReports: null,
      detail: `the cited control was resolved to ${absolute} and there is no file there`,
    });
  }
  if (registration != null && typeof registration.assembles === "function" && registration.assembles(control) !== true) {
    return Object.freeze({
      control, status: "unregistered", attempted: registration.runner ?? "the configured runner", deadlineMs,
      message: null, cases: null, caseReports: null,
      detail: `${control} is a file on disk and ${registration.runner ?? "the configured runner"} assembles nothing named by it — a control no runner reaches never runs, so re-running it here would be evidence about something CI does not execute`,
    });
  }
  return await driveControl({ repoRoot, control, deadlineMs, spawn, execPath, driveProgram });
}

// ── THE SWEEP DECLARATION (ADR-004 §1) ───────────────────────────────────────────────────────
//
// One sweep, its root named per run, and a floor. The `audit-ran-on-nothing` EMISSION belongs to
// the lane registry (FF-5908) so one home decides it for every lane; what belongs here is that a
// clean result cannot be expressed without a read count.
// THE QUESTION THIS LANE CANNOT ANSWER ON ITS OWN, DECLARED RATHER THAN CHECKED FOR.
//
// Registration — "does any runner assemble this control?" — is not something the evidence lane can
// decide; the census owns it (59/01) and the face joins them (59/04). With no registration answer
// handed in, the `unregistered` verdict is UNREACHABLE, and the first version of this module let
// that happen in silence: a cited control on disk that `scripts/test.mjs` never assembles was
// driven, passed, and reported `confirmed`. That renders "it does not run in CI" as "it is fine",
// which is the exact substitution ADR-004 §1 exists to forbid.
//
// So the absence is DECLARED on every run — in `limits`, and once per item as a finding, in the
// house's honest-no-op idiom (`control-runner-unchecked`: "when the runner list is absent leg B
// does not run and SAYS SO", `src/work/doctor-controls.mjs`). A clean result that never asked the
// question now says it never asked.
export const REGISTRATION_LIMIT = limitRecord({
  sweep: EVIDENCE_SWEEP_ID,
  question: "does any runner assemble this control?",
  answeredBy: "the census lane's assembled-suite read (src/work-audit/census.mjs), handed in as `registration`",
  consequence: "with no answer, `unregistered` is unreachable and a control no runner assembles is re-run and reported on its result alone",
});

export const EVIDENCE_SWEEP = Object.freeze({
  id: EVIDENCE_SWEEP_ID,
  what: "every (fitness-register row, cited control) pair in scope, each executed in its own bounded child process — a row citing two controls is two runs and two verdicts",
  floor: 1,
  basis: "runtime",
});

// ── THE LANE ─────────────────────────────────────────────────────────────────────────────────

const severityOf = (item) => (String(item?.meta?.status ?? "") === "done" ? "warn" : "error");

// The root a sweep walked: the item directory when one item is in scope, their shared parent when
// several are, and the requested scope when no register was found at all.
function sweepRoot(registers, scope) {
  if (registers.length === 0) return String(scope ?? "<no register in scope>");
  const dirs = registers.map((register) => path.dirname(register));
  let root = dirs[0];
  for (const dir of dirs.slice(1)) {
    while (root.length > 0 && !dir.startsWith(root)) root = path.dirname(root);
  }
  return root.length > 0 ? root : String(scope ?? "<no register in scope>");
}

function scopeMatches(item, scope) {
  if (scope == null || String(scope).trim() === "") return true;
  const wanted = String(scope).trim();
  return [item?.ref, item?.number, item?.name, item?.slug].filter((value) => value != null).map(String).includes(wanted);
}

// Run the evidence lane. Returns `{ scope, rows, findings, reads, comparison }` — and `rows` and
// `reads` are present and complete whether or not `findings` is empty, because a clean sweep still
// says which item it read and how many rows it re-ran.
export async function runEvidence({
  repoRoot,
  items = [],
  scope = null,
  registration = null,
  deadlineMs = DEFAULT_DEADLINE_MS,
  deadlines = null,
  spawn = runBounded,
  execPath = process.execPath,
  driveProgram = DRIVE_PROGRAM,
  exists = onDisk,
  observe = observeControl,
} = {}) {
  const inScope = (items ?? []).filter((item) => scopeMatches(item, scope));
  // Whether the registration question was ASKED. `null` is a legitimate caller state — 59/04 joins
  // the census to this lane — but it is never a silent one.
  const registrationChecked = registration != null && typeof registration.assembles === "function";
  const findings = [];
  const rows = [];
  const registers = [];

  for (const item of inScope) {
    const severity = severityOf(item);
    const recordedRows = recordedRowsFor(item);
    const register = docPathOf(item, "ARCHITECTURE.md");

    if (recordedRows.length === 0) {
      // NOT REPORTED AS CLEAN. An item with no register declares no controls, and saying so is a
      // different statement from saying its controls all held.
      findings.push(Object.freeze({
        code: "evidence-no-register",
        severity: "warn",
        path: register,
        message: `${item?.ref ?? item?.name ?? register} declares no fitness register, so this lane re-ran nothing here — it is reported as declaring no controls, which is not the same as clean`,
      }));
      continue;
    }
    registers.push(register);

    // THE HONEST NO-OP, once per ITEM and never once per row (doctor's own cardinality: "the
    // collision is one fact about the stream, not one per participant").
    if (!registrationChecked) {
      findings.push(Object.freeze({
        code: "evidence-registration-unchecked",
        severity: "warn",
        path: register,
        message: `${recordedRows.length} row(s) here were re-run without an answer to "${REGISTRATION_LIMIT.question}" — no registration was handed to this sweep, so ${REGISTRATION_LIMIT.consequence}. The answer comes from ${REGISTRATION_LIMIT.answeredBy}.`,
      }));
    }

    for (const recorded of recordedRows) {
      if (recorded.controls.length === 0) {
        rows.push(Object.freeze({
          id: recorded.id, item: recorded.item, register, control: null,
          verdict: "no-control", basis: "not-executed", attempted: null, deadlineMs: null,
          recorded, observed: null, size: sizeFor(recorded, null),
          evidence: `${recorded.id} names no control path, so there was nothing to execute`,
        }));
        findings.push(Object.freeze({
          code: "evidence-declares-no-control",
          severity: "warn",
          path: register,
          message: `${recorded.id} (line ${recorded.line}) names no control this lane could run — the row declares an invariant and cites nothing that could be executed to check it`,
        }));
        continue;
      }

      // A control cited by more than one row is run FOR EACH ROW it is cited by; nothing is
      // memoised by control path, so no row's verdict can be inferred from another's.
      for (const control of recorded.controls) {
        const bound = deadlines?.[control] ?? deadlineMs;
        const observation = await observe({ repoRoot, control, registration, deadlineMs: bound, spawn, execPath, driveProgram, exists });
        const verdict = verdictFor(recorded, observation);
        const size = sizeFor(recorded, observation);
        const executed = observation?.status === "ran";

        rows.push(Object.freeze({
          id: recorded.id,
          item: recorded.item,
          register,
          control,
          verdict,
          basis: executed ? "executed" : "not-executed",
          registrationChecked,
          attempted: observation?.attempted ?? null,
          deadlineMs: observation?.deadlineMs ?? bound,
          recorded,
          observed: observation,
          size,
          comparedRecordedForm: normalizeMessage(recorded.message),
          comparedObservedForm: normalizeMessage(observation?.message ?? null),
          evidence: executed
            ? `${control} was EXECUTED, not read: ${observation.detail}`
            : `${control} was not executed — ${observation?.detail ?? "no result was produced by a run, so nothing about this row was reproduced"}`,
        }));

        findings.push(...findingsForRow({ recorded, control, register, verdict, observation, size, severity, bound }));
      }
    }
  }

  const reproduced = rows.filter((row) => REPRODUCED_VERDICTS.includes(row.verdict));
  // One severity for the whole sweep, taken from the items it read rather than from a literal: an
  // `error` is admissible only while something in scope is still open.
  const sweepSeverity = inScope.some((item) => severityOf(item) === "error") ? "error" : "warn";
  if (rows.length > 0 && reproduced.length === 0) {
    findings.push(Object.freeze({
      code: "evidence-none-reproduced",
      // The ITEM'S severity, not a literal: every per-row finding for a `done` item is downgraded
      // to `warn` by `severityOf` (an accepted record is immutable, therefore un-actionable —
      // 66/ADR-002's acceptance horizon), and a sweep-level finding that stayed `error` would be
      // the one loud thing on a record nobody may edit.
      severity: sweepSeverity,
      path: registers[0] ?? String(scope ?? ""),
      message: `no evidence was reproduced: ${rows.length} register row(s) were read and not one of their controls was executed, so nothing here confirms anything — a row that could not be run is never counted as evidence for the claim it makes`,
    }));
  }

  // THE READ RECORD, and `count` matches what `EVIDENCE_SWEEP.what` declares: one entry per
  // (row, cited control), because that is the population actually executed — a row citing two
  // controls is two runs and two verdicts. `root` is the DIRECTORY walked, not a list of files,
  // and it is supplied per call because this lane walks whichever registers it was handed.
  //
  // AND IT IS PUT THROUGH THE FLOOR (59/ADR-004 §1a). A register sweep that re-ran nothing now
  // says so in the same words, with the same code and the same severity, as the census and the
  // checks leaf. Before this it emitted nothing at all, which is exactly the "looked at nothing"
  // case §1 exists to make visible.
  const read = readRecord(EVIDENCE_SWEEP, rows.length, sweepRoot(registers, scope));
  const ranOnNothing = readFinding(read);
  if (ranOnNothing != null) findings.push(ranOnNothing);

  return Object.freeze({
    scope: Object.freeze({
      requested: scope ?? null,
      items: Object.freeze(inScope.map((item) => item?.ref ?? item?.name ?? null)),
      registers: Object.freeze([...registers]),
    }),
    rows: Object.freeze(rows),
    findings: Object.freeze(findings),
    reads: Object.freeze([read]),
    reproduced: Object.freeze(reproduced.map((row) => `${row.id} (${row.control})`)),
    comparison: MESSAGE_NORMALISATIONS,
    // WHAT THIS SWEEP COULD NOT SEE, on every run — clean or not. A limit quoted only into findings
    // says nothing in exactly the case where a reader most needs it (59/01's own review finding).
    limits: Object.freeze(registrationChecked ? [] : [REGISTRATION_LIMIT]),
    registrationChecked,
  });
}

// PURE. One row's verdict rendered as findings. A `confirmed` row emits none — it is the clean
// case, and the report's own `rows` entry carries "was EXECUTED, not read" for it.
export function findingsForRow({ recorded, control, register, verdict, observation, size, severity = "error", bound = DEFAULT_DEADLINE_MS }) {
  const out = [];
  const at = observation?.deadlineMs ?? bound;

  if (verdict === "contradicted") {
    out.push(Object.freeze({
      code: "evidence-contradicted",
      severity,
      path: register,
      // WHAT THE ROW ACTUALLY RECORDED, in three cases rather than two. A row whose register has
      // no result column records NOTHING — measured, that is 63 of this tree's 112 rows — and
      // calling that "a green result" puts a claim in the register's mouth that it never made.
      // The verdict is unchanged either way: an absent result is read as the row claiming its
      // invariant holds, which is what the run has just contradicted.
      message: `${recorded.id} ${recorded.result == null ? "records no result over" : recorded.result === "red" ? "records a result over" : "records a green result over"} ${control}${recorded.result == null ? " and declares it enforces an invariant" : ""}, and running it says otherwise. The control was EXECUTED, not read, and it produced: ${observation?.message ?? "<no message>"}`,
    }));
  } else if (verdict === "changed") {
    out.push(Object.freeze({
      code: "evidence-changed",
      severity,
      path: register,
      message: `${recorded.id}'s control ${control} was already failing when its result was recorded and it now fails DIFFERENTLY. Recorded: ${recorded.message ?? "<nothing recorded>"}. Observed: ${observation?.message ?? "<no message>"}. Compared after normalising ${MESSAGE_NORMALISATIONS.map((rule) => rule.id).join(", ")} — the count is identical either way, which is why the message is the oracle`,
    }));
  } else if (verdict === "unchanged") {
    out.push(Object.freeze({
      code: "evidence-still-failing",
      severity: "warn",
      path: register,
      message: `${recorded.id}'s control ${control} is STILL FAILING, the same way it was when the result was recorded: ${observation?.message ?? "<no message>"}. Unchanged is not fixed`,
    }));
  } else if (verdict === "repaired") {
    out.push(Object.freeze({
      code: "evidence-repaired",
      severity: "warn",
      path: register,
      message: `${recorded.id}'s control ${control} was failing when its result was recorded and it now passes — the recorded result is out of date. Recorded: ${recorded.message ?? "<nothing recorded>"}`,
    }));
  } else if (verdict === "unrunnable") {
    out.push(Object.freeze({
      code: "evidence-unrunnable",
      severity,
      path: register,
      message: `${recorded.id} cites ${control} and this lane could not run it, so nothing here confirms the row. What was tried: ${observation?.detail ?? `no result was produced for ${control}`}`,
    }));
  } else if (verdict === "unregistered") {
    out.push(Object.freeze({
      code: "evidence-unregistered",
      severity,
      path: register,
      message: `${recorded.id} cites ${control}, which IS on disk and which no runner assembles. What was tried: ${observation?.detail ?? `looked in ${observation?.attempted ?? "the configured runner"}`}`,
    }));
  } else if (verdict === "timed-out") {
    out.push(Object.freeze({
      code: "evidence-timed-out",
      severity: "warn",
      path: register,
      message: `${recorded.id}'s control ${control} did not finish within the ${at}ms deadline applied to it and was killed. This is NOT reported as a failing control: slow and broken are different findings, and ledgering one as the other is how a flaky gate becomes a real one. What was tried: ${observation?.detail ?? "<nothing recorded>"}`,
    }));
  }

  if (size?.kind === "drift") {
    out.push(Object.freeze({
      code: "evidence-size-drift",
      severity: "warn",
      path: register,
      message: `${recorded.id} records ${size.recorded} case(s) for ${control} and the run produced ${size.observed} — the recorded size drifted ${size.direction}. The observed number is what EXECUTED, not what the file's text declares, and this changes no pass-or-fail verdict for this row`,
    }));
  }
  return out;
}
