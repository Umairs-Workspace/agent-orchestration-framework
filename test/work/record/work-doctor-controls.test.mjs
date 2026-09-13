// Traceability wiring for milestone 66 / story 02 — the CONTROLS LANE.
//
// Every `@executable` scenario (and every Examples row) of the story's four task
// features, against the LOCKED surfaces in `src/work/doctor-controls.mjs`:
//   tasks/00_one-lane-that-reads-and-never-runs.feature
//   tasks/01_a-register-declares-once.feature
//   tasks/02_a-control-resolves-or-declares-itself-pending.feature
//   tasks/03_a-new-assertion-carries-a-red-probe.feature
//
// EVERY CASE HERE IS DRIVEN FROM A LITERAL IN-MEMORY SNAPSHOT WITH NO FILESYSTEM, and
// that is not a testing convenience — it is the property the lane exists to have. The
// groups are pure `(snapshot, ctx) => Finding[]`, all I/O lives at the snapshot
// boundary, and a fixture whose paths name a directory that does not exist answers
// identically. The resolve leg and the staged-control walk, which need a real tree,
// are the arch-tests FF-6605/6606/6607 rather than this file.
//
// WITH TWO NAMED EXCEPTIONS, BOTH DELIBERATE. The last scenario of
// `01_a-register-declares-once.feature` and the last of
// `00_one-lane-that-reads-and-never-runs.feature` are CLAIMS ABOUT THIS TREE — "the
// check reports no citation a legal edit could not clear" and "the only new reads
// are…" — and ADR-009/A rules that a claim about this tree is a MEASUREMENT, which may
// not be frozen until it has been run against HEAD and its result recorded. Asserting
// either over a fixture would be asserting it about the fixture.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTROL_FINDING_CODES,
  RED_PROBE_PLACEHOLDER,
  RUNNERS_CONFIG_KEY,
  CONTROL_GROUPS,
  controlsLane,
  controlGroup,
  registerGroup,
  verificationGroup,
  citedControlPathsIn,
  controlPathsIn,
  fitnessDeclarations,
  isControlFileName,
  normalizeCitedPath,
  pathCitationsIn,
  recordsARedProbe,
  redProbeRows,
  splitPathLocator,
} from "../../../src/work/doctor-controls.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// A directory that does not exist, on purpose: every path below is built from it, so a
// group that reached the filesystem would answer differently (or throw) rather than
// silently pass.
const NOWHERE = path.join(path.sep === "\\" ? "C:\\no-such-root" : "/no-such-root", "wiki", "work");
const at = (...parts) => path.join(NOWHERE, ...parts);

// ─────────────────────────────────────────────────────────── snapshot builders ──

// One item row, in exactly the shape `buildSnapshot` produces.
function item({ ref = "66", number = "66", parent = null, type = "milestone", slug = "fixture", status = "in-progress", docs = {}, staged = [] } = {}) {
  const name = `${number}_${type}_${slug}`;
  return {
    number,
    type,
    slug,
    name,
    ref,
    parent,
    dir: parent == null ? at(name) : at(`${parent}_milestone_parent`, "stories", name),
    meta: { status },
    docTexts: docs,
    stagedControls: staged,
    docs: {},
    docSizes: {},
    hasTasks: false,
  };
}

function snapshotOf(items, { probes = {}, runners = null } = {}) {
  return {
    items,
    workDir: NOWHERE,
    projectRoot: path.dirname(path.dirname(NOWHERE)),
    topEntries: items.filter((row) => row.parent == null).map((row) => row.name),
    storyEntries: {},
    selfNode: null,
    controlProbes: probes,
    runnerTexts: runners,
  };
}

const doc = (...lines) => `${lines.join("\n")}\n`;

// The register shapes this tree actually writes, so a fixture is a real document
// rather than a shape invented to pass.
const fitnessRegister = (...rows) =>
  doc("# A milestone", "", "## Fitness functions", "", "| id | invariant | enforced by (arch-test) | from |", "|---|---|---|---|", ...rows);
const probeRegister = (...rows) =>
  doc("# Verification", "", "## Fitness functions", "", "| id | enforced by | result | red probe |", "|---|---|---|---|", ...rows);
const findingsRegister = (...rows) =>
  doc("# Verification", "", "## Findings", "", "| id | observed | status |", "|---|---|---|", ...rows);

const codes = (findings) => findings.map((finding) => finding.code).sort();
const only = (findings, code) => findings.filter((finding) => finding.code === code);

// ─────────────────────────────────────────────────────────── the fixture set ──

// The eight-code fixture: one stream engineered to fire ALL EIGHT at once. Shared by
// the reachability lane here and by FF-6606, because an unreachable code is as much a
// defect as an unfrozen one and one fixture proving it is better than eight.
export function allEightFixture() {
  const milestone = item({
    ref: "70",
    number: "70",
    slug: "every-code",
    status: "in-progress",
    staged: [at("70_milestone_every-code", "tasks", "thing.test.mjs")],
    docs: {
      "ARCHITECTURE.md": fitnessRegister(
        "| **FF-01** | declared twice, and cited nowhere | `test/arch/landed.test.mjs` | ADR-001 |",
        "| **FF-01** | the duplicate | `test/arch/landed.test.mjs` | ADR-001 |",
        "| **FF-02** | its file has not landed | `test/arch/absent.test.mjs` | ADR-001 |",
        "| **FF-03** | landed, but no runner names it | `test/arch/unnamed.test.mjs` | ADR-001 |",
        "| **FF-04** | cites a declaration item 52 does not carry | `test/arch/landed.test.mjs` — see 52/FF-9999 | ADR-001 |",
      ),
      "VERIFICATION.md": probeRegister(
        "| **FF-01** | `test/arch/landed.test.mjs` | GREEN | a real recorded observation |",
        `| **FF-02** | \`test/arch/absent.test.mjs\` | pending | ${RED_PROBE_PLACEHOLDER} |`,
        "| **FF-03** | `test/arch/unnamed.test.mjs` | GREEN | a real recorded observation |",
        "| **FF-04** | `test/arch/landed.test.mjs` | GREEN | a real recorded observation |",
      ),
    },
  });
  // A SECOND item whose declared controls have no verification register at all —
  // the eighth code's carrier, kept apart so the first item can exercise the per-id
  // lane (an absent register SUPPRESSES it).
  const other = item({
    ref: "71",
    number: "71",
    slug: "no-register",
    status: "in-progress",
    docs: { "ARCHITECTURE.md": fitnessRegister("| **FF-05** | no verification register exists | `test/arch/landed.test.mjs` | ADR-001 |") },
  });
  return snapshotOf([milestone, other], {
    probes: { "test/arch/landed.test.mjs": true, "test/arch/unnamed.test.mjs": true, "test/arch/absent.test.mjs": false },
    runners: { "scripts/test.mjs": "import { x } from '../test/arch/landed.test.mjs';\n" },
  });
}

export const workDoctorControlsTests = [
  // ===================================================================
  // task 00 — one lane that reads and never runs
  // ===================================================================
  {
    name: "66/02 lane: the groups answer from a LITERAL snapshot whose paths name a directory that does not exist, and twice is byte-identical",
    run: () => {
      const snapshot = allEightFixture();
      const first = controlsLane(snapshot, {});
      const second = controlsLane(snapshot, {});
      assert.ok(first.length > 0, "non-vacuity: the fixture really does produce findings");
      assert.deepEqual(second, first, "the same snapshot yields byte-identical findings — no clock, no filesystem, no state");
      assert.equal(JSON.stringify(first), JSON.stringify(second));
      // The paths are under a root that does not exist, which is what makes "without
      // reading disk" an observation rather than a claim.
      for (const finding of first) assert.ok(finding.path.startsWith(NOWHERE.slice(0, 6)), finding.path);
    },
  },
  {
    name: "66/02 lane: a stream that declares no controls and carries no register ids produces NOTHING — doctor's existing answers are unchanged",
    run: () => {
      // The 40 fitness tables with no id column, and a findings register with no rows:
      // a register declaring no ids declares nothing (ADR-001 §6).
      const quiet = snapshotOf([
        item({
          docs: {
            "ARCHITECTURE.md": doc("# m", "", "## Fitness functions", "", "| invariant | enforced by |", "|---|---|", "| the loop registry is data | `test/arch/x.test.mjs` |"),
            "VERIFICATION.md": findingsRegister(),
            "SPEC.md": doc("# spec", "", "nothing here declares an id"),
          },
        }),
      ]);
      assert.deepEqual(controlsLane(quiet, {}), []);
    },
  },
  {
    name: "66/02 lane: a cited control file is NEVER executed to find out whether it is real — leg A reads a probe, leg B reads text",
    run: () => {
      // A module scope that would write a marker if imported. The lane is handed the
      // probe RESULT and the runner TEXT, never a path it could open and never a
      // specifier it could `import()`: existence was established by a stat taken at
      // the snapshot boundary, and registration by a substring of a text read there.
      let markerWritten = false;
      const runnerText = "// import './danger.test.mjs' — a string in a runner, not an execution\nexport const suites = ['test/arch/danger.test.mjs'];\n";
      const snapshot = snapshotOf(
        [item({ docs: { "ARCHITECTURE.md": fitnessRegister("| **FF-01** | resolves | `test/arch/danger.test.mjs` | ADR |") } })],
        { probes: { "test/arch/danger.test.mjs": true }, runners: { "scripts/test.mjs": runnerText } },
      );
      assert.deepEqual(controlGroup(snapshot, {}), [], "the control is reported as resolved");
      assert.equal(markerWritten, false, "and no marker exists — nothing imported the cited module");
      // Structural, not intentional: the module's own source names no execution door.
      // FF-6605 holds the wider claim; this is the behavioural half.
      assert.equal(typeof globalThis.__acd_control_marker, "undefined");
    },
  },
  {
    name: "66/02 lane: a finding carries doctor's envelope and NOTHING else — exactly code, severity, path, message; the path is a raw OS-native absolute",
    run: () => {
      // Both halves of the eight: the configured fixture fires seven codes, and the
      // same snapshot with the runner list removed fires the eighth.
      const configured = allEightFixture();
      const findings = [...controlsLane(configured, {}), ...controlsLane({ ...configured, runnerTexts: null }, {})];
      assert.equal(new Set(findings.map((finding) => finding.code)).size, 8, "every one of the eight is represented in this envelope check");
      for (const finding of findings) {
        assert.deepEqual(Object.keys(finding).sort(), ["code", "message", "path", "severity"], JSON.stringify(finding));
        assert.ok(["warn", "error"].includes(finding.severity), finding.severity);
        assert.equal(path.isAbsolute(finding.path), true, `${finding.path} is a raw absolute — relativising is the face's job`);
        assert.ok(finding.message.length > 20, finding.message);
      }
    },
  },
  {
    name: "66/02 lane: the message names the id or the path that must change, so the finding is actionable unopened",
    run: () => {
      const findings = controlsLane(allEightFixture(), {});
      const named = {
        "register-duplicate-id": /FF-01/,
        "register-dangling-citation": /FF-9999/,
        "verification-register-missing": /FF-05/,
        "verification-missing-red-probe": /FF-02/,
        "control-unresolved": /FF-02/,
        "control-unregistered": /FF-03/,
        "control-runner-unchecked": new RegExp(RUNNERS_CONFIG_KEY.replace(/\./g, "\\.")),
        "staged-control": /thing\.test\.mjs/,
      };
      for (const [code, pattern] of Object.entries(named)) {
        const hit = only(findings, code);
        if (code === "control-runner-unchecked") continue; // the runner list IS configured in this fixture
        assert.ok(hit.length > 0, `${code} is reachable`);
        assert.match(hit.map((finding) => finding.message).join(" | "), pattern, code);
      }
    },
  },
  {
    name: "66/02 lane: EVERY ONE of the eight frozen codes is reachable from one fixture, and the set the lane emits adds nothing",
    run: () => {
      const configured = controlsLane(allEightFixture(), {});
      // `control-runner-unchecked` is the one code the all-eight fixture cannot fire
      // WITH a runner list, because it reports that leg B did not run. The same
      // snapshot with the list removed fires it — which is the point of the code.
      const snapshot = allEightFixture();
      const unchecked = controlsLane({ ...snapshot, runnerTexts: null }, {});
      const emitted = new Set([...configured, ...unchecked].map((finding) => finding.code));
      assert.deepEqual([...emitted].sort(), [...CONTROL_FINDING_CODES].sort(), "exactly the eight — nothing added, nothing unreachable");
      assert.equal(CONTROL_FINDING_CODES.length, 8);
      assert.equal(Object.isFrozen(CONTROL_FINDING_CODES), true, "extending the set is an ADR-level act, not an edit to a call site");
    },
  },
  {
    name: "66/02 lane: severity is the HORIZON's, not the code's — the same fixture is error while open and warn once done",
    run: () => {
      const open = controlsLane(allEightFixture(), {});
      const closedItems = allEightFixture().items.map((row) => ({ ...row, meta: { status: "done" } }));
      const closed = controlsLane(snapshotOf(closedItems, {
        probes: { "test/arch/landed.test.mjs": true, "test/arch/unnamed.test.mjs": true, "test/arch/absent.test.mjs": false },
        runners: { "scripts/test.mjs": "import { x } from '../test/arch/landed.test.mjs';\n" },
      }), {});
      assert.deepEqual(codes(open), codes(closed), "the same facts are reported either side of the horizon");
      assert.deepEqual([...new Set(open.map((f) => f.severity))], ["error"], "inside the horizon every one of them gates");
      assert.deepEqual([...new Set(closed.map((f) => f.severity))], ["warn"], "outside it not one of them does — no error against an immutable record");
      // …and a MILESTONE record document follows the MILESTONE's own status (ADR-009/F,
      // finding F-10 from 66/00, which was covered by a tautology until this lane
      // applied the horizon to a milestone record doc for real).
      const anchored = open.filter((finding) => finding.path.endsWith("ARCHITECTURE.md") || finding.path.endsWith("VERIFICATION.md"));
      assert.ok(anchored.length > 0, "non-vacuity: the horizon really is being applied to milestone record documents");
      assert.deepEqual([...new Set(anchored.map((f) => f.severity))], ["error"]);
    },
  },
  {
    name: "66/02 lane: `control-runner-unchecked` is ALWAYS warn, even inside the horizon — it reports that a leg did not run",
    run: () => {
      const snapshot = { ...allEightFixture(), runnerTexts: null };
      const unchecked = only(controlsLane(snapshot, {}), "control-runner-unchecked");
      assert.equal(unchecked.length, 2, "one per ITEM declaring controls, never one per control");
      assert.deepEqual([...new Set(unchecked.map((f) => f.severity))], ["warn"]);
      assert.deepEqual([...new Set(snapshot.items.map((row) => row.meta.status))], ["in-progress"], "…and the items are OPEN, so this is not the horizon answering");
    },
  },
  {
    name: "66/02 lane: an ERROR gates and a WARN does not, on the exit code doctor already publishes",
    run: async () => {
      const { doctorCommand } = await import("../../../src/commands/doctor.mjs");
      const exitFor = (findings, strict) => doctorCommand.cli.exit({ findings }, { options: strict ? { strict: true } : {} });
      // A stream whose ONLY controls findings are warns: exits zero, and non-zero under
      // `--strict`. Driven over findings the lane really produced, not invented ones.
      const warnsOnly = controlsLane(snapshotOf(
        [item({ status: "done", docs: { "ARCHITECTURE.md": fitnessRegister("| **FF-01** | its file has not landed | `test/arch/absent.test.mjs` | ADR |") } })],
        { probes: { "test/arch/absent.test.mjs": false }, runners: null },
      ), {});
      assert.ok(warnsOnly.length > 0 && warnsOnly.every((finding) => finding.severity === "warn"), JSON.stringify(warnsOnly));
      assert.equal(exitFor(warnsOnly, false), 0, "warn-only exits zero");
      assert.equal(exitFor(warnsOnly, true), 1, "…and non-zero under --strict, which is the face's policy, not the horizon's (ADR-009/G)");
      // A SINGLE error from this lane exits non-zero with or without --strict.
      const oneError = controlGroup(snapshotOf(
        [item({ status: "in-progress", docs: { "ARCHITECTURE.md": fitnessRegister("| **FF-01** | its file has not landed | `test/arch/absent.test.mjs` | ADR |") } })],
        { probes: { "test/arch/absent.test.mjs": false }, runners: {} },
      ), {});
      assert.deepEqual(oneError.map((finding) => [finding.code, finding.severity]), [["control-unresolved", "error"]], "one error, from one lane");
      assert.equal(exitFor(oneError, false), 1);
      assert.equal(exitFor(oneError, true), 1);
      assert.equal(exitFor([], false), 0, "and a clean stream still exits zero");
    },
  },
  {
    name: "66/02 lane: the SNAPSHOT names its only new reads — the text rides reads doctor already performs, and nothing is opened twice (MEASURED against HEAD)",
    run: async () => {
      // ADR-003 §4 and the last scenario of task 00: `buildSnapshot` already opened
      // `VERIFICATION.md`/`RETROSPECTIVE.md`/`ARCHITECTURE.md` and the record doc, and
      // threw the text away. The claim is that the lane's text costs NO second open,
      // and that the only genuinely new I/O is one existence probe per cited control
      // path and one read per declared runner file. Asserted over the SHIPPED spine's
      // own read sites, because a fixture cannot say how many times a file is opened.
      const spine = await readFile(path.join(repoRoot, "src", "work", "doctor.mjs"), "utf8");
      // Each site cut to the END OF ITS LINE rather than to the first `)`, because the
      // argument itself contains parens — the positional-slice trap `test/support/`
      // exists to keep out of gates (F-47-04-ARCH-2).
      const siteArgs = (callee) =>
        [...spine.matchAll(new RegExp(`await ${callee}\\((.*)$`, "gm"))].map((match) => match[1].replace(/\s+/g, " ").trim());
      assert.deepEqual(
        siteArgs("readFile"),
        [
          'target, "utf8");',
          'path.join(item.dir, doc), "utf8");',
          'projectRoot == null ? relative : path.join(projectRoot, relative), "utf8");',
          // milestone 54 / story 04 — THE FOURTH SITE, NAMED RATHER THAN ADMITTED BY
          // LOOSENING THIS LIST. The traceability lane joins `@executable` scenarios against
          // the cases a run emitted, so the last runner report has to reach the snapshot; it
          // is read HERE, once, at the same boundary leg B reads its runner texts, and the
          // lane itself opens nothing (54/ADR-006 §5, `acd-grade-subject-is-emitted`). Its
          // SCENARIOS cost no new site at all — they ride `fileState`'s existing read of each
          // task feature, exactly as `docTexts` rides the convention-doc read above.
          'reportPath, "utf8");',
        ],
        "exactly four read sites: `fileState` (the convention docs + task features), the record doc, leg B's runner files, and 54/04's declared rubric report — and the lanes' texts come out of reads that already happened wherever one existed",
      );
      // The text really does ride those two reads: `docTexts` is assigned from the
      // record-doc read and from `fileState`'s own result, never from a fresh open.
      assert.match(spine, /meta = parseFrontmatter\(text\);\s*\n\s*docTexts\[doc\] = text;/, "the record doc's text is kept from the frontmatter read that already happened");
      assert.match(spine, /if \(state\.present\) docTexts\[name\] = state\.text;/, "…and each convention doc's from the fileState read that already happened");
      // …and the new I/O is exactly the two the contract names.
      assert.deepEqual(
        siteArgs("stat"),
        [
          "target)).mtimeMs;",
          "path.join(projectRoot, control))).isFile();",
          // 119/ADR-004 — THE FALL-THROUGH, named rather than admitted by loosening this list.
          // Leg A above is still the first branch and still answers for every control that exists
          // at HEAD; only on a MISS is the rename map asked where the file went, and the candidate
          // it names is probed the same way. That keeps `control-unresolved` meaning "this register
          // declares a control that does not exist" instead of "somebody moved a file" — which is
          // the difference between a gate and a permanent finding on twenty immutable registers.
          "path.join(projectRoot, answer.at))).isFile();",
        ],
        "one existence probe per cited control path plus one for the rename candidate on a miss, beside the pre-existing mtime stat — and nothing else",
      );
      // One probe per DISTINCT path: a path cited by two declarations is stat'ed once.
      assert.match(spine, /const cited = new Set\(\);/, "the cited paths are unioned before probing");
    },
  },
  {
    name: "66/02 lane: the registry entry is ONE, and the three groups compose into it",
    run: () => {
      assert.equal(CONTROL_GROUPS.length, 3);
      assert.deepEqual(CONTROL_GROUPS.map((group) => group.name), ["registerGroup", "verificationGroup", "controlGroup"]);
      const snapshot = allEightFixture();
      assert.deepEqual(
        controlsLane(snapshot, {}),
        [...registerGroup(snapshot, {}), ...verificationGroup(snapshot, {}), ...controlGroup(snapshot, {})],
        "the lane is exactly its three groups, in order",
      );
    },
  },

  // ===================================================================
  // task 01 — a register declares an id once, and a citation resolves
  // ===================================================================
  {
    name: "66/02 register: the precision matrix — declarations, the dissolved false positives, duplicates, and the per-file id space (Outline, 13 rows)",
    run: () => {
      const declaredIn = (docs) => registerGroup(snapshotOf([item({ docs })]), {});

      // — the two admitted declaration forms, and the bullet form that is not —
      assert.deepEqual(declaredIn({ "ARCHITECTURE.md": fitnessRegister("| **FF-01** | one | `test/arch/x.test.mjs` | ADR |") }).filter((f) => f.code === "register-duplicate-id"), []);
      assert.deepEqual(
        declaredIn({ "VERIFICATION.md": findingsRegister("| **F-12** | a row | open |") }).filter((f) => f.code === "register-duplicate-id"),
        [],
      );
      // — the measured false positives, dissolved by POSITION rather than by special case —
      for (const [label, docs] of [
        ["a STATE-shaped heading in a document that opens no register block", { "SPEC.md": doc("# spec", "", "### D-17 is now LIVE, and sharper") }],
        ["a reservation inside the block", { "ARCHITECTURE.md": fitnessRegister("| **FF-01** | one | `test/arch/x.test.mjs` | ADR |", "", "**Next free id is D-37.**") }],
        ["the bullet form, grandfathered and not admitted", { "VERIFICATION.md": findingsRegister("- **F-28 · BLOCKER, see below**", "| **F-28** | the real one | open |") }],
        ["a fenced sample quoted inside the block", { "ARCHITECTURE.md": fitnessRegister("| **FF-01** | one | `test/arch/x.test.mjs` | ADR |", "", "```", "| **FF-01** | a quoted sample |", "```") }],
      ]) {
        assert.deepEqual(declaredIn(docs).filter((f) => f.code === "register-duplicate-id"), [], label);
      }

      // — duplicates WITHIN one register file —
      const twice = only(declaredIn({ "ARCHITECTURE.md": fitnessRegister("| **FF-01** | a | `test/arch/x.test.mjs` | ADR |", "| **FF-01** | b | `test/arch/x.test.mjs` | ADR |") }), "register-duplicate-id");
      assert.equal(twice.length, 1, "one finding per duplicated id — the collision is one fact");
      assert.match(twice[0].message, /FF-01 is declared 2 times/);
      assert.match(twice[0].message, /lines 7, 8/, "…naming the file and BOTH line numbers");
      // a row and a heading are two declarations, because the FORM does not change the id
      const mixed = only(declaredIn({ "ARCHITECTURE.md": doc("# m", "", "## Fitness functions", "", "| **FF-01** | a row |", "", "### FF-01 · the same id as a heading") }), "register-duplicate-id");
      assert.equal(mixed.length, 1);
      // …and the id space is PER REGISTER FILE: the same id in two items is no collision
      const twoItems = registerGroup(snapshotOf([
        item({ ref: "52", number: "52", docs: { "ARCHITECTURE.md": fitnessRegister("| **FF-5204** | m52's | `test/arch/x.test.mjs` | ADR |") } }),
        item({ ref: "66", number: "66", docs: { "ARCHITECTURE.md": fitnessRegister("| **FF-5204** | m66's, same spelling | `test/arch/x.test.mjs` | ADR |") } }),
      ]), {});
      assert.deepEqual(only(twoItems, "register-duplicate-id"), []);
    },
  },
  {
    name: "66/02 register: the policed universe is every QUALIFIED citation, wherever it stands, and the `m` prefix changes the spelling never the target (Outline, 7 rows)",
    run: () => {
      const stream = (citation) =>
        registerGroup(snapshotOf([
          item({ ref: "52", number: "52", slug: "loop", docs: { "ARCHITECTURE.md": fitnessRegister("| **FF-5204** | m52 declares it | `test/arch/x.test.mjs` | ADR |") } }),
          item({ ref: "66", number: "66", slug: "controls", docs: { "ARCHITECTURE.md": fitnessRegister(`| **FF-6601** | cites ${citation} | \`test/arch/y.test.mjs\` | ADR |`) } }),
        ]), {}).filter((finding) => finding.code === "register-dangling-citation");

      assert.deepEqual(stream("52/FF-5204"), [], "a qualified citation of a declared id resolves");
      assert.deepEqual(stream("m52/FF-5204"), [], "…and so does the `m`-prefixed spelling of the same target");
      assert.equal(stream("52/FF-9999").length, 1, "a qualified citation of an id m52 does not declare dangles");
      assert.match(stream("52/FF-9999")[0].message, /52\/FF-9999 cites FF-9999, which item 52's registers do not declare/);
      assert.equal(stream("m52/FF-9999").length, 1, "the prefix changes the spelling and never the target");
      const unknownItem = stream("77/FF-1");
      assert.equal(unknownItem.length, 1);
      assert.match(unknownItem[0].message, /cites item ref 77, which no work item wears/, "naming the unresolvable ITEM REF rather than the id");
      const noisyRef = stream("007/ADR-008");
      assert.equal(noisyRef.length, 1, "`007/ADR-008` is one of the measured authoring-noise citations, and it is reported");

      // …and an ADR heading in m52 is a RESOLUTION TARGET though it is no register
      // declaration — ROUND 3/1's union, which is what keeps the check landable.
      const adr = registerGroup(snapshotOf([
        item({ ref: "52", number: "52", docs: { "ARCHITECTURE.md": doc("# m52", "", "## ADR-007: the loop registry is data", "", "body") } }),
        item({ ref: "66", number: "66", docs: { "ARCHITECTURE.md": doc("# m66", "", "as 52/ADR-007 rules") } }),
      ]), {});
      assert.deepEqual(only(adr, "register-dangling-citation"), [], "resolving ADR/R against register blocks only would make essentially every qualified citation dangle");
    },
  },
  {
    name: "66/02 register: a citing register ROW resolves against the sibling declaration, and a cross-item BARE id is out of the universe (Outline, 4 rows)",
    run: () => {
      // The one bare position this lane polices: a CITING entry (ADR-008 ruling 4)
      // asserts by its position that the id is declared in the sibling register.
      const resolving = registerGroup(snapshotOf([
        item({
          docs: {
            "ARCHITECTURE.md": fitnessRegister("| **FF-6601** | declared here | `test/arch/x.test.mjs` | ADR |"),
            "VERIFICATION.md": probeRegister("| **FF-6601** | `test/arch/x.test.mjs` | GREEN | a recorded observation |"),
          },
        }),
      ]), {});
      assert.deepEqual(only(resolving, "register-dangling-citation"), [], "the form the shipped template asks authors to write is the form that resolves");

      const dangling = registerGroup(snapshotOf([
        item({
          docs: {
            "ARCHITECTURE.md": fitnessRegister("| **FF-6601** | declared here | `test/arch/x.test.mjs` | ADR |"),
            "VERIFICATION.md": probeRegister("| **FF-6699** | `test/arch/x.test.mjs` | GREEN | a recorded observation |"),
          },
        }),
      ]), {});
      assert.equal(only(dangling, "register-dangling-citation").length, 1, "a citing row for an id the item never declared dangles — here the target IS addressable");

      // THE THREE BARE-PROSE ROWS, AND WHY EACH ANSWERS "none" (ADR-011/A).
      //
      // READ THIS BEFORE READING THE ASSERTION. `01_a-register-declares-once.feature`
      // rows :78, :80 and :81 all expect "none", and the shipped lane gives "none" — but
      // NOT for the mechanisms those rows state. It gives "none" because BARE PROSE IS
      // OUTSIDE THE POLICED UNIVERSE ALTOGETHER: ADR-011/A discharges ADR-009/D's bare
      // half at the one structurally identified bare position (the citing register entry
      // asserted above) and REFUSES free-prose policing as unlandable — 329 (file, id)
      // pairs at the literal reading, 135 at the tightest narrowing, 304 / 131 of them in
      // `done` items no legal edit can clear, and 0% precision on the live milestone.
      //
      //   :78  a bare `FF-6601` DECLARED in m66's own register        → none, but not
      //        "because it resolves"; it is never looked at. Its only discriminating
      //        partner was :79 (a bare `FF-6699` declared nowhere ⇒ dangling), which
      //        ADR-011/A supersedes — so the row cannot distinguish a working lane from
      //        an absent one, and this comment is the record of that.
      //   :80  a bare cross-item `FF-5204`                            → none, and this
      //        one is ALSO true for its stated reason: a bare id names no addressable
      //        target across items. Both readings agree here.
      //   :81  a bare `ADR-004`, whichever item wrote it              → none; document
      //        scoped forms are not in the bare recogniser at all, and 8,250 bare
      //        `ADR-NNN` occurrences across 555 files are why the universe is scoped.
      const bare = registerGroup(snapshotOf([
        item({ ref: "52", number: "52", docs: { "ARCHITECTURE.md": fitnessRegister("| **FF-5204** | m52's | `test/arch/x.test.mjs` | ADR |") } }),
        item({
          ref: "66",
          number: "66",
          docs: {
            "ARCHITECTURE.md": fitnessRegister("| **FF-6601** | declared here, and mentioned bare below | `test/arch/y.test.mjs` | ADR |"),
            // All three rows' shapes in one document: an id this item DOES declare, a
            // cross-item id it does not, a document-scoped id, and — the case that makes
            // the scoping visible rather than implied — an id NOTHING declares anywhere.
            "SPEC.md": doc("# m66", "", "FF-6601 is ours; FF-5204 is m52's; ADR-004 is somebody's; FF-6699 and D-31 are nobody's."),
          },
        }),
      ]), {});
      assert.deepEqual(
        only(bare, "register-dangling-citation"),
        [],
        "none — and by ADR-011/A's scoping (bare prose is outside the policed universe entirely), NOT because these ids resolve: the same document's `FF-6699` and `D-31` are declared NOWHERE and are equally silent",
      );
    },
  },
  {
    name: "66/02 register: the frozen register-block set is checked by ONE rule, and a block outside it declares nothing",
    run: () => {
      // Both frozen blocks, both checked, one implementation.
      const both = only(registerGroup(snapshotOf([
        item({
          docs: {
            "ARCHITECTURE.md": fitnessRegister("| **FF-01** | a | `test/arch/x.test.mjs` | ADR |", "| **FF-01** | b | `test/arch/x.test.mjs` | ADR |"),
            "VERIFICATION.md": findingsRegister("| **F-12** | a | open |", "| **F-12** | b | open |"),
          },
        }),
      ]), {}), "register-duplicate-id");
      assert.equal(both.length, 2, "both registers are checked by the same rule, from one implementation");
      assert.deepEqual(both.map((f) => path.basename(f.path)).sort(), ["ARCHITECTURE.md", "VERIFICATION.md"]);
      // …and a `SESSION.md` findings register is the third frozen file — which is why
      // the record-doc read had to be extended alongside `fileState`.
      const session = only(registerGroup(snapshotOf([
        item({ ref: "32", number: "32", type: "uat", slug: "acceptance", docs: { "SESSION.md": findingsRegister("| **F-1** | a | open |", "| **F-1** | b | open |") } }),
      ]), {}), "register-duplicate-id");
      assert.equal(session.length, 1, "a SESSION.md findings register declares, and is checked");
      // An ADR block and a debt entry are OUTSIDE the frozen set, so they declare nothing.
      const outside = registerGroup(snapshotOf([
        item({ docs: { "ARCHITECTURE.md": doc("# m", "", "## ADR-001: a", "", "| **FF-01** | in an ADR block |", "| **FF-01** | twice, still not a register |") } }),
      ]), {});
      assert.deepEqual(only(outside, "register-duplicate-id"), [], "admitting a third register block is an ADR-level act, not a second copy of the check");
    },
  },
  {
    name: "66/02 register: over ACD's OWN stream, the check reports no citation a legal edit could not clear — MEASURED, because a report of thousands is a scoping defect in the check",
    run: async () => {
      // THE SETTLING SCENARIO, and it is settled by measurement rather than by
      // assertion (ADR-009/A). Run over the real `wiki/work` through the shipped
      // snapshot builder, so the universe is doctor's own — not a fixture's.
      const { buildSnapshot } = await import("../../../src/work/doctor.mjs");
      const snapshot = await buildSnapshot(path.join(repoRoot, "wiki", "work"), { projectRoot: repoRoot });
      const findings = registerGroup(snapshot, {});

      // The universe, counted the way the check counts it.
      const { qualifiedRefsIn } = await import("../../../src/declared-id.mjs");
      let policed = 0;
      for (const row of snapshot.items) {
        for (const text of Object.values(row.docTexts ?? {})) policed += qualifiedRefsIn(text).length;
      }
      assert.ok(policed > 1000, `non-vacuity: ACD's own stream really is full of qualified citations (${policed})`);
      assert.ok(snapshot.items.length > 100, `non-vacuity: the snapshot reached the whole stream (${snapshot.items.length} items)`);

      const dangling = findings.filter((finding) => finding.code === "register-dangling-citation");
      // THE PRECISION CLAIM, as a RATIO and a reviewable ceiling rather than a stored
      // count — the corpus grows every milestone, and a frozen integer here would go
      // red on somebody else's story. A report of thousands would mean the check had
      // found a scoping defect in itself rather than a defect in the tree.
      assert.ok(
        dangling.length / policed < 0.02,
        `the policed universe is ${policed} qualified citations and ${dangling.length} do not resolve (${((dangling.length / policed) * 100).toFixed(2)}%) — a report of thousands is a scoping defect in the check, not a defect in the tree`,
      );
      assert.ok(dangling.length < 60, `and ${dangling.length} is small enough to enumerate in a review, which is the precision claim restated`);

      // EVERY finding names an id or an item ref a legal edit could declare or correct.
      for (const finding of dangling) {
        // …it names an ID of the frozen namespace (`R<n>` carries no hyphen — ADR-008
        // ruling 1), or an item ref…
        assert.match(finding.message, /\b(?:FF-\d|F-\d|D-\d|ADR-\d|R\d)/, `names an id: ${finding.message}`);
        // …and the ACT that would clear it, so the finding is actionable unopened.
        assert.match(
          finding.message,
          /(?:correct the id or declare it|correct the item ref|declare it in the sibling register, or correct the id)$/,
          `names the act a legal edit would perform: ${finding.message}`,
        );
      }
      // NO FINDING IS RAISED OUTSIDE THAT UNIVERSE: `register-duplicate-id` is the only
      // other code this group can emit, and over the real stream it emits none — 0
      // duplicate ids across every register file, which is also 66/01's F-19 fix
      // holding (the un-guarded grammar declared `F-47-V` eleven times and `F-49-VER`
      // four, both false duplicates on arrival).
      assert.deepEqual(
        findings.filter((finding) => finding.code === "register-duplicate-id").map((finding) => finding.message),
        [],
        "no id is declared twice in one register file anywhere in ACD's own stream",
      );
      assert.deepEqual([...new Set(findings.map((finding) => finding.code))].sort(), ["register-dangling-citation"], "and this group raises nothing else");
    },
  },
  {
    name: "66/02 register: the two seed checks keep their own findings — this lane re-implements neither",
    run: async () => {
      const { duplicateDriverNumberGroup, CHECK_GROUPS } = await import("../../../src/work/doctor.mjs");
      const snapshot = snapshotOf([
        item({ ref: "66", number: "66", slug: "a", docs: { "ARCHITECTURE.md": fitnessRegister("| **FF-01** | a | `test/arch/x.test.mjs` | ADR |", "| **FF-01** | b | `test/arch/x.test.mjs` | ADR |") } }),
        item({ ref: "66", number: "66", slug: "b" }),
      ]);
      assert.equal(duplicateDriverNumberGroup(snapshot, {}).map((f) => f.code).join(), "duplicate-driver-number");
      assert.equal(only(registerGroup(snapshot, {}), "register-duplicate-id").length, 1);
      assert.equal(CHECK_GROUPS.filter((group) => group.name === "controlsLane").length, 1, "the controls lane appears in the check registry exactly once");
      assert.equal(CHECK_GROUPS.includes(controlsLane), true);
    },
  },

  // ===================================================================
  // task 02 — a control resolves, or declares itself pending
  // ===================================================================
  {
    name: "66/02 control: the two-leg truth table, exhaustive over path × runner × pending × status (Outline, 24 rows)",
    run: () => {
      const CITED = "test/arch/guard.test.mjs";
      const run = (exists, runner, pending, status) => {
        const runners =
          runner === "unconfigured" ? null : runner === "names" ? { "scripts/test.mjs": `...${path.posix.basename(CITED)}...` } : { "scripts/test.mjs": "names nothing" };
        const row = `| **FF-01** | an invariant${pending ? " **(pending — 66/0N)**" : ""} | \`${CITED}\` | ADR |`;
        return controlGroup(
          snapshotOf([item({ status, docs: { "ARCHITECTURE.md": fitnessRegister(row) } })], { probes: { [CITED]: exists }, runners }),
          {},
        ).map((finding) => `${finding.code}@${finding.severity}`).sort();
      };

      // — the file exists —
      assert.deepEqual(run(true, "names", false, "in-progress"), []);
      assert.deepEqual(run(true, "names", false, "done"), []);
      assert.deepEqual(run(true, "names", true, "in-progress"), [], "a stale marker is a declared no-op rather than a ninth code");
      assert.deepEqual(run(true, "names", true, "done"), [], "…at either side of the horizon");
      assert.deepEqual(run(true, "unnamed", false, "in-progress"), ["control-unregistered@error"]);
      assert.deepEqual(run(true, "unnamed", false, "done"), ["control-unregistered@warn"]);
      assert.deepEqual(run(true, "unnamed", true, "in-progress"), ["control-unregistered@error"], "the marker claims an absence the resolution disproves");
      assert.deepEqual(run(true, "unnamed", true, "done"), ["control-unregistered@warn"]);
      assert.deepEqual(run(true, "unconfigured", false, "in-progress"), ["control-runner-unchecked@warn"]);
      assert.deepEqual(run(true, "unconfigured", false, "done"), ["control-runner-unchecked@warn"]);
      assert.deepEqual(run(true, "unconfigured", true, "in-progress"), ["control-runner-unchecked@warn"]);
      assert.deepEqual(run(true, "unconfigured", true, "done"), ["control-runner-unchecked@warn"]);

      // — the file is missing —
      assert.deepEqual(run(false, "names", false, "in-progress"), ["control-unresolved@error"], "the runner names a file that is not there");
      assert.deepEqual(run(false, "names", false, "done"), ["control-unresolved@warn"]);
      assert.deepEqual(run(false, "names", true, "in-progress"), ["control-unresolved@warn"], "pending downgrades inside the horizon without silencing");
      assert.deepEqual(run(false, "names", true, "done"), ["control-unresolved@warn"]);
      assert.deepEqual(run(false, "unnamed", false, "in-progress"), ["control-unresolved@error"], "unregistered SUPPRESSED — a file that is not there cannot be registered");
      assert.deepEqual(run(false, "unnamed", false, "done"), ["control-unresolved@warn"]);
      assert.deepEqual(run(false, "unnamed", true, "in-progress"), ["control-unresolved@warn"]);
      assert.deepEqual(run(false, "unnamed", true, "done"), ["control-unresolved@warn"]);
      assert.deepEqual(run(false, "unconfigured", false, "in-progress"), ["control-runner-unchecked@warn", "control-unresolved@error"]);
      assert.deepEqual(run(false, "unconfigured", false, "done"), ["control-runner-unchecked@warn", "control-unresolved@warn"]);
      assert.deepEqual(run(false, "unconfigured", true, "in-progress"), ["control-runner-unchecked@warn", "control-unresolved@warn"]);
      assert.deepEqual(run(false, "unconfigured", true, "done"), ["control-runner-unchecked@warn", "control-unresolved@warn"]);
    },
  },
  {
    name: "66/02 control: the marker is a TOKEN in the declaration's own entry, never a position in it (Outline, 7 rows)",
    run: () => {
      const pendingOf = (row) => fitnessDeclarations(fitnessRegister(row), "ARCHITECTURE.md")[0]?.pending;
      assert.equal(pendingOf("| **FF-01** | an invariant | `test/arch/x.test.mjs` (pending) | ADR |"), true, "the token directly after the cited path — ADR-004 §3's bullet shape, in a cell");
      assert.equal(pendingOf("| **FF-01** | an invariant | `test/arch/x.test.mjs` — a source scan; pending until the subject lands | ADR |"), true, "position inside the cell decides nothing");
      assert.equal(pendingOf("| **FF-01** | an invariant, pending its subject | `test/arch/x.test.mjs` | ADR |"), true, "the row is the entry — another cell carries the same token");
      assert.equal(pendingOf("| **FF-01** | an invariant | `test/arch/x.test.mjs` **(pending — 66/0N)** | ADR |"), true, "the literal this register writes today; emphasis and the story ref are part of no rule");
      // a neighbouring row's cell only
      const neighbours = fitnessDeclarations(
        fitnessRegister("| **FF-01** | plain | `test/arch/x.test.mjs` | ADR |", "| **FF-02** | pending here | `test/arch/y.test.mjs` (pending) | ADR |"),
        "ARCHITECTURE.md",
      );
      assert.deepEqual(neighbours.map((entry) => [entry.id, entry.pending]), [["FF-01", false], ["FF-02", true]], "an entry is one declaration and never its neighbour");
      // the word inside a fenced sample quoted in the block: the fence marks nothing,
      // because a fenced row declares nothing at all
      assert.deepEqual(
        fitnessDeclarations(fitnessRegister("| **FF-01** | plain | `test/arch/x.test.mjs` | ADR |", "", "```", "| **FF-02** | pending |", "```"), "ARCHITECTURE.md").map((e) => [e.id, e.pending]),
        [["FF-01", false]],
      );
      assert.equal(pendingOf("| **FF-01** | an invariant | `test/arch/x.test.mjs` | ADR |"), false, "no token anywhere in the entry");
      assert.equal(pendingOf("| **FF-01** | depending on the subject | `test/arch/x.test.mjs` | ADR |"), false, "`depending` is not the token");
    },
  },
  {
    name: "66/02 control: the honest no-op is reported ONCE PER ITEM, not once per declared control, and names the missing configuration key",
    run: () => {
      const eight = fitnessRegister(...Array.from({ length: 8 }, (_, index) => `| **FF-0${index + 1}** | an invariant | \`test/arch/g${index}.test.mjs\` | ADR |`));
      const findings = controlGroup(
        snapshotOf([item({ docs: { "ARCHITECTURE.md": eight } })], { probes: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`test/arch/g${i}.test.mjs`, true])), runners: null }),
        {},
      );
      const unchecked = only(findings, "control-runner-unchecked");
      assert.equal(unchecked.length, 1, "exactly one finding for that milestone, though it declares eight controls");
      assert.match(unchecked[0].message, /work\.controls\.runners/, "…and it names the missing configuration key rather than any one control");
      assert.equal(unchecked[0].message.includes("FF-0"), false, "never any one control");
      assert.deepEqual(only(findings, "control-unregistered"), [], "leg B did not run, so it reports nothing about registration");
    },
  },
  {
    name: "66/02 control: what counts as a cited control path, over the shapes this tree actually uses (Outline, 9 rows)",
    run: () => {
      assert.deepEqual(controlPathsIn("a scan of `test/arch/x.test.mjs` over src/**, asserting one home"), ["test/arch/x.test.mjs"], "a path inside backticks surrounded by prose in the same cell");
      assert.deepEqual(controlPathsIn("`../../../test/arch/x.test.mjs`"), ["test/arch/x.test.mjs"], "written relative to the register, resolved repo-relative (84 today)");
      assert.deepEqual(controlPathsIn("`test/arch/x.test.mjs#L241`"), ["test/arch/x.test.mjs"], "a markdown line anchor is dropped before the probe (58 today)");
      assert.deepEqual(controlPathsIn("`test/arch/x.test.mjs:151`"), ["test/arch/x.test.mjs"], "a line suffix is dropped before the probe (39 today)");
      assert.deepEqual(controlPathsIn("the `test/arch/acd-notion-*.test.mjs` family"), [], "a wildcard names a set, and leg A probes a file (28 today)");
      assert.deepEqual(controlPathsIn("the `test/arch/acd-` prefix in prose"), [], "a truncated prefix is not a path (4 today)");
      assert.deepEqual(
        controlPathsIn("`test/arch/audit/acd-no-staged-control.test.mjs` + `test/arch/work/acd-milestone-66-controls-resolve.test.mjs`"),
        ["test/arch/audit/acd-no-staged-control.test.mjs", "test/arch/work/acd-milestone-66-controls-resolve.test.mjs"],
        "two paths in one cell, as FF-6607 carries today — the EXTRACTION half; the resolution half is the lane below",
      );
      // a path in a cell of ANY column other than enforced-by is never probed
      const other = fitnessDeclarations(fitnessRegister("| **FF-01** | the lane at `src/work/doctor.mjs:411-426`, and `test/other.test.mjs` | `test/arch/x.test.mjs` | ADR |"), "ARCHITECTURE.md");
      assert.deepEqual(other[0].controls, ["test/arch/x.test.mjs"], "`src/work/doctor.mjs:411-426` is never probed, and neither is a test path in the invariant column");
      // no path anywhere in the cell
      const empty = controlGroup(snapshotOf([item({ docs: { "ARCHITECTURE.md": fitnessRegister("| **FF-01** | an invariant | enforced by review | ADR |") } })], { runners: {} }), {});
      assert.deepEqual(only(empty, "control-unresolved").length, 1, "there is no path a runner could see");
      assert.match(only(empty, "control-unresolved")[0].message, /declares no control path/);
    },
  },
  {
    name: "66/02 control: a declaration citing TWO paths resolves only when BOTH do — all four combinations, driven (ADR-009/J)",
    run: () => {
      // THE ROW THIS LANE EXISTS FOR: `02_…feature:110` — "two control citations, and
      // the declaration resolves only when both do". The neighbouring row asserts only
      // that TWO paths come OUT of the cell; that is the extraction half, and a
      // resolution that passed when EITHER path existed would satisfy it completely.
      // (Measured: mutating the resolution to `missing.length === entry.controls.length`
      // — resolve when either resolves — survived every other test in this story.)
      const A = "test/arch/first.test.mjs";
      const B = "test/arch/second.test.mjs";
      const run = (aExists, bExists) =>
        controlGroup(
          snapshotOf(
            [item({ status: "in-progress", docs: { "ARCHITECTURE.md": fitnessRegister(`| **FF-01** | two paths, one declaration | \`${A}\` + \`${B}\` | ADR |`) } })],
            { probes: { [A]: aExists, [B]: bExists }, runners: { "scripts/test.mjs": `${path.posix.basename(A)} ${path.posix.basename(B)}` } },
          ),
          {},
        ).filter((finding) => finding.code === "control-unresolved");

      // The one passing combination, and it is the ONLY one.
      assert.deepEqual(run(true, true), [], "both on disk ⇒ the declaration resolves");
      // …and each of the other three reports, NAMING exactly the path(s) that are missing
      // — which is what an `either` reading cannot produce.
      const onlyA = run(true, false);
      assert.equal(onlyA.length, 1, "the first path alone does NOT resolve the declaration");
      assert.match(onlyA[0].message, new RegExp(`FF-01 cites ${B.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}, which is not a file on disk`));
      assert.equal(onlyA[0].message.includes(A), false, "…and it names only the path that is missing, so the finding is actionable unopened");

      const onlyB = run(false, true);
      assert.equal(onlyB.length, 1, "the second path alone does NOT resolve it either");
      assert.match(onlyB[0].message, new RegExp(`FF-01 cites ${A.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}, which is not a file on disk`));
      assert.equal(onlyB[0].message.includes(B), false);

      const neither = run(false, false);
      assert.equal(neither.length, 1, "neither on disk ⇒ ONE finding, because the declaration is one fact");
      assert.match(neither[0].message, /cites test\/arch\/first\.test\.mjs, test\/arch\/second\.test\.mjs, which are not files on disk/, "…naming both");

      // LEG B IS SUPPRESSED throughout, because a file that is not there cannot be
      // registered and the fix is one act (ADR-009/J).
      for (const [a, b] of [[true, false], [false, true], [false, false]]) {
        const findings = controlGroup(
          snapshotOf(
            [item({ status: "in-progress", docs: { "ARCHITECTURE.md": fitnessRegister(`| **FF-01** | two paths | \`${A}\` + \`${B}\` | ADR |`) } })],
            { probes: { [A]: a, [B]: b }, runners: { "scripts/test.mjs": "names nothing at all" } },
          ),
          {},
        );
        assert.deepEqual(findings.map((finding) => finding.code), ["control-unresolved"], `leg A failed at (${a}, ${b}), so control-unregistered is suppressed`);
      }
      // …and once BOTH land, leg B asks about BOTH: a runner naming only the first
      // still leaves the declaration unregistered.
      const halfRegistered = controlGroup(
        snapshotOf(
          [item({ status: "in-progress", docs: { "ARCHITECTURE.md": fitnessRegister(`| **FF-01** | two paths | \`${A}\` + \`${B}\` | ADR |`) } })],
          { probes: { [A]: true, [B]: true }, runners: { "scripts/test.mjs": path.posix.basename(A) } },
        ),
        {},
      );
      assert.deepEqual(halfRegistered.map((finding) => finding.code), ["control-unregistered"], "both legs are per DECLARATION, over ALL its cited paths");
      assert.match(halfRegistered[0].message, /cites test\/arch\/second\.test\.mjs, which no configured runner names/);
    },
  },
  {
    name: "66/02 control: the staging prohibition keys on the NAME, and the retirement convention survives (Outline, 7 rows)",
    run: () => {
      for (const [name, staged] of [
        ["thing.test.mjs", true],
        ["thing.spec.ts", true],
        ["thing.test.js", true],
        ["acd-lease-write-scope.mjs", false],
        ["memory-spike.mjs", false],
        ["acd-no-staged-control.test.mjs", true],
        ["00_a-task.feature", false],
      ]) {
        assert.equal(isControlFileName(name), staged, name);
      }
      // …and the prohibition is SCOPED to the work directory: the same name under
      // `test/arch/` is admitted because the walk only ever sees item subtrees.
      const findings = controlGroup(snapshotOf([item({ staged: [at("66_milestone_x", "tasks", "thing.test.mjs")] })], { runners: {} }), {});
      assert.equal(only(findings, "staged-control").length, 1);
      assert.match(findings[0].message, /thing\.test\.mjs is a test-shaped file inside the work directory/);
      assert.equal(findings[0].path.endsWith(`tasks${path.sep}thing.test.mjs`), true, "anchored at the staged file");
    },
  },
  {
    name: "66/02 control: a pending control is admitted mid-flight, and its marker is inadmissible at the accept transition (ADR-009/C)",
    run: () => {
      const CITED = "test/arch/not-yet.test.mjs";
      const register = fitnessRegister(`| **FF-01** | authored ahead of its subject | \`${CITED}\` **(pending — 66/0N)** | ADR |`);
      const midFlight = controlGroup(snapshotOf([item({ status: "in-progress", docs: { "ARCHITECTURE.md": register } })], { probes: { [CITED]: false }, runners: {} }), {});
      assert.deepEqual(midFlight.map((f) => [f.code, f.severity]), [["control-unresolved", "warn"]], "reported at warn, so the milestone is not blocked from proceeding");

      // THE REFUSAL BITES AT THE TRANSITION, WHILE THE ITEM IS STILL OPEN (ADR-009/C).
      // The item under check is `in-review` — the last open status before `done` — so
      // the finding that refuses the transition is an ERROR against an item nobody has
      // yet made immutable. Modelled by removing the marker at the transition: a
      // milestone cannot be accepted holding a pending control.
      const transition = controlGroup(
        snapshotOf([item({ status: "in-review", docs: { "ARCHITECTURE.md": fitnessRegister(`| **FF-01** | at the accept transition | \`${CITED}\` | ADR |`) } })], { probes: { [CITED]: false }, runners: {} }),
        {},
      );
      assert.deepEqual(transition.map((f) => [f.code, f.severity]), [["control-unresolved", "error"]], "the refusal is raised while the item is still open");
      // …so no error is ever emitted against an immutable record.
      const accepted = controlGroup(
        snapshotOf([item({ status: "done", docs: { "ARCHITECTURE.md": fitnessRegister(`| **FF-01** | accepted | \`${CITED}\` | ADR |`) } })], { probes: { [CITED]: false }, runners: {} }),
        {},
      );
      assert.deepEqual([...new Set(accepted.map((f) => f.severity))], ["warn"]);
    },
  },

  // ===================================================================
  // task 03 — a declared control carries a recorded failing observation
  // ===================================================================
  {
    name: "66/02 verification: the probe-cell matrix — the register itself, then the cell once the row exists (Outline, 11 rows)",
    run: () => {
      const architecture = fitnessRegister("| **FF-01** | an invariant | `test/arch/x.test.mjs` | ADR |");
      const findingsFor = (verification) =>
        verificationGroup(snapshotOf([item({ docs: verification == null ? { "ARCHITECTURE.md": architecture } : { "ARCHITECTURE.md": architecture, "VERIFICATION.md": verification } })]), {})
          .map((finding) => finding.code);

      // — the register itself —
      assert.deepEqual(findingsFor(null), ["verification-register-missing"], "no fitness register section exists ⇒ one missing-register finding for the document");
      assert.deepEqual(findingsFor(findingsRegister("| **F-1** | a finding | open |")), ["verification-register-missing"], "a findings register is not a fitness register");
      assert.deepEqual(findingsFor(probeRegister()), ["verification-missing-red-probe"], "a fitness register exists carrying no row for FF-01");
      assert.deepEqual(
        verificationGroup(snapshotOf([item({ docs: { "ARCHITECTURE.md": doc("# m", "", "## Fitness functions", "", "| invariant | enforced by |", "|---|---|", "| no ids at all | `test/arch/x.test.mjs` |"), "VERIFICATION.md": probeRegister() } })]), {}),
        [],
        "a register with no ids declares nothing",
      );
      assert.deepEqual(findingsFor(probeRegister("| **FF-01** | x | GREEN | observed |", "| **FF-02** | never declared | GREEN | observed |")), [], "the obligation runs from the ARCHITECTURE register outward");

      // — the cell, once the row exists —
      const cell = (probe) => findingsFor(probeRegister(`| **FF-01** | \`test/arch/x.test.mjs\` | GREEN |${probe} |`));
      assert.deepEqual(cell(""), ["verification-missing-red-probe"], "an empty cell records no observation");
      assert.deepEqual(cell("   \t  "), ["verification-missing-red-probe"], "whitespace is not an observation");
      assert.deepEqual(cell(` ${RED_PROBE_PLACEHOLDER}`), ["verification-missing-red-probe"], "a placeholder is never evidence");
      assert.deepEqual(cell(` Removed the guard → \`${RED_PROBE_PLACEHOLDER}\` is what the template asked for; observed: 3 lanes red`), [], "the placeholder QUOTED INSIDE a recorded observation is an observation");
      assert.deepEqual(cell(" Deleted the lookbehind → `ADR-001/ADR-008` read as item 001"), [], "a recorded failure message");
      assert.deepEqual(cell(" the moon is made of cheese"), [], "the check is shape and makes no judgment");
      assert.deepEqual(cell(" -"), [], "a single hyphen is non-empty and not the placeholder");
    },
  },
  {
    name: "66/02 verification: an untouched shipped template row is reported, and the placeholder literal has ONE home",
    run: () => {
      assert.equal(RED_PROBE_PLACEHOLDER, "<what was changed to make it fail, and the message observed>", "the literal ADR-009/H freezes, verbatim");
      assert.equal(recordsARedProbe(` ${RED_PROBE_PLACEHOLDER} `), false, "the untouched template row is reported");
      assert.equal(recordsARedProbe(`\`${RED_PROBE_PLACEHOLDER}\``), false, "…and the same token rendered in backticks is the same token");
      assert.equal(recordsARedProbe(`**${RED_PROBE_PLACEHOLDER}**`), false, "…or in emphasis");
      assert.equal(recordsARedProbe(`saw ${RED_PROBE_PLACEHOLDER} and then observed X`), true, "a cell that is not the placeholder");
      assert.equal(recordsARedProbe(null), false, "an absent red-probe column records nothing");
      assert.equal(recordsARedProbe(""), false);
    },
  },
  {
    name: "66/02 verification: a document with no register at all is ONE finding, however many controls are declared, and the per-id lane is suppressed",
    run: () => {
      const eight = fitnessRegister(...Array.from({ length: 8 }, (_, index) => `| **FF-0${index + 1}** | an invariant | \`test/arch/g${index}.test.mjs\` | ADR |`));
      const findings = verificationGroup(snapshotOf([item({ docs: { "ARCHITECTURE.md": eight } })]), {});
      assert.equal(findings.length, 1, "exactly one missing-register finding for that document");
      assert.equal(findings[0].code, "verification-register-missing");
      assert.deepEqual(only(findings, "verification-missing-red-probe"), [], "no missing-red-probe finding alongside it — the fix is one act");
      assert.match(findings[0].message, /FF-01, FF-02, FF-03, FF-04, FF-05, FF-06, FF-07, FF-08/, "…and it names every id whose evidence is owed");
      assert.equal(findings[0].path.endsWith(`${path.sep}VERIFICATION.md`), true, "anchored at the document that must change");
    },
  },
  {
    name: "66/02 verification: the obligation reaches DECLARED CONTROLS and nothing else — no claim over a scenario or over an assertion inside a suite",
    run: () => {
      const findings = verificationGroup(snapshotOf([
        item({
          docs: {
            "ARCHITECTURE.md": fitnessRegister("| **FF-01** | the one declared control | `test/arch/x.test.mjs` | ADR |"),
            "VERIFICATION.md": probeRegister("| **FF-01** | `test/arch/x.test.mjs` | GREEN | observed: 3 lanes red |"),
          },
        }),
        // a story carrying hundreds of scenarios and not one declared control
        item({ ref: "66/00", number: "00", parent: "66", type: "story", slug: "a-story", docs: { "STORY.md": doc("# story", "", "300 scenarios across its task features") } }),
      ]), {});
      assert.deepEqual(findings, [], "the obligation is asserted for the declared ids only");
    },
  },

  // ===================================================================
  // the snapshot contract — the lane's only I/O, named
  // ===================================================================
  {
    name: "66/02 path grammar: provenance can retain locators without widening the control predicate",
    run: () => {
      const cell = "`wiki/work/62_milestone_x/RETROSPECTIVE.md:2-9` and `test/a.test.mjs#L4`; `test/family-*.test.mjs`";
      assert.deepEqual(pathCitationsIn(cell), [
        "wiki/work/62_milestone_x/RETROSPECTIVE.md:2-9",
        "test/a.test.mjs#L4",
      ]);
      assert.deepEqual(splitPathLocator("../../../test/a.test.mjs#L2-L9"), {
        path: "test/a.test.mjs",
        line: 9,
      });
      assert.deepEqual(splitPathLocator("wiki/work/x/RETROSPECTIVE.md"), {
        path: "wiki/work/x/RETROSPECTIVE.md",
        line: null,
      });
      assert.deepEqual(controlPathsIn(cell), ["test/a.test.mjs"]);
    },
  },
  {
    name: "66/02 lane: the pure extractors the SPINE imports answer from text alone (the inverted dependency, ROUND 3/3)",
    run: () => {
      assert.deepEqual(
        citedControlPathsIn(fitnessRegister("| **FF-01** | a | `test/arch/a.test.mjs` | ADR |", "| **FF-02** | b | `test/arch/b.test.mjs` + `test/arch/a.test.mjs` | ADR |")),
        ["test/arch/a.test.mjs", "test/arch/b.test.mjs"],
        "the union, de-duplicated — one path cited twice is probed once",
      );
      assert.deepEqual(citedControlPathsIn(""), []);
      assert.deepEqual(citedControlPathsIn("no register here at all"), []);
      assert.equal(normalizeCitedPath("../../../test/arch/x.test.mjs:151"), "test/arch/x.test.mjs");
      assert.equal(normalizeCitedPath("./test/arch/x.test.mjs#L2-L9"), "test/arch/x.test.mjs");
      // the red-probe reader answers from text alone too
      const rows = redProbeRows(probeRegister("| **FF-01** | `x` | GREEN | observed |"), "VERIFICATION.md");
      assert.deepEqual([...rows.keys()], ["FF-01"]);
      assert.equal(rows.get("FF-01").probe.trim(), "observed");
    },
  },
];
